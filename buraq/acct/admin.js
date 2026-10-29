// لوحة إدارة براق: صلاحيات كاملة على الطلبات والمستخدمين والخطط والكتالوج والمحتوى.
import { READY, auth, db, A, F, loadProfile, createUserAsAdmin } from "./fb.js";
import { $, esc, fmtDate, normPhone, phoneHtml, money, STATUS, stBadge, TYPES, toast, errMsg } from "./ui.js";
import { CATALOG, KIND, CONTENT } from "./seed.js";

let ME = null, USERS = [], REQS = [], PLANS = [], CAT = [], unsub = [];
$("boot").hidden = true;
if (!READY) { $("notReady").hidden = false; throw new Error("not configured"); }

const showErr = (id, m) => { $(id).textContent = m; $(id).hidden = !m; };
document.querySelectorAll("[data-eye]").forEach((b) => b.onclick = () => { const i = $(b.dataset.eye); i.type = i.type === "password" ? "text" : "password"; b.textContent = i.type === "password" ? "إظهار" : "إخفاء"; });
document.querySelectorAll("[data-close]").forEach((b) => (b.onclick = () => b.closest("dialog").close()));
$("loginF").onsubmit = async (e) => {
  e.preventDefault(); showErr("loginErr", "");
  try { await A.signInWithEmailAndPassword(auth, $("lEmail").value.trim(), $("lPass").value); }
  catch (err) { showErr("loginErr", errMsg(err)); }
};
$("logout").onclick = () => A.signOut(auth);

A.onAuthStateChanged(auth, async (user) => {
  unsub.forEach((u) => u()); unsub = [];
  if (!user) { $("dash").hidden = true; $("auth").hidden = false; $("logout").hidden = true; $("whoName").textContent = ""; return; }
  try { ME = await loadProfile(user); } catch (err) { showErr("loginErr", errMsg(err)); return; }
  if (ME.role !== "admin" || ME.disabled) {
    await A.signOut(auth);
    showErr("loginErr", "هذا الحساب ليس حساب إدارة. العملاء يدخلون من صفحة «حسابي».");
    return;
  }
  $("auth").hidden = true; $("dash").hidden = false; $("logout").hidden = false; $("whoName").textContent = ME.name;
  watch();
});

const byDate = (a, b) => (b.createdAt?.seconds || 9e9) - (a.createdAt?.seconds || 9e9);
function watch() {
  const live = (name, set) => unsub.push(F.onSnapshot(F.collection(db, name), (s) => { set(s.docs.map((d) => ({ id: d.id, ...d.data() }))); render(); }, (e) => toast(errMsg(e), true)));
  live("users", (v) => (USERS = v.sort(byDate)));
  live("requests", (v) => (REQS = v.sort(byDate)));
  live("plans", (v) => (PLANS = v.sort(byDate)));
  live("catalog", (v) => (CAT = v.sort((a, b) => (a.order ?? 999) - (b.order ?? 999))));
  loadContent();
}
function render() { renderOv(); renderReqs(); renderUsers(); renderPlans(); renderCat(); }

function tab(p) {
  document.querySelectorAll("#dTabs button").forEach((b) => b.setAttribute("aria-selected", b.dataset.p === p));
  document.querySelectorAll("[data-pane]").forEach((d) => (d.hidden = d.dataset.pane !== p));
}
document.querySelectorAll("#dTabs button").forEach((b) => (b.onclick = () => tab(b.dataset.p)));

