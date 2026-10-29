/* سند | Sanad — طبقة التشغيل المستقلة
   توفّر للتطبيق نفس الواجهات (user, db, sample) لكن عبر خادم سند الخاص بك،
   فيعمل التطبيق نفسه على أي جهاز دون حساب Claude لكل مستخدم. */
(() => {
'use strict';
const err = (code, message) => Object.assign(new Error(message || code), { code });
async function req(method, url, data) {
  let r;
  try {
    r = await fetch(url, { method, credentials: 'same-origin', headers: data ? { 'content-type': 'application/json' } : {}, body: data ? JSON.stringify(data) : undefined });
  } catch { throw err('offline', 'لا يوجد اتصال بخادم سند. تحقق من الشبكة.'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw err(j.error || 'error', j.message);
  return j;
}
const mePromise = req('GET', 'api/me').catch(() => ({ role: 'visitor', user: null, ai: {} }));
window.sanadMe = mePromise;

/* ---------- live updates ---------- */
const listeners = new Set();
let es;
function connect() {
  if (es) return;
  if (window.SanadLocal) { es = true; window.SanadLocal.subscribe(p => listeners.forEach(l => l(p))); return; }
  es = new EventSource('api/events');
  es.onmessage = e => { let p; try { p = JSON.parse(e.data).path; } catch { return; } listeners.forEach(l => l(p)); };
  es.onerror = () => {}; // يعيد المتصفح الاتصال تلقائياً
}
const nap = ms => new Promise(r => setTimeout(r, ms));

/* ---------- db ---------- */
const enc = encodeURIComponent;
function docRef(p) {
  const s = p.split('/');
  if (s.length % 2) throw new TypeError('document path must have an even number of segments: ' + p);
  const snap = j => ({ id: s.at(-1), exists: !!j.exists, data: () => (j.exists ? structuredClone(j.data) : undefined), metadata: {} });
  return {
    id: s.at(-1), path: p,
    async get() { return snap(await req('GET', 'api/db/doc?path=' + enc(p))); },
    async set(v) { await req('PUT', 'api/db/doc?path=' + enc(p), { data: v }); },
    async update(v) { await req('PATCH', 'api/db/doc?path=' + enc(p), { data: v }); },
    async delete() { await req('DELETE', 'api/db/doc?path=' + enc(p)); },
    onSnapshot(next, onErr) {
      connect(); let alive = true;
      const pull = () => this.get().then(x => alive && next(x), e => onErr && onErr(e));
      const l = changed => { if (changed === p) pull(); };
      listeners.add(l); pull();
      return () => { alive = false; listeners.delete(l); };
    },
    collection(c) { return colRef(p + '/' + c); }
  };
}
function colRef(p) {
  const depth = p.split('/').length;
  if (depth % 2 === 0) throw new TypeError('collection path must have an odd number of segments: ' + p);
  const q = {
    path: p,
    doc(id) { return docRef(p + '/' + (id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 8)))); },
    async add(v) { const r = this.doc(); await r.set(v); return r; },
    async get() {
      const j = await req('GET', 'api/db/col?path=' + enc(p));
      const docs = j.docs.map(d => ({ id: d.id, exists: true, data: () => structuredClone(d.data), metadata: {} }));
      return { docs, size: docs.length, empty: !docs.length, docChanges: () => [], metadata: {} };
    },
    onSnapshot(next, onErr) {
      connect(); let alive = true, t;
      const pull = () => this.get().then(x => alive && next(x), e => onErr && onErr(e));
      const l = changed => { if (changed.startsWith(p + '/') && changed.split('/').length === depth + 1) { clearTimeout(t); t = setTimeout(pull, 40); } };
      listeners.add(l); pull();
      return () => { alive = false; listeners.delete(l); };
    },
    where() { return this; }, orderBy() { return this; }, limit() { return this; }
  };
  return q;
}
const db = { doc: docRef, collection: colRef };

/* ---------- user ---------- */
const user = {
  id: async () => ((await mePromise).user || {}).id || null,
  canEdit: async () => (await mePromise).role === 'admin',
  isOwner: async () => (await mePromise).role === 'admin',
  can: async () => (await mePromise).role !== 'visitor',
  me: async () => { const u = (await mePromise).user; return u ? { name: u.name, email: u.email } : {}; }
};

/* ---------- sample (Claude via the Sanad server) ---------- */
function fileToBlock(f) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => { const [head, data] = String(r.result).split(','); resolve({ type: 'image', source: { type: 'base64', media_type: head.slice(5, head.indexOf(';')), data } }); };
    r.onerror = () => reject(err('invalid_argument', 'تعذّرت قراءة الصورة'));
    r.readAsDataURL(f);
  });
}
const asBlocks = c => typeof c === 'string' ? [{ type: 'text', text: c }] : Array.isArray(c) ? c : [c];
function normalise(turns) {
  const list = typeof turns === 'string' ? [{ role: 'user', content: turns }] : turns;
  const out = [];
  for (const t of list) {
    const role = t.role === 'assistant' ? 'assistant' : 'user';
    const last = out.at(-1);
    if (last && last.role === role) last.content = [...asBlocks(last.content), ...asBlocks(t.content)];
    else out.push({ role, content: t.content });
  }
  if (out[0] && out[0].role !== 'user') out.unshift({ role: 'user', content: '.' });
  return out;
}
async function sample(turns, opts = {}) {
  const messages = normalise(turns);
  if (opts.images && opts.images.length) {
    const imgs = await Promise.all([...opts.images].slice(0, 5).map(fileToBlock));
    const last = messages.at(-1); last.content = [...imgs, ...asBlocks(last.content)];
  }
  const tools = (opts.tools || []).map(t => ({ name: t.name, description: t.description || '', input_schema: t.inputSchema || t.input_schema || { type: 'object', properties: {} } }));
  let text = '';
  for (let step = 0; step < 16; step++) {
    if (opts.signal && opts.signal.aborted) throw Object.assign(err('cancelled'), { text });
    const res = await Promise.race([
      req('POST', 'api/ai', { messages, tools, system: opts.system, tier: opts.modelTier, max_tokens: opts.maxTokens }),
      new Promise((_, rej) => opts.signal && opts.signal.addEventListener('abort', () => rej(Object.assign(err('cancelled'), { text })), { once: true }))
    ]);
    const content = res.content || [];
    const said = content.filter(c => c.type === 'text').map(c => c.text).join('');
    if (said) { const delta = (text ? '\n\n' : '') + said; text += delta; opts.onText && opts.onText({ text, delta }); }
    const uses = content.filter(c => c.type === 'tool_use');
    if (res.stop_reason !== 'tool_use' || !uses.length) return { text, truncated: res.stop_reason === 'max_tokens' };
    messages.push({ role: 'assistant', content });
    const results = [];
    for (const u of uses) {
      const t = (opts.tools || []).find(x => x.name === u.name);
      let out, isErr = false;
      try { out = t ? await t.execute(u.input || {}, { signal: opts.signal }) : 'أداة غير معروفة'; }
      catch (e) { out = 'خطأ: ' + (e && e.message || e); isErr = true; }
      results.push({ type: 'tool_result', tool_use_id: u.id, content: typeof out === 'string' ? out : JSON.stringify(out ?? null), ...(isErr ? { is_error: true } : {}) });
    }
    messages.push({ role: 'user', content: results });
  }
  return { text: text + '\n\n(توقف سند بعد عدد كبير من الخطوات.)', truncated: true };
}
sample.json = async (prompt, opts = {}) => {
  const r = await sample([{ role: 'user', content: prompt + '\n\nأعد JSON صالحاً فقط دون أي شرح.' }], opts);
  const m = r.text.replace(/```(json)?/g, '').match(/[{[][\s\S]*[}\]]/);
  try { return JSON.parse(m ? m[0] : r.text); } catch { throw err('invalid_argument', 'لم يُرجع النموذج بيانات مفهومة. أعد المحاولة.'); }
};
sample.limits = async () => ({ maxInputBytes: 400000, tools: { maxCount: 24 }, images: { maxCount: 5, maxBytes: 5e6, mediaTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] } });

window.claude = {
  use: async name => {
    const me = await mePromise;
    if (name === 'user' || name === 'db') return name === 'user' ? user : db;
    if (name === 'sample') return me.role === 'visitor' && !(me.ai && me.ai.visitorChat) ? null : sample;
    return null;
  }
};

/* ---------- account controls (added next to the role badge) ---------- */
const css = document.createElement('style');
css.textContent = `.sn-acct{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.sn-acct a,.sn-acct button{font:inherit;font-size:12.5px;border:1px solid var(--line);background:var(--surface);color:var(--ink);border-radius:99px;padding:3px 11px;text-decoration:none;cursor:pointer;line-height:1.6;white-space:nowrap}
.sn-acct a.pri{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.topbar .sn-acct{flex:none}.topbar .sn-acct .nm{display:none}
.sn-install{position:fixed;inset-inline:12px;bottom:calc(76px + env(safe-area-inset-bottom,0px));z-index:40;background:var(--surface);border:1px solid var(--line);box-shadow:var(--shadow);border-radius:14px;padding:10px 12px;display:flex;gap:10px;align-items:center;font-size:13.5px;max-width:520px;margin-inline:auto}
.sn-install b{font-family:var(--f-display)}.sn-install .sp{flex:1}
.sn-install button{font:inherit;border:0;border-radius:10px;padding:6px 12px;cursor:pointer}
.sn-install .go{background:var(--accent);color:var(--accent-ink)}.sn-install .x{background:var(--sunk)}
@media(min-width:861px){.sn-install{bottom:16px}}`;
document.head.appendChild(css);
function acctHTML(me, compact) {
  const u = me.user;
  if (!u) return `<a class="pri" href="login.html">دخول</a>${me.registration ? `<a href="login.html#register">حساب جديد</a>` : ''}`;
  return `${compact ? '' : `<span class="nm small">${u.name.replace(/[<>&"]/g, '')}</span>`}${u.role === 'admin' ? `<a href="admin.html">لوحة التشغيل</a>` : ''}<button type="button" data-sn="logout">خروج</button>`;
}
const domReady = new Promise(r => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', r, { once: true }) : r());
Promise.all([mePromise, domReady]).then(([me]) => {
  const paint = () => {
    for (const host of document.querySelectorAll('.rail .who, .topbar')) {
      if (host.querySelector('.sn-acct')) continue;
      const d = document.createElement('div'); d.className = 'sn-acct'; d.innerHTML = acctHTML(me, host.classList.contains('topbar'));
      host.appendChild(d);
    }
  };
  new MutationObserver(paint).observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
  paint();
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-sn="logout"]')) { await req('POST', 'api/logout').catch(() => {}); try { localStorage.removeItem('sanad:chat:admin'); localStorage.removeItem('sanad:chat:client'); } catch {} location.href = './'; }
  });
});

/* ---------- installable app (PWA) ---------- */
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
let deferred = null;
const dismissed = () => { try { return localStorage.getItem('sanad:install-dismissed') === '1'; } catch { return false; } };
function offer(html, onGo) {
  if (dismissed() || document.querySelector('.sn-install')) return;
  const d = document.createElement('div'); d.className = 'sn-install'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-label', 'تثبيت التطبيق');
  d.innerHTML = `<div class="sp">${html}</div>${onGo ? '<button class="go" type="button">ثبّت</button>' : ''}<button class="x" type="button" aria-label="إغلاق">لاحقاً</button>`;
  document.body.appendChild(d);
  d.querySelector('.x').onclick = () => { d.remove(); try { localStorage.setItem('sanad:install-dismissed', '1'); } catch {} };
  if (onGo) d.querySelector('.go').onclick = () => { d.remove(); onGo(); };
}
addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferred = e;
  setTimeout(() => offer('<b>ثبّت سند</b> على جهازك ليفتح كتطبيق مستقل بنقرة واحدة.', () => deferred && deferred.prompt()), 1500);
});
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (!standalone && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
  setTimeout(() => offer('<b>ثبّت سند على الآيفون:</b> اضغط زر المشاركة <span aria-hidden="true">⎋</span> ثم «إضافة إلى الشاشة الرئيسية».'), 2500);
}
})();
