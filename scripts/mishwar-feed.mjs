// مشوار: يجلب طقس الدوحة من Open-Meteo وأخبار الطرق والطقس المحلية من أخبار Google (RSS)
// ويدمج الإغلاقات الرسمية من mishwar/closures.json، ثم يكتب mishwar/feed.json. يعمل من GitHub Actions كل 30 دقيقة.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const OUT = 'mishwar/feed.json', CLOSURES = 'mishwar/closures.json';
const prev = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

// WMO weather codes → Arabic text, icon, driving impact
function wmo(c) {
  if (c === 0) return ['صحو', 'sun', 'none'];
  if (c <= 2) return ['غائم جزئياً', 'cloud', 'none'];
  if (c === 3) return ['غائم', 'cloud', 'none'];
  if (c === 45 || c === 48) return ['ضباب', 'fog', 'fog'];
  if (c >= 51 && c <= 57) return ['رذاذ', 'rain', 'rain'];
  if (c >= 61 && c <= 67) return ['أمطار', 'rain', 'rain'];
  if (c >= 80 && c <= 82) return ['زخات مطر', 'rain', 'rain'];
  if (c >= 95) return ['عواصف رعدية', 'storm', 'storm'];
  return ['متقلب', 'cloud', 'none'];
}
const ADVICE = {
  rain: ['خفّف السرعة على الطرق المبللة.', 'شغّل المصابيح الأمامية.', 'اترك مسافة كافية بينك وبين المركبة التي أمامك.', 'تجنّب الطرق التي تتجمع فيها المياه.'],
  storm: ['أجّل المشوار غير الضروري حتى تهدأ العاصفة.', 'خفّف السرعة وشغّل المصابيح الأمامية.', 'ابتعد عن الأنفاق والطرق المنخفضة التي تتجمع فيها المياه.'],
  fog: ['خفّف السرعة وشغّل مصابيح الضباب.', 'لا تتجاوز المركبات، وزِد مسافة الأمان.', 'لا تستخدم إشارات التحذير الرباعية أثناء السير.'],
  dust: ['خفّف السرعة وشغّل المصابيح الأمامية.', 'أغلق النوافذ واستخدم تدوير الهواء الداخلي.', 'انتبه للرؤية المنخفضة على الطرق الخارجية.']
};

async function weather() {
  const u = 'https://api.open-meteo.com/v1/forecast?latitude=25.29&longitude=51.53&timezone=Asia%2FQatar&forecast_days=3'
    + '&current=temperature_2m,weather_code,wind_speed_10m,wind_gusts_10m,visibility,precipitation'
    + '&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max,wind_gusts_10m_max';
  const r = await fetch(u, { headers: { 'user-agent': 'munjiz-mishwar' } }); if (!r.ok) throw new Error('weather ' + r.status);
  const j = await r.json(), c = j.current, d = j.daily;
  let [cond, icon, impact] = wmo(c.weather_code);
  const vis = c.visibility != null ? Math.round(c.visibility / 100) / 10 : null;
  let warning = '';
  if (impact === 'none' && vis != null && vis < 2) { cond = 'رؤية منخفضة'; icon = 'fog'; impact = vis < 1 ? 'fog' : 'dust'; }
  if (impact === 'none' && c.wind_gusts_10m >= 45) { cond = 'رياح قوية'; icon = 'wind'; impact = 'dust'; }
  if (impact === 'rain') warning = 'أمطار على الطرق الآن. خفّف السرعة وتجنّب تجمعات المياه.';
  if (impact === 'storm') warning = 'عواصف رعدية. أجّل المشوار غير الضروري.';
  if (impact === 'fog') warning = `ضباب ورؤية ${vis} كم. خفّف السرعة وشغّل مصابيح الضباب.`;
  if (impact === 'dust') warning = vis != null && vis < 2 ? `رؤية منخفضة ${vis} كم بسبب الغبار أو الرياح.` : 'رياح قوية مثيرة للغبار على الطرق الخارجية.';
  const maxRainToday = d.precipitation_probability_max?.[0] ?? 0;
  if (!warning && maxRainToday >= 50) warning = `احتمال أمطار اليوم ${maxRainToday}%.`;
  const days = d.time.map((t, i) => ({ day: i === 0 ? 'اليوم' : i === 1 ? 'غداً' : DAYS[new Date(t + 'T12:00:00+03:00').getDay()], hi: d.temperature_2m_max[i], lo: d.temperature_2m_min[i], cond: wmo(d.weather_code[i])[0], rain: d.precipitation_probability_max?.[i] ?? 0 }));
  return { temp: c.temperature_2m, cond, icon, impact, wind: c.wind_speed_10m, gust: c.wind_gusts_10m, vis, warning, advice: ADVICE[impact] || [], days, source: 'Open-Meteo' };
}