// ===== نظرة عامة =====
function renderOv() {
  const c = (s) => REQS.filter((r) => r.status === s).length;
  const open = REQS.filter((r) => !["done", "cancelled"].includes(r.status)).length;
  const val = REQS.filter((r) => ["approved", "in_progress", "done"].includes(r.status) && r.price != null).reduce((a, r) => a + Number(r.price || 0), 0);
  $("kpis").innerHTML = [
    [REQS.length, "كل الطلبات"], [c("new"), "طلبات جديدة"], [open, "طلبات مفتوحة"], [c("quoted"), "عروض بانتظار العميل"],
    [USERS.filter((u) => u.role === "customer").length, "العملاء"], [USERS.filter((u) => u.role === "admin").length, "المديرون"],
    [PLANS.length, "خطط محفوظة"], [money(val), "قيمة الطلبات المعتمدة"]
  ].map(([v, l]) => `<div class="kpi"><b>${v}</b><span>${l}</span></div>`).join("");
  $("latest").innerHTML = REQS.slice(0, 6).map(reqItem).join("") || `<div class="empty">لا توجد طلبات بعد.</div>`;
  $("nReq").textContent = REQS.length; $("nUsr").textContent = USERS.length; $("nPlan").textContent = PLANS.length;
}
const reqItem = (r) => `<article class="item"><div><h3>${esc(r.name)} · ${esc(TYPES[r.type] || r.type)} ${stBadge(r.status)}</h3><div class="meta"><span dir="ltr">${esc(r.no)}</span><span>${esc(r.car || "—")}</span><span>${fmtDate(r.createdAt, true)}</span></div></div><div class="acts"><button class="btn sm pri" data-open="${r.id}">إدارة الطلب</button></div></article>`;
$("latest").onclick = (e) => { const b = e.target.closest("[data-open]"); if (b) openReq(b.dataset.open); };

// ===== الطلبات =====
$("rs").innerHTML += Object.entries(STATUS).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join("");
$("rq").oninput = $("rs").onchange = () => renderReqs();
function filteredReqs() {
  const q = $("rq").value.trim().toLowerCase(), s = $("rs").value;
  return REQS.filter((r) => (!s || r.status === s) && (!q || [r.no, r.name, r.email, r.phone, r.car, r.city].join(" ").toLowerCase().includes(q)));
}
function renderReqs() {
  const L = filteredReqs();
  $("reqRows").innerHTML = L.length ? L.map((r) => `<tr><td dir="ltr" style="text-align:right">${esc(r.no)}</td><td>${esc(r.name)}<div class="mute sm" dir="ltr" style="text-align:right">${esc(r.email)}</div></td><td>${phoneHtml(r.phone)}</td><td>${esc(TYPES[r.type] || r.type)}</td><td>${esc(r.car || "—")}</td><td>${stBadge(r.status)}</td><td>${money(r.price, r.currency)}</td><td>${fmtDate(r.createdAt)}</td><td><button class="btn sm pri" data-open="${r.id}">إدارة</button></td></tr>`).join("")
    : `<tr><td colspan="9" class="mute" style="text-align:center;padding:24px">لا توجد طلبات مطابقة.</td></tr>`;
}
$("reqRows").onclick = (e) => { const b = e.target.closest("[data-open]"); if (b) openReq(b.dataset.open); };

