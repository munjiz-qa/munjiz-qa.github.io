'use strict';
// نشرة «خبر»: الاشتراك يُحفظ على خادم «خبر» (Cloudflare)، والعدد يُبنى من الخلاصة الحالية الموثّقة.
// الإرسال الآلي بالبريد أو واتساب معطّل حتى يختار المالك مزوّد الإرسال ويفعّله من لوحة الإدارة.
(function(){
const CFG=window.KHABAR_CONFIG||{};const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const toast=m=>{const n=$('#toast');n.textContent=m;n.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>n.hidden=true,2600)};
const say=(t,ok)=>{const m=$('#sub-msg');m.textContent=t;m.className='msg '+(ok?'ok':'err');m.hidden=false};
const M=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const fd=iso=>{const [y,m,d]=iso.split('-').map(Number);return `${d} ${M[m-1]} ${y}`};
let B=null,ADMIN={};
async function post(body){const r=await fetch((CFG.API||'')+'/api/subscribe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'تعذّر الاتصال بالخادم.');return j}
const val=()=>({email:$('#em').value.trim(),whatsapp:$('#wa').value.trim(),editions:$('#ed').value,lang:$('#lg').value,ref:(()=>{try{return JSON.parse(localStorage.getItem('khabar-ref-from'))||''}catch(e){return ''}})()});
$('#sub').onsubmit=async e=>{e.preventDefault();const v=val();if(!v.email&&!v.whatsapp){say('أدخل بريدك أو رقم واتساب.',false);return}
  try{await post(v);say(ADMIN.activate&&ADMIN.activate.newsletter?'تم اشتراكك. تصلك النشرة في موعدها.':'تم تسجيل اشتراكك. يبدأ الإرسال فور تفعيل خدمة الإرسال، وحتى ذلك الحين تجد عدد اليوم في هذه الصفحة.',true)}catch(err){say(err.message,false)}};
$('#unsub').onclick=async()=>{const v=val();if(!v.email&&!v.whatsapp){say('اكتب البريد أو الرقم المشترك به ثم اضغط «ألغِ اشتراكي».',false);return}try{await post({...v,unsubscribe:true});say('أُلغي اشتراكك.',true)}catch(err){say(err.message,false)}};
function issue(){
  const lines=[],html=[];const t=B.title&&B.title.ar||'خلاصة خبر';$('#issue-date').textContent=fd(B.date);
  const art=$('#issue');art.textContent='';art.append(el('h2',null,t),el('p',null,B.thread.ar));
  lines.push(`*خبر | ${t}* · ${fd(B.date)}`,'',B.thread.ar,'');html.push(`<h2 style="font-family:Tahoma,sans-serif">خبر | ${t}</h2><p>${B.thread.ar}</p>`);
  B.zones.forEach(z=>{const its=z.items.filter(i=>i.ar).slice(0,3);if(!its.length)return;art.append(el('h3',null,z.name.ar));lines.push(`*${z.name.ar}*`);html.push(`<h3>${z.name.ar}</h3><ul>`);const ul=el('ul');
    its.forEach(i=>{const s=(i.src||[]).map(x=>B.sources[x]).filter(Boolean).slice(0,2);const li=el('li');li.append(el('span',null,i.ar.split(/(?<=[.!؟])\s/)[0]+' '));
      s.forEach(x=>{const a=el('a',null,x.ar);a.href=x.url;a.target='_blank';a.rel='noopener';li.append(' · ',a)});ul.append(li);
      lines.push('• '+i.ar.split(/(?<=[.!؟])\s/)[0],'  '+s.map(x=>x.url).join(' '));html.push(`<li>${i.ar.split(/(?<=[.!؟])\s/)[0]} ${s.map(x=>`<a href="${x.url}">${x.ar}</a>`).join(' · ')}</li>`)});art.append(ul);lines.push('');html.push('</ul>')});
  const site=CFG.SITE||location.origin+'/';lines.push(`كل خبر بمصادره: ${site}`);html.push(`<p><a href="${site}">اقرأ «خبر» كاملاً</a> · كل خبر بمصدرين مستقلين على الأقل.</p>`);
  $('#share-wa').href='https://wa.me/?text='+encodeURIComponent(lines.join('\n'));
  $('#copy-mail').onclick=async()=>{try{await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html.join('')],{type:'text/html'}),'text/plain':new Blob([lines.join('\n')],{type:'text/plain'})})]);toast('نُسخ العدد؛ الصقه في رسالة بريد.')}catch(e){try{await navigator.clipboard.writeText(lines.join('\n'));toast('نُسخ العدد.')}catch(_){}}};
}
Promise.all([fetch('../data/brief.json',{cache:'no-cache'}).then(r=>r.json()),fetch('../data/admin.json',{cache:'no-cache'}).then(r=>r.json()).catch(()=>({}))]).then(([b,a])=>{B=b;ADMIN=a||{};issue()}).catch(()=>{$('#issue').textContent='تعذّر تحميل عدد اليوم.'});
})();
