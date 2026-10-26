// «خبر»: الواجهة من الذاكرة المؤقتة، والبيانات من الشبكة أولاً حتى تظهر أحدث خلاصة دائماً.
const V='khabar-v2',SHELL=['./','index.html','assets/khabar.css','assets/app.js','assets/config.js','assets/icon.svg','manifest.webmanifest'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(SHELL)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);if(e.request.method!=='GET'||u.origin!==location.origin)return;
  const fresh=()=>fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r});
  if(u.pathname.includes('/data/')||u.pathname.endsWith('/')||u.pathname.endsWith('.html')||u.pathname.endsWith('.js')||u.pathname.endsWith('.css'))e.respondWith(fresh().catch(()=>caches.match(e.request)));
  else e.respondWith(caches.match(e.request).then(r=>r||fresh()));
});
