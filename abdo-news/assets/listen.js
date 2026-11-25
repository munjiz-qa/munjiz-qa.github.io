'use strict';
/* «استمع»: قارئ صوتي لكل صفحة وقسم في «عبدو نيوز».
   مجاني بالكامل ويعمل في المتصفح وحده (Web Speech API)، دون خادم ودون مفاتيح ودون الرجوع إلى أي مساعد.
   - يختار القارئ صوت امرأة أو رجل، واللغة (العربية والإنجليزية من محتوى الموقع نفسه، وغيرهما بترجمة آلية معلنة)، والسرعة.
   - تشغيل وإيقاف مؤقت واستئناف، والفقرة السابقة والتالية، والبدء من موضع الشاشة، مع تمييز الفقرة المقروءة وتمريرها إلى الوسط.
   - إن لم يتوفر على الجهاز صوت بالجنس المطلوب يُستعمل أقرب صوت بنبرة معدّلة، ويُقال ذلك صراحة؛ وإن لم تتوفر اللغة يظهر شرح تثبيتها.
   - الإحصاء: أعداد مجمّعة فقط (/api/hit: ls-<لغة>، lsg-<f|m>، lss-<قسم>، lsf-<نوع البديل>) بلا أي بيانات عن الزائر.

   الاستعمال: <script src="assets/listen.js" defer></script> بعد config.js. يظهر زر سماعة في الشريط العلوي وزر «استمع» تحت عنوان الصفحة.
   لاستثناء عنصر من القراءة أضف له الصنف .ls-skip. */
