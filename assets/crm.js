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
const SHEETS=['Clients','Transactions','Requests','Log','Accounts','Files','Consents','Credentials','Messages','Tasks','Payments','Expenses','Coa','Journal','Leaves','Payroll','Evals','Budget','Reviews'];
const PREFIX={Clients:'C',Transactions:'T',Requests:'R',Log:'L',Accounts:'A',Files:'F',Consents:'K',Credentials:'P',Messages:'M',Tasks:'J',Payments:'Y',Expenses:'E',Coa:'G',Journal:'V',Leaves:'H',Payroll:'Q',Evals:'U',Budget:'B'};
const EN=window.CRM_LANG==='en',L=(a,e)=>EN?e:a;   // texts built in code; the static page is translated by crm-i18n.js
const ERR={no_permission:'ليست لديك صلاحية لهذا الإجراء. راجع المدير.',wrong_password:'اسم المستخدم أو كلمة المرور غير صحيحة.',rate_limited:'محاولات كثيرة، حاول بعد ساعة.',weak_password:'كلمة المرور 8 أحرف على الأقل.',bad_username:'اسم المستخدم غير صالح (3 أحرف على الأقل وبدون مسافات).',
  username_taken:'اسم المستخدم مستخدم من قبل.',must_change_both:'غيّر اسم المستخدم (ليس 123) وكلمة المرور معاً.',admin_only:'هذا الإجراء للمدير فقط.',last_admin:'لا يمكن إيقاف آخر مدير أو تحويله إلى موظف.',
  too_large:'الملف أكبر من 10 ميجابايت.',not_found:'غير موجود.',invalid:'بيانات غير مكتملة.',read_only:'لا يمكن تعديل هذا السجل مباشرة.',must_change:'غيّر بيانات الدخول أولاً.',period_locked:'هذه الفترة المالية مقفلة. لا يمكن التسجيل أو التعديل بتاريخ يقع فيها.',unbalanced:'القيد غير متوازن.'};
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
  async changeOwn(o){const j=await this.call(Object.assign({action:'staffPass',token:this.tok()},o));if(j.token)sessionStorage.setItem(TKEY,j.token);return j.me},
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
  // local mode keeps one admin login on this device, changed on first sign-in
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
function hideAll(){$('login').hidden=$('chg').hidden=true;$('tabs').hidden=$('groups').hidden=true;document.querySelectorAll('.view').forEach(v=>v.hidden=true)}
function showLogin(){hideAll();$('login').hidden=false;
  $('loginHint').textContent='اكتب اسم المستخدم وكلمة المرور.';
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
async function start(){hideAll();$('tabs').hidden=$('groups').hidden=false;await reload();go(isAdmin()?'mgr':'my')}
async function reload(){try{DB=await S.list();SHEETS.forEach(s=>DB[s]=DB[s]||[])}catch(e){toast(e.message)}if(!ME)try{ME=await S.me()}catch(e){}
  if(!Array.isArray(DB.Staff)||!DB.Staff.length)DB.Staff=ME?[{username:ME.username,name:ME.name||ME.username,role:ME.role}]:[];renderAll()}

// ---- navigation ----
let tab='dash',curClient=null;
$('tabs').addEventListener('click',e=>{const b=e.target.closest('button[data-tab]');if(b)go(b.dataset.tab)});
function go(t,id){tab=t;document.querySelectorAll('.view').forEach(v=>v.hidden=true);
  if(t==='client'){curClient=id;$('v-client').hidden=false;renderClient()}else $('v-'+t).hidden=false;
  if(t==='emp')renderEmp();if(t!=='theme'&&window.SITE_THEME){thSel=null;SITE_THEME.apply(SITE_THEME.current)}if(VIEWS[t])VIEWS[t]();
  const cur=t==='client'?'cli':t,btn=document.querySelector(`#tabs [data-tab="${cur}"]`),g=btn?btn.dataset.g:'work';
  document.querySelectorAll('#tabs [data-tab]').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.tab===cur);b.classList.toggle('off',b.dataset.g!==g)});
  document.querySelectorAll('#groups [data-grp]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.grp===g));
  $('tabs').classList.toggle('single',document.querySelectorAll(`#tabs [data-g="${g}"]:not([hidden])`).length<2);window.scrollTo(0,0)}
// the sections in the header open their first page the signed-in person may use
$('groups').addEventListener('click',e=>{const b=e.target.closest('[data-grp]');if(!b)return;const f=document.querySelector(`#tabs [data-g="${b.dataset.grp}"]:not([hidden])`);if(f)go(f.dataset.tab)});
// direct links: crm.html#fin (المالية), #acc, #hr, #set, #work, #home open that section after sign-in
let hashDone=false;
function openHash(){const b=document.querySelector(`#groups [data-grp="${location.hash.slice(1)}"]:not([hidden])`);if(b)setTimeout(()=>b.click(),0)}
addEventListener('hashchange',openHash);
function renderAll(){renderDash();renderReq();renderCli();renderTx();renderLog();renderMsg();renderSet();renderMyCount();if(VIEWS[tab])VIEWS[tab]();if(tab==='client')renderClient()}
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
const PERM_L={assign:'توزيع العمل وتكليف الموظفين',hr:'الموارد البشرية (الإجازات والرواتب والتقييمات)',requests:'الطلبات الواردة',clients_view:'عرض العملاء وملفاتهم',clients_edit:'إضافة العملاء وتعديلهم',transactions:'المعاملات وحالاتها',finance:'الأتعاب والمدفوعات',messages:'المراسلات والرد على العملاء',
  files:'رفع الملفات والتراخيص',accounts:'حسابات العملاء (تفعيل وكلمات مرور)',credentials:'إظهار كلمات مرور البوابات',email:'إرسال البريد للعملاء',delete:'الحذف',log:'السجل الكامل'};
const PERMS=Object.keys(PERM_L);
const isAdmin=()=>!ME||ME.role==='admin';
const can=p=>isAdmin()||((ME.perms||[]).includes(p));
function applyPerms(){const show=(sel,on)=>document.querySelectorAll(sel).forEach(el=>el.hidden=!on);
  show('#tabTheme',isAdmin());show('#tabCat',isAdmin());show('#tabRev',isAdmin());
  show('#tabs [data-tab=req]',can('requests'));show('#tabWork,#newTask',can('assign'));show('#tabs .pf',can('finance'));show('#tabs .ph',can('hr'));show('#tabMgr',isAdmin());show('#tabs [data-tab=msg]',can('messages'));show('#tabEmp',isAdmin());
  show('#newCli,#cEdit',can('clients_edit'));show('#cTxn,#newTx',can('transactions'));show('#cMail',can('email'));show('#cMsgP',can('messages'));
  show('#fileF',can('files'));show('#delT,#delC',can('delete'));show('#delC',isAdmin());
  document.querySelectorAll('#groups [data-grp]').forEach(b=>b.hidden=!document.querySelector(`#tabs [data-g="${b.dataset.grp}"]:not([hidden])`));
  if(!hashDone){hashDone=true;openHash()}
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
const HRK=['empNo','department','specialty','skills','qualification','experience','languages','birthDate','gender','maritalStatus','address','workLocation','manager','probationEnd','qidExpiry','passportNo','passportExpiry','visaExpiry','healthCardExpiry','licenseExpiry','emergencyName','emergencyRelation','emergencyPhone','bankName','iban'];
function openStaff(x){editS=x||{};const f=$('fS');f.reset();$('sErr').textContent='';
  f.elements.manager.innerHTML='<option value="">—</option>'+(STAFFL.length?STAFFL:(DB.Staff||[])).filter(y=>y.username!==editS.username).map(y=>`<option value="${esc(y.username)}">${esc(y.name||y.username)}</option>`).join('');
  HRK.forEach(k=>f.elements[k].value=editS[k]==null?'':editS[k]);
  ['name','jobTitle','username','phone','email','qid','hireDate','shiftStart','shiftEnd','workDays','notes','nationality','contractType','contractStart','contractEnd','salary','allowance','leaveDays'].forEach(k=>f.elements[k].value=editS[k]==null?'':editS[k]);
  f.elements.role.value=editS.role||'staff';f.elements.status.value=editS.status||'مفعّل';
  const ps=editS.id?(editS.perms||[]):['requests','clients_view','transactions','messages','files'];permBoxes().forEach(b=>b.checked=ps.includes(b.value));
  $('permBox').hidden=f.elements.role.value==='admin';$('dlgST').textContent=editS.id?`تعديل الموظف ${editS.username}`:'إضافة موظف';
  if(!editS.id)f.elements.password.value=genPw();$('sPwHint').textContent=editS.id?'اتركها فارغة للإبقاء على كلمة مروره.':'أرسلها للموظف، وسيغيّرها عند أول دخول.';$('dlgS').showModal()}
$('addEmp').onclick=()=>openStaff(null);
$('fS').addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;e.preventDefault();const f=$('fS').elements,body={};
  ['name','jobTitle','username','phone','email','qid','hireDate','shiftStart','shiftEnd','workDays','notes','role','status','nationality','contractType','contractStart','contractEnd','salary','allowance','leaveDays',...HRK].forEach(k=>body[k]=f[k].value.trim());
  if(f.password.value)body.password=f.password.value;body.perms=permBoxes().filter(b=>b.checked).map(b=>b.value);if(editS.id)body.id=editS.id;
  try{await S.api('staffSave',body);$('dlgS').close();toast(body.password?`تم الحفظ. أرسل للموظف: ${body.username} / ${body.password}`:'تم الحفظ');loadStaff();reload()}catch(err){$('sErr').textContent=errText(err.message)}});
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
function txTable(list,withClient=true){return table(['الرقم','الخدمة',...(withClient?['العميل']:[]),'الحالة','المسؤول','الإنجاز','الأتعاب','الرسوم','المتبقي','الموعد المتوقع','انتهاء المستند','المستندات'],list.map(t=>{
  const docs=parseDocs(t.docs),got=docs.filter(d=>d.ok).length,dd=days(t.dueDate),rem=(+t.fee||0)+(+t.govFee||0)-(+t.paid||0);
  return `<tr><td class="num"><a href="#" data-txn="${t.id}">${esc(t.id)}</a></td><td>${esc(t.service)} <span class="code">${esc(t.code)}</span></td>${withClient?`<td>${link(t.clientId,cli(t.clientId).name)}</td>`:''}<td>${stTag(t.status)}</td><td>${esc(staffName(t.assignee))}</td><td>${progBar(txProgress(t))}</td><td class="num">${fmt(t.fee)}</td><td class="num">${fmt(t.govFee)}</td><td class="num ${rem>0?'bad':''}">${fmt(rem)}</td>
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
  fT.elements.assignee.innerHTML=staffOptions(t.assignee);
  fT.elements.clientId.innerHTML='<option value="">اختر العميل…</option>'+DB.Clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)} · ${esc(c.phone)}</option>`).join('');
  Object.keys(t).forEach(k=>{if(fT.elements[k]&&k!=='docs')fT.elements[k].value=t[k]==null?'':t[k]});
  fT.elements.progress.value=txProgress(t);$('tProgV').textContent=fT.elements.progress.value+'%';drawTxPays(t);
  tDocs=parseDocs(t.docs);drawDocs();$('delT').hidden=!t.id;$('dlgTT').textContent=t.id?`المعاملة ${t.id}`:'معاملة جديدة';$('dlgT').showModal()}
fT.elements.code.onchange=()=>{const s=SVC[fT.elements.code.value];if(!s)return;if(!fT.elements.fee.value)fT.elements.fee.value=s.p;
  if(!tDocs.length){tDocs=docsFor(s.c).map(t=>({t,ok:false}));drawDocs()}};
fT.elements.status.onchange=()=>{const v=fT.elements.status.value;if(CLOSED.includes(v)&&!fT.elements.closed.value)fT.elements.closed.value=iso();fT.elements.progress.value=v==='منجزة'?100:Math.max(+fT.elements.progress.value||0,TX_PROGRESS[v]||0);$('tProgV').textContent=fT.elements.progress.value+'%'};
fT.elements.progress.oninput=()=>{$('tProgV').textContent=fT.elements.progress.value+'%'};
fT.addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;
  const row=Object.assign({},editT),before=editT.status;[...fT.elements].forEach(el=>{if(el.name)row[el.name]=el.value.trim()});
  row.service=(SVC[row.code]||{}).n||row.service||'خدمة أخرى';row.docs=JSON.stringify(tDocs);row.paid=editT.paid||'';
  row.progress=row.status==='منجزة'?100:+row.progress;
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
// English versions of the same emails, for clients who signed up in English (or by choice in the dialog)
const SIGN_EN='\n\nKind regards,\nMunjiz Business Services team',CONTACT_EN='WhatsApp +974 51600498 or email munijizqa@gmail.com';
const TPL_EN={
  recv:['Request received | Munjiz Business Services','Dear {name},\n\nThank you for contacting Munjiz Business Services. We have received your request and will review it and come back to you within two working hours with the documents needed and the price.'+SIGN_EN],
  docs:['Documents needed for your transaction | Munjiz Business Services','Dear {name},\n\nTo complete {service} we need the following documents:\n{docs}\n\nMunjiz fee: {fee} QAR. Government fees are paid separately against their official receipt.\nYou can reply to this email with the documents, or send them by '+CONTACT_EN+'.'+SIGN_EN],
  status:['Update on your transaction {txn} | Munjiz Business Services','Dear {name},\n\nThe status of your transaction ({service}) is now: {status}.\n{ref}\nWe will let you know of any further update.'+SIGN_EN],
  done:['Your transaction {txn} is completed | Munjiz Business Services','Dear {name},\n\nWe are pleased to tell you that your transaction ({service}) is completed.\n{expiry}\nWe will hand you the document and the official receipts, and remind you before it is due for renewal.\n\nThank you for your trust,\nMunjiz Business Services team'],
  renew:['Reminder: a renewal is coming up | Munjiz Business Services','Dear {name},\n\nThis is a reminder that {service} expires on {expiryDate}. We can renew it for you before then to avoid fines.\nReply to this email or contact us by '+CONTACT_EN+' to start.'+SIGN_EN],
  quote:['Quote from Munjiz Business Services','Dear {name},\n\nAs requested, here is our quote:\n- Service: {service}\n- Munjiz fee: {fee} QAR\n- Estimated government fees: {govFee} QAR (paid against an official receipt)\n\nThe quote is valid for 14 days.'+SIGN_EN],
  free:['','Dear {name},\n\n'+SIGN_EN]
};
const ST_EN={'جديدة':'New','بانتظار المستندات':'Waiting for documents','قيد التقديم':'Being submitted','قيد المتابعة لدى الجهة':'With the authority','بانتظار العميل':'Waiting for you','منجزة':'Completed','ملغاة':'Cancelled'};
Object.entries(TPL).forEach(([k,[n]])=>$('mTpl').insertAdjacentHTML('beforeend',`<option value="${k}">${n}</option>`));
let mCtx=null;
function fill(s,en){const c=mCtx.c||{},t=mCtx.t||{},de=((D[t.code]||{}).en)||{};
  const docs=en?((de.docs||[]).map(d=>'- '+d).join('\n')||'- (list the documents)'):(parseDocs(t.docs).filter(d=>!d.ok).map(d=>'- '+d.t).join('\n')||(t.code?docsFor(t.code).map(d=>'- '+d).join('\n'):'- (حدد المستندات)'));
  return s.replace(/\{name\}/g,c.name||'').replace(/\{service\}/g,(en?de.name:t.service)||t.service||(en?'the requested service':'الخدمة المطلوبة')).replace(/\{txn\}/g,t.id||'').replace(/\{status\}/g,(en?ST_EN[t.status]:t.status)||t.status||'').replace(/\{fee\}/g,fmt(t.fee)).replace(/\{govFee\}/g,fmt(t.govFee))
    .replace(/\{docs\}/g,docs).replace(/\{ref\}/g,t.govRef?(en?`Authority reference: ${t.govRef}`:`رقم الطلب لدى الجهة: ${t.govRef}`):'').replace(/\{expiry\}/g,t.expiryDate?(en?`Document expiry: ${t.expiryDate}`:`تاريخ انتهاء المستند: ${t.expiryDate}`):'').replace(/\{expiryDate\}/g,t.expiryDate||'')}
function applyTpl(){const en=$('mLang').value==='en',k=$('mTpl').value,[sub,body]=en?TPL_EN[k]:TPL[k].slice(1);const f=$('fM');f.elements.subject.value=fill(sub,en);f.elements.body.value=fill(body,en)}
$('mTpl').onchange=$('mLang').onchange=applyTpl;
function openMail(c,t,tpl){if(!t&&c&&c.id){t=DB.Transactions.filter(x=>x.clientId===c.id).sort((a,b)=>a.created<b.created?1:-1)[0]||null}
  mCtx={c,t};const f=$('fM');f.reset();f.elements.to.value=c.email||'';
  const k=(DB.Consents||[]).filter(x=>x.clientId===c.id).sort((a,b)=>a.created<b.created?1:-1)[0];$('mLang').value=k&&k.lang?(k.lang==='en'?'en':'ar'):(window.CRM_LANG==='en'?'en':'ar');$('mTpl').value=tpl||(t?'status':'recv');applyTpl();
  $('mHint').textContent=CFG.API?'يُرسل من بريد المكتب مباشرة ويُسجَّل في سجل العميل.':'الوضع المحلي: سيفتح برنامج البريد لديك برسالة جاهزة، وتُسجَّل في سجل العميل.';$('dlgM').showModal()}
$('fM').addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='send')return;const f=$('fM');
  try{await S.mail({to:f.elements.to.value.trim(),subject:f.elements.subject.value,body:f.elements.body.value,lang:$('mLang').value,clientId:(mCtx.c||{}).id||'',txnId:(mCtx.t||{}).id||''});toast(CFG.API?'أُرسل البريد':'فُتح برنامج البريد');await reload()}catch(err){toast('تعذر الإرسال: '+err.message)}});

// ---- log, export, backup ----
const KIND={email:'بريد',note:'ملاحظة',status:'تحديث',request:'طلب من الموقع',error:'خطأ',account:'حساب',file:'ملف',credential:'بوابة',message:'مراسلة',profile:'بيانات العميل',register:'تسجيل',payment:'دفعة'};
const logItem=l=>`<div class="logi"><span class="k k-${esc(l.kind)}">${KIND[l.kind]||esc(l.kind)}</span><div><b>${esc(l.subject)}</b> ${l.txnId?`<a href="#" data-txn="${esc(l.txnId)}" class="code">${esc(l.txnId)}</a>`:''}${l.body?`<div class="pre mute sm">${esc(String(l.body).slice(0,400))}</div>`:''}</div><small class="mute num">${esc(l.created)}</small></div>`;
function renderLog(){const l=[...DB.Log].sort((a,b)=>a.created<b.created?1:-1).slice(0,300);
  $('logL').innerHTML=l.length?l.map(x=>`${x.clientId?`<div class="mute sm">${link(x.clientId,cli(x.clientId).name)}</div>`:''}${logItem(x)}`).join(''):'<div class="empty">لا توجد أحداث.</div>';$('restoreL').hidden=!!CFG.API}
