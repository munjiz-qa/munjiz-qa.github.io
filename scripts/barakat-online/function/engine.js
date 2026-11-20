// مولَّد آلياً من barakat/index.html — لا تعدّله يدوياً.
globalThis.BARAKAT_SERVER=true;
const __ls=new Map();
const __el={addEventListener(){},removeEventListener(){},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},style:{},querySelector(){return null},querySelectorAll(){return []},textContent:'',innerHTML:''};
const document={querySelector(){return __el},querySelectorAll(){return []},addEventListener(){},createElement(){return __el},body:__el,fonts:{ready:Promise.resolve()},hidden:true};
const window={addEventListener(){},print(){}};
const location={hash:'',protocol:'server:',hostname:'server',search:''};
const navigator={};
const localStorage={getItem:k=>__ls.has(k)?__ls.get(k):null,setItem:(k,v)=>{if(k!=='barakat_db_v1')__ls.set(k,String(v))},removeItem:k=>{__ls.delete(k)}};
"use strict";
/* ---------- storage ---------- */
const KEY='barakat_db_v1', SKEY='barakat_session';
const mem={};
const store={
  get(k){try{return localStorage.getItem(k)}catch(e){return mem[k]??null}},
  set(k,v){try{localStorage.setItem(k,v)}catch(e){mem[k]=v}},
  del(k){try{localStorage.removeItem(k)}catch(e){delete mem[k]}}
};
let db=null;
const save=()=>store.set(KEY,JSON.stringify(db));
/* ---------- cloud: قاعدة بيانات بركات السحابية (Supabase) ----------
   على الموقع المنشور (https) تُنفَّذ كل عملية في خادم بركات وتُحفظ في قاعدة البيانات، ويرى العميل بياناته وحده.
   نسخة الكمبيوتر والتجربة المحلية (أو ?local=1) تبقى على هذا الجهاز كما كانت. */
const CLOUD_CFG={url:'',key:''};
const CLOUD=(()=>{try{return !!CLOUD_CFG.url&&(location.protocol==='https:'||/[?&]cloud=1(&|$)/.test(location.search))&&!/[?&]local=1(&|$)/.test(location.search)}catch(e){return false}})();
const AKEY='barakat_auth';
let auth=null;try{auth=JSON.parse(store.get(AKEY)||'null')}catch(e){auth=null}
function setAuth(s){auth=s&&s.access_token?{access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at||Math.floor(Date.now()/1000)+(+s.expires_in||3600)}:null;if(auth)store.set(AKEY,JSON.stringify(auth));else store.del(AKEY)}
let refreshing=null;
async function token(){if(!auth)return null;if(auth.expires_at*1000-60000>Date.now())return auth.access_token;
  refreshing=refreshing||fetch(CLOUD_CFG.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:CLOUD_CFG.key,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:auth.refresh_token})})
    .then(async r=>{if(!r.ok)throw 0;setAuth(await r.json())}).catch(()=>setAuth(null)).finally(()=>{refreshing=null});
  await refreshing;return auth?auth.access_token:null}
function emptyDb(){return {v:1,seq:0,users:[],tx:[],reqs:[],cash:[],dist:[],policies:[],claims:[],msgs:[],fundOut:[],notes:[],log:[],funds:{zakat:0,sadaqa:0,waqf:0,qard:0,takaful:0,takafulFee:0},
  settings:{murabahaRate:5,ijaraRate:5.5,musharakaRate:5,mudaribShare:30,goldPrice:245,qardMax:20000,minDown:20,takafulFee:20}}}
function applyState(s){if(!s||!s.db)return;db=s.db;db.online=true;normDb();if(s.me)store.set(SKEY,s.me);else store.del(SKEY)}
async function cloud(op,name,data,btn){const t=await token();let r,j;
  try{r=await fetch(CLOUD_CFG.url+'/functions/v1/barakat-api',{method:'POST',headers:{'Content-Type':'application/json',apikey:CLOUD_CFG.key,...(t?{Authorization:'Bearer '+t}:{})},body:JSON.stringify({op,name,data:data||{},btn:btn||null})});j=await r.json()}
  catch(e){throw new Error('تعذّر الاتصال بخادم بركات. تحقق من الإنترنت ثم أعد المحاولة.')}
  if('session' in j)setAuth(j.session);if(j.state)applyState(j.state);
  if(!r.ok||j.error)throw new Error(j.error||'تعذّر تنفيذ العملية، أعد المحاولة.');return j}
function runFx(fx){(fx||[]).forEach(([k,v])=>{if(k==='toast')toast(v);else if(k==='dialog')dialog(v);else if(k==='close')closeDlg();else if(k==='go')go(v);else if(k==='render')render()})}
let busy=0;
async function cloudRun(op,name,data,btn){if(busy)return;busy=1;document.body.classList.add('busy');
  try{const j=await cloud(op,name,data,btn);runFx(j.fx)}finally{busy=0;document.body.classList.remove('busy')}}
function markSeen(){if(CLOUD)cloud('sys','seen').catch(()=>{});else save()}
async function cloudRefresh(){if(busy||document.hidden||!db)return;const before=JSON.stringify(db);try{await cloud('sys','state')}catch(e){return}
  const a=document.activeElement,d=$('#dlg');if(JSON.stringify(db)===before||(d&&d.open)||(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)))return;render()}
async function cloudInit(){
  ['move','transfer','cash','fin','settle','give','claim','contact','decide','dist','fundout','settings','reply','cashreject','claimreject']
    .forEach(n=>{FORMS[n]=(f,btn)=>cloudRun('form',n,f,btn)});
  ['doTransfer','accept','decline','pay','tkjoin','tkpay','notesClear','cashok','cashno','ustat','doDist','claimok','claimno','msgclose']
    .forEach(n=>{ACTS[n]=b=>cloudRun('act',n,{...b.dataset})});
  FORMS.login=f=>cloudRun('sys','login',{id:f.id,pw:f.pw});
  FORMS.register=f=>cloudRun('sys','register',f);
  FORMS.pw=f=>cloudRun('sys','pw',f);
  FORMS.zakatpay=f=>cloudRun('form','zakatpay',{...f,due:$('#zk').dataset.due});
  ACTS.resetpw=b=>cloudRun('sys','resetpw',{id:b.dataset.id});
  ACTS.tkcancel=b=>{const id=b.dataset.id;if(ACTS.tkcancel.armed!==id){ACTS.tkcancel.armed=id;toast('اضغط «إلغاء» مرة أخرى للتأكيد');setTimeout(()=>ACTS.tkcancel.armed=null,5000);return}
    ACTS.tkcancel.armed=null;return cloudRun('act','tkcancel',{id,ok:'1'})};
  ACTS.reset=()=>{if(!confirmReset())return;return cloudRun('sys','reset')};
  ACTS.logout=async()=>{try{await cloud('sys','logout')}catch(e){}setAuth(null);store.del(SKEY);try{await cloud('sys','state')}catch(e){}toast('تم تسجيل الخروج');go('#/')};
  const bk=ACTS.backup;ACTS.backup=()=>{bk();cloud('sys','markBackup').catch(()=>{})};
  ACTS.restoreOk=()=>{const x=ACTS.restore.pending;if(!x)return closeDlg();ACTS.restore.pending=null;return cloudRun('sys','restore',x)};
  const fn=$('#footNote');if(fn)fn.textContent='© بركات · متصل بقاعدة بيانات سحابية آمنة، وحسابك متاح من أي جهاز';
  const v=$('#view');if(v&&!db)v.innerHTML='<div class="card empty">جارٍ تحميل بركات…</div>';
  try{await cloud('sys','state')}catch(e){if(!db){db=emptyDb();store.del(SKEY)}toast(e.message)}
  render();
  setInterval(cloudRefresh,45000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)cloudRefresh()});
  if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
}


