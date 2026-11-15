// براق · مقارنة الخطط: يضيف العميل حتى 3 سيارات من المخطط ويقارن مؤشراتها جنباً إلى جنب (المدى، القدرة، الشحن، التكلفة...).
// مستقل: يقرأ مؤشرات الخطة من الصفحة، ويحفظها في متصفح العميل فقط، والأسعار تتبع عملته تلقائياً (cur.js).
(() => {
const $ = (id) => document.getElementById(id);
const KEY = "bq.cmp", MAX = 3;
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const load = () => { try { const a = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(a) ? a.slice(0, MAX) : []; } catch (e) { return []; } };
const save = (a) => { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} };
let tt; const toast = (t) => { let n = $("bqShareToast"); if (!n) { n = document.createElement("div"); n.id = "bqShareToast"; n.setAttribute("role", "status"); n.setAttribute("aria-live", "polite"); document.body.appendChild(n); } n.textContent = t; n.classList.add("show"); clearTimeout(tt); tt = setTimeout(() => n.classList.remove("show"), 3200); };

const css = document.createElement("style");
css.textContent = `#cvCmpBar{display:inline-flex}
#cvCmp{margin-top:14px;border:1.5px solid var(--line);border-radius:14px;background:var(--surface);padding:14px}
#cvCmp h3{margin:0 0 4px;font-size:1.05rem}#cvCmp .sub{margin:0 0 10px;color:var(--muted);font-size:.86rem}
#cvCmp .sc{overflow-x:auto;border-radius:10px}
#cvCmp table{border-collapse:collapse;width:100%;min-width:440px;font-size:.9rem}
#cvCmp th,#cvCmp td{padding:9px 10px;border-bottom:1px solid var(--line);text-align:start;vertical-align:top}
#cvCmp thead th{font-size:.92rem;background:var(--copper-soft,transparent)}
#cvCmp tbody th{font-weight:600;color:var(--muted);font-size:.8rem;position:sticky;inset-inline-start:0;background:var(--surface);max-width:130px;min-width:96px;white-space:normal;overflow-wrap:anywhere;z-index:1;border-inline-end:1px solid var(--line)}
#cvCmp thead th:first-child{position:sticky;inset-inline-start:0;z-index:2}
#cvCmp td{min-width:118px}#cvCmp td b,#cvCmp tbody th span{unicode-bidi:plaintext}
#cvCmp td b{font-size:1rem}
#cvCmp .x{border:0;background:none;cursor:pointer;color:var(--muted);font:inherit;min-height:32px;min-width:32px;border-radius:8px}
#cvCmp .x:hover{color:var(--copper)}
#cvCmp a.o{font-size:.82rem;color:var(--copper)}
#cvCmp .foot{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
#cvCmp .foot button{font:inherit;font-size:.88rem;font-weight:600;padding:8px 14px;min-height:40px;border-radius:9px;border:1.5px solid var(--line);color:var(--ink);background:var(--surface);cursor:pointer}
#cvCmp .foot button:hover{border-color:var(--copper);color:var(--copper)}
@media print{#cvCmp,#cvCmpBtn{display:none!important}}`;
document.head.appendChild(css);

function snapshot() {
  const h = $("cvHead") && $("cvHead").querySelector("h3"), k = [...document.querySelectorAll("#cvKpi > div")];
  if (!h || !k.length) return null;
  const link = window.BQSHARE ? window.BQSHARE.link() : location.href;
  return { t: h.textContent.trim(), l: link, k: k.map((d) => { const v = (d.querySelector("b") || {}).innerHTML || ""; return { v, n: /bqm/.test(v) ? "التكلفة التقديرية للتحويل" : (d.querySelector("span") || {}).innerHTML || "" }; }) };
}

function render() {
  const a = load(); let box = $("cvCmp");
  if (!a.length) { if (box) box.remove(); return; }
  if (!box) { box = document.createElement("section"); box.id = "cvCmp"; box.setAttribute("aria-labelledby", "cvCmpT"); const anchor = $("cvShare") || $("cvActs"); anchor.after(box); }
  const rows = a[0].k.map((_, i) => `<tr><th scope="row">${a[0].k[i].n}</th>${a.map((c) => `<td>${c.k[i] ? `<b>${c.k[i].v}</b>` : "—"}</td>`).join("")}</tr>`).join("");
  box.innerHTML = `<h3 id="cvCmpT">مقارنة الخطط (${a.length} من ${MAX})</h3><p class="sub">تُحفظ في متصفحك فقط، وتتبع الأسعار عملتك المختارة. افتح أي خطة لتعديل خياراتها.</p>
<div class="sc" tabindex="0" role="region" aria-label="جدول مقارنة الخطط"><table><thead><tr><th scope="col">المؤشر</th>${a.map((c, i) => `<th scope="col">${esc(c.t)}<br><a class="o" href="${esc(c.l)}">افتح الخطة</a> <button type="button" class="x" data-x="${i}" aria-label="إزالة ${esc(c.t)} من المقارنة">✕</button></th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div>
<div class="foot"><button type="button" data-clear>مسح المقارنة</button></div>`;
}

function mountBtn() {
  const acts = $("cvActs"); if (!acts || $("cvCmpBtn")) return;
  const b = document.createElement("button"); b.type = "button"; b.id = "cvCmpBtn"; b.textContent = "أضف إلى المقارنة"; acts.appendChild(b);
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#cvCmpBtn")) {
    const s = snapshot(); if (!s) return; let a = load();
    if (a.some((c) => c.t === s.t)) { a = a.map((c) => (c.t === s.t ? s : c)); save(a); render(); toast("حُدِّثت هذه السيارة في المقارنة بخياراتك الحالية."); return; }
    if (a.length >= MAX) { toast(`المقارنة تتسع لـ ${MAX} سيارات. أزل واحدة أولاً.`); return; }
    a.push(s); save(a); render(); toast(a.length === 1 ? "أضيفت السيارة. اختر سيارة أخرى وأضفها لتقارن." : "أضيفت السيارة إلى المقارنة."); const box = $("cvCmp"); if (box && a.length > 1) box.scrollIntoView({ block: "nearest", behavior: "smooth" });
  } else if (e.target.closest("[data-x]")) { const i = +e.target.closest("[data-x]").dataset.x; const a = load(); a.splice(i, 1); save(a); render(); }
  else if (e.target.closest("[data-clear]")) { save([]); render(); }
});
const start = () => { mountBtn(); render(); const acts = $("cvActs"); if (acts) new MutationObserver(mountBtn).observe(acts, { childList: true }); };
document.readyState === "loading" ? addEventListener("DOMContentLoaded", start) : start();
})();
