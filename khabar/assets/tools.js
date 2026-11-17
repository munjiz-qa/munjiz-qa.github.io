/* «خبر»: أدوات القارئ والثقة: منهجيتنا، التصحيحات، موثوقية المصادر، الأجندة، «اشرح لي»، البحث في الأرشيف،
   الملخص الصوتي والمرئي، الاختبار الأسبوعي، والمساعد. كل ما يُعرض هنا مأخوذ من أخبار «خبر» المنشورة الموثّقة وحدها. */
(function(){
'use strict';
const K=window.KH,KD=window.KD;if(!K||!KD)return;
const {el}=K;const L=(a,e)=>K.LANG==='en'?e:a;const ar=()=>K.LANG!=='en';
const getJSON=u=>fetch(u,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(u);return r.json()});
const a_=(t,h,b)=>{const a=el('a',null,t);a.href=h;if(b){a.target='_blank';a.rel='noopener'}return a};
const head=(e,t,i)=>{const h=el('div','ed-head');h.append(el('span','eyebrow',e),el('h1',null,t));if(i)h.append(el('p','mute',i));return h};
const back=()=>{const a=a_(L('→ كل الأقسام','← All desks'),'#desks');a.className='back';return a};
const srcBox=list=>{const s=el('div','src');s.append(el('span','lbl',L('المصادر:','Sources:')));list.forEach(x=>s.append(a_(x[0]+(x[2]?' · '+K.fmtDate(x[2]):''),x[1],true)));return s};
let SEARCH=null,CORR=null,TRANS=null;
const loadSearch=async()=>SEARCH||(SEARCH=await getJSON('data/search.json').catch(()=>({items:[]})));
const ZN={qatar:['قطر','Qatar'],gulf:['الخليج','Gulf'],egypt:['مصر','Egypt'],world:['العالم','World']};
const briefLabel=id=>{const ed={am:['الصباح','Morning'],md:['الظهيرة','Midday'],pm:['المساء','Evening'],nt:['الليل','Night']}[id.slice(11)]||['',''];return `${K.fmtDate(id.slice(0,10))} · ${ar()?ed[0]:ed[1]}`};

/* ---------- منهجيتنا ---------- */
function method(main){
  main.append(back(),head(L('الثقة','Trust'),L('منهجيتنا','Our method'),L('كيف نتحقق قبل أن ننشر، ولماذا نشترط جهتين مستقلتين.','How we verify before publishing, and why we require two independent outlets.')));
  const S=[
    [L('قاعدة المصدرين','The two-source rule'),L('لا يُنشر خبر في «خبر» إلا إذا أكدته جهتان مستقلتان على الأقل، أي مؤسستان مختلفتان بنطاقين مختلفين. نسخ وكالة واحدة (رويترز أو أسوشيتد برس أو فرانس برس) في مواقع متعددة تُحسب جهة واحدة، ونكتب اسم الوكالة بين قوسين. ما لا يتأكد من جهتين لا يُنشر، مهما بدا مهماً.','No story is published unless at least two independent outlets, two different organisations on different domains, confirm it. Copies of one wire (Reuters, AP, AFP) on several sites count as one outlet, and we name the wire in brackets. Anything not confirmed by two outlets is not published, however important it seems.')],
    [L('أكثر من طريقة تحقق','More than one check'),L('نفضّل أن يجتمع للخبر أكثر من نوع من الأدلة: بيان رسمي، ووكالة أنباء، وصحيفة، وبيانات منشورة. وتُكتب تحت كل خبر روابط مصادره الأصلية ودرجة تحققه (عدد الجهات المستقلة).','We prefer several kinds of evidence for each story: an official statement, a news agency, a newspaper and published data. Every story carries its original source links and its verification level (the number of independent outlets).')],
    [L('الأرقام','Numbers'),L('كل رقم منسوب إلى مصدره. الأسعار الحية (العملات والذهب) لا تُعرض إلا إذا اتفق عليها مزوّدان مستقلان بفارق لا يزيد على 1.5٪، والنتائج الرياضية لا تُعرض إلا إذا تطابقت لدى مزوّدين، ومواقيت الصلاة تُحسب بطريقتين ويُعلن التطابق.','Every figure is attributed. Live prices (currencies, gold) show only when two independent providers agree within 1.5%, sports scores only when two providers match, and prayer times are computed two ways with the agreement shown.')],
    [L('الحكم على الشائعات','Rumour verdicts'),L('لا نحكم على ادعاء إلا إذا قالت جهتان مستقلتان حكماً صريحاً (كاذب، مضلل، صحيح) بلغة التحقق. نفي طرف من أطراف خبر ليس حكماً ولا يُعرض بوصفه تفنيداً.','We rate a claim only when two independent outlets give an explicit verdict (false, misleading, true) in fact-checking language. A party\'s denial is not a verdict and is never shown as a debunk.')],
    [L('الآلي والتحريري','Automatic and editorial'),L('الخلاصات الأربع اليومية تحريرية. إن تأخرت إحداها يكتب الطيار الآلي خلاصة آلية من عناوين الجهات نفسها بروابطها الأصلية، ويُعلَّم كل ما هو آلي بوضوح. الأقسام الموضوعية تُحدَّث آلياً كل 3 ساعات بالقاعدة نفسها.','The four daily briefs are editorial. If one is late the autopilot writes an automatic brief from the outlets\' own headlines and original links, clearly labelled. Topic desks refresh automatically every 3 hours under the same rule.')],
    [L('التصحيح','Corrections'),L('كل خطأ يُصحَّح علناً في سجل التصحيحات مع التاريخ وسبب التصحيح، وتبقى صيغة الخبر الأصلية ظاهرة. يستطيع كل قارئ أن يبلّغ عن خطأ من الزر تحت كل خبر.','Every error is corrected publicly in the corrections log with the date and the reason, and the original wording stays visible. Any reader can report an error from the button under each story.')],
    [L('الاستقلال والمعايير','Independence and standards'),L('نلتزم بمبادئ الشبكة الدولية لتقصي الحقائق (IFCN): عدم الانحياز والإنصاف، وشفافية المصادر، وشفافية التمويل والتنظيم، وشفافية المنهجية، وسياسة تصحيح مفتوحة وصادقة. التحليل والاستقراء اجتهاد تحريري يُعلَّم بوضوح ويُبنى على المصادر المذكورة.','We follow the International Fact-Checking Network (IFCN) principles: non-partisanship and fairness, transparency of sources, of funding and organisation, of methodology, and an open and honest corrections policy. Analysis is clearly labelled editorial judgement built on the cited sources.')]];
  const g=el('div','pillars');S.forEach(([t,p])=>{const d=el('div','pillar');d.append(el('h3',null,t),el('p',null,p));g.append(d)});main.append(g);
  const r=el('section','zone');r.append(el('h2',null,L('تقرير الشفافية الشهري','Monthly transparency report')));main.append(r);transparency(r);
  const links=el('p','basis');links.append(a_(L('سجل التصحيحات','Corrections log'),'#corrections'),' · ',a_(L('موثوقية المصادر','Source reliability'),'#outlets'),' · ',a_(L('ميزان الثقة لكل خبر','Per-story trust ledger'),'#ledger'));main.append(links);
}
async function transparency(host){
  TRANS=TRANS||await getJSON('data/transparency.json').catch(()=>null);if(!TRANS){host.append(el('p','empty',L('يُنشر التقرير مع التحديث التالي.','Published with the next update.')));return}
  const w=el('div','fx-wrap'),t=el('table','fx');const h=el('tr');[L('الشهر','Month'),L('الخلاصات','Briefs'),L('منها آلية','Automatic'),L('الأخبار','Stories'),L('المصادر','Sources'),L('الجهات المستقلة','Outlets'),L('التصحيحات','Corrections')].forEach(x=>h.append(el('th',null,x)));t.append(h);
  TRANS.months.forEach(m=>{const r=el('tr');[K.fmtDate(m.month),m.briefs,m.auto,m.items,m.sources,m.outlets,m.corrections].forEach((x,i)=>r.append(el('td',i?'num':null,String(x))));t.append(r)});w.append(t);host.append(w);
}

/* ---------- سجل التصحيحات ---------- */
async function corrections(main){
  main.append(back(),head(L('الثقة','Trust'),L('سجل التصحيحات','Corrections log'),L('كل تصحيح بتاريخه وسببه، مع الصيغة الأصلية والصيغة المصحّحة.','Every correction with its date and reason, showing the original and corrected wording.')));
  CORR=CORR||await getJSON('data/corrections.json').catch(()=>({items:[]}));
  const list=(CORR.items||[]).slice().sort((a,b)=>String(b.date).localeCompare(a.date));
  if(!list.length){main.append(el('p','empty',L('لا تصحيحات منشورة حتى الآن. إن وجدت خطأ فبلّغ عنه من الزر تحت الخبر.','No corrections published yet. If you find an error, report it from the button under the story.')));return}
  const ul=el('ul','items');list.forEach(c=>{const li=el('li','item corr');li.append(el('span','cat',`${K.fmtDate(c.date)} · ${ar()?c.reason_ar||c.reason:c.reason_en||c.reason}`));
    const o=el('p','was');o.append(el('b',null,L('الأصل: ','Original: ')),ar()?c.before_ar||c.before:c.before_en||c.before);
    const n=el('p');n.append(el('b',null,L('بعد التصحيح: ','Corrected: ')),ar()?c.after_ar||c.after:c.after_en||c.after);li.append(o,n);
    if(c.sources&&c.sources.length)li.append(srcBox(c.sources.map(s=>[s.name,s.url,s.date])));if(c.brief)li.append(a_(L('الخلاصة المعنية','The brief'),'#b-'+c.brief));ul.append(li)});main.append(ul);
}

/* ---------- موثوقية المصادر ---------- */
const OFFICIAL=/\.gov|\.gob|\.gc\.ca|gov\.qa|\.gov\.eg|who\.int|un\.org|imf\.org|worldbank\.org|opec\.org|qna\.org\.qa|mofa|moi\.|moph|sis\.gov|cabinet|presidency|amiri|europa\.eu|nato\.int|state\.gov|defense\.gov|kremlin\.ru|wam\.ae|spa\.gov\.sa|kuna\.net\.kw|omannews|bna\.bh|mena\.org\.eg/i;
const WIRE=/reuters|apnews|afp\.com|bloomberg|aa\.com\.tr|anadolu|xinhua|tass|dpa|efe\.com|ansa/i;
const CHECK=/fatabyyano|misbar|factcheck|snopes|fullfact|politifact|checkyourfact|leadstories|logically/i;
const tier=d=>OFFICIAL.test(d)?['official',L('جهة رسمية','Official body')]:WIRE.test(d)?['wire',L('وكالة أنباء','News agency')]:CHECK.test(d)?['check',L('منصة تحقق','Fact-checker')]:['press',L('صحيفة أو موقع إخباري','Newspaper or news site')];
const dom=u=>{try{const p=new URL(u).hostname.replace(/^(www|amp|m|en|english|arabic)\./,'').split('.');return p.length>2&&['co','com','org','net','gov'].includes(p[p.length-2])?p.slice(-3).join('.'):p.slice(-2).join('.')}catch(e){return ''}};
async function outlets(main){
  main.append(back(),head(L('الثقة','Trust'),L('موثوقية المصادر','Source reliability'),L('تقييم معلن لكل جهة ننقل عنها: نوعها، وكم مرة نقلنا عنها، وكم مرة أكدت جهة مستقلة أخرى ما نشرته.','A public rating of every outlet we cite: its type, how often we cite it, and how often another independent outlet corroborated it.')));
  const S=await loadSearch();const st={};
  const add=(u,n,co)=>{const d=dom(u);if(!d)return;const r=st[d]=st[d]||{d,n:0,co:0,names:new Set()};r.n++;if(co)r.co++;if(n)r.names.add(n)};
  S.items.forEach(i=>{const ds=new Set(i[5].map(s=>dom(s[1])));i[5].forEach(s=>add(s[1],s[0],ds.size>=2))});
  const D=KD.data;if(D)Object.values(D.desks).forEach(d=>d.items.forEach(i=>i.sources.forEach(s=>add(s.url,s.name,true))));
  const rows=Object.values(st).filter(r=>r.n>=3).sort((a,b)=>b.n-a.n).slice(0,120);
  const score=r=>{const t=tier(r.d)[0];const base={official:4,wire:4,check:4,press:3}[t];return Math.min(5,base+(r.co/r.n>=.5?1:0))};
  const w=el('div','fx-wrap'),t=el('table','fx');const h=el('tr');[L('الجهة','Outlet'),L('النوع','Type'),L('مرات النقل','Citations'),L('أكدتها جهة أخرى','Corroborated'),L('التقييم','Rating')].forEach(x=>h.append(el('th',null,x)));t.append(h);
  rows.forEach(r=>{const tr=el('tr');const s=score(r);tr.append(el('td',null,`${[...r.names][0]||r.d} (${r.d})`),el('td',null,tier(r.d)[1]),el('td','num',String(r.n)),el('td','num',Math.round(r.co/r.n*100)+'%'),el('td','stars','★★★★★'.slice(0,s)+'☆☆☆☆☆'.slice(0,5-s)));t.append(tr)});
  w.append(t);main.append(w,el('p','basis',L('طريقة التقييم: الجهات الرسمية والوكالات ومنصات التحقق تبدأ من 4 والصحف من 3، وتزيد درجة إذا أكدت جهة مستقلة أخرى نصف ما نقلناه عنها فأكثر. قبل 17 نوفمبر 2026 لم تكن قاعدة الجهتين مفروضة على كل خبر، فنسبة التأكيد في الأرشيف القديم أقل بطبيعتها، ولذلك لا تُنقص درجة أي جهة بسببها. التقييم يقيس سجل الجهة في «خبر» لا قيمتها الصحفية عموماً، ويُحسب آلياً من الأرشيف.','Method: official bodies, wires and fact-checkers start at 4 and newspapers at 3; one point is added when another independent outlet corroborated half or more of what we cited from it, Before 17 November 2026 the two-source rule was not enforced on every story, so older corroboration rates are naturally lower and never lower a rating. It measures each outlet\'s record in Khabar, not its overall journalistic value, and is computed automatically from the archive.')));
}

/* ---------- أجندة الأسبوع ---------- */
function agenda(main){
  main.append(back(),head(L('التقويم','Calendar'),L('أجندة الأسبوع','The week ahead'),L('القمم والانتخابات والبيانات الاقتصادية والمواعيد المرتقبة في الأيام السبعة القادمة، كل موعد بمصدره.','Summits, elections, economic data and other dates in the next seven days, each with its source.')));
  const B=K.BRIEF,ED=KD.editorial||{};const today=new Date().toISOString().slice(0,10),end=new Date(Date.now()+7*864e5).toISOString().slice(0,10);
  const ev=[];(B&&B.roadmap||[]).forEach(r=>{const to=r.to||r.date;if(to>=today&&r.date<=end)ev.push({date:r.date<today?today:r.date,to:r.to,text:r[K.LANG]||r.ar,zone:r.zone,src:(r.src||[]).map(s=>B.sources[s]).filter(Boolean).map(s=>[s[K.LANG]||s.ar,s.url,s.date])})});
  (ED.agenda||[]).forEach(r=>{if((r.to||r.date)>=today&&r.date<=end&&(r.sources||[]).length>=2)ev.push({date:r.date<today?today:r.date,to:r.to,text:ar()?r.ar:r.en,kind:r.kind,src:r.sources.map(s=>[s.name,s.url,s.date])})});
  if(!ev.length){main.append(el('p','empty',L('لا مواعيد موثّقة في الأيام السبعة القادمة بعد.','No verified dates in the next seven days yet.')));return}
  const days={};ev.forEach(e=>(days[e.date]=days[e.date]||[]).push(e));
  Object.keys(days).sort().forEach(d=>{const s=el('section','zone');s.append(el('h2',null,K.fmtDate(d,true)));const ul=el('ul','items');
    days[d].forEach(e=>{const li=el('li','item');if(e.zone)li.style.setProperty('--zc',{qatar:'var(--dawn)',gulf:'var(--sea)',egypt:'var(--nile)',world:'var(--ink)'}[e.zone]);
      li.append(el('span','cat',(e.zone?(ar()?ZN[e.zone][0]:ZN[e.zone][1]):'')+(e.to?L(' · حتى ',' · until ')+K.fmtDate(e.to):'')),el('p',null,e.text),srcBox(e.src));ul.append(li)});s.append(ul);main.append(s)});
  const ics=el('button','btn ghost',L('أضف الأجندة إلى تقويمك','Add to your calendar'));ics.type='button';ics.onclick=()=>{
    const z=s=>s.replace(/-/g,'');const body=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Khabar//Agenda//AR',...ev.map((e,i)=>['BEGIN:VEVENT',`UID:khabar-${z(e.date)}-${i}@khabar`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').slice(0,15)}Z`,`DTSTART;VALUE=DATE:${z(e.date)}`,`SUMMARY:${e.text.slice(0,140).replace(/[,;]/g,' ')}`,`DESCRIPTION:${e.src.map(s=>s[1]).join(' ')}`,'END:VEVENT'].join('\r\n')),'END:VCALENDAR'].join('\r\n');
    const u=URL.createObjectURL(new Blob([body],{type:'text/calendar'})),a=document.createElement('a');a.href=u;a.download='khabar-agenda.ics';a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)};
  main.append(ics);
}

