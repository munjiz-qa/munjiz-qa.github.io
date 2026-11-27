// أدوات العرض الموحدة: التواريخ والهواتف والمبالغ والحالات بشكل واحد في كل الصفحات.
export const $ = (id) => document.getElementById(id);
export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const toDate = (v) => (v ? (v.toDate ? v.toDate() : new Date(v)) : null);
const p2 = (n) => String(n).padStart(2, "0");
// التاريخ دائماً يوم/شهر/سنة، والوقت 24 ساعة
export function fmtDate(v, time = false) {
  const d = toDate(v); if (!d || isNaN(d)) return "—";
  const s = `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
  return time ? `${s} · ${p2(d.getHours())}:${p2(d.getMinutes())}` : s;
}
// الهاتف دائماً بصيغة دولية: ‎+974 5160 0498
export function normPhone(raw) {
  // الأرقام العربية والفارسية تُحوَّل إلى لاتينية أولاً (لوحة المفاتيح العربية تكتبها)، وتُحذف علامات الاتجاه والفواصل
  let d = String(raw || "").replace(/[\u0660-\u0669]/g, (c) => c.charCodeAt(0) - 0x660).replace(/[\u06F0-\u06F9]/g, (c) => c.charCodeAt(0) - 0x6F0)
    .replace(/[^\d+]/g, "").replace(/^00/, "+");
  if (!d) return "";
  // رقم مصري محلي (01012345678): يُحوَّل إلى الصيغة الدولية
  if (/^01[0125]\d{8}$/.test(d)) d = "+20" + d.slice(1);
  else if (!d.startsWith("+")) { if (d.startsWith("0")) return null; d = (d.length === 8 ? "+974" : "+") + d; }
  const digits = d.slice(1);
  if (digits.length < 8 || digits.length > 15) return null;
  const cc = digits.startsWith("974") ? "974" : digits.startsWith("20") ? "20" : digits.startsWith("966") ? "966" : digits.startsWith("971") ? "971" : digits.slice(0, digits.length > 11 ? 3 : 2);
  const nat = digits.slice(cc.length);
  // مصر: ‎+20 10 1234 5678 ، وغيرها مجموعات من 4 أرقام
  const rest = cc === "20" && nat.length === 10 ? `${nat.slice(0, 2)} ${nat.slice(2, 6)} ${nat.slice(6)}` : nat.replace(/(\d{4})(?=\d)/g, "$1 ");
  return `+${cc} ${rest}`;
}
export const phoneHtml = (p) => (p ? `<bdi dir="ltr">${esc(normPhone(p) || p)}</bdi>` : "—");
export const money = (n, cur = "USD") => (n == null || n === "" || isNaN(n) ? "—" : `${cur === "USD" ? "$" : ""}${Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 })}${cur !== "USD" ? " " + cur : ""}`);

export const STATUS = {
  new: ["جديد", "st-new"], reviewing: ["قيد المراجعة", "st-rev"], quoted: ["أُرسل عرض السعر", "st-q"],
  approved: ["معتمد", "st-ok"], in_progress: ["قيد التنفيذ", "st-prog"], done: ["مكتمل", "st-done"], cancelled: ["ملغى", "st-x"]
};
export const stBadge = (s) => `<span class="badge ${STATUS[s]?.[1] || ""}">${STATUS[s]?.[0] || esc(s)}</span>`;
export const TYPES = {
  kit: "عرض سعر لطقم تحويل كامل", convert: "تحويل سيارتي في الورشة", parts: "قطع ووحدات منفردة",
  workshop: "تجهيز ورشة تحويل", consult: "استشارة فنية"
};
export function newRequestNo() {
  const d = new Date();
  return `BQ-${String(d.getFullYear()).slice(2)}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function toast(msg, bad = false) {
  let t = $("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.append(t); }
  t.textContent = msg; t.className = bad ? "show bad" : "show";
  clearTimeout(t._h); t._h = setTimeout(() => (t.className = ""), 3800);
}
// رسائل أخطاء Firebase بالعربية
export function errMsg(e) {
  const c = (e && e.code) || "";
  const m = {
    "auth/invalid-credential": "البريد أو كلمة المرور غير صحيحة.", "auth/wrong-password": "البريد أو كلمة المرور غير صحيحة.",
    "auth/user-not-found": "لا يوجد حساب بهذا البريد.", "auth/email-already-in-use": "هذا البريد مسجل مسبقاً. سجّل الدخول أو استعد كلمة المرور.",
    "auth/weak-password": "كلمة المرور قصيرة: 8 أحرف على الأقل.", "auth/invalid-email": "صيغة البريد غير صحيحة.",
    "auth/too-many-requests": "محاولات كثيرة. انتظر قليلاً ثم أعد المحاولة.", "auth/network-request-failed": "تعذر الاتصال بالإنترنت.",
    "auth/requires-recent-login": "لأمان حسابك سجّل الخروج ثم الدخول مجدداً قبل تغيير كلمة المرور.",
    "permission-denied": "لا تملك صلاحية تنفيذ هذا الإجراء."
  };
  return m[c] || "حدث خطأ غير متوقع، أعد المحاولة." + (c ? ` (${c})` : "");
}
