'use strict';
// «عبدو نيوز»: يعرض خلاصة اليوم من data/brief.json، والعناوين الآلية من data/headlines.json، والعاجل والإخفاء من data/admin.json،
// وميزان الثقة وسجل الشفافية من data/ledger.json، والعاجل الآلي من data/breaking.json، ومرصد المقارنات من data/marsad.json.
(function(){
const CFG=window.KHABAR_CONFIG||{};
const $=s=>document.querySelector(s);
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let LANG=document.documentElement.lang==='en'?'en':'ar';
const L=(a,e)=>LANG==='en'?e:a;

const T={
 brand:['عبدو نيوز','Abdo News'],loading:['جارٍ تحميل خلاصة اليوم…','Loading today\'s brief…'],
 today:['اليوم','Today'],qatar:['قطر','Qatar'],gulf:['الخليج','The Gulf'],egypt:['مصر','Egypt'],world:['العالم','The World'],
 roadmap:['خريطة الطريق','Roadmap'],saved:['المحفوظ','Saved'],about:['من نحن','About us'],archive:['الأرشيف','Archive'],
 footer_note:['كل خبر في «عبدو نيوز» منسوب إلى مصدره الأصلي برابط مباشر. التحليل والاستقراء اجتهاد تحريري مبني على المصادر المذكورة.','Every story in Abdo News is attributed to its original source with a direct link. Analysis and outlook are editorial judgement based on the cited sources.'],
 source:['المصدر','Source'],sources:['المصادر','Sources'],basis:['مبني على','Based on'],
 analysis:['تحليل عبدو نيوز','Abdo News analysis'],analysis_tag:['رأي تحريري','Editorial view'],
 technical:['قراءة فنية مبسّطة','Simple technical read'],
 outlook:['الاستقراء','Outlook'],outlook_tag:['توقّع وليس خبراً','Forecast, not news'],
 thread:['خيط اليوم','Today\'s thread'],markets:['أرقام اليوم','Today\'s numbers'],
 search:['ابحث في أخبار اليوم','Search today\'s stories'],all:['الكل','All'],
 save:['احفظ','Save'],saved_t:['محفوظ','Saved'],share:['واتساب','WhatsApp'],copy:['نسخ','Copy'],
 copied:['نُسخ الخبر مع مصدره','Copied with its source'],saved_ok:['حُفظ الخبر','Story saved'],unsaved:['أُزيل من المحفوظ','Removed from saved'],
 latest:['آخر العناوين (تُحدَّث آلياً كل 3 ساعات)','Latest headlines (auto-updated every 3 hours)'],
 updated:['آخر تحديث','Updated'],published:['نُشرت','Published'],items:['خبر','stories'],
 no_results:['لا توجد نتائج لهذا البحث في خلاصة اليوم.','No stories match this search in today\'s brief.'],
 no_saved:['لم تحفظ أي خبر بعد. اضغط «احفظ» تحت أي خبر ليظهر هنا.','You have not saved any stories yet. Tap "Save" under any story to keep it here.'],
 scenario:['السيناريو المتوقع','Expected scenario'],tbd:['الموعد لم يُعلن','Date not announced'],
 road_intro:['المواعيد المقررة القادمة في الدوائر الأربع، ولكل موعد مصدره. السيناريوهات توقّعات تحريرية وليست أخباراً.','Upcoming scheduled events across the four circles, each with its source. Scenarios are editorial forecasts, not news.'],
 all_sources:['كل مصادر هذه الخلاصة','All sources in this brief'],
 breaking:['عاجل','Breaking'],
 edition_am:['خلاصة الصباح','Morning Brief'],edition_md:['خلاصة الظهيرة','Midday Brief'],edition_pm:['خلاصة المساء','Evening Brief'],edition_nt:['خلاصة الليل','Night Brief'],
 read_more:['اقرأ الخلاصة','Read brief'],current:['الحالية','current'],
 contact_email:['البريد','Email'],contact_phone:['الهاتف وواتساب','Phone & WhatsApp'],
 err:['تعذّر تحميل الخلاصة. تحقّق من اتصالك ثم أعد تحميل الصفحة.','The brief could not be loaded. Check your connection and reload the page.'],
 theme_dark:['الوضع الليلي','Dark mode'],theme_light:['الوضع النهاري','Light mode'],
 ledger:['الشفافية','Transparency'],listen:['استمع','Listen'],stop:['أوقف','Stop'],
 auto_breaking:['رصد آلي','Auto-detected'],checked_by:['دقّقه المدقق المستقل','Independently fact-checked'],
 nums_ok:['الأرقام مطابقة لمصادرها','Figures match their sources'],nums_review:['رقم قيد المراجعة','Figure under review'],
 trust:['ميزان الثقة','Trust meter'],weather:['الطقس والمناخ','Weather'],climate:['مناخ العالم','World climate'],
 military:['القسم العسكري','Military'],wars:['الحروب الدائرة','Ongoing wars'],countries:['الأوضاع في الدول','Countries'],forecast:['التوقعات','Forecasts'],desks:['الأقسام','Desks'],special:['تقارير خاصة','Special reports'],
 marsad:['المرصد','Marsad'],marsad_t:['مرصد عبدو نيوز','Abdo News Marsad'],
 marsad_intro:['أرقام اليوم بجوار الجلسة السابقة وقبل أسبوع وقبل شهر. كل قراءة بمصدرها، وما لا مصدر له يبقى فارغاً.','Today\'s figures beside the previous session, a week ago and a month ago. Every reading has its source; anything unsourced stays blank.'],
 m_prev:['السابق','Previous'],m_yday:['أمس','Yesterday'],m_week:['قبل أسبوع','A week ago'],m_month:['قبل شهر','A month ago'],m_lastmonth:['الشهر الماضي','Last month'],
 m_gap:['لم يُوثَّق','Not documented'],m_est:['تقدير','Estimate'],m_est_week:['تقدير للأسبوع القادم','Estimate for the coming week'],
 m_tier_a:['الدرجة أ: توقع منشور لجهة معتمدة','Tier A: published forecast by a recognised body'],m_tier_b:['الدرجة ب: نطاق إحصائي من عبدو نيوز','Tier B: Abdo News statistical range'],m_tier_c:['الدرجة ج: لا تقدير','Tier C: no estimate'],
 m_until:['حتى','until'],m_more:['التحليل والتقدير والمصادر','Analysis, estimate and sources'],m_all:['المرصد كاملاً','Full Marsad'],
 m_read:['قراءة عبدو نيوز','Abdo News reading'],m_stale:['قراءة قديمة','Stale reading'],m_measure:['المقياس','Measure'],
 m_record:['سجل صدق التقديرات','Estimate track record'],m_not_advice:['التقديرات اجتهاد حسابي معلن الأساس، وليست نصيحة استثمارية.','Estimates are transparent calculations, not investment advice.']
};
const t=k=>(T[k]||[k,k])[LANG==='en'?1:0];
const ZC={qatar:'var(--dawn)',gulf:'var(--sea)',egypt:'var(--nile)',world:'var(--ink)'};
const ZONES=['qatar','gulf','egypt','world'];
const MONTHS={ar:['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],en:['January','February','March','April','May','June','July','August','September','October','November','December']};
const DAYS={ar:['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],en:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']};
function fmtDate(iso,withDay){if(!iso)return '';const [y,m,d]=iso.split('-').map(Number);if(!d)return MONTHS[LANG][m-1]+' '+y;const dt=new Date(Date.UTC(y,m-1,d));return (withDay?DAYS[LANG][dt.getUTCDay()]+' ':'')+d+' '+MONTHS[LANG][m-1]+' '+y}
function dohaParts(date){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));return p}
// العدد مع المعدود بعربية سليمة: خبر واحد، خبران، 3 أخبار، 11 خبراً، 100 خبر
const countAr=(n,[one,two,few,many,hundred])=>n===1?one:n===2?two:(n%100>=3&&n%100<=10)?`${n} ${few}`:(n%100>=11)?`${n} ${many}`:`${n} ${hundred}`;
const nCount=(n,ar,en)=>LANG==='en'?`${n} ${n===1?en[0]:en[1]}`:countAr(n,ar);
const nDates=n=>nCount(n,['موعد واحد','موعدان','مواعيد','موعداً','موعد'],['date','dates']);
const nItems=n=>nCount(n,['خبر واحد','خبران','أخبار','خبراً','خبر'],['story','stories']);
const nSources=n=>nCount(n,['مصدر موثّق واحد','مصدران موثّقان','مصادر موثّقة','مصدراً موثّقاً','مصدر موثّق'],['cited source','cited sources']);
// مدى التاريخين: «13–17 نوفمبر 2026»، أو «31 أكتوبر – 13 نوفمبر 2026» إذا اختلف الشهر
const fmtRange=(a,b)=>{const A=fmtDate(a).split(' '),B=fmtDate(b);return a.slice(0,7)===b.slice(0,7)?`${A[0]}–${B}`:a.slice(0,4)===b.slice(0,4)?`${A[0]} ${A[1]} – ${B}`:`${fmtDate(a)} – ${B}`};
function fmtTime(isoDT){const p=dohaParts(new Date(isoDT));const h=+p.hour,m=p.minute;if(LANG==='en')return `${String(h).padStart(2,'0')}:${m} Doha time`;const h12=h%12||12;return `${h12}:${m} ${h<12?'صباحاً':'مساءً'} بتوقيت الدوحة`}

let BRIEF=null,HEAD=null,ADMIN={breaking:null,hidden:[],marsad_hidden:[]},ARCH=null,LEDGER=null,AUTOB=null,CLIM=null,MARSAD=null;
let VIEW='today',QUERY='',FILTER={};
const saved=()=>store.get('khabar-saved',{});

/* ---------- data ---------- */
const getJSON=u=>fetch(u,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json()});
async function load(briefId){
  const bu=briefId?`data/archive/${briefId}.json`:'data/brief.json';
  const [b,h,a,ar,lg,ab,ms]=await Promise.all([getJSON(bu),getJSON('data/headlines.json').catch(()=>null),getJSON('data/admin.json').catch(()=>null),getJSON('data/archive/index.json').catch(()=>null),getJSON('data/ledger.json').catch(()=>null),getJSON('data/breaking.json').catch(()=>null),getJSON('data/marsad.json').catch(()=>null)]);
  // أخبار المناخ (كل خبر من جهتين مستقلتين) تُعرض مع كل خلاصة، ولا يتعطل شيء إن لم تتوفر
  CLIM=await getJSON('data/climate.json').catch(()=>null);
  // الخلاصة الآلية تحمل عناوين كل لغة من مصادرها، فلا يظهر في كل لغة إلا ما نُشر بها
  b.zones.forEach(z=>{z.all=z.all||z.items;z.items=z.all.filter(i=>i[LANG])});
  BRIEF=b;HEAD=h;if(a)ADMIN=Object.assign({breaking:null,hidden:[],marsad_hidden:[]},a);ARCH=ar;LEDGER=lg;AUTOB=ab;MARSAD=ms;
}

/* ---------- header ---------- */
function header(){
  const now=new Date(),p=dohaParts(now);
  $('#today-date').textContent=fmtDate(`${p.year}-${p.month}-${p.day}`,true);
  try{$('#today-hijri').textContent=new Intl.DateTimeFormat((LANG==='en'?'en':'ar-SA')+'-u-ca-islamic-umalqura-nu-latn',{timeZone:'Asia/Qatar',day:'numeric',month:'long',year:'numeric'}).format(now)}catch(e){}
  document.querySelectorAll('[data-t]').forEach(n=>n.textContent=t(n.dataset.t));
  $('#lang-btn').textContent=LANG==='en'?'ع':'EN';$('#lang-btn').setAttribute('aria-label',LANG==='en'?'العربية':'English');
  const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);
  $('#theme-btn').setAttribute('aria-label',dark?t('theme_light'):t('theme_dark'));
  document.title=LANG==='en'?'Abdo News | Your daily brief from Doha to the world':'عبدو نيوز | خلاصة يومك من الدوحة إلى العالم';
  const tabs=$('#tabs');tabs.textContent='';
  [['today'],['marsad'],...ZONES.map(z=>[z,ZC[z]]),['military','#8A3A2E'],['wars','#C4392F'],['countries','#1F3A93'],['forecast','#D9A21A'],['desks','#7A3FB0'],['special','#0F6E8C'],['weather'],['roadmap'],['ledger'],['saved'],['about']].forEach(([id,c])=>{
    const a=el('a','tab');a.href=id==='weather'?'weather/':id==='forecast'?'forecast/':id==='special'?'special/':'#'+id;if(c){const i=el('i');i.style.background=c==='var(--ink)'?'var(--deep-ink)':c;a.append(i)}a.append(t(id));
    if(id===VIEW||(id==='today'&&VIEW.startsWith('b-'))||(id==='wars'&&VIEW.startsWith('war-'))||(id==='countries'&&window.KC&&KC.has(VIEW))||(id==='desks'&&window.KD&&KD.has(VIEW)))a.setAttribute('aria-current','page');tabs.append(a)});
  if(window.KD)KD.a11y();
  const cur=tabs.querySelector('[aria-current]');if(cur)cur.scrollIntoView({block:'nearest',inline:'center'});
  // contact
  const c=$('#contact');c.textContent='';
  c.append(el('span',null,CFG.EMAIL||''),el('span',null,CFG.PHONE||''));
  // breaking
  const br=$('#breaking'),b=ADMIN.breaking;
  if(b&&b.on&&(!b.until||new Date(b.until)>new Date())&&b.url&&(b.text_ar||b.text_en)){
    br.textContent='';const w=el('div','wrap');w.append(el('b',null,t('breaking')),el('span',null,LANG==='en'?(b.text_en||b.text_ar):(b.text_ar||b.text_en)));
    const a=el('a',null,(t('source'))+': '+(b.source||''));a.href=b.url;a.target='_blank';a.rel='noopener';w.append(a);br.append(w);br.hidden=false;
  }else if(AUTOB&&AUTOB.on&&AUTOB.until&&new Date(AUTOB.until)>new Date()&&(AUTOB.sources||[]).length>=2){
    br.textContent='';const w=el('div','wrap');w.append(el('b',null,t('breaking')),el('span',null,LANG==='en'?(AUTOB.text_en||AUTOB.text_ar):AUTOB.text_ar));
    w.append(el('small','auto',`${t('auto_breaking')} · ${nCount(AUTOB.sources.length,['مصدر مستقل واحد','مصدران مستقلان','مصادر مستقلة','مصدراً مستقلاً','مصدر مستقل'],['independent source','independent sources'])}`));
    AUTOB.sources.forEach(s=>{const a=el('a',null,s[LANG]||s.ar);a.href=s.url;a.target='_blank';a.rel='noopener';w.append(a)});br.append(w);br.hidden=false;
  }else br.hidden=true;
}

