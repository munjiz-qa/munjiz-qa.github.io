/* «عبدو نيوز»: الأقسام الموضوعية والبيانات الحية وأدوات القارئ.
   البيانات: data/desks.json (يكتبه scripts/desks.mjs كل 3 ساعات) وdata/editorial.json (مدخلات المحرر الموثّقة).
   القاعدة: لا خبر إلا من جهتين مستقلتين، ولا رقم إلا إذا اتفق عليه مزوّدان مستقلان أو طريقتا حساب. ما لا يتأكد لا يُعرض. */
(function(){
'use strict';
const K=window.KH;if(!K)return;
const {el}=K;
const L=(a,e)=>K.LANG==='en'?e:a;
const ar=()=>K.LANG!=='en';
let D=null,ED=null,LIVE=null;
const getJSON=u=>fetch(u,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json()});
async function load(){
  if(D&&ED)return;
  const [d,e]=await Promise.all([getJSON('data/desks.json').catch(()=>null),getJSON('data/editorial.json').catch(()=>null)]);
  D=d;ED=e||{};
}
const off=()=>new Set((K.ADMIN.desks_off)||[]);
const hid=()=>new Set((K.ADMIN.desks_hidden)||[]);
const meta=id=>(D&&D.meta||[]).find(m=>m.id===id);
const nm=m=>m?(ar()?m.ar:m.en):'';
const GROUPS=[['trust','الثقة والتحقق','Trust and verification'],['local','الأخبار المحلية','Local news'],['econ','المال والاقتصاد','Money and economy'],['life','حياتك اليومية','Daily life'],['world','العلوم والتقنية','Science and tech']];
const VERD={false:['كاذب','False','#C4392F'],misleading:['مضلل','Misleading','#C27A12'],true:['صحيح','True','#1D7A70']};
const SPECIAL={money:'money',sports:'sports',culture:'culture'};
const a_=(txt,href,blank)=>{const a=el('a',null,txt);a.href=href;if(blank){a.target='_blank';a.rel='noopener'}return a};
const head=(eyebrow,title,intro)=>{const h=el('div','ed-head');h.append(el('span','eyebrow',eyebrow),el('h1',null,title));if(intro)h.append(el('p','mute',intro));return h};
const nOut=n=>K.LANG==='en'?`${n} independent outlets`:n===2?'جهتين مستقلتين':`${n} جهات مستقلة`;
function badge(n){const b=el('span','verif'+(n>=3?' strong':''));b.append(el('i'),L(`مؤكد من ${nOut(n)}`,`Confirmed by ${nOut(n)}`));return b}
function items(id){
  if(!D||!D.desks[id])return [];const h=hid();
  const all=D.desks[id].items.filter(i=>!h.has(i.id)&&(i.sources||[]).length>=2);
  const mine=all.filter(i=>i.lang===K.LANG);return mine.length?mine:all;
}
const fmtT=iso=>`${K.fmtDate(iso.slice(0,10))}، ${K.fmtTime(iso)}`.replace('، ',ar()?'، ':', ');

/* ---------- بطاقة الخبر الآلي ---------- */
function card(it,m){
  const li=el('li','item dk');li.style.setProperty('--zc',m?m.color:'var(--ink)');li.id='k-'+it.id;
  const top=el('div','dk-top');
  if(it.verdict){const v=VERD[it.verdict],s=el('span','verdict');s.style.setProperty('--vc',v[2]);s.textContent=L('الحكم: ','Verdict: ')+(ar()?v[0]:v[1]);top.append(s)}
  top.append(badge(it.outlets||it.sources.length));
  if(it.lang!==K.LANG)top.append(el('span','dk-lang',it.lang==='ar'?L('بالعربية','In Arabic'):L('بالإنجليزية','In English')));
  li.append(top,el('p',null,it.title));
  const box=el('div','src');box.append(el('span','lbl',L('المصادر:','Sources:')));
  it.sources.forEach(s=>box.append(a_(`${s.name} · ${K.fmtDate(s.date)}`,s.url,true)));li.append(box);
  // مقارنة التغطيات: عنوان كل جهة كما نشرته
  if(it.sources.length>=2&&it.sources.some(s=>s.title&&s.title!==it.title)){
    const d=el('details','cover');d.append(el('summary',null,L('كيف نقلته كل جهة','How each outlet framed it')));const ul=el('ul');
    it.sources.forEach(s=>{const x=el('li');x.append(el('b',null,s.name),el('span',null,s.title||''));ul.append(x)});d.append(ul);li.append(d)}
  const f=el('div','item-foot');f.append(el('span','basis',L('طرق التحقق: ','Checks: ')+L('مطابقة عنوانين من جهتين مستقلتين، ورابط المقال الأصلي لكل جهة','two independent outlets matched, original link for each')));
  const acts=el('div','acts');
  acts.append(shareBtn({text:it.title,link:(K.SITE||location.href.split('#')[0])+'s/d-'+it.id+'.html',sources:it.sources.map(s=>({name:s.name,date:s.date,url:s.url})),tag:nm(m)}),reportBtn(it.id,it.title));
  f.append(acts);li.append(f);return li;
}

/* ---------- مشاركة واتساب ببطاقة مصمّمة ---------- */
const WA='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6a2.8 2.8 0 0 0 1.8-1.3 2.3 2.3 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z"/></svg>';
function wrap(ctx,txt,max){const words=txt.split(/\s+/),lines=[];let cur='';for(const w of words){const t=cur?cur+' '+w:w;if(ctx.measureText(t).width>max&&cur){lines.push(cur);cur=w}else cur=t}if(cur)lines.push(cur);return lines}
async function makeCard(o){
  try{await document.fonts.ready}catch(e){}
  const W=1080,H=1350,c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');const rtl=ar();
  x.fillStyle='#14212E';x.fillRect(0,0,W,H);
  // الشعار: فقاعة الخبر المتحقَّق منه (سطران وعلامة تحقق ونقطة البث)
  {const k=1.7,ox=(rtl?W-110:110)-32*k,oy=110-34*k;x.save();x.translate(ox,oy);x.scale(k,k);x.lineCap='round';x.lineJoin='round';
  x.lineWidth=4.6;x.strokeStyle='#F5F6F3';x.stroke(new Path2D('M17 9.5h30a11 11 0 0 1 11 11v17a11 11 0 0 1-11 11h-1.5l1.5 9.5-12-9.5H17a11 11 0 0 1-11-11v-17a11 11 0 0 1 11-11z'));
  x.strokeStyle='#86A5E8';x.stroke(new Path2D('M21 23h25'));x.strokeStyle='#4FB8AA';x.stroke(new Path2D('M33 34h13'));x.lineWidth=4.2;x.stroke(new Path2D('M17.5 33.5l3.6 3.6 6.4-7.4'));
  x.fillStyle='#E39A2D';x.beginPath();x.arc(9,9.5,6.5,0,7);x.fill();x.restore()}
  x.fillStyle='#F5F6F3';x.direction=rtl?'rtl':'ltr';x.textAlign=rtl?'right':'left';
  x.font='700 64px "Reem Kufi","IBM Plex Sans Arabic",sans-serif';x.fillText(rtl?'عبدو نيوز':'Abdo News',rtl?W-190:190,135);
  if(o.tag){x.font='500 34px "IBM Plex Sans Arabic",sans-serif';x.fillStyle='#E39A2D';x.fillText(o.tag,rtl?W-80:80,250)}
  x.fillStyle='#F5F6F3';let size=58;let lines;do{x.font=`700 ${size}px "IBM Plex Sans Arabic",sans-serif`;lines=wrap(x,o.text,W-160);size-=4}while(lines.length>9&&size>34);
  let y=340;lines.slice(0,11).forEach(l=>{x.fillText(l,rtl?W-80:80,y);y+=size*1.55});
  y=Math.max(y+30,H-330);x.fillStyle='#E39A2D';x.fillRect(rtl?W-80-120:80,y,120,6);y+=60;
  x.font='500 30px "IBM Plex Sans Arabic",sans-serif';x.fillStyle='#C9D2D9';
  x.fillText(rtl?`المصادر (${o.sources.length}):`:`Sources (${o.sources.length}):`,rtl?W-80:80,y);y+=48;
  o.sources.slice(0,3).forEach(s=>{x.fillText(`${s.name} · ${K.fmtDate(s.date)}`,rtl?W-80:80,y);y+=44});
  x.font='500 26px "IBM Plex Mono",monospace';x.fillStyle='#8FA0AE';x.textAlign='center';x.direction='ltr';x.fillText((K.SITE||location.origin+location.pathname).replace(/^https?:\/\//,''),W/2,H-50);
  return new Promise(r=>c.toBlob(r,'image/png'));
}
function shareText(o){return `${o.text}\n\n${L('المصادر','Sources')}:\n${o.sources.map(s=>`${s.name} (${K.fmtDate(s.date)}) ${s.url}`).join('\n')}\n\n${L('عبدو نيوز','Abdo News')}: ${o.link||K.SITE||location.href}`}
function shareBtn(o){
  const b=el('button','act');b.type='button';b.innerHTML=WA;b.append(el('span',null,L('بطاقة واتساب','WhatsApp card')));
  b.onclick=async()=>{
    const txt=shareText(o);
    try{const blob=await makeCard(o);const file=new File([blob],'khabar.png',{type:'image/png'});
      if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],text:txt});return}
      const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='khabar.png';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);
      K.toast(L('حُفظت البطاقة؛ أرفقها في واتساب','Card saved; attach it in WhatsApp'));
    }catch(e){}
    open('https://wa.me/?text='+encodeURIComponent(txt),'_blank','noopener');
  };return b;
}