const HEAD={Clients:['الرقم','تاريخ الإضافة','الاسم','النوع','الجوال','البريد','الرقم الشخصي','السجل التجاري','بطاقة المنشأة','الرقم الضريبي','الباقة','نهاية الاشتراك','العنوان','المصدر','المتطلبات','ملاحظات','آخر تحديث'],
  Transactions:['الرقم','تاريخ الإنشاء','رقم العميل','رمز الخدمة','الخدمة','الحالة','الأتعاب','الرسوم الحكومية','المدفوع','رقم الطلب لدى الجهة','تاريخ البدء','الموعد المتوقع','انتهاء المستند','المسؤول','المستندات','ملاحظات','تاريخ الإغلاق','آخر تحديث'],
  Requests:['الرقم','التاريخ','الاسم','الجوال','البريد','النوع','الباقة','الخدمات','الرموز','اللغة','الحالة','رقم العميل','أُرسل التأكيد','ملاحظات','آخر تحديث'],
  Log:['الرقم','التاريخ','رقم العميل','رقم المعاملة','النوع','الموضوع','النص','بواسطة'],
  Payments:['الرقم','التسجيل','رقم العميل','رقم المعاملة','تاريخ الدفع','المبلغ','طريقة الدفع','رقم السند','ملاحظة','سجّلها'],
  Expenses:['الرقم','التسجيل','التاريخ','البند','المبلغ','رقم المعاملة','رقم العميل','ملاحظة','سجّله']};
const COLS={Clients:['id','created','name','type','phone','email','qid','cr','estCard','taxNo','plan','planEnd','address','source','requirements','notes','updated'],
  Transactions:['id','created','clientId','code','service','status','fee','govFee','paid','govRef','startDate','dueDate','expiryDate','assignee','docs','notes','closed','updated'],
  Requests:['id','created','name','phone','email','type','plan','services','codes','lang','status','clientId','mailed','notes','updated'],
  Log:['id','created','clientId','txnId','kind','subject','body','by'],
  Payments:['id','created','clientId','txnId','date','amount','method','receiptNo','note','by'],
  Expenses:['id','created','date','category','amount','txnId','clientId','note','by']};
function download(name,text,type){if(window.CRM_I18N&&/csv/.test(type))text=CRM_I18N.csv(text);const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.hidden=true;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},2000)}
function exportCsv(sheet){const q=v=>{v=v==null?'':String(v);if(/^[=+\-@]/.test(v))v="'"+v;if(sheet==='Transactions'&&v.startsWith('[{'))v=parseDocs(v).map(d=>(d.ok?'✓ ':'✗ ')+d.t).join(' | ');return '"'+v.replace(/"/g,'""')+'"'};
  const rows=[HEAD[sheet].map(q).join(','),...DB[sheet].map(r=>COLS[sheet].map(c=>q(c==='phone'||c==='qid'?(r[c]?'‎'+r[c]:''):r[c])).join(','))];
  download(`munjiz-${{Clients:'clients',Transactions:'transactions',Requests:'requests',Log:'log',Payments:'payments',Expenses:'expenses'}[sheet]}-${iso()}.csv`,'﻿'+rows.join('\r\n'),'text/csv;charset=utf-8')}
$('backup').onclick=()=>download(`munjiz-backup-${iso()}.json`,JSON.stringify(DB,null,1),'application/json');
$('restore').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{const d=JSON.parse(await f.text());if(!['Clients','Transactions','Requests','Log'].every(s=>Array.isArray(d[s])))throw 0;
  if(!await ask('سيستبدل هذا كل البيانات الحالية على هذا الجهاز. متابعة؟',{ok:'استرجاع'}))return;Local.put(d);await reload();toast('تم الاسترجاع')}catch(err){toast('ملف غير صالح')}e.target.value=''};

async function saveRow(sheet,row){try{const r=await S.save(sheet,row);const arr=DB[sheet],i=arr.findIndex(x=>x.id===r.id);if(i>=0)arr[i]=r;else arr.push(r);return r}catch(e){toast(L('تعذر الحفظ: ','Could not save: ')+errText(e.message));throw e}}


// ---- work distribution, my tasks, manager dashboard, fees and payments ----
const TX_PROGRESS={'جديدة':5,'بانتظار المستندات':15,'قيد التقديم':45,'قيد المتابعة لدى الجهة':70,'بانتظار العميل':60,'منجزة':100,'ملغاة':0};
const TASK_ST=['جديدة','قيد التنفيذ','منجزة','ملغاة'];
const txProgress=t=>{if(t.status==='منجزة')return 100;const n=Number(t.progress);return t.progress!==''&&t.progress!=null&&!isNaN(n)?Math.max(0,Math.min(99,Math.round(n))):(TX_PROGRESS[t.status]||0)};
const progBar=p=>`<span class="prog" title="${p}%"><i style="width:${Math.max(0,Math.min(100,p))}%"></i></span><small class="num">${p}%</small>`;
const staffName=u=>{if(!u)return '';const x=(DB.Staff||[]).find(s=>s.username===u);return x?(x.name||x.username):u};
const staffOptions=sel=>`<option value="">${L('غير مكلّف','Not assigned')}</option>`+(DB.Staff||[]).map(x=>`<option value="${esc(x.username)}" ${x.username===sel?'selected':''}>${esc(x.name||x.username)}${x.jobTitle?' · '+esc(x.jobTitle):''}</option>`).join('')+(sel&&!(DB.Staff||[]).some(x=>x.username===sel)?`<option value="${esc(sel)}" selected>${esc(sel)}</option>`:'');
const balance=t=>Math.max(0,(+t.fee||0)+(+t.govFee||0)-(+t.paid||0));
const money=n=>fmt(Math.round((+n||0)*100)/100)+' '+L('ر.ق','QAR');
const dOnly=s=>String(s||'').slice(0,10);
// every piece of assigned work as one list: transactions, tasks and client requests
function workItems(){
  const tx=DB.Transactions.map(t=>({k:'Transactions',id:t.id,title:t.service||t.code,clientId:t.clientId,assignee:t.assignee||'',due:t.dueDate||'',status:t.status,progress:txProgress(t),
    done:t.status==='منجزة',closed:CLOSED.includes(t.status),doneOn:dOnly(t.closed||t.updated),row:t}));
  const tk=DB.Tasks.map(t=>({k:'Tasks',id:t.id,title:t.title,clientId:t.clientId,txnId:t.txnId,assignee:t.assignee||'',due:t.due||'',status:t.status||'جديدة',progress:t.status==='منجزة'?100:(+t.progress||0),
    done:t.status==='منجزة',closed:t.status==='منجزة'||t.status==='ملغاة',doneOn:dOnly(t.done||t.updated),urgent:t.priority==='عاجلة',notes:t.notes,row:t}));
  const rq=DB.Requests.map(r=>({k:'Requests',id:r.id,title:String(r.services||'').split('\n')[0],clientId:r.clientId,name:r.name,assignee:r.assignee||'',due:r.due||'',status:r.status,
    progress:{'جديد':0,'تم التواصل':50,'تحوّل إلى معاملة':100,'مغلق':100}[r.status]||0,done:r.status==='تحوّل إلى معاملة',closed:r.status==='تحوّل إلى معاملة'||r.status==='مغلق',doneOn:dOnly(r.updated),row:r}));
  return [...tx,...tk,...rq]}
const isLate=w=>!w.closed&&w.due&&days(w.due)<0;
const KLAB={Transactions:L('معاملة','Transaction'),Tasks:L('مهمة','Task'),Requests:L('طلب','Request')};
const stOpts=(w)=>(w.k==='Tasks'?TASK_ST:w.k==='Requests'?REQ_ST:STATUSES).map(s=>`<option value="${esc(s)}" ${s===w.status?'selected':''}>${esc(s)}</option>`).join('');
function renderMyCount(){if(!ME)return;const n=workItems().filter(w=>w.assignee===ME.username&&!w.closed).length;$('nMy').textContent=n||''}

// my tasks: what this employee is assigned, with progress they update themselves
$('myF').onchange=renderMy;
function renderMy(){if(!ME)return;const f=$('myF').value,mine=workItems().filter(w=>w.assignee===ME.username);
  const open=mine.filter(w=>!w.closed),late=open.filter(isLate),m=iso().slice(0,7),doneM=mine.filter(w=>w.done&&w.doneOn.slice(0,7)===m);
  const avg=open.length?Math.round(open.reduce((a,w)=>a+w.progress,0)/open.length):0,rate=mine.length?Math.round(mine.filter(w=>w.closed).length/mine.length*100):0;
  $('myK').innerHTML=[[L('أعمال مفتوحة','Open work'),open.length],[L('متأخرة','Overdue'),late.length],[L('أنجزتها هذا الشهر','Done this month'),doneM.length],[L('متوسط الإنجاز للمفتوحة','Average progress (open)'),avg+'%'],[L('نسبة الإنجاز الكلية','Overall completion'),rate+'%']]
    .map(([k,v])=>`<div class="kpi"><b class="num">${v}</b><span>${k}</span></div>`).join('');
  const list=mine.filter(w=>f==='all'||(f==='open'&&!w.closed)||(f==='late'&&isLate(w))||(f==='done'&&w.closed)).sort((a,b)=>(a.closed-b.closed)||((b.urgent?1:0)-(a.urgent?1:0))||String(a.due||'9999').localeCompare(String(b.due||'9999')));
  $('myL').innerHTML=list.length?list.map(w=>workCard(w,true)).join(''):`<div class="empty">${f==='open'?L('لا توجد أعمال مفتوحة مكلّف بها الآن.','No open work is assigned to you now.'):L('لا يوجد.','Nothing here.')}</div>`}
function workCard(w,mine){const c=cli(w.clientId),dd=w.due?days(w.due):null;
  return `<article class="wcard ${isLate(w)?'late':''} ${w.closed?'closed':''}" data-wk="${w.k}" data-wid="${esc(w.id)}">
    <div class="wtop"><span class="k">${KLAB[w.k]}</span>${w.urgent?`<span class="k urgent">${L('عاجلة','Urgent')}</span>`:''}<b>${esc(w.title)}</b><span class="sp"></span><small class="num mute">${esc(w.id)}</small></div>
    <div class="wmeta">${c.id?link(c.id,c.name):esc(w.name||'')}${w.due?` · <span class="${isLate(w)?'bad':''}">${L('الموعد','Due')} <span class="num">${esc(w.due)}</span>${dd!==null&&!w.closed?(dd<0?` (${L('متأخرة '+(-dd)+' يوم','overdue by '+(-dd)+' days')})`:dd===0?` (${L('اليوم','today')})`:''):''}</span>`:''}${w.k==='Transactions'?` · <a href="#" data-txn="${esc(w.id)}">${L('فتح المعاملة','Open transaction')}</a>`:''}</div>
    ${w.notes?`<div class="pre sm mute">${esc(String(w.notes).slice(-400))}</div>`:''}
    <div class="wctl"><label>${L('الحالة','Status')}<select data-f="status">${stOpts(w)}</select></label>
      ${w.k!=='Requests'?`<label class="wprog">${L('نسبة الإنجاز','Progress')}<span class="prow"><input type="range" min="0" max="100" step="5" value="${w.progress}" data-f="progress"><output class="num">${w.progress}%</output></span></label>`:''}
      <label class="wnote">${L('ملاحظة (اختياري)','Note (optional)')}<input data-f="note" placeholder="${L('ما الذي تم؟','What was done?')}"></label>
      <button class="btn sm pri" type="button" data-wsave>${L('حفظ التحديث','Save update')}</button></div></article>`}
$('myL').addEventListener('input',e=>{const r=e.target.closest('[data-f=progress]');if(r)r.nextElementSibling.textContent=r.value+'%'});
$('myL').addEventListener('click',async e=>{const b=e.target.closest('[data-wsave]');if(!b)return;const card=b.closest('[data-wk]'),g=f=>{const el=card.querySelector(`[data-f=${f}]`);return el?el.value:null};
  const body={sheet:card.dataset.wk,id:card.dataset.wid,status:g('status'),note:(g('note')||'').trim()};if(g('progress')!=null)body.progress=+g('progress');
  b.disabled=true;try{await myUpdate(body);toast(L('تم حفظ التحديث','Update saved'));await reload()}catch(err){toast(errText(err.message))}finally{b.disabled=false}});
async function myUpdate(body){if(REMOTE){const j=await S.api('myUpdate',body);const arr=DB[body.sheet],i=arr.findIndex(x=>x.id===j.row.id);if(i>=0)arr[i]=Object.assign(arr[i],j.row);return j.row}
  const row=Object.assign({},DB[body.sheet].find(x=>x.id===body.id)),before=row.status;row.status=body.status||row.status;
  if(body.progress!=null)row.progress=body.progress;if(body.sheet==='Transactions'){row.progress=txProgress(row);if(CLOSED.includes(row.status)&&!row.closed)row.closed=iso()}
  if(body.sheet==='Tasks'){if(row.status==='منجزة'){row.progress=100;row.done=row.done||iso()}if(body.note)row.notes=(row.notes?row.notes+'\n':'')+now()+' · '+ME.username+': '+body.note}
  await saveRow(body.sheet,row);if(body.sheet!=='Tasks'&&(body.note||before!==row.status))await saveRow('Log',{clientId:row.clientId||'',txnId:body.sheet==='Transactions'?row.id:'',kind:before!==row.status?'status':'note',subject:(row.service||row.title||row.name||row.id)+(before!==row.status?': '+before+' ← '+row.status:''),body:body.note||'',by:ME.username});return row}

// work distribution (admin, or the 'assign' permission): every open item with its employee, due date and progress
$('wkS').onchange=$('wkK').onchange=renderWork;
function renderWork(){if(!can('assign'))return;const sv=$('wkS').value,kv=$('wkK').value,items=workItems();
  const cur=$('wkS').value;$('wkS').innerHTML=`<option value="">${L('كل الموظفين','All staff')}</option><option value="-">${L('غير مكلّف بعد','Not assigned yet')}</option>`+(DB.Staff||[]).map(x=>`<option value="${esc(x.username)}">${esc(x.name||x.username)}</option>`).join('');$('wkS').value=cur;
  const m=iso().slice(0,7);
  $('wkLoad').innerHTML=table([L('الموظف','Employee'),L('مفتوحة','Open'),L('متأخرة','Overdue'),L('عاجلة','Urgent'),L('متوسط الإنجاز','Avg. progress'),L('أنجز هذا الشهر','Done this month')],(DB.Staff||[]).map(x=>{const mine=items.filter(w=>w.assignee===x.username),o=mine.filter(w=>!w.closed);
    return `<tr><td><a href="#" data-wks="${esc(x.username)}">${esc(x.name||x.username)}</a>${x.jobTitle?`<br><small class="mute">${esc(x.jobTitle)}</small>`:''}</td><td class="num">${o.length}</td><td class="num ${o.filter(isLate).length?'bad':''}">${o.filter(isLate).length}</td><td class="num">${o.filter(w=>w.urgent).length}</td><td>${progBar(o.length?Math.round(o.reduce((a,w)=>a+w.progress,0)/o.length):0)}</td><td class="num">${mine.filter(w=>w.done&&w.doneOn.slice(0,7)===m).length}</td></tr>`}));
  const list=items.filter(w=>!w.closed&&(!kv||w.k===kv)&&(!sv||(sv==='-'?!w.assignee:w.assignee===sv))).sort((a,b)=>(!a.assignee?-1:0)-(!b.assignee?-1:0)||String(a.due||'9999').localeCompare(String(b.due||'9999')));
  $('wkT').innerHTML=table([L('النوع','Type'),L('العمل','Work'),L('العميل','Client'),L('الموظف المسؤول','Assigned to'),L('الموعد','Due'),L('الحالة','Status'),L('الإنجاز','Progress')],list.map(w=>{const c=cli(w.clientId);
    return `<tr data-wk="${w.k}" data-wid="${esc(w.id)}" class="${isLate(w)?'latebg':''}"><td><span class="k">${KLAB[w.k]}</span>${w.urgent?` <span class="k urgent">${L('عاجلة','Urgent')}</span>`:''}</td>
    <td>${w.k==='Transactions'?`<a href="#" data-txn="${esc(w.id)}">${esc(w.title)}</a>`:w.k==='Tasks'?`<a href="#" data-task="${esc(w.id)}">${esc(w.title)}</a>`:esc(w.title)}<br><small class="num mute">${esc(w.id)}</small></td>
    <td>${c.id?link(c.id,c.name):esc(w.name||'')}</td><td><select data-asg aria-label="${L('الموظف المسؤول','Assigned to')}">${staffOptions(w.assignee)}</select></td>
    <td><input type="date" data-due value="${esc(w.due)}" aria-label="${L('الموعد','Due')}"></td><td>${esc(w.status)}</td><td>${progBar(w.progress)}</td></tr>`}))}
$('wkLoad').addEventListener('click',e=>{const a=e.target.closest('[data-wks]');if(a){e.preventDefault();$('wkS').value=a.dataset.wks;renderWork()}});
$('wkT').addEventListener('change',async e=>{const tr=e.target.closest('[data-wk]');if(!tr)return;const k=tr.dataset.wk,row=Object.assign({},DB[k].find(x=>x.id===tr.dataset.wid));
  if(e.target.matches('[data-asg]'))row.assignee=e.target.value;else if(e.target.matches('[data-due]'))row[k==='Transactions'?'dueDate':'due']=e.target.value;else return;
  try{await saveRow(k,row);toast(e.target.matches('[data-asg]')?(row.assignee?L('تم التكليف: ','Assigned to: ')+staffName(row.assignee):L('أُلغي التكليف','Unassigned')):L('تم تحديث الموعد','Due date updated'));renderAll()}catch(err){}});
document.addEventListener('click',e=>{const a=e.target.closest('[data-task]');if(a){e.preventDefault();openTask(DB.Tasks.find(x=>x.id===a.dataset.task))}});
// task dialog
const fK=$('fK');let editK=null;
fK.elements.progress.oninput=()=>{$('kProgV').textContent=fK.elements.progress.value+'%'};
fK.elements.status.onchange=()=>{if(fK.elements.status.value==='منجزة'){fK.elements.progress.value=100;$('kProgV').textContent='100%'}};
fK.elements.clientId.onchange=()=>{fK.elements.txnId.innerHTML=`<option value="">${L('بدون','None')}</option>`+DB.Transactions.filter(t=>!fK.elements.clientId.value||t.clientId===fK.elements.clientId.value).map(t=>`<option value="${esc(t.id)}">${esc(t.id)} · ${esc(t.service)}</option>`).join('')};
function openTask(t){if(!t)return;editK=t;fK.reset();fK.elements.assignee.innerHTML=staffOptions(t.assignee);
  fK.elements.clientId.innerHTML=`<option value="">${L('بدون','None')}</option>`+DB.Clients.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');fK.elements.clientId.value=t.clientId||'';fK.elements.clientId.onchange();
  ['title','due','txnId','notes'].forEach(k=>fK.elements[k].value=t[k]||'');fK.elements.priority.value=t.priority||'عادية';fK.elements.status.value=t.status||'جديدة';fK.elements.progress.value=t.progress||0;$('kProgV').textContent=(t.progress||0)+'%';
  $('delK').hidden=!t.id||!can('delete');$('dlgKT').textContent=t.id?L('المهمة ','Task ')+t.id:L('مهمة جديدة','New task');$('dlgK').showModal()}
$('newTask').onclick=()=>openTask({status:'جديدة',progress:0,due:'',clientId:tab==='client'?curClient:''});
fK.addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;const row=Object.assign({},editK);['title','assignee','due','clientId','txnId','priority','status','notes'].forEach(k=>row[k]=fK.elements[k].value.trim());
  row.progress=row.status==='منجزة'?100:+fK.elements.progress.value;if(!row.assignee){e.preventDefault();toast(L('اختر الموظف المسؤول','Choose the employee'));return}
  if(!REMOTE&&!row.id)row.by=ME?ME.username:'';if(row.status==='منجزة'&&!row.done)row.done=iso();
  try{await saveRow('Tasks',row);toast(L('تم حفظ المهمة','Task saved'));renderAll()}catch(err){}});