/* ---------- formats (unified everywhere) ---------- */
const CUR='ر.ق';
const r2=n=>Math.round((+n+Number.EPSILON)*100)/100;
const money=n=>`${(+n<0?'-':'')}${Math.abs(r2(n)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})} ${CUR}`;
const pad=n=>String(n).padStart(2,'0');
const fdate=iso=>{if(!iso)return '—';const d=new Date(iso);return `${pad(d.getDate())}-${pad(d.getMonth()+1)}-${d.getFullYear()}`};
const fdt=iso=>{const d=new Date(iso);return `${fdate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`};
const phoneDigits=p=>{let d=String(p||'').replace(/\D/g,'');if(d.startsWith('00'))d=d.slice(2);if(d.length===8)d='974'+d;return d};
const fphone=p=>{const d=phoneDigits(p);return d.length===11&&d.startsWith('974')?`+974 ${d.slice(3,7)} ${d.slice(7)}`:'+'+d};
const normName=s=>String(s||'').trim().replace(/\s+/g,' ');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=p=>p+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const now=()=>new Date().toISOString();
const addMonths=(iso,m)=>{const d=new Date(iso);d.setMonth(d.getMonth()+m);return d.toISOString()};
async function hash(pw,salt){
  const data=new TextEncoder().encode(salt+'|'+pw);
  if(crypto.subtle){const b=await crypto.subtle.digest('SHA-256',data);return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  let h=0;for(const c of data)h=(h*31+c)|0;return 'w'+h;
}

/* ---------- product catalogue ---------- */
const PRODUCTS={
  murabaha:{name:'المرابحة للآمر بالشراء',k:'بيع',asset:'السلعة المطلوبة (سيارة، أجهزة، بضاعة...)',desc:'تشتري بركات السلعة وتتملكها أولاً، ثم تبيعها لك بثمن معلوم يشمل التكلفة وربحاً محدداً، يُسدَّد على أقساط ثابتة لا تزيد بالتأخير.',kind:'sale'},
  ijara:{name:'الإجارة المنتهية بالتمليك',k:'إجارة',asset:'الأصل المطلوب (مسكن، معدات، مركبة...)',desc:'تملك بركات الأصل وتؤجره لك بأجرة شهرية معلومة، وتنتقل إليك ملكيته بالهبة بعد آخر قسط بعقد مستقل.',kind:'lease'},
  musharaka:{name:'المشاركة المتناقصة',k:'شركة',asset:'الأصل المشترك (عقار، مشروع...)',desc:'تشارك بركات في ملكية الأصل بدفعة أولى، ثم تشتري حصته تدريجياً وتدفع أجرة حصته المتبقية فقط، فيتناقص القسط شهراً بعد شهر.',kind:'share'},
  mudaraba:{name:'تمويل المضاربة لرواد الأعمال',k:'مضاربة',asset:'وصف النشاط التجاري',desc:'تقدم بركات رأس المال وتقدم أنت العمل، ويُقسم الربح بنسبة شائعة متفق عليها، والخسارة على رأس المال ما لم يكن تعدٍّ أو تقصير.',kind:'venture'},
  qard:{name:'القرض الحسن',k:'إرفاق',asset:'الغرض من القرض',desc:'قرض بلا أي زيادة لحاجات الأسر والطلاب والطوارئ، يُرد بقدره على أقساط ميسرة، من صندوق القرض الحسن.',kind:'loan'}
};
const ST={pending:['قيد المراجعة','warn'],offer:['بانتظار قبولك','warn'],active:['ساري','ok'],completed:['مكتمل','mute'],rejected:['مرفوض','bad'],cancelled:['ملغى','mute']};
const stTag=s=>`<span class="tag ${ST[s][1]}">${ST[s][0]}</span>`;
const USERST={active:['مفعّل','ok'],pending:['بانتظار التحقق','warn'],frozen:['موقوف','bad']};
const uTag=s=>`<span class="tag ${USERST[s][1]}">${USERST[s][0]}</span>`;
const ACC={current:'الحساب الجاري',invest:'حساب الاستثمار'};
const FUNDS={zakat:'صندوق الزكاة',sadaqa:'صندوق الصدقات',waqf:'الوقف النقدي'};
const PLANS={
  health:{k:'صحي',name:'تكافل صحي',desc:'يعوّض نفقات العلاج والدواء والعمليات للمشترك وأسرته المقيدة.',fee:150,cap:20000},
  car:{k:'مركبات',name:'تكافل المركبات',desc:'يعوّض أضرار المركبة في الحوادث والسرقة والكوارث الطبيعية.',fee:120,cap:30000},
  home:{k:'منزل',name:'تكافل المنزل',desc:'يعوّض أضرار المسكن ومحتوياته من الحريق والمياه والسرقة.',fee:60,cap:50000},
  family:{k:'أسرة',name:'تكافل الأسرة',desc:'يدعم أسرة المشترك عند الوفاة أو العجز الكامل لا قدّر الله.',fee:100,cap:100000}};
const CLST={pending:['قيد المراجعة','warn'],paid:['صُرف التعويض','ok'],rejected:['مرفوضة','bad']};
const MSGST={new:['جديدة','warn'],replied:['تم الرد','ok'],closed:['مغلقة','mute']};
const covered=pl=>pl.status==='active'&&new Date(pl.paidThrough)>=new Date();
function normDb(){['policies','claims','msgs','fundOut','notes'].forEach(k=>{if(!Array.isArray(db[k]))db[k]=[]});
  if(db.funds.takaful==null)db.funds.takaful=0;if(db.funds.takafulFee==null)db.funds.takafulFee=0;if(db.settings.takafulFee==null)db.settings.takafulFee=20;
  db.reqs.forEach(r=>{if(!r.owned&&r.offered&&['sale','lease'].includes(PRODUCTS[r.product].kind))r.owned=r.offered})}
function contribute(u,pl){const P_=PLANS[pl.plan];need(avail(u)>=P_.fee,`يلزم ${money(P_.fee)} في الحساب الجاري.`);
  addTx(u,'current',-P_.fee,'takaful',`اشتراك ${P_.name} · ${pl.id}`);const w=r2(P_.fee*db.settings.takafulFee/100);
  db.funds.takaful=r2(db.funds.takaful+P_.fee-w);db.funds.takafulFee=r2(db.funds.takafulFee+w);
  const base=new Date(pl.paidThrough||0)>new Date()?pl.paidThrough:now();pl.paidThrough=addMonths(base,1)}
function notify(to,text,link){if(!to)return;db.notes.push({id:uid('n'),to,text,link:link||'',at:now(),seen:false});if(db.notes.length>600)db.notes=db.notes.slice(-600)}
const unseen=u=>u?db.notes.filter(n=>n.to===u.id&&!n.seen).length:0;
const MASARIF=['الفقراء','المساكين','العاملون عليها','المؤلفة قلوبهم','في الرقاب','الغارمون','في سبيل الله','ابن السبيل'];

/* ---------- seed ---------- */
async function seed(){
  const t0=new Date();t0.setMonth(t0.getMonth()-4);
  const d=(m,day=5)=>{const x=new Date(t0);x.setMonth(x.getMonth()+m);x.setDate(day);x.setHours(10,30,0,0);return x.toISOString()};
  db={v:1,seq:1000,users:[],tx:[],reqs:[],cash:[],dist:[],policies:[],claims:[],msgs:[],fundOut:[],notes:[],funds:{zakat:0,sadaqa:0,waqf:0,qard:250000,takaful:42000,takafulFee:0},log:[],
      settings:{murabahaRate:5,ijaraRate:5.5,musharakaRate:5,mudaribShare:30,goldPrice:245,qardMax:20000,minDown:20,takafulFee:20}};
  const mk=async(o)=>{const salt=Math.random().toString(36).slice(2);const u={id:uid('u'),acct:'BR-'+(++db.seq)+String(Math.floor(Math.random()*9000+1000)),salt,pass:await hash(o.pw,salt),
    name:o.name,email:o.email,phone:phoneDigits(o.phone),nid:o.nid||'',role:o.role||'customer',status:o.status||'active',created:o.created||d(0,1),bal:{current:0,invest:0}};delete u.pw;db.users.push(u);return u};
  await mk({name:'مدير النظام',email:'admin@barakat.qa',phone:'55000001',pw:'Barakat@Admin2026',role:'admin'});
  const c=await mk({name:'عبدالله محمد الكواري',email:'client@barakat.qa',phone:'55123456',nid:'28763400001',pw:'Client@2026'});
  const c2=await mk({name:'مريم أحمد السليطي',email:'maryam@barakat.qa',phone:'66234567',nid:'29063400002',pw:'Client@2026'});
  await mk({name:'يوسف خالد العلي',email:'yousef@barakat.qa',phone:'33456789',nid:'29563400003',pw:'Client@2026',status:'pending',created:d(4,1)});
  const tx=(u,acc,amt,type,note,at)=>{u.bal[acc]=r2(u.bal[acc]+amt);db.tx.push({id:uid('t'),uid:u.id,acc,amt:r2(amt),type,note,at,bal:u.bal[acc]})};
  tx(c,'current',45000,'deposit','إيداع تحويل بنكي · مرجع 77120',d(0,3));
  tx(c,'current',-20000,'move','تحويل إلى حساب الاستثمار',d(0,4));tx(c,'invest',20000,'move','تحويل من الحساب الجاري',d(0,4));
  tx(c2,'current',30000,'deposit','إيداع نقدي في الفرع',d(0,6));
  tx(c2,'current',-15000,'move','تحويل إلى حساب الاستثمار',d(0,7));tx(c2,'invest',15000,'move','تحويل من الحساب الجاري',d(0,7));
  // a profit distribution already done
  const pool=35000, gross=1050, mud=r2(gross*0.3), net=gross-mud;
  tx(c,'invest',r2(net*20000/pool),'profit','حصتك من ربح وعاء المضاربة',d(3,1));
  tx(c2,'invest',r2(net*15000/pool),'profit','حصتك من ربح وعاء المضاربة',d(3,1));
  db.dist.push({id:uid('p'),at:d(3,1),period:'الربع الثالث',gross,mud,net,pool,by:'مدير النظام'});
  // active murabaha for demo client
  const r=newReq(c,'murabaha',{amount:18000,term:24,asset:'سيارة عائلية موديل 2026',purpose:'استخدام شخصي'},d(1,2));
  r.owned=d(1,4);makeOffer(r,d(1,4));r.status='active';r.accepted=d(1,5);r.schedule=buildSchedule(r,d(1,5));
  [0,1,2].forEach(i=>{const s=r.schedule[i];s.paid=true;s.paidAt=s.due;tx(c,'current',-s.amt,'installment',`قسط ${i+1} · ${PRODUCTS.murabaha.name}`,s.due)});
  // pending requests
  newReq(c2,'qard',{amount:6000,term:12,asset:'رسوم دراسية جامعية',purpose:'تعليم'},d(4,2));
  newReq(c,'musharaka',{amount:600000,term:120,down:30,asset:'فيلا سكنية في الوكرة',purpose:'مسكن الأسرة'},d(4,3));
  db.cash.push({id:uid('c'),uid:c2.id,kind:'deposit',amt:5000,method:'تحويل بنكي',ref:'88412',status:'pending',at:d(4,4)});
  tx(c,'current',-1000,'zakat','زكاة المال · توكيل بالتوزيع',d(2,10));db.funds.zakat+=1000;
  // takaful: a covered car policy for the demo client, a health policy and a pending claim for Maryam
  const pc={id:'T-'+(++db.seq),uid:c.id,plan:'car',start:d(2,1),paidThrough:addMonths(now(),1),status:'active'};db.policies.push(pc);
  tx(c,'current',-120,'takaful',`اشتراك تكافل المركبات · ${pc.id}`,d(2,1));
  const pm={id:'T-'+(++db.seq),uid:c2.id,plan:'health',start:d(1,1),paidThrough:addMonths(now(),1),status:'active'};db.policies.push(pm);
  tx(c2,'current',-150,'takaful',`اشتراك تكافل صحي · ${pm.id}`,d(1,1));
  db.claims.push({id:'K-'+(++db.seq),uid:c2.id,pid:pm.id,amt:1200,desc:'فاتورة علاج في عيادة الأسنان',status:'pending',at:d(4,5)});
  db.msgs.push({id:'M-'+(++db.seq),at:d(4,6),name:'خالد سعيد المري',email:'khalid@example.com',phone:'97455667788',subject:'فتح حساب',body:'هل يمكن فتح حساب لشركة صغيرة، وما المستندات المطلوبة؟',uid:null,status:'new'});
  db.notes.push({id:uid('n'),to:c.id,text:'وُزّعت أرباح وعاء المضاربة للربع الثالث، وأضيفت حصتك إلى حساب الاستثمار.',link:'#/c/invest',at:d(3,1),seen:false});
  db.notes.push({id:uid('n'),to:c.id,text:'سُدد اشتراك تكافل المركبات، وأنت مغطى طوال الشهر.',link:'#/c/takaful',at:d(2,1),seen:true});
  db.notes.push({id:uid('n'),to:c2.id,text:'استلمنا مطالبة التكافل، وهي قيد المراجعة.',link:'#/c/takaful',at:d(4,5),seen:false});
  logA('تهيئة بيانات التجربة','النظام');
  save();
}
function logA(what,who){db.log.unshift({at:now(),what,who:who||(me()?me().name:'زائر')});db.log=db.log.slice(0,300)}
function addTx(u,acc,amt,type,note){u.bal[acc]=r2(u.bal[acc]+amt);db.tx.push({id:uid('t'),uid:u.id,acc,amt:r2(amt),type,note,at:now(),bal:u.bal[acc]})}
function newReq(u,product,f,at){const r={id:'F-'+(++db.seq),uid:u.id,product,amount:r2(f.amount),term:+f.term,down:+(f.down||0),share:+(f.share||0),asset:f.asset,purpose:f.purpose||'',status:'pending',created:at||now(),note:''};db.reqs.push(r);return r}
function makeOffer(r,at){
  const s=db.settings;r.status='offer';r.offered=at||now();
  const yrs=r.term/12;
  if(r.product==='murabaha'){r.rate=s.murabahaRate;r.profit=r2(r.amount*s.murabahaRate/100*yrs);r.total=r2(r.amount+r.profit)}
  if(r.product==='ijara'){r.rate=s.ijaraRate;r.profit=r2(r.amount*s.ijaraRate/100*yrs);r.total=r2(r.amount+r.profit)}
  if(r.product==='musharaka'){r.rate=s.musharakaRate;r.downAmt=r2(r.amount*r.down/100);const bank=r.amount-r.downAmt;let rent=0;for(let i=0;i<r.term;i++)rent+=bank*(1-i/r.term)*s.musharakaRate/100/12;r.profit=r2(rent);r.total=r2(bank+rent)}
  if(r.product==='qard'){r.rate=0;r.profit=0;r.total=r.amount}
  if(r.product==='mudaraba'){r.rate=0;r.bankShare=r.share||40;r.total=r.amount}
}
function buildSchedule(r,from){
  const out=[],n=r.term;
  if(r.product==='mudaraba')return out;
  if(r.product==='musharaka'){const bank=r.amount-r.downAmt;let paid=0;
    for(let i=0;i<n;i++){const buy=i===n-1?r2(bank-paid):r2(bank/n);paid=r2(paid+buy);const rent=r2(bank*(1-i/n)*r.rate/100/12);out.push({n:i+1,due:addMonths(from,i+1),amt:r2(buy+rent),buy,rent,paid:false})}return out}
  const each=r2(r.total/n);let acc=0;
  for(let i=0;i<n;i++){const a=i===n-1?r2(r.total-acc):each;acc=r2(acc+a);out.push({n:i+1,due:addMonths(from,i+1),amt:a,paid:false})}
  return out;
}

/* ---------- session ---------- */
const me=()=>{const id=store.get(SKEY);return id?db.users.find(u=>u.id===id):null};
const userById=id=>db.users.find(u=>u.id===id);

/* ---------- ui helpers ---------- */
const $=s=>document.querySelector(s);
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('show'),3200)}
function dialog(html){$('#dlgIn').innerHTML=html;const d=$('#dlg');if(d.showModal)d.showModal();else d.setAttribute('open','')}
function closeDlg(){const d=$('#dlg');d.close?d.close():d.removeAttribute('open')}
let go=h=>{if(location.hash===h)render();else location.hash=h};
const table=(cols,rows,empty,cls)=>rows.length?`<div class="tbl cards ${cls||''}"><table><thead><tr>${cols.map(c=>`<th class="${c.num?'num':''}">${c.l}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${cols.map((c,i)=>`<td data-l="${c.l}" class="${c.num?'num':''}">${c.num?`<span>${r[i]}</span>`:r[i]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:`<div class="card empty">${empty||'لا توجد بيانات بعد.'}</div>`;
const amtCell=a=>`<span class="${a<0?'neg':'pos'}">${a>0?'+':''}${money(a)}</span>`;
const nextDue=r=>r.schedule?r.schedule.find(s=>!s.paid):null;
const remaining=r=>r.schedule?r2(r.schedule.filter(s=>!s.paid).reduce((a,s)=>a+s.amt,0)):(r.status==='active'?r.amount:0);
const isLate=s=>s&&!s.paid&&new Date(s.due)<new Date();
const pendingWithdraw=u=>r2(db.cash.filter(c=>c.uid===u.id&&c.kind==='withdraw'&&c.status==='pending').reduce((a,c)=>a+c.amt,0));
const avail=u=>r2(u.bal.current-pendingWithdraw(u));

/* ---------- routes ---------- */
const PTABS=[['#/','الرئيسية'],['#/p/accounts','الحسابات والاستثمار'],['#/p/finance','التمويل'],['#/p/takaful','التكافل'],['#/p/zakat','الزكاة والخير'],['#/p/sharia','الضوابط الشرعية'],['#/p/about','عن بركات'],['#/p/faq','الأسئلة الشائعة'],['#/p/contact','تواصل معنا']];
const CTABS=[['#/c/home','الرئيسية'],['#/c/accounts','حساباتي'],['#/c/transfer','التحويل'],['#/c/cash','الإيداع والسحب'],['#/c/finance','التمويل'],['#/c/invest','الاستثمار'],['#/c/takaful','التكافل'],['#/c/zakat','الزكاة والخير'],['#/c/help','المساعدة','help'],['#/c/profile','ملفي']];
const ATABS=[['#/a/home','لوحة التحكم'],['#/a/requests','طلبات التمويل','reqs'],['#/a/cash','الإيداع والسحب','cash'],['#/a/users','العملاء','users'],['#/a/profit','توزيع الأرباح'],['#/a/takaful','التكافل','claims'],['#/a/funds','الزكاة والصناديق'],['#/a/messages','الرسائل','msgs'],['#/a/reports','التقارير'],['#/a/settings','الإعدادات'],['#/a/log','سجل العمليات']];
function render(){
  const h=location.hash||'#/';const u=me();const [ ,area,page,arg]=h.split('/');
  // header
  $('#who').textContent=u?`${u.name} · ${u.role==='admin'?'الإدارة':u.acct}`:'';
  const nb=u&&u.role==='customer'?unseen(u):0;
  $('#authBtns').innerHTML=u?`${u.role==='customer'?`<a class="btn sm ghost bell" href="#/c/notes" aria-label="الإشعارات${nb?` (${nb} جديدة)`:''}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg>${nb?`<span class="n">${nb}</span>`:''}</a>`:''}<a class="btn sm ghost" href="${u.role==='admin'?'#/a/home':'#/c/home'}">${u.role==='admin'?'اللوحة':'حسابي'}</a><button class="btn sm ghost" data-act="logout">خروج</button>`
    :`<a class="btn sm ghost" href="#/login">دخول</a><a class="btn sm" href="#/register">افتح حساباً</a>`;
  let tabs=null;
  if(area==='c'){if(!u)return go('#/login');if(u.role!=='customer')return go('#/a/home');tabs=CTABS}
  else if(area==='a'){if(!u)return go('#/login');if(u.role!=='admin'){toast('هذه الصفحة للإدارة فقط');return go('#/c/home')}tabs=ATABS}
  else if(u&&(area==='login'||area==='register'))return go(u.role==='admin'?'#/a/home':'#/c/home');
  const nav=$('#tabs');const pub=!tabs&&area!=='login'&&area!=='register';
  if(pub)tabs=PTABS;
  nav.classList.toggle('pub',pub);
  if(tabs){nav.hidden=false;const cnt={reqs:db.reqs.filter(r=>r.status==='pending').length,cash:db.cash.filter(c=>c.status==='pending').length,users:db.users.filter(x=>x.status==='pending').length,
      claims:db.claims.filter(c=>c.status==='pending').length,msgs:db.msgs.filter(m=>m.status==='new').length,help:u?db.msgs.filter(m=>m.uid===u.id&&m.status==='replied'&&!m.seen).length:0};
    const isOn=t=>t[0]==='#/'?(h==='#/'||h==='#'):h.startsWith(t[0]);
    $('#tabsIn').innerHTML=tabs.map(t=>`<a href="${t[0]}" class="${isOn(t)?'on':''}">${t[1]}${t[2]&&cnt[t[2]]?`<span class="n">${cnt[t[2]]}</span>`:''}</a>`).join('');
    const on=$('#tabsIn a.on');if(on)on.scrollIntoView({block:'nearest',inline:'center'});
  }else nav.hidden=true;
  const V=$('#view');
  const map={'':vHome,login:vLogin,register:vRegister};
  let html;
  if(area==='c')html=(C[page]||C.home)(u,arg);
  else if(area==='a')html=(A[page]||A.home)(u,arg);
  else if(area==='p')html=(P[page]||vHome)(u,arg);
  else html=(map[area]||vHome)();
  V.innerHTML=html;window.scrollTo(0,0);
  if(area==='c'&&page==='notes'){const n=$('#authBtns .bell .n');if(n)n.remove()}
  const t={'':'الخدمات المصرفية الإسلامية',login:'الدخول',register:'فتح حساب'}[area]||(tabs&&(tabs.find(x=>x[0]!=='#/'&&h.startsWith(x[0]))||[])[1])||'';
  document.title=`بركات · ${t}`;
  if(page==='zakat'&&(area==='c'||area==='p'))calcZakat();
  if((area==='c'&&page==='finance'&&arg==='new')||(area==='p'&&page==='finance'))previewFin();
}

/* ---------- visitor ---------- */
const AYAH=`<div class="ayah">﴿وَلَوْ أَنَّ أَهْلَ الْقُرَىٰ آمَنُوا وَاتَّقَوْا لَفَتَحْنَا عَلَيْهِم بَرَكَاتٍ مِّنَ السَّمَاءِ وَالْأَرْضِ﴾<small>سورة الأعراف، الآية 96</small></div>`;
const pageH=(t,d)=>`<div class="page-h"><h2>${t}</h2>${d?`<p>${d}</p>`:''}</div>`;
const ctaBox=(t,d)=>`<div class="card" style="background:var(--acc-soft);border-color:transparent;margin-top:24px"><div class="row" style="justify-content:space-between"><div><h3 style="margin:0">${t}</h3><p class="sub">${d}</p></div><div class="row">${me()?`<a class="btn" href="${me().role==='admin'?'#/a/home':'#/c/home'}">انتقل إلى حسابك</a>`:'<a class="btn" href="#/register">افتح حساباً</a><a class="btn ghost" href="#/login">الدخول</a>'}</div></div></div>`;
const feat=(href,ico,t,d)=>`<a class="card feat" href="${href}"><span class="ico">${ico}</span><h4>${t}</h4><p class="sub">${d}</p><span class="more">التفاصيل ←</span></a>`;
function vHome(){
  return `<section class="hero"><div><h1>بركات: مالُك ينمو <span>في الحلال</span></h1>
  <p class="lede">نظام مصرفي إسلامي متكامل يغنيك عن البنوك الربوية: حسابات وتحويلات بلا رسوم، وتمويل بالمرابحة والإجارة والمشاركة، وقرض حسن بلا زيادة، واستثمار بالمضاربة تشارك فيه في الربح الحقيقي، وتكافل، وزكاة ووقف.</p>
  <div class="row"><a class="btn" href="#/register">افتح حساباً الآن</a><a class="btn ghost" href="#/login">لدي حساب</a><a class="btn ghost" href="#/p/finance">احسب تمويلك</a></div></div>
  <div class="art"><svg width="210" height="210" viewBox="0 0 64 64" role="img" aria-label="شعار بركات"><use href="#mark"/></svg></div></section>
  <div class="grid g4" style="margin-top:28px">
   <div class="card kpi"><span>رسوم التحويل بين العملاء</span><b>0.00 ${CUR}</b></div>
   <div class="card kpi"><span>فائدة على أي حساب أو تمويل</span><b>لا يوجد</b></div>
   <div class="card kpi"><span>غرامة تأخير لصالح المؤسسة</span><b>لا يوجد</b></div>
   <div class="card kpi"><span>نصاب الزكاة اليوم (85 غراماً ذهباً)</span><b>${money(85*db.settings.goldPrice)}</b></div>
  </div>
  <h2 style="font-size:22px;margin:34px 0 14px">خدماتنا</h2>
  <div class="grid g3">
   ${feat('#/p/accounts','ح','الحسابات والاستثمار','حساب جارٍ مضمون متاح في أي وقت، وحساب استثمار بالمضاربة يوزَّع ربحه الفعلي.')}
   ${feat('#/p/finance','ت','التمويل الإسلامي','مرابحة وإجارة منتهية بالتمليك ومشاركة متناقصة ومضاربة وقرض حسن، مع حاسبة فورية.')}
   ${feat('#/p/takaful','ك','التكافل','حماية تعاونية لصحتك ومركبتك ومنزلك وأسرتك، بالتبرع لا بالمعاوضة.')}
   ${feat('#/p/zakat','ز','الزكاة والخير','حاسبة زكاة بسعر الذهب، وتوكيل بالتوزيع على المصارف الثمانية، وصدقة ووقف نقدي.')}
   ${feat('#/p/sharia','ش','الضوابط الشرعية','المبادئ الملزمة لكل عقد، ودور هيئة الرقابة الشرعية، وما نستبعده من المعاملات.')}
   ${feat('#/p/about','ب','عن بركات','معنى الاسم والرؤية والرسالة والقيم التي نعمل بها.')}
  </div>
  <h2 style="font-size:22px;margin:34px 0 14px">ابدأ في ثلاث خطوات</h2>
  <div class="steps3">
   <div class="card"><h4>افتح حسابك</h4><p class="sub">ببياناتك الأساسية ورقم هويتك، ويُفتح لك الحساب الجاري وحساب الاستثمار فوراً.</p></div>
   <div class="card"><h4>نتحقق من هويتك</h4><p class="sub">تراجع الإدارة بياناتك وتفعّل الإيداع والتحويل والتمويل.</p></div>
   <div class="card"><h4>ابدأ التعامل</h4><p class="sub">أودع وحوّل واستثمر واطلب التمويل وأخرج زكاتك من مكان واحد.</p></div>
  </div>
  <div style="margin-top:30px">${AYAH}</div>
  ${ctaBox('جاهز للبدء؟','فتح الحساب مجاني ولا يستغرق أكثر من دقيقتين.')}`;
}
const P={};
P.accounts=()=>`${pageH('الحسابات والاستثمار','حسابان لكل عميل: جارٍ مضمون للمعاملات اليومية، واستثماري يشارك في الربح الحقيقي.')}
 <div class="grid g2">
  <div class="card acct"><span class="tag">قرض حسن مضمون</span><h3 style="margin-top:8px">الحساب الجاري</h3><ul class="clean">
   <li>رصيدك مضمون كاملاً ومتاح للسحب والتحويل في أي وقت.</li><li>تحويل فوري بلا رسوم إلى أي عميل في بركات برقم حسابه أو جواله.</li>
   <li>لا يُدفع عليه عائد، لأن المال المضمون لا يستحق ربحاً.</li><li>إيداع وسحب بالتحويل البنكي أو نقداً، بعد تحقق الإدارة من المرجع.</li></ul></div>
  <div class="card acct"><span class="tag">مضاربة</span><h3 style="margin-top:8px">حساب الاستثمار</h3><ul class="clean">
   <li>يدخل رصيدك وعاءً استثمارياً مشتركاً يُدار في أنشطة مباحة فقط.</li><li>يُوزَّع الربح الفعلي دورياً: ${100-db.settings.mudaribShare}% للمودعين بنسبة أرصدتهم و${db.settings.mudaribShare}% لبركات مضارباً.</li>
   <li>لا ربح مضموناً ولا محدداً مسبقاً، فهذا هو الفرق بين الربح والفائدة.</li><li>إن وقعت خسارة بلا تعدٍّ ولا تقصير تحمّلها رأس المال ولم يأخذ المضارب شيئاً.</li></ul></div>
 </div>
 <div class="grid g3" style="margin-top:16px">
  <div class="card kpi"><span>رسوم فتح الحساب</span><b>0.00 ${CUR}</b></div><div class="card kpi"><span>رسوم التحويل الداخلي</span><b>0.00 ${CUR}</b></div><div class="card kpi"><span>حصة المضارب من الربح</span><b>${db.settings.mudaribShare}%</b></div>
 </div>
 ${ctaBox('افتح حسابيك الآن','يُفتح الحساب الجاري وحساب الاستثمار معاً.')}`;
P.finance=()=>`${pageH('التمويل الإسلامي','كل صيغة عقد حقيقي له أصل وملكية وضمان، لا قرض بفائدة متخفٍّ. جرّب الحاسبة أدناه.')}
 <div class="grid g3">${Object.values(PRODUCTS).map(p=>`<div class="card prod"><span class="k">${p.k}</span><h4>${p.name}</h4><p>${p.desc}</p></div>`).join('')}
  <div class="card prod" style="background:var(--acc-soft);border-color:transparent"><span class="k">مسار كل عقد</span><h4>طلب، ثم مراجعة وتملّك، ثم عرض، ثم قبولك</h4><p>لا يُبرم عقد بيع قبل أن تتملك بركات السلعة، ولا يسري عقد قبل موافقتك على شروطه المكتوبة، والثمن لا يزيد بالتأخير.</p></div></div>
 <h3 style="font-size:20px;margin:28px 0 12px">حاسبة التمويل</h3>${finForm(me()&&me().role==='customer'?me():null)}
 ${ctaBox('هل يناسبك العرض؟','قدّم طلبك من حسابك، وتصلك شروط العقد كاملة قبل أي التزام.')}`;
P.takaful=()=>`${pageH('التكافل','حماية تعاونية يتبرع فيها المشتركون لصندوق واحد يعوِّض من يصيبه الضرر منهم، وتديره بركات بأجر وكالة معلوم.')}
 <div class="grid g4">${Object.entries(PLANS).map(([k,p])=>`<div class="card prod"><span class="k">${p.k}</span><h4>${p.name}</h4><p>${p.desc}</p><div class="split" style="margin-top:8px"><span>الاشتراك الشهري</span><b>${money(p.fee)}</b></div><div class="split"><span>أقصى تعويض للمطالبة</span><b>${money(p.cap)}</b></div></div>`).join('')}</div>
 <div class="grid g2" style="margin-top:16px">
  <div class="card"><h3>لماذا التكافل لا التأمين التجاري؟</h3><ul class="clean"><li>الاشتراك تبرع لصندوق المشتركين، لا ثمن لتعويض محتمل، فينتفي الغرر والقمار.</li><li>الصندوق ملك المشتركين، وبركات وكيل عنهم بأجر ${db.settings.takafulFee}% من الاشتراكات.</li><li>يُستثمر الصندوق في المباح، ويعود الفائض بعد التعويضات إلى المشتركين.</li></ul></div>
  <div class="card"><h3>كيف تطالب بالتعويض؟</h3><ul class="clean"><li>اشترك في البرنامج من حسابك وسدّد الاشتراك الشهري.</li><li>قدّم المطالبة بالمبلغ ووصف الضرر من صفحة التكافل في حسابك.</li><li>تراجع الإدارة المطالبة، ويُصرف التعويض المعتمد إلى حسابك الجاري مباشرة.</li></ul></div>
 </div>${ctaBox('احمِ نفسك وأسرتك','اشترك في برنامج التكافل المناسب من حسابك.')}`;
P.zakat=()=>`${pageH('الزكاة والخير','احسب زكاتك بدقة، ووكّل بركات بتوزيعها على مستحقيها، وتصدّق أو ساهم في الوقف النقدي.')}
 <div class="grid g2" style="align-items:start">${zakatCard(me()&&me().role==='customer'?me():null)}
  <div class="card"><h3>مصارف الزكاة الثمانية</h3><p class="sub" style="margin-bottom:8px">﴿إِنَّمَا الصَّدَقَاتُ لِلْفُقَرَاءِ وَالْمَسَاكِينِ وَالْعَامِلِينَ عَلَيْهَا وَالْمُؤَلَّفَةِ قُلُوبُهُمْ وَفِي الرِّقَابِ وَالْغَارِمِينَ وَفِي سَبِيلِ اللَّهِ وَابْنِ السَّبِيلِ﴾ [التوبة: 60]</p>
   <ul class="clean">${MASARIF.map(m=>`<li>${m}</li>`).join('')}</ul>
   <h3 style="margin-top:16px">الصدقة والوقف</h3><p class="sub">صندوق الصدقات يُصرف في الإغاثة والحاجات العاجلة، والوقف النقدي يُستثمر أصله ويُصرف ريعه في وجوه البر دائماً.</p></div></div>
 ${ctaBox('أخرج زكاتك بضغطة','من صفحة الزكاة في حسابك، مع سجل موثّق لكل ما دفعت.')}`;
P.sharia=()=>`${pageH('الضوابط الشرعية','مبادئ ملزمة لكل منتج وعقد في بركات، تراقبها هيئة رقابة شرعية مستقلة.')}
 <div class="grid g2">
  <div class="card"><h3>ما نلتزم به</h3><ul class="clean">
   <li>لا ربا في أي صورة: لا فائدة على حساب ولا تمويل، ولا زيادة على قرض.</li>
   <li>لا بيع قبل التملك والقبض: تشتري بركات السلعة وتتحمل ضمانها قبل بيعها.</li>
   <li>الثمن معلوم وثابت عند العقد، ولا يزيد بالتأخير أو بتغير الأسعار.</li>
   <li>لا غرامة تأخير لصالح المؤسسة، ويُمهل المعسر حتى ميسرة.</li>
   <li>الربح في المضاربة والمشاركة نسبة شائعة من الربح الفعلي، والخسارة على رأس المال.</li>
   <li>استثمار الأموال في المباح فقط، مع استبعاد الأنشطة المحرمة والشركات عالية الاستدانة الربوية.</li></ul></div>
  <div class="card"><h3>ما نستبعده</h3><ul class="clean">
   <li>القروض والبطاقات الائتمانية بفائدة.</li><li>التورق المنظم، لقرار مجمع الفقه الإسلامي الدولي رقم 179 (19/5).</li>
   <li>بيع الدين بالدين وخصم الكمبيالات.</li><li>التأمين التجاري، ويحل محله التكافل.</li><li>المشتقات والمضاربات قصيرة الأجل على العملات والأسهم.</li></ul></div>
 </div>
 <div class="grid g3" style="margin-top:16px">
  <div class="card"><h4>هيئة الرقابة الشرعية</h4><p class="sub">ثلاثة فقهاء متخصصين في فقه المعاملات على الأقل، مستقلون عن الإدارة، وقراراتهم ملزمة.</p></div>
  <div class="card"><h4>التدقيق الشرعي</h4><p class="sub">مراجعة دورية لعينة من العقود والعمليات، وتقرير سنوي معلن للمتعاملين.</p></div>
  <div class="card"><h4>المرجعية</h4><p class="sub">المعايير الشرعية لهيئة المحاسبة والمراجعة للمؤسسات المالية الإسلامية، وقرارات مجمع الفقه الإسلامي الدولي.</p></div>
 </div>
 <p class="sub" style="margin-top:16px">التفصيل الكامل في <a href="document/">الوثيقة التأسيسية</a>.</p>`;
P.about=()=>`${pageH('عن بركات','مؤسسة مالية إسلامية تقدم بديلاً كاملاً عن البنوك الربوية، قائماً على العدل والشفافية والمشاركة.')}
 <div class="grid g2" style="align-items:start">
  <div class="stack"><div class="card"><h3>معنى الاسم</h3><p>اسم «بركات» مأخوذ من قول الله تعالى:</p><div style="margin:10px 0">${AYAH}</div><p class="sub">فالبركة ثمرة الإيمان والتقوى، وهي النماء الحقيقي في المال لا مجرد زيادته. ولهذا لا نعِد بفائدة مضمونة، بل بمالٍ يعمل في الحلال فيبارَك فيه.</p></div>
   <div class="card"><h3>الشعار</h3><div class="row" style="gap:16px;flex-wrap:nowrap"><svg width="72" height="72" viewBox="0 0 64 64" aria-hidden="true" style="flex:none"><use href="#mark"/></svg><p class="sub">قطرات من السماء فوق نبتة تخرج من الأرض: بركات السماء والأرض التي وعد الله بها، والمال الذي ينمو بالعمل الحلال.</p></div></div></div>
  <div class="stack">
   <div class="card"><h3>رؤيتنا</h3><p class="sub">أن يجد كل مسلم مؤسسة مالية تغنيه عن الربا في كل حاجاته، دون أن يتنازل عن الجودة أو السهولة.</p></div>
   <div class="card"><h3>رسالتنا</h3><p class="sub">تقديم خدمات مصرفية وتمويلية واستثمارية وتكافلية منضبطة بالشريعة، بشفافية كاملة في الشروط والأرباح والرسوم.</p></div>
   <div class="card"><h3>قيمنا</h3><ul class="clean"><li><b>الأمانة:</b> مال العميل وديعة نحفظها.</li><li><b>العدل:</b> الغنم بالغرم، والربح لمن تحمّل المخاطرة.</li><li><b>الشفافية:</b> كل شرط مكتوب، وكل ريال موثّق.</li><li><b>الرحمة:</b> إنظار المعسر وإقراض المحتاج قرضاً حسناً.</li></ul></div>
  </div></div>`;
const FAQ=[
 ['ما الفرق بين ربح بركات والفائدة في البنوك؟','الفائدة زيادة مشروطة على القرض مضمونة مهما كانت النتيجة، وهي ربا. أما ربحنا فيأتي من بيع حقيقي تملكت فيه بركات السلعة وتحملت ضمانها، أو من مشاركة في ربح فعلي مع تحمل الخسارة.'],
 ['هل رصيدي في الحساب الجاري مضمون؟','نعم. الحساب الجاري قرض حسن من العميل لبركات، فهو مضمون كاملاً ومتاح في أي وقت، ولذلك لا يُدفع عليه عائد.'],
 ['ماذا يحدث إن تأخرت في سداد قسط؟','لا تُضاف أي غرامة لصالح بركات ولا يزيد الثمن. نذكّرك بالقسط، ونُمهل المعسر حتى ميسرة.'],
 ['كيف يُحسب ربح حساب الاستثمار؟','يُخصم من الربح الفعلي للوعاء حصة المضارب المعلنة، ويُوزع الباقي على المودعين بنسبة أرصدتهم. لا يُحدد أي ربح مسبقاً.'],
 ['متى يُفعَّل حسابي؟','بعد أن تراجع الإدارة بيانات هويتك. يمكنك تصفح الخدمات فور التسجيل، وتُفعَّل العمليات المالية بعد التحقق.'],
 ['هل يمكنني سداد التمويل مبكراً؟','نعم، تسدد الأقساط المتبقية متى شئت من صفحة العقد في حسابك.'],
 ['كيف تُصرف الزكاة التي أوكّلكم بها؟','تُودع في صندوق الزكاة، وتُصرف على المصارف الثمانية فقط، ويُوثَّق كل صرف في سجل تراجعه هيئة الرقابة الشرعية.'],
 ['هل تعمل بركات دون إنترنت؟','نعم، تتوفر نسخة للكمبيوتر تعمل على ويندوز وماك ولينكس دون إنترنت، وتحفظ البيانات في ملف على جهازك.']];
P.faq=()=>`${pageH('الأسئلة الشائعة','إجابات مختصرة عن أكثر ما يسأل عنه المتعاملون.')}${FAQ.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}${ctaBox('لم تجد إجابتك؟','راسلنا وسنرد عليك في أقرب وقت.').replace('<a class="btn" href="#/register">افتح حساباً</a>','<a class="btn" href="#/p/contact">تواصل معنا</a>')}`;
P.contact=()=>{const u=me();return `${pageH('تواصل معنا','نسعد بأسئلتك واقتراحاتك. تصل رسالتك إلى فريق خدمة العملاء مباشرة.')}
 <div class="grid g2" style="align-items:start">
  <div class="card"><form data-form="contact"><div class="f">
   <div class="grid g2"><label>الاسم<input name="name" required minlength="3" value="${u?esc(u.name):''}" autocomplete="name"></label>
   <label>رقم الجوال<input name="phone" required inputmode="tel" dir="ltr" value="${u?fphone(u.phone):''}" placeholder="+974 5000 0000"></label></div>
   <label>البريد الإلكتروني<input name="email" type="email" required dir="ltr" value="${u?esc(u.email):''}"></label>
   <label>الموضوع<select name="subject"><option>استفسار عام</option><option>فتح حساب</option><option>التمويل</option><option>الاستثمار</option><option>التكافل</option><option>الزكاة والصدقات</option><option>شكوى</option><option>اقتراح</option></select></label>
   <label>الرسالة<textarea name="body" required minlength="10" maxlength="1000"></textarea></label>
   <p class="err" id="err"></p><div><button class="btn">إرسال الرسالة</button></div></div></form></div>
  <div class="stack"><div class="card"><h3>قنوات التواصل</h3>
   <div class="split"><span>البريد الإلكتروني</span><b><a href="mailto:munijizqa@gmail.com">munijizqa@gmail.com</a></b></div>
   <div class="split"><span>الهاتف وواتساب</span><b><a href="https://wa.me/97451600498">+974 5160 0498</a></b></div>
   <div class="split"><span>ساعات العمل</span><b style="direction:rtl">الأحد إلى الخميس، 8:00 إلى 16:00</b></div></div>
   <div class="note">${u&&u.role==='customer'?'تجد رسائلك وردود فريقنا في صفحة <a href="#/c/help">المساعدة</a> داخل حسابك.':'إن كان لديك حساب فادخل أولاً لتتابع رد فريقنا داخل حسابك.'}</div></div></div>`};
P.terms=()=>`${pageH('الشروط والخصوصية','ملخص الشروط العامة لاستخدام خدمات بركات وسياسة حماية بياناتك.')}
 <div class="grid g2" style="align-items:start">
  <div class="card"><h3>الشروط العامة</h3><ul class="clean">
   <li>تخضع كل معاملات العميل لأحكام الشريعة الإسلامية كما تقررها هيئة الرقابة الشرعية.</li>
   <li>يلتزم العميل بصحة بياناته، وتُفعَّل العمليات المالية بعد التحقق من الهوية.</li>
   <li>لكل عقد تمويل شروطه المكتوبة التي تُعرض على العميل ولا تسري قبل قبوله.</li>
   <li>يجوز لبركات إيقاف الحساب مؤقتاً عند الاشتباه في استخدام غير مشروع، مع إبلاغ العميل بالسبب.</li>
   <li>تُحل الخلافات بالصلح أولاً، ثم بالتحكيم وفق أحكام الشريعة.</li></ul></div>
  <div class="card"><h3>سياسة الخصوصية</h3><ul class="clean">
   <li>نجمع البيانات اللازمة لتقديم الخدمة فقط: الاسم والجوال والبريد ورقم الهوية وسجل المعاملات.</li>
   <li>لا نبيع بياناتك ولا نشاركها مع أي جهة إلا بأمر نظامي.</li>
   <li>كلمات المرور محفوظة مشفّرة ولا يطّلع عليها أحد.</li>
   <li>${CLOUD?'تُحفظ بيانات الحسابات في قاعدة بيانات سحابية محمية، لا يقرأ فيها العميل إلا بياناته، ولا تُنفَّذ أي عملية مالية إلا عبر خادم بركات.':'في هذا النموذج تبقى البيانات على جهازك وحده، في المتصفح أو في ملف نسخة الكمبيوتر.'}</li>
   <li>لك أن تطلب تصحيح بياناتك أو إغلاق حسابك عبر <a href="#/p/contact">نموذج التواصل</a>.</li></ul></div></div>`;
function vLogin(){
  return `<div class="auth card"><h2 style="font-size:22px">الدخول إلى حسابك</h2><p class="sub" style="margin-bottom:16px">للعملاء والإدارة.</p>
  <form data-form="login"><div class="f">
   <label>البريد الإلكتروني أو رقم الجوال<input name="id" required autocomplete="username" dir="ltr"></label>
   <label>كلمة المرور<input name="pw" type="password" required autocomplete="current-password" dir="ltr"></label>
   <p class="err" id="err"></p>
   <button class="btn">دخول</button>
   <p class="sub">ليس لديك حساب؟ <a href="#/register">افتح حساباً</a></p>
  </div></form>
  <div class="note" style="margin-top:18px"><b>حساب عميل للتجربة:</b> <span dir="ltr">client@barakat.qa</span> · كلمة المرور <span dir="ltr">Client@2026</span></div></div>`;
}
function vRegister(){
  return `<div class="auth card"><h2 style="font-size:22px">فتح حساب جديد</h2><p class="sub" style="margin-bottom:16px">يُفتح لك الحساب الجاري وحساب الاستثمار فوراً، وتُفعَّل العمليات المالية بعد التحقق من هويتك.</p>
  <form data-form="register"><div class="f">
   <label>الاسم الكامل<input name="name" required minlength="6" autocomplete="name"></label>
   <label>رقم الجوال<input name="phone" required inputmode="tel" dir="ltr" placeholder="+974 5000 0000" autocomplete="tel"></label>
   <label>البريد الإلكتروني<input name="email" type="email" required dir="ltr" autocomplete="email"></label>
   <label>رقم الهوية الشخصية<input name="nid" required inputmode="numeric" pattern="[0-9]{8,14}" dir="ltr"><span class="hint">من 8 إلى 14 رقماً</span></label>
   <label>كلمة المرور<input name="pw" type="password" required minlength="8" dir="ltr" autocomplete="new-password"><span class="hint">8 أحرف على الأقل</span></label>
   <label style="display:flex;gap:8px;align-items:flex-start;color:var(--ink)"><input type="checkbox" name="agree" required style="width:auto;min-height:0;margin-top:6px">أوافق على أن تكون كل معاملاتي وفق أحكام الشريعة الإسلامية وشروط الخدمة.</label>
   <p class="err" id="err"></p>
   <button class="btn">فتح الحساب</button>
  </div></form></div>`;
}

/* ---------- customer ---------- */
const C={};
const inactiveNote=u=>u.status==='pending'?`<div class="note warn"><b>حسابك بانتظار التحقق من الهوية.</b> يمكنك تصفح الخدمات، وتُفعَّل الإيداعات والتحويلات والتمويل بعد مراجعة الإدارة لبياناتك.</div>`:u.status==='frozen'?`<div class="note bad"><b>حسابك موقوف مؤقتاً.</b> تواصل مع خدمة العملاء لمعرفة السبب.</div>`:'';
const txRows=(list)=>list.map(t=>[fdt(t.at),esc(t.note).replace(/\b([A-Z]{1,2}-\d+)\b/g,'<bdi>$1</bdi>'),ACC[t.acc],amtCell(t.amt),money(t.bal)]);
const TXC=[{l:'التاريخ'},{l:'البيان'},{l:'الحساب'},{l:'المبلغ',num:1},{l:'الرصيد بعدها',num:1}];
C.home=u=>{
  const my=db.reqs.filter(r=>r.uid===u.id);
  const due=my.filter(r=>r.status==='active').map(r=>({r,s:nextDue(r)})).filter(x=>x.s);
  const offers=my.filter(r=>r.status==='offer');
  const tx=db.tx.filter(t=>t.uid===u.id).slice(-6).reverse();
  return `<div class="stack">
  <div class="head"><div><h2>أهلاً، ${esc(u.name.split(' ')[0])}</h2><p class="sub">رقم حسابك <span dir="ltr">${u.acct}</span> · ${uTag(u.status)}</p></div>
   <div class="row"><a class="btn" href="#/c/transfer">تحويل</a><a class="btn ghost" href="#/c/finance/new">طلب تمويل</a></div></div>
  ${inactiveNote(u)}
  ${offers.map(r=>`<div class="note warn"><b>عرض تمويل بانتظار قبولك:</b> ${PRODUCTS[r.product].name} لـ${esc(r.asset)}. <a href="#/c/finance/${r.id}">راجع العرض واقبله</a></div>`).join('')}
  ${due.filter(x=>isLate(x.s)).map(x=>`<div class="note bad"><b>قسط متأخر:</b> ${money(x.s.amt)} مستحق منذ ${fdate(x.s.due)} على ${PRODUCTS[x.r.product].name}. لا تُضاف أي غرامة، ونرجو السداد عند الاستطاعة. <a href="#/c/finance/${x.r.id}">سدّد الآن</a></div>`).join('')}
  <div class="grid g3">
   <div class="card acct kpi"><span>الحساب الجاري</span><b>${money(u.bal.current)}</b><small>المتاح ${money(avail(u))}</small></div>
   <div class="card acct kpi"><span>حساب الاستثمار (مضاربة)</span><b>${money(u.bal.invest)}</b><small>أرباح محققة ${money(db.tx.filter(t=>t.uid===u.id&&t.type==='profit').reduce((a,t)=>a+t.amt,0))}</small></div>
   <div class="card acct kpi"><span>المتبقي من التمويل</span><b>${money(my.filter(r=>r.status==='active').reduce((a,r)=>a+remaining(r),0))}</b><small>${due.length?`القسط القادم ${money(due[0].s.amt)} في ${fdate(due[0].s.due)}`:'لا أقساط قائمة'}</small></div>
  </div>
  <div class="head" style="margin:8px 0 0"><h3 style="font-size:18px">آخر الحركات</h3><a href="#/c/accounts">كل الحركات</a></div>
  ${table(TXC,txRows(tx),'لا توجد حركات بعد. ابدأ بطلب إيداع.','txl')}
  </div>`;
};
C.accounts=u=>{
  const tx=db.tx.filter(t=>t.uid===u.id).slice().reverse();
  return `<div class="stack"><div class="head"><div><h2>حساباتي</h2><p class="sub">صاحب الحساب ${esc(u.name)} · <span dir="ltr">${u.acct}</span></p></div></div>
  <div class="grid g2">
   <div class="card acct"><h3>${ACC.current}</h3><p class="kpi"><b>${money(u.bal.current)}</b></p><p class="sub">قرض حسن مضمون، متاح في أي وقت، بلا عائد وبلا رسوم.</p></div>
   <div class="card acct"><h3>${ACC.invest}</h3><p class="kpi"><b>${money(u.bal.invest)}</b></p><p class="sub">مضاربة مطلقة: الربح يوزع بنسبة ${100-db.settings.mudaribShare}% للمودعين و${db.settings.mudaribShare}% لبركات مضارباً، والخسارة على رأس المال.</p></div>
  </div>
  <div class="card noprint"><h3>نقل بين حساباتي</h3><form data-form="move"><div class="grid g3" style="align-items:end">
   <label>من<select name="dir"><option value="ci">الجاري إلى الاستثمار</option><option value="ic">الاستثمار إلى الجاري</option></select></label>
   <label>المبلغ (${CUR})<input name="amt" type="number" min="1" step="0.01" required inputmode="decimal" dir="ltr"></label>
   <button class="btn" ${u.status!=='active'?'disabled':''}>نقل</button></div></form></div>
  ${stmtBlock(u)}</div>`;
};
const SF={acc:'all',per:'all',q:''};
const PERIODS={all:'كل الفترات',m1:'آخر 30 يوماً',m3:'آخر 3 أشهر',y1:'آخر 12 شهراً',ytd:'منذ بداية السنة'};
function stmtList(u,f){const t0={m1:Date.now()-30*864e5,m3:Date.now()-91*864e5,y1:Date.now()-365*864e5,ytd:new Date(new Date().getFullYear(),0,1).getTime(),all:0}[f.per]||0;
  const q=(f.q||'').trim();return db.tx.filter(t=>t.uid===u.id&&(f.acc==='all'||t.acc===f.acc)&&new Date(t.at).getTime()>=t0&&(!q||t.note.includes(q)||ACC[t.acc].includes(q))).slice().reverse()}
function stmtBlock(u){const l=stmtList(u,SF);const inn=r2(l.filter(t=>t.amt>0).reduce((a,t)=>a+t.amt,0)),out=r2(l.filter(t=>t.amt<0).reduce((a,t)=>a+t.amt,0));
  return `<div class="printhead"><div style="display:flex;gap:10px;align-items:center"><svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><use href="#mark"/></svg><div><b style="font-size:20px">بركات</b><div style="font-size:12px">نماءٌ في الحلال</div></div></div>
   <div style="text-align:left;font-size:13px"><b>كشف حساب</b><br>${esc(u.name)} · <span dir="ltr">${u.acct}</span><br>${SF.acc==='all'?'كل الحسابات':ACC[SF.acc]} · ${PERIODS[SF.per]}<br>تاريخ الإصدار ${fdt(now())}</div></div>
  <div class="head" style="margin:8px 0 0"><h3 style="font-size:18px">كشف الحساب</h3><div class="row noprint"><button class="btn sm ghost" data-act="stmtPrint">طباعة أو حفظ PDF</button><button class="btn sm ghost" data-act="stmtCsv">تنزيل Excel (CSV)</button></div></div>
  <form data-form="stmt" class="card noprint"><div class="filters">
   <label>الحساب<select name="acc"><option value="all">كل الحسابات</option>${Object.entries(ACC).map(([k,n])=>`<option value="${k}" ${SF.acc===k?'selected':''}>${n}</option>`).join('')}</select></label>
   <label>الفترة<select name="per">${Object.entries(PERIODS).map(([k,n])=>`<option value="${k}" ${SF.per===k?'selected':''}>${n}</option>`).join('')}</select></label>
   <label>بحث في البيان<input name="q" value="${esc(SF.q)}" maxlength="40" placeholder="مثال: قسط، تحويل، زكاة"></label>
   <button class="btn">عرض</button></div></form>
  <div class="card"><div class="split"><span>عدد الحركات</span><b>${l.length}</b></div><div class="split"><span>إجمالي الوارد</span><b class="pos">${money(inn)}</b></div><div class="split"><span>إجمالي الصادر</span><b class="neg">${money(out)}</b></div><div class="split"><span>الصافي</span><b>${money(inn+out)}</b></div></div>
  ${table(TXC,txRows(l),'لا توجد حركات تطابق هذا البحث.','txl')}`}
function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const l=document.createElement('a');l.href=url;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(url),4000)}
const csvCell=v=>{const x=String(v??'');return /[",\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x};
const csv=(head,rows)=>'\ufeff'+[head,...rows].map(r=>r.map(csvCell).join(',')).join('\r\n');
const stamp=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
C.transfer=u=>{
  const out=db.tx.filter(t=>t.uid===u.id&&t.type==='transfer').slice().reverse();
  return `<div class="stack"><div class="head"><div><h2>التحويل إلى عميل آخر</h2><p class="sub">فوري وبلا رسوم بين عملاء بركات.</p></div></div>
  ${inactiveNote(u)}
  <div class="card"><form data-form="transfer"><div class="f">
   <div class="grid g2"><label>رقم حساب المستفيد أو جواله<input name="to" required dir="ltr" placeholder="BR-1002xxxx أو +974 ..."></label>
   <label>المبلغ (${CUR})<input name="amt" type="number" min="1" step="0.01" required inputmode="decimal" dir="ltr"><span class="hint">المتاح ${money(avail(u))}</span></label></div>
   <label>البيان<input name="note" maxlength="80" placeholder="مثال: سداد إيجار"></label>
   <p class="err" id="err"></p>
   <div><button class="btn" ${u.status!=='active'?'disabled':''}>متابعة</button></div></div></form></div>
  <h3 style="font-size:18px">التحويلات السابقة</h3>${table(TXC,txRows(out),'لم تُجرِ أي تحويل بعد.','txl')}</div>`;
};
C.cash=u=>{
  const my=db.cash.filter(c=>c.uid===u.id).slice().reverse();
  const cs={pending:['قيد التحقق','warn'],done:['منفّذ','ok'],rejected:['مرفوض','bad']};
  return `<div class="stack"><div class="head"><div><h2>الإيداع والسحب</h2><p class="sub">تتحقق الإدارة من كل طلب قبل تنفيذه.</p></div></div>${inactiveNote(u)}
  <div class="grid g2">
   <div class="card"><h3>طلب إيداع</h3><form data-form="cash"><input type="hidden" name="kind" value="deposit"><div class="f">
    <label>المبلغ (${CUR})<input name="amt" type="number" min="10" step="0.01" required dir="ltr" inputmode="decimal"></label>
    <label>الطريقة<select name="method"><option>تحويل بنكي</option><option>إيداع نقدي في الفرع</option><option>شيك</option></select></label>
    <label>رقم المرجع<input name="ref" required maxlength="30" dir="ltr"></label>
    <button class="btn" ${u.status!=='active'?'disabled':''}>إرسال طلب الإيداع</button></div></form></div>
   <div class="card"><h3>طلب سحب</h3><form data-form="cash"><input type="hidden" name="kind" value="withdraw"><div class="f">
    <label>المبلغ (${CUR})<input name="amt" type="number" min="10" step="0.01" required dir="ltr" inputmode="decimal"><span class="hint">المتاح ${money(avail(u))}</span></label>
    <label>الطريقة<select name="method"><option>تحويل بنكي</option><option>نقداً من الفرع</option></select></label>
    <label>رقم الحساب المستلم (IBAN) أو ملاحظة<input name="ref" required maxlength="40" dir="ltr"></label>
    <button class="btn" ${u.status!=='active'?'disabled':''}>إرسال طلب السحب</button></div></form></div>
  </div>
  <h3 style="font-size:18px">طلباتي</h3>${table([{l:'التاريخ'},{l:'النوع'},{l:'الطريقة'},{l:'المرجع'},{l:'المبلغ',num:1},{l:'الحالة'}],
    my.map(c=>[fdt(c.at),c.kind==='deposit'?'إيداع':'سحب',esc(c.method),`<span dir="ltr">${esc(c.ref)}</span>`,money(c.amt),`<span class="tag ${cs[c.status][1]}">${cs[c.status][0]}</span>${c.note?`<br><small class="sub">${esc(c.note)}</small>`:''}`]),'لا توجد طلبات.')}</div>`;
};
C.finance=(u,arg)=>{
  if(arg==='new')return finNew(u);
  if(arg)return finView(u,db.reqs.find(r=>r.id===arg&&r.uid===u.id));
  const my=db.reqs.filter(r=>r.uid===u.id).slice().reverse();
  return `<div class="stack"><div class="head"><div><h2>التمويل</h2><p class="sub">عقودك وطلباتك وأقساطك.</p></div><a class="btn" href="#/c/finance/new">طلب تمويل جديد</a></div>
  ${table([{l:'الرقم'},{l:'المنتج'},{l:'الأصل أو الغرض'},{l:'المبلغ',num:1},{l:'المتبقي',num:1},{l:'الحالة'},{l:''}],
   my.map(r=>[`<span dir="ltr">${r.id}</span>`,PRODUCTS[r.product].name,esc(r.asset),money(r.amount),r.status==='active'?money(remaining(r)):'—',stTag(r.status),`<a class="btn sm ghost" href="#/c/finance/${r.id}">التفاصيل</a>`]),'لا توجد طلبات تمويل بعد.')}</div>`;
};
function finNew(u){
  return `<div class="stack"><div class="head"><div><h2>طلب تمويل جديد</h2><p class="sub">اختر الصيغة، وسيظهر لك تقدير العقد قبل الإرسال.</p></div><a href="#/c/finance">رجوع</a></div>${inactiveNote(u)}${finForm(u)}</div>`;
}
function finForm(u){
  const s=db.settings;
  return `<div class="grid g2" style="align-items:start">
  <div class="card"><form data-form="fin" id="finForm"><div class="f">
   <label>صيغة التمويل<select name="product" data-live>${Object.entries(PRODUCTS).map(([k,p])=>`<option value="${k}">${p.name}</option>`).join('')}</select></label>
   <p class="sub" id="pDesc"></p>
   <label><span id="lAmt">المبلغ</span> (${CUR})<input name="amount" type="number" min="500" step="1" required value="25000" dir="ltr" inputmode="decimal" data-live></label>
   <label id="wDown">الدفعة الأولى (حصتك في الأصل %)<input name="down" type="number" min="${s.minDown}" max="90" value="${Math.max(30,s.minDown)}" dir="ltr" data-live></label>
   <label id="wShare">حصة بركات من الربح %<input name="share" type="number" min="10" max="70" value="40" dir="ltr" data-live><span class="hint">ولك الباقي مقابل عملك</span></label>
   <label id="wTerm">المدة بالأشهر<input name="term" type="number" min="3" max="300" value="24" required dir="ltr" data-live></label>
   <label id="lAsset">الأصل<input name="asset" ${u?'required':''} maxlength="80"></label>
   <label>ملاحظات<textarea name="purpose" maxlength="300"></textarea></label>
   <p class="err" id="err"></p>
   ${u?`<button class="btn" ${u.status!=='active'?'disabled':''}>إرسال الطلب</button>`:`<a class="btn" href="${me()?'#/a/home':'#/register'}">افتح حساباً لتقديم الطلب</a>`}</div></form></div>
  <div class="card" id="finPrev"></div></div>`;
}
function previewFin(){
  const f=$('#finForm');if(!f)return;const s=db.settings;const p=f.product.value,P=PRODUCTS[p];
  const A=+f.amount.value||0,n=+f.term.value||1,dn=+f.down.value||0,sh=+f.share.value||0;
  $('#pDesc').textContent=P.desc;$('#lAsset').firstChild.textContent=P.asset;
  $('#lAmt').textContent=p==='musharaka'?'قيمة الأصل كاملاً':p==='mudaraba'?'رأس مال المضاربة':p==='qard'?'مبلغ القرض':'تكلفة الأصل';
  $('#wDown').hidden=p!=='musharaka';$('#wShare').hidden=p!=='mudaraba';$('#wTerm').hidden=false;
  f.amount.max=p==='qard'?s.qardMax:'';
  const fake={product:p,amount:A,term:n,down:dn,share:sh};makeOffer(fake);fake.status='pending';
  const sch=buildSchedule(fake,now());
  let rows='';
  if(p==='mudaraba')rows=`<div class="split"><span>رأس المال</span><b>${money(A)}</b></div><div class="split"><span>توزيع الربح</span><b>${100-sh}% لك · ${sh}% لبركات</b></div><div class="split"><span>مدة المضاربة</span><b>${n} شهراً</b></div><p class="sub" style="margin-top:8px">لا قسط ثابت ولا ربح مضمون. عند التسوية ترد رأس المال وحصة بركات من الربح الفعلي، وإن خسر المشروع بلا تقصير منك تحمّلت بركات الخسارة.</p>`;
  else{
    rows=`${p==='musharaka'?`<div class="split"><span>دفعتك الأولى (${dn}%)</span><b>${money(fake.downAmt)}</b></div>`:''}
    <div class="split"><span>${p==='qard'?'مبلغ القرض':p==='musharaka'?'حصة بركات':'التكلفة'}</span><b>${money(p==='musharaka'?A-fake.downAmt:A)}</b></div>
    <div class="split"><span>${p==='murabaha'?'ربح المرابحة':p==='qard'?'الزيادة':'إجمالي الأجرة'} ${fake.rate?`(${fake.rate}% سنوياً)`:''}</span><b>${money(fake.profit)}</b></div>
    <div class="split"><span>إجمالي ما تسدده</span><b>${money(fake.total)}</b></div>
    <div class="split"><span>${p==='musharaka'?'القسط الأول (يتناقص)':'القسط الشهري الثابت'}</span><b>${money(sch[0]?sch[0].amt:0)}</b></div>
    ${p==='musharaka'?`<div class="split"><span>القسط الأخير</span><b>${money(sch[sch.length-1]?sch[sch.length-1].amt:0)}</b></div>`:''}
    <p class="sub" style="margin-top:8px">${p==='qard'?`بلا أي زيادة. الحد الأعلى ${money(s.qardMax)}.`:'الثمن ثابت بعد العقد، ولا يزيد بالتأخير أو بتغير الأسعار.'}</p>`;
  }
  $('#finPrev').innerHTML=`<h3>تقدير العقد</h3>${rows}<div class="steps"><span class="on">1. الطلب</span><span>2. المراجعة${P.kind==='sale'||P.kind==='lease'?' والتملك':''}</span><span>3. العرض</span><span>4. قبولك</span></div>`;
}
function finView(u,r){
  if(!r)return `<div class="card empty">الطلب غير موجود. <a href="#/c/finance">رجوع</a></div>`;
  const P=PRODUCTS[r.product];const nd=nextDue(r);
  const terms=r.status==='pending'||r.status==='rejected'?'':contractBox(r);
  const paid=r.schedule?r.schedule.filter(s=>s.paid).length:0;
  return `<div class="stack"><div class="head"><div><h2>${P.name}</h2><p class="sub"><span dir="ltr">${r.id}</span> · ${esc(r.asset)} · ${stTag(r.status)}</p></div><a href="#/c/finance">رجوع</a></div>
  ${r.status==='pending'?`<div class="note"><b>طلبك قيد المراجعة.</b> قُدّم في ${fdate(r.created)}، وسيصلك عرض العقد هنا بعد اعتماده${P.kind==='sale'||P.kind==='lease'?' وتملك بركات للأصل':''}.</div>`:''}
  ${r.status==='rejected'?`<div class="note bad"><b>اعتذرت الإدارة عن الطلب.</b> ${esc(r.note||'')}</div>`:''}
  ${r.status==='offer'?`<div class="note warn"><b>العرض جاهز.</b> ${P.kind==='sale'||P.kind==='lease'?'تملّكت بركات الأصل، و':''}راجع الشروط أدناه ثم اقبل العقد أو اعتذر عنه.${r.note?' ملاحظة الإدارة: '+esc(r.note):''}</div>`:''}
  ${terms}
  ${r.status==='offer'?`<div class="row"><button class="btn" data-act="accept" data-id="${r.id}">أقبل العقد بشروطه</button><button class="btn bad" data-act="decline" data-id="${r.id}">أعتذر عن العرض</button></div>`:''}
  ${r.status==='active'&&nd?`<div class="card"><div class="row" style="justify-content:space-between"><div><h3 style="margin:0">القسط ${nd.n} من ${r.schedule.length}: ${money(nd.amt)}</h3><p class="sub">مستحق في ${fdate(nd.due)} ${isLate(nd)?'<span class="tag bad">متأخر</span>':''}</p></div><button class="btn" data-act="pay" data-id="${r.id}">سداد القسط</button></div>
    <div class="bar" style="margin-top:12px"><i style="width:${paid/r.schedule.length*100}%"></i></div><p class="sub" style="margin-top:4px">سُدد ${paid} من ${r.schedule.length} · المتبقي ${money(remaining(r))}</p></div>`:''}
  ${r.status==='active'&&r.product==='mudaraba'?`<div class="card"><h3>تسوية المضاربة</h3><p class="sub" style="margin-bottom:10px">أدخل صافي الربح الفعلي للمشروع (أو الخسارة بإشارة سالبة). تُرد رأس المال وحصة بركات ${r.bankShare}% من الربح، وتُخصم الخسارة من رأس المال.</p>
    <form data-form="settle"><input type="hidden" name="id" value="${r.id}"><div class="grid g2" style="align-items:end"><label>صافي الربح (${CUR})<input name="profit" type="number" step="0.01" required dir="ltr" value="0"></label><button class="btn">تسوية من الحساب الجاري</button></div></form></div>`:''}
  ${r.status==='completed'?`<div class="note"><b>اكتمل العقد.</b> ${r.product==='ijara'?'انتقلت إليك ملكية الأصل بعقد هبة مستقل.':r.product==='musharaka'?'أصبحت مالكاً للأصل كاملاً.':'شكراً لوفائك.'}</div>`:''}
  ${r.schedule&&r.schedule.length?`<h3 style="font-size:18px">جدول الأقساط</h3>${table([{l:'القسط'},{l:'تاريخ الاستحقاق'},...(r.product==='musharaka'?[{l:'شراء حصة',num:1},{l:'أجرة',num:1}]:[]),{l:'المبلغ',num:1},{l:'الحالة'}],
    r.schedule.map(s=>[s.n,fdate(s.due),...(r.product==='musharaka'?[money(s.buy),money(s.rent)]:[]),money(s.amt),s.paid?`<span class="tag ok">مسدد ${fdate(s.paidAt)}</span>`:isLate(s)?'<span class="tag bad">متأخر</span>':'<span class="tag mute">قادم</span>']))}`:''}
  </div>`;
}
function contractBox(r){
  const P=PRODUCTS[r.product];
  const lines={
    murabaha:`تبيع بركات إلى العميل «${esc(r.asset)}» المملوك له والمقبوض، بثمن إجمالي ${money(r.total)} (التكلفة ${money(r.amount)} وربح ${money(r.profit)})، يُسدد على ${r.term} قسطاً شهرياً. الثمن ثابت لا يزيد بالتأخير.`,
    ijara:`تؤجر بركات إلى العميل «${esc(r.asset)}» مدة ${r.term} شهراً بأجرة إجمالية ${money(r.total)}. صيانة الأصل الأساسية وتأمينه التكافلي على المالك، وتنتقل الملكية بالهبة بعد آخر قسط بعقد مستقل.`,
    musharaka:`يشترك العميل وبركات في «${esc(r.asset)}» بقيمة ${money(r.amount)}، حصة العميل ${r.down}% (${money(r.downAmt)} تُخصم عند القبول). يشتري العميل حصة بركات على ${r.term} شهراً، ويدفع أجرة الحصة المتبقية بمعدل ${r.rate}% سنوياً. إجمالي المدفوع بعد الدفعة الأولى ${money(r.total)}.`,
    mudaraba:`تدفع بركات رأس مال ${money(r.amount)} للعميل مضارباً في «${esc(r.asset)}» مدة ${r.term} شهراً. الربح ${100-r.bankShare}% للعميل و${r.bankShare}% لبركات، والخسارة على رأس المال ما لم يثبت تعدٍّ أو تقصير.`,
    qard:`تُقرض بركات العميل ${money(r.amount)} قرضاً حسناً بلا أي زيادة، يُرد على ${r.term} قسطاً شهرياً متساوياً.`
  };
  return `<div class="card"><h3>شروط العقد</h3><p>${lines[r.product]}</p>${r.offered?`<p class="sub" style="margin-top:8px">صدر العرض في ${fdate(r.offered)}${r.accepted?` · قبله العميل في ${fdate(r.accepted)}`:''}</p>`:''}</div>`;
}
C.invest=u=>{
  const prof=db.tx.filter(t=>t.uid===u.id&&t.type==='profit').slice().reverse();
  const pool=db.poolTotal!=null?db.poolTotal:db.users.reduce((a,x)=>a+x.bal.invest,0);
  return `<div class="stack"><div class="head"><div><h2>الاستثمار بالمضاربة</h2><p class="sub">وعاء استثماري مشترك يدار في أنشطة حلال، ويوزع ربحه الفعلي دورياً.</p></div><a class="btn" href="#/c/accounts">إيداع في الاستثمار</a></div>
  <div class="grid g3">
   <div class="card kpi"><span>رصيدك الاستثماري</span><b>${money(u.bal.invest)}</b></div>
   <div class="card kpi"><span>حصتك من الوعاء</span><b>${pool?(u.bal.invest/pool*100).toFixed(2):'0.00'}%</b><small>حجم الوعاء ${money(pool)}</small></div>
   <div class="card kpi"><span>إجمالي أرباحك المحققة</span><b>${money(prof.reduce((a,t)=>a+t.amt,0))}</b></div>
  </div>
  <div class="note"><b>كيف يُحسب ربحك؟</b> يُخصم من الربح الفعلي للوعاء ${db.settings.mudaribShare}% حصة بركات مقابل الإدارة، ويوزع الباقي على المودعين بنسبة أرصدتهم. لا يُعد أي ربح مسبقاً، وإن وقعت خسارة بلا تقصير نقصت الأرصدة بنسبتها ولم يأخذ المضارب شيئاً.</div>
  <h3 style="font-size:18px">سجل التوزيعات</h3>${table([{l:'التاريخ'},{l:'البيان'},{l:'المبلغ',num:1},{l:'الرصيد بعدها',num:1}],prof.map(t=>[fdate(t.at),esc(t.note),amtCell(t.amt),money(t.bal)]),'لم تُوزع أرباح على حسابك بعد.')}</div>`;
};
C.zakat=u=>{
  const s=db.settings,nisab=85*s.goldPrice;
  const gifts=db.tx.filter(t=>t.uid===u.id&&['zakat','sadaqa','waqf'].includes(t.type)).slice().reverse();
  return `<div class="stack"><div class="head"><div><h2>الزكاة والصدقة والوقف</h2><p class="sub">سعر غرام الذهب عيار 24 اليوم ${money(s.goldPrice)} · النصاب ${money(nisab)}</p></div></div>
  <div class="grid g2" style="align-items:start">
  ${zakatCard(u)}
  <div class="card"><h3>صدقة أو وقف</h3><form data-form="give"><div class="f">
   <label>النوع<select name="kind"><option value="sadaqa">صدقة جارية في صندوق الصدقات</option><option value="waqf">مساهمة في الوقف النقدي (يُستثمر أصله ويُصرف ريعه)</option></select></label>
   <label>المبلغ (${CUR})<input name="amt" type="number" min="1" step="0.01" required dir="ltr"></label>
   <button class="btn" ${u.status!=='active'?'disabled':''}>تبرّع</button></div></form>
   <p class="sub" style="margin-top:12px">تُصرف الزكاة على المصارف الثمانية المذكورة في سورة التوبة، وتُنشر تقارير الصرف للمساهمين.</p></div>
  </div>
  <h3 style="font-size:18px">سجل عطائك</h3>${table([{l:'التاريخ'},{l:'البيان'},{l:'المبلغ',num:1}],gifts.map(t=>[fdate(t.at),esc(t.note),money(-t.amt)]),'لا توجد مدفوعات زكاة أو صدقات بعد.')}</div>`;
};
function zakatCard(u){
  return `<div class="card"><h3>حاسبة الزكاة</h3><p class="sub" style="margin-bottom:8px">النصاب اليوم ${money(85*db.settings.goldPrice)} (85 غراماً من الذهب عيار 24 بسعر ${money(db.settings.goldPrice)} للغرام).</p><form id="zk" data-form="zakatpay" data-bal="${u?r2(u.bal.current+u.bal.invest):0}"><div class="f">
   ${u?`<div class="split"><span>الحساب الجاري</span><b>${money(u.bal.current)}</b></div><div class="split"><span>حساب الاستثمار</span><b>${money(u.bal.invest)}</b></div>`:''}
   <label>${u?'نقد وأرصدة أخرى':'النقد والأرصدة البنكية'} (${CUR})<input name="cash" type="number" min="0" value="0" dir="ltr" data-zk></label>
   <label>ذهب وفضة للادخار (بالقيمة السوقية)<input name="gold" type="number" min="0" value="0" dir="ltr" data-zk></label>
   <label>عروض تجارة (بضاعة معدة للبيع بسعر اليوم)<input name="trade" type="number" min="0" value="0" dir="ltr" data-zk></label>
   <label>ديون مرجوّة لك على الآخرين<input name="recv" type="number" min="0" value="0" dir="ltr" data-zk></label>
   <label>ديون حالّة عليك تُخصم<input name="debt" type="number" min="0" value="0" dir="ltr" data-zk></label>
   <label style="display:flex;gap:8px;align-items:center;color:var(--ink)"><input type="checkbox" name="hawl" checked style="width:auto;min-height:0" data-zk> حال على المال حول قمري كامل</label>
   <div id="zkOut"></div>
   ${u?`<button class="btn" id="zkBtn" ${u.status!=='active'?'disabled':''}>إخراج الزكاة وتوكيل بركات بتوزيعها</button>`:`<a class="btn ghost" href="${me()?'#/a/home':'#/register'}">افتح حساباً لإخراج زكاتك من رصيدك</a>`}
  </div></form></div>`;
}
function calcZakat(){
  const f=$('#zk');if(!f)return;const u=me(),s=db.settings,nisab=85*s.goldPrice;
  const v=n=>+f[n].value||0;
  const base=r2((+f.dataset.bal||0)+v('cash')+v('gold')+v('trade')+v('recv')-v('debt'));
  const due=f.hawl.checked&&base>=nisab?r2(base*0.025):0;
  f.dataset.due=due;
  $('#zkOut').innerHTML=`<div class="split"><span>الوعاء الزكوي</span><b>${money(base)}</b></div><div class="split"><span>${base>=nisab?'بلغ النصاب':'لم يبلغ النصاب'}${f.hawl.checked?'':' · لم يحل الحول'}</span><b style="font-size:20px">${money(due)}</b></div>`;
  if($('#zkBtn'))$('#zkBtn').disabled=!due||!u||u.status!=='active';
}
C.takaful=u=>{
  const mine=db.policies.filter(x=>x.uid===u.id).slice().reverse();const cov=mine.filter(covered);
  const cl=db.claims.filter(x=>x.uid===u.id).slice().reverse();
  return `<div class="stack"><div class="head"><div><h2>التكافل</h2><p class="sub">اشتراكك تبرع لصندوق المشتركين، وتعويضك من الصندوق نفسه. أجر وكالة بركات ${db.settings.takafulFee}% من الاشتراك.</p></div></div>${inactiveNote(u)}
  <div class="grid g4">${Object.entries(PLANS).map(([k,p])=>{const has=mine.some(x=>x.plan===k&&x.status==='active');return `<div class="card prod"><span class="k">${p.k}</span><h4>${p.name}</h4><p>${p.desc}</p><div class="split" style="margin-top:8px"><span>شهرياً</span><b>${money(p.fee)}</b></div><div class="split"><span>أقصى تعويض</span><b>${money(p.cap)}</b></div>
   <div style="margin-top:10px">${has?'<span class="tag ok">مشترك</span>':`<button class="btn sm" data-act="tkjoin" data-id="${k}" ${u.status!=='active'?'disabled':''}>اشترك الآن</button>`}</div></div>`}).join('')}</div>
  <h3 style="font-size:18px">اشتراكاتي</h3>${table([{l:'الرقم'},{l:'البرنامج'},{l:'الاشتراك الشهري',num:1},{l:'مغطى حتى'},{l:'الحالة'},{l:''}],
   mine.map(x=>[`<span dir="ltr">${x.id}</span>`,PLANS[x.plan].name,money(PLANS[x.plan].fee),fdate(x.paidThrough),x.status!=='active'?'<span class="tag mute">ملغى</span>':covered(x)?'<span class="tag ok">مغطى</span>':'<span class="tag warn">بانتظار السداد</span>',
    x.status==='active'?`<span class="row"><button class="btn sm" data-act="tkpay" data-id="${x.id}">سداد شهر</button><button class="btn sm bad" data-act="tkcancel" data-id="${x.id}">إلغاء</button></span>`:'']),'لا توجد اشتراكات بعد. اختر برنامجاً أعلاه.')}
  <div class="card"><h3>تقديم مطالبة تعويض</h3>${cov.length?`<form data-form="claim"><div class="f"><div class="grid g2">
   <label>الاشتراك<select name="pid">${cov.map(x=>`<option value="${x.id}">${PLANS[x.plan].name} · ${x.id}</option>`).join('')}</select></label>
   <label>المبلغ المطلوب (${CUR})<input name="amt" type="number" min="50" step="0.01" required dir="ltr"></label></div>
   <label>وصف الضرر والمستندات المتوفرة<textarea name="desc" required minlength="10" maxlength="400"></textarea></label>
   <p class="err" id="err"></p><div><button class="btn" ${u.status!=='active'?'disabled':''}>إرسال المطالبة</button></div></div></form>`:'<p class="sub">تحتاج اشتراكاً مغطى (مسدد للشهر الحالي) لتقديم مطالبة.</p>'}</div>
  <h3 style="font-size:18px">مطالباتي</h3>${table([{l:'الرقم'},{l:'التاريخ'},{l:'البرنامج'},{l:'الوصف'},{l:'المبلغ',num:1},{l:'الحالة'}],
   cl.map(x=>{const pl=db.policies.find(y=>y.id===x.pid);return [`<span dir="ltr">${x.id}</span>`,fdate(x.at),pl?PLANS[pl.plan].name:'—',esc(x.desc),money(x.amt),`<span class="tag ${CLST[x.status][1]}">${CLST[x.status][0]}</span>${x.note?`<br><small class="sub">${esc(x.note)}</small>`:''}`]}),'لا توجد مطالبات.')}</div>`;
};
C.help=u=>{
  const mine=db.msgs.filter(m=>m.uid===u.id).slice().reverse();let ch=false;mine.forEach(m=>{if(m.status==='replied'&&!m.seen){m.seen=true;ch=true}});if(ch)markSeen();
  return `<div class="stack"><div class="head"><div><h2>المساعدة والدعم</h2><p class="sub">أرسل استفسارك أو شكواك، وتجد رد فريقنا هنا.</p></div><a href="#/p/faq">الأسئلة الشائعة</a></div>
  <div class="card"><form data-form="contact"><input type="hidden" name="name" value="${esc(u.name)}"><input type="hidden" name="email" value="${esc(u.email)}"><input type="hidden" name="phone" value="${u.phone}"><div class="f">
   <label>الموضوع<select name="subject"><option>استفسار عام</option><option>التمويل</option><option>الاستثمار</option><option>التكافل</option><option>الإيداع والسحب</option><option>الزكاة والصدقات</option><option>شكوى</option><option>اقتراح</option></select></label>
   <label>الرسالة<textarea name="body" required minlength="10" maxlength="1000"></textarea></label>
   <p class="err" id="err"></p><div><button class="btn">إرسال</button></div></div></form></div>
  <h3 style="font-size:18px">رسائلي</h3>${mine.length?mine.map(m=>`<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(m.subject)} <span class="sub" dir="ltr">${m.id}</span></b><span class="tag ${MSGST[m.status][1]}">${MSGST[m.status][0]}</span></div>
   <p class="sub">${fdt(m.at)}</p><p style="margin-top:6px">${esc(m.body)}</p>${m.reply?`<div class="note" style="margin-top:10px"><b>رد بركات (${fdt(m.repliedAt)}):</b> ${esc(m.reply)}</div>`:''}</div>`).join(''):'<div class="card empty">لا توجد رسائل بعد.</div>'}</div>`;
};
C.notes=u=>{const l=db.notes.filter(n=>n.to===u.id).slice().reverse();
  const html=`<div class="stack"><div class="head"><div><h2>الإشعارات</h2><p class="sub">كل ما يخص حسابك من قرارات وتحديثات.</p></div>${l.length?'<button class="btn sm ghost" data-act="notesClear">حذف المقروءة</button>':''}</div>
  ${due(u)}
  <div class="stack notes">${l.length?l.map(n=>`<a class="card ${n.seen?'':'unseen'}" href="${esc(n.link||'#/c/home')}" style="text-decoration:none;color:inherit"><span class="dot" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/></svg></span><span><b style="font-weight:${n.seen?500:700}">${esc(n.text)}</b><br><small class="sub">${fdt(n.at)}</small></span></a>`).join(''):'<div class="card empty">لا توجد إشعارات بعد.</div>'}</div></div>`;
  l.forEach(n=>n.seen=true);markSeen();return html};
function due(u){const out=[];db.reqs.filter(r=>r.uid===u.id&&r.status==='active').forEach(r=>{const s=nextDue(r);if(!s)return;const days=Math.ceil((new Date(s.due)-Date.now())/864e5);
  if(days<=7)out.push(`<div class="note ${days<0?'bad':'warn'}"><b>${days<0?'قسط متأخر':'قسط قريب'}:</b> ${money(s.amt)} على ${PRODUCTS[r.product].name} ${days<0?'كان مستحقاً في':'يستحق في'} ${fdate(s.due)}. <a href="#/c/finance/${r.id}">سدّد الآن</a></div>`)});return out.join('')}
C.profile=u=>`<div class="stack"><div class="head"><h2>ملفي</h2></div>
  <div class="grid g2" style="align-items:start"><div class="card">
   <div class="split"><span>الاسم</span><b style="direction:rtl">${esc(u.name)}</b></div>
   <div class="split"><span>رقم الحساب</span><b>${u.acct}</b></div>
   <div class="split"><span>الجوال</span><b>${fphone(u.phone)}</b></div>
   <div class="split"><span>البريد</span><b>${esc(u.email)}</b></div>
   <div class="split"><span>الهوية</span><b>${esc(u.nid)}</b></div>
   <div class="split"><span>تاريخ الانضمام</span><b>${fdate(u.created)}</b></div>
   <div class="split"><span>الحالة</span>${uTag(u.status)}</div></div>
  <div class="card"><h3>تغيير كلمة المرور</h3><form data-form="pw"><div class="f">
   <label>كلمة المرور الحالية<input name="old" type="password" required dir="ltr" autocomplete="current-password"></label>
   <label>الجديدة<input name="pw" type="password" minlength="8" required dir="ltr" autocomplete="new-password"></label>
   <button class="btn">حفظ</button></div></form></div></div></div>`;

/* ---------- admin ---------- */
const A={};
A.home=()=>{
  const cust=db.users.filter(u=>u.role==='customer');
  const act=db.reqs.filter(r=>r.status==='active');
  const late=act.filter(r=>isLate(nextDue(r)));
  const pend=db.reqs.filter(r=>r.status==='pending'),pc=db.cash.filter(c=>c.status==='pending'),pu=cust.filter(u=>u.status==='pending');
  const byP=Object.keys(PRODUCTS).map(k=>[k,act.filter(r=>r.product===k).reduce((a,r)=>a+remaining(r),0)]);
  const mx=Math.max(1,...byP.map(x=>x[1]));
  return `<div class="stack"><div class="head"><div><h2>لوحة التحكم</h2><p class="sub">${fdate(now())}</p></div></div>
  <div class="grid g4">
   <div class="card kpi"><span>العملاء</span><b>${cust.length}</b><small>${cust.filter(u=>u.status==='active').length} مفعّل · ${pu.length} بانتظار التحقق</small></div>
   <div class="card kpi"><span>الحسابات الجارية</span><b>${money(cust.reduce((a,u)=>a+u.bal.current,0))}</b><small>مضمونة (قرض حسن)</small></div>
   <div class="card kpi"><span>وعاء المضاربة</span><b>${money(cust.reduce((a,u)=>a+u.bal.invest,0))}</b><small>غير مضمون، يشارك في الربح</small></div>
   <div class="card kpi"><span>التمويل القائم</span><b>${money(act.reduce((a,r)=>a+remaining(r),0))}</b><small>${act.length} عقد · ${late.length} متأخر</small></div>
  </div>
  <div class="grid g3">
   <a class="card kpi" href="#/a/requests" style="text-decoration:none;color:inherit"><span>طلبات تمويل للمراجعة</span><b>${pend.length}</b></a>
   <a class="card kpi" href="#/a/cash" style="text-decoration:none;color:inherit"><span>إيداعات وسحوبات للتحقق</span><b>${pc.length}</b></a>
   <a class="card kpi" href="#/a/users" style="text-decoration:none;color:inherit"><span>عملاء بانتظار التحقق</span><b>${pu.length}</b></a>
   <a class="card kpi" href="#/a/takaful" style="text-decoration:none;color:inherit"><span>مطالبات تكافل للمراجعة</span><b>${db.claims.filter(c=>c.status==='pending').length}</b></a>
   <a class="card kpi" href="#/a/messages" style="text-decoration:none;color:inherit"><span>رسائل جديدة</span><b>${db.msgs.filter(m=>m.status==='new').length}</b></a>
   <a class="card kpi" href="#/a/funds" style="text-decoration:none;color:inherit"><span>صندوق التكافل</span><b>${money(db.funds.takaful)}</b></a>
  </div>
  <div class="grid g2" style="align-items:start">
   <div class="card"><h3>التمويل القائم حسب الصيغة</h3>${byP.map(([k,v])=>`<div style="margin-top:10px"><div class="row" style="justify-content:space-between;font-size:14px"><span>${PRODUCTS[k].name}</span><b style="direction:ltr">${money(v)}</b></div><div class="bar"><i style="width:${v/mx*100}%"></i></div></div>`).join('')}</div>
   <div class="card"><h3>الصناديق</h3>${Object.entries(FUNDS).map(([k,n])=>`<div class="split"><span>${n}</span><b>${money(db.funds[k])}</b></div>`).join('')}<div class="split"><span>صندوق القرض الحسن (المتاح)</span><b>${money(db.funds.qard)}</b></div></div>
  </div>
  <h3 style="font-size:18px">أحدث العمليات</h3>${table([{l:'الوقت'},{l:'العملية'},{l:'المنفّذ'}],db.log.slice(0,8).map(l=>[fdt(l.at),esc(l.what),esc(l.who)]))}</div>`;
};
A.requests=(u,arg)=>{
  if(arg){const r=db.reqs.find(x=>x.id===arg);if(!r)return '<div class="card empty">غير موجود</div>';const c=userById(r.uid);
    return `<div class="stack"><div class="head"><div><h2>${PRODUCTS[r.product].name}</h2><p class="sub"><span dir="ltr">${r.id}</span> · ${stTag(r.status)}</p></div><a href="#/a/requests">رجوع</a></div>
    <div class="grid g2" style="align-items:start"><div class="card"><h3>الطلب</h3>
     <div class="split"><span>العميل</span><b style="direction:rtl"><a href="#/a/users/${c.id}">${esc(c.name)}</a></b></div>
     <div class="split"><span>الجوال</span><b>${fphone(c.phone)}</b></div>
     <div class="split"><span>المبلغ</span><b>${money(r.amount)}</b></div><div class="split"><span>المدة</span><b>${r.term} شهراً</b></div>
     ${r.product==='musharaka'?`<div class="split"><span>حصة العميل</span><b>${r.down}%</b></div>`:''}${r.product==='mudaraba'?`<div class="split"><span>حصة بركات من الربح</span><b>${r.share}%</b></div>`:''}
     <div class="split"><span>الأصل/الغرض</span><b style="direction:rtl">${esc(r.asset)}</b></div><div class="split"><span>ملاحظات</span><b style="direction:rtl">${esc(r.purpose)||'—'}</b></div>
     <div class="split"><span>تاريخ الطلب</span><b>${fdate(r.created)}</b></div>
     <div class="split"><span>رصيد العميل الجاري</span><b>${money(c.bal.current)}</b></div>
     <div class="split"><span>تمويل قائم على العميل</span><b>${money(db.reqs.filter(x=>x.uid===c.id&&x.status==='active').reduce((a,x)=>a+remaining(x),0))}</b></div></div>
    <div class="stack">${r.status!=='pending'?contractBox(r):''}
    ${r.status==='pending'?`<div class="card"><h3>القرار</h3><form data-form="decide"><input type="hidden" name="id" value="${r.id}"><div class="f">
     ${PRODUCTS[r.product].kind==='sale'||PRODUCTS[r.product].kind==='lease'?'<label style="display:flex;gap:8px;align-items:flex-start;color:var(--ink)"><input type="checkbox" name="own" required style="width:auto;min-height:0;margin-top:6px">أؤكد أن بركات اشترت الأصل وتملكته وقبضته قبل عرضه على العميل</label>':''}
     <label>ملاحظة للعميل<textarea name="note" maxlength="300"></textarea></label>
     <div class="row"><button class="btn" name="d" value="approve">اعتماد وإصدار العرض</button><button class="btn bad" name="d" value="reject" formnovalidate>اعتذار</button></div></div></form></div>`:''}
    ${r.schedule&&r.schedule.length?`<div class="card"><h3>السداد</h3><div class="split"><span>المسدد</span><b>${r.schedule.filter(s=>s.paid).length} من ${r.schedule.length}</b></div><div class="split"><span>المتبقي</span><b>${money(remaining(r))}</b></div><div class="split"><span>القسط القادم</span><b>${nextDue(r)?fdate(nextDue(r).due):'—'}</b></div></div>`:''}</div></div></div>`;}
  const f=(window._rf||'pending');
  const list=db.reqs.filter(r=>f==='all'||r.status===f).slice().reverse();
  return `<div class="stack"><div class="head"><div><h2>طلبات التمويل</h2></div>
   <div class="row">${[['pending','للمراجعة'],['offer','عروض معلقة'],['active','سارية'],['completed','مكتملة'],['all','الكل']].map(([k,l])=>`<button class="btn sm ${f===k?'':'ghost'}" data-act="rf" data-id="${k}">${l}</button>`).join('')}</div></div>
  ${table([{l:'الرقم'},{l:'العميل'},{l:'الصيغة'},{l:'المبلغ',num:1},{l:'المدة'},{l:'التاريخ'},{l:'الحالة'},{l:''}],
   list.map(r=>[`<span dir="ltr">${r.id}</span>`,esc(userById(r.uid).name),PRODUCTS[r.product].name,money(r.amount),`${r.term} شهراً`,fdate(r.created),stTag(r.status)+(r.status==='active'&&isLate(nextDue(r))?' <span class="tag bad">متأخر</span>':''),`<a class="btn sm ${r.status==='pending'?'':'ghost'}" href="#/a/requests/${r.id}">${r.status==='pending'?'مراجعة':'عرض'}</a>`]),'لا توجد طلبات في هذا التصنيف.')}</div>`;
};
A.cash=()=>{
  const list=db.cash.slice().reverse();
  const cs={pending:['قيد التحقق','warn'],done:['منفّذ','ok'],rejected:['مرفوض','bad']};
  return `<div class="stack"><div class="head"><div><h2>الإيداع والسحب</h2><p class="sub">تحقق من المرجع قبل التنفيذ.</p></div></div>
  ${table([{l:'التاريخ'},{l:'العميل'},{l:'النوع'},{l:'الطريقة'},{l:'المرجع'},{l:'المبلغ',num:1},{l:'الحالة'}],
   list.map(c=>{const u=userById(c.uid);return [fdt(c.at),esc(u.name),c.kind==='deposit'?'إيداع':'سحب',esc(c.method),`<span dir="ltr">${esc(c.ref)}</span>`,money(c.amt),
    c.status==='pending'?`<span class="row"><button class="btn sm" data-act="cashok" data-id="${c.id}">تنفيذ</button><button class="btn sm bad" data-act="cashno" data-id="${c.id}">رفض</button></span>`:`<span class="tag ${cs[c.status][1]}">${cs[c.status][0]}</span>`]}),'لا توجد طلبات.')}</div>`;
};
A.users=(u,arg)=>{
  if(arg){const c=userById(arg);if(!c)return '<div class="card empty">غير موجود</div>';
    const tx=db.tx.filter(t=>t.uid===c.id).slice().reverse();
    return `<div class="stack"><div class="head"><div><h2>${esc(c.name)}</h2><p class="sub"><span dir="ltr">${c.acct}</span> · ${uTag(c.status)}</p></div><a href="#/a/users">رجوع</a></div>
    <div class="grid g3"><div class="card"><div class="split"><span>الجوال</span><b>${fphone(c.phone)}</b></div><div class="split"><span>البريد</span><b>${esc(c.email)}</b></div><div class="split"><span>الهوية</span><b>${esc(c.nid)}</b></div><div class="split"><span>الانضمام</span><b>${fdate(c.created)}</b></div></div>
     <div class="card kpi"><span>الجاري</span><b>${money(c.bal.current)}</b><span style="margin-top:8px">الاستثمار</span><b>${money(c.bal.invest)}</b></div>
     <div class="card"><h3>الإجراءات</h3><div class="row">${c.status!=='active'?`<button class="btn sm" data-act="ustat" data-id="${c.id}" data-v="active">${c.status==='pending'?'اعتماد الهوية وتفعيل الحساب':'إعادة التفعيل'}</button>`:`<button class="btn sm bad" data-act="ustat" data-id="${c.id}" data-v="frozen">إيقاف الحساب</button>`}<button class="btn sm ghost" data-act="resetpw" data-id="${c.id}">إعادة تعيين كلمة المرور</button></div></div></div>
    <h3 style="font-size:18px">عقود العميل</h3>${table([{l:'الرقم'},{l:'الصيغة'},{l:'المبلغ',num:1},{l:'الحالة'},{l:''}],db.reqs.filter(r=>r.uid===c.id).map(r=>[`<span dir="ltr">${r.id}</span>`,PRODUCTS[r.product].name,money(r.amount),stTag(r.status),`<a class="btn sm ghost" href="#/a/requests/${r.id}">عرض</a>`]),'لا توجد عقود.')}
    <h3 style="font-size:18px">كشف الحساب</h3>${table(TXC,txRows(tx),'لا توجد حركات.')}</div>`;}
  const q=(window._uq||'').trim();
  const list=db.users.filter(x=>x.role==='customer'&&(!q||(x.name+x.email+x.phone+x.acct+x.nid).toLowerCase().includes(q.toLowerCase())||x.phone.includes(phoneDigits(q)||'~')));
  return `<div class="stack"><div class="head"><div><h2>العملاء</h2><p class="sub">${list.length} عميل</p></div>
   <form data-form="usearch" class="row"><input name="q" value="${esc(q)}" placeholder="بحث بالاسم أو الجوال أو رقم الحساب" style="width:min(320px,70vw)"><button class="btn sm ghost">بحث</button></form></div>
  ${table([{l:'الاسم'},{l:'رقم الحساب'},{l:'الجوال'},{l:'الجاري',num:1},{l:'الاستثمار',num:1},{l:'الحالة'},{l:''}],
   list.map(c=>[esc(c.name),`<span dir="ltr">${c.acct}</span>`,`<span dir="ltr">${fphone(c.phone)}</span>`,money(c.bal.current),money(c.bal.invest),uTag(c.status),`<a class="btn sm ${c.status==='pending'?'':'ghost'}" href="#/a/users/${c.id}">${c.status==='pending'?'تحقق':'فتح'}</a>`]),'لا نتائج.')}</div>`;
};
A.profit=()=>{
  const inv=db.users.filter(u=>u.role==='customer'&&u.bal.invest>0);const pool=r2(inv.reduce((a,u)=>a+u.bal.invest,0));
  return `<div class="stack"><div class="head"><div><h2>توزيع أرباح المضاربة</h2><p class="sub">حجم الوعاء ${money(pool)} · ${inv.length} مودع · حصة المضارب ${db.settings.mudaribShare}%</p></div></div>
  <div class="card"><form data-form="dist"><div class="grid g3" style="align-items:end">
   <label>الفترة<input name="period" required placeholder="مثال: الربع الرابع 2026"></label>
   <label>صافي ربح الوعاء الفعلي (${CUR})<input name="gross" type="number" step="0.01" required dir="ltr"><span class="hint">أدخل الخسارة بإشارة سالبة</span></label>
   <button class="btn" ${pool?'':'disabled'}>معاينة التوزيع</button></div></form></div>
  <div class="note"><b>القاعدة:</b> عند الربح تأخذ بركات ${db.settings.mudaribShare}% مضارباً ويوزع الباقي على المودعين بنسبة أرصدتهم. عند الخسارة بلا تقصير تنقص أرصدة المودعين بنسبتها ولا يأخذ المضارب شيئاً.</div>
  <h3 style="font-size:18px">التوزيعات السابقة</h3>${table([{l:'التاريخ'},{l:'الفترة'},{l:'الوعاء',num:1},{l:'صافي الربح',num:1},{l:'حصة المضارب',num:1},{l:'للمودعين',num:1}],
   db.dist.slice().reverse().map(d=>[fdate(d.at),esc(d.period),money(d.pool),amtCell(d.gross),money(d.mud),amtCell(d.net)]),'لا توجد توزيعات.')}</div>`;
};
A.funds=()=>{
  const dist=db.fundOut||[];
  return `<div class="stack"><div class="head"><div><h2>الزكاة والصناديق</h2><p class="sub">صرف موثّق لكل ريال.</p></div></div>
  <div class="grid g4">${Object.entries(FUNDS).map(([k,n])=>`<div class="card kpi"><span>${n}</span><b>${money(db.funds[k])}</b></div>`).join('')}<div class="card kpi"><span>صندوق القرض الحسن</span><b>${money(db.funds.qard)}</b></div></div>
  <div class="card"><h3>تسجيل صرف</h3><form data-form="fundout"><div class="grid g4" style="align-items:end">
   <label>الصندوق<select name="fund">${Object.entries(FUNDS).map(([k,n])=>`<option value="${k}">${n}</option>`).join('')}</select></label>
   <label>المصرف<select name="to">${MASARIF.map(m=>`<option>${m}</option>`).join('')}<option>مشروع وقفي</option><option>إغاثة عامة</option></select></label>
   <label>المبلغ (${CUR})<input name="amt" type="number" min="1" step="0.01" required dir="ltr"></label>
   <label>المستفيد أو البيان<input name="note" required maxlength="80"></label></div><div style="margin-top:12px"><button class="btn">تسجيل الصرف</button></div></form></div>
  <h3 style="font-size:18px">سجل الصرف</h3>${table([{l:'التاريخ'},{l:'الصندوق'},{l:'المصرف'},{l:'البيان'},{l:'المبلغ',num:1}],dist.slice().reverse().map(d=>[fdate(d.at),FUNDS[d.fund],esc(d.to),esc(d.note),money(d.amt)]),'لم يُسجل صرف بعد.')}</div>`;
};
A.takaful=()=>{
  const act=db.policies.filter(covered);const pend=db.claims.filter(c=>c.status==='pending');
  return `<div class="stack"><div class="head"><div><h2>التكافل</h2><p class="sub">صندوق المشتركين منفصل عن أموال بركات، وأجر الوكالة ${db.settings.takafulFee}% من الاشتراكات.</p></div></div>
  <div class="grid g4"><div class="card kpi"><span>صندوق المشتركين</span><b>${money(db.funds.takaful)}</b></div><div class="card kpi"><span>أجر الوكالة المحصّل</span><b>${money(db.funds.takafulFee)}</b></div>
   <div class="card kpi"><span>اشتراكات مغطاة</span><b>${act.length}</b><small>من ${db.policies.filter(x=>x.status==='active').length} اشتراك قائم</small></div><div class="card kpi"><span>مطالبات للمراجعة</span><b>${pend.length}</b></div></div>
  <h3 style="font-size:18px">المطالبات</h3>${table([{l:'الرقم'},{l:'العميل'},{l:'البرنامج'},{l:'الوصف'},{l:'المبلغ',num:1},{l:'التاريخ'},{l:'الحالة'}],
   db.claims.slice().reverse().map(c=>{const pl=db.policies.find(y=>y.id===c.pid);return [`<span dir="ltr">${c.id}</span>`,esc(userById(c.uid).name),pl?PLANS[pl.plan].name:'—',esc(c.desc),money(c.amt),fdate(c.at),
    c.status==='pending'?`<span class="row"><button class="btn sm" data-act="claimok" data-id="${c.id}">صرف التعويض</button><button class="btn sm bad" data-act="claimno" data-id="${c.id}">رفض</button></span>`:`<span class="tag ${CLST[c.status][1]}">${CLST[c.status][0]}</span>`]}),'لا توجد مطالبات.')}
  <h3 style="font-size:18px">الاشتراكات</h3>${table([{l:'الرقم'},{l:'العميل'},{l:'البرنامج'},{l:'منذ'},{l:'مغطى حتى'},{l:'الحالة'}],
   db.policies.slice().reverse().map(x=>[`<span dir="ltr">${x.id}</span>`,esc(userById(x.uid).name),PLANS[x.plan].name,fdate(x.start),fdate(x.paidThrough),x.status!=='active'?'<span class="tag mute">ملغى</span>':covered(x)?'<span class="tag ok">مغطى</span>':'<span class="tag warn">متأخر السداد</span>']),'لا توجد اشتراكات.')}</div>`;
};
A.messages=(u,arg)=>{
  if(arg){const m=db.msgs.find(x=>x.id===arg);if(!m)return '<div class="card empty">غير موجودة</div>';
    return `<div class="stack"><div class="head"><div><h2>${esc(m.subject)}</h2><p class="sub"><span dir="ltr">${m.id}</span> · ${fdt(m.at)} · <span class="tag ${MSGST[m.status][1]}">${MSGST[m.status][0]}</span></p></div><a href="#/a/messages">رجوع</a></div>
    <div class="grid g2" style="align-items:start"><div class="card"><div class="split"><span>المرسل</span><b style="direction:rtl">${m.uid?`<a href="#/a/users/${m.uid}">${esc(m.name)}</a>`:esc(m.name)}</b></div><div class="split"><span>الجوال</span><b>${fphone(m.phone)}</b></div><div class="split"><span>البريد</span><b>${esc(m.email)}</b></div><div class="split"><span>النوع</span><b style="direction:rtl">${m.uid?'عميل':'زائر'}</b></div><p style="margin-top:12px">${esc(m.body)}</p></div>
    <div class="card"><h3>الرد</h3>${m.reply?`<div class="note" style="margin-bottom:10px">${esc(m.reply)}<br><small class="sub">${fdt(m.repliedAt)}</small></div>`:''}
     ${m.status!=='closed'?`<form data-form="reply"><input type="hidden" name="id" value="${m.id}"><div class="f"><label>${m.reply?'رد إضافي':'نص الرد'}<textarea name="reply" required minlength="3" maxlength="1000"></textarea></label><span class="hint">${m.uid?'يظهر الرد للعميل في صفحة المساعدة بحسابه.':'زائر بلا حساب: أرسل الرد أيضاً عبر بريده أو جواله.'}</span><div class="row"><button class="btn">إرسال الرد</button><button type="button" class="btn ghost" data-act="msgclose" data-id="${m.id}">إغلاق الرسالة</button>${m.uid?'':`<a class="btn ghost" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('بركات: '+m.subject)}">رد بالبريد</a>`}</div></div></form>`:'<p class="sub">الرسالة مغلقة.</p>'}</div></div></div>`;}
  return `<div class="stack"><div class="head"><div><h2>الرسائل</h2><p class="sub">${db.msgs.filter(m=>m.status==='new').length} رسالة جديدة</p></div></div>
  ${table([{l:'الرقم'},{l:'التاريخ'},{l:'المرسل'},{l:'الموضوع'},{l:'الحالة'},{l:''}],db.msgs.slice().reverse().map(m=>[`<span dir="ltr">${m.id}</span>`,fdt(m.at),esc(m.name)+(m.uid?'':' <span class="tag mute">زائر</span>'),esc(m.subject),`<span class="tag ${MSGST[m.status][1]}">${MSGST[m.status][0]}</span>`,`<a class="btn sm ${m.status==='new'?'':'ghost'}" href="#/a/messages/${m.id}">${m.status==='new'?'رد':'عرض'}</a>`]),'لا توجد رسائل.')}</div>`;
};
A.settings=()=>{const s=db.settings;
  return `<div class="stack"><div class="head"><div><h2>الإعدادات</h2><p class="sub">تسري المعدلات على العروض الجديدة فقط، ولا تمس العقود القائمة.</p></div></div>
  <div class="card"><form data-form="settings"><div class="grid g3">
   <label>هامش ربح المرابحة السنوي %<input name="murabahaRate" type="number" step="0.01" min="0" value="${s.murabahaRate}" dir="ltr"></label>
   <label>معدل أجرة الإجارة السنوي %<input name="ijaraRate" type="number" step="0.01" min="0" value="${s.ijaraRate}" dir="ltr"></label>
   <label>معدل أجرة المشاركة السنوي %<input name="musharakaRate" type="number" step="0.01" min="0" value="${s.musharakaRate}" dir="ltr"></label>
   <label>حصة المضارب من ربح الوعاء %<input name="mudaribShare" type="number" step="1" min="0" max="90" value="${s.mudaribShare}" dir="ltr"></label>
   <label>سعر غرام الذهب عيار 24 (${CUR})<input name="goldPrice" type="number" step="0.01" min="1" value="${s.goldPrice}" dir="ltr"></label>
   <label>الحد الأعلى للقرض الحسن (${CUR})<input name="qardMax" type="number" step="1" min="0" value="${s.qardMax}" dir="ltr"></label>
   <label>أدنى دفعة أولى في المشاركة %<input name="minDown" type="number" step="1" min="0" max="90" value="${s.minDown}" dir="ltr"></label>
   <label>أجر وكالة التكافل %<input name="takafulFee" type="number" step="1" min="0" max="40" value="${s.takafulFee}" dir="ltr"></label>
  </div><div style="margin-top:14px"><button class="btn">حفظ الإعدادات</button></div></form></div>
  <div class="card"><h3>النسخ الاحتياطي والاستعادة</h3><p class="sub" style="margin-bottom:10px">احفظ نسخة كاملة من بيانات النظام في ملف على جهازك، واستعدها متى شئت أو انقلها إلى جهاز آخر. يُنصح بحفظ نسخة في نهاية كل يوم عمل.</p><div class="row"><button class="btn" data-act="backup">حفظ نسخة احتياطية</button><button class="btn ghost" data-act="restore">استعادة من نسخة</button></div><input type="file" id="restoreFile" accept=".json,application/json" hidden>
  <!--SRVINFO--><p class="sub" style="margin-top:10px">${db.lastBackup?`آخر نسخة محفوظة: ${fdt(db.lastBackup)}`:'لم تُحفظ أي نسخة بعد.'}</p></div>
  <div class="card"><h3>بيانات التجربة</h3><p class="sub" style="margin-bottom:10px">${CLOUD?'تعيد قاعدة البيانات إلى بيانات التجربة الأولى، وتبقى حسابات العملاء المسجلين بأرصدة صفرية.':'تعيد النظام إلى بياناته الأولى على هذا الجهاز.'}</p><button class="btn bad" data-act="reset">إعادة ضبط بيانات التجربة</button></div></div>`;
};
const monthKey=d=>{const x=new Date(d);return x.getFullYear()+'-'+pad(x.getMonth()+1)};
function compliance(){const sl=db.reqs.filter(r=>['sale','lease'].includes(PRODUCTS[r.product].kind)&&['offer','active','completed'].includes(r.status));
  const qd=db.reqs.filter(r=>r.product==='qard'&&r.total!=null);const ds=db.dist;const ms=db.settings.mudaribShare;
  const late=db.reqs.filter(r=>r.status==='active'&&isLate(nextDue(r)));
  const lateFee=db.tx.filter(t=>/غرامة|فائدة|فوائد/.test(t.note)||['fee','penalty','interest'].includes(t.type));
  const paidClaims=db.claims.filter(c=>c.status==='paid');const zIn=db.tx.filter(t=>t.type==='zakat').reduce((a,t)=>a-t.amt,0);const zOut=db.fundOut.filter(o=>o.fund==='zakat');
  return [
   ['لا فوائد ولا غرامات تأخير',lateFee.length===0,`فُحصت ${db.tx.length} حركة، ${lateFee.length?`ووُجدت ${lateFee.length} حركة مخالفة`:'ولم توجد أي زيادة أو غرامة'}${late.length?`، مع ${late.length} عقد متأخر لم يُحمَّل أي زيادة`:''}.`],
   ['لا بيع ولا إجارة قبل التملك والقبض',sl.every(r=>r.owned),`${sl.length} عقد مرابحة وإجارة، ${sl.filter(r=>r.owned).length} منها مؤكَّد تملك أصله قبل إصدار العرض.`],
   ['القرض الحسن بلا زيادة',qd.every(r=>!r.profit&&r.total===r.amount),`${qd.length} قرض حسن، ويُرد كل منها بقدره دون أي زيادة.`],
   ['توزيع المضاربة بنسبة شائعة والخسارة على رأس المال',ds.every(d=>d.gross>0?(d.mud>=0&&d.mud<d.gross):d.mud===0),`${ds.length} توزيع، حصة المضارب ${ms}% من الربح الفعلي فقط، ولا يأخذ شيئاً عند الخسارة.`],
   ['فصل صندوق التكافل عن أموال بركات',paidClaims.length===0||db.funds.takaful>=0,`رصيد الصندوق ${money(db.funds.takaful)}، وأجر الوكالة المفصول ${money(db.funds.takafulFee)} (${db.settings.takafulFee}%)، وصُرف ${paidClaims.length} تعويض من الصندوق وحده.`],
   ['أموال الزكاة تُصرف في مصارفها الثمانية',zOut.every(o=>MASARIF.includes(o.to)),`جُمع ${money(zIn)}، وصُرف ${money(zOut.reduce((a,o)=>a+o.amt,0))} في ${zOut.length} عملية، والرصيد ${money(db.funds.zakat)}.`]
  ]}
A.reports=()=>{const cust=db.users.filter(u=>u.role==='customer');const months=[];const d0=new Date();d0.setDate(1);for(let i=5;i>=0;i--){const x=new Date(d0);x.setMonth(x.getMonth()-i);months.push(monthKey(x))}
  const flow=months.map(m=>{const t=db.tx.filter(x=>monthKey(x.at)===m&&['deposit','withdraw'].includes(x.type));return [m,r2(t.filter(x=>x.amt>0).reduce((a,x)=>a+x.amt,0)),r2(-t.filter(x=>x.amt<0).reduce((a,x)=>a+x.amt,0))]});
  const mx=Math.max(1,...flow.map(f=>Math.max(f[1],f[2])));
  const port=Object.keys(PRODUCTS).map(k=>{const l=db.reqs.filter(r=>r.product===k&&['active','completed'].includes(r.status));return [PRODUCTS[k].name,l.length,money(l.reduce((a,r)=>a+r.amount,0)),money(l.filter(r=>r.status==='active').reduce((a,r)=>a+remaining(r),0))]});
  const ck=compliance();const okN=ck.filter(c=>c[1]).length;
  return `<div class="stack"><div class="printhead"><div style="display:flex;gap:10px;align-items:center"><svg width="40" height="40" viewBox="0 0 64 64" aria-hidden="true"><use href="#mark"/></svg><div><b style="font-size:20px">بركات</b><div style="font-size:12px">نماءٌ في الحلال</div></div></div><div style="text-align:left;font-size:13px"><b>تقرير الإدارة والامتثال الشرعي</b><br>تاريخ الإصدار ${fdt(now())}</div></div>
  <div class="head"><div><h2>التقارير</h2><p class="sub">صورة شاملة عن النشاط والامتثال الشرعي حتى ${fdate(now())}.</p></div><div class="row noprint"><button class="btn sm ghost" data-act="repPrint">طباعة أو حفظ PDF</button><button class="btn sm ghost" data-act="repCsv">تنزيل دفتر الحركات</button><button class="btn sm ghost" data-act="portCsv">تنزيل محفظة التمويل</button></div></div>
  <div class="grid g4">
   <div class="card kpi"><span>إجمالي الودائع</span><b>${money(cust.reduce((a,u)=>a+u.bal.current+u.bal.invest,0))}</b><small>جاري واستثمار</small></div>
   <div class="card kpi"><span>التمويل القائم</span><b>${money(db.reqs.filter(r=>r.status==='active').reduce((a,r)=>a+remaining(r),0))}</b></div>
   <div class="card kpi"><span>أرباح موزعة على المودعين</span><b>${money(db.dist.reduce((a,d)=>a+d.net,0))}</b><small>${db.dist.length} توزيع</small></div>
   <div class="card kpi"><span>الامتثال الشرعي</span><b>${okN} من ${ck.length}</b><small>${okN===ck.length?'لا ملاحظات':'توجد ملاحظات للمراجعة'}</small></div>
  </div>
  <div class="card"><h3>تقرير الامتثال الشرعي</h3><p class="sub">فحص آلي لكل العقود والحركات، يُرفع إلى هيئة الرقابة الشرعية.</p>${ck.map(c=>`<div class="split chk"><span><span class="${c[1]?'ok':'bad'}" aria-label="${c[1]?'مستوفى':'يحتاج مراجعة'}">${c[1]?'✓':'!'}</span> ${c[0]}</span><small style="color:var(--muted);text-align:left;max-width:60%">${c[2]}</small></div>`).join('')}</div>
  <div class="grid g2" style="align-items:start">
   <div class="card"><h3>الإيداعات والسحوبات (آخر 6 أشهر)</h3><div class="cbar" role="img" aria-label="رسم بياني للإيداعات والسحوبات الشهرية">${flow.map(f=>`<div class="m"><div class="b"><i style="height:${f[1]/mx*100}%" title="إيداع ${money(f[1])}"></i><i class="o" style="height:${f[2]/mx*100}%" title="سحب ${money(f[2])}"></i></div><small>${f[0].slice(5)}-${f[0].slice(0,4)}</small></div>`).join('')}</div>
    <div class="legend"><span><i></i>إيداع</span><span><i class="o"></i>سحب</span></div>
    ${table([{l:'الشهر'},{l:'إيداع',num:1},{l:'سحب',num:1}],flow.slice().reverse().map(f=>[f[0].slice(5)+'-'+f[0].slice(0,4),money(f[1]),money(f[2])]))}</div>
   <div class="card"><h3>محفظة التمويل</h3>${table([{l:'الصيغة'},{l:'العقود',num:1},{l:'أصل التمويل',num:1},{l:'المتبقي',num:1}],port)}</div>
  </div></div>`};
A.log=()=>`<div class="stack"><div class="head"><h2>سجل العمليات</h2></div>${table([{l:'الوقت'},{l:'العملية'},{l:'المنفّذ'}],db.log.map(l=>[fdt(l.at),esc(l.what),esc(l.who)]))}</div>`;

/* ---------- actions ---------- */
const need=(c,m)=>{if(!c){throw new Error(m)}};
const FORMS={
  async login(f){
    const id=f.id.trim().toLowerCase();const pd=phoneDigits(id);
    const u=db.users.find(x=>x.email.toLowerCase()===id||(pd.length>=8&&x.phone===pd)||x.acct.toLowerCase()===id);
    need(u&&u.pass===await hash(f.pw,u.salt),'بيانات الدخول غير صحيحة.');
    store.set(SKEY,u.id);logA('تسجيل دخول',u.name);save();toast(`مرحباً ${u.name.split(' ')[0]}`);go(u.role==='admin'?'#/a/home':'#/c/home');
  },
  async register(f){
    const email=f.email.trim().toLowerCase(),phone=phoneDigits(f.phone);
    need(normName(f.name).split(' ').length>=2,'اكتب الاسم الكامل (اسمان على الأقل).');
    need(phone.length>=10&&phone.length<=13,'رقم الجوال غير صحيح.');
    need(!db.users.some(u=>u.email===email),'هذا البريد مسجّل من قبل.');
    need(!db.users.some(u=>u.phone===phone),'رقم الجوال مسجّل من قبل.');
    need(!db.users.some(u=>u.nid&&u.nid===f.nid.trim()),'رقم الهوية مسجّل من قبل.');
    const salt=Math.random().toString(36).slice(2);
    const u={id:uid('u'),acct:'BR-'+(++db.seq)+String(Math.floor(Math.random()*9000+1000)),salt,pass:await hash(f.pw,salt),name:normName(f.name),email,phone,nid:f.nid.trim(),role:'customer',status:'pending',created:now(),bal:{current:0,invest:0}};
    db.users.push(u);store.set(SKEY,u.id);logA(`فتح حساب جديد ${u.acct}`,u.name);save();toast('تم فتح حسابك. ستُفعَّل العمليات بعد التحقق.');go('#/c/home');
  },
  move(f){const u=me();need(u.status==='active','الحساب غير مفعّل.');const a=r2(+f.amt);need(a>0,'أدخل مبلغاً صحيحاً.');
    const [from,to]=f.dir==='ci'?['current','invest']:['invest','current'];
    need((from==='current'?avail(u):u.bal.invest)>=a,'الرصيد غير كافٍ.');
    addTx(u,from,-a,'move',`تحويل إلى ${ACC[to]}`);addTx(u,to,a,'move',`تحويل من ${ACC[from]}`);logA(`نقل ${money(a)} إلى ${ACC[to]}`);save();toast('تم النقل');render()},
  transfer(f){const u=me();need(u.status==='active','الحساب غير مفعّل.');const a=r2(+f.amt);need(a>0,'أدخل مبلغاً صحيحاً.');
    const t=f.to.trim().toUpperCase(),pd=phoneDigits(t);
    const to=db.users.find(x=>x.role==='customer'&&(x.acct===t||(pd.length>=8&&x.phone===pd)));
    need(to,'لم نجد مستفيداً بهذا الرقم.');need(to.id!==u.id,'لا يمكن التحويل إلى حسابك نفسه.');need(to.status!=='frozen','حساب المستفيد موقوف.');
    need(avail(u)>=a,'الرصيد المتاح غير كافٍ.');
    dialog(`<h3>تأكيد التحويل</h3><div class="split"><span>إلى</span><b style="direction:rtl">${esc(to.name)}</b></div><div class="split"><span>رقم الحساب</span><b>${to.acct}</b></div><div class="split"><span>المبلغ</span><b>${money(a)}</b></div><div class="split"><span>الرسوم</span><b>${money(0)}</b></div>
     <div class="row" style="margin-top:16px"><button class="btn" data-act="doTransfer" data-id="${to.id}" data-v="${a}" data-n="${esc(f.note)}">تأكيد</button><button class="btn ghost" data-act="close">إلغاء</button></div>`)},
  cash(f){const u=me();need(u.status==='active','الحساب غير مفعّل.');need(['deposit','withdraw'].includes(f.kind),'نوع الطلب غير صحيح.');const a=r2(+f.amt);need(a>=10,'أقل مبلغ 10.00 '+CUR);
    if(f.kind==='withdraw')need(avail(u)>=a,'الرصيد المتاح غير كافٍ.');
    db.cash.push({id:uid('c'),uid:u.id,kind:f.kind,amt:a,method:f.method,ref:f.ref.trim(),status:'pending',at:now()});
    logA(`طلب ${f.kind==='deposit'?'إيداع':'سحب'} ${money(a)}`);save();toast('أُرسل الطلب، وسيُنفذ بعد التحقق.');render()},
  fin(f){const u=me();need(u.status==='active','الحساب غير مفعّل.');const s=db.settings;need(Object.hasOwn(PRODUCTS,f.product),'صيغة تمويل غير معروفة.');need(Number.isInteger(+f.term)&&+f.term>=1&&+f.term<=360,'مدة التمويل غير صحيحة.');
    const a=+f.amount;need(a>=500,'أقل مبلغ 500.00 '+CUR);
    if(f.product==='qard')need(a<=s.qardMax,`الحد الأعلى للقرض الحسن ${money(s.qardMax)}.`);
    if(f.product==='musharaka')need(+f.down>=s.minDown,`أدنى حصة أولى ${s.minDown}%.`);
    need(f.asset.trim().length>=3,'صف الأصل أو الغرض.');
    const r=newReq(u,f.product,{amount:a,term:f.term,down:f.down,share:f.share,asset:f.asset.trim(),purpose:f.purpose.trim()});
    logA(`طلب ${PRODUCTS[f.product].name} ${r.id} بمبلغ ${money(a)}`);save();toast('أُرسل طلبك للمراجعة');go('#/c/finance/'+r.id)},
  settle(f){const u=me();const r=db.reqs.find(x=>x.id===f.id&&x.uid===u.id&&x.status==='active'&&x.product==='mudaraba');need(r,'العقد غير متاح.');
    const p=r2(+f.profit);need(p>=-r.amount,'الخسارة لا تتجاوز رأس المال.');
    const pay=p>=0?r2(r.amount+p*r.bankShare/100):r2(r.amount+p);
    need(avail(u)>=pay,`يلزم رصيد ${money(pay)} في الحساب الجاري.`);
    addTx(u,'current',-pay,'installment',`تسوية مضاربة ${r.id}: رأس المال ${p>=0?'وحصة الربح':'بعد خصم الخسارة'}`);r.status='completed';r.settled={profit:p,paid:pay,at:now()};
    logA(`تسوية مضاربة ${r.id} بربح ${money(p)}`);save();toast('تمت التسوية');render()},
  zakatpay(f){const u=me();need(u.status==='active','الحساب غير مفعّل.');const due=r2(+(f.due!=null?f.due:$('#zk').dataset.due));need(due>0,'لا زكاة مستحقة.');need(avail(u)>=due,'الرصيد الجاري غير كافٍ.');
    addTx(u,'current',-due,'zakat','زكاة المال · توكيل بالتوزيع');db.funds.zakat=r2(db.funds.zakat+due);logA(`إخراج زكاة ${money(due)}`);save();toast('تقبّل الله زكاتك');render()},
  give(f){const u=me();need(u.status==='active','الحساب غير مفعّل.');need(['sadaqa','waqf'].includes(f.kind),'نوع التبرع غير صحيح.');const a=r2(+f.amt);need(a>0,'أدخل مبلغاً صحيحاً.');need(avail(u)>=a,'الرصيد غير كافٍ.');
    addTx(u,'current',-a,f.kind,f.kind==='waqf'?'مساهمة في الوقف النقدي':'صدقة');db.funds[f.kind]=r2(db.funds[f.kind]+a);logA(`${f.kind==='waqf'?'وقف':'صدقة'} ${money(a)}`);save();toast('جزاك الله خيراً');render()},
  async pw(f){const u=me();need(u.pass===await hash(f.old,u.salt),'كلمة المرور الحالية غير صحيحة.');u.pass=await hash(f.pw,u.salt);logA('تغيير كلمة المرور');save();toast('حُفظت كلمة المرور الجديدة');render()},
  decide(f,btn){const r=db.reqs.find(x=>x.id===f.id&&x.status==='pending');need(r,'الطلب لم يعد قيد المراجعة.');
    r.note=f.note.trim();
    if(btn==='reject'){need(r.note,'اكتب سبب الاعتذار للعميل.');r.status='rejected';r.decided=now();notify(r.uid,`نعتذر عن طلب ${PRODUCTS[r.product].name} ${r.id}: ${r.note}`,'#/c/finance/'+r.id);logA(`اعتذار عن ${r.id}`);save();toast('أُبلغ العميل بالاعتذار');return go('#/a/requests')}
    if(r.product==='qard')need(db.funds.qard>=r.amount,'رصيد صندوق القرض الحسن غير كافٍ.');
    if(['sale','lease'].includes(PRODUCTS[r.product].kind)){need(f.own,'أكّد تملك بركات للأصل أولاً.');r.owned=now()}
    makeOffer(r);notify(r.uid,`صدر عرض ${PRODUCTS[r.product].name} ${r.id}، وهو بانتظار قبولك.`,'#/c/finance/'+r.id);logA(`اعتماد ${r.id} وإصدار العرض`);save();toast('صدر العرض، وهو بانتظار قبول العميل');go('#/a/requests')},
  usearch(f){window._uq=f.q;render()},
  dist(f){const gross=r2(+f.gross);need(gross!==0,'أدخل الربح أو الخسارة.');
    const inv=db.users.filter(u=>u.role==='customer'&&u.bal.invest>0);const pool=r2(inv.reduce((a,u)=>a+u.bal.invest,0));
    need(gross>-pool,'الخسارة تتجاوز الوعاء.');
    const mud=gross>0?r2(gross*db.settings.mudaribShare/100):0,net=r2(gross-mud);
    dialog(`<h3>معاينة التوزيع · ${esc(f.period)}</h3><div class="split"><span>الوعاء</span><b>${money(pool)}</b></div><div class="split"><span>صافي الربح</span><b>${money(gross)}</b></div><div class="split"><span>حصة المضارب</span><b>${money(mud)}</b></div><div class="split"><span>للمودعين</span><b>${money(net)}</b></div>
     <div style="max-height:220px;overflow:auto;margin-top:10px">${inv.map(u=>`<div class="split"><span>${esc(u.name)}</span><b>${money(r2(net*u.bal.invest/pool))}</b></div>`).join('')}</div>
     <div class="row" style="margin-top:16px"><button class="btn" data-act="doDist" data-id="${esc(f.period)}" data-v="${gross}">اعتماد التوزيع</button><button class="btn ghost" data-act="close">إلغاء</button></div>`)},
  fundout(f){need(Object.hasOwn(FUNDS,f.fund),'صندوق غير معروف.');const a=r2(+f.amt);need(a>0,'أدخل مبلغاً.');need(db.funds[f.fund]>=a,'رصيد الصندوق غير كافٍ.');
    db.funds[f.fund]=r2(db.funds[f.fund]-a);(db.fundOut=db.fundOut||[]).push({at:now(),fund:f.fund,to:f.to,note:f.note.trim(),amt:a});
    logA(`صرف ${money(a)} من ${FUNDS[f.fund]} إلى ${f.to}`);save();toast('سُجل الصرف');render()},
  settings(f){const s=db.settings;for(const k in s){if(f[k]!==undefined&&f[k]!==''&&Number.isFinite(+f[k])&&+f[k]>=0)s[k]=+f[k]}logA('تحديث الإعدادات');save();toast('حُفظت الإعدادات');render()}
};
const ACTS={
  logout(){const u=me();if(u)logA('تسجيل خروج',u.name);store.del(SKEY);save();toast('تم تسجيل الخروج');go('#/')},
  close(){closeDlg()},
  doTransfer(b){const u=me(),to=userById(b.dataset.id),a=r2(+b.dataset.v);need(u.status==='active','الحساب غير مفعّل.');need(to&&to.role==='customer'&&to.id!==u.id&&to.status!=='frozen','المستفيد غير متاح.');need(a>0,'أدخل مبلغاً صحيحاً.');need(avail(u)>=a,'الرصيد غير كافٍ.');
    const n=b.dataset.n?' · '+b.dataset.n:'';
    addTx(u,'current',-a,'transfer',`تحويل إلى ${to.name}${n}`);addTx(to,'current',a,'transfer',`تحويل من ${u.name}${n}`);notify(to.id,`وصلك تحويل بمبلغ ${money(a)} من ${u.name}.`,'#/c/accounts');
    logA(`تحويل ${money(a)} إلى ${to.acct}`);save();closeDlg();toast('تم التحويل بنجاح');render()},
  accept(b){const u=me();const r=db.reqs.find(x=>x.id===b.dataset.id&&x.uid===u.id&&x.status==='offer');need(r,'العرض غير متاح.');
    if(r.product==='musharaka'){need(avail(u)>=r.downAmt,`يلزم ${money(r.downAmt)} في الحساب الجاري للدفعة الأولى.`);addTx(u,'current',-r.downAmt,'installment',`دفعة أولى · مشاركة ${r.id}`)}
    if(r.product==='qard'){need(db.funds.qard>=r.amount,'صندوق القرض الحسن لا يكفي حالياً.');db.funds.qard=r2(db.funds.qard-r.amount);addTx(u,'current',r.amount,'finance',`صرف قرض حسن ${r.id}`)}
    if(r.product==='mudaraba')addTx(u,'current',r.amount,'finance',`رأس مال مضاربة ${r.id}`);
    r.status='active';r.accepted=now();r.schedule=buildSchedule(r,now());logA(`قبول عقد ${r.id}`);save();toast('تم إبرام العقد');render()},
  decline(b){const u=me();const r=db.reqs.find(x=>x.id===b.dataset.id&&x.uid===u.id&&x.status==='offer');need(r,'العرض غير متاح.');r.status='cancelled';logA(`اعتذار العميل عن ${r.id}`);save();toast('أُلغي العرض');render()},
  pay(b){const u=me();const r=db.reqs.find(x=>x.id===b.dataset.id&&x.uid===u.id&&x.status==='active');need(r,'العقد غير متاح.');const s=nextDue(r);need(s,'لا أقساط مستحقة.');
    need(avail(u)>=s.amt,`الرصيد المتاح ${money(avail(u))} لا يكفي للقسط.`);
    addTx(u,'current',-s.amt,'installment',`قسط ${s.n} · ${PRODUCTS[r.product].name}`);s.paid=true;s.paidAt=now();
    if(r.product==='qard')db.funds.qard=r2(db.funds.qard+s.amt);
    if(!nextDue(r)){r.status='completed';r.closed=now()}
    logA(`سداد القسط ${s.n} من ${r.id}`);save();toast(r.status==='completed'?'اكتمل العقد بحمد الله':'تم سداد القسط');render()},
  rf(b){window._rf=b.dataset.id;render()},
  cashok(b){const c=db.cash.find(x=>x.id===b.dataset.id&&x.status==='pending');need(c,'الطلب معالج.');const u=userById(c.uid);
    if(c.kind==='withdraw'){need(u.bal.current>=c.amt,'رصيد العميل لا يكفي.');}
    c.status='done';c.done=now();notify(u.id,`نُفّذ طلب ${c.kind==='deposit'?'الإيداع':'السحب'} بمبلغ ${money(c.amt)}.`,'#/c/cash');addTx(u,'current',c.kind==='deposit'?c.amt:-c.amt,c.kind,`${c.kind==='deposit'?'إيداع':'سحب'} ${c.method} · مرجع ${c.ref}`);
    logA(`تنفيذ ${c.kind==='deposit'?'إيداع':'سحب'} ${money(c.amt)} لـ${u.name}`);save();toast('تم التنفيذ');render()},
  cashno(b){const c=db.cash.find(x=>x.id===b.dataset.id&&x.status==='pending');need(c,'الطلب معالج.');
    dialog(`<h3>رفض الطلب</h3><form data-form="cashreject"><input type="hidden" name="id" value="${c.id}"><div class="f"><label>السبب<input name="note" required maxlength="100"></label><div class="row"><button class="btn bad">رفض</button><button type="button" class="btn ghost" data-act="close">إلغاء</button></div></div></form>`)},
  ustat(b){const c=userById(b.dataset.id);need(c&&c.role==='customer'&&['active','frozen'].includes(b.dataset.v),'طلب غير صحيح.');c.status=b.dataset.v;notify(c.id,c.status==='active'?'فُعّل حسابك، ويمكنك الآن استخدام كل الخدمات.':'أُوقف حسابك مؤقتاً. تواصل معنا لمعرفة السبب.','#/c/home');logA(`${c.status==='active'?'تفعيل':'إيقاف'} حساب ${c.name}`);save();toast(c.status==='active'?'فُعّل الحساب':'أُوقف الحساب');render()},
  async resetpw(b){const c=userById(b.dataset.id);const p='BR'+Math.random().toString().slice(2,8)+'@';c.pass=await hash(p,c.salt);logA(`إعادة تعيين كلمة مرور ${c.name}`);save();
    dialog(`<h3>كلمة المرور المؤقتة</h3><p>أبلغ العميل بها عبر قناة موثوقة:</p><p style="font-size:22px;font-weight:700;direction:ltr;text-align:center;margin:12px 0">${p}</p><button class="btn" data-act="close">تم</button>`)},
  doDist(b){const gross=r2(+b.dataset.v),period=String(b.dataset.id||'').slice(0,60);const inv=db.users.filter(u=>u.role==='customer'&&u.bal.invest>0);const pool=r2(inv.reduce((a,u)=>a+u.bal.invest,0));need(Number.isFinite(gross)&&gross!==0&&pool>0&&gross>-pool,'بيانات التوزيع غير صحيحة.');
    const mud=gross>0?r2(gross*db.settings.mudaribShare/100):0,net=r2(gross-mud);
    inv.forEach(u=>{const sh=r2(net*u.bal.invest/pool);if(sh){addTx(u,'invest',sh,'profit',`${sh>0?'حصتك من ربح':'حصتك من خسارة'} وعاء المضاربة · ${period}`);notify(u.id,`وُزّعت نتيجة وعاء المضاربة (${period})، وحصتك ${money(sh)}.`,'#/c/invest')}});
    db.dist.push({id:uid('p'),at:now(),period,gross,mud,net,pool,by:me().name});logA(`توزيع ${gross>0?'ربح':'خسارة'} المضاربة ${period}: ${money(gross)}`);save();closeDlg();toast('اعتُمد التوزيع');render()},
  async reset(){if(!confirmReset()){return}store.del(KEY);await seed();toast('أُعيدت بيانات التجربة');go('#/a/home')}
};
FORMS.contact=f=>{const u=me();const ph=phoneDigits(f.phone);need(normName(f.name).length>=3,'اكتب الاسم.');need(ph.length>=10&&ph.length<=13,'رقم الجوال غير صحيح.');
  need(/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(f.email.trim()),'البريد الإلكتروني غير صحيح.');need(f.body.trim().length>=10,'اكتب رسالتك (10 أحرف على الأقل).');
  const m={id:'M-'+(++db.seq),at:now(),name:normName(f.name),email:f.email.trim().toLowerCase(),phone:ph,subject:f.subject,body:f.body.trim(),uid:u&&u.role==='customer'?u.id:null,status:'new'};
  db.msgs.push(m);logA(`رسالة جديدة ${m.id}: ${m.subject}`,m.name);save();
  if(m.uid){toast('وصلت رسالتك، وسيظهر الرد هنا');render()}
  else{render();dialog(`<h3>شكراً لتواصلك</h3><p>وصلت رسالتك برقم <b dir="ltr">${m.id}</b>، وسيتواصل معك فريقنا عبر بريدك أو جوالك في أقرب وقت.</p><div class="row" style="margin-top:16px"><button class="btn" data-act="close">تم</button></div>`)}};
FORMS.reply=f=>{const m=db.msgs.find(x=>x.id===f.id);need(m,'الرسالة غير موجودة.');need(f.reply.trim().length>=3,'اكتب الرد.');
  m.reply=(m.reply?m.reply+'\n':'')+f.reply.trim();m.repliedAt=now();m.status='replied';m.seen=false;if(m.uid)notify(m.uid,`ردّت بركات على رسالتك «${m.subject}».`,'#/c/help');logA(`الرد على الرسالة ${m.id}`);save();toast('أُرسل الرد');go('#/a/messages')};
FORMS.claim=f=>{const u=me();need(u.status==='active','الحساب غير مفعّل.');const pl=db.policies.find(x=>x.id===f.pid&&x.uid===u.id);need(pl&&covered(pl),'الاشتراك غير مغطى.');
  const a=r2(+f.amt),cap=PLANS[pl.plan].cap;need(a>=50,'أقل مبلغ للمطالبة 50.00 '+CUR);need(a<=cap,`أقصى تعويض لهذا البرنامج ${money(cap)}.`);need(f.desc.trim().length>=10,'صف الضرر بوضوح.');
  need(!db.claims.some(c=>c.pid===pl.id&&c.status==='pending'),'لديك مطالبة قيد المراجعة على هذا الاشتراك.');
  const c={id:'K-'+(++db.seq),uid:u.id,pid:pl.id,amt:a,desc:f.desc.trim(),status:'pending',at:now()};db.claims.push(c);logA(`مطالبة تكافل ${c.id} بمبلغ ${money(a)}`);save();toast('أُرسلت المطالبة للمراجعة');render()};
FORMS.claimreject=f=>{const c=db.claims.find(x=>x.id===f.id&&x.status==='pending');need(c,'المطالبة معالجة.');c.status='rejected';c.note=f.note.trim();c.decided=now();notify(c.uid,`لم تُقبل مطالبة التكافل ${c.id}: ${c.note}`,'#/c/takaful');logA(`رفض مطالبة ${c.id}`);save();closeDlg();toast('رُفضت المطالبة');render()};
Object.assign(ACTS,{
  tkjoin(b){const u=me();need(u.status==='active','الحساب غير مفعّل.');const k=b.dataset.id;need(Object.hasOwn(PLANS,k),'برنامج غير معروف.');need(!db.policies.some(x=>x.uid===u.id&&x.plan===k&&x.status==='active'),'أنت مشترك في هذا البرنامج.');
    const pl={id:'T-'+(++db.seq),uid:u.id,plan:k,start:now(),paidThrough:now(),status:'active'};contribute(u,pl);db.policies.push(pl);logA(`اشتراك في ${PLANS[k].name} ${pl.id}`);save();toast('تم الاشتراك، وأنت مغطى حتى '+fdate(pl.paidThrough));render()},
  tkpay(b){const u=me();const pl=db.policies.find(x=>x.id===b.dataset.id&&x.uid===u.id&&x.status==='active');need(pl,'الاشتراك غير متاح.');contribute(u,pl);logA(`سداد اشتراك ${pl.id}`);save();toast('سُدد الاشتراك، والتغطية حتى '+fdate(pl.paidThrough));render()},
  tkcancel(b){const u=me();const pl=db.policies.find(x=>x.id===b.dataset.id&&x.uid===u.id&&x.status==='active');need(pl,'الاشتراك غير متاح.');need(!db.claims.some(c=>c.pid===pl.id&&c.status==='pending'),'لا يمكن الإلغاء وعليه مطالبة قيد المراجعة.');
    if(!b.dataset.ok&&ACTS.tkcancel.armed!==pl.id){ACTS.tkcancel.armed=pl.id;toast('اضغط «إلغاء» مرة أخرى للتأكيد');setTimeout(()=>ACTS.tkcancel.armed=null,5000);return}
    ACTS.tkcancel.armed=null;pl.status='cancelled';pl.cancelled=now();logA(`إلغاء اشتراك ${pl.id}`);save();toast('أُلغي الاشتراك');render()},
  claimok(b){const c=db.claims.find(x=>x.id===b.dataset.id&&x.status==='pending');need(c,'المطالبة معالجة.');need(db.funds.takaful>=c.amt,'رصيد صندوق التكافل لا يكفي.');
    const u=userById(c.uid);db.funds.takaful=r2(db.funds.takaful-c.amt);addTx(u,'current',c.amt,'takaful',`تعويض تكافل ${c.id}`);notify(u.id,`صُرف تعويض التكافل ${c.id} بمبلغ ${money(c.amt)} إلى حسابك الجاري.`,'#/c/takaful');c.status='paid';c.decided=now();logA(`صرف تعويض ${c.id} ${money(c.amt)} لـ${u.name}`);save();toast('صُرف التعويض إلى حساب العميل');render()},
  claimno(b){const c=db.claims.find(x=>x.id===b.dataset.id&&x.status==='pending');need(c,'المطالبة معالجة.');
    dialog(`<h3>رفض المطالبة</h3><form data-form="claimreject"><input type="hidden" name="id" value="${c.id}"><div class="f"><label>السبب<input name="note" required maxlength="120"></label><div class="row"><button class="btn bad">رفض</button><button type="button" class="btn ghost" data-act="close">إلغاء</button></div></div></form>`)},
  msgclose(b){const m=db.msgs.find(x=>x.id===b.dataset.id);need(m,'غير موجودة.');m.status='closed';logA(`إغلاق الرسالة ${m.id}`);save();toast('أُغلقت الرسالة');go('#/a/messages')},
  backup(){const stamp=new Date();db.lastBackup=stamp.toISOString();logA('حفظ نسخة احتياطية');save();
    const name=`barakat-backup-${stamp.getFullYear()}-${pad(stamp.getMonth()+1)}-${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}.json`;
    const url=URL.createObjectURL(new Blob([JSON.stringify(db,null,1)],{type:'application/json'}));
    const l=document.createElement('a');l.href=url;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(url),4000);
    toast('حُفظت النسخة في مجلد التنزيلات: '+name);render()},
  restore(){const i=$('#restoreFile');i.value='';i.click()},
  restoreOk(){const x=ACTS.restore.pending;if(!x)return closeDlg();ACTS.restore.pending=null;const cur=me();db=x;normDb();if(!cur||!db.users.some(u=>u.id===cur.id))store.del(SKEY);
    logA('استعادة البيانات من نسخة احتياطية','النظام');save();closeDlg();toast('استُعيدت البيانات بنجاح');go(me()?(me().role==='admin'?'#/a/settings':'#/c/home'):'#/login')}
});
document.addEventListener('change',e=>{if(e.target.id!=='restoreFile'||!e.target.files[0])return;const fr=new FileReader();
  fr.onload=()=>{let x;try{x=JSON.parse(fr.result)}catch(_){return toast('الملف المختار ليس نسخة احتياطية صالحة')}
    if(!x||x.v!==1||!Array.isArray(x.users)||!x.users.some(u=>u.role==='admin'))return toast('الملف المختار ليس نسخة احتياطية صالحة لبركات');
    ACTS.restore.pending=x;const n=x.users.filter(u=>u.role==='customer').length;
    dialog(`<h3>تأكيد الاستعادة</h3><p class="sub">ستُستبدل البيانات الحالية ببيانات النسخة المختارة.</p><div class="split"><span>تاريخ النسخة</span><b>${x.lastBackup?fdt(x.lastBackup):'—'}</b></div><div class="split"><span>عدد العملاء</span><b>${n}</b></div><div class="split"><span>طلبات التمويل</span><b>${(x.reqs||[]).length}</b></div>
     <div class="row" style="margin-top:16px"><button class="btn" data-act="restoreOk">استعادة الآن</button><button class="btn ghost" data-act="close">إلغاء</button></div>`)};
  fr.readAsText(e.target.files[0])});
