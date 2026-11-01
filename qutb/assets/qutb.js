/* قُطب: لوحة المنصات الموحّدة.
   سجل المنصات مشفّر في vault.json بمفتاح بيانات عشوائي (AES-GCM)، ولكل مستخدم خانة تغلّف هذا المفتاح بكلمة مروره (PBKDF2)،
   فلا يرى من لا يملك حساباً أي اسم أو رابط. الأدوار في السجل المشفّر: super = مدير شامل، viewer = مشاهدة فقط.
   كل الأرقام تُقرأ حيّة: GitHub للنشر والتشغيل الآلي، وملفات البيانات المنشورة، وأنظمة العملاء بحساب الإدارة. */
(() => {
'use strict';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const store = st => ({get(k) { try { return st().getItem(k); } catch (e) { return null; } }, set(k, v) { try { st().setItem(k, v); } catch (e) {} }, del(k) { try { st().removeItem(k); } catch (e) {} }});
const LS = store(() => localStorage), SS = store(() => sessionStorage);

const VAULT_REPO = 'munjiz-qa/munjiz-qa.github.io', VAULT_PATH = 'qutb/vault.json', ITER = 310000;
const IDLE_MIN = 30, TZ = 'Asia/Qatar', CLOSED = ['منجزة', 'ملغاة'];
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

let ME = null, DK = null; // المستخدم الحالي ومفتاح البيانات (يبقيان في ذاكرة الجلسة فقط)
let REG = null, RESULTS = {}, BK = {}, rate = null, busy = false, RATE_HIT = false;

// ---------- التاريخ بصيغة موحّدة: 25 أكتوبر 2026، 1:30 م (بتوقيت الدوحة) ----------
const parts = d => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true})
  .formatToParts(d).map(p => [p.type, p.value]));
function fmtDate(iso, withTime = true) {
  const d = new Date(iso); if (isNaN(d)) return '—';
  const p = parts(d), day = `${+p.day} ${MONTHS[p.month - 1]} ${p.year}`;
  return withTime ? `${day}، ${+p.hour}:${p.minute} ${/p/i.test(p.dayPeriod) ? 'م' : 'ص'}` : day;
}
const dohaDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone: TZ}).format(d);
const plural = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : n >= 3 && n <= 10 ? `${n} ${few}` : `${n} ${many}`;
function ago(iso) {
  const s = (Date.now() - new Date(iso)) / 1000; if (isNaN(s)) return '—';
  if (s < 60) return 'الآن';
  const m = Math.round(s / 60); if (m < 60) return 'قبل ' + plural(m, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة');
  const h = Math.round(m / 60); if (h < 24) return 'قبل ' + plural(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة');
  const dd = Math.round(h / 24); return 'قبل ' + plural(dd, 'يوم', 'يومين', 'أيام', 'يوماً');
}
const hoursSince = iso => (Date.now() - new Date(iso)) / 3600000;
const num = n => Number(n || 0).toLocaleString('en-US');

// ---------- التشفير ----------
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const b64e = u => { let s = ''; u.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
async function derive(pass, salt, iter) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter}, base, {name: 'AES-GCM', length: 256}, false, ['encrypt', 'decrypt']);
}
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const slotId = u => sha('qutb-user:' + String(u || 'owner').trim().toLowerCase());
const dkKey = raw => crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
// يفتح السجل بحساب المستخدم ويعيد {reg, dk} أو يرمي خطأ
async function unseal(v, pass, user) {
  if (v.v !== 2) { // الصيغة الأولى: كلمة مرور واحدة دون اسم مستخدم
    const k = await derive(pass, b64d(v.salt), v.iter);
    return {reg: JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: b64d(v.iv)}, k, b64d(v.ct)))), dk: null};
  }
  const id = await slotId(user), slot = v.slots.find(x => x.id === id);
  if (!slot) throw new Error('auth');
  const kek = await derive(pass, b64d(slot.salt), slot.iter);
  const dk = new Uint8Array(await crypto.subtle.decrypt({name: 'AES-GCM', iv: b64d(slot.iv)}, kek, b64d(slot.wk)));
  const reg = JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name: 'AES-GCM', iv: b64d(v.iv)}, await dkKey(dk), b64d(v.ct))));
  return {reg, dk};
}
async function makeSlot(user, pass, dk) {
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const wk = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await derive(pass, salt, ITER), dk);
  return {id: await slotId(user), iter: ITER, salt: b64e(salt), iv: b64e(iv), wk: b64e(new Uint8Array(wk))};
}
async function seal(reg, dk, slots) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({name: 'AES-GCM', iv}, await dkKey(dk), new TextEncoder().encode(JSON.stringify(reg)));
  return {v: 2, kdf: 'PBKDF2-SHA256', iter: ITER, cipher: 'AES-GCM', slots, iv: b64e(iv), ct: b64e(new Uint8Array(ct))};
}
const isSuper = () => !ME || ME.role === 'super';
const loadVault = async () => { const r = await fetch('vault.json?t=' + Date.now(), {cache: 'no-store'}); if (!r.ok) throw new Error('vault'); return r.json(); };

// ---------- البوابة والجلسة ----------
function failState() { try { return JSON.parse(LS.get('qutb-fail') || '{"n":0,"t":0}'); } catch (e) { return {n: 0, t: 0}; } }
function waitLeft() { const f = failState(); if (f.n < 5) return 0; return Math.max(0, f.t + Math.min(900, 30 * 2 ** (f.n - 5)) * 1000 - Date.now()); }

