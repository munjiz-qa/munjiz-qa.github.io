/* إشراق: عامل الخدمة. الشبكة أولًا للصفحة، والنسخة المحفوظة عند انقطاع الإنترنت. */
const CACHE='ishraq-v1';
const CORE=["./", "index.html", "manifest.webmanifest", "fonts.css", "icon.svg", "icon-192.png", "icon-512.png", "icon-180.png", "fonts/amiri-v30-J7aRnpd8CGxBHpUgtLMA7w.woff2", "fonts/amiri-v30-J7aRnpd8CGxBHpUrtLMA7w.woff2", "fonts/amiri-v30-J7aRnpd8CGxBHpUutLM.woff2", "fonts/amiri-v30-J7acnpd8CGxBHp2VkaY6zp5yGw.woff2", "fonts/amiri-v30-J7acnpd8CGxBHp2VkaY_zp4.woff2", "fonts/amiri-v30-J7acnpd8CGxBHp2VkaYxzp5yGw.woff2", "fonts/amiriquran-v19-_Xmo-Hk0rD6DbUL4_vH8Zp5q5i0.woff2", "fonts/amiriquran-v19-_Xmo-Hk0rD6DbUL4_vH8Zp5v5i2ssg.woff2", "fonts/ibmplexsansarabic-v15-Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys43PWrfQ.woff2", "fonts/ibmplexsansarabic-v15-Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ys93PU.woff2", "fonts/ibmplexsansarabic-v15-Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ysw3PWrfQ.woff2", "fonts/ibmplexsansarabic-v15-Qw3CZRtWPQCuHme67tEYUIx3Kh0PHR9N6Ysz3PWrfQ.woff2", "fonts/ibmplexsansarabic-v15-Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPi-OCRXMR5Kw.woff2", "fonts/ibmplexsansarabic-v15-Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPi-OCUXMQ.woff2", "fonts/ibmplexsansarabic-v15-Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPi-OCZXMR5Kw.woff2", "fonts/ibmplexsansarabic-v15-Qw3NZRtWPQCuHme67tEYUIx3Kh0PHR9N6YPi-OCaXMR5Kw.woff2"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('ishraq-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin!==location.origin||!u.pathname.startsWith(new URL('./',self.registration.scope).pathname))return;
  if(u.pathname.includes('/fonts/')){e.respondWith(caches.match(r).then(m=>m||fetch(r)));return}
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp))}return res}).catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('./'))));
});