/* ---------- pieces ---------- */
function srcLine(ids,label){
  const S=BRIEF.sources,box=el('div','src');box.append(el('span','lbl',(label||(ids.length>1?t('sources'):t('source')))+':'));
  ids.forEach(id=>{const s=S[id];if(!s)return;const a=el('a',null,`${s[LANG]||s.ar} · ${fmtDate(s.date)}`);a.href=s.url;a.target='_blank';a.rel='noopener';box.append(a)});
  return box;
}
function hl(node,text){
  if(!QUERY){node.textContent=text;return}
  const q=QUERY.toLowerCase(),low=text.toLowerCase();let i=0,j;node.textContent='';
  while((j=low.indexOf(q,i))>-1){node.append(text.slice(i,j));node.append(el('mark',null,text.slice(j,j+q.length)));i=j+q.length}
  node.append(text.slice(i));
}
const ICON={
 save:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
 saved:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18l-6-4-6 4z" fill="currentColor"/></svg>',
 wa:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.3-4A8 8 0 1 1 8 18.7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
 play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
 stop:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
 copy:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
};
function shareText(it){const S=BRIEF.sources;return `${it.h&&it.h[LANG]?it.h[LANG]+'\n\n':''}${it[LANG]}\n\n${t('sources')}: ${it.src.map(id=>`${S[id][LANG]} (${fmtDate(S[id].date)}) ${S[id].url}`).join('\n')}\n\n${t('brand')}: ${(CFG.SITE||location.href.split('#')[0])+'s/'+BRIEF.id+'-'+it.id+'.html'}`}
function toast(m){const n=$('#toast');n.textContent=m;n.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>n.hidden=true,2200)}
function copyText(s){const done=()=>toast(t('copied'));try{navigator.clipboard.writeText(s).then(done,()=>fallback(s,done))}catch(e){fallback(s,done)}}
function fallback(s,done){const ta=el('textarea');ta.value=s;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();try{document.execCommand('copy')}catch(e){}ta.remove();done()}
function itemCard(it,zone){
  const li=el('li','item');li.style.setProperty('--zc',ZC[zone]);li.dataset.zone=zone;li.id='i-'+it.id;
  li.append(el('span','cat',it.cat[LANG]));if(it.h&&it.h[LANG]){const h3=el('h3','it-h');hl(h3,it.h[LANG]);li.append(h3)}const p=el('p');hl(p,it[LANG]);li.append(p);
  const tr=trust(it);if(tr)li.append(tr);
  const f=el('div','item-foot');f.append(srcLine(it.src));
  const acts=el('div','acts'),sv=saved(),isS=!!sv[it.id];
  const bs=el('button','act');bs.type='button';bs.setAttribute('aria-pressed',isS);bs.innerHTML=isS?ICON.saved:ICON.save;bs.append(el('span',null,isS?t('saved_t'):t('save')));
  bs.onclick=()=>{const s=saved();if(s[it.id]){delete s[it.id];toast(t('unsaved'))}else{s[it.id]={it,zone,sources:Object.fromEntries(it.src.map(id=>[id,BRIEF.sources[id]])),brief:BRIEF.id};toast(t('saved_ok'))}store.set('khabar-saved',s);render()};
  const bw=el('a','act');bw.innerHTML=ICON.wa;bw.append(el('span',null,t('share')));bw.href='https://wa.me/?text='+encodeURIComponent(shareText(it));bw.target='_blank';bw.rel='noopener';
  const bc=el('button','act');bc.type='button';bc.innerHTML=ICON.copy;bc.setAttribute('aria-label',t('copy'));bc.onclick=()=>copyText(shareText(it));
  acts.append(bs,bw,bc);
  if(window.KD)acts.append(KD.shareBtn({text:(it.h&&it.h[LANG]?it.h[LANG]+'. ':'')+it[LANG],tag:it.cat[LANG],link:(CFG.SITE||location.href.split('#')[0])+'s/'+BRIEF.id+'-'+it.id+'.html',sources:it.src.map(id=>({name:BRIEF.sources[id][LANG],date:BRIEF.sources[id].date,url:BRIEF.sources[id].url}))}),KD.reportBtn(it.id,it[LANG]));
  f.append(acts);li.append(f);return li;
}
function outletsLabel(n){if(LANG==='en')return n===1?'1 outlet':`${n} independent outlets`;return n===1?'جهة واحدة':n===2?'جهتان مستقلتان':`${n} جهات مستقلة`}
function trust(it){
  const lg=LEDGER&&LEDGER.brief===BRIEF.id&&LEDGER.items?LEDGER.items[it.id]:null;
  const outlets=lg?lg.outlets:new Set(it.src.map(id=>{try{return new URL(BRIEF.sources[id].url).hostname.replace(/^www\./,'')}catch(e){return id}})).size;
  const a=el('a','trust');a.href='#ledger';a.setAttribute('aria-label',t('trust'));
  const lvl=Math.min(3,outlets)+(lg&&lg.status==='verified'?1:0)+(it.check==='supported'?1:0);
  const m=el('span','meter');for(let i=0;i<5;i++)m.append(el('i',i<lvl?'on':null));a.append(m);
  a.append(el('span',null,outletsLabel(outlets)));
  if(lg&&lg.numbers&&lg.numbers.checked&&lg.numbers.total){a.append(el('span',lg.numbers.unseen.length?'warn':'ok',lg.numbers.unseen.length?`${t('nums_review')} (${lg.numbers.grounded}/${lg.numbers.total})`:`${t('nums_ok')} ${lg.numbers.grounded}/${lg.numbers.total}`))}
  if(it.check==='supported'||it.check==='partial')a.append(el('span','ok',t('checked_by')));
  return a;
}
function boxes(z){
  const out=[];
  if(z.analysis){const b=el('div','box analysis'),k=el('div','k');k.append(t('analysis'),el('span','tag',t('analysis_tag')));b.append(k,el('p',null,z.analysis[LANG]),srcLine(z.analysis.src,t('basis')));out.push(b)}
  if(z.technical){const b=el('div','box technical');b.append(el('div','k',t('technical')),el('p',null,z.technical[LANG]),srcLine(z.technical.src));out.push(b)}
  if(z.outlook&&z.outlook.length){const b=el('div','box outlook'),k=el('div','k');k.append(t('outlook'),el('span','tag',t('outlook_tag')));const ul=el('ul');
    z.outlook.forEach(o=>{const li=el('li');li.append(el('p',null,o[LANG]),srcLine(o.src,t('basis')));ul.append(li)});b.append(k,ul);out.push(b)}
  return out;
}
function latest(zone){
  const list=HEAD&&HEAD[zone]&&HEAD[zone][LANG];if(!list||!list.length)return null;
  const w=el('div','latest');w.append(el('h3',null,t('latest')));
  const ul=el('ul');list.slice(0,8).forEach(h=>{const li=el('li'),a=el('a',null,h.title);a.href=h.link;a.target='_blank';a.rel='noopener';li.append(a);
    const s=el('div','src');s.append(el('span','lbl',t('source')+':'),el('span',null,`${h.source} · ${fmtDate(h.date)}`));li.append(s);ul.append(li)});
  w.append(ul);if(HEAD.updated)w.append(el('p','basis',`${t('updated')}: ${fmtDate(HEAD.updated.slice(0,10))}، ${fmtTime(HEAD.updated)}`.replace('، ',LANG==='en'?', ':'، ')));return w;
}
function zoneSection(z,full){
  const hidden=new Set(ADMIN.hidden||[]);
  let items=z.items.filter(i=>!hidden.has(i.id));
  const f=FILTER[z.id];if(full&&f)items=items.filter(i=>i.cat[LANG]===f);
  if(QUERY)items=items.filter(i=>(i[LANG]+' '+(i.h&&i.h[LANG]||'')).toLowerCase().includes(QUERY.toLowerCase())||i.cat[LANG].toLowerCase().includes(QUERY.toLowerCase()));
  if(QUERY&&!items.length)return null;
  const sec=el('section','zone');sec.id=z.id;
  const h=el('div','zone-head'),dot=el('span','dot');dot.style.background=ZC[z.id];
  const h2=full?el('h1',null,z.name[LANG]):el('h2',null,z.name[LANG]);if(full)h2.style.cssText='font-size:1.8rem;padding-top:12px';
  h.append(dot,h2,el('span','count',nItems(items.length)));sec.append(h);
  if(full){const cats=[...new Set(z.items.filter(i=>!hidden.has(i.id)).map(i=>i.cat[LANG]))];const ch=el('div','chips');
    [null,...cats].forEach(c=>{const b=el('button','chip',c||t('all'));b.type='button';b.setAttribute('aria-pressed',String((FILTER[z.id]||null)===c));b.onclick=()=>{FILTER[z.id]=c;render()};ch.append(b)});sec.append(ch)}
  const ul=el('ul','items');items.forEach(i=>ul.append(itemCard(i,z.id)));sec.append(ul);
  if(!QUERY)boxes(z).forEach(b=>sec.append(b));
  if(full){const l=latest(z.id);if(l)sec.append(l)}
  return sec;
}
function edHead(){
  const w=el('div','ed-head');w.append(el('span','eyebrow',t('edition_'+(BRIEF.edition||'am'))));
  w.append(el('h1',null,fmtDate(BRIEF.date,true)));
  const m=el('div','ed-meta');const n=BRIEF.zones.reduce((s,z)=>s+z.items.length,0);
  m.append(el('span',null,`${t('published')}: ${fmtTime(BRIEF.published)}`),el('span',null,nItems(n)),el('span',null,nSources(Object.keys(BRIEF.sources).length)));
  w.append(m);
  if(BRIEF.auto)w.append(el('p','auto-note',L('خلاصة آلية: عناوين المصادر كما نشرتها، لكل خبر جهته وتاريخه ورابطه الأصلي. يُضاف التحليل والاستقراء حين تصدر الخلاصة التحريرية.','Automatic brief: the outlets\' own headlines, each with its outlet, date and original link. Analysis and outlook are added when the editorial brief is published.')));
  if('speechSynthesis' in window){const b=el('button','listen');b.type='button';const set=on=>{b.textContent='';b.innerHTML=on?ICON.stop:ICON.play;b.append(el('span',null,on?t('stop'):t('listen')));b.setAttribute('aria-pressed',String(on))};set(speaking());
    b.onclick=()=>{if(speaking()){speechSynthesis.cancel();set(false);return}speak(set)};w.append(b)}
  return w;
}
const speaking=()=>'speechSynthesis' in window&&speechSynthesis.speaking;
function speak(set){
  const parts=[BRIEF.thread[LANG]];const hidden=new Set(ADMIN.hidden||[]);
  BRIEF.zones.filter(z=>VIEW==='today'||VIEW.startsWith('b-')||z.id===VIEW).forEach(z=>{parts.push(z.name[LANG]);z.items.filter(i=>!hidden.has(i.id)).forEach(i=>parts.push(i[LANG]))});
  const lang=LANG==='en'?'en':'ar',voices=speechSynthesis.getVoices(),v=voices.find(x=>x.lang.toLowerCase().startsWith(lang));
  speechSynthesis.cancel();
  parts.forEach((p,i)=>{const u=new SpeechSynthesisUtterance(p);u.lang=lang==='en'?'en-GB':'ar-SA';if(v)u.voice=v;u.rate=1;if(i===parts.length-1)u.onend=()=>set(false);speechSynthesis.speak(u)});
  set(true);
}
function markets(){
  const w=el('section','zone');const h=el('div','zone-head');h.append(el('h2',null,t('markets')));w.append(h);
  const g=el('div','ticks');BRIEF.markets.forEach(m=>{const d=el('div','tick');d.append(el('small',null,m[LANG]));
    const b=el('b',null,m.value);b.append(el('span','unit',m.unit[LANG]));d.append(b);
    const chg=LANG==='en'&&m.chg_en?m.chg_en:m.chg;const e=el('em',m.dir);if(chg){const bd=el('bdi',null,chg);if(/[0-9]/.test(chg))bd.dir='ltr';e.append(bd,' · ')}e.append(m.note[LANG]);d.append(e,srcLine(m.src));g.append(d)});
  w.append(g);return w;
}

