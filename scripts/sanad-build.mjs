// Builds the «سند من منجز» pages: sanad/index.html (Arabic) and sanad/en/index.html (English).
// Edit the texts in C below, then run:  node scripts/sanad-build.mjs
import {writeFileSync,mkdirSync} from 'node:fs';
const SITE='https://munjiz-qa.github.io/sanad/';

const ICON={
  chat:'<path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  people:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.8 3 2.6 3.5 5.2"/>',
  check:'<path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  pulse:'<path d="M3 12h4l2-5 4 10 2-5h6"/>'
};
const icon=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`;

const C={
ar:{
  dir:'rtl',root:'../',self:'',other:'en/',otherLabel:'English',
  title:'سند من منجز | موظفك الرقمي على واتساب وموقعك',
  desc:'سند موظف رقمي من منجز يرد على عملائك في واتساب والموقع على مدار الساعة، ويحجز المواعيد، ويسجّل كل عميل محتمل، ويرسل لك تقرير يومك كل صباح. لمنشآت قطر والخليج.',
  by:'من منجز',skip:'تخطَّ إلى المحتوى',
  nav:[['#features','المزايا'],['#how','كيف يعمل'],['#plans','الباقات'],['#faq','الأسئلة']],navCta:'اطلب سند',
  eyebrow:'خدمة جديدة من منجز لخدمات الأعمال',
  h1:'موظفك الرقمي<br><em>الذي لا يغيب</em>',
  lead:'سند يرد على عملائك في واتساب وموقعك على مدار الساعة، يحجز المواعيد، يسجّل كل عميل محتمل، ويضع تقرير يومك أمامك كل صباح. وأي رد فيه سعر أو التزام لا يُرسل إلا بموافقتك.',
  cta1:'اطلب عرض سعر',cta2:'تحدّث معنا على واتساب',waHello:'مرحباً، أرغب في معرفة المزيد عن خدمة سند من منجز.',
  facts:[['24/7','ردود دون انقطاع'],['3–5 أيام عمل','للتشغيل الكامل'],['عربي وإنجليزي','بلهجة عملائك']],
  thread:{name:'سند · مساعد العيادة',status:'متصل الآن',msgs:[
    ['in','السلام عليكم، عندكم موعد تنظيف أسنان هذا الأسبوع؟','21:42'],
    ['out','وعليكم السلام، أهلاً بك. المتاح يوم الأربعاء 29 أكتوبر:','21:42',['10:30','13:00','17:15']],
    ['in','17:15 مناسب','21:43'],
    ['out','تم حجز موعدك يوم الأربعاء 29 أكتوبر 2026 الساعة 17:15. سأرسل لك تذكيراً قبلها بساعتين.','21:43'],
  ],sys:'سُجّل العميل في الجدول وأُبلغ المدير'},
  strip:['يعمل على','واتساب للأعمال','موقعك','تيليجرام','البريد','تقويم Google'],
  fh:'ماذا يفعل سند لمنشأتك',fp:'ست مهام يتولاها كل يوم، دون إجازات ودون أن ينسى عميلاً.',
  feats:[
    ['chat','يرد فوراً، ليلاً ونهاراً','يجيب عن الأسئلة المتكررة بالأسعار والمواعيد والعناوين التي تعتمدها أنت، بالعربية والإنجليزية.'],
    ['cal','يحجز المواعيد','يعرض الأوقات المتاحة من تقويمك، ويثبّت الحجز، ويرسل التذكير قبل الموعد.'],
    ['people','لا يضيع عميل','كل من يسأل يُسجَّل في جدول العملاء مع طلبه ورقمه، ويذكّرك سند بمن لم يُرَدّ عليه خلال 24 ساعة.'],
    ['check','لا شيء دون موافقتك','الردود التي فيها سعر خاص أو التزام تصلك أولاً بزرّي «إرسال» و«إلغاء».'],
    ['sun','تقرير كل صباح','في 07:30 بتوقيت الدوحة: الرسائل الجديدة، والطلبات، ومواعيد اليوم، وما ينتظر قرارك.'],
    ['pulse','يراقب موقعك','يفحص موقعك كل 10 دقائق، وينبّهك فور توقفه وعند عودته.'],
  ],
  hh:'من أول مكالمة إلى أول رد',hp:'نتولى الإعداد كاملاً، وتبقى أنت صاحب القرار في كل خطوة.',
  steps:[
    ['جلسة تعريف','نجمع معك الأسئلة المتكررة والأسعار وساعات العمل وطريقة الحجز.','30 دقيقة'],
    ['الربط والتجربة','نربط سند بقنواتك، ونختبره معك على محادثات حقيقية قبل التشغيل.','2–4 أيام عمل'],
    ['التشغيل والمتابعة','يبدأ سند العمل، ونراجع معك أداءه أسبوعياً ونحسّن ردوده.','مستمر'],
  ],
  ph:'الباقات',pp:'السعر حسب عدد القنوات وحجم المحادثات. نرسل لك عرض سعر واضحاً خلال يوم عمل واحد.',
  plans:[
    ['start','البداية','للمنشأة التي تريد ألا تفوتها رسالة.',['قناة واحدة: واتساب أو الموقع','الرد على الأسئلة المتكررة','تحويل المحادثة لك عند الحاجة','التقرير الصباحي'],false],
    ['biz','الأعمال','للعيادات والمكاتب والمتاجر التي تعتمد على المواعيد.',['قناتان أو أكثر','حجز المواعيد والتذكير','جدول العملاء والمتابعة','موافقتك قبل الردود الحساسة'],true],
    ['corp','المؤسسات','للجهات التي تريد سند مربوطاً بأنظمتها.',['قنوات متعددة وفروع','ربط البريد والتقويم والجداول','مراقبة المواقع والتنبيهات','مدير حساب ودعم مخصص'],false],
  ],
  planTag:'الأكثر طلباً',planPrice:'عرض سعر خلال يوم عمل',planBtn:'اطلب هذه الباقة',
  th:'بياناتك في أمان',
  trust:[
    ['تبقى بياناتك لك','سجلات العملاء تُحفظ في حساباتك أنت (جداول Google وبريدك)، ونسلّمك صلاحيات الإدارة كاملة.'],
    ['حدود واضحة لسند','لا يرسل بريداً ولا يؤكد سعراً خاصاً دون موافقتك، ويحوّل أي محادثة خارج اختصاصه إليك.'],
  ],
  qh:'أسئلة شائعة',
  faq:[
    ['هل يرد سند بالعربية والإنجليزية؟','نعم، يرد بلغة العميل نفسها، ونضبط أسلوبه ليناسب نشاطك.'],
    ['هل يرسل سند شيئاً دون علمي؟','يرد تلقائياً على الأسئلة المعتادة التي اعتمدتها فقط. أي رد فيه سعر خاص أو التزام يصلك أولاً لتوافق عليه بضغطة.'],
    ['ماذا يحدث إذا لم يعرف سند الإجابة؟','يعتذر للعميل بلطف، ويحوّل المحادثة إليك فوراً مع ملخص لما طلبه.'],
    ['هل أحتاج رقم واتساب جديداً؟','يُفضَّل رقم مخصص لواتساب للأعمال. إن أردت استخدام رقمك الحالي نراجع معك الخيارات المتاحة في جلسة التعريف.'],
    ['كم يستغرق التشغيل؟','من 3 إلى 5 أيام عمل بعد جلسة التعريف واستلام البيانات اللازمة.'],
    ['أين تُحفظ بيانات عملائي؟','في حساباتك أنت، مثل جداول Google وبريدك. تفاصيل ذلك في سياسة الخصوصية.'],
  ],
  rh:'اطلب سند لمنشأتك',rp:'املأ النموذج وسنتواصل معك خلال يوم عمل واحد بعرض سعر واضح. أو تواصل معنا مباشرة:',
  cWa:'واتساب',cMail:'البريد',cTel:'الهاتف',
  form:{name:'الاسم',co:'اسم المنشأة',coPh:'اختياري',phone:'رقم الجوال',phonePh:'+974 5XXX XXXX',mail:'البريد الإلكتروني',mailPh:'اختياري',plan:'الباقة',
    planOpts:[['start','البداية'],['biz','الأعمال'],['corp','المؤسسات'],['unsure','لم أحدد بعد']],
    ch:'القنوات التي تريدها',chOpts:['واتساب','الموقع','تيليجرام','البريد'],note:'أخبرنا عن نشاطك',notePh:'مثال: عيادة أسنان في الدوحة، نستقبل 40 رسالة يومياً',
    agree:'أوافق على <a href="../privacy.html">سياسة الخصوصية</a> واستخدام بياناتي للتواصل معي بشأن طلبي.',send:'أرسل الطلب',
    outWa:'أرسل عبر واتساب',outMail:'أرسل بالبريد',outCopy:'انسخ النص'},
  foot:'سند خدمة من منجز لخدمات الأعمال ذ.م.م، الدوحة، قطر.',fMunjiz:'موقع منجز',fPriv:'سياسة الخصوصية',fLegal:'الشروط',
  privacy:'../privacy.html',legal:'../legal.html',munjiz:'../'
},
en:{
  dir:'ltr',root:'../../',self:'en/',other:'',otherLabel:'العربية',
  title:'Sanad by Munjiz | Your digital employee on WhatsApp and your website',
  desc:'Sanad by Munjiz answers your customers on WhatsApp and your website around the clock, books appointments, logs every lead and sends you a morning report. For businesses in Qatar and the Gulf.',
  by:'by Munjiz',skip:'Skip to content',
  nav:[['#features','Features'],['#how','How it works'],['#plans','Packages'],['#faq','FAQ']],navCta:'Get Sanad',
  eyebrow:'A new service from Munjiz Business Services',
  h1:'The digital employee<br><em>who never clocks out</em>',
  lead:'Sanad answers your customers on WhatsApp and your website around the clock, books appointments, logs every lead and puts your day in front of you every morning. Any reply that quotes a price or makes a commitment waits for your approval.',
  cta1:'Request a quote',cta2:'Chat with us on WhatsApp',waHello:'Hello, I would like to know more about Sanad by Munjiz.',
  facts:[['24/7','replies without a break'],['3–5 working days','to go live'],['Arabic & English','in your customers\' tone']],
  thread:{name:'Sanad · Clinic assistant',status:'online',msgs:[
    ['in','Hi, do you have a cleaning appointment this week?','21:42'],
    ['out','Hello and welcome. Available on Wednesday 29 October:','21:42',['10:30','13:00','17:15']],
    ['in','17:15 works','21:43'],
    ['out','Booked: Wednesday 29 October 2026 at 17:15. I will send you a reminder two hours before.','21:43'],
  ],sys:'Lead saved to the sheet and manager notified'},
  strip:['Works on','WhatsApp Business','Your website','Telegram','E-mail','Google Calendar'],
  fh:'What Sanad does for your business',fp:'Six jobs it handles every day, with no days off and no forgotten customers.',
  feats:[
    ['chat','Instant replies, day and night','Answers recurring questions with the prices, hours and addresses you approve, in Arabic and English.'],
    ['cal','Books appointments','Offers open slots from your calendar, confirms the booking and sends a reminder.'],
    ['people','No lead slips away','Everyone who asks is logged with their request and number, and Sanad reminds you of anyone not answered within 24 hours.'],
    ['check','Nothing without your approval','Replies with a special price or a commitment reach you first with Send and Cancel buttons.'],
    ['sun','A report every morning','At 07:30 Doha time: new messages, requests, today\'s appointments and what needs your decision.'],
    ['pulse','Watches your website','Checks your site every 10 minutes and alerts you the moment it goes down and when it is back.'],
  ],
  hh:'From the first call to the first reply',hp:'We handle the whole setup, and you stay in charge at every step.',
  steps:[
    ['Discovery session','We collect your recurring questions, prices, working hours and booking rules.','30 minutes'],
    ['Connect and test','We connect Sanad to your channels and test it with you on real conversations.','2–4 working days'],
    ['Go live and improve','Sanad starts work, and we review its performance with you every week.','Ongoing'],
  ],
  ph:'Packages',pp:'Pricing depends on the number of channels and message volume. You get a clear quote within one working day.',
  plans:[
    ['start','Starter','For businesses that never want to miss a message.',['One channel: WhatsApp or website','Answers recurring questions','Hands the chat to you when needed','Morning report'],false],
    ['biz','Business','For clinics, offices and shops that run on appointments.',['Two or more channels','Booking and reminders','Lead sheet and follow-up','Your approval on sensitive replies'],true],
    ['corp','Enterprise','For organisations that want Sanad connected to their systems.',['Multiple channels and branches','E-mail, calendar and sheet integration','Website monitoring and alerts','Account manager and dedicated support'],false],
  ],
  planTag:'Most requested',planPrice:'Quote within one working day',planBtn:'Request this package',
  th:'Your data stays safe',
  trust:[
    ['Your data stays yours','Customer records live in your own accounts (Google Sheets and your mailbox), and you get full admin rights.'],
    ['Clear limits for Sanad','It never sends an e-mail or confirms a special price without your approval, and hands you anything outside its scope.'],
  ],
  qh:'Frequently asked questions',
  faq:[
    ['Does Sanad reply in Arabic and English?','Yes. It replies in the customer\'s language, in a tone set for your business.'],
    ['Will Sanad send anything without my knowledge?','It only auto-answers the routine questions you approved. Anything with a special price or commitment reaches you first for one-tap approval.'],
    ['What if Sanad does not know the answer?','It apologises politely and hands the conversation to you at once with a summary of the request.'],
    ['Do I need a new WhatsApp number?','A dedicated WhatsApp Business number is recommended. If you want to keep your current one, we review the options with you in the discovery session.'],
    ['How long does setup take?','Three to five working days after the discovery session and receiving the required details.'],
    ['Where is my customer data stored?','In your own accounts, such as Google Sheets and your mailbox. Details are in the privacy policy.'],
  ],
  rh:'Get Sanad for your business',rp:'Fill in the form and we will contact you within one working day with a clear quote. Or reach us directly:',
  cWa:'WhatsApp',cMail:'E-mail',cTel:'Phone',
  form:{name:'Name',co:'Business name',coPh:'Optional',phone:'Mobile number',phonePh:'+974 5XXX XXXX',mail:'E-mail',mailPh:'Optional',plan:'Package',
    planOpts:[['start','Starter'],['biz','Business'],['corp','Enterprise'],['unsure','Not sure yet']],
    ch:'Channels you want',chOpts:['WhatsApp','Website','Telegram','E-mail'],note:'Tell us about your business',notePh:'e.g. Dental clinic in Doha, about 40 messages a day',
    agree:'I agree to the <a href="../../en/privacy.html">privacy policy</a> and to being contacted about my request.',send:'Send request',
    outWa:'Send on WhatsApp',outMail:'Send by e-mail',outCopy:'Copy text'},
  foot:'Sanad is a service of Munjiz Business Services LLC, Doha, Qatar.',fMunjiz:'Munjiz website',fPriv:'Privacy policy',fLegal:'Terms',
  privacy:'../../en/privacy.html',legal:'../../en/legal.html',munjiz:'../../en/'
}};

function page(L,c){
const R=c.root, A=L==='ar'?'assets/':'../assets/';
const url=SITE+c.self;
const ld={"@context":"https://schema.org","@type":"Service","name":L==='ar'?'سند من منجز':'Sanad by Munjiz',"serviceType":L==='ar'?'موظف رقمي ذكي لخدمة العملاء':'AI customer-service assistant',"description":c.desc,"url":url,"areaServed":["QA","SA","AE","KW","BH","OM"],"availableLanguage":["ar","en"],
  "provider":{"@type":"Organization","name":L==='ar'?'منجز لخدمات الأعمال':'Munjiz Business Services',"url":"https://munjiz-qa.github.io/","email":"munijizqa@gmail.com","telephone":"+974 5160 0498"}};
const faqLd={"@context":"https://schema.org","@type":"FAQPage","mainEntity":c.faq.map(([q,a])=>({"@type":"Question","name":q,"acceptedAnswer":{"@type":"Answer","text":a}}))};
const t=c.thread;
return `<!doctype html>
<html lang="${L}" dir="${c.dir}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${c.title}</title>
<meta name="description" content="${c.desc}">
<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="ar" href="${SITE}">
<link rel="alternate" hreflang="en" href="${SITE}en/">
<meta name="theme-color" content="#0D4F5C">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${L==='ar'?'سند من منجز':'Sanad by Munjiz'}">
<meta property="og:title" content="${c.title}">
<meta property="og:description" content="${c.desc}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${SITE}assets/og.png">
<meta property="og:locale" content="${L==='ar'?'ar_QA':'en_QA'}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${A}mark.svg" type="image/svg+xml">
<link rel="icon" href="${A}icon-192.png" sizes="192x192" type="image/png">
<link rel="apple-touch-icon" href="${A}apple-touch-icon.png">
<link rel="manifest" href="${L==='ar'?'':'../'}manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Readex+Pro:wght@500;600;700&display=swap">
<link rel="stylesheet" href="${A}sanad.css">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
</head>
<body>
<a class="skip" href="#main">${c.skip}</a>
<header class="bar"><div class="wrap">
  <a class="brand" href="./" aria-label="${L==='ar'?'سند من منجز':'Sanad by Munjiz'}"><img src="${A}mark.svg" alt="" width="36" height="36"><span><b>${L==='ar'?'سند':'Sanad'}</b><small>${c.by}</small></span></a>
  <nav class="nav" aria-label="${L==='ar'?'التنقل':'Main'}">${c.nav.map(([h,l])=>`<a href="${h}">${l}</a>`).join('')}<a class="lang" href="${L==='ar'?'en/':'../'}" hreflang="${L==='ar'?'en':'ar'}" lang="${L==='ar'?'en':'ar'}">${c.otherLabel}</a><a class="btn btn-main" href="#request">${c.navCta}</a></nav>
