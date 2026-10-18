'use strict';
// «حسابي»: حساب العميل. يعمل مع خادم Google Apps Script المضبوط في config.js (API).
// Shared by portal.html and en/portal.html; the <html lang> decides the language.
const EN=document.documentElement.lang==='en';
const CFG=window.MUNJIZ_CONFIG||{};
const D=window.DETAILS||{};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>(Number(n)||0).toLocaleString('en-US');
const T=EN?{
  err:{exists:'You have already rated this transaction. Thank you.',invalid:'Please check the highlighted details.',bad_username:'The username must be 4 to 30 English letters or digits (_ and . allowed).',weak_password:'The password must be at least 8 characters.',
    username_taken:'This username is taken. Please choose another.',phone_has_account:'This mobile number already has an account. Sign in, or message us on WhatsApp to reset the password.',
    must_accept:'Please accept the documents and type your name as a signature.',wrong_login:'The username or password is incorrect.',rate_limited:'Too many attempts. Please try again in an hour.',
    pending:'Your account is waiting for activation. We will call you to confirm your number.',disabled:'This account is currently suspended. Please get in touch with us.',auth:'Your session has ended. Please sign in again.',
    net:'Could not reach the server. Check your connection and try again.',bad_code:'The code is incorrect or has expired. Please request a new one.',not_found:'Not found.',too_many:'You have reached the maximum number of saved logins.'},
  name:'Please enter your full name.',phone:'Please enter a valid Qatari mobile number.',email:'Please enter a valid email or leave it empty.',mismatch:'The two passwords do not match.',
  fgSent:'If the account has an email, we have sent a code to it. It works for 15 minutes.',fgSet:'Set the new password',fgDone:'Your new password is set.',
  pendingOk:'Your account has been created. Because this number already has a file with us, we will call you to confirm it and then activate the account.',
  welcome:n=>`Welcome, ${n}`,client:'Client no.',user:'Username',cur:'QAR',from:'from',
  k:['Open requests','Transactions in progress','Completed','Files'],none:'Nothing yet.',noSoon:'No documents expiring in the next 60 days.',
  th:{no:'No.',date:'Date',svc:'Service',st:'Status',start:'Started',due:'Expected',exp:'Expires',paid:'Paid',fee:'Munjiz fee',ref:'Gov. ref.',services:'Services',prog:'Progress',gov:'Government fees',bal:'Balance',rcpt:'Receipt no.',txn:'Transaction',method:'Method',amount:'Amount'},
  payK:['Total fees','Paid','Balance due'],
  inDays:d=>d===0?'today':`in ${d} days`,expired:'expired',qty:'Qty',remove:'Remove',pickFirst:'Please add at least one service.',
  sent:id=>`Thank you. Request ${id} has been sent, and we will contact you soon.`,saved:'Saved.',pwChanged:'Password changed.',dl:'Download',open:'Open',txn:'Transaction',
  bye:'You have signed out.',office:'Munjiz team',you:'You',noMsg:'No messages yet. Write to us below.',msgSent:'Message sent.',
  credSaved:'Saved encrypted.',credDel:'Delete',credAsk:'Delete this login from your account?',hidden:'hidden',
  consent:c=>c?`You accepted version ${c.version} on ${c.created}, signed as “${c.name}”.`:'No acceptance recorded yet.',
  newer:v=>` A newer version (${v}) is available on the legal documents page.`,
  ST:{'نقداً':'Cash','تحويل بنكي':'Bank transfer','بطاقة':'Card','شيك':'Cheque','أخرى':'Other','جديد':'New','تم التواصل':'Contacted','تحوّل إلى معاملة':'Became a transaction','مغلق':'Closed','جديدة':'New','بانتظار المستندات':'Waiting for documents','قيد التقديم':'Being submitted','قيد المتابعة لدى الجهة':'With the authority','بانتظار العميل':'Waiting for you','منجزة':'Completed','ملغاة':'Cancelled'}
}:{
  err:{exists:'قيّمت هذه المعاملة من قبل، شكراً لك.',invalid:'يرجى مراجعة البيانات المظللة.',bad_username:'اسم المستخدم من 4 إلى 30 حرفاً إنجليزياً أو رقماً، ويمكن استخدام _ و .',weak_password:'كلمة المرور 8 أحرف على الأقل.',
    username_taken:'اسم المستخدم هذا محجوز، يرجى اختيار اسم آخر.',phone_has_account:'يوجد حساب مسجّل بهذا الرقم. يمكنك الدخول إليه، أو مراسلتنا على واتساب لإعادة تعيين كلمة المرور.',
    must_accept:'يرجى الموافقة على المستندات وكتابة اسمك كتوقيع.',wrong_login:'اسم المستخدم أو كلمة المرور غير صحيحة.',rate_limited:'تعددت المحاولات، يرجى المحاولة مرة أخرى بعد ساعة.',
    pending:'حسابك بانتظار التفعيل، وسنتصل بك للتأكد من رقمك.',disabled:'هذا الحساب موقوف حالياً، يسعدنا تواصلك معنا.',auth:'انتهت الجلسة، يرجى تسجيل الدخول مرة أخرى.',
    net:'تعذّر الاتصال بالخادم. تحقق من الاتصال وحاول مرة أخرى.',bad_code:'الرمز غير صحيح أو انتهت صلاحيته، يرجى طلب رمز جديد.',not_found:'غير موجود.',too_many:'وصلت إلى الحد الأقصى لبيانات البوابات المحفوظة.'},
  name:'يرجى كتابة اسمك الكامل.',phone:'يرجى كتابة رقم جوال قطري صحيح.',email:'يرجى كتابة بريد صحيح، أو تركه فارغاً.',mismatch:'كلمتا المرور غير متطابقتين.',
  fgSent:'إذا كان في الحساب بريد فقد أرسلنا إليه رمزاً صالحاً لمدة 15 دقيقة.',fgSet:'عيّن كلمة المرور الجديدة',fgDone:'تم تعيين كلمة المرور الجديدة.',
  pendingOk:'تم إنشاء حسابك. لأن رقمك مسجل لدينا مسبقاً، سنتصل بك للتأكد منه ثم نفعّل الحساب.',
  welcome:n=>`أهلاً، ${n}`,client:'رقم العميل',user:'اسم المستخدم',cur:'ر.ق',from:'من',
  k:['طلبات مفتوحة','معاملات قيد التنفيذ','معاملات منجزة','ملفات'],none:'لا يوجد شيء بعد.',noSoon:'لا توجد مستندات تنتهي خلال 60 يوماً.',
  th:{no:'الرقم',date:'التاريخ',svc:'الخدمة',st:'الحالة',start:'البدء',due:'الموعد المتوقع',exp:'تاريخ الانتهاء',paid:'المدفوع',fee:'أتعاب منجز',ref:'المرجع الحكومي',services:'الخدمات',prog:'الإنجاز',gov:'الرسوم الحكومية',bal:'المتبقي',rcpt:'رقم السند',txn:'المعاملة',method:'طريقة الدفع',amount:'المبلغ'},
  payK:['إجمالي الرسوم','المدفوع','المتبقي عليك'],
  inDays:d=>d===0?'اليوم':`بعد ${d} يوماً`,expired:'منتهٍ',qty:'العدد',remove:'إزالة',pickFirst:'يرجى إضافة خدمة واحدة على الأقل.',
  sent:id=>`شكراً لك، أُرسل الطلب ${id} وسنتواصل معك قريباً.`,saved:'تم الحفظ.',pwChanged:'تم تغيير كلمة المرور.',dl:'تنزيل',open:'فتح',txn:'المعاملة',
  bye:'تم تسجيل الخروج.',office:'فريق منجز',you:'أنت',noMsg:'لا توجد رسائل بعد. اكتب لنا من الأسفل.',msgSent:'أُرسلت الرسالة.',
  credSaved:'تم الحفظ مشفّراً.',credDel:'حذف',credAsk:'حذف بيانات الدخول هذه من حسابك؟',hidden:'مخفية',
  consent:c=>c?`وافقت على الإصدار ${c.version} بتاريخ ${c.created}، ووقّعت باسم «${c.name}».`:'لا توجد موافقة مسجلة بعد.',
  newer:v=>` يوجد إصدار أحدث (${v}) في صفحة المستندات القانونية.`,ST:{}
};
const st=s=>T.ST[s]||s;
const stCls=s=>/منجزة|مغلق|تحوّل/.test(s)?'ok':(/ملغاة/.test(s)?'off':(/جديد/.test(s)?'new':'wait'));
const stTag=s=>s?`<span class="pst ${stCls(s)}">${esc(st(s))}</span>`:'';
function toast(t){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,3200)}

