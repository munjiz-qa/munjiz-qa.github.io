// براق · اختبار دخان للموقع المنشور (دون Claude): صفحات وملفات وتحميل المخطط والأسئلة الشائعة وصفحتا الحساب والإدارة،
// على الكمبيوتر والجوال. لا ينشئ حسابات ولا يكتب في Firebase. الاستخدام: BURAQ_URL=https://munjiz-qa.github.io/buraq/ node scripts/buraq-live-check.cjs
const { chromium } = require("playwright");
const BASE = (process.env.BURAQ_URL || "https://munjiz-qa.github.io/buraq/").replace(/\/?$/, "/");
let fails = 0; const out = [];
const check = (ok, msg) => { out.push((ok ? "PASS " : "FAIL ") + msg); if (!ok) { fails++; console.log("::error::" + msg); } };
const get = async (p, tries = 3) => { for (let i = 0; i < tries; i++) { try { const r = await fetch(BASE + p + (p.includes("?") ? "&" : "?") + "t=" + Date.now(), { redirect: "follow" }); const b = Buffer.from(await r.arrayBuffer()); if (r.status < 500) return { s: r.status, b }; } catch (e) {} await new Promise((r) => setTimeout(r, 4000)); } return { s: 0, b: Buffer.alloc(0) }; };

