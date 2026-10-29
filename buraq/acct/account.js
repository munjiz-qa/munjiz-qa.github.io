// لوحة العميل في براق: الدخول والتسجيل، الخطط المحفوظة، الطلبات والمراسلة.
import { READY, auth, db, A, F, loadProfile } from "./fb.js";
import { $, esc, fmtDate, normPhone, phoneHtml, money, STATUS, stBadge, TYPES, newRequestNo, toast, errMsg } from "./ui.js";

let ME = null, PLANS = [], REQS = [], unsub = [];
const PKEY = "bq_pending";
const pending = (() => { try { return JSON.parse(sessionStorage.getItem(PKEY) || "null"); } catch (e) { return null; } })();

$("boot").hidden = true;
if (!READY) { $("notReady").hidden = false; throw new Error("not configured"); }
if (pending) $("pendingNote").hidden = false;

// ===== الدخول والتسجيل =====
document.querySelectorAll("#auth [data-a]").forEach((b) => b.onclick = () => {
  document.querySelectorAll("#auth [data-a]").forEach((x) => x.setAttribute("aria-selected", x === b));
  $("loginF").hidden = b.dataset.a !== "login"; $("signF").hidden = b.dataset.a !== "signup";
});
document.querySelectorAll("[data-eye]").forEach((b) => b.onclick = () => {
  const i = $(b.dataset.eye); i.type = i.type === "password" ? "text" : "password"; b.textContent = i.type === "password" ? "إظهار" : "إخفاء";
});
const showErr = (id, m) => { $(id).textContent = m; $(id).hidden = !m; };
const busy = (form, on) => form.querySelectorAll("button[type=submit]").forEach((b) => (b.disabled = on));

$("loginF").onsubmit = async (e) => {
  e.preventDefault(); showErr("loginErr", "");
  const em = $("lEmail").value.trim(), pw = $("lPass").value;
  if (!em || !pw) return showErr("loginErr", "أدخل البريد وكلمة المرور.");
  busy(e.target, true);
  try { await A.signInWithEmailAndPassword(auth, em, pw); }
  catch (err) { showErr("loginErr", errMsg(err)); }
  busy(e.target, false);
};
$("forgot").onclick = async () => {
  const em = $("lEmail").value.trim();
  if (!em) return showErr("loginErr", "اكتب بريدك أولاً ثم اضغط «نسيت كلمة المرور».");
  try { await A.sendPasswordResetEmail(auth, em); showErr("loginErr", ""); toast("أرسلنا رابط استعادة كلمة المرور إلى بريدك."); }
  catch (err) { showErr("loginErr", errMsg(err)); }
};
let signupExtra = null;
$("signF").onsubmit = async (e) => {
  e.preventDefault(); showErr("signErr", "");
  const name = $("sName").value.trim(), phone = normPhone($("sPhone").value), em = $("sEmail").value.trim();
  const p1 = $("sPass").value, p2 = $("sPass2").value;
  if (name.length < 3) return showErr("signErr", "اكتب الاسم الكامل.");
  if (!phone) return showErr("signErr", "رقم الجوال غير صحيح. اكتبه بالصيغة الدولية مثل ‎+974 5000 0000.");
  if (!/^\S+@\S+\.\S+$/.test(em)) return showErr("signErr", "صيغة البريد غير صحيحة.");
  if (p1.length < 8) return showErr("signErr", "كلمة المرور 8 أحرف على الأقل.");
  if (p1 !== p2) return showErr("signErr", "كلمتا المرور غير متطابقتين.");
  busy(e.target, true);
  signupExtra = { name, phone, city: $("sCity").value.trim(), company: $("sCo").value.trim() };
  try {
    const c = await A.createUserWithEmailAndPassword(auth, em, p1);
    await A.updateProfile(c.user, { displayName: name });
  } catch (err) { signupExtra = null; showErr("signErr", errMsg(err)); }
  busy(e.target, false);
};
$("logout").onclick = () => A.signOut(auth);

// ===== حالة الجلسة =====
A.onAuthStateChanged(auth, async (user) => {
  unsub.forEach((u) => u()); unsub = [];
  if (!user) {
    ME = null; $("dash").hidden = true; $("auth").hidden = false; $("logout").hidden = true; $("toAdmin").hidden = true; $("whoName").textContent = "";
    return;
  }
  try { ME = await loadProfile(user, signupExtra || {}); }
  catch (err) { toast(errMsg(err), true); return; }
  signupExtra = null;
  if (ME.disabled) { await A.signOut(auth); showErr("loginErr", "هذا الحساب موقوف. تواصل مع إدارة براق."); return; }
  $("auth").hidden = true; $("dash").hidden = false; $("logout").hidden = false;
  $("whoName").textContent = ME.name; $("toAdmin").hidden = ME.role !== "admin";
  $("hello").textContent = `مرحباً ${ME.name.split(" ")[0]}`;
  fillProfile(); fillTypes();
  watch();
  await handlePending();
  await handleQuotePlan();
});