const ent = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const text = s => ent(s || '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (x, t) => (x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '';
const QUERIES = [
  ['ar', '(إغلاق OR تحويلة OR "أشغال" OR "الإدارة العامة للمرور" OR حادث OR ازدحام) (قطر OR الدوحة) when:3d'],
  ['ar', '(الأرصاد OR أمطار OR ضباب OR غبار OR رياح) قطر when:2d'],
  ['en', '(Ashghal OR "road closure" OR diversion OR "traffic" OR accident) (Qatar OR Doha) when:3d'],
  ['en', '(QMD OR "Qatar Meteorology" OR rain OR fog OR dust OR "strong wind") Qatar when:2d']
];
const MUST = /قطر|الدوحة|لوسيل|الوكرة|الريان|الخور|أشغال|Qatar|Doha|Lusail|Wakra|Rayyan|Ashghal|QMD/i;
const SKIP = /مباراة|منتخب|كأس|الدوري|غزة|حرب|قصف|ناقلة|الملاحة البحرية|تدين|سفير|مؤتمر|متاحف|طيران|match|football|league|Gaza|war|airline|flight|aviation|air traffic|maritime|tanker|stock|بورصة|Foreign Minister|internet|جائزة|الترشح|meets|يستقبل|يلتقي/i;
// keep only headlines that are actually about roads, traffic or weather
const ROAD = /طريق|الطرق|شارع|تقاطع|نفق|جسر|المرور|مروري|حادث سير|حادث مروري|ازدحام|زحام|تحويلة|أمطار|مطر|الأرصاد|ضباب|غبار|رياح|طقس|الطقس|سيول|رعد|\broad|street|interchange|tunnel|bridge|diversion|traffic|accident|crash|congestion|\brain|fog|dust|wind|weather|QMD|Meteorolog|storm|thunder/i;
function kind(t) {
  if (/إغلاق|تحويل|مغلق|closure|closed|diversion/i.test(t) && /طريق|شارع|تقاطع|نفق|جسر|مخرج|road|street|interchange|tunnel|bridge|exit/i.test(t)) return 'closure';
  if (/أرصاد|مطر|أمطار|ضباب|غبار|رياح|طقس|حرارة|QMD|Meteorolog|rain|fog|dust|wind|weather/i.test(t)) return 'weather';
  if (/سلامة|توعية|safety|awareness/i.test(t)) return 'safety';
  return 'traffic';
}
async function news() {
  const all = [], seen = new Set();
  for (const [lang, q] of QUERIES) {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${lang === 'ar' ? 'hl=ar&gl=QA&ceid=QA:ar' : 'hl=en-QA&gl=QA&ceid=QA:en'}`;
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 munjiz-mishwar' } }); if (!r.ok) throw new Error(r.status);
      const xml = await r.text();
      for (const it of xml.split('<item>').slice(1)) {
        let title = text(tag(it, 'title')), source = text(tag(it, 'source')), link = text(tag(it, 'link'));
        if (source && title.endsWith(' - ' + source)) title = title.slice(0, -(source.length + 3));
        const key = title.replace(/[\s\p{P}]+/gu, '').slice(0, 60);
        if (!/^https:\/\//.test(link) || !title || seen.has(key) || !MUST.test(title) || !ROAD.test(title) || SKIP.test(title)) continue; seen.add(key);
        const d = new Date(text(tag(it, 'pubDate')));
        all.push({ title: title.slice(0, 200), link, source: source.slice(0, 60), date: isNaN(d) ? '' : d.toISOString(), kind: kind(title), lang });
      }
    } catch (e) { console.error('news', lang, e.message); }
  }
  // Arabic first, then newest
  return all.sort((a, b) => (a.lang === b.lang ? 0 : a.lang === 'ar' ? -1 : 1) || (b.date || '').localeCompare(a.date || '')).slice(0, 14);
}

const out = { updated: new Date().toISOString() };
try { out.weather = await weather(); } catch (e) { console.error(e.message); out.weather = prev.weather; }
try { const n = await news(); out.news = n.length ? n : prev.news || []; } catch (e) { out.news = prev.news || []; }
try { out.closures = JSON.parse(readFileSync(CLOSURES, 'utf8')).filter(c => !c.until || new Date(c.until) > new Date()); } catch (e) { out.closures = []; }
if (!out.weather && !out.news.length) { console.error('nothing fetched; keeping the previous file'); process.exit(0); }
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log('weather', out.weather && out.weather.cond, 'news', out.news.length, 'closures', out.closures.length);