// ---- server ----
const TKEY='munjiz_portal';
let TOKEN=null;try{TOKEN=localStorage.getItem(TKEY)}catch(e){}
async function api(action,body={}){
  let j;
  try{const r=await fetch(CFG.API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(Object.assign({action,lang:EN?'en':'ar'},TOKEN?{token:TOKEN}:{},body))});j=await r.json()}
  catch(e){throw new Error(T.err.net)}
  if(!j.ok){if(j.error==='auth'&&TOKEN){signOut();}throw Object.assign(new Error(T.err[j.error]||j.error),{code:j.error})}
  return j}
function busy(btn,on){if(btn){btn.disabled=on;btn.setAttribute('aria-busy',on)}}
async function submit(form,errEl,fn){const btn=form.querySelector('button[type=submit]');errEl.textContent='';busy(btn,true);
  try{await fn()}catch(e){errEl.textContent=e.message}finally{busy(btn,false)}}

// ---- sign in / sign up ----
const REG=(()=>{try{return JSON.parse(localStorage.getItem('munjiz_client')||'null')}catch(e){return null}})();
function tab(sign){$('forgotF').hidden=true;$('tLogin').parentElement.hidden=false;$('tLogin').setAttribute('aria-selected',!sign);$('tSign').setAttribute('aria-selected',sign);$('loginF').hidden=sign;$('signF').hidden=!sign}
$('tLogin').onclick=()=>tab(false);$('tSign').onclick=()=>tab(true);
// this page is for client accounts only; the management and staff sign-in lives apart in crm.html and is never handed over from here
try{sessionStorage.removeItem('munjiz_crm_handoff')}catch(e){}
if(!CFG.API)$('noApi').hidden=false;
if(REG){$('sName').value=REG.name||'';$('sPhone').value=REG.phone||'';$('sMail').value=REG.email||'';$('sCo').value=REG.company||'';$('sSign').value=REG.name||''}
if(location.hash==='#signup')tab(true);
const phoneOk=p=>/^(\+?974)?[3567]\d{7}$/.test(p);
$('loginF').addEventListener('submit',e=>{e.preventDefault();submit($('loginF'),$('lErr'),async()=>{
  const u=$('lUser').value.trim(),p=$('lPass').value;if(!u||!p)throw new Error(T.err.wrong_login);
  const j=await api('clogin',{username:u,password:p});setToken(j.token);$('lPass').value='';await load()})});
