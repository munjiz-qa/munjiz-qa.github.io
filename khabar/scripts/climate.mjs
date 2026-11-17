// «خبر»: أخبار المناخ والطقس حول العالم، كل 3 ساعات من GitHub Actions (ومع كل خلاصة من الخلاصات الأربع).
// القاعدة: لا يُنشر خبر إلا إذا نقلته جهتان مستقلتان على الأقل (مؤسستان مختلفتان)، ولكل جهة عنوانها كما نشرته وتاريخه ورابطه الأصلي.
// طرق التحقق المعروضة تحت كل خبر: (1) تطابق جهتين صحفيتين مستقلتين فأكثر، (2) جهة رسمية أو أممية بين المصادر،
// (3) مطابقة آلية مع بيانات الكوارث العالمية GDACS (الأمم المتحدة والمفوضية الأوروبية) لنوع الحدث وبلده.
// ما لا يتأكد من جهتين مستقلتين لا يُنشر. الاستخدام: node khabar/scripts/climate.mjs [--dry]
import {readFileSync, writeFileSync} from 'node:fs';

const OUT = 'khabar/data/climate.json', DRY = process.argv.includes('--dry');
const UA = {'user-agent': 'Mozilla/5.0 (compatible; khabar-climate/1.0; +https://munjiz-qa.github.io/khabar/)'};
const MAX_AGE_H = 48, PER_LANG = 8;