$('#gateForm').addEventListener('submit', async e => {
  e.preventDefault();
  const msg = $('#gateMsg'), btn = $('#gateBtn'), pass = $('#gatePass').value, user = ($('#gateUser').value.trim() || 'owner').toLowerCase();
  const w = waitLeft(); if (w) { msg.className = 'msg err'; msg.textContent = `محاولات خاطئة متكررة. أعد المحاولة بعد ${Math.ceil(w / 1000)} ثانية.`; return; }
  btn.disabled = true; msg.className = 'msg'; msg.textContent = 'جارٍ التحقق…';
  try {
    const {reg, dk} = await unseal(await loadVault(), pass, user);
    const rec = (reg.users || []).find(x => x.u === user) || {u: user, role: 'super', name: user === 'owner' ? 'المالك' : user};
    LS.del('qutb-fail'); $('#gatePass').value = ''; msg.textContent = '';
    ME = rec; DK = dk; SS.set('qutb-me', JSON.stringify(rec)); if (dk) SS.set('qutb-dk', b64e(dk));
    start(reg);
  } catch (err) {
    const f = failState(); f.n++; f.t = Date.now(); LS.set('qutb-fail', JSON.stringify(f));
    msg.className = 'msg err'; msg.textContent = err.message === 'vault' ? 'تعذّر تحميل السجل. تحقق من الاتصال.' : 'اسم المستخدم أو كلمة المرور غير صحيحة.';
  } finally { btn.disabled = false; }
});

function start(reg) {
  REG = reg; SS.set('qutb-reg', JSON.stringify(reg)); touch();
  $('#gate').hidden = true; $('#app').hidden = false;
  $('#setBtn').hidden = !isSuper(); $('#meName').textContent = ME ? `${ME.name || ME.u} · ${ME.role === 'super' ? 'مدير شامل' : 'مشاهدة'}` : '';
  renderShell(); refresh();
}
function lock() {
  ['qutb-reg', 'qutb-seen', 'qutb-me', 'qutb-dk'].forEach(k => SS.del(k));
  (REG?.backends || []).forEach(b => SS.del('qutb-crm-' + b.id));
  Object.keys(sessionStorage || {}).filter(k => k.startsWith('qc:')).forEach(k => SS.del(k));
  location.reload();
}
const touch = () => SS.set('qutb-seen', String(Date.now()));
['click', 'keydown', 'touchstart'].forEach(ev => document.addEventListener(ev, () => { if (REG) touch(); }, {passive: true}));
setInterval(() => { if (REG && Date.now() - Number(SS.get('qutb-seen') || 0) > IDLE_MIN * 60000) lock(); }, 30000);
$('#lockBtn').addEventListener('click', lock);

// ---------- السمة والساعة والتبويبات ----------
const applyTheme = t => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
applyTheme(LS.get('qutb-theme'));
$('#themeBtn').addEventListener('click', () => {
  const dark = document.documentElement.dataset.theme ? document.documentElement.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const t = dark ? 'light' : 'dark'; LS.set('qutb-theme', t); applyTheme(t);
});
const tick = () => { const p = parts(new Date()); $('#clock').textContent = `الدوحة ${+p.hour}:${p.minute} ${/p/i.test(p.dayPeriod) ? 'م' : 'ص'}`; };
tick(); setInterval(tick, 30000);
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('button[data-tab]'); if (!b) return;
  $$('#tabs button').forEach(x => x.classList.toggle('on', x === b));
  $$('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; });
  LS.set('qutb-tab', b.dataset.tab);
});

// ---------- GitHub والبيانات ----------
const tokens = () => { try { return JSON.parse(LS.get('qutb-tokens') || '{}'); } catch (e) { return {}; } };
const owners = () => [...new Set(REG.platforms.filter(p => p.repo).map(p => p.repo.split('/')[0]))];
async function gh(path, opt = {}) {
  const tk = tokens()[path.split('/')[2]];
  const r = await fetch('https://api.github.com' + path, {...opt, headers: {Accept: 'application/vnd.github+json', ...(tk ? {Authorization: 'Bearer ' + tk} : {}), ...(opt.headers || {})}});
  const rem = r.headers.get('x-ratelimit-remaining');
  if (rem != null && !opt.method) rate = {rem: +rem, lim: +r.headers.get('x-ratelimit-limit'), reset: +r.headers.get('x-ratelimit-reset')};
  if (!r.ok) { const lim = (r.status === 403 || r.status === 429) && r.headers.get('x-ratelimit-remaining') === '0'; if (lim && !opt.method) RATE_HIT = true; throw new Error(lim ? 'rate' : 'http' + r.status); }
  return r.status === 204 ? null : r.json();
}
// نتائج مختصرة تُحفظ ثلاث دقائق في الجلسة حتى لا يُستهلك حد القراءة
const inflight = {};
function cached(key, ttl, fn) {
  const c = SS.get('qc:' + key);
  if (c) { try { const o = JSON.parse(c); if (Date.now() - o.t < ttl * 1000) return Promise.resolve(o.d); } catch (e) {} }
  return inflight[key] ||= fn().then(d => { SS.set('qc:' + key, JSON.stringify({t: Date.now(), d})); return d; }).finally(() => { delete inflight[key]; });
}
const runs = repo => cached('runs:' + repo, 300, async () => (await gh(`/repos/${repo}/actions/runs?per_page=50`)).workflow_runs
  .map(r => ({n: r.name, p: r.path, s: r.status, c: r.conclusion, t: r.created_at, u: r.html_url})));
