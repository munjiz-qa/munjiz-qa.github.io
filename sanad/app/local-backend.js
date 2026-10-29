/* سند | Sanad — الخادم المدمج في المتصفح (للنسخة المنشورة على GitHub Pages)
   يقدّم نفس واجهات خادم سند (api/*) داخل المتصفح نفسه: الحسابات، والصلاحيات، والبيانات، والمساعد المدمج.
   لا يحتاج Claude ولا أي خادم، والبيانات محفوظة في هذا المتصفح. */
(() => {
'use strict';
const VERSION = '1.1.0-web';
const KEY = 'sanad:local:v1', SID = 'sanad:local:sid';
const DEFAULTS = {
  admin: { name: 'المدير العام', email: 'admin@sanad.local', phone: '+974 5160 0498', password: 'Sanad@Admin2026' },
  client: { name: 'عميل سند', email: 'client@sanad.local', phone: '+974 5000 0001', password: 'Sanad@Client2026' }
};
const SITE_SEED = {
  name: 'سند من منجز', tagline: 'وكيلك التنفيذي الذكي لإدارة العملاء والمواعيد', city: 'الدوحة',
  phone: '+974 5160 0498', email: 'munijizqa@gmail.com',
  about: 'سند من منجز ينظّم عملاءك ومواعيدك وطلباتك في مكان واحد، ويرد على أسئلتهم على مدار الساعة.',
  services: [{ name: 'استشارة أولية', duration: 30, price: '150 ر.ق' }, { name: 'إعداد سند لنشاطك', duration: 60, price: '900 ر.ق' }, { name: 'جلسة متابعة', duration: 45, price: '300 ر.ق' }],
  days: [0, 1, 2, 3, 4], start: '09:00', end: '17:00', slot: 30, example: false
};

/* ---------- storage ---------- */
let mem = null;
const ls = {
  get(k) { try { return localStorage.getItem(k); } catch { return mem && mem['__' + k] || null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { mem = mem || {}; mem['__' + k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};
let S = null;
const load = () => { try { return JSON.parse(ls.get(KEY)); } catch { return null; } };
const save = () => ls.set(KEY, JSON.stringify(S));

/* ---------- normalisation (same as the server) ---------- */
const AR = '٠١٢٣٤٥٦٧٨٩', FA = '۰۱۲۳۴۵۶۷۸۹';
const toLatin = s => String(s || '').replace(/[٠-٩۰-۹]/g, c => String(AR.includes(c) ? AR.indexOf(c) : FA.indexOf(c)));
function normPhone(p) {
  let d = toLatin(p).replace(/[^\d+]/g, '');
  if (!d) return '';
  if (d.startsWith('+')) d = d.slice(1); else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('05') && d.length === 10) d = '966' + d.slice(1);
  else if (d.startsWith('5') && d.length === 9) d = '966' + d;
  else if (/^[3567]\d{7}$/.test(d)) d = '974' + d;
  if (d.startsWith('966') && d.length === 12) return `+966 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  if (d.startsWith('974') && d.length === 11) return `+974 ${d.slice(3, 7)} ${d.slice(7)}`;
  return '+' + d;
}
const normEmail = e => String(e || '').trim().toLowerCase();
const normName = n => String(n || '').replace(/\s+/g, ' ').trim().slice(0, 80);
const digits = p => toLatin(p).replace(/\D/g, '');
const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => b.toString(16).padStart(2, '0')).join('');

/* ---------- passwords (PBKDF2-SHA256) ---------- */
async function hashPw(pw, salt = rnd(16)) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(pw)), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120000 }, k, 256);
  return { salt, hash: Array.from(new Uint8Array(bits), b => b.toString(16).padStart(2, '0')).join('') };
}
const checkPw = async (u, pw) => (await hashPw(pw, u.salt)).hash === u.hash;

/* ---------- first run ---------- */
const ready = (async () => {
  S = load();
  if (S && S.users) return;
  const at = new Date().toISOString(), a = DEFAULTS.admin, c = DEFAULTS.client;
  S = { cfg: { visitorChat: true, registration: true }, users: {}, db: {} };
  S.users['u-owner'] = { id: 'u-owner', name: a.name, email: a.email, phone: a.phone, role: 'admin', super: true, seedPw: true, ...(await hashPw(a.password)), createdAt: at };
  S.users['c-default'] = { id: 'c-default', name: c.name, email: c.email, phone: c.phone, role: 'client', seedPw: true, ...(await hashPw(c.password)), createdAt: at };
  S.db['portal/c-default'] = { profile: { name: c.name, phone: c.phone, email: c.email }, bookings: [], updatedAt: at };
  S.db['public/site'] = { ...SITE_SEED, updatedAt: at };
  save();
})();

/* ---------- live updates across tabs ---------- */
const subs = new Set();
const bc = 'BroadcastChannel' in window ? new BroadcastChannel('sanad-local') : null;
const emit = p => { subs.forEach(f => f(p)); bc && bc.postMessage(p); };
if (bc) bc.onmessage = e => { S = load() || S; subs.forEach(f => f(e.data)); };
addEventListener('storage', e => { if (e.key === KEY) S = load() || S; });

/* ---------- rules (same as the server) ---------- */
const me = () => { const id = ls.get(SID); return id && S.users[id] || null; };
const isSuper = u => !!(u && u.role === 'admin' && (u.super || !Object.values(S.users).some(x => x.super)));
const pub = u => u && ({ id: u.id, name: u.name, phone: u.phone, email: u.email, role: u.role, super: !!u.super, defaultPassword: !!u.seedPw, createdAt: u.createdAt });
const segs = p => String(p || '').split('/').filter(Boolean);
const validPath = p => typeof p === 'string' && /^[\w\-.:]+(\/[\w\-.:]+)*$/.test(p);
function canRead(u, p) {
  if (u && u.role === 'admin') return true;
  if (p.startsWith('public/')) return true;
  return !!u && (p === `portal/${u.id}` || p.startsWith(`portal/${u.id}/`));
}
function canWrite(u, p) {
  if (u && u.role === 'admin') return true;
  return !!u && (p === `portal/${u.id}` || p.startsWith(`portal/${u.id}/`));
}
function guardPortal(u, p, next) {
  if (!u || u.role === 'admin' || p !== `portal/${u.id}` || !next || !Array.isArray(next.bookings)) return next;
  const prev = new Map(((S.db[p] && S.db[p].bookings) || []).map(b => [b.id, b]));
  next.bookings = next.bookings.map(b => {
    const o = prev.get(b.id);
    if (!o) { const { apptId, reason, ...rest } = b; return { ...rest, status: 'pending' }; }
    return { ...b, status: b.status === 'cancelled' && o.status !== 'cancelled' ? 'cancelled' : o.status, apptId: o.apptId, reason: o.reason };
  });
  return next;
}
const findUser = login => { const e = normEmail(login), d = digits(login); return Object.values(S.users).find(u => (e && u.email === e) || (d.length >= 8 && digits(u.phone).endsWith(d.slice(-8)))); };

/* ---------- api ---------- */
const json = (code, body) => new Response(JSON.stringify(body), { status: code, headers: { 'content-type': 'application/json; charset=utf-8' } });
const fail = (code, error, message) => json(code, { error, message });
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));

function assistantCtx(u) {
  const role = u ? u.role : 'visitor';
  const ctx = { role, name: u && u.name.split(' ')[0], site: S.db['public/site'] || {} };
  if (role === 'client') ctx.portal = S.db[`portal/${u.id}`];
  if (role === 'admin') {
    const day = window.SanadAssistant.today();
    const keys = Object.keys(S.db);
    const appts = keys.filter(k => k.startsWith('ops/main/appointments/')).map(k => S.db[k]);
    const portals = keys.filter(k => /^portal\/[^/]+$/.test(k)).map(k => S.db[k]);
    ctx.admin = {
      today: appts.filter(a => a.date === day && a.status !== 'cancelled').sort((x, y) => String(x.time).localeCompare(String(y.time))).map(a => ({ time: a.time, title: a.title, client: a.clientName })),
      pending: portals.reduce((n, p) => n + ((p.bookings || []).filter(x => x.status === 'pending').length), 0),
      clients: Object.values(S.users).filter(x => x.role === 'client').length
    };
  }
  return ctx;
}

async function handle(method, path, q, b) {
  await ready;
  S = load() || S;
  const u = me(), role = u ? u.role : 'visitor';
  if (path === 'me') return json(200, {
    version: VERSION, user: pub(u), role, needsSetup: false, local: true, registration: S.cfg.registration,
    ai: { ready: true, claude: false, mode: 'local', visitorChat: S.cfg.visitorChat },
    demoAccounts: [
      { label: 'دخول كعميل', login: DEFAULTS.client.email, password: DEFAULTS.client.password },
      { label: 'دخول كمدير شامل', login: DEFAULTS.admin.email, password: DEFAULTS.admin.password }
    ]
  });
  if (path === 'login' && method === 'POST') {
    const x = findUser(b.login);
    if (!x || !(await checkPw(x, b.password || ''))) return fail(401, 'bad_login', 'بيانات الدخول غير صحيحة.');
    ls.set(SID, x.id); return json(200, { ok: true, user: pub(x) });
  }
  if (path === 'register' && method === 'POST') {
    if (!S.cfg.registration) return fail(403, 'closed', 'التسجيل مغلق حالياً. تواصل مع النشاط.');
    const name = normName(b.name), phone = normPhone(b.phone), email = normEmail(b.email);
    if (!name || digits(phone).length < 8) return fail(400, 'invalid', 'الاسم ورقم الجوال مطلوبان.');
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return fail(400, 'invalid', 'صيغة البريد غير صحيحة.');
    if (String(b.password || '').length < 8) return fail(400, 'weak', 'كلمة المرور 8 أحرف على الأقل.');
    if (findUser(phone) || (email && findUser(email))) return fail(409, 'exists', 'يوجد حساب بهذا الجوال أو البريد. سجّل الدخول.');
    const id = 'c-' + rnd(6), at = new Date().toISOString();
    S.users[id] = { id, name, phone, email, role: 'client', ...(await hashPw(b.password)), createdAt: at };
    S.db[`portal/${id}`] = { profile: { name, phone, email }, bookings: [], updatedAt: at };
    save(); emit(`portal/${id}`); ls.set(SID, id);
    return json(200, { ok: true, user: pub(S.users[id]) });
  }
  if (path === 'logout') { ls.del(SID); return json(200, { ok: true }); }
  if (path === 'password' && method === 'POST') {
    if (!u) return fail(401, 'auth');
    if (!(await checkPw(u, b.current || ''))) return fail(403, 'bad_login', 'كلمة المرور الحالية غير صحيحة.');
    if (String(b.password || '').length < 8) return fail(400, 'weak', 'كلمة المرور 8 أحرف على الأقل.');
    Object.assign(u, await hashPw(b.password)); delete u.seedPw; save(); return json(200, { ok: true });
  }
  if (path === 'db/doc' || path === 'db/col') {
    const dp = q.get('path');
    if (!validPath(dp)) return fail(400, 'invalid_argument', 'مسار غير صالح');
    const n = segs(dp).length;
    if (path === 'db/col') {
      const docs = Object.keys(S.db).filter(k => k.startsWith(dp + '/') && segs(k).length === n + 1 && canRead(u, k)).sort().map(k => ({ id: segs(k).at(-1), data: clone(S.db[k]) }));
      return json(200, { docs });
    }
    if (n % 2 !== 0) return fail(400, 'invalid_argument');
    if (method === 'GET') return json(200, canRead(u, dp) ? { exists: dp in S.db, data: clone(S.db[dp]) ?? null } : { exists: false, data: null });
    if (!canWrite(u, dp)) return fail(403, 'invalid_argument', 'لا تملك صلاحية تنفيذ هذا الإجراء.');
    if (method === 'DELETE') { delete S.db[dp]; save(); emit(dp); return json(200, { ok: true }); }
    if (!b || typeof b.data !== 'object' || Array.isArray(b.data)) return fail(400, 'invalid_argument');
    let next;
    if (method === 'PUT') next = b.data;
    else { if (!(dp in S.db)) return fail(404, 'invalid_argument', 'المستند غير موجود'); next = { ...S.db[dp], ...b.data }; }
    next = guardPortal(u, dp, clone(next));
    if (JSON.stringify(next).length > 256 * 1024) return fail(413, 'quota_exceeded');
    S.db[dp] = next;
    try { save(); } catch { return fail(413, 'quota_exceeded', 'امتلأت مساحة التخزين في هذا المتصفح.'); }
    emit(dp); return json(200, { ok: true });
  }
  if (path === 'ai' && method === 'POST') {
    if (role === 'visitor' && !S.cfg.visitorChat) return fail(403, 'sampling_disabled');
    const A = window.SanadAssistant;
    return json(200, A.asMessage(A.reply(Array.isArray(b.messages) ? b.messages : [], assistantCtx(u))));
  }
  if (path.startsWith('admin/')) {
    if (!u || u.role !== 'admin') return fail(403, 'invalid_argument', 'هذه الصفحة للمدير فقط.');
    const a = path.slice(6);
    if (a === 'settings' && method === 'GET') return json(200, {
      local: true, super: isSuper(u), aiMode: 'local', model: 'local', visitorChat: S.cfg.visitorChat, registration: S.cfg.registration,
      limits: { visitor: 0, client: 0, admin: 0 }, apiKey: '', version: VERSION, dataDir: 'متصفح هذا الجهاز', urls: [location.href.replace(/admin(\.html)?([?#].*)?$/, '')],
      node: '—', platform: navigator.userAgent.includes('Mobile') ? 'جوال' : 'كمبيوتر'
    });
    if (a === 'settings' && method === 'POST') {
      if (typeof b.visitorChat === 'boolean') S.cfg.visitorChat = b.visitorChat;
      if (typeof b.registration === 'boolean') S.cfg.registration = b.registration;
      save(); return json(200, { ok: true });
    }
    if (a === 'test-ai') return json(200, { ok: true, reply: 'المساعد المدمج جاهز' });
    if (a === 'users' && method === 'GET') return json(200, { users: Object.values(S.users).map(pub).sort((x, y) => String(y.createdAt).localeCompare(String(x.createdAt))) });
    if (a === 'users' && method === 'POST') {
      const name = normName(b.name), email = normEmail(b.email), phone = normPhone(b.phone), r = b.role === 'admin' ? 'admin' : 'client';
      if (r === 'admin' && !isSuper(u)) return fail(403, 'forbidden', 'إضافة المديرين للمدير الشامل فقط.');
      if (!name || (!email && digits(phone).length < 8)) return fail(400, 'invalid', 'الاسم مع البريد أو الجوال مطلوب.');
      if (String(b.password || '').length < 8) return fail(400, 'weak', 'كلمة المرور 8 أحرف على الأقل.');
      if ((email && findUser(email)) || (phone && findUser(phone))) return fail(409, 'exists', 'يوجد حساب بهذه البيانات.');
      const id = (r === 'admin' ? 'u-' : 'c-') + rnd(6);
      S.users[id] = { id, name, email, phone, role: r, ...(await hashPw(b.password)), createdAt: new Date().toISOString() };
      if (r === 'client' && !S.db[`portal/${id}`]) S.db[`portal/${id}`] = { profile: { name, phone, email }, bookings: [], updatedAt: new Date().toISOString() };
      save(); return json(200, { ok: true, user: pub(S.users[id]) });
    }
    if (a.startsWith('users/') && method === 'DELETE') {
      const id = decodeURIComponent(a.slice(6)), x = S.users[id];
      if (!x) return fail(404, 'not_found');
      if (id === u.id) return fail(400, 'self', 'لا يمكنك حذف حسابك الحالي.');
      if (x.super) return fail(403, 'forbidden', 'لا يمكن حذف حساب المدير الشامل.');
      if (x.role === 'admin' && !isSuper(u)) return fail(403, 'forbidden', 'حذف المديرين للمدير الشامل فقط.');
      delete S.users[id]; save(); return json(200, { ok: true });
    }
    if (a === 'backup') return json(200, { app: 'sanad', version: VERSION, at: new Date().toISOString(), config: S.cfg, users: S.users, db: S.db });
    if (a === 'restore' && method === 'POST') {
      if (!isSuper(u)) return fail(403, 'forbidden', 'استعادة النسخ للمدير الشامل فقط.');
      if (!b || b.app !== 'sanad' || typeof b.db !== 'object' || typeof b.users !== 'object') return fail(400, 'invalid', 'ملف النسخة غير صالح.');
      if (!Object.values(b.users).some(x => x.role === 'admin')) return fail(400, 'invalid', 'النسخة لا تحتوي حساب مدير.');
      S.db = b.db; S.users = b.users; if (b.config) Object.assign(S.cfg, { visitorChat: b.config.visitorChat !== false, registration: b.config.registration !== false });
      save(); Object.keys(S.db).forEach(emit);
      return json(200, { ok: true, docs: Object.keys(S.db).length, users: Object.keys(S.users).length });
    }
  }
  return fail(404, 'not_found');
}

const realFetch = window.fetch.bind(window);
window.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url, location.href);
  const base = new URL('./', document.baseURI).pathname;
  if (url.origin !== location.origin || !url.pathname.startsWith(base + 'api/')) return realFetch(input, init);
  let b = {};
  try { b = init.body ? JSON.parse(init.body) : {}; } catch { return fail(400, 'bad_json'); }
  return handle((init.method || 'GET').toUpperCase(), url.pathname.slice(base.length + 4), url.searchParams, b);
};
window.SanadLocal = { subscribe: f => { subs.add(f); return () => subs.delete(f); }, ready };
})();
