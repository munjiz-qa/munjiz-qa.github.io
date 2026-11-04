'use strict';
// Growth features shared by every public page (loaded by who.js):
// one-tap WhatsApp with a ready message, company facts in the footer (CR, city, hours, map),
// links to the restaurants / management / partners / articles pages, and the forms and calculator on those pages.
// Company facts are set in GROW below. An empty value is simply not shown (never invent an address or hours).
(function(){
const GROW={"key": "munjiz", "cfg": "MUNJIZ_CONFIG", "name": {"ar": "منجز لخدمات الأعمال", "en": "Munjiz Business Services"}, "wa": "97451600498", "cr": "", "city": {"ar": "الدوحة، قطر", "en": "Doha, Qatar"}, "hours": {"ar": "نستقبل طلباتك عبر الموقع وواتساب على مدار الساعة", "en": "Requests via the website and WhatsApp, 24/7"}, "map": "", "items": {"unit": 50, "incl": 5, "extra": 5}, "svc": "index.html#svc={c}", "rsvc": ["MC-06", "MC-08", "MC-09", "MC-05", "MC-07", "MC-02", "MC-03", "MB-01", "MH-03", "MH-02"], "kinds": {"restaurant": {"ar": "طلب عرض مطاعم", "en": "Restaurant quote"}, "consult": {"ar": "حجز استشارة مجانية", "en": "Free consultation"}, "partner": {"ar": "طلب شراكة وإحالة", "en": "Partner application"}}, "pages": [{"href": "restaurants.html", "ar": "للمطاعم", "en": "For restaurants"}, {"href": "management.html", "ar": "المتابعة الشهرية", "en": "Monthly follow-up"}, {"href": "partners.html", "ar": "الشركاء والإحالات (10%)", "en": "Partners (10%)"}, {"href": "articles.html", "ar": "مقالات وأدلة", "en": "Articles"}]};
const EN=document.documentElement.lang==='en';
const me=document.currentScript&&document.currentScript.src||'';
const ROOT=me?me.replace(/assets\/grow\.js.*$/,''):'';
const BASE=ROOT+(EN?'en/':'');
const CFG=window[GROW.cfg]||{};
const WA=String(CFG.WHATSAPP||GROW.wa||'').replace(/\D/g,'');
const t=(a,e)=>EN?e:a;
const $=s=>document.querySelector(s);
const el=(tag,cls,txt)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(txt!=null)x.textContent=txt;return x};
const fmt=n=>Number(n||0).toLocaleString('en-US');

// 1) WhatsApp: every wa.me link without a message gets one that says where the visitor came from
function waText(){const b=document.body&&document.body.dataset.wa;if(b)return b;
  const h=(document.querySelector('main h1, h1')||{}).textContent||document.title;
  return t('السلام عليكم، أتواصل معكم من موقع '+GROW.name.ar+' بخصوص: ','Hello, I am contacting you from the '+GROW.name.en+' website about: ')+String(h).trim().slice(0,80)}
function waLinks(){if(!WA)return;const msg=waText();
  document.querySelectorAll('a[href^="https://wa.me/"]').forEach(a=>{const h=a.getAttribute('href');if(/[?&]text=/.test(h)||a.dataset.growWa)return;
    a.href='https://wa.me/'+WA+'?text='+encodeURIComponent(msg);a.dataset.growWa='1'});
  if(!document.querySelector('.wa-fab')&&!document.body.classList.contains('portal-page')&&!GROW.noFab){
    const a=el('a','wa-fab grow-fab');a.href='https://wa.me/'+WA+'?text='+encodeURIComponent(msg);a.target='_blank';a.rel='noopener';
    a.setAttribute('aria-label',t('تواصل معنا على واتساب','Chat with us on WhatsApp'));a.title=a.getAttribute('aria-label');
    a.innerHTML='<svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6z"/></svg>';
    document.body.appendChild(a)}}

// 2) footer: company facts and the new pages, on every page
function footer(){const f=document.querySelector('footer');if(!f||f.querySelector('.grow-trust'))return;
  const w=el('div','wrap grow-trust');  const facts=[];
  if(GROW.cr)facts.push([t('السجل التجاري','C.R. No.'),GROW.cr]);
  facts.push([t('المقر','Office'),t(GROW.city.ar,GROW.city.en)]);
  facts.push([t('ساعات العمل','Hours'),t(GROW.hours.ar,GROW.hours.en)]);
  facts.forEach(([k,v])=>{if(!v)return;const s=el('span','gt-f');s.append(el('b',null,k+': '),el('span',null,v));w.appendChild(s)});
  if(GROW.map){const a=el('a','gt-map',t('📍 موقعنا على الخريطة','📍 Find us on the map'));a.href=GROW.map;a.target='_blank';a.rel='noopener';w.appendChild(a)}
  const pages=f.querySelector('a[href$="restaurants.html"]')?[]:(GROW.pages||[]);
  if(pages.length){const n=el('nav','grow-links');n.setAttribute('aria-label',t('صفحات تهمّك','Useful pages'));
    pages.forEach(p=>{const a=el('a',null,t(p.ar,p.en));a.href=(p.ext?p.href:BASE+p.href);n.appendChild(a)});w.appendChild(n)}
  if(!f.querySelector('a[href$="standards.html"]')){const a=el('a','gt-std',t('معايير خدمتنا','Our service standards'));a.href=BASE+'standards.html';w.appendChild(a)}
  f.appendChild(w)}

// 3) forms on the new pages: sent to the office system, or prepared as a WhatsApp message when the system is unreachable
function forms(){document.querySelectorAll('form[data-grow]').forEach(form=>{
  form.addEventListener('submit',async ev=>{ev.preventDefault();
    const out=form.querySelector('.gf-out'),btn=form.querySelector('button[type=submit]');
    const v=n=>{const x=form.elements[n];return x?String(x.type==='checkbox'?(x.checked?'1':''):x.value).trim():''};
    const name=v('name').slice(0,120),phone=v('phone').replace(/[\s-]/g,'').slice(0,20);
    const say=(m,ok)=>{out.textContent=m;out.className='gf-out '+(ok?'ok':'bad')};
    if(name.length<2)return say(t('اكتب الاسم من فضلك.','Please enter your name.'));
    if(!/^(\+?974)?[3567]\d{7}$/.test(phone))return say(t('اكتب رقم جوال قطري صحيح من 8 أرقام.','Please enter a valid 8-digit Qatar mobile number.'));
    if(form.elements.ok&&!v('ok'))return say(t('يرجى الموافقة على سياسة الخصوصية.','Please agree to the privacy policy.'));
    const kind=form.dataset.grow,K=(GROW.kinds||{})[kind]||{ar:kind,en:kind};
    const lines=[...form.querySelectorAll('[data-l]')].map(x=>{const val=x.type==='checkbox'?(x.checked?t('نعم','Yes'):''):String(x.value||'').trim();return val?x.dataset.l+': '+val.slice(0,400):''}).filter(Boolean);
    const calc=form.dataset.calc&&document.getElementById(form.dataset.calc);if(calc&&calc.dataset.summary)lines.push(calc.dataset.summary);
    const text=t(K.ar,K.en)+'\n'+lines.join('\n');
    btn.disabled=true;say(t('جارٍ الإرسال…','Sending…'),true);
    let sent=false,id='';
    if(CFG.API&&!(CFG.SHARED_SERVER&&GROW.key!=='basira')){try{const r=await fetch(CFG.API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},
      body:JSON.stringify({action:'request',name,phone,email:v('email').slice(0,120),type:t(K.ar,K.en).slice(0,20),plan:'',contact:t('واتساب','WhatsApp'),
        services:text.slice(0,2900),codes:(form.dataset.codes||'').split(' ').filter(Boolean),lang:EN?'en':'ar',page:location.href,hp:v('hp')})});
      const j=await r.json();sent=!!(j&&j.ok);id=j&&j.id||''}catch(e){}}
    btn.disabled=false;
    const wa='https://wa.me/'+WA+'?text='+encodeURIComponent(text+'\n'+t('الاسم: ','Name: ')+name+'\n'+t('الجوال: ','Mobile: ')+phone);
    out.textContent='';out.className='gf-out ok';
    out.append(el('span',null,sent?t('تم استلام طلبك'+(id?' برقم '+id:'')+'، وسنتواصل معك قريباً بإذن الله.','We received your request'+(id?' no. '+id:'')+' and will contact you shortly.')
      :t('جهّزنا رسالتك. اضغط الزر لإرسالها على واتساب.','Your message is ready. Tap the button to send it on WhatsApp.')));
    const a=el('a','btn sm wa',t(sent?'تابع معنا على واتساب':'أرسل على واتساب',sent?'Continue on WhatsApp':'Send on WhatsApp'));a.href=wa;a.target='_blank';a.rel='noopener';out.append(' ',a);
    if(sent)form.reset();
    try{window.umami&&umami.track('grow_'+kind,{sent})}catch(e){}
  })})}