/* ---------- مرصد خبر ---------- */
const numFmt=(v,dec)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec});
const mItems=()=>MARSAD?MARSAD.indicators.filter(i=>!(ADMIN.marsad_hidden||[]).includes(i.id)):[];
function mSrc(ids,label){const S=MARSAD.sources,box=el('div','src');box.append(el('span','lbl',(label||(ids.length>1?t('sources'):t('source')))+':'));
  ids.forEach(id=>{const s=S[id];if(!s)return;const a=el('a',null,`${s[LANG]||s.ar} · ${fmtDate(s.date)}`);a.href=s.url;a.target='_blank';a.rel='noopener';box.append(a)});return box}
function mLabel(i,k){if(k==='prev'){if(!i.prev)return t('m_prev');const d=(Date.parse(i.now.d)-Date.parse(i.prev.d))/864e5;return d===1?t('m_yday'):t('m_prev')}
  if(k==='month')return i.cadence==='monthly'?t('m_lastmonth'):t('m_month');return t('m_week')}
function ruler(i){
  const pts=[['now',t('today')],['prev',mLabel(i,'prev')],['week',t('m_week')],['month',mLabel(i,'month')]].filter(([k])=>i[k]).map(([k,l])=>({k,l,v:i[k].v}));
  if(pts.length<2)return null;
  const vs=pts.map(p=>p.v),mn=Math.min(...vs),mx=Math.max(...vs),pad=(mx-mn)*.1||Math.abs(mx)*.01||1,lo=mn-pad,hi=mx+pad;
  const W=320,L=8,R=W-8,rtl=LANG!=='en',x=v=>{const f=(v-lo)/(hi-lo);return rtl?R-f*(R-L):L+f*(R-L)};
  const order=pts.slice().sort((a,b)=>x(a.v)-x(b.v)),row=new Map(),lastX=[-1e9,-1e9];
  order.forEach(p=>{const px=x(p.v);let r=p.k==='now'?(px-lastX[0]>=46?0:px-lastX[1]>=46?1:0):(px-lastX[0]>=46?0:px-lastX[1]>=46?1:-1);if(r>=0){row.set(p,r);lastX[r]=px}});
  let h=`<line x1="${L}" y1="34" x2="${R}" y2="34" stroke="var(--line)" stroke-width="2"/>`;
  h+=`<text x="${rtl?R:L}" y="64" text-anchor="${rtl?'end':'start'}" class="end">${numFmt(mn,i.dec)}</text><text x="${rtl?L:R}" y="64" text-anchor="${rtl?'start':'end'}" class="end">${numFmt(mx,i.dec)}</text>`;
  pts.slice().reverse().forEach(p=>{const cx=x(p.v).toFixed(1),main=p.k==='now';
    h+=`<circle cx="${cx}" cy="34" r="${main?6.5:4}" fill="${main?'var(--dawn)':'var(--mute)'}"${main?' stroke="var(--surface)" stroke-width="2"':''}/>`;
    if(row.has(p)){const y=row.get(p)?52:20;h+=`<text x="${cx}" y="${y}" text-anchor="middle"${main?' class="now"':''}>${p.l}</text>`}});
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${W} 70`);svg.setAttribute('class','ruler');svg.setAttribute('role','img');
  svg.setAttribute('aria-label',pts.map(p=>`${p.l} ${numFmt(p.v,i.dec)}`).join('، '));svg.innerHTML=h;return svg;
}
function mDelta(i,k){
  const p=i[k],d=el('div','md'+(p?'':' gap'));d.append(el('small',null,mLabel(i,k)));
  if(!p){d.append(el('span','v',t('m_gap')));return d}
  const b=el('bdi','v num',numFmt(p.v,i.dec));d.append(b);
  const dir=p.pct>0?'up':p.pct<0?'down':'flat',pc=el('bdi','p num '+dir,(p.pct>0?'+':p.pct<0?'−':'±')+numFmt(Math.abs(p.pct),2)+'%');d.append(pc);
  d.append(el('span','dt',fmtDate(p.d)));d.title=`${t('source')}: ${p.src.map(s=>MARSAD.sources[s]?MARSAD.sources[s][LANG]:s).join('، ')}`;return d;
}
function mEst(i){
  const e=i.est,b=el('div','m-est '+e.tier);const k=el('div','k');k.append(el('span','tag',t('m_est')),t(e.tier==='a'?'m_tier_a':e.tier==='b'?'m_tier_b':'m_tier_c'));b.append(k);
  if(e.tier==='c'){b.append(el('p',null,e.reason[LANG]));return b}
  const r=el('p','rng');r.append(el('bdi','num',numFmt(e.lo,i.dec)),` ${L('إلى','to')} `,el('bdi','num',numFmt(e.hi,i.dec)),` ${i.unit[LANG]} · ${t('m_until')} ${fmtDate(e.until)}`);b.append(r,el('p','basis',e.basis[LANG]));
  if(e.src)b.append(mSrc(e.src));return b;
}
function mCard(i,full){
  const c=el('article','m-card');c.style.setProperty('--zc',ZC[i.zone]);c.id='m-'+i.id;
  const hd=el('div','m-head');hd.append(el('span','m-name',i[LANG]),el('span','m-zone',t(i.zone)));c.append(hd);
  const v=el('div','m-now');v.append(el('bdi','num',numFmt(i.now.v,i.dec)),el('span','unit',i.unit[LANG]));c.append(v);
  const meta=el('p','m-meta');meta.append(`${i.measure[LANG]} · ${fmtDate(i.now.d)}`);if(i.stale)meta.append(el('span','stale',t('m_stale')));c.append(meta);
  const rl=ruler(i);if(rl)c.append(rl);
  const ds=el('div','m-deltas');(i.cadence==='monthly'?['month']:['prev','week','month']).forEach(k=>ds.append(mDelta(i,k)));c.append(ds);
  const body=[];
  if(i.note){const n=el('div','m-note');n.append(el('b',null,t('m_read')),el('p',null,i.note[LANG]),mSrc(i.note.src,t('basis')));body.push(n)}
  body.push(mEst(i));
  const ids=[...new Set(['now','prev','week','month'].filter(k=>i[k]).flatMap(k=>i[k].src))];body.push(mSrc(ids,t('sources')));
  if(full){body.forEach(b=>c.append(b))}
  else{const det=el('details','m-more');det.append(el('summary',null,t('m_more')));body.forEach(b=>det.append(b));c.append(det)}
  return c;
}
function marsadHome(){
  // الرئيسية تعرض «أرقام اليوم» فقط: المؤشر الذي لم تتجدد قراءته يبقى في صفحة المرصد بعلامة «قراءة قديمة» ولا يظهر هنا
  const it=mItems().filter(i=>!i.stale);if(!it.length)return null;
  const w=el('section','zone marsad');w.id='marsad-home';
  const h=el('div','zone-head');h.append(el('h2',null,t('marsad_t')));const a=el('a','count',t('m_all')+' ←');a.href='#marsad';if(LANG==='en')a.textContent=t('m_all')+' →';h.append(a);w.append(h);
  w.append(el('p','mute m-intro',t('marsad_intro')));
  const g=el('div','m-grid');it.forEach(i=>g.append(mCard(i,false)));w.append(g);return w;
}
function viewMarsad(){
  const h=el('div','ed-head');h.append(el('span','eyebrow',L('مقارنات اليوم','Today\'s comparisons')),el('h1',null,t('marsad_t')),el('p','mute',t('marsad_intro')));
  if(MARSAD)h.append(el('p','basis',`${t('updated')}: ${fmtDate(MARSAD.updated.slice(0,10))}، ${fmtTime(MARSAD.updated)}`.replace('، ',LANG==='en'?', ':'، ')));main.append(h);
  const it=mItems();if(!it.length){main.append(el('p','empty',L('لم يُنشر المرصد بعد.','The Marsad has not been published yet.')));return}
  {const st=it.filter(i=>i.stale).length;if(st)main.append(el('p','auto-note',st===it.length?L('لم تتجدد قراءات المرصد بعد آخر توثيق؛ تظهر كل قراءة بتاريخها وعلامة «قراءة قديمة» حتى تُضاف قراءات موثّقة جديدة.','The Marsad readings have not been refreshed since they were last documented; each shows its date and a “Stale reading” mark until new documented readings are added.'):L(`${countAr(st,['مؤشر واحد','مؤشران','مؤشرات','مؤشراً','مؤشر'])} لم تتجدد قراءته بعد آخر توثيق، ويظهر بتاريخه وعلامة «قراءة قديمة».`,`${st} indicator${st===1?' has':'s have'} not been refreshed and show${st===1?'s':''} the date with a “Stale reading” mark.`)))}
  ZONES.forEach(z=>{const zi=it.filter(i=>i.zone===z);if(!zi.length)return;const sec=el('section','zone');const hd=el('div','zone-head'),dot=el('span','dot');dot.style.background=ZC[z];
    hd.append(dot,el('h2',null,t(z)));sec.append(hd);const g=el('div','m-grid full');zi.forEach(i=>g.append(mCard(i,true)));sec.append(g);main.append(sec)});
  const m=el('section','zone');const mh=el('div','zone-head');mh.append(el('h2',null,L('كيف نحسب','How we calculate')));m.append(mh);
  const ol=el('ol','pipeline');[
   [L('القراءة الموثّقة','Documented reading'),L('كل رقم يُسجَّل مع اسم مصدره وتاريخ نشره ورابطه الأصلي. الخانة التي لا قراءة موثّقة لها تبقى «لم يُوثَّق».','Every figure is recorded with its outlet, publication date and original link. A slot with no documented reading stays "Not documented".')],
   [L('المقارنة','Comparison'),L('السابق هو آخر جلسة قبل اليوم، و«قبل أسبوع» أقرب قراءة إلى 7 أيام (بين 4 و10)، و«قبل شهر» أقرب قراءة إلى 30 يوماً (بين 24 و38).','Previous is the last session before today; "a week ago" is the reading closest to 7 days (4 to 10); "a month ago" is closest to 30 days (24 to 38).')],
   [L('المسطرة','The ruler'),L('تضع النقاط الأربع على مقياس واحد بين أدنى قيمة وأعلاها، فترى أين يقف رقم اليوم.','Places the four points on one scale between the lowest and highest value, so you can see where today stands.')],
   [L('التقدير','Estimate'),L('نطاق لا رقم واحد. الدرجة ب: متوسط الحركة اليومية المطلقة في آخر 20 جلسة × جذر 5 جلسات حول آخر قيمة، ولا يُحسب قبل 15 جلسة موثّقة.','A range, never a single number. Tier B: average absolute daily move over the last 20 sessions × √5 sessions around the latest value, and only after 15 documented sessions.')],
   [L('المحاسبة','Accountability'),L('يُحفظ كل تقدير، وعند انقضاء مدته يُقارن بأول قراءة موثّقة بعدها، وتظهر النتيجة هنا.','Every estimate is stored; when its period ends it is compared with the first documented reading after it, and the result appears here.')]
  ].forEach(([a,b])=>{const li=el('li');li.append(el('b',null,a),el('p',null,b));ol.append(li)});m.append(ol);
  const R=MARSAD.record||{};const rh=el('h3',null,t('m_record'));m.append(rh);
  m.append(el('p','mute',R.scored?L(`أصاب ${R.hits} من ${R.scored} تقديراً انقضت مدته نطاقه المعلن.`,`${R.hits} of ${R.scored} matured estimates landed inside their stated range.`):L('لم تنقضِ مدة أي تقدير بعد. أول محاسبة تظهر هنا بعد أسبوع من أول تقدير.','No estimate has matured yet. The first result appears here a week after the first estimate.')));
  if((R.items||[]).length){const ul=el('ul','drops');R.items.forEach(f=>{const i=MARSAD.indicators.find(x=>x.id===f.id);if(!i)return;const li=el('li');
    li.append(el('span','stage',f.result?(f.result.hit?L('أصاب','Hit'):L('أخطأ','Missed')):L('قيد الانتظار','Pending')));
    li.append(el('p',null,`${i[LANG]}: ${numFmt(f.lo,i.dec)} ${L('إلى','to')} ${numFmt(f.hi,i.dec)} · ${L('صدر','issued')} ${fmtDate(f.made)} · ${t('m_until')} ${fmtDate(f.until)}`));
    if(f.result)li.append(el('small',null,`${L('القراءة الفعلية','Actual')}: ${numFmt(f.result.v,i.dec)} (${fmtDate(f.result.d)})`));ul.append(li)});m.append(ul)}
  m.append(el('p','basis',t('m_not_advice')));main.append(m);
}
function searchBox(){
  const s=el('label','search');s.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const i=el('input');i.type='search';i.id='q';i.placeholder=t('search');i.setAttribute('aria-label',t('search'));i.value=QUERY;
  i.oninput=()=>{QUERY=i.value.trim();(VIEW==='military'?renderMilList:renderList)()};s.append(i);return s;
}
function allSources(){
  const w=el('section','sources-all');w.append(el('h3',null,t('all_sources')));const ol=el('ol');
  Object.values(BRIEF.sources).forEach(s=>{const li=el('li'),a=el('a',null,s[LANG]);a.href=s.url;a.target='_blank';a.rel='noopener';li.append(a,` · ${fmtDate(s.date)}`);ol.append(li)});
  w.append(ol);return w;
}


/* ---------- القسم العسكري والحروب الدائرة ----------
   data/military.json: أخبار عسكرية لكل خلاصة في ثلاث دوائر بالترتيب (أوروبا ثم الشرق الأوسط ثم العالم) وصفقات السلاح والإنفاق.
   data/wars.json: ملف تراكمي لكل حرب (البطاقة، الخط الزمني، التفاوض، الأثر الاقتصادي، مؤشر التصعيد).
   قاعدة النشر: كل خبر من جهتين مستقلتين على الأقل، ويُتحقق منها في khabar/agent/military.py قبل النشر. */
const MREG=['europe','mideast','world'];
const MRC={europe:'var(--nile)',mideast:'var(--sea)',world:'var(--ink)'};
const LVL={escalation:['تصعيد','Escalation','#C4392F'],tense:['متوتر','Tense','#C27A12'],calm:['هادئ','Calm','#1D7A70']};
const KIND={attack:['هجوم أو اشتباك','Attack or clash'],deploy:['انتشار وحشد','Deployment'],aid:['دعم عسكري','Military aid'],politics:['سياسة وقرار','Policy'],capability:['قدرات','Capabilities'],mediation:['وساطة','Mediation'],summit:['قمة','Summit'],sanctions:['عقوبات','Sanctions'],exchange:['تبادل','Exchange'],spending:['إنفاق دفاعي','Defence spending'],deal:['صفقة أو تمويل سلاح','Arms deal or funding'],programme:['برنامج تسليح','Arms programme']};
let MIL=null,WARS=null,MAP=null;
const follows=()=>store.get('khabar-follow',{});
const warKey=w=>w&&w.timeline&&w.timeline[0]?w.timeline[0].date+'|'+(w.timeline[0].ar||'').slice(0,60):'';
async function loadMil(){
  if(MIL&&WARS)return;
  const [m,w]=await Promise.all([getJSON('data/military.json').catch(()=>null),getJSON('data/wars.json').catch(()=>null)]);
  MIL=m;WARS=w;
}
const lvl=l=>{const x=LVL[l]||LVL.calm;return {t:LANG==='en'?x[1]:x[0],c:x[2]}};
function lvlPill(w){const x=lvl(w.level),s=el('span','lvl');s.style.setProperty('--lc',x.c);s.append(el('i'),x.t);s.title=L(`${w.incidents_3d||0} حادثة موثّقة في آخر 3 أيام`,`${w.incidents_3d||0} documented incidents in the last 3 days`);return s}
function msrc(S,ids,label){
  const box=el('div','src');box.append(el('span','lbl',(label||(ids.length>1?t('sources'):t('source')))+':'));
  ids.forEach(id=>{const s=S[id];if(!s)return;const a=el('a',null,`${s[LANG]||s.ar} · ${fmtDate(s.date)}`);a.href=s.url;a.target='_blank';a.rel='noopener';box.append(a)});return box}
const nOutlets=n=>nCount(n,['جهة مستقلة واحدة','جهتين مستقلتين','جهات مستقلة','جهة مستقلة','جهة مستقلة'],['independent outlet','independent outlets']);
function verified(n){const b=el('span','verif'+(n>=3?' strong':''));b.append(el('i'),L(`مؤكد من ${nOutlets(n)}`,`Confirmed by ${nOutlets(n)}`));return b}
function milCard(it,S,color){
  const li=el('li','item mil');li.style.setProperty('--zc',color);li.id='m-'+it.id;
  const top=el('div','mil-top');top.append(el('span','cat',it.cat[LANG]));if(it.kind&&KIND[it.kind])top.append(el('span','kind',KIND[it.kind][LANG==='en'?1:0]));
  if(it.war&&WARS){const w=WARS.wars.find(x=>x.id===it.war);if(w){const a=el('a','war-link',w.name[LANG]);a.href='#war-'+w.id;top.append(a)}}
  li.append(top);const p=el('p');hl(p,it[LANG]);li.append(p);
  const f=el('div','item-foot');const v=el('div','vline');v.append(verified(it.outlets||new Set(it.src.map(id=>{try{return new URL(S[id].url).hostname}catch(e){return id}})).size),msrc(S,it.src));f.append(v);
  const acts=el('div','acts'),txt=`${it[LANG]}\n\n${t('sources')}: ${it.src.map(id=>`${S[id][LANG]} (${fmtDate(S[id].date)}) ${S[id].url}`).join('\n')}\n\n${t('brand')}: ${CFG.SITE||location.href}`;
  const bw=el('a','act');bw.innerHTML=ICON.wa;bw.append(el('span',null,t('share')));bw.href='https://wa.me/?text='+encodeURIComponent(txt);bw.target='_blank';bw.rel='noopener';
  const bc=el('button','act');bc.type='button';bc.innerHTML=ICON.copy;bc.setAttribute('aria-label',t('copy'));bc.onclick=()=>copyText(txt);acts.append(bw,bc);f.append(acts);li.append(f);return li}
function conflictMap(wars,focus){
  const box=el('figure','cmap');
  if(!MAP){box.append(el('p','mute',L('جارٍ تحميل الخريطة…','Loading the map…')));getJSON('assets/conflict-map.json').then(m=>{MAP=m;render()}).catch(()=>{box.textContent=''});return box}
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${MAP.w} ${MAP.h}`);svg.setAttribute('role','group');
  svg.setAttribute('aria-label',L('خريطة النزاعات الدائرة، لكل نقطة ملف حربها','Map of ongoing conflicts; each marker opens its war file'));
  const land=document.createElementNS(ns,'path');land.setAttribute('d',MAP.d);land.setAttribute('class','land');svg.append(land);
  const P=(lo,la)=>[(lo-MAP.lon[0])/(MAP.lon[1]-MAP.lon[0])*MAP.w,(MAP.lat[1]-la)/(MAP.lat[1]-MAP.lat[0])*MAP.h];
  wars.forEach(w=>(w.pins||[]).forEach((pin,i)=>{const [x,y]=P(pin.lon,pin.lat),c=lvl(w.level).c;
    const a=document.createElementNS(ns,'a');a.setAttribute('href','#war-'+w.id);a.setAttribute('aria-label',`${w.name[LANG]} · ${pin[LANG]} · ${lvl(w.level).t}`);a.setAttribute('class','pin'+(focus?(focus!==w.id?' dim':' focus'):''));
    const tt=document.createElementNS(ns,'title');tt.textContent=`${w.name[LANG]} · ${pin[LANG]} · ${lvl(w.level).t}`;a.append(tt);
    const halo=document.createElementNS(ns,'circle');halo.setAttribute('cx',x);halo.setAttribute('cy',y);halo.setAttribute('r',i?9:15);halo.setAttribute('fill',c);halo.setAttribute('class','halo');
    const dot=document.createElementNS(ns,'circle');dot.setAttribute('cx',x);dot.setAttribute('cy',y);dot.setAttribute('r',i?4.5:7);dot.setAttribute('fill',c);dot.setAttribute('class','dot');
    a.append(halo,dot);
    if(!i){const tx=document.createElementNS(ns,'text');tx.setAttribute('x',x);tx.setAttribute('y',y-20);tx.setAttribute('text-anchor','middle');tx.textContent=w.name[LANG];a.append(tx)}
    svg.append(a)}));
  box.append(svg);const cap=el('figcaption','cmap-key');
  Object.keys(LVL).forEach(k=>{const s=el('span');const i=el('i');i.style.background=LVL[k][2];s.append(i,LANG==='en'?LVL[k][1]:LVL[k][0]);cap.append(s)});
  cap.append(el('small',null,L('المؤشر من الحوادث الموثّقة بمصدرين في آخر 3 أيام: حادثتان فأكثر تصعيد، وحادثة واحدة توتر، ولا شيء هدوء.','The index counts incidents confirmed by two sources in the last 3 days: two or more is escalation, one is tense, none is calm.')));
  box.append(cap);return box}