function watch() {
  const qP = F.query(F.collection(db, "plans"), F.where("uid", "==", ME.id));
  const qR = F.query(F.collection(db, "requests"), F.where("uid", "==", ME.id));
  const byDate = (a, b) => (b.createdAt?.seconds || 9e9) - (a.createdAt?.seconds || 9e9);
  unsub.push(F.onSnapshot(qP, (s) => { PLANS = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byDate); renderPlans(); }, (e) => toast(errMsg(e), true)));
  unsub.push(F.onSnapshot(qR, (s) => { REQS = s.docs.map((d) => ({ id: d.id, ...d.data() })).sort(byDate); renderReqs(); }, (e) => toast(errMsg(e), true)));
}

// ===== التبويبات =====
function tab(p) {
  document.querySelectorAll("#dTabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.p === p));
  document.querySelectorAll("[data-pane]").forEach((d) => (d.hidden = d.dataset.pane !== p));
}
document.querySelectorAll("#dTabs button").forEach((b) => (b.onclick = () => tab(b.dataset.p)));

function renderKpis() {
  const open = REQS.filter((r) => !["done", "cancelled"].includes(r.status)).length;
  const quoted = REQS.filter((r) => r.status === "quoted").length;
  $("myKpis").innerHTML = `<div class="kpi"><b>${REQS.length}</b><span>كل الطلبات</span></div><div class="kpi"><b>${open}</b><span>طلبات مفتوحة</span></div><div class="kpi"><b>${quoted}</b><span>عروض أسعار بانتظار ردك</span></div><div class="kpi"><b>${PLANS.length}</b><span>خطط محفوظة</span></div>`;
}

function planLine(p) { return [p.brand, p.model, p.year].filter(Boolean).join(" · "); }
function renderPlans() {
  $("nPlan").textContent = PLANS.length; renderKpis();
  $("rPlan").innerHTML = `<option value="">دون خطة</option>` + PLANS.map((p) => `<option value="${p.id}">${esc(p.title || planLine(p))}</option>`).join("");
  $("planList").innerHTML = PLANS.length ? PLANS.map((p) => `<article class="item">
    <div><h3>${esc(p.title || planLine(p))}</h3>
      <div class="meta"><span>${esc(planLine(p))}</span><span>حُفظت في ${fmtDate(p.createdAt)}</span></div>
      ${p.summary ? `<div class="plan-sum">${esc(p.summary)}</div>` : ""}</div>
    <div class="acts"><a class="btn sm" href="./?plan=${encodeURIComponent([p.brandOpt || p.brand || "", p.modelOpt || p.model || "", p.year || ""].join("|"))}#convert">فتح في المخطط</a>
      <button class="btn sm pri" data-quote="${p.id}">اطلب عرض سعر</button>
      <button class="btn sm bad" data-delplan="${p.id}">حذف</button></div></article>`).join("")
    : `<div class="empty">لا توجد خطط محفوظة بعد. افتح <a href="./#convert">مخطط التحويل</a>، اختر سيارتك، ثم اضغط «احفظ الخطة في حسابي».</div>`;
}
$("planList").onclick = async (e) => {
  const q = e.target.closest("[data-quote]"), d = e.target.closest("[data-delplan]");
  if (q) { openNewReq(PLANS.find((p) => p.id === q.dataset.quote)); }
  if (d && confirm("حذف هذه الخطة من حسابك؟")) {
    try { await F.deleteDoc(F.doc(db, "plans", d.dataset.delplan)); toast("حُذفت الخطة."); } catch (err) { toast(errMsg(err), true); }
  }
};

function renderReqs() {
  $("nReq").textContent = REQS.length; renderKpis();
  $("reqList").innerHTML = REQS.length ? REQS.map((r) => `<article class="item">
    <div><h3>${esc(TYPES[r.type] || r.type)} ${stBadge(r.status)}</h3>
      <div class="meta"><span dir="ltr">${esc(r.no)}</span><span>${esc(r.car || "—")}</span><span>أُرسل في ${fmtDate(r.createdAt)}</span>${r.price != null ? `<span>عرض السعر: <b>${money(r.price, r.currency)}</b></span>` : ""}</div></div>
    <div class="acts"><button class="btn sm pri" data-open="${r.id}">التفاصيل والمراسلة</button></div></article>`).join("")
    : `<div class="empty">لم ترسل أي طلب بعد. <button class="linkbtn" onclick="document.querySelector('[data-p=new]').click()">أرسل طلبك الأول</button></div>`;
}
$("reqList").onclick = (e) => { const b = e.target.closest("[data-open]"); if (b) openReq(b.dataset.open); };

// ===== تفاصيل الطلب + المراسلة =====
let msgUnsub = null;
function openReq(id) {
  const r = REQS.find((x) => x.id === id); if (!r) return;
  const canCancel = ["new", "reviewing"].includes(r.status);
  $("rdT").textContent = `الطلب ${r.no}`;
  $("rdB").innerHTML = `<dl class="kv">
    <dt>الحالة</dt><dd>${stBadge(r.status)}</dd>
    <dt>نوع الطلب</dt><dd>${esc(TYPES[r.type] || r.type)}</dd>
    <dt>السيارة</dt><dd>${esc(r.car || "—")}</dd>
    <dt>تاريخ الإرسال</dt><dd>${fmtDate(r.createdAt, true)}</dd>
    <dt>آخر تحديث</dt><dd>${fmtDate(r.updatedAt, true)}</dd>
    <dt>عرض السعر</dt><dd>${r.price != null ? `<b>${money(r.price, r.currency)}</b>` : "لم يُرسل بعد"}</dd>
    ${r.adminNote ? `<dt>ملاحظة براق</dt><dd>${esc(r.adminNote)}</dd>` : ""}
    <dt>التفاصيل</dt><dd style="white-space:pre-wrap">${esc(r.details)}</dd>
    ${r.planSummary ? `<dt>الخطة المرفقة</dt><dd class="plan-sum">${esc(r.planSummary)}</dd>` : ""}
  </dl>
  <ul class="timeline">${(r.history || []).map((h) => `<li>${STATUS[h.s]?.[0] || esc(h.s)} · ${fmtDate(h.at, true)}</li>`).join("<li>←</li>")}</ul>
  <h3>المراسلة مع فريق براق</h3>
  <div class="thread" id="thread"><div class="mute sm">جارٍ التحميل…</div></div>
  <form id="msgF" style="display:flex;gap:8px;align-items:flex-end"><textarea id="msgT" maxlength="2000" style="min-height:48px" placeholder="اكتب رسالتك" required></textarea><button class="btn pri" type="submit">إرسال</button></form>
  ${canCancel ? `<p style="margin:16px 0 0"><button class="btn sm bad" id="cancelReq">إلغاء الطلب</button></p>` : ""}`;
  $("reqDlg").showModal();
  if (msgUnsub) msgUnsub();
  msgUnsub = F.onSnapshot(F.query(F.collection(db, "requests", id, "msgs"), F.orderBy("at")), (s) => {
    const t = $("thread"); if (!t) return;
    t.innerHTML = s.empty ? `<div class="mute sm">لا رسائل بعد. اكتب سؤالك وسيرد فريق براق هنا.</div>` :
      s.docs.map((d) => { const m = d.data(); return `<div class="bubble ${m.fromAdmin ? "adm" : ""}">${esc(m.text)}<small>${m.fromAdmin ? "فريق براق" : "أنت"} · ${fmtDate(m.at, true)}</small></div>`; }).join("");
    t.scrollTop = t.scrollHeight;
  }, (e) => toast(errMsg(e), true));
  $("msgF").onsubmit = async (e) => {
    e.preventDefault(); const text = $("msgT").value.trim(); if (!text) return;
    try { await F.addDoc(F.collection(db, "requests", id, "msgs"), { uid: ME.id, name: ME.name, fromAdmin: false, text, at: F.serverTimestamp() }); $("msgT").value = ""; }
    catch (err) { toast(errMsg(err), true); }
  };
  if (canCancel) $("cancelReq").onclick = async () => {
    if (!confirm("تأكيد إلغاء هذا الطلب؟")) return;
    try {
      await F.updateDoc(F.doc(db, "requests", id), { status: "cancelled", updatedAt: F.serverTimestamp(), history: [...(r.history || []), { s: "cancelled", at: new Date().toISOString(), by: "customer" }] });
      $("reqDlg").close(); toast("أُلغي الطلب.");
    } catch (err) { toast(errMsg(err), true); }
  };
}
document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => b.closest("dialog").close()));
$("reqDlg").addEventListener("close", () => { if (msgUnsub) { msgUnsub(); msgUnsub = null; } });

