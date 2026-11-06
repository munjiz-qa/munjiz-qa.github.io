// منجز: تثبيت الموقع كتطبيق على الكمبيوتر والجوال، والعمل دون إنترنت للصفحات التي فُتحت سابقاً.
(function(){
  var src=(document.currentScript&&document.currentScript.src)||location.href;
  var root=new URL('../',src);
  var local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  if('serviceWorker' in navigator&&(location.protocol==='https:'||local)){
    addEventListener('load',function(){navigator.serviceWorker.register(new URL('sw.js',root).href,{scope:root.pathname}).catch(function(){})});
  }
  var deferred=null;
  function btns(){return document.querySelectorAll('[data-install]')}
  function standalone(){return matchMedia('(display-mode: standalone)').matches||navigator.standalone}
  function sync(){btns().forEach(function(b){b.hidden=!deferred||standalone()});
    document.querySelectorAll('[data-installed]').forEach(function(e){e.hidden=!standalone()})}
  addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferred=e;sync()});
  addEventListener('appinstalled',function(){deferred=null;sync()});
  document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-install]');if(!b||!deferred)return;
    deferred.prompt();deferred.userChoice.finally(function(){deferred=null;sync()})});
  document.addEventListener('DOMContentLoaded',sync);
})();
