// Security watch: runs every hour from .github/workflows/security-watch.yml.
// It checks that the published site is up and matches this repository (catches defacement or a stuck deploy),
// that every recent commit on the main branch comes from a known account, and that no secret key was committed.
// Any problem opens an issue labelled «security-alert» assigned to the owner (GitHub emails it at once)
// and, for high-risk problems, sends an instant Telegram message through CallMeBot.
import { execSync } from 'node:child_process';
import { readFileSync, appendFileSync, statSync } from 'node:fs';

const env = process.env;
const REPO = env.GITHUB_REPOSITORY, TOKEN = env.GITHUB_TOKEN;
const SITE = String(env.SITE_URL || '').replace(/\/?$/, '/');
const OWNER = env.OWNER_LOGIN || 'baseeratactions';
const TELEGRAM = env.ALERT_TELEGRAM || '';
const WINDOW_MIN = Number(env.WINDOW_MIN || 70);
const LABEL = 'security-alert';
// accounts allowed to change the main branch: the owner, Claude, the site's own data bots and GitHub's web editor
const ALLOWED = new Set(['aboelezz2005@gmail.com', 'baseeratactions@users.noreply.github.com', 'noreply@anthropic.com',
  'actions@users.noreply.github.com', 'noreply@github.com', '41898282+github-actions[bot]@users.noreply.github.com',
  ...String(env.ALLOWED_EMAILS || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)]);
const SECRETS = [
  [/ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}/, 'مفتاح GitHub'],
  [/AKIA[0-9A-Z]{16}/, 'مفتاح AWS'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'مفتاح خاص (Private key)'],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, 'مفتاح Slack'],
  [/sk-ant-[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{40,}/, 'مفتاح ذكاء اصطناعي'],
  [/sk_live_[A-Za-z0-9]{16,}/, 'مفتاح دفع Stripe'],
  [/AIza[0-9A-Za-z_-]{35}/, 'مفتاح Google API'],
];

const findings = [];   // {level: 'high'|'medium', key, title, detail, recoverable}
const add = f => findings.push(f);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// one date format everywhere: 2026-10-19 10:55 (Doha time)
const doha = d => new Date(d).toLocaleString('sv-SE', { timeZone: 'Asia/Qatar', hour12: false }).slice(0, 16);

