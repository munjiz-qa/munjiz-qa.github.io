// بصيرة كولر — لوحة إدارة المنصة
(function () {
  const { rpc, fmt, date, dateTime, num, KIND, CAT, level, esc, toast, auth, normalize } = BC;
  const app = document.getElementById('app'), dlg = document.getElementById('dlg'), body = document.getElementById('dlgBody');
  let tab = 'overview', q = '', ov = null;
  const T = () => auth.token();
  const call = (fn, args) => rpc(fn, Object.assign({ p_token: T() }, args || {}));

  function open(html) { body.innerHTML = html; body.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dlg.close()); dlg.showModal(); }

  async function start() {
    const u = await auth.refresh();
    BC.chrome('admin');
    if (!u) { location.href = 'account.html?next=' + encodeURIComponent(location.pathname); return; }
    if (u.role !== 'admin') { app.innerHTML = '<div class="card empty">هذه الصفحة مخصصة لمدير المنصة. <a href="./">العودة للرئيسية</a></div>'; return; }
    draw();
  }

  async function draw() {
    try { ov = await call('bc_admin_overview'); } catch (e) { app.innerHTML = '<div class="card empty">' + esc(e.message) + '</div>'; return; }
    const s = ov.stats;
    const tabs = [['overview', 'نظرة عامة'], ['reports', 'البلاغات', s.open_reports], ['numbers', 'الأرقام'], ['users', 'المستخدمون'], ['requests', 'طلبات الخصوصية', s.open_requests], ['audit', 'سجل العمليات']];
    app.innerHTML = '<div style="display:flex;justify-content:space-between;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:16px"><div><h1 style="font-size:30px;margin:0">لوحة الإدارة</h1><p class="hint" style="margin:0">بصيرة كولر من منجز · ' + esc(auth.user().name) + '</p></div><button class="btn btn-main" id="addNum">إضافة رقم موثّق</button></div>' +
      '<div class="stats"><div class="stat"><b>' + num(s.numbers) + '</b><span>رقم في القاعدة</span></div><div class="stat"><b>' + num(s.spam_numbers) + '</b><span>رقم مزعج أو مشبوه</span></div><div class="stat"><b>' + num(s.users) + '</b><span>مستخدم (' + num(s.new_users_7d) + ' هذا الأسبوع)</span></div><div class="stat"><b>' + num(s.lookups) + '</b><span>عملية بحث</span></div></div>' +
      '<div class="side-tabs">' + tabs.map(t => '<button data-t="' + t[0] + '" class="' + (tab === t[0] ? 'on' : '') + '">' + t[1] + (t[2] ? '<span class="cnt">' + num(t[2]) + '</span>' : '') + '</button>').join('') + '</div>' +
      '<div id="pane"></div>';
    app.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tab = b.dataset.t; q = ''; draw(); });
    document.getElementById('addNum').onclick = () => editNumber({ e164: '', name: '', category: 'business', verified: true, hidden: false });
    pane();
  }

  function toolbar(ph) {
    return '<form class="toolbar" id="tf"><input id="tq" placeholder="' + ph + '" value="' + esc(q) + '"><button class="btn btn-line btn-sm" type="submit">بحث</button></form>';
  }
  function bindToolbar() { const f = document.getElementById('tf'); if (f) f.onsubmit = e => { e.preventDefault(); q = document.getElementById('tq').value; pane(); }; }
  const numLink = e => '<a class="ltr" href="./?n=' + encodeURIComponent(e) + '#search" target="_blank">' + esc(fmt(e)) + '</a>';

  async function pane() {
    const p = document.getElementById('pane');
    if (tab === 'overview') {
      p.innerHTML = '<h2 style="font-size:20px">الأرقام الأعلى خطورة</h2><div class="tbl-wrap"><table class="tbl stack"><thead><tr><th>الرقم</th><th>الاسم</th><th>التصنيف</th><th>المؤشر</th><th>عمليات البحث</th></tr></thead><tbody>' +
        (ov.top.map(r => '<tr><td data-l="الرقم">' + numLink(r.e164) + '</td><td data-l="الاسم">' + esc(r.name || '—') + '</td><td data-l="التصنيف">' + (CAT[r.category] || '—') + '</td><td data-l="المؤشر"><span class="badge ' + level(r.score).cls + '">' + r.score + '</span></td><td data-l="البحث">' + num(r.lookups) + '</td></tr>').join('') || '<tr><td colspan="5" class="empty">لا توجد بيانات بعد.</td></tr>') +
        '</tbody></table></div><p class="hint" style="margin-top:12px">البلاغات المفتوحة: ' + num(ov.stats.open_reports) + ' · طلبات الخصوصية المفتوحة: ' + num(ov.stats.open_requests) + '</p>';
      return;
    }
    p.innerHTML = '<div class="empty">جارٍ التحميل…</div>';
    let rows;
    try { rows = await call('bc_admin_list', { p_what: tab, p_q: q || null }); } catch (e) { p.innerHTML = '<div class="card empty">' + esc(e.message) + '</div>'; return; }
    if (tab === 'reports') {
      p.innerHTML = toolbar('ابحث برقم الهاتف') + '<div class="tbl-wrap"><table class="tbl stack"><thead><tr><th>الرقم</th><th>النوع</th><th>الملاحظة</th><th>المُبلِّغ</th><th>التاريخ</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>' +
        (rows.map(r => '<tr><td data-l="الرقم">' + numLink(r.e164) + '</td><td data-l="النوع">' + KIND[r.kind] + '</td><td data-l="الملاحظة">' + esc(r.comment || '—') + '</td><td data-l="المُبلِّغ">' + esc(r.reporter || '—') + '</td><td data-l="التاريخ"><span class="ltr">' + dateTime(r.created_at) + '</span></td><td data-l="الحالة">' + st(r.status) + '</td><td data-l="إجراء"><div style="display:flex;gap:6px;flex-wrap:wrap">' +
          (r.status !== 'confirmed' ? '<button class="btn btn-risk btn-sm" data-rep="' + r.id + '" data-s="confirmed">تأكيد</button>' : '') +
          (r.status !== 'dismissed' ? '<button class="btn btn-line btn-sm" data-rep="' + r.id + '" data-s="dismissed">رفض</button>' : '') +
          (r.status !== 'open' ? '<button class="btn btn-line btn-sm" data-rep="' + r.id + '" data-s="open">إعادة فتح</button>' : '') +
          '</div></td></tr>').join('') || '<tr><td colspan="7" class="empty">لا توجد بلاغات.</td></tr>') + '</tbody></table></div>';
      p.querySelectorAll('[data-rep]').forEach(b => b.onclick = async () => { b.disabled = true; try { await call('bc_admin_report', { p_id: +b.dataset.rep, p_status: b.dataset.s }); toast('حُدّثت حالة البلاغ.'); draw(); } catch (e) { toast(e.message, true); b.disabled = false; } });
    } else if (tab === 'numbers') {
      p.innerHTML = toolbar('ابحث برقم أو اسم') + '<div class="tbl-wrap"><table class="tbl stack"><thead><tr><th>الرقم</th><th>الاسم</th><th>التصنيف</th><th>المؤشر</th><th>البلاغات</th><th>الحالة</th><th>آخر تحديث</th><th>إجراء</th></tr></thead><tbody>' +
        (rows.map((r, i) => '<tr><td data-l="الرقم">' + numLink(r.e164) + '</td><td data-l="الاسم">' + esc(r.name || '—') + (r.verified ? ' <span class="badge sun">✓ موثّق</span>' : '') + '</td><td data-l="التصنيف">' + (CAT[r.category] || '—') + '</td><td data-l="المؤشر"><span class="badge ' + level(r.score).cls + '">' + r.score + '</span></td><td data-l="البلاغات">' + num(r.reports) + '</td><td data-l="الحالة">' + (r.hidden ? '<span class="badge">مخفي بطلب صاحبه</span>' : '<span class="badge safe">ظاهر</span>') + '</td><td data-l="آخر تحديث"><span class="ltr">' + date(r.updated_at) + '</span></td><td data-l="إجراء"><div style="display:flex;gap:6px"><button class="btn btn-line btn-sm" data-ed="' + i + '">تعديل</button><button class="btn btn-line btn-sm" data-del="' + esc(r.e164) + '">حذف</button></div></td></tr>').join('') || '<tr><td colspan="8" class="empty">لا توجد أرقام.</td></tr>') + '</tbody></table></div>';
      p.querySelectorAll('[data-ed]').forEach(b => b.onclick = () => editNumber(rows[+b.dataset.ed]));
      p.querySelectorAll('[data-del]').forEach(b => b.onclick = () => confirmBox('حذف الرقم ' + fmt(b.dataset.del) + ' وكل بلاغاته وأسمائه نهائياً؟', async () => { await call('bc_admin_delete_number', { p_number: b.dataset.del }); toast('حُذف الرقم.'); draw(); }));
    } else if (tab === 'users') {
      p.innerHTML = toolbar('ابحث بالاسم أو البريد') + '<div class="tbl-wrap"><table class="tbl stack"><thead><tr><th>الاسم</th><th>البريد</th><th>الجوال</th><th>الدور</th><th>المساهمات</th><th>التسجيل</th><th>آخر دخول</th><th>إجراء</th></tr></thead><tbody>' +
        (rows.map(r => '<tr><td data-l="الاسم">' + esc(r.name) + '</td><td data-l="البريد"><span class="ltr">' + esc(r.email) + '</span></td><td data-l="الجوال"><span class="ltr">' + esc(r.phone ? fmt(r.phone) : '—') + '</span></td><td data-l="الدور">' + (r.role === 'admin' ? '<span class="badge sun">مدير</span>' : 'مستخدم') + (r.status === 'suspended' ? ' <span class="badge risk">موقوف</span>' : '') + '</td><td data-l="المساهمات">' + num(r.reports) + ' بلاغ · ' + num(r.names) + ' اسم</td><td data-l="التسجيل"><span class="ltr">' + date(r.created_at) + '</span></td><td data-l="آخر دخول"><span class="ltr">' + (r.last_login ? dateTime(r.last_login) : '—') + '</span></td><td data-l="إجراء"><div style="display:flex;gap:6px;flex-wrap:wrap">' +
          '<button class="btn btn-line btn-sm" data-u="' + r.id + '" data-role="' + (r.role === 'admin' ? 'user' : 'admin') + '">' + (r.role === 'admin' ? 'سحب الإدارة' : 'جعله مديراً') + '</button>' +
          '<button class="btn btn-line btn-sm" data-u="' + r.id + '" data-st="' + (r.status === 'active' ? 'suspended' : 'active') + '">' + (r.status === 'active' ? 'إيقاف' : 'تفعيل') + '</button></div></td></tr>').join('') || '<tr><td colspan="8" class="empty">لا يوجد مستخدمون.</td></tr>') + '</tbody></table></div>';
      p.querySelectorAll('[data-u]').forEach(b => b.onclick = async () => { b.disabled = true; try { await call('bc_admin_user', { p_id: b.dataset.u, p_role: b.dataset.role || null, p_status: b.dataset.st || null }); toast('حُدّث المستخدم.'); pane(); } catch (e) { toast(e.message, true); b.disabled = false; } });
    } else if (tab === 'requests') {
      p.innerHTML = '<p class="hint">طلبات الإزالة أو التصحيح التي يرسلها أصحاب الأرقام من صفحة الخصوصية. قبول طلب الإزالة يُخفي الرقم ويمنع أي إضافة لاحقة عليه.</p><div class="tbl-wrap"><table class="tbl stack"><thead><tr><th>الرقم</th><th>الطلب</th><th>وسيلة التواصل</th><th>التفاصيل</th><th>التاريخ</th><th>الحالة</th><th>إجراء</th></tr></thead><tbody>' +
        (rows.map(r => '<tr><td data-l="الرقم">' + numLink(r.e164) + '</td><td data-l="الطلب">' + (r.kind === 'remove' ? 'إزالة الرقم' : 'تصحيح الاسم') + '</td><td data-l="التواصل"><span class="ltr">' + esc(r.contact) + '</span></td><td data-l="التفاصيل">' + esc(r.details || '—') + '</td><td data-l="التاريخ"><span class="ltr">' + dateTime(r.created_at) + '</span></td><td data-l="الحالة">' + ({ open: '<span class="badge sun">جديد</span>', done: '<span class="badge safe">نُفّذ</span>', rejected: '<span class="badge">مرفوض</span>' }[r.status]) + '</td><td data-l="إجراء">' + (r.status === 'open' ? '<div style="display:flex;gap:6px"><button class="btn btn-safe btn-sm" data-rq="' + r.id + '" data-s="done">تنفيذ</button><button class="btn btn-line btn-sm" data-rq="' + r.id + '" data-s="rejected">رفض</button></div>' : '—') + '</td></tr>').join('') || '<tr><td colspan="7" class="empty">لا توجد طلبات.</td></tr>') + '</tbody></table></div>';
      p.querySelectorAll('[data-rq]').forEach(b => b.onclick = async () => { b.disabled = true; try { await call('bc_admin_request', { p_id: +b.dataset.rq, p_status: b.dataset.s }); toast('عولج الطلب.'); draw(); } catch (e) { toast(e.message, true); b.disabled = false; } });
    } else if (tab === 'audit') {
      p.innerHTML = '<div class="tbl-wrap"><table class="tbl stack"><thead><tr><th>العملية</th><th>الهدف</th><th>المدير</th><th>التاريخ</th></tr></thead><tbody>' +
        (rows.map(r => '<tr><td data-l="العملية">' + esc(r.action) + '</td><td data-l="الهدف"><span class="ltr">' + esc(/^\+\d+$/.test(r.target || '') ? fmt(r.target) : (r.target || '—')) + '</span></td><td data-l="المدير">' + esc(r.actor || '—') + '</td><td data-l="التاريخ"><span class="ltr">' + dateTime(r.created_at) + '</span></td></tr>').join('') || '<tr><td colspan="4" class="empty">لا توجد عمليات بعد.</td></tr>') + '</tbody></table></div>';
    }
    bindToolbar();
  }

  function st(s) { return { open: '<span class="badge sun">قيد المراجعة</span>', confirmed: '<span class="badge risk">مؤكد</span>', dismissed: '<span class="badge">مرفوض</span>' }[s]; }

  function confirmBox(msg, fn) {
    open('<h3>تأكيد <button class="x" data-close aria-label="إغلاق">✕</button></h3><p>' + esc(msg) + '</p><div style="display:flex;gap:10px"><button class="btn btn-risk" id="yes">نعم، احذف</button><button class="btn btn-line" data-close>إلغاء</button></div>');
    body.querySelectorAll('[data-close]').forEach(b => b.onclick = () => dlg.close());
    body.querySelector('#yes').onclick = async () => { try { await fn(); dlg.close(); } catch (e) { toast(e.message, true); } };
  }

  function editNumber(r) {
    const cats = Object.entries(CAT).map(([k, v]) => '<option value="' + k + '"' + (r.category === k ? ' selected' : '') + '>' + v + '</option>').join('');
    open('<h3>' + (r.e164 ? 'تعديل الرقم' : 'إضافة رقم موثّق') + ' <button class="x" data-close aria-label="إغلاق">✕</button></h3><form id="ef">' +
      '<div class="field"><label for="en">الرقم</label><input id="en" dir="ltr" required value="' + esc(r.e164 ? fmt(r.e164) : '') + '"' + (r.e164 ? ' readonly' : '') + ' placeholder="+974 4444 0000"></div>' +
      '<div class="field"><label for="nm">الاسم المعروض</label><input id="nm" maxlength="60" value="' + esc(r.name || '') + '"></div>' +
      '<div class="field"><label for="ct">التصنيف</label><select id="ct">' + cats + '</select></div>' +
      '<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" id="vf" style="width:20px;min-height:20px"' + (r.verified ? ' checked' : '') + '> رقم موثّق (يثبت الاسم ولا تغيّره المساهمات)</label>' +
      '<label style="display:flex;gap:8px;align-items:center;font-weight:400"><input type="checkbox" id="hd" style="width:20px;min-height:20px"' + (r.hidden ? ' checked' : '') + '> إخفاء الرقم من نتائج البحث</label><br>' +
      '<button class="btn btn-main" type="submit" style="width:100%">حفظ</button></form>');
    body.querySelector('#ef').onsubmit = async ev => {
      ev.preventDefault();
      const e = normalize(body.querySelector('#en').value, '974');
      if (!e) { toast('صيغة الرقم غير صحيحة.', true); return; }
      try {
        await call('bc_admin_number', { p_number: e, p_name: BC.cleanName(body.querySelector('#nm').value) || null, p_category: body.querySelector('#ct').value, p_verified: body.querySelector('#vf').checked, p_hidden: body.querySelector('#hd').checked });
        dlg.close(); toast('حُفظ الرقم ' + fmt(e) + '.'); tab = 'numbers'; draw();
      } catch (err) { toast(err.message, true); }
    };
  }

  start();
})();
