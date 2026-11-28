/**
 * الحسابات التجريبية: حساب عميل افتراضي وحساب مدير شامل بكل الصلاحيات.
 *
 * التشغيل: في محرر Apps Script نفسه (بجانب Code.gs) اختر الدالة createDemoAccounts ثم اضغط Run.
 * لا يلزم نشر نسخة جديدة. كلمات المرور تُولَّد عشوائياً عند كل تشغيل ولا تُحفظ في أي ملف أو مستودع:
 * تظهر في سجل التنفيذ (Execution log) وتصل بالبريد إلى بريد المكتب وحساب Google الذي شغّل الدالة فقط.
 * إعادة التشغيل تعيد تعيين كلمتي المرور وتفعّل الحسابين من جديد، ولا تنشئ نسخاً مكررة.
 *
 *  - demo.client: عميل «عميل تجريبي» يدخل من «حسابي» (portal.html) ويرى ملفه وطلباته فقط.
 *  - superadmin: مدير (role = admin) له كل الصلاحيات، يدخل من لوحة الإدارة (crm.html).
 */
var DEMO_CLIENT_USER = 'demo.client', SUPER_ADMIN_USER = 'superadmin';

function createDemoAccounts() {
  var res = withLock(function () {
    // the demo client: its own client file, so it never sees or touches a real client's records
    var acc = findAccount(function (a) { return a.username === DEMO_CLIENT_USER; });
    var c = acc && rows('Clients').filter(function (x) { return x.id === acc.clientId; })[0];
    if (!c) c = saveRow('Clients', {name: 'عميل تجريبي', type: 'فرد', phone: '', email: '', source: 'حساب تجريبي',
      notes: 'حساب عرض وتجربة أنشأه المدير. لا يمثّل عميلاً حقيقياً.'});
    var cpw = demoPassword();
    acc = acc || {clientId: c.id, username: DEMO_CLIENT_USER, lastLogin: ''};
    acc.clientId = c.id; acc.salt = Utilities.getUuid(); acc.hash = hashPw(acc.salt, cpw); acc.status = ACC_ACTIVE;
    acc = saveRow('Accounts', acc);
    if (typeof consent === 'function' && !rows('Consents').some(function (x) { return x.clientId === c.id; })) consent(c.id, 'عميل تجريبي', '', LEGAL_DOCS, 'ar', 'حساب تجريبي');
    saveRow('Log', {clientId: c.id, kind: 'account', subject: 'إنشاء أو تجديد الحساب التجريبي: ' + DEMO_CLIENT_USER, body: '', by: 'system'});

    // the full-permission admin: role admin has every permission (permsOf), plus staff management, settings and reports
    var st = rows('Staff').filter(function (x) { return String(x.username).toLowerCase() === SUPER_ADMIN_USER; })[0];
    var isNew = !st, apw = demoPassword();
    st = st || {username: SUPER_ADMIN_USER, lastLogin: ''};
    st.name = st.name || 'المدير الشامل'; st.jobTitle = st.jobTitle || 'مدير النظام';
    st.role = 'admin'; if (typeof PERMS !== 'undefined') st.perms = PERMS.join(','); st.status = ACC_ACTIVE; st.mustChange = '';
    st.salt = Utilities.getUuid(); st.hash = hashPw(st.salt, apw);
    st = saveRow('Staff', st);
    // a new password ends the older sessions of this admin
    if (typeof closeSession === 'function') rows('Sessions').filter(function (x) { return x.staffId === st.id && !x.logout; }).forEach(function (x) { closeSession(x, 'كلمة مرور جديدة'); });
    return {client: c, acc: acc, cpw: cpw, st: st, apw: apw, isNew: isNew};
  });
  // rule 12: a full-permission admin is a high-risk change, so the owner is alerted at once
  demoSec('high', (res.isNew ? 'إنشاء' : 'تجديد كلمة مرور') + ' حساب المدير الشامل بكل الصلاحيات', SUPER_ADMIN_USER, 'من محرر Apps Script بواسطة ' + demoRunner());
  demoSec('info', 'إنشاء أو تجديد حساب العميل التجريبي', DEMO_CLIENT_USER, res.client.id);

  var lines = [
    'حساب العميل التجريبي (صفحة «حسابي»): اسم المستخدم ' + DEMO_CLIENT_USER + ' · كلمة المرور ' + res.cpw + ' · رقم العميل ' + res.client.id,
    'حساب المدير الشامل (لوحة الإدارة): اسم المستخدم ' + SUPER_ADMIN_USER + ' · كلمة المرور ' + res.apw + ' · كل الصلاحيات'
  ];
  lines.forEach(function (l) { Logger.log(l); });
  var to = typeof alertEmails === 'function' ? alertEmails() : [prop('OFFICE_EMAIL')].filter(String), me = demoRunner(), brand = typeof COMPANY !== 'undefined' ? COMPANY : 'نظام العملاء';
  if (/@/.test(me) && to.indexOf(me) < 0) to.push(me);
  if (to.length) MailApp.sendEmail({to: to.join(','), name: 'حماية ' + brand, subject: 'بيانات الحسابات التجريبية (' + brand + ')',
    htmlBody: shell('<p>أُنشئت الحسابات التالية أو جُدّدت كلمات مرورها الآن (' + now() + '):</p><ul>' + lines.map(function (l) { return '<li>' + escHtml(l) + '</li>'; }).join('') + '</ul>' +
      '<p>احتفظ بهذه الرسالة في مكان آمن ولا تعيد توجيهها. لتغيير كلمتي المرور شغّل createDemoAccounts مرة أخرى، ولإيقاف أي حساب استخدم لوحة الإدارة.</p>')});
  return lines;
}

// 14 characters from an alphabet without look-alike letters, always with upper, lower and a digit
function demoPassword() {
  var U = 'ABCDEFGHJKMNPQRSTUVWXYZ', L = 'abcdefghjkmnpqrstuvwxyz', D = '23456789', all = U + L + D;
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Utilities.getUuid(), Utilities.Charset.UTF_8);
  var pick = function (set, i) { return set.charAt(((bytes[i] + 256) % 256) % set.length); };
  var out = pick(U, 0) + pick(L, 1) + pick(D, 2);
  for (var i = 3; i < 14; i++) out += pick(all, i);
  return out;
}
// older servers without the security log still get the account; the owner is told by the credentials email
function demoSec(level, event, who, detail) { if (typeof secLog === 'function') secLog(level, event, who, detail); }
function demoRunner() { try { return Session.getEffectiveUser().getEmail() || 'صاحب المشروع'; } catch (err) { return 'صاحب المشروع'; } }