FORMS.stmt=f=>{SF.acc=f.acc;SF.per=f.per;SF.q=f.q;render();setTimeout(()=>{const t=document.querySelector('form[data-form=stmt]');if(t)t.scrollIntoView({block:'start'})},0)};
Object.assign(ACTS,{
  stmtPrint(){window.print()},
  stmtCsv(){const u=me();const l=stmtList(u,SF);download(`barakat-statement-${u.acct}-${stamp()}.csv`,csv(['التاريخ','البيان','الحساب','المبلغ','الرصيد بعدها'],l.map(t=>[fdt(t.at),t.note,ACC[t.acc],t.amt.toFixed(2),t.bal.toFixed(2)])),'text/csv;charset=utf-8');toast('نُزّل كشف الحساب')},
  notesClear(){const u=me();db.notes=db.notes.filter(n=>n.to!==u.id||!n.seen);save();toast('حُذفت الإشعارات المقروءة');render()},
  repPrint(){window.print()},
  repCsv(){download(`barakat-ledger-${stamp()}.csv`,csv(['التاريخ','العميل','رقم الحساب','الحساب','النوع','البيان','المبلغ','الرصيد بعدها'],db.tx.slice().reverse().map(t=>{const u=userById(t.uid)||{};return [fdt(t.at),u.name,u.acct,ACC[t.acc],t.type,t.note,t.amt.toFixed(2),t.bal.toFixed(2)]})),'text/csv;charset=utf-8');logA('تنزيل دفتر الحركات');save();toast('نُزّل دفتر الحركات')},
  portCsv(){download(`barakat-portfolio-${stamp()}.csv`,csv(['الرقم','العميل','الصيغة','الأصل أو الغرض','المبلغ','المدة بالأشهر','الحالة','تاريخ الطلب','تأكيد التملك','المتبقي'],db.reqs.map(r=>{const u=userById(r.uid)||{};return [r.id,u.name,PRODUCTS[r.product].name,r.asset,r.amount.toFixed(2),r.term,ST[r.status][0],fdate(r.created),r.owned?fdate(r.owned):'—',remaining(r).toFixed(2)]})),'text/csv;charset=utf-8');toast('نُزّلت محفظة التمويل')}
});
FORMS.cashreject=f=>{const c=db.cash.find(x=>x.id===f.id&&x.status==='pending');need(c,'الطلب معالج.');c.status='rejected';c.note=f.note;notify(c.uid,`لم يُنفذ طلب ${c.kind==='deposit'?'الإيداع':'السحب'} بمبلغ ${money(c.amt)}: ${f.note}`,'#/c/cash');logA(`رفض طلب ${c.kind==='deposit'?'إيداع':'سحب'} لـ${userById(c.uid).name}`);save();closeDlg();toast('رُفض الطلب');render()};
function confirmReset(){if(ACTS.reset.armed){ACTS.reset.armed=false;return true}ACTS.reset.armed=true;toast('اضغط مرة أخرى خلال 5 ثوانٍ للتأكيد');setTimeout(()=>ACTS.reset.armed=false,5000);return false}

