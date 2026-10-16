'use strict';
// Admin: site texts (الإعدادات ← نصوص الموقع). The company name in the header, the home hero and its four promises,
// the short «تعرّف إلى منجز» text, and the phone, WhatsApp and email used on every page, in Arabic and English.
// An empty field keeps the page's own text (shown greyed as a hint). Saved with 'saveSite'; pages apply it through assets/sitetext.js.
(function(){
const EN=window.CRM_LANG==='en',L=(a,e)=>EN?e:a;
const tabs=document.getElementById('tabs'),anchor=document.getElementById('tabTheme');if(!tabs||!anchor)return;
const btn=document.createElement('button');btn.type='button';btn.dataset.tab='site';btn.id='tabSite';btn.hidden=true;btn.dataset.g=anchor.dataset.g||'set';btn.setAttribute('data-notr','');btn.textContent=L('نصوص الموقع','Site texts');
anchor.after(btn);
new MutationObserver(()=>btn.hidden=anchor.hidden).observe(anchor,{attributes:true,attributeFilter:['hidden']});btn.hidden=anchor.hidden;
const F=[['brand',L('اسم الشركة أعلى الصفحات','Company name in the header'),0],
  ['h1',L('العنوان الرئيسي','Main title'),0],['h1em',L('الجزء الملوّن من العنوان','Highlighted end of the title'),0],['lead',L('السطر تحت العنوان','Line under the title'),0],['trust',L('السطر الصغير تحت الأزرار','Small line under the buttons'),0],
  ['p1t',L('الميزة 1: العنوان','Point 1: title'),0],['p1s',L('الميزة 1: الشرح','Point 1: text'),0],['p2t',L('الميزة 2: العنوان','Point 2: title'),0],['p2s',L('الميزة 2: الشرح','Point 2: text'),0],
  ['p3t',L('الميزة 3: العنوان','Point 3: title'),0],['p3s',L('الميزة 3: الشرح','Point 3: text'),0],['p4t',L('الميزة 4: العنوان','Point 4: title'),0],['p4s',L('الميزة 4: الشرح','Point 4: text'),0],
  ['slogan',L('شعار «تعرّف إلى منجز»','Slogan in About Munjiz'),0],['about',L('نبذة «تعرّف إلى منجز» في الصفحة الرئيسية','About text on the home page'),1]];
const MAX={brand:60,h1:120,h1em:80,lead:200,trust:200,p1t:60,p1s:160,p2t:60,p2s:160,p3t:60,p3s:160,p4t:60,p4s:160,slogan:80,about:600};
const e=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const v=document.createElement('section');v.id='v-site';v.className='view';v.hidden=true;v.setAttribute('data-notr','');
v.innerHTML=`<div class="bar"><h2>${L('نصوص الموقع','Site texts')}</h2><span class="sp"></span><a class="btn sm ghost" href="index.html" target="_blank" rel="noopener">${L('معاينة الموقع ↗','Preview the site ↗')}</a></div>
<p class="mute sm">${L('اترك الحقل فارغاً ليبقى النص الأصلي الظاهر بالرمادي. تظهر التعديلات لكل زوار الموقع بعد الحفظ.','Leave a field empty to keep the original text shown in grey. Changes appear for every visitor once saved.')}</p>
<form id="stF" class="panel">
 <div class="sttbl" role="table"><div class="sthead" role="row"><span></span><b>${L('بالعربية','Arabic')}</b><b>${L('بالإنجليزية','English')}</b></div>
 ${F.map(([k,lab,big])=>`<div class="strow" role="row"><label for="st_ar_${k}">${lab}</label>${['ar','en'].map(l=>big?`<textarea id="st_${l}_${k}" name="${l}_${k}" rows="3" maxlength="${MAX[k]}" ${l==='en'?'dir="ltr"':'dir="rtl"'} aria-label="${e(lab)} (${l})"></textarea>`:`<input id="st_${l}_${k}" name="${l}_${k}" maxlength="${MAX[k]}" ${l==='en'?'dir="ltr"':'dir="rtl"'} aria-label="${e(lab)} (${l})">`).join('')}</div>`).join('')}
 </div>
 <h3>${L('بيانات التواصل في كل الصفحات','Contact details on every page')}</h3>
 <div class="grid2">
  <label>${L('رقم واتساب (أرقام فقط مع رمز الدولة)','WhatsApp number (digits with country code)')}<input name="wa" inputmode="numeric" dir="ltr" maxlength="15" placeholder="97451600498"></label>
  <label>${L('رقم الهاتف (أرقام فقط مع رمز الدولة)','Phone number (digits with country code)')}<input name="phone" inputmode="numeric" dir="ltr" maxlength="15" placeholder="97451600498"></label>
  <label>${L('البريد الإلكتروني','Email')}<input name="email" type="email" dir="ltr" maxlength="120" placeholder="munijizqa@gmail.com"></label>
 </div>
 <p class="err" id="stErr" role="alert"></p>
 <div class="bar"><button class="btn sm pri" type="submit">${L('حفظ ونشر','Save and publish')}</button><button class="btn sm ghost" type="button" id="stReset">${L('العودة إلى النصوص الأصلية','Back to the original texts')}</button><span class="mute sm" id="stState"></span></div>
</form>`;
(document.getElementById('v-theme')||document.querySelector('.view:last-of-type')).after(v);
const $=id=>document.getElementById(id),f=$('stF');let loaded=false;
async function defaults(){const out={ar:{},en:{}};
  for(const [l,u] of [['ar','index.html'],['en','en/index.html']])try{const h=await (await fetch(u,{cache:'no-cache'})).text();out[l]=window.SITE_TEXT.read(new DOMParser().parseFromString(h,'text/html'))}catch(err){}
  return out}
async function current(){const api=(window.MUNJIZ_CONFIG||{}).API;if(!api)return window.SITE_TEXT.current;
  try{const j=await (await fetch(api,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'site'})})).json();return j&&j.ok?j.site:window.SITE_TEXT.current}catch(err){return window.SITE_TEXT.current}}
