'use strict';
/* مشكاة — التلاوة المتصلة: تشغيل المصحف آيةً آية مع تتبّع الآية الجارية، واختيار القارئ والسرعة والتكرار.
   مصدر الصوت: موقع «آية بآية» everyayah.com (استماع مجاني)، وتبقى حقوق التسجيلات لأصحابها. لا يُرسَل إلى الموقع أي شيء عن المستمع سوى طلب ملف الآية. */
(() => {
  const BASE = 'https://everyayah.com/data/';
  /* [مجلد القارئ في المصدر، الاسم بالعربية، الاسم بالإنجليزية، نوع الأداء] */
  const REC_LIST = [
    ['Alafasy_128kbps', 'مشاري راشد العفاسي', 'Mishary Rashid Alafasy', 'مرتّل'],
    ['Husary_128kbps', 'محمود خليل الحصري', 'Mahmoud Khalil Al-Husary', 'مرتّل'],
    ['Husary_Muallim_128kbps', 'محمود خليل الحصري (المصحف المعلّم)', 'Al-Husary (Teaching Mushaf)', 'معلّم'],
    ['Minshawy_Murattal_128kbps', 'محمد صديق المنشاوي', 'Muhammad Siddiq Al-Minshawi', 'مرتّل'],
    ['Minshawy_Mujawwad_192kbps', 'محمد صديق المنشاوي (مجوّد)', 'Al-Minshawi (Mujawwad)', 'مجوّد'],
    ['Abdul_Basit_Murattal_192kbps', 'عبد الباسط عبد الصمد', 'Abdul Basit Abdus-Samad', 'مرتّل'],
    ['Abdurrahmaan_As-Sudais_192kbps', 'عبد الرحمن السديس', 'Abdur-Rahman As-Sudais', 'مرتّل'],
    ['Saood_ash-Shuraym_128kbps', 'سعود الشريم', 'Saud Ash-Shuraim', 'مرتّل'],
    ['Maher_AlMuaiqly_128kbps', 'ماهر المعيقلي', 'Maher Al-Muaiqly', 'مرتّل'],
    ['Hudhaify_128kbps', 'علي الحذيفي', 'Ali Al-Hudhaify', 'مرتّل'],
    ['Abu_Bakr_Ash-Shaatree_128kbps', 'أبو بكر الشاطري', 'Abu Bakr Ash-Shaatree', 'مرتّل'],
    ['Hani_Rifai_192kbps', 'هاني الرفاعي', 'Hani Ar-Rifai', 'مرتّل'],
    ['Muhammad_Ayyoub_128kbps', 'محمد أيوب', 'Muhammad Ayyub', 'مرتّل'],
    ['Ghamadi_40kbps', 'سعد الغامدي', 'Saad Al-Ghamdi', 'مرتّل'],
  ];
  const RATES = [0.75, 0.9, 1, 1.15, 1.25, 1.5, 1.75, 2, 3, 4, 6, 8];
  const REPS = [1, 2, 3, 5, 10];
  const P = () => { const r = ST.prefs.rec || {}; return { r: REC_LIST.some(x => x[0] === r.r) ? r.r : REC_LIST[0][0], s: RATES.includes(+r.s) ? +r.s : 1, p: REPS.includes(+r.p) ? +r.p : 1, b: r.b !== false }; };
  const setP = ch => { ST.prefs.rec = { ...P(), ...ch }; save(); };
  const nm = r => LANG === 'ar' ? r[1] : r[2];
  const two = x => String(x).padStart(3, '0');
  const file = (s, a) => `${BASE}${P().r}/${two(s)}${two(a)}.mp3`;
  const S = { on: false, i: -1, end: -1, bas: false, rep: 0, playing: false, au: null, warm: null, err: 0, scope: 'surah' };
  const needBas = i => { const a = Q.ayat[i]; return P().b && a[1] === 1 && a[0] !== 1 && a[0] !== 9; };
  const urlNow = () => { const a = Q.ayat[S.bas ? 0 : S.i]; return S.bas ? file(1, 1) : file(a[0], a[1]); };
  const ic = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const I_PLAY = ic('<path d="M7 4.5v15l12-7.5z"/>'), I_PAUSE = ic('<path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z"/>'), I_NEXT = ic('<path d="M6 5v14l9-7zM17 5h2v14h-2z"/>'), I_PREV = ic('<path d="M18 5v14l-9-7zM5 5h2v14H5z"/>');

  function ensureBar() {
    if ($('#recBar')) return;
    document.body.insertAdjacentHTML('beforeend', `<div id="recBar" class="recbar" role="region" aria-label="مشغّل التلاوة" hidden>
      <div class="rec-top"><div class="rec-ttl"><b id="recTitle"></b><span id="recSub" class="muted small"></span></div><span class="rec-tb"><button class="rec-mk" id="recMk" type="button" aria-pressed="false" aria-label="ضع علامة هنا"><svg><use href="#i-bookmark"/></svg><span>ضع علامة هنا</span></button><a class="rec-mk" href="#recite" id="recList"><span>القرّاء</span></a><button class="rec-x" id="recX" type="button" aria-label="إغلاق المشغّل">×</button></span></div>
      <input id="recSeek" class="rec-seek" type="range" min="0" max="1000" value="0" aria-label="موضع الآية الجارية" disabled>
      <div class="rec-ctl"><button class="rec-b" id="recPrev" type="button" aria-label="الآية السابقة">${I_PREV}</button><button class="rec-b rec-pp" id="recPP" type="button" aria-label="تشغيل">${I_PLAY}</button><button class="rec-b" id="recNext" type="button" aria-label="الآية التالية">${I_NEXT}</button>
        <label class="rec-f rec-ay"><span>رقم الآية</span><input id="recAy" type="number" min="1" inputmode="numeric" aria-label="الانتقال إلى آية" placeholder="رقم الآية"></label>
        <label class="rec-f"><span>القارئ</span><select id="recR" aria-label="القارئ">${REC_LIST.map(r => `<option value="${r[0]}">${esc(nm(r))}</option>`).join('')}</select></label>
        <label class="rec-f"><span>السرعة</span><select id="recS" aria-label="سرعة التلاوة">${RATES.map(x => `<option value="${x}">${x === 1 ? 'عادية' : '×' + x}</option>`).join('')}</select></label>
        <label class="rec-f"><span>تكرار الآية</span><select id="recP" aria-label="تكرار كل آية">${REPS.map(x => `<option value="${x}">${x === 1 ? 'دون تكرار' : n(x) + ' مرات'}</option>`).join('')}</select></label></div></div>`);
    $('#recX').onclick = recStop;
    $('#recAy').onchange = e => { if (!S.on) return; const su = Q.surahs[Q.ayat[S.i][0] - 1], a = +e.target.value; if (!(a >= 1 && a <= su.ayas)) { toast('رقم الآية غير صحيح لهذه السورة'); syncUI(); return; } jumpTo(su.first + a - 1); };
    $('#recMk').onclick = () => recMark(S.i);
    $('#recPP').onclick = () => S.playing ? pause() : resume();
    $('#recPrev').onclick = () => jump(-1);
    $('#recNext').onclick = () => jump(1);
    $('#recR').onchange = e => { setP({ r: e.target.value }); if (S.on) { S.rep = 0; load(false); } syncUI(); };
    $('#recS').onchange = e => { setP({ s: +e.target.value }); if (S.au) S.au.playbackRate = P().s; syncUI(); };
    $('#recP').onchange = e => { setP({ p: +e.target.value }); S.rep = 0; syncUI(); };
    window.addEventListener('hashchange', () => { if (S.on) setTimeout(() => mark(S.i, true), 700); });
  }
  function syncUI() {
    const p = P(); const set = (id, v) => { const e = $('#' + id); if (e) e.value = String(v); };
    set('recR', p.r); set('recS', p.s); set('recP', p.p);
    const pp = $('#recPP'); if (pp) { pp.innerHTML = S.playing ? I_PAUSE : I_PLAY; pp.setAttribute('aria-label', S.playing ? 'إيقاف مؤقت' : 'تشغيل'); }
    const a = S.i >= 0 ? Q.ayat[S.i] : null;
    const ay = $('#recAy'); if (ay && a && document.activeElement !== ay) { ay.value = a[1]; ay.max = Q.surahs[a[0] - 1].ayas; }
    const t = $('#recTitle'); if (t && a) t.textContent = S.bas ? 'البسملة · ' + Q.surahs[a[0] - 1].name : `${Q.surahs[a[0] - 1].name} · الآية ${n(a[1])}`;
    const sub = $('#recSub'); if (sub) sub.textContent = nm(REC_LIST.find(r => r[0] === p.r)) + (p.p > 1 && S.rep ? ` · المرة ${n(S.rep + 1)} من ${n(p.p)}` : '');
    const live = $('#recLive'); if (live && a) live.innerHTML = `<div class="rec-livet"><span class="muted small">الآية الجارية</span><div class="ayah">${ayahText(S.i) ? esc(ayahText(S.i)) : ''} <span class="num">﴿${n(a[1])}﴾</span></div><a class="chip" data-ayah="${S.i}">${esc(ref(S.i))} · التفسير</a> <a class="chip acc" href="#pa${S.i}">تابعها في المصحف</a></div>`;
    document.body.classList.toggle('rec-open', S.on); syncMk();
    if ('mediaSession' in navigator && a) {
      try { navigator.mediaSession.metadata = new MediaMetadata({ title: `${Q.surahs[a[0] - 1].name} · ${a[1]}`, artist: nm(REC_LIST.find(r => r[0] === p.r)), album: 'مشكاة' });
        navigator.mediaSession.playbackState = S.playing ? 'playing' : 'paused'; } catch (e) {}
    }
  }
  function mark(i, quiet) {
    $$('.rec-on').forEach(e => e.classList.remove('rec-on'));
    if (i < 0) return;
    const els = $$(`#mpRoot .w[data-a="${i}"], #mpRoot .mp-n[data-ayah="${i}"]`);
    const own = $('#ay' + i);
    if (own) own.classList.add('rec-on');
    els.forEach(e => e.classList.add('rec-on'));
    const first = els[0] || own;
    if (first) { const r = first.getBoundingClientRect(); if (!quiet || r.top < 80 || r.bottom > innerHeight - 100) { if (r.top < 120 || r.bottom > innerHeight - 190) first.scrollIntoView({ block: 'center', behavior: quiet ? 'auto' : 'smooth' }); } }
    else if ($('#mpRoot') && window.MPV && MPV.data && typeof mpGo === 'function') { mpGo(MPV.data.pageOf[i], i); setTimeout(() => { if (S.i === i) mark(i, true); }, 1200); }
  }
  function load(keepTime) {
    const au = S.au, t = keepTime ? au.currentTime : 0;
    au.src = urlNow(); au.playbackRate = P().s; au.defaultPlaybackRate = P().s;
    if (t) au.addEventListener('loadedmetadata', () => { try { au.currentTime = t; } catch (e) {} }, { once: true });
    if (S.playing) au.play().catch(fail);
    warmNext();
  }
  function warmNext() { // يُهيّأ ملف الآية التالية في ذاكرة المتصفح ليكون الانتقال متصلاً
    try { let j = S.i, bas = false; if (S.bas) { } else if (S.rep + 1 < P().p) return; else { j = S.i + 1; if (j > S.end) return; bas = needBas(j); }
      const a = Q.ayat[S.bas ? S.i : j]; S.warm = new Audio(); S.warm.preload = 'auto'; S.warm.src = bas ? file(1, 1) : file(a[0], a[1]); } catch (e) {}
  }
  function fail() {
    S.err++; S.playing = false; syncUI();
    toast(navigator.onLine ? 'تعذّر تشغيل هذا الصوت الآن. جرّب قارئاً آخر.' : 'التلاوة تحتاج اتصالاً بالإنترنت. اتصل ثم اضغط تشغيل.');
  }
  function advance() {
    if (S.bas) { S.bas = false; S.rep = 0; }
    else if (S.rep + 1 < P().p) { S.rep++; }
    else { if (S.i >= S.end) return finish(); S.i++; S.rep = 0; S.bas = needBas(S.i); }
    S.au.src = urlNow(); S.au.playbackRate = P().s; S.au.play().catch(fail);
    arrive();
  }
  function arrive() { ST.last = S.i; ST.prefs.recAt = S.i; clearTimeout(arrive.t); arrive.t = setTimeout(save, 1500); mark(S.i); syncUI(); warmNext(); }
  function finish() { S.playing = false; syncUI(); toast(S.scope === 'ayah' ? 'انتهت الآية' : 'انتهت التلاوة. تقبّل الله منك.'); }
  function jumpTo(i) {
    if (!S.on) return; S.rep = 0; S.bas = false; S.i = i; S.end = Math.max(S.end, endOf(i, S.scope));
    load(false); if (!S.playing) { S.playing = true; S.au.play().catch(fail); } arrive();
  }
  function jump(d) {
    if (!S.on) return; S.rep = 0; S.bas = false;
    S.i = Math.max(0, Math.min(6235, S.i + d)); S.end = Math.max(S.end, S.i);
    if (d > 0 && needBas(S.i)) S.bas = true;
    load(false); if (!S.playing) { S.playing = true; S.au.play().catch(fail); } arrive();
  }
  function pause() { S.playing = false; if (S.au) S.au.pause(); syncUI(); }
  function resume() { if (!S.on) return; S.playing = true; S.au.play().catch(fail); syncUI(); }
  function recStop() { S.on = false; S.playing = false; if (S.au) { S.au.pause(); S.au.removeAttribute('src'); S.au.load(); } mark(-1); const b = $('#recBar'); if (b) b.hidden = true; document.body.classList.remove('rec-open'); if ('mediaSession' in navigator) { try { navigator.mediaSession.playbackState = 'none'; } catch (e) {} } }
  /* scope: ayah = آية واحدة، surah = إلى نهاية السورة، juz = إلى نهاية الجزء، quran = إلى نهاية المصحف */
  function endOf(i, scope) {
    const a = Q.ayat[i], su = Q.surahs[a[0] - 1];
    if (scope === 'ayah') return i;
    if (scope === 'surah') return su.first + su.ayas - 1;
    if (scope === 'juz') { let j = i; while (j < 6235 && Q.ayat[j + 1][5] === a[5]) j++; return j; }
    return 6235;
  }
  window.recStart = function (i, scope = 'surah', opt = {}) {
    if (!IS_PWA) { toast('التلاوة تعمل في نسخة التطبيق المثبّتة.'); return; }
    ensureBar();
    if (!S.au) { S.au = new Audio(); S.au.preload = 'auto';
      S.au.addEventListener('ended', () => { if (S.on && S.playing) advance(); });
      S.au.addEventListener('error', () => { if (S.on && S.playing) fail(); });
      S.au.addEventListener('timeupdate', () => { const d = S.au.duration; const sk = $('#recSeek'); if (sk && d) sk.value = Math.round(S.au.currentTime / d * 1000); });
      S.au.addEventListener('playing', () => { S.err = 0; if (!S.playing) { S.playing = true; syncUI(); } });
      if ('mediaSession' in navigator) { const set = (k, f) => { try { navigator.mediaSession.setActionHandler(k, f); } catch (e) {} };
        set('play', () => resume()); set('pause', () => pause()); set('nexttrack', () => jump(1)); set('previoustrack', () => jump(-1)); }
    }
    i = Math.max(0, Math.min(6235, i | 0));
    S.on = true; S.scope = scope; S.i = i; S.end = opt.end != null ? opt.end : endOf(i, scope); S.rep = 0; S.bas = scope !== 'ayah' && Q.ayat[i][1] === 1 ? needBas(i) : false; S.playing = true; S.err = 0;
    $('#recBar').hidden = false;
    S.au.src = urlNow(); S.au.playbackRate = P().s; S.au.play().catch(fail);
    arrive();
  };
  window.recState = S;
  window.recStop = recStop;
  window.REC_LIST = REC_LIST;

  /* ---------- علامة التوقف (تُحفظ في ST.mark وتشاركها صفحة «وردي» والمزامنة) ---------- */
  window.recMark = function (i) {
    if (!(i >= 0)) return;
    if (ST.mark && ST.mark.i === i) { ST.mark = null; toast('أُزيلت علامة التوقف'); }
    else { ST.mark = { i, at: Date.now() }; toast('حُفظت علامة التوقف'); }
    save(); syncMk(); if ($('#rcMark')) markPanel();
  };
  function syncMk() { const b = $('#recMk'); if (!b) return; const on = !!(ST.mark && S.i >= 0 && ST.mark.i === S.i); b.setAttribute('aria-pressed', String(on)); b.classList.toggle('on', on); b.setAttribute('aria-label', on ? 'إزالة علامة التوقف' : 'ضع علامة هنا'); }

  /* ---------- نموذج استماع للقارئ ---------- */
  const PV = { au: null, r: null };
  function pvStop() { if (PV.au) { PV.au.pause(); PV.au.removeAttribute('src'); } const o = PV.r; PV.r = null; if (o) $$('.rc-card[data-r]').forEach(c => { const b = c.querySelector('.rc-try'); if (b) { b.classList.remove('on'); b.lastChild.textContent = 'استمع نموذجاً'; } }); }
  function pvPlay(r, btn) {
    if (PV.r === r) return pvStop();
    pvStop(); if (S.playing) pause();
    if (!PV.au) { PV.au = new Audio(); PV.au.addEventListener('ended', pvStop); PV.au.addEventListener('error', () => { if (PV.r) { pvStop(); toast(navigator.onLine ? 'تعذّر تشغيل هذا الصوت الآن. جرّب قارئاً آخر.' : 'التلاوة تحتاج اتصالاً بالإنترنت. اتصل ثم اضغط تشغيل.'); } }); }
    PV.r = r; btn.classList.add('on'); btn.lastChild.textContent = 'إيقاف النموذج';
    PV.au.src = `${BASE}${r}/001002.mp3`; PV.au.playbackRate = 1; PV.au.play().catch(() => { if (PV.r) { pvStop(); toast('تعذّر تشغيل هذا الصوت الآن. جرّب قارئاً آخر.'); } });
  }
  const initial = r => esc((LANG === 'ar' ? r[1] : r[2]).replace(/^(الشيخ|Sheikh)\s+/, '').trim().charAt(0).toUpperCase());
  const KINDS = ['مرتّل', 'مجوّد', 'معلّم'];
  function cardsHTML(q, kind) {
    const p = P(), t = (q || '').trim().toLowerCase();
    const list = REC_LIST.filter(r => (kind === 'all' || r[3] === kind) && (!t || r[1].includes(t) || r[2].toLowerCase().includes(t)));
    if (!list.length) return '<p class="muted" style="margin:0">لا يوجد قارئ بهذا الاسم.</p>';
    return list.map(r => `<div class="rc-card${r[0] === p.r ? ' sel' : ''}" data-r="${r[0]}"><button class="rc-pick" type="button" aria-pressed="${r[0] === p.r}" data-pick="${r[0]}"><span class="rc-av" aria-hidden="true">${initial(r)}</span><span class="rc-nm"><b>${esc(nm(r))}</b><small>${r[3]}</small></span>${r[0] === p.r ? '<span class="rc-ok">القارئ المختار</span>' : ''}</button><button class="rc-try btn" type="button" data-try="${r[0]}"><svg><use href="#i-play"/></svg><span>استمع نموذجاً</span></button></div>`).join('');
  }
  function markPanel() {
    const box = $('#rcMark'); if (!box) return;
    const mk = ST.mark, at = Number.isInteger(ST.prefs.recAt) ? ST.prefs.recAt : null;
    box.innerHTML = `<h2>علامة التوقف</h2>` + (mk
      ? `<div class="rc-mk"><svg class="rc-mki"><use href="#i-bookmark"/></svg><div><small class="muted">موضع علامتك</small><br><b id="rcMkRef">${esc(ref(mk.i))}</b> <small class="muted"><bdi dir="ltr">${dayKey(mk.at).replace(/\d/g, d => n(+d))}</bdi></small></div></div><div class="verse">${ayahHTML(mk.i, null, false)}</div><div class="toolbar"><button class="btn pri" id="rcMkGo" type="button"><svg><use href="#i-play"/></svg>تابع التلاوة من العلامة</button><a class="btn" href="#pa${mk.i}">اقرأها في الصفحة</a><button class="btn" id="rcMkClr" type="button">أزل العلامة</button></div>`
      : `<p class="muted" style="margin:0">لم تضع علامة بعد. أثناء التلاوة اضغط أيقونة العلامة في المشغّل لتحفظ موضع توقفك، وتعود إليه من هنا في أي وقت.</p>`)
      + (at != null && (!mk || mk.i !== at) ? `<p class="rc-last" style="margin:8px 0 0"><span class="muted">آخر موضع استمعت إليه:</span> <b>${esc(ref(at))}</b> <button class="btn" id="rcResume" type="button">أكمل من آخر موضع</button></p>` : '');
    const sc = () => { const e = $('#rcE'); return e && e.value !== 'ayah' ? e.value : 'surah'; };
    if ($('#rcMkGo')) $('#rcMkGo').onclick = () => { recStart(ST.mark.i, sc()); toast('بدأت التلاوة من علامتك'); };
    if ($('#rcMkClr')) $('#rcMkClr').onclick = () => { ST.mark = null; save(); markPanel(); syncMk(); toast('أُزيلت علامة التوقف'); };
    if ($('#rcResume')) $('#rcResume').onclick = () => { recStart(at, sc()); toast('بدأت التلاوة من آخر موضع'); };
  }

  /* ---------- صفحة «التلاوة المتصلة»: صفحة كاملة لاختيار القارئ والاستماع ---------- */
  window.reciteView = function () {
    const p = P();
    const cur = S.on ? S.i : (ST.last != null ? ST.last : 0), ca = Q.ayat[cur];
    let kind = 'all', q = '';
    V(`<div class="stack rc-page"><div><div class="eyebrow">التلاوة المتصلة</div><h1>اختر قارئك، واستمع، وضع علامة حيث تتوقف</h1>
      <p class="lead">اختر القارئ من البطاقات واستمع إلى نموذج من تلاوته، ثم ابدأ من أي سورة وآية. وضع علامة عند موضع توقفك لتعود إليها في أي وقت.</p></div>
      <section class="panel stack tight" id="rcJump"><h2>اذهب إلى آية</h2>
        <div class="rc-jrow"><label class="field"><span>السورة</span><select id="jS">${Q.surahs.map(s => `<option value="${s.n}"${s.n === ca[0] ? ' selected' : ''}>${n(s.n)}. ${s.name}</option>`).join('')}</select></label>
          <label class="field"><span>رقم الآية</span><input id="jA" type="number" min="1" max="${Q.surahs[ca[0] - 1].ayas}" inputmode="numeric" placeholder="رقم الآية"></label>
          <button class="btn pri" id="jGo" type="button">اذهب</button></div>
        <p class="muted small" style="margin:0"><span>عدد آيات السورة:</span> <b id="jN">${n(Q.surahs[ca[0] - 1].ayas)}</b></p>
        <div id="jRes" aria-live="polite"></div></section>
      <section class="panel stack tight" id="rcMark"></section>
      <section class="panel stack"><h2>اختر القارئ</h2>
        <div class="rc-tools"><input id="rcQ" type="search" placeholder="ابحث عن قارئ" aria-label="ابحث عن قارئ"><div class="seg" id="rcK"><button type="button" data-k="all" aria-pressed="true">الكل</button>${KINDS.map(k => `<button type="button" data-k="${k}" aria-pressed="false">${k}</button>`).join('')}</div></div>
        <div class="rc-cards" id="rcCards">${cardsHTML('', 'all')}</div></section>
      <section class="panel stack"><h2>ابدأ التلاوة</h2><div class="rec-grid">
        <label class="field"><span>السورة</span><select id="rcS">${Q.surahs.map(s => `<option value="${s.n}"${s.n === ca[0] ? ' selected' : ''}>${n(s.n)}. ${s.name}</option>`).join('')}</select></label>
        <label class="field"><span>من الآية</span><input id="rcA" type="number" min="1" inputmode="numeric" value="${ca[1]}"></label>
        <label class="field"><span>إلى</span><select id="rcE"><option value="surah">نهاية السورة</option><option value="juz">نهاية الجزء</option><option value="quran">نهاية المصحف</option><option value="ayah">هذه الآية فقط</option></select></label>
        <label class="field"><span>السرعة</span><select id="rcV">${RATES.map(x => `<option value="${x}"${x === p.s ? ' selected' : ''}>${x === 1 ? 'عادية' : '×' + x}</option>`).join('')}</select></label>
        <label class="field"><span>تكرار كل آية</span><select id="rcP">${REPS.map(x => `<option value="${x}"${x === p.p ? ' selected' : ''}>${x === 1 ? 'دون تكرار' : n(x) + ' مرات'}</option>`).join('')}</select></label></div>
        <label class="chk"><input type="checkbox" id="rcB"${p.b ? ' checked' : ''}> أتلو البسملة عند بداية كل سورة (عدا التوبة)</label>
        <div class="toolbar"><button class="btn pri" id="rcGo" type="button"><svg><use href="#i-play"/></svg>ابدأ التلاوة</button><button class="btn" id="rcAll" type="button">المصحف كاملاً من الفاتحة</button><a class="btn" href="#pa${cur}">افتح المصحف لمتابعتها</a></div>
        <p class="muted small" id="rcMsg" style="margin:0" aria-live="polite"></p></section>
      <section class="panel" id="recLive"><p class="muted" style="margin:0">اضغط «ابدأ التلاوة» ليظهر نص الآية الجارية هنا، ويظهر المشغّل في أسفل الشاشة.</p></section>
      <section class="panel stack tight"><p class="muted small" style="margin:0">مصدر الصوت: موقع «آية بآية» (everyayah.com)، ويُبث إلى جهازك مباشرة عند الاستماع، فيحتاج اتصالاً بالإنترنت، ولا يُحفظ في التطبيق. حقوق التسجيلات لأصحابها ولدورهم الأصلية، ونوصي بسماع التلاوة من إصداراتها الرسمية أيضاً. إن تعذّر قارئ فاختر غيره من القائمة.</p></section></div>`);
    markPanel();
    const go = (i, scope) => { setP({ s: +$('#rcV').value, p: +$('#rcP').value, b: $('#rcB').checked }); pvStop(); recStart(i, scope); $('#rcMsg').textContent = 'بدأت التلاوة. يمكنك التنقّل في التطبيق وهي مستمرة.'; };
    const draw = () => { $('#rcCards').innerHTML = cardsHTML(q, kind); };
    $('#rcCards').onclick = e => {
      const pk = e.target.closest('[data-pick]'), tr = e.target.closest('[data-try]');
      if (pk) { const r = pk.dataset.pick; pvStop(); setP({ r }); if (S.on) { S.rep = 0; load(false); } draw(); syncUI() }
      else if (tr) pvPlay(tr.dataset.try, tr);
    };
    $('#rcQ').oninput = e => { q = e.target.value; draw(); };
    $('#rcK').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return; kind = b.dataset.k; $$('#rcK button').forEach(x => x.setAttribute('aria-pressed', String(x === b))); draw(); };
    const jIdx = () => { const su = Q.surahs[+$('#jS').value - 1], a = +$('#jA').value; return Number.isInteger(a) && a >= 1 && a <= su.ayas ? su.first + a - 1 : -1; };
    $('#jS').onchange = () => { const su = Q.surahs[+$('#jS').value - 1]; $('#jA').max = su.ayas; $('#jA').value = ''; $('#jN').textContent = n(su.ayas); $('#jRes').innerHTML = ''; };
    const jDo = () => {
      const i = jIdx(), box = $('#jRes');
      if (i < 0) { box.innerHTML = '<p class="muted" style="margin:0">رقم الآية غير صحيح لهذه السورة</p>'; return; }
      box.innerHTML = `<div class="rc-mk"><svg class="rc-mki"><use href="#i-bookmark"/></svg><b>${esc(ref(i))}</b></div><div class="verse">${ayahHTML(i, null, false)}</div><div class="toolbar"><button class="btn pri" id="jPlay" type="button"><svg><use href="#i-play"/></svg>ابدأ التلاوة من هذه الآية</button><button class="btn" id="jMark" type="button"><svg><use href="#i-bookmark"/></svg>ضع علامة هنا</button><a class="btn" href="#pa${i}">اقرأها في الصفحة</a></div>`;
      $('#jPlay').onclick = () => { const e = $('#rcE'); const sc = e && e.value !== 'ayah' ? e.value : 'surah'; go(i, sc); };
      $('#jMark').onclick = () => { ST.mark = { i, at: Date.now() }; save(); markPanel(); syncMk(); toast('حُفظت علامة التوقف'); };
    };
    $('#jGo').onclick = jDo; $('#jA').addEventListener('keydown', e => { if (e.key === 'Enter') jDo(); });
    $('#rcS').onchange = () => { $('#rcA').value = 1; };
    $('#rcGo').onclick = () => { const s = +$('#rcS').value, su = Q.surahs[s - 1], a = Math.max(1, Math.min(su.ayas, +$('#rcA').value || 1)); $('#rcA').value = a; go(su.first + a - 1, $('#rcE').value); };
    $('#rcAll').onclick = () => go(0, 'quran');
    ['rcV', 'rcP', 'rcB'].forEach(id => $('#' + id).addEventListener('change', () => { setP({ s: +$('#rcV').value, p: +$('#rcP').value, b: $('#rcB').checked }); syncUI(); }));
    if (S.on) syncUI();
  };
})();
