'use strict';
// Shared by the Arabic page (index.html) and the English page (en/index.html); the <html lang> decides.
const EN=document.documentElement.lang==='en';
const CFG=window.MUNJIZ_CONFIG||{};
const D=window.DETAILS||{};
const AVG=DATA.AVG||750;
const fmt=n=>n.toLocaleString('en-US');
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const T=EN?{
  cur:'QAR',all:'All authorities',core:'In packages',add:'Add',added:'Added ✓',addA:'Add ',rmA:'Remove ',
  toastAdd:'Added to the calculator',toastRm:'Removed from the calculator',empty:'No service matches. Try another word, or send it through the request form and we will price it.',
  setup:'Company setup bundles',once:'one-time',from:'from',month:'month',year:'year',monthly:'monthly',yearly:'yearly',
  plan:p=>p.key==='gold'?'Gold Package':`${p.en.name} Package`,gold:'Most complete',subscribe:p=>`Subscribe to ${p.en.name}`,
  ymSave:(ym,yd)=>`Equals ${fmt(ym)} QAR a month, ${yd}% below single prices`,mSave:(n,v,md)=>`${n} services worth ${fmt(v)} QAR, ${md}% off`,
  cartEmpty:'No services yet. Press "Add" next to any service.',qtyOf:'Quantity of ',payEach:'Pay per service',pkg:n=>`${n} Package`,
  perMonth:'QAR / month',best:' (best value)',save:s=>`You save ${fmt(s)} QAR a month compared with paying per service.`,
  onceNote:o=>`<b>One-time fees (setup and consultancy): ${fmt(o)} QAR</b> (not monthly)`,addHint:'Add services to compare paying per service with the packages.',
  pickAdded:'Added: ',eName:'Enter your name or company name.',ePhone:'Enter an 8-digit Qatar mobile starting with 3, 5, 6 or 7.',eSvc:'Write the service you need or add it from the calculator.',eMail:'Enter a valid email or leave it empty.',
  msgHead:'Hello, I would like to request a service from Munjiz.',lName:'Name',lPhone:'Mobile',lMail:'Email',lType:'Client type',lPlan:'Package',lSvc:'Services',
  sending:'Sending your request…',sentOk:(id,m)=>`Your request reached us. Request number <b>${esc(id)}</b>.${m?' We have emailed you a confirmation.':''} We will contact you during working hours to confirm the details and the next step. Please do not send documents until we ask for them through our official channel.`,sentFail:'We could not send the request online. Please send it on WhatsApp below.',
  copied:'Copied',copyHand:'Select the text and copy it manually',ind:'Individual',
  about:'About the service',inc:'What we do',docs:'Documents you provide',time:'Approximate time',note:'Note',out:'What you receive',fee:'Munjiz fee',govFee:'Government fees are paid separately with the official receipt.',
  reqThis:'Request this service',addCalc:'Add to calculator',inCalc:'In calculator ✓',close:'Close',consult:'Studies & Consulting',govSvc:'Government services',allSvc:'All services of this authority',home:'Home',allEnts:'← All authorities',allCats:'← All types',svcN:n=>`${n} services`,results:q=>`Results for “${q}”`,
  prices:'Full price list',eOk:'Please agree to the privacy policy to send the request.',lVia:'Preferred contact',
  sec:{about:'About Munjiz',services:'Government services',consult:'Studies & consulting',packages:'Company packages',estimate:'Cost calculator',how:'How we work',request:'Request a service',faq:'Common questions'}
}:{
  cur:'ر.ق',all:'كل الجهات',core:'ضمن الباقات',add:'أضف',added:'مضافة ✓',addA:'إضافة ',rmA:'إزالة ',
  toastAdd:'أضيفت إلى الحاسبة',toastRm:'أزيلت من الحاسبة',empty:'لا توجد خدمة بهذا الاسم. جرّب كلمة أخرى، أو اطلب الخدمة من نموذج الطلب وسنسعّرها لك.',
  setup:'حزم الخدمات',once:'لمرة واحدة',from:'يبدأ من',month:'شهرياً',year:'سنوياً',monthly:'شهرياً',yearly:'سنوياً',
  plan:p=>p.key==='gold'?'الباقة الذهبية':`باقة «${p.name}»`,gold:'الأكثر شمولاً',subscribe:p=>`اشترك في «${p.name}»`,
  ymSave:(ym,yd)=>`تعادل ${fmt(ym)} ر.ق شهرياً، بخصم ${yd}% عن السعر المنفرد`,mSave:(n,v,md)=>`${n} ${n<=10?'خدمات':'خدمة'} قيمتها ${fmt(v)} ر.ق، بخصم ${md}%`,
  cartEmpty:'لم تختر خدمات بعد. اضغط «أضف» بجانب أي خدمة في القائمة.',qtyOf:'عدد مرات ',payEach:'الدفع لكل خدمة',pkg:n=>`باقة «${n}»`,
  perMonth:'ر.ق شهرياً',best:' (الأوفر)',save:s=>`توفر ${fmt(s)} ر.ق شهرياً مقارنة بالدفع لكل خدمة.`,
  onceNote:o=>`<b>أتعاب لمرة واحدة (حزم وخدمات غير متكررة): ${fmt(o)} ر.ق</b> (لا تتكرر شهرياً)`,addHint:'أضف خدمات لنقارن لك بين الدفع لكل خدمة والباقات.',
  pickAdded:'أضيفت: ',eName:'اكتب الاسم أو اسم المنشأة.',ePhone:'اكتب رقم جوال قطري من 8 أرقام، أو رقماً دولياً يبدأ بـ + ورمز الدولة.',eSvc:'اكتب الخدمة المطلوبة أو أضفها من الحاسبة.',eMail:'اكتب بريداً صحيحاً أو اتركه فارغاً.',
  msgHead:'السلام عليكم، أرغب في طلب خدمة من منجز لخدمات الأعمال.',lName:'الاسم',lPhone:'الجوال',lMail:'البريد',lType:'نوع العميل',lPlan:'الباقة',lSvc:'الخدمات',
  sending:'جارٍ إرسال طلبك…',sentOk:(id,m)=>`وصلنا طلبك، ورقمه <b>${esc(id)}</b>.${m?' أرسلنا لك تأكيداً على بريدك.':''} سنتواصل معك خلال ساعات العمل لتأكيد التفاصيل والخطوة التالية. لا ترسل مستندات قبل أن نطلبها عبر قناة التواصل المعتمدة.`,sentFail:'تعذر إرسال الطلب عبر الموقع. أرسله على واتساب من الزر أدناه.',
  copied:'تم النسخ',copyHand:'حدد النص وانسخه يدوياً',ind:'فرد',
  about:'عن الخدمة',inc:'ما نقوم به',docs:'المستندات المطلوبة منك',time:'المدة التقريبية',note:'ملاحظة',out:'ما تستلمه',fee:'أتعاب منجز',govFee:'الرسوم الحكومية تُدفع منفصلة بإيصالها الرسمي.',
  reqThis:'اطلب هذه الخدمة',addCalc:'أضف إلى الحاسبة',inCalc:'في الحاسبة ✓',close:'إغلاق',consult:'الدراسات والاستشارات',govSvc:'الخدمات المساعدة',allSvc:'كل خدمات هذه الجهة',home:'الرئيسية',allEnts:'كل الجهات →',allCats:'كل الأنواع →',svcN:n=>`${n} ${n<=10?'خدمات':'خدمة'}`,results:q=>`نتائج البحث عن «${q}»`,
  prices:'قائمة الأسعار الكاملة',eOk:'وافق على سياسة الخصوصية لإرسال الطلب.',lVia:'وسيلة التواصل المفضلة',
  sec:{about:'تعرّف إلى منجز',services:'الخدمات المساعدة',consult:'الدراسات والاستشارات',packages:'باقات الشركات',estimate:'احسب التكلفة',how:'كيف ننجز معاملتك',request:'اطلب خدمة',faq:'أسئلة شائعة'}
};
const WA=CFG.WHATSAPP||'97451600498';const MAIL=CFG.EMAIL||'munijizqa@gmail.com';

