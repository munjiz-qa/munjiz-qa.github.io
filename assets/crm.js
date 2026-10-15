'use strict';
// نظام العملاء: يعمل مع خادم Google Apps Script إذا وُضع رابطه في config.js، وإلا يحفظ في متصفح هذا الجهاز.
const CFG=window.MUNJIZ_CONFIG||{};
const D=window.DETAILS||{};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>(Number(n)||0).toLocaleString('en-US');
const STATUSES=['جديدة','بانتظار المستندات','قيد التقديم','قيد المتابعة لدى الجهة','بانتظار العميل','منجزة','ملغاة'];
const CLOSED=['منجزة','ملغاة'];
const REQ_ST=['جديد','تم التواصل','تحوّل إلى معاملة','مغلق'];
const SHEETS=['Clients','Transactions','Requests','Log','Accounts','Files','Consents','Credentials','Messages'];
const PREFIX={Clients:'C',Transactions:'T',Requests:'R',Log:'L',Accounts:'A',Files:'F',Consents:'K',Credentials:'P',Messages:'M'};
const ERR={no_permission:'ليست لديك صلاحية لهذا الإجراء. راجع المدير.',wrong_password:'اسم المستخدم أو كلمة المرور غير صحيحة.',rate_limited:'محاولات كثيرة، حاول بعد ساعة.',weak_password:'كلمة المرور 8 أحرف على الأقل.',bad_username:'اسم المستخدم غير صالح (3 أحرف على الأقل وبدون مسافات).',
  username_taken:'اسم المستخدم مستخدم من قبل.',must_change_both:'غيّر اسم المستخدم (ليس 123) وكلمة المرور معاً.',admin_only:'هذا الإجراء للمدير فقط.',last_admin:'لا يمكن إيقاف آخر مدير أو تحويله إلى موظف.',
  too_large:'الملف أكبر من 10 ميجابايت.',not_found:'غير موجود.',invalid:'بيانات غير مكتملة.',read_only:'لا يمكن تعديل هذا السجل مباشرة.',must_change:'غيّر بيانات الدخول أولاً.'};
const errText=e=>ERR[e]||e;
function toast(t){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2200)}
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const days=s=>{if(!s)return null;const d=new Date(s);return isNaN(d)?null:Math.round((d-today())/864e5)};
const now=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`};
const iso=()=>now().slice(0,10);
// in-page replacements for confirm() and prompt(), which some browsers and embedded viewers block
function ask(msg,{input=false,ok='نعم'}={}){return new Promise(res=>{const d=$('dlgQ');$('qT').textContent=msg;$('qIn').hidden=!input;$('qIn').value='';$('qOk').textContent=ok;
  d.onclose=()=>res(d.returnValue==='ok'?(input?$('qIn').value.trim()||null:true):(input?null:false));d.returnValue='';d.showModal();if(input)$('qIn').focus()})}

// ---- catalogue (government + setup + consultancy) ----
const CAT=[];
DATA.G.forEach(([k,n,l])=>l.forEach(s=>CAT.push({c:s[0],n:s[1],p:s[3],g:n})));
DATA.SETUP.forEach(s=>CAT.push({c:s[0],n:s[1],p:s[3],g:'الحزم'}));
(DATA.CONSULT||[]).forEach(cat=>cat.items.forEach(i=>CAT.push({c:i.c,n:i.ar.n,p:i.p,g:cat.ar,docs:i.ar.docs})));
const SVC=Object.fromEntries(CAT.map(s=>[s.c,s]));
const docsFor=c=>((D[c]||{}).ar||{}).docs||(SVC[c]||{}).docs||[];

// ---- storage: remote (Apps Script) or local (this browser) ----
const LKEY='munjiz_crm_v1',PKEY='munjiz_crm_pw',TKEY='munjiz_crm_token';
let ME=null;   // signed-in staff member: {username,name,role,mustChange}
const Remote={
  async call(body){const r=await fetch(CFG.API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(body)});const j=await r.json();if(!j.ok){if(j.error==='must_change'){showChg();throw new Error(errText(j.error))}if(j.error==='auth'){logout();throw new Error('انتهت الجلسة، سجّل الدخول مرة أخرى')}throw new Error(j.error||'خطأ')}return j},
  async login(u,pw){const j=await this.call({action:'login',username:u,password:pw});sessionStorage.setItem(TKEY,j.token);return j.me},
  async me(){return (await this.call({action:'staffMe',token:this.tok()})).me},
  async changeOwn(o){return (await this.call(Object.assign({action:'staffPass',token:this.tok()},o))).me},
  async api(action,body){return this.call(Object.assign({action,token:this.tok()},body))},
  tok(){return sessionStorage.getItem(TKEY)},
  async list(){const j=await this.call({action:'list',token:this.tok()});if(j.me)ME=j.me;return j.data},
  async save(sheet,row){return (await this.call({action:'save',token:this.tok(),sheet,row})).row},
  async del(sheet,id){await this.call({action:'delete',token:this.tok(),sheet,id})},
  async mail(m){await this.call(Object.assign({action:'sendEmail',token:this.tok()},m))}
};
const Local={
  db(){try{return JSON.parse(localStorage.getItem(LKEY))||{}}catch(e){return {}}},
  put(db){localStorage.setItem(LKEY,JSON.stringify(db))},
  // local mode keeps one admin login on this device: 123 / 123 at first, changed on first sign-in
  async creds(){let c=null;try{c=JSON.parse(localStorage.getItem(PKEY))}catch(e){c=localStorage.getItem(PKEY)?{u:'123',h:localStorage.getItem(PKEY),must:1}:null}
    return c&&c.h?c:{u:'123',h:await hash('123'),must:1}},
  async login(u,pw){const c=await this.creds();if(String(u).trim().toLowerCase()!==c.u||await hash(pw)!==c.h)throw new Error(ERR.wrong_password);
    sessionStorage.setItem(TKEY,'local');return ME={username:c.u,name:'المدير',role:'admin',mustChange:c.must?'نعم':''}},
  async me(){const c=await this.creds();return ME={username:c.u,name:'المدير',role:'admin',mustChange:c.must?'نعم':''}},
  async changeOwn(o){const c=await this.creds();if(await hash(o.old||'')!==c.h)throw new Error(ERR.wrong_password);
    const u=o.username!=null?String(o.username).trim().toLowerCase():c.u;if(!/^[^\s]{3,40}$/.test(u))throw new Error(ERR.bad_username);
    if(o.password&&o.password.length<8)throw new Error(ERR.weak_password);if(c.must&&(!o.password||u==='123'))throw new Error(ERR.must_change_both);
    localStorage.setItem(PKEY,JSON.stringify({u,h:o.password?await hash(o.password):c.h,must:0}));return this.me()},
  async api(){throw new Error('تعمل هذه الميزة بعد تشغيل الخادم (راجع ملف «اقرأني - تشغيل نظام العملاء»).')},
  tok(){return sessionStorage.getItem(TKEY)},
  async list(){const db=this.db();SHEETS.forEach(s=>db[s]=db[s]||[]);return db},
  async save(sheet,row){const db=await this.list();const arr=db[sheet];
    if(!row.id){const max=arr.reduce((m,r)=>Math.max(m,+(String(r.id).match(/(\d+)$/)||[0,0])[1]),0);row.id=PREFIX[sheet]+'-'+String(max+1).padStart(4,'0');row.created=now()}
    if(sheet!=='Log')row.updated=now();
    const i=arr.findIndex(r=>r.id===row.id);if(i>=0)arr[i]=row;else arr.push(row);this.put(db);return row},
  async del(sheet,id){const db=await this.list();db[sheet]=db[sheet].filter(r=>r.id!==id);this.put(db)},
  async mail(m){location.href=`mailto:${encodeURIComponent(m.to)}?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
    await this.save('Log',{clientId:m.clientId||'',txnId:m.txnId||'',kind:'email',subject:m.subject,body:m.body,by:'CRM'})}
};
async function hash(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('munjiz:'+s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){let h=0;for(const ch of 'munjiz:'+s)h=(h*31+ch.charCodeAt(0))|0;return 'x'+h}}
const S=CFG.API?Remote:Local;
let DB=Object.fromEntries(SHEETS.map(s=>[s,[]]));
const cli=id=>DB.Clients.find(c=>c.id===id)||{};
const parseDocs=v=>{if(Array.isArray(v))return v;try{return JSON.parse(v||'[]')}catch(e){return []}};