// org: المؤسسة الناشرة (جهتان من المؤسسة نفسها لا تُعدّان مستقلتين). topic: الخلاصة مخصّصة للمناخ والبيئة.
const FEEDS = {
  en: [
    {url: 'https://news.un.org/feed/subscribe/en/news/topic/climate-change/feed/rss.xml', org: 'un', name: 'UN News', topic: true, official: true},
    {url: 'https://reliefweb.int/updates/rss.xml', org: 'reliefweb', name: 'ReliefWeb (OCHA)', official: true},
    {url: 'https://www.theguardian.com/environment/climate-crisis/rss', org: 'guardian', name: 'The Guardian', topic: true},
    {url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', org: 'bbc', name: 'BBC News'},
    {url: 'https://www.aljazeera.com/xml/rss/all.xml', org: 'aljazeera', name: 'Al Jazeera'},
    {url: 'https://insideclimatenews.org/feed/', org: 'icn', name: 'Inside Climate News', topic: true},
    {url: 'https://grist.org/feed/', org: 'grist', name: 'Grist', topic: true},
    {url: 'https://www.climatechangenews.com/feed/', org: 'chn', name: 'Climate Home News', topic: true},
    {url: 'https://e360.yale.edu/feed.xml', org: 'yale', name: 'Yale Environment 360', topic: true},
    {url: 'https://www.cbsnews.com/latest/rss/science', org: 'cbs', name: 'CBS News'},
    {url: 'https://www.scientificamerican.com/platform/syndication/rss/', org: 'sciam', name: 'Scientific American'},
    {url: 'https://www.france24.com/en/rss', org: 'france24', name: 'France 24'},
    {url: 'https://rss.dw.com/rdf/rss-en-all', org: 'dw', name: 'DW'}
  ],
  ar: [
    {url: 'https://news.un.org/feed/subscribe/ar/news/topic/climate-change/feed/rss.xml', org: 'un', name: 'أخبار الأمم المتحدة', topic: true, official: true},
    {url: 'https://feeds.bbci.co.uk/arabic/rss.xml', org: 'bbc', name: 'بي بي سي عربي'},
    {url: 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9', org: 'aljazeera', name: 'الجزيرة نت'},
    {url: 'https://rss.dw.com/rdf/rss-ar-all', org: 'dw', name: 'دويتشه فيله عربية'},
    {url: 'https://www.france24.com/ar/rss', org: 'france24', name: 'فرانس 24'},
    {url: 'https://aawsat.com/feed', org: 'aawsat', name: 'الشرق الأوسط'},
    {url: 'https://www.annahar.com/rss', org: 'annahar', name: 'النهار'},
    {url: 'https://www.alquds.co.uk/feed/', org: 'alquds', name: 'القدس العربي'},
    {url: 'https://www.youm7.com/rss/SectionRss?SectionID=65', org: 'youm7', name: 'اليوم السابع'},
    {url: 'https://www.skynewsarabia.com/web/rss', org: 'skynews', name: 'سكاي نيوز عربية'}
  ]
};

const RELEVANT = {
  en: /\bclimate|\bcop ?31\b|global warming|greenhouse|emission|carbon|heat ?wave|extreme heat|drought|flood|wildfire|bushfire|hurricane|typhoon|cyclone|tropical storm|tornado|monsoon|el ni[nñ]o|la ni[nñ]a|glacier|ice sheet|sea[- ]level|methane|net[- ]zero|renewable|fossil fuel|coal|weather|rainfall|heavy rain|snowstorm|blizzard|hottest|record heat|deforestation|wmo\b|meteorolog|landslide|dust storm|sandstorm|air pollution|smog/i,
  ar: /المناخ|مناخي|المناخية|كوب ?31|cop ?31|الاحتباس|الانبعاثات|انبعاثات|الكربون|موجة حر|موجة حارة|الحر الشديد|الجفاف|جفاف|فيضان|فيضانات|السيول|سيول|حرائق الغابات|حرائق غابات|إعصار|الإعصار|عاصفة|العاصفة|منخفض جوي|الأمطار|أمطار|الطقس|الأرصاد|درجات الحرارة|ذوبان|الجليد|الأنهار الجليدية|مستوى سطح البحر|الطاقة المتجددة|الوقود الأحفوري|التصحر|الغبار|عاصفة رملية|تلوث الهواء|انهيار أرضي|انهيارات أرضية|الثلوج/i
};
// يُستبعد ما يطابق الكلمات مجازاً أو في سياق آخر
const SKIP = {
  en: /stock|shares|earnings|football|soccer|cricket|nba|nfl|tennis|\bstorm(ed|s)? (of|out|the)\b|brainstorm|political climate|business climate|investment climate|climate of fear|weather(ed|ing)? the|carbon copy|podcast|quiz|crossword|recipe|horoscope/i,
  ar: /مباراة|الدوري|كرة القدم|المنتخب|أسهم|البورصة|عاصفة من (الانتقادات|الجدل)|المناخ السياسي|مناخ الاستثمار|مناخ الأعمال|برج|حظك|وصفة/i
};
const HAZ = [
  ['TC', /hurricane|typhoon|cyclone|tropical storm|إعصار|الإعصار|عاصفة استوائية/i],
  ['FL', /flood|floods|flooding|فيضان|فيضانات|سيول/i],
  ['DR', /drought|جفاف|الجفاف/i],
  ['WF', /wildfire|bushfire|forest fire|حرائق الغابات|حرائق غابات/i],
  ['VO', /volcano|eruption|بركان|ثوران/i]
];

const ent = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const text = s => ent(ent(s || '')).replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
const sleep = ms => new Promise(r => setTimeout(r, ms));
// المؤسسة من نطاق موقعها: bbc.com وbbc.co.uk مؤسسة واحدة، وaljazeera.net وaljazeera.com كذلك
const ALIAS = {'bbc.co.uk': 'bbc', 'bbc.com': 'bbc', 'aljazeera.net': 'aljazeera', 'aljazeera.com': 'aljazeera', 'dw.com': 'dw', 'france24.com': 'france24', 'un.org': 'un', 'reuters.com': 'reuters', 'apnews.com': 'ap', 'cnn.com': 'cnn', 'skynewsarabia.com': 'skynews', 'news.sky.com': 'sky'};
function orgOf(u) {
  let h = ''; try { h = new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return ''; }
  const p = h.split('.'), two = p.slice(-2).join('.'), three = p.slice(-3).join('.');
  const reg = /^(co|com|org|net|gov|ac|edu)\.[a-z]{2}$/.test(two) ? three : two;
  return ALIAS[h] || ALIAS[reg] || reg;
}
const BIG = new Set(['reuters', 'ap', 'bbc', 'aljazeera', 'theguardian.com', 'bloomberg.com', 'france24', 'dw', 'un', 'nytimes.com', 'washingtonpost.com', 'cnn', 'sky', 'skynews', 'afp.com', 'aawsat.com', 'alarabiya.net', 'wmo.int', 'reliefweb', 'euronews.com', 'npr.org', 'cbsnews.com', 'abcnews.go.com', 'nbcnews.com', 'ft.com', 'economist.com', 'qna.org.qa', 'spa.gov.sa', 'wam.ae']);
const GNEWS = {
  en: ['(climate OR COP31 OR "climate change" OR emissions OR "global warming" OR "extreme weather") when:2d', '(cyclone OR typhoon OR hurricane OR monsoon OR heatwave OR drought OR wildfire OR floods) (killed OR dead OR displaced OR evacuate OR UN OR warning) when:2d'],
  ar: ['(المناخ OR كوب31 OR الاحتباس الحراري OR الانبعاثات OR الجفاف) when:2d', '(الطقس OR الأرصاد OR فيضانات OR سيول OR إعصار OR عاصفة OR موجة حر) when:2d']
};
const GLOC = {en: 'hl=en-GB&gl=GB&ceid=GB:en', ar: 'hl=ar&gl=EG&ceid=EG:ar'};
// فك رابط أخبار Google إلى رابط المقال الأصلي (الطريقة نفسها في autopilot.mjs)؛ ما لا يُفك لا يُنشر
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
      if (/^https?:\/\//.test(u)) return u;
    } catch (e) { /* نجرب الصفحة التالية */ }
  }
  return null;
}
async function google(lang) {
  const out = [];
  for (const q of GNEWS[lang]) {
    try {
      const r = await fetch(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${GLOC[lang]}`, {headers: UA, signal: AbortSignal.timeout(20000)});
      if (!r.ok) throw new Error('google ' + r.status);
      for (const it of (await r.text()).split('<item>').slice(1)) {
        const source = text(tag(it, 'source')), surl = attr(it, 'source', 'url'), d = new Date(text(tag(it, 'pubDate')));
        let title = text(tag(it, 'title')); if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
        title = title.split(' | ')[0].trim();
        const link = text(tag(it, 'link'));
        if (!title || !source || !surl || isNaN(d) || Date.now() - d > MAX_AGE_H * 3600e3 || !/^https:\/\/news\.google\.com\//.test(link)) continue;
        out.push({title, desc: '', link, d, f: {org: orgOf(surl), name: source.slice(0, 80), google: true}});
      }
    } catch (e) { console.error(lang, e.message); }
  }
  return out;
}
const tag = (x, t) => (x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '';
const attr = (x, t, a) => (x.match(new RegExp(`<${t}[^>]*${a}="([^"]+)"`)) || [])[1] || '';

async function feed(f) {
  const r = await fetch(f.url, {headers: UA, signal: AbortSignal.timeout(20000), redirect: 'follow'});
  if (!r.ok) throw new Error(r.status + ' ' + f.url);
  const xml = await r.text();
  return xml.split(/<item[\s>]|<entry[\s>]/).slice(1).map(it => {
    const d = new Date(text(tag(it, 'pubDate')) || text(tag(it, 'dc:date')) || text(tag(it, 'updated')) || text(tag(it, 'published')));
    let link = text(tag(it, 'link')) || attr(it, 'link', 'href') || text(tag(it, 'guid'));
    if (link.startsWith('http://')) link = 'https://' + link.slice(7);
    return {title: text(tag(it, 'title')), desc: text(tag(it, 'description')).slice(0, 400), link, d};
  }).filter(x => x.title && /^https:\/\/[^\s]+\.[^\s]+/.test(x.link) && !isNaN(x.d) && Date.now() - x.d < MAX_AGE_H * 3600e3 && x.d - Date.now() < 3600e3);
}

// ---------- التجميع: عناوين تصف الحدث نفسه ----------
const STOP = {
  en: new Set('the a an and or of to in on for with at by from as is are was were be been has have had it its this that these those after over amid into new says say said will could would can may about more than up down out how why what who when where us uk world global news report reports live latest update day week year years'.split(' ')),
  ar: new Set('في من على إلى الى عن مع بعد قبل حول خلال بين هذا هذه ذلك التي الذي الذين كان كانت يكون تكون قد لم لن ما لا أن إن أو ثم كل بعض عند منذ حتى لدى غير اليوم أمس العالم العالمي العالمية تقرير جديد جديدة يقول قال قالت وسط إثر عبر بشأن أكثر'.split(' '))
};
// كلمات الموضوع العامة لا تكفي وحدها لعدّ عنوانين حدثاً واحداً: يلزم تطابق في الأسماء والأماكن والأرقام والأفعال
const GENERIC = {
  en: new Set('climate change carbon emission emissions cop cop31 flood flooding weather storm rain heavy warning alert system early action deliver market markets finance fossil fuel extreme heat wave heatwave global warming talk talks summit deal countr country countries need make help could cannot can’t plan push call urge un nation nations leader leaders energy green crisis risk impact people'.split(' ').map(w => w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '').replace(/(ing|ed)$/, ''))),
  ar: new Set('مناخ مناخي مناخيه كوب 31 cop31 انبعاث انبعاثات كربون طقس فيضان فيضان سيول امطار مطار عاصفه تحذير تنبيه نظام قمه مفاوض تمويل وقود احفوري تطرف متطرف حراره دول دوله عالم عالمي تغير ازمه طاقه'.split(' '))
};
function tokens(s, lang) {
  const out = new Set();
  for (let w of s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/[\s-]+/)) {
    if (lang === 'ar') {
      w = w.replace(/[ً-ْـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة$/, 'ه');
      w = w.replace(/^(وال|بال|كال|فال|لل|ال|و(?=..))/, '');
      w = w.replace(/(ات|ون|ين|ان|ها|هم)$/, '');
      if (w.length < 3 || STOP.ar.has(w)) continue;
    } else {
      if (w.length < 3 || STOP.en.has(w)) continue;
      w = w.replace(/(ies)$/, 'y').replace(/(es|s)$/, '').replace(/(ing|ed)$/, '');
      if (w.length < 3) continue;
    }
    out.add(w);
  }
  return out;
}
const specific = (s, lang) => new Set([...tokens(s, lang)].filter(w => !GENERIC[lang].has(w)));
const shared = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n; };
function similar(a, b) {
  const s = shared(a.tt, b.tt), m = Math.max(1, Math.min(a.tt.size, b.tt.size));
  if (s >= 3 && s / m >= 0.5) return true;
  // عنوان قصير مع وصف يؤكد الحدث نفسه
  return s >= 2 && s / m >= 0.5 && shared(a.all, b.all) >= 5;
}

