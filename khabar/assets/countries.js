/* «عبدو نيوز»: قسم «الأوضاع في الدول».
   البيانات: data/countries.json (يكتبه scripts/countries.mjs كل 3 ساعات) وdata/countries-editorial.json (الملف التحريري الموثّق، يُحدَّث مع الخلاصات)
   وdata/forecast.json إن وُجد (طبقة التوقع من قسم التوقعات، مفاتيحه ISO3).
   القاعدة: لا خبر ولا رقم ولا مدخل إلا من جهتين مستقلتين على الأقل، وتظهر تحت كل خبر جهاته وروابطه ودرجة التحقق. ما لا يتأكد لا يُعرض.
   المسارات: #countries (المحور والخريطة)، #c-<id> (صفحة الدولة)، #cmp-<a>-<b> (مقارنة دولتين). */
(function(){
'use strict';
const K=window.KH;if(!K)return;
const {el}=K;
const L=(a,e)=>K.LANG==='en'?e:a;
const ar=()=>K.LANG!=='en';
let D=null,ED=null,FC=null,MAP=null,LAYER='status';
try{LAYER=localStorage.getItem('khabar-cmap-layer')||'status'}catch(e){}
const getJSON=u=>fetch(u,{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(u+' '+r.status);return r.json()});
// الصفحة الرئيسية تحمّل ملخص الدول (data/countries-home.json، نحو عُشر الحجم)، وصفحات الدول تحمّل الملف الكامل.
// الملخص منسوخ من الملف الكامل بعد بوابة التحقق، وإن تعذّر يُحمَّل الكامل كما كان.
// وطبقة التوقعات (data/forecast.json) لا تعرضها الرئيسية، فتُحمَّل مع أول زيارة لصفحات الدول فقط.
let FCT=false;
async function load(){
  const full=has(location.hash.slice(1)||'today');
  if(D&&(!D.lite||!full)&&(FCT||!full))return;
  const needD=!D||(D.lite&&full);
  const [d,e,f]=await Promise.all([
    needD?(full?Promise.reject():getJSON('data/countries-home.json')).catch(()=>getJSON('data/countries.json')).catch(()=>null):Promise.resolve(D),
    ED?ED:getJSON('data/countries-editorial.json').catch(()=>null),
    full&&!FCT?(FCT=true,getJSON('data/forecast.json').catch(()=>null)):Promise.resolve(FC)]);
  if(d||!D)D=d;ED=e||{countries:{},sources:{}};FC=f;
}
const off=()=>new Set(K.ADMIN.countries_off||[]);
const hid=()=>new Set(K.ADMIN.countries_hidden||[]);
const metas=()=>(D&&D.meta||[]).filter(m=>!off().has(m.id));
const meta=id=>metas().find(m=>m.id===id);
const nm=m=>m?(ar()?m.ar:m.en):'';
const C=id=>D&&D.countries[id]||{items:[],timeline:[],protests:[],hotspots:[],counts:{},index:{level:'nodata',dims:{}},index_history:[]};
const E=id=>ED&&ED.countries&&ED.countries[id]||null;
const S=()=>ED&&ED.sources||{};
const a_=(txt,href,blank)=>{const a=el('a',null,txt);a.href=href;if(blank){a.target='_blank';a.rel='noopener'}return a};
const head=(eyebrow,title,intro)=>{const h=el('div','ed-head');h.append(el('span','eyebrow',eyebrow),el('h1',null,title));if(intro)h.append(el('p','mute',intro));return h};
const nOut=n=>K.LANG==='en'?`${n} independent outlets`:n===2?'جهتين مستقلتين':`${n} جهات مستقلة`;
function badge(n){const b=el('span','verif'+(n>=3?' strong':''));b.append(el('i'),L(`مؤكد من ${nOut(n)}`,`Confirmed by ${nOut(n)}`));return b}
const LV={stable:['مستقر','Stable','#1D7A70'],strained:['تحت الضغط','Under strain','#C27A12'],unstable:['مضطرب','Unstable','#C4392F'],nodata:['بيانات غير كافية','Not enough data','#8A94A0']};
const lv=l=>{const x=LV[l]||LV.nodata;return {t:ar()?x[0]:x[1],c:x[2]}};
const TR={up:['↑','يتحسن','Improving'],down:['↓','يتراجع','Worsening'],flat:['→','ثابت','Steady']};
const DIM={politics:['السياسي','Politics'],security:['الأمني والعسكري','Security'],economy:['الاقتصادي','Economy']};
const OUT={improve:['يتحسن','Improving','#1D7A70'],stable:['مستقر','Stable','#3A5FB0'],watch:['يستحق المراقبة','Watch','#C27A12'],deteriorate:['مرشح للتدهور','Likely to worsen','#C4392F']};
const fc=m=>FC&&FC.countries&&m&&FC.countries[m.iso3]||null;
function pill(idx){const x=lv(idx.level),s=el('span','lvl');s.style.setProperty('--lc',x.c);s.append(el('i'),x.t);return s}
function trendTag(idx){if(idx.score==null)return null;const t=TR[idx.trend]||TR.flat,s=el('span','cn-trend '+(idx.trend||'flat'));s.textContent=`${t[0]} ${ar()?t[1]:t[2]}`;
  if(idx.prev)s.title=L(`أمس (${K.fmtDate(idx.prev.date)}): ${idx.prev.score}`,`Previous day (${K.fmtDate(idx.prev.date)}): ${idx.prev.score}`);return s}
function score(idx){const b=el('b','cn-score');b.textContent=idx.score==null?'—':String(idx.score);b.style.color=lv(idx.level).c;return b}
function items(id,axis){const h=hid();const all=C(id).items.filter(i=>!h.has(i.id)&&(i.sources||[]).length>=2&&(!axis||i.axis===axis));const mine=all.filter(i=>i.lang===K.LANG);return mine.length?mine:all}
const follows=()=>K.store.get('khabar-follow-c',{});
const fkey=id=>{const c=C(id);return {score:c.index.score,level:c.index.level,top:(c.items[0]||{}).id||''}};

/* ---------- بطاقة الخبر الآلي ---------- */
function card(it,m){
  const li=el('li','item dk');li.style.setProperty('--zc',m?m.color:'var(--ink)');li.id='k-'+it.id;
  const top=el('div','dk-top');top.append(badge(it.outlets||it.sources.length));
  const ax=m&&m.axes.find(a=>a.id===it.axis);if(ax)top.append(el('span','cn-ax',ar()?ax.ar:ax.en));
  if(it.lang!==K.LANG)top.append(el('span','dk-lang',it.lang==='ar'?L('بالعربية','In Arabic'):L('بالإنجليزية','In English')));
  li.append(top,el('p',null,it.title));
  const box=el('div','src');box.append(el('span','lbl',L('المصادر:','Sources:')));
  it.sources.forEach(s=>box.append(a_(`${s.name} · ${K.fmtDate(s.date)}`,s.url,true)));li.append(box);
  if(it.sources.some(s=>s.title&&s.title!==it.title)){const d=el('details','cover');d.append(el('summary',null,L('كيف نقلته كل جهة','How each outlet framed it')));const ul=el('ul');
    it.sources.forEach(s=>{const x=el('li');x.append(el('b',null,s.name),el('span',null,s.title||''));ul.append(x)});d.append(ul);li.append(d)}
  const f=el('div','item-foot');f.append(el('span','basis',L('درجة التحقق: ','Verification: ')+(it.outlets>=3?L('قوية (ثلاث جهات فأكثر)','strong (three or more outlets)'):L('مؤكد (جهتان مستقلتان)','confirmed (two independent outlets)'))+L('، والرابط الأصلي لكل جهة',', original link for each')));
  const acts=el('div','acts');
  if(window.KD&&KD.shareBtn)acts.append(KD.shareBtn({text:it.title,link:(K.SITE||location.href.split('#')[0])+'#c-'+(m?m.id:''),sources:it.sources.map(s=>({name:s.name,date:s.date,url:s.url})),tag:nm(m)}));
  if(window.KD&&KD.reportBtn)acts.append(KD.reportBtn(it.id,it.title));
  f.append(acts);li.append(f);return li;
}
// سطر مصادر المدخل التحريري
function esrc(ids,label){
  const box=el('div','src');box.append(el('span','lbl',(label||L('المصادر','Sources'))+':'));const SS=S();
  (ids||[]).forEach(id=>{const s=SS[id];if(!s)return;box.append(a_(`${s[K.LANG]||s.ar||s.en} · ${K.fmtDate(s.date)}`,s.url,true))});return box}
function eblock(x,label){const d=el('div','cn-ed');d.append(el('p',null,x[K.LANG]||x.ar||x.en));const v=el('div','vline');v.append(badge(new Set((x.src||[]).map(id=>{try{return new URL(S()[id].url).hostname.replace(/^www\./,'')}catch(e){return id}})).size),esrc(x.src,label));d.append(v);return d}

/* ---------- الخريطة التفاعلية ---------- */
const LAYERS=[['status','الحالة الآن','Current status'],['tension','نقاط التوتر','Tension points'],['attract','الجذب والاستقرار','Stability and appeal'],['forecast','التوقع','Outlook']];
function colorFor(m,layer){
  const c=C(m.id),idx=c.index;
  if(layer==='forecast'){const f=fc(m);if(!f)return '#8A94A0';return f.color||(OUT[f.outlook]||[])[2]||'#8A94A0'}
  if(layer==='attract'){if(idx.score==null)return '#8A94A0';const f=fc(m);const bad=f&&['watch','deteriorate'].includes(f.outlook);return idx.score>=80&&!bad?'#1D7A70':idx.score>=70&&!bad?'#6FB09A':'#C9CFD6'}
  if(layer==='tension'){const n=(c.hotspots||[]).length+(c.protests||[]).length;return idx.score==null&&!n?'#8A94A0':(c.index.dims.security||{}).score<45||n>=4?'#C4392F':n?'#E39A2D':'#C9CFD6'}
  return lv(idx.level).c}
function legend(layer){
  const cap=el('figcaption','cmap-key');const add=(c,t)=>{const s=el('span');const i=el('i');i.style.background=c;s.append(i,t);cap.append(s)};
  if(layer==='status'){Object.keys(LV).forEach(k=>add(LV[k][2],ar()?LV[k][0]:LV[k][1]));cap.append(el('small',null,L('اللون من مؤشر الاستقرار اليومي المحسوب من الأخبار الموثّقة بجهتين في آخر 48 ساعة.','Colour from the daily stability index computed from stories confirmed by two outlets over the last 48 hours.')))}
  else if(layer==='tension'){add('#C4392F',L('توتر مرتفع','High tension'));add('#E39A2D',L('توتر','Tension'));add('#C9CFD6',L('لا نقاط توتر موثّقة','No verified hotspots'));
    const s=el('span');const i=el('i','cn-dot sec');s.append(i,L('حادثة أمنية أو عسكرية','Security or military incident'));cap.append(s);const s2=el('span');s2.append(el('i','cn-dot prot'),L('تظاهرة','Protest'));cap.append(s2);
    cap.append(el('small',null,L('النقاط من أخبار شديدة الحدّة (قتلى، غارات، اشتباكات) أو تظاهرات ذكرت جهتان مستقلتان مدينتها، خلال آخر 3 إلى 7 أيام.','Markers come from high-severity stories (deaths, strikes, clashes) or protests whose city two independent outlets named, over the last 3–7 days.')))}
  else if(layer==='attract'){add('#1D7A70',L('استقرار مرتفع (80 فأكثر)','High stability (80+)'));add('#6FB09A',L('استقرار جيد (70–79)','Good stability (70–79)'));add('#C9CFD6',L('دون عتبة الجذب','Below the appeal threshold'));
    cap.append(el('small',null,L('«الجذب» هنا قراءة من الاستقرار الموثّق وتوقع قسم التوقعات، لا توصية استثمار أو سفر.','"Appeal" here reads documented stability and the outlook desk\'s forecast; it is not investment or travel advice.')))}
  else{Object.keys(OUT).forEach(k=>add(OUT[k][2],ar()?OUT[k][0]:OUT[k][1]));add('#8A94A0',L('لا توقع منشور','No forecast'));cap.append(el('small',null,FC?L('من قسم التوقعات: احتمال التدهور خلال 30 يوماً. توقّع وليس خبراً.','From the outlook desk: chance of worsening within 30 days. A forecast, not news.'):L('يظهر التوقع حين ينشر قسم التوقعات أول تقرير.','The outlook appears once the outlook desk publishes its first report.')))}
  return cap}
function cmap(focus){
  const box=el('figure','cmap cn-map');
  if(!MAP){box.append(el('p','mute',L('جارٍ تحميل الخريطة…','Loading the map…')));getJSON('assets/countries-map.json').then(m=>{MAP=m;K.render()}).catch(()=>{box.textContent=''});return box}
  const bar=el('div','cn-layers');bar.setAttribute('role','group');bar.setAttribute('aria-label',L('طبقات الخريطة','Map layers'));
  LAYERS.forEach(([id,a,e])=>{const b=el('button','chip',ar()?a:e);b.type='button';b.setAttribute('aria-pressed',String(LAYER===id));b.onclick=()=>{LAYER=id;try{localStorage.setItem('khabar-cmap-layer',id)}catch(x){}K.render()};bar.append(b)});
  box.append(bar);
  const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${MAP.w} ${MAP.h}`);svg.setAttribute('role','group');
  svg.setAttribute('aria-label',L('خريطة الدول: اضغط دولة لتفتح صفحة أوضاعها','Country map: tap a country to open its page'));
  const land=document.createElementNS(ns,'path');land.setAttribute('d',MAP.land);land.setAttribute('class','land');svg.append(land);
  const P=(la,lo)=>[(lo-MAP.lon[0])/(MAP.lon[1]-MAP.lon[0])*MAP.w,(MAP.lat[1]-la)/(MAP.lat[1]-MAP.lat[0])*MAP.h];
  const labels=[];
  metas().forEach(m=>{const g=MAP.countries[m.id];if(!g)return;const c=C(m.id),col=colorFor(m,LAYER);
    const a=document.createElementNS(ns,'a');a.setAttribute('href','#c-'+m.id);a.setAttribute('class','cn-shape'+(focus?(focus===m.id?' focus':' dim'):''));
    const idx=c.index,f=fc(m);
    const label=`${nm(m)} · ${LAYER==='forecast'&&f?(ar()?(OUT[f.outlook]||[''])[0]:(OUT[f.outlook]||['',''])[1]):lv(idx.level).t}${idx.score!=null&&LAYER!=='forecast'?' · '+idx.score:''}`;
    a.setAttribute('aria-label',label);const tt=document.createElementNS(ns,'title');tt.textContent=label;a.append(tt);
    const p=document.createElementNS(ns,'path');p.setAttribute('d',g.d);p.setAttribute('fill',col);a.append(p);svg.append(a);labels.push([m,g,col])});
  if(LAYER==='tension'){metas().forEach(m=>{const c=C(m.id);[...(c.hotspots||[]).map(h=>['sec',h]),...(c.protests||[]).filter(p=>p.place&&p.place.ll).map(p=>['prot',p])].forEach(([k,h])=>{
    const [x,y]=P(h.place.ll[0],h.place.ll[1]);const a=document.createElementNS(ns,'a');a.setAttribute('href','#c-'+m.id);a.setAttribute('class','cn-pin '+k);
    const tt=document.createElementNS(ns,'title');tt.textContent=`${ar()?h.place.ar:h.place.en}: ${h.title}`;a.append(tt);a.setAttribute('aria-label',tt.textContent);
    const ci=document.createElementNS(ns,'circle');ci.setAttribute('cx',x);ci.setAttribute('cy',y);ci.setAttribute('r',k==='sec'?5:4.5);a.append(ci);svg.append(a)})})}
  // أسماء الدول فوق الأشكال (الدول الصغيرة بنقطة واسم)
  labels.forEach(([m,g])=>{const t=document.createElementNS(ns,'text');t.setAttribute('x',g.cx);t.setAttribute('y',g.cy+(['lebanon','israel'].includes(m.id)?(m.id==='lebanon'?-10:16):4));t.setAttribute('text-anchor',m.id==='lebanon'||m.id==='israel'?(ar()?'start':'end'):'middle');
    if(m.id==='lebanon'||m.id==='israel')t.setAttribute('x',g.cx-(ar()?-10:10));t.setAttribute('class','cn-lbl');t.textContent=nm(m);svg.append(t)});
  box.append(svg,legend(LAYER));return box}

/* ---------- مؤشر الاستقرار ---------- */
function spark(hist){
  const pts=(hist||[]).filter(h=>h.score!=null).slice(-30);if(pts.length<2)return null;
  const ns='http://www.w3.org/2000/svg',W=220,H=48,svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox',`0 0 ${W} ${H}`);svg.setAttribute('class','cn-spark');svg.setAttribute('role','img');
  svg.setAttribute('aria-label',L(`المؤشر في آخر ${pts.length} أيام: من ${pts[0].score} إلى ${pts[pts.length-1].score}`,`Index over the last ${pts.length} days: from ${pts[0].score} to ${pts[pts.length-1].score}`));
  const x=i=>i/(pts.length-1)*(W-8)+4,y=v=>H-4-v/100*(H-8);
  const pl=document.createElementNS(ns,'polyline');pl.setAttribute('points',pts.map((p,i)=>`${x(ar()?pts.length-1-i:i)},${y(p.score)}`).join(' '));svg.append(pl);
  const last=pts.length-1,c=document.createElementNS(ns,'circle');c.setAttribute('cx',x(ar()?0:last));c.setAttribute('cy',y(pts[last].score));c.setAttribute('r',3.5);svg.append(c);return svg}
function indexPanel(m,big){
  const c=C(m.id),idx=c.index,box=el('div','cn-index');box.style.setProperty('--lc',lv(idx.level).c);
  const top=el('div','cn-itop');top.append(score(idx));const tx=el('div');tx.append(el('small',null,L('مؤشر الاستقرار اليوم','Stability index today')),pill(idx));const tr=trendTag(idx);if(tr)tx.append(tr);top.append(tx);
  if(big){const sp=spark(c.index_history);if(sp)top.append(sp)}box.append(top);
  if(idx.war){const w=el('p','basis');w.append(L('في حرب دائرة: المؤشر مسقوف بمستوى الحرب في ','In an ongoing war: the index is capped by the war level in '));const a=a_(L('ملف الحرب','the war file'),'#war-'+idx.war.id);w.append(a);box.append(w)}
  const dims=el('div','cn-dims');Object.keys(DIM).forEach(k=>{const d=(idx.dims||{})[k]||{};const r=el('div','cn-dim');const lab=el('span',null,ar()?DIM[k][0]:DIM[k][1]);
    const bar=el('span','cn-bar');const fill=el('i');fill.style.width=(idx.score==null?0:d.score)+'%';fill.style.background=lv(d.score>=70?'stable':d.score>=45?'strained':'unstable').c;bar.append(fill);
    r.append(lab,bar,el('b',null,idx.score==null?'—':String(d.score)));r.title=L(`${d.n||0} خبراً موثّقاً، ضغط ${d.pressure||0}`,`${d.n||0} verified stories, pressure ${d.pressure||0}`);dims.append(r)});box.append(dims);
  if(big){const det=el('details','cn-how');det.append(el('summary',null,L('كيف يُحسب المؤشر؟','How is the index computed?')));
    det.append(el('p',null,L('مؤشر آلي معلن العتبات، يقيس كثافة الأحداث الضاغطة وحدّتها في الأخبار التي أكدتها جهتان مستقلتان خلال 48 ساعة، ولا يحمل حكماً سياسياً. لكل خبر وزن: شديد الحدّة 3 (قتلى، غارات، اشتباكات، انقلاب، انهيار)، متوسط 1.5 (هجوم، احتجاج، اعتقال، عقوبات، أزمة، استقالة)، عادي 0.3، ويزيد النصف إن نقلته ثلاث جهات فأكثر. درجة كل بُعد = 100 × e^(−الضغط ÷ 12)، والمؤشر متوسط الأبعاد الثلاثة. 70 فأكثر مستقر، و45 إلى 69 تحت الضغط، ودون 45 مضطرب. والاتجاه مقارنة بآخر يوم سابق (فرق 5 درجات فأكثر). وإذا كانت الدولة طرفاً في حرب دائرة لها ملف في «الحروب الدائرة» يُسقَف البعد الأمني بمستوى الحرب (تصعيد 30، توتر 50، هدوء 65) والمؤشر العام (40، 55، 69)، لأن قلة العناوين لا تعني توقف الحرب. وإذا قلّت الأخبار الموثّقة عن 3 لا يُعرض رقم.','An automatic index with published thresholds. It measures the density and severity of pressure events in stories confirmed by two independent outlets over 48 hours, and carries no political judgement. Weights: high severity 3 (deaths, strikes, clashes, coup, collapse), medium 1.5 (attack, protest, arrest, sanctions, crisis, resignation), ordinary 0.3, plus half again when three or more outlets report it. Each dimension scores 100 × e^(−pressure ÷ 12); the index averages the three. 70+ is stable, 45–69 under strain, below 45 unstable. The trend compares with the previous day (5 points or more). If the country is party to an ongoing war with a file under Ongoing wars, the security dimension is capped by the war level (escalation 30, tense 50, calm 65) and the overall index likewise (40, 55, 69), because fewer headlines do not mean the war has stopped. With fewer than 3 verified stories no number is shown.')));box.append(det)}
  return box}

/* ---------- تابع دولة وتنبيه التصعيد ---------- */
function followBtn(m){
  const f=follows(),on=!!f[m.id],b=el('button','follow');b.type='button';b.setAttribute('aria-pressed',String(on));
  b.textContent=on?L('تتابع هذه الدولة','Following'):L('تابع هذه الدولة','Follow this country');
  b.onclick=()=>{const f=follows();if(f[m.id]){delete f[m.id];K.toast(L('أُلغيت المتابعة','Unfollowed'))}else{f[m.id]=fkey(m.id);K.toast(L('ستظهر أخبار هذه الدولة أولاً، وتنبّهك عبدو نيوز إن تغيّر وضعها','This country now comes first, and Abdo News will alert you if its situation changes'));
      try{if('Notification' in window&&Notification.permission==='default')Notification.requestPermission()}catch(e){}}
    K.store.set('khabar-follow-c',f);K.render()};return b}
// تنبيه يظهر أعلى الصفحة إن تراجع وضع دولة يتابعها القارئ (تغيّر المستوى إلى أسوأ أو هبوط 10 درجات) أو جدّ خبر موثّق منذ آخر زيارة
const RANK={stable:0,strained:1,unstable:2,nodata:-1};
function changes(){
  if(!D)return [];const f=follows(),out=[];
  Object.keys(f).forEach(id=>{const m=meta(id);if(!m)return;const was=f[id]||{},now=fkey(id),c=C(id);
    const worse=RANK[now.level]>RANK[was.level]&&RANK[was.level]>=0||(was.score!=null&&now.score!=null&&was.score-now.score>=10);
    const fresh=now.top&&was.top!==now.top;if(worse||fresh)out.push({m,worse,fresh,was,now,top:c.items[0]})});return out}
function alertBox(){
  const ch=changes();if(!ch.length)return null;const box=el('div','war-alert cn-alert');box.setAttribute('role','status');
  box.append(el('b',null,ch.some(x=>x.worse)?L('تغيّر الوضع في دولة تتابعها','The situation changed in a country you follow'):L('جديد في دول تتابعها','New in countries you follow')));
  ch.forEach(x=>{const a=el('a',null,x.worse?`${nm(x.m)}: ${L('المؤشر','index')} ${x.was.score??'—'} ← ${x.now.score??'—'} (${lv(x.now.level).t})`:`${nm(x.m)}: ${x.top?x.top.title:''}`);a.href='#c-'+x.m.id;box.append(a)});
  try{if('Notification' in window&&Notification.permission==='granted'&&!alertBox.sent){alertBox.sent=1;ch.filter(x=>x.worse).forEach(x=>new Notification(nm(x.m),{body:`${L('تغيّر الوضع','Situation changed')}: ${lv(x.now.level).t} (${x.now.score??'—'})`,icon:'assets/icon-192.png',tag:'khabar-country-'+x.m.id}))}}catch(e){}
  return box}
const seen=id=>{const f=follows();if(f[id]!=null){f[id]=fkey(id);K.store.set('khabar-follow-c',f)}};
const ordered=()=>{const f=follows();return metas().slice().sort((a,b)=>(!!f[b.id])-(!!f[a.id]))};

/* ---------- المحور: كل الدول ---------- */
function countryCard(m){
  const c=C(m.id),idx=c.index,f=follows(),card=el('article','war-card cn-card');card.style.setProperty('--lc',lv(idx.level).c);
  const h=el('div','wc-head');const h2=el('h2');h2.append(a_(`${m.flag} ${nm(m)}`,'#c-'+m.id));h.append(h2);if(f[m.id])h.append(el('span','cn-star',L('تتابعها','Following')));card.append(h);
  card.append(indexPanel(m,false));
  const ed=E(m.id);if(ed&&ed.summary){card.append(el('p','cn-sum',ed.summary[K.LANG]||ed.summary.ar))}
  const top=items(m.id)[0];if(top){const l=el('div','wc-last');l.append(el('b',null,L('آخر خبر موثّق','Latest verified story')+' · '+K.fmtDate(top.sources[0].date)),el('p',null,top.title));card.append(l)}
  const ft=el('div','wc-foot');const more=el('a','btn',L('افتح صفحة الدولة','Open country page'));more.href='#c-'+m.id;ft.append(more,followBtn(m));card.append(ft);return card}
function comparePicker(a,b){
  const box=el('form','cn-cmp-pick');box.setAttribute('aria-label',L('قارن بين دولتين','Compare two countries'));
  const sel=(v,lbl)=>{const l=el('label');l.append(el('span',null,lbl));const s=el('select');metas().forEach(m=>{const o=el('option',null,`${m.flag} ${nm(m)}`);o.value=m.id;if(m.id===v)o.selected=true;s.append(o)});l.append(s);return [l,s]};
  const ms=metas();const [l1,s1]=sel(a||ms[0]&&ms[0].id,L('الدولة الأولى','First country')),[l2,s2]=sel(b||ms[1]&&ms[1].id,L('الدولة الثانية','Second country'));
  const go=el('button','btn',L('قارن','Compare'));go.type='submit';box.append(l1,l2,go);
  box.onsubmit=e=>{e.preventDefault();if(s1.value===s2.value){K.toast(L('اختر دولتين مختلفتين','Pick two different countries'));return}location.hash='#cmp-'+s1.value+'-'+s2.value};return box}
function viewHub(main){
  main.append(head(L('الأوضاع في الدول','Country situations'),L('الأوضاع في الدول','Country situations'),L('صفحة لكل دولة بستة محاور: السياسي، والعسكري، والأمني، والاقتصادي، والتظاهرات والاحتجاجات، والعلاقات الخارجية (ومنها التعاون مع حلف شمال الأطلسي). تتحدث آلياً كل 3 ساعات، ويُراجع ملفها التحريري مع كل خلاصة. لا يُنشر خبر إلا إذا أكدته جهتان مستقلتان على الأقل، وتظهر جهاته وروابطه ودرجة التحقق تحته.','One page per country with six axes: politics, military, security, economy, protests and foreign relations (including NATO cooperation). Updated automatically every 3 hours, with an editorial file reviewed with each brief. A story is published only when at least two independent outlets confirm it, with its outlets, links and verification level shown beneath.')));
  if(!D){main.append(el('p','empty',L('يُنشر القسم مع التحديث الآلي القادم.','The section is published with the next automatic update.')));return}
  const m0=el('div','ed-meta');m0.append(el('span',null,L('آخر تحديث آلي: ','Last automatic update: ')+K.fmtTime(D.updated)),el('span',null,L(`${metas().length} دولة`,`${metas().length} countries`)));main.lastChild.append(m0);
  const al=alertBox();if(al)main.append(al);
  main.append(cmap(null));
  const g=el('div','war-grid cn-grid');ordered().forEach(m=>g.append(countryCard(m)));main.append(g);
  const cs=el('section','zone');const ch=el('div','zone-head');ch.append(el('h2',null,L('قارن بين دولتين','Compare two countries')));cs.append(ch,comparePicker());main.append(cs);
}

/* ---------- صفحة الدولة ---------- */
function protestsBlock(m){
  const c=C(m.id),ps=(c.protests||[]).filter(p=>!hid().has(p.id));const s=el('section','zone');s.id='cn-protests';
  const h=el('div','zone-head');h.append(el('h2',null,L('رصد التظاهرات','Protest monitor')),el('span','count',K.nItems(ps.length)));s.append(h);
  s.append(el('p','basis',L('المكان من عناوين الجهات، والعدد التقريبي لا يُنشر إلا إذا ذكرته جهتان مستقلتان (ويُعرض نطاقاً إن اختلفتا). آخر 7 أيام.','Place from the outlets\' headlines; an approximate turnout is shown only when two independent outlets give one (as a range if they differ). Last 7 days.')));
  if(!ps.length){s.append(el('p','empty',L('لا تظاهرات أكدتها جهتان مستقلتان في آخر 7 أيام.','No protests confirmed by two independent outlets in the last 7 days.')));return s}
  const ul=el('ul','cn-prot');ps.forEach(p=>{const li=el('li');const top=el('div','cn-prow');
    top.append(el('b',null,p.place?(ar()?p.place.ar:p.place.en):L('المكان غير محدد في المصادر','Place not stated by the outlets')));
    const fmt=v=>v>=1000?(v/1000).toLocaleString(ar()?'ar-EG':'en',{numberingSystem:'latn',maximumFractionDigits:1})+L(' ألف',' thousand'):String(v);
    top.append(el('span','cn-size',p.size?(p.size.min===p.size.max?L('نحو ','About ')+fmt(p.size.min):L('بين ','Between ')+fmt(p.size.min)+L(' و',' and ')+fmt(p.size.max)):L('العدد: لم تتفق عليه جهتان','Turnout: not agreed by two outlets')));
    top.append(el('small','mute',K.fmtDate(p.date)));li.append(top,el('p',null,p.title));
    const v=el('div','vline');v.append(badge(p.outlets));const box=el('div','src');p.sources.forEach(s=>box.append(a_(`${s.name} · ${K.fmtDate(s.date)}`,s.url,true)));v.append(box);li.append(v);ul.append(li)});s.append(ul);return s}
function relationsBlock(m){
  const ed=E(m.id),rel=(ed&&ed.relations)||[];const ax=m.axes.find(a=>a.id==='nato'||a.id==='intl');const its=ax?items(m.id,ax.id):[];
  const s=el('section','zone');s.id='cn-rel';const h=el('div','zone-head');h.append(el('h2',null,L('العلاقات الخارجية: الناتو والاتحاد الأوروبي والأمم المتحدة والاتفاقات','Foreign relations: NATO, the EU, the UN and agreements')));s.append(h);
  if(rel.length){const g=el('div','cn-rel');rel.forEach(r=>{const d=el('div','cn-relc');d.append(el('b',null,r.org?(r.org[K.LANG]||r.org.ar):''),el('p',null,r[K.LANG]||r.ar),esrc(r.src));g.append(d)});s.append(g)}
  if(its.length){const ul=el('ul','items');its.slice(0,4).forEach(i=>ul.append(card(i,m)));s.append(el('p','basis',L('أحدث الأخبار الموثّقة في هذا المحور:','Latest verified stories on this axis:')),ul)}
  if(!rel.length&&!its.length)s.append(el('p','empty',L('لا مدخلات موثّقة من جهتين بعد.','No entries confirmed by two outlets yet.')));return s}
function timelineBlock(m){
  const c=C(m.id),ed=E(m.id),h=hid();
  const ev=[...((ed&&ed.timeline)||[]).map(e=>({date:e.date,text:e[K.LANG]||e.ar||e.en,axis:e.axis,ed:true,src:e.src})),
    ...(c.timeline||[]).filter(e=>!h.has(e.id)&&(e.lang===K.LANG||!(c.timeline||[]).some(x=>x.lang===K.LANG))).map(e=>({date:e.date,text:e.title,axis:e.axis,outlets:e.outlets,sources:e.sources}))].sort((a,b)=>b.date.localeCompare(a.date));
  const s=el('section','zone');s.id='cn-tl';const hd=el('div','zone-head');hd.append(el('h2',null,L('الخط الزمني','Timeline')));s.append(hd);
  const span=K.store.get('khabar-cn-tl','week');const bar=el('div','cn-layers');
  [['week','هذا الأسبوع','This week'],['month','هذا الشهر','This month']].forEach(([id,a,e])=>{const b=el('button','chip',ar()?a:e);b.type='button';b.setAttribute('aria-pressed',String(span===id));b.onclick=()=>{K.store.set('khabar-cn-tl',id);K.render()};bar.append(b)});s.append(bar);
  const lim=new Date(Date.now()-(span==='week'?7:31)*864e5).toISOString().slice(0,10),list=ev.filter(e=>e.date>=lim).slice(0,span==='week'?30:80);
  if(!list.length){s.append(el('p','empty',L('لا أحداث موثّقة في هذه المدة بعد.','No verified events in this period yet.')));return s}
  const ol=el('ol','wtl');list.forEach(e=>{const li=el('li');const wh=el('div','when');wh.append(K.fmtDate(e.date));const ax=m.axes.find(a=>a.id===e.axis);if(ax)wh.append(el('small',null,ar()?ax.ar:ax.en));
    const wt=el('div','what');wt.append(el('p',null,e.text));const v=el('div','vline');
    if(e.ed){v.append(badge(new Set((e.src||[]).map(id=>{try{return new URL(S()[id].url).hostname}catch(x){return id}})).size),esrc(e.src))}
    else{v.append(badge(e.outlets||e.sources.length));const box=el('div','src');e.sources.forEach(x=>box.append(a_(`${x.name} · ${K.fmtDate(x.date)}`,x.url,true)));v.append(box)}
    wt.append(v);li.append(wh,wt);ol.append(li)});s.append(ol);return s}
function viewCountry(main,id){
  const m=meta(id);if(!m||!D){main.append(el('p','empty',L('هذه الصفحة غير متاحة الآن.','This page is not available.')));return}
  seen(id);
  const back=a_(ar()?'→ كل الدول':'← All countries','#countries');back.className='back';main.append(back);
  const ed=E(id),c=C(id);
  const hh=head(L('الأوضاع في الدول','Country situations'),`${m.flag} ${L('الأوضاع في ','The situation in ')}${nm(m)}`);
  const mt=el('div','ed-meta');mt.append(el('span',null,L('آخر تحديث آلي: ','Last automatic update: ')+K.fmtTime(c.checked||D.updated)));if(ed&&ed.updated)mt.append(el('span',null,L('آخر مراجعة تحريرية: ','Editorial review: ')+K.fmtDate(ed.updated)));
  hh.append(mt,followBtn(m));main.append(hh);
  // فهرس المحاور
  const nav=el('nav','cn-toc');nav.setAttribute('aria-label',L('محاور الصفحة','Page sections'));
  m.axes.forEach(a=>{const x=a_(`${ar()?a.ar:a.en} (${(c.counts||{})[a.id]||0})`,'#c-'+id);x.onclick=e=>{e.preventDefault();const t=document.getElementById('cn-ax-'+a.id);if(t)t.scrollIntoView({behavior:'smooth',block:'start'})};nav.append(x)});
  [['cn-protests','رصد التظاهرات','Protests'],['cn-rel','العلاقات الخارجية','Relations'],['cn-tl','الخط الزمني','Timeline']].forEach(([t,a,e])=>{const x=a_(ar()?a:e,'#c-'+id);x.onclick=ev=>{ev.preventDefault();const n=document.getElementById(t);if(n)n.scrollIntoView({behavior:'smooth',block:'start'})};nav.append(x)});
  main.append(nav);
  const top=el('div','cn-top');top.append(indexPanel(m,true));
  const f=fc(m);if(f){const o=OUT[f.outlook]||OUT.stable,b=el('div','cn-fc');b.style.setProperty('--lc',f.color||o[2]);b.append(el('small',null,L('التوقع خلال 30 يوماً','30-day outlook')),el('b',null,ar()?o[0]:o[1]));
    if(f.p_worse!=null)b.append(el('span',null,L('احتمال التدهور: ','Chance of worsening: ')+Math.round(f.p_worse*100)+'%'+(f.ci?` (${Math.round(f.ci[0]*100)}–${Math.round(f.ci[1]*100)}%)`:'')));
    b.append(el('small','mute',L('توقّع وليس خبراً','A forecast, not news')),a_(L('تفاصيل التوقع','Forecast details'),f.link||('forecast/#c='+m.iso3)));top.append(b)}
  main.append(top);
  if(ed&&ed.summary){const s=el('section','zone');const h=el('div','zone-head');h.append(el('h2',null,L('الصورة العامة','Overview')));s.append(h,eblock(ed.summary));
    if((ed.facts||[]).length){const g=el('div','ticks cn-facts');ed.facts.forEach(x=>{const d=el('div','tick');d.append(el('small',null,x.k?(x.k[K.LANG]||x.k.ar):''),el('b',null,x[K.LANG]||x.ar),esrc(x.src));g.append(d)});s.append(g)}
    main.append(s)}
  main.append(cmap(id));
  // المحاور الستة
  m.axes.forEach(a=>{const s=el('section','zone');s.id='cn-ax-'+a.id;const h=el('div','zone-head'),dot=el('span','dot');dot.style.background=m.color;const its=items(id,a.id);
    h.append(dot,el('h2',null,ar()?a.ar:a.en),el('span','count',K.nItems(its.length)));s.append(h);
    const ea=ed&&ed.axes&&ed.axes[a.id];if(ea){s.append(eblock(ea,L('مبني على','Based on')));if((ea.points||[]).length){const ul=el('ul','cn-points');ea.points.forEach(p=>{const li=el('li');li.append(el('p',null,p[K.LANG]||p.ar),esrc(p.src));ul.append(li)});s.append(ul)}}
    if(its.length){const ul=el('ul','items');its.slice(0,6).forEach(i=>ul.append(card(i,m)));if(ea)s.append(el('p','basis',L('أحدث الأخبار الموثّقة (تحديث آلي كل 3 ساعات):','Latest verified stories (auto-updated every 3 hours):')));s.append(ul)}
    else if(!ea)s.append(el('p','empty',L('لا أخبار أكدتها جهتان مستقلتان في هذا المحور خلال آخر 72 ساعة.','No stories confirmed by two independent outlets on this axis in the last 72 hours.')));
    main.append(s)});
  main.append(protestsBlock(m),relationsBlock(m),timelineBlock(m));
  const cs=el('section','zone');const ch=el('div','zone-head');ch.append(el('h2',null,L('قارن بدولة أخرى','Compare with another country')));cs.append(ch,comparePicker(id,(metas().find(x=>x.id!==id)||{}).id));main.append(cs);
  // كل المصادر التحريرية للدولة
  if(ed){const used=new Set();[ed.summary,...Object.values(ed.axes||{}),...Object.values(ed.axes||{}).flatMap(x=>x.points||[]),...(ed.facts||[]),...(ed.relations||[]),...(ed.timeline||[])].forEach(x=>x&&(x.src||[]).forEach(i=>used.add(i)));
    if(used.size){const w=el('section','sources-all');w.append(el('h3',null,L('مصادر الملف التحريري','Editorial file sources')));const ol=el('ol');[...used].forEach(i=>{const s=S()[i];if(!s)return;const li=el('li');li.append(a_(s[K.LANG]||s.ar||s.en,s.url,true),` · ${K.fmtDate(s.date)}`);ol.append(li)});w.append(ol);main.append(w)}}
}

/* ---------- مقارنة دولتين ---------- */
function viewCompare(main,a,b){
  const A=meta(a),B=meta(b);const back=a_(ar()?'→ كل الدول':'← All countries','#countries');back.className='back';main.append(back);
  main.append(head(L('مقارنة','Comparison'),A&&B?`${A.flag} ${nm(A)} · ${B.flag} ${nm(B)}`:L('مقارنة بين دولتين','Compare two countries'),L('المؤشرات نفسها جنباً إلى جنب، من الأخبار الموثّقة بجهتين مستقلتين.','The same indicators side by side, from stories confirmed by two independent outlets.')));
  main.append(comparePicker(a,b));if(!A||!B||!D)return;
  const t=el('table','cn-cmp');const cap=el('caption',null,L('مقارنة المؤشرات','Indicator comparison'));t.append(cap);
  const hr=el('tr');hr.append(el('th',null,L('المؤشر','Indicator')));[A,B].forEach(m=>{const th=el('th');th.scope='col';th.append(a_(`${m.flag} ${nm(m)}`,'#c-'+m.id));hr.append(th)});const th0=el('thead');th0.append(hr);t.append(th0);
  const tb=el('tbody');const row=(k,f)=>{const tr=el('tr');const h=el('th',null,k);h.scope='row';tr.append(h);[A,B].forEach(m=>{const td=el('td');const v=f(m);if(v instanceof Node)td.append(v);else td.textContent=v;tr.append(td)});tb.append(tr)};
  row(L('مؤشر الاستقرار','Stability index'),m=>{const i=C(m.id).index,d=el('span','cn-cell');d.append(score(i),pill(i));const tr=trendTag(i);if(tr)d.append(tr);return d});
  Object.keys(DIM).forEach(k=>row(ar()?DIM[k][0]:DIM[k][1],m=>{const i=C(m.id).index;return i.score==null?'—':String((i.dims[k]||{}).score)}));
  const axes=[...new Set([...A.axes,...B.axes].map(x=>x.id))];
  axes.forEach(id=>{const ax=A.axes.find(x=>x.id===id)||B.axes.find(x=>x.id===id);row(L('أخبار موثّقة: ','Verified stories: ')+(ar()?ax.ar:ax.en),m=>String((C(m.id).counts||{})[id]||0))});
  row(L('تظاهرات موثّقة (7 أيام)','Verified protests (7 days)'),m=>String((C(m.id).protests||[]).length));
  row(L('نقاط توتر (72 ساعة)','Tension points (72 hours)'),m=>String((C(m.id).hotspots||[]).length));
  row(L('أحداث الخط الزمني (7 أيام)','Timeline events (7 days)'),m=>{const lim=new Date(Date.now()-7*864e5).toISOString().slice(0,10);return String((C(m.id).timeline||[]).filter(e=>e.date>=lim).length)});
  if(FC)row(L('التوقع خلال 30 يوماً','30-day outlook'),m=>{const f=fc(m);if(!f)return '—';const o=OUT[f.outlook]||OUT.stable;return `${ar()?o[0]:o[1]}${f.p_worse!=null?` · ${Math.round(f.p_worse*100)}%`:''}`});
  t.append(tb);const wrap=el('div','cn-cmp-wrap');wrap.append(t);main.append(wrap);
  const g=el('div','war-grid cn-grid');[A,B].forEach(m=>g.append(countryCard(m)));main.append(g);
}

/* ---------- بطاقة الصفحة الرئيسية ---------- */
function home(){
  if(!D||!metas().length)return [];const s=el('section','mil-teaser cn-teaser');const h=el('div','zone-head');h.append(el('h2',null,L('الأوضاع في الدول','Country situations')),a_(L('افتح القسم','Open the section'),'#countries'));h.lastChild.className='more';s.append(h);
  const al=alertBox();if(al)s.append(al);
  const row=el('div','war-strip');ordered().forEach(m=>{const c=el('a','war-chip');c.href='#c-'+m.id;const i=C(m.id).index;c.append(pill(i),el('span',null,`${m.flag} ${nm(m)}${i.score!=null?' · '+i.score:''}`));row.append(c)});s.append(row);
  const f=follows(),fl=metas().filter(m=>f[m.id]);if(fl.length){const ul=el('ul','items');fl.slice(0,3).forEach(m=>{const it=items(m.id)[0];if(it)ul.append(card(it,m))});if(ul.children.length)s.append(el('p','basis',L('من الدول التي تتابعها:','From countries you follow:')),ul)}
  return [s]}

const has=v=>v==='countries'||/^c-[a-z0-9_]+$/.test(v)||/^cmp-[a-z0-9_]+-[a-z0-9_]+$/.test(v);
window.KC={load,has,home,
  view(v,main){if(v==='countries')viewHub(main);else if(v.startsWith('cmp-')){const [,a,b]=v.split('-');viewCompare(main,a,b)}else viewCountry(main,v.slice(2))},
  get data(){return D}};
})();
