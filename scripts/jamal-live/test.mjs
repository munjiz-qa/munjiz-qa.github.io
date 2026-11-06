// اختبار قسم «الصور الجمالية»: المحتوى والروابط والإنجليزية والجوال والكمبيوتر وعدم الاعتماد على Claude
import pw from 'playwright';
const B = process.env.B || 'http://localhost:8765/mishkat/';
let pass = 0, fail = 0; const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); c ? pass++ : fail++; };
const b = await pw.chromium.launch(); const bad = [];
const BARE = t => t.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').replace(/\s+/g, ' ');
const has = (t, x) => BARE(t).includes(BARE(x));
for (const [name, vp, mob] of [['desk', { width: 1366, height: 900 }, false], ['mob', { width: 390, height: 844 }, true]]) {
  console.log('== ' + name);
  const ctx = await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob }); const p = await ctx.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('request', r => { if (/claude|anthropic/i.test(r.url())) bad.push(r.url()); });
  await p.goto(B + '#home'); await p.waitForSelector('.daily', { timeout: 20000 });
  ok(await p.$('.path .scard[href="#jamal"]') !== null, 'home: section card shown');
  ok(await p.$eval('.path .scard[href="#jamal"]', a => /ابحث وحقّق/.test(a.closest('.path')?.innerText || '')), 'home: card sits in path «ابحث وحقّق»');
  ok(await p.evaluate(() => [...document.querySelectorAll('#nav a')].some(a => a.dataset.v === 'jamal')), 'nav: menu entry');
  await p.evaluate(() => location.hash = 'jamal'); await p.waitForSelector('.jm-ch'); await p.waitForTimeout(800);
  const s = await p.evaluate(() => ({ h1: document.querySelector('#view h1')?.textContent, ch: document.querySelectorAll('.jm-ch').length, k: document.querySelectorAll('.jm-k').length,
    ay: document.querySelectorAll('.jm-ay').length, q: document.querySelectorAll('.jm-qt').length, h: document.querySelectorAll('.jm-h').length, lines: document.querySelectorAll('.jm-q').length,
    font: getComputedStyle(document.querySelector('.jm-q')).fontFamily, open: [...document.querySelectorAll('.jm-ch')].filter(d => d.open).length,
    txt: document.querySelector('#view').textContent }));
  ok(s.h1 === 'الصور الجمالية في القرآن الكريم', 'title');
  ok(s.ch === 8 && s.k === 4, `8 chapters & 4 imagery kinds (${s.ch}/${s.k})`);
  ok(s.ay === 59 && s.q === 25 && s.h === 6, `cards: ${s.ay} ayah cards, ${s.q} quotes, ${s.h} hadith`);
  ok(s.lines >= 80, `${s.lines} ayah lines rendered (rest linked to the Mushaf)`);
  ok(/KFGQPC Hafs/.test(s.font), 'ayat in the King Fahd Complex font');
  ok(s.open === 1, 'first chapter open, others collapsed');
  ok(has(s.txt, 'وَٱشۡتَعَلَ ٱلرَّأۡسُ شَيۡبٗا'), 'KFGQPC text of 19:4 present');
  ok(!/claude|anthropic/i.test(s.txt), 'no mention of Claude');
  await p.click('.u-index a[data-jmj="istiara"]'); await p.waitForTimeout(900);
  ok(await p.$eval('#jm-istiara', d => d.open), 'index link opens «الاستعارة»');
  const qt = await p.$eval('#jm-istiara', d => d.textContent);
  ok(has(qt, 'وَهَذَا مِنْ أَحْسَنِ الِاسْتِعَارَةِ فِي كَلَامِ الْعَرَبِ'), 'al-Qurtubi verbatim on 19:4 shown');
  ok(qt.includes('الجامع لأحكام القرآن'), 'quote cites its book');
  await p.evaluate(() => document.querySelector('.jm-kgo[data-jmj="tashbih"]').click()); await p.waitForTimeout(800);
  ok(await p.$eval('#jm-tashbih', d => d.open), 'kind card «اقرأ الباب» opens its chapter');
  ok(await p.$eval('#jm-tashbih', d => d.textContent.includes('٥٤٢٧') && d.textContent.includes('٧٩٧')), 'hadith reference numbers (Bukhari 5427, Muslim 797)');
  await p.evaluate(() => { document.querySelector('#jm-jamal').open = true; document.querySelector('#jm-akhlaq').open = true; }); await p.waitForTimeout(300);
  ok(has(await p.$eval('#jm-jamal', d => d.textContent), 'إِنَّ اللَّهَ جَمِيلٌ يُحِبُّ الْجَمَالَ'), '«إن الله جميل يحب الجمال» (Muslim 91) verbatim');
  ok(has(await p.$eval('#jm-akhlaq', d => d.textContent), 'وَالصَّبْرُ الْجَمِيلُ: هُوَ الَّذِي لَا جَزَعَ فِيهِ'), 'definition of beautiful patience (al-Qurtubi 70:5)');
  const href = await p.$eval('#jm-taswir .jm-links a', a => a.getAttribute('href')); ok(/^#pa\d+$/.test(href), 'open-in-Mushaf link ' + href);
  await p.click('#jm-taswir .jm-links a'); await p.waitForTimeout(1500); { const hh = await p.evaluate(() => location.hash); ok(/^#pa?\d+$/.test(hh), 'Mushaf page opens from the section ' + hh); }
  await p.goBack(); await p.waitForSelector('.jm-ch'); await p.waitForTimeout(600);
  const ov = await p.evaluate(() => { document.querySelectorAll('.jm-ch').forEach(d => d.open = true); return document.documentElement.scrollWidth - innerWidth; }); ok(ov <= 1, 'no horizontal overflow with all chapters open (' + ov + ')');
  ok(await p.evaluate(() => document.querySelector('.nextpaths') !== null), '«تابع الاستكشاف» at the end');
  ok(!errs.length, 'no script errors ' + errs.join(' | '));
  const c2 = await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob }); await c2.route(/translate\.(google|googleapis)/, r => r.abort());
  const q = await c2.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
  await q.addInitScript(() => localStorage.setItem('quran-lang', 'en')); await q.goto(B + '#jamal'); await q.waitForTimeout(5000);
  await q.evaluate(() => document.querySelectorAll('.jm-ch').forEach(d => d.open = true)); await q.waitForTimeout(2500);
  const en = await q.evaluate(() => { const out = new Set(); const w = document.createTreeWalker(document.querySelector('#view'), NodeFilter.SHOW_TEXT); let x;
    while ((x = w.nextNode())) { if (x.parentElement.closest('.notranslate,.ayah,.jm-matn,blockquote,.mean,[translate=no],.nextpaths')) continue; if (/[؀-ۿ]{2}/.test(x.textContent)) out.add(x.textContent.trim().slice(0, 60)); }
    return { h1: document.querySelector('#view h1')?.textContent, dir: document.documentElement.dir, left: [...out], hen: document.querySelectorAll('.jm-en').length, qen: document.querySelectorAll('.jm-qen').length,
      ov: document.documentElement.scrollWidth - innerWidth }; });
  ok(en.h1 === 'Aesthetic imagery in the Noble Quran' && en.dir === 'ltr', 'English: title & LTR (' + en.h1 + ')');
  ok(en.left.length === 0, 'English: every UI string translated ' + JSON.stringify(en.left.slice(0, 10)));
  ok(en.hen === 6 && en.qen === 25, `English meanings for hadith (${en.hen}) and quotes (${en.qen})`);
  ok(en.ov <= 1, 'English: no horizontal overflow');
  ok(!e2.length, 'English: no script errors ' + e2.join('|'));
  await ctx.close(); await c2.close();
}
ok(!bad.length, 'no request to Claude/Anthropic ' + bad.join(' '));
console.log(`\n${pass} passed, ${fail} failed`); await b.close(); process.exitCode = fail ? 1 : 0;
