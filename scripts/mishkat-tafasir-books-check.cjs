// فحص «فهرس كتب التفسير» في مشكاة: جوال وكمبيوتر، تصفية وبحث. يعمل مستقلاً دون أي اتصال بـ Claude.
const { chromium } = require(process.env.PW || 'playwright');
const B = process.env.MISHKAT_URL || 'http://localhost:8123/';
const OUT = process.env.SHOTS ? process.env.SHOTS + '/' : '/tmp/';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  for (const [dev, vp] of [['mob', { width: 390, height: 844 }], ['desk', { width: 1280, height: 900 }]]) {
    const ctx = await b.newContext({ viewport: vp }); const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(dev + ': ' + e.message));
    await p.goto(B + '#tafasir'); await p.waitForSelector('.tf-types details', { timeout: 30000 });
    ok(await p.evaluate(() => !!document.querySelector('a[href="#tfbooks"]')), dev + ': رابط الفهرس في الركن');
    await p.click('a[href="#tfbooks"]'); await p.waitForSelector('.tf-bkx', { timeout: 20000 });
    const n = await p.$$eval('.tf-bkx', e => e.length); ok(n === 111, dev + ': ' + n + ' كتاباً');
    ok(await p.$$eval('.tf-bkx.own', e => e.length) === 36, dev + ': ٣٦ متاحاً');
    await p.click('#bxA [data-a="1"]'); ok(await p.$$eval('.tf-bkx', e => e.length) === 36, dev + ': تصفية المتاح');
    await p.click('#bxA [data-a="0"]'); ok(await p.$$eval('.tf-bkx', e => e.length) === 75, dev + ': تصفية للاطلاع');
    await p.click('#bxA [data-a=""]'); await p.click('#bxK [data-k="إشاري"]'); ok(await p.$$eval('.tf-bkx', e => e.length) === 6, dev + ': نوع إشاري');
    await p.click('#bxK [data-k=""]'); await p.fill('#bxQ', 'الطبري'); ok(await p.$$eval('.tf-bkx', e => e.length) === 1, dev + ': بحث الطبري');
    await p.fill('#bxQ', '');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), dev + ': بلا تمدد أفقي');
    await p.screenshot({ path: OUT + dev + '-books.png', fullPage: false });
    await p.click('#bxK [data-k=""]');
    ok(/ت ٣١٠هـ/.test(await p.evaluate(() => document.body.innerText)), dev + ': تاريخ الطبري');
    // التفاسير الموسّعة: تُحمَّل عند الفتح من قطع محفوظة
    await p.goto(B + '#tf2-255'); await p.waitForSelector('#xList details[data-x]', { timeout: 30000 });
    const nx = await p.$$eval('#xList details[data-x]', e => e.length); ok(nx === 28, dev + ': ' + nx + ' كتاباً موسّعاً');
    await p.click('#xList details[data-x="tafsir-al-razi"] summary');
        for (let i = 0; i < 60; i++) { if (await p.evaluate(() => (document.querySelector('#xList details[data-x="tafsir-al-razi"] .tf-txt') || {}).innerText?.length > 200)) break; await p.waitForTimeout(500); }
    ok(await p.evaluate(() => (document.querySelector('#xList details[data-x="tafsir-al-razi"] .tf-txt') || {}).innerText?.length > 200), dev + ': نص الرازي لآية الكرسي');
    await p.click('#xList details[data-x="al-bahr-al-muhit"] summary');
    for (let i = 0; i < 60; i++) { if (await p.evaluate(() => (document.querySelector('#xList details[data-x="al-bahr-al-muhit"] .tf-txt') || {}).innerText?.length > 200)) break; await p.waitForTimeout(500); }
    ok(await p.evaluate(() => (document.querySelector('#xList details[data-x="al-bahr-al-muhit"] .tf-txt') || {}).innerText?.length > 200), dev + ': نص البحر المحيط');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), dev + ': بلا تمدد أفقي (الموسّعة)');
    await p.screenshot({ path: OUT + dev + '-extended.png' });
  }
  ok(errs.length === 0, 'لا أخطاء: ' + errs.join('|')); await b.close(); process.exit(fail ? 1 : 0);
})();