$('delK').onclick=async()=>{$('dlgK').close();if(!await ask(L('حذف المهمة؟','Delete the task?'),{ok:L('حذف','Delete')}))return;try{await S.del('Tasks',editK.id);await reload()}catch(err){toast(errText(err.message))}};

// periods shared by the manager dashboard and the finance page
function periodOf(v){const t=new Date(),y=t.getFullYear(),m=t.getMonth(),f=d=>dstr(d);
  if(v==='last')return [f(new Date(y,m-1,1)),f(new Date(y,m,0))];if(v==='q')return [f(new Date(y,m-2,1)),f(t)];if(v==='year')return [f(new Date(y,0,1)),f(t)];if(v==='all')return ['0000-00-00','9999-99-99'];return [f(new Date(y,m,1)),f(t)]}
const inP=(d,[a,b])=>{d=dOnly(d);return d>=a&&d<=b};

// manager dashboard (admin): transactions, staff completion, revenue, costs and profit
$('mgP').onchange=renderMgr;
function renderMgr(){if(!isAdmin())return;const P=periodOf($('mgP').value);$('mgRange').textContent=$('mgP').value==='all'?'':`${P[0]} — ${P[1]}`;
  const T=DB.Transactions,live=T.filter(t=>t.status!=='ملغاة'),open=T.filter(t=>!CLOSED.includes(t.status)),late=open.filter(t=>{const d=days(t.dueDate);return d!==null&&d<0});
  const newP=T.filter(t=>inP(t.created,P)),doneP=T.filter(t=>t.status==='منجزة'&&inP(t.closed||t.updated,P));
  const rev=DB.Payments.filter(p=>inP(p.date,P)).reduce((a,p)=>a+(+p.amount||0),0),cost=DB.Expenses.filter(x=>inP(x.date,P)).reduce((a,x)=>a+(+x.amount||0),0);
  const fees=newP.filter(t=>t.status!=='ملغاة').reduce((a,t)=>a+(+t.fee||0),0),due=live.reduce((a,t)=>a+balance(t),0);
  $('mgK').innerHTML=[[L('معاملات جديدة','New transactions'),newP.length],[L('معاملات أُنجزت','Transactions completed'),doneP.length],[L('مفتوحة الآن','Open now'),open.length],[L('متأخرة الآن','Overdue now'),late.length,late.length?'bad':''],
    [L('الإيراد المحصّل','Revenue collected'),money(rev)],[L('التكاليف','Costs'),money(cost)],[L('صافي الربح','Net profit'),money(rev-cost),rev-cost<0?'bad':'good'],[L('أتعاب المعاملات الجديدة','Fees on new transactions'),money(fees)],[L('مستحق على العملاء','Owed by clients'),money(due)],
    [L('العملاء','Clients'),DB.Clients.length]].map(([k,v,c])=>`<div class="kpi ${c||''}"><b class="num">${v}</b><span>${k}</span></div>`).join('');
  // revenue and costs by month: two series, one axis, values also printed in the table under the bars
  const t0=new Date(),months=[...Array(6)].map((_,i)=>{const d=new Date(t0.getFullYear(),t0.getMonth()-5+i,1);return dstr(d).slice(0,7)});
  const mv=months.map(m=>({m,r:DB.Payments.filter(p=>dOnly(p.date).slice(0,7)===m).reduce((a,p)=>a+(+p.amount||0),0),c:DB.Expenses.filter(x=>dOnly(x.date).slice(0,7)===m).reduce((a,x)=>a+(+x.amount||0),0)}));
  const mx=Math.max(1,...mv.map(x=>Math.max(x.r,x.c)));
  $('mgM').innerHTML=`<div class="legend"><span><i class="sw rev"></i>${L('الإيراد','Revenue')}</span><span><i class="sw cost"></i>${L('التكاليف','Costs')}</span></div>
    <div class="cols" role="img" aria-label="${L('الإيراد والتكاليف شهرياً','Monthly revenue and costs')}">${mv.map(x=>`<div class="col"><div class="pair"><i class="rev" style="height:${x.r/mx*100}%" title="${x.m} · ${L('الإيراد','Revenue')}: ${money(x.r)}"></i><i class="cost" style="height:${x.c/mx*100}%" title="${x.m} · ${L('التكاليف','Costs')}: ${money(x.c)}"></i></div><small class="num">${x.m.slice(2).replace('-','/')}</small></div>`).join('')}</div>
    <table class="mini"><thead><tr><th>${L('الشهر','Month')}</th><th>${L('الإيراد','Revenue')}</th><th>${L('التكاليف','Costs')}</th><th>${L('الربح','Profit')}</th></tr></thead><tbody>${mv.map(x=>`<tr><td class="num">${x.m}</td><td class="num">${fmt(x.r)}</td><td class="num">${fmt(x.c)}</td><td class="num ${x.r-x.c<0?'bad':''}">${fmt(x.r-x.c)}</td></tr>`).join('')}</tbody></table>`;
  const byS=STATUSES.filter(s=>!CLOSED.includes(s)).map(s=>[s,open.filter(t=>t.status===s).length]),ms=Math.max(1,...byS.map(x=>x[1]));
  $('mgSt').innerHTML=`<ul class="hbars">${byS.map(([s,n])=>`<li><span>${esc(s)}</span><span class="hb"><i style="width:${n/ms*100}%"></i></span><b class="num">${n}</b></li>`).join('')}</ul>`;
  const items=workItems();
  $('mgStaff').innerHTML=table([L('الموظف','Employee'),L('مكلّف بها (مفتوحة)','Assigned (open)'),L('أنجز في الفترة','Done in period'),L('متأخرة','Overdue'),L('متوسط الإنجاز','Avg. progress'),L('نسبة الإنجاز','Completion rate'),L('تحصيل سجّله','Payments recorded')],(DB.Staff||[]).map(x=>{
    const mine=items.filter(w=>w.assignee===x.username),o=mine.filter(w=>!w.closed),d=mine.filter(w=>w.done&&inP(w.doneOn,P)),lt=o.filter(isLate).length,rate=d.length+o.length?Math.round(d.length/(d.length+o.length)*100):0;
    const col=DB.Payments.filter(p=>p.by===x.username&&inP(p.date,P)).reduce((a,p)=>a+(+p.amount||0),0);
    return `<tr><td><b>${esc(x.name||x.username)}</b>${x.jobTitle?`<br><small class="mute">${esc(x.jobTitle)}</small>`:''}</td><td class="num">${o.length}</td><td class="num">${d.length}</td><td class="num ${lt?'bad':''}">${lt}</td><td>${progBar(o.length?Math.round(o.reduce((a,w)=>a+w.progress,0)/o.length):0)}</td><td>${progBar(rate)}</td><td class="num">${money(col)}</td></tr>`}));
  const bySvc={};newP.filter(t=>t.status!=='ملغاة').forEach(t=>{const k=t.service||t.code;bySvc[k]=bySvc[k]||[0,0];bySvc[k][0]+=+t.fee||0;bySvc[k][1]++});
  const top=Object.entries(bySvc).sort((a,b)=>b[1][0]-a[1][0]).slice(0,8);
  $('mgSvc').innerHTML=top.length?`<ul class="plain">${top.map(([k,[f,n]])=>`<li>${esc(k)} · <span class="num">${n}</span> · <b class="num">${money(f)}</b></li>`).join('')}</ul>`:`<p class="mute">${L('لا يوجد.','Nothing yet.')}</p>`;
  const owe={};live.forEach(t=>{const b=balance(t);if(b>0)owe[t.clientId]=(owe[t.clientId]||0)+b});
  const ow=Object.entries(owe).sort((a,b)=>b[1]-a[1]).slice(0,8);
  $('mgDue').innerHTML=ow.length?`<ul class="plain">${ow.map(([id,b])=>`<li>${link(id,cli(id).name)} · <b class="num bad">${money(b)}</b></li>`).join('')}</ul>`:`<p class="mute">${L('لا توجد مبالغ مستحقة.','Nothing is owed.')}</p>`}

// finance: what each client owes, payments received, expenses
document.querySelectorAll('.per').forEach(x=>x.onchange=()=>{if(VIEWS[tab])VIEWS[tab]()});$('pyQ').oninput=$('exC').onchange=()=>renderFin();
function renderFin(){if(!can('finance'))return;const P=periodOf($('fnP').value),PP=periodOf($('pyP').value),PE=periodOf($('exP').value),q=$('pyQ').value.trim(),ec=$('exC').value;
  const pays=DB.Payments.filter(p=>inP(p.date,PP)&&(!q||[p.receiptNo,p.txnId,cli(p.clientId).name].join(' ').includes(q))).sort((a,b)=>a.date<b.date?1:-1),exps=DB.Expenses.filter(x=>inP(x.date,PE)&&(!ec||x.category===ec)).sort((a,b)=>a.date<b.date?1:-1);
  const pAll=DB.Payments.filter(p=>inP(p.date,P)),eAll=DB.Expenses.filter(x=>inP(x.date,P));
  {const byM={};pays.forEach(p=>byM[p.method]=(byM[p.method]||0)+(+p.amount||0));$('pyK').innerHTML=[[L('عدد السندات','Receipts'),pays.length],[L('الإجمالي','Total'),money(pays.reduce((a,p)=>a+(+p.amount||0),0))],...Object.entries(byM).map(([m,v])=>[esc(m),money(v)])].map(([k,v])=>`<div class="kpi"><b class="num">${v}</b><span>${k}</span></div>`).join('');
   const cats=[...new Set([...[...fE.elements.category.options].map(o=>o.value),...DB.Expenses.map(x=>x.category)])];if($('exC').options.length<2)$('exC').insertAdjacentHTML('beforeend',cats.map(c=>`<option>${esc(c)}</option>`).join(''));
   const byC={};DB.Expenses.filter(x=>inP(x.date,PE)).forEach(x=>byC[x.category]=(byC[x.category]||0)+(+x.amount||0));const mc=Math.max(1,...Object.values(byC));
   $('exByC').innerHTML=Object.keys(byC).length?`<ul class="hbars">${Object.entries(byC).sort((a,b)=>b[1]-a[1]).map(([c,v])=>`<li><span>${esc(c)}</span><span class="hb"><i style="width:${v/mc*100}%"></i></span><b class="num">${fmt(v)}</b></li>`).join('')}</ul>`:`<p class="mute">${L('لا توجد مصروفات في الفترة.','No expenses in the period.')}</p>`;
   $('exK').innerHTML=[[L('عدد القيود','Entries'),exps.length],[L('الإجمالي','Total'),money(exps.reduce((a,x)=>a+(+x.amount||0),0))]].map(([k,v])=>`<div class="kpi"><b class="num">${v}</b><span>${k}</span></div>`).join('')}
  const rev=pAll.reduce((a,p)=>a+(+p.amount||0),0),cost=eAll.reduce((a,x)=>a+(+x.amount||0),0),owing=DB.Transactions.filter(t=>t.status!=='ملغاة'&&balance(t)>0);
  const byM={};pAll.forEach(p=>byM[p.method]=(byM[p.method]||0)+(+p.amount||0));
  $('fnK').innerHTML=[[L('المحصّل في الفترة','Collected in period'),money(rev)],[L('المصروفات في الفترة','Expenses in period'),money(cost)],[L('صافي الربح','Net profit'),money(rev-cost),rev-cost<0?'bad':'good'],[L('مستحق على العملاء','Owed by clients'),money(owing.reduce((a,t)=>a+balance(t),0))],
    ...Object.entries(byM).map(([m,v])=>[esc(m),money(v)])].map(([k,v,c])=>`<div class="kpi ${c||''}"><b class="num">${v}</b><span>${k}</span></div>`).join('');
  $('fnDue').innerHTML=table([L('المعاملة','Transaction'),L('العميل','Client'),L('الإجمالي','Total'),L('المدفوع','Paid'),L('المتبقي','Balance'),''],owing.sort((a,b)=>balance(b)-balance(a)).map(t=>`<tr><td><a href="#" data-txn="${esc(t.id)}">${esc(t.service)}</a><br><small class="num mute">${esc(t.id)}</small></td><td>${link(t.clientId,cli(t.clientId).name)}</td>
    <td class="num">${fmt((+t.fee||0)+(+t.govFee||0))}</td><td class="num">${fmt(t.paid)}</td><td class="num bad">${fmt(balance(t))}</td><td><div class="acts"><button class="btn xs pri" type="button" data-pay="${esc(t.id)}">${L('تسجيل دفعة','Record payment')}</button><button class="btn xs ghost" type="button" data-stmt="${esc(t.id)}">${L('كشف الحساب','Statement')}</button></div></td></tr>`));
  $('fnPay').innerHTML=table([L('التاريخ','Date'),L('السند','Receipt'),L('العميل','Client'),L('المعاملة','Transaction'),L('المبلغ','Amount'),L('الطريقة','Method'),L('سجّلها','By'),''],pays.map(p=>`<tr><td class="num">${esc(p.date)}</td><td class="num">${esc(p.receiptNo)}</td><td>${link(p.clientId,cli(p.clientId).name)}</td><td><a href="#" data-txn="${esc(p.txnId)}" class="num">${esc(p.txnId)}</a></td>
    <td class="num"><b>${fmt(p.amount)}</b></td><td>${esc(p.method)}</td><td>${esc(staffName(p.by))}</td><td><div class="acts"><button class="btn xs ghost" type="button" data-rcpt="${esc(p.id)}">${L('سند القبض','Receipt')}</button>${can('delete')?`<button class="btn xs ghost danger" type="button" data-pdel="${esc(p.id)}">${L('حذف','Delete')}</button>`:''}</div></td></tr>`));
  $('fnExp').innerHTML=table([L('التاريخ','Date'),L('البند','Item'),L('المبلغ','Amount'),L('المعاملة','Transaction'),L('ملاحظة','Note'),L('سجّله','By'),''],exps.map(x=>`<tr><td class="num">${esc(x.date)}</td><td>${esc(x.category)}</td><td class="num"><b>${fmt(x.amount)}</b></td><td>${x.txnId?`<a href="#" data-txn="${esc(x.txnId)}" class="num">${esc(x.txnId)}</a>`:''}</td><td><small>${esc(x.note)}</small></td><td>${esc(staffName(x.by))}</td><td><button class="btn xs ghost" type="button" data-exp="${esc(x.id)}">${L('تعديل','Edit')}</button></td></tr>`))}
document.addEventListener('click',async e=>{
  const p=e.target.closest('[data-pay]');if(p){e.preventDefault();openPay(p.dataset.pay);return}
  const s=e.target.closest('[data-stmt]');if(s){e.preventDefault();printStatement(s.dataset.stmt);return}
  const r=e.target.closest('[data-rcpt]');if(r){e.preventDefault();printReceipt(r.dataset.rcpt);return}
  const x=e.target.closest('[data-exp]');if(x){e.preventDefault();openExp(DB.Expenses.find(y=>y.id===x.dataset.exp));return}
  const d=e.target.closest('[data-pdel]');if(d){e.preventDefault();if(!await ask(L('حذف هذه الدفعة؟ يُعاد حساب المدفوع على المعاملة.','Delete this payment? The amount paid on the transaction is recalculated.'),{ok:L('حذف','Delete')}))return;
    try{await delPayment(d.dataset.pdel);toast(L('حُذفت الدفعة','Payment deleted'));await reload();if($('dlgT').open)drawTxPays(DB.Transactions.find(t=>t.id===editT.id)||editT)}catch(err){toast(errText(err.message))}}});
// fees box inside the transaction dialog
function drawTxPays(t){$('tPayBox').hidden=!can('finance');if(!can('finance'))return;
  if(!t.id){$('tPays').innerHTML=`<p class="mute sm">${L('سجّل الدفعات بعد حفظ المعاملة.','Record payments after saving the transaction.')}</p>`;return}
  const ps=DB.Payments.filter(p=>p.txnId===t.id).sort((a,b)=>a.date>b.date?1:-1),tot=(+t.fee||0)+(+t.govFee||0);
  $('tPays').innerHTML=`<p class="sm">${L('الإجمالي','Total')} <b class="num">${money(tot)}</b> · ${L('المدفوع','Paid')} <b class="num">${money(t.paid)}</b> · ${L('المتبقي','Balance')} <b class="num ${balance(t)>0?'bad':''}">${money(balance(t))}</b></p>`+
    (ps.length?`<ul class="plain">${ps.map(p=>`<li><span class="num">${esc(p.date)}</span> · <b class="num">${money(p.amount)}</b> · ${esc(p.method)} · <span class="num">${esc(p.receiptNo)}</span> <button class="btn xs ghost" type="button" data-rcpt="${esc(p.id)}">${L('سند القبض','Receipt')}</button>${can('delete')?` <button class="btn xs ghost danger" type="button" data-pdel="${esc(p.id)}">${L('حذف','Delete')}</button>`:''}</li>`).join('')}</ul>`:`<p class="mute sm">${L('لم تُسجّل دفعات بعد.','No payments recorded yet.')}</p>`)+
    `<div class="acts"><button class="btn xs pri" type="button" data-pay="${esc(t.id)}">${L('تسجيل دفعة','Record payment')}</button><button class="btn xs ghost" type="button" data-stmt="${esc(t.id)}">${L('كشف حساب للعميل','Client statement')}</button></div>`}
