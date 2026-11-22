// حبكة: اختبار الموقع المنشور مع الخادم الحقيقي من أدوار الزائر والعميل والمنتج على الكمبيوتر والجوال.
// يستخدم حسابين تجريبيين مخصصين للاختبار ومتجرًا تجريبيًا يحمل شارة «متجر تجريبي».
import { chromium } from "playwright";
import fs from "fs";
const BASE = process.argv[2] || "https://munjiz-qa.github.io/habka/";
const OUT = process.argv[3] || "shots";
fs.mkdirSync(OUT, { recursive: true });
const PASS = "Habka@Test2026";
const errors = [];
const ok = (...a) => console.log("✔", ...a);
const browser = await chromium.launch();
async function page(mobile) {
  const c = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 860 } });
  const p = await c.newPage();
  p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  p.on("response", (r) => { if (r.url().includes("/rpc/") && r.status() >= 400) r.text().then((t) => console.log("  rpc", r.status(), r.url().split("/rpc/")[1], t.slice(0, 160))); });
  return p;
}
const go = async (p, h) => { const u = BASE + h; if (p.url() === u) await p.reload(); else await p.goto(u); await p.waitForLoadState("networkidle"); await p.waitForTimeout(400); };
const toast = async (p) => { await p.waitForSelector(".toast.show", { timeout: 15000 }); const t = await p.textContent("#toast"); await p.evaluate(() => { const e = document.getElementById("toast"); e.className = "toast"; e.textContent = ""; }); return t; };
const shot = (p, n, full = false) => p.screenshot({ path: `${OUT}/${n}.png`, fullPage: full });
const login = async (p, email) => { await go(p, "#/login"); await p.fill("#le", email); await p.fill("#lp", PASS); await p.click("#lf button"); await toast(p); };

try {
  // الزائر
  const v = await page(false);
  await go(v, "#/"); await v.waitForSelector(".pcard", { timeout: 20000 }); await shot(v, "01-visitor-home", true);
  ok("الزائر: الرئيسية", (await v.$$(".cat")).length, "مجالات و", (await v.$$(".pcard")).length, "منتجات من الخادم الحقيقي");
  await v.fill("#hs input", "لقيمات"); await v.click("#hs button"); await v.waitForSelector("#res .pcard"); ok("الزائر: البحث يعمل");
  await v.click("#res .pcard"); await v.waitForSelector("#add"); await shot(v, "02-visitor-product"); ok("الزائر: صفحة المنتج");
  await go(v, "#/shops"); await v.waitForSelector(".scard"); ok("الزائر: المتاجر", (await v.$$(".scard")).length);
  await go(v, "#/guide"); await v.waitForSelector("#co b"); ok("الزائر: حاسبة التسعير", await v.textContent("#co b"));
  await go(v, "#/contact"); await v.fill("[name=name]", "اختبار آلي"); await v.fill("[name=phone]", "50000001"); await v.fill("[name=body]", "رسالة اختبار آلية للتحقق من نموذج التواصل."); await v.click("#ctf button.btn-primary"); ok("الزائر: التواصل →", await toast(v));
  await go(v, "#/admin"); if (!v.url().includes("login")) throw new Error("لوحة الإدارة غير محمية"); ok("الزائر: لوحة الإدارة محمية");

  // العميل على الجوال
  const c = await page(true);
  await login(c, "test.customer@habka.qa"); ok("العميل: تسجيل الدخول");
  await go(c, "#/browse?q=" + encodeURIComponent("منتج اختبار")); await c.click("#res .pcard"); await c.waitForSelector("#add"); await c.click("#add"); await toast(c);
  await go(c, "#/cart"); await c.waitForSelector("#co"); await c.fill("#co [name=phone]", "50000001"); await c.fill("#co [name=address]", "الدوحة، عنوان اختبار"); await shot(c, "03-customer-cart-mobile");
  await c.click("#co button.btn-primary"); await c.waitForSelector("text=تم استلام طلبك", { timeout: 20000 }); const code = (await c.textContent(".auth p b")).trim(); ok("العميل: طلب حقيقي برقم", code); await shot(c, "04-customer-order-done-mobile");

  // المنتج
  const s = await page(false);
  await login(s, "test.producer@habka.qa"); await s.waitForSelector(".kpis"); ok("المنتج: الدخول إلى لوحة المتجر");
  await go(s, "#/seller?tab=orders"); await s.waitForSelector(".ord");
  for (const st of ["accepted", "preparing", "ready", "delivered"]) { await s.locator(".ord").first().locator(`[data-s=${st}]`).click(); await toast(s); await s.waitForTimeout(600); }
  await shot(s, "05-producer-orders"); ok("المنتج: نقل الطلب", code, "حتى التسليم");
  await go(s, "#/seller?tab=products"); await s.click("#addp");
  await s.fill("#pfm [name=name]", "منتج اختبار مؤقت"); await s.fill("#pfm [name=price]", "15"); await s.click("#pfm button.btn-primary"); ok("المنتج: إضافة منتج →", await toast(s));
  await s.waitForSelector("table.t"); await shot(s, "06-producer-products");
  const row = s.locator("tr", { hasText: "منتج اختبار مؤقت" }).first();
  await row.locator("[data-del]").click(); await s.click("[data-ok]"); ok("المنتج: حذف المنتج المؤقت →", await toast(s));

  // العميل يقيّم
  await go(c, "#/account"); await c.waitForSelector("[data-rev]"); await c.locator("[data-rev]").first().click(); await c.click("[data-s='5']"); await c.fill("#rv [name=comment]", "اختبار آلي: تجربة ممتازة."); await c.click("#rv button.btn-primary"); ok("العميل: التقييم →", await toast(c));
  await shot(c, "07-customer-orders-mobile", true);

  // الجوال: لا تمرير أفقي
  for (const h of ["#/", "#/browse", "#/shops", "#/guide", "#/cart", "#/account", "#/about", "#/contact"]) { await go(c, h); const o = await c.evaluate(() => document.documentElement.scrollWidth - innerWidth); if (o > 1) errors.push("تمرير أفقي في " + h); }
  await go(c, "#/"); await shot(c, "08-home-mobile", true);
  ok("الجوال: فُحصت 8 صفحات");
} catch (e) { errors.push(String((e && e.stack) || e)); }
await browser.close();
if (errors.length) { console.log("::error::" + errors.join("\n")); process.exit(1); }
console.log("جميع اختبارات حبكة نجحت");