const commits = (repo, path) => cached(`cm:${repo}:${path}`, 300, async () => (await gh(`/repos/${repo}/commits?per_page=8${path ? '&path=' + encodeURIComponent(path) : ''}`))
  .map(c => ({sha: c.sha, m: String(c.commit.message).split('\n')[0], t: c.commit.committer.date, a: c.commit.author.name, u: c.html_url})));
const raw = (repo, f) => cached(`raw:${repo}:${f}`, 180, async () => {
  const r = await fetch(`https://raw.githubusercontent.com/${repo}/main/${f}?v=${Math.floor(Date.now() / 60000)}`);
  if (!r.ok) throw new Error('http' + r.status); return r.json();
});
async function ping(url) {
  const t0 = performance.now(), ac = new AbortController(), to = setTimeout(() => ac.abort(), 9000);
  try { await fetch(url, {mode: 'no-cors', cache: 'no-store', signal: ac.signal}); return {ok: true, ms: Math.round(performance.now() - t0)}; }
  catch (e) { return {ok: false}; } finally { clearTimeout(to); }
}
const isBot = a => /bot|actions/i.test(a || '');

// ---------- فحص كل منصة ----------
const RANK = {bad: 3, warn: 2, info: 1, ok: 0};
async function evalPlatform(p) {
  const o = {rows: [], alerts: [], stats: null, level: 'ok', last: null};
  const add = (lvl, text, u) => o.alerts.push({lvl, text, u, p: p.id});
  const [pg, cm, rn] = await Promise.allSettled([ping(p.site), p.repo ? commits(p.repo, p.path) : Promise.resolve([]), p.repo && p.workflows?.length ? runs(p.repo) : Promise.resolve([])]);

  if (pg.value?.ok) o.rows.push(['الموقع', `<span class="dot ok"></span>يستجيب خلال ${(pg.value.ms / 1000).toFixed(1)} ثانية`]);
  else { o.rows.push(['الموقع', '<span class="dot bad"></span>لا يستجيب']); add('bad', `${p.name}: الموقع لا يستجيب الآن`, p.site); }

  if (cm.status === 'fulfilled' && cm.value[0]) {
    const c = cm.value[0]; o.last = c.t;
    o.rows.push(['آخر تحديث', `<a href="${esc(c.u)}" target="_blank" rel="noopener" title="${esc(c.m)}">${ago(c.t)}</a>${isBot(c.a) ? ' <span class="pill">آلي</span>' : ''}`]);
  } else if (cm.status === 'rejected') o.rows.push(['آخر تحديث', '<span class="skel">تعذّرت القراءة</span>']);

  const rl = rn.status === 'fulfilled' ? rn.value : null, canRun = p.repo && tokens()[p.repo.split('/')[0]];
  for (const w of p.workflows || []) {
    if (!rl) { o.rows.push([w.t, '<span class="skel">تعذّرت القراءة</span>']); continue; }
    const r = rl.find(x => String(x.p).split('@')[0].endsWith('/' + w.file));
    const btn = canRun && w.run ? ` <button class="run-btn" data-run="${esc(p.repo)}|${esc(w.file)}|${esc(JSON.stringify(w.inputs || {}))}">تشغيل الآن</button>` : '';
    if (!r) { o.rows.push([w.t, `<span class="skel">لا تشغيل حديث</span>${btn}`]); continue; }
    const st = r.s !== 'completed' ? ['info', 'يعمل الآن'] : r.c === 'success' ? ['ok', 'نجح'] : r.c === 'cancelled' || r.c === 'skipped' ? ['', 'أُلغي'] : ['bad', 'فشل'];
    o.rows.push([w.t, `<a href="${esc(r.u)}" target="_blank" rel="noopener"><span class="pill ${st[0]}">${st[1]}</span></a> ${ago(r.t)}${btn}`]);
    if (st[0] === 'bad') add('bad', `${p.name}: فشل آخر تشغيل لـ«${w.t}» ${ago(r.t)}`, r.u);
  }

  for (const d of p.data || []) {
    try {
      const j = await raw(p.repo, d.f), age = hoursSince(j.updated);
      o.rows.push([`تحديث «${d.t}»`, `${age > d.max ? '<span class="dot warn"></span>' : ''}${ago(j.updated)}`]);
      if (age > d.max) add('warn', `${p.name}: «${d.t}» لم تتجدد منذ ${ago(j.updated).replace('قبل ', '')}`);
    } catch (e) { o.rows.push([`تحديث «${d.t}»`, '<span class="skel">تعذّرت القراءة</span>']); }
  }

  if (p.special === 'khabar') await khabarStats(p, o, add);
  (p.notes || []).forEach(n => add('info', `${p.name}: ${n}`));

  o.level = o.alerts.reduce((m, a) => RANK[a.lvl] > RANK[m] ? a.lvl : m, 'ok');
  return o;
}

