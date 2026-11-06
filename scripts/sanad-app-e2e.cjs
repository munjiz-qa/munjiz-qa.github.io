// «سند» — اختبار الاستقلال الكامل عن Claude بكل الأدوار على الجوال والكمبيوتر
// محلياً: node scripts/sanad-app-e2e.cjs web sanad/app shots   |   المنشور: SANAD_URL=https://munjiz-qa.github.io/sanad/app node scripts/sanad-app-e2e.cjs web sanad/app shots
const { chromium, devices } = require('playwright');
const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path'); const http = require('http');
const MODE = process.argv[2]; const APP = path.resolve(process.argv[3]); const shots = path.resolve(process.argv[4] || 'shots-' + MODE);
const B = process.env.SANAD_URL || (MODE === 'web' ? 'http://localhost:8793/sanad/app' : 'http://localhost:8792');
const LIVE = !!process.env.SANAD_URL;
fs.mkdirSync(shots, { recursive: true });
const results = []; const ok = (n, c, info = '') => results.push([c ? 'PASS' : 'FAIL', `[${MODE}${LIVE ? ' live' : ''}] ${n}`, c ? '' : String(info).slice(0, 300)]);
const ADMIN = { login: 'admin@sanad.local', pass: 'Sanad@Admin2026' }, CLIENT = { login: 'client@sanad.local', pass: 'Sanad@Client2026' };
let srv, DATA;
const startServer = () => new Promise(r => {
  srv = spawn(process.execPath, [path.join(APP, 'server.js')], { env: { ...process.env, PORT: 8792, SANAD_DATA: DATA, ANTHROPIC_BASE_URL: 'http://127.0.0.1:9' }, stdio: ['ignore', 'pipe', 'inherit'] });
  srv.stdout.on('data', d => { if (String(d).includes('للإيقاف')) r(); });
});
const stopServer = () => new Promise(r => { srv.on('exit', r); srv.kill('SIGTERM'); });
function startStatic() { // يحاكي GitHub Pages: ملفات ثابتة فقط تحت /sanad/app/
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
  return new Promise(r => http.createServer((q, s) => {
    let p = decodeURIComponent(new URL(q.url, 'http://x').pathname);
    if (!p.startsWith('/sanad/app/')) { s.writeHead(404); return s.end('nf'); }
    p = p.slice('/sanad/app/'.length) || 'index.html'; if (p.endsWith('/')) p += 'index.html';
    const f = path.join(APP, p); if (!f.startsWith(APP) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end('nf'); }
    s.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }); s.end(fs.readFileSync(f));
  }).listen(8793, r));
}

