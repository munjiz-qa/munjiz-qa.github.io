/**
 * خادم «بناء بيلدر» على Google Apps Script
 * --------------------------------------------------------------
 * يحفظ طلبات العملاء في جدول Google Sheets باسم «بناء بيلدر — الطلبات»،
 * ويحفظ إعدادات الموقع (الأسعار، العملات، التواصل، المحتوى، أكواد الخصم)،
 * ويتيح لوحة الإدارة بتسجيل دخول آمن (بريد + كلمة مرور مشفّرة).
 *
 * طريقة التشغيل (مرة واحدة):
 *   1) افتح https://script.new بحساب Google الخاص بالمنصة.
 *   2) احذف المحتوى الافتراضي والصق هذا الملف كاملاً، ثم احفظ.
 *   3) Deploy ← New deployment ← Web app:
 *        Execute as: Me      Who has access: Anyone
 *   4) وافق على الصلاحيات، ثم انسخ رابط Web app (ينتهي بـ /exec).
 */

var CONFIG = {
  ADMIN_EMAIL: 'munijizqa@gmail.com',          // بريد مدير المنصة (اسم الدخول)
  INIT_SALT: 'a437edf1d22fff44f835d15956d05554', // كلمة المرور المؤقتة الأولى (تُغيَّر إلزامياً عند أول دخول)
  INIT_HASH: 'fe30c0caccdef72496579397aad7deaf7db0f6c8c9b19db98ed1347c67315041',
  NOTIFY_NEW_ORDERS: true,                      // بريد تنبيه للإدارة عند كل طلب جديد
  SITE_URL: 'https://munjiz-qa.github.io/binaa-builder/',
  SHEET_NAME: 'بناء بيلدر — الطلبات',
  SESSION_HOURS: 6
};

var STATUSES = ['new', 'review', 'awaiting_payment', 'paid', 'building', 'delivered', 'cancelled'];
var HEAD = ['المعرّف', 'رقم الطلب', 'تاريخ الطلب', 'الحالة', 'العميل', 'الجوال', 'البريد', 'النشاط', 'الباقة', 'الدفعة الأولى', 'العملة', 'آخر تحديث', 'مفتاح المتابعة', 'البيانات'];
var COL = {id: 1, code: 2, created: 3, status: 4, name: 5, phone: 6, email: 7, business: 8, plan: 9, first: 10, cur: 11, updated: 12, key: 13, data: 14};

/* ================= HTTP ================= */
function doGet(e) { return respond_((e && e.parameter) || {}); }
function doPost(e) {
  var body = {};
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}') || {}; } catch (x) { body = {}; }
  return respond_(body);
}
function respond_(p) {
  var out;
  try { out = handle_(p); out.ok = true; }
  catch (err) { out = {ok: false, error: (err && err.code) || 'server', message: (err && err.code) ? String(err.message || '') : 'خطأ غير متوقع في الخادم'}; if (!(err && err.code)) console.error(err); }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}
function fail_(code, message) { var e = new Error(message || code); e.code = code; throw e; }

function handle_(p) {
  var a = String(p.action || p.a || '');
  switch (a) {
    case 'ping': return {time: new Date().toISOString(), version: 1};
    case 'settings': return {settings: readJSON_('SETTINGS')};
    case 'create': return createOrder_(p.order);
    case 'track': return track_(p.items);
    case 'cancel': return cancel_(p.id, p.key);
    case 'login': return login_(p.email, p.password);
    case 'me': { var s = session_(p.token); return {email: s.email, mustChange: s.mustChange}; }
    case 'logout': CacheService.getScriptCache().remove('tok:' + String(p.token || '')); return {};
    case 'password': return changePassword_(p.token, p.current, p.next);
    case 'orders': requireAdmin_(p.token); return {orders: allOrders_(), sheet: 'https://docs.google.com/spreadsheets/d/' + props_().getProperty('SHEET_ID')};
    case 'patch': requireAdmin_(p.token); return patchOrder_(p.id, p.patch);
    case 'delete': requireAdmin_(p.token); return deleteOrder_(p.id);
    case 'saveSettings': requireAdmin_(p.token); return saveSettings_(p.settings);
    default: fail_('bad_action', 'إجراء غير معروف');
  }
}

