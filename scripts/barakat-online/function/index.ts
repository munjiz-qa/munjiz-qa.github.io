// خادم بركات (Supabase Edge Function: barakat-api)
// كل عملية مالية تُنفَّذ هنا بقواعد الموقع نفسها (engine.js المولَّد من barakat/index.html)،
// بصلاحية المستخدم المسجَّل فعلاً، ثم تُحفظ في الجداول ذرّياً عبر barakat_commit.
import { E } from './engine.js';

const URL_ = Deno.env.get('SUPABASE_URL')!;
const SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const ORIGINS = ['https://munjiz-qa.github.io'];

type Row = Record<string, any>;
class Conflict extends Error {}
class UserErr extends Error {}

// ---------- REST ----------
const H = (k = SRK, extra: Row = {}) => ({ apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json', ...extra });
async function rest(path: string, init: RequestInit = {}) {
  const r = await fetch(URL_ + path, { ...init, headers: { ...H(), ...(init.headers || {}) } });
  const t = await r.text();
  let j: any = null; try { j = t ? JSON.parse(t) : null } catch { j = t }
  if (!r.ok) { const e: any = new Error((j && (j.message || j.msg || j.error_description || j.error)) || ('HTTP ' + r.status)); e.status = r.status; e.body = j; throw e }
  return j;
}
async function selectAll(table: string, order: string, limit = 0) {
  const out: Row[] = []; const page = 1000;
  for (let off = 0; ; off += page) {
    const n = limit ? Math.min(page, limit - off) : page;
    const rows = await rest(`/rest/v1/${table}?select=*&order=${order}&limit=${n}&offset=${off}`);
    out.push(...rows); if (rows.length < n || (limit && out.length >= limit)) break;
  }
  return out;
}
const authAdmin = {
  create: (email: string, password: string) => rest('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email, password, email_confirm: true }) }),
  update: (id: string, attrs: Row) => rest('/auth/v1/admin/users/' + id, { method: 'PUT', body: JSON.stringify(attrs) }),
  remove: (id: string) => rest('/auth/v1/admin/users/' + id, { method: 'DELETE' }),
  async findByEmail(email: string) {
    for (let p = 1; p < 50; p++) {
      const j = await rest(`/auth/v1/admin/users?page=${p}&per_page=200`);
      const l = j.users || []; const u = l.find((x: Row) => (x.email || '').toLowerCase() === email); if (u) return u; if (l.length < 200) return null;
    }
    return null;
  }
};
async function passwordGrant(email: string, password: string) {
  const r = await fetch(URL_ + '/auth/v1/token?grant_type=password', { method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
  if (!r.ok) return null;
  const s = await r.json();
  return { access_token: s.access_token, refresh_token: s.refresh_token, expires_in: s.expires_in, expires_at: s.expires_at };
}
async function userFromToken(tok: string | null) {
  if (!tok || tok === ANON) return null;
  const r = await fetch(URL_ + '/auth/v1/user', { headers: { apikey: ANON, Authorization: 'Bearer ' + tok } });
  if (!r.ok) return null; const u = await r.json(); return u && u.id ? u : null;
}

// ---------- mapping between the app's objects and the tables ----------
type Spec = { key: string, table: string, order: string, m: Record<string, [string, 's' | 'n' | 't' | 'b']> };
const SPECS: Spec[] = [
  { key: 'tx', table: 'transactions', order: 'at.asc,id.asc', m: { id: ['id', 's'], uid: ['user_id', 's'], acc: ['account', 's'], amt: ['amount', 'n'], type: ['type', 's'], note: ['note', 's'], at: ['at', 't'], bal: ['balance_after', 'n'] } },
  { key: 'reqs', table: 'finance_requests', order: 'created_at.asc,id.asc', m: { id: ['id', 's'], uid: ['user_id', 's'], product: ['product', 's'], status: ['status', 's'], amount: ['amount', 'n'], term: ['term', 'n'], created: ['created_at', 't'] } },
  { key: 'cash', table: 'cash_requests', order: 'at.asc,id.asc', m: { id: ['id', 's'], uid: ['user_id', 's'], kind: ['kind', 's'], amt: ['amount', 'n'], method: ['method', 's'], ref: ['ref', 's'], status: ['status', 's'], at: ['at', 't'] } },
  { key: 'dist', table: 'profit_distributions', order: 'at.asc,id.asc', m: { id: ['id', 's'], at: ['at', 't'], period: ['period', 's'], gross: ['gross', 'n'], mud: ['mudarib_share', 'n'], net: ['net', 'n'], pool: ['pool', 'n'], by: ['approved_by', 's'] } },
  { key: 'policies', table: 'takaful_policies', order: 'start_at.asc,id.asc', m: { id: ['id', 's'], uid: ['user_id', 's'], plan: ['plan', 's'], status: ['status', 's'], start: ['start_at', 't'], paidThrough: ['paid_through', 't'] } },
  { key: 'claims', table: 'takaful_claims', order: 'at.asc,id.asc', m: { id: ['id', 's'], uid: ['user_id', 's'], pid: ['policy_id', 's'], amt: ['amount', 'n'], status: ['status', 's'], at: ['at', 't'] } },
  { key: 'msgs', table: 'messages', order: 'at.asc,id.asc', m: { id: ['id', 's'], uid: ['user_id', 's'], name: ['name', 's'], email: ['email', 's'], phone: ['phone', 's'], subject: ['subject', 's'], body: ['body', 's'], status: ['status', 's'], at: ['at', 't'] } },
  { key: 'fundOut', table: 'fund_disbursements', order: 'at.asc,id.asc', m: { id: ['id', 's'], at: ['at', 't'], fund: ['fund', 's'], to: ['recipient', 's'], note: ['note', 's'], amt: ['amount', 'n'] } },
  { key: 'notes', table: 'notifications', order: 'at.asc,id.asc', m: { id: ['id', 's'], to: ['user_id', 's'], text: ['text', 's'], link: ['link', 's'], at: ['at', 't'], seen: ['seen', 'b'] } },
];
const PROFILE: Spec['m'] = { id: ['id', 's'], acct: ['acct', 's'], name: ['name', 's'], email: ['email', 's'], phone: ['phone', 's'], nid: ['nid', 's'], role: ['role', 's'], status: ['status', 's'], created: ['created_at', 't'] };
const fromCol = (v: any, t: string) => v == null ? null : t === 'n' ? Number(v) : t === 't' ? new Date(v).toISOString() : t === 'b' ? !!v : v;
const toCol = (v: any, t: string) => v === undefined || v === null || v === '' && t !== 's' ? null : t === 'n' ? Number(v) : t === 'b' ? !!v : t === 't' ? new Date(v).toISOString() : String(v);
function toObj(row: Row, m: Spec['m']) { const o: Row = { ...(row.data || {}) }; for (const k in m) o[k] = fromCol(row[m[k][0]], m[k][1]); return o }
function toRow(o: Row, m: Spec['m'], skip: string[] = []) {
  const row: Row = {}; const data: Row = {};
  for (const k in m) row[m[k][0]] = toCol(o[k], m[k][1]);
  for (const k in o) if (!(k in m) && !skip.includes(k) && o[k] !== undefined) data[k] = o[k];
  row.data = data; return row;
}
const NID = (p: string) => p + crypto.randomUUID().replace(/-/g, '').slice(0, 16);

// ---------- load / commit ----------
type Loaded = { version: number, seeded: boolean, snap: Map<string, Map<string, string>>, state: string };
async function load(): Promise<Loaded> {
  const [st] = await rest('/rest/v1/system_state?select=*&id=eq.1');
  const [profiles, accounts, log, ...cols] = await Promise.all([
    selectAll('profiles', 'created_at.asc,id.asc'), selectAll('accounts', 'id.asc'), selectAll('audit_log', 'at.desc', 300),
    ...SPECS.map(s => selectAll(s.table, s.order))]);
  const bal: Record<string, Row> = {};
  for (const a of accounts) (bal[a.user_id] ||= { current: 0, invest: 0 })[a.kind] = Number(a.balance);
  const db: Row = { v: 1, seq: Number(st.seq), funds: st.funds || {}, settings: st.settings || {}, lastBackup: st.last_backup ? new Date(st.last_backup).toISOString() : undefined };
  db.users = profiles.map((p: Row) => ({ ...toObj(p, PROFILE), bal: bal[p.id] || { current: 0, invest: 0 } }));
  SPECS.forEach((s, i) => { db[s.key] = cols[i].map((r: Row) => toObj(r, s.m)) });
  db.log = log.map((l: Row) => ({ id: l.id, at: new Date(l.at).toISOString(), what: l.what, who: l.who }));
  if (!st.seeded) { db.funds = {}; db.settings = {} }
  E.db = db; if (st.seeded) E.normDb();
  const snap = new Map<string, Map<string, string>>();
  for (const k of ['users', ...SPECS.map(s => s.key)]) snap.set(k, new Map((db[k] as Row[]).map(o => [o.id, JSON.stringify(o)])));
  return { version: Number(st.version), seeded: !!st.seeded, snap, state: stateJson(db) };
}
const stateJson = (db: Row) => JSON.stringify({ seq: db.seq, funds: db.funds, settings: db.settings, lastBackup: db.lastBackup || null });
async function commit(L: Loaded, extraState: Row = {}) {
  const db = E.db; const up: Row = {}; const del: Row = {}; let n = 0;
  const diff = (key: string, rowsOf: (o: Row) => [string, Row][], table: string) => {
    const before = L.snap.get(key)!; const seen = new Set<string>();
    for (const o of db[key] as Row[]) {
      if (!o.id) o.id = NID(key === 'fundOut' ? 'o' : 'x');
      seen.add(o.id);
      if (before.get(o.id) !== JSON.stringify(o)) for (const [t, r] of rowsOf(o)) { (up[t] ||= []).push(r); n++ }
    }
    for (const id of before.keys()) if (!seen.has(id)) { (del[table] ||= []).push(id); n++ }
  };
  diff('users', o => [['profiles', toRow(o, PROFILE, ['bal', 'salt', 'pass'])],
    ['accounts', { id: o.id + ':current', user_id: o.id, kind: 'current', balance: E.r2(o.bal.current), data: {} }],
    ['accounts', { id: o.id + ':invest', user_id: o.id, kind: 'invest', balance: E.r2(o.bal.invest), data: {} }]], 'profiles');
  for (const s of SPECS) diff(s.key, o => [[s.table, toRow(o, s.m)]], s.table);
  for (const l of db.log as Row[]) if (!l.id) { l.id = crypto.randomUUID(); (up.audit_log ||= []).push({ id: l.id, at: l.at, what: String(l.what), who: l.who == null ? null : String(l.who), data: {} }); n++ }
  const st = stateJson(db); const changedState = st !== L.state || Object.keys(extraState).length;
  if (!n && !changedState) return false;
  try {
    await rest('/rest/v1/rpc/barakat_commit', { method: 'POST', body: JSON.stringify({ p_version: L.version, p: { up, del, state: { ...JSON.parse(st), ...extraState } } }) });
  } catch (e: any) {
    if (String(e.message).includes('barakat_conflict') || e.body?.code === '40001') throw new Conflict();
    throw e;
  }
  return true;
}

// ---------- views (what each role may see) ----------
function view(u: Row | null) {
  const db = E.db; const base = { v: 1, seq: db.seq, funds: db.funds, settings: db.settings };
  const empty = { users: [], tx: [], reqs: [], cash: [], policies: [], claims: [], msgs: [], notes: [], fundOut: [], log: [] };
  if (u && u.role === 'admin') return { db, me: u.id };
  if (u) {
    const mine = (k: string, f = 'uid') => (db[k] as Row[]).filter(x => x[f] === u.id);
    const pool = E.r2((db.users as Row[]).filter(x => x.role === 'customer').reduce((a, x) => a + x.bal.invest, 0));
    return { db: { ...base, ...empty, users: [u], tx: mine('tx'), reqs: mine('reqs'), cash: mine('cash'), policies: mine('policies'), claims: mine('claims'), msgs: mine('msgs'), notes: mine('notes', 'to'), dist: db.dist, poolTotal: pool }, me: u.id };
  }
  return { db: { ...base, ...empty, dist: [] }, me: null };
}

// ---------- seeding (first run and «reset demo data») ----------
const DEMO: Record<string, string> = { 'admin@barakat.qa': 'Barakat@Admin2026', 'client@barakat.qa': 'Client@2026', 'maryam@barakat.qa': 'Client@2026', 'yousef@barakat.qa': 'Client@2026' };
async function ensureAuth(email: string, pw: string) {
  try { const u = await authAdmin.create(email, pw); return u.id || u.user?.id }
  catch (e: any) { const u = await authAdmin.findByEmail(email); if (u) return u.id; throw e }
}
async function reseed() {
  const prev: Row[] = (E.db.users || []).slice(); const prevSeq = E.db.seq || 1000;
  E.setMe(null); await E.seed();
  let s = JSON.stringify(E.db);
  for (const u of E.db.users) s = s.split(u.id).join(await ensureAuth(u.email, DEMO[u.email]));
  const db = JSON.parse(s); db.users.forEach((u: Row) => { delete u.salt; delete u.pass });
  for (const p of prev) if (!db.users.some((x: Row) => x.id === p.id || x.email === p.email)) db.users.push({ ...p, bal: { current: 0, invest: 0 } });
  db.seq = Math.max(db.seq, prevSeq + 10);
  db.log = (E.db.log || []).filter((l: Row) => !l.id).concat([]);
  E.db = db; E.normDb();
}

// ---------- permissions ----------
const CUST_F = new Set(['move', 'transfer', 'cash', 'fin', 'settle', 'zakatpay', 'give', 'claim', 'contact']);
const ADMIN_F = new Set(['decide', 'dist', 'fundout', 'settings', 'reply', 'cashreject', 'claimreject']);
const CUST_A = new Set(['doTransfer', 'accept', 'decline', 'pay', 'tkjoin', 'tkpay', 'tkcancel', 'notesClear']);
const ADMIN_A = new Set(['cashok', 'cashno', 'ustat', 'doDist', 'claimok', 'claimno', 'msgclose']);
const clean = (d: any) => { const o: Row = {}; if (d && typeof d === 'object') for (const k in d) { const v = d[k]; o[k] = typeof v === 'boolean' ? v : String(v ?? '').slice(0, 2000) } return o };
const need = (c: any, m: string) => { if (!c) throw new UserErr(m) };

type Ctx = { u: Row | null, fx: any[], out: Row, side: (() => Promise<void>)[] };
async function run(op: string, name: string, data: any, btn: any, c: Ctx) {
  const db = E.db; const u = c.u;
  const admin = () => need(u && u.role === 'admin', 'هذه العملية للإدارة فقط.');
  const cust = () => { need(u, 'سجّل الدخول أولاً.'); need(u!.role === 'customer', 'هذه العملية لحسابات العملاء.') };
  if (op === 'form') {
    const f = clean(data);
    if (name === 'contact') { if (u && u.role !== 'customer') E.setMe(null) }
    else if (CUST_F.has(name)) cust(); else if (ADMIN_F.has(name)) admin(); else need(false, 'عملية غير معروفة.');
    return await E.FORMS[name](f, btn === 'reject' ? 'reject' : btn ? String(btn) : null);
  }
  if (op === 'act') {
    if (CUST_A.has(name)) cust(); else if (ADMIN_A.has(name)) admin(); else need(false, 'عملية غير معروفة.');
    return await E.ACTS[name]({ dataset: clean(data) });
  }
  if (op !== 'sys') need(false, 'عملية غير معروفة.');
  const d = data && typeof data === 'object' ? data : {};
  switch (name) {
    case 'state': return;
    case 'login': {
      const id = String(d.id || '').trim().toLowerCase(); const pd = E.phoneDigits(id);
      const p = (db.users as Row[]).find(x => x.email.toLowerCase() === id || (pd.length >= 8 && x.phone === pd) || x.acct.toLowerCase() === id);
      const s = p && await passwordGrant(p.email, String(d.pw || ''));
      need(s, 'بيانات الدخول غير صحيحة.');
      c.u = p!; c.out.session = s; E.setMe(p!.id);
      E.logA('تسجيل دخول', p!.name);
      c.fx.push(['toast', `مرحباً ${p!.name.split(' ')[0]}`], ['go', p!.role === 'admin' ? '#/a/home' : '#/c/home']);
      return;
    }
    case 'logout': if (u) E.logA('تسجيل خروج', u.name); return;
    case 'seen': {
      cust();
      (db.notes as Row[]).forEach(n => { if (n.to === u!.id && !n.seen) n.seen = true });
      (db.msgs as Row[]).forEach(m => { if (m.uid === u!.id && m.status === 'replied' && !m.seen) m.seen = true });
      return;
    }
    case 'pw': {
      need(u, 'سجّل الدخول أولاً.');
      need(await passwordGrant(u!.email, String(d.old || '')), 'كلمة المرور الحالية غير صحيحة.');
      const pw = String(d.pw || ''); need(pw.length >= 8 && pw.length <= 72, 'كلمة المرور 8 أحرف على الأقل.');
      await authAdmin.update(u!.id, { password: pw });
      E.logA('تغيير كلمة المرور'); c.fx.push(['toast', 'حُفظت كلمة المرور الجديدة'], ['render']); return;
    }
    case 'resetpw': {
      admin(); const t = (db.users as Row[]).find(x => x.id === String(d.id) && x.role === 'customer'); need(t, 'العميل غير موجود.');
      const p = 'BR' + String(crypto.getRandomValues(new Uint32Array(1))[0]).padStart(6, '0').slice(-6) + '@';
      await authAdmin.update(t!.id, { password: p });
      E.logA(`إعادة تعيين كلمة مرور ${t!.name}`);
      c.fx.push(['dialog', `<h3>كلمة المرور المؤقتة</h3><p>أبلغ العميل بها عبر قناة موثوقة:</p><p style="font-size:22px;font-weight:700;direction:ltr;text-align:center;margin:12px 0">${p}</p><button class="btn" data-act="close">تم</button>`]);
      return;
    }
    case 'markBackup': admin(); db.lastBackup = E.now(); E.logA('حفظ نسخة احتياطية'); return;
    case 'reset': admin(); await reseed(); E.setMe(u!.id); E.logA('إعادة ضبط بيانات التجربة', u!.name); c.fx.push(['toast', 'أُعيدت بيانات التجربة'], ['go', '#/a/home']); return;
    case 'restore': {
      admin(); const x = d;
      need(x && x.v === 1 && Array.isArray(x.users) && x.users.some((v: Row) => v.role === 'admin'), 'الملف المختار ليس نسخة احتياطية صالحة لبركات.');
      const cur = new Map((db.users as Row[]).map(v => [v.id, v]));
      const users = (x.users as Row[]).filter(v => cur.has(v.id)).map(v => { const k = { ...v, email: cur.get(v.id)!.email }; delete k.salt; delete k.pass; return k });
      need(users.length, 'هذه النسخة من الوضع المحلي وحساباتها غير موجودة في قاعدة البيانات، فلا يمكن استعادتها هنا.');
      for (const v of db.users as Row[]) if (!users.some(k => k.id === v.id)) users.push(v);
      const ids = new Set(users.map(v => v.id));
      const own = (l: any, f = 'uid') => (Array.isArray(l) ? l : []).filter((o: Row) => o && o[f] ? ids.has(o[f]) : f !== 'to');
      const nd: Row = { v: 1, seq: Math.max(+x.seq || 0, db.seq), users, funds: x.funds || db.funds, settings: x.settings || db.settings, lastBackup: x.lastBackup || db.lastBackup,
        tx: own(x.tx), reqs: own(x.reqs), cash: own(x.cash), policies: own(x.policies), claims: own(x.claims), msgs: (x.msgs || []).map((m: Row) => m.uid && !ids.has(m.uid) ? { ...m, uid: null } : m),
        notes: own(x.notes, 'to'), dist: x.dist || [], fundOut: x.fundOut || [], log: db.log };
      E.db = nd; E.normDb(); E.setMe(u!.id); E.logA('استعادة البيانات من نسخة احتياطية', u!.name);
      c.fx.push(['close'], ['toast', 'استُعيدت البيانات بنجاح'], ['go', '#/a/settings']); return;
    }
  }
  need(false, 'عملية غير معروفة.');
}

async function register(d: Row, c: Ctx) {
  const L = await load(); if (!L.seeded) { await bootstrap(L); }
  const f = clean(d); const db = E.db;
  const email = f.email.trim().toLowerCase(), phone = E.phoneDigits(f.phone), name = E.normName(f.name), nid = String(f.nid || '').trim();
  need(name.split(' ').length >= 2, 'اكتب الاسم الكامل (اسمان على الأقل).');
  need(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email), 'البريد الإلكتروني غير صحيح.');
  need(phone.length >= 10 && phone.length <= 13, 'رقم الجوال غير صحيح.');
  need(f.pw && f.pw.length >= 8 && f.pw.length <= 72, 'كلمة المرور 8 أحرف على الأقل.');
  need(!(db.users as Row[]).some(u => u.email === email), 'هذا البريد مسجّل من قبل.');
  need(!(db.users as Row[]).some(u => u.phone === phone), 'رقم الجوال مسجّل من قبل.');
  need(!nid || !(db.users as Row[]).some(u => u.nid && u.nid === nid), 'رقم الهوية مسجّل من قبل.');
  let au: Row;
  try { au = await authAdmin.create(email, f.pw) } catch (e: any) { throw new UserErr(/regist|exist/i.test(e.message) ? 'هذا البريد مسجّل من قبل.' : 'تعذّر إنشاء الحساب: ' + e.message) }
  const id = au.id || au.user?.id;
  for (let i = 0; i < 4; i++) {
    const L2 = i ? await load() : L;
    const u = { id, acct: 'BR-' + (++E.db.seq) + String(Math.floor(Math.random() * 9000 + 1000)), name, email, phone, nid, role: 'customer', status: 'pending', created: E.now(), bal: { current: 0, invest: 0 } };
    E.db.users.push(u); E.setMe(id); E.logA(`فتح حساب جديد ${u.acct}`, u.name);
    try { await commit(L2); c.u = u; c.out.session = await passwordGrant(email, f.pw); c.fx.push(['toast', 'تم فتح حسابك. ستُفعَّل العمليات بعد التحقق.'], ['go', '#/c/home']); return }
    catch (e) { if (!(e instanceof Conflict)) { await authAdmin.remove(id).catch(() => { }); throw e } }
  }
  await authAdmin.remove(id).catch(() => { }); throw new UserErr('النظام مشغول الآن، أعد المحاولة بعد لحظات.');
}
async function bootstrap(L: Loaded) {
  await reseed(); E.logA('تهيئة قاعدة بيانات بركات', 'النظام');
  try { await commit(L, { seeded: true }) } catch (e) { if (!(e instanceof Conflict)) throw e }
  Object.assign(L, await load());
}

// ---------- request handling (one operation at a time per instance) ----------
let chain: Promise<any> = Promise.resolve();
const serial = <T>(f: () => Promise<T>) => { const p = chain.then(f, f); chain = p.catch(() => { }); return p };

async function handle(body: Row, tok: string | null) {
  const au = await userFromToken(tok);
  const { op, name, data, btn } = body || {};
  for (let attempt = 0; attempt < 8; attempt++) {
    const fx: any[] = []; E.hook(fx);
    let L = await load();
    if (!L.seeded) { await bootstrap(L); L = await load() }
    const u = au ? (E.db.users as Row[]).find(x => x.id === au.id) || null : null;
    E.setMe(u ? u.id : null);
    const c: Ctx = { u, fx, out: {}, side: [] };
    try {
      if (op === 'sys' && name === 'register') { await register(data, c); E.hook(fx); const L3 = await load(); const nu = (E.db.users as Row[]).find(x => x.id === c.u?.id) || null; return { status: 200, body: { ok: true, fx, ...c.out, state: view(nu) } } }
      await run(String(op), String(name), data, btn, c);
      await commit(L);
      return { status: 200, body: { ok: true, fx, ...c.out, state: view(c.u) } };
    } catch (e: any) {
      if (e instanceof Conflict) { await new Promise(r => setTimeout(r, 15 + Math.random() * 60 * (attempt + 1))); continue }
      if (e instanceof UserErr || (e instanceof Error && !(e as any).status && /[؀-ۿ]/.test(e.message))) {
        const fresh = await load(); const uu = au ? (E.db.users as Row[]).find(x => x.id === au.id) || null : null;
        return { status: 400, body: { error: e.message, state: view(uu) } };
      }
      console.error(e);
      return { status: 500, body: { error: 'تعذّر حفظ العملية في قاعدة البيانات. أعد المحاولة.' } };
    }
  }
  return { status: 503, body: { error: 'النظام مشغول الآن، أعد المحاولة بعد لحظات.' } };
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin') || '';
  const cors = { 'Access-Control-Allow-Origin': ORIGINS.includes(origin) || /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(origin) ? origin : ORIGINS[0], 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Vary': 'Origin' };
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers: { ...cors, 'Content-Type': 'application/json' } });
  let body: Row; try { body = await req.json() } catch { body = {} }
  const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') || null;
  const r = await serial(() => handle(body, tok));
  return new Response(JSON.stringify(r.body), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' } });
});
