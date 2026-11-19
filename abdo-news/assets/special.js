'use strict';
/* «تقارير خاصة» في «عبدو نيوز»: يكتب القارئ مواصفات التقرير، فيجهّزه الموقع في متصفحه ويعرضه، دون خادم ودون الرجوع إلى أي مساعد.
   - المادة: بيانات الموقع الموثّقة وحدها (الخلاصات اليومية وأرشيفها search.json، الأقسام desks.json، الدول countries.json،
     العسكري military.json، الحروب wars.json)، والتقارير الخاصة المحرَّرة في data/special/.
   - القاعدة الصارمة: لا يدخل التقرير خبر إلا بمصادره وروابطها الأصلية، وبجهتين مستقلتين على الأقل (أو ثلاث إن طلب القارئ)،
     وتُعرض درجة التحقق تحت كل بند. ما لا يحقق الشرط يُستبعد ويُذكر عدده في «حدود التقرير».
   - التصدير بزر «تقرير» (assets/report.js) والاستماع بزر «استمع» (assets/listen.js)، وكلاهما يقرأ التقرير المعروض.
   - الإحصاء: أعداد مجمّعة فقط عبر /api/hit (special، srg-<شكل>، srx-<منطقة>، sro-<تقرير محرَّر>، srn-empty)، بلا أي بيانات عن الزائر.
   - طلب تقرير محرَّر: يُرسل الوصف إلى صندوق الإدارة (/api/report بنوع special) ليعدّه فريق التحرير بالقاعدة نفسها. */