/* ---------- «اشرح لي» ---------- */
async function explain(main){
  main.append(back(),head(L('خلفيات','Backgrounds'),L('اشرح لي','Explain it'),L('خلفية مبسّطة لكل قضية كبرى في دقيقة قراءة، من ملفاتنا الموثّقة.','A one-minute plain background to each major story, from our verified files.')));
  const W=await getJSON('data/wars.json').catch(()=>null),ED=KD.editorial||{};const list=[];
  (ED.explain||[]).filter(x=>(x.sources||[]).length>=2).forEach(x=>list.push({title:ar()?x.title_ar:x.title_en,body:ar()?x.ar:x.en,src:x.sources.map(s=>[s.name,s.url,s.date])}));
  if(W)W.wars.forEach(w=>{const S=W.sources||{};const ids=[...(w.summary.src||[]),...(w.parties_src||[]),...(w.since_src||[])];const src=[...new Set(ids)].map(i=>S[i]).filter(Boolean).map(s=>[s[K.LANG]||s.ar,s.url,s.date]);
    list.push({title:w.name[K.LANG],body:[w.summary[K.LANG],w.parties?(L('الأطراف: ','Parties: ')+w.parties[K.LANG]):'',w.since?(L('البداية: ','Started: ')+K.fmtDate(w.since)):''].filter(Boolean).join('\n\n'),src,link:'#war-'+w.id})});
  if(!list.length){main.append(el('p','empty',L('تُنشر الخلفيات مع التحديث التالي.','Published with the next update.')));return}
  list.forEach(x=>{const d=el('details','explain');const s=el('summary');s.append(el('b',null,x.title),el('small',null,L('دقيقة قراءة','1-minute read')));d.append(s);
    x.body.split('\n\n').forEach(p=>d.append(el('p',null,p)));d.append(srcBox(x.src));if(x.link)d.append(a_(L('الملف الكامل ←','Full file →'),x.link));main.append(d)});
}

