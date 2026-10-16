// إدارة إعلانات الموقع (للمدير فقط): إضافة وتعديل وحذف، صورة وعنوان ونص بالعربية والإنجليزية، رابط، مدة عرض، تشغيل وإيقاف.
// تظهر الإعلانات المفعّلة في الصفحة الرئيسية بعلامة «إعلان». الخادم يتحقق من الصلاحية ومن نوع الصورة وحجمها.
(function(){
const EN=window.CRM_LANG==='en',L=(a,e)=>EN?e:a,MAXKB=800;
const tabs=document.getElementById('tabs'),emp=document.getElementById('tabTheme')||document.getElementById('tabEmp');if(!tabs||!emp)return;
const btn=document.createElement('button');btn.type='button';btn.dataset.tab='ads';btn.id='tabAds';btn.hidden=true;if(emp.dataset.g)btn.dataset.g=emp.dataset.g;btn.setAttribute('data-notr','');btn.textContent=L('الإعلانات','Ads');
emp.after(btn);
new MutationObserver(()=>btn.hidden=emp.hidden).observe(emp,{attributes:true,attributeFilter:['hidden']});btn.hidden=emp.hidden;
const v=document.createElement('section');v.id='v-ads';v.className='view';v.hidden=true;v.setAttribute('data-notr','');
v.innerHTML=`<div class="bar"><h2>${L('إعلانات الموقع','Website ads')}</h2><span class="sp"></span><button class="btn sm pri" type="button" id="adNew">${L('إضافة إعلان','Add an ad')}</button></div>
<p class="mute sm">${L('تظهر الإعلانات المفعّلة داخل مدتها في الصفحة الرئيسية للموقع بالعربية والإنجليزية، وعليها كلمة «إعلان». الصورة PNG أو JPEG أو WebP حتى 800 كيلوبايت، ويُفضَّل عرضها ضعف ارتفاعها.','Active ads inside their dates appear on the home page in Arabic and English, labelled “Ad”. Picture: PNG, JPEG or WebP up to 800 KB, ideally twice as wide as tall.')}</p>
<form class="panel" id="adF" hidden>
 <h3 id="adFT"></h3>
 <div class="grid2">
  <label>${L('العنوان بالعربية','Title in Arabic')}<input name="title" maxlength="80"></label>
  <label>${L('العنوان بالإنجليزية','Title in English')}<input name="titleEn" maxlength="80" dir="ltr"></label>
  <label>${L('النص بالعربية','Text in Arabic')}<textarea name="text" maxlength="240" rows="2"></textarea></label>
  <label>${L('النص بالإنجليزية','Text in English')}<textarea name="textEn" maxlength="240" rows="2" dir="ltr"></textarea></label>
  <label>${L('الرابط (اختياري، يبدأ بـ https://)','Link (optional, starts with https://)')}<input name="link" type="url" maxlength="500" dir="ltr" placeholder="https://"></label>
  <label>${L('الترتيب (الأصغر أولاً)','Order (lowest first)')}<input name="sort" type="number" min="0" max="99" value="0"></label>
  <label>${L('يبدأ في','Starts on')}<input name="start" type="date"></label>
  <label>${L('ينتهي في','Ends on')}<input name="end" type="date"></label>
  <label>${L('الصورة','Picture')}<input name="img" type="file" accept="image/png,image/jpeg,image/webp"></label>
  <div><div id="adPrev" class="adprev"></div><label class="inl" id="adRmL" hidden><input type="checkbox" name="removeImage"> ${L('إزالة الصورة الحالية','Remove current picture')}</label></div>
 </div>
 <label class="inl"><input type="checkbox" name="active" checked> ${L('مفعّل ويظهر في الموقع','Active and shown on the site')}</label>
 <div class="bar"><button class="btn sm pri" type="submit">${L('حفظ','Save')}</button><button class="btn sm ghost" type="button" id="adCancel">${L('إلغاء','Cancel')}</button></div>
</form>
<div class="panel"><div class="tbl" id="adL"></div></div>`;
document.getElementById('v-emp').after(v);
const $=id=>document.getElementById(id),f=$('adF');let ROWS=[],cur=null;
const e=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const okUrl=u=>/^https:\/\/[^\s"'<>]+$/.test(String(u||''));
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Qatar'});
const state=a=>a.active!=='نعم'?L('موقوف','Off'):(a.end&&a.end<today())?L('منتهٍ','Ended'):(a.start&&a.start>today())?L('مجدول','Scheduled'):L('يظهر الآن','Live');
async function load(){if(typeof CFG==='undefined'||!CFG.API){$('adL').innerHTML='<p class="mute sm">'+L('تعمل بعد تشغيل الخادم.','Works once the server is running.')+'</p>';$('adNew').hidden=true;return}
  try{ROWS=(await S.api('adsList',{})).rows||[]}catch(err){$('adL').innerHTML='<p class="mute sm">'+e(err.message)+'</p>';return}
  ROWS.sort((a,b)=>(+a.sort||0)-(+b.sort||0));
  $('adL').innerHTML=ROWS.length?`<table><thead><tr><th>${L('الصورة','Picture')}</th><th>${L('العنوان','Title')}</th><th>${L('المدة','Dates')}</th><th>${L('الحالة','Status')}</th><th></th></tr></thead><tbody>${ROWS.map(a=>`<tr>
   <td>${okUrl(a.image)?`<img class="adthumb" src="${e(a.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'—'}</td>
   <td><b>${e(a.title||a.titleEn)}</b>${a.titleEn&&a.title?`<br><small class="mute" dir="ltr">${e(a.titleEn)}</small>`:''}</td>
   <td class="num">${e(a.start||'…')} – ${e(a.end||'…')}</td><td>${state(a)}</td>
   <td><button class="btn sm ghost" type="button" data-ed="${e(a.id)}">${L('تعديل','Edit')}</button> <button class="btn sm ghost" type="button" data-tg="${e(a.id)}">${a.active==='نعم'?L('إيقاف','Turn off'):L('تشغيل','Turn on')}</button> <button class="btn sm ghost" type="button" data-del="${e(a.id)}">${L('حذف','Delete')}</button></td></tr>`).join('')}</tbody></table>`
   :'<div class="empty">'+L('لا توجد إعلانات بعد.','No ads yet.')+'</div>'}
function open(a){cur=a||null;f.reset();f.hidden=false;$('adFT').textContent=a?L('تعديل الإعلان','Edit ad'):L('إعلان جديد','New ad');
  if(a)['title','titleEn','text','textEn','link','sort','start','end'].forEach(k=>f.elements[k].value=a[k]??'');f.elements.active.checked=!a||a.active==='نعم';
  $('adPrev').innerHTML=a&&okUrl(a.image)?`<img class="adthumb" src="${e(a.image)}" alt="" referrerpolicy="no-referrer">`:'';$('adRmL').hidden=!(a&&a.image);f.scrollIntoView({block:'start'})}
const b64=file=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(file)});
async function save(row,image){const j=await S.api('adsSave',Object.assign({row},image?{image:{data:image}}:{}));return j.row}
$('adNew').onclick=()=>open(null);$('adCancel').onclick=()=>{f.hidden=true};
f.onsubmit=async ev=>{ev.preventDefault();const x=f.elements;
  const row={id:cur?cur.id:'',title:x.title.value.trim(),titleEn:x.titleEn.value.trim(),text:x.text.value.trim(),textEn:x.textEn.value.trim(),link:x.link.value.trim(),sort:x.sort.value,start:x.start.value,end:x.end.value,active:x.active.checked?'نعم':'لا',removeImage:x.removeImage.checked};
  if(!row.title&&!row.titleEn)return toast(L('اكتب عنواناً للإعلان','Please add a title'));
  if(row.link&&!okUrl(row.link))return toast(L('الرابط يجب أن يبدأ بـ https://','The link must start with https://'));
  if(row.start&&row.end&&row.end<row.start)return toast(L('تاريخ الانتهاء قبل تاريخ البدء','The end date is before the start date'));
  const file=x.img.files[0];let img=null;
  if(file){if(!/^image\/(png|jpeg|webp)$/.test(file.type))return toast(L('الصورة يجب أن تكون PNG أو JPEG أو WebP','Picture must be PNG, JPEG or WebP'));
    if(file.size>MAXKB*1024)return toast(L('حجم الصورة أكبر من 800 كيلوبايت','The picture is larger than 800 KB'));img=await b64(file)}
  try{await save(row,img);toast(L('شكراً لك، حُفظ الإعلان','Thank you, the ad is saved'));f.hidden=true;load()}catch(err){toast(L('نعتذر، لم يُحفظ: ','Sorry, not saved: ')+err.message)}};
$('adL').onclick=async ev=>{const t=ev.target.closest('button');if(!t)return;const a=ROWS.find(r=>r.id===(t.dataset.ed||t.dataset.tg||t.dataset.del));if(!a)return;
  if(t.dataset.ed)return open(a);
  if(t.dataset.tg){try{await save(Object.assign({},a,{active:a.active==='نعم'?'لا':'نعم',removeImage:false}));load()}catch(err){toast(err.message)}return}
  if(t.dataset.del){if(t.dataset.sure!=='1'){t.dataset.sure='1';t.textContent=L('تأكيد الحذف','Confirm delete');return}
    try{await S.api('adsDel',{id:a.id});toast(L('حُذف الإعلان','Ad deleted'));load()}catch(err){toast(err.message)}}};
tabs.addEventListener('click',ev=>{if(ev.target.closest('#tabAds'))load()});
})();