async function khabarStats(p, o, add) {
  const base = p.path ? p.path + '/data/' : 'data/';
  const [b, l, k] = await Promise.allSettled([raw(p.repo, base + 'brief.json'), raw(p.repo, base + 'ledger.json'), raw(p.repo, base + 'breaking.json')]);
  if (b.status === 'fulfilled') {
    const br = b.value, items = (br.zones || []).reduce((n, z) => n + (z.items || []).length, 0), srcs = Object.keys(br.sources || {}).length;
    const ls = l.value?.summary;
    o.stats = [[num(items), 'خبر في الخلاصة'], [ls ? Math.round(100 * ls.verified / Math.max(1, ls.items)) + '%' : '—', 'موثّق بميزان الثقة'], [num(srcs), 'مصدراً موثّقاً']];
    o.rows.unshift(['الخلاصة الحالية', `${br.edition === 'pm' ? 'المساء' : 'الصباح'} · ${fmtDate(br.date + 'T12:00:00+03:00', false)} · ${ago(br.published)}`]);
    if (hoursSince(br.published) > 14) add('warn', `${p.name}: الخلاصة لم تتجدد منذ ${ago(br.published).replace('قبل ', '')}`);
    if (ls?.broken) add('warn', `${p.name}: ${plural(ls.broken, 'رابط مصدر معطّل', 'رابطا مصدر معطّلان', 'روابط مصادر معطّلة', 'رابط مصدر معطّلاً')} في الخلاصة`, p.site + '#ledger');
  } else o.rows.unshift(['الخلاصة الحالية', '<span class="skel">تعذّرت القراءة</span>']);
  if (k.status === 'fulfilled') {
    o.rows.push(['العاجل', k.value.on ? '<span class="pill bad">منشور الآن</span>' : 'لا عاجل']);
    if (k.value.on) add('info', `${p.name}: خبر عاجل منشور الآن`, p.site);
  }
}

// ---------- العرض ----------
const byId = id => REG.platforms.find(p => p.id === id);
const glyph = p => `<div class="glyph" style="--c:${esc(p.color)}">${esc([...p.name][0])}</div>`;
function cardHTML(p) {
  const r = RESULTS[p.id];
  const pill = !r ? '<span class="pill">جارٍ الفحص…</span>'
    : p.legacy ? '<span class="pill">تحويل</span>'
    : r.level === 'bad' ? '<span class="pill bad">متعثر</span>'
    : r.level === 'warn' ? '<span class="pill warn">يحتاج متابعة</span>'
    : p.local ? '<span class="pill info">وضع محلي</span>' : '<span class="pill ok">يعمل</span>';
  const rows = r ? r.rows.map(([k, v]) => `<li><span>${esc(k)}</span><span>${v}</span></li>`).join('') : '<li><span>الحالة</span><span class="skel">جارٍ الفحص…</span></li>';
  const stats = r?.stats ? `<div class="stats">${r.stats.map(([v, k]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>` : '';
  const links = (p.links || []).map(l => `<a class="btn sm" href="${esc(l.u)}" target="_blank" rel="noopener">${esc(l.t)}</a>`).join('');
  const admin = p.admin ? `<a class="btn sm primary" href="${esc(p.admin)}" target="_blank" rel="noopener" title="${esc(p.adminNote || '')}">لوحة الإدارة</a>` : '';
  const repo = p.repo ? `<a class="btn sm ghost" href="https://github.com/${esc(p.repo)}${p.path ? '/tree/main/' + esc(p.path) : ''}" target="_blank" rel="noopener">المستودع</a>` : '';
  return `<article class="card" style="--c:${esc(p.color)}" id="card-${esc(p.id)}">
    <div class="card-head">${glyph(p)}<div class="t"><h3>${esc(p.name)}</h3><span class="en">${esc(p.en)}</span></div>${pill}</div>
    <p class="tag">${esc(p.tag || '')}</p>${stats}
    <ul class="rows">${rows}</ul>
    ${p.adminNote ? `<p class="note">${esc(p.adminNote)}</p>` : ''}
    <div class="card-act">${admin}${links}${repo}</div></article>`;
}
function renderShell() {
  $('#grid').innerHTML = REG.platforms.map(cardHTML).join('');
  renderBackends(); renderSummary(); renderAlerts();
  const t = LS.get('qutb-tab'); if (t) $(`#tabs button[data-tab="${t}"]`)?.click();
}
function renderCard(p) { const el = $('#card-' + p.id); if (el) el.outerHTML = cardHTML(p); }

