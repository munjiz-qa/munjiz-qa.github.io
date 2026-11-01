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
  Object.assign(ST, { bookmarks: [], last: null, hifz: {}, research: [], prefs: { tafsir: 'muyassar', size: 1, theme: 'auto' }, updated: 0 }, LS.get(stateKey(), {}));
  ST.prefs = Object.assign({ tafsir: 'muyassar', size: 1, theme: 'auto' }, ST.prefs || {});
  cleanState(ST);
}
loadState();
let cloud = null; // {db, uid}
let saveTimer = 0;
/* تنقية البيانات المحفوظة أو المستوردة: أرقام آيات صحيحة فقط، فلا يمر أي نص إلى الصفحة */
function isAyahIx(v) { return Number.isInteger(v) && v >= 0 && v < 6236; }
function cleanHifz(h) { const o = {}; if (h && typeof h === 'object') for (const [k, v] of Object.entries(h)) { if (!/^\d{1,3}:\d{1,3}-\d{1,3}$/.test(k) || !v || typeof v !== 'object') continue; const r = {}; for (const f of ['ef', 'int', 'reps', 'due', 'last']) if (Number.isFinite(+v[f])) r[f] = +v[f]; o[k] = r; } return o; }
function cleanState(x) {
  x.bookmarks = [...new Set((Array.isArray(x.bookmarks) ? x.bookmarks : []).map(Number).filter(isAyahIx))];
  x.last = isAyahIx(x.last) ? x.last : null;
  x.hifz = cleanHifz(x.hifz);
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

/* ================= data loading */
const FILE_MODE = location.protocol === 'file:';
if (IS_PWA && !FILE_MODE && window.top !== window.self) { document.documentElement.hidden = true; document.documentElement.style.display = 'none'; try { window.top.location.replace(location.href); } catch (e) {} } // لا تُعرض المنصة داخل إطار موقع آخر
window.__ATH = window.__ATH || {};
function scriptData(url) { // file:// pages cannot fetch(); every data file also ships as a .js twin
  if (window.__ATH[url] != null) return Promise.resolve(window.__ATH[url]);
  return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = url + '.js'; sc.onload = () => { const v = window.__ATH[url]; delete window.__ATH[url]; sc.remove(); v == null ? rej(new Error(url)) : res(v); }; sc.onerror = () => rej(new Error(url)); document.head.appendChild(sc); });
}
/* سلامة البيانات: بصمة SHA-256 لكل ملف بيانات تُضمَّن في app.js عند البناء، ويُرفض أي ملف معدَّل */
const INTEGRITY = {"data/geo.json":"3a381595551873cb2f5612b47aa211a2","data/hadith/abudawud.txt":"add164bbe53224463598b5d5a8771d84","data/hadith/bukhari.txt":"a40d9810e6718b084f4a75ceb094331a","data/hadith/ibnmajah.txt":"8b9a2ecdbd11ad5aebdd3ded1dd5bf95","data/hadith/muslim.txt":"c422cf76a7e81044477b76bc052474a0","data/hadith/nasai.txt":"ca0303322e9a8b85c8beb942f8c55cce","data/hadith/tirmidhi.txt":"3cc7c7bada84ef1fa49d06e5f9666930","data/i18n/aa.json":"50b9e60fb2379b4e8d55afa2c08dd269","data/i18n/ace.json":"cf4dba87a3a19c1edb6e8c85c7a979c9","data/i18n/af.json":"10998ab8bf5f2cb6bb7919603cc7011d","data/i18n/am.json":"43ba73dad73cbbcf47db3ff790970700","data/i18n/as.json":"47ac145eee934a9bc1f6604540dfda6a","data/i18n/az.json":"889414ada09d587245b44789b39219fa","data/i18n/ber.json":"e6614244654315fbd7028772de7db84e","data/i18n/bg.json":"4bc87fc8e45e8f7cd41d1a65b5cd1f66","data/i18n/bm.json":"3d8629f321a3b45f6c032004b256a81a","data/i18n/bn.json":"5deb52acaaed197ece198d13e1750c5d","data/i18n/bs.json":"7b421f250a86d3975e45cda815c4200d","data/i18n/ca.json":"12769a743c07b0342cb48f0aee2146ea","data/i18n/cs.json":"8a46d35d827cba0908f9dd54f7a69dcf","data/i18n/da.json":"7403f8490d24d39ae1f0e6fee9a20478","data/i18n/de.json":"ac085b65124626a1b205da03ad5ecc6f","data/i18n/dv.json":"9f7946ead4aff7dc76dc44b0533a1a89","data/i18n/en.json":"b7643bdc2f520cf250b311940df45ecf","data/i18n/eo.json":"d6e4d5a423d3d8850228d44b4f2aa916","data/i18n/es.json":"18f6439f45d2561bcf2aa95059acf778","data/i18n/fa.json":"3b7e95d4826124311e5aeb7e400bd466","data/i18n/ff.json":"029fe9e4c89adc963e13f2baa8e3e56b","data/i18n/fi.json":"3f352c3e8b3c2a5bdb3626d5ee42b433","data/i18n/fr.json":"f239d9afe724b289fe60743b0adf873c","data/i18n/gu.json":"336deb363a9ba457efab8cd38d8549f9","data/i18n/ha.json":"d4defc91447e37c489ecf6f00c6af99e","data/i18n/he.json":"a969cddf014ad68cd4dc757682027771","data/i18n/hi.json":"04375eb41354bd3f6d5f68edf778a7fe","data/i18n/hr.json":"d511f9a3dd519c39355761ad8bb0d07b","data/i18n/hu.json":"2c2b006387894438a8d6d860d3b828a0","data/i18n/id.json":"ce82079a043cdc08c5360e14712e848e","data/i18n/it.json":"ecd89fd67985db4c7d5b7988b0a8bf4c","data/i18n/ja.json":"f6e421d61a6b63dc30fdff85460fa515","data/i18n/jv.json":"7d6e7ab3b2ae150007580bc570872d97","data/i18n/kk.json":"86e4243513278f0a28d9de2189e33960","data/i18n/km.json":"9a97d41cdd64855512256a5342dc127e","data/i18n/kmr.json":"909668e80bb3c819dd4e682d0c1cc4b2","data/i18n/kn.json":"fdb9435d8ce48a763282aab03f8556af","data/i18n/ko.json":"eff40aec434e390c16d52369715891d4","data/i18n/ku.json":"80b4fe166ee7e6d634e458a6b0ef9620","data/i18n/ky.json":"ff1f97644df2d2f0b24c4324ff1fa2fe","data/i18n/la.json":"c2f2a7dc5e17f071cd171880337c601b","data/i18n/lg.json":"5eedcc614983c8705791b41f42cb0110","data/i18n/ln.json":"6462b52842912893fe9761b8beb738f8","data/i18n/mk.json":"93d1bbed96395967ca5957f54d919d39","data/i18n/ml.json":"d1a46d97d0136fc1d9a8cc591df2c26b","data/i18n/mr.json":"01b19657902e02fe7d7b7bb3bdd473d4","data/i18n/ms.json":"a42b74f46a1bb8a74a512dc546add810","data/i18n/mt.json":"37cf0aa6ef52c4dd41470bcfbd8b6b1b","data/i18n/my.json":"2d4b68f51f2638d192b3f0468b8f28eb","data/i18n/ne.json":"756c53e7a3fc718da8091ee60caa1c28","data/i18n/nl.json":"5fcf788c8729966386c0095486464dcb","data/i18n/no.json":"97e403954f2bb440ea8a81b4d5e8a23b","data/i18n/ny.json":"946113a56f92b82e1f9db2fd905c8266","data/i18n/om.json":"e7fc3e0e510afccb390dde940b4276a6","data/i18n/pa.json":"391590f96fbba834f71c069dd49b449c","data/i18n/pl.json":"f986de0c858875d032c5cf590de9a12a","data/i18n/prs.json":"635551b35dddbe8803d924d7f3494474","data/i18n/ps.json":"4638b9b08d1fe8fb76c5bcd3f5ae1117","data/i18n/pt.json":"0cc3c81d8df553e3f96ccdf6d24a6519","data/i18n/rn.json":"5659bbbae3a162221c8542188f085a6e","data/i18n/ro.json":"a468c2f4a182d01b4c85d68155f4c075","data/i18n/ru.json":"09085ef0e7aea1d6f1711047137415d0","data/i18n/rw.json":"aa1f9b43c300a28316bee6aac198ef4b","data/i18n/sd.json":"c82a366fe3bc159c9b4b7ccf43e54d31","data/i18n/si.json":"ca0d12077580009e6fa8a45304d81d6f","data/i18n/sk.json":"c168e9537b2e3362144bbd8652932b13","data/i18n/sn.json":"a93b8232d97fc52eb851531ad5b499d8","data/i18n/so.json":"626ee228432faba07e7c87545133a352","data/i18n/sq.json":"78b7027f7f285a4cf99939f260b49b44","data/i18n/sr.json":"584f25058b6f2b67098c46786b88c6b1","data/i18n/st.json":"2717f9ef6ac911852a10bed3e5478f8f","data/i18n/sv.json":"600f38d22c2c99df07c6a3c85f5dc067","data/i18n/sw.json":"c221b96d015219695197581808631dae","data/i18n/ta.json":"041029ecbae88a5bf49478016035dfaa","data/i18n/te.json":"bb39294591116bd59bb395f5a24236b3","data/i18n/tg.json":"df83a287820e888cf528bcdce9e54cc6","data/i18n/th.json":"78605d6d2345358c30ee150d3b6b801d","data/i18n/tl.json":"29ebb3697da0b170aa61d408e675387d","data/i18n/tr.json":"64e603d55be53cca13b8e6eef01a72a4","data/i18n/tt.json":"2796e9de507e65e1da7152e2026ed8cf","data/i18n/tw.json":"0bdb534c63b830df52d97effb4a220f6","data/i18n/ug.json":"0a8f5588073aa35b93c8fa8217dadae8","data/i18n/uk.json":"566b2df07639feabf71a717520cad965","data/i18n/ur.json":"15b5c97d8347d58c93cbdce08945e17f","data/i18n/uz.json":"fa07172accc507fea7f39cdace3cd9c6","data/i18n/vi.json":"bbe1605894d727733ec40b397f59a9d2","data/i18n/xh.json":"6ef03e816dffe1566f40e448c295023f","data/i18n/yo.json":"cacc5ea1b053b5a6a2dcf7486df82791","data/i18n/zh-CN.json":"a4a1a786c728daa784db9fd04918a2c0","data/i18n/zh-TW.json":"152d7c9c11ab629dfa5059fa0bd35dad","data/i18n/zu.json":"f89bd5a02a9e8b075c89831af6d9b833","data/qasas.txt":"80574a78941b3c892f213076faad4111","data/quran.txt":"7e5e37a5ed56a512f434350824aa0fa0","data/t/baghawi/0.txt":"7faae25c408cdc26625a7524dca815dc","data/t/baghawi/1.txt":"30173aa5f1fcbd954b9c6bbe45f5d617","data/t/baghawi/10.txt":"7565e6bbed96f16acbb42cefb8f6facb","data/t/baghawi/11.txt":"71e2d5e8f78fb0c30444bec7ad107c84","data/t/baghawi/12.txt":"888811ec46d136bbb3a035eb60d3ff4a","data/t/baghawi/2.txt":"513bb1d9ff2ed425e78d7ab105fafff7","data/t/baghawi/3.txt":"6722e346ca4db204bb7ea92742106176","data/t/baghawi/4.txt":"b437112f9c51d6ea6431837820a05e37","data/t/baghawi/5.txt":"79474312a9168d04530565d73706d72b","data/t/baghawi/6.txt":"8e2c637220c8e6648348f34347c9420e","data/t/baghawi/7.txt":"f10d852add588e55be80e13f2c5335e7","data/t/baghawi/8.txt":"49a1e3d8b1f4660a617b1c810831d907","data/t/baghawi/9.txt":"e4150e87e5db7780c7edb5c4aa9fa309","data/t/gharib/0.txt":"d9643ca7a9e4b3ce54b4536016862492","data/t/ibnkathir/0.txt":"b9f71c8ea4bb6e1a69fa220d922ba81f","data/t/ibnkathir/1.txt":"fef628ff6ab2f8a4249d7b59df680303","data/t/ibnkathir/10.txt":"e9ebcbec4bea5c58332eb26073fd73a2","data/t/ibnkathir/11.txt":"f3ee0d04b0a9c7d651ad34ddc8123418","data/t/ibnkathir/12.txt":"1b976a9e445704d32cf4ec797b96dd91","data/t/ibnkathir/13.txt":"4a6e87593ff4eed81f39ee4deabf020f","data/t/ibnkathir/14.txt":"ac43f8a575ad304fa0bb3525f19b7e67","data/t/ibnkathir/15.txt":"45cd62ec8ea417752e9786b865f8264d","data/t/ibnkathir/16.txt":"3196b23811704529f697ca2fab7230bf","data/t/ibnkathir/17.txt":"f58d8af171c28b480eee69c1e356120e","data/t/ibnkathir/18.txt":"909ab1ac7fae9a08fb67839be52ac345","data/t/ibnkathir/19.txt":"aae865c0f16344a551d3d4010db57e48","data/t/ibnkathir/2.txt":"1bcc4c9bf088ba4c6549d31d6c65eb51","data/t/ibnkathir/20.txt":"6ac5ccb14fba012f687eab70ae563803","data/t/ibnkathir/21.txt":"0b4ef942c43911f1a835815148399ff2","data/t/ibnkathir/22.txt":"e84bcff9a5ea04a2962d5f8b0ff0a1c6","data/t/ibnkathir/23.txt":"896608268ed7e2dc1d954510b16da876","data/t/ibnkathir/24.txt":"07573e0b9362fb51206c28cb6b09b2fc","data/t/ibnkathir/25.txt":"700eb9a4166fd9dd7847252660d74065","data/t/ibnkathir/26.txt":"b289aa3fba775ab933f6608abfe2dbf0","data/t/ibnkathir/27.txt":"e62aa99726ffe79233750c372a02ff18","data/t/ibnkathir/28.txt":"3482541f88ba219443368dcb5102b57e","data/t/ibnkathir/3.txt":"960ab05782deedd3ef636cdfbc156770","data/t/ibnkathir/4.txt":"35e3fa721824520a834d44c6d5fd021b","data/t/ibnkathir/5.txt":"73c13ea42fb37331500cc1a58e07ef6b","data/t/ibnkathir/6.txt":"86e4d3270a53c4444376bea4a86d62da","data/t/ibnkathir/7.txt":"1f0bc0f74f005b942a3ac90b677ae0ff","data/t/ibnkathir/8.txt":"198963d3a1028799c8c685c7084a92ec","data/t/ibnkathir/9.txt":"40dca06d4a4dca7d1cd7aed5678d855a","data/t/jalalayn/0.txt":"808c69712a35d920348120a32cc4b136","data/t/muyassar/0.txt":"c3638ff74728fac6db2a4dcb0d48a12b","data/t/qurtubi/0.txt":"350fbe701785ef42832a49971fd1334f","data/t/qurtubi/1.txt":"69b49609871dfd2e6721fe5b73a95364","data/t/qurtubi/10.txt":"4746ae89f4d87ac3e306fdd3cf938899","data/t/qurtubi/11.txt":"22d9e2f4d222f6fff050ccc4e5fc547d","data/t/qurtubi/12.txt":"e5096a9d84fe5cacdcfb0359f8a4cc68","data/t/qurtubi/13.txt":"a58c6c63dde97bb84f7a46b683b849d5","data/t/qurtubi/14.txt":"ce8e23ae2ac906081de1b026fb4c9567","data/t/qurtubi/15.txt":"e744ea365fb4342a28b2dcd64746f006","data/t/qurtubi/16.txt":"01143d68d66d86db10578d4c5ecc70f7","data/t/qurtubi/17.txt":"f6dc50f4b1f9b7bfda020b181d39c510","data/t/qurtubi/18.txt":"ff81fe5ac87c70538649ceda4a48b719","data/t/qurtubi/19.txt":"3124580bba03ba9dd95ebea99fbb5702","data/t/qurtubi/2.txt":"1953f016d7c806d93d52735c287565d1","data/t/qurtubi/20.txt":"28a9138224c69f482a3ca7cecd64f61f","data/t/qurtubi/21.txt":"b44810e2e2ede712c16d9199ad0a9ac3","data/t/qurtubi/22.txt":"79cab53b39c91e66fab8f37959534e22","data/t/qurtubi/23.txt":"5e9e1cfd7184680a449c250372dd7ce1","data/t/qurtubi/24.txt":"c653c0a8f6a990ed3b06b1303c759111","data/t/qurtubi/25.txt":"f5acf4b4a21aabf020ca4aba50a92657","data/t/qurtubi/26.txt":"5ea26baecf62c5d2ebe1be03f6cc1045","data/t/qurtubi/3.txt":"adc1f2f78cd7a9ea701bb51c7bf2c6c6","data/t/qurtubi/4.txt":"781145f3a0c186c59941f0ca572230cd","data/t/qurtubi/5.txt":"7817db8a204a04f3dddd55240424811e","data/t/qurtubi/6.txt":"ad7e4d93acf6dd023f9f95dce6cd1cc9","data/t/qurtubi/7.txt":"9a8f5186741a80f43f758731c35a4229","data/t/qurtubi/8.txt":"084bc82055350254ac76ca9a582a133a","data/t/qurtubi/9.txt":"5d90458dc5b353c1789f8fb6b6acf30e","data/t/saadi/0.txt":"db815b6ddf5247c31372571e22bfb43a","data/t/saadi/1.txt":"3d675d6e1261c291a050367e8d45c742","data/t/saadi/10.txt":"e3f7b8585d6a1f4d7309a96452115505","data/t/saadi/11.txt":"b2f05d6d2fe897cbfa2c271019916eb9","data/t/saadi/12.txt":"e2625e384fe7395ea7432cdd57d80859","data/t/saadi/2.txt":"33af5b1e2a623c71522b73c2142f2d9a","data/t/saadi/3.txt":"51e53bcd9da2ef33e7b9cde87192b4b7","data/t/saadi/4.txt":"97848b26daa977c4215bc016c4e0196c","data/t/saadi/5.txt":"fb54c7c851141be805e91baa38788762","data/t/saadi/6.txt":"925ee23ae0b1b6f52198d86070cd7d9a","data/t/saadi/7.txt":"b1bcce418884d9eb3bcc2648ecdd84b9","data/t/saadi/8.txt":"03baf29844f76e727280c8faa0e11fae","data/t/saadi/9.txt":"2996a21ab899675d6f74348c527fa48f","data/t/tabari/0.txt":"21aea58e4dfb5cf145507d2a65586a10","data/t/tabari/1.txt":"0386493b0bef93a33f2274b4b8a80f77","data/t/tabari/10.txt":"0a625c3387aca8f7c13e952e7e94720d","data/t/tabari/11.txt":"5d0799a3601daa5e8c1aec5274d80347","data/t/tabari/12.txt":"ce3a4c2baa7e524dd75a9424d167569d","data/t/tabari/13.txt":"ab83e444f25790ff1a14040e16f1eb91","data/t/tabari/14.txt":"c956aa1a645a4befab9e016f1be572b9","data/t/tabari/15.txt":"4cb17f0859f4ab1341a70c45fe46f242","data/t/tabari/16.txt":"194c32676e1ff9452f800df13e997f5e","data/t/tabari/17.txt":"53865d3c86e98520de55ed698c66831f","data/t/tabari/18.txt":"828b76964e337cfa99665ef86acae45c","data/t/tabari/19.txt":"efeef96b7069d3a4352b4e1e5df670dc","data/t/tabari/2.txt":"b46845e07001e4add5abbca72182bf29","data/t/tabari/3.txt":"1b87a27cfe412d44b769a2b409eacbca","data/t/tabari/4.txt":"a0d883cec1eb493dfd4ce203d1b578b8","data/t/tabari/5.txt":"2bd32bc0e11391cd722b76c128094b34","data/t/tabari/6.txt":"167a05d5d934f10837804d98ab768877","data/t/tabari/7.txt":"b2b8e3353dbe8095e67174d6462b9208","data/t/tabari/8.txt":"79ed4d3197d54d2be60f6a8641be4b73","data/t/tabari/9.txt":"785500a3787ff62fc2194836b913e75a","data/tafsir.json":"0b340e92baea2ad150cc24986aefa196","data/topics.txt":"f68fb424e69865b75d9893a3cc68b132","data/tr/aa.txt":"6db3f725119a862fd48797cce594cb57","data/tr/ace.txt":"ebf7a0ce6077a8901d6991216968663e","data/tr/af.txt":"8cb3ff29d1deaf6952dd8dd1bd89469b","data/tr/am.txt":"5a62b3361537d47cf5d239cc4069ceaa","data/tr/as.txt":"bf36c16a778a210cb47134b1ddeb3a05","data/tr/az.txt":"b81701f24c2642e1f11816f73ec88b0f","data/tr/ber.txt":"1147bd28aa6dacc8f569c3ebeb461d0a","data/tr/bg.txt":"ddc0e9863a6f6c464e7fb260f29f46b5","data/tr/bm.txt":"329ed374f974c2a3c2661c7dad03d788","data/tr/bn.txt":"732b3afea91619f7406c68f3baf9acb3","data/tr/bs.txt":"895f5cd361874e0936541ffcf3ddef7c","data/tr/ca.txt":"b9adb72e9dfccad8ab48a1ba9ea2ee17","data/tr/cs.txt":"f56a8b99d853965b420441c9f559b0cd","data/tr/da.txt":"514cdf5202023bce0b9fa3a8e5ea450d","data/tr/dag.txt":"7f6dfc22d3dd0e682742fed3a67a5633","data/tr/de.txt":"3b554c9ab374d00d3ad8dd1d25c2da22","data/tr/dv.txt":"823e9e42083e852b06af3971058dbe8f","data/tr/en.txt":"68759abc70885f8ad84a6d35f58e8b59","data/tr/eo.txt":"e1ddfc523837ec5d8ce5f537f86f3540","data/tr/es.txt":"2e12b4b315a45fc4114764570bc05ac9","data/tr/fa.txt":"739de532508ebeb86f99e68c8500d634","data/tr/ff.txt":"ac4fce5af3c6a7bddd61eb7c03e75b76","data/tr/fi.txt":"5a2734bbc9c60ebbfea035274df02306","data/tr/fr.txt":"514d96682aebd7702dceeb3d95761229","data/tr/gu.txt":"8c1f6f0683737da9bad96153254be6fe","data/tr/ha.txt":"244bb98e4fbfc091f495d3fed55415d1","data/tr/he.txt":"e23b9e3510a0dd9c905d02e711fbd780","data/tr/hi.txt":"2e49c1c92ccb8e49a5c2853d94ec076b","data/tr/hr.txt":"8f52e215197d759197fbd177f7aac08c","data/tr/hu.txt":"9f1d09f4ecb83a7803450a8621371279","data/tr/id.txt":"ce0a3dbb5aaf5b071e4cf7ab81442df0","data/tr/ilp.txt":"9769844d7a19d990b18a112dbc58b442","data/tr/index.json":"bbb5abf5e6429c81e43dfa27739aaafc","data/tr/it.txt":"6fd9d367ffa96feacf10637dbeb15057","data/tr/ja.txt":"76bbe7bb7fb8820b9657beab10b55b75","data/tr/jv.txt":"e6e4faa4b17a44bdb58c3a1e4147555e","data/tr/kk.txt":"3351bf98c181f76c762b2b8ed17506ec","data/tr/km.txt":"3f398183d1248948bb833bde66887a05","data/tr/kmr.txt":"01b8a56c2f518d8090462cc995451bdf","data/tr/kn.txt":"b971aad35b50a36473e0060bcbef8f40","data/tr/knx.txt":"ec559ff35338ae4c82ae7f2df3a12992","data/tr/ko.txt":"3d480d78fdb593eb8b93c15a03981796","data/tr/ku.txt":"4a593acdb3fb3bdc7dc39aa262bd880c","data/tr/ky.txt":"b3ab45d73e9c91456109906e0e0ec684","data/tr/la.txt":"5713c542ce930b7d38b10ac59fdb2edb","data/tr/lg.txt":"f47be5e9e031f55633d08ceeb035672d","data/tr/ln.txt":"0a03ea925fa25343fccd14ff99b4bd7b","data/tr/luy.txt":"dce0ce3054d84f82fb3461a604a65643","data/tr/mk.txt":"5e09a28b9ea6c5872b645a70267b9e58","data/tr/ml.txt":"d6f04a27acd0732ad574197606219dd9","data/tr/mr.txt":"81267e60b4f42938b3a96f119beb17b5","data/tr/mrw.txt":"16aa33b43dc194d2b0d6c395d0d2ef3f","data/tr/ms.txt":"9339cd81b318a107de562ec94ff8d770","data/tr/mt.txt":"ce5f84c2d34b1f99dfb3f239d275ac90","data/tr/my.txt":"e02cb7e9b7960c2f00c33c02c18af9dc","data/tr/ne.txt":"31744c329d68eb08b5fd759e5bc5b7da","data/tr/nl.txt":"fd1a0f11b46a5d520be1fd45217e69bb","data/tr/no.txt":"e8ccab3ce5aff3fae250e4672871082f","data/tr/ny.txt":"82d02cfc3d450874c34398cd1aa10145","data/tr/om.txt":"c85c0d03278e472017cd4374095843bf","data/tr/pa.txt":"f1cfe18b5ee847276ac13d950c893d5d","data/tr/pl.txt":"d182460edec7b416ee45908417b13a8c","data/tr/prs.txt":"9de1463afbef144a37007fc347fc871b","data/tr/ps.txt":"8641a133150303e2c80baa4b13db5b4e","data/tr/pt.txt":"1128c4e578f250e1d7aebfcffbb479c2","data/tr/rn.txt":"5995763ec5e3a7dd21aa8a821c2754c3","data/tr/ro.txt":"3790733ce253647107e46dec267df6df","data/tr/ru.txt":"3a2ee252097bdffa7ab2343ab5a59ecf","data/tr/rw.txt":"380e41a1a83091847be114f95ea436f8","data/tr/sd.txt":"cad418daf644fe9eb82b5db466c14335","data/tr/si.txt":"e35ed062b53090cf4ef6d8f32f5eced5","data/tr/sk.txt":"22f6bae04ffc51c129df4007de32e28f","data/tr/sn.txt":"62fc72ece9072859eb5057dbe668a5f8","data/tr/so.txt":"18b6658ee7de4f4583091c38dfe34068","data/tr/sq.txt":"c919b1f7737a51d8d6c0e20de35bd98c","data/tr/sr.txt":"43716edda5709333c54d40d6b5c8bb94","data/tr/st.txt":"29e7a76cfa9478bb5607b1d93364a417","data/tr/sv.txt":"e2e9ef9491c4975873773aae18107ef7","data/tr/sw.txt":"e4e4becf8ea3be702b516c4860d9fdcb","data/tr/ta.txt":"b64bef347d184666505efb640a79d692","data/tr/te.txt":"fd13ec7ac64f3fa0314a4ce137e0491d","data/tr/tg.txt":"7269bc4d31c63b02bd51a869bb5dd4ea","data/tr/th.txt":"398f48130ac7395152df8c7309d52633","data/tr/tl.txt":"a04af6ca1fa790972d074daa7ea83179","data/tr/tr.txt":"1916c2a115b3da0fd22c5dad367dda6b","data/tr/tt.txt":"92e96de81be9d68fc24a822eb2ea2850","data/tr/tw.txt":"885dbbf376d5a870ce52485d628809f1","data/tr/ug.txt":"232ed978b1a1158fc4c141586e8ea308","data/tr/uk.txt":"5fe630290c5af71fdbdb2bc8e29f19b3","data/tr/ur.txt":"966e68c7d4d0215f39bbb74695fe7a29","data/tr/uz.txt":"ff35602979a11f6c0a693883f5f07eb6","data/tr/vi.txt":"36fca7fdb1cc524253758129a915b455","data/tr/xh.txt":"1df1342445407e592cd7c24bc583a027","data/tr/yao.txt":"e4fb3735b05e1295f30962322f13debc","data/tr/yo.txt":"411cfeb0e30045b121ff674926cbfaba","data/tr/zh-CN.txt":"d49c39b253674555663e80a97ded9feb","data/tr/zh-TW.txt":"6797c91ed8b7af21a5f8b87a337b46f9","data/tr/zu.txt":"03b06a023c1d15befb46bb774e046b61","data/words.txt":"6108e9bdb76a8465b9e167a416c10031"};
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
  ['المختبر', [['research','بحث جديد','i-flask'],['mine','أبحاثي','i-bookmark'],['prayer','مواقيت الصلاة','i-time',1]]],
  ['أدوات التحقق', [['mushaf','المصحف','i-book'],['words','المعجم المفهرس','i-abc']]],
  ['التطبيق', [['guide','دليل المختبر','i-info'],['account','حسابي','i-user'],['settings','الإعدادات','i-gear'],['admin','لوحة الإدارة','i-shield']]],
] : [
  ['', [['home','الرئيسية','i-home']]],
  ['اقرأ وتدبّر', [['mushaf','المصحف','i-book'],['search','البحث بالمعنى','i-search'],['ask','اسأل مشكاة','i-spark'],['topics','الموسوعة الموضوعية','i-grid']], 'p1'],
  ['احفظ وتعبّد', [['hifz','الحفظ والتسميع','i-mic'],['saved','محفوظاتي','i-bookmark'],['prayer','مواقيت الصلاة','i-time']], 'p2'],
  ['ابحث وحقّق', [['research','مختبر الأبحاث','i-flask'],['words','المعجم المفهرس','i-abc'],['stats','الإحصاء العام','i-chart']], 'p3'],
  ['اكتشف وتأمّل', [['awwalin','أخبار الأولين والآخرين','i-scroll'],['ijaz','الإعجاز العلمي','i-atom'],['map','أطلس القرآن','i-map'],['timeline','الخط الزمني','i-time'],['graph','شبكة المعرفة','i-graph']], 'p4'],
  ['التطبيق', [['guide','دليل التطبيق','i-info'],['about','المنهج والمصادر','i-info'],['account','حسابي','i-user'],['settings','الإعدادات','i-gear'],['admin','لوحة الإدارة','i-shield']]],
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
    ['mushaf', 'i-book', 'المصحف', 'رواية حفص بخط واضح، مع التفسير والمعاني لكل آية.', () => `${n(Q.surahs.length)} سورة`],
    ['search', 'i-search', 'البحث بالمعنى', 'اكتب الفكرة بلغتك، فتظهر الآيات الأقرب إليها مرتبةً.', () => `${n(Q.ayat.length)} آية`],
    ['ask', 'i-spark', 'اسأل مشكاة', 'سؤالك يُجاب من الآيات وأقوال المفسرين والمداخل الموضوعية.', () => ''],
    ['topics', 'i-grid', 'الموسوعة الموضوعية', 'الأنبياء والأقوام والأماكن والأحكام، كل موضوع بآياته.', () => `${n(T.length)} فهرساً`]]],
  ['p2', 'احفظ وتعبّد', 'رفيقك اليومي: حفظ بخطة مراجعة، وعلامات، ومواقيت الصلاة.', [
    ['hifz', 'i-mic', 'الحفظ والتسميع', 'إخفاء تدريجي، واختبار بالكتابة والصوت، وجدول مراجعة.', () => ''],
    ['saved', 'i-bookmark', 'محفوظاتي', 'الآيات التي علّمتها ومقاطع حفظك في مكان واحد.', () => `${n(ST.bookmarks.length)} علامة`],
    ['prayer', 'i-time', 'مواقيت الصلاة', 'حسب بلدك ومذهبك، مع اتجاه القبلة والتاريخ الهجري.', () => '']]],
  ['p3', 'ابحث وحقّق', 'أدوات الباحث: أبحاث موثقة، ومعجم الألفاظ والجذور، والإحصاء.', [
    ['research', 'i-flask', 'مختبر الأبحاث', 'بحث كامل في أي موضوع من الآيات والتفاسير والصحاح، بمصادره.', () => ''],
    ['words', 'i-abc', 'المعجم المفهرس', 'كل لفظ وجذر في المصحف بمواضعه وصيغه.', () => `${n(W.roots.length)} جذراً`],
    ['stats', 'i-chart', 'الإحصاء العام', 'السور والكلمات والحروف وأقسام الكلم بالأرقام الموثقة.', () => `${n(W.w.length)} كلمة`]]],
  ['p4', 'اكتشف وتأمّل', 'رحلة في أخبار القرآن وآياته الكونية، على الخريطة والزمن.', [
    ['awwalin', 'i-scroll', 'أخبار الأولين والآخرين', 'قصص الأمم السابقة وأخبار الغيب الآتي، من الآيات.', () => ''],
    ['ijaz', 'i-atom', 'الإعجاز العلمي', 'آيات الكون والإنسان مع درجة كل قول ومصادره.', () => ''],
    ['map', 'i-map', 'أطلس القرآن', 'خريطة للمدن والقرى والأماكن الواردة في القرآن.', () => ''],
    ['timeline', 'i-time', 'الخط الزمني', 'الأنبياء على ترتيب المؤرخين، وأحداث السيرة بسنواتها.', () => ''],
    ['graph', 'i-graph', 'شبكة المعرفة', 'علاقات الأنبياء بأقوامهم وأماكنهم والسور.', () => '']]],
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
const views = { prayer, home: LAB ? research : home, mine: () => research(null, true), mushaf, stats, words, topics, search, ask, hifz, saved, map: atlas, timeline, graph, settings, about, admin, guide, account, awwalin, ijaz, research };
function route() {
  const h = (location.hash || '#' + HOME).slice(1);
  let m, cur;
  curRoute = /^(s|a)\d/.test(h) ? 'mushaf' : /^t-/.test(h) ? 'topics' : /^(root|lem)\d/.test(h) ? 'words' : h;
  if (m = h.match(/^s(\d+)$/)) { cur = 'mushaf'; surah(+m[1]); }
  else if (m = h.match(/^a(\d+)-(\d+)$/)) { cur = 'mushaf'; surah(+m[1], +m[2]); }
  else if (m = h.match(/^t-([a-z]+)$/)) { cur = 'topics'; topic(m[1]); }
  else if (m = h.match(/^root(\d+)$/)) { cur = 'words'; rootView(+m[1]); }
  else if (m = h.match(/^lem(\d+)$/)) { cur = 'words'; lemmaView(+m[1]); }
  else { cur = views[h] ? h : HOME; if (LAB && cur === 'home') cur = 'research'; if (LAB && cur === 'about') cur = 'guide'; if (LAB && !['research', 'mine', 'prayer', 'mushaf', 'words', 'guide', 'account', 'settings', 'admin'].includes(cur)) cur = 'research'; views[cur](); }
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
  const hr = new Date().getHours(), greet = hr < 12 ? 'صباح الخير' : 'مساء الخير';
  const QUICK = ['الصبر على البلاء', 'بر الوالدين', 'التوكل على الله', 'الرزق', 'التوبة'];
  V(`<div class="stack home2">
  <div class="hero2">
    <section class="welcome">
      <div class="wl-pat" aria-hidden="true"></div>
      <span class="eyebrow">${greet}${SESSION ? ' · ' + esc(SESSION.name) : ''}</span>
      <h1>القرآن الكريم بين يديك: اقرأ، وابحث، وتدبّر</h1>
      <p class="lead">موسوعة واحدة تجمع المصحف وتفاسيره، والبحث بالمعنى، والحفظ، والأبحاث الموثقة، تعمل على جهازك دون إنترنت.</p>
      <form class="wl-search" id="homeQ" role="search"><svg><use href="#i-search"/></svg><input type="search" id="homeQi" placeholder="عمّ تبحث في القرآن؟ اكتب فكرة أو كلمة" aria-label="ابحث في القرآن"><button class="btn primary" type="submit">ابحث</button></form>
      <div class="wl-chips"><span class="muted small">جرّب:</span>${QUICK.map(q => `<button type="button" class="chip" data-hq="${esc(q)}">${esc(q)}</button>`).join('')}</div>
    </section>
    <section class="daily stack tight"><div class="eyebrow">${siteCfg.featured ? 'آية مختارة' : 'آية اليوم'} · ${esc(ref(di))}</div>
      ${ayahHTML(di, null, false)}
      ${siteCfg.featuredNote ? `<p style="margin:0;opacity:.9">${esc(siteCfg.featuredNote)}</p>` : ''}
      <div class="toolbar"><button class="btn" data-ayah="${di}">التفسير</button><button class="btn" data-card="${di}"><svg><use href="#i-image"/></svg>بطاقة للمشاركة</button><a class="btn" href="#a${Q.ayat[di][0]}-${Q.ayat[di][1]}">في سياقها</a></div>
    </section>
  </div>
  <div class="today">
    ${prHomeCard()}
    <div class="mine3">
      ${last != null ? `<a class="mcard" href="#a${Q.ayat[last][0]}-${Q.ayat[last][1]}"><svg><use href="#i-book"/></svg><span><small>أكمل القراءة</small><b>${esc(ref(last))}</b></span></a>` : `<a class="mcard" href="#mushaf"><svg><use href="#i-book"/></svg><span><small>ابدأ القراءة</small><b>افتح المصحف</b></span></a>`}
      <a class="mcard" href="#hifz"><svg><use href="#i-mic"/></svg><span><small>مراجعة اليوم</small><b>${n(due.length)} مقطع</b></span></a>
      <a class="mcard" href="#saved"><svg><use href="#i-bookmark"/></svg><span><small>علاماتك</small><b>${n(ST.bookmarks.length)} آية</b></span></a>
    </div>
    <div class="pill-row acct-row">${cloud ? '<span class="chip ok">تقدّمك محفوظ في حسابك ويتزامن بين أجهزتك</span>' : SESSION ? `<a class="chip ok" href="#account">حسابك: ${esc(SESSION.name)} · ${ROLE[SESSION.role]}</a>` : IS_PWA ? '<span class="chip">تقدّمك محفوظ على هذا الجهاز</span><a class="chip acc" href="#account">ادخل إلى حسابك</a>' : '<span class="chip">تقدّمك محفوظ على هذا الجهاز</span>'}${IS_PWA && installEvt ? '<button class="chip acc" id="homeInst">ثبّت مشكاة على جهازك</button>' : ''}</div>
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
  $$('[data-hq]').forEach(b => b.onclick = () => go(b.dataset.hq));
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
      <div class="toolbar"><button class="btn" id="instBtn" ${installEvt ? '' : 'hidden'}>ثبّت ${BRAND} على هذا الجهاز</button></div>
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
  $('#impGo').onclick = () => { try { const d = cleanState(JSON.parse(decodeURIComponent(escape(atob($('#impBox').value.trim()))))); ST.bookmarks = [...new Set([...ST.bookmarks, ...d.bookmarks])]; Object.assign(ST.hifz, d.hifz); if (d.last != null) ST.last = d.last; save(); $('#dataMsg').textContent = 'استُورد تقدّمك بنجاح.'; } catch (e) { $('#dataMsg').textContent = 'الرمز غير صحيح. انسخه كاملاً ثم أعد المحاولة.'; } };
  let armed = false; $('#clrBtn').onclick = () => { if (!armed) { armed = true; $('#clrBtn').textContent = 'اضغط مرة أخرى للتأكيد'; return; } ST.bookmarks = []; ST.hifz = {}; ST.last = null; save(); $('#dataMsg').textContent = 'مُسحت بياناتك.'; $('#clrBtn').textContent = 'مسح كل بياناتي'; armed = false; };
  const ib = $('#instBtn'); if (ib) ib.onclick = async () => { if (!installEvt) return; installEvt.prompt(); await installEvt.userChoice; installEvt = null; ib.hidden = true; };
  const da = $('#dlAll'); if (da) da.onclick = async () => {
    const files = [...TF.flatMap(b => Array.from({ length: b.chunks }, (_, k) => `data/t/${b.key}/${k}.txt`)), ...Object.keys(HAD_BOOKS).map(k => `data/hadith/${k}.txt`)]; let done = 0; da.disabled = true;
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
applyPrefs(); drawNav(); if (IS_PWA) $('#acctBtn').hidden = false;
const i18nReady = i18nInit().catch(() => {});
(async () => {
  try {
    if (LANG !== 'ar') await Promise.race([i18nReady, new Promise(r => setTimeout(r, 3000))]);
    [Q, W, T, TF, GEO] = await Promise.all([gz('data/quran.txt'), gz('data/words.txt'), gz('data/topics.txt'), getJSON('data/tafsir.json'), getJSON('data/geo.json')]);
    prep();
    if (IS_PWA) { try { const base = await getJSON('config.json').catch(() => ({})), pv = LS.get('cfgPreview', null); siteCfg = pv && (pv.updated || 0) > (base.updated || 0) ? pv : base; applyCfg(); } catch (e) {} checkSession(); }
    route(); connectCloud();
  } catch (err) { V(`<p class="loading">تعذّر تحميل البيانات. يتطلب التطبيق متصفحاً حديثاً (كروم أو سفاري أو فايرفوكس أو إيدج). ${esc(err.message)}</p>`); }
})();
if (IS_PWA && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