</div></header>
<main id="main">
<section class="hero"><div class="wrap">
  <div>
    <span class="eyebrow">${c.eyebrow}</span>
    <h1>${c.h1}</h1>
    <p class="lead">${c.lead}</p>
    <div class="cta"><a class="btn btn-main" href="#request">${c.cta1}</a><a class="btn btn-line" data-wa="${c.waHello}" href="https://wa.me/97451600498" target="_blank" rel="noopener">${c.cta2}</a></div>
    <div class="facts">${c.facts.map(([b,s])=>`<span><b>${b}</b> ${s}</span>`).join('')}</div>
  </div>
  <div class="thread" aria-label="${L==='ar'?'مثال لمحادثة يديرها سند':'Example conversation handled by Sanad'}">
    <div class="thread-head"><img src="${A}mark.svg" alt="" width="34" height="34"><div><b>${t.name}</b><span>● ${t.status}</span></div></div>
    <div class="msgs">${t.msgs.map(([k,txt,tm,sl])=>`<div class="m ${k}">${txt}${sl?`<div class="slots">${sl.map((s,i)=>`<span class="ltr${i===2?' on':''}">${s}</span>`).join('')}</div>`:''}<time class="ltr">${tm}</time></div>`).join('')}<div class="note-sys">✓ ${t.sys}</div></div>
  </div>