function allAlerts() {
  const a = Object.values(RESULTS).flatMap(r => r.alerts).concat(Object.values(BK).flatMap(b => b.alerts || []));
  if (RATE_HIT) a.push({lvl: 'warn', text: 'بلغت اللوحة حد القراءة المجاني من GitHub (60 طلباً في الساعة)، فبعض الأرقام لم تُقرأ الآن. أضف مفتاح GitHub من الإعدادات ليرتفع الحد إلى 5,000.'});
  return a.sort((x, y) => RANK[y.lvl] - RANK[x.lvl]);
}
function renderAlerts() {
  const a = allAlerts(), done = Object.keys(RESULTS).length === REG.platforms.length;
  $('#alerts').innerHTML = a.length ? a.map(x => `<li class="${x.lvl}"><span class="dot"></span><span>${x.u ? `<a href="${esc(x.u)}" target="_blank" rel="noopener">${esc(x.text)}</a>` : esc(x.text)}</span></li>`).join('')
    : `<li class="${done ? 'ok' : ''}"><span class="dot"></span><span>${done ? 'كل المنصات تعمل، ولا شيء يحتاج تدخلك الآن.' : 'جارٍ فحص المنصات…'}</span></li>`;
}
function renderSummary() {
  const live = REG.platforms.filter(p => !p.legacy), rs = live.map(p => RESULTS[p.id]).filter(Boolean);
  const up = rs.filter(r => !r.alerts.some(a => a.lvl === 'bad' && /لا يستجيب/.test(a.text))).length;
  const al = allAlerts().filter(a => a.lvl === 'bad' || a.lvl === 'warn'), bad = al.some(a => a.lvl === 'bad');
  const last = rs.map(r => r.last).filter(Boolean).sort().pop();
  const newReq = Object.values(BK).reduce((n, b) => n + (b.s?.newReq || 0), 0), anyBk = Object.values(BK).some(b => b.s);
  $('#sum').innerHTML = [
    ['', 'المنصات', live.length, REG.backends.length === 2 ? 'نظاما عملاء' : `${REG.backends.length} ${REG.backends.length > 2 ? 'أنظمة عملاء' : 'نظام عملاء'}`],
    [rs.length === live.length ? (up === live.length ? 'ok' : 'bad') : '', 'تعمل الآن', rs.length ? `${up}/${live.length}` : '…', 'استجابة المواقع'],
    [al.length ? (bad ? 'bad' : 'warn') : (rs.length === live.length ? 'ok' : ''), 'تنبيهات', rs.length === live.length ? al.length : '…', anyBk ? (newReq ? plural(newReq, 'طلب جديد', 'طلبان جديدان', 'طلبات جديدة', 'طلباً جديداً') + ' من العملاء' : 'لا طلبات جديدة') : 'دون الملاحظات العامة'],
    ['', 'آخر نشاط', last ? ago(last) : '…', last ? fmtDate(last) : 'نشر أو تحديث آلي']
  ].map(([c, k, v, s]) => `<div class="tile ${c}"><div class="k">${k}</div><div class="v">${esc(v)}</div><div class="s">${esc(s)}</div></div>`).join('');
}
function renderRate() {
  if (!rate) return;
  const tk = Object.keys(tokens()).length;
  $('#rate').textContent = `رصيد قراءة GitHub: ${num(rate.rem)} من ${num(rate.lim)}${!tk && rate.rem < 20 ? ' · أضف مفتاحاً من الإعدادات لرفع الحد' : ''}`;
}

async function renderFeed() {
  const seen = new Map();
  const path = REG.platforms.filter(p => p.repo && p.path), root = REG.platforms.filter(p => p.repo && !p.path);
  for (const p of [...path, ...root]) {
    try { (await commits(p.repo, p.path)).forEach(c => { if (!seen.has(c.sha)) seen.set(c.sha, {...c, p}); }); } catch (e) {}
  }
  const list = [...seen.values()].sort((a, b) => b.t.localeCompare(a.t)).slice(0, 30);
  $('#feed').innerHTML = list.length ? list.map(c => `<li style="--c:${esc(c.p.color)}"><span class="chip"></span>
    <div><span class="who">${esc(c.p.name)}</span> · <a href="${esc(c.u)}" target="_blank" rel="noopener">${esc(c.m)}</a>${isBot(c.a) ? ' <span class="pill">آلي</span>' : ''}</div>
    <time datetime="${esc(c.t)}" title="${esc(fmtDate(c.t))}">${ago(c.t)}</time></li>`).join('') : '<li><span></span><span class="muted">تعذّرت قراءة النشاط الآن.</span><span></span></li>';
}

async function refresh() {
  if (busy) return; busy = true; $('#refresh').classList.add('spin');
  if (REFRESH_FORCE) { Object.keys(sessionStorage || {}).filter(k => k.startsWith('qc:')).forEach(k => SS.del(k)); REFRESH_FORCE = false; }
  RATE_HIT = false;
  await Promise.all([
    ...REG.platforms.map(async p => { RESULTS[p.id] = await evalPlatform(p).catch(() => ({rows: [], alerts: [{lvl: 'warn', text: `${p.name}: تعذّر الفحص`, p: p.id}], level: 'warn'})); renderCard(p); renderAlerts(); renderSummary(); }),
    ...REG.backends.map(b => SS.get('qutb-crm-' + b.id) ? loadBackend(b) : null),
    renderFeed()
  ]);
  renderRate(); busy = false; $('#refresh').classList.remove('spin');
}
let REFRESH_FORCE = false;
$('#refresh').addEventListener('click', () => { REFRESH_FORCE = true; refresh(); });

// تشغيل مهمة آلية الآن (يتطلب مفتاح GitHub لصاحب المستودع)
document.addEventListener('click', async e => {
  const b = e.target.closest('.run-btn'); if (!b) return;
  const [repo, file, inputs] = b.dataset.run.split('|');
  b.disabled = true; b.textContent = 'جارٍ الإرسال…';
  try {
    await gh(`/repos/${repo}/actions/workflows/${file}/dispatches`, {method: 'POST', body: JSON.stringify({ref: 'main', inputs: JSON.parse(inputs || '{}')})});
    b.textContent = 'أُرسل ✓'; SS.del('qc:runs:' + repo);
    setTimeout(() => { REFRESH_FORCE = false; refresh(); }, 6000);
  } catch (err) { b.textContent = err.message === 'http404' || err.message === 'rate' ? 'المفتاح لا يملك الصلاحية' : 'تعذّر التشغيل'; b.disabled = false; }
});

// ---------- أنظمة العملاء ----------
const CRM_ERR = {wrong_password: 'اسم المستخدم أو كلمة المرور غير صحيحة.', rate_limited: 'الحساب مقفل مؤقتاً بعد محاولات خاطئة. أعد المحاولة بعد ربع ساعة.',
  must_change: 'يلزم تغيير كلمة المرور من لوحة العملاء أولاً.', auth: 'انتهت الجلسة. ادخل مجدداً.', net: 'تعذّر الاتصال بالخادم.'};
