// «خبر»: الطيار الآلي. يعمل من GitHub Actions كل ساعة دون أي تدخل بشري أو جلسة محرر.
//  1. إذا فات موعد الخلاصة (6:20 صباحاً أو 6:20 مساءً بتوقيت الدوحة) ولم تُنشر، يكتب «خلاصة آلية» من عناوين المصادر نفسها:
//     كل خبر هو عنوان الجهة الناشرة كما نشرته، مع اسمها وتاريخها ورابط مقالها الأصلي (تُفك روابط أخبار Google إلى الرابط الأصلي، وما لا يُفك يُحذف).
//  2. يفحص الموقع المنشور ولوحاته وحداثة البيانات، ويكتب النتيجة في data/health.json، ويخرج بخطأ إن وُجد عطل حتى يصل التنبيه.
// الاستخدام: node khabar/scripts/autopilot.mjs [--force] [--dry] [--no-health]
import {readFileSync, writeFileSync, existsSync} from 'node:fs';

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
// الخلاصة المتوقعة الآن: الصباح من 6:20 إلى 18:19، والمساء من 18:20 إلى 6:19 من اليوم التالي
function expected(now = new Date()) {
  const t = doha(now), GRACE = 6 * 60 + 20;
  if (t.min >= GRACE && t.min < 12 * 60 + GRACE) return {id: t.day + '-am', date: t.day, edition: 'am'};
  if (t.min >= 12 * 60 + GRACE) return {id: t.day + '-pm', date: t.day, edition: 'pm'};
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
const PER_ZONE = {ar: 6, en: 5}, MAX_AGE_H = 24;
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
    const key = title.replace(/\W+/g, '').slice(0, 40);
    if (!title || !source || seen.has(key) || !/^https:\/\//.test(url) || host(url).endsWith('google.com') || !q.must[lang].test(title) || SKIP.test(title) || d < since) return;
    seen.add(key); out.push({title: title.slice(0, 240), source: source.slice(0, 80), url, date: iso(d), t: +d});
  };
  try {
    const loc = lang === 'ar' ? 'hl=ar&gl=QA&ceid=QA:ar' : 'hl=en-QA&gl=QA&ceid=QA:en';
    const items = (await rss(`https://news.google.com/rss/search?q=${encodeURIComponent(q[lang])}&${loc}`)).sort((a, b) => b.d - a.d);
    for (const it of items) {
      if (out.length >= PER_ZONE[lang]) break;
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
  let total = 0;
  for (const z of Object.keys(Q)) {
    const items = [];
    for (const lang of ['ar', 'en']) {
      const got = await collect(z, lang, since);
      got.forEach((h, i) => {
        const sid = `auto-${z}-${lang}${i + 1}`;
        sources[sid] = {ar: h.source, en: h.source, date: h.date, url: h.url};
        items.push({id: `${z[0]}${lang === 'ar' ? 'a' : 'e'}${i + 1}`, cat: {ar: 'عنوان موثّق', en: 'Sourced headline'}, ar: lang === 'ar' ? h.title : '', en: lang === 'en' ? h.title : '', src: [sid]});
      });
    }
    total += items.length;
    zones.push({id: z, name: {ar: ZNAME[z][0], en: ZNAME[z][1]}, items});
  }
  if (total < 8) return null; // لا تُستبدل خلاصة سابقة بخلاصة هزيلة
  const first = l => zones.map(z => z.items.find(i => i[l])).filter(Boolean);
  const pick = (l, sep) => first(l).map(i => i[l]).join(sep);
  const thread = {
    ar: `${exp.edition === 'am' ? 'صباح' : 'مساء'} اليوم بعناوين مصادره كما نشرتها: ${pick('ar', '؛ ')}.`,
    en: `Today's ${exp.edition === 'am' ? 'morning' : 'evening'} in the outlets' own headlines: ${pick('en', '; ')}.`,
    src: [...new Set([...first('ar'), ...first('en')].flatMap(i => i.src))]
  };
  // الأسواق والمواعيد من الخلاصة السابقة، بشرط حداثة المصدر وعدم فوات الموعد
  const today = doha().day, cutoff = iso(new Date(Date.now() - 3 * 864e5));
  const okSrc = list => (list || []).every(s => prev?.sources?.[s] && prev.sources[s].date >= cutoff);
  const markets = (prev?.markets || []).filter(m => okSrc(m.src));
  const roadmap = (prev?.roadmap || []).filter(r => (r.date || '9999') >= today && (r.src || []).every(s => prev?.sources?.[s]));
  for (const x of [...markets, ...roadmap]) for (const s of x.src || []) sources[s] = prev.sources[s];
  return {id: exp.id, edition: exp.edition, date: exp.date, published: doha().iso, auto: true,
    title: {ar: exp.edition === 'am' ? 'خلاصة الصباح الآلية' : 'خلاصة المساء الآلية', en: exp.edition === 'am' ? 'Automatic Morning Brief' : 'Automatic Evening Brief'},
    thread, markets, zones, roadmap, sources};
}

function archive(b) {
  writeJSON(`archive/${b.id}.json`, b);
  const idx = readJSON('archive/index.json', {briefs: []});
  idx.briefs = [{id: b.id, date: b.date, edition: b.edition, ...(b.auto ? {auto: true} : {})}, ...idx.briefs.filter(x => x.id !== b.id)]
    .sort((a, c) => c.id.localeCompare(a.id));
  writeJSON('archive/index.json', idx);
}

// ---------- الفحص ----------
const SITE = 'https://munjiz-qa.github.io/';
const PAGES = [['خبر: الصفحة الرئيسية', 'khabar/'], ['خبر: لوحة الإدارة', 'khabar/admin/'], ['خبر: حساب العميل', 'khabar/account/'],
  ['خبر: الخلاصة المنشورة', 'khabar/data/brief.json'], ['قُطب: لوحة الإدارة الموحّدة', 'qutb/']];
async function health(brief) {
  const checks = [];
  for (const [name, p] of PAGES) {
    const t0 = Date.now(); let code = 0;
    try { code = (await fetch(SITE + p + '?t=' + Date.now(), {headers: UA, signal: AbortSignal.timeout(20000)})).status; } catch (e) {}
    checks.push({name, url: SITE + p, ok: code === 200, code, ms: Date.now() - t0});
  }
  const head = readJSON('headlines.json', {}), exp = expected();
  const briefAge = (Date.now() - new Date(brief.published)) / 3600e3, headAge = (Date.now() - new Date(head.updated)) / 3600e3;
  checks.push({name: 'الخلاصة في موعدها', ok: brief.id === exp.id, detail: `${brief.id}${brief.auto ? ' (آلية)' : ''}، المتوقع ${exp.id}`});
  checks.push({name: 'العناوين الآلية حديثة', ok: headAge < 7, detail: `آخر تحديث قبل ${headAge.toFixed(1)} ساعة`});
  const n = (brief.zones || []).reduce((s, z) => s + z.items.length, 0), unsourced = (brief.zones || []).flatMap(z => z.items).filter(i => !(i.src || []).every(s => brief.sources[s]?.url)).length;
  checks.push({name: 'كل خبر بمصدره', ok: n >= 8 && unsourced === 0, detail: `${n} خبراً، ${unsourced} دون مصدر`});
  const at = new Date().toISOString();
  return {checked: at, updated: at, ok: checks.every(c => c.ok), brief: {id: brief.id, auto: !!brief.auto, age_h: +briefAge.toFixed(1)},
    writer: process.env.ANTHROPIC_API_KEY ? 'agent' : 'autopilot', checks};
}

// ---------- التشغيل ----------
const exp = expected(), cur = readJSON('brief.json', null);
let wrote = false;
if (ARGS.has('--force') || !cur || cur.id < exp.id) {
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

if (!ARGS.has('--no-health')) {
  const h = await health(readJSON('brief.json', cur));
  const old = readJSON('health.json', {});
  // لا نلتزم كل ساعة بلا تغيير: نكتب عند تغيّر الحالة أو الخلاصة، أو كل 6 ساعات
  const changed = !old.checked || old.ok !== h.ok || old.brief?.id !== h.brief.id || (Date.now() - new Date(old.checked)) > 6 * 3600e3
    || JSON.stringify(old.checks?.map(c => c.ok)) !== JSON.stringify(h.checks.map(c => c.ok));
  if (changed && !ARGS.has('--dry')) writeJSON('health.json', h);
  h.checks.forEach(c => console.log(c.ok ? '✓' : '✗', c.name, c.code || '', c.detail || ''));
  if (process.env.GITHUB_OUTPUT) writeFileSync(process.env.GITHUB_OUTPUT, `ok=${h.ok}\nwrote=${wrote}\n`, {flag: 'a'});
  if (!h.ok) { console.error('::warning::يوجد عطل في تشغيل «خبر»؛ التفاصيل أعلاه.'); }
}
