/* لوحة إدارة سجل الطلاب */
(function () {
  const { api, store, esc, cleanName, normPhone, digits, toast, busy, showMsg, groupLabel } = window.MM;
  const CFG = window.MM_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const S = { token: store.get("atoken", null), d: null };
  const SHEET_DEFAULT = "https://docs.google.com/spreadsheets/d/1VpQSQMnw2Qbxjlc6yu9zTdtcW2x8bFNOCyz7oO1VZek/edit";

  async function adm(action, data = {}) {
    try { return await api("mjs_admin", { p_token: S.token, p_action: action, p_data: data }); }
    catch (e) { if (e.code === "28000") { setToken(null); showMsg($("#loginMsg"), e.message); } throw e; }
  }
  function setToken(t) {
    S.token = t; t ? store.set("atoken", t) : store.del("atoken");
    $("#loginForm").hidden = !!t; $("#dash").hidden = !t; $("#logoutBtn").hidden = !t;
  }

  /* ---------- الدخول ---------- */
  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget, btn = f.querySelector("button"), msg = $("#loginMsg");
    if (!f.user.value.trim() || !f.pass.value) { showMsg(msg, "اكتب اسم المستخدم وكلمة المرور"); return; }
    showMsg(msg, ""); busy(btn, true, "جارٍ الدخول…");
    try {
      const r = await api("mjs_admin_login", { p_user: f.user.value.trim(), p_pass: f.pass.value });
      f.reset(); setToken(r.token); await load();
    } catch (err) { showMsg(msg, err.message); }
    finally { busy(btn, false); }
  });
  $("#logoutBtn").addEventListener("click", async () => { const t = S.token; setToken(null); try { await api("mjs_logout", { p_token: t }); } catch {} });

  /* ---------- التبويبات ---------- */
  const tabs = ["students", "groups", "settings", "audit"];
  const pick = (t, focus) => {
    tabs.forEach((x) => { const b = $("#t-" + x); b.setAttribute("aria-selected", String(x === t)); b.tabIndex = x === t ? 0 : -1; $("#p-" + x).hidden = x !== t; });
    if (focus) $("#t-" + t).focus();
  };
  tabs.forEach((t, i) => {
    const b = $("#t-" + t);
    b.addEventListener("click", () => pick(t));
    // لوحة المفاتيح: الأسهم بين التبويبات (الاتجاه من اليمين إلى اليسار)، و Home و End للأول والأخير
    b.addEventListener("keydown", (e) => {
      const n = tabs.length, k = { ArrowLeft: i + 1, ArrowRight: i - 1, Home: 0, End: n - 1 }[e.key];
      if (k === undefined) return;
      e.preventDefault(); pick(tabs[(k + n) % n], true);
    });
  });

  /* ---------- التحميل ---------- */
  async function load() {
    S.d = await adm("dashboard");
    render();
  }
  function today() {
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
    return p; // DD/MM/YYYY
  }
  function render() {
    const d = S.d, st = d.students, gs = d.groups;
    $("#dTotal").textContent = st.length;
    $("#dGroups").textContent = gs.length;
    $("#dToday").textContent = st.filter((s) => s.created_date === today()).length;
    const fg = $("#fg"), cur = fg.value;
    fg.innerHTML = '<option value="">كل المجموعات</option>' + gs.map((g) => `<option value="${g.num}">${esc(groupLabel(g))} (${g.count})</option>`).join("") + '<option value="none">بدون مجموعة</option>';
    fg.value = cur;
    renderRows(); renderGroups(); renderSettings(); renderAudit();
  }
  function renderRows() {
    const q = digits($("#q").value).trim().toLowerCase(), g = $("#fg").value;
    const list = S.d.students.filter((s) => {
      if (g === "none" && s.group_num != null) return false;
      if (g && g !== "none" && String(s.group_num) !== g) return false;
      if (!q) return true;
      return [s.full_name, s.phone, s.email, s.code, s.notes].some((v) => String(v || "").toLowerCase().includes(q));
    });
    $("#countLine").textContent = `يعرض ${list.length} من ${S.d.students.length} طالب`;
    $("#rows").innerHTML = list.map((s, i) => `<tr>
      <td class="num">${i + 1}</td><td class="ltr">${esc(s.code)}</td><td>${esc(s.full_name)}</td>
      <td class="ltr num">${esc(s.phone)}</td><td class="ltr">${esc(s.email || "")}</td>
      <td>${s.group_num != null ? `<span class="badge g">${s.group_num}</span>` : '<span class="badge">بدون</span>'}</td>
      <td class="num">${esc(s.created_date)}</td><td title="${esc(s.notes || "")}">${esc((s.notes || "").slice(0, 30))}${(s.notes || "").length > 30 ? "…" : ""}</td>
      <td><button class="btn ghost sm" data-edit="${s.id}">تعديل</button><button class="btn danger sm" data-del="${s.id}">حذف</button></td></tr>`).join("")
      || '<tr><td colspan="9" style="text-align:center;color:var(--mute);padding:24px">لا يوجد طلاب مطابقون</td></tr>';
  }
  $("#q").addEventListener("input", renderRows);
  $("#fg").addEventListener("change", renderRows);

  /* ---------- إضافة وتعديل ---------- */
  const dlg = $("#dlg"), sf = $("#stuForm");
  function openStudent(s) {
    sf.reset(); showMsg($("#dlgMsg"), "");
    sf.group_num.innerHTML = '<option value="">اختر المجموعة</option>' + S.d.groups.map((g) => `<option value="${g.num}">${esc(groupLabel(g))} · ${g.count}${g.capacity ? "/" + g.capacity : ""}</option>`).join("");
    $("#dlgTitle").textContent = s ? "تعديل بيانات " + s.code : "إضافة طالب";
    if (s) { sf.id.value = s.id; sf.full_name.value = s.full_name; sf.phone.value = s.phone; sf.email.value = s.email || ""; sf.group_num.value = s.group_num ?? ""; sf.notes.value = s.notes || ""; }
    dlg.showModal(); sf.full_name.focus();
  }
  $("#addBtn").addEventListener("click", () => openStudent(null));
  $("#dlgCancel").addEventListener("click", () => dlg.close());
  sf.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#dlgSave"), msg = $("#dlgMsg");
    const name = cleanName(sf.full_name.value), phone = normPhone(sf.phone.value);
    if (name.split(" ").length < 3) { showMsg(msg, "اكتب الاسم ثلاثياً على الأقل"); return; }
    if (!phone) { showMsg(msg, "رقم الهاتف غير صحيح، اكتبه بالشكل 01012345678"); return; }
    if (!sf.group_num.value) { showMsg(msg, "اختر رقم المجموعة"); return; }
    busy(btn, true);
    try {
      const r = await adm("save_student", { id: sf.id.value || null, full_name: name, phone, email: sf.email.value.trim(), group_num: Number(sf.group_num.value), notes: sf.notes.value, force: sf.force.checked });
      dlg.close(); await load();
      toast("تم حفظ بيانات الطالب");
    } catch (err) { showMsg(msg, err.message); }
    finally { busy(btn, false); }
  });

  $("#rows").addEventListener("click", async (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const id = Number(b.dataset.edit || b.dataset.pin || b.dataset.del);
    const s = S.d.students.find((x) => x.id === id); if (!s) return;
    if (b.dataset.edit) return openStudent(s);
    if (b.dataset.pin) {
      try { const r = await adm("reset_pin", { id }); toast(`الرمز السري الجديد لـ ${s.full_name}: ${r.pin}`, 10000); await load(); } catch (err) { toast(err.message); }
      return;
    }
    if (b.dataset.del) {
      if (b.dataset.armed !== "1") {
        b.dataset.armed = "1"; b.textContent = "تأكيد الحذف";
        setTimeout(() => { if (b.isConnected) { b.dataset.armed = ""; b.textContent = "حذف"; } }, 4000);
        return;
      }
      try { await adm("delete_student", { id }); toast("تم حذف " + s.full_name); await load(); } catch (err) { toast(err.message); }
    }
  });

  /* ---------- التصدير ---------- */
  $("#csvBtn").addEventListener("click", () => {
    const q = (v) => '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"';
    const head = ["الرقم", "كود الطالب", "الاسم الكامل", "الهاتف", "البريد الإلكتروني", "رقم المجموعة", "تاريخ التسجيل", "ملاحظات", "آخر تعديل"];
    const lines = [head.map(q).join(",")].concat(S.d.students.map((s, i) => [i + 1, s.code, s.full_name, '="' + s.phone + '"', s.email || "", s.group_num ?? "", s.created_date, s.notes || "", s.updated].map((v, j) => (j === 3 ? v : q(v))).join(",")));
    const blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `طلاب-ماجستير-المنصورة-2026-${today().replace(/\//g, "-")}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  /* ---------- المجموعات ---------- */
  function renderGroups() {
    $("#gCount").value = S.d.groups.length;
    $("#gDefault").value = S.d.settings.default_capacity ?? "";
    drawGroupRows(S.d.groups.length);
  }
  function drawGroupRows(n) {
    const byNum = Object.fromEntries(S.d.groups.map((g) => [g.num, g]));
    const keep = {}; document.querySelectorAll("#gRows tr").forEach((tr) => { keep[tr.dataset.num] = { title: tr.querySelector("[data-t]").value, capacity: tr.querySelector("[data-c]").value }; });
    let h = "";
    for (let i = 1; i <= n; i++) {
      const g = byNum[i] || { num: i, title: "", own_capacity: null, count: 0 }, k = keep[i];
      h += `<tr data-num="${i}"><td><b>${i}</b></td><td><input data-t maxlength="60" value="${esc(k ? k.title : g.title || "")}" aria-label="اسم المجموعة ${i}"></td>
        <td><input data-c type="number" min="1" max="1000" inputmode="numeric" value="${esc(k ? k.capacity : g.own_capacity ?? "")}" aria-label="سعة المجموعة ${i}"></td><td class="num">${g.count}</td></tr>`;
    }
    $("#gRows").innerHTML = h;
  }
  $("#gCount").addEventListener("input", () => { const n = Number($("#gCount").value); if (n >= 1 && n <= 200) drawGroupRows(n); });
  $("#gSave").addEventListener("click", async (e) => {
    const btn = e.currentTarget, msg = $("#gMsg");
    const groups = [...document.querySelectorAll("#gRows tr")].map((tr) => ({ num: Number(tr.dataset.num), title: tr.querySelector("[data-t]").value, capacity: tr.querySelector("[data-c]").value }));
    busy(btn, true);
    try { await adm("save_groups", { count: Number($("#gCount").value), default_capacity: $("#gDefault").value, groups }); await load(); showMsg(msg, "تم حفظ المجموعات", "ok"); }
    catch (err) { showMsg(msg, err.message); }
    finally { busy(btn, false); }
  });

  /* ---------- الإعدادات ---------- */
  function syncUrl() { return `${CFG.url}/functions/v1/mjs-sheet?token=${S.d.settings.export_token}`; }
  function renderSettings() {
    const s = S.d.settings;
    $("#sCohort").value = s.cohort; $("#sReg").checked = s.registration_open; $("#sEdit").checked = s.editing_open; $("#sRoster").checked = s.show_roster;
    $("#syncUrl").value = syncUrl(); $("#syncFormula").textContent = `=IMPORTDATA("${syncUrl()}")`;
    $("#sheetLink").href = s.sheet_url || SHEET_DEFAULT;
  }
  $("#sSave").addEventListener("click", async (e) => {
    const btn = e.currentTarget; busy(btn, true);
    try { await adm("save_settings", { cohort: $("#sCohort").value, registration_open: $("#sReg").checked, editing_open: $("#sEdit").checked, show_roster: $("#sRoster").checked }); await load(); showMsg($("#sMsg"), "تم حفظ الإعدادات", "ok"); }
    catch (err) { showMsg($("#sMsg"), err.message); } finally { busy(btn, false); }
  });
  $("#copySync").addEventListener("click", async () => { try { await navigator.clipboard.writeText($("#syncUrl").value); toast("تم نسخ الرابط"); } catch { $("#syncUrl").select(); } });
  $("#rotate").addEventListener("click", async (e) => {
    const b = e.currentTarget;
    if (b.dataset.armed !== "1") { b.dataset.armed = "1"; b.textContent = "تأكيد التجديد (سيتوقف الرابط القديم)"; setTimeout(() => { b.dataset.armed = ""; b.textContent = "تجديد الرابط السري"; }, 5000); return; }
    try { await adm("rotate_export"); await load(); toast("تم تجديد الرابط. حدّث صيغة الاستيراد في الشيت"); } catch (err) { toast(err.message); }
  });
  $("#pSave").addEventListener("click", async (e) => {
    const btn = e.currentTarget; busy(btn, true);
    try { await adm("change_password", { old: $("#pOld").value, new: $("#pNew").value }); $("#pOld").value = $("#pNew").value = ""; showMsg($("#pMsg"), "تم تغيير كلمة المرور", "ok"); }
    catch (err) { showMsg($("#pMsg"), err.message); } finally { busy(btn, false); }
  });

  function renderAudit() {
    $("#auditList").innerHTML = S.d.audit.map((a) => {
      const det = a.detail || {};
      const extra = [det.code, det.name, det.group != null ? "المجموعة " + det.group : null, det.count != null ? det.count + " مجموعة" : null].filter(Boolean).join(" · ");
      return `<li><time class="num">${esc(a.at)}</time><b>${esc(a.action)}</b> — ${esc(a.actor)}${extra ? " · " + esc(extra) : ""}</li>`;
    }).join("") || "<li>لا توجد عمليات بعد</li>";
  }

  document.addEventListener("input", (e) => { const t = e.target; if (t.matches && t.matches("input[inputmode=numeric],input[inputmode=tel]")) { const v = digits(t.value); if (v !== t.value) t.value = v; } });

  (async function init() {
    setToken(S.token);
    if (S.token) try { await load(); } catch {}
  })();
})();
