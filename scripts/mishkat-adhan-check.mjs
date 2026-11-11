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
{ const ctx = await b.newContext({ serviceWorkers: 'block' }), p = await ctx.newPage(); await p.goto(B + '#prayer'); await p.waitForSelector('#adF');
  const wav = Buffer.concat([Buffer.from('RIFF$\0\0\0WAVEfmt \x10\0\0\0\x01\0\x01\0\x40\x1f\0\0\x40\x1f\0\0\x01\0\x08\0data\0\0\0\0', 'latin1')]);
  await p.setInputFiles('#adF', { name: 'my-adhan.wav', mimeType: 'audio/wav', buffer: wav }); await p.waitForTimeout(1200);
  ok(await p.$eval('#adS', e => e.value) === 'custom' && /my-adhan/.test(await p.$eval('#adS', e => e.selectedOptions[0].textContent)), 'ملف الأذان من جهاز المستخدم يُحفظ على جهازه ويُختار');
  ok(await p.evaluate(async () => (await new Promise(r => { const q = indexedDB.open('mishkat-adhan', 1); q.onsuccess = () => { const g = q.result.transaction('f').objectStore('f').get('custom'); g.onsuccess = () => r(!!g.result); }; }))), 'الملف محفوظ في IndexedDB لا يغادر الجهاز'); await ctx.close(); }
{ const ctx = await b.newContext({ serviceWorkers: 'block' }), p = await ctx.newPage(); await p.goto(B + '#prayer'); await p.waitForSelector('#adS');
  const o = await p.$$eval('#adS option', x => x.map(e => [e.value, e.disabled, e.selected]));
  ok(['haram-makki', 'haram-madani', 'aqsa', 'misr', 'turkiye', 'maghrib', 'sham'].every(k => o.some(r => r[0] === k && r[1])) && o.length >= 10, 'أذانات العالم (الحرمان والأقصى ومصر وتركيا والمغرب والشام…) مدرجة وتنتظر التسجيل المرخّص ولا يمكن اختياره بلا ملف');
  ok(o.find(r => r[2])?.[0] === 'chime', 'الصوت الافتراضي نغمة التنبيه حتى يتوفر تسجيل مرخّص');
  await p.route('**/data/adhan/manifest.json', r => r.fulfill({ json: { muadhdhins: [{ id: 'haram-makki', name: 'أذان الحرم المكي', default: true, author: 'x', file: 'haram.mp3', license: 'CC0-1.0', source: 'https://example.org/h' }] } }));
  await p.reload(); await p.waitForSelector('#adS');
  ok(await p.$eval('#adS', e => e.value) === 'haram-makki', 'يصير أذان الحرم المكي الافتراضي فور توفر تسجيله المرخّص'); await ctx.close(); }
{ const ctx = await b.newContext(), p = await ctx.newPage(); await p.goto(B + '#prayer'); await p.waitForSelector('#adOn');
  const lic = await p.evaluate(async () => { const j = await (await fetch('data/adhan/manifest.json')).json(); return j.licenses_allowed.join(); });
  ok(/CC0-1.0/.test(lic) && !/All-Rights/.test(lic), 'قائمة الرخص المقبولة مفتوحة فقط'); await ctx.close(); }
await b.close(); process.exit(fail ? 1 : 0);
