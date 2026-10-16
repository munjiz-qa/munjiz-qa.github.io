'use strict';
// «اليوم في الدوحة»: التاريخ والوقت (ميلادي وهجري)، مواقيت الصلاة محسوبة على الجهاز بطريقة قطر، أخبار اقتصادية محلية من data/news.json، ورسالة اليوم.
(function(){
const box=document.getElementById('today');if(!box)return;
const EN=document.documentElement.lang==='en',TZ='Asia/Qatar',LOC=EN?'en-GB':'ar-QA';
const L=(a,e)=>EN?e:a;
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};

// ---- date and time in Doha ----
const dGreg=new Intl.DateTimeFormat(LOC,{timeZone:TZ,weekday:'long',day:'numeric',month:'long',year:'numeric',numberingSystem:'latn'});
const dHij=new Intl.DateTimeFormat((EN?'en':'ar-SA')+'-u-ca-islamic-umalqura',{timeZone:TZ,day:'numeric',month:'long',year:'numeric',numberingSystem:'latn'});
const dTime=new Intl.DateTimeFormat(EN?'en-GB':'ar-QA',{timeZone:TZ,hour:'numeric',minute:'2-digit',second:'2-digit',hour12:!EN,numberingSystem:'latn'});
const dohaNow=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return {y:+p.year,m:+p.month,d:+p.day,min:+p.hour*60+ +p.minute+ +p.second/60}};

// ---- prayer times (Qatar method: Fajr 18°, Isha 90 min after Maghrib, Asr shadow 1) ----
const LAT=25.2854,LNG=51.531,TZH=3;
const rad=x=>x*Math.PI/180,deg=x=>x*180/Math.PI,fix=(a,b)=>{a=a-b*Math.floor(a/b);return a<0?a+b:a};
const sin=x=>Math.sin(rad(x)),cos=x=>Math.cos(rad(x)),tan=x=>Math.tan(rad(x)),asin=x=>deg(Math.asin(x)),acos=x=>deg(Math.acos(x)),atan2=(y,x)=>deg(Math.atan2(y,x)),acot=x=>deg(Math.atan(1/x));
function sun(jd){const D=jd-2451545,g=fix(357.529+.98560028*D,360),q=fix(280.459+.98564736*D,360),Lm=fix(q+1.915*sin(g)+.02*sin(2*g),360),e=23.439-.00000036*D,RA=atan2(cos(e)*sin(Lm),cos(Lm))/15;
  return {decl:asin(sin(e)*sin(Lm)),eqt:q/15-fix(RA,24)}}
function prayers(y,m,d){if(m<=2){y--;m+=12}const A=Math.floor(y/100),B=2-A+Math.floor(A/4);
  const jd=Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5-LNG/(15*24);
  const noon=t=>fix(12-sun(jd+t).eqt,24);
  const ang=(a,t,ccw)=>{const s=sun(jd+t),T=acos((-sin(a)-sin(s.decl)*sin(LAT))/(cos(s.decl)*cos(LAT)))/15;return noon(t)+(ccw?-T:T)};
  const asr=t=>{const s=sun(jd+t);return ang(-acot(1+tan(Math.abs(LAT-s.decl))),t)};
  const adj=h=>(h+TZH-LNG/15)*60;
  const fajr=adj(ang(18,5/24,true)),sunrise=adj(ang(.833,6/24,true)),dhuhr=adj(noon(12/24)),as=adj(asr(13/24)),maghrib=adj(ang(.833,18/24));
  return [['الفجر','Fajr',fajr],['الشروق','Sunrise',sunrise],['الظهر','Dhuhr',dhuhr],['العصر','Asr',as],['المغرب','Maghrib',maghrib],['العشاء','Isha',maghrib+90]].map(([a,e,v])=>[a,e,Math.ceil(v)])}
const hm=v=>{v=((v%1440)+1440)%1440;let h=Math.floor(v/60);const mm=String(v%60).padStart(2,'0');if(EN)return String(h).padStart(2,'0')+':'+mm;const pm=h>=12;h=h%12||12;return h+':'+mm+' '+(pm?'م':'ص')};

