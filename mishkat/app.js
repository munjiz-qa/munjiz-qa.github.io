'use strict';
/* مشكاة — موسوعة القرآن الذكية. One codebase for the claude.ai build and the installable PWA build. */
const BUILD = window.MISHKAT_BUILD || 'pwa';
const IS_PWA = BUILD === 'pwa';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const NF = new Intl.NumberFormat('ar-EG');
const n = x => NF.format(x);
const POS = {N:'اسم',PN:'اسم علم',ADJ:'صفة',ACT_PCPL:'اسم فاعل',PASS_PCPL:'اسم مفعول',PRON:'ضمير',REL:'اسم موصول',DEM:'اسم إشارة',T:'ظرف زمان',LOC:'ظرف مكان',VN:'مصدر',VPERF:'فعل ماضٍ',VIMPF:'فعل مضارع',VIMPV:'فعل أمر',P:'حرف'};
let Q, W, T, TF, GEO;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const strip = s => s.replace(/[ً-ٰٟۖ-ࣰۭ-ࣿـ]/g, '');
const norm = s => strip(s).replace(/[ٱأإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي').trim();
const rootFmt = r => r ? r.split('').join(' ') : '—';
const plural = (k, one, few, many) => k === 1 ? one : (k >= 3 && k <= 10 ? few : many);

/* ================= storage: local first, synced to the viewer's private cloud record when available */
const LS = {
  get(k, d) { try { const v = localStorage.getItem('mishkat:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('mishkat:' + k, JSON.stringify(v)); } catch (e) {} },
};
/* accounts (standalone build): visitor, client and full admin. Everything runs in the browser; no outside service is called */
let SESSION = IS_PWA ? LS.get('session', null) : null;
const stateKey = () => SESSION ? 'state@' + SESSION.u : 'state';
const ST = {};
function loadState() {
  for (const k of Object.keys(ST)) delete ST[k];
  Object.assign(ST, { bookmarks: [], last: null, hifz: {}, prefs: { tafsir: 'muyassar', size: 1, theme: 'auto' }, updated: 0 }, LS.get(stateKey(), {}));
  ST.prefs = Object.assign({ tafsir: 'muyassar', size: 1, theme: 'auto' }, ST.prefs || {});
}
loadState();
let cloud = null; // {db, uid}
let saveTimer = 0;
function save() {
  ST.updated = Date.now();
  LS.set(stateKey(), ST);
  clearTimeout(saveTimer);
  if (cloud) saveTimer = setTimeout(() => {
    cloud.db.doc(`data/users/${cloud.uid}/state/main`).set(JSON.parse(JSON.stringify(ST))).catch(() => {});
  }, 1500);
}

/* ================= data loading */
const FILE_MODE = location.protocol === 'file:';
window.__ATH = window.__ATH || {};
function scriptData(url) { // file:// pages cannot fetch(); every data file also ships as a .js twin
  if (window.__ATH[url] != null) return Promise.resolve(window.__ATH[url]);
  return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = url + '.js'; sc.onload = () => { const v = window.__ATH[url]; delete window.__ATH[url]; sc.remove(); v == null ? rej(new Error(url)) : res(v); }; sc.onerror = () => rej(new Error(url)); document.head.appendChild(sc); });
}
async function getText(url) { if (FILE_MODE) return scriptData(url); const r = await fetch(url); if (!r.ok) throw new Error(url); return r.text(); }
async function getJSON(url) { return JSON.parse(await getText(url)); }
async function gz(url) {
  const bin = atob((await getText(url)).trim());
  const buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const s = new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));
  return JSON.parse(await new Response(s).text());
}
const tcache = {};
async function tafsir(key, s) {
  const b = TF.find(x => x.key === key); const ch = b.map[s - 1]; const k = key + ch;
  if (!tcache[k]) tcache[k] = gz(`data/t/${key}/${ch}.txt`).catch(e => { delete tcache[k]; throw e; });
  return (await tcache[k])[s] || {};
}
let MU = null; // التفسير الميسر كاملاً، للبحث بالمعنى
async function muyassarAll() { if (!MU) MU = gz('data/t/muyassar/0.txt'); return MU; }

/* ================= helpers on the text */
const ref = i => { const a = Q.ayat[i]; return `${Q.surahs[a[0]-1].name} ${n(a[1])}`; };
const refLink = i => `<a data-ayah="${i}">${esc(ref(i))}</a>`;
const ayahText = i => { const a = Q.ayat[i]; let t = []; for (let k = 0; k < a[3]; k++) t.push(W.w[a[2]+k][0]); return t.join(' '); };
const idxOf = (s, a) => { const su = Q.surahs[s-1]; if (!su || a < 1 || a > su.ayas) return -1; return su.first + a - 1; };
function ayahHTML(i, hl, clickable = true) {
  const a = Q.ayat[i]; let h = '';
  for (let k = 0; k < a[3]; k++) { const wi = a[2]+k, f = esc(W.w[wi][0]);
    h += (hl && hl.has(wi)) ? `<mark>${f}</mark> ` : clickable ? `<span class="w" data-word="${wi}">${f}</span> ` : f + ' '; }
  return `<div class="ayah">${h}<span class="num" data-ayah="${i}">﴿${n(a[1])}﴾</span></div>`;
}
let wordsByLemma, wordsByRoot, surahOf, uniqForms, rootByKey;
function prep() {
  wordsByLemma = new Map(); wordsByRoot = new Map();
  W.w.forEach((w, i) => { (wordsByLemma.get(w[1]) || wordsByLemma.set(w[1], []).get(w[1])).push(i);
    if (w[2] >= 0) (wordsByRoot.get(w[2]) || wordsByRoot.set(w[2], []).get(w[2])).push(i); });
  surahOf = new Int16Array(W.w.length); Q.ayat.forEach(a => { for (let k = 0; k < a[3]; k++) surahOf[a[2]+k] = a[0]; });
  W.a = new Int32Array(W.w.length); Q.ayat.forEach((a, i) => { for (let k = 0; k < a[3]; k++) W.a[a[2]+k] = i; });
  const fm = new Map(); W.w.forEach(w => { const k = strip(w[0]); fm.set(k, (fm.get(k) || 0) + 1); }); uniqForms = fm;
  rootByKey = new Map(); W.roots.forEach((r, i) => rootByKey.set(norm(r[0]), i));
}
const topicItem = (cat, name) => { const c = T.find(x => x.id === cat); if (!c) return null; const k = c.items.findIndex(x => x.n === name || x.n.startsWith(name)); return k < 0 ? null : { c, k, it: c.items[k] }; };
const itemAyat = it => it ? (it.a || (it.r ? it.r.flatMap(([s, e]) => { const o = []; for (let i = s; i <= e; i++) o.push(i); return o; }) : [])) : [];

/* ================= navigation */
const NAV = [
  ['الأساس', [['home','الرئيسية','i-home'],['mushaf','المصحف','i-book'],['stats','الإحصاء العام','i-chart'],['words','المعجم المفهرس','i-abc'],['topics','الموسوعة الموضوعية','i-grid']]],
  ['الذكاء', [['search','البحث بالمعنى','i-search',1],['ask','اسأل مشكاة','i-spark',1]]],
  ['الحفظ والتلاوة', [['hifz','الحفظ والتسميع','i-mic',1],['saved','محفوظاتي','i-bookmark']]],
  ['الاستكشاف', [['map','أطلس القرآن','i-map',1],['timeline','الخط الزمني','i-time',1],['graph','شبكة المعرفة','i-graph',1]]],
  ['التطبيق', [['guide','دليل التطبيق','i-info',1],['account','حسابي','i-user'],['settings','الإعدادات','i-gear'],['about','المنهج والمصادر','i-info'],['admin','لوحة الإدارة','i-shield']]],
];
let isOwner = false;
function navHTML() {
  return NAV.map(([sec, items]) => `<div class="sec">${sec}</div>` + items.filter(([v]) => (v !== 'admin' || (IS_PWA ? isAdmin() : isOwner)) && (v !== 'account' || IS_PWA))
    .map(([v, l, ic, nw]) => `<a href="#${v}" data-v="${v}"><svg><use href="#${ic}"/></svg>${l}${nw ? '<span class="new">جديد</span>' : ''}</a>`).join('')).join('');
}
function drawNav() { $('#nav').innerHTML = navHTML(); }
const V = html => { $('#view').innerHTML = html; };
const views = { home, mushaf, stats, words, topics, search, ask, hifz, saved, map: atlas, timeline, graph, settings, about, admin, guide, account };
function route() {
  const h = (location.hash || '#home').slice(1);
  let m, cur;
  if (m = h.match(/^s(\d+)$/)) { cur = 'mushaf'; surah(+m[1]); }
  else if (m = h.match(/^a(\d+)-(\d+)$/)) { cur = 'mushaf'; surah(+m[1], +m[2]); }
  else if (m = h.match(/^t-([a-z]+)$/)) { cur = 'topics'; topic(m[1]); }
  else if (m = h.match(/^root(\d+)$/)) { cur = 'words'; rootView(+m[1]); }
  else if (m = h.match(/^lem(\d+)$/)) { cur = 'words'; lemmaView(+m[1]); }
  else { cur = views[h] ? h : 'home'; views[cur](); }
  setCur(cur);
  if (!/^a\d/.test(h)) window.scrollTo(0, 0);
}
function setCur(v) { $$('#nav a,#tabbar a').forEach(a => { if (a.dataset.v === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }
async function copyText(s) { try { await navigator.clipboard.writeText(s); toast('نُسخ النص'); } catch (e) { toast('تعذّر النسخ، حدّد النص يدوياً'); } }

/* ================= daily ayah */
const DAILY = [[2,255],[2,286],[3,190],[3,200],[13,28],[14,7],[16,97],[17,23],[18,10],[20,114],[21,87],[24,35],[25,63],[29,69],[31,17],[33,41],[39,53],[40,60],[49,13],[55,13],[57,4],[59,22],[65,2],[67,1],[94,5],[2,152],[2,186],[3,8],[3,139],[4,58],[5,8],[6,162],[7,56],[9,51],[10,62],[11,88],[12,87],[15,9],[16,128],[17,9],[18,46],[19,96],[22,46],[23,1],[28,77],[30,21],[35,28],[41,34],[42,30],[50,16],[51,56],[58,11],[64,16],[73,20],[89,27],[93,5],[103,1]];
let siteCfg = {};
function dailyIndex() {
  if (siteCfg.featured) { const i = idxOf(siteCfg.featured.s, siteCfg.featured.a); if (i >= 0) return i; }
  const d = Math.floor(Date.now() / 864e5); const [s, a] = DAILY[d % DAILY.length]; return idxOf(s, a);
}

/* ================= home */
function home() {
  const di = dailyIndex();
  const last = ST.last != null ? ST.last : null;
  const due = dueList();
  const F = [
    ['search','i-search','البحث بالمعنى','اكتب الفكرة بلغتك، فتظهر الآيات ذات الصلة مرتبةً بالأقرب، مع التفسير الميسر.'],
    ['ask','i-spark','اسأل مشكاة', IS_PWA ? 'مساعد بحث يجمع لك الآيات وأقوال المفسرين والمداخل الموضوعية في سؤالك، على جهازك.' : 'مساعد ذكي يجيب من الآيات والتفاسير المعتمدة ويذكر المواضع، ولا يفتي.'],
    ['hifz','i-mic','الحفظ والتسميع','إخفاء تدريجي، واختبار بالكتابة، وتسميع بالصوت، وجدول مراجعة يتذكّر مستواك.'],
    ['map','i-map','أطلس القرآن','خريطة تفاعلية للمدن والقرى والأماكن الواردة في القرآن مع آياتها.'],
    ['timeline','i-time','الخط الزمني','الأنبياء على ترتيب المؤرخين، وأحداث السيرة بسنواتها من الآيات.'],
    ['graph','i-graph','شبكة المعرفة','علاقات الأنبياء بأقوامهم وأماكنهم والسور التي ذُكروا فيها.'],
  ];
  V(`<div class="stack">
  <div class="hero">
    <section class="daily stack tight"><div class="eyebrow">${siteCfg.featured ? 'آية مختارة' : 'آية اليوم'} · ${esc(ref(di))}</div>
      ${ayahHTML(di, null, false)}
      ${siteCfg.featuredNote ? `<p style="margin:0;opacity:.9">${esc(siteCfg.featuredNote)}</p>` : ''}
      <div class="toolbar"><button class="btn" data-ayah="${di}">التفسير</button><button class="btn" data-card="${di}"><svg><use href="#i-image"/></svg>بطاقة للمشاركة</button><a class="btn" href="#a${Q.ayat[di][0]}-${Q.ayat[di][1]}">في سياقها</a></div>
    </section>
    <section class="panel stack tight">
      <h2>متابعتك</h2>
      ${last != null ? `<a class="row" href="#a${Q.ayat[last][0]}-${Q.ayat[last][1]}"><span class="t">أكمل القراءة من <b>${esc(ref(last))}</b></span><span class="n">←</span></a>` : `<p class="muted small" style="margin:0">ابدأ القراءة من <a href="#mushaf">المصحف</a>، وسيحفظ التطبيق موضعك تلقائياً.</p>`}
      <a class="row" href="#hifz"><span class="t">مقاطع للمراجعة اليوم</span><span class="n">${n(due.length)}</span></a>
      <a class="row" href="#saved"><span class="t">الآيات المحفوظة في علاماتك</span><span class="n">${n(ST.bookmarks.length)}</span></a>
      <div class="pill-row" style="margin-top:4px">${cloud ? '<span class="chip ok">تقدّمك محفوظ في حسابك ويتزامن بين أجهزتك</span>' : SESSION ? `<a class="chip ok" href="#account">حسابك: ${esc(SESSION.name)} · ${ROLE[SESSION.role]}</a>` : IS_PWA ? '<span class="chip">تقدّمك محفوظ على هذا الجهاز</span><a class="chip acc" href="#account">ادخل إلى حسابك</a>' : '<span class="chip">تقدّمك محفوظ على هذا الجهاز</span>'}${IS_PWA && installEvt ? '<button class="chip acc" id="homeInst">ثبّت مشكاة على جهازك</button>' : ''}</div>
    </section>
  </div>
  <div class="grid tiles">
    ${[['سورة',Q.surahs.length],['آية',Q.ayat.length],['كلمة',W.w.length],['جذراً',W.roots.length],['كتب تفسير',TF.length]].map(([k,v]) => `<div class="tile"><b>${n(v)}</b><span>${k}</span></div>`).join('')}
  </div>
  <section class="stack tight"><div class="toolbar" style="justify-content:space-between"><h2>ما الجديد في مشكاة</h2><a class="btn" href="#guide">دليل التطبيق والمتطلبات</a></div>
    <div class="grid feat">${F.map(([h,ic,t,d]) => `<a class="fcard" href="#${h}"><span class="ic"><svg><use href="#${ic}"/></svg></span><b>${t}</b><p>${d}</p></a>`).join('')}</div></section>
  <section class="stack tight"><h2>الموسوعة الموضوعية</h2>
    <div class="grid cats">${T.slice(0, 8).map(c => `<a class="cat" href="#t-${c.id}"><span class="eyebrow">${n(c.items.length)} مدخلاً</span><h3>${c.title}</h3><p>${esc(c.intro)}</p></a>`).join('')}</div>
    <a class="btn" href="#topics" style="align-self:flex-start">كل الفهارس (${n(T.length)})</a></section>
  </div>`);
  const hi = $('#homeInst'); if (hi) hi.onclick = async () => { installEvt.prompt(); await installEvt.userChoice; installEvt = null; hi.remove(); };
}

/* ================= statistics (from v1) */
function stats() {
  const S = Q.surahs, tot = W.w.length, c = Q.checks;
  const mk = S.filter(s => s.type === 'مكية'), md = S.filter(s => s.type === 'مدنية');
  const lf = Q.letters, maxL = lf[0][1];
  const topL = W.lemmas.map((l, i) => [i, l]).filter(([i, l]) => l[2] !== 'P').sort((a, b) => b[1][3] - a[1][3]).slice(0, 15);
  const topR = W.roots.map((r, i) => [i, r]).sort((a, b) => b[1][1] - a[1][1]).slice(0, 15);
  const posC = {}; W.w.forEach(w => { const p = Q.pos[w[3]]; posC[p] = (posC[p] || 0) + 1; });
  const grp = {'الأسماء':['N','PN','ADJ','ACT_PCPL','PASS_PCPL','PRON','REL','DEM','T','LOC','VN'],'الأفعال':['VPERF','VIMPF','VIMPV'],'الحروف':['P']};
  const gsum = Object.entries(grp).map(([k, v]) => [k, v.reduce((s, p) => s + (posC[p] || 0), 0)]);
  const longest = [...S].sort((a, b) => b.ayas - a.ayas)[0], shortest = [...S].sort((a, b) => a.words - b.words)[0];
  V(`<div class="stack">
  <div><div class="eyebrow">الإحصاء العام للقرآن الكريم</div><h1>كل لفظ، وكل جذر، وكل حرف في المصحف</h1>
  <p class="lead">إحصاء مبني على نص مصحف المدينة النبوية (مجمع الملك فهد، رواية حفص عن عاصم) مطابقاً بمدونة القرآن الصرفية.</p></div>
  <div class="grid tiles">
    ${[['السور',S.length],['الآيات',Q.ayat.length],['الكلمات',tot],['الصيغ المختلفة',uniqForms.size],['اللمّات (الأصول المعجمية)',W.lemmas.length],['الجذور',W.roots.length],['الحروف',c.letters],['الأجزاء',30],['الصفحات',604],['سجدات التلاوة',Q.sajdas.length]]
      .map(([k, v]) => `<div class="tile"><b>${n(v)}</b><span>${k}</span></div>`).join('')}
  </div>
  <div class="cols">
    <section class="panel stack"><h2>تحقق سلامة النص</h2>
      <p class="muted" style="margin:0">قوبل رسم كل آية في نسخة مجمع الملك فهد (الإصدار ١٣) بنص مدونة القرآن العربية المبني على نسخة «تنزيل» الموثقة، بعد تجريد الحروف من الحركات والعلامات.</p>
      <div class="pill-row"><span class="chip ok">مطابقة تامة في ${n(Q.ayat.length - 2)} آية من ${n(Q.ayat.length)}</span><span class="chip">${n(S.length)} سورة</span><span class="chip">العدّ الكوفي</span></div>
      <p style="margin:0;font-size:.9rem">الآيتان المتبقيتان (يوسف ٣٩ و٤١: «يَا صَاحِبَيِ السِّجْنِ») تختلفان في رسم الياء الصغيرة فقط، والقراءة واحدة.</p>
      <p class="src" style="margin:0">بصمة الملف (SHA-256): <code>${c.sha256_hafs}</code></p>
    </section>
    <section class="panel stack"><h2>أقسام الكلم</h2>
      <div class="hbars">${gsum.map(([k, v]) => `<div class="hbar" style="grid-template-columns:4.2em 1fr 7em"><span>${k}</span><i style="width:${(v/tot*100).toFixed(1)}%"></i><em>${n(v)} (${n(+(v/tot*100).toFixed(1))}٪)</em></div>`).join('')}</div>
      <div class="pill-row">${Object.entries(posC).sort((a, b) => b[1] - a[1]).map(([p, v]) => `<span class="chip">${POS[p]}: ${n(v)}</span>`).join('')}</div>
      <h3>المكي والمدني</h3>
      <div class="pill-row"><span class="chip gold">مكية: ${n(mk.length)} سورة · ${n(mk.reduce((s, x) => s + x.ayas, 0))} آية</span><span class="chip gold">مدنية: ${n(md.length)} سورة · ${n(md.reduce((s, x) => s + x.ayas, 0))} آية</span></div>
      <p class="muted" style="margin:0;font-size:.9rem">أطول السور: ${longest.name} (${n(longest.ayas)} آية). أقصرها: ${shortest.name} (${n(shortest.words)} كلمات). متوسط كلمات الآية: ${n(+(tot/Q.ayat.length).toFixed(1))}.</p>
    </section>
  </div>
  <div class="cols">
    <section class="panel stack"><h2>تكرار الحروف</h2><p class="muted" style="margin:0;font-size:.88rem">عدد مرات ورود كل حرف في رسم المصحف (الهمزة وألف الوصل حرفان مستقلان).</p>
      <div class="hbars">${lf.map(([k, v]) => `<div class="hbar"><span class="k">${k}</span><i style="width:${(v/maxL*100).toFixed(1)}%"></i><em>${n(v)}</em></div>`).join('')}</div></section>
    <div class="stack">
    <section class="panel stack"><h2>أكثر الألفاظ وروداً</h2><div class="list">${topL.map(([i, l]) => `<div class="row" data-lem="${i}"><span class="t"><b style="font-family:var(--f-quran);font-size:1.2rem">${esc(l[0])}</b> <span class="muted">· ${rootFmt(l[1])}</span></span><span class="n">${n(l[3])}</span></div>`).join('')}</div></section>
    <section class="panel stack"><h2>أكثر الجذور وروداً</h2><div class="list">${topR.map(([i, r]) => `<div class="row" data-root="${i}"><span class="t"><b>${rootFmt(r[0])}</b></span><span class="n">${n(r[1])}</span></div>`).join('')}</div></section>
    </div>
  </div></div>`);
}

/* ================= mushaf */
function mushaf() {
  let sort = 'n', dir = 1, filt = '';
  const draw = () => {
    const rows = Q.surahs.filter(s => !filt || s.type === filt).sort((a, b) => (a[sort] > b[sort] ? 1 : -1) * dir);
    $('#stbl').innerHTML = rows.map(s => `<tr class="clk" data-surah="${s.n}"><td>${n(s.n)}</td><td><b>${s.name}</b></td><td>${s.type}</td><td>${n(s.ayas)}</td><td>${n(s.words)}</td><td>${n(s.letters)}</td><td>${n(Q.ayat[s.first][5])}</td><td>${n(Q.ayat[s.first][6])}</td></tr>`).join('');
  };
  V(`<div class="stack"><div><div class="eyebrow">المصحف وفهرس السور</div><h1>السور المئة والأربع عشرة</h1><p class="lead">اضغط على السورة لقراءتها، وعلى أي كلمة لمعرفة جذرها ومعناها، وعلى رقم الآية لتفسيرها وحفظها ومشاركتها.</p></div>
  ${ST.last != null ? `<a class="btn pri" style="align-self:flex-start" href="#a${Q.ayat[ST.last][0]}-${Q.ayat[ST.last][1]}">أكمل القراءة: ${esc(ref(ST.last))}</a>` : ''}
  <div class="toolbar"><div class="seg" id="tseg"><button aria-pressed="true" data-f="">الكل</button><button aria-pressed="false" data-f="مكية">المكية</button><button aria-pressed="false" data-f="مدنية">المدنية</button></div>
   <select id="juzSel" aria-label="الانتقال إلى جزء"><option value="">الانتقال إلى جزء…</option>${Array.from({length: 30}, (_, j) => `<option value="${j+1}">الجزء ${n(j+1)}</option>`).join('')}</select></div>
  <div class="tablebox"><table><thead><tr>${[['n','م'],['name','السورة'],['type','النزول'],['ayas','الآيات'],['words','الكلمات'],['letters','الحروف'],['juz','الجزء'],['page','الصفحة']].map(([k, l]) => `<th data-sort="${k}">${l}</th>`).join('')}</tr></thead><tbody id="stbl"></tbody></table></div></div>`);
  draw();
  $('#view thead').onclick = e => { const k = e.target.dataset.sort; if (!k || k === 'juz' || k === 'page') return; dir = sort === k ? -dir : 1; sort = k; draw(); };
  $('#tseg').onclick = e => { const b = e.target.closest('button'); if (!b) return; filt = b.dataset.f; $('#tseg').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); };
  $('#juzSel').onchange = e => { const j = +e.target.value; if (!j) return; const i = Q.ayat.findIndex(a => a[5] === j); location.hash = `a${Q.ayat[i][0]}-${Q.ayat[i][1]}`; };
}
let readObs = null;
function surah(sn, focusA) {
  const s = Q.surahs[sn - 1]; if (!s) return mushaf();
  const ay = []; for (let i = s.first; i < s.first + s.ayas; i++) ay.push(i);
  const lc = new Map(); ay.forEach(i => { const a = Q.ayat[i]; for (let k = 0; k < a[3]; k++) { const l = W.w[a[2]+k][1]; if (W.lemmas[l][2] !== 'P') lc.set(l, (lc.get(l) || 0) + 1); } });
  const top = [...lc].sort((a, b) => b[1] - a[1]).slice(0, 12);
  const bas = sn !== 1 && sn !== 9 ? `<div class="ayah basmala">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</div>` : '';
  V(`<div class="stack"><div><div class="eyebrow">سورة رقم ${n(sn)} · ${s.type}</div><h1>سورة ${s.name}</h1>
    <div class="pill-row" style="margin-top:8px"><span class="chip">${n(s.ayas)} آية</span><span class="chip">${n(s.words)} كلمة</span><span class="chip">${n(s.letters)} حرف</span><span class="chip">${n(lc.size)} لفظاً مختلفاً</span><span class="chip">الجزء ${n(Q.ayat[s.first][5])} · الصفحة ${n(Q.ayat[s.first][6])}</span></div>
    <div class="toolbar" style="margin-top:10px">${sn > 1 ? `<a class="btn" href="#s${sn-1}">→ ${Q.surahs[sn-2].name}</a>` : ''}${sn < 114 ? `<a class="btn" href="#s${sn+1}">${Q.surahs[sn].name} ←</a>` : ''}
    <a class="btn" href="#hifz" data-hifz="${sn}"><svg><use href="#i-mic"/></svg>احفظ هذه السورة</a>${IS_PWA ? `<button class="btn" id="playSurah"><svg><use href="#i-play"/></svg>استمع</button>` : ''}</div></div>
    <section class="panel"><h3>أكثر ألفاظ السورة وروداً</h3><div class="pill-row" style="margin-top:8px">${top.map(([l, c]) => `<a class="chip acc" data-lem="${l}">${esc(W.lemmas[l][0])} · ${n(c)}</a>`).join('')}</div></section>
    <section class="panel" id="reader"><p class="muted small" style="margin:0 0 6px">اضغط أي كلمة لمعرفة جذرها ووزنها ومواضعها، أو رقم الآية لعرض تفسيرها.</p>${bas}
    ${ay.map(i => `<div class="occ" id="ay${i}" data-i="${i}">${ayahHTML(i)}</div>`).join('')}</section></div>`);
  if (focusA) { const el = $('#ay' + (s.first + focusA - 1)); if (el) { el.scrollIntoView({ block: 'center' }); el.style.background = 'var(--accent-soft)'; } }
  else window.scrollTo(0, 0);
  if (readObs) readObs.disconnect();
  readObs = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { ST.last = +e.target.dataset.i; clearTimeout(surah.t); surah.t = setTimeout(save, 800); } }, { rootMargin: '-40% 0px -55% 0px' });
  $$('#reader .occ').forEach(el => readObs.observe(el));
  const pb = $('#playSurah'); if (pb) pb.onclick = () => playFrom(s.first, s.first + s.ayas - 1, pb);
}

/* ================= audio (PWA build only: the claude.ai frame does not allow outside media) */
let audio = null;
function audioUrl(i) { const a = Q.ayat[i]; return `https://everyayah.com/data/Alafasy_128kbps/${String(a[0]).padStart(3,'0')}${String(a[1]).padStart(3,'0')}.mp3`; }
function playFrom(i, end, btn) {
  if (audio) { audio.pause(); audio = null; if (btn) btn.innerHTML = '<svg><use href="#i-play"/></svg>استمع'; return; }
  audio = new Audio(); let cur = i;
  const go = () => { audio.src = audioUrl(cur); audio.play().catch(() => toast('تعذّر تشغيل التلاوة، تحقق من الاتصال')); $$('.occ').forEach(e => e.style.background = ''); const el = $('#ay' + cur); if (el) { el.style.background = 'var(--accent-soft)'; el.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
  audio.onended = () => { if (cur < end) { cur++; go(); } else { audio = null; if (btn) btn.innerHTML = '<svg><use href="#i-play"/></svg>استمع'; } };
  if (btn) btn.innerHTML = '<svg><use href="#i-play"/></svg>إيقاف';
  go();
}

/* ================= words explorer (from v1) */
function words() {
  let mode = 'roots', q = '';
  const draw = () => {
    const nq = norm(q); let rows;
    if (mode === 'roots') rows = W.roots.map((r, i) => ({ k: `root${i}`, t: `<b>${rootFmt(r[0])}</b> <span class="muted">· ${n(new Set(wordsByRoot.get(i).map(w => W.w[w][1])).size)} لمّة</span>`, c: r[1], s: norm(r[0]) }));
    else if (mode === 'lemmas') rows = W.lemmas.map((l, i) => ({ k: `lem${i}`, t: `<b style="font-family:var(--f-quran);font-size:1.2rem">${esc(l[0])}</b> <span class="muted">· ${l[2]==='V'?'فعل':l[2]==='N'?'اسم':'حرف'} · ${rootFmt(l[1])}</span>`, c: l[3], s: norm(l[0]) }));
    else rows = [...uniqForms].map(([f, c]) => ({ k: '', f, t: `<b style="font-family:var(--f-quran);font-size:1.2rem">${esc(f)}</b>`, c, s: norm(f) }));
    if (nq) rows = rows.filter(r => r.s.includes(nq.replace(/\s/g, '')));
    rows.sort((a, b) => b.c - a.c);
    $('#wcount').textContent = `${n(rows.length)} نتيجة`;
    const lim = +($('#wlist').dataset.lim || 300);
    $('#wlist').innerHTML = rows.slice(0, lim).map(r => `<div class="row" ${r.k ? `data-go="${r.k}"` : `data-form="${esc(r.f)}"`}><span class="t">${r.t}</span><span class="n">${n(r.c)}</span></div>`).join('') + (rows.length > lim ? `<button class="btn more" id="wmore">عرض المزيد (${n(rows.length - lim)})</button>` : '');
    const mb = $('#wmore'); if (mb) mb.onclick = () => { $('#wlist').dataset.lim = lim + 500; draw(); };
  };
  V(`<div class="stack"><div><div class="eyebrow">المعجم المفهرس</div><h1>الألفاظ والجذور</h1><p class="lead">${n(W.roots.length)} جذراً و${n(W.lemmas.length)} لمّة و${n(uniqForms.size)} صيغة مختلفة. اختر الجذر أو اللفظ لعرض عدد وروده وتوزيعه على السور وجميع مواضعه.</p></div>
  <div class="toolbar"><div class="seg" id="wseg"><button aria-pressed="true" data-m="roots">الجذور</button><button aria-pressed="false" data-m="lemmas">الألفاظ</button><button aria-pressed="false" data-m="forms">الصيغ كما رُسمت</button></div>
  <input id="wq" type="search" placeholder="اكتب جذراً أو لفظاً، مثل: رحم أو كتاب"><span class="muted" id="wcount"></span></div>
  <section class="panel"><div class="list" id="wlist"></div></section></div>`);
  $('#wseg').onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; $('#wlist').dataset.lim = 300; $('#wseg').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); };
  $('#wq').oninput = e => { q = e.target.value; $('#wlist').dataset.lim = 300; draw(); };
  $('#wlist').onclick = e => { const r = e.target.closest('.row'); if (!r) return; if (r.dataset.go) location.hash = r.dataset.go; else formView(r.dataset.form); };
  draw();
}
function distBar(ws) {
  const c = new Array(115).fill(0); ws.forEach(w => c[surahOf[w]]++); const m = Math.max(...c);
  return `<div class="dist" aria-label="التوزيع على السور">${c.slice(1).map((v, i) => `<i title="${Q.surahs[i].name}: ${n(v)}" style="height:${(v/m*100)}%"></i>`).join('')}</div><div class="muted" style="display:flex;justify-content:space-between;font-size:.75rem"><span>الفاتحة</span><span>الناس</span></div>`;
}
function occList(ws, title, sub, extra = '') {
  const ay = [...new Set(ws.map(w => W.a[w]))], hl = new Set(ws);
  const bySurah = new Map(); ws.forEach(w => bySurah.set(surahOf[w], (bySurah.get(surahOf[w]) || 0) + 1));
  const forms = new Map(); ws.forEach(w => { const f = strip(W.w[w][0]); forms.set(f, (forms.get(f) || 0) + 1); });
  V(`<div class="stack"><div><a class="btn" href="#words">→ المعجم المفهرس</a></div>
  <div><div class="eyebrow">${sub}</div><h1 style="font-family:var(--f-quran);font-weight:400;font-size:2.2rem">${title}</h1>
  <div class="pill-row" style="margin-top:8px"><span class="chip acc">ورد ${n(ws.length)} مرة</span><span class="chip">في ${n(ay.length)} آية</span><span class="chip">في ${n(bySurah.size)} سورة</span></div></div>
  ${extra}
  <section class="panel stack"><h3>التوزيع على السور</h3>${distBar(ws)}
   <div class="pill-row">${[...bySurah].sort((a, b) => b[1] - a[1]).slice(0, 20).map(([s, c]) => `<a class="chip" href="#s${s}">${Q.surahs[s-1].name}: ${n(c)}</a>`).join('')}</div></section>
  <section class="panel stack"><h3>الصيغ الواردة (${n(forms.size)})</h3><div class="pill-row">${[...forms].sort((a, b) => b[1] - a[1]).map(([f, c]) => `<span class="chip" style="font-family:var(--f-quran);font-size:1rem">${esc(f)} · ${n(c)}</span>`).join('')}</div></section>
  <section class="panel"><h3>المواضع</h3><div id="occ"></div></section></div>`);
  renderOcc($('#occ'), ay, hl);
}
function renderOcc(el, ay, hl, step = 100, extra) {
  let shown = 0;
  const more = () => { const part = ay.slice(shown, shown + step); shown += part.length;
    el.querySelector('.more')?.remove();
    el.insertAdjacentHTML('beforeend', part.map(i => `<div class="occ"><div class="ref">${refLink(i)}<span>· الجزء ${n(Q.ayat[i][5])} · الصفحة ${n(Q.ayat[i][6])}</span></div>${ayahHTML(i, hl)}${extra ? extra(i) : ''}</div>`).join('') + (shown < ay.length ? `<button class="btn more">عرض المزيد (${n(ay.length - shown)})</button>` : ''));
    el.querySelector('.more')?.addEventListener('click', more); };
  more();
}
function rootView(ri) { const r = W.roots[ri]; if (!r) return words();
  const ws = wordsByRoot.get(ri); const lem = new Map(); ws.forEach(w => lem.set(W.w[w][1], (lem.get(W.w[w][1]) || 0) + 1));
  occList(ws, rootFmt(r[0]), 'الجذر', `<section class="panel stack"><h3>الألفاظ المشتقة من الجذر (${n(lem.size)})</h3><div class="list">${[...lem].sort((a, b) => b[1] - a[1]).map(([l, c]) => `<div class="row" data-lem="${l}"><span class="t"><b style="font-family:var(--f-quran);font-size:1.15rem">${esc(W.lemmas[l][0])}</b> <span class="muted">· ${W.lemmas[l][2]==='V'?'فعل':W.lemmas[l][2]==='N'?'اسم':'حرف'}</span></span><span class="n">${n(c)}</span></div>`).join('')}</div></section>`); }
function lemmaView(li) { const l = W.lemmas[li]; if (!l) return words();
  const ws = wordsByLemma.get(li); const ri = W.roots.findIndex(r => r[0] === l[1]);
  occList(ws, esc(l[0]), `لفظ (${l[2]==='V'?'فعل':l[2]==='N'?'اسم':'حرف'})`, ri >= 0 ? `<div class="toolbar"><a class="btn" href="#root${ri}">الجذر: ${rootFmt(l[1])} · ${n(W.roots[ri][1])} مرة</a></div>` : ''); }
function formView(f) { const ws = []; W.w.forEach((w, i) => { if (strip(w[0]) === f) ws.push(i); }); occList(ws, esc(f), 'صيغة كما رُسمت في المصحف'); }

/* ================= topics (from v1) */
function topics() {
  const tot = T.reduce((s, c) => s + c.items.length, 0);
  V(`<div class="stack"><div><div class="eyebrow">الموسوعة الموضوعية</div><h1>كل ما ذُكر في القرآن، مبوّباً</h1><p class="lead">${n(T.length)} فهرساً و${n(tot)} مدخلاً، لكل مدخل عدد مرات وروده ومواضعه ونصوص آياته، مع مصادره من أمهات الكتب.</p></div>
  <div class="grid cats">${T.map(c => `<a class="cat" href="#t-${c.id}"><span class="eyebrow">${n(c.items.length)} مدخلاً</span><h3>${c.title}</h3><p>${esc(c.intro)}</p></a>`).join('')}</div></div>`);
}
function topic(id, openName) {
  const c = T.find(x => x.id === id); if (!c) return topics();
  let html = '', g = null;
  c.items.forEach((it, k) => {
    if (it.g && it.g !== g && !it.g.startsWith('القوم:')) { g = it.g; html += `<div class="grp">${esc(g)}</div>`; }
    const meta = [it.c ? `<span class="chip acc">${n(it.c)} مرة</span>` : '', it.a ? `<span class="chip">${n(it.a.length)} آية</span>` : '', it.ra && !it.c ? `<span class="chip gold">${n(it.ra)} آية في ${n(it.r.length)} ${plural(it.r.length,'موضع','مواضع','موضعاً')}</span>` : it.ra ? `<span class="chip gold">${n(it.r.length)} مقطع</span>` : ''].join('');
    html += `<details class="item" data-k="${k}"><summary><span class="t">${esc(it.n)}</span><span class="meta">${meta}</span></summary><div class="body"></div></details>`;
  });
  V(`<div class="stack"><div><a class="btn" href="#topics">→ الموسوعة الموضوعية</a></div>
  <div><div class="eyebrow">${n(c.items.length)} مدخلاً</div><h1>${c.title}</h1><p class="lead">${esc(c.intro)}</p></div>
  <section class="panel" id="tpanel">${html}<div class="src" style="margin-top:14px"><b>طريقة العدّ:</b> ${esc(c.method)}<br><b>المصادر:</b> ${esc(c.src)}${c.notes ? `<br><b>ملحوظة:</b> ${esc(c.notes)}` : ''}</div></section></div>`);
  $('#tpanel').addEventListener('toggle', e => { const d = e.target; if (!d.open || d.dataset.done) return; d.dataset.done = 1;
    const it = c.items[+d.dataset.k], body = d.querySelector('.body');
    let h = ''; if (it.d) h += `<p style="margin:8px 0">${esc(it.d)}</p>`;
    if (it.g && it.g.startsWith('القوم:')) h += `<p class="muted" style="margin:4px 0">${esc(it.g)}</p>`;
    if (it.note) h += `<div class="note">${esc(it.note)}</div>`;
    body.innerHTML = h + '<div class="occs"></div>'; const box = body.querySelector('.occs');
    if (it.w || (!it.r && it.a)) { const hl = new Set(it.w || []);
      if (it.w) box.insertAdjacentHTML('beforeend', `<div style="margin:8px 0">${distBar(it.w)}</div>`);
      box.insertAdjacentHTML('beforeend', `<h3 style="margin-top:10px">مواضع الورود</h3><div class="o1"></div>`); renderOcc(box.querySelector('.o1'), it.a, hl, 40); }
    if (it.r) { box.insertAdjacentHTML('beforeend', `<h3 style="margin-top:14px">${it.w || it.a ? 'المواضع التفصيلية' : 'المواضع'}</h3>` + it.r.map(([s, e], j) => `<div class="passage"><div class="ref"><a data-ayah="${s}">${esc(ref(s))}${e > s ? ' – ' + n(Q.ayat[e][1]) : ''}</a><span>· ${n(e-s+1)} ${plural(e-s+1,'آية','آيات','آية')}</span></div><div class="pbody"></div></div>`).join(''));
      box.querySelectorAll('.passage').forEach((p, j) => { const [s, e] = it.r[j]; const pb = p.querySelector('.pbody');
        const fill = lim => { let h = ''; for (let i = s; i <= Math.min(e, s + lim - 1); i++) h += ayahHTML(i, null);
          if (e - s + 1 > lim) h += `<button class="btn" data-all>عرض بقية المقطع (${n(e-s+1-lim)} آية)</button>`; pb.innerHTML = h; pb.querySelector('[data-all]')?.addEventListener('click', () => fill(1e4)); };
        fill(it.r.length > 6 ? 2 : 6); }); }
  }, true);
  if (openName) { const k = c.items.findIndex(x => x.n === openName); const d = k >= 0 && $(`#tpanel details[data-k="${k}"]`); if (d) { d.open = true; setTimeout(() => d.scrollIntoView({ block: 'start' }), 50); } }
}

/* ================= smart (meaning) search: BM25 over the ayah + التفسير الميسر, with root expansion and a concept thesaurus */
const THES = {
  'الوالدين':['والد','والدين','ابوين','احسانا','بر'],'الام':['ام','والده','امه'],'الاب':['اب','ابيه','والد'],'الزواج':['نكاح','زوج','ازواج'],'الطلاق':['طلاق','عده'],'الاولاد':['ولد','اولاد','بنين','ذريه'],
  'المال':['مال','اموال','انفاق','كنز'],'الرزق':['رزق','رزقا'],'الموت':['موت','توفي','اجل','الموت'],'التوبه':['توبه','توب','استغفار','مغفره'],'الدعاء':['دعا','ادعو','دعوه'],
  'الكذب':['كذب','افك','زور'],'الصدق':['صدق','صادقين'],'العدل':['عدل','قسط','ميزان'],'الظلم':['ظلم','بغي'],'الحسد':['حسد'],'الغضب':['غيظ','غضب'],'الخوف':['خوف','خشيه','رهب'],
  'القلق':['حزن','خوف','ضيق','طمانينه'],'الحزن':['حزن','ضيق','تحزن'],'السعاده':['فرح','طمانينه','طيبه','بشري'],'الطمانينه':['طمانينه','سكينه','تطمئن'],'البيئه':['ارض','فساد','ماء','زرع'],
  'الفضاء':['سماء','نجوم','كواكب','افلاك'],'الكون':['سماوات','ارض','خلق','نجوم'],'المرض':['مرض','ضر','شفاء','سقيم'],'الشفاء':['شفاء','يشفين'],'الجار':['جار'],'اليتيم':['يتيم','يتامي'],
  'الفقير':['فقير','مسكين','فقراء'],'الفقر':['فقر','فقراء','مسكين'],'الربا':['ربا'],'الخمر':['خمر','ميسر'],'السرقه':['سرق','سارق'],'الحجاب':['جلابيب','خمرهن','زينتهن','يغضضن'],
  'الصيام':['صيام','صوم','رمضان'],'الصلاه':['صلاه','اقيموا','ركوع','سجود'],'الحج':['حج','عمره','البيت'],'الزكاه':['زكاه','صدقه','صدقات'],'الجنه':['جنه','جنات','فردوس','نعيم'],
  'النار':['نار','جحيم','جهنم','سعير'],'العلم':['علم','عقل','تفكر','حكمه'],'التفكر':['تفكر','تدبر','يعقلون','الباب'],'الحرب':['قتال','حرب'],'السلام':['سلم','صلح','سلام'],
  'الامانه':['امانه','امانات','عهد'],'الوقت':['عصر','دهر','ليل','نهار'],'الاسراف':['اسراف','تبذير','مسرفين'],'التواضع':['تواضع','مرحا','تصعر','هونا'],'الكبر':['كبر','استكبار','متكبر'],
  'الشكر':['شكر','شاكرين'],'الصبر':['صبر','صابرين'],'التوكل':['توكل','وكيل'],'الرحمه':['رحمه','رحيم','رحمن'],'المغفره':['مغفره','غفور','غفر'],'الاخلاق':['خلق','احسان','معروف'],
  'الغيبه':['غيبه','يغتب','تجسسوا'],'الكلام':['قول','قولا','لسان'],'الهدايه':['هدي','هدايه','يهدي'],'الحريه':['اكراه','عتق','رقبه'],'المراه':['نساء','امراه','مومنات'],'الطفل':['طفل','رضاع','مولود'],
  'الماء':['ماء','مطر','انهار','عيون'],'الشمس':['شمس','ضحي'],'القمر':['قمر','اهله'],'المطر':['مطر','غيث','ودق'],'الجبال':['جبال','رواسي'],'البحر':['بحر','بحار','يم'],
  'الصداقه':['خليل','اخلاء','صاحب','ولي'],'الاخوه':['اخوه','اخ','اخوانا'],'العمل':['عمل','سعي','كسب'],'التجاره':['تجاره','بيع','شراء'],'الدين':['دين','تداينتم','قرض'],
};
const SUF = ['تموه','يهما','يهم','يها','هما','كما','يه','هم','هن','كم','نا','ها','ون','ين','ات','ان','وا','ه','ي'];
const suf = t => { for (const x of SUF) if (t.endsWith(x) && t.length - x.length >= 3) return t.slice(0, -x.length); return t; };
const pre = t => { const m = t.match(/^(?:[وف]?[بكل]?ال|[وف]?لل)/); return m && t.length - m[0].length >= 2 ? t.slice(m[0].length) : t; };
function stems(t) { // candidate stems: Arabic prefixes are ambiguous (والدين = و+الدين or الوالدين), so keep every reading
  t = norm(t).replace(/[^ء-ي]/g, ''); const c = new Set([suf(pre(t)), suf(t)]);
  if (t.length > 4 && /^[وف]/.test(t)) c.add(suf(pre(t.slice(1))));
  return [...c].filter(x => x.length > 1);
}
const stem = t => stems(t)[0] || '';
const STOP = new Set(['من','في','علي','الي','عن','ما','لا','ان','او','ثم','قد','هو','هي','هم','الذي','الذين','التي','كان','كل','ذلك','هذا','هذه','لم','لن','اذا','اذ','بل','حتي','مع','الا','عند','يا','ايها','انه','انهم','قال','قالوا','لهم','له','لكم','به','بها','وما','ولا','فيه','فيها','ومن','منه','منهم','الله']);
const tokens = s => norm(s).split(/[^ء-ي]+/).filter(w => w.length > 1 && !STOP.has(w)).flatMap(stems);
let SIDX = null;
async function buildSearchIndex() {
  if (SIDX) return SIDX;
  const mu = await muyassarAll();
  const inv = new Map(), len = new Float32Array(Q.ayat.length), lemmaRoots = new Map();
  Q.ayat.forEach((a, i) => {
    const tf = new Map();
    for (const t of tokens(a[4])) tf.set(t, (tf.get(t) || 0) + 2);
    for (const t of tokens((mu[a[0]] || {})[a[1]] || '')) tf.set(t, (tf.get(t) || 0) + 1);
    let L = 0; for (const [t, f] of tf) { L += f; (inv.get(t) || inv.set(t, []).get(t)).push(i, f); }
    len[i] = L;
  });
  W.lemmas.forEach(l => { if (!l[1]) return; const ri = rootByKey.get(norm(l[1])); const k = stem(l[0]); if (ri != null && k.length > 1) (lemmaRoots.get(k) || lemmaRoots.set(k, new Set()).get(k)).add(ri); });
  const avg = len.reduce((s, x) => s + x, 0) / len.length;
  const rootAyat = new Map(); wordsByRoot.forEach((ws, ri) => rootAyat.set(ri, new Set(ws.map(w => W.a[w]))));
  SIDX = { inv, len, avg, mu, lemmaRoots, rootAyat };
  return SIDX;
}
async function smartSearch(q, limit = 40) {
  const X = await buildSearchIndex(); const N = Q.ayat.length;
  const qn = norm(q).replace(/[^ء-ي ]/g, ' ');
  let terms = tokens(qn); const concepts = [];
  for (const w of qn.split(/\s+/)) { const k = w.startsWith('ال') ? w : 'ال' + w; const th = THES[k] || THES[w]; if (th) { concepts.push(k); terms.push(...th.flatMap(stems)); } }
  terms = [...new Set(terms)].filter(Boolean);
  const score = new Float64Array(N), hitT = new Map();
  for (const t of terms) { const p = X.inv.get(t); if (!p) continue; const df = p.length / 2; const idf = Math.log(1 + (N - df + .5) / (df + .5));
    for (let j = 0; j < p.length; j += 2) { const i = p[j], f = p[j+1]; score[i] += idf * (f * 2.2) / (f + 1.2 * (.25 + .75 * X.len[i] / X.avg)); (hitT.get(i) || hitT.set(i, new Set()).get(i)).add(t); } }
  const roots = new Set();
  for (const t of tokens(qn)) { const ri = rootByKey.get(t); if (ri != null) roots.add(ri); const s = X.lemmaRoots.get(t); if (s) s.forEach(r => roots.add(r)); }
  for (const ri of roots) { const set = X.rootAyat.get(ri); if (!set || set.size > 2500) continue; const idf = Math.log(1 + N / set.size); for (const i of set) score[i] += 0.9 * idf; }
  const ids = []; for (let i = 0; i < N; i++) if (score[i] > 0) ids.push(i);
  ids.sort((a, b) => score[b] - score[a]);
  return { ids: ids.slice(0, limit), total: ids.length, score, terms, roots: [...roots], concepts, hitT, mu: X.mu };
}
function snippet(text, terms) {
  const parts = text.split(/(\s+)/); const tset = new Set(terms);
  return parts.map(p => (p.trim() && stems(p).some(x => tset.has(x))) ? `<b>${esc(p)}</b>` : esc(p)).join('');
}
function search(q0) {
  const q = typeof q0 === 'string' ? q0 : ($('#qinput').value || '');
  const EX = ['الصبر على البلاء','بر الوالدين','آداب الكلام مع الناس','خلق السماوات والأرض','الرزق والتوكل','التوبة والمغفرة','حقوق اليتيم'];
  V(`<div class="stack"><div><div class="eyebrow">البحث بالمعنى</div><h1>ابحث بالفكرة، لا بالحرف فقط</h1><p class="lead">اكتب ما تريد بلغتك المعتادة. يبحث «مشكاة» في نص الآيات وفي معانيها من التفسير الميسر، ويوسّع بحثك بالجذور القرآنية والمترادفات، ثم يرتب الآيات بالأقرب إلى سؤالك. يعمل دون إنترنت.</p></div>
  <form class="toolbar" id="sform"><input id="sq" type="search" value="${esc(q)}" placeholder="مثال: الصبر على البلاء"><div class="seg" id="smode"><button type="button" aria-pressed="true" data-m="meaning">بالمعنى</button><button type="button" aria-pressed="false" data-m="exact">بالنص الحرفي</button></div><button class="btn pri">بحث</button></form>
  <div class="suggest">${EX.map(x => `<button type="button" data-q="${x}">${x}</button>`).join('')}</div>
  <div id="sres"></div></div>`);
  let mode = 'meaning';
  $('#smode').onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; $('#smode').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); run(); };
  $('#sform').onsubmit = e => { e.preventDefault(); run(); };
  $('.suggest').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('#sq').value = b.dataset.q; run(); };
  const run = async () => {
    const raw = $('#sq').value.trim(); if (!raw) { $('#sres').innerHTML = ''; return; }
    if (mode === 'exact') return exactSearch(raw);
    $('#sres').innerHTML = '<p class="loading">جارٍ تجهيز فهرس المعاني (مرة واحدة فقط)…</p>';
    const r = await smartSearch(raw, 60);
    const top = r.ids.length ? r.score[r.ids[0]] : 1;
    $('#sres').innerHTML = `<div class="stack"><section class="panel stack tight"><div class="pill-row"><span class="chip acc">${n(r.total)} آية ذات صلة</span>${r.concepts.map(c => `<span class="chip gold">مفهوم: ${esc(c)}</span>`).join('')}${r.roots.slice(0, 8).map(ri => `<a class="chip" href="#root${ri}">الجذر ${rootFmt(W.roots[ri][0])}</a>`).join('')}</div>
      <p class="muted small" style="margin:0">مرتبة بالأقرب. يظهر تحت كل آية معناها من التفسير الميسر، والكلمات التي طابقت بحثك مظللة.</p></section>
      <section class="panel"><div id="shits"></div></section>
      ${true ? `<section class="panel"><div class="toolbar"><span>${IS_PWA ? 'أتريد الآيات مع أقوال المفسرين والمداخل الموضوعية معاً؟' : 'أتريد جواباً مركّزاً مع الأدلة؟'}</span><a class="btn pri" href="#ask" id="toAsk"><svg><use href="#i-spark"/></svg>اسأل مشكاة عن «${esc(raw)}»</a></div></section>` : ''}</div>`;
    const ta = $('#toAsk'); if (ta) ta.onclick = () => { pendingAsk = raw; };
    if (!r.ids.length) { $('#shits').innerHTML = '<p class="muted">لم أجد آيات قريبة. جرّب كلمة أخرى قريبة من المعنى.</p>'; return; }
    renderOcc($('#shits'), r.ids, null, 20, i => `<p class="snip">${snippet((r.mu[Q.ayat[i][0]] || {})[Q.ayat[i][1]] || '', r.terms)}</p><div class="why"><span class="chip">درجة القرب ${n(Math.max(1, Math.round(r.score[i] / top * 100)))}٪</span></div>`);
  };
  const exactSearch = raw => {
    const nq = norm(raw); const rx = new RegExp(nq.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    const hits = []; let cnt = 0; Q.ayat.forEach((a, i) => { const m = a[4].match(rx); if (m) { hits.push(i); cnt += m.length; } });
    const nr = nq.replace(/\s/g, ''); const roots = W.roots.map((r, i) => [i, r]).filter(([i, r]) => norm(r[0]) === nr);
    const lems = W.lemmas.map((l, i) => [i, l]).filter(([i, l]) => norm(l[0]) === nr).sort((a, b) => b[1][3] - a[1][3]);
    const bySurah = new Set(hits.map(i => Q.ayat[i][0]));
    $('#sres').innerHTML = `<div class="stack">${roots.length || lems.length ? `<section class="panel"><h3>في المعجم</h3><div class="pill-row" style="margin-top:8px">${roots.map(([i, r]) => `<a class="chip acc" href="#root${i}">الجذر ${rootFmt(r[0])} · ${n(r[1])} مرة</a>`).join('')}${lems.map(([i, l]) => `<a class="chip" href="#lem${i}" style="font-family:var(--f-quran)">${esc(l[0])} · ${n(l[3])}</a>`).join('')}</div></section>` : ''}
      <section class="panel"><div class="pill-row"><span class="chip acc">${n(cnt)} مرة</span><span class="chip">في ${n(hits.length)} آية</span><span class="chip">في ${n(bySurah.size)} سورة</span></div><div id="shits"></div></section></div>`;
    if (hits.length) renderOcc($('#shits'), hits, null, 60); else $('#shits').innerHTML = '<p class="muted">لا توجد نتائج. جرّب البحث بالمعنى أو كتابة الكلمة دون «ال».</p>';
  };
  if (q) run();
}