// ---- login / mode ----
function showMode(){const m=$('modeBar');m.hidden=false;
  m.innerHTML=CFG.API?'متصل بخادم المكتب. البيانات محفوظة في Google Sheets ويصل الرد بالبريد للعملاء تلقائياً.'
  :'<b>وضع محلي:</b> البيانات تُحفظ في هذا المتصفح على هذا الجهاز فقط، والبريد يُفتح في برنامج البريد لديك. لتشغيل الحفظ المركزي والرد التلقائي اتبع ملف «اقرأني - تشغيل نظام العملاء». خذ نسخة احتياطية من قسم السجل بانتظام.';
  m.className='modebar'+(CFG.API?' ok':'')}
function hideAll(){$('login').hidden=$('chg').hidden=true;$('tabs').hidden=true;document.querySelectorAll('.view').forEach(v=>v.hidden=true)}
function showLogin(){hideAll();$('login').hidden=false;
  $('loginHint').textContent='اكتب اسم المستخدم وكلمة المرور. أول دخول للمدير: 123 و123، ثم يطلب النظام تغييرهما.';
  const u=new URLSearchParams(location.search).get('u');if(u)$('un').value=u;($('un').value?$('pw'):$('un')).focus()}
let lastPw='';
function showChg(){hideAll();$('chg').hidden=false;$('cUn').value=ME&&ME.username!=='123'?ME.username:'';$('cUn').focus()}
$('loginF').onsubmit=async e=>{e.preventDefault();$('loginErr').textContent='';
  try{$('loginBtn').disabled=true;ME=await S.login($('un').value.trim(),$('pw').value);lastPw=$('pw').value;$('pw').value='';
    if(ME&&ME.mustChange)showChg();else await start()}catch(err){$('loginErr').textContent=errText(err.message)}finally{$('loginBtn').disabled=false}};
$('chgF').onsubmit=async e=>{e.preventDefault();$('chgErr').textContent='';
  if($('cPw').value!==$('cPw2').value){$('chgErr').textContent='كلمتا المرور غير متطابقتين.';return}
  try{ME=await S.changeOwn({old:lastPw,username:$('cUn').value.trim(),password:$('cPw').value});lastPw='';$('chgF').reset();toast('تم حفظ بيانات الدخول الجديدة');await start()}catch(err){$('chgErr').textContent=errText(err.message)}};
function logout(){sessionStorage.removeItem(TKEY);ME=null;showLogin()}
// signing out records the end of the working session for attendance
$('logout').onclick=async()=>{if(CFG.API&&S.tok())await S.api('staffLogout',{}).catch(()=>{});logout()};
async function start(){hideAll();$('tabs').hidden=false;await reload();go('dash')}
async function reload(){try{DB=await S.list();SHEETS.forEach(s=>DB[s]=DB[s]||[])}catch(e){toast(e.message)}if(!ME)try{ME=await S.me()}catch(e){}renderAll()}

