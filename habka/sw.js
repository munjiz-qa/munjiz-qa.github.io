/* يتيح فتح حبكة دون اتصال بعد أول زيارة. الملفات تُجلب من الشبكة أولاً فتصل التحديثات فوراً، والنسخة المحفوظة احتياط عند انقطاع الاتصال فقط. البيانات من الخادم لا تُحفظ هنا. */
const CACHE = "habka-20261127", CORE = ["./", "index.html", "manifest.webmanifest", "assets/logo.svg", "assets/icon-192.png", "pwa-install.js"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("habka-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); } return res; })
    .catch(() => caches.match(r).then(m => m || (r.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