async function gh(path, opts = {}) {
  const res = await fetch('https://api.github.com' + path, { ...opts, headers: { authorization: 'Bearer ' + TOKEN, accept: 'application/vnd.github+json', 'content-type': 'application/json', ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(path + ' ' + res.status + ' ' + (await res.text()).slice(0, 200));
  return res.status === 204 ? null : res.json();
}
const git = cmd => execSync('git ' + cmd, { encoding: 'utf8', maxBuffer: 64 << 20 }).trim();

async function live(path) {
  try {
    const res = await fetch(SITE + path + '?sw=' + Date.now(), { headers: { 'cache-control': 'no-cache' }, redirect: 'follow' });
    return { status: res.status, body: res.ok ? await res.text() : '' };
  } catch (err) { return { status: 0, body: '' }; }
}
const norm = s => s.replace(/\r\n/g, '\n').trim();

// 1. the published site: up, and the same as the repository
async function checkSite() {
  if (!SITE.startsWith('https://')) return;
  const headAge = (Date.now() - Number(git('log -1 --format=%ct')) * 1000) / 60000;
  const files = git('ls-files').split('\n').filter(f => (/\.html$/.test(f) && f !== '404.html') || f === 'assets/config.js');
  for (const f of files) {
    const path = f === 'index.html' ? '' : f;
    let r = await live(path);
    if (r.status !== 200) { await sleep(30000); r = await live(path); }
    if (r.status !== 200) {
      add({ level: f === 'index.html' ? 'high' : 'medium', key: 'down:' + f, recoverable: true,
        title: (f === 'index.html' ? 'الموقع لا يعمل' : 'صفحة لا تعمل') + ': /' + path,
        detail: 'الرابط ' + SITE + path + ' أعاد الرمز ' + (r.status || 'لا استجابة') + ' في محاولتين بينهما 30 ثانية.' });
      continue;
    }
    if (headAge < 30) continue;   // GitHub Pages may still be publishing the latest commit
    const repoText = norm(readFileSync(f, 'utf8'));
    if (norm(r.body) === repoText) continue;
    await sleep(60000); r = await live(path);
    if (r.status === 200 && norm(r.body) !== repoText) {
      const extra = [...r.body.matchAll(/<script[^>]+src=["']([^"']+)/gi)].map(m => m[1]).filter(s => !repoText.includes(s));
      add({ level: 'high', key: 'diff:' + f, recoverable: true, title: 'المنشور يختلف عن المستودع: /' + path,
        detail: 'محتوى ' + SITE + path + ' لا يطابق الملف ' + f + ' في الفرع الرئيسي منذ أكثر من 30 دقيقة. السبب إما تعديل غير مصرح به على الموقع المنشور، وإما تعثر النشر على GitHub Pages.' +
          (extra.length ? '\nسكربتات في المنشور غير موجودة في المستودع: ' + extra.join('، ') : '') });
    }
  }
}

// 2. recent commits on the main branch must come from a known account
async function checkCommits() {
  const since = new Date(Date.now() - WINDOW_MIN * 60000).toISOString();
  const list = await gh(`/repos/${REPO}/commits?since=${since}&per_page=100`);
  for (const c of list) {
    const a = String(c.commit.author?.email || '').toLowerCase(), m = String(c.commit.committer?.email || '').toLowerCase();
    if (ALLOWED.has(a) && ALLOWED.has(m)) continue;
    add({ level: 'high', key: 'commit:' + c.sha, title: 'تعديل على الفرع الرئيسي من حساب غير معروف: ' + c.sha.slice(0, 7),
      detail: 'الكاتب: ' + (c.commit.author?.name || '') + ' <' + a + '>\nالناشر: ' + (c.commit.committer?.name || '') + ' <' + m + '>\nحساب GitHub: ' + (c.author?.login || 'غير مرتبط') +
        '\nالرسالة: ' + String(c.commit.message).split('\n')[0] + '\nالوقت: ' + doha(c.commit.committer?.date) + '\nالرابط: ' + c.html_url });
  }
}

// 3. no secret keys in the repository
function checkSecrets() {
  for (const f of git('ls-files').split('\n')) {
    if (!f || f === 'scripts/security-watch.mjs') continue;
    try { if (statSync(f).size > 2e6) continue; } catch { continue; }
    const t = readFileSync(f, 'utf8');
    for (const [re, name] of SECRETS) {
      const m = t.match(re);
      if (m) add({ level: 'high', key: 'secret:' + f + ':' + name, title: name + ' مكشوف في الملف ' + f,
        detail: 'وُجد ما يشبه ' + name + ' في ' + f + ' (يبدأ بـ ' + m[0].slice(0, 8) + '…). المستودع عام، فاعتبر المفتاح مكشوفاً: ألغه من مصدره وأنشئ بديلاً، ثم احذفه من الملف.' });
    }
  }
}

async function telegram(text) {
  if (!/^@?[A-Za-z0-9_]{3,40}$/.test(TELEGRAM)) return;
  const user = TELEGRAM.startsWith('@') ? TELEGRAM : '@' + TELEGRAM;
  try { await fetch('https://api.callmebot.com/text.php?user=' + encodeURIComponent(user) + '&text=' + encodeURIComponent(text.slice(0, 700))); } catch {}
}

async function report() {
  try { await gh(`/repos/${REPO}/labels`, { method: 'POST', body: JSON.stringify({ name: LABEL, color: 'b60205', description: 'تنبيه أمني آلي' }) }); } catch {}
  const open = await gh(`/repos/${REPO}/issues?labels=${LABEL}&state=open&per_page=100`);
  const keyOf = i => (String(i.body || '').match(/<!-- sw:(.+?) -->/) || [])[1];
  const now = doha(Date.now());
  for (const f of findings) {
    if (open.some(i => keyOf(i) === f.key)) continue;   // already reported and still open: no repeated alert
    const icon = f.level === 'high' ? '🚨' : '⚠️';
    const body = `<!-- sw:${f.key} -->\n**${icon} ${f.level === 'high' ? 'خطورة عالية' : 'خطورة متوسطة'}**\n\n**ما حدث:** ${f.title}\n\n${f.detail.replace(/\n/g, '  \n')}\n\n**الوقت (الدوحة):** ${now}\n\n` +
      `**ما فعله النظام:** سجّل الحدث وأرسل هذا التنبيه${f.level === 'high' ? ' مع رسالة Telegram فورية' : ''}${f.recoverable ? '، وسيغلق التنبيه تلقائياً عند عودة الوضع طبيعياً' : ''}.\n\n` +
      `**ما يلزمك:** ${f.key.startsWith('commit:') ? 'إن لم يكن التعديل منك أو بطلبك، غيّر كلمة مرور GitHub وفعّل التحقق بخطوتين، وراجع «Settings ← Collaborators» و«Deploy keys»، ثم ألغِ التعديل.' : f.key.startsWith('secret:') ? 'ألغِ المفتاح من مصدره فوراً.' : 'افتح الرابط وتأكد من الموقع. إن ظهر محتوى غريب، أخبر Claude في مشروع المراجعة الأمنية.'}\n\n` +
      `[سجل الفحص](${env.GITHUB_SERVER_URL}/${REPO}/actions/runs/${env.GITHUB_RUN_ID})`;
    const issue = await gh(`/repos/${REPO}/issues`, { method: 'POST', body: JSON.stringify({ title: `${icon} تنبيه أمني: ${f.title}`, body, labels: [LABEL] }) });
    try { await gh(`/repos/${REPO}/issues/${issue.number}/assignees`, { method: 'POST', body: JSON.stringify({ assignees: [OWNER] }) }); } catch {}
    if (f.level === 'high') await telegram(`🚨 ${REPO}: ${f.title}\n${f.detail.split('\n')[0]}\n${now}\n${issue.html_url}`);
  }
  // site problems that cleared on their own are closed with a note
  for (const i of open) {
    const k = keyOf(i);
    if (!k || !/^(down|diff):/.test(k) || findings.some(f => f.key === k)) continue;
    await gh(`/repos/${REPO}/issues/${i.number}/comments`, { method: 'POST', body: JSON.stringify({ body: '✅ عاد الوضع طبيعياً في ' + now + '، وأُغلق التنبيه تلقائياً.' }) });
    await gh(`/repos/${REPO}/issues/${i.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed', state_reason: 'completed' }) });
  }
}

await checkSite();
await checkCommits();
checkSecrets();
await report();
const lines = findings.length ? findings.map(f => `- ${f.level === 'high' ? '🚨' : '⚠️'} ${f.title}`).join('\n') : '- ✅ لا مشكلات: الموقع يعمل ويطابق المستودع، ولا تعديلات من حسابات غير معروفة، ولا مفاتيح مكشوفة.';
if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, `## الفحص الأمني ${doha(Date.now())}\n\n${lines}\n`);
console.log(lines);
if (findings.some(f => f.level === 'high')) process.exitCode = 1;