async function crm(api, body) {
  let r; try { r = await fetch(api, {method: 'POST', headers: {'Content-Type': 'text/plain;charset=utf-8'}, body: JSON.stringify(body)}); } catch (e) { return {ok: false, error: 'net'}; }
  try { return await r.json(); } catch (e) { return {ok: false, error: 'net'}; }
}
const crmSess = b => { try { const s = JSON.parse(SS.get('qutb-crm-' + b.id) || 'null'); return s && s.exp > Date.now() ? s : null; } catch (e) { return null; } };

function crmStats(d) {
  const today = dohaDay(), month = today.slice(0, 7), day = x => String(x || '').slice(0, 10);
  const tx = d.Transactions || [], open = tx.filter(t => !CLOSED.includes(t.status));
  return {
    clients: (d.Clients || []).length,
    newReq: (d.Requests || []).filter(r => r.status === 'جديد').length,
    reqToday: (d.Requests || []).filter(r => day(r.created) === today).length,
    open: open.length,
    overdue: open.filter(t => t.dueDate && day(t.dueDate) < today).length,
    doneMonth: tx.filter(t => t.status === 'منجزة' && day(t.closed || t.updated).slice(0, 7) === month).length,
    unread: (d.Messages || []).filter(m => m.from === 'client' && !m.read).length,
    paid: (d.Payments || []).filter(p => day(p.date || p.created).slice(0, 7) === month).reduce((n, p) => n + (Number(p.amount) || 0), 0),
    finance: Array.isArray(d.Payments) && d.Payments.length > 0,
    reviews: (d.Reviews || []).filter(r => r.status === 'بانتظار الموافقة').length
  };
}
async function loadBackend(b) {
  const s = crmSess(b); if (!s) { BK[b.id] = {}; renderBackend(b); return; }
  BK[b.id] = {loading: true, user: s.user}; renderBackend(b);
  const r = await crm(b.api, {action: 'list', token: s.token});
  if (!r.ok) {
    if (r.error === 'auth' || r.error === 'must_change') SS.del('qutb-crm-' + b.id);
    BK[b.id] = {err: CRM_ERR[r.error] || 'تعذّر جلب البيانات.'}; renderBackend(b); return;
  }
  const st = crmStats(r.data || {}), who = b.serves.map(id => byId(id)?.name).filter(Boolean).join(' و'), alerts = [];
  if (st.newReq) alerts.push({lvl: 'warn', text: `${who}: ${plural(st.newReq, 'طلب جديد', 'طلبان جديدان', 'طلبات جديدة', 'طلباً جديداً')} بانتظار الرد`, u: b.crm});
  if (st.overdue) alerts.push({lvl: 'bad', text: `${who}: ${plural(st.overdue, 'معاملة متأخرة', 'معاملتان متأخرتان', 'معاملات متأخرة', 'معاملة متأخرة')} عن موعدها`, u: b.crm});
  if (st.unread) alerts.push({lvl: 'info', text: `${who}: ${plural(st.unread, 'رسالة عميل غير مقروءة', 'رسالتا عميل غير مقروءتين', 'رسائل عملاء غير مقروءة', 'رسالة عميل غير مقروءة')}`, u: b.crm});
  BK[b.id] = {s: st, user: s.user, alerts};
  renderBackend(b); renderAlerts(); renderSummary();
}
function renderBackends() { $('#backends').innerHTML = REG.backends.map(b => `<article class="card" id="bk-${esc(b.id)}"></article>`).join(''); REG.backends.forEach(renderBackend); }
function renderBackend(b) {
  const el = $('#bk-' + b.id); if (!el) return;
  const st = BK[b.id] || {}, sv = b.serves.map(byId).filter(Boolean), c = sv[0]?.color || 'var(--polar)';
  el.style.setProperty('--c', c);
  const head = `<div class="card-head">${sv[0] ? glyph(sv[0]) : ''}<div class="t"><h3>${esc(b.name)}</h3><span class="muted" style="font-size:12px">يخدم: ${sv.map(p => esc(p.name)).join('، ')}</span></div>
    ${st.s ? `<span class="pill ok">متصل${st.user ? ' · ' + esc(st.user) : ''}</span>` : st.loading ? '<span class="pill">جارٍ التحميل…</span>' : '<span class="pill">غير متصل</span>'}</div>`;
  let body;
  if (st.s) {
    const s = st.s;
    body = `<div class="stats">${[[num(s.newReq), 'طلب جديد'], [num(s.open), 'معاملة مفتوحة'], [num(s.overdue), 'معاملة متأخرة'], [num(s.clients), 'عميل'], [num(s.doneMonth), 'أُنجزت هذا الشهر'],
      [s.finance ? num(s.paid) + ' ر.ق' : '—', 'تحصيل هذا الشهر']].map(([v, k]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>
      <ul class="rows"><li><span>طلبات اليوم</span><span>${num(s.reqToday)}</span></li><li><span>رسائل غير مقروءة</span><span>${num(s.unread)}</span></li><li><span>تقييمات بانتظار الموافقة</span><span>${num(s.reviews)}</span></li></ul>
      <div class="card-act"><a class="btn sm primary" href="${esc(b.crm)}" target="_blank" rel="noopener">فتح لوحة العملاء</a><button class="btn sm ghost" data-bk-out="${esc(b.id)}">خروج</button></div>`;
  } else if (st.loading) body = '<p class="tag" style="padding:12px 16px">جارٍ جلب الأرقام…</p>';
  else body = `<form class="bk-form" data-bk="${esc(b.id)}" autocomplete="on">
      <label class="fld"><span>اسم المستخدم</span><input name="u" required autocomplete="username" dir="ltr"></label>
      <label class="fld"><span>كلمة المرور</span><input name="p" type="password" required autocomplete="current-password" dir="ltr"></label>
      <button class="btn primary">دخول</button></form>
      <p class="msg err" style="padding:0 16px">${esc(st.err || '')}</p>
      <div class="card-act"><a class="btn sm" href="${esc(b.crm)}" target="_blank" rel="noopener">فتح لوحة العملاء</a></div>`;
  el.innerHTML = head + body;
}
document.addEventListener('submit', async e => {
  const f = e.target.closest('form[data-bk]'); if (!f) return;
  e.preventDefault();
  const b = REG.backends.find(x => x.id === f.dataset.bk), btn = f.querySelector('button');
  btn.disabled = true;
  const r = await crm(b.api, {action: 'login', username: f.u.value.trim(), password: f.p.value});
  if (!r.ok) { BK[b.id] = {err: CRM_ERR[r.error] || 'تعذّر الدخول.'}; renderBackend(b); return; }
  SS.set('qutb-crm-' + b.id, JSON.stringify({token: r.token, user: r.me?.username || f.u.value.trim(), exp: Date.now() + 11.5 * 3600000}));
  loadBackend(b);
});
document.addEventListener('click', async e => {
  const o = e.target.closest('[data-bk-out]'); if (!o) return;
  const b = REG.backends.find(x => x.id === o.dataset.bkOut), s = crmSess(b);
  if (s) crm(b.api, {action: 'staffLogout', token: s.token});
  SS.del('qutb-crm-' + b.id); BK[b.id] = {}; renderBackend(b); renderAlerts(); renderSummary();
});