function followBtn(w){
  const f=follows(),on=!!f[w.id],b=el('button','follow');b.type='button';b.setAttribute('aria-pressed',String(on));
  b.textContent=on?L('تتابع هذه الحرب','Following'):L('تابع هذه الحرب','Follow this war');
  b.onclick=()=>{const f=follows();if(f[w.id]){delete f[w.id];toast(L('أُلغيت المتابعة','Unfollowed'))}else{f[w.id]=warKey(w);toast(L('ستنبّهك «عبدو نيوز» بكل تطور موثّق جديد في هذه الحرب','Abdo News will alert you to each new verified development in this war'));
      try{if('Notification' in window&&Notification.permission==='default')Notification.requestPermission()}catch(e){}}
    store.set('khabar-follow',f);render()};return b}
// تنبيه المتابعة: يظهر أعلى الصفحة إذا جدّ تطور موثّق في حرب يتابعها القارئ منذ آخر زيارة
function followAlert(){
  if(!WARS)return null;const f=follows(),fresh=WARS.wars.filter(w=>f[w.id]!=null&&f[w.id]!==warKey(w)&&w.timeline&&w.timeline.length);
  if(!fresh.length)return null;const box=el('div','war-alert');box.setAttribute('role','status');box.append(el('b',null,L('تطور جديد في حرب تتابعها','New development in a war you follow')));
  fresh.forEach(w=>{const a=el('a',null,`${w.name[LANG]}: ${w.timeline[0][LANG]||w.timeline[0].ar||w.timeline[0].en}`);a.href='#war-'+w.id;box.append(a)});
  try{if('Notification' in window&&Notification.permission==='granted'&&!followAlert.sent){followAlert.sent=1;fresh.forEach(w=>new Notification(w.name[LANG],{body:w.timeline[0][LANG]||w.timeline[0].ar||w.timeline[0].en,icon:'assets/icon-192.png',tag:'khabar-war-'+w.id}))}}catch(e){}
  return box}