/* ---------- البحث في الأرشيف ---------- */
const norm=s=>String(s||'').toLowerCase().replace(/[إأآا]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ً-ْـ]/g,'');
async function search(main){
  main.append(back(),head(L('الأرشيف','Archive'),L('البحث في كل الخلاصات','Search every brief'),L('ابحث في كل الأخبار الموثّقة منذ انطلاق «خبر»، بالكلمة والتاريخ والدائرة.','Search every verified story since Khabar launched, by word, date and region.')));
  const f=el('div','calc');const q=el('input');q.type='search';q.placeholder=L('اكتب كلمة أو اسماً…','Type a word or a name…');q.style.flex='1 1 220px';q.setAttribute('aria-label',L('البحث','Search'));
  const z=el('select');[['',L('كل الدوائر','All regions')],...Object.entries(ZN).map(([k,v])=>[k,ar()?v[0]:v[1]])].forEach(([v,t])=>{const o=el('option',null,t);o.value=v;z.append(o)});
  const fr=el('input');fr.type='date';fr.setAttribute('aria-label',L('من تاريخ','From'));const to=el('input');to.type='date';to.setAttribute('aria-label',L('إلى تاريخ','To'));
  f.append(q,z,fr,to);main.append(f);const out=el('div');main.append(out);out.append(el('p','mute',L('جارٍ تحميل الأرشيف…','Loading the archive…')));
  const S=await loadSearch();const lang=ar()?3:4;
  const run=()=>{out.textContent='';const words=norm(q.value).split(/\s+/).filter(w=>w.length>1);
    let res=S.items.filter(i=>(!z.value||i[1]===z.value)&&(!fr.value||i[0].slice(0,10)>=fr.value)&&(!to.value||i[0].slice(0,10)<=to.value));
    if(words.length)res=res.filter(i=>{const t=norm(i[3]+' '+i[4]);return words.every(w=>t.includes(w))});else if(!z.value&&!fr.value&&!to.value){out.append(el('p','mute',L(`في الأرشيف ${S.items.length} خبراً موثّقاً. اكتب كلمة للبحث.`,`${S.items.length} verified stories in the archive. Type a word to search.`)));return}
    out.append(el('p','basis',K.nItems(res.length)));const ul=el('ul','items');
    res.slice(0,60).forEach(i=>{const li=el('li','item');li.append(el('span','cat',`${briefLabel(i[0])} · ${ar()?ZN[i[1]][0]:ZN[i[1]][1]}`),el('p',null,i[lang]||i[3]),srcBox(i[5].map(s=>[s[0],s[1]])));const a=a_(L('افتح الخلاصة','Open the brief'),'#b-'+i[0]);a.className='more';li.append(a);ul.append(li)});out.append(ul)};
  let tm;[q,z,fr,to].forEach(x=>x.addEventListener('input',()=>{clearTimeout(tm);tm=setTimeout(run,220)}));run();
}

