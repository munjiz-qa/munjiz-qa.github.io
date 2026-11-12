// فحص «فهرس كتب التفسير» في مشكاة: جوال وكمبيوتر، تصفية وبحث. يعمل مستقلاً دون أي اتصال بـ Claude.
const { chromium } = require('playwright');
const B = process.env.MISHKAT_URL || 'https://munjiz-qa.github.io/mishkat/';
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
    const n = await p.$$eval('.tf-bkx', e => e.length); ok(n === 59, dev + ': ' + n + ' كتاباً');
    ok(await p.$$eval('.tf-bkx.own', e => e.length) === 8, dev + ': ثمانية متاحة');
    await p.click('#bxA [data-a="1"]'); ok(await p.$$eval('.tf-bkx', e => e.length) === 8, dev + ': تصفية المتاح');
    await p.click('#bxA [data-a="0"]'); ok(await p.$$eval('.tf-bkx', e => e.length) === 51, dev + ': تصفية للاطلاع');
    await p.click('#bxA [data-a=""]'); await p.click('#bxK [data-k="إشاري"]'); ok(await p.$$eval('.tf-bkx', e => e.length) === 6, dev + ': نوع إشاري');
    await p.click('#bxK [data-k=""]'); await p.fill('#bxQ', 'الطبري'); ok(await p.$$eval('.tf-bkx', e => e.length) === 1, dev + ': بحث الطبري');
    await p.fill('#bxQ', '');
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), dev + ': بلا تمدد أفقي');
    await p.screenshot({ path: OUT + dev + '-books.png', fullPage: false });
    await p.click('#bxK [data-k=""]');
    ok(/ت ٣١٠هـ/.test(await p.evaluate(() => document.body.innerText)), dev + ': تاريخ الطبري');
  }
  ok(errs.length === 0, 'لا أخطاء: ' + errs.join('|')); await b.close(); process.exit(fail ? 1 : 0);
})();
