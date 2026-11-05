// صور من الموقع المنشور: المصحف بالخط الجديد على الجوال والكمبيوتر، وزر التثبيت
import pw from 'playwright'; import fs from 'fs';
const { chromium, devices } = pw; const B = 'https://munjiz-qa.github.io/mishkat/'; const O = 'live-shots/'; fs.mkdirSync(O, { recursive: true });
const b = await chromium.launch(); const log = [];
const D = { viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 }, M = { ...devices['iPhone 13'] };
for (const [o, nm] of [[D, 'desktop'], [M, 'mobile']]) {
  const c = await b.newContext(o), p = await c.newPage(); await p.goto(B + '#p50');
  let ok = false; for (let i = 0; i < 120 && !ok; i++) { ok = await p.evaluate(() => !!document.querySelector('#mpg50[data-ok]') && !!document.querySelector('#mpLay')).catch(() => false); if (!ok) await p.waitForTimeout(500); }
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => ({ lay: !!document.querySelector('#mpLay'), fs: getComputedStyle(document.querySelector('#mpg50 .mp-t') || document.body).fontSize, inst: !document.getElementById('instTop')?.hidden, flow: document.getElementById('mpRoot')?.classList.contains('mp-flow') }));
  log.push(nm + ' ' + JSON.stringify(info));
  await p.screenshot({ path: `${O}${nm}-mushaf-p50.png` });
  await p.goto(B + '#home'); await p.waitForTimeout(3000); await p.screenshot({ path: `${O}${nm}-home.png` });
  await c.close();
}
fs.writeFileSync(O + 'info.txt', new Date().toISOString() + '\n' + log.join('\n') + '\n'); console.log(log.join('\n'));
await b.close();