// payment dialog
const fP=$('fP');
function payBal(){const t=DB.Transactions.find(x=>x.id===fP.elements.txnId.value);$('pBal').innerHTML=t?`${L('الإجمالي','Total')} <b class="num">${money((+t.fee||0)+(+t.govFee||0))}</b> · ${L('المدفوع','Paid')} <b class="num">${money(t.paid)}</b> · ${L('المتبقي','Balance')} <b class="num">${money(balance(t))}</b>`:'';if(t&&!fP.elements.amount.value&&balance(t))fP.elements.amount.value=balance(t)}
fP.elements.txnId.onchange=()=>{fP.elements.amount.value='';payBal()};
function openPay(txnId){fP.reset();$('pErr').textContent='';const list=DB.Transactions.filter(t=>t.status!=='ملغاة'&&(balance(t)>0||t.id===txnId));
  fP.elements.txnId.innerHTML=`<option value="">${L('اختر المعاملة…','Choose the transaction…')}</option>`+list.map(t=>`<option value="${esc(t.id)}">${esc(t.id)} · ${esc(cli(t.clientId).name||'')} · ${esc(t.service)} · ${L('المتبقي','balance')} ${fmt(balance(t))}</option>`).join('');
  fP.elements.txnId.value=txnId||'';fP.elements.date.value=iso();payBal();$('dlgP').showModal()}
$('newPay').onclick=()=>openPay('');
fP.addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;e.preventDefault();$('pErr').textContent='';
  const row={txnId:fP.elements.txnId.value,amount:+fP.elements.amount.value,date:fP.elements.date.value,method:fP.elements.method.value,receiptNo:fP.elements.receiptNo.value.trim(),note:fP.elements.note.value.trim()};
  if(!row.txnId||!(row.amount>0)||!row.date){$('pErr').textContent=L('اختر المعاملة واكتب المبلغ والتاريخ.','Choose the transaction and enter the amount and date.');return}
  try{const p=await addPayment(row);$('dlgP').close();toast(L('سُجّلت الدفعة','Payment recorded'));await reload();if($('dlgT').open)drawTxPays(DB.Transactions.find(t=>t.id===row.txnId));printReceipt(p.id)}catch(err){$('pErr').textContent=errText(err.message)}});
async function addPayment(row){if(REMOTE)return (await S.api('payment',{row})).row;
  const t=DB.Transactions.find(x=>x.id===row.txnId);row.clientId=t.clientId;row.by=ME?ME.username:'';const p=await saveRow('Payments',row);if(!p.receiptNo){p.receiptNo='RC-'+p.id.replace(/\D/g,'');await saveRow('Payments',p)}
  await syncPaidLocal(t);await saveRow('Log',{clientId:t.clientId,txnId:t.id,kind:'payment',subject:`${L('دفعة','Payment')} ${p.amount} (${p.method}) · ${p.receiptNo}`,body:p.note||'',by:row.by});return p}
async function delPayment(id){if(REMOTE){await S.api('paymentDel',{id});return}const p=DB.Payments.find(x=>x.id===id);await S.del('Payments',id);DB.Payments=DB.Payments.filter(x=>x.id!==id);const t=DB.Transactions.find(x=>x.id===p.txnId);if(t)await syncPaidLocal(t)}
async function syncPaidLocal(t){t.paid=Math.round(DB.Payments.filter(x=>x.txnId===t.id).reduce((a,x)=>a+(+x.amount||0),0)*100)/100;await saveRow('Transactions',t)}
// expense dialog
const fE=$('fE');let editE=null;
function openExp(x){editE=x||{};fE.reset();fE.elements.txnId.innerHTML=`<option value="">${L('بدون','None')}</option>`+DB.Transactions.map(t=>`<option value="${esc(t.id)}">${esc(t.id)} · ${esc(cli(t.clientId).name||'')} · ${esc(t.service)}</option>`).join('');
  ['category','amount','date','txnId','note','account'].forEach(k=>{if(editE[k]!=null&&editE[k]!=='')fE.elements[k].value=editE[k]});if(!editE.date)fE.elements.date.value=iso();
  $('delE').hidden=!editE.id||!can('delete');$('dlgET').textContent=editE.id?L('تعديل مصروف','Edit expense'):L('مصروف جديد','New expense');$('dlgE').showModal()}
$('newExp').onclick=$('newExp2').onclick=()=>openExp(null);
fE.addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;const row=Object.assign({},editE);['category','date','txnId','note','account'].forEach(k=>row[k]=fE.elements[k].value.trim());row.amount=+fE.elements.amount.value;
  const t=DB.Transactions.find(x=>x.id===row.txnId);row.clientId=t?t.clientId:'';if(!row.id)row.by=ME?ME.username:'';
  try{await saveRow('Expenses',row);toast(L('تم حفظ المصروف','Expense saved'));renderAll()}catch(err){}});
$('delE').onclick=async()=>{$('dlgE').close();if(!await ask(L('حذف المصروف؟','Delete the expense?'),{ok:L('حذف','Delete')}))return;try{await S.del('Expenses',editE.id);await reload()}catch(err){toast(errText(err.message))}};

// printable statement of a transaction and receipt for a payment (the browser's print dialog saves them as PDF)
function printDoc(title,body){const w=window.open('','_blank');if(!w){toast(L('اسمح للموقع بفتح نافذة جديدة للطباعة','Allow pop-ups to print'));return}
  const brand=L('منجز لخدمات الأعمال ذ.م.م','Munjiz Business Services LLC');
  w.document.write(`<!doctype html><html lang="${EN?'en':'ar'}" dir="${EN?'ltr':'rtl'}"><head><meta charset="utf-8"><title>${esc(title)}</title><style>
  body{font-family:Tahoma,Arial,sans-serif;color:#1d2733;margin:32px;font-size:14px;line-height:1.7}header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #7a1e3a;padding-bottom:12px;margin-bottom:18px}
  header b{font-size:22px;color:#7a1e3a}header small{display:block;color:#5d6b78}h1{font-size:20px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin:14px 0}th,td{border:1px solid #cfd6dd;padding:7px 10px;text-align:start}th{background:#f1f4f6}
  .tot td,.tot th{font-weight:700}.h td,.h th{background:#eef2f4;font-weight:700}.net td,.net th{font-weight:800;border-top:2px solid #7a1e3a;background:#faf6ea}td.num,th.num{text-align:end}.big{font-size:20px;font-weight:700}.note{color:#5d6b78;font-size:12.5px;margin-top:22px}.sig{display:flex;justify-content:space-between;margin-top:46px}.sig div{border-top:1px solid #999;padding-top:6px;width:40%;text-align:center}
  @media print{body{margin:14mm}}</style></head><body><header><div><b>${brand}</b><small>${L('الدوحة، قطر','Doha, Qatar')}</small></div><div style="text-align:end"><small dir="ltr">+974 51600498</small><small dir="ltr">munijizqa@gmail.com</small></div></header>${body}
  <script>window.onload=()=>setTimeout(()=>window.print(),300)<\/script></body></html>`);w.document.close()}
const trx=x=>EN&&window.CRM_I18N?CRM_I18N.tr(String(x||'')):x;   // the print window has no live translator
function printReceipt(id){const p=DB.Payments.find(x=>x.id===id);if(!p)return;const t=DB.Transactions.find(x=>x.id===p.txnId)||{},c=cli(p.clientId);
  printDoc(L('سند قبض ','Receipt ')+p.receiptNo,`<h1>${L('سند قبض','Payment receipt')}</h1><p>${L('رقم السند','Receipt no.')}: <b dir="ltr">${esc(p.receiptNo)}</b> · ${L('التاريخ','Date')}: <b>${esc(p.date)}</b></p>
  <table><tr><th>${L('استلمنا من','Received from')}</th><td>${esc(c.name||'')}${c.phone?` · <span dir="ltr">${esc(c.phone)}</span>`:''}</td></tr><tr><th>${L('المبلغ','Amount')}</th><td class="big">${money(p.amount)}</td></tr>
  <tr><th>${L('طريقة الدفع','Method')}</th><td>${esc(trx(p.method))}</td></tr><tr><th>${L('عن المعاملة','For transaction')}</th><td>${esc(t.id||p.txnId)} · ${esc(trx(t.service||''))}</td></tr>${p.note?`<tr><th>${L('ملاحظة','Note')}</th><td>${esc(p.note)}</td></tr>`:''}
  <tr><th>${L('المتبقي على المعاملة بعد هذه الدفعة','Balance on the transaction')}</th><td>${money(balance(t))}</td></tr></table>
  <div class="sig"><div>${L('المستلم','Received by')}: ${esc(staffName(p.by))}</div><div>${L('الختم والتوقيع','Stamp and signature')}</div></div>`)}
function printStatement(id){const t=DB.Transactions.find(x=>x.id===id);if(!t)return;const c=cli(t.clientId),ps=DB.Payments.filter(p=>p.txnId===id).sort((a,b)=>a.date>b.date?1:-1);
  printDoc(L('كشف حساب ','Statement ')+t.id,`<h1>${L('كشف حساب معاملة','Transaction statement')}</h1><p>${L('العميل','Client')}: <b>${esc(c.name||'')}</b> (${esc(c.id||'')}) · ${L('المعاملة','Transaction')}: <b>${esc(t.id)}</b> · ${L('تاريخ الكشف','Date')}: ${iso()}</p>
  <table><thead><tr><th>${L('البند','Item')}</th><th>${L('المبلغ','Amount')}</th></tr></thead><tbody><tr><td>${L('أتعاب منجز','Munjiz fee')}: ${esc(trx(t.service))}</td><td>${money(t.fee)}</td></tr><tr><td>${L('الرسوم الحكومية (تُدفع للجهة بإيصالها الرسمي)','Government fees (paid to the authority against its official receipt)')}</td><td>${money(t.govFee)}</td></tr>
  <tr class="tot"><td>${L('الإجمالي','Total')}</td><td>${money((+t.fee||0)+(+t.govFee||0))}</td></tr></tbody></table>
  <table><thead><tr><th>${L('تاريخ الدفع','Date')}</th><th>${L('رقم السند','Receipt')}</th><th>${L('الطريقة','Method')}</th><th>${L('المبلغ','Amount')}</th></tr></thead><tbody>${ps.map(p=>`<tr><td>${esc(p.date)}</td><td dir="ltr">${esc(p.receiptNo)}</td><td>${esc(trx(p.method))}</td><td>${money(p.amount)}</td></tr>`).join('')||`<tr><td colspan="4">${L('لا توجد دفعات بعد.','No payments yet.')}</td></tr>`}
  <tr class="tot"><td colspan="3">${L('المدفوع','Paid')}</td><td>${money(t.paid)}</td></tr><tr class="tot"><td colspan="3">${L('المتبقي','Balance due')}</td><td>${money(balance(t))}</td></tr></tbody></table>
  <p class="note">${L('يُعدّ هذا الكشف ملخصاً لحساب المعاملة لدى منجز لخدمات الأعمال، ويُرفق به أصل الإيصالات الحكومية عند التسليم.','This statement summarises the transaction account with Munjiz Business Services. The original government receipts are handed over with the completed documents.')}</p>`)}
// ---- site colours (admin): ready palettes or two chosen colours, saved on the server for every visitor ----
const PALETTES=[
  {name:'عنابي ورملي (ألوان منجز)',en:'Maroon and sand (Munjiz colours)',primary:'#7a1e3a',accent:'#b8923a'},
  {name:'بترولي وذهبي',en:'Petrol teal and gold',primary:'#0f4c5c',accent:'#c9a24d'},
  {name:'كحلي وذهبي',en:'Navy and gold',primary:'#14284b',accent:'#c9a24d'},
  {name:'أزرق رمادي هادئ',en:'Calm blue-gray',primary:'#3f5566',accent:'#c9a24d'},
  {name:'فحمي أنيق',en:'Elegant charcoal',primary:'#2f3437',accent:'#b88a44'},
  {name:'أزرق مؤسسي',en:'Corporate blue',primary:'#1b4f8a',accent:'#e0a12b'},
  {name:'بنفسجي داكن',en:'Deep plum',primary:'#4a2c5e',accent:'#c9a24d'},
  {name:'زيتي وذهبي',en:'Olive and gold',primary:'#3d4a2a',accent:'#c9a24d'}];
let thSel=null;const TH=window.SITE_THEME;
function renderTheme(){if(!isAdmin()||!TH)return;const cur=TH.current;thSel=thSel||{primary:cur.primary,accent:cur.accent,name:cur.name||''};
  $('thList').innerHTML=PALETTES.map((x,i)=>`<button type="button" class="swatch" data-th="${i}" aria-pressed="${x.primary===thSel.primary&&x.accent===thSel.accent}"><span class="sw2"><i style="background:${x.primary}"></i><i style="background:${x.accent}"></i></span><span>${EN?x.en:x.name}${i===0?` <small class="mute">(${L('الافتراضي','default')})</small>`:''}</span></button>`).join('');
  $('thP').value=thSel.primary;$('thA').value=thSel.accent;previewTheme()}
function previewTheme(){const p=thSel.primary,a=thSel.accent,c=TH.contrast(p,'#ffffff'),c2=TH.contrast(p,'#f6f7f8');
  $('thPrev').querySelector('.thbar').style.background=p;$('thPrev').querySelector('.thbtn').style.background=p;$('thPrev').querySelector('.thtag').style.background=a;
  const okc=c>=4.5;$('thCheck').innerHTML=okc?`<span class="good">✓ ${L('وضوح النص الأبيض على اللون الأساسي','White text on the main colour')}: ${c.toFixed(1)}:1</span>`:`<span class="bad">${L('اللون الأساسي فاتح جداً، فلن يُقرأ النص الأبيض عليه','The main colour is too light for white text')} (${c.toFixed(1)}:1). ${L('اختر لوناً أغمق.','Choose a darker colour.')}</span>`;
  $('thSave').disabled=!okc;TH.apply(thSel)}
$('thList').addEventListener('click',e=>{const b=e.target.closest('[data-th]');if(!b)return;const x=PALETTES[+b.dataset.th];thSel={primary:x.primary,accent:x.accent,name:x.name};renderTheme()});
$('thP').oninput=()=>{thSel={primary:$('thP').value,accent:thSel.accent,name:''};renderTheme()};
$('thA').oninput=()=>{thSel={primary:thSel.primary,accent:$('thA').value,name:''};renderTheme()};
async function storeTheme(t){$('thErr').textContent='';try{if(REMOTE)await S.api('saveTheme',{theme:t});TH.remember(t||TH.DEF);thSel=null;renderTheme();toast(REMOTE?L('حُفظت الألوان وستظهر لكل الزوار','Colours saved for every visitor'):L('حُفظت الألوان على هذا الجهاز فقط (بدون خادم)','Colours saved on this device only (no server)'))}catch(err){$('thErr').textContent=errText(err.message)}}
$('thSave').onclick=()=>storeTheme(thSel);
$('thReset').onclick=()=>storeTheme(null);
// ---- finance reports, accounting (chart of accounts, journal, balances, income statement, trial balance) ----
const kpis=arr=>arr.map(([k,v,c])=>`<div class="kpi ${c||''}"><b class="num">${v}</b><span>${k}</span></div>`).join('');
const GOVCAT='رسوم حكومية مدفوعة عن العميل';
function renderGov(){if(!can('finance'))return;const P=periodOf($('gvP').value);
  const list=DB.Transactions.filter(t=>t.status!=='ملغاة'&&inP(t.created,P)&&(+t.govFee||DB.Expenses.some(x=>x.txnId===t.id&&x.category===GOVCAT)));
  const paidGov=t=>DB.Expenses.filter(x=>x.txnId===t.id&&x.category===GOVCAT).reduce((a,x)=>a+(+x.amount||0),0);
  const req=list.reduce((a,t)=>a+(+t.govFee||0),0),pd=list.reduce((a,t)=>a+paidGov(t),0);
  $('gvK').innerHTML=kpis([[L('رسوم مطلوبة من العملاء','Charged to clients'),money(req)],[L('مدفوعة للجهات','Paid to authorities'),money(pd)],[L('الفرق','Difference'),money(req-pd),req-pd<0?'bad':'']]);
  $('gvT').innerHTML=table([L('المعاملة','Transaction'),L('العميل','Client'),L('الحالة','Status'),L('رقم الطلب لدى الجهة','Authority ref.'),L('مطلوبة من العميل','Charged'),L('دُفعت للجهة','Paid'),L('الفرق','Difference'),''],list.map(t=>{const g=+t.govFee||0,p=paidGov(t);
    return `<tr><td><a href="#" data-txn="${esc(t.id)}">${esc(t.service)}</a><br><small class="num mute">${esc(t.id)}</small></td><td>${link(t.clientId,cli(t.clientId).name)}</td><td>${esc(t.status)}</td><td class="num">${esc(t.govRef||'')}</td><td class="num">${fmt(g)}</td><td class="num">${fmt(p)}</td><td class="num ${g-p<0?'bad':''}">${fmt(g-p)}</td>
    <td>${g-p>0?`<button class="btn xs ghost" type="button" data-govpay="${esc(t.id)}">${L('تسجيل دفعها للجهة','Record payment to authority')}</button>`:''}</td></tr>`}))}
$('gvT').addEventListener('click',e=>{const b=e.target.closest('[data-govpay]');if(!b)return;const t=DB.Transactions.find(x=>x.id===b.dataset.govpay);
  openExp({category:GOVCAT,txnId:t.id,amount:Math.max(0,(+t.govFee||0)-DB.Expenses.filter(x=>x.txnId===t.id&&x.category===GOVCAT).reduce((a,x)=>a+(+x.amount||0),0)),note:t.govRef?L('مرجع الجهة ','Authority ref. ')+t.govRef:''})});
