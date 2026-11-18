// براق · طباعة الخطة / حفظها PDF: تُطبع الخطة وحدها بترويسة براق (بدل طباعة الصفحة كلها في عشرات الصفحات).
// مستقل: يعترض زري «طباعة الخطة» في المخطط ومدد مصر، ويخفي كل ما عداهما أثناء الطباعة فقط.
(() => {
const $ = (id) => document.getElementById(id);
const p2 = (n) => String(n).padStart(2, "0");
const today = () => { const d = new Date(); return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`; };
const BASE = new URL("./", location.href).href.split("#")[0];
const css = document.createElement("style");
css.textContent = `.bq-pp-head{display:none}
@media print{
 @page{size:A4;margin:12mm}
 html,body{background:#fff!important}
 .bq-pp-hide{display:none!important}
 body.bq-pp .wa-fab,body.bq-pp #bqShareToast,body.bq-pp .sec-head,body.bq-pp #cvShare,body.bq-pp .md-acts,body.bq-pp #mdActs{display:none!important}
 body.bq-pp .bq-pp-head{display:flex!important;justify-content:space-between;gap:16px;align-items:flex-start;border-bottom:2.5px solid #14202A;padding:0 0 10px;margin:0 0 14px;color:#14202A;font-family:"Noto Sans Arabic",Tahoma,Arial,sans-serif;direction:rtl;break-inside:avoid}
 .bq-pp-head b{font-size:20pt;line-height:1.1;display:block}
 .bq-pp-head small{color:#566570;font-size:9pt;display:block}
 .bq-pp-head h1{margin:0;font-size:15pt;color:#A9572A}
 .bq-pp-head .r{text-align:left;font-size:9.5pt;color:#566570;direction:ltr;line-height:1.6}
}`;
document.head.appendChild(css);

function run(target, title, keep) {
  const hidden = [], head = document.createElement("div");
  head.className = "bq-pp-head";
  head.innerHTML = `<div><b>براق</b><small>BURAQ · تحويل السيارات إلى كهربائية</small><h1></h1></div><div class="r">${today()}<br>+974 5160 0498<br>munijizqa@gmail.com<br>${BASE.replace(/^https?:\/\//, "")}</div>`;
  head.querySelector("h1").textContent = title;
  const host = target.querySelector(".wrap") || target; host.prepend(head);
  for (const ch of host.children) if (ch !== head && !(keep && ch.matches(keep)) && !ch.classList.contains("bq-pp-hide")) { ch.classList.add("bq-pp-hide"); hidden.push(ch); }
  for (let n = target; n && n !== document.body; n = n.parentElement)
    for (const s of n.parentElement.children) if (s !== n && s.tagName !== "SCRIPT" && s.tagName !== "STYLE" && s.tagName !== "LINK") { if (!s.classList.contains("bq-pp-hide")) { s.classList.add("bq-pp-hide"); hidden.push(s); } }
  document.body.classList.add("bq-pp");
  let done = false;
  const clean = () => { if (done) return; done = true; document.body.classList.remove("bq-pp"); hidden.forEach((s) => s.classList.remove("bq-pp-hide")); head.remove(); window.removeEventListener("afterprint", clean); };
  window.addEventListener("afterprint", clean);
  window.__bqPrinted = (window.__bqPrinted || 0) + 1;
  setTimeout(() => { try { window.print(); } catch (e) {} setTimeout(clean, 1500); }, 60);
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("#cvPrint,#mdPrint"); if (!b) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (b.id === "cvPrint") { const h = $("cvHead") && $("cvHead").querySelector("h3"); run($("convert"), "خطة تحويل " + (h ? h.textContent.trim() : "سيارتي") + " إلى كهربائية", ".cv-plan"); }
  else { const h = $("mdHead") && $("mdHead").querySelector("h3"); run($("madad"), "خطة مدد مصر" + (h ? " · " + h.textContent.trim() : ""), ".md-calc"); }
}, true);
})();
