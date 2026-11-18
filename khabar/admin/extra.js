'use strict';
// لوحة إدارة «عبدو نيوز»: الأقسام الموضوعية، والبلاغات والمشتركون وإحصاءات القراء، والتصحيحات، ومقالات الرأي، وما هو «جاهز للتفعيل».
// يعمل في نسختي GitHub وCloudflare: admin.js يمرّر دالة الحفظ المناسبة (GitHub أو /api/save) عبر KAX.init.
(function(){
const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const CFG=window.KHABAR_CONFIG||{};
const getJSON=u=>fetch(u,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(u);return r.json()});
const LS={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}}};
const fmt=iso=>{try{return new Date(iso).toLocaleString('ar-QA',{timeZone:'Asia/Qatar',numberingSystem:'latn',dateStyle:'medium',timeStyle:'short'})}catch(e){return iso}};
let H=null,DESKS=null,CORR=null,OPN=null,CTRY=null;
const say=(id,t,ok)=>{const m=$(id);m.textContent=t;m.className='msg '+(ok?'ok':'err');m.hidden=false};
const ACT=[
  ['newsletter','إرسال النشرة اليومية بالبريد أو واتساب','مزوّد إرسال (مثل Resend أو Brevo للبريد، وWhatsApp Business API للواتساب)، ومفتاحه في أسرار الخادم، ونطاق مرسل موثّق.'],
  ['payments','الاشتراك المدفوع','مزوّد دفع (مثل Stripe أو بوابة قطرية/مصرية)، والأسعار والمزايا، وسياسة الاسترداد.'],
  ['ads','الإعلانات','حساب إعلانات (مثل Google AdSense) أو معلنون مباشرون، وسياسة تمييز الإعلان عن الخبر.'],
  ['social_x','النشر الآلي على X','حساب «عبدو نيوز» على X ومفتاح API بصلاحية النشر.'],
  ['social_telegram','قناة وبوت تلغرام','قناة تلغرام، وبوت من BotFather ومفتاحه.'],
  ['social_whatsapp','قناة واتساب الرسمية','قناة واتساب باسم «عبدو نيوز» (النشر فيها يدوي، أو WhatsApp Business API للآلي).'],
  ['voice','المساعدات الصوتية','حساب مطوّر Google (Actions) وAmazon (Alexa Flash Briefing)، وخلاصة RSS الصوتية جاهزة.'],
  ['stores','متاجر التطبيقات وأدلتها','حساب Google Play (رسوم مرة واحدة) وApple Developer (سنوي)، وتغليف PWA جاهز.'],
  ['campaign','حملة الإطلاق','ميزانية الحملة، والجمهور (قطر ومصر)، والحسابات الإعلانية.'],
  ['ifcn','طلب عضوية IFCN','ملف الطلب جاهز في المشروع؛ يقدّمه المالك من حسابه بعد مراجعته.'],
  ['domain','نطاق خاص','شراء نطاق (مثل khabar.qa أو khabar.news) وربطه بـ Cloudflare.']];

async function init(ctx){
  H=ctx;
  CTRY=await getJSON('../data/countries.json').catch(()=>null);
  [DESKS,CORR,OPN]=await Promise.all([getJSON('../data/desks.json').catch(()=>null),getJSON('../data/corrections.json').catch(()=>({items:[]})),getJSON('../data/opinion.json').catch(()=>({authors:[],articles:[]}))]);
  const anchor=[...document.querySelectorAll('.panel h2')].find(h=>h.textContent.includes('كلمة المرور'));const before=anchor?anchor.parentElement:null;const host=before?before.parentElement:$('#app');
  const add=p=>before?host.insertBefore(p,before):host.append(p);
  add(desksPanel());add(countriesPanel());add(inboxPanel());add(corrPanel());add(opinionPanel());add(activatePanel());
}
const panel=(title,intro)=>{const s=el('section','panel');s.append(el('h2',null,title));if(intro){const p=el('p','mute',intro);p.style.fontSize='.9rem';s.append(p)}return s};
const kpis=list=>{const k=el('div','kpis');list.forEach(([v,l])=>{const d=el('div');d.append(el('b',null,String(v)),el('small',null,l));k.append(d)});return k};