// yearly report by month
function renderFrep(){if(!can('finance'))return;const ys=[...new Set([iso().slice(0,4),...DB.Payments.map(p=>dOnly(p.date).slice(0,4)),...DB.Expenses.map(x=>dOnly(x.date).slice(0,4))].filter(Boolean))].sort().reverse();
  const cur=$('frY').value||ys[0];$('frY').innerHTML=ys.map(y=>`<option ${y===cur?'selected':''}>${y}</option>`).join('');const Y=$('frY').value;
  const rows=[...Array(12)].map((_,i)=>{const m=`${Y}-${String(i+1).padStart(2,'0')}`,inM=d=>dOnly(d).slice(0,7)===m;
    const tx=DB.Transactions.filter(t=>inM(t.created)&&t.status!=='ملغاة');return {m,n:tx.length,fees:tx.reduce((a,t)=>a+(+t.fee||0),0),gov:tx.reduce((a,t)=>a+(+t.govFee||0),0),
      rev:DB.Payments.filter(p=>inM(p.date)).reduce((a,p)=>a+(+p.amount||0),0),cost:DB.Expenses.filter(x=>inM(x.date)).reduce((a,x)=>a+(+x.amount||0),0)}});
  const S=k=>rows.reduce((a,r)=>a+r[k],0);FREP=rows;
  $('frK').innerHTML=kpis([[L('معاملات السنة','Transactions this year'),S('n')],[L('الأتعاب','Fees'),money(S('fees'))],[L('المحصّل','Collected'),money(S('rev'))],[L('المصروفات','Expenses'),money(S('cost'))],[L('صافي الربح','Net profit'),money(S('rev')-S('cost')),S('rev')-S('cost')<0?'bad':'good']]);
  $('frM').innerHTML=table([L('الشهر','Month'),L('معاملات جديدة','New transactions'),L('الأتعاب','Fees'),L('الرسوم الحكومية','Government fees'),L('المحصّل','Collected'),L('المصروفات','Expenses'),L('صافي الربح','Net profit')],
    [...rows.map(r=>`<tr><td class="num">${r.m}</td><td class="num">${r.n}</td><td class="num">${fmt(r.fees)}</td><td class="num">${fmt(r.gov)}</td><td class="num">${fmt(r.rev)}</td><td class="num">${fmt(r.cost)}</td><td class="num ${r.rev-r.cost<0?'bad':''}">${fmt(r.rev-r.cost)}</td></tr>`),
     `<tr class="tot"><td>${L('الإجمالي','Total')}</td><td class="num">${S('n')}</td><td class="num">${fmt(S('fees'))}</td><td class="num">${fmt(S('gov'))}</td><td class="num">${fmt(S('rev'))}</td><td class="num">${fmt(S('cost'))}</td><td class="num">${fmt(S('rev')-S('cost'))}</td></tr>`]);
  const byM={};DB.Payments.filter(p=>dOnly(p.date).slice(0,4)===Y).forEach(p=>byM[p.method]=(byM[p.method]||0)+(+p.amount||0));const bm=Math.max(1,...Object.values(byM));
  $('frMeth').innerHTML=Object.keys(byM).length?`<ul class="hbars">${Object.entries(byM).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<li><span>${esc(k)}</span><span class="hb"><i style="width:${v/bm*100}%"></i></span><b class="num">${fmt(v)}</b></li>`).join('')}</ul>`:`<p class="mute">${L('لا يوجد.','Nothing yet.')}</p>`;
  const byG={};DB.Transactions.filter(t=>dOnly(t.created).slice(0,4)===Y&&t.status!=='ملغاة').forEach(t=>{const g=(SVC[t.code]||{}).g||L('أخرى','Other');byG[g]=(byG[g]||0)+(+t.fee||0)});const bg=Math.max(1,...Object.values(byG));
  $('frGrp').innerHTML=Object.keys(byG).length?`<ul class="hbars">${Object.entries(byG).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<li><span>${esc(k)}</span><span class="hb"><i style="width:${v/bg*100}%"></i></span><b class="num">${fmt(v)}</b></li>`).join('')}</ul>`:`<p class="mute">${L('لا يوجد.','Nothing yet.')}</p>`}
let FREP=[];$('frY').onchange=renderFrep;
const csvOut=(name,head,rows)=>{const q=v=>{v=String(v==null?'':v);if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};download(name,'﻿'+[head.map(q).join(','),...rows.map(r=>r.map(q).join(','))].join('\r\n'),'text/csv;charset=utf-8')};
$('frCsv').onclick=()=>csvOut(`munjiz-finance-${$('frY').value}.csv`,[L('الشهر','Month'),L('معاملات جديدة','New transactions'),L('الأتعاب','Fees'),L('الرسوم الحكومية','Government fees'),L('المحصّل','Collected'),L('المصروفات','Expenses'),L('صافي الربح','Net profit')],FREP.map(r=>[r.m,r.n,r.fees,r.gov,r.rev,r.cost,r.rev-r.cost]));
const printView=(id,title)=>printDoc(title,`<h1>${esc(title)}</h1>`+$(id).innerHTML.replace(/<button[^>]*>.*?<\/button>/g,''));
$('frPrint').onclick=()=>printView('frM',L('التقرير المالي ','Financial report ')+$('frY').value);

// chart of accounts: built in, plus accounts the office adds (sheet Coa)
const TYPES={asset:L('أصول','Assets'),liability:L('خصوم','Liabilities'),equity:L('حقوق الملكية','Equity'),income:L('إيرادات','Income'),expense:L('مصروفات','Expenses')};
const COA0=[['1101','الصندوق (النقدية)','Cash on hand','asset'],['1102','البنك','Bank','asset'],['1201','ذمم العملاء','Accounts receivable','asset'],['1301','سلف الموظفين','Staff advances','asset'],['1501','الأثاث والأجهزة','Furniture and equipment','asset'],
  ['2101','الموردون والدائنون','Payables','liability'],['2201','رواتب مستحقة','Salaries payable','liability'],['2301','أمانات رسوم حكومية للعملاء','Client government-fee deposits','liability'],
  ['3101','رأس المال','Capital','equity'],['3201','جاري المالك (مسحوبات)','Owner’s drawings','equity'],['3301','الأرباح المحتجزة','Retained earnings','equity'],
  ['4101','إيرادات أتعاب الخدمات','Service fee income','income'],['4102','إيرادات أخرى','Other income','income'],
  ['5101','رسوم حكومية مدفوعة عن العملاء','Government fees paid for clients','expense'],['5102','رواتب وأجور','Salaries and wages','expense'],['5103','إيجار','Rent','expense'],['5104','مواصلات','Transport','expense'],['5105','اتصالات وإنترنت','Phone and internet','expense'],
  ['5106','أدوات ومستلزمات','Tools and supplies','expense'],['5107','تسويق','Marketing','expense'],['5199','مصروفات أخرى','Other expenses','expense']];
const CAT_ACC={'رسوم حكومية مدفوعة عن العميل':'5101','رواتب':'5102','إيجار':'5103','مواصلات':'5104','اتصالات وإنترنت':'5105','أدوات ومستلزمات':'5106','تسويق':'5107'};
function coa(){const m=new Map(COA0.map(([c,n,e,t])=>[c,{code:c,name:n,nameEn:e,type:t,builtIn:true}]));DB.Coa.forEach(a=>m.set(String(a.code),{code:String(a.code),name:a.name,nameEn:a.nameEn,type:a.type,id:a.id}));return [...m.values()].sort((a,b)=>a.code.localeCompare(b.code))}
const accName=c=>{const a=coa().find(x=>x.code===String(c));return a?(EN&&a.nameEn?a.nameEn:a.name):c};
// every entry: payments and expenses post automatically, manual entries come from the Journal sheet
function entries(){const out=[];
  DB.Payments.forEach(p=>{const a=+p.amount||0;if(a)out.push({date:dOnly(p.date),ref:p.receiptNo,memo:`${L('تحصيل من','Received from')} ${cli(p.clientId).name||p.clientId} · ${p.txnId}`,auto:'pay',src:p.id,lines:[{a:p.method==='نقداً'?'1101':'1102',dr:a,cr:0},{a:'4101',dr:0,cr:a}]})});
  DB.Expenses.forEach(x=>{const a=+x.amount||0;if(a)out.push({date:dOnly(x.date),ref:x.id,memo:`${x.category}${x.note?' · '+x.note:''}${x.txnId?' · '+x.txnId:''}`,auto:'exp',src:x.id,lines:[{a:CAT_ACC[x.category]||'5199',dr:a,cr:0},{a:x.account==='1102'?'1102':'1101',dr:0,cr:a}]})});
  DB.Journal.forEach(j=>out.push({date:dOnly(j.date),ref:j.ref||j.id,memo:j.memo,id:j.id,lines:parseDocs(j.lines)}));
  return out.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0)}
function balances(until){const b={};entries().filter(e=>!until||e.date<=until).forEach(e=>e.lines.forEach(l=>{const x=b[l.a]=b[l.a]||{dr:0,cr:0};x.dr+=+l.dr||0;x.cr+=+l.cr||0}));return b}
const natural=(t,x)=>['asset','expense'].includes(t)?x.dr-x.cr:x.cr-x.dr;
function renderCoa(){if(!can('finance'))return;const b=balances();
  $('coaT').innerHTML=table([L('رقم الحساب','Code'),L('اسم الحساب','Account'),L('النوع','Type'),L('مدين','Debit'),L('دائن','Credit'),L('الرصيد','Balance'),''],coa().map(a=>{const x=b[a.code]||{dr:0,cr:0},n=natural(a.type,x);
    return `<tr><td class="num">${esc(a.code)}</td><td>${esc(EN&&a.nameEn?a.nameEn:a.name)}${a.builtIn?'':` <small class="mute">(${L('مضاف','added')})</small>`}</td><td>${TYPES[a.type]||esc(a.type)}</td><td class="num">${fmt(x.dr)}</td><td class="num">${fmt(x.cr)}</td><td class="num ${n<0?'bad':''}"><b>${fmt(n)}</b></td><td>${a.builtIn?'':`<button class="btn xs ghost" type="button" data-acc2="${esc(a.id)}">${L('تعديل','Edit')}</button>`}</td></tr>`}))}
const fG=$('fG');let editG=null;
function openAcc(a){editG=a||{};fG.reset();$('gErr').textContent='';['code','name','nameEn','type'].forEach(k=>{if(editG[k])fG.elements[k].value=editG[k]});$('delG').hidden=!editG.id;$('dlgG').showModal()}
$('newAcc').onclick=()=>openAcc(null);$('coaT').onclick=e=>{const b=e.target.closest('[data-acc2]');if(b)openAcc(DB.Coa.find(x=>x.id===b.dataset.acc2))};
fG.addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;const row=Object.assign({},editG);['code','name','nameEn','type'].forEach(k=>row[k]=fG.elements[k].value.trim());
  if(!/^\d{3,6}$/.test(row.code)||(!editG.id&&coa().some(a=>a.code===row.code))){e.preventDefault();$('gErr').textContent=L('رقم الحساب مستخدم أو غير صالح.','The account code is taken or invalid.');return}
  try{await saveRow('Coa',row);renderCoa()}catch(err){}});
$('delG').onclick=async()=>{$('dlgG').close();if(entries().some(x=>x.lines.some(l=>l.a===editG.code))){toast(L('لا يمكن حذف حساب عليه قيود.','An account with entries cannot be deleted.'));return}if(!await ask(L('حذف الحساب؟','Delete the account?'),{ok:L('حذف','Delete')}))return;try{await S.del('Coa',editG.id);await reload()}catch(err){toast(errText(err.message))}};
// journal
function renderJrnl(){if(!can('finance'))return;const P=periodOf($('jrP').value),k=$('jrK').value;
  const list=entries().filter(x=>inP(x.date,P)&&(!k||(k==='auto'?x.auto:!x.auto))).reverse();
  $('jrL').innerHTML=list.length?list.slice(0,300).map(x=>`<div class="jent panel"><div class="bar"><b class="num">${esc(x.date)}</b><span>${esc(x.memo)}</span><span class="sp"></span><small class="mute num">${esc(x.ref||'')}</small><span class="k">${x.auto?L('تلقائي','Automatic'):L('يدوي','Manual')}</span>${x.id?`<button class="btn xs ghost" type="button" data-jedit="${esc(x.id)}">${L('تعديل','Edit')}</button>`:''}</div>
    <table class="mini"><thead><tr><th>${L('الحساب','Account')}</th><th></th><th class="num">${L('مدين','Debit')}</th><th class="num">${L('دائن','Credit')}</th></tr></thead><tbody>${x.lines.map(l=>`<tr><td class="num">${esc(l.a)}</td><td>${esc(accName(l.a))}</td><td class="num">${l.dr?fmt(l.dr):''}</td><td class="num">${l.cr?fmt(l.cr):''}</td></tr>`).join('')}</tbody></table></div>`).join(''):`<div class="empty">${L('لا توجد قيود في الفترة.','No entries in the period.')}</div>`}
$('jrK').onchange=renderJrnl;
$('jrCsv').onclick=()=>{const P=periodOf($('jrP').value),rows=[];entries().filter(x=>inP(x.date,P)).forEach(x=>x.lines.forEach(l=>rows.push([x.date,x.ref||'',x.memo,l.a,accName(l.a),l.dr||'',l.cr||'',x.auto?L('تلقائي','Automatic'):L('يدوي','Manual')])));
  csvOut(`munjiz-journal-${iso()}.csv`,[L('التاريخ','Date'),L('المرجع','Ref'),L('البيان','Memo'),L('رقم الحساب','Code'),L('الحساب','Account'),L('مدين','Debit'),L('دائن','Credit'),L('النوع','Type')],rows)};
const fJ=$('fJ');let editJ=null;
const accOpts=sel=>coa().map(a=>`<option value="${a.code}" ${a.code===sel?'selected':''}>${a.code} · ${esc(EN&&a.nameEn?a.nameEn:a.name)}</option>`).join('');
const jRow=l=>`<tr><td><select data-jl="a">${accOpts(l.a)}</select></td><td><input type="number" min="0" step="0.01" data-jl="dr" value="${l.dr||''}"></td><td><input type="number" min="0" step="0.01" data-jl="cr" value="${l.cr||''}"></td><td><button class="btn xs ghost danger" type="button" data-jdel>×</button></td></tr>`;
function jSum(){let d=0,c=0;$('jLines').querySelectorAll('tr').forEach(r=>{d+=+r.querySelector('[data-jl=dr]').value||0;c+=+r.querySelector('[data-jl=cr]').value||0});$('jDr').textContent=fmt(d);$('jCr').textContent=fmt(c);$('jDr').className=$('jCr').className='num '+(Math.abs(d-c)<.005&&d>0?'good':'bad');return [d,c]}
function openJ(j){editJ=j||{};fJ.reset();$('jErr').textContent='';fJ.elements.date.value=editJ.date||iso();fJ.elements.memo.value=editJ.memo||'';fJ.elements.ref.value=editJ.ref||'';
  const ls=editJ.id?parseDocs(editJ.lines):[{a:'1102'},{a:'3101'}];$('jLines').innerHTML=ls.map(jRow).join('');jSum();$('delJ').hidden=!editJ.id;$('dlgJ').showModal()}
$('newJ').onclick=()=>openJ(null);$('jAdd').onclick=()=>{$('jLines').insertAdjacentHTML('beforeend',jRow({a:'5199'}));jSum()};
$('jLines').addEventListener('input',jSum);$('jLines').addEventListener('click',e=>{if(e.target.closest('[data-jdel]')){e.target.closest('tr').remove();jSum()}});
$('jrL').addEventListener('click',e=>{const b=e.target.closest('[data-jedit]');if(b)openJ(DB.Journal.find(x=>x.id===b.dataset.jedit))});
fJ.addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;e.preventDefault();const [d,c]=jSum();
  const lines=[...$('jLines').querySelectorAll('tr')].map(r=>({a:r.querySelector('[data-jl=a]').value,dr:+r.querySelector('[data-jl=dr]').value||0,cr:+r.querySelector('[data-jl=cr]').value||0}));
  if(lines.length<2||Math.abs(d-c)>.005||!d||lines.some(l=>(l.dr&&l.cr)||(!l.dr&&!l.cr))){$('jErr').textContent=L('القيد غير متوازن: يجب أن يتساوى المدين والدائن، وأن يكون في كل سطر مبلغ واحد فقط.','The entry is not balanced: debits must equal credits, with one amount per line.');return}
  const row=Object.assign({},editJ,{date:fJ.elements.date.value,memo:fJ.elements.memo.value.trim(),ref:fJ.elements.ref.value.trim(),lines:JSON.stringify(lines)});if(!row.id)row.by=ME?ME.username:'';
  try{await saveRow('Journal',row);$('dlgJ').close();toast(L('حُفظ القيد','Entry saved'));renderJrnl()}catch(err){$('jErr').textContent=errText(err.message)}});
$('delJ').onclick=async()=>{$('dlgJ').close();if(!await ask(L('حذف القيد؟','Delete the entry?'),{ok:L('حذف','Delete')}))return;try{await S.del('Journal',editJ.id);await reload()}catch(err){toast(errText(err.message))}};
// client balances and statements
function clientBal(){return DB.Clients.map(c=>{const tx=DB.Transactions.filter(t=>t.clientId===c.id&&t.status!=='ملغاة');const billed=tx.reduce((a,t)=>a+(+t.fee||0)+(+t.govFee||0),0),paid=DB.Payments.filter(p=>p.clientId===c.id).reduce((a,p)=>a+(+p.amount||0),0);
  const last=DB.Payments.filter(p=>p.clientId===c.id).map(p=>p.date).sort().pop()||'';return {c,n:tx.length,billed,paid,bal:billed-paid,last}})}
function renderCbal(){if(!can('finance'))return;const q=$('cbQ').value.trim(),f=$('cbF').value,all=clientBal();
  $('cbK').innerHTML=kpis([[L('إجمالي الفواتير','Total billed'),money(all.reduce((a,x)=>a+x.billed,0))],[L('إجمالي المحصّل','Total collected'),money(all.reduce((a,x)=>a+x.paid,0))],[L('المستحق','Outstanding'),money(all.reduce((a,x)=>a+Math.max(0,x.bal),0)),'bad'],[L('عملاء عليهم مبالغ','Clients owing'),all.filter(x=>x.bal>0.005).length]]);
  const list=all.filter(x=>(!f||x.bal>0.005)&&(!q||String(x.c.name).includes(q))).sort((a,b)=>b.bal-a.bal);
  $('cbT').innerHTML=table([L('العميل','Client'),L('المعاملات','Transactions'),L('المطلوب','Billed'),L('المدفوع','Paid'),L('الرصيد','Balance'),L('آخر دفعة','Last payment'),''],list.map(x=>`<tr><td>${link(x.c.id,x.c.name)}<br><small class="num mute">${esc(x.c.id)}</small></td><td class="num">${x.n}</td><td class="num">${fmt(x.billed)}</td><td class="num">${fmt(x.paid)}</td><td class="num ${x.bal>0.005?'bad':''}"><b>${fmt(x.bal)}</b></td><td class="num">${esc(x.last)}</td><td><button class="btn xs ghost" type="button" data-cstmt="${esc(x.c.id)}">${L('كشف حساب','Statement')}</button></td></tr>`))}
