// براق · عرض السعر الرسمي: مستند مطبوع/PDF بهوية براق يُنشأ من بيانات الطلب نفسها (للعميل والمدير).
// يُعرض بعملة القارئ تلقائياً (cur.js)، مع المبلغ المرجعي بالدولار، ويحفظ PDF من نافذة الطباعة على الجوال والكمبيوتر.
import { esc, fmtDate, phoneHtml, money, TYPES } from "./ui.js";

const CSS = `#bqQuote{display:none}
@media print{
 @page{size:A4;margin:14mm 14mm 16mm}
 html,body{background:#fff!important}
 body.bq-printing>*:not(#bqQuote){display:none!important}
 body.bq-printing dialog{display:none!important}
 body.bq-printing #bqQuote{display:block!important}
}
#bqQuote{font-family:"Noto Sans Arabic","Noto Sans",Tahoma,Arial,sans-serif;color:#14202A;direction:rtl;font-size:11pt;line-height:1.7}
#bqQuote *{box-sizing:border-box}
#bqQuote .q-hd{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;border-bottom:2.5px solid #14202A;padding-bottom:12px}
#bqQuote .q-brand{display:flex;align-items:center;gap:10px}
#bqQuote .q-brand b{font-size:20pt;line-height:1}
#bqQuote .q-brand small{display:block;color:#566570;font-size:9pt;letter-spacing:.04em}
#bqQuote .q-ttl{text-align:left}
#bqQuote .q-ttl h1{margin:0;font-size:17pt;color:#A9572A}
#bqQuote .q-ttl div{font-size:9.5pt;color:#566570}
#bqQuote .q-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 22px;margin:16px 0}
#bqQuote .q-box{border:1px solid #C6CFD4;border-radius:8px;padding:10px 12px;break-inside:avoid}
#bqQuote .q-box h2{font-size:10pt;color:#A9572A;margin:0 0 6px}
#bqQuote dl{display:grid;grid-template-columns:auto 1fr;gap:2px 12px;margin:0}
#bqQuote dt{color:#566570}#bqQuote dd{margin:0;font-weight:600}
#bqQuote .q-price{display:flex;justify-content:space-between;align-items:center;gap:12px;background:#F4EDE8;border:1.5px solid #A9572A;border-radius:10px;padding:14px 16px;margin:6px 0 14px;break-inside:avoid}
#bqQuote .q-price .v{font-size:20pt;font-weight:700;color:#14202A}
#bqQuote .q-price .u{font-size:9pt;color:#566570}
#bqQuote .q-plan{white-space:pre-wrap;font-size:9.5pt;background:#F3F5F6;border-radius:8px;padding:10px 12px;margin:0 0 12px}
#bqQuote .q-note{border-inline-start:3px solid #A9572A;padding:4px 12px;margin:0 0 12px;white-space:pre-wrap}
#bqQuote ol{margin:4px 0 0;padding-inline-start:20px;font-size:9.5pt;color:#36434C}
#bqQuote .q-ft{margin-top:18px;border-top:1px solid #C6CFD4;padding-top:10px;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px 18px;font-size:9pt;color:#566570}
#bqQuote .q-sign{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:22px;font-size:9.5pt}
#bqQuote .q-sign div{border-top:1px dashed #8A979F;padding-top:6px;color:#566570}`;

const LOGO = `<svg width="38" height="38" viewBox="0 0 30 30" aria-hidden="true"><rect x="1.5" y="1.5" width="27" height="27" rx="8" fill="#F8FAFA" stroke="#14202A" stroke-width="2"/><path d="M19 4.5 10.5 16.8h5.6l-2.3 8.7 9.2-13.1h-5.6Z" fill="#A9572A"/></svg>`;
const toD = (v) => (v ? (v.toDate ? v.toDate() : new Date(v)) : null);

