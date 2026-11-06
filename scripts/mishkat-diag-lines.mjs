// مؤقت: تشخيص تجاوز «سطور المصحف» على الكمبيوتر في بيئة الفحص
import pw from 'playwright';
const B = 'https://munjiz-qa.github.io/mishkat/';
const b = await pw.chromium.launch();
for (const o of [{ viewport: { width: 1366, height: 900 } }, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]) {
  const p = await (await b.newContext(o)).newPage(); await p.goto(B + '#p1');
  for (let i = 0; i < 200; i++) { if (await p.evaluate(() => !!document.querySelector('#mpg1[data-ok]'))) break; await p.waitForTimeout(250); }
  await p.evaluate(() => { const r = document.getElementById('mpRoot'); if (!r.querySelector('#mpLay')?.offsetParent) document.getElementById('mpMore')?.click(); });
  await p.click('#mpLay button[data-l="1"]'); await p.waitForTimeout(800);
  const R = await p.evaluate(async () => { await document.fonts.ready; const out = { fonts: [...document.fonts].map(f => f.family + ':' + f.status).join(','), MPV: { fs: MPV.fs, lines: MPV.lines, flow: MPV.flow } , pages: [] };
    let bad = 0; for (let pg = 3; pg <= 604; pg++) { const el = document.getElementById('mpg' + pg); delete el.dataset.ok; mpFill(el); const bd = el.querySelector('.mp-body'); const d = bd.scrollHeight - bd.clientHeight; if (d > 2) bad++;
      if (pg <= 5 || (d > 2 && out.pages.length < 6)) { const br = bd.getBoundingClientRect(); const kids = [...bd.children].map(c => { const r = c.getBoundingClientRect(); let mx = r.bottom; c.querySelectorAll('*').forEach(x => { const q = x.getBoundingClientRect(); if (q.bottom > mx) mx = q.bottom; }); return c.className + ' h' + r.height.toFixed(1) + ' over' + (mx - r.bottom).toFixed(1); });
        out.pages.push({ pg, d, ch: bd.clientHeight, sh: bd.scrollHeight, top: br.top.toFixed(1), elh: el.offsetHeight, fsz: getComputedStyle(bd).fontSize, kids: kids.join(' | ') }); }
      mpEmpty(el); }
    out.bad = bad; return out; });
  console.log(JSON.stringify(R, null, 1)); }
await b.close();