$('cbQ').oninput=$('cbF').onchange=renderCbal;
$('cbCsv').onclick=()=>csvOut(`munjiz-client-balances-${iso()}.csv`,[L('رقم العميل','Client no.'),L('العميل','Client'),L('المعاملات','Transactions'),L('المطلوب','Billed'),L('المدفوع','Paid'),L('الرصيد','Balance')],clientBal().map(x=>[x.c.id,x.c.name,x.n,x.billed,x.paid,x.bal]));
$('cbT').addEventListener('click',e=>{const b=e.target.closest('[data-cstmt]');if(b)printClientStatement(b.dataset.cstmt)});
function printClientStatement(id){const c=cli(id),ev=[];DB.Transactions.filter(t=>t.clientId===id&&t.status!=='ملغاة').forEach(t=>ev.push({d:dOnly(t.created),t:`${trx(t.service)} (${t.id})`,dr:(+t.fee||0)+(+t.govFee||0),cr:0}));
  DB.Payments.filter(p=>p.clientId===id).forEach(p=>ev.push({d:dOnly(p.date),t:`${L('دفعة','Payment')} · ${trx(p.method)} · ${p.receiptNo}`,dr:0,cr:+p.amount||0}));ev.sort((a,b)=>a.d<b.d?-1:1);let r=0;
  printDoc(L('كشف حساب ','Statement ')+(c.name||id),`<h1>${L('كشف حساب عميل','Client statement')}</h1><p>${L('العميل','Client')}: <b>${esc(c.name||'')}</b> (${esc(id)}) · ${L('تاريخ الكشف','Date')}: ${iso()}</p>
  <table><thead><tr><th>${L('التاريخ','Date')}</th><th>${L('البيان','Description')}</th><th>${L('مطلوب','Charged')}</th><th>${L('مدفوع','Paid')}</th><th>${L('الرصيد','Balance')}</th></tr></thead><tbody>${ev.map(x=>{r+=x.dr-x.cr;return `<tr><td>${x.d}</td><td>${esc(x.t)}</td><td>${x.dr?money(x.dr):''}</td><td>${x.cr?money(x.cr):''}</td><td>${money(r)}</td></tr>`}).join('')}
  <tr class="tot"><td colspan="4">${L('الرصيد المستحق','Balance due')}</td><td>${money(r)}</td></tr></tbody></table>`)}
// income statement for a period
function renderPl(){if(!can('finance'))return;const P=periodOf($('plP').value),sum={};entries().filter(x=>inP(x.date,P)).forEach(x=>x.lines.forEach(l=>{const s=sum[l.a]=sum[l.a]||{dr:0,cr:0};s.dr+=+l.dr||0;s.cr+=+l.cr||0}));
  const A=coa(),inc=A.filter(a=>a.type==='income').map(a=>[a,natural('income',sum[a.code]||{dr:0,cr:0})]).filter(x=>x[1]),exp=A.filter(a=>a.type==='expense').map(a=>[a,natural('expense',sum[a.code]||{dr:0,cr:0})]).filter(x=>x[1]);
  const ti=inc.reduce((a,x)=>a+x[1],0),te=exp.reduce((a,x)=>a+x[1],0),nm=a=>esc(EN&&a.nameEn?a.nameEn:a.name);
  $('plT').innerHTML=`<p class="mute sm">${$('plP').value==='all'?L('كل الفترات','All time'):P[0]+' — '+P[1]}</p><table class="fin"><tbody>
   <tr class="h"><td colspan="2">${L('الإيرادات','Income')}</td></tr>${inc.map(([a,v])=>`<tr><td>${a.code} · ${nm(a)}</td><td class="num">${fmt(v)}</td></tr>`).join('')||`<tr><td class="mute">${L('لا يوجد','None')}</td><td></td></tr>`}<tr class="tot"><td>${L('إجمالي الإيرادات','Total income')}</td><td class="num">${fmt(ti)}</td></tr>
   <tr class="h"><td colspan="2">${L('المصروفات','Expenses')}</td></tr>${exp.map(([a,v])=>`<tr><td>${a.code} · ${nm(a)}</td><td class="num">${fmt(v)}</td></tr>`).join('')||`<tr><td class="mute">${L('لا يوجد','None')}</td><td></td></tr>`}<tr class="tot"><td>${L('إجمالي المصروفات','Total expenses')}</td><td class="num">${fmt(te)}</td></tr>
   <tr class="net"><td>${ti-te>=0?L('صافي الربح','Net profit'):L('صافي الخسارة','Net loss')}</td><td class="num">${money(Math.abs(ti-te))}</td></tr></tbody></table>`}
$('plPrint').onclick=()=>printView('plT',L('قائمة الدخل','Income statement'));
// trial balance up to a date
function renderTb(){if(!can('finance'))return;if(!$('tbD').value)$('tbD').value=iso();const b=balances($('tbD').value);let D=0,C=0;
  const rows=coa().map(a=>{const x=b[a.code];if(!x||(!x.dr&&!x.cr))return '';const n=x.dr-x.cr,d=n>0?n:0,c=n<0?-n:0;D+=d;C+=c;return `<tr><td class="num">${a.code}</td><td>${esc(EN&&a.nameEn?a.nameEn:a.name)}</td><td>${TYPES[a.type]||''}</td><td class="num">${d?fmt(d):''}</td><td class="num">${c?fmt(c):''}</td></tr>`}).filter(Boolean);
  rows.push(`<tr class="tot"><td></td><td>${L('الإجمالي','Total')}</td><td></td><td class="num">${fmt(D)}</td><td class="num">${fmt(C)}</td></tr>`);
  $('tbT').innerHTML=table([L('رقم الحساب','Code'),L('الحساب','Account'),L('النوع','Type'),L('رصيد مدين','Debit balance'),L('رصيد دائن','Credit balance')],rows)+`<p class="sm ${Math.abs(D-C)<.01?'good':'bad'}" style="padding:8px 12px">${Math.abs(D-C)<.01?L('✓ الميزان متوازن','✓ The trial balance balances'):L('الميزان غير متوازن','The trial balance does not balance')}</p>`}
$('tbD').onchange=renderTb;$('tbPrint').onclick=()=>printView('tbT',L('ميزان المراجعة حتى ','Trial balance to ')+$('tbD').value);

// ---- human resources: files and contracts, leave, payroll, evaluations ----
const canHR=()=>can('hr');
const yearOf=()=>iso().slice(0,4);
const annualUsed=u=>DB.Leaves.filter(l=>l.username===u&&l.type==='سنوية'&&l.status==='موافق عليها'&&String(l.from).slice(0,4)===yearOf()).reduce((a,l)=>a+(+l.days||0),0);
// the documents whose expiry the HR file tracks; one that ended or ends within 30 days is flagged
const HR_DOCS=[['qidExpiry',L('البطاقة الشخصية','QID')],['passportExpiry',L('جواز السفر','Passport')],['visaExpiry',L('الإقامة / التأشيرة','Residence / visa')],['healthCardExpiry',L('البطاقة الصحية','Health card')],['licenseExpiry',L('رخصة القيادة','Driving licence')],['contractEnd',L('العقد','Contract')]];
const docAlerts=x=>HR_DOCS.map(([k,n])=>({k,n,d:days(x[k]),v:x[k]})).filter(a=>a.d!==null&&a.d<=30);
function hrList(){const q=$('hrQ').value.trim().toLowerCase(),dp=$('hrD').value;
  return (DB.Staff||[]).filter(x=>(!dp||x.department===dp)&&(!q||[x.name,x.username,x.jobTitle,x.department,x.specialty,x.skills,x.qualification,x.languages,x.empNo].join(' ').toLowerCase().includes(q)))}
function renderHrf(){if(!canHR())return;const st=DB.Staff||[],soon=x=>docAlerts(x).length>0;
  const deps=[...new Set(st.map(x=>x.department).filter(Boolean))].sort(),cur=$('hrD').value;
  $('hrD').innerHTML=`<option value="">${L('كل الأقسام','All departments')}</option>`+deps.map(d=>`<option${d===cur?' selected':''}>${esc(d)}</option>`).join('');
  $('hrK').innerHTML=kpis([[L('الموظفون','Employees'),st.length],[L('الأقسام','Departments'),deps.length],[L('إجمالي الرواتب والبدلات شهرياً','Monthly salaries and allowances'),money(st.reduce((a,x)=>a+(+x.salary||0)+(+x.allowance||0),0))],[L('موظفون لديهم وثيقة تنتهي خلال 30 يوماً','Staff with a document ending within 30 days'),st.filter(soon).length,st.some(soon)?'bad':''],[L('في إجازة اليوم','On leave today'),DB.Leaves.filter(l=>l.status==='موافق عليها'&&l.from<=iso()&&l.to>=iso()).length]]);
  $('hrT').innerHTML=table([L('الموظف','Employee'),L('القسم والتخصص','Department and specialisation'),L('الجنسية','Nationality'),L('تاريخ التعيين','Hire date'),L('العقد','Contract'),L('تنبيهات الوثائق','Document alerts'),L('الراتب','Salary'),L('البدلات','Allowances'),L('رصيد الإجازة','Leave balance'),''],hrList().map(x=>{const al=docAlerts(x),bal=(+x.leaveDays||0)-annualUsed(x.username);
    return `<tr><td><b>${esc(x.name||x.username)}</b><br><small class="mute">${esc(x.jobTitle||'')}${x.empNo?' · '+esc(x.empNo):''} · <span dir="ltr">${esc(x.username)}</span></small></td>
    <td>${esc(x.department||'')}${x.specialty?`<br><small class="mute">${esc(x.specialty)}</small>`:''}</td><td>${esc(x.nationality||'')}</td><td class="num">${esc(x.hireDate||'')}</td><td>${esc(x.contractType||'')}${x.contractEnd?`<br><small class="num mute">${L('حتى ','to ')}${esc(x.contractEnd)}</small>`:''}</td>
    <td>${al.length?al.map(a=>`<small class="bad">${esc(a.n)}: ${a.d<0?L('منتهية','expired'):L('بعد '+a.d+' يوم','in '+a.d+' days')}</small>`).join('<br>'):`<small class="good">✓</small>`}</td>
    <td class="num">${fmt(x.salary)}</td><td class="num">${fmt(x.allowance)}</td><td class="num">${x.leaveDays?bal+' / '+x.leaveDays:''}</td>
    <td><div class="acts"><button class="btn xs ghost" type="button" data-hrv="${esc(x.username)}">${L('الملف الكامل','Full file')}</button>${isAdmin()?`<button class="btn xs ghost" type="button" data-hre="${esc(x.username)}">${L('تعديل الملف','Edit file')}</button>`:''}</div></td></tr>`}))}
$('hrQ').oninput=renderHrf;$('hrD').onchange=renderHrf;
// one employee's full file, printable
function hrProfile(x){const row=(k,v)=>v?`<tr><th>${k}</th><td>${esc(v)}</td></tr>`:'',sec=(t,r)=>r.join('')?`<h2>${t}</h2><table class="pf">${r.join('')}</table>`:'';
  const evs=DB.Evals.filter(e=>e.username===x.username).sort((a,b)=>a.created<b.created?1:-1),lv=DB.Leaves.filter(l=>l.username===x.username&&l.status==='موافق عليها'&&String(l.from).slice(0,4)===yearOf());
  return `<h1>${esc(x.name||x.username)}</h1><p>${esc(x.jobTitle||'')}${x.department?' · '+esc(x.department):''}</p>`+
   sec(L('البيانات الشخصية','Personal details'),[row(L('الرقم الوظيفي','Employee no.'),x.empNo),row(L('الجنسية','Nationality'),x.nationality),row(L('تاريخ الميلاد','Date of birth'),x.birthDate),row(L('الجنس','Gender'),x.gender),row(L('الحالة الاجتماعية','Marital status'),x.maritalStatus),row(L('الرقم الشخصي','QID'),x.qid),row(L('الجوال','Mobile'),x.phone),row(L('البريد','Email'),x.email),row(L('العنوان','Address'),x.address)])+
   sec(L('الوظيفة والتخصص','Job and specialisation'),[row(L('القسم','Department'),x.department),row(L('التخصص','Specialisation'),x.specialty),row(L('المؤهل العلمي','Qualification'),x.qualification),row(L('اللغات','Languages'),x.languages),row(L('المهارات','Skills'),x.skills),row(L('الخبرات السابقة','Previous experience'),x.experience),row(L('المدير المباشر','Line manager'),x.manager?staffName(x.manager):''),row(L('مكان العمل','Work location'),x.workLocation),row(L('تاريخ التعيين','Hire date'),x.hireDate),row(L('نهاية فترة التجربة','Probation ends'),x.probationEnd),row(L('الدوام','Working hours'),x.shiftStart?x.shiftStart+' – '+(x.shiftEnd||''):'')])+
   sec(L('العقد والراتب','Contract and pay'),[row(L('نوع العقد','Contract type'),x.contractType),row(L('بداية العقد','Contract start'),x.contractStart),row(L('نهاية العقد','Contract end'),x.contractEnd),row(L('الراتب الأساسي','Basic salary'),x.salary!==''&&x.salary!=null?fmt(x.salary):''),row(L('البدلات','Allowances'),x.allowance!==''&&x.allowance!=null?fmt(x.allowance):''),row(L('البنك','Bank'),x.bankName),row('IBAN',x.iban),row(L('الإجازة السنوية','Annual leave'),x.leaveDays?(+x.leaveDays-annualUsed(x.username))+' / '+x.leaveDays:'')])+
   sec(L('الوثائق','Documents'),[row(L('رقم جواز السفر','Passport no.'),x.passportNo),...HR_DOCS.filter(([k])=>k!=='contractEnd').map(([k,n])=>row(L('انتهاء ','Expiry: ')+n,x[k]?x[k]+((d=>d!==null&&d<=30?(d<0?L(' (منتهية)',' (expired)'):L(' (بعد '+d+' يوم)',' (in '+d+' days)')):'')(days(x[k]))):''))])+
   sec(L('الطوارئ','Emergency contact'),[row(L('الاسم','Name'),x.emergencyName),row(L('الصلة','Relation'),x.emergencyRelation),row(L('الجوال','Mobile'),x.emergencyPhone)])+
   sec(L('الإجازات المعتمدة هذه السنة','Approved leave this year'),lv.map(l=>row(l.type+' · '+l.days+L(' يوم',' days'),l.from+' → '+l.to)))+
   sec(L('التقييمات','Evaluations'),evs.slice(0,5).map(e=>row(e.period,e.total+' / 100')))}
$('hrCsv').onclick=()=>csvOut('munjiz-staff.csv',[L('الرقم الوظيفي','Employee no.'),L('الاسم','Name'),L('المسمى','Job title'),L('القسم','Department'),L('التخصص','Specialisation'),L('المؤهل','Qualification'),L('المهارات','Skills'),L('الجنسية','Nationality'),L('الجوال','Mobile'),L('البريد','Email'),L('تاريخ التعيين','Hire date'),L('نوع العقد','Contract'),L('نهاية العقد','Contract end'),L('انتهاء البطاقة','QID expiry'),L('انتهاء الجواز','Passport expiry'),L('انتهاء الإقامة','Residence expiry'),L('انتهاء البطاقة الصحية','Health card expiry'),L('الراتب','Salary'),L('البدلات','Allowances')],
  hrList().map(x=>[x.empNo,x.name,x.jobTitle,x.department,x.specialty,x.qualification,x.skills,x.nationality,x.phone,x.email,x.hireDate,x.contractType,x.contractEnd,x.qidExpiry,x.passportExpiry,x.visaExpiry,x.healthCardExpiry,x.salary,x.allowance]));
$('hrT').addEventListener('click',async e=>{const v=e.target.closest('[data-hrv]');if(v){const x=(DB.Staff||[]).find(y=>y.username===v.dataset.hrv);if(x)printDoc(L('ملف الموظف: ','Employee file: ')+(x.name||x.username),hrProfile(x));return}
  const b=e.target.closest('[data-hre]');if(!b)return;if(!STAFFL.length)await loadStaff();openStaff(STAFFL.find(y=>y.username===b.dataset.hre))});
$('addEmp2').onclick=()=>openStaff(null);
// leave
const LV_ST=['بانتظار الموافقة','موافق عليها','مرفوضة'];
function renderLeave(){if(!canHR())return;const f=$('lvF').value,pend=DB.Leaves.filter(l=>l.status==='بانتظار الموافقة').length;$('nLeave').textContent=pend||'';
  $('lvBal').innerHTML=table([L('الموظف','Employee'),L('الإجازة السنوية','Annual leave'),L('المستخدم','Used'),L('المتبقي','Remaining'),L('إجازات أخرى هذه السنة','Other leave this year')],(DB.Staff||[]).map(x=>{const u=annualUsed(x.username),o=DB.Leaves.filter(l=>l.username===x.username&&l.type!=='سنوية'&&l.status==='موافق عليها'&&String(l.from).slice(0,4)===yearOf()).reduce((a,l)=>a+(+l.days||0),0);
    return `<tr><td>${esc(x.name||x.username)}</td><td class="num">${x.leaveDays||'—'}</td><td class="num">${u}</td><td class="num ${(+x.leaveDays||0)-u<0?'bad':''}">${x.leaveDays?(+x.leaveDays)-u:'—'}</td><td class="num">${o}</td></tr>`}));
  const list=DB.Leaves.filter(l=>!f||l.status===f).sort((a,b)=>a.from<b.from?1:-1);
  $('lvT').innerHTML=table([L('الموظف','Employee'),L('النوع','Type'),L('من','From'),L('إلى','To'),L('الأيام','Days'),L('الحالة','Status'),L('ملاحظة','Note'),''],list.map(l=>`<tr><td>${esc(staffName(l.username))}</td><td>${esc(l.type)}</td><td class="num">${esc(l.from)}</td><td class="num">${esc(l.to)}</td><td class="num">${esc(l.days)}</td>
    <td><span class="st ${l.status==='موافق عليها'?'st-5':l.status==='مرفوضة'?'st-6':'st-1'}">${esc(l.status)}</span>${l.decidedBy?`<br><small class="mute">${esc(staffName(l.decidedBy))}</small>`:''}</td><td><small>${esc(l.note||'')}</small></td>
    <td><div class="acts">${l.status==='بانتظار الموافقة'?`<button class="btn xs pri" type="button" data-lvok="${esc(l.id)}">${L('موافقة','Approve')}</button><button class="btn xs ghost danger" type="button" data-lvno="${esc(l.id)}">${L('رفض','Refuse')}</button>`:''}<button class="btn xs ghost" type="button" data-lved="${esc(l.id)}">${L('تعديل','Edit')}</button></div></td></tr>`))}
$('lvF').onchange=renderLeave;
$('lvT').addEventListener('click',async e=>{const ok=e.target.closest('[data-lvok]'),no=e.target.closest('[data-lvno]'),ed=e.target.closest('[data-lved]');
  if(ed){openLeave(DB.Leaves.find(x=>x.id===ed.dataset.lved));return}if(!ok&&!no)return;const row=Object.assign({},DB.Leaves.find(x=>x.id===(ok||no).dataset[ok?'lvok':'lvno']));
  row.status=ok?'موافق عليها':'مرفوضة';if(!REMOTE)row.decidedBy=ME.username;try{await saveRow('Leaves',row);toast(ok?L('تمت الموافقة','Approved'):L('رُفض الطلب','Refused'));renderAll()}catch(err){}});