(async () => {
  // 1) الملفات
  for (const p of ["", "account.html", "admin.html", "manifest.webmanifest", "sw.js", "app/icon-192.png", "acct/vendor/firebase-app.js", "acct/vendor/firebase-auth.js", "acct/vendor/firebase-firestore.js", "fonts/fonts.css", "fonts/noto-sans-arabic-arabic-wght-normal.woff2", "fonts/noto-sans-arabic-latin-wght-normal.woff2", "vendor/three/three.module.min.js", "vendor/three/addons/loaders/GLTFLoader.js", "vendor/three/addons/controls/OrbitControls.js", "vendor/three/addons/environments/RoomEnvironment.js", "vendor/three/addons/utils/BufferGeometryUtils.js",
    "data/fx.json", "files/BURAQ_BQ10_v3_BOM.xlsx", "files/BURAQ_car_conversion_plans.xlsx", "files/BURAQ_workshop_equipment.xlsx", "files/BURAQ_MADAD_Egypt.xlsx", "files/BURAQ_Business_Development.xlsx", "files/BURAQ_BQ10_v3.glb"]) {
    const r = await get(p); check(r.s === 200 && r.b.length > (p.endsWith(".json") ? 20 : 200), `${p || "index"}: ${r.s} (${r.b.length} bytes)`);
  }
  // ملفات Excel: كل معادلة لها قيمة محفوظة، فتظهر الأرقام في معاينة الجوال وGoogle Drive وQuick Look دون إعادة حساب
  { const zlib = require("zlib");
    const sheets = (buf) => { const out = []; let e = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 5, 6])); let o = buf.readUInt32LE(e + 16), n = buf.readUInt16LE(e + 10);
      for (let i = 0; i < n; i++) { const m = buf.readUInt16LE(o + 10), cs = buf.readUInt32LE(o + 20), nl = buf.readUInt16LE(o + 28), xl = buf.readUInt16LE(o + 30), cl = buf.readUInt16LE(o + 32), lo = buf.readUInt32LE(o + 42); const name = buf.toString("utf8", o + 46, o + 46 + nl);
        if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) { const ln = buf.readUInt16LE(lo + 26), lx = buf.readUInt16LE(lo + 28), d = buf.subarray(lo + 30 + ln + lx, lo + 30 + ln + lx + cs); out.push(m === 8 ? zlib.inflateRawSync(d).toString("utf8") : d.toString("utf8")); }
        o += 46 + nl + xl + cl; } return out; };
    for (const f of ["BURAQ_BQ10_v3_BOM", "BURAQ_car_conversion_plans", "BURAQ_workshop_equipment", "BURAQ_MADAD_Egypt", "BURAQ_Business_Development"]) {
      const r = await get(`files/${f}.xlsx`); let tot = 0, empty = 0;
      try { for (const x of sheets(r.b)) { tot += (x.match(/<f[ >]/g) || []).length; empty += (x.match(/<\/f><v><\/v>|<\/f><v\/>/g) || []).length; } } catch (e) { empty = -1; }
      check(empty === 0 && tot > 0, `${f}.xlsx: ${tot} معادلة بقيم محفوظة` + (empty ? ` (بلا قيمة: ${empty})` : "")); } }
  { const r = await get("data/fx.json"); let d = {}; try { d = JSON.parse(r.b.toString("utf8")); } catch (e) {} const ok = d.QAR > 3 && d.QAR < 4.5 && d.EGP > 10 && d.EGP < 500; check(ok, `سعر الصرف الاحتياطي سليم (QAR ${d.QAR} · EGP ${d.EGP} · ${d.date})`); const m = /(\d\d)\/(\d\d)\/(\d{4})/.exec(d.date || ""); const age = m ? (Date.now() - Date.UTC(+m[3], +m[2] - 1, +m[1])) / 864e5 : 999; if (age > 5) console.log(`::warning::سعر الصرف الاحتياطي قديم (${d.date}). تحقق من مسار أسعار صرف براق.`); }
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
    // حارس الأداء: مكتبات Firebase (نحو 700KB) لا تُطلب قبل اكتمال الصفحة الرئيسية، ثم تُحمَّل بعدها فعلاً
    let loaded = false; const early = [], late = [], cdn = [];
    ctx.on("request", (rq) => { if (/cdn\.jsdelivr|unpkg\.com|cdnjs\.|fonts\.(googleapis|gstatic)\.com/.test(rq.url())) cdn.push(rq.url()); });
    idx.on("request", (rq) => { if (/vendor\/firebase-/.test(rq.url())) (loaded ? late : early).push(rq.url()); });
    idx.once("load", () => { loaded = true; });
    await idx.goto(BASE + (process.env.BURAQ_EMU ? "?emu" : ""), { waitUntil: "load", timeout: 45000 });
    for (let i = 0; i < 40 && late.length < 3; i++) await idx.waitForTimeout(500); // على جهاز بطيء قد يتأخر الخمول، فننتظر حتى 20 ثانية
    check(cdn.length === 0, `${name}: الصفحة الرئيسية لا تعتمد على CDN أو Google Fonts (النموذج والخط محليان) ${cdn.join(" ")}`);
    check(early.length === 0, `${name}: لا طلبات Firebase قبل اكتمال الرئيسية ${early.length ? early.map((u) => u.split("/").pop()).join(" ") : ""}`);
    check(late.length >= 3, `${name}: ربط الحسابات يُحمَّل بعد اكتمال الصفحة (${late.length} ملفات)`);
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
  // فحص سلامة بيانات المخطط: كل العلامات والطرازات بلا قيم فاسدة وضمن حدود معقولة
  {
    const ctx = await br.newContext({ viewport: { width: 1280, height: 800 }, locale: "ar" });
    await ctx.route(/fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
    const pg = await ctx.newPage(); const perr = []; pg.on("pageerror", (e) => perr.push(String(e)));
    await pg.goto(BASE, { waitUntil: "load", timeout: 45000 });
    await pg.waitForSelector("#cvBrand option", { state: "attached", timeout: 20000 }).catch(() => {});
    const r = await pg.evaluate(async () => {
      const B = document.getElementById("cvBrand"), M = document.getElementById("cvModel"), K = document.getElementById("cvKpi");
      const names = [...B.options].map((o) => o.textContent.trim()); let models = 0, bad = 0, sample = "";
      for (let i = 0; i < B.options.length; i++) {
        B.selectedIndex = i; B.dispatchEvent(new Event("change"));
        for (let j = 0; j < M.options.length; j++) {
          M.selectedIndex = j; M.dispatchEvent(new Event("change")); models++;
          const t = K.innerText;
          if (/NaN|undefined|Infinity|null|\[object/.test(t)) { bad++; if (!sample) sample = names[i] + "/" + M.options[j].textContent + ": " + t.slice(0, 80); }
        }
      }
      return { brands: B.options.length, dup: names.length - new Set(names).size, models, bad, sample };
    });
    check(r.brands >= 130, `بيانات المخطط: عدد العلامات (${r.brands})`);
    check(r.dup === 0, `بيانات المخطط: لا علامات مكررة (${r.dup})`);
    check(r.models >= 1400, `بيانات المخطط: عدد الطرازات (${r.models})`);
    check(r.bad === 0, `بيانات المخطط: لا قيم فاسدة في الخطط ${r.sample}`);
    check(perr.length === 0, `بيانات المخطط: لا أخطاء جافاسكربت ${perr.join(" | ").slice(0, 150)}`);
    await ctx.close();
  }
  // الهواتف الصغيرة (320 و360 بكسل): لا تمرير أفقي في الصفحات الثلاث
  for (const w of [320, 360]) {
    const ctx = await br.newContext({ viewport: { width: w, height: 700 }, isMobile: true, hasTouch: true, locale: "ar" });
    await ctx.route(/fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
    const pg = await ctx.newPage();
    for (const [label, path] of [["الرئيسية", ""], ["العميل", "account.html"], ["الإدارة", "admin.html"]]) {
      await pg.goto(BASE + path + (process.env.BURAQ_EMU ? "?emu" : ""), { waitUntil: "load", timeout: 45000 }); await pg.waitForTimeout(1500);
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(ov <= 0, `هاتف ${w}px: لا تمرير أفقي في ${label} (${ov})`);
    }
    await ctx.close();
  }
  // من يكبّر الخط في نظامه (150% و200%): لا تمرير أفقي في الصفحات الثلاث
  for (const [w, z] of [[390, 1.5], [390, 2]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, locale: "ar" });
    await ctx.route(/fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
    const pg = await ctx.newPage();
    for (const [label, path] of [["الرئيسية", ""], ["العميل", "account.html"], ["الإدارة", "admin.html"]]) {
      await pg.goto(BASE + path + (process.env.BURAQ_EMU ? "?emu" : ""), { waitUntil: "load", timeout: 45000 });
      await pg.addStyleTag({ content: `html{font-size:${z * 100}% !important}` }); await pg.waitForTimeout(1500);
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      check(ov <= 0, `خط مكبّر ${z * 100}%: لا تمرير أفقي في ${label} (${ov})`);
    }
    await ctx.close();
  }
  await br.close();
  console.log(out.join("\n")); console.log(fails ? `فشل ${fails} فحصاً` : "كل فحوص براق ناجحة");
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.log("::error::" + e.message); process.exit(1); });