$('signF').addEventListener('submit',e=>{e.preventDefault();submit($('signF'),$('sErr'),async()=>{
  const v=id=>$(id).value.trim(),ph=v('sPhone').replace(/\s/g,''),em=v('sMail');
  if(!v('sName'))throw new Error(T.name);if(!phoneOk(ph))throw new Error(T.phone);
  if(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))throw new Error(T.email);
  if(!/^[a-z0-9_.]{4,30}$/i.test(v('sUser')))throw new Error(T.err.bad_username);
  if($('sPass').value.length<8)throw new Error(T.err.weak_password);
  if($('sPass').value!==$('sPass2').value)throw new Error(T.mismatch);
  if(!$('sOk').checked||!v('sSign'))throw new Error(T.err.must_accept);
  const j=await api('signup',{name:v('sName'),phone:ph,email:em,company:v('sCo'),cr:v('sCr'),estCard:v('sEst'),taxNo:v('sTax'),qid:v('sQid'),address:v('sAddr'),
    username:v('sUser').toLowerCase(),password:$('sPass').value,accept:true,signName:v('sSign'),hp:$('sHp').value});
  $('sPass').value=$('sPass2').value='';
  try{localStorage.setItem('munjiz_client',JSON.stringify({name:v('sName'),phone:ph,email:em,company:v('sCo'),at:new Date().toISOString()}))}catch(err){}
  if(j.pending){tab(false);$('lUser').value=v('sUser').toLowerCase();$('lErr').textContent=T.pendingOk;return}
  setToken(j.token);await load()})});