/* ---------- «بلّغ عن خطأ» ---------- */
function reportBtn(id,txt){
  const b=el('button','act');b.type='button';b.innerHTML='<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 21V4m0 0h11l-2 4 2 4H5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';b.append(el('span',null,L('بلّغ عن خطأ','Report an error')));
  b.onclick=()=>reportDialog(id,txt);return b;
}
function reportDialog(id,txt){
  const d=el('dialog','kdlg');const f=el('form');f.method='dialog';
  f.append(el('h2',null,L('بلّغ عن خطأ','Report an error')),el('p','mute',txt.slice(0,160)));
  const sel=el('select');[['fact',L('معلومة غير صحيحة','Incorrect fact')],['source',L('رابط المصدر لا يؤيد الخبر','Source does not support it')],['number',L('رقم خاطئ','Wrong number')],['other',L('غير ذلك','Other')]].forEach(([v,t])=>{const o=el('option',null,t);o.value=v;sel.append(o)});
  const ta=el('textarea');ta.rows=4;ta.maxLength=1200;ta.placeholder=L('اشرح الخطأ، ويُفضَّل أن تضع رابط المصدر الصحيح','Describe the error, ideally with a link to the correct source');
  const em=el('input');em.type='email';em.placeholder=L('بريدك (اختياري، للرد عليك)','Your email (optional)');em.dir='ltr';
  const row=el('div','kdlg-acts');const send=el('button','btn',L('أرسل البلاغ','Send report'));send.value='send';const cancel=el('button','btn ghost',L('إلغاء','Cancel'));cancel.value='cancel';cancel.type='submit';
  row.append(send,cancel);f.append(lab(L('نوع الخطأ','Type'),sel),lab(L('التفاصيل','Details'),ta),lab(L('للتواصل','Contact'),em),row);d.append(f);document.body.append(d);d.showModal();
  d.addEventListener('close',async()=>{if(d.returnValue==='send'&&ta.value.trim()){
    const body={id,kind:sel.value,text:ta.value.trim(),email:em.value.trim(),page:location.href,lang:K.LANG,at:new Date().toISOString()};
    let ok=false;try{const r=await fetch((K.CFG.API||'')+'/api/report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});ok=r.ok}catch(e){}
    if(ok)K.toast(L('وصل بلاغك إلى فريق التحرير. شكراً لك.','Your report reached the editors. Thank you.'));
    else{location.href=`mailto:${K.CFG.EMAIL}?subject=${encodeURIComponent(L('بلاغ خطأ في عبدو نيوز','Abdo News error report')+' '+id)}&body=${encodeURIComponent(body.text+'\n\n'+body.page)}`}
  }d.remove()});
}
const lab=(t,c)=>{const l=el('label','kfield');l.append(el('span',null,t),c);return l};

/* ---------- مركز الأقسام ---------- */
function viewHub(main){
  main.append(head(L('أقسام عبدو نيوز','Abdo News desks'),L('كل الأقسام','All desks'),L('كل خبر في هذه الأقسام نشرته جهتان مستقلتان على الأقل، ويُحدَّث كل 3 ساعات تلقائياً. الأرقام لا تظهر إلا إذا اتفق عليها مزوّدان مستقلان.','Every story here was published by at least two independent outlets and refreshes automatically every 3 hours. Numbers appear only when two independent providers agree.')));
  if(!D){main.append(el('p','empty',L('تُنشر الأقسام مع التحديث التالي.','Desks publish with the next update.')));return}
  const o=off();
  const extra=[['agenda',L('أجندة الأسبوع','The week ahead'),'#3A5FB0'],['explain',L('اشرح لي','Explain it'),'#1D7A70'],['search',L('البحث في الأرشيف','Search the archive'),'#14212E'],['listen',L('الملخص الصوتي','Audio brief'),'#E39A2D'],['quiz',L('اختبار الأسبوع','Weekly quiz'),'#7A3FB0'],['method',L('منهجيتنا','Our method'),'#1D7A70'],['corrections',L('سجل التصحيحات','Corrections'),'#C4392F'],['outlets',L('موثوقية المصادر','Source reliability'),'#566270'],['ask',L('اسأل عبدو نيوز','Ask Abdo News'),'#E39A2D'],['opinion',L('رأي وتحليل','Opinion'),'#566270'],['newsletter',L('النشرة اليومية','Daily newsletter'),'#1D7A70'],['partners',L('انشر عبدو نيوز عندك','Share Abdo News'),'#3A5FB0']];
  GROUPS.forEach(([g,a,e])=>{
    const list=D.meta.filter(m=>m.group===g&&!o.has(m.id));if(!list.length&&g!=='trust')return;
    const s=el('section','zone');const h=el('div','zone-head');h.append(el('h2',null,ar()?a:e));s.append(h);
    const grid=el('div','dk-grid');
    list.forEach(m=>{const its=items(m.id);const c=el('a','dk-card');c.href='#d-'+m.id;c.style.setProperty('--zc',m.color);
      c.append(el('b',null,nm(m)),el('small',null,SPECIAL[m.id]?L('بيانات حية وأخبار موثّقة','Live data and verified news'):K.nItems(its.length)));
      if(its[0])c.append(el('span',null,its[0].title.slice(0,110)+(its[0].title.length>110?'…':'')));grid.append(c)});
    if(g==='trust')extra.filter(x=>['method','corrections','outlets'].includes(x[0])).forEach(x=>grid.append(tile(x)));
    if(g==='life')extra.filter(x=>['agenda','listen','quiz','newsletter'].includes(x[0])).forEach(x=>grid.append(tile(x)));
    if(g==='world')extra.filter(x=>['explain','search','ask','opinion','partners'].includes(x[0])).forEach(x=>grid.append(tile(x)));
    s.append(grid);main.append(s)});
  main.append(updated());
}
const tile=([id,t,c])=>{const a=el('a','dk-card tool');a.href=['newsletter','partners'].includes(id)?id+'/':'#'+id;a.style.setProperty('--zc',c);a.append(el('b',null,t));return a};
const updated=()=>el('p','basis',D&&D.updated?L('آخر تحديث آلي: ','Last automatic update: ')+fmtT(D.updated):'');

function viewDesk(main,id){
  const m=meta(id);if(!m||off().has(id)){main.append(el('p','empty',L('هذا القسم غير متاح الآن.','This desk is not available.')));return}
  const back=a_(L('→ كل الأقسام','← All desks'),'#desks');back.className='back';main.append(back);
  main.append(head(L('قسم','Desk'),nm(m),intro(id)));
  if(id==='money')money(main);if(id==='sports')sports(main);if(id==='culture')culture(main);if(id==='stocks')stocks(main);
  const its=items(id);const s=el('section','zone');const h=el('div','zone-head'),dot=el('span','dot');dot.style.background=m.color;
  h.append(dot,el('h2',null,L('الأخبار الموثّقة','Verified stories')),el('span','count',K.nItems(its.length)));
  const rss=a_('RSS',`feeds/${id}${ar()?'':'-en'}.xml`);rss.className='more';h.append(rss);s.append(h);
  if(!its.length)s.append(el('p','empty',L('لا يوجد الآن خبر في هذا القسم أكدته جهتان مستقلتان. يُحدَّث القسم كل 3 ساعات.','No story in this desk is confirmed by two independent outlets right now. It refreshes every 3 hours.')));
  else{const ul=el('ul','items');its.forEach(i=>ul.append(card(i,m)));s.append(ul)}
  main.append(s,updated());
}
function intro(id){return ({
  rumors:L('ادعاءات متداولة فنّدتها أو أكدتها جهتان مستقلتان على الأقل، مع الحكم وروابط الأدلة. لا يُعرض ادعاء دون حكم صريح من جهتين.','Viral claims checked by at least two independent outlets, with a verdict and evidence links. No claim is shown without an explicit verdict from two outlets.'),
  money:L('أسعار الذهب والعملات من مزوّدين مستقلين، ولا يظهر الرقم إلا إذا اتفقا. أسعار الوقود الرسمية بمصدرين لكل بلد.','Gold and currency rates from two independent providers, shown only when they agree. Official fuel prices with two sources per country.'),
  sports:L('النتائج والمواعيد من مزوّدين مستقلين، ولا تظهر النتيجة إلا إذا تطابقت لديهما، مع متابعة المنتخبات العربية.','Scores and fixtures from independent providers; a score shows only when they match. Arab national teams first.'),
  culture:L('مواقيت الصلاة بطريقتين مستقلتين (حساب فلكي في متصفحك وخدمة AlAdhan)، والتاريخ الهجري، وأخبار الثقافة والفعاليات.','Prayer times by two independent methods (an astronomical calculation in your browser and the AlAdhan service), the Hijri date, and culture news.'),
  stocks:L('أخبار الشركات الكبرى في بورصتي قطر ومصر من جهتين مستقلتين، مع رابط الصفحة الرسمية لكل شركة في البورصة.','Major Qatar and Egypt listed companies, with stories from two independent outlets and each company\'s official exchange page.')
}[id]||L('أخبار موثّقة من جهتين مستقلتين على الأقل، ولكل جهة رابط مقالها الأصلي.','Stories confirmed by at least two independent outlets, each with its original link.'))}

/* ---------- الاقتصاد الشخصي ---------- */
const CN={QAR:['ريال قطري','Qatari riyal'],EGP:['جنيه مصري','Egyptian pound'],SAR:['ريال سعودي','Saudi riyal'],AED:['درهم إماراتي','UAE dirham'],KWD:['دينار كويتي','Kuwaiti dinar'],OMR:['ريال عماني','Omani rial'],BHD:['دينار بحريني','Bahraini dinar'],EUR:['يورو','Euro'],GBP:['جنيه إسترليني','Pound sterling'],JOD:['دينار أردني','Jordanian dinar'],TRY:['ليرة تركية','Turkish lira'],INR:['روبية هندية','Indian rupee'],PKR:['روبية باكستانية','Pakistani rupee'],USD:['دولار أميركي','US dollar']};
const nf=(v,d=2)=>new Intl.NumberFormat(ar()?'ar-QA-u-nu-latn':'en-US',{maximumFractionDigits:d,minimumFractionDigits:Math.min(d,2)}).format(v);
async function liveRates(){
  if(LIVE)return LIVE;
  const [a,b,g]=await Promise.all([getJSON('https://open.er-api.com/v6/latest/USD').catch(()=>null),getJSON('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json').catch(()=>null),getJSON('https://api.gold-api.com/price/XAU').catch(()=>null)]);
  if(!a||!b)return null;const fx={};
  Object.keys(CN).filter(c=>c!=='USD').forEach(c=>{const x=a.rates&&a.rates[c],y=b.usd&&b.usd[c.toLowerCase()];if(x>0&&y>0){const diff=Math.abs(x-y)/((x+y)/2)*100;if(diff<=1.5)fx[c]={v:(x+y)/2,diff}}});
  let gold=null;const gx=g&&g.price,gy=b.usd&&b.usd.xau?1/b.usd.xau:0;if(gx>0&&gy>0){const diff=Math.abs(gx-gy)/((gx+gy)/2)*100;if(diff<=1.5)gold={usd_oz:(gx+gy)/2,diff}}
  LIVE={fx,gold,updated:new Date().toISOString(),live:true};return LIVE;
}
function money(main){
  const R=(D&&D.rates)||{fx:{}};const host=el('section','zone money');main.append(host);
  const draw=r=>{host.textContent='';
    const h=el('div','zone-head');h.append(el('h2',null,L('الذهب والعملات','Gold and currencies')),el('span','count',r.live?L('مباشر الآن من مزوّدين','Live from two providers'):L('آخر لقطة موثّقة','Last verified snapshot')+' · '+fmtT(r.updated||D.updated)));host.append(h);
    if(r.gold){const g=r.gold.usd_oz,gram=g/31.1034768;const t=el('div','ticks');
      [['24',1],['22',22/24],['21',21/24],['18',18/24]].forEach(([k,f])=>{const d=el('div','tick');d.append(el('small',null,L(`غرام عيار ${k}`,`${k}K gram`)));
        const v=el('b','num');const q=r.fx.QAR,e=r.fx.EGP;v.textContent=q?`${nf(gram*f*q.v)} ${L('ر.ق','QAR')}`:`$${nf(gram*f)}`;d.append(v);
        if(e)d.append(el('em',null,`${nf(gram*f*e.v,0)} ${L('ج.م','EGP')}`));t.append(d)});
      const o=el('div','tick');o.append(el('small',null,L('الأونصة','Ounce')),el('b','num','$'+nf(g)));o.append(el('em',null,L(`فارق المزوّدين ${nf(r.gold.diff,2)}٪`,`Provider gap ${nf(r.gold.diff,2)}%`)));t.prepend(o);host.append(t);
      host.append(el('p','basis',L('سعر الذهب العالمي الفوري محوّلاً بسعر الصرف، ولا يشمل المصنعية أو هامش التاجر في السوق المحلية.','Global spot gold converted at the exchange rate; excludes workmanship and local dealer margins.')))}
    else host.append(el('p','empty',L('لا يُعرض سعر الذهب الآن: لم يتفق المزوّدان.','Gold is not shown now: the providers do not agree.')));
    // جدول العملات
    const tb=el('table','fx');const th=el('tr');[L('العملة','Currency'),L('مقابل الدولار','Per US dollar'),L('بالريال القطري','In Qatari riyal'),L('بالجنيه المصري','In Egyptian pound')].forEach(x=>th.append(el('th',null,x)));tb.append(th);
    Object.keys(CN).filter(c=>c!=='USD'&&r.fx[c]).forEach(c=>{const tr=el('tr'),v=r.fx[c].v,q=r.fx.QAR&&r.fx.QAR.v,e=r.fx.EGP&&r.fx.EGP.v;
      tr.append(el('td',null,`${ar()?CN[c][0]:CN[c][1]} (${c})`),el('td','num',nf(v,4)),el('td','num',q?nf(q/v,4):'—'),el('td','num',e?nf(e/v,3):'—'));tb.append(tr)});
    const wrapT=el('div','fx-wrap');wrapT.tabIndex=0;wrapT.setAttribute('role','region');wrapT.setAttribute('aria-label',L('جدول قابل للتمرير','Scrollable table'));wrapT.append(tb);host.append(wrapT);
    // الحاسبة
    const calc=el('div','calc');const amt=el('input');amt.type='number';amt.value='100';amt.min='0';amt.inputMode='decimal';amt.setAttribute('aria-label',L('المبلغ','Amount'));
    const mk=def=>{const s=el('select');s.setAttribute('aria-label',L('العملة','Currency'));['USD',...Object.keys(r.fx)].concat(r.gold?['XAU']:[]).forEach(c=>{const o=el('option',null,c==='XAU'?L('ذهب عيار 24 (غرام)','Gold 24K (gram)'):`${c} · ${ar()?CN[c][0]:CN[c][1]}`);o.value=c;if(c===def)o.selected=true;s.append(o)});return s};
    const from=mk('QAR'),to=mk('EGP'),out=el('output','num');
    const rate=c=>c==='USD'?1:c==='XAU'?1/(r.gold.usd_oz/31.1034768):r.fx[c].v;
    const calcF=()=>{const v=parseFloat(amt.value)||0;out.textContent=nf(v/rate(from.value)*rate(to.value),4)+' '+(to.value==='XAU'?L('غرام','g'):to.value)};
    [amt,from,to].forEach(x=>x.oninput=calcF);const sw=el('button','btn ghost','⇄');sw.type='button';sw.setAttribute('aria-label',L('تبديل','Swap'));sw.onclick=()=>{const t=from.value;from.value=to.value;to.value=t;calcF()};
    calc.append(el('b',null,L('حاسبة التحويل','Converter')),amt,from,sw,to,el('span',null,'='),out);host.append(calc);calcF();
    const P=(D&&D.rates&&D.rates.providers)||{};const src=el('div','src');src.append(el('span','lbl',L('المزوّدان:','Providers:')));
    [['ExchangeRate-API','https://www.exchangerate-api.com/'],['Currency-API (fawazahmed0)','https://github.com/fawazahmed0/exchange-api'],['Gold-API','https://gold-api.com/']].forEach(([n,u])=>src.append(a_(n,u,true)));host.append(src);
    host.append(el('p','basis',L('طريقة التحقق: يُقارن كل سعر لدى مزوّدين مستقلين، ويُحذف أي سعر يزيد الفارق فيه على 1.5٪. هذه أسعار مرجعية لا أسعار بيع البنوك.','Check: each rate is compared across two independent providers and dropped if they differ by more than 1.5%. Reference rates, not bank selling prices.')));
    fuel(host);
  };
  draw(R.fx&&Object.keys(R.fx).length?R:{fx:{},updated:D&&D.updated});
  liveRates().then(r=>{if(r&&Object.keys(r.fx).length>=3)draw(r)}).catch(()=>{});
}
function fuel(host){
  const F=ED.fuel||[];const s=el('div','fuel');s.append(el('h3',null,L('أسعار الوقود الرسمية','Official fuel prices')));
  if(!F.length){s.append(el('p','empty',L('تُضاف أسعار الوقود حين يتأكد السعر الرسمي من مصدرين.','Fuel prices are added once confirmed by two sources.')));host.append(s);return}
  F.forEach(c=>{const b=el('div','fuel-c');b.append(el('b',null,`${ar()?c.country.ar:c.country.en} · ${ar()?c.period.ar:c.period.en}`));const ul=el('ul');
    c.items.forEach(i=>{const li=el('li');li.append(el('span',null,ar()?i.ar:i.en),el('b','num',`${nf(i.price)} ${ar()?c.unit.ar:c.unit.en}`));ul.append(li)});b.append(ul);
    const src=el('div','src');src.append(el('span','lbl',L('المصادر:','Sources:')));c.sources.forEach(x=>src.append(a_(`${x.name} · ${K.fmtDate(x.date)}`,x.url,true)));b.append(badge(new Set(c.sources.map(x=>{try{return new URL(x.url).hostname.split('.').slice(-2).join('.')}catch(e){return x.name}})).size),src);s.append(b)});
  host.append(s);
}

/* ---------- الرياضة ---------- */
const TEAM={Qatar:'قطر',Egypt:'مصر','Saudi Arabia':'السعودية','United Arab Emirates':'الإمارات',UAE:'الإمارات',Kuwait:'الكويت',Oman:'عُمان',Bahrain:'البحرين',Iraq:'العراق',Jordan:'الأردن',Syria:'سوريا',Lebanon:'لبنان',Palestine:'فلسطين',Morocco:'المغرب',Algeria:'الجزائر',Tunisia:'تونس',Libya:'ليبيا',Sudan:'السودان',Yemen:'اليمن',Mauritania:'موريتانيا',Comoros:'جزر القمر',Djibouti:'جيبوتي',Somalia:'الصومال','Al Sadd':'السد','Al-Sadd':'السد','Al Duhail':'الدحيل','Al-Duhail':'الدحيل','Al Rayyan':'الريان','Al-Rayyan':'الريان','Al Gharafa':'الغرافة','Al-Gharafa':'الغرافة','Al Arabi':'العربي','Al-Arabi':'العربي','Al Wakrah':'الوكرة','Al-Wakrah':'الوكرة','Qatar SC':'قطر','Al Ahly':'الأهلي','Al-Ahly':'الأهلي',Zamalek:'الزمالك','Pyramids FC':'بيراميدز',Pyramids:'بيراميدز','Al Hilal':'الهلال','Al-Hilal':'الهلال','Al Nassr':'النصر','Al-Nassr':'النصر','Al Ittihad':'الاتحاد','Al-Ittihad':'الاتحاد','Al Ain':'العين',Brazil:'البرازيل',Argentina:'الأرجنتين',France:'فرنسا',Germany:'ألمانيا',Spain:'إسبانيا',England:'إنجلترا',Italy:'إيطاليا',Portugal:'البرتغال',Netherlands:'هولندا',Japan:'اليابان','South Korea':'كوريا الجنوبية',Iran:'إيران',Australia:'أستراليا',China:'الصين',India:'الهند',Uzbekistan:'أوزبكستان',Senegal:'السنغال',Nigeria:'نيجيريا',Ghana:'غانا',Cameroon:'الكاميرون'};
const tname=n=>ar()&&TEAM[n]?TEAM[n]:n;
function sports(main){
  const S=D&&D.sports;const host=el('section','zone');const h=el('div','zone-head');h.append(el('h2',null,L('النتائج والمواعيد','Scores and fixtures')));if(S)h.append(el('span','count',L('آخر تحديث: ','Updated: ')+fmtT(S.updated)));host.append(h);main.append(host);
  if(!S||!S.matches.length){host.append(el('p','empty',L('لا مباريات مؤكدة من مزوّدين في الأيام الثلاثة.','No matches confirmed by two providers in these three days.')));return}
  const ch=el('div','chips');let mode='arab';const list=el('div');
  [['arab',L('العرب أولاً','Arab teams')],['all',L('كل المتابَع','All tracked')]].forEach(([k,t])=>{const b=el('button','chip',t);b.type='button';b.setAttribute('aria-pressed',String(k===mode));b.onclick=()=>{mode=k;ch.querySelectorAll('.chip').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));draw()};ch.append(b)});host.append(ch,list);
  const draw=()=>{list.textContent='';const by={};S.matches.filter(m=>mode==='all'||m.arab).forEach(m=>{const k=K.dohaDay?K.dohaDay(m.at):m.at.slice(0,10);(by[k]=by[k]||[]).push(m)});
    const keys=Object.keys(by).sort();if(!keys.length)list.append(el('p','empty',L('لا مباريات للفرق العربية في هذه الأيام.','No Arab team matches in these days.')));
    keys.forEach(k=>{list.append(el('h3','sp-day',K.fmtDate(k,true)));const ul=el('ul','matches');
      by[k].forEach(m=>{const li=el('li','match');const st=m.status==='ft'?L('انتهت','FT'):m.status==='live'?L('مباشر','Live'):K.fmtTime(m.at).replace(/ بتوقيت الدوحة| Doha time/,'');
        const sc=m.hs!=null&&!m.pending?`${m.hs} - ${m.as}`:m.status==='ns'?'—':L('بانتظار التطابق','Awaiting match');
        li.append(el('span','lg',m.league),el('span','tm h',tname(m.home)),el('b','sc num',sc),el('span','tm a',tname(m.away)),el('span','st'+(m.status==='live'?' live':''),st));
        const src=el('span','sp-src');m.links.forEach(x=>src.append(a_(x.name,x.url,true)));li.append(src);ul.append(li)});list.append(ul)})};
  draw();host.append(el('p','basis',L('طريقة التحقق: تُطابق كل مباراة لدى FotMob مع ESPN أو TheSportsDB، ولا تُعرض النتيجة إلا إذا تطابقت لديهما. الأوقات بتوقيت الدوحة.','Check: each FotMob match is matched with ESPN or TheSportsDB, and a score shows only if both agree. Times are Doha time.')));
}

