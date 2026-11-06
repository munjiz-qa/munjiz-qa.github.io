/* مشكاة · المصحف المتصل: صفحات مصحف المدينة النبوية (٦٠٤ صفحات، ١٥ سطراً)
   النص: نص مجمع الملك فهد لطباعة المصحف الشريف (رواية حفص، الإصدار ١٨) بخط المجمع العثماني، دون أي تعديل.
   الصفحات والأسطر: على طبعة مصحف المدينة النبوية، وتطابقت صفحة كل آية مع بيانات المجمع (٦٢٣٦ من ٦٢٣٦).
   يعمل كاملاً دون إنترنت بعد أول تحميل، ولا يتصل بأي خدمة خارجية. */
'use strict';
const MPV = { data: null, mode: 'scroll', size: 0, cur: 1, io: null, posIO: null, fs: 24, flow: false, jumping: 0 };
const MP_AR = x => String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
const MP_PART = ['الحزب', 'ربع الحزب', 'نصف الحزب', 'ثلاثة أرباع الحزب'];
const MP_SCALE = { '-1': 0.8, 0: 1, 1: 1.25, 2: 1.5, 3: 1.8 };
const MP_COMF = { '-1': 21, 0: 26, 1: 30, 2: 35, 3: 41 }; // «قراءة مريحة»: حجم الخط بالبكسل لكل درجة // درجات حجم الخط
const MP_LINE = 1.98, MP_FLOW_LINE = 2.08, MP_HEAD = 1.75, MP_FOOT = 1.75, MP_PAD = 0.55, MP_SIDE = 0.8; // مقاييس الصفحة بوحدة حجم الخط

