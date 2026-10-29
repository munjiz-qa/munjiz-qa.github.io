// ربط الصفحة الرئيسية بنظام الحسابات: زر «حسابي»، حفظ خطة التحويل، طلب عرض سعر، شريط الإعلان، وقائمة الأسعار.
// لا يغيّر شيئاً في محرك المخطط؛ يقرأ الخطة الظاهرة من عناصر الصفحة فقط.
import { READY, auth, db, A, F, loadProfile } from "./fb.js";
import { esc, money, fmtDate, toast, errMsg } from "./ui.js";
import { KIND, CONTENT } from "./seed.js";

const $ = (id) => document.getElementById(id);
let USER = null;

const css = document.createElement("style");
css.textContent = `
.bq-acct{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
.bq-acct button{font:inherit;font-size:.88rem;font-weight:600;padding:8px 14px;border-radius:9px;border:1.5px solid var(--ink);color:var(--ink);background:none;cursor:pointer;min-height:40px}
.bq-acct button.pri{background:var(--ink);color:var(--bg)}
.bq-acct small{flex-basis:100%;color:var(--muted);font-size:.78rem}
.bq-ann{background:var(--copper);color:#fff;text-align:center;font-size:.92rem;font-weight:600;padding:8px 16px}
.bq-ann a{color:#fff}
#prices table{border-collapse:collapse;width:100%;font-size:.92rem}
#prices th,#prices td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:right}
#prices th{font-size:.8rem;color:var(--muted);font-weight:600;background:var(--bg)}
#prices td.p{font-weight:700;white-space:nowrap;direction:ltr;text-align:left}
#prices .tw{overflow-x:auto;border:1px solid var(--line);border-radius:12px;background:var(--surface)}
#prices .k{font-size:.75rem;color:var(--muted)}
#prices .cat td{background:var(--copper-soft);font-weight:700;color:var(--copper)}
#bqToast{position:fixed;inset-inline:16px;bottom:max(16px,env(safe-area-inset-bottom));margin:auto;max-width:440px;background:var(--ink);color:var(--bg);padding:12px 16px;border-radius:12px;text-align:center;z-index:99}
`;
document.head.append(css);

// ===== زر «حسابي» في القائمة =====
const navA = $("navAcct");
if (!READY && navA) navA.remove();

// ===== التقاط الخطة الظاهرة في المخطط =====
function selText(id) { const s = $(id); return s && s.selectedOptions[0] ? s.selectedOptions[0].textContent.trim() : ""; }
function capturePlan() {
  if (!$("cvBrand") || !$("cvHead")) return null;
  const opts = {};
  document.querySelectorAll(".cv-opts label").forEach((l) => {
    const el = l.querySelector("select,input"); if (!el) return;
    const k = (l.childNodes[0]?.textContent || l.textContent).trim().slice(0, 60);
    opts[k] = el.type === "checkbox" ? (el.checked ? "نعم" : "لا") : el.tagName === "SELECT" ? (el.selectedOptions[0]?.textContent.trim() || "") : el.value;
  });
  const kpis = [...document.querySelectorAll("#cvKpi > div")].map((d) => `${d.querySelector("span")?.textContent.trim()}: ${d.querySelector("b")?.textContent.trim()}`);
  const brandOpt = selText("cvBrand"), modelOpt = selText("cvModel"), year = selText("cvYear");
  const title = $("cvHead").querySelector("h3")?.textContent.trim() || `${brandOpt} ${modelOpt}`;
  const optLines = Object.entries(opts).filter(([, v]) => v && v !== "لا").map(([k, v]) => `${k}: ${v}`);
  return {
    title: `${title} · ${year}`, brand: brandOpt.split(" · ")[0], model: modelOpt.split(" · ")[0], year,
    brandOpt, modelOpt, kpis, opts: optLines,
    summary: [...kpis, "—", ...optLines].join("\n").slice(0, 3000), source: location.origin + location.pathname
  };
}
async function savePlan(action) {
  const plan = capturePlan(); if (!plan) return;
  if (!USER) {
    try { sessionStorage.setItem("bq_pending", JSON.stringify({ action, plan })); } catch (e) {}
    location.href = "account.html";
    return;
  }
  try {
    const ref = await F.addDoc(F.collection(db, "plans"), { ...plan, uid: USER.uid, createdAt: F.serverTimestamp() });
    if (action === "quote") { try { sessionStorage.setItem("bq_quote_plan", ref.id); } catch (e) {} location.href = "account.html#new"; }
    else note("حُفظت الخطة في حسابك. تجدها في «حسابي ← خططي المحفوظة».");
  } catch (err) { note(errMsg(err)); }
}
function note(t) { let n = $("bqToast"); if (!n) { n = document.createElement("div"); n.id = "bqToast"; n.setAttribute("role", "status"); document.body.append(n); } n.textContent = t; n.hidden = false; clearTimeout(n._h); n._h = setTimeout(() => (n.hidden = true), 4000); }