/* ---------- البورصة: صفحات الشركات ---------- */
const CO=[
  ['QNBK','بنك قطر الوطني','QNB Group','QA','https://www.qe.com.qa/web/guest/company-profile-page?CompanyCode=QNBK'],
  ['IQCD','صناعات قطر','Industries Qatar','QA','https://www.qe.com.qa/web/guest/company-profile-page?CompanyCode=IQCD'],
  ['ORDS','أوريدو','Ooredoo','QA','https://www.qe.com.qa/web/guest/company-profile-page?CompanyCode=ORDS'],
  ['QIBK','مصرف قطر الإسلامي','Qatar Islamic Bank','QA','https://www.qe.com.qa/web/guest/company-profile-page?CompanyCode=QIBK'],
  ['MARK','مصرف الريان','Masraf Al Rayan','QA','https://www.qe.com.qa/web/guest/company-profile-page?CompanyCode=MARK'],
  ['QGTS','ناقلات','Nakilat','QA','https://www.qe.com.qa/web/guest/company-profile-page?CompanyCode=QGTS'],
  ['COMI','البنك التجاري الدولي','Commercial International Bank','EG','https://www.egx.com.eg/en/stocksdata.aspx'],
  ['TMGH','مجموعة طلعت مصطفى','Talaat Moustafa Group','EG','https://www.egx.com.eg/en/stocksdata.aspx'],
  ['EAST','الشرقية للدخان','Eastern Company','EG','https://www.egx.com.eg/en/stocksdata.aspx'],
  ['FWRY','فوري','Fawry','EG','https://www.egx.com.eg/en/stocksdata.aspx'],
  ['ETEL','المصرية للاتصالات','Telecom Egypt','EG','https://www.egx.com.eg/en/stocksdata.aspx'],
  ['HRHO','إي إف جي القابضة','EFG Holding','EG','https://www.egx.com.eg/en/stocksdata.aspx']];