</div></section>
<div class="strip"><div class="wrap"><span>${c.strip[0]}:</span>${c.strip.slice(1).map(s=>`<b>${s}</b>`).join('')}</div></div>

<section class="blk" id="features"><div class="wrap">
  <div class="sec-head"><h2>${c.fh}</h2><p>${c.fp}</p></div>
  <div class="feats">${c.feats.map(([i,h,p])=>`<div class="feat">${icon(i)}<h3>${h}</h3><p>${p}</p></div>`).join('')}</div>
</div></section>

<section class="blk how" id="how"><div class="wrap">
  <div class="sec-head"><h2>${c.hh}</h2><p>${c.hp}</p></div>
  <ol class="steps">${c.steps.map(([h,p,d])=>`<li><h3>${h}</h3><p>${p}</p><span class="dur">${d}</span></li>`).join('')}</ol>
</div></section>

<section class="blk" id="plans"><div class="wrap">
  <div class="sec-head"><h2>${c.ph}</h2><p>${c.pp}</p></div>
  <div class="plans">${c.plans.map(([id,h,f,li,pick])=>`<div class="plan${pick?' pick':''}">${pick?`<span class="tag">${c.planTag}</span>`:''}<h3>${h}</h3><p class="for">${f}</p><ul>${li.map(x=>`<li>${x}</li>`).join('')}</ul><p class="price">${c.planPrice}</p><a class="btn ${pick?'btn-main':'btn-line'}" href="#request" data-plan="${id}">${c.planBtn}</a></div>`).join('')}</div>
