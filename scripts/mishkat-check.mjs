// فحص «مشكاة» المنشور: يعمل مستقلاً دون أي اتصال بـ Claude، وصفحات الأدوار تعمل.
import pw from 'playwright';
const { chromium } = pw;
const B = process.env.MISHKAT_URL || 'https://munjiz-qa.github.io/mishkat/';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const b = await chromium.launch(); const p = await b.newPage(); const bad = [], errs = [];
p.on('request', r => { if (/claude|anthropic/i.test(new URL(r.url()).host)) bad.push(r.url()); });
p.on('pageerror', e => errs.push(e.message));
for (const f of ['', 'app.js', 'app.css', 'sw.js', 'manifest.webmanifest', 'config.json', 'data/quran.txt', 'data/t/muyassar/0.txt', ...['bukhari', 'muslim', 'abudawud', 'tirmidhi', 'nasai', 'ibnmajah'].map(k => `data/hadith/${k}.txt`), 'data/tr/index.json', 'data/tr/en.txt', 'data/tr/fr.txt', 'data/i18n/en.json', 'data/i18n/fr.json', 'data/i18n/ur.json']) {
  const r = await p.request.get(B + f); ok(r.ok(), `${f || 'index.html'} → ${r.status()}`);
}
const cfg = await (await p.request.get(B + 'config.json')).json();
ok(['client', 'admin'].every(u => cfg.users?.some(x => x.u === u && !x.off)), 'الحسابان الافتراضيان (client و admin) موجودان ومفعّلان');
ok(cfg.users.every(x => /^pbkdf2\$\d{6,}\$/.test(x.h || '')), 'كلمات المرور محفوظة بتجزئة PBKDF2 مملّحة، لا نص صريح ولا تجزئة سريعة');
await p.goto(B + '#home'); await p.waitForSelector('.daily', { timeout: 30000 });
ok(!!(await p.$('meta[http-equiv="Content-Security-Policy"]')) && await p.evaluate(async () => (await fetch('https://example.com/').then(() => 'open', () => 'blocked')) === 'blocked'), 'سياسة أمان المحتوى (CSP) مفعّلة وتمنع الاتصال بمواقع غريبة');
ok((await p.$$('.path')).length === 4 && (await p.$$('.path .scard')).length === 16, 'الرئيسية الجديدة: أربعة مسارات و١٦ بطاقة قسم (مع أذكار الصباح والمساء)');
ok(await p.evaluate(() => typeof window.claude === 'undefined'), 'لا يوجد أي مكوّن من Claude في الصفحة');
for (const v of ['account', 'admin', 'search', 'hifz', 'map', 'awwalin', 'ijaz', 'research']) {
  await p.evaluate(v => location.hash = v, v); await p.waitForTimeout(700);
  const t = await p.evaluate(() => document.body.innerText); ok(!/claude|anthropic/i.test(t) && t.length > 200, `صفحة ${v} تعمل ولا تذكر Claude`);
}
await p.evaluate(() => location.hash = 'research'); await p.waitForTimeout(700);
await p.fill('#rq', 'الصبر'); await p.click('#rgo');
await p.waitForSelector('#rdoc #rprint', { timeout: 600000 }).catch(() => {});
const doc = await p.evaluate(() => document.querySelector('#rdoc')?.innerText || '');
ok(/الآيات القرآنية/.test(doc) && /أقوال المفسرين/.test(doc) && /السنة النبوية/.test(doc) && /صحيح (البخاري|مسلم)/.test(doc) && /المراجع/.test(doc), 'مختبر الأبحاث يُعدّ بحثاً مؤصّلاً بالقرآن والتفسير والسنة والمراجع');
{ // القصص القرآني الموسّع: ملخص مجمّع بآياته، ونقول من ابن كثير والطبري والقرطبي، والعبر، ورابط الفيديو
  await p.evaluate(() => location.hash = 't-qasas'); await p.waitForSelector('#tpanel details', { timeout: 30000 }).catch(() => {});
  await p.evaluate(() => { const d = [...document.querySelectorAll('#tpanel details')].find(x => x.querySelector('.t')?.textContent === 'يوسف وإخوته'); d?.querySelector('summary').click(); });
  await p.waitForSelector('#tpanel .qstory .qs-quote', { timeout: 30000 }).catch(() => {});
  const qs = await p.evaluate(() => { const x = document.querySelector('#tpanel .qstory'); return x ? { s: x.querySelectorAll('.qs-steps li a[data-ayah]').length, q: [...x.querySelectorAll('.qs-quote figcaption b')].map(b => b.textContent).join(), l: x.querySelectorAll('.qs-lesson').length, v: !!x.querySelector('a.qs-video[href*="youtube.com/results"]') } : null; });
  ok(qs && qs.s >= 5 && qs.q === 'تفسير ابن كثير,تفسير الطبري,تفسير القرطبي' && qs.l >= 3 && qs.v, 'القصص القرآني: قصة يوسف مجمّعة بآياتها، مع نقول ابن كثير والطبري والقرطبي والعبر ورابط الفيديو');
}
{ // أذكار الصباح والمساء: الورد المناسب لوقت مدينة المستخدم، بنصوص حصن المسلم وتخريجها، وعدّاد لكل ذكر
  await p.evaluate(() => location.hash = 'adhkar'); await p.waitForTimeout(1200);
  const ad = await p.evaluate(() => { const A = adhNow(prCfg()), x = document.querySelector('.adh'); return x ? { k: A.kind, shown: x.classList.contains(A.kind), n: document.querySelectorAll('.adh-card').length, src: document.querySelectorAll('.adh-src').length, home: typeof adhHomeCard() === 'string' && /adhbar/.test(adhHomeCard()) } : null; });
  ok(ad && ad.shown && ad.n === (ad.k === 'm' ? 23 : 21) && ad.src === ad.n && ad.home, `أذكار الصباح والمساء: يظهر ورد ${ad?.k === 'm' ? 'الصباح' : 'المساء'} في وقته (${ad?.n} ذكراً بتخريجها) مع بطاقة الرئيسية`);
  await p.click('.adh-card [data-adhc]'); ok(await p.evaluate(() => /[١1]/.test(document.querySelector('.adh-card .adh-count b').textContent)), 'عدّاد الأذكار يعمل');
}
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
ok(!errs.length, 'لا أخطاء برمجية ' + errs.join(' | '));
await b.close(); process.exit(fail ? 1 : 0);
