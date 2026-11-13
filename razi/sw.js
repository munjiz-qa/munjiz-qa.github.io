/* يتيح فتح الرازي بعد تثبيته حتى عند انقطاع الاتصال. الشبكة أولاً دائماً لتبقى الصفحة محدّثة، والنسخة المحفوظة احتياط فقط.
   لا يتدخل في أي طلب لجهة خارجية، ولا يحفظ إلا ملفات الصفحة نفسها التي فُتحت. */
const CACHE = "razi-202611140215", CORE = ["./", "index.html", "manifest.webmanifest", "pwa-install.js", "app-icons/icon-192.png", "app-icons/icon-180.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("razi-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || !u.pathname.startsWith(new URL("./", location.href).pathname) || r.headers.has("range")) return;
  e.respondWith(fetch(r).then(res => { if (res.ok && res.status === 200 && +(res.headers.get("content-length") || 0) < 5e6) { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