export function quoteHtml(r, who = {}) {
  const issued = toD(r.updatedAt) || toD(r.createdAt) || new Date();
  const valid = new Date(issued.getTime() + 30 * 864e5);
  const cust = { name: r.name || who.name, email: r.email || who.email, phone: r.phone || who.phone, city: r.city || who.city, company: who.company };
  const usd = r.currency && r.currency !== "USD" ? "" : `<span data-nocur>${money(r.price, "USD")}</span>`;
  return `<div class="q-hd"><div class="q-brand">${LOGO}<div><b>براق</b><small>BURAQ · منظومة التحويل الكهربائي BQ-10</small></div></div>
   <div class="q-ttl"><h1>عرض سعر</h1><div>رقم العرض <bdi dir="ltr">${esc(r.no)}</bdi></div><div>تاريخ الإصدار ${fmtDate(issued)} · صالح حتى ${fmtDate(valid)}</div></div></div>
  <div class="q-grid">
   <div class="q-box"><h2>بيانات العميل</h2><dl><dt>الاسم</dt><dd>${esc(cust.name || "—")}</dd>${cust.company ? `<dt>الجهة</dt><dd>${esc(cust.company)}</dd>` : ""}<dt>الجوال</dt><dd>${phoneHtml(cust.phone)}</dd><dt>البريد</dt><dd><bdi dir="ltr">${esc(cust.email || "—")}</bdi></dd><dt>المدينة</dt><dd>${esc(cust.city || "—")}</dd></dl></div>
   <div class="q-box"><h2>موضوع العرض</h2><dl><dt>نوع الطلب</dt><dd>${esc(TYPES[r.type] || r.type || "—")}</dd><dt>السيارة</dt><dd>${esc(r.car || "—")}</dd><dt>تاريخ الطلب</dt><dd>${fmtDate(r.createdAt)}</dd></dl></div>
  </div>
  <div class="q-price"><div><div class="u">قيمة العرض الإجمالية</div><div class="v">${money(r.price, r.currency || "USD")}</div></div>${usd && !(window.BQCUR && BQCUR.cur === "USD") ? `<div class="u">المرجع بالدولار الأمريكي: ${usd}</div>` : ""}</div>
  ${r.adminNote ? `<h3 style="font-size:10.5pt;margin:0 0 4px">ملاحظة فريق براق</h3><p class="q-note">${esc(r.adminNote)}</p>` : ""}
  ${r.planSummary ? `<h3 style="font-size:10.5pt;margin:0 0 4px">الخطة الفنية المرفقة</h3><p class="q-plan">${esc(r.planSummary)}</p>` : ""}
  ${r.details ? `<h3 style="font-size:10.5pt;margin:0 0 4px">تفاصيل الطلب</h3><p class="q-plan">${esc(r.details)}</p>` : ""}
  <div class="q-box"><h2>الشروط العامة</h2><ol>
   <li>العرض صالح ثلاثين يوماً من تاريخ إصداره، والأسعار المعروضة بعملة غير الدولار تقريبية وفق سعر الصرف يوم الطباعة.</li>
   <li>يُعتمد العرض بعد مراجعة فنية للسيارة وتأكيد كتابي من الطرفين، ويُحدَّد جدول الدفعات ومدة التنفيذ في أمر العمل.</li>
   <li>الضمان وتفاصيل التركيب كما ورد في ملاحظة فريق براق أعلاه، وما لم يُذكر يخضع لسياسة براق المعتمدة.</li>
  </ol></div>
  <div class="q-sign"><div>توقيع العميل وتاريخ الاعتماد</div><div>عن براق BURAQ</div></div>
  <div class="q-ft"><span>munjiz-qa.github.io/buraq</span><span>البريد: munijizqa@gmail.com</span><span>الهاتف وواتساب: <bdi dir="ltr">+974 5160 0498</bdi></span></div>`;
}

export function printQuote(r, who) {
  if (!document.getElementById("bqQuoteCss")) { const s = document.createElement("style"); s.id = "bqQuoteCss"; s.textContent = CSS; document.head.appendChild(s); }
  let q = document.getElementById("bqQuote");
  if (!q) { q = document.createElement("div"); q.id = "bqQuote"; document.body.appendChild(q); }
  q.innerHTML = quoteHtml(r, who);
  const title = document.title; document.title = `عرض سعر براق ${r.no}`;
  document.body.classList.add("bq-printing");
  const done = () => { document.body.classList.remove("bq-printing"); document.title = title; removeEventListener("afterprint", done); };
  addEventListener("afterprint", done);
  // مهلة قصيرة كي يحوّل cur.js المبالغ إلى عملة القارئ قبل فتح نافذة الطباعة
  setTimeout(() => window.print(), 250);
}
