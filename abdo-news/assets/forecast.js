// «عبدو نيوز» التوقعات: استقراء المستقبل. صفحة الزائر: تقرأ data/forecast.json (المدخلات الموثّقة) وdata/forecast/events.json (الأحداث الموثّقة بجهتين)
// وdata/wars.json، ثم تحسب في المتصفح بالنموذج المعلن نفسه الذي يستعمله المحرك الآلي (assets/forecast-model.js) حسب متغيرات الزائر.
import * as M from './forecast-model.js';

const CFG = window.KHABAR_CONFIG || {};
const $ = s => document.querySelector(s);
const el = (t, c, txt) => { const e = document.createElement(t); if (c) e.className = c; if (txt != null) e.textContent = txt; return e; };
let LANG = document.documentElement.lang === 'en' ? 'en' : 'ar';
const L = (a, e) => LANG === 'en' ? e : a;
const N = o => o ? (LANG === 'en' ? o.en : o.ar) : '';
const T = {
  brand: ['عبدو نيوز', 'Abdo News'], section: ['التوقعات', 'Forecasts'], eyebrow: ['التوقعات: استقراء المستقبل', 'Forecasts: reading the future'],
  h1: ['إلى أين تتجه الدول؟', 'Where are countries heading?'],
  intro: ['نقرأ الوضع السابق والحالي لأهم الدول من مؤشرات مؤسسية وأحداث موثّقة، ونستخرج منها احتمالات للتحسن والاستقرار والتدهور مع نطاق ثقة. اختر الدولة والجانب والمدى والسيناريو، فيتغير التوقع والتقرير أمامك.', 'We read the past and present of key countries from institutional indicators and verified events, and derive probabilities of improvement, stability and deterioration with a confidence range. Choose the country, aspect, horizon and scenario, and the forecast and report change in front of you.'],
  warn_b: ['تقديرات لا أخبار.', 'Estimates, not news.'],
  warn: ['كل ما في هذا القسم احتمالات محسوبة آلياً بمنهجية معلنة أسفل الصفحة، وليس خبراً مؤكداً ولا توصية. كل مدخل منسوب إلى مصدره برابطه الأصلي، وكل حدث مؤكد من جهتين مستقلتين.', 'Everything here is a probability computed automatically with the method published below. It is not confirmed news and not advice. Every input links to its source, and every event is confirmed by two independent outlets.'],
  ctl: ['متغيرات التوقع', 'Forecast variables'], country: ['الدولة', 'Country'], scenario: ['السيناريو', 'Scenario'], aspect: ['الجانب', 'Aspect'], horizon: ['المدى الزمني', 'Horizon'],
  weight: ['وزن أحداث الأيام السبعة الأخيرة', 'Weight of the last seven days\' events'], weight_hint: ['صفر: المؤشرات البنيوية وحدها. اثنان: ضعف أثر الأحداث الأخيرة.', 'Zero: structural indicators only. Two: double the effect of recent events.'],
  share: ['انسخ رابط هذا التوقع', 'Copy link to this forecast'], copy: ['انسخ التقرير', 'Copy the report'], print: ['اطبع أو احفظ PDF', 'Print or save as PDF'],
  aspects_h: ['الجوانب الستة', 'The six aspects'], report_h: ['التقرير', 'Report'], drivers_h: ['لماذا هذا التقدير؟', 'Why this estimate?'], eco_h: ['الاقتصاد بالأرقام', 'The economy in numbers'],
  ev_h: ['الأحداث الموثّقة التي دخلت الحساب', 'Verified events in the calculation'], board_h: ['لوحة الدول', 'Country board'], rec_h: ['سجل دقة التوقعات', 'Forecast track record'], method_h: ['المنهجية المعلنة', 'Published method'],
  footer_note: ['التوقعات في هذا القسم تقديرات احتمالية لا أخبار، تُحسب آلياً كل 3 ساعات بمنهجية معلنة، ويُنشر سجل دقتها كما هو.', 'Forecasts here are probabilistic estimates, not news. They are computed automatically every 3 hours with a published method, and their track record is published as it is.'],
  special: ['تقارير خاصة', 'Special reports'], today: ['اليوم', 'Today'], qatar: ['قطر', 'Qatar'], gulf: ['الخليج', 'The Gulf'], egypt: ['مصر', 'Egypt'], world: ['العالم', 'The World'], military: ['القسم العسكري', 'Military'], wars: ['الحروب الدائرة', 'Ongoing wars'],
  roadmap: ['خريطة الطريق', 'Roadmap'], ledger: ['الشفافية', 'Transparency'], saved: ['المحفوظ', 'Saved'], about: ['عن عبدو نيوز', 'About'], weather: ['الطقس والمناخ', 'Weather'], forecast: ['التوقعات', 'Forecasts'], desks: ['الأقسام', 'Desks'], countries: ['الأوضاع في الدول', 'Countries'],
  theme_dark: ['الوضع الليلي', 'Dark mode'], theme_light: ['الوضع النهاري', 'Light mode'], all: ['كل الجوانب', 'All aspects']
};
const t = k => (T[k] || [k, k])[LANG === 'en' ? 1 : 0];
const MONTHS = {ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'], en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']};
const DAYS = {ar: ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']};
const fmtDate = (iso, withDay) => { const [y, m, d] = iso.slice(0, 10).split('-').map(Number); const dt = new Date(Date.UTC(y, m - 1, d)); return (withDay ? DAYS[LANG][dt.getUTCDay()] + ' ' : '') + d + ' ' + MONTHS[LANG][m - 1] + ' ' + y; };
const doha = d => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Qatar'}).format(d);
const hmDoha = iso => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {timeZone: 'Asia/Qatar', hour: '2-digit', minute: '2-digit', hour12: false}).formatToParts(new Date(iso)).map(x => [x.type, x.value])); const h = +p.hour; return LANG === 'en' ? `${p.hour}:${p.minute}` : `${h % 12 || 12}:${p.minute} ${h < 12 ? 'ص' : 'م'}`; };
const PCT = () => LANG === 'en' ? '%' : '٪';
const pc = x => x == null || isNaN(x) ? '—' : Math.round(x * 100) + PCT();
// السالب بعلامة الطرح الحقيقية وعزل اتجاهي حتى لا ينقلب في النص العربي
const neg = s => s.replace(/^-/, '\u2212');
const iso = s => '\u200E' + s + '\u200E';
const n1 = x => x == null || isNaN(x) ? '—' : iso(neg((Math.round(x * 10) / 10).toString()));
const n2 = x => x == null || isNaN(x) ? '—' : iso(neg((Math.round(x * 100) / 100).toString()));
const sgn = x => x == null || isNaN(x) ? '—' : iso((x > 0 ? '+' : '') + neg((Math.round(x * 10) / 10).toString()));
const countAr = (n, one, two, few, many) => n === 0 ? 'لا ' + many : n === 1 ? one : n === 2 ? two : n <= 10 ? `${n} ${few}` : `${n} ${many}`;
const nEvents = n => LANG === 'en' ? `${n} event${n === 1 ? '' : 's'}` : countAr(n, 'حدث واحد', 'حدثان', 'أحداث', 'حدثاً');

