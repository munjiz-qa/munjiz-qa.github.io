/* سند | Sanad — يحفظ واجهة التطبيق ليفتح فوراً ويعمل عند ضعف الاتصال.
   البيانات والمحادثة تمر دائماً عبر الخادم (لا تُخزَّن هنا). */
const V = 'sanad-web-v1.1.0';
const SHELL = ['./', 'index.html', 'login.html', 'admin.html', 'ui.css', 'runtime.js', 'assistant.js', 'local-backend.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'offline.html'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || u.pathname.includes('/api/')) return;
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok && r.type === 'basic') { const copy = r.clone(); caches.open(V).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(async () => (await caches.match(e.request, { ignoreSearch: true })) || (e.request.mode === 'navigate' ? caches.match('offline.html') : Response.error())));
});
