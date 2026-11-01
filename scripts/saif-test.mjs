// اختبار آلي لنواة سَيْف (saif/core.js): الدخول والصلاحيات والفحص والأختام والنسخ الاحتياطي.
// يعمل في GitHub Actions دون أي خدمة خارجية: node scripts/saif-test.mjs
import { createRequire } from "node:module";
import { randomBytes } from "node:crypto";
const require = createRequire(import.meta.url);
const C = require("../saif/core.js");

const store = new Map();
const rand = n => Array.from(randomBytes(n), b => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
const mk = (user, role, pw) => { const salt = rand(16); return { user, name: user, role, salt, hash: C.pwHash(salt, pw) }; };
const env = {
  kv: { get: k => store.has(k) ? store.get(k) : null, set: (k, v) => store.set(k, v), del: k => store.delete(k), list: p => [...store.keys()].filter(k => k.startsWith(p)) },
  now: () => new Date().toISOString(), rand, server: false,
  seed: [mk("t-admin", "admin", "admin-pass-1"), mk("t-client", "client", "client-pass-1")]
};
const call = (action, body = {}) => C.handle(JSON.parse(JSON.stringify({ action, ...body })), env);
let fails = 0;
const ok = (cond, msg) => { console.log((cond ? "✓ " : "✗ ") + msg); if (!cond) fails++; };

ok(C.sha256("abc") === "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", "SHA-256 مطابق لمتجه الاختبار القياسي");
ok(C.sha256("سيف") === (await import("node:crypto")).createHash("sha256").update("سيف").digest("hex"), "SHA-256 صحيح مع النص العربي");
ok(call("alive").ok, "الخادم يستجيب");
ok(call("home", { token: "x" }).code === "auth", "الزائر بلا جلسة لا يصل إلى البيانات");
ok(call("login", { user: "t-admin", pw: "wrong" }).code === "auth", "كلمة مرور خاطئة تُرفض");

const A = call("login", { user: "t-admin", pw: "admin-pass-1" });
ok(A.ok && A.user.role === "admin", "دخول المدير الشامل");
const Cl = call("login", { user: "T-Client", pw: "client-pass-1" });
ok(Cl.ok && Cl.user.role === "client", "دخول العميل (اسم المستخدم لا يتأثر بحالة الأحرف)");

for (const a of ["users", "audit", "settings", "backup", "selftest"]) ok(call(a, { token: Cl.token }).code === "perm", `العميل محجوب عن «${a}»`);
ok(call("reports", { token: Cl.token, uid: A.user.id }).code === "perm", "العميل لا يرى تقارير غيره");
ok(call("saveUser", { token: Cl.token, user: "hacker", role: "admin", pw: "12345678" }).code === "perm", "العميل لا ينشئ حسابات");

const sha = "a".repeat(64), sha2 = "b".repeat(64);
const s1 = call("scan", { token: Cl.token, files: [{ name: "عقد.txt", size: 10, sha, kind: "text", findings: [{ type: "رقم هاتف", sev: "low", count: 1, sample: "•••12" }] }] });
ok(s1.ok && s1.report.n === 1 && s1.report.state === "ok", "العميل يفحص ويختم تقريراً");
const s2 = call("scan", { token: Cl.token, files: [{ name: "عقد.txt", size: 12, sha: sha2, kind: "text", findings: [{ type: "مفتاح خاص", sev: "high", count: 1, sample: "•••" }] }] });
ok(s2.ok && s2.report.state === "alert" && s2.report.files[0].status === "changed" && s2.report.prev === s1.report.seal, "اكتشاف تغيّر الملف والبيانات الحساسة وربط الختم بالسابق");
ok(call("reports", { token: Cl.token }).chain.ok, "سلسلة أختام العميل سليمة");
ok(call("reports", { token: A.token, uid: Cl.user.id }).scans.length === 2, "المدير يرى تقارير العميل");

const ws = JSON.parse(store.get("ws/" + Cl.user.id)); ws.scans[1].score = 100; store.set("ws/" + Cl.user.id, JSON.stringify(ws));
ok(!call("reports", { token: Cl.token }).chain.ok, "أي تعديل في سجل محفوظ يكسر السلسلة ويُكشف");
const st = call("selftest", { token: A.token });
ok(st.ok && st.checks.find(c => c.key === "chains").status === "alert", "الفحص الذاتي للمدير يرصد السلسلة المكسورة");
ws.scans[1].score = s1.report.score; store.set("ws/" + Cl.user.id, JSON.stringify(ws));

const nu = call("saveUser", { token: A.token, user: "new.client", name: "عميل جديد", role: "client", pw: "new-pass-123", phone: "51600498" });
ok(nu.ok && nu.users.find(u => u.user === "new.client").phone === "+974 5160 0498", "المدير ينشئ عميلاً ويوحَّد رقم الهاتف");
const N = call("login", { user: "new.client", pw: "new-pass-123" });
ok(N.ok, "العميل الجديد يدخل");
const nid = N.user.id;
ok(call("saveUser", { token: A.token, id: nid, user: "new.client", name: "عميل جديد", role: "client", active: false }).ok, "المدير يوقف الحساب");
ok(call("home", { token: N.token }).code === "auth", "الحساب الموقوف يُطرد فوراً");
ok(call("saveUser", { token: A.token, id: A.user.id, user: "t-admin", role: "client" }).code === "main", "المدير لا يسحب صلاحياته بنفسه");
ok(call("delUser", { token: A.token, id: nid }).ok, "المدير يحذف الحساب");

const bk = call("backup", { token: A.token });
ok(bk.ok && bk.backup.data["sys/users"].length === 2, "النسخة الاحتياطية");
ok(call("restore", { token: A.token, backup: bk.backup }).ok, "الاستعادة");

for (let i = 0; i < 5; i++) call("login", { user: "t-client", pw: "bad" });
ok(call("login", { user: "t-client", pw: "client-pass-1" }).code === "locked", "الإيقاف المؤقت بعد 5 محاولات خاطئة");
ok(call("selftest", { token: A.token }).checks.every(c => c.status !== "alert"), "الفحص الذاتي سليم بعد الاستعادة");

console.log(fails ? `\n${fails} اختبار فشل` : "\nكل الاختبارات نجحت");
process.exit(fails ? 1 : 0);