// forgotten password: a code to the account's email, then a new password (signs in)
let fgSentTo='';
function forgotView(on){$('loginF').hidden=on;$('forgotF').hidden=!on;$('tLogin').parentElement.hidden=on;
  if(on){$('fgP').textContent=$('fgP').dataset.t||($('fgP').dataset.t=$('fgP').textContent);$('fUser').value=$('lUser').value.trim();$('fgStep2').hidden=true;$('fBtn').textContent=$('fBtn').dataset.send||($('fBtn').dataset.send=$('fBtn').textContent);$('fErr').textContent='';fgSentTo='';$('fUser').focus()}}
$('forgot').onclick=()=>forgotView(true);$('fBack').onclick=()=>forgotView(false);
$('forgotF').addEventListener('submit',e=>{e.preventDefault();submit($('forgotF'),$('fErr'),async()=>{
  const u=$('fUser').value.trim();if(!u)throw new Error(T.err.invalid);
  if(!fgSentTo||fgSentTo!==u){await api('cforgot',{username:u});fgSentTo=u;$('fgStep2').hidden=false;$('fBtn').textContent=T.fgSet;$('fgP').textContent=T.fgSent;$('fCode').focus();return}
  if(!/^\d{6}$/.test($('fCode').value.trim()))throw new Error(T.err.bad_code);
  if($('fPass').value.length<8)throw new Error(T.err.weak_password);if($('fPass').value!==$('fPass2').value)throw new Error(T.mismatch);
  const j=await api('creset',{username:u,code:$('fCode').value.trim(),password:$('fPass').value});
  $('fPass').value=$('fPass2').value=$('fCode').value='';forgotView(false);setToken(j.token);await load();toast(T.fgDone)})});
function setToken(t){TOKEN=t;try{localStorage.setItem(TKEY,t)}catch(e){}}
function signOut(){TOKEN=null;ME=null;try{localStorage.removeItem(TKEY)}catch(e){}$('dash').hidden=true;$('auth').hidden=false;$('logout').hidden=true;tab(false);if(window.ACCT_WHO)ACCT_WHO.set(null)}
$('logout').onclick=$('dOut').onclick=()=>{signOut();toast(T.bye);window.scrollTo(0,0)};
// a new client (another company, or someone else at this computer) starts from an empty sign-up form
$('dNewCli').onclick=()=>{signOut();$('signF').reset();tab(true);$('sName').focus();window.scrollTo(0,0)};

