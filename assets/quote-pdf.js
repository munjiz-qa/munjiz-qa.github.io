'use strict';
// عرض السعر بصيغة PDF على ترويسة منجز وختمها: يُستخدم في الموقع (العرض المبدئي) وفي لوحة الإدارة (العرض الرسمي).
// يُبنى العرض صفحة HTML بمقاس A4، ثم يُحوَّل إلى ملف PDF داخل المتصفح نفسه، فلا تُرسل بيانات العميل إلى أي خدمة خارجية.
// المكتبتان (html2canvas وjsPDF) محفوظتان في assets/vendor وتُحمَّلان عند أول طلب فقط.
(function(){
const SRC=(document.currentScript&&document.currentScript.src)||'';
const BASE=SRC?SRC.replace(/[^/]*$/,''):'assets/';
const CFG=window.MUNJIZ_CONFIG||{};
const CO={ar:'منجز لخدمات الأعمال ذ.م.م',en:'Munjiz Business Services LLC',city_ar:'لوسيل، قطر',city_en:'Lusail, Qatar',cr:'',
  phone:CFG.PHONE||'+974 5160 0498',email:CFG.EMAIL||'munijizqa@gmail.com',web:'munjiz-qa.github.io'};
const C1='#7a1e3a',C2='#b8923a',INK='#1d252c',MUTE='#5b6670',LINE='#dfe5e2';
const T={
  ar:{title:'عرض سعر',prelim:'عرض سعر مبدئي',no:'رقم العرض',date:'تاريخ الإصدار',valid:'صالح حتى',to:'مقدَّم إلى',from:'مقدَّم من',
    co:'الشركة',phone:'الجوال',email:'البريد',cr:'السجل التجاري',
    cols:['#','الخدمة','العدد','سعر الوحدة','الإجمالي'],sum:'إجمالي أتعاب منجز',gov:'الرسوم الحكومية التقديرية',grand:'الإجمالي التقديري',cur:'ر.ق',fromP:'يبدأ من',
    custom:'بنود تُسعَّر بعد المراجعة',notes:'ملاحظات',terms:'الشروط',
    tCur:'المبالغ بالريال القطري.',
    tGovIn:'الرسوم الحكومية المذكورة تقديرية، وتُدفع للجهة المختصة بإيصالها الرسمي حسب المبلغ الفعلي.',
    tGovOut:'الرسوم الحكومية غير مشمولة، وتُدفع منفصلة بإيصالها الرسمي.',
    tFrom:'أسعار الدراسات والاستشارات تبدأ من المبلغ المذكور، ويُحدَّد المبلغ النهائي بعد تحديد نطاق العمل.',
    tStart:'يبدأ العمل بعد اعتماد العرض واستلام المستندات المطلوبة كاملة.',
    tPrelim:'هذا عرض مبدئي، ويُعتمد بعد مراجعة المستندات ونوع المعاملة.',
    tValid:n=>`هذا العرض صالح لمدة ${n} يوماً من تاريخ إصداره.`,
    req:'متطلبات بدء العمل من العميل',reqs:['اسم المسؤول عن التواصل وبريده وجواله.','هاتف المسؤول عن الأوتوب أو بطاقة العمل.','نسبة الزيادة المطلوبة لكل الأصناف.','ملف الأصناف Excel، أو إعداده من منجز مقابل 300 ر.ق إضافية.'],
    accept:'اعتماد العميل',aName:'الاسم',aSign:'التوقيع',aDate:'التاريخ',for:'عن منجز لخدمات الأعمال',stampName:'منجز لخدمات الأعمال ذ.م.م',stampCity:'لوسيل · قطر',est:'تأسست 2026',
    page:(i,n)=>`صفحة ${i} من ${n}`},
  en:{title:'Quotation',prelim:'Preliminary quotation',no:'Quote no.',date:'Issue date',valid:'Valid until',to:'Prepared for',from:'Prepared by',
    co:'Company',phone:'Mobile',email:'Email',cr:'C.R. No.',
    cols:['#','Service','Qty','Unit price','Total'],sum:'Total Munjiz fees',gov:'Estimated government fees',grand:'Estimated total',cur:'QAR',fromP:'from',
    custom:'Items priced after review',notes:'Notes',terms:'Terms',
    tCur:'Amounts are in Qatari riyals.',
    tGovIn:'Government fees shown are estimates and are paid to the authority against its official receipt at the actual amount.',
    tGovOut:'Government fees are not included and are paid separately against the official receipt.',
    tFrom:'Studies and consulting are starting prices; the final amount is set once the scope is agreed.',
    tStart:'Work starts once the quotation is approved and all required documents are received.',
    tPrelim:'This is a preliminary quotation, confirmed after we review the documents and the transaction type.',
    tValid:n=>`This quotation is valid for ${n} days from its issue date.`,
    req:'What we need from the client to start',reqs:['Contact person: name, email and mobile.','Phone of the person in charge of the autobook or work card.','Markup percentage for all items.','Items Excel file, or Munjiz prepares it for an extra QAR 300.'],
    accept:'Client approval',aName:'Name',aSign:'Signature',aDate:'Date',for:'For Munjiz Business Services',stampName:'MUNJIZ BUSINESS SERVICES',stampCity:'LUSAIL · QATAR',est:'EST. 2026',
    page:(i,n)=>`Page ${i} of ${n}`}};
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>(Math.round((Number(n)||0)*100)/100).toLocaleString('en-US');
// +974 XXXX XXXX for Qatari numbers, the rest as typed
const phone=v=>{const d=String(v||'').replace(/\D/g,'');const l=d.length===8||(d.length===11&&d.startsWith('974'))?d.slice(-8):'';return l?`+974 ${l.slice(0,4)} ${l.slice(4)}`:String(v||'')};
// left-to-right values (phones, emails, numbers) sit in their own box so they keep their order inside Arabic lines
const li=x=>`<div class="bq-li"><i></i><span dir="auto">${esc(x)}</span></div>`;
const ltr=s=>`<span class="bq-ltr">${esc(s)}</span>`;

const CSS=`
.bq-doc{width:794px;min-height:1123px;box-sizing:border-box;background:#fff;color:${INK};padding:38px 48px 30px;font:13px/1.6 "Tajawal","Readex Pro",Tahoma,Arial,sans-serif;display:flex;flex-direction:column;gap:14px;text-align:start}
.bq-doc *{box-sizing:border-box}
.bq-doc table{min-width:0;border-collapse:collapse;font-size:inherit}
.bq-doc th,.bq-doc td{border-top:0;text-align:start;background:none}
.bq-doc h1,.bq-doc h3{text-wrap:wrap}
.bq-doc .bq-ltr{display:inline-block;direction:ltr;unicode-bidi:normal}
.bq-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding-bottom:12px;border-bottom:3px solid ${C1}}
.bq-brand{display:flex;align-items:center;gap:12px}
.bq-brand b{display:block;font:700 19px/1.3 "Readex Pro","Tajawal",Tahoma,sans-serif;color:${C1}}
.bq-brand small{display:block;color:${MUTE};font-size:12px}
.bq-ttl{text-align:end}
.bq-doc .bq-ttl h1{margin:0;font:700 26px/1.2 "Readex Pro","Tajawal",Tahoma,sans-serif;color:${C1}}
.bq-doc .bq-ttl table{width:auto;margin-top:6px;margin-inline-start:auto;border-collapse:collapse;font-size:12.5px}
.bq-doc .bq-ttl td{padding:0;line-height:1.55;color:${MUTE}}.bq-doc .bq-ttl td+td{padding-inline-start:12px;color:${INK};font-weight:700;text-align:end}
.bq-gold{height:3px;background:${C2};margin-top:-14px;width:120px}
.bq-parties{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.bq-box{border:1px solid ${LINE};border-radius:10px;padding:8px 14px;background:#fafbfa}
.bq-box h3{margin:0 0 4px;font:700 12px/1.5 "Readex Pro","Tajawal",Tahoma,sans-serif;color:${C2}}
.bq-box b{display:block;font-size:15px}
.bq-box div{color:#36424c;font-size:12px;line-height:1.55}
.bq-doc .bq-tbl{width:100%;border-collapse:collapse;font-size:13px}
.bq-doc .bq-tbl th{background:${C1};color:#fff;font-weight:700;padding:6px 10px;text-align:start}
.bq-doc .bq-tbl td{padding:6px 10px;border-bottom:1px solid ${LINE};vertical-align:top}
.bq-doc .bq-tbl tr:nth-child(even) td{background:#f6f8f7}
.bq-doc .bq-tbl td.n,.bq-doc .bq-tbl th.n{text-align:center;white-space:nowrap}
.bq-doc .bq-tbl .i{width:34px;color:${MUTE}}
.bq-doc .bq-tbl .code{display:inline-block;direction:ltr;font-size:11px;color:${MUTE};border:1px solid ${LINE};border-radius:4px;padding:0 5px;margin-inline-start:6px}
.bq-doc .bq-tot{display:flex;justify-content:flex-end}
.bq-doc .bq-tot table{width:auto;min-width:330px;border-collapse:collapse;font-size:13.5px}
.bq-doc .bq-tot td{padding:5px 12px;border-bottom:1px solid ${LINE}}.bq-doc .bq-tot td+td{text-align:end;white-space:nowrap;font-weight:700}
.bq-doc .bq-tot tr.g td{background:${C1};color:#fff;border:0;font-size:15px}
.bq-sec h3{margin:0 0 4px;font:700 13px/1.5 "Readex Pro","Tajawal",Tahoma,sans-serif;color:${C1}}
.bq-li{display:flex;gap:8px;align-items:baseline;color:#36424c;font-size:12.3px;line-height:1.6}.bq-li i{flex:0 0 5px;width:5px;height:5px;border-radius:50%;background:${C2};transform:translateY(-2px)}
.bq-sec p{margin:0;color:#36424c;font-size:12.5px;white-space:pre-line}
.bq-sign{display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:end;margin-top:auto;padding-top:6px}
.bq-acc{border:1px dashed #b9c4bf;border-radius:10px;padding:8px 14px;font-size:12.5px}
.bq-acc h3{margin:0 0 6px;font:700 12.5px/1.5 "Readex Pro","Tajawal",Tahoma,sans-serif;color:${C1}}
.bq-acc div{display:flex;gap:8px;padding:3px 0;border-bottom:1px dotted #c7cfcb}.bq-acc div:last-child{border:0}
.bq-acc span{color:${MUTE};min-width:62px}
.bq-st{display:flex;align-items:center;gap:12px;justify-content:flex-end}
.bq-st div{text-align:center;font-size:12.5px}.bq-st b{display:block;font-size:13.5px}.bq-st .bq-ln{display:block;margin-top:10px;color:#5b6670}
.bq-foot{border-top:2px solid ${C2};padding-top:6px;color:${MUTE};font-size:11px;text-align:center}
`;
function style(){if(document.getElementById('bq-css'))return;const s=document.createElement('style');s.id='bq-css';s.textContent=CSS;document.head.appendChild(s)}
const LOGO=`<svg width="46" height="46" viewBox="0 0 80 80" aria-hidden="true"><rect x="5" y="5" width="70" height="70" rx="18" fill="none" stroke="${C2}" stroke-width="5"/><path d="M22 42l12 12 24-28" fill="none" stroke="${C1}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
function stamp(t,en){const c='#7a1e3a';
  return `<svg viewBox="0 0 200 200" width="100" height="100" role="img" aria-label="${esc(t.stampName)}"><defs><path id="bqTop" d="M32 100 A68 68 0 0 1 168 100"/><path id="bqBot" d="M20 100 A80 80 0 0 0 180 100"/></defs>
   <g fill="none" stroke="${c}"><circle cx="100" cy="100" r="94" stroke-width="4"/><circle cx="100" cy="100" r="86" stroke-width="1.5"/><circle cx="100" cy="100" r="52" stroke-width="1.5"/></g>
   <text fill="${c}" font-family="Tahoma,Arial,sans-serif" font-weight="700" font-size="${en?11.5:15}"><textPath href="#bqTop" startOffset="50%" text-anchor="middle">${esc(t.stampName)}</textPath></text>
   <text fill="${c}" font-family="Tahoma,Arial,sans-serif" font-weight="700" font-size="${en?12:15}"><textPath href="#bqBot" startOffset="50%" text-anchor="middle">${esc(t.stampCity)}</textPath></text>
   <circle cx="34" cy="100" r="3" fill="${c}"/><circle cx="166" cy="100" r="3" fill="${c}"/>
   <path d="M78 96l14 14 30-34" fill="none" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
   <text x="100" y="132" fill="${c}" text-anchor="middle" font-family="Tahoma,Arial,sans-serif" font-weight="700" font-size="11">${esc(t.est)}</text></svg>`}

// d: {lang, no, date, validUntil, validDays, prelim, client:{name,co,phone,email,cr}, lines:[{c,n,q,p,from}], custom:[text], gov, notes}
function totals(d){const fees=(d.lines||[]).reduce((a,l)=>a+(+l.p||0)*(Math.max(1,+l.q||1)),0),gov=+d.gov||0;
  return {fees:Math.round(fees*100)/100,gov,grand:Math.round((fees+gov)*100)/100,from:(d.lines||[]).some(l=>l.from)}}
function html(d){const en=d.lang==='en',t=T[en?'en':'ar'],c=d.client||{},s=totals(d),cur=t.cur,F=s.from?t.fromP+' ':'';
  const lines=d.lines||[],custom=(d.custom||[]).filter(Boolean);
  const terms=[t.tCur,s.gov?t.tGovIn:t.tGovOut,...(s.from?[t.tFrom]:[]),t.tStart,...(d.prelim?[t.tPrelim]:[]),t.tValid(d.validDays||14)];
  return `<div class="bq-doc" dir="${en?'ltr':'rtl'}" lang="${en?'en':'ar'}">
  <div class="bq-head" data-brk><div class="bq-brand">${LOGO}<div><b>${esc(en?CO.en:CO.ar)}</b><small>${esc(en?CO.ar:CO.en)}</small><small>${CO.cr?t.cr+' '+ltr(CO.cr)+' · ':''}${esc(en?CO.city_en:CO.city_ar)}</small></div></div>
    <div class="bq-ttl"><h1>${d.prelim?t.prelim:t.title}</h1><table><tr><td>${t.no}</td><td>${ltr(d.no)}</td></tr><tr><td>${t.date}</td><td>${ltr(d.date)}</td></tr>${d.validUntil?`<tr><td>${t.valid}</td><td>${ltr(d.validUntil)}</td></tr>`:''}</table></div></div>
  <div class="bq-gold"></div>
  <div class="bq-parties" data-brk>
    <div class="bq-box"><h3>${t.to}</h3><b dir="auto">${esc(c.co||c.name)}</b>${c.co&&c.name?`<div dir="auto">${esc(c.name)}</div>`:''}${c.phone?`<div>${t.phone}: ${ltr(phone(c.phone))}</div>`:''}${c.email?`<div>${t.email}: ${ltr(c.email)}</div>`:''}${c.cr?`<div>${t.cr}: ${ltr(c.cr)}</div>`:''}</div>
    <div class="bq-box"><h3>${t.from}</h3><b>${esc(en?CO.en:CO.ar)}</b><div>${esc(en?CO.city_en:CO.city_ar)}</div><div>${t.phone}: ${ltr(CO.phone)}</div><div>${t.email}: ${ltr(CO.email)}</div></div>
  </div>
  ${lines.length?`<table class="bq-tbl"><thead><tr data-brk><th class="i">${t.cols[0]}</th><th>${t.cols[1]}</th><th class="n">${t.cols[2]}</th><th class="n">${t.cols[3]}</th><th class="n">${t.cols[4]}</th></tr></thead><tbody>
    ${lines.map((l,i)=>{const q=Math.max(1,+l.q||1);return `<tr data-brk><td class="i">${i+1}</td><td><span dir="auto">${esc(l.n)}</span>${l.c?`<span class="code">${esc(l.c)}</span>`:''}</td><td class="n">${fmt(q)}</td><td class="n">${l.from?t.fromP+' ':''}${fmt(l.p)}</td><td class="n">${fmt((+l.p||0)*q)}</td></tr>`}).join('')}</tbody></table>
  <div class="bq-tot" data-brk><table><tr><td>${t.sum}</td><td>${F}${fmt(s.fees)} ${cur}</td></tr>${s.gov?`<tr><td>${t.gov}</td><td>${fmt(s.gov)} ${cur}</td></tr>`:''}<tr class="g"><td>${t.grand}</td><td>${F}${fmt(s.grand)} ${cur}</td></tr></table></div>`:''}
  ${custom.length?`<div class="bq-sec" data-brk><h3>${t.custom}</h3>${custom.map(li).join('')}</div>`:''}
  ${d.notes?`<div class="bq-sec" data-brk><h3>${t.notes}</h3><p dir="auto">${esc(d.notes)}</p></div>`:''}
  <div class="bq-sec" data-brk><h3>${t.req}</h3>${t.reqs.map(li).join('')}</div>
  <div class="bq-sec" data-brk><h3>${t.terms}</h3>${terms.map(li).join('')}</div>
  <div class="bq-sign" data-brk>
    ${d.prelim?'<div></div>':`<div class="bq-acc"><h3>${t.accept}</h3><div><span>${t.aName}</span></div><div><span>${t.aSign}</span></div><div><span>${t.aDate}</span></div></div>`}
    <div class="bq-st"><div><b>${t.for}</b>${d.prelim?'':`<span class="bq-ln">${t.aName}: ....................</span><span class="bq-ln">${t.aSign}: ....................</span>`}</div>${stamp(t,en)}</div>
  </div>
  <div class="bq-foot" data-brk>${esc(en?CO.en:CO.ar)} · ${CO.cr?t.cr+' '+ltr(CO.cr)+' · ':''}${ltr(CO.phone)} · ${ltr(CO.email)} · ${ltr(CO.web)}</div>
</div>`}

// the two libraries load once, from this site only
const loaded={};
function load(name){return loaded[name]||(loaded[name]=new Promise((res,rej)=>{const s=document.createElement('script');s.src=BASE+'vendor/'+name;s.onload=res;s.onerror=()=>{delete loaded[name];rej(new Error('load'))};document.head.appendChild(s)}))}
async function pdf(d){style();await Promise.all([load('html2canvas.min.js'),load('jspdf.umd.min.js')]);
  if(document.fonts&&document.fonts.ready)try{await document.fonts.ready}catch(e){}
  const host=document.createElement('div');host.setAttribute('aria-hidden','true');host.style.cssText='position:absolute;left:-12000px;top:0;width:794px;pointer-events:none';
  host.innerHTML=html(d);document.body.appendChild(host);const doc=host.firstElementChild;
  try{
    const top=doc.getBoundingClientRect().top,H=Math.ceil(doc.getBoundingClientRect().height);
    const brk=[...doc.querySelectorAll('[data-brk]')].map(e=>Math.round(e.getBoundingClientRect().bottom-top)).sort((a,b)=>a-b);
    const SC=2,canvas=await window.html2canvas(doc,{scale:SC,backgroundColor:'#ffffff',logging:false,useCORS:true,windowWidth:1200});
    // pages of A4 cut between rows and blocks, never through them
    const PH=1123,MT=40,cuts=[0];let at=0;
    while(H-at>PH){const lim=at+(at?PH-MT:PH)-30;let c=brk.filter(b=>b>at+200&&b<=lim).pop();if(!c)c=lim;cuts.push(c);at=c}
    cuts.push(H);
    const {jsPDF}=window.jspdf,out=new jsPDF({unit:'pt',format:'a4',compress:true}),W=out.internal.pageSize.getWidth(),k=W/794;
    const en=d.lang==='en',t=T[en?'en':'ar'];
    for(let i=0;i<cuts.length-1;i++){const y0=cuts[i],h=cuts[i+1]-y0;if(i)out.addPage();
      const pc=document.createElement('canvas');pc.width=794*SC;pc.height=Math.ceil(h*SC);const g=pc.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,pc.width,pc.height);
      g.drawImage(canvas,0,y0*SC,canvas.width,h*SC,0,0,pc.width,h*SC);
      out.addImage(pc.toDataURL('image/jpeg',0.92),'JPEG',0,i?MT*k:0,W,h*k,undefined,'FAST')}
    out.setProperties({title:`${d.prelim?t.prelim:t.title} ${d.no}`,subject:`${t.title} ${d.no} · ${(d.client||{}).co||(d.client||{}).name||''}`,author:en?CO.en:CO.ar,creator:en?CO.en:CO.ar,keywords:d.no});
    return out.output('blob')
  }finally{host.remove()}}
const fileName=d=>`${d.no||'quote'}.pdf`;
function save(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.hidden=true;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000)}
// the phone's share sheet (WhatsApp, email, …) with the PDF itself attached, where the browser allows it
function canShare(){try{return !!(navigator.canShare&&navigator.canShare({files:[new File([new Blob(['x'],{type:'application/pdf'})],'x.pdf',{type:'application/pdf'})]}))}catch(e){return false}}
async function share(blob,name,text){const f=new File([blob],name,{type:'application/pdf'});await navigator.share({files:[f],title:name.replace(/\.pdf$/,''),text})}
const b64=blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(blob)});
window.QuotePDF={html:d=>{style();return html(d)},pdf,save,share,canShare,b64,totals,phone,fileName,fmt,T};
})();