function milHead(eyebrow,title,intro){const h=el('div','ed-head');h.append(el('span','eyebrow',eyebrow),el('h1',null,title));if(intro)h.append(el('p','mute',intro));return h}
function viewMilitary(){
  if(!MIL){main.append(milHead(L('القسم العسكري','Military desk'),t('military')),el('p','empty',L('يُنشر القسم العسكري مع الخلاصة التالية.','The military desk is published with the next brief.')));return}
  const S=MIL.sources,hidden=new Set(ADMIN.hidden||[]);
  const h=milHead(L('القسم العسكري','Military desk'),`${t('edition_'+(MIL.edition||'pm'))} · ${fmtDate(MIL.date,true)}`,L('الأخبار العسكرية في ثلاث دوائر: أوروبا، ثم الشرق الأوسط، ثم العالم. لا يُنشر خبر هنا إلا إذا أكدته جهتان مستقلتان على الأقل، وتظهر تحت كل خبر جهاته وروابطه.','Military news in three circles: Europe, then the Middle East, then the world. A story appears here only when at least two independent outlets confirm it, and its outlets and links are shown under it.'));
  const n=MIL.regions.reduce((s,r)=>s+r.items.filter(i=>!hidden.has(i.id)&&i[LANG]).length,0),m=el('div','ed-meta');
  m.append(el('span',null,`${t('published')}: ${fmtTime(MIL.published)}`),el('span',null,nItems(n)),el('span',null,nSources(Object.keys(S).length)));h.append(m);
  if(MIL.auto)h.append(el('p','auto-note',L('رصد آلي: عناوين عسكرية تكررت لدى جهتين مستقلتين على الأقل، لكل منها رابطها الأصلي. يُضاف التحليل حين يصدر القسم التحريري.','Automatic watch: military headlines repeated by at least two independent outlets, each with its original link. Analysis is added when the editorial desk is published.')));
  main.append(h);const fa=followAlert();if(fa)main.append(fa);
  if(WARS){const ws=el('section','zone');const hd=el('div','zone-head');hd.append(el('h2',null,t('wars')));const a=el('a','more',L('كل ملفات الحروب','All war files'));a.href='#wars';hd.append(a);ws.append(hd,conflictMap(WARS.wars));
    const row=el('div','war-strip');WARS.wars.forEach(w=>{const c=el('a','war-chip');c.href='#war-'+w.id;c.append(lvlPill(w),el('span',null,w.name[LANG]));row.append(c)});ws.append(row);main.append(ws)}
  main.append(searchBox());
  listHost=el('div');listHost.style.cssText='display:grid;gap:28px';main.append(listHost);renderMilList();
  if((MIL.arms||[]).length){const s=el('section','zone');const hd=el('div','zone-head');hd.append(el('h2',null,L('صفقات السلاح والإنفاق الدفاعي','Arms deals and defence spending')));s.append(hd);
    const ul=el('ul','items');MIL.arms.forEach(a=>ul.append(milCard(Object.assign({cat:{ar:KIND[a.kind]?.[0]||'',en:KIND[a.kind]?.[1]||''}},a,{kind:null}),S,'var(--dawn)')));s.append(ul);main.append(s)}
  const w=el('section','sources-all');w.append(el('h3',null,L('كل مصادر القسم العسكري','All military desk sources')));const ol=el('ol');
  Object.values(S).forEach(s=>{const li=el('li'),a=el('a',null,s[LANG]);a.href=s.url;a.target='_blank';a.rel='noopener';li.append(a,` · ${fmtDate(s.date)}`);ol.append(li)});w.append(ol);main.append(w);
}
function renderMilList(){if(!listHost)return;listHost.textContent='';const S=MIL.sources,hidden=new Set(ADMIN.hidden||[]);let any=false;
  MREG.map(id=>MIL.regions.find(r=>r.id===id)).filter(Boolean).forEach(r=>{
    let items=r.items.filter(i=>!hidden.has(i.id)&&i[LANG]);
    if(QUERY)items=items.filter(i=>i[LANG].toLowerCase().includes(QUERY.toLowerCase())||i.cat[LANG].toLowerCase().includes(QUERY.toLowerCase()));
    if(QUERY&&!items.length)return;any=true;
    const sec=el('section','zone');sec.id='mil-'+r.id;const h=el('div','zone-head'),dot=el('span','dot');dot.style.background=MRC[r.id];h.append(dot,el('h2',null,r.name[LANG]),el('span','count',nItems(items.length)));sec.append(h);
    const ul=el('ul','items');items.forEach(i=>ul.append(milCard(i,S,MRC[r.id])));if(!items.length)sec.append(el('p','empty',L('لا أخبار عسكرية مؤكدة من جهتين في هذه الدائرة الآن.','No military story confirmed by two outlets in this circle right now.')));else sec.append(ul);
    if(!QUERY&&r.analysis){const b=el('div','box analysis'),k=el('div','k');k.append(t('analysis'),el('span','tag',t('analysis_tag')));b.append(k,el('p',null,r.analysis[LANG]),msrc(S,r.analysis.src,t('basis')));sec.append(b)}
    listHost.append(sec)});
  if(!any)listHost.append(el('p','empty',t('no_results')))}
