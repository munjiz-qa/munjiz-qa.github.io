// معلم Teacher: عامل الخدمة لتثبيت المنصة على الجوال والكمبيوتر والعمل دون إنترنت.
// يخدم ملفات /teacher/ وحدها. الشبكة أولاً دائماً، والنسخة المحفوظة تُستخدم فقط عند انقطاع الإنترنت.
const CACHE = 'teacher-v20261106';
const CORE = ['./', 'index.html', 'config.js', 'local.js', 'favicon.svg', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'pwa-install.js'];
const BASE = new URL('./', self.location).pathname;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('teacher-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const font = /^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!font && (url.origin !== self.location.origin || !url.pathname.startsWith(BASE))) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const res = await fetch(req);
      if (res && (res.ok || res.type === 'opaque')) c.put(req, res.clone()).catch(() => {});
      return res;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await c.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