/* ================= STORAGE ================= */
function props_() { return PropertiesService.getScriptProperties(); }
function readJSON_(k) { var v = props_().getProperty(k); if (!v) return null; try { return JSON.parse(v); } catch (x) { return null; } }
function sheet_() {
  var pr = props_(), id = pr.getProperty('SHEET_ID'), ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (x) { ss = null; } }
  if (!ss) { ss = SpreadsheetApp.create(CONFIG.SHEET_NAME); pr.setProperty('SHEET_ID', ss.getId()); }
  var sh = ss.getSheets()[0];
  if (sh.getLastRow() === 0) {
    sh.setName('الطلبات'); sh.appendRow(HEAD); sh.setFrozenRows(1); sh.setRightToLeft(true);
    sh.getRange(1, 1, 1, HEAD.length).setFontWeight('bold').setBackground('#1F3A5F').setFontColor('#ffffff');
  }
  return sh;
}
function rowOf_(sh, id) {
  if (!/^o[a-z0-9]{4,24}$/.test(String(id || ''))) return 0;
  var last = sh.getLastRow(); if (last < 2) return 0;
  var ids = sh.getRange(2, COL.id, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (ids[i][0] === id) return i + 2;
  return 0;
}
function readRow_(sh, r) {
  var v = sh.getRange(r, 1, 1, HEAD.length).getValues()[0], o = null;
  try { o = JSON.parse(v[COL.data - 1]); } catch (x) { o = null; }
  if (o) o.status = STATUSES.indexOf(v[COL.status - 1]) >= 0 ? v[COL.status - 1] : o.status;
  return {o: o, key: v[COL.key - 1]};
}
function writeRow_(sh, r, o, keyHash) {
  var t = o.totals || {}, k = o.customer || {}, cfg = o.cfg || {};
  var row = [o.id, o.code, o.createdAt, o.status, k.name || '', k.phone || '', k.email || '', cfg.name || '', (t.planName && t.planName[0]) || cfg.plan || '', Number(t.first) || 0, t.cur || '', new Date().toISOString(), keyHash, JSON.stringify(o)];
  // نمنع تحويل النصوص إلى معادلات داخل الجدول
  row = row.map(function (x) { return typeof x === 'string' && /^[=+\-@]/.test(x) ? "'" + x : x; });
  sh.getRange(r, 1, 1, row.length).setValues([row]);
}
function withLock_(fn) { var l = LockService.getScriptLock(); l.waitLock(20000); try { return fn(); } finally { l.releaseLock(); } }

/* ================= ORDERS ================= */
function str_(v, n) { return String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F<>]/g, '').trim().slice(0, n); }
function createOrder_(o) {
  if (!o || typeof o !== 'object') fail_('invalid', 'بيانات الطلب ناقصة');
  var raw = JSON.stringify(o);
  if (raw.length > 60000) fail_('too_large', 'حجم الطلب كبير');
  if (!/^o[a-z0-9]{4,24}$/.test(String(o.id || '')) || !/^MDK-\d{6}-[A-Z0-9]{4}$/.test(String(o.code || ''))) fail_('invalid', 'رقم الطلب غير صالح');
  var k = o.customer || {};
  if (str_(k.name, 60).length < 5 || !/^\+\d{1,4} [\d ]{6,16}$/.test(String(k.phone || ''))) fail_('invalid', 'بيانات العميل غير مكتملة');
  if (!o.cfg || !o.cfg.cat || !o.cfg.plan) fail_('invalid', 'تفاصيل الموقع غير مكتملة');
  var cache = CacheService.getScriptCache(), slot = 'rate:' + Math.floor(Date.now() / 60000), n = Number(cache.get(slot) || 0);
  if (n >= 30) fail_('busy', 'ضغط مرتفع، أعد المحاولة بعد دقيقة');
  cache.put(slot, String(n + 1), 120);
  var now = new Date().toISOString();
  // الحقول التي تخص الإدارة لا يحددها العميل
  o.status = 'new'; o.history = [{s: 'new', at: now}]; o.adminNote = ''; o.customerMessage = ''; o.createdAt = now;
  var key = token_(18);
  return withLock_(function () {
    var sh = sheet_();
    if (rowOf_(sh, o.id)) fail_('exists', 'الطلب مسجّل مسبقاً');
    if (sh.getLastRow() > 5000) fail_('too_many', 'سعة التخزين ممتلئة');
    writeRow_(sh, sh.getLastRow() + 1, o, sha_(key));
    notify_(o);
    return {id: o.id, key: key, createdAt: now};
  });
}
function track_(items) {
  if (!Array.isArray(items)) fail_('invalid', 'طلب غير صالح');
  var sh = sheet_(), out = [];
  items.slice(0, 20).forEach(function (it) {
    var r = rowOf_(sh, it && it.id); if (!r) return;
    var d = readRow_(sh, r); if (!d.o || !it.key || sha_(String(it.key)) !== d.key) return;
    out.push({id: d.o.id, status: d.o.status, history: d.o.history || [], customerMessage: d.o.customerMessage || ''});
  });
  return {orders: out};
}
function cancel_(id, key) {
  return withLock_(function () {
    var sh = sheet_(), r = rowOf_(sh, id); if (!r) fail_('not_found', 'الطلب غير موجود');
    var d = readRow_(sh, r); if (!d.o || !key || sha_(String(key)) !== d.key) fail_('forbidden', 'لا تملك صلاحية على هذا الطلب');
    if (['new', 'review'].indexOf(d.o.status) < 0) fail_('locked', 'لا يمكن إلغاء الطلب في هذه المرحلة');
    d.o.status = 'cancelled'; d.o.history = (d.o.history || []).concat([{s: 'cancelled', at: new Date().toISOString()}]).slice(-30);
    writeRow_(sh, r, d.o, d.key);
    return {status: d.o.status, history: d.o.history};
  });
}
function allOrders_() {
  var sh = sheet_(), last = sh.getLastRow(); if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, HEAD.length).getValues(), out = [];
  vals.forEach(function (v) {
    try { var o = JSON.parse(v[COL.data - 1]); if (STATUSES.indexOf(v[COL.status - 1]) >= 0) o.status = v[COL.status - 1]; out.push(o); } catch (x) {}
  });
  return out;
}
function patchOrder_(id, patch) {
  patch = patch || {};
  return withLock_(function () {
    var sh = sheet_(), r = rowOf_(sh, id); if (!r) fail_('not_found', 'الطلب غير موجود');
    var d = readRow_(sh, r); if (!d.o) fail_('not_found', 'الطلب غير موجود');
    if (patch.status != null) { if (STATUSES.indexOf(patch.status) < 0) fail_('invalid', 'حالة غير صالحة'); d.o.status = patch.status; }
    if (Array.isArray(patch.history)) d.o.history = patch.history.filter(function (h) { return h && STATUSES.indexOf(h.s) >= 0 && !isNaN(Date.parse(h.at)); }).slice(-30).map(function (h) { return {s: h.s, at: h.at}; });
    if (patch.adminNote != null) d.o.adminNote = String(patch.adminNote).slice(0, 1000);
    if (patch.customerMessage != null) d.o.customerMessage = String(patch.customerMessage).slice(0, 1000);
    writeRow_(sh, r, d.o, d.key);
    return {order: d.o};
  });
}
function deleteOrder_(id) {
  return withLock_(function () { var sh = sheet_(), r = rowOf_(sh, id); if (r) sh.deleteRow(r); return {deleted: !!r}; });
}
function saveSettings_(s) {
  if (!s || typeof s !== 'object') fail_('invalid', 'إعدادات غير صالحة');
  var raw = JSON.stringify(s); if (raw.length > 60000) fail_('too_large', 'الإعدادات كبيرة');
  props_().setProperty('SETTINGS', raw);
  return {settings: s};
}
function notify_(o) {
  if (!CONFIG.NOTIFY_NEW_ORDERS) return;
  try {
    var k = o.customer || {}, t = o.totals || {}, c = o.cfg || {};
    MailApp.sendEmail({to: CONFIG.ADMIN_EMAIL, subject: 'طلب موقع جديد ' + o.code + ' — بناء بيلدر',
      body: ['وصل طلب جديد عبر بناء بيلدر.', '', 'رقم الطلب: ' + o.code, 'العميل: ' + (k.name || ''), 'الجوال: ' + (k.phone || ''), 'البريد: ' + (k.email || '—'),
        'اسم الموقع: ' + (c.name || '—'), 'الباقة: ' + ((t.planName && t.planName[0]) || c.plan), 'الدفعة الأولى: ' + (t.first || 0) + ' ' + (t.cur || ''), '',
        'افتح لوحة الإدارة: ' + CONFIG.SITE_URL + 'admin/'].join('\n')});
  } catch (x) { console.warn('notify failed', x); }
}