/* ================= ask (claude.ai build): Claude answers from the app's own verified texts through page tools */
let pendingAsk = null, chatTurns = [], askCtl = null;
const BOOKS = () => TF.map(b => `${b.key}: ${b.title} (${b.author})`).join('، ');
const RULES = () => `أنت «مشكاة»، مساعد بحثي في القرآن الكريم داخل تطبيق يحوي نص مصحف المدينة النبوية (رواية حفص) وثمانية كتب تفسير: ${BOOKS()}، وفهارس موضوعية وإحصاءات صرفية.
القواعد:
١. اكتب بالعربية الفصحى الواضحة، بصياغة علمية مهذبة وموجزة.
٢. لا تذكر نص آية من حفظك أبداً؛ استعمل الأدوات لجلب النص، وانقله كما جاء حرفياً في سطر يبدأ بـ «> ».
٣. استشهد بكل آية تذكرها بالصيغة [رقم_السورة:رقم_الآية] مثل [2:255]، فيحوّلها التطبيق إلى رابط.
٤. إذا نقلت عن تفسير فاذكر اسمه، ولا تنسب إليه ما لم يرد في نص الأداة.
٥. في الأحكام الفقهية اعرض أقوال المذاهب كما في كتب التفسير المتاحة (القرطبي خاصة)، وانصح بالرجوع إلى أهل العلم، ولا تُصدر فتوى شخصية.
٦. للأعداد والإحصاءات استعمل أداة word_stats ولا تقدّر من عندك، واذكر أن العدّ وفق مدونة القرآن الصرفية.
٧. إن لم تجد في الأدوات ما يكفي فقل ذلك بوضوح.
٨. اجعل الجواب منظماً بعناوين قصيرة ونقاط عند الحاجة، ولا يتجاوز ٣٥٠ كلمة إلا إذا طُلب التفصيل.`;
const askTools = () => [
  { name: 'search_quran', description: 'بحث بالمعنى في الآيات وتفسيرها الميسر. يعيد أقرب الآيات مع المرجع [سورة:آية] ونص الآية بالرسم العثماني ومعناها من التفسير الميسر.',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'عبارة البحث بالعربية' }, limit: { type: 'number' } }, required: ['query'] },
    async execute(inp) { stepLog('البحث في الآيات عن: ' + String(inp.query)); const r = await smartSearch(String(inp.query || ''), Math.min(12, Number(inp.limit) || 8));
      return r.ids.map(i => ({ ref: `${Q.ayat[i][0]}:${Q.ayat[i][1]}`, surah: Q.surahs[Q.ayat[i][0]-1].name, text: ayahText(i), muyassar: ((r.mu[Q.ayat[i][0]] || {})[Q.ayat[i][1]] || '').slice(0, 500) })); } },
  { name: 'get_ayat', description: 'يجلب نص آية أو مقطع (حتى ١٥ آية) بالرسم العثماني مع معناها من التفسير الميسر.',
    inputSchema: { type: 'object', properties: { surah: { type: 'number' }, from: { type: 'number' }, to: { type: 'number' } }, required: ['surah', 'from'] },
    async execute(inp) { const s = Number(inp.surah), a = Number(inp.from), b = Math.min(Number(inp.to) || a, a + 14); stepLog(`جلب ${Q.surahs[s-1]?.name || s} ${a}${b > a ? '–' + b : ''}`);
      const mu = await muyassarAll(); const out = []; for (let k = a; k <= b; k++) { const i = idxOf(s, k); if (i < 0) throw new Error('مرجع غير صحيح'); out.push({ ref: `${s}:${k}`, text: ayahText(i), muyassar: (mu[s] || {})[k] || '' }); } return out; } },
  { name: 'get_tafsir', description: 'يجلب نص تفسير آية من أحد الكتب: muyassar, gharib, jalalayn, saadi, baghawi, ibnkathir, tabari, qurtubi. يعيد حتى ٦٠٠٠ حرف.',
    inputSchema: { type: 'object', properties: { book: { type: 'string' }, surah: { type: 'number' }, ayah: { type: 'number' } }, required: ['book', 'surah', 'ayah'] },
    async execute(inp) { const b = TF.find(x => x.key === String(inp.book)); if (!b) throw new Error('اسم الكتاب غير معروف'); const s = Number(inp.surah), a = Number(inp.ayah); stepLog(`قراءة ${b.title}: ${Q.surahs[s-1]?.name || s} ${a}`);
      const t = await tafsir(b.key, s); let txt = t[a]; let k = a; while (!txt && k > 1) { k--; txt = t[k]; } return { book: b.title, author: b.author, ref: `${s}:${k}`, text: (txt || 'لا يوجد نص').slice(0, 6000) }; } },
  { name: 'word_stats', description: 'إحصاء لفظ أو جذر في القرآن: عدد مرات الورود وعدد الآيات وأكثر السور وروداً، وفق مدونة القرآن الصرفية.',
    inputSchema: { type: 'object', properties: { word: { type: 'string', description: 'اللفظ أو الجذر بالعربية، مثل: رحم أو الصلاة' } }, required: ['word'] },
    async execute(inp) { const w = norm(String(inp.word || '')).replace(/\s/g, ''); stepLog('إحصاء لفظ: ' + w); const out = [];
      const ri = rootByKey.get(w); if (ri != null) { const ws = wordsByRoot.get(ri); out.push({ type: 'root', root: W.roots[ri][0], count: ws.length, ayat: new Set(ws.map(x => W.a[x])).size, top_surahs: topSurahs(ws) }); }
      const st = stem(w); W.lemmas.forEach((l, li) => { if (norm(l[0]) === w || norm(l[0]) === st) { const ws = wordsByLemma.get(li); out.push({ type: 'lemma', lemma: l[0], root: l[1], count: ws.length, top_surahs: topSurahs(ws) }); } });
      return out.length ? out.slice(0, 6) : 'لم يُعثر على اللفظ في المعجم'; } },
  { name: 'topic_index', description: 'بحث في الموسوعة الموضوعية (الأنبياء، الأقوام، الأماكن، القصص، الأحكام الفقهية، العلوم، الأمثال…). يعيد المداخل المطابقة مع وصفها وعددها وأول مواضعها.',
    inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
    async execute(inp) { const q = norm(String(inp.query || '')); stepLog('البحث في الموسوعة الموضوعية: ' + String(inp.query)); const out = [];
      for (const c of T) for (const it of c.items) if (norm(it.n + ' ' + (it.d || '') + ' ' + (it.g || '')).includes(q) || norm(c.title).includes(q)) { const ay = itemAyat(it).slice(0, 8); out.push({ category: c.title, entry: it.n, description: it.d || '', note: it.note || '', count: it.c || null, refs: ay.map(i => `${Q.ayat[i][0]}:${Q.ayat[i][1]}`) }); if (out.length >= 10) return out; }
      return out.length ? out : 'لا توجد مداخل مطابقة'; } },
];
function topSurahs(ws) { const m = new Map(); ws.forEach(w => m.set(surahOf[w], (m.get(surahOf[w]) || 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => `${Q.surahs[s-1].name}: ${c}`); }
let stepBox = null;
function stepLog(s) { if (stepBox) stepBox.insertAdjacentHTML('beforeend', `<span>• ${esc(s)}</span>`); }
function md(text) {
  const lines = esc(text).split('\n'); let h = '', inList = false;
  for (let ln of lines) {
    ln = ln.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[(\d{1,3}):(\d{1,3})(?:[-–](\d{1,3}))?\]/g, (m, s, a, b) => { const i = idxOf(+s, +a); return i < 0 ? m : `<a class="cite" data-ayah="${i}">${esc(Q.surahs[+s-1].name)} ${n(+a)}${b ? '–' + n(+b) : ''}</a>`; });
    if (/^\s*&gt;\s?/.test(ln)) { if (inList) { h += '</ul>'; inList = false; } h += `<blockquote>${ln.replace(/^\s*&gt;\s?/, '')}</blockquote>`; continue; }
    if (/^\s*[-•*]\s+/.test(ln)) { if (!inList) { h += '<ul>'; inList = true; } h += `<li>${ln.replace(/^\s*[-•*]\s+/, '')}</li>`; continue; }
    if (inList) { h += '</ul>'; inList = false; }
    if (/^#{1,4}\s/.test(ln)) { h += `<h3>${ln.replace(/^#+\s/, '')}</h3>`; continue; }
    if (ln.trim()) h += `<p>${ln}</p>`;
  }
  return h + (inList ? '</ul>' : '');
}
async function askOffline() {
  const EX = ['الصبر عند المصيبة','الجنة وصفاتها','قصة يوسف','آية الوضوء','الخوف والخشية','حقوق اليتيم'];
  V(`<div class="stack" style="max-width:900px"><div><div class="eyebrow">مساعد البحث</div><h1>اسأل مشكاة</h1><p class="lead">اكتب سؤالك أو موضوعك، فيجمع لك مساعد البحث من داخل التطبيق: أقرب الآيات مع تفسيرها الميسر، والمداخل الموضوعية، وإحصاء الألفاظ، وأقوال المفسرين في الآية الأقرب. يعمل كله على جهازك دون إنترنت ودون أي خدمة خارجية.</p></div>
  <form class="toolbar" id="oform"><input id="oq" type="search" placeholder="مثال: ما الآيات التي تتحدث عن الصبر عند المصيبة؟"><button class="btn pri"><svg><use href="#i-spark"/></svg>ابحث وأجب</button></form>
  <div class="suggest" id="osug">${EX.map(x => `<button type="button" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div><div id="ores"></div>
  <div class="note">المساعد يجمع النصوص ويرتّبها، ولا يؤلّف جواباً ولا يفتي. اقرأ الآيات في سياقها، وارجع إلى أهل العلم في الأحكام.</div></div>`);
  $('#osug').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('#oq').value = b.dataset.q; $('#oform').requestSubmit(); };
  $('#oform').onsubmit = async e => { e.preventDefault(); const q = $('#oq').value.trim(); if (!q) return;
    $('#ores').innerHTML = '<p class="loading">جارٍ البحث في الآيات والتفاسير والموسوعة…</p>';
    const r = await smartSearch(q, 8); const qn = norm(q);
    const qt = qn.split(/\s+/).filter(w => w.length > 2 && !STOP.has(w));
    const topicsHit = []; for (const c of T) for (const it of c.items) { const hay = norm(it.n + ' ' + (it.d || '')); const sc = qt.filter(w => hay.includes(w.replace(/^ال/, ''))).length; if (sc) topicsHit.push([sc, c, it]); }
    topicsHit.sort((a, b) => b[0] - a[0]);
    const stats = []; const seen = new Set(); for (const t of qt) { for (const st of stems(t)) { const ri = rootByKey.get(st); if (ri != null && !seen.has(ri)) { seen.add(ri); stats.push(ri); } } } for (const ri of r.roots) if (!seen.has(ri) && stats.length < 4) { seen.add(ri); stats.push(ri); }
    const best = r.ids[0]; let tf = '';
    if (best != null) { const a = Q.ayat[best]; const parts = await Promise.all(['saadi', 'ibnkathir', 'qurtubi'].map(k => tafsir(k, a[0]).then(t => [k, t[a[1]]]).catch(() => [k, null])));
      tf = parts.filter(([, t]) => t).map(([k, t]) => { const b = TF.find(x => x.key === k); return `<details class="item"><summary><span class="t">${b.title}</span><span class="muted small">${b.author}</span></summary><div class="tafsir" style="margin-top:8px">${esc(t.length > 1800 ? t.slice(0, 1800) + '…' : t)}</div></details>`; }).join(''); }
    $('#ores').innerHTML = `<div class="stack">
      <section class="panel stack tight"><h2>أقرب الآيات إلى سؤالك</h2>${r.ids.length ? '<div id="oocc"></div>' : '<p class="muted">لم أجد آيات قريبة. جرّب صياغة أخرى أو كلمة مرادفة.</p>'}</section>
      ${best != null && tf ? `<section class="panel stack tight"><h2>أقوال المفسرين في ${esc(ref(best))}</h2>${tf}<button class="btn" data-ayah="${best}" style="align-self:flex-start">التفاسير الثمانية كاملة</button></section>` : ''}
      ${topicsHit.length ? `<section class="panel stack tight"><h2>في الموسوعة الموضوعية</h2><div class="list">${topicsHit.slice(0, 8).map(([, c, it]) => `<a class="row" href="#t-${c.id}" data-open="${c.id}|${esc(it.n)}"><span class="t"><b>${esc(it.n)}</b> <span class="muted small">· ${esc(c.title)}</span></span><span class="n">${it.c ? n(it.c) + ' مرة' : ''}</span></a>`).join('')}</div></section>` : ''}
      ${stats.length ? `<section class="panel stack tight"><h2>إحصاء الألفاظ</h2><div class="list">${stats.slice(0, 4).map(ri => { const ws = wordsByRoot.get(ri); return `<a class="row" href="#root${ri}"><span class="t">الجذر <b>${rootFmt(W.roots[ri][0])}</b> <span class="muted small">· في ${n(new Set(ws.map(w => W.a[w])).size)} آية، وأكثره في ${topSurahs(ws).slice(0, 2).map(x => x.split(':')[0]).join(' و')}</span></span><span class="n">${n(ws.length)} مرة</span></a>`; }).join('')}</div></section>` : ''}</div>`;
    if (r.ids.length) renderOcc($('#oocc'), r.ids, null, 8, i => `<p class="snip">${snippet((r.mu[Q.ayat[i][0]] || {})[Q.ayat[i][1]] || '', r.terms)}</p>`);
  };
  if (pendingAsk) { $('#oq').value = pendingAsk; pendingAsk = null; $('#oform').requestSubmit(); }
}
async function ask() {
  const EX = ['ما الآيات التي تتحدث عن الصبر عند المصيبة؟ وما معناها؟','كم مرة ورد ذكر الجنة في القرآن، وما أبرز صفاتها؟','لخّص قصة يوسف عليه السلام من القرآن بإيجاز','ما أقوال المفسرين في آية الوضوء؟','ما الفرق بين الخوف والخشية في الاستعمال القرآني؟'];
  V(`<div class="stack" style="max-width:860px"><div><div class="eyebrow">مساعد ذكي</div><h1>اسأل مشكاة</h1><p class="lead">اكتب سؤالك، فيبحث المساعد في نصوص هذا التطبيق نفسها: الآيات، والتفاسير الثمانية، والفهارس الموضوعية، والإحصاءات، ثم يجيب ويذكر مواضع الآيات. اضغط أي مرجع لفتح الآية وتفسيرها.</p></div>
  <div class="note">المساعد أداة للبحث والتدبر، وليس مفتياً. راجع النصوص المذكورة، وارجع إلى أهل العلم في الأحكام.</div>
  <div class="chat" id="chat"></div>
  <div class="suggest" id="asug">${EX.map(x => `<button type="button" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  <form class="stack tight" id="aform"><textarea class="field" id="aq" rows="3" placeholder="اكتب سؤالك هنا…"></textarea>
   <div class="toolbar"><button class="btn pri" id="asend"><svg><use href="#i-spark"/></svg>أرسل</button><button class="btn" type="button" id="astop" hidden>إيقاف</button><button class="btn ghost" type="button" id="aclear">محادثة جديدة</button><span class="muted small" id="astat"></span></div></form></div>`);
  const chat = $('#chat');
  const drawTurns = () => { chat.innerHTML = chatTurns.map(t => t.role === 'user' ? `<div class="msg me">${esc(t.content)}</div>` : `<div class="msg ai">${md(t.content)}</div>`).join(''); };
  drawTurns();
  if (IS_PWA) return askOffline();
  const sample = await claude?.use?.('sample').catch(() => null);
  if (!sample) { $('#astat').textContent = 'المساعد غير متاح في هذا العرض. سجّل الدخول إلى claude.ai وافتح الرابط مباشرة.'; $('#asend').disabled = true; }
  $('#asug').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('#aq').value = b.dataset.q; $('#aform').requestSubmit(); };
  $('#aclear').onclick = () => { chatTurns = []; drawTurns(); };
  $('#astop').onclick = () => askCtl?.abort();
  $('#aform').onsubmit = async e => {
    e.preventDefault(); const q = $('#aq').value.trim(); if (!q || !sample) return;
    $('#aq').value = ''; $('#asug').hidden = true;
    chatTurns.push({ role: 'user', content: q }); drawTurns();
    chat.insertAdjacentHTML('beforeend', `<div class="msg ai" id="live"><div class="steps" id="steps"><span>جارٍ التفكير والبحث في النصوص…</span></div><div class="ans"></div></div>`);
    stepBox = $('#steps'); const ans = $('#live .ans');
    $('#asend').disabled = true; $('#astop').hidden = false; askCtl = new AbortController();
    try {
      const input = [{ role: 'user', content: RULES() + '\n\nسأطرح عليك أسئلتي الآن.' }, { role: 'assistant', content: 'حسناً، سأجيب من نصوص التطبيق مع ذكر المواضع.' }, ...chatTurns];
      const { text } = await sample(input, { tools: askTools(), cache: false, signal: askCtl.signal, onText: ({ text }) => { ans.innerHTML = md(text); } });
      chatTurns.push({ role: 'assistant', content: text });
    } catch (err) {
      const msg = { not_granted: 'لم يُسمح للمساعد بالعمل. يمكنك السماح له من قائمة الأذونات في الصفحة.', rate_limited: 'كثرت الطلبات في وقت قصير. انتظر دقيقة ثم أعد السؤال.', cancelled: 'أُوقف الجواب.' }[err?.code] || 'تعذّر الحصول على جواب الآن. أعد المحاولة بعد قليل.';
      if (err?.text) chatTurns.push({ role: 'assistant', content: err.text + '\n\n' + msg }); else { chatTurns.pop(); toast(msg); }
    } finally { stepBox = null; $('#asend') && ($('#asend').disabled = false); $('#astop') && ($('#astop').hidden = true); drawTurns(); }
  };
  if (pendingAsk) { $('#aq').value = pendingAsk; pendingAsk = null; }
}

/* ================= hifz: progressive hiding, typed check, voice recitation, spaced review */
const DAY = 864e5;
function hzKey(s, a, b) { return `${s}:${a}-${b}`; }
function dueList() { const now = Date.now(); return Object.entries(ST.hifz).filter(([k, v]) => v.due <= now).sort((a, b) => a[1].due - b[1].due); }
function grade(key, q) { // SM-2 مبسّط: q = 1 صعب، 3 متوسط، 5 سهل
  const v = ST.hifz[key] || { ef: 2.5, int: 0, reps: 0 };
  if (q < 3) { v.reps = 0; v.int = 1; } else { v.reps++; v.int = v.reps === 1 ? 1 : v.reps === 2 ? 3 : Math.round(v.int * v.ef); }
  v.ef = Math.max(1.3, v.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  v.due = Date.now() + v.int * DAY; v.last = Date.now(); v.q = q;
  ST.hifz[key] = v; save(); return v;
}
let hzSel = { s: 1, a: 1, b: 7 };
function hifz() {
  const due = dueList();
  const sOpts = Q.surahs.map(s => `<option value="${s.n}" ${s.n === hzSel.s ? 'selected' : ''}>${n(s.n)}. ${s.name}</option>`).join('');
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const voiceOK = IS_PWA && !!SR;
  V(`<div class="stack"><div><div class="eyebrow">الحفظ والتسميع</div><h1>احفظ، وسمّع، وراجع في موعدك</h1><p class="lead">اختر مقطعاً، ثم تدرّج: اقرأ، ثم أخفِ الكلمات تدريجياً، ثم سمّع بصوتك أو بالكتابة. بعد كل تسميع قيّم مستواك، فيحدد التطبيق موعد المراجعة التالية بطريقة التكرار المتباعد.</p></div>
  <section class="panel stack tight"><h3>مراجعات اليوم</h3>${due.length ? due.slice(0, 12).map(([k, v]) => { const [s, r] = k.split(':'); const [a, b] = r.split('-'); return `<div class="due"><span><b>${Q.surahs[s-1].name}</b> ${n(+a)}–${n(+b)} <span class="muted small">· آخر تقييم: ${['','صعب','','متوسط','','سهل'][v.q] || '—'}</span></span><button class="btn" data-hzgo="${k}">راجع الآن</button></div>`; }).join('') : `<p class="muted small" style="margin:0">لا توجد مراجعات مستحقة اليوم. ${Object.keys(ST.hifz).length ? `لديك ${n(Object.keys(ST.hifz).length)} مقطعاً في جدولك.` : 'ابدأ بأول مقطع من الأسفل.'}</p>`}</section>
  <section class="panel stack">
    <div class="toolbar"><label>السورة <select id="hzS">${sOpts}</select></label><label>من الآية <input id="hzA" type="number" min="1" style="width:5.5em" value="${hzSel.a}"></label><label>إلى <input id="hzB" type="number" min="1" style="width:5.5em" value="${hzSel.b}"></label><button class="btn pri" id="hzLoad">اعرض المقطع</button></div>
    <div class="toolbar"><div class="seg" id="hzMode"><button aria-pressed="true" data-m="read">قراءة</button><button aria-pressed="false" data-m="hint">أوائل الكلمات</button><button aria-pressed="false" data-m="hide">إخفاء كامل</button><button aria-pressed="false" data-m="type">تسميع بالكتابة</button><button aria-pressed="false" data-m="voice">تسميع بالصوت</button></div></div>
    <div id="hzBox"></div>
  </section></div>`);
  let mode = 'read';
  const load = () => {
    const s = +$('#hzS').value, su = Q.surahs[s-1];
    let a = Math.max(1, Math.min(su.ayas, +$('#hzA').value || 1)), b = Math.max(a, Math.min(su.ayas, +$('#hzB').value || a, a + 19));
    $('#hzA').value = a; $('#hzB').value = b; hzSel = { s, a, b };
    const ids = []; for (let k = a; k <= b; k++) ids.push(su.first + k - 1);
    const key = hzKey(s, a, b), rec = ST.hifz[key];
    const wordsHTML = ids.map(i => { const A = Q.ayat[i]; let h = ''; for (let k = 0; k < A[3]; k++) { const f = W.w[A[2]+k][0]; h += `<span class="hz-word" data-w="${A[2]+k}" data-h="${esc(strip(f).slice(0, 1))}">${esc(f)}</span> `; } return h + `<span class="num">﴿${n(A[1])}﴾</span> `; }).join('');
    let tool = '';
    if (mode === 'type') tool = `<textarea class="field" id="hzType" rows="4" placeholder="اكتب المقطع من حفظك، ولا حاجة إلى التشكيل…"></textarea><div class="toolbar"><button class="btn pri" id="hzCheck">صحّح</button><span id="hzScore" class="muted"></span></div>`;
    if (mode === 'voice') tool = voiceOK ? `<div class="toolbar"><button class="mic" id="hzMic" aria-label="ابدأ التسميع"><svg><use href="#i-mic"/></svg></button><div class="stack tight" style="flex:1;min-width:200px"><span id="hzVStat" class="muted">اضغط الميكروفون وابدأ التلاوة. تُعلَّم الكلمات الصحيحة بالأخضر أثناء قراءتك.</span><div class="meter"><i id="hzBar" style="width:0"></i></div></div></div><p class="muted small" style="margin:0">يعتمد التعرف على الصوت على خدمة المتصفح (كروم أو إيدج أو سفاري) ويحتاج إلى اتصال بالإنترنت.</p>`
      : `<div class="note">${IS_PWA ? 'متصفحك لا يدعم التعرف على الكلام. استعمل كروم أو إيدج أو سفاري الحديث.' : 'التسميع بالصوت يعمل في نسخة التطبيق المثبّت على الجوال أو الكمبيوتر، لأن صفحة claude.ai لا تسمح بالوصول إلى الميكروفون. استعمل الآن «تسميع بالكتابة».'}</div>`;
    $('#hzBox').innerHTML = `<div class="stack tight"><div class="pill-row"><span class="chip">${n(ids.length)} ${plural(ids.length,'آية','آيات','آية')}</span><span class="chip">${n(ids.reduce((x, i) => x + Q.ayat[i][3], 0))} كلمة</span>${rec ? `<span class="chip gold">المراجعة القادمة: ${new Date(rec.due).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })}</span>` : ''}</div>
      <div class="ayah" id="hzText">${wordsHTML}</div>${tool}
      <div class="panel stack tight" style="background:var(--bg)"><b>كيف كان حفظك لهذا المقطع؟</b><div class="toolbar"><button class="btn" data-g="1">صعب، أعده غداً</button><button class="btn" data-g="3">متوسط</button><button class="btn pri" data-g="5">سهل، أتقنته</button></div></div></div>`;
    const words = $$('#hzText .hz-word');
    if (mode === 'hint') words.forEach(w => w.classList.add('hint'));
    if (mode === 'hide' || mode === 'type' || mode === 'voice') words.forEach(w => w.classList.add('hide'));
    $('#hzText').onclick = e => { const w = e.target.closest('.hz-word'); if (w) w.classList.remove('hide', 'hint'); };
    $$('[data-g]').forEach(b => b.onclick = () => { const v = grade(key, +b.dataset.g); toast(`حُفظ تقييمك. المراجعة القادمة بعد ${n(v.int)} ${plural(v.int,'يوم','أيام','يوماً')}`); load(); });
    const sk = x => { const t = norm(x).replace(/[^ء-ي]/g, '').replace(/ا/g, ''); return suf(pre(t)) || t; };
    const expected = words.map(w => sk(w.textContent));
    if (mode === 'type') $('#hzCheck').onclick = () => {
      const got = norm($('#hzType').value).split(/\s+/).filter(Boolean).map(sk);
      let j = 0, ok = 0; words.forEach((w, k) => { w.classList.remove('hide', 'ok', 'bad');
        const at = got.indexOf(expected[k], j); if (at >= 0 && at - j <= 2) { w.classList.add('ok'); ok++; j = at + 1; } else w.classList.add('bad'); });
      $('#hzScore').textContent = `صحيح ${n(ok)} من ${n(words.length)} كلمة (${n(Math.round(ok / words.length * 100))}٪)`;
    };
    if (mode === 'voice' && voiceOK) {
      let rec = null, pos = 0;
      const mark = () => { words.forEach((w, k) => w.classList.toggle('cur', k === pos)); $('#hzBar').style.width = (pos / words.length * 100) + '%'; };
      const feed = txt => { for (const t of norm(txt).split(/\s+/).filter(Boolean)) { const st = sk(t); for (let look = 0; look < 3 && pos + look < words.length; look++) if (expected[pos + look] === st || expected[pos + look].startsWith(st) && st.length > 2) { for (let k = pos; k < pos + look; k++) { words[k].classList.remove('hide'); words[k].classList.add('bad'); } words[pos + look].classList.remove('hide'); words[pos + look].classList.add('ok'); pos += look + 1; break; } } mark(); if (pos >= words.length) { rec?.stop(); $('#hzVStat').textContent = `أتممت المقطع. الكلمات الصحيحة ${n($$('#hzText .ok').length)} من ${n(words.length)}.`; } };
      $('#hzMic').onclick = () => {
        if (rec) { rec.stop(); return; }
        rec = new SR(); rec.lang = 'ar-SA'; rec.continuous = true; rec.interimResults = false;
        rec.onresult = e => { for (let r = e.resultIndex; r < e.results.length; r++) if (e.results[r].isFinal) feed(e.results[r][0].transcript); };
        rec.onerror = e => { $('#hzVStat').textContent = e.error === 'not-allowed' ? 'لم يُسمح باستعمال الميكروفون. اسمح به من إعدادات المتصفح.' : 'توقف التعرف على الصوت. اضغط الميكروفون للمتابعة.'; };
        rec.onend = () => { rec = null; $('#hzMic').classList.remove('on'); };
        rec.start(); $('#hzMic').classList.add('on'); $('#hzVStat').textContent = 'أستمع إليك الآن…'; mark();
      };
    }
  };
  $('#hzLoad').onclick = load;
  $('#hzS').onchange = () => { const su = Q.surahs[+$('#hzS').value - 1]; $('#hzA').value = 1; $('#hzB').value = Math.min(su.ayas, 7); load(); };
  $('#hzMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; $('#hzMode').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); load(); };
  $('#view').addEventListener('click', e => { const g = e.target.closest('[data-hzgo]'); if (!g) return; const [s, r] = g.dataset.hzgo.split(':'); const [a, b] = r.split('-'); $('#hzS').value = s; $('#hzA').value = a; $('#hzB').value = b; mode = 'hide'; $('#hzMode').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x.dataset.m === 'hide')); load(); $('#hzBox').scrollIntoView({ block: 'start' }); });
  load();
}

/* ================= saved */
function saved() {
  const bm = ST.bookmarks.filter(i => Q.ayat[i]);
  V(`<div class="stack"><div><div class="eyebrow">محفوظاتي</div><h1>علاماتك ومقاطع حفظك</h1><p class="lead">${cloud ? 'تُحفظ في حسابك وتتزامن بين أجهزتك.' : 'تُحفظ على هذا الجهاز. يمكنك نقلها إلى جهاز آخر من «الإعدادات».'}</p></div>
  <section class="panel"><h3>الآيات المعلَّمة (${n(bm.length)})</h3><div id="bml">${bm.length ? '' : '<p class="muted small">لم تعلّم أي آية بعد. افتح أي آية واضغط «أضف إلى العلامات».</p>'}</div></section>
  <section class="panel stack tight"><h3>جدول الحفظ (${n(Object.keys(ST.hifz).length)})</h3>${Object.entries(ST.hifz).sort((a, b) => a[1].due - b[1].due).map(([k, v]) => { const [s, r] = k.split(':'); const [a, b] = r.split('-'); return `<div class="due"><span><b>${Q.surahs[s-1].name}</b> ${n(+a)}–${n(+b)}</span><span class="muted small">المراجعة: ${new Date(v.due).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>`; }).join('') || '<p class="muted small" style="margin:0">لا مقاطع بعد.</p>'}</section></div>`);
  if (bm.length) renderOcc($('#bml'), bm, null, 50);
}

/* ================= atlas: places of the Quran on an offline map */
const PLACES = [
  { n: 'مكة المكرمة', lat: 21.42, lon: 39.83, refs: [['mudun','مكة المكرمة'],['qura','أم القرى'],['amakin','الكعبة والبيت الحرام'],['amakin','المسجد الحرام'],['amakin','الصفا والمروة'],['amakin','عرفات والمشعر الحرام'],['amakin','مقام إبراهيم'],['amakin','الغار'],['aqwam','قريش'],['aqwam','أصحاب الفيل']], p: ['إبراهيم','إسماعيل','محمد'] },
  { n: 'المدينة المنورة', lat: 24.47, lon: 39.61, refs: [['mudun','المدينة المنورة'],['amakin','مسجد قباء'],['aqwam','المهاجرون والأنصار'],['aqwam','المنافقون']], p: ['محمد'] },
  { n: 'الطائف', lat: 21.27, lon: 40.42, refs: [['qura','القريتان']], p: [], ly: -12 },
  { n: 'بدر', lat: 23.73, lon: 38.77, refs: [['amakin','بدر']], p: ['محمد'], ly: 12 },
  { n: 'حُنين', lat: 21.55, lon: 40.25, refs: [['amakin','حُنين']], p: ['محمد'], ly: 14 },
  { n: 'مصر', lat: 30.05, lon: 31.25, refs: [['mudun','مصر'],['aqwam','آل فرعون وقومه']], p: ['يوسف','موسى','هارون'] },
  { n: 'طور سيناء', lat: 28.54, lon: 33.97, refs: [['amakin','جبل الطور'],['amakin','الوادي المقدس']], p: ['موسى'], u: 1 },
  { n: 'مدين', lat: 28.48, lon: 35.0, refs: [['mudun','مدين'],['aqwam','مدين وأصحاب الأيكة']], p: ['شعيب','موسى'], u: 1 },
  { n: 'أَيْلة (حاضرة البحر)', lat: 29.53, lon: 35.0, refs: [['qura','القرية التي كانت حاضرة البحر'],['aqwam','أصحاب السبت']], p: [], u: 1, ly: 14 },
  { n: 'بيت المقدس', lat: 31.78, lon: 35.23, refs: [['amakin','المسجد الأقصى'],['amakin','الأرض المقدسة'],['amakin','الأرض التي بارك الله فيها'],['qura','القرية التي مرّ عليها']], p: ['داود','سليمان','زكريا','يحيى','عيسى','محمد'] },
  { n: 'قرى قوم لوط', lat: 31.15, lon: 35.45, refs: [['qura','قرى قوم لوط'],['aqwam','قوم لوط']], p: ['لوط'], u: 1, ly: 14 },
  { n: 'الحِجر (ديار ثمود)', lat: 26.79, lon: 37.95, refs: [['mudun','الحِجر'],['aqwam','ثمود']], p: ['صالح'] },
  { n: 'الأحقاف (ديار عاد)', lat: 17.9, lon: 49.0, refs: [['mudun','الأحقاف'],['mudun','إرم ذات العماد'],['aqwam','عاد']], p: ['هود'], u: 1 },
  { n: 'سبأ (مأرب)', lat: 15.42, lon: 45.33, refs: [['mudun','سبأ (مأرب)'],['aqwam','سبأ'],['qura','القرى المباركة']], p: ['سليمان'] },
  { n: 'نجران (الأخدود)', lat: 17.49, lon: 44.13, refs: [['aqwam','أصحاب الأخدود']], p: [], u: 1 },
  { n: 'اليمن: حِمْيَر', lat: 14.2, lon: 44.0, refs: [['aqwam','قوم تُبَّع']], p: [], u: 1, ly: 16 },
  { n: 'بابل', lat: 32.54, lon: 44.42, refs: [['mudun','بابل']], p: [] },
  { n: 'نينوى', lat: 36.36, lon: 43.15, refs: [], d: 'بلد يونس عليه السلام في قول جمهور المفسرين، وقومه هم الذين آمنوا فكُشف عنهم العذاب.', p: ['يونس'], u: 1 },
  { n: 'الجودي', lat: 37.37, lon: 42.34, refs: [['amakin','الجودي']], p: ['نوح'], u: 1, ly: -10 },
  { n: 'أنطاكية', lat: 36.2, lon: 36.16, refs: [['qura','قرية أصحاب القرية'],['aqwam','أصحاب القرية']], p: [], u: 1 },
  { n: 'بلاد الروم', lat: 38.5, lon: 30.0, refs: [['aqwam','الروم']], p: [], u: 1 },
  { n: 'الكهف والرقيم', lat: 31.95, lon: 35.98, refs: [['amakin','الكهف والرقيم'],['aqwam','أصحاب الكهف']], d: 'اختُلف في موضعه: قيل قرب عمّان بالأردن، وقيل أفسس بالأناضول.', p: [], u: 1, ly: -12 },
];
const placeEntries = p => p.refs.map(([c, nm]) => topicItem(c, nm)).filter(Boolean);
function atlas() {
  const B = GEO.b, k = GEO.k, sx = GEO.sx;
  const xy = (lat, lon) => [((lon - B.x0) * k * sx), ((B.y1 - lat) * sx)];
  V(`<div class="stack"><div><div class="eyebrow">أطلس القرآن</div><h1>الأماكن التي ذكرها القرآن على الخريطة</h1><p class="lead">${n(PLACES.length)} موضعاً من المدن والقرى والديار والمعالم. اضغط أي نقطة لعرض ما ورد فيها من آيات وأقوام وأنبياء. الخريطة مرسومة داخل التطبيق وتعمل دون إنترنت.</p></div>
  <div class="legend"><span><i></i>موضع معروف</span><span><i class="u"></i>موضع تقريبي أو مختلف في تعيينه</span></div>
  <div class="cols split">
    <div class="mapbox"><svg id="map" viewBox="0 0 ${GEO.w} ${GEO.h}" role="img" aria-label="خريطة الأماكن القرآنية"><rect class="sea" width="${GEO.w}" height="${GEO.h}"/><g id="mapg"><path class="land" d="${GEO.land}"/><path class="border" d="${GEO.borders}"/>
      ${PLACES.map((p, i) => { const [x, y] = xy(p.lat, p.lon); return `<g class="pin${p.u ? ' unsure' : ''}" data-pl="${i}" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="7"/><text x="10" y="${4 + (p.ly || 0)}" text-anchor="end">${esc(p.n)}</text></g>`; }).join('')}</g></svg>
      <div class="zoom"><button class="iconbtn" id="zin" aria-label="تكبير">+</button><button class="iconbtn" id="zout" aria-label="تصغير">−</button></div></div>
    <section class="panel stack tight" id="plinfo"><h3>اختر موضعاً</h3><p class="muted small" style="margin:0">اضغط أي نقطة على الخريطة. يمكنك التكبير بالأزرار أو بعجلة الفأرة، والسحب للتنقل.</p>
      <div class="list">${PLACES.map((p, i) => `<a class="row" data-pl="${i}"><span class="t">${esc(p.n)}</span><span class="n">${n(placeEntries(p).reduce((s, e) => s + itemAyat(e.it).length, 0))}</span></a>`).join('')}</div></section>
  </div></div>`);
  // pan & zoom
  const svg = $('#map'), g = $('#mapg'); let z = 1, tx = 0, ty = 0;
  const apply = () => { g.setAttribute('transform', `translate(${tx} ${ty}) scale(${z})`); $$('#mapg .pin').forEach(p => { const t = p.getAttribute('transform').replace(/ scale\([^)]*\)/, ''); p.setAttribute('transform', t + ` scale(${base() / z})`); }); };
  const base = () => Math.max(1, GEO.w / (svg.clientWidth || GEO.w) * 0.6);
  const zoomAt = (f, cx = GEO.w / 2, cy = GEO.h / 2) => { const nz = Math.max(1, Math.min(8, z * f)); tx = cx - (cx - tx) * nz / z; ty = cy - (cy - ty) * nz / z; z = nz; if (z === 1) { tx = 0; ty = 0; } apply(); };
  $('#zin').onclick = () => zoomAt(1.5); $('#zout').onclick = () => zoomAt(1 / 1.5);
  const pt = e => { const r = svg.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * GEO.w, (e.clientY - r.top) / r.height * GEO.h]; };
  svg.addEventListener('wheel', e => { e.preventDefault(); const [x, y] = pt(e); zoomAt(e.deltaY < 0 ? 1.25 : 0.8, x, y); }, { passive: false });
  let drag = null, moved = false;
  svg.addEventListener('pointerdown', e => { drag = [...pt(e), tx, ty]; moved = false; });
  svg.addEventListener('pointermove', e => { if (!drag) return; const [x, y] = pt(e); if (Math.abs(x - drag[0]) + Math.abs(y - drag[1]) > 4) { moved = true; svg.setPointerCapture(e.pointerId); } if (moved) { tx = drag[2] + x - drag[0]; ty = drag[3] + y - drag[1]; apply(); } });
  svg.addEventListener('pointerup', e => { drag = null; if (!moved) { const pin = e.target.closest('.pin'); if (pin) showPlace(+pin.dataset.pl); } });
  $('#plinfo').onclick = e => { const r = e.target.closest('[data-pl]'); if (r) showPlace(+r.dataset.pl); };
  apply();
}
function showPlace(i) {
  const p = PLACES[i]; const es = placeEntries(p);
  $$('#mapg .pin').forEach(x => x.classList.toggle('sel', +x.dataset.pl === i));
  const ay = [...new Set(es.flatMap(e => itemAyat(e.it)))].sort((a, b) => a - b);
  $('#plinfo').innerHTML = `<button class="btn ghost" id="plback">→ كل المواضع</button><div class="eyebrow">${p.u ? 'تعيين تقريبي على أقوال المفسرين والمؤرخين' : 'موضع معروف'}</div><h2>${esc(p.n)}</h2>
    ${p.d ? `<p style="margin:0">${esc(p.d)}</p>` : ''}
    ${es.map(e => `<div class="stack tight" style="gap:2px"><a href="#t-${e.c.id}" data-open="${e.c.id}|${esc(e.it.n)}"><b>${esc(e.it.n)}</b></a><span class="muted small">${esc(e.c.title)}${e.it.c ? ` · ${n(e.it.c)} مرة` : ''}</span>${e.it.d ? `<span class="small">${esc(e.it.d)}</span>` : ''}</div>`).join('')}
    ${p.p.length ? `<div><b class="small">الأنبياء المرتبطون:</b><div class="pill-row" style="margin-top:4px">${p.p.map(x => `<a class="chip acc" data-prophet="${esc(x)}">${esc(x)}</a>`).join('')}</div></div>` : ''}
    <h3>من آياته (${n(ay.length)})</h3><div id="plocc"></div>`;
  $('#plback').onclick = () => atlas();
  renderOcc($('#plocc'), ay, null, 6);
  if (innerWidth < 1000) $('#plinfo').scrollIntoView({ block: 'start' });
}

