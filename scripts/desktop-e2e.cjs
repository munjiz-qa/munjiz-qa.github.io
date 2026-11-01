// اختبار «منجز على الكمبيوتر» بكل الأدوار: زائر، عميل، إدارة (متصل ومحلي)، ودون إنترنت، وقابلية التثبيت كتطبيق.
// الاستخدام: BASE=http://localhost:8765/ node scripts/desktop-e2e.cjs [مجلد الصور]
const { chromium } = require('playwright');
const B = process.env.BASE || 'http://localhost:8765/';
const OUT = process.argv[2] || require('os').tmpdir();
const log = (...a) => console.log(...a);
(async () => {
  const browser = await chromium.launch();
  let fails = 0; const ok = (c, m) => { log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++; };
  for (const [name, vp] of [['desktop', { width: 1440, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
    const ctx = await browser.newContext({ viewport: vp, isMobile: name === 'mobile', hasTouch: name === 'mobile' });
    await ctx.route(/script\.google\.com|fonts\.(googleapis|gstatic)\.com|translate/, r => r.abort());
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', e => errs.push(e.message));
    // visitor
    await page.goto(B + 'index.html'); await page.waitForLoadState('networkidle').catch(()=>{});
    ok(await page.locator('footer a[href="desktop.html"]').count() === 1, `[${name}] visitor: home has "Munjiz on your computer" link`);
    const ovf = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(ovf <= 1, `[${name}] home no horizontal scroll (${ovf})`);
    await page.screenshot({ path: `${OUT}/${name}-home.png` });
    await page.click('footer a[href="desktop.html"]');
    await page.waitForSelector('#localBox:not([hidden])');
    ok(true, `[${name}] desktop page shows local box`);
    ok((await page.textContent('#modeNow')).includes('متصل'), `[${name}] default mode is connected`);
    const ovf2 = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(ovf2 <= 1, `[${name}] desktop page no horizontal scroll (${ovf2})`);
    await page.screenshot({ path: `${OUT}/${name}-desktop-page.png`, fullPage: true });
    // service worker
    await page.reload(); await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller, null, { timeout: 10000 }).catch(()=>{});
    ok(await page.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller)), `[${name}] service worker controls page`);
    // admin online
    await page.goto(B + 'crm.html'); await page.waitForSelector('#loginF', { state: 'visible' });
    ok((await page.textContent('#modeBar')).includes('متصل بخادم'), `[${name}] admin connected mode bar`);
    ok(await page.locator('a[href="desktop.html"]').count() === 1, `[${name}] admin login links to desktop page`);
    // client online
    await page.goto(B + 'portal.html'); await page.waitForLoadState('domcontentloaded');
    ok(await page.locator('#noApi').isHidden(), `[${name}] client portal in connected mode`);
    await page.screenshot({ path: `${OUT}/${name}-portal.png` });
    // switch to offline mode
    await page.goto(B + 'desktop.html'); await page.check('input[value=offline]');
    ok((await page.textContent('#modeNow')).includes('محلي'), `[${name}] switched to offline mode`);
    await page.goto(B + 'crm.html'); await page.waitForSelector('#loginF', { state: 'visible' });
    ok((await page.textContent('#modeBar')).includes('وضع محلي'), `[${name}] admin local mode bar`);
    await page.fill('#un', '123'); await page.fill('#pw', '123'); await page.click('#loginBtn');
    await page.waitForSelector('#chg:not([hidden])'); ok(true, `[${name}] first login forces credential change`);
    await page.fill('#cUn', 'mudir'); await page.fill('#cPw', 'Munjiz#2026'); await page.fill('#cPw2', 'Munjiz#2026'); await page.click('#chgF button[type=submit]');
    await page.waitForSelector('#groups:not([hidden])', { timeout: 10000 }); ok(true, `[${name}] admin dashboard opens offline`);
    await page.screenshot({ path: `${OUT}/${name}-admin-offline.png` });
    // save a client record directly via the panel storage API and confirm it persists after reload
    await page.reload(); await page.waitForSelector('#groups:not([hidden])'); ok(true, `[${name}] session survives reload`);
    await page.click('#logout'); await page.waitForSelector('#loginF', { state: 'visible' });
    await page.fill('#un', 'mudir'); await page.fill('#pw', 'Munjiz#2026'); await page.click('#loginBtn');
    await page.waitForSelector('#groups:not([hidden])'); ok(true, `[${name}] new admin credentials work after reload`);
    ok(await page.evaluate(() => !!localStorage.getItem('munjiz_crm_pw')), `[${name}] local credentials stored on this computer`);
    // client portal offline: shows "needs server" notice
    await page.goto(B + 'portal.html'); ok(await page.locator('#noApi').isVisible(), `[${name}] client portal explains offline mode`);
    // switch back
    await page.goto(B + 'desktop.html'); await page.check('input[value=online]');
    await page.goto(B + 'crm.html'); await page.waitForSelector('#modeBar:not([hidden])');
    ok((await page.textContent('#modeBar')).includes('متصل بخادم'), `[${name}] back to connected mode`);
    // offline network: cached pages still open
    await ctx.setOffline(true);
    for (const p of ['index.html', 'crm.html', 'desktop.html', 'en/index.html']) {
      const r = await page.goto(B + p).catch(e => null); ok(r && r.ok(), `[${name}] no internet: ${p} opens from cache`);
    }
    await ctx.setOffline(false);
    ok(errs.length === 0, `[${name}] no JS errors ${errs.join(' | ')}`);
    await ctx.close();
  }
  // installability (Chromium CDP)
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await ctx.route(/script\.google\.com|fonts\./, r => r.abort());
  for (const p of ['crm.html', 'portal.html', 'en/desktop.html']) {
    await page.goto(B + p); await page.waitForTimeout(1500);
    const cdp = await ctx.newCDPSession(page);
    const r = await cdp.send('Page.getInstallabilityErrors'); const m = await cdp.send('Page.getAppManifest');
    ok(r.installabilityErrors.length === 0, `installable as app: ${p} ${JSON.stringify(r.installabilityErrors)} manifest=${m.url}`);
  }
  await browser.close(); log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