function sinceTxt(w){if(!w.since)return null;return L('منذ ','Since ')+fmtDate(w.since)}
function viewWars(){
  main.append(milHead(L('ملفات الحروب','War files'),t('wars'),L('ملف لكل حرب يتجدد مع كل خلاصة: البطاقة والأطراف، وآخر تطور، وخط زمني يومي، ومسار التفاوض والوساطات، والأثر الاقتصادي. كل مدخل بمصدرين مستقلين على الأقل.','One file per war, refreshed with every brief: the card and parties, the latest development, a daily timeline, the negotiation and mediation track, and the economic impact. Every entry has at least two independent sources.')));
  if(!WARS){main.append(el('p','empty',L('تُنشر ملفات الحروب مع الخلاصة التالية.','War files are published with the next brief.')));return}
  const fa=followAlert();if(fa)main.append(fa);main.append(conflictMap(WARS.wars));
  const g=el('div','war-grid');const S=WARS.sources;
  WARS.wars.forEach(w=>{const c=el('article','war-card');c.style.setProperty('--lc',lvl(w.level).c);
    const h=el('div','wc-head');const a=el('a',null,w.name[LANG]);a.href='#war-'+w.id;const h2=el('h2');h2.append(a);h.append(h2,lvlPill(w));c.append(h);
    const meta=el('p','wc-meta');const st=sinceTxt(w);if(st)meta.append(el('span',null,st));if(w.parties)meta.append(el('span',null,w.parties[LANG]));c.append(meta);
    if(w.timeline&&w.timeline[0]){const e=w.timeline[0],l=el('div','wc-last');l.append(el('b',null,L('آخر تطور','Latest')+' · '+fmtDate(e.date)),el('p',null,e[LANG]||e.ar||e.en),msrc(S,e.src));c.append(l)}
    const ft=el('div','wc-foot');const more=el('a','btn',L('افتح الملف','Open file'));more.href='#war-'+w.id;ft.append(more,followBtn(w));c.append(ft);g.append(c)});
  main.append(g);
}
function viewWar(id){
  const w=WARS&&WARS.wars.find(x=>x.id===id);if(!w){main.append(el('p','empty',L('لم نجد هذا الملف.','File not found.')));return}
  const f=follows();if(f[w.id]!=null&&f[w.id]!==warKey(w)){f[w.id]=warKey(w);store.set('khabar-follow',f)}
  const S=WARS.sources;const back=el('a','back',L('← كل ملفات الحروب','← All war files'));back.href='#wars';if(LANG==='ar')back.textContent='→ كل ملفات الحروب';main.append(back);
  const h=milHead(L('ملف حرب','War file'),w.name[LANG]);const m=el('div','ed-meta');m.append(lvlPill(w));const st=sinceTxt(w);if(st)m.append(el('span',null,st));
  if(w.last)m.append(el('span',null,L('آخر تحديث للملف: ','File updated: ')+fmtDate(w.last)));h.append(m,followBtn(w));main.append(h);
  main.append(conflictMap(WARS.wars,w.id));
  const card=el('section','war-sheet');
  const row=(k,v,src)=>{const d=el('div','ws-row');d.append(el('b',null,k));const p=el('div');p.append(el('p',null,v));if(src&&src.length)p.append(msrc(S,src));d.append(p);card.append(d)};
  if(w.since)row(L('البدء','Began'),fmtDate(w.since),w.since_src);
  if(w.parties)row(L('الأطراف','Parties'),w.parties[LANG],w.parties_src);
  if(w.summary)row(L('الصورة العامة','Overview'),w.summary[LANG],w.summary.src);
  if(w.timeline&&w.timeline[0])row(L('آخر تطور','Latest development'),w.timeline[0][LANG]||w.timeline[0].ar||w.timeline[0].en,w.timeline[0].src);
  main.append(card);
  const fs=el('section','zone');const fh=el('div','zone-head');fh.append(el('h2',null,L('الحصيلة والأرقام','Toll and figures')));fs.append(fh);
  if((w.figures||[]).length){const g=el('div','ticks wfig');w.figures.forEach(x=>{const d=el('div','tick');d.append(el('b',null,LANG==='en'&&x.value_en?x.value_en:x.value),el('small',null,x[LANG]),msrc(S,x.src));g.append(d)});fs.append(g)}
  if(w.toll_note)fs.append(el('p','basis',w.toll_note[LANG]));main.append(fs);
  const ts=el('section','zone');const th=el('div','zone-head');th.append(el('h2',null,L('الخط الزمني','Timeline')),el('span','count',nCount(w.timeline.length,['مدخل واحد','مدخلان','مداخل','مدخلاً','مدخل'],['entry','entries'])));ts.append(th);
  const ol=el('ol','wtl');w.timeline.forEach(e=>{const li=el('li');li.dataset.kind=e.kind||'';const wh=el('div','when');wh.append(fmtDate(e.date));if(KIND[e.kind])wh.append(el('small',null,KIND[e.kind][LANG==='en'?1:0]));
    const wt=el('div','what');wt.append(el('p',null,e[LANG]||e.ar||e.en));if(e.auto)wt.append(el('small','mute',L('رصد آلي: عنوان نشرته جهتان مستقلتان فأكثر','Auto-watch: a headline published by two or more independent outlets')));const v=el('div','vline');v.append(verified(e.outlets||e.src.length),msrc(S,e.src));wt.append(v);li.append(wh,wt);ol.append(li)});ts.append(ol);main.append(ts);
  const ks=el('section','zone');const kh=el('div','zone-head');kh.append(el('h2',null,L('التفاوض والهدن والوساطات','Talks, truces and mediation')));ks.append(kh);
  if((w.talks||[]).length){const ol2=el('ol','wtl talks');w.talks.forEach(e=>{const li=el('li');const wh=el('div','when');wh.append(fmtDate(e.date));if(KIND[e.kind])wh.append(el('small',null,KIND[e.kind][LANG==='en'?1:0]));
    const wt=el('div','what');wt.append(el('p',null,e[LANG]),msrc(S,e.src));li.append(wh,wt);ol2.append(li)});ks.append(ol2)}
  else ks.append(el('p','empty',L('لا مسار تفاوض موثّق من جهتين في هذه الخلاصة.','No negotiation track confirmed by two outlets in this brief.')));main.append(ks);
  if(w.economy){const es=el('section','zone');const eh=el('div','zone-head');eh.append(el('h2',null,L('الأثر الاقتصادي','Economic impact')));es.append(eh);
    const b=el('div','box technical');b.append(el('p',null,w.economy[LANG]),msrc(S,w.economy.src));es.append(b);
    const ids=w.economy.markets||[],ms=(BRIEF&&BRIEF.markets||[]).filter(x=>ids.includes(x.id));
    if(ms.length){const g=el('div','ticks');ms.forEach(mk=>{const d=el('div','tick');d.append(el('small',null,mk[LANG]));const bb=el('b',null,mk.value);bb.append(el('span','unit',mk.unit[LANG]));d.append(bb);
      const chg=LANG==='en'&&mk.chg_en?mk.chg_en:mk.chg;const e=el('em',mk.dir);if(chg){const bd=el('bdi',null,chg);if(/[0-9]/.test(chg))bd.dir='ltr';e.append(bd,' · ')}e.append(mk.note[LANG]);d.append(e,srcLine(mk.src));g.append(d)});
      es.append(el('p','basis',L('أرقام الأسواق المرتبطة من «أرقام اليوم» في الخلاصة الحالية:','Linked market figures from "Today\'s numbers" in the current brief:')),g)}
    main.append(es)}
  // أخبار القسم العسكري الحالية المرتبطة بهذه الحرب
  if(MIL){const rel=MIL.regions.flatMap(r=>r.items.filter(i=>i.war===w.id).map(i=>[i,r]));if(rel.length){const s=el('section','zone');const hd=el('div','zone-head');hd.append(el('h2',null,L('في القسم العسكري اليوم','In today\'s military desk')));s.append(hd);
    const ul=el('ul','items');rel.forEach(([i,r])=>ul.append(milCard(i,MIL.sources,MRC[r.id])));s.append(ul);main.append(s)}}
}
// بطاقة مختصرة في الصفحة الرئيسية تقود إلى القسمين
function milTeaser(){
  if(!WARS&&!MIL)return null;const s=el('section','mil-teaser');const h=el('div','zone-head');h.append(el('h2',null,t('military')));const a=el('a','more',L('افتح القسم العسكري','Open the military desk'));a.href='#military';h.append(a);s.append(h);
  if(WARS){const row=el('div','war-strip');WARS.wars.forEach(w=>{const c=el('a','war-chip');c.href='#war-'+w.id;c.append(lvlPill(w),el('span',null,w.name[LANG]));row.append(c)});s.append(row)}
  if(MIL){const n=MIL.regions.reduce((x,r)=>x+r.items.length,0);s.append(el('p','basis',L(`${nItems(n)} عسكرية مؤكدة من جهتين على الأقل: أوروبا، ثم الشرق الأوسط، ثم العالم.`,`${nItems(n)} confirmed by at least two outlets: Europe, then the Middle East, then the world.`)))}
  return s}

// «مناخ العالم» في الصفحة الرئيسية: أحدث ثلاثة أخبار مؤكدة من جهتين مستقلتين فأكثر، مع مصادرها، ورابط إلى قسم الطقس والمناخ
function climateBlock(){
  if(!CLIM||QUERY)return null;const hid=new Set(ADMIN.climate_hidden||[]);
  if(ADMIN.climate_off)return null;
  const list=(CLIM[LANG]||[]).filter(x=>!hid.has(x.id)&&(x.sources||[]).length>=2).slice(0,3);
  const w=el('section','zone climate-home');const h=el('div','zone-head'),dot=el('span','dot');dot.style.background='var(--sea)';
  const more=el('a','count',L('الطقس في مكانك وكل أخبار المناخ ←','Your weather and all climate news →'));more.href='weather/';h.append(dot,el('h2',null,t('climate')),more);w.append(h);
  if(!list.length){w.append(el('p','empty',L('لا يوجد الآن خبر مناخي مؤكد من جهتين مستقلتين.','No climate story is confirmed by two independent outlets right now.')));return w}
  const ul=el('ul','items');list.forEach(x=>{const li=el('li','item');li.style.setProperty('--zc','var(--sea)');
    li.append(el('span','cat',x.outlets===2?L('مؤكد من جهتين مستقلتين','Confirmed by two independent outlets'):L(`مؤكد من ${x.outlets} جهات مستقلة`,`Confirmed by ${x.outlets} independent outlets`)),el('p',null,x.title));
    const box=el('div','src');box.append(el('span','lbl',t('sources')+':'));x.sources.forEach(s=>{const a=el('a',null,`${s.name} · ${fmtDate(s.date)}`);a.href=s.url;a.target='_blank';a.rel='noopener';box.append(a)});
    if(x.data){const a=el('a',null,`GDACS · ${x.data.date?fmtDate(x.data.date):''}`);a.href=x.data.url;a.target='_blank';a.rel='noopener';box.append(a)}
    li.append(box);ul.append(li)});
  w.append(ul);return w;
}