/* ---------- الحالة ---------- */
let F = null, EV = [], WARS = [], ADMIN = {}, LEXICON = null;
const ST = {c: 'QAT', a: 'all', h: 30, s: 'base', w: 1};
const OUT = M.OUTLOOK;
// مواقع تقريبية للدول في شبكة الخريطة المبسّطة (عمود، صف)
const TILE = {GBR: [3, 1], UKR: [5, 1], RUS: [6, 1], USA: [1, 2], FRA: [3, 2], TUR: [5, 2], CHN: [9, 2], LBN: [4, 3], SYR: [5, 3], IRQ: [6, 3], IRN: [7, 3], LBY: [2, 4], PSE: [3, 4], ISR: [4, 4], JOR: [5, 4], KWT: [6, 4], BHR: [7, 4], EGY: [3, 5], SAU: [5, 5], QAT: [6, 5], ARE: [7, 5], SDN: [3, 6], YEM: [5, 6], OMN: [7, 6]};
const ASP = Object.fromEntries(M.ASPECTS.map(a => [a.id, a]));
const SCN = Object.fromEntries(M.SCENARIOS.map(s => [s.id, s]));
const HZ = Object.fromEntries(M.HORIZONS.map(h => [h.d, h]));
const country = id => F.countries[id] ? {id, ...F.countries[id]} : null;
const visible = () => Object.keys(F.countries).filter(id => !(ADMIN.forecast_hidden || []).includes(id));

/* ---------- الحساب ---------- */
// لون نص البلاطة حسب سطوع خلفيتها: داكن على الألوان الفاتحة (مثل ذهبي «تحت المراقبة») ليبقى التباين فوق 4.5 إلى 1
function inkOn(hex) { const c = String(hex).replace('#', ''); if (c.length !== 6) return false; const v = [0, 2, 4].map(i => { const x = parseInt(c.slice(i, i + 2), 16) / 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }); return .2126 * v[0] + .7152 * v[1] + .0722 * v[2] > .2; }
function compute(id, o = {}) {
  const c = country(id), opts = {h: o.h ?? ST.h, sc: o.s ?? ST.s, weight: o.w ?? ST.w, wars: WARS, events: EV};
  const a = o.a ?? ST.a;
  if (a === 'all') { const f = M.forecastCountry(c, opts); return {...f, aspect: 'all'}; }
  return M.forecastAspect(c, a, opts);
}

/* ---------- الرأس ---------- */
function header() {
  $('#today-date').textContent = fmtDate(doha(new Date()), true);
  document.querySelectorAll('[data-t]').forEach(n => n.textContent = t(n.dataset.t));
  $('#lang-btn').textContent = LANG === 'en' ? 'ع' : 'EN'; $('#lang-btn').setAttribute('aria-label', LANG === 'en' ? 'العربية' : 'English');
  const dark = document.documentElement.dataset.theme === 'dark' || (!document.documentElement.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches);
  $('#theme-btn').setAttribute('aria-label', dark ? t('theme_light') : t('theme_dark'));
  document.title = LANG === 'en' ? 'Forecasts: reading the future | Abdo News' : 'التوقعات: استقراء المستقبل | عبدو نيوز';
  const ZC = {qatar: 'var(--dawn)', gulf: 'var(--sea)', egypt: 'var(--nile)', world: 'var(--deep-ink)', military: '#8A3A2E', wars: '#C4392F', countries: '#1F3A93', desks: '#7A3FB0', special: '#0F6E8C'};
  const tabs = $('#tabs'); tabs.textContent = '';
  ['today', 'qatar', 'gulf', 'egypt', 'world', 'military', 'wars', 'countries', 'forecast', 'desks', 'special', 'weather', 'roadmap', 'ledger', 'saved', 'about'].forEach(id => {
    const a = el('a', 'tab'); a.href = id === 'forecast' ? './' : id === 'weather' ? '../weather/' : id === 'special' ? '../special/' : '../#' + id;
    if (ZC[id]) { const i = el('i'); i.style.background = ZC[id]; a.append(i); }
    if (id === 'forecast') { a.setAttribute('aria-current', 'page'); a.insertAdjacentHTML('afterbegin', '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M3 17l5-5 4 3 8-9" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 6h5v5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2.5"/></svg>'); }
    a.append(t(id)); tabs.append(a);
  });
  const cur = tabs.querySelector('[aria-current]'); if (cur) cur.scrollIntoView({block: 'nearest', inline: 'center'});
  const c = $('#contact'); c.textContent = ''; c.append(el('span', null, CFG.EMAIL || ''), el('span', null, CFG.PHONE || ''));
}
function toast(m) { const n = $('#toast'); n.textContent = m; n.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => n.hidden = true, 2400); }

/* ---------- المتغيرات ---------- */
function controls() {
  const sel = $('#f-country'); sel.textContent = '';
  const groups = [['gulf', L('الخليج', 'The Gulf')], ['mena', L('الشرق الأوسط وشمال أفريقيا', 'Middle East and North Africa')], ['europe', L('أوروبا', 'Europe')], ['world', L('العالم', 'World')]];
  for (const [g, name] of groups) {
    const og = el('optgroup'); og.label = name;
    for (const id of visible().filter(id => F.countries[id].region === g)) { const o = el('option', null, N(F.countries[id])); o.value = id; og.append(o); }
    if (og.children.length) sel.append(og);
  }
  sel.value = ST.c;
  const sc = $('#f-scen'); sc.textContent = '';
  for (const s of M.SCENARIOS) { const o = el('option', null, N(s)); o.value = s.id; sc.append(o); }
  sc.value = ST.s;
  const ac = $('#f-aspect'); ac.textContent = '';
  for (const a of [{id: 'all', ar: t('all'), en: t('all')}, ...M.ASPECTS]) { const b = el('button', 'chip', a.id === 'all' ? t('all') : N(a)); b.type = 'button'; b.dataset.v = a.id; b.setAttribute('aria-pressed', String(ST.a === a.id)); b.onclick = () => set({a: a.id}); ac.append(b); }
  const hz = $('#f-h'); hz.textContent = '';
  for (const h of M.HORIZONS) { const b = el('button', 'seg-b', N(h)); b.type = 'button'; b.setAttribute('aria-pressed', String(ST.h === h.d)); b.onclick = () => set({h: h.d}); hz.append(b); }
  $('#f-w').value = ST.w; $('#f-w-v').textContent = '×' + ST.w;
  $('#f-scen-note').textContent = L(SCN[ST.s].note_ar, SCN[ST.s].note_en);
}
function set(p) {
  Object.assign(ST, p);
  if (!F.countries[ST.c]) ST.c = visible()[0];
  history.replaceState(null, '', '#' + new URLSearchParams({c: ST.c, a: ST.a, h: ST.h, s: ST.s, w: ST.w}).toString());
  render();
}
function readHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  if (q.get('c') && F.countries[q.get('c').toUpperCase()]) ST.c = q.get('c').toUpperCase();
  if (q.get('a') && (q.get('a') === 'all' || ASP[q.get('a')])) ST.a = q.get('a');
  if (q.get('h') && HZ[+q.get('h')]) ST.h = +q.get('h');
  if (q.get('s') && SCN[q.get('s')]) ST.s = q.get('s');
  if (q.get('w') != null && !isNaN(+q.get('w'))) ST.w = Math.max(0, Math.min(2, +q.get('w')));
}