/* ---------- الأقسام ---------- */
function desksPanel(){
  const A=H.admin();const s=panel('الأقسام الموضوعية','تُحدَّث آلياً كل 3 ساعات، ولا يُنشر فيها خبر إلا من جهتين مستقلتين، ولا سعر إلا باتفاق مزوّدين. يمكنك إيقاف قسم أو إخفاء خبر بعينه.');
  if(!DESKS){s.append(el('p','mute','لم تُكتب الأقسام بعد؛ تظهر بعد أول تشغيل للمحرك الآلي.'));return s}
  const n=Object.values(DESKS.desks).reduce((a,d)=>a+d.items.length,0),age=(Date.now()-new Date(DESKS.updated))/3600e3;
  s.append(kpis([[DESKS.meta.length,'قسماً'],[n,'خبراً موثّقاً الآن'],[Object.keys(DESKS.rates&&DESKS.rates.fx||{}).length,'عملة باتفاق مزوّدين'],[(DESKS.sports&&DESKS.sports.matches.length)||0,'مباراة مؤكدة'],[age.toFixed(1),'ساعة منذ آخر تحديث']]));
  const off=new Set(A.desks_off||[]);const g=el('div','desk-toggles');
  DESKS.meta.forEach(m=>{const l=el('label','switch');const c=el('input');c.type='checkbox';c.dataset.desk=m.id;c.checked=!off.has(m.id);c.onchange=()=>H.preview();l.append(c,`${m.ar} (${(DESKS.desks[m.id]||{items:[]}).items.length})`);g.append(l)});
  s.append(el('b',null,'الأقسام الظاهرة للقرّاء:'),g);
  const ul=el('ul','hide-list');ul.id='desk-hide';const hid=new Set(A.desks_hidden||[]);
  DESKS.meta.forEach(m=>(DESKS.desks[m.id]||{items:[]}).items.forEach(i=>{const li=el('li'),lb=el('label'),cb=el('input');cb.type='checkbox';cb.value=i.id;cb.checked=hid.has(i.id);cb.onchange=()=>H.preview();
    const tx=el('span');tx.append(el('span','z',`${m.ar} · ${i.outlets} جهات: ${i.sources.map(x=>x.name).join('، ')}`),i.title);lb.append(cb,tx);li.append(lb);ul.append(li)}));
  s.append(el('b',null,'إخفاء خبر بعينه:'),ul);return s;
}
function collect(out){
  const off=[...document.querySelectorAll('[data-desk]')].filter(c=>!c.checked).map(c=>c.dataset.desk);if(document.querySelector('[data-desk]'))out.desks_off=off;
  const box=document.querySelectorAll('#desk-hide input');if(box.length){const h=new Set(out.desks_hidden||[]);box.forEach(x=>{if(x.checked)h.add(x.value);else h.delete(x.value)});out.desks_hidden=[...h]}
  if(document.querySelector('[data-country]'))out.countries_off=[...document.querySelectorAll('[data-country]')].filter(c=>!c.checked).map(c=>c.dataset.country);
  const cbox=document.querySelectorAll('#country-hide input');if(cbox.length){const h=new Set(out.countries_hidden||[]);cbox.forEach(x=>{if(x.checked)h.add(x.value);else h.delete(x.value)});out.countries_hidden=[...h]}
  const act=document.querySelectorAll('[data-act]');if(act.length){out.activate=out.activate||{};act.forEach(c=>{out.activate[c.dataset.act]=c.checked});}
}