// ---- dashboard ----
let ME=null;
const days=s=>{if(!s)return null;const d=new Date(s),t=new Date();t.setHours(0,0,0,0);return isNaN(d)?null:Math.round((d-t)/864e5)};
function table(rows,cols){if(!rows.length)return `<p class="mute">${T.none}</p>`;
  return `<div class="ptable"><table><thead><tr>${cols.map(c=>`<th>${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map(c=>`<td data-l="${esc(c[0])}">${c[1](r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
const txCols=[[T.th.no,t=>esc(t.id)],[T.th.svc,t=>esc(t.service)],[T.th.st,t=>stTag(t.status)],[T.th.start,t=>esc(t.startDate)],[T.th.due,t=>esc(t.dueDate)],[T.th.exp,t=>esc(t.expiryDate)],[T.th.ref,t=>esc(t.govRef)]];
const pct=t=>{const n=Number(t.progress);return /منجزة/.test(t.status)?100:(t.progress!==''&&t.progress!=null&&!isNaN(n)?n:0)};
const progCell=t=>/ملغاة/.test(t.status)?'':`<span class="pprog"><i style="width:${pct(t)}%"></i></span> <small class="num">${pct(t)}%</small>`;
txCols.splice(3,0,[T.th.prog,progCell]);
// after a transaction is done the client can rate it once; it appears on the site only if they agree and the office approves
const RV=EN?{col:'Your rating',rate:'Rate this service',title:'How was our service?',lead:'Your opinion helps us improve. It takes a few seconds.',stars:'Your rating',comment:'Your comment (optional)',pub:'I agree to show my rating and first name on the website',send:'Send',cancel:'Cancel',thanks:'Thank you for your rating.',pick:'Choose from 1 to 5 stars.',of:n=>n+' out of 5'}
 :{col:'تقييمك',rate:'قيّم الخدمة',title:'كيف وجدت خدمتنا؟',lead:'رأيك يساعدنا على التحسن، ولن يأخذ منك إلا ثوانٍ.',stars:'تقييمك',comment:'تعليقك (اختياري)',pub:'أوافق على عرض تقييمي واسمي الأول في الموقع',send:'إرسال',cancel:'إلغاء',thanks:'شكراً لك على تقييمك.',pick:'اختر من نجمة إلى 5 نجوم.',of:n=>n+' من 5'};
const myRev=id=>((ME&&ME.reviews)||[]).find(r=>r.txnId===id);
const starTxt=n=>'★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n);
txCols.push([RV.col,t=>{const r=myRev(t.id);if(r)return `<span class="pstars" aria-label="${RV.of(+r.stars)}">${starTxt(+r.stars||0)}</span>`;
  return t.status==='منجزة'?`<button type="button" class="btn sm ghost" data-rv="${esc(t.id)}">${RV.rate}</button>`:''}]);
function reviewDlg(id){let d=$('rvDlg');
  if(!d){d=document.createElement('dialog');d.id='rvDlg';d.className='pdlg';
    d.innerHTML=`<form method="dialog" id="rvF"><h3>${RV.title}</h3><p class="mute">${RV.lead}</p><fieldset class="rvstars"><legend>${RV.stars}</legend>${[5,4,3,2,1].map(n=>`<label><input type="radio" name="stars" value="${n}"><span aria-hidden="true">★</span><span class="sr">${RV.of(n)}</span></label>`).join('')}</fieldset>
      <label>${RV.comment}<textarea name="comment" rows="3" maxlength="600"></textarea></label><label class="chk"><input type="checkbox" name="publish"> ${RV.pub}</label><p class="err" id="rvErr" role="alert"></p>
      <div class="row"><button class="btn pri" type="submit" value="send">${RV.send}</button><button class="btn ghost" type="button" id="rvX">${RV.cancel}</button></div></form>`;
    document.body.appendChild(d);$('rvX').onclick=()=>d.close();
    $('rvF').addEventListener('submit',async e=>{e.preventDefault();const f=$('rvF'),s=+(f.stars.value||0),b=f.querySelector('[type=submit]');
      if(!s){$('rvErr').textContent=RV.pick;return}busy(b,true);
      try{const j=await api('creview',{txnId:d.dataset.id,stars:s,comment:f.comment.value,publish:f.publish.checked});ME.reviews=(ME.reviews||[]).concat(j.review);d.close();render();toast(RV.thanks)}
      catch(err){$('rvErr').textContent=err.message}finally{busy(b,false)}})}
  d.dataset.id=id;$('rvF').reset();$('rvErr').textContent='';if(d.showModal)d.showModal();else d.setAttribute('open','')}
document.addEventListener('click',e=>{const b=e.target.closest('[data-rv]');if(b)reviewDlg(b.dataset.rv)});
const bal=t=>Math.max(0,(+t.fee||0)+(+t.govFee||0)-(+t.paid||0));
const money=n=>`${fmt(n)} ${T.cur}`;
const reqCols=[[T.th.no,r=>esc(r.id)],[T.th.date,r=>esc(String(r.created).slice(0,10))],[T.th.services,r=>esc(r.services).replace(/\n/g,'<br>')],[T.th.st,r=>stTag(r.status)]];
function render(){const c=ME.client,closed=t=>/منجزة|ملغاة/.test(t.status);
  $('dName').textContent=T.welcome(c.name);$('dMeta').textContent=`${T.client}: ${c.id} · ${T.user}: ${ME.username}`;
  const k=[ME.requests.filter(r=>/جديد|تم التواصل/.test(r.status)).length,ME.transactions.filter(t=>!closed(t)).length,ME.transactions.filter(t=>t.status==='منجزة').length,ME.files.length];
  $('kpis').innerHTML=k.map((n,i)=>`<div class="kpi"><b class="num">${n}</b><span>${T.k[i]}</span></div>`).join('');
  const soon=ME.transactions.map(t=>[t,days(t.expiryDate)]).filter(([t,d])=>d!==null&&d<=60).sort((a,b)=>a[1]-b[1]);
  $('soon').innerHTML=soon.length?`<ul class="plist">${soon.map(([t,d])=>`<li><b>${esc(t.service)}</b><span class="${d<0?'late':'mute'}">${esc(t.expiryDate)} · ${d<0?T.expired:T.inDays(d)}</span></li>`).join('')}</ul>`:`<p class="mute">${T.noSoon}</p>`;
  $('latest').innerHTML=table(ME.transactions.slice(0,5),txCols.slice(0,5));
  $('txList').innerHTML=table(ME.transactions,txCols);$('reqList').innerHTML=table(ME.requests,reqCols);
  $('fileList').innerHTML=ME.files.length?`<ul class="plist files">${ME.files.map(f=>`<li><div><b>${esc(f.title)}</b><span class="mute sm">${esc(String(f.created).slice(0,10))}${f.txnId?` · ${T.txn} ${esc(f.txnId)}`:''}</span></div><button type="button" class="btn sm pri" data-f="${esc(f.id)}">${f.link?T.open:T.dl}</button></li>`).join('')}</ul>`:`<p class="mute">${T.none}</p>`;
  const pf=$('profF').elements;['name','type','phone','email','cr','estCard','taxNo','qid','address'].forEach(k=>{if(pf[k])pf[k].value=c[k]||''});if(!c.type)pf.type.value='منشأة';
  $('credList').innerHTML=ME.credentials.length?`<ul class="plist">${ME.credentials.map(x=>`<li><div><b>${esc(x.portal)}</b><span class="mute sm" dir="ltr">${esc(x.username)} · ••••••</span><span class="mute sm">${esc(String(x.created).slice(0,10))}</span></div><button type="button" class="btn sm ghost" data-cdel="${esc(x.id)}">${T.credDel}</button></li>`).join('')}</ul>`:'';
  $('msgList').innerHTML=ME.messages.length?ME.messages.map(m=>`<div class="bub ${m.from==='client'?'me':''}"><div class="pre">${esc(m.body)}</div><small class="mute">${m.from==='client'?T.you:T.office} · ${esc(m.created)}</small></div>`).join(''):`<p class="mute">${T.noMsg}</p>`;
  const live=ME.transactions.filter(t=>!/ملغاة/.test(t.status)),pays=ME.payments||[],tot=live.reduce((a,t)=>a+(+t.fee||0)+(+t.govFee||0),0),paid=live.reduce((a,t)=>a+(+t.paid||0),0);
  $('payK').innerHTML=[[T.payK[0],money(tot)],[T.payK[1],money(paid)],[T.payK[2],money(live.reduce((a,t)=>a+bal(t),0))]].map(([k,v],i)=>`<div class="kpi"><b class="num ${i===2&&v!==money(0)?'late':''}">${v}</b><span>${k}</span></div>`).join('');
  $('payDue').innerHTML=table(live.filter(t=>(+t.fee||0)+(+t.govFee||0)>0),[[T.th.no,t=>esc(t.id)],[T.th.svc,t=>esc(t.service)],[T.th.fee,t=>money(t.fee)],[T.th.gov,t=>money(t.govFee)],[T.th.paid,t=>money(t.paid)],[T.th.bal,t=>`<b class="${bal(t)?'late':''}">${money(bal(t))}</b>`]]);
  $('payList').innerHTML=table(pays,[[T.th.date,p=>esc(p.date)],[T.th.rcpt,p=>`<span dir="ltr">${esc(p.receiptNo)}</span>`],[T.th.txn,p=>esc(p.txnId)],[T.th.method,p=>esc(st(p.method))],[T.th.amount,p=>`<b>${money(p.amount)}</b>`]]);
  $('consent').textContent=T.consent(ME.consent)+(ME.consent&&ME.consent.version!==ME.legalVersion?T.newer(ME.legalVersion):'')}
async function load(){const j=await api('cme');ME=j;if(window.ACCT_WHO)ACCT_WHO.set({name:(j.client&&j.client.name)||j.username,user:j.username});$('auth').hidden=true;$('dash').hidden=false;$('logout').hidden=false;render();pane(location.hash.slice(1)||'home',true)}
function pane(p,quiet){if(!$('p-'+p))p='home';document.querySelectorAll('#dTabs [data-p]').forEach(b=>b.setAttribute('aria-selected',b.dataset.p===p));
  document.querySelectorAll('.ppanel').forEach(x=>x.hidden=x.id!=='p-'+p);if(!quiet)history.replaceState(null,'','#'+p)}
$('dTabs').onclick=e=>{const b=e.target.closest('[data-p]');if(b)pane(b.dataset.p)};
$('goNew').onclick=()=>pane('new');

// files: Drive files come through the server (only for this account); plain links open directly
$('fileList').onclick=async e=>{const b=e.target.closest('[data-f]');if(!b)return;busy(b,true);
  try{const j=await api('cfile',{id:b.dataset.f});
    if(j.link){window.open(j.link,'_blank','noopener');return}
    const bin=atob(j.data),u8=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u8[i]=bin.charCodeAt(i);
    const url=URL.createObjectURL(new Blob([u8],{type:j.mime||'application/octet-stream'})),a=document.createElement('a');
    a.href=url;a.download=j.name||'file';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
  catch(err){toast(err.message)}finally{busy(b,false)}};

// new request: same catalogue as the main site
const SVC=[],GROUPS=[];const ent=k=>EN?((D._entities||{})[k]||null):null;
DATA.G.forEach(([k,n,l])=>{GROUPS.push([ent(k)||n,l.map(s=>{const e=(D[s[0]]||{}).en||{};return {c:s[0],n:EN&&e.name||s[1],p:s[3]}})])});
GROUPS.push([ent('PK')||'الحزم',DATA.SETUP.map(s=>{const e=(D[s[0]]||{}).en||{};return {c:s[0],n:EN&&e.name||s[1],p:s[3]}})]);
(DATA.CONSULT||[]).forEach(cat=>GROUPS.push([EN?cat.en:cat.ar,cat.items.map(i=>({c:i.c,n:(EN?i.en:i.ar).n,p:i.p,from:i.from}))]));
GROUPS.forEach(([g,l])=>{const og=document.createElement('optgroup');og.label=g;l.forEach(s=>{SVC[s.c]=s;const o=document.createElement('option');o.value=s.c;o.textContent=`${s.n} · ${s.from?T.from+' ':''}${fmt(s.p)} ${T.cur}`;og.appendChild(o)});$('nPick').appendChild(og)});
const cart=new Map();
function renderCart(){$('nCart').innerHTML=cart.size?`<ul class="plist">${[...cart].map(([c,q])=>`<li><div><b>${esc(SVC[c].n)}</b><span class="mute sm">${c} · ${SVC[c].from?T.from+' ':''}${fmt(SVC[c].p)} ${T.cur}</span></div><label class="qty">${T.qty}<input type="number" min="1" max="99" value="${q}" data-q="${c}"></label><button type="button" class="btn sm ghost" data-rm="${c}">${T.remove}</button></li>`).join('')}</ul>`:''}
$('nPick').onchange=()=>{const c=$('nPick').value;if(c){cart.set(c,(cart.get(c)||0)+1);renderCart()}$('nPick').value=''};
$('nCart').onclick=e=>{const b=e.target.closest('[data-rm]');if(b){cart.delete(b.dataset.rm);renderCart()}};
$('nCart').oninput=e=>{const i=e.target.closest('[data-q]');if(i)cart.set(i.dataset.q,Math.max(1,Math.min(99,Number(i.value)||1)))};
try{const pre=new URLSearchParams(location.search).get('svc');if(pre)pre.split(',').forEach(c=>{if(SVC[c])cart.set(c,1)});renderCart()}catch(e){}
$('newF').addEventListener('submit',e=>{e.preventDefault();submit($('newF'),$('nErr'),async()=>{
  if(!cart.size)throw new Error(T.pickFirst);
  const services=[...cart].map(([c,q])=>`${SVC[c].n} (${c}) × ${q}`).join('\n');
  const j=await api('crequest',{services,codes:[...cart.keys()],notes:$('nNotes').value.trim()});
  cart.clear();renderCart();$('nNotes').value='';toast(T.sent(j.id));await load();pane('work')})});

// profile, portal logins, password
$('profF').addEventListener('submit',e=>{e.preventDefault();const f=$('profF').elements,p={};['name','type','email','cr','estCard','taxNo','qid','address'].forEach(k=>p[k]=f[k].value.trim());
  const err=document.createElement('span');submit($('profF'),err,async()=>{if(!p.name)throw new Error(T.name);const j=await api('cprofile',{profile:p});ME.client=j.client;render();toast(T.saved)}).then(()=>{if(err.textContent)toast(err.textContent)})});
$('credF').addEventListener('submit',e=>{e.preventDefault();submit($('credF'),$('cErr'),async()=>{
  const portal=$('cPortal').value.trim(),username=$('cUser').value.trim(),password=$('cPass').value;
  if(!portal||!username||!password)throw new Error(T.err.invalid);if(!$('cOk').checked)throw new Error(T.err.must_accept);
  await api('ccred',{portal,username,password,note:$('cNote').value.trim(),consent:true,signName:(ME.consent||{}).name||''});
  $('credF').reset();toast(T.credSaved);await load();pane('creds')})});
$('credList').onclick=async e=>{const b=e.target.closest('[data-cdel]');if(!b||!window.confirm(T.credAsk))return;busy(b,true);
  try{await api('ccreddel',{id:b.dataset.cdel});await load();pane('creds')}catch(err){toast(err.message)}finally{busy(b,false)}};
$('msgF').addEventListener('submit',e=>{e.preventDefault();submit($('msgF'),$('mErr'),async()=>{const b=$('mBody').value.trim();if(!b)throw new Error(T.err.invalid);
  await api('cmsg',{body:b});$('mBody').value='';toast(T.msgSent);await load();pane('msgs')})});
$('pwF').addEventListener('submit',e=>{e.preventDefault();submit($('pwF'),$('pwErr'),async()=>{
  if($('nPass').value.length<8)throw new Error(T.err.weak_password);if($('nPass').value!==$('nPass2').value)throw new Error(T.mismatch);
  const j=await api('cpass',{old:$('oPass').value,password:$('nPass').value});if(j&&j.token)setToken(j.token);$('pwF').reset();toast(T.pwChanged)})});

// ---- start ----
if(!CFG.API){document.querySelectorAll('#clientAuth form button[type=submit]').forEach(b=>b.disabled=true)}
else if(TOKEN)load().catch(()=>signOut());