function stocks(main){
  const s=el('section','zone');s.append(el('h2',null,L('صفحات الشركات','Company pages')));const g=el('div','dk-grid');
  const its=items('stocks');
  CO.forEach(([code,a,e,cc,url])=>{const c=el('div','dk-card co');const key=[a,e,code];const rel=its.filter(i=>key.some(k=>i.title.includes(k)||i.sources.some(x=>(x.title||'').includes(k))));
    c.append(el('b',null,`${ar()?a:e} · ${code}`),el('small',null,cc==='QA'?L('بورصة قطر','Qatar Stock Exchange'):L('البورصة المصرية','Egyptian Exchange')));
    c.append(el('span',null,rel.length?K.nItems(rel.length)+L(' موثّقة',' verified'):L('لا خبر موثّقاً من جهتين الآن','No two-source story now')));
    const lk=a_(L('الصفحة الرسمية في البورصة','Official exchange page'),url,true);lk.className='more';c.append(lk);g.append(c)});
  s.append(g,el('p','basis',L('لا تُنشر أسعار الأسهم هنا حتى يتوفر مزوّدان مستقلان متفقان؛ السعر الرسمي في صفحة البورصة. ولا يُعد شيء هنا توصية استثمارية.','Share prices are not published here until two agreeing independent providers are available; the official price is on the exchange page. Nothing here is investment advice.')));main.append(s);
}