/* ---------- views ---------- */
const main=$('#main');
let listHost=null;
function renderList(){if(!listHost)return;listHost.textContent='';let any=false;
  BRIEF.zones.forEach(z=>{const s=zoneSection(z,false);if(s){listHost.append(s);any=true}});
  if(!any)listHost.append(el('p','empty',t('no_results')));}
function viewToday(){
  main.append(edHead());
  const th=el('div','thread');th.append(el('b',null,t('thread')),el('p',null,BRIEF.thread[LANG]),srcLine(BRIEF.thread.src,t('basis')));main.append(th);
  {const fa=followAlert();if(fa)main.insertBefore(fa,main.firstChild)}
  if(window.KD&&!QUERY)KD.home().forEach(b=>main.append(b));
  if(!VIEW.startsWith('b-')&&!QUERY){const mh=marsadHome();if(mh)main.append(mh)}
  main.append(markets());{const mt=milTeaser();if(mt)main.append(mt)}if(window.KC&&!QUERY)KC.home().forEach(b=>main.append(b));{const cb=climateBlock();if(cb)main.append(cb)}main.append(searchBox());
  listHost=el('div');listHost.style.cssText='display:grid;gap:28px';main.append(listHost);renderList();
  main.append(allSources());
}
function viewZone(id){const z=BRIEF.zones.find(x=>x.id===id);main.append(edHead());if(z)main.append(zoneSection(z,true))}
function viewRoadmap(){
  const h=el('div','ed-head');h.append(el('span','eyebrow',L('ما الذي ينتظرنا','What comes next')),el('h1',null,t('roadmap')),el('p','mute',t('road_intro')));main.append(h);
  // المواعيد التي مضت تختفي تلقائياً بتوقيت الدوحة، حتى لو تأخر تحديث الخلاصة
  const dp=dohaParts(new Date()),today=`${dp.year}-${dp.month}-${dp.day}`;
  // المواعيد بشهر دون يوم تختفي أيضاً بعد انقضاء شهرها
  const month=today.slice(0,7),key=r=>r.date||(r.month?r.month+'-99':'9999');
  const all=[...BRIEF.roadmap].filter(r=>r.date?r.date>=today:(!r.month||r.month>=month)).sort((a,b)=>key(a).localeCompare(key(b)));
  if(!all.length){main.append(el('p','empty',L('لا مواعيد قادمة مسجّلة الآن، وتُحدَّث مع الخلاصة التالية.','No upcoming dates are listed right now; they are refreshed with the next brief.')));return}
  // تصفية حسب الدائرة، مع عدد المواعيد في كل دائرة
  const zf=FILTER.road||null,ch=el('div','chips road-filter');ch.setAttribute('role','group');ch.setAttribute('aria-label',L('تصفية حسب الدائرة','Filter by circle'));
  [null,...ZONES].forEach(z=>{const n=z?all.filter(r=>r.zone===z).length:all.length;if(z&&!n)return;const b=el('button','chip',`${z?t(z):t('all')} (${n})`);b.type='button';b.setAttribute('aria-pressed',String(zf===z));b.onclick=()=>{FILTER.road=z;render()};ch.append(b)});
  main.append(ch);
  const items=zf?all.filter(r=>r.zone===zf):all;
  const card=r=>{const li=el('li'),w=el('div','when');if(r.date===today||(r.from&&r.from<=today&&r.date>=today))li.classList.add('is-today');
    if(r.date){w.append(r.from?fmtRange(r.from,r.date):fmtDate(r.date));const d=new Date(r.date+'T00:00:00Z');w.append(el('small',null,r.from?'':DAYS[LANG][d.getUTCDay()]))}
    else{w.append(r.month?fmtDate(r.month):'—');w.append(el('small',null,t('tbd')))}
    if(li.classList.contains('is-today'))w.append(el('span','today-chip',r.from&&r.date!==today?L('جارٍ الآن','Ongoing'):L('اليوم','Today')));
    const what=el('div','what'),zc=el('span','zchip',t(r.zone));zc.style.background=ZC[r.zone];zc.dataset.zone=r.zone;if(r.zone==='world')zc.style.color='var(--bg)';
    what.append(zc,el('p',null,r[LANG]),srcLine(r.src));
    if(r.scn){const s=el('p','scn');s.append(el('b',null,t('scenario')+' ('+t('outlook_tag')+'): '),r.scn[LANG]);what.append(s)}
    li.append(w,what);return li};
  // المواعيد مجمّعة حسب الشهر، وما لم يُعلن موعده في آخر القائمة
  const groups=[];items.forEach(r=>{const g=(r.date||r.month||'').slice(0,7)||'tbd';let last=groups[groups.length-1];if(!last||last.g!==g)groups.push(last={g,list:[]});last.list.push(r)});
  groups.forEach(({g,list})=>{const hd=el('h2','road-month');hd.append(g==='tbd'?t('tbd'):fmtDate(g),el('span','count',nDates(list.length)));
    const ol=el('ol','road');list.forEach(r=>ol.append(card(r)));main.append(hd,ol)});
}
function viewLedger(){
  const h=el('div','ed-head');h.append(el('span','eyebrow',L('كيف يعمل «عبدو نيوز»','How Abdo News works')),el('h1',null,L('سجل الشفافية','Transparency ledger')),
    el('p','mute',L('يكتب «عبدو نيوز» وكيل ذكاء مستقل، ولا يُنشر فيه شيء قبل أن يمر ببوابات تحقق برمجية ومدقق مستقل. هنا نعرض ما نشرناه، وما حذفناه ولماذا، وكم كلّف.','Abdo News is written by an autonomous AI agent, and nothing is published before it passes programmatic verification gates and an independent fact-checker. Here we show what we published, what we dropped and why, and what it cost.')));main.append(h);
  const steps=[[L('الكشّاف','Scout'),L('يجمع عناوين الساعات الأخيرة من عشرات المصادر كل 3 ساعات.','Gathers recent headlines from dozens of outlets every 3 hours.')],
    [L('أربعة مراسلين','Four reporters'),L('يعمل مراسل لكل دائرة بالتوازي: يبحث ويفتح المقالات الأصلية بنفسه، ويسلّم كل خبر مع اقتباس حرفي من مصدره.','One reporter per circle works in parallel: it searches, opens the original articles itself, and files each story with a verbatim quote from its source.')],
    [L('بوابة المصدر','Source gate'),L('برنامج لا يُقنَع: يرفض أي رابط لم يظهر فعلاً في البحث، وروابط التحويل، والمصادر القديمة، والاقتباس الذي لا يوجد في الصفحة.','Code that cannot be talked round: it rejects any link that never appeared in search, redirect links, stale sources, and quotes not found on the page.')],
    [L('مطابقة الأرقام','Figure matching'),L('كل رقم في الخبر يُبحث عنه في صفحة مصدره نفسها.','Every figure in a story is looked up on its own source page.')],
    [L('المدقق المستقل','Independent checker'),L('نموذج آخر يقرأ الخبر واقتباساته فقط، ويحذف ما لا تسنده.','A separate model reads only the story and its quotes, and removes anything they do not support.')],
    [L('رئيس التحرير','Editor-in-chief'),L('يكتب خيط اليوم من الأخبار الناجية وحدها، ثم تُنشر الخلاصة ويُحدَّث هذا السجل.','Writes the day\'s thread from surviving stories only; then the brief is published and this ledger updated.')]];
  const ol=el('ol','pipeline');steps.forEach(([a,b],i)=>{const li=el('li');li.append(el('b',null,`${i+1}. ${a}`),el('p',null,b));ol.append(li)});main.append(ol);
  if(!LEDGER){main.append(el('p','empty',L('يظهر السجل بعد أول فحص آلي للخلاصة.','The ledger appears after the first automatic check of the brief.')));return}
  const S=LEDGER.summary||{},k=el('div','ticks');
  [[S.items,L('خبراً منشوراً','stories published')],[S.sources,L('مصدراً موثّقاً','cited sources')],[S.outlets,L('جهة مستقلة','independent outlets')],[S.multi_source,L('خبراً من جهتين فأكثر','multi-outlet stories')],
   [S.numbers_total?`${S.numbers_grounded}/${S.numbers_total}`:'—',L('رقماً مطابقاً لمصدره','figures matched to source')],[S.reachable+'/'+((S.reachable||0)+(S.blocked||0)+(S.broken||0)),L('رابطاً فُتح آلياً بنجاح','links opened by the checker')]]
   .forEach(([v,l])=>{const d=el('div','tick');d.append(el('b',null,String(v??'—')),el('small',null,l));k.append(d)});main.append(k);
  main.append(el('p','basis',`${L('آخر فحص','Last check')}: ${fmtDate(LEDGER.checked.slice(0,10))}، ${fmtTime(LEDGER.checked)} · ${t('edition_'+(((LEDGER.brief||'').match(/-(am|md|pm|nt)$/)||[])[1]||'am'))} ${fmtDate((LEDGER.brief||'').slice(0,10))}`.replace('، ',LANG==='en'?', ':'، ')));
  if(S.blocked)main.append(el('p','mute',L('بعض المواقع تمنع الفحص الآلي لصفحاتها؛ تبقى روابطها منشورة لتتحقق منها بنفسك، ولا يُعدّ ذلك خللاً في المصدر.','Some sites block automated checks; their links stay published for you to verify yourself, and this is not counted as a fault in the source.')));
  const drops=[...(LEDGER.agent_dropped||[]),...(LEDGER.dropped||[]).map(d=>({stage:L('الفحص النهائي','Final check'),text:d.text,reason:d.reason,zone:d.zone}))];
  const dh=el('h2',null,L('ما حذفناه قبل النشر ولماذا','What we dropped before publishing, and why'));dh.style.marginTop='18px';main.append(dh);
  if(!drops.length)main.append(el('p','mute',L('لم يُحذف شيء في هذه الخلاصة: كل ما كُتب اجتاز بوابات التحقق.','Nothing was dropped from this brief: everything written passed the verification gates.')));
  else{const ul=el('ul','drops');drops.forEach(d=>{const li=el('li');li.append(el('span','stage',d.stage+(d.zone?' · '+t(d.zone):'')),el('p',null,d.text),el('small',null,d.reason));ul.append(li)});main.append(ul)}
  const rh=el('h2',null,L('سجل تشغيل الوكيل','Agent run log'));rh.style.marginTop='18px';main.append(rh);
  if(!(LEDGER.runs||[]).length){main.append(el('p','mute',L('لم يُسجَّل تشغيل للوكيل المستقل بعد. الخلاصات الحالية يكتبها المحرر المجدول، وتمر بالبوابة نفسها بعد النشر.','No autonomous agent runs are logged yet. Current briefs are written by the scheduled editor and pass the same gate after publishing.')));return}
  const tb=el('div','runs');LEDGER.runs.slice(0,10).forEach(r=>{const d=el('div','run');
    d.append(el('b',null,`${r.mode==='brief'?L('خلاصة','Brief'):L('عاجل','Breaking')} · ${fmtDate(r.at.slice(0,10))}، ${fmtTime(r.at)}`.replace('، ',LANG==='en'?', ':'، ')));
    d.append(el('span',null,`${L('نُشر','published')} ${r.published}/${r.proposed} · ${L('حُذف','dropped')} ${r.dropped} · ${L('بحث','searches')} ${r.searches} · ${L('صفحات','pages')} ${r.fetches}`));
    d.append(el('small','mute',`${r.model} · ${Math.round(r.seconds/60)} ${L('دقيقة','min')} · ${L('الكلفة','cost')} $${Number(r.usd).toFixed(2)}`));tb.append(d)});main.append(tb);
}
function viewSaved(){
  const h=el('div','ed-head');h.append(el('h1',null,t('saved')));main.append(h);
  const s=Object.values(saved());if(!s.length){main.append(el('p','empty',t('no_saved')));return}
  const ul=el('ul','items');const keep=BRIEF.sources;
  s.forEach(x=>{BRIEF.sources=Object.assign({},keep,x.sources);ul.append(itemCard(x.it,x.zone))});BRIEF.sources=keep;main.append(ul);
}
function viewAbout(){
  const w=el('div','about');
  const h=el('div','ed-head');h.append(el('span','eyebrow',t('about')),el('h1',null,L('خلاصة يومك، من الدوحة إلى العالم','Your daily brief, from Doha to the world')));w.append(h);
  const who=el('div','who');who.append(el('h2',null,L('من نحن','Who we are')),el('p',null,L('«عبدو نيوز» خلاصة إخبارية يومية مستقلة تصدر من الدوحة أربع مرات في اليوم، وكانت تُعرف سابقاً باسم «خبر». نقرأ عشرات المصادر نيابة عنك، ولا ننشر خبراً إلا إذا أكدته جهتان مستقلتان على الأقل، ونضع تحت كل خبر روابط مصادره الأصلية ودرجة تحققه. شعارنا فقاعة كلام فيها سطران وعلامة تحقق: الخبر كما قيل، بعد أن تحققنا منه.','Abdo News is an independent daily news brief published from Doha four times a day, formerly known as Khabar. We read dozens of sources for you and publish a story only when at least two independent outlets confirm it, with links to its original sources and its verification level under every story. Our mark is a speech bubble holding two lines and a check: the news as it was reported, after we verified it.')));w.append(who);
  const v=el('div','vision');
  const a=el('div');a.append(el('h2',null,L('الرؤية','Vision')),el('p',null,L('أن يكون «عبدو نيوز» المرجع اليومي الأوثق للقارئ في قطر: يفهم به ما يجري حوله في دقائق، ويثق في كل كلمة لأنه يعرف من أين جاءت.','For Abdo News to be the most trusted daily reference for readers in Qatar: a way to understand what is happening around them in minutes, and to trust every word because they know where it came from.')));
  const b=el('div');b.append(el('h2',null,L('الهدف','Goal')),el('p',null,L('أن نقرأ عشرات المصادر نيابة عنك، ونكتب لك خلاصة دقيقة كل 6 ساعات: قطر أولاً ثم الخليج ثم مصر ثم العالم، مع تحليل يشرح ما وراء الخبر، واستقراء لما قد يأتي، وخريطة للأحداث القادمة.','To read dozens of sources on your behalf and write you an accurate brief every 6 hours: Qatar first, then the Gulf, then Egypt, then the world, with analysis that explains what lies behind the news, an outlook on what may come, and a roadmap of upcoming events.')));
  v.append(a,b);w.append(v);
  w.append(el('h2',null,L('ركائزنا','Our pillars')));
  const P=el('div','pillars');
  [[L('المصداقية','Credibility'),L('لا نختلق ولا نبالغ. ننقل ما قالته المصادر كما قالته، ونصحّح علناً إذا أخطأنا.','We do not invent or exaggerate. We report what sources said as they said it, and correct openly if we get it wrong.')],
   [L('التوثيق','Attribution'),L('لا خبر ولا عنوان ولا رقم دون مصدره: اسم المصدر وتاريخ النشر والرابط الأصلي، وكل المصادر عند تعددها. ما لا مصدر له لا يُنشر.','No story, headline or figure without its source: outlet name, publication date and original link, and every source when there are several. Anything without a source is not published.')],
   [L('التحليل','Analysis'),L('نفصل الخبر عن الرأي فصلاً واضحاً. التحليل موسوم بأنه رأي تحريري، ويذكر الأخبار التي بُني عليها.','We keep news and opinion clearly apart. Analysis is labelled as editorial view and names the stories it is built on.')],
   [L('الاستقراء','Outlook'),L('نقرأ ما قد يترتب على أخبار اليوم، ونسمّيه توقّعاً لا خبراً، ونربطه بمصادره وبالمواعيد المقررة في خريطة الطريق.','We read what today\'s news may lead to, call it a forecast rather than news, and tie it to its sources and to scheduled dates on the roadmap.')]
  ].forEach(([h,p])=>{const d=el('div','pillar');d.append(el('h3',null,h),el('p',null,p));P.append(d)});w.append(P);
  w.append(el('h2',null,L('كيف نكتب','How we write')));
  w.append(el('p',null,L('يكتب «عبدو نيوز» وكيل ذكاء مستقل يعمل بإشراف تحريري: نقرأ المصادر الرسمية والصحف المعتمدة في قطر والخليج ومصر والعالم، ونجمع الخبر الواحد من مصادره المختلفة في فقرة واحدة بصياغتنا الخاصة، ونحيلك إلى المصدر الأصلي لقراءته كاملاً. ومسار التحقق كاملاً في صفحة «الشفافية». تُنشر أربع خلاصات يومياً كل 6 ساعات بتوقيت الدوحة: الصباح 06:00، والظهيرة 12:00، والمساء 18:00، والليل 00:00، وتُحدَّث العناوين الآلية كل 3 ساعات.','Abdo News is written by an autonomous AI agent under editorial rules: we read official sources and established outlets in Qatar, the Gulf, Egypt and the world, combine each story from its different sources into one paragraph in our own words, and link you to the original to read it in full. The full verification trail is on the Transparency page. Four briefs are published daily, every 6 hours, Doha time: morning at 06:00, midday at 12:00, evening at 18:00 and night at 00:00; automatic headlines refresh every 3 hours.')));
  if(ARCH&&ARCH.briefs&&ARCH.briefs.length){w.append(el('h2',null,t('archive')));const ul=el('ul','items');
    ARCH.briefs.slice().reverse().forEach(x=>{const li=el('li','item');const a=el('a',null,`${t('edition_'+(x.edition||'am'))} · ${fmtDate(x.date,true)}`);a.href='#b-'+x.id;li.append(a);ul.append(li)});w.append(ul)}
  w.append(el('h2',null,L('تواصل معنا','Contact us')));
  const c=el('div','contact-card');
  [[t('contact_email'),CFG.EMAIL],[t('contact_phone'),CFG.PHONE]].forEach(([k,v])=>{const b=el('button','copy');b.type='button';b.append(k+':',el('span',null,v));b.onclick=()=>{try{navigator.clipboard.writeText(v).then(()=>toast(L('نُسخ','Copied')),()=>fallback(v,()=>toast(L('نُسخ','Copied'))))}catch(e){fallback(v,()=>toast(L('نُسخ','Copied')))}};c.append(b)});
  const wa=el('a','btn',L('راسلنا على واتساب','Message us on WhatsApp'));wa.href='https://wa.me/'+CFG.WHATSAPP;wa.target='_blank';wa.rel='noopener';c.append(wa);
  w.append(c);main.append(w);
}

