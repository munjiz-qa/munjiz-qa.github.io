'use strict';
// Admin: services, prices and packages (الإعدادات ← الخدمات والأسعار).
// Edits a working copy of the catalogue (data.js + details.js, or the version saved on the server), shows or hides services,
// whole authorities/fields and packages for clients, then publishes it with the 'saveCatalog' action.
// The public pages read it through assets/catalog.js. Uses helpers from crm.js ($, esc, L, EN, toast, ask, S, REMOTE, isAdmin, fmt, VIEWS).
(function(){
let CT=null,dirty=false,curG=null;
const KIND={gov:L('الجهات','Authorities'),consult:L('مجالات الاستشارات','Consulting fields'),setup:L('حزم الخدمات','Service bundles'),plans:L('الباقات الشهرية','Monthly packages')};
const lines=v=>String(v||'').split('\n').map(x=>x.trim()).filter(Boolean);
function load(){CT=window.CATALOG.raw();CT.data.CONSULT=CT.data.CONSULT||[];const d=CT.details;d._hidden=d._hidden||{};['s','g','p'].forEach(k=>d._hidden[k]=d._hidden[k]||[]);d._entities=d._entities||{};d._plans_en=d._plans_en||{};dirty=false}
const H=k=>CT.details._hidden[k];
const isOn=(k,code)=>!H(k).includes(code);
function setOn(k,code,on){const a=H(k),i=a.indexOf(code);if(on&&i>=0)a.splice(i,1);if(!on&&i<0)a.push(code);dirty=true}
// groups of the chosen section, in one shape: {code, ar, en, items:[{c, name, p, core}]}
function groups(kind){const D=CT.data,X=CT.details;
  if(kind==='gov')return D.G.map(g=>({code:g[0],ar:g[1],en:X._entities[g[0]]||'',items:g[2].map(s=>({c:s[0],name:EN&&((X[s[0]]||{}).en||{}).name||s[1],p:s[3],core:!!s[4]}))}));
  if(kind==='setup')return [{code:'PK',ar:'حزم الخدمات',en:X._entities.PK||'Service bundles',fixed:true,items:D.SETUP.map(s=>({c:s[0],name:EN&&((X[s[0]]||{}).en||{}).name||s[1],p:s[3]}))}];
  if(kind==='consult')return (D.CONSULT||[]).map(k=>({code:k.code,ar:k.ar,en:k.en,items:k.items.map(s=>({c:s.c,name:EN&&(s.en||{}).n||s.ar.n,p:s.p,from:s.from}))}));
  return []}
function allCodes(){const o=new Set();CT.data.G.forEach(g=>g[2].forEach(s=>o.add(s[0])));CT.data.SETUP.forEach(s=>o.add(s[0]));(CT.data.CONSULT||[]).forEach(k=>k.items.forEach(s=>o.add(s.c)));return o}
function state(){const n=allCodes().size,off=H('s').length;$('ctState').textContent=(dirty?L('تعديلات غير منشورة · ','Unpublished changes · '):'')+L(`${n} خدمة، المخفي منها ${off}`,`${n} services, ${off} hidden`)+(H('g').length?L(` · جهات مخفية ${H('g').length}`,` · hidden groups ${H('g').length}`):'');
  $('ctSave').disabled=!dirty;$('ctUndo').disabled=!dirty}
function render(){if(!isAdmin())return;if(!CT)load();const kind=$('ctK').value,q=$('ctQ').value.trim().toLowerCase();state();
  const plans=kind==='plans';$('ctGT').textContent=KIND[kind];$('ctAddG').hidden=kind==='setup';document.querySelector('.ctgrid').classList.toggle('one',plans||kind==='setup');
  if(plans){$('ctG').innerHTML='';$('ctST').textContent=KIND.plans;$('ctGOn').hidden=$('ctGOff').hidden=true;$('ctAddS').textContent=L('إضافة باقة','Add package');
    $('ctS').innerHTML=`<table><thead><tr><th>${L('ظاهرة','Shown')}</th><th>${L('الباقة','Package')}</th><th class="num">${L('خدمات شهرياً','Services a month')}</th><th class="num">${L('شهرياً','Monthly')}</th><th class="num">${L('سنوياً','Yearly')}</th><th></th></tr></thead><tbody>${CT.data.PLANS.map((p,i)=>`<tr><td><input type="checkbox" data-pon="${esc(p.key)}" ${isOn('p',p.key)?'checked':''} aria-label="${L('ظاهرة للعملاء','Shown to clients')}"></td><td><b>${esc(EN&&(CT.details._plans_en[p.key]||{}).name||p.name)}</b></td><td class="num">${p.n}</td><td class="num">${fmt(p.m)}</td><td class="num">${fmt(p.y)}</td><td><button class="btn xs ghost" type="button" data-pe="${i}">${L('تعديل','Edit')}</button></td></tr>`).join('')}</tbody></table>`;return}
  $('ctGOn').hidden=$('ctGOff').hidden=false;$('ctAddS').textContent=L('إضافة خدمة','Add service');
  const gs=groups(kind);if(!gs.some(g=>g.code===curG))curG=gs[0]?gs[0].code:null;
  $('ctG').innerHTML=gs.map(g=>{const on=g.items.filter(s=>isOn('s',s.c)).length;return `<li class="${g.code===curG?'on':''} ${isOn('g',g.code)?'':'off'}"><input type="checkbox" data-gon="${esc(g.code)}" ${isOn('g',g.code)?'checked':''} aria-label="${L('ظاهرة للعملاء','Shown to clients')}"><button type="button" class="lnk" data-gsel="${esc(g.code)}">${esc(EN&&g.en||g.ar)}</button><small class="num mute">${on}/${g.items.length}</small>${g.fixed?'':`<button class="btn xs ghost" type="button" data-ge="${esc(g.code)}" aria-label="${L('تعديل','Edit')}">✎</button>`}</li>`}).join('')||`<li class="mute">${L('لا يوجد','None')}</li>`;
  let list;if(q){list=[];gs.forEach(g=>g.items.forEach(s=>{if((s.c+' '+s.name).toLowerCase().includes(q))list.push(Object.assign({g:g.code},s))}));$('ctST').textContent=L(`نتائج البحث (${list.length})`,`Search results (${list.length})`)}
  else{const g=gs.find(x=>x.code===curG);list=g?g.items.map(s=>Object.assign({g:g.code},s)):[];$('ctST').textContent=g?(EN&&g.en||g.ar):''}
  $('ctS').innerHTML=list.length?`<table><thead><tr><th>${L('ظاهرة','Shown')}</th><th>${L('الرمز','Code')}</th><th>${L('الخدمة','Service')}</th><th class="num">${L('السعر','Price')}</th><th></th></tr></thead><tbody>${list.map(s=>`<tr class="${isOn('s',s.c)&&isOn('g',s.g)?'':'muted'}"><td><input type="checkbox" data-son="${esc(s.c)}" ${isOn('s',s.c)?'checked':''} aria-label="${L('ظاهرة للعملاء','Shown to clients')}"></td><td class="num" dir="ltr">${esc(s.c)}</td><td>${esc(s.name)}${s.core?` <span class="k">${L('رئيسية','Core')}</span>`:''}</td><td class="num">${s.from?L('من ','from '):''}${fmt(s.p)}</td><td><button class="btn xs ghost" type="button" data-se="${esc(s.c)}">${L('تعديل','Edit')}</button></td></tr>`).join('')}</tbody></table>`:`<div class="empty">${L('لا توجد خدمات هنا بعد.','No services here yet.')}</div>`}
VIEWS.cat=render;
$('ctK').onchange=()=>{curG=null;$('ctQ').value='';render()};$('ctQ').oninput=render;
$('ctG').addEventListener('click',e=>{const s=e.target.closest('[data-gsel]');if(s){curG=s.dataset.gsel;$('ctQ').value='';render();return}const ed=e.target.closest('[data-ge]');if(ed)openGroup(ed.dataset.ge)});
$('ctG').addEventListener('change',e=>{const c=e.target.closest('[data-gon]');if(c){setOn('g',c.dataset.gon,c.checked);render()}});
$('ctS').addEventListener('change',e=>{const c=e.target.closest('[data-son]'),p=e.target.closest('[data-pon]');if(c)setOn('s',c.dataset.son,c.checked);if(p)setOn('p',p.dataset.pon,p.checked);render()});
$('ctS').addEventListener('click',e=>{const b=e.target.closest('[data-se]');if(b)openSvc(b.dataset.se);const p=e.target.closest('[data-pe]');if(p)openPlan(+p.dataset.pe)});
const bulk=(on,only)=>{const kind=$('ctK').value;if(kind==='plans'){CT.data.PLANS.forEach(p=>setOn('p',p.key,on));render();return}
  groups(kind).filter(g=>!only||g.code===only).forEach(g=>{if(!only)setOn('g',g.code,on);g.items.forEach(s=>setOn('s',s.c,on))});render()};
$('ctAllOn').onclick=()=>bulk(true);$('ctAllOff').onclick=()=>bulk(false);$('ctGOn').onclick=()=>curG&&bulk(true,curG);$('ctGOff').onclick=()=>curG&&bulk(false,curG);
// ---- one service ----
let edS=null;
function findSvc(c){const D=CT.data;for(const g of D.G){const i=g[2].findIndex(s=>s[0]===c);if(i>=0)return {kind:'gov',g:g[0],arr:g[2],i}}
  let i=D.SETUP.findIndex(s=>s[0]===c);if(i>=0)return {kind:'setup',g:'PK',arr:D.SETUP,i};
  for(const k of (D.CONSULT||[])){i=k.items.findIndex(s=>s.c===c);if(i>=0)return {kind:'consult',g:k.code,arr:k.items,i}}return null}
function openSvc(c){const kind=$('ctK').value,f=$('fSv'),E=f.elements;f.reset();$('svErr').textContent='';const at=c?findSvc(c):null;edS=at;const k=at?at.kind:kind;
  f.querySelectorAll('.sv-c').forEach(x=>x.hidden=k!=='consult');f.querySelectorAll('.sv-g').forEach(x=>x.hidden=k!=='gov');
  f.querySelectorAll('.sv-nl')[0].textContent=k==='consult'?L('ما تستلمه بالعربية','What you receive (Arabic)'):L('ملاحظة بالعربية','Note (Arabic)');f.querySelectorAll('.sv-nl')[1].textContent=k==='consult'?L('ما تستلمه بالإنجليزية','What you receive (English)'):L('ملاحظة بالإنجليزية','Note (English)');
  E.g.innerHTML=groups(k).map(g=>`<option value="${esc(g.code)}">${esc(EN&&g.en||g.ar)}</option>`).join('');E.g.value=at?at.g:(curG||E.g.value);E.g.disabled=k==='setup';
  if(at){let ar={},en={};if(k==='consult'){const s=at.arr[at.i];ar=s.ar||{};en=s.en||{};E.c.value=s.c;E.p.value=s.p;E.from.checked=!!s.from;E.uAr.value=s.unit_ar||'';E.uEn.value=s.unit_en||'';E.nAr.value=ar.n||'';E.nEn.value=en.n||'';E.noteAr.value=ar.out||'';E.noteEn.value=en.out||''}
    else{const s=at.arr[at.i],X=CT.details[s[0]]||{};ar=X.ar||{};en=X.en||{};E.c.value=s[0];E.nAr.value=s[1];E.incAr.value=s[2]||'';E.p.value=s[3];E.core.checked=!!s[4];E.nEn.value=en.name||'';E.noteAr.value=ar.note||'';E.noteEn.value=en.note||''}
    if(k==='consult'){E.incAr.value=ar.inc||''}E.incEn.value=en.inc||'';E.aboutAr.value=ar.about||'';E.aboutEn.value=en.about||'';E.docsAr.value=(ar.docs||[]).join('\n');E.docsEn.value=(en.docs||[]).join('\n');E.timeAr.value=ar.time||'';E.timeEn.value=en.time||'';E.on.checked=isOn('s',c)}
  else{E.c.value=nextCode(k==='setup'?'PK':(E.g.value||'XX'));E.on.checked=true}
  E.g.onchange=()=>{if(!edS)E.c.value=nextCode(E.g.value)};
  $('dlgSvT').textContent=at?L('تعديل خدمة','Edit service'):L('خدمة جديدة','New service');$('svDel').hidden=!at;edS=at?Object.assign({c,kind:k},at):{kind:k};$('dlgSv').showModal()}
function nextCode(p){const n=[...allCodes()].filter(c=>c.startsWith(p+'-')).map(c=>+c.slice(3)).filter(x=>!isNaN(x));return p+'-'+String((n.length?Math.max(...n):0)+1).padStart(2,'0')}
$('ctAddS').onclick=()=>{if($('ctK').value==='plans')openPlan(-1);else openSvc(null)};
$('fSv').addEventListener('submit',e=>{if(e.submitter&&e.submitter.value!=='save')return;e.preventDefault();const E=$('fSv').elements,k=edS.kind,c=E.c.value.trim().toUpperCase(),g=k==='setup'?'PK':E.g.value;
  if(!/^[A-Z]{2}-\d{2}$/.test(c)){$('svErr').textContent=L('الرمز حرفان ثم شرطة ثم رقمان، مثل MC-12.','The code is two letters, a dash and two digits, like MC-12.');return}
  if(c!==edS.c&&allCodes().has(c)){$('svErr').textContent=L('هذا الرمز مستخدم لخدمة أخرى.','This code is already used by another service.');return}
  const p=Math.max(0,Math.round(+E.p.value||0)),ar={about:E.aboutAr.value.trim(),docs:lines(E.docsAr.value),time:E.timeAr.value.trim()},en={about:E.aboutEn.value.trim(),docs:lines(E.docsEn.value),time:E.timeEn.value.trim()};
  if(edS.arr)edS.arr.splice(edS.i,1);if(edS.c&&edS.c!==c){delete CT.details[edS.c];if(!isOn('s',edS.c)){setOn('s',edS.c,true)}}
  if(k==='consult'){const cat=CT.data.CONSULT.find(x=>x.code===g);const it={c,p,from:E.from.checked,unit_ar:E.uAr.value.trim(),unit_en:E.uEn.value.trim(),ar:Object.assign(ar,{n:E.nAr.value.trim(),inc:E.incAr.value.trim(),out:E.noteAr.value.trim()}),en:Object.assign(en,{n:E.nEn.value.trim()||E.nAr.value.trim(),inc:E.incEn.value.trim(),out:E.noteEn.value.trim()})};
    if(edS.arr&&edS.g===g)edS.arr.splice(edS.i,0,it);else cat.items.push(it)}
  else{const row=[c,E.nAr.value.trim(),E.incAr.value.trim(),p];if(k==='gov')row.push(E.core.checked);const arr=k==='setup'?CT.data.SETUP:CT.data.G.find(x=>x[0]===g)[2];
    if(edS.arr&&edS.g===g)arr.splice(edS.i,0,row);else arr.push(row);
    CT.details[c]={ar:Object.assign(ar,{note:E.noteAr.value.trim()}),en:Object.assign(en,{name:E.nEn.value.trim(),inc:E.incEn.value.trim(),note:E.noteEn.value.trim()})}}
  setOn('s',c,E.on.checked);dirty=true;curG=g;$('dlgSv').close();render()});
$('svDel').onclick=async()=>{const c=edS.c;$('dlgSv').close();if(!await ask(L(`حذف الخدمة ${c} من القائمة؟ إن أردت إيقافها مؤقتاً فألغِ تحديدها بدلاً من حذفها.`,`Delete service ${c}? To pause it for a while, untick it instead of deleting it.`),{ok:L('حذف','Delete')}))return;
  const at=findSvc(c);if(at)at.arr.splice(at.i,1);delete CT.details[c];setOn('s',c,true);dirty=true;render()};
// ---- authority or consulting field ----
let edG=null;
function openGroup(code){const kind=$('ctK').value,f=$('fGr'),E=f.elements;f.reset();$('grErr').textContent='';f.querySelectorAll('.gr-c').forEach(x=>x.hidden=kind!=='consult');
  const g=code?(kind==='gov'?CT.data.G.find(x=>x[0]===code):CT.data.CONSULT.find(x=>x.code===code)):null;edG={kind,code};
  if(g){E.code.value=code;if(kind==='gov'){E.ar.value=g[1];E.en.value=CT.details._entities[code]||''}else{E.ar.value=g.ar;E.en.value=g.en||'';E.aboutAr.value=g.about_ar||'';E.aboutEn.value=g.about_en||''}E.on.checked=isOn('g',code)}else E.on.checked=true;
  E.code.readOnly=!!g;$('grDel').hidden=!g;$('dlgGrT').textContent=g?L('تعديل','Edit'):(kind==='gov'?L('جهة جديدة','New authority'):L('مجال جديد','New field'));$('dlgGr').showModal()}
$('ctAddG').onclick=()=>openGroup(null);
$('fGr').addEventListener('submit',e=>{if(e.submitter&&e.submitter.value!=='save')return;e.preventDefault();const E=$('fGr').elements,code=E.code.value.trim().toUpperCase(),kind=edG.kind;
  if(!/^[A-Z]{2}$/.test(code)){$('grErr').textContent=L('الرمز حرفان إنجليزيان كبيران، مثل MC.','The code is two capital letters, like MC.');return}
  const used=CT.data.G.some(x=>x[0]===code)||CT.data.CONSULT.some(x=>x.code===code)||code==='PK';if(!edG.code&&used){$('grErr').textContent=L('هذا الرمز مستخدم.','This code is already used.');return}
  if(kind==='gov'){let g=CT.data.G.find(x=>x[0]===code);if(!g){g=[code,'',[]];CT.data.G.push(g)}g[1]=E.ar.value.trim();CT.details._entities[code]=E.en.value.trim()}
  else{let g=CT.data.CONSULT.find(x=>x.code===code);if(!g){g={code,items:[]};CT.data.CONSULT.push(g)}Object.assign(g,{ar:E.ar.value.trim(),en:E.en.value.trim(),about_ar:E.aboutAr.value.trim(),about_en:E.aboutEn.value.trim()})}
  setOn('g',code,E.on.checked);curG=code;dirty=true;$('dlgGr').close();render()});
$('grDel').onclick=async()=>{const {kind,code}=edG;const n=groups(kind).find(g=>g.code===code).items.length;$('dlgGr').close();
  if(n){toast(L(`احذف خدمات هذه الجهة (${n}) أو انقلها أولاً، أو ألغِ تحديدها لإخفائها.`,`Delete or move its ${n} services first, or untick it to hide it.`));return}
  if(!await ask(L('حذف هذه الجهة من القائمة؟','Delete this group?'),{ok:L('حذف','Delete')}))return;
  if(kind==='gov')CT.data.G=CT.data.G.filter(x=>x[0]!==code);else CT.data.CONSULT=CT.data.CONSULT.filter(x=>x.code!==code);setOn('g',code,true);curG=null;dirty=true;render()};
// ---- monthly packages ----
let edP=-1;
function openPlan(i){const f=$('fPl'),E=f.elements;f.reset();$('plErr').textContent='';edP=i;const p=i>=0?CT.data.PLANS[i]:null,en=p?(CT.details._plans_en[p.key]||{}):{};
  if(p){E.name.value=p.name;E.nameEn.value=en.name||'';E.n.value=p.n;E.m.value=p.m;E.y.value=p.y;E.extra.value=p.extra||0;E.staff.value=p.staff||'';E.staffEn.value=en.staff||'';E.feat.value=(p.feat||[]).join('\n');E.featEn.value=(en.feat||[]).join('\n');E.all.checked=p.scope==='all';E.on.checked=isOn('p',p.key)}else E.on.checked=true;
  $('plDel').hidden=!p;$('dlgPlT').textContent=p?L('تعديل باقة','Edit package'):L('باقة جديدة','New package');$('dlgPl').showModal()}
$('fPl').addEventListener('submit',e=>{if(e.submitter&&e.submitter.value!=='save')return;e.preventDefault();const E=$('fPl').elements;
  const p=edP>=0?CT.data.PLANS[edP]:{key:'p'+Date.now().toString(36)};Object.assign(p,{name:E.name.value.trim(),n:+E.n.value||0,m:+E.m.value||0,y:+E.y.value||0,extra:+E.extra.value||0,staff:E.staff.value.trim(),feat:lines(E.feat.value)});
  if(E.all.checked)p.scope='all';else delete p.scope;if(edP<0)CT.data.PLANS.push(p);
  CT.details._plans_en[p.key]={name:E.nameEn.value.trim()||p.name,staff:E.staffEn.value.trim(),feat:lines(E.featEn.value)};setOn('p',p.key,E.on.checked);dirty=true;$('dlgPl').close();render()});
$('plDel').onclick=async()=>{const p=CT.data.PLANS[edP];$('dlgPl').close();if(!await ask(L(`حذف باقة ${p.name}؟`,`Delete the ${p.name} package?`),{ok:L('حذف','Delete')}))return;
  CT.data.PLANS.splice(edP,1);delete CT.details._plans_en[p.key];setOn('p',p.key,true);dirty=true;render()};
// ---- publish, undo, backup ----
async function publish(c){if(!REMOTE){const v=c?'local-'+Date.now():'';window.CATALOG.remember(c?{ver:v,data:c.data,details:c.details}:null);return v}
  const j=await S.api('saveCatalog',{catalog:c});window.CATALOG.remember(j.ver?{ver:j.ver,data:c.data,details:c.details}:null);return j.ver}
$('ctSave').onclick=async()=>{if(!dirty)return;if(!await ask(L('نشر القائمة الآن؟ ستظهر لزوار الموقع وفي «حسابي» كما هي هنا.','Publish the list now? Visitors and My account will see it as it is here.'),{ok:L('نشر','Publish')}))return;
  $('ctSave').disabled=true;try{await publish(CT);dirty=false;toast(L('نُشرت الخدمات والأسعار','Services and prices published'));window.CATALOG.use(CT)}catch(err){toast(errText(err.message));$('ctSave').disabled=false}state()};
$('ctUndo').onclick=async()=>{if(!await ask(L('التراجع عن كل التعديلات غير المنشورة؟','Discard all unpublished changes?'),{ok:L('تراجع','Discard')}))return;load();render()};
$('ctReset').onclick=async()=>{if(!await ask(L('العودة إلى القائمة الأصلية للموقع؟ يُلغى كل ما نُشر من تعديلات وإخفاء. نزّل نسخة احتياطية أولاً إن أردت الاحتفاظ بها.','Go back to the site’s original list? Every published edit and hidden item is dropped. Download a backup first if you want to keep it.'),{ok:L('عودة','Reset')}))return;
  try{await publish(null);load();render();toast(L('عادت القائمة الأصلية','The original list is back'))}catch(err){toast(errText(err.message))}};
$('ctExp').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(CT,null,1)],{type:'application/json'}));a.download='munjiz-services-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)};
$('ctImp').onchange=async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;try{const c=JSON.parse(await f.text());if(!c.data||!c.data.G||!c.details)throw 0;CT=c;const d=CT.details;d._hidden=d._hidden||{};['s','g','p'].forEach(k=>d._hidden[k]=d._hidden[k]||[]);d._entities=d._entities||{};d._plans_en=d._plans_en||{};dirty=true;render();toast(L('استُرجعت النسخة. راجعها ثم اضغط «حفظ ونشر».','Backup loaded. Review it, then press Publish.'))}catch(err){toast(L('الملف ليس نسخة صالحة من قائمة الخدمات.','This file is not a valid services backup.'))}};
addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue=''}});
})();