/* ================= timeline */
const ERAS = [
  ['بداية البشرية', ['آدم','إدريس','نوح']], ['العرب البائدة', ['هود','صالح']], ['إبراهيم وذريته', ['إبراهيم','لوط','إسماعيل','إسحاق','يعقوب','يوسف']],
  ['بين يوسف وموسى', ['أيوب','شعيب']], ['عصر بني إسرائيل', ['موسى','هارون','ذو الكفل','داود','سليمان','إلياس','اليسع','يونس']], ['آخر أنبياء بني إسرائيل', ['زكريا','يحيى','عيسى']], ['الرسالة الخاتمة', ['محمد']],
];
const KIN = { 'إسماعيل': 'ابن إبراهيم', 'إسحاق': 'ابن إبراهيم', 'يعقوب': 'ابن إسحاق', 'يوسف': 'ابن يعقوب', 'لوط': 'ابن أخي إبراهيم', 'هارون': 'أخو موسى', 'سليمان': 'ابن داود', 'يحيى': 'ابن زكريا', 'عيسى': 'ابن مريم' };
const SIRA = [ ['بدء نزول الوحي','١٣ ق.هـ · ٦١٠م'],['انشقاق القمر','نحو ٥ ق.هـ'],['الجن يستمعون القرآن','١٠ من البعثة · ٦١٩م'],['الإسراء','نحو ١ ق.هـ (على المشهور)'],['المعراج','نحو ١ ق.هـ (على المشهور)'],['الهجرة والغار','١هـ · ٦٢٢م'],['تحويل القبلة','٢هـ'],['غزوة بدر','رمضان ٢هـ · ٦٢٤م'],['غزوة أُحد','شوال ٣هـ · ٦٢٥م'],['إجلاء بني النضير','٤هـ'],['زواج النبي','٥هـ'],['غزوة الأحزاب','شوال ٥هـ · ٦٢٧م'],['حادثة الإفك','٥ أو ٦هـ'],['صلح الحديبية','ذو القعدة ٦هـ · ٦٢٨م'],['فتح مكة','رمضان ٨هـ · ٦٣٠م'],['غزوة حنين','شوال ٨هـ'],['غزوة تبوك','رجب ٩هـ · ٦٣٠م'],['مسجد الضرار','٩هـ'],['التخيير والتحريم','٩هـ'],['المباهلة','٩ أو ١٠هـ'],['حجة الوداع','ذو الحجة ١٠هـ · ٦٣٢م'] ];
const prophetItem = name => { const c = T.find(x => x.id === 'anbiya'); const it = c.items.find(x => x.n.startsWith(name)); return it ? { c, it } : null; };
function timeline() {
  let tab = timeline.tab || 'anbiya';
  const ak = T.find(x => x.id === 'akhbar');
  const body = tab === 'anbiya' ? ERAS.map(([era, ps]) => `<div class="ev era"><h3>${era}</h3></div>` + ps.map(nm => { const e = prophetItem(nm); if (!e) return ''; const ay = itemAyat(e.it); const ss = new Set(ay.map(i => Q.ayat[i][0]));
      return `<div class="ev"><h3><a data-open="anbiya|${esc(e.it.n)}" href="#t-anbiya">${esc(e.it.n)}</a>${e.it.c ? `<span class="chip acc">${n(e.it.c)} مرة</span>` : ''}<span class="chip">${n(ss.size)} سورة</span>${KIN[nm] ? `<span class="chip gold">${KIN[nm]}</span>` : ''}</h3><p style="margin:2px 0" class="small">${esc(e.it.d || '')}</p>${e.it.g ? `<p class="muted small" style="margin:0">${esc(e.it.g)}</p>` : ''}${ay[0] != null ? `<p class="muted small" style="margin:2px 0">أول ذكر في ترتيب المصحف: ${refLink(ay[0])}</p>` : ''}</div>`; }).join('')).join('')
    : SIRA.map(([nm, when]) => { const it = ak.items.find(x => x.n.startsWith(nm)); if (!it) return ''; return `<div class="ev"><h3><a data-open="akhbar|${esc(it.n)}" href="#t-akhbar">${esc(it.n)}</a><span class="chip gold">${when}</span><span class="chip">${esc(it.g || '')}</span></h3><p style="margin:2px 0" class="small">${esc(it.d || '')}</p><p class="muted small" style="margin:0">الآيات: ${it.r.slice(0, 3).map(([s, e]) => refLink(s) + (e > s ? '–' + n(Q.ayat[e][1]) : '')).join('، ')}</p></div>`; }).join('');
  V(`<div class="stack" style="max-width:900px"><div><div class="eyebrow">الخط الزمني</div><h1>${tab === 'anbiya' ? 'الأنبياء على ترتيب المؤرخين' : 'أحداث السيرة في القرآن'}</h1>
  <p class="lead">${tab === 'anbiya' ? 'ترتيب تقريبي على ما في «قصص الأنبياء» و«البداية والنهاية» لابن كثير. لا تُعرف تواريخ دقيقة لبعثة الأنبياء السابقين، ولذلك رُتّبوا في عصور لا في سنوات.' : 'الأحداث التي نزلت فيها آيات، بسنواتها على المشهور في كتب السيرة (سيرة ابن هشام، وزاد المعاد). وما فيه خلاف ذُكر معه.'}</p></div>
  <div class="seg" id="tlseg" style="align-self:flex-start"><button aria-pressed="${tab === 'anbiya'}" data-t="anbiya">الأنبياء</button><button aria-pressed="${tab === 'sira'}" data-t="sira">السيرة النبوية</button></div>
  <section class="panel"><div class="tl">${body}</div></section></div>`);
  $('#tlseg').onclick = e => { const b = e.target.closest('button'); if (!b) return; timeline.tab = b.dataset.t; timeline(); };
}

