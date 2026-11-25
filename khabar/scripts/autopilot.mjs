// «عبدو نيوز»: الطيار الآلي. يعمل من GitHub Actions كل ساعة دون أي تدخل بشري أو جلسة محرر.
//  1. إذا فات موعد الخلاصة (كل 6 ساعات: 06:20 و12:20 و18:20 و00:20 بتوقيت الدوحة) ولم تُنشر، يكتب «خلاصة آلية» من عناوين المصادر نفسها:
//     كل خبر هو عنوان الجهة الناشرة كما نشرته، مع اسمها وتاريخها ورابط مقالها الأصلي (تُفك روابط أخبار Google إلى الرابط الأصلي، وما لا يُفك يُحذف).
//  2. يفحص الموقع المنشور ولوحاته وحداثة البيانات، ويكتب النتيجة في data/health.json، ويخرج بخطأ إن وُجد عطل حتى يصل التنبيه.
// الاستخدام: node khabar/scripts/autopilot.mjs [--force] [--dry] [--no-health]
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {milwatch, cluster, outlet} from './milwatch.mjs';

const ROOT = 'khabar/data/', ARGS = new Set(process.argv.slice(2));
const UA = {'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 khabar-autopilot'};
const readJSON = (f, d) => { try { return JSON.parse(readFileSync(ROOT + f, 'utf8')); } catch (e) { return d; } };
const writeJSON = (f, o) => writeFileSync(ROOT + f, JSON.stringify(o, null, 1) + '\n');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---------- الوقت بتوقيت الدوحة ----------
const doha = (d = new Date()) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Qatar', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(d).map(x => [x.type, x.value]));
  return {day: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute, iso: `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00+03:00`};
};
// أربع خلاصات يومياً كل 6 ساعات: الصباح 5:41، الظهيرة 11:41، المساء 17:41، الليل 23:41 بتوقيت الدوحة.
// الخلاصة المتوقعة بعد مهلة 40 دقيقة من موعدها: الصباح من 6:20، الظهيرة من 12:20، المساء من 18:20، الليل من 0:20 حتى 6:19.
const ED = {am: 1, md: 2, pm: 3, nt: 4};
const ED_AR = {am: 'الصباح', md: 'الظهيرة', pm: 'المساء', nt: 'الليل'}, ED_WHEN = {am: 'صباح', md: 'ظهيرة', pm: 'مساء', nt: 'ليلة'}, ED_EN = {am: 'Morning', md: 'Midday', pm: 'Evening', nt: 'Night'};
const rank = id => String(id || '').slice(0, 10) + (ED[String(id || '').slice(11)] || 0);
function expected(now = new Date()) {
  const t = doha(now), G = 20;
  const at = edition => ({id: t.day + '-' + edition, date: t.day, edition});
  if (t.min >= 18 * 60 + G) return at('pm');
  if (t.min >= 12 * 60 + G) return at('md');
  if (t.min >= 6 * 60 + G) return at('am');
  if (t.min >= G) { const y = doha(new Date(now - 864e5)).day; return {id: y + '-nt', date: y, edition: 'nt'}; }
  const y = doha(new Date(now - 864e5)).day; return {id: y + '-pm', date: y, edition: 'pm'};
}

