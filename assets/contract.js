'use strict';
// Service contract page (contract.html): staff open it from the client file in the admin panel, clients from «حسابي».
// The opener leaves the client's details in localStorage (KEY, with the time) and this page reads and removes them at once (ignored after 5 minutes). Nothing is sent to any server;
// every value is written into the contract with textContent only.
(function(){
const CFG=window.MUNJIZ_CONFIG||{};
const CO={ar:'منجز لخدمات الأعمال ذ.م.م',en:'Munjiz Business Services LLC',sign_ar:'د. مصطفى أبوسعد',sign_en:'Dr. Moustafa Abousaad',
  title_ar:'المدير العام',title_en:'General Manager',addr_ar:'الدوحة، دولة قطر',addr_en:'Doha, State of Qatar',cr:'',
  phone:CFG.PHONE||'+974 5160 0498',email:CFG.EMAIL||'munijizqa@gmail.com',prefix:'MNJ-CT'};
const KEY='munjiz_contract',DRAFT=KEY+'_draft';
// item registration: fee per item (includes the first 5 sales outlets) plus a fee per item in every extra outlet
const ITEM={code:'MC-06',min:50,incl:5,outletCode:'MC-07',outlet:5};
const BLANK='____________';
const $=id=>document.getElementById(id),f=$('cf'),E=f.elements;
const fmt=n=>(Math.round((Number(n)||0)*100)/100).toLocaleString('en-US');
const num=(v,lo,hi)=>{v=Number(v);if(!isFinite(v))v=0;return Math.min(hi,Math.max(lo,v))};
const str=(v,n)=>String(v==null?'':v).replace(/[\u0000-\u001f]/g,' ').slice(0,n||200);
const pad=n=>String(n).padStart(2,'0');
const dmy=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(iso||'');return m?`${m[3]}/${m[2]}/${m[1]}`:''};
const today=()=>{const d=new Date();return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`};
// +974 XXXX XXXX for Qatari numbers, anything else as typed
const phone=v=>{const d=String(v||'').replace(/\D/g,'');const l=d.length>=8&&(d.length===8||d.startsWith('974'))?d.slice(-8):'';return l?`+974 ${l.slice(0,4)} ${l.slice(4)}`:str(v,20)};
let EN=false,rows=[];

// the price list, for the service picker
const SVC={};
(function(){const D=window.DETAILS||{},T=typeof DATA!=='undefined'?DATA:null,sel=$('pick');if(!T)return;
  const add=(label,list)=>{const og=document.createElement('optgroup');og.label=label;list.forEach(s=>{SVC[s.c]=s;const o=document.createElement('option');o.value=s.c;o.textContent=`${s.c} · ${s.n} · ${fmt(s.p)}`;og.appendChild(o)});if(list.length)sel.appendChild(og)};
  (T.G||[]).forEach(([k,n,l])=>add(n,l.map(s=>({c:s[0],n:s[1],en:((D[s[0]]||{}).en||{}).name||'',p:s[3]}))));
  if(T.SETUP)add('باقات التأسيس',T.SETUP.map(s=>({c:s[0],n:s[1],en:((D[s[0]]||{}).en||{}).name||'',p:s[3]})));
  (T.CONSULT||[]).forEach(k=>add(k.ar,(k.items||[]).map(i=>({c:i.c,n:i.ar.n,en:(i.en||{}).n||'',p:i.p}))));
  const it=SVC[ITEM.code],ot=SVC[ITEM.outletCode];if(it&&it.p>ITEM.min)ITEM.min=it.p;if(ot)ITEM.outlet=ot.p;
  $('iPrice').value=$('iPrice').min=ITEM.min})();

function rowEl(r,i){const tr=document.createElement('tr');
  const cell=(name,type,val,attrs)=>{const td=document.createElement('td'),inp=document.createElement('input');inp.type=type;inp.value=val;inp.dataset.k=name;inp.dataset.i=i;
    Object.entries(attrs||{}).forEach(([a,v])=>inp.setAttribute(a,v));td.appendChild(inp);return td};
  tr.append(cell('c','text',r.c,{maxlength:12,dir:'ltr',size:6,'aria-label':'الرمز'}),cell('n','text',r.n,{maxlength:200,'aria-label':'الخدمة'}),
    cell('q','number',r.q,{min:1,max:100000,'aria-label':'العدد'}),cell('p','number',r.p,{min:0,max:10000000,step:'any','aria-label':'الأتعاب للوحدة'}));
  const tot=document.createElement('td');tot.className='num';tot.textContent=fmt(r.q*r.p);
  const del=document.createElement('td'),b=document.createElement('button');b.type='button';b.className='btn sm ghost';b.dataset.del=i;b.textContent=EN?'Remove':'حذف';del.appendChild(b);
  tr.append(tot,del);return tr}
function drawRows(){const tb=$('rows');tb.textContent='';rows.forEach((r,i)=>tb.appendChild(rowEl(r,i)))}
function total(){return rows.reduce((a,r)=>a+r.q*r.p,0)}

function calcItems(){const n=num($('iItems').value,0,100000),o=num($('iOutlets').value,0,1000),p=Math.max(ITEM.min,num($('iPrice').value,0,100000));
  const x=Math.max(0,o-ITEM.incl),a=n*p,b=n*x*ITEM.outlet;return {n,o,x,p,a,b,t:a+b}}
function showCalc(){const c=calcItems(),el=$('iOut');
  el.textContent=EN?`${c.n} items × QAR ${fmt(c.p)} (first ${ITEM.incl} outlets included) = ${fmt(c.a)} · ${c.n} items × ${c.x} extra outlets × QAR ${ITEM.outlet} = ${fmt(c.b)} · Total fees QAR ${fmt(c.t)} (government fees excluded)`
    :`${c.n} صنفاً × ${fmt(c.p)} ر.ق (تشمل أول ${ITEM.incl} منافذ) = ${fmt(c.a)} · ${c.n} صنفاً × ${c.x} منفذاً إضافياً × ${ITEM.outlet} ر.ق = ${fmt(c.b)} · إجمالي الأتعاب ${fmt(c.t)} ر.ق (دون الرسوم الحكومية)`}

function vals(){const o={};['no','date','start','days','cName','cCr','cEst','cAddr','cRep','cRepTitle','cQid','cPhone','cEmail','special'].forEach(k=>o[k]=E[k].value.trim());return o}
function render(){const v=vals(),t=total();
  const put=(k,val)=>document.querySelectorAll(`#doc [data-f="${k}"]`).forEach(el=>{el.textContent=val||BLANK;el.classList.toggle('blank',!val)});
  ['no','cName','cCr','cEst','cAddr','cRep','cRepTitle','cQid','cEmail','special'].forEach(k=>put(k,v[k]));
  put('cPhone',v.cPhone?phone(v.cPhone):'');put('dateTxt',dmy(v.date));put('startTxt',dmy(v.start));put('daysTxt',v.days?String(num(v.days,1,720)):'');
  $('specialWrap').hidden=!v.special;
  const tb=$('aRows');tb.textContent='';
  rows.filter(r=>r.n||r.c).forEach((r,i)=>{const tr=document.createElement('tr');
    [String(i+1),r.c,r.n,fmt(r.q),fmt(r.p),fmt(r.q*r.p)].forEach((x,j)=>{const td=document.createElement('td');td.textContent=x;if(j===1)td.dir='ltr';if(j>2)td.className='num';tr.appendChild(td)});
    const en=r.en||(SVC[r.c]&&SVC[r.c].en);if(en){const s=document.createElement('small');s.dir='ltr';s.textContent=en;tr.children[2].append(document.createElement('br'),s)}
    tb.appendChild(tr)});
  if(!tb.children.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.className='mute';td.textContent='لم تُضف خدمات بعد · No services added yet';tr.appendChild(td);tb.appendChild(tr)}
  const p1=Math.round(t*0.5*100)/100,p2=Math.round(t*0.25*100)/100;
  $('aTotal').textContent=fmt(t);$('p1').textContent=fmt(p1);$('p2').textContent=fmt(p2);$('p3').textContent=fmt(Math.round((t-p1-p2)*100)/100);
  const ir=rows.find(r=>r.c===ITEM.code),or=rows.find(r=>r.c===ITEM.outletCode);
  $('calcNote').textContent=ir&&or?`طريقة الحساب: ${fmt(ir.q)} صنفاً × ${fmt(ir.p)} ر.ق + ${fmt(or.q)} تسجيلاً في منافذ بيع إضافية بعد أول 5 منافذ × ${fmt(or.p)} ر.ق.\nCalculation: ${fmt(ir.q)} items × QAR ${fmt(ir.p)} + ${fmt(or.q)} extra outlet registrations beyond the first 5 × QAR ${fmt(or.p)}.`:'';
  const ok=$('agree').checked&&$('agreeName').value.trim(),es=$('esign');es.hidden=!ok;
  if(ok){const d=new Date();es.textContent=`موافقة إلكترونية · Accepted electronically: ${str($('agreeName').value.trim(),120)} · ${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`}
  save()}
function save(){try{sessionStorage.setItem(DRAFT,JSON.stringify({v:vals(),rows}))}catch(e){}}

function load(o){if(!o||typeof o!=='object')return;const c=o.client||o.v||{},map={name:'cName',cName:'cName',cr:'cCr',cCr:'cCr',estCard:'cEst',cEst:'cEst',address:'cAddr',cAddr:'cAddr',
    rep:'cRep',cRep:'cRep',repTitle:'cRepTitle',cRepTitle:'cRepTitle',qid:'cQid',cQid:'cQid',phone:'cPhone',cPhone:'cPhone',email:'cEmail',cEmail:'cEmail',
    no:'no',date:'date',start:'start',days:'days',special:'special'};
  Object.entries(c).forEach(([k,v])=>{const n=map[k];if(n&&E[n]&&typeof v!=='object')E[n].value=str(v,n==='special'?1500:200)});
  const list=Array.isArray(o.items)?o.items:Array.isArray(o.rows)?o.rows:[];
  rows=list.slice(0,80).map(r=>({c:str(r.c||r.code,12),n:str(r.n||r.name,200),en:str(r.en,200),q:num(r.q||r.qty||1,1,100000),p:num(r.p!=null?r.p:r.price,0,10000000)})).filter(r=>r.c||r.n)}

function addRow(r){const i=rows.findIndex(x=>x.c&&x.c===r.c);if(i>=0)rows[i]=Object.assign(rows[i],r);else rows.push(r);drawRows();render()}

// UI language (the contract itself is always in both languages)
function ui(en){EN=en;document.documentElement.lang=en?'en':'ar';document.documentElement.dir=en?'ltr':'rtl';document.body.style.direction=en?'ltr':'rtl';
  document.querySelectorAll('[data-en]').forEach(el=>{if(!el.dataset.ar)el.dataset.ar=el.textContent;el.textContent=en?el.dataset.en:el.dataset.ar});
  $('uiLang').textContent=en?'عربي':'English';$('uiLang').lang=en?'ar':'en';try{localStorage.setItem('munjiz_lang_ui',en?'en':'ar')}catch(e){}
  drawRows();showCalc()}

// start: a hand-off from the admin panel or «حسابي» wins over a draft left in this tab
let hand=null;try{hand=JSON.parse(localStorage.getItem(KEY)||'null');localStorage.removeItem(KEY);if(!hand||!(Date.now()-(+hand.at||0)<300000))hand=null}catch(e){}
let draft=null;try{draft=JSON.parse(sessionStorage.getItem(DRAFT)||'null')}catch(e){}
if(hand)load(hand);else if(draft)load(draft);
const d=new Date();
if(!E.no.value)E.no.value=`${CO.prefix}-${String(d.getFullYear()).slice(2)}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
if(!E.date.value)E.date.value=today();if(!E.start.value)E.start.value=E.date.value;if(!E.days.value)E.days.value='15';
document.querySelectorAll('#doc [data-co]').forEach(el=>{const k=el.dataset.co,v=k==='phone'?phone(CO.phone):CO[k];el.textContent=v||BLANK;el.classList.toggle('blank',!v)});
if(new URLSearchParams(location.search).get('by')!=='client')document.querySelector('.accept').classList.add('office');
drawRows();showCalc();render();
let pre=null;try{pre=localStorage.getItem('munjiz_lang_ui')}catch(e){}if(pre==='en'||new URLSearchParams(location.search).get('lang')==='en')ui(true);

f.addEventListener('input',e=>{const t=e.target;if(t.dataset.k){const r=rows[+t.dataset.i];if(!r)return;
    r[t.dataset.k]=t.dataset.k==='q'?num(t.value,1,100000):t.dataset.k==='p'?num(t.value,0,10000000):str(t.value,t.dataset.k==='c'?12:200);
    if(t.dataset.k==='c'||t.dataset.k==='n')r.en='';t.closest('tr').querySelector('.num').textContent=fmt(r.q*r.p)}
  if(/^i(Items|Outlets|Price)$/.test(t.id))showCalc();render()});
f.addEventListener('click',e=>{const b=e.target.closest('[data-del]');if(b){rows.splice(+b.dataset.del,1);drawRows();render()}});
$('pick').onchange=e=>{const s=SVC[e.target.value];if(s)addRow({c:s.c,n:s.n,en:s.en,q:1,p:s.p});e.target.value=''};
$('addRow').onclick=()=>{rows.push({c:'',n:'',en:'',q:1,p:0});drawRows();render()};
$('iAdd').onclick=()=>{const c=calcItems(),it=SVC[ITEM.code]||{},ot=SVC[ITEM.outletCode]||{};if(!c.n){toast(EN?'Enter the number of items':'أدخل عدد الأصناف');return}
  addRow({c:ITEM.code,n:it.n||'شهادة تسجيل صنف: بياناته وسعره (لكل صنف)',en:it.en||'Item Registration Certificate (per item)',q:c.n,p:c.p});
  if(c.x)addRow({c:ITEM.outletCode,n:ot.n||'منفذ بيع إضافي بعد المنافذ الخمسة (لكل صنف في كل منفذ إضافي)',en:ot.en||'Extra sales outlet beyond the first 5',q:c.n*c.x,p:ITEM.outlet});
  else{rows=rows.filter(r=>r.c!==ITEM.outletCode);drawRows();render()}
  toast(EN?'Added to Annex (1)':'أُضيفت إلى الملحق رقم (1)')};
$('agree').onchange=render;
$('doPrint').onclick=()=>{if(!E.cName.value.trim()){toast(EN?'Enter the client company name first':'أدخل اسم الشركة العميلة أولاً');E.cName.focus();return}
  if(!rows.some(r=>r.n||r.c)){toast(EN?'Add at least one service':'أضف خدمة واحدة على الأقل');return}render();window.print()};
$('doClear').onclick=()=>{if(!confirm(EN?'Clear all data on this page?':'مسح كل البيانات في هذه الصفحة؟'))return;try{sessionStorage.removeItem(DRAFT)}catch(e){}location.href=location.pathname+location.search};
$('uiLang').onclick=()=>ui(!EN);
function toast(t){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2600)}
})();
