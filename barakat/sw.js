/* بركات · يعمل الموقع دون اتصال: الشبكة أولاً، ثم آخر نسخة محفوظة */
const CACHE='barakat-v2';
const CORE=['./','./index.html','./manifest.webmanifest','./icons/icon-192.png','./document/'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
  const same=u.origin===location.origin, font=/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname);if(!same&&!font)return;
  e.respondWith(fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}return res})
    .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||(r.mode==='navigate'?caches.match('./'):Response.error()))))});
