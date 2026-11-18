// «خبر»: محرك «التوقعات: استقراء المستقبل». يعمل كل 3 ساعات من khabar.yml (ويعيده الطيار الآلي إن تأخر)، دون أي جلسة محرر.
//  1) المؤشرات المؤسسية (مرة في الأسبوع): صندوق النقد الدولي (آفاق الاقتصاد العالمي) والبنك الدولي (مؤشرات التنمية والحوكمة).
//     النمو والتضخم والبطالة تُطابَق بين المؤسستين في آخر سنة فعلية؛ ما تختلفان فيه يُعلَن ويتسع نطاقه.
//  2) الأحداث: عناوين موثّقة بجهتين مستقلتين على الأقل (من الأقسام الموضوعية والعسكري والحروب وقسم الأوضاع في الدول وأخبار Google)،
//     تُصنَّف آلياً إلى ستة جوانب (سياسي، عسكري، أمني، اقتصادي، احتجاجات، علاقات خارجية) واتجاه (سلبي/إيجابي)، وتُحفظ 35 يوماً.
//  3) النموذج المعلن assets/forecast-model.js (نفسه في صفحة الزائر) يحسب احتمال التدهور والتحسن ونطاق الثقة لكل دولة وجانب.
//  4) سجل الدقة: لقطة يومية للتوقعات، تُحسم بعد انقضاء المدى من سجل الأحداث نفسه، ويُحسب مؤشر براير.
// الاستخدام: node khabar/scripts/forecast.mjs [--no-news] [--refresh] [--dry]
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const KH = join(HERE, '..'), DATA = join(KH, 'data');
const ARGS = process.argv.slice(2);
const M = await import('data:text/javascript;base64,' + Buffer.from(readFileSync(join(KH, 'assets/forecast-model.js'))).toString('base64'));
const UA = {'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 khabar-forecast'};
// واجهات المؤسسات ترفض وكيل المتصفح المنتحل، فنعرّف المحرك باسمه الصريح
const API_UA = {'user-agent': 'khabar-forecast/1.0 (+https://munjiz-qa.github.io/khabar/forecast/)', accept: 'application/json'};
const readJSON = (f, d) => { try { return JSON.parse(readFileSync(join(DATA, f), 'utf8')); } catch (e) { return d; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dohaDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Qatar'}).format(d);
const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const STATS = {imf: 0, wb: 0, google: 0, decoded: 0, events_new: 0, failed: []};
async function getJSON(u, tries = 3, ms = 60000) {
  for (let i = 0; i < tries; i++) {
    try { const r = await fetch(u, {headers: API_UA, signal: AbortSignal.timeout(ms)}); if (!r.ok) throw new Error(r.status); return await r.json(); }
    catch (e) { if (i === tries - 1) throw new Error(e.message + ' ' + u); await sleep(3000 * (i + 1)); }
  }
}
const CFG = readJSON('forecast/countries.json', {countries: []}).countries;
const BYID = Object.fromEntries(CFG.map(c => [c.id, c]));

/* ---------- 1) المؤشرات المؤسسية ---------- */
const IMF_IND = {growth: 'NGDP_RPCH', inflation: 'PCPIPCH', unemployment: 'LUR'};
const WB_IND = {growth: 'NY.GDP.MKTP.KD.ZG', inflation: 'FP.CPI.TOTL.ZG', unemployment: 'SL.UEM.TOTL.ZS', oil_rents: 'NY.GDP.PETR.RT.ZS'};
const WGI_IND = {wgi_pv: 'GOV_WGI_PV.EST', wgi_ge: 'GOV_WGI_GE.EST'};
export const SRC = {
  imf: {ar: 'صندوق النقد الدولي: آفاق الاقتصاد العالمي (DataMapper)', en: 'IMF World Economic Outlook (DataMapper)', page: (ind, c) => `https://www.imf.org/external/datamapper/${ind}@WEO/${c}`, api: (ind, c) => `https://www.imf.org/external/datamapper/api/v1/${ind}/${c}`},
  wb: {ar: 'البنك الدولي: مؤشرات التنمية العالمية', en: 'World Bank World Development Indicators', page: (ind, c) => `https://data.worldbank.org/indicator/${ind}?locations=${c}`, api: (ind, c) => `https://api.worldbank.org/v2/country/${c}/indicator/${ind}?format=json`},
  wgi: {ar: 'البنك الدولي: مؤشرات الحوكمة العالمية', en: 'World Bank Worldwide Governance Indicators', page: () => 'https://www.worldbank.org/en/publication/worldwide-governance-indicators', api: (ind, c) => `https://api.worldbank.org/v2/country/${c}/indicator/${ind}?source=3&format=json`}
};
const TOL = {growth: 1.0, inflation: 1.5, unemployment: 1.5};

async function imfSeries(ind) {
  const codes = CFG.map(c => c.imf).join('/');
  const j = await getJSON(`https://www.imf.org/external/datamapper/api/v1/${ind}/${codes}`); STATS.imf++;
  return j.values?.[ind] || {};
}
async function wbSeries(ind, source) {
  const Y = new Date().getUTCFullYear();
  const j = await getJSON(`https://api.worldbank.org/v2/country/${CFG.map(c => c.wb).join(';')}/indicator/${ind}?format=json&per_page=2000&date=${Y - 14}:${Y}${source ? '&source=' + source : ''}`, 3, 90000); STATS.wb++;
  const out = {};
  for (const r of (Array.isArray(j) && j[1]) || []) { if (r.value == null) continue; (out[r.countryiso3code] ||= {})[r.date] = Math.round(r.value * 1000) / 1000; }
  return out;
}
async function indicators(force) {
  const prev = readJSON('forecast/indicators.json', null);
  if (!force && prev && Date.now() - Date.parse(prev.fetched) < 7 * 864e5) return prev;
  const out = {fetched: new Date().toISOString(), imf: {}, wb: {}, wgi: {}};
  for (const [k, ind] of Object.entries(IMF_IND)) { try { out.imf[k] = await imfSeries(ind); } catch (e) { STATS.failed.push('imf ' + k + ': ' + e.message); out.imf[k] = prev?.imf?.[k] || {}; } }
  for (const [k, ind] of Object.entries(WB_IND)) { try { out.wb[k] = await wbSeries(ind); } catch (e) { STATS.failed.push('wb ' + k + ': ' + e.message); out.wb[k] = prev?.wb?.[k] || {}; } await sleep(1500); }
  for (const [k, ind] of Object.entries(WGI_IND)) { try { out.wgi[k] = await wbSeries(ind, 3); } catch (e) { STATS.failed.push('wgi ' + k + ': ' + e.message); out.wgi[k] = prev?.wgi?.[k] || {}; } await sleep(1500); }
  // لا نستبدل سجلاً سليماً بسجل فارغ إن تعطّلت المؤسستان معاً
  const filled = Object.values(out.imf).some(x => Object.keys(x).length) && Object.values(out.wb).some(x => Object.keys(x).length);
  if (!filled && prev) return prev;
  writeFileSync(join(DATA, 'forecast/indicators.json'), JSON.stringify(out) + '\n');
  return out;
}
// مدخلات دولة واحدة، ولكل رقم مصدره ودرجة توثيقه: أ = مؤسستان مستقلتان متطابقتان، ب = مؤسسة دولية رسمية واحدة
function inputsOf(c, IND) {
  const Y = new Date().getUTCFullYear(), I = {}, series = {};
  for (const k of Object.keys(IMF_IND)) {
    const im = IND.imf[k]?.[c.imf] || {}, wb = IND.wb[k]?.[c.wb] || {};
    series['imf_' + k] = Object.fromEntries(Object.entries(im).filter(([y]) => +y >= Y - 12 && +y <= Y + 2));
    const cur = im[Y] ?? im[Y - 1];
    // سنة المطابقة: آخر سنة فعلية لدى المؤسستين
    const common = Object.keys(wb).map(Number).filter(y => y < Y && im[y] != null).sort((a, b) => b - a)[0];
    const chk = common ? {year: common, imf: im[common], wb: wb[common], diff: Math.round(Math.abs(im[common] - wb[common]) * 10) / 10} : null;
    if (chk) chk.agree = chk.diff <= TOL[k];
    if (cur == null && !chk) continue;
    I[k] = {v: cur ?? chk.wb, year: im[Y] != null ? Y : Y - 1, grade: chk?.agree ? 'A' : chk ? 'A-' : 'B', check: chk,
      src: [{id: 'imf', ar: SRC.imf.ar, en: SRC.imf.en, url: SRC.imf.page(IMF_IND[k], c.imf)}, {id: 'wb', ar: SRC.wb.ar, en: SRC.wb.en, url: SRC.wb.page(WB_IND[k], c.iso2)}]};
  }
  const or = M.latest(IND.wb.oil_rents?.[c.wb]);
  if (or) I.oil_rents = {v: or.v, year: or.y, grade: 'B', src: [{id: 'wb', ar: SRC.wb.ar, en: SRC.wb.en, url: SRC.wb.page(WB_IND.oil_rents, c.iso2)}]};
  for (const k of Object.keys(WGI_IND)) {
    const l = M.latest(IND.wgi[k]?.[c.wb]);
    if (l) I[k] = {v: l.v, year: l.y, grade: 'B', src: [{id: 'wgi', ar: SRC.wgi.ar, en: SRC.wgi.en, url: SRC.wgi.page()}, {id: 'wgi-api', ar: 'واجهة بيانات البنك الدولي', en: 'World Bank data API', url: SRC.wgi.api(WGI_IND[k], c.wb)}]};
  }
  return {inputs: I, series};
}

/* ---------- 2) الأحداث ---------- */
// القاموس المعلن للتصنيف: لكل جانب كلمات سلبية (تدهور) وإيجابية (تحسن)
export const LEX = {
  politics: {neg: {ar: /استقال|حل البرلمان|حل مجلس|أزمة سياسية|انقلاب|حجب الثقة|سحب الثقة|اعتقال (معارض|زعيم|رئيس)|عزل الرئيس|انسداد سياسي|انتخابات مبكرة|فراغ رئاسي/, en: /\bresign|no.confidence|\bcoup\b|political crisis|impeach|dissolv(e|es|ed) parliament|snap election|government collapse|deadlock/i},
    pos: {ar: /تشكيل (ال)?حكومة|اتفاق سياسي|مصالحة وطنية|حوار وطني|نيل الثقة|منح الثقة/, en: /government formed|forms? (a )?government|coalition deal|national dialogue|reconciliation deal|wins? confidence vote/i}},
  military: {neg: {ar: /غار(ة|ات)|قصف|هجوم|صاروخ|صواريخ|مسيّ?ر(ة|ات)|اشتباك|توغل|اجتياح|عملية عسكرية|ضربة|ضربات|تعبئة|حشود/, en: /air.?strikes?|\bstrikes? on\b|missile|drone attack|shelling|offensive|incursion|invasion|clashes|bombard|mobiliz|troops? (deploy|mass)/i},
    pos: {ar: /هدنة|وقف (إطلاق )?النار|انسحاب|تبادل (ال)?أسرى|خفض التصعيد/, en: /ceasefire|cease-fire|truce|withdraw|prisoner (swap|exchange)|de-escalat/i}},
  security: {neg: {ar: /تفجير|انفجار|إرهاب|اغتيال|اختطاف|إطلاق (نار|الرصاص)|طعن|مسلحين|مسلحون|عبوة ناسفة|هجوم إرهابي/, en: /bombing|explosion|terror|assassinat|kidnap|shooting|stabbing|gunmen|militants|\bIED\b|car bomb/i},
    pos: {ar: /إحباط|ضبط خلية|تفكيك خلية|القبض على خلية/, en: /\bfoiled\b|thwart|cell dismantled|plot (foiled|disrupted)/i}},
  economy: {neg: {ar: /تضخم|ركود|انكماش|خفض (ال)?تصنيف|عجز (ال)?(موازنة|ميزان|ميزانية)|انهيار (ال)?عملة|تراجع (ال)?(جنيه|ريال|ليرة|دينار)|بطالة|إفلاس|تعثر (في )?سداد|أزمة ديون/, en: /inflation (rise|jump|surge|accelerat|hit)|recession|contraction|downgrade|deficit widen|currency (plunge|slump|crash)|unemployment (rise|jump)|default|bankrupt/i},
    pos: {ar: /نمو (ال)?(اقتصاد|ناتج)|رفع (ال)?تصنيف|فائض|استثمارات? (جديدة|بقيمة)|تراجع (ال)?تضخم|انخفاض (ال)?تضخم|قرض من صندوق النقد|صفقة بقيمة/, en: /economy grew|growth (beat|accelerat|rose)|upgrade|surplus|investment deal|inflation (eas|slow|fall|cool)|record (exports|investment)|IMF (approves|loan|deal)/i}},
  protests: {neg: {ar: /احتجاج|تظاهر|مظاهر(ة|ات)|إضراب|اعتصام|عصيان|شغب|مسيرة احتجاجية/, en: /protest|demonstrat|\brally\b|riot|unrest|general strike|workers strike|sit-in|march(ed|es)? against/i},
    pos: {ar: /إنهاء (ال)?إضراب|تعليق (ال)?احتجاج|الاستجابة لمطالب/, en: /strike (ends|called off)|protests? (end|subside)|meets? protesters' demands/i}},
  foreign: {neg: {ar: /عقوبات|استدعاء (ال)?سفير|طرد (ال)?سفير|طرد دبلوماسي|قطع (ال)?علاقات|توتر (دبلوماسي|العلاقات)|تهديد|تحذير شديد|احتجاج رسمي/, en: /sanction|expel|summon(s|ed)? (the )?ambassador|sever(s|ed)? ties|diplomatic row|tension|threaten|warns? of retaliation/i},
    pos: {ar: /قمة|اتفاقية|اتفاق|زيارة رسمية|توقيع|وساطة|تعاون|مباحثات|محادثات|شراكة|تطبيع|استئناف العلاقات/, en: /summit|agreement|accord|state visit|signed|mediation|cooperation|talks|partnership|normali[sz]|restore(s|d)? ties/i}}
};
const nameRe = c => ({ar: new RegExp('(^|[^\\p{L}])(?:و|ب|ل|ف)?(?:ال)?(' + c.names.ar.map(n => n.replace(/^ال/, '')).join('|') + ')', 'u'), en: new RegExp('\\b(' + c.names.en.map(n => n.replace(/\./g, '\\.')).join('|') + ')(?![a-z])')});
const NRE = Object.fromEntries(CFG.map(c => [c.id, nameRe(c)]));
const isAr = s => /[؀-ۿ]/.test(s);
// كلمات تقلب الإيجابي سلبياً («الهدنة مهددة بالانهيار»)، وعناوين الأسواق لا تُحسب إلا في الجانب الاقتصادي
const UNDO = {ar: /انهيار|تهدد|يهدد|مهدد|خرق|انتهاك|تعثر|فشل|تعليق|رفض/, en: /collapse|threat|violat|breach|fail|stall|suspend|reject|jeopard/i};
const MARKET = {ar: /أسعار النفط|النفط يرتفع|النفط يتراجع|الأسهم|البورصة|الذهب|سعر الصرف/, en: /oil prices|crude|stocks|shares|gold price|bond yields|futures/i};
// الرياضة لا تدخل الحساب (مباراة «تونس أمام ليبيا» ليست حدثاً سياسياً)
const SPORT = {ar: /منتخب|مباراة|مباريات|الدوري|كأس|هدف|أهداف|لاعب|مدرب|ركلة|جزاء|التعادل|المونديال|بطولة|نادي|الفيفا|تصفيات/, en: /\bfootball|soccer|\bmatch\b|league|\bcup\b|\bgoal|coach|striker|penalty|FIFA|qualifier|tennis|\bNBA\b|cricket|Olympic/i};
export function classify(title) {
  const lang = isAr(title) ? 'ar' : 'en', out = [], market = MARKET[lang].test(title);
  if (SPORT[lang].test(title)) return out;
  for (const a of M.ASPECTS.map(x => x.id)) {
    const L = LEX[a]; if (market && a !== 'economy') continue;
    if (L.neg[lang].test(title)) out.push({a, pol: -1}); else if (L.pos[lang].test(title)) out.push({a, pol: UNDO[lang].test(title) ? -1 : 1});
  }
  return out;
}
export function countriesIn(title) { const lang = isAr(title) ? 'ar' : 'en'; return CFG.filter(c => NRE[c.id][lang].test(title)).map(c => c.id); }
// الجهة المستقلة: الوكالة بين قوسين في اسم المصدر (نسخ وكالة واحدة جهة واحدة)، وإلا النطاق
const host = u => { try { return new URL(u).hostname.replace(/^(www|amp|m|en|english|arabic)\./, ''); } catch (e) { return ''; } };
const outlet = u => { const p = host(u).split('.'); return p.length > 2 && ['co', 'com', 'org', 'net', 'gov'].includes(p[p.length - 2]) ? p.slice(-3).join('.') : p.slice(-2).join('.'); };
const WIRE = /\((أسوشيتد برس|فرانس برس|رويترز|AP|AFP|Reuters)\)/i;
const party = s => { const w = (s.name || '').match(WIRE); return w ? 'wire:' + w[1].toLowerCase().replace('أسوشيتد برس', 'ap').replace('فرانس برس', 'afp').replace('رويترز', 'reuters') : outlet(s.url); };
function twoSourced(sources) {
  const ok = (sources || []).filter(s => /^https:\/\//.test(s.url || '') && !host(s.url).endsWith('google.com'));
  const by = new Map(); for (const s of ok) { const p = party(s); if (p && !by.has(p)) by.set(p, s); }
  return by.size >= 2 ? [...by.values()].slice(0, 5) : null;
}
function addEvents(store, {title, t, sources, from, onlyC}) {
  const src = twoSourced(sources); if (!src || !title) return 0;
  const cs = onlyC ? [onlyC].filter(id => NRE[id][isAr(title) ? 'ar' : 'en'].test(title)) : countriesIn(title);
  let n = 0;
  for (const c of cs) for (const {a, pol} of classify(title)) {
    const id = 'fe-' + hash(c + a + title.replace(/\s+/g, ' ').trim().slice(0, 120));
    if (store.has(id)) continue;
    store.set(id, {id, c, a, pol, title: title.slice(0, 240), t: new Date(t).toISOString(), from, sources: src.map(s => ({name: s.name, url: s.url, date: s.date || dohaDay(new Date(t))}))});
    n++;
  }
  return n;
}
function fromSiteData(store) {
  let n = 0;
  // الأقسام الموضوعية (كل خبر فيها عنقود من جهتين بروابطه)
  const desks = readJSON('desks.json', {desks: {}});
  for (const d of Object.values(desks.desks || {})) for (const i of d.items || []) n += addEvents(store, {title: i.title, t: i.t, sources: i.sources, from: 'desks'});
  // القسم العسكري وملفات الحروب: المصادر بمعرّفاتها
  const mil = readJSON('military.json', {}), wars = readJSON('wars.json', {});
  const res = (ids, S) => (ids || []).map(id => S?.[id]).filter(Boolean).map(s => ({name: s.ar || s.en, url: s.url, date: s.date}));
  for (const r of mil.regions || []) for (const i of r.items || []) n += addEvents(store, {title: i.ar || i.en, t: mil.published || mil.date, sources: res(i.src, mil.sources), from: 'military'});
  for (const w of wars.wars || []) for (const e of (w.timeline || []).slice(0, 25)) n += addEvents(store, {title: e.ar || e.en, t: e.date + 'T12:00:00Z', sources: res(e.src, wars.sources), from: 'wars'});
  // قسم «الأوضاع في الدول» (data/countries.json): أي قائمة أخبار موثّقة داخل ملف الدولة
  const ck = readJSON('countries.json', null);
  if (ck?.countries) for (const [cid, cd] of Object.entries(ck.countries)) {
    const iso = CFG.find(c => c.ck === cid)?.id; if (!iso) continue;
    const walk = (o, depth) => { if (!o || depth > 4) return; if (Array.isArray(o)) { for (const x of o) { if (x && typeof x === 'object' && Array.isArray(x.sources) && (x.title || x.ar || x.en)) n += addEvents(store, {title: x.title || x.ar || x.en, t: x.t || x.date || ck.updated, sources: x.sources, from: 'countries', onlyC: iso}); else walk(x, depth + 1); } } else if (typeof o === 'object') for (const v of Object.values(o)) walk(v, depth + 1); };
    walk(cd, 0);
  }
  return n;
}
// أخبار Google بالتدوير: 6 دول في كل تشغيل (كل دولة كل 12 ساعة تقريباً)، والرابط الأصلي بعد فكّه
async function fromGoogle(store) {
  let decodeGoogle, cluster;
  try { ({decodeGoogle, cluster} = await import('./milwatch.mjs')); } catch (e) { STATS.failed.push('milwatch import ' + e.message); return 0; }
  const ent = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&');
  const text = s => ent(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  const tag = (x, t) => (x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '';
  const N = 6, start = Math.floor(Date.now() / (3 * 3600e3)) * N % CFG.length;
  const pick = [...CFG.slice(start), ...CFG.slice(0, start)].slice(0, N);
  let n = 0, budget = 40;
  for (const c of pick) for (const lang of ['ar', 'en']) {
    const q = '(' + c.names[lang].slice(0, 3).map(x => `"${x}"`).join(' OR ') + ') when:3d';
    const loc = lang === 'ar' ? 'hl=ar&gl=QA&ceid=QA:ar' : 'hl=en-US&gl=US&ceid=US:en';
    let items;
    try {
      const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${loc}`, {headers: UA, signal: AbortSignal.timeout(20000)});
      if (!r.ok) throw new Error(r.status); STATS.google++;
      items = (await r.text()).split(/<item[\s>]/).slice(1).map(it => { let title = text(tag(it, 'title')); const source = text(tag(it, 'source')); if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3)); return {title, source, glink: text(tag(it, 'link')), outlet: source, t: +new Date(text(tag(it, 'pubDate')))}; })
        .filter(x => x.title && !isNaN(x.t) && classify(x.title).length && NRE[c.id][lang].test(x.title));
    } catch (e) { STATS.failed.push(`google ${c.id}/${lang}: ${e.message}`); if (/429/.test(e.message)) return n; continue; }
    await sleep(1200);
    for (const cl of cluster(items).slice(0, 6)) {
      const srcs = [];
      for (const h of cl.items) {
        if (budget <= 0 || srcs.length >= 3) break;
        budget--; const u = await decodeGoogle(h.glink); await sleep(300);
        if (u && /^https?:\/\//.test(u) && !host(u).endsWith('google.com')) { STATS.decoded++; srcs.push({name: h.source, url: u.replace(/^http:/, 'https:'), date: dohaDay(new Date(h.t))}); }
      }
      n += addEvents(store, {title: cl.items[0].title, t: cl.t, sources: srcs, from: 'google', onlyC: c.id});
    }
  }
  return n;
}

/* ---------- 4) سجل الدقة ---------- */
function track(history, events, F, today) {
  const D = 864e5, now = Date.now();
  // لقطة يومية واحدة: مدى أسبوع وشهر لكل دولة وجانب
  if (!history.snaps.some(s => s.d === today)) {
    for (const [iso, c] of Object.entries(F)) for (const [a, x] of Object.entries(c.f7)) history.snaps.push({d: today, c: iso, a, h: 7, p: x.p_worse, b: x.momentum.base_neg});
    for (const [iso, c] of Object.entries(F)) for (const [a, x] of Object.entries(c.aspects)) history.snaps.push({d: today, c: iso, a, h: 30, p: x.p_worse, b: x.momentum.base_neg});
  }
  // الحسم: «تدهور» إذا بلغت الأحداث السلبية الموثّقة بعد اللقطة ضعف معدلها الأسبوعي (وحدثين على الأقل) خلال المدى
  for (const s of history.snaps) {
    if (s.o != null) continue;
    const t0 = Date.parse(s.d + 'T00:00:00+03:00'), t1 = t0 + s.h * D; if (t1 > now) continue;
    const n = events.filter(e => e.c === s.c && e.a === s.a && e.pol < 0 && Date.parse(e.t) > t0 && Date.parse(e.t) <= t1).length;
    s.o = n >= Math.max(2, Math.ceil(2 * (s.b || 0) * s.h / 7)) ? 1 : 0; s.n = n;
  }
  history.snaps = history.snaps.filter(s => now - Date.parse(s.d) < 400 * D);
  const done = history.snaps.filter(s => s.o != null);
  const brier = xs => xs.length ? Math.round(xs.reduce((a, s) => a + (s.p - s.o) ** 2, 0) / xs.length * 1000) / 1000 : null;
  const base = xs => { if (!xs.length) return null; const r = xs.reduce((a, s) => a + s.o, 0) / xs.length; return Math.round(xs.reduce((a, s) => a + (r - s.o) ** 2, 0) / xs.length * 1000) / 1000; };
  const by = {}; for (const h of [7, 30]) { const xs = done.filter(s => s.h === h); by[h] = {n: xs.length, brier: brier(xs), climatology: base(xs), hit: xs.length ? Math.round(xs.filter(s => (s.p >= 0.5 ? 1 : 0) === s.o).length / xs.length * 1000) / 1000 : null}; }
  return {since: history.snaps[0]?.d || today, resolved: done.length, pending: history.snaps.length - done.length, by};
}

/* ---------- التشغيل ---------- */
export async function runForecast({dry = false, news = true, refresh = false} = {}) {
  const IND = await indicators(refresh);
  const prevEv = readJSON('forecast/events.json', {events: []});
  const store = new Map((prevEv.events || []).filter(e => Date.now() - Date.parse(e.t) < 35 * 864e5).map(e => [e.id, e]));
  // يُعاد تصنيف المحفوظ بالقاموس الحالي في كل تشغيل، فيسقط ما لم يعد يطابقه
  for (const [id, e] of store) if (!classify(e.title).some(x => x.a === e.a && x.pol === e.pol) || !twoSourced(e.sources)) store.delete(id);
  const before = store.size;
  fromSiteData(store);
  if (news) STATS.events_new_google = await fromGoogle(store);
  STATS.events_new = store.size - before;
  const events = [...store.values()].sort((a, b) => Date.parse(b.t) - Date.parse(a.t));
  const wars = readJSON('wars.json', {wars: []}).wars || [];
  const ck = readJSON('countries.json', null);
  const admin = readJSON('admin.json', {});
  const now = Date.now(), today = dohaDay();
  const countries = {}, full = {};
  for (const cfg of CFG) {
    const {inputs, series} = inputsOf(cfg, IND);
    const ci = cfg.ck && ck?.countries?.[cfg.ck]?.index ? {score: ck.countries[cfg.ck].index.score, level: ck.countries[cfg.ck].index.level, trend: ck.countries[cfg.ck].index.trend, dims: ck.countries[cfg.ck].index.dims} : null;
    const c = {id: cfg.id, inputs, series, ci_index: ci};
    const f = M.forecastCountry(c, {h: 30, sc: 'base', wars, events, now});
    const f7 = M.forecastCountry(c, {h: 7, sc: 'base', wars, events, now}).aspects;
    full[cfg.id] = {...f, f7};
    const eco = M.economyOutlook(c, {sc: 'base', h: 365});
    countries[cfg.id] = {ar: cfg.ar, en: cfg.en, iso2: cfg.iso2, region: cfg.region, ck: cfg.ck || null,
      outlook: f.outlook, label: M.OUTLOOK[f.outlook], p_worse: f.p_worse, p_better: f.p_better, ci: f.ci, color: f.color,
      link: `forecast/#c=${cfg.id}`, page: cfg.ck ? `#c-${cfg.ck}` : null, war: f.war.wars,
      aspects: Object.fromEntries(Object.entries(f.aspects).map(([k, x]) => [k, {outlook: x.outlook, p_worse: x.p_worse, p_better: x.p_better, ci: x.ci, color: x.color, n7: x.momentum.n7 + x.momentum.p7}])),
      economy: eco, inputs, series, ci_index: ci, hidden: (admin.forecast_hidden || []).includes(cfg.id) || undefined};
  }
  const history = readJSON('forecast/history.json', {snaps: []});
  const record = track(history, events, full, today);
  const out = {updated: new Date().toISOString(), version: M.VERSION, horizon_days: 30, scenario: 'base',
    disclaimer: {ar: 'تقديرات احتمالية محسوبة آلياً بمنهجية معلنة، وليست أخباراً مؤكدة ولا توصيات.', en: 'Automatically computed probabilistic estimates with a published method; not confirmed news and not advice.'},
    rule: 'inputs: two institutions (IMF+World Bank) or one official institution (graded B); events: two independent outlets',
    indicators_fetched: IND.fetched, events_count: events.length, record, countries, stats: STATS};
  if (!dry) {
    writeFileSync(join(DATA, 'forecast/events.json'), JSON.stringify({updated: out.updated, rule: 'two-independent-outlets', lexicon: Object.fromEntries(Object.entries(LEX).map(([k, v]) => [k, {neg: {ar: v.neg.ar.source, en: v.neg.en.source}, pos: {ar: v.pos.ar.source, en: v.pos.en.source}}])), events}) + '\n');
    writeFileSync(join(DATA, 'forecast/history.json'), JSON.stringify(history) + '\n');
    writeFileSync(join(DATA, 'forecast.json'), JSON.stringify(out) + '\n');
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const o = await runForecast({dry: ARGS.includes('--dry'), news: !ARGS.includes('--no-news'), refresh: ARGS.includes('--refresh')});
  for (const [k, c] of Object.entries(o.countries)) console.log(k, c.outlook.padEnd(11), 'p_worse', c.p_worse, 'ci', c.ci.join('–'), 'growth', c.inputs.growth?.v, c.inputs.growth?.grade, 'pv', c.inputs.wgi_pv?.v);
  console.log('أحداث:', o.events_count, 'جديد:', STATS.events_new, 'سجل:', JSON.stringify(o.record));
  if (STATS.failed.length) console.log('تعذّر:', STATS.failed.slice(0, 20).join('\n'));
}
