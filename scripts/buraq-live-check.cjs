// براق · اختبار دخان للموقع المنشور (دون Claude): صفحات وملفات وتحميل المخطط والأسئلة الشائعة وصفحتا الحساب والإدارة،
// على الكمبيوتر والجوال. لا ينشئ حسابات ولا يكتب في Firebase. الاستخدام: BURAQ_URL=https://munjiz-qa.github.io/buraq/ node scripts/buraq-live-check.cjs
const { chromium } = require("playwright");
const BASE = (process.env.BURAQ_URL || "https://munjiz-qa.github.io/buraq/").replace(/\/?$/, "/");
let fails = 0; const out = [];
const check = (ok, msg) => { out.push((ok ? "PASS " : "FAIL ") + msg); if (!ok) { fails++; console.log("::error::" + msg); } };
const get = async (p, tries = 3) => { for (let i = 0; i < tries; i++) { try { const r = await fetch(BASE + p + (p.includes("?") ? "&" : "?") + "t=" + Date.now(), { redirect: "follow" }); const b = Buffer.from(await r.arrayBuffer()); if (r.status < 500) return { s: r.status, b }; } catch (e) {} await new Promise((r) => setTimeout(r, 4000)); } return { s: 0, b: Buffer.alloc(0) }; };

(async () => {
  // 1) الملفات
  for (const p of ["", "account.html", "admin.html", "manifest.webmanifest", "sw.js", "app/icon-192.png", "acct/vendor/firebase-app.js", "acct/vendor/firebase-auth.js", "acct/vendor/firebase-firestore.js",
    "files/BURAQ_BQ10_v3_BOM.xlsx", "files/BURAQ_car_conversion_plans.xlsx", "files/BURAQ_workshop_equipment.xlsx", "files/BURAQ_MADAD_Egypt.xlsx", "files/BURAQ_Business_Development.xlsx", "files/BURAQ_BQ10_v3.glb"]) {
    const r = await get(p); check(r.s === 200 && r.b.length > 200, `${p || "index"}: ${r.s} (${r.b.length} bytes)`);
  }
  // كل ما تشير إليه الصفحات من سكربتات وأنماط محلية موجود
  for (const page of ["", "account.html", "admin.html"]) {
    const html = (await get(page)).b.toString("utf8");
    const refs = [...new Set([...html.matchAll(/(?:src|href)="((?:acct|ux|app|img)\/[^"#]+?)"/g)].map((m) => m[1]))].filter((f) => !/[${}]/.test(f));
    let bad = [];
    for (const f of refs) { const r = await get(f); if (r.s !== 200) bad.push(f + ":" + r.s); }
    check(bad.length === 0, `${page || "index"}: كل الموارد المحلية (${refs.length}) متاحة ${bad.join(" ")}`);
  }
  // 2) المتصفح
  const br = await chromium.launch();
  for (const [name, vp, mob] of [["desktop", { width: 1366, height: 900 }, false], ["mobile", { width: 390, height: 844 }, true]]) {
    const ctx = await br.newContext({ viewport: vp, isMobile: mob, hasTouch: mob, locale: "ar" });
    await ctx.route(/fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
    const errs = [];
    const mk = async () => { const p = await ctx.newPage(); p.on("pageerror", (e) => errs.push(e.message)); return p; };
    const idx = await mk();
    await idx.goto(BASE + (process.env.BURAQ_EMU ? "?emu" : ""), { waitUntil: "load", timeout: 45000 });
    check((await idx.title()).includes("براق"), `${name}: عنوان الصفحة الرئيسية`);
    check((await idx.content()).includes("+974 5160 0498") && (await idx.content()).includes("munijizqa@gmail.com"), `${name}: بيانات التواصل الموحدة`);
    await idx.waitForSelector("#cvBrand option:nth-child(5)", { state: "attached", timeout: 20000 }).catch(() => {});
    const nb = await idx.locator("#cvBrand option").count(); check(nb > 100, `${name}: قائمة العلامات في المخطط (${nb})`);
    await idx.evaluate(() => { const s = document.getElementById("cvBrand"); s.selectedIndex = 3; s.dispatchEvent(new Event("change")); const m = document.getElementById("cvModel"); m.selectedIndex = 1; m.dispatchEvent(new Event("change")); });
    await idx.waitForSelector("#cvKpi div", { timeout: 15000 }).catch(() => {});
    check((await idx.locator("#cvKpi > div").count()) >= 8, `${name}: المخطط يعرض خطة تحويل بمؤشراتها`);
    check((await idx.locator("#cvKpi .bqm[data-u]").count()) >= 1, `${name}: الأسعار بعملة الزائر (cur.js)`);
    check((await idx.locator("#faq details").count()) >= 14, `${name}: الأسئلة الشائعة`);
    await idx.waitForFunction(() => document.querySelectorAll("#prices tbody tr").length > 10, null, { timeout: 20000 }).catch(() => {});
    { const np = await idx.locator("#prices tbody tr").count(); if (np > 10) out.push(`PASS ${name}: قائمة الأسعار من Firestore (${np})`); else console.log(`::warning::${name}: قائمة الأسعار لا تظهر (${np}). تحقق أن «إظهار قائمة الأسعار» مفعّل في لوحة الإدارة وأن الكتالوج غير فارغ.`); }
    check(await idx.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, `${name}: لا تمرير أفقي في الرئيسية`);
    const acc = await mk(); await acc.goto(BASE + "account.html" + (process.env.BURAQ_EMU ? "?emu" : ""), { waitUntil: "load", timeout: 45000 });
    check(await acc.waitForSelector("#auth:not([hidden]) #loginF", { timeout: 15000 }).then(() => true, () => false), `${name}: صفحة العميل تعرض نموذج الدخول`);
    const adm = await mk(); await adm.goto(BASE + "admin.html" + (process.env.BURAQ_EMU ? "?emu" : ""), { waitUntil: "load", timeout: 45000 });
    check(await adm.waitForSelector("#auth:not([hidden]) input[type=password]", { timeout: 15000 }).then(() => true, () => false), `${name}: صفحة الإدارة تعرض نموذج الدخول`);
    const fe = errs.filter((e) => !/firebase|network|Failed to fetch|ERR_|offline/i.test(e));
    check(fe.length === 0, `${name}: لا أخطاء جافاسكربت ${fe.join(" | ").slice(0, 200)}`);
    await ctx.close();
  }
  await br.close();
  console.log(out.join("\n")); console.log(fails ? `فشل ${fails} فحصاً` : "كل فحوص براق ناجحة");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("::error::" + e.message); process.exit(1); });