// ---- catalogue: government services, setup bundles, consultancy ----
const entName=(k,ar)=>EN?((D._entities||{})[k]||ar):ar;
const all=[];
DATA.G.forEach(([code,name,list])=>list.forEach(([c,n,inc,p,core,unit])=>{const d=D[c]||{},e=d.en||{};
  all.push({c,n:EN&&e.name||n,inc:EN&&e.inc||inc,p,core,unit,ent:code,entName:entName(code,name),kind:'gov',d:EN?e:(d.ar||{})})}));
DATA.SETUP.forEach(([c,n,inc,p,unit])=>{const d=D[c]||{},e=d.en||{};all.push({c,n:EN&&e.name||n,inc:EN&&e.inc||inc,p,unit,core:false,ent:'PK',entName:entName('PK','حزم الخدمات'),kind:'setup',d:EN?e:(d.ar||{})})});
(DATA.CONSULT||[]).forEach(cat=>cat.items.forEach(it=>{const L=EN?it.en:it.ar;
  all.push({c:it.c,n:L.n,inc:L.inc,p:it.p,from:it.from,unit:EN?it.unit_en:it.unit_ar,core:false,ent:cat.code,entName:EN?cat.en:cat.ar,kind:'consult',d:L})}));
const byCode=Object.fromEntries(all.map(s=>[s.c,s]));
const ents=[...DATA.G.map(g=>[g[0],entName(g[0],g[1])]),['PK',entName('PK','حزم الخدمات')]];
const cats=(DATA.CONSULT||[]).map(c=>[c.code,EN?c.en:c.ar,EN?c.about_en:c.about_ar]);
const isOnce=s=>!s.core&&s.unit!=='شهرياً';
$('fEnt')&&($('fEnt').textContent=DATA.G.length);
$('fSvc2')&&($('fSvc2').textContent=all.filter(s=>s.kind==='gov').length);
$('fCon')&&($('fCon').textContent=all.filter(s=>s.kind==='consult').length);
const NUMS={gov:all.filter(s=>s.kind==='gov').length,ent:DATA.G.length,con:all.filter(s=>s.kind==='consult').length,cat:cats.length,pmin:fmt(Math.min(...DATA.PLANS.map(p=>p.m)))};
document.querySelectorAll('[data-n]').forEach(el=>el.textContent=NUMS[el.dataset.n]);
let ent='all',full=false;const cart=new Map();
function toast(t){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,1800)}
const priceHTML=s=>`<span class="price num">${s.from?`<small>${T.from}</small> `:''}${fmt(s.p)} <small>${T.cur}${s.unit?' '+esc(s.unit):''}</small></span>`;