// ---- navigation ----
let tab='dash',curClient=null;
$('tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b)go(b.dataset.tab)});
function go(t,id){tab=t;document.querySelectorAll('.view').forEach(v=>v.hidden=true);
  if(t==='client'){curClient=id;$('v-client').hidden=false;renderClient()}else $('v-'+t).hidden=false;
  if(t==='emp')renderEmp();
  document.querySelectorAll('#tabs [data-tab]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tab===(t==='client'?'cli':t)));window.scrollTo(0,0)}
function renderAll(){renderDash();renderReq();renderCli();renderTx();renderLog();renderMsg();renderSet();if(tab==='client')renderClient()}
const table=(head,rows)=>rows.length?`<table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table>`:'<div class="empty">لا توجد بيانات.</div>';
const stTag=s=>`<span class="st st-${STATUSES.indexOf(s)}">${esc(s)}</span>`;
const link=(id,txt)=>`<a href="#" data-client="${esc(id)}">${esc(txt||id)}</a>`;
document.addEventListener('click',e=>{const a=e.target.closest('[data-client]');if(a){e.preventDefault();go('client',a.dataset.client)}
  const t=e.target.closest('[data-txn]');if(t){e.preventDefault();openTx(DB.Transactions.find(x=>x.id===t.dataset.txn))}
  const x=e.target.closest('[data-export]');if(x)exportCsv(x.dataset.export)});

// ---- dashboard ----
function renderDash(){
  const open=DB.Transactions.filter(t=>!CLOSED.includes(t.status));
  const late=open.filter(t=>{const d=days(t.dueDate);return d!==null&&d<0});
  const renew=DB.Transactions.filter(t=>{const d=days(t.expiryDate);return d!==null&&d>=0&&d<=30}).sort((a,b)=>a.expiryDate>b.expiryDate?1:-1);
  const plans=DB.Clients.filter(c=>{const d=days(c.planEnd);return d!==null&&d>=0&&d<=30});
  const nreq=DB.Requests.filter(r=>r.status==='جديد');
  const month=iso().slice(0,7),done=DB.Transactions.filter(t=>t.status==='منجزة'&&String(t.closed||t.updated).slice(0,7)===month);
  const due=open.reduce((a,t)=>a+Math.max(0,(+t.fee||0)+(+t.govFee||0)-(+t.paid||0)),0);
  $('nReq').textContent=nreq.length||'';
  const waiting=unreadBy();$('nMsg').textContent=waiting.length||'';
  const pend=DB.Accounts.filter(a=>a.status==='بانتظار التفعيل');
  $('kpis').innerHTML=[['العملاء',DB.Clients.length],['طلبات جديدة',nreq.length],['معاملات مفتوحة',open.length],['رسائل تنتظر الرد',waiting.length],['متأخرة',late.length],['منجزة هذا الشهر',done.length],...(can('finance')?[['أتعاب منجزة هذا الشهر',fmt(done.reduce((a,t)=>a+(+t.fee||0),0))+' ر.ق'],['مستحق على العملاء',fmt(due)+' ر.ق']]:[])]
    .map(([k,v])=>`<div class="kpi"><b class="num">${v}</b><span>${k}</span></div>`).join('');
  const li=(arr,f)=>arr.length?`<ul class="plain">${arr.slice(0,12).map(x=>`<li>${f(x)}</li>`).join('')}</ul>`:'<p class="mute">لا يوجد.</p>';
  $('dReq').innerHTML=li(nreq,r=>`${link(r.clientId,r.name)} · <span class="num">${esc(r.phone)}</span> · <small class="mute">${esc(r.created)}</small>`);
  $('dLate').innerHTML=li(late,t=>`<a href="#" data-txn="${t.id}">${esc(t.service)}</a> · ${link(t.clientId,cli(t.clientId).name)} · <span class="bad">متأخرة ${-days(t.dueDate)} يوم</span>`);
  $('dRenew').innerHTML=li(renew,t=>`<a href="#" data-txn="${t.id}">${esc(t.service)}</a> · ${link(t.clientId,cli(t.clientId).name)} · تنتهي بعد ${days(t.expiryDate)} يوم`);
  $('dPlans').innerHTML=li(plans,c=>`${link(c.id,c.name)} · باقة ${esc(c.plan)} · تنتهي بعد ${days(c.planEnd)} يوم`);
  $('dMsg').innerHTML=li(waiting,([id,n,last])=>`${link(id,cli(id).name)} · ${n} رسالة · <small class="mute">${esc(String(last.body).slice(0,60))}</small>`);
  $('dAcc').innerHTML=li(pend,a=>`${link(a.clientId,cli(a.clientId).name)} · <span dir="ltr">${esc(a.username)}</span> · <small class="mute">اتصل بالعميل للتأكد ثم فعّل الحساب من ملفه</small>`);
}

// ---- requests ----
REQ_ST.forEach(s=>$('reqF').insertAdjacentHTML('beforeend',`<option>${s}</option>`));
$('reqF').onchange=$('reqQ').oninput=renderReq;
function renderReq(){const f=$('reqF').value,q=$('reqQ').value.trim();
  const rows=DB.Requests.filter(r=>(!f||r.status===f)&&(!q||(r.name+' '+r.phone+' '+r.id).includes(q))).sort((a,b)=>a.created<b.created?1:-1).map(r=>`<tr>
    <td class="num">${esc(r.id)}<br><small class="mute">${esc(r.created)}</small></td><td>${link(r.clientId,r.name)}<br><small class="num">${esc(r.phone)}</small>${r.email?`<br><small dir="ltr">${esc(r.email)}</small>`:''}</td>
    <td class="pre">${esc(r.services)}</td><td>${esc(r.plan||'')}</td><td>${r.mailed==='نعم'?'أُرسل':'—'}</td>
    <td><select data-rq="${esc(r.id)}">${REQ_ST.map(s=>`<option ${s===r.status?'selected':''}>${s}</option>`).join('')}</select>
    <div class="acts"><button class="btn xs ghost" type="button" data-conv="${esc(r.id)}">تحويل إلى معاملات</button>${r.email?`<button class="btn xs ghost" type="button" data-rmail="${esc(r.id)}">رد بالبريد</button>`:''}</div></td></tr>`);
  $('reqT').innerHTML=table(['الرقم','العميل','الخدمات المطلوبة','الباقة','التأكيد بالبريد','الحالة والإجراء'],rows)}
$('reqT').addEventListener('change',async e=>{const s=e.target.closest('[data-rq]');if(!s)return;const r=DB.Requests.find(x=>x.id===s.dataset.rq);r.status=s.value;await saveRow('Requests',r);renderDash()});
$('reqT').addEventListener('click',async e=>{
  const c=e.target.closest('[data-conv]');if(c){const r=DB.Requests.find(x=>x.id===c.dataset.conv);
    const codes=String(r.codes||'').split(/\s+/).filter(x=>SVC[x]);if(!codes.length){openTx({clientId:r.clientId,notes:r.services});return}
    for(const code of codes)await saveRow('Transactions',newTx(r.clientId,code,r.services));
    r.status='تحوّل إلى معاملة';await saveRow('Requests',r);await saveRow('Log',{clientId:r.clientId,kind:'status',subject:`تحويل الطلب ${r.id} إلى ${codes.length} معاملة`,by:'CRM'});toast(`أُنشئت ${codes.length} معاملة`);renderAll();return}
  const m=e.target.closest('[data-rmail]');if(m){const r=DB.Requests.find(x=>x.id===m.dataset.rmail);openMail(cli(r.clientId).id?cli(r.clientId):{name:r.name,email:r.email},null,'docs')}});
function newTx(clientId,code,notes){const s=SVC[code]||{};return {clientId,code,service:s.n||'',status:'بانتظار المستندات',fee:s.p||'',govFee:'',paid:'',startDate:iso(),docs:JSON.stringify(docsFor(code).map(t=>({t,ok:false}))),notes:notes||''}}

// ---- clients ----
$('cliQ').oninput=renderCli;
function renderCli(){const q=$('cliQ').value.trim();
  const rows=DB.Clients.filter(c=>!q||[c.name,c.phone,c.qid,c.cr,c.estCard,c.email,c.id].join(' ').includes(q)).sort((a,b)=>String(a.name).localeCompare(String(b.name),'ar')).map(c=>{
    const tx=DB.Transactions.filter(t=>t.clientId===c.id),open=tx.filter(t=>!CLOSED.includes(t.status)).length;
    const acc=DB.Accounts.find(a=>a.clientId===c.id),un=unreadBy().find(x=>x[0]===c.id);
    return `<tr><td><button type="button" class="btn xs pri openf" data-client="${esc(c.id)}" title="فتح الملف الكامل للعميل" aria-label="فتح الملف الكامل لـ ${esc(c.name)}"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M3 6h7l2 2h9v11H3z"/></svg> الملف</button></td><td class="num">${esc(c.id)}</td><td>${link(c.id,c.name)}${un?` <span class="pill num" title="رسائل تنتظر الرد">${un[1]}</span>`:''}<br><small class="mute">${esc(c.type)}</small></td><td class="num">${esc(c.phone)}</td><td class="num">${esc(c.qid||c.cr||'')}</td><td>${acc?`<span class="st ${acc.status==='مفعّل'?'st-5':'st-1'}">${esc(acc.status)}</span>`:'<small class="mute">لا يوجد</small>'}</td><td>${esc(c.plan||'')}</td><td class="num">${tx.length} / ${open}</td><td><small>${esc(String(c.requirements||'').slice(0,80))}</small></td></tr>`});
  $('cliT').innerHTML=table(['','الرقم','الاسم','الجوال','الرقم الشخصي أو السجل','الحساب','الباقة','المعاملات / المفتوحة','المتطلبات'],rows)}
const FIELDS={qid:'الرقم الشخصي',cr:'السجل التجاري',estCard:'بطاقة المنشأة',taxNo:'الرقم الضريبي',phone:'الجوال',email:'البريد',plan:'الباقة',planEnd:'نهاية الاشتراك',address:'العنوان',source:'المصدر',created:'تاريخ الإضافة'};
function renderClient(){const c=cli(curClient);if(!c.id){go('cli');return}
  $('cName').textContent=`${c.name} · ${c.id}`;$('cWa').href='https://wa.me/974'+String(c.phone||'').slice(-8);
  $('cInfo').innerHTML=Object.entries(FIELDS).filter(([k])=>c[k]).map(([k,l])=>`<dt>${l}</dt><dd class="${/qid|cr|estCard|taxNo|phone/.test(k)?'num':''}" ${k==='email'?'dir="ltr"':''}>${esc(c[k])}</dd>`).join('')||'<p class="mute">لا توجد بيانات إضافية.</p>';
  $('cReq').innerHTML=`<p class="pre">${esc(c.requirements||'لا توجد متطلبات مسجلة.')}</p>${c.notes?`<p class="pre mute">${esc(c.notes)}</p>`:''}`;
  const tx=DB.Transactions.filter(t=>t.clientId===c.id).sort((a,b)=>a.created<b.created?1:-1);
  $('cTx').innerHTML=txTable(tx,false);
  const lg=DB.Log.filter(l=>l.clientId===c.id).sort((a,b)=>a.created<b.created?1:-1);
  $('cLog').innerHTML=lg.length?lg.map(logItem).join(''):'<p class="mute">لا يوجد تواصل مسجل.</p>';
  renderExtras(c)}
$('backCli').onclick=()=>go('cli');$('newCli').onclick=()=>openCli({});$('cEdit').onclick=()=>openCli(cli(curClient));
$('cTxn').onclick=()=>openTx({clientId:curClient,status:'بانتظار المستندات',startDate:iso()});$('cMail').onclick=()=>openMail(cli(curClient));
$('cNote').onclick=async()=>{const t=await ask('اكتب الملاحظة أو ملخص المكالمة',{input:true,ok:'حفظ'});if(!t)return;await saveRow('Log',{clientId:curClient,kind:'note',subject:'ملاحظة',body:t,by:'CRM'});renderClient();renderLog()};
let editC=null;
function openCli(c){editC=c;const f=$('fC');f.reset();Object.keys(c).forEach(k=>{if(f.elements[k])f.elements[k].value=c[k]==null?'':c[k]});$('delC').hidden=!c.id;$('dlgC').showModal()}
$('fC').addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;const f=$('fC');
  const ph=f.elements.phone.value.replace(/\s/g,'').replace(/^\+?974/,'');if(!/^[3567]\d{7}$/.test(ph)){e.preventDefault();toast('اكتب جوالاً قطرياً من 8 أرقام');return}
  const row=Object.assign({},editC);[...f.elements].forEach(el=>{if(el.name)row[el.name]=el.value.trim()});row.phone=ph;
  const r=await saveRow('Clients',row);if(!editC.id){await saveRow('Log',{clientId:r.id,kind:'status',subject:'إضافة عميل جديد',by:'CRM'});go('client',r.id)}renderAll()});
$('delC').onclick=async()=>{$('dlgC').close();if(!await ask('حذف العميل؟ لن تُحذف معاملاته.',{ok:'حذف'}))return;await S.del('Clients',editC.id);await reload();go('cli')};

// ---- client file: messages, website account, files, portal logins, consents ----
const REMOTE=!!CFG.API;
function unreadBy(){const m={};DB.Messages.filter(x=>x.from==='client'&&!x.read).forEach(x=>{(m[x.clientId]=m[x.clientId]||[]).push(x)});
  return Object.entries(m).map(([id,l])=>[id,l.length,l[l.length-1]])}
const NEEDS_SERVER='<p class="mute sm">تعمل بعد تشغيل الخادم (ملف «اقرأني - تشغيل نظام العملاء»).</p>';
function renderExtras(c){
  const msgs=DB.Messages.filter(m=>m.clientId===c.id).sort((a,b)=>a.created>b.created?1:-1);
  $('cMsgs').innerHTML=REMOTE?(msgs.length?msgs.map(m=>`<div class="bub ${m.from==='office'?'me':''}"><div class="pre">${esc(m.body)}</div><small class="mute">${m.from==='office'?esc(m.by||'المكتب'):'العميل'} · ${esc(m.created)}</small></div>`).join(''):'<p class="mute">لا توجد رسائل بعد. اكتب للعميل وسيراها في حسابه.</p>'):NEEDS_SERVER;
  $('replyF').hidden=!REMOTE;$('rMail').closest('label').hidden=!c.email;
  const acc=DB.Accounts.find(a=>a.clientId===c.id);
  $('cAcc').innerHTML=(acc?`<dl class="dl"><dt>اسم المستخدم</dt><dd dir="ltr">${esc(acc.username)}</dd><dt>الحالة</dt><dd><span class="st ${acc.status==='مفعّل'?'st-5':'st-1'}">${esc(acc.status)}</span></dd><dt>تاريخ الإنشاء</dt><dd class="num">${esc(acc.created)}</dd><dt>آخر دخول</dt><dd class="num">${esc(acc.lastLogin||'لم يدخل بعد')}</dd></dl>`
    :'<p class="mute">ليس للعميل حساب على الموقع. يمكنه إنشاؤه بنفسه من صفحة «حسابي»، أو أنشئه له هنا.</p>')+
    (REMOTE?`<div class="acts">${acc&&acc.status!=='مفعّل'?'<button class="btn sm pri" type="button" data-acc="activate">تفعيل الحساب</button>':''}<button class="btn sm ghost" type="button" data-acc="edit">${acc?'تعديل أو إعادة تعيين كلمة المرور':'إنشاء حساب للعميل'}</button>${acc&&acc.status==='مفعّل'?'<button class="btn sm ghost danger" type="button" data-acc="stop">إيقاف الحساب</button>':''}</div>`:NEEDS_SERVER);
  const files=DB.Files.filter(f=>f.clientId===c.id).sort((a,b)=>a.created<b.created?1:-1);
  $('cFiles').innerHTML=files.length?`<ul class="plain">${files.map(f=>`<li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.title)}</a> <small class="mute num">${esc(f.created)}${f.txnId?' · '+esc(f.txnId):''}${f.by?' · '+esc(f.by):''}</small> <button class="btn xs ghost danger" type="button" data-fdel="${esc(f.id)}">حذف</button></li>`).join('')}</ul>`:'<p class="mute">لم يُرفع للعميل أي ملف بعد.</p>';
  $('fTxn').innerHTML='<option value="">بدون</option>'+DB.Transactions.filter(t=>t.clientId===c.id).map(t=>`<option value="${esc(t.id)}">${esc(t.id)} · ${esc(t.service)}</option>`).join('');
  $('fUpL').hidden=!REMOTE;$('fHint').textContent=REMOTE?'يُحفظ الملف خاصاً في Google Drive للمكتب، ولا يصل إليه إلا العميل من حسابه.':'الوضع المحلي: أضف رابطاً فقط.';
  const creds=DB.Credentials.filter(x=>x.clientId===c.id);
  $('cCreds').innerHTML=REMOTE?(creds.length?`<ul class="plain">${creds.map(x=>`<li><b>${esc(x.portal)}</b> · <span dir="ltr">${esc(x.username)}</span> · <span class="pwv" id="pv-${esc(x.id)}" dir="ltr">••••••</span> <button class="btn xs ghost" type="button" data-reveal="${esc(x.id)}">إظهار</button>${x.note?`<br><small class="mute">${esc(x.note)}</small>`:''}</li>`).join('')}</ul>`:'<p class="mute">لم يضف العميل بيانات دخول لأي بوابة.</p>'):NEEDS_SERVER;
  const cons=DB.Consents.filter(x=>x.clientId===c.id).sort((a,b)=>a.created<b.created?1:-1);
  $('cCons').innerHTML=cons.length?`<ul class="plain">${cons.map(x=>`<li>${esc(x.docs)} · الإصدار ${esc(x.version)}<br><small class="mute">${esc(x.created)} · وقّع باسم «${esc(x.name)}» · ${esc(x.source)}</small></li>`).join('')}</ul>`:'<p class="mute">لا توجد موافقات مسجلة.</p>'}
