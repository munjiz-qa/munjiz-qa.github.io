'use strict';
// «اليوم»: the first page after sign-in. One list of what needs action now (new requests, client messages, overdue work,
// payments to collect, missing documents, renewals), each with the next step and a ready message, plus «المساعد»:
// a daily briefing and a box that answers questions and finds clients from the data the panel already loaded.
// Nothing leaves the browser and no server action is added; saves go through the same saveRow/openTx/openPay as the rest.
// Uses helpers from crm.js ($, esc, fmt, L, EN, DB, VIEWS, ME, LKEY, CLOSED, days, iso, now, money, balance, cli, link, staffName,
// staffOptions, workItems, isLate, saveRow, newTx, SVC, openTx, openPay, openTask, openCli, go, can, isAdmin, unreadBy, toast, errText, renderAll).
(function(){
const V=$('v-today');if(!V)return;
const BRAND=(document.title.split('|')[1]||'').trim()||L('المكتب','the office');
const SKEY=LKEY.split('_')[0]+'_today_snooze';
const ME_=()=>ME||{};
const trS=v=>window.CRM_I18N&&EN?CRM_I18N.tr(v):v;   // fixed status words in English mode
let filter='all',showSnoozed=false,items=[],byKey={};

// ---------- small helpers ----------
const ago=s=>{const d=days(String(s||'').slice(0,10));return d===null?null:-d};
const agoTxt=n=>n===null?'':n<=0?L('اليوم','today'):n===1?L('منذ أمس','since yesterday'):n===2?L('منذ يومين','2 days ago'):L(`منذ ${n} أيام`,`${n} days ago`);
const first=n=>String(n||'').trim().split(/\s+/)[0]||'';
const phoneOf=(clientId,alt)=>String((cli(clientId).phone)||alt||'').replace(/\D/g,'');
const waUrl=(ph,text)=>{ph=String(ph||'').replace(/\D/g,'');if(!ph)return '';if(ph.length===8)ph='974'+ph;return 'https://wa.me/'+ph+'?text='+encodeURIComponent(text)};
const ORG=/شركة|مؤسسة|مطعم|مكتب|مصنع|محل|مجموعة|مركز|معرض|company|co\.|llc|w\.l\.l|group|restaurant|trading|est\./i;
// greeting: companies by full name, people by first name
const hi=name=>{name=String(name||'').trim();if(!name)return L('السلام عليكم،','Dear client,');
  return ORG.test(name)?L(`السادة ${name} المحترمين،\nتحية طيبة وبعد،`,`Dear ${name} team,`):L(`السلام عليكم أ. ${first(name)}،`,`Dear ${first(name)},`)};
const sign=()=>L(`\n\nمع خالص التحية،\n${BRAND}`,`\n\nKind regards,\n${BRAND}`);
function snoozes(){try{return JSON.parse(localStorage.getItem(SKEY))||{}}catch(e){return {}}}
function snooze(key){const s=snoozes(),t=new Date();t.setDate(t.getDate()+1);const p=n=>String(n).padStart(2,'0');
  s[key]=`${t.getFullYear()}-${p(t.getMonth()+1)}-${p(t.getDate())}`;Object.keys(s).forEach(k=>{if(s[k]<=iso())delete s[k]});try{localStorage.setItem(SKEY,JSON.stringify(s))}catch(e){}}
const snoozed=key=>{const u=snoozes()[key];return !!u&&u>iso()};
const missingDocs=t=>{let d=[];try{d=Array.isArray(t.docs)?t.docs:JSON.parse(t.docs||'[]')}catch(e){}return d.filter(x=>x&&!x.ok).map(x=>x.t)};
const mineOrAll=a=>isAdmin()||can('assign')||a===ME_().username;

// ---------- ready messages (WhatsApp / reply) ----------
const DRAFT={
  welcome:r=>hi(r.name)+L(`\nشكراً لتواصلكم مع ${BRAND}. استلمنا طلبكم رقم ${r.id} بخصوص:\n${String(r.services||'').trim()}\n\nسنؤكد لكم المستندات المطلوبة والرسوم ومدة الإنجاز. هل يناسبكم أن نتصل بكم اليوم؟`,
    `\nThank you for contacting ${BRAND}. We have received your request ${r.id} for:\n${String(r.services||'').trim()}\n\nWe will confirm the documents, fees and timeline. Is a call today convenient for you?`)+sign(),
  docs:(t,c)=>{const m=missingDocs(t);return hi(c.name)+L(`\nلاستكمال معاملة «${t.service}» (${t.id}) نحتاج منكم:\n${m.map(x=>'• '+x).join('\n')||'• المستندات المتبقية'}\n\nيمكنكم رفعها من حسابكم على موقعنا أو إرسالها هنا.`,
    `\nTo complete «${t.service}» (${t.id}) we still need:\n${m.map(x=>'• '+x).join('\n')||'• the remaining documents'}\n\nYou can upload them from your account on our website or send them here.`)+sign()},
  pay:(t,c)=>hi(c.name)+L(`\nنشكر ثقتكم. نود تذكيركم بلطف بأن المتبقي على معاملة «${t.service}» (${t.id}) هو ${money(balance(t))}.\nيسعدنا تزويدكم بكشف الحساب أو سند القبض عند السداد.`,
    `\nThank you for your trust. A gentle reminder that the balance on «${t.service}» (${t.id}) is ${money(balance(t))}.\nWe are happy to send the statement or the receipt once paid.`)+sign(),
  late:(t,c)=>hi(c.name)+L(`\nنطمئنكم بأن معاملة «${t.service}» (${t.id}) قيد المتابعة، وحالتها الآن: ${t.status}. نعمل على إنجازها في أقرب وقت وسنوافيكم بالمستجد فور صدوره.`,
    `\nWe would like to update you that «${t.service}» (${t.id}) is in progress; its status now: ${trS(t.status)}. We are working to finish it as soon as possible and will update you right away.`)+sign(),
  waiting:(t,c)=>hi(c.name)+L(`\nمعاملة «${t.service}» (${t.id}) بانتظار ما يلزم من طرفكم لنكمل الإجراء. يسعدنا التواصل معكم في الوقت المناسب لكم.`,
    `\n«${t.service}» (${t.id}) is waiting for an action from your side so we can continue. We are happy to call you at a convenient time.`)+sign(),
  renew:(t,c)=>hi(c.name)+L(`\nنود تنبيهكم إلى أن «${t.service}» ينتهي بتاريخ ${t.expiryDate}. هل ترغبون أن نبدأ إجراءات التجديد الآن لتجنب أي غرامة أو توقف؟`,
    `\nPlease note that «${t.service}» expires on ${t.expiryDate}. Would you like us to start the renewal now to avoid any fine or interruption?`)+sign(),
  plan:c=>hi(c.name)+L(`\nينتهي اشتراككم في باقة «${c.plan}» بتاريخ ${c.planEnd}. يسعدنا تجديده لتستمر متابعة معاملاتكم دون انقطاع.`,
    `\nYour «${c.plan}» package ends on ${c.planEnd}. We are happy to renew it so your transactions continue without interruption.`)+sign(),
  reply:c=>hi(c.name)+L(`\nشكراً لرسالتكم، اطلعنا عليها وسنعود إليكم بالرد خلال يوم عمل واحد.`,`\nThank you for your message. We have read it and will reply within one working day.`)+sign()
};

// ---------- what needs action ----------
function collect(){const out=[],me=ME_().username,W=workItems();
  const add=o=>{o.score=(o.base||0)+Math.min(Math.max(o.age||0,0),10)*.3;out.push(o)};
  if(can('messages'))unreadBy().forEach(([id,n,last])=>{const c=cli(id);add({key:'msg:'+id,kind:'msg',base:10,age:ago(last.created),clientId:id,
    title:L(`${n} رسالة من العميل تنتظر الرد`,`${n} client message(s) waiting for a reply`),sub:String(last.body||'').slice(0,140),
    next:L('اقرأ الرسالة وردّ عليها؛ الرد يظهر في حساب العميل ويصله بالبريد.','Read and reply; the reply shows in the client account and goes by email.'),
    acts:[['reply',L('ردّ الآن','Reply now'),1],['wa',L('واتساب','WhatsApp')]],draft:()=>DRAFT.reply(c),phone:phoneOf(id)})});
  if(can('requests'))DB.Requests.filter(r=>r.status==='جديد'||r.status==='تم التواصل').filter(r=>isAdmin()||can('assign')||!r.assignee||r.assignee===me).forEach(r=>{const isNew=r.status==='جديد',a=ago(r.created);
    if(!isNew&&(a===null||a<2))return;
    add({key:'req:'+r.id,kind:'req',base:isNew?9:5,age:a,clientId:r.clientId,ref:r.id,row:r,
      title:isNew?L('طلب جديد من الموقع','New website request'):L('طلب تم التواصل معه ولم يتحول إلى معاملة','Contacted request not converted yet'),name:r.name,sub:String(r.services||'').split('\n').slice(0,3).join(' · '),
      next:isNew?L('اتصل بالعميل أو أرسل له رسالة الترحيب، ثم اضغط «تم التواصل». عند الاتفاق حوّله إلى معاملة.','Call the client or send the welcome message, then press «Contacted». When agreed, convert it to a transaction.')
        :L('تابع مع العميل: هل وافق على العرض؟ حوّله إلى معاملة أو أغلقه.','Follow up: did the client accept? Convert it or close it.'),
      acts:[...(isNew?[['contacted',L('تم التواصل','Contacted')]]:[]),['convert',L('تحويل إلى معاملة','Convert to transaction'),!isNew],['wa',L('واتساب','WhatsApp'),isNew],['closeReq',L('إغلاق','Close')]],
      assign:can('assign')?r.assignee||'':null,draft:()=>DRAFT.welcome(r),phone:phoneOf(r.clientId,r.phone)})});
  W.filter(w=>!w.closed&&w.k!=='Requests'&&w.due&&mineOrAll(w.assignee)).forEach(w=>{const d=days(w.due);if(d===null||d>0)return;const t=w.row,c=cli(w.clientId),late=d<0;
    add({key:(late?'late:':'due:')+w.id,kind:late?'late':'due',base:late?9:7,age:late?-d:0,clientId:w.clientId,ref:w.id,w,
      title:(late?L(`متأخرة ${-d} يوم`,`Overdue by ${-d} days`):L('موعدها اليوم','Due today'))+' · '+w.title,sub:L('الحالة: ','Status: ')+trS(w.status)+(w.assignee?' · '+L('المسؤول: ','Assigned: ')+staffName(w.assignee):''),
      next:w.k==='Transactions'?L('حدّث الحالة أو غيّر الموعد، وطمئن العميل برسالة قصيرة.','Update the status or the due date, and reassure the client with a short message.'):L('أنجز المهمة أو حدّث نسبة الإنجاز والموعد.','Finish the task or update its progress and due date.'),
      acts:[[w.k==='Transactions'?'openTx':'openTask',L('فتح وتحديث','Open and update'),1],...(w.k==='Transactions'&&c.id?[['wa',L('رسالة طمأنة','Reassure client')]]:[])],
      draft:w.k==='Transactions'?()=>DRAFT.late(t,c):null,phone:phoneOf(w.clientId)})});
  DB.Transactions.filter(t=>!CLOSED.includes(t.status)&&mineOrAll(t.assignee||'')).forEach(t=>{const c=cli(t.clientId),a=ago(t.updated||t.created);if(a===null||a<3)return;
    if(t.status==='بانتظار المستندات'){const m=missingDocs(t);add({key:'docs:'+t.id,kind:'docs',base:5,age:a,clientId:t.clientId,ref:t.id,
      title:L('بانتظار مستندات العميل','Waiting for client documents')+' · '+t.service,sub:m.length?L('الناقص: ','Missing: ')+m.slice(0,4).join('، '):L('راجع قائمة المستندات','Check the document list'),
      next:L('أرسل للعميل قائمة المستندات الناقصة واطلب رفعها من حسابه.','Send the client the missing documents and ask them to upload from their account.'),
      acts:[['wa',L('طلب المستندات','Request documents'),1],['openTx',L('فتح','Open')]],draft:()=>DRAFT.docs(t,c),phone:phoneOf(t.clientId)})}
    else if(t.status==='بانتظار العميل')add({key:'wait:'+t.id,kind:'docs',base:4,age:a,clientId:t.clientId,ref:t.id,
      title:L('بانتظار رد العميل','Waiting for the client')+' · '+t.service,sub:L('آخر تحديث ','Last update ')+agoTxt(a),
      next:L('ذكّر العميل بما يلزم من طرفه.','Remind the client what is needed from them.'),acts:[['wa',L('تذكير العميل','Remind client'),1],['openTx',L('فتح','Open')]],draft:()=>DRAFT.waiting(t,c),phone:phoneOf(t.clientId)})});
  if(can('finance'))DB.Transactions.filter(t=>t.status==='منجزة'&&balance(t)>0).forEach(t=>{const c=cli(t.clientId),a=ago(t.closed||t.updated);
    add({key:'pay:'+t.id,kind:'pay',base:6,age:a,clientId:t.clientId,ref:t.id,amount:balance(t),
      title:L('مستحق التحصيل','To collect')+' · '+money(balance(t)),sub:t.service+' · '+L('أُنجزت ','done ')+agoTxt(a),
      next:L('أرسل تذكيراً لطيفاً بالدفع، وعند الاستلام سجّل الدفعة ليصدر سند القبض.','Send a polite reminder; when paid, record the payment to issue the receipt.'),
      acts:[['pay',L('تسجيل دفعة','Record payment'),1],['wa',L('تذكير بالدفع','Payment reminder')]],draft:()=>DRAFT.pay(t,c),phone:phoneOf(t.clientId)})});
  DB.Transactions.filter(t=>{const d=days(t.expiryDate);return d!==null&&d>=0&&d<=14&&mineOrAll(t.assignee||'')}).forEach(t=>{const c=cli(t.clientId),d=days(t.expiryDate);
    add({key:'renew:'+t.id,kind:'renew',base:d<=3?7:5,age:0,clientId:t.clientId,ref:t.id,title:L(`ينتهي خلال ${d} يوم`,`Expires in ${d} days`)+' · '+t.service,sub:L('تاريخ الانتهاء ','Expiry ')+t.expiryDate,
      next:L('اعرض على العميل التجديد الآن؛ هذه معاملة جديدة وإيراد إضافي.','Offer the renewal now; it is a new transaction and extra revenue.'),
      acts:[['wa',L('عرض التجديد','Offer renewal'),1],['renewTx',L('فتح معاملة تجديد','Open renewal')]],draft:()=>DRAFT.renew(t,c),phone:phoneOf(t.clientId)})});
  (can('assign')?DB.Clients:[]).filter(c=>{const d=days(c.planEnd);return c.plan&&d!==null&&d>=0&&d<=14}).forEach(c=>{const d=days(c.planEnd);
    add({key:'plan:'+c.id,kind:'renew',base:5,age:0,clientId:c.id,title:L(`اشتراك الباقة ينتهي خلال ${d} يوم`,`Package ends in ${d} days`),sub:c.plan+' · '+c.planEnd,
      next:L('تواصل لتجديد الباقة قبل انتهائها.','Contact the client to renew before it ends.'),acts:[['wa',L('تجديد الباقة','Renew package'),1],['openCli',L('ملف العميل','Client file')]],draft:()=>DRAFT.plan(c),phone:phoneOf(c.id)})});
  if(can('accounts')||isAdmin())DB.Accounts.filter(a=>a.status==='بانتظار التفعيل').forEach(a=>add({key:'acc:'+a.id,kind:'msg',base:4,age:ago(a.created),clientId:a.clientId,
    title:L('حساب عميل ينتظر التفعيل','Client account waiting for activation'),sub:a.username||'',next:L('اتصل بالعميل للتأكد من هويته، ثم فعّل الحساب من ملفه.','Call the client to confirm, then activate the account from the file.'),acts:[['openCli',L('فتح الملف','Open file'),1]]}));
  // unassigned work: the employee picker goes on the card that already shows it, otherwise on its own card
  if(can('assign'))W.filter(w=>!w.closed&&!w.assignee&&w.k!=='Requests').forEach(w=>{const on=out.find(o=>o.ref===w.id&&o.kind!=='req');if(on){on.assign='';on.w=on.w||w;return}add({key:'asg:'+w.id,kind:'asg',base:3,age:ago(w.row.created),clientId:w.clientId,ref:w.id,w,
    title:L('عمل بلا موظف مسؤول','Work with no one assigned')+' · '+w.title,sub:L('الحالة: ','Status: ')+trS(w.status),next:L('اختر الموظف المسؤول ليظهر في «مهامي» لديه.','Choose the employee so it appears in their «My tasks».'),acts:[],assign:''})});
  return out.sort((a,b)=>b.score-a.score)}

const KINDS=[['all',L('الكل','All')],['msg',L('رسائل وحسابات','Messages')],['req',L('طلبات','Requests')],['late',L('متأخر واليوم','Overdue & today')],['pay',L('تحصيل','To collect')],['docs',L('مستندات وانتظار','Documents')],['renew',L('تجديدات','Renewals')],['asg',L('بلا مسؤول','Unassigned')]];
const KLBL={msg:L('رسالة','Message'),req:L('طلب','Request'),late:L('متأخر','Overdue'),due:L('اليوم','Today'),pay:L('تحصيل','Collect'),docs:L('متابعة','Follow-up'),renew:L('تجديد','Renewal'),asg:L('تكليف','Assign')};
const inKind=(it,k)=>k==='all'||it.kind===k||(k==='late'&&it.kind==='due');

// ---------- briefing ----------
function briefing(list){const n=ME_().name||ME_().username||'',h=new Date().getHours(),open=list.filter(x=>!snoozed(x.key));
  const cnt=k=>open.filter(x=>inKind(x,k)).length,parts=[];
  const greet=(h<12?L('صباح الخير','Good morning'):L('مساء الخير','Good evening'))+(n?L('، ',', ')+first(n):'')+'.';
  if(!open.length)return {greet,line:L('لا يوجد ما يحتاج إجراءك الآن. يومك مرتب ✓','Nothing needs your action now. You are all caught up ✓'),top:[]};
  [['req',L('طلب جديد','new request(s)')],['msg',L('رسالة أو حساب ينتظر','message(s)/account(s) waiting')],['late',L('عمل متأخر أو موعده اليوم','overdue or due-today item(s)')],['pay',L('مبلغ للتحصيل','amount(s) to collect')],['docs',L('متابعة مع عميل','client follow-up(s)')],['renew',L('تجديد قريب','upcoming renewal(s)')],['asg',L('عمل بلا مسؤول','unassigned item(s)')]]
    .forEach(([k,t])=>{const c=cnt(k);if(c)parts.push(`<b class="num">${c}</b> ${t}`)});
  let money_='';if(can('finance')){const due=open.filter(x=>x.kind==='pay').reduce((a,x)=>a+x.amount,0);if(due)money_=L(` إجمالي المطلوب تحصيله ${money(due)}.`,` Total to collect: ${money(due)}.`)}
  return {greet,line:L('لديك اليوم: ','Today you have: ')+parts.join(L('، ',', '))+'.'+money_,top:open.slice(0,3)}}

// ---------- render ----------
function render(){if(!ME)return;items=collect();byKey=Object.fromEntries(items.map(x=>[x.key,x]));
  const vis=items.filter(x=>showSnoozed||!snoozed(x.key)),nSn=items.length-items.filter(x=>!snoozed(x.key)).length,b=briefing(items);
  const d=new Date(),date=d.toLocaleDateString(EN?'en-GB':'ar-QA-u-nu-latn',{weekday:'long',year:'numeric',month:'2-digit',day:'2-digit'});
  const counts=Object.fromEntries(KINDS.map(([k])=>[k,vis.filter(x=>inKind(x,k)).length]));
  const list=vis.filter(x=>inKind(x,filter));
  V.innerHTML=`<div class="td-head"><div><h2>${esc(b.greet)}</h2><p class="mute sm">${esc(date)}</p></div><span class="sp"></span>
    <div class="td-quick">${can('clients_edit')?`<button class="btn sm ghost" type="button" data-q="cli">+ ${L('عميل','Client')}</button>`:''}${can('transactions')?`<button class="btn sm ghost" type="button" data-q="tx">+ ${L('معاملة','Transaction')}</button>`:''}${can('assign')?`<button class="btn sm ghost" type="button" data-q="task">+ ${L('مهمة','Task')}</button>`:''}${can('finance')?`<button class="btn sm ghost" type="button" data-q="pay">+ ${L('دفعة','Payment')}</button>`:''}</div></div>
  <div class="td-grid"><div class="td-main">
    <div class="td-filters" role="tablist" aria-label="${L('تصفية','Filter')}">${KINDS.filter(([k])=>k==='all'||counts[k]).map(([k,t])=>`<button type="button" role="tab" data-tf="${k}" aria-selected="${k===filter}">${t} <span class="num">${counts[k]}</span></button>`).join('')}</div>
    <div class="td-list">${list.length?list.map(card).join(''):`<div class="empty td-empty">${filter==='all'?L('لا يوجد ما يحتاج إجراءك الآن. يومك مرتب ✓','Nothing needs your action now ✓'):L('لا يوجد في هذا التصنيف.','Nothing in this group.')}</div>`}</div>
    ${nSn?`<button class="btn xs ghost" type="button" data-snz-toggle>${showSnoozed?L('إخفاء المؤجّلة','Hide snoozed'):L(`إظهار المؤجّلة (${nSn})`,`Show snoozed (${nSn})`)}</button>`:''}
  </div>
  <aside class="td-side panel" aria-label="${L('المساعد','Assistant')}">
    <h3><span aria-hidden="true">✦</span> ${L('المساعد','Assistant')}</h3>
    <p class="td-brief">${b.line}</p>
    ${b.top.length?`<p class="sm"><b>${L('أقترح أن تبدأ بـ:','I suggest you start with:')}</b></p><ol class="td-top">${b.top.map(x=>`<li><a href="#" data-goto="${esc(x.key)}">${esc(x.title)}</a>${x.clientId&&cli(x.clientId).name?` · <small>${esc(cli(x.clientId).name)}</small>`:x.name?` · <small>${esc(x.name)}</small>`:''}</li>`).join('')}</ol>`:''}
    <form class="td-ask" id="tdAsk"><label class="sr" for="tdQ">${L('اسأل المساعد أو ابحث','Ask the assistant or search')}</label>
      <input id="tdQ" type="search" autocomplete="off" placeholder="${L('اسأل أو ابحث: اسم عميل، جوال، R-0001…','Ask or search: client, phone, R-0001…')}"><button class="btn sm pri" type="submit">${L('اسأل','Ask')}</button></form>
    <div class="td-chips">${[['summary',L('ملخص اليوم','Today summary')],...(can('finance')?[['money',L('من عليه مستحقات؟','Who owes us?')],['month',L('دخل هذا الشهر','This month income')]]:[]),['late',L('ما المتأخر؟','What is overdue?')],...(can('assign')?[['team',L('ضغط العمل على الفريق','Team workload')]]:[]),['help',L('ماذا تستطيع؟','What can you do?')]].map(([k,t])=>`<button type="button" class="chip" data-ask="${k}">${t}</button>`).join('')}</div>
    <div class="td-ans" id="tdAns" aria-live="polite"></div>
  </aside></div>`;
  setCount(vis.filter(x=>!snoozed(x.key)).length)}
function card(x){const c=cli(x.clientId),name=c.name||x.name||'';
  return `<article class="td-card k-${x.kind} ${snoozed(x.key)?'snz':''}" id="td-${esc(x.key.replace(/[^\w-]/g,'_'))}" data-key="${esc(x.key)}">
    <div class="td-top1"><span class="k td-k">${KLBL[x.kind]}</span><b>${esc(x.title)}</b><span class="sp"></span><small class="mute num">${esc([x.ref,x.age!=null&&x.age>0?agoTxt(x.age):''].filter(Boolean).join(' · '))}</small></div>
    ${name||x.sub?`<div class="td-meta">${x.clientId&&c.id?link(c.id,name):esc(name)}${x.sub?(name?' · ':'')+`<span class="mute">${esc(x.sub)}</span>`:''}</div>`:''}
    <div class="td-next"><span aria-hidden="true">✦</span> ${esc(x.next)}</div>
    <div class="acts">${x.acts.map(([a,t,p])=>(a==='wa'&&!x.phone)?'':`<button type="button" class="btn xs ${p?'pri':'ghost'}" data-act="${a}">${a==='wa'?'<span aria-hidden="true">✆</span> ':''}${esc(t)}</button>`).join('')}
      ${x.draft?`<button type="button" class="btn xs ghost" data-act="draft">${L('نص الرسالة','Message text')}</button>`:''}
      ${x.assign!=null?`<label class="td-asg"><span class="sr">${L('الموظف المسؤول','Assigned to')}</span><select data-asg>${staffOptions(x.assign)}</select></label>`:''}
      <button type="button" class="btn xs ghost" data-act="snooze" title="${L('أخفِه حتى الغد','Hide until tomorrow')}">${snoozed(x.key)?L('مؤجّل','Snoozed'):L('لاحقاً','Later')}</button></div>
    <div class="td-draft" hidden></div></article>`}
function setCount(n){const el=$('nToday');if(el)el.textContent=n||''}
window.todayCount=()=>{if(!ME)return;try{setCount(collect().filter(x=>!snoozed(x.key)).length)}catch(e){}};

// ---------- actions ----------
async function convert(r){const codes=String(r.codes||'').split(/\s+/).filter(x=>SVC[x]);
  if(!codes.length){openTx({clientId:r.clientId,status:'بانتظار المستندات',startDate:iso(),notes:r.services});return}
  if(!await ask(L(`تحويل الطلب ${r.id} إلى ${codes.length} معاملة؟`,`Convert request ${r.id} into ${codes.length} transaction(s)?`),{ok:L('تحويل','Convert')}))return;
  for(const code of codes)await saveRow('Transactions',Object.assign(newTx(r.clientId,code,r.services),r.assignee?{assignee:r.assignee}:{}));
  r.status='تحوّل إلى معاملة';await saveRow('Requests',r);await saveRow('Log',{clientId:r.clientId,kind:'status',subject:`تحويل الطلب ${r.id} إلى ${codes.length} معاملة`,by:'CRM'});
  toast(L(`أُنشئت ${codes.length} معاملة`,`${codes.length} transaction(s) created`));renderAll()}
V.addEventListener('click',async e=>{
  const f=e.target.closest('[data-tf]');if(f){filter=f.dataset.tf;render();return}
  if(e.target.closest('[data-snz-toggle]')){showSnoozed=!showSnoozed;render();return}
  const q=e.target.closest('[data-q]');if(q){const k=q.dataset.q;if(k==='cli')openCli({});else if(k==='tx')openTx({status:'بانتظار المستندات',startDate:iso()});else if(k==='task')openTask({status:'جديدة',progress:0,due:iso(),clientId:''});else if(k==='pay')openPay('');return}
  const g=e.target.closest('[data-goto]');if(g){e.preventDefault();filter='all';showSnoozed=true;render();const el=V.querySelector(`[data-key="${CSS.escape(g.dataset.goto)}"]`);if(el){el.scrollIntoView({behavior:'smooth',block:'center'});el.classList.add('flash');setTimeout(()=>el.classList.remove('flash'),1600)}return}
  const ch=e.target.closest('[data-ask]');if(ch){answer(ch.dataset.ask,true);return}
  const b=e.target.closest('[data-act]');if(!b)return;const cardEl=b.closest('[data-key]'),x=byKey[cardEl.dataset.key];if(!x)return;const a=b.dataset.act;
  try{
    if(a==='wa'){const u=waUrl(x.phone,x.draft?x.draft():'');if(u)window.open(u,'_blank','noopener')}
    else if(a==='draft'){const box=cardEl.querySelector('.td-draft');if(!box.hidden){box.hidden=true;return}
      box.innerHTML=`<textarea rows="7" aria-label="${L('نص الرسالة','Message text')}">${esc(x.draft())}</textarea><div class="acts"><button type="button" class="btn xs pri" data-act="copy">${L('نسخ','Copy')}</button>${x.phone?`<button type="button" class="btn xs ghost" data-act="waEdit">${L('إرسال المعدّل بواتساب','Send edited by WhatsApp')}</button>`:''}</div>`;box.hidden=false}
    else if(a==='copy'){const t=cardEl.querySelector('.td-draft textarea');try{await navigator.clipboard.writeText(t.value)}catch(err){t.select();document.execCommand('copy')}toast(L('نُسخ النص','Text copied'))}
    else if(a==='waEdit'){const t=cardEl.querySelector('.td-draft textarea');window.open(waUrl(x.phone,t.value),'_blank','noopener')}
    else if(a==='reply'){go('client',x.clientId);setTimeout(()=>{const p=$('cMsgP'),r=$('rBody');if(p)p.scrollIntoView({behavior:'smooth',block:'start'});if(r&&!r.value){r.value=DRAFT.reply(cli(x.clientId));r.focus()}},60)}
    else if(a==='contacted'){const r=x.row;r.status='تم التواصل';await saveRow('Requests',r);await saveRow('Log',{clientId:r.clientId||'',kind:'status',subject:`الطلب ${r.id}: تم التواصل`,by:ME_().username||'CRM'});toast(L('سُجّل التواصل','Contact recorded'));renderAll()}
    else if(a==='closeReq'){if(!await ask(L('إغلاق هذا الطلب دون معاملة؟','Close this request without a transaction?'),{ok:L('إغلاق','Close')}))return;const r=x.row;r.status='مغلق';await saveRow('Requests',r);renderAll()}
    else if(a==='convert')await convert(x.row);
    else if(a==='openTx')openTx(DB.Transactions.find(t=>t.id===x.ref));
    else if(a==='openTask')openTask(DB.Tasks.find(t=>t.id===x.ref));
    else if(a==='openCli')go('client',x.clientId);
    else if(a==='pay')openPay(x.ref);
    else if(a==='renewTx'){const t=DB.Transactions.find(y=>y.id===x.ref);if(t)openTx(Object.assign(newTx(t.clientId,t.code,L('تجديد ','Renewal of ')+t.id),{assignee:t.assignee||''}))}
    else if(a==='snooze'){if(snoozed(x.key)){const s=snoozes();delete s[x.key];try{localStorage.setItem(SKEY,JSON.stringify(s))}catch(err){}}else{snooze(x.key);toast(L('أُخفي حتى الغد','Hidden until tomorrow'))}render()}
  }catch(err){toast(errText(err.message))}});
V.addEventListener('change',async e=>{const s=e.target.closest('[data-asg]');if(!s)return;const x=byKey[s.closest('[data-key]').dataset.key];if(!x)return;
  const sheet=x.kind==='req'?'Requests':x.w?x.w.k:null,id=x.kind==='req'?x.row.id:x.w&&x.w.id;if(!sheet)return;
  const row=Object.assign({},DB[sheet].find(r=>r.id===id));row.assignee=s.value;
  try{await saveRow(sheet,row);toast(row.assignee?L('تم التكليف: ','Assigned to: ')+staffName(row.assignee):L('أُلغي التكليف','Unassigned'));renderAll()}catch(err){}});
V.addEventListener('submit',e=>{if(e.target.id!=='tdAsk')return;e.preventDefault();const v=$('tdQ').value.trim();if(v)answer(v)});

// ---------- the assistant: understands short questions in Arabic or English and answers from the loaded data ----------
const has=(s,re)=>re.test(s);
function intent(q){const s=q.toLowerCase();
  if(has(s,/^(summary|help|money|month|late|team)$/))return s;
  if(has(s,/مساعد|تستطيع|تقدر|help|what can/))return 'help';
  if(has(s,/ملخص|يومي|اليوم|summary|today|brief/))return 'summary';
  if(has(s,/متأخر|تأخر|late|overdue|delay/))return 'late';
  if(has(s,/دخل|إيراد|ايراد|حصّل|حصل|income|revenue|collected/))return 'month';
  if(has(s,/مستحق|يدفع|دفع|ديون|فلوس|تحصيل|owe|due|unpaid|pay|balance/))return 'money';
  if(has(s,/موظف|فريق|ضغط|team|staff|workload/))return 'team';
  if(has(s,/طلب|طلبات|request/)&&!/\bR-\d/i.test(q))return 'reqs';
  if(has(s,/رسال|رسائل|message/))return 'msgs';
  return 'find'}
function answer(q,isChip){const box=$('tdAns');if(!box)return;const it=intent(q),list=items.filter(x=>!snoozed(x.key));let h='';
  const ul=(arr,f,max=8)=>arr.length?`<ul class="plain">${arr.slice(0,max).map(x=>`<li>${f(x)}</li>`).join('')}</ul>${arr.length>max?`<p class="mute sm">${L(`و${arr.length-max} غيرها.`,`and ${arr.length-max} more.`)}</p>`:''}`:`<p class="mute">${L('لا يوجد.','None.')}</p>`;
  const go_=x=>`<a href="#" data-goto="${esc(x.key)}">${esc(x.title)}</a>${cli(x.clientId).name?' · '+esc(cli(x.clientId).name):x.name?' · '+esc(x.name):''}`;
  if(it==='help')h=`<p>${L('أعمل على بيانات اللوحة نفسها، وأستطيع:','I work on the panel data itself and can:')}</p><ul class="plain"><li>• ${L('تلخيص يومك واقتراح ما تبدأ به.','Summarise your day and suggest where to start.')}</li><li>• ${L('عرض المتأخر، والمستحقات، ودخل الشهر، وضغط العمل على الفريق.','Show overdue work, amounts owed, this month income and team workload.')}</li><li>• ${L('البحث عن أي عميل أو طلب أو معاملة بالاسم أو الجوال أو الرقم، وإعطاء ملخص ملفه وخطوته التالية.','Find any client, request or transaction by name, phone or number, with a file summary and next step.')}</li><li>• ${L('كتابة رسائل واتساب جاهزة: ترحيب، طلب مستندات، تذكير بالدفع، تجديد. اضغط «نص الرسالة» على أي بطاقة.','Write ready WhatsApp messages: welcome, documents, payment reminder, renewal. Press «Message text» on any card.')}</li></ul>`;
  else if(it==='summary'){const b=briefing(items);h=`<p>${b.line}</p>`+(b.top.length?`<p class="sm"><b>${L('الأولوية:','Priority:')}</b></p>${ul(b.top,go_)}`:'')}
  else if(it==='late')h=`<p><b>${L('المتأخر وما موعده اليوم','Overdue and due today')}</b></p>`+ul(list.filter(x=>x.kind==='late'||x.kind==='due'),go_);
  else if(it==='reqs')h=`<p><b>${L('الطلبات التي تحتاج متابعة','Requests needing follow-up')}</b></p>`+ul(list.filter(x=>x.kind==='req'),go_);
  else if(it==='msgs')h=`<p><b>${L('الرسائل والحسابات المنتظرة','Waiting messages and accounts')}</b></p>`+ul(list.filter(x=>x.kind==='msg'),go_);
  else if((it==='money'||it==='month')&&!can('finance'))h=`<p class="mute">${L('الأرقام المالية لمن لديه صلاحية المالية.','Financial figures are for staff with the finance permission.')}</p>`;
  else if(it==='money'){const by={};DB.Transactions.filter(t=>t.status!=='ملغاة'&&balance(t)>0).forEach(t=>{const o=by[t.clientId]=by[t.clientId]||{id:t.clientId,sum:0,n:0,done:0};o.sum+=balance(t);o.n++;if(t.status==='منجزة')o.done+=balance(t)});
    const arr=Object.values(by).sort((a,b)=>b.sum-a.sum),tot=arr.reduce((a,o)=>a+o.sum,0),totD=arr.reduce((a,o)=>a+o.done,0);
    h=`<p>${L(`إجمالي المستحق على العملاء ${money(tot)}، منه ${money(totD)} على معاملات منجزة (الأولى بالتحصيل).`,`Total owed by clients ${money(tot)}, of which ${money(totD)} is on completed transactions (collect first).`)}</p>`+ul(arr,o=>`${link(o.id,cli(o.id).name||o.id)} · <b class="num">${money(o.sum)}</b> <small class="mute">(${o.n} ${L('معاملة','tx')})</small>`)}
  else if(it==='month'){const m=iso().slice(0,7),ps=DB.Payments.filter(p=>String(p.date).slice(0,7)===m),rev=ps.reduce((a,p)=>a+(+p.amount||0),0),ex=DB.Expenses.filter(x=>String(x.date).slice(0,7)===m).reduce((a,x)=>a+(+x.amount||0),0);
    const done=DB.Transactions.filter(t=>t.status==='منجزة'&&String(t.closed||t.updated).slice(0,7)===m).length;
    h=`<ul class="plain"><li>${L('المحصّل هذا الشهر','Collected this month')}: <b class="num">${money(rev)}</b> (${ps.length} ${L('دفعة','payments')})</li><li>${L('المصروفات','Expenses')}: <b class="num">${money(ex)}</b></li><li>${L('الصافي','Net')}: <b class="num">${money(rev-ex)}</b></li><li>${L('معاملات أُنجزت هذا الشهر','Transactions completed this month')}: <b class="num">${done}</b></li></ul>`}
  else if(it==='team'){if(!can('assign'))h=`<p class="mute">${L('هذا للمدير أو من لديه صلاحية توزيع المهام.','This is for the manager or staff who assign work.')}</p>`;
    else{const W=workItems().filter(w=>!w.closed);const rows=(DB.Staff||[]).map(s=>{const o=W.filter(w=>w.assignee===s.username);return {s,n:o.length,l:o.filter(isLate).length}}).sort((a,b)=>b.n-a.n),un=W.filter(w=>!w.assignee).length;
      h=ul(rows,r=>`${esc(r.s.name||r.s.username)} · <b class="num">${r.n}</b> ${L('مفتوحة','open')}${r.l?` · <span class="bad num">${r.l} ${L('متأخرة','overdue')}</span>`:''}`,12)+(un?`<p class="sm">${L(`${un} عمل بلا مسؤول؛ وزّعه من بطاقات «بلا مسؤول».`,`${un} item(s) unassigned; assign them from the «Unassigned» cards.`)}</p>`:'')}}
  else h=find(q);
  box.innerHTML=`<div class="td-q">${esc(isChip?(V.querySelector(`[data-ask="${CSS.escape(q)}"]`)||{}).textContent||q:q)}</div>${h}`}
function find(q){const s=q.trim().toLowerCase(),dg=s.replace(/\D/g,''),idm=s.match(/\b([a-z])-?(\d{1,6})\b/i);
  const hit=v=>String(v||'').toLowerCase().includes(s);
  let cs=DB.Clients.filter(c=>hit(c.name)||hit(c.id)||(dg.length>=4&&String(c.phone||'').replace(/\D/g,'').includes(dg))||hit(c.cr)||hit(c.qid));
  const rq=DB.Requests.filter(r=>hit(r.id)||hit(r.name)||(dg.length>=4&&String(r.phone||'').replace(/\D/g,'').includes(dg)));
  const tx=DB.Transactions.filter(t=>hit(t.id)||(idm&&String(t.id).toLowerCase()===idm[1].toLowerCase()+'-'+idm[2].padStart(4,'0')));
  rq.concat(tx).forEach(r=>{if(r.clientId&&!cs.some(c=>c.id===r.clientId)&&cli(r.clientId).id)cs.push(cli(r.clientId))});
  if(!cs.length&&!rq.length)return `<p>${L('لم أجد عميلاً أو طلباً بهذا. جرّب جزءاً من الاسم، أو آخر 4 أرقام من الجوال، أو رقماً مثل R-0001.','I found no client or request for that. Try part of the name, the last 4 phone digits, or a number like R-0001.')}</p><p class="mute sm">${L('ويمكنك أن تسأل: «ملخص اليوم»، «ما المتأخر؟»، «من عليه مستحقات؟».','You can also ask: «Today summary», «What is overdue?», «Who owes us?».')}</p>`;
  return cs.slice(0,4).map(c=>{const T=DB.Transactions.filter(t=>t.clientId===c.id),open=T.filter(t=>!CLOSED.includes(t.status)),bal=T.filter(t=>t.status!=='ملغاة').reduce((a,t)=>a+balance(t),0);
    const lg=DB.Log.filter(l=>l.clientId===c.id).sort((a,b)=>a.created<b.created?1:-1)[0],R=DB.Requests.filter(r=>r.clientId===c.id&&(r.status==='جديد'||r.status==='تم التواصل'));
    const its=items.filter(x=>x.clientId===c.id);
    return `<div class="td-cli"><p>${link(c.id,c.name)} <small class="mute num">${esc(c.id)}${c.phone?' · '+esc(c.phone):''}</small></p><ul class="plain sm">
      <li>${L('معاملات مفتوحة','Open transactions')}: <b class="num">${open.length}</b>${open.length?' · '+open.slice(0,3).map(t=>`<a href="#" data-txn="${esc(t.id)}">${esc(t.service)}</a> (${esc(trS(t.status))})`).join('، '):''}</li>
      ${R.length?`<li>${L('طلبات مفتوحة','Open requests')}: ${R.map(r=>`<span class="num">${esc(r.id)}</span> (${esc(trS(r.status))})`).join('، ')}</li>`:''}
      ${can('finance')?`<li>${L('المستحق عليه','Balance owed')}: <b class="num ${bal>0?'bad':''}">${money(bal)}</b></li>`:''}
      <li>${L('آخر تواصل','Last contact')}: ${lg?`<span class="num">${esc(String(lg.created).slice(0,10))}</span> · ${esc(String(lg.subject||'').slice(0,60))}`:L('لا يوجد مسجّل','none recorded')}</li>
      <li><b>${L('الخطوة التالية','Next step')}:</b> ${its.length?`<a href="#" data-goto="${esc(its[0].key)}">${esc(its[0].next)}</a>`:L('لا يوجد إجراء معلّق لهذا العميل.','No pending action for this client.')}</li></ul></div>`}).join('')+
    rq.filter(r=>!r.clientId||!cli(r.clientId).id).slice(0,3).map(r=>`<p>${L('طلب','Request')} <span class="num">${esc(r.id)}</span> · ${esc(r.name)} · ${esc(trS(r.status))}</p>`).join('')}

VIEWS.today=render;
})();