/* ================= knowledge graph */
const PPL = { 'نوح': ['قوم نوح'], 'هود': ['عاد'], 'صالح': ['ثمود'], 'لوط': ['قوم لوط'], 'شعيب': ['مدين وأصحاب الأيكة'], 'موسى': ['آل فرعون وقومه','بنو إسرائيل'], 'هارون': ['بنو إسرائيل'], 'يعقوب': ['بنو إسرائيل'], 'عيسى': ['بنو إسرائيل','النصارى'], 'سليمان': ['سبأ'], 'محمد': ['قريش','المهاجرون والأنصار','المنافقون','أهل الكتاب','الأعراب'], 'داود': ['بنو إسرائيل'] };
const FAM = [['إبراهيم','إسماعيل','أب'],['إبراهيم','إسحاق','أب'],['إسحاق','يعقوب','أب'],['يعقوب','يوسف','أب'],['إبراهيم','لوط','عم'],['موسى','هارون','أخ'],['داود','سليمان','أب'],['زكريا','يحيى','أب'],['يحيى','عيسى','ابن خالة']];
function buildGraph() {
  const nodes = [], edges = [], id = new Map();
  const add = (key, label, kind, info) => { if (!id.has(key)) { id.set(key, nodes.length); nodes.push({ key, label, kind, info, deg: 0 }); } return id.get(key); };
  const link = (a, b, t) => { edges.push([a, b, t]); nodes[a].deg++; nodes[b].deg++; };
  const an = T.find(x => x.id === 'anbiya');
  an.items.filter(it => it.c && !it.n.startsWith('شخصيات')).forEach(it => { const short = it.n.replace(/ عليه السلام| ﷺ/g, ''); const p = add('p:' + short, short, 'prophet', { cat: 'anbiya', name: it.n });
    const ss = new Map(); if (it.w && it.w.length) it.w.forEach(w => ss.set(surahOf[w], (ss.get(surahOf[w]) || 0) + 1)); else itemAyat(it).forEach(i => ss.set(Q.ayat[i][0], (ss.get(Q.ayat[i][0]) || 0) + 1));
    [...ss].sort((a, b) => b[1] - a[1]).slice(0, 3).forEach(([s, c]) => link(p, add('s:' + s, 'سورة ' + Q.surahs[s-1].name, 'surah', { surah: s }), `ذُكر فيها ${n(c)} مرة`));
    (PPL[short] || []).forEach(q => { const e = topicItem('aqwam', q); if (e) link(p, add('q:' + q, q, 'people', { cat: 'aqwam', name: e.it.n }), 'قومه أو أُرسل إليهم'); }); });
  FAM.forEach(([a, b, t]) => { if (id.has('p:' + a) && id.has('p:' + b)) link(id.get('p:' + a), id.get('p:' + b), t); });
  PLACES.forEach((pl, i) => { if (!pl.p.length) return; const x = add('l:' + i, pl.n, 'place', { place: i }); pl.p.forEach(pn => { if (id.has('p:' + pn)) link(id.get('p:' + pn), x, 'موضع دعوته أو خبره'); });
    pl.refs.forEach(([c, nm]) => { if (c === 'aqwam') { const e = topicItem(c, nm); if (e && id.has('q:' + nm)) link(id.get('q:' + nm), x, 'دياره'); } }); });
  return { nodes, edges };
}
let GR = null;
function graph() {
  if (!GR) { GR = buildGraph(); layout(GR); }
  const { nodes, edges } = GR;
  const KN = { prophet: 'نبي', people: 'قوم', place: 'مكان', surah: 'سورة' };
  V(`<div class="stack"><div><div class="eyebrow">شبكة المعرفة</div><h1>كيف تترابط القصص القرآنية</h1><p class="lead">${n(nodes.length)} عقدة و${n(edges.length)} علاقة: الأنبياء، وأقوامهم، وديارهم، والسور التي ذُكروا فيها أكثر من غيرها، وصلات القرابة بينهم. اضغط أي عقدة لإبراز علاقاتها وتفاصيلها.</p></div>
  <div class="legend">${Object.entries(KN).map(([k, l]) => `<span><span class="sw k-${k}"></span>${l}</span>`).join('')}</div>
  <div class="cols split">
    <div class="graphbox"><svg id="gsvg" viewBox="-520 -420 1040 840" aria-label="شبكة المعرفة"><g id="gg">
      ${edges.map(([a, b], j) => `<line data-e="${j}" x1="${nodes[a].x.toFixed(1)}" y1="${nodes[a].y.toFixed(1)}" x2="${nodes[b].x.toFixed(1)}" y2="${nodes[b].y.toFixed(1)}"/>`).join('')}
      ${nodes.map((d, i) => `<g class="nd" data-n="${i}" transform="translate(${d.x.toFixed(1)} ${d.y.toFixed(1)})"><circle r="${d.kind === 'prophet' ? 6 + Math.min(10, d.deg) : 6}" class="k-${d.kind}"/><text y="${d.kind === 'prophet' ? -12 - Math.min(10, d.deg) / 2 : -9}" text-anchor="middle">${esc(d.label)}</text></g>`).join('')}
    </g></svg></div>
    <section class="panel stack tight" id="ginfo"><h3>اضغط عقدة</h3><p class="muted small" style="margin:0">مثال: اضغط «موسى» لترى قومه وأماكنه والسور التي ورد فيها اسمه أكثر.</p>
      <div class="pill-row">${nodes.filter(d => d.kind === 'prophet').map(d => `<a class="chip acc" data-gn="${nodes.indexOf(d)}">${esc(d.label)}</a>`).join('')}</div></section>
  </div></div>`);
  const svg = $('#gsvg'), g = $('#gg'); let z = 1, tx = 0, ty = 0;
  const apply = () => g.setAttribute('transform', `translate(${tx} ${ty}) scale(${z})`);
  svg.addEventListener('wheel', e => { e.preventDefault(); z = Math.max(.6, Math.min(4, z * (e.deltaY < 0 ? 1.2 : .83))); apply(); }, { passive: false });
  let drag = null, moved = false;
  svg.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY, tx, ty]; moved = false; });
  svg.addEventListener('pointermove', e => { if (!drag) return; const r = svg.getBoundingClientRect(), f = 1040 / r.width; if (Math.abs(e.clientX - drag[0]) + Math.abs(e.clientY - drag[1]) > 4) { moved = true; svg.setPointerCapture(e.pointerId); } if (moved) { tx = drag[2] + (e.clientX - drag[0]) * f; ty = drag[3] + (e.clientY - drag[1]) * f; apply(); } });
  svg.addEventListener('pointerup', e => { drag = null; if (!moved) { const nd = e.target.closest('.nd'); if (nd) focusNode(+nd.dataset.n); } });
  $('#ginfo').onclick = e => { const c = e.target.closest('[data-gn]'); if (c) focusNode(+c.dataset.gn); };
}
function focusNode(i) {
  const { nodes, edges } = GR; const d = nodes[i]; const nb = new Set([i]); const rel = [];
  edges.forEach(([a, b, t], j) => { if (a === i || b === i) { nb.add(a); nb.add(b); rel.push([a === i ? b : a, t]); } });
  $$('#gg .nd').forEach(el => el.classList.toggle('dim', !nb.has(+el.dataset.n)));
  $$('#gg line').forEach(el => { const [a, b] = edges[+el.dataset.e]; const on = a === i || b === i; el.classList.toggle('on', on); el.classList.toggle('dim', !on); });
  const KN = { prophet: 'نبي', people: 'قوم', place: 'مكان', surah: 'سورة' };
  let open = '';
  if (d.info.cat) open = `<a class="btn pri" data-open="${d.info.cat}|${esc(d.info.name)}" href="#t-${d.info.cat}">افتح المدخل في الموسوعة</a>`;
  if (d.info.surah) open = `<a class="btn pri" href="#s${d.info.surah}">اقرأ السورة</a>`;
  if (d.info.place != null) open = `<a class="btn pri" href="#map" data-place="${d.info.place}">اعرضه على الخريطة</a>`;
  $('#ginfo').innerHTML = `<div class="eyebrow">${KN[d.kind]}</div><h2>${esc(d.label)}</h2><div class="list">${rel.map(([j, t]) => `<a class="row" data-gn="${j}"><span class="t"><span class="sw k-${nodes[j].kind}"></span>${esc(nodes[j].label)}</span><span class="muted small">${esc(t)}</span></a>`).join('')}</div><div class="toolbar">${open}<button class="btn" id="greset">إظهار الكل</button></div>`;
  $('#greset').onclick = () => { $$('#gg .nd,#gg line').forEach(el => el.classList.remove('dim', 'on')); };
}
function layout(G) { // Fruchterman-Reingold with gravity, deterministic seed
  const N = G.nodes.length, K = 55; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  G.nodes.forEach(d => { d.x = (rnd() - .5) * 600; d.y = (rnd() - .5) * 500; });
  let temp = 60;
  for (let it = 0; it < 500; it++) {
    const dx = new Float64Array(N), dy = new Float64Array(N);
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) { const a = G.nodes[i], b = G.nodes[j]; let x = a.x - b.x, y = a.y - b.y; const d = Math.max(1, Math.hypot(x, y)); const f = K * K / d; x = x / d * f; y = y / d * f; dx[i] += x; dy[i] += y; dx[j] -= x; dy[j] -= y; }
    for (const [i, j] of G.edges) { const a = G.nodes[i], b = G.nodes[j]; let x = a.x - b.x, y = a.y - b.y; const d = Math.max(1, Math.hypot(x, y)); const f = d * d / K; x = x / d * f; y = y / d * f; dx[i] -= x; dy[i] -= y; dx[j] += x; dy[j] += y; }
    G.nodes.forEach((d, i) => { const r = Math.hypot(d.x, d.y); dx[i] -= d.x * 0.9 * (1 + r / 300); dy[i] -= d.y * 1.1 * (1 + r / 300); const m = Math.max(1, Math.hypot(dx[i], dy[i])); d.x += dx[i] / m * Math.min(m, temp); d.y += dy[i] / m * Math.min(m, temp); });
    temp = Math.max(1, temp * 0.985);
  }
  const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(p * (s.length - 1))]; };
  const sx = q(G.nodes.map(d => Math.abs(d.x)), .97) / 470, sy = q(G.nodes.map(d => Math.abs(d.y)), .97) / 380;
  G.nodes.forEach(d => { d.x = Math.max(-500, Math.min(500, d.x / sx)); d.y = Math.max(-400, Math.min(400, d.y / sy)); });
}

