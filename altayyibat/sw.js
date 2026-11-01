// عامل الخدمة: يحفظ المنصة على الجهاز لتعمل دون اتصال
const V="ty-9cadd99b9a", PRE=["./", "index.html", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "fonts/fonts.css", "fonts/ibm-plex-sans-arabic-arabic-400-normal.woff2", "fonts/ibm-plex-sans-arabic-latin-400-normal.woff2", "fonts/ibm-plex-sans-arabic-arabic-500-normal.woff2", "fonts/ibm-plex-sans-arabic-latin-500-normal.woff2", "fonts/ibm-plex-sans-arabic-arabic-600-normal.woff2", "fonts/ibm-plex-sans-arabic-latin-600-normal.woff2", "fonts/readex-pro-arabic-500-normal.woff2", "fonts/readex-pro-latin-500-normal.woff2", "fonts/readex-pro-arabic-600-normal.woff2", "fonts/readex-pro-latin-600-normal.woff2", "fonts/readex-pro-arabic-700-normal.woff2", "fonts/readex-pro-latin-700-normal.woff2", "fonts/ibm-plex-mono-latin-500-normal.woff2"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(PRE)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V&&x.startsWith("ty-")).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url); if(e.request.method!=="GET"||u.origin!==location.origin) return;
  const net=()=>fetch(e.request).then(r=>{if(r.ok){const c=r.clone(); caches.open(V).then(x=>x.put(e.request,c))} return r});
  if(e.request.mode==="navigate"||u.pathname.endsWith("content.json")) e.respondWith(net().catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("index.html"))));
  else e.respondWith(caches.match(e.request).then(r=>r||net()));
});
