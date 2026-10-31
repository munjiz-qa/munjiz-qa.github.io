// اختبار متصفح حقيقي للموقع المنشور بكل الأدوار (زائر، عميل، مدير شامل) على الكمبيوتر والجوال.
// لا يحتاج كلمات المرور الحقيقية: يزرع حسابي اختبار في متصفح الاختبار فقط ثم يشغّل الكود المنشور كما هو.
// node scripts/saif-e2e.mjs https://munjiz-qa.github.io/saif/ ./shots
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
import fs from "node:fs";
const require = createRequire(import.meta.url);
const { chromium, devices } = require("playwright");
const C = require("../saif/core.js");
const BASE = process.argv[2] || "https://munjiz-qa.github.io/saif/", OUT = process.argv[3] || "shots";
fs.mkdirSync(OUT, { recursive: true });
const rand = n => Array.from(randomBytes(n), b => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
const A = "A-" + rand(12), Cl = "C-" + rand(12), now = new Date().toISOString();
const mk = (id, user, name, role, pw) => { const salt = rand(16); return { id, user, name, role, salt, hash: C.pwHash(salt, pw), email: "", phone: "", org: "", active: true, created: now, last: "" }; };
const SEED = JSON.stringify([mk("u1", "admin", "المدير الشامل", "admin", A), mk("u2", "client", "العميل الافتراضي", "client", Cl)]);
let fails = 0; const ok = (c, m) => { console.log((c ? "✓ " : "✗ ") + m); if (!c) fails++; };
// ملف Word صغير مبني في الذاكرة (بلا ضغط) لاختبار فحص محتوى Office
function mkZip(files) {
  const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
  const crc = b => { let c, t = crc.t || (crc.t = Array.from({ length: 256 }, (_, n) => { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; })); c = 0xffffffff; for (const x of b) c = t[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  for (const [name, txt] of files) {
    const n = enc.encode(name), d = enc.encode(txt), h = Buffer.alloc(30), ch = Buffer.alloc(46), cr = crc(d);
    h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt32LE(cr, 14); h.writeUInt32LE(d.length, 18); h.writeUInt32LE(d.length, 22); h.writeUInt16LE(n.length, 26);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt32LE(cr, 16); ch.writeUInt32LE(d.length, 20); ch.writeUInt32LE(d.length, 24); ch.writeUInt16LE(n.length, 28); ch.writeUInt32LE(off, 42);
    parts.push(h, n, d); cen.push(ch, n); off += 30 + n.length + d.length;
  }
  const cs = Buffer.concat(cen), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cs.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...parts, cs, e]);
}
const DOCX = mkZip([["[Content_Types].xml", "<Types/>"], ["word/document.xml", "<w:document><w:body><w:p><w:r><w:t>للتواصل: sales@example.com</w:t></w:r></w:p></w:body></w:document>"]]);
(async () => {
  const br = await chromium.launch();
  for (const [name, opts] of [["desktop", { viewport: { width: 1366, height: 900 } }], ["mobile", devices["iPhone 13"]]]) {
    const ctx = await br.newContext({ ...opts, locale: "ar" });
    await ctx.addInitScript(seed => { try { if (!localStorage.getItem("saif:sys/users")) { localStorage.setItem("saif:sys/users", seed); localStorage.setItem("saif:sys/seq", "2"); } } catch (e) { } }, SEED);
    const p = await ctx.newPage();
    const errs = []; p.on("pageerror", e => errs.push(e.message)); p.on("console", m => { if (m.type() === "error") errs.push(m.text()); });
    const shot = async n => { await p.waitForTimeout(400); await p.screenshot({ path: `${OUT}/${name}-${n}.png`, fullPage: n !== "device" }); };
    const overflow = async () => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    const login = async (u, pw) => { await p.goto(BASE + "#login"); await p.fill("#lu", u); await p.fill("#lp", pw); await p.click("#lb"); await p.waitForTimeout(700); };
    console.log("== " + name);
    await p.goto(BASE); await p.waitForSelector(".hero"); console.log("  وضع التشغيل: " + (await p.evaluate(() => window.SAIF_CONFIG.API ? "خادم مشترك" : "مستقل على الجهاز"))); ok(await p.isVisible("text=الدخول إلى حسابك"), "الزائر يرى صفحة التعريف"); ok(!(await overflow()), "لا تمرير أفقي (زائر)"); await shot("visitor");
    await p.goto(BASE + "#users"); await p.waitForTimeout(300); ok(!(await p.isVisible("text=مصفوفة الصلاحيات")), "الزائر لا يصل إلى صفحة الحسابات");
    await login("client", "wrong-pass"); ok((await p.textContent("#le")).includes("غير صحيحة"), "رفض كلمة مرور خاطئة"); await shot("login");
    await login("client", Cl); ok((await p.textContent("h1.pg")).includes("العميل الافتراضي"), "دخول العميل الافتراضي");
    const tabs = await p.$$eval("nav.tabs a", a => a.map(x => x.textContent)); ok(tabs.length === 5 && !tabs.includes("الحسابات والصلاحيات"), "قائمة العميل 5 أقسام فقط: " + tabs.join("، "));
    await shot("client-home"); ok(!(await overflow()), "لا تمرير أفقي (عميل)");
    await p.goto(BASE + "#scan"); await p.click("#demo"); await p.waitForSelector("text=نتيجة الفحص", { timeout: 10000 });
    const res = await p.textContent("#res"); ok(res.includes("كلمة مرور مكتوبة") && res.includes("IBAN") && res.includes("بطاقة شخصية") && res.includes("بريد"), "الفحص اكتشف البيانات الحساسة في ملف الاختبار"); ok(!res.includes("Test-Only-123"), "القيم الحساسة مقنّعة"); await shot("client-scan");
    await p.setInputFiles("#fi", { name: "عرض.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: DOCX });
    await p.waitForSelector("#res:has-text('#2')", { timeout: 10000 });
    ok((await p.textContent("#res")).includes("بريد"), "فحص محتوى ملف Word");
    await p.goto(BASE + "#reports"); await p.waitForSelector(".banner"); ok((await p.textContent(".banner")).includes("سليمة"), "سلسلة الأختام سليمة"); await shot("client-reports");
    for (const h of ["users", "audit", "settings", "health"]) { await p.goto(BASE + "#" + h); await p.waitForTimeout(300); ok(!(await p.isVisible("h1:has-text('" + ({ users: "الحسابات", audit: "سجل التدقيق", settings: "الإعدادات", health: "صحة المنصة" })[h] + "')")), "العميل محجوب عن #" + h); }
    await p.goto(BASE + "#device"); await p.waitForSelector(".chk"); const n1 = await p.textContent("#dv"); await p.waitForTimeout(2200); const n2 = await p.textContent("#dv"); ok(n1 !== n2, "مراقبة الجهاز تتحدث لحظياً"); await shot("device");
    await p.goto(BASE + "#account"); await p.waitForSelector("#pf"); await p.fill("[name=phone]", "55000012"); await p.click("#pb"); await p.waitForTimeout(500); ok((await p.inputValue("[name=phone]")) === "+974 5500 0012", "توحيد رقم الهاتف في الحساب"); await shot("client-account");
    await p.click("#out"); await p.waitForTimeout(400); ok(await p.isVisible(".hero"), "خروج العميل");
    await login("admin", A); ok((await p.textContent("h1.pg")).includes("المدير الشامل"), "دخول المدير الشامل");
    const tA = await p.$$eval("nav.tabs a", a => a.length); ok(tA === 9, "قائمة المدير 9 أقسام"); await shot("admin-home"); ok(!(await overflow()), "لا تمرير أفقي (مدير)");
    ok((await p.textContent("main")).includes("العميل الافتراضي"), "المدير يرى العميل وحالته في اللوحة");
    await p.goto(BASE + "#users"); await p.waitForSelector("#nu"); await p.click("#nu"); await p.fill("[name=name]", "شركة النور"); await p.fill("[name=user]", "alnoor"); await p.fill("[name=phone]", "0097455001234"); await p.click("#gp"); const npw = await p.inputValue("[name=pw]"); await p.click("#us"); await p.waitForTimeout(600);
    ok((await p.textContent("main")).includes("alnoor") && (await p.textContent("main")).includes("+974 5500 1234"), "المدير ينشئ عميلاً جديداً"); await shot("admin-users");
    await p.goto(BASE + "#reports?uid=u2"); await p.waitForSelector(".banner"); ok((await p.$$("details.rep")).length >= 2, "المدير يرى تقارير العميل");
    await p.goto(BASE + "#health"); await p.waitForSelector("#st .chk", { timeout: 8000 }); await p.waitForTimeout(1500); const hs = await p.$$eval("#st .dot", d => d.map(x => x.className)); ok(hs.length >= 9 && !hs.some(c => c.includes("alert")), "الفحص الذاتي: " + hs.length + " بنداً بلا تنبيه"); await shot("admin-health");
    await p.goto(BASE + "#audit"); await p.waitForSelector("#ab tr"); ok((await p.textContent("#ab")).includes("إنشاء حساب"), "سجل التدقيق يسجل العمليات"); await shot("admin-audit");
    await p.goto(BASE + "#settings"); await p.waitForSelector("#bk"); const [dl] = await Promise.all([p.waitForEvent("download"), p.click("#bk")]); ok(dl.suggestedFilename().startsWith("saif-backup"), "تنزيل نسخة احتياطية"); await shot("admin-settings");
    // تفاعل لحظي بين نافذتين
    const p2 = await ctx.newPage(); await p2.goto(BASE + "#home"); await p2.waitForSelector("h1.pg");
    await p.goto(BASE + "#users"); await p.waitForSelector("[data-tg]"); 
    const before = await p2.textContent("main");
    await p.click("#nu"); await p.fill("[name=name]", "عميل لحظي"); await p.fill("[name=user]", "live.test"); await p.click("#gp"); await p.click("#us"); await p.waitForTimeout(4000);
    ok((await p2.textContent("main")).includes("live.test") && !before.includes("live.test"), "النافذة الأخرى تحدثت تلقائياً دون إعادة تحميل");
    await p2.close();
    await p.click("#out"); await login("alnoor", npw); ok((await p.textContent("h1.pg")).includes("شركة النور"), "العميل الجديد يدخل بكلمة المرور المولدة");
    ok(errs.length === 0, "لا أخطاء في المتصفح" + (errs.length ? ": " + errs.slice(0, 3).join(" | ") : ""));
    await ctx.close();
  }
  await br.close(); console.log(fails ? fails + " فشل" : "كل الاختبارات نجحت"); process.exit(fails ? 1 : 0);
})();