/* ---------- الملخص الصوتي والفيديو القصير ---------- */
function script(){
  const B=K.BRIEF;if(!B)return [];const parts=[];const lng=K.LANG;
  parts.push({h:L('خبر','Khabar'),t:(B.title&&B.title[lng])||L('خلاصة اليوم','Today\'s brief')});
  if(B.thread)parts.push({h:L('خيط اليوم','The day\'s thread'),t:B.thread[lng]});
  B.zones.forEach(z=>{const i=z.items.find(x=>x[lng]);if(i){const src=(i.src||[]).map(s=>B.sources[s]).filter(Boolean);parts.push({h:z.name[lng],t:i[lng].split(/(?<=[.!؟?])\s/).slice(0,2).join(' '),src:src.slice(0,2).map(s=>s[lng]||s.ar).join(L('، ',', '))})}});
  parts.push({h:L('خبر','Khabar'),t:L('هذه خلاصة «خبر». كل خبر بمصادره وروابطه الأصلية على الموقع.','That was Khabar. Every story with its sources and original links is on the site.')});
  return parts;
}
function listen(main){
  main.append(back(),head(L('استمع وشاهد','Listen and watch'),L('الملخص الصوتي والمرئي','Audio and video brief'),L('نسخة مسموعة من الخلاصة في نحو دقيقتين بصوت جهازك، وعرض مرئي قصير يمكنك تنزيله ومشاركته.','A spoken version of the brief in about two minutes using your device voice, and a short video you can download and share.')));
  const P=script();if(!P.length){main.append(el('p','empty',K.t?K.t('err'):''));return}
  const words=P.reduce((n,p)=>n+p.t.split(/\s+/).length,0);main.append(el('p','basis',L(`المدة التقريبية ${Math.max(1,Math.round(words/140))} دقيقة · ${words} كلمة`,`About ${Math.max(1,Math.round(words/150))} min · ${words} words`)));
  const stage=el('div','story');const cv=document.createElement('canvas');cv.width=720;cv.height=1280;cv.className='story-cv';stage.append(cv);main.append(stage);
  const ctrl=el('div','kdlg-acts');const play=el('button','btn',L('▶ استمع وشاهد','▶ Play'));play.type='button';const stop=el('button','btn ghost',L('■ أوقف','■ Stop'));stop.type='button';
  const rec=el('button','btn ghost',L('⬇ نزّل الفيديو القصير','⬇ Download the short video'));rec.type='button';
  const rate=el('select');[['0.9',L('أبطأ','Slower')],['1',L('عادي','Normal')],['1.15',L('أسرع','Faster')]].forEach(([v,t])=>{const o=el('option',null,t);o.value=v;if(v==='1')o.selected=true;rate.append(o)});rate.setAttribute('aria-label',L('السرعة','Speed'));
  ctrl.append(play,stop,rate,rec);main.append(ctrl);
  const prog=el('ol','story-list');P.forEach(p=>prog.append(el('li',null,p.h)));main.append(prog);
  const draw=(i,frac)=>{const x=cv.getContext('2d'),W=cv.width,H=cv.height,p=P[i];const rtl=ar();x.fillStyle='#14212E';x.fillRect(0,0,W,H);
    x.fillStyle='#E39A2D';x.fillRect(0,0,W*((i+frac)/P.length),10);x.direction=rtl?'rtl':'ltr';x.textAlign=rtl?'right':'left';const X=rtl?W-56:56;
    x.fillStyle='#E39A2D';x.font='700 44px "Reem Kufi","IBM Plex Sans Arabic",sans-serif';x.fillText(p.h,X,150);
    x.fillStyle='#F5F6F3';let size=40,lines;const wrapL=(t,max)=>{const ws=t.split(/\s+/),ls=[];let c='';ws.forEach(w=>{const n=c?c+' '+w:w;if(x.measureText(n).width>max&&c){ls.push(c);c=w}else c=n});if(c)ls.push(c);return ls};
    do{x.font=`600 ${size}px "IBM Plex Sans Arabic",sans-serif`;lines=wrapL(p.t,W-112);size-=2}while(lines.length*size*1.6>H-480&&size>24);
    let y=260;lines.forEach(l=>{x.fillText(l,X,y);y+=size*1.6});
    if(p.src){x.font='500 26px "IBM Plex Sans Arabic",sans-serif';x.fillStyle='#9FB0BF';x.fillText(L('المصادر: ','Sources: ')+p.src,X,H-150)}
    x.font='700 34px "Reem Kufi",sans-serif';x.fillStyle='#F5F6F3';x.fillText(L('خبر','Khabar'),X,H-80)};
  draw(0,0);let idx=0,on=false,raf=0,t0=0;
  const voice=()=>{const vs=speechSynthesis.getVoices();return vs.find(v=>v.lang&&v.lang.toLowerCase().startsWith(ar()?'ar':'en'))};
  const say=i=>new Promise(res=>{if(!('speechSynthesis'in window)){setTimeout(res,P[i].t.split(/\s+/).length*400);return}const u=new SpeechSynthesisUtterance(P[i].h+'. '+P[i].t);u.lang=ar()?'ar-SA':'en-US';const v=voice();if(v)u.voice=v;u.rate=+rate.value;u.onend=res;u.onerror=res;speechSynthesis.speak(u)});
  const anim=d=>{cancelAnimationFrame(raf);t0=performance.now();const f=()=>{draw(idx,Math.min(1,(performance.now()-t0)/d));if(on)raf=requestAnimationFrame(f)};f()};
  const mark=()=>[...prog.children].forEach((li,k)=>li.classList.toggle('on',k===idx));
  const runAll=async(silent)=>{on=true;for(idx=0;idx<P.length&&on;idx++){mark();const d=P[idx].t.split(/\s+/).length*(silent?260:400)/+rate.value;anim(d);if(silent)await new Promise(r=>setTimeout(r,d));else await say(idx)}on=false;cancelAnimationFrame(raf)};
  play.onclick=()=>{if('speechSynthesis'in window)speechSynthesis.cancel();runAll(false)};
  stop.onclick=()=>{on=false;if('speechSynthesis'in window)speechSynthesis.cancel()};
  rec.onclick=async()=>{if(!cv.captureStream||!window.MediaRecorder){K.toast(L('متصفحك لا يدعم تسجيل الفيديو.','Your browser cannot record video.'));return}
    const st=cv.captureStream(30);const mime=['video/mp4','video/webm;codecs=vp9','video/webm'].find(m=>MediaRecorder.isTypeSupported(m))||'';const mr=new MediaRecorder(st,mime?{mimeType:mime}:{});const ch=[];mr.ondataavailable=e=>ch.push(e.data);
    mr.onstop=()=>{const b=new Blob(ch,{type:mr.mimeType});const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download='khabar-brief.'+(mr.mimeType.includes('mp4')?'mp4':'webm');a.click();setTimeout(()=>URL.revokeObjectURL(u),5000);K.toast(L('نُزّل الفيديو.','Video downloaded.'))};
    rec.disabled=true;K.toast(L('يُسجَّل الفيديو الآن (نحو دقيقة)…','Recording the video (about a minute)…'));mr.start();await runAll(true);mr.stop();rec.disabled=false};
}