// ---------- المصادر ----------
const Q = {
  qatar: {ar: '(قطر OR الدوحة OR القطري) when:1d', en: '(Qatar OR Doha) (Amir OR minister OR ministry OR government OR economy OR QatarEnergy OR "Qatar Airways" OR QNA) when:1d', must: {ar: /قطر|القطري|الدوحة/, en: /Qatar|Doha|Qatari/i}},
  gulf: {ar: '(السعودية OR الإمارات OR الكويت OR سلطنة عمان OR البحرين OR مجلس التعاون الخليجي) when:1d', en: '(Saudi OR UAE OR Kuwait OR Oman OR Bahrain OR GCC) when:1d', must: {ar: /السعودي|الإمارات|الكويت|عمان|عُمان|البحرين|الخليج|الرياض|أبوظبي|دبي|مسقط|المنامة/, en: /Saudi|UAE|Emirat|Kuwait|Oman|Bahrain|Gulf|GCC|Riyadh|Abu Dhabi|Dubai|Muscat|Manama/i}},
  egypt: {ar: '(مصر OR القاهرة OR المصري) when:1d', en: '(Egypt OR Cairo) when:1d', must: {ar: /مصر|المصري|القاهرة/, en: /Egypt|Cairo/i}},
  world: {ar: '(دولي OR العالم OR الأمم المتحدة OR واشنطن OR أوروبا OR الصين) when:1d', en: '("United Nations" OR summit OR diplomacy OR ceasefire OR election OR "global economy" OR markets) when:1d', must: {ar: /./, en: /./}}
};
// خلاصات ناشرين مباشرة (روابطها أصلية دون فك): احتياط إذا تعذّر فك روابط أخبار Google
const DIRECT = {
  qatar: {ar: ['https://www.skynewsarabia.com/web/rss'], en: ['https://www.aljazeera.com/xml/rss/all.xml']},
  gulf: {ar: ['https://www.skynewsarabia.com/web/rss'], en: ['https://www.aljazeera.com/xml/rss/all.xml']},
  egypt: {ar: ['https://www.youm7.com/rss/SectionRss?SectionID=65', 'https://www.masrawy.com/rss/feed/25/'], en: ['https://www.aljazeera.com/xml/rss/all.xml']},
  world: {ar: ['https://feeds.bbci.co.uk/arabic/rss.xml', 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9', 'https://www.skynewsarabia.com/web/rss'], en: ['https://feeds.bbci.co.uk/news/world/rss.xml', 'https://www.aljazeera.com/xml/rss/all.xml']}
};
// نجمع عناوين أكثر ثم لا نُبقي إلا ما نشرته جهتان مستقلتان على الأقل (قاعدة المصدرين، 17 نوفمبر 2026)
const PER_ZONE = {ar: 14, en: 12}, KEEP = {ar: 6, en: 5}, MAX_AGE_H = 24;
// تنظيف عنوان الناشر وفق STYLE.md (القسم 7): لاحقة اسم الموقع، كلمات الإثارة، النقطتان، التطويل، الفراغات.
export function cleanTitle(t, source = '') {
  let x = String(t || '').replace(/\s+/g, ' ').trim();
  if (source) for (const sep of [' - ', ' | ', ' – ', ' — ']) if (x.endsWith(sep + source)) x = x.slice(0, -(sep.length + source.length));
  x = x.replace(/\s[|–—-]\s[^|–—-]{2,28}$/, m => /[؀-ۿ]{2,}|[A-Z][a-z]+/.test(m) && !/\d/.test(m) && m.split(' ').length <= 5 ? '' : m);
  x = x.replace(/^(?:[A-Z][a-z]+ [A-Z][a-z]+ )?(?:latest|live)\s*:\s*/i, '').replace(/^(?:عاجل|خاص|بالفيديو|فيديو|بالصور|شاهد|شاهدوا|حصري|breaking|watch|exclusive|video|live)\s*[:|،\-–]?\s*/i, '')
    .replace(/\s*(?:\(|\[)?(?:فيديو|صور|بالفيديو|video|photos)(?:\)|\])\s*$/i, '');
  x = x.replace(/([ء-ي])ـ+([ء-ي])/g, '$1$2').replace(/ـ{2,}/g, 'ـ').replace(/الـ\s+(?=\d)/g, 'الـ');
  x = x.replace(/\s*(?:\.{2,}|…)\s*(?=\S)/g, (m, i) => (x.slice(0, i).split(' ').length <= 6 && !/^(?:بعد|عقب|رغم|مع|وسط|قبل|خلال|في)\s/.test(x) ? ': ' : '، ')).replace(/\s*(?:\.{2,}|…)\s*$/, '');
  x = x.replace(/\s+([،؛:.,!?؟])/g, '$1').replace(/!+/g, '').replace(/[.]+$/, '').replace(/\s+/g, ' ').trim();
  return x;
}
// عناوين الخدمات اليومية والأسئلة والإثارة لا تدخل الخلاصة الآلية
const FILLER = /مواقيت الصلاة|موعد (?:أذان|الصلاة|مباراة|مباريات)|مواعيد (?:القطارات|قطارات|مباريات|المباريات|الصرف)|تردد قناة|ترددات|بث مباشر|القنوات الناقلة|حالة الطقس اليوم|درجات الحرارة اليوم|أسعار .{0,45} اليوم|سعر .{0,45} اليوم|^الآن(?: في| ب)|نتيجة مباراة|تشكيل (?:الأهلي|الزمالك|منتخب)|حظك|الأبراج|live stream|how to watch|what time|kick-?off time|\bodds\b|predictions?\b|\bquiz\b/i;
const QUESTION = /[؟?]\s*$|^(?:كيف|ماذا|لماذا|هل|ما هو|ما هي|من هو|من هي|متى|أين|ما الذي|ما سبب|إليك|تعرف|تعرّف|what|why|how|who|when|where|is|are|can|will|should)\b/i;
// الوسم من موضوع العنوان بدل وسم عام
const TOPICS = [
  [/قمة|وزير الخارجية|سفير|زيارة|مباحثات|دبلوماس|الأمم المتحدة|مجلس الأمن|وساطة|summit|minister|ambassador|talks|diplomat|United Nations|mediat/i, ['دبلوماسية', 'Diplomacy']],
  [/هجوم|صاروخ|مسيّرة|مسيرة|غارة|غارات|اعتراض|قصف|عسكري|الجيش|قوات|الحوثي|قتلى|قتيل|attack|missile|drone|strike|military|army|troops|killed|Houthi/i, ['أمن', 'Security']],
  [/نفط|برنت|غاز|طاقة|أوبك|oil|Brent|gas|energy|OPEC|LNG/i, ['طاقة', 'Energy']],
  [/بورصة|أسهم|مؤشر|الدولار|الجنيه|الذهب|التضخم|الفائدة|اقتصاد|استثمار|تجارة|صفقة|بنك|stock|shares|index|dollar|gold|inflation|rate|econom|invest|trade|bank|market/i, ['اقتصاد', 'Economy']],
  [/مباراة|منتخب|الدوري|كأس|بطولة|لاعب|المدرب|هدف|ميدالية|match|league|cup|championship|player|coach|medal|goal/i, ['رياضة', 'Sport']],
  [/صحة|مستشفى|وباء|لقاح|مرض|health|hospital|vaccine|disease|outbreak/i, ['صحة', 'Health']],
  [/مناخ|طقس|أمطار|حرارة|فيضان|climate|weather|rain|flood|heat/i, ['طقس ومناخ', 'Weather & climate']],
  [/مهرجان|معرض|متحف|فيلم|ثقافة|كتاب|festival|exhibition|museum|film|culture|book/i, ['ثقافة', 'Culture']],
  [/انتخابات|البرلمان|الرئيس|الحكومة|حزب|قانون|election|parliament|president|government|party|law/i, ['سياسة', 'Politics']],
  [/ذكاء اصطناعي|تقنية|رقمي|تطبيق|AI\b|tech|digital|app\b|cyber/i, ['تقنية', 'Technology']]
];
const topic = t => (TOPICS.find(([re]) => re.test(t)) || [0, ['أخبار عامة', 'General']])[1];
const SKIP = /netflix|horror|celebrity|lifestyle|juniors|in video:|franchis|pizz|testimonial|horoscope|recipe|gymnast|coupon|promo code|lottery|برج|حظك|وصفة|سعر الذهب اليوم .* عيار|مواعيد مباريات اليوم/i;
const ent = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const text = s => ent(s || '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (x, t) => (x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '';
const host = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; } };
const iso = d => doha(d).day;

async function rss(url) {
  const r = await fetch(url, {headers: UA, signal: AbortSignal.timeout(20000)});
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return (await r.text()).split(/<item[\s>]/).slice(1).map(it => {
    const d = new Date(text(tag(it, 'pubDate')) || text(tag(it, 'dc:date')));
    return {title: text(tag(it, 'title')), link: text(tag(it, 'link')) || text((it.match(/<guid[^>]*>([\s\S]*?)<\/guid>/) || [])[1]), source: text(tag(it, 'source')), d};
  }).filter(x => x.title && !isNaN(x.d));
}

// فك رابط أخبار Google إلى رابط المقال الأصلي (الطريقة نفسها التي تستخدمها صفحة الإحالة)
async function decodeGoogle(link) {
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
      if (/^https:\/\//.test(u)) return u;
    } catch (e) { /* نجرب الصفحة التالية */ }
  }
  return null;
}

