// براق · محرر محتوى الموقع (للمدير فقط): الأقسام والنصوص والصور والأسئلة الشائعة والأقسام الجديدة والاستبدال الشامل.
// يحفظ مسودة في المتصفح حتى تضغط «نشر»، ثم يكتب المستند content/cms في Firestore فيراه الزوار فوراً.
// القواعد: content/* قراءة عامة وكتابة للمدير فقط (firestore.rules). النسخة السابقة تُحفظ في content/cms_prev للتراجع.
import { F, db } from "./fb.js";
import { esc, toast, errMsg, fmtDate } from "./ui.js";

const $ = (id) => document.getElementById(id);
const B = () => window.BQCMS;
const clone = (o) => JSON.parse(JSON.stringify(o ?? null));
const KEYS = ["order", "hide", "texts", "imgs", "faq", "custom", "repl", "title", "desc", "code"];
const PANELS = [["sections", "الأقسام والترتيب"], ["texts", "النصوص"], ["imgs", "الصور"], ["faq", "الأسئلة الشائعة"], ["custom", "أقسام جديدة"], ["repl", "استبدال شامل"], ["code", "برمجة مخصصة"], ["gen", "عام ونسخ احتياطي"]];

let ME = null, root = null, PUB = {}, DRAFT = {}, SECS = [], STATIC_IDS = [], STATIC_FAQ = [], IMGDATA = {}, panel = "sections", secSel = "", q = "", dirty = false, meta = {}, pvWin = null;

export async function mount(me) {
  ME = me; root = $("cmsRoot");
  if (root.dataset.ready) return;
  root.dataset.ready = "1";
  root.innerHTML = `<p class="loading">جارٍ تحميل محرر الموقع…</p>`;
  try { await load(); } catch (e) { root.innerHTML = `<p class="msg err">${esc(errMsg(e))}</p>`; root.dataset.ready = ""; return; }
  draw();
}

async function load() {
  const [cs, html] = await Promise.all([
    F.getDoc(F.doc(db, "content", "cms")),
    fetch("index.html", { cache: "no-store" }).then((r) => { if (!r.ok) throw new Error("تعذّر تحميل الصفحة الرئيسية لاستخراج محتواها."); return r.text(); })
  ]);
  const d = cs.exists() ? cs.data() : {};
  meta = { rev: d.rev || 0, at: d.updatedAt, by: d.updatedBy };
  PUB = pick(d); DRAFT = clone(PUB);
  const doc = new DOMParser().parseFromString(html, "text/html");
  SECS = B().enumerate(doc).map((s) => ({ id: s.id, label: s.label, slots: B().slotsOf(s.el), imgs: B().imgsOf(s.el) }));
  const c = doc.getElementById("contact");
  STATIC_IDS = c ? [...c.parentNode.children].filter((n) => n.tagName === "SECTION" && n.id).map((n) => n.id) : [];
  const i = STATIC_IDS.indexOf("contact");
  if (!STATIC_IDS.includes("prices")) STATIC_IDS.splice(i < 0 ? STATIC_IDS.length : i, 0, "prices");
  STATIC_FAQ = [...doc.querySelectorAll("#faq .faq details")].map((x) => ({ q: x.querySelector("summary")?.textContent.trim() || "", a: B().toMd(x.querySelector("p") || x).trim(), on: true }));
  secSel = SECS.find((s) => s.id !== "footer" && s.slots.length)?.id || "";
  // صور مرفوعة سابقاً (للمعاينة والعرض داخل اللوحة)
  const ids = new Set();
  (DRAFT.imgs || []).forEach((x) => x.src?.startsWith("img:") && ids.add(x.src.slice(4)));
  (DRAFT.custom || []).forEach((x) => x.img?.startsWith("img:") && ids.add(x.img.slice(4)));
  await Promise.all([...ids].map(async (id) => { const s = await F.getDoc(F.doc(db, "content", "img_" + id)).catch(() => null); if (s?.exists()) IMGDATA[id] = s.data().data; }));
}
function pick(d) { const o = {}; KEYS.forEach((k) => { if (d[k] !== undefined && d[k] !== null) o[k] = clone(d[k]); }); return o; }
const secLabel = (id) => (id === "prices" ? "قائمة الأسعار" : SECS.find((s) => s.id === id)?.label || (DRAFT.custom || []).find((c) => c.id === id)?.title || id);

