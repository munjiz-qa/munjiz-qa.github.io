'use strict';
// Admin: performance indicators (المؤشرات). Everything is computed in the browser from the data the panel already loads,
// plus the existing staff 'report' for attendance; targets are saved as Budget rows with code 'KPI.<key>' (monthly value).
// Views: kpi (scorecard), kpis (sales and money), kpio (operations), kpic (clients and satisfaction), kpit (team), kpig (targets).
// Uses helpers from crm.js ($, esc, fmt, L, EN, DB, VIEWS, S, REMOTE, CLOSED, STATUSES, REQ_ST, dOnly, dstr, days, iso, money, table, progBar, balance, link, cli, staffName, workItems, isLate, saveRow, toast, errText, isAdmin).
(function(){
// ---------- periods ----------
const PER=[['month',L('هذا الشهر','This month')],['last',L('الشهر الماضي','Last month')],['q',L('آخر 3 أشهر','Last 3 months')],['year',L('هذه السنة','This year')],['y12',L('آخر 12 شهراً','Last 12 months')],['all',L('كل الفترات','All time')]];
let per='month';
const addM=(d,n)=>{const x=new Date(d.getFullYear(),d.getMonth()+n,1),last=new Date(x.getFullYear(),x.getMonth()+1,0).getDate();x.setDate(Math.min(d.getDate(),last));return x};
const pd=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
function range(v){const t=new Date(),y=t.getFullYear(),m=t.getMonth();
  if(v==='last')return [dstr(new Date(y,m-1,1)),dstr(new Date(y,m,0))];if(v==='q')return [dstr(new Date(y,m-2,1)),dstr(t)];
  if(v==='year')return [dstr(new Date(y,0,1)),dstr(t)];if(v==='y12')return [dstr(new Date(y,m-11,1)),dstr(t)];if(v==='all')return ['0000-00-00','9999-99-99'];return [dstr(new Date(y,m,1)),dstr(t)]}
// the period just before, of the same shape (this month to date ↔ the same days of last month)
function prevOf(v,P){const n={month:1,last:1,q:3,year:12,y12:12}[v];if(!n)return null;const b=pd(P[1]),a=pd(P[0]);
  if(v==='last')return [dstr(new Date(a.getFullYear(),a.getMonth()-1,1)),dstr(new Date(a.getFullYear(),a.getMonth(),0))];return [dstr(addM(a,-n)),dstr(addM(b,-n))]}
const ndays=P=>P[0]==='0000-00-00'?null:Math.round((pd(P[1])-pd(P[0]))/864e5)+1;
const inR=(d,P)=>{d=dOnly(d);return !!d&&d>=P[0]&&d<=P[1]};
const months=n=>{const t=new Date();return [...Array(n)].map((_,i)=>{const a=new Date(t.getFullYear(),t.getMonth()-n+1+i,1),b=new Date(a.getFullYear(),a.getMonth()+1,0);return [dstr(a),dstr(b>t?t:b)]})};
const ts=s=>{const d=new Date(String(s||'').replace(' ','T'));return isNaN(d)?null:d};
const dd=(a,b)=>{const x=ts(a),y=ts(b);return x&&y?(y-x)/864e5:null};

// ---------- base numbers ----------
const sum=(a,f)=>a.reduce((s,x)=>s+(+f(x)||0),0);
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const pct=(a,b)=>b?a/b*100:null;
const plans=()=>(typeof DATA!=='undefined'&&DATA.PLANS)||[];
const planPrice=n=>{const p=plans().find(x=>x.name===n||x.key===n);return p?+p.m||0:0};
const pays=P=>sum(DB.Payments.filter(p=>inR(p.date,P)),p=>p.amount);
const exps=P=>sum(DB.Expenses.filter(x=>inR(x.date,P)),x=>x.amount);
const txNew=P=>DB.Transactions.filter(t=>inR(t.created,P));
const txDone=P=>DB.Transactions.filter(t=>t.status==='منجزة'&&inR(t.closed||t.updated,P));
const cycle=t=>{const v=dd(t.startDate||t.created,t.closed||t.updated);return v===null?null:Math.max(0,v)};
const onTime=t=>t.dueDate?dOnly(t.closed||t.updated)<=dOnly(t.dueDate):null;
const openTx=()=>DB.Transactions.filter(t=>!CLOSED.includes(t.status));
const lateTx=()=>openTx().filter(t=>{const d=days(t.dueDate);return d!==null&&d<0});
const reqs=P=>DB.Requests.filter(r=>inR(r.created,P));
const activeCli=P=>[...new Set(txNew(P).filter(t=>t.status!=='ملغاة').map(t=>t.clientId).filter(Boolean))];
const firstTx=()=>{const m={};DB.Transactions.forEach(t=>{const d=dOnly(t.created);if(t.clientId&&(!m[t.clientId]||d<m[t.clientId]))m[t.clientId]=d});return m};
const subs=()=>DB.Clients.filter(c=>c.plan&&(!c.planEnd||days(c.planEnd)>=0));
const revs=P=>(DB.Reviews||[]).filter(r=>inR(r.created,P)&&+r.stars);
// client message → first office reply after it, in hours; open conversations are counted as waiting
function replies(P){const by={},out={h:[],waiting:0};DB.Messages.forEach(m=>(by[m.clientId]=by[m.clientId]||[]).push(m));
  Object.values(by).forEach(list=>{list.sort((a,b)=>a.created>b.created?1:-1);let open=null;
    list.forEach(m=>{if(m.from==='client'){if(!open)open=m}else if(open){if(inR(open.created,P)){const h=dd(open.created,m.created);if(h!==null)out.h.push(h*24)}open=null}});
    if(open&&inR(open.created,P))out.waiting++});return out}
function revByClient(P){const m={};DB.Payments.filter(p=>inR(p.date,P)).forEach(p=>m[p.clientId]=(m[p.clientId]||0)+(+p.amount||0));return m}
const staffN=()=>Math.max(1,(DB.Staff||[]).length);

// ---------- indicator catalogue ----------
// u: money | pct | n | days | hrs | stars · dir: 1 higher is better, -1 lower is better · add: a monthly target scales with the period length
// snap: a picture of today (no period, no trend) · def: suggested target when the manager has not set one
const G={fin:L('المالية','Finance'),sales:L('المبيعات والطلبات','Sales and requests'),ops:L('العمليات والإنجاز','Operations'),cli:L('العملاء والرضا','Clients and satisfaction'),team:L('الفريق','Team')};
const K=[
 {k:'rev',g:'fin',n:L('الإيراد المحصّل','Revenue collected'),u:'money',dir:1,add:1,f:pays,h:L('كل ما قبضه المكتب من العملاء في الفترة (سندات القبض).','Everything received from clients in the period (receipts).')},
 {k:'profit',g:'fin',n:L('صافي الربح','Net profit'),u:'money',dir:1,add:1,f:P=>pays(P)-exps(P),h:L('الإيراد المحصّل − المصروفات المسجلة.','Revenue collected − recorded expenses.')},
 {k:'margin',g:'fin',n:L('هامش الربح','Profit margin'),u:'pct',dir:1,def:30,f:P=>{const r=pays(P);return r?(r-exps(P))/r*100:null},h:L('صافي الربح ÷ الإيراد.','Net profit ÷ revenue.')},
 {k:'fees',g:'fin',n:L('أتعاب المعاملات الجديدة','Fees on new transactions'),u:'money',dir:1,add:1,f:P=>sum(txNew(P).filter(t=>t.status!=='ملغاة'),t=>t.fee),h:L('أتعاب المكتب (دون الرسوم الحكومية) للمعاملات التي فُتحت في الفترة.','Office fees (without government fees) on transactions opened in the period.')},
 {k:'coll',g:'fin',n:L('نسبة التحصيل','Collection rate'),u:'pct',dir:1,def:95,f:P=>{const t=txNew(P).filter(x=>x.status!=='ملغاة'),b=sum(t,x=>(+x.fee||0)+(+x.govFee||0));return b?Math.min(100,sum(t,x=>x.paid)/b*100):null},h:L('ما دُفع من قيمة المعاملات التي فُتحت في الفترة.','Share already paid of transactions opened in the period.')},
 {k:'dso',g:'fin',n:L('متوسط أيام التحصيل','Days sales outstanding'),u:'days',dir:-1,def:30,snap:1,f:()=>{const r=months(3),P=[r[0][0],r[2][1]],b=sum(txNew(P).filter(t=>t.status!=='ملغاة'),t=>(+t.fee||0)+(+t.govFee||0)),o=sum(DB.Transactions.filter(t=>t.status!=='ملغاة'),balance);return b?o/(b/ndays(P)):null},h:L('المستحق على العملاء الآن ÷ متوسط المفوتر يومياً في آخر 3 أشهر.','Owed by clients now ÷ average billed per day over the last 3 months.')},
 {k:'mrr',g:'fin',n:L('الإيراد الشهري من الباقات','Monthly package revenue'),u:'money',dir:1,snap:1,f:()=>sum(subs(),c=>planPrice(c.plan)),h:L('مجموع أسعار الباقات الشهرية للعملاء المشتركين حالياً.','Monthly price of the packages of clients subscribed now.')},
 {k:'req',g:'sales',n:L('طلبات جديدة','New requests'),u:'n',dir:1,add:1,f:P=>reqs(P).length,h:L('طلبات الموقع والبوابة والمكتب في الفترة.','Requests from the site, the portal and the office in the period.')},
 {k:'conv',g:'sales',n:L('معدل تحويل الطلبات','Request conversion'),u:'pct',dir:1,def:40,f:P=>{const r=reqs(P);return r.length?pct(r.filter(x=>x.status==='تحوّل إلى معاملة').length,r.length):null},h:L('الطلبات التي تحولت إلى معاملة ÷ كل الطلبات.','Requests turned into a transaction ÷ all requests.')},
 {k:'pend',g:'sales',n:L('طلبات لم يُتواصل معها','Requests not contacted yet'),u:'n',dir:-1,def:0,snap:1,f:()=>DB.Requests.filter(r=>r.status==='جديد').length,h:L('طلبات حالتها «جديد» الآن.','Requests still marked New.')},
 {k:'atv',g:'sales',n:L('متوسط قيمة المعاملة','Average transaction value'),u:'money',dir:1,f:P=>{const t=txNew(P).filter(x=>x.status!=='ملغاة');return t.length?sum(t,x=>x.fee)/t.length:null},h:L('متوسط أتعاب المكتب للمعاملة الواحدة.','Average office fee per transaction.')},
 {k:'txNew',g:'ops',n:L('معاملات جديدة','New transactions'),u:'n',dir:1,add:1,f:P=>txNew(P).length},
 {k:'txDone',g:'ops',n:L('معاملات منجزة','Transactions completed'),u:'n',dir:1,add:1,f:P=>txDone(P).length},
 {k:'ontime',g:'ops',n:L('الإنجاز في الموعد','On-time completion'),u:'pct',dir:1,def:90,f:P=>{const d=txDone(P).map(onTime).filter(x=>x!==null);return d.length?pct(d.filter(Boolean).length,d.length):null},h:L('المعاملات المنجزة قبل موعدها المحدد ÷ المنجزة التي لها موعد.','Completed by their due date ÷ completed ones with a due date.')},
 {k:'cycle',g:'ops',n:L('متوسط مدة الإنجاز','Average turnaround'),u:'days',dir:-1,def:7,f:P=>avg(txDone(P).map(cycle).filter(x=>x!==null)),h:L('من بدء المعاملة إلى إنجازها.','From start to completion.')},
 {k:'late',g:'ops',n:L('المتأخرة من المفتوحة','Overdue share of open'),u:'pct',dir:-1,def:10,snap:1,f:()=>{const o=openTx();return o.length?pct(lateTx().length,o.length):null},h:L('المعاملات المفتوحة التي تجاوزت موعدها الآن.','Open transactions past their due date now.')},
 {k:'cancel',g:'ops',n:L('نسبة الإلغاء','Cancellation rate'),u:'pct',dir:-1,def:5,f:P=>{const t=txNew(P);return t.length?pct(t.filter(x=>x.status==='ملغاة').length,t.length):null}},
 {k:'reply',g:'ops',n:L('متوسط زمن الرد على العملاء','Average reply time'),u:'hrs',dir:-1,def:4,f:P=>avg(replies(P).h),h:L('من أول رسالة للعميل في البوابة إلى أول رد من المكتب.','From a client\'s first portal message to the office\'s first reply.')},
 {k:'newCli',g:'cli',n:L('عملاء جدد','New clients'),u:'n',dir:1,add:1,f:P=>DB.Clients.filter(c=>inR(c.created,P)).length},
 {k:'active',g:'cli',n:L('عملاء نشطون','Active clients'),u:'n',dir:1,f:P=>activeCli(P).length,h:L('عملاء فُتحت لهم معاملة في الفترة.','Clients with a transaction opened in the period.')},
 {k:'ret',g:'cli',n:L('العملاء العائدون','Returning clients'),u:'pct',dir:1,def:50,f:P=>{const a=activeCli(P),f=firstTx();return a.length?pct(a.filter(id=>f[id]<P[0]).length,a.length):null},h:L('من العملاء النشطين: من سبق أن تعامل معنا قبل الفترة.','Of active clients: those who had worked with us before the period.')},
 {k:'subs',g:'cli',n:L('مشتركو الباقات','Package subscribers'),u:'n',dir:1,snap:1,f:()=>subs().length},
 {k:'portal',g:'cli',n:L('استخدام بوابة العملاء','Client portal adoption'),u:'pct',dir:1,def:60,snap:1,f:()=>DB.Clients.length?pct(new Set(DB.Accounts.filter(a=>a.status==='مفعّل').map(a=>a.clientId)).size,DB.Clients.length):null,h:L('العملاء الذين لهم حساب مفعّل في «حسابي».','Clients with an active My account login.')},
 {k:'csat',g:'cli',n:L('متوسط تقييم العملاء','Average client rating'),u:'stars',dir:1,def:4.5,f:P=>avg(revs(P).map(r=>+r.stars))},
 {k:'sat',g:'cli',n:L('العملاء الراضون','Satisfied clients'),u:'pct',dir:1,def:90,f:P=>{const r=revs(P);return r.length?pct(r.filter(x=>+x.stars>=4).length,r.length):null},h:L('تقييمات 4 أو 5 نجوم ÷ كل التقييمات.','4 or 5 star ratings ÷ all ratings.')},
 {k:'conc',g:'cli',n:L('حصة أكبر 5 عملاء من الإيراد','Top-5 client revenue share'),u:'pct',dir:-1,def:50,f:P=>{const v=Object.values(revByClient(P)).sort((a,b)=>b-a),t=v.reduce((a,b)=>a+b,0);return t?v.slice(0,5).reduce((a,b)=>a+b,0)/t*100:null},h:L('كلما ارتفعت زاد اعتماد المكتب على عدد قليل من العملاء.','The higher it is, the more the office depends on a few clients.')},
 {k:'revEmp',g:'team',n:L('الإيراد لكل موظف','Revenue per employee'),u:'money',dir:1,add:1,f:P=>pays(P)/staffN()},
 {k:'doneEmp',g:'team',n:L('معاملات منجزة لكل موظف','Completed per employee'),u:'n',dir:1,add:1,f:P=>txDone(P).length/staffN()},
 {k:'tasks',g:'team',n:L('إنجاز المهام','Task completion'),u:'pct',dir:1,def:85,f:P=>{const w=(DB.Tasks||[]).filter(t=>inR(t.due||t.created,P)&&t.status!=='ملغاة');return w.length?pct(w.filter(t=>t.status==='منجزة').length,w.length):null},h:L('المهام المنجزة ÷ المهام المستحقة في الفترة.','Tasks done ÷ tasks due in the period.')},
 {k:'evals',g:'team',n:L('متوسط تقييم الموظفين','Average staff evaluation'),u:'pct',dir:1,def:80,snap:1,f:()=>{const last={};(DB.Evals||[]).forEach(v=>{if(!last[v.username]||v.created>last[v.username].created)last[v.username]=v});return avg(Object.values(last).map(v=>+v.total).filter(x=>!isNaN(x)))},h:L('آخر تقييم لكل موظف (يظهر لمن لديه صلاحية الموارد البشرية).','Latest evaluation of each employee (needs the HR permission).')}
];
const KM=Object.fromEntries(K.map(x=>[x.k,x]));

// ---------- targets (Budget rows: year, code 'KPI.<key>', amount = monthly target) ----------
const year=()=>iso().slice(0,4);
const tRow=k=>(DB.Budget||[]).find(b=>String(b.year)===year()&&b.code==='KPI.'+k);
const tMonth=k=>{const r=tRow(k);return r&&r.amount!==''&&r.amount!=null&&!isNaN(+r.amount)?+r.amount:(KM[k].def!=null?KM[k].def:null)};
const tSet=k=>!!tRow(k);
function target(x,P){const m=tMonth(x.k);if(m==null)return null;if(!x.add)return m;const n=ndays(P);return n?m*n/30.44:null}
function state(x,v,t){if(v==null||t==null)return '';if(x.dir>0){if(v>=t)return 'good';return v>=t*0.9?'warn':'bad'}if(v<=t)return 'good';return v<=(t||1)*1.15||v-t<=1?'warn':'bad'}

// ---------- formatting ----------
const r1=n=>Math.round(n*10)/10;
function show(u,v){if(v==null||isNaN(v))return '—';if(u==='money')return money(Math.round(v));if(u==='pct')return r1(v)+'%';if(u==='days')return r1(v)+' '+L('يوم','days');if(u==='hrs')return r1(v)+' '+L('ساعة','h');if(u==='stars')return r1(v)+' / 5';return fmt(r1(v))}
function delta(x,v,p){if(v==null||p==null)return '';const d=x.u==='pct'?v-p:(p?(v-p)/Math.abs(p)*100:null);if(d==null||!isFinite(d))return '';
  const good=d===0?'':((d>0)===(x.dir>0)?'good':'bad'),s=(d>0?'▲ ':d<0?'▼ ':'')+r1(Math.abs(d))+(x.u==='pct'?' '+L('نقطة','pts'):'%');
  return `<small class="kd ${good}" title="${esc(L('مقارنة بالفترة السابقة','Compared with the previous period'))}">${s}</small>`}
function spark(x){if(x.snap)return '';const s=months(12).map(P=>x.f(P)),v=s.map(n=>n==null||isNaN(n)?null:n),ok=v.filter(n=>n!=null);if(ok.length<2)return '';
  const mn=Math.min(...ok),mx=Math.max(...ok),h=26,w=100,rtl=document.documentElement.dir==='rtl',pts=v.map((n,i)=>n==null?null:[(rtl?11-i:i)*(w/11),h-2-(mx===mn?h/2-2:(n-mn)/(mx-mn)*(h-4))]).filter(Boolean);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="${esc(L('اتجاه آخر 12 شهراً','Last 12 months trend'))}"><polyline points="${pts.map(p=>p.map(r1).join(',')).join(' ')}" fill="none" stroke="currentColor" stroke-width="1.8" vector-effect="non-scaling-stroke"/><circle cx="${r1(pts[pts.length-1][0])}" cy="${r1(pts[pts.length-1][1])}" r="2.4" fill="currentColor"/></svg>`}
function card(x,P,Pp){const v=x.snap?x.f():x.f(P),p=!x.snap&&Pp?x.f(Pp):null,t=target(x,P),st=state(x,v,t);
  const ach=t!=null&&v!=null?(x.dir>0?(t?v/t*100:100):(v?t/v*100:100)):null;
  return `<div class="kcard ${st}" title="${esc(x.h||'')}"><span class="kn">${esc(x.n)}</span><b class="num">${show(x.u,v)}</b>${delta(x,v,p)}
    ${t!=null?`<div class="kt"><span class="prog"><i style="width:${Math.max(0,Math.min(100,ach||0))}%"></i></span><small>${L('الهدف','Target')} ${show(x.u,t)}${tSet(x.k)?'':' · '+L('مقترح','suggested')}</small></div>`:''}
    ${spark(x)}${x.snap?`<small class="mute">${L('الوضع الآن','As of now')}</small>`:''}</div>`}

// ---------- shared pieces ----------
function head(title,note){const P=range(per);return `<div class="bar"><h2>${esc(title)}</h2><select class="kpiP" aria-label="${esc(L('الفترة','Period'))}">${PER.map(([v,n])=>`<option value="${v}" ${v===per?'selected':''}>${esc(n)}</option>`).join('')}</select><span class="sp"></span><span class="mute sm">${per==='all'?'':`${P[0]} — ${P[1]}`}</span><button type="button" class="btn sm ghost kpiPrint">${L('طباعة','Print')}</button></div>${note?`<p class="mute sm">${note}</p>`:''}`}
const hbars=(rows,f=n=>fmt(n))=>{if(!rows.length)return `<p class="mute">${L('لا توجد بيانات في هذه الفترة.','No data in this period.')}</p>`;const m=Math.max(1,...rows.map(r=>r[1]));
  return `<ul class="hbars">${rows.map(([k,n])=>`<li><span>${esc(k)}</span><span class="hb"><i style="width:${n/m*100}%"></i></span><b class="num">${f(n)}</b></li>`).join('')}</ul>`};
function cols(series,names,fmtv=fmt){const mx=Math.max(1,...series.flatMap(s=>s.v));const ms=months(12).map(P=>P[0].slice(2,7).replace('-','/'));
  return `<div class="legend">${names.map((n,i)=>`<span><i class="sw ${i?'cost':'rev'}"></i>${esc(n)}</span>`).join('')}</div>
   <div class="cols c12" role="img" aria-label="${esc(names.join(' / '))}">${ms.map((m,i)=>`<div class="col"><div class="pair">${series.map((s,j)=>`<i class="${j?'cost':'rev'}" style="height:${s.v[i]/mx*100}%" title="${m} · ${esc(names[j])}: ${fmtv(s.v[i])}"></i>`).join('')}</div><small class="num">${m}</small></div>`).join('')}</div>`}
const monthly=f=>months(12).map(P=>f(P));
const panel=(t,body,cls='')=>`<div class="panel ${cls}"><h3>${esc(t)}</h3>${body}</div>`;
function group(g,P,Pp){return K.filter(x=>x.g===g).map(x=>card(x,P,Pp)).join('')}

// ---------- 1) scorecard ----------
function insights(P){const out=[],add=(lvl,t)=>out.push([lvl,t]),v=k=>KM[k].snap?KM[k].f():KM[k].f(P);
  K.forEach(x=>{const a=x.snap?x.f():x.f(P),t=target(x,P);if(a==null||t==null||!tSet(x.k))return;const s=state(x,a,t);if(s==='bad')add('bad',L(`«${x.n}» بعيد عن الهدف: ${show(x.u,a)} مقابل ${show(x.u,t)}.`,`“${x.n}” is off target: ${show(x.u,a)} against ${show(x.u,t)}.`))});
  const lt=lateTx().length;if(lt)add('bad',L(`${lt} معاملة متأخرة عن موعدها الآن. راجع «توزيع المهام».`,`${lt} transaction(s) are overdue now. See Work distribution.`));
  const nr=v('pend');if(nr)add('warn',L(`${nr} طلب لم يُتواصل مع أصحابها بعد. التواصل خلال ساعتين يرفع التحويل.`,`${nr} request(s) not contacted yet. Contacting within two hours lifts conversion.`));
  const pe=DB.Clients.filter(c=>{const d=days(c.planEnd);return d!==null&&d>=0&&d<=30}).length;if(pe)add('warn',L(`${pe} باقة تنتهي خلال 30 يوماً. فرصة تجديد.`,`${pe} package(s) end within 30 days: renewal opportunity.`));
  const rn=DB.Transactions.filter(t=>{const d=days(t.expiryDate);return d!==null&&d>=0&&d<=30}).length;if(rn)add('warn',L(`${rn} مستند لعملاء ينتهي خلال 30 يوماً. اعرض التجديد.`,`${rn} client document(s) expire within 30 days. Offer the renewal.`));
  const c=v('conc');if(c!=null&&c>60)add('warn',L(`أكبر 5 عملاء يمثلون ${r1(c)}% من الإيراد. نوّع قاعدة العملاء.`,`The top 5 clients bring ${r1(c)}% of revenue. Broaden the client base.`));
  const w=replies(P).waiting;if(w)add('warn',L(`${w} محادثة عميل تنتظر الرد.`,`${w} client conversation(s) are waiting for a reply.`));
  const m=v('margin');if(m!=null&&m<0)add('bad',L('المصروفات أعلى من الإيراد في هذه الفترة.','Expenses are higher than revenue in this period.'));
  if(!out.length)add('good',L('لا توجد تنبيهات. كل المؤشرات التي لها هدف ضمن المطلوب.','No alerts. Every indicator with a target is on track.'));
  return `<ul class="kins">${out.map(([l,t])=>`<li class="${l}">${esc(t)}</li>`).join('')}</ul>`}
function renderScore(){const P=range(per),Pp=prevOf(per,P);let on=0,all=0;
  K.forEach(x=>{const v=x.snap?x.f():x.f(P),t=target(x,P);if(v!=null&&t!=null){all++;if(state(x,v,t)==='good')on++}});
  $('v-kpi').innerHTML=head(L('لوحة المؤشرات','Indicators'),L('كل مؤشر يقارَن بالفترة السابقة المماثلة (▲▼) وبالهدف الشهري الذي تحدده في «الأهداف». الخط الصغير اتجاه آخر 12 شهراً. مرّر المؤشر لترى طريقة حسابه.','Each indicator is compared with the same previous period (▲▼) and with the monthly target you set in Targets. The small line is the last 12 months. Hover an indicator to see how it is calculated.'))+
    `<div class="kpis khead"><div class="kpi ${all&&on/all>=.8?'good':all&&on/all<.5?'bad':''}"><b class="num">${all?Math.round(on/all*100)+'%':'—'}</b><span>${L(`مؤشرات على الهدف (${on} من ${all})`,`Indicators on target (${on} of ${all})`)}</span></div>
     <div class="kpi"><b class="num">${money(pays(P))}</b><span>${L('الإيراد المحصّل','Revenue collected')}</span></div><div class="kpi"><b class="num">${txDone(P).length}</b><span>${L('معاملات منجزة','Transactions completed')}</span></div>
     <div class="kpi ${lateTx().length?'bad':''}"><b class="num">${lateTx().length}</b><span>${L('متأخرة الآن','Overdue now')}</span></div></div>`+
    panel(L('تنبيهات وتوصيات','Alerts and next steps'),insights(P))+
    Object.entries(G).map(([g,n])=>`<h3 class="kg">${esc(n)}</h3><div class="kgrid">${group(g,P,Pp)}</div>`).join('')+
    `<p class="bar"><button type="button" class="btn sm ghost" id="kpiCsv">${L('تنزيل المؤشرات (CSV)','Download indicators (CSV)')}</button></p>`}

// ---------- 2) sales and money ----------
function renderSales(){const P=range(per),Pp=prevOf(per,P),T=txNew(P).filter(t=>t.status!=='ملغاة');
  const byG={};T.forEach(t=>{const s=SVC[t.code]||{},k=s.g||L('أخرى','Other');byG[k]=(byG[k]||0)+(+t.fee||0)});
  const bySvc={};T.forEach(t=>{const k=t.service||t.code||'—';const o=bySvc[k]=bySvc[k]||{n:0,f:0};o.n++;o.f+=+t.fee||0});
  const byPlan={};subs().forEach(c=>{byPlan[c.plan]=(byPlan[c.plan]||0)+1});
  const byCat={};DB.Expenses.filter(x=>inR(x.date,P)).forEach(x=>byCat[x.category||'—']=(byCat[x.category||'—']||0)+(+x.amount||0));
  const rc=revByClient(P),top=Object.entries(rc).sort((a,b)=>b[1]-a[1]).slice(0,10),tot=Object.values(rc).reduce((a,b)=>a+b,0);
  const aging=[[L('حتى 30 يوماً','Up to 30 days'),0],[L('31 إلى 60','31 to 60'),0],[L('61 إلى 90','61 to 90'),0],[L('أكثر من 90','Over 90'),0]];
  DB.Transactions.filter(t=>t.status!=='ملغاة'&&balance(t)>0).forEach(t=>{const a=-(days(dOnly(t.created))||0);aging[a<=30?0:a<=60?1:a<=90?2:3][1]+=balance(t)});
  $('v-kpis').innerHTML=head(L('المبيعات والإيراد','Sales and revenue'))+
    `<div class="kgrid">${group('fin',P,Pp)}${group('sales',P,Pp)}</div>
    <div class="grid2">${panel(L('الإيراد والمصروفات: آخر 12 شهراً','Revenue and expenses: last 12 months'),cols([{v:monthly(pays)},{v:monthly(exps)}],[L('الإيراد','Revenue'),L('المصروفات','Expenses')],n=>money(n)))}
      ${panel(L('الطلبات والمعاملات الجديدة: آخر 12 شهراً','Requests and new transactions: last 12 months'),cols([{v:monthly(P=>reqs(P).length)},{v:monthly(P=>txNew(P).length)}],[L('طلبات','Requests'),L('معاملات','Transactions')]))}</div>
    <div class="grid2">${panel(L('الأتعاب حسب نوع الخدمة','Fees by service group'),hbars(Object.entries(byG).sort((a,b)=>b[1]-a[1]),n=>money(n)))}
      ${panel(L('المستحق على العملاء حسب العمر','Amounts owed by age'),hbars(aging.filter(a=>a[1]),n=>money(n)))}</div>
    ${panel(L('أعلى الخدمات أتعاباً','Top services by fees'),`<div class="tbl">${table([L('الخدمة','Service'),L('العدد','Count'),L('الأتعاب','Fees'),L('المتوسط','Average'),L('الحصة','Share')],Object.entries(bySvc).sort((a,b)=>b[1].f-a[1].f).slice(0,12).map(([k,o])=>{const all=sum(T,t=>t.fee);return `<tr><td>${esc(k)}</td><td class="num">${o.n}</td><td class="num">${money(o.f)}</td><td class="num">${money(o.f/o.n)}</td><td>${progBar(all?Math.round(o.f/all*100):0)}</td></tr>`}))}</div>`)}
    <div class="grid2">${panel(L('أكبر العملاء إيراداً','Top clients by revenue'),top.length?`<ul class="plain">${top.map(([id,v])=>`<li>${link(id,cli(id).name||id)} · <b class="num">${money(v)}</b> <small class="mute num">${r1(v/tot*100)}%</small></li>`).join('')}</ul>`:`<p class="mute">${L('لا يوجد تحصيل في الفترة.','No payments in the period.')}</p>`)}
      ${panel(L('المصروفات حسب البند','Expenses by category'),hbars(Object.entries(byCat).sort((a,b)=>b[1]-a[1]),n=>money(n)))}</div>
    ${panel(L('الباقات المشتركة الآن','Active packages now'),hbars(Object.entries(byPlan).sort((a,b)=>b[1]-a[1]))+`<p class="mute sm">${L('الإيراد الشهري من الباقات','Monthly package revenue')}: <b class="num">${money(KM.mrr.f())}</b></p>`)}`}

// ---------- 3) operations ----------
function renderOps(){const P=range(per),Pp=prevOf(per,P),D=txDone(P),open=openTx();
  const funnel=REQ_ST.map(s=>[s,reqs(P).filter(r=>r.status===s).length]);
  const age=[[L('أقل من أسبوع','Under a week'),0],[L('1 إلى 2 أسبوع','1 to 2 weeks'),0],[L('2 إلى 4 أسابيع','2 to 4 weeks'),0],[L('أكثر من شهر','Over a month'),0]];
  open.forEach(t=>{const a=-(days(dOnly(t.startDate||t.created))||0);age[a<7?0:a<14?1:a<30?2:3][1]++});
  const bySvc={};D.forEach(t=>{const k=t.service||t.code||'—',o=bySvc[k]=bySvc[k]||{n:0,c:[],ot:[]};o.n++;const c=cycle(t);if(c!=null)o.c.push(c);const x=onTime(t);if(x!=null)o.ot.push(x)});
  $('v-kpio').innerHTML=head(L('العمليات والإنجاز','Operations'))+`<div class="kgrid">${group('ops',P,Pp)}</div>
    <div class="grid2">${panel(L('المعاملات المفتوحة والمنجزة: آخر 12 شهراً','Opened and completed: last 12 months'),cols([{v:monthly(P=>txNew(P).length)},{v:monthly(P=>txDone(P).length)}],[L('فُتحت','Opened'),L('أُنجزت','Completed')]))}
      ${panel(L('مسار الطلبات في الفترة','Request pipeline in the period'),hbars(funnel))}</div>
    <div class="grid2">${panel(L('المعاملات المفتوحة حسب الحالة','Open transactions by status'),hbars(STATUSES.filter(s=>!CLOSED.includes(s)).map(s=>[s,open.filter(t=>t.status===s).length]).filter(x=>x[1])))}
      ${panel(L('عمر المعاملات المفتوحة','Age of open transactions'),hbars(age.filter(a=>a[1])))}</div>
    ${panel(L('مدة الإنجاز والالتزام بالموعد حسب الخدمة','Turnaround and on-time by service'),`<div class="tbl">${table([L('الخدمة','Service'),L('منجزة','Completed'),L('متوسط المدة','Avg. turnaround'),L('في الموعد','On time')],Object.entries(bySvc).sort((a,b)=>b[1].n-a[1].n).slice(0,15).map(([k,o])=>`<tr><td>${esc(k)}</td><td class="num">${o.n}</td><td class="num">${show('days',avg(o.c))}</td><td>${o.ot.length?progBar(Math.round(o.ot.filter(Boolean).length/o.ot.length*100)):'—'}</td></tr>`))}</div>`)}
    ${panel(L('المتأخرة الآن','Overdue now'),lateTx().length?`<ul class="plain">${lateTx().sort((a,b)=>a.dueDate>b.dueDate?1:-1).slice(0,15).map(t=>`<li><a href="#" data-txn="${esc(t.id)}">${esc(t.id)}</a> · ${esc(t.service||t.code)} · ${link(t.clientId,cli(t.clientId).name)} · <span class="bad">${L(`متأخرة ${-days(t.dueDate)} يوم`,`${-days(t.dueDate)} days late`)}</span>${t.assignee?' · '+esc(staffName(t.assignee)):''}</li>`).join('')}</ul>`:`<p class="mute">${L('لا توجد معاملات متأخرة.','Nothing is overdue.')}</p>`)}`}

// ---------- 4) clients and satisfaction ----------
function renderCli(){const P=range(per),Pp=prevOf(per,P),nc=DB.Clients.filter(c=>inR(c.created,P));
  const by=(a,f)=>{const m={};a.forEach(x=>{const k=f(x)||L('غير محدد','Not set');m[k]=(m[k]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
  const R=revs(P),dist=[5,4,3,2,1].map(s=>['★'.repeat(s),R.filter(r=>+r.stars===s).length]);
  const renew=DB.Clients.filter(c=>{const d=days(c.planEnd);return d!==null&&d>=0&&d<=30}).sort((a,b)=>a.planEnd>b.planEnd?1:-1);
  const lost=DB.Clients.filter(c=>c.plan&&c.planEnd&&days(c.planEnd)<0&&days(c.planEnd)>=-60);
  $('v-kpic').innerHTML=head(L('العملاء والرضا','Clients and satisfaction'))+`<div class="kgrid">${group('cli',P,Pp)}</div>
    <div class="grid2">${panel(L('العملاء الجدد: آخر 12 شهراً','New clients: last 12 months'),cols([{v:monthly(P=>DB.Clients.filter(c=>inR(c.created,P)).length)}],[L('عملاء جدد','New clients')]))}
      ${panel(L('من أين يأتي العملاء الجدد','Where new clients come from'),hbars(by(nc,c=>c.source)))}</div>
    <div class="grid2">${panel(L('العملاء حسب النوع','Clients by type'),hbars(by(DB.Clients,c=>c.type)))}
      ${panel(L('توزيع تقييمات العملاء في الفترة','Client ratings in the period'),hbars(R.length?dist:[]))}</div>
    <div class="grid2">${panel(L('باقات تنتهي خلال 30 يوماً','Packages ending within 30 days'),renew.length?`<ul class="plain">${renew.map(c=>`<li>${link(c.id,c.name)} · ${esc(c.plan)} · <span class="num">${esc(c.planEnd)}</span></li>`).join('')}</ul>`:`<p class="mute">${L('لا يوجد.','None.')}</p>`)}
      ${panel(L('باقات انتهت ولم تُجدَّد (آخر 60 يوماً)','Packages ended, not renewed (last 60 days)'),lost.length?`<ul class="plain">${lost.map(c=>`<li>${link(c.id,c.name)} · ${esc(c.plan)} · <span class="num">${esc(c.planEnd)}</span></li>`).join('')}</ul>`:`<p class="mute">${L('لا يوجد.','None.')}</p>`)}</div>`}

// ---------- 5) team ----------
let rep=null,repKey='';
function renderTeam(){const P=range(per),Pp=prevOf(per,P),key=P.join('|'),items=workItems();
  if(REMOTE&&repKey!==key){repKey=key;rep=null;S.api('report',{from:P[0]==='0000-00-00'?'2000-01-01':P[0],to:P[1]==='9999-99-99'?iso():P[1]}).then(j=>{rep=j;if(tab==='kpit')renderTeam()}).catch(()=>{rep={staff:[]}})}
  const att=u=>((rep&&rep.staff)||[]).find(s=>s.username===u);
  const rows=(DB.Staff||[]).map(x=>{const mine=DB.Transactions.filter(t=>t.assignee===x.username),d=mine.filter(t=>t.status==='منجزة'&&inR(t.closed||t.updated,P)),ot=d.map(onTime).filter(v=>v!==null);
    const w=items.filter(i=>i.assignee===x.username),o=w.filter(i=>!i.closed),a=att(x.username),col=sum(DB.Payments.filter(p=>p.by===x.username&&inR(p.date,P)),p=>p.amount);
    const ev=(DB.Evals||[]).filter(v=>v.username===x.username).sort((p,q)=>p.created<q.created?1:-1)[0];
    return {x,done:d.length,ot:ot.length?Math.round(ot.filter(Boolean).length/ot.length*100):null,cyc:avg(d.map(cycle).filter(v=>v!=null)),open:o.length,late:o.filter(isLate).length,col,hrs:a?a.minutes/60:null,lateDays:a?a.late:null,acts:a?a.actions:null,ev:ev?+ev.total:null}});
  $('v-kpit').innerHTML=head(L('أداء الفريق','Team performance'),REMOTE?'':L('الحضور وساعات العمل تظهر بعد تشغيل الخادم.','Attendance and hours show once the server is running.'))+`<div class="kgrid">${group('team',P,Pp)}</div>
    ${panel(L('بطاقة أداء كل موظف','Scorecard per employee'),`<div class="tbl">${table([L('الموظف','Employee'),L('أنجز','Completed'),L('في الموعد','On time'),L('متوسط المدة','Avg. turnaround'),L('مفتوحة','Open'),L('متأخرة','Overdue'),L('تحصيل','Collected'),L('ساعات العمل','Hours worked'),L('أيام تأخر','Late days'),L('إجراءات','Actions'),L('آخر تقييم','Last evaluation')],rows.map(r=>`<tr><td><b>${esc(r.x.name||r.x.username)}</b>${r.x.jobTitle?`<br><small class="mute">${esc(r.x.jobTitle)}</small>`:''}</td><td class="num">${r.done}</td><td>${r.ot==null?'—':progBar(r.ot)}</td><td class="num">${show('days',r.cyc)}</td><td class="num">${r.open}</td><td class="num ${r.late?'bad':''}">${r.late}</td><td class="num">${money(r.col)}</td><td class="num">${r.hrs==null?(REMOTE&&!rep?'…':'—'):r1(r.hrs)}</td><td class="num ${r.lateDays?'bad':''}">${r.lateDays==null?'—':r.lateDays}</td><td class="num">${r.acts==null?'—':r.acts}</td><td>${r.ev==null||isNaN(r.ev)?'—':progBar(r.ev)}</td></tr>`))}</div>`)}
    <div class="grid2">${panel(L('المعاملات المنجزة لكل موظف','Completed per employee'),hbars(rows.filter(r=>r.done).map(r=>[r.x.name||r.x.username,r.done]).sort((a,b)=>b[1]-a[1])))}
      ${panel(L('حجم العمل المفتوح لكل موظف','Open workload per employee'),hbars(rows.filter(r=>r.open).map(r=>[r.x.name||r.x.username,r.open]).sort((a,b)=>b[1]-a[1])))}</div>`}

// ---------- 6) targets ----------
function renderGoals(){const P=range('month');
  $('v-kpig').innerHTML=`<div class="bar"><h2>${L('الأهداف الشهرية','Monthly targets')} <span class="num">${year()}</span></h2><span class="sp"></span><button type="button" class="btn sm pri" id="kgSave">${L('حفظ الأهداف','Save targets')}</button></div>
    <p class="mute sm">${L('اكتب هدف كل شهر. المؤشرات التي تُجمع (مثل الإيراد وعدد المعاملات) يُحسب هدفها للفترة المختارة تلقائياً حسب عدد أيامها، والنِّسب تبقى كما هي. الأرقام المكتوبة بخط خفيف أهداف مقترحة حسب الممارسات المهنية حتى تغيّرها. اترك الخانة فارغة لإلغاء الهدف المحفوظ.','Type the target for one month. Indicators that add up (revenue, number of transactions) are scaled to the chosen period by its number of days; rates stay as they are. Light figures are suggested professional targets until you change them. Clear a box to remove a saved target.')}</p>
    ${Object.entries(G).map(([g,n])=>panel(n,`<div class="tbl">${table([L('المؤشر','Indicator'),L('الهدف الشهري','Monthly target'),L('هذا الشهر حتى الآن','This month so far'),L('التحقيق','Achieved')],K.filter(x=>x.g===g).map(x=>{const v=x.snap?x.f():x.f(P),t=target(x,P),r=tRow(x.k);
      const ach=t!=null&&v!=null?Math.round(x.dir>0?(t?v/t*100:100):(v?t/v*100:100)):null;
      return `<tr><td>${esc(x.n)}<br><small class="mute">${esc(x.h||'')}</small></td><td><input type="number" step="any" min="0" data-kt="${x.k}" value="${r?esc(r.amount):''}" placeholder="${x.def!=null?x.def:''}" aria-label="${esc(x.n)}"> <small class="mute">${{money:L('ر.ق','QAR'),pct:'%',days:L('يوم','days'),hrs:L('ساعة','h'),stars:'/ 5',n:''}[x.u]}${x.dir<0?' · '+L('الأقل أفضل','lower is better'):''}</small></td><td class="num ${state(x,v,t)}">${show(x.u,v)}</td><td>${ach==null?'—':progBar(Math.min(ach,999))}</td></tr>`}))}</div>`)).join('')}`}
async function saveGoals(){let n=0;try{for(const i of document.querySelectorAll('#v-kpig [data-kt]')){const k=i.dataset.kt,r=tRow(k),v=i.value.trim();
    if(v===''){if(r){await S.del('Budget',r.id);DB.Budget=DB.Budget.filter(b=>b.id!==r.id);n++}continue}
    if(!r||+r.amount!==+v){await saveRow('Budget',Object.assign({},r||{year:year(),code:'KPI.'+k},{amount:+v}));n++}}
    toast(n?L('حُفظت الأهداف','Targets saved'):L('لا تغييرات','No changes'));renderGoals()}catch(e){toast(errText(e.message))}}

// ---------- csv ----------
function csv(){const P=range(per),Pp=prevOf(per,P),q=s=>`"${String(s==null?'':s).replace(/"/g,'""')}"`;
  const lines=[[L('المجموعة','Group'),L('المؤشر','Indicator'),L('القيمة','Value'),L('الفترة السابقة','Previous period'),L('الهدف','Target'),L('الحالة','Status')].map(q).join(',')];
  K.forEach(x=>{const v=x.snap?x.f():x.f(P),p=!x.snap&&Pp?x.f(Pp):null,t=target(x,P),s=state(x,v,t);lines.push([G[x.g],x.n,v==null?'':r1(v),p==null?'':r1(p),t==null?'':r1(t),{good:L('على الهدف','On target'),warn:L('قريب','Close'),bad:L('بعيد','Off target')}[s]||''].map(q).join(','))});
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['﻿'+lines.join('\n')],{type:'text/csv'}));a.download=`kpi-${P[0]}-${P[1]}.csv`.replace(/0000-00-00-9999-99-99/,'all');a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}

// ---------- wiring ----------
const R={kpi:renderScore,kpis:renderSales,kpio:renderOps,kpic:renderCli,kpit:renderTeam,kpig:renderGoals};
Object.entries(R).forEach(([t,f])=>VIEWS[t]=()=>{if(!isAdmin())return;try{f()}catch(e){$('v-'+t).innerHTML=`<div class="empty">${esc(L('تعذر حساب المؤشرات: ','Could not compute the indicators: ')+e.message)}</div>`}});
document.addEventListener('change',e=>{const s=e.target.closest('.kpiP');if(s){per=s.value;VIEWS[tab]()}});
document.addEventListener('click',e=>{if(e.target.closest('.kpiPrint'))window.print();else if(e.target.closest('#kpiCsv'))csv();else if(e.target.closest('#kgSave')){e.target.disabled=true;saveGoals()}});
})();
