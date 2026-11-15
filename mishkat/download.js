(function () {
  var ua = navigator.userAgent, ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var android = /android/i.test(ua), me = ios ? 'd-ios' : android ? 'd-android' : 'd-desktop';
  var $ = function (i) { return document.getElementById(i); };
  var deferred = null;
  var standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  $(me).classList.add('me');
  document.querySelectorAll('.grid').forEach(function (g) { var el = $(me); if (el && g.firstElementChild !== el) g.insertBefore(el, g.firstElementChild); });
  if (!android) { var a = document.querySelector('#d-android a'); if (a) a.hidden = false; }
  if (ios) $('goT').textContent = 'ثبّت مشكاة على آيفون';
  function show(id) { ['ios', 'manual'].forEach(function (x) { $(x).hidden = x !== id; }); }
  function install() {
    if (deferred) { deferred.prompt(); deferred.userChoice.finally(function () { deferred = null; }); return; }
    if (ios) { show('ios'); $('ios').scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    else { show('manual'); }
  }
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; $('manual').hidden = true; });
  addEventListener('appinstalled', function () { $('done').hidden = false; $('go').hidden = true; $('goN').hidden = true; show(''); });
  $('go').addEventListener('click', install);
  document.querySelectorAll('[data-install]').forEach(function (b) { b.addEventListener('click', install); });
  document.querySelectorAll('[data-ios]').forEach(function (b) { b.addEventListener('click', function () { show('ios'); $('ios').scrollIntoView({ behavior: 'smooth', block: 'center' }); }); });
  if (standalone) { $('done').hidden = false; $('go').hidden = true; $('goN').hidden = true; }
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
