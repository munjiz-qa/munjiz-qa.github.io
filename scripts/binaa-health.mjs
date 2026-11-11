// فحص دوري لموقع «بناء بيلدر» المنشور: يفتح الموقع الحقيقي كزائر وعميل ومدير على الكمبيوتر والجوال،
// ويتأكد أنه يعمل باستقلال تام (GitHub Pages + خادم Google Apps Script) ويحفظ لقطات للإثبات.
// يفشل الفحص عند أي خلل، فيصل لمالك المستودع بريد تنبيه من GitHub تلقائياً.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const SITE = process.env.BINAA_URL || "https://munjiz-qa.github.io/binaa-builder/";
const ADMIN_EMAIL = process.env.BINAA_ADMIN_EMAIL || "munijizqa@gmail.com", ADMIN_PW = process.env.BINAA_ADMIN_PASSWORD || "";
const DEMO = {email: "client@binaa.example", password: "Client-Binaa-2026"};
const OUT = "binaa-health"; mkdirSync(OUT, {recursive: true});
const results = [], errors = [];
const ok = (name, cond, info = "") => results.push(`${cond ? "PASS" : "FAIL"} ${name}${info ? " — " + info : ""}`);
const wait = ms => new Promise(r => setTimeout(r, ms));

const backend = await fetch(SITE + "backend.json?t=" + Date.now()).then(r => r.ok ? r.json() : {}).catch(() => ({}));
const api = /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(backend.api || "") ? backend.api : "";
ok("backend link", true, api ? "connected" : "not set: site runs on config.json + WhatsApp/email orders");
if (api){
  const ping = await fetch(api, {method: "POST", headers: {"Content-Type": "text/plain"}, body: JSON.stringify({action: "ping"})}).then(r => r.json()).catch(e => ({error: String(e)}));
  ok("backend responds", ping.ok === true, JSON.stringify(ping).slice(0, 120));
}

const browser = await chromium.launch();
for (const [label, opts] of [["desktop", {viewport: {width: 1366, height: 900}}], ["mobile", {viewport: {width: 390, height: 844}, deviceScaleFactor: 2, isMobile: true, hasTouch: true}]]){
  const ctx = await browser.newContext({locale: "ar", serviceWorkers: "block", ...opts});
  const page = await ctx.newPage();
  page.on("pageerror", e => errors.push(`${label}: ${e.message}`));
  const shot = n => page.screenshot({path: `${OUT}/${label}-${n}.png`});
  // visitor
  const res = await page.goto(SITE + "#home", {waitUntil: "networkidle"}); await wait(1500);
  ok(`${label}: site online`, res && res.status() === 200, String(res && res.status()));
  ok(`${label}: home + prices render`, await page.isVisible(".hero h1") && (await page.$$("#pricing .plan")).length === 3);
  ok(`${label}: no Claude dependency`, !(await page.evaluate(() => performance.getEntriesByType("resource").some(e => /claude\.ai|anthropic/.test(e.name)))));
  ok(`${label}: no horizontal scroll`, await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
  await shot("1-visitor-home");
  // customer: builder up to checkout (no order is submitted)
  await page.goto(SITE + "#build"); await wait(800);
  await page.click('[data-act="cat"][data-cat="clinic"]'); await page.click('[data-act="next"]'); await page.fill("#f-name", "فحص آلي");
  for (let i = 0; i < 5; i++){ await page.click('[data-act="next"]'); await wait(150); }
  await page.click('[data-act="next"]'); await wait(300);
  ok(`${label}: customer reaches checkout`, await page.isVisible("#k-name"));
  await shot("2-customer-checkout");
  await page.evaluate(() => localStorage.removeItem("mdk.draft"));
  if (api){
    await page.goto(SITE + "#track"); await wait(1500);
    await page.fill("#cl-email", DEMO.email); await page.fill("#cl-pw", DEMO.password); await page.click('#c-login button[type="submit"]'); await wait(3500);
    ok(`${label}: demo customer signs in`, await page.isVisible(".acct-bar"));
    await shot("3-customer-account");
  }
  // admin
  await page.goto(SITE + "admin/"); await wait(2000);
  ok(`${label}: admin page reachable`, /#admin$/.test(page.url()) && await page.isVisible("#admin-root .gate, #admin-root .kpis"));
  if (api && ADMIN_PW){
    await page.fill("#adm-email", ADMIN_EMAIL); await page.fill("#adm-pw", ADMIN_PW); await page.click('#adm-login button[type="submit"]'); await wait(4000);
    ok(`${label}: admin signs in with full dashboard`, await page.isVisible(".kpis"));
  }
  await shot("4-admin");
  await ctx.close();
}
await browser.close();
const fails = results.filter(r => r.startsWith("FAIL")).length + errors.length;
const report = [`بناء بيلدر — فحص الموقع المنشور ${new Date().toISOString()}`, `الموقع: ${SITE}`, ...results, errors.length ? "أخطاء الصفحة:\n" + errors.join("\n") : "أخطاء الصفحة: لا يوجد", fails ? `النتيجة: ${fails} خلل` : "النتيجة: كل الفحوص ناجحة"].join("\n");
writeFileSync(`${OUT}/report.txt`, report); console.log(report);
process.exit(fails ? 1 : 0);