// ---------- الإعدادات ----------
$('#setBtn').addEventListener('click', () => {
  const t = tokens();
  $('#tokens').innerHTML = owners().map(o => `<label class="fld"><span>مفتاح حساب <b dir="ltr">${esc(o)}</b></span><input type="password" data-owner="${esc(o)}" value="${esc(t[o] || '')}" dir="ltr" placeholder="github_pat_…" autocomplete="off"></label>`).join('');
  $('#tokMsg').textContent = ''; $('#settings').showModal();
});
$('#saveTokens').addEventListener('click', async () => {
  const t = {}; $$('#tokens input').forEach(i => { if (i.value.trim()) t[i.dataset.owner] = i.value.trim(); });
  LS.set('qutb-tokens', JSON.stringify(t));
  const m = $('#tokMsg'); m.className = 'msg'; m.textContent = 'جارٍ التحقق…';
  const bad = [];
  for (const o of Object.keys(t)) { const repo = REG.platforms.find(p => p.repo?.startsWith(o + '/')).repo; try { await gh(`/repos/${repo}`); } catch (e) { bad.push(o); } }
  m.className = bad.length ? 'msg err' : 'msg ok';
  m.textContent = bad.length ? `المفتاح لا يعمل مع: ${bad.join('، ')}` : (Object.keys(t).length ? 'حُفظت المفاتيح وتعمل.' : 'حُذفت المفاتيح من هذا الجهاز.');
  Object.values(RESULTS).length && REG.platforms.forEach(renderCard); refresh();
});

// ينشر السجل بعد إعادة تشفيره. edit(slots) يعدّل خانات المستخدمين عند الحاجة.
async function publishVault(reg, message, edit) {
  if (!tokens()[VAULT_REPO.split('/')[0]]) throw new Error('token');
  if (!DK) throw new Error('dk');
  const cur0 = await loadVault(); let slots = cur0.v === 2 ? cur0.slots.slice() : [];
  if (edit) slots = await edit(slots);
  if (!slots.length) throw new Error('noslot');
  const v = await seal(reg, DK, slots), api = `/repos/${VAULT_REPO}/contents/${VAULT_PATH}`;
  const cur = await gh(api + '?ref=main');
  await gh(api, {method: 'PUT', body: JSON.stringify({message, content: btoa(JSON.stringify(v) + '\n'), sha: cur.sha, branch: 'main'})});
}
const verifyPass = async pass => { try { return (await unseal(await loadVault(), pass, ME?.u)).reg; } catch (e) { return null; } };
const failMsg = err => err.message === 'token' ? `أضف مفتاح حساب ${VAULT_REPO.split('/')[0]} أولاً.` : err.message === 'dk' ? 'سجّل الخروج ثم ادخل باسم المستخدم وكلمة المرور لتفعيل التعديل.' : 'تعذّر النشر. تحقق من صلاحية المفتاح (Contents: Read and write).';

$('#passForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, m = $('#passMsg'), btn = f.querySelector('button');
  m.className = 'msg err';
  if (f.new.value !== f.again.value) { m.textContent = 'كلمتا المرور الجديدتان غير متطابقتين.'; return; }
  if (f.new.value === f.old.value) { m.textContent = 'اختر كلمة مرور مختلفة عن الحالية.'; return; }
  btn.disabled = true; m.className = 'msg'; m.textContent = 'جارٍ التحقق والتشفير…';
  const reg = await verifyPass(f.old.value);
  if (!reg) { m.className = 'msg err'; m.textContent = 'كلمة المرور الحالية غير صحيحة.'; btn.disabled = false; return; }
  try { const me = ME.u, np = f.new.value; await publishVault(reg, 'قُطب: تغيير كلمة المرور', async slots => { const id = await slotId(me); return [...slots.filter(x => x.id !== id), await makeSlot(me, np, DK)]; }); f.reset(); m.className = 'msg ok'; m.textContent = 'تغيّرت كلمة المرور. تسري خلال دقيقة أو دقيقتين بعد نشر الموقع.'; }
  catch (err) { m.className = 'msg err'; m.textContent = failMsg(err); }
  btn.disabled = false;
});

