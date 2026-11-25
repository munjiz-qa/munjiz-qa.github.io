'use strict';
/* «تقرير»: مكوّن عام لتصدير أي صفحة أو قسم من الموقع إلى ملفات يختارها القارئ.
   يعمل في المتصفح وحده، مجاناً ودون خادم: Word قابل للتعديل (DOCX)، PDF، Excel (XLSX)، CSV، صورة PNG، صفحة HTML، طباعة، ورابط مشاركة.
   كل تقرير يحمل مصادر كل خبر وروابطها الأصلية ودرجة التحقق (عدد الجهات المستقلة)، بالعربية من اليمين لليسار أو بالإنجليزية.

   الاستعمال في أي صفحة: <script src="assets/report.js" defer></script> (بعد config.js). يظهر زر «تقرير» في الشريط العلوي وتحت عنوان الصفحة.
   المحتوى يُقرأ من الصفحة نفسها (كل كتلة فيها .src بروابط مصادرها)، أو من بيانات الموقع (الخلاصات وأرشيفها، الأقسام، العسكري والحروب).
   للأقسام الجديدة: يكفي أن تعرض كل خبر مع صندوق مصادره .src كما تفعل بقية الأقسام، أو تسجّل مصدراً خاصاً:
     KR.register({id:'my', label:{ar:'…',en:'…'}, build: async (opts)=>({sections:[…]})});
   وتستثني أي عنصر من التقرير بالصنف .kr-skip. */