$('replyF').onsubmit=async e=>{e.preventDefault();const b=$('rBody').value.trim();if(!b)return;
  try{const j=await S.api('reply',{clientId:curClient,body:b,email:$('rMail').checked});$('rBody').value='';toast(j.mailed?'أُرسل الرد وظهر في حساب العميل ووصله بالبريد':'أُرسل الرد وظهر في حساب العميل');await reload()}catch(err){toast(errText(err.message))}};
$('cAcc').onclick=async e=>{const b=e.target.closest('[data-acc]');if(!b)return;const acc=DB.Accounts.find(a=>a.clientId===curClient);
  if(b.dataset.acc==='edit'){const f=$('fA');f.reset();f.elements.username.value=acc?acc.username:String(cli(curClient).phone||'').slice(-8);f.elements.status.value=acc?acc.status:'مفعّل';if(!acc)f.elements.password.value=genPw();$('dlgA').showModal();return}
  try{await S.api('clientAccount',{clientId:curClient,status:b.dataset.acc==='activate'?'مفعّل':'موقوف'});toast('تم تحديث الحساب');await reload()}catch(err){toast(errText(err.message))}};
const genPw=()=>{const a='abcdefghjkmnpqrstuvwxyz23456789';let s='';const r=crypto.getRandomValues(new Uint32Array(10));r.forEach(x=>s+=a[x%a.length]);return s};
$('aGen').onclick=()=>{$('fA').elements.password.value=genPw()};
$('fA').addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;const f=$('fA').elements;
  const body={clientId:curClient,username:f.username.value.trim().toLowerCase(),status:f.status.value};if(f.password.value)body.password=f.password.value;
  try{await S.api('clientAccount',body);toast(body.password?`تم الحفظ. أرسل للعميل: ${body.username} / ${body.password}`:'تم الحفظ');await reload()}catch(err){e.preventDefault();toast(errText(err.message))}});
