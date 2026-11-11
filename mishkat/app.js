'use strict';
/* مشكاة — موسوعة القرآن الذكية. One codebase for the claude.ai build and the installable PWA build. */
const BUILD = window.MISHKAT_BUILD || 'pwa';
const IS_PWA = BUILD === 'pwa';
const LAB = window.MISHKAT_APP === 'lab'; // «مختبر الأبحاث القرآنية»: تطبيق مستقل من الشيفرة نفسها، له اسمه وتخزينه وحساباته
const BRAND = LAB ? 'مختبر الأبحاث القرآنية' : 'مشكاة', HOME = LAB ? 'research' : 'home';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
/* اللغة: العربية أصل المنصة؛ English مترجمة ترجمة كاملة مضمّنة تعمل دون إنترنت؛ بقية اللغات بترجمة Google عند الاتصال، ومعاني القرآن بترجمات معتمدة مضمّنة */
const LANG = (() => { try { return localStorage.getItem('quran-lang') || 'ar'; } catch (e) { return 'ar'; } })();
const NF = new Intl.NumberFormat(LANG === 'ar' ? 'ar-EG' : 'en-US');
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
  get(k, d) { try { const v = localStorage.getItem((LAB ? 'qlab:' : 'mishkat:') + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem((LAB ? 'qlab:' : 'mishkat:') + k, JSON.stringify(v)); } catch (e) {} },
};
/* accounts (standalone build): visitor, client and full admin. Everything runs in the browser; no outside service is called */
let SESSION = IS_PWA ? LS.get('session', null) : null;
const stateKey = () => SESSION ? 'state@' + SESSION.u : 'state';
const ST = {};
function loadState() {
  for (const k of Object.keys(ST)) delete ST[k];
  Object.assign(ST, { bookmarks: [], last: null, mark: null, notes: {}, log: {}, goal: null, khatma: null, hifz: {}, research: [], prefs: { tafsir: 'muyassar', size: 1, theme: 'auto' }, updated: 0 }, LS.get(stateKey(), {}));
  ST.prefs = Object.assign({ tafsir: 'muyassar', size: 1, theme: 'auto' }, ST.prefs || {});
  cleanState(ST);
}
loadState();
let cloud = null; // {db, uid}
let saveTimer = 0;
/* تنقية البيانات المحفوظة أو المستوردة: أرقام آيات صحيحة فقط، فلا يمر أي نص إلى الصفحة */
function isAyahIx(v) { return Number.isInteger(v) && v >= 0 && v < 6236; }
function cleanHifz(h) { const o = {}; if (h && typeof h === 'object') for (const [k, v] of Object.entries(h)) { if (!/^\d{1,3}:\d{1,3}-\d{1,3}$/.test(k) || !v || typeof v !== 'object') continue; const r = {}; for (const f of ['ef', 'int', 'reps', 'due', 'last']) if (Number.isFinite(+v[f])) r[f] = +v[f]; o[k] = r; } return o; }
function cleanNotes(h) { const o = {}; if (h && typeof h === 'object') for (const [k, v] of Object.entries(h)) { if (!/^\d{1,4}$/.test(k) || !isAyahIx(+k) || !v || typeof v.t !== 'string') continue; const t = v.t.trim().slice(0, 800); if (t) o[k] = { t, at: Number.isFinite(+v.at) ? +v.at : 0 }; } return o; }
function cleanLog(h) { const o = {}; if (h && typeof h === 'object') for (const k of Object.keys(h).sort().slice(-400)) { if (!/^\d{4}-\d{2}-\d{2}$/.test(k) || !Array.isArray(h[k])) continue; const p = [...new Set(h[k].map(Number).filter(v => Number.isInteger(v) && v >= 1 && v <= 604))]; if (p.length) o[k] = p; } return o; }
function cleanState(x) {
  x.bookmarks = [...new Set((Array.isArray(x.bookmarks) ? x.bookmarks : []).map(Number).filter(isAyahIx))];
  x.last = isAyahIx(x.last) ? x.last : null;
  x.hifz = cleanHifz(x.hifz);
  x.mark = x.mark && isAyahIx(+x.mark.i) ? { i: +x.mark.i, at: Number.isFinite(+x.mark.at) ? +x.mark.at : 0 } : null;
  x.notes = cleanNotes(x.notes); x.log = cleanLog(x.log);
  x.goal = x.goal && Number.isInteger(+x.goal.pages) && +x.goal.pages >= 1 && +x.goal.pages <= 100 ? { pages: +x.goal.pages, at: Number.isFinite(+x.goal.at) ? +x.goal.at : 0 } : null;
  x.khatma = typeof x.khatma === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.khatma) ? x.khatma : null;
  x.research = (Array.isArray(x.research) ? x.research : []).filter(r => r && typeof r.q === 'string').slice(0, 200);
  const p = x.prefs || {}; x.prefs = { ...p, tafsir: /^[a-z0-9_-]{1,32}$/.test(p.tafsir) ? p.tafsir : 'muyassar', size: [0.9, 1, 1.2, 1.45].includes(+p.size) ? +p.size : 1, theme: ['auto', 'light', 'dark'].includes(p.theme) ? p.theme : 'auto' };
  return x;
}
function save() {
  ST.updated = Date.now();
  LS.set(stateKey(), ST);
  clearTimeout(saveTimer);
  if (cloud) saveTimer = setTimeout(() => {
    cloud.db.doc(`data/users/${cloud.uid}/state/main`).set(JSON.parse(JSON.stringify(ST))).catch(() => {});
  }, 1500);
}

/* ورد القراءة: تُسجَّل الصفحة قراءةً إذا بقيت أمام القارئ نحو ثماني ثوانٍ والصفحة ظاهرة */
const dayKey = (t = Date.now()) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const todayPages = () => ST.log[dayKey()] || [];
const goalPages = () => ST.goal ? ST.goal.pages : 0;
function readStreak() { let k = 0, t = Date.now(); const need = Math.max(1, goalPages()); if ((ST.log[dayKey(t)] || []).length < need) t -= 864e5; for (; k < 400; k++, t -= 864e5) if ((ST.log[dayKey(t)] || []).length < need) break; return k; }
function logReadPage(p) {
  p = +p; if (!(p >= 1 && p <= 604)) return;
  if (logReadPage.p === p) return;
  clearTimeout(logReadPage.t); logReadPage.p = p;
  logReadPage.t = setTimeout(() => {
    if (document.visibilityState === 'hidden') { logReadPage.p = 0; return; }
    const d = dayKey(), a = ST.log[d] || (ST.log[d] = []);
    if (!a.includes(p)) { a.push(p); save(); const c = $('#pgHome'); if (c) c.outerHTML = progHomeCard(); }
  }, window.MISHKAT_DWELL ?? 8000);
}
const logRead = i => { const a = Q.ayat[i]; if (a) logReadPage(a[6]); };
function progHomeCard() {
  const g = goalPages(), t = todayPages().length, st = readStreak(), mk = ST.mark;
  return `<div class="mine3 pgrow" id="pgHome">
    ${mk ? `<a class="mcard" href="#pa${mk.i}"><svg><use href="#i-bookmark"/></svg><span><small>توقفت هنا</small><b>${esc(ref(mk.i))}</b></span></a>` : `<a class="mcard" href="#wird"><svg><use href="#i-bookmark"/></svg><span><small>توقفت هنا</small><b>ضع أول علامة</b></span></a>`}
    <a class="mcard" href="#wird"><svg><use href="#i-time"/></svg><span><small>ورد اليوم</small><b>${g ? `${n(Math.min(t, g))} من ${n(g)} صفحة` : `${n(t)} صفحة`}</b></span></a>
    <a class="mcard" href="#wird"><svg><use href="#i-spark"/></svg><span><small>سلسلة القراءة</small><b>${st ? `${n(st)} ${st === 1 ? 'يوم' : st === 2 ? 'يومان' : st <= 10 ? 'أيام' : 'يوماً'}` : 'ابدأ اليوم'}</b></span></a>
    ${(() => { try { return localStorage.getItem('mishkat:seenVer') === '٢٫١' ? '' : '<a class="wn-new" href="#whatsnew"><b>جديد</b> الإصدار ٢٫١: وردي وتقدّمي والنسخ الاحتياطي والمزامنة</a>'; } catch (e) { return ''; } })()}
  </div>`;
}

/* ================= data loading */
const FILE_MODE = location.protocol === 'file:';
if (IS_PWA && !FILE_MODE && window.top !== window.self) { document.documentElement.hidden = true; document.documentElement.style.display = 'none'; try { window.top.location.replace(location.href); } catch (e) {} } // لا تُعرض المنصة داخل إطار موقع آخر
window.__ATH = window.__ATH || {};
function scriptData(url) { // file:// pages cannot fetch(); every data file also ships as a .js twin
  if (window.__ATH[url] != null) return Promise.resolve(window.__ATH[url]);
  return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = url + '.js'; sc.onload = () => { const v = window.__ATH[url]; delete window.__ATH[url]; sc.remove(); v == null ? rej(new Error(url)) : res(v); }; sc.onerror = () => rej(new Error(url)); document.head.appendChild(sc); });
}
/* سلامة البيانات: بصمة SHA-256 لكل ملف بيانات تُضمَّن في app.js عند البناء، ويُرفض أي ملف معدَّل */
const INTEGRITY = {"data/geo.json":"3a381595551873cb2f5612b47aa211a2","data/hadith/abudawud.txt":"add164bbe53224463598b5d5a8771d84","data/hadith/bukhari.txt":"a40d9810e6718b084f4a75ceb094331a","data/hadith/ibnmajah.txt":"8b9a2ecdbd11ad5aebdd3ded1dd5bf95","data/hadith/muslim.txt":"c422cf76a7e81044477b76bc052474a0","data/hadith/nasai.txt":"ca0303322e9a8b85c8beb942f8c55cce","data/hadith/tirmidhi.txt":"3cc7c7bada84ef1fa49d06e5f9666930","data/i18n/aa.json":"ff0afce2a1a1fb4cdb2c5a0ee4b6ddd5","data/i18n/ace.json":"618359c488707831c1c0c2614b2cb915","data/i18n/af.json":"5c2cbf06c87824c7642db89e07bdb9a3","data/i18n/am.json":"6b53bf7773fca1c97208f64e670aff43","data/i18n/as.json":"a03e6e7d24207770ff212e3c128fdfb8","data/i18n/az.json":"9a2d1c189dbb5af844d036e6d15bb81d","data/i18n/ber.json":"98a91046a6305cfab7d62f0fbc4a1b20","data/i18n/bg.json":"ea268344bc76ca41c77539713bfffd12","data/i18n/bm.json":"33e46292b56a284116f76953f0c85c23","data/i18n/bn.json":"ffc365093abbbac927590890c740be32","data/i18n/bs.json":"618c0ac067a840b980019148c761e99e","data/i18n/ca.json":"ebae4fa81efe68985b6a8b969c807646","data/i18n/cs.json":"11e8d22e324421fee781e74545c04f3b","data/i18n/da.json":"25b2747721561f972a4dafe11db2d886","data/i18n/de.json":"bc38949db82bf7d510166dac33b83261","data/i18n/dv.json":"760af1f4fc1fa2d9865bebc25c5c4054","data/i18n/en.json":"a9a57107c619aa2fbb19b82017f6c791","data/i18n/eo.json":"c68c052a58a03312d08102b99e07b77b","data/i18n/es.json":"6a19bf9ca0c14dccbec911a6ccd7cfda","data/i18n/fa.json":"ec97d3acddbb07d75f5867e96537f54b","data/i18n/ff.json":"95c448a82dd8161bed97c9aeb8865e4b","data/i18n/fi.json":"c1beac4eba992eb6c03ef0bedcc8f8bb","data/i18n/fr.json":"f0544ffced5d6d71b9b6fd78e8e80b3f","data/i18n/gu.json":"ac5aa72bd8db55cb43c401beae08d5c3","data/i18n/ha.json":"5a09adf673079deb868895b0f46fb0a8","data/i18n/he.json":"a9f2af8dee78dd24bc9612712f931b4e","data/i18n/hi.json":"3d06abf625a729f893525c472c6455a9","data/i18n/hr.json":"3163777e50cba19278ee5b4b4e3b116e","data/i18n/hu.json":"93cb551be8e9b815a1507cfffc6ab48d","data/i18n/id.json":"9830ab84f3cdeabc94e6f236e4275394","data/i18n/it.json":"68e589acf3a9c183943654367f4c0eab","data/i18n/ja.json":"808aa8500dc951d7507b884ff2ffc71a","data/i18n/jv.json":"34d5152578fc2c40eb6f5ce0d1674abc","data/i18n/kk.json":"72ad839073ea3dae75878bc0246b33c4","data/i18n/km.json":"90a7a36d7f2c05d5821f3d2c20d391ad","data/i18n/kmr.json":"9a007348126f5d57e817d34b464d9c83","data/i18n/kn.json":"1b54ec1b3257fdb51daf24a0d2bcbddb","data/i18n/ko.json":"26c8a2738bcdc3e34f877d97390712d6","data/i18n/ku.json":"f50be57183ba34685fdb979f6dae7709","data/i18n/ky.json":"bd69fc19e96eb6c57cede1c083f878d1","data/i18n/la.json":"5966a52c0daecaddc23ef433e601dc00","data/i18n/lg.json":"e59891d741e3134ec0a45b6fe22f80e7","data/i18n/ln.json":"0de572c43c838bb310e9de3d15defac7","data/i18n/mk.json":"cad8cb903eb823a779114632e644b68b","data/i18n/ml.json":"594e9b5fdbf4eaddf0c2f32a47d4477f","data/i18n/mr.json":"eb19c66968c124a44dbaf75f037791e3","data/i18n/ms.json":"81bd6233fe861fdd4aa2ac11f06588a4","data/i18n/mt.json":"270f3d24ff338b1e3cdbe9e251aafd29","data/i18n/my.json":"1f98e1a72a9be53ac1b8b5dd4d644c34","data/i18n/ne.json":"ad7cbbc36cb31f7c5855440509f766ba","data/i18n/nl.json":"fcdc07096e42d2177179abdac1d21c98","data/i18n/no.json":"692382f2b31986fce6a6d8331fc13cd4","data/i18n/ny.json":"e4683cb4a328021818532a249ab0edb7","data/i18n/om.json":"b9e2007f7302f3c5bf95308171dcfed1","data/i18n/pa.json":"319b1d55f3fe6c794419ad785935a583","data/i18n/pl.json":"9e89da142b109085458f9e5a38ee1d91","data/i18n/prs.json":"0620e9359c4df54366695f54cfcc47a7","data/i18n/ps.json":"d0fb97ed172cb8a7951adb35e4fc2c2a","data/i18n/pt.json":"a8dd83067a44f58843618988fa783101","data/i18n/rn.json":"2b606776470953d1e1116eb44eaab170","data/i18n/ro.json":"09d4c78ec164fad6381fabab246a7a01","data/i18n/ru.json":"1e0dbb54eeeee16a608c823bb48a72b3","data/i18n/rw.json":"23bdedca33deb7c31cd64746fb88242f","data/i18n/sd.json":"88725c15fbd36d1b41768c5b0ff318e2","data/i18n/si.json":"93adab3f12f9d3ab0ba53172e8bd756f","data/i18n/sk.json":"489521e482347094ac13299eb0bf7afb","data/i18n/sn.json":"839b64e11624a2f3a0f01b73d57db452","data/i18n/so.json":"22a3808ce552028b290efd7873ee8640","data/i18n/sq.json":"84fd879cf25df1484d9a9aee4f21ff68","data/i18n/sr.json":"d9344ea28ee390e0f1b8cec551b3f51b","data/i18n/st.json":"b2418a1d565b4adb1f19a161ac8aa2bd","data/i18n/sv.json":"fade1661fe005e636cf56d44947847fa","data/i18n/sw.json":"f31ccfa6f8acc01552c216a58df4996c","data/i18n/ta.json":"a00bfdffe74d9fb8c3cf969c73bf5d51","data/i18n/te.json":"1084b1e381a29d75dca777bdb14496e2","data/i18n/tg.json":"93bff0a62519e3ec34ad13d182f75246","data/i18n/th.json":"cf60a7b57ad208e862fac37585edb0fa","data/i18n/tl.json":"dc9f07b5c6134e41a7d8b6805cc1865f","data/i18n/tr.json":"5bb2eeacdf9c549cece41cf26e01556c","data/i18n/tt.json":"1dbdb26bde650872ca759fe42934a62a","data/i18n/tw.json":"2a2125cccc37fb45116b7768fa876f2c","data/i18n/ug.json":"4efa236e24ff1f3a1d69a0d3828dd114","data/i18n/uk.json":"0376baaa5792e72c84c1d166946301f6","data/i18n/ur.json":"95e327a53f6650182051d7cc1abc5959","data/i18n/uz.json":"e2521841d5d947289f9cdbe309e15f4e","data/i18n/vi.json":"112514fb89dce46c1b864c330f0dee7b","data/i18n/xh.json":"7ef37aaa6b9266d685fe50c6f6ff5915","data/i18n/yo.json":"0c437c5fa561234c38dfe4e5e0764abd","data/i18n/zh-CN.json":"b221aaac2c0636545f388baae0fda9e3","data/i18n/zh-TW.json":"e5748b0136fb915073dae7d381c73f2d","data/i18n/zu.json":"13830bce01b3ecdb7a94700e7d15cd59","data/qasas.txt":"80574a78941b3c892f213076faad4111","data/quran.txt":"7e5e37a5ed56a512f434350824aa0fa0","data/t/baghawi/0.txt":"7faae25c408cdc26625a7524dca815dc","data/t/baghawi/1.txt":"30173aa5f1fcbd954b9c6bbe45f5d617","data/t/baghawi/10.txt":"7565e6bbed96f16acbb42cefb8f6facb","data/t/baghawi/11.txt":"71e2d5e8f78fb0c30444bec7ad107c84","data/t/baghawi/12.txt":"888811ec46d136bbb3a035eb60d3ff4a","data/t/baghawi/2.txt":"513bb1d9ff2ed425e78d7ab105fafff7","data/t/baghawi/3.txt":"6722e346ca4db204bb7ea92742106176","data/t/baghawi/4.txt":"b437112f9c51d6ea6431837820a05e37","data/t/baghawi/5.txt":"79474312a9168d04530565d73706d72b","data/t/baghawi/6.txt":"8e2c637220c8e6648348f34347c9420e","data/t/baghawi/7.txt":"f10d852add588e55be80e13f2c5335e7","data/t/baghawi/8.txt":"49a1e3d8b1f4660a617b1c810831d907","data/t/baghawi/9.txt":"e4150e87e5db7780c7edb5c4aa9fa309","data/t/gharib/0.txt":"d9643ca7a9e4b3ce54b4536016862492","data/t/ibnkathir/0.txt":"b9f71c8ea4bb6e1a69fa220d922ba81f","data/t/ibnkathir/1.txt":"fef628ff6ab2f8a4249d7b59df680303","data/t/ibnkathir/10.txt":"e9ebcbec4bea5c58332eb26073fd73a2","data/t/ibnkathir/11.txt":"f3ee0d04b0a9c7d651ad34ddc8123418","data/t/ibnkathir/12.txt":"1b976a9e445704d32cf4ec797b96dd91","data/t/ibnkathir/13.txt":"4a6e87593ff4eed81f39ee4deabf020f","data/t/ibnkathir/14.txt":"ac43f8a575ad304fa0bb3525f19b7e67","data/t/ibnkathir/15.txt":"45cd62ec8ea417752e9786b865f8264d","data/t/ibnkathir/16.txt":"3196b23811704529f697ca2fab7230bf","data/t/ibnkathir/17.txt":"f58d8af171c28b480eee69c1e356120e","data/t/ibnkathir/18.txt":"909ab1ac7fae9a08fb67839be52ac345","data/t/ibnkathir/19.txt":"aae865c0f16344a551d3d4010db57e48","data/t/ibnkathir/2.txt":"1bcc4c9bf088ba4c6549d31d6c65eb51","data/t/ibnkathir/20.txt":"6ac5ccb14fba012f687eab70ae563803","data/t/ibnkathir/21.txt":"0b4ef942c43911f1a835815148399ff2","data/t/ibnkathir/22.txt":"e84bcff9a5ea04a2962d5f8b0ff0a1c6","data/t/ibnkathir/23.txt":"896608268ed7e2dc1d954510b16da876","data/t/ibnkathir/24.txt":"07573e0b9362fb51206c28cb6b09b2fc","data/t/ibnkathir/25.txt":"700eb9a4166fd9dd7847252660d74065","data/t/ibnkathir/26.txt":"b289aa3fba775ab933f6608abfe2dbf0","data/t/ibnkathir/27.txt":"e62aa99726ffe79233750c372a02ff18","data/t/ibnkathir/28.txt":"3482541f88ba219443368dcb5102b57e","data/t/ibnkathir/3.txt":"960ab05782deedd3ef636cdfbc156770","data/t/ibnkathir/4.txt":"35e3fa721824520a834d44c6d5fd021b","data/t/ibnkathir/5.txt":"73c13ea42fb37331500cc1a58e07ef6b","data/t/ibnkathir/6.txt":"86e4d3270a53c4444376bea4a86d62da","data/t/ibnkathir/7.txt":"1f0bc0f74f005b942a3ac90b677ae0ff","data/t/ibnkathir/8.txt":"198963d3a1028799c8c685c7084a92ec","data/t/ibnkathir/9.txt":"40dca06d4a4dca7d1cd7aed5678d855a","data/t/jalalayn/0.txt":"808c69712a35d920348120a32cc4b136","data/t/muyassar/0.txt":"c3638ff74728fac6db2a4dcb0d48a12b","data/t/qurtubi/0.txt":"350fbe701785ef42832a49971fd1334f","data/t/qurtubi/1.txt":"69b49609871dfd2e6721fe5b73a95364","data/t/qurtubi/10.txt":"4746ae89f4d87ac3e306fdd3cf938899","data/t/qurtubi/11.txt":"22d9e2f4d222f6fff050ccc4e5fc547d","data/t/qurtubi/12.txt":"e5096a9d84fe5cacdcfb0359f8a4cc68","data/t/qurtubi/13.txt":"a58c6c63dde97bb84f7a46b683b849d5","data/t/qurtubi/14.txt":"ce8e23ae2ac906081de1b026fb4c9567","data/t/qurtubi/15.txt":"e744ea365fb4342a28b2dcd64746f006","data/t/qurtubi/16.txt":"01143d68d66d86db10578d4c5ecc70f7","data/t/qurtubi/17.txt":"f6dc50f4b1f9b7bfda020b181d39c510","data/t/qurtubi/18.txt":"ff81fe5ac87c70538649ceda4a48b719","data/t/qurtubi/19.txt":"3124580bba03ba9dd95ebea99fbb5702","data/t/qurtubi/2.txt":"1953f016d7c806d93d52735c287565d1","data/t/qurtubi/20.txt":"28a9138224c69f482a3ca7cecd64f61f","data/t/qurtubi/21.txt":"b44810e2e2ede712c16d9199ad0a9ac3","data/t/qurtubi/22.txt":"79cab53b39c91e66fab8f37959534e22","data/t/qurtubi/23.txt":"5e9e1cfd7184680a449c250372dd7ce1","data/t/qurtubi/24.txt":"c653c0a8f6a990ed3b06b1303c759111","data/t/qurtubi/25.txt":"f5acf4b4a21aabf020ca4aba50a92657","data/t/qurtubi/26.txt":"5ea26baecf62c5d2ebe1be03f6cc1045","data/t/qurtubi/3.txt":"adc1f2f78cd7a9ea701bb51c7bf2c6c6","data/t/qurtubi/4.txt":"781145f3a0c186c59941f0ca572230cd","data/t/qurtubi/5.txt":"7817db8a204a04f3dddd55240424811e","data/t/qurtubi/6.txt":"ad7e4d93acf6dd023f9f95dce6cd1cc9","data/t/qurtubi/7.txt":"9a8f5186741a80f43f758731c35a4229","data/t/qurtubi/8.txt":"084bc82055350254ac76ca9a582a133a","data/t/qurtubi/9.txt":"5d90458dc5b353c1789f8fb6b6acf30e","data/t/saadi/0.txt":"db815b6ddf5247c31372571e22bfb43a","data/t/saadi/1.txt":"3d675d6e1261c291a050367e8d45c742","data/t/saadi/10.txt":"e3f7b8585d6a1f4d7309a96452115505","data/t/saadi/11.txt":"b2f05d6d2fe897cbfa2c271019916eb9","data/t/saadi/12.txt":"e2625e384fe7395ea7432cdd57d80859","data/t/saadi/2.txt":"33af5b1e2a623c71522b73c2142f2d9a","data/t/saadi/3.txt":"51e53bcd9da2ef33e7b9cde87192b4b7","data/t/saadi/4.txt":"97848b26daa977c4215bc016c4e0196c","data/t/saadi/5.txt":"fb54c7c851141be805e91baa38788762","data/t/saadi/6.txt":"925ee23ae0b1b6f52198d86070cd7d9a","data/t/saadi/7.txt":"b1bcce418884d9eb3bcc2648ecdd84b9","data/t/saadi/8.txt":"03baf29844f76e727280c8faa0e11fae","data/t/saadi/9.txt":"2996a21ab899675d6f74348c527fa48f","data/t/tabari/0.txt":"21aea58e4dfb5cf145507d2a65586a10","data/t/tabari/1.txt":"0386493b0bef93a33f2274b4b8a80f77","data/t/tabari/10.txt":"0a625c3387aca8f7c13e952e7e94720d","data/t/tabari/11.txt":"5d0799a3601daa5e8c1aec5274d80347","data/t/tabari/12.txt":"ce3a4c2baa7e524dd75a9424d167569d","data/t/tabari/13.txt":"ab83e444f25790ff1a14040e16f1eb91","data/t/tabari/14.txt":"c956aa1a645a4befab9e016f1be572b9","data/t/tabari/15.txt":"4cb17f0859f4ab1341a70c45fe46f242","data/t/tabari/16.txt":"194c32676e1ff9452f800df13e997f5e","data/t/tabari/17.txt":"53865d3c86e98520de55ed698c66831f","data/t/tabari/18.txt":"828b76964e337cfa99665ef86acae45c","data/t/tabari/19.txt":"efeef96b7069d3a4352b4e1e5df670dc","data/t/tabari/2.txt":"b46845e07001e4add5abbca72182bf29","data/t/tabari/3.txt":"1b87a27cfe412d44b769a2b409eacbca","data/t/tabari/4.txt":"a0d883cec1eb493dfd4ce203d1b578b8","data/t/tabari/5.txt":"2bd32bc0e11391cd722b76c128094b34","data/t/tabari/6.txt":"167a05d5d934f10837804d98ab768877","data/t/tabari/7.txt":"b2b8e3353dbe8095e67174d6462b9208","data/t/tabari/8.txt":"79ed4d3197d54d2be60f6a8641be4b73","data/t/tabari/9.txt":"785500a3787ff62fc2194836b913e75a","data/tafsir.json":"0b340e92baea2ad150cc24986aefa196","data/topics.txt":"f68fb424e69865b75d9893a3cc68b132","data/tr/aa.txt":"6db3f725119a862fd48797cce594cb57","data/tr/ace.txt":"ebf7a0ce6077a8901d6991216968663e","data/tr/af.txt":"8cb3ff29d1deaf6952dd8dd1bd89469b","data/tr/am.txt":"5a62b3361537d47cf5d239cc4069ceaa","data/tr/as.txt":"bf36c16a778a210cb47134b1ddeb3a05","data/tr/az.txt":"b81701f24c2642e1f11816f73ec88b0f","data/tr/ber.txt":"1147bd28aa6dacc8f569c3ebeb461d0a","data/tr/bg.txt":"ddc0e9863a6f6c464e7fb260f29f46b5","data/tr/bm.txt":"329ed374f974c2a3c2661c7dad03d788","data/tr/bn.txt":"732b3afea91619f7406c68f3baf9acb3","data/tr/bs.txt":"895f5cd361874e0936541ffcf3ddef7c","data/tr/ca.txt":"b9adb72e9dfccad8ab48a1ba9ea2ee17","data/tr/cs.txt":"f56a8b99d853965b420441c9f559b0cd","data/tr/da.txt":"514cdf5202023bce0b9fa3a8e5ea450d","data/tr/dag.txt":"7f6dfc22d3dd0e682742fed3a67a5633","data/tr/de.txt":"3b554c9ab374d00d3ad8dd1d25c2da22","data/tr/dv.txt":"823e9e42083e852b06af3971058dbe8f","data/tr/en.txt":"68759abc70885f8ad84a6d35f58e8b59","data/tr/eo.txt":"e1ddfc523837ec5d8ce5f537f86f3540","data/tr/es.txt":"2e12b4b315a45fc4114764570bc05ac9","data/tr/fa.txt":"739de532508ebeb86f99e68c8500d634","data/tr/ff.txt":"ac4fce5af3c6a7bddd61eb7c03e75b76","data/tr/fi.txt":"5a2734bbc9c60ebbfea035274df02306","data/tr/fr.txt":"514d96682aebd7702dceeb3d95761229","data/tr/gu.txt":"8c1f6f0683737da9bad96153254be6fe","data/tr/ha.txt":"244bb98e4fbfc091f495d3fed55415d1","data/tr/he.txt":"e23b9e3510a0dd9c905d02e711fbd780","data/tr/hi.txt":"2e49c1c92ccb8e49a5c2853d94ec076b","data/tr/hr.txt":"8f52e215197d759197fbd177f7aac08c","data/tr/hu.txt":"9f1d09f4ecb83a7803450a8621371279","data/tr/id.txt":"ce0a3dbb5aaf5b071e4cf7ab81442df0","data/tr/ilp.txt":"9769844d7a19d990b18a112dbc58b442","data/tr/index.json":"bbb5abf5e6429c81e43dfa27739aaafc","data/tr/it.txt":"6fd9d367ffa96feacf10637dbeb15057","data/tr/ja.txt":"76bbe7bb7fb8820b9657beab10b55b75","data/tr/jv.txt":"e6e4faa4b17a44bdb58c3a1e4147555e","data/tr/kk.txt":"3351bf98c181f76c762b2b8ed17506ec","data/tr/km.txt":"3f398183d1248948bb833bde66887a05","data/tr/kmr.txt":"01b8a56c2f518d8090462cc995451bdf","data/tr/kn.txt":"b971aad35b50a36473e0060bcbef8f40","data/tr/knx.txt":"ec559ff35338ae4c82ae7f2df3a12992","data/tr/ko.txt":"3d480d78fdb593eb8b93c15a03981796","data/tr/ku.txt":"4a593acdb3fb3bdc7dc39aa262bd880c","data/tr/ky.txt":"b3ab45d73e9c91456109906e0e0ec684","data/tr/la.txt":"5713c542ce930b7d38b10ac59fdb2edb","data/tr/lg.txt":"f47be5e9e031f55633d08ceeb035672d","data/tr/ln.txt":"0a03ea925fa25343fccd14ff99b4bd7b","data/tr/luy.txt":"dce0ce3054d84f82fb3461a604a65643","data/tr/mk.txt":"5e09a28b9ea6c5872b645a70267b9e58","data/tr/ml.txt":"d6f04a27acd0732ad574197606219dd9","data/tr/mr.txt":"81267e60b4f42938b3a96f119beb17b5","data/tr/mrw.txt":"16aa33b43dc194d2b0d6c395d0d2ef3f","data/tr/ms.txt":"9339cd81b318a107de562ec94ff8d770","data/tr/mt.txt":"ce5f84c2d34b1f99dfb3f239d275ac90","data/tr/my.txt":"e02cb7e9b7960c2f00c33c02c18af9dc","data/tr/ne.txt":"31744c329d68eb08b5fd759e5bc5b7da","data/tr/nl.txt":"fd1a0f11b46a5d520be1fd45217e69bb","data/tr/no.txt":"e8ccab3ce5aff3fae250e4672871082f","data/tr/ny.txt":"82d02cfc3d450874c34398cd1aa10145","data/tr/om.txt":"c85c0d03278e472017cd4374095843bf","data/tr/pa.txt":"f1cfe18b5ee847276ac13d950c893d5d","data/tr/pl.txt":"d182460edec7b416ee45908417b13a8c","data/tr/prs.txt":"9de1463afbef144a37007fc347fc871b","data/tr/ps.txt":"8641a133150303e2c80baa4b13db5b4e","data/tr/pt.txt":"1128c4e578f250e1d7aebfcffbb479c2","data/tr/rn.txt":"5995763ec5e3a7dd21aa8a821c2754c3","data/tr/ro.txt":"3790733ce253647107e46dec267df6df","data/tr/ru.txt":"3a2ee252097bdffa7ab2343ab5a59ecf","data/tr/rw.txt":"380e41a1a83091847be114f95ea436f8","data/tr/sd.txt":"cad418daf644fe9eb82b5db466c14335","data/tr/si.txt":"e35ed062b53090cf4ef6d8f32f5eced5","data/tr/sk.txt":"22f6bae04ffc51c129df4007de32e28f","data/tr/sn.txt":"62fc72ece9072859eb5057dbe668a5f8","data/tr/so.txt":"18b6658ee7de4f4583091c38dfe34068","data/tr/sq.txt":"c919b1f7737a51d8d6c0e20de35bd98c","data/tr/sr.txt":"43716edda5709333c54d40d6b5c8bb94","data/tr/st.txt":"29e7a76cfa9478bb5607b1d93364a417","data/tr/sv.txt":"e2e9ef9491c4975873773aae18107ef7","data/tr/sw.txt":"e4e4becf8ea3be702b516c4860d9fdcb","data/tr/ta.txt":"b64bef347d184666505efb640a79d692","data/tr/te.txt":"fd13ec7ac64f3fa0314a4ce137e0491d","data/tr/tg.txt":"7269bc4d31c63b02bd51a869bb5dd4ea","data/tr/th.txt":"398f48130ac7395152df8c7309d52633","data/tr/tl.txt":"a04af6ca1fa790972d074daa7ea83179","data/tr/tr.txt":"1916c2a115b3da0fd22c5dad367dda6b","data/tr/tt.txt":"92e96de81be9d68fc24a822eb2ea2850","data/tr/tw.txt":"885dbbf376d5a870ce52485d628809f1","data/tr/ug.txt":"232ed978b1a1158fc4c141586e8ea308","data/tr/uk.txt":"5fe630290c5af71fdbdb2bc8e29f19b3","data/tr/ur.txt":"966e68c7d4d0215f39bbb74695fe7a29","data/tr/uz.txt":"ff35602979a11f6c0a693883f5f07eb6","data/tr/vi.txt":"36fca7fdb1cc524253758129a915b455","data/tr/xh.txt":"1df1342445407e592cd7c24bc583a027","data/tr/yao.txt":"e4fb3735b05e1295f30962322f13debc","data/tr/yo.txt":"411cfeb0e30045b121ff674926cbfaba","data/tr/zh-CN.txt":"d49c39b253674555663e80a97ded9feb","data/tr/zh-TW.txt":"6797c91ed8b7af21a5f8b87a337b46f9","data/tr/zu.txt":"03b06a023c1d15befb46bb774e046b61","data/words.txt":"6108e9bdb76a8465b9e167a416c10031"};
async function sha256hex(t) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
async function verified(url, t) { const want = INTEGRITY[url]; if (!want || !crypto?.subtle) return true; return (await sha256hex(t)).slice(0, want.length) === want; }
async function getText(url) {
  let t;
  if (FILE_MODE) t = await scriptData(url);
  else { const r = await fetch(url); if (!r.ok) throw new Error(url); t = await r.text(); }
  if (await verified(url, t)) return t;
  if (!FILE_MODE && window.caches) { // نسخة قديمة أو معدَّلة في ذاكرة الجهاز: تُحذف ويُعاد التنزيل مرة واحدة
    try { for (const k of await caches.keys()) await (await caches.open(k)).delete(new URL(url, location.href).href, { ignoreSearch: true }); } catch (e) {}
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'reload' }); if (r.ok) { t = await r.text(); if (await verified(url, t)) return t; }
  }
  console.warn('integrity check failed', url);
  throw new Error('تعذّر التحقق من سلامة ملف البيانات ' + url);
}
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
const NAV = LAB ? [
  ['المختبر', [['research','بحث جديد','i-flask'],['mine','أبحاثي','i-bookmark'],['prayer','مواقيت الصلاة','i-time'],['adhkar','أذكار الصباح والمساء','i-sun',1]]],
  ['أدوات التحقق', [['mushaf','المصحف','i-book'],['words','المعجم المفهرس','i-abc']]],
  ['التطبيق', [['guide','دليل المختبر','i-info'],['account','حسابي','i-user'],['settings','الإعدادات','i-gear'],['admin','لوحة الإدارة','i-shield']]],
] : [
  ['', [['home','الرئيسية','i-home']]],
  ['اقرأ وتدبّر', [['mushaf','المصحف','i-book'],['tafasir','التفاسير وأسباب النزول','i-book',1],['search','البحث بالمعنى','i-search'],['ask','اسأل مشكاة','i-spark'],['topics','الموسوعة الموضوعية','i-grid'],['kids','ركن الأطفال','i-kids',1],['tawhid','التوحيد في القرآن','i-tawhid',1],['jannah','وصف الجنة في القرآن','i-jannah',1]], 'p1'],
  ['احفظ وتعبّد', [['adhkar','أذكار الصباح والمساء','i-sun'],['duaa','أدعية القرآن','i-hands',1],['ruqya','التداوي بالقرآن','i-ruqya',1],['hifz','الحفظ والتسميع','i-mic'],['wird','وردي وتقدّمي','i-time'],['saved','محفوظاتي','i-bookmark'],['prayer','مواقيت الصلاة','i-time']], 'p2'],
  ['ابحث وحقّق', [['research','مختبر الأبحاث','i-flask'],['ulum','علوم القرآن','i-ulum',1],['jamal','الصور الجمالية في القرآن','i-jamal',1],['words','المعجم المفهرس','i-abc'],['stats','الإحصاء العام','i-chart'],['taam','الفاكهة والطعام في القرآن','i-taam',1]], 'p3'],
  ['اكتشف وتأمّل', [['awwalin','أخبار الأولين والآخرين','i-scroll'],['hadarat','الحضارات المذكورة في القرآن','i-hadarat',1],['ijaz','الإعجاز العلمي','i-atom'],['map','أطلس القرآن','i-map'],['timeline','الخط الزمني','i-time'],['graph','شبكة المعرفة','i-graph'],['nisaa','المرأة في القرآن','i-flower',1],['rijal','الرجل في القرآن','i-user',1],['shifa','الأمراض والعلاج','i-heal',1],['wazifa','وظيفة الإنسان','i-wazifa',1]], 'p4'],
  ['التطبيق', [['guide','دليل التطبيق','i-info'],['whatsnew','ما الجديد','i-spark'],['about','المنهج والمصادر','i-info'],['account','حسابي','i-user'],['settings','الإعدادات','i-gear'],['admin','لوحة الإدارة','i-shield']]],
];
let isOwner = false;
function navHTML() {
  return NAV.map(([sec, items, pc]) => (sec ? `<div class="sec${pc ? ' ' + pc : ''}">${pc ? '<i class="dot"></i>' : ''}${sec}</div>` : '') + items.filter(([v]) => (v !== 'admin' || (IS_PWA ? isAdmin() : isOwner)) && (v !== 'account' || IS_PWA))
    .map(([v, l, ic, nw]) => `<a href="#${v}" data-v="${v}"><svg><use href="#${ic}"/></svg>${l}${nw ? '<span class="new">جديد</span>' : ''}</a>`).join('')).join('');
}
function drawNav() { $('#nav').innerHTML = navHTML(); }
/* مسارات مشكاة: كل قسم بوصفه ولونه ومساره، تُبنى منها الرئيسية وروابط «تابع الاستكشاف» */
const PATHS = [
  ['p1', 'اقرأ وتدبّر', 'النص الكريم ومعانيه: تلاوة، وبحث بالفكرة، وموضوعات مفهرسة.', [
    ['mushaf', 'i-book', 'المصحف', 'صفحات مصحف المدينة متصلة بخط مجمع الملك فهد، مع التفسير والمعاني لكل آية.', () => `${n(Q.surahs.length)} سورة`],
    ['tafasir', 'i-book', 'التفاسير وأسباب النزول', 'ثمانية تفاسير لكل آية، وأسباب النزول مقتطفة من نصوص المفسرين مع نسبتها إلى كتبها، وبحث فيها.', () => `${n(TF.length)} كتب`],
    ['search', 'i-search', 'البحث بالمعنى', 'اكتب الفكرة بلغتك، فتظهر الآيات الأقرب إليها مرتبةً.', () => `${n(Q.ayat.length)} آية`],
    ['ask', 'i-spark', 'اسأل مشكاة', 'سؤالك يُجاب من الآيات وأقوال المفسرين والمداخل الموضوعية.', () => ''],
    ['topics', 'i-grid', 'الموسوعة الموضوعية', 'الأنبياء والأقوام والأماكن والأحكام، كل موضوع بآياته.', () => `${n(T.length)} فهرساً`],
    ['kids', 'i-kids', 'ركن الأطفال', 'قصص القرآن مصوّرة للأطفال، كل مشهد بآيته، مع أسئلة ونجوم وسور قصيرة للحفظ.', () => `${n(KIDS.length)} قصة`],
    ['tawhid', 'i-tawhid', 'التوحيد في القرآن الكريم', 'معنى التوحيد وأقسامه وبراهينه من آيات القرآن، ودعوة الرسل إليه، ونقيضه الشرك وثمراته، بالأحاديث الصحيحة وأقوال المفسرين.', () => `${n(TAWHID.nay)} آية`],
    ['jannah', 'i-jannah', 'وصف الجنة وأنواعها في القرآن الكريم', 'أسماء الجنة ودرجاتها، وأنهارها وقصورها ونعيمها وأهلها، ورؤية الله ورضوانه، والطريق إليها، بالآيات والأحاديث الصحيحة وأقوال المفسرين.', () => `${n(JANNAH.nay)} آية`]]],
  ['p2', 'احفظ وتعبّد', 'رفيقك اليومي: حفظ بخطة مراجعة، وأذكار الصباح والمساء، ومواقيت الصلاة.', [
    ['hifz', 'i-mic', 'الحفظ والتسميع', 'إخفاء تدريجي، واختبار بالكتابة والصوت، وجدول مراجعة.', () => ''],
    ['wird', 'i-time', 'وردي وتقدّمي', 'علامة «توقفت هنا»، وهدف الصفحات اليومي وسلسلة القراءة، وملاحظاتك على الآيات، ونسخ احتياطي ومزامنة بين أجهزتك.', () => { const g = goalPages(); return g ? `${n(Math.min(todayPages().length, g))} من ${n(g)} صفحة اليوم` : ''; }],
    ['saved', 'i-bookmark', 'محفوظاتي', 'الآيات التي علّمتها ومقاطع حفظك في مكان واحد.', () => `${n(ST.bookmarks.length)} علامة`],
    ['prayer', 'i-time', 'مواقيت الصلاة', 'حسب بلدك ومذهبك، مع اتجاه القبلة والتاريخ الهجري.', () => ''],
    ['adhkar', 'i-sun', 'أذكار الصباح والمساء', 'تظهر في وقتها حسب مدينتك، بنصوص حصن المسلم وتخريجها، مع عدّاد لكل ذكر.', () => ''],
    ['duaa', 'i-hands', 'أدعية القرآن', 'كل دعاء في القرآن بموضوعه ومن دعا به وسبب نزوله، وكيف تستعمله في يومك.', () => `${n(THEMES.duaa.groups.reduce((t, g) => t + g[1].length, 0))} دعاءً`],
    ['ruqya', 'i-ruqya', 'التداوي بالقرآن', 'آيات الشفاء والرقية الشرعية بأدلتها: الأحاديث الصحيحة بتخريجها، وأقوال العلماء بمصادرها، وضوابط الرقية وكيفيتها.', () => `${n(RUQYA.h.length)} حديثاً`]]],
  ['p3', 'ابحث وحقّق', 'أدوات الباحث: أبحاث موثقة، ومعجم الألفاظ والجذور، والإحصاء.', [
    ['research', 'i-flask', 'مختبر الأبحاث', 'بحث كامل في أي موضوع من الآيات والتفاسير والصحاح، بمصادره.', () => ''],
    ['ulum', 'i-ulum', 'علوم القرآن', 'أبواب مسلسلة مفهرسة: النزول، والمكي والمدني، وأسباب النزول، والجمع، والقراءات، والرسم، والنسخ، والمحكم والمتشابه، والعام والخاص، والمطلق والمقيد، والمنطوق والمفهوم، والأمثال، والأقسام، والجدل، والقصص، والإعجاز، والتفسير، وآداب التلاوة.', () => `${n(ULUM.length)} ${ULUM.length > 10 ? 'باباً' : 'أبواب'}`],
    ['jamal', 'i-jamal', 'الصور الجمالية في القرآن الكريم', 'التشبيه والاستعارة ومشاهد الكون والقيامة وتصوير النفس، وذكر القرآن للجمال والزينة والصبر الجميل، بأقوال المفسرين بلفظها.', () => `${n(JAMAL.nay)} آية`],
    ['words', 'i-abc', 'المعجم المفهرس', 'كل لفظ وجذر في المصحف بمواضعه وصيغه.', () => `${n(W.roots.length)} جذراً`],
    ['stats', 'i-chart', 'الإحصاء العام', 'السور والكلمات والحروف وأقسام الكلم بالأرقام الموثقة.', () => `${n(W.w.length)} كلمة`],
    ['taam', 'i-taam', 'الفاكهة والطعام في القرآن الكريم', 'التين والزيتون والنخل والعسل واللبن والمن والسلوى بآياتها، وأحكام الحلال والطيبات وآداب الطعام وترك الإسراف، بالأحاديث الصحيحة وأقوال المفسرين.', () => `${n(TAAM.k.length)} صنفاً`]]],
  ['p4', 'اكتشف وتأمّل', 'رحلة في أخبار القرآن وآياته الكونية، على الخريطة والزمن.', [
    ['awwalin', 'i-scroll', 'أخبار الأولين والآخرين', 'قصص الأمم السابقة وأخبار الغيب الآتي، من الآيات.', () => ''],
    ['hadarat', 'i-hadarat', 'الحضارات المذكورة في القرآن الكريم', 'عاد وثمود وفرعون وسبأ وذو القرنين وغيرهم: مكانهم وزمنهم بحسب المفسرين، وعمرانهم وسبب زوالهم ودروسهم، بالآيات بخط المصحف وأقوال المفسرين بلفظها.', () => `${n(HADARAT.k.length)} حضارة`],
    ['ijaz', 'i-atom', 'الإعجاز العلمي', 'آيات الكون والإنسان مع درجة كل قول ومصادره.', () => ''],
    ['map', 'i-map', 'أطلس القرآن', 'خريطة للمدن والقرى والأماكن الواردة في القرآن.', () => ''],
    ['timeline', 'i-time', 'الخط الزمني', 'الأنبياء على ترتيب المؤرخين، وأحداث السيرة بسنواتها.', () => ''],
    ['graph', 'i-graph', 'شبكة المعرفة', 'علاقات الأنبياء بأقوامهم وأماكنهم والسور.', () => ''],
    ['asnaf', 'i-asnaf', 'أقسام الناس في القرآن', 'المؤمنون والكافرون والمنافقون، والسابقون وأصحاب اليمين والشمال، والأبرار والفجار، والمتقون والمحسنون والمستضعفون وأهل الكتاب، بالآيات والأحاديث الصحيحة وأقوال المفسرين.', () => `${n(ASNAF.nay)} آية`],
    ['nisaa', 'i-flower', 'المرأة في القرآن', 'النساء اللاتي ذكرهن القرآن وقصصهن، ومكانة المرأة وحقوقها وأحكامها بآياتها.', () => ''],
    ['rijal', 'i-user', 'الرجل في القرآن', 'رجال ذكرهم القرآن، وصفات الرجال المؤمنين، ومسؤوليات الرجل وأحكامه بآياتها.', () => ''],
    ['shifa', 'i-heal', 'الأمراض والعلاج في القرآن', 'أمراض القلوب والأبدان والشفاء، ورخص المريض وأحكامه، والوقاية وحفظ الصحة بآياتها.', () => ''],
    ['wazifa', 'i-wazifa', 'وظيفة الإنسان في القرآن', 'لماذا خُلق الإنسان وما وظيفته: العبادة والخلافة وعمارة الأرض والأمانة، وختامها «يا ليتني قدّمت لحياتي».', () => `${n(WAZIFA.ch.length)} أبواب`]]],
];
const PATH_OF = {}; PATHS.forEach((p, gi) => p[3].forEach((x, i) => { PATH_OF[x[0]] = [gi, i]; }));
const sCard = ([v, ic, t, d, meta], pc, big) => { let m = ''; try { m = meta(); } catch (e) {} return `<a class="scard ${pc}${big ? ' big' : ''}" href="#${v}"><span class="sic"><svg><use href="#${ic}"/></svg></span><span class="stx"><b>${t}</b><span>${d}</span></span><span class="sft">${m ? `<em>${m}</em>` : '<em></em>'}<i aria-hidden="true">←</i></span></a>`; };
function nextPaths(v) {
  const at = PATH_OF[v]; if (!at || LAB) return '';
  const [gi, i] = at, g = PATHS[gi], ng = PATHS[(gi + 1) % PATHS.length];
  const same = g[3].filter((x, k) => k !== i).slice(0, 2).map(x => [x, g[0]]), other = [[ng[3][0], ng[0]]];
  return `<section class="nextpaths no-print"><div class="np-head"><span class="eyebrow">تابع الاستكشاف</span><a href="#home" class="np-all">كل الأقسام</a></div><div class="np-grid">${[...same, ...other].map(([x, pc]) => sCard(x, pc)).join('')}</div></section>`;
}
let curRoute = '';
const V = html => { $('#view').innerHTML = html + nextPaths(curRoute); };
/* ورد القراءة والمزامنة وما الجديد: وحدة تُحمَّل عند أول فتح من progress.js */
function progLoad(fn, ...a) {
  if (window.progressUI) return progressUI[fn](...a);
  if (!progLoad.s) { progLoad.s = document.createElement('script'); progLoad.s.src = 'progress.js'; document.head.appendChild(progLoad.s); }
  progLoad.s.addEventListener('load', () => progressUI[fn](...a), { once: true });
  progLoad.s.addEventListener('error', () => { progLoad.s.remove(); progLoad.s = null; V(`<p class="loading">تعذّر فتح هذا القسم، تحقق من الاتصال ثم أعد المحاولة.</p>`); }, { once: true });
}
const wird = () => { V(`<p class="loading">جارٍ التحميل…</p>`); progLoad('wird'); };
const whatsnew = () => { V(`<p class="loading">جارٍ التحميل…</p>`); progLoad('whatsnew'); };
const views = { wird, whatsnew, prayer, adhkar, home: LAB ? research : home, mine: () => research(null, true), mushaf, stats, words, topics, search, ask, hifz, saved, map: atlas, timeline, graph, settings, about, admin, guide, account, awwalin, ijaz, research, kids, ulum, duaa, nisaa, rijal, shifa, ruqya };
/* وحدات البيانات الكبيرة (mods/*.js): لا تُحمَّل إلا عند أول فتح للقسم، فيخفّ app.js ويبدأ التطبيق أسرع */
const MODS = {};
function needMod(key) {
  if (window[key.toUpperCase()]) return true;
  const h = location.hash;
  if (!MODS[key]) {
    const s = MODS[key] = document.createElement('script'); s.src = 'mods/' + key + '.js'; document.head.appendChild(s);
    s.addEventListener('error', () => { s.remove(); MODS[key] = null; if (location.hash === h) V(`<p class="loading">تعذّر فتح هذا القسم، تحقق من الاتصال ثم أعد المحاولة.</p>`); }, { once: true });
  }
  V(`<p class="loading">جارٍ فتح القسم…</p>`);
  MODS[key].addEventListener('load', () => { if (location.hash === h) route(); }, { once: true });
  return false;
}
function route() {
  const h = (location.hash || '#' + HOME).slice(1);
  let m, cur;
  curRoute = /^(s|a|p|ps|pa)\d/.test(h) ? 'mushaf' : /^tf\d/.test(h) || h === 'tafasir' ? 'tafasir' : /^hadarat-/.test(h) ? 'hadarat' : /^k-/.test(h) ? 'kids' : /^t-/.test(h) ? 'topics' : /^(root|lem)\d/.test(h) ? 'words' : h;
  if (m = h.match(/^s(\d+)$/)) { cur = 'mushaf'; surah(+m[1]); }
  else if (m = h.match(/^a(\d+)-(\d+)$/)) { cur = 'mushaf'; surah(+m[1], +m[2]); }
  else if (m = h.match(/^p(\d+)$/)) { cur = 'mushaf'; mpOpen(+m[1]); }
  else if (m = h.match(/^ps(\d+)$/)) { cur = 'mushaf'; mpOpen(1, { surah: Math.max(1, Math.min(114, +m[1])) }); }
  else if (m = h.match(/^pa(\d+)$/)) { cur = 'mushaf'; mpOpen(1, { ayah: Math.min(6235, +m[1]) }); }
  else if (m = h.match(/^tf(\d+)(?:-(\d+))?$/)) { cur = 'tafasir'; tafasirOpen2(Math.max(1, Math.min(114, +m[1])), +m[2] || 0); }
  else if (m = h.match(/^t-([a-z]+)$/)) { cur = 'topics'; topic(m[1]); }
  else if (!LAB && (m = h.match(/^k-([a-z]+)$/))) { cur = 'kids'; kids(m[1]); }
  else if (m = h.match(/^hadarat-([a-z]+)$/)) { cur = 'hadarat'; hadarat(m[1]); }
  else if (m = h.match(/^root(\d+)$/)) { cur = 'words'; rootView(+m[1]); }
  else if (m = h.match(/^lem(\d+)$/)) { cur = 'words'; lemmaView(+m[1]); }
  else { cur = views[h] ? h : HOME; if (LAB && cur === 'home') cur = 'research'; if (LAB && cur === 'about') cur = 'guide'; if (LAB && !['research', 'mine', 'prayer', 'adhkar', 'mushaf', 'words', 'guide', 'account', 'settings', 'admin'].includes(cur)) cur = 'research'; views[cur](); }
  setCur(cur);
  if (!/^(a|p|ps|pa)\d/.test(h)) window.scrollTo(0, 0);
}
function setCur(v) { $$('#nav a,#tabbar a').forEach(a => { if (a.dataset.v === v) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); }); }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => t.hidden = true, 2600); }
async function copyText(s) { try { await navigator.clipboard.writeText(s); toast('نُسخ النص'); } catch (e) { toast('تعذّر النسخ، حدّد النص يدوياً'); } }

/* ================= daily ayah */
let siteCfg = {};
/* آية اليوم: تُختار بحسب المناسبة الإسلامية في التاريخ الهجري (تقويم أم القرى) أو يوم الأسبوع، وإلا فمن قائمة مختارة،
   ومع كل آية سبب اختيارها ومصدره. الأحاديث المذكورة من الصحيحين أو السنن بدرجتها. */
const DAILY = [
  [2,255,'آية الكرسي، وهي أعظم آية في كتاب الله (صحيح مسلم، عن أُبيّ بن كعب).'],
  [2,286,'خاتمة سورة البقرة: «لا يكلف الله نفساً إلا وسعها»، و«من قرأ بالآيتين من آخر سورة البقرة في ليلة كفتاه» (البخاري ومسلم).'],
  [3,190,'آيات التفكر في خلق السماوات والأرض، قرأها النبي ﷺ حين قام من الليل (البخاري ومسلم، عن ابن عباس).'],
  [3,200,'الوصية بالصبر والمصابرة والمرابطة والتقوى طريقاً إلى الفلاح.'],
  [13,28,'طمأنينة القلوب بذكر الله.'],
  [14,7,'وعد الله بالزيادة لمن شكر نعمه.'],
  [16,97,'الحياة الطيبة جزاءُ العمل الصالح مع الإيمان، للرجال والنساء.'],
  [17,23,'برّ الوالدين مقروناً بتوحيد الله وعبادته.'],
  [18,10,'دعاء أصحاب الكهف: الرحمة والرشد من عند الله.'],
  [20,114,'«وقل ربِّ زدني علماً»: أمرٌ بطلب الزيادة من العلم والدعاء به.'],
  [21,87,'دعوة ذي النون، «لم يدعُ بها رجل مسلم في شيء قط إلا استجاب الله له» (الترمذي، وصححه الألباني).'],
  [24,35,'آية النور: «الله نور السماوات والأرض».'],
  [25,63,'من صفات عباد الرحمن: التواضع والحلم.'],
  [29,69,'وعد الله بالهداية لمن جاهد نفسه في سبيله.'],
  [31,17,'وصية لقمان لابنه: الصلاة، والأمر بالمعروف، والصبر.'],
  [33,41,'الأمر بذكر الله ذكراً كثيراً.'],
  [39,53,'من أرجى آيات القرآن: «لا تقنطوا من رحمة الله».'],
  [40,60,'«ادعوني أستجب لكم»: وعد الله بإجابة الدعاء.'],
  [49,13,'ميزان الكرامة عند الله: التقوى، لا النسب ولا اللون.'],
  [55,13,'«فبأي آلاء ربكما تكذبان»: تذكير متكرر بنعم الله.'],
  [57,4,'معيّة الله وعلمه بكل ما نعمل أينما كنا.'],
  [59,22,'من أسماء الله الحسنى في خاتمة سورة الحشر.'],
  [65,2,'«ومن يتق الله يجعل له مخرجاً»: وعد بالفرج لأهل التقوى.'],
  [67,1,'مطلع سورة الملك، «سورة من القرآن ثلاثون آية شفعت لرجل حتى غُفر له» (الترمذي وحسّنه).'],
  [94,5,'«فإن مع العسر يسراً»: بشارة بأن الفرج يصحب الشدة.'],
  [2,152,'«فاذكروني أذكركم»: فضل ذكر الله.'],
  [2,186,'قرب الله من عباده وإجابته دعاءهم.'],
  [3,8,'دعاء الراسخين في العلم بالثبات على الهداية.'],
  [3,139,'«ولا تهنوا ولا تحزنوا»: علوّ المؤمنين بإيمانهم.'],
  [4,58,'أداء الأمانات إلى أهلها والعدل في الحكم.'],
  [5,8,'العدل مع الناس ولو كان بيننا وبينهم خصومة.'],
  [6,162,'الإخلاص: الصلاة والنسك والحياة والممات كلها لله.'],
  [7,56,'«إن رحمت الله قريب من المحسنين».'],
  [9,51,'التوكل والرضا بما كتب الله.'],
  [10,62,'أولياء الله لا خوف عليهم ولا هم يحزنون.'],
  [11,88,'«وما توفيقي إلا بالله»: نسبة التوفيق إلى الله وحده.'],
  [12,87,'«ولا تيأسوا من روح الله»: الأمل في رحمة الله.'],
  [15,9,'تكفّل الله بحفظ القرآن.'],
  [16,128,'معيّة الله للمتقين والمحسنين.'],
  [17,9,'القرآن يهدي للتي هي أقوم.'],
  [18,46,'الباقيات الصالحات خير من زينة الدنيا.'],
  [19,96,'محبة يجعلها الرحمن للمؤمنين العاملين.'],
  [22,46,'العمى الحقيقي عمى القلوب لا الأبصار.'],
  [23,1,'«قد أفلح المؤمنون»: مطلع صفات أهل الفلاح.'],
  [28,77,'التوازن بين طلب الآخرة ونصيب الدنيا، مع الإحسان.'],
  [30,21,'المودة والرحمة بين الزوجين من آيات الله.'],
  [35,28,'«إنما يخشى الله من عباده العلماء»: العلم طريق الخشية.'],
  [41,34,'«ادفع بالتي هي أحسن»: مقابلة الإساءة بالإحسان.'],
  [42,30,'ما يصيب الإنسان بما كسبت يداه، والله يعفو عن كثير.'],
  [50,16,'قرب الله من الإنسان وعلمه بما توسوس به نفسه.'],
  [51,56,'الغاية من خلق الجن والإنس: عبادة الله.'],
  [58,11,'رفعة الذين آمنوا والذين أوتوا العلم درجات.'],
  [64,16,'«فاتقوا الله ما استطعتم»: التكليف على قدر الطاقة.'],
  [73,20,'«فاقرؤوا ما تيسّر من القرآن»: تيسير القراءة والقيام.'],
  [89,27,'خطاب النفس المطمئنة.'],
  [93,5,'«ولسوف يعطيك ربك فترضى»: بشارة للنبي ﷺ.'],
  [103,1,'سورة العصر، قال الإمام الشافعي: لو تدبّر الناس هذه السورة لوسعتهم (ذكره ابن كثير).']];
const HM = ['', 'المحرّم', 'صفر', 'ربيع الأول', 'ربيع الآخر', 'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان', 'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'];
function hijriParts(d) {
  try { const o = {}; new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { day: 'numeric', month: 'numeric', year: 'numeric' }).formatToParts(d).forEach(x => o[x.type] = parseInt(x.value, 10)); return o.month ? { d: o.day, m: o.month, y: o.year } : null; } catch (e) { return null; }
}
/* المناسبة بحسب التاريخ الهجري ويوم الأسبوع: [عنوان, سورة, آية, سبب الاختيار] */
function dailyOccasion(h, wd, k) {
  const pick = a => a[k % a.length];
  if (h) {
    const { d, m } = h;
    if (m === 9) {
      if (d === 1) return ['أول أيام رمضان', 2, 185, 'بداية شهر رمضان، الشهر الذي أُنزل فيه القرآن، وفي الآية الأمر بصيامه.'];
      if (d === 17) return ['ذكرى غزوة بدر', 3, 123, 'السابع عشر من رمضان يوم غزوة بدر الكبرى سنة ٢ هـ على المشهور عند أهل السيرة، والآية تذكّر بنصر الله فيها.'];
      if (d === 20) return ['ذكرى فتح مكة', 110, 1, 'فُتحت مكة في رمضان سنة ٨ هـ (البخاري)، وأرّخه ابن إسحاق بالعشرين منه، وسورة النصر تبشّر بالفتح.'];
      if (d >= 21) return ['العشر الأواخر من رمضان', 97, 3, 'العشر الأواخر التي تُتحرّى فيها ليلة القدر، قال ﷺ: «تحرَّوا ليلة القدر في الوتر من العشر الأواخر من رمضان» (البخاري).'];
      const x = pick([[2, 183], [2, 184], [2, 185], [2, 186], [2, 187]]);
      return ['شهر رمضان', x[0], x[1], 'من آيات الصيام في سورة البقرة، نقرؤها في شهر رمضان المبارك.'];
    }
    if (m === 10 && d === 1) return ['عيد الفطر', 2, 185, 'يوم عيد الفطر، وفي الآية: «ولتكملوا العدة ولتكبروا الله على ما هداكم»، وهي أصل التكبير في العيد.'];
    if (m === 10 && d <= 8) return ['ست من شوال', 6, 160, 'أيام صيام الست من شوال، قال ﷺ: «من صام رمضان ثم أتبعه ستاً من شوال كان كصيام الدهر» (مسلم)، والحسنة بعشر أمثالها.'];
    if (m === 12) {
      if (d === 8) return ['يوم التروية', 2, 197, 'الثامن من ذي الحجة يوم التروية، يتوجه فيه الحجاج إلى منى، والآية في أحكام الحج وآدابه.'];
      if (d === 9) return ['يوم عرفة', 5, 3, 'يوم عرفة، وفيه نزلت هذه الآية على النبي ﷺ وهو قائم بعرفة في حجة الوداع (البخاري ومسلم، عن عمر بن الخطاب).'];
      if (d === 10) return ['عيد الأضحى', 108, 2, 'يوم النحر عيد الأضحى، والآية تأمر بالصلاة لله والنحر له.'];
      if (d <= 13 && d >= 11) return ['أيام التشريق', 2, 203, 'أيام التشريق هي «الأيام المعدودات» (ابن عباس، علّقه البخاري)، وقال ﷺ: «أيام التشريق أيام أكل وشرب وذكر لله» (مسلم).'];
      if (d <= 7) { const x = pick([[89, 2, 'أقسم الله بالليالي العشر، وهي عشر ذي الحجة عند جمهور المفسرين (ابن كثير).'], [22, 28, '«ويذكروا اسم الله في أيام معلومات»، والأيام المعلومات أيام العشر (ابن عباس، علّقه البخاري).'], [22, 27, 'آية الأذان بالحج، نقرؤها في أيام الحج.']]);
        return ['العشر الأوائل من ذي الحجة', x[0], x[1], x[2] + ' وقال ﷺ: «ما العمل في أيام أفضل منها في هذه» (البخاري).']; }
    }
    if (m === 1) {
      if (d === 1) return ['رأس السنة الهجرية', 9, 40, 'بداية سنة هجرية جديدة، والتقويم الهجري يبدأ بهجرة النبي ﷺ، والآية تذكر خروجه مع صاحبه في الغار.'];
      if (d === 9) return ['تاسوعاء', 10, 90, 'التاسع من المحرّم، قال ﷺ: «لئن بقيت إلى قابل لأصومنّ التاسع» (مسلم)، والآية في نجاة بني إسرائيل بعبور البحر.'];
      if (d === 10) return ['يوم عاشوراء', 26, 65, 'يوم عاشوراء نجّى الله فيه موسى وقومه، فصامه النبي ﷺ وأمر بصيامه (البخاري ومسلم).'];
      return ['شهر الله المحرّم', 9, 36, 'المحرّم أول الأشهر الحُرُم في العام الهجري، قال ﷺ: «أفضل الصيام بعد رمضان شهر الله المحرّم» (مسلم).'];
    }
    if (m === 3 && d === 12) return ['ربيع الأول', 21, 107, 'الثاني عشر من ربيع الأول هو المشهور عند كثير من أهل السيرة يوماً لمولد النبي ﷺ، والآية في بعثته رحمةً للعالمين.'];
    if (m === 3) { const x = pick([[33, 21], [68, 4], [9, 128], [3, 164], [48, 29]]); return ['شهر ربيع الأول', x[0], x[1], 'في ربيع الأول وُلد النبي ﷺ وفيه وصل إلى المدينة مهاجراً، فاخترنا آية في صفته ﷺ.']; }
    if (m === 7 && d === 27) return ['الإسراء والمعراج', 17, 1, 'يذكر كثير من الناس أن الإسراء والمعراج كان في ٢٧ رجب، وتاريخه مختلف فيه عند العلماء، والآية أول سورة الإسراء.'];
    if ((m === 7 && d === 1) || (m === 11 && d === 1)) return ['من الأشهر الحُرُم', 9, 36, 'بداية شهر ' + HM[m] + '، وهو من الأشهر الحُرُم الأربعة التي ذكرتها الآية.'];
    if (m === 8 && d >= 20) return ['استقبال رمضان', 2, 183, 'اقتراب شهر رمضان، والآية فاتحة آيات الصيام.'];
  }
  if (wd === 5) { const x = pick([[62, 9, 'يوم الجمعة، والآية تأمر بالسعي إلى ذكر الله عند النداء لصلاتها.'], [62, 10, 'يوم الجمعة، والآية في الانتشار في الأرض بعد الصلاة مع ذكر الله كثيراً.'], [18, 10, 'يوم الجمعة، ويُستحب فيه قراءة سورة الكهف لحديث أبي سعيد الخدري (الحاكم والبيهقي، وصححه الألباني).']]); return ['يوم الجمعة', x[0], x[1], x[2]]; }
  if (wd === 1) return ['يوم الاثنين', 96, 1, 'سُئل النبي ﷺ عن صوم الاثنين فقال: «ذاك يوم وُلدت فيه، ويوم بُعثت، أو أُنزل عليّ فيه» (مسلم)، و«اقرأ» أول ما نزل من القرآن.'];
  return null;
}
function dailyPick(date) {
  const now = date || new Date();
  if (siteCfg.featured) { const i = idxOf(siteCfg.featured.s, siteCfg.featured.a); if (i >= 0) return { i, tag: 'آية مختارة', why: siteCfg.featuredNote || '' , h: hijriParts(now) }; }
  const k = Math.floor((now.getTime() - now.getTimezoneOffset() * 6e4) / 864e5), h = hijriParts(now);
  const o = dailyOccasion(h, now.getDay(), k);
  if (o) { const i = idxOf(o[1], o[2]); if (i >= 0) return { i, tag: o[0], why: o[3], h, occ: true }; }
  const [s, a, w] = DAILY[k % DAILY.length]; return { i: idxOf(s, a), tag: 'آية اليوم', why: w, h };
}
function dailyIndex() { return dailyPick().i; }

/* ================= home */
/* بطاقة المصحف في أعلى الرئيسية: متابعة القراءة والانتقال إلى سورة أو جزء */
function mpHomeCard(last) {
  return `<section class="mphome" aria-label="المصحف الشريف"><div class="mh-pat" aria-hidden="true"></div>
    <div class="mh-head"><span class="mh-ic"><svg><use href="#i-book"/></svg></span><span><span class="eyebrow">مصحف المدينة النبوية · ٦٠٤ صفحات</span><h2>المصحف الشريف</h2></span></div>
    <p class="mh-lead">${last != null ? `توقفت عند <b>${esc(ref(last))}</b>` : 'اقرأ القرآن متصلاً صفحةً بعد صفحة، بخط مجمع الملك فهد ونصّه.'}</p>
    <div class="mh-go"><a class="btn mh-pri" href="${last != null ? `#pa${last}` : '#p1'}"><svg><use href="#i-book"/></svg>${last != null ? 'أكمل القراءة' : 'ابدأ القراءة'}</a>${last != null ? '<a class="btn mh-sec" href="#p1">من الفاتحة</a>' : '<a class="btn mh-sec" href="#mushaf">فهرس السور</a>'}</div>
    <div class="mh-sel"><select id="mhSur" aria-label="اختر سورة"><option value="">اختر سورة…</option>${Q.surahs.map(s => `<option value="${s.n}">${n(s.n)}. ${s.name}</option>`).join('')}</select>
    <select id="mhJuz" aria-label="اختر جزءاً"><option value="">اختر جزءاً…</option>${Array.from({ length: 30 }, (_, j) => `<option value="${j + 1}">الجزء ${n(j + 1)}</option>`).join('')}</select></div>
  </section>`;
}
function home() {
  const dp = dailyPick(), di = dp.i;
  const last = ST.last != null ? ST.last : null;
  const due = dueList();
  const hr = new Date().getHours(), greet = hr < 12 ? 'صباح الخير' : 'مساء الخير';
  const QUICK = ['الصبر على البلاء', 'بر الوالدين', 'التوكل على الله', 'الرزق', 'التوبة'];
  V(`<div class="stack home2">
  <div class="toprow">${mpHomeCard(last)}<div class="tr-side">${adhHomeCard()}${prHomeCard()}</div></div>
  <div class="hero2">
    <section class="daily stack tight"><div class="dl-top"><span class="eyebrow">${dp.occ ? 'آية اليوم' : esc(dp.tag)} · ${esc(ref(di))}</span>${dp.occ ? `<span class="dl-occ">${esc(dp.tag)}</span>` : ''}${dp.h ? `<span class="dl-hj">${n(dp.h.d)} ${HM[dp.h.m]} ${String(dp.h.y).replace(/\d/g, x => '٠١٢٣٤٥٦٧٨٩'[x])} هـ</span>` : ''}</div>
      ${ayahHTML(di, null, false)}
      ${dp.why ? `<p class="dl-why"><b>${siteCfg.featured ? 'تعليق' : 'سبب الاختيار'}:</b> ${esc(dp.why)}</p>` : ''}
      <div class="toolbar"><button class="btn" data-ayah="${di}">التفسير</button><button class="btn" data-card="${di}"><svg><use href="#i-image"/></svg>بطاقة للمشاركة</button><a class="btn" href="#a${Q.ayat[di][0]}-${Q.ayat[di][1]}">في سياقها</a></div>
    </section>
    <section class="welcome">
      <div class="wl-pat" aria-hidden="true"></div>
      <div class="wl-top"><span class="eyebrow">${greet}${SESSION ? ' · ' + esc(SESSION.name) : ''}</span>${adhChip()}</div>
      <h1>القرآن الكريم بين يديك: اقرأ، وابحث، وتدبّر</h1>
      <p class="lead">موسوعة واحدة تجمع المصحف وتفاسيره، والبحث بالمعنى، والحفظ، والأبحاث الموثقة، تعمل على جهازك دون إنترنت.</p>
      <form class="wl-search" id="homeQ" role="search"><svg><use href="#i-search"/></svg><input type="search" id="homeQi" placeholder="عمّ تبحث في القرآن؟ اكتب فكرة أو كلمة" aria-label="ابحث في القرآن"><button class="btn primary" type="submit">ابحث</button></form>
      <div class="wl-chips"><span class="muted small">جرّب:</span>${QUICK.map(q => `<button type="button" class="chip" data-hq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    </section>
    <section class="mindex" aria-label="أقسام مشكاة"><div class="mi-head"><b>أقسام مشكاة</b><span class="muted small">كل الأقسام بلمسة واحدة</span></div>
      ${PATHS.map(([pc, t, , items]) => `<div class="mi-group ${pc}"><div class="mi-t"><i class="dot"></i>${t}</div><div class="mi-grid">${items.map(([v, ic, tt]) => `<a class="mi-tile" href="#${v}"><svg><use href="#${ic}"/></svg><span>${tt}</span></a>`).join('')}</div></div>`).join('')}
      <div class="mi-more"><a href="#stats">القرآن بالأرقام</a><a href="#guide">دليل التطبيق</a><a href="#about">المنهج والمصادر</a></div>
    </section>
  </div>
  <div class="today">
    <div class="mine3">
      ${last != null ? `<a class="mcard" href="#pa${last}"><svg><use href="#i-book"/></svg><span><small>أكمل القراءة</small><b>${esc(ref(last))}</b></span></a>` : `<a class="mcard" href="#p1"><svg><use href="#i-book"/></svg><span><small>ابدأ القراءة</small><b>افتح المصحف</b></span></a>`}
      <a class="mcard" href="#hifz"><svg><use href="#i-mic"/></svg><span><small>مراجعة اليوم</small><b>${n(due.length)} مقطع</b></span></a>
      <a class="mcard" href="#saved"><svg><use href="#i-bookmark"/></svg><span><small>علاماتك</small><b>${n(ST.bookmarks.length)} آية</b></span></a>
    </div>
    ${progHomeCard()}
    <div class="pill-row acct-row">${cloud ? '<span class="chip ok">تقدّمك محفوظ في حسابك ويتزامن بين أجهزتك</span>' : SESSION ? `<a class="chip ok" href="#account">حسابك: ${esc(SESSION.name)} · ${ROLE[SESSION.role]}</a>` : IS_PWA ? '<span class="chip">تقدّمك محفوظ على هذا الجهاز</span><a class="chip acc" href="#account">ادخل إلى حسابك</a>' : '<span class="chip">تقدّمك محفوظ على هذا الجهاز</span>'}${IS_PWA && !FILE_MODE && !isStandalone() ? '<button class="chip acc" id="homeInst">ثبّت مشكاة على جهازك</button>' : ''}</div>
  </div>
  <section class="paths">
    <div class="sec-head"><div><span class="eyebrow">مسارات مشكاة</span><h2>اختر طريقك في الموسوعة</h2></div><a class="btn" href="#guide">دليل التطبيق</a></div>
    ${PATHS.map(([pc, t, d, items], gi) => `<div class="path ${pc}"><div class="path-head"><span class="pnum">${n(gi + 1)}</span><div><h3>${t}</h3><p>${d}</p></div></div><div class="path-grid">${items.map((x, i) => sCard(x, pc, i === 0)).join('')}</div></div>`).join('')}
  </section>
  <section class="numbers">
    <div class="sec-head"><div><span class="eyebrow">القرآن بالأرقام</span><h2>إحصاء موثق من نص المصحف</h2></div><a class="btn" href="#stats">الإحصاء الكامل</a></div>
    <div class="grid tiles">${[['سورة',Q.surahs.length],['آية',Q.ayat.length],['كلمة',W.w.length],['جذراً',W.roots.length],['كتب تفسير',TF.length]].map(([k,v]) => `<div class="tile"><b>${n(v)}</b><span>${k}</span></div>`).join('')}</div>
  </section>
  <section class="stack tight">
    <div class="sec-head"><div><span class="eyebrow">الموسوعة الموضوعية</span><h2>موضوعات مختارة</h2></div><a class="btn" href="#topics">كل الفهارس (${n(T.length)})</a></div>
    <div class="cat-rail">${T.slice(0, 10).map(c => `<a class="cat" href="#t-${c.id}"><span class="eyebrow">${n(c.items.length)} مدخلاً</span><h3>${c.title}</h3><p>${esc(c.intro)}</p></a>`).join('')}</div>
  </section>
  <footer class="hfoot">
    <div class="hf-brand"><img src="icons/icon-192.png" alt=""><span><b>مشكاة</b><small>موسوعة القرآن الذكية · مصحف المدينة النبوية، رواية حفص عن عاصم</small></span></div>
    <nav class="hf-links"><a href="#about">المنهج والمصادر</a><a href="#guide">دليل التطبيق</a><a href="#settings">الإعدادات</a>${IS_PWA ? '<a href="#account">حسابي</a>' : ''}</nav>
  </footer>
  </div>`);
  const go = q => { if (!q.trim()) return; window.scrollTo(0, 0); $('#qinput').value = q; history.replaceState(null, '', '#search'); curRoute = 'search'; setCur('search'); search(q); };
  $('#homeQ').onsubmit = e => { e.preventDefault(); go($('#homeQi').value); };
  $('#mhSur').onchange = e => { if (+e.target.value) location.hash = 'ps' + e.target.value; };
  $('#mhJuz').onchange = e => { const j = +e.target.value; if (j) location.hash = 'pa' + Q.ayat.findIndex(a => a[5] === j); };
  $$('[data-hq]').forEach(b => b.onclick = () => go(b.dataset.hq));
  const hi = $('#homeInst'); if (hi) hi.onclick = installApp;
}


/* ================= ركن الأطفال: قصص القرآن مصوّرة ومرتبطة بآياتها
   الحكاية مبسّطة من نص الآيات وتفسير الميسّر؛ الآيات تُعرض بنصها من المصحف، والرسوم أصلية لا تصوّر الأنبياء ولا الملائكة ولا أحداً من البشر. */
const KSV = (() => {
  const g = (x, y, s, b) => `<g transform="translate(${x} ${y}) scale(${s || 1})">${b}</g>`;
  const SKY = {
    day: ['#9fd3ff', '#e9f6ff'], dusk: ['#ffb877', '#ffe7c4'], night: ['#16204f', '#3a4a8f'], storm: ['#5d6987', '#a9b3c8'], cave: ['#2b2438', '#4a3f5c'], dawn: ['#c9b6ff', '#ffe2c6'], sea: ['#0e3a5c', '#1d5f86'],
  };
  const stars = (k, seed) => { let s = seed || 7, o = ''; for (let i = 0; i < k; i++) { s = (s * 9301 + 49297) % 233280; const x = 10 + (s % 300); s = (s * 9301 + 49297) % 233280; const y = 6 + (s % 70); o += `<circle cx="${x}" cy="${y}" r="${1 + (i % 3) * .5}" fill="#fff" opacity="${.55 + (i % 4) * .1}"/>`; } return o; };
  const E = {
    sun: (x, y, s) => g(x, y, s, `<circle r="20" fill="#ffd34d"/><circle r="27" fill="#ffd34d" opacity=".25"/>`),
    moon: (x, y, s) => g(x, y, s, `<path d="M8-16a18 18 0 1 0 0 32a14 14 0 1 1 0-32z" fill="#fff4c2"/>`),
    stars: (x, y, s, k) => stars(k || 18, x + y),
    star: (x, y, s) => g(x, y, s, `<path d="M0-9l2.6 5.6 6.1.7-4.5 4.2 1.2 6L0 4.5-5.4 7.5l1.2-6-4.5-4.2 6.1-.7z" fill="#ffe27a"/>`),
    cloud: (x, y, s) => g(x, y, s, `<g fill="#fff" opacity=".92"><ellipse cx="0" cy="0" rx="26" ry="12"/><ellipse cx="18" cy="-6" rx="16" ry="11"/><ellipse cx="-16" cy="-4" rx="13" ry="9"/></g>`),
    darkcloud: (x, y, s) => g(x, y, s, `<g fill="#4c5672"><ellipse cx="0" cy="0" rx="34" ry="14"/><ellipse cx="22" cy="-8" rx="20" ry="13"/><ellipse cx="-20" cy="-5" rx="16" ry="11"/></g>`),
    rain: () => Array.from({ length: 34 }, (_, i) => `<line x1="${(i * 37) % 320}" y1="${20 + (i * 13) % 60}" x2="${(i * 37) % 320 - 5}" y2="${34 + (i * 13) % 60}" stroke="#dfe8ff" stroke-width="1.4" opacity=".7"/>`).join(''),
    sea: (x, y) => `<path d="M0 ${y}q20-8 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0V180H0z" fill="#2e86c1"/><path d="M0 ${y + 14}q20-7 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0V180H0z" fill="#1f6fa5"/><path d="M0 ${y + 30}q20-6 40 0t40 0 40 0 40 0 40 0 40 0 40 0 40 0V180H0z" fill="#185a88"/>`,
    bigwaves: (x, y) => `<path d="M0 ${y}q25-30 50 0t50 0 50 0 50 0 50 0 50 0 50 0V180H0z" fill="#2a74a8"/><path d="M0 ${y + 22}q25-24 50 0t50 0 50 0 50 0 50 0 50 0 50 0V180H0z" fill="#1c5a87"/>`,
    deep: (x, y) => `<rect x="0" y="${y}" width="320" height="${180 - y}" fill="#0b2f4d"/>` + Array.from({ length: 9 }, (_, i) => `<circle cx="${20 + i * 35}" cy="${y + 20 + (i % 3) * 30}" r="${2 + i % 3}" fill="#9fd3ff" opacity=".35"/>`).join(''),
    desert: (x, y) => `<path d="M0 ${y}q60-22 130-4t110-6 80 8V180H0z" fill="#e9c27a"/><path d="M0 ${y + 18}q80-18 160 0t160-4V180H0z" fill="#dcae5e"/>`,
    grass: (x, y) => `<path d="M0 ${y}q80-14 160 0t160 0V180H0z" fill="#7cc46b"/><path d="M0 ${y + 16}q80-10 160 0t160 0V180H0z" fill="#5fae55"/>`,
    hills: (x, y) => `<path d="M0 ${y}q50-40 100-10t110-20 110 18V180H0z" fill="#9bd38a"/><path d="M0 ${y + 20}q70-26 150-6t170-8V180H0z" fill="#74bb67"/>`,
    river: (x, y) => `<path d="M0 ${y}h320V180H0z" fill="#86c97a"/><path d="M0 ${y + 18}q80-10 160 0t160 0v34q-80 10-160 0t-160 0z" fill="#3c9bd6"/><path d="M0 ${y + 30}q80-8 160 0t160 0" stroke="#bfe6ff" stroke-width="2" fill="none" opacity=".7"/>`,
    floor: (x, y) => `<rect x="0" y="${y}" width="320" height="${180 - y}" fill="#c9a77a"/><path d="M0 ${y}h320" stroke="#a8875c" stroke-width="3"/>`,
    ark: (x, y, s) => g(x, y, s, `<path d="M-62 0h124l-18 26H-44z" fill="#8a5a2b"/><path d="M-62 0h124" stroke="#5e3b1a" stroke-width="4"/><path d="M-56 9h112M-50 18h100" stroke="#6e4520" stroke-width="2"/><rect x="-34" y="-26" width="68" height="26" rx="3" fill="#b07a40"/><path d="M-40-26h80l-40-18z" fill="#7b4a22"/><rect x="-24" y="-18" width="10" height="9" rx="2" fill="#ffe7a8"/><rect x="-5" y="-18" width="10" height="9" rx="2" fill="#ffe7a8"/><rect x="14" y="-18" width="10" height="9" rx="2" fill="#ffe7a8"/>`),
    boat: (x, y, s) => g(x, y, s, `<path d="M-36 0h72l-12 14h-48z" fill="#9b6a3a"/><path d="M0 0v-40" stroke="#5e3b1a" stroke-width="3"/><path d="M2-38l26 30H2z" fill="#f4efe2"/><path d="M-2-34l-20 26h20z" fill="#e4dccb"/>`),
    whale: (x, y, s) => g(x, y, s, `<path d="M-70 0c0-30 40-42 80-34s50 26 40 44c-10 18-60 22-90 12C-55 18-70 12-70 0z" fill="#4b6f9e"/><path d="M48 8c14-6 22-20 30-30-2 14-2 26 6 36-12-2-24-2-36-6z" fill="#3d5c86"/><path d="M-62 8c20 10 70 12 100 0" stroke="#9ab8dd" stroke-width="3" fill="none"/><circle cx="-44" cy="-8" r="4" fill="#fff"/><circle cx="-45" cy="-8" r="2" fill="#123"/><path d="M-20-34q4-14 0-22M-16-34q10-10 14-20" stroke="#bfe6ff" stroke-width="3" fill="none" stroke-linecap="round"/>`),
    fire: (x, y, s) => g(x, y, s, `<path d="M-40 0c-6-24 10-32 8-50 14 10 18 24 16 34 6-8 6-22 2-34 18 12 26 32 22 50z" fill="#ff7a2f"/><path d="M-26 0c-2-14 8-20 8-30 8 8 12 16 10 26 4-4 6-12 4-20 10 8 12 18 10 24z" fill="#ffc23d"/><path d="M-50 2h100" stroke="#6b3a1a" stroke-width="6" stroke-linecap="round"/>`),
    coolfire: (x, y, s) => g(x, y, s, `<path d="M-40 0c-6-24 10-32 8-50 14 10 18 24 16 34 6-8 6-22 2-34 18 12 26 32 22 50z" fill="#9ad8c6" opacity=".75"/><path d="M-50 2h100" stroke="#6b3a1a" stroke-width="6" stroke-linecap="round"/>` + [[-28, -16, '#ff8fb1'], [-8, -30, '#ffd34d'], [12, -14, '#fff'], [26, -26, '#ff8fb1'], [-18, -40, '#fff']].map(([a, b, c]) => `<g transform="translate(${a} ${b})"><circle r="3" fill="#ffd34d"/>${[0, 72, 144, 216, 288].map(r => `<ellipse rx="3" ry="5.5" cy="-6" fill="${c}" transform="rotate(${r})"/>`).join('')}</g>`).join('')),
    palm: (x, y, s) => g(x, y, s, `<path d="M0 0c2-24 0-46-4-64" stroke="#8a5a2b" stroke-width="6" fill="none"/><g fill="#3f9b4a"><path d="M-4-64c-20-6-34 2-40 12 14-8 26-8 40-12z"/><path d="M-4-64c18-8 34-2 40 8-14-6-26-6-40-8z"/><path d="M-4-64c-12-14-28-16-36-10 14 0 24 4 36 10z"/><path d="M-4-64c10-16 26-18 34-12-14 0-24 6-34 12z"/></g><circle cx="-6" cy="-60" r="3" fill="#a0522d"/><circle cx="0" cy="-58" r="3" fill="#a0522d"/>`),
    tree: (x, y, s) => g(x, y, s, `<rect x="-4" y="-30" width="8" height="30" fill="#8a5a2b"/><circle cy="-44" r="22" fill="#4caf50"/><circle cx="-14" cy="-36" r="14" fill="#43a047"/><circle cx="14" cy="-36" r="14" fill="#5cbf60"/>`),
    gourd: (x, y, s) => g(x, y, s, `<path d="M-50 0q20-30 50-24t50 24" stroke="#3f8a3a" stroke-width="4" fill="none"/>` + [[-40, -14], [-20, -26], [4, -30], [28, -22], [44, -10]].map(([a, b]) => `<path d="M${a} ${b}c-14-4-20-18-12-26 6 4 14 4 18 0 6 10 4 22-6 26z" fill="#5cbf60" stroke="#3f8a3a"/>`).join('') + `<ellipse cx="-8" cy="-6" rx="10" ry="7" fill="#f2b33d"/><ellipse cx="20" cy="-4" rx="8" ry="6" fill="#f2b33d"/>`),
    mountain: (x, y, s) => g(x, y, s, `<path d="M-80 0L-20-70 10-40 34-62 90 0z" fill="#7d8aa8"/><path d="M-20-70l-12 20 10-4 8 8 8-12zM34-62l-8 14 8-2 6 6 4-8z" fill="#f1f4fb"/>`),
    basket: (x, y, s) => g(x, y, s, `<path d="M-26-6h52l-6 16h-40z" fill="#c8964a"/><path d="M-24-2h48M-22 4h44" stroke="#9b6e2f" stroke-width="2"/><path d="M-20-6q20-16 40 0" fill="#f6e7c4"/><ellipse cx="0" cy="12" rx="34" ry="4" fill="#bfe6ff" opacity=".6"/>`),
    reeds: (x, y, s) => g(x, y, s, [-12, -4, 4, 12].map((a, i) => `<path d="M${a} 0q${i % 2 ? 4 : -4}-24 ${i % 2 ? 2 : -2}-${40 + i * 4}" stroke="#4f8f3a" stroke-width="3" fill="none"/><ellipse cx="${a + (i % 2 ? 2 : -2)}" cy="-${40 + i * 4}" rx="3" ry="8" fill="#8a5a2b"/>`).join('')),
    palace: (x, y, s) => g(x, y, s, `<rect x="-60" y="-50" width="120" height="50" fill="#e8d3a8"/><rect x="-70" y="-62" width="22" height="62" fill="#dcc391"/><rect x="48" y="-62" width="22" height="62" fill="#dcc391"/><path d="M-70-62h22l-11-14zM48-62h22l-11-14z" fill="#c4a06a"/><path d="M-16 0v-30a16 16 0 0 1 32 0V0z" fill="#8a6a3a"/>` + [-40, 28].map(a => `<rect x="${a}" y="-40" width="12" height="16" rx="6" fill="#8a6a3a"/>`).join('')),
    ant: (x, y, s) => g(x, y, s, `<g fill="#3b2a20"><ellipse cx="-9" cy="0" rx="6" ry="5"/><ellipse cx="0" cy="0" rx="4" ry="3.5"/><ellipse cx="8" cy="-1" rx="4.5" ry="4"/></g><g stroke="#3b2a20" stroke-width="1.3" fill="none"><path d="M-3 2l-5 7M0 3l0 8M3 2l5 7M-3-2l-5-6M3-2l5-6M10-4q4-6 8-6M10-4q6-4 9 0"/></g><circle cx="10" cy="-2" r="1" fill="#fff"/>`),
    anthill: (x, y, s) => g(x, y, s, `<path d="M-30 0q30-34 60 0z" fill="#b8865a"/><ellipse cx="0" cy="-8" rx="6" ry="4" fill="#5a3b22"/>`),
    bird: (x, y, s) => g(x, y, s, `<path d="M-12 0q6-8 12 0q6-8 12 0" stroke="#1b2559" stroke-width="2.4" fill="none" stroke-linecap="round"/>`),
    stonebird: (x, y, s) => g(x, y, s, `<path d="M-12 0q6-8 12 0q6-8 12 0" stroke="#3a2a1a" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="0" cy="6" r="2.5" fill="#8a6a4a"/>`),
    hoopoe: (x, y, s) => g(x, y, s, `<ellipse cx="0" cy="0" rx="18" ry="11" fill="#e3a35a"/><path d="M-4-6l-8-18M0-8l-2-20M4-7l6-18M8-5l12-14" stroke="#e3a35a" stroke-width="4" stroke-linecap="round"/><path d="M-4-6l-8-18M0-8l-2-20M4-7l6-18M8-5l12-14" stroke="#2b1d12" stroke-width="1.4" stroke-dasharray="3 9" stroke-dashoffset="-9"/><path d="M-2 2q-10 10-26 6 10-2 14-10z" fill="#2b1d12"/><path d="M-6 4h18" stroke="#fff" stroke-width="2" stroke-dasharray="3 3"/><circle cx="12" cy="-3" r="2" fill="#1b1b1b"/><path d="M16-2l16 4-16 1z" fill="#3b2a20"/><path d="M-2 10l-2 10M4 10l2 10" stroke="#3b2a20" stroke-width="2"/>`),
    letter: (x, y, s) => g(x, y, s, `<rect x="-22" y="-14" width="44" height="28" rx="3" fill="#fff8e6" stroke="#c9a15a"/><path d="M-22-14l22 16 22-16" stroke="#c9a15a" fill="none"/><circle cx="0" cy="6" r="5" fill="#c0392b"/>`),
    cave: (x, y, s) => g(x, y, s, `<path d="M-110 0q10-90 110-96t110 96z" fill="#8f7e6a"/><path d="M-110 0q10-90 110-96t110 96" stroke="#6f604f" stroke-width="4" fill="none"/><path d="M-44 0q2-56 44-58t44 58z" fill="#2a2018"/>`),
    dog: (x, y, s) => g(x, y, s, `<ellipse cx="0" cy="-8" rx="22" ry="9" fill="#c99a5b"/><circle cx="-24" cy="-12" r="8" fill="#c99a5b"/><path d="M-30-18l-4-10 8 6z" fill="#a8783e"/><path d="M-30-6h-16M-34-2h-14" stroke="#c99a5b" stroke-width="5" stroke-linecap="round"/><path d="M22-8q12-6 14 4" stroke="#c99a5b" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M-26-13h4" stroke="#3b2a20" stroke-width="1.6" stroke-linecap="round"/>`),
    coins: (x, y, s) => g(x, y, s, [[-8, 0], [6, -2], [0, -8]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="8" ry="4" fill="#cfd6e4" stroke="#8a93a8"/>`).join('')),
    elephant: (x, y, s) => g(x, y, s, `<ellipse cx="0" cy="-30" rx="40" ry="26" fill="#8d97a8"/><circle cx="-38" cy="-40" r="18" fill="#8d97a8"/><path d="M-52-36q-14 20-4 38" stroke="#8d97a8" stroke-width="9" fill="none" stroke-linecap="round"/><ellipse cx="-30" cy="-42" rx="9" ry="13" fill="#7a8496"/><circle cx="-44" cy="-44" r="2.2" fill="#1b1b1b"/><g fill="#8d97a8"><rect x="-30" y="-12" width="12" height="16" rx="3"/><rect x="-8" y="-12" width="12" height="16" rx="3"/><rect x="12" y="-12" width="12" height="16" rx="3"/><rect x="26" y="-14" width="10" height="16" rx="3"/></g><path d="M40-34q8 4 6 14" stroke="#7a8496" stroke-width="3" fill="none"/><path d="M-12-56h30l-6 12h-20z" fill="#b5462e"/>`),
    kaaba: (x, y, s) => g(x, y, s, `<rect x="-30" y="-46" width="60" height="46" fill="#1b1b1f"/><rect x="-30" y="-36" width="60" height="7" fill="#d4af37"/><rect x="10" y="-22" width="10" height="22" fill="#d4af37" opacity=".85"/>`),
    stones: (x, y, s) => g(x, y, s, [[-30, 0], [-10, -4], [8, 0], [26, -3], [0, 6], [-20, 8], [18, 8]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="6" ry="4" fill="#8a6a4a"/>`).join('')),
    straw: (x, y, s) => g(x, y, s, Array.from({ length: 16 }, (_, i) => `<path d="M${-60 + i * 8} 0l${(i % 3) * 4 - 4}-10" stroke="#c9a15a" stroke-width="2"/>`).join('')),
    well: (x, y, s) => g(x, y, s, `<ellipse cx="0" cy="0" rx="34" ry="10" fill="#3a2a1a"/><path d="M-34 0v-18h68V0" fill="#a68a64"/><ellipse cx="0" cy="-18" rx="34" ry="10" fill="#8e7454"/><ellipse cx="0" cy="-18" rx="24" ry="6" fill="#1c140c"/><path d="M-30-18v-30M30-18v-30M-34-48h68" stroke="#6e4520" stroke-width="4"/><path d="M0-48v26" stroke="#c9a15a" stroke-width="2"/><rect x="-5" y="-26" width="10" height="8" fill="#8a5a2b"/>`),
    caravan: (x, y, s) => g(x, y, s, `<path d="M-30 0v-14h-6l2-10q10-8 20-4l6 10h24q4-14 16-12 6 4 4 14l4 16" stroke="#9b6e2f" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M-16-24q16-14 30 0z" fill="#b5462e"/>`),
    camel: (x, y, s) => g(x, y, s, `<path d="M-30 0v-26M-18 0v-24M14 0v-24M26 0v-26" stroke="#c48f4a" stroke-width="6" stroke-linecap="round"/><path d="M-34-26q0-14 16-18 10-18 24-4 14-12 22 4l10 4q8-14 8-28l8-2q6 10 0 14l-4 18q-10 14-24 14h-50q-10 0-10-2z" fill="#d9a35c"/><circle cx="40" cy="-62" r="1.8" fill="#1b1b1b"/>`),
    calf: (x, y, s) => g(x, y, s, `<ellipse cx="0" cy="-14" rx="14" ry="9" fill="#e7c08a"/><circle cx="-14" cy="-20" r="6" fill="#e7c08a"/><path d="M-8 -6v8M8-6v8" stroke="#e7c08a" stroke-width="4"/>`),
    storehouse: (x, y, s) => g(x, y, s, `<rect x="-60" y="-40" width="120" height="40" fill="#e3c894"/><path d="M-66-40h132L0-66z" fill="#b8864a"/><rect x="-12" y="-26" width="24" height="26" fill="#8a5a2b"/>` + [-44, -30, 30, 44].map(a => `<ellipse cx="${a}" cy="-8" rx="7" ry="9" fill="#d9b06a" stroke="#a87d3c"/>`).join('') + `<g fill="#e8b84a">${[-50, -40, 40, 50].map((a, i) => `<path d="M${a} 0v-${14 + i % 2 * 4}" stroke="#c9a15a" stroke-width="2"/>`).join('')}</g>`),
    wheat: (x, y, s) => g(x, y, s, [-10, 0, 10].map(a => `<path d="M${a} 0v-30" stroke="#c9a15a" stroke-width="2"/>${[0, 1, 2, 3].map(k => `<ellipse cx="${a + (k % 2 ? 3 : -3)}" cy="${-28 + k * 5}" rx="2.5" ry="4" fill="#e8b84a"/>`).join('')}`).join('')),
    statues: (x, y, s) => g(x, y, s, [[-50, 30], [-24, 38], [6, 54], [36, 36], [60, 28]].map(([a, h]) => `<rect x="${a - 9}" y="-${h}" width="18" height="${h}" rx="3" fill="#a5a9b4"/><rect x="${a - 12}" y="-6" width="24" height="6" fill="#868b98"/>`).join('')),
    broken: (x, y, s) => g(x, y, s, `<rect x="-60" y="-14" width="18" height="14" rx="2" fill="#a5a9b4"/><path d="M-36 0l6-10 10 4 2 6z" fill="#a5a9b4"/><rect x="-6" y="-54" width="22" height="54" rx="3" fill="#a5a9b4"/><rect x="-10" y="-6" width="30" height="6" fill="#868b98"/><path d="M30 0l8-12 14 6-2 6zM50 0l4-8 8 2 2 6z" fill="#a5a9b4"/><path d="M8-58l14-14" stroke="#6e4520" stroke-width="4" stroke-linecap="round"/><path d="M18-74l12 8-6 6-10-6z" fill="#7d8aa8"/>`),
    scale: (x, y, s) => g(x, y, s, `<path d="M0 0v-46M-30-40h60" stroke="#8a6a3a" stroke-width="3"/><path d="M-30-40l-10 20h20zM30-40l-10 20h20z" fill="none" stroke="#8a6a3a" stroke-width="2"/><path d="M-40-20h20M20-20h20" stroke="#8a6a3a" stroke-width="3"/><circle cx="-30" cy="-23" r="2" fill="#b5462e"/><rect x="-12" y="-2" width="24" height="4" fill="#8a6a3a"/>`),
    path: (x, y) => `<path d="M140 180q20-40 20-70t-6-30" stroke="#e8d9b5" stroke-width="22" fill="none" opacity=".85"/>`,
    lamp: (x, y, s) => g(x, y, s, `<path d="M0-40v14" stroke="#c9a15a" stroke-width="2"/><path d="M-12-26h24l-4 18h-16z" fill="#f2c94c" opacity=".9"/><circle cy="-14" r="18" fill="#ffd34d" opacity=".25"/>`),
    heart: (x, y, s) => g(x, y, s, `<path d="M0 10C-24-6-18-26-6-24c4 0 6 4 6 6 0-2 2-6 6-6 12-2 18 18-6 34z" fill="#ff6f8f"/>`),
    rock: (x, y, s) => g(x, y, s, `<path d="M-40 0q4-30 34-34 30 0 46 34z" fill="#a08c74"/><path d="M-6-34q8 14 2 34" stroke="#7e6c56" stroke-width="2" fill="none"/>`),
    crow: (x, y, s) => g(x, y, s, `<ellipse cx="0" cy="-10" rx="15" ry="8" fill="#23232b"/><circle cx="-14" cy="-16" r="6" fill="#23232b"/><path d="M-20-16l-9 3 9 2z" fill="#4a4a56"/><path d="M13-10l16 5-16 3z" fill="#23232b"/><path d="M-4-2v7M4-2v7" stroke="#4a4a56" stroke-width="2"/><circle cx="-15" cy="-17" r="1.3" fill="#fff"/>`),
    mound: (x, y, s) => g(x, y, s, `<path d="M-30 0q30-28 60 0z" fill="#9a7650"/><path d="M-30 0q30-12 60 0" stroke="#7b5c3b" stroke-width="2" fill="none"/>`),
    vines: (x, y, s) => g(x, y, s, `<path d="M-54 0v-38M54 0v-38" stroke="#8a5a2b" stroke-width="4"/><path d="M-58-38q28 16 58 0t58 0" stroke="#3f8a3a" stroke-width="5" fill="none"/>` + [[-36, -30], [-10, -26], [16, -30], [40, -26]].map(([a, b]) => `<g fill="#7d3c98"><circle cx="${a}" cy="${b}" r="5"/><circle cx="${a - 6}" cy="${b + 8}" r="5"/><circle cx="${a + 6}" cy="${b + 8}" r="5"/><circle cx="${a}" cy="${b + 15}" r="5"/></g>`).join('')),
    spring: (x, y, s) => g(x, y, s, `<ellipse cx="0" cy="0" rx="40" ry="9" fill="#5cb3e6"/><ellipse cx="0" cy="-1" rx="28" ry="5" fill="#9fd8f5"/><path d="M0-2q-12-28 0-44q12 16 0 44z" fill="#7cc6ee" opacity=".9"/><circle cx="-16" cy="-14" r="3" fill="#bfe6fa"/><circle cx="16" cy="-20" r="3" fill="#bfe6fa"/>`),
    deadtree: (x, y, s) => g(x, y, s, `<path d="M0 0v-46M0-24l-16-16M0-34l14-14M0-14l12-8" stroke="#6b5a4a" stroke-width="5" fill="none" stroke-linecap="round"/>`),
    wall: (x, y, s) => g(x, y, s, `<rect x="-64" y="-90" width="128" height="90" fill="#7b8494"/>` + [0, 1, 2, 3, 4].map(i => `<path d="M-64-${i * 18}h128" stroke="#5b6475" stroke-width="2"/>`).join('') + [0, 1, 2, 3, 4].map(i => [-40, -8, 24, 52].map(a => `<path d="M${a + (i % 2 ? 0 : 14)}-${i * 18}v-18" stroke="#5b6475" stroke-width="2"/>`).join('')).join('')),
    ironbars: (x, y, s) => g(x, y, s, [0, 1, 2].map(i => `<rect x="${-34 + i * 6}" y="${-i * 10 - 10}" width="${68 - i * 12}" height="9" rx="2" fill="#98a2b3" stroke="#6b7586"/>`).join('')),
    cow: (x, y, s) => g(x, y, s, `<ellipse cx="0" cy="-28" rx="36" ry="19" fill="#e8b84a"/><circle cx="-38" cy="-36" r="12" fill="#e8b84a"/><path d="M-44-46l-4-10M-32-46l2-10" stroke="#a8761f" stroke-width="3" stroke-linecap="round"/><g fill="#e8b84a"><rect x="-24" y="-14" width="9" height="16" rx="3"/><rect x="14" y="-14" width="9" height="16" rx="3"/></g><path d="M36-34q10 4 8 18" stroke="#a8761f" stroke-width="3" fill="none"/><circle cx="-42" cy="-38" r="1.8" fill="#2b1b0b"/>`),
    dates: (x, y, s) => g(x, y, s, [[-8, 0], [4, 6], [-2, 14], [10, 16], [-12, 12]].map(([a, b]) => `<ellipse cx="${a}" cy="${b}" rx="4" ry="6" fill="#a2522a"/>`).join('')),
    garden: (x, y, s) => g(x, y, s, `<path d="M-60 0h120" stroke="#8a5a2b" stroke-width="4"/>` + [-44, -22, 0, 22, 44].map(a => `<circle cx="${a}" cy="-14" r="13" fill="#4caf50"/><circle cx="${a - 4}" cy="-18" r="3" fill="#e5533d"/><circle cx="${a + 5}" cy="-10" r="3" fill="#e5533d"/>`).join('')),
    burnt: (x, y, s) => g(x, y, s, `<path d="M-60 0h120" stroke="#3a3128" stroke-width="4"/>` + [-44, -22, 0, 22, 44].map(a => `<path d="M${a} 0v-18M${a}-8l-8-8M${a}-10l8-8" stroke="#2b2520" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('')),
  };
  return spec => {
    const [sky, ground, gy = 130, ...items] = spec; const [c1, c2] = SKY[sky] || SKY.day; const id = 'k' + Math.random().toString(36).slice(2, 8);
    let s = `<svg class="ksv" viewBox="0 0 320 180" role="img" aria-hidden="true" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs><rect width="320" height="180" fill="url(#${id})"/>`;
    if (sky === 'night' || sky === 'cave') s += stars(22, 3);
    if (sky === 'storm') s += E.rain();
    const back = items.filter(it => ['sun', 'moon', 'cloud', 'darkcloud', 'mountain', 'stars', 'star', 'bird', 'stonebird', 'palace', 'kaaba', 'palm', 'tree'].includes(it[0]) && it[4] !== 'front');
    const front = items.filter(it => !back.includes(it));
    back.forEach(([k, x, y, sc, a]) => { s += E[k](x, y, sc, a); });
    if (ground && E[ground]) s += E[ground](0, gy);
    front.forEach(([k, x, y, sc, a]) => { s += E[k](x, y, sc, a); });
    return s + '</svg>';
  };
})();

/* القصص: كل مشهد بآيته (سورة، آية[، آية النهاية]) ورسمه. السرد مبسّط للأطفال من الآيات وتفسير الميسّر */
const KIDS = [
  { id: 'nuh', t: 'سفينة نوح', age: '٥+', c: '#2e86c1', cover: ['storm', 'bigwaves', 120, ['darkcloud', 80, 30], ['darkcloud', 240, 40], ['ark', 160, 112, 1.1]],
    scenes: [
      ['دعا نوحٌ عليه السلام قومَه إلى عبادة الله وحده زمناً طويلاً جداً: ألف سنة إلا خمسين عاماً، وكان صبوراً لا يملّ.', [29, 14], ['dusk', 'grass', 140, ['sun', 260, 60], ['palm', 40, 150, .9], ['tree', 280, 150, .8], ['heart', 160, 90, 1.4]]],
      ['أمره الله أن يصنع سفينة كبيرة، فكان قومه يمرّون به ويسخرون منه، وهو يعمل بثقة ويقين.', [11, 37, 38], ['day', 'desert', 140, ['sun', 50, 40], ['cloud', 230, 40], ['ark', 170, 128, 1.2]]],
      ['ولما جاء أمر الله، حمل في السفينة من كل نوع من الحيوانات زوجين اثنين، ومعه المؤمنون، وقال: باسم الله مجراها ومرساها.', [11, 40, 41], ['dusk', 'grass', 145, ['darkcloud', 70, 40], ['ark', 180, 130, 1.1], ['camel', 60, 165, .45], ['elephant', 280, 168, .4], ['bird', 120, 60, 1], ['bird', 150, 50, .8]]],
      ['جاء الطوفان، فجرت السفينة بمن فيها في موج كالجبال، والله يحفظهم.', [11, 42], ['storm', 'bigwaves', 118, ['darkcloud', 60, 30], ['darkcloud', 200, 26], ['darkcloud', 300, 44], ['ark', 150, 104, 1]]],
      ['ثم أمر الله الأرض أن تبلع ماءها، والسماء أن تتوقف، ورست السفينة على جبل الجوديّ بسلام.', [11, 44], ['dawn', 'sea', 150, ['mountain', 170, 150, 1.2], ['ark', 170, 96, .7], ['sun', 280, 50], ['bird', 70, 60, 1]]],
    ],
    learn: ['الصبر على فعل الخير مهما طال الوقت.', 'نطيع أمر الله ولو سخر منا الناس.', 'النجاة مع الإيمان والعمل الصالح.'],
    quiz: [['كم سنة لبث نوح يدعو قومه؟', ['تسعمائة وخمسين سنة', 'مائة سنة', 'عشر سنوات'], 0], ['أين رست السفينة؟', ['على جبل الجودي', 'على شاطئ البحر', 'في الصحراء'], 0], ['ماذا حمل نوح في السفينة؟', ['من كل زوجين اثنين والمؤمنين', 'الذهب والفضة', 'لا شيء'], 0]],
    mem: [11, 41] },
  { id: 'ibrahim', t: 'إبراهيم والأصنام', age: '٦+', c: '#e67e22', cover: ['dusk', 'floor', 140, ['coolfire', 160, 138, 1.4]],
    scenes: [
      ['كان قوم إبراهيم عليه السلام يعبدون تماثيل صنعوها بأيديهم، فسألهم: ما هذه التماثيل التي أنتم لها عاكفون؟', [21, 52], ['day', 'floor', 140, ['statues', 160, 140, 1.2]]],
      ['فلما خرجوا، كسّر الأصنام كلها إلا كبيرها، ليفكّروا ويرجعوا إلى الحق.', [21, 58], ['day', 'floor', 140, ['broken', 160, 140, 1.2]]],
      ['سألوه: أأنت فعلت هذا؟ قال: بل فعله كبيرهم، فاسألوهم إن كانوا ينطقون. فعرفوا في أنفسهم أن الأصنام لا تنفع ولا تتكلم.', [21, 62, 63], ['day', 'floor', 140, ['statues', 160, 140, 1], ['letter', 270, 60, .9]]],
      ['غضبوا وألقوه في نار عظيمة، فقال الله: يا نار كوني برداً وسلاماً على إبراهيم. فخرج منها سالماً.', [21, 68, 69], ['night', 'floor', 145, ['moon', 260, 40], ['coolfire', 160, 140, 1.5]]],
    ],
    learn: ['الله وحده يستحق العبادة.', 'نستعمل عقولنا ونسأل ونفكّر.', 'من توكّل على الله حفظه.'],
    quiz: [['ماذا قال الله للنار؟', ['كوني برداً وسلاماً', 'اشتعلي أكثر', 'انطفئي غداً'], 0], ['أيّ صنم تركه إبراهيم؟', ['كبيرهم', 'أصغرهم', 'لم يترك شيئاً'], 0], ['لماذا كسر الأصنام؟', ['ليفكّر قومه أنها لا تنفع', 'ليلعب', 'ليأخذها'], 0]],
    mem: [21, 69] },
  { id: 'yunus', t: 'يونس في بطن الحوت', age: '٥+', c: '#1abc9c', cover: ['sea', 'deep', 60, ['whale', 160, 110, 1.2]],
    scenes: [
      ['يونس عليه السلام رسول من الله. خرج من بلده غاضباً من قومه، وركب سفينة مملوءة بالناس.', [37, 139, 140], ['day', 'sea', 130, ['sun', 270, 40], ['cloud', 80, 40], ['boat', 160, 128, 1.3]]],
      ['اضطربت السفينة، فاقترعوا فوقعت القرعة عليه، فألقي في البحر فابتلعه حوت عظيم.', [37, 141, 142], ['storm', 'bigwaves', 120, ['darkcloud', 90, 30], ['boat', 230, 110, .8], ['whale', 120, 150, .9]]],
      ['في ظلمات الليل والبحر وبطن الحوت نادى: لا إله إلا أنت سبحانك إني كنت من الظالمين.', [21, 87], ['night', 'deep', 70, ['moon', 260, 30], ['whale', 160, 120, 1.15]]],
      ['ولأنه كان من المسبّحين نجّاه الله، فألقاه الحوت على الشاطئ وهو مريض، وأنبت الله عليه شجرة من يقطين.', [37, 143, 146], ['dawn', 'desert', 140, ['sun', 60, 50], ['sea', 0, 160], ['gourd', 180, 140, 1.2]]],
      ['ثم أرسله الله إلى قومه وهم مائة ألف أو يزيدون، فآمنوا جميعاً، فمتّعهم الله إلى حين.', [37, 147, 148], ['day', 'grass', 140, ['sun', 270, 40], ['palm', 60, 150, .9], ['palm', 250, 150, .8], ['heart', 160, 100, 1.4]]],
    ],
    learn: ['ندعو الله في كل وقت، وهو يسمعنا حتى في الظلام.', 'نعترف بالخطأ ونتوب إلى الله.', 'الصبر وعدم الغضب.'],
    quiz: [['ماذا قال يونس في بطن الحوت؟', ['لا إله إلا أنت سبحانك إني كنت من الظالمين', 'أريد أن أنام', 'لا شيء'], 0], ['ماذا أنبت الله عليه؟', ['شجرة من يقطين', 'نخلة', 'وردة'], 0], ['كم كان عدد قومه؟', ['مائة ألف أو يزيدون', 'عشرة', 'ألف'], 0]],
    mem: [21, 87] },
  { id: 'musa', t: 'موسى الرضيع في النهر', age: '٥+', c: '#3498db', cover: ['dawn', 'river', 120, ['palm', 40, 130, .9], ['palm', 290, 130, .8], ['basket', 170, 148, 1.2], ['reeds', 250, 165, 1]],
    scenes: [
      ['خافت أم موسى على طفلها من فرعون، فألهمها الله: أرضعيه، فإذا خفت عليه فألقيه في النهر، ولا تخافي ولا تحزني إنا رادّوه إليك.', [28, 7], ['night', 'river', 120, ['moon', 260, 40], ['basket', 150, 148, 1.1], ['reeds', 60, 165, 1]]],
      ['حمل الماءُ الصندوقَ فالتقطه آل فرعون، فقالت امرأة فرعون: قرة عين لي ولك، لا تقتلوه، عسى أن ينفعنا.', [28, 8, 9], ['day', 'river', 125, ['palace', 170, 125, 1], ['palm', 40, 125, .8], ['basket', 240, 152, .9]]],
      ['قالت أم موسى لأخته: تتبّعي أثره، فراقبته من بعيد، ورفض الطفل كل المرضعات.', [28, 11, 12], ['day', 'river', 125, ['palace', 220, 125, .8], ['reeds', 60, 165, 1.1], ['basket', 130, 152, .8]]],
      ['فدلّتهم أخته على أهل بيت يكفلونه، فردّه الله إلى أمه كي تقرّ عينها ولا تحزن، ولتعلم أن وعد الله حق.', [28, 12, 13], ['dusk', 'grass', 140, ['sun', 260, 50], ['heart', 160, 96, 1.6], ['palm', 50, 150, .9]]],
    ],
    learn: ['وعد الله حق لا يتخلّف.', 'الثقة بالله عند الخوف.', 'الأخت الذكية تعاون أهلها.'],
    quiz: [['أين وضعت أم موسى طفلها؟', ['في صندوق في النهر', 'في الغابة', 'عند الجيران'], 0], ['ماذا قالت امرأة فرعون؟', ['قرة عين لي ولك لا تقتلوه', 'أبعدوه عني', 'لا أعرفه'], 0], ['لماذا رُدّ موسى إلى أمه؟', ['كي تقرّ عينها ولا تحزن', 'لأنه بكى', 'بالصدفة'], 0]],
    mem: [28, 13] },
  { id: 'naml', t: 'سليمان والنملة', age: '٤+', c: '#27ae60', cover: ['day', 'hills', 130, ['sun', 270, 40], ['anthill', 160, 158, 1.4], ['ant', 110, 166, 1.4], ['ant', 210, 168, 1.2], ['ant', 70, 172, 1.1]],
    scenes: [
      ['ورث سليمانُ أباه داود عليهما السلام، وعلّمه الله منطق الطير، وأعطاه من كل شيء.', [27, 16], ['day', 'grass', 140, ['sun', 60, 40], ['bird', 140, 60, 1.2], ['bird', 180, 46, 1], ['bird', 220, 66, 1.1], ['palace', 200, 140, .7]]],
      ['وجُمع لسليمان جنوده من الجن والإنس والطير، فساروا في نظام عجيب.', [27, 17], ['dusk', 'desert', 135, ['sun', 260, 50], ['bird', 80, 50, 1], ['bird', 110, 40, 1], ['bird', 140, 56, 1], ['caravan', 170, 160, .9]]],
      ['فلما أتوا على وادي النمل قالت نملة: يا أيها النمل ادخلوا مساكنكم لا يحطمنّكم سليمان وجنوده وهم لا يشعرون.', [27, 18], ['day', 'hills', 130, ['anthill', 160, 158, 1.5], ['ant', 90, 166, 1.6], ['ant', 230, 168, 1.3], ['ant', 190, 172, 1.2]]],
      ['فتبسّم سليمان ضاحكاً من قولها، وشكر ربه: رب أوزعني أن أشكر نعمتك التي أنعمت عليّ.', [27, 19], ['dawn', 'grass', 140, ['sun', 160, 60], ['heart', 160, 112, 1.2], ['ant', 120, 166, 1.2], ['ant', 200, 166, 1.2]]],
    ],
    learn: ['الرحمة بالحيوانات الصغيرة.', 'القائد يحمي من معه، كما فعلت النملة.', 'نشكر الله على نعمه.'],
    quiz: [['ماذا قالت النملة؟', ['ادخلوا مساكنكم', 'اهربوا إلى البحر', 'لا تخافوا'], 0], ['ماذا فعل سليمان؟', ['تبسّم وشكر الله', 'غضب', 'نام'], 0], ['من جنود سليمان؟', ['الجن والإنس والطير', 'الأسود فقط', 'لا أحد'], 0]],
    mem: [27, 19] },
  { id: 'hudhud', t: 'الهدهد وملكة سبأ', age: '٦+', c: '#d35400', cover: ['day', 'desert', 140, ['sun', 270, 40], ['hoopoe', 150, 90, 1.6], ['palace', 260, 142, .5]],
    scenes: [
      ['تفقّد سليمانُ الطيرَ فلم يجد الهدهد، فقال: ما لي لا أرى الهدهد؟', [27, 20], ['day', 'grass', 140, ['bird', 80, 60, 1.2], ['bird', 130, 50, 1], ['bird', 200, 64, 1.1], ['bird', 250, 50, 1]]],
      ['جاء الهدهد وقال: جئتك من سبأ بنبأ يقين؛ وجدت امرأة تملكهم ولها عرش عظيم.', [27, 22, 23], ['dusk', 'desert', 140, ['hoopoe', 110, 92, 1.3], ['palace', 240, 140, .7]]],
      ['ووجدتها وقومها يسجدون للشمس من دون الله، وزيّن لهم الشيطان أعمالهم.', [27, 24], ['day', 'desert', 145, ['sun', 160, 50, 1.4], ['palace', 260, 145, .55], ['hoopoe', 60, 110, .9]]],
      ['كتب سليمان كتاباً وأرسله مع الهدهد: إنه من سليمان، وإنه بسم الله الرحمن الرحيم.', [27, 28, 30], ['day', 'desert', 145, ['hoopoe', 140, 76, 1.2], ['letter', 196, 100, 1.1], ['palace', 260, 145, .5]]],
      ['وفي النهاية قالت الملكة: أسلمتُ مع سليمان لله رب العالمين.', [27, 44], ['dawn', 'grass', 145, ['palace', 160, 140, .9], ['sun', 270, 46], ['heart', 60, 70, .9]]],
    ],
    learn: ['نتأكّد من الخبر قبل أن ننقله.', 'نحب الخير وندعو إليه بالحكمة.', 'الطاعة والاستئذان (الهدهد عاد ليخبر).'],
    quiz: [['من أين جاء الهدهد بالخبر؟', ['من سبأ', 'من مصر', 'من البحر'], 0], ['بمَ بدأ كتاب سليمان؟', ['بسم الله الرحمن الرحيم', 'مرحباً', 'السلام عليكم فقط'], 0], ['ماذا فعلت الملكة في النهاية؟', ['أسلمت لله رب العالمين', 'هربت', 'غضبت'], 0]],
    mem: [27, 30] },
  { id: 'kahf', t: 'أصحاب الكهف', age: '٦+', c: '#8e44ad', cover: ['night', 'hills', 150, ['moon', 260, 36], ['cave', 160, 160, 1], ['dog', 210, 162, .8]],
    scenes: [
      ['فتية آمنوا بربهم، فزادهم الله هدى، وثبّت قلوبهم على الحق.', [18, 13], ['dawn', 'hills', 140, ['sun', 160, 60], ['heart', 160, 110, 1.3]]],
      ['لجؤوا إلى الكهف ودعوا: ربنا آتنا من لدنك رحمة وهيئ لنا من أمرنا رشداً.', [18, 10], ['night', 'hills', 150, ['moon', 70, 40], ['cave', 170, 165, 1]]],
      ['ناموا في الكهف، والشمس تميل عنهم عند الشروق والغروب، وكلبهم باسط ذراعيه عند الباب.', [18, 17, 18], ['day', 'hills', 150, ['sun', 270, 40], ['cave', 150, 165, 1], ['dog', 200, 166, .9]]],
      ['ولبثوا في كهفهم ثلاث مائة سنين وازدادوا تسعاً، ثم أيقظهم الله.', [18, 25], ['night', 'hills', 150, ['moon', 260, 36], ['cave', 150, 165, 1], ['dog', 200, 166, .9]]],
      ['أرسلوا أحدهم بنقودهم الفضية إلى المدينة ليشتري طعاماً طيباً، وأوصوه أن يتلطّف.', [18, 19], ['day', 'grass', 150, ['palace', 220, 150, .7], ['coins', 120, 140, 2], ['tree', 50, 152, .8]]],
    ],
    learn: ['الثبات على الإيمان.', 'الدعاء عند الشدة.', 'الرفقة الصالحة تعين على الخير.'],
    quiz: [['كم لبثوا في الكهف؟', ['ثلاثمائة سنين وازدادوا تسعاً', 'يوماً واحداً', 'سنة'], 0], ['من كان معهم عند باب الكهف؟', ['كلبهم', 'قطة', 'حصان'], 0], ['بماذا دعوا الله؟', ['ربنا آتنا من لدنك رحمة', 'أن يصيروا أغنياء', 'لم يدعوا'], 0]],
    mem: [18, 10] },
  { id: 'fil', t: 'أصحاب الفيل', age: '٤+', c: '#7f8c8d', cover: ['dusk', 'desert', 140, ['kaaba', 250, 140, .9], ['elephant', 100, 150, .9], ['stonebird', 150, 40, 1.2], ['stonebird', 190, 56, 1], ['stonebird', 230, 36, 1.1]],
    scenes: [
      ['جاء جيش كبير معه فيل عظيم يريد هدم الكعبة بيت الله.', [105, 1], ['day', 'desert', 145, ['sun', 270, 40], ['elephant', 120, 160, 1], ['kaaba', 260, 145, .7]]],
      ['لكن الله أبطل مكرهم وجعل كيدهم في تضليل، فلم يصلوا إلى ما أرادوا.', [105, 2], ['dusk', 'desert', 145, ['kaaba', 220, 145, 1], ['elephant', 80, 160, .7]]],
      ['أرسل الله عليهم طيراً أبابيل، جماعات بعد جماعات، ترميهم بحجارة من سجيل.', [105, 3, 4], ['dusk', 'desert', 150, ...Array.from({ length: 9 }, (_, i) => ['stonebird', 30 + i * 32, 30 + (i % 3) * 18, 1]), ['stones', 160, 160, 1.2]]],
      ['فصاروا كأوراق الزرع اليابسة التي أكلتها الدواب، وحفظ الله بيته.', [105, 5], ['dawn', 'desert', 145, ['kaaba', 160, 145, 1.1], ['straw', 160, 168, 1.2], ['sun', 270, 46]]],
    ],
    learn: ['الله يحفظ بيته الحرام.', 'قوة الله أكبر من كل قوة.', 'لا نعتدي على مقدسات الناس.'],
    quiz: [['ماذا أراد أصحاب الفيل؟', ['هدم الكعبة', 'زيارة السوق', 'السباحة'], 0], ['ماذا أرسل الله عليهم؟', ['طيراً أبابيل', 'مطراً', 'رياحاً فقط'], 0], ['في أي سورة القصة؟', ['سورة الفيل', 'سورة البقرة', 'سورة الناس'], 0]],
    mem: [105, 1] },
  { id: 'yusuf', t: 'يوسف ورؤيا الكواكب', age: '٧+', c: '#c0392b', cover: ['night', 'desert', 150, ['moon', 70, 40], ['sun', 260, 44, .8], ...Array.from({ length: 11 }, (_, i) => ['star', 110 + (i % 6) * 24, 30 + Math.floor(i / 6) * 30, 1])],
    scenes: [
      ['رأى يوسف عليه السلام في منامه أحد عشر كوكباً والشمس والقمر له ساجدين، فقال له أبوه: لا تقصص رؤياك على إخوتك.', [12, 4, 5], ['night', 'desert', 150, ['moon', 70, 40], ['sun', 260, 44, .8], ...Array.from({ length: 11 }, (_, i) => ['star', 110 + (i % 6) * 24, 30 + Math.floor(i / 6) * 30, 1])]],
      ['حسده إخوته فألقوه في بئر عميقة، وأوحى الله إليه أنه سيخبرهم بما فعلوا يوماً.', [12, 15], ['dusk', 'desert', 150, ['well', 160, 160, 1.3], ['sun', 270, 50]]],
      ['مرّت قافلة فأرسلوا من يجلب الماء، فلما أدلى دلوه قال: يا بشرى هذا غلام.', [12, 19], ['day', 'desert', 150, ['well', 110, 160, 1], ['caravan', 230, 160, 1], ['sun', 280, 40]]],
      ['صبر يوسف حتى جعله الله أميناً على خزائن الأرض في مصر، يوزّع الطعام بالعدل في سنين الشدة.', [12, 55], ['day', 'grass', 150, ['storehouse', 160, 150, 1], ['wheat', 60, 168, 1], ['wheat', 270, 168, 1]]],
      ['جاءه إخوته فعفا عنهم وقال: لا تثريب عليكم اليوم يغفر الله لكم. وتحققت رؤياه.', [12, 92], ['dawn', 'grass', 150, ['sun', 160, 60], ['heart', 160, 112, 1.4], ['palm', 50, 155, .8]]],
    ],
    learn: ['الصبر يجعل العاقبة جميلة.', 'العفو عمّن أساء إلينا.', 'الأمانة والعدل في العمل.'],
    quiz: [['كم كوكباً رأى يوسف؟', ['أحد عشر', 'سبعة', 'ثلاثة'], 0], ['أين ألقاه إخوته؟', ['في البئر', 'في البحر', 'في الغابة'], 0], ['ماذا قال لإخوته في النهاية؟', ['لا تثريب عليكم اليوم', 'لن أسامحكم', 'اذهبوا'], 0]],
    mem: [12, 92] },
  { id: 'salih', t: 'ناقة صالح', age: '٦+', c: '#a0522d', cover: ['dusk', 'desert', 140, ['sun', 260, 50], ['rock', 90, 150, 1.3], ['camel', 180, 160, 1.1]],
    scenes: [
      ['دعا صالحٌ عليه السلام قومَه ثمود: يا قوم اعبدوا الله ما لكم من إله غيره.', [11, 61], ['day', 'desert', 140, ['sun', 270, 40], ['rock', 80, 150, 1.2], ['rock', 220, 150, 1.4]]],
      ['جعل الله لهم ناقة آية، وقال صالح: ذروها تأكل في أرض الله ولا تمسّوها بسوء.', [11, 64], ['day', 'desert', 145, ['camel', 160, 160, 1.2], ['well', 270, 170, .6], ['palm', 50, 160, .8]]],
      ['لكنهم ظلموا فعقروا الناقة، فقال لهم: تمتعوا في داركم ثلاثة أيام.', [11, 65], ['storm', 'desert', 145, ['darkcloud', 160, 40], ['rock', 160, 150, 1.4]]],
      ['نجّى الله صالحاً والمؤمنين معه برحمة منه، وأخذ الظالمين.', [11, 66], ['dawn', 'grass', 145, ['sun', 160, 60], ['heart', 160, 108, 1.3], ['palm', 60, 150, .8], ['palm', 260, 150, .8]]],
    ],
    learn: ['الوفاء بالعهد وعدم الاعتداء.', 'الرفق بالحيوان.', 'الظلم عاقبته سيئة.'],
    quiz: [['ما الآية التي أعطاها الله لثمود؟', ['الناقة', 'السفينة', 'العصا'], 0], ['ماذا طلب صالح من قومه؟', ['ألا يمسّوا الناقة بسوء', 'أن يركبوها', 'أن يبيعوها'], 0], ['من نجّى الله؟', ['صالحاً والمؤمنين', 'لا أحد', 'الظالمين'], 0]],
    mem: [91, 13] },
  { id: 'luqman', t: 'وصايا لقمان لابنه', age: '٥+', c: '#16a085', cover: ['day', 'grass', 140, ['sun', 270, 40], ['tree', 80, 150, 1.2], ['path', 0, 0], ['lamp', 220, 110, 1.2]],
    scenes: [
      ['قال لقمان لابنه وهو يعظه: يا بني لا تشرك بالله، إن الشرك لظلم عظيم.', [31, 13], ['day', 'grass', 140, ['sun', 160, 50], ['tree', 70, 150, 1], ['lamp', 240, 110, 1.2]]],
      ['ووصّى الله الإنسان بوالديه: حملته أمه وهناً على وهن، أن اشكر لي ولوالديك.', [31, 14], ['dawn', 'grass', 145, ['heart', 160, 96, 1.8], ['tree', 60, 150, .8], ['tree', 270, 150, .8]]],
      ['يا بني إنها إن تك مثقال حبة من خردل في صخرة أو في السماوات أو في الأرض يأت بها الله.', [31, 16], ['night', 'hills', 150, ['moon', 260, 36], ['rock', 150, 160, 1.4], ['star', 152, 128, .7]]],
      ['يا بني أقم الصلاة، وأمر بالمعروف وانه عن المنكر، واصبر على ما أصابك.', [31, 17], ['dusk', 'grass', 145, ['sun', 160, 60], ['lamp', 160, 116, 1.4], ['palm', 50, 150, .8]]],
      ['ولا تصعّر خدّك للناس ولا تمش في الأرض مرحاً، واقصد في مشيك واغضض من صوتك.', [31, 18, 19], ['day', 'grass', 140, ['sun', 270, 40], ['path', 0, 0], ['tree', 60, 150, .9], ['bird', 200, 60, 1]]],
    ],
    learn: ['نعبد الله وحده.', 'برّ الوالدين وشكرهما.', 'التواضع وخفض الصوت وحسن الخلق.'],
    quiz: [['بماذا بدأ لقمان وصيته؟', ['لا تشرك بالله', 'العب كثيراً', 'نم مبكراً'], 0], ['من أوصانا الله بشكرهما بعد شكره؟', ['الوالدين', 'الجيران فقط', 'لا أحد'], 0], ['كيف نمشي؟', ['بتواضع واعتدال', 'بتكبّر', 'بسرعة ونصرخ'], 0]],
    mem: [31, 17] },
  { id: 'ibnadam', t: 'ابنا آدم والغراب', age: '٦+', c: '#7d5a3c', cover: ['dusk', 'desert', 146, ['sun', 250, 46], ['crow', 160, 150, 1.5], ['mound', 80, 160, 1]],
    scenes: [
      ['قدّم ابنا آدم كلٌّ منهما قرباناً إلى الله، فتقبّل الله من أحدهما ولم يتقبّل من الآخر.', [5, 27], ['day', 'grass', 140, ['sun', 50, 40], ['cloud', 250, 40], ['basket', 110, 150, 1.2], ['basket', 210, 150, 1.2]]],
      ['غضب الذي لم يُتقبَّل منه، وقال لأخيه: لأقتلنّك! فقال له أخوه بهدوء: إنما يتقبّل الله من المتّقين.', [5, 27], ['storm', 'grass', 146, ['darkcloud', 80, 40], ['darkcloud', 230, 34], ['heart', 160, 120, 1.3]]],
      ['قال الأخ الطيّب: لو مددتَ يدك إليّ لتقتلني فلن أمدّ يدي إليك لأقتلك، إني أخاف الله ربّ العالمين.', [5, 28], ['dawn', 'grass', 146, ['sun', 260, 56], ['lamp', 160, 150, 1.4], ['heart', 90, 130, .9]]],
      ['لكنّ نفسه زيّنت له القتل فقتل أخاه، وأصبح من الخاسرين.', [5, 30], ['storm', 'desert', 146, ['darkcloud', 70, 40], ['darkcloud', 210, 34], ['rock', 160, 156, 1.1]]],
      ['فأرسل الله غراباً يحفر في الأرض ليُريَه كيف يستر جسد أخيه، فقال نادماً: يا ويلتا، أعجزتُ أن أكون مثل هذا الغراب؟', [5, 31], ['day', 'desert', 146, ['sun', 60, 40], ['cloud', 240, 40], ['crow', 130, 156, 1.6], ['mound', 220, 160, 1.2]]],
    ],
    learn: ['لا نحسد أحداً على نعمة الله، ولا نؤذي أحداً.', 'نخاف الله ونبتعد عن الأذى حتى لو غضبنا.', 'نتعلّم حتى من الطيور، وإذا أخطأنا نندم ونرجع إلى الله.'],
    quiz: [['ماذا أرسل الله ليُري ابن آدم كيف يستر أخاه؟', ['غراباً', 'صقراً', 'ذئباً'], 0], ['ماذا قال الأخ الطيب؟', ['إني أخاف الله ربّ العالمين', 'سأنتقم منك', 'لا أبالي'], 0], ['ممّن يتقبّل الله؟', ['من المتّقين', 'من الأغنياء فقط', 'من الأقوياء'], 0]],
    mem: [5, 28] },
  { id: 'ayyub', t: 'أيوب الصابر', age: '٥+', c: '#2e8b8b', cover: ['dawn', 'desert', 148, ['sun', 250, 54], ['spring', 160, 158, 1.5], ['palm', 60, 150, .8]],
    scenes: [
      ['كان أيوب عبداً صالحاً، أصابه مرضٌ وضرٌّ شديد، فصبر ولجأ إلى الله، ووصفه الله بأنه صابر، نعم العبد.', [38, 44], ['night', 'desert', 150, ['moon', 250, 44], ['lamp', 160, 146, 1.3]]],
      ['ونادى أيوب ربّه: إني مسّني الضرّ وأنت أرحم الراحمين.', [21, 83], ['night', 'hills', 150, ['stars', 0, 0], ['moon', 70, 44], ['heart', 170, 120, 1.4]]],
      ['فاستجاب الله له، وقال له: اضرب الأرض برجلك، هذا ماءٌ بارد تغتسل به وتشرب منه.', [38, 42], ['day', 'desert', 148, ['sun', 50, 40], ['cloud', 250, 40], ['spring', 170, 156, 1.6]]],
      ['فكشف الله عنه ما به من ضرّ، وجاء الفرج بعد الصبر.', [21, 84], ['dawn', 'grass', 148, ['sun', 160, 60], ['heart', 100, 130, 1], ['palm', 260, 150, .9]]],
      ['وأعطاه الله أهله ومثلهم معهم، رحمةً منه وتذكرةً لأصحاب العقول.', [38, 43], ['day', 'grass', 146, ['sun', 56, 40], ['palm', 70, 150, .9], ['tree', 250, 150, .9], ['heart', 150, 130, 1.1], ['heart', 190, 126, .9]]],
    ],
    learn: ['نصبر على المرض والمصائب ونثق بالله.', 'ندعو الله وحده، فهو أرحم الراحمين.', 'الفرج يأتي بعد الصبر.'],
    quiz: [['ماذا قال أيوب في دعائه؟', ['مسّني الضرّ وأنت أرحم الراحمين', 'أريد كنزاً', 'لا شيء'], 0], ['ماذا أمره الله أن يفعل؟', ['يضرب الأرض برجله فيخرج ماء بارد', 'يسافر بعيداً', 'يترك بيته'], 0], ['بماذا وصف الله أيوب؟', ['صابراً، نعم العبد', 'كسولاً', 'غاضباً'], 0]],
    mem: [21, 83] },
  { id: 'jannatayn', t: 'صاحب الجنتين', age: '٧+', c: '#6a8f2a', cover: ['day', 'grass', 142, ['sun', 52, 40], ['vines', 100, 150, 1], ['palm', 250, 150, 1]],
    scenes: [
      ['ضرب الله مثلاً برجلين: جعل لأحدهما بستانين من أعناب ونخل، وبينهما زرع، وفجّر بينهما نهراً.', [18, 32, 33], ['day', 'river', 138, ['sun', 52, 40], ['vines', 90, 140, .9], ['palm', 240, 140, 1], ['palm', 290, 145, .8]]],
      ['فقال صاحب البستان لصاحبه وهو يحاوره: أنا أكثر منك مالاً وأعزّ نفراً! وظنّ أن بستانه لن يفنى أبداً.', [18, 34, 35], ['day', 'grass', 142, ['sun', 260, 40], ['coins', 120, 150, 1.4], ['garden', 230, 152, .9]]],
      ['فنصحه صاحبه المؤمن: هلّا قلتَ حين دخلت بستانك: ما شاء الله، لا قوة إلا بالله!', [18, 38, 39], ['dawn', 'grass', 144, ['sun', 160, 56], ['lamp', 160, 150, 1.3], ['heart', 250, 130, 1]]],
      ['فأهلك الله ثمر البستان، فأصبح خالياً، وأخذ صاحبه يقلّب كفّيه حسرةً على ما أنفق فيه.', [18, 42], ['storm', 'desert', 144, ['darkcloud', 70, 40], ['darkcloud', 220, 34], ['burnt', 150, 156, 1], ['deadtree', 260, 156, 1]]],
      ['وقال: يا ليتني لم أشرك بربي أحداً! ولم يجد من ينصره من دون الله، فالنصر لله الحقّ وهو خير ثواباً.', [18, 43, 44], ['dawn', 'hills', 146, ['sun', 250, 50], ['lamp', 150, 150, 1.4], ['heart', 100, 130, 1]]],
    ],
    learn: ['نقول: ما شاء الله، لا قوة إلا بالله، حين نرى نعمة.', 'المال لا يُغني عن الله شيئاً.', 'نشكر الله على نعمه ولا نتكبّر على أحد.'],
    quiz: [['ماذا نقول حين نرى نعمة جميلة؟', ['ما شاء الله، لا قوة إلا بالله', 'أنا الذي صنعتها', 'لا شيء'], 0], ['ماذا كان في بستان الرجل؟', ['أعناب ونخل', 'ورود فقط', 'حجارة'], 0], ['من الذي أهلك ثمر البستان؟', ['الله', 'الجيران', 'لا أحد'], 0]],
    mem: [18, 39] },
  { id: 'bayt', t: 'بناء الكعبة', age: '٥+', c: '#1b1b1f', cover: ['day', 'desert', 148, ['sun', 250, 44], ['kaaba', 160, 152, 1.5], ['stones', 70, 160, 1]],
    scenes: [
      ['جعل الله البيت الحرام مكاناً يرجع إليه الناس ويأمنون فيه.', [2, 125], ['day', 'desert', 148, ['sun', 56, 40], ['cloud', 250, 40], ['kaaba', 160, 152, 1.3]]],
      ['وأمر الله إبراهيم وإسماعيل عليهما السلام أن يطهّرا بيته للطائفين والعاكفين والرُّكَّع السجود.', [2, 125], ['dawn', 'desert', 148, ['sun', 260, 54], ['kaaba', 150, 152, 1.2], ['lamp', 250, 150, 1]]],
      ['ورفع إبراهيم وإسماعيل قواعد البيت، حجراً فوق حجر، وهما يعملان بصبر وتعاون.', [2, 127], ['day', 'desert', 148, ['sun', 50, 40], ['stones', 90, 158, 1.2], ['kaaba', 200, 152, .8]]],
      ['وكانا يقولان: ربّنا تقبّل منّا، إنك أنت السميع العليم.', [2, 127], ['dusk', 'desert', 148, ['sun', 260, 60], ['kaaba', 150, 152, 1.2], ['heart', 70, 130, 1], ['bird', 230, 60, 1]]],
      ['ودعا إبراهيم: ربّ اجعل هذا البلد آمناً، وارزق أهله من الثمرات.', [2, 126], ['night', 'desert', 148, ['moon', 260, 44], ['kaaba', 150, 152, 1.2], ['palm', 60, 152, .8], ['wheat', 250, 156, 1]]],
    ],
    learn: ['نبني الخير ونسأل الله أن يتقبّله منّا.', 'نتعاون في الأعمال الصالحة كما تعاون إبراهيم وإسماعيل.', 'الكعبة بيت الله، وهي قبلتنا في الصلاة.'],
    quiz: [['من رفع قواعد البيت؟', ['إبراهيم وإسماعيل', 'نوح وهود', 'موسى وهارون'], 0], ['ماذا قالا بعد البناء؟', ['ربنا تقبّل منا إنك أنت السميع العليم', 'انتهينا', 'لا شيء'], 0], ['ماذا دعا إبراهيم لهذا البلد؟', ['أن يكون آمناً ويُرزق أهله من الثمرات', 'أن يصير كبيراً فقط', 'لا شيء'], 0]],
    mem: [2, 127] },
  { id: 'nakhla', t: 'النخلة والرُّطَب', age: '٦+', c: '#b0713a', cover: ['dawn', 'desert', 150, ['sun', 250, 50], ['palm', 150, 156, 1.5], ['dates', 160, 100, 1]],
    scenes: [
      ['حملت مريم عليها السلام بأمر الله، فابتعدت إلى مكانٍ بعيد.', [19, 22], ['dusk', 'desert', 150, ['sun', 260, 60], ['mountain', 80, 150, .9], ['palm', 220, 154, .9]]],
      ['وجاءها ألم الولادة إلى جذع النخلة، فقالت: يا ليتني متّ قبل هذا!', [19, 23], ['night', 'desert', 150, ['moon', 250, 44], ['palm', 150, 156, 1.4]]],
      ['فناداها من تحتها: لا تحزني، قد جعل ربّك تحتك جدول ماء.', [19, 24], ['dawn', 'desert', 148, ['sun', 260, 54], ['palm', 100, 154, 1.2], ['spring', 220, 158, 1.4]]],
      ['وقال لها: حرّكي جذع النخلة يسقط عليك رُطباً طازجاً.', [19, 25], ['day', 'desert', 148, ['sun', 56, 40], ['palm', 150, 156, 1.5], ['dates', 148, 96, 1.1], ['dates', 168, 108, .9]]],
      ['فكُلي واشربي وطيبي نفساً، وإن رأيتِ أحداً فقولي: إني نذرتُ للرحمن صوماً فلن أكلّم اليوم إنسياً.', [19, 26], ['day', 'grass', 148, ['sun', 250, 44], ['palm', 90, 154, 1.1], ['spring', 220, 158, 1.2], ['dates', 100, 160, 1]]],
    ],
    learn: ['الله يرعى عباده ولا ينساهم وقت الشدة.', 'نأخذ بالأسباب ونتوكّل على الله، كما أُمرت بهزّ النخلة.', 'نصبر ونثق برحمة الله.'],
    quiz: [['ماذا أمرها الله أن تفعل بجذع النخلة؟', ['تهزّه فيسقط عليها رطب طازج', 'تقطعه', 'تنام تحته'], 0], ['ماذا جعل الله تحتها؟', ['جدول ماء', 'جبلاً', 'بيتاً'], 0], ['ماذا تقول إن رأت أحداً؟', ['نذرتُ للرحمن صوماً فلن أكلّم اليوم إنسياً', 'لا أعرفكم', 'تعالوا إليّ'], 0]],
    mem: [19, 25] },
  { id: 'qarnayn', t: 'ذو القرنين والسدّ', age: '٨+', c: '#6b7280', cover: ['dawn', 'hills', 146, ['sun', 250, 50], ['mountain', 60, 150, 1.1], ['wall', 170, 156, 1.2], ['mountain', 290, 150, 1.1]],
    scenes: [
      ['سأل الناس عن ذي القرنين، وكان ملكاً صالحاً مكّن الله له في الأرض وآتاه من كل شيء سبباً.', [18, 83, 84], ['day', 'hills', 146, ['sun', 56, 40], ['path', 160, 156, 1], ['mountain', 260, 150, 1]]],
      ['وسار في الأرض حتى بلغ مغرب الشمس، فقال: من ظلم فسوف نعذّبه، ومن آمن وعمل صالحاً فله الجزاء الحسن ونقول له قولاً يسيراً.', [18, 86, 88], ['dusk', 'sea', 140, ['sun', 160, 88], ['boat', 90, 150, 1], ['bird', 240, 60, 1]]],
      ['ثم بلغ بين جبلين، فوجد قوماً لا يكادون يفهمون كلاماً، فشكوا إليه فساد يأجوج ومأجوج.', [18, 93, 94], ['day', 'hills', 146, ['sun', 50, 40], ['mountain', 80, 150, 1.2], ['mountain', 250, 150, 1.2], ['path', 165, 160, 1]]],
      ['قال: ما أعطاني ربّي خيرٌ من مالكم، فأعينوني بقوّة، أجعل بينكم وبينهم سدّاً.', [18, 95], ['day', 'hills', 146, ['sun', 260, 40], ['ironbars', 120, 158, 1.2], ['ironbars', 200, 158, 1], ['mountain', 40, 150, .9]]],
      ['فجاءوا بقطع الحديد حتى ملأوا ما بين الجبلين، وأشعلوا عليه النار حتى صار أحمر، وصبّ عليه النحاس المذاب.', [18, 96], ['dusk', 'hills', 146, ['sun', 260, 60], ['mountain', 50, 150, 1], ['fire', 160, 156, .9], ['ironbars', 240, 160, 1]]],
      ['فلم يستطيعوا أن يتسلّقوه ولم يقدروا على ثقبه، فقال: هذا رحمة من ربي، فإذا جاء وعد ربي جعله مستوياً بالأرض، وكان وعد ربي حقاً.', [18, 97, 98], ['dawn', 'hills', 146, ['sun', 250, 50], ['mountain', 50, 150, 1.1], ['wall', 170, 158, 1.2], ['mountain', 290, 150, 1.1]]],
    ],
    learn: ['القوة والمال نعمة من الله نستعملها لنفع الناس.', 'نتعاون: أعينوني بقوة.', 'نقول: هذا من فضل ربي، ولا نتكبّر.'],
    quiz: [['ماذا بنى ذو القرنين؟', ['سدّاً من الحديد والنحاس', 'قصراً من الذهب', 'سفينة'], 0], ['بماذا استعان على بنائه؟', ['بقوّة الناس وعملهم', 'بالسحر', 'بلا أحد'], 0], ['ماذا قال عند اكتماله؟', ['هذا رحمة من ربي', 'أنا الأقوى', 'لا شيء'], 0]],
    mem: [18, 98] },
  { id: 'hadiqa', t: 'أصحاب الحديقة', age: '٧+', c: '#3f8a3a', cover: ['dawn', 'grass', 146, ['sun', 52, 50], ['garden', 160, 156, 1.4], ['palm', 270, 150, .9]],
    scenes: [
      ['كان لقومٍ حديقة جميلة مليئة بالثمار، وحلفوا ليقطفنّ ثمارها في الصباح الباكر، ولم يقولوا: إن شاء الله.', [68, 17, 18], ['dawn', 'grass', 146, ['sun', 56, 50], ['garden', 160, 156, 1.3], ['palm', 270, 152, .9]]],
      ['فمرّ عليها بلاء من ربّك وهم نائمون، فأصبحت كالليل المظلم.', [68, 19, 20], ['night', 'desert', 146, ['moon', 250, 44], ['darkcloud', 80, 40], ['burnt', 160, 156, 1.2]]],
      ['وفي الصباح نادى بعضهم بعضاً، ومشَوا وهم يتهامسون: لا يدخلنّها اليوم عليكم فقير.', [68, 21, 24], ['dawn', 'grass', 146, ['sun', 260, 56], ['path', 0, 0, 1], ['palm', 60, 150, .8], ['stones', 160, 160, 1]]],
      ['فلمّا رأوها قالوا: إنّا لضالّون الطريق! ثم قالوا: بل نحن محرومون.', [68, 26, 27], ['dusk', 'desert', 146, ['sun', 250, 66], ['burnt', 150, 156, 1.2], ['deadtree', 260, 156, 1]]],
      ['فقال أعدلهم: ألم أقل لكم لولا تسبّحون؟ فقالوا: سبحان ربّنا إنّا كنّا ظالمين.', [68, 28, 29], ['dawn', 'grass', 146, ['sun', 160, 60], ['lamp', 160, 150, 1.4], ['heart', 90, 130, 1]]],
      ['وتلاوموا وقالوا: يا ويلنا إنّا كنّا طاغين، عسى ربّنا أن يبدلنا خيراً منها، إنّا إلى ربّنا راغبون.', [68, 30, 32], ['day', 'grass', 146, ['sun', 56, 40], ['garden', 160, 156, 1.2], ['heart', 250, 130, 1.1]]],
    ],
    learn: ['نعطي الفقير حقّه ولا نبخل.', 'نقول: إن شاء الله، فيما نعزم عليه.', 'إذا أخطأنا نتوب ونرجع إلى الله.'],
    quiz: [['ماذا أراد أصحاب الحديقة؟', ['ألّا يعطوا الفقراء شيئاً', 'أن يوزّعوها على الناس', 'أن يبيعوها'], 0], ['ماذا قال أعدلهم؟', ['ألم أقل لكم لولا تسبّحون', 'لا بأس', 'اذهبوا'], 0], ['ماذا قالوا بعد أن رأوا الحديقة؟', ['سبحان ربنا إنا كنا ظالمين', 'لا ذنب لنا', 'سنعيد بناءها وحدنا'], 0]],
    mem: [68, 29] },
  { id: 'baqara', t: 'البقرة', age: '٨+', c: '#c58a1f', cover: ['day', 'grass', 146, ['sun', 52, 40], ['cow', 160, 158, 1.6], ['wheat', 270, 160, 1]],
    scenes: [
      ['أمر الله بني إسرائيل على لسان موسى أن يذبحوا بقرة، فظنّوا أنه يمزح، فقال: أعوذ بالله أن أكون من الجاهلين.', [2, 67], ['day', 'grass', 146, ['sun', 56, 40], ['cow', 160, 158, 1.5], ['wheat', 270, 160, 1]]],
      ['ثم أخذوا يسألون: ما هي؟ وما لونها؟ فجاءهم الوصف: بقرة صفراء شديدة الصفرة تسرّ الناظرين.', [2, 68, 69], ['dusk', 'grass', 146, ['sun', 250, 60], ['cow', 150, 158, 1.6], ['cloud', 80, 40]]],
      ['وقالوا: وإنّا إن شاء الله لمهتدون. فقيل لهم: بقرة لا تحرث الأرض ولا تسقي الزرع، سليمة لا عيب فيها.', [2, 70, 71], ['day', 'grass', 146, ['sun', 260, 40], ['cow', 150, 158, 1.5], ['wheat', 70, 160, 1], ['wheat', 250, 160, 1]]],
      ['فذبحوها وهم كادوا ألّا يفعلوا.', [2, 71], ['dawn', 'desert', 146, ['sun', 160, 60], ['cow', 150, 158, 1.5], ['stones', 250, 164, 1]]],
      ['ثم أمرهم الله أن يضربوا القتيل ببعضها، ليُريهم كيف يحيي الله الموتى، لعلّهم يعقلون.', [2, 72, 73], ['day', 'grass', 146, ['sun', 50, 40], ['heart', 160, 120, 1.4], ['palm', 70, 152, .9], ['tree', 260, 152, .9]]],
    ],
    learn: ['نطيع أمر الله بسرعة ولا نكثر الجدال والتعقيد.', 'الله قادر على إحياء الموتى.', 'نقول: إن شاء الله، فيما نريد فعله.'],
    quiz: [['بماذا أمرهم الله أن يذبحوا؟', ['بقرة', 'ناقة', 'خروفاً'], 0], ['ما لون البقرة؟', ['صفراء فاقع لونها', 'سوداء', 'بيضاء'], 0], ['ماذا أراهم الله بذلك؟', ['كيف يحيي الله الموتى', 'كيف يطير الناس', 'لا شيء'], 0]],
    mem: [2, 73] },
];
const KSURAHS = [[1, 'الفاتحة'], [112, 'الإخلاص'], [113, 'الفلق'], [114, 'الناس'], [108, 'الكوثر'], [103, 'العصر'], [105, 'الفيل'], [106, 'قريش'], [107, 'الماعون'], [110, 'النصر'], [111, 'المسد'], [109, 'الكافرون'], [97, 'القدر'], [99, 'الزلزلة'], [94, 'الشرح'], [93, 'الضحى']];
const kidsStars = () => LS.get('kids', {}) || {};
function kidsRef([s, a, b]) { const i = idxOf(s, a); return `<a class="k-ref" data-ayah="${i}">${esc(Q.surahs[s - 1].name)} ${n(a)}${b ? `<span>–${n(b)}</span>` : ''}</a>`; }
function kidsAyat([s, a, b]) { const o = []; for (let k = a; k <= (b || a); k++) { const i = idxOf(s, k); if (i >= 0) o.push(ayahHTML(i, null, false)); } return o.join(''); }
function kids(id) {
  if (id === 'quiz') return kidsChallenge();
  const st = kidsStars(), total = KIDS.reduce((t, k) => t + (st[k.id] || 0), 0);
  const story = id && KIDS.find(k => k.id === id);
  if (!story) {
    V(`<div class="stack kids">
      <section class="k-hero"><div class="k-hero-art">${KSV(['dawn', 'hills', 130, ['sun', 260, 50], ['cloud', 80, 40], ['ark', 90, 128, .55], ['palm', 300, 140, .8], ['bird', 170, 50, 1], ['bird', 200, 40, .8]])}</div>
        <div class="k-hero-tx"><span class="eyebrow">ركن الأطفال</span><h1>قصص القرآن للأطفال</h1><p class="lead">حكايات مصوّرة من القرآن الكريم، كل مشهد مرتبط بآيته. اقرأ القصة، وتعلّم منها، وأجب عن الأسئلة لتجمع النجوم.</p>
        <div class="toolbar"><a class="btn pri k-cta" href="#k-quiz">تحدّي الأسئلة</a></div><div class="k-stars" aria-label="نجومك"><span>نجومك</span><b>${'★'.repeat(Math.min(total, 10))}${total > 10 ? ' +' + n(total - 10) : ''}</b><em>${n(total)} من ${n(KIDS.length * 3)}</em></div></div></section>
      <section><div class="sec-head"><div><span class="eyebrow">${n(KIDS.length)} قصة</span><h2>اختر قصة</h2></div></div>
      <div class="k-grid">${KIDS.map((k, i) => `<a class="k-card" href="#k-${k.id}" style="--kc:${k.c}"><span class="k-art">${KSV(k.cover)}</span><span class="k-meta"><span class="k-num">${n(i + 1)}</span><b>${k.t}</b><small>${n(k.scenes.length)} مشاهد · العمر ${k.age}</small><span class="k-st" aria-label="النجوم">${'★'.repeat(st[k.id] || 0)}${'☆'.repeat(3 - (st[k.id] || 0))}</span></span></a>`).join('')}</div></section>
      <section class="panel stack tight"><div class="sec-head"><div><span class="eyebrow">احفظ مع مشكاة</span><h2>سور قصيرة للحفظ</h2></div><a class="btn" href="#hifz">الحفظ والتسميع</a></div>
        <p class="muted small">ابدأ بالسور القصيرة، واقرأها مع والديك، ثم سمّعها في صفحة الحفظ.</p>
        <div class="k-surahs">${KSURAHS.map(([s, nm]) => `<a class="chip" href="#s${s}">سورة ${nm}</a>`).join('')}</div></section>
      <section class="panel stack tight k-parents"><h3>للآباء والمربّين</h3>
        <ul><li>السرد مبسّط من نص الآيات وتفسير الميسّر، ونص كل آية يظهر كما في المصحف، وتفتح تفسيرها بلمسة على رقمها.</li><li>الرسوم أصلية، تصوّر الطبيعة والحيوانات والأشياء فقط، ولا تصوّر الأنبياء ولا الملائكة ولا أحداً من الصحابة.</li><li>اقرأ القصة مع طفلك، واسأله عمّا تعلّم، ثم احفظا معاً آية القصة.</li><li>للتوسع في القصص للكبار: <a href="#t-qasas">قصص القرآن الموسّعة</a> بنقول ابن كثير والطبري والقرطبي.</li></ul></section>
    </div>`);
    return;
  }
  const qs = story.quiz; const ix = KIDS.indexOf(story), nx = KIDS[(ix + 1) % KIDS.length];
  V(`<div class="stack kids k-story" style="--kc:${story.c}">
    <nav class="crumbs"><a href="#kids">ركن الأطفال</a> › <span>${story.t}</span></nav>
    <header class="k-head"><span class="k-art big">${KSV(story.cover)}</span><div><span class="eyebrow">قصة من القرآن · العمر ${story.age}</span><h1>${story.t}</h1></div></header>
    <ol class="k-scenes">${story.scenes.map(([tx, r, art], i) => `<li class="k-scene"><span class="k-art">${KSV(art)}</span><div class="k-tx"><span class="k-sn">المشهد ${n(i + 1)}</span><p>${esc(tx)}</p>
      <details class="k-ayah"><summary>اقرأ الآية: ${kidsRef(r)}</summary><div class="k-ay">${kidsAyat(r)}</div></details></div></li>`).join('')}</ol>
    <section class="panel k-learn"><h2>ماذا تعلّمنا؟</h2><ul>${story.learn.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>
    <section class="panel k-quiz" id="kquiz"><h2>أسئلة القصة</h2><p class="muted small">اختر الجواب الصحيح، ولكل جواب صحيح من المحاولة الأولى نجمة.</p>
      ${qs.map(([q, ops], qi) => { const ord = ops.map((o, k) => [o, k]).sort((a, b) => ((a[1] * 7 + qi * 3) % 5) - ((b[1] * 7 + qi * 3) % 5)); return `<fieldset class="k-q" data-q="${qi}"><legend>${n(qi + 1)}. ${esc(q)}</legend>${ord.map(([o, k]) => `<button type="button" class="k-op" data-k="${k}">${esc(o)}</button>`).join('')}<span class="k-fb" aria-live="polite"></span></fieldset>`; }).join('')}
      <div class="k-score" id="kscore" hidden></div></section>
    <section class="panel k-mem"><h2>احفظ آية القصة</h2>${kidsAyat(story.mem)}<div class="toolbar">${kidsRef(story.mem)}<a class="btn" href="#a${story.mem[0]}-${story.mem[1]}">في سياقها من المصحف</a></div></section>
    <a class="k-next" href="#k-${nx.id}" style="--kc:${nx.c}"><span class="k-art">${KSV(nx.cover)}</span><span><small>القصة التالية</small><b>${nx.t}</b></span><i aria-hidden="true">←</i></a>
  </div>`);
  const got = new Set();
  $$('.k-q').forEach(f => f.querySelectorAll('.k-op').forEach(b => b.onclick = () => {
    if (f.dataset.done) return; const qi = +f.dataset.q, right = qs[qi][2] === +b.dataset.k;
    b.classList.add(right ? 'ok' : 'no'); const fb = f.querySelector('.k-fb');
    if (right) { f.dataset.done = 1; if (!f.dataset.miss) got.add(qi); fb.textContent = 'أحسنت! ★'; f.querySelectorAll('.k-op').forEach(x => x.disabled = true); }
    else { f.dataset.miss = 1; fb.textContent = 'حاول مرة أخرى'; }
    if ([...$$('.k-q')].every(x => x.dataset.done)) { const all = kidsStars(); all[story.id] = Math.max(all[story.id] || 0, got.size); LS.set('kids', all); const sc = $('#kscore'); sc.hidden = false; sc.innerHTML = `<b>${'★'.repeat(got.size)}${'☆'.repeat(3 - got.size)}</b> ${got.size === 3 ? 'ما شاء الله! أجبت عن كل الأسئلة من أول مرة.' : 'أحسنت! أعد قراءة القصة وحاول مرة أخرى لتجمع كل النجوم.'}`; }
  }));
}


/* تحدّي الأسئلة: عشرة أسئلة عشوائية من كل القصص، ولكل جواب صحيح من المحاولة الأولى نقطة */
function kidsChallenge() {
  const pool = []; KIDS.forEach(k => k.quiz.forEach(([q, ops, c]) => pool.push({ q, ops, c, st: k.t, col: k.c })));
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const qs = pool.slice(0, 10), best = +(LS.get('kidsq', 0) || 0);
  V(`<div class="stack kids k-story" style="--kc:#2e86c1">
    <nav class="crumbs"><a href="#kids">ركن الأطفال</a> › <span>تحدّي الأسئلة</span></nav>
    <header class="k-head"><div><span class="eyebrow">تحدّي الأسئلة</span><h1>هل تذكر القصص؟</h1><p class="lead">عشرة أسئلة من كل قصص الركن. اختر الجواب الصحيح، ولكل جواب صحيح من المحاولة الأولى نقطة.</p><p class="muted small">أفضل نتيجة لك: ${n(best)} من ${n(10)}</p></div></header>
    <section class="panel k-quiz" id="kquiz">${qs.map((o, qi) => {
      const ord = o.ops.map((t, k) => [t, k]).sort(() => Math.random() - .5);
      return `<fieldset class="k-q" data-q="${qi}"><legend>${n(qi + 1)}. ${esc(o.q)} <span class="k-from" style="--kc:${o.col}">${esc(o.st)}</span></legend>${ord.map(([t, k]) => `<button type="button" class="k-op" data-k="${k}">${esc(t)}</button>`).join('')}<span class="k-fb" aria-live="polite"></span></fieldset>`;
    }).join('')}<div class="k-score" id="kscore" hidden></div></section>
    <div class="toolbar"><a class="btn" href="#kids">رجوع إلى القصص</a><button type="button" class="btn k-again" id="kagain" hidden>جولة جديدة</button></div>
  </div>`);
  const got = new Set();
  $$('.k-q').forEach(f => f.querySelectorAll('.k-op').forEach(b => b.onclick = () => {
    if (f.dataset.done) return; const qi = +f.dataset.q, right = qs[qi].c === +b.dataset.k;
    b.classList.add(right ? 'ok' : 'no'); const fb = f.querySelector('.k-fb');
    if (right) { f.dataset.done = 1; if (!f.dataset.miss) got.add(qi); fb.textContent = 'أحسنت! ★'; f.querySelectorAll('.k-op').forEach(x => x.disabled = true); }
    else { f.dataset.miss = 1; fb.textContent = 'حاول مرة أخرى'; }
    if ([...$$('.k-q')].every(x => x.dataset.done)) {
      const sc = got.size; if (sc > best) LS.set('kidsq', sc);
      const el = $('#kscore'); el.hidden = false;
      el.innerHTML = `<b>${n(sc)} من ${n(10)}</b> ${sc === 10 ? 'ما شاء الله! نتيجة كاملة.' : sc >= 7 ? 'أحسنت! أنت تحفظ القصص جيداً.' : 'أحسنت! أعد قراءة القصص وحاول مرة أخرى.'}`;
      $('#kagain').hidden = false;
    }
  }));
  const again = $('#kagain'); if (again) again.onclick = () => kidsChallenge();
}


/* ================= علوم القرآن: أبواب مسلسلة مفهرسة، لكل باب تمهيد موجز ومراجعه، وشواهده من الآيات بنصها، وتفسيرها من الميسّر بنصه، ونقل بلفظه من كتب التفسير المضمّنة */
const ULUM = [
  { id: 'nuzul', t: 'نزول القرآن وكيفيته', ref: 'الإتقان للسيوطي، النوع السادس عشر: في كيفية إنزاله؛ مباحث في علوم القرآن لمناع القطان، مبحث نزول القرآن',
    intro: 'نزل القرآن الكريم على النبي ﷺ من عند الله بواسطة جبريل عليه السلام. وتدل الآيات على أن ابتداء نزوله كان في شهر رمضان في ليلة القدر، ثم نزل مفرّقاً على حسب الوقائع في نحو ثلاث وعشرين سنة، ليثبّت الله به فؤاد النبي ﷺ، ويُقرأ على الناس على مُكث.',
    pts: ['ابتداء النزول في رمضان، في ليلة مباركة هي ليلة القدر.', 'نزل منجّماً (مفرّقاً) لا جملة واحدة، وذكر العلماء من حِكمه تثبيت قلب النبي ﷺ وتيسير الحفظ والفهم والتدرج في التشريع.', 'الواسطة في النزول جبريل عليه السلام، الروح الأمين.'],
    ev: [[2, 185, 'ليلة القدر'], [97, 1, 'جملة'], [44, 3, 'ليلة القدر'], [17, 106, 'مفرقا/نجوما/فرقناه/شيئا بعد شيء'], [25, 32, 'جملة'], [26, 193, 'هو جبريل/جبريل']] },
  { id: 'awwal', t: 'أول ما نزل وآخر ما نزل', ref: 'الإتقان للسيوطي، النوع السابع: معرفة أول ما نزل، والنوع الثامن: معرفة آخر ما نزل',
    intro: 'اعتنى العلماء بمعرفة أول ما نزل من القرآن وآخره، لما فيه من معرفة تاريخ التشريع وتدرّجه، وتمييز الناسخ من المنسوخ. والأصح أن أول ما نزل صدر سورة العلق، ثم نزل صدر سورة المدثر بعد فترة الوحي. واختلفوا في آخر ما نزل على أقوال، منها آية «واتقوا يوماً ترجعون فيه إلى الله».',
    pts: ['أول ما نزل على الإطلاق: «اقرأ باسم ربك الذي خلق» إلى قوله: «علّم الإنسان ما لم يعلم».', 'بعد فترة الوحي نزل صدر سورة المدثر.', 'في آخر ما نزل أقوال، ولا يُرفع منها قول إلى النبي ﷺ صريحاً، وإنما هو اجتهاد الصحابة بحسب ما علم كل منهم.'],
    ev: [[96, 1, 'أول شيء نزل/أول ما نزل'], [74, 1, 'أول ما نزل/أول شيء نزل'], [2, 281, 'آخر آية/آخر ما نزل'], [5, 3, 'يوم عرفة/عرفة']] },
  { id: 'makki', t: 'المكي والمدني', ref: 'الإتقان للسيوطي، النوع الأول: معرفة المكي والمدني؛ البرهان في علوم القرآن للزركشي، النوع التاسع',
    intro: 'المشهور عند العلماء أن المكي ما نزل قبل الهجرة، والمدني ما نزل بعدها، ولو نزل بمكة. ويُعرف ذلك بالنقل عن الصحابة والتابعين، لا بالاجتهاد وحده. ومن فوائده معرفة الناسخ والمنسوخ، وتاريخ التشريع، وأسلوب الدعوة في كل مرحلة.',
    pts: ['يغلب على المكي: الدعوة إلى التوحيد والبعث، وقصص الأنبياء، وقِصر الآيات، والخطاب بـ«يا أيها الناس».', 'يغلب على المدني: تفصيل الأحكام والحدود والجهاد، وذكر أهل الكتاب والمنافقين، والخطاب بـ«يا أيها الذين آمنوا».', 'في عدد من السور خلاف بين العلماء في كونها مكية أو مدنية، وفي بعض السور آيات مستثناة.'],
    ev: [[6, 1, 'مكية'], [2, 1, 'مدنية'], [55, 1, 'مكية'], [13, 1, 'مدنية']] },
  { id: 'asbab', t: 'أسباب النزول', ref: 'الإتقان للسيوطي، النوع التاسع: معرفة سبب النزول؛ أسباب النزول للواحدي؛ لباب النقول للسيوطي',
    intro: 'سبب النزول: ما نزلت الآية أو الآيات متحدثة عنه أو مبيّنة لحكمه أيام وقوعه، من حادثة أو سؤال. ولا طريق لمعرفته إلا النقل الصحيح عمّن شاهد التنزيل. ومعرفته تعين على فهم الآية ودفع الإشكال عنها، والعبرة بعموم اللفظ لا بخصوص السبب عند جمهور العلماء.',
    pts: ['لا يُعرف سبب النزول بالرأي، وإنما بالرواية الصحيحة عن الصحابة.', 'قد يتعدد السبب والنازل واحد، وقد تنزل آيات متعددة في سبب واحد.', 'العبرة بعموم اللفظ لا بخصوص السبب، فيشمل الحكم كل من كانت حاله كحال من نزلت فيه.'],
    ev: [[2, 189, 'نزلت'], [58, 1, 'خولة/نزلت'], [80, 1, 'ابن أم مكتوم'], [93, 3, 'نزلت'], [24, 11, 'الإفك/نزلت']] },
  { id: 'jam', t: 'جمع القرآن وتدوينه', ref: 'الإتقان للسيوطي، النوع الثامن عشر: في جمعه وترتيبه؛ المرشد الوجيز لأبي شامة',
    intro: 'جُمع القرآن ثلاث مرات: في عهد النبي ﷺ حفظاً في الصدور وكتابة في الرقاع والعُسب واللخاف، ثم في عهد أبي بكر الصديق رضي الله عنه في صحف مجموعة بعد استشهاد كثير من القرّاء يوم اليمامة، ثم في عهد عثمان بن عفان رضي الله عنه نسخاً للمصاحف على حرف قريش وإرسالها إلى الأمصار. وقد تكفّل الله بحفظه.',
    pts: ['الجمع الأول في عهد النبي ﷺ: حفظ في الصدور وكتابة متفرقة بين يديه.', 'الجمع الثاني في عهد أبي بكر: جمع ما كُتب في صحف واحدة بإشارة عمر، وتولاه زيد بن ثابت.', 'الجمع الثالث في عهد عثمان: نسخ المصاحف وتوحيد الناس عليها، ومنه رسم المصحف العثماني الذي يُكتب به المصحف اليوم.'],
    ev: [[15, 9, 'لحافظون'], [75, 17, 'جمعه'], [56, 78, 'مكنون'], [98, 2, 'مطهرة/صحف']] },
  { id: 'qiraat', t: 'القراءات والأحرف السبعة', ref: 'الإتقان للسيوطي، النوع السادس عشر (المسألة في الأحرف السبعة) والأنواع من الثاني والعشرين إلى السابع والعشرين في أقسام القراءات؛ النشر في القراءات العشر لابن الجزري',
    intro: 'ثبت في الصحيحين أن النبي ﷺ قال: «إن هذا القرآن أُنزل على سبعة أحرف فاقرؤوا ما تيسّر منه». واختلف العلماء في المراد بالأحرف السبعة على أقوال كثيرة. أما القراءات فهي وجوه أداء ألفاظ القرآن المنقولة بالسند إلى النبي ﷺ، وضابط القراءة المقبولة عند ابن الجزري: صحة السند، وموافقة رسم أحد المصاحف العثمانية ولو احتمالاً، وموافقة العربية ولو بوجه.',
    pts: ['الأحرف السبعة رخصة وتيسير على الأمة في القراءة، وهي غير القراءات السبع المشهورة.', 'القراءات العشر متواترة عند جمهور العلماء، ورواية حفص عن عاصم هي الأشيع اليوم، وهي رواية المصحف في مشكاة.', 'ما فقد ركناً من أركان القبول الثلاثة فهو شاذ لا يُقرأ به في الصلاة.'],
    ev: [[73, 4, 'ترتيلا/رتل/الترتيل/تمهل'], [54, 17, 'يسرنا'], [75, 18, 'قرأناه/قراءته']] },
  { id: 'rasm', t: 'رسم المصحف وضبطه', ref: 'الإتقان للسيوطي، النوع السادس والسبعون: في مرسوم الخط وآداب كتابته؛ المقنع في رسم مصاحف الأمصار لأبي عمرو الداني',
    intro: 'الرسم العثماني هو الطريقة التي كُتبت بها المصاحف في عهد عثمان رضي الله عنه، وفيه حذف وزيادة وإبدال ووصل وفصل يخالف قواعد الإملاء المعتادة أحياناً. والجمهور على وجوب التزامه في كتابة المصحف. أما الضبط (النقط والشكل) فأُضيف بعد ذلك تيسيراً للقراءة الصحيحة.',
    pts: ['الرسم توقيفي أو كالتوقيفي عند الجمهور، فلا يُغيَّر المصحف إلى الإملاء الحديث.', 'من حِكم الرسم احتماله لأكثر من قراءة صحيحة في الكلمة الواحدة.', 'بدأ أبو الأسود الدؤلي بنقط الإعراب حفظاً للسان من اللحن، ثم أضاف نصر بن عاصم ويحيى بن يعمر نقط الإعجام، ثم وضع الخليل بن أحمد الشكل المعروف اليوم.'],
    ev: [[1, 4, 'مالك/ملك'], [96, 4, 'بالقلم'], [68, 1, 'القلم']] },
  { id: 'naskh', t: 'الناسخ والمنسوخ', ref: 'الإتقان للسيوطي، النوع السابع والأربعون: في ناسخه ومنسوخه؛ الناسخ والمنسوخ لأبي جعفر النحاس',
    intro: 'النسخ: رفع حكم شرعي بدليل شرعي متأخر عنه. وهو واقع في القرآن عند جمهور العلماء، ومن حِكمه التدرّج في التشريع ومراعاة مصالح العباد. ولا يثبت النسخ بالاحتمال، بل بنص أو إجماع أو معرفة التاريخ مع تعذّر الجمع.',
    pts: ['لا نسخ في الأخبار والعقائد، وإنما في الأحكام العملية.', 'من أمثلته المشهورة: تحويل القبلة من بيت المقدس إلى الكعبة، والتدرّج في تحريم الخمر.', 'إذا أمكن الجمع بين الآيتين فلا يُصار إلى النسخ.'],
    ev: [[2, 106, 'النسخ/ننسخ'], [2, 144, 'القبلة/بيت المقدس'], [5, 90, 'الخمر/تحريم']] },
  { id: 'muhkam', t: 'المحكم والمتشابه', ref: 'الإتقان للسيوطي، النوع الثالث والأربعون: في المحكم والمتشابه؛ البرهان للزركشي',
    intro: 'وصف الله القرآن كله بأنه محكم بمعنى الإتقان، وكله متشابه بمعنى أنه يشبه بعضه بعضاً في الحسن والصدق. وفي آية آل عمران قسّمه إلى آيات محكمات هن أم الكتاب، وأُخر متشابهات. والراسخون في العلم يردّون المتشابه إلى المحكم، ويقولون: آمنا به كلٌّ من عند ربنا.',
    pts: ['المحكم: ما اتضح معناه ولم يحتمل إلا وجهاً واحداً، والمتشابه: ما احتمل أوجهاً أو خفي معناه.', 'طريقة الراسخين ردّ المتشابه إلى المحكم، وطريقة أهل الزيغ اتباع المتشابه ابتغاء الفتنة.', 'اختلف العلماء في الوقف على لفظ الجلالة في قوله «وما يعلم تأويله إلا الله» أو وصله بما بعده.'],
    ev: [[3, 7, 'المحكم/المتشابه/الراسخون'], [11, 1, 'أحكمت'], [39, 23, 'متشابها']] },
  { id: 'amm', t: 'العام والخاص', ref: 'الإتقان للسيوطي، النوع الخامس والأربعون: في عامه وخاصه؛ البرهان للزركشي',
    intro: 'العام: اللفظ المستغرق لجميع ما يصلح له دفعة واحدة، والخاص: ما دلّ على بعض أفراده. والتخصيص: قصر العام على بعض أفراده بدليل، وقد يكون المخصِّص متصلاً بالآية كالاستثناء والشرط، أو منفصلاً في آية أخرى أو في السنة.',
    pts: ['من صيغ العموم: «كل» و«جميع» والأسماء الموصولة وأسماء الشرط والنكرة في سياق النفي والجمع المعرّف بأل.', 'مثال المخصِّص المتصل: الاستثناء في قوله «إن الإنسان لفي خسر إلا الذين آمنوا».', 'مثال المخصِّص المنفصل: عموم «والمطلقات يتربصن» خصّته آية الحوامل «وأولات الأحمال أجلهن أن يضعن حملهن».'],
    ev: [[103, 2, 'الإنسان/الاستثناء'], [2, 228, 'المطلقات/عام'], [65, 4, 'الحامل/الأحمال']] },
  { id: 'mutlaq', t: 'المطلق والمقيد', ref: 'الإتقان للسيوطي، النوع التاسع والأربعون: في مطلقه ومقيده؛ البرهان للزركشي',
    intro: 'المطلق: اللفظ الدالّ على فرد شائع في جنسه دون قيد، مثل «رقبة». والمقيد: ما قُيّد بوصف أو شرط يقلّل شيوعه، مثل «رقبة مؤمنة». وإذا ورد اللفظ مطلقاً في موضع ومقيداً في آخر، نظر العلماء: هل يُحمل المطلق على المقيد أم يُعمل بكلٍّ في موضعه؟',
    pts: ['إذا اتحد الحكم والسبب حُمل المطلق على المقيد باتفاق، كالدم: أُطلق في آية المائدة وقُيّد بالمسفوح في آية الأنعام.', 'إذا اختلف الحكم والسبب معاً فلا حمل، ويُعمل بكلٍّ في موضعه.', 'إذا اتحد الحكم واختلف السبب ففيه خلاف مشهور، كالرقبة في كفارة القتل قُيّدت بالإيمان وأُطلقت في كفارة الظهار: فحملها الشافعية والمالكية على المقيد، ولم يحملها الحنفية.'],
    ev: [[4, 92, 'مؤمنة/الرقبة'], [58, 3, 'مؤمنة/رقبة'], [6, 145, 'مسفوحا/المسفوح']] },
  { id: 'mantuq', t: 'المنطوق والمفهوم', ref: 'الإتقان للسيوطي، النوع الخمسون: في منطوقه ومفهومه؛ البرهان للزركشي',
    intro: 'المنطوق: ما دلّ عليه اللفظ في محل النطق. والمفهوم: ما دلّ عليه اللفظ لا في محل النطق. وهو نوعان: مفهوم موافقة يكون فيه المسكوت عنه موافقاً للمنطوق في الحكم أو أولى منه، ومفهوم مخالفة يكون فيه المسكوت عنه مخالفاً له.',
    pts: ['مثال مفهوم الموافقة: النهي عن قول «أف» للوالدين يدل بالأولى على تحريم ضربهما وشتمهما.', 'مثال مفهوم المخالفة: الأمر بالتثبت في خبر الفاسق يُفهم منه قبول خبر العدل الثقة.', 'لا يُعمل بمفهوم المخالفة إذا خرج القيد مخرج الغالب، كقوله «وربائبكم اللاتي في حجوركم»، فالربيبة تحرم وإن لم تكن في الحجر عند الجمهور.'],
    ev: [[17, 23, 'التأفيف/الضرب'], [49, 6, 'خبر الواحد/التثبت'], [4, 23, 'حجوركم/الغالب']] },
  { id: 'amthal', t: 'أمثال القرآن', ref: 'الإتقان للسيوطي، النوع السادس والستون: في أمثاله؛ أمثال القرآن لابن القيم',
    intro: 'ضرب الله في القرآن الأمثال ليقرّب المعاني المعقولة بصور محسوسة، ويحثّ على التفكر والاعتبار. وجعل فهمها علامة على العلم فقال: «وتلك الأمثال نضربها للناس وما يعقلها إلا العالمون».',
    pts: ['من الأمثال ما هو مصرّح فيه بلفظ المثل أو التشبيه، كمثل المنافقين بالذي استوقد ناراً.', 'ومنها أمثال كامنة تُفهم من المعنى دون لفظ المثل، وجمل جرت مجرى الأمثال على الألسنة.', 'من فوائدها: التذكير والوعظ، والحث والزجر، وتقرير المراد في العقل وتصويره في صورة المحسوس.'],
    ev: [[29, 43, 'الأمثال/العالمون'], [14, 24, 'النخلة/طيبة'], [2, 17, 'استوقد/مثل']] },
  { id: 'aqsam', t: 'أقسام القرآن', ref: 'الإتقان للسيوطي، النوع السابع والستون: في أقسامه؛ التبيان في أقسام القرآن لابن القيم',
    intro: 'القسم في القرآن لتأكيد الخبر وتقريره في النفوس. وأركانه: المقسَم به، والمقسَم عليه، وأداة القسم (الواو والباء والتاء). وأقسم الله بذاته في مواضع، وأقسم بمخلوقاته لعظمتها ودلالتها عليه.',
    pts: ['لله أن يقسم بما شاء من خلقه، أما المخلوق فلا يقسم إلا بالله.', 'أكثر ما يُقسَم عليه في القرآن: التوحيد، وصدق الرسول ﷺ والقرآن، والجزاء والبعث، وأحوال الإنسان.', 'في قوله «لا أقسم» قولان مشهوران: أن «لا» صلة لتأكيد القسم، أو أنها ردّ لكلام سابق ثم يبدأ القسم، وذهب السعدي إلى أنها للاستفتاح والاهتمام بالمقسم عليه.'],
    ev: [[51, 23, 'أقسم/لحق'], [95, 1, 'أقسم/التين'], [75, 1, 'زائدة/صلة']] },
  { id: 'jadal', t: 'جدل القرآن', ref: 'الإتقان للسيوطي، النوع الثامن والستون: في جدل القرآن؛ البرهان للزركشي',
    intro: 'اشتمل القرآن على أقوى الحجج في إثبات التوحيد والنبوة والبعث، بأسلوب يفهمه العامة ويقنع الخاصة. وأمر الله بالجدال بالتي هي أحسن، وذكر مناظرات الأنبياء لأقوامهم.',
    pts: ['من طرقه: الاستدلال بالبدء على الإعادة، كقوله «قل يحييها الذي أنشأها أول مرة».', 'ومنها دليل التمانع في إثبات الوحدانية: «لو كان فيهما آلهة إلا الله لفسدتا».', 'ومنها إلزام الخصم بما يعجز عنه، كقول إبراهيم عليه السلام: «فإن الله يأتي بالشمس من المشرق فأت بها من المغرب».'],
    ev: [[36, 79, 'أنشأها/الإعادة'], [21, 22, 'لفسدتا/التمانع'], [2, 258, 'المشرق/حاج']] },
  { id: 'mujmal', t: 'المجمل والمبين', ref: 'الإتقان للسيوطي، النوع السادس والأربعون: في مجمله ومبينه؛ البرهان للزركشي',
    intro: 'المجمل: ما لم تتضح دلالته على المراد منه، فيحتاج إلى بيان. والمبين: ما اتضحت دلالته بنفسه أو بغيره. ويقع البيان بالقرآن نفسه، أو بالسنة، فقد قال تعالى: «وأنزلنا إليك الذكر لتبين للناس ما نزل إليهم».',
    pts: ['من المجمل الذي بيّنته السنة: الأمر بإقامة الصلاة وإيتاء الزكاة، فبيّن النبي ﷺ أوقاتها وعددها ومقاديرها.', 'وقد يقع البيان في الآية نفسها، كقوله «من الفجر» بعد «الخيط الأبيض من الخيط الأسود»، وفيه حديث عدي بن حاتم في الصحيحين.', 'لا يجوز تأخير البيان عن وقت الحاجة إلى العمل عند جمهور الأصوليين.'],
    ev: [[16, 44, 'لتبين/البيان'], [2, 187, 'عدي بن حاتم/الخيط الأبيض'], [6, 141, 'حقه/الزكاة']] },
  { id: 'qasas', t: 'قصص القرآن', ref: 'البرهان للزركشي؛ مباحث في علوم القرآن لمناع القطان، باب قصص القرآن',
    intro: 'قصص القرآن أخبار صادقة عن الأمم الماضية والأنبياء والحوادث، سيقت للعبرة لا للتسلية. وسمّاها الله أحسن القصص، وجعل فيها تثبيتاً لفؤاد النبي ﷺ وذكرى للمؤمنين.',
    pts: ['أنواعها: قصص الأنبياء مع أقوامهم، وقصص حوادث وأشخاص غير الأنبياء كأصحاب الكهف وذي القرنين، وحوادث في زمن النبي ﷺ كبدر وأحد.', 'تكرار القصة في القرآن يأتي في كل موضع بفائدة جديدة وسياق مختلف، وفيه بيان البلاغة وتقرير العبرة.', 'من مقاصدها: تقرير التوحيد، وتصديق الأنبياء، والتسلية والتثبيت، والعبرة بعاقبة المكذبين. وقصص الأنبياء مفصّلة في «قصص القرآن» من الموسوعة الموضوعية.'],
    ev: [[12, 3, 'أحسن القصص'], [12, 111, 'عبرة'], [11, 120, 'فؤادك/نثبت']] },
  { id: 'ijazq', t: 'إعجاز القرآن', ref: 'الإتقان للسيوطي، النوع الرابع والستون: في إعجاز القرآن؛ دلائل الإعجاز لعبد القاهر الجرجاني',
    intro: 'تحدّى الله العرب، وهم أهل الفصاحة، أن يأتوا بمثل القرآن، ثم بعشر سور مثله، ثم بسورة واحدة، فعجزوا. وهذا العجز دليل على أنه كلام الله، وأنه المعجزة الباقية للنبي ﷺ.',
    pts: ['مراحل التحدي: بمثل القرآن كله، ثم بعشر سور، ثم بسورة واحدة، وأُخبروا أنهم لن يفعلوا.', 'من وجوه الإعجاز التي ذكرها العلماء: النظم والبلاغة، والإخبار بالغيب، والتشريع المحكم، وسلامته من الاختلاف والتناقض.', 'وأما ما يُعرف بالإعجاز العلمي فله ضوابط عند العلماء، وتفصيله في قسم «الإعجاز العلمي».'],
    ev: [[17, 88, 'بمثله/الإنس والجن'], [11, 13, 'عشر سور'], [2, 23, 'بسورة/تحداهم']] },
  { id: 'tafsir', t: 'التفسير ومناهجه وطبقات المفسرين', ref: 'الإتقان للسيوطي، النوع السابع والسبعون: في معرفة تفسيره وتأويله، والنوع الثمانون: في طبقات المفسرين؛ مقدمة في أصول التفسير لابن تيمية',
    intro: 'التفسير: بيان معاني القرآن والكشف عن مراد الله بقدر الطاقة البشرية. وقد أمر الله بتدبر كتابه، ووضع العلماء له أصولاً: أحسن طرقه تفسير القرآن بالقرآن، ثم بالسنة، ثم بأقوال الصحابة، ثم بأقوال التابعين، ثم بمقتضى لغة العرب.',
    pts: ['التفسير بالمأثور: ما نُقل عن القرآن والسنة والصحابة والتابعين، والتفسير بالرأي: الاجتهاد المنضبط بأصول اللغة والشرع، أما الرأي المجرد عن الدليل فمذموم.', 'من أشهر مفسري الصحابة: ابن عباس، وابن مسعود، وأُبيّ بن كعب، وعلي بن أبي طالب رضي الله عنهم. ومن التابعين: مجاهد، وعكرمة، وسعيد بن جبير، وقتادة، والحسن البصري.', 'ثم جاءت كتب التفسير الجامعة، ومن أعظمها تفسير الطبري، ثم القرطبي، وابن كثير، والبغوي، وهي مضمّنة في مشكاة.'],
    ev: [[38, 29, 'ليدبروا/التدبر'], [4, 82, 'التدبر/اختلافا'], [47, 24, 'أقفالها']] },
  { id: 'adab', t: 'آداب التلاوة وحملة القرآن', ref: 'الإتقان للسيوطي، النوع الخامس والثلاثون: في آداب تلاوته وتاليه؛ التبيان في آداب حملة القرآن للنووي',
    intro: 'لتلاوة القرآن آداب ظاهرة وباطنة، تجمع بين تعظيم كلام الله وتدبره والعمل به. ومن أعظمها: الإخلاص، والطهارة، والاستعاذة، والترتيل، وحضور القلب.',
    pts: ['يُستحب أن يقرأ على طهارة، مستقبلاً القبلة، في مكان نظيف، وأن يستعيذ قبل القراءة.', 'الترتيل والتأني مع التدبر أفضل من الإسراع، والبكاء والخشوع عند القراءة من صفات العلماء.', 'يُسنّ سجود التلاوة عند آيات السجدة، وألا يُقطع حديث القرآن بكلام الناس لغير حاجة.'],
    ev: [[16, 98, 'الاستعاذة/أعوذ'], [17, 109, 'يبكون/البكاء'], [56, 79, 'المطهرون/طاهر']] },
];
const ULUM_BOOKS = ['qurtubi', 'ibnkathir', 'tabari', 'baghawi', 'saadi'];
function ulumExcerpt(t, kw) {
  const s = String(t || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); if (!s) return '';
  const DI = /[\u064B-\u0652\u0670\u0640]/; let pl = '', pos = []; for (let i = 0; i < s.length; i++) if (!DI.test(s[i])) { pl += s[i]; pos.push(i); }
  const k0 = String(kw).replace(/[\u064B-\u0652\u0670\u0640]/g, ''); const f = pl.indexOf(k0); if (f < 0) return ''; const at = pos[f];
  let a = Math.max(s.lastIndexOf('.', at), s.lastIndexOf('،', Math.max(0, at - 160)), at - 260); a = a < 0 ? 0 : a + 1;
  let b = s.indexOf('.', at + kw.length); if (b < 0 || b - at > 420) b = Math.min(s.length, at + 360);
  return (a > 0 ? '… ' : '') + s.slice(a, b + 1).trim() + (b + 1 < s.length ? ' …' : '');
}
async function ulumEvidence(el) {
  const [s, a, kw] = el.dataset.ev.split('|'); const S = +s, A = +a;
  let mu = '', q = null;
  try { mu = (await tafsir('muyassar', S))[A] || ''; } catch (e) {}
  for (const w of kw.split('/')) { for (const k of ULUM_BOOKS) { try { const t = (await tafsir(k, S))[A]; const x = ulumExcerpt(t, w); if (x) { q = [k, x]; break; } } catch (e) {} } if (q) break; }
  const bk = q && TF.find(b => b.key === q[0]);
  el.innerHTML = (mu ? `<p class="u-mu"><b>التفسير الميسر:</b> <span class="notranslate">${esc(String(mu).replace(/<[^>]+>/g, ''))}</span></p>` : '') +
    (q ? `<figure class="qs-quote u-q"><blockquote class="notranslate">${esc(q[1])}</blockquote><figcaption><b>${esc(bk.title)}</b> · <span>عند تفسير</span> <span>${esc(ref(idxOf(S, A)))}</span></figcaption></figure>` : '');
}
/* بيانات WAZIFA في mods/wazifa.js: تُحمَّل عند أول فتح للقسم */
/* ================= وظيفة الإنسان في القرآن الكريم (#wazifa)
   الآيات من المصحف المضمّن، والتفسير الميسر ونقول المفسرين بلفظها من data/t،
   ونصوص الأحاديث مقتطعة بلفظها من الكتب الستة المضمّنة (data/hadith) بترقيمها. */
function wazifa() {
  if (!needMod('wazifa')) return;
  const Z = WAZIFA, enOn = LANG !== 'ar', bk = k => (HAD_BOOKS[k] || [k])[0];
  const dig = k => LANG === 'ar' ? String(k).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : k;
  const ays = ([s, a, b]) => { const o = [], last = Math.min(b || a, a + 9); for (let q = a; q <= last; q++) { const i = idxOf(s, q); if (i >= 0) o.push(ayahHTML(i, null, false)); } if ((b || a) > last) o.push(`<a class="btn th-more" href="#a${s}-${last + 1}">أكمل الآيات في المصحف</a>`); return o.join(''); };
  const ayCard = ([t, r, kw, nt]) => `<article class="wz-ay"><h4>${t}</h4><div class="u-ref">${refLink(idxOf(r[0], r[1]))}${r[2] ? `<span>–${n(r[2])}</span>` : ''}</div>
    <div class="th-ay">${ays(r)}</div><p class="wz-note">${esc(nt)}</p>
    <details class="wz-tf"><summary>التفسير</summary><div class="u-tf" data-ev="${r[0]}|${r[1]}|${esc(kw)}"><p class="muted small">جارٍ تحميل التفسير…</p></div></details></article>`;
  const hCard = h => `<article class="wz-h" id="wzh-${h.id}"><h4>${h.t}</h4>
    <blockquote class="wz-matn notranslate" translate="no" lang="ar" dir="rtl">${esc(h.x)}</blockquote>
    ${enOn ? `<div class="wz-en"><b>معنى الحديث بالإنجليزية</b><p class="notranslate" translate="no" lang="en" dir="ltr">${esc(h.en)}</p></div>` : ''}
    <p class="wz-tx"><span>رواه</span> <b>${bk(h.b)}</b> <span class="num">(${dig(h.k)})</span></p>
    ${h.gr || h.dg ? `<p class="wz-gr"><span>درجته</span> ${h.gr ? `<em class="wz-badge">${h.gr}</em>` : ''}${h.dg ? `<span class="wz-dg">${esc(h.dg.replace(/[؛\s]+$/, ''))}</span>` : ''}</p>` : ''}
    <div class="th-use"><b>فقه الحديث</b><p>${esc(h.f)}</p></div></article>`;
  const qCard = q => { const b = TF.find(x => x.key === q.bk);
    return `<figure class="qs-quote wz-q"><blockquote class="notranslate" translate="no" lang="ar" dir="rtl">${esc(q.x)}</blockquote>
    ${enOn ? `<p class="wz-qen notranslate" translate="no" lang="en" dir="ltr">${esc(q.en)}</p>` : ''}
    <figcaption><b>${q.w}</b> · <span>نقل بلفظه من</span> <span>${esc(b ? b.title : q.bk)}</span> · <span>عند تفسير</span> ${refLink(idxOf(q.s, q.a))}</figcaption></figure>`; };
  const evLink = ev => Array.isArray(ev) ? refLink(idxOf(ev[0], ev[1])) : `<a href="#wazifa" data-wzh="${ev}">${esc(Z.h[ev].t)}</a>`;
  const send = () => `<section class="wz-send"><h3>ماذا أقدّم لحياتي؟</h3><p class="muted">خلاصة عملية من النصوص السابقة، كل بند بدليله:</p>
    <ol class="wz-list">${Z.send.map(([t, d, ev]) => `<li><b>${t}</b><p>${esc(d)}</p><span class="wz-ev"><span>الدليل</span> ${evLink(ev)}</span></li>`).join('')}</ol></section>`;
  const body = c => `<p class="u-intro">${esc(c.d)}</p>
    <h3 class="wz-st">الآيات</h3><div class="wz-grid">${c.ay.map(ayCard).join('')}</div>
    ${c.q.length ? `<h3 class="wz-st">أقوال المفسرين</h3><div class="wz-grid">${c.q.map(qCard).join('')}</div>` : ''}
    ${c.h.length ? `<h3 class="wz-st">من السنة الصحيحة</h3><div class="wz-grid">${c.h.map(k => hCard(Z.h[k])).join('')}</div>` : ''}
    ${c.send ? send() : ''}`;
  const nAy = Z.ch.reduce((t, c) => t + c.ay.length, 0), nQ = Z.ch.reduce((t, c) => t + c.q.length, 0);
  V(`<div class="stack ulum wz">
    <section class="u-hero wz-hero"><span class="eyebrow">اكتشف وتأمّل</span><h1>وظيفة الإنسان في القرآن الكريم</h1>
      <p class="lead">لماذا خُلق الإنسان؟ وما وظيفته في الأرض؟ الجواب من القرآن الكريم بآياته وتفسيرها من أمهات كتب التفسير، والسنة الصحيحة بتخريجها، في تسعة أبواب ختامها «يا ليتني قدّمت لحياتي».</p>
      <div class="wz-stats"><span><b class="num">${n(Z.ch.length)}</b> <span>أبواب</span></span><span><b class="num">${n(nAy)}</b> <span>آية</span></span><span><b class="num">${n(Object.keys(Z.h).length)}</b> <span>أحاديث</span></span><span><b class="num">${n(nQ)}</b> <span>نقلاً</span></span></div></section>
    <aside class="panel wz-sum"><h2>خلاصة القرآن في وظيفة الإنسان</h2><p>وظيفة الإنسان في القرآن ترجع إلى أصل واحد هو عبادة الله، وتتفرع عنه وظائف: أن يكون خليفة يعمر الأرض بالحق والعدل، وأن يحمل الأمانة، وأن يجتاز الابتلاء بحسن العمل، وأن يشكر النعم، وأن يصلح نفسه بالتزكية وغيره بالدعوة، وأن يقدّم لحياته الباقية قبل أن يقول: يا ليتني قدّمت لحياتي.</p></aside>
    <nav class="panel u-index" aria-label="الفهرس"><h2>الفهرس</h2><ol>${Z.ch.map((c, i) => `<li${c.hl ? ' class="wz-hl"' : ''}><a href="#wazifa" data-wzj="${c.id}"><span class="u-n">${n(i + 1)}</span>${c.t}</a></li>`).join('')}</ol></nav>
    ${Z.ch.map((c, i) => `<details class="u-ch panel wz-ch${c.hl ? ' wz-layt' : ''}" id="wz-${c.id}"${i === 0 || c.hl ? ' open' : ''}><summary><span class="u-n">${n(i + 1)}</span><span class="u-t">${c.t}</span></summary>
      <div class="u-body stack tight">${body(c)}</div></details>`).join('')}
    <p class="muted small">نصوص الآيات من المصحف، والتفسير الميسر ونقول المفسرين بلفظها من كتب التفسير المضمّنة، ونصوص الأحاديث من الكتب الستة المضمّنة بترقيمها وأحكامها كما وردت، والتمهيدات والفوائد صياغة موجزة.</p>
  </div>`);
  const go = el => { const d = el.closest('details.wz-ch'); if (d) d.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $$('[data-wzj]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#wz-' + a.dataset.wzj)); });
  $$('[data-wzh]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#wzh-' + a.dataset.wzh)); });
  $$('.wz-tf').forEach(d => d.addEventListener('toggle', () => { if (d.open) d.querySelectorAll('.u-tf[data-ev]:not([data-done])').forEach(el => { el.dataset.done = 1; ulumEvidence(el); }); }));
}
views.wazifa = wazifa;
function ulum() {
  V(`<div class="stack ulum">
    <section class="u-hero"><span class="eyebrow">ابحث وحقّق</span><h1>علوم القرآن</h1><p class="lead">أبواب مسلسلة في علوم القرآن، لكل باب تمهيد موجز ومراجعه من أمهات الكتب، ثم شواهده من الآيات بنصها، وتفسيرها من الميسّر بنصه، ونقل بلفظه من كتب التفسير المضمّنة. وتُضاف أبواب جديدة تباعاً.</p></section>
    <nav class="panel u-index" aria-label="فهرس الأبواب"><h2>فهرس الأبواب</h2><ol>${ULUM.map((c, i) => `<li><a href="#ulum" data-uj="${c.id}"><span class="u-n">${n(i + 1)}</span>${c.t}</a></li>`).join('')}</ol></nav>
    ${ULUM.map((c, i) => `<details class="u-ch panel" id="u-${c.id}"${i === 0 ? ' open' : ''}><summary><span class="u-n">${n(i + 1)}</span><span class="u-t">الباب ${n(i + 1)}: ${c.t}</span></summary>
      <div class="u-body stack tight"><p class="u-intro">${esc(c.intro)}</p>
      <h3>مسائل الباب</h3><ol class="u-pts">${c.pts.map(x => `<li>${esc(x)}</li>`).join('')}</ol>
      <h3>الشواهد من القرآن وأقوال المفسرين</h3>
      ${c.ev.map(([s, a, kw]) => { const ix = idxOf(s, a); return `<div class="u-ev"><div class="u-ref">${refLink(ix)}</div>${ayahHTML(ix, null, false)}<div class="u-tf" data-ev="${s}|${a}|${esc(kw)}"><p class="muted small">جارٍ تحميل التفسير…</p></div></div>`; }).join('')}
      <p class="u-src"><b>المراجع:</b> ${esc(c.ref)}.</p></div></details>`).join('')}
    <p class="muted small">التمهيد ومسائل الباب تلخيص لما في المراجع المذكورة مع كل باب، والآيات من المصحف بنصها، والتفسير منقول بلفظه من الكتب المضمّنة في مشكاة.</p>
  </div>`);
  const load = d => { if (d.open) d.querySelectorAll('.u-tf[data-ev]:not([data-done])').forEach(el => { el.dataset.done = 1; ulumEvidence(el); }); };
  $$('.u-ch').forEach(d => { d.addEventListener('toggle', () => load(d)); load(d); });
  $$('[data-uj]').forEach(a => a.onclick = e => { e.preventDefault(); const d = $('#u-' + a.dataset.uj); d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}


/* ================= أقسام موضوعية: أدعية القرآن، والمرأة في القرآن، والرجل في القرآن
   لكل مدخل: آياته من المصحف بنصها، وتفسيرها من الميسّر بنصه، ونقل بلفظه من كتب التفسير المضمّنة عند الآية (سبب النزول أو المناسبة)، ثم تمهيد موجز أو طريقة الاستعمال. */
const THEMES = {
  duaa: { t: 'أدعية القرآن', ey: 'احفظ وتعبّد', ic: 'i-hands',
    lead: 'كل دعاء في القرآن الكريم بموضوعه، ومن دعا به ومناسبته، وسبب نزوله أو ما نزل فيه منقولاً بلفظه من كتب التفسير، ثم كيف تستعمله في يومك.',
    note: 'نص الدعاء من المصحف، والتفسير من الميسّر، والنقل بلفظه من كتب التفسير المضمّنة. وما في «كيف تستعمله» إرشاد عام، وما نُسب فيه إلى السنة فمن الصحيحين أو السنن كما هو مذكور.',
    groups: [
      ['الهداية والثبات', [
        ['اهدنا الصراط المستقيم', 'دعاء الفاتحة، يقرؤه المسلم في كل ركعة', [1, 6, 7], 'الإرشاد/أرشدنا/الهداية', 'أعظم دعاء وأجمعه: سؤال الهداية إلى طريق الحق والثبات عليه.', 'يُقرأ في كل ركعة من الصلاة، فاستحضر معناه وأنت تقرؤه، وادعُ به في سجودك وخارج الصلاة.'],
        ['ربنا لا تزغ قلوبنا بعد إذ هديتنا', 'دعاء الراسخين في العلم', [3, 8], 'الراسخ/تزغ', 'سؤال الثبات على الهداية وطلب الرحمة.', 'ادعُ به عند الفتن والشبهات، وبعد طاعة تخشى أن تفتر عنها.'],
        ['ربنا أتمم لنا نورنا واغفر لنا', 'دعاء المؤمنين يوم القيامة', [66, 8], 'نورهم/الصراط/أتمم', 'يدعو به المؤمنون حين يُطفأ نور المنافقين على الصراط.', 'ادعُ به راجياً تمام النور يوم القيامة، ومع التوبة النصوح التي ذُكرت قبله في الآية.'],
      ]],
      ['المغفرة والتوبة', [
        ['ربنا ظلمنا أنفسنا', 'دعاء آدم وزوجه بعد الأكل من الشجرة', [7, 23], 'آدم/الكلمات', 'اعتراف بالذنب وطلب المغفرة والرحمة، وهو من الكلمات التي تلقّاها آدم من ربه في قول جمع من المفسرين.', 'ادعُ به بعد كل ذنب، معترفاً نادماً عازماً على ألا تعود.'],
        ['رب إني ظلمت نفسي فاغفر لي', 'دعاء موسى عليه السلام بعد قتل القبطي', [28, 16], 'القبطي/ظلمت', 'توبة سريعة واعتراف صادق، فغفر الله له.', 'ادعُ به حين تقع في خطأ، ولا تؤخر التوبة.'],
        ['لا إله إلا أنت سبحانك إني كنت من الظالمين', 'دعاء يونس عليه السلام في بطن الحوت', [21, 87, 88], 'يونس/الظلمات', 'توحيد وتسبيح واعتراف، فاستجاب الله له ونجّاه من الغم.', 'في سنن الترمذي من حديث سعد بن أبي وقاص أن النبي ﷺ قال إنه لم يدعُ بها رجل مسلم في شيء قط إلا استجاب الله له. فادعُ به في الكرب والضيق.'],
        ['ربنا اغفر لنا ذنوبنا وإسرافنا في أمرنا', 'دعاء الربيين الذين قاتلوا مع الأنبياء', [3, 147], 'ربيون/إسرافنا', 'طلب المغفرة والثبات والنصر معاً.', 'ادعُ به عند الشدة، وقدّم الاستغفار بين يدي حاجتك.'],
        ['ربنا اغفر لنا ولإخواننا الذين سبقونا بالإيمان', 'دعاء من جاء بعد المهاجرين والأنصار', [59, 10], 'غلا/سبقونا', 'دعاء للمؤمنين السابقين، وسؤال سلامة القلب من الغل.', 'ادعُ به لوالديك ولمن سبقك من المؤمنين، وتعاهد به قلبك.'],
        ['رب اغفر لي ولوالدي ولمن دخل بيتي مؤمناً', 'دعاء نوح عليه السلام', [71, 28], 'نوح/ولوالدي', 'دعاء جامع لنفسه ووالديه والمؤمنين والمؤمنات.', 'ادعُ به لك ولوالديك ولأهل بيتك وللمسلمين.'],
      ]],
      ['الدنيا والآخرة', [
        ['ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة', 'دعاء من يجمع خيري الدنيا والآخرة', [2, 201], 'حسنة', 'أجمع دعاء لخير الدنيا والآخرة والوقاية من النار.', 'في الصحيحين من حديث أنس أنه كان أكثر دعاء النبي ﷺ. وفي سنن أبي داود أنه ﷺ كان يقوله بين الركنين في الطواف.'],
        ['ربنا ما خلقت هذا باطلاً سبحانك', 'دعاء أولي الألباب المتفكرين', [3, 191, 194], 'الألباب/تفكر', 'تفكّر في الخلق ينتهي إلى سؤال الوقاية من النار والمغفرة وحسن الخاتمة.', 'في الصحيحين من حديث ابن عباس أن النبي ﷺ قرأ هذه الآيات من آخر آل عمران حين قام من الليل. فاقرأها عند قيامك وتفكّر فيها.'],
        ['ربنا اصرف عنا عذاب جهنم', 'من دعاء عباد الرحمن', [25, 65, 66], 'غراما', 'خوف من النار مع عمل صالح وقيام بالليل.', 'ادعُ به في قيام الليل، فقد ذُكر في الآية قبله: «والذين يبيتون لربهم سجداً وقياماً».'],
        ['رب ابنِ لي عندك بيتاً في الجنة', 'دعاء امرأة فرعون', [66, 11], 'آسية/امرأة فرعون', 'آثرت جوار الله على قصر فرعون، فضربها الله مثلاً للذين آمنوا.', 'ادعُ به عند الابتلاء في سبيل الحق، واطلب الجار قبل الدار.'],
        ['توفني مسلماً وألحقني بالصالحين', 'دعاء يوسف عليه السلام في تمام النعمة', [12, 101], 'يوسف/توفني', 'شكر على النعمة وسؤال حسن الخاتمة.', 'ادعُ به عند تمام النعم، ولا تغترّ بها.'],
      ]],
      ['الصبر والنصر', [
        ['ربنا أفرغ علينا صبراً وثبت أقدامنا', 'دعاء جيش طالوت عند لقاء جالوت', [2, 250], 'جالوت/طالوت', 'سؤال الصبر والثبات والنصر عند لقاء العدو.', 'ادعُ به عند الامتحانات والمواقف الصعبة.'],
        ['ربنا أفرغ علينا صبراً وتوفنا مسلمين', 'دعاء سحرة فرعون بعد إيمانهم', [7, 126], 'السحرة', 'ثبتوا على الإيمان أمام وعيد فرعون.', 'ادعُ به حين تُبتلى في دينك.'],
        ['ربنا لا تجعلنا فتنة للقوم الظالمين', 'دعاء قوم موسى المؤمنين', [10, 85, 86], 'فتنة', 'توكّل على الله وسؤال النجاة من تسلّط الظالمين.', 'ادعُ به حين تخاف ظلماً، مع التوكل الذي بدأ به الدعاء.'],
        ['ربنا عليك توكلنا وإليك أنبنا', 'دعاء إبراهيم والذين معه', [60, 4, 5], 'إبراهيم/أسوة', 'توكل وإنابة وطلب المغفرة.', 'ادعُ به قبل كل أمر مهم.'],
      ]],
      ['الأسرة والذرية والوالدان', [
        ['رب ارحمهما كما ربياني صغيراً', 'دعاء للوالدين أمر الله به', [17, 24], 'الوالدين/ارحمهما', 'جزء من الأمر ببر الوالدين وخفض الجناح لهما.', 'ادعُ به لوالديك أحياءً وأمواتاً، في صلاتك وكل وقت.'],
        ['ربنا هب لنا من أزواجنا وذرياتنا قرة أعين', 'دعاء عباد الرحمن', [25, 74], 'قرة', 'سؤال صلاح الأهل والذرية والإمامة في الخير.', 'ادعُ به لأسرتك، ومع الزواج وعند الحمل والولادة.'],
        ['رب هب لي من لدنك ذرية طيبة', 'دعاء زكريا عليه السلام في محراب مريم', [3, 38], 'زكريا/المحراب', 'رأى كرامة الله لمريم فسأل الولد الصالح.', 'ادعُ به لطلب الذرية، فقد بشّره الله بيحيى.'],
        ['رب لا تذرني فرداً وأنت خير الوارثين', 'دعاء زكريا عليه السلام', [21, 89, 90], 'زكريا', 'استجاب الله له ووهب له يحيى وأصلح له زوجه.', 'ادعُ به لطلب الذرية، مع المسارعة في الخيرات كما ذكرت الآية.'],
        ['رب اجعلني مقيم الصلاة ومن ذريتي', 'دعاء إبراهيم عليه السلام', [14, 40, 41], 'إبراهيم/مقيم الصلاة', 'سأل لنفسه وذريته إقامة الصلاة، والمغفرة له ولوالديه وللمؤمنين.', 'ادعُ به لنفسك وأولادك، وعلّمه لهم.'],
        ['رب أوزعني أن أشكر نعمتك التي أنعمت عليّ وعلى والديّ', 'دعاء من بلغ أشده وبلغ أربعين سنة', [46, 15], 'أربعين/أشده', 'شكر وعمل صالح وصلاح الذرية وتوبة.', 'ادعُ به عند بلوغ الأربعين وفي كل نعمة.'],
      ]],
      ['العلم والعمل والشكر', [
        ['رب زدني علماً', 'دعاء علّمه الله نبيه ﷺ', [20, 114], 'علما/وحيه', 'ذكر العلماء أن الله لم يأمر نبيه ﷺ بطلب الزيادة من شيء إلا من العلم.', 'ادعُ به قبل الدرس والقراءة والمذاكرة.'],
        ['رب اشرح لي صدري ويسر لي أمري', 'دعاء موسى عليه السلام قبل ذهابه إلى فرعون', [20, 25, 28], 'فرعون/اشرح/عقدة', 'سأل انشراح الصدر وتيسير الأمر وفصاحة اللسان.', 'ادعُ به قبل الكلام والتدريس والمقابلات والمهمات الصعبة.'],
        ['ربنا تقبل منا إنك أنت السميع العليم', 'دعاء إبراهيم وإسماعيل وهما يرفعان قواعد البيت', [2, 127, 128], 'القواعد/البيت', 'يعملان أعظم عمل ويسألان القبول.', 'ادعُ به بعد كل عمل صالح، ولا تغترّ بعملك.'],
        ['رب أوزعني أن أشكر نعمتك', 'دعاء سليمان عليه السلام لما سمع النملة', [27, 19], 'النملة/أوزعني', 'شكر على النعمة وسؤال العمل الصالح.', 'ادعُ به كلما تجددت لك نعمة.'],
        ['رب هب لي حكماً وألحقني بالصالحين', 'دعاء إبراهيم عليه السلام', [26, 83, 85], 'حكما/لسان صدق/الحكم/العلم', 'سأل العلم والصلاح والذكر الحسن والجنة.', 'ادعُ به لنفسك في طلب العلم والذكر الحسن.'],
        ['رب أدخلني مدخل صدق وأخرجني مخرج صدق', 'دعاء علّمه الله نبيه ﷺ', [17, 80], 'الهجرة/المدينة', 'ذكر جماعة من المفسرين أنه نزل في الهجرة من مكة إلى المدينة.', 'ادعُ به عند الانتقال إلى عمل أو بلد أو مرحلة جديدة.'],
      ]],
      ['الكرب والحاجة', [
        ['أني مسني الضر وأنت أرحم الراحمين', 'دعاء أيوب عليه السلام', [21, 83, 84], 'أيوب', 'دعاء بأدب عظيم، فكشف الله ضره وآتاه أهله ومثلهم معهم.', 'ادعُ به في المرض والبلاء، مع الصبر.'],
        ['رب إني لما أنزلت إليّ من خير فقير', 'دعاء موسى عليه السلام في مدين', [28, 24], 'مدين/فقير', 'قاله بعد أن سقى للمرأتين، وهو غريب جائع، ففتح الله له.', 'ادعُ به عند الحاجة إلى رزق أو عمل أو زوج صالح.'],
        ['ربنا آتنا من لدنك رحمة وهيئ لنا من أمرنا رشداً', 'دعاء أصحاب الكهف', [18, 10], 'الكهف/الفتية', 'لجؤوا إلى الله حين ضاقت بهم الأرض.', 'ادعُ به عند الحيرة في أمر، مع الاستخارة.'],
        ['رب إني أعوذ بك أن أسألك ما ليس لي به علم', 'دعاء نوح عليه السلام بعد غرق ابنه', [11, 47], 'ابنه/نوح', 'تأدّب مع الله وتسليم لحكمه.', 'ادعُ به حين يُغلق عنك أمر تمنيته.'],
      ]],
      ['الاستعاذة والتحصين', [
        ['رب أعوذ بك من همزات الشياطين', 'دعاء علّمه الله نبيه ﷺ', [23, 97, 98], 'همزات', 'استعاذة من وساوس الشياطين وحضورهم.', 'ادعُ به عند الغضب والوسوسة وقبل الأعمال.'],
        ['ربنا لا تؤاخذنا إن نسينا أو أخطأنا', 'خواتيم سورة البقرة', [2, 286], 'قد فعلت/نسينا', 'في صحيح مسلم من حديث ابن عباس أن الله قال عند كل دعوة منها: قد فعلت.', 'في الصحيحين من حديث أبي مسعود: من قرأ الآيتين من آخر سورة البقرة في ليلة كفتاه. فاقرأهما كل ليلة.'],
        ['قل أعوذ برب الفلق، قل أعوذ برب الناس', 'المعوّذتان', [113, 1, 5], 'لبيد/سحر/الفلق', 'استعاذة من شر الخلق والحسد والسحر والوسواس.', 'في صحيح البخاري من حديث عائشة أن النبي ﷺ كان إذا أوى إلى فراشه نفث في كفيه بالإخلاص والمعوذتين ومسح بهما جسده. وفي سنن أبي داود والترمذي قراءتها ثلاثاً صباحاً ومساءً.'],
      ]],
    ] },
  nisaa: { t: 'المرأة في القرآن', ey: 'اكتشف وتأمّل', ic: 'i-flower',
    lead: 'النساء اللاتي ذكرهن القرآن الكريم وقصصهن، وما خاطب الله به المرأة من حقوق وأحكام وأحوال، كلٌّ بآياته وتفسيره ونقل بلفظه من كتب التفسير.',
    note: 'نص الآيات من المصحف، والتفسير من الميسّر، والنقل بلفظه من كتب التفسير المضمّنة، وأقربها لأحكام النساء «الجامع لأحكام القرآن» للقرطبي. والتمهيد تلخيص موجز، وتفصيل الأحكام ومذاهب الفقهاء في كتب الفقه.',
    groups: [
      ['نساء ذكرهن القرآن', [
        ['مريم ابنة عمران', 'المرأة الوحيدة المذكورة باسمها في القرآن، وسُمّيت سورة باسمها', [3, 42, 43], 'مريم/اصطفاك', 'اصطفاها الله وطهّرها على نساء العالمين، وكانت عابدة قانتة، وولدت عيسى عليه السلام بلا أب آية للناس.', ''],
        ['امرأة عمران أم مريم', 'نذرت ما في بطنها لخدمة بيت الله', [3, 35, 37], 'حنة/محررا', 'نذرت حملها لله، فتقبّل الله منها مريم بقبول حسن وأنبتها نباتاً حسناً.', ''],
        ['زوج آدم عليه السلام', 'أم البشر', [2, 35], 'حواء', 'أسكنها الله الجنة مع آدم، ثم تابا معاً فتاب الله عليهما.', ''],
        ['زوج إبراهيم عليه السلام', 'بُشّرت بإسحاق ومن وراء إسحاق يعقوب', [11, 71, 73], 'سارة/فضحكت', 'بشّرتها الملائكة بالولد على كبر، فعجبت، فقالوا: أتعجبين من أمر الله.', ''],
        ['أم موسى عليه السلام', 'أوحى الله إليها فألقت ابنها في اليم', [28, 7, 13], 'أم موسى/فارغا', 'ربط الله على قلبها، وردّ إليها ابنها وفاءً بوعده.', ''],
        ['أخت موسى عليه السلام', 'تتبّعت أخاها ودلّت على أمه', [28, 11, 12], 'قصيه/أخته', 'مثال لحسن التصرّف والحكمة في الموقف الصعب.', ''],
        ['امرأة فرعون', 'ضربها الله مثلاً للذين آمنوا', [66, 11], 'آسية', 'آمنت في قصر أعتى الطغاة، وسألت بيتاً عند الله في الجنة.', ''],
        ['ابنتا صاحب مدين', 'الحياء والعفة وحسن الاختيار', [28, 23, 26], 'تمشي على استحياء/مدين', 'سقى لهما موسى، فجاءته إحداهما تمشي على استحياء، وأشارت على أبيها باستئجار القوي الأمين.', ''],
        ['ملكة سبأ', 'ملكة عاقلة شاورت قومها ثم أسلمت', [27, 32, 44], 'بلقيس/أفتوني', 'استشارت قومها ولم تستبدّ، وانتهت إلى الإسلام مع سليمان لله رب العالمين.', ''],
        ['امرأة العزيز', 'راودت يوسف ثم اعترفت بالحق', [12, 23, 51], 'راودته/حصحص', 'قصتها عبرة في الفتنة والعفة، وانتهت باعترافها: «الآن حصحص الحق».', ''],
        ['امرأة نوح وامرأة لوط', 'مثل للذين كفروا', [66, 10], 'خانتاهما', 'كانتا تحت نبيين صالحين فلم يغنيا عنهما من الله شيئاً، فالنجاة بالعمل لا بالنسب.', ''],
        ['المجادلة خولة بنت ثعلبة', 'سمع الله قولها من فوق سبع سماوات', [58, 1, 4], 'خولة/تجادلك', 'جادلت في شأن زوجها حين ظاهر منها، فنزلت أحكام الظهار.', ''],
        ['امرأة أبي لهب', 'حمّالة الحطب', [111, 4, 5], 'حمالة الحطب/أم جميل', 'كانت تؤذي النبي ﷺ، فذكر الله جزاءها.', ''],
        ['أمهات المؤمنين', 'زوجات النبي ﷺ', [33, 32, 34], 'نساء النبي', 'خاطبهن الله بالتقوى وحسن القول والقرار في البيوت وإقامة الصلاة.', ''],
        ['براءة أم المؤمنين عائشة', 'حادثة الإفك', [24, 11, 12], 'عائشة/الإفك', 'أنزل الله براءتها في آيات تُتلى، وأدّب المؤمنين في التثبت من الأخبار.', ''],
      ]],
      ['مكانتها وحقوقها', [
        ['المساواة في الأجر والجزاء', 'الرجل والمرأة في العمل الصالح سواء', [3, 195], 'ذكر أو أنثى/أم سلمة', 'لا يضيع الله عمل عامل من ذكر أو أنثى.', ''],
        ['صفات المؤمنين والمؤمنات', 'عشر صفات مشتركة', [33, 35], 'المسلمين والمسلمات/أم سلمة', 'ذكر الله الرجال والنساء معاً في عشر صفات وأعدّ لهم مغفرة وأجراً عظيماً.', ''],
        ['الحياة الطيبة', 'جزاء العمل الصالح مع الإيمان', [16, 97], 'حياة طيبة', 'وعد بالحياة الطيبة لكل من عمل صالحاً من ذكر أو أنثى.', ''],
        ['النهي عن وأد البنات', 'تكريم الأنثى منذ ولادتها', [81, 8, 9], 'الموءودة', 'أبطل الإسلام عادة الجاهلية في دفن البنات أحياء.', ''],
        ['حق المهر', 'صداق المرأة حق لها', [4, 4], 'صدقاتهن/نحلة', 'المهر عطية واجبة للمرأة لا يأخذ منه أحد إلا برضاها.', ''],
        ['حقها في الميراث', 'نصيب مفروض', [4, 7], 'نصيب/الأقربون', 'جعل الله للنساء نصيباً مفروضاً من الميراث.', ''],
        ['المعاشرة بالمعروف', 'حسن العشرة في الزواج', [4, 19], 'بالمعروف/عاشروهن', 'أمر الله بمعاشرة الزوجات بالمعروف، ونهى عن إرثهن كرهاً وعضلهن.', ''],
        ['المودة والرحمة', 'الزواج آية من آيات الله', [30, 21], 'مودة/المودة', 'جعل الله بين الزوجين مودة ورحمة وسكناً.', ''],
      ]],
      ['أحوالها وأحكامها', [
        ['الأمومة والحمل والرضاع', 'وصية خاصة بالأم', [31, 14], 'وهنا/وهن/فصاله', 'ذكر الله حمل الأم وهناً على وهن وفصاله في عامين.', ''],
        ['الرضاعة', 'حولان كاملان', [2, 233], 'حولين/الرضاعة', 'أحكام الرضاع ونفقة المرضع وكسوتها بالمعروف.', ''],
        ['الحجاب والستر', 'آداب اللباس والزينة', [24, 31], 'زينتهن/خمرهن', 'أمر المؤمنات بغض البصر وحفظ الفرج وعدم إبداء الزينة إلا لمن ذُكروا.', ''],
        ['الجلباب', 'أمارة الحشمة والصيانة', [33, 59], 'جلابيبهن', 'أمر الله نساء النبي ﷺ وبناته ونساء المؤمنين بإدناء الجلابيب.', ''],
        ['العدة', 'حكمة وحفظ للحقوق', [2, 228], 'قروء', 'عدة المطلقة ثلاثة قروء، ولهن مثل الذي عليهن بالمعروف.', ''],
        ['الطلاق بإحسان', 'إمساك بمعروف أو تسريح بإحسان', [2, 229], 'تسريح بإحسان/مرتان', 'نظّم الله الطلاق وحفظ للمرأة حقها ونهى عن أخذ ما آتاها زوجها.', ''],
        ['بيعة النساء', 'بايعت المؤمنات النبي ﷺ', [60, 12], 'يبايعنك', 'بايعن على التوحيد والعفة وترك المعاصي، فصارت لهن ذمة مستقلة.', ''],
        ['هجرة المؤمنات', 'امتحان المهاجرات وحمايتهن', [60, 10], 'فامتحنوهن/امتحان/يمتحن/المهاجرات', 'أمر الله بامتحان المهاجرات وعدم ردّهن إلى الكفار.', ''],
      ]],
    ] },
  rijal: { t: 'الرجل في القرآن', ey: 'اكتشف وتأمّل', ic: 'i-user',
    lead: 'الرجال الذين ذكرهم القرآن الكريم من غير الأنبياء وقصصهم، وصفات الرجال المؤمنين، ومسؤولياته وأحكامه، كلٌّ بآياته وتفسيره ونقل بلفظه من كتب التفسير.',
    note: 'نص الآيات من المصحف، والتفسير من الميسّر، والنقل بلفظه من كتب التفسير المضمّنة. والتمهيد تلخيص موجز، وتفصيل الأحكام ومذاهب الفقهاء في كتب الفقه. وقصص الأنبياء في «قصص القرآن» من الموسوعة الموضوعية.',
    groups: [
      ['رجال ذكرهم القرآن', [
        ['لقمان الحكيم', 'آتاه الله الحكمة، ووعظ ابنه', [31, 12, 13], 'لقمان/الحكمة', 'رجل صالح حكيم، سُمّيت سورة باسمه، وفيها وصاياه لابنه.', ''],
        ['ذو القرنين', 'ملك صالح مكّن الله له في الأرض', [18, 83, 84], 'ذو القرنين', 'بلغ مغرب الشمس ومطلعها، وبنى السد، ونسب الفضل إلى ربه.', ''],
        ['العبد الصالح صاحب موسى', 'آتاه الله رحمة وعلماً من لدنه', [18, 65], 'الخضر', 'تعلّم منه موسى عليه السلام أن وراء ظاهر الأحداث حكمة.', ''],
        ['مؤمن آل فرعون', 'يكتم إيمانه ويدافع عن موسى', [40, 28], 'مؤمن/يكتم إيمانه', 'دافع عن الحق بحكمة في مجلس فرعون، فوقاه الله سيئات ما مكروا.', ''],
        ['الرجل الذي جاء يسعى', 'صاحب سورة يس', [36, 20, 21], 'حبيب/يسعى', 'جاء من أقصى المدينة ينصح قومه باتباع المرسلين.', ''],
        ['زيد بن حارثة', 'الصحابي الوحيد المذكور باسمه في القرآن', [33, 37], 'زيد', 'ذُكر اسمه في سياق أحكام التبنّي.', ''],
        ['طالوت', 'ملك اختاره الله لبني إسرائيل', [2, 247], 'طالوت', 'زاده الله بسطة في العلم والجسم، فالقيادة بالعلم والقوة لا بالمال.', ''],
        ['قارون', 'آتاه الله الكنوز فبغى', [28, 76, 81], 'قارون', 'فرح بماله وقال إنما أوتيته على علم عندي، فخسف الله به وبداره الأرض.', ''],
        ['فرعون وهامان', 'رأسا الطغيان', [28, 6, 8], 'هامان', 'علا فرعون في الأرض وجعل أهلها شيعاً، فكانت عاقبته الغرق.', ''],
        ['أبو لهب', 'عمّ النبي ﷺ وعدوه', [111, 1, 3], 'أبو لهب/تبت', 'لم ينفعه نسبه ولا ماله، فالنجاة بالإيمان.', ''],
        ['صاحب الجنتين', 'مثل الغني المغترّ', [18, 32, 35], 'الجنتين', 'اغترّ بماله وظن أنه لا يبيد، فأحاط الله بثمره.', ''],
        ['ابن نوح', 'أبى أن يركب السفينة', [11, 42, 43], 'ابنه', 'لم تنفعه قرابة أبيه، فالنجاة باتباع الحق.', ''],
      ]],
      ['صفات الرجال المؤمنين', [
        ['رجال صدقوا ما عاهدوا الله عليه', 'الوفاء بالعهد', [33, 23], 'أنس بن النضر/صدقوا', 'مدح الله رجالاً ثبتوا على عهدهم حتى لقوه.', ''],
        ['رجال لا تلهيهم تجارة ولا بيع عن ذكر الله', 'عُمّار المساجد', [24, 36, 37], 'لا تلهيهم', 'يعملون ويتاجرون ولا يشغلهم ذلك عن الصلاة والزكاة.', ''],
        ['رجال يحبون أن يتطهروا', 'أهل مسجد قباء', [9, 108], 'قباء/يتطهروا', 'مدح الله طهارتهم الظاهرة والباطنة.', ''],
        ['عباد الرحمن', 'صفات جامعة للمؤمن', [25, 63, 64], 'هونا/الحلم/بالسكينة', 'تواضع وحلم وقيام بالليل واعتدال في الإنفاق.', ''],
      ]],
      ['مسؤولياته وأحكامه', [
        ['القوامة', 'مسؤولية رعاية وإنفاق', [4, 34], 'قوامون', 'جعل الله القوامة للرجال بما فضّل وبما أنفقوا، وهي رعاية وحماية.', ''],
        ['النفقة', 'على قدر السعة', [65, 7], 'ذو سعة/سعته/النفقة', 'ينفق كل رجل على أهله بحسب قدرته.', ''],
        ['العدل بين الزوجات', 'شرط التعدد', [4, 3], 'تعدلوا', 'أباح الله التعدد إلى أربع بشرط العدل، فإن خيف الجور فواحدة.', ''],
        ['المهر والوفاء به', 'حق للزوجة', [4, 20, 21], 'قنطارا/ميثاقا', 'نهى الله الرجل أن يأخذ مما آتى زوجته شيئاً، وسمّى الزواج ميثاقاً غليظاً.', ''],
        ['غض البصر', 'أمر للمؤمنين قبل المؤمنات', [24, 30], 'يغضوا', 'غض البصر وحفظ الفرج أزكى للنفس.', ''],
        ['الأبوة والتربية', 'وقاية الأهل من النار', [66, 6], 'قوا أنفسكم/أهليكم', 'أمر الله المؤمنين بوقاية أنفسهم وأهليهم بالتعليم والتأديب.', ''],
        ['بر الوالدين', 'الإحسان إليهما', [17, 23], 'أف/إحسانا', 'قرن الله الإحسان إلى الوالدين بعبادته.', ''],
        ['السعي في الرزق', 'العمل بعد الصلاة', [62, 10], 'فانتشروا', 'أمر الله بالانتشار في الأرض وابتغاء فضله مع ذكره كثيراً.', ''],
        ['الشهادة والأمانة', 'توثيق الحقوق', [2, 282], 'رجالكم/شهيدين', 'أمر الله بكتابة الدَّين والإشهاد عليه حفظاً للحقوق.', ''],
      ]],
    ] },
  shifa: { t: 'الأمراض والعلاج في القرآن', ey: 'اكتشف وتأمّل', ic: 'i-heal', ul: 'كيف تنتفع به',
    lead: 'ما ذكره القرآن الكريم من أمراض القلوب والأبدان، والشفاء والعلاج، ورُخص المريض وأحكامه، وصبر الأنبياء على البلاء، وأسباب الوقاية وحفظ الصحة، كلٌّ بآياته وتفسيره ونقل بلفظه من كتب التفسير.',
    note: 'نص الآيات من المصحف، والتفسير من الميسّر، والنقل بلفظه من كتب التفسير المضمّنة، والتمهيد تلخيص موجز. وهذا القسم بيان لهدايات القرآن، لا وصفة طبية ولا بديل عن الطبيب؛ فالتداوي والأخذ بالأسباب مشروع، والرقية بالقرآن والدعاء لا تعارضهما.',
    groups: [
      ['القرآن شفاء', [
        ['وننزل من القرآن ما هو شفاء ورحمة', 'القرآن شفاء للمؤمنين', [17, 82], 'شفاء/الشفاء', 'وصف الله كتابه بأنه شفاء ورحمة للمؤمنين، وذكر المفسرون أنه شفاء لما في القلوب من الشك والجهل، ويُرقى به من الأمراض.', 'اجعل لك ورداً من القرآن تتدبره، فهو أول علاج لما في الصدر من همّ وشك وقسوة.'],
        ['شفاء لما في الصدور', 'موعظة وهدى ورحمة', [10, 57], 'شفاء/الصدور', 'خاطب الله الناس بأن القرآن موعظة من ربهم وشفاء لما في الصدور من أدواء الشبهات والشهوات.', 'إذا ضاق صدرك فاقرأ متدبراً، واستحضر أن الخطاب موجّه إليك.'],
        ['قل هو للذين آمنوا هدى وشفاء', 'ينتفع به من آمن', [41, 44], 'شفاء/هدى', 'القرآن هدى وشفاء للمؤمنين، وهو على المعرضين عمى، فالانتفاع به على قدر الإيمان.', 'أقبل على القرآن بقلب مصدّق، فبقدر الإقبال يكون الانتفاع.'],
        ['ويشف صدور قوم مؤمنين', 'شفاء الصدور بنصر الحق', [9, 14, 15], 'خزاعة/غيظ', 'وعد الله المؤمنين بأن يشفي صدورهم ويذهب غيظ قلوبهم بنصر الحق.', 'ثق بوعد الله، فإن ما في الصدر من ألم الظلم يذهبه الله بعدله.'],
      ]],
      ['أمراض القلوب', [
        ['في قلوبهم مرض', 'مرض الشك والنفاق', [2, 10], 'شك/النفاق', 'أول ما ذكره القرآن من أمراض القلوب: مرض الشك والنفاق، ومن أصرّ عليه زاده الله مرضاً.', 'افحص قلبك بصدق، واسأل الله اليقين، فالمرض الذي يُترك يزيد.'],
        ['فيطمع الذي في قلبه مرض', 'مرض الشهوة', [33, 32], 'مرض/الشهوة/الفجور', 'فسّر المفسرون المرض هنا بالشك والنفاق، وقيل: الشهوة والفجور، فنهى الله عن الخضوع بالقول سدّاً للباب.', 'احفظ كلامك ونظرك، فسدّ أبواب الفتنة من علاج القلب.'],
        ['ثم قست قلوبكم', 'قسوة القلب', [2, 74], 'قست/القسوة', 'شبّه الله القلوب القاسية بالحجارة أو أشد قسوة، بعد أن رأى أصحابها الآيات.', 'إذا أحسست بقسوة قلبك فأكثر من ذكر الموت وزيارة المرضى والصدقة.'],
        ['كلا بل ران على قلوبهم', 'الران من الذنوب', [83, 14], 'ران/الرين', 'الران: ما يغطي القلب من تتابع الذنوب حتى يحجبه عن الحق.', 'بادر بالتوبة بعد كل ذنب، فالاستغفار يجلو القلب.'],
        ['أم يحسدون الناس', 'مرض الحسد', [4, 54], 'يحسدون/الحسد', 'ذمّ الله الحسد على ما آتى الله الناس من فضله، وهو من أشد أمراض القلوب.', 'إذا رأيت نعمة على غيرك فقل: ما شاء الله، واسأل الله من فضله.'],
        ['اجتنبوا كثيراً من الظن', 'سوء الظن والتجسس والغيبة', [49, 12], 'الظن/الغيبة', 'نهى الله عن سوء الظن والتجسس والغيبة، وشبّه الغيبة بأكل لحم الأخ ميتاً.', 'احمل كلام إخوانك على أحسن وجه، وأمسك لسانك عن الغائب.'],
        ['ولا تصعّر خدك للناس', 'الكبر والخيلاء', [31, 18, 19], 'تتكبر/الكبر/تحتقر', 'من وصايا لقمان لابنه: النهي عن الكبر والمشي في الأرض مرحاً.', 'تواضع لمن هو دونك، فالتواضع علاج الكبر.'],
        ['ومن يوق شح نفسه', 'الشح والبخل', [59, 9], 'شح/الشح', 'الشح مرض في النفس، ومن وقاه الله منه فهو من المفلحين، كما وصف الأنصار بالإيثار.', 'عوّد نفسك العطاء ولو بالقليل، فالإنفاق يداوي الشح.'],
      ]],
      ['علاج القلوب', [
        ['ألا بذكر الله تطمئن القلوب', 'الذكر طمأنينة', [13, 28], 'تطمئن/ذكر الله', 'جعل الله ذكره سبب طمأنينة القلوب وسكونها.', 'اجعل لك أذكاراً ثابتة في الصباح والمساء، وارجع إليها عند القلق.'],
        ['ذكروا الله فاستغفروا لذنوبهم', 'الاستغفار والتوبة', [3, 135], 'فاستغفروا/استغفر', 'من صفات المتقين أنهم إذا أذنبوا ذكروا الله فاستغفروا ولم يصرّوا.', 'لا تؤخر التوبة، واجعل الاستغفار عادة يومية.'],
        ['واستعينوا بالصبر والصلاة', 'الصبر والصلاة', [2, 153], 'معين/الصبر على', 'أمر الله المؤمنين بالاستعانة على شدائدهم بالصبر والصلاة.', 'إذا نزل بك همّ فقم إلى الصلاة، وادعُ في سجودك.'],
        ['ادفع بالتي هي أحسن', 'علاج العداوة', [41, 34, 35], 'ادفع/أحسن', 'أرشد الله إلى دفع الإساءة بالإحسان، فتنقلب العداوة مودة.', 'قابل الإساءة بكلمة طيبة أو هدية، وانظر أثرها.'],
        ['ألم يأن للذين آمنوا أن تخشع قلوبهم', 'علاج القسوة بالخشوع', [57, 16], 'تخشع/قست', 'عاتب الله المؤمنين على تأخر الخشوع، وحذّرهم من حال من قست قلوبهم بطول الأمد.', 'اجعل لك وقتاً تقرأ فيه القرآن بتأنٍّ وتدبر، بعيداً عن الشواغل.'],
      ]],
      ['المريض: رُخصه وأحكامه', [
        ['فمن كان منكم مريضاً أو على سفر', 'الفطر للمريض', [2, 184, 185], 'مريضا/المريض', 'رخّص الله للمريض في الفطر في رمضان ثم القضاء، وختم الآية بقوله: يريد الله بكم اليسر.', 'إذا أشار عليك الطبيب الثقة بالفطر فخذ برخصة الله.'],
        ['ففدية من صيام أو صدقة أو نسك', 'المريض في الحج', [2, 196], 'أذى من رأسه/كعب بن عجرة', 'من كان مريضاً أو به أذى من رأسه وهو محرم، فله أن يحلق ويفدي. وفي الصحيحين أنها نزلت في كعب بن عجرة.', 'الشريعة تراعي المرض حتى في المناسك، فلا تتكلف ما يضرك.'],
        ['وإن كنتم مرضى أو على سفر … فتيمموا', 'التيمم للمريض', [4, 43], 'مرضى/التيمم', 'أباح الله التيمم للمريض الذي يضره الماء، تيسيراً عليه.', 'تعلّم صفة التيمم، فقد تحتاجها في مرض أو سفر.'],
        ['ليس على الأعمى حرج ولا على المريض حرج', 'رفع الحرج', [48, 17], 'حرج/المريض', 'رفع الله الحرج عن المريض فيما يعجز عنه من التكاليف، ومنها الخروج إلى الجهاد.', 'لا تحمّل نفسك فوق طاقتها، فالله لا يكلف نفساً إلا وسعها.'],
        ['علم أن سيكون منكم مرضى', 'التخفيف في قيام الليل', [73, 20], 'مرضى/فاقرءوا', 'خفّف الله قيام الليل ومراعاة الأعذار ومنها المرض: فاقرؤوا ما تيسر منه.', 'إذا مرضت فصلِّ ما تستطيع، فالقليل الدائم خير.'],
      ]],
      ['البلاء والشفاء في قصص الأنبياء', [
        ['وإذا مرضت فهو يشفين', 'إبراهيم ينسب الشفاء إلى ربه', [26, 80], 'مرضت/يشفين', 'قالها إبراهيم عليه السلام، فنسب المرض إلى نفسه أدباً، والشفاء إلى الله.', 'خذ بالدواء، واعلم أن الشافي هو الله، واسأله الشفاء.'],
        ['أيوب: أني مسني الضر', 'صبر على المرض وشفاء', [21, 83, 84], 'البلاء/ابتلي/الضر', 'ابتُلي أيوب عليه السلام في بدنه وأهله وماله فصبر، فكشف الله ضره وآتاه أهله ومثلهم معهم.', 'ادعُ في مرضك بأدب أيوب، واصبر، فالفرج قريب.'],
        ['اركض برجلك هذا مغتسل بارد وشراب', 'سبب الشفاء', [38, 41, 44], 'اركض/مغتسل', 'أمر الله أيوب أن يضرب الأرض برجله فنبعت عين اغتسل منها وشرب فشُفي، وأثنى عليه: إنا وجدناه صابراً.', 'الشفاء من الله، ويأتي مع الأخذ بالأسباب التي يهيئها.'],
        ['وأبرئ الأكمه والأبرص', 'معجزة عيسى بإذن الله', [3, 49], 'الأكمه/الأبرص', 'من معجزات عيسى عليه السلام إبراء الأكمه والأبرص وإحياء الموتى بإذن الله.', 'كل شفاء بإذن الله، فاسأله وحده.'],
        ['وابيضت عيناه من الحزن', 'يعقوب وشفاء بصره', [12, 84, 86], 'ابيضت/الحزن', 'ذهب بصر يعقوب عليه السلام من الحزن على يوسف، فشكا بثّه إلى الله، ثم ارتدّ بصيراً لما أُلقي قميص يوسف على وجهه.', 'اشكُ همّك إلى الله وحده، فهو كاشفه.'],
        ['فنبذناه بالعراء وهو سقيم', 'يونس وشجرة اليقطين', [37, 145, 146], 'سقيم/يقطين', 'خرج يونس عليه السلام من بطن الحوت سقيماً، فأنبت الله عليه شجرة من يقطين.', 'رحمة الله تحيط بالمريض، ويهيئ له ما يصلحه.'],
      ]],
      ['الوقاية وحفظ الصحة', [
        ['كلوا واشربوا ولا تسرفوا', 'الاعتدال في الطعام', [7, 31], 'الطب/تسرفوا', 'أباح الله الطيبات ونهى عن الإسراف. وذكر بعض المفسرين أن هذه الآية جمعت أصول حفظ الصحة.', 'اعتدل في طعامك وشرابك، فالإسراف ضرر على البدن.'],
        ['يخرج من بطونها شراب … فيه شفاء للناس', 'العسل', [16, 68, 69], 'شفاء/العسل', 'أخبر الله أن في العسل شفاء للناس، وجمهور المفسرين على أن الضمير في «فيه» يعود إلى العسل.', 'العسل من الطيبات النافعة، ولا يُغني ذلك عن استشارة الطبيب في المرض.'],
        ['ولا تلقوا بأيديكم إلى التهلكة', 'حفظ النفس', [2, 195], 'التهلكة', 'نهى الله عن إلقاء النفس في التهلكة، وحفظ النفس من مقاصد الشريعة.', 'تجنّب ما يضر بدنك، وخذ بأسباب السلامة.'],
        ['إنما الخمر والميسر … رجس', 'تحريم المسكرات', [5, 90, 91], 'الخمر/رجس', 'حرّم الله الخمر لما فيها من فساد العقل والبدن، وما توقعه من العداوة والبغضاء.', 'ابتعد عن كل مسكر ومخدر، فهو هلاك للعقل والبدن.'],
        ['حرمت عليكم الميتة والدم ولحم الخنزير', 'طهارة المطعوم', [5, 3], 'الميتة/الدم', 'حرّم الله الخبائث من المطعومات، وأباح الطيبات.', 'تحرَّ الحلال الطيب في طعامك.'],
        ['ويسألونك عن المحيض قل هو أذى', 'الطهارة وحفظ الأبدان', [2, 222], 'المحيض/أذى', 'سمّى الله المحيض أذى، وأمر باعتزال النساء فيه، وأثنى على المتطهرين.', 'الطهارة عبادة ووقاية معاً.'],
        ['وثيابك فطهر', 'النظافة', [74, 4], 'الثياب/طهارة', 'من أوائل ما نزل: الأمر بتطهير الثياب، وفسّره كثير من السلف بتطهير العمل والنفس أيضاً.', 'احرص على نظافة بدنك وثوبك ومكانك.'],
      ]],
    ] },
};
function theme(id) {
  const T0 = THEMES[id]; let k = 0;
  V(`<div class="stack ulum theme th-${id}">
    <section class="u-hero"><span class="eyebrow">${T0.ey}</span><h1>${T0.t}</h1><p class="lead">${T0.lead}</p></section>
    <nav class="panel u-index th-index" aria-label="الفهرس"><h2>الفهرس</h2>${T0.groups.map(([g, items], gi) => `<details${gi === 0 ? ' open' : ''}><summary>${g} <em>${n(items.length)}</em></summary><ol>${items.map(it => { k++; return `<li><a href="#${id}" data-tj="${id}-${k}"><span class="u-n">${n(k)}</span>${it[0]}</a></li>`; }).join('')}</ol></details>`).join('')}</nav>
    ${(() => { let j = 0; return T0.groups.map(([g, items]) => `<section class="th-group"><h2 class="th-gt">${g}</h2>${items.map(([t, sub, r, kw, tx, use]) => { j++; const [s, a, b] = r, ix = idxOf(s, a); const ays = []; const last = Math.min(b || a, a + 3); for (let q = a; q <= last; q++) { const i = idxOf(s, q); if (i >= 0) ays.push(ayahHTML(i, null, false)); } if ((b || a) > last) ays.push(`<a class="btn th-more" href="#a${s}-${last + 1}">أكمل الآيات في المصحف</a>`);
      return `<details class="u-ch panel th-item" id="${id}-${j}"><summary><span class="u-n">${n(j)}</span><span class="u-t">${t}<small>${sub}</small></span></summary>
      <div class="u-body stack tight"><div class="u-ref">${refLink(ix)}${b ? `<span>–${n(b)}</span>` : ''}</div><div class="th-ay">${ays.join('')}</div>
      <p class="u-intro">${esc(tx)}</p>
      <div class="u-tf" data-ev="${s}|${a}|${esc(kw)}"><p class="muted small">جارٍ تحميل التفسير…</p></div>
      ${use ? `<div class="th-use"><b>${T0.ul || 'كيف تستعمله'}</b><p>${esc(use)}</p></div>` : ''}</div></details>`; }).join('')}</section>`).join(''); })()}
    <p class="muted small">${T0.note}</p>
  </div>`);
  const load = d => { if (d.open) d.querySelectorAll('.u-tf[data-ev]:not([data-done])').forEach(el => { el.dataset.done = 1; ulumEvidence(el); }); };
  $$('.th-item').forEach(d => d.addEventListener('toggle', () => load(d)));
  $$('[data-tj]').forEach(a => a.onclick = e => { e.preventDefault(); const d = $('#' + a.dataset.tj); d.open = true; d.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
}
function duaa() { theme('duaa'); }
function nisaa() { theme('nisaa'); }
function rijal() { theme('rijal'); }
/* بيانات TAWHID في mods/tawhid.js: تُحمَّل عند أول فتح للقسم */
/* ================= التوحيد في القرآن الكريم: معناه وأقسامه وبراهينه، ودعوة الرسل إليه، ونقيضه الشرك، وثمراته
   نص الآيات بلفظ مصحف المدينة (مجمع الملك فهد، الإصدار ١٨) وبخطه، والأحاديث مقتطعة بلفظها من الكتب الستة المضمّنة (data/hadith)،
   ونقول المفسرين بلفظها من data/t؛ والبيانات تُبنى بسكربت من هذه المصادر، فلا يُكتب نص منسوب باليد. */
function tawhid() {
  if (!needMod('tawhid')) return;
  const D = TAWHID, enOn = LANG !== 'ar', bk = k => (HAD_BOOKS[k] || [k])[0];
  const AR = x => String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const num = k => LANG === 'ar' ? AR(k) : k;
  const ayLine = i => { const a = Q.ayat[i]; return `<div class="ayah tw-q"><span class="tw-t">${esc(D.ay[i] || ayahText(i))}</span> <span class="num tw-n" data-ayah="${i}" title="${esc(ref(i))}">${AR(a[1])}</span></div>`; };
  const ays = ([s, a, b]) => { const o = [], last = Math.min(b || a, a + 6); for (let q = a; q <= last; q++) { const i = idxOf(s, q); if (i >= 0) o.push(ayLine(i)); } if ((b || a) > last) o.push(`<a class="btn th-more" href="#a${s}-${last + 1}">أكمل الآيات في المصحف</a>`); return o.join(''); };
  const refOf = r => `${refLink(idxOf(r[0], r[1]))}${r[2] ? `<span>–${n(r[2])}</span>` : ''}`;
  const ayCard = it => `<article class="tw-ay"><h3>${it.t}</h3><div class="u-ref">${refOf(it.r)}</div>
    <div class="tw-ays">${ays(it.r)}</div><p class="tw-note">${esc(it.n)}</p>
    <div class="tw-links"><a class="btn" href="#pa${idxOf(it.r[0], it.r[1])}"><svg><use href="#i-book"/></svg>افتح في المصحف</a>${it.h ? `<a class="btn" href="#tawhid" data-twh="${it.h}">الحديث بتخريجه</a>` : ''}</div></article>`;
  const hCard = h => `<article class="tw-h" id="twh-${h.id}"><h3>${h.t}</h3>
    <blockquote class="tw-matn notranslate" translate="no" lang="ar" dir="rtl">${esc(h.x)}</blockquote>
    ${enOn ? `<div class="tw-en"><b>معنى الحديث بالإنجليزية</b><p class="notranslate" translate="no" lang="en" dir="ltr">${esc(h.en)}</p></div>` : ''}
    <p class="tw-tx"><span>رواه</span> ${h.src.map(([b, k]) => `<b>${bk(b)}</b> <span class="num">(${num(k)})</span>`).join(' · ')}</p>
    ${h.gr || h.dg ? `<p class="tw-gr"><span>درجته</span> ${h.gr ? `<em class="tw-badge">${h.gr}</em>` : ''}${h.dg ? `<span class="tw-dg notranslate" translate="no">${esc(h.dg.replace(/[؛\s]+$/, ''))}</span>` : ''}</p>` : ''}
    <div class="th-use"><b>فقه الحديث</b><p>${esc(h.f)}</p></div></article>`;
  const qCard = q => { const b = TF.find(x => x.key === q.bk);
    return `<figure class="qs-quote tw-qt"><blockquote class="notranslate" translate="no" lang="ar" dir="rtl">${esc(q.x)}</blockquote>
    ${enOn ? `<p class="tw-qen notranslate" translate="no" lang="en" dir="ltr">${esc(q.en)}</p>` : ''}
    <figcaption><b>${q.w}</b> · <span>نقل بلفظه من</span> <span>${esc(b ? b.title : q.bk)}</span> · <span>عند تفسير</span> ${refLink(idxOf(q.s, q.ay))}</figcaption>
    <p class="tw-note small">${esc(q.n)}</p></figure>`; };
  const body = c => { const hs = D.h.filter(h => h.ch === c.id), qs = D.q.filter(q => q.ch === c.id);
    return `<div class="tw-grid">${c.ay.map(ayCard).join('')}</div>
      ${hs.length ? `<h3 class="tw-sub"><svg><use href="#i-scroll"/></svg>من السنة الصحيحة</h3><div class="tw-grid">${hs.map(hCard).join('')}</div>` : ''}
      ${qs.length ? `<h3 class="tw-sub"><svg><use href="#i-book"/></svg>من أقوال المفسرين</h3><div class="tw-grid">${qs.map(qCard).join('')}</div>` : ''}`; };
  const kinds = `<section class="panel tw-kinds"><h2>أقسام التوحيد</h2>
    <div class="tw-kgrid">${D.k.map((k, i) => { const ix = idxOf(k.r[0], k.r[1]); return `<div class="tw-k tw-k${i + 1}"><span class="tw-kn">${n(i + 1)}</span><b>${k.t}</b><p>${esc(k.d)}</p>
      <span class="tw-kay"><small>الشاهد</small> ${refLink(ix)}</span><span class="tw-ko">${esc(k.o)}</span><a class="tw-kgo" href="#tawhid" data-twj="${k.id}">اقرأ الباب</a></div>`; }).join('')}</div>
    <p class="muted small">${esc('تقسيم استقرائي من نصوص القرآن ذكره أهل العلم للتعليم، وهو تقسيم ثلاثي مشهور؛ ومنهم من جعله قسمين: توحيد المعرفة والإثبات (الربوبية والأسماء والصفات)، وتوحيد الطلب والقصد (الألوهية). والمعنى واحد.')}</p></section>`;
  V(`<div class="stack ulum tw">
    <section class="u-hero tw-hero"><span class="eyebrow">اقرأ وتدبّر</span><h1>التوحيد في القرآن الكريم</h1>
      <p class="lead">إفراد الله بالربوبية والألوهية والأسماء والصفات من آيات القرآن: معناه وأقسامه وبراهينه، ودعوة الرسل إليه، ونقيضه الشرك، وثمراته، بالأحاديث الصحيحة وأقوال المفسرين.</p>
      <div class="tw-stats"><span><b class="num">${n(D.nay)}</b> <span>آية</span></span><span><b class="num">${n(D.h.length)}</b> <span>حديثاً</span></span><span><b class="num">${n(D.q.length)}</b> <span>نقلاً</span></span><span><b class="num">${n(D.ch.length)}</b> <span>باباً</span></span></div></section>
    ${kinds}
    <nav class="panel u-index" aria-label="الفهرس"><h2>الفهرس</h2><ol>${D.ch.map((c, i) => `<li><a href="#tawhid" data-twj="${c.id}"><span class="u-n">${n(i + 1)}</span>${c.t}</a></li>`).join('')}</ol></nav>
    ${D.ch.map((c, i) => `<details class="u-ch panel tw-ch" id="tw-${c.id}"${i === 0 ? ' open' : ''}><summary><span class="u-n">${n(i + 1)}</span><span class="u-t">${c.t}</span></summary>
      <div class="u-body stack tight"><p class="u-intro">${esc(c.d)}</p>${body(c)}</div></details>`).join('')}
    <p class="muted small">نصوص الآيات بلفظ مصحف المدينة النبوية (مجمع الملك فهد، الإصدار ١٨) وبخطه، ونصوص الأحاديث من الكتب الستة المضمّنة بترقيمها، ونقول المفسرين بلفظها من كتبهم المضمّنة؛ أما التمهيدات والفوائد فصياغة موجزة. وأحكام أحاديث السنن من المحدثين كما وردت في النسخة المضمّنة.</p>
  </div>`);
  const go = el => { if (!el) return; const d = el.closest('details'); if (d) d.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $$('[data-twj]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#tw-' + a.dataset.twj)); });
  $$('[data-twh]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#twh-' + a.dataset.twh)); });
}
views.tawhid = tawhid;
function shifa() { theme('shifa'); }
/* بيانات RUQYA في mods/ruqya.js: تُحمَّل عند أول فتح للقسم */
/* ================= التداوي بالقرآن: آيات الشفاء والرقية الشرعية بأدلتها
   نصوص الأحاديث مقتطعة بلفظها من الكتب الستة المضمّنة (data/hadith)، ونقول المفسرين بلفظها من data/t،
   ويُبنى عليه قسم «الأمراض والعلاج» (#shifa) دون تكرار تفسير آياته. */
function ruqya() {
  if (!needMod('ruqya')) return;
  const R = RUQYA, enOn = LANG !== 'ar', bk = k => (HAD_BOOKS[k] || [k])[0];
  const notice = `<aside class="ruq-alert" role="note"><svg><use href="#i-info"/></svg><div><b>تنबيه مهم</b><p>هذا القسم بيان شرعي لهدي القرآن والسنة في الرقية، وليس استشارة طبية ولا وصفة علاج. الرقية لا تغني عن الطبيب ولا تؤخر مراجعته، ومن وجد عرضاً طارئاً أو مستمراً فليبادر إلى الطبيب المختص، مع الرقية والدعاء.</p></div></aside>`;
  const ays = ([s, a, b]) => { const o = [], last = Math.min(b || a, a + 6); for (let q = a; q <= last; q++) { const i = idxOf(s, q); if (i >= 0) o.push(ayahHTML(i, null, false)); } if ((b || a) > last) o.push(`<a class="btn th-more" href="#a${s}-${last + 1}">أكمل الآيات في المصحف</a>`); return o.join(''); };
  const ayCard = (it, c) => `<article class="ruq-ay"><h3>${it.t}</h3><div class="u-ref">${refLink(idxOf(it.r[0], it.r[1]))}${it.r[2] ? `<span>–${n(it.r[2])}</span>` : ''}</div>
    <div class="th-ay">${ays(it.r)}</div><p class="ruq-note">${esc(it.n)}</p>
    <div class="ruq-links">${c.id === 'asl' && THEMES.shifa ? `<a class="btn" href="#shifa"><svg><use href="#i-heal"/></svg>تفسيرها ومسائلها في قسم الأمراض والعلاج</a>` : ''}${it.h ? `<a class="btn" href="#ruqya" data-ruqh="${it.h}">الحديث بتخريجه</a>` : ''}</div></article>`;
  const hCard = h => `<article class="ruq-h" id="ruqh-${h.id}"><h3>${h.t}</h3>
    <blockquote class="ruq-matn notranslate" translate="no" lang="ar" dir="rtl">${esc(h.x)}</blockquote>
    ${enOn ? `<div class="ruq-en"><b>معنى الحديث بالإنجليزية</b><p class="notranslate" translate="no" lang="en" dir="ltr">${esc(h.en)}</p></div>` : ''}
    <p class="ruq-tx"><span>رواه</span> ${h.src.map(([b, k]) => `<b>${bk(b)}</b> <span class="num">(${LANG === 'ar' ? k.replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : k})</span>`).join(' · ')}</p>
    ${h.gr || h.dg ? `<p class="ruq-gr"><span>درجته</span> ${h.gr ? `<em class="ruq-badge">${h.gr}</em>` : ''}${h.dg ? `<span class="ruq-dg">${esc(h.dg.replace(/[؛\s]+$/, ''))}</span>` : ''}</p>` : ''}
    <div class="th-use"><b>فقه الحديث</b><p>${esc(h.f)}</p></div></article>`;
  const qCard = q => { const b = q.bk && TF.find(x => x.key === q.bk);
    return `<figure class="qs-quote ruq-q"><blockquote class="notranslate" translate="no" lang="ar" dir="rtl">${esc(q.x)}</blockquote>
    ${enOn ? `<p class="ruq-qen notranslate" translate="no" lang="en" dir="ltr">${esc(q.en)}</p>` : ''}
    <figcaption><b>${q.w}</b> · ${b ? `<span>نقل بلفظه من</span> <span>${esc(b.title)}</span> · <span>عند تفسير</span> ${refLink(idxOf(q.s, q.ay))}` : `<span>${q.ref}</span> <small class="muted">من كتاب غير مضمّن في مشكاة، يُراجع في مطبوعاته</small>`}</figcaption>
    <p class="ruq-note">${esc(q.n)}</p></figure>`; };
  const list = (arr, cls) => `<ol class="ruq-list ${cls}">${arr.map(([t, d]) => `<li><b>${t}</b><p>${esc(d)}</p></li>`).join('')}</ol>`;
  const body = c => {
    if (c.ay) return `<div class="ruq-grid">${c.ay.map(it => ayCard(it, c)).join('')}</div>`;
    if (c.id === 'ulama') return `<div class="ruq-grid">${R.q.map(qCard).join('')}</div>`;
    if (c.id === 'dawabit') return list(R.rules, 'ruq-rules');
    if (c.id === 'kayf') return list(R.steps, 'ruq-steps');
    const hs = R.h.filter(h => h.ch === c.id).map(hCard).join('');
    return (c.id === 'mahadhir' ? list(R.warn, 'ruq-warn') : '') + `<div class="ruq-grid">${hs}</div>`;
  };
  const nAy = R.ch.reduce((t, c) => t + (c.ay || []).length, 0);
  V(`<div class="stack ulum ruq">
    <section class="u-hero ruq-hero"><span class="eyebrow">احفظ وتعبّد</span><h1>التداوي بالقرآن: الرقية الشرعية</h1>
      <p class="lead">آيات الشفاء والرقية الشرعية وأدلتها من الكتاب والسنة الصحيحة، بتخريج الأحاديث، وأقوال العلماء بمصادرها، وضوابط الرقية المشروعة وكيفيتها.</p>
      <div class="ruq-stats"><span><b class="num">${n(nAy)}</b> <span>آية</span></span><span><b class="num">${n(R.h.length)}</b> <span>حديثاً</span></span><span><b class="num">${n(R.q.length)}</b> <span>نقلاً</span></span></div></section>
    ${notice}
    <nav class="panel u-index" aria-label="الفهرس"><h2>الفهرس</h2><ol>${R.ch.map((c, i) => `<li><a href="#ruqya" data-ruqj="${c.id}"><span class="u-n">${n(i + 1)}</span>${c.t}</a></li>`).join('')}</ol></nav>
    ${R.ch.map((c, i) => `<details class="u-ch panel ruq-ch" id="ruq-${c.id}"${i === 0 ? ' open' : ''}><summary><span class="u-n">${n(i + 1)}</span><span class="u-t">${c.t}</span></summary>
      <div class="u-body stack tight"><p class="u-intro">${esc(c.d)}</p>${body(c)}</div></details>`).join('')}
    ${notice}
    <p class="muted small">نصوص الآيات من المصحف، ونصوص الأحاديث من الكتب الستة المضمّنة بترقيمها، ونقول المفسرين بلفظها، والتمهيدات والفوائد صياغة موجزة. وأحكام أحاديث السنن من المحدثين كما وردت في النسخة المضمّنة.</p>
  </div>`);
  const go = el => { const d = el.closest('details'); if (d) d.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $$('[data-ruqj]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#ruq-' + a.dataset.ruqj)); });
  $$('[data-ruqh]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#ruqh-' + a.dataset.ruqh)); });
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

/* بيانات TAAM في mods/taam.js: تُحمَّل عند أول فتح للقسم */
/* ================= الفاكهة والطعام في القرآن الكريم: ما سمّاه القرآن من الثمار والأطعمة والأشربة، وأحكام الحلال والطيبات، وآداب الطعام وترك الإسراف، وشكر النعمة وإطعام الطعام
   نص الآيات بلفظ مصحف المدينة (مجمع الملك فهد، الإصدار ١٨) وبخطه، والأحاديث مقتطعة بلفظها من الكتب الستة المضمّنة (data/hadith)،
   ونقول المفسرين بلفظها من data/t؛ والبيانات تُبنى بسكربت من هذه المصادر، فلا يُكتب نص منسوب باليد، ولا يُنسب إلى طعام أثر علاجي بغير نص. */
function taam() {
  if (!needMod('taam')) return;
  const D = TAAM, enOn = LANG !== 'ar', bk = k => (HAD_BOOKS[k] || [k])[0];
  const AR = x => String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const num = k => LANG === 'ar' ? AR(k) : k;
  const ayLine = i => { const a = Q.ayat[i]; return `<div class="ayah tm-q"><span class="tm-t">${esc(D.ay[i] || ayahText(i))}</span> <span class="num tm-n" data-ayah="${i}" title="${esc(ref(i))}">${AR(a[1])}</span></div>`; };
  const ays = ([s, a, b]) => { const o = [], last = Math.min(b || a, a + 6); for (let q = a; q <= last; q++) { const i = idxOf(s, q); if (i >= 0) o.push(ayLine(i)); } if ((b || a) > last) o.push(`<a class="btn th-more" href="#a${s}-${last + 1}">أكمل الآيات في المصحف</a>`); return o.join(''); };
  const refOf = r => `${refLink(idxOf(r[0], r[1]))}${r[2] ? `<span>–${n(r[2])}</span>` : ''}`;
  const ayCard = it => `<article class="tm-ay"><h3>${it.t}</h3><div class="u-ref">${refOf(it.r)}</div>
    <div class="tm-ays">${ays(it.r)}</div><p class="tm-note">${esc(it.n)}</p>
    <div class="tm-links"><a class="btn" href="#pa${idxOf(it.r[0], it.r[1])}"><svg><use href="#i-book"/></svg>افتح في المصحف</a>${it.h ? `<a class="btn" href="#taam" data-tmh="${it.h}">الحديث بتخريجه</a>` : ''}</div></article>`;
  const hCard = h => `<article class="tm-h" id="tmh-${h.id}"><h3>${h.t}</h3>
    <blockquote class="tm-matn notranslate" translate="no" lang="ar" dir="rtl">${esc(h.x)}</blockquote>
    ${enOn ? `<div class="tm-en"><b>معنى الحديث بالإنجليزية</b><p class="notranslate" translate="no" lang="en" dir="ltr">${esc(h.en)}</p></div>` : ''}
    <p class="tm-tx"><span>رواه</span> ${h.src.map(([b, k]) => `<b>${bk(b)}</b> <span class="num">(${num(k)})</span>`).join(' · ')}</p>
    ${h.gr || h.dg ? `<p class="tm-gr"><span>درجته</span> ${h.gr ? `<em class="tm-badge">${h.gr}</em>` : ''}${h.dg ? `<span class="tm-dg notranslate" translate="no">${esc(h.dg.replace(/[؛\s]+$/, ''))}</span>` : ''}</p>` : ''}
    <div class="th-use"><b>فقه الحديث</b><p>${esc(h.f)}</p></div></article>`;
  const qCard = q => { const b = TF.find(x => x.key === q.bk);
    return `<figure class="qs-quote tm-qt"><blockquote class="notranslate" translate="no" lang="ar" dir="rtl">${esc(q.x)}</blockquote>
    ${enOn ? `<p class="tm-qen notranslate" translate="no" lang="en" dir="ltr">${esc(q.en)}</p>` : ''}
    <figcaption><b>${q.w}</b> · <span>نقل بلفظه من</span> <span>${esc(b ? b.title : q.bk)}</span> · <span>عند تفسير</span> ${refLink(idxOf(q.s, q.ay))}</figcaption>
    <p class="tm-note small">${esc(q.n)}</p></figure>`; };
  const body = c => { const hs = D.h.filter(h => h.ch === c.id), qs = D.q.filter(q => q.ch === c.id);
    return `<div class="tm-grid">${c.ay.map(ayCard).join('')}</div>
      ${hs.length ? `<h3 class="tm-sub"><svg><use href="#i-scroll"/></svg>من السنة الصحيحة</h3><div class="tm-grid">${hs.map(hCard).join('')}</div>` : ''}
      ${qs.length ? `<h3 class="tm-sub"><svg><use href="#i-book"/></svg>من أقوال المفسرين</h3><div class="tm-grid">${qs.map(qCard).join('')}</div>` : ''}`; };
  const cname = Object.fromEntries(D.cats);
  const foods = `<section class="panel tm-foods"><h2>ما سمّاه القرآن من الطعام والشراب</h2><p class="muted small">اضغط على أي صنف لتقرأ آيته وبابه.</p>
    <div class="tm-chips" role="group"><button type="button" class="tm-chip on" data-tmc="">الكل</button>${D.cats.map(([id, t]) => `<button type="button" class="tm-chip" data-tmc="${id}">${t}</button>`).join('')}</div>
    <div class="tm-fgrid">${D.k.map(k => { const ix = idxOf(k.r[0], k.r[1]); return `<div class="tm-f tm-c-${k.c}" data-c="${k.c}"><span class="tm-fc">${cname[k.c]}</span><b>${k.t}</b><p>${esc(k.d)}</p>
      <span class="tm-kay"><small>الشاهد</small> ${refLink(ix)}</span><a class="tm-kgo" href="#taam" data-tmj="${k.c}">اقرأ الباب</a></div>`; }).join('')}</div></section>`;
  const note = `<div class="tm-warn" role="note"><b>تنبيه</b><p>هذا القسم يعرض ما ورد في القرآن والسنة الصحيحة وأقوال المفسرين بنصوصها، وليس نصيحة طبية؛ وما ورد من ذكر الشفاء نقتصر فيه على لفظ النص دون زيادة، ولا يغني عن مراجعة الطبيب المختص.</p></div>`;
  V(`<div class="stack ulum tm">
    <section class="u-hero tm-hero"><span class="eyebrow">ابحث وحقّق</span><h1>الفاكهة والطعام في القرآن الكريم</h1>
      <p class="lead">الفواكه والأطعمة التي سمّاها القرآن بآياتها، وأحكام الطعام في الحلال والطيبات، وآدابه والاعتدال فيه، وشكر النعمة وإطعام الطعام، بالأحاديث الصحيحة وأقوال المفسرين.</p>
      <div class="tm-stats"><span><b class="num">${n(D.k.length)}</b> <span>صنفاً</span></span><span><b class="num">${n(D.nay)}</b> <span>آية</span></span><span><b class="num">${n(D.h.length)}</b> <span>حديثاً</span></span><span><b class="num">${n(D.q.length)}</b> <span>نقلاً</span></span><span><b class="num">${n(D.ch.length)}</b> <span>باباً</span></span></div></section>
    ${note}
    ${foods}
    <nav class="panel u-index" aria-label="الفهرس"><h2>الفهرس</h2><ol>${D.ch.map((c, i) => `<li><a href="#taam" data-tmj="${c.id}"><span class="u-n">${n(i + 1)}</span>${c.t}</a></li>`).join('')}</ol></nav>
    ${D.ch.map((c, i) => `<details class="u-ch panel tm-ch" id="tm-${c.id}"${i === 0 ? ' open' : ''}><summary><span class="u-n">${n(i + 1)}</span><span class="u-t">${c.t}</span></summary>
      <div class="u-body stack tight"><p class="u-intro">${esc(c.d)}</p>${body(c)}</div></details>`).join('')}
    <p class="muted small">نصوص الآيات بلفظ مصحف المدينة النبوية (مجمع الملك فهد، الإصدار ١٨) وبخطه، ونصوص الأحاديث من الكتب الستة المضمّنة بترقيمها، ونقول المفسرين بلفظها من كتبهم المضمّنة؛ أما التمهيدات والفوائد فصياغة موجزة. وأحكام أحاديث السنن من المحدثين كما وردت في النسخة المضمّنة.</p>
  </div>`);
  const go = el => { if (!el) return; const d = el.closest('details'); if (d) d.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $$('[data-tmj]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#tm-' + a.dataset.tmj)); });
  $$('[data-tmh]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#tmh-' + a.dataset.tmh)); });
  $$('[data-tmc]').forEach(b => b.onclick = () => { const c = b.dataset.tmc; $$('[data-tmc]').forEach(x => x.classList.toggle('on', x === b)); $$('.tm-f').forEach(f => { f.hidden = !!c && f.dataset.c !== c; }); });
}
views.taam = taam;
/* ================= mushaf */
function mushaf() {
  let sort = 'n', dir = 1, filt = '';
  const draw = () => {
    const rows = Q.surahs.filter(s => !filt || s.type === filt).sort((a, b) => (a[sort] > b[sort] ? 1 : -1) * dir);
    $('#stbl').innerHTML = rows.map(s => `<tr class="clk" data-mps="${s.n}"><td>${n(s.n)}</td><td><b>${s.name}</b> <a class="chip" href="#s${s.n}">دراسة</a></td><td>${s.type}</td><td>${n(s.ayas)}</td><td>${n(s.words)}</td><td>${n(s.letters)}</td><td>${n(Q.ayat[s.first][5])}</td><td>${n(Q.ayat[s.first][6])}</td></tr>`).join('');
  };
  V(`<div class="stack"><div><div class="eyebrow">المصحف وفهرس السور</div><h1>السور المئة والأربع عشرة</h1><p class="lead">اضغط على السورة لقراءتها، وعلى أي كلمة لمعرفة جذرها ومعناها، وعلى رقم الآية لتفسيرها وحفظها ومشاركتها.</p></div>
  <div class="toolbar"><a class="btn pri" href="${ST.last != null ? `#pa${ST.last}` : '#p1'}"><svg><use href="#i-book"/></svg>${ST.last != null ? `أكمل القراءة في المصحف: ${esc(ref(ST.last))}` : 'اقرأ المصحف متصلاً من أوله'}</a>${ST.last != null ? '<a class="btn" href="#p1">من أول المصحف</a>' : ''}</div>
  <p class="muted small" style="margin:0">القراءة المتصلة على صفحات مصحف المدينة النبوية (٦٠٤ صفحات)، بخط مجمع الملك فهد ونصه. اضغط اسم السورة لقراءتها في المصحف، أو «دراسة» لعرض ألفاظها وتفسيرها آيةً آية.</p>
  <div class="toolbar"><div class="seg" id="tseg"><button aria-pressed="true" data-f="">الكل</button><button aria-pressed="false" data-f="مكية">المكية</button><button aria-pressed="false" data-f="مدنية">المدنية</button></div>
   <select id="juzSel" aria-label="الانتقال إلى جزء"><option value="">الانتقال إلى جزء…</option>${Array.from({length: 30}, (_, j) => `<option value="${j+1}">الجزء ${n(j+1)}</option>`).join('')}</select></div>
  <div class="tablebox"><table><thead><tr>${[['n','م'],['name','السورة'],['type','النزول'],['ayas','الآيات'],['words','الكلمات'],['letters','الحروف'],['juz','الجزء'],['page','الصفحة']].map(([k, l]) => `<th data-sort="${k}">${l}</th>`).join('')}</tr></thead><tbody id="stbl"></tbody></table></div></div>`);
  draw();
  $('#view thead').onclick = e => { const k = e.target.dataset.sort; if (!k || k === 'juz' || k === 'page') return; dir = sort === k ? -dir : 1; sort = k; draw(); };
  $('#stbl').onclick = e => { if (e.target.closest('a')) return; const r = e.target.closest('[data-mps]'); if (r) location.hash = 'ps' + r.dataset.mps; };
  $('#tseg').onclick = e => { const b = e.target.closest('button'); if (!b) return; filt = b.dataset.f; $('#tseg').querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', x === b)); draw(); };
  $('#juzSel').onchange = e => { const j = +e.target.value; if (!j) return; const i = Q.ayat.findIndex(a => a[5] === j); location.hash = `pa${i}`; };
}
/* المصحف المتصل (صفحات مصحف المدينة): يُحمَّل عند أول فتح من mushaf.js */
function mpOpen(p, opt) {
  INTEGRITY['data/mushaf.txt'] = '183ddc3b7ae7fdc81416991f24f580cd'; // بصمة ملف المصحف المتصل: نص مجمع الملك فهد وصفحات مصحف المدينة
  if (window.mushafRead) return mushafRead(p, opt);
  if (!mpOpen.s) { V(`<p class="loading">جارٍ فتح المصحف…</p>`); mpOpen.s = document.createElement('script'); mpOpen.s.src = 'mushaf.js'; document.head.appendChild(mpOpen.s); }
  mpOpen.s.addEventListener('load', () => mushafRead(p, opt), { once: true });
  mpOpen.s.addEventListener('error', () => { mpOpen.s.remove(); mpOpen.s = null; V(`<p class="loading">تعذّر فتح المصحف، تحقق من الاتصال ثم أعد المحاولة.</p>`); }, { once: true });
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
    <a class="btn pri" href="#ps${sn}"><svg><use href="#i-book"/></svg>اقرأها في المصحف</a><a class="btn" href="#hifz" data-hifz="${sn}"><svg><use href="#i-mic"/></svg>احفظ هذه السورة</a>${IS_PWA ? `<button class="btn" id="playSurah"><svg><use href="#i-play"/></svg>استمع</button>` : ''}</div></div>
    <section class="panel"><h3>أكثر ألفاظ السورة وروداً</h3><div class="pill-row" style="margin-top:8px">${top.map(([l, c]) => `<a class="chip acc" data-lem="${l}">${esc(W.lemmas[l][0])} · ${n(c)}</a>`).join('')}</div></section>
    <section class="panel" id="reader"><p class="muted small" style="margin:0 0 6px">اضغط أي كلمة لمعرفة جذرها ووزنها ومواضعها، أو رقم الآية لعرض تفسيرها.</p>${bas}
    ${ay.map(i => `<div class="occ" id="ay${i}" data-i="${i}">${ayahHTML(i)}</div>`).join('')}</section></div>`);
  if (focusA) { const el = $('#ay' + (s.first + focusA - 1)); if (el) { el.scrollIntoView({ block: 'center' }); el.style.background = 'var(--accent-soft)'; } }
  else window.scrollTo(0, 0);
  if (readObs) readObs.disconnect();
  readObs = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { ST.last = +e.target.dataset.i; logRead(ST.last); clearTimeout(surah.t); surah.t = setTimeout(save, 800); } }, { rootMargin: '-40% 0px -55% 0px' });
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
    body.innerHTML = h + (id === 'qasas' && it.r ? '<div class="qx"></div>' : '') + '<div class="occs"></div>'; const box = body.querySelector('.occs');
    if (id === 'qasas' && it.r) qasasBlock(it, body.querySelector('.qx'));
    if (it.w || (!it.r && it.a)) { const hl = new Set(it.w || []);
      if (it.w) box.insertAdjacentHTML('beforeend', `<div style="margin:8px 0">${distBar(it.w)}</div>`);
      box.insertAdjacentHTML('beforeend', `<h3 style="margin-top:10px">مواضع الورود</h3><div class="o1"></div>`); renderOcc(box.querySelector('.o1'), it.a, hl, 40); }
    if (it.r) { box.insertAdjacentHTML('beforeend', `<h3 style="margin-top:14px">${id === 'qasas' ? 'نص القصة في مواضعها من القرآن' : it.w || it.a ? 'المواضع التفصيلية' : 'المواضع'}</h3>` + it.r.map(([s, e], j) => `<div class="passage"><div class="ref"><a data-ayah="${s}">${esc(ref(s))}${e > s ? ' – ' + n(Q.ayat[e][1]) : ''}</a><span>· ${n(e-s+1)} ${plural(e-s+1,'آية','آيات','آية')}</span></div><div class="pbody"></div></div>`).join(''));
      box.querySelectorAll('.passage').forEach((p, j) => { const [s, e] = it.r[j]; const pb = p.querySelector('.pbody');
        const fill = lim => { let h = ''; for (let i = s; i <= Math.min(e, s + lim - 1); i++) h += ayahHTML(i, null);
          if (e - s + 1 > lim) h += `<button class="btn" data-all>عرض بقية المقطع (${n(e-s+1-lim)} آية)</button>`; pb.innerHTML = h; pb.querySelector('[data-all]')?.addEventListener('click', () => fill(1e4)); };
        fill(it.r.length > 6 ? 2 : 6); }); }
  }, true);
  if (openName) { const k = c.items.findIndex(x => x.n === openName); const d = k >= 0 && $(`#tpanel details[data-k="${k}"]`); if (d) { d.open = true; setTimeout(() => d.scrollIntoView({ block: 'start' }), 50); } }
}

/* ================= القصص القرآني الموسّع: ملخص مجمّع من كل المواضع بآياته، ونقول بحروفها من أمهات التفاسير، والعبر وتطبيقها في واقعنا */
let QX = null;
const qasasData = () => QX || (QX = gz('data/qasas.txt').catch(e => { QX = null; throw e; }));
const QBOOK = { ibnkathir: ['تفسير ابن كثير', 'تفسير القرآن العظيم، لابن كثير (ت ٧٧٤هـ)'], tabari: ['تفسير الطبري', 'جامع البيان عن تأويل آي القرآن، لابن جرير الطبري (ت ٣١٠هـ)'], qurtubi: ['تفسير القرطبي', 'الجامع لأحكام القرآن، لأبي عبد الله القرطبي (ت ٦٧١هـ)'] };
const rngRef = ([s, e]) => `<a data-ayah="${s}">${esc(ref(s))}${e > s ? '–' + n(Q.ayat[e][1]) : ''}</a>`;
async function qasasBlock(it, el) {
  if (!el) return; el.innerHTML = '<p class="muted small">جارٍ تحميل القصة…</p>';
  let d; try { d = (await qasasData())[it.n]; } catch (e) { el.innerHTML = '<p class="muted small">تعذّر تحميل ملخص القصة. تحقق من الاتصال ثم أعد فتح القصة.</p>'; return; }
  if (!d) { el.innerHTML = ''; return; }
  const yt = 'https://www.youtube.com/results?search_query=' + encodeURIComponent('قصة ' + it.n.replace(/[()]/g, ' ') + ' قصص القرآن');
  el.innerHTML = `<div class="qstory">
    <section class="qs-sum"><h3>القصة في سطور</h3><p class="muted small">مجمّعة من كل مواضعها في القرآن، وكل نقطة موثّقة بآياتها. اضغط رقم الآية لقراءتها وتفسيرها.</p>
      <ol class="qs-steps">${d.s.map(([t, r]) => `<li><span>${esc(t)}</span> <span class="qs-ref">${rngRef(r)}</span></li>`).join('')}</ol></section>
    <section class="qs-books"><h3>من أمهات الكتب</h3><p class="muted small">نصوص منقولة بحروفها من كتب التفسير المضمّنة في المنصة، عند آيات القصة.</p>
      ${d.q.map(([k, i, t]) => `<figure class="qs-quote"><blockquote class="notranslate" translate="no" lang="ar" dir="rtl">${esc(t).replace(/\n/g, '<br>')}</blockquote><figcaption><b>${esc(QBOOK[k][0])}</b> <span class="muted">${esc(QBOOK[k][1])}</span><span class="qs-at">عند ${refLink(i)} · <a data-ayah="${i}">اقرأ التفسير كاملاً</a></span></figcaption></figure>`).join('')}
      <p class="small muted">للتوسع في القصة: ${esc(d.b)}.</p></section>
    <section class="qs-lessons"><h3>العبر والدروس</h3><div class="qs-grid">${d.l.map(([a, b]) => `<div class="qs-lesson"><b>${esc(a)}</b><p><span class="qs-now">في واقعنا اليوم:</span> ${esc(b)}</p></div>`).join('')}</div></section>
    <a class="btn qs-video" href="${yt}" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg><span>شاهد القصة مرئية</span><span class="small muted">بحث في يوتيوب</span></a>
  </div>`;
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
    if (!ARX.test(raw) && I18N.mean) return meanSearch(raw);
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
  const meanSearch = raw => { // بحث بلغة الزائر في ترجمة المعاني المعتمدة المضمّنة
    const STOP = new Set(['the','and','for','that','with','from','this','are','was','were','who','what','which','about','into','have','has','not','but','his','her','they','them','you','your','our','their','its','how','why','when','verses','verse','quran']);
    const ws = raw.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').split(/[^\p{L}\p{N}]+/u).filter(w => w.length > 2 && !STOP.has(w)).map(w => w.length > 5 ? w.slice(0, w.length - 2) : w);
    if (!ws.length) { $('#sres').innerHTML = ''; return; }
    const sc = new Map(); I18N.mean.forEach((t, i) => { const lt = ' ' + t.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '') + ' '; let k = 0; for (const w of ws) if (lt.includes(w)) k += lt.includes(' ' + w) ? 2 : 1; if (k) sc.set(i, k + ws.filter(w => lt.includes(w)).length * 3); });
    const ids = [...sc.keys()].sort((a, b) => sc.get(b) - sc.get(a)), top = ids.length ? sc.get(ids[0]) : 1;
    $('#sres').innerHTML = `<div class="stack"><section class="panel stack tight"><div class="pill-row"><span class="chip acc">${n(ids.length)} آية ذات صلة</span></div><p class="muted small" style="margin:0">بحث في ترجمة معاني القرآن المعتمدة بلغتك، مرتّبة بالأقرب. ويمكنك البحث بالعربية أيضاً.</p></section><section class="panel"><div id="shits"></div></section></div>`;
    if (!ids.length) { $('#shits').innerHTML = '<p class="muted">لم أجد آيات قريبة. جرّب كلمة أخرى قريبة من المعنى.</p>'; return; }
    renderOcc($('#shits'), ids.slice(0, 200), null, 20, i => `<div class="why"><span class="chip">درجة القرب ${n(Math.max(1, Math.round(sc.get(i) / top * 100)))}٪</span></div>`);
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
function topSurahs(ws) { const m = new Map(); ws.forEach(w => m.set(surahOf[w], (m.get(surahOf[w]) || 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([s, c]) => `${Q.surahs[s-1].name}: ${n(c)}`); }
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
/* ================= التثبيت بضغطة والعمل دون إنترنت */
let installEvt = null;
const APPK = LAB ? 'qlab' : 'mishkat';
const lsGet = k => { try { return localStorage.getItem(APPK + ':' + k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(APPK + ':' + k) : localStorage.setItem(APPK + ':' + k, v); } catch (e) {} };
/* زر «ثبّت التطبيق» أعلى كل صفحة وشريط بارز على الجوال: ضغطة واحدة تثبّت التطبيق أيقونةً على الجوال والكمبيوتر، ويختفيان بعد التثبيت أو عند الفتح من الأيقونة */
const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: minimal-ui)').matches || matchMedia('(display-mode: window-controls-overlay)').matches || navigator.standalone === true || document.referrer.startsWith('android-app://'); } catch (e) { return false; } };
const instHidden = () => !IS_PWA || FILE_MODE || isStandalone() || (!installEvt && lsGet('installed') === '1');
function instTopShow() {
  const hide = instHidden(), b = $('#instTop'), bar = $('#instBar');
  if (b) { b.hidden = hide; b.classList.toggle('ready', !!installEvt); }
  if (bar) { const snooze = +(lsGet('barSnooze') || 0); bar.hidden = hide || Date.now() < snooze; }
}
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; lsSet('installed', null); instTopShow(); });
window.addEventListener('appinstalled', () => { installEvt = null; lsSet('installed', '1'); instTopShow(); toast(`ثُبّت ${BRAND} على جهازك، وتجده بين تطبيقاتك`); offlinePack(); });
async function installApp() {
  if (installEvt) { const e = installEvt; e.prompt(); const r = await e.userChoice.catch(() => null); if (r && r.outcome === 'accepted') { installEvt = null; lsSet('installed', '1'); instTopShow(); offlinePack(); } return; }
  const ua = navigator.userAgent, ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1), android = /Android/.test(ua);
  const safariMac = !ios && /Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg|Firefox/.test(ua), firefox = /Firefox|FxiOS/.test(ua), iosOther = ios && /CriOS|FxiOS|EdgiOS|GSA\//.test(ua);
  const step = (k, t) => `<li><span class="in-n">${n(k)}</span><span>${t}</span></li>`;
  const ios_ = `<h3>على آيفون وآيباد (سفاري)</h3><ol class="in-steps">${step(1, 'اضغط زر المشاركة <b>⬆︎</b> أسفل الشاشة أو أعلاها.')}${step(2, 'اختر <b>«إضافة إلى الشاشة الرئيسية»</b>.')}${step(3, `اضغط <b>«إضافة»</b>، فتظهر أيقونة ${BRAND} بين تطبيقاتك.`)}</ol>`;
  const apk = LAB ? '' : `<p class="in-apk"><a class="btn" href="android/mishkat.apk" download>تنزيل تطبيق أندرويد مباشرة (APK)</a></p>`;
  const and_ = `<h3>على أندرويد (كروم أو سامسونج)</h3><ol class="in-steps">${step(1, 'افتح قائمة المتصفح <b>⋮</b> أعلى الشاشة.')}${step(2, 'اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>.')}${step(3, `اضغط <b>«تثبيت»</b>، فتظهر أيقونة ${BRAND} بين تطبيقاتك.`)}</ol>${apk}`;
  const pc_ = `<h3>على الكمبيوتر (كروم أو إيدج)</h3><ol class="in-steps">${step(1, 'اضغط أيقونة التثبيت <b>⊕</b> في نهاية شريط العنوان، أو افتح القائمة <b>⋮</b>.')}${step(2, `اختر <b>«تثبيت ${BRAND}»</b>، وفي إيدج: التطبيقات ← تثبيت هذا الموقع كتطبيق.`)}${step(3, `يفتح ${BRAND} في نافذته الخاصة، وتجد أيقونته في قائمة البرامج وسطح المكتب.`)}</ol>`;
  const mac_ = `<h3>على ماك (سفاري)</h3><ol class="in-steps">${step(1, 'من قائمة <b>«ملف»</b> اختر <b>«إضافة إلى Dock»</b>.')}${step(2, `اضغط <b>«إضافة»</b>، فتظهر أيقونة ${BRAND} في شريط Dock.`)}</ol>`;
  const first = ios ? ios_ : android ? and_ : safariMac ? mac_ : pc_;
  const others = [ios_, and_, pc_, mac_].filter(x => x !== first).join('');
  openDrawer(`<div class="stack instsheet"><div class="in-head"><img src="icons/icon-192.png" alt="" width="64" height="64"><div><h2>ثبّت ${BRAND} على جهازك</h2><p class="muted small" style="margin:0">أيقونة على الشاشة تفتح التطبيق مباشرة في نافذته الخاصة، ويعمل كاملاً دون إنترنت بعد التثبيت. التثبيت مجاني ولا يحتاج إلى متجر.</p></div></div>
    ${iosOther ? '<p class="note">على آيفون يتم التثبيت من متصفح سفاري. انسخ الرابط وافتحه في سفاري، ثم اتبع الخطوات.</p>' : ''}
    ${firefox && !ios ? '<p class="note">متصفح فايرفوكس لا يدعم تثبيت التطبيقات على الكمبيوتر. افتح الموقع في كروم أو إيدج ثم اضغط زر التثبيت.</p>' : ''}
    ${first}<details class="in-more"><summary>طريقة التثبيت على الأجهزة الأخرى</summary>${others}</details></div>`);
}
/* حزمة العمل دون إنترنت: بعد التثبيت (أو عند الفتح من الأيقونة) تُنزَّل في الخلفية كل التفاسير والأحاديث والقصص ولغة الواجهة ومعاني لغتك، فيعمل التطبيق كاملاً دون اتصال */
const OFF_CACHE = APPK + '-data-v1';
/* ركن التفاسير وأسباب النزول: يُحمَّل عند أول فتحه من tafasir.js */
function tafasirOpen2(sn, an) {
  if (window.tafasirOpen) return tafasirOpen(sn, an);
  if (!tafasirOpen2.s) { V(`<p class="loading">جارٍ فتح الركن…</p>`); tafasirOpen2.s = document.createElement('script'); tafasirOpen2.s.src = 'tafasir.js'; document.head.appendChild(tafasirOpen2.s); }
  tafasirOpen2.s.addEventListener('load', () => tafasirOpen(sn, an), { once: true });
  tafasirOpen2.s.addEventListener('error', () => { tafasirOpen2.s.remove(); tafasirOpen2.s = null; V(`<p class="loading">تعذّر فتح الركن، تحقق من الاتصال ثم أعد المحاولة.</p>`); }, { once: true });
}
views.tafasir = () => tafasirOpen2(0, 0);
function offlineFiles() {
  const f = [...TF.flatMap(b => Array.from({ length: b.chunks }, (_, k) => `data/t/${b.key}/${k}.txt`)), ...Object.keys(HAD_BOOKS).map(k => `data/hadith/${k}.txt`), 'data/qasas.txt', 'tafasir.js', 'data/asbab.txt'];
  if (LANG !== 'ar') f.push(`data/i18n/${LANG}.json`, 'data/i18n/en.json');
  if (I18N.meanCode) f.push(`data/tr/${I18N.meanCode}.txt`);
  return [...new Set(f)];
}
function offlinePack(onProg) {
  if (!IS_PWA || FILE_MODE || !window.caches || !TF) return Promise.resolve(false);
  if (offlinePack.run) { if (onProg) offlinePack.cbs.push(onProg); return offlinePack.run; }
  offlinePack.cbs = onProg ? [onProg] : [];
  const files = offlineFiles(), sig = files.length + ':' + LANG, quiet = !onProg && lsGet('offline') === sig;
  const pill = $('#offPill');
  offlinePack.run = (async () => {
    try { await navigator.storage?.persist?.(); } catch (e) {}
    const cache = await caches.open(OFF_CACHE); let done = 0, failed = 0, i = 0;
    const tick = () => { done++; const p = Math.round(done / files.length * 100); offlinePack.cbs.forEach(cb => cb(done, files.length)); if (pill && !quiet) { pill.hidden = false; pill.textContent = `تجهيز ${BRAND} للعمل دون إنترنت… ${n(p)}٪`; } };
    const worker = async () => { while (i < files.length) { const f = files[i++]; try { if (!(await caches.match(f, { ignoreSearch: true }))) { const r = await fetch(f, { cache: 'no-cache' }); if (r.ok) await cache.put(f, r); else failed++; } } catch (e) { failed++; } tick(); } };
    await Promise.all([worker(), worker(), worker(), worker()]);
    if (pill) pill.hidden = true;
    if (!failed) { if (!quiet) toast(`${BRAND} جاهز الآن للعمل كاملاً دون إنترنت`); lsSet('offline', sig); }
    offlinePack.run = null; return !failed;
  })();
  return offlinePack.run;
}
function offlineAuto() { if (IS_PWA && !FILE_MODE && (isStandalone() || lsGet('installed') === '1') && navigator.onLine !== false) setTimeout(() => offlinePack(), 1500); }
function instBarInit() {
  const bar = $('#instBar'); if (!bar) return;
  $('#instBarGo').onclick = installApp;
  $('#instBarX').onclick = () => { lsSet('barSnooze', String(Date.now() + 3 * 864e5)); bar.hidden = true; };
}
function settings() {
  V(`<div class="stack" style="max-width:860px"><div><div class="eyebrow">الإعدادات</div><h1>الإعدادات والتنزيل</h1></div>
  <section class="panel stack tight"><h3>العرض</h3>
    <div class="toolbar"><span>الوضع:</span><div class="seg" id="thSeg">${[['auto','حسب الجهاز'],['light','فاتح'],['dark','داكن']].map(([k, l]) => `<button aria-pressed="${ST.prefs.theme === k}" data-t="${k}">${l}</button>`).join('')}</div></div>
    <div class="toolbar"><span>حجم خط المصحف:</span><div class="seg" id="szSeg">${[[0.9,'صغير'],[1,'متوسط'],[1.2,'كبير'],[1.45,'كبير جداً']].map(([k, l]) => `<button aria-pressed="${ST.prefs.size === k}" data-s="${k}">${l}</button>`).join('')}</div></div>
    <div class="toolbar"><span>التفسير الافتراضي:</span><select id="tfSel">${TF.map(b => `<option value="${b.key}" ${b.key === ST.prefs.tafsir ? 'selected' : ''}>${b.title}</option>`).join('')}</select></div></section>
  <section class="panel stack tight"><h3>التثبيت والعمل دون إنترنت</h3>
    ${IS_PWA ? `<p style="margin:0">بعد تثبيت التطبيق تُنزَّل التفاسير والأحاديث كلها تلقائياً في الخلفية، فيعمل كاملاً دون إنترنت. ويمكنك تنزيلها الآن من هذا الزر (نحو ٦٠ ميغابايت).</p>
      <div class="toolbar"><button class="btn pri" id="dlAll">تنزيل كل التفاسير للعمل دون إنترنت</button><span id="dlStat" class="muted small"></span></div><div class="meter"><i id="dlBar" style="width:0"></i></div>
      <div class="toolbar"><button class="btn" id="instBtn" ${instHidden() ? 'hidden' : ''}>ثبّت ${BRAND} على هذا الجهاز</button></div>
      <p class="muted small" style="margin:0">على آيفون: افتح الرابط في سفاري، ثم «مشاركة» ثم «إضافة إلى الشاشة الرئيسية». على أندرويد والكمبيوتر: زر التثبيت في المتصفح أو الزر أعلاه.</p>`
      : `<p style="margin:0">هذه نسخة مشكاة على claude.ai. توجد نسخة قابلة للتثبيت على الجوال والكمبيوتر تعمل دون إنترنت وتدعم التسميع بالصوت والاستماع للتلاوة.</p>`}
  </section>
  <section class="panel stack tight"><h3>بياناتك</h3><p class="muted small" style="margin:0">${cloud ? 'تقدّمك محفوظ في حسابك (خاص بك ولا يراه غيرك) ونسخة منه على هذا الجهاز.' : 'تقدّمك محفوظ على هذا الجهاز وحده.'} من «وردي وتقدّمي» تجد علامة التوقف وهدف القراءة اليومي.</p><div class="toolbar"><a class="btn" href="#wird">وردي وتقدّمي</a><a class="btn" href="#whatsnew">ما الجديد</a></div></section>
  <div id="dataMount"></div>
  <section class="panel small muted">الإصدار ٢٫١ · ${IS_PWA ? 'النسخة المستقلة' : 'نسخة claude.ai'}</section></div>`);
  $('#thSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; ST.prefs.theme = b.dataset.t; applyPrefs(); save(); settings(); };
  $('#szSeg').onclick = e => { const b = e.target.closest('button'); if (!b) return; ST.prefs.size = +b.dataset.s; applyPrefs(); save(); settings(); };
  $('#tfSel').onchange = e => { ST.prefs.tafsir = e.target.value; save(); toast('حُفظ التفسير الافتراضي'); };
  progLoad('dataPanel', $('#dataMount'));
  const ib = $('#instBtn'); if (ib) ib.onclick = installApp;
  const da = $('#dlAll'); if (da) da.onclick = async () => {
    da.disabled = true; const ok = await offlinePack((d, t) => { $('#dlBar').style.width = (d / t * 100) + '%'; $('#dlStat').textContent = `${n(d)} من ${n(t)} ملفاً`; });
    $('#dlStat').textContent = ok ? 'اكتمل التنزيل. التفاسير والأحاديث كلها متاحة دون إنترنت.' : 'تعذّر تنزيل بعض الملفات. تحقق من الاتصال ثم أعد المحاولة.'; da.disabled = false;
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





/* بيانات ASNAF في mods/asnaf.js: تُحمَّل عند أول فتح للقسم */
/* ================= أقسام الناس وأنواعهم في القرآن الكريم: التقسيمات الثلاثية الكبرى، والأبرار والفجار، والسعداء والأشقياء، ومن يحبهم الله ومن لا يحبهم، والمستضعفون، وأهل الكتاب، و«ومن الناس»
   نص الآيات بلفظ مصحف المدينة (مجمع الملك فهد، الإصدار ١٨) وبخطه، والأحاديث مقتطعة بلفظها من الصحيحين المضمّنين (data/hadith)،
   ونقول المفسرين بلفظها من data/t؛ والبيانات تُبنى بسكربت من هذه المصادر، فلا يُكتب نص منسوب باليد. */
function asnaf() {
  if (!needMod('asnaf')) return;
  if (!Q) return; // قبل اكتمال تحميل البيانات: يُعاد الرسم تلقائياً بعد التحميل
  const D = ASNAF, enOn = LANG !== 'ar', bk = k => (HAD_BOOKS[k] || [k])[0];
  const AR = x => String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const num = k => LANG === 'ar' ? AR(k) : k;
  const ayLine = i => { const a = Q.ayat[i]; return `<div class="ayah as-q"><span class="as-t">${esc(D.ay[i] || ayahText(i))}</span> <span class="num as-n" data-ayah="${i}" title="${esc(ref(i))}">${AR(a[1])}</span></div>`; };
  const ays = ([s, a, b]) => { const o = [], last = Math.min(b || a, a + 6); for (let q = a; q <= last; q++) { const i = idxOf(s, q); if (i >= 0) o.push(ayLine(i)); } if ((b || a) > last) o.push(`<a class="btn th-more" href="#a${s}-${last + 1}">أكمل الآيات في المصحف</a>`); return o.join(''); };
  const refOf = r => `${refLink(idxOf(r[0], r[1]))}${r[2] ? `<span>–${n(r[2])}</span>` : ''}`;
  const ayCard = it => `<article class="as-ay"><h3>${it.t}</h3><div class="u-ref">${refOf(it.r)}</div>
    <div class="as-ays">${ays(it.r)}</div><p class="as-note">${esc(it.n)}</p>
    <div class="as-links"><a class="btn" href="#pa${idxOf(it.r[0], it.r[1])}"><svg><use href="#i-book"/></svg>افتح في المصحف</a></div></article>`;
  const hCard = h => `<article class="as-h" id="ash-${h.id}"><h3>${h.t}</h3>
    <blockquote class="as-matn notranslate" translate="no" lang="ar" dir="rtl">${esc(h.x)}</blockquote>
    ${enOn ? `<div class="as-en"><b>معنى الحديث بالإنجليزية</b><p class="notranslate" translate="no" lang="en" dir="ltr">${esc(h.en)}</p></div>` : ''}
    <p class="as-tx"><span>رواه</span> ${h.src.map(([b, k]) => `<b>${bk(b)}</b> <span class="num">(${num(k)})</span>`).join(' · ')}</p>
    ${h.gr ? `<p class="as-gr"><span>درجته</span> <em class="as-badge">${h.gr}</em></p>` : ''}
    <div class="th-use"><b>فقه الحديث</b><p>${esc(h.f)}</p></div></article>`;
  const qCard = q => { const b = TF.find(x => x.key === q.bk);
    return `<figure class="qs-quote as-qt"><blockquote class="notranslate" translate="no" lang="ar" dir="rtl">${esc(q.x)}</blockquote>
    ${enOn ? `<p class="as-qen notranslate" translate="no" lang="en" dir="ltr">${esc(q.en)}</p>` : ''}
    <figcaption><b>${q.w}</b> · <span>نقل بلفظه من</span> <span>${esc(b ? b.title : q.bk)}</span> · <span>عند تفسير</span> ${refLink(idxOf(q.s, q.ay))}</figcaption>
    <p class="as-note small">${esc(q.n)}</p></figure>`; };
  const body = c => { const hs = D.h.filter(h => h.ch === c.id), qs = D.q.filter(q => q.ch === c.id);
    return `<div class="as-grid">${c.ay.map(ayCard).join('')}</div>
      ${hs.length ? `<h3 class="as-sub"><svg><use href="#i-scroll"/></svg>من السنة الصحيحة</h3><div class="as-grid">${hs.map(hCard).join('')}</div>` : ''}
      ${qs.length ? `<h3 class="as-sub"><svg><use href="#i-book"/></svg>من أقوال المفسرين</h3><div class="as-grid">${qs.map(qCard).join('')}</div>` : ''}`; };
  const kinds = `<section class="panel as-kinds"><h2>التقسيمات الثلاثية الكبرى</h2>
    <div class="as-kgrid">${D.k.map((k, i) => { const ix = idxOf(k.r[0], k.r[1]); return `<div class="as-k as-k${i + 1}"><span class="as-kn">${n(i + 1)}</span><b>${k.t}</b><p>${esc(k.d)}</p>
      <span class="as-kay"><small>الشاهد</small> ${refLink(ix)}</span><span class="as-ko"><small>الأصناف</small> ${esc(k.o)}</span><a class="as-kgo" href="#asnaf" data-asj="${k.c}">اقرأ الباب</a></div>`; }).join('')}</div>
    <p class="muted small">${esc('لاحظ أن القرآن يقسّم الناس بالإيمان والعمل والمقاصد، لا بالأجناس والأنساب والأموال؛ فكل تقسيم فيه دعوة إلى الارتقاء من صنف إلى صنف أعلى.')}</p></section>`;
  V(`<div class="stack ulum as">
    <section class="u-hero as-hero"><span class="eyebrow">اكتشف وتأمّل</span><h1>أقسام الناس وأنواعهم في القرآن الكريم</h1>
      <p class="lead">كيف قسّم القرآن الناس: مؤمنين وكافرين ومنافقين، وسابقين وأصحاب يمين وأصحاب شمال، وظالماً لنفسه ومقتصداً وسابقاً بالخيرات، وأبراراً وفجاراً، وأصنافاً سمّاها بأوصافها، بالآيات والأحاديث الصحيحة وأقوال المفسرين.</p>
      <div class="as-stats"><span><b class="num">${n(D.nay)}</b> <span>آية</span></span><span><b class="num">${n(D.h.length)}</b> <span>حديثاً</span></span><span><b class="num">${n(D.q.length)}</b> <span>نقلاً</span></span><span><b class="num">${n(D.ch.length)}</b> <span>باباً</span></span></div></section>
    ${kinds}
    <nav class="panel u-index" aria-label="الفهرس"><h2>الفهرس</h2><ol>${D.ch.map((c, i) => `<li><a href="#asnaf" data-asj="${c.id}"><span class="u-n">${n(i + 1)}</span>${c.t}</a></li>`).join('')}</ol></nav>
    ${D.ch.map((c, i) => `<details class="u-ch panel as-ch" id="as-${c.id}"${i === 0 ? ' open' : ''}><summary><span class="u-n">${n(i + 1)}</span><span class="u-t">${c.t}</span></summary>
      <div class="u-body stack tight"><p class="u-intro">${esc(c.d)}</p>${body(c)}</div></details>`).join('')}
    <p class="muted small">نصوص الآيات بلفظ مصحف المدينة النبوية (مجمع الملك فهد، الإصدار ١٨) وبخطه، ونصوص الأحاديث من الصحيحين المضمّنين بترقيمهما، ونقول المفسرين بلفظها من كتبهم المضمّنة مع حذف حواشي المحققين؛ أما التمهيدات والفوائد فصياغة موجزة.</p>
  </div>`);
  const go = el => { if (!el) return; const d = el.closest('details'); if (d) d.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $$('[data-asj]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#as-' + a.dataset.asj)); });
}
views.asnaf = asnaf;
if (!LAB) { const g = NAV.find(x => x[2] === 'p4'); if (g && !g[1].some(x => x[0] === 'asnaf')) g[1].splice(1, 0, ['asnaf', 'أقسام الناس في القرآن', 'i-asnaf', 1]); }

/* ================= أخبار الأولين والآخرين: analysis built from the topical encyclopedia (stories, nations, prophets, sira, unseen) */
const uniqAyat = items => [...new Set(items.flatMap(it => itemAyat(it)))];
const notLex = it => !it.n.startsWith('لفظ');
const barsHTML = (rows, cat) => { const mx = Math.max(...rows.map(r => r[1]), 1); return `<div class="hbars wide">${rows.map(([nm, v, label]) => `<a class="hbar" ${cat ? `data-open="${esc(cat)}|${esc(nm)}"` : ''}><span class="k">${esc(label || nm)}</span><i style="width:${(v / mx * 100).toFixed(1)}%"></i><em>${n(v)}</em></a>`).join('')}</div>`; };
const ayahQuote = (s, a, b = a) => { const i = idxOf(s, a), j = idxOf(s, b); const t = []; for (let k = i; k <= j; k++) t.push(ayahText(k)); return `<p class="ayah" data-from="${i}" data-to="${j}" style="margin:0">${esc(t.join(' ۝ '))} <a data-ayah="${i}" class="small">﴿${esc(Q.surahs[s-1].name)}: ${n(a)}${b > a ? '–' + n(b) : ''}﴾</a></p>`; };
const FATES = [
  ['قوم نوح', 'تكذيب نوح عليه السلام ألف سنة إلا خمسين عاماً', 'الطوفان والغرق', 29, 14],
  ['عاد', 'الاستكبار في الأرض والبطش', 'الريح الصرصر العاتية', 69, 6],
  ['ثمود', 'عقر الناقة وتكذيب صالح', 'الصيحة', 11, 67],
  ['قوم لوط', 'إتيان الفاحشة', 'قلب القرى والحجارة من سجيل', 11, 82],
  ['أصحاب مدين', 'التطفيف في الكيل والميزان', 'عذاب يوم الظلة', 26, 189],
  ['فرعون وجنوده', 'العلو والطغيان واستعباد بني إسرائيل', 'الغرق في اليم', 28, 40],
  ['قارون', 'البغي والاغترار بالمال', 'الخسف به وبداره', 28, 81],
  ['أصحاب الفيل', 'قصد هدم الكعبة', 'طير أبابيل ترميهم بحجارة من سجيل', 105, 4],
];
const FUT = {
  'نبوءات أخبر بها القرآن فتحققت': ['غلبة الروم بعد هزيمتهم', 'دخول المسجد الحرام آمنين', 'هزيمة جمع المشركين', 'مصير أبي لهب', 'حفظ القرآن', 'عصمة النبي ﷺ من الناس', 'ظهور الدين والاستخلاف في الأرض', 'العجز عن الإتيان بمثله'],
  'أشراط الساعة وعلاماتها': ['اقتراب الساعة', 'الدخان', 'دابة الأرض', 'يأجوج ومأجوج', 'نزول عيسى عليه السلام', 'طلوع بعض آيات الرب'],
  'مشاهد يوم القيامة': ['النفخ في الصور', 'زلزلة الساعة', 'تكوير الشمس وانفطار السماء وانشقاقها', 'القارعة', 'الحاقة', 'البعث والحشر', 'الميزان والحساب', 'تطاير الصحف', 'الشفاعة', 'الموت والبرزخ'],
  'المصير': ['صفة الجنة ونعيمها', 'صفة النار وعذابها'],
};
function fateLink(q) { const k = q.replace('أصحاب مدين', 'مدين').replace(' وجنوده', ''); for (const c of ['aqwam', 'qasas', 'anbiya']) { const r = topicItem(c, k) || (T.find(x => x.id === c).items.find(it => it.n.includes(k)) && { c: { id: c }, it: T.find(x => x.id === c).items.find(it => it.n.includes(k)) }); if (r) return `<a data-open="${c}|${esc(r.it.n)}">${q}</a>`; } return q; }
function awwalin() {
  const cat = id => T.find(c => c.id === id);
  const qs = cat('qasas').items.filter(notLex), an = cat('anbiya').items, aq = cat('aqwam').items, ak = cat('akhbar').items, mu = cat('mustaqbal').items;
  const storyAyat = uniqAyat(qs), futAyat = uniqAyat(mu.filter(notLex));
  const pct = x => (x / Q.ayat.length * 100).toLocaleString(LANG === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 1 });
  const bySurah = {}; storyAyat.forEach(i => { const s = Q.ayat[i][0]; bySurah[s] = (bySurah[s] || 0) + 1; });
  const topS = Object.entries(bySurah).sort((a, b) => b[1] - a[1]).slice(0, 10);
  const mk = storyAyat.filter(i => Q.surahs[Q.ayat[i][0]-1].type === 'مكية').length;
  const topQ = qs.map(it => [it.n, itemAyat(it).length]).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const topP = an.filter(it => it.c).map(it => [it.n, it.c, it.n.replace(' عليه السلام', '').replace(' عليهما السلام', '')]).sort((a, b) => b[1] - a[1]).slice(0, 12);
  const mi = name => mu.find(x => x.n === name);
  V(`<div class="stack" style="max-width:1000px"><div><div class="eyebrow">تحليل</div><h1>أخبار الأولين والآخرين</h1>
  <p class="lead">ما قصّه القرآن من أخبار الأمم الماضية، وما أخبر به من أحداث السيرة، وما أنبأ به من المستقبل وأخبار الغيب، محسوباً من الموسوعة الموضوعية في هذا التطبيق، وكل رقم يفتح آياته.</p></div>
  ${ayahQuote(12, 111)}
  <div class="grid tiles"><div class="tile"><b>${n(storyAyat.length)}</b><span>آية في القصص (${pct(storyAyat.length)}٪ من المصحف)</span></div><div class="tile"><b>${n(an.length)}</b><span>نبياً ورسولاً في الموسوعة</span></div><div class="tile"><b>${n(aq.length)}</b><span>قوماً وأمة</span></div><div class="tile"><b>${n(ak.length)}</b><span>حدثاً من السيرة</span></div><div class="tile"><b>${n(futAyat.length)}</b><span>آية في أخبار المستقبل والغيب</span></div></div>
  <h2 style="margin-bottom:0">الأولون</h2>
  <div class="grid split"><section class="panel stack tight"><h3>أكثر القصص حضوراً (بعدد الآيات)</h3>${barsHTML(topQ, 'qasas')}</section>
  <section class="panel stack tight"><h3>أكثر الأنبياء ذكراً (بعدد مرات ورود الاسم)</h3>${barsHTML(topP, 'anbiya')}</section></div>
  <section class="panel stack tight"><h3>أين رُويت القصص؟</h3>
    <p style="margin:0">${n(mk)} آية من آيات القصص في السور المكية (${(mk / storyAyat.length * 100).toLocaleString(LANG === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 0 })}٪)، و${n(storyAyat.length - mk)} في السور المدنية. فالقصص سمة القرآن المكي في مرحلة الدعوة والتثبيت.</p>
    <div class="meter"><i style="width:${(mk / storyAyat.length * 100).toFixed(1)}%;background:var(--saffron)"></i></div>
    <h4 style="margin:6px 0 0">السور الأكثر قصصاً</h4>${barsHTML(topS.map(([s, v]) => [s, v, 'سورة ' + Q.surahs[s-1].name]))}</section>
  <section class="panel stack tight"><h3>سنن الله في الأمم المكذّبة</h3>${ayahQuote(29, 40)}
    <div class="tablebox"><table class="wtable"><thead><tr><th>الأمة</th><th>ذنبها</th><th>عاقبتها</th><th>الآية</th></tr></thead><tbody>${FATES.map(([q, d, f, s, a]) => `<tr><td>${fateLink(q)}</td><td>${d}</td><td>${f}</td><td>${refLink(idxOf(s, a))}</td></tr>`).join('')}</tbody></table></div></section>
  <h2 style="margin-bottom:0">الآخرون</h2>
  <div class="grid split">${Object.entries(FUT).map(([h, names]) => `<section class="panel stack tight"><h3>${h}</h3><div class="list">${names.map(mi).filter(Boolean).map(it => `<a class="row" data-open="mustaqbal|${esc(it.n)}"><span class="t">${esc(it.n)}${it.d ? ` <span class="muted small">· ${esc(it.d)}</span>` : ''}</span><span class="n">${n(itemAyat(it).length)}</span></a>`).join('')}</div></section>`).join('')}</div>
  <section class="panel stack tight"><h3>أحداث السيرة التي نزل فيها القرآن</h3>${barsHTML(ak.map(it => [it.n, itemAyat(it).length]).sort((a, b) => b[1] - a[1]).slice(0, 12), 'akhbar')}</section>
  <div class="toolbar"><a class="btn" href="#timeline"><svg><use href="#i-time"/></svg>الخط الزمني</a><a class="btn" href="#map"><svg><use href="#i-map"/></svg>أطلس القرآن</a><a class="btn" href="#graph"><svg><use href="#i-graph"/></svg>شبكة المعرفة</a><a class="btn" href="#t-qasas">القصص القرآني كاملاً</a></div>
  <p class="muted small" style="margin:0">المصادر: ${esc(cat('qasas').src || '')} ${esc(cat('mustaqbal').src || '')} ${esc(cat('akhbar').src || '')}</p></div>`);
}

/* ================= الإعجاز العلمي: cosmic and scientific verses, with the classical tafsir one tap away and the contemporary reading graded honestly */
const IJ_ALIAS = { 'الجبال أوتاداً': 'الجبال أوتاد ورواسي', 'الشمس تجري لمستقر لها': 'كلٌّ في فلك يسبحون', 'الناصية الكاذبة': 'الناصية الكاذبة الخاطئة', 'ضيق الصدر عند الصعود': 'ضيق الصدر عند الصعود في السماء' };
const IJ_LEVEL = { z: ['معنى ظاهر متفق عليه', 'ok'], m: ['قراءة معاصرة مشهورة', 'gold'], x: ['اجتهاد محل نقاش', ''] };
const IJAZ = [
  ['الكون والفلك', 'الرتق والفتق', [[21, 30]], 'يربطها أصحاب التفسير العلمي بنشأة الكون من حالة واحدة متصلة ثم انفصالها، وهو ما يُعرف بنظرية الانفجار العظيم.', 'x', 'زغلول النجار، «من آيات الإعجاز العلمي: السماء في القرآن الكريم».'],
  ['الكون والفلك', 'السماء دخان', [[41, 11]], 'الحالة الغازية الأولى للكون قبل تكوّن النجوم والكواكب.', 'x', 'زغلول النجار، «تفسير الآيات الكونية في القرآن الكريم».'],
  ['الكون والفلك', 'اتساع السماء', [[51, 47]], 'يُستشهد بها على اتساع الكون الذي رصده إدوين هابل سنة ١٩٢٩م. وفسّرها السلف بسعة الخلق وكمال القدرة.', 'm', 'موسوعة الإعجاز العلمي في القرآن والسنة، يوسف الحاج أحمد.'],
  ['الكون والفلك', 'كلٌّ في فلك يسبحون', [[21, 33], [36, 40]], 'لكلٍّ من الشمس والقمر مدار يجري فيه. وهو معنى ظاهر في الآية قرره المفسرون قديماً.', 'z', 'تفسير ابن كثير؛ التحرير والتنوير لابن عاشور.'],
  ['الكون والفلك', 'الشمس ضياء والقمر نور', [[10, 5], [25, 61]], 'التفريق بين الشمس مصدراً للضوء والحرارة والقمر نوراً منعكساً.', 'm', 'موريس بوكاي، «التوراة والإنجيل والقرآن والعلم» (١٩٧٦م).'],
  ['الكون والفلك', 'الشمس تجري لمستقر لها', [[36, 38]], 'يربطها باحثون بحركة الشمس في المجرة. وللمفسرين في «مستقرها» أقوال: منتهى سيرها، أو يوم القيامة.', 'x', 'تفسير القرطبي؛ زغلول النجار، «السماء في القرآن الكريم».'],
  ['الكون والفلك', 'إنزال الحديد', [[57, 25]], 'يُستشهد بها على أن الحديد يتكوّن في باطن النجوم لا في الأرض. وفسّر كثير من المفسرين «أنزلنا» بمعنى خلقنا وهيّأنا.', 'x', 'زغلول النجار، «الحديد في القرآن الكريم».'],
  ['الأرض', 'الجبال أوتاداً', [[78, 6], [78, 7]], 'للجبال امتداد في باطن الأرض يثبّت قشرتها، كما يثبّت الوتد الخيمة.', 'x', 'زغلول النجار، «الجبال في القرآن الكريم».'],
  ['الأرض', 'أدنى الأرض', [[30, 2], [30, 4]], 'وقعت المعركة قرب البحر الميت، وهو أخفض بقعة يابسة على الأرض. وأكثر المفسرين على أن «أدنى» بمعنى أقرب إلى بلاد العرب، والآية من أنباء الغيب التي تحققت.', 'x', 'تفسير ابن كثير؛ موسوعة الإعجاز العلمي، يوسف الحاج أحمد.'],
  ['البحار والماء', 'البرزخ بين البحرين', [[25, 53], [55, 19], [55, 20]], 'الحاجز بين الكتل المائية المختلفة في الملوحة والكثافة، فلا يطغى بعضها على بعض.', 'm', 'هيئة الإعجاز العلمي في القرآن والسنة، رابطة العالم الإسلامي.'],
  ['البحار والماء', 'ظلمات البحر والموج', [[24, 40]], 'الظلمة المتدرجة في أعماق البحار، والأمواج الداخلية التي تعلوها أمواج السطح.', 'm', 'هيئة الإعجاز العلمي في القرآن والسنة.'],
  ['البحار والماء', 'السحاب الركامي والبَرَد', [[24, 43]], 'وصف تكوّن السحب الركامية بتجمعها ثم تراكمها، ونزول البَرَد منها.', 'm', 'موسوعة الإعجاز العلمي في القرآن والسنة.'],
  ['البحار والماء', 'الرياح لواقح', [[15, 22]], 'تلقيح الرياح للسحاب فينزل المطر، وللنبات بنقل حبوب اللقاح. وقد قال بالمعنيين المفسرون الأوائل.', 'z', 'تفسير الطبري؛ تفسير ابن كثير.'],
  ['البحار والماء', 'الماء أصل الحياة', [[21, 30]], 'الماء أساس تكوين كل كائن حي. وهو معنى ظاهر في قوله: ﴿وَجَعَلۡنَا مِنَ ٱلۡمَآءِ كُلَّ شَيۡءٍ حَيٍّ﴾.', 'z', 'تفسير ابن كثير؛ التحرير والتنوير.'],
  ['الإنسان', 'أطوار خلق الجنين', [[23, 12], [23, 14]], 'تطابق مراحل النطفة والعلقة والمضغة والعظام مع ما يصفه علم الأجنة.', 'm', 'Keith L. Moore, The Developing Human, 3rd ed. (1982).'],
  ['الإنسان', 'ضيق الصدر عند الصعود', [[6, 125]], 'ضيق التنفس في المرتفعات لقلة الضغط والأكسجين. والآية في سياق تشبيه حال من أُضلّ.', 'm', 'موسوعة الإعجاز العلمي في القرآن والسنة.'],
  ['الإنسان', 'تسوية البنان', [[75, 3], [75, 4]], 'يربطها باحثون بتفرّد بصمات الأصابع. وفسّرها ابن كثير وغيره بالقدرة على جعل الأصابع مستوية كخف البعير.', 'x', 'تفسير ابن كثير؛ موسوعة الإعجاز العلمي.'],
  ['الإنسان', 'الجلود وموضع الإحساس', [[4, 56]], 'تبديل الجلود ليدوم الألم، ويُستشهد بها على أن نهايات أعصاب الألم في الجلد.', 'x', 'موسوعة الإعجاز العلمي في القرآن والسنة.'],
  ['الإنسان', 'الناصية الكاذبة', [[96, 15], [96, 16]], 'يربطها باحثون بالفص الجبهي من الدماغ وصلته بالقرار والكذب. والناصية في اللغة مقدَّم الرأس.', 'x', 'هيئة الإعجاز العلمي في القرآن والسنة.'],
  ['الأحياء', 'النحل وبيوته وشرابه', [[16, 68], [16, 69]], 'خوطبت النحل بصيغة المؤنث (اتخذي، كلي، فاسلكي)، والعاملات في الخلية إناث. وفي شرابها شفاء للناس.', 'm', 'موسوعة الإعجاز العلمي في القرآن والسنة.'],
  ['الأحياء', 'الزوجية في المخلوقات', [[51, 49]], 'الزوجية في عامة المخلوقات من الأحياء وغيرها.', 'm', 'التحرير والتنوير؛ موسوعة الإعجاز العلمي.'],
];
function ijaz() {
  const groups = [...new Set(IJAZ.map(x => x[0]))]; const cnt = k => IJAZ.filter(x => x[4] === k).length;
  V(`<div class="stack" style="max-width:1000px"><div><div class="eyebrow">تحليل</div><h1>الإعجاز العلمي في القرآن</h1>
  <p class="lead">آيات كونية وعلمية يذكرها الباحثون في الإعجاز العلمي. تُعرض كل آية بنصها، ويُفتح تفسيرها المأثور بلمسة، ثم تأتي القراءة المعاصرة مع بيان درجتها ومصدرها.</p></div>
  ${ayahQuote(41, 53)}
  <section class="panel stack tight"><h2>الضوابط</h2><ul style="margin:0;padding-inline-start:1.2em">
    <li>القرآن كتاب هداية، وآياته الكونية دعوة إلى التفكر، وليس كتاب علوم تجريبية.</li>
    <li>لا يُحمل النص إلا على حقيقة علمية مستقرة، لا على فرضية أو نظرية قابلة للتغير.</li>
    <li>لا يُخرج اللفظ عن معناه في لغة العرب. ويُعرض الفهم المعاصر مع تفسير السلف، ولا يُقدَّم عليه.</li>
    <li>إن أخطأ الباحث في الربط، فالخطأ في فهمه لا في النص.</li></ul>
    <p class="muted small" style="margin:0">في المسألة رأيان معروفان: تحفّظ الشاطبي في «الموافقات» على حمل القرآن على علوم لم تعرفها العرب، وأيده ابن عاشور في المقدمة الرابعة من «التحرير والتنوير» مع تفصيل. وتوسّع آخرون كطنطاوي جوهري في «الجواهر» وزغلول النجار. ولذلك يُبيَّن هنا لكل موضع درجته.</p>
    <div class="pill-row">${Object.entries(IJ_LEVEL).map(([k, [l, c]]) => `<span class="chip ${c}">${l}: ${n(cnt(k))}</span>`).join('')}</div></section>
  ${groups.map(g => `<h2 style="margin-bottom:0">${g}</h2><div class="grid split">${IJAZ.filter(x => x[0] === g).map(([, t, refs, read, lv, src]) => { const [ll, lc] = IJ_LEVEL[lv]; const it = topicItem('ilm', IJ_ALIAS[t] || t);
    return `<section class="panel stack tight"><div class="toolbar" style="justify-content:space-between"><h3 style="margin:0">${esc(t)}</h3><span class="chip ${lc}">${ll}</span></div>
    ${ayahQuote(refs[0][0], refs[0][1], refs.length > 1 && refs[1][0] === refs[0][0] && refs[1][1] - refs[0][1] <= 3 ? refs[refs.length - 1][1] : refs[0][1])}
    ${refs.length > 1 && refs[1][0] !== refs[0][0] ? `<p class="small" style="margin:0">وانظر: ${refs.slice(1).map(([s, a]) => refLink(idxOf(s, a))).join('، ')}</p>` : ''}
    <p style="margin:0"><b>القراءة المعاصرة:</b> ${esc(read)}</p>
    <div class="toolbar"><button class="btn" data-ayah="${idxOf(refs[0][0], refs[0][1])}">التفسير المأثور</button>${it ? `<a class="btn" data-open="ilm|${esc(it.it.n)}">في الموسوعة</a>` : ''}</div>
    <p class="muted small" style="margin:0">المصدر: ${esc(src)}</p></section>`; }).join('')}</div>`).join('')}
  <section class="panel stack tight"><h2>المصادر</h2><ul style="margin:0;padding-inline-start:1.2em;overflow-wrap:anywhere">
    <li>التفسير المأثور داخل التطبيق: الطبري، وابن كثير، والقرطبي، والبغوي، والسعدي، والميسر.</li>
    <li>الطاهر ابن عاشور، «التحرير والتنوير»، المقدمة الرابعة. وأبو إسحاق الشاطبي، «الموافقات».</li>
    <li>زغلول النجار، «تفسير الآيات الكونية في القرآن الكريم»، مكتبة الشروق الدولية.</li>
    <li>يوسف الحاج أحمد، «موسوعة الإعجاز العلمي في القرآن الكريم والسنة المطهرة».</li>
    <li>الهيئة العالمية للإعجاز العلمي في القرآن والسنة، رابطة العالم الإسلامي.</li>
    <li>Keith L. Moore, The Developing Human: Clinically Oriented Embryology, 3rd ed. (1982). وMaurice Bucaille, La Bible, le Coran et la Science (1976).</li></ul>
    <a class="btn" href="#t-ilm" style="align-self:flex-start;white-space:normal;text-align:start">كل الآيات الكونية والعلمية في الموسوعة (${n(T.find(c => c.id === 'ilm').items.length)} مدخلاً)</a></section></div>`);
}

/* بيانات JANNAH في mods/jannah.js: تُحمَّل عند أول فتح للقسم */
/* ================= وصف الجنة وأنواعها في القرآن الكريم: أسماؤها ومراتبها، وأنهارها وقصورها ونعيمها وأهلها، ورؤية الله ورضوانه، والطريق إليها
   نص الآيات بلفظ مصحف المدينة (مجمع الملك فهد، الإصدار ١٨) وبخطه، والأحاديث مقتطعة بلفظها من الصحيحين المضمّنين (data/hadith)،
   ونقول المفسرين بلفظها من data/t؛ والبيانات تُبنى بسكربت من هذه المصادر، فلا يُكتب نص منسوب باليد. */
function jannah() {
  if (!needMod('jannah')) return;
  const D = JANNAH, enOn = LANG !== 'ar', bk = k => (HAD_BOOKS[k] || [k])[0];
  const AR = x => String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const num = k => LANG === 'ar' ? AR(k) : k;
  const ayLine = i => { const a = Q.ayat[i]; return `<div class="ayah jn-q"><span class="jn-t">${esc(D.ay[i] || ayahText(i))}</span> <span class="num jn-n" data-ayah="${i}" title="${esc(ref(i))}">${AR(a[1])}</span></div>`; };
  const ays = ([s, a, b]) => { const o = [], last = Math.min(b || a, a + 6); for (let q = a; q <= last; q++) { const i = idxOf(s, q); if (i >= 0) o.push(ayLine(i)); } if ((b || a) > last) o.push(`<a class="btn th-more" href="#a${s}-${last + 1}">أكمل الآيات في المصحف</a>`); return o.join(''); };
  const refOf = r => `${refLink(idxOf(r[0], r[1]))}${r[2] ? `<span>–${n(r[2])}</span>` : ''}`;
  const ayCard = it => `<article class="jn-ay"><h3>${it.t}</h3><div class="u-ref">${refOf(it.r)}</div>
    <div class="jn-ays">${ays(it.r)}</div><p class="jn-note">${esc(it.n)}</p>
    <div class="jn-links"><a class="btn" href="#pa${idxOf(it.r[0], it.r[1])}"><svg><use href="#i-book"/></svg>افتح في المصحف</a>${it.h ? `<a class="btn" href="#jannah" data-jnh="${it.h}">الحديث بتخريجه</a>` : ''}</div></article>`;
  const hCard = h => `<article class="jn-h" id="jnh-${h.id}"><h3>${h.t}</h3>
    <blockquote class="jn-matn notranslate" translate="no" lang="ar" dir="rtl">${esc(h.x)}</blockquote>
    ${enOn ? `<div class="jn-en"><b>معنى الحديث بالإنجليزية</b><p class="notranslate" translate="no" lang="en" dir="ltr">${esc(h.en)}</p></div>` : ''}
    <p class="jn-tx"><span>رواه</span> ${h.src.map(([b, k]) => `<b>${bk(b)}</b> <span class="num">(${num(k)})</span>`).join(' · ')}</p>
    ${h.gr ? `<p class="jn-gr"><span>درجته</span> <em class="jn-badge">${h.gr}</em></p>` : ''}
    <div class="th-use"><b>فقه الحديث</b><p>${esc(h.f)}</p></div></article>`;
  const qCard = q => { const b = TF.find(x => x.key === q.bk);
    return `<figure class="qs-quote jn-qt"><blockquote class="notranslate" translate="no" lang="ar" dir="rtl">${esc(q.x)}</blockquote>
    ${enOn ? `<p class="jn-qen notranslate" translate="no" lang="en" dir="ltr">${esc(q.en)}</p>` : ''}
    <figcaption><b>${q.w}</b> · <span>نقل بلفظه من</span> <span>${esc(b ? b.title : q.bk)}</span> · <span>عند تفسير</span> ${refLink(idxOf(q.s, q.ay))}</figcaption>
    <p class="jn-note small">${esc(q.n)}</p></figure>`; };
  const body = c => { const hs = D.h.filter(h => h.ch === c.id), qs = D.q.filter(q => q.ch === c.id);
    return `<div class="jn-grid">${c.ay.map(ayCard).join('')}</div>
      ${hs.length ? `<h3 class="jn-sub"><svg><use href="#i-scroll"/></svg>من السنة الصحيحة</h3><div class="jn-grid">${hs.map(hCard).join('')}</div>` : ''}
      ${qs.length ? `<h3 class="jn-sub"><svg><use href="#i-book"/></svg>من أقوال المفسرين</h3><div class="jn-grid">${qs.map(qCard).join('')}</div>` : ''}`; };
  const names = `<section class="panel jn-names"><h2>أسماء الجنة في القرآن</h2>
    <div class="jn-ngrid">${D.k.map((k, i) => { const ix = idxOf(k.r[0], k.r[1]); return `<div class="jn-k" id="jnk-${k.id}"><span class="jn-kn">${n(i + 1)}</span><b>${k.t}</b><p>${esc(k.d)}</p>
      <div class="ayah jn-q jn-kq"><span class="jn-t">${esc(D.ay[ix] || ayahText(ix))}</span> <span class="num jn-n" data-ayah="${ix}">${AR(Q.ayat[ix][1])}</span></div>
      <span class="jn-kay"><small>الشاهد</small> ${refLink(ix)}</span></div>`; }).join('')}</div>
    <p class="muted small">${esc(D.kn)}</p></section>`;
  const tiers = `<section class="panel jn-tiers"><h2>مراتب الجنة</h2>
    <ol class="jn-tl">${D.tiers.map((t, i) => `<li class="jn-tr jn-tr${i + 1}"><span class="jn-tn">${n(i + 1)}</span><div><b>${t.t}</b><p>${esc(t.d)}</p><small><span>الدليل</span>: ${esc(t.ev)}</small></div></li>`).join('')}</ol>
    <p class="muted small">رسم تقريبي مبني على الآيات والأحاديث الصحيحة؛ والجنة أعظم من أن يحيط بها رسم.</p></section>`;
  V(`<div class="stack ulum jn">
    <section class="u-hero jn-hero"><span class="eyebrow">اقرأ وتدبّر</span><h1>وصف الجنة وأنواعها في القرآن الكريم</h1>
      <p class="lead">أسماء الجنة ومراتبها كما وردت في القرآن الكريم، وصفة أنهارها وقصورها وطعامها ولباسها وأهلها، وأعظم نعيمها رؤية الله ورضوانه، والطريق إليها، بالأحاديث الصحيحة وأقوال المفسرين.</p>
      <div class="jn-stats"><span><b class="num">${n(D.k.length)}</b> <span>اسماً</span></span><span><b class="num">${n(D.nay)}</b> <span>آية</span></span><span><b class="num">${n(D.h.length)}</b> <span>حديثاً</span></span><span><b class="num">${n(D.q.length)}</b> <span>نقلاً</span></span><span><b class="num">${n(D.ch.length)}</b> <span>باباً</span></span></div></section>
    ${names}
    ${tiers}
    <nav class="panel u-index" aria-label="الفهرس"><h2>الفهرس</h2><ol>${D.ch.map((c, i) => `<li><a href="#jannah" data-jnj="${c.id}"><span class="u-n">${n(i + 1)}</span>${c.t}</a></li>`).join('')}</ol></nav>
    ${D.ch.map((c, i) => `<details class="u-ch panel jn-ch" id="jn-${c.id}"${i === 0 ? ' open' : ''}><summary><span class="u-n">${n(i + 1)}</span><span class="u-t">${c.t}</span></summary>
      <div class="u-body stack tight"><p class="u-intro">${esc(c.d)}</p>${body(c)}</div></details>`).join('')}
    <p class="jn-dua">اللهم إنا نسألك الفردوس الأعلى من الجنة.</p>
    <p class="muted small">نصوص الآيات بلفظ مصحف المدينة النبوية (مجمع الملك فهد، الإصدار ١٨) وبخطه، ونصوص الأحاديث من الصحيحين المضمّنين بترقيمهما، ونقول المفسرين بلفظها من كتبهم المضمّنة؛ أما التمهيدات والفوائد فصياغة موجزة. وأوصاف الجنة حق على حقيقتها، ولا يُعلم كُنهها إلا الله.</p>
  </div>`);
  const go = el => { if (!el) return; const d = el.closest('details'); if (d) d.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $$('[data-jnj]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#jn-' + a.dataset.jnj)); });
  $$('[data-jnh]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#jnh-' + a.dataset.jnh)); });
}
views.jannah = jannah;

/* ================= مختبر الأبحاث: gathers a topic's verses, word statistics, tafsir, sahih hadith and encyclopedia entries into a referenced, printable paper. Runs on the device only */
const HAD = {}; // name -> [{l, t, n}] with n the normalized text used for matching
const HAD_BOOKS = { bukhari: ['صحيح البخاري', 'ترقيم فتح الباري', 1], muslim: ['صحيح مسلم', 'ترقيم محمد فؤاد عبد الباقي', 1],
  abudawud: ['سنن أبي داود', 'ترقيم محمد محيي الدين عبد الحميد'], tirmidhi: ['جامع الترمذي', 'ترقيم أحمد محمد شاكر'], nasai: ['سنن النسائي (المجتبى)', 'ترقيم عبد الفتاح أبو غدة'], ibnmajah: ['سنن ابن ماجه', 'ترقيم محمد فؤاد عبد الباقي'] };
const HAD_SHORT = { bukhari: 'البخاري', muslim: 'مسلم', abudawud: 'أبو داود', tirmidhi: 'الترمذي', nasai: 'النسائي', ibnmajah: 'ابن ماجه' };
const gradeOf = (k, h) => { if (HAD_BOOKS[k][2]) return 'صحيح'; const own = k === 'tirmidhi' ? (h.t.replace(/[\u064B-\u0652]/g, '').match(/قال أبو عيسى:? ?(هذا حديث[^.]{0,60})/) || [])[1] : null;
  return [h.g ? esc(h.g) : 'لم يُذكر حكمه في المصدر', own ? `وقال الترمذي: «${esc(own.trim())}»` : ''].filter(Boolean).join('؛ '); };
const HSTOP = new Set('صلي الله عليه وسلم رسول النبي نبي قال قالت يقول فقال وقال حدثنا اخبرنا حدثني اخبرني عن ان في من ما لا علي الي ثم بن ابن ابي ابو رضي عنه عنها عنهم ذلك هذا هذه كان كانت اذا وهو هو هي الا او به له لها فيه يا انه انها انا وانا قد لقد فلما حتي ولا وما ومن وان فان قلت سمعت يعني اي'.split(' '));
const SAHIHAIN = ['bukhari', 'muslim'], SUNAN = ['abudawud', 'tirmidhi', 'nasai', 'ibnmajah'];
const ISNAD = /حدثنا|حدثني|اخبرنا|اخبرني|انبانا|سمعت فلانا/;
const SUFRX = '(?:تموه|يهما|يهم|يها|هما|كما|تما|تم|تن|يه|هم|هن|كم|نا|ها|ون|ين|ات|ان|وا|وه|ه|ي|ا|ت|ن)?';
let FORMROOT = null;
function formRoots() { // every surface stem in the mushaf -> the roots it carries, counted: resolves a typed word to its real Quranic root
  if (FORMROOT) return FORMROOT; FORMROOT = new Map();
  W.w.forEach(w => { if (w[2] < 0) return; for (const s of stems(w[0])) { let m = FORMROOT.get(s); if (!m) FORMROOT.set(s, m = new Map()); m.set(w[2], (m.get(w[2]) || 0) + 1); } });
  return FORMROOT;
}
const FRAME = new Set(['قران','القران','كريم','الكريم','بحث','دراسه','مفهوم','اثر','دور','اهميه','حكم','احكام','فضل','فضائل','ايات','ايه','موضوع','السنه','النبويه','الاسلام','منهج']);
const unitWords = u => { if (typeof u === 'number') return wordsByRoot.get(u) || []; const [, ri, ls] = u.split(':'); const L = new Set(ls.split(',').map(Number)); return (wordsByRoot.get(+ri) || []).filter(w => L.has(W.w[w][1])); };
const unitRoot = u => typeof u === 'number' ? u : +u.split(':')[1];
const unitLabel = u => typeof u === 'number' ? rootFmt(W.roots[u][0]) : [...new Set(unitWords(u).map(w => W.lemmas[W.w[w][1]][0]))].join('، ');
function topicRoots(q) {
  const FR = formRoots(); const words = norm(q).replace(/[^ء-ي ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
  const bare = w => w.replace(/^[وف]?(?:ال)?/, ''); const core = words.filter(w => !FRAME.has(w) && !FRAME.has(bare(w)));
  const out = [];
  for (const w of (core.length ? core : words)) { const tally = new Map();
    for (const s of stems(w)) { const m = FR.get(s); if (m) m.forEach((c, r) => tally.set(r, (tally.get(r) || 0) + c)); }
    if (!tally.size) { const ri = rootByKey.get(stem(w)); if (ri != null) tally.set(ri, 1); }
    const best = [...tally].sort((a, b) => b[1] - a[1])[0]; if (!best || out.some(u => unitRoot(u) === best[0])) continue;
    let unit = best[0];
    if (!out.length) { /* اللفظ الرئيس: إن كان جذره واسع المعاني (س م و: اسم وسماء) اقتصر البحث على صيغه هو */
      const st = new Set(stems(w)), ws = wordsByRoot.get(best[0]) || [], L = new Set(ws.filter(x => stems(W.w[x][0]).some(y => st.has(y))).map(x => W.w[x][1]));
      const cov = ws.filter(x => L.has(W.w[x][1])).length / Math.max(1, ws.length); if (L.size && cov < .3) unit = `L:${best[0]}:${[...L].join(',')}`; }
    out.push(unit); }
  return out;
}
const RX = new Map();
function rootRx(u) { // the root's real forms in the mushaf, and for a sound triliteral root also its regular derivations (تحاسدوا، محسود…)
  if (RX.has(u)) return RX.get(u); const ri = unitRoot(u);
  const r = norm(W.roots[ri][0]).replace(/[^ء-ي]/g, ''); const forms = new Set();
  unitWords(u).forEach(w => stems(W.w[w][0]).forEach(x => { if (x.length > 1) forms.add(x); }));
  const alt = [...forms].sort((a, b) => b.length - a.length);
  if (typeof u === 'number' && r.length === 3 && !/[اويءىئؤ]/.test(r) && new Set(r).size === 3) alt.push(`(?:است|مست|يست|تست|نست|ان|ت|م|ي|ن|ا)?${r[0]}[اوي]?${r[1]}[اوي]?${r[2]}`);
  const re = new RegExp(`(?:^| )(?:[وف]?[بكل]?(?:ال)?|[وف]?لل)(?:${alt.join('|')})${SUFRX}(?![ء-ي])`, 'g');
  RX.set(u, re); return re;
}
const hits = (s, re) => (s.match(re) || []).length;
async function hadithBook(k) { if (!HAD[k]) HAD[k] = gz(`data/hadith/${k}.txt`).then(rows => rows.map(([l, t, g]) => { const q = t.indexOf('"'); const clean = x => ' ' + norm(x).replace(/[^ء-ي ]/g, ' ').replace(/سوره \S+/g, ' ').replace(/\s+/g, ' ') + ' ';
    return { l, t, g: g || '', q, n: clean(t), m: q >= 0 ? clean(t.slice(q)) : clean(t) }; })).catch(e => { delete HAD[k]; throw e; }); return HAD[k]; }
function formRx(words) { const f = [...new Set(words.flatMap(stems).filter(x => x.length > 2))]; return f.length ? new RegExp(`(?:^| )(?:[وف]?[بكل]?(?:ال)?|[وف]?لل)(?:${f.join('|')})${SUFRX}(?![ء-ي])`, 'g') : null; }
const hadNum = l => String(l).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]); // أرقام الأحاديث تُكتب دون فواصل الآلاف
async function hadithSearch(rts, limit, q = '', books = SAHIHAIN, prx = null) { // a hadith counts when the topic's words occur in its text (matn), not only in its chain
  if (!rts.length && !prx) return { list: [], total: 0, rx: [] };
  const all = []; for (const k of books) for (const h of await hadithBook(k)) all.push([k, h]);
  const N = all.length, qw = norm(q).replace(/[^ء-ي ]/g, ' ').split(/\s+/).filter(w => w.length > 1 && !STOP.has(w));
  const dfOf = re => all.reduce((s, [, h]) => s + (h.m.search(re) >= 0 ? 1 : 0), 0);
  const res = rts.map(ri => { let re = rootRx(ri), d = dfOf(re);
    if (d > N * .04) { /* جذر كثير المعاني (بين = وسط وبيان): يُشترط لفظ السائل نفسه */ const own = formRx(qw.filter(w => unitRoot(topicRoots(w)[0] ?? -1) === unitRoot(ri))); if (own) { const d2 = dfOf(own); if (d2) { re = own; d = d2; } } }
    return [re, d]; });
  if (qw.some(w => /^(?:ال)?قران$/.test(w)) && rts.length) { const re = formRx(['قرآن', 'القرآن']); res.push([re, dfOf(re)]); }
  const need = Math.min(res.length, 2), out = [];
  for (const [k, h] of all) { if (h.l === 'م') continue; if (h.n.length < 320 && /بهذا الاسناد|بنحوه|بمثله|نحوه|مثله|بمعناه/.test(h.n)) continue; /* روايات الإسناد وحده لا متن لها */
    let got = 0, s = 0; res.forEach(([re, d]) => { const c = hits(h.m, re); if (!c) return; got++; s += Math.log(1 + N / (1 + d)) * (c * 2.2 / (c + 1.2 * (.3 + .7 * h.m.length / 600))); });
    const ph = prx ? hits(h.m, prx) : 0; if (ph) s += 25 + 5 * Math.min(ph, 3);
    if (/(?:^|؛ )الألباني: (?:ضعيف|منكر|موضوع|باطل|شاذ)/.test(h.g)) s *= .6;
    if (ph || got >= need) out.push([s + got * 3, k, h, ph]); }
  out.sort((a, b) => b[0] - a[0]);
  const bag = h => { if (!h.bg) { const i = h.n.search(/ (?:رسول الله|النبي|نبي الله) /), w = (i >= 0 ? h.n.slice(i) : h.n).split(' ').filter(x => x.length > 1 && !HSTOP.has(x)); h.bg = new Set(); for (let j = 0; j + 1 < w.length; j++) h.bg.add(w[j] + ' ' + w[j + 1]); } return h.bg; };
  const sim = (x, y) => { const m = Math.min(x.size, y.size); if (m < 6) return 0; let c = 0; (x.size < y.size ? x : y).forEach(w => { if ((x.size < y.size ? y : x).has(w)) c++; }); return c / m; };
  const sahabi = h => { if (h.sh === undefined) { const i = h.n.search(/ (?:رسول الله|النبي|نبي الله) /), pre = ' ' + (i >= 0 ? h.n.slice(0, i) : h.n.slice(0, 300)); const ms = [...pre.matchAll(/ (?:عن|سمع|سمعت|ان|انه|انها) ((?:ابي|ابو|ابن|عبد|ام|بنت) )?([ء-ي]{2,})/g)].filter(m => !HSTOP.has(m[2]) && !/^(?:كان|كانت|سمع|رجلا|رجل|امراه|ناسا)$/.test(m[2])); const m = ms[ms.length - 1];
      h.sh = m ? ((m[1] || '').replace('ابي', 'ابو') + m[2]).trim() : ''; } return h.sh; };
  const same = (a, b, x) => { const v = sim(a.bg || bag(a), b.bg || bag(b)); return v >= .6 || (v >= .38 && sahabi(a) && sahabi(a) === sahabi(b)); };
  const groups = []; /* روايات الحديث الواحد في الكتب المختلفة تُجمع في مدخل واحد بتخريجه */
  for (const r of out) { const b = bag(r[2]); const g = groups.find(g => g.mem.some(m => m.k === r[1] && m.h.l === r[2].l) || same(r[2], g.mem[0].h));
    if (g) { if (!g.mem.some(m => m.k === r[1] && m.h.l === r[2].l)) g.mem.push({ k: r[1], h: r[2], ph: r[3] }); g.ph = g.ph || r[3]; }
    else groups.push({ s: r[0], b, ph: r[3], mem: [{ k: r[1], h: r[2], ph: r[3] }] }); }
  const strong = groups.filter(g => g.ph).length >= 3; let use = strong ? groups.filter(g => g.ph) : groups;
  const ORD = Object.keys(HAD_BOOKS);
  for (const g of use.slice(0, limit)) for (const [k, h] of all) { if (h.l === 'م' || g.mem.some(m => m.k === k && m.h.l === h.l)) continue; if (same(g.mem[0].h, h)) g.mem.push({ k, h, ph: prx ? hits(h.m, prx) : 0 }); } /* تتمة التخريج: بقية روايات الحديث نفسه */
  for (const g of use.slice(0, limit)) for (const m of [...g.mem]) { /* رواية مختصرة تلي الحديث في كتابه («بهذا الحديث»، «بهذا الإسناد») تتبعه */
    const all2 = await hadithBook(m.k), j = all2.findIndex(h => h.l === m.h.l); for (let d = 1; d <= 3; d++) { const h = all2[j + d]; if (!h || h.n.length > 420 || (prx && hits(h.m, prx)) || !/بهذا الحديث|بهذا الاسناد|بنحوه|بمعناه|نحوه|مثله/.test(h.n)) break; if (!g.mem.some(x => x.k === m.k && x.h.l === h.l)) g.mem.push({ k: m.k, h, ph: 0 }); } }
  for (const g of use) g.mem = g.mem.filter((m, i, a) => a.findIndex(x => x.k === m.k && x.h.l === m.h.l) === i);
  const key = m => m.k + m.h.l;
  for (let i = 0; i < use.length; i++) for (let j = i + 1; j < use.length; j++) if (use[j].mem.some(m => use[i].mem.some(x => key(x) === key(m)))) { /* مدخلان يشتركان في رواية: حديث واحد */
    use[j].mem.forEach(m => { if (!use[i].mem.some(x => key(x) === key(m))) use[i].mem.push(m); }); use[i].ph = use[i].ph || use[j].ph; use.splice(j, 1); j = i; }
  for (let i = use.length - 1; i >= 0; i--) { const g = use[i]; if (g.mem.length !== 1) continue; const m = g.mem[0]; if (m.h.n.length > 420 || !/بهذا الحديث|بهذا الاسناد|بنحوه|بمعناه/.test(m.h.n)) continue;
    const host = use.find(o => o !== g && o.mem.some(x => x.k === m.k && +m.h.l - +x.h.l >= 1 && +m.h.l - +x.h.l <= 3)); if (host) { host.mem.push(m); use.splice(i, 1); } }
  const merged = use.filter(g => !(g.mem.length === 1 && g.mem[0].h.n.length < 420 && /بهذا الحديث|بهذا الاسناد/.test(g.mem[0].h.n) && use.some(o => o !== g && o.mem.some(x => x.k === g.mem[0].k && x.h.l === g.mem[0].h.l))));
  use.length = 0; use.push(...merged);
  const list = use.slice(0, limit).map(g => { const ms = g.mem.filter(m => !g.ph || m.ph); const rep = ms.reduce((a, m) => m.h.m.length > a.h.m.length ? m : a, ms[0]);
    return [g.s, rep.k, rep.h, g.ph, g.mem.sort((x, y) => ORD.indexOf(x.k) - ORD.indexOf(y.k) || x.h.l - y.h.l)]; });
  return { list, total: use.length, rx: [...res.map(([re]) => re), ...(prx ? [prx] : [])], phrase: groups.filter(g => g.ph).length, strong };
}
function topicCore(q) { // يحذف عبارة الإطار («في القرآن»، «من الكتاب والسنة») ليبقى الموضوع نفسه
  return norm(q).replace(/[^ء-ي ]/g, ' ').replace(/(?:^| )(?:في|من) (?:ال)?(?:قران|كتاب)(?: الكريم)?(?: و ?(?:ال)?سنه(?: النبويه)?)?(?= |$)/g, ' ')
    .replace(/(?:^| )(?:في|من) (?:ال)?سنه(?: النبويه)?(?= |$)/g, ' ').replace(/\s+/g, ' ').trim() || norm(q); }
function phraseRx(q) { // the topic as a phrase: its content words in order, with at most two words between (اسم الله الأعظم، باسمه الأعظم، الاسم الأعظم)
  const ws = topicCore(q).split(' ').filter(w => w.length > 1 && !STOP.has(w));
  if (ws.length < 2) return null;
  const f = w => `(?:[وف]?[بكل]?(?:ال)?|[وف]?لل)(?:${[...new Set(stems(w).filter(x => x.length > 1))].join('|')})(?:هما|هم|ها|كم|نا|ه|ي)?`;
  const pairs = []; for (let i = 0; i + 1 < ws.length; i++) pairs.push(`${f(ws[i])}(?: [ء-ي]+){0,2} ${f(ws[i + 1])}`);
  return new RegExp(`(?:^| )(?:${pairs.join('|')})(?![ء-ي])`, 'g');
}
let AYSH = null; const shText = t => norm(t).replace(/[^ء-ي ]/g, ' ').replace(/سماوات/g, 'سموات').replace(/\s+/g, ' ').trim().split(' ');
function citedAyat(texts) { // ayat quoted word for word inside hadith or commentary texts
  if (!AYSH) { AYSH = new Map(); Q.ayat.forEach((a, i) => { const w = shText(a[4]); for (let k = 0; k + 3 < w.length; k++) { const key = w.slice(k, k + 4).join(' '); (AYSH.get(key) || AYSH.set(key, []).get(key)).push(i); } }); }
  const sc = new Map(); for (const t of texts) { const w = shText(t), seen = new Set(); for (let k = 0; k + 3 < w.length; k++) { const ids = AYSH.get(w.slice(k, k + 4).join(' ')); if (!ids || ids.length > 4) continue; ids.forEach(i => { const key = i + ':' + k; if (!seen.has(key)) { seen.add(key); sc.set(i, (sc.get(i) || 0) + 1); } }); } }
  return [...sc].filter(([i, c]) => c >= Math.min(3, Math.max(1, shText(Q.ayat[i][4]).length - 3))).sort((a, b) => b[1] - a[1]).map(([i]) => i);
}
async function scholarsSay(prx, keys, st, per = 8) { // full-text search of the long commentaries for the topic phrase: what the scholars said about it, with its place
  const out = [];
  for (const key of keys) { const b = TF.find(x => x.key === key); if (!b) continue; const cand = [];
    for (let s = 1; s <= 114; s++) { if (s % 15 === 1) st(`جارٍ البحث في نص «${b.title}» كاملاً… (سورة ${n(s)} من ١١٤)`); let t; try { t = await tafsir(key, s); } catch (e) { continue; }
      for (const a of Object.keys(t)) { const tx = t[a]; if (!tx || norm(tx).replace(/[^ء-ي ]/g, ' ').search(prx) < 0) continue;
        const sents = String(tx).replace(/\[\[[^\]]*\]\]/g, '').split(/(?<=[.؟!])\s+|\n+/).map(x => x.trim()).filter(Boolean);
        sents.forEach((x, j) => { const nx = ' ' + norm(x).replace(/[^ء-ي ]/g, ' ').replace(/\s+/g, ' ') + ' '; const h = hits(nx, prx); if (!h) return;
          const txt = [sents[j - 1], x, sents[j + 1]].filter(y => y && (y === x || !ISNAD.test(norm(y)))).join(' ');
          cand.push({ b, s, a: +a, t: cut(txt, 900), c: x, w: h + (ISNAD.test(nx) ? -.5 : 0) + (/قال|ذهب|اختلف|القول|الصحيح|العلماء/.test(nx) ? .5 : 0) }); }); } }
    const seen = new Map(), pick = [];
    for (const c of cand.sort((x, y) => y.w - x.w)) { const loc = c.s + ':' + c.a, k = seen.get(loc) || 0; if (k >= 2 || pick.some(p => p.t.slice(0, 80) === c.t.slice(0, 80))) continue; seen.set(loc, k + 1); pick.push(c); if (pick.length >= per) break; }
    out.push(...pick.sort((x, y) => x.s - y.s || x.a - y.a)); }
  return out;
}
function hadithShow(h, rts) { // the narrator's link to the Prophet, then the full matn, with the topic words marked
  const mark = s => { let o = esc(s); return o; };
  const chain = h.q > 0 ? h.t.slice(0, h.q) : ''; const tail = chain.length > 130 ? '… ' + chain.slice(chain.length - 130).replace(/^\S*\s/, '') : chain;
  const matn = h.q >= 0 ? h.t.slice(h.q) : h.t;
  return mark(tail) + markWords(cut(matn, 900), rts);
}
function markWords(text, rts) { // wraps words that belong to the topic's roots (or given patterns)
  const res = rts.map(x => x instanceof RegExp ? x : rootRx(x)); return text.split(/(\s+)/).map(p => { if (!p.trim()) return p; const nn = ' ' + norm(p).replace(/[^ء-ي]/g, '') + ' '; return res.some(re => nn.search(re) >= 0) ? `<mark>${esc(p)}</mark>` : esc(p); }).join('');
}
/* بيانات JAMAL في mods/jamal.js: تُحمَّل عند أول فتح للقسم */
/* ================= الصور الجمالية في القرآن الكريم: التصوير الفني (التشبيه والاستعارة والكناية والتشخيص)، والمشاهد الكونية ومشاهد القيامة وتصوير النفس، وذكر القرآن للجمال والزينة والصبر الجميل والصفح الجميل
   نص الآيات بلفظ مصحف المدينة (مجمع الملك فهد، الإصدار ١٨) وبخطه، والأحاديث مقتطعة بلفظها من الكتب الستة المضمّنة (data/hadith)،
   ونقول المفسرين بلفظها من data/t؛ والبيانات تُبنى بسكربت من هذه المصادر، فلا يُكتب نص منسوب باليد. */
function jamal() {
  if (!needMod('jamal')) return;
  const D = JAMAL, enOn = LANG !== 'ar', bk = k => (HAD_BOOKS[k] || [k])[0];
  const AR = x => String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const num = k => LANG === 'ar' ? AR(k) : k;
  const ayLine = i => { const a = Q.ayat[i]; return `<div class="ayah jm-q"><span class="jm-t">${esc(D.ay[i] || ayahText(i))}</span> <span class="num jm-n" data-ayah="${i}" title="${esc(ref(i))}">${AR(a[1])}</span></div>`; };
  const ays = ([s, a, b]) => { const o = [], last = Math.min(b || a, a + 6); for (let q = a; q <= last; q++) { const i = idxOf(s, q); if (i >= 0) o.push(ayLine(i)); } if ((b || a) > last) o.push(`<a class="btn th-more" href="#a${s}-${last + 1}">أكمل الآيات في المصحف</a>`); return o.join(''); };
  const refOf = r => `${refLink(idxOf(r[0], r[1]))}${r[2] ? `<span>–${n(r[2])}</span>` : ''}`;
  const ayCard = it => `<article class="jm-ay"><h3>${it.t}</h3><div class="u-ref">${refOf(it.r)}</div>
    <div class="jm-ays">${ays(it.r)}</div><p class="jm-note"><b class="jm-lbl">وجه الصورة</b> ${esc(it.n)}</p>
    <div class="jm-links"><a class="btn" href="#pa${idxOf(it.r[0], it.r[1])}"><svg><use href="#i-book"/></svg>افتح في المصحف</a>${it.h ? `<a class="btn" href="#jamal" data-jmh="${it.h}">الحديث بتخريجه</a>` : ''}</div></article>`;
  const hCard = h => `<article class="jm-h" id="jmh-${h.id}"><h3>${h.t}</h3>
    <blockquote class="jm-matn notranslate" translate="no" lang="ar" dir="rtl">${esc(h.x)}</blockquote>
    ${enOn ? `<div class="jm-en"><b>معنى الحديث بالإنجليزية</b><p class="notranslate" translate="no" lang="en" dir="ltr">${esc(h.en)}</p></div>` : ''}
    <p class="jm-tx"><span>رواه</span> ${h.src.map(([b, k]) => `<b>${bk(b)}</b> <span class="num">(${num(k)})</span>`).join(' · ')}</p>
    ${h.gr || h.dg ? `<p class="jm-gr"><span>درجته</span> ${h.gr ? `<em class="jm-badge">${h.gr}</em>` : ''}${h.dg ? `<span class="jm-dg notranslate" translate="no">${esc(h.dg.replace(/[؛\s]+$/, ''))}</span>` : ''}</p>` : ''}
    <div class="th-use"><b>فقه الحديث</b><p>${esc(h.f)}</p></div></article>`;
  const qCard = q => { const b = TF.find(x => x.key === q.bk);
    return `<figure class="qs-quote jm-qt"><blockquote class="notranslate" translate="no" lang="ar" dir="rtl">${esc(q.x)}</blockquote>
    ${enOn ? `<p class="jm-qen notranslate" translate="no" lang="en" dir="ltr">${esc(q.en)}</p>` : ''}
    <figcaption><b>${q.w}</b> · <span>نقل بلفظه من</span> <span>${esc(b ? b.title : q.bk)}</span> · <span>عند تفسير</span> ${refLink(idxOf(q.s, q.ay))}</figcaption>
    <p class="jm-note small">${esc(q.n)}</p></figure>`; };
  const body = c => { const hs = D.h.filter(h => h.ch === c.id), qs = D.q.filter(q => q.ch === c.id);
    return `<div class="jm-grid">${c.ay.map(ayCard).join('')}</div>
      ${hs.length ? `<h3 class="jm-sub"><svg><use href="#i-scroll"/></svg>من السنة الصحيحة</h3><div class="jm-grid">${hs.map(hCard).join('')}</div>` : ''}
      ${qs.length ? `<h3 class="jm-sub"><svg><use href="#i-book"/></svg>من أقوال المفسرين</h3><div class="jm-grid">${qs.map(qCard).join('')}</div>` : ''}`; };
  const kinds = `<section class="panel jm-kinds"><h2>ألوان التصوير في القرآن</h2>
    <div class="jm-kgrid">${D.k.map((k, i) => { const ix = idxOf(k.r[0], k.r[1]); return `<div class="jm-k jm-k${i + 1}"><span class="jm-kn">${n(i + 1)}</span><b>${k.t}</b><p>${esc(k.d)}</p>
      <span class="jm-kay"><small>الشاهد</small> ${refLink(ix)}</span><span class="jm-ko">${esc(k.o)}</span><a class="jm-kgo" href="#jamal" data-jmj="${k.id}">اقرأ الباب</a></div>`; }).join('')}</div>
    <p class="muted small">${esc('أدوات بيانية درسها علماء البلاغة في القرآن، تجتمع كثيراً في الآية الواحدة؛ والمقصود منها جميعاً أن يُرى المعنى ويُحسّ، لا أن يُعلم فقط.')}</p></section>`;
  V(`<div class="stack ulum jm">
    <section class="u-hero jm-hero"><span class="eyebrow">ابحث وحقّق</span><h1>الصور الجمالية في القرآن الكريم</h1>
      <p class="lead">كيف يرسم القرآن المعنى صورةً حيّة: التشبيه والاستعارة والكناية والتشخيص، والمشاهد الكونية ومشاهد القيامة وتصوير النفس، مع ذكر القرآن للجمال والزينة والصبر الجميل والصفح الجميل، بأقوال المفسرين بلفظها.</p>
      <div class="jm-stats"><span><b class="num">${n(D.nay)}</b> <span>آية</span></span><span><b class="num">${n(D.h.length)}</b> <span>حديثاً</span></span><span><b class="num">${n(D.q.length)}</b> <span>نقلاً</span></span><span><b class="num">${n(D.ch.length)}</b> <span>باباً</span></span></div></section>
    ${kinds}
    <nav class="panel u-index" aria-label="الفهرس"><h2>الفهرس</h2><ol>${D.ch.map((c, i) => `<li><a href="#jamal" data-jmj="${c.id}"><span class="u-n">${n(i + 1)}</span>${c.t}</a></li>`).join('')}</ol></nav>
    ${D.ch.map((c, i) => `<details class="u-ch panel jm-ch" id="jm-${c.id}"${i === 0 ? ' open' : ''}><summary><span class="u-n">${n(i + 1)}</span><span class="u-t">${c.t}</span></summary>
      <div class="u-body stack tight"><p class="u-intro">${esc(c.d)}</p>${body(c)}</div></details>`).join('')}
    <p class="muted small">نصوص الآيات بلفظ مصحف المدينة النبوية (مجمع الملك فهد، الإصدار ١٨) وبخطه، ونصوص الأحاديث من الصحيحين المضمّنين بترقيمهما، ونقول المفسرين بلفظها من كتبهم المضمّنة في مشكاة (السعدي، والقرطبي، وابن كثير، والبغوي)؛ أما التمهيدات ووجوه الصور فصياغة موجزة. وتفسيرا الزمخشري (الكشاف) وابن عاشور (التحرير والتنوير) غير مضمّنين في مشكاة، فلم يُنقل عنهما.</p>
  </div>`);
  const go = el => { if (!el) return; const d = el.closest('details'); if (d) d.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $$('[data-jmj]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#jm-' + a.dataset.jmj)); });
  $$('[data-jmh]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#jmh-' + a.dataset.jmh)); });
}
views.jamal = jamal;
const HADARAT = {"k":[{"id":"nuh","t":"قوم نوح","d":"أول رسول إلى أهل الأرض بحسب ابن كثير؛ لبث فيهم ألف سنة إلا خمسين عاماً (العنكبوت: ١٤).","r":[11,25],"o":"عاقبتهم: الطوفان، ونجاة أصحاب السفينة."},{"id":"ad","t":"عاد","d":"إرم ذات العماد، سكنوا الأحقاف باليمن بحسب ابن كثير والسعدي، وجاؤوا خلفاء من بعد قوم نوح.","r":[89,6],"o":"عاقبتهم: ريح صرصر عاتية سبع ليالٍ وثمانية أيام."},{"id":"thamud","t":"ثمود","d":"بعد عاد، ومساكنهم بين الحجاز والشام إلى وادي القرى، وهم أصحاب الحِجر (ابن كثير).","r":[7,74],"o":"عاقبتهم: الصيحة والرجفة بعد عقر الناقة."},{"id":"lut","t":"قوم لوط","d":"أهل «سدوم» وما حولها من القرى في الشام، في زمن إبراهيم عليه السلام (ابن كثير).","r":[7,80],"o":"عاقبتهم: قُلبت قراهم وأُمطروا بحجارة من سجّيل."},{"id":"madyan","t":"أصحاب مدين والأيكة","d":"قبيلة معروفة بمدين، ونبيهم شعيب؛ وأصحاب الأيكة هم أهل مدين على الصحيح (ابن كثير).","r":[7,85],"o":"عاقبتهم: الرجفة، ويوم الظلّة."},{"id":"rass","t":"أصحاب الرس","d":"لم يُعيّن القرآن موضعهم ولا زمنهم، واختلف المفسرون فيهم على أقوال (ابن كثير).","r":[25,38],"o":"عاقبتهم: حقّ عليهم وعيد الله لتكذيبهم الرسل."},{"id":"firaun","t":"فرعون ومصر","d":"قوم فرعون هم قبط مصر (ابن كثير)، وجاءهم موسى عليه السلام؛ ولم يسمِّ القرآن الفرعون ولا حدّد عصره.","r":[28,4],"o":"عاقبتهم: الإغراق، وترك جنات وعيون وزروع ومقام كريم."},{"id":"saba","t":"سبأ","d":"قبيلة معروفة في أداني اليمن، ومسكنهم بلدة يقال لها مأرب (السعدي)، ومنهم بلقيس صاحبة سليمان (ابن كثير).","r":[34,15],"o":"عاقبتهم: سيل العَرِم وتمزيقهم كل ممزَّق."},{"id":"dhulqarnayn","t":"ذو القرنين","d":"ملك مكّن الله له في الأرض؛ ولم يُسمِّه القرآن ولم يُحدّد زمنه، وقد حذّر السعدي من الإسرائيليات فيه.","r":[18,84],"o":"أثره: سدّ يحجز يأجوج ومأجوج، «هذا رحمة من ربي»."},{"id":"ukhdud","t":"أصحاب الأخدود","d":"قوم كافرون فتنوا قوماً مؤمنين وحفروا الأخدود وأضرموا فيه النار (السعدي)؛ ولم يعيّن القرآن موضعهم.","r":[85,4],"o":"عاقبتهم: «قُتل أصحاب الأخدود»، ولهم عذاب الحريق."},{"id":"tubba","t":"قوم تُبّع","d":"تُبّع لقب ملوك اليمن قبل الإسلام (السعدي)، وقومه هم سبأ عند ابن كثير؛ ولم يُعيَّن أيّ تُبّع.","r":[44,37],"o":"عاقبتهم: أهلكهم الله لإجرامهم، فحقّ وعيد."},{"id":"rum","t":"الروم والفرس","d":"كانتا من أقوى دول الأرض وقت نزول الآيات (السعدي)، وقد وعد الله بغلبة الروم في بضع سنين.","r":[30,2],"o":"العبرة: «لله الأمر من قبل ومن بعد»."},{"id":"israel","t":"بنو إسرائيل","d":"فُضّلوا على عالمي زمانهم، واستُضعفوا عند فرعون ثم ورثوا أرضه ومُلّكوا.","r":[2,47],"o":"سنّتهم: إفسادان في الأرض ثم تسليط الأعداء."},{"id":"fil","t":"أصحاب الفيل","d":"جمع من الحبشة واليمن قصدوا هدم الكعبة (السعدي)، في العام الذي وُلد فيه النبي ﷺ على أشهر الأقوال (ابن كثير).","r":[105,1],"o":"عاقبتهم: طير أبابيل ترميهم بحجارة من سجّيل، فجُعلوا كعصف مأكول."}],"ch":[{"id":"sunan","t":"سنن الله في الحضارات: التمكين ثم الجحود ثم الهلاك","d":"تتكرر في قصص الأمم صورة واحدة: تمكين في الأرض وقوة وعمران، ثم جحود للنعمة وتكذيب للرسل، ثم أخذ بالذنوب بعد إقامة الحجة. ولهذا أمر الله بالسير في الأرض والنظر في عاقبة من قبلنا، فما قصّ علينا أخبارهم للتسلية بل للعبرة.","ay":[{"t":"السير في الأرض للعبرة","r":[12,109],"n":"دعوة إلى النظر في عاقبة الأمم السابقة بالقلب والعين، وهي بوابة هذا الركن كله."},{"t":"أشد منهم قوة وآثاراً","r":[30,9],"n":"الأمم الهالكة كانت أقوى من قريش وأكثر عمراناً، ولم يدفع عنها ذلك شيئاً حين كذّبت."},{"t":"ولقد مكّناهم فيما إن مكّناكم فيه","r":[46,26],"n":"مُنح الأولون السمع والأبصار والأفئدة، فما أغنت عنهم إذ جحدوا بآيات الله."},{"t":"أمرنا مترفيها ففسقوا فيها","r":[17,16],"n":"الترف إذا انفلت من الشكر والاستقامة صار باب الفسق ثم الهلاك بعد الأمر والإنذار."},{"t":"لا يهلك القرى حتى يبعث رسولاً","r":[28,59],"n":"لا يُهلك الله قرية إلا بعد إقامة الحجة وبعثة الرسول، وبعد أن يظلم أهلها."},{"t":"لا يهلك القرى بظلم وأهلها مصلحون","r":[11,117],"n":"الإهلاك عدل منه سبحانه، وسببه الظلم والفساد لا مجرد التمكين والعمران."},{"t":"في قصصهم عبرة لأولي الألباب","r":[12,111],"n":"القصص في القرآن تفصيل وهدى ورحمة لمن آمن، وأخبارها صدق لا اختلاق."}]},{"id":"nuh","t":"قوم نوح: أول طوفان في تاريخ البشرية","d":"أول رسول إلى أهل الأرض كما قال ابن كثير وكما جاء في حديث الشفاعة. دعا قومه ليلاً ونهاراً سنين طويلة، فما زادهم دعاؤه إلا فراراً، فصنع السفينة بأمر الله ونجا المؤمنون وأُغرق من سواهم.","ay":[{"t":"ألف سنة إلا خمسين عاماً","r":[29,14,15],"n":"مدة لبث نوح في قومه ثم أخذهم الطوفان وهم ظالمون، ونجاة أصحاب السفينة آيةً للعالمين."},{"t":"دعوة ليلاً ونهاراً","r":[71,5,9],"n":"دعوة بالسر والجهر لم تزد المعرضين إلا إصراراً واستكباراً، وجعلوا أصابعهم في آذانهم."},{"t":"ردّ الملأ: بشر مثلنا وأراذلنا","r":[11,25,27],"n":"اعترض كبراؤهم على بشرية الرسول وعلى أن الضعفاء اتبعوه، وهذه حجة المترفين في كل زمان."},{"t":"صناعة الفلك","r":[11,37,39],"n":"أمر الله نوحاً أن يصنع الفلك بأعينه ووحيه، وسخر منه قومه وهو يصنعها."},{"t":"الطوفان والنجاة","r":[11,40,44],"n":"فار التنور، وحُملت الأزواج والمؤمنون، وجرت السفينة في موج كالجبال، وقيل: يا أرض ابلعي ماءك."},{"t":"ابنه ليس من أهله","r":[11,45,47],"n":"النسب لا ينجي بغير الإيمان؛ فالنجاة معلّقة بالعمل الصالح لا بالقرابة.","h":"h_nuh"},{"t":"ولقد تركناها آية","r":[54,9,15],"n":"جعل الله السفينة آية باقية يُتذكّر بها، «فهل من مدّكر»."}]},{"id":"ad","t":"عاد: القوة والعمران وسبب السقوط","d":"أمة قوية البنية متطاولة العمران، جعلهم الله خلفاء من بعد قوم نوح وزادهم في الخلق بسطة. اغترّوا بقوتهم فقالوا: من أشد منا قوة؟ فأرسل الله إليهم هوداً فكذّبوه، فأُهلكوا بريح صرصر عاتية. وفي ذلك درس أن القوة بغير شكر لا تحمي صاحبها.","ay":[{"t":"جعلكم خلفاء من بعد قوم نوح","r":[7,65,69],"n":"دعوة هود إلى التوحيد وتذكيرهم بنعمة الاستخلاف وزيادة البسطة في الخلق."},{"t":"إرم ذات العماد","r":[89,6,8],"n":"ذكر الله عاداً بصفة قوة العمران، ولم يُخلق مثلها في البلاد في زمنها."},{"t":"من أشد منا قوة؟","r":[41,15,16],"n":"استكبروا في الأرض بغير الحق، فردّ الله عليهم: الله الذي خلقهم هو أشد منهم قوة."},{"t":"أتبنون بكل ريع آية تعبثون؟","r":[26,128,135],"n":"عاب عليهم هود البناء للاستعراض والعبث، واتخاذ المصانع كأنهم مخلدون، والبطش بالناس جبّارين."},{"t":"الأحقاف والعارض","r":[46,21,25],"n":"ظنوا السحاب الذي رأوه ممطراً فكان ريحاً فيها عذاب أليم تدمّر كل شيء بأمر ربها.","h":"h_ad2"},{"t":"ريح صرصر عاتية","r":[69,6,8],"n":"سبع ليال وثمانية أيام حسوماً، فصُرعوا كأنهم أعجاز نخل خاوية، فهل ترى لهم من باقية؟","h":"h_ad1"},{"t":"كأنهم أعجاز نخل منقعر","r":[54,18,20],"n":"العذاب أخذهم بقوتهم نفسها وهم الذين قالوا من أشد منا قوة، ثم جعلهم الله عبرة."}]},{"id":"thamud","t":"ثمود: النحت في الجبال والناقة الآية","d":"جاءوا بعد عاد، ومكّن الله لهم في الأرض يتخذون من سهولها قصوراً وينحتون الجبال بيوتاً. أرسل إليهم صالحاً بناقة الله آية فعقروها، فأخذتهم الصيحة والرجفة. وقد مرّ النبي ﷺ بديارهم في الحجر عام تبوك ونهى عن دخولها إلا باكين.","ay":[{"t":"هذه ناقة الله لكم آية","r":[7,73,79],"n":"ناقة خارقة لها شرب يوم ولهم شرب يوم معلوم، وحذّرهم صالح من المساس بها، وذكّرهم بالاستخلاف بعد عاد."},{"t":"ينحتون من الجبال بيوتاً آمنين","r":[15,80,84],"n":"أصحاب الحِجر كذّبوا المرسلين، وكانوا ينحتون من الجبال بيوتاً آمنين فما أغنى عنهم ما كانوا يكسبون.","h":"h_thamud1"},{"t":"أتتركون في ما هاهنا آمنين؟","r":[26,146,149],"n":"ذكّرهم صالح بجنات وعيون وزروع ونخل، وعاب عليهم نحت الجبال بيوتاً فرهين."},{"t":"تمتعوا في داركم ثلاثة أيام","r":[11,61,68],"n":"عقروا الناقة فأُمهلوا ثلاثة أيام، ثم جاءت الصيحة فأصبحوا في ديارهم جاثمين كأن لم يغنوا فيها."},{"t":"إذ انبعث أشقاها","r":[91,11,15],"n":"كذبوا بطغواهم فانبعث أشقاهم فعقرها، فدمدم عليهم ربهم بذنبهم فسوّاها.","h":"h_thamud2"},{"t":"ولقد يسّرنا القرآن للذكر","r":[54,23,31],"n":"جعل الله صيحة واحدة تحيلهم كهشيم المحتظر، وتكرر النداء: فهل من مدّكر؟"}]},{"id":"lut","t":"قوم لوط: الفاحشة التي لم يسبقهم بها أحد","d":"أُرسل لوط إلى أهل «سدوم» وما حولها من القرى، فنهاهم عن فاحشة ابتدعوها، فردّوا دعوته ثم همّوا بإخراجه وأهله لأنهم أناس يتطهرون. فنجّاه الله وأهله إلا امرأته، وأمطر على القوم حجارة وجعل عالي القرية سافلها.","ay":[{"t":"أتأتون الفاحشة ما سبقكم بها من أحد؟","r":[7,80,84],"n":"نهاهم لوط عن فاحشة لم تُعرف قبلهم، ووصفهم بالإسراف، وختم الله بقوله: فانظر كيف كان عاقبة المجرمين.","h":"h_lut2"},{"t":"أليس منكم رجل رشيد؟","r":[11,77,83],"n":"ضاق لوط بضيوفه ذرعاً، وقال: لو أن لي بكم قوة أو آوي إلى ركن شديد، فكشف الرسل أنهم رسل ربه.","h":"h_lut"},{"t":"لعمرك إنهم لفي سكرتهم يعمهون","r":[15,73,77],"n":"أخذتهم الصيحة مشرقين وجُعل عالي القرية سافلها، وفي ذلك لآيات للمتوسمين، وإنها لبسبيل مقيم."},{"t":"ما لهم يتطهرون","r":[27,54,58],"n":"قابلوا النصح بالسخرية من الطهارة، فأمطر الله عليهم مطراً فساء مطر المنذرين."},{"t":"نجيناهم بسحر","r":[54,33,39],"n":"أرسل عليهم حاصباً إلا آل لوط، نجاة نعمة من عند الله لمن شكر."}]},{"id":"madyan","t":"أصحاب مدين والأيكة: الغش في الكيل والميزان","d":"أرسل الله إلى مدين شعيباً يأمرهم بالتوحيد وإيفاء الكيل والميزان وأن لا يقعدوا بكل صراط يوعدون، فكذبوه. قال ابن كثير إن أصحاب الأيكة هم أهل مدين على الصحيح. وأُهلكوا بالرجفة وبعذاب يوم الظلة. وفي قصتهم ربط بين العدالة الاقتصادية والإيمان.","ay":[{"t":"أوفوا الكيل والميزان","r":[7,85,87],"n":"دعاهم شعيب إلى التوحيد وإيفاء الكيل والميزان وترك الإفساد بعد إصلاح الأرض."},{"t":"لا تقعدوا بكل صراط توعدون","r":[7,86,88],"n":"ذكّرهم بالنعمة إذ كانوا قليلاً فكثّرهم، وحذّرهم من صدّ الناس عن سبيل الله."},{"t":"قال الملأ: لنخرجنك يا شعيب","r":[7,88,93],"n":"هددوه بالإخراج، فقال إنه لا يعود في ملتهم بعد أن نجاه الله، ثم أخذتهم الرجفة فأصبحوا جاثمين."},{"t":"ويا قوم لا يجرمنكم شقاقي","r":[11,89,95],"n":"حذرهم أن يصيبهم مثل ما أصاب قوم نوح وهود وصالح ولوط، فلما جاء أمرنا نجينا شعيباً والذين آمنوا."},{"t":"أصحاب الأيكة المرسلين","r":[26,176,191],"n":"نسب القرآن هؤلاء إلى الأيكة ولم يقل أخوهم شعيب، فأخذهم عذاب يوم الظلة إنه كان عذاب يوم عظيم."},{"t":"وإنهما لبإمام مبين","r":[15,78,79],"n":"أصحاب الأيكة وقوم لوط أخذ الله منهم، وديارهم على طريق ظاهر يُعتبر به."}]},{"id":"rass","t":"أصحاب الرس: ما أُجمل وما اختُلف فيه","d":"ذكر القرآن أصحاب الرس في سياق الأمم المكذبة، ولم يبيّن موضعهم ولا نبيهم ولا زمنهم. فاختلف المفسرون: أهم قرية من قرى ثمود؟ أم أصحاب فلج باليمامة؟ أم أهل بئر بأذربيجان؟ والمقطوع به ما نصّ عليه القرآن من أنهم كذّبوا الرسل فحقّ وعيد الله.","ay":[{"t":"وعاداً وثمود وأصحاب الرس","r":[25,38,40],"n":"ذكرهم الله مع عاد وثمود وقروناً بين ذلك كثيراً، وضرب لكل الأمثال وتبّر كلاً تتبيراً."},{"t":"كذبت قبلهم قوم نوح وأصحاب الرس","r":[50,12,14],"n":"كل كذّب الرسل فحقّ وعيد: وفيه تسلية للنبي ﷺ وتخويف لمن كذّبه."}]},{"id":"firaun","t":"فرعون ومصر: الملك والعلوّ والأنهار تجري","d":"«إن فرعون علا في الأرض وجعل أهلها شيعاً يستضعف طائفة منهم». ملك عظيم في مصر بجنات وعيون وكنوز ومقام كريم وأنهار تجري من تحته، ادّعى الربوبية فأرسل الله إليه موسى وهارون. وبعد الآيات التسع أغرقه الله وجنوده وجعل بدنه آية، وأورث أرضه بني إسرائيل.","ay":[{"t":"إن فرعون علا في الأرض","r":[28,4,6],"n":"الاستعلاء وتقسيم الناس شيعاً واستضعاف طائفة، ثم إرادة الله أن يمنّ على المستضعفين ويجعلهم أئمة."},{"t":"أليس لي ملك مصر؟","r":[43,51,56],"n":"افتخر بملك مصر والأنهار تجري من تحته، فاستخف قومه فأطاعوه، وجعلهم الله سلفاً ومثلاً للآخرين."},{"t":"ما علمت لكم من إله غيري","r":[28,38],"n":"ادّعى الألوهية وأمر هامان بالبناء ليطّلع إلى إله موسى، فظهر استكباره بالباطل."},{"t":"ما كانوا يصنعون وما كانوا يعرشون","r":[7,137],"n":"ورّث الله القوم المستضعفين مشارق الأرض ومغاربها، ودمّر ما كان يصنع فرعون وقومه وما يعرشون."},{"t":"فأخرجناهم من جنات وعيون","r":[26,57,59],"n":"أخرجهم الله من جنات وعيون وكنوز ومقام كريم وأورثها بني إسرائيل.","h":"h_fir1"},{"t":"كم تركوا من جنات وعيون","r":[44,25,29],"n":"تركوا ما جمعوا لقوم آخرين، وما بكت عليهم السماء والأرض ولا كانوا منظرين."},{"t":"فاليوم ننجيك ببدنك","r":[10,90,92],"n":"لما أدركه الغرق آمن في لحظة اضطرار فلم يُقبل منه، وبقي بدنه آية لمن خلفه."},{"t":"امرأة فرعون","r":[66,11],"n":"آسية آمنت في بيت الطاغية وسألت الله بيتاً في الجنة، فجعلها الله مثلاً للذين آمنوا.","h":"h_fir2"}]},{"id":"saba","t":"سبأ: الجنتان والسد وسيل العرم","d":"«لقد كان لسبأ في مسكنهم آية: جنتان عن يمين وشمال»، بلدة طيبة ورب غفور. بنوا سداً يجمع السيول ويسقي البساتين، فلما أعرضوا أرسل الله عليهم سيل العرم وبدّل جنتيهم بأكل خمط وأثل وشيء من سدر قليل، ومزّقهم كل ممزّق. ومنهم بلقيس التي وصفها الهدهد بأنها «أوتيت من كل شيء ولها عرش عظيم».","ay":[{"t":"لقد كان لسبأ في مسكنهم آية","r":[34,15,16],"n":"جنتان عن يمين وشمال، وأُمروا بالأكل من رزق ربهم والشكر، فأعرضوا فأرسل عليهم سيل العرم.","h":"h_saba"},{"t":"وبدلناهم بجنتيهم جنتين","r":[34,16,17],"n":"صارت ثمارهم أكلاً خمطاً وأثلاً وشيئاً من سدر قليل، ذلك جزاؤهم بما كفروا."},{"t":"ربنا باعد بين أسفارنا","r":[34,18,19],"n":"كانت قرى ظاهرة متصلة تيسّر السير، فبطروا وقالوا باعد، وظلموا أنفسهم، فجعلهم أحاديث ومزقهم كل ممزق."},{"t":"امرأة تملكهم وأوتيت من كل شيء","r":[27,22,26],"n":"خبر الهدهد عن مملكة سبأ: ملكة، وسلطان، وعرش عظيم، وسجودهم للشمس من دون الله."},{"t":"ما كنت قاطعة أمراً حتى تشهدون","r":[27,29,35],"n":"ملكة تستشير ملأها ولا تقطع أمراً دونهم، وتقدّر عاقبة الحرب: إن الملوك إذا دخلوا قرية أفسدوها."},{"t":"أسلمت مع سليمان لله رب العالمين","r":[27,44],"n":"وصلت الملكة إلى الإيمان بعد رؤية الصرح: «رب إني ظلمت نفسي وأسلمت مع سليمان لله رب العالمين»."}]},{"id":"dhulqarnayn","t":"ذو القرنين: التمكين والعدل وبناء السدّ","d":"سأل المشركون عنه امتحاناً للنبي ﷺ، فأجاب القرآن بما فيه العبرة: ملك مكّن الله له في الأرض وآتاه من كل شيء سبباً، فسار مغرباً ومشرقاً، وعامل كل قوم بما يليق بهم. ثم أقام بين السدّين ردماً بقوة الحديد والقطر حاجزاً عن يأجوج ومأجوج، ونسب النعمة إلى ربه: «هذا رحمة من ربي».","ay":[{"t":"إنا مكنا له في الأرض وآتيناه من كل شيء سبباً","r":[18,83,85],"n":"التمكين الإلهي وأسباب القوة؛ ولم يبيّن القرآن أسماءها ولا تفاصيلها، فلا يُبنى عليها بالإسرائيليات."},{"t":"مغرب الشمس وسياسة العدل","r":[18,86,88],"n":"خُيّر بين التعذيب والإحسان فعدل: من ظلم عذّبه، ومن آمن وعمل صالحاً فله الحسنى وقول يسير."},{"t":"مطلع الشمس","r":[18,89,91],"n":"أتبع سبباً حتى بلغ مطلع الشمس، ووجدها تطلع على قوم لم يجعل الله لهم من دونها ستراً."},{"t":"بين السدين وقوم لا يكادون يفقهون قولاً","r":[18,92,94],"n":"شكا القوم إفساد يأجوج ومأجوج وعرضوا خرجاً ليبني سدّاً بينهم وبينهم."},{"t":"أعينوني بقوة أجعل بينكم وبينهم ردماً","r":[18,95,97],"n":"رفض الأجر وطلب العون بقوة الرجال: زُبَر الحديد حتى ساوى بين الصدفين، ثم أفرغ عليه قطراً فما اسطاعوا أن يظهروه وما استطاعوا له نقباً.","h":"h_yajuj"},{"t":"هذا رحمة من ربي","r":[18,98],"n":"نسب النجاح إلى فضل ربه، وذكّر بأن الردم سيُدكّ عند مجيء وعد الله."},{"t":"حتى إذا فتحت يأجوج ومأجوج","r":[21,96,97],"n":"خروجهم من أشراط الساعة وهم من كل حدب ينسلون، واقتراب الوعد الحق."}]},{"id":"ukhdud","t":"أصحاب الأخدود: الثبات على الإيمان أمام الجبروت","d":"«قُتل أصحاب الأخدود النار ذات الوقود، إذ هم عليها قعود وهم على ما يفعلون بالمؤمنين شهود، وما نقموا منهم إلا أن يؤمنوا بالله العزيز الحميد». حضارة مادية ملكت القوة وحاربت الإيمان بالتعذيب، فكانت عاقبتها اللعنة، وثبت المؤمنون فكان لهم الفوز الكبير. ولم يعيّن القرآن موضعهم.","ay":[{"t":"قتل أصحاب الأخدود","r":[85,4,9],"n":"دعاء عليهم بالهلاك، ووصف لجبروتهم: قعود على النار شهود على تعذيب المؤمنين، ولا ذنب لهم إلا الإيمان.","h":"h_ukhdud"},{"t":"إن الذين فتنوا المؤمنين","r":[85,10,11],"n":"وعيد التائبين وغير التائبين: لهم عذاب جهنم وعذاب الحريق، وللذين آمنوا جنات تجري من تحتها الأنهار."},{"t":"هل أتاك حديث الجنود","r":[85,17,20],"n":"ذكّر الله بفرعون وثمود: الجنود الطغاة سنّتهم واحدة، والله من ورائهم محيط."}]},{"id":"tubba","t":"قوم تُبّع: ملوك اليمن قبل الإسلام","d":"ذكر القرآن قوم تُبّع في سورتي الدخان وق مثلاً لمن أنكروا البعث. و«تُبّع» لقب لمن ملك اليمن في الزمن السابق، قال السعدي، ولم يخبرنا الله من هو الرسول ولا أيّ تُبّع. وفي الحديث الصحيح قول النبي ﷺ: «ما أدري أتُبّع لعين هو أم لا»، وفيه الورع في الحكم على من لم يرد فيه نص.","ay":[{"t":"أهم خير أم قوم تُبّع؟","r":[44,37],"n":"سؤال تقريع لقريش: ليسوا خيراً من أمم أهلكها الله لإجرامها، فليحذروا مثل مصيرها.","h":"h_tubba"},{"t":"وقوم تُبّع كل كذّب الرسل","r":[50,14],"n":"كل كذّب الرسل فحقّ وعيد: قاعدة عامة تضمّ الأمم المذكورة جميعاً."}]},{"id":"rum","t":"الروم والفرس: دول تتداول","d":"في سورة الروم خبر عن دولتين عظيمتين كانتا تتصارعان وقت نزول الآيات، وإخبار قبل وقوعه بأن الروم ستغلب في بضع سنين. والدرس أن الغلبة والنصر ليستا بمجرد الأسباب، فـ«لله الأمر من قبل ومن بعد». وفي الصحيح أن النبي ﷺ بشّر بزوال ملك كسرى وقيصر وإنفاق كنوزهما في سبيل الله.","ay":[{"t":"غلبت الروم في أدنى الأرض","r":[30,1,4],"n":"خبر بغلبة الروم بعد غلبهم في بضع سنين، وإقرار أن الأمر لله من قبل ومن بعد.","h":"h_rum2"},{"t":"وعد الله لا يخلف الله وعده","r":[30,5,7],"n":"يفرح المؤمنون بنصر الله، ووعده حق، ولكن أكثر الناس لا يعلمون ظاهراً من الحياة الدنيا وهم عن الآخرة غافلون.","h":"h_rum1"},{"t":"ثم كان عاقبة الذين أساؤوا السوأى","r":[30,9,10],"n":"ربط السياق بين غلبة الدول وسنة الله في الأمم السابقة التي كانت أقوى وأكثر آثاراً."}]},{"id":"israel","t":"بنو إسرائيل: التفضيل والإفسادان","d":"ذكر القرآن بني إسرائيل أكثر من غيرهم: فضّلهم على العالمين، وأنجاهم من فرعون، وآتاهم الكتاب والحكم والنبوة، وجعلهم ملوكاً، ثم عاب عليهم نقض العهد وقتل الأنبياء وتحريف الكلم. وأخبر أنهم يفسدون في الأرض إفسادين، يسلّط الله عليهم في كل مرة من يسوؤهم، لعلهم يرجعون.","ay":[{"t":"فضلتكم على العالمين","r":[2,47,50],"n":"ذكّرهم بالنعمة، وبالنجاة من آل فرعون، وفرق البحر وغرقهم وهم ينظرون.","h":"h_isr1"},{"t":"لتفسدنّ في الأرض إفسادين","r":[17,4,8],"n":"قضى الله في الكتاب: إفسادان وعلو كبير، وتسليط عباد أولي بأس، ثم رد الكرّة، ثم وعد الآخرة، «وإن عدتم عدنا»."},{"t":"ادخلوا الأرض المقدسة","r":[5,20,26],"n":"أمرهم موسى بدخول الأرض المقدسة فنكصوا خوفاً من الجبّارين، فحُرّمت عليهم أربعين سنة يتيهون في الأرض."},{"t":"الملأ من بني إسرائيل بعد موسى","r":[2,246,251],"n":"طلبوا ملكاً يقاتلون معه، فبعث الله طالوت، وانتصروا بإذن الله وقتل داود جالوت وآتاه الله الملك والحكمة.","h":"h_isr2"},{"t":"لُعن الذين كفروا من بني إسرائيل","r":[5,78,79],"n":"سبب اللعن: العصيان والاعتداء، وتركهم التناهي عن المنكر الذي فعلوه."}]},{"id":"fil","t":"أصحاب الفيل: حفظ البيت الحرام","d":"جاء جمع من الحبشة واليمن بالفيلة لهدم الكعبة، ولم يكن بالعرب مدافعة، فأرسل الله عليهم طيراً أبابيل ترميهم بحجارة من سجيل فجعلهم كعصف مأكول. وكانت إرهاصاً بمبعث النبي ﷺ، وامتن الله بها على قريش.","ay":[{"t":"ألم تر كيف فعل ربك بأصحاب الفيل","r":[105,1,5],"n":"كيدهم في تضليل، وطير أبابيل بحجارة من سجيل، فكانوا كعصف مأكول.","h":"h_fil"},{"t":"لإيلاف قريش","r":[106,1,4],"n":"نعمة الأمن والرزق في الرحلتين مقابل عبادة رب هذا البيت."}]}],"h":[{"id":"h_nuh","t":"نوح أول الرسل إلى أهل الأرض","x":"يَا نُوحُ أَنْتَ أَوَّلُ الرُّسُلِ إِلَى أَهْلِ الأَرْضِ، وَسَمَّاكَ اللَّهُ عَبْدًا شَكُورًا","src":[["bukhari","3340"],["bukhari","4712"]],"gr":"صحيح: رواه البخاري","dg":"","f":"من حديث الشفاعة: الناس يأتون نوحاً يوم القيامة فيصفونه بأنه أول الرسل إلى أهل الأرض وبأن الله سماه عبداً شكوراً.","en":"\"People will come to Nuh and say: Nuh, you are the first of the messengers to the people of the earth, and God named you a grateful servant.\"","ch":"nuh"},{"id":"h_ad1","t":"نصرت بالصبا وأهلكت عاد بالدبور","x":"نُصِرْتُ بِالصَّبَا، وَأُهْلِكَتْ عَادٌ بِالدَّبُورِ","src":[["bukhari","3205"],["bukhari","1035"],["muslim","900"]],"gr":"صحيح: متفق عليه","dg":"","f":"الريح جند من جنود الله: تكون نصراً لقوم وهلاكاً لآخرين بأمره، فعاد أُهلكت بريح الدبور الباردة العاتية.","en":"\"I was given victory with the east wind (as-saba), and 'Ad were destroyed with the west wind (ad-dabur).\"","ch":"ad"},{"id":"h_ad2","t":"خشية النبي ﷺ من الغيم أن يكون عذاباً","x":"مَا يُؤْمِنِّي أَنْ يَكُونَ فِيهِ عَذَابٌ عُذِّبَ قَوْمٌ بِالرِّيحِ","src":[["bukhari","4829"]],"gr":"صحيح: رواه البخاري","dg":"","f":"كان النبي ﷺ إذا رأى غيماً أو ريحاً عُرف في وجهه خوفاً أن يكون عذاباً، تذكّراً لما أصاب قوم عاد حين ظنوا العارض ممطراً.","en":"\"What assures me that it does not carry punishment? A people were punished by the wind.\"","ch":"ad"},{"id":"h_thamud1","t":"لا تدخلوا مساكن الذين ظلموا إلا باكين","x":"لاَ تَدْخُلُوا مَسَاكِنَ الَّذِينَ ظَلَمُوا إِلاَّ أَنْ تَكُونُوا بَاكِينَ، أَنْ يُصِيبَكُمْ مَا أَصَابَهُمْ","src":[["bukhari","3380"],["bukhari","4419"],["muslim","2980"]],"gr":"صحيح: متفق عليه","dg":"","f":"ديار المعذَّبين موضع عبرة لا نزهة: من مرّ بها يمرّ خاشعاً باكياً خوفاً أن يصيبه ما أصابهم.","en":"\"Do not enter the dwellings of those who wronged themselves unless weeping, lest what befell them befall you.\"","ch":"thamud"},{"id":"h_thamud2","t":"عاقر الناقة: رجل عزيز عارم منيع في رهطه","x":"انْبَعَثَ لَهَا رَجُلٌ عَزِيزٌ عَارِمٌ، مَنِيعٌ فِي رَهْطِهِ، مِثْلُ أَبِي زَمْعَةَ","src":[["bukhari","4942"]],"gr":"صحيح: رواه البخاري","dg":"","f":"وصف النبي ﷺ عاقر الناقة بأنه عزيز في قومه منيع، فالفساد يقوده المتنفذ ويتبعه جمع.","en":"\"A man of power, vicious and well protected among his clan, like Abu Zam'a, rose up for it.\"","ch":"thamud"},{"id":"h_lut","t":"يرحم الله لوطاً، لقد كان يأوي إلى ركن شديد","x":"يَرْحَمُ اللَّهُ لُوطًا، لَقَدْ كَانَ يَأْوِي إِلَى رُكْنٍ شَدِيدٍ","src":[["bukhari","3387"],["bukhari","3372"]],"gr":"صحيح: رواه البخاري","dg":"","f":"الركن الشديد هو الله سبحانه؛ والمعنى أن لوطاً نسي في ضيقه أنه يأوي إلى أقوى سند.","en":"\"May God have mercy on Lut: he used to take refuge in a strong support.\"","ch":"lut"},{"id":"h_lut2","t":"أخوف ما أخاف على أمتي عمل قوم لوط","x":"إِنَّ أَخْوَفَ مَا أَخَافُ عَلَى أُمَّتِي عَمَلُ قَوْمِ لُوطٍ","src":[["tirmidhi","1457"]],"gr":"","dg":"الألباني: حسن؛ أحمد شاكر: حسن؛ بشار عواد معروف: حسن؛ زبير علي زئي: ضعيف","f":"تحذير نبوي من الوقوع فيما أُهلك به قوم لوط، وقد حكم عليه أهل الحديث بالحسن على خلاف بينهم في درجته كما يظهر في بيان درجته.","en":"\"The thing I fear most for my nation is the act of the people of Lut.\"","ch":"lut"},{"id":"h_fir1","t":"يوم عاشوراء: غرق فرعون ونجاة موسى","x":"هَذَا يَوْمٌ عَظِيمٌ أَنْجَى اللَّهُ فِيهِ مُوسَى وَقَوْمَهُ وَغَرَّقَ فِرْعَوْنَ وَقَوْمَهُ فَصَامَهُ مُوسَى شُكْرًا","src":[["muslim","1130"],["bukhari","2004"]],"gr":"صحيح: متفق عليه","dg":"","f":"شكر النجاة من الطغيان عبادة، ولذلك صام موسى هذا اليوم ثم صامه النبي ﷺ وأمر بصيامه.","en":"\"This is a great day on which God saved Musa and his people and drowned Pharaoh and his people, so Musa fasted it in gratitude.\"","ch":"firaun"},{"id":"h_fir2","t":"آسية امرأة فرعون من كمل النساء","x":"كَمَلَ مِنَ الرِّجَالِ كَثِيرٌ وَلَمْ يَكْمُلْ مِنَ النِّسَاءِ غَيْرُ مَرْيَمَ بِنْتِ عِمْرَانَ وَآسِيَةَ امْرَأَةِ فِرْعَوْنَ","src":[["muslim","2431"]],"gr":"صحيح: رواه مسلم","dg":"","f":"الإيمان لا يمنعه جبروت الحاكم ولا قرب الزوج، وقد جعل الله آسية مثلاً للذين آمنوا.","en":"\"Many men attained perfection, but among women none attained it except Maryam daughter of 'Imran and Asiya wife of Pharaoh.\"","ch":"firaun"},{"id":"h_saba","t":"سبأ: رجل ولد عشرة من العرب","x":"لَيْسَ بِأَرْضٍ وَلاَ امْرَأَةٍ وَلَكِنَّهُ رَجُلٌ وَلَدَ عَشَرَةً مِنَ الْعَرَبِ فَتَيَامَنَ مِنْهُمْ سِتَّةٌ وَتَشَاءَمَ مِنْهُمْ أَرْبَعَةٌ فَأَمَّا الَّذِينَ تَشَاءَمُوا فَلَخْمٌ وَجُذَامٌ وَغَسَّانُ وَعَامِلَةٌ وَأَمَّا الَّذِينَ تَيَامَنُوا فَالأَزْدُ وَالأَشْعَرِيُّونَ وَحِمْيَرُ وَمَذْحِجٌ وَأَنْمَارُ وَكِنْدَةُ","src":[["tirmidhi","3222"]],"gr":"","dg":"الألباني: حسن صحيح؛ أحمد شاكر: حسن صحيح؛ بشار عواد معروف: حسن؛ زبير علي زئي: إسناده حسن","f":"بيّن النبي ﷺ أن سبأ اسم رجل تفرع منه عشر قبائل عربية، فتكون الآيات في أمة معروفة النسب لا في خرافة.","en":"\"It is neither a land nor a woman, but a man who fathered ten of the Arabs. Six of them went toward Yemen and four toward the Sham. As for those who went to the Sham: Lakhm, Judham, Ghassan and 'Amila. As for those who went to Yemen: al-Azd, al-Ash'ariyyun, Himyar, Madhhij, Anmar and Kinda.\"","ch":"saba"},{"id":"h_yajuj","t":"فُتح من ردم يأجوج ومأجوج مثل هذا","x":"فَتَحَ اللَّهُ مِنْ رَدْمِ يَأْجُوجَ وَمَأْجُوجَ مِثْلَ هَذَا","src":[["bukhari","3347"],["bukhari","3346"],["muslim","2880"]],"gr":"صحيح: متفق عليه","dg":"","f":"أخبر النبي ﷺ أن الردم قد فُتح منه ما يشبه حلقة عقدها بيده، وهو من أشراط الساعة التي حذّر منها.","en":"\"God has opened of the rampart of Yajuj and Majuj the like of this,\" and he made a circle with his hand (ninety).","ch":"dhulqarnayn"},{"id":"h_ukhdud","t":"حديث الغلام: اصبري فإنك على الحق (مقتطف)","x":"فَأَمَرَ بِالأُخْدُودِ فِي أَفْوَاهِ السِّكَكِ فَخُدَّتْ وَأَضْرَمَ النِّيرَانَ وَقَالَ مَنْ لَمْ يَرْجِعْ عَنْ دِينِهِ فَأَحْمُوهُ فِيهَا . أَوْ قِيلَ لَهُ اقْتَحِمْ . فَفَعَلُوا حَتَّى جَاءَتِ امْرَأَةٌ وَمَعَهَا صَبِيٌّ لَهَا فَتَقَاعَسَتْ أَنْ تَقَعَ فِيهَا فَقَالَ لَهَا الْغُلاَمُ يَا أُمَّهِ اصْبِرِي فَإِنَّكِ عَلَى الْحَقِّ","src":[["muslim","3005"]],"gr":"صحيح: رواه مسلم","dg":"","f":"مقتطف من حديث الغلام الطويل عند مسلم: ثبات المؤمنين على الحق أمام النار، وأن التثبيت يأتي من الله، وأن الصبر على الأذى طريق الفوز.","en":"\"He ordered trenches dug at the mouths of the roads, they were dug and fires kindled; and he said: whoever does not turn back from his religion, throw him in it, or it was said to him: plunge in. They did so, until a woman came with her child who hesitated to fall in; the boy said: Mother, be patient, for you are on the truth.\"","ch":"ukhdud"},{"id":"h_tubba","t":"ما أدري أتُبّع لعين هو أم لا","x":"مَا أَدْرِي أَتُبَّعٌ لَعِينٌ هُوَ أَمْ لاَ","src":[["abudawud","4674"]],"gr":"","dg":"الألباني: صحيح؛ محيي الدين عبد الحميد: صحيح؛ زبير علي زئي: إسناده صحيح","f":"توقف النبي ﷺ فيما لم يُوحَ إليه فيه، وفي هذا درس في الورع وترك الجزم بلا دليل في أحوال الأمم.","en":"\"I do not know whether Tubba' was accursed or not.\"","ch":"tubba"},{"id":"h_rum1","t":"إذا هلك كسرى فلا كسرى بعده","x":"إِذَا هَلَكَ كِسْرَى فَلاَ كِسْرَى بَعْدَهُ، وَإِذَا هَلَكَ قَيْصَرُ فَلاَ قَيْصَرَ بَعْدَهُ، وَالَّذِي نَفْسُ مُحَمَّدٍ بِيَدِهِ لَتُنْفِقُنَّ كُنُوزَهُمَا فِي سَبِيلِ اللَّهِ","src":[["bukhari","3618"],["bukhari","3120"],["muslim","2918"]],"gr":"صحيح: متفق عليه","dg":"","f":"خبر نبوي بزوال دولتين عظيمتين وانتقال كنوزهما إلى المسلمين، وقد وقع كما أخبر.","en":"\"When Kisra perishes there will be no Kisra after him, and when Qaysar perishes there will be no Qaysar after him; by the One in whose hand is my soul, their treasures will be spent in the way of God.\"","ch":"rum"},{"id":"h_rum2","t":"سبب نزول: فرح المؤمنين بظهور الروم","x":"لَمَّا كَانَ يَوْمُ بَدْرٍ ظَهَرَتِ الرُّومُ عَلَى فَارِسَ فَأَعْجَبَ ذَلِكَ الْمُؤْمِنِينَ فَنَزَلَتْ : ( الم *غَلَبَتِ الرُّومُ ) إِلَى قَوْلِهِ : (يفْرَحُ الْمُؤْمِنُونَ بِنَصْرِ اللَّهِ ) قَالَ فَفَرِحَ الْمُؤْمِنُونَ بِظُهُورِ الرُّومِ عَلَى فَارِسَ","src":[["tirmidhi","3192"]],"gr":"","dg":"الألباني: صحيح؛ أحمد شاكر: صحيح لغيره؛ بشار عواد معروف: حسن؛ زبير علي زئي: حسن","f":"يروي سبب نزول آيات سورة الروم وفرح المؤمنين بظهور أهل الكتاب على المجوس، وقد اختلف في درجته كما يظهر في الأحكام عليه.","en":"\"On the day of Badr the Romans prevailed over the Persians, which pleased the believers; so it was revealed: Alif Lam Mim. The Romans have been defeated ... until: the believers rejoice. The believers rejoiced at the Romans' prevailing over the Persians.\"","ch":"rum"},{"id":"h_isr1","t":"كانت بنو إسرائيل تسوسهم الأنبياء","x":"كَانَتْ بَنُو إِسْرَائِيلَ تَسُوسُهُمُ الأَنْبِيَاءُ، كُلَّمَا هَلَكَ نَبِيٌّ خَلَفَهُ نَبِيٌّ، وَإِنَّهُ لاَ نَبِيَّ بَعْدِي","src":[["bukhari","3455"]],"gr":"صحيح: رواه البخاري","dg":"","f":"كان الأنبياء يسوسون بني إسرائيل بالشرع والسياسة معاً، ثم أُمر المسلمون بالوفاء للبيعة والحفاظ على الأمانة.","en":"\"The Children of Israel were governed by prophets: whenever a prophet died another succeeded him, but there will be no prophet after me.\"","ch":"israel"},{"id":"h_isr2","t":"لتتبعن سنن من كان قبلكم","x":"لَتَتْبَعُنَّ سَنَنَ مَنْ كَانَ قَبْلَكُمْ شِبْرًا شِبْرًا وَذِرَاعًا بِذِرَاعٍ، حَتَّى لَوْ دَخَلُوا جُحْرَ ضَبٍّ تَبِعْتُمُوهُمْ","src":[["bukhari","7320"]],"gr":"صحيح: رواه البخاري","dg":"","f":"تحذير من متابعة الأمم السابقة في أخطائها؛ فسنن الله تجري على الأمم جميعاً، ولا تحمي الأمة انتسابها وحده.","en":"\"You will follow the ways of those before you, span by span and cubit by cubit, until if they entered a lizard's hole you would follow them.\"","ch":"israel"},{"id":"h_fil","t":"حبسها حابس الفيل","x":"مَا خَلأَتِ الْقَصْوَاءُ، وَمَا ذَاكَ لَهَا بِخُلُقٍ، وَلَكِنْ حَبَسَهَا حَابِسُ الْفِيلِ","src":[["bukhari","2731"],["bukhari","2732"]],"gr":"صحيح: رواه البخاري","dg":"","f":"ذكر النبي ﷺ أن الله هو الذي حبس ناقته عن دخول مكة يوم الحديبية كما حبس الفيل عنها قديماً.","en":"\"Al-Qaswa did not balk, that is not her nature, but the One who held back the elephant held her back.\"","ch":"fil"},{"id":"h_gen1","t":"إن الله ليملي للظالم","x":"إِنَّ اللَّهَ لَيُمْلِي لِلظَّالِمِ حَتَّى إِذَا أَخَذَهُ لَمْ يُفْلِتْهُ","src":[["bukhari","4686"]],"gr":"صحيح: رواه البخاري","dg":"","f":"الإمهال ليس إهمالاً: يؤخّر الله الظالم ثم يأخذه أخذ عزيز مقتدر، وقد قرأ النبي ﷺ آية هود في ذلك.","en":"\"God grants the wrongdoer respite until, when He seizes him, He lets him not escape.\"","ch":"sunan"},{"id":"h_gen2","t":"أنهلك وفينا الصالحون؟ نعم إذا كثر الخبث","x":"أَنَهْلِكُ وَفِينَا الصَّالِحُونَ قَالَ نَعَمْ، إِذَا كَثُرَ الْخُبْثُ","src":[["bukhari","3346"],["bukhari","3598"],["muslim","2880"]],"gr":"صحيح: متفق عليه","dg":"","f":"وجود الصالحين لا يمنع الهلاك إذا كثر الفساد ولم يُنكر؛ فتغيير المنكر وإصلاح المجتمع مسؤولية جماعية.","en":"\"Shall we be destroyed while the righteous are among us?\" He said: \"Yes, when evil abounds.\"","ch":"sunan"}],"q":[{"ch":"sunan","w":"السعدي","bk":"saadi","s":30,"ay":9,"x":"فإنَّهم حين ينظُرون في آثار أولئك؛ لم يجِدوا إلاَّ أمماً بائدةً، وخلقاً مهلَكين، ومنازل بعدهم موحشة. وذمٌّ من الخلق عليهم متتابعٌ، وهذا جزاءٌ معجَّل نموذج للجزاء الأخروي ومبتدأ له","n":"حين ينظر الإنسان في آثار الأمم الهالكة يرى قوتهم لم تغنِ عنهم، وهذا الجزاء المعجّل بداية للجزاء الأخروي.","en":"\"For when they look at the traces of those, they find nothing but perished nations, destroyed creatures, and desolate dwellings after them, and continuous censure from creation upon them; and this is a hastened recompense, a model of the Hereafter's recompense and its beginning.\""},{"ch":"sunan","w":"السعدي","bk":"saadi","s":11,"ay":117,"x":"أي: وما كان الله ليهلك القرى بظُلم منه لهم والحالُ أنَّهم {مصلحون}؛ أي: مقيمون على الصلاح مستمرون عليه؛ فما كان الله ليهلكهم إلا إذا ظلموا، وقامت عليهم حجَّة الله","n":"الإهلاك عدل لا ظلم، يقع حين يقيمون على الظلم بعد قيام الحجة.","en":"\"That is: God would never destroy the towns unjustly while they were reformers, persisting in righteousness; God does not destroy them except when they wrong and God's proof has been established against them.\""},{"ch":"nuh","w":"السعدي","bk":"saadi","s":71,"ay":1,"x":"لم يذكر الله في هذه السورة إلاَّ قصَّة نوح وحدَها؛ لطول لَبْثِهِ في قومه وتكرار دعوته إلى التوحيد ونهيه عن الشرك","n":"سورة كاملة لقصة نوح وحده لطول دعوته.","en":"\"God mentioned in this surah only the story of Nuh alone, because of the length of his stay among his people, the repetition of his call to monotheism, and his forbidding of shirk.\""},{"ch":"nuh","w":"ابن كثير","bk":"ibnkathir","s":29,"ay":14,"x":"أَنَّهُ مَكَثَ فِي قَوْمِهِ هَذِهِ الْمُدَّةَ يَدْعُوهُمْ إِلَى اللَّهِ لَيْلًا وَنَهَارًا، وَسِرًّا، وجهارًا، وَمَعَ هَذَا مَا زَادَهُمْ ذَلِكَ إِلَّا فِرَارًا عَنِ الْحَقِّ، وَإِعْرَاضًا عَنْهُ وَتَكْذِيبًا لَهُ، وَمَا آمَنُ مَعَهُ مِنْهُمْ إِلَّا قَلِيلٌ","n":"دعا سراً وجهاراً وليلاً ونهاراً، ولم يؤمن معه إلا قليل.","en":"\"That he remained among his people for this period calling them to God night and day, secretly and openly, and with all this it only increased them in fleeing from the truth, turning away from it and denying it, and only a few believed with him from among them.\""},{"ch":"nuh","w":"ابن كثير","bk":"ibnkathir","s":25,"ay":38,"x":"وَلِهَذَا أَغْرَقَهُمُ الله جَمِيعًا، وَلَمْ يَبق مِنْهُمْ أَحَدٌ، وَلَمْ يَبْقَ عَلَى وَجْهِ الْأَرْضِ مِنْ بَنِي آدَمَ سِوَى أَصْحَابِ السَّفِينَةِ فَقَطْ","n":"لم ينجُ من الطوفان إلا أصحاب السفينة، فالبشر كلهم من ذرية من آمن.","en":"\"For this God drowned them all, and none of them remained, and none remained on the face of the earth of the children of Adam except the people of the Ark alone.\""},{"ch":"ad","w":"السعدي","bk":"saadi","s":89,"ay":6,"x":"بهذه الأمم الطاغية، عاد وهي {إرم}: القبيلة المعروفة في اليمن، {ذات العِماد}؛ أي: القوَّة الشديدة والعتوِّ والتجبُّر، {التي لم يُخۡلَقۡ مثلُها في البلاد} ؛ أي: في جميع البلدان في القوَّة والشدَّة؛ كما قال لهم نبيُّهم هودٌ عليه السلام:{واذكُروا إذۡ جَعَلَكُم خُلَفاء من بعدِ قوم نوح وزادَكُم في الخَلۡقِ بَسۡطَةً فاذكُروا آلاء الله لعلَّكُم تفلِحونَ}. {وثمودَ الذين جابوا الصَّخۡر بالواد}؛ أي: وادي القرى؛ نحتوا بقوَّتهم الصخور فاتَّخذوها مساكن، {وفرعونَ ذي الأوتادِ}؛ أي: ذي الجنود الذي ثبَّتوا ملكه كما تثبت الأوتاد [و] ما يراد إمساكه بها، {الذين طَغَوۡا في البلاد}: هذا الوصف عائدٌ إلى عادٍ وثمودَ وفرعونَ ومن تَبِعَهم؛ فإنَّهم طَغَوْا في بلاد الله، وآذوا عباد الله في دينهم ودنياهم. ولهذا قال:{فأكثروا فيها الفسادَ}: وهو العمل بالكفر وشعبه من جميع أجناس المعاصي، وسعوا في محاربة الرُّسُل وصدِّ الناس عن سبيل الله، فلما بلغوا من العتوِّ ما هو موجبٌ لهلاكهم؛ أرسل الله عليهم من عذابه ذَنُوباً وسوطَ عذاب، {إنَّ ربَّك لبالمرصادِ}: لمن يعصيه ؛ يمهِلُه قليلاً ثم يأخُذُه أخذَ عزيزٍ مقتدرٍ","n":"يجمع عاداً وثمود وفرعون في سنة واحدة: طغيان وإفساد ثم أخذ.","en":"\"With these tyrannical nations: 'Ad ... Thamud ... and Pharaoh, owner of the stakes. They are the ones who transgressed in the lands, and multiplied corruption therein; so God sent upon them a portion of His punishment and a lash of torment. Indeed your Lord is ever watchful: He gives respite to whoever disobeys Him a little, then seizes him with the seizing of the Almighty, the Able.\""},{"ch":"ad","w":"ابن كثير","bk":"ibnkathir","s":7,"ay":65,"x":"وَقَدْ كَانَتْ مَسَاكِنُهُمْ باليمن بالأحقاف، وهي جبال الرمل. قَالَ مُحَمَّدُ بْنُ إِسْحَاقَ، عَنْ مُحَمَّدِ بْنِ عَبْدِ اللَّهِ بْنِ أَبِي سَعِيدٍ الْخُزَاعِيِّ، عَنْ أَبِي الطُّفَيْلِ عَامِرِ بْنِ وَاثِلَةَ، سَمِعْتُ عَلِيَّ بْنَ أَبِي طَالِبٍ [رَضِيَ اللَّهُ عَنْهُ] يَقُولُ لِرَجُلٍ مِنْ حَضْرَمَوْتَ: هَلْ رَأَيْتَ كَثِيبًا أَحْمَرَ تُخَالِطُهُ مَدَرَة حَمْرَاءُ ذَا أرَاكٍ وسدْر كَثِيرٍ بِنَاحِيَةِ كَذَا وَكَذَا مِنْ أَرْضِ حَضْرَمَوْتَ، هَلْ رَأَيْتَهُ؟ قَالَ: نَعَمْ يَا أَمِيرَ الْمُؤْمِنِينَ. وَاللَّهِ إِنَّكَ لَتَنْعَتُهُ نعتَ رَجُلٍ قَدْ رَآهُ. قَالَ: لَا وَلَكِنِّي قَدْ حدِّثتُ عَنْهُ. فَقَالَ الْحَضْرَمِيُّ: وَمَا شَأْنُهُ يَا أَمِيرَ الْمُؤْمِنِينَ؟ قَالَ: فِيهِ قبرُ هُودٍ، عَلَيْهِ السَّلَامُ. رَوَاهُ ابْنُ جَرِيرٍ وَهَذَا فِيهِ فَائِدَةٌ أَنَّ مَسَاكِنَهُمْ كَانَتْ بِالْيَمَنِ، وَأَنَّ هُودًا، عَلَيْهِ السَّلَامُ، دُفِنَ هُنَاكَ","n":"ذكر مساكن عاد في الأحقاف باليمن وموضع قبر هود بحسب ما رواه.","en":"\"Their dwellings were in Yemen in al-Ahqaf, which are the sand mountains. Muhammad ibn Ishaq narrated ... from Abu al-Tufayl 'Amir ibn Wathila: I heard 'Ali ibn Abi Talib say to a man from Hadramawt: Have you seen a red dune mixed with red clods, with many arak and lote trees, in such and such part of the land of Hadramawt? ... He said: In it is the grave of Hud. ... This contains the benefit that their dwellings were in Yemen and that Hud was buried there.\""},{"ch":"thamud","w":"ابن كثير","bk":"ibnkathir","s":7,"ay":73,"x":"قَالَ عُلَمَاءُ التَّفْسِيرِ وَالنَّسَبِ: ثَمُودُ بْنُ عَاثِرَ بْنِ إِرَمَ بْنِ سَامَ بْنِ نُوحٍ، وَهُوَ أَخُو جَديس بْنِ عَاثِرَ، وَكَذَلِكَ قَبِيلَةُ طَسْم، كُلُّ هَؤُلَاءِ كَانُوا أَحْيَاءً مِنَ الْعَرَبِ الْعَارِبَةِ قَبْلَ إِبْرَاهِيمَ الْخَلِيلِ، عَلَيْهِ السَّلَامُ، وَكَانَتْ ثَمُودُ بَعْدَ عَادٍ، وَمَسَاكِنُهُمْ مَشْهُورَةٌ فِيمَا بَيْنَ الْحِجَازِ وَالشَّامِ إِلَى وَادِي الْقُرَى وَمَا حَوْلَهُ، وَقَدْ مَرَّ رَسُولُ اللَّهِ ﷺ عَلَى قُرَاهُمْ وَمَسَاكِنِهِمْ، وَهُوَ ذَاهِبٌ إِلَى تَبُوكَ سَنَةَ تِسْعٍ","n":"نسب ثمود ومساكنهم بين الحجاز والشام، ومرور النبي ﷺ بها وهو ذاهب إلى تبوك.","en":"\"The scholars of tafsir and genealogy said: Thamud is the son of 'Athir ibn Iram ibn Sam ibn Nuh ... all of these were tribes of the original Arabs before Ibrahim, and Thamud came after 'Ad; their dwellings are well known between the Hijaz and the Levant up to Wadi al-Qura and what surrounds it, and the Messenger of God ﷺ passed by their villages and dwellings while going to Tabuk in the year nine.\""},{"ch":"thamud","w":"السعدي","bk":"saadi","s":7,"ay":73,"x":"واذۡكُروا إذ جَعَلَكُم خلفاءَ: في الأرض تتمتَّعون بها وتدركون مطالبكم، {من بعد عادٍ}: الذين أهلكهم الله وجعَلَكم خلفاء من بعدهم، {وبوَّأكم في الأرض}؛ أي: مكَّن لكم فيها وسهَّل لكم الأسباب الموصلة إلى ما تريدون وتبتغون، {تتَّخذونَ من سهولها قصوراً}؛ أي: الأراضي السهلة التي ليست بجبال بيوتاً، ومن الجبال بيوتاً ينحتونها كما هو مشاهدٌ إلى الآن أعمالهم التي في الجبال من المساكن والحِجْر ونحوها، وهي باقية ما بقيت الجبال","n":"يصف عمرانهم: قصور في السهول وبيوت منحوتة في الجبال لا تزال آثارها.","en":"\"And remember when He made you successors: on the earth you enjoy it and attain your needs, after 'Ad whom God destroyed, and He settled you in the land, that is: He established you in it and eased for you the means leading to what you want. You take palaces from its plains: the easy lands, not mountains, as homes, and from the mountains homes you carve, as is witnessed even now in their works in the mountains of dwellings and al-Hijr and the like, which remain as long as the mountains remain.\""},{"ch":"thamud","w":"ابن كثير","bk":"ibnkathir","s":15,"ay":80,"x":"أَيْ: مِنْ غَيْرِ خَوْفٍ وَلَا احْتِيَاجٍ إِلَيْهَا، بَلْ أَشَرًا وَبَطَرًا وَعَبَثًا","n":"ينبّه إلى أن نحتهم لم يكن لحاجة بل للمباهاة والعبث.","en":"\"That is: without fear and without need of them, but out of arrogance, insolence and futility.\""},{"ch":"lut","w":"السعدي","bk":"saadi","s":7,"ay":80,"x":"وينهاهم عن الفاحشة التي ما سبقَهم بها أحدٌ من العالمين؛ فقال:{أتأتونَ الفاحشةَ}؛ أي: الخصلة التي بلغت في العِظَم والشَّناعة إلى أن استغرقتْ أنواعَ الفحش، {ما سَبَقَكم بها من أحدٍ من العالمين}: فكونُها فاحشةً من أشنع الأشياء، وكونُهم ابتدعوها، وابتَكَروها، وسَنُّوها لمن بعدَهم من أشنع ما يكونُ أيضاً","n":"ابتدعوا فاحشة وسنّوها لمن بعدهم، وكان ذلك من أشنع الأمور.","en":"\"And forbids them the indecency which no one among the worlds preceded them in: ... for it being an indecency is among the most hideous things, and their having innovated it and initiated it and made it a custom for those after them is also among the most hideous things.\""},{"ch":"lut","w":"ابن كثير","bk":"ibnkathir","s":7,"ay":80,"x":"وَلُوطٌ هُوَ ابْنُ هَارَانَ بْنِ آزَرَ، وَهُوَ ابْنُ أَخِي إِبْرَاهِيمَ الْخَلِيلِ، عَلَيْهِمَا السَّلَامُ، وَكَانَ قَدْ آمَنَ مَعَ إِبْرَاهِيمَ، عَلَيْهِ السَّلَامُ، وَهَاجَرَ مَعَهُ إِلَى أَرْضِ الشَّامِ، فَبَعَثَهُ اللَّهُ [تَعَالَى] إِلَى أهل \"سَدُوم\" وما حَوْلَهَا مِنَ الْقُرَى","n":"نسب لوط وهجرته مع إبراهيم وبعثته إلى سدوم.","en":"\"Lut is the son of Haran ibn Azar, the nephew of Ibrahim the Intimate Friend, peace be upon both, and he had believed with Ibrahim and migrated with him to the land of the Levant; then God sent him to the people of 'Sodom' and what surrounds it of villages.\""},{"ch":"madyan","w":"السعدي","bk":"saadi","s":7,"ay":85,"x":"أرسلنا إلى القبيلة المعروفة بمدين {أخاهم}: في النسب، {شُعَيۡباً}: يدعوهم إلى عبادة الله وحده لا شريك له، ويأمرهم بإيفاء المكيال والميزان، وأن لا يبخسوا الناس أشياءهم، وأن لا يعثَوْا في الأرض مفسدين بالإكثار من عمل المعاصي","n":"رسالة شعيب: توحيد وعدل في الميزان وترك الإفساد.","en":"\"We sent to the tribe known as Madyan their brother in lineage, Shu'ayb, calling them to worship God alone with no partner, and ordering them to give full measure and weight, not to deprive people of their things, and not to spread corruption in the land by multiplying acts of disobedience.\""},{"ch":"madyan","w":"ابن كثير","bk":"ibnkathir","s":26,"ay":176,"x":"هَؤُلَاءِ -أَعْنِي أَصْحَابَ الْأَيْكَةِ -هُمْ أَهْلُ مَدْيَنَ عَلَى الصَّحِيحِ. وَكَانَ نَبِيُّ اللَّهِ شُعَيْبٌ مِنْ أَنْفُسِهِمْ، وَإِنَّمَا لَمْ يَقُلْ هُنَا أَخُوهُمْ شُعَيْبٌ؛ لِأَنَّهُمْ نُسِبُوا إِلَى عِبَادَةِ الْأَيْكَةِ، وَهِيَ شَجَرَةٌ","n":"يرجّح أن أصحاب الأيكة هم أهل مدين، ويفسّر عدم قول «أخوهم».","en":"\"These, I mean the people of the Thicket, are the people of Madyan on the sounder view. And the prophet of God Shu'ayb was of them, but it was not said here 'their brother Shu'ayb' because they were attributed to worship of the Thicket, which is a tree.\""},{"ch":"rass","w":"ابن كثير","bk":"ibnkathir","s":25,"ay":38,"x":"وَأَمَّا أَصْحَابُ الرَّسِّ فَقَالَ ابْنُ جُرَيْج، عَنِ ابْنِ عَبَّاسٍ: هُمْ أَهْلُ قَرْيَةٍ مِنْ قُرَى ثَمُودَ. وَقَالَ ابْنُ جُرَيْجٍ: قَالَ عِكْرِمَةُ: أَصْحَابُ الرَسّ بفَلَج وَهُمْ أَصْحَابُ يس. وَقَالَ قَتَادَةُ: فَلَج مِنْ قُرَى الْيَمَامَةِ","n":"يعرض اختلاف الصحابة والتابعين في تعيين أصحاب الرس.","en":"\"As for the Companions of ar-Rass, Ibn Jurayj said, from Ibn 'Abbas: They are the people of a village from the villages of Thamud. And Ibn Jurayj said: 'Ikrima said: The Companions of ar-Rass were at Falaj, and they are the people of Ya-Sin. And Qatada said: Falaj is one of the villages of al-Yamama.\""},{"ch":"firaun","w":"السعدي","bk":"saadi","s":28,"ay":4,"x":"إنَّ فرعون علا في الأرض: في ملكه وسلطانِهِ وجنودِهِ وجبروتِهِ، فصار من أهل العلوِّ فيها، لا من الأعْلَيْن فيها، {وجعل أهلها شِيَعاً}؛ أي: طوائف متفرِّقة يتصرَّف فيهم بشهوته وينفِّذ فيهم ما أراد من قهره وسطوته، {يستضعِفُ طائفةً منهم}: وتلك الطائفةُ هم بنو إسرائيل","n":"تفسير علوّ فرعون: ملك وجنود وجبروت، وتقسيم الناس شيعاً.","en":"\"Indeed Pharaoh exalted himself in the land: in his kingdom, authority, armies and tyranny, so he became of the people of arrogance in it, not of the higher ones; and made its people into factions, that is: scattered groups he dealt with by his whim and imposed on them what he wished of force and might, oppressing a group of them, and that group was the Children of Israel.\""},{"ch":"firaun","w":"السعدي","bk":"saadi","s":44,"ay":25,"x":"كم تركوا من جناتٍ وعيونٍ. وزروع ومقام كريم. ونعمةٍ كانوا فيها فاكهينَ. كذلك وأوۡرَثۡناها؛ أي: هذه النعمة المذكورة قوماً آخرينَ","n":"ما جمعوه من النعم ورثه قوم آخرون.","en":"\"'How many gardens and springs they left, and crops and noble dwellings, and favors in which they delighted. Thus, and We made it inherited by' that is: this blessing mentioned, 'another people.'\""},{"ch":"firaun","w":"السعدي","bk":"saadi","s":44,"ay":25,"x":"فما بكتۡ عليهم السماءُ والأرضُ؛ أي: لمَّا أتلفهم الله وأهلكهم لم تبكِ عليهم السماء والأرض؛ أي: لم يُحزنْ عليهم ولم يُؤس على فراقهم، بل كلٌّ استبشر بهلاكِهِم وتلفِهِم، حتى السماء والأرض؛ لأنَّهم ما خَلَّفوا من آثارِهم إلاَّ ما يسوِّدُ وجوهَهم ويوجبُ عليهم اللعنةَ والمقتَ من العالمين","n":"لم يخلّفوا إلا ما يسوّد وجوههم ويوجب اللعنة.","en":"\"'Neither heaven nor earth wept for them', that is: when God destroyed them neither heaven nor earth grieved for them nor regretted their parting; rather each rejoiced at their destruction, because they left of their traces nothing but what blackens their faces and incurs the curse and the abhorrence of all the worlds.\""},{"ch":"saba","w":"السعدي","bk":"saadi","s":34,"ay":15,"x":"سبأ قبيلةٌ معروفةٌ في أداني اليمن، ومسكنُهم بلدةٌ يُقالُ لها: مأرِب، ومن نعم الله ولطفِهِ بالناس عموماً وبالعرب خصوصاً أنه قصَّ في القرآن أخبار المهلكين والمعاقَبين ممَّنْ كان يجاوِرُ العرب، ويشاهدُ آثاره، ويتناقلُ الناس أخبارَه؛ ليكونَ ذلك أدعى إلى التصديق وأقربَ للموعظة، فقال:{لقد كان لسبأٍ في مسكنِهِم}؛ أي: محلِّهم الذي يسكنون فيه {آيةٌ}: والآيةُ هنا ما أدرَّ الله عليهم من النعم، وصرف عنهم من النقم، الذي يقتضي ذلك منهم أن يَعْبُدوا الله ويشكُروه","n":"يعرّف سبأ ومأرب، ويبيّن أن الآية نعمهم التي تقتضي الشكر.","en":"\"Saba is a well-known tribe in the nearer parts of Yemen, and their dwelling is a town called Marib ... 'There was for Saba in their dwelling a sign,' that is: in their place of residence 'a sign', and the sign here is what God poured upon them of blessings and turned away from them of calamities, which required of them to worship God and thank Him.\""},{"ch":"saba","w":"ابن كثير","bk":"ibnkathir","s":34,"ay":15,"x":"كَانَتْ سَبَأٌ ملوكَ الْيَمَنِ وَأَهْلَهَا، وَكَانَتِ التَّبَابِعَةُ مِنْهُمْ، وَبِلْقِيسُ -صَاحِبَةُ سُلَيْمَانَ-مِنْهُمْ ، وَكَانُوا فِي نِعْمَةٍ وَغِبْطَةٍ فِي بِلَادِهِمْ، وَعَيْشِهِمْ وَاتِّسَاعِ أَرْزَاقِهِمْ وَزُرُوعِهِمْ وَثِمَارِهِمْ. وَبَعَثَ اللَّهُ إِلَيْهِمُ الرُّسُلَ تَأْمُرُهُمْ أَنْ يَأْكُلُوا مِنْ رِزْقِهِ، وَيَشْكُرُوهُ بِتَوْحِيدِهِ وَعِبَادَتِهِ، فَكَانُوا كَذَلِكَ مَا شَاءَ اللَّهُ ثُمَّ أَعْرَضُوا عَمَّا أُمِرُوا بِهِ، فَعُوقِبُوا بِإِرْسَالِ السَّيْلِ وَالتَّفَرُّقِ فِي الْبِلَادِ أَيْدِيَ سَبَأٍ، شَذَرَ مَذرَ","n":"يضع سبأ في سياق ملوك اليمن، ويذكر أن بلقيس منهم، وأن عقوبتهم السيل والتفرق.","en":"\"Saba were the kings of Yemen and its people, and the Tubba' were of them, and Bilqis, the companion of Sulayman, was of them; they lived in blessing and happiness in their land, in livelihood, wide provisions, crops and fruits. God sent messengers to them commanding them to eat of His provision and thank Him by monotheism and worship; so they were so for as long as God willed, then turned away from what they were commanded, so they were punished by the sending of the flood and by being scattered in the lands, the hands of Saba, in every direction.\""},{"ch":"dhulqarnayn","w":"السعدي","bk":"saadi","s":18,"ay":83,"x":"وهذه الأسبابُ التي أعطاه الله إيَّاها لم يُخْبِرْنا الله ولا رسولُهُ بها، ولم تتناقَلْها الأخبارُ على وجهٍ يفيدُ العلم؛ فلهذا لا يَسَعُنا غير السكوت عنها وعدم الالتفات لما يَذْكُرُهُ النقلة للإسرائيلياتِ ونحوها","n":"يمنع من تفصيل ما سكت عنه القرآن بالإسرائيليات.","en":"\"And these means that God gave him, neither God nor His Messenger told us of them, and reports did not convey them in a way that yields knowledge; so we have nothing but to be silent about them and not to turn to what the transmitters of Isra'iliyyat and the like mention.\""},{"ch":"dhulqarnayn","w":"السعدي","bk":"saadi","s":18,"ay":83,"x":"وهذا يدلُّ على كونه من الملوك الصالحين [و] الأولياء العادلين العالمين؛ حيث وافق مرضاةَ الله في معاملة كلِّ أحدٍ بما يليق بحاله","n":"يستنبط من سياسته العدل بين الكافر والمؤمن أنه من الملوك الصالحين.","en":"\"And this indicates that he was among the righteous kings, the just, knowing friends of God, as he conformed to God's pleasure in treating everyone in a manner befitting his state.\""},{"ch":"dhulqarnayn","w":"السعدي","bk":"saadi","s":18,"ay":93,"x":"وهما أمَّتان عظيمتان من بني آدم، فقالوا:{إنَّ يأجوج ومأجوجَ مفسدون في الأرض}: بالقتل وأخذ الأموال وغير ذلك","n":"يأجوج ومأجوج أمتان من بني آدم، وإفسادهما بالقتل وأخذ الأموال.","en":"\"And they are two great nations of the children of Adam, so they said: 'Indeed Yajuj and Majuj are corrupters in the land' by killing and taking property and other things.\""},{"ch":"ukhdud","w":"السعدي","bk":"saadi","s":85,"ay":4,"x":"وكان أصحابُ الأخدود هؤلاء قوماً كافرين، ولديهم قومٌ مؤمنون، فراودوهم على الدُّخول في دينهم، فامتنع المؤمنون من ذلك، فشقَّ الكافرون أخدوداً في الأرض، وقذفوا فيها النار، وقعدوا حولَها، وفتنوا المؤمنين، وعرضوهم عليها؛ فمن استجاب لهم أطلقوه، ومن استمرَّ على الإيمان قذفوه في النار","n":"يشرح قصة الأخدود: كفار يفتنون المؤمنين بالنار.","en":"\"And these companions of the trench were disbelieving people who had believing people with them; they tried to make them enter their religion and the believers refused, so the disbelievers dug a trench in the ground and threw fire into it and sat around it and tested the believers and presented them to it: whoever responded to them they released, and whoever persisted in faith they threw into the fire.\""},{"ch":"ukhdud","w":"السعدي","bk":"saadi","s":85,"ay":4,"x":"وهذا من أعظم ما يكون من التجبُّر وقساوة القلب؛ لأنَّهم جمعوا بين الكفر بآيات الله ومعاندتها ومحاربة أهلها وتعذيبهم بهذا العذاب الذي تَنْفَطِرُ منه القلوب وحضورهم إيَّاهم عند إلقائهم فيها","n":"يبيّن أن الجريمة جمعت الكفر والمحاربة والتعذيب والحضور.","en":"\"And this is among the greatest forms of tyranny and hardness of heart, for they combined disbelief in God's signs and obstinacy toward them with fighting its people and torturing them with this torment from which hearts rend, and their presence at the time of their being thrown into it.\""},{"ch":"tubba","w":"السعدي","bk":"saadi","s":50,"ay":12,"x":"وقوم تُبَّعٍ ـ وتُبَّعٌ كل ملكٍ مَلَكَ اليمن في الزمان السابق قبل الإسلام ـ فقوم تُبَّع كذَّبوا الرسول الذي أرسله الله إليهم، ولم يخبرْنا اللهُ من هو ذلك الرسولُ، وأيُّ تُبَّعٍ من التَّبابعة","n":"يعرّف تُبّعاً بأنه لقب ملوك اليمن، ويصرّح بأن القرآن لم يعيّن أيّهم.","en":"\"And the people of Tubba' - and Tubba' is every king who ruled Yemen in the earlier time before Islam - so the people of Tubba' denied the messenger God sent to them, and God did not tell us who that messenger is, nor which Tubba' of the Tubba' kings.\""},{"ch":"tubba","w":"ابن كثير","bk":"ibnkathir","s":44,"ay":37,"x":"وَكَقَوْمِ تُبَّعٍ -وَهُمْ سَبَأٌ-حَيْثُ أَهْلَكَهُمُ اللَّهُ وخَرَّب بِلَادَهُمْ، وَشَرَّدَهُمْ فِي الْبِلَادِ، وَفَرَّقَهُمْ شَذَرَ مَذَرَ","n":"يربط قوم تبع بسبأ في العقوبة والتشتيت.","en":"\"And like the people of Tubba' - and they are Saba' - when God destroyed them and ruined their lands, scattered them in the lands, and dispersed them in all directions.\""},{"ch":"rum","w":"السعدي","bk":"saadi","s":30,"ay":2,"x":"كانت الفرس والروم في ذلك الوقت من أقوى دول الأرض، وكان يكون بينهما من الحروب والقتال ما يكون بين الدول المتوازنة، وكانتِ الفرسُ مشركينَ يعبُدون النار، وكانت الرومُ أهلَ كتابٍ ينتسبون إلى التوراة والإنجيل، وهم أقربُ إلى المسلمين من الفرس، [فكان المؤمنون] يحبُّون غَلَبَتَهم وظهورَهم على الفرس، وكان المشركون لاشتراكِهِم والفرسُ في الشرك يحبُّون ظهورَ الفرس على الروم، فظهر الفرسُ على الروم وغلبوهم غُلباً لم يُحِطْ بِمُلْكِهِم بل بأدنى أرضهم، ففرح بذلك مشركو مكة وحزن المسلمون","n":"سياق الآيات: دولتان عظيمتان، وفرح المشركين بغلبة الفرس وحزن المسلمين.","en":"\"The Persians and the Romans at that time were among the strongest states on earth ... the Persians were idolaters worshipping fire, and the Romans were People of the Book ... so the believers loved their victory over the Persians, and the idolaters, for their shared shirk with the Persians, loved the Persians' victory over the Romans; so the Persians defeated the Romans ... and the idolaters of Makkah rejoiced and the Muslims grieved.\""},{"ch":"rum","w":"ابن كثير","bk":"ibnkathir","s":30,"ay":1,"x":"هَذِهِ الْآيَاتُ حِينَ غَلَبَ سَابُورُ مَلِكُ الْفُرْسِ عَلَى بِلَادِ الشَّامِ وَمَا وَالَاهَا مِنْ بِلَادِ الْجَزِيرَةِ وَأَقَاصِي بِلَادِ الرُّومِ، وَاضْطَرَّ هِرَقْلَ مَلك الرُّومِ حَتَّى أَلْجَأَهُ إِلَى الْقُسْطَنْطِينِيَّةِ","n":"يروي ظرف النزول: غلبة سابور على بلاد الشام واضطرار هرقل إلى القسطنطينية.","en":"\"These verses were revealed when Sabur, king of the Persians, prevailed over the lands of the Levant and what adjoined them of the lands of the Peninsula and the farthest lands of the Romans, and forced Heraclius, king of the Romans, until he drove him to Constantinople.\""},{"ch":"israel","w":"السعدي","bk":"saadi","s":17,"ay":4,"x":"وقَضَيۡنا إلى بني إسرائيل؛ أي: تقدَّمنا وعَهِدْنا إليهم وأخبرناهم في كتابهم أنهم لا بدَّ أن يقعَ: منهم إفسادٌ في الأرض مرتين بعمل المعاصي والبَطَر لنعم الله والعلوِّ في الأرض والتكبُّر فيها، وأنَّه إذا وقع واحدةٌ منهما؛ سلَّطَ الله عليهم الأعداء وانتقم منهم، وهذا تحذيرٌ لهم وإنذارٌ لعلَّهم يرجعون فيتذكَّرون","n":"يفسر قضاء الإفسادين وتسليط الأعداء بأنه تحذير وإنذار.","en":"\"'And We decreed to the Children of Israel' that is: We gave advance notice and made a covenant with them, informing them in their book that there must occur from them corruption in the land twice by committing sins, insolence toward God's favors, arrogance and pride on earth; and that when one of them occurs God would give enemies power over them and take revenge from them. This is a warning and notice that they may return and remember.\""},{"ch":"israel","w":"السعدي","bk":"saadi","s":44,"ay":25,"x":"ولقد اختَرۡناهم؛ أي: اصطفيناهم وانتَقَيْناهم {على علم}: منَّا بهم وباستحقاقهم لذلك الفضل {على العالَمين}؛ أي: عالمي زمانهم ومَنْ قبلهم وبعدَهم، حتى أتى اللهُ بأمة محمدٍ - صلى الله عليه وسلم - ففضَلوا العالمينَ كلَّهم، وجعلهم الله خير أمَّة أخرجت للناس، وامتنَّ عليهم بما لم يمتنَّ به على غيرهم","n":"يوضح معنى تفضيلهم على العالمين: عالمي زمانهم، ثم فُضّلت أمة محمد ﷺ.","en":"\"'And We chose them' that is: We selected and picked them 'knowingly' from Us of them and of their deservingness of that favor 'over the worlds' that is: the worlds of their time and those before and after them, until God brought the nation of Muhammad ﷺ and they surpassed all the worlds, and God made them the best nation brought out for mankind, and favored them with what He did not favor others.\""},{"ch":"fil","w":"السعدي","bk":"saadi","s":105,"ay":1,"x":"الذين كادوا بيتَه الحرام، وأرادوا إخرابه؛ فتجهَّزوا لأجل ذلك، واستصحبوا معهم الفِيَلَةَ لهدمه، وجاؤوا بجمعٍ لا قِبَلَ للعرب به من الحبشة واليمن، فلما انتهَوْا إلى قربِ مكَّةَ ـ ولم يكن بالعرب مدافعةٌ، وخرج أهل مكَّة من مكَّة خوفاً [على أنفسهم] منهم ـ أرسل الله عليهم طيراً أبابيلَ؛ أي: متفرِّقة، تحمل أحجاراً محمَّاة من سِجِّيلٍ، فرمتْهم بها، وتتبَّعَتْ قاصِيَهم ودانِيَهم، فخمدوا وهمدوا، وصاروا كعصفٍ مأكولٍ، وكفى الله شرَّهم، وردَّ كيدهم في نحورهم","n":"وصف الحدث: جمع من الحبشة واليمن بالفيلة ثم طير أبابيل بحجارة من سجيل.","en":"\"Those who plotted against His Sacred House and wanted to ruin it; so they prepared for that and brought elephants with them to demolish it, and came with a host the Arabs had no power against, from Abyssinia and Yemen; when they reached near Makkah ... God sent upon them flocks of birds carrying hot stones of baked clay and they pelted them with them, pursuing the far and near, so they became still and silent and were like eaten straw, and God sufficed against their evil and turned their plot back into their throats.\""},{"ch":"fil","w":"ابن كثير","bk":"ibnkathir","s":105,"ay":1,"x":"وَكَانُوا قَوْمًا نَصَارَى، وَكَانَ دِينُهُمْ إِذْ ذَاكَ أَقْرَبَ حَالًا مِمَّا كَانَ عَلَيْهِ قُرَيْشٌ مِنْ عِبَادَةِ الْأَوْثَانِ. وَلَكِنْ كَانَ هَذَا مِنْ بَابِ الْإِرْهَاصِ وَالتَّوْطِئَةِ لِمَبْعَثِ رَسُولُ اللَّهِ ﷺ","n":"يبين أن النصر على أصحاب الفيل لم يكن لخيرية قريش بل لحفظ البيت قبل بعثة النبي ﷺ.","en":"\"And they were a Christian people, and their religion at that time was closer in state than what Quraysh were upon of idol worship. But this was by way of a prelude and preparation for the mission of the Messenger of God ﷺ.\""}],"u":[{"id":"iram","t":"موضع إرم وديار عاد","n":"نصّ المفسرون على أن عاداً سكنوا الأحقاف باليمن (ابن كثير والسعدي). أما ربط إرم بمدينة مدفونة معيّنة اكتُشفت أو ادُّعي اكتشافها فاجتهاد حديث غير جازم، ولم يرد فيه نص."},{"id":"pharaoh","t":"اسم فرعون موسى وعصره","n":"لم يسمِّ القرآن فرعون موسى ولا حدّد زمنه. وتعيينه بملك مصري بعينه، أو بتاريخ بعينه، اجتهاد من المؤرخين وعلماء الآثار غير جازم؛ والمقطوع به ما ورد في الآيات والأحاديث."},{"id":"dhulq","t":"من هو ذو القرنين؟","n":"اختلف المفسرون والمؤرخون في تعيينه، وأورد ابن كثير في تفسيره أقوالاً وحذّر مما لم يصح منها. وقد قال السعدي إن الأسباب التي أُعطيها لم يخبرنا الله ولا رسوله بها، ولا نلتفت للإسرائيليات. فكل تعيين لشخصه اجتهاد غير جازم."},{"id":"sadd","t":"موضع السد","n":"قال السعدي إن «السدين» جبلان معروفان في ذلك الزمان بين يأجوج ومأجوج والناس. أما تحديد موضع الردم على الخريطة اليوم فاجتهاد غير جازم؛ والثابت أن الله أقامه بقوة الحديد والقطر، وأنه سيُدكّ عند وعد الله."},{"id":"places","t":"أصحاب الأخدود وأصحاب الرس","n":"لم يعيّن القرآن موضعهم ولا زمنهم. وفي أصحاب الرس أقوال متباينة نقلها ابن كثير: قرية من قرى ثمود، وفلج باليمامة، وبئر بأذربيجان. فلا نجزم بشيء منها."},{"id":"ages","t":"الأعمار والمدد","n":"ما نصّ عليه القرآن: لبث نوح في قومه ألف سنة إلا خمسين عاماً (العنكبوت: ١٤)، ومدة غلبة الروم «بضع سنين» (الروم: ٤). وما سوى ذلك من تقدير الأعمار والمدد بالتواريخ الدقيقة اجتهاد غير جازم."}],"ay":{"53":"يَٰبَنِيٓ إِسۡرَٰٓءِيلَ ٱذۡكُرُواْ نِعۡمَتِيَ ٱلَّتِيٓ أَنۡعَمۡتُ عَلَيۡكُمۡ وَأَنِّي فَضَّلۡتُكُمۡ عَلَى ٱلۡعَٰلَمِينَ","54":"وَٱتَّقُواْ يَوۡمٗا لَّا تَجۡزِي نَفۡسٌ عَن نَّفۡسٖ شَيۡـٔٗا وَلَا يُقۡبَلُ مِنۡهَا شَفَٰعَةٞ وَلَا يُؤۡخَذُ مِنۡهَا عَدۡلٞ وَلَا هُمۡ يُنصَرُونَ","55":"وَإِذۡ نَجَّيۡنَٰكُم مِّنۡ ءَالِ فِرۡعَوۡنَ يَسُومُونَكُمۡ سُوٓءَ ٱلۡعَذَابِ يُذَبِّحُونَ أَبۡنَآءَكُمۡ وَيَسۡتَحۡيُونَ نِسَآءَكُمۡۚ وَفِي ذَٰلِكُم بَلَآءٞ مِّن رَّبِّكُمۡ عَظِيمٞ","56":"وَإِذۡ فَرَقۡنَا بِكُمُ ٱلۡبَحۡرَ فَأَنجَيۡنَٰكُمۡ وَأَغۡرَقۡنَآ ءَالَ فِرۡعَوۡنَ وَأَنتُمۡ تَنظُرُونَ","252":"أَلَمۡ تَرَ إِلَى ٱلۡمَلَإِ مِنۢ بَنِيٓ إِسۡرَٰٓءِيلَ مِنۢ بَعۡدِ مُوسَىٰٓ إِذۡ قَالُواْ لِنَبِيّٖ لَّهُمُ ٱبۡعَثۡ لَنَا مَلِكٗا نُّقَٰتِلۡ فِي سَبِيلِ ٱللَّهِۖ قَالَ هَلۡ عَسَيۡتُمۡ إِن كُتِبَ عَلَيۡكُمُ ٱلۡقِتَالُ أَلَّا تُقَٰتِلُواْۖ قَالُواْ وَمَا لَنَآ أَلَّا نُقَٰتِلَ فِي سَبِيلِ ٱللَّهِ وَقَدۡ أُخۡرِجۡنَا مِن دِيَٰرِنَا وَأَبۡنَآئِنَاۖ فَلَمَّا كُتِبَ عَلَيۡهِمُ ٱلۡقِتَالُ تَوَلَّوۡاْ إِلَّا قَلِيلٗا مِّنۡهُمۡۚ وَٱللَّهُ عَلِيمُۢ بِٱلظَّٰلِمِينَ","253":"وَقَالَ لَهُمۡ نَبِيُّهُمۡ إِنَّ ٱللَّهَ قَدۡ بَعَثَ لَكُمۡ طَالُوتَ مَلِكٗاۚ قَالُوٓاْ أَنَّىٰ يَكُونُ لَهُ ٱلۡمُلۡكُ عَلَيۡنَا وَنَحۡنُ أَحَقُّ بِٱلۡمُلۡكِ مِنۡهُ وَلَمۡ يُؤۡتَ سَعَةٗ مِّنَ ٱلۡمَالِۚ قَالَ إِنَّ ٱللَّهَ ٱصۡطَفَىٰهُ عَلَيۡكُمۡ وَزَادَهُۥ بَسۡطَةٗ فِي ٱلۡعِلۡمِ وَٱلۡجِسۡمِۖ وَٱللَّهُ يُؤۡتِي مُلۡكَهُۥ مَن يَشَآءُۚ وَٱللَّهُ وَٰسِعٌ عَلِيمٞ","254":"وَقَالَ لَهُمۡ نَبِيُّهُمۡ إِنَّ ءَايَةَ مُلۡكِهِۦٓ أَن يَأۡتِيَكُمُ ٱلتَّابُوتُ فِيهِ سَكِينَةٞ مِّن رَّبِّكُمۡ وَبَقِيَّةٞ مِّمَّا تَرَكَ ءَالُ مُوسَىٰ وَءَالُ هَٰرُونَ تَحۡمِلُهُ ٱلۡمَلَٰٓئِكَةُۚ إِنَّ فِي ذَٰلِكَ لَأٓيَةٗ لَّكُمۡ إِن كُنتُم مُّؤۡمِنِينَ","255":"فَلَمَّا فَصَلَ طَالُوتُ بِٱلۡجُنُودِ قَالَ إِنَّ ٱللَّهَ مُبۡتَلِيكُم بِنَهَرٖ فَمَن شَرِبَ مِنۡهُ فَلَيۡسَ مِنِّي وَمَن لَّمۡ يَطۡعَمۡهُ فَإِنَّهُۥ مِنِّيٓ إِلَّا مَنِ ٱغۡتَرَفَ غُرۡفَةَۢ بِيَدِهِۦۚ فَشَرِبُواْ مِنۡهُ إِلَّا قَلِيلٗا مِّنۡهُمۡۚ فَلَمَّا جَاوَزَهُۥ هُوَ وَٱلَّذِينَ ءَامَنُواْ مَعَهُۥ قَالُواْ لَا طَاقَةَ لَنَا ٱلۡيَوۡمَ بِجَالُوتَ وَجُنُودِهِۦۚ قَالَ ٱلَّذِينَ يَظُنُّونَ أَنَّهُم مُّلَٰقُواْ ٱللَّهِ كَم مِّن فِئَةٖ قَلِيلَةٍ غَلَبَتۡ فِئَةٗ كَثِيرَةَۢ بِإِذۡنِ ٱللَّهِۗ وَٱللَّهُ مَعَ ٱلصَّٰبِرِينَ","256":"وَلَمَّا بَرَزُواْ لِجَالُوتَ وَجُنُودِهِۦ قَالُواْ رَبَّنَآ أَفۡرِغۡ عَلَيۡنَا صَبۡرٗا وَثَبِّتۡ أَقۡدَامَنَا وَٱنصُرۡنَا عَلَى ٱلۡقَوۡمِ ٱلۡكَٰفِرِينَ","257":"فَهَزَمُوهُم بِإِذۡنِ ٱللَّهِ وَقَتَلَ دَاوُۥدُ جَالُوتَ وَءَاتَىٰهُ ٱللَّهُ ٱلۡمُلۡكَ وَٱلۡحِكۡمَةَ وَعَلَّمَهُۥ مِمَّا يَشَآءُۗ وَلَوۡلَا دَفۡعُ ٱللَّهِ ٱلنَّاسَ بَعۡضَهُم بِبَعۡضٖ لَّفَسَدَتِ ٱلۡأَرۡضُ وَلَٰكِنَّ ٱللَّهَ ذُو فَضۡلٍ عَلَى ٱلۡعَٰلَمِينَ","688":"وَإِذۡ قَالَ مُوسَىٰ لِقَوۡمِهِۦ يَٰقَوۡمِ ٱذۡكُرُواْ نِعۡمَةَ ٱللَّهِ عَلَيۡكُمۡ إِذۡ جَعَلَ فِيكُمۡ أَنۢبِيَآءَ وَجَعَلَكُم مُّلُوكٗا وَءَاتَىٰكُم مَّا لَمۡ يُؤۡتِ أَحَدٗا مِّنَ ٱلۡعَٰلَمِينَ","689":"يَٰقَوۡمِ ٱدۡخُلُواْ ٱلۡأَرۡضَ ٱلۡمُقَدَّسَةَ ٱلَّتِي كَتَبَ ٱللَّهُ لَكُمۡ وَلَا تَرۡتَدُّواْ عَلَىٰٓ أَدۡبَارِكُمۡ فَتَنقَلِبُواْ خَٰسِرِينَ","690":"قَالُواْ يَٰمُوسَىٰٓ إِنَّ فِيهَا قَوۡمٗا جَبَّارِينَ وَإِنَّا لَن نَّدۡخُلَهَا حَتَّىٰ يَخۡرُجُواْ مِنۡهَا فَإِن يَخۡرُجُواْ مِنۡهَا فَإِنَّا دَٰخِلُونَ","691":"قَالَ رَجُلَانِ مِنَ ٱلَّذِينَ يَخَافُونَ أَنۡعَمَ ٱللَّهُ عَلَيۡهِمَا ٱدۡخُلُواْ عَلَيۡهِمُ ٱلۡبَابَ فَإِذَا دَخَلۡتُمُوهُ فَإِنَّكُمۡ غَٰلِبُونَۚ وَعَلَى ٱللَّهِ فَتَوَكَّلُوٓاْ إِن كُنتُم مُّؤۡمِنِينَ","692":"قَالُواْ يَٰمُوسَىٰٓ إِنَّا لَن نَّدۡخُلَهَآ أَبَدٗا مَّا دَامُواْ فِيهَا فَٱذۡهَبۡ أَنتَ وَرَبُّكَ فَقَٰتِلَآ إِنَّا هَٰهُنَا قَٰعِدُونَ","693":"قَالَ رَبِّ إِنِّي لَآ أَمۡلِكُ إِلَّا نَفۡسِي وَأَخِيۖ فَٱفۡرُقۡ بَيۡنَنَا وَبَيۡنَ ٱلۡقَوۡمِ ٱلۡفَٰسِقِينَ","694":"قَالَ فَإِنَّهَا مُحَرَّمَةٌ عَلَيۡهِمۡۛ أَرۡبَعِينَ سَنَةٗۛ يَتِيهُونَ فِي ٱلۡأَرۡضِۚ فَلَا تَأۡسَ عَلَى ٱلۡقَوۡمِ ٱلۡفَٰسِقِينَ","746":"لُعِنَ ٱلَّذِينَ كَفَرُواْ مِنۢ بَنِيٓ إِسۡرَٰٓءِيلَ عَلَىٰ لِسَانِ دَاوُۥدَ وَعِيسَى ٱبۡنِ مَرۡيَمَۚ ذَٰلِكَ بِمَا عَصَواْ وَّكَانُواْ يَعۡتَدُونَ","747":"كَانُواْ لَا يَتَنَاهَوۡنَ عَن مُّنكَرٖ فَعَلُوهُۚ لَبِئۡسَ مَا كَانُواْ يَفۡعَلُونَ","1018":"۞ وَإِلَىٰ عَادٍ أَخَاهُمۡ هُودٗاۚ قَالَ يَٰقَوۡمِ ٱعۡبُدُواْ ٱللَّهَ مَا لَكُم مِّنۡ إِلَٰهٍ غَيۡرُهُۥٓۚ أَفَلَا تَتَّقُونَ","1019":"قَالَ ٱلۡمَلَأُ ٱلَّذِينَ كَفَرُواْ مِن قَوۡمِهِۦٓ إِنَّا لَنَرَىٰكَ فِي سَفَاهَةٖ وَإِنَّا لَنَظُنُّكَ مِنَ ٱلۡكَٰذِبِينَ","1020":"قَالَ يَٰقَوۡمِ لَيۡسَ بِي سَفَاهَةٞ وَلَٰكِنِّي رَسُولٞ مِّن رَّبِّ ٱلۡعَٰلَمِينَ","1021":"أُبَلِّغُكُمۡ رِسَٰلَٰتِ رَبِّي وَأَنَا۠ لَكُمۡ نَاصِحٌ أَمِينٌ","1022":"أَوَعَجِبۡتُمۡ أَن جَآءَكُمۡ ذِكۡرٞ مِّن رَّبِّكُمۡ عَلَىٰ رَجُلٖ مِّنكُمۡ لِيُنذِرَكُمۡۚ وَٱذۡكُرُوٓاْ إِذۡ جَعَلَكُمۡ خُلَفَآءَ مِنۢ بَعۡدِ قَوۡمِ نُوحٖ وَزَادَكُمۡ فِي ٱلۡخَلۡقِ بَصۜۡطَةٗۖ فَٱذۡكُرُوٓاْ ءَالَآءَ ٱللَّهِ لَعَلَّكُمۡ تُفۡلِحُونَ","1026":"وَإِلَىٰ ثَمُودَ أَخَاهُمۡ صَٰلِحٗاۚ قَالَ يَٰقَوۡمِ ٱعۡبُدُواْ ٱللَّهَ مَا لَكُم مِّنۡ إِلَٰهٍ غَيۡرُهُۥۖ قَدۡ جَآءَتۡكُم بَيِّنَةٞ مِّن رَّبِّكُمۡۖ هَٰذِهِۦ نَاقَةُ ٱللَّهِ لَكُمۡ ءَايَةٗۖ فَذَرُوهَا تَأۡكُلۡ فِيٓ أَرۡضِ ٱللَّهِۖ وَلَا تَمَسُّوهَا بِسُوٓءٖ فَيَأۡخُذَكُمۡ عَذَابٌ أَلِيمٞ","1027":"وَٱذۡكُرُوٓاْ إِذۡ جَعَلَكُمۡ خُلَفَآءَ مِنۢ بَعۡدِ عَادٖ وَبَوَّأَكُمۡ فِي ٱلۡأَرۡضِ تَتَّخِذُونَ مِن سُهُولِهَا قُصُورٗا وَتَنۡحِتُونَ ٱلۡجِبَالَ بُيُوتٗاۖ فَٱذۡكُرُوٓاْ ءَالَآءَ ٱللَّهِ وَلَا تَعۡثَوۡاْ فِي ٱلۡأَرۡضِ مُفۡسِدِينَ","1028":"قَالَ ٱلۡمَلَأُ ٱلَّذِينَ ٱسۡتَكۡبَرُواْ مِن قَوۡمِهِۦ لِلَّذِينَ ٱسۡتُضۡعِفُواْ لِمَنۡ ءَامَنَ مِنۡهُمۡ أَتَعۡلَمُونَ أَنَّ صَٰلِحٗا مُّرۡسَلٞ مِّن رَّبِّهِۦۚ قَالُوٓاْ إِنَّا بِمَآ أُرۡسِلَ بِهِۦ مُؤۡمِنُونَ","1029":"قَالَ ٱلَّذِينَ ٱسۡتَكۡبَرُوٓاْ إِنَّا بِٱلَّذِيٓ ءَامَنتُم بِهِۦ كَٰفِرُونَ","1030":"فَعَقَرُواْ ٱلنَّاقَةَ وَعَتَوۡاْ عَنۡ أَمۡرِ رَبِّهِمۡ وَقَالُواْ يَٰصَٰلِحُ ٱئۡتِنَا بِمَا تَعِدُنَآ إِن كُنتَ مِنَ ٱلۡمُرۡسَلِينَ","1031":"فَأَخَذَتۡهُمُ ٱلرَّجۡفَةُ فَأَصۡبَحُواْ فِي دَارِهِمۡ جَٰثِمِينَ","1032":"فَتَوَلَّىٰ عَنۡهُمۡ وَقَالَ يَٰقَوۡمِ لَقَدۡ أَبۡلَغۡتُكُمۡ رِسَالَةَ رَبِّي وَنَصَحۡتُ لَكُمۡ وَلَٰكِن لَّا تُحِبُّونَ ٱلنَّٰصِحِينَ","1033":"وَلُوطًا إِذۡ قَالَ لِقَوۡمِهِۦٓ أَتَأۡتُونَ ٱلۡفَٰحِشَةَ مَا سَبَقَكُم بِهَا مِنۡ أَحَدٖ مِّنَ ٱلۡعَٰلَمِينَ","1034":"إِنَّكُمۡ لَتَأۡتُونَ ٱلرِّجَالَ شَهۡوَةٗ مِّن دُونِ ٱلنِّسَآءِۚ بَلۡ أَنتُمۡ قَوۡمٞ مُّسۡرِفُونَ","1035":"وَمَا كَانَ جَوَابَ قَوۡمِهِۦٓ إِلَّآ أَن قَالُوٓاْ أَخۡرِجُوهُم مِّن قَرۡيَتِكُمۡۖ إِنَّهُمۡ أُنَاسٞ يَتَطَهَّرُونَ","1036":"فَأَنجَيۡنَٰهُ وَأَهۡلَهُۥٓ إِلَّا ٱمۡرَأَتَهُۥ كَانَتۡ مِنَ ٱلۡغَٰبِرِينَ","1037":"وَأَمۡطَرۡنَا عَلَيۡهِم مَّطَرٗاۖ فَٱنظُرۡ كَيۡفَ كَانَ عَٰقِبَةُ ٱلۡمُجۡرِمِينَ","1038":"وَإِلَىٰ مَدۡيَنَ أَخَاهُمۡ شُعَيۡبٗاۚ قَالَ يَٰقَوۡمِ ٱعۡبُدُواْ ٱللَّهَ مَا لَكُم مِّنۡ إِلَٰهٍ غَيۡرُهُۥۖ قَدۡ جَآءَتۡكُم بَيِّنَةٞ مِّن رَّبِّكُمۡۖ فَأَوۡفُواْ ٱلۡكَيۡلَ وَٱلۡمِيزَانَ وَلَا تَبۡخَسُواْ ٱلنَّاسَ أَشۡيَآءَهُمۡ وَلَا تُفۡسِدُواْ فِي ٱلۡأَرۡضِ بَعۡدَ إِصۡلَٰحِهَاۚ ذَٰلِكُمۡ خَيۡرٞ لَّكُمۡ إِن كُنتُم مُّؤۡمِنِينَ","1039":"وَلَا تَقۡعُدُواْ بِكُلِّ صِرَٰطٖ تُوعِدُونَ وَتَصُدُّونَ عَن سَبِيلِ ٱللَّهِ مَنۡ ءَامَنَ بِهِۦ وَتَبۡغُونَهَا عِوَجٗاۚ وَٱذۡكُرُوٓاْ إِذۡ كُنتُمۡ قَلِيلٗا فَكَثَّرَكُمۡۖ وَٱنظُرُواْ كَيۡفَ كَانَ عَٰقِبَةُ ٱلۡمُفۡسِدِينَ","1040":"وَإِن كَانَ طَآئِفَةٞ مِّنكُمۡ ءَامَنُواْ بِٱلَّذِيٓ أُرۡسِلۡتُ بِهِۦ وَطَآئِفَةٞ لَّمۡ يُؤۡمِنُواْ فَٱصۡبِرُواْ حَتَّىٰ يَحۡكُمَ ٱللَّهُ بَيۡنَنَاۚ وَهُوَ خَيۡرُ ٱلۡحَٰكِمِينَ","1041":"۞ قَالَ ٱلۡمَلَأُ ٱلَّذِينَ ٱسۡتَكۡبَرُواْ مِن قَوۡمِهِۦ لَنُخۡرِجَنَّكَ يَٰشُعَيۡبُ وَٱلَّذِينَ ءَامَنُواْ مَعَكَ مِن قَرۡيَتِنَآ أَوۡ لَتَعُودُنَّ فِي مِلَّتِنَاۚ قَالَ أَوَلَوۡ كُنَّا كَٰرِهِينَ","1042":"قَدِ ٱفۡتَرَيۡنَا عَلَى ٱللَّهِ كَذِبًا إِنۡ عُدۡنَا فِي مِلَّتِكُم بَعۡدَ إِذۡ نَجَّىٰنَا ٱللَّهُ مِنۡهَاۚ وَمَا يَكُونُ لَنَآ أَن نَّعُودَ فِيهَآ إِلَّآ أَن يَشَآءَ ٱللَّهُ رَبُّنَاۚ وَسِعَ رَبُّنَا كُلَّ شَيۡءٍ عِلۡمًاۚ عَلَى ٱللَّهِ تَوَكَّلۡنَاۚ رَبَّنَا ٱفۡتَحۡ بَيۡنَنَا وَبَيۡنَ قَوۡمِنَا بِٱلۡحَقِّ وَأَنتَ خَيۡرُ ٱلۡفَٰتِحِينَ","1043":"وَقَالَ ٱلۡمَلَأُ ٱلَّذِينَ كَفَرُواْ مِن قَوۡمِهِۦ لَئِنِ ٱتَّبَعۡتُمۡ شُعَيۡبًا إِنَّكُمۡ إِذٗا لَّخَٰسِرُونَ","1044":"فَأَخَذَتۡهُمُ ٱلرَّجۡفَةُ فَأَصۡبَحُواْ فِي دَارِهِمۡ جَٰثِمِينَ","1045":"ٱلَّذِينَ كَذَّبُواْ شُعَيۡبٗا كَأَن لَّمۡ يَغۡنَوۡاْ فِيهَاۚ ٱلَّذِينَ كَذَّبُواْ شُعَيۡبٗا كَانُواْ هُمُ ٱلۡخَٰسِرِينَ","1046":"فَتَوَلَّىٰ عَنۡهُمۡ وَقَالَ يَٰقَوۡمِ لَقَدۡ أَبۡلَغۡتُكُمۡ رِسَٰلَٰتِ رَبِّي وَنَصَحۡتُ لَكُمۡۖ فَكَيۡفَ ءَاسَىٰ عَلَىٰ قَوۡمٖ كَٰفِرِينَ","1090":"وَأَوۡرَثۡنَا ٱلۡقَوۡمَ ٱلَّذِينَ كَانُواْ يُسۡتَضۡعَفُونَ مَشَٰرِقَ ٱلۡأَرۡضِ وَمَغَٰرِبَهَا ٱلَّتِي بَٰرَكۡنَا فِيهَاۖ وَتَمَّتۡ كَلِمَتُ رَبِّكَ ٱلۡحُسۡنَىٰ عَلَىٰ بَنِيٓ إِسۡرَٰٓءِيلَ بِمَا صَبَرُواْۖ وَدَمَّرۡنَا مَا كَانَ يَصۡنَعُ فِرۡعَوۡنُ وَقَوۡمُهُۥ وَمَا كَانُواْ يَعۡرِشُونَ","1453":"۞ وَجَٰوَزۡنَا بِبَنِيٓ إِسۡرَٰٓءِيلَ ٱلۡبَحۡرَ فَأَتۡبَعَهُمۡ فِرۡعَوۡنُ وَجُنُودُهُۥ بَغۡيٗا وَعَدۡوًاۖ حَتَّىٰٓ إِذَآ أَدۡرَكَهُ ٱلۡغَرَقُ قَالَ ءَامَنتُ أَنَّهُۥ لَآ إِلَٰهَ إِلَّا ٱلَّذِيٓ ءَامَنَتۡ بِهِۦ بَنُوٓاْ إِسۡرَٰٓءِيلَ وَأَنَا۠ مِنَ ٱلۡمُسۡلِمِينَ","1454":"ءَآلۡـَٰٔنَ وَقَدۡ عَصَيۡتَ قَبۡلُ وَكُنتَ مِنَ ٱلۡمُفۡسِدِينَ","1455":"فَٱلۡيَوۡمَ نُنَجِّيكَ بِبَدَنِكَ لِتَكُونَ لِمَنۡ خَلۡفَكَ ءَايَةٗۚ وَإِنَّ كَثِيرٗا مِّنَ ٱلنَّاسِ عَنۡ ءَايَٰتِنَا لَغَٰفِلُونَ","1497":"وَلَقَدۡ أَرۡسَلۡنَا نُوحًا إِلَىٰ قَوۡمِهِۦٓ إِنِّي لَكُمۡ نَذِيرٞ مُّبِينٌ","1498":"أَن لَّا تَعۡبُدُوٓاْ إِلَّا ٱللَّهَۖ إِنِّيٓ أَخَافُ عَلَيۡكُمۡ عَذَابَ يَوۡمٍ أَلِيمٖ","1499":"فَقَالَ ٱلۡمَلَأُ ٱلَّذِينَ كَفَرُواْ مِن قَوۡمِهِۦ مَا نَرَىٰكَ إِلَّا بَشَرٗا مِّثۡلَنَا وَمَا نَرَىٰكَ ٱتَّبَعَكَ إِلَّا ٱلَّذِينَ هُمۡ أَرَاذِلُنَا بَادِيَ ٱلرَّأۡيِ وَمَا نَرَىٰ لَكُمۡ عَلَيۡنَا مِن فَضۡلِۭ بَلۡ نَظُنُّكُمۡ كَٰذِبِينَ","1509":"وَٱصۡنَعِ ٱلۡفُلۡكَ بِأَعۡيُنِنَا وَوَحۡيِنَا وَلَا تُخَٰطِبۡنِي فِي ٱلَّذِينَ ظَلَمُوٓاْ إِنَّهُم مُّغۡرَقُونَ","1510":"وَيَصۡنَعُ ٱلۡفُلۡكَ وَكُلَّمَا مَرَّ عَلَيۡهِ مَلَأٞ مِّن قَوۡمِهِۦ سَخِرُواْ مِنۡهُۚ قَالَ إِن تَسۡخَرُواْ مِنَّا فَإِنَّا نَسۡخَرُ مِنكُمۡ كَمَا تَسۡخَرُونَ","1511":"فَسَوۡفَ تَعۡلَمُونَ مَن يَأۡتِيهِ عَذَابٞ يُخۡزِيهِ وَيَحِلُّ عَلَيۡهِ عَذَابٞ مُّقِيمٌ","1512":"حَتَّىٰٓ إِذَا جَآءَ أَمۡرُنَا وَفَارَ ٱلتَّنُّورُ قُلۡنَا ٱحۡمِلۡ فِيهَا مِن كُلّٖ زَوۡجَيۡنِ ٱثۡنَيۡنِ وَأَهۡلَكَ إِلَّا مَن سَبَقَ عَلَيۡهِ ٱلۡقَوۡلُ وَمَنۡ ءَامَنَۚ وَمَآ ءَامَنَ مَعَهُۥٓ إِلَّا قَلِيلٞ","1513":"۞ وَقَالَ ٱرۡكَبُواْ فِيهَا بِسۡمِ ٱللَّهِ مَجۡر۪ىٰهَا وَمُرۡسَىٰهَآۚ إِنَّ رَبِّي لَغَفُورٞ رَّحِيمٞ","1514":"وَهِيَ تَجۡرِي بِهِمۡ فِي مَوۡجٖ كَٱلۡجِبَالِ وَنَادَىٰ نُوحٌ ٱبۡنَهُۥ وَكَانَ فِي مَعۡزِلٖ يَٰبُنَيَّ ٱرۡكَب مَّعَنَا وَلَا تَكُن مَّعَ ٱلۡكَٰفِرِينَ","1515":"قَالَ سَـَٔاوِيٓ إِلَىٰ جَبَلٖ يَعۡصِمُنِي مِنَ ٱلۡمَآءِۚ قَالَ لَا عَاصِمَ ٱلۡيَوۡمَ مِنۡ أَمۡرِ ٱللَّهِ إِلَّا مَن رَّحِمَۚ وَحَالَ بَيۡنَهُمَا ٱلۡمَوۡجُ فَكَانَ مِنَ ٱلۡمُغۡرَقِينَ","1516":"وَقِيلَ يَٰٓأَرۡضُ ٱبۡلَعِي مَآءَكِ وَيَٰسَمَآءُ أَقۡلِعِي وَغِيضَ ٱلۡمَآءُ وَقُضِيَ ٱلۡأَمۡرُ وَٱسۡتَوَتۡ عَلَى ٱلۡجُودِيِّۖ وَقِيلَ بُعۡدٗا لِّلۡقَوۡمِ ٱلظَّٰلِمِينَ","1517":"وَنَادَىٰ نُوحٞ رَّبَّهُۥ فَقَالَ رَبِّ إِنَّ ٱبۡنِي مِنۡ أَهۡلِي وَإِنَّ وَعۡدَكَ ٱلۡحَقُّ وَأَنتَ أَحۡكَمُ ٱلۡحَٰكِمِينَ","1518":"قَالَ يَٰنُوحُ إِنَّهُۥ لَيۡسَ مِنۡ أَهۡلِكَۖ إِنَّهُۥ عَمَلٌ غَيۡرُ صَٰلِحٖۖ فَلَا تَسۡـَٔلۡنِ مَا لَيۡسَ لَكَ بِهِۦ عِلۡمٌۖ إِنِّيٓ أَعِظُكَ أَن تَكُونَ مِنَ ٱلۡجَٰهِلِينَ","1519":"قَالَ رَبِّ إِنِّيٓ أَعُوذُ بِكَ أَنۡ أَسۡـَٔلَكَ مَا لَيۡسَ لِي بِهِۦ عِلۡمٞۖ وَإِلَّا تَغۡفِرۡ لِي وَتَرۡحَمۡنِيٓ أَكُن مِّنَ ٱلۡخَٰسِرِينَ","1533":"۞ وَإِلَىٰ ثَمُودَ أَخَاهُمۡ صَٰلِحٗاۚ قَالَ يَٰقَوۡمِ ٱعۡبُدُواْ ٱللَّهَ مَا لَكُم مِّنۡ إِلَٰهٍ غَيۡرُهُۥۖ هُوَ أَنشَأَكُم مِّنَ ٱلۡأَرۡضِ وَٱسۡتَعۡمَرَكُمۡ فِيهَا فَٱسۡتَغۡفِرُوهُ ثُمَّ تُوبُوٓاْ إِلَيۡهِۚ إِنَّ رَبِّي قَرِيبٞ مُّجِيبٞ","1534":"قَالُواْ يَٰصَٰلِحُ قَدۡ كُنتَ فِينَا مَرۡجُوّٗا قَبۡلَ هَٰذَآۖ أَتَنۡهَىٰنَآ أَن نَّعۡبُدَ مَا يَعۡبُدُ ءَابَآؤُنَا وَإِنَّنَا لَفِي شَكّٖ مِّمَّا تَدۡعُونَآ إِلَيۡهِ مُرِيبٖ","1535":"قَالَ يَٰقَوۡمِ أَرَءَيۡتُمۡ إِن كُنتُ عَلَىٰ بَيِّنَةٖ مِّن رَّبِّي وَءَاتَىٰنِي مِنۡهُ رَحۡمَةٗ فَمَن يَنصُرُنِي مِنَ ٱللَّهِ إِنۡ عَصَيۡتُهُۥۖ فَمَا تَزِيدُونَنِي غَيۡرَ تَخۡسِيرٖ","1536":"وَيَٰقَوۡمِ هَٰذِهِۦ نَاقَةُ ٱللَّهِ لَكُمۡ ءَايَةٗۖ فَذَرُوهَا تَأۡكُلۡ فِيٓ أَرۡضِ ٱللَّهِۖ وَلَا تَمَسُّوهَا بِسُوٓءٖ فَيَأۡخُذَكُمۡ عَذَابٞ قَرِيبٞ","1537":"فَعَقَرُوهَا فَقَالَ تَمَتَّعُواْ فِي دَارِكُمۡ ثَلَٰثَةَ أَيَّامٖۖ ذَٰلِكَ وَعۡدٌ غَيۡرُ مَكۡذُوبٖ","1538":"فَلَمَّا جَآءَ أَمۡرُنَا نَجَّيۡنَا صَٰلِحٗا وَٱلَّذِينَ ءَامَنُواْ مَعَهُۥ بِرَحۡمَةٖ مِّنَّا وَمِنۡ خِزۡيِ يَوۡمِئِذٍۚ إِنَّ رَبَّكَ هُوَ ٱلۡقَوِيُّ ٱلۡعَزِيزُ","1539":"وَأَخَذَ ٱلَّذِينَ ظَلَمُواْ ٱلصَّيۡحَةُ فَأَصۡبَحُواْ فِي دِيَٰرِهِمۡ جَٰثِمِينَ","1540":"كَأَن لَّمۡ يَغۡنَوۡاْ فِيهَآۗ أَلَآ إِنَّ ثَمُودَاْ كَفَرُواْ رَبَّهُمۡۗ أَلَا بُعۡدٗا لِّثَمُودَ","1549":"وَلَمَّا جَآءَتۡ رُسُلُنَا لُوطٗا سِيٓءَ بِهِمۡ وَضَاقَ بِهِمۡ ذَرۡعٗا وَقَالَ هَٰذَا يَوۡمٌ عَصِيبٞ","1550":"وَجَآءَهُۥ قَوۡمُهُۥ يُهۡرَعُونَ إِلَيۡهِ وَمِن قَبۡلُ كَانُواْ يَعۡمَلُونَ ٱلسَّيِّـَٔاتِۚ قَالَ يَٰقَوۡمِ هَٰٓؤُلَآءِ بَنَاتِي هُنَّ أَطۡهَرُ لَكُمۡۖ فَٱتَّقُواْ ٱللَّهَ وَلَا تُخۡزُونِ فِي ضَيۡفِيٓۖ أَلَيۡسَ مِنكُمۡ رَجُلٞ رَّشِيدٞ","1551":"قَالُواْ لَقَدۡ عَلِمۡتَ مَا لَنَا فِي بَنَاتِكَ مِنۡ حَقّٖ وَإِنَّكَ لَتَعۡلَمُ مَا نُرِيدُ","1552":"قَالَ لَوۡ أَنَّ لِي بِكُمۡ قُوَّةً أَوۡ ءَاوِيٓ إِلَىٰ رُكۡنٖ شَدِيدٖ","1553":"قَالُواْ يَٰلُوطُ إِنَّا رُسُلُ رَبِّكَ لَن يَصِلُوٓاْ إِلَيۡكَۖ فَأَسۡرِ بِأَهۡلِكَ بِقِطۡعٖ مِّنَ ٱلَّيۡلِ وَلَا يَلۡتَفِتۡ مِنكُمۡ أَحَدٌ إِلَّا ٱمۡرَأَتَكَۖ إِنَّهُۥ مُصِيبُهَا مَآ أَصَابَهُمۡۚ إِنَّ مَوۡعِدَهُمُ ٱلصُّبۡحُۚ أَلَيۡسَ ٱلصُّبۡحُ بِقَرِيبٖ","1554":"فَلَمَّا جَآءَ أَمۡرُنَا جَعَلۡنَا عَٰلِيَهَا سَافِلَهَا وَأَمۡطَرۡنَا عَلَيۡهَا حِجَارَةٗ مِّن سِجِّيلٖ مَّنضُودٖ","1555":"مُّسَوَّمَةً عِندَ رَبِّكَۖ وَمَا هِيَ مِنَ ٱلظَّٰلِمِينَ بِبَعِيدٖ","1561":"وَيَٰقَوۡمِ لَا يَجۡرِمَنَّكُمۡ شِقَاقِيٓ أَن يُصِيبَكُم مِّثۡلُ مَآ أَصَابَ قَوۡمَ نُوحٍ أَوۡ قَوۡمَ هُودٍ أَوۡ قَوۡمَ صَٰلِحٖۚ وَمَا قَوۡمُ لُوطٖ مِّنكُم بِبَعِيدٖ","1562":"وَٱسۡتَغۡفِرُواْ رَبَّكُمۡ ثُمَّ تُوبُوٓاْ إِلَيۡهِۚ إِنَّ رَبِّي رَحِيمٞ وَدُودٞ","1563":"قَالُواْ يَٰشُعَيۡبُ مَا نَفۡقَهُ كَثِيرٗا مِّمَّا تَقُولُ وَإِنَّا لَنَرَىٰكَ فِينَا ضَعِيفٗاۖ وَلَوۡلَا رَهۡطُكَ لَرَجَمۡنَٰكَۖ وَمَآ أَنتَ عَلَيۡنَا بِعَزِيزٖ","1564":"قَالَ يَٰقَوۡمِ أَرَهۡطِيٓ أَعَزُّ عَلَيۡكُم مِّنَ ٱللَّهِ وَٱتَّخَذۡتُمُوهُ وَرَآءَكُمۡ ظِهۡرِيًّاۖ إِنَّ رَبِّي بِمَا تَعۡمَلُونَ مُحِيطٞ","1565":"وَيَٰقَوۡمِ ٱعۡمَلُواْ عَلَىٰ مَكَانَتِكُمۡ إِنِّي عَٰمِلٞۖ سَوۡفَ تَعۡلَمُونَ مَن يَأۡتِيهِ عَذَابٞ يُخۡزِيهِ وَمَنۡ هُوَ كَٰذِبٞۖ وَٱرۡتَقِبُوٓاْ إِنِّي مَعَكُمۡ رَقِيبٞ","1566":"وَلَمَّا جَآءَ أَمۡرُنَا نَجَّيۡنَا شُعَيۡبٗا وَٱلَّذِينَ ءَامَنُواْ مَعَهُۥ بِرَحۡمَةٖ مِّنَّا وَأَخَذَتِ ٱلَّذِينَ ظَلَمُواْ ٱلصَّيۡحَةُ فَأَصۡبَحُواْ فِي دِيَٰرِهِمۡ جَٰثِمِينَ","1567":"كَأَن لَّمۡ يَغۡنَوۡاْ فِيهَآۗ أَلَا بُعۡدٗا لِّمَدۡيَنَ كَمَا بَعِدَتۡ ثَمُودُ","1589":"وَمَا كَانَ رَبُّكَ لِيُهۡلِكَ ٱلۡقُرَىٰ بِظُلۡمٖ وَأَهۡلُهَا مُصۡلِحُونَ","1704":"وَمَآ أَرۡسَلۡنَا مِن قَبۡلِكَ إِلَّا رِجَالٗا نُّوحِيٓ إِلَيۡهِم مِّنۡ أَهۡلِ ٱلۡقُرَىٰٓۗ أَفَلَمۡ يَسِيرُواْ فِي ٱلۡأَرۡضِ فَيَنظُرُواْ كَيۡفَ كَانَ عَٰقِبَةُ ٱلَّذِينَ مِن قَبۡلِهِمۡۗ وَلَدَارُ ٱلۡأٓخِرَةِ خَيۡرٞ لِّلَّذِينَ ٱتَّقَوۡاْۚ أَفَلَا تَعۡقِلُونَ","1706":"لَقَدۡ كَانَ فِي قَصَصِهِمۡ عِبۡرَةٞ لِّأُوْلِي ٱلۡأَلۡبَٰبِۗ مَا كَانَ حَدِيثٗا يُفۡتَرَىٰ وَلَٰكِن تَصۡدِيقَ ٱلَّذِي بَيۡنَ يَدَيۡهِ وَتَفۡصِيلَ كُلِّ شَيۡءٖ وَهُدٗى وَرَحۡمَةٗ لِّقَوۡمٖ يُؤۡمِنُونَ","1874":"فَأَخَذَتۡهُمُ ٱلصَّيۡحَةُ مُشۡرِقِينَ","1875":"فَجَعَلۡنَا عَٰلِيَهَا سَافِلَهَا وَأَمۡطَرۡنَا عَلَيۡهِمۡ حِجَارَةٗ مِّن سِجِّيلٍ","1876":"إِنَّ فِي ذَٰلِكَ لَأٓيَٰتٖ لِّلۡمُتَوَسِّمِينَ","1877":"وَإِنَّهَا لَبِسَبِيلٖ مُّقِيمٍ","1878":"إِنَّ فِي ذَٰلِكَ لَأٓيَةٗ لِّلۡمُؤۡمِنِينَ","1879":"وَإِن كَانَ أَصۡحَٰبُ ٱلۡأَيۡكَةِ لَظَٰلِمِينَ","1880":"فَٱنتَقَمۡنَا مِنۡهُمۡ وَإِنَّهُمَا لَبِإِمَامٖ مُّبِينٖ","1881":"وَلَقَدۡ كَذَّبَ أَصۡحَٰبُ ٱلۡحِجۡرِ ٱلۡمُرۡسَلِينَ","1882":"وَءَاتَيۡنَٰهُمۡ ءَايَٰتِنَا فَكَانُواْ عَنۡهَا مُعۡرِضِينَ","1883":"وَكَانُواْ يَنۡحِتُونَ مِنَ ٱلۡجِبَالِ بُيُوتًا ءَامِنِينَ","1884":"فَأَخَذَتۡهُمُ ٱلصَّيۡحَةُ مُصۡبِحِينَ","1885":"فَمَآ أَغۡنَىٰ عَنۡهُم مَّا كَانُواْ يَكۡسِبُونَ","2032":"وَقَضَيۡنَآ إِلَىٰ بَنِيٓ إِسۡرَٰٓءِيلَ فِي ٱلۡكِتَٰبِ لَتُفۡسِدُنَّ فِي ٱلۡأَرۡضِ مَرَّتَيۡنِ وَلَتَعۡلُنَّ عُلُوّٗا كَبِيرٗا","2033":"فَإِذَا جَآءَ وَعۡدُ أُولَىٰهُمَا بَعَثۡنَا عَلَيۡكُمۡ عِبَادٗا لَّنَآ أُوْلِي بَأۡسٖ شَدِيدٖ فَجَاسُواْ خِلَٰلَ ٱلدِّيَارِۚ وَكَانَ وَعۡدٗا مَّفۡعُولٗا","2034":"ثُمَّ رَدَدۡنَا لَكُمُ ٱلۡكَرَّةَ عَلَيۡهِمۡ وَأَمۡدَدۡنَٰكُم بِأَمۡوَٰلٖ وَبَنِينَ وَجَعَلۡنَٰكُمۡ أَكۡثَرَ نَفِيرًا","2035":"إِنۡ أَحۡسَنتُمۡ أَحۡسَنتُمۡ لِأَنفُسِكُمۡۖ وَإِنۡ أَسَأۡتُمۡ فَلَهَاۚ فَإِذَا جَآءَ وَعۡدُ ٱلۡأٓخِرَةِ لِيَسُـُٔواْ وُجُوهَكُمۡ وَلِيَدۡخُلُواْ ٱلۡمَسۡجِدَ كَمَا دَخَلُوهُ أَوَّلَ مَرَّةٖ وَلِيُتَبِّرُواْ مَا عَلَوۡاْ تَتۡبِيرًا","2036":"عَسَىٰ رَبُّكُمۡ أَن يَرۡحَمَكُمۡۚ وَإِنۡ عُدتُّمۡ عُدۡنَاۚ وَجَعَلۡنَا جَهَنَّمَ لِلۡكَٰفِرِينَ حَصِيرًا","2044":"وَإِذَآ أَرَدۡنَآ أَن نُّهۡلِكَ قَرۡيَةً أَمَرۡنَا مُتۡرَفِيهَا فَفَسَقُواْ فِيهَا فَحَقَّ عَلَيۡهَا ٱلۡقَوۡلُ فَدَمَّرۡنَٰهَا تَدۡمِيرٗا","2222":"وَيَسۡـَٔلُونَكَ عَن ذِي ٱلۡقَرۡنَيۡنِۖ قُلۡ سَأَتۡلُواْ عَلَيۡكُم مِّنۡهُ ذِكۡرًا","2223":"إِنَّا مَكَّنَّا لَهُۥ فِي ٱلۡأَرۡضِ وَءَاتَيۡنَٰهُ مِن كُلِّ شَيۡءٖ سَبَبٗا","2224":"فَأَتۡبَعَ سَبَبًا","2225":"حَتَّىٰٓ إِذَا بَلَغَ مَغۡرِبَ ٱلشَّمۡسِ وَجَدَهَا تَغۡرُبُ فِي عَيۡنٍ حَمِئَةٖ وَوَجَدَ عِندَهَا قَوۡمٗاۖ قُلۡنَا يَٰذَا ٱلۡقَرۡنَيۡنِ إِمَّآ أَن تُعَذِّبَ وَإِمَّآ أَن تَتَّخِذَ فِيهِمۡ حُسۡنٗا","2226":"قَالَ أَمَّا مَن ظَلَمَ فَسَوۡفَ نُعَذِّبُهُۥ ثُمَّ يُرَدُّ إِلَىٰ رَبِّهِۦ فَيُعَذِّبُهُۥ عَذَابٗا نُّكۡرٗا","2227":"وَأَمَّا مَنۡ ءَامَنَ وَعَمِلَ صَٰلِحٗا فَلَهُۥ جَزَآءً ٱلۡحُسۡنَىٰۖ وَسَنَقُولُ لَهُۥ مِنۡ أَمۡرِنَا يُسۡرٗا","2228":"ثُمَّ أَتۡبَعَ سَبَبًا","2229":"حَتَّىٰٓ إِذَا بَلَغَ مَطۡلِعَ ٱلشَّمۡسِ وَجَدَهَا تَطۡلُعُ عَلَىٰ قَوۡمٖ لَّمۡ نَجۡعَل لَّهُم مِّن دُونِهَا سِتۡرٗا","2230":"كَذَٰلِكَۖ وَقَدۡ أَحَطۡنَا بِمَا لَدَيۡهِ خُبۡرٗا","2231":"ثُمَّ أَتۡبَعَ سَبَبًا","2232":"حَتَّىٰٓ إِذَا بَلَغَ بَيۡنَ ٱلسَّدَّيۡنِ وَجَدَ مِن دُونِهِمَا قَوۡمٗا لَّا يَكَادُونَ يَفۡقَهُونَ قَوۡلٗا","2233":"قَالُواْ يَٰذَا ٱلۡقَرۡنَيۡنِ إِنَّ يَأۡجُوجَ وَمَأۡجُوجَ مُفۡسِدُونَ فِي ٱلۡأَرۡضِ فَهَلۡ نَجۡعَلُ لَكَ خَرۡجًا عَلَىٰٓ أَن تَجۡعَلَ بَيۡنَنَا وَبَيۡنَهُمۡ سَدّٗا","2234":"قَالَ مَا مَكَّنِّي فِيهِ رَبِّي خَيۡرٞ فَأَعِينُونِي بِقُوَّةٍ أَجۡعَلۡ بَيۡنَكُمۡ وَبَيۡنَهُمۡ رَدۡمًا","2235":"ءَاتُونِي زُبَرَ ٱلۡحَدِيدِۖ حَتَّىٰٓ إِذَا سَاوَىٰ بَيۡنَ ٱلصَّدَفَيۡنِ قَالَ ٱنفُخُواْۖ حَتَّىٰٓ إِذَا جَعَلَهُۥ نَارٗا قَالَ ءَاتُونِيٓ أُفۡرِغۡ عَلَيۡهِ قِطۡرٗا","2236":"فَمَا ٱسۡطَٰعُوٓاْ أَن يَظۡهَرُوهُ وَمَا ٱسۡتَطَٰعُواْ لَهُۥ نَقۡبٗا","2237":"قَالَ هَٰذَا رَحۡمَةٞ مِّن رَّبِّيۖ فَإِذَا جَآءَ وَعۡدُ رَبِّي جَعَلَهُۥ دَكَّآءَۖ وَكَانَ وَعۡدُ رَبِّي حَقّٗا","2578":"حَتَّىٰٓ إِذَا فُتِحَتۡ يَأۡجُوجُ وَمَأۡجُوجُ وَهُم مِّن كُلِّ حَدَبٖ يَنسِلُونَ","2579":"وَٱقۡتَرَبَ ٱلۡوَعۡدُ ٱلۡحَقُّ فَإِذَا هِيَ شَٰخِصَةٌ أَبۡصَٰرُ ٱلَّذِينَ كَفَرُواْ يَٰوَيۡلَنَا قَدۡ كُنَّا فِي غَفۡلَةٖ مِّنۡ هَٰذَا بَلۡ كُنَّا ظَٰلِمِينَ","2892":"وَعَادٗا وَثَمُودَاْ وَأَصۡحَٰبَ ٱلرَّسِّ وَقُرُونَۢا بَيۡنَ ذَٰلِكَ كَثِيرٗا","2893":"وَكُلّٗا ضَرَبۡنَا لَهُ ٱلۡأَمۡثَٰلَۖ وَكُلّٗا تَبَّرۡنَا تَتۡبِيرٗا","2894":"وَلَقَدۡ أَتَوۡاْ عَلَى ٱلۡقَرۡيَةِ ٱلَّتِيٓ أُمۡطِرَتۡ مَطَرَ ٱلسَّوۡءِۚ أَفَلَمۡ يَكُونُواْ يَرَوۡنَهَاۚ بَلۡ كَانُواْ لَا يَرۡجُونَ نُشُورٗا","2988":"فَأَخۡرَجۡنَٰهُم مِّن جَنَّٰتٖ وَعُيُونٖ","2989":"وَكُنُوزٖ وَمَقَامٖ كَرِيمٖ","2990":"كَذَٰلِكَۖ وَأَوۡرَثۡنَٰهَا بَنِيٓ إِسۡرَٰٓءِيلَ","3059":"أَتَبۡنُونَ بِكُلِّ رِيعٍ ءَايَةٗ تَعۡبَثُونَ","3060":"وَتَتَّخِذُونَ مَصَانِعَ لَعَلَّكُمۡ تَخۡلُدُونَ","3061":"وَإِذَا بَطَشۡتُم بَطَشۡتُمۡ جَبَّارِينَ","3062":"فَٱتَّقُواْ ٱللَّهَ وَأَطِيعُونِ","3063":"وَٱتَّقُواْ ٱلَّذِيٓ أَمَدَّكُم بِمَا تَعۡلَمُونَ","3064":"أَمَدَّكُم بِأَنۡعَٰمٖ وَبَنِينَ","3065":"وَجَنَّٰتٖ وَعُيُونٍ","3066":"إِنِّيٓ أَخَافُ عَلَيۡكُمۡ عَذَابَ يَوۡمٍ عَظِيمٖ","3077":"أَتُتۡرَكُونَ فِي مَا هَٰهُنَآ ءَامِنِينَ","3078":"فِي جَنَّٰتٖ وَعُيُونٖ","3079":"وَزُرُوعٖ وَنَخۡلٖ طَلۡعُهَا هَضِيمٞ","3080":"وَتَنۡحِتُونَ مِنَ ٱلۡجِبَالِ بُيُوتٗا فَٰرِهِينَ","3107":"كَذَّبَ أَصۡحَٰبُ لۡـَٔيۡكَةِ ٱلۡمُرۡسَلِينَ","3108":"إِذۡ قَالَ لَهُمۡ شُعَيۡبٌ أَلَا تَتَّقُونَ","3109":"إِنِّي لَكُمۡ رَسُولٌ أَمِينٞ","3110":"فَٱتَّقُواْ ٱللَّهَ وَأَطِيعُونِ","3111":"وَمَآ أَسۡـَٔلُكُمۡ عَلَيۡهِ مِنۡ أَجۡرٍۖ إِنۡ أَجۡرِيَ إِلَّا عَلَىٰ رَبِّ ٱلۡعَٰلَمِينَ","3112":"۞ أَوۡفُواْ ٱلۡكَيۡلَ وَلَا تَكُونُواْ مِنَ ٱلۡمُخۡسِرِينَ","3113":"وَزِنُواْ بِٱلۡقِسۡطَاسِ ٱلۡمُسۡتَقِيمِ","3114":"وَلَا تَبۡخَسُواْ ٱلنَّاسَ أَشۡيَآءَهُمۡ وَلَا تَعۡثَوۡاْ فِي ٱلۡأَرۡضِ مُفۡسِدِينَ","3115":"وَٱتَّقُواْ ٱلَّذِي خَلَقَكُمۡ وَٱلۡجِبِلَّةَ ٱلۡأَوَّلِينَ","3116":"قَالُوٓاْ إِنَّمَآ أَنتَ مِنَ ٱلۡمُسَحَّرِينَ","3117":"وَمَآ أَنتَ إِلَّا بَشَرٞ مِّثۡلُنَا وَإِن نَّظُنُّكَ لَمِنَ ٱلۡكَٰذِبِينَ","3118":"فَأَسۡقِطۡ عَلَيۡنَا كِسَفٗا مِّنَ ٱلسَّمَآءِ إِن كُنتَ مِنَ ٱلصَّٰدِقِينَ","3119":"قَالَ رَبِّيٓ أَعۡلَمُ بِمَا تَعۡمَلُونَ","3120":"فَكَذَّبُوهُ فَأَخَذَهُمۡ عَذَابُ يَوۡمِ ٱلظُّلَّةِۚ إِنَّهُۥ كَانَ عَذَابَ يَوۡمٍ عَظِيمٍ","3121":"إِنَّ فِي ذَٰلِكَ لَأٓيَةٗۖ وَمَا كَانَ أَكۡثَرُهُم مُّؤۡمِنِينَ","3122":"وَإِنَّ رَبَّكَ لَهُوَ ٱلۡعَزِيزُ ٱلرَّحِيمُ","3180":"فَمَكَثَ غَيۡرَ بَعِيدٖ فَقَالَ أَحَطتُ بِمَا لَمۡ تُحِطۡ بِهِۦ وَجِئۡتُكَ مِن سَبَإِۭ بِنَبَإٖ يَقِينٍ","3181":"إِنِّي وَجَدتُّ ٱمۡرَأَةٗ تَمۡلِكُهُمۡ وَأُوتِيَتۡ مِن كُلِّ شَيۡءٖ وَلَهَا عَرۡشٌ عَظِيمٞ","3182":"وَجَدتُّهَا وَقَوۡمَهَا يَسۡجُدُونَ لِلشَّمۡسِ مِن دُونِ ٱللَّهِ وَزَيَّنَ لَهُمُ ٱلشَّيۡطَٰنُ أَعۡمَٰلَهُمۡ فَصَدَّهُمۡ عَنِ ٱلسَّبِيلِ فَهُمۡ لَا يَهۡتَدُونَ","3183":"أَلَّاۤ يَسۡجُدُواْۤ لِلَّهِ ٱلَّذِي يُخۡرِجُ ٱلۡخَبۡءَ فِي ٱلسَّمَٰوَٰتِ وَٱلۡأَرۡضِ وَيَعۡلَمُ مَا تُخۡفُونَ وَمَا تُعۡلِنُونَ","3184":"ٱللَّهُ لَآ إِلَٰهَ إِلَّا هُوَ رَبُّ ٱلۡعَرۡشِ ٱلۡعَظِيمِ۩","3187":"قَالَتۡ يَٰٓأَيُّهَا ٱلۡمَلَؤُاْ إِنِّيٓ أُلۡقِيَ إِلَيَّ كِتَٰبٞ كَرِيمٌ","3188":"إِنَّهُۥ مِن سُلَيۡمَٰنَ وَإِنَّهُۥ بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ","3189":"أَلَّا تَعۡلُواْ عَلَيَّ وَأۡتُونِي مُسۡلِمِينَ","3190":"قَالَتۡ يَٰٓأَيُّهَا ٱلۡمَلَؤُاْ أَفۡتُونِي فِيٓ أَمۡرِي مَا كُنتُ قَاطِعَةً أَمۡرًا حَتَّىٰ تَشۡهَدُونِ","3191":"قَالُواْ نَحۡنُ أُوْلُواْ قُوَّةٖ وَأُوْلُواْ بَأۡسٖ شَدِيدٖ وَٱلۡأَمۡرُ إِلَيۡكِ فَٱنظُرِي مَاذَا تَأۡمُرِينَ","3192":"قَالَتۡ إِنَّ ٱلۡمُلُوكَ إِذَا دَخَلُواْ قَرۡيَةً أَفۡسَدُوهَا وَجَعَلُوٓاْ أَعِزَّةَ أَهۡلِهَآ أَذِلَّةٗۚ وَكَذَٰلِكَ يَفۡعَلُونَ","3193":"وَإِنِّي مُرۡسِلَةٌ إِلَيۡهِم بِهَدِيَّةٖ فَنَاظِرَةُۢ بِمَ يَرۡجِعُ ٱلۡمُرۡسَلُونَ","3202":"قِيلَ لَهَا ٱدۡخُلِي ٱلصَّرۡحَۖ فَلَمَّا رَأَتۡهُ حَسِبَتۡهُ لُجَّةٗ وَكَشَفَتۡ عَن سَاقَيۡهَاۚ قَالَ إِنَّهُۥ صَرۡحٞ مُّمَرَّدٞ مِّن قَوَارِيرَۗ قَالَتۡ رَبِّ إِنِّي ظَلَمۡتُ نَفۡسِي وَأَسۡلَمۡتُ مَعَ سُلَيۡمَٰنَ لِلَّهِ رَبِّ ٱلۡعَٰلَمِينَ","3212":"وَلُوطًا إِذۡ قَالَ لِقَوۡمِهِۦٓ أَتَأۡتُونَ ٱلۡفَٰحِشَةَ وَأَنتُمۡ تُبۡصِرُونَ","3213":"أَئِنَّكُمۡ لَتَأۡتُونَ ٱلرِّجَالَ شَهۡوَةٗ مِّن دُونِ ٱلنِّسَآءِۚ بَلۡ أَنتُمۡ قَوۡمٞ تَجۡهَلُونَ","3214":"۞ فَمَا كَانَ جَوَابَ قَوۡمِهِۦٓ إِلَّآ أَن قَالُوٓاْ أَخۡرِجُوٓاْ ءَالَ لُوطٖ مِّن قَرۡيَتِكُمۡۖ إِنَّهُمۡ أُنَاسٞ يَتَطَهَّرُونَ","3215":"فَأَنجَيۡنَٰهُ وَأَهۡلَهُۥٓ إِلَّا ٱمۡرَأَتَهُۥ قَدَّرۡنَٰهَا مِنَ ٱلۡغَٰبِرِينَ","3216":"وَأَمۡطَرۡنَا عَلَيۡهِم مَّطَرٗاۖ فَسَآءَ مَطَرُ ٱلۡمُنذَرِينَ","3255":"إِنَّ فِرۡعَوۡنَ عَلَا فِي ٱلۡأَرۡضِ وَجَعَلَ أَهۡلَهَا شِيَعٗا يَسۡتَضۡعِفُ طَآئِفَةٗ مِّنۡهُمۡ يُذَبِّحُ أَبۡنَآءَهُمۡ وَيَسۡتَحۡيِۦ نِسَآءَهُمۡۚ إِنَّهُۥ كَانَ مِنَ ٱلۡمُفۡسِدِينَ","3256":"وَنُرِيدُ أَن نَّمُنَّ عَلَى ٱلَّذِينَ ٱسۡتُضۡعِفُواْ فِي ٱلۡأَرۡضِ وَنَجۡعَلَهُمۡ أَئِمَّةٗ وَنَجۡعَلَهُمُ ٱلۡوَٰرِثِينَ","3257":"وَنُمَكِّنَ لَهُمۡ فِي ٱلۡأَرۡضِ وَنُرِيَ فِرۡعَوۡنَ وَهَٰمَٰنَ وَجُنُودَهُمَا مِنۡهُم مَّا كَانُواْ يَحۡذَرُونَ","3289":"وَقَالَ فِرۡعَوۡنُ يَٰٓأَيُّهَا ٱلۡمَلَأُ مَا عَلِمۡتُ لَكُم مِّنۡ إِلَٰهٍ غَيۡرِي فَأَوۡقِدۡ لِي يَٰهَٰمَٰنُ عَلَى ٱلطِّينِ فَٱجۡعَل لِّي صَرۡحٗا لَّعَلِّيٓ أَطَّلِعُ إِلَىٰٓ إِلَٰهِ مُوسَىٰ وَإِنِّي لَأَظُنُّهُۥ مِنَ ٱلۡكَٰذِبِينَ","3310":"وَمَا كَانَ رَبُّكَ مُهۡلِكَ ٱلۡقُرَىٰ حَتَّىٰ يَبۡعَثَ فِيٓ أُمِّهَا رَسُولٗا يَتۡلُواْ عَلَيۡهِمۡ ءَايَٰتِنَاۚ وَمَا كُنَّا مُهۡلِكِي ٱلۡقُرَىٰٓ إِلَّا وَأَهۡلُهَا ظَٰلِمُونَ","3353":"وَلَقَدۡ أَرۡسَلۡنَا نُوحًا إِلَىٰ قَوۡمِهِۦ فَلَبِثَ فِيهِمۡ أَلۡفَ سَنَةٍ إِلَّا خَمۡسِينَ عَامٗا فَأَخَذَهُمُ ٱلطُّوفَانُ وَهُمۡ ظَٰلِمُونَ","3354":"فَأَنجَيۡنَٰهُ وَأَصۡحَٰبَ ٱلسَّفِينَةِ وَجَعَلۡنَٰهَآ ءَايَةٗ لِّلۡعَٰلَمِينَ","3409":"الٓمٓ","3410":"غُلِبَتِ ٱلرُّومُ","3411":"فِيٓ أَدۡنَى ٱلۡأَرۡضِ وَهُم مِّنۢ بَعۡدِ غَلَبِهِمۡ سَيَغۡلِبُونَ","3412":"فِي بِضۡعِ سِنِينَۗ لِلَّهِ ٱلۡأَمۡرُ مِن قَبۡلُ وَمِنۢ بَعۡدُۚ وَيَوۡمَئِذٖ يَفۡرَحُ ٱلۡمُؤۡمِنُونَ","3413":"بِنَصۡرِ ٱللَّهِۚ يَنصُرُ مَن يَشَآءُۖ وَهُوَ ٱلۡعَزِيزُ ٱلرَّحِيمُ","3414":"وَعۡدَ ٱللَّهِۖ لَا يُخۡلِفُ ٱللَّهُ وَعۡدَهُۥ وَلَٰكِنَّ أَكۡثَرَ ٱلنَّاسِ لَا يَعۡلَمُونَ","3415":"يَعۡلَمُونَ ظَٰهِرٗا مِّنَ ٱلۡحَيَوٰةِ ٱلدُّنۡيَا وَهُمۡ عَنِ ٱلۡأٓخِرَةِ هُمۡ غَٰفِلُونَ","3417":"أَوَلَمۡ يَسِيرُواْ فِي ٱلۡأَرۡضِ فَيَنظُرُواْ كَيۡفَ كَانَ عَٰقِبَةُ ٱلَّذِينَ مِن قَبۡلِهِمۡۚ كَانُوٓاْ أَشَدَّ مِنۡهُمۡ قُوَّةٗ وَأَثَارُواْ ٱلۡأَرۡضَ وَعَمَرُوهَآ أَكۡثَرَ مِمَّا عَمَرُوهَا وَجَآءَتۡهُمۡ رُسُلُهُم بِٱلۡبَيِّنَٰتِۖ فَمَا كَانَ ٱللَّهُ لِيَظۡلِمَهُمۡ وَلَٰكِن كَانُوٓاْ أَنفُسَهُمۡ يَظۡلِمُونَ","3418":"ثُمَّ كَانَ عَٰقِبَةَ ٱلَّذِينَ أَسَٰٓـُٔواْ ٱلسُّوٓأَىٰٓ أَن كَذَّبُواْ بِـَٔايَٰتِ ٱللَّهِ وَكَانُواْ بِهَا يَسۡتَهۡزِءُونَ","3620":"لَقَدۡ كَانَ لِسَبَإٖ فِي مَسۡكَنِهِمۡ ءَايَةٞۖ جَنَّتَانِ عَن يَمِينٖ وَشِمَالٖۖ كُلُواْ مِن رِّزۡقِ رَبِّكُمۡ وَٱشۡكُرُواْ لَهُۥۚ بَلۡدَةٞ طَيِّبَةٞ وَرَبٌّ غَفُورٞ","3621":"فَأَعۡرَضُواْ فَأَرۡسَلۡنَا عَلَيۡهِمۡ سَيۡلَ ٱلۡعَرِمِ وَبَدَّلۡنَٰهُم بِجَنَّتَيۡهِمۡ جَنَّتَيۡنِ ذَوَاتَيۡ أُكُلٍ خَمۡطٖ وَأَثۡلٖ وَشَيۡءٖ مِّن سِدۡرٖ قَلِيلٖ","3622":"ذَٰلِكَ جَزَيۡنَٰهُم بِمَا كَفَرُواْۖ وَهَلۡ نُجَٰزِيٓ إِلَّا ٱلۡكَفُورَ","3623":"وَجَعَلۡنَا بَيۡنَهُمۡ وَبَيۡنَ ٱلۡقُرَى ٱلَّتِي بَٰرَكۡنَا فِيهَا قُرٗى ظَٰهِرَةٗ وَقَدَّرۡنَا فِيهَا ٱلسَّيۡرَۖ سِيرُواْ فِيهَا لَيَالِيَ وَأَيَّامًا ءَامِنِينَ","3624":"فَقَالُواْ رَبَّنَا بَٰعِدۡ بَيۡنَ أَسۡفَارِنَا وَظَلَمُوٓاْ أَنفُسَهُمۡ فَجَعَلۡنَٰهُمۡ أَحَادِيثَ وَمَزَّقۡنَٰهُمۡ كُلَّ مُمَزَّقٍۚ إِنَّ فِي ذَٰلِكَ لَأٓيَٰتٖ لِّكُلِّ صَبَّارٖ شَكُورٖ","4232":"فَأَمَّا عَادٞ فَٱسۡتَكۡبَرُواْ فِي ٱلۡأَرۡضِ بِغَيۡرِ ٱلۡحَقِّ وَقَالُواْ مَنۡ أَشَدُّ مِنَّا قُوَّةًۖ أَوَلَمۡ يَرَوۡاْ أَنَّ ٱللَّهَ ٱلَّذِي خَلَقَهُمۡ هُوَ أَشَدُّ مِنۡهُمۡ قُوَّةٗۖ وَكَانُواْ بِـَٔايَٰتِنَا يَجۡحَدُونَ","4233":"فَأَرۡسَلۡنَا عَلَيۡهِمۡ رِيحٗا صَرۡصَرٗا فِيٓ أَيَّامٖ نَّحِسَاتٖ لِّنُذِيقَهُمۡ عَذَابَ ٱلۡخِزۡيِ فِي ٱلۡحَيَوٰةِ ٱلدُّنۡيَاۖ وَلَعَذَابُ ٱلۡأٓخِرَةِ أَخۡزَىٰۖ وَهُمۡ لَا يُنصَرُونَ","4375":"وَنَادَىٰ فِرۡعَوۡنُ فِي قَوۡمِهِۦ قَالَ يَٰقَوۡمِ أَلَيۡسَ لِي مُلۡكُ مِصۡرَ وَهَٰذِهِ ٱلۡأَنۡهَٰرُ تَجۡرِي مِن تَحۡتِيٓۚ أَفَلَا تُبۡصِرُونَ","4376":"أَمۡ أَنَا۠ خَيۡرٞ مِّنۡ هَٰذَا ٱلَّذِي هُوَ مَهِينٞ وَلَا يَكَادُ يُبِينُ","4377":"فَلَوۡلَآ أُلۡقِيَ عَلَيۡهِ أَسۡوِرَةٞ مِّن ذَهَبٍ أَوۡ جَآءَ مَعَهُ ٱلۡمَلَٰٓئِكَةُ مُقۡتَرِنِينَ","4378":"فَٱسۡتَخَفَّ قَوۡمَهُۥ فَأَطَاعُوهُۚ إِنَّهُمۡ كَانُواْ قَوۡمٗا فَٰسِقِينَ","4379":"فَلَمَّآ ءَاسَفُونَا ٱنتَقَمۡنَا مِنۡهُمۡ فَأَغۡرَقۡنَٰهُمۡ أَجۡمَعِينَ","4380":"فَجَعَلۡنَٰهُمۡ سَلَفٗا وَمَثَلٗا لِّلۡأٓخِرِينَ","4438":"كَمۡ تَرَكُواْ مِن جَنَّٰتٖ وَعُيُونٖ","4439":"وَزُرُوعٖ وَمَقَامٖ كَرِيمٖ","4440":"وَنَعۡمَةٖ كَانُواْ فِيهَا فَٰكِهِينَ","4441":"كَذَٰلِكَۖ وَأَوۡرَثۡنَٰهَا قَوۡمًا ءَاخَرِينَ","4442":"فَمَا بَكَتۡ عَلَيۡهِمُ ٱلسَّمَآءُ وَٱلۡأَرۡضُ وَمَا كَانُواْ مُنظَرِينَ","4450":"أَهُمۡ خَيۡرٌ أَمۡ قَوۡمُ تُبَّعٖ وَٱلَّذِينَ مِن قَبۡلِهِمۡ أَهۡلَكۡنَٰهُمۡۚ إِنَّهُمۡ كَانُواْ مُجۡرِمِينَ","4530":"۞ وَٱذۡكُرۡ أَخَا عَادٍ إِذۡ أَنذَرَ قَوۡمَهُۥ بِٱلۡأَحۡقَافِ وَقَدۡ خَلَتِ ٱلنُّذُرُ مِنۢ بَيۡنِ يَدَيۡهِ وَمِنۡ خَلۡفِهِۦٓ أَلَّا تَعۡبُدُوٓاْ إِلَّا ٱللَّهَ إِنِّيٓ أَخَافُ عَلَيۡكُمۡ عَذَابَ يَوۡمٍ عَظِيمٖ","4531":"قَالُوٓاْ أَجِئۡتَنَا لِتَأۡفِكَنَا عَنۡ ءَالِهَتِنَا فَأۡتِنَا بِمَا تَعِدُنَآ إِن كُنتَ مِنَ ٱلصَّٰدِقِينَ","4532":"قَالَ إِنَّمَا ٱلۡعِلۡمُ عِندَ ٱللَّهِ وَأُبَلِّغُكُم مَّآ أُرۡسِلۡتُ بِهِۦ وَلَٰكِنِّيٓ أَرَىٰكُمۡ قَوۡمٗا تَجۡهَلُونَ","4533":"فَلَمَّا رَأَوۡهُ عَارِضٗا مُّسۡتَقۡبِلَ أَوۡدِيَتِهِمۡ قَالُواْ هَٰذَا عَارِضٞ مُّمۡطِرُنَاۚ بَلۡ هُوَ مَا ٱسۡتَعۡجَلۡتُم بِهِۦۖ رِيحٞ فِيهَا عَذَابٌ أَلِيمٞ","4534":"تُدَمِّرُ كُلَّ شَيۡءِۭ بِأَمۡرِ رَبِّهَا فَأَصۡبَحُواْ لَا يُرَىٰٓ إِلَّا مَسَٰكِنُهُمۡۚ كَذَٰلِكَ نَجۡزِي ٱلۡقَوۡمَ ٱلۡمُجۡرِمِينَ","4535":"وَلَقَدۡ مَكَّنَّٰهُمۡ فِيمَآ إِن مَّكَّنَّٰكُمۡ فِيهِ وَجَعَلۡنَا لَهُمۡ سَمۡعٗا وَأَبۡصَٰرٗا وَأَفۡـِٔدَةٗ فَمَآ أَغۡنَىٰ عَنۡهُمۡ سَمۡعُهُمۡ وَلَآ أَبۡصَٰرُهُمۡ وَلَآ أَفۡـِٔدَتُهُم مِّن شَيۡءٍ إِذۡ كَانُواْ يَجۡحَدُونَ بِـَٔايَٰتِ ٱللَّهِ وَحَاقَ بِهِم مَّا كَانُواْ بِهِۦ يَسۡتَهۡزِءُونَ","4641":"كَذَّبَتۡ قَبۡلَهُمۡ قَوۡمُ نُوحٖ وَأَصۡحَٰبُ ٱلرَّسِّ وَثَمُودُ","4642":"وَعَادٞ وَفِرۡعَوۡنُ وَإِخۡوَٰنُ لُوطٖ","4643":"وَأَصۡحَٰبُ ٱلۡأَيۡكَةِ وَقَوۡمُ تُبَّعٖۚ كُلّٞ كَذَّبَ ٱلرُّسُلَ فَحَقَّ وَعِيدِ","4854":"۞ كَذَّبَتۡ قَبۡلَهُمۡ قَوۡمُ نُوحٖ فَكَذَّبُواْ عَبۡدَنَا وَقَالُواْ مَجۡنُونٞ وَٱزۡدُجِرَ","4855":"فَدَعَا رَبَّهُۥٓ أَنِّي مَغۡلُوبٞ فَٱنتَصِرۡ","4856":"فَفَتَحۡنَآ أَبۡوَٰبَ ٱلسَّمَآءِ بِمَآءٖ مُّنۡهَمِرٖ","4857":"وَفَجَّرۡنَا ٱلۡأَرۡضَ عُيُونٗا فَٱلۡتَقَى ٱلۡمَآءُ عَلَىٰٓ أَمۡرٖ قَدۡ قُدِرَ","4858":"وَحَمَلۡنَٰهُ عَلَىٰ ذَاتِ أَلۡوَٰحٖ وَدُسُرٖ","4859":"تَجۡرِي بِأَعۡيُنِنَا جَزَآءٗ لِّمَن كَانَ كُفِرَ","4860":"وَلَقَد تَّرَكۡنَٰهَآ ءَايَةٗ فَهَلۡ مِن مُّدَّكِرٖ","4863":"كَذَّبَتۡ عَادٞ فَكَيۡفَ كَانَ عَذَابِي وَنُذُرِ","4864":"إِنَّآ أَرۡسَلۡنَا عَلَيۡهِمۡ رِيحٗا صَرۡصَرٗا فِي يَوۡمِ نَحۡسٖ مُّسۡتَمِرّٖ","4865":"تَنزِعُ ٱلنَّاسَ كَأَنَّهُمۡ أَعۡجَازُ نَخۡلٖ مُّنقَعِرٖ","4868":"كَذَّبَتۡ ثَمُودُ بِٱلنُّذُرِ","4869":"فَقَالُوٓاْ أَبَشَرٗا مِّنَّا وَٰحِدٗا نَّتَّبِعُهُۥٓ إِنَّآ إِذٗا لَّفِي ضَلَٰلٖ وَسُعُرٍ","4870":"أَءُلۡقِيَ ٱلذِّكۡرُ عَلَيۡهِ مِنۢ بَيۡنِنَا بَلۡ هُوَ كَذَّابٌ أَشِرٞ","4871":"سَيَعۡلَمُونَ غَدٗا مَّنِ ٱلۡكَذَّابُ ٱلۡأَشِرُ","4872":"إِنَّا مُرۡسِلُواْ ٱلنَّاقَةِ فِتۡنَةٗ لَّهُمۡ فَٱرۡتَقِبۡهُمۡ وَٱصۡطَبِرۡ","4873":"وَنَبِّئۡهُمۡ أَنَّ ٱلۡمَآءَ قِسۡمَةُۢ بَيۡنَهُمۡۖ كُلُّ شِرۡبٖ مُّحۡتَضَرٞ","4874":"فَنَادَوۡاْ صَاحِبَهُمۡ فَتَعَاطَىٰ فَعَقَرَ","4875":"فَكَيۡفَ كَانَ عَذَابِي وَنُذُرِ","4876":"إِنَّآ أَرۡسَلۡنَا عَلَيۡهِمۡ صَيۡحَةٗ وَٰحِدَةٗ فَكَانُواْ كَهَشِيمِ ٱلۡمُحۡتَظِرِ","4878":"كَذَّبَتۡ قَوۡمُ لُوطِۭ بِٱلنُّذُرِ","4879":"إِنَّآ أَرۡسَلۡنَا عَلَيۡهِمۡ حَاصِبًا إِلَّآ ءَالَ لُوطٖۖ نَّجَّيۡنَٰهُم بِسَحَرٖ","4880":"نِّعۡمَةٗ مِّنۡ عِندِنَاۚ كَذَٰلِكَ نَجۡزِي مَن شَكَرَ","4881":"وَلَقَدۡ أَنذَرَهُم بَطۡشَتَنَا فَتَمَارَوۡاْ بِٱلنُّذُرِ","4882":"وَلَقَدۡ رَٰوَدُوهُ عَن ضَيۡفِهِۦ فَطَمَسۡنَآ أَعۡيُنَهُمۡ فَذُوقُواْ عَذَابِي وَنُذُرِ","4883":"وَلَقَدۡ صَبَّحَهُم بُكۡرَةً عَذَابٞ مُّسۡتَقِرّٞ","4884":"فَذُوقُواْ عَذَابِي وَنُذُرِ","5239":"وَضَرَبَ ٱللَّهُ مَثَلٗا لِّلَّذِينَ ءَامَنُواْ ٱمۡرَأَتَ فِرۡعَوۡنَ إِذۡ قَالَتۡ رَبِّ ٱبۡنِ لِي عِندَكَ بَيۡتٗا فِي ٱلۡجَنَّةِ وَنَجِّنِي مِن فِرۡعَوۡنَ وَعَمَلِهِۦ وَنَجِّنِي مِنَ ٱلۡقَوۡمِ ٱلظَّٰلِمِينَ","5328":"وَأَمَّا عَادٞ فَأُهۡلِكُواْ بِرِيحٖ صَرۡصَرٍ عَاتِيَةٖ","5329":"سَخَّرَهَا عَلَيۡهِمۡ سَبۡعَ لَيَالٖ وَثَمَٰنِيَةَ أَيَّامٍ حُسُومٗاۖ فَتَرَى ٱلۡقَوۡمَ فِيهَا صَرۡعَىٰ كَأَنَّهُمۡ أَعۡجَازُ نَخۡلٍ خَاوِيَةٖ","5330":"فَهَلۡ تَرَىٰ لَهُم مِّنۢ بَاقِيَةٖ","5423":"قَالَ رَبِّ إِنِّي دَعَوۡتُ قَوۡمِي لَيۡلٗا وَنَهَارٗا","5424":"فَلَمۡ يَزِدۡهُمۡ دُعَآءِيٓ إِلَّا فِرَارٗا","5425":"وَإِنِّي كُلَّمَا دَعَوۡتُهُمۡ لِتَغۡفِرَ لَهُمۡ جَعَلُوٓاْ أَصَٰبِعَهُمۡ فِيٓ ءَاذَانِهِمۡ وَٱسۡتَغۡشَوۡاْ ثِيَابَهُمۡ وَأَصَرُّواْ وَٱسۡتَكۡبَرُواْ ٱسۡتِكۡبَارٗا","5426":"ثُمَّ إِنِّي دَعَوۡتُهُمۡ جِهَارٗا","5427":"ثُمَّ إِنِّيٓ أَعۡلَنتُ لَهُمۡ وَأَسۡرَرۡتُ لَهُمۡ إِسۡرَارٗا","5912":"قُتِلَ أَصۡحَٰبُ ٱلۡأُخۡدُودِ","5913":"ٱلنَّارِ ذَاتِ ٱلۡوَقُودِ","5914":"إِذۡ هُمۡ عَلَيۡهَا قُعُودٞ","5915":"وَهُمۡ عَلَىٰ مَا يَفۡعَلُونَ بِٱلۡمُؤۡمِنِينَ شُهُودٞ","5916":"وَمَا نَقَمُواْ مِنۡهُمۡ إِلَّآ أَن يُؤۡمِنُواْ بِٱللَّهِ ٱلۡعَزِيزِ ٱلۡحَمِيدِ","5917":"ٱلَّذِي لَهُۥ مُلۡكُ ٱلسَّمَٰوَٰتِ وَٱلۡأَرۡضِۚ وَٱللَّهُ عَلَىٰ كُلِّ شَيۡءٖ شَهِيدٌ","5918":"إِنَّ ٱلَّذِينَ فَتَنُواْ ٱلۡمُؤۡمِنِينَ وَٱلۡمُؤۡمِنَٰتِ ثُمَّ لَمۡ يَتُوبُواْ فَلَهُمۡ عَذَابُ جَهَنَّمَ وَلَهُمۡ عَذَابُ ٱلۡحَرِيقِ","5919":"إِنَّ ٱلَّذِينَ ءَامَنُواْ وَعَمِلُواْ ٱلصَّٰلِحَٰتِ لَهُمۡ جَنَّٰتٞ تَجۡرِي مِن تَحۡتِهَا ٱلۡأَنۡهَٰرُۚ ذَٰلِكَ ٱلۡفَوۡزُ ٱلۡكَبِيرُ","5925":"هَلۡ أَتَىٰكَ حَدِيثُ ٱلۡجُنُودِ","5926":"فِرۡعَوۡنَ وَثَمُودَ","5927":"بَلِ ٱلَّذِينَ كَفَرُواْ فِي تَكۡذِيبٖ","5928":"وَٱللَّهُ مِن وَرَآئِهِم مُّحِيطُۢ","5998":"أَلَمۡ تَرَ كَيۡفَ فَعَلَ رَبُّكَ بِعَادٍ","5999":"إِرَمَ ذَاتِ ٱلۡعِمَادِ","6000":"ٱلَّتِي لَمۡ يُخۡلَقۡ مِثۡلُهَا فِي ٱلۡبِلَٰدِ","6053":"كَذَّبَتۡ ثَمُودُ بِطَغۡوَىٰهَآ","6054":"إِذِ ٱنۢبَعَثَ أَشۡقَىٰهَا","6055":"فَقَالَ لَهُمۡ رَسُولُ ٱللَّهِ نَاقَةَ ٱللَّهِ وَسُقۡيَٰهَا","6056":"فَكَذَّبُوهُ فَعَقَرُوهَا فَدَمۡدَمَ عَلَيۡهِمۡ رَبُّهُم بِذَنۢبِهِمۡ فَسَوَّىٰهَا","6057":"وَلَا يَخَافُ عُقۡبَٰهَا","6188":"أَلَمۡ تَرَ كَيۡفَ فَعَلَ رَبُّكَ بِأَصۡحَٰبِ ٱلۡفِيلِ","6189":"أَلَمۡ يَجۡعَلۡ كَيۡدَهُمۡ فِي تَضۡلِيلٖ","6190":"وَأَرۡسَلَ عَلَيۡهِمۡ طَيۡرًا أَبَابِيلَ","6191":"تَرۡمِيهِم بِحِجَارَةٖ مِّن سِجِّيلٖ","6192":"فَجَعَلَهُمۡ كَعَصۡفٖ مَّأۡكُولِۭ","6193":"لِإِيلَٰفِ قُرَيۡشٍ","6194":"إِۦلَٰفِهِمۡ رِحۡلَةَ ٱلشِّتَآءِ وَٱلصَّيۡفِ","6195":"فَلۡيَعۡبُدُواْ رَبَّ هَٰذَا ٱلۡبَيۡتِ","6196":"ٱلَّذِيٓ أَطۡعَمَهُم مِّن جُوعٖ وَءَامَنَهُم مِّنۡ خَوۡفِۭ"},"nay":290};
/* ================= الحضارات المذكورة في القرآن الكريم: قوم نوح، عاد، ثمود، قوم لوط، مدين والأيكة، أصحاب الرس، فرعون ومصر، سبأ، ذو القرنين، أصحاب الأخدود، تُبّع، الروم والفرس، بنو إسرائيل، أصحاب الفيل
   نص الآيات بلفظ مصحف المدينة (مجمع الملك فهد، الإصدار ١٨) وبخطه، والأحاديث مقتطعة بلفظها من الكتب المضمّنة (data/hadith)،
   ونقول المفسرين بلفظها من data/t؛ والبيانات تُبنى بسكربت من هذه المصادر، فلا يُكتب نص منسوب باليد.
   ما يُنسب إلى الآثار والتاريخ يُوسم اجتهاداً غير جازم. */
function hadarat(openId) {
  const D = HADARAT, enOn = LANG !== 'ar', bk = k => (HAD_BOOKS[k] || [k])[0];
  const AR = x => String(x).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  const num = k => LANG === 'ar' ? AR(k) : k;
  const ayLine = i => { const a = Q.ayat[i]; return `<div class="ayah hd-q"><span class="hd-t">${esc(D.ay[i] || ayahText(i))}</span> <span class="num hd-n" data-ayah="${i}" title="${esc(ref(i))}">${AR(a[1])}</span></div>`; };
  const ays = ([s, a, b]) => { const o = [], last = Math.min(b || a, a + 6); for (let q = a; q <= last; q++) { const i = idxOf(s, q); if (i >= 0) o.push(ayLine(i)); } if ((b || a) > last) o.push(`<a class="btn th-more" href="#a${s}-${last + 1}">أكمل الآيات في المصحف</a>`); return o.join(''); };
  const refOf = r => `${refLink(idxOf(r[0], r[1]))}${r[2] ? `<span>–${n(r[2])}</span>` : ''}`;
  const ayCard = it => `<article class="hd-ay"><h3>${it.t}</h3><div class="u-ref">${refOf(it.r)}</div>
    <div class="hd-ays">${ays(it.r)}</div><p class="hd-note"><b class="hd-lbl">وجه العبرة</b> ${esc(it.n)}</p>
    <div class="hd-links"><a class="btn" href="#pa${idxOf(it.r[0], it.r[1])}"><svg><use href="#i-book"/></svg>افتح في المصحف</a>${it.h ? `<a class="btn" href="#hadarat" data-hdh="${it.h}">الحديث بتخريجه</a>` : ''}</div></article>`;
  const hCard = h => `<article class="hd-h" id="hdh-${h.id}"><h3>${h.t}</h3>
    <blockquote class="hd-matn notranslate" translate="no" lang="ar" dir="rtl">${esc(h.x)}</blockquote>
    ${enOn ? `<div class="hd-en"><b>معنى الحديث بالإنجليزية</b><p class="notranslate" translate="no" lang="en" dir="ltr">${esc(h.en)}</p></div>` : ''}
    <p class="hd-tx"><span>رواه</span> ${h.src.map(([b, k]) => `<b>${bk(b)}</b> <span class="num">(${num(k)})</span>`).join(' · ')}</p>
    ${h.gr || h.dg ? `<p class="hd-gr"><span>درجته</span> ${h.gr ? `<em class="hd-badge">${h.gr}</em>` : ''}${h.dg ? `<span class="hd-dg notranslate" translate="no">${esc(h.dg.replace(/[؛\s]+$/, ''))}</span>` : ''}</p>` : ''}
    <div class="th-use"><b>فقه الحديث</b><p>${esc(h.f)}</p></div></article>`;
  const qCard = q => { const b = TF.find(x => x.key === q.bk);
    return `<figure class="qs-quote hd-qt"><blockquote class="notranslate" translate="no" lang="ar" dir="rtl">${esc(q.x)}</blockquote>
    ${enOn ? `<p class="hd-qen notranslate" translate="no" lang="en" dir="ltr">${esc(q.en)}</p>` : ''}
    <figcaption><b>${q.w}</b> · <span>نقل بلفظه من</span> <span>${esc(b ? b.title : q.bk)}</span> · <span>عند تفسير</span> ${refLink(idxOf(q.s, q.ay))}</figcaption>
    <p class="hd-note small">${esc(q.n)}</p></figure>`; };
  const body = c => { const hs = D.h.filter(h => h.ch === c.id), qs = D.q.filter(q => q.ch === c.id);
    return `<div class="hd-grid">${c.ay.map(ayCard).join('')}</div>
      ${hs.length ? `<h3 class="hd-sub"><svg><use href="#i-scroll"/></svg>من السنة الصحيحة</h3><div class="hd-grid">${hs.map(hCard).join('')}</div>` : ''}
      ${qs.length ? `<h3 class="hd-sub"><svg><use href="#i-book"/></svg>من أقوال المفسرين</h3><div class="hd-grid">${qs.map(qCard).join('')}</div>` : ''}`; };
  const civs = `<section class="panel hd-kinds"><h2>الحضارات في لمحة</h2>
    <p class="muted small">لكل حضارة بطاقة: مكانها وزمنها بحسب ما قاله المفسرون، وعاقبتها، والآية الشاهدة. وما لم يبيّنه القرآن تركناه كما ترك.</p>
    <div class="hd-kgrid">${D.k.map((k, i) => { const ix = idxOf(k.r[0], k.r[1]); return `<div class="hd-k hd-k${i % 5 + 1}"><span class="hd-kn">${n(i + 1)}</span><b>${k.t}</b><span class="hd-kl">مكانها وزمنها</span><p class="hd-kd">${esc(k.d)}</p>
      <span class="hd-kl">العاقبة</span><span class="hd-ko">${esc(k.o)}</span><span class="hd-kay"><small>الشاهد</small> ${refLink(ix)}</span><a class="hd-kgo" href="#hadarat-${k.id}" data-hdj="${k.id}">اقرأ الباب</a></div>`; }).join('')}</div></section>`;
  const unc = `<section class="panel hd-unc"><h2>ما يُنسب إلى الآثار والتاريخ: اجتهاد غير جازم</h2>
    <p class="muted small">هذه مسائل يُعرض فيها اجتهاد المؤرخين والآثاريين، ولا يُبنى عليها قطع. المقطوع به هو ما نصّ عليه القرآن والسنة الصحيحة وما نقله المفسرون عن نصوصهما.</p>
    <div class="hd-ugrid">${D.u.map(u => `<div class="hd-u"><em class="hd-ub">اجتهاد غير جازم</em><b>${u.t}</b><p>${esc(u.n)}</p></div>`).join('')}</div></section>`;
  const relDefs = [['rusul', 'الأنبياء والمرسلون', 'i-user'], ['timeline', 'الخط الزمني', 'i-time'], ['map', 'أطلس القرآن', 'i-map'], ['awwalin', 'أخبار الأولين والآخرين', 'i-scroll'], ['topics', 'الموسوعة الموضوعية', 'i-grid'], ['tawhid', 'التوحيد في القرآن الكريم', 'i-tawhid']];
  const rels = relDefs.filter(([v]) => views[v]);
  V(`<div class="stack ulum hd">
    <section class="u-hero hd-hero"><span class="eyebrow">اكتشف وتأمّل</span><h1>الحضارات المذكورة في القرآن الكريم</h1>
      <p class="lead">كيف بنى الأقوام الأولون حضاراتهم، وكيف زالت؟ عاد وثمود وقوم نوح ولوط ومدين وفرعون وسبأ وذو القرنين وأصحاب الأخدود وتُبّع والروم والفرس وبنو إسرائيل: أماكنهم وأزمانهم بحسب المفسرين، وعمرانهم، وسبب هلاكهم أو زوالهم، ودروسهم، مع الآيات بخط المصحف وأقوال المفسرين بلفظها والأحاديث المخرّجة، وما نُسب إلى الآثار والتاريخ موسوم بأنه اجتهاد غير جازم.</p>
      <div class="hd-stats"><span><b class="num">${n(D.k.length)}</b> <span>حضارة</span></span><span><b class="num">${n(D.nay)}</b> <span>آية</span></span><span><b class="num">${n(D.h.length)}</b> <span>حديثاً</span></span><span><b class="num">${n(D.q.length)}</b> <span>نقلاً</span></span></div></section>
    ${civs}
    <nav class="panel u-index" aria-label="الفهرس"><h2>الفهرس</h2><ol>${D.ch.map((c, i) => `<li><a href="#hadarat-${c.id}" data-hdj="${c.id}"><span class="u-n">${n(i + 1)}</span>${c.t}</a></li>`).join('')}</ol></nav>
    ${D.ch.map((c, i) => `<details class="u-ch panel hd-ch" id="hd-${c.id}"${i === 0 ? ' open' : ''}><summary><span class="u-n">${n(i + 1)}</span><span class="u-t">${c.t}</span></summary>
      <div class="u-body stack tight"><p class="u-intro">${esc(c.d)}</p>${body(c)}</div></details>`).join('')}
    ${unc}
    ${rels.length ? `<section class="panel"><h2>اربط بما حولك</h2><div class="hd-rel">${rels.map(([v, l, ic]) => `<a class="btn" href="#${v}"><svg><use href="#${ic}"/></svg>${l}</a>`).join('')}</div></section>` : ''}
    <p class="muted small">نصوص الآيات بلفظ مصحف المدينة النبوية (مجمع الملك فهد، الإصدار ١٨) وبخطه، ونصوص الأحاديث من الكتب المضمّنة بترقيمها وبدرجتها حيث ورد، ونقول المفسرين بلفظها من كتبهم المضمّنة في مشكاة (السعدي، وابن كثير)؛ أما التمهيدات ووجوه العبرة فصياغة موجزة. وما نُسب إلى الآثار والتاريخ موسوم بأنه اجتهاد غير جازم.</p>
  </div>`);
  const go = el => { if (!el) return; const d = el.closest('details'); if (d) d.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $$('[data-hdj]').forEach(a => a.onclick = e => { e.preventDefault(); history.replaceState(null, '', '#hadarat-' + a.dataset.hdj); go($('#hd-' + a.dataset.hdj)); });
  $$('[data-hdh]').forEach(a => a.onclick = e => { e.preventDefault(); go($('#hdh-' + a.dataset.hdh)); });
  if (openId) setTimeout(() => go($('#hd-' + openId)), 30);
}
views.hadarat = () => hadarat();
function excerpt(text, rts, ayahWords, max = 650) { // the sentences of a long commentary that speak to the topic or to this ayah; chains of narration and verse are left out
  const res = rts.map(x => x instanceof RegExp ? x : rootRx(x));
  const sents = String(text).replace(/\[\[[^\]]*\]\]/g, '').split(/(?<=[.؟!:])\s+|\n+/).map(s => s.trim()).filter(s => s.length > 12);
  const sc = sents.map(s => { const nn = ' ' + norm(s).replace(/[^ء-ي ]/g, ' ').replace(/\s+/g, ' ') + ' '; let v = 0;
    res.forEach(re => v += 3 * hits(nn, re)); ayahWords.forEach(w => { if (nn.includes(' ' + w)) v += .5; });
    if (ISNAD.test(nn)) v -= 8; if (/\.\.\.|…/.test(s) && s.length < 160) v -= 4; return v; });
  const order = sc.map((v, i) => [v, i]).filter(([v]) => v >= 1).sort((a, b) => b[0] - a[0]); const pick = []; let len = 0;
  for (const [, i] of order) { const L = Math.min(sents[i].length, max); if (pick.length && len + L > max) continue; pick.push(i); len += L; if (len >= max * .8) break; }
  if (!pick.length) return null; pick.sort((a, b) => a - b);
  let out = '', prev = -9; for (const i of pick) { let s = sents[i]; if (s.length > max) { const m = res.map(re => { re.lastIndex = 0; const x = re.exec(' ' + norm(s)); return x ? x.index : -1; }).filter(x => x >= 0)[0] || 0; const st = Math.max(0, Math.round(m * s.length / Math.max(1, norm(s).length)) - 200); s = (st ? '… ' : '') + cut(s.slice(st).replace(/^\S*\s/, st ? '' : ''), max); }
    out += (out ? (i === prev + 1 ? ' ' : ' … ') : '') + s; prev = i; }
  return (pick[0] > 0 ? '… ' : '') + out + (pick[pick.length - 1] < sents.length - 1 && !out.endsWith('…') ? ' …' : '');
}
function saadiPart(t, a) { // السعدي يقسّم تفسيره بأرقام الآيات: {29} أو {28 ـ 29}
  const re = /\{(\d+)(?:\s*[ـ-]\s*(\d+))?\}/g; let m, cuts = []; while ((m = re.exec(t))) cuts.push([m.index, +m[1], +(m[2] || m[1])]);
  if (!cuts.length) return t; const k = cuts.findIndex(([, s, e]) => a >= s && a <= e); if (k < 0) return null;
  return t.slice(cuts[k][0], k + 1 < cuts.length ? cuts[k + 1][0] : undefined).trim();
}
const times = k => countOf(k, 'مرة واحدة', 'مرتين', 'مرات', 'مرة');
const mkMd = (a, b) => [a && countOf(a, 'واحدة مكية', 'اثنتان مكيتان', 'مكية', 'مكية'), b && countOf(b, 'واحدة مدنية', 'اثنتان مدنيتان', 'مدنية', 'مدنية')].filter(Boolean).join(' و');
const countOf = (k, one, two, few, many) => k === 1 ? one : k === 2 ? two : k <= 10 ? `${n(k)} ${few}` : `${n(k)} ${many}`;
const QNAMES = [ // أسماء القرآن وصفاته الواردة فيه، على ما ذكره السيوطي في «الإتقان» (النوع السابع عشر)
  ['القرآن', 2, 185], ['الكتاب', 2, 2], ['الفرقان', 25, 1], ['الذكر', 15, 9], ['التنزيل', 26, 192], ['النور', 4, 174], ['البرهان', 4, 174], ['الموعظة والشفاء والهدى والرحمة', 10, 57], ['الروح', 42, 52],
  ['الحكيم', 36, 2], ['المجيد', 50, 1], ['الكريم', 56, 77], ['العزيز', 41, 41], ['المبين', 12, 1], ['المبارك', 38, 29], ['أحسن الحديث', 39, 23], ['القول الفصل', 86, 13], ['العظيم', 15, 87], ['المهيمن', 5, 48], ['البشير والنذير', 41, 4], ['حبل الله', 3, 103],
];
const fmtDate = d => new Intl.DateTimeFormat(LANG === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
const cut = (t, m) => t.length > m ? t.slice(0, m).replace(/\s+\S*$/, '') + '…' : t;
function saveFile(name, blob) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
let pendingResearch = null;
function research(pre, mineOnly) {
  if (!pre && pendingResearch) { pre = pendingResearch; pendingResearch = null; }
  const EX = ['اسم الله الأعظم من الكتاب والسنة', 'أسماء القرآن وصفاته', 'الصبر', 'الرحمة', 'بر الوالدين', 'العلم والعلماء', 'الماء', 'التوبة والاستغفار', 'العدل'];
  const mine = ST.research || [];
  if (mineOnly) { V(`<div class="stack" style="max-width:1000px"><div><div class="eyebrow">${LAB ? BRAND : 'مختبر الأبحاث'}</div><h1>أبحاثي</h1><p class="lead">${SESSION ? `أبحاث محفوظة في حساب «${esc(SESSION.name)}» على هذا الجهاز.` : 'أبحاث محفوظة على هذا الجهاز. ادخل إلى حسابك لتُحفظ باسمك.'} افتح أي بحث لإعادة إعداده من المصادر.</p></div>
    ${mine.length ? `<section class="panel stack tight"><div class="list">${mine.map((r, k) => `<a class="row" data-rk="${k}"><span class="t">${esc(r.q)} <span class="muted small">· ${fmtDate(new Date(r.at))}</span></span><span class="n"><button class="btn" data-rdel="${k}" type="button">حذف</button></span></a>`).join('')}</div></section>` : '<p class="note">لا توجد أبحاث محفوظة بعد. أعدّ بحثاً ثم اضغط «حفظ في أبحاثي».</p>'}<div><a class="btn pri" href="#research">بحث جديد</a></div></div>`);
    $$('[data-rk]').forEach(a => a.onclick = e => { const del = e.target.closest('[data-rdel]'); const r = mine[+a.dataset.rk];
      if (del) { e.stopPropagation(); ST.research.splice(+del.dataset.rdel, 1); save(); research(null, true); return; } pendingResearch = r; if (location.hash === '#research') research(); else location.hash = 'research'; });
    return; }
  V(`<div class="stack" style="max-width:1000px"><div class="no-print"><div class="eyebrow">${LAB ? 'تأصيل علمي بالقرآن والسنة' : 'تحليل'}</div><h1>${LAB ? BRAND : 'مختبر الأبحاث'}</h1>
  <p class="lead">اكتب موضوع بحثك عن القرآن أو ألفاظه أو صفاته، أو عن مسألة من مسائل الكتاب والسنة. فيحصي المختبر ألفاظها وجذورها في المصحف كله، ويجمع الآيات، وأقوال المفسرين بنصها، والأحاديث من الكتب الستة مخرّجةً بأرقامها وأحكام العلماء عليها. ثم يُخرج ذلك بحثاً موثّقاً تطبعه أو تنزّله. كل ذلك على جهازك دون إنترنت.</p></div>
  <form class="panel stack tight no-print" id="rform">
    <label for="rq"><b>موضوع البحث</b></label><input class="field" id="rq" required placeholder="مثال: الصبر في القرآن، أو كلمة «الرحمة»، أو أسماء القرآن وصفاته" value="${esc(pre?.q || '')}">
    <div class="suggest" id="rsug">${EX.map(x => `<button type="button" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    <div class="toolbar"><label>عدد الآيات <select id="rn">${[10, 20, 40].map(k => `<option ${k === (pre?.n || 20) ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label>آيات تُنقل فيها أقوال المفسرين <select id="rk">${[3, 5, 8].map(k => `<option ${k === (pre?.k || 5) ? 'selected' : ''}>${k}</option>`).join('')}</select></label>
      <label>عدد الأحاديث <select id="rh">${[0, 5, 10, 20, 30].map(k => `<option value="${k}" ${k === (pre?.h ?? 10) ? 'selected' : ''}>${k || 'دون أحاديث'}</option>`).join('')}</select></label></div>
    <div class="toolbar"><label class="chip"><input type="checkbox" id="rsun" ${pre?.sunan === false ? '' : 'checked'}> السنن الأربعة مع أحكام العلماء</label><label class="chip"><input type="checkbox" id="rscan" ${pre?.scan === false ? '' : 'checked'}> البحث في نصوص التفاسير كاملة لجمع أقوال العلماء</label></div>
    <fieldset class="toolbar" style="border:0;padding:0;margin:0"><legend class="small muted" style="padding:0">التفاسير المعتمدة في البحث</legend>${TF.filter(b => b.key !== 'gharib').map(b => `<label class="chip"><input type="checkbox" name="rtf" value="${b.key}" ${(pre?.tf || ['muyassar', 'saadi', 'ibnkathir', 'qurtubi']).includes(b.key) ? 'checked' : ''}> ${b.title}</label>`).join('')}</fieldset>
    <div class="toolbar"><button class="btn pri" id="rgo"><svg><use href="#i-flask"/></svg>إعداد البحث</button><span class="small muted" id="rstat"></span></div></form>
  ${mine.length ? `<section class="panel stack tight no-print"><h3>أبحاثي المحفوظة</h3><div class="list">${mine.map((r, k) => `<a class="row" data-rk="${k}"><span class="t">${esc(r.q)} <span class="muted small">· ${fmtDate(new Date(r.at))}</span></span><span class="n"><button class="btn" data-rdel="${k}" type="button">حذف</button></span></a>`).join('')}</div></section>` : ''}
  <article id="rdoc" class="rdoc"></article></div>`);
  $('#rsug').onclick = e => { const b = e.target.closest('button'); if (!b) return; $('#rq').value = b.dataset.q; $('#rform').requestSubmit(); };
  const list = $$('[data-rk]'); list.forEach(a => a.onclick = e => { const del = e.target.closest('[data-rdel]'); const r = mine[+a.dataset.rk];
    if (del) { e.stopPropagation(); ST.research.splice(+del.dataset.rdel, 1); save(); research(); return; } research(r); });
  $('#rform').onsubmit = e => { e.preventDefault(); const o = { q: $('#rq').value.trim(), n: +$('#rn').value, k: +$('#rk').value, h: +$('#rh').value, tf: $$('input[name=rtf]:checked').map(x => x.value), sunan: $('#rsun').checked, scan: $('#rscan').checked }; if (o.q) buildResearch(o); };
  if (pre?.q) buildResearch(pre);
}
async function buildResearch(o) {
  const st = t => { const el = $('#rstat'); if (el) el.textContent = t; }; $('#rgo').disabled = true;
  try {
    const qn = norm(o.q), qc = topicCore(o.q), qnames = /قران|كتاب/.test(qc) && /اسم|صف|سماء/.test(qc);
    st('جارٍ تحديد ألفاظ الموضوع وجذوره…'); await buildSearchIndex();
    const core = topicCore(o.q), prx = qnames ? null : phraseRx(o.q);
    const rts = qnames ? topicRoots('قرءانا الكتاب الذكر الفرقان') : topicRoots(core);
    const r = await smartSearch(qnames ? 'القرآن الكتاب المبين الذكر الفرقان التنزيل' : core, 400);
    const top = r.ids.length ? r.score[r.ids[0]] : 1;
    /* أ: الآيات التي ورد فيها لفظ الموضوع نفسه (من جذوره)؛ ب: آيات تدل على المعنى دون اللفظ، وشاهدها من التفسير الميسر */
    const rootWords = new Set(), inAyah = new Map();
    rts.forEach(ri => unitWords(ri).forEach(w => { rootWords.add(w); const i = W.a[w]; (inAyah.get(i) || inAyah.set(i, new Set()).get(i)).add(ri); }));
    const inPh = i => prx ? (' ' + Q.ayat[i][4] + ' ').search(prx) >= 0 : false;
    const explicitAll = [...inAyah.keys()].sort((a, b) => inPh(b) - inPh(a) || inAyah.get(b).size - inAyah.get(a).size || r.score[b] - r.score[a] || a - b);
    const allRoots = rts.length > 1 ? explicitAll.filter(i => inAyah.get(i).size === rts.length).length : explicitAll.length;
    const explicit = explicitAll.slice(0, o.n);
    const meaning = r.ids.filter(i => !inAyah.has(i) && r.score[i] >= top * .35).slice(0, Math.max(5, Math.round(o.n / 2)));
    const mk = explicitAll.filter(i => Q.surahs[Q.ayat[i][0]-1].type === 'مكية').length;
    let had = null; if (o.h) { st('جارٍ البحث في متون كتب السنة…'); try { had = await hadithSearch(qnames ? topicRoots('قرءانا') : rts, o.h, qnames ? 'القرآن' : core, o.sunan === false ? SAHIHAIN : [...SAHIHAIN, ...SUNAN], prx); } catch (e) { console.error(e); had = /fetch|load|network|HTTP|Failed/i.test(e.message) ? 'err' : 'bug'; } }
    const hl = had && had.list ? had.list : [];
    const scanKeys = ['ibnkathir', 'qurtubi', 'tabari', 'baghawi', 'saadi'].filter(k => o.tf.includes(k));
    const says = prx && o.scan !== false && scanKeys.length ? await scholarsSay(prx, scanKeys, st) : [];
    const cited = citedAyat([...hl.filter(x => x[3]).map(x => x[2].t), ...says.map(x => x.c)]).filter(i => !inAyah.has(i)).slice(0, 8);
    /* المفسرون: على الآيات التي نصّت عليها الأحاديث، ثم التي فيها اللفظ */
    const tfUsed = TF.filter(b => o.tf.includes(b.key) && b.key !== 'gharib'), tq = [], seenPassage = new Set();
    for (const i of [...new Set([...cited, ...explicit, ...meaning])].slice(0, o.k)) { const a = Q.ayat[i]; st(`جارٍ استخراج أقوال المفسرين في ${ref(i)}…`);
      const aw = tokens(a[4]).filter(t => t.length > 2);
      const parts = await Promise.all(tfUsed.map(b => tafsir(b.key, a[0]).then(t => {
        let x = t[a[1]]; if (!x) return null;
        if (b.key === 'saadi') { x = saadiPart(x, a[1]); if (x) x = x.replace(/\*\s*\*\s*\*/g, ' ').replace(/\s*\n\s*/g, ' '); }
        else if (!['muyassar', 'jalalayn'].includes(b.key)) { const sig = b.key + norm(x).slice(0, 80); const again = seenPassage.has(sig); seenPassage.add(sig); x = excerpt(x, prx ? [...rts, prx] : rts, aw, again ? 450 : 650); }
        return x ? [b, cut(x.trim(), 900)] : null; }).catch(() => null)));
      tq.push([i, parts.filter(Boolean)]); }
    /* معاني الألفاظ من «الميسر في غريب القرآن» */
    const gloss = new Map();
    if (rts.length) { st('جارٍ جمع معاني الألفاظ…'); for (const i of explicitAll.slice(0, 40)) { const a = Q.ayat[i]; let g; try { g = (await tafsir('gharib', a[0]))[a[1]]; } catch (e) { break; } if (!g) continue;
      for (const m of g.matchAll(/﴿([^﴾]+)﴾\s*:\s*([^\n]+)/g)) { const w = ' ' + norm(m[1]).replace(/[^ء-ي ]/g, ' ') + ' '; if (!rts.some(ri => w.search(rootRx(ri)) >= 0)) continue; const k = norm(m[1]).replace(/[^ء-ي]/g, ''); if (!gloss.has(k)) gloss.set(k, [m[1], m[2].trim(), i]); if (gloss.size >= 12) break; } if (gloss.size >= 12) break; } }
    const qt = qn.split(/\s+/).filter(w => w.length > 2 && !STOP.has(w) && !FRAME.has(w)); const topicsHit = [];
    for (const c of T) for (const it of c.items) { const hay = norm(it.n + ' ' + (it.d || '')); const sc = qt.filter(w => hay.includes(w.replace(/^ال/, ''))).length; if (sc) topicsHit.push([sc, c, it]); }
    topicsHit.sort((a, b) => b[0] - a[0]);
    const usedTf = new Set(); tq.forEach(([, ps]) => ps.forEach(([b]) => usedTf.add(b.key))); says.forEach(x => usedTf.add(x.b.key)); if (gloss.size) usedTf.add('gharib');
    let sec = 0; const H = t => `<h2>${['المبحث الأول', 'المبحث الثاني', 'المبحث الثالث', 'المبحث الرابع', 'المبحث الخامس', 'المبحث السادس', 'المبحث السابع'][sec++]}: ${t}</h2>`;
    const rootRows = rts.map(ri => { const ws = unitWords(ri); const ay = new Set(ws.map(w => W.a[w])); const mkc = [...ay].filter(i => Q.surahs[Q.ayat[i][0]-1].type === 'مكية').length;
      const forms = new Map(); ws.forEach(w => { const l = W.lemmas[W.w[w][1]][0]; forms.set(l, (forms.get(l) || 0) + 1); });
      return { ri, n: ws.length, ay: ay.size, mkc, top: topSurahs(ws).slice(0, 3), forms: [...forms].sort((a, b) => b[1] - a[1]) }; });
    const facts = [];
    rootRows.forEach(x => facts.push(`${typeof x.ri === 'number' ? `وردت مادة الجذر «${rootFmt(W.roots[x.ri][0])}»` : `ورد لفظ «${esc(unitLabel(x.ri))}» (من جذر ${rootFmt(W.roots[unitRoot(x.ri)][0])})`} ${times(x.n)} في ${countOf(x.ay, 'آية واحدة', 'آيتين', 'آيات', 'آية')}: ${mkMd(x.mkc, x.ay - x.mkc)}، ${x.forms.length === 1 ? `وجاء بصيغة واحدة هي «${esc(x.forms[0][0])}»` : `وجاءت في ${countOf(x.forms.length, 'صيغة واحدة', 'صيغتين', 'صيغ', 'صيغة')}، أكثرها «${esc(x.forms[0][0])}» (${times(x.forms[0][1])})`}، وأكثر وروده في سور: ${x.top.join('، ')}.`));
    if (rts.length > 1) facts.push(`اجتمعت ألفاظ الموضوع كلها في ${countOf(allRoots, 'آية واحدة', 'آيتين', 'آيات', 'آية')}.`);
    if (meaning.length) facts.push(`ودلّت على المعنى دون اللفظ آيات أخرى، أقربها: ${meaning.slice(0, 3).map(ref).join('، ')}.`);
    if (cited.length) facts.push(`نصّت الأحاديث وأقوال المفسرين على ${countOf(cited.length, 'آية واحدة', 'آيتين', 'آيات', 'آية')} في الموضوع: ${cited.map(ref).join('، ')}.`);
    if (says.length) facts.push(`تناوله من المفسرين: ${[...new Set(says.map(x => x.b.author))].join('، ')}، ونُقلت أقوالهم بنصها في المبحث الخاص بها.`);
    if (hl.length) facts.push(`ووردت ${had.strong ? 'عبارة الموضوع' : 'ألفاظ الموضوع'} في ${countOf(had.total, 'حديث واحد', 'حديثين', 'أحاديث', 'حديثاً')} من كتب السنة المختارة بعد جمع رواياته، أقربها إلى الموضوع ما رواه ${hl[0][4].map(m => `${HAD_SHORT[m.k]} (${hadNum(m.h.l)})`).join(' و')}.`);
    const now = new Date(), ayLi = (i, why) => `<li><div class="ayah">${ayahHTML(i, rootWords, false).replace(/^<div class="ayah">|<\/div>$/g, '')}</div><div class="small"><a data-ayah="${i}">﴿${esc(ref(i))}﴾</a> <span class="chip">${Q.surahs[Q.ayat[i][0]-1].type}</span>${why || ''}</div></li>`;
    $('#rdoc').innerHTML = `<header class="rhead"><div class="eyebrow">بحث علمي · ${LAB ? 'مختبر الأبحاث القرآنية' : 'مشكاة: موسوعة القرآن الذكية'}</div><h1>${esc(o.q)}</h1>
      <p class="muted small" style="margin:0">إعداد: ${esc(SESSION?.name || 'زائر')} · التاريخ: ${fmtDate(now)} · كل نص منقول بلفظه من مصدره، وموضعه مذكور معه</p></header>
    <section><h2>المقدمة</h2><p>يتناول هذا البحث موضوع «${esc(core)}» في القرآن الكريم والسنة النبوية${rts.length ? `، انطلاقاً من ${rts.length > 1 ? 'ألفاظه' : 'لفظه'} في اللغة: ${rts.map(ri => '«' + unitLabel(ri) + '»' + (typeof ri === 'number' ? '' : ` (من جذر ${rootFmt(W.roots[unitRoot(ri)][0])})`)).join(' و')}` : ''}. فيحصي مواضع ورود اللفظ في المصحف كلها، ويبيّن صيغه ومعانيه، ثم يورد الآيات التي دلّت على المعنى دون اللفظ، وأقوال المفسرين والعلماء فيها، وما جاء في الموضوع من أحاديث الكتب الستة بأحكامها.</p>
      <p>ومنهجه النقل بالنص لا بالمعنى: الآيات من مصحف المدينة النبوية برواية حفص عن عاصم، والإحصاء من مدونة القرآن العربية، والتفسير من ${tfUsed.map(b => '«' + b.title + '»').join(' و')}${says.length ? '، مع البحث في نصوصها كاملة عن أقوال العلماء' : ''}${gloss.size ? '، ومعاني المفردات من «الميسر في غريب القرآن»' : ''}${hl.length ? (o.sunan === false ? '، والأحاديث من متون صحيحي البخاري ومسلم' : '، والأحاديث من متون الكتب الستة مع أحكام العلماء عليها') : ''}. ويُذكر مع كل نقل موضعه ليرجع إليه القارئ.</p></section>
    ${rootRows.length ? `<section>${H('الألفاظ والجذور')}<div class="tablebox"><table class="wtable"><thead><tr><th>الجذر</th><th>مرات الورود</th><th>عدد الآيات</th><th>مكي / مدني</th><th>أكثر السور</th><th>صيغه في القرآن</th></tr></thead><tbody>${rootRows.map(x => `<tr><td><a href="#root${unitRoot(x.ri)}"><b>${rootFmt(W.roots[unitRoot(x.ri)][0])}</b></a>${typeof x.ri === 'number' ? '' : `<div class="small muted">صيغة «${esc(unitLabel(x.ri))}» وحدها</div>`}</td><td>${n(x.n)}</td><td>${n(x.ay)}</td><td>${n(x.mkc)} / ${n(x.ay - x.mkc)}</td><td>${x.top.join('، ')}</td><td>${x.forms.slice(0, 8).map(([l, c]) => `${esc(l)} (${n(c)})`).join('، ')}${x.forms.length > 8 ? '…' : ''}</td></tr>`).join('')}</tbody></table></div>
      <p class="muted small">المصدر: إحصاء التطبيق على مدونة القرآن العربية (Quranic Arabic Corpus، جامعة ليدز)، والعدّ بحسب تقسيمها للكلمات.</p>
      ${gloss.size ? `<h3>معاني الألفاظ في سياقها</h3><div class="tablebox"><table class="wtable"><thead><tr><th>اللفظ</th><th>معناه</th><th>الموضع</th></tr></thead><tbody>${[...gloss.values()].map(([w, m, i]) => `<tr><td class="ayah" style="font-size:1.15rem">${esc(w)}</td><td>${esc(m)}</td><td>${refLink(i)}</td></tr>`).join('')}</tbody></table></div><p class="muted small">المصدر: «الميسر في غريب القرآن»، مجمع الملك فهد لطباعة المصحف الشريف.</p>` : ''}</section>` : ''}
    ${qnames ? `<section>${H('أسماء القرآن وصفاته')}<p>ذكر السيوطي في «الإتقان في علوم القرآن» (النوع السابع عشر) أن الله سمّى كتابه بخمسة وخمسين اسماً. ومن أشهرها، مع آية وروده:</p>
      <div class="tablebox"><table class="wtable"><thead><tr><th>الاسم أو الصفة</th><th>الآية</th><th>الموضع</th></tr></thead><tbody>${QNAMES.map(([nm, s, a]) => { const i = idxOf(s, a); return `<tr><td><b>${nm}</b></td><td class="ayah" style="font-size:1.15rem">${esc(ayahText(i))}</td><td>${refLink(i)}</td></tr>`; }).join('')}</tbody></table></div></section>` : ''}
    ${explicit.length || meaning.length || cited.length ? `<section>${H('الآيات القرآنية')}
      ${cited.length ? `<h3>آيات نصّت عليها الأحاديث وأقوال المفسرين في الموضوع</h3><p>وردت هذه الآيات بنصها في الأحاديث وأقوال العلماء المنقولة في هذا البحث:</p><ol class="rlist">${cited.map(i => ayLi(i)).join('')}</ol>` : ''}
      ${explicit.length ? `<h3>أولاً: مواضع ورود اللفظ ومشتقاته</h3><p>وردت ألفاظ الموضوع ومشتقاتها في ${countOf(explicitAll.length, 'آية واحدة', 'آيتين', 'آيات', 'آية')}: ${mkMd(mk, explicitAll.length - mk)}${rts.length > 1 ? `، اجتمعت الألفاظ كلها في ${countOf(allRoots, 'آية واحدة', 'آيتين', 'آيات', 'آية')} منها` : ''}. ${explicitAll.length > explicit.length ? `وهذه ${countOf(explicit.length, 'آية', 'آيتان', 'آيات', 'آية')} منها مرتبة بحسب صلتها بالموضوع، والباقي في صفحة الجذر.` : 'وهذه جميعها:'} واللفظ مظلل في كل آية.</p>
        <ol class="rlist">${explicit.map(i => ayLi(i)).join('')}</ol>` : ''}
      ${meaning.length ? `<h3>${explicit.length ? 'ثانياً: ' : ''}آيات تدل على المعنى دون اللفظ</h3><p>هذه آيات لم يرد فيها اللفظ نفسه، ودلّ عليها التفسير الميسر بمعنى الموضوع، وشاهد ذلك تحت كل آية:</p>
        <ol class="rlist">${meaning.map(i => ayLi(i, `<blockquote class="rq"><p>${snippet(cut((r.mu[Q.ayat[i][0]] || {})[Q.ayat[i][1]] || '', 320), r.terms)}</p><cite>التفسير الميسر، ${esc(ref(i))}.</cite></blockquote>`)).join('')}</ol>` : ''}</section>` : '<p class="note">لم يرد هذا اللفظ في القرآن، ولم توجد آيات تدل على معناه. جرّب كلمة مرادفة أو الصيغة المفردة من الكلمة.</p>'}
    ${tq.length ? `<section>${H('أقوال المفسرين')}<p class="muted small">نُقلت من كل تفسير الجملُ التي تتناول الآية والموضوع بلفظها، وحُذفت الأسانيد والشواهد الشعرية، وتشير علامة (…) إلى موضع الحذف.</p>${tq.map(([i, ps]) => `<h3>${esc(ref(i))}: <span class="ayah" style="font-size:1.1rem">${esc(cut(ayahText(i), 160))}</span></h3>${ps.map(([b, t]) => `<blockquote class="rq"><p>${markWords(t, prx ? [...rts, prx] : rts)}</p><cite>${b.title}، ${b.author}، تفسير ${esc(ref(i))}.</cite></blockquote>`).join('') || '<p class="muted">لم تتناول التفاسير المختارة هذا الموضوع في هذه الآية بنص صريح.</p>'}`).join('')}</section>` : ''}
    ${says.length ? `<section>${H('أقوال العلماء في المسألة')}<p>هذه المواضع التي ذُكر فيها «${esc(core)}» بلفظه أو قريب منه في نصوص التفاسير المختارة كاملة، منقولة بنصها مع موضعها:</p>${says.map(x => `<blockquote class="rq"><p>${markWords(x.t, [prx])}</p><cite>${x.b.title}، ${x.b.author}، عند تفسير ${refLink(idxOf(x.s, x.a))}.</cite></blockquote>`).join('')}</section>` : ''}
    ${had === 'bug' ? '<p class="note">تعذّر البحث في كتب السنة لهذا الموضوع بسبب خطأ داخلي. أعد المحاولة، وإن تكرر فأبلغ الإدارة.</p>' : had === 'err' ? '<p class="note">تعذّر تحميل كتب الحديث. افتح الصفحة مع الاتصال مرة واحدة، أو نزّل البيانات من «الإعدادات».</p>' : hl.length ? `<section>${H('السنة النبوية')}<p>${had.strong ? `ورد الموضوع بلفظه «${esc(core)}» أو قريب منه` : 'وردت ألفاظ الموضوع'} في ${countOf(had.total, 'حديث واحد', 'حديثين', 'أحاديث', 'حديثاً')} من ${o.sunan === false ? 'صحيحي البخاري ومسلم' : 'الكتب الستة: الصحيحين والسنن الأربعة'}، جُمعت روايات كل حديث في مدخل واحد مع تخريجه. ويُذكر مع كل حديث حكمه: أحاديث الصحيحين صحيحة عند جمهور المحدثين، وأحاديث السنن بأحكام العلماء المنقولة في مصدر البيانات. وهذه ${countOf(hl.length, 'أقربها', 'أقرب حديثين', 'أحاديث هي الأقرب', 'حديثاً هي الأقرب')}، بنص المتن، واللفظ مظلل:</p>${hl.map(([, k, h, , mem]) => `<blockquote class="rq"><p>${hadithShow(h, had.rx)}</p><cite><b>التخريج:</b> ${mem.map(m => `${HAD_SHORT[m.k]} (${hadNum(m.h.l)})`).join('، ')}.<br><b>الحكم:</b> ${mem.map(m => `${HAD_SHORT[m.k]} ${hadNum(m.h.l)}: ${gradeOf(m.k, m.h)}`).join(' | ')}.</cite></blockquote>`).join('')}
      <p class="muted small">الترقيم: ${[...new Set(hl.flatMap(x => x[4].map(m => m.k)))].map(k => `${HAD_BOOKS[k][0]} (${HAD_BOOKS[k][1]})`).join('، ')}.</p></section>` : (o.h && had ? '<p class="note">لم ترد ألفاظ هذا الموضوع في متون كتب السنة المختارة.</p>' : '')}
    ${topicsHit.length ? `<section>${H('المداخل الموضوعية')}<div class="list">${topicsHit.slice(0, 10).map(([, c, it]) => `<a class="row" data-open="${c.id}|${esc(it.n)}"><span class="t"><b>${esc(it.n)}</b> <span class="muted small">· ${esc(c.title)}${it.d ? ' · ' + esc(it.d) : ''}</span></span><span class="n">${countOf(itemAyat(it).length, 'آية واحدة', 'آيتان', 'آيات', 'آية')}</span></a>`).join('')}</div><p class="muted small">مصادر المداخل: ${[...new Set(topicsHit.slice(0, 10).map(([, c]) => c.src).filter(Boolean))].map(esc).join(' ')}</p></section>` : ''}
    <section><h2>الخلاصة</h2><ul>${facts.map(f => `<li>${f}</li>`).join('')}</ul></section>
    <section><h2>المراجع</h2><ol class="small">
      <li>القرآن الكريم، مصحف المدينة النبوية برواية حفص عن عاصم، مجمع الملك فهد لطباعة المصحف الشريف.</li>
      <li>Quranic Arabic Corpus (مدونة القرآن العربية)، جامعة ليدز، الإصدار ٠٫٤.</li>
      ${TF.filter(b => usedTf.has(b.key)).map(b => `<li>${b.title}، ${b.author}.</li>`).join('')}
      ${hl.length ? [...new Set(hl.flatMap(x => x[4].map(m => m.k)))].map(k => `<li>${HAD_BOOKS[k][0]} (${HAD_BOOKS[k][1]}).</li>`).join('') : ''}
      ${hl.some(x => x[4].some(m => !HAD_BOOKS[m.k][2])) ? '<li>أحكام الأحاديث: محمد ناصر الدين الألباني (صحيح السنن وضعيفها)، وشعيب الأرنؤوط، وأحمد شاكر، وبشار عواد معروف وغيرهم، كما نقلها مشروع Hadith API المفتوح.</li>' : ''}
      ${qnames ? '<li>جلال الدين السيوطي، «الإتقان في علوم القرآن»، النوع السابع عشر: في معرفة أسمائه وأسماء سوره.</li>' : ''}
      ${[...new Set(topicsHit.slice(0, 10).map(([, c]) => c.src).filter(Boolean))].map(s => `<li>${esc(s)}</li>`).join('')}</ol>
      <p class="note small">جُمعت مادة هذا البحث من نصوص المصادر المذكورة بلفظها، دون صياغة أو توليد. ويبقى ترتيب الأدلة والترجيح والاستنباط عمل الباحث، ويُرجع في الأحكام إلى أهل العلم.</p></section>
    <div class="toolbar no-print"><button class="btn pri" id="rprint">طباعة أو حفظ PDF</button><button class="btn" id="rdl">تنزيل البحث (HTML)</button><button class="btn" id="rcopy">نسخ النص</button><button class="btn" id="rsave">حفظ في أبحاثي</button></div>`;
    $('#rprint').onclick = () => window.print();
    $('#rcopy').onclick = () => copyText($('#rdoc').innerText.replace(/\n{3,}/g, '\n\n'));
    $('#rdl').onclick = () => { const doc = $('#rdoc').cloneNode(true); doc.querySelectorAll('.no-print').forEach(x => x.remove());
      const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.q)} · ${LAB ? 'مختبر الأبحاث القرآنية' : 'بحث من مشكاة'}</title><style>body{font-family:"Readex Pro","Segoe UI",Tahoma,sans-serif;max-width:860px;margin:32px auto;padding:0 16px;line-height:1.9;color:#1b2340}h1,h2,h3{color:#1b2559}.ayah{font-family:"Amiri Quran","Amiri","Traditional Arabic",serif;font-size:1.35rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #d9dceb;padding:6px 8px;vertical-align:top}blockquote{border-inline-start:3px solid #b8721c;margin:10px 0;padding:4px 14px;background:#faf7f0}cite{display:block;color:#6b7290;font-style:normal;font-size:.9rem}.chip{font-size:.8rem;border:1px solid #d9dceb;border-radius:99px;padding:0 8px}.muted,.small{color:#6b7290;font-size:.9rem}.note{background:#fbefdc;padding:8px 12px;border-radius:8px}a{color:#27378a;text-decoration:none}ol{list-style:arabic-indic}</style></head><body>${doc.innerHTML}</body></html>`;
      saveFile(`${LAB ? "quran-lab" : "mishkat"}-research-${new Date().toISOString().slice(0, 10)}.html`, new Blob([html], { type: 'text/html' })); toast('نُزّل البحث'); };
    $('#rsave').onclick = () => { ST.research = (ST.research || []).filter(x => x.q !== o.q); ST.research.unshift({ ...o, at: Date.now() }); save(); toast(SESSION ? 'حُفظ في أبحاثك' : 'حُفظ على هذا الجهاز. ادخل إلى حسابك ليُحفظ باسمك'); };
    const nq = tq.reduce((s, [, p]) => s + p.length, 0); st(`اكتمل البحث: ${countOf(explicit.length + meaning.length, 'آية واحدة', 'آيتان', 'آيات', 'آية')}، و${countOf(nq, 'نقل واحد', 'نقلان', 'نقول', 'نقلاً')} من التفاسير${hl.length ? `، و${countOf(hl.length, 'حديث واحد', 'حديثان', 'أحاديث', 'حديثاً')}` : ''}.`);
    $('#rdoc').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) { st('تعذّر إعداد البحث: ' + e.message); } finally { const b = $('#rgo'); if (b) b.disabled = false; }
}

/* ================= guide: what the app offers, roles, requirements and roadmap (all in the one link) */
function mishkatAyah() { const i = idxOf(24, 35), a = Q.ayat[i]; const ws = []; for (let k = 0; k < a[3]; k++) ws.push(W.w[a[2]+k][0]); const k = ws.findIndex(w => norm(w).replace(/ا/g, '').includes('مشكو')); return k > 1 ? ws.slice(k - 2, k + 3).join(' ') : ''; }
function labGuide() {
  const S = [['القرآن الكريم', 'مصحف المدينة النبوية برواية حفص عن عاصم، مع إحصاء كل لفظ وجذر من مدونة القرآن العربية (جامعة ليدز).'],
    ['التفاسير', 'التفسير الميسر، وتفسير الجلالين، وتيسير الكريم الرحمن للسعدي، ومعالم التنزيل للبغوي، وتفسير ابن كثير، وجامع البيان للطبري، والجامع لأحكام القرآن للقرطبي، والميسر في غريب القرآن لمعاني المفردات.'],
    ['الحديث', 'صحيح البخاري (ترقيم فتح الباري)، وصحيح مسلم (ترقيم محمد فؤاد عبد الباقي)، وسنن أبي داود (ترقيم محيي الدين عبد الحميد)، وجامع الترمذي (ترقيم أحمد شاكر)، وسنن النسائي (ترقيم أبي غدة)، وسنن ابن ماجه (ترقيم عبد الباقي).'],
    ['أحكام الأحاديث', 'أحكام الألباني وشعيب الأرنؤوط وأحمد شاكر وبشار عواد معروف وغيرهم على أحاديث السنن، كما ينقلها مشروع Hadith API المفتوح، مع حكم الترمذي نفسه من نص جامعه.']];
  const M = [['تحديد الموضوع', 'يُحذف الإطار مثل «من الكتاب والسنة»، ويُردّ كل لفظ إلى جذره الحقيقي في المصحف. فإن كان الجذر واسع المعاني (كجذر «س م و» الذي منه «اسم» و«سماء») اقتصر البحث على صيغة اللفظ نفسه.'],
    ['الآيات', 'مواضع ورود اللفظ ومشتقاته كلها، ثم الآيات الدالة على المعنى دون اللفظ مع شاهدها من التفسير، ثم الآيات التي نصّت عليها الأحاديث وأقوال العلماء بنصها.'],
    ['أقوال المفسرين والعلماء', 'تُنقل من كل تفسير الجمل المتعلقة بالآية والموضوع بلفظها، وتُحذف الأسانيد والشواهد الشعرية. وإن كان الموضوع عبارة («اسم الله الأعظم») بُحث عنها في نصوص التفاسير كاملة.'],
    ['التخريج', 'يُبحث في متون الكتب الستة لا في أسانيدها. وتُجمع روايات الحديث الواحد في مدخل واحد بأرقامها في كل كتاب، ويُعرف الحديث الواحد باتفاق الصحابي الراوي وتقارب اللفظ، ويُذكر حكم كل رواية.'],
    ['النقل بالنص', 'لا يكتب المختبر شيئاً من عنده ولا يلخّص. كل ما في البحث نص منقول من مصدره مع موضعه، والخلاصة أرقام محسوبة من النصوص. ويبقى الترجيح والاستنباط عمل الباحث.']];
  const RL = [['زائر', 'يعدّ الأبحاث ويطبعها وينزّلها، وتُحفظ أبحاثه على جهازه.'], ['عميل', 'كل ما للزائر، مع حفظ أبحاثه في حسابه باسمه، وتغيير كلمة مروره.'], ['مدير شامل', 'كل ما للعميل، مع إدارة الحسابات (إضافة، تعيين كلمة مرور، تغيير الصلاحية، تعطيل، حذف) ونشر الإعدادات.']];
  V(`<div class="stack" style="max-width:900px"><div><div class="eyebrow">دليل المختبر</div><h1>${BRAND}</h1><p class="lead">تطبيق مستقل لإعداد البحوث العلمية حول القرآن الكريم وألفاظه وصفاته ومسائله، وتأصيلها بالقرآن والسنة وكتب التفسير المعتمدة. يعمل على الجوال والكمبيوتر، ودون إنترنت بعد أول فتح.</p></div>
  <section class="panel stack tight"><h2>المصادر</h2>${S.map(([t, d]) => `<div class="due" style="align-items:flex-start"><b style="min-width:9em">${t}</b><span class="small">${d}</span></div>`).join('')}</section>
  <section class="panel stack tight"><h2>منهج إعداد البحث</h2>${M.map(([t, d]) => `<div class="due" style="align-items:flex-start"><b style="min-width:9em">${t}</b><span class="small">${d}</span></div>`).join('')}</section>
  <section class="panel stack tight"><h2>الأدوار والصلاحيات</h2>${RL.map(([t, d]) => `<div class="due" style="align-items:flex-start"><b style="min-width:9em">${t}</b><span class="small">${d}</span></div>`).join('')}</section>
  <section class="panel stack tight"><h2>حدود المصادر الحالية</h2><p style="margin:0" class="small">لا يحوي المختبر بعدُ مسند أحمد ولا مستدرك الحاكم ولا شروح الحديث (كفتح الباري) ولا المؤلفات المفردة (كالدر المنظم للسيوطي)، فلا يخرّج منها ولا ينقل عنها. وما يذكره العلماء في التفاسير المضمّنة من عزو إليها يظهر بنصه في «أقوال العلماء».</p></section>
  ${CONTACT.replace('«مشكاة»', '«' + BRAND + '»')}</div>`);
}
function guide() {
  if (LAB) return labGuide();
  const F = [
    IS_PWA ? ['اسأل مشكاة (مساعد البحث)','تكتب سؤالك فيجمع لك من داخل التطبيق أقرب الآيات مع تفسيرها، وأقوال السعدي وابن كثير والقرطبي في أقربها، والمداخل الموضوعية، وإحصاء الألفاظ. يعمل على جهازك دون إنترنت ودون أي خدمة خارجية.'] : ['اسأل مشكاة (مساعد ذكي)','يجيب عن أسئلتك بالعربية من نصوص التطبيق نفسها: يبحث في الآيات، ويقرأ التفاسير الثمانية، ويستخرج الإحصاءات، ثم يكتب جواباً منظماً كل آية فيه رابط إلى موضعها. لا يذكر آية من حفظه، ولا يفتي.'],
    ['البحث بالمعنى','تكتب الفكرة بلغتك (مثل: بر الوالدين)، فيبحث في الآيات وفي معانيها من التفسير الميسر، ويوسّع البحث بالجذور القرآنية وقاموس مفاهيم، ويرتب النتائج بالأقرب. يعمل على الجهاز دون خادم.'],
    ['الحفظ والتسميع','خمسة أوضاع: قراءة، وأوائل الكلمات، وإخفاء كامل، وتسميع بالكتابة يصحح كلمةً كلمة، وتسميع بالصوت. وجدول مراجعة بالتكرار المتباعد يحدد موعد مراجعة كل مقطع حسب تقييمك.'],
    ['مختبر الأبحاث','تكتب موضوع البحث، فيجمع الآيات وإحصاء الألفاظ والجذور وأقوال المفسرين وأحاديث الصحيحين ومداخل الموسوعة، ويوثّق كل نقل بمرجعه، ويُخرج بحثاً منظماً بمقدمة ومباحث وخلاصة ومراجع، يُطبع أو يُحفظ PDF أو يُنزَّل. يعمل على الجهاز دون إنترنت.'],
    ['أخبار الأولين والآخرين','تحليل لما قصّه القرآن من أخبار الأمم الماضية وسنن الله فيها، وأحداث السيرة، والنبوءات التي تحققت، وأشراط الساعة ومشاهد القيامة، برسوم بيانية وكل رقم يفتح آياته.'],
    ['الإعجاز العلمي','الآيات الكونية والعلمية بنصها، مع التفسير المأثور بلمسة، والقراءة المعاصرة بدرجتها (متفق عليه، أو مشهور، أو محل نقاش) ومصدرها، وضوابط الباب.'],
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
/* كلمات المرور: PBKDF2-SHA256 بملح عشوائي لكل حساب و٣١٠ آلاف دورة، فلا تُستخرج من الملف المنشور */
const PBK = 310000, b64e = u8 => btoa(String.fromCharCode(...u8)), b64d = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
async function pbkdf2(pw, salt, it) { const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']); return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: it }, k, 256)); }
const ctEq = (a, b) => { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
async function pwMake(u, pw) { const salt = crypto.getRandomValues(new Uint8Array(16)); return `pbkdf2$${PBK}$${b64e(salt)}$${b64e(await pbkdf2(uKey(u) + ':' + pw, salt, PBK))}`; }
async function pwCheck(x, pw) {
  const h = x?.h; if (typeof h !== 'string') return false;
  if (h.startsWith('pbkdf2$')) { const [, it, sl, d] = h.split('$'); if (!(+it >= 100000)) return false; return ctEq(b64e(await pbkdf2(uKey(x.u) + ':' + pw, b64d(sl), +it)), d); }
  return x.src === 'device' && ctEq(await sha('mishkat-user-v1:' + uKey(x.u) + ':' + pw), h); // حسابات قديمة على الجهاز تُرقّى عند أول دخول
}
const pwStrong = pw => pw.length >= 10 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
const PW_RULE = 'كلمة المرور ١٠ أحرف على الأقل، فيها حروف وأرقام.';
/* قفل بعد المحاولات الفاشلة: ٥ محاولات ثم انتظار يتضاعف (١٥ دقيقة فأكثر) */
const lockInfo = u => (LS.get('authFail', {})[u] || { n: 0, until: 0 });
function lockLeft(u) { const l = lockInfo(u); return Math.max(0, l.until - Date.now()); }
function noteFail(u) { const all = LS.get('authFail', {}), l = all[u] || { n: 0, until: 0, k: 0 }; l.n++; if (l.n >= 5) { l.k = (l.k || 0) + 1; l.until = Date.now() + 15 * 60e3 * 2 ** (l.k - 1); l.n = 0; } all[u] = l; LS.set('authFail', all); }
function clearFail(u) { const all = LS.get('authFail', {}); delete all[u]; LS.set('authFail', all); }
function rawUsers() { // published accounts plus every change made on this device (what the admin publishes)
  const m = new Map(); for (const x of (siteCfg.users || [])) m.set(x.u, { ...x, src: 'site' });
  for (const x of LS.get('users', [])) m.set(x.u, { ...(m.get(x.u) || {}), ...x, src: m.has(x.u) ? 'site' : 'device' });
  return [...m.values()].filter(x => !x.del);
}
function allUsers() { // accounts that can sign in: a change on this device can never raise a role or replace an admin's published password
  const m = new Map(); for (const x of (siteCfg.users || [])) m.set(x.u, { ...x, src: 'site' });
  for (const x of LS.get('users', [])) { const p = m.get(x.u);
    if (p && p.src === 'site') { const o = { ...p }; if (x.off != null) o.off = !!x.off; if (x.del) o.del = true; if (typeof x.name === 'string' && x.name) o.name = x.name; if (x.role === 'client') o.role = 'client'; if (x.h && p.role !== 'admin') o.h = x.h; m.set(x.u, o); }
    else m.set(x.u, { ...x, role: 'client', src: 'device' }); }
  return [...m.values()].filter(x => !x.del);
}
function putUser(x) { const L = LS.get('users', []).filter(y => y.u !== x.u); L.push(x); LS.set('users', L); }
function startSession(x) {
  const guest = LS.get('state', null), mine = LS.get('state@' + x.u, null);
  if (!mine && guest && (guest.bookmarks?.length || Object.keys(guest.hifz || {}).length)) LS.set('state@' + x.u, guest); // carry the visitor's progress into the new account
  SESSION = { u: x.u, name: x.name, role: x.role, exp: Date.now() + (x.role === 'admin' ? 8 : 24 * 14) * 3600e3 }; LS.set('session', SESSION); loadState(); applyPrefs(); drawNav();
}
function endSession() { SESSION = null; LS.set('session', null); loadState(); applyPrefs(); drawNav(); }
function checkSession() { if (!SESSION) return; const x = allUsers().find(y => y.u === SESSION.u); if (!x || x.off || !(SESSION.exp > Date.now())) endSession(); else if (x.role !== SESSION.role || x.name !== SESSION.name) { SESSION = { ...SESSION, name: x.name, role: x.role }; LS.set('session', SESSION); drawNav(); } }
const PERMS = {
  visitor: ['قراءة المصحف والتفاسير الثمانية والموسوعة كاملة', 'البحث بالمعنى ومساعد البحث والأطلس والخط الزمني', 'الحفظ والتسميع، ويُحفظ تقدّمه على جهازه'],
  client: ['كل ما يتاح للزائر', 'حساب شخصي باسمه تُحفظ فيه العلامات والحفظ وموضع القراءة منفصلة عن غيره على الجهاز نفسه', 'تغيير كلمة المرور، ونقل تقدّمه إلى جهاز آخر برمز النقل'],
  admin: ['كل ما يتاح للعميل', 'لوحة الإدارة: الإعلان العام والآية المختارة', 'إدارة الحسابات: إضافة عميل أو مدير، وتعيين كلمة المرور، والتعطيل والحذف', 'تقرير سلامة البيانات، ونشر الإعدادات للزوار جميعاً'],
};
const permList = r => `<ul style="margin:0;padding-inline-start:1.2em">${PERMS[r].map(x => `<li>${x}</li>`).join('')}</ul>`;
function account(msg = '') {
  if (!IS_PWA) return settings();
  if (!SESSION) {
    V(`<div class="stack" style="max-width:900px"><div><div class="eyebrow">حسابي</div><h1>الدخول إلى ${BRAND}</h1><p class="lead">التطبيق كله متاح دون تسجيل. والحساب يحفظ تقدّمك باسمك، ويفتح لوحة الإدارة للمدير.</p></div>
    ${msg ? `<p class="note" style="margin:0">${msg}</p>` : ''}
    <div class="grid split"><form class="panel stack tight" id="uform"><h2>تسجيل الدخول</h2>
      <label for="uu">اسم المستخدم</label><input class="field" id="uu" autocomplete="username" dir="ltr" required>
      <label for="upw">كلمة المرور</label><input class="field" id="upw" type="password" autocomplete="current-password" dir="ltr" required>
      <button class="btn pri" style="align-self:flex-start">دخول</button><p class="small" id="umsg" style="margin:0"></p></form>
    <form class="panel stack tight" id="rform"><h2>حساب عميل جديد</h2>
      <label for="rn">الاسم</label><input class="field" id="rn" autocomplete="name" required>
      <label for="ru">اسم المستخدم (حروف إنجليزية وأرقام)</label><input class="field" id="ru" autocomplete="username" dir="ltr" required>
      <label for="rpw">كلمة المرور (١٠ أحرف على الأقل، حروف وأرقام)</label><input class="field" id="rpw" type="password" autocomplete="new-password" dir="ltr" required>
      <button class="btn" style="align-self:flex-start">إنشاء الحساب</button><p class="small" id="rmsg" style="margin:0"></p>
      <p class="muted small" style="margin:0">يُنشأ الحساب على هذا الجهاز. ولحساب يعمل على كل الأجهزة يضيفه المدير من لوحة الإدارة.</p></form></div>
    <section class="panel stack tight"><h2>الصلاحيات</h2><dl class="kv"><dt>الزائر</dt><dd>${permList('visitor')}</dd><dt>العميل</dt><dd>${permList('client')}</dd><dt>المدير الشامل</dt><dd>${permList('admin')}</dd></dl></section></div>`);
    $('#uform').onsubmit = async e => { e.preventDefault(); if (!crypto?.subtle) { $('#umsg').textContent = 'افتح التطبيق من رابطه الآمن (https) لتسجيل الدخول.'; return; }
      const um = t => { const el = $('#umsg'); if (el) el.textContent = t; };
      const u = uKey($('#uu').value), pw = $('#upw').value, x = allUsers().find(y => y.u === u), left = lockLeft(u);
      if (left) { um(`أُوقف الدخول إلى هذا الحساب مؤقتاً بعد محاولات خاطئة متكررة. أعد المحاولة بعد ${n(Math.ceil(left / 60e3))} دقيقة.`); return; }
      um('جارٍ التحقق…');
      if (!x || !(await pwCheck(x, pw))) { noteFail(u); await new Promise(r => setTimeout(r, 600)); um('اسم المستخدم أو كلمة المرور غير صحيحة.'); return; }
      clearFail(u); if (!x.h.startsWith('pbkdf2$')) { const { src, ...rest } = x; putUser({ ...rest, h: await pwMake(u, pw) }); }
      um('');
      if (x.off) { um(`هذا الحساب معطّل. تواصل مع إدارة ${BRAND}.`); return; }
      startSession(x); toast('أهلاً بك، ' + x.name); if (location.hash === '#admin' && isAdmin()) admin(); else account(); };
    $('#rform').onsubmit = async e => { e.preventDefault(); const nm = $('#rn').value.trim(), u = uKey($('#ru').value), pw = $('#rpw').value;
      if (!/^[a-z0-9._-]{3,24}$/.test(u)) { $('#rmsg').textContent = 'اسم المستخدم من ٣ إلى ٢٤ حرفاً إنجليزياً أو رقماً.'; return; }
      if (!pwStrong(pw)) { $('#rmsg').textContent = PW_RULE; return; }
      if (rawUsers().some(y => y.u === u)) { $('#rmsg').textContent = 'اسم المستخدم مستعمل. اختر غيره.'; return; }
      const x = { u, name: (nm || u).slice(0, 60), role: 'client', h: await pwMake(u, pw), created: Date.now() }; putUser(x); startSession({ ...x, src: 'device' }); toast('أُنشئ حسابك'); account(); };
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
    <label for="npw">كلمة المرور الجديدة (١٠ أحرف على الأقل، حروف وأرقام)</label><input class="field" id="npw" type="password" autocomplete="new-password" dir="ltr" required>
    <button class="btn" style="align-self:flex-start">حفظ</button><p class="small" id="pwmsg" style="margin:0"></p></form></div>`);
  $('#outBtn').onclick = () => { endSession(); toast('سُجّل خروجك'); account(); };
  $('#pwform').onsubmit = async e => { e.preventDefault(); const x = allUsers().find(y => y.u === SESSION.u), np = $('#npw').value;
    if (lockLeft(x?.u)) { $('#pwmsg').textContent = 'أُوقفت المحاولات مؤقتاً بعد أخطاء متكررة. أعد المحاولة لاحقاً.'; return; }
    if (!x || !(await pwCheck(x, $('#opw').value))) { noteFail(SESSION.u); $('#pwmsg').textContent = 'كلمة المرور الحالية غير صحيحة.'; return; }
    if (!pwStrong(np)) { $('#pwmsg').textContent = PW_RULE; return; }
    const { src, ...rest } = x; putUser({ ...rest, h: await pwMake(x.u, np) }); $('#pwmsg').textContent = isAdmin() ? 'حُفظت كلمة المرور الجديدة للنشر. تُعتمد كلمة مرور المدير بعد «حفظ ونشر» من لوحة الإدارة ورفع الملف، وإلى ذلك الحين تبقى السابقة.' : 'تغيّرت كلمة المرور على هذا الجهاز.'; $('#pwform').reset(); };
}
async function admin() {
  if (IS_PWA && !SESSION) return account('لوحة الإدارة للمدير الشامل. سجّل الدخول بحساب المدير.');
  if (IS_PWA && !isAdmin()) { V(`<div class="stack" style="max-width:640px"><div class="eyebrow">لوحة الإدارة</div><h1>هذه الصفحة للمدير الشامل فقط</h1><p class="lead">أنت داخل بحساب ${ROLE[SESSION.role]}. صلاحياتك في <a href="#account">صفحة حسابك</a>.</p></div>`); return; }
  if (!isOwner && !IS_PWA) { V(`<div class="stack"><h1>لوحة الإدارة</h1><p class="muted">هذه الصفحة لمالك الموسوعة فقط.</p></div>`); return; }
  const tot = T.reduce((s, c) => s + c.items.length, 0);
  V(`<div class="stack" style="max-width:900px"><div><div class="eyebrow">لوحة الإدارة · ${IS_PWA ? 'مدير شامل: ' + esc(SESSION.name) : 'تظهر لك وحدك بصفتك مالك الموسوعة'}</div><h1>إدارة ${BRAND}</h1></div>
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
    if (IS_PWA) { cfg.users = rawUsers().map(({ src, ...x }) => x); LS.set('users', []); }
    if (IS_PWA) { siteCfg = cfg; applyCfg(); LS.set('cfgPreview', cfg); const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'config.json'; a.click();
      $('#adMsg').innerHTML = FILE_MODE ? 'حُفظ على هذا الكمبيوتر وظهر فوراً، ونُزّلت نسخة احتياطية باسم config.json.' : 'ظهر التعديل على هذا الجهاز، ونُزّل ملف config.json. لنشره لكل الزوار ارفعه مكان الملف نفسه في مجلد mishkat على GitHub، أو أرسله إلى فريق منجز.'; return; }
    try { await db.doc('site/config').set(cfg); siteCfg = cfg; applyCfg(); $('#adMsg').textContent = 'حُفظ ونُشر لكل الزوار.'; } catch (e) { $('#adMsg').textContent = 'لم يُحفظ: ' + (e?.code || 'خطأ غير معروف'); }
  };
}
function usersPanel() {
  const L = rawUsers(), me = SESSION.u, msg = t => { $('#uMsg').textContent = t; };
  $('#uTable').innerHTML = `<thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الحالة</th><th>المصدر</th></tr></thead><tbody>${L.map(x => `<tr><td>${esc(x.name)}${x.u === me ? ' <span class="chip">أنت</span>' : ''}</td><td dir="ltr">${esc(x.u)}</td><td>${ROLE[x.role]}</td><td>${x.off ? 'معطّل' : 'فعّال'}</td><td>${x.src === 'site' ? 'منشور' : 'هذا الجهاز'}</td></tr>`).join('')}</tbody>`;
  $('#ueU').innerHTML = L.map(x => `<option value="${esc(x.u)}">${esc(x.name)} (${esc(x.u)})</option>`).join('');
  const pick = () => L.find(x => x.u === $('#ueU').value), strip = ({ src, ...x }) => x;
  const admins = () => rawUsers().filter(x => x.role === 'admin' && !x.off).length;
  $('#uaForm').onsubmit = async e => { e.preventDefault(); const u = uKey($('#naU').value), pw = $('#naPw').value;
    if (!/^[a-z0-9._-]{3,24}$/.test(u)) return msg('اسم المستخدم من ٣ إلى ٢٤ حرفاً إنجليزياً أو رقماً.');
    if (!pwStrong(pw)) return msg(PW_RULE); if (L.some(x => x.u === u)) return msg('اسم المستخدم مستعمل.');
    putUser({ u, name: ($('#naName').value.trim() || u).slice(0, 60), role: $('#naRole').value === 'admin' ? 'admin' : 'client', h: await pwMake(u, pw), created: Date.now() }); usersPanel(); msg('أُضيف الحساب على هذا الجهاز. اضغط «حفظ ونشر» لتعميمه.'); $('#uaForm').reset(); };
  $('#ueSetPw').onclick = async () => { const x = pick(), pw = $('#uePw').value; if (!pwStrong(pw)) return msg(PW_RULE); putUser({ ...strip(x), h: await pwMake(x.u, pw) }); $('#uePw').value = ''; usersPanel(); msg('عُيّنت كلمة المرور لحساب ' + x.name + '.'); };
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
  <div class="toolbar"><button class="btn${bm ? ' pri' : ''}" id="bmBtn"><svg><use href="#i-bookmark"/></svg>${bm ? 'في علاماتك' : 'أضف إلى العلامات'}</button><button class="btn${ST.mark && ST.mark.i === i ? ' pri' : ''}" id="markBtn"><svg><use href="#i-time"/></svg>${ST.mark && ST.mark.i === i ? 'توقفت هنا ✓' : 'توقفت هنا'}</button><button class="btn" data-card="${i}"><svg><use href="#i-image"/></svg>بطاقة</button><button class="btn" id="cpBtn"><svg><use href="#i-copy"/></svg>نسخ</button>${IS_PWA ? `<button class="btn" id="plBtn"><svg><use href="#i-play"/></svg>استمع</button>` : ''}<a class="btn" href="#a${a[0]}-${a[1]}" data-close>في سياقها</a></div>
  <div class="pill-row"><span class="chip">${n(a[3])} كلمة</span><span class="chip">${n([...Array(a[3]).keys()].reduce((s, k) => s + W.w[a[2]+k][4], 0))} حرفاً</span>${i > 0 ? `<a class="chip" data-ayah="${i-1}">→ السابقة</a>` : ''}${i < Q.ayat.length - 1 ? `<a class="chip" data-ayah="${i+1}">التالية ←</a>` : ''}</div>
  <section class="stack tight"><h3>ملاحظتي على الآية</h3><textarea class="field" id="noteBox" rows="3" maxlength="800" placeholder="اكتب فائدة أو تدبراً أو سؤالاً. تبقى على جهازك ويمكنك نقلها بالنسخ الاحتياطي." aria-label="ملاحظتي على الآية">${esc((ST.notes[i] || {}).t || '')}</textarea><div class="toolbar"><button class="btn" id="noteSave">حفظ الملاحظة</button></div></section>
  <section><h3>التفسير والمعاني</h3><div class="toolbar" style="margin:8px 0"><select id="tsel" aria-label="اختر التفسير">${TF.map(b => `<option value="${b.key}" ${b.key === ST.prefs.tafsir ? 'selected' : ''}>${b.title} (${b.author})</option>`).join('')}</select></div><div class="tafsir panel" id="tbody">جارٍ التحميل…</div></section>
  <section><h3>تحليل الكلمات</h3><div class="tablebox"><table class="wtable"><thead><tr><th>الكلمة</th><th>اللفظ</th><th>الجذر</th><th>النوع</th></tr></thead><tbody>${wt.join('')}</tbody></table></div></section></div>`);
  $('#bmBtn').onclick = () => { const k = ST.bookmarks.indexOf(i); if (k >= 0) ST.bookmarks.splice(k, 1); else ST.bookmarks.unshift(i); save(); ayahDrawer(i); toast(k >= 0 ? 'أُزيلت من العلامات' : 'أُضيفت إلى العلامات'); };
  $('#markBtn').onclick = () => { if (ST.mark && ST.mark.i === i) { ST.mark = null; toast('أُزيلت علامة التوقف'); } else { ST.mark = { i, at: Date.now() }; toast('حُفظ موضع توقفك: ' + ref(i)); } save(); ayahDrawer(i); };
  $('#noteSave').onclick = () => { const t = $('#noteBox').value.trim().slice(0, 800); if (t) ST.notes[i] = { t, at: Date.now() }; else delete ST.notes[i]; save(); toast(t ? 'حُفظت الملاحظة' : 'حُذفت الملاحظة'); };
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
function moreMenu() { openDrawer(`<div class="stack mm"><a class="brand" href="#${HOME}" data-close style="padding:0"><img src="icons/icon-192.png" alt="" style="width:40px;height:40px;border-radius:10px"><span><b>${LAB ? 'مختبر الأبحاث' : 'مشكاة'}</b><small>${LAB ? 'القرآنية والحديثية' : 'موسوعة القرآن الذكية'}</small></span></a><nav class="nav${LAB ? '' : ' nav-tiles'}">${navHTML()}</nav></div>`); }

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
$('#qform').onsubmit = e => { e.preventDefault(); const q = $('#qinput').value; if (LAB) { if (!q.trim()) return; pendingResearch = { q: q.trim(), n: 20, k: 5, h: 10, tf: ['muyassar', 'saadi', 'ibnkathir', 'qurtubi'], sunan: true, scan: true }; $('#qinput').value = ''; if (location.hash === '#research') research(); else location.hash = 'research'; return; } if (location.hash !== '#search') history.replaceState(null, '', '#search'); curRoute = 'search'; setCur('search'); search(q); };
$('#moreBtn').onclick = moreMenu;
$('#themeBtn').onclick = () => { const dark = ST.prefs.theme === 'dark' || (ST.prefs.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); ST.prefs.theme = dark ? 'light' : 'dark'; applyPrefs(); save(); };
window.addEventListener('hashchange', route);

/* ================= prayer times: computed on the device from the sun's position (no internet, no outside service) */
const PR_METHODS = [ // [key, Arabic name, English name, fajr angle, isha angle or minutes after maghrib ('90m'), maghrib angle]
  ['umm', 'أم القرى (مكة المكرمة)', 'Umm al-Qura (Makkah)', 18.5, '90m'],
  ['qatar', 'وزارة الأوقاف القطرية', 'Qatar Ministry of Awqaf', 18, '90m'],
  ['gulf', 'الهيئة العامة للشؤون الإسلامية والأوقاف (الإمارات)', 'UAE General Authority of Islamic Affairs', 18.2, 18.2],
  ['kuwait', 'وزارة الأوقاف الكويتية', 'Kuwait Ministry of Awqaf', 18, 17.5],
  ['egypt', 'الهيئة المصرية العامة للمساحة', 'Egyptian General Authority of Survey', 19.5, 17.5],
  ['mwl', 'رابطة العالم الإسلامي', 'Muslim World League', 18, 17],
  ['karachi', 'جامعة العلوم الإسلامية بكراتشي', 'University of Islamic Sciences, Karachi', 18, 18],
  ['turkey', 'رئاسة الشؤون الدينية التركية', 'Diyanet (Turkey)', 18, 17],
  ['jordan', 'وزارة الأوقاف الأردنية', 'Jordan Ministry of Awqaf', 18, 18],
  ['morocco', 'وزارة الأوقاف المغربية', 'Morocco Ministry of Habous', 19, 17],
  ['algeria', 'وزارة الشؤون الدينية الجزائرية', 'Algeria Ministry of Religious Affairs', 18, 17],
  ['tunisia', 'وزارة الشؤون الدينية التونسية', 'Tunisia Ministry of Religious Affairs', 18, 18],
  ['singapore', 'مجلس سنغافورة الإسلامي (وماليزيا وإندونيسيا)', 'MUIS Singapore (Malaysia, Indonesia)', 20, 18],
  ['isna', 'الجمعية الإسلامية لأمريكا الشمالية', 'ISNA (North America)', 15, 15],
  ['france', 'اتحاد المنظمات الإسلامية بفرنسا', 'UOIF (France)', 12, 12],
  ['russia', 'الإدارة الدينية لمسلمي روسيا', 'Spiritual Administration of Muslims of Russia', 16, 15],
  ['tehran', 'معهد الجيوفيزياء بجامعة طهران', 'Institute of Geophysics, Tehran', 17.7, 14, 4.5],
  ['jafari', 'المذهب الجعفري (مؤسسة ليفا، قم)', "Shia Ithna-Ashari (Leva, Qum)", 16, 14, 4],
];
const PR_MADHAB = [['std', 'الجمهور: المالكي والشافعي والحنبلي (ظل المثل)', 'Majority: Maliki, Shafi\'i, Hanbali (shadow ×1)', 1], ['hanafi', 'الحنفي (ظل المثلين)', 'Hanafi (shadow ×2)', 2]];
// [code, Arabic, English, default method, time zone, [[city Arabic, city English, lat, lng, zone?]]]
const PR_PLACES = [
  ['QA', 'قطر', 'Qatar', 'qatar', 'Asia/Qatar', [['الدوحة', 'Doha', 25.2854, 51.531], ['الوكرة', 'Al Wakrah', 25.1715, 51.6034], ['الخور', 'Al Khor', 25.6839, 51.5058], ['الريان', 'Al Rayyan', 25.2919, 51.4244], ['دخان', 'Dukhan', 25.4246, 50.7826]]],
  ['SA', 'السعودية', 'Saudi Arabia', 'umm', 'Asia/Riyadh', [['مكة المكرمة', 'Makkah', 21.4225, 39.8262], ['المدينة المنورة', 'Madinah', 24.4672, 39.6111], ['الرياض', 'Riyadh', 24.7136, 46.6753], ['جدة', 'Jeddah', 21.4858, 39.1925], ['الدمام', 'Dammam', 26.4207, 50.0888], ['الطائف', 'Taif', 21.2703, 40.4158], ['أبها', 'Abha', 18.2164, 42.5053], ['تبوك', 'Tabuk', 28.3838, 36.555], ['بريدة', 'Buraydah', 26.326, 43.975], ['حائل', 'Hail', 27.5114, 41.7208], ['جازان', 'Jazan', 16.8892, 42.5511], ['نجران', 'Najran', 17.4933, 44.1277]]],
  ['AE', 'الإمارات', 'United Arab Emirates', 'gulf', 'Asia/Dubai', [['أبوظبي', 'Abu Dhabi', 24.4539, 54.3773], ['دبي', 'Dubai', 25.2048, 55.2708], ['الشارقة', 'Sharjah', 25.3463, 55.4209], ['العين', 'Al Ain', 24.2075, 55.7447], ['عجمان', 'Ajman', 25.4052, 55.5136], ['رأس الخيمة', 'Ras Al Khaimah', 25.7895, 55.9432], ['الفجيرة', 'Fujairah', 25.1288, 56.3265]]],
  ['KW', 'الكويت', 'Kuwait', 'kuwait', 'Asia/Kuwait', [['مدينة الكويت', 'Kuwait City', 29.3759, 47.9774], ['الجهراء', 'Al Jahra', 29.3375, 47.6581], ['الأحمدي', 'Al Ahmadi', 29.0769, 48.0838]]],
  ['BH', 'البحرين', 'Bahrain', 'umm', 'Asia/Bahrain', [['المنامة', 'Manama', 26.2285, 50.586], ['المحرق', 'Muharraq', 26.2572, 50.6119], ['الرفاع', 'Riffa', 26.13, 50.555]]],
  ['OM', 'عُمان', 'Oman', 'mwl', 'Asia/Muscat', [['مسقط', 'Muscat', 23.588, 58.3829], ['صلالة', 'Salalah', 17.0151, 54.0924], ['صحار', 'Sohar', 24.3643, 56.7468], ['نزوى', 'Nizwa', 22.9333, 57.5333]]],
  ['YE', 'اليمن', 'Yemen', 'mwl', 'Asia/Aden', [['صنعاء', "Sana'a", 15.3694, 44.191], ['عدن', 'Aden', 12.7855, 45.0187], ['تعز', 'Taiz', 13.5795, 44.0209], ['المكلا', 'Mukalla', 14.5425, 49.1242], ['الحديدة', 'Hodeidah', 14.7978, 42.9545]]],
  ['EG', 'مصر', 'Egypt', 'egypt', 'Africa/Cairo', [['القاهرة', 'Cairo', 30.0444, 31.2357], ['الإسكندرية', 'Alexandria', 31.2001, 29.9187], ['الجيزة', 'Giza', 30.0131, 31.2089], ['المنصورة', 'Mansoura', 31.0409, 31.3785], ['طنطا', 'Tanta', 30.7865, 31.0004], ['أسيوط', 'Asyut', 27.1783, 31.1859], ['الأقصر', 'Luxor', 25.6872, 32.6396], ['أسوان', 'Aswan', 24.0889, 32.8998], ['بورسعيد', 'Port Said', 31.2653, 32.3019], ['السويس', 'Suez', 29.9668, 32.5498], ['الزقازيق', 'Zagazig', 30.5877, 31.502], ['دمياط', 'Damietta', 31.4175, 31.8144]]],
  ['JO', 'الأردن', 'Jordan', 'jordan', 'Asia/Amman', [['عمّان', 'Amman', 31.9539, 35.9106], ['إربد', 'Irbid', 32.5556, 35.85], ['الزرقاء', 'Zarqa', 32.0728, 36.088], ['العقبة', 'Aqaba', 29.532, 35.0063]]],
  ['PS', 'فلسطين', 'Palestine', 'mwl', 'Asia/Hebron', [['القدس', 'Jerusalem (Al-Quds)', 31.7767, 35.2345], ['غزة', 'Gaza', 31.5017, 34.4668], ['الخليل', 'Hebron', 31.5326, 35.0998], ['نابلس', 'Nablus', 32.2211, 35.2544], ['رام الله', 'Ramallah', 31.9038, 35.2034]]],
  ['SY', 'سوريا', 'Syria', 'mwl', 'Asia/Damascus', [['دمشق', 'Damascus', 33.5138, 36.2765], ['حلب', 'Aleppo', 36.2021, 37.1343], ['حمص', 'Homs', 34.7324, 36.7137], ['اللاذقية', 'Latakia', 35.5317, 35.7901]]],
  ['LB', 'لبنان', 'Lebanon', 'mwl', 'Asia/Beirut', [['بيروت', 'Beirut', 33.8938, 35.5018], ['طرابلس', 'Tripoli', 34.4367, 35.8497], ['صيدا', 'Sidon', 33.5571, 35.3729]]],
  ['IQ', 'العراق', 'Iraq', 'mwl', 'Asia/Baghdad', [['بغداد', 'Baghdad', 33.3152, 44.3661], ['البصرة', 'Basra', 30.5085, 47.7804], ['الموصل', 'Mosul', 36.3489, 43.1577], ['أربيل', 'Erbil', 36.1911, 44.0092], ['النجف', 'Najaf', 32.0259, 44.3462], ['كربلاء', 'Karbala', 32.616, 44.0249]]],
  ['SD', 'السودان', 'Sudan', 'egypt', 'Africa/Khartoum', [['الخرطوم', 'Khartoum', 15.5007, 32.5599], ['أم درمان', 'Omdurman', 15.6445, 32.4777], ['بورتسودان', 'Port Sudan', 19.6158, 37.2164]]],
  ['LY', 'ليبيا', 'Libya', 'egypt', 'Africa/Tripoli', [['طرابلس', 'Tripoli', 32.8872, 13.1913], ['بنغازي', 'Benghazi', 32.1167, 20.0667], ['مصراتة', 'Misrata', 32.3754, 15.0925]]],
  ['TN', 'تونس', 'Tunisia', 'tunisia', 'Africa/Tunis', [['تونس', 'Tunis', 36.8065, 10.1815], ['صفاقس', 'Sfax', 34.7406, 10.7603], ['سوسة', 'Sousse', 35.8256, 10.636], ['القيروان', 'Kairouan', 35.6781, 10.0963]]],
  ['DZ', 'الجزائر', 'Algeria', 'algeria', 'Africa/Algiers', [['الجزائر العاصمة', 'Algiers', 36.7538, 3.0588], ['وهران', 'Oran', 35.6971, -0.6308], ['قسنطينة', 'Constantine', 36.365, 6.6147], ['عنابة', 'Annaba', 36.9, 7.7667]]],
  ['MA', 'المغرب', 'Morocco', 'morocco', 'Africa/Casablanca', [['الرباط', 'Rabat', 34.0209, -6.8416], ['الدار البيضاء', 'Casablanca', 33.5731, -7.5898], ['فاس', 'Fes', 34.0181, -5.0078], ['مراكش', 'Marrakesh', 31.6295, -7.9811], ['طنجة', 'Tangier', 35.7595, -5.834], ['أكادير', 'Agadir', 30.4278, -9.5981]]],
  ['MR', 'موريتانيا', 'Mauritania', 'mwl', 'Africa/Nouakchott', [['نواكشوط', 'Nouakchott', 18.0735, -15.9582], ['نواذيبو', 'Nouadhibou', 20.9425, -17.0362]]],
  ['SO', 'الصومال', 'Somalia', 'mwl', 'Africa/Mogadishu', [['مقديشو', 'Mogadishu', 2.0469, 45.3182], ['هرجيسا', 'Hargeisa', 9.56, 44.065]]],
  ['DJ', 'جيبوتي', 'Djibouti', 'mwl', 'Africa/Djibouti', [['جيبوتي', 'Djibouti', 11.5721, 43.1456]]],
  ['KM', 'جزر القمر', 'Comoros', 'mwl', 'Indian/Comoro', [['موروني', 'Moroni', -11.7172, 43.2473]]],
  ['TR', 'تركيا', 'Türkiye', 'turkey', 'Europe/Istanbul', [['إسطنبول', 'Istanbul', 41.0082, 28.9784], ['أنقرة', 'Ankara', 39.9334, 32.8597], ['إزمير', 'Izmir', 38.4237, 27.1428], ['بورصة', 'Bursa', 40.1885, 29.061], ['قونية', 'Konya', 37.8746, 32.4932], ['غازي عنتاب', 'Gaziantep', 37.0662, 37.3833]]],
  ['IR', 'إيران', 'Iran', 'tehran', 'Asia/Tehran', [['طهران', 'Tehran', 35.6892, 51.389], ['مشهد', 'Mashhad', 36.2605, 59.6168], ['أصفهان', 'Isfahan', 32.6546, 51.668], ['تبريز', 'Tabriz', 38.08, 46.2919]]],
  ['PK', 'باكستان', 'Pakistan', 'karachi', 'Asia/Karachi', [['إسلام آباد', 'Islamabad', 33.6844, 73.0479], ['كراتشي', 'Karachi', 24.8607, 67.0011], ['لاهور', 'Lahore', 31.5204, 74.3587], ['بيشاور', 'Peshawar', 34.0151, 71.5249], ['فيصل آباد', 'Faisalabad', 31.4504, 73.135], ['كويتا', 'Quetta', 30.1798, 66.975]]],
  ['AF', 'أفغانستان', 'Afghanistan', 'karachi', 'Asia/Kabul', [['كابل', 'Kabul', 34.5553, 69.2075], ['قندهار', 'Kandahar', 31.628, 65.7372], ['هرات', 'Herat', 34.3529, 62.204]]],
  ['IN', 'الهند', 'India', 'karachi', 'Asia/Kolkata', [['نيودلهي', 'New Delhi', 28.6139, 77.209], ['مومباي', 'Mumbai', 19.076, 72.8777], ['حيدر آباد', 'Hyderabad', 17.385, 78.4867], ['كولكاتا', 'Kolkata', 22.5726, 88.3639], ['لكهنؤ', 'Lucknow', 26.8467, 80.9462], ['بنغالور', 'Bengaluru', 12.9716, 77.5946], ['سريناغار', 'Srinagar', 34.0837, 74.7973]]],
  ['BD', 'بنغلاديش', 'Bangladesh', 'karachi', 'Asia/Dhaka', [['دكا', 'Dhaka', 23.8103, 90.4125], ['شيتاغونغ', 'Chattogram', 22.3569, 91.7832], ['سيلهت', 'Sylhet', 24.8949, 91.8687]]],
  ['ID', 'إندونيسيا', 'Indonesia', 'singapore', 'Asia/Jakarta', [['جاكرتا', 'Jakarta', -6.2088, 106.8456], ['سورابايا', 'Surabaya', -7.2575, 112.7521], ['باندونغ', 'Bandung', -6.9175, 107.6191], ['ميدان', 'Medan', 3.5952, 98.6722], ['باندا آتشيه', 'Banda Aceh', 5.5483, 95.3238], ['مكاسر', 'Makassar', -5.1477, 119.4327, 'Asia/Makassar']]],
  ['MY', 'ماليزيا', 'Malaysia', 'singapore', 'Asia/Kuala_Lumpur', [['كوالالمبور', 'Kuala Lumpur', 3.139, 101.6869], ['جورج تاون', 'George Town', 5.4141, 100.3288], ['جوهور بهرو', 'Johor Bahru', 1.4927, 103.7414], ['كوتا كينابالو', 'Kota Kinabalu', 5.9804, 116.0735]]],
  ['SG', 'سنغافورة', 'Singapore', 'singapore', 'Asia/Singapore', [['سنغافورة', 'Singapore', 1.3521, 103.8198]]],
  ['BN', 'بروناي', 'Brunei', 'singapore', 'Asia/Brunei', [['بندر سري بكاوان', 'Bandar Seri Begawan', 4.9031, 114.9398]]],
  ['MV', 'المالديف', 'Maldives', 'mwl', 'Indian/Maldives', [['ماليه', 'Malé', 4.1755, 73.5093]]],
  ['UZ', 'أوزبكستان', 'Uzbekistan', 'mwl', 'Asia/Tashkent', [['طشقند', 'Tashkent', 41.2995, 69.2401], ['سمرقند', 'Samarkand', 39.6542, 66.9597], ['بخارى', 'Bukhara', 39.7681, 64.4556]]],
  ['KZ', 'كازاخستان', 'Kazakhstan', 'mwl', 'Asia/Almaty', [['أستانا', 'Astana', 51.1694, 71.4491], ['ألماتي', 'Almaty', 43.222, 76.8512]]],
  ['AZ', 'أذربيجان', 'Azerbaijan', 'mwl', 'Asia/Baku', [['باكو', 'Baku', 40.4093, 49.8671]]],
  ['NG', 'نيجيريا', 'Nigeria', 'mwl', 'Africa/Lagos', [['أبوجا', 'Abuja', 9.0765, 7.3986], ['لاغوس', 'Lagos', 6.5244, 3.3792], ['كانو', 'Kano', 12.0022, 8.592], ['سوكوتو', 'Sokoto', 13.0059, 5.2476]]],
  ['SN', 'السنغال', 'Senegal', 'mwl', 'Africa/Dakar', [['داكار', 'Dakar', 14.7167, -17.4677], ['طوبى', 'Touba', 14.85, -15.8833]]],
  ['ML', 'مالي', 'Mali', 'mwl', 'Africa/Bamako', [['باماكو', 'Bamako', 12.6392, -8.0029], ['تمبكتو', 'Timbuktu', 16.7666, -3.0026]]],
  ['NE', 'النيجر', 'Niger', 'mwl', 'Africa/Niamey', [['نيامي', 'Niamey', 13.5116, 2.1254]]],
  ['TD', 'تشاد', 'Chad', 'mwl', 'Africa/Ndjamena', [['إنجامينا', "N'Djamena", 12.1348, 15.0557]]],
  ['ET', 'إثيوبيا', 'Ethiopia', 'mwl', 'Africa/Addis_Ababa', [['أديس أبابا', 'Addis Ababa', 9.03, 38.74], ['هرر', 'Harar', 9.3126, 42.1227]]],
  ['KE', 'كينيا', 'Kenya', 'mwl', 'Africa/Nairobi', [['نيروبي', 'Nairobi', -1.2921, 36.8219], ['مومباسا', 'Mombasa', -4.0435, 39.6682]]],
  ['TZ', 'تنزانيا', 'Tanzania', 'mwl', 'Africa/Dar_es_Salaam', [['دار السلام', 'Dar es Salaam', -6.7924, 39.2083], ['زنجبار', 'Zanzibar', -6.1659, 39.2026]]],
  ['ZA', 'جنوب أفريقيا', 'South Africa', 'mwl', 'Africa/Johannesburg', [['جوهانسبرغ', 'Johannesburg', -26.2041, 28.0473], ['كيب تاون', 'Cape Town', -33.9249, 18.4241], ['ديربان', 'Durban', -29.8587, 31.0218]]],
  ['GB', 'المملكة المتحدة', 'United Kingdom', 'mwl', 'Europe/London', [['لندن', 'London', 51.5074, -0.1278], ['برمنغهام', 'Birmingham', 52.4862, -1.8904], ['مانشستر', 'Manchester', 53.4808, -2.2426], ['برادفورد', 'Bradford', 53.796, -1.7594], ['غلاسكو', 'Glasgow', 55.8642, -4.2518]]],
  ['FR', 'فرنسا', 'France', 'france', 'Europe/Paris', [['باريس', 'Paris', 48.8566, 2.3522], ['مرسيليا', 'Marseille', 43.2965, 5.3698], ['ليون', 'Lyon', 45.764, 4.8357], ['تولوز', 'Toulouse', 43.6047, 1.4442], ['ليل', 'Lille', 50.6292, 3.0573]]],
  ['DE', 'ألمانيا', 'Germany', 'mwl', 'Europe/Berlin', [['برلين', 'Berlin', 52.52, 13.405], ['هامبورغ', 'Hamburg', 53.5511, 9.9937], ['ميونخ', 'Munich', 48.1351, 11.582], ['كولونيا', 'Cologne', 50.9375, 6.9603], ['فرانكفورت', 'Frankfurt', 50.1109, 8.6821]]],
  ['NL', 'هولندا', 'Netherlands', 'mwl', 'Europe/Amsterdam', [['أمستردام', 'Amsterdam', 52.3676, 4.9041], ['روتردام', 'Rotterdam', 51.9244, 4.4777]]],
  ['BE', 'بلجيكا', 'Belgium', 'mwl', 'Europe/Brussels', [['بروكسل', 'Brussels', 50.8503, 4.3517], ['أنتويرب', 'Antwerp', 51.2194, 4.4025]]],
  ['ES', 'إسبانيا', 'Spain', 'mwl', 'Europe/Madrid', [['مدريد', 'Madrid', 40.4168, -3.7038], ['برشلونة', 'Barcelona', 41.3851, 2.1734], ['غرناطة', 'Granada', 37.1773, -3.5986], ['قرطبة', 'Córdoba', 37.8882, -4.7794]]],
  ['IT', 'إيطاليا', 'Italy', 'mwl', 'Europe/Rome', [['روما', 'Rome', 41.9028, 12.4964], ['ميلانو', 'Milan', 45.4642, 9.19]]],
  ['SE', 'السويد', 'Sweden', 'mwl', 'Europe/Stockholm', [['ستوكهولم', 'Stockholm', 59.3293, 18.0686], ['مالمو', 'Malmö', 55.605, 13.0038]]],
  ['NO', 'النرويج', 'Norway', 'mwl', 'Europe/Oslo', [['أوسلو', 'Oslo', 59.9139, 10.7522]]],
  ['DK', 'الدنمارك', 'Denmark', 'mwl', 'Europe/Copenhagen', [['كوبنهاغن', 'Copenhagen', 55.6761, 12.5683]]],
  ['AT', 'النمسا', 'Austria', 'mwl', 'Europe/Vienna', [['فيينا', 'Vienna', 48.2082, 16.3738]]],
  ['CH', 'سويسرا', 'Switzerland', 'mwl', 'Europe/Zurich', [['زيورخ', 'Zurich', 47.3769, 8.5417], ['جنيف', 'Geneva', 46.2044, 6.1432]]],
  ['BA', 'البوسنة والهرسك', 'Bosnia and Herzegovina', 'mwl', 'Europe/Sarajevo', [['سراييفو', 'Sarajevo', 43.8563, 18.4131]]],
  ['AL', 'ألبانيا', 'Albania', 'mwl', 'Europe/Tirane', [['تيرانا', 'Tirana', 41.3275, 19.8187]]],
  ['RU', 'روسيا', 'Russia', 'russia', 'Europe/Moscow', [['موسكو', 'Moscow', 55.7558, 37.6173], ['قازان', 'Kazan', 55.7963, 49.1088], ['غروزني', 'Grozny', 43.3178, 45.6982], ['محج قلعة', 'Makhachkala', 42.9849, 47.5047], ['أوفا', 'Ufa', 54.7388, 55.9721, 'Asia/Yekaterinburg']]],
  ['US', 'الولايات المتحدة', 'United States', 'isna', 'America/New_York', [['نيويورك', 'New York', 40.7128, -74.006], ['واشنطن', 'Washington, D.C.', 38.9072, -77.0369], ['ديترويت', 'Detroit', 42.3314, -83.0458], ['شيكاغو', 'Chicago', 41.8781, -87.6298, 'America/Chicago'], ['هيوستن', 'Houston', 29.7604, -95.3698, 'America/Chicago'], ['دالاس', 'Dallas', 32.7767, -96.797, 'America/Chicago'], ['لوس أنجلوس', 'Los Angeles', 34.0522, -118.2437, 'America/Los_Angeles'], ['سان فرانسيسكو', 'San Francisco', 37.7749, -122.4194, 'America/Los_Angeles']]],
  ['CA', 'كندا', 'Canada', 'isna', 'America/Toronto', [['تورونتو', 'Toronto', 43.6532, -79.3832], ['مونتريال', 'Montreal', 45.5017, -73.5673], ['أوتاوا', 'Ottawa', 45.4215, -75.6972], ['كالغاري', 'Calgary', 51.0447, -114.0719, 'America/Edmonton'], ['فانكوفر', 'Vancouver', 49.2827, -123.1207, 'America/Vancouver']]],
  ['BR', 'البرازيل', 'Brazil', 'mwl', 'America/Sao_Paulo', [['ساو باولو', 'São Paulo', -23.5505, -46.6333], ['ريو دي جانيرو', 'Rio de Janeiro', -22.9068, -43.1729]]],
  ['AR', 'الأرجنتين', 'Argentina', 'mwl', 'America/Argentina/Buenos_Aires', [['بوينس آيرس', 'Buenos Aires', -34.6037, -58.3816]]],
  ['AU', 'أستراليا', 'Australia', 'mwl', 'Australia/Sydney', [['سيدني', 'Sydney', -33.8688, 151.2093], ['ملبورن', 'Melbourne', -37.8136, 144.9631, 'Australia/Melbourne'], ['بيرث', 'Perth', -31.9505, 115.8605, 'Australia/Perth'], ['بريزبن', 'Brisbane', -27.4698, 153.0251, 'Australia/Brisbane']]],
  ['NZ', 'نيوزيلندا', 'New Zealand', 'mwl', 'Pacific/Auckland', [['أوكلاند', 'Auckland', -36.8485, 174.7633]]],
  ['CN', 'الصين', 'China', 'mwl', 'Asia/Shanghai', [['بكين', 'Beijing', 39.9042, 116.4074], ['شنغهاي', 'Shanghai', 31.2304, 121.4737], ['أورومتشي', 'Ürümqi', 43.8256, 87.6168]]],
  ['JP', 'اليابان', 'Japan', 'mwl', 'Asia/Tokyo', [['طوكيو', 'Tokyo', 35.6762, 139.6503]]],
  ['KR', 'كوريا الجنوبية', 'South Korea', 'mwl', 'Asia/Seoul', [['سيول', 'Seoul', 37.5665, 126.978]]],
  ['PH', 'الفلبين', 'Philippines', 'mwl', 'Asia/Manila', [['مانيلا', 'Manila', 14.5995, 120.9842], ['مراوي', 'Marawi', 8.0, 124.2833]]],
  ['TH', 'تايلاند', 'Thailand', 'mwl', 'Asia/Bangkok', [['بانكوك', 'Bangkok', 13.7563, 100.5018]]],
];
const PR_NAMES = [['fajr', 'الفجر', 'Fajr'], ['sunrise', 'الشروق', 'Sunrise'], ['dhuhr', 'الظهر', 'Dhuhr'], ['asr', 'العصر', 'Asr'], ['maghrib', 'المغرب', 'Maghrib'], ['isha', 'العشاء', 'Isha']];
const prName = x => LANG === 'ar' ? x[1] : x[2];
function prCfg() { const d = { c: 'QA', i: 0, m: '', h: 'std', f24: false, adj: 0 }; const v = Object.assign(d, LS.get('prayer', {}) || {}); return v; }
function prPlace(cfg) {
  if (cfg.c === 'GEO' && cfg.geo) return { country: LANG === 'ar' ? 'موقعي الحالي' : 'My location', city: cfg.geo.label || '', lat: cfg.geo.lat, lng: cfg.geo.lng, tz: cfg.geo.tz, method: cfg.m || 'mwl' };
  const c = PR_PLACES.find(x => x[0] === cfg.c) || PR_PLACES[0], ci = c[5][cfg.i] || c[5][0];
  return { country: LANG === 'ar' ? c[1] : c[2], city: LANG === 'ar' ? ci[0] : ci[1], lat: ci[2], lng: ci[3], tz: ci[4] || c[4], method: cfg.m || c[3] };
}
function tzOffset(tz, date) { // hours east of UTC for that zone on that date (handles summer time); falls back to the device zone
  try { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date).map(x => [x.type, x.value]));
    return (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(date.getTime() / 1000) * 1000) / 36e5; }
  catch (e) { return -date.getTimezoneOffset() / 60; }
}
function prayerTimes(y, mo, d, lat, lng, tz, method, madhab) { // returns hours (local, float) for the six times
  const R = Math.PI / 180, sin = x => Math.sin(x * R), cos = x => Math.cos(x * R), tan = x => Math.tan(x * R);
  const asin = x => Math.asin(x) / R, acos = x => Math.acos(Math.max(-1, Math.min(1, x))) / R, atan2 = (a, b) => Math.atan2(a, b) / R, acot = x => Math.atan(1 / x) / R;
  const fix = (a, b) => { a = a - b * Math.floor(a / b); return a < 0 ? a + b : a; };
  if (mo <= 2) { y -= 1; mo += 12; } const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4);
  const jd0 = Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (mo + 1)) + d + B - 1524.5 - lng / 360;
  const sun = t => { const D = jd0 + t / 24 - 2451545.0, g = fix(357.529 + 0.98560028 * D, 360), q = fix(280.459 + 0.98564736 * D, 360), L = fix(q + 1.915 * sin(g) + 0.020 * sin(2 * g), 360), e = 23.439 - 0.00000036 * D;
    const RA = fix(atan2(cos(e) * sin(L), cos(L)) / 15, 24); return { decl: asin(sin(e) * sin(L)), eqt: q / 15 - RA }; };
  const noon = t => fix(12 - sun(t).eqt, 24);
  const T = (ang, t, ccw) => { const dc = sun(t).decl, v = acos((-sin(ang) - sin(dc) * sin(lat)) / (cos(dc) * cos(lat))) / 15; return noon(t) + (ccw ? -v : v); };
  const asrT = (f, t) => { const dc = sun(t).decl, ang = -acot(f + tan(Math.abs(lat - dc))); return T(ang, t, false); };
  const M = PR_METHODS.find(x => x[0] === method) || PR_METHODS[5], fac = (PR_MADHAB.find(x => x[0] === madhab) || PR_MADHAB[0])[3];
  let t = { fajr: 5, sunrise: 6, dhuhr: 12, asr: 13, maghrib: 18, isha: 18 };
  for (let k = 0; k < 2; k++) { // refine with the sun's position at each approximate time
    const r = (h) => h / 24 * 24;
    t = { fajr: T(M[3], r(t.fajr), true), sunrise: T(0.833, r(t.sunrise), true), dhuhr: noon(r(t.dhuhr)), asr: asrT(fac, r(t.asr)),
      maghrib: T(M[5] || 0.833, r(t.maghrib), false), isha: typeof M[4] === 'string' ? null : T(M[4], r(t.isha), false) };
    const sunset = T(0.833, 18, false); if (typeof M[4] === 'string') t.isha = (M[5] ? sunset : t.maghrib) + parseFloat(M[4]) / 60;
  }
  // high latitudes: when twilight never ends or lasts too long, use the angle-based portion of the night
  const sunset = T(0.833, 18, false), night = 24 - (sunset - t.sunrise);
  const capF = t.sunrise - night * M[3] / 60, capI = sunset + night * (typeof M[4] === 'string' ? 18 : M[4]) / 60;
  if (isNaN(t.fajr) || t.fajr < capF) t.fajr = capF;
  if (typeof M[4] !== 'string' && (isNaN(t.isha) || t.isha > capI)) t.isha = capI;
  const out = {}; for (const [k, v] of Object.entries(t)) out[k] = fix(v + tz - lng / 15, 24);
  out.dhuhr += 1 / 60; // the customary minute after the zenith
  return out;
}
const prFmt = (h, f24) => { if (h == null || isNaN(h)) return '—'; let m = Math.round(h * 60) % 1440; const H = Math.floor(m / 60), Mi = m % 60;
  if (f24) return `${n(H).padStart(2, n(0))}:${n(Mi).padStart(2, n(0))}`.replace(/٬/g, '');
  const h12 = (H % 12) || 12; return `${n(h12)}:${n(Mi).padStart(2, n(0))} ${LANG === 'ar' ? (H < 12 ? 'ص' : 'م') : (H < 12 ? 'AM' : 'PM')}`; };
function prDay(date, cfg) {
  const P = prPlace(cfg), tz = tzOffset(P.tz, new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12)));
  const t = prayerTimes(date.getFullYear(), date.getMonth() + 1, date.getDate(), P.lat, P.lng, tz, P.method, cfg.h);
  // Umm al-Qura and Qatar: Isha is 120 minutes after Maghrib in Ramadan
  if (['umm', 'qatar'].includes(P.method)) { try { const hm = +new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' }).format(date).replace(/\D/g, ''); if (hm === 9) t.isha = t.maghrib + 2; } catch (e) {} }
  return { t, P, tz };
}
function qibla(lat, lng) { const R = Math.PI / 180, k = [21.4225 * R, 39.8262 * R], a = lat * R, dl = k[1] - lng * R;
  return (Math.atan2(Math.sin(dl), Math.cos(a) * Math.tan(k[0]) - Math.sin(a) * Math.cos(dl)) / R + 360) % 360; }
function hijri(d) { try { return new Intl.DateTimeFormat((LANG === 'ar' ? 'ar-SA' : 'en-GB') + '-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch (e) { return ''; } }
function prNext(cfg) { // {name, at(Date)} of the next prayer, in the place's own clock
  const now = new Date(); const { t, tz } = prDay(now, cfg); const nowH = ((now.getTime() / 36e5 + tz) % 24 + 24) % 24;
  for (const x of PR_NAMES) if (x[0] !== 'sunrise' && t[x[0]] > nowH) return { x, h: t[x[0]], left: t[x[0]] - nowH };
  const tm = prDay(new Date(now.getTime() + 864e5), cfg).t; return { x: PR_NAMES[0], h: tm.fajr, left: 24 - nowH + tm.fajr };
}
const prLeft = h => { const m = Math.max(0, Math.round(h * 60)); return LANG === 'ar' ? `بعد ${n(Math.floor(m / 60))} ساعة و${n(m % 60)} دقيقة` : `in ${Math.floor(m / 60)} h ${m % 60} min`; };
let prTimer = 0;
function prayer() {
  const cfg = prCfg(), P = prPlace(cfg), now = new Date(), { t } = prDay(now, cfg), nx = prNext(cfg);
  const M = PR_METHODS.find(x => x[0] === P.method) || PR_METHODS[5];
  const ctry = PR_PLACES.find(x => x[0] === cfg.c);
  const month = []; for (let k = 0; k < 30; k++) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + k); month.push([d, prDay(d, cfg).t]); }
  const dfmt = d => new Intl.DateTimeFormat(LANG === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' }).format(d);
  V(`<div class="stack" style="max-width:980px"><div><div class="eyebrow">مواقيت الصلاة</div><h1 class="notranslate" translate="no">${esc(P.city)}${P.country ? (LANG === 'ar' ? '، ' : ', ') + esc(P.country) : ''}</h1>
    <p class="lead" style="margin:4px 0 0">${esc(new Intl.DateTimeFormat(LANG === 'ar' ? 'ar-EG' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now))} · ${esc(hijri(now))}</p></div>
  <section class="prnext panel"><div><span class="eyebrow">الصلاة القادمة</span><b class="prnm">${prName(nx.x)}</b><span class="prat">${prFmt(nx.h, cfg.f24)}</span></div><span class="chip acc" id="prLeft">${prLeft(nx.left)}</span></section>
  <div class="prgrid">${PR_NAMES.map(x => `<div class="prcell${x === nx.x ? ' on' : ''}${x[0] === 'sunrise' ? ' sun' : ''}"><span>${prName(x)}</span><b>${prFmt(t[x[0]], cfg.f24)}</b></div>`).join('')}</div>
  <div id="adhanBox"></div>
  <section class="panel stack tight"><h2>البلد وطريقة الحساب</h2>
    <div class="prform">
      <label class="field"><span>البلد</span><select id="prC" class="notranslate" translate="no">${PR_PLACES.map(c => `<option value="${c[0]}"${c[0] === cfg.c ? ' selected' : ''}>${esc(LANG === 'ar' ? c[1] : c[2])}</option>`).join('')}${cfg.geo ? `<option value="GEO"${cfg.c === 'GEO' ? ' selected' : ''}>${LANG === 'ar' ? 'موقعي الحالي' : 'My location'}</option>` : ''}</select></label>
      <label class="field"><span>المدينة</span><select id="prI" class="notranslate" translate="no" ${ctry ? '' : 'disabled'}>${ctry ? ctry[5].map((ci, i) => `<option value="${i}"${i === cfg.i ? ' selected' : ''}>${esc(LANG === 'ar' ? ci[0] : ci[1])}</option>`).join('') : '<option>—</option>'}</select></label>
      <label class="field"><span>طريقة الحساب</span><select id="prM" class="notranslate" translate="no"><option value="">${LANG === 'ar' ? 'المعتمدة في البلد' : 'Official for the country'} (${esc(LANG === 'ar' ? M[1] : M[2])})</option>${PR_METHODS.map(m => `<option value="${m[0]}"${m[0] === cfg.m ? ' selected' : ''}>${esc(LANG === 'ar' ? m[1] : m[2])}</option>`).join('')}</select></label>
      <label class="field"><span>المذهب في وقت العصر</span><select id="prH" class="notranslate" translate="no">${PR_MADHAB.map(m => `<option value="${m[0]}"${m[0] === cfg.h ? ' selected' : ''}>${esc(LANG === 'ar' ? m[1] : m[2])}</option>`).join('')}</select></label>
    </div>
    <div class="toolbar"><button class="btn" id="prGeo" type="button"><svg><use href="#i-map"/></svg>استعمل موقعي الحالي</button><label class="chk"><input type="checkbox" id="prF"${cfg.f24 ? ' checked' : ''}> نظام ٢٤ ساعة</label><span class="muted small" id="prMsg"></span></div>
    <p class="muted small" style="margin:0">الفجر بزاوية ${n(M[3])}°، والعشاء ${typeof M[4] === 'string' ? `بعد المغرب بـ${n(parseFloat(M[4]))} دقيقة (${n(120)} في رمضان)` : `بزاوية ${n(M[4])}°`}. اتجاه القبلة: ${n(Math.round(qibla(P.lat, P.lng)))}° من الشمال باتجاه عقارب الساعة. المواقيت محسوبة على جهازك من موقع الشمس، وتعمل دون إنترنت، وقد تختلف دقيقة أو دقيقتين عن تقويم الجهة الرسمية؛ فالمعتمد إعلان المسجد والجهة الرسمية في بلدك.</p>
  </section>
  <section class="panel stack tight"><h2>مواقيت ثلاثين يوماً</h2><div class="tablebox"><table class="wtable prtable"><thead><tr><th>اليوم</th>${PR_NAMES.map(x => `<th>${prName(x)}</th>`).join('')}</tr></thead><tbody>
    ${month.map(([d, tt], k) => `<tr${k === 0 ? ' class="today"' : ''}><td>${esc(dfmt(d))}</td>${PR_NAMES.map(x => `<td>${prFmt(tt[x[0]], cfg.f24)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section></div>`);
  if (window.adhanUI) window.adhanUI();
  const saveCfg = ch => { LS.set('prayer', Object.assign(prCfg(), ch)); prayer(); };
  $('#prC').onchange = e => saveCfg({ c: e.target.value, i: 0, m: '' });
  $('#prI').onchange = e => saveCfg({ i: +e.target.value });
  $('#prM').onchange = e => saveCfg({ m: e.target.value });
  $('#prH').onchange = e => saveCfg({ h: e.target.value });
  $('#prF').onchange = e => saveCfg({ f24: e.target.checked });
  $('#prGeo').onclick = () => { if (!navigator.geolocation) { $('#prMsg').textContent = 'تحديد الموقع غير متاح في هذا المتصفح.'; return; }
    $('#prMsg').textContent = 'جارٍ تحديد موقعك…';
    navigator.geolocation.getCurrentPosition(pos => { const { latitude: lat, longitude: lng } = pos.coords; const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      saveCfg({ c: 'GEO', geo: { lat, lng, tz, label: `${lat.toFixed(3)}°, ${lng.toFixed(3)}°` } }); },
      () => { $('#prMsg').textContent = 'لم يُسمح بتحديد الموقع. اختر البلد والمدينة من القائمة.'; }, { timeout: 15000 }); };
  clearInterval(prTimer); prTimer = setInterval(() => { const el = $('#prLeft'); if (!el) return clearInterval(prTimer); const x = prNext(prCfg()); el.textContent = prLeft(x.left); if (x.left < 1 / 120) prayer(); }, 30000);
}
function prHomeCard() {
  try { const cfg = prCfg(), P = prPlace(cfg), nx = prNext(cfg), { t } = prDay(new Date(), cfg);
    return `<a class="prbar panel" href="#prayer"><span class="prwho"><svg><use href="#i-time"/></svg><span><span class="eyebrow">مواقيت الصلاة · <span class="notranslate" translate="no">${esc(P.city)}</span></span><b>${prName(nx.x)} ${prFmt(nx.h, cfg.f24)}</b> <span class="muted small">${prLeft(nx.left)}</span></span></span><span class="prmini">${PR_NAMES.filter(x => x[0] !== 'sunrise').map(x => `<span${x === nx.x ? ' class="on"' : ''}><small>${prName(x)}</small>${prFmt(t[x[0]], cfg.f24)}</span>`).join('')}</span></a>`; }
  catch (e) { return ''; }
}

/* ================= أذكار الصباح والمساء: نصوص «حصن المسلم» بتخريجها ودرجتها، ويُعرض كل ورد في وقته حسب مواقيت مدينة المستخدم (دون إنترنت) */
const ADHKAR = [{"id":"kursi","k":"b","c":1,"g":0,"q":[[2,255,255]],"pre":"أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ","v":"من قالها حين يصبح أُجير من الجن حتى يمسي، ومن قالها حين يمسي أُجير منهم حتى يصبح.","s":"الحاكم (1/562)، وصححه الألباني في صحيح الترغيب والترهيب (1/273)"},{"id":"baqara","k":"e","c":1,"g":0,"q":[[2,285,286]],"v":"من قرأ بالآيتين من آخر سورة البقرة في ليلة كفتاه.","s":"البخاري (5009)، ومسلم (807)"},{"id":"quls","k":"b","c":3,"g":1,"q":[[112,1,4],[113,1,5],[114,1,6]],"v":"من قالها حين يصبح وحين يمسي ثلاث مرات كفته من كل شيء.","s":"أبو داود (5082)، والترمذي (3575)، وانظر صحيح الترمذي (3/182)"},{"id":"mulk","k":"b","c":1,"g":0,"tm":"أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذَا الْيَوْمِ وَخَيْرَ مَا بَعْدَهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذَا الْيَوْمِ وَشَرِّ مَا بَعْدَهُ، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ","te":"أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ، رَبِّ أَسْأَلُكَ خَيْرَ مَا فِي هَٰذِهِ اللَّيْلَةِ وَخَيْرَ مَا بَعْدَهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِي هَٰذِهِ اللَّيْلَةِ وَشَرِّ مَا بَعْدَهَا، رَبِّ أَعُوذُ بِكَ مِنَ الْكَسَلِ وَسُوءِ الْكِبَرِ، رَبِّ أَعُوذُ بِكَ مِنْ عَذَابٍ فِي النَّارِ وَعَذَابٍ فِي الْقَبْرِ","v":"كان النبي ﷺ يقوله إذا أصبح وإذا أمسى.","s":"مسلم (2723)"},{"id":"bika","k":"b","c":1,"g":0,"tm":"اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ","te":"اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ","v":"كان النبي ﷺ يعلّمه أصحابه.","s":"الترمذي (3391)، وأبو داود (5068)، وانظر صحيح الترمذي (3/142)"},{"id":"sayyid","k":"b","c":1,"g":0,"t":"اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ، أَعُوذُ بِكَ مِنْ شَرِّ مَا صَنَعْتُ، أَبُوءُ لَكَ بِنِعْمَتِكَ عَلَيَّ، وَأَبُوءُ بِذَنْبِي فَاغْفِرْ لِي، فَإِنَّهُ لَا يَغْفِرُ الذُّنُوبَ إِلَّا أَنْتَ","v":"سيد الاستغفار: من قاله موقناً به حين يمسي فمات من ليلته دخل الجنة، وكذلك إذا أصبح.","s":"البخاري (6306)"},{"id":"ushhid","k":"b","c":4,"g":2,"tm":"اللَّهُمَّ إِنِّي أَصْبَحْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَٰهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّداً عَبْدُكَ وَرَسُولُكَ","te":"اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ، وَأُشْهِدُ حَمَلَةَ عَرْشِكَ، وَمَلَائِكَتَكَ، وَجَمِيعَ خَلْقِكَ، أَنَّكَ أَنْتَ اللَّهُ لَا إِلَٰهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ، وَأَنَّ مُحَمَّداً عَبْدُكَ وَرَسُولُكَ","v":"من قالها أربع مرات أعتقه الله من النار.","s":"أبو داود (5069)، وحسّن إسناده ابن باز في تحفة الأخيار","n":"وضعّفه الألباني."},{"id":"nima","k":"b","c":1,"g":2,"tm":"اللَّهُمَّ مَا أَصْبَحَ بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ","te":"اللَّهُمَّ مَا أَمْسَى بِي مِنْ نِعْمَةٍ أَوْ بِأَحَدٍ مِنْ خَلْقِكَ فَمِنْكَ وَحْدَكَ لَا شَرِيكَ لَكَ، فَلَكَ الْحَمْدُ وَلَكَ الشُّكْرُ","v":"من قالها حين يصبح فقد أدى شكر يومه، ومن قالها حين يمسي فقد أدى شكر ليلته.","s":"أبو داود (5073)، وحسّن إسناده ابن باز في تحفة الأخيار","n":"وضعّفه الألباني."},{"id":"afini","k":"b","c":3,"g":1,"t":"اللَّهُمَّ عَافِنِي فِي بَدَنِي، اللَّهُمَّ عَافِنِي فِي سَمْعِي، اللَّهُمَّ عَافِنِي فِي بَصَرِي، لَا إِلَٰهَ إِلَّا أَنْتَ. اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْكُفْرِ وَالْفَقْرِ، وَأَعُوذُ بِكَ مِنْ عَذَابِ الْقَبْرِ، لَا إِلَٰهَ إِلَّا أَنْتَ","v":"كان النبي ﷺ يدعو بها كل غداة وعشية ثلاثاً.","s":"أبو داود (5090)، وأحمد (5/42)، وحسّن إسناده ابن باز في تحفة الأخيار"},{"id":"hasbi","k":"b","c":7,"g":2,"t":"حَسْبِيَ اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ عَلَيْهِ تَوَكَّلْتُ وَهُوَ رَبُّ الْعَرْشِ الْعَظِيمِ","v":"من قالها حين يصبح وحين يمسي سبع مرات كفاه الله ما أهمّه من أمر الدنيا والآخرة.","s":"أبو داود (5081) موقوفاً على أبي الدرداء، وصحّح إسناده شعيب وعبد القادر الأرناؤوط في تحقيق زاد المعاد (2/376)","n":"والصحيح أنه موقوف، ولفظه ثابت في القرآن (التوبة 129)."},{"id":"afw","k":"b","c":1,"g":0,"t":"اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ، اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي دِينِي وَدُنْيَايَ وَأَهْلِي وَمَالِي، اللَّهُمَّ اسْتُرْ عَوْرَاتِي، وَآمِنْ رَوْعَاتِي، اللَّهُمَّ احْفَظْنِي مِنْ بَيْنِ يَدَيَّ، وَمِنْ خَلْفِي، وَعَنْ يَمِينِي، وَعَنْ شِمَالِي، وَمِنْ فَوْقِي، وَأَعُوذُ بِعَظَمَتِكَ أَنْ أُغْتَالَ مِنْ تَحْتِي","v":"لم يكن النبي ﷺ يدع هؤلاء الدعوات حين يمسي وحين يصبح.","s":"أبو داود (5074)، وابن ماجه (3871)، وصححه الألباني في صحيح ابن ماجه (2/332)"},{"id":"alim","k":"b","c":1,"g":0,"t":"اللَّهُمَّ عَالِمَ الْغَيْبِ وَالشَّهَادَةِ فَاطِرَ السَّمَاوَاتِ وَالْأَرْضِ، رَبَّ كُلِّ شَيْءٍ وَمَلِيكَهُ، أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا أَنْتَ، أَعُوذُ بِكَ مِنْ شَرِّ نَفْسِي، وَمِنْ شَرِّ الشَّيْطَانِ وَشِرْكِهِ، وَأَنْ أَقْتَرِفَ عَلَىٰ نَفْسِي سُوءاً، أَوْ أَجُرَّهُ إِلَىٰ مُسْلِمٍ","v":"علّمه النبي ﷺ أبا بكر رضي الله عنه يقوله إذا أصبح وإذا أمسى وإذا أخذ مضجعه.","s":"الترمذي (3392)، وأبو داود (5067)، وانظر صحيح الترمذي (3/142)"},{"id":"bismillah","k":"b","c":3,"g":0,"t":"بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ","v":"من قالها ثلاثاً إذا أصبح وثلاثاً إذا أمسى لم يضره شيء.","s":"أبو داود (5088)، والترمذي (3388)، وابن ماجه (3869)، وحسّن إسناده ابن باز في تحفة الأخيار","n":"وصححه الألباني."},{"id":"radit","k":"b","c":3,"g":2,"t":"رَضِيتُ بِاللَّهِ رَبّاً، وَبِالْإِسْلَامِ دِيناً، وَبِمُحَمَّدٍ ﷺ نَبِيّاً","v":"من قالها حين يصبح وحين يمسي ثلاثاً كان حقاً على الله أن يرضيه يوم القيامة.","s":"أبو داود (5072)، والترمذي (3389)، وأحمد (4/337)، وحسّنه ابن باز في تحفة الأخيار","n":"وأصل الذكر صحيح في مسلم (386) عند سماع الأذان."},{"id":"hayy","k":"b","c":1,"g":1,"t":"يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ، أَصْلِحْ لِي شَأْنِي كُلَّهُ، وَلَا تَكِلْنِي إِلَىٰ نَفْسِي طَرْفَةَ عَيْنٍ","v":"أوصى به النبي ﷺ فاطمة رضي الله عنها أن تقوله إذا أصبحت وإذا أمست.","s":"الحاكم (1/545) وصححه ووافقه الذهبي، وحسّنه الألباني في صحيح الترغيب والترهيب (1/273)"},{"id":"fath","k":"b","c":1,"g":2,"tm":"أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَٰذَا الْيَوْمِ: فَتْحَهُ، وَنَصْرَهُ، وَنُورَهُ، وَبَرَكَتَهُ، وَهُدَاهُ، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهِ وَشَرِّ مَا بَعْدَهُ","te":"أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ رَبِّ الْعَالَمِينَ، اللَّهُمَّ إِنِّي أَسْأَلُكَ خَيْرَ هَٰذِهِ اللَّيْلَةِ: فَتْحَهَا، وَنَصْرَهَا، وَنُورَهَا، وَبَرَكَتَهَا، وَهُدَاهَا، وَأَعُوذُ بِكَ مِنْ شَرِّ مَا فِيهَا وَشَرِّ مَا بَعْدَهَا","s":"أبو داود (5084)، وحسّن إسناده شعيب وعبد القادر الأرناؤوط في تحقيق زاد المعاد (2/273)","n":"وضعّفه الألباني."},{"id":"fitra","k":"b","c":1,"g":0,"tm":"أَصْبَحْنَا عَلَىٰ فِطْرَةِ الْإِسْلَامِ، وَعَلَىٰ كَلِمَةِ الْإِخْلَاصِ، وَعَلَىٰ دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَىٰ مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفاً مُسْلِماً وَمَا كَانَ مِنَ الْمُشْرِكِينَ","te":"أَمْسَيْنَا عَلَىٰ فِطْرَةِ الْإِسْلَامِ، وَعَلَىٰ كَلِمَةِ الْإِخْلَاصِ، وَعَلَىٰ دِينِ نَبِيِّنَا مُحَمَّدٍ ﷺ، وَعَلَىٰ مِلَّةِ أَبِينَا إِبْرَاهِيمَ، حَنِيفاً مُسْلِماً وَمَا كَانَ مِنَ الْمُشْرِكِينَ","s":"أحمد (3/406، 407)، وابن السني في عمل اليوم والليلة (34)، وانظر صحيح الجامع (4/209)"},{"id":"subhan","k":"b","c":100,"g":0,"t":"سُبْحَانَ اللَّهِ وَبِحَمْدِهِ","v":"من قالها حين يصبح وحين يمسي مائة مرة لم يأت أحد يوم القيامة بأفضل مما جاء به، إلا أحد قال مثل ما قال أو زاد عليه.","s":"مسلم (2692)"},{"id":"tahlil10","k":"b","c":10,"g":0,"t":"لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ","v":"عشر مرات، أو مرة واحدة عند الكسل؛ ومن قالها عشراً كان كمن أعتق أربعة أنفس من ولد إسماعيل.","s":"مسلم (2693)، وانظر صحيح الترغيب والترهيب (1/272)"},{"id":"tahlil100","k":"m","c":100,"g":0,"t":"لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ","v":"مائة مرة إذا أصبح: كانت له عدل عشر رقاب، وكتبت له مائة حسنة، ومحيت عنه مائة سيئة، وكانت له حرزاً من الشيطان يومه ذلك حتى يمسي.","s":"البخاري (3293)، ومسلم (2691)"},{"id":"adad","k":"m","c":3,"g":0,"t":"سُبْحَانَ اللَّهِ وَبِحَمْدِهِ: عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ","v":"قالها النبي ﷺ لجويرية رضي الله عنها بعد صلاة الصبح، وأخبر أنها لو وُزنت بما قالت منذ اليوم لوزنتهن.","s":"مسلم (2726)"},{"id":"ilm","k":"m","c":1,"g":0,"t":"اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْماً نَافِعاً، وَرِزْقاً طَيِّباً، وَعَمَلاً مُتَقَبَّلاً","v":"كان النبي ﷺ يقوله إذا صلى الصبح حين يسلم.","s":"ابن ماجه (925)، وابن السني (54)، وصححه الألباني في صحيح ابن ماجه"},{"id":"istighfar","k":"m","c":100,"g":0,"t":"أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ","v":"كان النبي ﷺ يستغفر الله ويتوب إليه في اليوم مائة مرة.","s":"البخاري (6307)، ومسلم (2702)"},{"id":"kalimat","k":"e","c":3,"g":0,"t":"أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ","v":"من قالها حين يمسي لم يضره لدغ تلك الليلة.","s":"مسلم (2709)، وأحمد (2/290)، والنسائي في عمل اليوم والليلة (590)"},{"id":"salat","k":"b","c":10,"g":2,"t":"اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَىٰ نَبِيِّنَا مُحَمَّدٍ","v":"من صلى عليّ حين يصبح عشراً وحين يمسي عشراً أدركته شفاعتي يوم القيامة.","s":"الطبراني، وانظر مجمع الزوائد (10/120)، وصحيح الترغيب والترهيب (1/273)","n":"وفي إسناده كلام، وفضل الصلاة على النبي ﷺ ثابت في مسلم (408)."}];
const ADH_ORDER = {"m":["kursi","quls","mulk","bika","sayyid","ushhid","nima","afini","hasbi","afw","alim","bismillah","radit","hayy","fath","fitra","subhan","tahlil10","tahlil100","adad","ilm","istighfar","salat"],"e":["kursi","baqara","quls","mulk","bika","sayyid","ushhid","nima","afini","hasbi","afw","alim","bismillah","radit","hayy","fath","fitra","subhan","tahlil10","kalimat","salat"]};
const ADH_GRADE = [['صحيح', 'g0'], ['حسن', 'g1'], ['مختلف فيه', 'g2']];
const ADH_BASMALA = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
let adhSel = null; // الورد المفتوح يدوياً في هذه الجلسة
const adhTx = (id, f) => LANG === 'ar' || !I18N.dict ? null : (I18N.dict['§a.' + id + '.' + f] ?? null);
const adhList = kind => ADH_ORDER[kind].map(id => ADHKAR.find(x => x.id === id)).filter(Boolean);
const adhText = (x, kind) => x.t || (kind === 'm' ? x.tm : x.te) || '';
function adhNow(cfg) { // أيّ الوردين وقته الآن، بمواقيت مدينة المستخدم وساعتها
  const now = new Date(), { t, tz, P } = prDay(now, cfg), h = ((now.getTime() / 36e5 + tz) % 24 + 24) % 24;
  const local = ms => new Date(ms + tz * 36e5).toISOString().slice(0, 10);
  if (h >= t.fajr && h < t.asr) return { kind: 'm', ph: h < t.sunrise ? 0 : h < t.dhuhr ? 1 : 2, day: local(now.getTime()), t, P };
  return { kind: 'e', ph: h >= t.asr && h < t.maghrib ? 3 : h >= t.maghrib && h < t.isha ? 4 : 5, day: h < t.fajr ? local(now.getTime() - 864e5) : local(now.getTime()), t, P };
}
const ADH_MSG = ['أفضل وقتها الآن: من الفجر إلى طلوع الشمس.', 'وقتها الآن، وأفضله ما كان بعد الفجر.', 'يمتد وقتها عند بعض العلماء إلى العصر، فإن فاتتك فاقرأها الآن.',
  'أفضل وقتها الآن: من العصر إلى غروب الشمس.', 'وقتها الآن، ويمتد عند كثير من العلماء إلى أول الليل.', 'يمتد وقتها عند كثير من العلماء في الليل، وتبدأ أذكار الصباح مع الفجر.'];
const ADH_NEXT = [['sunrise', 'الشروق'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء'], ['fajr', 'الفجر']];
function adhProg(kind, day) { // عدّاد كل ذكر لليوم الحالي، ويبدأ من جديد مع كل ورد
  const all = LS.get('adhkar', {}) || {}, p = all[kind];
  return p && p.day === day ? p : { day, c: {} };
}
function adhSave(kind, p) { const all = LS.get('adhkar', {}) || {}; all[kind] = p; LS.set('adhkar', all); }
const adhDone = (kind, p) => adhList(kind).filter(x => (p.c[x.id] || 0) >= x.c).length;
function adhItem(x, kind, i, p) {
  const cnt = Math.min(p.c[x.id] || 0, x.c), done = cnt >= x.c, [gl, gc] = ADH_GRADE[x.g];
  let body;
  if (x.q) body = (x.pre ? `<p class="adh-pre notranslate" translate="no">${esc(x.pre)}</p>` : '') + x.q.map(([s, a1, a2]) => {
    const i1 = idxOf(s, a1), i2 = idxOf(s, a2); let h = ''; for (let k = i1; k <= i2; k++) h += esc(ayahText(k)) + ` <span class="num" data-ayah="${k}">﴿${n(Q.ayat[k][1])}﴾</span> `;
    return `${x.q.length > 1 ? `<p class="adh-pre notranslate" translate="no">${ADH_BASMALA}</p>` : ''}<div class="ayah adh-q" data-from="${i1}" data-to="${i2}">${h}<span class="adh-ref">${esc(LANG !== 'ar' && I18N.sur?.[Q.surahs[s - 1].name] || Q.surahs[s - 1].name)}</span></div>`; }).join('');
  else body = `<p class="adh-txt notranslate" translate="no">${esc(adhText(x, kind))}</p>`;
  const mean = !x.q && LANG !== 'ar' ? adhTx(x.id, x.t ? 'm' : kind) : null;
  const v = adhTx(x.id, 'v') ?? x.v, s = adhTx(x.id, 's') ?? x.s, note = x.n ? (adhTx(x.id, 'n') ?? x.n) : '';
  const nt = t => LANG !== 'ar' && !ARX.test(t) ? ' class="notranslate" translate="no"' : '';
  const copy = x.q ? [x.pre || '', ...x.q.map(([s1, a1, a2]) => { const o = []; for (let k = idxOf(s1, a1); k <= idxOf(s1, a2); k++) o.push(ayahText(k)); return (x.q.length > 1 ? ADH_BASMALA + ' ' : '') + o.join(' '); })].filter(Boolean).join('\n') : adhText(x, kind);
  return `<li class="adh-card${done ? ' done' : ''}" id="adh-${x.id}">
    <div class="adh-top"><span class="adh-n">${n(i + 1)}</span><span class="chip ${gc}">${gl}</span>${x.c > 1 ? `<span class="adh-rep">× ${n(x.c)}</span>` : ''}</div>
    ${body}
    ${mean ? `<p class="adh-mean notranslate" translate="no">${esc(mean)}</p>` : ''}
    ${v ? `<p class="adh-v"><span${nt(v)}>${esc(v)}</span></p>` : ''}
    <p class="adh-src"><b>التخريج</b>: <span${nt(s)}>${esc(s)}</span>${note ? ` <span${nt(note)}>${esc(note)}</span>` : ''}</p>
    <div class="adh-act"><button type="button" class="adh-count" data-adhc="${x.id}" aria-label="اضغط للعدّ"><b>${n(cnt)}</b><span>/ ${n(x.c)}</span></button><span class="muted small adh-tap">${done ? 'تمّت بحمد الله' : 'اضغط للعدّ'}</span><button type="button" class="btn ghost adh-copy" data-copy="${esc(copy)}" title="نسخ"><svg><use href="#i-copy"/></svg>نسخ</button></div>
  </li>`;
}
function adhkar() {
  const cfg = prCfg(), A = adhNow(cfg), kind = adhSel || A.kind, list = adhList(kind), p = adhProg(kind, A.day);
  const done = adhDone(kind, p), pct = Math.round(done / list.length * 100);
  const nx = A.kind === 'm' ? ADH_NEXT[[0, 1, 2][A.ph]] : ADH_NEXT[[3, 4, 5][A.ph - 3]];
  const tab = k => `<button type="button" role="tab" class="adh-tab ${k}" data-adhk="${k}" aria-selected="${k === kind}"><svg><use href="#${k === 'm' ? 'i-sun' : 'i-moon'}"/></svg><span>${k === 'm' ? 'أذكار الصباح' : 'أذكار المساء'}</span>${k === A.kind ? '<em class="chip ok">وقتها الآن</em>' : ''}</button>`;
  V(`<div class="stack adh ${kind}" style="max-width:920px">
    <div class="adh-head"><div><div class="eyebrow">أذكار الصباح والمساء · <span class="notranslate" translate="no">${esc(A.P.city)}</span></div><h1>${kind === 'm' ? 'أذكار الصباح' : 'أذكار المساء'}</h1>
      <p class="lead" style="margin:4px 0 0">${kind === A.kind ? `<span>${ADH_MSG[A.ph]}</span> <span class="chip"><span>${nx[1]}</span> <b class="notranslate" translate="no">${prFmt(A.t[nx[0]], cfg.f24)}</b></span>` : 'ورد الصباح والمساء من حصن المسلم بتخريجه، يظهر لك في وقته حسب مدينتك.'}</p></div>
      <a class="btn" href="#prayer"><svg><use href="#i-map"/></svg>غيّر المدينة</a></div>
    <div class="adh-tabs" role="tablist">${tab('m')}${tab('e')}</div>
    <section class="adh-prog panel"><div class="adh-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${list.length}" aria-valuenow="${done}"><i style="width:${pct}%"></i></div><span id="adhDoneTxt">${done === list.length ? 'تمّت بحمد الله' : `أتممت ${n(done)} من ${n(list.length)}`}</span><button class="btn ghost" id="adhReset" type="button">ابدأ من جديد</button></section>
    <ol class="adh-list">${list.map((x, i) => adhItem(x, kind, i, p)).join('')}</ol>
    <section class="panel stack tight adh-about"><h2>وقت الأذكار ومصادرها</h2>
      <p>قال الله تعالى: ﴿فَسُبْحَانَ اللَّهِ حِينَ تُمْسُونَ وَحِينَ تُصْبِحُونَ﴾ [الروم: 17]، وقال: ﴿وَسَبِّحْ بِحَمْدِ رَبِّكَ قَبْلَ طُلُوعِ الشَّمْسِ وَقَبْلَ الْغُرُوبِ﴾ [ق: 39].</p>
      <p>تظهر أذكار الصباح من الفجر حتى العصر، وأذكار المساء من العصر حتى الفجر، محسوبة من مواقيت الصلاة لمدينتك وتعمل دون إنترنت. وأفضل وقت الصباح ما بين الفجر وطلوع الشمس، وأفضل وقت المساء ما بين العصر والغروب، ويمكنك فتح الورد الآخر في أي وقت.</p>
      <p class="muted small" style="margin:0">النصوص من كتاب «حصن المسلم من أذكار الكتاب والسنة» للدكتور سعيد بن علي بن وهف القحطاني، وآيات القرآن من المصحف المضمّن برواية حفص. ويُذكر مع كل ذكر تخريجه ودرجته بأمانة، فما اختلف المحدثون في تصحيحه وُسم بأنه «مختلف فيه».</p>
    </section></div>`);
  $$('[data-adhk]').forEach(b => b.onclick = () => { adhSel = b.dataset.adhk; adhkar(); });
  $('#adhReset').onclick = () => { adhSave(kind, { day: p.day, c: {} }); adhkar(); };
  $$('[data-adhc]').forEach(b => b.onclick = () => {
    const x = ADHKAR.find(y => y.id === b.dataset.adhc), c = Math.min((p.c[x.id] || 0) + 1, x.c); if ((p.c[x.id] || 0) >= x.c) return;
    p.c[x.id] = c; adhSave(kind, p); b.querySelector('b').textContent = n(c);
    try { navigator.vibrate?.(c >= x.c ? [30, 40, 30] : 12); } catch (e) {}
    if (c >= x.c) { const li = b.closest('.adh-card'); li.classList.add('done'); li.querySelector('.adh-tap').textContent = 'تمّت بحمد الله';
      const d = adhDone(kind, p), bar = $('.adh-bar'); bar.setAttribute('aria-valuenow', d); bar.firstElementChild.style.width = Math.round(d / list.length * 100) + '%';
      $('#adhDoneTxt').textContent = d === list.length ? 'تمّت بحمد الله' : `أتممت ${n(d)} من ${n(list.length)}`;
      const nxt = li.parentElement.querySelector('.adh-card:not(.done)'); if (nxt) setTimeout(() => nxt.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250); }
  });
}
function adhHomeCard() {
  try { const cfg = prCfg(), A = adhNow(cfg), list = adhList(A.kind), d = adhDone(A.kind, adhProg(A.kind, A.day)), m = A.kind === 'm';
    return `<a class="adhbar panel ${A.kind}" href="#adhkar"><span class="adh-ic"><svg><use href="#${m ? 'i-sun' : 'i-moon'}"/></svg></span><span class="adh-hb"><span class="eyebrow">وقتها الآن</span><b>${m ? 'أذكار الصباح' : 'أذكار المساء'}</b><span class="adh-bar sm"><i style="width:${Math.round(d / list.length * 100)}%"></i></span><span class="muted small">${d === list.length ? 'تمّت بحمد الله' : `أتممت ${n(d)} من ${n(list.length)}`}</span></span><span class="btn primary">${d ? 'أكمل الورد' : 'ابدأ الورد'}</span></a>`; }
  catch (e) { return ''; }
}
function adhChip() {
  try { const A = adhNow(prCfg()), m = A.kind === 'm';
    return `<a class="adh-chip ${A.kind}" href="#adhkar"><svg><use href="#${m ? 'i-sun' : 'i-moon'}"/></svg><span>${m ? 'أذكار الصباح' : 'أذكار المساء'}</span><em>وقتها الآن</em></a>`; }
  catch (e) { return ''; }
}

/* ================= languages: picker, English UI dictionary, Google Translate for other languages, approved meaning translations */
const I18N = { dict: null, sur: null, idx: [], mean: null, meanCode: '', miss: new Map(), outs: new Set(), mtOn: false, dictCode: '' };
const ARX = /[؀-ۿ]/, DIGRX = /[0-9٠-٩][0-9٠-٩٬,.٫]*/g;
const toLat = s => s.replace(/[٠-٩]/g, d => d.charCodeAt(0) - 1632).replace(/٬/g, ',').replace(/٫/g, '.');
const GT_CODE = { he: 'iw', jv: 'jw', prs: 'fa-AF', kmr: 'ku', ku: 'ckb', 'zh-CN': 'zh-CN', 'zh-TW': 'zh-TW', tl: 'tl', ber: 'ber' };
const I18N_SKIP = '.ayah,.num,.mean,.notranslate,[translate="no"],script,style,textarea,code,.langlist';
const langRow = c => I18N.idx.find(r => r[0] === c);
const isRTL = c => c === 'ar' || !!(langRow(c) || [])[4];
let surRx = null;
// صيغ العدد العربية تُردّ إلى رقم + مفرد قبل البحث في القاموس
const CNT0 = [[/آية واحدة/g, '1 آية'], [/آيتين|آيتان/g, '2 آية'], [/([0-9٠-٩][0-9٠-٩٬,.٫]* )آيات/g, '$1آية'], [/مرة واحدة/g, '1 مرة'], [/مرتين|مرتان/g, '2 مرة'], [/([0-9٠-٩][0-9٠-٩٬,.٫]* )مرات/g, '$1مرة'],
  [/حديث واحد/g, '1 حديث'], [/حديثين|حديثان/g, '2 حديث'], [/([0-9٠-٩][0-9٠-٩٬,.٫]* )(?:أحاديث|حديثاً)/g, '$1حديث'], [/صيغة واحدة/g, '1 صيغة'], [/صيغتين/g, '2 صيغة'], [/([0-9٠-٩][0-9٠-٩٬,.٫]* )صيغ(?!ة)/g, '$1صيغة'],
  [/واحدة مكية/g, '1 مكية'], [/اثنتان مكيتان/g, '2 مكية'], [/واحدة مدنية/g, '1 مدنية'], [/اثنتان مدنيتان/g, '2 مدنية']];
const CNT = CNT0.map(([re, r]) => [new RegExp('(?<![\\u0600-\\u06FF])' + re.source, 'g'), r]);
function trRx(c) {
  if (I18N.rx) for (const [re, out] of I18N.rx) { const g = c.match(re); if (!g) continue; let bad = false;
    const r = out.replace(/\$(\d)/g, (_, i) => g[i] ?? '').replace(/%(\d)/g, (_, i) => { if (g[i] == null || g[i] === '') return ''; const t = ARX.test(g[i]) ? trKey(g[i]) : g[i]; if (t == null) bad = true; return t ?? ''; });
    if (!bad) return r; }
  return null;
}
function trLookup(k) {
  const d = I18N.dict; if (d[k] != null) return d[k];
  const m = k.match(/^([·•→←(«﴿\s-]*)(.*?)([·•→←)»﴾:.،؛\s-]*)$/); if (!m || !m[2]) return trRx(k);
  const [, pre, core, suf] = m;
  // the suffix may hold a closing bracket that belongs to the text: try the text with it first
  const s2 = suf.match(/^[)»﴾]*/)[0], core2 = core + s2, suf2 = suf.slice(s2.length), pre2 = pre.endsWith('(') && s2 ? pre : pre;
  for (const [c, sf] of (s2 ? [[core2, suf2], [core, suf]] : [[core, suf]])) {
    const v = d[c] ?? trRx(c);
    if (v != null) return pre2 + v + sf.replace(/،/g, ',').replace(/؛/g, ';');
  }
  return null;
}
function trKey(k) {
  let v = trLookup(k); if (v != null) return v;
  if (surRx) { const names = []; const k3 = k.replace(surRx, (m, a) => { names.push(I18N.sur[a]); return '@'; }); if (names.length) { v = trLookup(k3); if (v != null) { let q = 0; return v.replace(/@(\d+)?/g, (m, i) => (i ? names[i - 1] : names[q++]) ?? ''); } } }
  for (const sep of [' | ', ' · ', ' — ', '؛ ', '، ', ': ', ' و']) if (k.includes(sep)) { const parts = k.split(sep).map(p => ARX.test(p) ? trKey(p) : p); if (parts.every(p => p != null)) return parts.join(sep === '، ' ? ', ' : sep === '؛ ' ? '; ' : sep === ' و' ? ' and ' : sep); }
  return null;
}
function trStr(s) {
  if (!ARX.test(s) || !I18N.dict) return null;
  let k = s.replace(/\s+/g, ' ').trim(); for (const [re, r] of CNT) k = k.replace(re, r);
  const nums = []; k = k.replace(DIGRX, m => { nums.push(toLat(m)); return '#'; });
  if (!k) return null;
  let v = trKey(k);
  if (v == null) { if (!I18N.quiet && k.length < 400 && k.replace(/[\s#]/g, "").length > 2 && !/^[A-Za-z(«]/.test(k) && !/[\u064B-\u0652\u06E1]/.test(k) && !/^(\S )+\S$/.test(k)) I18N.miss.set(k, (I18N.miss.get(k) || 0) + 1); return null; }
  let j = 0; v = v.replace(/#(\d+)?/g, (m, i) => (i ? nums[i - 1] : nums[j++]) ?? '').replace(/\b1 (verse|time|hadith|form|surah|word|letter|root|passage|result|place|entr|index|node|link)(?:e?s|ies)\b/g, (m, w) => '1 ' + (w === 'entr' ? 'entry' : w === 'index' ? 'index' : w));
  if (document.documentElement.dir === 'ltr') v = v.replace(/[→←]/g, c => c === '→' ? '←' : '→');
  return (/^\s/.test(s) ? ' ' : '') + v + (/\s$/.test(s) ? ' ' : '');
}
function trText(t) {
  const o = t.nodeValue; if (!o || I18N.outs.has(o) || !ARX.test(o)) return;
  const v = trStr(o); if (v != null) { I18N.outs.add(v); t.nodeValue = v; return; }
  mtQueue(t);
}
/* ترجمة النصوص الطويلة غير الموجودة في القاموس (التفاسير والأحاديث والأخبار) عند الاتصال، مع حفظها على الجهاز */
const MT = { q: new Map(), t: 0, st: 0, cache: null };
function mtCache() { if (!MT.cache) { try { MT.cache = JSON.parse(localStorage.getItem('quran-mt-' + LANG) || '{}'); } catch (e) { MT.cache = {}; } } return MT.cache; }
function mtSave() { clearTimeout(MT.st); MT.st = setTimeout(() => { try { let s = JSON.stringify(MT.cache); if (s.length > 3e6) { MT.cache = {}; s = '{}'; } localStorage.setItem('quran-mt-' + LANG, s); } catch (e) {} }, 1500); }
function mtApply(nd, src, v) { if (!nd.isConnected || nd.nodeValue !== src) return; const out = (/^\s/.test(src) ? ' ' : '') + v + (/\s$/.test(src) ? ' ' : ''); I18N.outs.add(out); nd.nodeValue = out; }
function mtQueue(nd) {
  const src = nd.nodeValue, k = src.replace(/\s+/g, ' ').trim(), bare = k.replace(/[\s\d٠-٩#.,:;()«»﴿﴾،؛-]/g, '');
  if (bare.length < 3 || /^(\S )+\S$/.test(k) || (k.length < 40 && /[ً-ْٰۡ]/.test(k))) return; // الحروف والجذور وألفاظ المصحف تبقى بالعربية
  const c = mtCache()[k]; if (c != null) return mtApply(nd, src, c);
  if (!I18N.mtOn) return;
  let e = MT.q.get(k); if (!e) MT.q.set(k, e = []); e.push([nd, src]);
  clearTimeout(MT.t); MT.t = setTimeout(mtFlush, 200);
}
function mtSplit(k) { if (k.length <= 4000) return [k]; const out = []; let cur = ''; for (const s of k.split(/(?<=[.!؟?،:])\s+/)) { if (cur && cur.length + s.length > 3800) { out.push(cur); cur = ''; } cur += (cur ? ' ' : '') + s; } if (cur) out.push(cur); return out.flatMap(x => x.length > 4000 ? x.match(/[\s\S]{1,3800}/g) : [x]); }
async function mtFlush() {
  const entries = [...MT.q.entries()].map(([k, nodes]) => ({ k, nodes, parts: mtSplit(k), res: [] })); MT.q.clear();
  const flat = entries.flatMap(e => e.parts.map((p, i) => [e, i, p]));
  const tl = GT_CODE[LANG] || LANG;
  for (let i = 0; i < flat.length;) {
    const b = []; let n = 0; while (i < flat.length && b.length < 60 && (!b.length || n + flat[i][2].length < 4500)) { n += flat[i][2].length; b.push(flat[i++]); }
    try {
      const body = new URLSearchParams(); b.forEach(x => body.append('q', x[2]));
      const r = await fetch(`https://translate.googleapis.com/translate_a/t?client=gtx&sl=ar&tl=${encodeURIComponent(tl)}`, { method: 'POST', body });
      if (!r.ok) throw new Error(r.status);
      let j = await r.json(); if (!Array.isArray(j)) j = [j]; if (b.length === 1 && j.length !== 1) j = [j];
      j = j.map(x => Array.isArray(x) ? x[0] : x);
      b.forEach(([e, pi], z) => { e.res[pi] = j[z]; });
    } catch (err) { if (!navigator.onLine) I18N.mtOn = false; }
  }
  for (const e of entries) { if (e.res.length !== e.parts.length || e.res.some(x => !x)) continue; const v = e.res.join(' '); MT.cache[e.k] = v; e.nodes.forEach(([nd, src]) => mtApply(nd, src, v)); }
  mtSave();
}
function trNode(root) {
  if (!I18N.dict || !root) return;
  if (root.nodeType === 3) { const p = root.parentElement; if (p && !p.closest(I18N_SKIP)) trText(root); return; }
  if (root.nodeType !== 1 || root.closest(I18N_SKIP)) return;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, { acceptNode: x => x.nodeType === 1 ? (x.matches(I18N_SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP) : NodeFilter.FILTER_ACCEPT });
  let x; const list = []; while (x = tw.nextNode()) list.push(x);
  for (const t of list) { I18N.quiet = !!t.parentElement?.closest('blockquote,.snip,.tafsir,#tbody,#gbody,.rq,.wtable td:nth-child(2)'); trText(t); }
  I18N.quiet = false;
  for (const el of [root, ...root.querySelectorAll('[placeholder],[title],[aria-label],input[type=button],input[type=submit]')]) {
    if (el.closest(I18N_SKIP)) continue;
    for (const a of ['placeholder', 'title', 'aria-label']) { const o = el.getAttribute && el.getAttribute(a); if (o && ARX.test(o) && !I18N.outs.has(o)) { const v = trStr(o); if (v != null) { I18N.outs.add(v.trim()); el.setAttribute(a, v.trim()); } } }
    if (el.type === 'button' || el.type === 'submit') { const v = el.value && trStr(el.value); if (v) el.value = v.trim(); }
  }
}
/* معنى الآية بلغة الزائر تحت النص العربي، من ترجمة معتمدة مضمّنة (لا ترجمة آلية للقرآن) */
function addMeanings(root) {
  if (!I18N.mean || !root || root.nodeType !== 1) return;
  const els = root.matches?.('.ayah') ? [root] : [...root.querySelectorAll('.ayah')];
  for (const el of els) {
    if (el.dataset.mean || el.id === 'hzText' || el.classList.contains('basmala')) continue;
    let ids = [];
    if (el.dataset.from) { for (let k = +el.dataset.from; k <= +el.dataset.to; k++) ids.push(k); }
    else { const nm = el.querySelector('.num[data-ayah]'); if (nm) ids = [+nm.dataset.ayah]; }
    if (!ids.length) continue;
    el.dataset.mean = '1';
    const r = langRow(I18N.meanCode) || [];
    const box = document.createElement('div'); box.className = 'mean notranslate'; box.translate = false; box.setAttribute('translate', 'no');
    box.dir = r[4] ? 'rtl' : 'ltr'; box.lang = I18N.meanCode;
    box.innerHTML = ids.map(i => esc(I18N.mean[i] || '')).join(' ') + `<span class="mean-src">${esc(r[1] || '')} · ${esc(r[2] || '')}</span>`;
    el.after(box);
  }
}
function setLang(c) { if (!FILE_MODE) { const dir = location.pathname.replace(/[^/]*$/, ''); document.cookie = `googtrans=;path=${dir};expires=Thu, 01 Jan 1970 00:00:00 GMT`; } try { if (c === 'ar') localStorage.removeItem('quran-lang'); else localStorage.setItem('quran-lang', c); } catch (e) {} location.reload(); }
function langMenu() {
  const opt = (c, nm, sub, rtl, cls = '') => `<button class="langopt${cls}${c === LANG ? ' on' : ''}" data-lang="${c}" lang="${c}" aria-pressed="${c === LANG}"><span class="lang-code" dir="ltr">${esc(c.split('-')[0].toUpperCase())}</span><span class="lang-txt"><b dir="${rtl ? 'rtl' : 'ltr'}">${esc(nm)}</b><small dir="ltr">${esc(sub)}</small></span>${c === LANG ? '<svg class="lang-ok" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}</button>`;
  const rest = I18N.idx.filter(r => r[0] !== 'en');
  openDrawer(`<div class="stack langlist notranslate" translate="no">
  <div class="lang-head"><svg class="lang-globe"><use href="#i-globe"/></svg><div><h2>اللغة <span class="lang-sep">·</span> <span dir="ltr">Language</span></h2><p class="muted small">اختر لغة المنصة <span class="lang-sep">·</span> <span dir="ltr">Choose your language</span></p></div></div>
  <div class="lang-main">${opt('en', 'English', 'Main language', 0, ' big')}${opt('ar', 'العربية', 'اللغة الأساسية', 1, ' big')}</div>
  <div class="lang-sec"><span>لغات أخرى</span><span dir="ltr">Other languages · ${rest.length}</span></div>
  <input type="search" id="langQ" placeholder="ابحث عن لغة · Search" aria-label="ابحث عن لغة">
  <div class="langgrid" id="langGrid">${rest.map(r => opt(r[0], r[1], r[5], r[4])).join('')}</div>
  <p class="muted small lang-note">النص القرآني يبقى بالعربية دائماً، وتُعرض تحته ترجمة معتمدة لمعانيه بكل لغة. <span dir="ltr">The Arabic Quran text is never machine-translated; an approved translation of its meanings appears below it.</span></p></div>`);
  $('.langlist').onclick = e => { const b = e.target.closest('[data-lang]'); if (b) setLang(b.dataset.lang); };
  $('#langQ').oninput = e => { const q = e.target.value.trim().toLowerCase(); $$('#langGrid .langopt').forEach(b => { b.hidden = q && !b.textContent.toLowerCase().includes(q) && !b.dataset.lang.startsWith(q); }); };
}
async function i18nInit() {
  const btn = $('#langBtn'); if (btn) { btn.onclick = langMenu; const lb = $('#langCode'); if (lb) lb.textContent = LANG === 'ar' ? 'ع' : LANG.split('-')[0].toUpperCase(); }
  try { I18N.idx = await getJSON('data/tr/index.json'); } catch (e) { I18N.idx = []; }
  if (LANG === 'ar') return;
  const html = document.documentElement, rtl = isRTL(LANG);
  html.lang = LANG; html.dir = rtl ? 'rtl' : 'ltr'; html.classList.add('i18n', rtl ? 'i18n-rtl' : 'i18n-ltr');
  const loadDict = async code => { if (I18N.dict) return true; try { const d = await getJSON(`data/i18n/${code}.json`); I18N.sur = d.__surahs; I18N.rx = (d.__rx || []).map(([a, b]) => [new RegExp('^' + a + '$'), b]); delete d.__surahs; delete d.__rx; I18N.dict = d; I18N.dictCode = code;
    const names = Object.keys(I18N.sur).sort((a, b) => b.length - a.length).map(x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    surRx = new RegExp(`(?<![\\u0600-\\u06FF])(${names.join('|')})(?=:? #|$|[،؛)﴾]| ←| →)`, 'g'); return true; } catch (e) { return false; } };
  // المعاني: لغة الزائر إن وُجدت لها ترجمة معتمدة، وإلا الإنجليزية
  I18N.meanCode = langRow(LANG) ? LANG : 'en';
  const meanP = gz(`data/tr/${I18N.meanCode}.txt`).then(m => { I18N.mean = m; addMeanings(document.body); }).catch(() => {});
  // واجهة مترجمة مضمّنة لكل لغة (تعمل دون إنترنت)، والإنجليزية بديلاً إن لم تتوفر
  if (!(await loadDict(LANG)) && LANG !== 'en') { await loadDict('en'); html.dir = 'ltr'; html.classList.replace('i18n-rtl', 'i18n-ltr'); }
  I18N.mtOn = navigator.onLine;
  addEventListener('online', () => { I18N.mtOn = true; trNode(document.body); });
  new MutationObserver(ms => { for (const m of ms) for (const x of m.addedNodes) if (x.nodeType === 1 && !x.closest?.('.mean')) addMeanings(x); }).observe(document.body, { childList: true, subtree: true });
  const obs = new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') { trNode(m.target); continue; } for (const x of m.addedNodes) trNode(x); } });
  trNode(document.body); document.title = trStr(document.title)?.trim() || document.title; obs.observe(document.body, { childList: true, subtree: true, characterData: true });
  return meanP;
}

/* ================= boot */
async function connectCloud() {
  if (IS_PWA || !window.claude?.use) return;
  try {
    const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]);
    if (user) { isOwner = await user.isOwner().catch(() => false); if (isOwner) drawNav(); }
    if (!db) return;
    db.doc('site/config').get().then(s => { const v = s?.data?.() ?? s?.data ?? null; if (v) { siteCfg = v; applyCfg(); if (!LAB && (location.hash || '#home') === '#home') home(); } }).catch(() => {});
    const uid = user && await user.id().catch(() => null); if (!uid) return;
    cloud = { db, uid };
    const snap = await db.doc(`data/users/${uid}/state/main`).get().catch(() => null);
    const remote = snap ? (typeof snap.data === 'function' ? snap.data() : snap.data) : null;
    if (remote && remote.updated > (ST.updated || 0)) { Object.assign(ST, cleanState({ ...remote })); LS.set(stateKey(), ST); applyPrefs(); }
    else if (ST.updated) save();
    const h = (location.hash || '#' + HOME).slice(1); if (['home', 'saved', 'settings', 'hifz', 'research', 'mine'].includes(h)) route();
  } catch (e) {}
}
applyPrefs(); drawNav(); if (IS_PWA) $('#acctBtn').hidden = false; { const b = $('#instTop'); if (b) b.onclick = installApp; instBarInit(); instTopShow(); }
const i18nReady = i18nInit().catch(() => {});
(async () => {
  try {
    if (LANG !== 'ar') await Promise.race([i18nReady, new Promise(r => setTimeout(r, 3000))]);
    [Q, W, T, TF, GEO] = await Promise.all([gz('data/quran.txt'), gz('data/words.txt'), gz('data/topics.txt'), getJSON('data/tafsir.json'), getJSON('data/geo.json')]);
    prep();
    if (IS_PWA) { try { const base = await getJSON('config.json').catch(() => ({})), pv = LS.get('cfgPreview', null); siteCfg = pv && (pv.updated || 0) > (base.updated || 0) ? pv : base; applyCfg(); } catch (e) {} checkSession(); }
    route(); connectCloud(); i18nReady.then(offlineAuto);
  } catch (err) { V(`<p class="loading">تعذّر تحميل البيانات. يتطلب التطبيق متصفحاً حديثاً (كروم أو سفاري أو فايرفوكس أو إيدج). ${esc(err.message)}</p>`); }
})();
/* التحديث التلقائي: عند نشر نسخة جديدة يثبّتها عامل الخدمة ثم تُعاد الصفحة مرة واحدة، فيرى الزائر الجديد دون إعادة تحميل يدوية */
if (IS_PWA && 'serviceWorker' in navigator && !FILE_MODE) {
  const hadSW = !!navigator.serviceWorker.controller; let swReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!hadSW || swReloaded) return; swReloaded = true; location.reload(); });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => { const up = () => reg.update().catch(() => {}); document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') up(); }); setInterval(up, 30 * 60 * 1000); }).catch(() => {});
}
