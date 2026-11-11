// منجز: عامل الخدمة لتطبيق الكمبيوتر والجوال.
// يخدم صفحات منجز وحدها (الجذر و/en/ و/assets/ و/data/)، ولا يلمس التطبيقات الأخرى في المجلدات الفرعية.
// الشبكة أولاً دائماً، والنسخة المحفوظة تُستخدم فقط عند انقطاع الإنترنت، فلا تظهر نسخة قديمة أبداً وأنت متصل.
const CACHE = 'munjiz-v20261112';
const CORE = ['./', 'index.html', 'portal.html', 'crm.html', 'about.html', 'legal.html', 'privacy.html', 'contract.html', 'desktop.html',
  'en/index.html', 'en/portal.html', 'en/about.html', 'en/legal.html', 'en/privacy.html', 'en/desktop.html',
  'manifest.webmanifest', 'crm.webmanifest', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/stamp.svg', 'assets/seal.svg', 'pwa-install.js'];
const BASE = new URL('./', self.location).pathname;
function mine(url) {
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return false;
  const p = url.pathname.slice(BASE.length);
  return p === '' || /^[^/]+\.(html|webmanifest|js|png|svg)$/.test(p) || /^(en|assets|data)\//.test(p);
}
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('munjiz-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!font && !mine(url)) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await c.match(url.pathname.includes('/en/') ? 'en/index.html' : 'index.html')) || Response.error();
      return Response.error();
    }
  })());
});