/* ---------- العرض ---------- */
function bar3(f) {
  const b = el('div', 'fc-bar'); b.setAttribute('role', 'img');
  b.setAttribute('aria-label', L(`تحسن ${pc(f.p_better)}، استقرار ${pc(f.p_stable)}، تدهور ${pc(f.p_worse)}`, `Better ${pc(f.p_better)}, stable ${pc(f.p_stable)}, worse ${pc(f.p_worse)}`));
  for (const [k, v, lab] of [['b', f.p_better, L('تحسن', 'Better')], ['s', f.p_stable, L('استقرار', 'Stable')], ['w', f.p_worse, L('تدهور', 'Worse')]]) {
    const s = el('span', 'fc-seg fc-' + k); s.style.flexBasis = Math.max(v * 100, 0) + '%'; if (v >= 0.12) s.textContent = `${lab} ${pc(v)}`; b.append(s);
  }
  return b;
}
function ciBar(f) {
  const w = el('div', 'fc-ci'); w.setAttribute('aria-hidden', 'true');
  const r = el('span', 'fc-ci-r'); r.style.insetInlineStart = f.ci[0] * 100 + '%'; r.style.width = (f.ci[1] - f.ci[0]) * 100 + '%';
  const p = el('span', 'fc-ci-p'); p.style.insetInlineStart = f.p_worse * 100 + '%';
  w.append(r, p); return w;
}
const aspectName = a => a === 'all' ? t('all') : N(ASP[a]);
function renderResult(f) {
  const c = country(ST.c), box = $('#result'); box.textContent = '';
  const card = el('div', 'fc-card'); card.style.setProperty('--oc', f.color);
  const top = el('div', 'fc-card-top');
  const h = el('h2', null, N(c)); const tag = el('span', 'fc-tag', N(OUT[f.outlook])); tag.style.background = f.color;
  top.append(h, tag);
  const sub = el('p', 'mute fc-sub', `${aspectName(ST.a)} · ${N(HZ[ST.h])} · ${N(SCN[ST.s])}`);
  const big = el('p', 'fc-big');
  big.append(el('b', 'num', pc(f.p_worse)), el('span', null, L(' احتمال التدهور', ' probability of deterioration')));
  const ci = el('p', 'fc-ci-t', L(`نطاق الثقة: ${pc(f.ci[0])} إلى ${pc(f.ci[1])}. كلما ضاق النطاق زادت البيانات التي استند إليها التقدير.`, `Confidence range: ${pc(f.ci[0])} to ${pc(f.ci[1])}. A narrower range means more data behind the estimate.`));
  card.append(top, sub, big, ciBar(f), ci, bar3(f));
  const links = el('p', 'fc-links');
  if (c.ck) { const a = el('a', null, L(`الأوضاع في ${c.ar} يوماً بيوم ←`, `${c.en}: day-by-day situation →`)); a.href = '../#c-' + c.ck; links.append(a); }
  for (const w of (f.war?.wars || c.war || []).slice(0, 2)) { const war = WARS.find(x => x.id === w.id); if (!war) continue; const a = el('a', null, L(`ملف ${war.name?.ar || w.id} ←`, `${war.name?.en || w.id} file →`)); a.href = '../#war-' + w.id; links.append(a); }
  if (links.children.length) card.append(links);
  if (ADMIN.forecast_note && (ADMIN.forecast_note.ar || ADMIN.forecast_note.en)) card.append(el('p', 'fc-note', L(ADMIN.forecast_note.ar, ADMIN.forecast_note.en || ADMIN.forecast_note.ar)));
  box.append(card);
}
function renderAspects() {
  const g = $('#asp-grid'); g.textContent = '';
  const all = compute(ST.c, {a: 'all'});
  for (const a of M.ASPECTS) {
    const x = all.aspects[a.id];
    const b = el('button', 'fc-asp'); b.type = 'button'; b.setAttribute('aria-pressed', String(ST.a === a.id)); b.style.setProperty('--oc', x.color);
    b.append(el('span', 'fc-asp-n', N(a)), el('b', 'num', pc(x.p_worse)), el('span', 'fc-asp-o', N(OUT[x.outlook])));
    const m = el('span', 'fc-mini'); const i = el('i'); i.style.width = x.p_worse * 100 + '%'; m.append(i); b.append(m);
    b.title = L(`${N(a)}: احتمال التدهور ${pc(x.p_worse)} (${pc(x.ci[0])}–${pc(x.ci[1])})`, `${N(a)}: ${pc(x.p_worse)} (${pc(x.ci[0])}–${pc(x.ci[1])})`);
    b.onclick = () => set({a: ST.a === a.id ? 'all' : a.id});
    g.append(b);
  }
}
const DRV = {
  wgi_pv: [L('الاستقرار السياسي وغياب العنف', 'Political stability and absence of violence'), 'wgi_pv'],
  wgi_ge: [L('فاعلية الحكومة', 'Government effectiveness'), 'wgi_ge'],
  war: [L('التعرّض لحرب دائرة', 'Exposure to an ongoing war'), null],
  econ: [L('المؤشرات الاقتصادية الكلية (النمو، التضخم، البطالة)', 'Macro indicators (growth, inflation, unemployment)'), 'growth'],
  social: [L('الضغط المعيشي (التضخم والبطالة)', 'Cost-of-living pressure (inflation and unemployment)'), 'inflation'],
  ci_politics: [L('مؤشر الاستقرار اليومي: السياسي', 'Daily stability index: political'), null],
  ci_security: [L('مؤشر الاستقرار اليومي: الأمني', 'Daily stability index: security'), null],
  ci_economy: [L('مؤشر الاستقرار اليومي: الاقتصادي', 'Daily stability index: economic'), null],
  milex: [L('الإنفاق العسكري', 'Military spending'), null]
};
function gradeBadge(g) { const b = el('span', 'fc-grade g-' + (g || 'B').replace('-', 'm'), g === 'A' ? L('أ: مؤسستان متطابقتان', 'A: two institutions agree') : g === 'A-' ? L('أ−: مؤسستان بفارق معلن', 'A−: two institutions, gap shown') : L('ب: مؤسسة دولية واحدة', 'B: one official institution')); return b; }
// على الجوال تتحول الجداول إلى بطاقات: كل خلية تحمل اسم عمودها
function label(tbl) { const hs = [...tbl.tHead.rows[0].cells].map(c => c.textContent); for (const tr of tbl.tBodies[0].rows) [...tr.cells].forEach((td, i) => td.dataset.l = hs[i] || ''); tbl.classList.add('fc-stack'); return tbl; }
function srcLinks(src) { const s = el('span', 'fc-src'); (src || []).forEach((x, i) => { if (i) s.append(' · '); const a = el('a', null, N(x)); a.href = x.url; a.target = '_blank'; a.rel = 'noopener'; s.append(a); }); return s; }
function renderDrivers(f) {
  const c = country(ST.c), body = $('#drv-body'); body.textContent = '';
  const asps = ST.a === 'all' ? M.ASPECTS.map(a => a.id) : [ST.a];
  const S = M.structural(c, WARS);
  const rows = new Map();
  for (const a of asps) for (const d of S[a].used) { const r = rows.get(d.k) || {k: d.k, v: d.v, w: 0, in: []}; r.w += d.w; r.in.push(a); rows.set(d.k, r); }
  const tbl = el('table', 'fc-tbl'); const th = el('tr');
  [L('المكوّن', 'Component'), L('القيمة', 'Value'), L('درجة الخطر', 'Risk score'), L('يدخل في', 'Used in'), L('المصدر والتوثيق', 'Source and grade')].forEach(x => th.append(el('th', null, x)));
  tbl.append(el('thead'), el('tbody')); tbl.tHead.append(th);
  for (const r of [...rows.values()].sort((a, b) => b.v * b.w - a.v * a.w)) {
    const tr = el('tr'); const [name, inKey] = DRV[r.k] || [r.k, null];
    tr.append(el('td', null, name));
    let val = '—', src = null, grade = null;
    if (r.k === 'wgi_pv' || r.k === 'wgi_ge') { const I = c.inputs[r.k]; val = `${n2(I.v)} (${I.year})`; src = I.src; grade = I.grade; }
    else if (r.k === 'econ' || r.k === 'social') { const I = c.inputs; val = [I.growth && L(`نمو ${n1(I.growth.v)}٪`, `growth ${n1(I.growth.v)}%`), I.inflation && L(`تضخم ${n1(I.inflation.v)}٪`, `inflation ${n1(I.inflation.v)}%`), I.unemployment && L(`بطالة ${n1(I.unemployment.v)}٪`, `unemployment ${n1(I.unemployment.v)}%`)].filter(Boolean).join(L('، ', ', ')); src = (I.growth || I.inflation)?.src; grade = (I.growth || I.inflation)?.grade; }
    else if (r.k === 'war') { const ws = S.war.wars.map(w => { const war = WARS.find(x => x.id === w.id); return `${war ? N(war.name) : w.id} (${w.level === 'escalation' ? L('تصعيد', 'escalation') : w.level === 'tense' ? L('متوتر', 'tense') : L('هادئ', 'calm')})`; }); val = ws.join(L('، ', ', ')) || L('لا حرب مرتبطة', 'No linked war'); src = [{ar: 'ملفات الحروب في عبدو نيوز (كل تطور من جهتين)', en: 'Abdo News war files (each update from two outlets)', url: '../#wars'}]; grade = 'A'; }
    else if (r.k.startsWith('ci_')) { const d = c.ci_index?.dims?.[r.k.slice(3)]; val = `${d?.score ?? c.ci_index?.score ?? '—'}/100`; src = [{ar: 'قسم «الأوضاع في الدول» (أحداث من جهتين)', en: '"Country situations" desk (two-outlet events)', url: c.ck ? '../#c-' + c.ck : '../'}]; grade = 'A'; }
    tr.append(el('td', 'num', val), el('td', 'num', Math.round(r.v * 100) + '/100'), el('td', null, [...new Set(r.in)].map(a => N(ASP[a])).join(L('، ', ', '))));
    const td = el('td'); if (grade) td.append(gradeBadge(grade), ' '); if (src) td.append(srcLinks(src)); tr.append(td);
    tbl.tBodies[0].append(tr);
  }
  const wrap = el('div', 'fc-tbl-wrap'); wrap.append(label(tbl)); body.append(wrap);
  // الزخم
  const m = ST.a === 'all' ? Object.values(f.aspects).reduce((o, x) => ({n7: o.n7 + x.momentum.n7, p7: o.p7 + x.momentum.p7, b: o.b + x.momentum.base_neg}), {n7: 0, p7: 0, b: 0}) : {n7: f.momentum.n7, p7: f.momentum.p7, b: f.momentum.base_neg};
  const rel = m.n7 > m.b * 1.3 + 0.5 ? L('أعلى من المعتاد', 'above normal') : m.n7 < m.b * 0.7 - 0.5 ? L('أدنى من المعتاد', 'below normal') : L('قريب من المعتاد', 'near normal');
  body.append(el('p', 'fc-mom', L(`زخم الأيام السبعة الأخيرة: ${nEvents(m.n7)} سلبية موثّقة و${nEvents(m.p7)} إيجابية، مقابل معدل أسبوعي ${n1(m.b)} للأحداث السلبية في الأسابيع الأربعة السابقة، أي ${rel}. وزن هذا الزخم الآن ×${ST.w}.`, `Last seven days: ${nEvents(m.n7)} negative and ${nEvents(m.p7)} positive verified, against a weekly average of ${n1(m.b)} negative events over the previous four weeks (${rel}). Momentum weight is now ×${ST.w}.`)));
}
function spark(series, Y) {
  const ys = Object.keys(series || {}).map(Number).filter(y => y >= Y - 10 && y <= Y + 1).sort((a, b) => a - b);
  if (ys.length < 3) return null;
  const vs = ys.map(y => series[y]); const lo = Math.min(0, ...vs), hi = Math.max(...vs, 1);
  const W = 300, H = 70, x = i => 6 + i * (W - 12) / (ys.length - 1), y = v => H - 8 - (v - lo) / (hi - lo || 1) * (H - 16);
  const ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg'); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'fc-spark'); svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', L('النمو الحقيقي السنوي حسب صندوق النقد الدولي: ', 'Real GDP growth, IMF: ') + ys.map(y2 => `${y2}: ${n1(series[y2])}`).join(L('، ', ', ')));
  const zero = document.createElementNS(ns, 'line'); zero.setAttribute('x1', 0); zero.setAttribute('x2', W); zero.setAttribute('y1', y(0)); zero.setAttribute('y2', y(0)); zero.setAttribute('class', 'z'); svg.append(zero);
  const past = ys.map((yy, i) => [x(i), y(series[yy]), yy]).filter(p => p[2] < Y), fut = ys.map((yy, i) => [x(i), y(series[yy]), yy]).filter(p => p[2] >= Y - 1 && (p[2] >= Y || p === undefined || true));
  const path = (pts, cls) => { const p = document.createElementNS(ns, 'polyline'); p.setAttribute('points', pts.map(q => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')); p.setAttribute('class', cls); svg.append(p); };
  path(past, 'l'); path(fut.filter(p => p[2] >= Y - 1), 'f');
  for (const p of past.concat(fut.filter(q => q[2] >= Y))) { const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); c.setAttribute('r', p[2] >= Y ? 3.2 : 2.2); c.setAttribute('class', p[2] >= Y ? 'pf' : 'pl'); svg.append(c); }
  return svg;
}
function renderEconomy() {
  const c = country(ST.c), body = $('#eco-body'); body.textContent = '';
  const Y = new Date().getUTCFullYear(), I = c.inputs, S = c.series || {};
  const tbl = el('table', 'fc-tbl'); tbl.append(el('thead'), el('tbody'));
  const th = el('tr'); [L('المؤشر', 'Indicator'), L('مطابقة آخر سنة فعلية: صندوق النقد / البنك الدولي', 'Last actual year: IMF / World Bank'), `${Y} (${L('إسقاط صندوق النقد', 'IMF projection')})`, `${Y + 1} (${L('إسقاط صندوق النقد', 'IMF projection')})`, L('المصادر', 'Sources')].forEach(x => th.append(el('th', null, x))); tbl.tHead.append(th);
  for (const [k, name] of [['growth', L('النمو الحقيقي ٪', 'Real growth %')], ['inflation', L('التضخم ٪', 'Inflation %')], ['unemployment', L('البطالة ٪', 'Unemployment %')]]) {
    const x = I[k]; if (!x) continue; const tr = el('tr');
    const chk = x.check; const ct = el('td', 'num');
    if (chk) { ct.append(`${chk.year}: ${n1(chk.imf)} / ${n1(chk.wb)} `); const ok = el('span', 'fc-ok ' + (chk.agree ? 'y' : 'n'), chk.agree ? L('متطابقتان', 'agree') : L(`فارق ${n1(chk.diff)}`, `gap ${n1(chk.diff)}`)); ct.append(ok); } else ct.append('—');
    const imf = S['imf_' + k] || {};
    const td = el('td'); td.append(gradeBadge(x.grade), ' ', srcLinks(x.src));
    tr.append(el('td', null, name), ct, el('td', 'num', n1(imf[Y])), el('td', 'num', n1(imf[Y + 1])), td);
    tbl.tBodies[0].append(tr);
  }
  const wrap = el('div', 'fc-tbl-wrap'); wrap.append(label(tbl));
  if (!tbl.tBodies[0].children.length) { body.append(el('p', 'mute', L('لا تتوفر لهذه الدولة بيانات اقتصادية موثّقة من مؤسستين في هذه الدورة، فلا نعرض أرقاماً لها.', 'No economic data from two institutions is available for this country in this cycle, so no figures are shown.'))); return; }
  body.append(wrap);
  const eo = M.economyOutlook(c, {sc: ST.s, h: ST.h});
  if (eo) {
    const p = el('p', 'fc-eco');
    p.append(L(`تقديرنا للنمو في ${eo.year} تحت سيناريو «${N(SCN[ST.s])}»: `, `Our ${eo.year} growth estimate under the "${N(SCN[ST.s])}" scenario: `), el('b', 'num', `${n1(eo.point)}${PCT()}`),
      L(` بنطاق ${n1(eo.lo)} إلى ${n1(eo.hi)}${PCT()}. الأساس إسقاط صندوق النقد ${n1(eo.imf)}${PCT()}، وأثر السيناريو ${sgn(eo.shift)} نقطة، والنطاق من تذبذب النمو الفعلي في ${eo.n_hist} سنوات سابقة (انحراف معياري ${n1(eo.sd)}).`, ` within ${n1(eo.lo)} to ${n1(eo.hi)}%. Base: IMF projection ${n1(eo.imf)}%, scenario effect ${sgn(eo.shift)} pt, range from the volatility of actual growth over ${eo.n_hist} past years (standard deviation ${n1(eo.sd)}).`));
    if (ST.h < 90) p.append(' ', el('span', 'mute', L('المدى المختار قصير على الاقتصاد الكلي، فنعرض تقدير السنة الجارية.', 'The chosen horizon is short for macroeconomics, so the current-year estimate is shown.')));
    body.append(p);
  }
  if (I.oil_rents) body.append(el('p', 'mute fc-eco-n', L(`ريع النفط ${n1(I.oil_rents.v)}٪ من الناتج (البنك الدولي، ${I.oil_rents.year})، ويحدد أثر سيناريوهات أسعار النفط.`, `Oil rents ${n1(I.oil_rents.v)}% of GDP (World Bank, ${I.oil_rents.year}); this sets the effect of the oil-price scenarios.`)));
  const sp = spark(S.imf_growth, Y); if (sp) { const f = el('figure', 'fc-fig'); f.append(sp, el('figcaption', 'mute', L('النمو السنوي حسب صندوق النقد: الخط المتصل فعلي، والمتقطع إسقاط.', 'Annual growth, IMF: solid line actual, dashed projection.'))); body.append(f); }
}
function renderEvidence() {
  const body = $('#ev-body'); body.textContent = '';
  const since = Date.now() - 14 * 864e5;
  const list = EV.filter(e => e.c === ST.c && (ST.a === 'all' || e.a === ST.a) && Date.parse(e.t) >= since).slice(0, 14);
  if (!list.length) { body.append(el('p', 'mute', L('لا أحداث موثّقة بجهتين لهذا الاختيار في الأسبوعين الأخيرين؛ يستند التقدير هنا إلى المؤشرات البنيوية أساساً، فيتسع نطاق الثقة.', 'No two-outlet events for this selection in the last two weeks; the estimate rests mainly on structural indicators, so the confidence range widens.'))); return; }
  const ul = el('ul', 'fc-ev');
  for (const e of list) {
    const li = el('li'); li.dataset.pol = e.pol;
    const meta = el('div', 'fc-ev-m'); meta.append(el('span', 'fc-pol', e.pol < 0 ? L('يرفع الخطر', 'raises risk') : L('يخفض الخطر', 'lowers risk')), el('span', 'fc-asp-t', N(ASP[e.a])), el('span', 'mute', fmtDate(doha(new Date(e.t)))));
    li.append(meta, el('p', 'fc-ev-t', e.title));
    const s = el('p', 'fc-ev-s'); s.append(L(`${e.sources.length} جهات مستقلة: `, `${e.sources.length} independent outlets: `));
    e.sources.forEach((x, i) => { if (i) s.append(' · '); const a = el('a', null, x.name || x.url); a.href = x.url; a.target = '_blank'; a.rel = 'noopener'; s.append(a); });
    li.append(s); ul.append(li);
  }
  body.append(ul);
  body.append(el('p', 'mute fc-small', L('التصنيف آلي بقاموس معلن في المنهجية، وقد يخطئ في عنوان بعينه؛ لذلك يدخل كل حدث بوزن صغير، ويُعرض هنا لتراجعه بنفسك.', 'Classification is automatic using the dictionary published in the method and may misread a given headline; each event therefore carries a small weight and is shown here for you to check.')));
}
function report(f) {
  const c = country(ST.c), a = ST.a, Y = new Date().getUTCFullYear();
  const P = [];
  P.push(L(`تقدير ${aspectName(a) === t('all') ? 'الوضع العام' : 'الجانب ' + aspectName(a)} في ${c.ar} خلال ${N(HZ[ST.h])} وفق سيناريو «${N(SCN[ST.s])}»: ${N(OUT[f.outlook])}. احتمال التدهور ${pc(f.p_worse)} بنطاق ثقة من ${pc(f.ci[0])} إلى ${pc(f.ci[1])}، واحتمال التحسن ${pc(f.p_better)}، واحتمال بقاء الوضع على حاله ${pc(f.p_stable)}.`,
    `Outlook for ${a === 'all' ? 'the overall situation' : 'the ' + aspectName(a).toLowerCase() + ' aspect'} in ${c.en} over ${N(HZ[ST.h])} under the "${N(SCN[ST.s])}" scenario: ${N(OUT[f.outlook])}. Probability of deterioration ${pc(f.p_worse)} (confidence range ${pc(f.ci[0])} to ${pc(f.ci[1])}), of improvement ${pc(f.p_better)}, and of no material change ${pc(f.p_stable)}.`));
  const S = M.structural(c, WARS), bits = [];
  if (c.inputs.wgi_pv) bits.push(L(`مؤشر البنك الدولي للاستقرار السياسي وغياب العنف ${n2(c.inputs.wgi_pv.v)} على مقياس من −2.5 إلى +2.5 (${c.inputs.wgi_pv.year})`, `the World Bank political stability score of ${n2(c.inputs.wgi_pv.v)} on a −2.5 to +2.5 scale (${c.inputs.wgi_pv.year})`));
  if (S.war.wars.length) { const w = S.war.wars[0], war = WARS.find(x => x.id === w.id); bits.push(L(`ارتباطها بـ${war ? war.name.ar : w.id} (المستوى الحالي: ${w.level === 'escalation' ? 'تصعيد' : w.level === 'tense' ? 'متوتر' : 'هادئ'})`, `its link to ${war ? war.name.en : w.id} (current level: ${w.level})`)); }
  if (c.ci_index) bits.push(L(`مؤشر الاستقرار اليومي في قسم الأوضاع ${c.ci_index.score}/100`, `the daily stability index of ${c.ci_index.score}/100`));
  if (bits.length) P.push(L('يستند التقدير أساساً إلى ', 'The estimate rests mainly on ') + bits.join(L('، وإلى ', ', ')) + '.');
  const evs = EV.filter(e => e.c === ST.c && (a === 'all' || e.a === a) && Date.now() - Date.parse(e.t) < 7 * 864e5);
  const neg = evs.filter(e => e.pol < 0).length, pos = evs.length - neg;
  P.push(L(`وفي الأيام السبعة الأخيرة رصدنا ${nEvents(neg)} ترفع الخطر و${nEvents(pos)} تخفضه، وكلها مؤكدة من جهتين مستقلتين.`, `In the last seven days we recorded ${nEvents(neg)} raising risk and ${nEvents(pos)} lowering it, each confirmed by two independent outlets.`) + (evs[0] ? L(` أحدثها: «${evs[0].title}».`, ` Latest: "${evs[0].title}".`) : ''));
  if (a === 'all' || a === 'economy') { const eo = M.economyOutlook(c, {sc: ST.s, h: ST.h}); if (eo) P.push(L(`اقتصادياً، يُسقط صندوق النقد الدولي نمواً بنسبة ${n1(eo.imf)}٪ في ${eo.year}، وتقديرنا تحت هذا السيناريو ${n1(eo.point)}٪ بنطاق ${n1(eo.lo)} إلى ${n1(eo.hi)}٪.`, `Economically, the IMF projects ${n1(eo.imf)}% growth in ${eo.year}; under this scenario our estimate is ${n1(eo.point)}% (range ${n1(eo.lo)} to ${n1(eo.hi)}%).`)); }
  if (ST.s === 'base') { const pes = compute(ST.c, {s: 'pessimistic'}), opt = compute(ST.c, {s: 'optimistic'}), esc = compute(ST.c, {s: 'escalation'});
    P.push(L(`ما الذي قد يغيّر الصورة؟ في السيناريو المتشائم يرتفع احتمال التدهور إلى ${pc(pes.p_worse)}، وفي المتفائل ينخفض إلى ${pc(opt.p_worse)}، ومع تصعيد إقليمي يبلغ ${pc(esc.p_worse)}.`, `What could change the picture? In the pessimistic scenario the probability of deterioration rises to ${pc(pes.p_worse)}, in the optimistic one it falls to ${pc(opt.p_worse)}, and with regional escalation it reaches ${pc(esc.p_worse)}.`)); }
  else { const b = compute(ST.c, {s: 'base'}); P.push(L(`للمقارنة: في السيناريو الأساسي احتمال التدهور ${pc(b.p_worse)}. افتراض هذا السيناريو: ${SCN[ST.s].note_ar}`, `For comparison: in the baseline the probability is ${pc(b.p_worse)}. This scenario assumes: ${SCN[ST.s].note_en}`)); }
  P.push(L(`هذا تقدير احتمالي آلي لا خبر مؤكد، محسوب في ${fmtDate(doha(new Date(F.updated)))} الساعة ${hmDoha(F.updated)} بتوقيت الدوحة بمنهجية «عبدو نيوز» المعلنة (الإصدار ${M.VERSION}).`, `This is an automatic probabilistic estimate, not confirmed news, computed on ${fmtDate(doha(new Date(F.updated)))} at ${hmDoha(F.updated)} Doha time with Abdo News's published method (version ${M.VERSION}).`));
  return P;
}
function renderReport(f) { const b = $('#rep-body'); b.textContent = ''; for (const p of report(f)) b.append(el('p', null, p)); }
function renderBoard() {
  const ids = visible();
  const rows = ids.map(id => ({id, f: compute(id)})).sort((a, b) => b.f.p_worse - a.f.p_worse);
  $('#board-sub').textContent = `${aspectName(ST.a)} · ${N(HZ[ST.h])} · ${N(SCN[ST.s])}`;
  const lg = $('#legend'); lg.textContent = '';
  for (const k of ['improve', 'stable', 'watch', 'deteriorate']) { const s = el('span', 'fc-lg'); const i = el('i'); i.style.background = OUT[k].color; s.append(i, N(OUT[k])); lg.append(s); }
  const tiles = $('#tiles'); tiles.textContent = '';
  for (const {id, f} of rows) {
    const p = TILE[id]; if (!p) continue;
    const b = el('button', 'fc-tile'); b.type = 'button'; b.setAttribute('role', 'listitem'); b.style.gridColumn = String(p[0]); b.style.gridRow = String(p[1]); b.style.setProperty('--oc', f.color); if (inkOn(f.color)) b.style.color = '#14212E';
    if (id === ST.c) b.setAttribute('aria-current', 'true');
    b.append(el('span', 'fc-tile-n', N(F.countries[id])), el('b', 'num', pc(f.p_worse)));
    b.setAttribute('aria-label', `${N(F.countries[id])}: ${N(OUT[f.outlook])}، ${pc(f.p_worse)}`);
    b.onclick = () => { set({c: id}); $('#result').scrollIntoView({behavior: 'smooth', block: 'start'}); };
    tiles.append(b);
  }
  const tb = $('#rank'); tb.textContent = '';
  const cap = el('caption', 'sr', L('ترتيب الدول حسب احتمال التدهور', 'Countries ranked by probability of deterioration')); tb.append(cap);
  const hd = el('tr'); [L('الدولة', 'Country'), L('التوقع', 'Outlook'), L('احتمال التدهور', 'P(worse)'), L('نطاق الثقة', 'Confidence range'), L('احتمال التحسن', 'P(better)')].forEach(x => hd.append(el('th', null, x)));
  const th = el('thead'); th.append(hd); tb.append(th); const bd = el('tbody'); tb.append(bd);
  for (const {id, f} of rows) {
    const tr = el('tr'); if (id === ST.c) tr.className = 'cur';
    const a = el('a', null, N(F.countries[id])); a.href = '#' + new URLSearchParams({c: id, a: ST.a, h: ST.h, s: ST.s, w: ST.w}); a.onclick = e => { e.preventDefault(); set({c: id}); $('#result').scrollIntoView({behavior: 'smooth'}); };
    const td0 = el('td'); td0.append(a);
    const tg = el('span', 'fc-dot'); tg.style.background = f.color; const td1 = el('td'); td1.append(tg, ' ', N(OUT[f.outlook]));
    const td2 = el('td', 'num'); const m = el('span', 'fc-mini'); const i = el('i'); i.style.width = f.p_worse * 100 + '%'; i.style.background = f.color; m.append(i); td2.append(el('b', null, pc(f.p_worse)), m);
    tr.append(td0, td1, td2, el('td', 'num', `${pc(f.ci[0])}–${pc(f.ci[1])}`), el('td', 'num', pc(f.p_better)));
    bd.append(tr);
  }
}
function renderRecord() {
  const r = F.record || {}, b = $('#rec-body'); b.textContent = '';
  if (!r.resolved) {
    const first = r.since ? new Date(Date.parse(r.since) + 7 * 864e5).toISOString().slice(0, 10) : null;
    b.append(el('p', null, L(`بدأ تسجيل التوقعات في ${r.since ? fmtDate(r.since) : '—'}. نحفظ كل يوم لقطة لتوقعات الأسبوع والشهر لكل دولة وجانب (${r.pending || 0} توقعاً قيد الانتظار)، ونحسمها آلياً بعد انقضاء المدى من سجل الأحداث الموثّقة نفسه، ثم ننشر مؤشر براير ونسبة الإصابة هنا كما هي، صحيحة كانت أو خاطئة. أول حسم في ${first ? fmtDate(first) : '—'}.`,
      `Forecast logging began on ${r.since ? fmtDate(r.since) : '—'}. Each day we store a snapshot of the one-week and one-month forecasts for every country and aspect (${r.pending || 0} pending), resolve them automatically once the horizon passes using the same verified event record, and publish the Brier score and hit rate here as they are, right or wrong. First resolution on ${first ? fmtDate(first) : '—'}.`)));
    return;
  }
  const tbl = el('table', 'fc-tbl'); const hd = el('tr'); [L('المدى', 'Horizon'), L('توقعات محسومة', 'Resolved'), L('مؤشر براير (الأقل أفضل)', 'Brier score (lower is better)'), L('براير المرجعي (المعدل العام)', 'Reference (base rate)'), L('نسبة الإصابة', 'Hit rate')].forEach(x => hd.append(el('th', null, x)));
  tbl.append(el('thead'), el('tbody')); tbl.tHead.append(hd);
  for (const h of ['7', '30']) { const x = r.by?.[h]; if (!x?.n) continue; const tr = el('tr'); tr.append(el('td', null, N(HZ[+h])), el('td', 'num', x.n), el('td', 'num', n2(x.brier)), el('td', 'num', n2(x.climatology)), el('td', 'num', pc(x.hit))); tbl.tBodies[0].append(tr); }
  const w = el('div', 'fc-tbl-wrap'); w.append(label(tbl)); b.append(w);
  b.append(el('p', 'mute fc-small', L('التوقع ناجح حين يكون مؤشر براير أدنى من المرجعي، أي أفضل من تخمين المعدل العام وحده.', 'A forecast adds value when its Brier score is below the reference, i.e. better than guessing the base rate alone.')));
}
function renderMethod() {
  const b = $('#met-body'); b.textContent = '';
  const sec = (h, ...ps) => { const d = el('div', 'fc-met'); d.append(el('h3', null, h)); for (const p of ps) d.append(typeof p === 'string' ? el('p', null, p) : p); b.append(d); };
  const ol = items => { const o = el('ol'); for (const x of items) { const li = el('li'); if (typeof x === 'string') li.textContent = x; else li.append(...x); o.append(li); } return o; };
  const a = (txt, href) => { const x = el('a', null, txt); x.href = href; x.target = '_blank'; x.rel = 'noopener'; return x; };
  sec(L('1. ما الذي نتوقعه؟', '1. What do we forecast?'),
    L('لكل دولة وجانب ومدى: احتمال «التدهور الملموس» واحتمال «التحسن» والباقي «بقاء الوضع على حاله». التدهور الملموس يعني أن تبلغ الأحداث السلبية الموثّقة خلال المدى ضعف معدلها الأسبوعي المعتاد (وحدثين على الأقل). هذا التعريف نفسه يُستعمل لحسم التوقعات في سجل الدقة.', 'For each country, aspect and horizon: the probability of "material deterioration", of "improvement", and the remainder "no material change". Material deterioration means verified negative events over the horizon reaching twice their normal weekly rate (and at least two). The same definition resolves forecasts in the track record.'));
  sec(L('2. المدخلات ودرجة توثيقها', '2. Inputs and their grades'),
    ol([
      [el('b', null, L('صندوق النقد الدولي', 'IMF')), L(': النمو الحقيقي والتضخم والبطالة، فعلياً وإسقاطاً (آفاق الاقتصاد العالمي). ', ': real growth, inflation and unemployment, actual and projected (World Economic Outlook). '), a('DataMapper', 'https://www.imf.org/external/datamapper/')],
      [el('b', null, L('البنك الدولي', 'World Bank')), L(': المؤشرات نفسها فعلياً، للمطابقة مع صندوق النقد في آخر سنة فعلية مشتركة، وريع النفط من الناتج. ', ': the same indicators (actuals) to cross-check the IMF in the latest common year, plus oil rents as a share of GDP. '), a(L('مؤشرات التنمية', 'WDI'), 'https://data.worldbank.org/')],
      [el('b', null, L('مؤشرات الحوكمة العالمية', 'Worldwide Governance Indicators')), L(': الاستقرار السياسي وغياب العنف، وفاعلية الحكومة (−2.5 إلى +2.5). ', ': political stability and absence of violence, and government effectiveness (−2.5 to +2.5). '), a('WGI', 'https://www.worldbank.org/en/publication/worldwide-governance-indicators')],
      [el('b', null, L('ملفات الحروب في عبدو نيوز', 'Abdo News war files')), L(': مستوى كل حرب (هادئ/متوتر/تصعيد) محسوب من حوادث موثّقة بجهتين، وجدول ارتباط الدول بكل حرب منشور أدناه.', ': each war\'s level (calm/tense/escalation) computed from two-outlet incidents; the country-war link table is below.')],
      [el('b', null, L('قسم الأوضاع في الدول', 'Country situations desk')), L(': مؤشر الاستقرار اليومي (0–100) حين يتوفر للدولة.', ': the daily stability index (0–100) where available.')],
      [el('b', null, L('الأحداث', 'Events')), L(': عناوين لا تدخل إلا إذا نشرتها جهتان مستقلتان على الأقل (نسخ وكالة واحدة جهة واحدة)، من أقسام عبدو نيوز الموضوعية والعسكرية والحروب ومن أخبار Google بعد فك روابطها إلى المقال الأصلي. تُحفظ 35 يوماً.', ': headlines count only if at least two independent outlets published them (copies of one wire are one outlet), drawn from Abdo News\'s desks, military and war files and from Google News after resolving to the original article. Kept for 35 days.')]
    ]),
    L('درجات التوثيق: «أ» مؤسستان مستقلتان متطابقتان في آخر سنة فعلية (ضمن نقطة للنمو، و1.5 للتضخم والبطالة)؛ «أ−» مؤسستان بينهما فارق أكبر يُعرض رقمه؛ «ب» مؤسسة دولية رسمية واحدة (مؤشرات الحوكمة وريع النفط)، ونقرنها بسجل الأحداث الموثّقة بجهتين. أي مدخل بلا مصدر لا يدخل الحساب.', 'Grades: "A" two independent institutions agree in the latest actual year (within 1 pt for growth, 1.5 for inflation and unemployment); "A−" two institutions with a larger gap, shown; "B" one official international institution (governance indicators, oil rents), paired with the two-outlet event record. No unsourced input enters the calculation.'));
  sec(L('3. الحساب', '3. The calculation'),
    L('أ) الخطر البنيوي لكل جانب (0 إلى 1) متوسط مرجّح لمكوّناته: الاستقرار السياسي = (2.5 − القيمة) ÷ 5، والحرب = مستواها (تصعيد 1، متوتر 0.6، هادئ 0.25) × وزن ارتباط الدولة، والاقتصاد = متوسط دوال لوجستية للنمو (حول 1.5٪) والتضخم (حول 6٪) والبطالة (حول 8٪)، ومؤشر الاستقرار اليومي = 1 − الدرجة ÷ 100. الأوزان: السياسي (استقرار 0.45، فاعلية 0.15، يومي 0.4)، العسكري (حرب 0.65، استقرار 0.2)، الأمني (استقرار 0.45، حرب 0.3، يومي 0.25)، الاقتصادي (كلي 0.8، يومي 0.2)، الاحتجاجات (استقرار 0.5، ضغط معيشي 0.35، فاعلية 0.15)، الخارجي (حرب 0.55، استقرار 0.45).', 'a) Structural risk per aspect (0 to 1) is a weighted mean of its components: stability = (2.5 − value) ÷ 5; war = level (escalation 1, tense 0.6, calm 0.25) × the country\'s link weight; economy = mean of logistic functions of growth (around 1.5%), inflation (around 6%) and unemployment (around 8%); daily index = 1 − score ÷ 100. Weights: political (stability 0.45, effectiveness 0.15, daily 0.4), military (war 0.65, stability 0.2), security (stability 0.45, war 0.3, daily 0.25), economic (macro 0.8, daily 0.2), protests (stability 0.5, cost of living 0.35, effectiveness 0.15), foreign (war 0.55, stability 0.45).'),
    L('ب) الزخم = (أحداث سلبية في 7 أيام − معدلها الأسبوعي في الأسابيع الأربعة السابقة) ÷ √(المعدل + 1)، محصوراً بين −3 و+3، ومثله للإيجابية.', 'b) Momentum = (negative events in 7 days − their weekly rate over the previous four weeks) ÷ √(rate + 1), capped at ±3; likewise for positive events.'),
    L('ج) أرجحية التدهور لشهر = −0.9 + 2.4 × (الخطر البنيوي − 0.4) + 0.45 × الوزن × الزخم السلبي × خ − 0.15 × الوزن × الزخم الإيجابي × خ + إزاحة السيناريو، حيث خ = e^(−(المدى − 7) ÷ 90) يُضعف أثر الأحداث الأخيرة كلما طال المدى. ثم الاحتمال = 1 − (1 − σ(الأرجحية))^√(المدى ÷ 30). وللتحسن صيغة مماثلة، ومجموع التدهور والتحسن لا يتجاوز 92٪.', 'c) Log-odds of deterioration for one month = −0.9 + 2.4 × (structural risk − 0.4) + 0.45 × weight × negative momentum × d − 0.15 × weight × positive momentum × d + scenario shift, where d = e^(−(horizon − 7) ÷ 90) fades recent events over longer horizons. Probability = 1 − (1 − σ(log-odds))^√(horizon ÷ 30). Improvement uses a similar formula; deterioration plus improvement is capped at 92%.'),
    L('د) نطاق الثقة = ± (0.06 + 0.12 × (1 − التغطية) + 0.05 × ln(المدى ÷ 7) ÷ ln(52))، والتغطية من عدد المكوّنات المتوفرة وعدد الأحداث. الإجمالي متوسط مرجّح للجوانب، ويزيد وزن العسكري والأمني بقدر تعرّض الدولة لحرب.', 'd) Confidence range = ± (0.06 + 0.12 × (1 − coverage) + 0.05 × ln(horizon ÷ 7) ÷ ln(52)), where coverage reflects available components and event counts. The overall figure is a weighted mean of aspects, with military and security weighted up by war exposure.'),
    L('هـ) الاقتصاد بالأرقام: إسقاط صندوق النقد + أثر السيناريو، ونطاقه من الانحراف المعياري للنمو الفعلي في السنوات السابقة (دون 2020).', 'e) Economy figures: IMF projection + scenario effect, with a range from the standard deviation of actual growth in previous years (excluding 2020).'));
  sec(L('4. السيناريوهات', '4. Scenarios'), ol(M.SCENARIOS.map(s => [el('b', null, N(s) + ': '), L(s.note_ar, s.note_en)])));
  const wl = Object.entries(M.WAR_LINKS).map(([w, m]) => { const war = WARS.find(x => x.id === w); return [el('b', null, (war ? N(war.name) : w) + ': '), Object.entries(m).map(([c, v]) => `${F.countries[c] ? N(F.countries[c]) : c} ${v}`).join(L('، ', ', '))]; });
  sec(L('5. ارتباط الدول بالحروب', '5. Country–war links'), ol(wl));
  if (LEXICON) { const pre = el('details', 'fc-lex'); pre.append(el('summary', null, L('قاموس تصنيف الأحداث (كما يعمل المحرك حرفياً)', 'Event classification dictionary (exactly as the engine uses it)'))); for (const [k, v] of Object.entries(LEXICON)) { pre.append(el('h4', null, N(ASP[k])), el('code', null, `− ${v.neg.ar}\n− ${v.neg.en}\n+ ${v.pos.ar}\n+ ${v.pos.en}`)); } b.append(pre); }
  sec(L('6. حدود هذا النموذج', '6. Limits of this model'),
    L('هذه نسخة أولى بأوزان وضعناها اجتهاداً معلناً لا بتدريب إحصائي على تاريخ طويل، وسيكشف سجل الدقة مدى صلاحها، ونعدّلها علناً برقم إصدار جديد. المؤشرات المؤسسية سنوية وقد تتأخر عن الأحداث، والتصنيف الآلي للعناوين قد يخطئ في عنوان بعينه، والأحداث المفاجئة غير المسبوقة لا يتنبأ بها أي نموذج. لا تُبنى على هذه التقديرات قرارات استثمار أو سفر أو أمن.', 'This is a first version whose weights are a published judgement rather than statistically trained on a long history; the track record will show how well they hold, and we will revise them openly under a new version number. Institutional indicators are annual and can lag events, automatic headline classification can misread a given headline, and no model foresees unprecedented shocks. Do not base investment, travel or security decisions on these estimates.'));
  const m2 = el('p', 'mute fc-small', L(`آخر حساب: ${fmtDate(doha(new Date(F.updated)))} ${hmDoha(F.updated)} بتوقيت الدوحة. آخر جلب للمؤشرات المؤسسية: ${F.indicators_fetched ? fmtDate(doha(new Date(F.indicators_fetched))) : '—'}. الأحداث في السجل: ${F.events_count}. البيانات الخام: `, `Last computed: ${fmtDate(doha(new Date(F.updated)))} ${hmDoha(F.updated)} Doha time. Institutional indicators fetched: ${F.indicators_fetched ? fmtDate(doha(new Date(F.indicators_fetched))) : '—'}. Events on record: ${F.events_count}. Raw data: `));
  m2.append(a('forecast.json', '../data/forecast.json'), ' · ', a('events.json', '../data/forecast/events.json'), ' · ', a('history.json', '../data/forecast/history.json'), ' · ', a(L('النموذج', 'model'), '../assets/forecast-model.js'));
  b.append(m2);
}
function render() {
  controls();
  const f = compute(ST.c);
  renderResult(f); renderAspects(); renderReport(f); renderDrivers(f); renderEconomy(); renderEvidence(); renderBoard();
  $('#economy').hidden = !(ST.a === 'all' || ST.a === 'economy');
}

/* ---------- الأحداث ---------- */
$('#f-country').onchange = e => set({c: e.target.value});
$('#f-scen').onchange = e => set({s: e.target.value});
$('#f-w').oninput = e => { $('#f-w-v').textContent = '×' + e.target.value; clearTimeout(set.t); set.t = setTimeout(() => set({w: +e.target.value}), 120); };
$('#b-share').onclick = async () => { try { await navigator.clipboard.writeText(location.href); toast(L('نُسخ الرابط', 'Link copied')); } catch (e) { toast(location.href); } };
$('#b-copy').onclick = async () => { const txt = report(compute(ST.c)).join('\n\n') + '\n\n' + location.href; try { await navigator.clipboard.writeText(txt); toast(L('نُسخ التقرير', 'Report copied')); } catch (e) { toast(L('تعذّر النسخ', 'Copy failed')); } };
$('#b-print').onclick = () => window.print();
$('#lang-btn').onclick = () => { LANG = LANG === 'en' ? 'ar' : 'en'; document.documentElement.lang = LANG; document.documentElement.dir = LANG === 'en' ? 'ltr' : 'rtl'; try { localStorage.setItem('khabar-lang', LANG); } catch (e) {} header(); render(); renderRecord(); renderMethod(); };
$('#theme-btn').onclick = () => { const r = document.documentElement; const dark = r.dataset.theme === 'dark' || (!r.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); r.dataset.theme = dark ? 'light' : 'dark'; try { localStorage.setItem('khabar-theme', r.dataset.theme); } catch (e) {} header(); };
window.addEventListener('hashchange', () => { readHash(); render(); });

(async function init() {
  header();
  const get = u => fetch(u, {cache: 'no-cache'}).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const [f, ev, w, ad] = await Promise.allSettled([get('../data/forecast.json'), get('../data/forecast/events.json'), get('../data/wars.json'), get('../data/admin.json')]);
  if (f.status !== 'fulfilled') { $('#result').append(el('p', 'fc-warn', L('تعذّر تحميل بيانات التوقعات الآن. أعد المحاولة بعد قليل.', 'Forecast data could not be loaded. Please try again shortly.'))); return; }
  F = f.value; for (const id of Object.keys(F.countries)) F.countries[id].id = id;
  if (ev.status === 'fulfilled') { EV = ev.value.events || []; LEXICON = ev.value.lexicon || null; }
  if (w.status === 'fulfilled') WARS = w.value.wars || [];
  if (ad.status === 'fulfilled' && ad.value) ADMIN = ad.value;
  if (ADMIN.forecast_default && F.countries[ADMIN.forecast_default]) ST.c = ADMIN.forecast_default;
  readHash();
  if (!F.countries[ST.c] || (ADMIN.forecast_hidden || []).includes(ST.c)) ST.c = visible()[0];
  render(); renderRecord(); renderMethod();
})();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('../sw.js', {scope: '../'}).catch(() => {});