$('fileF').onsubmit=async e=>{e.preventDefault();const title=$('fTitle').value.trim(),txnId=$('fTxn').value,file=$('fUp').files[0],url=$('fUrl').value.trim();
  if(!title||(!file&&!url)){toast('اكتب العنوان واختر ملفاً أو ضع رابطاً');return}
  try{if(file&&REMOTE){if(file.size>10*1024*1024)throw new Error(ERR.too_large);
      const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(file)});
      toast('جارٍ الرفع…');await S.api('upload',{clientId:curClient,txnId,title,name:file.name,mime:file.type,data})}
    else await S.save('Files',{clientId:curClient,txnId,title,url,fileId:'',by:ME?ME.username:'CRM'});
    $('fileF').reset();toast('أُضيف الملف إلى حساب العميل');await reload()}catch(err){toast(errText(err.message))}};
$('cFiles').onclick=async e=>{const b=e.target.closest('[data-fdel]');if(!b||!await ask('حذف الملف من حساب العميل؟ يُنقل ملف Drive إلى سلة المهملات.',{ok:'حذف'}))return;
  try{await S.del('Files',b.dataset.fdel);await reload()}catch(err){toast(errText(err.message))}};
$('cCreds').onclick=async e=>{const b=e.target.closest('[data-reveal]');if(!b)return;
  try{const j=await S.api('reveal',{id:b.dataset.reveal});const el=$('pv-'+b.dataset.reveal);el.textContent=j.password;b.textContent='نسخ';b.onclick=ev=>{ev.stopPropagation();navigator.clipboard&&navigator.clipboard.writeText(j.password);toast('نُسخت كلمة المرور')};
    setTimeout(()=>{el.textContent='••••••';b.textContent='إظهار';b.onclick=null},30000)}catch(err){toast(errText(err.message))}};

// ---- messages overview ----
function renderMsg(){const by={};DB.Messages.forEach(m=>{(by[m.clientId]=by[m.clientId]||[]).push(m)});
  const rows=Object.entries(by).map(([id,l])=>{l.sort((a,b)=>a.created>b.created?1:-1);const last=l[l.length-1],un=l.filter(m=>m.from==='client'&&!m.read).length;return [last.created,`<tr><td><button type="button" class="btn xs pri openf" data-client="${esc(id)}">فتح</button></td><td>${link(id,cli(id).name)}${un?` <span class="pill num">${un}</span>`:''}</td><td class="pre">${esc(String(last.body).slice(0,160))}</td><td>${last.from==='office'?'المكتب':'العميل'}</td><td class="num">${esc(last.created)}</td></tr>`]}).sort((a,b)=>a[0]<b[0]?1:-1).map(x=>x[1]);
  $('msgT').innerHTML=REMOTE?table(['','العميل','آخر رسالة','من','التاريخ'],rows):'<div class="empty">المراسلات مع العملاء تعمل بعد تشغيل الخادم.</div>'}

// ---- permissions (the server enforces them; the page only hides what an employee cannot use) ----
const PERM_L={requests:'الطلبات الواردة',clients_view:'عرض العملاء وملفاتهم',clients_edit:'إضافة العملاء وتعديلهم',transactions:'المعاملات وحالاتها',finance:'الأتعاب والمدفوعات',messages:'المراسلات والرد على العملاء',
  files:'رفع الملفات والتراخيص',accounts:'حسابات العملاء (تفعيل وكلمات مرور)',credentials:'إظهار كلمات مرور البوابات',email:'إرسال البريد للعملاء',delete:'الحذف',log:'السجل الكامل'};
const PERMS=Object.keys(PERM_L);
const isAdmin=()=>!ME||ME.role==='admin';
const can=p=>isAdmin()||((ME.perms||[]).includes(p));
function applyPerms(){const show=(sel,on)=>document.querySelectorAll(sel).forEach(el=>el.hidden=!on);
  show('#tabs [data-tab=req]',can('requests'));show('#tabs [data-tab=msg]',can('messages'));show('#tabEmp',isAdmin());
  show('#newCli,#cEdit',can('clients_edit'));show('#cTxn,#newTx',can('transactions'));show('#cMail',can('email'));show('#cMsgP',can('messages'));
  show('#fileF',can('files'));show('#delT,#delC',can('delete'));show('#delC',isAdmin());
  $('myPerms').textContent=isAdmin()?'مدير: كل الصلاحيات، وإدارة الموظفين وتقاريرهم.':(ME.perms||[]).map(p=>PERM_L[p]).join('، ')||'لا توجد صلاحيات بعد. راجع المدير.'}

// ---- my login ----
function renderSet(){if(!ME)return;$('meLine').textContent=`${ME.name||''}${ME.jobTitle?' · '+ME.jobTitle:''} · ${ME.role==='admin'?'مدير':'موظف'}`;if(!$('meUn').value)$('meUn').value=ME.username;applyPerms();if(tab==='emp')renderEmp()}
$('meF').onsubmit=async e=>{e.preventDefault();$('meErr').textContent='';const pw=$('mePw').value;
  if(pw&&pw!==$('mePw2').value){$('meErr').textContent='كلمتا المرور غير متطابقتين.';return}
  try{const o={old:$('meOld').value,username:$('meUn').value.trim()};if(pw)o.password=pw;ME=await S.changeOwn(o);$('meF').reset();$('meUn').value=ME.username;toast('تم الحفظ')}catch(err){$('meErr').textContent=errText(err.message)}};

// ---- employees: accounts, permissions, attendance and work reports (admin) ----
let STAFFL=[],REP=null,repSel=null;
$('permL').innerHTML=PERMS.map(p=>`<label class="chk"><input type="checkbox" value="${p}"> ${PERM_L[p]}</label>`).join('');
const permBoxes=()=>[...$('permL').querySelectorAll('input')];
$('permAll').onclick=()=>permBoxes().forEach(b=>b.checked=true);$('permNone').onclick=()=>permBoxes().forEach(b=>b.checked=false);
$('fS').elements.role.onchange=()=>{$('permBox').hidden=$('fS').elements.role.value==='admin'};
$('sGen').onclick=()=>{$('fS').elements.password.value=genPw()};
let editS=null;
function openStaff(x){editS=x||{};const f=$('fS');f.reset();$('sErr').textContent='';
  ['name','jobTitle','username','phone','email','qid','hireDate','shiftStart','shiftEnd','workDays','notes'].forEach(k=>f.elements[k].value=editS[k]||'');
  f.elements.role.value=editS.role||'staff';f.elements.status.value=editS.status||'مفعّل';
  const ps=editS.id?(editS.perms||[]):['requests','clients_view','transactions','messages','files'];permBoxes().forEach(b=>b.checked=ps.includes(b.value));
  $('permBox').hidden=f.elements.role.value==='admin';$('dlgST').textContent=editS.id?`تعديل الموظف ${editS.username}`:'إضافة موظف';
  if(!editS.id)f.elements.password.value=genPw();$('sPwHint').textContent=editS.id?'اتركها فارغة للإبقاء على كلمة مروره.':'أرسلها للموظف، وسيغيّرها عند أول دخول.';$('dlgS').showModal()}
