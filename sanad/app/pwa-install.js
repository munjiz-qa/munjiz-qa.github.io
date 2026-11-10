/* زر «ثبّت التطبيق» بضغطة واحدة، وتجهيز التطبيق للعمل دون إنترنت بعد تثبيته.
   ملف مستقل لكل منصة: يقرأ اسمها وأيقونتها ولونها من ملف manifest الخاص بها، ولا يتصل بأي جهة خارجية.
   - أندرويد وكروم وإيدج على الكمبيوتر: ضغطة واحدة تفتح نافذة التثبيت الأصلية.
   - آيفون وآيباد: دليل قصير (مشاركة ← إضافة إلى الشاشة الرئيسية).
   - يختفي الزر بعد التثبيت أو عند فتح التطبيق من أيقونته. */
(() => {
  'use strict';
  if (window.__pwaInstall || location.protocol === 'file:' || window.top !== window.self) return;
  window.__pwaInstall = true;
  const me = document.currentScript, base = new URL('./', me ? me.src : location.href);
  const key = 'pwi:' + base.pathname;
  const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(key + ':' + k); v === null ? localStorage.removeItem(key + ':' + k) : localStorage.setItem(key + ':' + k, v); } catch (e) { return null; } };
  const mm = q => { try { return matchMedia(q).matches; } catch (e) { return false; } };
  const standalone = () => mm('(display-mode: standalone)') || mm('(display-mode: fullscreen)') || mm('(display-mode: minimal-ui)') || mm('(display-mode: window-controls-overlay)') || navigator.standalone === true || document.referrer.startsWith('android-app://');
  const en = /^en/i.test(document.documentElement.lang || '');
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), android = /Android/.test(ua);
  const iosOther = ios && /CriOS|FxiOS|EdgiOS|GSA\//.test(ua), safariMac = !ios && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua), firefox = /Firefox/.test(ua) && !ios;
  let evt = null, man = {}, name = document.title.split(/[|·—-]/)[0].trim(), icon = '', color = '';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const T = en ? {
    install: 'Install', app: 'Install app', on: n => `Install ${n} on your phone`, sub: 'One tap · works offline', hide: 'Hide', close: 'Close',
    head: n => `Install ${n} on your device`, lead: 'An icon on your screen opens the app directly in its own window, and it keeps working offline after installing. Free, no store needed.',
    iosH: 'On iPhone and iPad (Safari)', ios: n => ['Tap the Share button <b>⬆︎</b> at the bottom or top of the screen.', 'Choose <b>“Add to Home Screen”</b>.', `Tap <b>“Add”</b>, and the ${esc(n)} icon appears with your apps.`],
    andH: 'On Android (Chrome or Samsung)', and: n => ['Open the browser menu <b>⋮</b> at the top.', 'Choose <b>“Install app”</b> or <b>“Add to Home screen”</b>.', `Tap <b>“Install”</b>, and the ${esc(n)} icon appears with your apps.`],
    pcH: 'On a computer (Chrome or Edge)', pc: n => ['Click the install icon <b>⊕</b> at the end of the address bar, or open the menu <b>⋮</b>.', `Choose <b>“Install ${esc(n)}”</b> (in Edge: Apps → Install this site as an app).`, 'It opens in its own window, with an icon on your desktop and in your apps list.'],
    macH: 'On Mac (Safari)', mac: n => ['From the <b>File</b> menu choose <b>“Add to Dock”</b>.', `Click <b>“Add”</b>, and the ${esc(n)} icon appears in the Dock.`],
    more: 'Other devices', iosNote: 'On iPhone, installing is done from Safari. Copy the link, open it in Safari, then follow the steps.', ffNote: 'Firefox does not install apps on computers. Open this page in Chrome or Edge, then tap Install.',
    done: n => `${n} is installed; you will find it among your apps`, ready: n => `${n} is now ready to work offline`, prep: (n, p) => `Preparing ${n} for offline use… ${p}%`
  } : {
    install: 'تثبيت', app: 'ثبّت التطبيق', on: n => `ثبّت ${n} على جوالك`, sub: 'بضغطة واحدة · يعمل دون إنترنت', hide: 'إخفاء', close: 'إغلاق',
    head: n => `ثبّت ${n} على جهازك`, lead: 'أيقونة على الشاشة تفتح التطبيق مباشرة في نافذته الخاصة، ويعمل دون إنترنت بعد التثبيت. التثبيت مجاني ولا يحتاج إلى متجر.',
    iosH: 'على آيفون وآيباد (سفاري)', ios: n => ['اضغط زر المشاركة <b>⬆︎</b> أسفل الشاشة أو أعلاها.', 'اختر <b>«إضافة إلى الشاشة الرئيسية»</b>.', `اضغط <b>«إضافة»</b>، فتظهر أيقونة ${esc(n)} بين تطبيقاتك.`],
    andH: 'على أندرويد (كروم أو سامسونج)', and: n => ['افتح قائمة المتصفح <b>⋮</b> أعلى الشاشة.', 'اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>.', `اضغط <b>«تثبيت»</b>، فتظهر أيقونة ${esc(n)} بين تطبيقاتك.`],
    pcH: 'على الكمبيوتر (كروم أو إيدج)', pc: n => ['اضغط أيقونة التثبيت <b>⊕</b> في نهاية شريط العنوان، أو افتح القائمة <b>⋮</b>.', `اختر <b>«تثبيت ${esc(n)}»</b>، وفي إيدج: التطبيقات ← تثبيت هذا الموقع كتطبيق.`, 'يفتح التطبيق في نافذته الخاصة، وتجد أيقونته على سطح المكتب وفي قائمة البرامج.'],
    macH: 'على ماك (سفاري)', mac: n => ['من قائمة <b>«ملف»</b> اختر <b>«إضافة إلى Dock»</b>.', `اضغط <b>«إضافة»</b>، فتظهر أيقونة ${esc(n)} في شريط Dock.`],
    more: 'طريقة التثبيت على الأجهزة الأخرى', iosNote: 'على آيفون يتم التثبيت من متصفح سفاري. انسخ الرابط وافتحه في سفاري، ثم اتبع الخطوات.', ffNote: 'متصفح فايرفوكس لا يدعم تثبيت التطبيقات على الكمبيوتر. افتح الصفحة في كروم أو إيدج ثم اضغط «تثبيت».',
    done: n => `ثُبّت ${n} على جهازك، وتجده بين تطبيقاتك`, ready: n => `${n} جاهز الآن للعمل دون إنترنت`, prep: (n, p) => `تجهيز ${n} للعمل دون إنترنت… ${p.toLocaleString('ar-EG')}٪`
  };
  const css = `
.pwi-bar{display:none;background:var(--pwi-c);color:#fff;font:inherit;direction:inherit;position:relative;z-index:2147483000;box-shadow:0 2px 10px rgba(0,0,0,.18)}
.pwi-bar.pwi-fix{position:fixed;inset-inline:10px;bottom:calc(12px + env(safe-area-inset-bottom,0px));border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.3)}
.pwi-bar .pwi-in{display:flex;align-items:center;gap:10px;padding:9px 12px;max-width:980px;margin:auto}
.pwi-bar img{width:40px;height:40px;border-radius:10px;flex:none;background:rgba(255,255,255,.15);object-fit:contain}
.pwi-bar .pwi-t{flex:1;min-width:0;display:flex;flex-direction:column;line-height:1.35}
.pwi-bar .pwi-t b{font-size:.95rem;font-weight:700}.pwi-bar .pwi-t small{font-size:.78rem;opacity:.9}
.pwi-go{flex:none;font:inherit;font-weight:700;font-size:.95rem;border:0;border-radius:10px;padding:8px 18px;background:#fff;color:var(--pwi-c);cursor:pointer;min-height:40px}
.pwi-x{flex:none;font:inherit;font-size:1.4rem;line-height:1;background:none;border:0;color:inherit;opacity:.85;cursor:pointer;padding:4px 6px;min-width:32px;min-height:40px}
.pwi-pill{position:fixed;z-index:2147483000;inset-inline-end:18px;bottom:18px;display:none;align-items:center;gap:8px;font:inherit;font-weight:700;font-size:.95rem;border:0;border-radius:999px;padding:11px 18px 11px 14px;background:var(--pwi-c);color:#fff;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.pwi-pill svg,.pwi-go svg{width:20px;height:20px;flex:none}
@media (max-width:760px){.pwi-on .pwi-bar{display:block}}
@media (min-width:761px){.pwi-on .pwi-pill{display:inline-flex}}
.pwi-sheet{position:fixed;inset:0;z-index:2147483001;background:rgba(10,14,20,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px}
@media (min-width:761px){.pwi-sheet{align-items:center}}
.pwi-card{background:#fff;color:#1a1d24;border-radius:18px;max-width:480px;width:100%;max-height:88vh;overflow:auto;padding:20px;line-height:1.75;font:inherit;box-shadow:0 20px 50px rgba(0,0,0,.35)}
.pwi-card .pwi-h{display:flex;gap:12px;align-items:center;margin-bottom:6px}.pwi-card .pwi-h img{width:56px;height:56px;border-radius:14px;flex:none}
.pwi-card h2{font-size:1.15rem;margin:0}.pwi-card h3{font-size:1rem;margin:12px 0 4px}.pwi-card p{margin:0;color:#4a5160;font-size:.9rem}
.pwi-card ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.pwi-card li{display:flex;gap:10px;align-items:flex-start}.pwi-card li>span:first-child{flex:none;width:26px;height:26px;border-radius:50%;display:grid;place-items:center;background:var(--pwi-c);color:#fff;font-weight:700;font-size:.85rem}
.pwi-card details{margin-top:10px}.pwi-card summary{cursor:pointer;color:#4a5160}
.pwi-card .pwi-note{background:#fff4dd;border-radius:10px;padding:8px 12px;margin:8px 0;color:#5a4410}
.pwi-card .pwi-close{display:block;width:100%;margin-top:14px;font:inherit;font-weight:700;border:0;border-radius:12px;min-height:46px;background:var(--pwi-c);color:#fff;cursor:pointer}
.pwi-toast{position:fixed;z-index:2147483002;left:50%;transform:translateX(-50%);bottom:calc(20px + env(safe-area-inset-bottom,0px));background:#1a1d24;color:#fff;border-radius:999px;padding:9px 18px;font:inherit;font-size:.88rem;box-shadow:0 8px 24px rgba(0,0,0,.3);max-width:92vw;text-align:center}`;
  const ico = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7v7.5"/><path d="M9 11.8l3 3 3-3"/><path d="M10.5 18.5h3"/></svg>';
  let bar, pill, toastEl, tt;
  const toast = (m, ms = 3200) => { if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'pwi-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); } toastEl.textContent = m; toastEl.hidden = false; clearTimeout(tt); if (ms) tt = setTimeout(() => toastEl.hidden = true, ms); };
  const hiddenNow = () => standalone() || (!evt && ls('installed') === '1');
  function render() {
    const on = !hiddenNow();
    document.documentElement.classList.toggle('pwi-on', on);
    if (bar) bar.hidden = !on || Date.now() < +(ls('snooze') || 0);
  }
  function mount() {
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    document.documentElement.style.setProperty('--pwi-c', color || '#1f3a5f');
    bar = document.createElement('div'); bar.className = 'pwi-bar'; bar.setAttribute('role', 'region'); bar.setAttribute('aria-label', T.app);
    bar.innerHTML = `<div class="pwi-in">${icon ? `<img src="${esc(icon)}" alt="">` : ''}<span class="pwi-t"><b>${esc(T.on(name))}</b><small>${esc(T.sub)}</small></span><button type="button" class="pwi-go">${esc(T.install)}</button><button type="button" class="pwi-x" aria-label="${esc(T.hide)}">×</button></div>`;
    document.body.insertBefore(bar, document.body.firstChild);
    bar.querySelector('.pwi-go').onclick = install;
    bar.querySelector('.pwi-x').onclick = () => { ls('snooze', String(Date.now() + 3 * 864e5)); bar.hidden = true; };
    pill = document.createElement('button'); pill.type = 'button'; pill.className = 'pwi-pill'; pill.innerHTML = ico + esc(T.app); pill.title = T.head(name); pill.onclick = install;
    document.body.appendChild(pill);
    render();
    // إن غطّى رأسُ الصفحة الثابت الشريطَ يُعرض الشريط عائماً أسفل الشاشة حتى يبقى ظاهراً
    requestAnimationFrame(() => setTimeout(() => {
      if (!bar || bar.hidden || !bar.offsetHeight) return; const r = bar.getBoundingClientRect(), el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (el && !bar.contains(el)) bar.classList.add('pwi-fix');
    }, 400));
  }
  function guide() {
    const step = (a) => `<ol>${a.map((t, i) => `<li><span>${(i + 1).toLocaleString(en ? 'en' : 'ar-EG')}</span><span>${t}</span></li>`).join('')}</ol>`;
    const S = { ios: `<h3>${T.iosH}</h3>${step(T.ios(name))}`, and: `<h3>${T.andH}</h3>${step(T.and(name))}`, pc: `<h3>${T.pcH}</h3>${step(T.pc(name))}`, mac: `<h3>${T.macH}</h3>${step(T.mac(name))}` };
    const first = ios ? 'ios' : android ? 'and' : safariMac ? 'mac' : 'pc';
    const m = document.createElement('div'); m.className = 'pwi-sheet'; m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true'); m.setAttribute('aria-label', T.head(name));
    m.innerHTML = `<div class="pwi-card"><div class="pwi-h">${icon ? `<img src="${esc(icon)}" alt="">` : ''}<div><h2>${esc(T.head(name))}</h2><p>${T.lead}</p></div></div>
      ${iosOther ? `<p class="pwi-note">${T.iosNote}</p>` : ''}${firefox ? `<p class="pwi-note">${T.ffNote}</p>` : ''}
      ${S[first]}<details><summary>${T.more}</summary>${Object.keys(S).filter(k => k !== first).map(k => S[k]).join('')}</details>
      <button type="button" class="pwi-close">${T.close}</button></div>`;
    document.body.appendChild(m);
    const close = () => m.remove(); m.addEventListener('click', e => { if (e.target === m) close(); }); m.querySelector('.pwi-close').onclick = close;
    addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); removeEventListener('keydown', k); } });
    m.querySelector('.pwi-close').focus();
  }
  async function install() {
    if (evt) { const e = evt; e.prompt(); const r = await e.userChoice.catch(() => null); if (r && r.outcome === 'accepted') { evt = null; ls('installed', '1'); render(); warm(); } return; }
    guide();
  }
  /* تجهيز العمل دون إنترنت: تُطلب كل ملفات المنصة المستخدمة في هذه الصفحة عبر عامل الخدمة الخاص بها فيحفظها على الجهاز */
  async function warm(quiet) {
    if (!('serviceWorker' in navigator) || !window.caches || warm.busy) return; warm.busy = true;
    try { await navigator.storage?.persist?.(); } catch (e) {}
    try { await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(r, 8000))]); } catch (e) {}
    const inScope = u => { try { const x = new URL(u, location.href); return x.origin === location.origin && x.pathname.startsWith(base.pathname) && !/\/(api|server)\//.test(x.pathname); } catch (e) { return false; } };
    const extra = (me?.dataset.precache || '').split(/[\s,]+/).filter(Boolean);
    const urls = new Set([base.href, location.href.split('#')[0], ...extra.map(x => new URL(x, base).href)]);
    try { performance.getEntriesByType('resource').forEach(r => { if (inScope(r.name) && !/[?&](t|ts|_)=\d{9,}/.test(r.name)) urls.add(r.name.split('#')[0]); }); } catch (e) {}
    (man.icons || []).forEach(i => i.src && urls.add(new URL(i.src, base).href));
    document.querySelectorAll('a[href]').forEach(a => { const h = a.getAttribute('href'); if (/^[^:?#]+\.html$/.test(h) && inScope(a.href) && new URL(a.href).pathname.lastIndexOf('/') === base.pathname.length - 1) urls.add(a.href.split('#')[0]); });
    document.querySelectorAll('link[rel=manifest],link[rel~=icon],link[rel=apple-touch-icon]').forEach(l => inScope(l.href) && urls.add(l.href));
    const list = [...urls].filter(inScope); let done = 0, fail = 0;
    const worker = async () => { while (list.length) { const u = list.shift(); try { const r = await fetch(u, { credentials: 'same-origin' }); if (!r.ok) fail++; } catch (e) { fail++; } done++; if (!quiet && done % 3 === 0) toast(T.prep(name, Math.round(done / urls.size * 100)), 0); } };
    await Promise.all([worker(), worker(), worker()]);
    if (!fail) { ls('warm', String(Date.now())); if (!quiet) toast(T.ready(name)); } else if (toastEl) toastEl.hidden = true;
    warm.busy = false;
  }
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); evt = e; ls('installed', null); render(); });
  addEventListener('appinstalled', () => { evt = null; ls('installed', '1'); render(); toast(T.done(name)); setTimeout(() => warm(), 1200); });
  async function start() {
    const ml = document.querySelector('link[rel=manifest]');
    if (ml) { try { man = await (await fetch(ml.href)).json(); } catch (e) {} }
    name = man.short_name || man.name || name;
    const ic = (man.icons || []).filter(i => i.src && !/maskable/.test(i.purpose || '')).sort((a, b) => (parseInt(b.sizes) || 0) - (parseInt(a.sizes) || 0));
    const i192 = ic.find(i => parseInt(i.sizes) <= 256) || ic[0];
    icon = i192 ? new URL(i192.src, ml ? ml.href : base).href : (document.querySelector('link[rel=apple-touch-icon],link[rel~=icon]')?.href || '');
    color = man.theme_color || document.querySelector('meta[name=theme-color]')?.content || '';
    if (/^#?(fff|ffffff|fafafa|f8f8f8)$/i.test(color.replace('#', '')) || /^#f[0-9a-f]{5}$/i.test(color)) color = man.background_color && !/^#f/i.test(man.background_color) ? man.background_color : '#1f3a5f';
    mount();
    // عند الفتح من الأيقونة أو بعد التثبيت: تحديث النسخة المحفوظة مرة يومياً بهدوء
    if ((standalone() || ls('installed') === '1') && navigator.onLine !== false && Date.now() - +(ls('warm') || 0) > 864e5) setTimeout(() => warm(!!ls('warm')), 2500);
  }
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
