// مشوار: يحفظ الخريطة والتطبيق للعمل السريع ودون إنترنت. البلاغات والطقس تُجلب من الشبكة أولاً.
const V='mishwar-v8';
const CORE=['./','index.html','app.js','engine.js','config.js','assets/mishwar.css','assets/mark.svg','vendor/maplibre-gl.js','vendor/maplibre-gl.css','vendor/rtl-text.js','data/graph.bin','data/names.json','data/poi.json','data/land.json','data/bld.json','manifest.webmanifest','download.html','privacy.html','pwa-install.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith('mishwar-')&&x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  const fresh=/feed\.json|config\.js|app\.js|index\.html|\/mishwar\/$/.test(u.pathname);
  if(fresh){e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request,{ignoreSearch:true})));return}
  e.respondWith(caches.match(e.request).then(m=>m||fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c))}return r})));
});