/* ---------- الثقافة والدين: المواقيت بطريقتين ---------- */
const CITIES=[['Doha','Qatar','الدوحة',25.2854,51.531,3,{f:18,i:90},10],['Cairo','Egypt','القاهرة',30.0444,31.2357,2,{f:19.5,i:17.5},5],['Alexandria','Egypt','الإسكندرية',31.2001,29.9187,2,{f:19.5,i:17.5},5],['Riyadh','Saudi Arabia','الرياض',24.7136,46.6753,3,{f:18.5,i:90},4],['Jeddah','Saudi Arabia','جدة',21.4858,39.1925,3,{f:18.5,i:90},4],['Dubai','United Arab Emirates','دبي',25.2048,55.2708,4,{f:18.2,i:18.2},16],['Abu Dhabi','United Arab Emirates','أبوظبي',24.4539,54.3773,4,{f:18.2,i:18.2},16],['Kuwait City','Kuwait','الكويت',29.3759,47.9774,3,{f:18,i:17.5},9],['Muscat','Oman','مسقط',23.588,58.3829,4,{f:18,i:18},3],['Manama','Bahrain','المنامة',26.2285,50.586,3,{f:18,i:90},8]];
const rad=d=>d*Math.PI/180,deg=r=>r*180/Math.PI;
function sunPos(jd){const D=jd-2451545,g=(357.529+.98560028*D)%360,q=(280.459+.98564736*D)%360,Lr=(q+1.915*Math.sin(rad(g))+.02*Math.sin(rad(2*g)))%360,e=23.439-.00000036*D;
  const RA=deg(Math.atan2(Math.cos(rad(e))*Math.sin(rad(Lr)),Math.cos(rad(Lr))))/15,decl=deg(Math.asin(Math.sin(rad(e))*Math.sin(rad(Lr))));let eq=q/15-((RA%24)+24)%24;eq=((eq+12)%24+24)%24-12;return {decl,eq}}