(function(){
if(window.KR)return;
const SCRIPT=document.currentScript;
const ASSETS=(SCRIPT&&SCRIPT.src?SCRIPT.src:new URL('assets/report.js',location.href).href).replace(/report\.js(\?.*)?$/,'');
const ROOT=ASSETS.replace(/assets\/$/,'');
const CFG=window.KHABAR_CONFIG||{};
const isEN=()=>document.documentElement.lang==='en';
let RL=null; // لغة التقرير (قد تختلف عن لغة الواجهة)
const L=(a,e)=>(RL||(isEN()?'en':'ar'))==='en'?e:a;
const UI=(a,e)=>isEN()?e:a;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const xesc=s=>String(s==null?'':s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g,'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clean=s=>String(s||'').replace(/\s+/g,' ').trim();
const MONTHS={ar:['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],en:['January','February','March','April','May','June','July','August','September','October','November','December']};
const doha=d=>Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(d).map(x=>[x.type,x.value]));
const dohaDay=d=>{const p=doha(d);return `${p.year}-${p.month}-${p.day}`};
function fmtDate(iso){if(!iso)return '';const [y,m,d]=String(iso).slice(0,10).split('-').map(Number);if(!m)return String(iso);const lg=L('ar','en');return d?`${d} ${MONTHS[lg][m-1]} ${y}`:`${MONTHS[lg][m-1]} ${y}`}
function fmtStamp(d){const p=doha(d),h=+p.hour;return L(`${fmtDate(dohaDay(d))}، ${h%12||12}:${p.minute} ${h<12?'صباحاً':'مساءً'} بتوقيت الدوحة`,`${fmtDate(dohaDay(d))}, ${p.hour}:${p.minute} Doha time`)}
const brand=()=>{const lg=RL||(isEN()?'en':'ar'),B=CFG.BRAND;if(B&&B[lg])return B[lg]; // يمكن ضبط الاسم في config.js: BRAND:{ar:'…',en:'…'}
  const b=document.querySelector('.brand-word'),t=clean(b&&b.textContent);if(lg==='en'&&/[\u0600-\u06FF]/.test(t))return ({'خبر':'Khabar','عبدو نيوز':'Abdo News'})[t]||t;return t||L('خبر','Khabar')};
const getJSON=u=>fetch(u,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json()});
const countAr=(n,[one,two,few,many,hundred])=>n===1?one:n===2?two:(n%100>=3&&n%100<=10)?`${n} ${few}`:(n%100>=11)?`${n} ${many}`:`${n} ${hundred}`;
const nN=(n,ar,en)=>L(countAr(n,ar),`${n} ${n===1?en[0]:en[1]}`);
const nStories=n=>nN(n,['خبر واحد','خبران','أخبار','خبراً','خبر'],['story','stories']);
const nSrc=n=>nN(n,['مصدر واحد','مصدران','مصادر','مصدراً','مصدر'],['source','sources']);
const nOut=n=>nN(n,['جهة مستقلة واحدة','جهتان مستقلتان','جهات مستقلة','جهة مستقلة','جهة مستقلة'],['independent outlet','independent outlets']);
const EDN={am:['الصباح','Morning'],md:['الظهيرة','Midday'],pm:['المساء','Evening'],nt:['الليل','Night']};

/* ---------- درجة التحقق: عدد الجهات المستقلة ----------
   نسخ وكالة واحدة في مواقع مختلفة جهة واحدة: «ياهو فايننس (رويترز)» تُحسب «رويترز». */
const WIRE=/(رويترز|reuters|أسوشيتد|associated press|\bap\b|فرانس برس|afp|قنا|qna|وام|wam|واس|spa|بنا|bna|كونا|kuna|أ ش أ|mena)/i;
function party(s){const n=String(s.name||'').trim();const m=n.match(/\(([^)]+)\)/);if(m&&WIRE.test(m[1]))return m[1].toLowerCase().replace(/\s+\d+$/,'');
  if(n)return n.toLowerCase().replace(/\s*\(.*\)\s*/,'').trim();try{return new URL(s.url).hostname.replace(/^www\./,'')}catch(e){return ''}}
function outlets(srcs){return new Set((srcs||[]).map(party).filter(Boolean)).size}
function verifyLabel(n,official){if(official&&n<2)return L('جهة رسمية','Official source');
  if(n<=0)return L('بلا مصدر','No source');if(n===1)return L('مصدر واحد','Single source');if(n===2)return L('مؤكد من جهتين مستقلتين','Confirmed by two independent outlets');
  return L(`مؤكد من ${countAr(n,['','','جهات مستقلة','جهة مستقلة','جهة مستقلة'])}`,`Confirmed by ${n} independent outlets`)}
const OFFICIAL=/(gov|\.gov\.|un\.org|who\.int|imf\.org|worldbank|mofa|moi\.|qna\.org|gdacs|noaa|met\.|meteo|wmo\.int|kremlin|whitehouse|europa\.eu|nato\.int|ExchangeRate|Currency-API|Gold-API|fotmob|espn|thesportsdb)/i;

/* ---------- مصادر المحتوى ---------- */
const SOURCES=[];
function register(s){const i=SOURCES.findIndex(x=>x.id===s.id);if(i>=0)SOURCES[i]=s;else SOURCES.push(s)}

// ١) الصفحة كما تظهر الآن: كل كتلة فيها صندوق مصادر .src
function pageMain(){return document.querySelector('main')||document.body}
function srcFromBox(box){return [...box.querySelectorAll('a[href]')].filter(a=>/^https?:/.test(a.href)&&!a.closest('.kr-skip')).map(a=>{
  const t=clean(a.textContent),p=t.split(' · ');return {name:p[0]||t,date:p.slice(1).join(' · ')||'',url:a.href}})}
const UNIT='li,.item,.tick,.card,article,.thread,.war,.pillar,.analysis,.outlook,.technical,.fx-wrap,.wx-card,tr';
function textOf(node){const c=node.cloneNode(true);
  c.querySelectorAll('.src,button,.acts,.verif,.cat,details,.item-foot,.basis,svg,script,style,input,select,textarea,table,h1,h2,.kr-skip,.kr-inline,[aria-hidden="true"],noscript').forEach(e=>e.remove());
  c.querySelectorAll('p,div,li,h3,h4,b,small,em,span,a,bdi,strong').forEach(e=>e.append(' '));return clean(c.textContent)}
function tableOf(t){const rows=[...t.rows].map(r=>[...r.cells].map(c=>clean(c.textContent)));if(!rows.length)return null;
  const hasHead=t.tHead&&t.tHead.rows.length||[...t.rows[0].cells].every(c=>c.tagName==='TH');
  return {caption:clean(t.caption&&t.caption.textContent),head:hasHead?rows[0]:null,rows:hasHead?rows.slice(1):rows}}
function scanPage(){
  const m=pageMain(),h1=m.querySelector('h1'),eb=m.querySelector('.eyebrow'),title=[clean(eb&&eb.textContent),clean(h1&&h1.textContent)].filter(Boolean).join(' · ')||clean(document.title.split('|')[0]);
  const marks=[...m.querySelectorAll('h2,.src,table')].filter(e=>!e.closest('.kr-skip,#kr-dlg'));
  const sections=[];let cur=null;const seen=new Map();
  const sec=t=>{cur={title:t,items:[],tables:[]};sections.push(cur);return cur};
  for(const e of marks){
    if(e.tagName==='H2'){sec(clean(e.textContent));continue}
    if(!cur)sec(title);
    if(e.tagName==='TABLE'){if(e.closest('.src'))continue;const tb=tableOf(e);if(!tb)continue;
      const box=e.parentElement&&[...e.parentElement.querySelectorAll(':scope > .src, :scope ~ .src')][0];tb.sources=box?srcFromBox(box):[];
      if(!tb.caption){const h=e.closest('section,div')&&e.closest('section,div').querySelector('h3');tb.caption=clean(h&&h.textContent)||cur.title}
      cur.tables.push(tb);if(box)seen.set(box,true);continue}
    if(seen.has(e))continue;
    const srcs=srcFromBox(e);if(!srcs.length)continue;
    let u=e.closest(UNIT);if(!u||!m.contains(u)||u.querySelector('h2'))u=e.parentElement;
    if(u.querySelector('table')){u=e.parentElement}
    const prev=seen.get(u);if(prev&&prev!==true){prev.sources.push(...srcs);prev.outlets=outlets(prev.sources);continue}
    const h3=u.querySelector('h3,h4'),cat=u.querySelector('.cat'),vf=u.querySelector('.verif');
    const lbl=(e.querySelector('.lbl')||{}).textContent||'';
    let text=textOf(u);if(!text&&h3)text=clean(h3.textContent);if(!text)continue;
    const it={title:h3?clean(h3.textContent):'',cat:clean(cat&&cat.textContent),text:h3?text.replace(clean(h3.textContent),'').trim()||text:text,sources:srcs,
      kind:/مبني على|based on/i.test(lbl)?'analysis':'news',verifyText:clean(vf&&vf.textContent),method:clean((u.querySelector('.item-foot .basis')||{}).textContent)};
    if(u.classList.contains('tick')){const sm=u.querySelector('small'),b=u.querySelector('b'),em=u.querySelector('em');
      it.kind='number';it.metric={name:clean(sm&&sm.textContent),value:clean(b&&b.firstChild&&b.firstChild.textContent),unit:clean(b&&b.querySelector('.unit')&&b.querySelector('.unit').textContent),note:clean(em&&em.textContent)}}
    it.outlets=outlets(srcs);cur.items.push(it);seen.set(u,it);
  }
  return {title,sections:sections.filter(s=>s.items.length||s.tables.length)};
}
register({id:'page',label:{ar:'هذه الصفحة كما تظهر الآن',en:'This page as shown now'},
  options:()=>{const s=scanPage();return {sections:s.sections.map(x=>x.title)}},
  async build(o){const s=scanPage();s.sections=s.sections.filter(x=>!o.parts||o.parts.includes(x.title));s.scope=UI('الصفحة: ','Page: ')+s.title;return s}});

// ٢) الخلاصة وأرشيفها: الدوائر (الدول)، الجوانب، الفترة
const ZONES=[['qatar','قطر','Qatar'],['gulf','الخليج','The Gulf'],['egypt','مصر','Egypt'],['world','العالم','The World']];
const ASPECTS=[['news','الأخبار','News'],['analysis','التحليل','Analysis'],['technical','القراءة الفنية','Technical read'],['outlook','الاستقراء','Outlook'],['markets','أرقام اليوم','Today\'s numbers'],['roadmap','خريطة الطريق','Roadmap']];
const PERIODS=[['current','الخلاصة الحالية','Current brief'],['today','اليوم كله','All of today'],['3','آخر 3 أيام','Last 3 days'],['7','آخر 7 أيام','Last 7 days'],['30','آخر 30 يوماً','Last 30 days'],['custom','من تاريخ إلى تاريخ','Custom range']];
async function briefsFor(o,progress){
  const cur=await getJSON(ROOT+'data/brief.json');if(o.period==='current')return [cur];
  let idx={briefs:[]};try{idx=await getJSON(ROOT+'data/archive/index.json')}catch(e){}
  const today=dohaDay(new Date());let from=today,to=today;
  if(/^\d+$/.test(o.period)){const d=new Date();d.setUTCDate(d.getUTCDate()-(+o.period-1));from=dohaDay(d)}
  if(o.period==='custom'){from=o.from||today;to=o.to||today;if(from>to)[from,to]=[to,from]}
  const rank={am:0,md:1,pm:2,nt:3};
  const ids=idx.briefs.filter(b=>b.date>=from&&b.date<=to).sort((a,b)=>a.date.localeCompare(b.date)||(rank[a.edition]||0)-(rank[b.edition]||0)).map(b=>b.id);
  if(!ids.includes(cur.id)&&cur.date>=from&&cur.date<=to)ids.push(cur.id);
  const out=[];let done=0;const q=[...ids];
  await Promise.all(Array.from({length:Math.min(6,q.length)},async()=>{while(q.length){const id=q.shift();
    try{out.push(id===cur.id?cur:await getJSON(ROOT+'data/archive/'+id+'.json'))}catch(e){}progress&&progress(++done,ids.length)}}));
  return out.sort((a,b)=>String(a.id).localeCompare(String(b.id))).sort((a,b)=>a.date.localeCompare(b.date)||(rank[a.edition]||0)-(rank[b.edition]||0));
}
register({id:'brief',label:{ar:'الخلاصة والأرشيف: الدول والجوانب والفترة',en:'Brief and archive: countries, aspects, period'},
  async build(o,progress){
    const lg=o.lang,list=await briefsFor(o,progress),zs=o.zones&&o.zones.length?o.zones:ZONES.map(z=>z[0]),as=o.aspects&&o.aspects.length?o.aspects:ASPECTS.map(a=>a[0]);
    const S=id=>{for(const b of list){const s=b.sources&&b.sources[id];if(s)return {name:s[lg]||s.ar||s.en,date:fmtDate(s.date),url:s.url}}return null};
    const res=ids=>(ids||[]).map(S).filter(Boolean);
    const many=list.length>1,sections=[],dup=new Set();
    for(const b of list){const tag=many?` · ${L(EDN[b.edition]?EDN[b.edition][0]:'',EDN[b.edition]?EDN[b.edition][1]:'')} ${fmtDate(b.date)}`:'';
      for(const z of b.zones||[]){if(!zs.includes(z.id))continue;const s={title:(z.name&&(z.name[lg]||z.name.ar))+tag,items:[],tables:[]};
        if(as.includes('news'))(z.items||[]).forEach(it=>{const tx0=it[lg]||(lg==='en'?'':it.ar),hh=it.h&&(it.h[lg]||(lg==='en'?'':it.h.ar)),tx=tx0&&hh?hh+'. '+tx0:tx0;if(!tx||dup.has(tx))return;dup.add(tx);const sr=res(it.src);s.items.push({kind:'news',cat:it.cat&&(it.cat[lg]||it.cat.ar)||'',text:tx,sources:sr,outlets:outlets(sr)})});
        if(as.includes('analysis')&&z.analysis&&z.analysis[lg]){const sr=res(z.analysis.src);s.items.push({kind:'analysis',cat:L('تحليل (رأي تحريري)','Analysis (editorial view)'),text:z.analysis[lg],sources:sr,outlets:outlets(sr)})}
        if(as.includes('technical')&&z.technical&&z.technical[lg]){const sr=res(z.technical.src);s.items.push({kind:'analysis',cat:L('قراءة فنية مبسّطة','Simple technical read'),text:z.technical[lg],sources:sr,outlets:outlets(sr)})}
        if(as.includes('outlook'))[].concat(z.outlook||[]).forEach(x=>{if(!x||!x[lg])return;const sr=res(x.src);s.items.push({kind:'outlook',cat:L('استقراء (توقّع وليس خبراً)','Outlook (forecast, not news)'),text:x[lg],sources:sr,outlets:outlets(sr)})});
        if(s.items.length)sections.push(s)}
      if(as.includes('markets')&&(b.markets||[]).length&&(!many||b===list[list.length-1]||o.period!=='current')){
        const rows=b.markets.map(m=>[m[lg]||m.ar,m.value,m.unit&&(m.unit[lg]||m.unit.ar)||'',(lg==='en'&&m.chg_en)||m.chg||'',m.note&&(m.note[lg]||m.note.ar)||'',res(m.src).map(x=>x.name).join('، ')]);
        const srcs=[...new Map(b.markets.flatMap(m=>res(m.src)).map(x=>[x.url,x])).values()];
        sections.push({title:L('أرقام اليوم','Today\'s numbers')+tag,items:[],tables:[{caption:L('أرقام اليوم','Today\'s numbers')+tag,head:[L('المؤشر','Indicator'),L('القيمة','Value'),L('الوحدة','Unit'),L('التغير','Change'),L('ملاحظة','Note'),L('المصدر','Source')],rows,sources:srcs,numeric:[1]}]})}
    }
    if(as.includes('roadmap')){const b=list[list.length-1],today=dohaDay(new Date());const r=(b.roadmap||[]).filter(x=>zs.includes(x.zone)&&(!x.date||x.date>=today)&&x[lg]);
      if(r.length)sections.push({title:L('خريطة الطريق: المواعيد القادمة','Roadmap: upcoming dates'),items:r.map(x=>{const sr=res(x.src);return {kind:'date',cat:(x.date?fmtDate(x.date):(x.month?fmtDate(x.month):L('موعد لم يُحدَّد','Date to be set')))+' · '+((ZONES.find(z=>z[0]===x.zone)||[])[lg==='en'?2:1]||''),text:x[lg],sources:sr,outlets:outlets(sr)}}),tables:[]})}
    const zl=zs.map(z=>(ZONES.find(x=>x[0]===z)||[])[lg==='en'?2:1]).join(L('، ',', '));
    const first=list[0],last=list[list.length-1];
    const per=!list.length?'':many?`${fmtDate(first.date)} – ${fmtDate(last.date)} (${list.length} ${L('خلاصة','briefs')})`:`${L(EDN[last.edition]?EDN[last.edition][0]:'',EDN[last.edition]?EDN[last.edition][1]:'')} ${fmtDate(last.date)}`;
    return {title:L('تقرير الخلاصة','Brief report'),subtitle:`${zl} · ${per}`,sections,scope:UI('الخلاصة: ','Brief: ')+zl+' · '+per};
  }});

// ٣) الأقسام الموضوعية والمحلية لكل دولة
let DESKS=null;const desks=async()=>DESKS||(DESKS=await getJSON(ROOT+'data/desks.json'));
register({id:'desks',label:{ar:'الأقسام الموضوعية وأخبار كل دولة',en:'Topic desks and country news'},
  async options(){const d=await desks();return {desks:d.meta.map(m=>({id:m.id,ar:m.ar,en:m.en,country:m.country,group:m.group}))}},
  async build(o){const d=await desks(),lg=o.lang,ids=o.desks&&o.desks.length?o.desks:d.meta.map(m=>m.id);const sections=[];
    for(const id of ids){const m=d.meta.find(x=>x.id===id),dk=d.desks[id];if(!m||!dk)continue;
      const items=(dk.items||[]).filter(x=>!x.lang||x.lang===lg||(lg==='ar'&&!(dk.items||[]).some(y=>y.lang==='ar'))).map(x=>{const sr=(x.sources||[]).map(s=>({name:s.name,date:fmtDate(s.date||x.t),url:s.url}));
        return {kind:'news',cat:x.verdict?(L('الحكم: ','Verdict: ')+(x.verdict[lg]||x.verdict.ar||x.verdict)):'',text:x.title||x[lg]||'',sources:sr,outlets:x.outlets||outlets(sr),date:x.t}}).filter(x=>x.text);
      const tables=[];
      if(id==='money'&&d.rates&&d.rates.fx){const fx=d.rates.fx;const rows=Object.entries(fx).map(([k,v])=>[k,v.v,fx.QAR?+(v.v/fx.QAR.v).toFixed(4):'',(v.by||[]).join(' + ')]);
        tables.push({caption:L('أسعار العملات مقابل الدولار','Exchange rates against the US dollar'),head:[L('العملة','Currency'),L('مقابل الدولار','Per USD'),L('بالريال القطري','In QAR'),L('المزوّدان','Providers')],rows,numeric:[1,2],
          sources:[{name:'ExchangeRate-API',date:fmtDate(d.rates.updated),url:'https://www.exchangerate-api.com/'},{name:'Currency-API (fawazahmed0)',date:fmtDate(d.rates.updated),url:'https://github.com/fawazahmed0/exchange-api'}]})}
      if(id==='sports'&&d.sports&&(d.sports.matches||[]).length){const rows=d.sports.matches.map(x=>[fmtDate(x.at),x.league,x.home,x.away,x.score||(x.hs!=null?`${x.hs}–${x.as}`:''),(x.by||[]).join(' + ')]);
        tables.push({caption:L('المباريات','Matches'),head:[L('التاريخ','Date'),L('البطولة','Competition'),L('المضيف','Home'),L('الضيف','Away'),L('النتيجة','Score'),L('المصدران','Sources')],rows,
          sources:[...new Map(d.sports.matches.flatMap(x=>x.links||[]).map(s=>[s.name,{name:s.name,date:'',url:s.url}])).values()]})}
      if(items.length||tables.length)sections.push({title:m[lg]||m.ar,items,tables})}
    const names=ids.map(i=>{const m=d.meta.find(x=>x.id===i);return m?(m[lg]||m.ar):i});
    return {title:L('تقرير الأقسام','Desks report'),subtitle:names.length>4?L(`${names.length} أقسام`,`${names.length} desks`)+' · '+fmtDate(dohaDay(new Date(d.updated))):names.join(L('، ',', ')),sections,scope:UI('الأقسام: ','Desks: ')+names.slice(0,6).join('، ')};
  }});

// ٤) القسم العسكري والحروب الدائرة
const MREG=[['europe','أوروبا','Europe'],['mideast','الشرق الأوسط','Middle East'],['world','العالم','The World']];
const LVL={escalation:['تصعيد','Escalation'],tense:['متوتر','Tense'],calm:['هادئ','Calm']};
register({id:'military',label:{ar:'القسم العسكري والحروب الدائرة',en:'Military desk and ongoing wars'},
  async build(o){const lg=o.lang,[mi,wa]=await Promise.all([getJSON(ROOT+'data/military.json').catch(()=>null),getJSON(ROOT+'data/wars.json').catch(()=>null)]);
    const rs=o.regions&&o.regions.length?o.regions:MREG.map(r=>r[0]),sections=[];
    const R=(S,ids)=>(ids||[]).map(i=>S&&S[i]).filter(Boolean).map(s=>({name:s[lg]||s.ar||s.en||s.name,date:fmtDate(s.date),url:s.url}));
    if(mi)for(const r of mi.regions||[]){if(!rs.includes(r.id))continue;const items=(r.items||[]).filter(x=>x[lg]||(lg==='en'?false:x.ar)).map(x=>{const sr=R(mi.sources,x.src);return {kind:'news',cat:x.cat&&(x.cat[lg]||x.cat.ar)||'',text:x[lg]||x.ar,sources:sr,outlets:x.outlets||outlets(sr)}});
      if(items.length)sections.push({title:L('العسكري: ','Military: ')+((r.name&&(r.name[lg]||r.name.ar))||r.id),items,tables:[]})}
    if(wa&&o.wars!==false)for(const w of wa.wars||[]){const S=wa.sources,items=[];const nm=w.name&&(w.name[lg]||w.name.ar)||w.id;
      if(w.summary&&w.summary[lg]){const sr=R(S,w.summary_src||w.parties_src||w.since_src);items.push({kind:'news',cat:L('ملخص الحرب','War summary')+(w.level?` · ${L('المؤشر','Level')}: ${(LVL[w.level]||[])[lg==='en'?1:0]||w.level}`:''),text:w.summary[lg],sources:sr,outlets:outlets(sr)})}
      [].concat(w.timeline||[]).slice(0,12).forEach(x=>{const tx=x[lg]||(lg==='en'?'':x.ar);if(!tx)return;const sr=R(S,x.src);items.push({kind:'news',cat:fmtDate(x.date),text:tx,sources:sr,outlets:x.outlets||outlets(sr)})});
      [].concat(w.talks||[]).forEach(x=>{const tx=x[lg]||(lg==='en'?'':x.ar);if(!tx)return;const sr=R(S,x.src);items.push({kind:'news',cat:L('التفاوض والوساطة · ','Talks and mediation · ')+fmtDate(x.date),text:tx,sources:sr,outlets:x.outlets||outlets(sr)})});
      if(items.length)sections.push({title:nm,items,tables:[]})}
    return {title:L('التقرير العسكري والحروب','Military and wars report'),subtitle:rs.map(r=>(MREG.find(x=>x[0]===r)||[])[lg==='en'?2:1]).join(L('، ',', '))+(mi?' · '+fmtDate(mi.date):''),sections,scope:UI('العسكري والحروب','Military and wars')};
  }});

/* ---------- بناء النموذج الموحّد ---------- */
async function buildModel(o,progress){
  RL=o.lang;try{
  const src=SOURCES.find(s=>s.id===o.scope)||SOURCES[0];const m=await src.build(o,progress);
  m.sections.forEach(s=>{s.items=s.items.filter(it=>{it.outlets=it.outlets||outlets(it.sources);const off=it.sources.some(x=>OFFICIAL.test(x.url)||OFFICIAL.test(x.name));it.official=off;
      if(!it.sources.length)return false; // قاعدة الموقع: ما لا مصدر له لا يدخل التقرير
      if(o.strict&&it.kind==='news'&&it.outlets<2&&!off)return false;return true});
    s.items.forEach(it=>{it.verify=it.verifyText&&RL===(isEN()?'en':'ar')?it.verifyText:verifyLabel(it.outlets,it.official)})});
  m.sections=m.sections.filter(s=>s.items.length||s.tables.length);
  if(o.title)m.title=o.title;else if(o.scope==='page')m.title=L('تقرير: ','Report: ')+m.title;
  m.brand=brand();m.lang=o.lang;m.key='report-'+(o.scope==='page'?pageKey():o.scope)+(o.lang==='en'?'-en':'');m.generated=new Date();m.url=shareURL(o);
  const all=new Map();m.sections.forEach(s=>{s.items.forEach(i=>i.sources.forEach(x=>all.has(x.url)||all.set(x.url,x)));s.tables.forEach(t=>(t.sources||[]).forEach(x=>all.has(x.url)||all.set(x.url,x)))});
  m.sources=[...all.values()];m.count=m.sections.reduce((n,s)=>n+s.items.length,0);m.outlets=outlets(m.sources);
  m.note=L(`كل خبر في هذا التقرير منسوب إلى مصدره الأصلي برابط مباشر، وتحته درجة التحقق: عدد الجهات المستقلة التي نقلته. نسخ الوكالة الواحدة في مواقع مختلفة تُحسب جهة واحدة. التحليل والاستقراء اجتهاد تحريري مبني على المصادر المذكورة.`,
    `Every story in this report is attributed to its original source with a direct link, followed by its verification level: the number of independent outlets that carried it. Copies of one wire service on different sites count as one outlet. Analysis and outlook are editorial judgement based on the cited sources.`);
  return m}finally{RL=null}
}

/* ---------- ضغط ZIP (تخزين دون ضغط) لملفات Word وExcel ---------- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0};
function zip(files){const enc=new TextEncoder(),parts=[],cd=[];let off=0;const d=new Date();
  const dt=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate(),tm=(d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1);
  for(const [name,data] of files){const nb=enc.encode(name),db=typeof data==='string'?enc.encode(data):data,c=crc32(db);
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,tm,true);h.setUint16(12,dt,true);
    h.setUint32(14,c,true);h.setUint32(18,db.length,true);h.setUint32(22,db.length,true);h.setUint16(26,nb.length,true);h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),nb,db);
    const e=new DataView(new ArrayBuffer(46));e.setUint32(0,0x02014b50,true);e.setUint16(4,20,true);e.setUint16(6,20,true);e.setUint16(8,0x0800,true);e.setUint16(10,0,true);e.setUint16(12,tm,true);e.setUint16(14,dt,true);
    e.setUint32(16,c,true);e.setUint32(20,db.length,true);e.setUint32(24,db.length,true);e.setUint16(28,nb.length,true);e.setUint32(42,off,true);
    cd.push(new Uint8Array(e.buffer),nb);off+=30+nb.length+db.length}
  const cdLen=cd.reduce((n,p)=>n+p.length,0),end=new DataView(new ArrayBuffer(22));end.setUint32(0,0x06054b50,true);end.setUint16(8,files.length,true);end.setUint16(10,files.length,true);end.setUint32(12,cdLen,true);end.setUint32(16,off,true);
  return new Blob([...parts,...cd,new Uint8Array(end.buffer)],{type:'application/zip'})}

/* ---------- Word (DOCX) قابل للتعديل ---------- */
function docx(m){
  const rtl=m.lang==='ar',bidi=rtl?'<w:bidi/>':'',rr=rtl?'<w:rtl/>':'',jc=`<w:jc w:val="${rtl?'right':'left'}"/>`;let rid=10;const rels=[];
  const run=(t,{b,sz,color,i}={})=>`<w:r><w:rPr>${b?'<w:b/><w:bCs/>':''}${i?'<w:i/><w:iCs/>':''}${color?`<w:color w:val="${color}"/>`:''}${sz?`<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`:''}${rr}</w:rPr><w:t xml:space="preserve">${xesc(t)}</w:t></w:r>`;
  const link=(t,url)=>{const id='rId'+(++rid);rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xesc(url)}" TargetMode="External"/>`);
    return `<w:hyperlink r:id="${id}"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/>${rr}</w:rPr><w:t xml:space="preserve">${xesc(t)}</w:t></w:r></w:hyperlink>`};
  const p=(inner,{style,keep,spacing}={})=>`<w:p><w:pPr>${style?`<w:pStyle w:val="${style}"/>`:''}${keep?'<w:keepNext/>':''}${bidi}${spacing||''}${jc}</w:pPr>${inner}</w:p>`;
  const body=[];
  body.push(p(run(m.brand,{b:true,color:'E39A2D',sz:22})));
  body.push(p(run(m.title),{style:'Title'}));
  if(m.subtitle)body.push(p(run(m.subtitle,{color:'566270',sz:24})));
  body.push(p(run(L('أُعدّ في ','Generated ')+fmtStamp(m.generated)+' · '+[nStories(m.count),nSrc(m.sources.length),nOut(m.outlets)].join(' · '),{color:'566270',sz:20})));
  body.push(p(run(L('رابط التقرير: ','Report link: '),{color:'566270',sz:20})+link(m.url,m.url)));
  body.push(p(run(m.note,{i:true,sz:20,color:'566270'})));
  const cell=(t,{head,w}={})=>`<w:tc><w:tcPr><w:tcW w:w="${w||0}" w:type="${w?'dxa':'auto'}"/>${head?'<w:shd w:val="clear" w:color="auto" w:fill="14212E"/>':''}</w:tcPr>${p(run(String(t==null?'':t),{b:head,color:head?'FFFFFF':null,sz:19}))}</w:tc>`;
  m.sections.forEach(s=>{body.push(p(run(s.title),{style:'Heading1',keep:true}));
    s.items.forEach(it=>{
      const meta=[it.cat,it.verify,it.method].filter(Boolean).join(' · ');
      if(meta)body.push(p(run(meta,{b:true,sz:19,color:it.outlets>=2||it.official?'17675F':'9A5B00'}),{keep:true,spacing:'<w:spacing w:before="160" w:after="40"/>'}));
      if(it.title)body.push(p(run(it.title,{b:true}),{keep:true}));
      body.push(p(run(it.text)));
      const ls=[run(L('المصادر: ','Sources: '),{b:true,sz:18,color:'566270'})];it.sources.forEach((x,i)=>{if(i)ls.push(run(' | ',{sz:18,color:'566270'}));ls.push(link(x.name+(x.date?' · '+x.date:''),x.url))});
      body.push(p(ls.join(''),{style:'Sources'}))});
    s.tables.forEach(t=>{if(t.caption)body.push(p(run(t.caption,{b:true}),{style:'Heading2',keep:true}));
      const rows=(t.head?[t.head]:[]).concat(t.rows);
      body.push(`<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/>${rtl?'<w:bidiVisual/>':''}<w:tblW w:w="5000" w:type="pct"/><w:tblBorders>${['top','left','bottom','right','insideH','insideV'].map(b=>`<w:${b} w:val="single" w:sz="4" w:space="0" w:color="DFE3E0"/>`).join('')}</w:tblBorders></w:tblPr>`+
        rows.map((r,i)=>`<w:tr>${i===0&&t.head?'<w:trPr><w:tblHeader/></w:trPr>':''}${r.map(c=>cell(c,{head:i===0&&t.head})).join('')}</w:tr>`).join('')+'</w:tbl>');
      if((t.sources||[]).length){const ls=[run(L('المصادر: ','Sources: '),{b:true,sz:18,color:'566270'})];t.sources.forEach((x,i)=>{if(i)ls.push(run(' | ',{sz:18}));ls.push(link(x.name+(x.date?' · '+x.date:''),x.url))});body.push(p(ls.join(''),{style:'Sources'}))}})});
  body.push(p(run(L('فهرس المصادر','Index of sources')),{style:'Heading1'}));
  m.sources.forEach((x,i)=>body.push(p(run(`${i+1}. ${x.name}${x.date?' · '+x.date:''} — `,{sz:19})+link(x.url,x.url),{style:'Sources'})));
  const sect=`<w:sectPr><w:footerReference w:type="default" r:id="rId3"/><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="567" w:footer="567" w:gutter="0"/>${rtl?'<w:bidi/>':''}</w:sectPr>`;
  const NS='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${NS}><w:body>${body.join('')}${sect}</w:body></w:document>`;
  const font=`<w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${NS}><w:docDefaults><w:rPrDefault><w:rPr>${font}<w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="${rtl?'ar-QA':'en-GB'}" w:bidi="ar-QA"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="100" w:line="300" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>
<w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:spacing w:after="120"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="14212E"/><w:sz w:val="44"/><w:szCs w:val="44"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="8" w:space="2" w:color="E39A2D"/></w:pBdr><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="1D7A70"/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="200" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:bCs/><w:color w:val="3A5FB0"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr></w:style>
<w:style w:type="paragraph" w:customStyle="1" w:styleId="Sources"><w:name w:val="Sources"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="160"/></w:pPr><w:rPr><w:color w:val="566270"/><w:sz w:val="18"/><w:szCs w:val="18"/></w:rPr></w:style>
<w:style w:type="character" w:styleId="Hyperlink"><w:name w:val="Hyperlink"/><w:rPr><w:color w:val="3A5FB0"/><w:u w:val="single"/></w:rPr></w:style>
<w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblCellMar><w:top w:w="60" w:type="dxa"/><w:left w:w="100" w:type="dxa"/><w:bottom w:w="60" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr></w:style></w:styles>`;
  const footer=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr ${NS}><w:p><w:pPr>${bidi}<w:jc w:val="center"/></w:pPr>${run(m.brand+' · '+m.title+' · ',{sz:16,color:'566270'})}<w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>1</w:t></w:r><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;
  const now=new Date().toISOString().replace(/\.\d+Z$/,'Z');
  return zip([
    ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'],
    ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'],
    ['docProps/core.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xesc(m.title)}</dc:title><dc:creator>${xesc(m.brand)}</dc:creator><dc:language>${m.lang}</dc:language><dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created></cp:coreProperties>`],
    ['word/document.xml',doc],['word/styles.xml',styles],['word/footer1.xml',footer],
    ['word/_rels/document.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/>${rels.join('')}</Relationships>`]
  ]);
}

/* ---------- Excel (XLSX): الأخبار، المصادر، الجداول والأرقام ---------- */
function rowsFor(m){
  const news=[[L('القسم','Section'),L('التصنيف','Category'),L('النوع','Type'),L('الخبر','Story'),L('درجة التحقق','Verification'),L('عدد الجهات المستقلة','Independent outlets'),L('المصادر','Sources'),L('الروابط الأصلية','Original links')]];
  const KIND={news:L('خبر','News'),analysis:L('تحليل','Analysis'),outlook:L('استقراء','Outlook'),number:L('رقم','Figure'),date:L('موعد','Date')};
  m.sections.forEach(s=>s.items.forEach(it=>news.push([s.title,it.cat||'',KIND[it.kind]||'',(it.title?it.title+': ':'')+it.text,it.verify,it.outlets,it.sources.map(x=>x.name+(x.date?' · '+x.date:'')).join(' | '),it.sources.map(x=>x.url).join('\n')])));
  const tables=[];m.sections.forEach(s=>s.tables.forEach(t=>tables.push(t)));
  const nums=m.sections.flatMap(s=>s.items.filter(i=>i.metric).map(i=>[s.title,i.metric.name,i.metric.value,i.metric.unit,i.metric.note,i.verify,i.sources.map(x=>x.name).join(' | '),i.sources.map(x=>x.url).join('\n')]));
  if(nums.length)tables.unshift({caption:L('الأرقام','Figures'),head:[L('القسم','Section'),L('المؤشر','Indicator'),L('القيمة','Value'),L('الوحدة','Unit'),L('ملاحظة','Note'),L('درجة التحقق','Verification'),L('المصادر','Sources'),L('الروابط','Links')],rows:nums,numeric:[2]});
  const src=[[L('#','#'),L('المصدر','Source'),L('التاريخ','Date'),L('الرابط الأصلي','Original link')]].concat(m.sources.map((x,i)=>[i+1,x.name,x.date,x.url]));
  return {news,tables,src};
}
const num=v=>{if(typeof v==='number')return v;const s=String(v||'').replace(/[,\s]/g,'').replace('−','-');return /^[-+]?\d+(\.\d+)?$/.test(s)?+s:null};
function xlsx(m){
  const {news,tables,src}=rowsFor(m),rtl=m.lang==='ar';
  const col=i=>{let s='';i++;while(i){const r=(i-1)%26;s=String.fromCharCode(65+r)+s;i=Math.floor((i-1)/26)}return s};
  const sheets=[];
  const sheet=(name,rows,{widths,numeric=[],links=[],title}={})=>{const hl=[],rels=[];let r0=0;const out=[];
    if(title){out.push(`<row r="1"><c r="A1" t="inlineStr" s="3"><is><t>${xesc(title)}</t></is></c></row>`);r0=1}
    rows.forEach((row,ri)=>{const r=ri+1+r0;out.push(`<row r="${r}">`+row.map((v,ci)=>{const ref=col(ci)+r,head=ri===0;
      if(!head&&numeric.includes(ci)&&num(v)!=null)return `<c r="${ref}" s="2"><v>${num(v)}</v></c>`;
      if(!head&&links.includes(ci)&&/^https?:/.test(String(v))){const u=String(v).split('\n')[0];if(u.length<2000){const id='rId'+(rels.length+1);rels.push(`<Relationship Id="${id}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xesc(u)}" TargetMode="External"/>`);hl.push(`<hyperlink ref="${ref}" r:id="${id}"/>`)}
        return `<c r="${ref}" t="inlineStr" s="4"><is><t xml:space="preserve">${xesc(v)}</t></is></c>`}
      return `<c r="${ref}" t="inlineStr" s="${head?1:0}"><is><t xml:space="preserve">${xesc(v)}</t></is></c>`}).join('')+'</row>')});
    const last=col(Math.max(0,(rows[0]||[]).length-1))+(rows.length+r0);
    const xml=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetViews><sheetView workbookViewId="0"${rtl?' rightToLeft="1"':''}><pane ySplit="${1+r0}" topLeftCell="A${2+r0}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>`+
      `<cols>${(widths||[]).map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${out.join('')}</sheetData>`+(rows.length>1?`<autoFilter ref="A${1+r0}:${last}"/>`:'')+(hl.length?`<hyperlinks>${hl.join('')}</hyperlinks>`:'')+`<pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
    sheets.push({name:name.replace(/[\\/?*[\]:]/g,' ').slice(0,31),xml,rels})};
  sheet(L('الأخبار','Stories'),news,{widths:[22,20,10,90,26,12,40,50],numeric:[5],links:[7],title:`${m.brand} · ${m.title}${m.subtitle?' · '+m.subtitle:''}`});
  // جدول واحد لكل جدول في التقرير، وكلها في ورقة «الجداول» عند تعددها
  if(tables.length){const rows=[];tables.forEach((t,i)=>{if(i)rows.push([]);rows.push([t.caption||'']);if(t.head)rows.push(t.head);t.rows.forEach(r=>rows.push(r));if((t.sources||[]).length)rows.push([L('المصادر: ','Sources: ')+t.sources.map(x=>`${x.name} ${x.url}`).join(' | ')])});
    // الصف الأول رأس عام حتى يعمل التجميد والتصفية
    const width=Math.max(...rows.map(r=>r.length));const head=[L('الجداول والأرقام','Tables and figures')].concat(Array(Math.max(0,width-1)).fill(''));
    sheet(L('الجداول والأرقام','Tables and figures'),[head].concat(rows),{widths:Array(width).fill(18).map((w,i)=>i===0?28:w),numeric:[1,2,3]})}
  sheet(L('المصادر','Sources'),src,{widths:[6,34,18,90],links:[3]});
  const files=[['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${sheets.map((s,i)=>`<sheet name="${xesc(s.name)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><name val="Arial"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><u/><sz val="11"/><color rgb="FF3A5FB0"/><name val="Arial"/></font><font><b/><sz val="13"/><color rgb="FF14212E"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF14212E"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border/><border><left style="thin"><color rgb="FFDFE3E0"/></left><right style="thin"><color rgb="FFDFE3E0"/></right><top style="thin"><color rgb="FFDFE3E0"/></top><bottom style="thin"><color rgb="FFDFE3E0"/></bottom></border></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="5"><xf borderId="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"${rtl?' readingOrder="2"':''}/></xf><xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"${rtl?' readingOrder="2"':''}/></xf><xf numFmtId="4" borderId="1" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf><xf fontId="3" applyFont="1"/><xf fontId="2" borderId="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`]];
  sheets.forEach((s,i)=>{files.push([`xl/worksheets/sheet${i+1}.xml`,s.xml]);if(s.rels.length)files.push([`xl/worksheets/_rels/sheet${i+1}.xml.rels`,`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${s.rels.join('')}</Relationships>`])});
  return zip(files);
}
function csv(m){const {news}=rowsFor(m);const q=v=>{const s=String(v==null?'':v).replace(/\n/g,' | ');return /[",\n;]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
  return new Blob(['﻿'+news.map(r=>r.map(q).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'})}

/* ---------- صفحة التقرير (HTML) للطباعة والصورة وPDF ---------- */
const DOC_CSS=`.kr-doc{--ink:#14212E;--mute:#566270;--line:#DFE3E0;--dawn:#E39A2D;--sea:#17675F;--nile:#3A5FB0;background:#fff;color:var(--ink);font:15px/1.75 "IBM Plex Sans Arabic",Arial,sans-serif;padding:36px 40px;box-sizing:border-box}
.kr-doc *{box-sizing:border-box}.kr-doc a{color:var(--nile);text-decoration:none;border-bottom:1px solid rgba(58,95,176,.35);word-break:break-word}
.kr-doc .kr-top{display:flex;align-items:center;gap:10px;color:var(--dawn);font:700 15px "Reem Kufi","IBM Plex Sans Arabic",sans-serif}
.kr-doc .kr-top i{width:12px;height:12px;border-radius:50%;background:var(--dawn);display:inline-block}
.kr-doc h1{font:700 27px/1.35 "Reem Kufi","IBM Plex Sans Arabic",sans-serif;margin:10px 0 4px}.kr-doc .kr-sub{color:var(--mute);margin:0 0 8px;font-size:15px}
.kr-doc .kr-meta{display:flex;flex-wrap:wrap;gap:6px 18px;color:var(--mute);font-size:12.5px;border-block:1px solid var(--line);padding:8px 0;margin:10px 0}
.kr-doc .kr-note{font-size:12.5px;color:var(--mute);background:#F5F6F3;border-radius:8px;padding:8px 12px;margin:0 0 6px}
.kr-doc h2{font:700 19px/1.4 "Reem Kufi","IBM Plex Sans Arabic",sans-serif;color:var(--sea);border-bottom:2px solid var(--dawn);padding-bottom:4px;margin:22px 0 10px}
.kr-doc .kr-it{border:1px solid var(--line);border-inline-start:3px solid var(--sea);border-radius:8px;padding:10px 14px;margin:0 0 10px;break-inside:avoid}
.kr-doc .kr-it.k-analysis,.kr-doc .kr-it.k-outlook{border-inline-start-color:var(--nile);background:#FAFBFD}.kr-doc .kr-it.one{border-inline-start-color:var(--dawn)}
.kr-doc .kr-tag{display:flex;flex-wrap:wrap;gap:4px 10px;font-size:12px;color:var(--mute);margin-bottom:2px}.kr-doc .kr-v{color:var(--sea);font-weight:700}.kr-doc .one .kr-v{color:#9A5B00}
.kr-doc .kr-it p{margin:2px 0 6px}.kr-doc .kr-it h3{margin:0;font-size:15.5px}
.kr-doc .kr-src{font-size:12px;color:var(--mute);display:flex;flex-wrap:wrap;gap:2px 10px}.kr-doc .kr-src b{color:var(--ink)}
.kr-doc table{width:100%;border-collapse:collapse;font-size:12.5px;margin:6px 0 6px;break-inside:auto}.kr-doc th{background:#14212E;color:#fff;font-weight:700}
.kr-doc th,.kr-doc td{border:1px solid var(--line);padding:5px 8px;text-align:start;vertical-align:top}.kr-doc tr{break-inside:avoid}.kr-doc caption{text-align:start;font-weight:700;padding:4px 0}
.kr-doc ol.kr-all{font-size:12px;color:var(--mute);padding-inline-start:22px;margin:0}.kr-doc ol.kr-all li{margin-bottom:3px;break-inside:avoid}
.kr-doc .kr-foot{margin-top:18px;border-top:1px solid var(--line);padding-top:8px;font-size:11.5px;color:var(--mute)}`;
function docHTML(m){
  const sec=s=>`<section><h2>${esc(s.title)}</h2>`+s.items.map(it=>`<div class="kr-it k-${it.kind}${it.outlets<2&&!it.official?' one':''}"><div class="kr-tag">${it.cat?`<span>${esc(it.cat)}</span>`:''}<span class="kr-v">${esc(it.verify)}</span>${it.method?`<span>${esc(it.method)}</span>`:''}</div>${it.title?`<h3>${esc(it.title)}</h3>`:''}<p>${esc(it.text)}</p><div class="kr-src"><b>${esc(L('المصادر:','Sources:'))}</b>${it.sources.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}${x.date?' · '+esc(x.date):''}</a>`).join('')}</div></div>`).join('')+
    s.tables.map(t=>`<table>${t.caption?`<caption>${esc(t.caption)}</caption>`:''}${t.head?`<thead><tr>${t.head.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead>`:''}<tbody>${t.rows.map(r=>`<tr>${r.map(c=>`<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>${(t.sources||[]).length?`<div class="kr-src"><b>${esc(L('المصادر:','Sources:'))}</b>${t.sources.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}${x.date?' · '+esc(x.date):''}</a>`).join('')}</div>`:''}`).join('')+'</section>';
  return `<article class="kr-doc" dir="${m.lang==='ar'?'rtl':'ltr'}" lang="${m.lang}"><div class="kr-top"><i></i><span>${esc(m.brand)}</span></div><h1>${esc(m.title)}</h1>${m.subtitle?`<p class="kr-sub">${esc(m.subtitle)}</p>`:''}
<div class="kr-meta"><span>${esc(L('أُعدّ في ','Generated ')+fmtStamp(m.generated))}</span><span>${esc([nStories(m.count),nSrc(m.sources.length),nOut(m.outlets)].join(' · '))}</span><a href="${esc(m.url)}">${esc(L('رابط التقرير','Report link'))}</a></div>
<p class="kr-note">${esc(m.note)}</p>${m.sections.map(sec).join('')}${m.sections.length?'':`<p>${esc(L('لا يوجد محتوى موثّق يطابق اختيارك.','No sourced content matches your selection.'))}</p>`}
<section><h2>${esc(L('فهرس المصادر','Index of sources'))}</h2><ol class="kr-all">${m.sources.map(x=>`<li>${esc(x.name)}${x.date?' · '+esc(x.date):''} — <a href="${esc(x.url)}">${esc(decodeURIsafe(x.url))}</a></li>`).join('')}</ol></section>
<p class="kr-foot">${esc(m.brand)} · ${esc(m.url)}</p></article>`}
function decodeURIsafe(u){try{const d=decodeURI(u);return d.length>140?d.slice(0,137)+'…':d}catch(e){return u.length>140?u.slice(0,137)+'…':u}}
function standalone(m,print){return `<!doctype html><html lang="${m.lang}" dir="${m.lang==='ar'?'rtl':'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(m.brand+' · '+m.title)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;700&family=Reem+Kufi:wght@700&display=swap">
<style>body{margin:0;background:#EEF0EC}${DOC_CSS}.kr-doc{max-width:860px;margin:0 auto;min-height:100vh}@media print{body{background:#fff}.kr-doc{padding:0;max-width:none}@page{size:A4;margin:14mm}}@media (max-width:600px){.kr-doc{padding:20px 16px}}</style></head><body>${docHTML(m)}${print?'<script>addEventListener("load",()=>setTimeout(()=>print(),400))<\/script>':''}</body></html>`}

/* ---------- لقطة الصورة وPDF (html2canvas محلياً عند الطلب فقط) ---------- */
let H2C=null;
function loadH2C(){return H2C||(H2C=new Promise((ok,no)=>{if(window.html2canvas)return ok(window.html2canvas);const s=document.createElement('script');s.src=ASSETS+'vendor/html2canvas.min.js';s.onload=()=>ok(window.html2canvas);s.onerror=()=>{H2C=null;no(new Error('html2canvas'))};document.head.append(s)}))}
async function snapshot(m,{width=794,maxItems}={}){
  const h2c=await loadH2C();
  if(!document.getElementById('kr-doc-css')){const st=document.createElement('style');st.id='kr-doc-css';st.textContent=DOC_CSS;document.head.append(st)}
  const host=document.createElement('div');host.style.cssText=`position:fixed;top:0;left:-${width+400}px;width:${width}px;z-index:-1;pointer-events:none`;
  let mm=m;if(maxItems){let left=maxItems;mm=Object.assign({},m,{sections:m.sections.map(s=>{const it=s.items.slice(0,Math.max(0,left));left-=it.length;return Object.assign({},s,{items:it,tables:left>0?s.tables:[]})}).filter(s=>s.items.length||s.tables.length)});
    const shown=mm.sections.reduce((n,s)=>n+s.items.length,0);if(shown<m.count)mm.more=m.count-shown}
  host.innerHTML=docHTML(mm);if(mm.more){const p=document.createElement('p');p.className='kr-note';p.textContent=L(`و${mm.more} خبراً آخر في التقرير الكامل على الرابط أعلاه.`,`Plus ${mm.more} more stories in the full report at the link above.`);host.querySelector('.kr-doc').insertBefore(p,host.querySelector('.kr-doc section:last-of-type'))}
  if(maxItems){const all=host.querySelector('.kr-doc section:last-of-type');if(all)all.remove()}
  document.body.append(host);
  try{if(document.fonts&&document.fonts.ready)await document.fonts.ready;
    const node=host.firstElementChild,H=node.scrollHeight;let scale=2;while(H*scale>30000&&scale>1)scale-=.25;if(H*scale>30000)scale=30000/H;
    const base=node.getBoundingClientRect();
    const links=[...node.querySelectorAll('a[href]')].map(a=>{const r=a.getBoundingClientRect();return {x:r.left-base.left,y:r.top-base.top,w:r.width,h:r.height,url:a.href}});
    const breaks=[...node.querySelectorAll('.kr-it,h2,tr,li,.kr-src,.kr-note,.kr-meta,p,table')].map(e=>e.getBoundingClientRect().bottom-base.top).concat([H]).sort((a,b)=>a-b);
    const canvas=await h2c(node,{scale,backgroundColor:'#ffffff',useCORS:true,logging:false,width,windowWidth:width});
    return {canvas,scale,links,breaks,width,height:H}}
  finally{host.remove()}
}
function canvasBlob(c,type,q){return new Promise(ok=>c.toBlob(ok,type,q))}
async function png(m){const s=await snapshot(m,{width:720,maxItems:12});return canvasBlob(s.canvas,'image/png')}

/* PDF: صفحات A4 بصور الصفحة مع روابط قابلة للنقر فوق كل مصدر */
async function pdf(m){
  const s=await snapshot(m,{width:794});const PW=595.28,PH=841.89,k=PW/s.width,pageCss=PH/k; // ارتفاع الصفحة بوحدات CSS
  const cuts=[];let y=0;while(y<s.height-1){let end=y+pageCss;if(end<s.height){const c=s.breaks.filter(b=>b>y+pageCss*.5&&b<=end);if(c.length)end=c[c.length-1]}else end=s.height;cuts.push([y,end]);y=end}
  const pages=[];
  for(const [a,b] of cuts){const h=Math.ceil((b-a)*s.scale),cv=document.createElement('canvas');cv.width=s.canvas.width;cv.height=Math.max(1,h);const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);
    g.drawImage(s.canvas,0,Math.round(a*s.scale),cv.width,h,0,0,cv.width,h);
    const jpg=new Uint8Array(await (await canvasBlob(cv,'image/jpeg',.9)).arrayBuffer());
    pages.push({jpg,iw:cv.width,ih:cv.height,hpt:(b-a)*k,links:s.links.filter(l=>l.y>=a-1&&l.y+l.h<=b+1).map(l=>({x:l.x*k,y:PH-(l.y-a+l.h)*k,w:l.w*k,h:l.h*k,url:l.url}))})}
  return pdfFile(pages,PW,PH,m);
}
function pdfFile(pages,PW,PH,m){
  const enc=new TextEncoder(),chunks=[],offs=[];let len=0;const push=x=>{const b=typeof x==='string'?enc.encode(x):x;chunks.push(b);len+=b.length};
  const ascii=s=>'('+String(s).replace(/[^\x20-\x7E]/g,c=>encodeURIComponent(c)).replace(/([\\()])/g,'\\$1')+')';
  const utf16=s=>{let h='FEFF';for(const ch of String(s)){const c=ch.codePointAt(0);if(c>0xFFFF){const v=c-0x10000;h+=(0xD800+(v>>10)).toString(16).padStart(4,'0')+(0xDC00+(v&1023)).toString(16).padStart(4,'0')}else h+=c.toString(16).padStart(4,'0')}return '<'+h.toUpperCase()+'>'};
  const objs=[];const add=fn=>{objs.push(fn);return objs.length};
  const catalog=add(),pagesId=add(),info=add();const kids=[];
  const bodies={};bodies[catalog]=`<< /Type /Catalog /Pages ${pagesId} 0 R /Lang ${ascii(m.lang)} /ViewerPreferences << /Direction /${m.lang==='ar'?'R2L':'L2R'} /DisplayDocTitle true >> >>`;
  bodies[info]=`<< /Title ${utf16(m.brand+' · '+m.title)} /Creator ${utf16(m.brand)} /Producer (report.js) >>`;
  const streams={};
  pages.forEach((p,i)=>{const img=add(),cnt=add(),annots=p.links.map(l=>{const id=add();bodies[id]=`<< /Type /Annot /Subtype /Link /Rect [${l.x.toFixed(2)} ${l.y.toFixed(2)} ${(l.x+l.w).toFixed(2)} ${(l.y+l.h).toFixed(2)}] /Border [0 0 0] /A << /S /URI /URI ${ascii(l.url)} >> >>`;return id}),pg=add();kids.push(pg);
    streams[img]={dict:`<< /Type /XObject /Subtype /Image /Width ${p.iw} /Height ${p.ih} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>`,data:p.jpg};
    const c=`q ${PW.toFixed(2)} 0 0 ${p.hpt.toFixed(2)} 0 ${(PH-p.hpt).toFixed(2)} cm /Im${i} Do Q`;streams[cnt]={dict:`<< /Length ${c.length} >>`,data:enc.encode(c)};
    bodies[pg]=`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${cnt} 0 R${annots.length?` /Annots [${annots.map(a=>a+' 0 R').join(' ')}]`:''} >>`});
  bodies[pagesId]=`<< /Type /Pages /Kids [${kids.map(k=>k+' 0 R').join(' ')}] /Count ${kids.length} >>`;
  push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  for(let i=1;i<=objs.length;i++){offs[i]=len;if(streams[i]){push(`${i} 0 obj\n${streams[i].dict}\nstream\n`);push(streams[i].data);push('\nendstream\nendobj\n')}else push(`${i} 0 obj\n${bodies[i]}\nendobj\n`)}
  const xref=len;push(`xref\n0 ${objs.length+1}\n0000000000 65535 f \n`+offs.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join(''));
  push(`trailer\n<< /Size ${objs.length+1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks,{type:'application/pdf'});
}

/* ---------- التنزيل والإحصاء والرابط ---------- */
function save(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.rel='noopener';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
// اسم الملف بحروف لاتينية حتى يُحفظ سليماً على كل الأجهزة والأنظمة، والعنوان العربي داخل الملف نفسه
function fname(m,ext){const d=dohaDay(m.generated);RL='en';const b=brand();RL=null;const part=(m.key||'report').replace(/[^\w-]+/g,'-');
  return `${b}-${part}-${d}`.replace(/[^\w-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')+'.'+ext}
const pageKey=()=>{const h=location.hash.slice(1)||'',p=location.pathname.replace(/\/index\.html$/,'/').split('/').filter(Boolean).pop()||'';
  const v=(h||(/khabar$/.test(p)?'today':p)||'today').replace(/^b-.*/,'brief').replace(/^war-.*/,'war').replace(/[^\w-]/g,'');return v.slice(0,24)||'today'};
function track(fmt,o){try{if(navigator.doNotTrack==='1')return;const u=(CFG.API||'')+'/api/hit';
  [`dl-${fmt}`,`dls-${o.scope==='page'?pageKey():o.scope}`.slice(0,40)].forEach(v=>{const body=JSON.stringify({v});if(navigator.sendBeacon)navigator.sendBeacon(u,new Blob([body],{type:'text/plain'}));else fetch(u,{method:'POST',body,keepalive:true}).catch(()=>{})})}catch(e){}}
function shareURL(o){const u=new URL(location.href);const q={s:o.scope,l:o.lang};if(o.zones)q.z=o.zones.join('.');if(o.aspects)q.a=o.aspects.join('.');if(o.period)q.p=o.period;if(o.from)q.f=o.from;if(o.to)q.t=o.to;if(o.desks)q.d=o.desks.join('.');if(o.regions)q.r=o.regions.join('.');if(o.strict===false)q.x='0';if(o.title)q.n=o.title;
  u.searchParams.set('report',new URLSearchParams(q).toString());return u.href}
function readShared(){try{const r=new URLSearchParams(location.search).get('report');if(!r)return null;const q=Object.fromEntries(new URLSearchParams(r));const sp=v=>v?v.split('.').filter(Boolean):undefined;
  return {scope:q.s||'page',lang:q.l==='en'?'en':'ar',zones:sp(q.z),aspects:sp(q.a),period:q.p,from:q.f,to:q.t,desks:sp(q.d),regions:sp(q.r),strict:q.x!=='0',title:q.n||''}}catch(e){return null}}

const FORMATS=[
 ['docx','Word','ملف قابل للتعديل','Editable document','doc'],
 ['pdf','PDF','للقراءة والإرسال','To read and send','pdf'],
 ['xlsx','Excel','الأخبار والأرقام والمصادر في جداول','Stories, figures and sources in sheets','xls'],
 ['csv','CSV','جدول نصي لأي برنامج','Plain table for any app','csv'],
 ['png','صورة PNG','بطاقة للمشاركة','A card to share','img'],
 ['html','صفحة ويب','تُفتح في أي متصفح','Opens in any browser','web'],
 ['print','طباعة','أو حفظ PDF نصي من المتصفح','Or save a text PDF from the browser','print'],
 ['link','مشاركة الرابط','رابط يفتح التقرير نفسه','A link that reopens this report','link']];
const ICONS={doc:'M6 3h8l4 4v14H6zM14 3v4h4M9 12l1.2 5L12 13l1.8 4L15 12',pdf:'M6 3h8l4 4v14H6zM14 3v4h4M9 17v-4h1.5a1.5 1.5 0 0 1 0 3H9',xls:'M6 3h8l4 4v14H6zM14 3v4h4M9 11l5 6M14 11l-5 6',csv:'M4 6h16M4 12h16M4 18h16M10 6v12',img:'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15 9h.01',web:'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18',print:'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',link:'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1'};
const svg=(d,s=20)=>`<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true"><path d="${d}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const REPORT_ICON='M6 3h8l4 4v14H6zM14 3v4h4M12 10v7M9 14l3 3 3-3';

async function run(fmt,o,status){
  if(fmt==='link'){const m={};const url=shareURL(o);try{if(navigator.share){await navigator.share({title:document.title,url});track('link',o);return UI('فُتحت المشاركة','Share opened')}}catch(e){if(e&&e.name==='AbortError')return ''}
    try{await navigator.clipboard.writeText(url)}catch(e){const ta=document.createElement('textarea');ta.value=url;document.body.append(ta);ta.select();try{document.execCommand('copy')}catch(_){}ta.remove()}track('link',o);return UI('نُسخ رابط التقرير','Report link copied')}
  const m=await buildModel(o,(a,b)=>status(UI(`جارٍ جمع الخلاصات ${a} من ${b}…`,`Collecting briefs ${a} of ${b}…`)));
  if(!m.count&&!m.sections.length)throw new Error(UI('لا يوجد محتوى موثّق يطابق اختيارك. وسّع الاختيار أو ألغِ شرط الجهتين.','No sourced content matches your selection. Widen it or untick the two-outlet filter.'));
  status(UI('جارٍ إعداد الملف…','Preparing the file…'));
  RL=o.lang;try{
  if(fmt==='docx')save(docx(m),fname(m,'docx'));
  else if(fmt==='xlsx')save(xlsx(m),fname(m,'xlsx'));
  else if(fmt==='csv')save(csv(m),fname(m,'csv'));
  else if(fmt==='html')save(new Blob([standalone(m)],{type:'text/html;charset=utf-8'}),fname(m,'html'));
  else if(fmt==='png')save(await png(m),fname(m,'png'));
  else if(fmt==='pdf')save(await pdf(m),fname(m,'pdf'));
  else if(fmt==='print'){const f=document.createElement('iframe');f.style.cssText='position:fixed;right:0;bottom:0;width:0;height:0;border:0';f.title='print';document.body.append(f);
    const d=f.contentDocument;d.open();d.write(standalone(m));d.close();await new Promise(r=>setTimeout(r,700));try{if(f.contentWindow.document.fonts)await f.contentWindow.document.fonts.ready}catch(e){}
    f.contentWindow.focus();f.contentWindow.print();setTimeout(()=>f.remove(),60000)}
  }finally{RL=null}
  track(fmt,o);
  RL=UI('ar','en');try{return UI('جاهز ونُزّل الملف: ','Ready and downloaded: ')+nStories(m.count)+' · '+nSrc(m.sources.length)}finally{RL=null}
}

/* ---------- الواجهة ---------- */
const UI_CSS=`#kr-dlg{border:0;padding:0;background:transparent;max-width:none;max-height:none;width:100%;height:100%;inset:0;margin:0;color:var(--ink,#14212E)}
#kr-dlg::backdrop{background:rgba(8,14,20,.55)}
#kr-dlg .kr-box{background:var(--surface,#fff);border:1px solid var(--line,#DFE3E0);border-radius:16px;width:min(680px,calc(100% - 32px));max-height:calc(100% - 48px);margin:24px auto;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,.25);font-family:var(--body,"IBM Plex Sans Arabic",sans-serif)}
#kr-dlg header{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line,#DFE3E0)}#kr-dlg header h2{margin:0;font:700 1.15rem var(--display,"Reem Kufi",sans-serif);flex:1}
#kr-dlg .kr-x{border:1px solid var(--line,#DFE3E0);background:transparent;color:inherit;border-radius:10px;width:38px;height:38px;cursor:pointer;font-size:1.2rem}
#kr-dlg .kr-body{overflow:auto;padding:14px 16px;display:grid;gap:14px;min-width:0}
#kr-dlg fieldset{border:1px solid var(--line,#DFE3E0);border-radius:12px;padding:10px 12px;margin:0;min-width:0}#kr-dlg legend{font-weight:700;padding:0 6px;font-size:.92rem}
#kr-dlg .kr-row{display:flex;flex-wrap:wrap;gap:6px 8px}#kr-dlg label.kr-c{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line,#DFE3E0);border-radius:999px;padding:5px 11px;font-size:.86rem;cursor:pointer;background:var(--bg,#F5F6F3);max-width:100%}
#kr-dlg label.kr-c:has(input:checked){border-color:var(--sea,#1D7A70);background:var(--sea-soft,#E3F1EE);color:var(--sea-ink,#17675F)}
#kr-dlg label.kr-c input{accent-color:var(--sea,#1D7A70);margin:0}
#kr-dlg .kr-scope{display:grid;gap:6px}#kr-dlg .kr-scope label{display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border:1px solid var(--line,#DFE3E0);border-radius:10px;cursor:pointer}
#kr-dlg .kr-scope label:has(input:checked){border-color:var(--sea,#1D7A70);background:var(--sea-soft,#E3F1EE)}
#kr-dlg select,#kr-dlg input[type=date],#kr-dlg input[type=text]{font:inherit;border:1px solid var(--line,#DFE3E0);border-radius:10px;padding:7px 10px;background:var(--bg,#F5F6F3);color:inherit;min-width:0;max-width:100%}
#kr-dlg .kr-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
#kr-dlg .kr-f{display:grid;justify-items:center;text-align:center;gap:3px;border:1px solid var(--line,#DFE3E0);border-radius:12px;padding:10px 6px;background:var(--bg,#F5F6F3);color:inherit;font:inherit;cursor:pointer;min-width:0}
#kr-dlg .kr-f b{font-size:.92rem}#kr-dlg .kr-f small{font-size:.72rem;color:var(--mute,#566270);line-height:1.35}#kr-dlg .kr-f svg{color:var(--sea,#1D7A70)}
#kr-dlg .kr-f:hover,#kr-dlg .kr-f:focus-visible{border-color:var(--sea,#1D7A70);outline:none}#kr-dlg .kr-f[disabled]{opacity:.55;cursor:progress}
#kr-dlg .kr-f.main{background:var(--sea-soft,#E3F1EE);border-color:var(--sea,#1D7A70)}
#kr-dlg .kr-st{min-height:1.4em;font-size:.88rem;color:var(--sea-ink,#17675F);margin:0}#kr-dlg .kr-st.err{color:#B3261E}
#kr-dlg .kr-hint{font-size:.8rem;color:var(--mute,#566270);margin:4px 0 0}
#kr-dlg .kr-dg{display:grid;gap:6px}#kr-dlg .kr-dg b{font-size:.8rem;color:var(--mute,#566270)}
.kr-inline{display:inline-flex;justify-self:start;align-self:start;width:max-content;max-width:100%;align-items:center;gap:6px;margin-top:10px;border:1px solid var(--sea,#1D7A70);color:var(--sea-ink,#17675F);background:var(--sea-soft,#E3F1EE);border-radius:999px;padding:6px 14px;font:600 .88rem var(--body,"IBM Plex Sans Arabic",sans-serif);cursor:pointer}
.kr-inline:hover{filter:brightness(.97)}.kr-fab{position:fixed;inset-inline-start:16px;bottom:16px;z-index:40;box-shadow:0 6px 18px rgba(0,0,0,.18);margin:0}
@media (max-width:600px){#kr-dlg .kr-box{width:100%;max-height:100%;height:100%;margin:0;border-radius:0}#kr-dlg .kr-grid{grid-template-columns:repeat(2,minmax(0,1fr))}#kr-dlg .kr-body{padding:12px}}
@media print{.kr-inline,.kr-hdr{display:none!important}}`;
let DLG=null,LAST={};
function el(t,c,txt){const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e}
function chips(name,list,checked,type='checkbox'){const r=el('div','kr-row');list.forEach(([v,a,e])=>{const l=el('label','kr-c'),i=el('input');i.type=type;i.name=name;i.value=v;i.checked=checked==null||(Array.isArray(checked)?checked.includes(v):checked===v);l.append(i,document.createTextNode(UI(a,e)));r.append(l)});return r}
const vals=(f,n)=>[...f.querySelectorAll(`input[name="${n}"]:checked`)].map(i=>i.value);
function guessScope(){if(scanPage().sections.length)return 'page';const h=location.hash.slice(1);return h==='desks'?'desks':/^(military|wars)$/.test(h)?'military':'brief'}
function css(){if(!document.getElementById('kr-ui-css')){const st=el('style');st.id='kr-ui-css';st.textContent=UI_CSS;document.head.append(st)}}
async function open(pre){
  css();
  if(DLG)DLG.remove();const o=Object.assign({scope:guessScope(),lang:isEN()?'en':'ar',strict:true,period:'current'},LAST,pre||{});
  const d=el('dialog');d.id='kr-dlg';d.setAttribute('aria-labelledby','kr-h');DLG=d;
  const box=el('form','kr-box');box.method='dialog';box.noValidate=true;d.append(box);
  const hd=el('header');hd.innerHTML=svg(REPORT_ICON,22);const h=el('h2',null,UI('تقرير قابل للتنزيل','Downloadable report'));h.id='kr-h';const x=el('button','kr-x','×');x.type='button';x.setAttribute('aria-label',UI('إغلاق','Close'));x.onclick=()=>d.close();hd.append(h,x);box.append(hd);
  const body=el('div','kr-body');box.append(body);
  // ١) ماذا يضم التقرير
  const fs1=el('fieldset');fs1.append(el('legend',null,UI('٢. ماذا يضم التقرير؟ (اختياري)','2. What should it cover? (optional)')));const sc=el('div','kr-scope');
  SOURCES.forEach(s=>{const l=el('label'),i=el('input');i.type='radio';i.name='scope';i.value=s.id;i.checked=o.scope===s.id;l.append(i,document.createTextNode(UI(s.label.ar,s.label.en)));sc.append(l)});fs1.append(sc);body.append(fs1);
  const opt=el('div');body.append(opt);
  // ٢) اللغة والشروط
  const fs3=el('fieldset');fs3.append(el('legend',null,UI('٤. اللغة والتحقق والعنوان','4. Language, verification and title')));
  fs3.append(chips('lang',[['ar','العربية (من اليمين لليسار)','Arabic (right to left)'],['en','الإنجليزية','English']],o.lang,'radio'));
  const st=el('label','kr-c'),si=el('input');si.type='checkbox';si.name='strict';si.checked=o.strict!==false;st.append(si,document.createTextNode(UI('الأخبار المؤكدة من جهتين مستقلتين فأكثر فقط','Only stories confirmed by two or more independent outlets')));
  const r2=el('div','kr-row');r2.style.marginTop='8px';r2.append(st);fs3.append(r2);
  const ti=el('input');ti.type='text';ti.name='title';ti.placeholder=UI('عنوان التقرير (اختياري)','Report title (optional)');ti.value=o.title||'';ti.style.cssText='width:100%;margin-top:8px';ti.setAttribute('aria-label',ti.placeholder);fs3.append(ti);
  body.append(fs3);
  // ٤) الصيغة
  const fs4=el('fieldset');fs4.append(el('legend',null,UI('١. اختر الصيغة وسيُنزَّل الملف فوراً','1. Pick a format and the file downloads at once')));
  const g=el('div','kr-grid');const stLine=el('p','kr-st');stLine.setAttribute('role','status');stLine.setAttribute('aria-live','polite');
  FORMATS.forEach(([id,ar,dar,den,ic],i)=>{const b=el('button','kr-f'+(i<2?' main':''));b.type='button';b.dataset.fmt=id;b.innerHTML=svg(ICONS[ic],22);b.append(el('b',null,isEN()&&id==='png'?'PNG image':isEN()&&id==='html'?'Web page':isEN()&&id==='print'?'Print':isEN()&&id==='link'?'Share link':ar),el('small',null,UI(dar,den)));
    b.onclick=async()=>{const oo=collect();LAST=oo;g.querySelectorAll('button').forEach(x=>x.disabled=true);stLine.className='kr-st';stLine.textContent=UI('جارٍ إعداد التقرير…','Preparing the report…');
      try{const msg=await run(id,oo,t=>stLine.textContent=t);stLine.textContent=msg||''}catch(e){console.error(e);stLine.className='kr-st err';stLine.textContent=e&&e.message&&!/html2canvas/.test(e.message)?e.message:UI('تعذّر إعداد هذه الصيغة الآن. جرّب صيغة أخرى أو أعد المحاولة.','This format could not be prepared right now. Try another format or retry.')}
      finally{g.querySelectorAll('button').forEach(x=>x.disabled=false)}};g.append(b)});
  fs4.append(g,stLine,el('p','kr-hint',UI('كل ملف يضم المصادر وروابطها الأصلية ودرجة التحقق تحت كل خبر، وفهرساً كاملاً للمصادر في آخره. يعمل التصدير في متصفحك دون إرسال بياناتك إلى أي خادم.','Every file includes each story\'s sources, original links and verification level, plus a full index of sources at the end. Export runs in your browser without sending your data to any server.')));
  body.prepend(fs4);
  async function renderOpts(){const sid=vals(box,'scope')[0]||'page';opt.textContent='';const fs=el('fieldset');fs.append(el('legend',null,UI('٣. التفاصيل','3. Details')));opt.append(fs);
    try{
    if(sid==='page'){const s=SOURCES[0].options();if(!s.sections.length){fs.append(el('p','kr-hint',UI('لم تكتمل هذه الصفحة بعد أو لا تحوي أخباراً بمصادر. اختر الخلاصة أو الأقسام أعلاه.','This page has not finished loading or has no sourced stories. Choose the brief or desks above.')));return}
      fs.append(el('p','kr-hint',UI('الأجزاء الظاهرة في الصفحة:','Parts shown on the page:')));fs.append(chips('parts',s.sections.map(t=>[t,t,t]),o.parts||null))}
    else if(sid==='brief'){fs.append(el('p','kr-hint',UI('الدول والدوائر:','Countries and circles:')),chips('zones',ZONES,o.zones||null),el('p','kr-hint',UI('الجوانب:','Aspects:')),chips('aspects',ASPECTS,o.aspects||null),el('p','kr-hint',UI('الفترة:','Period:')));
      const sel=el('select');sel.name='period';sel.setAttribute('aria-label',UI('الفترة','Period'));PERIODS.forEach(([v,a,e])=>{const op=el('option',null,UI(a,e));op.value=v;op.selected=(o.period||'current')===v;sel.append(op)});
      const rg=el('div','kr-row');const f1=el('input'),f2=el('input');f1.type=f2.type='date';f1.name='from';f2.name='to';f1.value=o.from||dohaDay(new Date(Date.now()-6*864e5));f2.value=o.to||dohaDay(new Date());f1.min=f2.min='2026-10-23';f1.max=f2.max=dohaDay(new Date());
      f1.setAttribute('aria-label',UI('من','From'));f2.setAttribute('aria-label',UI('إلى','To'));rg.append(f1,f2);const tog=()=>rg.hidden=sel.value!=='custom';sel.onchange=tog;tog();fs.append(sel,rg)}
    else if(sid==='desks'){fs.append(el('p','kr-hint',UI('جارٍ تحميل الأقسام…','Loading desks…')));const s=await SOURCES.find(x=>x.id==='desks').options();fs.lastChild.remove();
      const G=[['local','أخبار كل دولة','Country news'],['econ','الاقتصاد','Economy'],['life','الحياة','Living'],['world','العالم والعلوم','World and science'],['trust','التحقق','Verification']];
      const all=el('label','kr-c'),ai=el('input');ai.type='checkbox';ai.checked=!o.desks;all.append(ai,document.createTextNode(UI('كل الأقسام','All desks')));ai.onchange=()=>fs.querySelectorAll('input[name=desks]').forEach(i=>i.checked=ai.checked);fs.append(all);
      G.forEach(([gid,a,e])=>{const ls=s.desks.filter(x=>x.group===gid);if(!ls.length)return;const w=el('div','kr-dg');w.append(el('b',null,UI(a,e)),chips('desks',ls.map(x=>[x.id,x.ar,x.en]),o.desks||null));fs.append(w)});
      const rest=s.desks.filter(x=>!G.some(g=>g[0]===x.group));if(rest.length)fs.append(chips('desks',rest.map(x=>[x.id,x.ar,x.en]),o.desks||null))}
    else if(sid==='military'){fs.append(el('p','kr-hint',UI('الدوائر العسكرية:','Military regions:')),chips('regions',MREG,o.regions||null))}
    else{const s=SOURCES.find(x=>x.id===sid);if(s&&s.options){const r=await s.options();if(r&&r.hint)fs.append(el('p','kr-hint',r.hint))}}
    }catch(e){fs.append(el('p','kr-st err',UI('تعذّر تحميل الخيارات الآن.','Options could not be loaded right now.')))}
  }
  function collect(){const sid=vals(box,'scope')[0]||'page',r={scope:sid,lang:vals(box,'lang')[0]||'ar',strict:si.checked,title:clean(ti.value)};
    if(sid==='page'){const p=vals(box,'parts'),all=box.querySelectorAll('input[name=parts]').length;if(p.length&&p.length<all)r.parts=p}
    if(sid==='brief'){const z=vals(box,'zones'),a=vals(box,'aspects');if(z.length&&z.length<ZONES.length)r.zones=z;if(a.length&&a.length<ASPECTS.length)r.aspects=a;
      const pe=box.querySelector('select[name=period]');r.period=pe?pe.value:'current';if(r.period==='custom'){r.from=box.querySelector('input[name=from]').value;r.to=box.querySelector('input[name=to]').value}}
    if(sid==='desks'){const dd=vals(box,'desks'),all=box.querySelectorAll('input[name=desks]').length;if(dd.length&&dd.length<all)r.desks=dd}
    if(sid==='military'){const rr=vals(box,'regions');if(rr.length&&rr.length<MREG.length)r.regions=rr}
    return r}
  sc.onchange=renderOpts;await renderOpts();
  d.addEventListener('close',()=>{d.remove();DLG=null;if(open.from&&open.from.focus)open.from.focus()});
  d.addEventListener('click',e=>{if(e.target===d)d.close()});
  document.body.append(d);if(d.showModal)d.showModal();else d.setAttribute('open','');
  const first=g.querySelector('button');if(first)first.focus({preventScroll:true});
}

/* الأزرار: في الشريط العلوي لكل صفحة، وتحت عنوان كل قسم */
function headerBtn(){const bar=document.querySelector('.top-actions');if(!bar||bar.querySelector('.kr-hdr'))return!!bar;
  const b=el('button','icon-btn kr-hdr');b.type='button';b.innerHTML=svg(REPORT_ICON,18);const lbl=()=>{const t=UI('تقرير وتنزيل','Report and download');b.title=t;b.setAttribute('aria-label',t)};lbl();
  b.onclick=()=>{open.from=b;open()};bar.prepend(b);new MutationObserver(lbl).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});return true}
function inlineBtn(){const m=pageMain();if(!m||m.querySelector('.kr-inline'))return;const h=m.querySelector('.ed-head,.wx-head,header.page-head')||(m.querySelector('h1')&&m.querySelector('h1').parentElement);
  if(!h||h===m&&!m.querySelector('h1'))return;const b=el('button','kr-inline');b.type='button';b.innerHTML=svg(REPORT_ICON,16);b.append(UI('تقرير: Word وPDF وExcel وغيرها','Report: Word, PDF, Excel and more'));b.onclick=()=>{open.from=b;open()};
  if(h===m||h.tagName==='MAIN'){const h1=m.querySelector('h1');h1.after(b)}else h.append(b)}
let tk=0;function ensure(){if(tk)return;tk=requestAnimationFrame(()=>{tk=0;try{const hb=headerBtn();inlineBtn();if(!hb&&!document.querySelector('.kr-fab')){const b=el('button','kr-inline kr-fab');b.type='button';b.innerHTML=svg(REPORT_ICON,16);b.append(UI('تقرير','Report'));b.onclick=()=>{open.from=b;open()};document.body.append(b)}}catch(e){}})}
function boot(){css();ensure();const m=pageMain();if(m)new MutationObserver(ensure).observe(m,{childList:true,subtree:false});
  const sh=readShared();if(sh){let n=0;const go=()=>{if(scanPage().sections.length||sh.scope!=='page'||n++>20)open(sh);else setTimeout(go,300)};setTimeout(go,600)}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();

window.KR={open,register,build:buildModel,formats:FORMATS.map(f=>f[0]),
  // للاختبار والأقسام الأخرى: تصدير مباشر دون الواجهة
  async export(fmt,o){return run(fmt,Object.assign({scope:'page',lang:isEN()?'en':'ar',strict:true,period:'current'},o||{}),()=>{})},
  _:{docx,xlsx,csv,pdf,png,standalone,scanPage,outlets,party,zip}};
})();