/* ---------- الاختبار الأسبوعي ---------- */
function seeded(seed){return()=>{seed=(seed*1664525+1013904223)%4294967296;return seed/4294967296}}
async function quiz(main){
  main.append(back(),head(L('اختبار','Quiz'),L('اختبار الأسبوع','The weekly quiz'),L('خمسة أسئلة من أخبار الأيام السبعة الأخيرة في «خبر». الإجابة الصحيحة مأخوذة من الخبر المنشور، ومعها مصدره.','Five questions from the last seven days of Khabar stories. Each answer comes from the published story, with its source.')));
  const S=await loadSearch();const since=new Date(Date.now()-7*864e5).toISOString().slice(0,10);const li=ar()?3:4;
  const pool=S.items.filter(i=>i[0].slice(0,10)>=since&&i[li]&&/\d/.test(i[li])).map(i=>{const m=[...i[li].matchAll(/(\d[\d,.]*)(\s?(٪|%|مليار|مليون|ألف|billion|million|percent|دولار|dollars?))?/g)].filter(x=>{const v=parseFloat(x[1].replace(/,/g,''));return v>=2&&!(v>=1900&&v<=2100)&&!/^\d{1,2}$/.test(x[1])||x[2]});return m.length?{i,m:m[0]}:null}).filter(Boolean);
  if(pool.length<5){main.append(el('p','empty',L('يُنشر الاختبار حين يكتمل أسبوع من الأخبار.','The quiz is published once a week of stories is available.')));return}
  const wk=Math.floor(Date.now()/(7*864e5));const rnd=seeded(wk+(ar()?0:7));const qs=[];const used=new Set();
  while(qs.length<5&&used.size<pool.length){const k=Math.floor(rnd()*pool.length);if(used.has(k))continue;used.add(k);qs.push(pool[k])}
  let score=0,done=0;const res=el('p','numday-sm');
  qs.forEach((q,n)=>{const txt=q.i[li],num=q.m[1],v=parseFloat(num.replace(/,/g,''));const dec=(num.split('.')[1]||'').length;
    const fmt=x=>{const s=dec?x.toFixed(dec):String(Math.round(x));return num.includes(',')?Number(s).toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}):s};
    const opts=new Set([num]);const f=[.5,.75,1.25,1.5,2,.8,1.2];let g=0;while(opts.size<4&&g<20){opts.add(fmt(v*f[Math.floor(rnd()*f.length)]));g++}
    const arr=[...opts].sort(()=>rnd()-.5);
    const s=el('section','zone quiz');s.append(el('h2',null,L(`السؤال ${n+1}`,`Question ${n+1}`)));s.append(el('p',null,txt.replace(num,'____')));
    const row=el('div','chips');arr.forEach(o=>{const b=el('button','chip',o+(q.m[2]||''));b.type='button';b.onclick=()=>{if(s.dataset.done)return;s.dataset.done=1;done++;const ok=o===num;if(ok)score++;b.classList.add(ok?'ok':'bad');row.querySelectorAll('button').forEach(x=>{if(x.textContent.startsWith(num))x.classList.add('ok')});
      s.append(el('p','basis',(ok?L('إجابة صحيحة. ','Correct. '):L(`الإجابة الصحيحة ${num}. `,`The answer is ${num}. `))+briefLabel(q.i[0])),srcBox(q.i[5].map(x=>[x[0],x[1]])));if(done===qs.length)res.textContent=L(`نتيجتك ${score} من ${qs.length}`,`You scored ${score} of ${qs.length}`)};row.append(b)});
    s.append(row);main.append(s)});main.append(res);
}