let msgUnsub = null;
function openReq(id) {
  const r = REQS.find((x) => x.id === id); if (!r) return;
  $("dT").textContent = `الطلب ${r.no}`;
  $("dB").innerHTML = `<dl class="kv">
    <dt>العميل</dt><dd>${esc(r.name)} · <span dir="ltr">${esc(r.email)}</span></dd>
    <dt>الجوال</dt><dd>${phoneHtml(r.phone)} ${r.phone ? `<a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/${r.phone.replace(/\D/g, "")}">واتساب</a>` : ""}</dd>
    <dt>المدينة</dt><dd>${esc(r.city || "—")}</dd>
    <dt>نوع الطلب</dt><dd>${esc(TYPES[r.type] || r.type)}</dd>
    <dt>السيارة</dt><dd>${esc(r.car || "—")}</dd>
    <dt>التاريخ</dt><dd>${fmtDate(r.createdAt, true)}</dd>
    <dt>التفاصيل</dt><dd style="white-space:pre-wrap">${esc(r.details)}</dd>
    ${r.planSummary ? `<dt>الخطة</dt><dd class="plan-sum">${esc(r.planSummary)}</dd>` : ""}
  </dl>
  <form id="stF" class="card" style="padding:14px;margin-bottom:16px">
    <div class="row">
      <label class="f">الحالة<select id="dSt">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === r.status ? "selected" : ""}>${v[0]}</option>`).join("")}</select></label>
      <label class="f">عرض السعر ($)<input id="dPr" type="number" min="0" step="0.01" inputmode="decimal" value="${r.price ?? ""}"></label>
    </div>
    <label class="f">ملاحظة للعميل (تظهر في حسابه)<textarea id="dNote" maxlength="1000" style="min-height:70px">${esc(r.adminNote || "")}</textarea></label>
    <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" type="submit">حفظ التحديث</button><button class="btn bad" type="button" id="dDel">حذف الطلب نهائياً</button></div>
  </form>
  <ul class="timeline">${(r.history || []).map((h) => `<li>${STATUS[h.s]?.[0] || esc(h.s)} · ${fmtDate(h.at, true)}${h.by === "customer" ? " (العميل)" : ""}</li>`).join("<li>←</li>")}</ul>
  <h3>المراسلة مع العميل</h3>
  <div class="thread" id="thread"></div>
  <form id="msgF" style="display:flex;gap:8px;align-items:flex-end"><textarea id="msgT" maxlength="2000" style="min-height:48px" placeholder="اكتب ردك للعميل" required></textarea><button class="btn pri" type="submit">إرسال</button></form>`;
  $("dlg").showModal();
  if (msgUnsub) msgUnsub();
  msgUnsub = F.onSnapshot(F.query(F.collection(db, "requests", id, "msgs"), F.orderBy("at")), (s) => {
    const t = $("thread"); if (!t) return;
    t.innerHTML = s.empty ? `<div class="mute sm">لا رسائل بعد.</div>` : s.docs.map((d) => { const m = d.data(); return `<div class="bubble ${m.fromAdmin ? "adm" : ""}">${esc(m.text)}<small>${m.fromAdmin ? "براق · " + esc(m.name) : esc(m.name)} · ${fmtDate(m.at, true)}</small></div>`; }).join("");
    t.scrollTop = t.scrollHeight;
  });
  $("stF").onsubmit = async (e) => {
    e.preventDefault();
    const st = $("dSt").value, pr = $("dPr").value === "" ? null : Number($("dPr").value);
    const upd = { status: st, price: pr, adminNote: $("dNote").value.trim(), updatedAt: F.serverTimestamp() };
    if (st !== r.status) upd.history = [...(r.history || []), { s: st, at: new Date().toISOString(), by: ME.name }];
    try { await F.updateDoc(F.doc(db, "requests", id), upd); toast("حُفظ تحديث الطلب وظهر للعميل."); $("dlg").close(); } catch (err) { toast(errMsg(err), true); }
  };
  $("dDel").onclick = async () => {
    if (!confirm(`حذف الطلب ${r.no} نهائياً؟ لا يمكن التراجع.`)) return;
    try { await F.deleteDoc(F.doc(db, "requests", id)); $("dlg").close(); toast("حُذف الطلب."); } catch (err) { toast(errMsg(err), true); }
  };
  $("msgF").onsubmit = async (e) => {
    e.preventDefault(); const text = $("msgT").value.trim(); if (!text) return;
    try { await F.addDoc(F.collection(db, "requests", id, "msgs"), { uid: ME.id, name: ME.name, fromAdmin: true, text, at: F.serverTimestamp() }); $("msgT").value = ""; } catch (err) { toast(errMsg(err), true); }
  };
}
$("dlg").addEventListener("close", () => { if (msgUnsub) { msgUnsub(); msgUnsub = null; } });
$("csvReq").onclick = () => {
  const rows = [["رقم الطلب", "العميل", "البريد", "الجوال", "المدينة", "النوع", "السيارة", "الحالة", "عرض السعر USD", "التاريخ", "التفاصيل"]]
    .concat(filteredReqs().map((r) => [r.no, r.name, r.email, r.phone, r.city, TYPES[r.type] || r.type, r.car, STATUS[r.status]?.[0], r.price ?? "", fmtDate(r.createdAt, true), r.details]));
  const csv = "﻿" + rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `buraq-requests-${fmtDate(new Date()).split("/").reverse().join("-")}.csv`; a.click();
};

