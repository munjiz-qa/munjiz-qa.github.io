// فحص «مشكاة» المنشور: يعمل مستقلاً دون أي اتصال بـ Claude، وصفحات الأدوار تعمل.
import pw from 'playwright';
const { chromium } = pw;
const B = process.env.MISHKAT_URL || 'https://munjiz-qa.github.io/mishkat/';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const b = await chromium.launch(); const p = await b.newPage(); const bad = [], errs = [];
p.on('request', r => { if (/claude|anthropic/i.test(new URL(r.url()).host)) bad.push(r.url()); });
p.on('pageerror', e => errs.push(e.message));
for (const f of ['', 'app.js', 'app.css', 'sw.js', 'manifest.webmanifest', 'config.json', 'data/quran.txt', 'data/t/muyassar/0.txt']) {
  const r = await p.request.get(B + f); ok(r.ok(), `${f || 'index.html'} → ${r.status()}`);
}
const cfg = await (await p.request.get(B + 'config.json')).json();
ok(['client', 'admin'].every(u => cfg.users?.some(x => x.u === u && !x.off)), 'الحسابان الافتراضيان (client و admin) موجودان ومفعّلان');
await p.goto(B + '#home'); await p.waitForSelector('.daily', { timeout: 30000 });
ok(await p.evaluate(() => typeof window.claude === 'undefined'), 'لا يوجد أي مكوّن من Claude في الصفحة');
for (const v of ['account', 'admin', 'search', 'hifz', 'map']) {
  await p.evaluate(v => location.hash = v, v); await p.waitForTimeout(700);
  const t = await p.evaluate(() => document.body.innerText); ok(!/claude|anthropic/i.test(t) && t.length > 200, `صفحة ${v} تعمل ولا تذكر Claude`);
}
await p.evaluate(() => location.hash = 'account'); await p.waitForTimeout(700);
ok(!!(await p.$('#uform')) && !!(await p.$('#rform')), 'صفحة الدخول للعميل والمدير وإنشاء الحساب تعمل');
ok(!bad.length, 'لا طلبات إلى Claude أو Anthropic ' + bad.join(' '));
ok(!errs.length, 'لا أخطاء برمجية ' + errs.join(' | '));
await b.close(); process.exit(fail ? 1 : 0);
