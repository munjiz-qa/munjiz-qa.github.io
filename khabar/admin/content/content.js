'use strict';
// «عبدو نيوز»: شاشة إدارة المحتوى للمدير الشامل.
// تضيف وتعدّل وتحذف وترتّب وتخفي: أخبار كل خلاصة (الحالية والمؤرشفة)، والتحليل والقراءة الفنية والاستقراء، ومؤشرات الأسواق،
// وخريطة الطريق، وسجل المصادر، وأقسام الموقع وترتيبها، والتقارير الخاصة، ومقالات الرأي، وسجل التصحيحات.
// الحفظ دائم: كل نشر إيداع واحد في مستودع الموقع على GitHub (Git Data API)، ثم تفحصه بوابة الخادم khabar/scripts/cms_gate.py
// وتلغيه إن خالف قاعدة المصدرين أو دليل الأسلوب. ولا يُكتب شيء في متصفح المدير سوى مفتاح الجلسة.
(function(){
const CFG=window.KHABAR_CONFIG||{},AUTH=window.KhabarAuth,R=window.KR;
const REPO=CFG.REPO||'munjiz-qa/munjiz-qa.github.io',BR=CFG.BRANCH||'main',D='khabar/data/';
const SITE=(CFG.SITE||'https://munjiz-qa.github.io/abdo-news/').replace(/\/?$/,'/');
const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const btn=(t,c,f,title)=>{const b=el('button',c||'btn',t);b.type='button';if(title){b.title=title;b.setAttribute('aria-label',title)}if(f)b.onclick=f;return b};
const brow=(...k)=>{const d=el('div','btns');d.append(...k);return d};
const clone=o=>JSON.parse(JSON.stringify(o));
const S={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}},del(k){try{sessionStorage.removeItem(k)}catch(e){}}};
function toast(m){const n=$('#toast');n.textContent=m;n.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>n.hidden=true,2600)}
const say=(node,t,kind)=>{node.textContent=t;node.className='msg '+(kind||'ok');node.hidden=!t};
const ZN={qatar:'قطر',gulf:'الخليج',egypt:'مصر',world:'العالم'},ZC={qatar:'#8A1538',gulf:'#1D7A70',egypt:'#3A5FB0',world:'#14212E'};
const EDN={am:'الصباح',md:'الظهيرة',pm:'المساء',nt:'الليل'};
const fmtD=iso=>{const d=new Date(iso);return isNaN(d)?(iso||'—'):d.toLocaleString('ar-QA',{timeZone:'Asia/Qatar',numberingSystem:'latn',day:'numeric',month:'long',year:'numeric',hour:'numeric',minute:'2-digit'})};
const fmtDay=d=>{if(!d)return '—';const x=new Date(d+'T12:00:00+03:00');return isNaN(x)?d:x.toLocaleDateString('ar-QA',{timeZone:'Asia/Qatar',numberingSystem:'latn',day:'numeric',month:'long',year:'numeric'})};
const nAr=(n,f)=>n===0?f[4]||('لا '+f[0]):n===1?f[0]:n===2?f[1]:n<=10?n+' '+f[2]:n+' '+f[3];
const NITEMS=['خبر واحد','خبران','أخبار','خبراً','لا أخبار'],NCH=['تعديل واحد','تعديلان','تعديلات','تعديلاً','لا تعديلات'];

/* ---------- GitHub ---------- */
let TOK='';
async function gh(path,opt){
  opt=opt||{};const r=await fetch('https://api.github.com/repos/'+REPO+'/'+path,{method:opt.method||'GET',cache:'no-store',headers:{Authorization:'Bearer '+TOK,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},body:opt.body?JSON.stringify(opt.body):undefined});
  if(opt.allow404&&r.status===404)return null;
  if(!r.ok){const e=new Error(r.status===401?'مفتاح النشر غير صالح أو منتهي الصلاحية.':r.status===403?'المفتاح لا يملك صلاحية Contents: Read and write على المستودع، أو بلغ حد الطلبات.':r.status===404?'المفتاح لا يصل إلى المستودع أو الملف غير موجود.':r.status===409||r.status===422?'تغيّر المستودع أثناء النشر.':'رفض GitHub الطلب ('+r.status+').');e.status=r.status;throw e}
  return r.status===204?null:r.json();
}
const b64dec=c=>new TextDecoder().decode(Uint8Array.from(atob(c.replace(/\n/g,'')),ch=>ch.charCodeAt(0)));
const ser=o=>JSON.stringify(o,null,1)+'\n';
// قراءة أي ملف نصاً كما هو (للمحرر البرمجي)، أو بصمته فقط إن كان ملفاً ثنائياً
async function readRaw(p,ref,binary){
  const j=await gh('contents/'+p.split('/').map(encodeURIComponent).join('/')+'?ref='+(ref||BR),{allow404:true});if(!j)return null;
  if(binary||Array.isArray(j))return {sha:j.sha,size:j.size,text:null};
  let c=j.content;if(!c){const b=await gh('git/blobs/'+j.sha);c=b.content}
  return {sha:j.sha,size:j.size,text:b64dec(c)};
}
async function readFile(p,ref){
  const j=await gh('contents/'+p.split('/').map(encodeURIComponent).join('/')+'?ref='+(ref||BR),{allow404:true});if(!j)return null;
  let txt;if(j.content)txt=b64dec(j.content);else{const b=await gh('git/blobs/'+j.sha);txt=b64dec(b.content)}
  return {sha:j.sha,data:JSON.parse(txt)};
}
// إيداع واحد لعدة ملفات. كل تغيير: {path, data (أو null للحذف), base (بصمة الملف عند التحميل، أو null لملف جديد)}
async function commit(changes,message,onConflict){
  for(let attempt=0;attempt<3;attempt++){
    const ref=await gh('git/ref/heads/'+BR),head=ref.object.sha,hc=await gh('git/commits/'+head);
    let list=[];
    for(const c of changes){
      const cur=await gh('contents/'+c.path.split('/').map(encodeURIComponent).join('/')+'?ref='+head,{allow404:true});
      const curSha=cur?cur.sha:null;
      if(c.base!==undefined&&curSha!==c.base){
        const keep=onConflict?await onConflict(c,cur):false;
        if(keep==='skip')continue;
        const e=new Error(`تغيّر الملف ${c.path.replace('khabar/','')} على الموقع منذ فتحته (ربما صدرت خلاصة جديدة). أعد تحميل الصفحة ثم أعد التعديل.`);e.conflict=c.path;throw e;
      }
      if(c.data===null&&!c.blob&&!curSha)continue;
      list.push(c);
    }
    if(!list.length)return null;
    const tree=await gh('git/trees',{method:'POST',body:{base_tree:hc.tree.sha,tree:list.map(c=>c.blob?{path:c.path,mode:c.mode||'100644',type:'blob',sha:c.blob}:c.data===null?{path:c.path,mode:'100644',type:'blob',sha:null}:{path:c.path,mode:c.mode||'100644',type:'blob',content:typeof c.data==='string'?c.data:ser(c.data)})}});
    const cm=await gh('git/commits',{method:'POST',body:{message,tree:tree.sha,parents:[head]}});
    try{await gh('git/refs/heads/'+BR,{method:'PATCH',body:{sha:cm.sha,force:false}});return {sha:cm.sha,paths:list.map(c=>c.path)}}
    catch(e){if(e.status===422&&attempt<2)continue;throw e}
  }
}

/* ---------- الحالة ---------- */
let ME=null,USERS=null,F={},LOG=[],TAB='brief',ED=null,ARCH=null,CUR_ID=null,STATUS=null;
const file=p=>F[p];
async function load(p,ref){const r=await readFile(p,ref);F[p]={sha:r?r.sha:null,data:r?r.data:null,orig:r?JSON.stringify(r.data):null,del:false};return F[p]}
const dirty=()=>Object.keys(F).filter(p=>{const f=F[p];if(f.local)return false;if(f.del)return !!f.sha;if(f.raw)return !!f.blob||(f.text!=null&&f.text!==f.orig);return f.data!=null&&JSON.stringify(f.data)!==f.orig});
function change(desc){LOG.push(desc);bar();render()}
function bar(){
  const d=dirty(),pb=$('#pubbar');pb.hidden=!d.length&&!LOG.length;document.body.classList.toggle('has-bar',!!d.length);
  $('#pub-n').textContent=d.length?nAr(LOG.length||d.length,NCH)+' في المسودة':'';
  $('#pub-state').textContent=d.length?'لم تُنشر بعد. لا يراها الزوار حتى تضغط «نشر على الموقع».':'';
  const ol=$('#pub-list');ol.textContent='';LOG.forEach(x=>ol.append(el('li',null,x)));
  if(!d.length){pb.hidden=true;LOG=[]}
}
addEventListener('beforeunload',e=>{if(dirty().length){e.preventDefault();e.returnValue=''}});

/* ---------- الدخول ---------- */
async function boot(){
  try{const r=await fetch('../../data/users.json?t='+Date.now(),{cache:'no-store'});USERS=await r.json()}
  catch(e){say($('#login-err'),'تعذّر تحميل بيانات الحسابات. أعد تحميل الصفحة.','err');return}
  const su=S.get('khabar-admin-user'),rec=su&&USERS.users.find(x=>x.u===su&&x.role==='super'&&x.active!==false);
  if(rec){ME=rec;afterLogin()}
}
$('#login-form').onsubmit=async e=>{
  e.preventDefault();const b=$('#login-form button');b.disabled=true;
  try{const rec=await AUTH.verify(USERS,$('#u').value,$('#p').value);
    if(rec&&rec.role==='super'){S.set('khabar-admin-user',rec.u);ME=rec;afterLogin();return}
    say($('#login-err'),rec?'هذا حساب عميل. إدارة المحتوى للمدير الشامل وحده.':'اسم المستخدم أو كلمة المرور غير صحيحة.','err');
  }finally{b.disabled=false}
};
$('#logout').onclick=()=>{if(dirty().length&&!confirm('لديك تعديلات لم تُنشر. الخروج يتجاهلها. هل تريد الخروج؟'))return;F={};S.del('khabar-admin-user');S.del('khabar-token');location.reload()};
function afterLogin(){
  $('#login-form').hidden=true;$('#logout').hidden=false;$('#to-admin').hidden=false;$('#who').textContent=(ME.name||ME.u)+' · مدير شامل';
  const t=S.get('khabar-token');if(t){TOK=t;start()}else{$('#token-form').hidden=false;$('#tok').focus()}
}
$('#token-form').onsubmit=async e=>{e.preventDefault();TOK=$('#tok').value.trim();const b=$('#token-form button');b.disabled=true;
  try{await gh('contents/khabar/data/admin.json?ref='+BR);S.set('khabar-token',TOK);$('#token-form').hidden=true;start()}
  catch(x){say($('#tok-err'),x.message,'err')}finally{b.disabled=false}};

