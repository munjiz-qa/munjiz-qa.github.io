// «عبدو نيوز»: الرصد العسكري الآلي. يعمل داخل الطيار الآلي (autopilot.mjs) دون أي جلسة محرر.
//  - يجمع العناوين العسكرية من أخبار Google ومن خلاصات ناشرين مباشرة، بالعربية والإنجليزية.
//  - يجمع العناوين المتشابهة في عناقيد، ولا يقبل إلا عنقوداً نشرته جهتان مستقلتان على الأقل (قاعدة المصدرين)،
//    ولكل جهة رابط مقالها الأصلي (تُفك روابط أخبار Google، وما لا يُفك يُحذف).
//  - يكتب القسم العسكري الآلي (military.json) إن فات موعد القسم التحريري، ويضيف التطورات الموثّقة إلى ملفات الحروب (wars.json).
//  ثم تمر الملفات ببوابة khabar/agent/military.py --enforce في سير العمل.
import {readFileSync, writeFileSync} from 'node:fs';

const ROOT = 'khabar/data/';
const UA = {'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 khabar-milwatch'};
const readJSON = (f, d) => { try { return JSON.parse(readFileSync(ROOT + f, 'utf8')); } catch (e) { return d; } };
const writeJSON = (f, o) => writeFileSync(ROOT + f, JSON.stringify(o, null, 1) + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ent = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const text = s => ent(s || '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (x, t) => (x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '';
export const host = u => { try { return new URL(u).hostname.replace(/^(www|amp|m|en|english|arabic)\./, ''); } catch (e) { return ''; } };
export const outlet = u => { const p = host(u).split('.'); return p.length > 2 && ['co', 'com', 'org', 'net', 'gov'].includes(p[p.length - 2]) ? p.slice(-3).join('.') : p.slice(-2).join('.'); };
const dohaDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Qatar'}).format(d);

async function rss(url) {
  const r = await fetch(url, {headers: UA, signal: AbortSignal.timeout(20000)});
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return (await r.text()).split(/<item[\s>]|<entry[\s>]/).slice(1).map(it => {
    const d = new Date(text(tag(it, 'pubDate')) || text(tag(it, 'dc:date')) || text(tag(it, 'updated')) || text(tag(it, 'published')));
    const link = text(tag(it, 'link')) || (it.match(/<link[^>]*href="([^"]+)"/) || [])[1] || text((it.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) || [])[1]);
    return {title: text(tag(it, 'title')), link, source: text(tag(it, 'source')), d};
  }).filter(x => x.title && !isNaN(x.d));
}
export async function decodeGoogle(link) {
  const id = new URL(link).pathname.split('/').pop();
  for (const page of [`https://news.google.com/articles/${id}`, `https://news.google.com/rss/articles/${id}`]) {
    try {
      const h = await (await fetch(page, {headers: UA, signal: AbortSignal.timeout(15000)})).text();
      const sg = (h.match(/data-n-a-sg="([^"]+)"/) || [])[1], ts = (h.match(/data-n-a-ts="([^"]+)"/) || [])[1];
      if (!sg || !ts) continue;
      const req = [[['Fbv4je', `["garturlreq",[["X","X",["X","X"],null,null,1,1,"US:en",null,1,null,null,null,null,null,0,1],"X","X",1,[1,1,1],1,1,null,0,0,null,0],"${id}",${ts},"${sg}"]`]]];
      const r = await fetch('https://news.google.com/_/DotsSplashUi/data/batchexecute', {method: 'POST', signal: AbortSignal.timeout(15000),
        headers: {...UA, 'content-type': 'application/x-www-form-urlencoded;charset=UTF-8'}, body: 'f.req=' + encodeURIComponent(JSON.stringify(req))});
      const body = await r.text(), m = body.match(/\[\\"garturlres\\",\\"(https?:[^"\\]+)\\"/);
      if (m) return m[1];
      const j = JSON.parse(body.split('\n\n')[1]); const u = JSON.parse(j[0][2])[1];
      if (/^https?:\/\//.test(u)) return u;
    } catch (e) { /* الصفحة التالية */ }
  }
  return null;
}

// ---------- العناقيد: عنوانان من جهتين مستقلتين عن الحدث نفسه ----------
const STOP = new Set('the a an of to in on for and with at by from as is are was were be after amid over says said new its his her their into about than more how what why who will would could has have had not this that these those report reports live update updates news في من على إلى الى عن مع بعد قبل أن إن التي الذي هذا هذه ذلك تلك كان كانت قال قالت يقول تقول بين حول خلال عند أمام وسط ضد لدى منذ حتى أو ثم كما بها له لها هو هي اليوم الأحد الاثنين الإثنين الثلاثاء الأربعاء الخميس الجمعة السبت'.split(' '));
const norm = s => s.toLowerCase().replace(/[إأآا]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ً-ْـ]/g, '');
export const toks = s => new Set(norm(s).split(/[^\p{L}\p{N}]+/u).map(w => w.replace(/^(وال|بال|كال|فال|ال|و)(?=\p{L}{3,})/u, '')).filter(w => w.length >= 3 && !STOP.has(w)));
const sim = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return {n, j: n / Math.max(1, Math.min(a.size, b.size))}; };
export function cluster(list) {
  const cs = [];
  for (const h of list) {
    const t = toks(h.title); if (t.size < 3) continue;
    let best = null, bs = 0;
    for (const c of cs) { const s = sim(t, c.t); if (s.n >= 3 && s.j >= 0.42 && s.j > bs) { best = c; bs = s.j; } }
    if (best) { best.items.push(h); for (const x of t) best.t.add(x); } else cs.push({t, items: [h]});
  }
  return cs.map(c => {
    const by = new Map(); for (const h of c.items.sort((a, b) => b.t - a.t)) { const o = h.outlet || h.source; if (!by.has(o)) by.set(o, h); }
    return {items: [...by.values()], t: Math.max(...c.items.map(h => h.t))};
  }).filter(c => c.items.length >= 2).sort((a, b) => b.items.length - a.items.length || b.t - a.t);
}

// ---------- الرصد العسكري ----------
const MIL = {ar: /عسكري|الجيش|جيش|قوات|صاروخ|صواريخ|مسي[َّ]?رة|مسيرات|مسيّرات|غارة|غارات|هجوم|قصف|حرب|البحرية|دفاع|الناتو|الأطلسي|هدنة|إطلاق النار|اشتباك|سلاح|أسلحة|حاملة|مدمرة|الحرس الثوري|جنود|عملية/,
  en: /military|army|troops|missile|drone|strike|attack|navy|naval|air force|defen[cs]e|\bwar\b|ceasefire|truce|nato|shell|bomb|warship|carrier|soldier|weapon|arms|offensive|front ?line|frontline|militia|rebels?|irgc|pentagon|airstrike/i};
const SKIPM = /video game|movie|film|football|soccer|match|olympic|celebrity|recipe|horoscope|stock pick|مباراة|كرة القدم|الدوري|فيلم|مسلسل/i;
const REG = {
  europe: /ukrain|russia|kyiv|kiev|moscow|kremlin|nato|europe|poland|baltic|crimea|kerch|germany|german|france|french|britain|british|\buk\b|finland|sweden|norway|belarus|moldova|romania|أوكراني|روسي|كييف|موسكو|الكرملين|الناتو|الأطلسي|أوروب|بولند|البلطيق|القرم|كيرتش|ألماني|فرنس|بريطاني|فنلند|السويد/i,
  mideast: /iran|israel|gaza|leban|hezbollah|syria|yemen|houthi|iraq|saudi|bahrain|hormuz|red sea|qatar|uae|emirat|kuwait|oman|jordan|egypt|sinai|west bank|hamas|irgc|tehran|إيران|إسرائيل|غزة|لبنان|حزب الله|سوري|اليمن|الحوثي|العراق|السعودي|البحرين|هرمز|البحر الأحمر|قطر|الإمارات|الكويت|عمان|عُمان|الأردن|مصر|سيناء|الضفة|حماس|الحرس الثوري|طهران/i
};
const WAR = {iran: /iran|irgc|tehran|hormuz|إيران|الإيراني|الحرس الثوري|طهران|هرمز/i, yemen: /yemen|houthi|aden|اليمن|الحوثي|عدن/i,
  ukraine: /ukrain|kyiv|kiev|kerch|crimea|أوكراني|كييف|القرم|كيرتش/i, sudan: /sudan|rsf|darfur|kordofan|السودان|الدعم السريع|دارفور|كردفان/i,
  levant: /gaza|leban|hezbollah|hamas|west bank|غزة|لبنان|حزب الله|حماس|الضفة/i};
const ATTACK = /strike|attack|drone|missile|shell|killed|clash|bomb|raid|shot down|intercept|غارة|هجوم|قصف|مسيّرة|مسيرة|صاروخ|اشتباك|قتل|مقتل|اعتراض|أسقط/i;
const NOT_INCIDENT = /threat|threaten|warn|deni|plot|could|may |would|تهديد|يهدد|تحذير|يحذر|تنفي|نفي|خطة/i;
const isAttack = t => ATTACK.test(t) && !NOT_INCIDENT.test(t);
const Q = {
  europe: {ar: '(أوكرانيا OR روسيا OR الناتو OR أوروبا) (عسكري OR الجيش OR هجوم OR صواريخ OR مسيرات) when:1d', en: '(Ukraine OR Russia OR NATO OR Europe) (military OR troops OR strike OR drones OR missiles OR defence) when:1d'},
  mideast: {ar: '(إيران OR إسرائيل OR غزة OR لبنان OR اليمن OR الحوثي OR سوريا OR العراق OR هرمز) (عسكري OR هجوم OR غارة OR قصف OR صواريخ OR مسيرات) when:1d', en: '(Iran OR Israel OR Gaza OR Lebanon OR Yemen OR Houthi OR Syria OR Iraq OR Hormuz) (military OR strike OR attack OR drones OR missiles OR navy) when:1d'},
  world: {ar: '(السودان OR الصين OR تايوان OR كوريا OR الهند OR باكستان OR أفريقيا) (عسكري OR الجيش OR هجوم OR مناورات OR صواريخ) when:1d', en: '(Sudan OR China OR Taiwan OR Korea OR India OR Pakistan OR Africa OR Myanmar) (military OR army OR attack OR drills OR missile) when:1d'}
};
const DIRECT = {
  ar: ['https://feeds.bbci.co.uk/arabic/rss.xml', 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9', 'https://www.skynewsarabia.com/web/rss', 'https://www.france24.com/ar/rss', 'https://rss.dw.com/rdf/rss-ar-all', 'https://www.independentarabia.com/rss'],
  en: ['https://feeds.bbci.co.uk/news/world/rss.xml', 'https://www.aljazeera.com/xml/rss/all.xml', 'https://www.theguardian.com/world/rss', 'https://rss.dw.com/rdf/rss-en-world', 'https://www.france24.com/en/rss', 'https://www.defensenews.com/arc/outboundfeeds/rss/', 'https://breakingdefense.com/feed/', 'https://www.militarytimes.com/arc/outboundfeeds/rss/', 'https://feeds.npr.org/1004/rss.xml']
};
const region = t => REG.europe.test(t) && !REG.mideast.test(t) ? 'europe' : REG.mideast.test(t) ? 'mideast' : REG.europe.test(t) ? 'europe' : 'world';
const warOf = t => Object.keys(WAR).find(k => WAR[k].test(t)) || null;

export const STATS = {google: 0, decoded: 0, direct: 0, clusters: 0, failed: []};
async function gather(lang, since, decodeBudget) {
  const pool = [];
  for (const f of DIRECT[lang]) {
    try { for (const it of await rss(f)) { const url = it.link.replace(/^http:/, 'https:'); if (it.d >= since && /^https:\/\//.test(url) && MIL[lang].test(it.title) && !SKIPM.test(it.title)) { pool.push({title: it.title.slice(0, 240), source: it.source || host(f), url, outlet: outlet(url), t: +it.d}); STATS.direct++; } } }
    catch (e) { STATS.failed.push(`direct ${f}: ${e.message}`); }
  }
  const google = [];
  for (const r of Object.keys(Q)) {
    try {
      const loc = lang === 'ar' ? 'hl=ar&gl=QA&ceid=QA:ar' : 'hl=en-QA&gl=QA&ceid=QA:en';
      for (const it of (await rss(`https://news.google.com/rss/search?q=${encodeURIComponent(Q[r][lang])}&${loc}`)).slice(0, 25)) {
        let title = it.title; if (it.source && title.endsWith(' - ' + it.source)) title = title.slice(0, -(it.source.length + 3));
        if (it.d >= since && MIL[lang].test(title) && !SKIPM.test(title)) google.push({title: title.slice(0, 240), source: it.source, glink: it.link, outlet: it.source, t: +it.d});
      }
      STATS.google++;
    } catch (e) { STATS.failed.push(`google ${r}/${lang}: ${e.message}`); }
  }
  // تُفك روابط أخبار Google فقط للعناوين التي لها نظير لدى جهة أخرى، توفيراً للطلبات
  const all = [...pool, ...google], cs = cluster(all);
  const out = [];
  for (const c of cs) {
    const items = [];
    for (const h of c.items) {
      if (h.url) { items.push(h); continue; }
      if (decodeBudget.n <= 0) continue;
      decodeBudget.n--; const u = await decodeGoogle(h.glink); await sleep(350);
      if (u && /^https?:\/\//.test(u) && !host(u).endsWith('google.com')) { STATS.decoded++; items.push({...h, url: u.replace(/^http:/, 'https:'), outlet: outlet(u)}); }
    }
    const by = new Map(); items.forEach(h => { if (!by.has(h.outlet)) by.set(h.outlet, h); });
    if (by.size >= 2) out.push({lang, items: [...by.values()].slice(0, 4), t: c.t});
  }
  STATS.clusters += out.length;
  return out;
}

const RANK = id => String(id || '').slice(0, 10) + ({am: 1, md: 2, pm: 3, nt: 4}[String(id || '').slice(11)] || 0);
const ED_AR = {am: 'الصباح', md: 'الظهيرة', pm: 'المساء', nt: 'الليل'}, ED_EN = {am: 'Morning', md: 'Midday', pm: 'Evening', nt: 'Night'};
const NAME = {europe: ['أوروبا', 'Europe'], mideast: ['الشرق الأوسط', 'The Middle East'], world: ['العالم', 'The World']};

// exp: الخلاصة المتوقعة {id, date, edition}. يعيد ما كتبه.
export async function milwatch(exp, {force = false, dry = false} = {}) {
  const mil = readJSON('military.json', null), wars = readJSON('wars.json', null);
  const needMil = force || !mil || RANK(mil.id) < RANK(exp.id);
  const lastWar = wars?.auto_checked ? Date.now() - new Date(wars.auto_checked) : Infinity;
  const needWars = !!wars && (force || needMil || lastWar > 3 * 3600e3);
  if (!needMil && !needWars) return {mil: false, wars: 0, note: `القسم العسكري ${mil.id} في موعده.`};
  const since = Date.now() - 24 * 3600e3, budget = {n: 60};
  const clusters = [...await gather('ar', since, budget), ...await gather('en', since, budget)];
  const sources = {}; let k = 0;
  const srcIds = c => c.items.map(h => { const id = `mw-${exp.id.slice(5)}-${++k}`; sources[id] = {ar: h.source, en: h.source, date: dohaDay(new Date(h.t)), url: h.url}; return id; });
  let wroteMil = false;
  if (needMil) {
    const regions = Object.keys(NAME).map(id => ({id, name: {ar: NAME[id][0], en: NAME[id][1]}, items: []}));
    for (const c of clusters) {
      const r = regions.find(x => x.id === region(c.items.map(h => h.title).join(' ')));
      if (r.items.filter(i => i[c.lang]).length >= (c.lang === 'ar' ? 6 : 5)) continue;
      const lead = c.items[0], w = warOf(c.items.map(h => h.title).join(' '));
      r.items.push({id: `ma-${r.id}-${r.items.length + 1}`, cat: {ar: 'رصد آلي من جهتين فأكثر', en: 'Auto-watch, two or more outlets'}, ar: c.lang === 'ar' ? lead.title : '', en: c.lang === 'en' ? lead.title : '', src: srcIds(c), ...(w ? {war: w} : {}), ...(isAttack(lead.title) ? {kind: 'attack'} : {})});
    }
    const n = regions.reduce((s, r) => s + r.items.length, 0);
    if (n >= 3) {
      const out = {id: exp.id, edition: exp.edition, date: exp.date, published: new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 19) + '+03:00', auto: true,
        title: {ar: `القسم العسكري: رصد ${ED_AR[exp.edition]} الآلي`, en: `Military desk: automatic ${ED_EN[exp.edition]} watch`},
        regions, arms: (mil?.arms || []).filter(a => (a.src || []).every(s => mil.sources?.[s])), sources: {...sources}};
      for (const a of out.arms) for (const s of a.src) out.sources[s] = mil.sources[s];
      if (!dry) writeJSON('military.json', out); wroteMil = true;
    }
  }
  let added = 0;
  if (wars) {
    const seen = new Set(wars.wars.flatMap(w => (w.timeline || []).map(e => [...toks(e.ar || e.en || '')].sort().join(' '))));
    for (const c of clusters) {
      const w = wars.wars.find(x => x.id === warOf(c.items.map(h => h.title).join(' ')));
      if (!w) continue;
      const lead = c.items[0], key = [...toks(lead.title)].sort().join(' ');
      if (seen.has(key) || (w._added || 0) >= 3) continue;
      seen.add(key); w._added = (w._added || 0) + 1; added++;
      const ids = srcIds(c); for (const id of ids) wars.sources[id] = sources[id];
      w.timeline = [{date: dohaDay(new Date(c.t)), kind: isAttack(lead.title) ? 'attack' : 'report', auto: true, ar: c.lang === 'ar' ? lead.title : '', en: c.lang === 'en' ? lead.title : '', src: ids}, ...(w.timeline || [])];
    }
    wars.wars.forEach(w => delete w._added);
    wars.auto_checked = new Date().toISOString();
    if (added) wars.updated = wars.auto_checked;
    if (!dry) writeJSON('wars.json', wars);
  }
  return {mil: wroteMil, wars: added, clusters: clusters.length, stats: STATS};
}
