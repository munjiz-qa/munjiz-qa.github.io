// فحص التثبيت بضغطة والعمل دون إنترنت في كل المنصات المنشورة (قاعدة ثابتة لكل المنصات).
// لكل منصة: شريط التثبيت ظاهر أعلى الجوال، والضغطة الواحدة تفتح نافذة التثبيت، ويختفي بعد التثبيت،
// ثم تُفتح المنصة في وضع الطيران. ويحفظ لقطات الجوال في مجلد shots/install/.
import pw from 'playwright';
import fs from 'fs';
const { chromium, devices } = pw;
const ROOT = process.env.SITE_URL || 'https://munjiz-qa.github.io/';
const OUT = 'shots/install'; fs.mkdirSync(OUT, { recursive: true });
const APPS = [['mishkat/', 'مشكاة', 'full'], ['quran-lab/', 'مختبر الأبحاث القرآنية', 'full'], ['', 'منجز'], ['altayyibat/', 'الطيبات'], ['khabar/', 'خبر'], ['mishwar/', 'مشوار'], ['saif/', 'سيف'],
  ['binaa-builder/', 'بناء بيلدر'], ['teacher/', 'معلم'], ['sanad/app/', 'سند'], ['buraq/', 'براق'], ['marqab/', 'مرقب'], ['nibras/', 'نبراس']];
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await chromium.launch();
for (const [path, name, kind] of APPS) {
  const url = ROOT + path, file = (path.replace(/\/$/, '') || 'munjiz').replace(/\//g, '-');
  const ctx = await b.newContext({ ...devices['Pixel 7'] }); const p = await ctx.newPage();
  try {
    await p.goto(url, { waitUntil: 'load', timeout: 60000 }); await sleep(3000);
    const bar = kind ? '#instBar' : '.pwi-bar', go = kind ? '#instBarGo' : '.pwi-bar .pwi-go';
    ok(await p.isVisible(bar), `${name}: شريط «ثبّت على جوالك» ظاهر أعلى الجوال`);
    await p.screenshot({ path: `${OUT}/${file}-mobile.png` });
    await p.evaluate(() => { window.__pr = 0; const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => window.__pr++; e.userChoice = Promise.resolve({ outcome: 'accepted' }); window.dispatchEvent(e); });
    await p.click(go); await sleep(500);
    ok(await p.evaluate(() => window.__pr) === 1, `${name}: ضغطة واحدة تفتح نافذة التثبيت`);
    await p.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
    await sleep(500); ok(!(await p.isVisible(bar)), `${name}: يختفي الشريط بعد التثبيت`);
    // انتظار تجهيز الملفات للعمل دون إنترنت (مع مهلة)
    for (let i = 0; i < 180; i++) { if (await p.evaluate(() => Object.keys(localStorage).some(k => /:(offline|warm)$/.test(k)))) break; await sleep(1000); }
    ok(await p.evaluate(() => Object.keys(localStorage).some(k => /:(offline|warm)$/.test(k))), `${name}: جُهّزت ملفات المنصة للعمل دون إنترنت`);
    await ctx.setOffline(true); await p.reload({ timeout: 30000 }).catch(() => {}); await sleep(3000);
    const len = await p.evaluate(() => document.body.innerText.length).catch(() => 0);
    ok(len > 60, `${name}: تفتح في وضع الطيران`);
    if (kind === 'full') { // بحث كامل من التفاسير والأحاديث دون اتصال
      await p.evaluate(() => location.hash = 'research'); await sleep(1000);
      await p.fill('#rq', 'الصبر'); await p.click('#rgo'); await p.waitForSelector('#rdoc #rprint', { timeout: 300000 }).catch(() => {});
      const doc = await p.evaluate(() => document.querySelector('#rdoc')?.innerText || '');
      ok(/أقوال المفسرين/.test(doc) && /صحيح (البخاري|مسلم)/.test(doc), `${name}: بحث كامل بالتفاسير والأحاديث في وضع الطيران`);
    }
    await p.screenshot({ path: `${OUT}/${file}-offline.png` });
  } catch (e) { ok(false, `${name}: ${e.message.split('\n')[0]}`); }
  await ctx.close();
}
await b.close();
console.log(fail ? `✗ ${fail} فحصاً لم ينجح` : '✓ نجحت كل الفحوص');
process.exit(fail ? 1 : 0);