/* ---------- الأوضاع في الدول ---------- */
function countriesPanel(){
  const A=H.admin();const s=panel('الأوضاع في الدول','صفحة لكل دولة بستة محاور، تُحدَّث آلياً كل 3 ساعات، ولا يُنشر فيها خبر إلا من جهتين مستقلتين. يمكنك إخفاء دولة من القرّاء أو إخفاء خبر بعينه. لإضافة دولة جديدة: أضفها إلى COUNTRIES في scripts/countries.mjs وملفها التحريري في data/countries-editorial.json.');
  if(!CTRY){s.append(el('p','mute','لم يُكتب القسم بعد؛ يظهر بعد أول تشغيل للمحرك الآلي.'));return s}
  const C=CTRY.countries,n=Object.values(C).reduce((a,c)=>a+c.items.length,0),age=(Date.now()-new Date(CTRY.updated))/3600e3;
  const unstable=Object.values(C).filter(c=>c.index&&c.index.level==='unstable').length;
  s.append(kpis([[CTRY.meta.length,'دولة'],[n,'خبراً موثّقاً الآن'],[Object.values(C).reduce((a,c)=>a+(c.protests||[]).length,0),'تظاهرة موثّقة'],[unstable,'دولة مضطربة'],[age.toFixed(1),'ساعة منذ آخر تحديث']]));
  const tb=el('table','cn-admin');tb.style.cssText='width:100%;border-collapse:collapse;font-size:.88rem';const hr=el('tr');['الدولة','المؤشر','المستوى','الاتجاه','الأخبار'].forEach(h=>{const th=el('th',null,h);th.style.cssText='text-align:start;padding:6px;border-bottom:1px solid var(--line,#ddd)';hr.append(th)});tb.append(hr);
  const LVL={stable:'مستقر',strained:'تحت الضغط',unstable:'مضطرب',nodata:'بيانات غير كافية'},TR={up:'↑ يتحسن',down:'↓ يتراجع',flat:'→ ثابت'};
  CTRY.meta.forEach(m=>{const c=C[m.id]||{items:[],index:{}};const tr=el('tr');[`${m.flag} ${m.ar}`,c.index.score==null?'—':String(c.index.score),LVL[c.index.level]||'',TR[c.index.trend]||'',String(c.items.length)].forEach(v=>{const td=el('td',null,v);td.style.cssText='padding:6px;border-bottom:1px solid var(--line,#eee)';tr.append(td)});tb.append(tr)});
  const wrap=el('div');wrap.style.overflowX='auto';wrap.append(tb);s.append(wrap);
  const off=new Set(A.countries_off||[]);const g=el('div','desk-toggles');
  CTRY.meta.forEach(m=>{const l=el('label','switch');const c=el('input');c.type='checkbox';c.dataset.country=m.id;c.checked=!off.has(m.id);c.onchange=()=>H.preview();l.append(c,`${m.ar} (${(C[m.id]||{items:[]}).items.length})`);g.append(l)});
  s.append(el('b',null,'الدول الظاهرة للقرّاء:'),g);
  const ul=el('ul','hide-list');ul.id='country-hide';const hid=new Set(A.countries_hidden||[]);
  CTRY.meta.forEach(m=>(C[m.id]||{items:[]}).items.forEach(i=>{const li=el('li'),lb=el('label'),cb=el('input');cb.type='checkbox';cb.value=i.id;cb.checked=hid.has(i.id);cb.onchange=()=>H.preview();
    const tx=el('span');tx.append(el('span','z',`${m.ar} · ${i.outlets} جهات: ${i.sources.map(x=>x.name).join('، ')}`),i.title);lb.append(cb,tx);li.append(lb);ul.append(li)}));
  s.append(el('b',null,'إخفاء خبر بعينه:'),ul);
  const a=el('a',null,'افتح القسم كما يراه القرّاء');a.href='../#countries';a.target='_blank';a.rel='noopener';s.append(a);return s;
}