// ===== المستخدمون =====
$("uq").oninput = $("ur").onchange = () => renderUsers();
function renderUsers() {
  const q = $("uq").value.trim().toLowerCase(), r = $("ur").value;
  const L = USERS.filter((u) => (!r || u.role === r) && (!q || [u.name, u.email, u.phone, u.company].join(" ").toLowerCase().includes(q)));
  $("usrRows").innerHTML = L.map((u) => {
    const self = u.id === ME.id;
    return `<tr><td>${esc(u.name)}${u.company ? `<div class="mute sm">${esc(u.company)}</div>` : ""}</td><td dir="ltr" style="text-align:right">${esc(u.email)}</td><td>${phoneHtml(u.phone)}</td><td>${esc(u.city || "—")}</td>
    <td><select data-role="${u.id}" ${self ? "disabled" : ""}><option value="customer" ${u.role === "customer" ? "selected" : ""}>عميل</option><option value="admin" ${u.role === "admin" ? "selected" : ""}>مدير</option></select></td>
    <td>${u.disabled ? '<span class="badge st-x">موقوف</span>' : '<span class="badge st-ok">نشط</span>'}</td><td>${fmtDate(u.createdAt)}</td>
    <td style="white-space:nowrap"><button class="btn sm" data-edit="${u.id}">تعديل</button> <button class="btn sm" data-reset="${u.email}">رابط كلمة مرور</button> ${self ? "" : `<button class="btn sm ${u.disabled ? "" : "bad"}" data-toggle="${u.id}">${u.disabled ? "تفعيل" : "إيقاف"}</button>`}</td></tr>`;
  }).join("") || `<tr><td colspan="8" class="mute" style="text-align:center;padding:24px">لا يوجد مستخدمون مطابقون.</td></tr>`;
}
$("usrRows").onchange = async (e) => {
  const s = e.target.closest("[data-role]"); if (!s) return;
  const u = USERS.find((x) => x.id === s.dataset.role);
  if (!confirm(`تغيير دور ${u.name} إلى «${s.value === "admin" ? "مدير بصلاحيات كاملة" : "عميل"}»؟`)) { s.value = u.role; return; }
  try { await F.updateDoc(F.doc(db, "users", u.id), { role: s.value, updatedAt: F.serverTimestamp() }); toast("تغيّر الدور."); } catch (err) { s.value = u.role; toast(errMsg(err), true); }
};
$("usrRows").onclick = async (e) => {
  const t = e.target.closest("[data-toggle]"), rs = e.target.closest("[data-reset]"), ed = e.target.closest("[data-edit]");
  if (t) {
    const u = USERS.find((x) => x.id === t.dataset.toggle);
    if (!confirm(u.disabled ? `تفعيل حساب ${u.name}؟` : `إيقاف حساب ${u.name}؟ لن يستطيع الدخول.`)) return;
    try { await F.updateDoc(F.doc(db, "users", u.id), { disabled: !u.disabled, updatedAt: F.serverTimestamp() }); toast(u.disabled ? "فُعّل الحساب." : "أُوقف الحساب."); } catch (err) { toast(errMsg(err), true); }
  }
  if (rs) {
    try { await A.sendPasswordResetEmail(auth, rs.dataset.reset); toast(`أُرسل رابط تعيين كلمة المرور إلى ${rs.dataset.reset}`); } catch (err) { toast(errMsg(err), true); }
  }
  if (ed) userForm(USERS.find((x) => x.id === ed.dataset.edit));
};
$("addUser").onclick = () => userForm(null);
function userForm(u) {
  $("dT").textContent = u ? `تعديل ${u.name}` : "إضافة مستخدم";
  $("dB").innerHTML = `<form id="uF" novalidate><p class="msg err" id="uErr" hidden></p>
    <label class="f">الاسم الكامل<input id="uName" maxlength="80" value="${esc(u?.name || "")}" required></label>
    <div class="row"><label class="f">الجوال<input id="uPhone" type="tel" dir="ltr" value="${esc(u?.phone || "")}"></label><label class="f">المدينة<input id="uCity" maxlength="60" value="${esc(u?.city || "")}"></label></div>
    <label class="f">الشركة أو الورشة<input id="uCo" maxlength="80" value="${esc(u?.company || "")}"></label>
    ${u ? `<label class="f">البريد<input dir="ltr" value="${esc(u.email)}" disabled></label>` : `
    <label class="f">البريد الإلكتروني<input id="uEmail" type="email" dir="ltr" required></label>
    <div class="row"><label class="f">كلمة مرور مبدئية (8 أحرف على الأقل)<input id="uPass" type="text" dir="ltr" minlength="8" required></label>
    <label class="f">الدور<select id="uRole"><option value="customer">عميل</option><option value="admin">مدير بصلاحيات كاملة</option></select></label></div>`}
    <button class="btn pri" type="submit">${u ? "حفظ" : "إنشاء الحساب"}</button></form>`;
  $("dlg").showModal();
  $("uF").onsubmit = async (e) => {
    e.preventDefault(); showErr("uErr", "");
    const name = $("uName").value.trim(), raw = $("uPhone").value.trim(), phone = raw ? normPhone(raw) : "";
    if (name.length < 3) return showErr("uErr", "اكتب الاسم الكامل.");
    if (phone === null) return showErr("uErr", "رقم الجوال غير صحيح.");
    const data = { name, phone, city: $("uCity").value.trim(), company: $("uCo").value.trim(), updatedAt: F.serverTimestamp() };
    try {
      if (u) await F.updateDoc(F.doc(db, "users", u.id), data);
      else {
        const em = $("uEmail").value.trim(), pw = $("uPass").value;
        if (pw.length < 8) return showErr("uErr", "كلمة المرور 8 أحرف على الأقل.");
        const uid = await createUserAsAdmin(em, pw);
        await F.setDoc(F.doc(db, "users", uid), { ...data, email: em, role: $("uRole").value, disabled: false, createdAt: F.serverTimestamp() });
      }
      $("dlg").close(); toast(u ? "حُفظت البيانات." : "أُنشئ الحساب. أرسل للمستخدم بريده وكلمة المرور المبدئية.");
    } catch (err) { showErr("uErr", errMsg(err)); }
  };
}