(function(){
const CFG=window.KHABAR_CONFIG||{};
const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
let LANG=document.documentElement.lang==='en'?'en':'ar';
let RL=LANG; // لغة التقرير
const L=(a,e)=>LANG==='en'?e:a;      // لغة الواجهة
const R=(a,e)=>RL==='en'?e:a;        // لغة التقرير
const MONTHS={ar:['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],en:['January','February','March','April','May','June','July','August','September','October','November','December']};
const DAYS={ar:['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],en:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']};
const fmtDate=(iso,lg,withDay)=>{lg=lg||RL;if(!iso)return '';const [y,m,d]=String(iso).slice(0,10).split('-').map(Number);if(!m)return String(iso);if(!d)return MONTHS[lg][m-1]+' '+y;const dt=new Date(Date.UTC(y,m-1,d));return (withDay?DAYS[lg][dt.getUTCDay()]+' ':'')+d+' '+MONTHS[lg][m-1]+' '+y};
const fmtMonth=(ym,lg)=>{const [y,m]=ym.split('-').map(Number);return MONTHS[lg||RL][m-1]+' '+y};
const doha=d=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
const today=()=>{const p=doha(new Date());return `${p.year}-${p.month}-${p.day}`};
const addDays=(iso,n)=>{const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
const stamp=()=>{const p=doha(new Date()),h=+p.hour;return R(`${fmtDate(today(),'ar')}، ${h%12||12}:${p.minute} ${h<12?'صباحاً':'مساءً'} بتوقيت الدوحة`,`${fmtDate(today(),'en')}, ${p.hour}:${p.minute} Doha time`)};
const countAr=(n,[one,two,few,many,hundred])=>n===1?one:n===2?two:(n%100>=3&&n%100<=10)?`${n} ${few}`:(n%100>=11)?`${n} ${many}`:`${n} ${hundred}`;
const nItems=n=>R(countAr(n,['بند واحد','بندان','بنود','بنداً','بند']),`${n} ${n===1?'item':'items'}`);
const nOut=n=>R(countAr(n,['جهة واحدة','جهتان مستقلتان','جهات مستقلة','جهة مستقلة','جهة مستقلة']),`${n} independent ${n===1?'outlet':'outlets'}`);
const nSrc=n=>R(countAr(n,['مصدر واحد','مصدران','مصادر','مصدراً','مصدر']),`${n} ${n===1?'source':'sources'}`);
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const getJSON=u=>fetch(u,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json()});

/* ---------- نصوص الواجهة ---------- */
const T={
 brand:['عبدو نيوز','Abdo News'],section:['تقارير خاصة','Special reports'],marsad:['المرصد','Marsad'],
 today:['اليوم','Today'],qatar:['قطر','Qatar'],gulf:['الخليج','The Gulf'],egypt:['مصر','Egypt'],world:['العالم','The World'],military:['القسم العسكري','Military'],wars:['الحروب الدائرة','Ongoing wars'],countries:['الأوضاع في الدول','Countries'],forecast:['التوقعات','Forecasts'],desks:['الأقسام','Desks'],special:['تقارير خاصة','Special reports'],weather:['الطقس والمناخ','Weather'],roadmap:['خريطة الطريق','Roadmap'],ledger:['الشفافية','Transparency'],saved:['المحفوظ','Saved'],about:['عن عبدو نيوز','About'],
 theme_dark:['الوضع الليلي','Dark mode'],theme_light:['الوضع النهاري','Light mode'],
 eyebrow:['تقارير خاصة','Special reports'],h1:['تقريرك الخاص، من مصادر موثّقة','Your own report, from verified sources'],
 intro:['اكتب موضوع التقرير الذي تريده، وحدّد المنطقة والفترة والمحاور والشكل، فيجهّز لك الموقع تقريراً من أخباره الموثّقة وحدها: كل بند بمصادره وروابطه الأصلية ودرجة التحقق، وما لا تؤكده جهتان مستقلتان لا يدخل التقرير. يمكنك بعدها الاستماع إليه أو تنزيله بصيغة PDF أو Word أو صورة.','Describe the report you need, then choose the region, period, coverage and format. The site builds it from its verified news only: every item carries its sources, original links and verification grade, and anything not confirmed by two independent outlets is left out. You can then listen to it or download it as PDF, Word or an image.'],
 footer_note:['كل بند في التقارير الخاصة منسوب إلى مصادره بروابط مباشرة، ولا يدخلها إلا ما أكدته جهتان مستقلتان على الأقل. الخلاصات التحريرية مبنية على البنود الموثّقة المذكورة.','Every item in special reports is attributed to its sources with direct links, and only what two independent outlets confirm is included. Editorial summaries are built on the verified items listed.']
};
const t=k=>(T[k]||[k,k])[LANG==='en'?1:0];

/* ---------- المناطق ---------- */
const EU=['أوروبا','الاتحاد الأوروبي','europe','european','eu','ألمانيا','germany','german','فرنسا','france','french','بريطانيا','المملكة المتحدة','britain','uk','united kingdom','british','إيطاليا','italy','italian','إسبانيا','spain','spanish','هولندا','netherlands','dutch','بلجيكا','belgium','بولندا','poland','polish','رومانيا','romania','اليونان','greece','greek','فنلندا','finland','السويد','sweden','النرويج','norway','الدنمارك','denmark','danish','التشيك','czech','سلوفاكيا','slovakia','سلوفينيا','slovenia','النمسا','austria','سويسرا','switzerland','swiss','البرتغال','portugal','أيرلندا','ireland','المجر','hungary','بلغاريا','bulgaria','كرواتيا','croatia','إستونيا','estonia','لاتفيا','latvia','ليتوانيا','lithuania','قبرص','cyprus','أوكرانيا','ukraine','الناتو','nato','بروكسل','brussels','برلين','berlin','باريس','paris','لندن','london','روما','rome','مدريد','madrid'];
const GULF=['الخليج','gulf','قطر','qatar','الدوحة','doha','السعودية','saudi','الرياض','riyadh','الإمارات','uae','emirates','دبي','dubai','أبوظبي','abu dhabi','الكويت','kuwait','عمان','oman','مسقط','muscat','البحرين','bahrain'];
const ME=['الشرق الأوسط','middle east','إسرائيل','israel','غزة','gaza','لبنان','lebanon','سوريا','syria','العراق','iraq','الأردن','jordan','اليمن','yemen','إيران','iran','تركيا','turkey','فلسطين','palestin','الضفة','west bank'].concat(GULF);
const AFR=['أفريقيا','إفريقيا','africa','السودان','sudan','ليبيا','libya','مصر','egypt','المغرب','morocco','الجزائر','algeria','تونس','tunisia','إثيوبيا','ethiopia','الصومال','somalia','نيجيريا','nigeria','الكونغو','congo','كينيا','kenya','مالي','mali'];
const ASIA=['آسيا','asia','الصين','china','chinese','اليابان','japan','الهند','india','باكستان','pakistan','كوريا','korea','تايوان','taiwan','إندونيسيا','indonesia','ماليزيا','malaysia','الفلبين','philippines','فيتنام','vietnam','أفغانستان','afghanistan','روسيا','russia'];
const AMER=['أمريكا','أميركا','america','الولايات المتحدة','united states','us ','usa','واشنطن','washington','ترامب','trump','كندا','canada','المكسيك','mexico','البرازيل','brazil','الأرجنتين','argentina','فنزويلا','venezuela','كولومبيا','colombia'];
const REGIONS=[
 ['all','كل العالم','The whole world',null],
 ['qatar','قطر','Qatar',['قطر','qatar','الدوحة','doha','قطري','qatari'],'qatar'],
 ['gulf','الخليج','The Gulf',GULF,'gulf'],
 ['egypt','مصر','Egypt',['مصر','egypt','القاهرة','cairo','مصري','egyptian'],'egypt'],
 ['mideast','الشرق الأوسط','Middle East',ME],
 ['europe','أوروبا','Europe',EU],
 ['asia','آسيا','Asia',ASIA],
 ['africa','أفريقيا','Africa',AFR],
 ['americas','الأمريكتان','The Americas',AMER]
];

/* ---------- تطبيع النص العربي والإنجليزي ---------- */
const norm=s=>' '+String(s||'').toLowerCase()
  .replace(/[ً-ْٰـ]/g,'').replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/ؤ/g,'و').replace(/ئ/g,'ي')
  .replace(/[^\p{L}\p{N}]+/gu,' ').replace(/\s+/g,' ').trim()+' ';
const STOP=new Set(['في','من','عن','على','الى','إلى','او','أو','و','ثم','مع','حول','بين','ذلك','هذه','هذا','التي','الذي','الذين','كل','حيث','ما','لا','قد','تم','عند','بعد','قبل','خلال','اي','أي','كما','وما','ومن','وفي','او',
 'تقرير','تقارير','التقرير','معلومات','المعلومات','المتيسره','المتيسرة','المتاحه','المتاحة','المتوفره','المتوفرة','انشطه','أنشطة','انشطة','نشاط','العامله','العاملة','العاملين','مجال','مجالات','المجالات','المجال','حيث','اخر','آخر','اخبار','أخبار','الاخبار','الأخبار','خبر','وضع','اوضاع','أوضاع','عام','عامه','شامل','مفصل','موجز','عن','الخاص','خاصه','خاصة',
 'the','a','an','of','in','on','for','and','or','to','with','by','about','from','at','as','is','are','report','reports','information','info','available','activities','activity','news','latest','overview','field','fields','sector','sectors','its','their','regarding','on','into','all']);
// مفاهيم ومرادفاتها بالعربية والإنجليزية: البحث بأي صيغة يجد الصيغ الأخرى
const CONCEPTS=[
 ['israel',['اسرائيل','اسرائيلي','اسرائيليه','الاسرائيلي','الاسرائيليه','الاسرائيليين','اسرائيليين','israel','israeli','idf','نتنياهو','netanyahu','تل ابيب','tel aviv']],
 ['europe',EU],
 ['defense',['دفاع','الدفاع','دفاعي','دفاعيه','الدفاعيه','الدفاعي','عسكري','العسكري','عسكريه','العسكريه','الجيش','جيش','defence','defense','military','army','armed forces']],
 ['arms',['سلاح','اسلحه','الاسلحه','تسليح','التسليح','صفقه','صفقات','الصفقات','صواريخ','صاروخ','ذخائر','ذخيره','مدفعيه','دبابات','مقاتلات','arms','weapon','weapons','deal','deals','contract','contracts','missile','missiles','munition','munitions','artillery','rocket','rockets','tank','tanks','fighter jet','jets']],
 ['company',['شركه','شركات','الشركات','الشركه','مصنع','مصانع','company','companies','firm','firms','maker','manufacturer','contractor','industries','الصناعات','صناعه','الصناعه','industry']],
 ['production',['تصنيع','التصنيع','انتاج','الانتاج','مشترك','المشترك','مشتركه','مشروع','مشروعات','مشاريع','production','manufacture','manufacturing','joint venture','jv','plant','factory','facility','localis','localiz','co-production']],
 ['rnd',['بحث','البحث','بحوث','تطوير','التطوير','ابتكار','الابتكار','تجارب','research','r&d','development','innovation','horizon','startup','start-up','startups']],
 ['ai',['ذكاء اصطناعي','الذكاء الاصطناعي','الذكاء','اصطناعي','artificial intelligence',' ai ','machine learning','autonomous','ذاتي','ذاتيه','مسيره','مسيرات','المسيرات','درون','drone','drones','uav','unmanned']],
 ['cyber',['سيبراني','السيبراني','سيبرانيه','السيبرانيه','الامن السيبراني','اختراق','قرصنه','تجسس','برمجيات التجسس','cyber','cybersecurity','hack','hacking','hacked','spyware','surveillance','ransomware']],
 ['security',['امن','الامن','امني','امنيه','الامنيه','security']],
 ['airdef',['دفاع جوي','الدفاع الجوي','قبه','القبه','اعتراض','حيتس','مقلاع داود','باراك','air defence','air defense','missile defence','missile defense','iron dome','arrow','david s sling','barak','intercept']],
 ['qatar',['قطر','قطري','قطريه','الدوحه','qatar','qatari','doha']],
 ['gulf',GULF],
 ['egypt',['مصر','مصري','مصريه','القاهره','egypt','egyptian','cairo']],
 ['iran',['ايران','ايراني','الايراني','طهران','iran','iranian','tehran','هرمز','hormuz']],
 ['ukraine',['اوكرانيا','اوكراني','كييف','زيلينسكي','ukraine','ukrainian','kyiv','zelensky']],
 ['russia',['روسيا','روسي','الروسي','الكرملين','بوتين','موسكو','russia','russian','kremlin','putin','moscow']],
 ['usa',['امريكا','اميركا','الامريكي','الاميركي','الامريكيه','الاميركيه','الولايات المتحده','واشنطن','ترامب','usa','u s','united states','american','washington','trump','pentagon','البنتاغون']],
 ['china',['الصين','صيني','الصيني','بكين','china','chinese','beijing']],
 ['gaza',['غزه','gaza','حماس','hamas','فلسطين','فلسطيني','palestin']],
 ['economy',['اقتصاد','الاقتصاد','اقتصادي','الاقتصادي','نمو','تضخم','التضخم','فائده','الفائده','economy','economic','growth','inflation','gdp','rate','rates','imf','صندوق النقد']],
 ['oil',['نفط','النفط','برنت','خام','غاز','الغاز','طاقه','الطاقه','اوبك','oil','brent','crude','gas','lng','energy','opec']],
 ['markets',['بورصه','البورصه','اسهم','الاسهم','مؤشر','ذهب','الذهب','دولار','الدولار','عمله','stock','stocks','shares','index','market','markets','gold','dollar','currency']],
 ['sport',['رياضه','الرياضه','كره','مباراه','منتخب','الدوري','كاس','sport','sports','football','match','league','cup','fifa']],
 ['health',['صحه','الصحه','وباء','مرض','مستشفى','لقاح','health','outbreak','disease','hospital','vaccine','who']],
 ['climate',['مناخ','المناخ','طقس','الطقس','امطار','حراره','فيضان','climate','weather','rain','heat','flood','cop31','cop']],
 ['tech',['تقنيه','التقنيه','تكنولوجيا','التكنولوجيا','رقمي','tech','technology','digital','chip','chips','semiconductor']],
 ['war',['حرب','الحرب','حروب','هجوم','غارات','قصف','معارك','war','attack','strike','strikes','fighting','offensive']],
 ['peace',['هدنه','وقف اطلاق النار','مفاوضات','وساطه','سلام','ceasefire','truce','talks','negotiation','mediation','peace']],
 ['embargo',['حظر','الحظر','عقوبات','العقوبات','قيود','تعليق','الغاء','مقاطعه','embargo','sanction','sanctions','ban','banned','restriction','suspend','suspension','cancel','cancelled','boycott']]
].map(([id,v])=>[id,[...new Set(v.map(x=>norm(x).trim()).filter(Boolean))]]);
// جذر خفيف للكلمة العربية: حذف «و» و«ال» والسوابق الشائعة واللواحق
function stem(w){w=w.trim();if(/^[a-z0-9]/.test(w))return w.length>4?w.replace(/(ies|es|s|ed|ing)$/,''):w;
  w=w.replace(/^(وال|بال|كال|فال|لل|ال|و)(?=...)/,'');if(w.length>4)w=w.replace(/^[بلكف](?=ا)/,'');w=w.replace(/(يين|يون|يه|ين|ون|ات|ها|هم|ه|ي)$/,m=>w.length-m.length>=3?'':m);return w}
function hasTerm(text,v){if(v.length<=3)return text.includes(' '+v+' ');return text.includes(v)}
// تحويل طلب القارئ إلى مفاهيم: كل مفهوم مجموعة صيغ؛ والكلمات غير المعروفة تصبح مفاهيم بجذرها
function parseQuery(q){
  const n=norm(q),found=[];const used=new Set();
  CONCEPTS.forEach(([id,vs])=>{const hit=vs.filter(v=>hasTerm(n,v));if(hit.length){found.push({id,vs});hit.forEach(h=>h.split(' ').forEach(w=>used.add(w)))}});
  n.trim().split(' ').forEach(w=>{if(!w||STOP.has(w)||used.has(w)||w.length<3)return;const s=stem(w);if(s.length<3||STOP.has(s))return;
    if(CONCEPTS.some(([,vs])=>vs.some(v=>v===w||v===s||stem(v)===s)))return;if(found.some(f=>f.id==='w:'+s))return;found.push({id:'w:'+s,vs:[s]})});
  return found;
}
function score(text,concepts){let s=0;const hits=[];for(const c of concepts){if(c.vs.some(v=>hasTerm(text,v))){s++;hits.push(c.id)}}return {s,hits}}

/* ---------- درجة التحقق ---------- */
const WIRE=/(رويترز|reuters|أسوشيتد|associated press|\bap\b|فرانس برس|afp|قنا|qna|وام|wam|واس|spa|بنا|bna|كونا|kuna|أ ش أ|mena)/i;
function party(s){const n=String(s.name||'').trim();const m=n.match(/\(([^)]+)\)/);if(m&&WIRE.test(m[1]))return m[1].toLowerCase();
  try{return new URL(s.url).hostname.replace(/^(www|m|en|ar|amp|feeds)\./,'').replace(/^(www)\./,'')}catch(e){return n.toLowerCase()}}
const outletsOf=srcs=>new Set((srcs||[]).filter(s=>s&&/^https:\/\//.test(s.url||'')).map(party).filter(Boolean)).size;
function gradeLabel(n){if(n>=3)return R(`مؤكد من ${countAr(n,['','','جهات مستقلة','جهة مستقلة','جهة مستقلة'])}`,`Confirmed by ${n} independent outlets`);if(n===2)return R('مؤكد من جهتين مستقلتين','Confirmed by two independent outlets');return R('مصدر واحد','Single source')}

/* ---------- تحميل المادة الموثّقة ---------- */
const AXES=[
 ['brief','الخلاصات اليومية وأرشيفها','Daily briefs and archive'],
 ['desks','الأقسام الموضوعية','Topic desks'],
 ['countries','الأوضاع في الدول','Countries'],
 ['military','العسكري والحروب الدائرة','Military and ongoing wars'],
 ['special','التقارير الخاصة المحرَّرة','Edited special reports']
];
const ZN={qatar:['قطر','Qatar'],gulf:['الخليج','The Gulf'],egypt:['مصر','Egypt'],world:['العالم','The World']};
let CORPUS=null,SPECIAL=null,REPORTS={},CMETA=[];
async function loadCorpus(){
  if(CORPUS)return CORPUS;
  const base='../data/';
  const [sj,dk,ct,mi,wr,sp]=await Promise.all([getJSON(base+'search.json').catch(()=>null),getJSON(base+'desks.json').catch(()=>null),getJSON(base+'countries.json').catch(()=>null),getJSON(base+'military.json').catch(()=>null),getJSON(base+'wars.json').catch(()=>null),loadIndex()]);
  const out=[];
  if(sj&&sj.items)sj.items.forEach(r=>{const [brief,zone,id,ar,en,src]=r;const sources=(src||[]).map(x=>({name:x[0],url:x[1],date:brief.slice(0,10)}));
    out.push({axis:'brief',key:'b:'+brief+':'+id,date:brief.slice(0,10),zone,ar:ar||'',en:en||'',sec:ZN[zone]||[zone,zone],link:'../#b-'+brief,sources})});
  if(dk&&dk.desks){const M=Object.fromEntries((dk.meta||[]).map(m=>[m.id,m]));Object.entries(dk.desks).forEach(([did,d])=>(d.items||[]).forEach(x=>{const m=M[did]||{};
    out.push({axis:'desks',key:'d:'+x.id,date:String(x.t||'').slice(0,10),zone:m.country==='QA'?'qatar':m.country==='EG'?'egypt':(m.group==='local'?'gulf':''),ar:x.lang==='ar'?x.title:'',en:x.lang==='en'?x.title:'',orig:x.lang,sec:[m.ar||did,m.en||did],link:'../#'+did,sources:(x.sources||[]).map(s=>({name:s.name,url:s.url,date:s.date,title:s.title}))})}))}
  if(ct&&ct.countries){CMETA=ct.meta||[];const M=Object.fromEntries(CMETA.map(m=>[m.id,m]));Object.entries(ct.countries).forEach(([cid,c])=>(c.items||[]).forEach(x=>{const m=M[cid]||{};
    out.push({axis:'countries',key:'c:'+x.id,date:String(x.t||'').slice(0,10),country:cid,cname:[m.ar||cid,m.en||cid],region:m.region,ar:x.lang==='ar'?x.title:'',en:x.lang==='en'?x.title:'',orig:x.lang,sec:[(m.ar||cid),(m.en||cid)],link:'../#c-'+cid,sources:(x.sources||[]).map(s=>({name:s.name,url:s.url,date:s.date,title:s.title}))})}))}
  if(mi&&mi.regions){const S=mi.sources||{};mi.regions.forEach(r=>(r.items||[]).forEach(x=>{const sources=(x.src||[]).map(id=>S[id]).filter(Boolean).map(s=>({name:s.en||s.ar,url:s.url,date:s.date}));
    out.push({axis:'military',key:'m:'+x.id,date:mi.date||String(mi.published||'').slice(0,10),ar:x.ar||'',en:x.en||'',region:r.id,sec:[L('العسكري: ','Military: ')+((r.name&&r.name.ar)||r.id),'Military: '+((r.name&&r.name.en)||r.id)],link:'../#military',sources})}))}
  if(wr&&wr.wars){const S=wr.sources||{};wr.wars.forEach(w=>[].concat(w.timeline||[],w.talks||[]).forEach((x,i)=>{const sources=(x.src||[]).map(id=>S[id]).filter(Boolean).map(s=>({name:s.en||s.ar||s.name,url:s.url,date:s.date}));
    out.push({axis:'military',key:'w:'+w.id+':'+i+':'+(x.date||''),date:x.date||'',ar:x.ar||'',en:x.en||'',region:w.region,sec:['الحروب: '+((w.name&&w.name.ar)||w.id),'Wars: '+((w.name&&w.name.en)||w.id)],link:'../#war-'+w.id,sources})}))}
  // التقارير الخاصة المحرَّرة: كل بند فيها مادة قابلة للبحث أيضاً
  for(const r of (sp&&sp.reports)||[]){try{const full=await loadReport(r.id);full.sections.forEach(sec=>sec.items.forEach(x=>{
    out.push({axis:'special',key:'s:'+r.id+':'+x.id,date:x.date,ar:x.ar,en:x.en,extra:[x.country&&x.country.ar,x.country&&x.country.en,x.company].join(' '),sec:[full.title.ar+': '+sec.ar,full.title.en+': '+sec.en],link:'./?r='+encodeURIComponent(r.id)+'#'+x.id,
      sources:x.src.map(id=>full.sources[id]).filter(Boolean).map(s=>({name:s.en,url:s.url,date:s.date,title:s.title}))})}))}catch(e){}}
  out.forEach(x=>{x.outlets=outletsOf(x.sources);x.n=norm([x.ar,x.en,x.extra||'',(x.sources||[]).map(s=>s.title||'').join(' '),x.cname?x.cname.join(' '):''].join(' '))});
  CORPUS=out;return out;
}
async function loadIndex(){if(SPECIAL)return SPECIAL;SPECIAL=await getJSON('../data/special/index.json').catch(()=>({reports:[]}));return SPECIAL}
async function loadReport(id){if(REPORTS[id])return REPORTS[id];const r=await getJSON('../data/special/'+encodeURIComponent(id)+'.json');REPORTS[id]=r;return r}

/* ---------- الإحصاء المجمّع ---------- */
const seen=new Set();
function hit(v){try{if(navigator.doNotTrack==='1'||seen.has(v))return;seen.add(v);const body=JSON.stringify({v:String(v).replace(/[^\w-]/g,'').slice(0,40)});const u=(CFG.API||'')+'/api/hit';
  if(navigator.sendBeacon)navigator.sendBeacon(u,new Blob([body],{type:'text/plain'}));else fetch(u,{method:'POST',body,keepalive:true}).catch(()=>{})}catch(e){}}

/* ---------- الرأس والتبويبات ---------- */
function header(){
  $('#today-date').textContent=fmtDate(today(),LANG,true);
  document.querySelectorAll('[data-t]').forEach(n=>n.textContent=t(n.dataset.t));
  $('#lang-btn').textContent=LANG==='en'?'ع':'EN';$('#lang-btn').setAttribute('aria-label',LANG==='en'?'العربية':'English');
  const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);
  $('#theme-btn').setAttribute('aria-label',dark?t('theme_light'):t('theme_dark'));
  document.title=LANG==='en'?'Special reports | Abdo News':'تقارير خاصة | عبدو نيوز';
  const ZC={qatar:'var(--dawn)',gulf:'var(--sea)',egypt:'var(--nile)',world:'var(--deep-ink)',military:'#8A3A2E',wars:'#C4392F',countries:'#1F3A93',forecast:'#D9A21A',desks:'#7A3FB0',special:'#0F6E8C'};
  const tabs=$('#tabs');tabs.textContent='';
  ['today','marsad','qatar','gulf','egypt','world','military','wars','countries','forecast','desks','special','weather','roadmap','ledger','saved','about'].forEach(id=>{
    const a=el('a','tab');a.href=id==='special'?'./':id==='forecast'?'../forecast/':id==='weather'?'../weather/':'../#'+id;
    if(ZC[id]){const i=el('i');i.style.background=ZC[id];a.append(i)}
    if(id==='special')a.setAttribute('aria-current','page');
    a.append(t(id));tabs.append(a)});
  const cur=tabs.querySelector('[aria-current]');if(cur)cur.scrollIntoView({block:'nearest',inline:'center'});
  const c=$('#contact');c.textContent='';c.append(el('span',null,CFG.EMAIL||''),el('span',null,CFG.PHONE||''));
}
function toast(m){const n=$('#toast');n.textContent=m;n.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>n.hidden=true,2600)}
function copy(s){const ok=()=>toast(L('نُسخ الرابط.','Link copied.'));try{navigator.clipboard.writeText(s).then(ok,()=>{prompt('',s)})}catch(e){prompt('',s)}}

/* ---------- نموذج المواصفات ---------- */
const EXAMPLES=[
 {ar:'المعلومات المتيسرة عن أنشطة الشركات الإسرائيلية العاملة في المجالات الدفاعية والأمنية بأوروبا: صفقات التسليح، والتصنيع العسكري المشترك، والبحث والتطوير، والذكاء الاصطناعي، والأمن السيبراني',en:'Israeli defence and security companies in Europe: arms deals, joint production, R&D, AI and cybersecurity',reg:'europe',p:'all'},
 {ar:'أسعار النفط والغاز وأثرها على اقتصادات الخليج',en:'Oil and gas prices and their effect on Gulf economies',reg:'gulf',p:'30'},
 {ar:'مسار المفاوضات ووقف إطلاق النار في الحروب الدائرة',en:'Talks and ceasefire tracks in ongoing wars',reg:'all',p:'30'},
 {ar:'الذكاء الاصطناعي والتقنية في الشرق الأوسط',en:'AI and technology in the Middle East',reg:'mideast',p:'all'},
 {ar:'الاقتصاد المصري: الدولار والذهب والبورصة',en:'Egypt\'s economy: dollar, gold and the stock market',reg:'egypt',p:'30'}
];
let FORM=null;
function opt(v,txt,sel){const o=el('option',null,txt);o.value=v;if(sel)o.selected=true;return o}
function buildForm(){
  const host=$('#sr-form');host.textContent='';
  const f=el('form','sr-form');f.noValidate=true;f.setAttribute('aria-labelledby','sr-form-h');
  const h=el('h2',null,L('مواصفات التقرير','Report specification'));h.id='sr-form-h';f.append(h);
  // ١) الموضوع
  const topic=el('div','sr-field sr-topic');const tl=el('label',null,L('١. ما التقرير الذي تريده؟','1. What report do you need?'));tl.htmlFor='sr-q';
  const ta=el('textarea');ta.id='sr-q';ta.rows=3;ta.maxLength=600;ta.required=true;ta.placeholder=L('مثال: صفقات التسليح الأوروبية مع الشركات الإسرائيلية، والتصنيع المشترك والذكاء الاصطناعي والأمن السيبراني','Example: European arms deals with Israeli companies, joint production, AI and cybersecurity');
  const hint=el('small','mute',L('اكتب بلغتك الطبيعية؛ يفهم الموقع المرادفات بالعربية والإنجليزية (مثل: سيبراني/cyber، تسليح/arms).','Write naturally; the site understands Arabic and English synonyms (e.g. cyber/سيبراني, arms/تسليح).'));
  topic.append(tl,ta,hint);f.append(topic);
  const ex=el('div','chips sr-ex');ex.append(el('span','mute',L('أمثلة:','Examples:')));EXAMPLES.forEach(e=>{const b=el('button','chip',LANG==='en'?e.en.slice(0,48)+(e.en.length>48?'…':''):e.ar.slice(0,46)+(e.ar.length>46?'…':''));b.type='button';b.title=e[LANG];b.onclick=()=>{ta.value=e[LANG];reg.value=e.reg;per.value=e.p;per.onchange();ta.focus()};ex.append(b)});f.append(ex);
  // ٢) المنطقة والفترة
  const g=el('div','sr-grid');
  const fr=el('div','sr-field');const rl=el('label',null,L('٢. الدولة أو المنطقة','2. Country or region'));rl.htmlFor='sr-reg';const reg=el('select');reg.id='sr-reg';
  const g1=el('optgroup');g1.label=L('المناطق','Regions');REGIONS.forEach(r=>g1.append(opt(r[0],LANG==='en'?r[2]:r[1])));reg.append(g1);
  if(CMETA.length){const g2=el('optgroup');g2.label=L('دول يتابعها الموقع','Countries we track');CMETA.slice().sort((a,b)=>(a[LANG]||a.ar).localeCompare(b[LANG]||b.ar,LANG)).forEach(m=>g2.append(opt('c-'+m.id,(m.flag?m.flag+' ':'')+(m[LANG]||m.ar))));reg.append(g2)}
  fr.append(rl,reg);
  const fp=el('div','sr-field');const pl=el('label',null,L('٣. الفترة','3. Period'));pl.htmlFor='sr-per';const per=el('select');per.id='sr-per';
  [['7',L('آخر 7 أيام','Last 7 days')],['30',L('آخر 30 يوماً','Last 30 days')],['90',L('آخر 90 يوماً','Last 90 days')],['all',L('كل ما في الأرشيف','Everything in the archive')],['custom',L('من تاريخ إلى تاريخ','Custom dates')]].forEach(([v,x])=>per.append(opt(v,x,v==='30')));
  const dates=el('div','sr-dates');dates.hidden=true;const d1=el('input');d1.type='date';d1.id='sr-from';d1.setAttribute('aria-label',L('من','From'));const d2=el('input');d2.type='date';d2.id='sr-to';d2.setAttribute('aria-label',L('إلى','To'));
  d2.value=today();d1.value=addDays(today(),-30);dates.append(el('span',null,L('من','From')),d1,el('span',null,L('إلى','To')),d2);per.onchange=()=>{dates.hidden=per.value!=='custom'};
  fp.append(pl,per,dates);g.append(fr,fp);f.append(g);
  // ٤) المحاور
  const fa=el('fieldset','sr-field');fa.append(el('legend',null,L('٤. من أين يُستخرج التقرير؟','4. What should it draw on?')));const ac=el('div','sr-checks');
  AXES.forEach(([id,ar,en])=>{const l=el('label','sr-check'),i=el('input');i.type='checkbox';i.name='axis';i.value=id;i.checked=true;l.append(i,el('span',null,LANG==='en'?en:ar));ac.append(l)});fa.append(ac);f.append(fa);
  // ٥) الشكل والتحقق والطول واللغة
  const g3=el('div','sr-grid sr-grid4');
  const sel=(id,label,opts,def)=>{const w=el('div','sr-field');const l=el('label',null,label);l.htmlFor=id;const s=el('select');s.id=id;opts.forEach(([v,x])=>s.append(opt(v,x,v===def)));w.append(l,s);return w};
  g3.append(
    sel('sr-fmt',L('٥. شكل التقرير','5. Format'),[['full',L('تقرير مفصّل بالمحاور','Detailed, by section')],['brief',L('ملخص تنفيذي','Executive summary')],['timeline',L('تسلسل زمني','Timeline')]],'full'),
    sel('sr-ver',L('٦. درجة التحقق','6. Verification'),[['2',L('جهتان مستقلتان فأكثر','Two or more outlets')],['3',L('ثلاث جهات فأكثر','Three or more outlets')]],'2'),
    sel('sr-n',L('٧. عدد البنود','7. Number of items'),[['15','15'],['30','30'],['60','60'],['100','100']],'30'),
    sel('sr-lang',L('٨. لغة التقرير','8. Report language'),[['ar','العربية'],['en','English']],LANG));
  f.append(g3);
  const sub=el('div','sr-submit');const go=el('button','btn sr-go');go.type='submit';go.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 3h9l4 4v14H6z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M9 12h7M9 16h7M9 8h3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';go.append(L('جهّز التقرير','Build the report'));
  const clr=el('button','btn ghost',L('مسح','Clear'));clr.type='button';clr.onclick=()=>{ta.value='';history.replaceState(null,'',location.pathname);$('#sr-out').textContent='';showLibrary();ta.focus()};
  const msg=el('p','msg');msg.id='sr-msg';msg.hidden=true;msg.setAttribute('role','status');
  sub.append(go,clr);f.append(sub,msg);
  f.onsubmit=e=>{e.preventDefault();const spec=readForm();if(!spec.q||spec.q.trim().length<3){say(L('اكتب موضوع التقرير أولاً (ثلاثة أحرف على الأقل).','Please describe the report first (at least three characters).'),false);ta.focus();return}
    say('',true);writeURL(spec);generate(spec,true)};
  host.append(f);FORM={ta,reg,per,d1,d2};
}
function collapseForm(on){const h=$('#sr-form');if(!h)return;h.classList.toggle('sr-collapsed',!!on);let bar=$('#sr-edit');
  if(on&&!bar){bar=el('button','sr-edit kr-skip ls-skip');bar.id='sr-edit';bar.type='button';bar.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
    bar.append(el('span',null,L('عدّل المواصفات أو اطلب تقريراً جديداً','Edit the specification or request a new report')));bar.onclick=()=>{collapseForm(false);const q=$('#sr-q');if(q){q.focus();h.scrollIntoView({block:'start'})}};h.before(bar)}
  if(bar)bar.hidden=!on;h.hidden=!!on}
function say(m,ok){const n=$('#sr-msg');if(!n)return;if(!m){n.hidden=true;return}n.textContent=m;n.className='msg '+(ok?'ok':'err');n.hidden=false}
function readForm(){return {q:$('#sr-q').value.trim(),reg:$('#sr-reg').value,p:$('#sr-per').value,from:$('#sr-from').value,to:$('#sr-to').value,
  axes:[...document.querySelectorAll('input[name=axis]:checked')].map(i=>i.value),fmt:$('#sr-fmt').value,v:+$('#sr-ver').value,n:+$('#sr-n').value,lang:$('#sr-lang').value}}
function fillForm(s){if(!FORM)return;$('#sr-q').value=s.q||'';if(s.reg)$('#sr-reg').value=s.reg;if(s.p){$('#sr-per').value=s.p;$('#sr-per').onchange()}if(s.from)$('#sr-from').value=s.from;if(s.to)$('#sr-to').value=s.to;
  if(s.axes)document.querySelectorAll('input[name=axis]').forEach(i=>i.checked=s.axes.includes(i.value));if(s.fmt)$('#sr-fmt').value=s.fmt;if(s.v)$('#sr-ver').value=String(s.v);if(s.n)$('#sr-n').value=String(s.n);if(s.lang)$('#sr-lang').value=s.lang}
function writeURL(s){const u=new URLSearchParams();u.set('q',s.q);u.set('reg',s.reg);u.set('p',s.p);if(s.p==='custom'){u.set('from',s.from);u.set('to',s.to)}u.set('ax',s.axes.join('.'));u.set('f',s.fmt);u.set('v',s.v);u.set('n',s.n);u.set('lang',s.lang);history.replaceState(null,'','?'+u.toString())}
function readURL(){const u=new URLSearchParams(location.search);if(u.get('r'))return {r:u.get('r')};if(!u.get('q'))return null;
  return {q:u.get('q'),reg:u.get('reg')||'all',p:u.get('p')||'30',from:u.get('from')||'',to:u.get('to')||'',axes:(u.get('ax')||AXES.map(a=>a[0]).join('.')).split('.').filter(Boolean),fmt:u.get('f')||'full',v:+(u.get('v')||2),n:+(u.get('n')||30),lang:u.get('lang')==='en'?'en':(u.get('lang')==='ar'?'ar':LANG)}}

/* ---------- توليد التقرير من بيانات الموقع ---------- */
function regionFilter(reg){
  if(!reg||reg==='all')return null;
  if(reg.startsWith('c-')){const id=reg.slice(2),m=CMETA.find(x=>x.id===id)||{};const vs=[...new Set([m.ar,m.en,id].filter(Boolean).map(x=>norm(x).trim()))];
    return {label:[m.ar||id,m.en||id],test:x=>x.country===id||vs.some(v=>hasTerm(x.n,v))}}
  const r=REGIONS.find(x=>x[0]===reg);if(!r)return null;const vs=[...new Set(r[3].map(x=>norm(x).trim()).filter(Boolean))];
  return {label:[r[1],r[2]],test:x=>(r[4]&&x.zone===r[4])||(x.region&&x.region===reg)||(reg==='europe'&&x.region==='europe')||vs.some(v=>hasTerm(x.n,v))}
}
async function generate(spec,user){
  RL=spec.lang==='en'?'en':'ar';
  const out=$('#sr-out');out.textContent='';out.append(el('p','loading',L('جارٍ تجهيز التقرير من الأخبار الموثّقة…','Building the report from verified news…')));
  $('#sr-lib').hidden=true;collapseForm(true);
  let C;try{C=await loadCorpus()}catch(e){out.textContent='';out.append(el('p','empty',L('تعذّر تحميل بيانات الموقع. تحقّق من اتصالك ثم أعد المحاولة.','Site data could not be loaded. Check your connection and try again.')));return}
  const Q=parseQuery(spec.q);const RF=regionFilter(spec.reg);
  // الفترة
  const to=spec.p==='custom'&&spec.to?spec.to:today();const from=spec.p==='custom'&&spec.from?spec.from:spec.p==='all'?'0000-00-00':addDays(today(),-(+spec.p||30));
  // الطلب الطويل متعدد المحاور يكفي أن يطابق البند جزءاً معتبراً منه؛ القصير يطابق أغلبه
  const need=Q.length>=6?Math.max(3,Math.ceil(Q.length*0.3)):Q.length>=4?3:Q.length>=2?2:1;
  let pool=C.filter(x=>spec.axes.includes(x.axis)&&x.date&&x.date>=from&&x.date<=to&&(x.ar||x.en));
  if(RF)pool=pool.filter(RF.test);
  const scored=[];pool.forEach(x=>{const {s,hits}=Q.length?score(x.n,Q):{s:1,hits:[]};if(s>=Math.min(need,Math.max(1,Q.length)))scored.push(Object.assign({},x,{s,hits}))});
  // إزالة التكرار: نفس النص أو نفس رابط المصدر الأول
  const seenT=new Set(),uniq=[];scored.sort((a,b)=>b.s-a.s||b.outlets-a.outlets||b.date.localeCompare(a.date)).forEach(x=>{const k=norm((x[RL]||x.ar||x.en)).slice(0,90);const u=(x.sources[0]||{}).url;if(seenT.has(k)||(u&&seenT.has(u)))return;seenT.add(k);if(u)seenT.add(u);uniq.push(x)});
  const ok=uniq.filter(x=>x.outlets>=spec.v),weak=uniq.length-ok.length;
  const items=ok.slice(0,spec.n);
  // تقارير محرَّرة مطابقة
  const idx=await loadIndex();const match=(idx.reports||[]).map(r=>{const n=norm([r.title.ar,r.title.en,(r.keywords||[]).join(' ')].join(' '));const {s}=score(n,Q);return {r,s}}).filter(x=>Q.length&&x.s>=Math.max(2,Math.ceil(Q.length*0.5))).sort((a,b)=>b.s-a.s);
  hit('special');if(user){hit('srg-'+spec.fmt);hit('srx-'+(spec.reg.startsWith('c-')?'country':spec.reg));hit('srl-'+RL);if(!items.length)hit('srn-empty')}
  renderGenerated(spec,Q,RF,{from,to},items,weak,uniq.length,match);
}
function srcBox(sources){const box=el('div','src');box.append(el('span','lbl',(sources.length>1?R('المصادر','Sources'):R('المصدر','Source'))+':'));
  sources.forEach(s=>{const a=el('a',null,`${s.name} · ${fmtDate(s.date)}`);a.href=s.url;a.target='_blank';a.rel='noopener';if(s.title)a.title=s.title;box.append(a)});return box}
function verifTag(n){const v=el('span','verif sr-grade');v.dataset.n=n;v.append(el('i'),gradeLabel(n));return v}
function itemLi(x,i,showSec){
  const li=el('li','item sr-item');li.id='g-'+(i+1);
  const txt=x[RL]||x.ar||x.en;const other=!x[RL];
  const cat=el('span','cat');cat.append(fmtDate(x.date));if(showSec!==false)cat.append(' · '+(x.sec?(RL==='en'?x.sec[1]:x.sec[0]):''));li.append(cat);
  const p=el('p',null,txt);if(other){p.lang=x.ar?'ar':'en';p.dir=x.ar?'rtl':'ltr'}li.append(p);
  if(other)li.append(el('small','mute sr-note',R('نُقل بلغته الأصلية كما نشرته المصادر.','Shown in its original language as published by the sources.')));
  const f=el('div','item-foot');f.append(srcBox(x.sources),verifTag(x.outlets));li.append(f);return li;
}
function kpis(list){const w=el('div','sr-kpis');list.forEach(([n,l])=>{const k=el('div','sr-kpi');k.append(el('b',null,String(n)),el('span',null,l));w.append(k)});return w}
function actions(kind,id){
  const w=el('div','sr-actions kr-skip ls-skip');
  const ex=el('button','btn');ex.type='button';ex.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3v12m0 0l-5-5m5 5l5-5M5 21h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';ex.append(L('نزّل التقرير (PDF، Word، صورة…)','Download (PDF, Word, image…)'));
  ex.onclick=()=>{if(window.KR){KR.open({scope:'page',lang:RL,strict:false,title:($('#sr-title')||{}).textContent||''});hit('srd-'+kind)}else toast(L('أداة التنزيل لم تُحمَّل بعد، أعد المحاولة بعد لحظة.','The download tool is still loading, try again in a moment.'))};
  const ls=el('button','btn ghost');ls.type='button';ls.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M4 10v4h4l5 4V6L8 10z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';ls.append(L('استمع إلى التقرير','Listen to the report'));
  ls.onclick=()=>{if(window.KL){try{KL.open()}catch(e){}hit('srs-'+kind)}else toast(L('القارئ الصوتي لم يُحمَّل بعد.','The audio reader is still loading.'))};
  const sh=el('button','btn ghost');sh.type='button';sh.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';sh.append(L('انسخ رابط التقرير','Copy report link'));
  sh.onclick=()=>copy(location.href);
  const pr=el('button','btn ghost',L('اطبع','Print'));pr.type='button';pr.onclick=()=>{hit('srp-'+kind);print()};
  w.append(ex,ls,sh,pr);return w;
}
function renderGenerated(spec,Q,RF,per,items,weak,total,match){
  const out=$('#sr-out');out.textContent='';const art=el('article','sr-report');art.lang=RL;art.dir=RL==='en'?'ltr':'rtl';out.append(art);
  const head=el('header','sr-rhead');head.append(el('span','eyebrow',R('تقرير خاص مولَّد من بيانات «عبدو نيوز» الموثّقة','Special report generated from Abdo News verified data')));
  const h=el('h2','sr-title',spec.q.length>140?spec.q.slice(0,138)+'…':spec.q);h.id='sr-title';head.append(h);
  const meta=el('p','mute sr-meta');meta.textContent=[R('المنطقة: ','Region: ')+(RF?(RL==='en'?RF.label[1]:RF.label[0]):R('كل العالم','Whole world')),
    R('الفترة: ','Period: ')+(per.from==='0000-00-00'?R('كل ما في الأرشيف حتى ','Whole archive to ')+fmtDate(per.to):fmtDate(per.from)+R(' إلى ',' to ')+fmtDate(per.to)),
    R('التحقق: ','Verification: ')+(spec.v>=3?R('ثلاث جهات مستقلة فأكثر','three or more independent outlets'):R('جهتان مستقلتان فأكثر','two or more independent outlets')),
    R('أُعدّ في ','Prepared ')+stamp()].join(' · ');head.append(meta);art.append(head);
  art.append(actions('gen'));
  if(match.length){const box=el('aside','sr-match kr-skip');box.append(el('b',null,L('تقرير خاص محرَّر يطابق طلبك','An edited special report matches your request')));
    match.slice(0,3).forEach(({r})=>{const a=el('a','sr-match-a',r.title[LANG]||r.title.ar);a.href='?r='+encodeURIComponent(r.id);a.onclick=e=>{e.preventDefault();openCurated(r.id,true)};const s=el('span','mute',` · ${r.stats.items} ${L('بنداً موثّقاً من','verified items from')} ${r.stats.outlets} ${L('جهة','outlets')}`);const d=el('div');d.append(a,s);box.append(d)});art.append(box)}
  if(!items.length){
    const e=el('section','sr-empty');e.append(el('h3',null,R('لم نجد في أخبار الموقع الموثّقة ما يطابق طلبك بهذه المواصفات','No verified site news matches these specifications')));
    const ul=el('ul');[R('وسّع الفترة إلى «كل ما في الأرشيف».','Widen the period to the whole archive.'),R('اختر «كل العالم» أو منطقة أوسع.','Choose the whole world or a wider region.'),R('استعمل كلمات أعم أو أقل عدداً.','Use fewer or broader words.'),
      weak?R(`وُجد ${nItems(weak)} لكن بمصدر واحد فقط، فلم يُدرج التزاماً بقاعدة الجهتين.`,`${nItems(weak)} were found with a single source only, so they were left out under the two-outlet rule.`):null].filter(Boolean).forEach(x=>ul.append(el('li',null,x)));e.append(ul);
    e.append(requestBox(spec));art.append(e);return}
  const outl=new Set(items.flatMap(x=>x.sources.map(party))),dates=items.map(x=>x.date).sort(),axesUsed=new Set(items.map(x=>x.axis));
  const span=!dates.length?'—':dates[0]===dates[dates.length-1]?fmtDate(dates[0]):(dates[0].slice(0,4)===dates[dates.length-1].slice(0,4)?fmtDate(dates[0]).replace(/ \d{4}$/,''):fmtDate(dates[0]))+' – '+fmtDate(dates[dates.length-1]);
  art.append(kpis([[items.length,R('البنود الموثّقة','verified items')],[outl.size,R('الجهات المستقلة','independent outlets')],[items.reduce((a,x)=>a+x.sources.length,0),R('الروابط الأصلية','original links')],[span,R('المدى الزمني','time span')]]));
  // أبرز ما ورد: الأكثر توثيقاً ومطابقة
  const top=items.slice().sort((a,b)=>b.s-a.s||b.outlets-a.outlets||b.date.localeCompare(a.date)).slice(0,spec.fmt==='brief'?Math.min(10,items.length):Math.min(5,items.length));
  const hs=el('section','zone sr-sec');const hh=el('div','zone-head');hh.append(el('span','dot'),el('h2',null,spec.fmt==='brief'?R('الملخص التنفيذي: أهم ما ورد','Executive summary: key findings'):R('أبرز ما ورد','Key findings')));hs.append(hh);
  hs.append(el('p','mute sr-rule',R('مرتّبة بحسب مطابقتها لطلبك ثم بعدد الجهات المستقلة التي أكدتها. كل بند منقول كما نشرته المصادر المذكورة تحته.','Ranked by relevance to your request, then by the number of independent outlets confirming each. Every item is reported as published by the sources listed under it.')));
  const ul=el('ul','items');top.forEach((x,i)=>ul.append(itemLi(x,i)));hs.append(ul);art.append(hs);
  if(spec.fmt==='full'){
    const groups={};items.forEach(x=>{const k=x.axis+'|'+(RL==='en'?x.sec[1]:x.sec[0]);(groups[k]=groups[k]||[]).push(x)});
    AXES.forEach(([ax,ar,en])=>{const ks=Object.keys(groups).filter(k=>k.startsWith(ax+'|'));if(!ks.length)return;
      const s=el('section','zone sr-sec');const zh=el('div','zone-head');zh.append(el('span','dot'),el('h2',null,RL==='en'?en:ar),el('span','count',nItems(ks.reduce((a,k)=>a+groups[k].length,0))));s.append(zh);
      ks.sort((a,b)=>groups[b].length-groups[a].length).forEach(k=>{s.append(el('h3','sr-sub',k.split('|')[1]));const u=el('ul','items');groups[k].sort((a,b)=>b.date.localeCompare(a.date)).forEach((x,i)=>u.append(itemLi(x,items.indexOf(x)+100,false)));s.append(u)});art.append(s)});
  }
  if(spec.fmt==='timeline'){
    const months={};items.forEach(x=>{(months[x.date.slice(0,7)]=months[x.date.slice(0,7)]||[]).push(x)});
    const s=el('section','zone sr-sec');const zh=el('div','zone-head');zh.append(el('span','dot'),el('h2',null,R('التسلسل الزمني','Timeline')));s.append(zh);
    Object.keys(months).sort().reverse().forEach(m=>{s.append(el('h3','sr-sub',fmtMonth(m)));const u=el('ul','items sr-tl');months[m].sort((a,b)=>b.date.localeCompare(a.date)).forEach((x,i)=>u.append(itemLi(x,200+i)));s.append(u)});art.append(s);
  }
  art.append(method(spec,Q,weak,total,items,axesUsed));
  art.append(sourcesIndex(items.flatMap(x=>x.sources)));
  art.append(requestBox(spec,true));
  if(window.KL&&KL.refresh)try{KL.refresh()}catch(e){}
  setTimeout(()=>art.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'}),60);
}
function method(spec,Q,weak,total,items,axesUsed){
  const s=el('section','sources-all sr-method');s.append(el('h3',null,R('المنهجية وحدود التقرير','Method and limits')));
  const ol=el('ol');
  [R(`جُمع التقرير آلياً في متصفحك من أخبار «عبدو نيوز» المنشورة (${[...axesUsed].map(a=>{const x=AXES.find(z=>z[0]===a);return RL==='en'?x[2]:x[1]}).join('، ')})، ولم يُضف إليه أي نص أو رقم من خارجها.`,`Built automatically in your browser from Abdo News published items (${[...axesUsed].map(a=>AXES.find(z=>z[0]===a)[2]).join(', ')}); no text or figure from outside them was added.`),
   R(`فُهم طلبك على أنه: ${Q.map(c=>c.id.startsWith('w:')?c.id.slice(2):({israel:'إسرائيل',europe:'أوروبا',defense:'الدفاع والعسكرية',arms:'التسليح والصفقات',company:'الشركات والصناعة',production:'التصنيع والمشروعات المشتركة',rnd:'البحث والتطوير',ai:'الذكاء الاصطناعي والأنظمة الذاتية',cyber:'الأمن السيبراني والتجسس',security:'الأمن',airdef:'الدفاع الجوي',qatar:'قطر',gulf:'الخليج',egypt:'مصر',iran:'إيران',ukraine:'أوكرانيا',russia:'روسيا',usa:'الولايات المتحدة',china:'الصين',gaza:'غزة وفلسطين',economy:'الاقتصاد',oil:'النفط والطاقة',markets:'الأسواق',sport:'الرياضة',health:'الصحة',climate:'المناخ والطقس',tech:'التقنية',war:'الحرب',peace:'التفاوض والتهدئة',embargo:'الحظر والقيود'})[c.id]||c.id).join('، ')||'—'}.`,
     `Your request was read as: ${Q.map(c=>c.id.startsWith('w:')?c.id.slice(2):c.id).join(', ')||'—'}.`),
   R(`لا يدخل التقرير إلا ما أكدته ${spec.v>=3?'ثلاث جهات مستقلة':'جهتان مستقلتان'} على الأقل؛ ونسخ الوكالة الواحدة في مواقع مختلفة تُحسب جهة واحدة.`,`Only items confirmed by at least ${spec.v>=3?'three':'two'} independent outlets are included; copies of one wire story on different sites count as one outlet.`),
   weak?R(`استُبعد ${nItems(weak)} مطابقة لطلبك لأنها لم تبلغ درجة التحقق المطلوبة.`,`${nItems(weak)} matching your request were excluded for not reaching the required verification.`):R('لم يُستبعد أي بند مطابق لنقص التحقق.','No matching item was excluded for lack of verification.'),
   total>items.length+weak?R(`عُرض أعلى ${items.length} بنداً مطابقة؛ يمكنك زيادة عدد البنود من المواصفات.`,`The top ${items.length} matching items are shown; you can raise the number in the specification.`):null,
   R('البنود المعروضة بلغتها الأصلية منقولة كما نشرتها مصادرها، والعناوين قد تكون مختصرة في أرشيف البحث؛ افتح الرابط الأصلي للنص الكامل.','Items shown in their original language are reported as published; archive headlines may be shortened, so open the original link for the full text.')
  ].filter(Boolean).forEach(x=>ol.append(el('li',null,x)));s.append(ol);return s;
}
function sourcesIndex(list){const m=new Map();list.forEach(s=>{if(s&&s.url&&!m.has(s.url))m.set(s.url,s)});
  const s=el('section','sources-all sr-index');s.append(el('h3',null,R(`فهرس المصادر (${nSrc(m.size)})`,`Source index (${nSrc(m.size)})`)));const ol=el('ol');
  [...m.values()].sort((a,b)=>String(b.date).localeCompare(String(a.date))).forEach(x=>{const li=el('li');const a=el('a',null,`${x.name} · ${fmtDate(x.date)}`);a.href=x.url;a.target='_blank';a.rel='noopener';li.append(a);if(x.title)li.append(el('span','mute',' — '+x.title));ol.append(li)});s.append(ol);return s}

/* ---------- طلب تقرير محرَّر من فريق التحرير ---------- */
function requestBox(spec,small){
  const box=el('section','sr-request kr-skip ls-skip');
  box.append(el('h3',null,small?L('تريد تقريراً أعمق في هذا الموضوع؟','Need a deeper report on this topic?'):L('اطلب تقريراً محرَّراً','Request an edited report')));
  box.append(el('p','mute',L('يرسل الطلب إلى فريق تحرير «عبدو نيوز» ليعدّ تقريراً خاصاً بالبحث في المصادر المفتوحة، بالقاعدة نفسها: كل معلومة من جهتين مستقلتين على الأقل بروابطها. يُنشر التقرير هنا في «تقارير خاصة» حين يكتمل.','This sends your request to the Abdo News editors, who prepare a special report from open sources under the same rule: every fact from at least two independent outlets, with links. It is published here under Special reports when ready.')));
  const f=el('div','sr-req-row');const em=el('input');em.type='email';em.placeholder=L('بريدك (اختياري) لنبلغك عند النشر','Your email (optional) to be told when it is published');em.setAttribute('aria-label',L('البريد الإلكتروني','Email'));em.dir='ltr';
  const b=el('button','btn ghost',L('أرسل الطلب إلى فريق التحرير','Send to the editors'));b.type='button';const m=el('p','msg');m.hidden=true;
  b.onclick=async()=>{const text=(L('طلب تقرير خاص: ','Special report request: ')+spec.q+' | '+L('المنطقة: ','Region: ')+spec.reg+' | '+L('الفترة: ','Period: ')+spec.p+(spec.p==='custom'?` ${spec.from}→${spec.to}`:'')+' | '+L('الشكل: ','Format: ')+spec.fmt).slice(0,1100);
    const e=em.value.trim();if(e&&!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e)){m.textContent=L('البريد غير صحيح.','The email address is not valid.');m.className='msg err';m.hidden=false;return}
    b.disabled=true;try{const r=await fetch((CFG.API||'')+'/api/report',{method:'POST',headers:{'content-type':'text/plain'},body:JSON.stringify({id:'special-request',kind:'special',text,email:e,page:location.href.slice(0,290),lang:LANG})});
      if(!r.ok)throw new Error(r.status);hit('srq-sent');m.textContent=L('وصل طلبك إلى فريق التحرير، شكراً لك.','Your request has reached the editors. Thank you.');m.className='msg ok'}
    catch(err){m.textContent=L('تعذّر الإرسال الآن. يمكنك مراسلتنا على ','Could not send now. You can write to us at ')+(CFG.EMAIL||'');m.className='msg err';b.disabled=false}m.hidden=false};
  f.append(em,b);box.append(f,m);return box;
}

/* ---------- عرض تقرير خاص محرَّر ---------- */
async function openCurated(id,push){
  const out=$('#sr-out');out.textContent='';out.append(el('p','loading',L('جارٍ تحميل التقرير…','Loading the report…')));$('#sr-lib').hidden=true;collapseForm(true);
  let r;try{r=await loadReport(id)}catch(e){out.textContent='';out.append(el('p','empty',L('هذا التقرير غير متاح.','This report is not available.')));return}
  if(push)history.replaceState(null,'','?r='+encodeURIComponent(id));
  RL=LANG;hit('special');hit('sro-'+id.slice(0,36));
  out.textContent='';const art=el('article','sr-report sr-curated');art.lang=RL;art.dir=RL==='en'?'ltr':'rtl';out.append(art);
  const head=el('header','sr-rhead');head.append(el('span','eyebrow',R('تقرير خاص محرَّر · مصادر مفتوحة','Edited special report · open sources')));
  const h=el('h2','sr-title',r.title[RL]);h.id='sr-title';head.append(h,el('p','sr-sub-t',r.subtitle[RL]));
  head.append(el('p','mute sr-meta',[R('الفترة المغطاة: ','Coverage: ')+fmtDate(r.period.from).replace(/^\d+ /,'')+R(' إلى ',' to ')+fmtDate(r.period.to),R('آخر تحديث: ','Updated: ')+fmtDate(r.updated),R('القاعدة: كل بند من جهتين مستقلتين على الأقل','Rule: every item from at least two independent outlets')].join(' · ')));
  if(r.request){const q=el('blockquote','sr-req-q');q.append(el('b',null,R('الطلب: ','Request: ')),document.createTextNode(r.request[RL]));head.append(q)}
  art.append(head,actions('cur'));
  const all=r.sections.flatMap(s=>s.items),outl=new Set(all.flatMap(x=>x.src.map(i=>party({url:r.sources[i].url,name:r.sources[i].en})))),countries=new Set(all.map(x=>x.country&&x.country[RL]).filter(c=>c&&!/لم تُسمّ|unnamed|Unnamed|بحسب|reported/.test(c)));
  art.append(kpis([[all.length,R('البنود الموثّقة','verified items')],[outl.size,R('الجهات المستقلة','independent outlets')],[Object.keys(r.sources).length,R('الروابط الأصلية','original links')],[countries.size,R('الدول والجهات المذكورة','countries and bodies named')]]));
  // الخلاصة التحريرية مع البنود التي تستند إليها
  const num={};let k=0;r.sections.forEach(s=>s.items.forEach(x=>num[x.id]=++k));
  const sm=el('section','zone sr-sec sr-summary');const zh=el('div','zone-head');zh.append(el('span','dot'),el('h2',null,R('الخلاصة','Summary')));sm.append(zh);
  sm.append(el('p','mute sr-rule',R('خلاصة تحريرية لا تضيف معلومة جديدة؛ كل نقطة مبنية على البنود الموثّقة المشار إليها بأرقامها.','An editorial summary that adds no new fact; each point rests on the verified items referenced by number.')));
  const ol=el('ol','sr-points');(r.summary[RL]||[]).forEach((p,i)=>{const li=el('li');li.append(el('span',null,p));const b=(r.basis||[])[i]||[];if(b.length){const s=el('span','sr-basis kr-skip ls-skip');s.append(R(' (البنود: ',' (items: '));b.forEach((id,j)=>{const a=el('a',null,String(num[id]));a.href='#'+id;s.append(a);if(j<b.length-1)s.append(R('، ',', '))});s.append(')');li.append(s)}ol.append(li)});sm.append(ol);art.append(sm);
  // بطاقة المواصفات الفنية (اختيارية في التقرير المحرَّر)
  if(r.specs&&r.specs.rows&&r.specs.rows.length){const sp=el('section','zone sr-sec sr-specs');sp.id='sec-datacard';const zh=el('div','zone-head');zh.append(el('span','dot'),el('h2',null,R('بطاقة المواصفات الفنية','Technical data card')));sp.append(zh);
    const wrap=el('div','sr-tbl-wrap');const tb=el('table','sr-tbl');const th=el('thead');const tr=el('tr');(r.specs.cols[RL]||[]).concat([R('المصادر','Sources')]).forEach(c=>tr.append(el('th',null,c)));th.append(tr);tb.append(th);const bd=el('tbody');
    r.specs.rows.forEach(x=>{const row=el('tr');row.dataset.st=x.status;row.append(el('th',null,x[RL]));const v=el('td','sr-v',x.val[RL]);const cl=r.specs.cols[RL]||[];v.dataset.l=(cl[1]||'')+':';if(x.status==='na')v.classList.add('sr-na');row.append(v);const b=el('td','sr-b',x.base[RL]);b.dataset.l=(cl[2]||'')+':';if(x.base.ar==='غير معلن')b.classList.add('sr-na');row.append(b);
      const sc=el('td','sr-s kr-skip ls-skip');x.src.map(i=>r.sources[i]).filter(Boolean).forEach((s,j)=>{const a=el('a',null,RL==='en'?s.en:s.ar);a.href=s.url;a.target='_blank';a.rel='noopener';sc.append(a);if(j<x.src.length-1)sc.append(R('، ',', '))});row.append(sc);bd.append(row)});
    tb.append(bd);wrap.append(tb);sp.append(wrap);if(r.specs.note)sp.append(el('p','mute sr-rule',r.specs.note[RL]));art.append(sp)}
  // المحاور
  const toc=el('nav','sr-toc kr-skip ls-skip');toc.setAttribute('aria-label',R('محاور التقرير','Report sections'));if(r.specs&&r.specs.rows){const a=el('a','chip',R('بطاقة المواصفات','Data card'));a.href='#sec-datacard';toc.append(a)}r.sections.forEach(s=>{const a=el('a','chip',`${s[RL]} (${s.items.length})`);a.href='#sec-'+s.id;toc.append(a)});art.append(toc);
  r.sections.forEach(s=>{const sec=el('section','zone sr-sec');sec.id='sec-'+s.id;const zh=el('div','zone-head');zh.append(el('span','dot'),el('h2',null,s[RL]),el('span','count',nItems(s.items.length)));sec.append(zh);
    const ul=el('ul','items');s.items.forEach(x=>{const li=el('li','item sr-item');li.id=x.id;const cat=el('span','cat');cat.append(el('b','sr-num',String(num[x.id])),' '+fmtDate(x.date)+' · '+(x.country?x.country[RL]:'')+(x.company&&x.company!=='—'?' · '+(RL==='en'?companyEn(x.company):x.company):''));li.append(cat,el('p',null,x[RL]));
      const srcs=x.src.map(i=>r.sources[i]).filter(Boolean).map(s=>({name:RL==='en'?s.en:s.ar,url:s.url,date:s.date,title:s.title}));const f=el('div','item-foot');f.append(srcBox(srcs),verifTag(outletsOf(srcs.map(s=>({name:s.name,url:s.url})))));li.append(f);ul.append(li)});sec.append(ul);art.append(sec)});
  if(r.gaps&&r.gaps.length){const g=el('section','sources-all sr-method');g.append(el('h3',null,R('ما لم يدخل التقرير وحدود المعلومات المتاحة','What was left out and the limits of available information')));const o=el('ol');r.gaps.forEach(x=>o.append(el('li',null,x[RL])));g.append(o);art.append(g)}
  art.append(sourcesIndex(Object.values(r.sources).map(s=>({name:RL==='en'?s.en:s.ar,url:s.url,date:s.date,title:s.title}))));
  const back=el('p','kr-skip ls-skip');const a=el('a','btn ghost',L('← كل التقارير الخاصة وطلب تقرير جديد','← All special reports and a new request'));a.href='./';back.append(a);art.append(back);
  if(location.hash){const t=document.getElementById(location.hash.slice(1));if(t)setTimeout(()=>t.scrollIntoView({block:'center'}),80)}else setTimeout(()=>art.scrollIntoView({block:'start'}),60);
}
const CO_EN={'إلبيت سيستمز':'Elbit Systems','رافائيل':'Rafael','الصناعات الجوية الإسرائيلية (IAI)':'Israel Aerospace Industries (IAI)','رافائيل / يوروسبايك':'Rafael / EuroSpike','إلبيت سيستمز + KNDS':'Elbit Systems + KNDS','يوفيجن + راينميتال':'UVision + Rheinmetall','حكومتا ألمانيا وإسرائيل':'German and Israeli governments','الشركات الناشئة الإسرائيلية':'Israeli start-ups','باراغون سوليوشنز':'Paragon Solutions','رافائيل، إلبيت سيستمز':'Rafael, Elbit Systems','إلبيت، رافائيل، IAI، يوفيجن':'Elbit, Rafael, IAI, UVision','وزارة الدفاع الإسرائيلية (سيبات)':'Israeli Ministry of Defense (SIBAT)'};
const companyEn=c=>CO_EN[c]||c;

/* ---------- مكتبة التقارير الخاصة ---------- */
async function showLibrary(){
  collapseForm(false);const lib=$('#sr-lib');lib.hidden=false;const list=$('#sr-lib-list');list.textContent='';
  const idx=await loadIndex();const rs=(idx.reports||[]).slice().sort((a,b)=>String(b.updated).localeCompare(String(a.updated)));
  if(!rs.length){list.append(el('p','mute',L('لا تقارير محرَّرة منشورة بعد.','No edited reports published yet.')));return}
  rs.forEach(r=>{const c=el('a','sr-card');c.href='?r='+encodeURIComponent(r.id);c.onclick=e=>{e.preventDefault();openCurated(r.id,true)};
    c.append(el('span','eyebrow',L('تقرير محرَّر · ','Edited report · ')+fmtDate(r.updated,LANG)),el('b',null,r.title[LANG]),el('span','mute',r.subtitle[LANG]),
      el('span','sr-card-meta',`${r.stats.items} ${L('بنداً موثّقاً','verified items')} · ${r.stats.outlets} ${L('جهة مستقلة','independent outlets')} · ${r.stats.sources} ${L('رابطاً أصلياً','original links')}`));list.append(c)});
}

/* ---------- التشغيل ---------- */
async function boot(){
  header();
  try{const ct=await getJSON('../data/countries.json');CMETA=ct.meta||[]}catch(e){}
  buildForm();
  const st=readURL();
  if(st&&st.r){openCurated(st.r)}
  else if(st&&st.q){fillForm(st);generate(st,false)}
  else{showLibrary();hit('special')}
}
$('#lang-btn').onclick=()=>{LANG=LANG==='en'?'ar':'en';document.documentElement.lang=LANG;document.documentElement.dir=LANG==='en'?'ltr':'rtl';try{localStorage.setItem('khabar-lang',LANG)}catch(e){}
  const spec=FORM?readForm():null;header();buildForm();const st=readURL();if(st&&st.r)openCurated(st.r);else if(st&&st.q){fillForm(st);generate(Object.assign(st,{lang:LANG}),false)}else showLibrary()};
$('#theme-btn').onclick=()=>{const r=document.documentElement;const dark=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('khabar-theme',r.dataset.theme)}catch(e){}header()};
window.KS={parseQuery,loadCorpus,generate,openCurated,_:{norm,score,outletsOf}};
boot();
})();