async function start(){
  $('#app').hidden=false;$('#view').textContent='';$('#view').append(el('p','mute','جارٍ تحميل المحتوى من المستودع…'));
  try{
    await Promise.all([load(D+'brief.json'),load(D+'admin.json'),load(D+'archive/index.json')]);
    ARCH=F[D+'archive/index.json'].data;CUR_ID=F[D+'brief.json'].data.id;
    readFile(D+'cms-status.json').then(r=>{STATUS=r&&r.data;gateLine()}).catch(()=>{});
    await openEdition(CUR_ID);
  }catch(e){$('#view').textContent='';const m=el('p','msg err',e.message);$('#view').append(m);if(e.status===401){S.del('khabar-token');$('#token-form').hidden=false}return}
  tabs();render();
}
function gateLine(extra){
  const g=$('#gate-line');
  if(extra){g.textContent=extra.t;g.className='msg statusline '+(extra.k||'info');g.hidden=false;return}
  if(!STATUS){g.hidden=true;return}
  g.className='msg statusline '+(STATUS.ok?'ok':'err');g.hidden=false;
  g.textContent=STATUS.ok?`آخر فحص على الخادم: سليم (${fmtD(STATUS.checked)}). كل ما نُشر من هذه الشاشة استوفى قاعدة المصدرين ودليل الأسلوب.`:
    `آخر نشر من هذه الشاشة أُلغي على الخادم (${fmtD(STATUS.checked)}): ${(STATUS.errors||[]).slice(0,3).map(x=>x.where+': '+x.msg).join(' · ')}`;
}

/* ---------- التبويبات ---------- */
const TABS=[['brief','الخلاصات والأخبار'],['site','أقسام الموقع'],['special','التقارير الخاصة'],['opinion','مقالات الرأي'],['corr','التصحيحات'],['code','الملفات والبرمجة'],['hist','سجل التعديلات']];
function tabs(){const n=$('#tabs');n.textContent='';TABS.forEach(([id,t])=>{const b=btn(t,'',async()=>{TAB=id;tabs();await ensure();render();scrollTo({top:0})});b.setAttribute('role','tab');b.setAttribute('aria-selected',String(TAB===id));n.append(b)})}
async function ensure(){
  try{
    if(TAB==='special'&&!F[D+'special/index.json'])await load(D+'special/index.json');
    if(TAB==='opinion'&&!F[D+'opinion.json'])await load(D+'opinion.json');
    if(TAB==='corr'&&!F[D+'corrections.json'])await load(D+'corrections.json');
    if(TAB==='site'&&!F[D+'desks-meta'])F[D+'desks-meta']={sha:null,data:null,orig:null,local:true,meta:await fetch('../../data/desks.json',{cache:'no-cache'}).then(r=>r.json()).then(j=>j.meta).catch(()=>[])};
  }catch(e){toast(e.message)}
}
function render(){
  const v=$('#view');if(!v)return;const y=scrollY;v.textContent='';
  ({brief:viewBrief,site:viewSite,special:viewSpecial,opinion:viewOpinion,corr:viewCorr,code:viewCode,hist:viewHist})[TAB](v);
  requestAnimationFrame(()=>scrollTo({top:y}));
}