function prayCalc(date,lat,lng,tz,m){
  const y=date.getUTCFullYear(),mo=date.getUTCMonth()+1,d=date.getUTCDate();const jd0=367*y-Math.floor(7*(y+Math.floor((mo+9)/12))/4)+Math.floor(275*mo/9)+d+1721013.5-lng/360;
  const at=(h)=>sunPos(jd0+h/24);
  const noon=h=>12-at(h).eq;
  const T=(angle,h,ccw)=>{const {decl}=at(h);const v=deg(Math.acos((-Math.sin(rad(angle))-Math.sin(rad(decl))*Math.sin(rad(lat)))/(Math.cos(rad(decl))*Math.cos(rad(lat)))))/15;return noon(h)+(ccw?-v:v)};
  const asrT=h=>{const {decl}=at(h);const a=-deg(Math.atan(1/(1+Math.tan(rad(Math.abs(lat-decl))))));return T(a,h,false)};
  const off=tz-lng/15;let r={fajr:T(m.f,5,true),sunrise:T(.833,6,true),dhuhr:noon(12),asr:asrT(13),maghrib:T(.833,18,false)};
  r.isha=m.i>=60?r.maghrib+m.i/60:T(m.i,18,false);for(const k in r)r[k]+=off;r.dhuhr+=1/60;return r;
}
const hm=h=>{let m=Math.round(h*60);m=((m%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')};
const toMin=s=>{const [a,b]=s.split(':').map(Number);return a*60+b};
function culture(main){
  const s=el('section','zone pray');main.append(s);
  const h=el('div','zone-head');h.append(el('h2',null,L('مواقيت الصلاة','Prayer times')));s.append(h);
  const sel=el('select');sel.setAttribute('aria-label',L('المدينة','City'));const saved=K.store.get('khabar-city','Doha');
  CITIES.forEach(c=>{const o=el('option',null,ar()?c[2]:c[0]);o.value=c[0];if(c[0]===saved)o.selected=true;sel.append(o)});s.append(sel);
  const box=el('div');s.append(box);
  const hij=el('p','basis');s.append(hij);
  const draw=async()=>{K.store.set('khabar-city',sel.value);const c=CITIES.find(x=>x[0]===sel.value);box.textContent=L('جارٍ الحساب…','Calculating…');
    const now=new Date(),loc=prayCalc(new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate())),c[3],c[4],c[5],c[6]);
    let api=null;try{const j=await getJSON(`https://api.aladhan.com/v1/timings/${Math.floor(Date.now()/1000)}?latitude=${c[3]}&longitude=${c[4]}&method=${c[7]}&timezonestring=${encodeURIComponent({Qatar:'Asia/Qatar',Egypt:'Africa/Cairo','Saudi Arabia':'Asia/Riyadh','United Arab Emirates':'Asia/Dubai',Kuwait:'Asia/Kuwait',Oman:'Asia/Muscat',Bahrain:'Asia/Bahrain'}[c[1]])}`);api=j.data}catch(e){}
    box.textContent='';const t=el('div','ticks');const names={fajr:['الفجر','Fajr','Fajr'],sunrise:['الشروق','Sunrise','Sunrise'],dhuhr:['الظهر','Dhuhr','Dhuhr'],asr:['العصر','Asr','Asr'],maghrib:['المغرب','Maghrib','Maghrib'],isha:['العشاء','Isha','Isha']};
    let agree=0,total=0;
    Object.keys(names).forEach(k=>{const mine=hm(loc[k]),other=api&&api.timings[names[k][2]]?api.timings[names[k][2]].slice(0,5):null;const d=el('div','tick');d.append(el('small',null,ar()?names[k][0]:names[k][1]));
      total++;if(other&&Math.abs(toMin(mine)-toMin(other))<=3){agree++;d.append(el('b','num',other));d.append(el('em',null,L('تطابقت الطريقتان','Both methods agree')))}
      else if(other){d.append(el('b','num',other));d.append(el('em','warn',L(`الحساب المحلي ${mine}`,`Local calc ${mine}`)))}
      else{d.append(el('b','num',mine));d.append(el('em',null,L('حساب فلكي فقط','Calculation only')))}t.append(d)});box.append(t);
    box.append(el('p','basis',L(`تطابقت ${agree} من ${total} مواقيت بين الحساب الفلكي في متصفحك وخدمة AlAdhan (فارق 3 دقائق أو أقل). اعتمد دائماً تقويم الأوقاف الرسمي في بلدك.`,`${agree} of ${total} times agree between the in-browser calculation and AlAdhan (within 3 minutes). Always follow your country's official calendar.`)));
    const src=el('div','src');src.append(el('span','lbl',L('المصادر:','Sources:')),a_('AlAdhan','https://aladhan.com/prayer-times-api',true),a_(L('معادلات الحساب الفلكي (PrayTimes)','Astronomical method (PrayTimes)'),'http://praytimes.org/calculation'.replace('http:','https:'),true));box.append(src);
    let h1='';try{h1=new Intl.DateTimeFormat((ar()?'ar-SA':'en')+'-u-ca-islamic-umalqura-nu-latn',{day:'numeric',month:'long',year:'numeric'}).format(now)}catch(e){}
    const h2=api&&api.date&&api.date.hijri?`${api.date.hijri.day} ${ar()?api.date.hijri.month.ar:api.date.hijri.month.en} ${api.date.hijri.year}`:'';
    hij.textContent=L('التاريخ الهجري: ','Hijri date: ')+(h1||h2)+(h1&&h2?L(' (أم القرى، وتطابقه AlAdhan: ',' (Umm al-Qura; AlAdhan: ')+h2+')':'');
  };sel.onchange=draw;draw();
}

/* ---------- «خبر اليوم في رقم» ---------- */
function numberCard(){
  const n=(ED.number&&ED.number.sources&&ED.number.sources.length>=2&&ED.number.date>=new Date(Date.now()-2*864e5).toISOString().slice(0,10))?ED.number:null;
  const s=el('section','numday');s.append(el('span','eyebrow',L('خبر اليوم في رقم','Today in one number')));
  if(n){s.append(el('b','num',n.value),el('p',null,ar()?n.ar:n.en));const src=el('div','src');src.append(el('span','lbl',L('المصادر:','Sources:')));n.sources.forEach(x=>src.append(a_(`${x.name} · ${K.fmtDate(x.date)}`,x.url,true)));s.append(src);return s}
  const g=D&&D.number;if(!g)return null;
  s.append(el('b','num','$'+nf(g.v)),el('p',null,L('سعر أونصة الذهب في السوق العالمية الآن، واتفق عليه مزوّدان مستقلان.','The global spot price of an ounce of gold now, agreed by two independent providers.')));
  const src=el('div','src');src.append(el('span','lbl',L('المزوّدان:','Providers:')),a_('Gold-API','https://gold-api.com/',true),a_('Currency-API','https://github.com/fawazahmed0/exchange-api',true));const more=a_(L('الذهب والعملات ←','Gold and currencies →'),'#d-money');more.className='more';s.append(src,more);return s;
}

/* ---------- التخصيص ---------- */
const PREF=()=>K.store.get('khabar-prefs',{country:null,desks:[]});
function forYou(){
  if(!D)return null;const p=PREF();const s=el('section','zone foryou');const h=el('div','zone-head');h.append(el('h2',null,L('لك','For you')));
  const b=el('button','more',p.desks.length?L('عدّل اهتماماتك','Edit interests'):L('اختر اهتماماتك وبلدك','Pick your interests and country'));b.type='button';b.onclick=prefsDialog;h.append(b);s.append(h);
  let ids=p.desks.length?p.desks:['rumors','money','sports','health'];
  if(p.country){const loc=(D.meta||[]).find(m=>m.country===p.country);if(loc&&!ids.includes(loc.id))ids=[loc.id,...ids]}
  const o=off();const ul=el('ul','items');let n=0;
  ids.filter(id=>!o.has(id)).forEach(id=>{const m=meta(id),it=items(id)[0];if(!m||!it)return;n++;const li=card(it,m);li.prepend(a_(nm(m),'#d-'+id));ul.append(li)});
  if(!n)return null;s.append(ul);return s;
}
function prefsDialog(){
  const p=PREF();const d=el('dialog','kdlg');const f=el('form');f.method='dialog';f.append(el('h2',null,L('اهتماماتك','Your interests')));
  const cs=el('select');[['',L('بلا تحديد','Not set')],['QA',L('قطر','Qatar')],['EG',L('مصر','Egypt')],['SA',L('السعودية','Saudi Arabia')],['AE',L('الإمارات','UAE')],['KW',L('الكويت','Kuwait')],['OM',L('عُمان','Oman')],['BH',L('البحرين','Bahrain')]].forEach(([v,t])=>{const o=el('option',null,t);o.value=v;if(v===(p.country||''))o.selected=true;cs.append(o)});
  f.append(lab(L('بلدك','Your country'),cs));const g=el('div','prefs');
  (D.meta||[]).filter(m=>m.group!=='local').forEach(m=>{const l=el('label','pchip');const c=el('input');c.type='checkbox';c.value=m.id;c.checked=p.desks.includes(m.id);l.append(c,el('span',null,nm(m)));g.append(l)});
  f.append(g,el('p','basis',L('تُحفظ اختياراتك على جهازك فقط، وتُرتَّب الصفحة الرئيسية بحسبها.','Saved on this device only; the home page is ordered by them.')));
  const row=el('div','kdlg-acts');const ok=el('button','btn',L('احفظ','Save'));ok.value='ok';const no=el('button','btn ghost',L('إلغاء','Cancel'));no.value='no';row.append(ok,no);f.append(row);d.append(f);document.body.append(d);d.showModal();
  d.addEventListener('close',()=>{if(d.returnValue==='ok'){K.store.set('khabar-prefs',{country:cs.value||null,desks:[...g.querySelectorAll('input:checked')].map(x=>x.value)});K.render()}d.remove()});
}

/* ---------- القراءة: الخط الكبير ووضع القراءة ---------- */
function a11y(){
  const bar=document.querySelector('.top-actions');if(!bar||bar.querySelector('#font-btn'))return;
  const apply=()=>{const f=K.store.get('khabar-font',1),r=K.store.get('khabar-read',false);document.documentElement.style.fontSize=(f*100)+'%';document.documentElement.classList.toggle('reading',!!r);
    fb.setAttribute('aria-label',L(`حجم الخط ${Math.round(f*100)}٪`,`Text size ${Math.round(f*100)}%`));fb.title=fb.getAttribute('aria-label');rb.setAttribute('aria-pressed',String(!!r));rb.title=L('وضع القراءة','Reading mode');rb.setAttribute('aria-label',rb.title)};
  const fb=el('button','icon-btn');fb.id='font-btn';fb.type='button';fb.innerHTML='<span style="font:700 .85rem var(--body)">A<sup>+</sup></span>';
  fb.onclick=()=>{const s=[1,1.15,1.3,1.5],f=K.store.get('khabar-font',1);K.store.set('khabar-font',s[(s.indexOf(f)+1)%s.length]);apply()};
  const rb=el('button','icon-btn');rb.id='read-btn';rb.type='button';rb.innerHTML='<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M3 5h7a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H3zM21 5h-7a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  rb.onclick=()=>{K.store.set('khabar-read',!K.store.get('khabar-read',false));apply()};
  bar.prepend(fb,rb);apply();
}

/* ---------- إحصاءات القراء (بلا تعريف بالزائر) والإحالة ---------- */
const seen=new Set();
function hit(v){
  try{if(navigator.doNotTrack==='1'||seen.has(v))return;seen.add(v);const key=v.replace(/^b-.*/,'brief').replace(/^war-.*/,'war').slice(0,40);
    const ref=(new URLSearchParams(location.search).get('ref')||'').replace(/[^\w-]/g,'').slice(0,20);if(ref)K.store.set('khabar-ref-from',ref);
    const body=JSON.stringify({v:key,ref:seen.size===1&&ref?ref:undefined});const u=(K.CFG.API||'')+'/api/hit';
    if(navigator.sendBeacon)navigator.sendBeacon(u,new Blob([body],{type:'text/plain'}));else fetch(u,{method:'POST',body,keepalive:true}).catch(()=>{});
  }catch(e){}
}
/* ---------- NewsArticle لمحركات البحث وGoogle News ---------- */
function ld(){
  const B=K.BRIEF;if(!B)return;let n=document.getElementById('ld-brief');if(!n){n=document.createElement('script');n.type='application/ld+json';n.id='ld-brief';document.head.append(n)}
  const items=B.zones.flatMap(z=>z.items).slice(0,10);
  n.textContent=JSON.stringify({'@context':'https://schema.org','@type':'NewsArticle',headline:(B.title&&B.title[K.LANG])||'عبدو نيوز',datePublished:B.published,dateModified:B.published,inLanguage:K.LANG,
    author:{'@type':'Organization',name:'عبدو نيوز',url:K.SITE},publisher:{'@type':'Organization',name:'عبدو نيوز',logo:{'@type':'ImageObject',url:K.SITE+'assets/icon-512.png'}},image:[K.SITE+'assets/og.png'],mainEntityOfPage:K.SITE,
    description:(B.thread&&B.thread[K.LANG]||'').slice(0,300),citation:items.flatMap(i=>(i.src||[]).map(s=>B.sources[s]&&B.sources[s].url)).filter(Boolean).slice(0,20)});
}
window.KD={load,hit,ld,
  has:v=>v==='desks'||v.startsWith('d-'),
  view(v,main){if(v==='desks')viewHub(main);else viewDesk(main,v.slice(2))},
  home(){return [numberCard(),forYou()].filter(Boolean)},
  shareBtn,reportBtn,a11y,
  get data(){return D},get editorial(){return ED},items,meta};
})();