$('addEmp').onclick=()=>openStaff(null);
$('fS').addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;e.preventDefault();const f=$('fS').elements,body={};
  ['name','jobTitle','username','phone','email','qid','hireDate','shiftStart','shiftEnd','workDays','notes','role','status'].forEach(k=>body[k]=f[k].value.trim());
  if(f.password.value)body.password=f.password.value;body.perms=permBoxes().filter(b=>b.checked).map(b=>b.value);if(editS.id)body.id=editS.id;
  try{await S.api('staffSave',body);$('dlgS').close();toast(body.password?`تم الحفظ. أرسل للموظف: ${body.username} / ${body.password}`:'تم الحفظ');loadStaff()}catch(err){$('sErr').textContent=errText(err.message)}});
async function loadStaff(){try{STAFFL=(await S.api('staffUsers',{})).rows}catch(e){return}
  $('staffL').innerHTML=table(['الاسم','المسمى','اسم المستخدم','الدوام','الصلاحيات','الحالة','آخر دخول',''],STAFFL.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.jobTitle||'')}</td><td dir="ltr">${esc(x.username)}</td><td class="num">${esc(x.shiftStart||'')}${x.shiftEnd?' – '+esc(x.shiftEnd):''}</td>
    <td><small>${x.role==='admin'?'مدير: كاملة':(x.perms.length===PERMS.length?'كاملة':`جزئية (${x.perms.length} من ${PERMS.length})`)}</small></td><td>${esc(x.status)}${x.mustChange?' · <small class="mute">لم يغيّر كلمة المرور المؤقتة</small>':''}</td><td class="num">${esc(x.lastLogin||'')}</td>
    <td><button class="btn xs ghost" type="button" data-se="${x.id}">تعديل</button></td></tr>`))}
$('staffL').onclick=e=>{const b=e.target.closest('[data-se]');if(b)openStaff(STAFFL.find(y=>y.id===b.dataset.se))};
const dstr=d=>{const p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
function period(){const v=$('repP').value,t=new Date();let f=new Date(t),to=new Date(t);
  if(v==='yesterday'){f.setDate(t.getDate()-1);to=new Date(f)}else if(v==='week')f.setDate(t.getDate()-6);else if(v==='month')f=new Date(t.getFullYear(),t.getMonth(),1);
  else if(v==='custom')return [$('repF').value||dstr(t),$('repT').value||$('repF').value||dstr(t)];return [dstr(f),dstr(to)]}
$('repP').onchange=()=>{const c=$('repP').value==='custom';$('repFL').hidden=$('repTL').hidden=!c;if(!c)loadRep()};
const hm=m=>`${Math.floor((+m||0)/60)}:${String((+m||0)%60).padStart(2,'0')}`;
async function loadRep(){const [from,to]=period();try{REP=await S.api('report',{from,to})}catch(e){toast(errText(e.message));return}
  $('repT1').innerHTML=table(['الموظف','أيام الحضور','ساعات العمل','تأخير','كل الإجراءات','معاملات أضافها','معاملات أنجزها','تغيير حالات','ردود على العملاء','ملفات رفعها','عملاء أضافهم',''],REP.staff.map(x=>`<tr><td><b>${esc(x.name||x.username)}</b><br><small class="mute">${esc(x.jobTitle||'')} · <span dir="ltr">${esc(x.username)}</span></small></td>
    <td class="num">${x.days.length}</td><td class="num">${hm(x.minutes)}</td><td class="num ${x.late?'bad':''}">${x.late}</td><td class="num">${x.actions}</td><td class="num">${x.txCreated}</td><td class="num">${x.txDone}</td><td class="num">${x.statusChanges}</td><td class="num">${x.replies}</td><td class="num">${x.files}</td><td class="num">${x.clientsAdded}</td>
    <td><button class="btn xs ghost" type="button" data-rep="${x.id}">التفاصيل</button></td></tr>`));
  if(repSel)showRep(repSel);else $('repD').hidden=true}
function showRep(id){const x=REP.staff.find(y=>y.id===id);if(!x)return;repSel=id;$('repD').hidden=false;$('repDT').textContent=`${x.name||x.username}: ${REP.from}${REP.to!==REP.from?' إلى '+REP.to:''}${x.shiftStart?` · الدوام ${x.shiftStart}–${x.shiftEnd||''}`:''}`;
  $('repDays').innerHTML=table(['التاريخ','أول دخول','آخر خروج','مدة العمل','ملاحظات'],x.days.map(d=>`<tr><td class="num">${esc(d.date)}</td><td class="num ${d.late?'bad':''}">${esc(d.first)}</td><td class="num">${d.open?'<small class="mute">ما زال داخلاً</small>':esc(d.last)}</td><td class="num">${hm(d.minutes)}</td><td><small>${[d.late?'تأخر':'',d.early?'خرج مبكراً':'',d.sessions>1?d.sessions+' جلسات':''].filter(Boolean).join(' · ')}</small></td></tr>`));
  $('repLog').innerHTML=x.log.length?`<ul class="plain">${x.log.slice(0,80).map(l=>`<li><small class="mute num">${esc(l.created)}</small> ${esc(l.summary)}${l.clientId?' · '+link(l.clientId,cli(l.clientId).name||l.clientId):''}</li>`).join('')}</ul>`:'<p class="mute">لا توجد أعمال مسجلة في هذه الفترة.</p>';
  $('repD').scrollIntoView({behavior:'smooth',block:'start'})}
$('repT1').onclick=e=>{const b=e.target.closest('[data-rep]');if(b)showRep(b.dataset.rep)};
$('repGo').onclick=loadRep;
$('repCsv').onclick=()=>{if(!REP)return;const q=v=>'"'+String(v==null?'':v).replace(/"/g,'""')+'"';
  const rows=[['الموظف','اسم المستخدم','التاريخ','أول دخول','آخر خروج','مدة العمل','تأخر','الإجراءات (الفترة)','معاملات أضافها','معاملات أنجزها','ردود','ملفات'].map(q).join(',')];
  REP.staff.forEach(x=>{(x.days.length?x.days:[{}]).forEach((d,i)=>rows.push([x.name,x.username,d.date||'',d.first||'',d.open?'':d.last||'',d.date?hm(d.minutes):'',d.late?'نعم':'',i?'':x.actions,i?'':x.txCreated,i?'':x.txDone,i?'':x.replies,i?'':x.files].map(q).join(',')))});
  download(`staff-report-${REP.from}-${REP.to}.csv`,'﻿'+rows.join('\r\n'),'text/csv;charset=utf-8')};
$('repMail').onclick=async()=>{const [from,to]=period();try{const j=await S.api('reportEmail',{from,to});toast('أُرسل التقرير إلى '+j.to)}catch(e){toast(errText(e.message))}};
function renderEmp(){if(!REMOTE){$('repT1').innerHTML=NEEDS_SERVER;$('staffL').innerHTML='';$('addEmp').hidden=true;return}loadStaff();loadRep()}

// ---- transactions ----
STATUSES.forEach(s=>$('txF').insertAdjacentHTML('beforeend',`<option>${s}</option>`));
$('txF').onchange=$('txQ').oninput=renderTx;
function txTable(list,withClient=true){return table(['الرقم','الخدمة',...(withClient?['العميل']:[]),'الحالة','الأتعاب','الرسوم','المتبقي','الموعد المتوقع','انتهاء المستند','المستندات'],list.map(t=>{
  const docs=parseDocs(t.docs),got=docs.filter(d=>d.ok).length,dd=days(t.dueDate),rem=(+t.fee||0)+(+t.govFee||0)-(+t.paid||0);
  return `<tr><td class="num"><a href="#" data-txn="${t.id}">${esc(t.id)}</a></td><td>${esc(t.service)} <span class="code">${esc(t.code)}</span></td>${withClient?`<td>${link(t.clientId,cli(t.clientId).name)}</td>`:''}<td>${stTag(t.status)}</td><td class="num">${fmt(t.fee)}</td><td class="num">${fmt(t.govFee)}</td><td class="num ${rem>0?'bad':''}">${fmt(rem)}</td>
  <td class="num ${dd!==null&&dd<0&&!CLOSED.includes(t.status)?'bad':''}">${esc(t.dueDate||'')}</td><td class="num">${esc(t.expiryDate||'')}</td><td class="num">${docs.length?`${got}/${docs.length}`:''}</td></tr>`}))}
function renderTx(){const f=$('txF').value,q=$('txQ').value.trim();
  const list=DB.Transactions.filter(t=>(!f||(f==='open'?!CLOSED.includes(t.status):t.status===f))&&(!q||[t.service,t.code,t.govRef,t.id,cli(t.clientId).name].join(' ').includes(q))).sort((a,b)=>a.created<b.created?1:-1);
  $('txT').innerHTML=txTable(list)}
$('newTx').onclick=()=>openTx({status:'بانتظار المستندات',startDate:iso()});
const fT=$('fT');
STATUSES.forEach(s=>fT.elements.status.insertAdjacentHTML('beforeend',`<option>${s}</option>`));
(()=>{const sel=fT.elements.code;sel.innerHTML='<option value="">اختر الخدمة…</option>';const groups={};CAT.forEach(s=>(groups[s.g]=groups[s.g]||[]).push(s));
  Object.entries(groups).forEach(([g,l])=>{const og=document.createElement('optgroup');og.label=g;l.forEach(s=>og.insertAdjacentHTML('beforeend',`<option value="${s.c}">${esc(s.n)} · ${fmt(s.p)}</option>`));sel.appendChild(og)});
  sel.insertAdjacentHTML('beforeend','<option value="OTHER">خدمة أخرى غير مدرجة</option>')})();
let editT=null,tDocs=[];
function drawDocs(){$('tDocs').innerHTML=tDocs.map((d,i)=>`<label class="chk"><input type="checkbox" data-di="${i}" ${d.ok?'checked':''}> ${esc(d.t)}</label>`).join('')||'<p class="mute sm">اختر الخدمة لتظهر مستنداتها.</p>'}
$('tDocs').addEventListener('change',e=>{const i=e.target.dataset.di;if(i!=null)tDocs[i].ok=e.target.checked});
$('tDocAdd').onclick=()=>{const v=$('tDocNew').value.trim();if(v){tDocs.push({t:v,ok:false});$('tDocNew').value='';drawDocs()}};
function openTx(t){if(!t)return;editT=t;fT.reset();
  fT.elements.clientId.innerHTML='<option value="">اختر العميل…</option>'+DB.Clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.phone)}</option>`).join('');
  Object.keys(t).forEach(k=>{if(fT.elements[k]&&k!=='docs')fT.elements[k].value=t[k]==null?'':t[k]});
  tDocs=parseDocs(t.docs);drawDocs();$('delT').hidden=!t.id;$('dlgTT').textContent=t.id?`المعاملة ${t.id}`:'معاملة جديدة';$('dlgT').showModal()}
