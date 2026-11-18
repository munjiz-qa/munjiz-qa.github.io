// «عبدو نيوز»: محرك الأقسام الموضوعية الآلي. يعمل كل 3 ساعات من khabar.yml، ويعيده الطيار الآلي إن تأخر، دون أي جلسة محرر.
//  - لكل قسم (الشائعات، الصحة، التقنية، الطيران، المحليات...) يجمع العناوين من أخبار Google ومن خلاصات ناشرين مباشرة، بالعربية والإنجليزية.
//  - قاعدة المصدرين: لا يُنشر إلا عنقود نشرته جهتان مستقلتان على الأقل (نطاقان مختلفان)، ولكل جهة رابط مقالها الأصلي.
//  - البيانات الحية (العملات والذهب والنتائج الرياضية) لا يُنشر منها رقم إلا إذا اتفق عليه مزوّدان مستقلان على الأقل.
//  - يكتب data/desks.json، ثم تمر بالبوابة khabar/agent/desks.py --enforce في سير العمل.
// الاستخدام: node khabar/scripts/desks.mjs [--only=rumors,tech] [--no-news] [--dry]
import {readFileSync, writeFileSync} from 'node:fs';
import {cluster, decodeGoogle, outlet, host, toks} from './milwatch.mjs';

const ROOT = 'khabar/data/', ARGS = process.argv.slice(2);
const ONLY = (ARGS.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const UA = {'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 khabar-desks'};
const readJSON = (f, d) => { try { return JSON.parse(readFileSync(ROOT + f, 'utf8')); } catch (e) { return d; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ent = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const text = s => ent(s || '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (x, t) => (x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '';
const dohaDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Qatar'}).format(d);
const get = async (u, o = {}) => { const r = await fetch(u, {headers: UA, signal: AbortSignal.timeout(20000), ...o}); if (!r.ok) throw new Error(r.status + ' ' + u); return r; };
async function rss(url) {
  return (await (await get(url)).text()).split(/<item[\s>]|<entry[\s>]/).slice(1).map(it => {
    const d = new Date(text(tag(it, 'pubDate')) || text(tag(it, 'dc:date')) || text(tag(it, 'updated')) || text(tag(it, 'published')));
    const link = text(tag(it, 'link')) || (it.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
    return {title: text(tag(it, 'title')), link, source: text(tag(it, 'source')), d};
  }).filter(x => x.title && !isNaN(x.d));
}

// ---------- تعريف الأقسام ----------
// g: استعلامات أخبار Google، feeds: خلاصات مباشرة، must: ما يجب أن يحمله العنوان، group: مجموعة العرض
const W = ' when:2d';
export const DESKS = [
  {id: 'rumors', group: 'trust', ar: 'مدقّق الشائعات', en: 'Rumour check', color: '#7A3FB0',
    g: {ar: '(شائعة OR شائعات OR "لا صحة" OR "غير صحيح" OR مضلل OR مفبرك OR ينفي OR تنفي OR "تقصي الحقائق")' + W, en: '("fact check" OR "fact-check" OR debunk OR hoax OR misleading OR "false claim" OR fabricated OR "fake news")' + W},
    feeds: {ar: ['https://fatabyyano.net/feed/'], en: []},
    must: {ar: /شائع|لا صحة|غير صحيح|مضلل|مفبرك|مزيف|مزيّف|زائف|تقصي|متداول|حقيقة (فيديو|صورة|خبر|ما)/, en: /fact.?check|debunk|false claim|fake (video|image|photo|news|post|quote)|viral (claim|video|post|image)|misinformation|disinformation|no evidence/i},
    skip: /hoax (bomb|call|threat)|bomb hoax|special counsel|indictment|lawsuit|accuses|sues/i},
  {id: 'health', group: 'life', ar: 'الصحة والأوبئة', en: 'Health and outbreaks', color: '#1D7A70',
    g: {ar: '(الصحة العالمية OR وزارة الصحة OR وباء OR فيروس OR لقاح OR تفشي OR دواء)' + W, en: '(WHO OR outbreak OR virus OR vaccine OR "health ministry" OR FDA OR epidemic OR drug approval)' + W},
    feeds: {ar: ['https://feeds.bbci.co.uk/arabic/rss.xml', 'https://aawsat.com/feed'], en: ['https://www.who.int/rss-feeds/news-english.xml', 'https://feeds.bbci.co.uk/news/health/rss.xml', 'https://www.statnews.com/feed/']},
    must: {ar: /صح[ةي]|وباء|فيروس|لقاح|تفش|دواء|أدوية|مرض|مستشف|طبي|سرطان|إنفلونزا|كوليرا|حصبة|ملاريا/, en: /health|WHO|outbreak|virus|vaccin|disease|drug|FDA|cancer|hospital|medic|flu|cholera|measles|malaria|mpox|epidemic|pandemic/i}},
  {id: 'tech', group: 'world', ar: 'التقنية والذكاء الاصطناعي', en: 'Tech and AI', color: '#3A5FB0',
    g: {ar: '(الذكاء الاصطناعي OR تقنية OR آبل OR جوجل OR مايكروسوفت OR OpenAI OR رقائق)' + W, en: '("artificial intelligence" OR AI OR OpenAI OR Anthropic OR Nvidia OR Apple OR Google OR Microsoft OR chips) (launch OR regulation OR model OR law)' + W},
    feeds: {ar: ['https://www.aitnews.com/feed/'], en: ['https://techcrunch.com/feed/', 'https://www.theverge.com/rss/index.xml', 'https://feeds.arstechnica.com/arstechnica/index']},
    must: {ar: /ذكاء اصطناعي|الذكاء الاصطناعي|تقني|تكنولوج|رقائق|شرائح|آبل|جوجل|غوغل|مايكروسوفت|ميتا|إنفيديا|OpenAI|هاتف|تطبيق|منصة/i, en: /\bAI\b|artificial intelligence|OpenAI|Anthropic|Nvidia|Apple|Google|Microsoft|Meta|chip|semiconductor|software|robot|tech/i}},
  {id: 'sports', group: 'life', ar: 'الرياضة', en: 'Sport', color: '#2F8F3E',
    g: {ar: '(منتخب قطر OR منتخب مصر OR المنتخب السعودي OR العنابي OR الفراعنة OR الأهلي OR الزمالك OR السد OR الدوري) when:1d', en: '(Qatar OR Egypt OR "Saudi Arabia" OR Morocco) (football OR "national team" OR match OR league) when:1d'},
    feeds: {ar: [], en: ['https://feeds.bbci.co.uk/sport/football/rss.xml']},
    must: {ar: /منتخب|مباراة|الدوري|كأس|بطولة|هدف|المدرب|لاعب|نادي/, en: /football|soccer|match|league|cup|coach|striker|goal|national team|FIFA|AFC|CAF/i}},
  {id: 'travel', group: 'life', ar: 'الطيران والسفر', en: 'Flights and travel', color: '#0E7FA3',
    g: {ar: '(مطار OR المجال الجوي OR رحلات OR الطيران OR تأشيرة سياحية OR تحذير سفر)' + W, en: '(airport OR airspace OR flights OR airline OR "travel advisory" OR aviation) (Qatar OR Gulf OR Egypt OR closed OR suspended OR resume)' + W},
    feeds: {ar: [], en: ['https://simpleflying.com/feed/']},
    must: {ar: /مطار|المجال الجوي|رحل[ةا]ت|الطيران|طيران|سفر|المسافرين|الملاحة الجوية/, en: /airport|airspace|flight|airline|aviation|travel|passenger|airways/i}},
  {id: 'qatar_local', group: 'local', ar: 'قطر المحلية', en: 'Qatar local', color: '#8A1538', country: 'QA',
    g: {ar: '(وزارة OR قرار OR مجلس الوزراء OR بلدية OR خدمة OR فعالية OR مهرجان) (قطر OR الدوحة) when:1d', en: '(ministry OR decision OR cabinet OR municipality OR service OR event OR festival) (Qatar OR Doha) when:1d'},
    feeds: {ar: [], en: []}, must: {ar: /قطر|الدوحة|القطري/, en: /Qatar|Doha/i}},
  {id: 'egypt_local', group: 'local', ar: 'مصر المحلية', en: 'Egypt local', color: '#B5832A', country: 'EG',
    g: {ar: '(مجلس الوزراء OR محافظ OR محافظة OR وزارة OR قرار OR خدمة) مصر when:1d', en: '(cabinet OR governor OR ministry OR decision OR service) Egypt when:1d'},
    feeds: {ar: [], en: ['https://www.egyptindependent.com/feed/', 'https://www.dailynewsegypt.com/feed/']}, must: {ar: /مصر|المصري|القاهرة|محافظ/, en: /Egypt|Cairo/i}},
  {id: 'ksa_local', group: 'local', ar: 'السعودية', en: 'Saudi Arabia', color: '#006C35', country: 'SA',
    g: {ar: '(السعودية OR الرياض OR جدة) (وزارة OR قرار OR مجلس الوزراء OR هيئة) when:1d', en: '(Saudi OR Riyadh OR Jeddah) (ministry OR decision OR cabinet OR authority) when:1d'},
    feeds: {ar: ['https://aawsat.com/feed'], en: ['https://www.arabnews.com/rss.xml']}, must: {ar: /السعودي|الرياض|جدة|المملكة/, en: /Saudi|Riyadh|Jeddah|Kingdom/i}},
  {id: 'uae_local', group: 'local', ar: 'الإمارات', en: 'UAE', color: '#C8102E', country: 'AE',
    g: {ar: '(الإمارات OR دبي OR أبوظبي) (وزارة OR قرار OR مجلس الوزراء OR هيئة) when:1d', en: '(UAE OR Dubai OR "Abu Dhabi") (ministry OR decision OR cabinet OR authority) when:1d'},
    feeds: {ar: [], en: ['https://www.thenationalnews.com/arc/outboundfeeds/rss/?outputType=xml']}, must: {ar: /الإمارات|دبي|أبوظبي|أبو ظبي|الإماراتي/, en: /UAE|Emirat|Dubai|Abu Dhabi/i}},
  {id: 'kuwait_local', group: 'local', ar: 'الكويت', en: 'Kuwait', color: '#007A3D', country: 'KW',
    g: {ar: 'الكويت (وزارة OR قرار OR مجلس الوزراء) when:1d', en: 'Kuwait (ministry OR decision OR cabinet) when:1d'},
    feeds: {ar: [], en: []}, must: {ar: /الكويت/, en: /Kuwait/i}},
  {id: 'oman_local', group: 'local', ar: 'عُمان', en: 'Oman', color: '#DB161B', country: 'OM',
    g: {ar: '(سلطنة عمان OR مسقط) (وزارة OR قرار OR مرسوم) when:2d', en: '(Oman OR Muscat) (ministry OR decision OR decree) when:2d'},
    feeds: {ar: [], en: []}, must: {ar: /عمان|عُمان|مسقط|العماني/, en: /Oman|Muscat/i}},
  {id: 'bahrain_local', group: 'local', ar: 'البحرين', en: 'Bahrain', color: '#CE1126', country: 'BH',
    g: {ar: '(البحرين OR المنامة) (وزارة OR قرار OR مجلس الوزراء) when:2d', en: '(Bahrain OR Manama) (ministry OR decision OR cabinet) when:2d'},
    feeds: {ar: [], en: ['https://www.newsofbahrain.com/rss']}, must: {ar: /البحرين|المنامة|البحريني/, en: /Bahrain|Manama/i}},
  {id: 'jobs', group: 'life', ar: 'العمل والإقامة والتأشيرات', en: 'Jobs, residency and visas', color: '#5C6B2E',
    g: {ar: '(تأشيرة OR الإقامة OR سوق العمل OR العمالة OR وزارة العمل OR التوظيف OR الكفالة) (قطر OR السعودية OR الإمارات OR الكويت OR مصر OR الخليج)' + W, en: '(visa OR residency OR "labour law" OR "labor law" OR employment OR workers OR jobs) (Qatar OR Saudi OR UAE OR Kuwait OR Oman OR Bahrain OR Egypt OR Gulf)' + W},
    feeds: {ar: [], en: []}, must: {ar: /تأشير|إقام|العمل|العمال|توظيف|وظائف|كفال|المقيمين|الوافدين/, en: /visa|residen|labou?r|employ|worker|jobs|expat|work permit/i}},
  {id: 'edu', group: 'life', ar: 'التعليم والمنح', en: 'Education and scholarships', color: '#6A4C93',
    g: {ar: '(منحة OR منح دراسية OR امتحانات OR الثانوية العامة OR القبول OR الجامعات OR وزارة التربية OR وزارة التعليم)' + W, en: '(scholarship OR exams OR admission OR university OR "ministry of education") (Qatar OR Egypt OR Gulf OR Saudi OR UAE)' + W},
    feeds: {ar: [], en: []}, must: {ar: /منح|امتحان|الثانوية|القبول|جامع|التعليم|التربية|الطلاب|مدارس|دراس/, en: /scholarship|exam|admission|universit|education|student|school/i}},
  {id: 'culture', group: 'life', ar: 'الثقافة والدين', en: 'Culture and faith', color: '#9C6B1F',
    g: {ar: '(الأوقاف OR معرض الكتاب OR مهرجان OR متحف OR الحج OR العمرة OR رمضان OR فعالية ثقافية)' + W, en: '(museum OR "book fair" OR festival OR Hajj OR Umrah OR Ramadan OR heritage OR exhibition) (Qatar OR Egypt OR Gulf OR Saudi)' + W},
    feeds: {ar: [], en: []}, must: {ar: /أوقاف|معرض|مهرجان|متحف|الحج|العمرة|رمضان|ثقاف|تراث|مسجد|فعالي/, en: /museum|book fair|festival|Hajj|Umrah|Ramadan|heritage|exhibit|culture|mosque/i}},
  {id: 'energy', group: 'econ', ar: 'الطاقة والنفط والغاز', en: 'Energy, oil and gas', color: '#A0522D',
    g: {ar: '(أوبك OR النفط OR الغاز الطبيعي OR الغاز المسال OR قطر للطاقة OR أرامكو OR خام برنت)' + W, en: '(OPEC OR "oil prices" OR Brent OR LNG OR QatarEnergy OR Aramco OR "natural gas")' + W},
    feeds: {ar: [], en: ['https://oilprice.com/rss/main']}, must: {ar: /أوبك|النفط|نفط|الغاز|برنت|أرامكو|للطاقة|الطاقة|المسال|الخام/, en: /OPEC|oil|Brent|LNG|gas|QatarEnergy|Aramco|crude|energy/i}},
  {id: 'realestate', group: 'econ', ar: 'العقارات', en: 'Real estate', color: '#7B5E3B',
    g: {ar: '(العقارات OR عقاري OR الإسكان OR وحدات سكنية OR التطوير العقاري) (قطر OR مصر)' + W, en: '("real estate" OR property OR housing OR developer) (Qatar OR Egypt)' + W},
    feeds: {ar: [], en: []}, must: {ar: /عقار|إسكان|سكني|سكنية|الوحدات|التطوير العقاري|الإيجار/, en: /real estate|property|housing|developer|rent|homes/i}},
  {id: 'cyber', group: 'world', ar: 'الأمن السيبراني', en: 'Cybersecurity', color: '#2E3A59',
    g: {ar: '(الأمن السيبراني OR اختراق OR هجوم إلكتروني OR تسريب بيانات OR برمجيات الفدية)' + W, en: '(cyberattack OR breach OR ransomware OR "data leak" OR hackers OR vulnerability OR CISA)' + W},
    feeds: {ar: [], en: ['https://www.bleepingcomputer.com/feed/', 'https://feeds.feedburner.com/TheHackersNews']}, must: {ar: /سيبران|اختراق|إلكتروني|تسريب|الفدية|قراصنة|ثغر/, en: /cyber|breach|ransomware|leak|hack|vulnerab|malware|phishing|zero-day/i}},
  {id: 'space', group: 'world', ar: 'الفضاء والعلوم', en: 'Space and science', color: '#24305E',
    g: {ar: '(ناسا OR الفضاء OR صاروخ فضائي OR اكتشاف علمي OR علماء OR مسبار)' + W, en: '(NASA OR SpaceX OR "space agency" OR telescope OR scientists OR discovery OR launch) (space OR science)' + W},
    feeds: {ar: [], en: ['https://www.space.com/feeds/all', 'https://www.sciencedaily.com/rss/all.xml']}, must: {ar: /فضاء|ناسا|مسبار|كوكب|علماء|علمي|اكتشاف|تلسكوب|قمر/, en: /space|NASA|SpaceX|telescope|planet|scientist|study|discover|launch|asteroid|moon|mars/i}},
  {id: 'money', group: 'econ', ar: 'الاقتصاد الشخصي', en: 'Personal finance', color: '#C27A12',
    g: {ar: '(سعر الذهب OR أسعار الوقود OR البنزين OR سعر الصرف OR الدولار) (قطر OR مصر OR الخليج OR السعودية OR الإمارات)' + W, en: '("gold price" OR "fuel prices" OR petrol OR "exchange rate" OR "interest rate") (Qatar OR Egypt OR Gulf OR UAE OR Saudi)' + W},
    feeds: {ar: [], en: []}, must: {ar: /الذهب|الوقود|البنزين|السولار|الصرف|الدولار|الجنيه|الفائدة|الأسعار|التضخم/, en: /gold|fuel|petrol|gasoline|exchange rate|dollar|pound|interest rate|inflation|prices/i}},
  {id: 'stocks', group: 'econ', ar: 'البورصة والشركات', en: 'Stocks and companies', color: '#14212E',
    g: {ar: '(بورصة قطر OR البورصة المصرية OR بنك قطر الوطني OR صناعات قطر OR البنك التجاري الدولي OR طلعت مصطفى OR أوريدو) when:2d', en: '("Qatar Stock Exchange" OR "Egyptian Exchange" OR EGX30 OR QNB OR "Industries Qatar" OR Ooredoo OR "Commercial International Bank" OR "Talaat Moustafa") when:2d'},
    feeds: {ar: [], en: []}, must: {ar: /بورصة|البورصة|سهم|أسهم|المؤشر|بنك|شركة|أرباح/, en: /stock|exchange|shares|index|bank|profit|earnings|EGX|QSE|QNB|Ooredoo/i}},
];

// الحكم في مدقّق الشائعات: لا يُنشر ادعاء إلا بحكم صريح تقوله جهتان (كاذب، مضلل، صحيح)
const VERDICT = [
  // نفي طرفٍ ما ليس حكماً: الحكم «كاذب» يحتاج لغة تحقق صريحة (شائعة، لا صحة، مفبرك، تقصي الحقائق...)
  ['false', /كاذب|زائف|مفبرك|مزيف|مزيّف|غير صحيح|لا صحة|عار[ٍي]? (تماما|من الصحة)|شائعة|fake (video|image|photo|news|post|quote)|false claim|debunk|no evidence|is (fake|false)/i],
  ['misleading', /مضلل|مجتزأ|خارج سياق|misleading (claim|video|post|image)|out of context|old video|miscaptioned|digitally altered/i],
  ['true', /^(?!.*(غير|لا) صح).*(صحيح|حقيقي|تؤكد صحة)|\b(true|confirmed|accurate)\b/i],
];
const verdictOf = t => (VERDICT.find(([, r]) => r.test(t)) || [null])[0];

const SKIP = /horoscope|recipe|coupon|promo code|lottery|برج|حظك|وصفة|بث مباشر|شاهد مجان|live stream|watch free|بالفيديو|in pictures/i;
export const STATS = {google: 0, decoded: 0, direct: 0, clusters: 0, failed: []};

async function gatherDesk(d, lang, since, budget, feedCache) {
  const pool = [];
  for (const f of d.feeds[lang] || []) {
    try {
      if (!feedCache.has(f)) { feedCache.set(f, await rss(f)); STATS.direct++; }
      for (const it of feedCache.get(f)) {
        const url = it.link.replace(/^http:/, 'https:');
        if (it.d >= since && /^https:\/\//.test(url) && d.must[lang].test(it.title) && !SKIP.test(it.title) && !(d.skip && d.skip.test(it.title))) pool.push({title: it.title.slice(0, 240), source: it.source || host(f), url, outlet: outlet(url), t: +it.d});
      }
    } catch (e) { STATS.failed.push(`direct ${f}: ${e.message}`); }
  }
  if (GOOGLE_OFF.v) return finish();
  try {
    const loc = lang === 'ar' ? 'hl=ar&gl=QA&ceid=QA:ar' : 'hl=en-QA&gl=QA&ceid=QA:en';
    for (const it of (await rss(`https://news.google.com/rss/search?q=${encodeURIComponent(d.g[lang])}&${loc}`)).slice(0, 40)) {
      let title = it.title; if (it.source && title.endsWith(' - ' + it.source)) title = title.slice(0, -(it.source.length + 3));
      if (it.d >= since && d.must[lang].test(title) && !SKIP.test(title) && !(d.skip && d.skip.test(title))) pool.push({title: title.slice(0, 240), source: it.source, glink: it.link, outlet: it.source, t: +it.d});
    }
    STATS.google++; await sleep(900);
  } catch (e) {
    STATS.failed.push(`google ${d.id}/${lang}: ${e.message}`);
    // أخبار Google تحدّ الطلبات المتتالية: نتوقف عنها في هذا التشغيل، وتأخذ الأقسام التالية دورها أولاً في التشغيل القادم
    if (/^429/.test(e.message)) GOOGLE_OFF.v = true;
  }
  return finish();
  async function finish() {
  const out = [];
  for (const c of cluster(pool)) {
    if (out.length >= 8) break;
    const items = [];
    for (const h of c.items) {
      if (h.url) { items.push(h); continue; }
      if (budget.n <= 0 || budget.desk <= 0) continue;
      budget.n--; budget.desk--; const u = await decodeGoogle(h.glink); await sleep(300);
      if (u && /^https?:\/\//.test(u) && !host(u).endsWith('google.com')) { STATS.decoded++; items.push({...h, url: u.replace(/^http:/, 'https:'), outlet: outlet(u)}); }
      if (items.length >= 4) break;
    }
    const by = new Map(); items.forEach(h => { if (!by.has(h.outlet)) by.set(h.outlet, h); });
    if (by.size < 2) continue;
    const list = [...by.values()].slice(0, 5);
    const it = {id: d.id + '-' + lang + '-' + hash([...toks(list[0].title)].sort().join(' ')), lang, title: list[0].title, t: new Date(c.t).toISOString(), outlets: by.size,
      sources: list.map(h => ({name: h.source, url: h.url, date: dohaDay(new Date(h.t)), title: h.title}))};
    if (d.id === 'rumors') { const v = verdictOf(list.map(h => h.title).join(' | ')); if (!v) continue; it.verdict = v; }
    out.push(it);
  }
  STATS.clusters += out.length;
  return out;
  }
}
const GOOGLE_OFF = {v: false};
const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

// ---------- الأسعار: مزوّدان مستقلان لكل رقم ----------
const CUR = ['QAR', 'EGP', 'SAR', 'AED', 'KWD', 'OMR', 'BHD', 'EUR', 'GBP', 'JOD', 'TRY', 'INR', 'PKR'];
async function rates() {
  const P = [];
  try { const j = await (await get('https://open.er-api.com/v6/latest/USD')).json(); if (j.result === 'success') P.push({id: 'erapi', name: 'ExchangeRate-API', url: 'https://www.exchangerate-api.com/', at: new Date(j.time_last_update_unix * 1000).toISOString(), r: j.rates}); } catch (e) { STATS.failed.push('erapi ' + e.message); }
  for (const u of ['https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', 'https://latest.currency-api.pages.dev/v1/currencies/usd.json']) {
    try { const j = await (await get(u)).json(); const r = {}; for (const [k, v] of Object.entries(j.usd)) r[k.toUpperCase()] = v; P.push({id: 'fawaz', name: 'Currency-API (fawazahmed0)', url: 'https://github.com/fawazahmed0/exchange-api', at: j.date + 'T00:00:00Z', r}); break; } catch (e) { STATS.failed.push('fawaz ' + e.message); }
  }
  let gold = null;
  try { const j = await (await get('https://api.gold-api.com/price/XAU')).json(); gold = {id: 'goldapi', name: 'Gold-API', url: 'https://gold-api.com/', at: j.updatedAt, usd: j.price}; } catch (e) { STATS.failed.push('gold ' + e.message); }
  const fx = {};
  for (const c of CUR) {
    const vals = P.filter(p => p.r[c] > 0).map(p => ({p: p.id, v: p.r[c]}));
    if (vals.length < 2) continue;
    const a = vals[0].v, b = vals[1].v, diff = Math.abs(a - b) / ((a + b) / 2) * 100;
    if (diff > 1.5) continue; // لا يُنشر رقم يختلف عليه المزوّدان
    fx[c] = {v: +((a + b) / 2).toPrecision(6), by: vals.map(x => x.p), diff: +diff.toFixed(3)};
  }
  const xau = [];
  if (gold?.usd > 0) xau.push({p: 'goldapi', v: gold.usd});
  const fw = P.find(p => p.id === 'fawaz'); if (fw?.r?.XAU > 0) xau.push({p: 'fawaz', v: 1 / fw.r.XAU});
  let g = null;
  if (xau.length >= 2) { const diff = Math.abs(xau[0].v - xau[1].v) / ((xau[0].v + xau[1].v) / 2) * 100; if (diff <= 1.5) g = {usd_oz: +((xau[0].v + xau[1].v) / 2).toFixed(2), by: xau.map(x => x.p), diff: +diff.toFixed(3)}; }
  const providers = Object.fromEntries([...P.map(p => [p.id, {name: p.name, url: p.url, at: p.at}]), ...(gold ? [[gold.id, {name: gold.name, url: gold.url, at: gold.at}]] : [])]);
  return {updated: new Date().toISOString(), base: 'USD', fx, gold: g, providers};
}

// ---------- الرياضة: نتيجة لا تُنشر إلا إذا اتفق عليها مزوّدان ----------
const ARAB = ['Qatar', 'Egypt', 'Saudi Arabia', 'United Arab Emirates', 'UAE', 'Kuwait', 'Oman', 'Bahrain', 'Iraq', 'Jordan', 'Syria', 'Lebanon', 'Palestine', 'Morocco', 'Algeria', 'Tunisia', 'Libya', 'Sudan', 'Yemen', 'Mauritania', 'Comoros', 'Djibouti', 'Somalia'];
const ARAB_CC = new Set(['QAT', 'EGY', 'KSA', 'SAU', 'UAE', 'ARE', 'KUW', 'OMA', 'BHR', 'IRQ', 'JOR', 'MAR', 'ALG', 'TUN']);
const TOP = /^(Premier League|LaLiga|Champions League|AFC Champions League|CAF Champions League|Arab Cup|World Cup|AFC Asian Cup|Africa Cup of Nations)/;
const ESPN = ['fifa.friendly', 'ksa.1', 'eng.1', 'esp.1', 'uefa.champions', 'afc.champions', 'caf.champions', 'fifa.worldq.afc', 'fifa.worldq.caf', 'uefa.nations', 'caf.nations_qual'];
const SDB = [4663, 4829, 4668, 4328, 4335];
const tn = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\b(fc|sc|cf|club|al|el|ah|saudi|the|de|sporting|sport)\b/g, ' ').split(/[^a-z0-9]+/).filter(w => w.length >= 3);
const same = (a, b) => { const A = tn(a), B = new Set(tn(b)); return A.some(w => B.has(w)) || tn(a).join('') === tn(b).join(''); };
async function sports() {
  const days = [-1, 0, 1].map(k => dohaDay(new Date(Date.now() + k * 864e5)));
  const fm = [], es = [], sd = [];
  for (const d of days) {
    const ymd = d.replace(/-/g, '');
    try {
      const j = await (await get(`https://www.fotmob.com/api/data/matches?date=${ymd}`)).json();
      for (const l of j.leagues || []) {
        for (const m of l.matches || []) {
          const arab = ARAB.includes(m.home?.name) || ARAB.includes(m.away?.name);
          if (!(ARAB_CC.has(l.ccode) || arab || (TOP.test(l.name) && ['ENG', 'ESP', 'INT'].includes(l.ccode)))) continue;
          fm.push({p: 'fotmob', league: l.name, cc: l.ccode, home: m.home.name, away: m.away.name, hs: m.home.score, as: m.away.score, at: m.status?.utcTime, fin: !!m.status?.finished, live: !!m.status?.started && !m.status?.finished, cancelled: !!m.status?.cancelled, arab: arab || ARAB_CC.has(l.ccode)});
        }
      }
    } catch (e) { STATS.failed.push('fotmob ' + e.message); }
    for (const s of ESPN) {
      try {
        const j = await (await get(`https://site.api.espn.com/apis/site/v2/sports/soccer/${s}/scoreboard?dates=${ymd}`)).json();
        for (const e of j.events || []) {
          const c = e.competitions?.[0]?.competitors || [], h = c.find(x => x.homeAway === 'home'), a = c.find(x => x.homeAway === 'away');
          if (h && a) es.push({p: 'espn', home: h.team.displayName, away: a.team.displayName, hs: +h.score, as: +a.score, at: e.date, fin: e.status?.type?.completed, url: (e.links || []).find(x => x.href)?.href || `https://www.espn.com/soccer/scoreboard/_/date/${ymd}`});
        }
      } catch (e) { /* دوري بلا مباريات في هذا اليوم */ }
    }
    for (const id of SDB) {
      try {
        const j = await (await get(`https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d=${d}&l=${id}`)).json();
        for (const e of j.events || []) sd.push({p: 'thesportsdb', home: e.strHomeTeam, away: e.strAwayTeam, hs: e.intHomeScore == null ? null : +e.intHomeScore, as: e.intAwayScore == null ? null : +e.intAwayScore, at: (e.strTimestamp || e.dateEvent) + 'Z', fin: /finished|FT|AET|PEN/i.test(e.strStatus || ''), url: `https://www.thesportsdb.com/event/${e.idEvent}`});
      } catch (e) { /* */ }
      await sleep(250);
    }
  }
  const out = [];
  for (const m of fm) {
    if (m.cancelled) continue;
    const near = x => Math.abs(new Date(x.at) - new Date(m.at)) < 36 * 3600e3;
    const twins = [...es, ...sd].filter(x => near(x) && ((same(x.home, m.home) && same(x.away, m.away)) || (same(x.home, m.away) && same(x.away, m.home))));
    if (!twins.length) continue;
    const ymd = (m.at || '').slice(0, 10).replace(/-/g, '');
    const rec = {league: m.league, home: m.home, away: m.away, at: m.at, arab: m.arab, by: ['fotmob', ...new Set(twins.map(t => t.p))],
      links: [{name: 'FotMob', url: `https://www.fotmob.com/matches?date=${ymd}`}, ...twins.slice(0, 2).map(t => ({name: t.p === 'espn' ? 'ESPN' : 'TheSportsDB', url: t.url}))]};
    if (m.fin || m.live) {
      // النتيجة تُنشر فقط إذا تطابقت لدى مزوّدين؛ الترتيب قد ينعكس لدى المزوّد الآخر
      const ok = twins.find(t => (same(t.home, m.home) ? t.hs === m.hs && t.as === m.as : t.hs === m.as && t.as === m.hs) && t.hs != null);
      rec.status = m.fin ? 'ft' : 'live';
      if (ok && m.hs != null) { rec.hs = m.hs; rec.as = m.as; } else rec.pending = true;
    } else rec.status = 'ns';
    out.push(rec);
  }
  out.sort((a, b) => (b.arab - a.arab) || new Date(a.at) - new Date(b.at));
  return {updated: new Date().toISOString(), days, matches: out.slice(0, 60), providers: {fotmob: 'https://www.fotmob.com/', espn: 'https://www.espn.com/soccer/', thesportsdb: 'https://www.thesportsdb.com/'}};
}

// ---------- التشغيل ----------
export async function runDesks({dry = false, news = true} = {}) {
  const prev = readJSON('desks.json', {desks: {}});
  const since = Date.now() - 48 * 3600e3, budget = {n: 150, desk: 5}, feedCache = new Map();
  const out = {updated: new Date().toISOString(), rule: 'two-independent-outlets', meta: DESKS.map(d => ({id: d.id, group: d.group, ar: d.ar, en: d.en, color: d.color, country: d.country || null})), desks: {}};
  // تدوير: كل تشغيل يبدأ من قسم مختلف، فتنال كل الأقسام نصيبها من طلبات أخبار Google وفك الروابط
  const start = Math.floor(Date.now() / (3 * 3600e3)) % DESKS.length;
  const order = [...DESKS.slice(start), ...DESKS.slice(0, start)];
  for (const d of order) {
    const old = (prev.desks?.[d.id]?.items || []).filter(i => Date.now() - new Date(i.t) < 72 * 3600e3 && (i.sources || []).length >= 2)
      .filter(i => d.id !== 'rumors' || (d.must[i.lang].test(i.title) && !d.skip.test(i.title) && (i.verdict = verdictOf(i.sources.map(s => s.title || '').join(' | ') || i.title))));
    let fresh = [];
    if (news && (!ONLY.length || ONLY.includes(d.id))) {
      for (const lang of ['ar', 'en']) fresh.push(...await gatherDesk(d, lang, since, Object.assign(budget, {desk: 5}), feedCache));
    }
    // دمج: الجديد أولاً، ويبقى القديم الموثّق 72 ساعة حتى لا يفرغ القسم إن تعثّر تشغيل
    const seen = new Set(), items = [];
    for (const i of [...fresh, ...old]) { const k = i.id; if (seen.has(k)) continue; seen.add(k); items.push(i); }
    items.sort((a, b) => new Date(b.t) - new Date(a.t));
    out.desks[d.id] = {items: ['ar', 'en'].flatMap(l => items.filter(i => i.lang === l).slice(0, 12)), checked: fresh.length || !news ? out.updated : prev.desks?.[d.id]?.checked || null};
    console.log(`${d.id}: ${fresh.length} جديد، ${out.desks[d.id].items.length} منشور`);
  }
  try { out.rates = await rates(); } catch (e) { out.rates = prev.rates || null; STATS.failed.push('rates ' + e.message); }
  if (!out.rates || Object.keys(out.rates.fx || {}).length < 3) out.rates = prev.rates || out.rates;
  try { out.sports = await sports(); } catch (e) { STATS.failed.push('sports ' + e.message); }
  if (!out.sports || !out.sports.matches.length) out.sports = prev.sports || out.sports || null;
  // «خبر اليوم في رقم»: رقم واحد لافت اتفق عليه مزوّدان مستقلان
  if (out.rates?.gold) out.number = {kind: 'gold', v: out.rates.gold.usd_oz, unit: 'USD/oz', by: out.rates.gold.by, at: out.rates.updated};
  out.stats = STATS;
  if (!dry) writeFileSync(ROOT + 'desks.json', JSON.stringify(out, null, 1) + '\n');
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const o = await runDesks({dry: ARGS.includes('--dry'), news: !ARGS.includes('--no-news')});
  console.log('مصادر:', JSON.stringify({google: STATS.google, decoded: STATS.decoded, direct: STATS.direct, clusters: STATS.clusters}));
  console.log('العملات:', Object.keys(o.rates?.fx || {}).join(' '), 'الذهب:', o.rates?.gold?.usd_oz, 'مباريات:', o.sports?.matches?.length);
  if (STATS.failed.length) console.log('تعذّر:', STATS.failed.slice(0, 20).join('\n'));
}