// ترتيب الأقسام الفعلي = ترتيب الصفحة الأصلي مع أقسام جديدة قبل «تواصل»، ثم ترتيب المسودة
function effOrder() {
  const base = STATIC_IDS.slice(), at = base.indexOf("contact");
  (DRAFT.custom || []).forEach((c) => { if (!base.includes(c.id)) base.splice(at < 0 ? base.length : base.indexOf("contact"), 0, c.id); });
  const listed = (DRAFT.order || []).filter((id, i, a) => base.includes(id) && a.indexOf(id) === i);
  const idx = []; base.forEach((id, i) => listed.includes(id) && idx.push(i));
  const out = base.slice(); idx.forEach((p, j) => (out[p] = listed[j]));
  return out;
}
function markDirty() { dirty = JSON.stringify(DRAFT) !== JSON.stringify(PUB); const b = $("cmsDirty"); if (b) { b.hidden = !dirty; $("cmsPub").disabled = !dirty; $("cmsDiscard").disabled = !dirty; } }
addEventListener("beforeunload", (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

function draw() {
  root.innerHTML = `
  <p class="cms-info"><b>محرر الموقع</b> <span class="mute sm">${meta.rev ? `آخر نشر: ${fmtDate(meta.at, true)} · ${esc(meta.by || "")} · نسخة ${meta.rev}` : "لم يُنشر أي تعديل بعد؛ الموقع يعرض محتواه الأصلي."}</span></p>
  <div class="cms-bar" id="cmsBar">
    <span class="badge st-rev" id="cmsDirty" hidden>تعديلات غير منشورة</span>
    <div class="cms-bar-acts">
      <button class="btn sm" id="cmsPv" type="button">معاينة</button>
      <button class="btn sm" id="cmsDiscard" type="button" disabled>تجاهل التعديلات</button>
      <button class="btn sm pri" id="cmsPub" type="button" disabled>نشر على الموقع</button>
    </div>
  </div>
  <p class="mute sm" style="margin:8px 0 14px">تُحفظ تعديلاتك مسودةً حتى تضغط «نشر على الموقع»، فتظهر للزوار فوراً دون أي تدخل خارجي. إن تعذّر تحميل المحتوى لأي سبب يعرض الموقع نصه الأصلي كاملاً.</p>
  <div class="cms-nav" role="tablist" aria-label="أقسام المحرر">${PANELS.map(([k, t]) => `<button type="button" role="tab" aria-selected="${k === panel}" data-pn="${k}">${t}</button>`).join("")}</div>
  <div id="cmsPanel"></div>`;
  root.querySelector(".cms-nav").onclick = (e) => { const b = e.target.closest("[data-pn]"); if (b) { panel = b.dataset.pn; draw(); } };
  $("cmsPv").onclick = () => preview();
  $("cmsDiscard").onclick = () => { if (confirm("تجاهل كل التعديلات غير المنشورة والعودة للنسخة المنشورة؟")) { DRAFT = clone(PUB); draw(); } };
  $("cmsPub").onclick = publish;
  ({ sections: pSections, texts: pTexts, imgs: pImgs, faq: pFaq, custom: pCustom, repl: pRepl, code: pCode, gen: pGen })[panel]();
  markDirty();
}

// ===== الأقسام والترتيب =====
function pSections() {
  const ord = effOrder(), hid = new Set(DRAFT.hide || []);
  $("cmsPanel").innerHTML = `<p class="mute sm">رتّب الأقسام بالأسهم، وأخفِ أي قسم من الموقع (يختفي من القائمة أيضاً) ثم أظهره متى شئت. الأقسام الجديدة تُنشأ من تبويب «أقسام جديدة».</p>
  <div class="list" id="secList">${ord.map((id, i) => `<div class="item cms-row" data-id="${esc(id)}">
    <div><b class="cms-h">${esc(secLabel(id))} ${hid.has(id) ? '<span class="badge st-x">مخفي</span>' : ""} ${(DRAFT.custom || []).some((c) => c.id === id) ? '<span class="badge st-ok">قسم جديد</span>' : ""}</b><div class="meta"><span dir="ltr">#${esc(id)}</span>${id === "prices" ? "<span>يُبنى من تبويب «الكتالوج والأسعار»</span>" : ""}</div></div>
    <div class="acts"><button class="btn sm" data-up ${i === 0 ? "disabled" : ""} aria-label="تحريك للأعلى">↑</button><button class="btn sm" data-dn ${i === ord.length - 1 ? "disabled" : ""} aria-label="تحريك للأسفل">↓</button>
      <button class="btn sm" data-pv>معاينة</button><button class="btn sm ${hid.has(id) ? "pri" : ""}" data-hd>${hid.has(id) ? "إظهار" : "إخفاء"}</button></div></div>`).join("")}</div>
  <div class="row" style="margin-top:14px"><button class="btn sm" id="ordReset">إعادة الترتيب الأصلي</button></div>`;
  $("secList").onclick = (e) => {
    const r = e.target.closest("[data-id]"); if (!r) return; const id = r.dataset.id, o = effOrder(), i = o.indexOf(id);
    if (e.target.closest("[data-up]") && i > 0) { [o[i - 1], o[i]] = [o[i], o[i - 1]]; DRAFT.order = o; }
    else if (e.target.closest("[data-dn]") && i < o.length - 1) { [o[i + 1], o[i]] = [o[i], o[i + 1]]; DRAFT.order = o; }
    else if (e.target.closest("[data-hd]")) { const h = new Set(DRAFT.hide || []); h.has(id) ? h.delete(id) : h.add(id); DRAFT.hide = [...h]; if (!DRAFT.hide.length) delete DRAFT.hide; }
    else if (e.target.closest("[data-pv]")) return preview(id);
    else return;
    draw();
  };
  $("ordReset").onclick = () => { delete DRAFT.order; draw(); };
}

// ===== النصوص =====
const tFind = (s, o, n) => (DRAFT.texts || []).find((t) => t.s === s && t.o === o && t.n === n);
function tSet(s, sl, patch) {
  DRAFT.texts = DRAFT.texts || [];
  let t = tFind(s, sl.snip, sl.n);
  if (!t) { t = { s, o: sl.snip, n: sl.n }; DRAFT.texts.push(t); }
  Object.assign(t, patch);
  if (t.t === undefined || t.t === null) delete t.t;
  if (!t.h) delete t.h;
  if (t.t === undefined && !t.h) DRAFT.texts = DRAFT.texts.filter((x) => x !== t);
  if (!DRAFT.texts.length) delete DRAFT.texts;
}
function secOptions() { return SECS.map((s) => `<option value="${esc(s.id)}" ${s.id === secSel ? "selected" : ""}>${esc(s.label)}${(DRAFT.texts || []).some((t) => t.s === s.id) ? " ●" : ""}</option>`).join(""); }
function pTexts() {
  $("cmsPanel").innerHTML = `<p class="mute sm">اختر القسم ثم عدّل أي عنوان أو فقرة أو بند أو خلية جدول. للروابط اكتب <bdi>[النص](#القسم)</bdi> أو <bdi>[النص](https://…)</bdi>، وللخط الغامق <bdi>**نص**</bdi>. الأسعار داخل الجداول التي تتبع عملة الزائر تُعدَّل من تبويب «الكتالوج والأسعار».</p>
  <div class="toolbar"><select id="tSec" aria-label="القسم">${secOptions()}</select><input id="tQ" type="search" placeholder="بحث داخل نصوص القسم" value="${esc(q)}"><button class="btn sm" id="tPv">معاينة القسم</button></div><div id="tList"></div>`;
  $("tSec").onchange = (e) => { secSel = e.target.value; q = ""; draw(); };
  $("tQ").oninput = (e) => { q = e.target.value; slotList(); };
  $("tPv").onclick = () => preview(secSel);
  slotList();
}
function slotList() {
  const s = SECS.find((x) => x.id === secSel); if (!s) return;
  const hit = s.slots.map((sl, i) => [sl, i]).filter(([sl]) => { const t = tFind(s.id, sl.snip, sl.n); return !q || (sl.md + " " + (t?.t || "")).includes(q); });
  $("tList").innerHTML = hit.slice(0, 300).map(([sl, i]) => {
    const t = tFind(s.id, sl.snip, sl.n), val = t?.t ?? sl.md;
    return `<div class="cms-slot ${t ? "chg" : ""} ${t?.h ? "off" : ""}" data-i="${i}"><div class="cms-top"><span class="badge">${esc(sl.tag)}</span>${t?.t !== undefined ? '<span class="badge st-q">معدّل</span>' : ""}${t?.h ? '<span class="badge st-x">مخفي</span>' : ""}</div>
      <textarea rows="${Math.min(8, Math.max(1, Math.ceil(val.length / 70)))}" aria-label="نص ${esc(sl.tag)}">${esc(val)}</textarea>
      <div class="cms-acts"><button class="btn sm" data-hd>${t?.h ? "إظهار" : "إخفاء"}</button><button class="btn sm" data-rs ${t ? "" : "disabled"}>استرجاع الأصلي</button></div></div>`;
  }).join("") || `<p class="empty">لا نصوص مطابقة في هذا القسم.</p>`;
  if (hit.length > 300) $("tList").insertAdjacentHTML("beforeend", `<p class="mute sm">يُعرض أول 300 نص فقط؛ ضيّق البحث لرؤية الباقي.</p>`);
  $("tList").onchange = (e) => {
    const c = e.target.closest(".cms-slot"); if (!c || e.target.tagName !== "TEXTAREA") return;
    const sl = s.slots[+c.dataset.i], v = e.target.value.trim();
    if (!v) { toast("لا يمكن ترك النص فارغاً؛ استخدم «إخفاء» لإزالة العنصر من الموقع.", true); e.target.value = tFind(s.id, sl.snip, sl.n)?.t ?? sl.md; return; }
    tSet(s.id, sl, { t: v === sl.md ? undefined : v }); markDirty(); c.classList.toggle("chg", !!tFind(s.id, sl.snip, sl.n));
  };
  $("tList").onclick = (e) => {
    const c = e.target.closest(".cms-slot"); if (!c) return; const sl = s.slots[+c.dataset.i], t = tFind(s.id, sl.snip, sl.n);
    if (e.target.closest("[data-hd]")) tSet(s.id, sl, { h: !t?.h });
    else if (e.target.closest("[data-rs]")) tSet(s.id, sl, { t: undefined, h: false });
    else return;
    markDirty(); slotList();
  };
}

// ===== الصور =====
const iFind = (s, o, n) => (DRAFT.imgs || []).find((t) => t.s === s && t.o === o && t.n === n);
function iSet(s, im, patch) {
  DRAFT.imgs = DRAFT.imgs || [];
  let t = iFind(s, im.src, im.n);
  if (!t) { t = { s, o: im.src, n: im.n }; DRAFT.imgs.push(t); }
  Object.assign(t, patch);
  ["src", "alt"].forEach((k) => { if (t[k] === undefined || t[k] === null || t[k] === "") delete t[k]; });
  if (!t.h) delete t.h;
  if (!t.src && t.alt === undefined && !t.h) DRAFT.imgs = DRAFT.imgs.filter((x) => x !== t);
  if (!DRAFT.imgs.length) delete DRAFT.imgs;
}
const imgUrl = (v) => (v?.startsWith("img:") ? IMGDATA[v.slice(4)] || "" : v || "");
async function fileToData(file) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error("الصيغ المقبولة: JPG أو PNG أو WebP.");
  const bmp = await createImageBitmap(file), k = Math.min(1, 1280 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
  let qlt = 0.86, d = c.toDataURL("image/jpeg", qlt);
  while (d.length > 680000 && qlt > 0.4) { qlt -= 0.08; d = c.toDataURL("image/jpeg", qlt); }
  if (d.length > 700000) throw new Error("الصورة كبيرة جداً؛ اختر صورة أصغر.");
  return d;
}
const newImgId = () => "i" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function pImgs() {
  const sel = SECS.filter((s) => s.imgs.length);
  if (!sel.find((s) => s.id === secSel)) secSel = sel[0]?.id || "";
  $("cmsPanel").innerHTML = `<p class="mute sm">استبدل أي صورة في الموقع برابط https أو بصورة ترفعها من جهازك (تُصغَّر تلقائياً وتُحفظ في قاعدة البيانات)، أو غيّر وصفها، أو أخفِها.</p>
  <div class="toolbar"><select id="iSec" aria-label="القسم">${sel.map((s) => `<option value="${esc(s.id)}" ${s.id === secSel ? "selected" : ""}>${esc(s.label)} (${s.imgs.length})</option>`).join("")}</select></div><div id="iList"></div>`;
  $("iSec").onchange = (e) => { secSel = e.target.value; draw(); };
  const s = SECS.find((x) => x.id === secSel); if (!s) return ($("iList").innerHTML = `<p class="empty">لا صور في الأقسام الثابتة.</p>`);
  $("iList").innerHTML = s.imgs.map((im, i) => {
    const t = iFind(s.id, im.src, im.n), cur = t?.src ? imgUrl(t.src) : im.src;
    return `<div class="cms-slot ${t ? "chg" : ""} ${t?.h ? "off" : ""}" data-i="${i}"><div class="cms-img"><img src="${esc(cur)}" alt="" loading="lazy"></div>
      <div class="cms-fields"><label class="f">رابط الصورة الجديدة (https) <input data-f="src" dir="ltr" value="${esc(t?.src && !t.src.startsWith("img:") ? t.src : "")}" placeholder="https://… أو ارفع صورة"></label>
      <label class="f">الوصف البديل <input data-f="alt" value="${esc(t?.alt ?? im.alt)}"></label>
      <div class="cms-acts"><label class="btn sm">رفع صورة<input type="file" accept="image/png,image/jpeg,image/webp" data-up hidden></label><button class="btn sm" data-hd>${t?.h ? "إظهار" : "إخفاء"}</button><button class="btn sm" data-rs ${t ? "" : "disabled"}>استرجاع الأصلية</button></div>
      <small class="mute" dir="ltr">${esc(im.src)}</small></div></div>`;
  }).join("");
  const L = $("iList");
  L.onchange = async (e) => {
    const c = e.target.closest(".cms-slot"); if (!c) return; const im = s.imgs[+c.dataset.i];
    if (e.target.matches("[data-up]")) {
      const f = e.target.files[0]; if (!f) return;
      try { const id = newImgId(); IMGDATA[id] = await fileToData(f); iSet(s.id, im, { src: "img:" + id }); toast("جُهّزت الصورة. اضغط «نشر على الموقع» لإظهارها."); markDirty(); pImgs(); } catch (err) { toast(errMsg(err), true); }
    } else if (e.target.dataset.f === "src") {
      const v = e.target.value.trim(); if (v && !B().safeUrl(v)) { toast("الرابط يجب أن يبدأ بـ https://", true); return; }
      iSet(s.id, im, { src: v || undefined }); markDirty(); pImgs();
    } else if (e.target.dataset.f === "alt") { iSet(s.id, im, { alt: e.target.value.trim() }); markDirty(); }
  };
  L.onclick = (e) => {
    const c = e.target.closest(".cms-slot"); if (!c) return; const im = s.imgs[+c.dataset.i], t = iFind(s.id, im.src, im.n);
    if (e.target.closest("[data-hd]")) iSet(s.id, im, { h: !t?.h });
    else if (e.target.closest("[data-rs]")) { DRAFT.imgs = (DRAFT.imgs || []).filter((x) => x !== t); if (!DRAFT.imgs.length) delete DRAFT.imgs; }
    else return;
    markDirty(); pImgs();
  };
}

// ===== الأسئلة الشائعة =====
const faqItems = () => DRAFT.faq?.items || clone(STATIC_FAQ);
function faqSet(items) { DRAFT.faq = { items }; markDirty(); }
function pFaq() {
  const items = faqItems();
  $("cmsPanel").innerHTML = `<p class="mute sm">${DRAFT.faq ? "" : "تُعرض هنا الأسئلة الأصلية؛ أي تعديل ينشئ نسخة قابلة للتحرير تحلّ محلها. "}أضف الأسئلة وعدّلها واحذفها ورتّبها. يتحدّث ترميز الأسئلة لمحركات البحث تلقائياً. في الإجابة: <bdi>[النص](#قسم)</bdi> للرابط و<bdi>**نص**</bdi> للغامق.</p>
  <div class="toolbar"><button class="btn sm pri" id="fAdd">إضافة سؤال</button>${DRAFT.faq ? '<button class="btn sm" id="fReset">استرجاع الأسئلة الأصلية</button>' : ""}<button class="btn sm" id="fPv">معاينة</button></div>
  <div id="fList">${items.map((x, i) => `<div class="cms-slot ${x.on === false ? "off" : ""}" data-i="${i}"><div class="cms-top"><span class="badge">${i + 1}</span>${x.on === false ? '<span class="badge st-x">مخفي</span>' : ""}</div>
    <label class="f">السؤال<input data-f="q" value="${esc(x.q)}" maxlength="300"></label><label class="f">الإجابة<textarea data-f="a" rows="3" maxlength="3000">${esc(x.a)}</textarea></label>
    <div class="cms-acts"><button class="btn sm" data-up ${i === 0 ? "disabled" : ""} aria-label="أعلى">↑</button><button class="btn sm" data-dn ${i === items.length - 1 ? "disabled" : ""} aria-label="أسفل">↓</button><button class="btn sm" data-hd>${x.on === false ? "إظهار" : "إخفاء"}</button><button class="btn sm bad" data-del>حذف</button></div></div>`).join("")}</div>`;
  $("fPv").onclick = () => preview("faq");
  $("fAdd").onclick = () => { const it = faqItems(); it.push({ q: "سؤال جديد؟", a: "اكتب الإجابة هنا.", on: true }); faqSet(it); pFaq(); $("fList").lastElementChild?.querySelector("input")?.focus(); };
  if ($("fReset")) $("fReset").onclick = () => { if (confirm("استرجاع الأسئلة الأصلية وحذف تعديلاتك عليها؟")) { delete DRAFT.faq; markDirty(); pFaq(); } };
  const L = $("fList");
  L.onchange = (e) => { const c = e.target.closest("[data-i]"), k = e.target.dataset.f; if (!c || !k) return; const it = faqItems(); it[+c.dataset.i][k] = e.target.value.trim(); faqSet(it); };
  L.onclick = (e) => {
    const c = e.target.closest("[data-i]"); if (!c) return; const i = +c.dataset.i, it = faqItems();
    if (e.target.closest("[data-up]") && i > 0) [it[i - 1], it[i]] = [it[i], it[i - 1]];
    else if (e.target.closest("[data-dn]") && i < it.length - 1) [it[i + 1], it[i]] = [it[i], it[i + 1]];
    else if (e.target.closest("[data-hd]")) it[i].on = it[i].on === false;
    else if (e.target.closest("[data-del]")) { if (!confirm("حذف هذا السؤال؟")) return; it.splice(i, 1); }
    else return;
    faqSet(it); pFaq();
  };
}

// ===== أقسام جديدة =====
let editing = null;
function pCustom() {
  const list = DRAFT.custom || [];
  if (editing) return customForm();
  $("cmsPanel").innerHTML = `<p class="mute sm">أنشئ أقساماً كاملة (عنوان، نص، نقاط، صورة، زر) تظهر في الصفحة وفي قائمتها. رتّبها من تبويب «الأقسام والترتيب».</p>
  <div class="toolbar"><button class="btn sm pri" id="cNew">قسم جديد</button></div>
  <div class="list">${list.map((c) => `<div class="item" data-id="${esc(c.id)}"><div><b class="cms-h">${esc(c.title || "(بلا عنوان)")} ${c.on === false ? '<span class="badge st-x">مخفي</span>' : ""}</b><div class="meta"><span dir="ltr">#${esc(c.id)}</span></div></div>
    <div class="acts"><button class="btn sm" data-ed>تعديل</button><button class="btn sm" data-pv>معاينة</button><button class="btn sm bad" data-del>حذف</button></div></div>`).join("") || '<p class="empty">لا أقسام مضافة بعد.</p>'}</div>`;
  $("cNew").onclick = () => { editing = { id: "x" + Date.now().toString(36), on: true, nav: true, isNew: true }; pCustom(); };
  $("cmsPanel").onclick = (e) => {
    const r = e.target.closest("[data-id]"); if (!r) return; const id = r.dataset.id;
    if (e.target.closest("[data-ed]")) { editing = clone((DRAFT.custom || []).find((c) => c.id === id)); pCustom(); }
    else if (e.target.closest("[data-pv]")) preview(id);
    else if (e.target.closest("[data-del]")) { if (!confirm("حذف هذا القسم نهائياً من الموقع بعد النشر؟")) return; DRAFT.custom = DRAFT.custom.filter((c) => c.id !== id); if (!DRAFT.custom.length) delete DRAFT.custom; if (DRAFT.order) DRAFT.order = DRAFT.order.filter((x) => x !== id); markDirty(); pCustom(); }
  };
}
function customForm() {
  const c = editing, g = (k) => esc(c[k] ?? "");
  $("cmsPanel").innerHTML = `<form class="card" id="cF" novalidate><h2>${c.isNew ? "قسم جديد" : "تعديل القسم"}</h2>
    <div class="row"><label class="f">عنوان القسم *<input name="title" maxlength="120" value="${g("title")}" required></label><label class="f">عنوان صغير فوقه (اختياري)<input name="eyebrow" maxlength="60" value="${g("eyebrow")}"></label></div>
    <label class="f">نص تمهيدي<textarea name="lead" maxlength="600" style="min-height:70px">${g("lead")}</textarea></label>
    <label class="f">المحتوى (فقرات تفصلها سطر فارغ، ونقاط تبدأ كل منها بـ - )<textarea name="body" maxlength="12000" style="min-height:160px">${g("body")}</textarea></label>
    <div class="row"><label class="f">رابط الصورة (https) أو ارفع صورة<input name="img" dir="ltr" value="${c.img?.startsWith("img:") ? "" : g("img")}" placeholder="https://…"></label><label class="f">وصف الصورة<input name="imgAlt" maxlength="200" value="${g("imgAlt")}"></label></div>
    <div class="cms-acts"><label class="btn sm">رفع صورة<input type="file" id="cUp" accept="image/png,image/jpeg,image/webp" hidden></label>${c.img?.startsWith("img:") && IMGDATA[c.img.slice(4)] ? `<img src="${IMGDATA[c.img.slice(4)]}" alt="" style="height:54px;border-radius:8px"> <button class="btn sm" type="button" id="cImgDel">إزالة الصورة</button>` : ""}</div>
    <div class="row"><label class="f">نص الزر (اختياري)<input name="btn" maxlength="60" value="${g("btn")}"></label><label class="f">رابط الزر<input name="url" dir="ltr" value="${g("url")}" placeholder="#contact أو https://…"></label></div>
    <div class="row"><label class="f">إظهار القسم<select name="on"><option value="1" ${c.on !== false ? "selected" : ""}>ظاهر</option><option value="0" ${c.on === false ? "selected" : ""}>مخفي</option></select></label>
    <label class="f">اسمه في قائمة الموقع (اتركه فارغاً لعدم إضافته)<input name="navLabel" maxlength="30" value="${g("navLabel")}"></label></div>
    <div class="cms-acts"><button class="btn pri" type="submit">حفظ في المسودة</button><button class="btn" type="button" id="cCancel">رجوع</button></div></form>`;
  $("cCancel").onclick = () => { editing = null; pCustom(); };
  if ($("cImgDel")) $("cImgDel").onclick = () => { delete editing.img; collect(); customForm(); };
  $("cUp").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { collect(); const id = newImgId(); IMGDATA[id] = await fileToData(f); editing.img = "img:" + id; customForm(); } catch (err) { toast(errMsg(err), true); } };
  const collect = () => { const f = new FormData($("cF")); ["title", "eyebrow", "lead", "body", "btn", "url", "imgAlt", "navLabel"].forEach((k) => (editing[k] = String(f.get(k) || "").trim())); const iv = String(f.get("img") || "").trim(); if (iv || !editing.img?.startsWith("img:")) editing.img = iv; editing.on = f.get("on") !== "0"; editing.nav = !!editing.navLabel; };
  $("cF").onsubmit = (e) => {
    e.preventDefault(); collect();
    if (!editing.title) return toast("عنوان القسم مطلوب.", true);
    if (editing.img && !editing.img.startsWith("img:") && !B().safeUrl(editing.img)) return toast("رابط الصورة يجب أن يبدأ بـ https://", true);
    if (editing.url && !B().safeUrl(editing.url)) return toast("رابط الزر غير صالح؛ ابدأه بـ # أو https://", true);
    const { isNew, ...c2 } = editing; Object.keys(c2).forEach((k) => (c2[k] === "" || c2[k] === undefined) && delete c2[k]);
    DRAFT.custom = DRAFT.custom || []; const i = DRAFT.custom.findIndex((x) => x.id === c2.id); i < 0 ? DRAFT.custom.push(c2) : (DRAFT.custom[i] = c2);
    editing = null; markDirty(); toast("حُفظ القسم في المسودة. اضغط «نشر على الموقع» لإظهاره."); pCustom();
  };
}

// ===== استبدال شامل =====
function pRepl() {
  const r = DRAFT.repl || [];
  $("cmsPanel").innerHTML = `<p class="mute sm">يستبدل كل ظهور لعبارة بأخرى في نصوص الصفحة كلها وروابطها (مثل رقم هاتف أو بريد أو اسم). يعمل على ما هو ظاهر في الصفحة عند التحميل، ويُراعى توحيد الصيغة: الهاتف <bdi>+974 5160 0498</bdi> والبريد بحروف صغيرة.</p>
  <div class="toolbar"><button class="btn sm pri" id="rAdd">إضافة قاعدة</button></div>
  <div id="rList">${r.map((x, i) => `<div class="cms-slot" data-i="${i}"><div class="row"><label class="f">استبدل<input data-f="f" value="${esc(x.f)}" maxlength="200"></label><label class="f">بـ<input data-f="t" value="${esc(x.t)}" maxlength="200"></label></div><div class="cms-acts"><button class="btn sm bad" data-del>حذف القاعدة</button></div></div>`).join("") || '<p class="empty">لا قواعد استبدال.</p>'}</div>`;
  $("rAdd").onclick = () => { DRAFT.repl = [...(DRAFT.repl || []), { f: "", t: "" }]; markDirty(); pRepl(); };
  $("rList").onchange = (e) => { const c = e.target.closest("[data-i]"), k = e.target.dataset.f; if (c && k) { DRAFT.repl[+c.dataset.i][k] = e.target.value; markDirty(); } };
  $("rList").onclick = (e) => { const c = e.target.closest("[data-i]"); if (c && e.target.closest("[data-del]")) { DRAFT.repl.splice(+c.dataset.i, 1); if (!DRAFT.repl.length) delete DRAFT.repl; markDirty(); pRepl(); } };
}

// ===== برمجة مخصصة (CSS / HTML / JS) =====
function pCode() {
  const c = DRAFT.code || {}, v = (k) => esc(c[k] || "");
  $("cmsPanel").innerHTML = `<div class="msg info"><b>صلاحية كاملة على الواجهة، بحدود واضحة:</b> الكود هنا يُحفظ في قاعدة البيانات ويُطبَّق على الصفحة الرئيسية فقط (لا على صفحتي الحساب والإدارة)، ولا يكتبه إلا المدير. يمكنك تعطيله فوراً بإضافة <bdi dir="ltr">?safe=1</bdi> لرابط الموقع، أو بالمفتاح أدناه. كل نشر يُحفظ في سجل نسخ قابل للاستعادة. لا يمكن من هنا تعديل ملفات الخادم أو قواعد Firebase أو صفحتي الحساب والإدارة نفسيهما، فهذه تُغيَّر عبر مستودع الموقع. كود JavaScript يُنفَّذ بصلاحيات الصفحة كاملة، فلا تلصق إلا ما تثق به.</div>
  <label class="f">تفعيل الكود المخصص<select id="kOn"><option value="1" ${c.on !== false ? "selected" : ""}>مفعّل</option><option value="0" ${c.on === false ? "selected" : ""}>معطّل (يبقى محفوظاً)</option></select></label>
  <label class="f">CSS (تنسيق إضافي)<textarea id="kCss" dir="ltr" class="code" spellcheck="false" placeholder=".hero-cta{gap:20px}">${v("css")}</textarea></label>
  <label class="f">HTML (يُضاف في نهاية الصفحة قبل الإغلاق)<textarea id="kHtml" dir="ltr" class="code" spellcheck="false" placeholder="&lt;div id=&quot;promo&quot;&gt;…&lt;/div&gt;">${v("html")}</textarea></label>
  <label class="f">JavaScript (يعمل مرة عند تحميل الصفحة؛ يسري الجديد منه عند الزيارة التالية)<textarea id="kJs" dir="ltr" class="code" spellcheck="false" placeholder="console.log('براق')">${v("js")}</textarea></label>
  <p class="mute sm">استخدم «معاينة» لتجربة الكود على نسخة الصفحة قبل النشر؛ إن أخطأ الكود يتجاهل الموقع الخطأ ويكمل عمله.</p>`;
  const save = () => { const o = { on: $("kOn").value !== "0", css: $("kCss").value, html: $("kHtml").value, js: $("kJs").value }; if (!o.css.trim() && !o.html.trim() && !o.js.trim()) delete DRAFT.code; else DRAFT.code = o; markDirty(); };
  ["kOn", "kCss", "kHtml", "kJs"].forEach((id) => ($(id).onchange = save));
}

// ===== عام ونسخ احتياطي =====
function pGen() {
  $("cmsPanel").innerHTML = `<div class="card" style="max-width:720px"><h2>عنوان الصفحة ووصفها</h2>
    <label class="f">عنوان الصفحة (تبويب المتصفح)<input id="gT" maxlength="120" value="${esc(DRAFT.title || "")}" placeholder="اتركه فارغاً للعنوان الأصلي"></label>
    <label class="f">وصف الصفحة<textarea id="gD" maxlength="300" style="min-height:70px" placeholder="اتركه فارغاً للوصف الأصلي">${esc(DRAFT.desc || "")}</textarea></label></div>
  <div class="card" style="max-width:720px;margin-top:14px"><h2>النسخ الاحتياطي والتراجع</h2>
    <div class="cms-acts"><button class="btn sm" id="gExp">تنزيل نسخة احتياطية (JSON)</button><label class="btn sm">استيراد نسخة<input type="file" id="gImp" accept="application/json,.json" hidden></label><button class="btn sm" id="gUndo">التراجع عن آخر نشر</button><button class="btn sm bad" id="gClear">إعادة الموقع إلى محتواه الأصلي</button></div>
    <h3 style="margin-top:16px">سجل النسخ المنشورة (آخر 10)</h3><div id="gHist" class="list"><p class="mute sm">جارٍ التحميل…</p></div>
    <p class="mute sm">«التراجع» يعيد النسخة المنشورة قبل آخر نشر (ويمكن التراجع عنه مجدداً). «إعادة الموقع إلى الأصل» تُفرغ كل تعديلاتك من المسودة؛ انشر بعدها لتطبيقها.</p></div>`;
  $("gT").onchange = (e) => { e.target.value.trim() ? (DRAFT.title = e.target.value.trim()) : delete DRAFT.title; markDirty(); };
  $("gD").onchange = (e) => { e.target.value.trim() ? (DRAFT.desc = e.target.value.trim()) : delete DRAFT.desc; markDirty(); };
  $("gExp").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(DRAFT, null, 1)], { type: "application/json" })); a.download = `buraq-content-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
  $("gImp").onchange = async (e) => { const f = e.target.files[0]; if (!f) return; try { const o = JSON.parse(await f.text()); if (!o || typeof o !== "object" || Array.isArray(o)) throw new Error("ملف غير صالح."); DRAFT = pick(o); markDirty(); toast("استُوردت النسخة إلى المسودة. راجعها ثم انشرها."); draw(); } catch (err) { toast("تعذّر قراءة الملف: " + errMsg(err), true); } };
  $("gClear").onclick = () => { if (confirm("مسح كل التعديلات من المسودة؟")) { DRAFT = {}; markDirty(); draw(); } };
  $("gUndo").onclick = undo;
  hist();
}
async function hist() {
  const box = $("gHist"); if (!box) return;
  const rows = [];
  await Promise.all(Array.from({ length: 10 }, (_, i) => meta.rev - i).filter((r) => r > 0).map(async (r) => { const d = await F.getDoc(F.doc(db, "content", "cmsh_" + r)).catch(() => null); if (d?.exists()) rows.push({ r, ...d.data() }); }));
  rows.sort((a, b) => b.r - a.r);
  box.innerHTML = rows.map((x) => `<div class="item" data-r="${x.r}"><div><b class="cms-h">نسخة ${x.r}${x.r === meta.rev ? " (المنشورة الآن)" : ""}</b><div class="meta"><span>${fmtDate(x.savedAt, true)}</span><span>${esc(x.by || "")}</span>${x.code ? "<span>تتضمن كوداً مخصصاً</span>" : ""}</div></div><div class="acts"><button class="btn sm" data-rs>تحميل في المسودة</button></div></div>`).join("") || '<p class="mute sm">لا نسخ محفوظة بعد؛ يبدأ السجل من النشر القادم.</p>';
  box.onclick = (e) => { const r = e.target.closest("[data-r]"); if (!r || !e.target.closest("[data-rs]")) return; const x = rows.find((y) => y.r === +r.dataset.r); if (x && confirm(`تحميل النسخة ${x.r} في المسودة؟ تعديلاتك الحالية غير المنشورة ستُستبدل، ولن يُنشر شيء حتى تضغط «نشر».`)) { DRAFT = pick(x); markDirty(); toast("حُمّلت النسخة في المسودة. راجعها ثم انشرها."); draw(); } };
}

// ===== المعاينة =====
function preview(id) {
  let dlg = $("cmsPvDlg");
  if (!dlg) {
    dlg = document.createElement("dialog"); dlg.id = "cmsPvDlg"; dlg.className = "cms-pv"; dlg.setAttribute("aria-label", "معاينة الموقع");
    dlg.innerHTML = `<div class="hd"><h2>معاينة المسودة</h2><button class="btn sm" data-d="m">جوال</button><button class="btn sm" data-d="d">كمبيوتر</button><button class="btn sm" data-x>إغلاق</button></div><div class="cms-pv-bd"><iframe id="cmsFrame" title="معاينة الموقع"></iframe></div>`;
    document.body.append(dlg);
    dlg.onclick = (e) => { if (e.target.closest("[data-x]")) dlg.close(); const d = e.target.closest("[data-d]"); if (d) $("cmsFrame").className = d.dataset.d === "m" ? "mob" : ""; };
  }
  const fr = $("cmsFrame"); fr.className = innerWidth < 700 ? "mob" : "";
  const post = () => fr.contentWindow.postMessage({ bqCmsPreview: { ...clone(DRAFT), imgData: IMGDATA }, go: id || "" }, location.origin);
  window.onmessage = (e) => { if (e.origin === location.origin && e.data?.bqCmsReady) post(); };
  fr.src = "index.html?cmspv=1"; dlg.showModal();
}

// ===== النشر والتراجع =====
function check() {
  const c = DRAFT.custom || [];
  if (c.some((x) => !x.title)) return "قسم مضاف بلا عنوان.";
  if ((DRAFT.faq?.items || []).some((x) => !x.q || !x.a)) return "سؤال شائع بلا نص أو إجابة.";
  if (JSON.stringify(DRAFT).length > 880000) return "حجم المحتوى كبير جداً؛ قلّل الأقسام أو النصوص.";
  return "";
}
async function publish() {
  const bad = check(); if (bad) return toast(bad, true);
  if (!confirm("نشر كل التعديلات على الموقع الآن؟ سيراها الزوار فوراً، ويمكنك التراجع بعد النشر.")) return;
  const b = $("cmsPub"); b.disabled = true;
  try {
    const cur = await F.getDoc(F.doc(db, "content", "cms"));
    if (cur.exists()) { const p = pick(cur.data()); await F.setDoc(F.doc(db, "content", "cms_prev"), { ...p, rev: cur.data().rev || 0, savedAt: F.serverTimestamp(), by: ME.name }); }
    const used = new Set(); JSON.stringify(DRAFT).replace(/"img:(i[a-z0-9]+)"/g, (m, id) => used.add(id));
    for (const id of used) if (IMGDATA[id]) await F.setDoc(F.doc(db, "content", "img_" + id), { data: IMGDATA[id], updatedAt: F.serverTimestamp() });
    const rev = (cur.exists() ? cur.data().rev || 0 : 0) + 1;
    await F.setDoc(F.doc(db, "content", "cms"), { ...clone(DRAFT), rev, updatedAt: F.serverTimestamp(), updatedBy: ME.name });
    await F.setDoc(F.doc(db, "content", "cmsh_" + rev), { ...clone(DRAFT), rev, savedAt: F.serverTimestamp(), by: ME.name }).catch(() => {});
    if (rev > 10) await F.deleteDoc(F.doc(db, "content", "cmsh_" + (rev - 10))).catch(() => {});
    toast("نُشرت التعديلات على الموقع.");
    root.dataset.ready = ""; await load(); draw();
  } catch (e) { toast(errMsg(e), true); b.disabled = false; }
}
async function undo() {
  if (dirty && !confirm("لديك تعديلات غير منشورة ستُفقد عند التراجع. المتابعة؟")) return;
  try {
    const [c, p] = await Promise.all([F.getDoc(F.doc(db, "content", "cms")), F.getDoc(F.doc(db, "content", "cms_prev"))]);
    if (!p.exists()) return toast("لا توجد نسخة سابقة للتراجع إليها.", true);
    if (!confirm("استرجاع النسخة المنشورة قبل آخر نشر؟")) return;
    if (c.exists()) await F.setDoc(F.doc(db, "content", "cms_prev"), { ...pick(c.data()), rev: c.data().rev || 0, savedAt: F.serverTimestamp(), by: ME.name });
    const rev = (c.exists() ? c.data().rev || 0 : 0) + 1;
    await F.setDoc(F.doc(db, "content", "cms"), { ...pick(p.data()), rev, updatedAt: F.serverTimestamp(), updatedBy: ME.name });
    await F.setDoc(F.doc(db, "content", "cmsh_" + rev), { ...pick(p.data()), rev, savedAt: F.serverTimestamp(), by: ME.name }).catch(() => {});
    toast("استُرجعت النسخة السابقة ونُشرت."); root.dataset.ready = ""; await load(); draw();
  } catch (e) { toast(errMsg(e), true); }
}
