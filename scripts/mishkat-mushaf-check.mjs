// فحص «المصحف المتصل» في مشكاة المنشور: النص المعروض في الصفحات الـ٦٠٤ يطابق نص مجمع الملك فهد (حفص، الإصدار ١٨) حرفاً حرفاً،
// وصفحة كل آية تطابق بيانات المجمع، ولا سطر يتجاوز صفحته على الكمبيوتر والجوال، والتنقل وحفظ الموضع يعملان، ولا اتصال بأي خدمة خارجية.
import pw from 'playwright';
const { chromium } = pw;
const B = process.env.MISHKAT_URL || 'https://munjiz-qa.github.io/mishkat/';
const REF = process.env.KFGQPC_URL || 'https://raw.githubusercontent.com/thetruetruth/quran-data-kfgqpc/main/hafs/data/hafsData_v18.json';
let fail = 0; const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fail++; };
const K = await (await fetch(REF)).json();
ok(K.length === 6236, `مرجع المجمع محمّل (${K.length} آية)`);
const AR = n => String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const b = await chromium.launch();
for (const [name, o] of [['الكمبيوتر', { viewport: { width: 1366, height: 900 } }], ['الجوال', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
  const ctx = await b.newContext(o); const p = await ctx.newPage(); const errs = [], ext = new Set();
  p.on('pageerror', e => errs.push(e.message));
  p.on('request', r => { const u = new URL(r.url()); if (u.origin !== new URL(B).origin) ext.add(u.hostname); });
  await p.goto(B + '#p1');
  let ready = false; for (let i = 0; i < 200 && !ready; i++) { ready = await p.evaluate(() => !!document.querySelector('#mpg1[data-ok]')); if (!ready) await p.waitForTimeout(250); }
  ok(ready, `${name}: المصحف يفتح`);
  if (!ready) continue;
  const R = await p.evaluate(() => {
    const ayat = {}, pages = {}, nums = {}, over = []; let prev = -1, seq = true;
    for (let pg = 1; pg <= 604; pg++) {
      const el = document.getElementById('mpg' + pg); delete el.dataset.ok; mpFill(el);
      for (const s of el.querySelectorAll('.mp-t .w')) { const a = +s.dataset.a; (ayat[a] = ayat[a] || []).push(s.textContent); if (pages[a] == null) pages[a] = pg; if (a !== prev) { if (a !== prev + 1) seq = false; prev = a; } }
      el.querySelectorAll('.mp-n').forEach(n => { (nums[n.dataset.ayah] = nums[n.dataset.ayah] || []).push(n.textContent); });
      el.querySelectorAll('.mp-l').forEach((l, li) => { if (l.scrollWidth > l.clientWidth + 1) over.push(pg + ':' + (li + 1)); });
      const bd = el.querySelector('.mp-body'); if (bd.scrollHeight > bd.clientHeight + 2) over.push(pg + ':h');
      mpEmpty(el);
    }
    return { ayat, pages, nums, over, seq, last: prev };
  });
  let t = 0, pg = 0, nm = 0; const bad = [];
  K.forEach((k, i) => {
    if ((R.ayat[i] || []).join(' ') === k.aya_text.replace(/\s*[٠-٩]+\s*$/, '').trim()) t++; else bad.push(`${k.sora}:${k.aya_no}`);
    if (R.pages[i] === k.page) pg++;
    if ((R.nums[i] || []).join() === AR(k.aya_no)) nm++;
  });
  ok(t === 6236, `${name}: نص الآيات المعروض مطابق لنص المجمع حرفاً حرفاً (${t}/6236) ${bad.slice(0, 5)}`);
  ok(pg === 6236, `${name}: صفحة كل آية تطابق مصحف المدينة (${pg}/6236)`);
  ok(nm === 6236 && R.seq && R.last === 6235, `${name}: الآيات متتابعة ورقم كل آية مرة واحدة (${nm}/6236)`);
  ok(R.over.length === 0, `${name}: لا سطر يتجاوز صفحته ${R.over.slice(0, 6)}`);
  const go = async (sel, v) => { await p.selectOption(sel, String(v)); await p.waitForTimeout(1200); return p.evaluate(() => MPV.cur); };
  ok(await go('#mpSur', 18) === 293 && await go('#mpJuz', 30) === 582, `${name}: الانتقال إلى سورة وجزء`);
  await p.fill('#mpPage', '201'); await p.press('#mpPage', 'Enter'); await p.waitForTimeout(1500);
  await p.goto(B + '#mushaf'); await p.waitForSelector('#stbl tr', { timeout: 60000 });
  const href = await p.evaluate(() => document.querySelector('#view a.btn.pri')?.getAttribute('href'));
  await p.click('#view a.btn.pri'); let cur = 0; for (let i = 0; i < 60 && cur !== 201; i++) { await p.waitForTimeout(250); cur = await p.evaluate(() => typeof MPV !== 'undefined' ? MPV.cur : 0); }
  ok(/^#pa\d+$/.test(href || '') && cur === 201, `${name}: «أكمل القراءة» يعود إلى الصفحة المحفوظة (${cur})`);
  ok(!errs.length, `${name}: لا أخطاء برمجية ${errs.slice(0, 2)}`);
  ok(![...ext].length, `${name}: لا اتصال بأي خدمة خارجية ${[...ext]}`);
  ok(!/claude|anthropic/i.test(await p.content()), `${name}: لا اعتماد على Claude`);
  await ctx.close();
}
await b.close();
process.exit(fail ? 1 : 0);