// ===== طلب جديد =====
function fillTypes() { $("rType").innerHTML = Object.entries(TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join(""); $("rPhone").value = ME.phone || ""; $("rCity").value = ME.city || ""; }
function openNewReq(plan) {
  tab("new");
  if (plan) { $("rPlan").value = plan.id; $("rCar").value = [plan.brand, plan.model].filter(Boolean).join(" "); $("rYear").value = plan.year || ""; $("rType").value = "kit"; }
  $("rDetails").focus();
}
$("rPlan").onchange = () => { const p = PLANS.find((x) => x.id === $("rPlan").value); if (p) { $("rCar").value = [p.brand, p.model].filter(Boolean).join(" "); $("rYear").value = p.year || ""; } };
$("reqF").onsubmit = async (e) => {
  e.preventDefault(); showErr("reqErr", "");
  const details = $("rDetails").value.trim(), phone = normPhone($("rPhone").value);
  if (details.length < 5) return showErr("reqErr", "اكتب تفاصيل الطلب.");
  if (!phone) return showErr("reqErr", "رقم الجوال غير صحيح.");
  const plan = PLANS.find((x) => x.id === $("rPlan").value);
  const car = [$("rCar").value.trim(), $("rYear").value].filter(Boolean).join(" · ");
  const no = newRequestNo(), now = F.serverTimestamp();
  busy(e.target, true);
  try {
    await F.setDoc(F.doc(db, "requests", no), {
      no, uid: ME.id, name: ME.name, email: ME.email, phone, city: $("rCity").value.trim(), type: $("rType").value,
      car, planId: plan?.id || "", planSummary: plan ? `${plan.title || planLine(plan)}\n${plan.summary || ""}`.trim() : "",
      details, status: "new", currency: "USD", createdAt: now, updatedAt: now, history: [{ s: "new", at: new Date().toISOString(), by: "customer" }]
    });
    e.target.reset(); fillTypes(); tab("reqs"); toast(`أُرسل طلبك برقم ${no}. سنرد عليك قريباً.`);
  } catch (err) { showErr("reqErr", errMsg(err)); }
  busy(e.target, false);
};

// ===== الملف الشخصي وكلمة المرور =====
function fillProfile() { $("pName").value = ME.name || ""; $("pPhone").value = ME.phone || ""; $("pCity").value = ME.city || ""; $("pCo").value = ME.company || ""; $("pEmail").value = ME.email; }
$("profF").onsubmit = async (e) => {
  e.preventDefault();
  const name = $("pName").value.trim(), raw = $("pPhone").value.trim(), phone = raw ? normPhone(raw) : "";
  if (name.length < 3) return toast("اكتب الاسم الكامل.", true);
  if (phone === null) return toast("رقم الجوال غير صحيح.", true);
  try {
    await F.updateDoc(F.doc(db, "users", ME.id), { name, phone, city: $("pCity").value.trim(), company: $("pCo").value.trim(), updatedAt: F.serverTimestamp() });
    Object.assign(ME, { name, phone, city: $("pCity").value.trim(), company: $("pCo").value.trim() });
    $("pPhone").value = phone; $("whoName").textContent = name; toast("حُفظت بياناتك.");
  } catch (err) { toast(errMsg(err), true); }
};
$("pwF").onsubmit = async (e) => {
  e.preventDefault();
  const o = $("oPass").value, n1 = $("nPass").value, n2 = $("nPass2").value;
  if (n1.length < 8) return toast("كلمة المرور الجديدة 8 أحرف على الأقل.", true);
  if (n1 !== n2) return toast("كلمتا المرور الجديدتان غير متطابقتين.", true);
  try {
    await A.reauthenticateWithCredential(auth.currentUser, A.EmailAuthProvider.credential(auth.currentUser.email, o));
    await A.updatePassword(auth.currentUser, n1); e.target.reset(); toast("تغيّرت كلمة المرور.");
  } catch (err) { toast(errMsg(err), true); }
};

// ===== خطة قادمة من مخطط التحويل قبل تسجيل الدخول =====
async function handlePending() {
  let p = null; try { p = JSON.parse(sessionStorage.getItem(PKEY) || "null"); sessionStorage.removeItem(PKEY); } catch (e) {}
  if (!p || !p.plan) return;
  try {
    const ref = await F.addDoc(F.collection(db, "plans"), { ...p.plan, uid: ME.id, createdAt: F.serverTimestamp() });
    toast("حُفظت الخطة في حسابك.");
    if (p.action === "quote") { const np = { id: ref.id, ...p.plan }; if (!PLANS.find((x) => x.id === ref.id)) PLANS.unshift(np); renderPlans(); openNewReq(np); }
    else tab("plans");
  } catch (err) { toast(errMsg(err), true); }
}
async function handleQuotePlan() {
  let id = null; try { id = sessionStorage.getItem("bq_quote_plan"); sessionStorage.removeItem("bq_quote_plan"); } catch (e) {}
  if (!id) return;
  const s = await F.getDoc(F.doc(db, "plans", id)).catch(() => null);
  if (s?.exists()) { const p = { id, ...s.data() }; if (!PLANS.find((x) => x.id === id)) PLANS.unshift(p); renderPlans(); openNewReq(p); }
}
const hash = location.hash.slice(1); if (["reqs", "plans", "new", "prof"].includes(hash)) tab(hash);