// ===== الخطط =====
function renderPlans() {
  const nm = (uid) => USERS.find((u) => u.id === uid)?.name || "—";
  $("planList").innerHTML = PLANS.map((p) => `<article class="item"><div><h3>${esc(p.title || [p.brand, p.model, p.year].join(" "))}</h3><div class="meta"><span>العميل: ${esc(nm(p.uid))}</span><span>${fmtDate(p.createdAt, true)}</span></div>${p.summary ? `<div class="plan-sum">${esc(p.summary)}</div>` : ""}</div><div class="acts"><button class="btn sm bad" data-del="${p.id}">حذف</button></div></article>`).join("") || `<div class="empty">لا توجد خطط محفوظة بعد.</div>`;
}
$("planList").onclick = async (e) => {
  const d = e.target.closest("[data-del]"); if (!d || !confirm("حذف هذه الخطة؟")) return;
  try { await F.deleteDoc(F.doc(db, "plans", d.dataset.del)); toast("حُذفت الخطة."); } catch (err) { toast(errMsg(err), true); }
};

// ===== الكتالوج والأسعار =====
function renderCat() {
  $("catRows").innerHTML = CAT.map((c) => `<tr data-id="${c.id}">
    <td><input type="number" data-k="order" value="${c.order ?? ""}" style="width:70px"></td>
    <td><input data-k="code" value="${esc(c.code)}" dir="ltr" style="min-width:110px"></td>
    <td><input data-k="name" value="${esc(c.name)}" style="min-width:260px"></td>
    <td><input data-k="cat" value="${esc(c.cat || "")}" style="min-width:120px"></td>
    <td><input type="number" data-k="price" value="${c.price ?? ""}" min="0" step="0.01" style="width:110px"></td>
    <td><select data-k="kind">${Object.entries(KIND).map(([k, v]) => `<option value="${k}" ${c.kind === k ? "selected" : ""}>${v}</option>`).join("")}</select></td>
    <td><input type="checkbox" data-k="active" ${c.active !== false ? "checked" : ""} style="width:22px;min-height:22px"></td>
    <td style="white-space:nowrap"><button class="btn sm pri" data-save>حفظ</button> <button class="btn sm bad" data-del>حذف</button></td></tr>`).join("")
    || `<tr><td colspan="8" class="mute" style="text-align:center;padding:24px">الكتالوج فارغ. اضغط «استيراد الأسعار الافتراضية لبراق» أو أضف بنداً.</td></tr>`;
}
$("catRows").onclick = async (e) => {
  const tr = e.target.closest("tr[data-id]"); if (!tr) return;
  const ref = F.doc(db, "catalog", tr.dataset.id);
  if (e.target.closest("[data-del]")) { if (confirm("حذف هذا البند من الكتالوج؟")) try { await F.deleteDoc(ref); toast("حُذف البند."); } catch (err) { toast(errMsg(err), true); } return; }
  if (!e.target.closest("[data-save]")) return;
  const g = (k) => tr.querySelector(`[data-k=${k}]`);
  const price = g("price").value === "" ? null : Number(g("price").value);
  try {
    await F.updateDoc(ref, { order: Number(g("order").value || 999), code: g("code").value.trim(), name: g("name").value.trim(), cat: g("cat").value.trim(), price, kind: g("kind").value, active: g("active").checked, updatedAt: F.serverTimestamp() });
    toast("حُفظ البند وظهر على الموقع.");
  } catch (err) { toast(errMsg(err), true); }
};
$("addItem").onclick = async () => {
  try { await F.addDoc(F.collection(db, "catalog"), { order: CAT.length + 1, code: "BQ-NEW", name: "بند جديد", cat: "أخرى", price: null, kind: "est", active: false, updatedAt: F.serverTimestamp() }); toast("أُضيف بند جديد غير مفعّل في آخر الجدول. عدّله ثم فعّله واحفظ."); } catch (err) { toast(errMsg(err), true); }
};
$("seedCat").onclick = async () => {
  if (!confirm("استيراد بنود براق الافتراضية؟ البنود ذات الرموز نفسها تُحدَّث بأسعارها الافتراضية.")) return;
  try {
    const b = F.writeBatch(db);
    CATALOG.forEach((c, i) => b.set(F.doc(db, "catalog", c.code.replace(/[^\w-]/g, "_")), { ...c, order: i + 1, active: true, updatedAt: F.serverTimestamp() }));
    await b.commit(); toast(`اُستورد ${CATALOG.length} بنداً.`);
  } catch (err) { toast(errMsg(err), true); }
};