// ---- main menu: one dropdown per authority, plus consultancy by type ----
function buildMenu(){
  const gov=$('mGov'),con=$('mCon');if(!gov)return;
  ents.forEach(([k,n])=>{const li=document.createElement('li');li.className='sub';
    const items=all.filter(s=>s.ent===k);
    li.innerHTML=`<button type="button" class="subbtn" aria-expanded="false"><span>${esc(n)}</span><span class="cnt num">${items.length}</span></button><ul class="flyout">${items.map(s=>`<li><a href="#svc=${s.c}"><span>${esc(s.n)}</span><span class="num">${fmt(s.p)}</span></a></li>`).join('')}<li class="allx"><a href="#ent=${k}">${T.allSvc}</a></li></ul>`;
    gov.appendChild(li)});
  cats.forEach(([k,n])=>{const li=document.createElement('li');li.className='sub';const items=all.filter(s=>s.ent===k);
    li.innerHTML=`<button type="button" class="subbtn" aria-expanded="false"><span>${esc(n)}</span><span class="cnt num">${items.length}</span></button><ul class="flyout">${items.map(s=>`<li><a href="#svc=${s.c}"><span>${esc(s.n)}</span><span class="num">${s.from?T.from+' ':''}${fmt(s.p)}</span></a></li>`).join('')}<li class="allx"><a href="#cat=${k}">${EN?'Show this category':'عرض هذا النوع'}</a></li></ul>`;
    con.appendChild(li)});
  const nav=$('nav');
  const closeAll=(except)=>nav.querySelectorAll('[aria-expanded="true"]').forEach(b=>{if(b!==except&&!b.contains(except)&&!(except&&b.parentElement.contains(except)))b.setAttribute('aria-expanded','false')});
  nav.addEventListener('click',e=>{const b=e.target.closest('button.topbtn,button.subbtn');
    if(b){const open=b.getAttribute('aria-expanded')!=='true';
      if(b.classList.contains('topbtn'))nav.querySelectorAll('[aria-expanded="true"]').forEach(x=>x.setAttribute('aria-expanded','false'));
      else b.closest('ul').querySelectorAll(':scope>li>.subbtn').forEach(x=>x.setAttribute('aria-expanded','false'));
      b.setAttribute('aria-expanded',open);return}
    if(e.target.closest('a')){nav.querySelectorAll('[aria-expanded="true"]').forEach(x=>x.setAttribute('aria-expanded','false'));document.body.classList.remove('menu-open');$('burger').setAttribute('aria-expanded','false')}});
  document.addEventListener('click',e=>{if(!nav.contains(e.target)&&e.target!==$('burger'))nav.querySelectorAll('[aria-expanded="true"]').forEach(x=>x.setAttribute('aria-expanded','false'))});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')nav.querySelectorAll('[aria-expanded="true"]').forEach(x=>x.setAttribute('aria-expanded','false'))});
  $('burger').onclick=()=>{const o=!document.body.classList.contains('menu-open');document.body.classList.toggle('menu-open',o);$('burger').setAttribute('aria-expanded',o)};
}