function mountPlanButtons() {
  const acts = $("cvActs"); if (!acts || $("bqAcct")) return;
  const d = document.createElement("div"); d.className = "bq-acct"; d.id = "bqAcct";
  d.innerHTML = `<button type="button" class="pri" data-a="save">احفظ الخطة في حسابي</button><button type="button" data-a="quote">اطلب عرض سعر رسمياً وتابعه من حسابك</button><small id="bqAcctHint">يلزم تسجيل الدخول أو إنشاء حساب مجاني، وتعود خطتك محفوظة كما هي.</small>`;
  d.onclick = (e) => { const b = e.target.closest("[data-a]"); if (b) savePlan(b.dataset.a); };
  acts.after(d);
}

// ===== فتح خطة محفوظة: ?plan=العلامة|الموديل|السنة =====
function applyPlanParam() {
  const p = new URLSearchParams(location.search).get("plan"); if (!p) return;
  const [b, m, y] = p.split("|");
  const pick = (id, txt) => { const s = $(id); if (!s || !txt) return false; const o = [...s.options].find((o) => o.textContent.trim() === txt || o.textContent.trim().split(" · ")[0] === txt); if (!o) return false; s.value = o.value; s.dispatchEvent(new Event("change")); return true; };
  if (pick("cvBrand", b)) { pick("cvModel", m); pick("cvYear", y); }
}

// ===== شريط الإعلان وقائمة الأسعار من لوحة الإدارة =====
async function loadPublic() {
  const [cs, cat] = await Promise.all([
    F.getDoc(F.doc(db, "content", "site")).catch(() => null),
    F.getDocs(F.collection(db, "catalog")).catch(() => null)
  ]);
  const c = { ...CONTENT, ...(cs?.exists() ? cs.data() : {}) };
  if (c.annOn && c.annText) {
    const bar = document.createElement("div"); bar.className = "bq-ann"; bar.id = "bqAnn";
    const safe = c.annUrl && /^(#|https:\/\/|\.\/|[\w-]+\.html)/.test(c.annUrl);
    bar.innerHTML = safe ? `<a href="${esc(c.annUrl)}">${esc(c.annText)}</a>` : esc(c.annText);
    document.querySelector("header.top")?.after(bar);
  }
  const items = cat ? cat.docs.map((d) => d.data()).filter((x) => x.active !== false).sort((a, b) => (a.order ?? 999) - (b.order ?? 999)) : [];
  if (!c.pricesOn || !items.length) return;
  let rows = "", last = null;
  items.forEach((x) => {
    if (x.cat !== last) { rows += `<tr class="cat"><td colspan="3">${esc(x.cat || "أخرى")}</td></tr>`; last = x.cat; }
    rows += `<tr><td dir="ltr" style="text-align:right;white-space:nowrap">${esc(x.code)}</td><td>${esc(x.name)}<div class="k">${KIND[x.kind] || ""}</div></td><td class="p">${x.price != null ? money(x.price) : "عند الطلب"}</td></tr>`;
  });
  const sec = document.createElement("section"); sec.id = "prices";
  sec.innerHTML = `<div class="wrap"><div class="sec-head"><div class="eyebrow">Price List · USD</div><h2>${esc(c.pricesTitle)}</h2><p class="lead">${esc(c.pricesLead)}</p></div>
    <div class="tw"><table><thead><tr><th>الرمز</th><th>البند</th><th style="text-align:left">السعر</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p style="margin-top:14px"><a class="btn" href="account.html#new" style="display:inline-flex">اطلب عرض سعر من حسابك</a>${c.updatedAt ? ` <span style="color:var(--muted);font-size:.8rem">آخر تحديث للمحتوى: ${fmtDate(c.updatedAt)}</span>` : ""}</p></div>`;
  const before = $("contact") || document.querySelector("footer");
  if (before) before.parentNode.insertBefore(sec, before); else document.body.append(sec);
  const nav = document.querySelector("header.top nav");
  if (nav && !nav.querySelector('a[href="#prices"]')) { const a = document.createElement("a"); a.href = "#prices"; a.textContent = "الأسعار"; const c = nav.querySelector('a[href="#contact"]'); c ? c.before(a) : nav.append(a); }
}

if (READY) {
  mountPlanButtons();
  // المخطط يبني القوائم عند التحميل؛ ننتظره قليلاً ثم نطبق الخطة المطلوبة
  setTimeout(applyPlanParam, 300);
  loadPublic().catch(() => {});
  A.onAuthStateChanged(auth, async (u) => {
    USER = u;
    if (navA) navA.textContent = "حسابي";
    const hint = $("bqAcctHint");
    if (!u) { if (hint) hint.hidden = false; return; }
    if (hint) hint.hidden = true;
    try {
      const p = await loadProfile(u);
      if (navA) { navA.textContent = p.role === "admin" ? "لوحة الإدارة" : `حسابي · ${p.name.split(" ")[0]}`; if (p.role === "admin") navA.href = "admin.html"; }
    } catch (e) {}
  });
}
