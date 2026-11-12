// فحص ركن «التفاسير وأسباب النزول» في مشكاة: جوال وكمبيوتر، تصفح وبحث ودون إنترنت. يعمل مستقلاً دون أي اتصال بـ Claude.
import pw from 'playwright';
// انتظار بالاستطلاع عبر evaluate: waitForFunction تُنشئ دالة بـ eval فتمنعها سياسة أمان المحتوى
async function until(p, fn, ms = 30000) { const t = Date.now(); for (;;) { if (await p.evaluate(fn).catch(() => false)) return; if (Date.now() - t > ms) throw new Error('until: انتهت المهلة'); await p.waitForTimeout(250); } }
const { chromium } = pw;
const B = process.env.MISHKAT_URL || 'https://munjiz-qa.github.io/mishkat/';
const SHOTS = process.env.SHOTS || '';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const b = await chromium.launch(); const bad = [], errs = [];
const shot = async (p, n) => { if (SHOTS) await p.screenshot({ path: `${SHOTS}/${n}.png` }); };
for (const [dev, vp] of [['جوال', { width: 390, height: 844 }], ['كمبيوتر', { width: 1280, height: 900 }]]) {
  const ctx = await b.newContext({ viewport: vp, serviceWorkers: 'allow' }); const p = await ctx.newPage();
  p.on('request', r => { if (/claude|anthropic/i.test(new URL(r.url()).host)) bad.push(r.url()); });
  p.on('pageerror', e => errs.push(dev + ': ' + e.message));
  const noOverflow = async m => ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${dev}: ${m} بلا تمدد أفقي`);
  await p.goto(B + '#home'); await p.waitForSelector('.daily', { timeout: 30000 });
  ok(!!(await p.$('.path .scard[href="#tafasir"], .mindex a[href="#tafasir"]')), `${dev}: مدخل الركن على الرئيسية`);
  await p.goto(B + '#tafasir'); await p.waitForSelector('.tf-pick select', { timeout: 30000 });
  ok((await p.$$('.tf-pick select option')).length === 114, `${dev}: قائمة ١١٤ سورة`);
  await p.waitForSelector('.tf-types details', { timeout: 30000 });
  ok((await p.$$('.tf-types details')).length === 10, `${dev}: عشرة أنواع من التفاسير بتعريفاتها`);
  ok((await p.$$('.tf-types .chip.acc')).length >= 3, `${dev}: تُعلَّم الكتب المضمّنة في مشكاة`);
  await noOverflow('الصفحة الرئيسية للركن'); await shot(p, `${dev}-1-الركن`);
  // آية الخمر
  await p.goto(B + '#tf2-219'); await p.waitForSelector('.tf-ay', { timeout: 30000 });
  await until(p, () => /الخمر/.test(document.body.innerText) && !!document.querySelector(".tf-layer"), 30000);
  const khamr = await p.evaluate(() => document.body.innerText);
  ok(/البقرة · آية ٢١٩/.test(khamr) && /سبب نزول|أسباب النزول/.test(khamr), `${dev}: آية الخمر (٢:٢١٩) وأسباب نزولها`);
  ok(/الأسانيد|ميزان|تنبيه/.test(khamr), `${dev}: تنبيه الرجوع إلى الأسانيد ظاهر`);
  await noOverflow('آية الخمر'); await shot(p, `${dev}-2-آية-الخمر`);
  // مستوى متخصص يفتح كل الطبقات وكل الكتب
  const lv = await p.$('button:has-text("متخصص")'); if (lv) await lv.click(); await p.waitForTimeout(1500);
  const books = await p.evaluate(() => [...document.querySelectorAll('.tf-bk')].map(d => d.dataset.k));
  ok(['muyassar', 'jalalayn', 'saadi', 'baghawi', 'qurtubi', 'tabari', 'ibnkathir'].every(k => books.includes(k)), `${dev}: كتب الآية السبعة موجودة (${books.length})`);
  await p.evaluate(() => document.querySelectorAll('.tf-bk').forEach(d => { d.open = true; }));
  await p.waitForTimeout(4000);
  const filled = await p.evaluate(() => [...document.querySelectorAll('.tf-bk')].filter(d => d.innerText.length > 120).length);
  ok(filled >= 5, `${dev}: نصوص التفاسير تُحمَّل عند الفتح (${filled})`);
  await shot(p, `${dev}-3-الطبقات`);
  // آية الإفك
  await p.goto(B + '#tf24-11'); await p.waitForSelector('.tf-ay', { timeout: 30000 });
  await until(p, () => /عائشة/.test(document.body.innerText), 30000).catch(() => {});
  ok(await p.evaluate(() => /عائشة/.test(document.body.innerText) && /الإفك|إفك/.test(document.body.innerText)), `${dev}: آية الإفك (٢٤:١١) وسببها`);
  await noOverflow('آية الإفك'); await shot(p, `${dev}-4-آية-الإفك`);
  // بحث في أسباب النزول
  await p.goto(B + '#tafasir'); await p.waitForSelector('.tf-row input[type=search]', { timeout: 30000 });
  await p.fill('.tf-row input[type=search]', 'عائشة'); await p.keyboard.press('Enter');
  const btn = await p.$('.tf-row button:has-text("ابحث")'); if (btn) await btn.click();
  await p.waitForSelector('.tf-hit', { timeout: 40000 }).catch(() => {});
  const hits = (await p.$$('.tf-hit')).length;
  ok(hits >= 10, `${dev}: البحث بكلمة «عائشة» يعطي ${hits} نتيجة`); await shot(p, `${dev}-5-بحث-عائشة`);
  if (hits) { await p.click('.tf-hit'); await p.waitForSelector('.tf-ay', { timeout: 30000 }); ok(/^#tf\d+-\d+/.test(new URL(p.url()).hash), `${dev}: نتيجة البحث تفتح صفحة الآية`); }
  // تصفح بالسور
  await p.goto(B + '#tf111'); await p.waitForSelector('.tf-hit, .panel h2', { timeout: 30000 });
  ok(/تبّ|المسد|اللهب/.test(await p.innerText('body')), `${dev}: تصفح سورة المسد`);
  await noOverflow('تصفح السورة');
  await ctx.close();
}
// دون إنترنت: الصفحة وأسباب النزول بعد التجهيز
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'allow' }); const p = await ctx.newPage();
  await p.goto(B + '#home'); await p.waitForSelector('.daily', { timeout: 30000 });
  await p.evaluate(async () => { await navigator.serviceWorker.ready; });
  await p.reload(); await until(p, () => !!navigator.serviceWorker.controller, 30000);
  const shell = await p.evaluate(async () => !!(await caches.match('tafasir.js')));
  ok(shell, 'دون إنترنت: tafasir.js في ذاكرة التطبيق');
  await p.goto(B + '#tf2-219'); await until(p, () => /الخمر/.test(document.body.innerText), 30000);
  const pack = await p.evaluate(async () => { try { return await offlinePack(() => {}); } catch (e) { return String(e); } });
  console.log('  تجهيز الحزمة:', pack);
  const files = await p.evaluate(async () => !!(await caches.match('data/asbab.txt', { ignoreSearch: true })));
  ok(files, 'دون إنترنت: أسباب النزول في الذاكرة');
  await ctx.setOffline(true);
  await p.goto(B + '#tf24-11'); await p.reload().catch(() => {});
  await p.waitForSelector('.tf-ay', { timeout: 30000 }).catch(() => {});
  await until(p, () => /عائشة/.test(document.body.innerText), 30000).catch(() => {});
  ok(await p.evaluate(() => /عائشة/.test(document.body.innerText)), 'دون إنترنت: آية الإفك بسبب نزولها تُفتح في وضع الطيران');
  await ctx.close();
}
ok(!bad.length, 'لا طلبات إلى Claude أو Anthropic'); ok(!errs.length, 'لا أخطاء برمجية ' + errs.slice(0, 3).join(' | '));
await b.close(); process.exit(fail ? 1 : 0);