/* ================= ayah share card */
async function makeCard(i) {
  const a = Q.ayat[i]; const txt = ayahText(i);
  await document.fonts.load('48px "Amiri Quran"').catch(() => {}); await document.fonts.load('700 40px "Aref Ruqaa"').catch(() => {});
  const S = 1080, c = document.createElement('canvas'); c.width = S; c.height = S; const x = c.getContext('2d');
  x.fillStyle = '#1b2559'; x.fillRect(0, 0, S, S);
  x.strokeStyle = 'rgba(227,164,64,.55)'; x.lineWidth = 3; x.strokeRect(48, 48, S - 96, S - 96);
  x.fillStyle = '#e3a440'; [[120, 950, 14], [100, 905, 10], [88, 868, 7]].forEach(([cx, cy, r]) => { x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill(); });
  x.direction = 'rtl'; x.textAlign = 'center'; x.fillStyle = '#f5f2ea';
  let size = 64; const wrap = sz => { x.font = `${sz}px "Amiri Quran", "Amiri", serif`; const ws = txt.split(' '), lines = []; let cur = ''; for (const w of ws) { const t = cur ? cur + ' ' + w : w; if (x.measureText(t).width > S - 220 && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; };
  let lines = wrap(size); while (lines.length * size * 1.9 > 640 && size > 30) { size -= 4; lines = wrap(size); }
  const lh = size * 1.9, top = S / 2 - lines.length * lh / 2 + size * .6 - 30;
  lines.forEach((l, k) => x.fillText(l, S / 2, top + k * lh));
  x.font = '34px "Readex Pro", sans-serif'; x.fillStyle = '#e3a440'; x.fillText(`سورة ${Q.surahs[a[0]-1].name} · الآية ${n(a[1])}`, S / 2, S - 170);
  x.font = '700 44px "Aref Ruqaa", serif'; x.fillStyle = '#f5f2ea'; x.textAlign = 'left'; x.fillText('مشكاة', 120, 140);
  return new Promise(r => c.toBlob(r, 'image/png'));
}
async function cardDrawer(i) {
  openDrawer(`<div class="stack"><div><div class="eyebrow">${esc(ref(i))}</div><h2>بطاقة الآية</h2></div><p class="loading">جارٍ رسم البطاقة…</p></div>`);
  const blob = await makeCard(i); const url = URL.createObjectURL(blob);
  const fname = `آية-${Q.surahs[Q.ayat[i][0]-1].name}-${Q.ayat[i][1]}.png`;
  $('#sheet .loading').outerHTML = `<img class="cardprev" src="${url}" alt="بطاقة ${esc(ref(i))}"><div class="toolbar"><button class="btn pri" id="cardSave">حفظ الصورة</button>${navigator.canShare ? '<button class="btn" id="cardShare">مشاركة</button>' : ''}<button class="btn" id="cardCopy"><svg><use href="#i-copy"/></svg>نسخ نص الآية</button></div><p class="muted small" id="cardMsg" style="margin:0"></p>`;
  $('#cardCopy').onclick = () => copyText(`${ayahText(i)} ﴿${Q.surahs[Q.ayat[i][0]-1].name}: ${Q.ayat[i][1]}﴾`);
  $('#cardSave').onclick = async () => {
    if (IS_PWA) { const a = document.createElement('a'); a.href = url; a.download = fname; a.click(); return; }
    const dl = await claude?.use?.('downloads').catch(() => null);
    if (!dl) { $('#cardMsg').textContent = 'الحفظ غير متاح في هذا العرض. اضغط الصورة مطولاً واحفظها.'; return; }
    try { await dl.save({ filename: fname, data: blob }); } catch (e) { $('#cardMsg').textContent = 'لم تُحفظ الصورة.'; }
  };
  const sh = $('#cardShare'); if (sh) sh.onclick = async () => { const f = new File([blob], fname, { type: 'image/png' }); try { if (navigator.canShare({ files: [f] })) await navigator.share({ files: [f], text: ref(i) }); else throw 0; } catch (e) { $('#cardMsg').textContent = 'المشاركة غير متاحة هنا، احفظ الصورة ثم شاركها.'; } };
}

/* ================= settings */
let installEvt = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; });
function settings() {
  V(`<div class="stack" style="max-width:860px"><div><div class="eyebrow">الإعدادات</div><h1>الإعدادات والتنزيل</h1></div>
  <section class="panel stack tight"><h3>العرض</h3>
    <div class="toolbar"><span>الوضع:</span><div class="seg" id="thSeg">${[['auto','حسب الجهاز'],['light','فاتح'],['dark','داكن']].map(([k, l]) => `<button aria-pressed="${ST.prefs.theme === k}" data-t="${k}">${l}</button>`).join('')}</div></div>
    <div class="toolbar"><span>حجم خط المصحف:</span><div class="seg" id="szSeg">${[[0.9,'صغير'],[1,'متوسط'],[1.2,'كبير'],[1.45,'كبير جداً']].map(([k, l]) => `<button aria-pressed="${ST.prefs.size === k}" data-s="${k}">${l}</button>`).join('')}</div></div>
    <div class="toolbar"><span>التفسير الافتراضي:</span><select id="tfSel">${TF.map(b => `<option value="${b.key}" ${b.key === ST.prefs.tafsir ? 'selected' : ''}>${b.title}</option>`).join('')}</select></div></section>
  <section class="panel stack tight"><h3>التثبيت والعمل دون إنترنت</h3>
    ${IS_PWA ? `<p style="margin:0">التطبيق يحفظ نص المصحف والإحصاءات والموسوعة والتفسير الميسر وغريب القرآن تلقائياً، فيعمل دون إنترنت. ولتنزيل التفاسير الكبيرة كلها (نحو ٦٠ ميغابايت) اضغط الزر.</p>
      <div class="toolbar"><button class="btn pri" id="dlAll">تنزيل كل التفاسير للعمل دون إنترنت</button><span id="dlStat" class="muted small"></span></div><div class="meter"><i id="dlBar" style="width:0"></i></div>
      <div class="toolbar"><button class="btn" id="instBtn" ${installEvt ? '' : 'hidden'}>ثبّت مشكاة على هذا الجهاز</button></div>
      <p class="muted small" style="margin:0">على آيفون: افتح الرابط في سفاري، ثم «مشاركة» ثم «إضافة إلى الشاشة الرئيسية». على أندرويد والكمبيوتر: زر التثبيت في المتصفح أو الزر أعلاه.</p>`
      : `<p style="margin:0">هذه نسخة مشكاة على claude.ai. توجد نسخة قابلة للتثبيت على الجوال والكمبيوتر تعمل دون إنترنت وتدعم التسميع بالصوت والاستماع للتلاوة.</p>`}
  </section>
  <section class="panel stack tight"><h3>بياناتك</h3><p class="muted small" style="margin:0">${cloud ? 'تقدّمك محفوظ في حسابك (خاص بك ولا يراه غيرك) ونسخة منه على هذا الجهاز.' : 'تقدّمك محفوظ على هذا الجهاز. انسخ الرمز لنقله إلى جهاز آخر.'}</p>
    <div class="toolbar"><button class="btn" id="expBtn">نسخ رمز النقل</button><button class="btn" id="impBtn">لصق رمز من جهاز آخر</button><button class="btn" id="clrBtn">مسح كل بياناتي</button></div>
    <textarea class="field" id="impBox" hidden placeholder="الصق الرمز هنا ثم اضغط «استيراد»"></textarea><div class="toolbar" id="impRow" hidden><button class="btn pri" id="impGo">استيراد</button></div><p class="small" id="dataMsg" style="margin:0"></p></section>
  <section class="panel small muted">الإصدار ٢٫٠ · ${IS_PWA ? 'النسخة المستقلة' : 'نسخة claude.ai'}</section></div>`);
  $('#thSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; ST.prefs.theme = b.dataset.t; applyPrefs(); save(); settings(); };
  $('#szSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; ST.prefs.size = +b.dataset.s; applyPrefs(); save(); settings(); };
  $('#tfSel').onchange = e => { ST.prefs.tafsir = e.target.value; save(); toast('حُفظ التفسير الافتراضي'); };
  $('#expBtn').onclick = () => copyText(btoa(unescape(encodeURIComponent(JSON.stringify({ bookmarks: ST.bookmarks, hifz: ST.hifz, last: ST.last })))));
  $('#impBtn').onclick = () => { $('#impBox').hidden = false; $('#impRow').hidden = false; $('#impBox').focus(); };
  $('#impGo').onclick = () => { try { const d = JSON.parse(decodeURIComponent(escape(atob($('#impBox').value.trim())))); ST.bookmarks = [...new Set([...ST.bookmarks, ...(d.bookmarks || [])])]; Object.assign(ST.hifz, d.hifz || {}); if (d.last != null) ST.last = d.last; save(); $('#dataMsg').textContent = 'استُورد تقدّمك بنجاح.'; } catch (e) { $('#dataMsg').textContent = 'الرمز غير صحيح. انسخه كاملاً ثم أعد المحاولة.'; } };
  let armed = false; $('#clrBtn').onclick = () => { if (!armed) { armed = true; $('#clrBtn').textContent = 'اضغط مرة أخرى للتأكيد'; return; } ST.bookmarks = []; ST.hifz = {}; ST.last = null; save(); $('#dataMsg').textContent = 'مُسحت بياناتك.'; $('#clrBtn').textContent = 'مسح كل بياناتي'; armed = false; };
  const ib = $('#instBtn'); if (ib) ib.onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; ib.hidden = true; };
  const da = $('#dlAll'); if (da) da.onclick = async () => {
    const files = TF.flatMap(b => Array.from({ length: b.chunks }, (_, k) => `data/t/${b.key}/${k}.txt`)); let done = 0; da.disabled = true;
    const cache = await caches.open('mishkat-data-v1');
    for (const f of files) { try { if (!(await cache.match(f))) { const r = await fetch(f); if (r.ok) await cache.put(f, r); } } catch (e) {} done++; $('#dlBar').style.width = (done / files.length * 100) + '%'; $('#dlStat').textContent = `${n(done)} من ${n(files.length)} ملفاً`; }
    $('#dlStat').textContent = 'اكتمل التنزيل. التفاسير الثمانية متاحة دون إنترنت.'; da.disabled = false;
  };
}
function applyPrefs() {
  const r = document.documentElement; if (ST.prefs.theme === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', ST.prefs.theme);
  document.documentElement.style.setProperty('--qs', ST.prefs.size);
  let st = $('#qsize'); if (!st) { st = document.createElement('style'); st.id = 'qsize'; document.head.appendChild(st); }
  st.textContent = `.ayah{font-size:calc(1.5rem * ${ST.prefs.size})}@media (max-width:640px){.ayah{font-size:calc(1.32rem * ${ST.prefs.size})}}`;
}

const CONTACT = `<section class="panel stack tight"><h2>التواصل</h2><p style="margin:0">يصدر تطبيق «مشكاة» عن <b>منجز</b>. للملاحظات والاقتراحات وتصحيح أي خطأ:</p><dl class="kv"><dt>البريد</dt><dd><span dir="ltr">munijizqa@gmail.com</span> <button class="btn ghost" data-copy="munijizqa@gmail.com">نسخ</button></dd><dt>الهاتف وواتساب</dt><dd><span dir="ltr">+974 5160 0498</span> <button class="btn ghost" data-copy="+97451600498">نسخ</button></dd></dl></section>`;
/* ================= about */
function about() {
  V(`<div class="stack" style="max-width:860px"><div><div class="eyebrow">المنهج والمصادر</div><h1>كيف بُنيت مشكاة</h1></div>
  <section class="panel stack"><h2>النص القرآني</h2><p style="margin:0">النص المعروض هو نص مصحف المدينة النبوية برواية حفص عن عاصم، من إصدار مجمع الملك فهد لطباعة المصحف الشريف (الإصدار ١٣). وقد قوبل رسم كل آية بنص مدونة القرآن العربية المبني على نسخة «تنزيل» الموثقة، فتطابقا في ${n(Q.ayat.length - 2)} آية، والفرق في الآيتين الباقيتين فرق في رسم الياء الصغيرة لا في القراءة.</p></section>
  <section class="panel stack"><h2>طريقة العدّ</h2><ul style="margin:0;padding-inline-start:1.2em">
   <li><b>الكلمة:</b> بحسب تقسيم مدونة القرآن الصرفية (${n(W.w.length)} كلمة). وتختلف كتب علوم القرآن في عدد الكلمات لاختلافها في عدّ الحروف المتصلة والمنفصلة.</li>
   <li><b>اللمّة:</b> الأصل المعجمي للكلمة. <b>الجذر:</b> الأصل الثلاثي أو الرباعي.</li>
   <li><b>الحرف:</b> حروف الرسم دون الحركات والعلامات، فبلغ المجموع ${n(Q.checks.letters)} حرفاً.</li></ul>
   <p class="note" style="margin:0">لا يُبنى على هذه الأعداد ما يُسمّى «الإعجاز العددي» دون منهج علمي منضبط، لأن نتائج العدّ تتغير بتغير طريقته.</p></section>
  <section class="panel stack"><h2>المزايا الذكية وحدودها</h2><ul style="margin:0;padding-inline-start:1.2em">
   <li><b>البحث بالمعنى:</b> يعمل على الجهاز نفسه، ويطابق كلماتك مع نص الآيات والتفسير الميسر بعد ردّها إلى أصولها، ويوسّعها بالجذور القرآنية وبقاموس مفاهيم. وهو ترتيب حسابي للقرب لا يغني عن التدبر.</li>
   <li><b>اسأل مشكاة:</b> ${IS_PWA ? 'مساعد بحث يجمع النصوص من داخل التطبيق ويرتبها، ولا يؤلف جواباً. ولا يُعتمد عليه في الفتوى.' : 'يجيب بنموذج Claude من نصوص التطبيق فقط عبر أدوات بحث داخلية، ويذكر المواضع لتتحقق منها. ولا يُعتمد عليه في الفتوى.'}</li>
   <li><b>التسميع بالصوت:</b> يعتمد على خدمة التعرف على الكلام في المتصفح، وقد يخطئ في بعض الكلمات، فيُستعمل للمراجعة لا للإجازة.</li>
   <li><b>الأطلس والخط الزمني:</b> تعيين الأماكن غير المقطوع بها وترتيب الأنبياء تقريبيان، ونُبّه على ذلك في مواضعه.</li></ul></section>
  <section class="panel stack"><h2>كتب التفسير والمعاني</h2><div class="list">${TF.map(b => `<div class="row" style="cursor:default"><span class="t"><b>${b.title}</b> <span class="muted">· ${b.author}</span></span><span class="n">${n(b.covered)} آية</span></div>`).join('')}</div></section>
  <section class="panel stack"><h2>المصادر</h2><ul style="margin:0;padding-inline-start:1.2em">
   <li>مصحف المدينة النبوية، مجمع الملك فهد لطباعة المصحف الشريف.</li><li>Quranic Arabic Corpus (مدونة القرآن العربية)، جامعة ليدز، الإصدار ٠٫٤.</li><li>Tanzil Quran Text (النص الإملائي الموثق).</li>
   <li>التفاسير: الميسر، والميسر في غريب القرآن، والجلالين، والسعدي، والبغوي، وابن كثير، والطبري، والقرطبي.</li>
   <li>الخط الزمني: قصص الأنبياء والبداية والنهاية لابن كثير؛ سيرة ابن هشام؛ زاد المعاد لابن القيم.</li>
   <li>الخريطة: بيانات Natural Earth (ملك عام)، والتعيين على أقوال المفسرين والجغرافيين (معجم البلدان لياقوت الحموي).</li>
   ${IS_PWA ? '<li>التلاوة الصوتية: الشيخ مشاري العفاسي من موقع EveryAyah.</li>' : ''}</ul></section>${CONTACT}</div>`);
}


/* ================= guide: what the app offers, roles, requirements and roadmap (all in the one link) */
function mishkatAyah() { const i = idxOf(24, 35), a = Q.ayat[i]; const ws = []; for (let k = 0; k < a[3]; k++) ws.push(W.w[a[2]+k][0]); const k = ws.findIndex(w => norm(w).replace(/ا/g, '').includes('مشكو')); return k > 1 ? ws.slice(k - 2, k + 3).join(' ') : ''; }
function guide() {
  const F = [
    IS_PWA ? ['اسأل مشكاة (مساعد البحث)','تكتب سؤالك فيجمع لك من داخل التطبيق أقرب الآيات مع تفسيرها، وأقوال السعدي وابن كثير والقرطبي في أقربها، والمداخل الموضوعية، وإحصاء الألفاظ. يعمل على جهازك دون إنترنت ودون أي خدمة خارجية.'] : ['اسأل مشكاة (مساعد ذكي)','يجيب عن أسئلتك بالعربية من نصوص التطبيق نفسها: يبحث في الآيات، ويقرأ التفاسير الثمانية، ويستخرج الإحصاءات، ثم يكتب جواباً منظماً كل آية فيه رابط إلى موضعها. لا يذكر آية من حفظه، ولا يفتي.'],
    ['البحث بالمعنى','تكتب الفكرة بلغتك (مثل: بر الوالدين)، فيبحث في الآيات وفي معانيها من التفسير الميسر، ويوسّع البحث بالجذور القرآنية وقاموس مفاهيم، ويرتب النتائج بالأقرب. يعمل على الجهاز دون خادم.'],
    ['الحفظ والتسميع','خمسة أوضاع: قراءة، وأوائل الكلمات، وإخفاء كامل، وتسميع بالكتابة يصحح كلمةً كلمة، وتسميع بالصوت. وجدول مراجعة بالتكرار المتباعد يحدد موعد مراجعة كل مقطع حسب تقييمك.'],
    ['أطلس القرآن','خريطة تفاعلية مرسومة داخل التطبيق لاثنين وعشرين موضعاً قرآنياً، تفرّق بين الموضع المعروف والمختلف في تعيينه، ومن كل موضع إلى آياته وأقوامه وأنبيائه.'],
    ['الخط الزمني','الأنبياء في عصورهم على ترتيب ابن كثير، وواحد وعشرون حدثاً من السيرة بسنواتها على المشهور مع آياتها.'],
    ['شبكة المعرفة','خريطة علاقات تربط الأنبياء بأقوامهم وديارهم وصلات قرابتهم والسور التي ذُكروا فيها أكثر.'],
    ['بطاقة الآية','صورة مربعة جاهزة للمشاركة بخط المصحف وهوية مشكاة، تُحفظ بضغطة.'],
    IS_PWA ? ['يعمل دون إنترنت ويُثبَّت','بعد أول فتح يعمل التطبيق دون اتصال، ويُثبَّت على الجوال والكمبيوتر كأي تطبيق. ومعه التسميع بالصوت والاستماع إلى تلاوة الشيخ مشاري العفاسي.'] : ['متابعتك محفوظة في حسابك','العلامات وموضع القراءة وجدول الحفظ تُحفظ في حسابك على claude.ai وتتزامن بين الجوال والكمبيوتر، وهي خاصة بك لا يراها غيرك.'],
    ['الحسابات ولوحة الإدارة', IS_PWA ? 'ثلاثة أدوار: زائر وعميل ومدير شامل. المدير يدير الإعلان العام والآية المختارة والحسابات كلها، ويُحفظ ذلك في ملف config.json يُرفع إلى الموقع فيعمّ كل الأجهزة. والتطبيق كله يعمل في المتصفح دون أي خدمة خارجية.' : 'لمالك الموسوعة وحده: إعلان عام يظهر لكل الزوار، وآية مختارة للصفحة الرئيسية، وتقرير سلامة البيانات.'],
  ];
  const R = IS_PWA ? [
    ['المدير الشامل', 'كل الصفحات، ولوحة الإدارة: الإعلان العام، والآية المختارة، وإدارة الحسابات (إضافة عميل أو مدير، وتعيين كلمات المرور، والتعطيل والحذف)، وتقرير سلامة البيانات. الدخول باسم مستخدم وكلمة مرور.'],
    ['العميل', 'كل الصفحات والمزايا، وحساب باسمه تُحفظ فيه العلامات والحفظ وموضع القراءة، ويغيّر كلمة مروره. لا يرى لوحة الإدارة.'],
    ['الزائر', 'كل الصفحات والمزايا دون تسجيل، ويُحفظ تقدّمه على جهازه وينقله برمز النقل من «الإعدادات».'],
  ] : [
    ['مالك الموسوعة (أنت)','كل الصفحات، ولوحة الإدارة، وتعديل الإعلان والآية المختارة. الدخول بحسابك في claude.ai نفسه، فلا توجد كلمة مرور منفصلة تُحفظ أو تُسرَّب.'],
    ['مستخدم مسجّل ممن تشاركه الرابط','كل الصفحات والمساعد الذكي، ومتابعته محفوظة في حسابه. لا يرى لوحة الإدارة ولا يستطيع تعديل الإعلان (تمنع ذلك قاعدة صلاحيات على الخادم).'],
    ['زائر','القراءة والبحث والموسوعة والأطلس والحفظ، ومتابعته محفوظة على جهازه.'],
  ];
  const C = IS_PWA ? [
    ['الاستضافة الحالية','مجاناً','GitHub Pages على حساب منجز.'],
    ['نطاق خاص (مثل mishkat.app)','نحو ١٠ إلى ٢٠ دولاراً سنوياً','اختياري، ويُربط بالاستضافة نفسها.'],
    ['متجر Google Play','٢٥ دولاراً مرة واحدة','حساب مطوّر، ثم تحويل هذا التطبيق إلى تطبيق أندرويد بأداة PWABuilder.'],
    ['متجر Apple App Store','٩٩ دولاراً سنوياً','حساب مطوّر أبل وجهاز ماك للبناء ومراجعة أبل. ويمكن الآن تثبيته على آيفون من سفاري دون المتجر.'],
  ] : [
    ['الاستعمال الحالي على claude.ai','بلا تكلفة إضافية','يكفي اشتراكك الحالي. المساعد الذكي يعمل من رصيد Claude لكل مستخدم، ويُستأذن قبل أول استعمال.'],
    ['نطاق خاص (مثل mishkat.app)','نحو ١٠ إلى ٢٠ دولاراً سنوياً','اختياري، لو أردت نسخة مستقلة على الإنترنت باسمك.'],
    ['استضافة نسخة مستقلة','مجاناً','عبر GitHub Pages أو Cloudflare Pages. منشورة الآن على موقع منجز: munjiz-qa.github.io/mishkat'],
    ['متجر Google Play','٢٥ دولاراً مرة واحدة','حساب مطوّر، ثم تحويل النسخة المستقلة إلى تطبيق أندرويد بأداة PWABuilder أو Bubblewrap.'],
    ['متجر Apple App Store','٩٩ دولاراً سنوياً','حساب مطوّر أبل، وجهاز ماك للبناء والنشر، ومراجعة أبل.'],
    ['المساعد الذكي في النسخة المستقلة','حسب الاستعمال','يحتاج مفتاح Anthropic API وخادماً صغيراً يحفظ المفتاح. الكلفة تُحسب بعدد الكلمات المعالجة.'],
  ];
  const NEXT = [
    'تصحيح التلاوة والتجويد بنموذج صوتي عربي يعمل على الجهاز، يكتشف الخطأ في الحرف والمدّ والغنّة، لا في الكلمة فقط.',
    'تلوين أحكام التجويد في نص المصحف، والاستماع كلمةً كلمة مع تظليل الكلمة المتلوّة.',
    'الإعراب وشجرة التركيب لكل آية من مدونة القرآن العربية.',
    'بحث دلالي بنماذج التضمين (Embeddings) يفهم المعنى حتى مع اختلاف الألفاظ كلياً، وترجمات معاني القرآن بلغات متعددة.',
    'صور صفحات مصحف المدينة نفسها، والانتقال بين الصفحة والإحصاء.',
    'مجموعات حفظ مشتركة لحلقات التحفيظ: المعلّم يرى تقدّم طلابه ومواعيد مراجعتهم.',
  ];
  V(`<div class="stack" style="max-width:900px"><div><div class="eyebrow">دليل التطبيق</div><h1>مشكاة: ما الذي يقدّمه، ومن يستعمله، وما المطلوب لإطلاقه</h1>
  <p class="lead">«مشكاة» هي الإصدار الثاني من موسوعة إحصاء القرآن الكريم، باسم وهوية مستقلين. والاسم من قوله تعالى: <span style="font-family:var(--f-quran);font-size:1.15em">﴿${mishkatAyah()}﴾</span> [النور: ٣٥]. والمشكاة كُوّة في الجدار يوضع فيها المصباح فتجمع نوره وتردّه، وكذلك يجمع التطبيق نصوص القرآن وعلومه في موضع واحد. يضم كل ما في الإصدار الأول، وتُضاف إليه المزايا الذكية الآتية.</p></div>
  <section class="panel stack tight"><h2>ما بقي من الإصدار الأول</h2><p style="margin:0">نص مصحف المدينة النبوية المتحقَّق منه، وإحصاء ${n(W.w.length)} كلمة و${n(W.roots.length)} جذراً و${n(W.lemmas.length)} لمّة، والمعجم المفهرس، وثمانية كتب تفسير، و${n(T.length)} فهرساً موضوعياً منها الأحكام الفقهية على أبواب الفقه.</p></section>
  <section class="panel stack tight"><h2>الجديد في هذا الإصدار</h2>${F.map(([t, d]) => `<div class="due" style="align-items:flex-start"><b style="min-width:12em">${t}</b><span class="small" style="flex:1;min-width:220px">${d}</span></div>`).join('')}</section>
  <section class="panel stack tight"><h2>الأدوار والصلاحيات</h2>${R.map(([t, d]) => `<div class="due" style="align-items:flex-start"><b style="min-width:12em">${t}</b><span class="small" style="flex:1;min-width:220px">${d}</span></div>`).join('')}
    ${IS_PWA ? '' : '<p class="muted small" style="margin:0">الرابط خاص بك الآن. لمشاركته افتح قائمة المشاركة (Share) أعلى الصفحة.</p>'}</section>
  <section class="panel stack tight"><h2>المطلوب والتكاليف</h2><div class="tablebox"><table class="wtable"><thead><tr><th>البند</th><th>التكلفة التقريبية</th><th>التفاصيل</th></tr></thead><tbody>${C.map(r => `<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table></div>
    ${IS_PWA ? '<p class="muted small" style="margin:0">أسعار المتاجر هي المعلنة حتى تاريخ هذا الإصدار وقد تتغير.</p>' : `<p class="muted small" style="margin:0">ميزتان تحتاجان إلى النسخة المستقلة: التسميع بالصوت والاستماع إلى التلاوة، لأن صفحة claude.ai لا تسمح بالميكروفون ولا بملفات صوت من مواقع أخرى. والتسميع بالكتابة متاح هنا الآن. أسعار المتاجر هي المعلنة حتى تاريخ هذا الإصدار وقد تتغير.</p>`}</section>
  <section class="panel stack tight"><h2>مقترحات للمرحلة القادمة</h2><ul style="margin:0;padding-inline-start:1.2em">${NEXT.map(x => `<li>${x}</li>`).join('')}</ul></section>
  <section class="panel stack tight"><h2>كيف اختُبر</h2><p style="margin:0" class="small">جُرّبت تسع عشرة صفحة على الكمبيوتر والجوال، في الوضعين الفاتح والداكن، دون أي خطأ برمجي ودون خروج عن عرض الشاشة. ${IS_PWA ? 'وجُرّب دور الزائر والمستخدم (حفظ التقدم على الجهاز ونقله برمز)، ودور المدير (رفض كلمة المرور الخاطئة، وقبول الصحيحة، وتطبيق الإعلان والآية المختارة)، والعمل دون إنترنت بعد أول فتح.' : 'وجُرّبت الأدوار الثلاثة: الزائر لا يرى لوحة الإدارة، والمستخدم المسجّل تُحفظ متابعته في حسابه، والمالك يحفظ الإعلان والآية المختارة فتظهران فوراً.'} وجُرّب التسميع بالكتابة على الفاتحة فصحّح ٢٩ كلمة من ٢٩، والبحث بالمعنى عن «بر الوالدين» فجاءت في أول النتائج الأنعام ١٥١ والنساء ٣٦ والبقرة ٨٣.</p></section>${CONTACT}</div>`);
}

/* ================= admin (owner of the claude.ai artifact) */
async function sha(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
const ROLE = { client: 'عميل', admin: 'مدير شامل' };
const isAdmin = () => SESSION?.role === 'admin';
const uKey = u => String(u || '').trim().toLowerCase();
const pwHash = (u, pw) => sha('mishkat-user-v1:' + uKey(u) + ':' + pw);
function allUsers() { // published accounts (config.json) plus accounts created or changed on this device
  const m = new Map(); for (const x of (siteCfg.users || [])) m.set(x.u, { ...x, src: 'site' });
  for (const x of LS.get('users', [])) m.set(x.u, { ...(m.get(x.u) || {}), ...x, src: m.has(x.u) ? 'site' : 'device' });
  return [...m.values()].filter(x => !x.del);
}
function putUser(x) { const L = LS.get('users', []).filter(y => y.u !== x.u); L.push(x); LS.set('users', L); }
function startSession(x) {
  const guest = LS.get('state', null), mine = LS.get('state@' + x.u, null);
  if (!mine && guest && (guest.bookmarks?.length || Object.keys(guest.hifz || {}).length)) LS.set('state@' + x.u, guest); // carry the visitor's progress into the new account
  SESSION = { u: x.u, name: x.name, role: x.role }; LS.set('session', SESSION); loadState(); applyPrefs(); drawNav();
}
function endSession() { SESSION = null; LS.set('session', null); loadState(); applyPrefs(); drawNav(); }
function checkSession() { if (!SESSION) return; const x = allUsers().find(y => y.u === SESSION.u); if (!x || x.off) endSession(); else if (x.role !== SESSION.role || x.name !== SESSION.name) { SESSION = { u: x.u, name: x.name, role: x.role }; LS.set('session', SESSION); drawNav(); } }
const PERMS = {
  visitor: ['قراءة المصحف والتفاسير الثمانية والموسوعة كاملة', 'البحث بالمعنى ومساعد البحث والأطلس والخط الزمني', 'الحفظ والتسميع، ويُحفظ تقدّمه على جهازه'],
  client: ['كل ما يتاح للزائر', 'حساب شخصي باسمه تُحفظ فيه العلامات والحفظ وموضع القراءة منفصلة عن غيره على الجهاز نفسه', 'تغيير كلمة المرور، ونقل تقدّمه إلى جهاز آخر برمز النقل'],
  admin: ['كل ما يتاح للعميل', 'لوحة الإدارة: الإعلان العام والآية المختارة', 'إدارة الحسابات: إضافة عميل أو مدير، وتعيين كلمة المرور، والتعطيل والحذف', 'تقرير سلامة البيانات، ونشر الإعدادات للزوار جميعاً'],
};
const permList = r => `<ul style="margin:0;padding-inline-start:1.2em">${PERMS[r].map(x => `<li>${x}</li>`).join('')}</ul>`;
function account(msg = '') {
  if (!IS_PWA) return settings();
  if (!SESSION) {
    V(`<div class="stack" style="max-width:900px"><div><div class="eyebrow">حسابي</div><h1>الدخول إلى مشكاة</h1><p class="lead">التطبيق كله متاح دون تسجيل. والحساب يحفظ تقدّمك باسمك، ويفتح لوحة الإدارة للمدير.</p></div>
    ${msg ? `<p class="note" style="margin:0">${msg}</p>` : ''}
    <div class="grid split"><form class="panel stack tight" id="uform"><h2>تسجيل الدخول</h2>
      <label for="uu">اسم المستخدم</label><input class="field" id="uu" autocomplete="username" dir="ltr" required>
      <label for="upw">كلمة المرور</label><input class="field" id="upw" type="password" autocomplete="current-password" dir="ltr" required>
      <button class="btn pri" style="align-self:flex-start">دخول</button><p class="small" id="umsg" style="margin:0"></p></form>
    <form class="panel stack tight" id="rform"><h2>حساب عميل جديد</h2>
      <label for="rn">الاسم</label><input class="field" id="rn" autocomplete="name" required>
      <label for="ru">اسم المستخدم (حروف إنجليزية وأرقام)</label><input class="field" id="ru" autocomplete="username" dir="ltr" required>
      <label for="rpw">كلمة المرور (٨ أحرف على الأقل)</label><input class="field" id="rpw" type="password" autocomplete="new-password" dir="ltr" required>
      <button class="btn" style="align-self:flex-start">إنشاء الحساب</button><p class="small" id="rmsg" style="margin:0"></p>
      <p class="muted small" style="margin:0">يُنشأ الحساب على هذا الجهاز. ولحساب يعمل على كل الأجهزة يضيفه المدير من لوحة الإدارة.</p></form></div>
    <section class="panel stack tight"><h2>الصلاحيات</h2><dl class="kv"><dt>الزائر</dt><dd>${permList('visitor')}</dd><dt>العميل</dt><dd>${permList('client')}</dd><dt>المدير الشامل</dt><dd>${permList('admin')}</dd></dl></section></div>`);
    $('#uform').onsubmit = async e => { e.preventDefault(); if (!crypto?.subtle) { $('#umsg').textContent = 'افتح التطبيق من رابطه الآمن (https) لتسجيل الدخول.'; return; }
      const u = uKey($('#uu').value), x = allUsers().find(y => y.u === u);
      if (!x || x.h !== await pwHash(u, $('#upw').value)) { $('#umsg').textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة.'; return; }
      if (x.off) { $('#umsg').textContent = 'هذا الحساب معطّل. تواصل مع إدارة مشكاة.'; return; }
      startSession(x); toast('أهلاً بك، ' + x.name); if (location.hash === '#admin' && isAdmin()) admin(); else account(); };
    $('#rform').onsubmit = async e => { e.preventDefault(); const nm = $('#rn').value.trim(), u = uKey($('#ru').value), pw = $('#rpw').value;
      if (!/^[a-z0-9._-]{3,24}$/.test(u)) { $('#rmsg').textContent = 'اسم المستخدم من ٣ إلى ٢٤ حرفاً إنجليزياً أو رقماً.'; return; }
      if (pw.length < 8) { $('#rmsg').textContent = 'كلمة المرور ٨ أحرف على الأقل.'; return; }
      if (allUsers().some(y => y.u === u)) { $('#rmsg').textContent = 'اسم المستخدم مستعمل. اختر غيره.'; return; }
      const x = { u, name: nm || u, role: 'client', h: await pwHash(u, pw), created: Date.now() }; putUser(x); startSession(x); toast('أُنشئ حسابك'); account(); };
    return;
  }
  const due = Object.values(ST.hifz).filter(h => (h.due || 0) <= Date.now()).length, last = ST.last;
  V(`<div class="stack" style="max-width:900px"><div><div class="eyebrow">حسابي · ${ROLE[SESSION.role]}</div><h1>${esc(SESSION.name)}</h1><p class="lead">اسم المستخدم: <code dir="ltr">${esc(SESSION.u)}</code></p></div>
  ${msg ? `<p class="note" style="margin:0">${msg}</p>` : ''}
  <div class="grid tiles t4"><div class="tile"><b>${n(ST.bookmarks.length)}</b><span>آية في علاماتك</span></div><div class="tile"><b>${n(Object.keys(ST.hifz).length)}</b><span>مقطع في جدول الحفظ</span></div><div class="tile"><b>${n(due)}</b><span>للمراجعة اليوم</span></div><div class="tile"><b>${last != null ? esc(ref(last)) : '—'}</b><span>آخر موضع قراءة</span></div></div>
  <div class="toolbar">${isAdmin() ? '<a class="btn pri" href="#admin"><svg><use href="#i-shield"/></svg>لوحة الإدارة</a>' : ''}<a class="btn" href="#saved">محفوظاتي</a><a class="btn" href="#hifz">الحفظ والتسميع</a><button class="btn" id="outBtn">تسجيل الخروج</button></div>
  <section class="panel stack tight"><h2>صلاحياتك</h2>${permList(SESSION.role)}</section>
  <form class="panel stack tight" id="pwform" style="max-width:520px"><h2>تغيير كلمة المرور</h2>
    <label for="opw">كلمة المرور الحالية</label><input class="field" id="opw" type="password" autocomplete="current-password" dir="ltr" required>
    <label for="npw">كلمة المرور الجديدة (٨ أحرف على الأقل)</label><input class="field" id="npw" type="password" autocomplete="new-password" dir="ltr" required>
    <button class="btn" style="align-self:flex-start">حفظ</button><p class="small" id="pwmsg" style="margin:0"></p></form></div>`);
  $('#outBtn').onclick = () => { endSession(); toast('سُجّل خروجك'); account(); };
  $('#pwform').onsubmit = async e => { e.preventDefault(); const x = allUsers().find(y => y.u === SESSION.u), np = $('#npw').value;
    if (!x || x.h !== await pwHash(x.u, $('#opw').value)) { $('#pwmsg').textContent = 'كلمة المرور الحالية غير صحيحة.'; return; }
    if (np.length < 8) { $('#pwmsg').textContent = 'كلمة المرور الجديدة ٨ أحرف على الأقل.'; return; }
    const { src, ...rest } = x; putUser({ ...rest, h: await pwHash(x.u, np) }); $('#pwmsg').textContent = 'تغيّرت كلمة المرور على هذا الجهاز.' + (isAdmin() ? ' ولتعميمها على كل الأجهزة احفظ الإعدادات وانشرها من لوحة الإدارة.' : ''); $('#pwform').reset(); };
}
async function admin() {
  if (IS_PWA && !SESSION) return account('لوحة الإدارة للمدير الشامل. سجّل الدخول بحساب المدير.');
  if (IS_PWA && !isAdmin()) { V(`<div class="stack" style="max-width:640px"><div class="eyebrow">لوحة الإدارة</div><h1>هذه الصفحة للمدير الشامل فقط</h1><p class="lead">أنت داخل بحساب ${ROLE[SESSION.role]}. صلاحياتك في <a href="#account">صفحة حسابك</a>.</p></div>`); return; }
  if (!isOwner && !IS_PWA) { V(`<div class="stack"><h1>لوحة الإدارة</h1><p class="muted">هذه الصفحة لمالك الموسوعة فقط.</p></div>`); return; }
  const tot = T.reduce((s, c) => s + c.items.length, 0);
  V(`<div class="stack" style="max-width:900px"><div><div class="eyebrow">لوحة الإدارة · ${IS_PWA ? 'مدير شامل: ' + esc(SESSION.name) : 'تظهر لك وحدك بصفتك مالك الموسوعة'}</div><h1>إدارة مشكاة</h1></div>
  <section class="panel stack tight"><h3>الإعلان العام</h3><p class="muted small" style="margin:0">يظهر شريطاً أعلى الصفحات لكل من يفتح الموسوعة. اتركه فارغاً لإخفائه.</p>
    <input class="field" id="adBanner" type="text" value="${esc(siteCfg.banner || '')}" placeholder="مثال: تمت إضافة فهرس جديد عن الأخلاق" style="width:100%"></section>
  <section class="panel stack tight"><h3>الآية المختارة للصفحة الرئيسية</h3><p class="muted small" style="margin:0">تحل محل «آية اليوم». اتركها فارغة ليعود الاختيار اليومي التلقائي.</p>
    <div class="toolbar"><label>السورة <input class="field" id="adS" type="number" min="1" max="114" style="width:6em" value="${siteCfg.featured?.s || ''}"></label><label>الآية <input class="field" id="adA" type="number" min="1" style="width:6em" value="${siteCfg.featured?.a || ''}"></label><span id="adPrev" class="muted small"></span></div>
    <input class="field" id="adNote" type="text" value="${esc(siteCfg.featuredNote || '')}" placeholder="تعليق قصير يظهر تحت الآية (اختياري)" style="width:100%"></section>
  ${IS_PWA ? `<section class="panel stack tight"><h3>الحسابات</h3><p class="muted small" style="margin:0">الحسابات المنشورة تعمل على كل الأجهزة. وما تضيفه أو تغيّره هنا يعمل فوراً على هذا الجهاز، ويعمّ كل الأجهزة بعد «حفظ ونشر».</p>
    <div class="tablebox"><table class="wtable" id="uTable"></table></div>
    <form class="stack tight" id="uaForm"><h4 style="margin:0">إضافة حساب</h4><div class="toolbar">
      <input class="field" id="naName" placeholder="الاسم" required><input class="field" id="naU" placeholder="اسم المستخدم" dir="ltr" required>
      <input class="field" id="naPw" placeholder="كلمة المرور" dir="ltr" required><select id="naRole"><option value="client">عميل</option><option value="admin">مدير شامل</option></select>
      <button class="btn">إضافة</button></div></form>
    <form class="stack tight" id="ueForm"><h4 style="margin:0">إجراء على حساب</h4><div class="toolbar">
      <select id="ueU"></select><input class="field" id="uePw" placeholder="كلمة مرور جديدة" dir="ltr">
      <button class="btn" type="button" id="ueSetPw">تعيين كلمة المرور</button><button class="btn" type="button" id="ueRole">تبديل الدور</button><button class="btn" type="button" id="ueOff">تعطيل أو تفعيل</button><button class="btn" type="button" id="ueDel">حذف</button></div></form>
    <p class="small" id="uMsg" style="margin:0"></p></section>` : ''}
  <div class="toolbar"><button class="btn pri" id="adSave">حفظ ونشر</button><span id="adMsg" class="small"></span></div>
  <section class="panel stack tight"><h3>تقرير سلامة البيانات</h3><dl class="kv">
    <dt>النص</dt><dd>مصحف المدينة (حفص) · ${n(Q.surahs.length)} سورة · ${n(Q.ayat.length)} آية · ${n(W.w.length)} كلمة</dd>
    <dt>المطابقة</dt><dd>${n(Q.ayat.length - Q.checks.align_fallback.length)} آية مطابقة تماماً · ${n(Q.checks.align_fallback.length)} بفرق رسمي</dd>
    <dt>بصمة النص</dt><dd><code>${Q.checks.sha256_hafs}</code></dd><dt>بصمة الصرف</dt><dd><code>${Q.checks.sha256_morph}</code></dd>
    <dt>الموسوعة</dt><dd>${n(T.length)} فهرساً · ${n(tot)} مدخلاً</dd>
    <dt>التفاسير</dt><dd>${TF.map(b => `${b.title}: ${n(b.covered)}`).join(' · ')}</dd>
    <dt>أطلس القرآن</dt><dd>${n(PLACES.length)} موضعاً · ${n(PLACES.filter(p => placeEntries(p).length === p.refs.length).length)} مرتبطة بمداخلها كاملة</dd></dl></section></div>`);
  const prev = () => { const i = idxOf(+$('#adS').value, +$('#adA').value); $('#adPrev').textContent = i >= 0 ? ref(i) : ($('#adS').value ? 'مرجع غير صحيح' : ''); };
  $('#adS').oninput = prev; $('#adA').oninput = prev; prev();
  if (IS_PWA) usersPanel();
  $('#adSave').onclick = async () => {
    const db = IS_PWA ? null : await claude?.use?.('db').catch(() => null); if (!db && !IS_PWA) { $('#adMsg').textContent = 'تعذّر الاتصال بقاعدة البيانات.'; return; }
    const s = +$('#adS').value, a = +$('#adA').value; const ok = idxOf(s, a) >= 0;
    if ($('#adS').value && !ok) { $('#adMsg').textContent = 'رقم السورة أو الآية غير صحيح.'; return; }
    const cfg = { banner: $('#adBanner').value.trim(), featured: ok ? { s, a } : null, featuredNote: $('#adNote').value.trim(), updated: Date.now() };
    if (IS_PWA) { cfg.users = allUsers().map(({ src, ...x }) => x); LS.set('users', []); }
    if (IS_PWA) { siteCfg = cfg; applyCfg(); LS.set('cfgPreview', cfg); const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'config.json'; a.click();
      $('#adMsg').innerHTML = 'ظهر التعديل على هذا الجهاز، ونُزّل ملف config.json. لنشره لكل الزوار ارفعه مكان الملف نفسه في مجلد mishkat على GitHub، أو أرسله إلى فريق منجز.'; return; }
    try { await db.doc('site/config').set(cfg); siteCfg = cfg; applyCfg(); $('#adMsg').textContent = 'حُفظ ونُشر لكل الزوار.'; } catch (e) { $('#adMsg').textContent = 'لم يُحفظ: ' + (e?.code || 'خطأ غير معروف'); }
  };
}
function usersPanel() {
  const L = allUsers(), me = SESSION.u, msg = t => { $('#uMsg').textContent = t; };
  $('#uTable').innerHTML = `<thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الحالة</th><th>المصدر</th></tr></thead><tbody>${L.map(x => `<tr><td>${esc(x.name)}${x.u === me ? ' <span class="chip">أنت</span>' : ''}</td><td dir="ltr">${esc(x.u)}</td><td>${ROLE[x.role]}</td><td>${x.off ? 'معطّل' : 'فعّال'}</td><td>${x.src === 'site' ? 'منشور' : 'هذا الجهاز'}</td></tr>`).join('')}</tbody>`;
  $('#ueU').innerHTML = L.map(x => `<option value="${esc(x.u)}">${esc(x.name)} (${esc(x.u)})</option>`).join('');
  const pick = () => L.find(x => x.u === $('#ueU').value), strip = ({ src, ...x }) => x;
  const admins = () => allUsers().filter(x => x.role === 'admin' && !x.off).length;
  $('#uaForm').onsubmit = async e => { e.preventDefault(); const u = uKey($('#naU').value), pw = $('#naPw').value;
    if (!/^[a-z0-9._-]{3,24}$/.test(u)) return msg('اسم المستخدم من ٣ إلى ٢٤ حرفاً إنجليزياً أو رقماً.');
    if (pw.length < 8) return msg('كلمة المرور ٨ أحرف على الأقل.'); if (L.some(x => x.u === u)) return msg('اسم المستخدم مستعمل.');
    putUser({ u, name: $('#naName').value.trim() || u, role: $('#naRole').value, h: await pwHash(u, pw), created: Date.now() }); usersPanel(); msg('أُضيف الحساب على هذا الجهاز. اضغط «حفظ ونشر» لتعميمه.'); $('#uaForm').reset(); };
  $('#ueSetPw').onclick = async () => { const x = pick(), pw = $('#uePw').value; if (pw.length < 8) return msg('كلمة المرور ٨ أحرف على الأقل.'); putUser({ ...strip(x), h: await pwHash(x.u, pw) }); $('#uePw').value = ''; usersPanel(); msg('عُيّنت كلمة المرور لحساب ' + x.name + '.'); };
  $('#ueRole').onclick = () => { const x = pick(); if (x.role === 'admin' && admins() < 2) return msg('لا بد من مدير شامل واحد فعّال على الأقل.'); putUser({ ...strip(x), role: x.role === 'admin' ? 'client' : 'admin' }); usersPanel(); checkSession(); msg('تغيّر دور ' + x.name + '.'); if (!isAdmin()) admin(); };
  $('#ueOff').onclick = () => { const x = pick(); if (x.u === me) return msg('لا يمكنك تعطيل حسابك وأنت داخل به.'); if (!x.off && x.role === 'admin' && admins() < 2) return msg('لا بد من مدير شامل واحد فعّال على الأقل.'); putUser({ ...strip(x), off: !x.off }); usersPanel(); msg((x.off ? 'فُعّل' : 'عُطّل') + ' حساب ' + x.name + '.'); };
  $('#ueDel').onclick = () => { const x = pick(); if (x.u === me) return msg('لا يمكنك حذف حسابك وأنت داخل به.'); if (x.role === 'admin' && admins() < 2) return msg('لا بد من مدير شامل واحد فعّال على الأقل.');
    if (x.src === 'site') { putUser({ ...strip(x), off: true, del: true }); } else LS.set('users', LS.get('users', []).filter(y => y.u !== x.u)); usersPanel(); msg('حُذف حساب ' + x.name + '.'); };
}
function applyCfg() { const b = $('#banner'); if (siteCfg.banner) { $('#bannerText').textContent = siteCfg.banner; b.hidden = false; } else b.hidden = true; }

/* ================= drawers: ayah & word */
function openDrawer(html) { $('#sheet').innerHTML = `<button class="btn close" data-close aria-label="إغلاق">إغلاق ✕</button>` + html; $('#drawer').hidden = false; $('#sheet').scrollTop = 0; }
function closeDrawer() { $('#drawer').hidden = true; }
function ayahDrawer(i) {
  const a = Q.ayat[i];
  const wt = []; for (let k = 0; k < a[3]; k++) { const wi = a[2]+k, w = W.w[wi], l = W.lemmas[w[1]];
    wt.push(`<tr class="clk" data-word="${wi}"><td style="font-family:var(--f-quran);font-size:1.2rem">${esc(w[0])}</td><td>${esc(l[0])}</td><td>${rootFmt(l[1])}</td><td>${POS[Q.pos[w[3]]]}</td></tr>`); }
  const bm = ST.bookmarks.includes(i);
  openDrawer(`<div class="stack"><div><div class="eyebrow">${esc(ref(i))} · الجزء ${n(a[5])} · الصفحة ${n(a[6])}</div><h2>سورة ${Q.surahs[a[0]-1].name}، الآية ${n(a[1])}</h2></div>
  ${ayahHTML(i)}
  <div class="toolbar"><button class="btn${bm ? ' pri' : ''}" id="bmBtn"><svg><use href="#i-bookmark"/></svg>${bm ? 'في علاماتك' : 'أضف إلى العلامات'}</button><button class="btn" data-card="${i}"><svg><use href="#i-image"/></svg>بطاقة</button><button class="btn" id="cpBtn"><svg><use href="#i-copy"/></svg>نسخ</button>${IS_PWA ? `<button class="btn" id="plBtn"><svg><use href="#i-play"/></svg>استمع</button>` : ''}<a class="btn" href="#a${a[0]}-${a[1]}" data-close>في سياقها</a></div>
  <div class="pill-row"><span class="chip">${n(a[3])} كلمة</span><span class="chip">${n([...Array(a[3]).keys()].reduce((s, k) => s + W.w[a[2]+k][4], 0))} حرفاً</span>${i > 0 ? `<a class="chip" data-ayah="${i-1}">→ السابقة</a>` : ''}${i < Q.ayat.length - 1 ? `<a class="chip" data-ayah="${i+1}">التالية ←</a>` : ''}</div>
  <section><h3>التفسير والمعاني</h3><div class="toolbar" style="margin:8px 0"><select id="tsel" aria-label="اختر التفسير">${TF.map(b => `<option value="${b.key}" ${b.key === ST.prefs.tafsir ? 'selected' : ''}>${b.title} (${b.author})</option>`).join('')}</select></div><div class="tafsir panel" id="tbody">جارٍ التحميل…</div></section>
  <section><h3>تحليل الكلمات</h3><div class="tablebox"><table class="wtable"><thead><tr><th>الكلمة</th><th>اللفظ</th><th>الجذر</th><th>النوع</th></tr></thead><tbody>${wt.join('')}</tbody></table></div></section></div>`);
  $('#bmBtn').onclick = () => { const k = ST.bookmarks.indexOf(i); if (k >= 0) ST.bookmarks.splice(k, 1); else ST.bookmarks.unshift(i); save(); ayahDrawer(i); toast(k >= 0 ? 'أُزيلت من العلامات' : 'أُضيفت إلى العلامات'); };
  $('#cpBtn').onclick = () => copyText(`${ayahText(i)} ﴿${Q.surahs[a[0]-1].name}: ${a[1]}﴾`);
  const pl = $('#plBtn'); if (pl) pl.onclick = () => { const au = new Audio(audioUrl(i)); au.play().catch(() => toast('تعذّر تشغيل التلاوة، تحقق من الاتصال')); };
  const load = async () => { const key = $('#tsel').value; ST.prefs.tafsir = key; LS.set(stateKey(), ST);
    $('#tbody').textContent = 'جارٍ التحميل…';
    try { const t = await tafsir(key, a[0]); $('#tbody').textContent = t[a[1]] || (key === 'gharib' ? 'لا توجد ألفاظ غريبة مفسَّرة في هذه الآية في كتاب «الميسر في غريب القرآن».' : 'يُنظر تفسير هذه الآية ضمن الآيات السابقة لها.'); }
    catch (e) { $('#tbody').textContent = 'تعذّر تحميل التفسير. تحقق من الاتصال ثم أعد المحاولة، أو نزّل التفاسير من الإعدادات للعمل دون إنترنت.'; } };
  $('#tsel').onchange = load; load();
}
function wordDrawer(wi) {
  const w = W.w[wi], l = W.lemmas[w[1]], ri = w[2], i = W.a[wi];
  const lc = wordsByLemma.get(w[1]).length, rc = ri >= 0 ? W.roots[ri][1] : 0, fc = uniqForms.get(strip(w[0]));
  openDrawer(`<div class="stack"><div><div class="eyebrow">${esc(ref(i))}</div><h2 style="font-family:var(--f-quran);font-weight:400;font-size:2.4rem">${esc(w[0])}</h2></div>
  <div class="tablebox"><table class="wtable"><tbody>
   <tr><th>النوع</th><td>${POS[Q.pos[w[3]]]}</td></tr>
   <tr><th>اللفظ (اللمّة)</th><td><a href="#lem${w[1]}" data-close>${esc(l[0])}</a> · ورد ${n(lc)} مرة</td></tr>
   <tr><th>الجذر</th><td>${ri >= 0 ? `<a href="#root${ri}" data-close>${rootFmt(l[1])}</a> · ورد ${n(rc)} مرة` : 'لا جذر له (حرف أو اسم مبني)'}</td></tr>
   <tr><th>هذه الصيغة بعينها</th><td><a data-form="${esc(strip(w[0]))}" data-close style="cursor:pointer">${n(fc)} مرة</a></td></tr>
   <tr><th>عدد حروفها</th><td>${n(w[4])}</td></tr></tbody></table></div>
  <section><h3>معنى المفردات في الآية</h3><div class="tafsir panel" id="gbody">جارٍ التحميل…</div></section>
  <section><h3>الآية</h3>${ayahHTML(i, new Set([wi]), false)}<button class="btn" data-ayah="${i}">عرض تفسير الآية</button></section></div>`);
  tafsir('gharib', Q.ayat[i][0]).then(t => { $('#gbody').textContent = t[Q.ayat[i][1]] || 'لم يذكر كتاب «الميسر في غريب القرآن» ألفاظاً غريبة في هذه الآية. اضغط «عرض تفسير الآية» لقراءة التفسير.'; }).catch(() => { $('#gbody').textContent = 'تعذّر التحميل.'; });
}
function moreMenu() { openDrawer(`<div class="stack"><a class="brand" href="#home" data-close style="padding:0"><img src="icons/icon-192.png" alt="" style="width:40px;height:40px;border-radius:10px"><span><b>مشكاة</b><small>موسوعة القرآن الذكية</small></span></a><nav class="nav">${navHTML()}</nav></div>`); }

/* ================= global events */
document.addEventListener('click', e => {
  const t = e.target.closest('[data-ayah],[data-word],[data-lem],[data-root],[data-surah],[data-form],[data-card],[data-open],[data-prophet],[data-place],[data-hifz],[data-copy],[data-close],#sheet .nav a');
  if (!t) return;
  const d = t.dataset;
  if (d.ayah !== undefined) { e.preventDefault(); ayahDrawer(+d.ayah); }
  else if (d.word !== undefined) wordDrawer(+d.word);
  else if (d.lem !== undefined) { closeDrawer(); location.hash = 'lem' + d.lem; }
  else if (d.root !== undefined) { closeDrawer(); location.hash = 'root' + d.root; }
  else if (d.surah !== undefined) location.hash = 's' + d.surah;
  else if (d.form !== undefined) { closeDrawer(); formView(d.form); window.scrollTo(0, 0); }
  else if (d.card !== undefined) cardDrawer(+d.card);
  else if (d.open !== undefined) { e.preventDefault(); closeDrawer(); const [c, nm] = d.open.split('|'); history.replaceState(null, '', '#t-' + c); topic(c, nm); setCur('topics'); window.scrollTo(0, 0); }
  else if (d.prophet !== undefined) { const e2 = prophetItem(d.prophet); if (e2) { history.replaceState(null, '', '#t-anbiya'); topic('anbiya', e2.it.n); window.scrollTo(0, 0); } }
  else if (d.place !== undefined) { e.preventDefault(); location.hash = 'map'; setTimeout(() => showPlace(+d.place), 30); }
  else if (d.hifz !== undefined) { const s = +d.hifz; hzSel = { s, a: 1, b: Math.min(Q.surahs[s-1].ayas, 7) }; }
  else if (d.copy !== undefined) copyText(d.copy);
  else if (d.close !== undefined || t.matches('#sheet .nav a')) closeDrawer();
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
$('#qform').onsubmit = e => { e.preventDefault(); const q = $('#qinput').value; if (location.hash !== '#search') history.replaceState(null, '', '#search'); setCur('search'); search(q); };
$('#moreBtn').onclick = moreMenu;
$('#themeBtn').onclick = () => { const dark = ST.prefs.theme === 'dark' || (ST.prefs.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); ST.prefs.theme = dark ? 'light' : 'dark'; applyPrefs(); save(); };
window.addEventListener('hashchange', route);

/* ================= boot */
async function connectCloud() {
  if (IS_PWA || !window.claude?.use) return;
  try {
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    if (user) { isOwner = await user.isOwner().catch(() => false); if (isOwner) drawNav(); }
    if (!db) return;
    db.doc('site/config').get().then(s => { const v = s?.data?.() ?? s?.data ?? null; if (v) { siteCfg = v; applyCfg(); if ((location.hash || '#home') === '#home') home(); } }).catch(() => {});
    const uid = user && await user.id().catch(() => null); if (!uid) return;
    cloud = { db, uid };
    const snap = await db.doc(`data/users/${uid}/state/main`).get().catch(() => null);
    const remote = snap ? (typeof snap.data === 'function' ? snap.data() : snap.data) : null;
    if (remote && remote.updated > (ST.updated || 0)) { Object.assign(ST, remote); LS.set(stateKey(), ST); applyPrefs(); }
    else if (ST.updated) save();
    const h = (location.hash || '#home').slice(1); if (['home', 'saved', 'settings', 'hifz'].includes(h)) route();
  } catch (e) {}
}
applyPrefs(); drawNav(); if (IS_PWA) $('#acctBtn').hidden = false;
(async () => {
  try {
    [Q, W, T, TF, GEO] = await Promise.all([gz('data/quran.txt'), gz('data/words.txt'), gz('data/topics.txt'), getJSON('data/tafsir.json'), getJSON('data/geo.json')]);
    prep();
    if (IS_PWA) { try { const base = await getJSON('config.json').catch(() => ({})), pv = LS.get('cfgPreview', null); siteCfg = pv && (pv.updated || 0) > (base.updated || 0) ? pv : base; applyCfg(); } catch (e) {} checkSession(); }
    route(); connectCloud();
  } catch (err) { V(`<p class="loading">تعذّر تحميل البيانات. يتطلب التطبيق متصفحاً حديثاً (كروم أو سفاري أو فايرفوكس أو إيدج). ${esc(err.message)}</p>`); }
})();
if (IS_PWA && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