fT.elements.code.onchange=()=>{const s=SVC[fT.elements.code.value];if(!s)return;if(!fT.elements.fee.value)fT.elements.fee.value=s.p;
  if(!tDocs.length){tDocs=docsFor(s.c).map(t=>({t,ok:false}));drawDocs()}};
fT.elements.status.onchange=()=>{if(CLOSED.includes(fT.elements.status.value)&&!fT.elements.closed.value)fT.elements.closed.value=iso()};
fT.addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;
  const row=Object.assign({},editT),before=editT.status;[...fT.elements].forEach(el=>{if(el.name)row[el.name]=el.value.trim()});
  row.service=(SVC[row.code]||{}).n||row.service||'خدمة أخرى';row.docs=JSON.stringify(tDocs);
  const r=await saveRow('Transactions',row);
  if(before!==r.status)await saveRow('Log',{clientId:r.clientId,txnId:r.id,kind:'status',subject:`${r.service}: ${before?before+' ← ':''}${r.status}`,by:'CRM'});
  renderAll();
  if(before&&before!==r.status&&cli(r.clientId).email&&await ask('تغيرت حالة المعاملة. هل تريد إبلاغ العميل بالبريد؟',{ok:'اكتب البريد'}))openMail(cli(r.clientId),r,r.status==='منجزة'?'done':(r.status==='بانتظار المستندات'?'docs':'status'))});
$('delT').onclick=async()=>{$('dlgT').close();if(!await ask('حذف المعاملة نهائياً؟',{ok:'حذف'}))return;await S.del('Transactions',editT.id);await reload()};

// ---- email ----
const TPL={
  recv:['تأكيد استلام الطلب','استلمنا طلبك | منجز لخدمات الأعمال','السلام عليكم {name}،\n\nشكراً لتواصلك مع منجز لخدمات الأعمال. استلمنا طلبك وسنراجعه ونعود إليك خلال ساعتين عمل بقائمة المستندات والسعر.\n\nمع التحية،\nفريق منجز لخدمات الأعمال'],
  docs:['طلب المستندات','المستندات المطلوبة لمعاملتك | منجز لخدمات الأعمال','السلام عليكم {name}،\n\nلإتمام {service} نحتاج المستندات التالية:\n{docs}\n\nأتعاب منجز: {fee} ر.ق، والرسوم الحكومية تُدفع منفصلة بإيصالها الرسمي.\nيمكنك الرد على هذا البريد بالمستندات أو إرسالها على واتساب ‎+974 51600498 أو البريد munijizqa@gmail.com.\n\nمع التحية،\nفريق منجز لخدمات الأعمال'],
  status:['تحديث حالة المعاملة','تحديث على معاملتك {txn} | منجز لخدمات الأعمال','السلام عليكم {name}،\n\nنبلغك أن حالة معاملتك ({service}) أصبحت: {status}.\n{ref}\nسنبلغك بأي تحديث جديد.\n\nمع التحية،\nفريق منجز لخدمات الأعمال'],
  done:['إنجاز المعاملة','تم إنجاز معاملتك {txn} | منجز لخدمات الأعمال','السلام عليكم {name}،\n\nيسعدنا إبلاغك بإنجاز معاملتك ({service}).\n{expiry}\nسنسلّمك المستند والإيصالات الرسمية، وسنذكّرك قبل موعد التجديد.\n\nشكراً لثقتك،\nفريق منجز لخدمات الأعمال'],
  renew:['تذكير بالتجديد','تذكير: موعد تجديد قريب | منجز لخدمات الأعمال','السلام عليكم {name}،\n\nنذكّرك بأن {service} ينتهي بتاريخ {expiryDate}. يمكننا تجديده لك قبل الموعد لتجنب الغرامات.\nرد على هذا البريد أو راسلنا على واتساب ‎+974 51600498 أو البريد munijizqa@gmail.com لنبدأ.\n\nمع التحية،\nفريق منجز لخدمات الأعمال'],
  quote:['عرض سعر','عرض سعر من منجز لخدمات الأعمال','السلام عليكم {name}،\n\nبناءً على طلبك، نرفق عرض السعر التالي:\n- الخدمة: {service}\n- أتعاب منجز: {fee} ر.ق\n- الرسوم الحكومية التقديرية: {govFee} ر.ق (تُدفع بإيصال رسمي)\n\nالعرض ساري 14 يوماً.\n\nمع التحية،\nفريق منجز لخدمات الأعمال'],
  free:['رسالة حرة','','السلام عليكم {name}،\n\n\n\nمع التحية،\nفريق منجز لخدمات الأعمال']
};
Object.entries(TPL).forEach(([k,[n]])=>$('mTpl').insertAdjacentHTML('beforeend',`<option value="${k}">${n}</option>`));
let mCtx=null;
function fill(s){const c=mCtx.c||{},t=mCtx.t||{};const docs=parseDocs(t.docs).filter(d=>!d.ok).map(d=>'- '+d.t).join('\n')||(t.code?docsFor(t.code).map(d=>'- '+d).join('\n'):'- (حدد المستندات)');
  return s.replace(/\{name\}/g,c.name||'').replace(/\{service\}/g,t.service||'الخدمة المطلوبة').replace(/\{txn\}/g,t.id||'').replace(/\{status\}/g,t.status||'').replace(/\{fee\}/g,fmt(t.fee)).replace(/\{govFee\}/g,fmt(t.govFee))
    .replace(/\{docs\}/g,docs).replace(/\{ref\}/g,t.govRef?`رقم الطلب لدى الجهة: ${t.govRef}`:'').replace(/\{expiry\}/g,t.expiryDate?`تاريخ انتهاء المستند: ${t.expiryDate}`:'').replace(/\{expiryDate\}/g,t.expiryDate||'')}
