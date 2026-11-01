// فحص «مختبر الأبحاث القرآنية» المنشور: يعمل مستقلاً دون Claude ودون أي جهة خارجية، وصفحات العميل والمدير تعمل، والبحث يخرّج الأحاديث بأرقامها وأحكامها.
import pw from 'playwright';
const { chromium } = pw;
const B = process.env.LAB_URL || 'https://munjiz-qa.github.io/quran-lab/';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const b = await chromium.launch(); const p = await b.newPage(); const bad = [], errs = [], ext = new Set();
p.on('request', r => { const u = new URL(r.url()); if (/claude|anthropic/i.test(u.host)) bad.push(r.url()); if (u.origin !== new URL(B).origin) ext.add(u.host); });
p.on('pageerror', e => errs.push(e.message));
for (const f of ['', 'app.js', 'sw.js', 'manifest.webmanifest', 'config.json', 'data/quran.txt', 'data/t/ibnkathir/0.txt', ...['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah'].map(k => `data/hadith/${k}.txt`)]) {
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
ok(!bad.length, 'لا طلبات إلى Claude أو Anthropic ' + bad.join(' '));
ok(!ext.size, 'لا اتصال بأي جهة خارجية ' + [...ext].join(' '));
ok(!errs.length, 'لا أخطاء برمجية ' + errs.join(' | '));
await b.close(); process.exit(fail ? 1 : 0);