async function gdacs() {
  const to = new Date(), from = new Date(Date.now() - 14 * 864e5), f = d => d.toISOString().slice(0, 10);
  const url = `https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC;FL;DR;WF;VO&alertlevel=Green;Orange;Red&fromdate=${f(from)}&todate=${f(to)}`;
  const r = await fetch(url, {headers: UA, signal: AbortSignal.timeout(25000)});
  if (!r.ok) throw new Error('gdacs ' + r.status);
  return ((await r.json()).features || []).map(x => x.properties).filter(p => p && p.url && p.url.report);
}

async function build() {
  let G = [];
  try { G = await gdacs(); } catch (e) { console.error(e.message); }
  const res = {updated: new Date().toISOString(), rule: 'two_independent_outlets', window_h: MAX_AGE_H, feeds: {}, ar: [], en: [], dropped: {ar: 0, en: 0}};
  for (const lang of ['en', 'ar']) {
    const pool = [];
    for (const f of FEEDS[lang]) {
      try {
        const items = await feed(f);
        let n = 0;
        for (const it of items) {
          const t = it.title + ' ' + it.desc;
          if (!(f.topic || RELEVANT[lang].test(it.title)) || SKIP[lang].test(it.title)) continue;
          if (f.topic && !RELEVANT[lang].test(t)) continue;
          pool.push({...it, f: {...f, org: orgOf(it.link) || f.org}, tt: specific(it.title, lang), all: specific(t, lang)}); n++;
        }
        res.feeds[f.org + ':' + lang] = n;
      } catch (e) { res.feeds[f.org + ':' + lang] = 'error'; console.error(lang, e.message); }
    }
    const gi = await google(lang); res.feeds['google:' + lang] = gi.length;
    const seenT = new Set(pool.map(x => x.title));
    for (const it of gi) {
      if (seenT.has(it.title) || !RELEVANT[lang].test(it.title) || SKIP[lang].test(it.title)) continue;
      seenT.add(it.title); pool.push({...it, tt: specific(it.title, lang), all: specific(it.title, lang)});
    }
    // تجميع: كل عنوان ينضم إلى مجموعة يشبه عنوانها الأول ونصف عناوينها على الأقل (حتى لا تتسلسل أحداث مختلفة في خبر واحد)
    const groups = [];
    pool.sort((a, b) => b.d - a.d);
    for (const it of pool) {
      const g = groups.find(g => similar(g[0], it) && g.filter(x => similar(x, it)).length * 2 >= g.length);
      if (g) g.push(it); else groups.push([it]);
    }
    const ok = [];
    groups.sort((a, b) => new Set(b.map(x => x.f.org)).size - new Set(a.map(x => x.f.org)).size || b[0].d - a[0].d);
    for (const g of groups) {
      const byOrg = new Map();
      for (const it of g) if (!byOrg.has(it.f.org)) byOrg.set(it.f.org, it);
      if (byOrg.size < 2) { res.dropped[lang]++; continue; }
      if (ok.length >= PER_LANG + 4) break;
      let src = [...byOrg.values()].sort((a, b) => (b.f.official ? 1 : 0) - (a.f.official ? 1 : 0) || (a.f.google ? 1 : 0) - (b.f.google ? 1 : 0) || a.d - b.d).slice(0, 4);
      // روابط أخبار Google تُفك إلى المقال الأصلي، ويُعاد التحقق من أن الجهتين مستقلتان بعد الفك
      for (const s of src) if (s.f.google) { const u = await decodeGoogle(s.link); await sleep(350); s.link = u && /^https?:\/\//.test(u) ? u.replace(/^http:/, 'https:') : null; if (s.link) s.f = {...s.f, org: orgOf(s.link) || s.f.org}; }
      src = src.filter(s => s.link && !/google\.com$/.test(new URL(s.link).hostname)).filter((s, i, a) => a.findIndex(x => x.f.org === s.f.org) === i);
      if (src.length < 2) { res.dropped[lang]++; continue; }
      const lead = src.find(s => !s.f.official) || src[0];
      const txt = g.map(x => x.title + ' ' + x.desc).join(' ');
      const methods = ['outlets'];
      if (src.some(s => s.f.official)) methods.push('official');
      // مطابقة بيانات GDACS: نوع الحدث نفسه وبلد من البلدان المتأثرة مذكور في الخبر
      let data = null;
      for (const [type, re] of HAZ) {
        if (!re.test(txt)) continue;
        const ev = G.find(p => p.eventtype === type && String(p.eventname || '').split('-')[0].length > 2 && new RegExp('\\b' + String(p.eventname).split('-')[0] + '\\b', 'i').test(txt))
          || G.find(p => p.eventtype === type && (p.affectedcountries || []).some(c => c.countryname && c.countryname.length > 3 && new RegExp('\\b' + c.countryname.replace(/[^A-Za-z ]/g, '') + '\\b', 'i').test(txt)));
        if (ev) { data = {name: 'GDACS', title: ev.name, alert: ev.alertlevel, url: ev.url.report, date: String(ev.datemodified || ev.todate || '').slice(0, 10)}; methods.push('data'); break; }
      }
      const outlets = src.length;
      ok.push({
        id: lang + '-' + lead.d.toISOString().slice(0, 13).replace(/\D/g, '') + '-' + Math.abs([...lead.title].reduce((h, c) => (h * 31 + c.codePointAt(0)) | 0, 7)).toString(36),
        title: lead.title.slice(0, 220), date: lead.d.toISOString(),
        outlets, grade: outlets >= 3 || methods.length >= 2 ? 'strong' : 'confirmed', methods,
        sources: src.map(s => ({name: s.f.name, title: s.title.slice(0, 220), url: s.link, date: s.d.toISOString().slice(0, 10), official: !!s.f.official})),
        data
      });
    }
    // الأولوية للحدث الذي نقلته جهات أكثر، ثم لوجود جهة رسمية أو وكالة أو مؤسسة دولية بين مصادره، ثم للأحدث
    const score = x => x.outlets + (x.methods.length - 1) + (x.sources.some(s => BIG.has(orgOf(s.url))) ? 1 : 0);
    ok.sort((a, b) => score(b) - score(a) || new Date(b.date) - new Date(a.date));
    // لا يتكرر الحدث نفسه في خبرين
    const kept = [];
    for (const x of ok) {
      const tx = tokens(x.sources.map(s => s.title).join(' '), lang);
      if (kept.some(k => { const n = shared(k.tx, tx); return n >= 3 && n / Math.min(k.tx.size, tx.size) >= 0.2; })) continue;
      kept.push({...x, tx});
    }
    res[lang] = kept.slice(0, PER_LANG).map(({tx, ...x}) => x);
  }
  return res;
}

let prev = {};
try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch (e) {}
const res = await build();
const n = res.ar.length + res.en.length;
console.log('climate', {ar: res.ar.length, en: res.en.length, dropped: res.dropped});
if (DRY) { console.log(JSON.stringify(res, null, 1)); process.exit(0); }
// لا يُستبدل ملف فيه أخبار مؤكدة بملف فارغ إذا تعطلت الخلاصات مؤقتاً (يبقى السابق ما دام أحدث من يومين)
for (const lang of ['ar', 'en']) if (!res[lang].length && prev[lang]?.length && Date.now() - new Date(prev.updated) < MAX_AGE_H * 3600e3) { res[lang] = prev[lang]; res['kept_' + lang] = prev.updated; }
if (!n && !res.ar.length && !res.en.length) console.error('no confirmed climate stories now; writing an empty list');
writeFileSync(OUT, JSON.stringify(res, null, 1) + '\n');