function applyTpl(){const [,sub,body]=TPL[$('mTpl').value];const f=$('fM');f.elements.subject.value=fill(sub);f.elements.body.value=fill(body)}
$('mTpl').onchange=applyTpl;
function openMail(c,t,tpl){if(!t&&c&&c.id){t=DB.Transactions.filter(x=>x.clientId===c.id).sort((a,b)=>a.created<b.created?1:-1)[0]||null}
  mCtx={c,t};const f=$('fM');f.reset();f.elements.to.value=c.email||'';$('mTpl').value=tpl||(t?'status':'recv');applyTpl();
  $('mHint').textContent=CFG.API?'يُرسل من بريد المكتب مباشرة ويُسجَّل في سجل العميل.':'الوضع المحلي: سيفتح برنامج البريد لديك برسالة جاهزة، وتُسجَّل في سجل العميل.';$('dlgM').showModal()}
$('fM').addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='send')return;const f=$('fM');
  try{await S.mail({to:f.elements.to.value.trim(),subject:f.elements.subject.value,body:f.elements.body.value,clientId:(mCtx.c||{}).id||'',txnId:(mCtx.t||{}).id||''});toast(CFG.API?'أُرسل البريد':'فُتح برنامج البريد');await reload()}catch(err){toast('تعذر الإرسال: '+err.message)}});

// ---- log, export, backup ----
const KIND={email:'بريد',note:'ملاحظة',status:'تحديث',request:'طلب من الموقع',error:'خطأ',account:'حساب',file:'ملف',credential:'بوابة',message:'مراسلة',profile:'بيانات العميل',register:'تسجيل'};
const logItem=l=>`<div class="logi"><span class="k k-${esc(l.kind)}">${KIND[l.kind]||esc(l.kind)}</span><div><b>${esc(l.subject)}</b> ${l.txnId?`<a href="#" data-txn="${esc(l.txnId)}" class="code">${esc(l.txnId)}</a>`:''}${l.body?`<div class="pre mute sm">${esc(String(l.body).slice(0,400))}</div>`:''}</div><small class="mute num">${esc(l.created)}</small></div>`;
function renderLog(){const l=[...DB.Log].sort((a,b)=>a.created<b.created?1:-1).slice(0,300);
  $('logL').innerHTML=l.length?l.map(x=>`${x.clientId?`<div class="mute sm">${link(x.clientId,cli(x.clientId).name)}</div>`:''}${logItem(x)}`).join(''):'<div class="empty">لا توجد أحداث.</div>';$('restoreL').hidden=!!CFG.API}
const HEAD={Clients:['الرقم','تاريخ الإضافة','الاسم','النوع','الجوال','البريد','الرقم الشخصي','السجل التجاري','بطاقة المنشأة','الرقم الضريبي','الباقة','نهاية الاشتراك','العنوان','المصدر','المتطلبات','ملاحظات','آخر تحديث'],
  Transactions:['الرقم','تاريخ الإنشاء','رقم العميل','رمز الخدمة','الخدمة','الحالة','الأتعاب','الرسوم الحكومية','المدفوع','رقم الطلب لدى الجهة','تاريخ البدء','الموعد المتوقع','انتهاء المستند','المسؤول','المستندات','ملاحظات','تاريخ الإغلاق','آخر تحديث'],
  Requests:['الرقم','التاريخ','الاسم','الجوال','البريد','النوع','الباقة','الخدمات','الرموز','اللغة','الحالة','رقم العميل','أُرسل التأكيد','ملاحظات','آخر تحديث'],
  Log:['الرقم','التاريخ','رقم العميل','رقم المعاملة','النوع','الموضوع','النص','بواسطة']};
const COLS={Clients:['id','created','name','type','phone','email','qid','cr','estCard','taxNo','plan','planEnd','address','source','requirements','notes','updated'],
  Transactions:['id','created','clientId','code','service','status','fee','govFee','paid','govRef','startDate','dueDate','expiryDate','assignee','docs','notes','closed','updated'],
  Requests:['id','created','name','phone','email','type','plan','services','codes','lang','status','clientId','mailed','notes','updated'],
  Log:['id','created','clientId','txnId','kind','subject','body','by']};
function download(name,text,type){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.hidden=true;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}
function exportCsv(sheet){const q=v=>{v=v==null?'':String(v);if(sheet==='Transactions'&&v.startsWith('[{'))v=parseDocs(v).map(d=>(d.ok?'✓ ':'✗ ')+d.t).join(' | ');return '"'+v.replace(/"/g,'""')+'"'};
  const rows=[HEAD[sheet].map(q).join(','),...DB[sheet].map(r=>COLS[sheet].map(c=>q(c==='phone'||c==='qid'?(r[c]?'‎'+r[c]:''):r[c])).join(','))];
  download(`munjiz-${{Clients:'clients',Transactions:'transactions',Requests:'requests',Log:'log'}[sheet]}-${iso()}.csv`,'﻿'+rows.join('\r\n'),'text/csv;charset=utf-8')}
$('backup').onclick=()=>download(`munjiz-backup-${iso()}.json`,JSON.stringify(DB,null,1),'application/json');
$('restore').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!['Clients','Transactions','Requests','Log'].every(s=>Array.isArray(d[s])))throw 0;
  if(!await ask('سيستبدل هذا كل البيانات الحالية على هذا الجهاز. متابعة؟',{ok:'استرجاع'}))return;Local.put(d);await reload();toast('تم الاسترجاع')}catch(err){toast('ملف غير صالح')}e.target.value=''};

async function saveRow(sheet,row){try{const r=await S.save(sheet,row);const arr=DB[sheet],i=arr.findIndex(x=>x.id===r.id);if(i>=0)arr[i]=r;else arr.push(r);return r}catch(e){toast('تعذر الحفظ: '+e.message);throw e}}

showMode();
// sign-in handed over from the account-type choice on portal.html (same tab, read once and removed)
let HAND=null;try{HAND=JSON.parse(sessionStorage.getItem('munjiz_crm_handoff')||'null');sessionStorage.removeItem('munjiz_crm_handoff')}catch(e){}
if(HAND){sessionStorage.removeItem(TKEY);showLogin();$('un').value=HAND.u||'';$('pw').value=HAND.p||'';$('loginF').requestSubmit?$('loginF').requestSubmit():$('loginBtn').click()}
else if(S.tok())S.me().then(m=>{ME=m;if(m&&m.mustChange){logout();return}start()}).catch(()=>showLogin());else showLogin();
