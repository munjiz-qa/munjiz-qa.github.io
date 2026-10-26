/* بناء بيلدر app service worker: app shell offline, fonts cached, config network-first */
const V = "mdk-3.1.0";
const SHELL = ["./", "index.html", "manifest.webmanifest", "config.json", "icons/icon-192.png", "icons/icon-512.png"];
self.addEventListener("install", e => e.waitUntil(caches.open(V).then(c => c.addAll(SHELL))));
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("mdk-") && k !== V && k !== "mdk-fonts").map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("message", e => { if (e.data === "skip-waiting") self.skipWaiting(); });
const keep = (key, res) => { if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(V).then(c => c.put(key, copy)); } return res; };
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin){
    if (r.mode === "navigate"){ e.respondWith(fetch(r).then(res => keep("index.html", res)).catch(() => caches.match("index.html"))); return; }
    if (u.pathname.endsWith("/config.json")){ e.respondWith(fetch(r).then(res => keep("config.json", res)).catch(() => caches.match("config.json"))); return; }
    e.respondWith(caches.match(r, {ignoreSearch:true}).then(hit => hit || fetch(r).then(res => keep(r, res))));
    return;
  }
  if (/^fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)){
    e.respondWith(caches.open("mdk-fonts").then(c => c.match(r).then(hit => hit || fetch(r).then(res => { c.put(r, res.clone()); return res; }))));
  }
});