/* ---------- المساعد: يجيب من أخبار «خبر» الموثّقة وحدها ---------- */
async function ask(main){
  main.append(back(),head(L('اسأل خبر','Ask Khabar'),L('المساعد','The assistant'),L('اسأل بالعربية أو الإنجليزية، فيجيبك المساعد بأقرب الأخبار الموثّقة المنشورة في «خبر» مع مصادرها. لا يجيب من خارج أخبارنا، ولا يخترع معلومة.','Ask in Arabic or English and the assistant answers with the closest verified stories published in Khabar, with their sources. It never answers from outside our stories or invents information.')));
  const f=el('form','calc');const q=el('input');q.type='search';q.style.flex='1 1 240px';q.placeholder=L('مثال: ما آخر تطورات مضيق هرمز؟','e.g. What is the latest on the Strait of Hormuz?');q.setAttribute('aria-label',L('سؤالك','Your question'));
  const go=el('button','btn',L('اسأل','Ask'));f.append(q,go);main.append(f);const out=el('div');main.append(out);
  const STOP=new Set(norm('ما ماذا من هل كيف متى اين لماذا هو هي في على عن الى إلى مع آخر اخر تطورات اخبار أخبار the what who when where why how is are of in on for to a an latest news about').split(' '));
  f.onsubmit=async e=>{e.preventDefault();out.textContent=L('أبحث في أخبارنا…','Searching our stories…');
    const S=await loadSearch();const D=KD.data;const words=norm(q.value).split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2&&!STOP.has(w)).map(w=>w.replace(/^(وال|بال|ال|و)(?=\p{L}{3,})/u,''));
    if(!words.length){out.textContent=L('اكتب سؤالاً فيه اسم أو موضوع.','Type a question with a name or topic.');return}
    const scoreT=t=>{t=norm(t);return words.reduce((s,w)=>s+(t.includes(w)?1:0),0)};
    const cands=[];S.items.forEach(i=>{const sc=scoreT(i[3]+' '+i[4]);if(sc)cands.push({sc:sc+(i[0]>=new Date(Date.now()-3*864e5).toISOString().slice(0,10)?.5:0),date:i[0],text:i[ar()?3:4]||i[3],src:i[5].map(s=>[s[0],s[1]]),link:'#b-'+i[0],where:briefLabel(i[0])})});
    if(D)Object.entries(D.desks).forEach(([id,d])=>d.items.forEach(i=>{const sc=scoreT(i.title+' '+i.sources.map(s=>s.title).join(' '));if(sc)cands.push({sc:sc+.7,date:i.t,text:i.title,src:i.sources.map(s=>[s.name,s.url,s.date]),link:'#d-'+id,where:L('قسم ','Desk: ')+(KD.meta(id)||{})[K.LANG]})}));
    cands.sort((a,b)=>b.sc-a.sc||String(b.date).localeCompare(a.date));out.textContent='';
    const best=cands.filter(c=>c.sc>=Math.min(words.length,2)||c.sc>=words.length).slice(0,5);
    if(!best.length){out.append(el('p','empty',L('لم أجد في أخبار «خبر» الموثّقة ما يجيب سؤالك. لا أجيب من خارجها.','I found nothing in Khabar\'s verified stories that answers this. I do not answer from outside them.')));return}
    out.append(el('p','basis',L(`أقرب ${best.length} أخبار موثّقة لسؤالك، الأحدث أولاً عند التساوي:`,`The ${best.length} closest verified stories, newest first on ties:`)));
    const ul=el('ul','items');best.forEach(c=>{const li=el('li','item');li.append(el('span','cat',c.where),el('p',null,c.text),srcBox(c.src));const a=a_(L('افتح في مكانه','Open in context'),c.link);a.className='more';li.append(a);ul.append(li)});out.append(ul)};
}