async function mpData() {
  if (MPV.data) return MPV.data;
  const d = await gz('data/mushaf.txt');
  const A = d.a.map(s => s.split(' ')), G0 = new Int32Array(A.length), TA = [];
  let g = 0; A.forEach((t, i) => { G0[i] = g; for (let k = 0; k < t.length; k++) TA.push(i); g += t.length; });
  const pageOf = new Int16Array(A.length), deferred = new Set(), hdr = {}, lineOfA = new Int16Array(A.length);
  d.p.forEach((lines, pi) => lines.forEach((L, li) => {
    if (L[0] === 'h') hdr[L[1]] = [pi + 1, li];
    else if (typeof L[0] === 'number') {
      if (L[2]) deferred.add(TA[L[0] - 1]);
      for (let x = L[0]; x < L[1]; x++) { const i = TA[x]; if (x === G0[i]) { pageOf[i] = pi + 1; lineOfA[i] = li; } }
    }
  }));
  const pageQ = {}; d.q.forEach((a, k) => { const p = pageOf[a]; (pageQ[p] = pageQ[p] || []).push(k); });
  MPV.data = { ...d, A, G0, TA: Int16Array.from(TA), pageOf, lineOfA, deferred, hdr, pageQ };
  return MPV.data;
}
function mpWord(i, t) { const m = MPV.data.m[i]; return Q.ayat[i][2] + (m ? m[t] : t); }
function mpSurahsOn(p) { const D = MPV.data, s = new Set(); for (const L of D.p[p - 1]) { if (L[0] === 'h') s.add(L[1]); else if (typeof L[0] === 'number') { s.add(Q.ayat[D.TA[L[0]]][0]); s.add(Q.ayat[D.TA[L[1] - 1]][0]); } } return [...s]; }
function mpFirstAyah(p) { const D = MPV.data; for (const L of D.p[p - 1]) if (typeof L[0] === 'number') return D.TA[L[0]]; return 0; }
const mpNum = i => `<span class="mp-n" data-ayah="${i}" title="الآية ${MP_AR(Q.ayat[i][1])}">${MP_AR(Q.ayat[i][1])}</span> `;
function mpLine(L) {
  const D = MPV.data;
  if (L[0] === 'h') { const s = Q.surahs[L[1] - 1]; return `<div class="mp-l mp-sh" data-sh="${L[1]}"><span class="mp-shn">سورة ${s.name}</span><span class="mp-shi">${s.type} · آياتها ${MP_AR(s.ayas)}</span></div>`; }
  if (L[0] === 'b') return `<div class="mp-l mp-bas">${D.A[0].join(' ')}</div>`;
  let h = '';
  if (L[2]) h += mpNum(D.TA[L[0] - 1]);
  for (let x = L[0]; x < L[1]; x++) {
    const i = D.TA[x], t = x - D.G0[i];
    h += `<span class="w" data-word="${mpWord(i, t)}" data-a="${i}">${D.A[i][t]}</span> `;
    if (t === D.A[i].length - 1 && !D.deferred.has(i)) h += mpNum(i);
  }
  return `<div class="mp-l mp-t">${h}</div> `;
}
function mpLabels(p) {
  const D = MPV.data, a = mpFirstAyah(p), qs = D.pageQ[p] || [];
  const sur = mpSurahsOn(p).map(s => Q.surahs[s - 1].name).join(' · ');
  const q = qs.map(k => `${MP_PART[k % 4]} ${MP_AR((k >> 2) + 1)}`).join(' · ');
  return { juz: 'الجزء ' + MP_AR(D.j[a]), sur, q, juzStart: qs.some(k => k % 8 === 0) };
}
function mpPageInner(p) {
  const D = MPV.data, lb = mpLabels(p), w = D.w[p - 1], sc = !MPV.flow && w > D.tw ? (D.tw / w).toFixed(4) : '';
  return `<header class="mp-top"><span class="mp-juz">${lb.juz}</span>${lb.q ? `<span class="mp-q${lb.juzStart ? ' mp-qj' : ''}">${lb.q}</span>` : ''}<span class="mp-sur">${lb.sur}</span></header>
  <div class="mp-body${p <= 2 ? ' mp-open' : ''}"${sc ? ` style="font-size:${sc}em"` : ''}>${D.p[p - 1].map(mpLine).join('')}</div>
  <footer class="mp-foot"><span class="mp-pn">${MP_AR(p)}</span></footer>`;
}
function mpFill(el) { if (el.dataset.ok) return; el.dataset.ok = 1; el.innerHTML = mpPageInner(+el.dataset.p); if (!MPV.flow) mpFit(el); }
/* ملء السطر كما في المصحف: خط المجمع الحاسوبي لا يمدّ الحروف (الكشيدة) كما يفعل الخطاط، فيكبر خط الصفحة كلها حتى يملأ أطول سطورها العرض،
   ويكبر كل سطر قصير قليلاً فوق ذلك، فتضيق الفراغات بين الكلمات. السطور الخمسة عشر وارتفاعها لا يتغيران، والنص نفسه لا يُمسّ. */
function mpFit(el) {
  const L = [...el.querySelectorAll('.mp-body:not(.mp-open) .mp-t')]; if (!L.length) return;
  const W = L[0].clientWidth; if (!W) return;
  const nat = L.map(l => { const k = l.children; if (!k.length) return 0; let t = 0; for (const c of k) t += c.getBoundingClientRect().width; return t + parseFloat(getComputedStyle(l).columnGap || 0) * (k.length - 1); });
  const pg = Math.min(1.16, 0.985 * W / Math.max(...nat));
  L.forEach((l, i) => { const f = nat[i] ? Math.min(pg * 1.07, 0.985 * W / nat[i]) : pg; if (f > 1.005) l.style.setProperty('--lf', f.toFixed(3)); });
}
function mpEmpty(el) { if (!el.dataset.ok) return; delete el.dataset.ok; el.innerHTML = `<span class="mp-ph">${MP_AR(el.dataset.p)}</span>`; }
function mpRefill() { $$('#mpRoot .mp-page[data-ok]').forEach(el => { delete el.dataset.ok; mpFill(el); }); }

/* المقاس: في «سطور المصحف» يُحسب حجم الخط ليتسع أطول سطر لعرض الصفحة فتبقى أسطر كل صفحة كما في المصحف،
   وإذا طلب القارئ خطاً أكبر من عرض الشاشة انساب النص داخل الصفحة نفسها (الصفحة وآياتها كما هي، وتلتف الأسطر). */
