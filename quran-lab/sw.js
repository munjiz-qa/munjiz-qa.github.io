/* مشكاة service worker: app shell + core data precached; tafsir chunks and fonts cached on first use */
const SHELL = 'qlab-shell-87ea44fb70', DATA = 'qlab-data-v1', CORE = ["./", "index.html", "app.js", "app.css", "fonts.css", "fonts/amiri-quran-arabic-400-normal.woff2", "fonts/amiri-quran-latin-400-normal.woff2", "fonts/aref-ruqaa-arabic-700-normal.woff2", "fonts/aref-ruqaa-latin-700-normal.woff2", "fonts/readex-pro-arabic-wght-normal.woff2", "fonts/readex-pro-latin-wght-normal.woff2", "manifest.webmanifest", "config.json", "icons/icon-192.png", "icons/icon-512.png", "data/quran.txt", "data/words.txt", "data/topics.txt", "data/tafsir.json", "data/geo.json", "data/t/muyassar/0.txt", "data/t/gharib/0.txt", "data/tr/index.json", "data/i18n/en.json"];
self.addEventListener('install', e => e.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('qlab-shell-') && k !== SHELL).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url); if (e.request.method !== 'GET') return;
  if (u.origin === location.origin && (u.pathname.endsWith('config.json'))) { e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(SHELL).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request))); return; }
  if (u.hostname === 'everyayah.com') return;
  const isData = u.origin === location.origin && (u.pathname.includes('/data/t/') || u.pathname.includes('/data/hadith/') || u.pathname.includes('/data/tr/'));
  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);
  if (u.origin !== location.origin && !isFont) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(r => {
    if (r.ok || r.type === 'opaque') { const c = r.clone(); caches.open(isData ? DATA : SHELL).then(x => x.put(e.request, c)); } return r; })));
});