(async () => {
  if (LIVE) {} else if (MODE === 'server') { DATA = fs.mkdtempSync('/tmp/sanad-ind-'); await startServer(); } else await startStatic();
  const browser = await chromium.launch();
  const errors = [], claudeCalls = [];
  const newCtx = async (opts = {}) => {
    const c = await browser.newContext({ locale: 'ar-QA', ...opts });
    await c.route(/anthropic\.com|claude\.ai|claude\.com/, r => { claudeCalls.push(r.request().url()); r.abort(); });
    return c;
  };
  const page = async (ctx, vp) => { const p = await ctx.newPage(); if (vp) await p.setViewportSize(vp); p.on('pageerror', e => errors.push(p.url() + ': ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_|fonts\.g/.test(m.text())) errors.push(p.url() + ' console: ' + m.text()); }); return p; };
  const tab = (p, k) => p.locator(`.rail [data-tab="${k}"]:visible, .tabbar [data-tab="${k}"]:visible`).first().click({ timeout: 3000 }).catch(async () => { await p.click('[data-act="more"]'); await p.click(`.sheet [data-tab="${k}"]`); });
  const overflow = p => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const ask = async (p, t) => { await p.fill('#cin', t); await p.press('#cin', 'Enter'); await p.waitForFunction(() => !document.querySelector('[data-act="stop"]'), null, { timeout: 15000 }); await p.waitForTimeout(400); };
  const home = async p => { await p.goto(B + '/'); await p.waitForSelector('.app'); await p.waitForTimeout(400); };
  const login = async (p, acc) => {
    await p.goto(B + '/login.html'); await p.waitForSelector('#f-login');
    await p.fill('#l-login', acc.login); await p.fill('#l-pass', acc.pass); await p.click('#f-login button[type=submit]');
    await p.waitForSelector('.app', { timeout: 10000 }); await p.waitForTimeout(400);
  };
  const logout = async p => { await p.click('[data-sn="logout"]:visible'); await p.waitForSelector('.app'); await p.waitForTimeout(400); };
  const api = (p, method, url, data) => p.evaluate(async ([m, u, d]) => { const r = await fetch(u, { method: m, headers: d ? { 'content-type': 'application/json' } : {}, body: d ? JSON.stringify(d) : undefined }); return { status: r.status, ...(await r.json().catch(() => ({}))) }; }, [method, url, data]);
  const DESK = { width: 1366, height: 860 };

  // ---------- 1. visitor (desktop + iPhone) ----------
  const VC = await newCtx(); const V = await page(VC, DESK);
  await home(V);
  const vt = await V.textContent('.main');
  ok('visitor: site opens with business + services (no setup, no Claude)', vt.includes('سند من منجز') && vt.includes('استشارة أولية'), vt.slice(0, 200));
  ok('visitor: Qatar contact unified', vt.includes('+974 5160 0498') || (await V.textContent('body')).includes('+974 5160 0498'));
  ok('visitor: no empty notification bar', !(await V.isVisible('#toast')));
  ok('visitor: no admin tabs', !(await V.textContent('.rail')).includes('العملاء'));
  await V.screenshot({ path: `${shots}/01-visitor-desktop.png` });
  await tab(V, 'chat'); await ask(V, 'ما الخدمات والأسعار؟');
  const vchat = await V.textContent('.thread');
  ok('visitor: built-in assistant answers services + prices', vchat.includes('استشارة أولية') && vchat.includes('150 ر.ق'), vchat.slice(-300));
  await ask(V, 'كيف أحجز موعد؟');
  ok('visitor: assistant explains how to book', (await V.textContent('.thread')).includes('حساب'));
  ok('visitor: no overflow desktop', !(await overflow(V)));
  const vperm = await V.evaluate(async () => { const db = await claude.use('db'); let w; try { await db.doc('public/site').set({ x: 1 }); w = 'wrote'; } catch (e) { w = e.code; } return { w, r: (await db.collection('portal').get()).size + (await db.collection('ops/main/appointments').get()).size }; });
  ok('visitor: cannot write or read private data', vperm.w === 'invalid_argument' && vperm.r === 0, JSON.stringify(vperm));
  const IC = await newCtx({ ...devices['iPhone 14'], locale: 'ar-QA' }); const I = await page(IC);
  await home(I); await I.evaluate(() => document.querySelector('.sn-install .x')?.click());
  ok('visitor iPhone: no overflow', !(await overflow(I)));
  await I.screenshot({ path: `${shots}/02-visitor-iphone.png` });

  // ---------- 2. client (Android phone) ----------
  const CC = await newCtx({ ...devices['Pixel 7'], locale: 'ar-QA' }); const C = await page(CC);
  await C.goto(B + '/login.html'); await C.waitForSelector('#f-login');
  if (MODE === 'web') {
    ok('login: ready-made account buttons shown', await C.isVisible('#demo-btns button'));
    await C.click('#demo-btns button >> nth=0');
    ok('login: client button fills credentials', await C.inputValue('#l-login') === CLIENT.login);
  } else ok('login: demo buttons hidden on server edition', !(await C.isVisible('#demo')));
  ok('login page: no overflow phone', !(await overflow(C)));
  await C.screenshot({ path: `${shots}/03-login-phone.png` });
  await login(C, CLIENT);
  ok('client: default client account signs in', (await C.textContent('.topbar')).includes('عميل'), await C.textContent('.topbar'));
  await tab(C, 'book'); await C.waitForTimeout(400);
  await C.click('.slots button >> nth=0'); await C.click('#bkform button[type=submit]'); await C.waitForTimeout(700);
  ok('client: booking request sent (pending)', (await C.textContent('.main')).includes('بانتظار التأكيد'));
  await C.screenshot({ path: `${shots}/04-client-booking-phone.png` });
  await tab(C, 'chat'); await ask(C, 'ما حالة طلباتي؟');
  ok('client: assistant reads own bookings', (await C.textContent('.thread')).includes('بانتظار التأكيد'), (await C.textContent('.thread')).slice(-200));
  ok('client: answer is precise (no unrelated sections)', !(await C.textContent('.thread')).includes('خدمات سند من منجز'), (await C.textContent('.thread')).slice(-300));
  await C.screenshot({ path: `${shots}/05-client-chat-phone.png` });
  const perm = await C.evaluate(async () => {
    const db = await claude.use('db'); const out = {};
    out.ops = (await db.collection('ops/main/clients').get()).size + (await db.collection('portal').get()).size;
    try { await db.doc('public/site').set({ name: 'hacked' }); out.pub = 'wrote'; } catch (e) { out.pub = e.code; }
    try { await db.doc('portal/u-owner').set({ x: 1 }); out.other = 'wrote'; } catch (e) { out.other = e.code; }
    const me = await (await claude.use('user')).id(); const ref = db.doc('portal/' + me); const d = (await ref.get()).data();
    d.bookings[0].status = 'confirmed'; await ref.set(d); out.self = (await ref.get()).data().bookings[0].status;
    return out;
  });
  ok('client: sees only own portal', perm.ops <= 1, perm.ops);
  ok('client: cannot edit site / other accounts', perm.pub === 'invalid_argument' && perm.other === 'invalid_argument', JSON.stringify(perm));
  ok('client: cannot self-confirm booking', perm.self === 'pending', perm.self);
  const cAdmin = await api(C, 'GET', 'api/admin/settings');
  ok('client: admin API refused', cAdmin.status === 403, JSON.stringify(cAdmin));
  ok('client phone: no overflow', !(await overflow(C)));

  // ---------- 3. super admin (desktop) ----------
  // web edition keeps data in the browser, so the admin works in the same browser as the client
  const AC = MODE === 'web' ? CC : await newCtx(); const A = MODE === 'web' ? C : await page(AC, DESK);
  if (MODE === 'web') { await logout(A); await A.setViewportSize(DESK); }
  await login(A, ADMIN);
  ok('admin: super admin signs in with full app', (await A.textContent('.rail')).includes('المدير') && (await A.textContent('.rail')).includes('العملاء'), (await A.textContent('.rail')).slice(0, 200));
  await tab(A, 'approvals'); await A.waitForTimeout(600);
  ok('admin: sees client booking request', await A.isVisible('[data-act="confirmreq"]'));
  await A.click('[data-act="confirmreq"] >> nth=0'); await A.waitForTimeout(800);
  await tab(A, 'appts'); await A.waitForTimeout(400);
  ok('admin: confirmed request became appointment', (await A.textContent('.main')).includes('عميل سند'));
  await tab(A, 'chat'); await ask(A, 'ما ملخص يومي؟');
  ok('admin: assistant gives daily summary without Claude', (await A.textContent('.thread')).includes('ملخص اليوم'), (await A.textContent('.thread')).slice(-300));
  await A.screenshot({ path: `${shots}/06-admin-chat-desktop.png` });
  await tab(A, 'today'); await A.waitForTimeout(400);
  await A.screenshot({ path: `${shots}/07-admin-today-desktop.png` });
  ok('admin: no overflow desktop', !(await overflow(A)));

  // console
  await A.goto(B + '/admin.html'); await A.waitForSelector('#users tr');
  const ut = await A.textContent('#users');
  ok('console: super admin + default client listed', ut.includes('مدير شامل') && ut.includes('المدير العام') && ut.includes('عميل سند'), ut);
  ok('console: default-password warning shown', await A.isVisible('#pwwarn'));
  ok('console: built-in assistant mode shown', (await A.textContent('#aimode')).includes('المساعد المدمج'));
  ok('console: super can create admins', await A.locator('#opt-admin').evaluate(o => !o.hidden));
  await A.click('details summary'); await A.fill('#u-name', 'مشرف الحجوزات'); await A.fill('#u-phone', '5000 0002'); await A.fill('#u-email', 'Staff@Sanad.Local'); await A.fill('#u-pass', 'Staff@2026x'); await A.selectOption('#u-role', 'admin');
  await A.click('#f-user button[type=submit]'); await A.waitForTimeout(600);
  ok('console: staff admin added, phone unified', (await A.textContent('#users')).includes('staff@sanad.local') && (await A.textContent('#users')).includes('+974 5000 0002'), await A.textContent('#users'));
  await A.screenshot({ path: `${shots}/08-admin-console-desktop.png`, fullPage: true });
  const selfDel = await api(A, 'DELETE', 'api/admin/users/u-owner');
  ok('console: super admin cannot be deleted', selfDel.status >= 400, JSON.stringify(selfDel));

  // staff admin: limited
  const SC = MODE === 'web' ? AC : await newCtx(); const Sp = MODE === 'web' ? A : await page(SC, DESK);
  if (MODE === 'web') { await home(Sp); await logout(Sp); }
  await login(Sp, { login: 'staff@sanad.local', pass: 'Staff@2026x' });
  ok('staff admin: signs in as admin', (await Sp.textContent('.rail')).includes('المدير'));
  const s1 = await api(Sp, 'POST', 'api/admin/users', { name: 'x', email: 'x@sanad.local', password: '12345678', role: 'admin' });
  const s2 = await api(Sp, 'DELETE', 'api/admin/users/u-owner');
  ok('staff admin: cannot create admins or delete super admin', s1.status === 403 && s2.status === 403, JSON.stringify([s1, s2]));
  await Sp.goto(B + '/admin.html'); await Sp.waitForSelector('#users tr');
  ok('staff admin: admin role option hidden', await Sp.locator('#opt-admin').evaluate(o => o.hidden));
  if (MODE === 'web') { await home(Sp); await logout(Sp); await login(A, ADMIN); }
  await A.goto(B + '/admin.html'); await A.waitForSelector('#users tr');
  A.once('dialog', d => d.accept()); await A.click('[data-name="مشرف الحجوزات"]'); await A.waitForTimeout(500);
  ok('super admin: deletes staff admin', !(await A.textContent('#users')).includes('staff@sanad.local'));
  // password change
  await A.fill('#pw-cur', ADMIN.pass); await A.fill('#pw-new', 'Sanad@Admin2026!'); await A.click('#f-pw button[type=submit]'); await A.waitForTimeout(900);
  ok('password: changed, warning gone', (await A.textContent('#m-pw')).includes('تغيّرت') && !(await A.isVisible('#pwwarn')));
  await A.fill('#pw-cur', 'Sanad@Admin2026!'); await A.fill('#pw-new', ADMIN.pass); await A.click('#f-pw button[type=submit]'); await A.waitForTimeout(600);
  // phone admin
  const AP = await page(AC, { width: 390, height: 844 }); await AP.goto(B + '/admin.html'); await AP.waitForSelector('#users tr');
  ok('console phone: no overflow', !(await overflow(AP)));
  await AP.screenshot({ path: `${shots}/09-admin-console-phone.png` });
  await home(AP); await tab(AP, 'approvals'); await AP.waitForTimeout(300);
  ok('admin phone: no overflow', !(await overflow(AP)));
  await AP.screenshot({ path: `${shots}/10-admin-phone.png` });

  // client sees confirmation
  const C2 = MODE === 'web' ? A : C;
  if (MODE === 'web') { await home(C2); await logout(C2); await login(C2, CLIENT); }
  await tab(C2, 'mine');
  const seen = await C2.waitForFunction(() => document.querySelector('.main').textContent.includes('مؤكد'), null, { timeout: 6000 }).then(() => true, () => false);
  ok('client: sees booking confirmed by admin', seen, await C2.textContent('.main'));
  await C2.screenshot({ path: `${shots}/11-client-confirmed.png` });

  // ---------- 4. resilience ----------
  if (MODE === 'server' && !LIVE) {
    // Claude configured but unreachable: chat still answers
    const AK = await page(AC, DESK); await AK.goto(B + '/admin.html'); await AK.waitForSelector('#key');
    await AK.fill('#key', 'sk-ant-unreachable'); await AK.click('#f-ai button[type=submit]'); await AK.waitForTimeout(500);
    await home(AK); await tab(AK, 'chat'); await ask(AK, 'ما الخدمات؟');
    ok('fallback: Claude unreachable → built-in assistant answers', (await AK.textContent('.thread')).includes('تعذّر الوصول إلى Claude') && (await AK.textContent('.thread')).includes('استشارة أولية'), (await AK.textContent('.thread')).slice(-300));
    await stopServer(); await startServer();
    await home(AK);
    ok('restart: session + accounts persist', (await AK.textContent('.rail')).includes('المدير'));
    const creds = fs.readFileSync(path.join(DATA, 'default-accounts.txt'), 'utf8');
    ok('server: default-accounts.txt written', creds.includes(ADMIN.login) && creds.includes(CLIENT.login));
    ok('server: passwords hashed on disk', !fs.readFileSync(path.join(DATA, 'users.json'), 'utf8').includes(ADMIN.pass));
    const seedOff = fs.mkdtempSync('/tmp/sanad-ind-');
    const r = spawn(process.execPath, [path.join(APP, 'server.js')], { env: { ...process.env, PORT: 8794, SANAD_DATA: seedOff, SANAD_SEED: '0' }, stdio: 'ignore' });
    await new Promise(x => setTimeout(x, 900));
    const me = await (await fetch('http://localhost:8794/api/me')).json(); r.kill();
    ok('server: SANAD_SEED=0 restores private first-run setup', me.needsSetup === true);
  }
  if (MODE === 'web') {
    const offline = await page(VC, DESK); await home(offline);
    await VC.setOffline(true); await offline.reload().catch(() => {}); await offline.waitForTimeout(1200);
    const t = await offline.textContent('body').catch(() => '');
    ok('web: opens offline after first visit (PWA)', t.includes('سند'), t.slice(0, 100));
    await VC.setOffline(false);
  }
  const DC = await newCtx({ colorScheme: 'dark' }); const Dp = await page(DC, DESK); await home(Dp);
  await Dp.screenshot({ path: `${shots}/12-visitor-dark.png` });
  ok('zero requests to Claude / Anthropic from the browser', claudeCalls.length === 0, claudeCalls.join(' '));
  ok('no JS errors in any role', errors.length === 0, errors.join(' | '));

  console.log(results.map(r => r.join('  ')).join('\n'));
  const f = results.filter(r => r[0] === 'FAIL').length; console.log(`\n${results.length - f}/${results.length} passed`);
  await browser.close(); if (srv) await stopServer(); process.exit(f ? 1 : 0);
})().catch(async e => { console.error(e); console.log(results.map(r => r.join('  ')).join('\n')); try { srv && srv.kill(); } catch {} process.exit(2); });