// 4) restaurants: item registration calculator (per item, incl. N outlets, plus each extra outlet per item)
function calc(){const c=document.getElementById('rcalc');if(!c)return;const P=GROW.items;
  const n=x=>Math.max(0,Math.min(5000,Math.floor(+(c.querySelector(x).value)||0)));
  const draw=()=>{const items=n('#rcItems'),svcs=n('#rcSvcs'),ups=n('#rcUps'),outlets=Math.max(1,n('#rcOut')||1);
    const units=items+svcs+ups,extra=Math.max(0,outlets-P.incl),base=units*P.unit,add=units*extra*P.extra,tot=base+add;
    const o=c.querySelector('#rcOut2');o.textContent='';
    const row=(k,v)=>{const d=el('div');d.append(el('span',null,k),el('b',null,v));o.appendChild(d)};
    row(t('الأصناف والخدمات والأسعار المطلوبة','Items, services and price changes'),fmt(units));
    row(t('الرسم الأساسي','Base fee')+' ('+fmt(units)+' × '+P.unit+')',fmt(base)+t(' ر.ق',' QAR'));
    row(t('منافذ البيع الإضافية بعد ','Extra outlets beyond ')+P.incl+' ('+fmt(units)+' × '+fmt(extra)+' × '+P.extra+')',fmt(add)+t(' ر.ق',' QAR'));
    const tt=el('div','tot');tt.append(el('span',null,t('الإجمالي التقديري لأتعابنا','Estimated total of our fees')),el('b',null,fmt(tot)+t(' ر.ق',' QAR')));o.appendChild(tt);
    c.dataset.summary=t('حاسبة المطاعم: ','Restaurant calculator: ')+fmt(items)+t(' صنف، ',' items, ')+fmt(svcs)+t(' خدمة، ',' services, ')+fmt(ups)+t(' طلب زيادة سعر، ',' price increases, ')+fmt(outlets)+t(' منفذ بيع. الإجمالي التقديري ',' outlets. Estimated total ')+fmt(tot)+t(' ر.ق',' QAR')};
  c.addEventListener('input',draw);draw()}

// 5) restaurants: the related services, read from the live catalog so prices match the services page
function svcList(){const box=document.getElementById('rsvc');if(!box||typeof DATA==='undefined')return;
  const all={};(DATA.G||[]).forEach(g=>g[2].forEach(s=>{all[s[0]]=s}));
  const D=window.DETAILS||{};box.textContent='';
  (GROW.rsvc||[]).forEach(code=>{const s=all[code];if(!s)return;const en=D[code]&&D[code].en;
    const a=el('a','rs');a.href=BASE+String(GROW.svc||'services/{c}.html').replace('{c}',code);
    a.append(el('b',null,EN&&en&&en.name?en.name:s[1]),el('span','num',s[3]?fmt(s[3])+t(' ر.ق',' QAR'):t('حسب الطلب','On request')),el('small',null,code));box.appendChild(a)})}

function run(){waLinks();footer();forms();calc();svcList();setTimeout(svcList,3500)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
