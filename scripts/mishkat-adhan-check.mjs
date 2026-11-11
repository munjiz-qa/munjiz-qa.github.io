// فحص تنبيه الأذان في «مشكاة»: الواجهة، الجدولة، الإشعار عند دخول الوقت، الإشعار المجدول (Triggers)، رفض التسجيلات غير المرخّصة.
import pw from 'playwright';
const B = process.env.MISHKAT_URL || 'http://localhost:8765/';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const b = await pw.chromium.launch();
for (const [name, opts] of [['الكمبيوتر', { viewport: { width: 1280, height: 800 } }], ['الجوال', { ...pw.devices['Pixel 7'] }]]) {
  const ctx = await b.newContext(opts), p = await ctx.newPage(), errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { Object.defineProperty(Notification, 'permission', { get: () => 'granted' }); window.__shown = []; window.__ac = 0;
    const oa = window.AudioContext; window.AudioContext = function () { window.__ac++; return new oa(); }; window.AudioContext.prototype = oa.prototype;
    ServiceWorkerRegistration.prototype.showNotification = function (t, o) { window.__shown.push([t, o.body, o.tag, !!o.showTrigger]); return Promise.resolve(); }; });
  await p.clock.install({ time: new Date('2026-11-11T20:00:00Z') });
  await p.goto(B + '#prayer'); await p.waitForSelector('#adOn');
  ok(!!(await p.$('#adhanBox h2')), `${name}: قسم تنبيه الأذان في صفحة المواقيت`);
  await p.check('#adOn'); await p.clock.runFor(1500);
  ok(await p.evaluate(() => adhanUpcoming().length >= 14), `${name}: خمس صلوات لثلاثة أيام مجدولة`);
  const ev = await p.evaluate(() => adhanUpcoming()[0]), now = await p.evaluate(() => Date.now());
  await p.clock.runFor(ev.at - now + 3000);
  const sh = await p.evaluate(() => window.__shown);
  ok(sh.some(s => s[2] === 'adhan-' + ev.id && /^حان وقت صلاة/.test(s[0])), `${name}: إشعار عند دخول وقت ${ev.key}`);
  ok(await p.evaluate(() => window.__ac >= 1), `${name}: النغمة تُشغَّل عند دخول الوقت`);
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}: بلا تمرير أفقي`);
  ok(errs.length === 0, `${name}: بلا أخطاء في الصفحة`);
  await ctx.close();
}
{ const ctx = await b.newContext(), p = await ctx.newPage();
  await p.addInitScript(() => { Object.defineProperty(Notification, 'permission', { get: () => 'granted' }); window.__shown = []; window.TimestampTrigger = function (t) { this.t = t; }; Object.defineProperty(Notification.prototype, 'showTrigger', { get: () => null });
    ServiceWorkerRegistration.prototype.showNotification = function (t, o) { window.__shown.push([t, o.tag, !!o.showTrigger]); return Promise.resolve(); }; });
  await p.goto(B + '#prayer'); await p.waitForSelector('#adOn'); await p.evaluate(() => navigator.serviceWorker.ready); await p.check('#adOn'); await p.waitForTimeout(1500);
  ok(await p.evaluate(() => window.__shown.filter(s => s[2]).length >= 14), 'الإشعارات المجدولة (Triggers) تُسجَّل للأوقات القادمة حيث يدعمها المتصفح');
  ok(/والتطبيق مغلق/.test(await p.textContent('#adSt')), 'الواجهة تذكر أن الإشعار يصل والتطبيق مغلق عند دعم المتصفح');
  await ctx.close(); }
{ const ctx = await b.newContext(), p = await ctx.newPage(); await p.goto(B + '#prayer'); await p.waitForSelector('#adOn');
  const lic = await p.evaluate(async () => { const j = await (await fetch('data/adhan/manifest.json')).json(); return j.licenses_allowed.join(); });
  ok(/CC0-1.0/.test(lic) && !/All-Rights/.test(lic), 'قائمة الرخص المقبولة مفتوحة فقط'); await ctx.close(); }
await b.close(); process.exit(fail ? 1 : 0);