function render(){
  const y=scrollY;main.textContent='';listHost=null;header();
  if(!BRIEF){main.append(el('p','empty',t('err')));return}
  if(VIEW==='today'||VIEW.startsWith('b-'))viewToday();
  else if(ZONES.includes(VIEW))viewZone(VIEW);
  else if(VIEW==='roadmap')viewRoadmap();
  else if(VIEW==='saved')viewSaved();
  else if(VIEW==='ledger')viewLedger();
  else if(VIEW==='marsad')viewMarsad();
  else if(VIEW==='about')viewAbout();
  else if(VIEW==='military')viewMilitary();
  else if(VIEW==='wars')viewWars();
  else if(VIEW.startsWith('war-'))viewWar(VIEW.slice(4));
  else if(window.KC&&KC.has(VIEW))KC.view(VIEW,main);
  else if(window.KD&&KD.has(VIEW))KD.view(VIEW,main);
  else viewToday();
  if(render.keep)scrollTo(0,y);render.keep=true;
}
async function route(){
  const h=location.hash.slice(1)||'today';const prev=VIEW;VIEW=h;if(h!==prev)QUERY='';
  try{
    if(h.startsWith('b-')){await load(h.slice(2))}
    else if(!BRIEF||(prev.startsWith('b-'))){await load()}
  }catch(e){console.error(e);BRIEF=null}
  try{await loadMil()}catch(e){}
  try{if(window.KD)await KD.load()}catch(e){}
  try{if(window.KC)await KC.load()}catch(e){}
  render.keep=false;render();if(prev!==VIEW)scrollTo(0,0);
  if(window.KD){KD.hit(VIEW);KD.ld()}
}
// زر «العودة إلى الأعلى»: يظهر بعد تمرير شاشتين في الصفحات الطويلة، خصوصاً على الجوال
{const up=el('button','to-top');up.type='button';up.hidden=true;up.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 5l-7 7m7-7l7 7M12 5v14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
 const lbl=()=>{const t=LANG==='en'?'Back to top':'العودة إلى الأعلى';up.setAttribute('aria-label',t);up.title=t};lbl();
 up.onclick=()=>{scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});const m=document.querySelector('main,#main');if(m){m.setAttribute('tabindex','-1');m.focus({preventScroll:true})}};
 let tk=0;addEventListener('scroll',()=>{if(tk)return;tk=requestAnimationFrame(()=>{tk=0;up.hidden=scrollY<innerHeight*2;lbl()})},{passive:true});document.body.append(up)}
// واجهة مشتركة لملف الأقسام (assets/desks.js)
window.KH={el,store,toast,copyText,fmtDate,fmtTime,nItems,CFG,SITE:CFG.SITE,main,dohaDay:x=>{const p=dohaParts(new Date(x));return `${p.year}-${p.month}-${p.day}`},render:()=>{render.keep=false;render()},get LANG(){return LANG},get BRIEF(){return BRIEF},get ADMIN(){return ADMIN}};
addEventListener('hashchange',route);
$('#lang-btn').onclick=()=>{LANG=LANG==='en'?'ar':'en';document.documentElement.lang=LANG;document.documentElement.dir=LANG==='en'?'ltr':'rtl';try{localStorage.setItem('khabar-lang',LANG)}catch(e){}FILTER={};if(BRIEF)BRIEF.zones.forEach(z=>{z.items=(z.all||z.items).filter(i=>i[LANG])});render()};
$('#theme-btn').onclick=()=>{const r=document.documentElement;const dark=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('khabar-theme',r.dataset.theme)}catch(e){}header()};
route();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
