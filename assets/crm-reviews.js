'use strict';
// Admin: client reviews (العمل اليومي ← آراء العملاء). Clients rate a finished transaction from «حسابي»;
// a review shows on the website only when the client agreed and the manager publishes it ('reviewSet').
// Uses helpers from crm.js ($, esc, L, toast, S, DB, VIEWS, errText).
(function(){
const ST={'جديد':L('جديد','New'),'منشور':L('منشور في الموقع','On the website'),'مخفي':L('مخفي','Hidden')};
const stars=n=>'★★★★★'.slice(0,n)+'☆☆☆☆☆'.slice(0,5-n);
function render(){const rows=(DB.Reviews||[]).slice().reverse(),cl=id=>((DB.Clients||[]).find(c=>c.id===id)||{}).name||id;
  if(!rows.length){$('rvT').innerHTML=`<p class="mute">${L('لا توجد آراء بعد. يستطيع العميل تقييم أي معاملة منجزة من «حسابي».','No reviews yet. Clients can rate any finished transaction from My account.')}</p>`;return}
  $('rvT').innerHTML=`<div class="tbl"><table><thead><tr><th>${L('التاريخ','Date')}</th><th>${L('العميل','Client')}</th><th>${L('المعاملة','Transaction')}</th><th>${L('التقييم','Rating')}</th><th>${L('التعليق','Comment')}</th><th>${L('موافقة العميل على النشر','Client agreed to publish')}</th><th>${L('الحالة','Status')}</th><th></th></tr></thead><tbody>${rows.map(r=>`<tr>
    <td>${esc(String(r.created).slice(0,10))}</td><td>${esc(cl(r.clientId))}</td><td>${esc(r.txnId)}</td><td class="pstars" aria-label="${+r.stars}/5">${stars(+r.stars||0)}</td><td>${esc(r.comment)}</td>
    <td>${r.publish==='نعم'?L('نعم','Yes'):L('لا','No')}</td><td>${esc(ST[r.status]||r.status)}</td>
    <td>${r.publish==='نعم'&&r.status!=='منشور'?`<button type="button" class="btn sm pri" data-rvs="منشور" data-id="${esc(r.id)}">${L('انشر في الموقع','Publish on site')}</button>`:''}${r.status==='منشور'?`<button type="button" class="btn sm ghost" data-rvs="مخفي" data-id="${esc(r.id)}">${L('إخفاء','Hide')}</button>`:''}</td></tr>`).join('')}</tbody></table></div>`}
$('rvT').addEventListener('click',async e=>{const b=e.target.closest('[data-rvs]');if(!b)return;b.disabled=true;
  try{const j=await S.api('reviewSet',{id:b.dataset.id,status:b.dataset.rvs});const i=DB.Reviews.findIndex(x=>x.id===j.row.id);if(i>=0)DB.Reviews[i]=j.row;render();toast(L('تم الحفظ','Saved'))}
  catch(err){toast(typeof errText==='function'?errText(err.message):err.message);b.disabled=false}});
VIEWS.rev=render;
})();