async function load(){if(!window.SITE_TEXT)return;$('stState').textContent=L('جارٍ التحميل…','Loading…');
  const [d,c]=await Promise.all([defaults(),current()]);
  F.forEach(([k])=>['ar','en'].forEach(l=>{const x=f.elements[l+'_'+k];x.placeholder=d[l][k]||'';x.value=(c&&c[l]&&c[l][k])||''}));
  ['wa','phone','email'].forEach(k=>f.elements[k].value=(c&&c[k])||'');$('stState').textContent='';loaded=true}
function collect(){const s={ar:{},en:{}};F.forEach(([k])=>['ar','en'].forEach(l=>{const x=f.elements[l+'_'+k].value.trim();if(x&&x!==f.elements[l+'_'+k].placeholder)s[l][k]=x}));
  ['wa','phone'].forEach(k=>s[k]=f.elements[k].value.replace(/\D/g,''));s.email=f.elements.email.value.trim();return s}
async function publish(s){$('stErr').textContent='';
  if(typeof REMOTE!=='undefined'&&!REMOTE){window.SITE_TEXT.remember(s);toast(L('حُفظت على هذا الجهاز فقط (الخادم غير متصل).','Saved on this device only (no server).'));return}
  try{const j=await S.api('saveSite',{site:s});window.SITE_TEXT.remember(j.site);toast(L('شكراً لك، حُفظت نصوص الموقع ونُشرت.','Thank you, the site texts are saved and published.'));load()}
  catch(err){$('stErr').textContent=L('تعذر الحفظ: ','Could not save: ')+(typeof errText==='function'?errText(err.message):err.message)}}
f.onsubmit=ev=>{ev.preventDefault();const s=collect();
  if(s.wa&&!/^\d{8,15}$/.test(s.wa)||s.phone&&!/^\d{8,15}$/.test(s.phone))return $('stErr').textContent=L('اكتب الرقم أرقاماً فقط مع رمز الدولة، مثل 97451600498.','Write the number as digits with the country code, such as 97451600498.');
  if(s.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email))return $('stErr').textContent=L('البريد الإلكتروني غير صحيح.','The email address is not valid.');
  publish(s)};
$('stReset').onclick=async()=>{const b=$('stReset');if(b.dataset.sure!=='1'){b.dataset.sure='1';b.textContent=L('تأكيد العودة إلى الأصل','Confirm going back to the original');return}
  b.dataset.sure='';b.textContent=L('العودة إلى النصوص الأصلية','Back to the original texts');
  if(typeof REMOTE!=='undefined'&&!REMOTE){window.SITE_TEXT.remember(null);load();return}
  try{await S.api('saveSite',{site:null});window.SITE_TEXT.remember(null);toast(L('عادت النصوص الأصلية.','The original texts are back.'));load()}catch(err){$('stErr').textContent=err.message}};
if(typeof VIEWS!=='undefined')VIEWS.site=load;
})();