const STATS = {google: 0, decoded: 0, direct: 0, failed: []};
async function collect(zone, lang, since) {
  const q = Q[zone], out = [], seen = new Set();
  const take = (title, source, url, d) => {
    title = cleanTitle(title, source);
    if (FILLER.test(title) || QUESTION.test(title) || title.split(' ').length < 4) return;
    if (zone !== 'qatar' && Q.qatar.must[lang].test(title)) return; // ما يذكر قطر مكانه دائرة قطر
    const key = title.replace(/\W+/g, '').slice(0, 40);
    if (!title || !source || seen.has(key) || !/^https:\/\//.test(url) || host(url).endsWith('google.com') || !q.must[lang].test(title) || SKIP.test(title) || d < since) return;
    seen.add(key); out.push({title: title.slice(0, 240), source: source.slice(0, 80), url, date: iso(d), t: +d});
  };
  try {
    const loc = lang === 'ar' ? 'hl=ar&gl=QA&ceid=QA:ar' : 'hl=en-QA&gl=QA&ceid=QA:en';
    const items = (await rss(`https://news.google.com/rss/search?q=${encodeURIComponent(q[lang])}&${loc}`)).sort((a, b) => b.d - a.d);
    for (const it of items) {
      if (out.length >= PER_ZONE[lang] - 4) break; // نترك مكاناً لخلاصات الناشرين المباشرة لتنوع الجهات
      let title = it.title; if (it.source && title.endsWith(' - ' + it.source)) title = title.slice(0, -(it.source.length + 3));
      if (!q.must[lang].test(title) || SKIP.test(title) || it.d < since) continue;
      STATS.google++;
      const url = await decodeGoogle(it.link); await sleep(400);
      if (url) { STATS.decoded++; take(title, it.source, url.replace(/^http:/, 'https:'), it.d); }
    }
  } catch (e) { STATS.failed.push(`google ${zone}/${lang}: ${e.message}`); }
  for (const f of DIRECT[zone][lang]) {
    if (out.length >= PER_ZONE[lang]) break;
    try {
      const items = (await rss(f)).sort((a, b) => b.d - a.d);
      for (const it of items) { if (out.length >= PER_ZONE[lang]) break; const n = out.length; take(it.title, it.source || host(f), it.link.replace(/^http:/, 'https:'), it.d); if (out.length > n) STATS.direct++; }
    } catch (e) { STATS.failed.push(`direct ${f}: ${e.message}`); }
  }
  return out.sort((a, b) => b.t - a.t);
}

const ZNAME = {qatar: ['قطر', 'Qatar'], gulf: ['الخليج', 'The Gulf'], egypt: ['مصر', 'Egypt'], world: ['العالم', 'The World']};
async function autoBrief(exp, prev) {
  const since = Date.now() - MAX_AGE_H * 3600e3, sources = {}, zones = [];
  const USED = new Set();
  let total = 0;
  for (const z of Object.keys(Q)) {
    const items = [];
    for (const lang of ['ar', 'en']) {
      const got = await collect(z, lang, since);
      cluster(got.map(h => ({...h, outlet: outlet(h.url)}))).filter(c => { const k = c.items[0].title.replace(/\W+/g, '').slice(0, 40); if (USED.has(k)) return false; USED.add(k); return true; }).slice(0, KEEP[lang]).forEach((c, i) => {
        const src = c.items.slice(0, 3).map((h, j) => { const sid = `auto-${z}-${lang}${i + 1}-${j + 1}`; sources[sid] = {ar: h.source, en: h.source, date: h.date, url: h.url}; return sid; });
        const tp = topic(c.items[0].title);
        items.push({id: `${z[0]}${lang === 'ar' ? 'a' : 'e'}${i + 1}`, cat: {ar: tp[0], en: tp[1]}, confirmed: c.items.length, ar: lang === 'ar' ? c.items[0].title : '', en: lang === 'en' ? c.items[0].title : '', src});
      });
    }
    total += items.length;
    zones.push({id: z, name: {ar: ZNAME[z][0], en: ZNAME[z][1]}, items});
  }
  if (total < 8) return null; // لا تُستبدل خلاصة سابقة بخلاصة هزيلة
  const first = l => zones.map(z => z.items.find(i => i[l])).filter(Boolean);
  const pick = (l, sep) => first(l).map(i => i[l]).join(sep);
  // الخيط: جملة لكل دائرة بالترتيب الثابت (STYLE.md، القسم 4)، ويُعلن أنه آلي
  const ZIN = {qatar: ['في قطر', 'In Qatar'], gulf: ['وفي الخليج', 'In the Gulf'], egypt: ['وفي مصر', 'In Egypt'], world: ['وفي العالم', 'Around the world']};
  const line = l => zones.map(z => { const i = z.items.find(x => x[l]); return i ? `${ZIN[z.id][l === 'ar' ? 0 : 1]}، ${i[l]}.`.replace('، ', l === 'ar' ? '، ' : ', ') : ''; }).filter(Boolean).join(' ');
  const thread = {
    ar: `خلاصة ${ED_AR[exp.edition]} الآلية، بعناوين الناشرين كما نشرتها وكل عنوان أكدته جهتان مستقلتان على الأقل. ${line('ar')}`,
    en: `Automatic ${ED_EN[exp.edition].toLowerCase()} brief, in the publishers' own headlines, each confirmed by at least two independent outlets. ${line('en')}`,
    src: [...new Set([...first('ar'), ...first('en')].flatMap(i => i.src))]
  };
  // الأسواق والمواعيد من الخلاصة السابقة، بشرط حداثة المصدر وعدم فوات الموعد
  const today = doha().day, cutoff = iso(new Date(Date.now() - 3 * 864e5));
  const okSrc = list => (list || []).every(s => prev?.sources?.[s] && prev.sources[s].date >= cutoff);
  const markets = (prev?.markets || []).filter(m => okSrc(m.src));
  const roadmap = (prev?.roadmap || []).filter(r => (r.date || '9999') >= today && (r.src || []).every(s => prev?.sources?.[s]));
  for (const x of [...markets, ...roadmap]) for (const s of x.src || []) sources[s] = prev.sources[s];
  return {id: exp.id, edition: exp.edition, date: exp.date, published: doha().iso, auto: true,
    title: {ar: `خلاصة ${ED_AR[exp.edition]} الآلية`, en: `Automatic ${ED_EN[exp.edition]} Brief`},
    thread, markets, zones, roadmap, sources};
}

function archive(b) {
  writeJSON(`archive/${b.id}.json`, b);
  const idx = readJSON('archive/index.json', {briefs: []});
  idx.briefs = [{id: b.id, date: b.date, edition: b.edition, ...(b.auto ? {auto: true} : {})}, ...idx.briefs.filter(x => x.id !== b.id)]
    .sort((a, c) => rank(c.id).localeCompare(rank(a.id)));
  writeJSON('archive/index.json', idx);
}

// ---------- الفحص ----------
const SITE = 'https://munjiz-qa.github.io/';
const PAGES = [['عبدو نيوز: الصفحة الرئيسية', 'khabar/'], ['عبدو نيوز: لوحة الإدارة', 'khabar/admin/'], ['عبدو نيوز: حساب العميل', 'khabar/account/'], ['عبدو نيوز: الطقس والمناخ', 'khabar/weather/'],
  ['عبدو نيوز: الخلاصة المنشورة', 'khabar/data/brief.json'], ['قُطب: لوحة الإدارة الموحّدة', 'qutb/']];
async function health(brief) {
  const checks = [];
  for (const [name, p] of PAGES) {
    const t0 = Date.now(); let code = 0;
    try { code = (await fetch(SITE + p + '?t=' + Date.now(), {headers: UA, signal: AbortSignal.timeout(20000)})).status; } catch (e) {}
    checks.push({name, url: SITE + p, ok: code === 200, code, ms: Date.now() - t0});
  }
  const head = readJSON('headlines.json', {}), exp = expected();
  const briefAge = (Date.now() - new Date(brief.published)) / 3600e3, headAge = (Date.now() - new Date(head.updated)) / 3600e3;
  // خلاصة نُشرت قبل نهاية مهلة موعدها (مثل الليل 23:51 والمتوقع ما زال المساء حتى 00:20) سليمة، لا عطل
  checks.push({name: 'الخلاصة في موعدها', ok: rank(brief.id) >= rank(exp.id), detail: `${brief.id}${brief.auto ? ' (آلية)' : ''}، المتوقع ${exp.id}${rank(brief.id) > rank(exp.id) ? ' (نُشرت قبل موعدها)' : ''}`});
  const clim = readJSON('climate.json', {}), climAge = (Date.now() - new Date(clim.updated)) / 3600e3;
  const climBad = [...(clim.ar || []), ...(clim.en || [])].filter(x => (x.sources || []).length < 2 || !x.sources.every(s => /^https:\/\//.test(s.url || ''))).length;
  checks.push({name: 'أخبار المناخ حديثة وكل خبر من جهتين', ok: climAge < 7 && climBad === 0, detail: `آخر تحديث قبل ${isNaN(climAge) ? '—' : climAge.toFixed(1)} ساعة، ${(clim.ar || []).length + (clim.en || []).length} خبراً، ${climBad} دون جهتين`});
  const dk = readJSON('desks.json', {}), dkAge = (Date.now() - new Date(dk.updated)) / 3600e3;
  const dkBad = Object.values(dk.desks || {}).flatMap(d => d.items).filter(i => new Set((i.sources || []).map(s => outlet(s.url))).size < 2).length;
  checks.push({name: 'الأقسام الموضوعية حديثة وكل خبر من جهتين', ok: dkAge < 8 && dkBad === 0, detail: `آخر تحديث قبل ${isNaN(dkAge) ? '—' : dkAge.toFixed(1)} ساعة، ${Object.values(dk.desks || {}).reduce((s, d) => s + d.items.length, 0)} خبراً، ${dkBad} دون جهتين`});
  const cn = readJSON('countries.json', {}), cnAge = (Date.now() - new Date(cn.updated)) / 3600e3;
  const cnBad = Object.values(cn.countries || {}).flatMap(c => c.items || []).filter(i => new Set((i.sources || []).map(s => outlet(s.url))).size < 2).length;
  checks.push({name: 'الأوضاع في الدول حديثة وكل خبر من جهتين', ok: cnAge < 8 && cnBad === 0, detail: `آخر تحديث قبل ${isNaN(cnAge) ? '—' : cnAge.toFixed(1)} ساعة، ${Object.values(cn.countries || {}).reduce((s, c) => s + (c.items || []).length, 0)} خبراً، ${cnBad} دون جهتين`});
  // ملخص الدول للصفحة الرئيسية (countries-home.json) يجب أن يكون من نسخة الملف الكامل نفسها
  const cnh = readJSON('countries-home.json', {});
  checks.push({name: 'ملخص الدول للرئيسية مطابق للملف الكامل', ok: cnh.updated === cn.updated, detail: cnh.updated === cn.updated ? 'من النسخة نفسها' : `الملخص ${cnh.updated || '—'} والكامل ${cn.updated || '—'}`});
  const fc = readJSON('forecast.json', {}), fcA = (Date.now() - new Date(fc.updated)) / 3600e3, fcN = Object.keys(fc.countries || {}).length;
  const fcEv = readJSON('forecast/events.json', {events: []}).events || [], fcBad = fcEv.filter(e => new Set((e.sources || []).map(s => outlet(s.url))).size < 2).length;
  checks.push({name: 'التوقعات محسوبة حديثاً وكل حدث من جهتين', ok: fcA < 8 && fcN >= 20 && fcBad === 0, detail: `آخر حساب قبل ${isNaN(fcA) ? '—' : fcA.toFixed(1)} ساعة، ${fcN} دولة، ${fcEv.length} حدثاً، ${fcBad} دون جهتين`});
  checks.push({name: 'العناوين الآلية حديثة', ok: headAge < 7, detail: `آخر تحديث قبل ${headAge.toFixed(1)} ساعة`});
  const n = (brief.zones || []).reduce((s, z) => s + z.items.length, 0), unsourced = (brief.zones || []).flatMap(z => z.items).filter(i => !(i.src || []).every(s => brief.sources[s]?.url)).length;
  checks.push({name: 'كل خبر بمصدره', ok: n >= 8 && unsourced === 0, detail: `${n} خبراً، ${unsourced} دون مصدر`});
  const mil = readJSON('military.json', null), wars = readJSON('wars.json', null);
  checks.push({name: 'القسم العسكري في موعده', ok: !!mil && rank(mil.id) >= rank(exp.id), detail: `${mil?.id || '—'}${mil?.auto ? ' (رصد آلي)' : ''}، المتوقع ${exp.id}`});
  const mi = (mil?.regions || []).flatMap(r => r.items || []), weak = mi.filter(i => new Set((i.src || []).map(s => outlet(mil.sources?.[s]?.url || ''))).size < 2).length;
  checks.push({name: 'كل خبر عسكري من جهتين مستقلتين', ok: mi.length > 0 && weak === 0, detail: `${mi.length} خبراً، ${weak} دون جهتين`});
  checks.push({name: 'ملفات الحروب حديثة', ok: !!wars && (Date.now() - new Date(wars.auto_checked || wars.updated)) / 3600e3 < 8, detail: wars ? `${wars.wars.length} ملفات، آخر رصد ${wars.auto_checked || wars.updated}` : 'غير موجود'});
  const at = new Date().toISOString();
  return {checked: at, updated: at, ok: checks.every(c => c.ok), brief: {id: brief.id, auto: !!brief.auto, age_h: +briefAge.toFixed(1)},
    writer: process.env.ANTHROPIC_API_KEY ? 'agent' : 'autopilot', checks};
}

// ---------- التشغيل ----------
const exp = expected(), cur = readJSON('brief.json', null);
let wrote = false;
if (ARGS.has('--force') || !cur || rank(cur.id) < rank(exp.id)) {
  console.log(`الخلاصة الحالية ${cur?.id || '—'}، المتوقعة ${exp.id}: أكتب خلاصة آلية.`);
  const b = await autoBrief(exp, cur);
  console.log('مصادر:', JSON.stringify(STATS));
  if (!b) console.log('لم تتوفر عناوين كافية بروابط أصلية؛ تبقى الخلاصة السابقة.');
  else {
    const n = b.zones.reduce((s, z) => s + z.items.length, 0);
    console.log(`خلاصة آلية ${b.id}: ${n} خبراً، ${Object.keys(b.sources).length} مصدراً.`);
    b.zones.forEach(z => z.items.forEach(i => console.log(' ', z.id, i.ar || i.en, '←', b.sources[i.src[0]].url)));
    if (!ARGS.has('--dry')) { writeJSON('brief.json', b); archive(b); wrote = true; }
  }
} else console.log(`الخلاصة ${cur.id} في موعدها؛ لا حاجة لخلاصة آلية.`);

// القسم العسكري وملفات الحروب: رصد آلي إن فات موعد القسم التحريري، وتطورات موثّقة كل 3 ساعات
let milOut = {mil: false, wars: 0};
try { milOut = await milwatch(exp, {force: ARGS.has('--force'), dry: ARGS.has('--dry')}); console.log('القسم العسكري:', JSON.stringify({mil: milOut.mil, wars: milOut.wars, clusters: milOut.clusters, note: milOut.note})); }
catch (e) { console.error('تعذّر الرصد العسكري:', e.message); }

// أخبار المناخ: تُحدَّث كل 3 ساعات من khabar.yml؛ إن أسقطت جدولة GitHub تشغيلاً يحدّثها الطيار هنا (مع كل خلاصة من الخلاصات الأربع)
{
  const c = readJSON('climate.json', {}), age = (Date.now() - new Date(c.updated)) / 3600e3;
  if (!(age < 3.5) && !ARGS.has('--dry')) { try { execFileSync(process.execPath, ['khabar/scripts/climate.mjs'], {stdio: 'inherit', timeout: 8 * 60e3}); } catch (e) { console.error('climate', e.message); } }
}

// الأقسام الموضوعية: تُحدَّث كل 3 ساعات من khabar.yml؛ إن أسقطت جدولة GitHub تشغيلاً يحدّثها الطيار هنا، ثم بوابة التحقق.
// وبعد أي خلاصة جديدة يُعاد بناء فهرس البحث وتقرير الشفافية وخلاصات RSS.
{
  const d = readJSON('desks.json', {}), age = (Date.now() - new Date(d.updated)) / 3600e3;
  if (!(age < 3.5) && !ARGS.has('--dry')) {
    try { execFileSync(process.execPath, ['khabar/scripts/desks.mjs'], {stdio: 'inherit', timeout: 12 * 60e3}); execFileSync('python3', ['khabar/agent/desks.py', '--enforce', '--quiet'], {stdio: 'inherit'}); } catch (e) { console.error('desks', e.message); }
  }
  // الأوضاع في الدول: تُحدَّث كل 3 ساعات من khabar.yml، ويعيدها الطيار هنا إن تأخرت (مع خلاصات كل 6 ساعات)، ثم بوابة التحقق
  const cn = readJSON('countries.json', {}), cnAge = (Date.now() - new Date(cn.updated)) / 3600e3;
  if (!(cnAge < 3.5) && !ARGS.has('--dry')) {
    try { execFileSync(process.execPath, ['khabar/scripts/countries.mjs'], {stdio: 'inherit', timeout: 12 * 60e3}); execFileSync('python3', ['khabar/agent/countries.py', '--enforce', '--quiet'], {stdio: 'inherit'}); execFileSync('python3', ['khabar/scripts/countries_home.py'], {stdio: 'inherit'}); } catch (e) { console.error('countries', e.message); }
  }
  // التوقعات: تُحسب كل 3 ساعات من khabar.yml، ويعيدها الطيار إن تأخرت 4 ساعات، ثم بوابة التحقق
  const fcj = readJSON('forecast.json', {}), fcAge = (Date.now() - new Date(fcj.updated)) / 3600e3;
  if (!(fcAge < 4) && !ARGS.has('--dry')) {
    try { execFileSync(process.execPath, ['khabar/scripts/forecast.mjs'], {stdio: 'inherit', timeout: 10 * 60e3}); execFileSync('python3', ['khabar/agent/forecast.py', '--enforce', '--quiet'], {stdio: 'inherit'}); } catch (e) { console.error('forecast', e.message); }
  }
  if (!ARGS.has('--dry')) { try { execFileSync(process.execPath, ['khabar/scripts/build.mjs'], {stdio: 'inherit', timeout: 3 * 60e3}); } catch (e) { console.error('build', e.message); } }
}

if (!ARGS.has('--no-health')) {
  const h = await health(readJSON('brief.json', cur));
  const old = readJSON('health.json', {});
  // لا نلتزم كل ساعة بلا تغيير: نكتب عند تغيّر الحالة أو الخلاصة، أو كل 6 ساعات
  const changed = !old.checked || old.ok !== h.ok || old.brief?.id !== h.brief.id || (Date.now() - new Date(old.checked)) > 6 * 3600e3
    || JSON.stringify(old.checks?.map(c => c.ok)) !== JSON.stringify(h.checks.map(c => c.ok));
  if (changed && !ARGS.has('--dry')) writeJSON('health.json', h);
  h.checks.forEach(c => console.log(c.ok ? '✓' : '✗', c.name, c.code || '', c.detail || ''));
  if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `ok=${h.ok}\nwrote=${wrote}\nmil=${!!(milOut.mil || milOut.wars)}\n`, {flag: 'a'});
  if (!h.ok) { console.error('::warning::يوجد عطل في تشغيل «عبدو نيوز»؛ التفاصيل أعلاه.'); }
}
