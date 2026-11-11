'use strict';
/* تنبيه الأذان: يُجدوِل إشعاراً عند كل وقت صلاة (من مواقيت الجهاز نفسها، دون خادم)، وصوتاً أصلياً مولَّداً داخل الصفحة،
   أو تسجيلاً مرخّصاً يُحمَّل عند أول اختيار فقط. لا يُقبل تسجيل بلا رخصة مفتوحة موثّقة ومصدر ومؤذن مسمّى. */
(() => {
  if (typeof prCfg !== 'function' || typeof prDay !== 'function') return;
  const AR = LANG === 'ar', T = (a, e) => AR ? a : e, KEY = 'adhan', ADH = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
  const OK_LIC = ['CC0-1.0', 'PD', 'CC-BY-4.0', 'CC-BY-3.0', 'CC-BY-SA-4.0', 'CC-BY-SA-3.0', 'Own-permission'];
  const cfgA = () => Object.assign({ on: false, p: { fajr: 1, dhuhr: 1, asr: 1, maghrib: 1, isha: 1 }, s: 'chime', v: 0.8 }, LS.get(KEY, {}) || {});
  const saveA = c => LS.set(KEY, c);
  const effSound = async c => { if ((LS.get(KEY, {}) || {}).s) return c.s; const d = (await loadManifest()).find(m => m.default && !m.pending); return d ? d.id : 'chime'; };
  const supportsTrigger = () => typeof window.TimestampTrigger === 'function' && 'showTrigger' in Notification.prototype;
  let timers = [], manifest = null, lastAudio = null;

  /* ---------- الأحداث القادمة: خمس صلوات لثلاثة أيام قادمة ---------- */
  function upcoming(horizonDays = 3) {
    const cfg = prCfg(), now = Date.now(), out = [];
    for (let k = 0; k <= horizonDays; k++) {
      const date = new Date(now + k * 864e5), { t, tz } = prDay(date, cfg), y = date.getFullYear(), mo = date.getMonth(), d = date.getDate();
      for (const key of ADH) { const h = t[key]; if (!isFinite(h)) continue;
        const at = Date.UTC(y, mo, d) + (h - tz) * 36e5; if (at > now + 1000) out.push({ key, at, id: `${key}-${y}${mo}${d}` }); }
    }
    return out.sort((a, b) => a.at - b.at);
  }
  const mName = m => (AR ? m.name : (m.en || m.name)) + (m.country ? ' · ' + (AR ? m.country : (m.country_en || m.country)) : '');
  const prObj = key => PR_NAMES.find(x => x[0] === key);
  const msgFor = key => { const P = prPlace(prCfg()), nm = prName(prObj(key));
    return { title: T(`حان وقت صلاة ${nm}`, `It is time for ${nm} prayer`), body: T(`حيّ على الصلاة · حسب مواقيت ${P.city}`, `Prayer times for ${P.city}`) }; };

  /* ---------- الصوت: نغمة أصلية مولَّدة بـ WebAudio (لا ملف ولا رخصة)، أو تسجيل مرخّص ---------- */
  function chime(vol) {
    try { const C = new (window.AudioContext || window.webkitAudioContext)(), g = C.createGain(); g.gain.value = Math.max(0.05, Math.min(1, vol)); g.connect(C.destination);
      const notes = [392, 494, 587, 784, 587, 494, 392]; // سلّم هادئ صاعد ثم هابط
      notes.forEach((f, i) => { const t0 = C.currentTime + i * 0.55;
        [1, 2, 3.01].forEach((m, j) => { const o = C.createOscillator(), e = C.createGain(); o.type = 'sine'; o.frequency.value = f * m;
          e.gain.setValueAtTime(0, t0); e.gain.linearRampToValueAtTime(0.5 / (j + 1.5), t0 + 0.02); e.gain.exponentialRampToValueAtTime(0.0008, t0 + 1.6);
          o.connect(e); e.connect(g); o.start(t0); o.stop(t0 + 1.7); }); });
      setTimeout(() => C.close().catch(() => {}), 6500); return true; } catch (e) { return false; }
  }
  async function loadManifest() {
    if (manifest) return manifest;
    try { const j = await (await fetch('data/adhan/manifest.json', { cache: 'no-cache' })).json();
      manifest = (j.muadhdhins || []).filter(m => m && /^[\w-]+$/.test(m.id || '') && m.name && (m.pending === true || (/^[\w-]+\.(mp3|ogg|m4a|opus)$/.test(m.file || '') && OK_LIC.includes(m.license) && /^https:\/\//.test(m.source || '') && m.author))); }
    catch (e) { manifest = []; }
    return manifest;
  }
  const idb = (mode, fn) => new Promise((res, rej) => { const r = indexedDB.open('mishkat-adhan', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onerror = () => rej(r.error);
    r.onsuccess = () => { const tx = r.result.transaction('f', mode), q = fn(tx.objectStore('f')); tx.oncomplete = () => res(q.result); tx.onerror = () => rej(tx.error); }; });
  async function play(sound, vol) {
    if (lastAudio) { try { lastAudio.pause(); } catch (e) {} lastAudio = null; }
    if (!sound || sound === 'none') return 'none';
    if (sound === 'custom') { try { const b = await idb('readonly', st => st.get('custom')); if (b) { const a = new Audio(URL.createObjectURL(b)); a.volume = vol; lastAudio = a; await a.play(); return 'file'; } } catch (e) { return 'blocked'; } return chime(vol) ? 'chime' : 'blocked'; }
    if (sound !== 'chime') { const m = (await loadManifest()).find(x => x.id === sound);
      if (m) { try { const a = new Audio('data/adhan/' + m.file); a.volume = vol; lastAudio = a; await a.play(); return 'file'; } catch (e) { return 'blocked'; } } }
    return chime(vol) ? 'chime' : 'blocked';
  }

  /* ---------- الإشعار والجدولة ---------- */
  async function swReg() { try { return await navigator.serviceWorker?.getRegistration(); } catch (e) { return null; } }
  async function show(ev, opts = {}) {
    const m = msgFor(ev.key), o = Object.assign({ body: m.body, tag: 'adhan-' + ev.id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', lang: LANG, dir: AR ? 'rtl' : 'ltr', data: { url: '#prayer' }, renotify: false }, opts);
    const reg = await swReg(); if (reg) return reg.showNotification(m.title, o); return new Notification(m.title, o);
  }
  function fire(ev) {
    const c = cfgA(); if (!c.on || !c.p[ev.key]) return;
    if (!supportsTrigger() && 'Notification' in window && Notification.permission === 'granted') show(ev).catch(() => {});
    if (document.visibilityState === 'visible') effSound(c).then(sd => play(sd, c.v));
  }
  async function schedule() {
    timers.forEach(clearTimeout); timers = []; const c = cfgA(), reg = await swReg();
    if (reg && 'getNotifications' in reg && supportsTrigger()) { try { (await reg.getNotifications({ includeTriggered: false })).filter(x => /^adhan-/.test(x.tag)).forEach(x => x.close()); } catch (e) {} }
    if (!c.on) return 0;
    const evs = upcoming().filter(e => c.p[e.key]); let n = 0;
    for (const ev of evs) { const wait = ev.at - Date.now();
      if (wait < 2 ** 31 - 1) timers.push(setTimeout(() => fire(ev), wait));
      if (reg && supportsTrigger() && Notification.permission === 'granted') { try { await show(ev, { showTrigger: new TimestampTrigger(ev.at) }); n++; } catch (e) {} } }
    return evs.length;
  }
  async function enable() {
    if (!('Notification' in window)) return 'unsupported';
    if (Notification.permission === 'default') await Notification.requestPermission();
    return Notification.permission;
  }

  /* ---------- الواجهة داخل صفحة مواقيت الصلاة ---------- */
  const esc2 = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  async function ui() {
    const box = document.getElementById('adhanBox'); if (!box) { schedule(); return; }
    const c = cfgA(), ms = await loadManifest(); c.s = await effSound(c); const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const status = !c.on ? T('التنبيه متوقف.', 'Alerts are off.')
      : perm === 'denied' ? T('الإشعارات محجوبة في إعدادات المتصفح؛ فعّلها ليصلك التنبيه.', 'Notifications are blocked in your browser settings; allow them to get alerts.')
      : perm === 'unsupported' ? T('هذا المتصفح لا يدعم الإشعارات؛ يعمل الصوت والتطبيق مفتوح.', 'This browser has no notifications; sound plays while the app is open.')
      : supportsTrigger() ? T('مفعّل: تُجدوَل إشعارات الأوقات القادمة على الجهاز فتصلك والتطبيق مغلق.', 'On: upcoming prayer alerts are scheduled on this device and arrive even when the app is closed.')
      : T('مفعّل والتطبيق مفتوح أو في الخلفية. هذا المتصفح لا يتيح إشعاراً مجدولاً والتطبيق مغلق تماماً؛ أبقِ التطبيق مثبّتاً وغير مُغلق من مدير المهام.', 'On while the app is open or in the background. This browser cannot schedule alerts once the app is fully closed; keep the installed app running.');
    box.innerHTML = `<section class="panel stack tight"><h2>${T('تنبيه الأذان', 'Adhan alerts')}</h2>
      <label class="chk"><input type="checkbox" id="adOn"${c.on ? ' checked' : ''}> ${T('نبّهني عند دخول وقت الصلاة', 'Alert me when a prayer time starts')}</label>
      <div class="toolbar">${ADH.map(k => `<label class="chk"><input type="checkbox" data-adk="${k}"${c.p[k] ? ' checked' : ''}> ${esc2(prName(prObj(k)))}</label>`).join('')}</div>
      <div class="prform"><label class="field"><span>${T('الصوت', 'Sound')}</span><select id="adS">
        <option value="chime"${c.s === 'chime' ? ' selected' : ''}>${T('نغمة تنبيه هادئة (أصلية)', 'Soft alert tone (original)')}</option>
        <option value="none"${c.s === 'none' ? ' selected' : ''}>${T('إشعار صامت بلا صوت', 'Silent notification')}</option>
        ${c.cn ? `<option value="custom"${c.s === 'custom' ? ' selected' : ''}>${esc2(T('ملفي: ', 'My file: ') + c.cn)}</option>` : ''}
        ${ms.map(m => `<option value="${esc2(m.id)}"${m.pending ? ' disabled' : ''}${c.s === m.id ? ' selected' : ''}>${esc2(mName(m))}${m.pending ? T(' (بانتظار التسجيل المرخّص)', ' (awaiting licensed recording)') : ''}</option>`).join('')}</select></label>
        <label class="field"><span>${T('مستوى الصوت', 'Volume')}</span><input type="range" id="adV" min="0.1" max="1" step="0.05" value="${c.v}"></label></div>
 <label class="field"><span>${T('أذان من ملف على جهازك (يبقى على جهازك فقط)', 'Use an adhan file from your device (stays on your device only)')}</span><input type="file" id="adF" accept="audio/*"></label>
      <div class="toolbar"><button class="btn" id="adT" type="button">${T('جرّب الصوت الآن', 'Test the sound')}</button><button class="btn" id="adN" type="button">${T('جرّب إشعاراً', 'Test a notification')}</button><span class="muted small" id="adMsg"></span></div>
      <p class="muted small" id="adSt" style="margin:0">${esc2(status)}</p>
      <p class="muted small" style="margin:0">${ms.filter(m => !m.pending).length ? ms.filter(m => !m.pending).map(m => esc2(`${mName(m)}: ${m.author} · ${m.license} · ${m.source}`)).join('<br>')
        : T('أذانات الحرمين والأقصى ومصر وتركيا والمغرب والشام وغيرها قيد الإضافة: لا يُفعَّل إلا بتسجيل ثابت الرخصة أو بإذن صاحبه، وحتى ذلك الحين تُستعمل نغمة تنبيه هادئة. لا يُضاف تسجيل إلا بعد التحقق من رخصته (ملك عام أو رخصة مفتوحة أو إذن صاحبه)، وتُنشر بياناته هنا.', 'Adhans of Makkah, Madinah, Al-Aqsa, Egypt, Türkiye, Morocco, the Levant and more are being added: each is enabled only with a verified licence or the owner\'s permission; until then a soft alert tone is used. A recording is added only after its licence is verified (public domain, open licence or owner permission), with credits shown here.')}</p></section>`;
    const upd = ch => { const x = Object.assign(cfgA(), ch); saveA(x); schedule().then(() => ui()); };
    box.querySelector('#adOn').onchange = async e => { if (e.target.checked) { const p = await enable(); if (p === 'denied') $('#adMsg') && ($('#adMsg').textContent = ''); } upd({ on: e.target.checked }); };
    box.querySelectorAll('[data-adk]').forEach(el => el.onchange = () => upd({ p: Object.assign({}, cfgA().p, { [el.dataset.adk]: el.checked ? 1 : 0 }) }));
    box.querySelector('#adF').onchange = async e => { const f = e.target.files[0]; if (!f) return;
      if (!/^audio\//.test(f.type) || f.size > 15e6) { $('#adMsg').textContent = T('اختر ملفاً صوتياً لا يتجاوز ١٥ ميغابايت.', 'Choose an audio file up to 15 MB.'); return; }
      try { await idb('readwrite', st => st.put(f, 'custom')); upd({ s: 'custom', cn: f.name.slice(0, 60) }); } catch (er) { $('#adMsg').textContent = T('تعذّر حفظ الملف على الجهاز.', 'Could not save the file on this device.'); } };
    box.querySelector('#adS').onchange = e => upd({ s: e.target.value });
    box.querySelector('#adV').onchange = e => saveA(Object.assign(cfgA(), { v: +e.target.value }));
    box.querySelector('#adT').onclick = async () => { const r = await play(cfgA().s, cfgA().v); $('#adMsg').textContent = r === 'blocked' ? T('منع المتصفح التشغيل؛ المس الصفحة أولاً.', 'Playback was blocked; tap the page first.') : r === 'none' ? T('الصوت مغلق.', 'Sound is off.') : T('تم التشغيل.', 'Played.'); };
    box.querySelector('#adN').onclick = async () => { const p = await enable(); if (p !== 'granted') { $('#adMsg').textContent = T('لم تُمنح صلاحية الإشعارات.', 'Notification permission not granted.'); return; }
      await show({ key: 'dhuhr', id: 'test-' + Date.now() }, { body: T('هذا إشعار تجريبي.', 'This is a test notification.') }); $('#adMsg').textContent = T('أُرسل الإشعار.', 'Notification sent.'); };
  }
  window.adhanUI = ui; window.adhanSchedule = schedule; window.adhanUpcoming = upcoming; window.adhanPlay = play;
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') schedule(); });
  setInterval(schedule, 3 * 36e5); schedule();
})();