$('#addForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, m = $('#addMsg'), btn = f.querySelector('button');
  btn.disabled = true; m.className = 'msg'; m.textContent = 'جارٍ التحقق…';
  const reg = await verifyPass(f.pass.value);
  if (!reg) { m.className = 'msg err'; m.textContent = 'كلمة مرور قُطب غير صحيحة.'; btn.disabled = false; return; }
  const id = f.en.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'p' + Date.now();
  if (reg.platforms.some(p => p.id === id)) { m.className = 'msg err'; m.textContent = 'توجد منصة بهذا الاسم.'; btn.disabled = false; return; }
  const site = f.site.value.trim(), admin = f.admin.value.trim();
  reg.platforms.push({id, name: f.name.value.trim(), en: f.en.value.trim(), tag: f.tag.value.trim(), color: f.color.value, kind: 'app',
    repo: f.repo.value.trim(), path: f.path.value.trim().replace(/^\/|\/$/g, ''), site, links: [{t: 'الموقع', u: site}], admin, workflows: [], data: [], notes: []});
  reg.updated = dohaDay();
  try {
    await publishVault(reg, 'قُطب: إضافة منصة ' + f.en.value.trim());
    f.reset(); m.className = 'msg ok'; m.textContent = 'أُضيفت المنصة ونُشرت.';
    REG = reg; SS.set('qutb-reg', JSON.stringify(reg)); RESULTS = {}; renderShell(); refresh();
  } catch (err) { m.className = 'msg err'; m.textContent = failMsg(err); }
  btn.disabled = false;
});

// ---------- المستخدمون (للمدير الشامل) ----------
function renderUsers() {
  const users = REG.users || [];
  $('#userList').innerHTML = users.map(u => `<li><span><b>${esc(u.name || u.u)}</b> <span dir="ltr" class="muted">${esc(u.u)}</span></span><span class="pill">${u.role === 'super' ? 'مدير شامل' : 'مشاهدة'}</span>${u.u !== ME?.u ? `<button class="run-btn" data-deluser="${esc(u.u)}">حذف</button>` : '<span class="muted">أنت</span>'}</li>`).join('') || '<li class="muted">لا مستخدمين مسجّلين.</li>';
}
$('#setBtn').addEventListener('click', renderUsers);
$('#userList').addEventListener('click', async e => {
  const b = e.target.closest('[data-deluser]'); if (!b) return;
  const u = b.dataset.deluser, m = $('#userMsg'); if (!confirm('حذف المستخدم ' + u + '؟')) return;
  const reg = JSON.parse(JSON.stringify(REG)); reg.users = (reg.users || []).filter(x => x.u !== u); reg.updated = dohaDay();
  m.className = 'msg'; m.textContent = 'جارٍ النشر…';
  try { const id = await slotId(u); await publishVault(reg, 'قُطب: حذف مستخدم', async slots => slots.filter(x => x.id !== id));
    REG = reg; SS.set('qutb-reg', JSON.stringify(reg)); renderUsers(); m.className = 'msg ok'; m.textContent = 'حُذف المستخدم.'; }
  catch (err) { m.className = 'msg err'; m.textContent = failMsg(err); }
});
$('#userForm').addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target, m = $('#userMsg'), btn = f.querySelector('button'), u = f.u.value.trim().toLowerCase();
  m.className = 'msg err';
  if (!/^[a-z0-9._-]{3,32}$/.test(u)) { m.textContent = 'اسم المستخدم من 3 إلى 32 حرفاً لاتينياً أو رقماً أو (. _ -).'; return; }
  if ((REG.users || []).some(x => x.u === u)) { m.textContent = 'اسم المستخدم موجود.'; return; }
  btn.disabled = true; m.className = 'msg'; m.textContent = 'جارٍ التشفير والنشر…';
  const reg = JSON.parse(JSON.stringify(REG)); reg.users = [...(reg.users || []), {u, name: f.n.value.trim() || u, role: f.r.value, created: dohaDay()}]; reg.updated = dohaDay();
  try { const pw = f.p.value; await publishVault(reg, 'قُطب: إضافة مستخدم', async slots => [...slots, await makeSlot(u, pw, DK)]);
    REG = reg; SS.set('qutb-reg', JSON.stringify(reg)); f.reset(); renderUsers(); m.className = 'msg ok'; m.textContent = 'أُضيف المستخدم ونُشر.'; }
  catch (err) { m.className = 'msg err'; m.textContent = failMsg(err); }
  btn.disabled = false;
});

// ---------- الإقلاع: استئناف الجلسة إن كانت حديثة ----------
try {
  const saved = SS.get('qutb-reg'), seen = Number(SS.get('qutb-seen') || 0);
  if (saved && Date.now() - seen < IDLE_MIN * 60000) {
    ME = JSON.parse(SS.get('qutb-me') || 'null'); const k = SS.get('qutb-dk'); DK = k ? b64d(k) : null;
    start(JSON.parse(saved));
  }
  else { SS.del('qutb-reg'); $('#gateUser').focus(); }
} catch (e) { $('#gateUser').focus(); }
})();