(function(){
if(window.KL)return;
const CFG=window.KHABAR_CONFIG||{};
const SS=window.speechSynthesis;
const isEN=()=>document.documentElement.lang==='en';
const UI=(a,e)=>isEN()?e:a;
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

/* ---------- اللغات ---------- */
// native: محتوى الموقع متوفر بها مباشرة. البقية بترجمة آلية للاستماع فقط، ويُعلن ذلك في المشغّل.
const LANGS=[
  ['auto','لغة الصفحة','Page language'],
  ['ar','العربية','Arabic',1],['en','English','English',1],
  ['fr','Français','French'],['es','Español','Spanish'],['de','Deutsch','German'],['tr','Türkçe','Turkish'],
  ['ur','اردو','Urdu'],['fa','فارسی','Persian'],['hi','हिन्दी','Hindi'],['id','Bahasa Indonesia','Indonesian'],
  ['ru','Русский','Russian'],['zh','中文','Chinese'],['it','Italiano','Italian'],['pt','Português','Portuguese']
];
const NATIVE=new Set(LANGS.filter(l=>l[3]).map(l=>l[0]));
const RATES=[0.75,0.9,1,1.15,1.3,1.5,1.75,2];

/* ---------- الإعدادات المحفوظة على جهاز القارئ فقط ---------- */
const DEF={gender:'f',lang:'auto',rate:1,voice:'',sources:false};
let S=Object.assign({},DEF);try{Object.assign(S,JSON.parse(LS.get('khabar-listen')||'{}'))}catch(e){}
const save=()=>LS.set('khabar-listen',JSON.stringify(S));

/* ---------- الأصوات وجنسها ----------
   واجهة الكلام لا تذكر جنس الصوت، فيُستنتج من اسمه (أسماء أصوات ويندوز وماك وiOS وأندرويد وكروم الشائعة). */
const FEM=/female|woman|femme|frau|mujer|\b(hoda|salma|zariya|amany|amina|fatima|laila|layla|leila|mona|noura|rana|sana|hala|lina|reem|mariam|zira|aria|jenny|ava|samantha|karen|moira|tessa|fiona|victoria|serena|allison|susan|hazel|heera|libby|sonia|emma|michelle|ana|clara|denise|julie|hortense|amelie|amélie|celine|céline|helena|elvira|katja|hedda|anna|petra|seda|filiz|emel|ayumi|haruka|nanami|kyoko|xiaoxiao|huihui|yaoyao|tingting|meijia|sinji|svetlana|irina|dariya|milena|elsa|isabella|paulina|monica|mónica|luciana|joana|francisca|yuna|sunhi|kanya|sara|ioana|zuzana|tatyana|dilnoza|swara|kalpana|lekha|gadis|damayanti|nora|nilufar|uzma|gul|dilara|dina|shirin|dorsa|alice|federica|elsa|marie|vivienne|yelda|ines|inês|catarina|raquel|luzia|tara|neerja|ananya|aditi|veena|rishika|zuri|ana)\b/i;
const MAL=/\bmale\b|\bman\b|homme|mann\b|hombre|\b(naayf|hamed|shakir|omar|taim|rami|bassel|hamdan|moaz|ali|saleh|fahed|hamza|jamal|kareem|karim|maged|majed|tarik|tariq|youssef|david|mark|guy|daniel|alex|fred|thomas|george|james|ryan|eric|christopher|roger|steffan|brian|aaron|arthur|oliver|rishi|ravi|hemant|madhur|prabhat|paul|henri|claude|nicolas|conrad|stefan|alvaro|álvaro|jorge|pablo|diego|raul|raúl|ahmet|tolga|yunus|keita|ichiro|otoya|kangkang|yunxi|yunyang|yunjian|pavel|dmitry|ivan|maxim|cosimo|luca|antonio|duarte|injoon|niwat|asad|salman|faris|amir|reza|farid|dilshad|ardi|guillaume|reed|rocko|grandpa|eddy|nathan|aarav|kunal)\b/i;
// رموز أصوات Google في أندرويد: ar-xa-x-arc-local وما شابه
const GCODE={arc:'f',arz:'f',ard:'m',are:'m',sfg:'f',iob:'f',iog:'f',tpc:'f',tpf:'f',iom:'m',iol:'m',tpd:'m',fra:'f',frc:'f',frd:'m',fre:'m',eea:'f',eec:'f',eed:'m',eef:'m',dea:'f',deb:'f',ded:'m',dee:'m',tra:'f',trb:'m',trc:'f',trd:'m',hia:'f',hic:'f',hid:'m',hie:'m'};
function genderOf(v){const n=v.name||'';if(/female/i.test(n))return 'f';if(/\bmale\b/i.test(n))return 'm';
  const g=n.match(/-x-([a-z]{3})-/i);if(g&&GCODE[g[1].toLowerCase()])return GCODE[g[1].toLowerCase()];
  if(FEM.test(n))return 'f';if(MAL.test(n))return 'm';
  if(/^Google (US English|العربية|français|Deutsch|español|italiano|русский|हिन्दी|Bahasa Indonesia|中文|日本語|한국의|Nederlands|polski|português)/i.test(n))return 'f';
  return '?'}
let VOICES=[];
function loadVoices(){if(!SS)return[];const v=SS.getVoices()||[];if(v.length)VOICES=v;return VOICES}
const base=l=>String(l||'').toLowerCase().replace('_','-').split('-')[0];
const voicesFor=lg=>loadVoices().filter(v=>base(v.lang)===lg);
function quality(v){const n=v.name||'';let q=0;if(/natural|neural|online|premium|enhanced|wavenet/i.test(n))q+=4;if(/google/i.test(n))q+=2;if(/microsoft/i.test(n))q+=1;if(v.localService===false)q+=1;
  if(/^ar-(QA|SA|AE|EG)/i.test(v.lang))q+=1;return q}
/* اختيار الصوت: مطابق للجنس، ثم مجهول الجنس بنبرة معدّلة، ثم الجنس الآخر بنبرة معدّلة (مع إعلان ذلك) */
function pickVoice(lg,gender){
  const all=voicesFor(lg);if(!all.length)return {voice:null,pitch:1,fallback:'nolang'};
  if(S.voice){const m=all.find(v=>v.voiceURI===S.voice||v.name===S.voice);if(m){const g=genderOf(m);return {voice:m,pitch:1,fallback:g!=='?'&&g!==gender?'manual':''}}}
  const by=g=>all.filter(v=>genderOf(v)===g).sort((a,b)=>quality(b)-quality(a));
  const same=by(gender);if(same.length)return {voice:same[0],pitch:1,fallback:''};
  const unk=by('?');const p=gender==='f'?1.28:0.78;
  if(unk.length)return {voice:unk[0],pitch:p,fallback:'pitch'};
  const other=by(gender==='f'?'m':'f');return {voice:other[0],pitch:p,fallback:'other'};
}

/* ---------- استخراج الفقرات القابلة للقراءة ---------- */
const SKIP='pre,code,kbd,script,style,noscript,svg,button,input,select,textarea,nav,iframe,canvas,video,audio,dialog,template,.kr-skip,.ls-skip,.kr-inline,.kr-hdr,#kr-dlg,#ls-bar,.toast,[aria-hidden="true"],.acts,.item-foot .acts';
const BLOCK_DISPLAY=/^(block|flex|grid|list-item|table|table-row|flow-root|table-row-group|table-header-group|table-footer-group|table-caption)$/;
const HEAD=/^H[1-6]$/;
function main(){return document.querySelector('main')||document.body}
function visible(e){if(e.hidden||e.closest('[hidden],details:not([open]) > :not(summary)'))return false;const r=e.getClientRects();return r.length>0}
function blockish(e){if(e.tagName==='TR')return true;const d=getComputedStyle(e).display;return BLOCK_DISPLAY.test(d)}
function hasBlockChild(e){for(const c of e.children){if(c.matches(SKIP))continue;if(blockish(c)||hasBlockChild(c))return true}return false}
function textOf(e){const c=e.cloneNode(true);c.querySelectorAll(SKIP).forEach(x=>x.remove());if(!S.sources)c.querySelectorAll('.src').forEach(x=>x.remove());
  if(e.tagName==='TR'){return [...c.children].map(x=>clean(x.textContent)).filter(Boolean).join('، ')}
  c.querySelectorAll('*').forEach(x=>{if(/^(BR|P|DIV|LI|SPAN|B|STRONG|SMALL|A|EM|BDI|TIME|TD|TH)$/.test(x.tagName))x.append(' ')});
  return clean(c.textContent).replace(/\s+([،,.:؛!؟?])/g,'$1')}
function collect(root,out){for(const c of root.children){
    if(c.matches(SKIP)||!visible(c))continue;
    if(!S.sources&&c.classList.contains('src'))continue;
    if(c.tagName==='TABLE'||c.tagName==='THEAD'||c.tagName==='TBODY'){collect(c,out);continue}
    if(c.tagName==='TR'||!hasBlockChild(c)){const t=textOf(c);if(t&&(HEAD.test(c.tagName)||t.length>=14||/[.!؟?:]/.test(t)&&t.length>=6))out.push({el:c,text:t});continue}
    collect(c,out)}}
// تقسيم الفقرات الطويلة إلى جمل (متصفح كروم يقطع العبارات الطويلة)
function split(t,max=200){if(t.length<=max)return[t];const out=[];let cur='';
  for(const s of t.split(/(?<=[.!?؟؛\n])\s+/)){if((cur+' '+s).trim().length<=max){cur=(cur+' '+s).trim();continue}
    if(cur)out.push(cur);if(s.length<=max){cur=s;continue}
    let rest=s;while(rest.length>max){let i=rest.lastIndexOf('، ',max);if(i<max*.5)i=rest.lastIndexOf(', ',max);if(i<max*.5)i=rest.lastIndexOf(' ',max);if(i<20)i=max;out.push(rest.slice(0,i+1).trim());rest=rest.slice(i+1)}cur=rest.trim()}
  if(cur)out.push(cur);return out}
function scan(){const blocks=[];collect(main(),blocks);const chunks=[];blocks.forEach((b,bi)=>split(b.text).forEach(t=>chunks.push({el:b.el,text:t,b:bi})));return {blocks,chunks}}
const scriptLang=t=>{const a=(t.match(/[؀-ۿ]/g)||[]).length,l=(t.match(/[A-Za-z]/g)||[]).length;return a>=l*0.4?'ar':'en'};

/* ---------- الترجمة الآلية (لغير العربية والإنجليزية فقط) ---------- */
const TCACHE=new Map();
async function translate(text,from,to){const k=from+'|'+to+'|'+text;if(TCACHE.has(k))return TCACHE.get(k);
  const p=(async()=>{const u='https://translate.googleapis.com/translate_a/single?client=gtx&dt=t&sl='+from+'&tl='+to+'&q='+encodeURIComponent(text);
    const r=await fetch(u);if(!r.ok)throw new Error('tr '+r.status);const j=await r.json();return (j[0]||[]).map(x=>x[0]).join('')})();
  TCACHE.set(k,p);p.catch(()=>TCACHE.delete(k));return p}

/* ---------- الحالة والتشغيل ---------- */
let DOC=null,IDX=0,STATE='idle',TOKEN=0,CUR_EL=null,ACTIVE={},COUNTED=false;
const targetLang=()=>S.lang==='auto'?(isEN()?'en':'ar'):S.lang;
const canSpeak=lg=>voicesFor(lg).length>0;
async function textFor(ch){const tl=targetLang(),sl=scriptLang(ch.text);if(sl===tl||!canSpeak(tl))return ch.text;
  if(NATIVE.has(tl)&&NATIVE.has(sl))return ch.text; // عربي/إنجليزي: تُبدَّل لغة الموقع قبل التشغيل، وما بقي يُقرأ كما هو
  return translate(ch.text,sl,tl)}
function mark(e){if(CUR_EL===e)return;if(CUR_EL)CUR_EL.classList.remove('ls-on');CUR_EL=e;if(e){e.classList.add('ls-on');
  const r=e.getBoundingClientRect(),bar=document.getElementById('ls-bar'),bh=bar?bar.offsetHeight:0;
  const bh2=innerHeight-bh-130,beh=matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';if(r.top<120||r.bottom>innerHeight-bh-20){if(r.height>bh2)scrollBy({top:r.top-130,behavior:beh});else e.scrollIntoView({block:'center',behavior:beh})}}}
// نص يُنطق: يحوّل الرموز التي تقرؤها الأصوات خطأً إلى كلمات (STYLE.md، القسم 5). لا يغيّر النص المعروض.
function speakable(t,lg,head){t=String(t||'').replace(/[«»"“”]/g,'').replace(/\s*·\s*/g,'، ');
  if(lg==='ar'){t=t.replace(/(^|[\s(،:])[−–-]\s?(?=\d)/g,'$1ناقص ').replace(/(^|[\s(،:])\+\s?(?=\d)/g,'$1زائد ')
    .replace(/(\d)\s?%/g,'$1 بالمئة').replace(/(\d)\s?°\s?C?/g,'$1 درجة').replace(/(\d)\s?×\s?(\d)/g,'$1 في $2')
    .replace(/(^|[^\d.,\-])(\d{1,2})-(\d{1,2})(?![\d-])(?!\s?(?:عام|سنة|سنوات|أعوام|يوم|أيام|ساعة|كيلو|متر))/g,'$1$2 مقابل $3').replace(/([ء-ي])\/([ء-ي])/g,'$1 لكل $2')
    .replace(/\bFIFA\b/g,'فيفا').replace(/\$\s?(\d[\d,.]*)/g,'$1 دولار')}
  else{t=t.replace(/(^|[\s(,:])[−–]\s?(?=\d)/g,'$1minus ').replace(/(^|[\s(,:])\+\s?(?=\d)/g,'$1plus ')
    .replace(/\bEGP\s?(\d[\d,.]*)/g,'$1 Egyptian pounds').replace(/\bUSD\s?(\d[\d,.]*)/g,'$1 dollars').replace(/\$\/bbl/g,'dollars per barrel').replace(/(\d)\s?°C/g,'$1 degrees')}
  t=t.replace(/\s+/g,' ').trim();if(head&&!/[.!?؟:]$/.test(t))t+='.';return t}
async function speakAt(i){
  if(!DOC)DOC=scan();const n=DOC.chunks.length;if(!n){note(UI('لا يوجد في هذه الصفحة نص يُقرأ الآن.','There is no readable text on this page yet.'),'warn');setState('idle');return}
  if(i>=n){finish();return}IDX=Math.max(0,i);const ch=DOC.chunks[IDX],tk=++TOKEN;mark(ch.el);progress();
  let text;try{text=await textFor(ch)}catch(e){if(tk!==TOKEN)return;note(UI('تعذّرت الترجمة الآلية الآن، فتُقرأ الفقرة بلغتها الأصلية.','Machine translation is unavailable right now, so this passage is read in its original language.'),'warn');text=ch.text}
  if(tk!==TOKEN||STATE!=='playing')return;
  const tl=targetLang(),lg=S.lang==='auto'||!canSpeak(tl)||NATIVE.has(tl)&&scriptLang(ch.text)!==tl?scriptLang(ch.text):tl;
  const pv=pickVoice(lg,S.gender);ACTIVE=pv;
  const u=new SpeechSynthesisUtterance(speakable(text,lg,HEAD.test(ch.el.tagName)));u.lang=pv.voice?pv.voice.lang:lg;if(pv.voice)u.voice=pv.voice;u.rate=S.rate;u.pitch=pv.pitch;
  u.onend=()=>{if(tk===TOKEN&&STATE==='playing')speakAt(IDX+1)};
  u.onerror=ev=>{if(tk!==TOKEN||STATE!=='playing')return;if(ev.error==='interrupted'||ev.error==='canceled')return;
    if(ev.error==='not-allowed'){setState('paused');note(UI('اضغط زر التشغيل مرة أخرى للسماح بالصوت.','Tap play again to allow audio.'),'warn');return}
    speakAt(IDX+1)};
  voiceNote(pv,lg);
  try{SS.cancel()}catch(e){}SS.speak(u);
  // احتياط: إن توقف المحرك دون إشعار (يحدث في بعض المتصفحات) ننتقل بعد مهلة تقديرية
  const est=Math.max(4000,text.length*90/S.rate+3000);setTimeout(()=>{if(tk===TOKEN&&STATE==='playing'&&!SS.speaking&&!SS.pending)speakAt(IDX+1)},est);
  for(let k=1;k<=2;k++){const nx=DOC.chunks[IDX+k];if(nx)textFor(nx).catch(()=>{})}
}
function finish(){TOKEN++;setState('idle');mark(null);IDX=0;progress(true);note(UI('انتهت قراءة الصفحة.','Finished reading this page.'),'ok')}
async function ensureSiteLang(){const tl=S.lang;if(!NATIVE.has(tl))return false;if((isEN()?'en':'ar')===tl)return false;
  const b=document.getElementById('lang-btn');if(!b)return false;b.click();await new Promise(r=>setTimeout(r,700));return true}
async function play(from){
  if(!SS){note(UI('متصفحك لا يدعم القراءة الصوتية. جرّب Chrome أو Edge أو Safari بإصدار حديث.','Your browser does not support speech. Try a recent Chrome, Edge or Safari.'),'bad');return}
  // يجب أن يبدأ الكلام داخل لمسة المستخدم في iOS، فننطق شيئاً صامتاً فوراً ثم نكمل
  try{const w=new SpeechSynthesisUtterance(' ');w.volume=0;SS.speak(w)}catch(e){}
  if(await ensureSiteLang())DOC=null;
  const lg=targetLang();if(!voicesFor(lg).length&&!voicesFor(isEN()?'en':'ar').length&&!loadVoices().length){await new Promise(r=>setTimeout(r,600))}
  if(!voicesFor(lg).length){showInstall(lg);if(!loadVoices().length)return}
  if(!DOC)DOC=scan();setState('playing');count();speakAt(from!=null?from:IDX)}
function pause(){TOKEN++;try{SS.cancel()}catch(e){}setState('paused')}
function stop(){TOKEN++;try{SS&&SS.cancel()}catch(e){}setState('idle');mark(null);IDX=0;progress(true)}
function step(d){const was=STATE==='playing';if(!DOC)DOC=scan();if(!DOC.chunks.length)return;
  // الانتقال فقرة كاملة لا جملة
  const curB=DOC.chunks[IDX]?DOC.chunks[IDX].b:0;let j=IDX;
  if(d>0){while(j<DOC.chunks.length&&DOC.chunks[j].b===curB)j++}else{const tb=Math.max(0,curB-1);j=DOC.chunks.findIndex(c=>c.b===tb)}
  j=Math.max(0,Math.min(j,DOC.chunks.length-1));if(was)speakAt(j);else{IDX=j;mark(DOC.chunks[j].el);progress()}}
function fromHere(){DOC=scan();const bh=(document.getElementById('ls-bar')||{}).offsetHeight||0;
  const i=DOC.chunks.findIndex(c=>{const r=c.el.getBoundingClientRect();return r.bottom>80&&r.top<innerHeight-bh});
  if(STATE!=='playing'){IDX=Math.max(0,i);play(IDX)}else speakAt(Math.max(0,i))}

/* ---------- الإحصاء المجمّع ---------- */
const pageKey=()=>{const h=location.hash.slice(1)||'',p=location.pathname.replace(/\/index\.html$/,'/').split('/').filter(Boolean).pop()||'';
  const v=(h||(/khabar$|abdo-news$/.test(p)?'today':p)||'today').replace(/^b-.*/,'brief').replace(/^war-.*/,'war').replace(/[^\w-]/g,'');return v.slice(0,24)||'today'};
function hit(v){try{if(navigator.doNotTrack==='1')return;const u=(CFG.API||'')+'/api/hit',body=JSON.stringify({v:String(v).slice(0,40)});
  if(navigator.sendBeacon)navigator.sendBeacon(u,new Blob([body],{type:'text/plain'}));else fetch(u,{method:'POST',body,keepalive:true}).catch(()=>{})}catch(e){}}
let COUNTED_KEY='';function count(){const k=pageKey()+'|'+targetLang()+'|'+S.gender;if(COUNTED_KEY===k)return;COUNTED_KEY=k;
  hit('ls-'+targetLang());hit('lsg-'+S.gender);hit('lss-'+pageKey());const pv=pickVoice(targetLang(),S.gender);if(pv.fallback&&pv.fallback!=='manual')hit('lsf-'+pv.fallback)}

/* ---------- الواجهة ---------- */
const ICON='<svg viewBox="0 0 24 24" width="SZ" height="SZ" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><rect x="3" y="13.5" width="4.5" height="7" rx="1.6" fill="currentColor"/><rect x="16.5" y="13.5" width="4.5" height="7" rx="1.6" fill="currentColor"/></svg>';
const icon=sz=>ICON.replace(/SZ/g,sz);
const I={play:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
  pause:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="6" y="4.5" width="4" height="15" rx="1" fill="currentColor"/><rect x="14" y="4.5" width="4" height="15" rx="1" fill="currentColor"/></svg>',
  next:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 5l9 7-9 7zM16 5h3v14h-3z" fill="currentColor"/></svg>',
  prev:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M19 5l-9 7 9 7zM5 5h3v14H5z" fill="currentColor"/></svg>',
  close:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
  gear:'<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="16" cy="7" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="17" r="2.3" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
  here:'<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="12" r="3.2" fill="currentColor"/></svg>'};
const STYLE=`
button.listen{display:none!important} /* زر الاستماع القديم البسيط تحت عنوان الخلاصة: حلّ محله هذا المشغّل */
.ls-on{background:rgba(227,154,45,.24)!important;outline:2px solid var(--dawn,#E39A2D);outline-offset:3px;border-radius:6px;-webkit-box-decoration-break:clone;box-decoration-break:clone;transition:background .25s}
tr.ls-on td{background:rgba(227,154,45,.24)}
.ls-inline{display:inline-flex;align-items:center;gap:6px;margin-top:10px;margin-inline-end:8px;border:1px solid var(--dawn,#E39A2D);color:var(--dawn-ink,#9A5B00);background:var(--dawn-soft,#FBF0DE);border-radius:999px;padding:6px 14px;font:600 .88rem var(--body,"IBM Plex Sans Arabic",sans-serif);cursor:pointer;width:max-content;max-width:100%;justify-self:start;align-self:start}
.ls-inline:hover{filter:brightness(.97)}
.icon-btn.ls-hdr[aria-pressed=true]{background:var(--dawn,#E39A2D);border-color:var(--dawn,#E39A2D);color:#14212E}
#ls-bar{position:fixed;overflow-x:hidden;max-height:calc(100dvh - 70px);overflow-y:auto;z-index:2147483003;inset-inline:0;bottom:0;margin:0 auto;max-width:640px;background:var(--surface,#fff);color:var(--ink,#14212E);border:1px solid var(--line,#DFE3E0);border-bottom:0;border-radius:18px 18px 0 0;box-shadow:0 -10px 30px rgba(10,20,30,.18);padding:10px 14px calc(10px + env(safe-area-inset-bottom,0px));font:15px/1.5 var(--body,"IBM Plex Sans Arabic",sans-serif)}
#ls-bar button{font:inherit;cursor:pointer}
#ls-bar .ls-row{display:flex;align-items:center;gap:8px}
#ls-bar .ls-play{width:48px;height:48px;border-radius:50%;border:0;background:var(--dawn,#E39A2D);color:#14212E;display:grid;place-items:center;flex:none}
#ls-bar .ls-ib{width:38px;height:38px;border-radius:10px;border:1px solid var(--line,#DFE3E0);background:transparent;color:inherit;display:grid;place-items:center;flex:none}
#ls-bar .ls-ib:hover{background:var(--sea-soft,#E3F1EE)}
[dir=rtl] #ls-bar .ls-flip svg{transform:scaleX(-1)}
#ls-bar .ls-mid{flex:1;min-width:0;display:grid;gap:4px}
#ls-bar .ls-title{font-weight:700;font-size:.92rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ls-bar .ls-sub{font-size:.78rem;color:var(--mute,#566270);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#ls-bar .ls-track{height:4px;border-radius:4px;background:var(--line,#DFE3E0);overflow:hidden}
#ls-bar .ls-track i{display:block;height:100%;width:0;background:var(--sea,#1D7A70);transition:width .3s}
#ls-bar .ls-set{display:grid;gap:10px;margin-top:10px;padding-top:10px;border-top:1px solid var(--line,#DFE3E0)}
#ls-bar .ls-set[hidden]{display:none}
#ls-bar .ls-f{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
#ls-bar .ls-f>b{font-size:.82rem;color:var(--mute,#566270);font-weight:600}
#ls-bar .ls-sp{flex:1}
#ls-bar .ls-grow{flex:1 1 160px;min-width:0;width:100%}
#ls-bar .ls-seg{display:inline-flex;border:1px solid var(--line,#DFE3E0);border-radius:999px;overflow:hidden}
#ls-bar .ls-seg button{border:0;background:transparent;color:inherit;padding:6px 14px;font-weight:600;font-size:.88rem}
#ls-bar .ls-seg button[aria-pressed=true]{background:var(--sea,#1D7A70);color:#fff}
#ls-bar select{font:inherit;font-size:.9rem;padding:6px 10px;border-radius:10px;border:1px solid var(--line,#DFE3E0);background:var(--surface,#fff);color:inherit;max-width:100%}
#ls-bar .ls-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line,#DFE3E0);border-radius:999px;padding:6px 12px;background:transparent;color:inherit;font-size:.86rem;font-weight:600}
#ls-bar label.ls-ck{display:inline-flex;align-items:center;gap:6px;font-size:.86rem}
#ls-bar .ls-note{font-size:.8rem;border-radius:10px;padding:7px 10px;margin-top:8px;background:var(--nile-soft,#E7ECF7)}
#ls-bar .ls-note.warn{background:var(--dawn-soft,#FBF0DE)}#ls-bar .ls-note.bad{background:#fbe3e0;color:#7a1d15}#ls-bar .ls-note.ok{background:var(--sea-soft,#E3F1EE)}
#ls-bar .ls-note a{color:inherit}
#ls-bar .ls-voice{font-size:.8rem;color:var(--mute,#566270)}
#ls-bar details summary{cursor:pointer;font-size:.82rem;color:var(--mute,#566270)}
body.ls-open{padding-bottom:var(--ls-h,96px)}
@media (max-width:520px){#ls-bar{border-radius:16px 16px 0 0;padding-inline:10px}#ls-bar .ls-ib{width:36px;height:36px}#ls-bar .ls-set{gap:8px}#ls-bar select{font-size:16px}#ls-bar .ls-play{width:44px;height:44px}}
#ls-fab{position:fixed;z-index:2147482999;inset-inline-end:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));width:52px;height:52px;border-radius:50%;border:0;background:var(--dawn,#E39A2D);color:#14212E;display:none;place-items:center;box-shadow:0 8px 22px rgba(0,0,0,.25);cursor:pointer}
body.ls-open #ls-fab{display:none!important}
@media (max-width:560px){.icon-btn.ls-hdr{display:none}#ls-fab{display:grid}}
@media print{#ls-fab,#ls-bar,.ls-inline,.ls-hdr{display:none!important}.ls-on{background:none!important;box-shadow:none!important}}
`;
let BAR=null,R={};
function css(){if(document.getElementById('ls-css'))return;const s=el('style');s.id='ls-css';s.textContent=STYLE;document.head.append(s)}
function bar(){if(BAR)return BAR;css();BAR=el('section');BAR.id='ls-bar';BAR.setAttribute('role','region');BAR.hidden=true;
  BAR.innerHTML=`<div class="ls-row">
    <button type="button" class="ls-play" data-a="toggle"></button>
    <button type="button" class="ls-ib ls-flip" data-a="prev"></button>
    <button type="button" class="ls-ib ls-flip" data-a="next"></button>
    <div class="ls-mid"><div class="ls-title"></div><div class="ls-sub" aria-live="polite"></div><div class="ls-track"><i></i></div></div>
    <button type="button" class="ls-ib" data-a="set" aria-expanded="false"></button>
    <button type="button" class="ls-ib" data-a="close"></button></div>
  <div class="ls-set" hidden>
    <div class="ls-f"><b data-k="reader"></b><span class="ls-seg" data-k="gender"><button type="button" data-g="f"></button><button type="button" data-g="m"></button></span><span class="ls-sp"></span><b data-k="rate"></b><select data-k="rate"></select></div>
    <div class="ls-f"><b data-k="lang"></b><select data-k="lang" class="ls-grow"></select></div>
    <div class="ls-f"><button type="button" class="ls-pill" data-a="here"></button><label class="ls-ck"><input type="checkbox" data-k="sources"> <span data-k="srcl"></span></label></div>
    <details><summary data-k="adv"></summary><div class="ls-f" style="margin-top:6px"><select data-k="voice" style="flex:1"></select></div><div class="ls-voice" data-k="vinfo"></div></details>
  </div>
  <div class="ls-note" hidden></div>`;
  document.body.append(BAR);
  const q=s=>BAR.querySelector(s);R={play:q('[data-a=toggle]'),prev:q('[data-a=prev]'),next:q('[data-a=next]'),set:q('[data-a=set]'),close:q('[data-a=close]'),here:q('[data-a=here]'),
    title:q('.ls-title'),sub:q('.ls-sub'),track:q('.ls-track i'),panel:q('.ls-set'),note:q('.ls-note'),lang:q('select[data-k=lang]'),rate:q('select[data-k=rate]'),voice:q('select[data-k=voice]'),
    seg:q('[data-k=gender]'),src:q('input[data-k=sources]'),vinfo:q('[data-k=vinfo]')};
  R.prev.innerHTML=I.prev;R.next.innerHTML=I.next;R.set.innerHTML=I.gear;R.close.innerHTML=I.close;
  R.play.onclick=()=>STATE==='playing'?pause():play();
  R.prev.onclick=()=>step(-1);R.next.onclick=()=>step(1);
  R.set.onclick=()=>{R.panel.hidden=!R.panel.hidden;R.set.setAttribute('aria-expanded',String(!R.panel.hidden));LS.set('khabar-listen-set',R.panel.hidden?'0':'1');pad()};
  R.close.onclick=close;R.here.onclick=fromHere;
  R.seg.onclick=e=>{const b=e.target.closest('[data-g]');if(!b)return;S.gender=b.dataset.g;S.voice='';save();labels();restart()};
  R.lang.onchange=()=>{S.lang=R.lang.value;S.voice='';save();DOC=null;labels();restart(true)};
  R.rate.onchange=()=>{S.rate=+R.rate.value;save();restart()};
  R.voice.onchange=()=>{S.voice=R.voice.value;save();labels();restart()};
  R.src.onchange=()=>{S.sources=R.src.checked;save();DOC=null;restart(true)};
  R.panel.hidden=LS.get('khabar-listen-set')==='0';R.set.setAttribute('aria-expanded',String(!R.panel.hidden));
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&BAR&&!BAR.hidden&&!e.target.closest('dialog'))close()});
  labels();return BAR}
function restart(rescan){if(rescan){const keep=DOC&&DOC.chunks[IDX]&&DOC.chunks[IDX].el;DOC=scan();const j=keep?DOC.chunks.findIndex(c=>c.el===keep):0;IDX=Math.max(0,j)}
  if(STATE==='playing'){COUNTED_KEY='';play(IDX)}}
function pad(){if(!BAR)return;requestAnimationFrame(()=>document.body.style.setProperty('--ls-h',(BAR.offsetHeight+12)+'px'))}
function labels(){if(!BAR)return;
  BAR.setAttribute('aria-label',UI('مشغّل الاستماع','Listening player'));
  const t=(b,a,e)=>{b.title=UI(a,e);b.setAttribute('aria-label',UI(a,e))};
  t(R.play,STATE==='playing'?'إيقاف مؤقت':(STATE==='paused'?'استئناف':'تشغيل'),STATE==='playing'?'Pause':(STATE==='paused'?'Resume':'Play'));R.play.innerHTML=STATE==='playing'?I.pause:I.play;
  t(R.prev,'الفقرة السابقة','Previous paragraph');t(R.next,'الفقرة التالية','Next paragraph');t(R.set,'إعدادات القارئ','Reader settings');t(R.close,'إغلاق المشغّل','Close player');
  R.here.innerHTML=I.here+'<span>'+UI('اقرأ من موضع الشاشة','Read from where I am')+'</span>';
  BAR.querySelector('b[data-k=reader]').textContent=UI('القارئ','Reader');BAR.querySelector('b[data-k=lang]').textContent=UI('اللغة','Language');BAR.querySelector('b[data-k=rate]').textContent=UI('السرعة','Speed');
  BAR.querySelector('[data-k=srcl]').textContent=UI('اقرأ أسماء المصادر','Read source names');BAR.querySelector('summary[data-k=adv]').textContent=UI('اختيار صوت محدد','Choose a specific voice');
  R.seg.querySelector('[data-g=f]').textContent=UI('امرأة','Woman');R.seg.querySelector('[data-g=m]').textContent=UI('رجل','Man');
  R.seg.querySelectorAll('[data-g]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.g===S.gender)));
  // اللغات مع علامة توفرها على هذا الجهاز
  loadVoices();R.lang.textContent='';LANGS.forEach(([c,a,e,nat])=>{const o=el('option');o.value=c;const has=c==='auto'||voicesFor(c).length>0;
    o.textContent=(c==='auto'?UI(a,e):(isEN()?e+(e!==a?' · '+a:''):a))+(c!=='auto'&&!nat?UI(' (ترجمة آلية)',' (machine translation)'):'')+(has?'':UI(' · غير مثبتة',' · not installed'));o.selected=c===S.lang;R.lang.append(o)});
  R.rate.textContent='';RATES.forEach(r=>{const o=el('option');o.value=r;o.textContent=r===1?UI('عادية','Normal'):(r+'×');o.selected=Math.abs(r-S.rate)<.01;R.rate.append(o)});
  R.src.checked=!!S.sources;
  const lg=targetLang(),vs=voicesFor(lg).sort((a,b)=>quality(b)-quality(a));R.voice.textContent='';const o0=el('option');o0.value='';o0.textContent=UI('تلقائي حسب اختيارك (امرأة/رجل)','Automatic by your choice (woman/man)');R.voice.append(o0);
  const GN={f:UI('امرأة','woman'),m:UI('رجل','man'),'?':UI('غير معروف','unknown')};
  vs.forEach(v=>{const o=el('option');o.value=v.voiceURI||v.name;o.textContent=`${v.name} · ${v.lang} · ${GN[genderOf(v)]}`;o.selected=S.voice&&(S.voice===v.voiceURI||S.voice===v.name);R.voice.append(o)});
  const pv=pickVoice(lg,S.gender);R.vinfo.textContent=pv.voice?UI('الصوت الحالي: ','Current voice: ')+pv.voice.name+' ('+pv.voice.lang+')':UI('لا يوجد صوت لهذه اللغة على جهازك.','No voice for this language on your device.');
  R.title.textContent=UI('استمع: ','Listen: ')+pageTitle();progress();pad()}
function pageTitle(){const m=main(),h=m.querySelector('h1');const t=clean(h&&h.textContent)||clean(document.title.split('|')[0]);
  const a=document.querySelector('#tabs [aria-current=page]');if(a&&clean(a.textContent))return clean(a.textContent)+(location.hash.length>1||!t?'':' · '+t);return t}
function progress(reset){if(!BAR)return;const n=DOC?DOC.blocks.length:0,cb=DOC&&DOC.chunks[IDX]?DOC.chunks[IDX].b+1:0;
  const st=STATE==='playing'?UI('يقرأ الآن','Reading'):STATE==='paused'?UI('متوقف مؤقتاً','Paused'):UI('جاهز','Ready');
  const g=S.gender==='f'?UI('صوت امرأة','woman’s voice'):UI('صوت رجل','man’s voice'),lname=(LANGS.find(l=>l[0]===targetLang())||[])[isEN()?2:1]||targetLang();
  R.sub.textContent=n&&!reset&&STATE!=='idle'?`${st} · ${UI('الفقرة','Paragraph')} ${cb} ${UI('من','of')} ${n} · ${g} · ${lname}`:`${st} · ${g} · ${lname} · ${S.rate===1?UI('سرعة عادية','normal speed'):S.rate+'×'}`;
  R.track.style.width=(n&&!reset?Math.round(cb/n*100):0)+'%'}
let NOTE_KEY='';
function note(t,kind,html){if(!BAR)bar();R.note.hidden=!t;R.note.className='ls-note'+(kind?' '+kind:'');if(html)R.note.innerHTML=t;else R.note.textContent=t||'';pad()}
function voiceNote(pv,lg){const k=lg+'|'+S.gender+'|'+pv.fallback+'|'+(pv.voice&&pv.voice.name);if(k===NOTE_KEY)return;NOTE_KEY=k;if(pv.fallback==='nolang')return;
  const want=S.gender==='f'?UI('امرأة','woman'):UI('رجل','man'),ln=(LANGS.find(l=>l[0]===lg)||[])[isEN()?2:1]||lg;
  if(pv.fallback==='pitch')note(UI(`لم نتعرّف على صوت ${want} بـ${ln} في جهازك، فنقرأ بالصوت المتاح «${pv.voice.name}» بنبرة معدّلة. لصوت أدق ثبّت صوتاً إضافياً من إعدادات جهازك.`,`We could not find a ${want}'s ${ln} voice on your device, so we use “${pv.voice.name}” with an adjusted pitch. Install an extra voice in your device settings for a closer match.`),'warn');
  else if(pv.fallback==='other')note(UI(`لا يوجد صوت ${want} بـ${ln} في جهازك؛ نستعمل «${pv.voice.name}» بنبرة معدّلة إلى أن تثبّت صوتاً مناسباً.`,`There is no ${want}'s ${ln} voice on your device; we use “${pv.voice.name}” with an adjusted pitch until you install one.`),'warn');
  else if(!NATIVE.has(targetLang())&&S.lang!=='auto')note(UI('المحتوى الأصلي بالعربية والإنجليزية؛ هذه ترجمة آلية للاستماع فقط (عبر Google)، والمصادر وروابطها كما هي في الصفحة.','The original content is Arabic and English; this is a machine translation for listening only (via Google). Sources and links stay as shown on the page.'),'');
  else note('')}
function showInstall(lg){const ua=navigator.userAgent,ln=(LANGS.find(l=>l[0]===lg)||[])[isEN()?2:1]||lg;let how;
  if(/iPhone|iPad|iPod/.test(ua)||/Macintosh/.test(ua)&&'ontouchend' in document)how=UI('الإعدادات ← تسهيلات الاستخدام ← المحتوى المنطوق ← الأصوات','Settings → Accessibility → Spoken Content → Voices');
  else if(/Android/.test(ua))how=UI('الإعدادات ← النظام ← اللغات ← تحويل النص إلى كلام ← محرك Google ← تثبيت بيانات الصوت','Settings → System → Languages → Text-to-speech → Google engine → Install voice data');
  else if(/Windows/.test(ua))how=UI('الإعدادات ← الوقت واللغة ← الكلام ← إضافة أصوات (أو استعمل متصفح Edge ففيه أصوات طبيعية مجانية)','Settings → Time & language → Speech → Add voices (or use Edge, which has free natural voices)');
  else if(/Mac/.test(ua))how=UI('إعدادات النظام ← تسهيلات الاستخدام ← المحتوى المنطوق ← صوت النظام ← إدارة الأصوات','System Settings → Accessibility → Spoken Content → System voice → Manage voices');
  else how=UI('إعدادات الكلام في نظامك','your system speech settings');
  note(UI(`لا يوجد في جهازك صوت بـ${ln}. ثبّته من: ${how}. وإلى ذلك الحين نقرأ النص بلغته الأصلية.`,`Your device has no ${ln} voice. Install one from: ${how}. Until then we read the text in its original language.`),'bad');
  if(!loadVoices().length)note(UI(`لا توجد أصوات قراءة في هذا المتصفح بعد. ثبّت صوتاً من: ${how}، أو جرّب Chrome أو Edge أو Safari.`,`This browser has no speech voices yet. Install one from: ${how}, or try Chrome, Edge or Safari.`),'bad')}
function setState(s){STATE=s;if(BAR){labels()}hdr();media()}
function hdr(){document.querySelectorAll('.ls-hdr').forEach(b=>b.setAttribute('aria-pressed',String(STATE==='playing')))}
function media(){try{if(!('mediaSession' in navigator))return;navigator.mediaSession.metadata=new MediaMetadata({title:pageTitle(),artist:UI('عبدو نيوز','Abdo News')});
  navigator.mediaSession.playbackState=STATE==='playing'?'playing':STATE==='paused'?'paused':'none';
  [['play',()=>play()],['pause',pause],['stop',stop],['nexttrack',()=>step(1)],['previoustrack',()=>step(-1)]].forEach(([a,f])=>{try{navigator.mediaSession.setActionHandler(a,f)}catch(e){}})}catch(e){}}
function open(autoplay){bar();BAR.hidden=false;document.body.classList.add('ls-open');labels();
  if(!SS){note(UI('متصفحك لا يدعم القراءة الصوتية. جرّب Chrome أو Edge أو Safari بإصدار حديث.','Your browser does not support speech. Try a recent Chrome, Edge or Safari.'),'bad');return}
  if(autoplay)play();else R.play.focus({preventScroll:true})}
function close(){stop();if(BAR)BAR.hidden=true;document.body.classList.remove('ls-open');note('');NOTE_KEY=''}
function toggle(from){if(!BAR||BAR.hidden){open(true)}else if(STATE==='playing')pause();else play()}

/* الأزرار: سماعة في الشريط العلوي لكل صفحة، و«استمع» تحت عنوان الصفحة أو القسم */
function headerBtn(){const b0=document.querySelector('.top-actions');if(!b0)return false;if(b0.querySelector('.ls-hdr'))return true;
  const b=el('button','icon-btn ls-hdr');b.type='button';b.innerHTML=icon(18);b.setAttribute('aria-pressed','false');
  const lbl=()=>{const t=UI('استمع للصفحة','Listen to this page');b.title=t;b.setAttribute('aria-label',t)};lbl();
  b.onclick=()=>toggle(b);b0.prepend(b);new MutationObserver(()=>{lbl();if(BAR)labels()}).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});return true}
function inlineBtn(){const m=main();if(!m||m.querySelector('.ls-inline'))return;
  const h=m.querySelector('.ed-head,.wx-head,header.page-head')||(m.querySelector('h1')&&m.querySelector('h1').parentElement);if(!h||h===m&&!m.querySelector('h1'))return;
  const b=el('button','ls-inline');b.type='button';b.innerHTML=icon(16);b.append(UI('استمع: امرأة أو رجل، بلغتك','Listen: woman or man, in your language'));b.onclick=()=>open(true);
  const kr=h.querySelector('.kr-inline');if(kr)kr.before(b);else if(h===m||h.tagName==='MAIN')m.querySelector('h1').after(b);else h.append(b)}
function fab(){if(document.getElementById('ls-fab'))return;const b=el('button');b.id='ls-fab';b.type='button';b.innerHTML=icon(24);const lbl=()=>{const t=UI('استمع للصفحة','Listen to this page');b.title=t;b.setAttribute('aria-label',t)};lbl();
  new MutationObserver(lbl).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});b.onclick=()=>open(true);document.body.append(b)}
let tk=0;function ensure(){if(tk)return;tk=requestAnimationFrame(()=>{tk=0;try{headerBtn();inlineBtn();fab();
  if(!document.querySelector('.top-actions')){const f=document.getElementById('ls-fab');if(f)f.style.display='grid'}}catch(e){}})}
function boot(){css();ensure();const m=main();if(m)new MutationObserver(()=>{ensure();if(CUR_EL&&!document.contains(CUR_EL)){const was=STATE==='playing';DOC=null;if(was){TOKEN++;try{SS.cancel()}catch(e){}IDX=0;CUR_EL=null;play(0)}}}).observe(m,{childList:true,subtree:false});
  addEventListener('hashchange',()=>{if(STATE!=='idle')stop();DOC=null;IDX=0;if(BAR&&!BAR.hidden)setTimeout(labels,300)});
  if(SS){loadVoices();if('onvoiceschanged' in SS)SS.addEventListener('voiceschanged',()=>{loadVoices();if(BAR&&!BAR.hidden)labels()})}
  addEventListener('pagehide',()=>{try{SS&&SS.cancel()}catch(e){}});
  if(/[?&]listen=1\b/.test(location.search))setTimeout(()=>open(false),800)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();

window.KL={open,close,play,pause,stop,next:()=>step(1),prev:()=>step(-1),
  _:{scan,pickVoice,genderOf,voicesFor,split,state:()=>({state:STATE,idx:IDX,chunks:DOC?DOC.chunks.length:0,blocks:DOC?DOC.blocks.length:0,el:CUR_EL&&CUR_EL.tagName,settings:S,voice:ACTIVE.voice&&ACTIVE.voice.name,pitch:ACTIVE.pitch,fallback:ACTIVE.fallback})}};
})();
