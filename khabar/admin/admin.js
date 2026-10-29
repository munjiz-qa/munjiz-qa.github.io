'use strict';
// لوحة إدارة «خبر»: الدخول بحساب المدير الشامل من data/users.json (أو حساب admin القديم في data/admin.json)،
// وتعديل العاجل والإخفاء وإدارة حسابات العملاء والمديرين، ثم النشر عبر GitHub.
(function(){
const CFG=window.KHABAR_CONFIG||{};
const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const DEFAULT_HASH='15aebe9681badc802f1853e9061c9e06b13ca2b971a2e744f7013569398b2034';
const PATH='khabar/data/admin.json';
let ADMIN=null,BRIEF=null,HEAD=null,LEDGER=null,HEALTH=null,USERS=null,ME=null;
const AUTH=window.KhabarAuth,USERS_PATH='khabar/data/users.json';
async function hash(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('khabar:'+s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const getJSON=u=>fetch(u+'?t='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
function toast(m){const n=$('#toast');n.textContent=m;n.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>n.hidden=true,2400)}
function msg(text,ok){const m=$('#pub-msg');m.textContent=text;m.className='msg '+(ok?'ok':'err');m.hidden=false}
const S={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}},del(k){try{sessionStorage.removeItem(k)}catch(e){}}};
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

async function boot(){
  try{[ADMIN,BRIEF]=await Promise.all([getJSON('../data/admin.json'),getJSON('../data/brief.json')]);HEAD=await getJSON('../data/headlines.json').catch(()=>null);LEDGER=await getJSON('../data/ledger.json').catch(()=>null);HEALTH=await getJSON('../data/health.json').catch(()=>null);USERS=await AUTH.load('../').catch(()=>({v:1,iter:AUTH.ITER,users:[]}))}
  catch(e){$('#login-err').textContent='تعذّر تحميل بيانات التطبيق. أعد تحميل الصفحة.';$('#login-err').hidden=false;return}
  ADMIN.breaking=ADMIN.breaking||{};ADMIN.hidden=ADMIN.hidden||[];ADMIN.auth=ADMIN.auth||{user:'admin',hash:''};
  const su=S.get('khabar-admin-user'),rec=su&&USERS.users.find(x=>x.u===su&&x.role==='super'&&x.active!==false);
  if(rec){ME={u:rec.u,name:rec.name,legacy:false};open()}
  else if(S.get('khabar-admin')===((ADMIN.auth.hash||DEFAULT_HASH))){ME={u:ADMIN.auth.user||'admin',name:'',legacy:true};open()}
}
$('#login-form').onsubmit=async e=>{
  e.preventDefault();const u=$('#u').value.trim().toLowerCase(),p=$('#p').value;const btn=e.submitter||$('#login-form button');btn.disabled=true;
  try{
    const rec=USERS&&await AUTH.verify(USERS,u,p);
    if(rec&&rec.role==='super'){S.set('khabar-admin-user',rec.u);ME={u:rec.u,name:rec.name,legacy:false};open();return}
    if(rec){$('#login-err').textContent='هذا حساب عميل. ادخل إليه من صفحة «حسابي».';$('#login-err').hidden=false;return}
    const want=ADMIN&&ADMIN.auth.hash||DEFAULT_HASH;
    if(!ADMIN||u!==(ADMIN.auth.user||'admin')||await hash(p)!==want){$('#login-err').textContent='اسم المستخدم أو كلمة المرور غير صحيحة.';$('#login-err').hidden=false;return}
    S.set('khabar-admin',want);ME={u,name:'',legacy:true};open();
  }finally{btn.disabled=false}
};
$('#logout').onclick=()=>{S.del('khabar-admin');S.del('khabar-admin-user');location.reload()};

function open(){
  $('#login-form').hidden=true;$('#app').hidden=false;$('#logout').hidden=false;$('#who').textContent=(ME.name||ME.u)+' · مدير شامل';
  const n=BRIEF.zones.reduce((s,z)=>s+z.items.length,0);
  const k=$('#kpis');k.textContent='';
  [[n,'خبر في الخلاصة الحالية'],[Object.keys(BRIEF.sources).length,'مصدراً موثّقاً'],[BRIEF.roadmap.length,'موعداً في خريطة الطريق'],[ADMIN.hidden.length,'خبراً مخفياً']].forEach(([v,l])=>{const d=el('div');d.append(el('b',null,String(v)),el('small',null,l));k.append(d)});
  const pub=el('p','mute');pub.style.fontSize='.88rem';pub.textContent=`الخلاصة الحالية: ${BRIEF.edition==='am'?'خلاصة الصباح':'خلاصة المساء'} ليوم ${BRIEF.date}`+(HEAD&&HEAD.updated?` · آخر تحديث آلي للعناوين: ${new Date(HEAD.updated).toLocaleString('ar-QA',{timeZone:'Asia/Qatar',numberingSystem:'latn'})}`:'');k.after(pub);
  const b=ADMIN.breaking;$('#b-on').checked=!!b.on;$('#b-ar').value=b.text_ar||'';$('#b-en').value=b.text_en||'';$('#b-src').value=b.source||'';$('#b-url').value=b.url||'';
  if(b.until){const d=new Date(b.until);if(!isNaN(d)){const z=new Date(d-d.getTimezoneOffset()*6e4);$('#b-until').value=z.toISOString().slice(0,16)}}
  const ul=$('#hide-list');ul.textContent='';const hid=new Set(ADMIN.hidden);
  BRIEF.zones.forEach(z=>z.items.forEach(it=>{const li=el('li'),lb=el('label'),cb=el('input');if(!it.ar&&!it.en)return;cb.type='checkbox';cb.value=it.id;cb.checked=hid.has(it.id);cb.onchange=preview;
    const tx=el('span');tx.append(el('span','z',`${z.name.ar} · ${it.cat.ar}`),it.ar||it.en);lb.append(cb,tx);li.append(lb);ul.append(li)}));
  ['#b-on','#b-ar','#b-en','#b-src','#b-url','#b-until','#np1','#np2'].forEach(s=>$(s).addEventListener('input',preview));
  $('#tok').value=LS.get('khabar-token')||'';
  agentPanel();healthPanel();usersPanel();
  preview();
}
function agentPanel(){
  const k=$('#agent-kpis');k.textContent='';const S=(LEDGER&&LEDGER.summary)||{},r=(LEDGER&&LEDGER.runs||[]).find(x=>x.mode==='brief');
  [[S.multi_source??'—','خبراً من جهتين فأكثر'],[S.numbers_total?`${S.numbers_grounded}/${S.numbers_total}`:'—','رقماً مطابقاً لمصدره'],[(LEDGER&&(LEDGER.agent_dropped||[]).length+(LEDGER.dropped||[]).length)??'—','حُذف قبل النشر'],[r?'$'+Number(r.usd).toFixed(2):'—','كلفة آخر خلاصة']]
    .forEach(([v,l])=>{const d=el('div');d.append(el('b',null,String(v)),el('small',null,l));k.append(d)});
  $('#agent-last').textContent=r?`آخر تشغيل للوكيل: ${new Date(r.at).toLocaleString('ar-QA',{timeZone:'Asia/Qatar',numberingSystem:'latn'})} · ${r.model} · نُشر ${r.published} من ${r.proposed}`:
    (LEDGER?`آخر فحص للخلاصة: ${new Date(LEDGER.checked).toLocaleString('ar-QA',{timeZone:'Asia/Qatar',numberingSystem:'latn'})}. لم يُسجَّل تشغيل للوكيل المستقل بعد.`:'لم يُسجَّل فحص بعد.');
}
document.querySelectorAll('[data-run]').forEach(b=>b.onclick=async()=>{
  const m=$('#run-msg'),say=(t,ok)=>{m.textContent=t;m.className='msg '+(ok?'ok':'err');m.hidden=false};
  const tok=$('#tok').value.trim();if(!tok){say('أدخل مفتاح النشر على GitHub في قسم «نشر التعديلات» أولاً.',false);return}
  LS.set('khabar-token',tok);b.disabled=true;say('جارٍ إرسال أمر التشغيل…',true);
  try{
    const r=await fetch(`https://api.github.com/repos/${CFG.REPO}/actions/workflows/khabar-agent.yml/dispatches`,{method:'POST',headers:{Authorization:'Bearer '+tok,Accept:'application/vnd.github+json'},body:JSON.stringify({ref:CFG.BRANCH||'main',inputs:{mode:b.dataset.run}})});
    if(r.status===204)say('بدأ التشغيل. تظهر النتيجة في التطبيق خلال دقائق (الخلاصة الكاملة تستغرق 10 إلى 20 دقيقة).',true);
    else throw new Error(r.status===401?'المفتاح غير صالح أو منتهي.':r.status===403||r.status===404?'المفتاح لا يملك صلاحية Actions: Read and write على المستودع.':'رفض GitHub الطلب ('+r.status+').');
  }catch(e){say(e.message,false)}finally{b.disabled=false}
});
async function collect(){
  const out=JSON.parse(JSON.stringify(ADMIN));
  const until=$('#b-until').value?new Date($('#b-until').value).toISOString():'';
  out.breaking={on:$('#b-on').checked,text_ar:$('#b-ar').value.trim(),text_en:$('#b-en').value.trim(),source:$('#b-src').value.trim(),url:$('#b-url').value.trim(),until};
  out.hidden=[...document.querySelectorAll('#hide-list input:checked')].map(x=>x.value);
  const p1=$('#np1').value,p2=$('#np2').value;
  if((p1||p2)&&ME.legacy){if(p1.length<10)throw new Error('كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل.');if(p1!==p2)throw new Error('كلمتا المرور غير متطابقتين.');out.auth.hash=await hash(p1)}
  if(!out.auth.hash)out.auth.hash=DEFAULT_HASH;
  if(out.breaking.on){
    if(!out.breaking.text_ar&&!out.breaking.text_en)throw new Error('اكتب نص الخبر العاجل أو ألغِ تفعيل الشريط.');
    if(!out.breaking.source)throw new Error('لا يُنشر عاجل دون اسم مصدره.');
    if(!/^https:\/\/\S+\.\S+/.test(out.breaking.url))throw new Error('أدخل رابط الخبر الأصلي، ويبدأ بـ https://');
  }
  out.updated=new Date().toISOString();return out;
}
async function preview(){try{$('#preview').textContent=JSON.stringify(await collect(),null,1)}catch(e){$('#preview').textContent=e.message}}
const b64=s=>btoa(unescape(encodeURIComponent(s)));
$('#publish').onclick=async()=>{
  let data;try{data=await collect()}catch(e){msg(e.message,false);return}
  const tok=$('#tok').value.trim();if(!tok){msg('أدخل مفتاح النشر على GitHub أولاً، أو انسخ ملف الإعدادات وأرسله للدعم الفني.',false);return}
  LS.set('khabar-token',tok);const btn=$('#publish');btn.disabled=true;msg('جارٍ النشر…',true);
  const api=`https://api.github.com/repos/${CFG.REPO}/contents/${PATH}`,H={Authorization:'Bearer '+tok,Accept:'application/vnd.github+json'};
  try{
    const cur=await fetch(api+'?ref='+(CFG.BRANCH||'main'),{headers:H});if(!cur.ok)throw new Error(cur.status===401?'المفتاح غير صالح أو منتهي.':cur.status===404?'المفتاح لا يملك صلاحية على المستودع.':'تعذّر الوصول إلى GitHub ('+cur.status+').');
    const sha=(await cur.json()).sha;
    const put=await fetch(api,{method:'PUT',headers:H,body:JSON.stringify({message:'خبر: تحديث العاجل وإعدادات العرض من لوحة الإدارة',content:b64(JSON.stringify(data,null,1)+'\n'),sha,branch:CFG.BRANCH||'main'})});
    if(!put.ok)throw new Error(put.status===403?'المفتاح لا يملك صلاحية الكتابة (Contents: Read and write).':'رفض GitHub النشر ('+put.status+').');
    ADMIN=data;if(ME.legacy&&data.auth.hash)S.set('khabar-admin',data.auth.hash);
    const p1=$('#np1').value;if(p1&&!ME.legacy){if(p1.length<10)throw new Error('كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل.');if(p1!==$('#np2').value)throw new Error('كلمتا المرور غير متطابقتين.');
      const db=JSON.parse(JSON.stringify(USERS)),me=db.users.find(x=>x.u===ME.u);Object.assign(me,await AUTH.hashNew(p1));await putFile(tok,USERS_PATH,db,'خبر: تغيير كلمة مرور '+ME.u);USERS=db}
    $('#np1').value='';$('#np2').value='';
    msg('نُشرت التعديلات. تظهر في التطبيق خلال دقيقة إلى دقيقتين بعد تحديث GitHub Pages.',true);
  }catch(e){msg(e.message,false)}finally{btn.disabled=false}
};
async function putFile(tok,path,obj,message){
  const api=`https://api.github.com/repos/${CFG.REPO}/contents/${path}`,H={Authorization:'Bearer '+tok,Accept:'application/vnd.github+json'};
  const cur=await fetch(api+'?ref='+(CFG.BRANCH||'main'),{headers:H});
  if(!cur.ok&&cur.status!==404)throw new Error(cur.status===401?'المفتاح غير صالح أو منتهي.':'تعذّر الوصول إلى GitHub ('+cur.status+').');
  const sha=cur.ok?(await cur.json()).sha:undefined;
  const put=await fetch(api,{method:'PUT',headers:H,body:JSON.stringify({message,content:b64(JSON.stringify(obj,null,1)+'\n'),sha,branch:CFG.BRANCH||'main'})});
  if(!put.ok)throw new Error(put.status===403?'المفتاح لا يملك صلاحية الكتابة (Contents: Read and write).':put.status===409?'تغيّر الملف على GitHub أثناء التعديل. أعد تحميل الصفحة ثم أعد المحاولة.':'رفض GitHub النشر ('+put.status+').');
}
const fmtD=iso=>{const d=new Date(iso);return isNaN(d)?'—':d.toLocaleString('ar-QA',{timeZone:'Asia/Qatar',numberingSystem:'latn',day:'numeric',month:'long',year:'numeric',hour:'numeric',minute:'2-digit'})};
function healthPanel(){
  const box=$('#health');box.textContent='';
  if(!HEALTH){box.append(el('p','mute','يظهر تقرير الفحص بعد أول تشغيل للطيار الآلي.'));return}
  const head=el('p',null,'');head.append(el('b',null,HEALTH.ok?'التشغيل سليم':'يوجد عطل'),` · آخر فحص: ${fmtD(HEALTH.checked)} · كاتب الخلاصة: ${HEALTH.writer==='agent'?'الوكيل المستقل':'الطيار الآلي والمحرر المجدول'}`);
  head.className='msg '+(HEALTH.ok?'ok':'err');box.append(head);
  const ul=el('ul','checks');(HEALTH.checks||[]).forEach(c=>{const li=el('li',c.ok?'ok':'bad');li.append(el('span','dot'),el('span',null,c.name+(c.detail?' · '+c.detail:'')));ul.append(li)});box.append(ul);
}
function usersPanel(){
  const tb=$('#users-body');tb.textContent='';
  USERS.users.forEach(r=>{
    const tr=el('tr');
    tr.append(el('td',null,r.name||'—'),el('td','ltr',r.u),el('td',null,(AUTH.ROLES[r.role]||{}).ar||r.role),el('td',null,r.active===false?'معطّل':'فعّال'));
    const td=el('td','acts');
    if(r.u!==ME.u){
      const t=el('button','btn ghost sm',r.active===false?'تفعيل':'تعطيل');t.type='button';t.onclick=()=>saveUsers(db=>{db.users.find(x=>x.u===r.u).active=r.active===false},(r.active===false?'تفعيل ':'تعطيل ')+r.u);
      const d=el('button','btn ghost sm','حذف');d.type='button';d.onclick=()=>{if(confirm('حذف الحساب '+r.u+'؟'))saveUsers(db=>{db.users=db.users.filter(x=>x.u!==r.u)},'حذف '+r.u)};
      td.append(t,d);
    }
    const k=el('button','btn ghost sm','كلمة مرور جديدة');k.type='button';k.onclick=async()=>{const p=prompt('كلمة المرور الجديدة لـ '+r.u+' (10 أحرف على الأقل):');if(p==null)return;if(p.length<10){umsg('كلمة المرور يجب أن تكون 10 أحرف على الأقل.',false);return}
      const h=await AUTH.hashNew(p);saveUsers(db=>{Object.assign(db.users.find(x=>x.u===r.u),h)},'كلمة مرور جديدة لـ '+r.u)};
    td.append(k);tr.append(td);tb.append(tr);
  });
}
function umsg(text,ok){const m=$('#users-msg');m.textContent=text;m.className='msg '+(ok?'ok':'err');m.hidden=false}
async function saveUsers(change,what){
  const tok=$('#tok').value.trim();if(!tok){umsg('أدخل مفتاح النشر على GitHub في قسم «نشر التعديلات» أولاً.',false);return}
  LS.set('khabar-token',tok);const db=JSON.parse(JSON.stringify(USERS));
  try{await change(db);db.updated=new Date().toISOString();umsg('جارٍ النشر…',true);await putFile(tok,USERS_PATH,db,'خبر: الحسابات · '+what);USERS=db;usersPanel();umsg('تم: '+what+'. يسري خلال دقيقة إلى دقيقتين.',true)}
  catch(e){umsg(e.message,false)}
}
$('#user-form').onsubmit=async e=>{
  e.preventDefault();const f=e.target,u=f.nu.value.trim().toLowerCase(),p=f.npw.value;
  if(!/^[a-z0-9._-]{3,32}$/.test(u)){umsg('اسم المستخدم من 3 إلى 32 حرفاً لاتينياً أو رقماً أو (. _ -).',false);return}
  if(USERS.users.some(x=>x.u===u)){umsg('اسم المستخدم مستخدم من قبل.',false);return}
  if(p.length<10){umsg('كلمة المرور يجب أن تكون 10 أحرف على الأقل.',false);return}
  const h=await AUTH.hashNew(p),d=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar'}).format(new Date());
  await saveUsers(db=>{db.users.push({u,name:f.nn.value.trim()||u,role:f.nr.value,active:true,created:d,...h})},'إضافة '+u);
  if(USERS.users.some(x=>x.u===u))f.reset();
};
$('#copy-json').onclick=async()=>{let d;try{d=JSON.stringify(await collect(),null,1)}catch(e){msg(e.message,false);return}
  try{await navigator.clipboard.writeText(d);toast('نُسخ ملف الإعدادات')}catch(e){const ta=el('textarea');ta.value=d;document.body.append(ta);ta.select();try{document.execCommand('copy')}catch(x){}ta.remove();toast('نُسخ ملف الإعدادات')}};
boot();
})();