/* ---------- صندوق البلاغات والمشتركين والإحصاءات ---------- */
function inboxPanel(){
  const s=panel('بلاغات القرّاء والمشتركون والإحصاءات','بلاغات «بلّغ عن خطأ»، والمشتركون في النشرة، وأكثر الأقسام زيارة في آخر 30 يوماً، ورموز الإحالة. تُحفظ على خادم «عبدو نيوز» في Cloudflare، ولا يُحفظ عنوان أي زائر.');
  const f=el('div','field');f.append(el('label',null,'مفتاح خادم «عبدو نيوز» (يبدأ بـ khb_)'));const k=el('input');k.type='password';k.dir='ltr';k.placeholder='khb_…';k.value=LS.get('khabar-cf-key')||LS.get('khabar-token')&&/^khb_/.test(LS.get('khabar-token'))&&LS.get('khabar-token')||'';f.append(k);s.append(f);
  const btns=el('div','btns');const load=el('button','btn','حمّل الصندوق');load.type='button';const exp=el('button','btn ghost','نزّل قائمة المشتركين (CSV)');exp.type='button';btns.append(load,exp);s.append(btns);
  const m=el('p','msg');m.id='inbox-msg';m.hidden=true;s.append(m);const out=el('div');s.append(out);
  const call=async(body)=>{LS.set('khabar-cf-key',k.value.trim());const r=await fetch((CFG.API||'..')+'/api/inbox',{method:'POST',headers:{Authorization:'Bearer '+k.value.trim(),'content-type':'application/json'},body:JSON.stringify(body||{})});
    const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(r.status===401?'المفتاح غير صحيح.':r.status===404?'خادم Cloudflare لم يُحدَّث بعد بهذه الميزة.':(j.error||'تعذّر الاتصال ('+r.status+').'));return j};
  const draw=j=>{out.textContent='';
    const subs=j.subs.reduce((a,x)=>a+x.n,0),open=j.reports.filter(r=>r.status==='new').length;const views={},dlf={},dls={};let dlt=0;j.hits.forEach(h=>{if(h.view.startsWith('dl-')){dlf[h.view.slice(3)]=(dlf[h.view.slice(3)]||0)+h.n;dlt+=h.n}else if(h.view.startsWith('dls-'))dls[h.view.slice(4)]=(dls[h.view.slice(4)]||0)+h.n;else if(!h.view.startsWith('ref-'))views[h.view]=(views[h.view]||0)+h.n});
    out.append(kpis([[open,'بلاغاً جديداً'],[j.reports.length,'بلاغاً في المجموع'],[subs,'مشتركاً في النشرة'],[Object.values(views).reduce((a,b)=>a+b,0),'زيارة في 30 يوماً']]));
    const top=Object.entries(views).sort((a,b)=>b[1]-a[1]).slice(0,12);if(top.length){out.append(el('b',null,'الأكثر زيارة:'));const ol=el('ol');top.forEach(([v,n])=>ol.append(el('li',null,`${v} · ${n}`)));out.append(ol)}
    // تنزيلات التقارير (assets/report.js): حسب الصيغة وحسب القسم
    {const FN={docx:'Word',pdf:'PDF',xlsx:'Excel',csv:'CSV',png:'صورة',html:'صفحة ويب',print:'طباعة',link:'رابط'};out.append(el('b',null,`تنزيلات التقارير في 30 يوماً: ${dlt}`));
     if(dlt){const ol=el('ol');Object.entries(dlf).sort((a,b)=>b[1]-a[1]).forEach(([f,n])=>ol.append(el('li',null,`${FN[f]||f} · ${n}`)));out.append(ol);
       const top=Object.entries(dls).sort((a,b)=>b[1]-a[1]).slice(0,10);if(top.length){out.append(el('b',null,'أكثر الأقسام تصديراً:'));const o2=el('ol');top.forEach(([v,n])=>o2.append(el('li',null,`${v} · ${n}`)));out.append(o2)}}
     else out.append(el('p','mute','لم يُنزَّل أي تقرير بعد.'))}
    if(j.refs.length){out.append(el('b',null,'الإحالات:'));const ol=el('ol');j.refs.forEach(r=>ol.append(el('li',null,`${r.code} · ${r.n} اشتراكاً`)));out.append(ol)}
    out.append(el('b',null,'البلاغات:'));const ul=el('ul','hide-list');
    j.reports.forEach(r=>{const li=el('li');const d=el('div');d.style.cssText='display:grid;gap:4px;padding:8px 10px;border:1px solid var(--line);border-radius:10px';
      d.append(el('span','z',`${fmt(r.at)} · ${r.kind} · ${r.item} · ${r.status==='new'?'جديد':r.status==='done'?'صُحّح':'رُفض'}`),el('span',null,r.body));if(r.email)d.append(el('small',null,r.email));
      const a=el('a',null,'الصفحة');a.href=r.page;a.target='_blank';a.rel='noopener';d.append(a);
      const row=el('div','btns');[['done','صُحّح'],['rejected','لا خطأ']].forEach(([st,t])=>{const b=el('button','btn ghost',t);b.type='button';b.onclick=async()=>{try{draw(await call({report:r.id,status:st}))}catch(e){say('#inbox-msg',e.message,false)}};row.append(b)});d.append(row);li.append(d);ul.append(li)});
    if(!j.reports.length)ul.append(el('li','mute','لا بلاغات.'));out.append(ul)};
  load.onclick=async()=>{try{draw(await call());m.hidden=true}catch(e){say('#inbox-msg',e.message,false)}};
  exp.onclick=async()=>{try{const j=await call({export_subs:true});const csv='email_or_whatsapp,channel,lang,editions,at\n'+(j.list||[]).map(x=>[x.email,x.channel,x.lang,x.editions,x.at].join(',')).join('\n');
    const u=URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv'})),a=document.createElement('a');a.href=u;a.download='khabar-subscribers.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),3000)}catch(e){say('#inbox-msg',e.message,false)}};
  return s;
}