/* ---------- محرر القوائم: ترتيب بالسحب أو بالأسهم، تعديل، إخفاء، حذف ---------- */
function list(o){
  const ul=el('ul','list');
  if(!o.items.length)ul.append(el('li','empty',o.empty||'لا عناصر بعد.'));
  let drag=null;
  o.items.forEach((x,i)=>{
    const li=el('li','row'+(o.hidden&&o.hidden(x,i)?' is-hidden':''));li.dataset.i=i;
    const g=el('span','grip','⋮⋮');g.title='اسحب لتغيير الترتيب';g.setAttribute('aria-hidden','true');
    if(o.move){li.draggable=true;
      li.addEventListener('dragstart',e=>{drag=i;li.classList.add('dragging');e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',String(i))}catch(_){}});
      li.addEventListener('dragend',()=>li.classList.remove('dragging'));
      li.addEventListener('dragover',e=>{if(drag==null)return;e.preventDefault();li.classList.add('over')});
      li.addEventListener('dragleave',()=>li.classList.remove('over'));
      li.addEventListener('drop',e=>{e.preventDefault();li.classList.remove('over');if(drag!=null&&drag!==i)o.move(drag,i);drag=null});}
    const m=el('div','row-main');const tl=el('b');(o.tags?o.tags(x,i):[]).forEach(t=>tl.append(el('span','tag'+(t[1]?' '+t[1]:''),t[0])));tl.append(o.title(x,i));m.append(tl);
    const meta=o.meta&&o.meta(x,i);if(meta)m.append(el('small',null,meta));
    const a=el('div','row-acts');
    if(o.move){const up=btn('↑','ib',()=>o.move(i,i-1),'نقل إلى أعلى');up.disabled=i===0;const dn=btn('↓','ib',()=>o.move(i,i+1),'نقل إلى أسفل');dn.disabled=i===o.items.length-1;a.append(up,dn)}
    if(o.edit)a.append(btn('تعديل','ib',()=>o.edit(i)));
    if(o.extra)o.extra(x,i).forEach(b=>a.append(b));
    if(o.hide)a.append(btn(o.hidden(x,i)?'إظهار':'إخفاء','ib',()=>o.hide(i)));
    if(o.del)a.append(btn('حذف','ib del',()=>o.del(i)));
    li.append(g,m,a);ul.append(li);
  });
  const w=el('div');w.style.cssText='display:grid;gap:10px';w.append(ul);
  if(o.add){const b=btn('+ '+(o.addLabel||'إضافة'),'btn ghost sm',o.add);w.append(brow(b))}
  return w;
}
const moveIn=(arr,a,b)=>{if(b<0||b>=arr.length)return false;const [x]=arr.splice(a,1);arr.splice(b,0,x);return true};

/* ---------- نموذج التعديل ---------- */
const getK=(o,k)=>k.split('.').reduce((a,p)=>a==null?a:a[p],o);
function setK(o,k,v){const ps=k.split('.');let a=o;ps.slice(0,-1).forEach(p=>{if(a[p]==null||typeof a[p]!=='object')a[p]={};a=a[p]});a[ps[ps.length-1]]=v}
function newSrcId(url){const o=R.outlet(url).split('.')[0].replace(/[^a-z0-9]/gi,'').slice(0,8)||'src';return o+'-'+Date.now().toString(36).slice(-5)}
// fields: {k,label,type:text|textarea|select|date|sources|lines|paras|check,dir,opts,rows,help,ph,max}
function form(o){
  const dlg=$('#dlg'),body=$('#dlg-body');$('#dlg-title').textContent=o.title;body.textContent='';
  const v=clone(o.value||{}),reg=o.sources?Object.assign({},o.sources):null,added={};
  const checks=()=>{const ul=$('#dlg-checks');ul.textContent='';const r=o.validate?o.validate(v,reg):[];
    const err=r.filter(x=>x.lvl==='error');r.forEach(x=>ul.append(el('li',x.lvl,x.where+': '+x.msg)));
    if(!r.length)ul.append(el('li',null,'يستوفي قواعد النشر.'));$('#dlg-save').disabled=!!err.length;return err};
  const grid=el('div','row2');let lastHalf=null;
  o.fields.forEach(f=>{
    if(f.when&&!f.when(v))return;
    const wrap=el('div','field');const id='f-'+f.k.replace(/\W/g,'_');
    if(f.type==='sources'){wrap.append(el('span','lbl',f.label||'المصادر'),srcField(v,f.k,reg,added,checks));body.append(wrap);return}
    if(f.type==='check'){const l=el('label','switch');const c=el('input');c.type='checkbox';c.id=id;c.checked=!!getK(v,f.k);c.onchange=()=>{setK(v,f.k,c.checked);checks()};l.append(c,f.label);body.append(l);return}
    const lab=el('label',null,f.label);lab.htmlFor=id;wrap.append(lab);
    let inp;
    if(f.type==='textarea'||f.type==='lines'||f.type==='paras'){inp=el('textarea');inp.rows=f.rows||4}
    else if(f.type==='select'){inp=el('select');(f.opts||[]).forEach(([val,t])=>{const op=el('option',null,t);op.value=val;inp.append(op)})}
    else{inp=el('input');inp.type=f.type==='date'?'date':f.type==='url'?'url':'text';if(f.list){const dl=el('datalist');dl.id=id+'-dl';f.list.forEach(x=>{const op=el('option');op.value=x;dl.append(op)});wrap.append(dl);inp.setAttribute('list',dl.id)}}
    inp.id=id;if(f.dir)inp.dir=f.dir;if(f.ph)inp.placeholder=f.ph;if(f.max)inp.maxLength=f.max;
    const cur=getK(v,f.k);
    inp.value=f.type==='lines'?(cur||[]).join('\n'):f.type==='paras'?(cur||[]).join('\n\n'):(cur==null?'':cur);
    inp.addEventListener('input',()=>{let x=inp.value;
      if(f.type==='lines')x=x.split(/\s+/).map(s=>s.trim()).filter(Boolean);else if(f.type==='paras')x=x.split(/\n\s*\n/).map(s=>s.trim()).filter(Boolean);else if(!x.trim())x='';
      setK(v,f.k,x);checks();if(cnt)cnt.textContent=R.words(inp.value)+' كلمة'});
    wrap.append(inp);let cnt=null;
    if(f.count){cnt=el('small',null,R.words(inp.value)+' كلمة');wrap.append(cnt)}
    if(f.help)wrap.append(el('small',null,f.help));
    if(f.half){if(!lastHalf){lastHalf=el('div','row2');body.append(lastHalf)}lastHalf.append(wrap);if(lastHalf.children.length===2)lastHalf=null}
    else{lastHalf=null;body.append(wrap)}
  });
  $('#dlg-save').onclick=()=>{if(checks().length)return;
    // تنظيف القيم: نصوص بلا فراغات زائدة
    (function trim(x){Object.keys(x).forEach(k=>{if(typeof x[k]==='string')x[k]=x[k].trim();else if(x[k]&&typeof x[k]==='object'&&!Array.isArray(x[k]))trim(x[k])})})(v);
    const used=new Set(o.fields.filter(f=>f.type==='sources').flatMap(f=>getK(v,f.k)||[]));const nw={};Object.keys(added).forEach(k=>{if(used.has(k))nw[k]=added[k]});
    dlg.close();o.save(v,nw)};
  checks();if(typeof dlg.showModal==='function')dlg.showModal();else dlg.setAttribute('open','');
  const first=body.querySelector('input,textarea,select');if(first)setTimeout(()=>first.focus(),30);
}
function srcField(v,k,reg,added,checks){
  const box=el('div','srcbox');const chips=el('div','chips'),info=el('small');
  const draw=()=>{chips.textContent='';const ids=getK(v,k)||[];
    ids.forEach((id,i)=>{const s=reg[id]||{};const c=el('span','chip-s');c.title=s.url||id;
      c.append(el('span',null,`${s.ar||id} · ${R.outlet(s.url||'')||'؟'} · ${s.date||'بلا تاريخ'}`));const x=btn('×','',()=>{ids.splice(i,1);setK(v,k,ids);draw();checks()},'إزالة المصدر');c.append(x);chips.append(c)});
    if(!ids.length)chips.append(el('span','mute','لم يُضف مصدر بعد.'));
    const outs=new Set(ids.filter(id=>reg[id]&&reg[id].url).map(id=>R.outlet(reg[id].url)));
    info.textContent='';info.append(el('span',outs.size>=2?'cnt-ok':'cnt-bad',nAr(outs.size,['جهة مستقلة واحدة','جهتان مستقلتان','جهات مستقلة','جهة مستقلة','لا جهة مستقلة'])),' من '+nAr(ids.length,['مصدر واحد','مصدرين','مصادر','مصدراً','دون مصادر']).replace(/^لا /,'')+'. القاعدة: جهتان مستقلتان على الأقل لكل خبر.')};
  // اختيار مصدر موجود
  const pick=el('div','field');const pl=el('label',null,'اختر مصدراً موجوداً');const inp=el('input');inp.placeholder='اكتب اسم الجهة أو النطاق…';const dl=el('datalist');dl.id='src-dl-'+k.replace(/\W/g,'_');
  const ent=Object.entries(reg).sort((a,b)=>String(b[1].date).localeCompare(String(a[1].date)));
  ent.forEach(([id,s])=>{const op=el('option');op.value=`${s.ar} · ${R.outlet(s.url||'')} · ${s.date} · ${id}`;dl.append(op)});inp.setAttribute('list',dl.id);
  const addPick=()=>{const m=inp.value.match(/· ([^·]+)$/);const id=m?m[1].trim():inp.value.trim();if(!reg[id]){toast('اختر مصدراً من القائمة');return}const ids=getK(v,k)||[];if(!ids.includes(id))ids.push(id);setK(v,k,ids);inp.value='';draw();checks()};
  inp.addEventListener('change',()=>{if(/· [^·]+$/.test(inp.value))addPick()});
  const pr=el('div','btns');pr.append(btn('أضف','btn ghost sm',addPick));pick.append(pl,inp,dl,pr);
  // مصدر جديد
  const nd=el('details');nd.append(el('summary',null,'+ مصدر جديد (الاسم والرابط الأصلي وتاريخ النشر)'));const g=el('div','newsrc');
  const mk=(ph,dir,full,type)=>{const i=el('input');i.placeholder=ph;if(dir)i.dir=dir;if(type)i.type=type;const f=el('div','field'+(full?' full':''));f.append(i);g.append(f);return i};
  const nar=mk('اسم الجهة بالعربية (مثل: وكالة الأنباء القطرية)'),nen=mk('Outlet name in English','ltr'),nurl=mk('https://… الرابط الأصلي للخبر','ltr',true,'url'),ndt=mk('','',false,'date');ndt.value=R.dohaToday();
  const err=el('p','msg err');err.hidden=true;
  const add=btn('أضف المصدر','btn sm',()=>{const s={ar:nar.value.trim(),en:nen.value.trim(),date:ndt.value,url:nurl.value.trim()};const p=R.source(s);
    if(p.length){say(err,p.join('، '),'err');return}err.hidden=true;
    const dup=Object.entries(reg).find(([,x])=>x.url===s.url);const id=dup?dup[0]:newSrcId(s.url);if(!dup){reg[id]=s;added[id]=s}
    const ids=getK(v,k)||[];if(!ids.includes(id))ids.push(id);setK(v,k,ids);nar.value=nen.value=nurl.value='';draw();checks();toast(dup?'المصدر موجود من قبل وأضيف':'أضيف المصدر')});
  const f2=el('div','field full');f2.append(add);g.append(f2);nd.append(g,err);
  box.append(chips,info,pick,nd);draw();return box;
}

/* ---------- الخلاصات ---------- */
const BP=D+'brief.json',AP=id=>D+'archive/'+id+'.json';
async function openEdition(id){
  if(!F[AP(id)])await load(AP(id));
  if(!F[AP(id)].data){if(id===CUR_ID){F[AP(id)].data=clone(F[BP].data)}else throw new Error('تعذّر تحميل الخلاصة '+id)}
  ED=id;
}
const B=()=>ED===CUR_ID?F[BP].data:F[AP(ED)].data;
// كل تعديل على الخلاصة الحالية يُكتب في brief.json ونسختها في الأرشيف معاً
function syncArchive(){if(ED===CUR_ID)F[AP(ED)].data=clone(F[BP].data)}
function bChange(desc){pruneSources(B());syncArchive();change(`${edName(ED)}: ${desc}`)}
const edName=id=>{const m=String(id).match(/^(\d{4}-\d{2}-\d{2})-(\w+)$/);return m?`خلاصة ${EDN[m[2]]||m[2]} ${fmtDay(m[1])}`:id};
function refsOf(b){const u=new Set();(b.zones||[]).forEach(z=>{(z.items||[]).forEach(i=>(i.src||[]).forEach(s=>u.add(s)));['analysis','technical'].forEach(k=>z[k]&&(z[k].src||[]).forEach(s=>u.add(s)));(z.outlook||[]).forEach(o=>(o.src||[]).forEach(s=>u.add(s)))});
  (b.markets||[]).forEach(m=>(m.src||[]).forEach(s=>u.add(s)));(b.roadmap||[]).forEach(r=>(r.src||[]).forEach(s=>u.add(s)));if(b.thread)(b.thread.src||[]).forEach(s=>u.add(s));return u}
function pruneSources(b){const u=refsOf(b);Object.keys(b.sources||{}).forEach(k=>{if(!u.has(k))delete b.sources[k]})}
const ADM=()=>F[D+'admin.json'].data;
function hiddenSet(){const a=ADM();a.hidden=a.hidden||[];return a.hidden}

const ITEM_FIELDS=(b,zoneId)=>{const cats=[...new Set((b.zones||[]).flatMap(z=>z.items.map(i=>i.cat&&i.cat.ar)).filter(Boolean))],catsEn=[...new Set((b.zones||[]).flatMap(z=>z.items.map(i=>i.cat&&i.cat.en)).filter(Boolean))];return [
  {k:'_zone',label:'الدائرة',type:'select',opts:(b.zones||[]).map(z=>[z.id,z.name.ar]),half:true},
  {k:'cat.ar',label:'التصنيف بالعربية',list:cats,ph:'سياسة، اقتصاد، رياضة…',half:true},
  {k:'cat.en',label:'التصنيف بالإنجليزية',dir:'ltr',list:catsEn,ph:'Politics, Economy…',half:true},
  {k:'_hidden',label:'إخفاء الخبر عن القرّاء (يبقى في الأرشيف)',type:'check'},
  {k:'h.ar',label:'العنوان بالعربية',help:'من 5 إلى 12 كلمة، بلا استفهام ولا تعجب ولا نقطة في آخره.',count:true,max:160},
  {k:'h.en',label:'العنوان بالإنجليزية',dir:'ltr',count:true,max:160},
  {k:'ar',label:'نص الخبر بالعربية',type:'textarea',rows:6,count:true,help:'المقدمة 35 كلمة على الأكثر (من، ماذا، متى، أين)، والخبر كله 110 كلمات على الأكثر. انظر دليل الأسلوب STYLE.md.'},
  {k:'en',label:'نص الخبر بالإنجليزية',type:'textarea',rows:5,dir:'ltr',count:true},
  {k:'src',label:'المصادر (جهتان مستقلتان على الأقل)',type:'sources'}]};
function editItem(zi,ii){
  const b=B(),z=b.zones[zi],isNew=ii==null,it=isNew?{id:'',cat:{ar:'',en:''},h:{ar:'',en:''},ar:'',en:'',src:[]}:z.items[ii];
  const hid=hiddenSet(),val=Object.assign(clone(it),{_zone:z.id,_hidden:!isNew&&hid.includes(it.id)});
  form({title:isNew?`خبر جديد في ${z.name.ar}`:'تعديل خبر',fields:ITEM_FIELDS(b,z.id),value:val,sources:b.sources,validate:(v,S)=>R.item(v,S,{auto:b.auto}),
    save:(v,nw)=>{Object.assign(b.sources,nw);const zone=v._zone,h=v._hidden;delete v._zone;delete v._hidden;
      if(!v.en)delete v.en;
      if(isNew){v.id=zone.charAt(0)+'c'+Date.now().toString(36).slice(-6);}
      const nz=b.zones.find(x=>x.id===zone);
      if(isNew)nz.items.unshift(v);else if(nz===z)z.items[ii]=v;else{z.items.splice(ii,1);nz.items.unshift(v)}
      const a=ADM();a.hidden=(a.hidden||[]).filter(x=>x!==v.id);if(h)a.hidden.push(v.id);
      bChange((isNew?'إضافة خبر':'تعديل خبر')+`: «${(v.h&&v.h.ar)||v.ar.slice(0,50)}»`+(nz!==z?` (نُقل إلى ${nz.name.ar})`:''))}});
}
function editBlock(title,obj,setter,o){
  const b=B();o=o||{};
  form({title,fields:[{k:'ar',label:'النص بالعربية',type:'textarea',rows:5,count:true},{k:'en',label:'النص بالإنجليزية',type:'textarea',rows:4,dir:'ltr',count:true},{k:'src',label:'المصادر',type:'sources'}],
    value:obj||{ar:'',en:'',src:[]},sources:b.sources,validate:(v,S)=>R.block(v,S,{need:o.need,min:o.min,rules:o.rules}),save:(v,nw)=>{Object.assign(b.sources,nw);setter(v.ar||v.en?v:null);bChange(title)}});
}
function viewBrief(v){
  const b=B();
  // اختيار الخلاصة
  const top=el('section','panel');top.append(el('h2',null,'الخلاصات والأخبار'),el('p','lead','عدّل الخلاصة الحالية أو أي خلاصة في الأرشيف: أضف خبراً أو عدّله أو احذفه أو أخفِه، ورتّب الأخبار بالسحب أو بالأسهم، وانقل الخبر بين الدوائر. ترتيب الدوائر ثابت بقاعدة الموقع: قطر ثم الخليج ثم مصر ثم العالم.'));
  const f=el('div','field');const lab=el('label',null,'الخلاصة');lab.htmlFor='ed-sel';const sel=el('select');sel.id='ed-sel';
  (ARCH.briefs||[]).slice(0,120).forEach(x=>{const op=el('option',null,edName(x.id)+(x.id===CUR_ID?' (المنشورة الآن)':''));op.value=x.id;op.selected=x.id===ED;sel.append(op)});
  if(!(ARCH.briefs||[]).some(x=>x.id===CUR_ID)){const op=el('option',null,edName(CUR_ID)+' (المنشورة الآن)');op.value=CUR_ID;sel.prepend(op);op.selected=ED===CUR_ID}
  sel.onchange=async()=>{try{sel.disabled=true;await openEdition(sel.value);render()}catch(e){toast(e.message)}finally{sel.disabled=false}};
  f.append(lab,sel);top.append(f);
  const n=b.zones.reduce((s,z)=>s+z.items.length,0),hid=new Set(hiddenSet());
  const k=el('div','kpis');[[n,'خبراً'],[b.zones.reduce((s,z)=>s+z.items.filter(i=>hid.has(i.id)).length,0),'مخفياً'],[Object.keys(b.sources||{}).length,'مصدراً'],[(b.markets||[]).length,'مؤشر سوق']].forEach(([x,l])=>{const d=el('div');d.append(el('b',null,String(x)),el('small',null,l));k.append(d)});top.append(k);
  const meta=el('p','mute',`${b.auto?'خلاصة آلية من الطيار الآلي · ':''}نُشرت ${fmtD(b.published)}`);meta.style.fontSize='.85rem';top.append(meta);
  const view=el('a','btn ghost sm','عرضها كما يراها القارئ');view.href=SITE+(ED===CUR_ID?'':'#b-'+ED);view.target='_blank';view.rel='noopener';top.append(brow(view));
  if(ED!==CUR_ID)top.append(el('p','msg info','هذه خلاصة من الأرشيف. تعديلها لا يغيّر الصفحة الرئيسية، ويظهر في الأرشيف وفي البحث.'));
  v.append(top);

  // العنوان والخيط
  const th=el('details','blk');th.append(el('summary',null,'عنوان الخلاصة والخيط الناظم'));const tb=el('div','body');th.append(tb);
  tb.append(list({items:[b],title:x=>(x.title&&x.title.ar)||'خلاصة',meta:x=>(x.thread&&x.thread.ar)||'',edit:()=>form({title:'العنوان والخيط',
    fields:[{k:'title.ar',label:'عنوان الخلاصة بالعربية',half:true},{k:'title.en',label:'العنوان بالإنجليزية',dir:'ltr',half:true},{k:'thread.ar',label:'الخيط الناظم بالعربية (جملة لكل دائرة، 3 إلى 4 جمل)',type:'textarea',rows:4,count:true},{k:'thread.en',label:'الخيط بالإنجليزية',type:'textarea',rows:4,dir:'ltr'}],
    value:{title:b.title||{},thread:b.thread||{}},validate:v=>{const o=[];if(!v.title.ar)o.push({lvl:'error',where:'العنوان',msg:'العنوان مطلوب'});R.text(v.thread.ar,'الخيط',o,'ar',{lead:40,body:0});if(R.words(v.thread.ar)>90)o.push({lvl:'warn',where:'الخيط',msg:'الخيط أطول من 80 كلمة'});return o},
    save:x=>{b.title=x.title;b.thread=Object.assign(b.thread||{},x.thread);bChange('تعديل العنوان والخيط')}})}));
  v.append(th);

  // الدوائر
  b.zones.forEach((z,zi)=>{
    const d=el('details','blk');d.open=zi===0;const s=el('summary');const dot=el('span','dot');dot.style.background=ZC[z.id]||'var(--ink)';s.append(dot,z.name.ar,el('span','cnt',nAr(z.items.length,NITEMS)));d.append(s);
    const bd=el('div','body');d.append(bd);
    bd.append(el('h3',null,'الأخبار'));
    bd.append(list({items:z.items,empty:'لا أخبار في هذه الدائرة.',
      title:x=>(x.h&&x.h.ar)||x.ar||x.en||'—',
      meta:x=>`${(x.cat&&x.cat.ar)||''} · ${(x.src||[]).map(id=>(b.sources[id]&&b.sources[id].ar)||id).join('، ')}`,
      tags:x=>{const t=[];const outs=new Set((x.src||[]).filter(id=>b.sources[id]).map(id=>R.outlet(b.sources[id].url)));if(outs.size<2)t.push(['جهة واحدة','warn']);if(/c[a-z0-9]{6}$/.test(x.id))t.push(['مضاف يدوياً','new']);return t},
      hidden:x=>hid.has(x.id),
      move:(a,c)=>{if(moveIn(z.items,a,c))bChange(`ترتيب أخبار ${z.name.ar}`)},
      edit:i=>editItem(zi,i),
      hide:i=>{const a=ADM(),id=z.items[i].id;a.hidden=a.hidden||[];const was=a.hidden.includes(id);a.hidden=was?a.hidden.filter(x=>x!==id):[...a.hidden,id];change(`${was?'إظهار':'إخفاء'} خبر: «${(z.items[i].h&&z.items[i].h.ar)||z.items[i].ar.slice(0,50)}»`)},
      del:i=>{const x=z.items[i];if(!confirm(`حذف الخبر «${(x.h&&x.h.ar)||x.ar.slice(0,60)}» من ${edName(ED)}؟ يبقى في سجل التعديلات ويمكن التراجع عنه.`))return;z.items.splice(i,1);bChange(`حذف خبر: «${(x.h&&x.h.ar)||x.ar.slice(0,50)}»`)},
      add:()=>editItem(zi,null),addLabel:'خبر جديد في '+z.name.ar}));
    bd.append(el('h3',null,'التحليل والقراءة الفنية'));
    const blocks=[['analysis','التحليل'],['technical','القراءة الفنية للأسواق']];
    bd.append(list({items:blocks,title:x=>x[1],meta:x=>(z[x[0]]&&z[x[0]].ar)||'غير مكتوب',
      edit:i=>{const [key,t]=blocks[i];editBlock(`${t}: ${z.name.ar}`,z[key],val=>{if(val)z[key]=val;else delete z[key]},{min:1,rules:{lead:45,body:90}})},
      del:i=>{const [key,t]=blocks[i];if(!z[key])return;if(!confirm(`حذف ${t} في ${z.name.ar}؟`))return;delete z[key];bChange(`حذف ${t}: ${z.name.ar}`)}}));
    bd.append(el('h3',null,'الاستقراء'));
    z.outlook=Array.isArray(z.outlook)?z.outlook:[];
    bd.append(list({items:z.outlook,empty:'لا استقراء.',title:x=>x.ar||x.en,meta:x=>(x.src||[]).map(id=>(b.sources[id]&&b.sources[id].ar)||id).join('، '),
      move:(a,c)=>{if(moveIn(z.outlook,a,c))bChange(`ترتيب استقراء ${z.name.ar}`)},
      edit:i=>editBlock(`استقراء: ${z.name.ar}`,z.outlook[i],val=>{if(val)z.outlook[i]=val;else z.outlook.splice(i,1)},{need:true,rules:{lead:40,body:45}}),
      del:i=>{if(!confirm('حذف هذا الاستقراء؟'))return;z.outlook.splice(i,1);bChange(`حذف استقراء: ${z.name.ar}`)},
      add:()=>editBlock(`استقراء جديد: ${z.name.ar}`,null,val=>{if(val)z.outlook.push(val)},{need:true,rules:{lead:40,body:45}}),addLabel:'استقراء'}));
    v.append(d);
  });

  // الأسواق
  b.markets=b.markets||[];
  const md=el('details','blk');md.append(el('summary',null,'مؤشرات الأسواق'));const mb=el('div','body');md.append(mb);
  const MF=[{k:'ar',label:'اسم المؤشر بالعربية',half:true},{k:'en',label:'الاسم بالإنجليزية',dir:'ltr',half:true},{k:'value',label:'القيمة',dir:'ltr',half:true},{k:'chg',label:'التغير (مثل +1.2% أو -0.4%)',dir:'ltr',half:true},
    {k:'dir',label:'الاتجاه',type:'select',opts:[['up','صعود'],['down','هبوط'],['flat','ثبات']],half:true},{k:'unit.ar',label:'الوحدة بالعربية',half:true},{k:'unit.en',label:'الوحدة بالإنجليزية',dir:'ltr',half:true},
    {k:'note.ar',label:'ملاحظة بالعربية (التوقيت والسياق)',type:'textarea',rows:2},{k:'note.en',label:'ملاحظة بالإنجليزية',type:'textarea',rows:2,dir:'ltr'},{k:'src',label:'المصادر',type:'sources'}];
  const mval=(x,S)=>{const o=[];if(!x.ar)o.push({lvl:'error',where:'الاسم',msg:'اسم المؤشر مطلوب'});if(!String(x.value||'').trim())o.push({lvl:'error',where:'القيمة',msg:'القيمة مطلوبة'});R.sources(x.src,S,'المصادر',o,1);return o};
  const editM=i=>{const isNew=i==null;form({title:isNew?'مؤشر سوق جديد':'تعديل مؤشر سوق',fields:MF,value:isNew?{ar:'',en:'',value:'',chg:'',dir:'flat',unit:{ar:'',en:''},note:{ar:'',en:''},src:[]}:b.markets[i],sources:b.sources,validate:mval,
    save:(x,nw)=>{Object.assign(b.sources,nw);if(isNew){x.id='m'+Date.now().toString(36).slice(-6);b.markets.push(x)}else b.markets[i]=x;bChange((isNew?'إضافة':'تعديل')+` مؤشر: ${x.ar}`)}})};
  mb.append(list({items:b.markets,empty:'لا مؤشرات.',title:x=>`${x.ar}: ${x.value} ${(x.unit&&x.unit.ar)||''}`,meta:x=>`${x.chg||''} ${(x.note&&x.note.ar)||''}`,
    move:(a,c)=>{if(moveIn(b.markets,a,c))bChange('ترتيب مؤشرات الأسواق')},edit:editM,
    del:i=>{if(!confirm(`حذف مؤشر «${b.markets[i].ar}»؟`))return;const x=b.markets.splice(i,1)[0];bChange('حذف مؤشر: '+x.ar)},add:()=>editM(null),addLabel:'مؤشر'}));
  v.append(md);

  // خريطة الطريق
  b.roadmap=b.roadmap||[];
  const rd=el('details','blk');rd.append(el('summary',null,'خريطة الطريق (المواعيد القادمة)'));const rb=el('div','body');rd.append(rb);
  const RF=[{k:'date',label:'التاريخ',type:'date',half:true},{k:'to',label:'حتى تاريخ (اختياري)',type:'date',half:true},{k:'zone',label:'الدائرة',type:'select',opts:Object.entries(ZN),half:true},
    {k:'ar',label:'الموعد بالعربية',type:'textarea',rows:2},{k:'en',label:'الموعد بالإنجليزية',type:'textarea',rows:2,dir:'ltr'},{k:'scn.ar',label:'السيناريو المرجح بالعربية (اختياري)',type:'textarea',rows:2},{k:'scn.en',label:'السيناريو بالإنجليزية',type:'textarea',rows:2,dir:'ltr'},{k:'src',label:'المصادر',type:'sources'}];
  const rval=(x,S)=>{const o=[];if(!/^\d{4}-\d{2}-\d{2}$/.test(x.date||''))o.push({lvl:'error',where:'التاريخ',msg:'التاريخ مطلوب'});if(x.to&&x.to<x.date)o.push({lvl:'error',where:'حتى تاريخ',msg:'تاريخ النهاية قبل البداية'});if(!x.ar)o.push({lvl:'error',where:'الموعد',msg:'نص الموعد مطلوب'});R.text(x.ar,'الموعد',o,'ar',{lead:40,body:45});R.sources(x.src,S,'المصادر',o,1);return o};
  const editR=i=>{const isNew=i==null;form({title:isNew?'موعد جديد':'تعديل موعد',fields:RF,value:isNew?{date:R.dohaToday(),zone:'qatar',ar:'',en:'',src:[]}:b.roadmap[i],sources:b.sources,validate:rval,
    save:(x,nw)=>{Object.assign(b.sources,nw);if(!x.to)delete x.to;if(x.scn&&!x.scn.ar&&!x.scn.en)delete x.scn;if(isNew)b.roadmap.push(x);else b.roadmap[i]=x;b.roadmap.sort((p,q)=>String(p.date).localeCompare(String(q.date)));bChange((isNew?'إضافة':'تعديل')+' موعد: '+x.ar.slice(0,50))}})};
  rb.append(el('p','lead','تُرتَّب المواعيد بالتاريخ تلقائياً.'),list({items:b.roadmap,empty:'لا مواعيد.',title:x=>x.ar,meta:x=>`${fmtDay(x.date)}${x.to?' إلى '+fmtDay(x.to):''} · ${ZN[x.zone]||''}`,edit:editR,
    del:i=>{if(!confirm('حذف هذا الموعد؟'))return;const x=b.roadmap.splice(i,1)[0];bChange('حذف موعد: '+x.ar.slice(0,50))},add:()=>editR(null),addLabel:'موعد'}));
  v.append(rd);

  // سجل المصادر
  const sd=el('details','blk');const S=b.sources||{},used=refsOf(b);sd.append(el('summary',null,'سجل المصادر'),);sd.firstChild.append(el('span','cnt',Object.keys(S).length+' مصدراً'));const sb=el('div','body');sd.append(sb);
  const ids=Object.keys(S).sort((p,q)=>String(S[q].date).localeCompare(String(S[p].date)));
  sb.append(el('p','lead','صحّح اسم الجهة أو الرابط أو التاريخ في مكان واحد فيتغير في كل خبر يستشهد به. المصدر غير المستعمل يُحذف تلقائياً عند النشر.'),
    list({items:ids,title:id=>`${S[id].ar} · ${S[id].en||''}`,meta:id=>`${R.outlet(S[id].url)} · ${fmtDay(S[id].date)} · ${S[id].url}`,tags:id=>R.source(S[id]).length?[['يحتاج تصحيحاً','warn']]:[],
      edit:i=>{const id=ids[i];form({title:'تعديل مصدر',fields:[{k:'ar',label:'اسم الجهة بالعربية',half:true},{k:'en',label:'الاسم بالإنجليزية',dir:'ltr',half:true},{k:'url',label:'الرابط الأصلي',dir:'ltr',type:'url'},{k:'date',label:'تاريخ النشر',type:'date'}],
        value:S[id],validate:x=>R.source(x).map(m=>({lvl:'error',where:'المصدر',msg:m})),save:x=>{S[id]=Object.assign(S[id],x);bChange('تعديل مصدر: '+x.ar)}})},
      del:i=>{const id=ids[i];if(used.has(id)){alert('هذا المصدر مستعمل في خبر أو تحليل. أزله منه أولاً.');return}delete S[id];bChange('حذف مصدر')}}));
  v.append(sd);
}

/* ---------- أقسام الموقع ---------- */
const NAV=[['today','اليوم'],['marsad','المرصد'],['qatar','قطر'],['gulf','الخليج'],['egypt','مصر'],['world','العالم'],['military','القسم العسكري'],['wars','الحروب الدائرة'],['countries','الأوضاع في الدول'],['forecast','التوقعات'],['desks','الأقسام'],['special','تقارير خاصة'],['weather','الطقس والمناخ'],['roadmap','خريطة الطريق'],['ledger','الشفافية'],['saved','المحفوظ'],['about','عن عبدو نيوز']];
function viewSite(v){
  const a=ADM();const p=el('section','panel');p.append(el('h2',null,'أقسام الموقع وترتيبها'),el('p','lead','رتّب أقسام الشريط العلوي في الموقع بالسحب أو بالأسهم، وأخفِ ما لا تريد ظهوره. «اليوم» يبقى ظاهراً دائماً.'));
  const order=(a.tabs_order&&a.tabs_order.length?a.tabs_order:NAV.map(x=>x[0])).filter(id=>NAV.some(x=>x[0]===id));NAV.forEach(([id])=>{if(!order.includes(id))order.push(id)});
  const off=new Set(a.tabs_off||[]);const name=id=>(NAV.find(x=>x[0]===id)||[id,id])[1];
  p.append(list({items:order,title:id=>name(id),hidden:id=>off.has(id),
    move:(x,y)=>{if(moveIn(order,x,y)){a.tabs_order=order.slice();change('ترتيب أقسام الموقع')}},
    hide:i=>{const id=order[i];if(id==='today'){toast('«اليوم» يبقى ظاهراً');return}a.tabs_order=order.slice();const s=new Set(a.tabs_off||[]);s.has(id)?s.delete(id):s.add(id);a.tabs_off=[...s];change(`${s.has(id)?'إخفاء':'إظهار'} قسم: ${name(id)}`)}}));
  p.append(brow(btn('استعادة الترتيب الأصلي','btn ghost sm',()=>{delete a.tabs_order;delete a.tabs_off;change('استعادة الترتيب الأصلي لأقسام الموقع')})));
  v.append(p);
  const meta=(F[D+'desks-meta']||{}).meta||[];
  const q=el('section','panel');q.append(el('h2',null,'الأقسام الموضوعية'),el('p','lead','الأقسام الموضوعية (الصحة، التقنية، الرياضة وغيرها) تُكتب آلياً كل 3 ساعات بخبرين من جهتين مستقلتين على الأقل. رتّبها داخل صفحة «الأقسام» وأخفِ ما تريد.'));
  const dorder=(a.desks_order&&a.desks_order.length?a.desks_order.filter(id=>meta.some(m=>m.id===id)):[]);meta.forEach(m=>{if(!dorder.includes(m.id))dorder.push(m.id)});
  const doff=new Set(a.desks_off||[]),dn=id=>(meta.find(m=>m.id===id)||{ar:id}).ar;
  q.append(list({items:dorder,empty:'تعذّرت قراءة الأقسام الموضوعية.',title:dn,hidden:id=>doff.has(id),
    move:(x,y)=>{if(moveIn(dorder,x,y)){a.desks_order=dorder.slice();change('ترتيب الأقسام الموضوعية')}},
    hide:i=>{const id=dorder[i];const s=new Set(a.desks_off||[]);s.has(id)?s.delete(id):s.add(id);a.desks_off=[...s];change(`${s.has(id)?'إخفاء':'إظهار'} قسم موضوعي: ${dn(id)}`)}}));
  v.append(q);
  const r=el('section','panel');r.append(el('h2',null,'العاجل والإعدادات الأخرى'),el('p','lead','الشريط العاجل، وحسابات العملاء والمديرين، والطقس، والمرصد، وتشغيل الوكيل: في لوحة الإدارة الرئيسية.'));
  const l=el('a','btn ghost sm','فتح لوحة الإدارة الرئيسية');l.href='../';r.append(brow(l));v.append(r);
}

/* ---------- التقارير الخاصة ---------- */
const SIX=D+'special/index.json',SP=id=>D+'special/'+id+'.json';
let REP=null;
function viewSpecial(v){
  const ix=F[SIX]&&F[SIX].data;const p=el('section','panel');p.append(el('h2',null,'التقارير الخاصة المحرَّرة'),el('p','lead','رتّب التقارير كما تظهر للقرّاء، وعدّل عناوينها ومقدماتها وملخصاتها وبنودها، أو احذف تقريراً. كل بند بجهتين مستقلتين على الأقل.'));
  if(!ix){p.append(el('p','empty','تعذّرت قراءة فهرس التقارير.'));v.append(p);return}
  ix.reports=ix.reports||[];
  p.append(list({items:ix.reports,empty:'لا تقارير منشورة.',title:x=>x.title.ar,meta:x=>`${x.code||''} · ${(x.stats&&x.stats.items)||0} بنداً · ${(x.stats&&x.stats.outlets)||0} جهة · ${fmtDay(String(x.updated).slice(0,10))}`,
    move:(a,c)=>{if(moveIn(ix.reports,a,c))change('ترتيب التقارير الخاصة')},
    edit:async i=>{const id=ix.reports[i].id;try{if(!F[SP(id)])await load(SP(id));REP=id;render();setTimeout(()=>{const n=document.getElementById('rep-ed');if(n)n.scrollIntoView({behavior:'smooth'})},50)}catch(e){toast(e.message)}},
    extra:x=>{const a=el('a','ib','عرض');a.href=SITE+'special/?r='+encodeURIComponent(x.id);a.target='_blank';a.rel='noopener';return [a]},
    del:async i=>{const x=ix.reports[i];if(!confirm(`حذف التقرير «${x.title.ar}» نهائياً من الموقع؟ يمكن التراجع عنه من سجل التعديلات.`))return;
      try{if(!F[SP(x.id)])await load(SP(x.id));F[SP(x.id)].del=true;ix.reports.splice(i,1);if(REP===x.id)REP=null;change('حذف تقرير خاص: '+x.title.ar)}catch(e){toast(e.message)}}}));
  v.append(p);
  if(REP&&F[SP(REP)]&&F[SP(REP)].data&&!F[SP(REP)].del)v.append(repEditor(REP,ix));
}
function repEditor(id,ix){
  const r=F[SP(id)].data,S=r.sources=r.sources||{},entry=ix.reports.find(x=>x.id===id);
  const p=el('section','panel');p.id='rep-ed';p.append(el('h2',null,'تعديل: '+r.title.ar));
  const syncIx=()=>{if(!entry)return;entry.title=clone(r.title);if(r.subtitle)entry.subtitle=clone(r.subtitle);const its=(r.sections||[]).flatMap(s=>s.items||[]);
    entry.stats={items:its.length,sources:Object.keys(S).length,outlets:new Set(Object.values(S).map(s=>R.outlet(s.url))).size};r.stats=Object.assign(r.stats||{},entry.stats);r.updated=entry.updated=new Date().toISOString().replace(/\.\d+Z$/,'Z')};
  const rc=d=>{syncIx();change(`تقرير «${r.title.ar}»: ${d}`)};
  p.append(list({items:[r],title:x=>x.title.ar,meta:x=>(x.lead&&x.lead.ar)||'',edit:()=>form({title:'العنوان والمقدمة والملخص',
    fields:[{k:'title.ar',label:'العنوان بالعربية'},{k:'title.en',label:'العنوان بالإنجليزية',dir:'ltr'},{k:'subtitle.ar',label:'العنوان الفرعي بالعربية',type:'textarea',rows:2},{k:'subtitle.en',label:'العنوان الفرعي بالإنجليزية',type:'textarea',rows:2,dir:'ltr'},
      {k:'lead.ar',label:'المقدمة بالعربية',type:'textarea',rows:3,count:true},{k:'lead.en',label:'المقدمة بالإنجليزية',type:'textarea',rows:3,dir:'ltr'},
      {k:'summary.ar',label:'الملخص بالعربية (فقرة في كل سطرين)',type:'paras',rows:8},{k:'summary.en',label:'الملخص بالإنجليزية',type:'paras',rows:6,dir:'ltr'}],
    value:{title:r.title,subtitle:r.subtitle||{},lead:r.lead||{},summary:r.summary||{}},
    validate:x=>{const o=[];if(!x.title.ar)o.push({lvl:'error',where:'العنوان',msg:'مطلوب'});if(/^(أريد|أرجو|المعلومات المتيسرة|تقرير عن)/.test(x.title.ar||''))o.push({lvl:'error',where:'العنوان',msg:'العنوان اسم الموضوع لا نص الطلب'});R.text(x.lead.ar,'المقدمة',o,'ar',{lead:45,body:120});(x.summary.ar||[]).forEach((s,i)=>R.text(s,'الملخص '+(i+1),o,'ar',{lead:45,body:70}));return o},
    save:x=>{Object.assign(r,x);rc('العنوان والمقدمة والملخص')}})}));
  (r.sections||[]).forEach((s,si)=>{
    const d=el('details','blk');d.open=si===0;d.append(el('summary',null,s.ar||s.id));d.firstChild.append(el('span','cnt',nAr((s.items||[]).length,['بند واحد','بندان','بنود','بنداً','لا بنود'])));const bd=el('div','body');d.append(bd);
    const IF=[{k:'date',label:'التاريخ',type:'date',half:true},{k:'ar',label:'النص بالعربية',type:'textarea',rows:5,count:true},{k:'en',label:'النص بالإنجليزية',type:'textarea',rows:4,dir:'ltr'},{k:'src',label:'المصادر (جهتان مستقلتان على الأقل)',type:'sources'}];
    const iv=(x,SS)=>{const o=[];if(!x.ar)o.push({lvl:'error',where:'النص',msg:'النص بالعربية مطلوب'});R.text(x.ar,'النص بالعربية',o,'ar',{lead:40,body:110});R.sources(x.src,SS,'المصادر',o,2);return o};
    const ed=i=>{const isNew=i==null;form({title:isNew?'بند جديد':'تعديل بند',fields:IF,value:isNew?{id:'',date:R.dohaToday(),ar:'',en:'',src:[]}:s.items[i],sources:S,validate:iv,
      save:(x,nw)=>{Object.assign(S,nw);if(isNew){x.id=(s.id||'s').charAt(0)+'c'+Date.now().toString(36).slice(-5);s.items.push(x)}else s.items[i]=x;rc((isNew?'إضافة':'تعديل')+' بند')}})};
    s.items=s.items||[];
    bd.append(list({items:s.items,title:x=>(x.ar||x.en||'').slice(0,140),meta:x=>`${fmtDay(x.date)} · ${(x.src||[]).map(k=>(S[k]&&S[k].ar)||k).join('، ')}`,
      move:(a,c)=>{if(moveIn(s.items,a,c))rc('ترتيب البنود')},edit:ed,del:i=>{if(!confirm('حذف هذا البند؟'))return;s.items.splice(i,1);rc('حذف بند')},add:()=>ed(null),addLabel:'بند'}));
    p.append(d);
  });
  p.append(brow(btn('إغلاق المحرر','btn ghost sm',()=>{REP=null;render()})));
  return p;
}

/* ---------- الرأي ---------- */
function viewOpinion(v){
  const P=D+'opinion.json';if(!F[P].data)F[P].data={authors:[],articles:[]};const o=F[P].data;o.authors=o.authors||[];o.articles=o.articles||[];
  const oc=d=>{o.updated=new Date().toISOString();change('مقالات الرأي: '+d)};
  const p=el('section','panel');p.append(el('h2',null,'مقالات الرأي والتحليل'),el('p','lead','للكتّاب بأسمائهم الحقيقية وبموافقتهم المكتوبة. كل معلومة في المقال تُنسب إلى مصدرها برابطه.'));
  const au=id=>(o.authors.find(x=>x.id===id)||{}).name||id;
  const AF=()=>[{k:'author',label:'الكاتب',type:'select',opts:o.authors.map(x=>[x.id,x.name]).concat([['__new','+ كاتب جديد']])},{k:'_name',label:'اسم الكاتب الجديد (إن اخترت «كاتب جديد»)',half:true},{k:'_bio',label:'صفته (للكاتب الجديد)',half:true},
    {k:'title',label:'العنوان'},{k:'date',label:'التاريخ',type:'date',half:true},{k:'lang',label:'اللغة',type:'select',opts:[['ar','العربية'],['en','الإنجليزية']],half:true},{k:'body',label:'نص المقال',type:'textarea',rows:10,count:true},
    {k:'sources',label:'روابط مصادر المعلومات (رابط في كل سطر)',type:'lines',rows:3,dir:'ltr'},{k:'_consent',label:'لديّ موافقة الكاتب المكتوبة على النشر باسمه',type:'check'}];
  const val=x=>{const r=[];if(!x._consent)r.push({lvl:'error',where:'الموافقة',msg:'لا يُنشر مقال باسم كاتب دون موافقته المكتوبة'});if(x.author==='__new'&&!x._name)r.push({lvl:'error',where:'الكاتب',msg:'اكتب اسم الكاتب'});if(!x.title)r.push({lvl:'error',where:'العنوان',msg:'مطلوب'});if((x.body||'').length<200)r.push({lvl:'error',where:'النص',msg:'النص 200 حرف على الأقل'});R.urls(x.sources||[],'المصادر',r,false);return r};
  const ed=i=>{const isNew=i==null;const a=isNew?{author:o.authors[0]?o.authors[0].id:'__new',title:'',date:R.dohaToday(),lang:'ar',body:'',sources:[]}:Object.assign(clone(o.articles[i]),{_consent:true});
    form({title:isNew?'مقال جديد':'تعديل مقال',fields:AF(),value:a,validate:val,save:x=>{if(x.author==='__new'){const id='a'+Date.now().toString(36);o.authors.push({id,name:x._name,bio:x._bio||''});x.author=id}
      ['_name','_bio','_consent'].forEach(k=>delete x[k]);if(isNew){x.id='op'+Date.now().toString(36);o.articles.unshift(x)}else o.articles[i]=x;oc((isNew?'مقال جديد: ':'تعديل مقال: ')+x.title)}});
  };
  p.append(list({items:o.articles,empty:'لا مقالات منشورة بعد.',title:x=>x.title,meta:x=>`${au(x.author)} · ${fmtDay(x.date)} · ${(x.sources||[]).length} مصدر`,
    move:(a,c)=>{if(moveIn(o.articles,a,c))oc('ترتيب المقالات')},edit:ed,del:i=>{if(!confirm(`حذف المقال «${o.articles[i].title}»؟`))return;const x=o.articles.splice(i,1)[0];oc('حذف مقال: '+x.title)},add:()=>ed(null),addLabel:'مقال'}));
  v.append(p);
  const q=el('section','panel');q.append(el('h2',null,'الكتّاب'));
  q.append(list({items:o.authors,empty:'لا كتّاب.',title:x=>x.name,meta:x=>x.bio||'',edit:i=>form({title:'تعديل كاتب',fields:[{k:'name',label:'الاسم'},{k:'bio',label:'الصفة والنبذة',type:'textarea',rows:2}],value:o.authors[i],validate:x=>x.name?[]:[{lvl:'error',where:'الاسم',msg:'مطلوب'}],save:x=>{o.authors[i]=x;oc('تعديل كاتب: '+x.name)}}),
    del:i=>{const x=o.authors[i];if(o.articles.some(a=>a.author===x.id)){alert('لهذا الكاتب مقالات منشورة. احذفها أولاً.');return}if(!confirm('حذف الكاتب '+x.name+'؟'))return;o.authors.splice(i,1);oc('حذف كاتب: '+x.name)}}));
  v.append(q);
}

/* ---------- التصحيحات ---------- */
function viewCorr(v){
  const P=D+'corrections.json';if(!F[P].data)F[P].data={items:[]};const c=F[P].data;c.items=c.items||[];
  const cc=d=>{c.updated=new Date().toISOString();change('سجل التصحيحات: '+d)};
  const p=el('section','panel');p.append(el('h2',null,'سجل التصحيحات'),el('p','lead','كل تصحيح يُنشر علناً بالتاريخ والسبب، مع الصيغة الأصلية والمصحّحة وروابط المصادر الصحيحة.'));
  const CF=[{k:'date',label:'التاريخ',type:'date',half:true},{k:'brief',label:'معرّف الخلاصة (اختياري)',dir:'ltr',ph:'2026-11-25-am',half:true},{k:'before',label:'الصيغة الأصلية',type:'textarea',rows:3},{k:'after',label:'الصيغة بعد التصحيح',type:'textarea',rows:3},{k:'reason',label:'سبب التصحيح'},{k:'_urls',label:'روابط المصادر الصحيحة (رابط في كل سطر)',type:'lines',rows:3,dir:'ltr'}];
  const val=x=>{const r=[];['before','after','reason'].forEach(k=>{if(!x[k])r.push({lvl:'error',where:{before:'الصيغة الأصلية',after:'الصيغة المصحّحة',reason:'السبب'}[k],msg:'مطلوب'})});R.urls(x._urls||[],'المصادر',r,true);return r};
  const ed=i=>{const isNew=i==null;const x=isNew?{date:R.dohaToday(),brief:'',before:'',after:'',reason:'',_urls:[]}:Object.assign(clone(c.items[i]),{_urls:(c.items[i].sources||[]).map(s=>s.url)});
    form({title:isNew?'تصحيح جديد':'تعديل تصحيح',fields:CF,value:x,validate:val,save:y=>{y.sources=(y._urls||[]).map(u=>({name:R.outlet(u),url:u,date:y.date}));delete y._urls;y.brief=y.brief||null;if(isNew)c.items.unshift(y);else c.items[i]=y;cc(isNew?'تصحيح جديد':'تعديل تصحيح')}})};
  p.append(list({items:c.items,empty:'لا تصحيحات منشورة.',title:x=>x.after,meta:x=>`${fmtDay(x.date)} · ${x.reason}`,move:(a,b)=>{if(moveIn(c.items,a,b))cc('ترتيب')},edit:ed,
    del:i=>{if(!confirm('حذف هذا التصحيح من السجل العلني؟'))return;c.items.splice(i,1);cc('حذف تصحيح')},add:()=>ed(null),addLabel:'تصحيح'}));
  v.append(p);
}

/* ---------- سجل التعديلات والتراجع ---------- */
let HIST=null;
function viewHist(v){
  const p=el('section','panel');p.append(el('h2',null,'سجل التعديلات'),el('p','lead','آخر التحديثات على محتوى الموقع، من هذه الشاشة ومن المحرر والطيار الآلي. يمكنك التراجع عن أي نشر من هذه الشاشة فيعود المحتوى كما كان قبله.'));
  const box=el('div');p.append(box);v.append(p);
  const draw=()=>{box.textContent='';if(!HIST){box.append(el('p','mute','جارٍ التحميل…'));return}
    const t=el('table','hist');const hd=el('thead');const hr=el('tr');['الوقت','التعديل','الكاتب',''].forEach(x=>hr.append(el('th',null,x)));hd.append(hr);t.append(hd);const tb=el('tbody');
    HIST.forEach(c=>{const tr=el('tr');const msg=c.commit.message.split('\n')[0],cms=/\[cms\]/.test(msg);
      tr.append(el('td',null,fmtD(c.commit.author.date)));const td=el('td');if(cms)td.append(el('span','tag new','إدارة المحتوى'));td.append(msg.replace(/\s*\[cms\]\s*/,' ').trim());tr.append(td);
      tr.append(el('td',null,(c.commit.author.name||'').replace('github-actions[bot]','آلي')));
      const ta=el('td');if(cms&&!/تراجع/.test(msg))ta.append(btn('تراجع','ib del',()=>undo(c)));tr.append(ta);tb.append(tr)});
    t.append(tb);box.append(t)};
  if(!HIST)gh('commits?path=khabar&sha='+BR+'&per_page=40').then(j=>{HIST=j;draw()}).catch(e=>{box.textContent='';box.append(el('p','msg err',e.message))});
  draw();
}
async function undo(c){
  if(dirty().length){alert('انشر تعديلاتك الحالية أو تجاهلها قبل التراجع.');return}
  if(!confirm('التراجع عن: «'+c.commit.message.split('\n')[0].replace(/\s*\[cms\]/,'')+'»؟ يعود كل ملف غيّره هذا النشر إلى ما كان عليه قبله.'))return;
  try{gateLine({t:'جارٍ التراجع…'});const full=await gh('commits/'+c.sha),parent=full.parents[0].sha,changes=[];
    for(const f of full.files||[]){
      if(f.status==='added'){changes.push({path:f.filename,data:null});continue}
      const old=await readRaw(f.status==='renamed'?f.previous_filename:f.filename,parent,true);if(!old)continue;
      changes.push({path:f.status==='renamed'?f.previous_filename:f.filename,blob:old.sha});if(f.status==='renamed')changes.push({path:f.filename,data:null})}
    const r=await commit(changes,'عبدو نيوز · إدارة المحتوى: تراجع عن «'+c.commit.message.split('\n')[0].replace(/^عبدو نيوز · إدارة المحتوى: /,'').replace(/\s*\[cms\].*$/,'')+'» [cms]\n\nبواسطة '+ME.u);
    F={};HIST=null;await start();gateLine({t:r?'تم التراجع. يظهر على الموقع خلال دقيقة إلى دقيقتين.':'لا شيء للتراجع عنه.',k:'ok'});if(r)watch(r.sha);
  }catch(e){gateLine({t:e.message,k:'err'})}
}

/* ---------- الملفات والبرمجة: وصول كامل إلى ملفات الموقع ---------- */
let TREE=null,CWD='khabar',OPEN=null,FIND='';const CODE_LOG=new Set();
const TEXT_EXT=/\.(html?|css|m?js|json|md|txt|xml|ya?ml|py|svg|toml|webmanifest|csv|bat|sh|ps1|gitignore|nojekyll|txt|ini|cfg|ts|jsx|tsx|kt|java|gradle|properties|php|sql)$/i;
const isText=p=>TEXT_EXT.test(p)||!/\.[a-z0-9]+$/i.test(p.split('/').pop());
const fsize=n=>n==null?'':n<1024?n+' بايت':n<1048576?(n/1024).toFixed(1)+' ك.ب':(n/1048576).toFixed(1)+' م.ب';
function codeMark(p,what){const k=what+':'+p;if(CODE_LOG.has(k))return;CODE_LOG.add(k);LOG.push(what+': '+p)}
async function loadTree(){const t=await gh('git/trees/'+BR+'?recursive=1');TREE=t.tree.filter(x=>x.type==='blob').map(x=>({path:x.path,size:x.size,sha:x.sha,mode:x.mode}));TREE.truncated=t.truncated}
function treeNow(){ // الشجرة كما ستكون بعد المسودة: الملفات الجديدة والمحذوفة
  const m=new Map((TREE||[]).map(x=>[x.path,x]));Object.keys(F).forEach(p=>{const f=F[p];if(!f.raw)return;if(f.del)m.delete(p);else if(!m.has(p))m.set(p,{path:p,size:f.text!=null?new Blob([f.text]).size:null,draft:true})});return [...m.values()]}
async function openCode(p){
  try{if(!F[p]||!F[p].raw){if(!isText(p)){const x=await readRaw(p,null,true);F[p]={raw:true,binary:true,sha:x?x.sha:null,size:x&&x.size,text:null,orig:null}}
      else{const x=await readRaw(p);if(!x)throw new Error('الملف غير موجود');if(x.size>3e6)throw new Error('الملف أكبر من 3 م.ب ولا يُفتح في المحرر.');F[p]={raw:true,sha:x.sha,size:x.size,text:x.text,orig:x.text}}}
    OPEN=p;render();setTimeout(()=>{const n=document.getElementById('code-ed');if(n)n.scrollIntoView({behavior:'smooth',block:'start'})},60)}
  catch(e){toast(e.message)}
}
function codeCheck(p,t){
  if(t==null)return null;
  if(/\.(json|webmanifest)$/i.test(p)){try{JSON.parse(t);return {ok:true,m:'JSON سليم.'}}catch(e){return {ok:false,block:true,m:'JSON غير صالح: '+e.message}}}
  if(/\.m?js$/i.test(p)){try{new Function(t.replace(/^\s*(import|export)\b[^\n]*$/mg,''));return {ok:true,m:'لا أخطاء صياغة ظاهرة.'}}catch(e){return {ok:false,m:'تنبيه صياغة: '+e.message}}}
  return null;
}
function viewCode(v){
  const p=el('section','panel');p.append(el('h2',null,'الملفات والبرمجة'),el('p','lead','وصول كامل إلى كل ملفات الموقع في المستودع: افتح أي ملف وعدّله، أو أنشئ ملفاً جديداً، أو ارفع صورة أو ملفاً، أو أعد تسمية ملف، أو احذفه. كل تعديل يدخل المسودة ولا يراه الزوار حتى تضغط «نشر على الموقع»، ويمكن التراجع عن أي نشر من «سجل التعديلات».'));
  p.append(el('p','msg info','اعمل في مجلد khabar/: يُنسخ آلياً إلى العنوان الرسمي abdo-news/ خلال دقائق، وأي تعديل مباشر في abdo-news/ يُستبدل بالنسخة التالية. وملفات data/ تمر ببوابة التوثيق والأسلوب على الخادم.'));
  v.append(p);
  if(!TREE){p.append(el('p','mute','جارٍ تحميل شجرة الملفات…'));loadTree().then(render).catch(e=>{p.append(el('p','msg err',e.message))});return}
  const all=treeNow();
  // بحث
  const sf=el('div','field');const sl=el('label',null,'ابحث عن ملف في كل المستودع');const si=el('input');si.id='code-find';si.dir='ltr';si.placeholder='app.js أو khabar/assets…';si.value=FIND;
  si.addEventListener('input',()=>{FIND=si.value.trim();clearTimeout(si.t);si.t=setTimeout(()=>{render();const n=document.getElementById('code-find');if(n){n.focus();n.setSelectionRange(n.value.length,n.value.length)}},250)});sf.append(sl,si);p.append(sf);
  // مسار التصفح
  const crumbs=el('div','btns');const parts=CWD?CWD.split('/'):[];
  crumbs.append(btn('المستودع','btn ghost sm',()=>{CWD='';FIND='';render()}));parts.forEach((x,i)=>crumbs.append(btn(x,'btn ghost sm',()=>{CWD=parts.slice(0,i+1).join('/');FIND='';render()})));p.append(crumbs);
  let rows;
  if(FIND){const q=FIND.toLowerCase();rows=all.filter(x=>x.path.toLowerCase().includes(q)).slice(0,200).map(x=>({file:x,name:x.path}))}
  else{const pre=CWD?CWD+'/':'',dirs=new Map(),files=[];all.forEach(x=>{if(!x.path.startsWith(pre))return;const rest=x.path.slice(pre.length),i=rest.indexOf('/');if(i>=0){const d=rest.slice(0,i);dirs.set(d,(dirs.get(d)||0)+1)}else files.push(x)});
    rows=[...[...dirs].sort((a,b)=>a[0].localeCompare(b[0])).map(([d,n])=>({dir:pre+d,name:d+'/',n})),...files.sort((a,b)=>a.path.localeCompare(b.path)).map(x=>({file:x,name:x.path.slice(pre.length)}))]}
  const ul=el('ul','list');
  if(!rows.length)ul.append(el('li','empty',FIND?'لا ملف يطابق البحث.':'المجلد فارغ.'));
  rows.forEach(r=>{const li=el('li','row');li.style.gridTemplateColumns='auto 1fr auto';
    const ic=el('span','grip',r.dir?'▸':'·');const m=el('div','row-main');const b=el('b',null,r.name);b.style.cssText='direction:ltr;text-align:left;font-family:var(--mono);font-size:.86rem';m.append(b);
    const st=r.file&&F[r.file.path];
    m.append(el('small',null,r.dir?r.n+' ملفاً':(fsize(r.file.size)+(st&&st.raw&&(st.blob||st.text!==st.orig)?' · معدَّل في المسودة':'')+(r.file.draft?' · ملف جديد في المسودة':''))));
    const a=el('div','row-acts');
    if(r.dir){a.append(btn('فتح','ib',()=>{CWD=r.dir;FIND='';render()}));li.style.cursor='pointer'}
    else{const fp=r.file.path;
      a.append(btn(isText(fp)?'تعديل':'عرض','ib',()=>openCode(fp)));
      a.append(btn('إعادة تسمية','ib',async()=>{const n=prompt('المسار الجديد للملف:',fp);if(!n||n===fp)return;const np=n.replace(/^\/+/,'');if(all.some(x=>x.path===np)){alert('يوجد ملف بهذا المسار.');return}
        try{let blob=r.file.sha;if(F[fp]&&F[fp].raw&&F[fp].text!=null&&F[fp].text!==F[fp].orig){F[np]={raw:true,sha:null,text:F[fp].text,orig:null}}else if(F[fp]&&F[fp].blob){F[np]={raw:true,sha:null,blob:F[fp].blob,text:null,orig:null}}else{F[np]={raw:true,sha:null,blob,text:null,orig:null,binary:!isText(fp)}}
          if(!F[fp])F[fp]={raw:true,sha:r.file.sha,text:null,orig:null};F[fp].del=true;if(!F[fp].sha)delete F[fp];if(OPEN===fp)OPEN=null;codeMark(fp+' ← '+np,'إعادة تسمية');bar();render()}catch(e){toast(e.message)}}));
      a.append(btn('حذف','ib del',()=>{if(!confirm('حذف الملف '+fp+'؟ يمكن التراجع عنه من سجل التعديلات بعد النشر.'))return;if(F[fp]&&!F[fp].sha){delete F[fp]}else{F[fp]=F[fp]||{raw:true,sha:r.file.sha,text:null,orig:null};F[fp].del=true}if(OPEN===fp)OPEN=null;codeMark(fp,'حذف ملف');bar();render()}))}
    li.append(ic,m,a);if(r.dir)m.onclick=()=>{CWD=r.dir;FIND='';render()};ul.append(li)});
  p.append(ul);if(TREE.truncated)p.append(el('small','mute','الشجرة كبيرة فعُرض جزء منها؛ استعمل البحث.'));
  // ملف جديد ورفع
  const up=el('input');up.type='file';up.hidden=true;up.multiple=true;
  up.onchange=async()=>{for(const f of up.files){const path=(CWD?CWD+'/':'')+f.name;try{
      if(isText(path)&&f.size<3e6){const t=await f.text();const ex=all.find(x=>x.path===path);F[path]=Object.assign(F[path]||{raw:true,sha:ex?ex.sha:null,orig:null},{text:t,del:false});if(F[path].orig==null&&ex){const x=await readRaw(path);F[path].orig=x.text}}
      else{if(f.size>25e6){toast('الحد الأقصى 25 م.ب للملف');continue}const b64=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]);r.onerror=rej;r.readAsDataURL(f)});
        const bl=await gh('git/blobs',{method:'POST',body:{content:b64,encoding:'base64'}});const ex=all.find(x=>x.path===path);F[path]={raw:true,binary:true,sha:ex?ex.sha:null,blob:bl.sha,text:null,orig:null}}
      codeMark(path,'رفع ملف')}catch(e){toast(e.message)}}up.value='';bar();render()};
  p.append(brow(btn('+ ملف جديد','btn ghost sm',()=>{const n=prompt('اسم الملف الجديد (داخل '+(CWD||'جذر المستودع')+'/). يمكن أن يتضمن مجلدات، مثل: pages/about.html','');if(!n)return;const path=((CWD?CWD+'/':'')+n.replace(/^\/+/,'')).replace(/\/+/g,'/');
    if(all.some(x=>x.path===path)){alert('يوجد ملف بهذا المسار.');return}F[path]={raw:true,sha:null,text:'',orig:null};codeMark(path,'ملف جديد');bar();openCode(path)}),
    btn('رفع ملفات أو صور','btn ghost sm',()=>up.click()),btn('تحديث الشجرة','btn ghost sm',()=>{TREE=null;render()})),up);
  if(OPEN&&F[OPEN])v.append(codeEditor(OPEN));
}
function codeEditor(p){
  const f=F[p],s=el('section','panel');s.id='code-ed';
  const h=el('div','btns');const t=el('h2',null,p);t.style.cssText='direction:ltr;text-align:left;font-family:var(--mono);font-size:1rem;overflow-wrap:anywhere;flex:1 1 100%';h.append(t);s.append(h);
  if(f.binary||f.text==null&&!isText(p)){
    s.append(el('p','mute','ملف ثنائي (صورة أو خط أو ملف مضغوط) لا يُعدَّل نصاً. يمكنك استبداله برفع ملف بالاسم نفسه في المجلد نفسه، أو حذفه، أو إعادة تسميته.'));
    if(/\.(png|jpe?g|gif|webp|svg|ico)$/i.test(p)&&!f.blob){const img=el('img');img.alt='';img.style.cssText='max-width:100%;max-height:320px;border:1px solid var(--line);border-radius:10px;background:#fff';img.src='https://raw.githubusercontent.com/'+REPO+'/'+BR+'/'+p;s.append(img)}
    s.append(brow(btn('إغلاق','btn ghost sm',()=>{OPEN=null;render()})));return s}
  const info=el('p','msg');info.hidden=true;
  const ta=el('textarea');ta.id='code-ta';ta.dir='ltr';ta.spellcheck=false;ta.value=f.text||'';ta.setAttribute('autocapitalize','off');ta.setAttribute('autocomplete','off');
  ta.style.cssText='unicode-bidi:plaintext;font:500 .82rem/1.55 var(--mono);width:100%;min-height:60vh;resize:vertical;white-space:pre;overflow:auto;tab-size:2;background:var(--bg);color:var(--ink);border:1px solid var(--line);border-radius:10px;padding:12px;text-align:left';
  const stat=el('small','mute');
  const upd=()=>{const lines=ta.value.split('\n').length;const c=codeCheck(p,ta.value);stat.textContent=`${lines} سطراً · ${fsize(new Blob([ta.value]).size)}`+(f.text!==f.orig?' · معدَّل في المسودة':'');
    if(c){info.textContent=c.m;info.className='msg '+(c.ok?'ok':'err');info.hidden=false}else info.hidden=true;
    f.badJson=!!(c&&c.block)};
  ta.addEventListener('input',()=>{f.text=ta.value;if(f.text!==f.orig)codeMark(p,f.sha?'تعديل ملف':'ملف جديد');upd();bar()});
  ta.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();const a=ta.selectionStart,b=ta.selectionEnd;ta.setRangeText('  ',a,b,'end');ta.dispatchEvent(new Event('input'))}
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();toast('التعديل محفوظ في المسودة. اضغط «نشر على الموقع» لنشره.')}});
  const acts=brow(btn('تراجع عن تعديلاتي في هذا الملف','btn ghost sm',()=>{if(f.orig==null){if(!confirm('حذف هذا الملف الجديد من المسودة؟'))return;delete F[p];OPEN=null;render();bar();return}f.text=f.orig;ta.value=f.text;upd();bar()}),
    btn('إغلاق المحرر','btn ghost sm',()=>{OPEN=null;render()}));
  const live=p.startsWith('khabar/')?SITE+p.slice(7):p.startsWith('abdo-news/')?SITE+p.slice(10):'https://munjiz-qa.github.io/'+p;
  if(/\.(html?|json|js|css|xml|svg|txt|md)$/i.test(p)&&f.sha){const a=el('a','btn ghost sm','فتح على الموقع');a.href=live;a.target='_blank';a.rel='noopener';acts.append(a)}
  s.append(stat,ta,info,acts);upd();return s;
}

