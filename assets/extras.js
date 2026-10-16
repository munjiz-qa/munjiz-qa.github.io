'use strict';
// Home extras shared by index.html and en/index.html: public tracking, Qatar auctions guide and news, approved client reviews.
// Everything from the server or a data file is written with textContent only; links must be https.
(function(){
const EN=document.documentElement.lang==='en',API=(window.MUNJIZ_CONFIG||{}).API,BASE=EN?'../':'';
const el=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
const L=(a,e)=>EN?e:a;
const safeUrl=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:''}catch(e){return ''}};
const extLink=(u,txt)=>{const a=el('a',null,txt);a.href=u;a.target='_blank';a.rel='noopener noreferrer nofollow';return a};
const post=o=>fetch(API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify(o)}).then(r=>r.json());
const svcName=c=>{try{return (typeof byCode!=='undefined'&&byCode[c]&&byCode[c].n)||c}catch(e){return c}};

// ---- tracking ----
const TX_STEPS=EN?['Received','Documents','Submitted','Follow-up with the authority','Done']:['استلام الطلب','تجهيز المستندات','التقديم للجهة','المتابعة لدى الجهة','الإنجاز والتسليم'];
const RQ_STEPS=EN?['Request received','Under review','Became a transaction']:['استلمنا طلبك','قيد المراجعة والتواصل','تحوّل إلى معاملة'];
const f=document.getElementById('trkF');
if(f){const out=document.getElementById('trkOut'),err=document.getElementById('trkErr'),btn=f.querySelector('button');
  f.addEventListener('submit',async e=>{e.preventDefault();err.textContent='';out.textContent='';
    const ref=document.getElementById('trkRef').value.trim(),ph=document.getElementById('trkPh').value.replace(/\D/g,'');
    if(!/^[TtRr]-?\d{1,6}$/.test(ref)||ph.length!==4){err.textContent=L('اكتب الرقم كما وصلك، مثل T-0012، وآخر 4 أرقام من جوالك.','Enter the number as we sent it, such as T-0012, and the last 4 digits of your mobile.');return}
    if(!API){err.textContent=L('التتبع غير متاح الآن. تواصل معنا عبر واتساب وسنطمئنك فوراً.','Tracking is not available right now. Message us on WhatsApp and we will update you.');return}
    btn.disabled=true;
    try{const r=await post({action:'track',ref,phone:ph});
      if(!r.ok){err.textContent=r.error==='rate_limited'?L('محاولات كثيرة لهذا الرقم. حاول بعد ساعة أو تواصل معنا عبر واتساب.','Too many tries for this number. Try again in an hour or message us on WhatsApp.'):L('لم نجد معاملة بهذا الرقم وآخر 4 أرقام. تأكد منهما أو تواصل معنا.','We could not find a transaction with this number and these digits. Please check them or contact us.');return}
      out.appendChild(render(r))}
    catch(x){err.textContent=L('تعذر الاتصال الآن. حاول مرة أخرى بعد قليل.','Could not connect right now. Please try again shortly.')}
    finally{btn.disabled=false}})}
function render(r){const box=el('div','trkres');
  const head=el('div','trkhead');head.appendChild(el('b',null,r.ref));
  const name=r.kind==='txn'?svcName(r.code):(r.codes||[]).map(svcName).join('، ');
  if(name)head.appendChild(el('span',null,name));box.appendChild(head);
  const steps=r.kind==='txn'?TX_STEPS:RQ_STEPS,ol=el('ol','trksteps');
  steps.forEach((s,i)=>{const li=el('li',i+1<r.step?'done':i+1===r.step?'now':'',s);if(i+1===r.step)li.setAttribute('aria-current','step');ol.appendChild(li)});
  if(r.cancelled||r.closed&&r.kind==='req'&&r.step<3){box.appendChild(el('p','trkmsg',r.kind==='txn'?L('أُلغيت هذه المعاملة. للاستفسار تواصل معنا.','This transaction was cancelled. Contact us for any question.'):L('أُغلق هذا الطلب. للاستفسار تواصل معنا.','This request was closed. Contact us for any question.')));return box}
  box.appendChild(ol);
  if(r.waiting)box.appendChild(el('p','trkmsg',L('نحتاج منك مستنداً أو رداً لنكمل. ستجد التفاصيل في «حسابي» أو في رسالتنا لك.','We need a document or a reply from you to continue. You will find the details in My account or in our message to you.')));
  const meta=[];if(r.updated)meta.push(L('آخر تحديث: ','Last update: ')+r.updated);if(r.due&&r.step<5)meta.push(L('الموعد المتوقع: ','Expected by: ')+r.due);
  if(meta.length)box.appendChild(el('p','trkmeta',meta.join(' · ')));
  return box}

// ---- auctions: official platforms (static file) and news (refreshed twice a day by a GitHub Action) ----
const list=document.getElementById('aucList');
if(list){fetch(BASE+'data/auction-platforms.json',{cache:'no-cache'}).then(r=>r.json()).then(d=>{
    (d.platforms||[]).forEach(p=>{const u=safeUrl(p.url);if(!u)return;const c=el('article','auc');
      c.appendChild(el('h3',null,EN?p.en:p.ar));c.appendChild(el('p',null,EN?p.what_en:p.what_ar));
      c.appendChild(el('p','aucacc',EN?p.access_en:p.access_ar));c.appendChild(extLink(u,L('افتح المنصة الرسمية ↗','Open the official platform ↗')));list.appendChild(c)})}).catch(()=>{});
  fetch(BASE+'data/auctions.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(d=>{
    const items=((d&&d[EN?'en':'ar'])||[]).slice(0,8),ul=document.getElementById('aucNews');let n=0;
    items.forEach(x=>{const u=safeUrl(x.url||x.link);if(!u||!x.title)return;const li=el('li');li.appendChild(extLink(u,String(x.title).slice(0,200)));
      const m=[x.source,x.date].filter(Boolean).join(' · ');if(m)li.appendChild(el('span',null,m));ul.appendChild(li);n++});
    if(n){ul.hidden=false;document.getElementById('aucNewsH').hidden=false}}).catch(()=>{})}

// ---- client reviews: only those the client agreed to publish and the manager approved ----
const rv=document.getElementById('revs');
if(rv&&API)post({action:'reviews'}).then(r=>{const g=document.getElementById('revList');let n=0;
  ((r&&r.reviews)||[]).forEach(x=>{const s=Math.max(1,Math.min(5,Number(x.stars)||0));if(!s)return;const c=el('figure','rev');
    const st=el('div','stars','★★★★★'.slice(0,s)+'☆☆☆☆☆'.slice(0,5-s));st.setAttribute('aria-label',L(s+' من 5',s+' out of 5'));c.appendChild(st);
    if(x.comment)c.appendChild(el('blockquote',null,String(x.comment).slice(0,400)));c.appendChild(el('figcaption',null,[x.name,x.date].filter(Boolean).join(' · ')));g.appendChild(c);n++});
  if(n)rv.hidden=false}).catch(()=>{});
})();