/* ---------- رأي وتحليل ---------- */
async function opinion(main){
  main.append(back(),head(L('رأي','Opinion'),L('رأي وتحليل','Opinion and analysis'),L('مقالات يكتبها كتّاب بأسمائهم، وتعبّر عن آراء كاتبيها لا عن «خبر». كل معلومة فيها منسوبة إلى مصدرها.','Signed articles that reflect their authors\' views, not Khabar\'s. Every fact in them is attributed to its source.')));
  const O=await getJSON('data/opinion.json').catch(()=>({authors:[],articles:[]}));const list=(O.articles||[]).filter(a=>a.lang===K.LANG||!ar()||a.lang==='ar');
  if(!list.length){main.append(el('p','empty',L('لا مقالات رأي منشورة بعد. تُنشر المقالات من لوحة الإدارة بأسماء كتّابها وبموافقتهم.','No opinion pieces yet. They are published from the admin panel under their authors\' names, with consent.')));return}
  list.forEach(a=>{const au=(O.authors||[]).find(x=>x.id===a.author)||{name:a.author};const d=el('details','explain');const s=el('summary');s.append(el('b',null,a.title),el('small',null,`${au.name} · ${K.fmtDate(a.date)}`));d.append(s);
    d.append(el('span','verdict',L('رأي','Opinion')));if(au.bio)d.append(el('p','mute',au.bio));String(a.body).split(/\n\s*\n/).forEach(p=>d.append(el('p',null,p)));if((a.sources||[]).length)d.append(srcBox(a.sources.map(u=>[(()=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return u}})(),u])));main.append(d)});
  main.querySelectorAll('.verdict').forEach(v=>v.style.setProperty('--vc','#566270'));
}
const VIEWS={method,corrections,outlets,agenda,explain,search,listen,quiz,ask,opinion};
const has0=KD.has,view0=KD.view;
KD.has=v=>has0(v)||!!VIEWS[v];
KD.view=(v,main)=>VIEWS[v]?VIEWS[v](main):view0(v,main);
KD.tools=Object.keys(VIEWS);
})();
