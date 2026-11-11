// Site health: runs every hour from .github/workflows/site-health.yml on GitHub's servers, so the check never depends on
// anyone's computer or chat session. It confirms the site works on its own: the public pages, «حسابي» and the admin panel
// load, the published settings point to the client-system server, and that server answers.
// When run by hand or on a pull request it also checks that the first-time admin login 123/123 no longer works.
// Any problem opens an issue labelled «security-alert» assigned to the owner (GitHub emails it at once) plus a Telegram
// message, and the issue closes itself when the problem clears.
import { readFileSync, existsSync, appendFileSync } from 'node:fs';

const env = process.env;
const REPO = env.GITHUB_REPOSITORY, TOKEN = env.GITHUB_TOKEN;
const SITE = String(env.SITE_URL || '').replace(/\/?$/, '/');
const OWNER = env.OWNER_LOGIN || 'baseeratactions';
const TELEGRAM = env.ALERT_TELEGRAM || '';
const CHECK_DEFAULT_ADMIN = env.CHECK_DEFAULT_ADMIN === 'true';
const LABEL = 'security-alert';
const PAGES = ['', 'portal.html', 'crm.html', 'en/'].filter(p => existsSync(p ? (p.endsWith('/') ? p + 'index.html' : p) : 'index.html'));

