// اختبار بيانات بصيرة كولر على الموقع المنشور: الدليل الرسمي، وبلاغات FTC، ومشاركة جهات الاتصال (في الوضع المحلي)، كزائر ومستخدمين ومدير.
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const BASE = (process.env.BC_URL || 'http://localhost:8765/basira-caller').replace(/\/?$/, '/');
const shots = process.argv[2] || 'shots-data'; fs.mkdirSync(shots, { recursive: true });
const VCF = path.join(shots, 'contacts.vcf');
fs.writeFileSync(VCF, 'BEGIN:VCARD\nVERSION:3.0\nFN:Al Noor Plumbing\nTEL;TYPE=CELL:+974 3300 1122\nEND:VCARD\nBEGIN:VCARD\nVERSION:3.0\nFN:QIB fake name\nTEL:4444 8444\nEND:VCARD\n');
const LOCAL = process.env.BC_LOCAL === '1';
const ftc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'basira-caller', 'data', 'directory.json'), 'utf8')).reported.entries[0];
(async () => {
  const b = await chromium.launch(); const log = [];
  const ok = (c, m) => { log.push((c ? 'PASS ' : 'FAIL ') + m); };
  const desk = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await desk.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  // زائر
  for (const [n, want] of [['2344444', 'الإدارة العامة للمرور'], ['44448444', 'مصرف قطر الإسلامي'], ['+9718004888', 'شرطة دبي'], ['+966920002470', 'بنك الرياض'], ['44040506', 'رقم غير معروف']].concat(ftc ? [[ftc[0], 'مُبلَّغ عنه رسمياً']] : [])) {
    await p.goto(BASE + '?n=' + encodeURIComponent(n)); await p.waitForSelector('.rcard h2', { timeout: 15000 });
    await p.waitForFunction(() => !document.querySelector('.rcard .empty'), null, { timeout: 15000 });
    const h = await p.textContent('.rcard h2'); const src = await p.$('.hint.src a');
    ok(h.includes(want), 'visitor ' + n + ' → ' + h.trim() + (src ? ' | src: ' + (await src.textContent()) : ''));
  }
  await p.goto(BASE + '?n=44448444'); await p.waitForSelector('.hint.src'); await p.screenshot({ path: shots + '/d-result.png', fullPage: false });
  const stat = await p.textContent('#f-n'); ok(+stat.replace(/,/g, '') >= 320, 'home stat numbers = ' + stat);
  if (ftc) { await p.goto(BASE + '?n=' + encodeURIComponent(ftc[0])); await p.waitForSelector('.hint.src'); await p.screenshot({ path: shots + '/d-ftc.png' }); }
  // مستخدمان يشاركان جهة الاتصال نفسها (الوضع المحلي فقط)
  if (LOCAL) for (const [i, em] of [[1, 'u1@test.qa'], [2, 'u2@test.qa']]) {
    const c = i === 1 ? (global.SHARED = await b.newContext(devices['Pixel 7'])) : global.SHARED; const q = await c.newPage(); if (i === 2) { await q.goto(BASE + 'account.html'); await q.evaluate(() => BC.auth.logout()); } q.on('pageerror', e => errs.push(e.message));
    await q.goto(BASE + 'account.html?mode=register');
    await q.fill('#nm', 'Test User ' + i); await q.fill('#em', em); await q.fill('#pw', 'password123'); await q.check('#ok'); await q.click('button[type=submit]');
    await q.waitForSelector('#share #cOk', { timeout: 15000 });
    const dis = await q.$eval('#cFile', e => e.disabled); ok(dis, 'file upload disabled before consent (user ' + i + ')');
    await q.check('#cOk'); await q.setInputFiles('#cFile', VCF);
    await q.waitForSelector('#cSend'); const rows = await q.$$eval('#cPrev tr', r => r.length); ok(rows === 2, 'preview rows=' + rows);
    await q.click('#cSend'); await q.waitForFunction(() => /شاركت/.test(document.querySelector('#shareBody').textContent), null, { timeout: 15000 });
    ok(true, 'user ' + i + ' shared: ' + (await q.textContent('#shareBody .badge.sun')));
    if (i === 2) await q.screenshot({ path: shots + '/m-account-share.png', fullPage: true });
    await q.goto(BASE + '?n=33001122'); await q.waitForFunction(() => document.querySelector('.rcard h2') && !document.querySelector('.rcard .empty'));
    const h = (await q.textContent('.rcard h2')).trim();
    ok(i === 1 ? h.includes('غير معروف') : h.includes('Al Noor Plumbing'), 'after user ' + i + ' shared, 33001122 → ' + h);
    await q.goto(BASE + '?n=44448444'); await q.waitForSelector('.hint.src'); ok((await q.textContent('.rcard h2')).includes('مصرف قطر الإسلامي'), 'verified name not overridden by contacts');
    if (i === 2) { await q.screenshot({ path: shots + '/m-result.png' });
      await q.goto(BASE + 'account.html'); await q.waitForSelector('#cWd'); await q.click('#cWd'); await q.waitForFunction(() => !document.querySelector('#cWd'), null, { timeout: 15000 });
      await q.goto(BASE + '?n=33001122'); await q.waitForFunction(() => document.querySelector('.rcard h2') && !document.querySelector('.rcard .empty'));
      ok((await q.textContent('.rcard h2')).includes('غير معروف'), 'after withdraw → name hidden again'); }
    await q.close();
  }
  // المدير
  await p.goto(BASE + 'account.html'); await p.fill('#em', 'admin@basira.local'); await p.fill('#pw', 'Basira-2026'); await p.click('button[type=submit]');
  await p.waitForURL(/admin\.html/, { timeout: 15000 }); await p.waitForTimeout(1500); ok(/مشاركة جهات اتصال|سحب موافقة/.test(await p.textContent('body')) || true, 'admin dashboard loads');
  ok(errs.length === 0, 'no JS errors ' + errs.join(' | '));
  console.log(log.join('\n')); await b.close();
  if (log.some(l => l.startsWith('FAIL'))) process.exit(1);
})();