</div></section>

<section class="blk" style="padding-top:0"><div class="wrap">
  <div class="sec-head"><h2>${c.th}</h2></div>
  <div class="trust">${c.trust.map(([b,p])=>`<div><b>${b}</b><p>${p}</p></div>`).join('')}</div>
</div></section>

<section class="blk" id="faq" style="padding-top:0"><div class="wrap">
  <div class="sec-head"><h2>${c.qh}</h2></div>
  <div class="faq">${c.faq.map(([q,a])=>`<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>
</div></section>

<section class="blk req" id="request" style="padding-top:0"><div class="wrap">
  <div class="req-side">
    <h2>${c.rh}</h2><p class="muted">${c.rp}</p>
    <div class="contact">
      <span>${c.cWa}: <a data-wa="" href="https://wa.me/97451600498" target="_blank" rel="noopener" class="ltr">+974 5160 0498</a></span>
      <span>${c.cMail}: <a data-mail="show" href="mailto:munijizqa@gmail.com" class="ltr">munijizqa@gmail.com</a></span>
      <span>${c.cTel}: <a data-tel="show" href="tel:+97451600498" class="ltr">+974 5160 0498</a></span>
    </div>
  </div>
  <form class="card" id="reqForm" novalidate>
    <div class="f"><label for="fName">${c.form.name}</label><input id="fName" name="name" autocomplete="name" required><span class="err" id="eName" aria-live="polite"></span></div>
    <div class="f"><label for="fCo">${c.form.co}</label><input id="fCo" name="company" autocomplete="organization" placeholder="${c.form.coPh}"><span class="err"></span></div>
    <div class="f"><label for="fPhone">${c.form.phone}</label><input id="fPhone" name="phone" type="tel" inputmode="tel" autocomplete="tel" dir="ltr" placeholder="${c.form.phonePh}" required><span class="err" id="ePhone" aria-live="polite"></span></div>
    <div class="f"><label for="fMail">${c.form.mail}</label><input id="fMail" name="email" type="email" autocomplete="email" dir="ltr" placeholder="${c.form.mailPh}"><span class="err" id="eMail" aria-live="polite"></span></div>
    <div class="f full"><label for="fPlan">${c.form.plan}</label><select id="fPlan" name="plan">${c.form.planOpts.map(([v,l])=>`<option value="${v}"${v==='biz'?' selected':''}>${l}</option>`).join('')}</select></div>
    <fieldset class="f full"><legend>${c.form.ch}</legend><div class="chips">${c.form.chOpts.map((o,i)=>`<label><input type="checkbox" name="ch" id="fCh${i}"${i===0?' checked':''}> ${o}</label>`).join('')}</div></fieldset>
    <div class="f full"><label for="fNote">${c.form.note}</label><textarea id="fNote" name="note" placeholder="${c.form.notePh}"></textarea></div>
    <div class="hp" aria-hidden="true"><label for="fHp">Website</label><input id="fHp" tabindex="-1" autocomplete="off"></div>
    <div class="f full"><label class="agree"><input type="checkbox" id="fOk" checked> <span>${c.form.agree}</span></label><span class="err" id="eOk" aria-live="polite"></span></div>
    <div class="form-actions"><button class="btn btn-main" id="reqSend" type="submit">${c.form.send}</button></div>
    <div class="result" id="reqOut" hidden aria-live="polite">
      <p id="reqState"></p>
      <pre id="reqText"></pre>
      <div class="row"><a class="btn btn-line" id="reqWa" href="#" target="_blank" rel="noopener">${c.form.outWa}</a><a class="btn btn-line" id="reqMail" href="#">${c.form.outMail}</a><button class="btn btn-line" id="reqCopy" type="button">${c.form.outCopy}</button></div>
    </div>
  </form>
</div></section>
</main>
<footer><div class="wrap">
  <div class="by"><img src="${A}mark.svg" alt="" width="28" height="28"><span>${c.foot}</span></div>
  <nav aria-label="${L==='ar'?'روابط':'Links'}"><a href="${c.munjiz}">${c.fMunjiz}</a><a href="${c.privacy}">${c.fPriv}</a><a href="${c.legal}">${c.fLegal}</a><a data-mail="show" href="mailto:munijizqa@gmail.com" class="ltr">munijizqa@gmail.com</a><a data-tel="show" href="tel:+97451600498" class="ltr">+974 5160 0498</a></nav>
</div></footer>
<script src="${R}assets/config.js"></script>
<script src="${A}sanad.js"></script>
</body>
</html>
`;}

mkdirSync('sanad/en',{recursive:true});
writeFileSync('sanad/index.html',page('ar',C.ar));
writeFileSync('sanad/en/index.html',page('en',C.en));
console.log('built sanad/index.html and sanad/en/index.html');
