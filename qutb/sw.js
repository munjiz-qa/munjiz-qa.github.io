/* يتيح فتح قُطب بعد تثبيته حتى عند انقطاع الاتصال. الشبكة أولاً دائماً لتبقى اللوحة محدّثة، والنسخة المحفوظة احتياط فقط.
   لا يتدخل في أي طلب لجهة خارجية (واجهات GitHub وفحص المواقع)، ولا يحفظ إلا ملفات المنصة نفسها. */
const CACHE = "qutb-202611130215", CORE = ["./", "index.html", "manifest.webmanifest", "assets/qutb.css", "assets/qutb.js", "assets/icon.svg", "assets/icon-180.png", "assets/icon-192.png", "pwa-install.js", "vault.json"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("qutb-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || !u.pathname.startsWith(new URL("./", location.href).pathname)) return;
  e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(CACHE).then(x => x.put(r, c)); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || (r.mode === "navigate" ? caches.match("index.html") : Response.error()))));
});
