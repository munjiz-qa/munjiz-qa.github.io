/* واجهة الطالب والزائر */
(function () {
  const { api, store, esc, cleanName, normPhone, digits, toast, busy, showMsg, groupLabel } = window.MM;
  const $ = (s, r = document) => r.querySelector(s);
  const S = { pub: null, token: store.get("stoken", null), me: null };

  /* ---------- التبويبات ---------- */
  const tabs = ["register", "edit", "groups"];
  function go(name, push = true) {
    if (!tabs.includes(name)) name = "register";
    tabs.forEach((t) => {
      $("#t-" + t).setAttribute("aria-selected", String(t === name));
      $("#p-" + t).hidden = t !== name;
    });
    if (push) history.replaceState(null, "", "#" + name);
    if (name === "groups") renderGroupsView();
  }
  tabs.forEach((t) => $("#t-" + t).addEventListener("click", () => go(t)));
  document.querySelectorAll("[data-go]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); go(a.dataset.go); scrollTo({ top: 0, behavior: "smooth" }); }));

  /* ---------- البيانات العامة ---------- */
  async function loadPublic() {
    try {
      S.pub = await api("mjs_public");
    } catch (e) {
      showMsg($("#globalMsg"), e.message, "bad"); return;
    }
    const g = S.pub.groups || [];
    $("#sTotal").textContent = S.pub.total;
    $("#sGroups").textContent = g.length;
    const capped = g.filter((x) => x.capacity);
    if (capped.length === g.length && g.length) {
      $("#sSeats").textContent = g.reduce((a, x) => a + Math.max(0, x.capacity - x.count), 0);
      $("#sSeatsL").textContent = "مقعد متاح";
    } else {
      $("#sSeats").textContent = g.length ? Math.round((S.pub.total / g.length) * 10) / 10 : 0;
      $("#sSeatsL").textContent = "متوسط طلاب المجموعة";
    }
    const notes = [];
    if (!S.pub.registration_open) notes.push("التسجيل الجديد مغلق حالياً بقرار إدارة الدفعة.");
    if (!S.pub.editing_open) notes.push("تعديل البيانات مغلق حالياً بقرار إدارة الدفعة.");
    showMsg($("#globalMsg"), notes.join(" "), "warn");
    $("#regForm button[type=submit]").disabled = !S.pub.registration_open;
    renderPicker($("#regGroups"), "rg", null);
    if (S.me) renderPicker($("#editGroups"), "eg", S.me.group_num);
    if (!$("#p-groups").hidden) renderGroupsView();
  }

  function renderPicker(box, name, current) {
    const g = (S.pub && S.pub.groups) || [];
    const prev = (box.querySelector("input:checked") || {}).value;
    const sel = prev != null ? Number(prev) : current;
    box.innerHTML = g.map((x) => {
      const full = x.capacity && x.count >= x.capacity && x.num !== current;
      const info = x.capacity ? `${x.count} من ${x.capacity}` : `${x.count} طالب`;
      return `<label class="${full ? "full" : ""}" title="${full ? "المجموعة مكتملة" : ""}">
        <input type="radio" name="${name}" value="${x.num}" ${sel === x.num ? "checked" : ""} ${full ? "disabled" : ""}>
        <b>المجموعة ${x.num}</b><span>${esc(x.title || "")}${x.title ? " · " : ""}${full ? "مكتملة" : info}</span></label>`;
    }).join("") || '<p class="hint">لا توجد مجموعات بعد.</p>';
  }

  function renderGroupsView() {
    const g = (S.pub && S.pub.groups) || [];
    const max = Math.max(1, ...g.map((x) => x.capacity || x.count));
    $("#groupsSub").textContent = S.pub && S.pub.show_roster
      ? "عدد الطلاب وأسماؤهم في كل مجموعة، ويتحدّث مع كل تسجيل أو تعديل."
      : "عدد الطلاب في كل مجموعة، ويتحدّث مع كل تسجيل أو تعديل.";
    $("#groupsView").innerHTML = g.map((x) => {
      const pct = Math.min(100, Math.round((x.count / (x.capacity || max)) * 100));
      const members = Array.isArray(x.members)
        ? (x.members.length ? `<ol>${x.members.map((m) => `<li>${esc(m)}</li>`).join("")}</ol>` : '<p class="empty">لا يوجد طلاب بعد</p>')
        : "";
      return `<article class="group"><header><h3>${esc(groupLabel(x))}</h3>
        <span class="cnt num">${x.count}${x.capacity ? " / " + x.capacity : ""} طالب</span></header>
        <div class="bar" aria-hidden="true"><i style="width:${pct}%"></i></div>${members}</article>`;
    }).join("");
  }

  /* ---------- التسجيل ---------- */
  function readForm(f, gname) {
    const fd = new FormData(f);
    const chosen = f.querySelector(`input[name=${gname}]:checked`);
    return {
      name: cleanName(fd.get("name")), phoneRaw: String(fd.get("phone") || ""), phone: normPhone(fd.get("phone")),
      email: String(fd.get("email") || "").trim().toLowerCase(), group: chosen ? Number(chosen.value) : null,
      notes: String(fd.get("notes") || "").trim(),
    };
  }
  function validate(d, needPin) {
    if (!d.name) return "اكتب الاسم الكامل";
    if (/[0-9٠-٩<>{}@#$%^*=_|\\/]/.test(d.name)) return "الاسم يجب أن يحتوي على حروف فقط";
    if (d.name.split(" ").length < 3) return "اكتب الاسم ثلاثياً على الأقل";
    if (!d.phone) return "رقم الهاتف غير صحيح، اكتبه بالشكل 01012345678";
    if (d.email && !/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(d.email)) return "البريد الإلكتروني غير صحيح";
    if (!d.group) return "اختر رقم المجموعة";
    return null;
  }
  $("#regForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget, btn = f.querySelector("button[type=submit]"), msg = $("#regMsg");
    const d = readForm(f, "rg"); const bad = validate(d, true);
    if (bad) { showMsg(msg, bad); return; }
    showMsg(msg, ""); busy(btn, true, "جارٍ التسجيل…");
    try {
      const r = await api("mjs_register", { p_name: d.name, p_phone: d.phone, p_email: d.email, p_group: d.group, p_notes: d.notes });
      S.token = r.token; S.me = r.student; store.set("stoken", r.token);
      f.reset(); f.hidden = true;
      const s = r.student;
      $("#regDone").hidden = false;
      $("#regDone").innerHTML = `<h2>تم تسجيلك بنجاح ✓</h2><p class="sub">احتفظ بكود الطالب. لتعديل بياناتك لاحقاً اكتب رقم هاتفك في تبويب «تعديل بياناتي».</p>
        <div class="code">${esc(s.code)}</div>
        <dl class="kv"><dt>الاسم</dt><dd>${esc(s.full_name)}</dd><dt>الهاتف</dt><dd class="ltr">${esc(s.phone)}</dd>
        ${s.email ? `<dt>البريد</dt><dd class="ltr">${esc(s.email)}</dd>` : ""}<dt>المجموعة</dt><dd>${esc(s.group_num)}</dd><dt>تاريخ التسجيل</dt><dd class="num">${esc(s.created_date)}</dd></dl>
        <div class="actions" style="justify-content:center"><button class="btn pri" type="button" id="toEdit">مراجعة بياناتي</button><button class="btn ghost" type="button" id="toGroups">عرض المجموعات</button></div>`;
      $("#toEdit").onclick = () => { showEditor(); go("edit"); };
      $("#toGroups").onclick = () => go("groups");
      toast("تم التسجيل في المجموعة " + s.group_num);
      loadPublic();
    } catch (err) { showMsg(msg, err.message); loadPublic(); }
    finally { busy(btn, false); }
  });

  /* ---------- الدخول والتعديل ---------- */
  function fillEditor() {
    const s = S.me, f = $("#editForm");
    f.name.value = s.full_name; f.phone.value = s.phone; f.email.value = s.email || ""; f.notes.value = s.notes || "";
    $("#myCode").textContent = s.code;
    $("#myMeta").textContent = `تاريخ التسجيل ${s.created_date} · آخر تعديل ${s.updated}`;
    renderPicker($("#editGroups"), "eg", s.group_num);
  }
  function showEditor() { $("#loginForm").hidden = true; $("#editForm").hidden = false; fillEditor(); }
  function showLogin() { $("#loginForm").hidden = false; $("#editForm").hidden = true; }

  $("#loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget, btn = f.querySelector("button"), msg = $("#loginMsg");
    const phone = normPhone(f.phone.value);
    if (!phone) { showMsg(msg, "رقم الهاتف غير صحيح، اكتبه بالشكل 01012345678"); return; }
    showMsg(msg, ""); busy(btn, true, "جارٍ البحث…");
    try {
      const r = await api("mjs_student_phone_login", { p_phone: phone });
      S.token = r.token; S.me = r.student; store.set("stoken", r.token); f.reset(); showEditor();
    } catch (err) { showMsg(msg, err.message); }
    finally { busy(btn, false); }
  });

  $("#editForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.currentTarget, btn = f.querySelector("button[type=submit]"), msg = $("#editMsg");
    const d = readForm(f, "eg"); const bad = validate(d, false);
    if (bad) { showMsg(msg, bad); return; }
    showMsg(msg, ""); busy(btn, true);
    try {
      S.me = await api("mjs_student_update", { p_token: S.token, p_name: d.name, p_phone: d.phone, p_email: d.email, p_group: d.group, p_notes: d.notes, p_new_pin: "" });
      fillEditor(); showMsg(msg, "تم حفظ التعديلات بنجاح", "ok"); toast("تم حفظ التعديلات"); loadPublic();
    } catch (err) {
      if (err.code === "28000") { logout(); showMsg($("#loginMsg"), err.message); }
      else showMsg(msg, err.message);
    } finally { busy(btn, false); }
  });

  async function logout() {
    const t = S.token; S.token = null; S.me = null; store.del("stoken"); showLogin();
    if (t) try { await api("mjs_logout", { p_token: t }); } catch {}
  }
  $("#logoutBtn").addEventListener("click", logout);

  // تطبيع فوري للأرقام العربية في حقول الأرقام
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches && t.matches("input[inputmode=numeric],input[inputmode=tel]")) {
      const v = digits(t.value); if (v !== t.value) t.value = v;
    }
  });

  (async function init() {
    go((location.hash || "#register").slice(1), false);
    await loadPublic();
    if (S.token) {
      try { S.me = await api("mjs_student_me", { p_token: S.token }); showEditor(); }
      catch { S.token = null; store.del("stoken"); }
    }
    setInterval(() => { if (!document.hidden) loadPublic(); }, 30000);
  })();
})();
