/* يتيح فتح مرقب دون اتصال بعد أول زيارة، ويحدّث الملفات تلقائياً */
const CACHE = "marqab-202610290725", CORE = ["./", "index.html", "manifest.webmanifest", "assets/icon.svg", "assets/icon-192.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.hostname.endsWith("script.google.com") || u.hostname.endsWith("googleusercontent.com")) return;
  const same = u.origin === location.origin;
  if (same && (r.mode === "navigate" || u.pathname.endsWith("config.js"))) {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); return res; }).catch(() => caches.match(r).then(m => m || caches.match("index.html"))));
    return;
  }
  e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => { if (res.ok && (same || /cdnjs|jsdelivr|fonts\.(googleapis|gstatic)/.test(u.hostname))) { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); } return res; })));
});