// ===== المحتوى =====
async function loadContent() {
  const s = await F.getDoc(F.doc(db, "content", "site")).catch(() => null);
  const c = { ...CONTENT, ...(s?.exists() ? s.data() : {}) };
  $("cAnn").value = c.annText || ""; $("cAnnUrl").value = c.annUrl || ""; $("cAnnOn").value = c.annOn ? "1" : "0";
  $("cPTitle").value = c.pricesTitle || ""; $("cPLead").value = c.pricesLead || ""; $("cPOn").value = c.pricesOn ? "1" : "0";
  $("cSaved").textContent = c.updatedAt ? `آخر نشر: ${fmtDate(c.updatedAt, true)}` : "";
}
$("contentF").onsubmit = async (e) => {
  e.preventDefault();
  const url = $("cAnnUrl").value.trim();
  if (url && !/^(#|https:\/\/|\.\/|[\w-]+\.html)/.test(url)) return toast("الرابط يجب أن يبدأ بـ # أو https://", true);
  try {
    await F.setDoc(F.doc(db, "content", "site"), { annText: $("cAnn").value.trim(), annUrl: url, annOn: $("cAnnOn").value === "1", pricesTitle: $("cPTitle").value.trim(), pricesLead: $("cPLead").value.trim(), pricesOn: $("cPOn").value === "1", updatedAt: F.serverTimestamp(), updatedBy: ME.name });
    toast("نُشر المحتوى على الموقع."); loadContent();
  } catch (err) { toast(errMsg(err), true); }
};

// ===== كلمة مرور المدير =====
$("pwF").onsubmit = async (e) => {
  e.preventDefault();
  const n1 = $("nPass").value, n2 = $("nPass2").value;
  if (n1.length < 8) return toast("كلمة المرور الجديدة 8 أحرف على الأقل.", true);
  if (n1 !== n2) return toast("كلمتا المرور غير متطابقتين.", true);
  try { await A.reauthenticateWithCredential(auth.currentUser, A.EmailAuthProvider.credential(auth.currentUser.email, $("oPass").value)); await A.updatePassword(auth.currentUser, n1); e.target.reset(); toast("تغيّرت كلمة المرور."); }
  catch (err) { toast(errMsg(err), true); }
};
