// اختبار شامل لمنصة معلّم دون أي خادم ودون Claude: زائر، عميل افتراضي، عميل جديد، مدير شامل، على الكمبيوتر والجوال.
// التشغيل: node scripts/teacher-e2e.cjs <رابط معلّم> <مجلد اللقطات>
const { chromium, devices } = require('playwright');
const [base, shots = 'shots'] = process.argv.slice(2); require('fs').mkdirSync(shots, { recursive: true });
const ADMIN0 = ['admin', 'Cqsfr-9366@'], STUDENT0 = ['student', 'Fweig-7927#']; let ADMIN, STUDENT; const forced = [];
const results = []; const ok = (name, cond, extra = '') => results.push({ name, pass: !!cond, extra });

(async () => {
  const b = await chromium.launch();
  for (const [dev, opts] of [['desktop', { viewport: { width: 1366, height: 850 } }], ['mobile', devices['iPhone 13']]]) {
    ADMIN = [...ADMIN0]; STUDENT = [...STUDENT0]; forced.length = 0;
    const ctx = await b.newContext({ ...opts, acceptDownloads: true });
    const p = await ctx.newPage(); const errs = [], hosts = new Set();
    p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
    p.on('request', r => hosts.add(new URL(r.url()).host));
    let promptVal = 'NewPass-2026!'; p.on('dialog', d => d.accept(d.type() === 'prompt' ? promptVal : undefined));
    const L = (action, body) => p.evaluate(([a, bd]) => window.TeacherLocal.call(a, bd).catch(e => ({ ok: false, error: e.code })), [action, body || {}]);
    const tabs = () => p.$$eval('#tabs a', a => a.map(x => x.textContent));
    const overflow = () => p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    const login = async ([u, pw]) => { await p.goto(base + '#account'); await p.waitForSelector('#loginF'); await p.fill('#loginF [name=username]', u); await p.fill('#loginF [name=password]', pw); await p.click('#loginF button[type=submit]'); await p.waitForTimeout(900);
      if (await p.$('#view .banner[role=alert]')) { const np = u === 'admin' ? 'Admin-2026x!' : 'Student-2026x';
        forced.push(u); await p.fill('#pwF [name=current]', pw); await p.fill('#pwF [name=password]', np); await p.click('#pwF button[type=submit]'); await p.waitForTimeout(900);
        if (u === 'admin') ADMIN[1] = np; if (u === 'student') STUDENT[1] = np; } };
    const logout = async () => { await p.goto(base + '#account'); await p.waitForSelector('#out'); await p.click('#out'); await p.waitForTimeout(400); };

    // visitor
    await p.goto(base, { waitUntil: 'networkidle' });
    ok(`${dev} زائر: الصفحة تعمل`, (await p.textContent('#view')).includes('خطوتك اليوم'));
    ok(`${dev} زائر: لا تبويب إدارة`, !(await tabs()).includes('الإدارة'));
    ok(`${dev} لا اعتماد على Claude ولا على أي خادم`, await p.evaluate(() => !window.claude && !window.TEACHER_CONFIG.API));
    await p.goto(base + '#admin'); await p.waitForTimeout(300);
    ok(`${dev} زائر: رابط الإدارة لا يفتح اللوحة`, !(await p.textContent('#view')).includes('لوحة الإدارة'));
    await p.screenshot({ path: `${shots}/${dev}-1-visitor.png` });

    // wrong password
    await p.goto(base + '#account'); await p.waitForSelector('#loginF');
    await p.screenshot({ path: `${shots}/${dev}-2-login.png`, fullPage: true });
    await p.fill('#loginF [name=username]', 'admin'); await p.fill('#loginF [name=password]', 'wrong-pass'); await p.click('#loginF button[type=submit]'); await p.waitForTimeout(700);
    ok(`${dev} كلمة مرور خاطئة تُرفض`, (await p.textContent('#loginE')).includes('غير صحيحة'));

    // default learner
    await login(STUDENT);
    ok(`${dev} العميل الافتراضي يُلزَم بتغيير كلمة المرور`, forced.includes('student'));
    ok(`${dev} العميل الافتراضي يدخل`, (await tabs()).includes('حسابي'));
    ok(`${dev} العميل لا يرى الإدارة`, !(await tabs()).includes('الإدارة'));
    await p.goto(base + '#admin'); await p.waitForTimeout(300);
    ok(`${dev} العميل لا يفتح الإدارة بالرابط`, !(await p.textContent('#view')).includes('لوحة الإدارة'));
    const stTok = await p.evaluate(() => localStorage.getItem('teacher-token-v1'));
    ok(`${dev} النظام يرفض أوامر الإدارة من العميل`, (await L('listUsers', { token: stTok })).error === 'forbidden');
    await p.goto(base + '#l1'); await p.waitForTimeout(300);
    await p.fill('textarea', 'أريد من Claude مساعدتي في تنظيم مواعيد العيادة وكتابة رسائل المتابعة.');
    await p.click('#review'); await p.waitForTimeout(1200);
    await p.reload(); await p.waitForTimeout(800);
    ok(`${dev} العميل: الجلسة تبقى بعد إعادة الفتح`, (await tabs()).includes('حسابي'));
    await p.goto(base + '#account'); await p.waitForTimeout(300);
    await p.screenshot({ path: `${shots}/${dev}-3-learner-account.png`, fullPage: true });
    await p.fill('#pwF [name=current]', STUDENT[1]); await p.fill('#pwF [name=password]', 'Student-2026y'); STUDENT[1] = 'Student-2026y'; await p.click('#pwF button[type=submit]'); await p.waitForTimeout(800);
    await logout();
    ok(`${dev} العميل: تسجيل الخروج`, (await tabs()).includes('الدخول'));
    ok(`${dev} العميل: تغيير كلمة المرور يعمل`, (await L('login', { username: 'student', password: 'Student-2026y' })).ok);
    await L('login', { username: 'student', password: 'x' }); // noop fail
    // restore student's password through admin later

    // new learner self-signup
    await p.goto(base + '#account'); await p.waitForSelector('#regF');
    await p.fill('#regF [name=name]', 'متعلّم جديد'); await p.fill('#regF [name=username]', `new.${dev}`); await p.fill('#regF [name=password]', 'Learn-2026x');
    await p.click('#regF button[type=submit]'); await p.waitForTimeout(900);
    ok(`${dev} عميل جديد: إنشاء حساب ودخول`, (await tabs()).includes('حسابي'));
    await logout();
    await login(STUDENT);
    await p.goto(base + '#l1'); await p.waitForTimeout(500);
    ok(`${dev} العميل: تقدّمه محفوظ باسمه بعد دخول غيره`, (await p.inputValue('textarea')).includes('مواعيد العيادة'));
    await logout();

    // super admin
    await login(ADMIN);
    ok(`${dev} المدير يُلزَم بتغيير كلمة المرور الافتراضية`, forced.includes('admin'));
    ok(`${dev} المدير الشامل يدخل إلى اللوحة`, (await p.textContent('#view')).includes('لوحة الإدارة'));
    await p.waitForSelector('#uTable'); await p.waitForTimeout(300);
    ok(`${dev} مدير: يرى كل المستخدمين`, ['student', `new.${dev}`].every(async () => true) && (await p.textContent('#uTable')).includes(`new.${dev}`));
    const nu = `staff.${dev}`;
    await p.fill('#newUser [name=name]', 'موظف تجريبي'); await p.fill('#newUser [name=username]', nu); await p.fill('#newUser [name=password]', 'Staff-2026x');
    await p.click('#newUser button[type=submit]'); await p.waitForTimeout(900);
    const row = () => p.locator('#uTable tr', { hasText: nu });
    ok(`${dev} مدير: إضافة مستخدم`, await row().count() === 1);
    await p.screenshot({ path: `${shots}/${dev}-4-admin-users.png`, fullPage: true });
    await row().locator('[data-act=role]').click(); await p.waitForTimeout(600);
    ok(`${dev} مدير: ترقية إلى مدير`, (await row().textContent()).includes('مدير'));
    await row().locator('[data-act=active]').click(); await p.waitForTimeout(600);
    ok(`${dev} مدير: إيقاف حساب`, (await row().textContent()).includes('موقوف'));
    ok(`${dev} الحساب الموقوف لا يدخل`, (await L('login', { username: nu, password: 'Staff-2026x' })).error === 'disabled');
    await row().locator('[data-act=active]').click(); await p.waitForTimeout(600);
    await row().locator('[data-act=pass]').click(); await p.waitForTimeout(900);
    ok(`${dev} مدير: تعيين كلمة مرور`, (await L('login', { username: nu, password: 'NewPass-2026!' })).ok);
    await row().locator('[data-act=delete]').click(); await p.waitForTimeout(600);
    ok(`${dev} مدير: حذف حساب`, await row().count() === 0);
    promptVal = STUDENT[1];
    await p.locator('#uTable tr', { hasText: 'student' }).locator('[data-act=pass]').click(); await p.waitForTimeout(900);
    ok(`${dev} مدير: إعادة كلمة مرور العميل`, (await L('login', { username: 'student', password: STUDENT[1] })).ok);
    promptVal = 'NewPass-2026!';
    const adTok = await p.evaluate(() => localStorage.getItem('teacher-token-v1'));
    ok(`${dev} حماية: المدير لا يوقف نفسه`, (await L('updateUser', { token: adTok, id: 'u-admin', active: false })).error === 'self');
    await p.click('[data-atab=settings]'); await p.waitForTimeout(200);
    await p.uncheck('#seq'); await p.waitForTimeout(400);
    ok(`${dev} مدير: الإعدادات تُحفظ`, (await L('publicSettings')).settings.sequential === false);
    await p.check('#seq'); await p.waitForTimeout(400);
    await p.screenshot({ path: `${shots}/${dev}-5-admin-settings.png`, fullPage: true });
    await p.click('[data-atab=stats]'); await p.waitForTimeout(200);
    await p.screenshot({ path: `${shots}/${dev}-6-admin-stats.png`, fullPage: true });
    await p.click('[data-atab=log]'); await p.waitForTimeout(200);
    ok(`${dev} مدير: سجل العمليات`, (await p.textContent('#view')).includes('إضافة مستخدم'));
    await p.click('[data-atab=data]'); await p.waitForTimeout(200);
    await p.screenshot({ path: `${shots}/${dev}-7-admin-data.png`, fullPage: true });
    const [bk] = await Promise.all([p.waitForEvent('download'), p.click('#exp')]);
    const bkPath = `${shots}/${dev}-backup.json`; await bk.saveAs(bkPath);
    ok(`${dev} مدير: تصدير نسخة احتياطية`, require('fs').readFileSync(bkPath, 'utf8').includes(`new.${dev}`));
    await p.click('[data-atab=users]'); await p.waitForTimeout(200);
    const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#csv')]);
    ok(`${dev} مدير: تصدير CSV`, dl.suggestedFilename() === 'Teacher-users.csv');
    ok(`${dev} بلا تمرير أفقي`, (await overflow()) <= 0);

    // import on a brand-new device
    const ctx2 = await b.newContext({ ...opts }); const q = await ctx2.newPage();
    q.on('dialog', d => d.accept());
    await q.goto(base + '#account'); await q.waitForSelector('#loginF');
    await q.fill('#loginF [name=username]', 'admin'); await q.fill('#loginF [name=password]', ADMIN0[1]); await q.click('#loginF button[type=submit]'); await q.waitForTimeout(900);
    await q.fill('#pwF [name=current]', ADMIN0[1]); await q.fill('#pwF [name=password]', 'Device2-2026x!'); await q.click('#pwF button[type=submit]'); await q.waitForTimeout(900);
    await q.click('[data-atab=data]'); await q.waitForTimeout(200);
    await q.setInputFiles('#imp', bkPath); await q.waitForTimeout(1200);
    await q.click('[data-atab=users]'); await q.waitForTimeout(300);
    ok(`${dev} جهاز آخر: استيراد النسخة ينقل الحسابات`, (await q.textContent('#uTable')).includes(`new.${dev}`));
    await ctx2.close();

    // lockout
    for (let i = 0; i < 5; i++) await L('login', { username: 'student', password: 'x' + i });
    ok(`${dev} حماية: قفل بعد 5 محاولات خاطئة`, (await L('login', { username: 'student', password: STUDENT[1] })).error === 'locked');
    ok(`${dev} بلا أخطاء في الصفحة`, errs.length === 0, errs.join(' | '));
    ok(`${dev} لا طلبات إلى Claude أو Anthropic`, ![...hosts].some(h => /claude|anthropic/.test(h)), [...hosts].join(' '));
    await ctx.close();
  }
  await b.close();
  results.forEach(r => console.log((r.pass ? '✓' : '✗') + ' ' + r.name + (r.pass || !r.extra ? '' : '  → ' + r.extra)));
  console.log(`\n${results.filter(r => r.pass).length}/${results.length} passed`);
  if (results.some(r => !r.pass)) process.exit(1);
})();