// ---- daily message ----
const MSG=[['ابدأ يومك بابتسامة، فالخير قادم بإذن الله.','Start your day with a smile; good things are on their way.'],
['كل معاملة تُنجز اليوم خطوة أقرب إلى راحة البال.','Every task finished today is a step closer to peace of mind.'],
['صباح الإنجاز، نتمنى لك يوماً موفقاً.','A morning of achievement. Wishing you a successful day.'],
['اجعل اليوم بداية لشيء جميل.','Make today the start of something good.'],
['التنظيم البسيط اليوم يوفر عليك الكثير غداً.','A little organising today saves a lot tomorrow.'],
['نجاحك يبدأ بخطوة، ونحن معك فيها.','Success starts with one step, and we are with you on it.'],
['يوم جديد وفرص جديدة، فاغتنمها.','A new day brings new chances. Make the most of it.'],
['التفاؤل نصف الطريق، والعمل يكمل النصف الآخر.','Optimism is half the way; work covers the rest.'],
['أنجز الأهم أولاً، والباقي يتيسر بإذن الله.','Do what matters most first; the rest will follow.'],
['أنت أقرب إلى هدفك مما تظن.','You are closer to your goal than you think.'],
['كلمة طيبة اليوم تصنع فرقاً كبيراً.','A kind word today makes a big difference.'],
['خذ نفساً عميقاً، وابدأ بثقة.','Take a deep breath and begin with confidence.'],
['النجاح عادة يومية، لا ضربة حظ.','Success is a daily habit, not a stroke of luck.'],
['قطر تكبر بأحلام أهلها وجهدهم، وأنت منهم.','Qatar grows with the dreams and effort of its people, and you are one of them.'],
['لا تؤجل تجديد مستنداتك، فالوقت أثمن ما نملك.','Do not put off renewing your documents; time is our most precious asset.'],
['الإتقان سر الثقة، والثقة سر الاستمرار.','Excellence builds trust, and trust keeps us going.'],
['تذكر أن تشكر من ساعدك اليوم.','Remember to thank someone who helped you today.'],
['يومك مليء بالإمكانات، فاملأه بالعمل الجميل.','Your day is full of possibilities; fill it with good work.'],
['الصبر مفتاح الفرج، والتخطيط مفتاح النجاح.','Patience opens doors; planning opens success.'],
['ابتسامتك صدقة، فلا تبخل بها.','Your smile is a kindness. Share it freely.'],
['كل بداية صغيرة تصنع نهاية كبيرة.','Every small start can lead to a big result.'],
['اليوم فرصة لتقترب من حلمك خطوة.','Today is a chance to move one step closer to your dream.'],
['العمل بروح الفريق يجعل الصعب سهلاً.','Teamwork makes hard things easy.'],
['اجعل همتك أعلى من التحديات.','Let your resolve rise above the challenges.'],
['الوقت المنظم يمنحك يوماً أطول.','An organised schedule gives you a longer day.'],
['خير الأعمال أدومها وإن قل.','The best deeds are the steady ones, however small.'],
['أحسن الظن بالله، وأبشر بالخير.','Think well of what lies ahead, and expect good news.'],
['يوم مبارك، ووقت ممتع مع من تحب.','A blessed day, and good time with the people you love.'],
['الإنجاز الحقيقي أن تكون اليوم أفضل من أمس.','Real achievement is being better today than yesterday.'],
['نتمنى لك يوماً هادئاً وإنجازاً سهلاً.','Wishing you a calm day and easy progress.']];

// ---- layout: one slim strip, a news ticker and today's message; prayer times and all news open on demand ----
box.replaceChildren();
const strip=el('div','tstrip');
const tDate=el('span','tdate'),tClock=el('b','tclock num'),tNext=el('button','tnext');tNext.type='button';tNext.setAttribute('aria-expanded','false');
strip.append(tDate,tClock,tNext);
const pPanel=el('div','tpanel');pPanel.hidden=true;const pl=el('ul','plist');
pPanel.append(pl,el('small','mute',L('بطريقة قطر (الفجر 18°، العشاء بعد المغرب بـ 90 دقيقة)، وقد تختلف دقيقة أو دقيقتين عن تقويم الأوقاف.','Qatar method (Fajr 18°, Isha 90 minutes after Maghrib); may differ by a minute or two from the Awqaf calendar.')));
tNext.onclick=()=>{pPanel.hidden=!pPanel.hidden;tNext.setAttribute('aria-expanded',!pPanel.hidden)};
const ticker=el('div','tticker');const tkIco=el('span','tk-ico',L('أعمال واستثمار','Business'));const tkLine=el('span','tk-line');const tkAll=el('button','tk-all',L('كل الأخبار','All news'));tkAll.type='button';tkAll.setAttribute('aria-expanded','false');tkAll.hidden=true;
ticker.append(tkIco,tkLine,tkAll);
const nPanel=el('div','tpanel');nPanel.hidden=true;const nl=el('ul','nlist');const nMeta=el('small','mute');nPanel.append(nl,nMeta);
tkAll.onclick=()=>{nPanel.hidden=!nPanel.hidden;tkAll.setAttribute('aria-expanded',!nPanel.hidden)};
const mq=el('p','tmsg');
const mkt=el('div','tmkt');mkt.hidden=true;
box.append(strip,pPanel,ticker,nPanel,mkt,mq);box.hidden=false;