function mpMeasure() {
  const root = $('#mpRoot'); if (!root) return;
  const D = MPV.data, flip = MPV.mode === 'flip', spread = flip && innerWidth >= 1000, fsEl = !!document.fullscreenElement;
  const sbH = fsEl ? 0 : ($('.searchbar')?.getBoundingClientRect().height || 0);
  root.style.setProperty('--mp-top', sbH + 'px');
  const box = root.querySelector('.mp-scroller').getBoundingClientRect().width - 4;
  const pageEm = D.tw + 2 * MP_SIDE;
  let fs, flow = false, widthPx;
  if (flip) {
    const slot = (spread ? box / 2 : box) - 6;
    const avail = innerHeight - sbH - $('#mpBar').getBoundingClientRect().height - (innerWidth <= 999 && !fsEl ? 78 : 22);
    fs = Math.min(slot / pageEm, Math.max(240, avail) / (MP_HEAD + MP_FOOT + 15 * MP_LINE + 2 * MP_PAD));
    widthPx = fs * pageEm;
  } else {
    const base = Math.min(box, 760), want = base * MP_SCALE[MPV.size];
    if (!MPV.lines) { flow = true; widthPx = Math.min(box, 840); fs = MP_COMF[MPV.size] * (innerWidth < 700 ? 0.78 : 1); }
    else if (want <= box + 1) { widthPx = want; fs = want / pageEm; }
    else { flow = true; widthPx = box; fs = Math.min(40, want / pageEm); }
  }
  MPV.fs = Math.max(10, fs);
  if (flow !== MPV.flow) { MPV.flow = flow; mpRefill(); }
  root.classList.toggle('mp-flow', flow); root.classList.toggle('mp-spread', spread);
  root.style.setProperty('--mpfs', MPV.fs.toFixed(2) + 'px');
  root.style.setProperty('--mpw', widthPx.toFixed(1) + 'px');
  root.style.setProperty('--mptw', D.tw + 'em');
  // ارتفاع كل صفحة ثابت محسوب مسبقاً، فلا يقفز التمرير عند رسم الصفحات
  const fixed = (MP_HEAD + MP_FOOT + 15 * MP_LINE + 2 * MP_PAD) * MPV.fs;
  const inner = widthPx / MPV.fs - 2 * MP_SIDE;
  $$('#mpRoot .mp-page').forEach((el, k) => {
    let h = fixed;
    if (flow) { const L = D.p[k], hd = L.filter(x => typeof x[0] !== 'number').length; const segs = [].concat(D.ws[k]); h = (MP_HEAD + MP_FOOT + 2 * MP_PAD + hd * (MP_LINE + 0.4) + (segs.reduce((t, w) => t + Math.ceil(w * (1 + 1.4 / inner) / inner), 0) + 1) * MP_FLOW_LINE) * MPV.fs; }
    el.style.height = h.toFixed(1) + 'px';
  });
  $('#mpSizeLbl').textContent = flip ? '' : !MPV.lines ? '' : MPV.flow ? 'نص منساب داخل الصفحة' : 'سطور المصحف';
  $$('#mpLay button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.l === +MPV.lines))); $('#mpLay').hidden = flip;
}
function mpSetMode(mode) {
  const root = $('#mpRoot'), p = MPV.cur; MPV.mode = mode;
  root.classList.toggle('mp-flip', mode === 'flip'); root.classList.toggle('mp-scroll', mode === 'scroll');
  $$('#mpMode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === mode));
  $('#mpSize').hidden = mode === 'flip';
  ST.prefs.mpMode = mode; save();
  mpMeasure(); mpObserve(); mpGo(p, null, true);
}
function mpObserve() {
  const root = $('#mpRoot'), sc = root.querySelector('.mp-scroller'), flip = MPV.mode === 'flip';
  if (MPV.io) MPV.io.disconnect(); if (MPV.posIO) MPV.posIO.disconnect();
  MPV.io = new IntersectionObserver(es => { for (const e of es) e.isIntersecting ? mpFill(e.target) : mpEmpty(e.target); }, { root: flip ? sc : null, rootMargin: flip ? '0px 220%' : '220% 0px' });
  const vis = new Map();
  MPV.posIO = new IntersectionObserver(es => {
    for (const e of es) vis.set(+e.target.dataset.p, e.intersectionRatio);
    let best = 0, bp = MPV.cur; for (const [p, r] of vis) if (r > best + 0.001 || (Math.abs(r - best) <= 0.001 && p < bp)) { best = r; bp = p; }
    if (best > 0 && !MPV.jumping) mpSetCur(bp);
  }, { root: flip ? sc : null, threshold: [0, .2, .4, .6, .8, 1] });
  root.querySelectorAll('.mp-page').forEach(el => { MPV.io.observe(el); MPV.posIO.observe(el); });
}
function mpSetCur(p) {
  if (!$('#mpRoot')) return;
  const D = MPV.data, a = mpFirstAyah(p), lb = mpLabels(p);
  MPV.cur = p; $('#mpPage').value = p; $('#mpInfo').textContent = `${lb.sur} · ${lb.juz}`;
  $('#mpSur').value = Q.ayat[a][0]; $('#mpJuz').value = D.j[a];
  let k = 0; for (let x = 0; x < D.q.length && D.pageOf[D.q[x]] <= p; x++) k = x; $('#mpHizb').value = (k >> 2) + 1;
  if (location.hash !== '#p' + p) history.replaceState(null, '', '#p' + p);
  if (ST.last !== a) { ST.last = a; clearTimeout(mpSetCur.t); mpSetCur.t = setTimeout(save, 900); }
}
function mpGo(p, ayah, instant) {
  p = Math.max(1, Math.min(604, (+p || 1) | 0)); const el = $('#mpg' + p); if (!el) return;
  MPV.jumping++; mpFill(el);
  const far = Math.abs(el.getBoundingClientRect().top) > innerHeight * 1.6 || (MPV.mode === 'flip' && Math.abs(p - MPV.cur) > 2);
  if (far) instant = true;
  const how = instant ? 'instant' : 'smooth';
  if (MPV.mode === 'flip') {
    const sp = $('#mpRoot').classList.contains('mp-spread'), tgt = sp && p % 2 === 0 ? $('#mpg' + (p - 1)) : el;
    const slot = tgt.parentElement;
    slot.scrollIntoView({ block: 'nearest', inline: 'start', behavior: how });
    const top = $('#mpRoot').getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle($('#mpRoot')).getPropertyValue('--mp-top') || 0);
    if (Math.abs(scrollY - top) > 4) scrollTo({ top, behavior: 'instant' });
  } else {
    const off = $('#mpBar').getBoundingClientRect().height + parseFloat(getComputedStyle($('#mpRoot')).getPropertyValue('--mp-top') || 0) + 8;
    let y = el.getBoundingClientRect().top + scrollY - off;
    if (ayah != null && !MPV.flow) { const L = MPV.data.lineOfA[ayah]; if (L > 3) y += (MP_PAD + MP_HEAD + (L - 2) * MP_LINE) * MPV.fs; }
    scrollTo({ top: Math.max(0, y), behavior: how });
  }
  setTimeout(() => { MPV.jumping = Math.max(0, MPV.jumping - 1); mpSetCur(p); }, instant ? 80 : 700);
  if (ayah != null) setTimeout(() => { $$(`#mpg${p} .w[data-a="${ayah}"],#mpg${p} .mp-n[data-ayah="${ayah}"]`).forEach(x => { x.classList.add('mp-hl'); setTimeout(() => x.classList.remove('mp-hl'), 2600); }); }, instant ? 120 : 750);
}
function mpStep(d) { const sp = $('#mpRoot')?.classList.contains('mp-spread'); let p = MPV.cur + d * (sp ? 2 : 1); if (sp && p % 2 === 0) p -= 1; mpGo(p); }

async function mushafRead(p, opt = {}) {
  if (!$('#mpCss')) { const l = document.createElement('link'); l.id = 'mpCss'; l.rel = 'stylesheet'; l.href = 'mushaf.css'; document.head.appendChild(l); }
  if ($('#mpRoot') && MPV.data) { if (opt.surah) mpGo(MPV.data.hdr[opt.surah][0], Q.surahs[opt.surah - 1].first); else if (opt.ayah != null) mpGo(MPV.data.pageOf[opt.ayah], opt.ayah); else mpGo(p); return; }
  V(`<p class="loading">جارٍ فتح المصحف…</p>`);
  let D; try { [D] = await Promise.all([mpData(), new Promise(r => { const l = $('#mpCss'); if (l.sheet) r(); else { l.addEventListener('load', r); l.addEventListener('error', r); } }).then(() => document.fonts.load('20px "KFGQPC Hafs"', 'بِسۡمِ'))]); }
  catch (e) { V(`<p class="loading">تعذّر فتح المصحف: ${esc(e.message)}</p>`); return; }
  if (!/^#p/.test(location.hash)) return; // انتقل الزائر إلى قسم آخر أثناء التحميل
  MPV.mode = ST.prefs.mpMode === 'flip' ? 'flip' : 'scroll'; MPV.size = [-1, 0, 1, 2, 3].includes(ST.prefs.mpSize) ? ST.prefs.mpSize : 0; MPV.flow = false; MPV.lines = ST.prefs.mpLines === true; // الافتراضي «قراءة مريحة»، و«سطور المصحف» اختيار
  if (opt.surah) p = D.hdr[opt.surah][0]; else if (opt.ayah != null) p = D.pageOf[opt.ayah];
  const sOpts = Q.surahs.map(s => `<option value="${s.n}">${MP_AR(s.n)}. ${s.name}</option>`).join('');
  const jOpts = Array.from({ length: 30 }, (_, j) => `<option value="${j + 1}">الجزء ${MP_AR(j + 1)}</option>`).join('');
  const hOpts = Array.from({ length: 60 }, (_, j) => `<option value="${j + 1}">الحزب ${MP_AR(j + 1)}</option>`).join('');
  $('#view').innerHTML = `<div id="mpRoot" class="mp-root">
  <div class="mp-bar" id="mpBar">
    <div class="mp-row">
      <a class="btn mp-ix" href="#mushaf" title="فهرس السور" aria-label="فهرس السور"><svg><use href="#i-grid"/></svg><span>الفهرس</span></a>
      <select id="mpSur" aria-label="السورة">${sOpts}</select>
      <select id="mpJuz" aria-label="الجزء">${jOpts}</select>
      <select id="mpHizb" class="mp-opt" aria-label="الحزب">${hOpts}</select>
      <label class="mp-pg"><span class="mp-pgl">صفحة</span><input id="mpPage" type="number" inputmode="numeric" min="1" max="604" value="${p}" aria-label="رقم الصفحة"></label>
      <button class="btn mp-more" id="mpMore" aria-expanded="false" aria-controls="mpOpts" aria-label="خيارات العرض">خيارات</button>
    </div>
    <div class="mp-row mp-opts" id="mpOpts">
      <div class="seg" id="mpMode" role="group" aria-label="طريقة العرض"><button data-m="scroll" aria-pressed="false">قراءة متصلة</button><button data-m="flip" aria-pressed="false">تقليب الصفحات</button></div>
      <div class="seg" id="mpLay" role="group" aria-label="هيئة النص"><button data-l="0" aria-pressed="false">قراءة مريحة</button><button data-l="1" aria-pressed="false">سطور المصحف</button></div>
      <div class="mp-size" id="mpSize" role="group" aria-label="حجم الخط"><button class="btn" data-d="-1" aria-label="تصغير الخط">أ−</button><span id="mpSizeLbl" class="mp-sizel"></span><button class="btn" data-d="1" aria-label="تكبير الخط">أ+</button></div>
      <button class="btn" id="mpPrev" aria-label="الصفحة السابقة">→ السابقة</button><button class="btn" id="mpNext" aria-label="الصفحة التالية">التالية ←</button>
      <button class="btn" id="mpFull" aria-label="ملء الشاشة">ملء الشاشة</button>
      <span class="mp-info" id="mpInfo"></span>
    </div>
  </div>
  <div class="mp-scroller notranslate" translate="no">${Array.from({ length: 604 }, (_, k) => `<div class="mp-slot"><article class="mp-page" id="mpg${k + 1}" data-p="${k + 1}" aria-label="الصفحة ${k + 1}"><span class="mp-ph">${MP_AR(k + 1)}</span></article></div>`).join('')}</div>
  <p class="mp-src muted small">النص: مصحف المدينة النبوية برواية حفص عن عاصم، نصّ مجمع الملك فهد لطباعة المصحف الشريف وخطّه العثماني دون أي تعديل، والصفحات والأسطر على طبعة المجمع (٦٠٤ صفحات). اضغط أي كلمة لمعرفة معناها وجذرها، أو رقم الآية لتفسيرها وحفظها ومشاركتها.</p>
  </div>`;
  const root = $('#mpRoot');
  $('#mpMore').onclick = () => { const on = !root.classList.contains('mp-showopts'); root.classList.toggle('mp-showopts', on); $('#mpMore').setAttribute('aria-expanded', on); };
  $('#mpMode').onclick = e => { const b = e.target.closest('button'); if (b && b.dataset.m !== MPV.mode) mpSetMode(b.dataset.m); };
  $('#mpLay').onclick = e => { const b = e.target.closest('button'); if (!b) return; const v = b.dataset.l === '1'; if (v === MPV.lines) return; MPV.lines = v; ST.prefs.mpLines = v; save(); const p0 = MPV.cur; mpMeasure(); mpRefill(); mpGo(p0, null, true); };
  $('#mpSize').onclick = e => { const b = e.target.closest('button'); if (!b) return; const s = Math.max(-1, Math.min(3, MPV.size + +b.dataset.d)); if (s === MPV.size) return; MPV.size = s; ST.prefs.mpSize = s; save(); const p0 = MPV.cur; mpMeasure(); mpGo(p0, null, true); };
  $('#mpSur').onchange = e => { const s = +e.target.value; mpGo(D.hdr[s][0], Q.surahs[s - 1].first); };
  $('#mpJuz').onchange = e => { const a = D.q[(+e.target.value - 1) * 8]; mpGo(D.pageOf[a], a); };
  $('#mpHizb').onchange = e => { const a = D.q[(+e.target.value - 1) * 4]; mpGo(D.pageOf[a], a); };
  $('#mpPage').onchange = e => mpGo(+e.target.value);
  $('#mpPage').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); mpGo(+e.target.value); } };
  $('#mpPrev').onclick = () => mpStep(-1); $('#mpNext').onclick = () => mpStep(1);
  $('#mpFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen?.(); else root.requestFullscreen?.().catch(() => toast('ملء الشاشة غير متاح في هذا المتصفح')); };
  root.classList.add(MPV.mode === 'flip' ? 'mp-flip' : 'mp-scroll');
  $$('#mpMode button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === MPV.mode)); $('#mpSize').hidden = MPV.mode === 'flip';
  mpMeasure(); mpObserve();
  mpGo(p, opt.surah ? Q.surahs[opt.surah - 1].first : opt.ayah, true);
}
addEventListener('resize', () => { if (!$('#mpRoot')) return; clearTimeout(mpMeasure.t); mpMeasure.t = setTimeout(() => { const p = MPV.cur; mpMeasure(); mpGo(p, null, true); }, 180); });
document.addEventListener('fullscreenchange', () => { if ($('#mpRoot')) setTimeout(() => { const p = MPV.cur; mpMeasure(); mpGo(p, null, true); }, 150); });
document.addEventListener('keydown', e => {
  if (!$('#mpRoot') || MPV.mode !== 'flip' || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'ArrowLeft' || e.key === 'PageDown') { e.preventDefault(); mpStep(1); }
  else if (e.key === 'ArrowRight' || e.key === 'PageUp') { e.preventDefault(); mpStep(-1); }
});