/* ================= AUTH ================= */
function hex_(bytes) { return Array.prototype.map.call(bytes, function (b) { return ('0' + ((b < 0 ? b + 256 : b).toString(16))).slice(-2); }).join(''); }
function sha_(s) { return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.newBlob(String(s)).getBytes())); }
function hashPw_(salt, pw) {
  var h = Utilities.newBlob(salt + ':' + pw).getBytes(), sb = Array.prototype.slice.call(Utilities.newBlob(salt).getBytes());
  for (var i = 0; i < 2000; i++) h = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Array.prototype.slice.call(h).concat(sb));
  return hex_(h);
}
function token_(n) {
  var a = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789', s = '';
  var seed = Utilities.getUuid() + Utilities.getUuid() + Utilities.getUuid();
  var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_512, Utilities.newBlob(seed + Math.random() + Date.now()).getBytes());
  for (var i = 0; i < n; i++) s += a[(b[i] + 128) % a.length];
  return s;
}
function auth_() {
  return readJSON_('AUTH') || {email: CONFIG.ADMIN_EMAIL, salt: CONFIG.INIT_SALT, hash: CONFIG.INIT_HASH, mustChange: true};
}
function eq_(a, b) { a = String(a); b = String(b); if (a.length !== b.length) return false; var d = 0; for (var i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; }
function login_(email, password) {
  email = String(email || '').trim().toLowerCase(); password = String(password || '');
  var cache = CacheService.getScriptCache(), fk = 'fail:' + email, fails = Number(cache.get(fk) || 0), gk = 'gfail:' + Math.floor(Date.now() / 600000), g = Number(cache.get(gk) || 0);
  if (fails >= 5 || g >= 30) fail_('locked', 'محاولات كثيرة. أعد المحاولة بعد 15 دقيقة');
  var a = auth_();
  if (email !== String(a.email).toLowerCase() || !eq_(hashPw_(a.salt, password), a.hash)) {
    cache.put(fk, String(fails + 1), 900); cache.put(gk, String(g + 1), 900);
    Utilities.sleep(400);
    fail_('bad_login', 'البريد أو كلمة المرور غير صحيحة');
  }
  cache.remove(fk);
  var tok = token_(40);
  cache.put('tok:' + tok, JSON.stringify({email: a.email}), CONFIG.SESSION_HOURS * 3600);
  return {token: tok, email: a.email, mustChange: !!a.mustChange};
}
function session_(token) {
  var v = token && CacheService.getScriptCache().get('tok:' + String(token));
  if (!v) fail_('auth', 'انتهت الجلسة. سجّل الدخول من جديد');
  var a = auth_();
  return {email: JSON.parse(v).email, mustChange: !!a.mustChange};
}
function requireAdmin_(token) {
  var s = session_(token);
  if (s.mustChange) fail_('must_change', 'غيّر كلمة المرور المؤقتة أولاً');
  return s;
}
function changePassword_(token, current, next) {
  session_(token);
  var a = auth_(); next = String(next || '');
  if (!eq_(hashPw_(a.salt, String(current || '')), a.hash)) fail_('bad_login', 'كلمة المرور الحالية غير صحيحة');
  if (next.length < 10 || !/[A-Za-z]/.test(next) || !/\d/.test(next)) fail_('weak', 'كلمة المرور 10 أحرف على الأقل وتجمع بين حروف وأرقام');
  if (next === String(current)) fail_('weak', 'اختر كلمة مرور مختلفة عن الحالية');
  var salt = token_(32);
  props_().setProperty('AUTH', JSON.stringify({email: a.email, salt: salt, hash: hashPw_(salt, next), mustChange: false}));
  return {changed: true};
}