/* ---------- النشر ---------- */
$('#discard').onclick=()=>{if(!confirm('تجاهل كل التعديلات غير المنشورة؟'))return;Object.keys(F).forEach(p=>{const f=F[p];if(f.local)return;if(f.raw){if(!f.sha&&!f.orig){delete F[p];return}f.text=f.orig;delete f.blob;f.del=false;return}f.data=f.orig==null?null:JSON.parse(f.orig);f.del=false});CODE_LOG.clear();LOG=[];REP=null;bar();render();toast('أُعيد المحتوى كما هو على الموقع')};
$('#publish').onclick=async()=>{
  const paths=dirty();if(!paths.length)return;const bad=paths.filter(p=>F[p].raw&&!F[p].del&&F[p].text!=null&&codeCheck(p,F[p].text)&&codeCheck(p,F[p].text).block);if(bad.length){toast('ملف JSON غير صالح: '+bad.join('، '));return}
  const b=$('#publish');b.disabled=true;$('#discard').disabled=true;$('#pub-state').textContent='جارٍ النشر…';
  try{
    const changes=paths.map(p=>{const f=F[p];return f.del?{path:p,data:null,base:f.sha}:f.blob?{path:p,blob:f.blob,base:f.sha}:{path:p,data:f.raw?f.text:f.data,base:f.sha}});
    const list=LOG.length?LOG:['تحديث المحتوى'];
    const msg='عبدو نيوز · إدارة المحتوى: '+(list.length===1?list[0]:list.slice(0,2).join('؛ ')+(list.length>2?` و${list.length-2} غيرها`:''))+' [cms]\n\n'+list.map(x=>'- '+x).join('\n')+'\n\nبواسطة '+ME.u;
    const r=await commit(changes,msg,async(c,cur)=>{
      // صدرت خلاصة جديدة أثناء التعديل: تبقى الصفحة الرئيسية للخلاصة الجديدة، ويُحفظ التعديل في نسخة الأرشيف وحدها
      if(c.path===BP&&cur){const now=JSON.parse(b64dec(cur.content||''));if(now.id!==F[BP].data.id){toast('صدرت خلاصة جديدة أثناء تعديلك، فحُفظ التعديل في الأرشيف');return 'skip'}}
      return false});
    if(!r){toast('لا جديد للنشر');return}
    for(const p of paths){if(F[p].del){delete F[p];continue}if(r.paths.includes(p)){const f=F[p];if(f.raw){const x=await readRaw(p,r.sha,true);f.sha=x&&x.sha;if(f.blob){delete f.blob;f.binary=true}else f.orig=f.text}else{const x=await readFile(p,r.sha);if(x){f.sha=x.sha;f.orig=JSON.stringify(f.data)}}}}CODE_LOG.clear();TREE=null;
    if(r.paths.includes(BP)===false&&paths.includes(BP)){F={};await start()}
    LOG=[];HIST=null;bar();render();gateLine({t:'نُشر. يجري فحص الخادم (قاعدة المصدرين ودليل الأسلوب)، ثم يظهر على الموقع خلال دقيقة إلى ثلاث دقائق.',k:'info'});watch(r.sha);
  }catch(e){$('#pub-state').textContent=e.message;toast(e.message)}
  finally{b.disabled=false;$('#discard').disabled=false}
};
// متابعة نتيجة فحص الخادم لهذا النشر
async function watch(sha){
  for(let i=0;i<24;i++){await new Promise(r=>setTimeout(r,15000));
    try{const s=await readFile(D+'cms-status.json');if(s&&s.data&&s.data.sha===sha){STATUS=s.data;gateLine();if(!STATUS.ok){F={};await start();gateLine()}return}}catch(e){}}
  gateLine({t:'لم تصل نتيجة فحص الخادم بعد. راجع سجل التعديلات بعد دقائق.',k:'info'});
}
boot();
})();
