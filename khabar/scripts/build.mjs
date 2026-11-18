// «عبدو نيوز»: ملفات مشتقة تُبنى آلياً بعد كل تحديث (لا تحتاج جلسة محرر):
//  - data/search.json: فهرس بحث مضغوط لكل الخلاصات المؤرشفة (البحث والاختبار الأسبوعي والمساعد).
//  - data/transparency.json: تقرير الشفافية الشهري (عدد الخلاصات والأخبار والمصادر والجهات والتصحيحات).
//  - feeds/*.xml: خلاصات RSS للخلاصة الرئيسية ولكل قسم بالعربية والإنجليزية.
//  - sitemap.xml وnews-sitemap.xml داخل khabar/ لمحركات البحث وGoogle News.
// الاستخدام: node khabar/scripts/build.mjs
import {readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync} from 'node:fs';

const K = 'khabar/', DATA = K + 'data/', SITE = 'https://munjiz-qa.github.io/abdo-news/';
const rj = (f, d) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch (e) { return d; } };
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const outletOf = u => { try { const p = new URL(u).hostname.replace(/^(www|amp|m|en|english|arabic)\./, '').split('.'); return p.length > 2 && ['co', 'com', 'org', 'net', 'gov'].includes(p[p.length - 2]) ? p.slice(-3).join('.') : p.slice(-2).join('.'); } catch (e) { return ''; } };
const cut = (s, n) => { s = String(s || ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

// ---------- فهرس البحث ----------
const idx = rj(DATA + 'archive/index.json', {briefs: []});
const briefs = idx.briefs.map(b => rj(`${DATA}archive/${b.id}.json`, null)).filter(Boolean);
const search = [], seenTxt = new Set();
// الخبر نفسه يتكرر في خلاصات اليوم المتتالية: نُبقي أحدث نسخة فقط، ونختصر النص ليبقى الفهرس خفيفاً على الجوال
for (const b of briefs) for (const z of b.zones || []) for (const i of z.items || []) {
  const key = String(i.ar || i.en || '').slice(0, 70); if (seenTxt.has(key)) continue; seenTxt.add(key);
  const src = (i.src || []).map(s => b.sources?.[s]).filter(Boolean);
  search.push([b.id, z.id, i.id, cut(i.ar, 200), cut(i.en, 170), src.slice(0, 2).map(s => [s.ar || s.en, s.url])]);
}
writeFileSync(DATA + 'search.json', JSON.stringify({updated: new Date().toISOString(), fields: ['brief', 'zone', 'item', 'ar', 'en', 'sources'], items: search}));

// ---------- تقرير الشفافية الشهري ----------
const months = {};
const corr = rj(DATA + 'corrections.json', {items: []}).items || [];
for (const b of briefs) {
  const m = (b.date || b.id).slice(0, 7), r = months[m] ||= {month: m, briefs: 0, auto: 0, items: 0, sources: 0, outlets: new Set(), corrections: 0};
  r.briefs++; if (b.auto) r.auto++;
  for (const z of b.zones || []) r.items += (z.items || []).length;
  for (const s of Object.values(b.sources || {})) { r.sources++; const o = outletOf(s.url); if (o) r.outlets.add(o); }
}
for (const c of corr) { const m = (c.date || '').slice(0, 7); if (months[m]) months[m].corrections++; }
const mil = rj(DATA + 'military.json', null), desks = rj(DATA + 'desks.json', null);
writeFileSync(DATA + 'transparency.json', JSON.stringify({updated: new Date().toISOString(),
  months: Object.values(months).sort((a, b) => b.month.localeCompare(a.month)).map(r => ({...r, outlets: r.outlets.size})),
  now: {desk_items: desks ? Object.values(desks.desks).reduce((s, d) => s + d.items.length, 0) : 0, military_items: mil ? mil.regions.reduce((s, r) => s + r.items.length, 0) : 0, corrections: corr.length}}, null, 1) + '\n');

// ---------- RSS ----------
mkdirSync(K + 'feeds', {recursive: true});
const rss = (title, link, desc, lang, items) => `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>
<title>${esc(title)}</title><link>${esc(link)}</link><description>${esc(desc)}</description><language>${lang}</language>
<atom:link href="${esc(SITE + 'feeds/')}" rel="self" type="application/rss+xml"/>
${items.map(i => `<item><title>${esc(i.title)}</title><link>${esc(i.link)}</link><guid isPermaLink="false">${esc(i.guid)}</guid><pubDate>${new Date(i.date).toUTCString()}</pubDate><description>${esc(i.desc)}</description></item>`).join('\n')}
</channel></rss>
`;
const brief = rj(DATA + 'brief.json', null);
if (brief) for (const lang of ['ar', 'en']) {
  const items = brief.zones.flatMap(z => z.items.filter(i => i[lang]).map(i => {
    const src = (i.src || []).map(s => brief.sources[s]).filter(Boolean);
    return {title: cut(i[lang], 140), link: SITE + '#i-' + i.id, guid: brief.id + '/' + i.id, date: brief.published, desc: i[lang] + '\n\n' + (lang === 'ar' ? 'المصادر: ' : 'Sources: ') + src.map(s => `${s[lang] || s.ar} ${s.url}`).join(' · ')};
  }));
  writeFileSync(`${K}feeds/brief${lang === 'en' ? '-en' : ''}.xml`, rss(lang === 'ar' ? 'عبدو نيوز: الخلاصة اليومية الموثّقة' : 'Abdo News: the verified daily brief', SITE, lang === 'ar' ? 'كل خبر بمصدره ورابطه الأصلي' : 'Every story with its source and original link', lang, items));
}
if (desks) for (const m of desks.meta) for (const lang of ['ar', 'en']) {
  const items = (desks.desks[m.id]?.items || []).filter(i => i.lang === lang).map(i => ({title: i.title, link: SITE + '#d-' + m.id, guid: i.id, date: i.t,
    desc: (lang === 'ar' ? 'مؤكد من جهتين مستقلتين على الأقل. المصادر: ' : 'Confirmed by at least two independent outlets. Sources: ') + i.sources.map(s => `${s.name} ${s.url}`).join(' · ')}));
  writeFileSync(`${K}feeds/${m.id}${lang === 'en' ? '-en' : ''}.xml`, rss(`${lang === 'ar' ? 'عبدو نيوز' : 'Abdo News'}: ${m[lang]}`, SITE + '#d-' + m.id, m[lang], lang, items));
}

// ---------- خرائط الموقع ----------
const urls = ['', 'weather/', 'forecast/', '#desks', '#military', '#wars', '#method', ...(desks ? desks.meta.map(m => '#d-' + m.id) : [])];
writeFileSync(K + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${['', 'weather/', 'forecast/', 'newsletter/', 'embed/', 'partners/'].map(u => `<url><loc>${SITE}${u}</loc><changefreq>hourly</changefreq></url>`).join('\n')}
</urlset>
`);
// Google News: خلاصات اليومين الأخيرين
const recent = briefs.filter(b => Date.now() - new Date(b.published) < 2 * 864e5);
writeFileSync(K + 'news-sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${recent.map(b => `<url><loc>${SITE}#b-${b.id}</loc><news:news><news:publication><news:name>عبدو نيوز</news:name><news:language>ar</news:language></news:publication><news:publication_date>${b.published}</news:publication_date><news:title>${esc(b.title?.ar || 'خلاصة عبدو نيوز')}</news:title></news:news></url>`).join('\n')}
</urlset>
`);
// ---------- صفحات المشاركة: معاينة غنية لكل خبر على X وفيسبوك ولينكدإن وواتساب ----------
// صفحة صغيرة لكل خبر بعنوانه ومصادره في وسوم Open Graph، تحوّل القارئ إلى الخبر في التطبيق. تبقى 4 أيام.
mkdirSync(K + 's', {recursive: true});
const share = (file, title, desc, to, date) => writeFileSync(K + 's/' + file, `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(cut(title, 90))} | عبدو نيوز</title><meta name="description" content="${esc(cut(desc, 200))}">
<meta property="og:type" content="article"><meta property="og:site_name" content="عبدو نيوز"><meta property="og:title" content="${esc(cut(title, 110))}"><meta property="og:description" content="${esc(cut(desc, 200))}">
<meta property="og:image" content="${SITE}assets/og.png"><meta property="og:url" content="${SITE}s/${file}"><meta property="article:published_time" content="${esc(date)}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(cut(title, 110))}"><meta name="twitter:description" content="${esc(cut(desc, 200))}"><meta name="twitter:image" content="${SITE}assets/og.png">
<link rel="canonical" href="${SITE}${to}"><meta http-equiv="refresh" content="0;url=../${to}"></head>
<body style="font-family:Tahoma,sans-serif;padding:24px"><p>${esc(title)}</p><p><a href="../${to}">اقرأ الخبر بمصادره في «عبدو نيوز»</a></p></body></html>
`);
const keep = new Set();
if (brief) for (const z of brief.zones) for (const i of z.items) {
  const src = (i.src || []).map(x => brief.sources[x]).filter(Boolean), f = `${brief.id}-${i.id}.html`; keep.add(f);
  share(f, i.ar || i.en, 'المصادر: ' + src.map(x => x.ar || x.en).join('، '), '#i-' + i.id, brief.published);
}
if (desks) for (const [id, d] of Object.entries(desks.desks)) for (const i of d.items) {
  const f = `d-${i.id}.html`; keep.add(f);
  share(f, i.title, `مؤكد من ${i.outlets} جهات مستقلة: ` + i.sources.map(x => x.name).join('، '), '#d-' + id, i.t);
}
for (const f of readdirSync(K + 's')) {
  const m = f.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!keep.has(f) && (!m || Date.now() - new Date(m[1]) > 4 * 864e5) && !(f.startsWith('d-') && keep.size && !keep.has(f) && false)) { try { unlinkSync(K + 's/' + f); } catch (e) {} }
}
console.log(`فهرس البحث ${search.length} خبراً من ${briefs.length} خلاصة؛ الشفافية ${Object.keys(months).length} أشهر؛ RSS ${readdirSync(K + 'feeds').length} ملفاً.`);
void urls;