const fL=$('fL');let editL=null;const lvDays=(a,b)=>{const x=new Date(a),y=new Date(b);return isNaN(x)||isNaN(y)||y<x?0:Math.round((y-x)/864e5)+1};
function openLeave(l){editL=l||{};fL.reset();fL.elements.username.innerHTML=(DB.Staff||[]).map(x=>`<option value="${esc(x.username)}">${esc(x.name||x.username)}</option>`).join('');['username','type','from','to','status','note'].forEach(k=>{if(editL[k])fL.elements[k].value=editL[k]});
  if(!editL.id)fL.elements.status.value='موافق عليها';$('delL').hidden=!editL.id;$('dlgL').showModal()}
$('newLv').onclick=()=>openLeave(null);
fL.addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;const row=Object.assign({},editL);['username','type','from','to','status','note'].forEach(k=>row[k]=fL.elements[k].value.trim());
  row.days=lvDays(row.from,row.to);if(!row.days){e.preventDefault();toast(L('تاريخ النهاية قبل البداية','The end date is before the start'));return}if(!REMOTE&&row.status!=='بانتظار الموافقة')row.decidedBy=ME.username;
  try{await saveRow('Leaves',row);renderAll()}catch(err){}});
$('delL').onclick=async()=>{$('dlgL').close();if(!await ask(L('حذف الإجازة؟','Delete the leave?'),{ok:L('حذف','Delete')}))return;try{await S.del('Leaves',editL.id);await reload()}catch(err){toast(errText(err.message))}};
// payroll
function renderSal(){if(!canHR())return;if(!$('slM').value)$('slM').value=iso().slice(0,7);const m=$('slM').value,list=DB.Payroll.filter(x=>x.month===m);
  $('slK').innerHTML=kpis([[L('الموظفون في المسير','Employees on payroll'),list.length],[L('صافي الرواتب','Net salaries'),money(list.reduce((a,x)=>a+(+x.net||0),0))],[L('المدفوع','Paid'),money(list.filter(x=>x.status==='مدفوع').reduce((a,x)=>a+(+x.net||0),0))],[L('غير مدفوع','Unpaid'),list.filter(x=>x.status!=='مدفوع').length,list.some(x=>x.status!=='مدفوع')?'bad':'']]);
  $('slT').innerHTML=table([L('الموظف','Employee'),L('الأساسي','Basic'),L('البدلات','Allowances'),L('الخصومات','Deductions'),L('الصافي','Net'),L('الحالة','Status'),L('ملاحظة','Note'),''],list.map(x=>{const lock=x.status==='مدفوع';
    return `<tr data-sl="${esc(x.id)}"><td>${esc(staffName(x.username))}</td><td><input type="number" min="0" data-s="basic" value="${esc(x.basic)}" ${lock?'disabled':''}></td><td><input type="number" min="0" data-s="allowances" value="${esc(x.allowances)}" ${lock?'disabled':''}></td><td><input type="number" min="0" data-s="deductions" value="${esc(x.deductions||0)}" ${lock?'disabled':''}></td>
    <td class="num"><b>${fmt(x.net)}</b></td><td>${lock?`<span class="st st-5">${L('مدفوع','Paid')}</span><br><small class="num mute">${esc(x.paidDate||'')}</small>`:`<span class="st st-1">${L('مسودة','Draft')}</span>`}</td><td><input data-s="note" value="${esc(x.note||'')}" ${lock?'disabled':''}></td>
    <td><div class="acts">${lock?'':`<button class="btn xs ghost" type="button" data-slsave>${L('حفظ','Save')}</button><button class="btn xs pri" type="button" data-slpay>${L('دفع','Pay')}</button>`}<button class="btn xs ghost" type="button" data-slip>${L('قسيمة الراتب','Payslip')}</button></div></td></tr>`}))}
$('slM').onchange=renderSal;
$('slGen').onclick=async()=>{const m=$('slM').value;let n=0;for(const x of (DB.Staff||[])){if(DB.Payroll.some(p=>p.month===m&&p.username===x.username)||!(+x.salary||+x.allowance))continue;
  const b=+x.salary||0,a=+x.allowance||0;await saveRow('Payroll',{month:m,username:x.username,basic:b,allowances:a,deductions:0,net:b+a,status:'مسودة',paidDate:'',note:''});n++}
  toast(n?L(`أُعدّ ${n} مسير`,`${n} payslips prepared`):L('لا يوجد موظفون جدد للمسير (تأكد من إدخال الراتب في ملف الموظف).','No new employees to add (check the salary in each employee file).'));renderSal()};
$('slT').addEventListener('click',async e=>{const tr=e.target.closest('[data-sl]');if(!tr)return;const row=Object.assign({},DB.Payroll.find(x=>x.id===tr.dataset.sl));
  if(e.target.closest('[data-slip]')){printSlip(row);return}const save=e.target.closest('[data-slsave]'),pay=e.target.closest('[data-slpay]');if(!save&&!pay)return;
  tr.querySelectorAll('[data-s]').forEach(i=>row[i.dataset.s]=i.dataset.s==='note'?i.value.trim():+i.value||0);row.net=(+row.basic||0)+(+row.allowances||0)-(+row.deductions||0);
  if(pay){if(!await ask(L(`دفع راتب ${staffName(row.username)} بصافي ${fmt(row.net)} ر.ق؟ يُسجَّل مصروفاً ويُقفل المسير.`,`Pay ${staffName(row.username)} a net ${fmt(row.net)} QAR? It is recorded as an expense and locked.`),{ok:L('دفع','Pay')}))return;row.status='مدفوع';row.paidDate=iso();
    if(!REMOTE){const ex=await saveRow('Expenses',{date:row.paidDate,category:'رواتب',amount:row.net,note:'راتب '+row.username+' '+row.month,by:ME.username,account:'1102'});row.expenseId=ex.id}}
  try{await saveRow('Payroll',row);if(pay)await reload();toast(pay?L('دُفع الراتب وسُجّل مصروفاً','Salary paid and recorded as an expense'):L('حُفظ','Saved'));renderSal()}catch(err){}});
$('slCsv').onclick=()=>{const m=$('slM').value;csvOut(`munjiz-payroll-${m}.csv`,[L('الشهر','Month'),L('الموظف','Employee'),L('الأساسي','Basic'),L('البدلات','Allowances'),L('الخصومات','Deductions'),L('الصافي','Net'),L('الحالة','Status'),L('تاريخ الدفع','Paid on')],DB.Payroll.filter(x=>x.month===m).map(x=>[x.month,staffName(x.username),x.basic,x.allowances,x.deductions,x.net,x.status,x.paidDate]))};
function printSlip(x){const s=(DB.Staff||[]).find(y=>y.username===x.username)||{};printDoc(L('قسيمة راتب ','Payslip ')+x.month,`<h1>${L('قسيمة راتب','Payslip')}</h1><p>${L('الموظف','Employee')}: <b>${esc(s.name||x.username)}</b>${s.jobTitle?' · '+esc(s.jobTitle):''} · ${L('الشهر','Month')}: <b>${esc(x.month)}</b></p>
  <table><tr><th>${L('الراتب الأساسي','Basic salary')}</th><td>${money(x.basic)}</td></tr><tr><th>${L('البدلات','Allowances')}</th><td>${money(x.allowances)}</td></tr><tr><th>${L('الخصومات','Deductions')}</th><td>${money(x.deductions)}</td></tr><tr class="tot"><th>${L('الصافي','Net pay')}</th><td class="big">${money(x.net)}</td></tr>
  <tr><th>${L('الحالة','Status')}</th><td>${x.status==='مدفوع'?L('مدفوع','Paid')+' · '+esc(x.paidDate||''):L('لم يُدفع بعد','Not paid yet')}</td></tr>${x.note?`<tr><th>${L('ملاحظة','Note')}</th><td>${esc(x.note)}</td></tr>`:''}</table>
  <div class="sig"><div>${L('توقيع الموظف','Employee signature')}</div><div>${L('الختم والتوقيع','Stamp and signature')}</div></div>`)}
// evaluations: five criteria from 1 to 5, shown with the employee's work figures
const CRIT=[['quality',L('جودة العمل والدقة','Quality and accuracy')],['speed',L('سرعة الإنجاز والالتزام بالمواعيد','Speed and meeting deadlines')],['clients',L('التعامل مع العملاء','Dealing with clients')],['discipline',L('الانضباط والحضور','Discipline and attendance')],['team',L('التعاون والمبادرة','Teamwork and initiative')]];
function workStats(u){const it=workItems().filter(w=>w.assignee===u);return {done:it.filter(w=>w.done).length,open:it.filter(w=>!w.closed).length,late:it.filter(isLate).length}}
function renderEval(){if(!canHR())return;$('evT').innerHTML=table([L('الموظف','Employee'),L('الفترة','Period'),...CRIT.map(c=>c[1]),L('النتيجة','Score'),L('المقيّم','By'),''],[...DB.Evals].sort((a,b)=>a.created<b.created?1:-1).map(v=>{const sc=(()=>{try{return JSON.parse(v.scores||'{}')}catch(e){return {}}})();
  return `<tr><td>${esc(staffName(v.username))}</td><td>${esc(v.period)}</td>${CRIT.map(c=>`<td class="num">${sc[c[0]]||''}</td>`).join('')}<td>${progBar(+v.total||0)}</td><td>${esc(staffName(v.by))}</td><td><button class="btn xs ghost" type="button" data-ev="${esc(v.id)}">${L('عرض','Open')}</button></td></tr>`}))}
const fV=$('fV');let editV=null;
function openEval(v){editV=v||{};fV.reset();fV.elements.username.innerHTML=(DB.Staff||[]).map(x=>`<option value="${esc(x.username)}">${esc(x.name||x.username)}</option>`).join('');if(editV.username)fV.elements.username.value=editV.username;
  fV.elements.period.value=editV.period||'';fV.elements.note.value=editV.note||'';const sc=(()=>{try{return JSON.parse(editV.scores||'{}')}catch(e){return {}}})();
  $('vScores').innerHTML=CRIT.map(([k,n])=>`<label class="score"><span>${n}</span><span class="stars">${[1,2,3,4,5].map(i=>`<label><input type="radio" name="sc_${k}" value="${i}" ${(+sc[k]||3)===i?'checked':''}><b>${i}</b></label>`).join('')}</span></label>`).join('');
  evAuto();$('delV').hidden=!editV.id;$('dlgV').showModal()}
function evAuto(){const s=workStats(fV.elements.username.value);$('vAuto').textContent=L(`أعماله في النظام: أنجز ${s.done}، مفتوحة ${s.open}، متأخرة ${s.late}.`,`Work in the system: ${s.done} done, ${s.open} open, ${s.late} overdue.`)}
fV.elements.username.onchange=evAuto;$('newEv').onclick=()=>openEval(null);$('evT').addEventListener('click',e=>{const b=e.target.closest('[data-ev]');if(b)openEval(DB.Evals.find(x=>x.id===b.dataset.ev))});
fV.addEventListener('submit',async e=>{if(e.submitter&&e.submitter.value!=='save')return;const sc={};CRIT.forEach(([k])=>{const r=fV.querySelector(`[name=sc_${k}]:checked`);sc[k]=r?+r.value:3});
  const row=Object.assign({},editV,{username:fV.elements.username.value,period:fV.elements.period.value.trim(),note:fV.elements.note.value.trim(),scores:JSON.stringify(sc)});
  const vals=Object.values(sc);row.total=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*20);if(!row.id)row.by=ME?ME.username:'';try{await saveRow('Evals',row);renderEval()}catch(err){}});
$('delV').onclick=async()=>{$('dlgV').close();if(!await ask(L('حذف التقييم؟','Delete the evaluation?'),{ok:L('حذف','Delete')}))return;try{await S.del('Evals',editV.id);await reload()}catch(err){toast(errText(err.message))}};
// my leave, payslips and evaluations (every employee)
function renderMine(){if(!ME)return;const u=ME.username,me=Object.assign({},(DB.Staff||[]).find(x=>x.username===u)||{},ME);const mine=DB.Leaves.filter(l=>l.username===u).sort((a,b)=>a.from<b.from?1:-1);
  $('myBal').innerHTML=me.leaveDays?`<p>${L('الإجازة السنوية','Annual leave')}: <b class="num">${me.leaveDays}</b> · ${L('المستخدم هذه السنة','Used this year')}: <b class="num">${annualUsed(u)}</b> · ${L('المتبقي','Remaining')}: <b class="num">${(+me.leaveDays)-annualUsed(u)}</b></p>`:`<p class="mute">${L('رصيدك يظهر هنا بعد أن تضيفه الإدارة في ملفك.','Your balance appears here once management adds it to your file.')}</p>`;
  $('myLv').innerHTML=table([L('النوع','Type'),L('من','From'),L('إلى','To'),L('الأيام','Days'),L('الحالة','Status')],mine.map(l=>`<tr><td>${esc(l.type)}</td><td class="num">${esc(l.from)}</td><td class="num">${esc(l.to)}</td><td class="num">${esc(l.days)}</td><td>${esc(l.status)}</td></tr>`));
  $('mySal').innerHTML=table([L('الشهر','Month'),L('الصافي','Net'),L('الحالة','Status'),''],DB.Payroll.filter(x=>x.username===u).sort((a,b)=>a.month<b.month?1:-1).map(x=>`<tr><td class="num">${esc(x.month)}</td><td class="num">${fmt(x.net)}</td><td>${x.status==='مدفوع'?L('مدفوع','Paid'):L('مسودة','Draft')}</td><td><button class="btn xs ghost" type="button" data-myslip="${esc(x.id)}">${L('قسيمة الراتب','Payslip')}</button></td></tr>`));
  const ev=DB.Evals.filter(v=>v.username===u);$('myEv').innerHTML=ev.length?`<ul class="plain">${ev.map(v=>`<li>${esc(v.period)} · ${progBar(+v.total||0)}${v.note?`<br><small class="mute">${esc(v.note)}</small>`:''}</li>`).join('')}</ul>`:`<p class="mute">${L('لا توجد تقييمات بعد.','No evaluations yet.')}</p>`}
$('mySal').addEventListener('click',e=>{const b=e.target.closest('[data-myslip]');if(b)printSlip(DB.Payroll.find(x=>x.id===b.dataset.myslip))});
$('myLvF').onsubmit=async e=>{e.preventDefault();const f=$('myLvF').elements,body={type:f.type.value,from:f.from.value,to:f.to.value,note:f.note.value.trim()};$('myLvErr').textContent='';
  if(!lvDays(body.from,body.to)){$('myLvErr').textContent=L('تحقق من التاريخين.','Check the dates.');return}
  try{if(REMOTE)await S.api('myLeave',body);else await saveRow('Leaves',Object.assign(body,{username:ME.username,days:lvDays(body.from,body.to),status:'بانتظار الموافقة'}));$('myLvF').reset();toast(L('أُرسل طلب الإجازة إلى الإدارة','Leave request sent to management'));await reload();go('mine')}catch(err){$('myLvErr').textContent=errText(err.message)}};

// ---- periodic reports, balance sheet, cash flow, receivables ageing, budget, period closing and audit trail ----
const CASH=['1101','1102'];
function rangeOf(type,d){const x=new Date(d||iso()),y=x.getFullYear(),m=x.getMonth(),f=dstr;
  if(type==='d')return [f(x),f(x)];if(type==='w'){const s=new Date(x);s.setDate(x.getDate()-x.getDay());const e=new Date(s);e.setDate(s.getDate()+6);return [f(s),f(e)]}
  if(type==='m')return [f(new Date(y,m,1)),f(new Date(y,m+1,0))];if(type==='q'){const q=Math.floor(m/3)*3;return [f(new Date(y,q,1)),f(new Date(y,q+3,0))]}
  if(type==='h'){const h=m<6?0:6;return [f(new Date(y,h,1)),f(new Date(y,h+6,0))]}return [f(new Date(y,0,1)),f(new Date(y,11,31))]}
const RP_NAME={d:L('التقرير اليومي','Daily report'),w:L('التقرير الأسبوعي','Weekly report'),m:L('التقرير الشهري','Monthly report'),q:L('التقرير الربع سنوي','Quarterly report'),h:L('التقرير نصف السنوي','Half-yearly report'),y:L('التقرير السنوي','Annual report')};
function figures(P){const pays=DB.Payments.filter(p=>inP(p.date,P)),exps=DB.Expenses.filter(x=>inP(x.date,P)),tx=DB.Transactions.filter(t=>inP(t.created,P)&&t.status!=='ملغاة');
  const rev=pays.reduce((a,p)=>a+(+p.amount||0),0),cost=exps.reduce((a,x)=>a+(+x.amount||0),0);
  return {pays,exps,tx,rev,cost,profit:rev-cost,fees:tx.reduce((a,t)=>a+(+t.fee||0),0),done:DB.Transactions.filter(t=>t.status==='منجزة'&&inP(t.closed||t.updated,P)).length,clients:DB.Clients.filter(c=>inP(c.created,P)).length}}