const findings = [], passed = [];
const add = f => findings.push(f), ok = s => passed.push(s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const doha = d => new Date(d).toLocaleString('sv-SE', { timeZone: 'Asia/Qatar', hour12: false }).slice(0, 16);
const apiOf = text => (String(text).match(/API:\s*["']([^"']*)["']/) || [])[1] || '';

async function get(url, opts = {}) {
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'cache-control': 'no-cache' }, ...opts });
    return { status: res.status, body: await res.text() };
  } catch (err) { return { status: 0, body: String(err) }; }
}
// pages and the server get a second chance 30 seconds later, so a passing hiccup never raises an alert
async function retry(fn) { let r = await fn(); if (!r.good) { await sleep(30000); r = await fn(); } return r; }
const api = (url, body) => get(url, { method: 'POST', headers: { 'content-type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body) });
const parse = s => { try { return JSON.parse(s); } catch { return null; } };

async function checkPages() {
  for (const p of PAGES) {
    const r = await retry(async () => { const x = await get(SITE + p + '?h=' + Date.now()); return { ...x, good: x.status === 200 && /<html/i.test(x.body) }; });
    if (r.good) ok('الصفحة تعمل: /' + p);
    else add({ level: p ? 'medium' : 'high', key: 'health:page:' + p, title: 'صفحة لا تعمل: /' + p, detail: 'الرابط ' + SITE + p + ' أعاد الرمز ' + (r.status || 'لا استجابة') + ' في محاولتين بينهما 30 ثانية.' });
  }
}

async function checkServer() {
  const repoApi = apiOf(readFileSync('assets/config.js', 'utf8'));
  const live = await retry(async () => { const x = await get(SITE + 'assets/config.js?h=' + Date.now()); return { ...x, good: x.status === 200 }; });
  const liveApi = live.good ? apiOf(live.body) : '';
  if (!repoApi) { ok('الموقع يعمل بلا خادم (رابط الخادم فارغ في الإعدادات)'); return; }
  if (live.good && liveApi !== repoApi)
    add({ level: 'high', key: 'health:api-mismatch', title: 'رابط الخادم في الموقع المنشور يختلف عن المستودع',
      detail: 'المنشور: ' + (liveApi || 'فارغ') + '\nالمستودع: ' + repoApi + '\nإن لم يكن التغيير منك فقد يُرسل الموقع بيانات العملاء إلى خادم غريب.' });
  else ok('الموقع المنشور يشير إلى خادم نظام العملاء نفسه الموجود في المستودع');

  const ping = await retry(async () => { const x = await get(repoApi); const j = parse(x.body); return { ...x, j, good: !!(j && j.ok) }; });
  if (ping.good) ok('خادم نظام العملاء يعمل (' + (ping.j.service || 'ok') + ')');
  else add({ level: 'high', key: 'health:server', title: 'خادم نظام العملاء لا يرد',
    detail: 'الرابط ' + repoApi + ' أعاد الرمز ' + (ping.status || 'لا استجابة') + ' بدل رد JSON سليم في محاولتين.\nالأثر: لا يستطيع العملاء الدخول إلى «حسابي» ولا تصل الطلبات إلى لوحة الإدارة.\nالسبب الأرجح: حُذف النشر (Deployment) في Apps Script أو تغيّر صاحب الصلاحية.' });
  if (!ping.good) return;

  // a public read the website makes on every visit
  const pub = await retry(async () => { const x = await api(repoApi, { action: 'site' }); const j = parse(x.body); return { ...x, good: !!(j && j.ok) }; });
  if (pub.good) ok('الخادم يخدم الزوار (نصوص الموقع)');
  else add({ level: 'medium', key: 'health:server-public', title: 'الخادم لا يجيب طلبات الزوار', detail: 'طلب «site» أعاد: ' + String(pub.body).slice(0, 200) });

  // the account pages refuse a visitor with no session
  const deny = await api(repoApi, { action: 'list' });
  const dj = parse(deny.body);
  if (dj && dj.ok === false && dj.error === 'auth') ok('لوحة الإدارة ترفض الزائر بلا تسجيل دخول');
  else add({ level: 'high', key: 'health:server-open', title: 'الخادم يعطي بيانات العملاء بلا تسجيل دخول', detail: 'طلب «list» بلا رمز جلسة أعاد: ' + String(deny.body).slice(0, 200) });

  if (CHECK_DEFAULT_ADMIN) {
    const d = parse((await api(repoApi, { action: 'login', username: '123', password: '123' })).body);
    if (d && d.ok) add({ level: 'high', key: 'health:default-admin', title: 'دخول الإدارة الافتراضي 123/123 ما زال يعمل',
      detail: 'أي شخص يدخل بـ 123/123 يختار بيانات المدير ويتحكم في النظام كله. ادخل الآن من لوحة الإدارة بـ 123/123 وغيّر اسم المستخدم وكلمة المرور.' });
    else ok('دخول الإدارة الافتراضي 123/123 معطّل');
  }
}

async function gh(path, opts = {}) {
  const res = await fetch('https://api.github.com' + path, { ...opts, headers: { authorization: 'Bearer ' + TOKEN, accept: 'application/vnd.github+json', 'content-type': 'application/json', ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(path + ' ' + res.status + ' ' + (await res.text()).slice(0, 200));
  return res.status === 204 ? null : res.json();
}
async function telegram(text) {
  if (!/^@?[A-Za-z0-9_]{3,40}$/.test(TELEGRAM)) return;
  const user = TELEGRAM.startsWith('@') ? TELEGRAM : '@' + TELEGRAM;
  try { await fetch('https://api.callmebot.com/text.php?user=' + encodeURIComponent(user) + '&text=' + encodeURIComponent(text.slice(0, 700))); } catch {}
}
async function report() {
  if (!TOKEN || env.GITHUB_EVENT_NAME === 'pull_request') return;   // a pull request only shows the result in its check
  try { await gh(`/repos/${REPO}/labels`, { method: 'POST', body: JSON.stringify({ name: LABEL, color: 'b60205', description: 'تنبيه أمني آلي' }) }); } catch {}
  const open = await gh(`/repos/${REPO}/issues?labels=${LABEL}&state=open&per_page=100`);
  const keyOf = i => (String(i.body || '').match(/<!-- sw:(.+?) -->/) || [])[1];
  const now = doha(Date.now());
  for (const f of findings) {
    if (open.some(i => keyOf(i) === f.key)) continue;
    const icon = f.level === 'high' ? '🚨' : '⚠️';
    const body = `<!-- sw:${f.key} -->\n**${icon} ${f.level === 'high' ? 'خطورة عالية' : 'خطورة متوسطة'}**\n\n**ما حدث:** ${f.title}\n\n${f.detail.replace(/\n/g, '  \n')}\n\n**الوقت (الدوحة):** ${now}\n\n` +
      `**ما فعله النظام:** سجّل المشكلة وأرسل هذا التنبيه${f.level === 'high' ? ' مع رسالة Telegram فورية' : ''}، وسيغلقه تلقائياً عند عودة الوضع طبيعياً.\n\n` +
      `[سجل الفحص](${env.GITHUB_SERVER_URL}/${REPO}/actions/runs/${env.GITHUB_RUN_ID})`;
    const issue = await gh(`/repos/${REPO}/issues`, { method: 'POST', body: JSON.stringify({ title: `${icon} تنبيه: ${f.title}`, body, labels: [LABEL] }) });
    try { await gh(`/repos/${REPO}/issues/${issue.number}/assignees`, { method: 'POST', body: JSON.stringify({ assignees: [OWNER] }) }); } catch {}
    if (f.level === 'high') await telegram(`🚨 ${REPO}: ${f.title}\n${f.detail.split('\n')[0]}\n${now}\n${issue.html_url}`);
  }
  for (const i of open) {
    const k = keyOf(i);
    // the 123/123 check runs only by hand, so its alert is never closed by an hourly run that skipped it
    if (!k || !k.startsWith('health:') || findings.some(f => f.key === k) || (k === 'health:default-admin' && !CHECK_DEFAULT_ADMIN)) continue;
    await gh(`/repos/${REPO}/issues/${i.number}/comments`, { method: 'POST', body: JSON.stringify({ body: '✅ عاد الوضع طبيعياً في ' + now + '، وأُغلق التنبيه تلقائياً.' }) });
    await gh(`/repos/${REPO}/issues/${i.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'completed' }) });
  }
}

await checkPages();
await checkServer();
await report();
const lines = [...findings.map(f => `- ${f.level === 'high' ? '🚨' : '⚠️'} ${f.title}`), ...passed.map(s => '- ✅ ' + s)].join('\n');
if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `## فحص عمل الموقع ${doha(Date.now())}\n\n${lines}\n`);
console.log(lines);
if (findings.some(f => f.level === 'high')) process.exitCode = 1;
