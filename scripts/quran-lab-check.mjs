// فحص «مختبر الأبحاث القرآنية» المنشور: يعمل مستقلاً دون Claude ودون أي جهة خارجية، وصفحات العميل والمدير تعمل، والبحث يخرّج الأحاديث بأرقامها وأحكامها.
import pw from 'playwright';
const { chromium } = pw;
const B = process.env.LAB_URL || 'https://munjiz-qa.github.io/quran-lab/';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const b = await chromium.launch(); const p = await b.newPage(); const bad = [], errs = [], ext = new Set();
p.on('request', r => { const u = new URL(r.url()); if (/claude|anthropic/i.test(u.host)) bad.push(r.url()); if (u.origin !== new URL(B).origin) ext.add(u.host); });
p.on('pageerror', e => errs.push(e.message));
for (const f of ['', 'app.js', 'sw.js', 'manifest.webmanifest', 'config.json', 'data/quran.txt', 'data/t/ibnkathir/0.txt', ...['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah'].map(k => `data/hadith/${k}.txt`), 'data/tr/index.json', 'data/tr/en.txt', 'data/tr/fr.txt', 'data/i18n/en.json', 'data/i18n/fr.json', 'data/i18n/ur.json']) {
  const r = await p.request.get(B + f); ok(r.ok(), `${f || 'index.html'} → ${r.status()}`);
}
const cfg = await (await p.request.get(B + 'config.json')).json();
ok(['client', 'admin'].every(u => cfg.users?.some(x => x.u === u && !x.off)), 'الحسابان الافتراضيان (client و admin) موجودان ومفعّلان');
await p.goto(B); await p.waitForSelector('#rform', { timeout: 60000 });
ok(/مختبر الأبحاث القرآنية/.test(await p.title()) && await p.evaluate(() => typeof window.claude === 'undefined'), 'يفتح على المختبر باسمه، دون أي مكوّن من Claude');
await p.fill('#rq', 'اسم الله الأعظم من الكتاب والسنة'); await p.click('#rgo');
await p.waitForFunction(() => /اكتمل/.test(document.querySelector('#rstat')?.textContent || ''), null, { timeout: 900000 }).catch(() => {});
const doc = await p.evaluate(() => document.querySelector('#rdoc')?.innerText || '');
ok(/أبو داود \(١٤٩٦\)/.test(doc) && /الترمذي \(٣٤٧٨\)/.test(doc) && /ابن ماجه \(٣٨٥٥\)/.test(doc) && /الألباني: حسن/.test(doc), 'البحث يخرّج حديث أسماء بنت يزيد بأرقامه وحكمه');
ok(/الترمذي \(٣٤٧٥\)/.test(doc) && /الترمذي \(٣٥٤٤\)/.test(doc) && /ابن ماجه \(٣٨٥٦\)/.test(doc), 'ويخرّج حديث بريدة وحديث أنس وحديث أبي أمامة');
ok(/أقوال العلماء في المسألة/.test(doc) && /البقرة ١٦٣/.test(doc) && /المراجع/.test(doc), 'وينقل أقوال العلماء والآيات المنصوص عليها والمراجع');
for (const v of ['mine', 'guide', 'account', 'admin']) { await p.evaluate(v => location.hash = v, v); await p.waitForTimeout(700);
  const t = await p.evaluate(() => document.body.innerText); ok(!/claude|anthropic/i.test(t) && t.length > 150, `صفحة ${v} تعمل ولا تذكر Claude`); }
await p.evaluate(() => location.hash = 'account'); await p.waitForTimeout(700);
ok(!!(await p.$('#uform')) && !!(await p.$('#rform')), 'صفحة الدخول للعميل والمدير وإنشاء الحساب تعمل');
{ // اللغات ومواقيت الصلاة: الإنجليزية مضمّنة، ومعاني الآيات بالترجمة المعتمدة، والمواقيت تُحسب على الجهاز
  const c2 = await b.newContext(); await c2.route(/translate\.(google|googleapis)/, r => r.abort()); const q = await c2.newPage(); const e2 = []; q.on('pageerror', e => e2.push(e.message));
  await q.addInitScript(() => { if (!sessionStorage.getItem('t')) { sessionStorage.setItem('t', '1'); localStorage.setItem('quran-lang', 'en'); } }); await q.goto(B + '#s1'); await q.waitForTimeout(6000);
  ok(await q.evaluate(() => document.documentElement.dir === 'ltr' && document.querySelectorAll('.mean').length === 7 && /praise/i.test([...document.querySelectorAll('.mean')].map(x => x.textContent).join(' '))), 'English: left-to-right, Al-Fatiha with its meanings (Saheeh International)');
  await q.evaluate(() => location.hash = 'prayer'); await q.waitForTimeout(1200);
  ok((await q.$$('.prcell')).length === 6 && /Next prayer/.test(await q.textContent('#view')), 'English: prayer times page');
  await q.evaluate(() => localStorage.setItem('quran-lang', 'fr')); await q.reload(); await q.waitForTimeout(5000);
  ok(await q.evaluate(() => document.documentElement.lang === 'fr' && /Paramètres/.test(document.querySelector('#nav').textContent)), 'Français : interface traduite intégrée');
  await q.evaluate(() => setLang('ar')); await q.waitForTimeout(5000); await q.evaluate(() => location.hash = 'prayer'); await q.waitForTimeout(1200);
  ok(await q.evaluate(() => document.documentElement.dir === 'rtl') && /الصلاة القادمة/.test(await q.textContent('#view')), 'العودة إلى العربية، ومواقيت الصلاة تعمل');
  ok(!e2.length, 'لا أخطاء برمجية في اللغات والمواقيت ' + e2.join(' | ')); await c2.close(); }
ok(!bad.length, 'لا طلبات إلى Claude أو Anthropic ' + bad.join(' '));
ok(!ext.size, 'لا اتصال بأي جهة خارجية ' + [...ext].join(' '));
ok(!errs.length, 'لا أخطاء برمجية ' + errs.join(' | '));
await b.close(); process.exit(fail ? 1 : 0);
