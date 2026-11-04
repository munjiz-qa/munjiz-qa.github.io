'use strict';
// «سند من منجز»: request form. Contact data and the request server come from Munjiz's assets/config.js (MUNJIZ_CONFIG),
// so a change of phone, e-mail or server there applies here too. Requests land in Munjiz's CRM with type «سند من منجز».
(function(){
const EN=document.documentElement.lang==='en';
const CFG=window.MUNJIZ_CONFIG||{};
const WA=(CFG.WHATSAPP||'97451600498').replace(/\D/g,''),MAIL=CFG.EMAIL||'munijizqa@gmail.com',PHONE=CFG.PHONE||'+974 5160 0498';
const T=EN?{
  eName:'Please enter your name.',ePhone:'Enter a valid mobile number, e.g. +974 5160 0498.',eMail:'Check the e-mail address.',eOk:'Please accept the privacy policy to continue.',
  sending:'Sending your request…',ok:id=>`Request received${id?` (No. <b class="ltr">${id}</b>)`:''}. We will contact you within one working day.`,
  fail:'The request could not reach our system. Send it on WhatsApp or by e-mail below and it will reach us directly.',
  head:'New Sanad request (Sanad by Munjiz)',lName:'Name',lCo:'Company',lPhone:'Mobile',lMail:'E-mail',lPlan:'Package',lCh:'Channels',lNote:'Notes',lNo:'Ref.',
  copied:'Copied',copyHand:'Text selected, copy it manually',type:'Sanad by Munjiz'
}:{
  eName:'اكتب اسمك من فضلك.',ePhone:'اكتب رقم جوال صحيحاً، مثل ‎+974 5160 0498.',eMail:'تحقق من البريد الإلكتروني.',eOk:'وافق على سياسة الخصوصية للمتابعة.',
  sending:'جارٍ إرسال طلبك…',ok:id=>`وصلنا طلبك${id?` (رقم <b class="ltr">${id}</b>)`:''}، وسنتواصل معك خلال يوم عمل واحد.`,
  fail:'تعذّر وصول الطلب إلى نظامنا. أرسله عبر واتساب أو البريد من الأزرار أدناه ليصلنا مباشرة.',
  head:'طلب جديد لخدمة سند (سند من منجز)',lName:'الاسم',lCo:'الجهة',lPhone:'الجوال',lMail:'البريد',lPlan:'الباقة',lCh:'القنوات',lNote:'ملاحظات',lNo:'المرجع',
  copied:'تم النسخ',copyHand:'حُدِّد النص، انسخه يدوياً',type:'سند من منجز'
};
const $=id=>document.getElementById(id);
function toast(t){const d=document.createElement('div');d.className='toast';d.setAttribute('role','status');d.textContent=t;document.body.appendChild(d);setTimeout(()=>d.remove(),2400)}

// contact links everywhere use the shared config
document.querySelectorAll('[data-wa]').forEach(a=>{a.href='https://wa.me/'+WA+(a.dataset.wa?'?text='+encodeURIComponent(a.dataset.wa):'')});
document.querySelectorAll('[data-mail]').forEach(a=>{a.href='mailto:'+MAIL;if(!a.children.length&&a.dataset.mail==='show')a.textContent=MAIL});
document.querySelectorAll('[data-tel]').forEach(a=>{a.href='tel:'+PHONE.replace(/\s/g,'');if(a.dataset.tel==='show')a.textContent=PHONE});

// package buttons preselect the package in the form
document.querySelectorAll('[data-plan]').forEach(b=>b.addEventListener('click',()=>{const s=$('fPlan');if(s)s.value=b.dataset.plan}));

const f=$('reqForm');if(!f)return;
f.addEventListener('submit',async e=>{e.preventDefault();
  const n=$('fName').value.trim(),co=$('fCo').value.trim(),ph=$('fPhone').value.replace(/[\s-]/g,''),em=$('fMail').value.trim(),note=$('fNote').value.trim();
  const plan=$('fPlan').options[$('fPlan').selectedIndex].text;
  const ch=[...f.querySelectorAll('input[name=ch]:checked')].map(x=>x.parentElement.textContent.trim());
  let ok=true;const set=(id,msg)=>{$(id).textContent=msg||'';if(msg)ok=false};
  set('eName',n?'':T.eName);
  set('ePhone',(/^(\+?974)?[3567]\d{7}$/.test(ph)||/^(\+|00)[1-9]\d{7,14}$/.test(ph))?'':T.ePhone);
  set('eMail',(!em||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))?'':T.eMail);
  set('eOk',$('fOk').checked?'':T.eOk);
  if(!ok){const bad=f.querySelector('.err:not(:empty)');bad&&bad.previousElementSibling&&bad.previousElementSibling.focus&&bad.previousElementSibling.focus();return}
  const d=new Date(),p=x=>String(x).padStart(2,'0');
  // one display format for numbers everywhere: +974 5160 0498
  const q=ph.replace(/^00/,'+').replace(/^(?!\+)(974)?/,'+974'),phShow=/^\+974\d{8}$/.test(q)?q.replace(/^\+974(\d{4})(\d{4})$/,'+974 $1 $2'):ph;
  const no=`SQ-${String(d.getFullYear()).slice(2)}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
  const text=`${T.head}\n${T.lNo}: ${no}\n${T.lName}: ${n}\n${co?T.lCo+': '+co+'\n':''}${T.lPhone}: ${phShow}\n${em?T.lMail+': '+em+'\n':''}${T.lPlan}: ${plan}\n${ch.length?T.lCh+': '+ch.join('، ')+'\n':''}${note?T.lNote+': '+note:''}`.trim();
  const out=$('reqOut'),st=$('reqState');out.hidden=false;$('reqText').textContent=text;
  $('reqWa').href='https://wa.me/'+WA+'?text='+encodeURIComponent(text);
  $('reqMail').href='mailto:'+MAIL+'?subject='+encodeURIComponent((EN?'Sanad request ':'طلب سند ')+no+' - '+(co||n))+'&body='+encodeURIComponent(text);
  out.className='result';
  if(CFG.API){st.innerHTML=T.sending;$('reqSend').disabled=true;
    try{const r=await fetch(CFG.API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'request',quote:no,company:co,name:n,phone:ph,email:em,type:T.type,plan,contact:ch.join('، '),services:(EN?'Sanad by Munjiz: ':'سند من منجز: ')+plan+(note?'\n'+note:''),codes:[],lang:EN?'en':'ar',page:location.href,hp:$('fHp').value})});
      const j=await r.json();if(!j.ok)throw new Error(j.error||'not ok');out.className='result ok';st.innerHTML=T.ok(j.id||no)}
    catch(err){st.textContent=T.fail}
    finally{$('reqSend').disabled=false}}
  else st.textContent=T.fail;
  out.scrollIntoView({block:'nearest'});
});
$('reqCopy').addEventListener('click',()=>{const el=$('reqText');
  (navigator.clipboard?navigator.clipboard.writeText(el.textContent):Promise.reject()).then(()=>toast(T.copied)).catch(()=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);toast(T.copyHand)})});
})();