let PR=null,PRday='';
function tick(){const n=dohaNow(),k=n.y+'-'+n.m+'-'+n.d;
  if(k!==PRday){PRday=k;PR=prayers(n.y,n.m,n.d);tDate.textContent=dGreg.format(new Date())+' · '+dHij.format(new Date());
    mq.textContent='✨ '+MSG[(Math.floor(Date.UTC(n.y,n.m-1,n.d)/864e5))%MSG.length][EN?1:0];
    pl.replaceChildren(...PR.map(([a,e,v])=>{const li=el('li');li.dataset.t=v;li.append(el('span',null,EN?e:a),el('b','num',hm(v)));return li}))}
  tClock.textContent=dTime.format(new Date());
  const nx=PR.filter(p=>p[1]!=='Sunrise').find(p=>p[2]>n.min)||null;
  pl.querySelectorAll('li').forEach(li=>li.classList.toggle('on',nx&&+li.dataset.t===nx[2]));
  if(nx){const left=Math.ceil(nx[2]-n.min),h=Math.floor(left/60),m=left%60;tNext.textContent=L(`🕌 ${nx[0]} بعد ${h?h+' س ':''}${m} د ▾`,`🕌 ${nx[1]} in ${h?h+'h ':''}${m}m ▾`)}
  else tNext.textContent=L('🕌 الفجر غداً ▾','🕌 Fajr tomorrow ▾')}
tick();setInterval(tick,1000);

// ---- news (refreshed by a scheduled job on the site; plain text only, links must be http(s)) ----
const safe=u=>{try{const x=new URL(u);return /^https?:$/.test(x.protocol)?x.href:null}catch(e){return null}};
fetch((EN?'../':'')+'data/news.json?d='+PRday,{cache:'no-cache'}).then(r=>r.ok?r.json():Promise.reject()).then(j=>{
  const list=((j&&j[EN?'en':'ar'])||[]).filter(x=>x&&x.title&&safe(x.link)).slice(0,6);
  if(!list.length)throw 0;
  nl.replaceChildren(...list.map(x=>{const li=el('li'),a=el('a',null,String(x.title).slice(0,180));a.href=safe(x.link);a.target='_blank';a.rel='noopener noreferrer nofollow';li.append(a);
    if(x.source||x.date)li.append(el('small','mute',[x.source,x.date].filter(Boolean).join(' · ').slice(0,80)));return li}));
  const link=x=>{const a=el('a',null,String(x.title).slice(0,180));a.href=safe(x.link);a.target='_blank';a.rel='noopener noreferrer nofollow';return a};
  let i=0;const show=()=>{const x=list[i%list.length];tkLine.replaceChildren(link(x));if(x.source)tkLine.append(el('small','mute',' · '+String(x.source).slice(0,40)));tkLine.classList.remove('in');void tkLine.offsetWidth;tkLine.classList.add('in');i++};
  show();tkAll.hidden=false;if(list.length>1&&!matchMedia('(prefers-reduced-motion: reduce)').matches){let t=setInterval(show,6000);ticker.onmouseenter=()=>clearInterval(t);ticker.onmouseleave=()=>{clearInterval(t);t=setInterval(show,6000)}}
  if(j.updated)nMeta.textContent=L('آخر تحديث: ','Updated: ')+String(j.updated).slice(0,16).replace('T',' ')+L(' · المصدر: أخبار Google',' · Source: Google News');
}).catch(()=>{ticker.hidden=true});

// ---- market prices (numbers only, refreshed by the same scheduled job) ----
fetch((EN?'../':'')+'data/markets.json?d='+PRday,{cache:'no-cache'}).then(r=>r.ok?r.json():Promise.reject()).then(j=>{
  const items=((j&&j.items)||[]).filter(x=>x&&typeof x.v==='number'&&isFinite(x.v)).slice(0,10);if(!items.length)return;
  const nf=new Intl.NumberFormat('en',{maximumFractionDigits:2});
  const row=el('div','mk-row');
  items.forEach(x=>{const c=el('span','mk');c.append(el('span','mk-n',String(EN?x.en:x.ar).slice(0,40)+':'),el('b','num',nf.format(x.v)),el('small','mute',' '+String(EN?x.uen:x.uar).slice(0,12)));
    if(typeof x.ch==='number'&&isFinite(x.ch)&&x.ch!==0){const d=el('small',x.ch>0?'up':'dn',(x.ch>0?'▲':'▼')+Math.abs(x.ch).toFixed(1)+'%');d.dir='ltr';c.append(d)}row.append(c)});
  const srcs=[...new Set(items.map(x=>String(x.src||'')).filter(Boolean))].join('، ').slice(0,80);
  mkt.append(el('span','tk-ico',L('أسعار اليوم','Today’s prices')),row,el('small','mute mk-meta',L('أسعار استرشادية','Indicative prices')+(j.updated&&!isNaN(new Date(j.updated))?' · '+new Intl.DateTimeFormat(EN?'en-GB':'ar-QA',{timeZone:'Asia/Qatar',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',numberingSystem:'latn'}).format(new Date(j.updated)):'')+(srcs?' · '+srcs:'')));mkt.hidden=false;
}).catch(()=>{});
})();
