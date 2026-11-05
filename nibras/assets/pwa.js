// نبراس: بطاقة تثبيت التطبيق على الكمبيوتر والجوال بضغطة، وإرشاد آيفون. عامل الخدمة يُسجَّل في الصفحة نفسها.
(function(){
  var src=(document.currentScript&&document.currentScript.src)||location.href, root=new URL('../',src);
  var EN=(document.documentElement.lang||'').slice(0,2)==='en', KEY='nibras_install_later', deferred=null, box=null;
  var T=EN?{t:'Install the Nibras app on your device',b:'Install',i:'On iPhone and iPad: tap Share, then “Add to Home Screen”.',x:'Close'}
          :{t:'ثبّت تطبيق نبراس على جهازك',b:'تثبيت',i:'على آيفون وآيباد: اضغط زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».',x:'إغلاق'};
  function standalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}
  function later(){try{return Date.now()-(+localStorage.getItem(KEY)||0)<12096e5}catch(_){return false}}
  function ios(){var u=navigator.userAgent;return (/iPhone|iPad|iPod/.test(u)||(u.indexOf('Macintosh')>-1&&navigator.maxTouchPoints>1))&&!/CriOS|FxiOS|EdgiOS/.test(u)}
  function css(){if(document.getElementById('pwaCss'))return;var s=document.createElement('style');s.id='pwaCss';
    s.textContent='.pwa-card{position:fixed;z-index:60;inset-inline-start:12px;bottom:calc(18px + env(safe-area-inset-bottom,0px));max-width:min(360px,calc(100vw - 24px));display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:#8A1538;color:#fff;border:1px solid #A8834B;box-shadow:0 10px 28px rgba(10,20,40,.28);font-size:14.5px;line-height:1.5}'+
    '.pwa-card p{margin:0;flex:1 1 0;min-width:0}.pwa-card img{width:36px;height:36px;border-radius:9px;flex:none}'+
    '.pwa-card .pwa-go{font:inherit;font-weight:700;border:0;border-radius:10px;padding:8px 16px;min-height:40px;background:#fff;color:#24191C;cursor:pointer}'+
    '.pwa-card .pwa-x{font:inherit;font-size:20px;line-height:1;border:0;background:transparent;color:#fff;cursor:pointer;min-width:40px;min-height:40px;border-radius:10px}'+
    '.pwa-card button:focus-visible{outline:3px solid #F4E6EA;outline-offset:2px}'+
    '@media print{.pwa-card{display:none}}';
    document.head.appendChild(s)}
  function close(keep){if(box){box.remove();box=null}if(keep){try{localStorage.setItem(KEY,String(Date.now()))}catch(_){}}}
  function show(iosHint){if(box||standalone()||later()||!document.body)return;css();
    box=document.createElement('div');box.className='pwa-card';box.setAttribute('role','region');box.setAttribute('aria-label',T.t);
    box.innerHTML='<img src="'+new URL('assets/icon-192.png',root).href+'" alt=""><p>'+(iosHint?T.i:T.t)+'</p>'+(iosHint?'':'<button type="button" class="pwa-go">'+T.b+'</button>')+'<button type="button" class="pwa-x" aria-label="'+T.x+'">×</button>';
    box.querySelector('.pwa-x').onclick=function(){close(true)};
    var go=box.querySelector('.pwa-go');if(go)go.onclick=function(){if(!deferred)return close(false);deferred.prompt();deferred.userChoice.then(function(c){deferred=null;close(c&&c.outcome!=='accepted')},function(){close(false)})};
    document.body.appendChild(box)}
  addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;setTimeout(function(){show(false)},3000)});
  addEventListener('appinstalled',function(){deferred=null;close(false)});
  if(ios()&&!standalone())addEventListener('load',function(){setTimeout(function(){show(true)},4000)});
})();