/* ---------- التصحيحات ---------- */
function corrPanel(){
  const s=panel('سجل التصحيحات','كل تصحيح يُنشر علناً في صفحة «سجل التصحيحات» بالتاريخ والسبب، مع الصيغة الأصلية والمصحّحة.');
  const fld=(id,label,ta,ph)=>{const f=el('div','field');f.append(el('label',null,label));const i=el(ta?'textarea':'input');i.id=id;if(ta)i.rows=3;if(ph)i.placeholder=ph;f.append(i);return f};
  s.append(fld('c-brief','معرّف الخلاصة (اختياري)',false,'2026-11-17-pm'),fld('c-before','الصيغة الأصلية',true),fld('c-after','الصيغة بعد التصحيح',true),fld('c-reason','سبب التصحيح',false,'مثال: رقم خاطئ في المصدر الثاني'),fld('c-src','روابط المصادر الصحيحة (رابط في كل سطر)',true,'https://…'));
  const b=el('button','btn','انشر التصحيح');b.type='button';const m=el('p','msg');m.id='corr-msg';m.hidden=true;s.append(b,m);
  b.onclick=async()=>{const v=id=>$('#'+id).value.trim();if(!v('c-before')||!v('c-after')||!v('c-reason')){say('#corr-msg','اكتب الصيغتين وسبب التصحيح.',false);return}
    const src=v('c-src').split(/\s+/).filter(u=>/^https:\/\//.test(u)).map(u=>({name:(()=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch(e){return u}})(),url:u,date:new Date().toISOString().slice(0,10)}));
    const db=JSON.parse(JSON.stringify(CORR||{items:[]}));db.items.unshift({date:new Date().toISOString().slice(0,10),brief:v('c-brief')||null,before:v('c-before'),after:v('c-after'),reason:v('c-reason'),sources:src});db.updated=new Date().toISOString();
    try{say('#corr-msg','جارٍ النشر…',true);await H.save('data/corrections.json',db,'عبدو نيوز: تصحيح منشور');CORR=db;say('#corr-msg','نُشر التصحيح في سجل التصحيحات.',true);['c-before','c-after','c-reason','c-src','c-brief'].forEach(i=>$('#'+i).value='')}catch(e){say('#corr-msg',e.message,false)}};
  return s;
}

/* ---------- مقالات الرأي ---------- */
function opinionPanel(){
  const s=panel('مقالات الرأي والتحليل','للكتّاب بأسمائهم الحقيقية وبموافقتهم. يُعلَّم كل مقال بأنه رأي يعبّر عن كاتبه، وكل معلومة فيه تُنسب إلى مصدرها. لا يُنشر مقال باسم شخص دون موافقته المكتوبة.');
  const list=el('ul','hide-list');const draw=()=>{list.textContent='';(OPN.articles||[]).forEach((a,i)=>{const li=el('li');const d=el('div');d.style.cssText='display:flex;gap:10px;justify-content:space-between;align-items:center;padding:6px 10px;border:1px solid var(--line);border-radius:10px';
    const au=(OPN.authors||[]).find(x=>x.id===a.author)||{};d.append(el('span',null,`${a.date} · ${au.name||a.author} · ${a.title}`));const x=el('button','btn ghost','حذف');x.type='button';x.onclick=async()=>{OPN.articles.splice(i,1);await save('حذف مقال رأي');draw()};d.append(x);li.append(d);list.append(li)});
    if(!(OPN.articles||[]).length)list.append(el('li','mute','لا مقالات منشورة بعد.'))};
  const fld=(id,label,ta,ph)=>{const f=el('div','field');f.append(el('label',null,label));const i=el(ta?'textarea':'input');i.id=id;if(ta)i.rows=ta;if(ph)i.placeholder=ph;f.append(i);return f};
  const authSel=el('select');authSel.id='o-author';const fillA=()=>{authSel.textContent='';(OPN.authors||[]).forEach(a=>{const o=el('option',null,a.name);o.value=a.id;authSel.append(o)});const o=el('option',null,'+ كاتب جديد');o.value='__new';authSel.append(o)};fillA();
  const fa=el('div','field');fa.append(el('label',null,'الكاتب'),authSel);
  s.append(list,el('b',null,'مقال جديد:'),fa,fld('o-name','اسم الكاتب الجديد (إن اخترت كاتباً جديداً)'),fld('o-bio','صفته ونبذة قصيرة'),fld('o-title','عنوان المقال'),fld('o-body','نص المقال',8),fld('o-src','روابط مصادر المعلومات الواردة (رابط في كل سطر)',3,'https://…'));
  const consent=el('label','switch');const cc=el('input');cc.type='checkbox';cc.id='o-consent';consent.append(cc,'لديّ موافقة الكاتب المكتوبة على النشر باسمه');s.append(consent);
  const b=el('button','btn','انشر المقال');b.type='button';const m=el('p','msg');m.id='op-msg';m.hidden=true;s.append(b,m);
  const save=async msg=>{OPN.updated=new Date().toISOString();await H.save('data/opinion.json',OPN,'عبدو نيوز: '+msg)};
  b.onclick=async()=>{const v=id=>$('#'+id).value.trim();if(!$('#o-consent').checked){say('#op-msg','لا يُنشر مقال باسم كاتب دون موافقته المكتوبة.',false);return}
    if(!v('o-title')||v('o-body').length<200){say('#op-msg','اكتب العنوان ونصاً لا يقل عن 200 حرف.',false);return}
    let au=authSel.value;if(au==='__new'){if(!v('o-name')){say('#op-msg','اكتب اسم الكاتب.',false);return}au='a'+Date.now().toString(36);OPN.authors=OPN.authors||[];OPN.authors.push({id:au,name:v('o-name'),bio:v('o-bio')})}
    const src=v('o-src').split(/\s+/).filter(u=>/^https:\/\//.test(u));OPN.articles=OPN.articles||[];OPN.articles.unshift({id:'op'+Date.now().toString(36),author:au,date:new Date().toISOString().slice(0,10),title:v('o-title'),body:v('o-body'),sources:src,lang:/[؀-ۿ]/.test(v('o-title'))?'ar':'en'});
    try{say('#op-msg','جارٍ النشر…',true);await save('مقال رأي جديد');fillA();draw();say('#op-msg','نُشر المقال في قسم «رأي وتحليل».',true);['o-title','o-body','o-src','o-name','o-bio'].forEach(i=>$('#'+i).value='');$('#o-consent').checked=false}catch(e){say('#op-msg',e.message,false)}};
  draw();return s;
}

/* ---------- جاهز للتفعيل ---------- */
function activatePanel(){
  const A=H.admin().activate||{};const s=panel('جاهز للتفعيل','خطوات مبنية ومعطّلة تنتظر قرارك، لأنها تحتاج حساباتك أو ميزانية. لا تُفعّل أي خطوة قبل تجهيز ما يلزمها؛ التفعيل يظهر للقرّاء بعد «نشر التعديلات».');
  ACT.forEach(([id,t,need])=>{const d=el('div');d.style.cssText='display:grid;gap:2px;border:1px solid var(--line);border-radius:10px;padding:8px 10px';const l=el('label','switch');const c=el('input');c.type='checkbox';c.dataset.act=id;c.checked=!!A[id];c.onchange=()=>H.preview();l.append(c,t);d.append(l,el('small','mute','يلزم: '+need));s.append(d)});
  const a=el('a',null,'الدليل الكامل: ملف «جاهز للتفعيل» في مجلد المشروع');a.href='../partners/#activate';a.target='_blank';s.append(a);return s;
}

window.KAX={init,collect};
})();