let RP=null;
function renderRep(){if(!can('finance'))return;if(!$('rpD').value)$('rpD').value=iso();const t=$('rpT').value,P=rangeOf(t,$('rpD').value);
  const prevD=new Date(P[0]);prevD.setDate(prevD.getDate()-1);const PP=rangeOf(t,dstr(prevD)),F=figures(P),G=figures(PP);RP={t,P,F};
  const ch=(a,b,inv)=>b?`<small class="${(inv?a<=b:a>=b)?'good':'bad'}">${a>=b?'▲':'▼'} ${Math.abs(Math.round((a-b)/Math.abs(b)*100))}%</small>`:'';
  const byC={};F.exps.forEach(x=>byC[x.category]=(byC[x.category]||0)+(+x.amount||0));const byM={};F.pays.forEach(p=>byM[p.method]=(byM[p.method]||0)+(+p.amount||0));
  $('rpOut').innerHTML=`<div class="panel"><h3>${RP_NAME[t]}: <span class="num">${P[0]}${P[1]!==P[0]?' — '+P[1]:''}</span></h3><p class="mute sm">${L('المقارنة مع الفترة السابقة','Compared with the previous period')}: <span class="num">${PP[0]} — ${PP[1]}</span></p>
    <div class="kpis">${[[L('الإيراد المحصّل','Revenue collected'),money(F.rev),ch(F.rev,G.rev)],[L('المصروفات','Expenses'),money(F.cost),ch(F.cost,G.cost,1)],[L('صافي الربح','Net profit'),money(F.profit),ch(F.profit,G.profit)],[L('أتعاب المعاملات الجديدة','Fees on new transactions'),money(F.fees),ch(F.fees,G.fees)],
      [L('معاملات جديدة','New transactions'),F.tx.length,ch(F.tx.length,G.tx.length)],[L('معاملات أُنجزت','Transactions completed'),F.done,ch(F.done,G.done)],[L('عملاء جدد','New clients'),F.clients,ch(F.clients,G.clients)],[L('سندات القبض','Receipts'),F.pays.length,'']].map(([k,v,c])=>`<div class="kpi"><b class="num">${v}</b><span>${k} ${c}</span></div>`).join('')}</div></div>
    <div class="grid2"><div class="panel"><h3>${L('الإيراد حسب طريقة الدفع','Revenue by payment method')}</h3>${Object.keys(byM).length?`<table class="mini">${Object.entries(byM).map(([k,v])=>`<tr><td>${esc(k)}</td><td class="num">${fmt(v)}</td></tr>`).join('')}</table>`:`<p class="mute">${L('لا يوجد.','None.')}</p>`}</div>
      <div class="panel"><h3>${L('المصروفات حسب البند','Expenses by item')}</h3>${Object.keys(byC).length?`<table class="mini">${Object.entries(byC).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td class="num">${fmt(v)}</td></tr>`).join('')}</table>`:`<p class="mute">${L('لا يوجد.','None.')}</p>`}</div></div>
    <div class="panel"><h3>${L('سندات القبض','Receipts')}</h3>${table([L('التاريخ','Date'),L('السند','Receipt'),L('العميل','Client'),L('المعاملة','Transaction'),L('الطريقة','Method'),L('المبلغ','Amount')],F.pays.sort((a,b)=>a.date>b.date?1:-1).map(p=>`<tr><td class="num">${esc(p.date)}</td><td class="num">${esc(p.receiptNo)}</td><td>${esc(cli(p.clientId).name||'')}</td><td class="num">${esc(p.txnId)}</td><td>${esc(p.method)}</td><td class="num">${fmt(p.amount)}</td></tr>`))}</div>
    <div class="panel"><h3>${L('المصروفات','Expenses')}</h3>${table([L('التاريخ','Date'),L('البند','Item'),L('ملاحظة','Note'),L('المبلغ','Amount')],F.exps.sort((a,b)=>a.date>b.date?1:-1).map(x=>`<tr><td class="num">${esc(x.date)}</td><td>${esc(x.category)}</td><td><small>${esc(x.note||'')}</small></td><td class="num">${fmt(x.amount)}</td></tr>`))}</div>`}
$('rpT').onchange=$('rpD').onchange=renderRep;
const shiftRp=n=>{const P=rangeOf($('rpT').value,$('rpD').value),d=new Date(n<0?P[0]:P[1]);d.setDate(d.getDate()+n);$('rpD').value=dstr(d);renderRep()};
$('rpPrev').onclick=()=>shiftRp(-1);$('rpNext').onclick=()=>shiftRp(1);
$('rpPrint').onclick=()=>printView('rpOut',RP_NAME[$('rpT').value]+' '+RP.P[0]+(RP.P[1]!==RP.P[0]?' — '+RP.P[1]:''));
$('rpCsv').onclick=()=>{const F=RP.F,r=[[L('الإيراد المحصّل','Revenue collected'),F.rev],[L('المصروفات','Expenses'),F.cost],[L('صافي الربح','Net profit'),F.profit],[L('أتعاب المعاملات الجديدة','Fees on new transactions'),F.fees],[L('معاملات جديدة','New transactions'),F.tx.length],[L('معاملات أُنجزت','Transactions completed'),F.done],[L('عملاء جدد','New clients'),F.clients]];
  F.exps.forEach(x=>r.push([L('مصروف','Expense')+': '+x.category+' · '+x.date,-x.amount]));F.pays.forEach(p=>r.push([L('سند','Receipt')+' '+p.receiptNo+' · '+p.date,p.amount]));csvOut(`munjiz-report-${RP.t}-${RP.P[0]}.csv`,[L('البند','Item'),L('القيمة','Value')],r)};
// balance sheet: assets = liabilities + equity + profit to date
function renderBs(){if(!can('finance'))return;if(!$('bsD').value)$('bsD').value=iso();const b=balances($('bsD').value),A=coa(),val=a=>natural(a.type,b[a.code]||{dr:0,cr:0}),nm=a=>`${a.code} · ${esc(EN&&a.nameEn?a.nameEn:a.name)}`;
  const grp=t=>A.filter(a=>a.type===t).map(a=>[a,val(a)]).filter(x=>Math.abs(x[1])>.004);const sum=l=>l.reduce((s,x)=>s+x[1],0);
  const as=grp('asset'),li=grp('liability'),eq=grp('equity'),earn=sum(grp('income'))-sum(grp('expense')),ta=sum(as),tl=sum(li),te=sum(eq)+earn;
  const sec=(t,l)=>`<tr class="h"><td colspan="2">${t}</td></tr>`+(l.map(([a,v])=>`<tr><td>${nm(a)}</td><td class="num">${fmt(v)}</td></tr>`).join('')||`<tr><td class="mute">${L('لا يوجد','None')}</td><td></td></tr>`);
  $('bsTbl').innerHTML=`<table class="fin"><tbody>${sec(L('الأصول','Assets'),as)}<tr class="tot"><td>${L('إجمالي الأصول','Total assets')}</td><td class="num">${fmt(ta)}</td></tr>
   ${sec(L('الخصوم','Liabilities'),li)}<tr class="tot"><td>${L('إجمالي الخصوم','Total liabilities')}</td><td class="num">${fmt(tl)}</td></tr>
   ${sec(L('حقوق الملكية','Equity'),eq)}<tr><td>${L('صافي الربح المتراكم حتى التاريخ','Accumulated profit to date')}</td><td class="num">${fmt(earn)}</td></tr><tr class="tot"><td>${L('إجمالي حقوق الملكية','Total equity')}</td><td class="num">${fmt(te)}</td></tr>
   <tr class="net"><td>${L('الخصوم وحقوق الملكية','Liabilities and equity')}</td><td class="num">${fmt(tl+te)}</td></tr></tbody></table>
   <p class="sm ${Math.abs(ta-tl-te)<.01?'good':'bad'}">${Math.abs(ta-tl-te)<.01?L('✓ القائمة متوازنة','✓ The statement balances'):L('القائمة غير متوازنة، راجع القيود اليدوية','The statement does not balance; check the manual entries')}</p>
   <p class="mute sm">${L('ملاحظة: المستحق على العملاء يظهر في «أرصدة العملاء» و«أعمار الديون»، لأن الإيراد يُسجَّل عند التحصيل (الأساس النقدي).','Note: amounts owed by clients appear under Client balances and Receivables ageing, because income is recorded when collected (cash basis).')}</p>`}
$('bsD').onchange=renderBs;$('bsPrint').onclick=()=>printView('bsTbl',L('قائمة المركز المالي في ','Balance sheet at ')+$('bsD').value);
// cash flow: movement of cash and bank, by activity
function renderCf(){if(!can('finance'))return;const P=periodOf($('cfP').value),A=coa(),typ=c=>(A.find(a=>a.code===c)||{}).type||'';let open=0;
  const parts={op:{},inv:{},fin:{}};entries().forEach(e=>{const cash=e.lines.filter(l=>CASH.includes(l.a)).reduce((s,l)=>s+(+l.dr||0)-(+l.cr||0),0);if(!cash)return;
    if(e.date<P[0]){open+=cash;return}if(e.date>P[1])return;const other=e.lines.find(l=>!CASH.includes(l.a));if(!other)return;
    const t=typ(other.a),k=(t==='equity'||(t==='liability'&&!['2101','2201','2301'].includes(other.a)))?'fin':(t==='asset'&&other.a>='15')?'inv':'op';
    const lab=e.auto==='pay'?L('التحصيل من العملاء','Collected from clients'):accName(other.a);parts[k][lab]=(parts[k][lab]||0)+cash});
  const sec=(t,o)=>{const s=Object.values(o).reduce((a,b)=>a+b,0);return [`<tr class="h"><td colspan="2">${t}</td></tr>`+(Object.entries(o).map(([k,v])=>`<tr><td>${esc(k)}</td><td class="num ${v<0?'bad':''}">${fmt(v)}</td></tr>`).join('')||`<tr><td class="mute">${L('لا يوجد','None')}</td><td></td></tr>`)+`<tr class="tot"><td>${L('صافي','Net')} ${t}</td><td class="num">${fmt(s)}</td></tr>`,s]};
  const [a,x]=sec(L('الأنشطة التشغيلية','Operating activities'),parts.op),[b,y]=sec(L('الأنشطة الاستثمارية','Investing activities'),parts.inv),[c,z]=sec(L('الأنشطة التمويلية','Financing activities'),parts.fin);
  $('cfT').innerHTML=`<p class="mute sm num">${$('cfP').value==='all'?L('كل الفترات','All time'):P[0]+' — '+P[1]}</p><table class="fin"><tbody><tr><td>${L('النقدية في بداية الفترة (الصندوق والبنك)','Cash at the start (cash and bank)')}</td><td class="num">${fmt(open)}</td></tr>${a}${b}${c}
    <tr class="tot"><td>${L('صافي التغير في النقدية','Net change in cash')}</td><td class="num">${fmt(x+y+z)}</td></tr><tr class="net"><td>${L('النقدية في نهاية الفترة','Cash at the end')}</td><td class="num">${fmt(open+x+y+z)}</td></tr></tbody></table>`}
$('cfPrint').onclick=()=>printView('cfT',L('قائمة التدفقات النقدية','Cash flow statement'));
// receivables ageing
const BUCKETS=[[0,30,'0–30'],[31,60,'31–60'],[61,90,'61–90'],[91,1e9,'90+']];
function agingRows(){const by={};DB.Transactions.filter(t=>t.status!=='ملغاة'&&balance(t)>0).forEach(t=>{const age=-(days(dOnly(t.created))||0),i=BUCKETS.findIndex(([a,b])=>age>=a&&age<=b),r=by[t.clientId]=by[t.clientId]||[0,0,0,0];r[i<0?3:i]+=balance(t)});return Object.entries(by)}
function renderAging(){if(!can('finance'))return;const rows=agingRows(),tot=[0,1,2,3].map(i=>rows.reduce((a,[,r])=>a+r[i],0));
  $('agK').innerHTML=kpis(BUCKETS.map((b,i)=>[L('عمرها ','Age ')+b[2]+L(' يوماً',' days'),money(tot[i]),i>=2&&tot[i]?'bad':'']));
  $('agT').innerHTML=table([L('العميل','Client'),...BUCKETS.map(b=>b[2]+L(' يوماً',' days')),L('الإجمالي','Total')],rows.sort((a,b)=>b[1].reduce((x,y)=>x+y,0)-a[1].reduce((x,y)=>x+y,0)).map(([id,r])=>`<tr><td>${link(id,cli(id).name)}</td>${r.map((v,i)=>`<td class="num ${i>=2&&v?'bad':''}">${v?fmt(v):''}</td>`).join('')}<td class="num"><b>${fmt(r.reduce((a,b)=>a+b,0))}</b></td></tr>`))}
$('agCsv').onclick=()=>csvOut(`munjiz-ageing-${iso()}.csv`,[L('العميل','Client'),...BUCKETS.map(b=>b[2]),L('الإجمالي','Total')],agingRows().map(([id,r])=>[cli(id).name||id,...r,r.reduce((a,b)=>a+b,0)]));
// budget vs actual (year to date)
function renderBud(){if(!can('finance'))return;const ys=[...new Set([iso().slice(0,4),String(+iso().slice(0,4)+1),...DB.Budget.map(b=>String(b.year))])].sort().reverse(),cur=$('bdY').value||iso().slice(0,4);
  $('bdY').innerHTML=ys.map(y=>`<option ${y===cur?'selected':''}>${y}</option>`).join('');const Y=$('bdY').value,P=[Y+'-01-01',Y+'-12-31'];
  const frac=Y<iso().slice(0,4)?1:Y>iso().slice(0,4)?0:(+iso().slice(5,7))/12,sum={};entries().filter(e=>inP(e.date,P)).forEach(e=>e.lines.forEach(l=>{const s=sum[l.a]=sum[l.a]||{dr:0,cr:0};s.dr+=+l.dr||0;s.cr+=+l.cr||0}));
  const A=coa().filter(a=>a.type==='income'||a.type==='expense');
  $('bdT').innerHTML=table([L('الحساب','Account'),L('الموازنة السنوية','Annual budget'),L('الموازنة حتى الآن','Budget to date'),L('الفعلي حتى الآن','Actual to date'),L('الفرق','Variance'),L('نسبة التنفيذ','Used')],A.map(a=>{const b=DB.Budget.find(x=>String(x.year)===Y&&String(x.code)===a.code),bud=+((b||{}).amount)||0,act=natural(a.type,sum[a.code]||{dr:0,cr:0}),td=bud*frac,v=a.type==='income'?act-td:td-act;
    return `<tr><td>${a.code} · ${esc(EN&&a.nameEn?a.nameEn:a.name)} <small class="mute">${TYPES[a.type]}</small></td><td><input type="number" min="0" data-bud="${a.code}" value="${bud||''}"></td><td class="num">${fmt(Math.round(td))}</td><td class="num">${fmt(act)}</td><td class="num ${v<0?'bad':'good'}">${bud?fmt(Math.round(v)):''}</td><td>${bud?progBar(Math.round(act/bud*100)):''}</td></tr>`}))}
$('bdY').onchange=renderBud;
$('bdSave').onclick=async()=>{const Y=$('bdY').value;let n=0;for(const i of $('bdT').querySelectorAll('[data-bud]')){const v=+i.value||0,b=DB.Budget.find(x=>String(x.year)===Y&&String(x.code)===i.dataset.bud);
  if(b?+b.amount!==v:v){await saveRow('Budget',Object.assign({},b||{year:Y,code:i.dataset.bud},{amount:v}));n++}}toast(n?L('حُفظت الموازنة','Budget saved'):L('لا تغييرات','No changes'));renderBud()};
// closing and audit trail
function renderClose(){if(!can('finance'))return;const lk=DB.Lock||'';$('lkNow').innerHTML=lk?`${L('الفترات مقفلة حتى','Periods are closed up to')} <b class="num">${esc(lk)}</b>`:L('لا توجد فترة مقفلة.','No period is closed.');
  $('lkGo').disabled=$('lkOpen').disabled=!isAdmin()||!REMOTE;if(!$('lkD').value){const d=new Date();$('lkD').value=dstr(new Date(d.getFullYear(),d.getMonth(),0))}
  const b=balances(),D=Object.values(b).reduce((a,x)=>a+x.dr,0),C=Object.values(b).reduce((a,x)=>a+x.cr,0),unpaid=DB.Payroll.filter(x=>x.status!=='مدفوع'&&x.month<iso().slice(0,7)).length,owing=DB.Transactions.filter(t=>t.status==='منجزة'&&balance(t)>0).length,noTx=DB.Expenses.filter(x=>x.category===GOVCAT&&!x.txnId).length;
  const chk=(ok,t)=>`<li>${ok?'<span class="good">✓</span>':'<span class="bad">!</span>'} ${t}</li>`;
  $('ckL').innerHTML=`<ul class="plain">${chk(Math.abs(D-C)<.01,L('ميزان المراجعة متوازن','The trial balance balances'))}${chk(!owing,L(`معاملات منجزة لم يُحصّل كامل رسومها: ${owing}`,`Completed transactions not fully paid: ${owing}`))}${chk(!unpaid,L(`رواتب أشهر سابقة غير مدفوعة: ${unpaid}`,`Unpaid salaries from past months: ${unpaid}`))}${chk(!noTx,L(`رسوم حكومية مدفوعة غير مربوطة بمعاملة: ${noTx}`,`Government fees paid without a transaction: ${noTx}`))}</ul>`;
  if(REMOTE){const P=periodOf($('auP').value);S.api('auditTrail',{from:P[0],to:P[1]}).then(j=>{$('auT').innerHTML=table([L('الوقت','Time'),L('الموظف','By'),L('الإجراء','Action'),L('السجل','Record'),L('التفاصيل','Details')],j.rows.map(x=>`<tr><td class="num">${esc(x.created)}</td><td>${esc(staffName(x.username))}</td><td>${esc(x.action)}</td><td class="num">${esc(x.recordId||'')}</td><td><small>${esc(x.summary)}</small></td></tr>`))}).catch(e=>{$('auT').innerHTML=`<div class="empty">${esc(errText(e.message))}</div>`})}
  else $('auT').innerHTML=NEEDS_SERVER}
$('lkGo').onclick=async()=>{const d=$('lkD').value;if(!d||!await ask(L(`إقفال كل الفترات حتى ${d}؟ لن يمكن تعديل الدفعات والمصروفات والقيود المؤرخة قبلها.`,`Close all periods up to ${d}? Payments, expenses and entries dated on or before it can no longer change.`),{ok:L('إقفال','Close')}))return;
  try{const j=await S.api('setLock',{date:d});DB.Lock=j.lock;toast(L('أُقفلت الفترة','Period closed'));renderClose()}catch(err){toast(errText(err.message))}};
$('lkOpen').onclick=async()=>{if(!await ask(L('فتح كل الفترات المقفلة؟','Reopen all closed periods?'),{ok:L('فتح','Reopen')}))return;try{await S.api('setLock',{date:''});DB.Lock='';renderClose()}catch(err){toast(errText(err.message))}};
const VIEWS={rep:renderRep,bs:renderBs,cf:renderCf,aging:renderAging,bud:renderBud,close:renderClose,my:renderMy,work:renderWork,mgr:renderMgr,fin:renderFin,pays:renderFin,exps:renderFin,gov:renderGov,frep:renderFrep,coa:renderCoa,jrnl:renderJrnl,cbal:renderCbal,pl:renderPl,tb:renderTb,hrf:renderHrf,leave:renderLeave,sal:renderSal,eval:renderEval,mine:renderMine,theme:renderTheme};

showMode();
// sign-in handed over from the account-type choice on portal.html (same tab, read once and removed)
let HAND=null;try{HAND=JSON.parse(sessionStorage.getItem('munjiz_crm_handoff')||'null');sessionStorage.removeItem('munjiz_crm_handoff')}catch(e){}
if(HAND){sessionStorage.removeItem(TKEY);showLogin();$('un').value=HAND.u||'';$('pw').value=HAND.p||'';$('loginF').requestSubmit?$('loginF').requestSubmit():$('loginBtn').click()}
else if(S.tok())S.me().then(m=>{ME=m;if(m&&m.mustChange){logout();return}start()}).catch(()=>showLogin());else showLogin();
