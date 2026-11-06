// صفحة «منجز على الكمبيوتر»: تُظهر خيارات التشغيل المحلي عند فتحها من حزمة الكمبيوتر.
(function(){
  var EN=document.documentElement.lang==='en';
  var local=/^(localhost|127\.0\.0\.1)$/.test(location.hostname)||location.protocol==='file:';
  var box=document.getElementById('localBox');if(!local||!box)return;
  box.hidden=false;
  document.getElementById('here').textContent=location.protocol==='file:'?location.pathname:location.origin;
  function get(){try{return localStorage.getItem('munjiz_offline')==='1'}catch(e){return false}}
  function show(){var off=get();
    document.getElementById('modeNow').textContent=off?(EN?'Offline, saved on this computer':'محلي دون إنترنت، محفوظ في هذا الكمبيوتر'):(EN?'Connected to the office server':'متصل بخادم المكتب');
    document.querySelectorAll('input[name=mode]').forEach(function(r){r.checked=(r.value==='offline')===off})}
  document.querySelectorAll('input[name=mode]').forEach(function(r){r.addEventListener('change',function(){
    try{if(r.value==='offline')localStorage.setItem('munjiz_offline','1');else localStorage.removeItem('munjiz_offline')}catch(e){}
    try{sessionStorage.clear()}catch(e){}
    show()})});
  show();
})();