// ---- government catalogue ----
const chips=$('chips');
[['all',T.all],...ents].forEach(([k,n])=>{const b=document.createElement('button');b.className='chip';b.type='button';b.textContent=n;b.dataset.k=k;b.setAttribute('aria-pressed',k==='all');b.onclick=()=>setEnt(k);chips.appendChild(b)});
function setEnt(k){ent=k;chips.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',x.dataset.k===k));render()}
function weight(s){return 1}
function covered(s,p){return s.core}
function units(s){return s.core?weight(s):0}
function svcRow(s){const r=document.createElement('div');r.className='svc';
  r.innerHTML=`<span class="code">${s.c}</span><div class="t"><b><a href="#svc=${s.c}" class="dlink">${esc(s.n)}</a>${s.core?`<span class="tag">${T.core}</span>`:''}</b><small>${esc(s.inc)}</small></div>${priceHTML(s)}`;
  const b=document.createElement('button');b.type='button';b.className='add';b.setAttribute('aria-pressed',cart.has(s.c));b.textContent=cart.has(s.c)?T.added:T.add;b.setAttribute('aria-label',(cart.has(s.c)?T.rmA:T.addA)+s.n);
  b.onclick=()=>{toggleCart(s.c)};r.appendChild(b);return r}
function toggleCart(c){if(cart.has(c))cart.delete(c);else cart.set(c,1);render();renderCon();renderCart();toast(cart.has(c)?T.toastAdd:T.toastRm)}
function match(s,q){return !q||(s.n+' '+s.inc+' '+s.c+' '+s.entName).toLowerCase().includes(q.toLowerCase())}
function render(){
  const q=$('q').value.trim();const co=$('coreOnly').checked;
  const cat=$('catalog');cat.innerHTML='';let shown=0;
  const grid=ent==='all'&&!q&&!full;$('entTiles').hidden=!grid;cat.hidden=grid;
  if(grid){$('entTiles').innerHTML=ents.map(([k,n])=>groupTile('ent',k,n,all.filter(s=>s.ent===k&&(!co||s.core)))).join('');return}
  if(ent!=='all')cat.insertAdjacentHTML('beforeend',`<a class="btn sm ghost upto" href="#services">${T.allEnts}</a>`);
  else if(q)cat.insertAdjacentHTML('beforeend',`<p class="lead">${esc(T.results(q))}</p>`);
  (ent==='all'&&q?[...ents,...cats]:ents).forEach(([k,n])=>{
    if(ent!=='all'&&ent!==k)return;
    const items=all.filter(s=>s.ent===k&&(!co||s.core)&&match(s,q));
    if(!items.length)return;shown+=items.length;
    const box=document.createElement('div');box.className='ent';box.id='e-'+k;
    box.innerHTML=`<h3><span class="code">${k}</span>${esc(n)}</h3>`;
    const list=document.createElement('div');list.className='list';items.forEach(s=>list.appendChild(svcRow(s)));
    box.appendChild(list);cat.appendChild(box)});
  if(!shown)cat.insertAdjacentHTML('beforeend',`<div class="empty">${T.empty}</div>`);
}
// one card per authority or consultancy type: name, number of services, lowest price
function groupTile(kind,k,n,items){if(!items.length)return '';const lo=Math.min(...items.map(s=>s.p));
  return `<a class="gtile" href="#${kind}=${k}"><span class="code">${k}</span><b>${esc(n)}</b><span class="mute">${T.svcN(items.length)} · ${T.from} <span class="num">${fmt(lo)}</span> ${T.cur}</span></a>`}
// a search looks across every authority, so clear any authority filter first
$('q').addEventListener('input',()=>{if(ent!=='all'&&$('q').value.trim()){history.replaceState(null,'','#services');crumbs([[T.sec.services,'#services']]);setEnt('all')}else render()});
$('coreOnly').addEventListener('change',render);

// ---- consultancy catalogue ----
let cc='all';
const cchips=$('cchips');
if(cchips){[['all',EN?'All types':'كل الأنواع'],...cats].forEach(([k,n])=>{const b=document.createElement('button');b.className='chip';b.type='button';b.textContent=n;b.dataset.k=k;b.setAttribute('aria-pressed',k==='all');b.onclick=()=>setCat(k);cchips.appendChild(b)});
  $('cq').addEventListener('input',renderCon)}
function setCat(k){cc=k;cchips.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',x.dataset.k===k));renderCon()}
function renderCon(){const box=$('ccatalog');if(!box)return;box.innerHTML='';const q=$('cq').value.trim();let shown=0;
  const grid=cc==='all'&&!q;$('catTiles').hidden=!grid;box.hidden=grid;
  if(grid){$('catTiles').innerHTML=cats.map(([k,n])=>groupTile('cat',k,n,all.filter(s=>s.ent===k))).join('');return}
  if(cc!=='all')box.insertAdjacentHTML('beforeend',`<a class="btn sm ghost upto" href="#consult">${T.allCats}</a>`);
  cats.forEach(([k,n,about])=>{if(cc!=='all'&&cc!==k)return;const items=all.filter(s=>s.ent===k&&match(s,q));if(!items.length)return;shown+=items.length;
    const e=document.createElement('div');e.className='ent';e.id='c-'+k;e.innerHTML=`<h3><span class="code">${k}</span>${esc(n)}</h3>${about?`<p class="lead sm">${esc(about)}</p>`:''}`;
    const list=document.createElement('div');list.className='list';items.forEach(s=>list.appendChild(svcRow(s)));e.appendChild(list);box.appendChild(e)});
  if(!shown)box.insertAdjacentHTML('beforeend',`<div class="empty">${T.empty}</div>`)}

// ---- packages ----
let yearly=false;
function renderPlans(){
  const el=$('plans');el.innerHTML='';const tb=$('ptbody');tb.innerHTML='';
  DATA.PLANS.forEach(p=>{const v=p.n*AVG,ym=Math.round(p.y/12),md=Math.round(100*(1-p.m/v)),yd=Math.round(100*(1-ym/v));
    if(EN)p.en=(D._plans_en||{})[p.key]||{name:p.name,staff:p.staff,feat:p.feat};
    const d=document.createElement('div');d.className='plan'+(p.key==='full'?' feat':'')+(p.key==='elite'?' elite':'')+(p.key==='gold'?' gold':'');
    d.innerHTML=`${p.key==='gold'?`<span class="badge">${T.gold}</span>`:''}<h3>${T.plan(p)}</h3><span class="who">${EN?p.en.staff:p.staff}</span>
    <div class="amt num">${fmt(yearly?p.y:p.m)} <small>${T.cur} / ${yearly?T.year:T.month}</small></div>
    <div class="save">${yearly?T.ymSave(ym,yd):T.mSave(p.n,v,md)}</div>
    <ul>${(EN?p.en.feat:p.feat).map(f=>`<li>${f}</li>`).join('')}</ul>
    <a class="btn ${p.key!=='basic'?'pri':'ghost'}" href="#request">${T.subscribe(p)}</a>`;
    d.querySelector('a').onclick=()=>{$('fPlan').value=p.name;$('fType').value='org';syncPlan()};
    el.appendChild(d);
    tb.insertAdjacentHTML('beforeend',`<tr><td><b>${EN?p.en.name:'«'+p.name+'»'}</b></td><td class="num">${p.n}</td><td class="num">${fmt(v)}</td><td class="num"><b>${fmt(p.m)}</b></td><td class="num">${md}%</td><td class="num"><b>${fmt(p.y)}</b></td><td class="num">${yd}%</td><td class="num">${p.extra}%</td></tr>`)});
  $('bm').setAttribute('aria-pressed',!yearly);$('by').setAttribute('aria-pressed',yearly);
}
$('bm').onclick=()=>{yearly=false;renderPlans()};
$('by').onclick=()=>{yearly=true;renderPlans()};

// ---- estimator ----
const SAMPLE={'MI-01':2,'ML-01':1,'MH-01':2,'TR-01':1};
function renderCart(){
  const c=$('cart');c.innerHTML='';
  $('cartCount').textContent=cart.size?`(${cart.size})`:'';
  if(!cart.size)c.innerHTML=`<div class="empty">${T.cartEmpty}</div>`;
  cart.forEach((q,code)=>{const s=byCode[code];
    const r=document.createElement('div');r.className='ci';
    r.innerHTML=`<span>${esc(s.n)} <span class="code">${s.c}</span><small class="ent-n">${esc(s.entName)}${isOnce(s)?' · '+T.once:''}</small></span><span class="num lt">${fmt(s.p*q)}</span>`;
    const i=document.createElement('input');i.type='number';i.min=1;i.max=200;i.value=q;i.id='q-'+code;i.setAttribute('aria-label',T.qtyOf+s.n);
    i.oninput=()=>{const v=Math.max(1,Math.min(200,parseInt(i.value)||1));cart.set(code,v);r.querySelector('.lt').textContent=fmt(s.p*v);updateTotals()};
    const x=document.createElement('button');x.className='x';x.type='button';x.textContent='×';x.setAttribute('aria-label',T.rmA+s.n);x.onclick=()=>{cart.delete(code);renderCart();render();renderCon()};
    r.append(i,x);c.appendChild(r)});
  updateTotals();
}
function updateTotals(){
  // setup bundles and consultancy are one-time fees, so they stay out of the monthly comparison
  let single=0,u=0,out=0,once=0;cart.forEach((q,code)=>{const s=byCode[code];if(isOnce(s)){once+=s.p*q;return}single+=s.p*q;if(s.core)u+=units(s)*q;else out+=s.p*q});
  $('tSingle').textContent=fmt(single)+' '+T.cur;$('tUnits').textContent=u;$('tOut').textContent=fmt(out)+' '+T.cur;
  const v=$('verdict');
  if(!cart.size){v.textContent=T.addHint;return}
  const onceNote=once?'<br>'+T.onceNote(once):'';
  if(!single){v.innerHTML=onceNote.slice(4);return}
  const opts=[{name:T.payEach,cost:single}];
  DATA.PLANS.forEach(p=>{let pu=0,pv=0,po=0;cart.forEach((q,code)=>{const s=byCode[code];if(isOnce(s))return;if(covered(s,p)){pu+=weight(s)*q;pv+=s.p*q}else po+=s.p*q});
    const extraUnits=Math.max(0,pu-p.n);const avg=pu?pv/pu:AVG;
    const cost=p.m+Math.round(extraUnits*avg*(1-p.extra/100))+Math.round(po*(1-p.extra/100));opts.push({name:T.pkg(EN?((D._plans_en||{})[p.key]||{}).name||p.name:p.name),cost,p})});
  opts.sort((a,b)=>a.cost-b.cost);const best=opts[0];
  v.innerHTML=opts.map(o=>`${o===best?'<b>':''}${o.name}: ${fmt(o.cost)} ${T.perMonth}${o===best?T.best+'</b>':''}`).join('<br>')+(best.p?'<br>'+T.save(single-best.cost):'')+onceNote;
}
$('clear').onclick=()=>{cart.clear();renderCart();render();renderCon()};
$('sample').onclick=()=>{cart.clear();Object.entries(SAMPLE).forEach(([k,q])=>cart.set(k,q));renderCart();render();renderCon()};
const cartText=()=>[...cart].map(([c,q])=>`${byCode[c].n} (${c}) × ${q}`).join('\n');
$('toReq').onclick=()=>{$('fSvc').value=cartText()};
// full service pickers (calculator + request form), grouped by authority and consultancy type
function fillPicker(sel){[...ents,...cats].forEach(([k,n])=>{const g=document.createElement('optgroup');g.label=n;all.filter(s=>s.ent===k).forEach(s=>{const o=document.createElement('option');o.value=s.c;o.textContent=`${s.n} · ${s.from?T.from+' ':''}${fmt(s.p)} ${T.cur}`;g.appendChild(o)});sel.appendChild(g)})}
function pickAdd(code){cart.set(code,(cart.get(code)||0)+1);render();renderCon();renderCart();toast(T.pickAdded+byCode[code].n)}
const pick=$('pick'),fPick=$('fPick');fillPicker(pick);fillPicker(fPick);
pick.onchange=()=>{if(pick.value)pickAdd(pick.value);pick.value=''};
// the calculator starts with an example; picking a service in the form should not drag the example into the request
const isSample=()=>cart.size===Object.keys(SAMPLE).length&&Object.entries(SAMPLE).every(([k,q])=>cart.get(k)===q);
fPick.onchange=()=>{if(fPick.value){if(!$('fSvc').value.trim()&&isSample())cart.clear();pickAdd(fPick.value);$('fSvc').value=cartText()}fPick.value=''};

// ---- service details dialog ----
const dlg=$('dlg');
function openSvc(code){const s=byCode[code];if(!s||!dlg)return;const d=s.d||{};
  const steps=String(s.inc||'').split(/[،,]\s*/).filter(Boolean);
  $('dlgBody').innerHTML=`<div class="dhead"><span class="code">${s.c}</span><small>${esc(s.entName)}</small></div><h3 id="dlgT">${esc(s.n)}</h3>
   <div class="dprice">${T.fee}: ${priceHTML(s)}${isOnce(s)&&s.kind==='setup'?` <small>${T.once}</small>`:''}${s.core?` <span class="tag">${T.core}</span>`:''}</div>
   ${d.about?`<h4>${T.about}</h4><p>${esc(d.about)}</p>`:''}
   <h4>${T.inc}</h4><ol>${steps.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
   ${d.docs&&d.docs.length?`<h4>${T.docs}</h4><ul>${d.docs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
   ${d.out?`<h4>${T.out}</h4><p>${esc(d.out)}</p>`:''}
   ${d.time?`<h4>${T.time}</h4><p>${esc(d.time)}</p>`:''}
   ${d.note?`<p class="dnote">${esc(d.note)}</p>`:''}
   ${s.kind!=='consult'?`<p class="mute sm">${T.govFee}</p>`:''}`;
  const a=$('dlgAdd');a.textContent=cart.has(code)?T.inCalc:T.addCalc;a.onclick=()=>{if(!cart.has(code))toggleCart(code);a.textContent=T.inCalc};
  $('dlgReq').onclick=()=>{if(!cart.has(code))cart.set(code,1);renderCart();render();renderCon();$('fSvc').value=cartText();dlg.close();if(location.hash==='#request')route();else location.hash='request'};
  if(dlg.showModal){if(!dlg.open)dlg.showModal()}else dlg.setAttribute('open','')}
if(dlg){$('dlgX').onclick=()=>dlg.close();dlg.addEventListener('click',e=>{if(e.target===dlg)dlg.close()})}

// ---- one view at a time: home shows the main cards, each card opens its own page; hash keeps the back button working ----
const VIEWS=['services','packages','estimate','how','request','about','faq'];
const secs=Object.fromEntries(VIEWS.map(v=>[v,$(v)]));
let view=null;
function crumbs(trail){const c=$('crumbs');c.hidden=!trail.length;if(!trail.length)return;
  const parts=[[T.home,'#home'],...trail];
  $('crumbList').innerHTML=parts.map(([t,h],i)=>`<li>${i<parts.length-1?`<a href="${h}">${esc(t)}</a>`:`<span aria-current="page">${esc(t)}</span>`}</li>`).join('');
  // step back through history when we came from the parent page, so the browser back button stays in step
  $('back').onclick=()=>{const up=parts[parts.length-2][1];if(cameFrom===up||(up==='#home'&&cameFrom===''))history.back();else location.hash=up}}
let cameFrom=null,here=location.hash;
window.addEventListener('hashchange',e=>{cameFrom=here;here=location.hash});
function show(v,trail){const home=v==='home';here=location.hash;
  $('home').hidden=!home;$('tiles').hidden=!home;
  VIEWS.forEach(k=>secs[k].hidden=k!==v);
  crumbs(home?[]:trail||[[T.sec[v],'#'+v]]);
  document.title=(home?'':T.sec[v]+' | ')+TITLE;
  window.scrollTo({top:0,behavior:'instant'});view=v}
const TITLE=document.title.split(' | ')[0];
document.addEventListener('click',e=>{const a=e.target.closest('a[href^="#"]');if(!a)return;const h=a.getAttribute('href');
  if(/^#svc=/.test(h)){e.preventDefault();openSvc(h.slice(5));return}
  if(h===location.hash){e.preventDefault();route(h)}});
function route(h){h=h||location.hash||'#home';let m;
  if(dlg&&dlg.open)dlg.close();
  if((m=h.match(/^#svc=([A-Z]{2}-\d{2})$/))&&byCode[m[1]]){const s=byCode[m[1]];
    // a shared service link opens its group behind the details
    history.replaceState(null,'',(s.kind==='consult'?'#cat=':'#ent=')+s.ent);route();openSvc(m[1]);return}
  if((m=h.match(/^#ent=([A-Z]{2})$/))&&ents.some(x=>x[0]===m[1])){$('q').value='';setEnt(m[1]);
    show('services',[[T.sec.services,'#services'],[ents.find(x=>x[0]===m[1])[1],h]]);return}
  if((m=h.match(/^#cat=([A-Z]{2})$/))&&cats.some(x=>x[0]===m[1])){$('cq').value='';setCat(m[1]);
    show('consult',[[T.sec.consult,'#consult'],[cats.find(x=>x[0]===m[1])[1],h]]);return}
  if(h==='#prices'){$('q').value='';full=true;setEnt('all');show('services',[[T.sec.services,'#services'],[T.prices,h]]);return}
  full=false;
  const v=h.slice(1);
  if(v==='services'){if(!$('q').value.trim())setEnt('all')}
  if(v==='consult'){if(!$('cq').value.trim())setCat('all')}
  show(VIEWS.includes(v)?v:'home')}
window.addEventListener('hashchange',()=>route());
// the home search looks through every service and consultancy
$('hs')&&$('hs').addEventListener('submit',e=>{e.preventDefault();const q=$('hq').value.trim();$('q').value=q;ent='all';
  if(location.hash==='#services')route('#services');else location.hash='services';render()});

// ---- request form: sends to the office system when configured, WhatsApp always available ----
const fType=$('fType'),fPlan=$('fPlan');
function syncPlan(){const ind=fType.value==='ind';if(ind)fPlan.value='';fPlan.disabled=ind}
fType.addEventListener('change',syncPlan);fPlan.addEventListener('change',()=>{if(fPlan.value)fType.value='org'});syncPlan();
$('f').addEventListener('submit',async e=>{e.preventDefault();
  const n=$('fName').value.trim(),ph=$('fPhone').value.replace(/\s/g,''),sv=$('fSvc').value.trim(),em=$('fMail').value.trim();
  let ok=true;
  $('eName').textContent=n?'':T.eName;if(!n)ok=false;
  const phOk=/^(\+?974)?[3567]\d{7}$/.test(ph)||/^(\+|00)[1-9]\d{7,14}$/.test(ph);$('ePhone').textContent=phOk?'':T.ePhone;if(!phOk)ok=false;
  const emOk=!em||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);$('eMail').textContent=emOk?'':T.eMail;if(!emOk)ok=false;
  $('eSvc').textContent=sv?'':T.eSvc;if(!sv)ok=false;
  const agree=!$('fOk')||$('fOk').checked;$('eOk')&&($('eOk').textContent=agree?'':T.eOk);if(!agree)ok=false;
  if(!ok)return;
  const via=$('fVia')?$('fVia').value:'';const plan=fPlan.value?fPlan.options[fPlan.selectedIndex].text:'',typeTxt=fType.options[fType.selectedIndex].text;
  const msg=`${T.msgHead}\n${T.lName}: ${n}\n${T.lPhone}: ${ph}\n${em?T.lMail+': '+em+'\n':''}${T.lType}: ${typeTxt}\n${via?T.lVia+': '+via+'\n':''}${plan?T.lPlan+': '+plan+'\n':''}${T.lSvc}:\n${sv}`;
  $('out').textContent=msg;$('sendWa').href=`https://wa.me/${WA}?text=`+encodeURIComponent(msg);
  $('sendMail')&&($('sendMail').href=`mailto:${MAIL}?subject=`+encodeURIComponent('طلب عرض سعر - منجز: '+n)+'&body='+encodeURIComponent(msg));
  const st=$('sendState');$('outWrap').hidden=false;
  if(CFG.API){st.hidden=false;st.className='verdict';st.textContent=T.sending;
    try{const r=await fetch(CFG.API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'request',name:n,phone:ph,email:em,type:typeTxt,plan,contact:via,services:sv,codes:[...new Set([...sv.matchAll(/\(([A-Z]{2}-\d{2})\)/g)].map(m=>m[1]))],lang:EN?'en':'ar',page:location.href,hp:$('fHp').value})});
      const j=await r.json();if(!j.ok)throw new Error(j.error);st.className='verdict ok';st.innerHTML=T.sentOk(j.id,j.mailed);$('outTitle').hidden=true;$('outMsg').hidden=true}
    catch(err){st.className='verdict';st.textContent=T.sentFail}}
  else{st.hidden=true}
  $('outWrap').scrollIntoView({block:'nearest'});
});
function copy(text,el){(navigator.clipboard?navigator.clipboard.writeText(text):Promise.reject()).then(()=>toast(T.copied)).catch(()=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);toast(T.copyHand)})}
$('copyMsg').onclick=()=>copy($('out').textContent,$('out'));
$('waFab')&&($('waFab').href='https://wa.me/'+WA);
$('copyPh').onclick=()=>copy('+'+WA,$('ph'));
Object.entries(SAMPLE).forEach(([k,q])=>cart.set(k,q));
buildMenu();render();renderCon();renderPlans();renderCart();
route();
// keep the breadcrumb bar just under the sticky header
const setHH=()=>document.documentElement.style.setProperty('--hh',document.querySelector('header.top').offsetHeight+'px');setHH();addEventListener('resize',setHH);
addEventListener('load',()=>{if(location.hash&&!/^#svc=/.test(location.hash))window.scrollTo({top:0,behavior:'instant'})});
