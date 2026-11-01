'use strict';
// «خبر»: صفحة حساب العميل. الدخول بحساب من data/users.json، ثم خلاصة شخصية للدوائر التي يتابعها العميل ومحفوظاته.
(function(){
const CFG=window.KHABAR_CONFIG||{},AUTH=window.KhabarAuth;
const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const ZONES=[['qatar','قطر','var(--dawn)'],['gulf','الخليج','var(--sea)'],['egypt','مصر','var(--nile)'],['world','العالم','var(--ink)']];
const MONTHS=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const fmtDay=iso=>{const [y,m,d]=String(iso).slice(0,10).split('-').map(Number);return d?`${d} ${MONTHS[m-1]} ${y}`:'—'};
const fmtTime=iso=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)).map(x=>[x.type,x.value]));const h=+p.hour;return `${h%12||12}:${p.minute} ${h<12?'صباحاً':'مساءً'}`};
const KEY='khabar-client',DAYS30=30*864e5;
let DB=null,BRIEF=null,ME=null;

function session(){const s=AUTH.session.get(KEY)||AUTH.local.get(KEY);return s&&s.exp>Date.now()?s:null}
async function boot(){
  try{DB=await AUTH.load('../');BRIEF=await fetch('../data/brief.json?t='+Date.now(),{cache:'no-store'}).then(r=>r.json())}
  catch(e){const m=$('#login-err');m.textContent='تعذّر تحميل البيانات. تحقق من الاتصال ثم أعد تحميل الصفحة.';m.hidden=false;return}
  const c=$('#contact');const a=el('a',null,CFG.PHONE);a.href='https://wa.me/'+CFG.WHATSAPP;a.dir='ltr';const b=el('a',null,CFG.EMAIL);b.href='mailto:'+CFG.EMAIL;c.append(a,' · ',b);
  const s=session(),rec=s&&DB.users.find(x=>x.u===s.u&&x.active!==false);
  if(rec)open(rec);else{AUTH.local.del(KEY);AUTH.session.del(KEY)}
}
$('#login-form').onsubmit=async e=>{
  e.preventDefault();const btn=e.submitter||$('#login-form button'),err=$('#login-err');btn.disabled=true;err.hidden=true;
  try{
    const rec=DB&&await AUTH.verify(DB,$('#u').value,$('#p').value);
    if(!rec){err.textContent='اسم المستخدم أو كلمة المرور غير صحيحة، أو الحساب غير مفعّل.';err.hidden=false;return}
    const s={u:rec.u,exp:Date.now()+DAYS30};if($('#keep').checked)AUTH.local.set(KEY,s);else{s.exp=Date.now()+DAYS30;AUTH.session.set(KEY,s)}
    $('#p').value='';open(rec);
  }finally{btn.disabled=false}
};
$('#logout').onclick=()=>{AUTH.local.del(KEY);AUTH.session.del(KEY);location.reload()};
$('#print').onclick=()=>window.print();

const follows=()=>AUTH.local.get('khabar-follow:'+ME.u)||ZONES.map(z=>z[0]);
function open(rec){
  ME=rec;$('#login-form').hidden=true;$('#app').hidden=false;$('#logout').hidden=false;
  $('#who').textContent=rec.u;$('#role').textContent=(AUTH.ROLES[rec.role]||{}).ar||rec.role;$('#hello').textContent='أهلاً بك، '+(rec.name||rec.u);
  $('#admin-link').hidden=rec.role!=='super';
  const sv=(()=>{try{return Object.keys(JSON.parse(localStorage.getItem('khabar-saved'))||{}).length}catch(e){return 0}})();
  const m=$('#meta');m.textContent='';
  [[fmtDay(rec.created),'عضو منذ'],[`${BRIEF.edition==='am'?'الصباح':'المساء'} · ${fmtDay(BRIEF.date)}`,'آخر خلاصة'],[String(sv),'خبراً محفوظاً']].forEach(([v,l])=>{const d=el('div');d.append(el('small',null,l),el('b',null,v));m.append(d)});
  renderFollow();renderMine();renderSaved();
}
function renderFollow(){
  const box=$('#follow');box.textContent='';const f=new Set(follows());
  ZONES.forEach(([id,name])=>{const b=el('button','chip',name);b.type='button';b.setAttribute('aria-pressed',f.has(id));
    b.onclick=()=>{f.has(id)?f.delete(id):f.add(id);if(!f.size){f.add(id);return}AUTH.local.set('khabar-follow:'+ME.u,[...f]);renderFollow();renderMine()};box.append(b)});
}
function srcLine(ids){const p=el('p','src');p.append(el('span','lbl','المصدر:'));(ids||[]).forEach(id=>{const s=BRIEF.sources[id];if(!s)return;const a=el('a',null,`${s.ar} · ${fmtDay(s.date)}`);a.href=s.url;a.target='_blank';a.rel='noopener';p.append(a)});return p}
function renderMine(){
  const box=$('#mine');box.textContent='';const f=new Set(follows());
  $('#mine-title').textContent=`خلاصتي · ${BRIEF.edition==='am'?'خلاصة الصباح':'خلاصة المساء'} ${fmtDay(BRIEF.date)}، ${fmtTime(BRIEF.published)}`;
  if(BRIEF.auto)box.append(el('p','auto-note','خلاصة آلية: عناوين المصادر كما نشرتها مع روابطها الأصلية، ويُضاف التحليل حين تصدر الخلاصة التحريرية.'));
  let n=0;
  ZONES.filter(z=>f.has(z[0])).forEach(([id,name,c])=>{
    const z=BRIEF.zones.find(x=>x.id===id);if(!z)return;const items=z.items.filter(i=>i.ar);if(!items.length)return;
    box.append(el('h3',null,name));const ul=el('ul','items');
    items.forEach(it=>{const li=el('li','item');li.style.setProperty('--zc',c);li.append(el('span','cat',it.cat.ar),el('p',null,it.ar),srcLine(it.src));ul.append(li);n++});box.append(ul);
  });
  if(!n)box.append(el('p','empty','لا أخبار في دوائرك في هذه الخلاصة.'));
}
function renderSaved(){
  const box=$('#saved');box.textContent='';let s={};try{s=JSON.parse(localStorage.getItem('khabar-saved'))||{}}catch(e){}
  const list=Object.values(s);if(!list.length){box.append(el('p','empty','لم تحفظ أخباراً بعد. اضغط «احفظ» تحت أي خبر في الخلاصة.'));return}
  const ul=el('ul','items');list.forEach(x=>{const li=el('li','item');li.append(el('p',null,x.it.ar||x.it.en));const p=el('p','src');p.append(el('span','lbl','المصدر:'));
    Object.values(x.sources||{}).forEach(v=>{if(!v)return;const a=el('a',null,`${v.ar} · ${fmtDay(v.date)}`);a.href=v.url;a.target='_blank';a.rel='noopener';p.append(a)});li.append(p);ul.append(li)});box.append(ul);
}
boot();
})();
