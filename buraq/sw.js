// براق · عامل الخدمة: يجعل الموقع قابلاً للتثبيت كتطبيق ويفتح دون اتصال بعد أول زيارة.
// الشبكة أولاً للصفحات والسكربتات (لا تظهر نسخة قديمة وأنت متصل)، والنسخة المحفوظة عند انقطاع الإنترنت فقط.
// لا يلمس Firebase ولا واجهات الصرف والموقع الجغرافي إطلاقاً.
const CACHE = 'buraq-v20261103a';
const CORE = ['./', 'index.html', 'account.html', 'admin.html', 'manifest.webmanifest',
  'app/icon.svg', 'app/icon-192.png', 'app/icon-512.png', 'app/maskable-512.png', 'app/apple-touch-icon.png', 'app/pwa.js?v=1',
  'ux/ux.css?v=3', 'ux/ux.js?v=3', 'acct/cur.js?v=2', 'acct/acct.css?v=2', 'acct/hook.js?v=4',
  'img/bq10_chassis_exploded.jpg', 'img/bq10_chassis_hero.jpg'];
const BASE = new URL('./', self.location).pathname;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('buraq-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
const stable = u => /^(fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net)$/.test(u.hostname) && (u.hostname !== 'cdn.jsdelivr.net' || u.pathname.startsWith('/npm/three@'));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  const mine = u.origin === self.location.origin && u.pathname.startsWith(BASE);
  if (!mine && !stable(u)) return;            // Firebase وواجهات الصرف تمر مباشرة دون أي تخزين
  if (stable(u) || (mine && /\/(img|app)\//.test(u.pathname))) {   // ملفات ثابتة: المحفوظ أولاً ثم تحديث في الخلفية
    e.respondWith(caches.open(CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()).catch(() => {}); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      const r = await fetch(req);
      if (r && r.ok && !/\/files\//.test(u.pathname)) c.put(req, r.clone()).catch(() => {});
      return r;
    } catch (err) {
      const hit = await c.match(req) || (req.mode === 'navigate' ? await c.match(u.pathname.endsWith('account.html') ? 'account.html' : u.pathname.endsWith('admin.html') ? 'admin.html' : 'index.html') : null);
      if (hit) return hit;
      throw err;
    }
  })());
});
