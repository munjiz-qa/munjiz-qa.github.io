'use strict';
// «خبر»: يعرض خلاصة اليوم من data/brief.json، والعناوين الآلية من data/headlines.json، والعاجل والإخفاء من data/admin.json.
(function(){
const CFG=window.KHABAR_CONFIG||{};
const $=s=>document.querySelector(s);
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let LANG=document.documentElement.lang==='en'?'en':'ar';
const L=(a,e)=>LANG==='en'?e:a;

const T={
 brand:['خبر','Khabar'],loading:['جارٍ تحميل خلاصة اليوم…','Loading today\'s brief…'],
 today:['اليوم','Today'],qatar:['قطر','Qatar'],gulf:['الخليج','The Gulf'],egypt:['مصر','Egypt'],world:['العالم','The World'],
 roadmap:['خريطة الطريق','Roadmap'],saved:['المحفوظ','Saved'],about:['عن خبر','About'],archive:['الأرشيف','Archive'],
 footer_note:['كل خبر في «خبر» منسوب إلى مصدره الأصلي برابط مباشر. التحليل والاستقراء اجتهاد تحريري مبني على المصادر المذكورة.','Every story in Khabar is attributed to its original source with a direct link. Analysis and outlook are editorial judgement based on the cited sources.'],
 source:['المصدر','Source'],sources:['المصادر','Sources'],basis:['مبني على','Based on'],
 analysis:['تحليل خبر','Khabar analysis'],analysis_tag:['رأي تحريري','Editorial view'],
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
 edition_am:['خلاصة الصباح','Morning Brief'],edition_pm:['خلاصة المساء','Evening Brief'],
 read_more:['اقرأ الخلاصة','Read brief'],current:['الحالية','current'],
 contact_email:['البريد','Email'],contact_phone:['الهاتف وواتساب','Phone & WhatsApp'],
 err:['تعذّر تحميل الخلاصة. تحقّق من اتصالك ثم أعد تحميل الصفحة.','The brief could not be loaded. Check your connection and reload the page.'],
 theme_dark:['الوضع الليلي','Dark mode'],theme_light:['الوضع النهاري','Light mode']
};
const t=k=>(T[k]||[k,k])[LANG==='en'?1:0];
const ZC={qatar:'var(--dawn)',gulf:'var(--sea)',egypt:'var(--nile)',world:'var(--ink)'};
const ZONES=['qatar','gulf','egypt','world'];
const MONTHS={ar:['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],en:['January','February','March','April','May','June','July','August','September','October','November','December']};
const DAYS={ar:['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],en:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']};
function fmtDate(iso,withDay){if(!iso)return '';const [y,m,d]=iso.split('-').map(Number);if(!d)return MONTHS[LANG][m-1]+' '+y;const dt=new Date(Date.UTC(y,m-1,d));return (withDay?DAYS[LANG][dt.getUTCDay()]+' ':'')+d+' '+MONTHS[LANG][m-1]+' '+y}
function dohaParts(date){const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).map(x=>[x.type,x.value]));return p}
function fmtTime(isoDT){const p=dohaParts(new Date(isoDT));const h=+p.hour,m=p.minute;if(LANG==='en')return `${String(h).padStart(2,'0')}:${m} Doha time`;const h12=h%12||12;return `${h12}:${m} ${h<12?'صباحاً':'مساءً'} بتوقيت الدوحة`}

let BRIEF=null,HEAD=null,ADMIN={breaking:null,hidden:[]},ARCH=null;
let VIEW='today',QUERY='',FILTER={};
const saved=()=>store.get('khabar-saved',{});

/* ---------- data ---------- */
const getJSON=u=>fetch(u,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json()});
async function load(briefId){
  const bu=briefId?`data/archive/${briefId}.json`:'data/brief.json';
  const [b,h,a,ar]=await Promise.all([getJSON(bu),getJSON('data/headlines.json').catch(()=>null),getJSON('data/admin.json').catch(()=>null),getJSON('data/archive/index.json').catch(()=>null)]);
  BRIEF=b;HEAD=h;if(a)ADMIN=Object.assign({breaking:null,hidden:[]},a);ARCH=ar;
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
  document.title=LANG==='en'?'Khabar | Your daily brief from Doha to the world':'خبر | خلاصة يومك من الدوحة إلى العالم';
  const tabs=$('#tabs');tabs.textContent='';
  [['today'],...ZONES.map(z=>[z,ZC[z]]),['roadmap'],['saved'],['about']].forEach(([id,c])=>{
    const a=el('a','tab');a.href='#'+id;if(c){const i=el('i');i.style.background=c==='var(--ink)'?'var(--deep-ink)':c;a.append(i)}a.append(t(id));
    if(id===VIEW||(id==='today'&&VIEW.startsWith('b-')))a.setAttribute('aria-current','page');tabs.append(a)});
  const cur=tabs.querySelector('[aria-current]');if(cur)cur.scrollIntoView({block:'nearest',inline:'center'});
  // contact
  const c=$('#contact');c.textContent='';
  c.append(el('span',null,CFG.EMAIL||''),el('span',null,CFG.PHONE||''));
  // breaking
  const br=$('#breaking'),b=ADMIN.breaking;
  if(b&&b.on&&(!b.until||new Date(b.until)>new Date())&&b.url&&(b.text_ar||b.text_en)){
    br.textContent='';const w=el('div','wrap');w.append(el('b',null,t('breaking')),el('span',null,LANG==='en'?(b.text_en||b.text_ar):(b.text_ar||b.text_en)));
    const a=el('a',null,(t('source'))+': '+(b.source||''));a.href=b.url;a.target='_blank';a.rel='noopener';w.append(a);br.append(w);br.hidden=false;
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
 copy:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" fill="none" stroke="currentColor" stroke-width="2"/></svg>'
};
function shareText(it){const S=BRIEF.sources;return `${it[LANG]}\n\n${t('sources')}: ${it.src.map(id=>`${S[id][LANG]} (${fmtDate(S[id].date)}) ${S[id].url}`).join('\n')}\n\n${t('brand')}: ${CFG.SITE||location.href}`}
function toast(m){const n=$('#toast');n.textContent=m;n.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>n.hidden=true,2200)}
function copyText(s){const done=()=>toast(t('copied'));try{navigator.clipboard.writeText(s).then(done,()=>fallback(s,done))}catch(e){fallback(s,done)}}
function fallback(s,done){const ta=el('textarea');ta.value=s;ta.style.position='fixed';ta.style.opacity='0';document.body.append(ta);ta.select();try{document.execCommand('copy')}catch(e){}ta.remove();done()}
function itemCard(it,zone){
  const li=el('li','item');li.style.setProperty('--zc',ZC[zone]);li.id='i-'+it.id;
  li.append(el('span','cat',it.cat[LANG]));const p=el('p');hl(p,it[LANG]);li.append(p);
  const f=el('div','item-foot');f.append(srcLine(it.src));
  const acts=el('div','acts'),sv=saved(),isS=!!sv[it.id];
  const bs=el('button','act');bs.type='button';bs.setAttribute('aria-pressed',isS);bs.innerHTML=isS?ICON.saved:ICON.save;bs.append(el('span',null,isS?t('saved_t'):t('save')));
  bs.onclick=()=>{const s=saved();if(s[it.id]){delete s[it.id];toast(t('unsaved'))}else{s[it.id]={it,zone,sources:Object.fromEntries(it.src.map(id=>[id,BRIEF.sources[id]])),brief:BRIEF.id};toast(t('saved_ok'))}store.set('khabar-saved',s);render()};
  const bw=el('a','act');bw.innerHTML=ICON.wa;bw.append(el('span',null,t('share')));bw.href='https://wa.me/?text='+encodeURIComponent(shareText(it));bw.target='_blank';bw.rel='noopener';
  const bc=el('button','act');bc.type='button';bc.innerHTML=ICON.copy;bc.setAttribute('aria-label',t('copy'));bc.onclick=()=>copyText(shareText(it));
  acts.append(bs,bw,bc);f.append(acts);li.append(f);return li;
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
  if(QUERY)items=items.filter(i=>i[LANG].toLowerCase().includes(QUERY.toLowerCase())||i.cat[LANG].toLowerCase().includes(QUERY.toLowerCase()));
  if(QUERY&&!items.length)return null;
  const sec=el('section','zone');sec.id=z.id;
  const h=el('div','zone-head'),dot=el('span','dot');dot.style.background=ZC[z.id];
  const h2=full?el('h1',null,z.name[LANG]):el('h2',null,z.name[LANG]);if(full)h2.style.cssText='font-size:1.8rem;padding-top:12px';
  h.append(dot,h2,el('span','count',`${items.length} ${t('items')}`));sec.append(h);
  if(full){const cats=[...new Set(z.items.filter(i=>!hidden.has(i.id)).map(i=>i.cat[LANG]))];const ch=el('div','chips');
    [null,...cats].forEach(c=>{const b=el('button','chip',c||t('all'));b.type='button';b.setAttribute('aria-pressed',String((FILTER[z.id]||null)===c));b.onclick=()=>{FILTER[z.id]=c;render()};ch.append(b)});sec.append(ch)}
  const ul=el('ul','items');items.forEach(i=>ul.append(itemCard(i,z.id)));sec.append(ul);
  if(!QUERY)boxes(z).forEach(b=>sec.append(b));
  if(full){const l=latest(z.id);if(l)sec.append(l)}
  return sec;
}
function edHead(){
  const w=el('div','ed-head');w.append(el('span','eyebrow',BRIEF.edition==='am'?t('edition_am'):t('edition_pm')));
  w.append(el('h1',null,fmtDate(BRIEF.date,true)));
  const m=el('div','ed-meta');const n=BRIEF.zones.reduce((s,z)=>s+z.items.length,0);
  m.append(el('span',null,`${t('published')}: ${fmtTime(BRIEF.published)}`),el('span',null,`${n} ${t('items')}`),el('span',null,`${Object.keys(BRIEF.sources).length} ${L('مصدراً موثّقاً','cited sources')}`));
  w.append(m);return w;
}
function markets(){
  const w=el('section','zone');const h=el('div','zone-head');h.append(el('h2',null,t('markets')));w.append(h);
  const g=el('div','ticks');BRIEF.markets.forEach(m=>{const d=el('div','tick');d.append(el('small',null,m[LANG]));
    const b=el('b',null,m.value);b.append(el('span','unit',m.unit[LANG]));d.append(b);
    const chg=LANG==='en'&&m.chg_en?m.chg_en:m.chg;const e=el('em',m.dir);if(chg){const bd=el('bdi',null,chg);if(/[0-9]/.test(chg))bd.dir='ltr';e.append(bd,' · ')}e.append(m.note[LANG]);d.append(e,srcLine(m.src));g.append(d)});
  w.append(g);return w;
}
function searchBox(){
  const s=el('label','search');s.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="2"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const i=el('input');i.type='search';i.id='q';i.placeholder=t('search');i.setAttribute('aria-label',t('search'));i.value=QUERY;
  i.oninput=()=>{QUERY=i.value.trim();renderList()};s.append(i);return s;
}
function allSources(){
  const w=el('section','sources-all');w.append(el('h3',null,t('all_sources')));const ol=el('ol');
  Object.values(BRIEF.sources).forEach(s=>{const li=el('li'),a=el('a',null,s[LANG]);a.href=s.url;a.target='_blank';a.rel='noopener';li.append(a,` · ${fmtDate(s.date)}`);ol.append(li)});
  w.append(ol);return w;
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
  main.append(markets(),searchBox());
  listHost=el('div');listHost.style.cssText='display:grid;gap:28px';main.append(listHost);renderList();
  main.append(allSources());
}
function viewZone(id){const z=BRIEF.zones.find(x=>x.id===id);main.append(edHead());if(z)main.append(zoneSection(z,true))}
function viewRoadmap(){
  const h=el('div','ed-head');h.append(el('span','eyebrow',L('ما الذي ينتظرنا','What comes next')),el('h1',null,t('roadmap')),el('p','mute',t('road_intro')));main.append(h);
  const items=[...BRIEF.roadmap].sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999'));
  const ol=el('ol','road');items.forEach(r=>{const li=el('li'),w=el('div','when');
    if(r.date){w.append(r.from?`${fmtDate(r.from).split(' ')[0]}–${fmtDate(r.date)}`:fmtDate(r.date));const d=new Date(r.date+'T00:00:00Z');w.append(el('small',null,r.from?'':DAYS[LANG][d.getUTCDay()]))}
    else{w.append(r.month?fmtDate(r.month):'—');w.append(el('small',null,t('tbd')))}
    const what=el('div','what'),zc=el('span','zchip',t(r.zone));zc.style.background=ZC[r.zone];if(r.zone==='world')zc.style.color='var(--bg)';
    what.append(zc,el('p',null,r[LANG]),srcLine(r.src));
    if(r.scn){const s=el('p','scn');s.append(el('b',null,t('scenario')+' ('+t('outlook_tag')+'): '),r.scn[LANG]);what.append(s)}
    li.append(w,what);ol.append(li)});
  main.append(ol);
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
  const v=el('div','vision');
  const a=el('div');a.append(el('h2',null,L('الرؤية','Vision')),el('p',null,L('أن يكون «خبر» المرجع اليومي الأوثق للقارئ في قطر: يفهم به ما يجري حوله في دقائق، ويثق في كل كلمة لأنه يعرف من أين جاءت.','For Khabar to be the most trusted daily reference for readers in Qatar: a way to understand what is happening around them in minutes, and to trust every word because they know where it came from.')));
  const b=el('div');b.append(el('h2',null,L('الهدف','Goal')),el('p',null,L('أن نقرأ عشرات المصادر نيابة عنك، ونكتب لك خلاصة دقيقة مرتين يومياً: قطر أولاً ثم الخليج ثم مصر ثم العالم، مع تحليل يشرح ما وراء الخبر، واستقراء لما قد يأتي، وخريطة للأحداث القادمة.','To read dozens of sources on your behalf and write you an accurate brief twice a day: Qatar first, then the Gulf, then Egypt, then the world, with analysis that explains what lies behind the news, an outlook on what may come, and a roadmap of upcoming events.')));
  v.append(a,b);w.append(v);
  w.append(el('h2',null,L('ركائزنا','Our pillars')));
  const P=el('div','pillars');
  [[L('المصداقية','Credibility'),L('لا نختلق ولا نبالغ. ننقل ما قالته المصادر كما قالته، ونصحّح علناً إذا أخطأنا.','We do not invent or exaggerate. We report what sources said as they said it, and correct openly if we get it wrong.')],
   [L('التوثيق','Attribution'),L('لا خبر ولا عنوان ولا رقم دون مصدره: اسم المصدر وتاريخ النشر والرابط الأصلي، وكل المصادر عند تعددها. ما لا مصدر له لا يُنشر.','No story, headline or figure without its source: outlet name, publication date and original link, and every source when there are several. Anything without a source is not published.')],
   [L('التحليل','Analysis'),L('نفصل الخبر عن الرأي فصلاً واضحاً. التحليل موسوم بأنه رأي تحريري، ويذكر الأخبار التي بُني عليها.','We keep news and opinion clearly apart. Analysis is labelled as editorial view and names the stories it is built on.')],
   [L('الاستقراء','Outlook'),L('نقرأ ما قد يترتب على أخبار اليوم، ونسمّيه توقّعاً لا خبراً، ونربطه بمصادره وبالمواعيد المقررة في خريطة الطريق.','We read what today\'s news may lead to, call it a forecast rather than news, and tie it to its sources and to scheduled dates on the roadmap.')]
  ].forEach(([h,p])=>{const d=el('div','pillar');d.append(el('h3',null,h),el('p',null,p));P.append(d)});w.append(P);
  w.append(el('h2',null,L('كيف نكتب','How we write')));
  w.append(el('p',null,L('نقرأ المصادر الرسمية والصحف المعتمدة في قطر والخليج ومصر والعالم، ونجمع الخبر الواحد من مصادره المختلفة في فقرة واحدة بصياغتنا الخاصة، ونحيلك إلى المصدر الأصلي لقراءته كاملاً. تُنشر خلاصة الصباح الساعة 6:00 وخلاصة المساء الساعة 6:00 بتوقيت الدوحة، وتُحدَّث العناوين الآلية كل 3 ساعات.','We read official sources and established outlets in Qatar, the Gulf, Egypt and the world, combine each story from its different sources into one paragraph in our own words, and link you to the original to read it in full. The morning brief is published at 6:00 and the evening brief at 18:00 Doha time; automatic headlines refresh every 3 hours.')));
  if(ARCH&&ARCH.briefs&&ARCH.briefs.length){w.append(el('h2',null,t('archive')));const ul=el('ul','items');
    ARCH.briefs.slice().reverse().forEach(x=>{const li=el('li','item');const a=el('a',null,`${x.edition==='am'?t('edition_am'):t('edition_pm')} · ${fmtDate(x.date,true)}`);a.href='#b-'+x.id;li.append(a);ul.append(li)});w.append(ul)}
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
  else if(VIEW==='about')viewAbout();
  else viewToday();
  if(render.keep)scrollTo(0,y);render.keep=true;
}
async function route(){
  const h=location.hash.slice(1)||'today';const prev=VIEW;VIEW=h;
  try{
    if(h.startsWith('b-')){await load(h.slice(2))}
    else if(!BRIEF||(prev.startsWith('b-'))){await load()}
  }catch(e){console.error(e);BRIEF=null}
  render.keep=false;render();if(prev!==VIEW)scrollTo(0,0);
}
addEventListener('hashchange',route);
$('#lang-btn').onclick=()=>{LANG=LANG==='en'?'ar':'en';document.documentElement.lang=LANG;document.documentElement.dir=LANG==='en'?'ltr':'rtl';try{localStorage.setItem('khabar-lang',LANG)}catch(e){}FILTER={};render()};
$('#theme-btn').onclick=()=>{const r=document.documentElement;const dark=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('khabar-theme',r.dataset.theme)}catch(e){}header()};
route();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
})();