document.addEventListener('submit',async e=>{
  const f=e.target.closest('form[data-form]');if(!f)return;e.preventDefault();
  const btn=e.submitter&&e.submitter.name==='d'?e.submitter.value:null;
  const data={};new FormData(f).forEach((v,k)=>data[k]=typeof v==='string'?v:v);
  [...f.elements].forEach(el=>{if(el.type==='checkbox')data[el.name]=el.checked});
  const err=f.querySelector('.err')||$('#err');if(err)err.textContent='';
  try{await FORMS[f.dataset.form](data,btn)}catch(x){if(err&&f.contains(err))err.textContent=x.message;else toast(x.message)}
});
document.addEventListener('click',async e=>{
  const b=e.target.closest('[data-act]');if(!b)return;e.preventDefault();
  try{await ACTS[b.dataset.act](b)}catch(x){toast(x.message)}
});
document.addEventListener('input',e=>{if(e.target.matches('[data-live]'))previewFin();if(e.target.matches('[data-zk]'))calcZakat()});
document.addEventListener('change',e=>{if(e.target.matches('[data-live]'))previewFin();if(e.target.matches('[data-zk]'))calcZakat()});
$('#dlg').addEventListener('click',e=>{if(e.target.id==='dlg')closeDlg()});
window.addEventListener('hashchange',render);
window.addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){db=JSON.parse(e.newValue);normDb();render()}});
if(typeof BARAKAT_SERVER!=='undefined'){}else if(CLOUD)cloudInit();else (async()=>{
  try{db=JSON.parse(store.get(KEY)||'null')}catch(e){db=null}
  if(!db||db.v!==1)await seed();
  normDb();
  render();
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('sw.js').catch(()=>{});
})();

export const E={get db(){return db},set db(v){db=v},FORMS,ACTS,seed,normDb,logA,notify,need,r2,money,uid,now,phoneDigits,fphone,normName,fdate,PRODUCTS,FUNDS,PLANS,ACC,
  me:()=>me(),setMe(id){if(id)__ls.set(SKEY,id);else __ls.delete(SKEY)},
  hook(fx){toast=m=>{fx.push(['toast',String(m)])};dialog=h=>{fx.push(['dialog',String(h)])};closeDlg=()=>{fx.push(['close'])};render=()=>{fx.push(['render'])};go=h=>{fx.push(['go',String(h)])}}};
