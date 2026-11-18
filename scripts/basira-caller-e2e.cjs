// اختبار شامل لبصيرة كولر بكل الأدوار: زائر، ومستخدم مسجّل، ومدير — على الكمبيوتر والجوال.
// الاستخدام: BC_URL=https://munjiz-qa.github.io/basira-caller BC_ADMIN_EMAIL=... BC_ADMIN_PASS=... node scripts/basira-caller-e2e.cjs shots
const { chromium, devices } = require('playwright');
const BASE = (process.env.BC_URL || 'http://localhost:8787/basira-caller').replace(/\/$/, '');
const OUT = process.argv[2] || 'shots';
require('fs').mkdirSync(OUT, { recursive: true });
const stamp = Date.now().toString().slice(-6);
const NUM = '3' + stamp.padStart(7, '0').slice(-7);   // رقم اختبار قطري: 8 أرقام
let fails = 0;
const ok = (c, m) => { console.log((c ? '✓ ' : '✗ ') + m); if (!c) fails++; };

(async () => {
  const browser = await chromium.launch();
  for (const [label, ctxOpts] of [['desktop', { viewport: { width: 1366, height: 860 } }], ['mobile', devices['Pixel 7']]]) {
    console.log('\n== ' + label + ' ==');
    const ctx = await browser.newContext(Object.assign({ locale: 'ar-QA' }, ctxOpts));
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    const num = label === 'desktop' ? NUM : NUM.replace(/^3/, '7');
    // ---- الزائر ----
    await page.goto(BASE + '/');
    await page.waitForFunction(() => document.getElementById('f-n').textContent !== '—');
    ok(true, 'الزائر: الصفحة الرئيسية وإحصاءات المنصة ظاهرة');
    await page.screenshot({ path: `${OUT}/${label}-1-home.png` });
    await page.fill('#q', num.replace(/(\d{4})(\d{4})/, '$1 $2'));
    await page.click('#sform button');
    await page.waitForSelector('.rcard h2');
    ok((await page.textContent('.rhead .n')).includes('+974 ' + num.slice(0, 4) + ' ' + num.slice(4)), 'الزائر: الرقم موحّد بصيغة +974 XXXX XXXX');
    await page.click('[data-a=report]');
    ok(await page.isVisible('#dlg a[href*="account.html"]'), 'الزائر: المساهمة تطلب تسجيل الدخول');
    await page.click('#dlg [data-close]');
    // ---- مستخدم جديد ----
    const email = `test${label}${stamp}@example.com`;
    await page.goto(BASE + '/account.html?mode=register');
    await page.fill('#nm', 'مختبر ' + label); await page.fill('#em', email); await page.fill('#ph', '5000 ' + stamp.slice(-4)); await page.fill('#pw', 'Test-pass-2026'); await page.check('#ok');
    await page.click('#f button[type=submit]');
    await page.waitForSelector('text=مساهماتي');
    ok(true, 'المستخدم: إنشاء حساب ودخول');
    await page.goto(BASE + '/?n=%2B974' + num);
    await page.waitForSelector('.rcard [data-a=name]');
    await page.click('[data-a=name]'); await page.fill('#nm', 'مؤسسة الاختبار ' + label); await page.click('#fn button');
    await page.waitForFunction(n => document.querySelector('.rhead h2').textContent.includes(n), 'مؤسسة الاختبار');
    ok(true, 'المستخدم: إضافة اسم للرقم');
    await page.click('[data-a=report]'); await page.check('#k1', { force: true }).catch(() => page.click('label[for=k1]'));
    await page.click('label[for=k1]'); await page.fill('#cm', 'يطلب رمز التحقق مدعياً أنه من البنك'); await page.click('#fr button');
    await page.waitForSelector('.comments li');
    ok((await page.textContent('.comments')).includes('رمز التحقق'), 'المستخدم: البلاغ يظهر فوراً في النتيجة');
    await page.click('[data-a=spam]'); await page.waitForTimeout(800);
    const score = await page.textContent('.kv b.ltr');
    ok(/^\s*\d+ \/ 100/.test(score) && parseInt(score) > 0, 'المستخدم: مؤشر الإزعاج ارتفع (' + score.trim() + ')');
    await page.screenshot({ path: `${OUT}/${label}-2-result.png`, fullPage: false });
    await page.goto(BASE + '/account.html'); await page.waitForSelector('.tbl');
    ok((await page.locator('.tbl tbody tr').count()) >= 3, 'المستخدم: مساهماتي تعرض الاسم والبلاغ والتقييم');
    await page.screenshot({ path: `${OUT}/${label}-3-account.png` });
    await page.goto(BASE + '/admin.html'); await page.waitForSelector('text=مخصصة لمدير المنصة');
    ok(true, 'المستخدم العادي لا يدخل لوحة الإدارة');
    await page.goto(BASE + '/account.html'); await page.click('#out'); await page.waitForSelector('#f');
    // ---- الخصوصية ----
    await page.goto(BASE + '/privacy.html#remove');
    await page.fill('#rn', '+974 ' + num); await page.fill('#rc', email); await page.fill('#rd', 'طلب اختبار آلي'); await page.click('#rf button');
    await page.waitForSelector('#rf .note'); ok(true, 'الزائر: إرسال طلب إزالة رقم');
    // ---- المدير ----
    if (process.env.BC_ADMIN_EMAIL) {
      await page.goto(BASE + '/account.html');
      await page.fill('#em', process.env.BC_ADMIN_EMAIL); await page.fill('#pw', process.env.BC_ADMIN_PASS); await page.click('#f button[type=submit]');
      await page.waitForURL(/admin\.html/); await page.waitForSelector('.stats');
      ok(true, 'المدير: الدخول يوجّه إلى لوحة الإدارة');
      await page.screenshot({ path: `${OUT}/${label}-4-admin.png` });
      await page.click('[data-t=reports]'); await page.fill('#tq', num); await page.click('#tf button');
      await page.waitForSelector('[data-rep][data-s=confirmed]'); await page.click('[data-rep][data-s=confirmed]');
      await page.waitForTimeout(1200);
      ok(true, 'المدير: تأكيد بلاغ');
      await page.click('[data-t=requests]'); await page.waitForSelector('#pane >> text=طلبات الإزالة', { timeout: 8000 }).catch(() => {}); await page.waitForSelector('#pane .tbl');
      ok((await page.textContent('#pane')).includes(num.slice(4)), 'المدير: طلب الإزالة ظاهر');
      await page.click('[data-t=users]'); await page.waitForSelector('#pane >> text=' + email, { timeout: 8000 }).catch(() => {});
      ok((await page.textContent('#pane')).includes(email), 'المدير: المستخدم الجديد ظاهر');
      await page.screenshot({ path: `${OUT}/${label}-5-admin-users.png` });
      await page.click('[data-t=numbers]'); await page.fill('#tq', num); await page.click('#tf button'); await page.waitForSelector('[data-ed]');
      await page.click('[data-ed]'); await page.fill('#nm', 'رقم اختبار موثّق'); await page.check('#vf'); await page.click('#ef button');
      await page.waitForTimeout(1200);
      await page.goto(BASE + '/?n=%2B974' + num); await page.waitForSelector('.rcard h2');
      ok((await page.textContent('.rhead h2')).includes('موثّق'), 'المدير: التوثيق ظاهر للزوار');
      await page.goto(BASE + '/admin.html'); await page.click('[data-t=numbers]'); await page.fill('#tq', num); await page.click('#tf button'); await page.waitForSelector('[data-del]');
      await page.click('[data-del]'); await page.click('#yes'); await page.waitForTimeout(1200);
      ok(true, 'المدير: حذف رقم الاختبار');
      await page.goto(BASE + '/account.html'); await page.click('#out');
    }
    ok(errs.length === 0, 'لا أخطاء JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
    await ctx.close();
  }
  await browser.close();
  console.log(fails ? `\n${fails} فحص فشل` : '\nكل الفحوص نجحت');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
