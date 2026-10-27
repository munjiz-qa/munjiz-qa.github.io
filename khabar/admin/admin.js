'use strict';
// لوحة إدارة «خبر»: الدخول بكلمة مرور مشفّرة في data/admin.json، وتعديل العاجل والإخفاء، ثم النشر عبر GitHub.
(function(){
const CFG=window.KHABAR_CONFIG||{};
const $=s=>document.querySelector(s);
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const DEFAULT_HASH='15aebe9681badc802f1853e9061c9e06b13ca2b971a2e744f7013569398b2034';
const PATH='khabar/data/admin.json';
let ADMIN=null,BRIEF=null,HEAD=null,LEDGER=null,MARSAD=null,NEWHASH=null;
async function hash(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('khabar:'+s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
const getJSON=u=>fetch(u+'?t='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});
function toast(m){const n=$('#toast');n.textContent=m;n.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>n.hidden=true,2400)}
function msg(text,ok){const m=$('#pub-msg');m.textContent=text;m.className='msg '+(ok?'ok':'err');m.hidden=false}
const S={get(k){try{return sessionStorage.getItem(k)}catch(e){return null}},set(k,v){try{sessionStorage.setItem(k,v)}catch(e){}},del(k){try{sessionStorage.removeItem(k)}catch(e){}}};
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

async function boot(){
  try{[ADMIN,BRIEF]=await Promise.all([getJSON('../data/admin.json'),getJSON('../data/brief.json')]);HEAD=await getJSON('../data/headlines.json').catch(()=>null);LEDGER=await getJSON('../data/ledger.json').catch(()=>null);MARSAD=await getJSON('../data/marsad.json').catch(()=>null)}
  catch(e){$('#login-err').textContent='تعذّر تحميل بيانات التطبيق. أعد تحميل الصفحة.';$('#login-err').hidden=false;return}
  ADMIN.breaking=ADMIN.breaking||{};ADMIN.hidden=ADMIN.hidden||[];ADMIN.marsad_hidden=ADMIN.marsad_hidden||[];ADMIN.auth=ADMIN.auth||{user:'admin',hash:''};
  if(S.get('khabar-admin')===((ADMIN.auth.hash||DEFAULT_HASH)))open();
}
$('#login-form').onsubmit=async e=>{
  e.preventDefault();const u=$('#u').value.trim().toLowerCase(),p=$('#p').value;const h=await hash(p);
  const want=ADMIN&&ADMIN.auth.hash||DEFAULT_HASH;
  if(!ADMIN||u!==(ADMIN.auth.user||'admin')||h!==want){$('#login-err').textContent='اسم المستخدم أو كلمة المرور غير صحيحة.';$('#login-err').hidden=false;return}
  S.set('khabar-admin',want);open();
};
$('#logout').onclick=()=>{S.del('khabar-admin');location.reload()};

function open(){
  $('#login-form').hidden=true;$('#app').hidden=false;$('#logout').hidden=false;$('#who').textContent='المستخدم: '+(ADMIN.auth.user||'admin');
  const n=BRIEF.zones.reduce((s,z)=>s+z.items.length,0);
  const k=$('#kpis');k.textContent='';
  [[n,'خبر في الخلاصة الحالية'],[Object.keys(BRIEF.sources).length,'مصدراً موثّقاً'],[BRIEF.roadmap.length,'موعداً في خريطة الطريق'],[ADMIN.hidden.length,'خبراً مخفياً']].forEach(([v,l])=>{const d=el('div');d.append(el('b',null,String(v)),el('small',null,l));k.append(d)});
  const pub=el('p','mute');pub.style.fontSize='.88rem';pub.textContent=`الخلاصة الحالية: ${BRIEF.edition==='am'?'خلاصة الصباح':'خلاصة المساء'} ليوم ${BRIEF.date}`+(HEAD&&HEAD.updated?` · آخر تحديث آلي للعناوين: ${new Date(HEAD.updated).toLocaleString('ar-QA',{timeZone:'Asia/Qatar',numberingSystem:'latn'})}`:'');k.after(pub);
  const b=ADMIN.breaking;$('#b-on').checked=!!b.on;$('#b-ar').value=b.text_ar||'';$('#b-en').value=b.text_en||'';$('#b-src').value=b.source||'';$('#b-url').value=b.url||'';
  if(b.until){const d=new Date(b.until);if(!isNaN(d)){const z=new Date(d-d.getTimezoneOffset()*6e4);$('#b-until').value=z.toISOString().slice(0,16)}}
  const ul=$('#hide-list');ul.textContent='';const hid=new Set(ADMIN.hidden);
  BRIEF.zones.forEach(z=>z.items.forEach(it=>{const li=el('li'),lb=el('label'),cb=el('input');cb.type='checkbox';cb.value=it.id;cb.checked=hid.has(it.id);cb.onchange=preview;
    const tx=el('span');tx.append(el('span','z',`${z.name.ar} · ${it.cat.ar}`),it.ar);lb.append(cb,tx);li.append(lb);ul.append(li)}));
  ['#b-on','#b-ar','#b-en','#b-src','#b-url','#b-until','#np1','#np2'].forEach(s=>$(s).addEventListener('input',preview));
  $('#tok').value=LS.get('khabar-token')||'';
  agentPanel();marsadPanel();
  preview();
}
function marsadPanel(){
  const k=$('#marsad-kpis'),ul=$('#marsad-list');k.textContent='';ul.textContent='';
  if(!MARSAD){$('#marsad-last').textContent='لم يُبنَ المرصد بعد.';return}
  const I=MARSAD.indicators,R=MARSAD.record||{},stale=I.filter(i=>i.stale).length;
  [[I.length,'مؤشراً في المرصد'],[Object.keys(MARSAD.sources||{}).length,'مصدراً موثّقاً'],[I.filter(i=>i.est&&i.est.tier!=='c').length,'تقديراً معلناً'],[R.scored?`${R.hits}/${R.scored}`:'—','تقديراً أصاب نطاقه']]
    .forEach(([v,l])=>{const d=el('div');d.append(el('b',null,String(v)),el('small',null,l));k.append(d)});
  $('#marsad-last').textContent=`آخر بناء: ${new Date(MARSAD.updated).toLocaleString('ar-QA',{timeZone:'Asia/Qatar',numberingSystem:'latn'})}`+(stale?` · ${stale} مؤشر لم تتجدد قراءته`:' · كل القراءات حديثة');
  const hid=new Set(ADMIN.marsad_hidden),Z={qatar:'قطر',gulf:'الخليج',egypt:'مصر',world:'العالم'};
  I.forEach(i=>{const li=el('li'),lb=el('label'),cb=el('input');cb.type='checkbox';cb.value=i.id;cb.checked=hid.has(i.id);cb.onchange=preview;
    const tx=el('span');tx.append(el('span','z',`${Z[i.zone]} · آخر قراءة ${i.now.d}${i.stale?' · قديمة':''}`),i.ar);lb.append(cb,tx);li.append(lb);ul.append(li)});
}
function agentPanel(){
  const k=$('#agent-kpis');k.textContent='';const S=(LEDGER&&LEDGER.summary)||{},r=(LEDGER&&LEDGER.runs||[]).find(x=>x.mode==='brief');
  [[S.multi_source??'—','خبراً من جهتين فأكثر'],[S.numbers_total?`${S.numbers_grounded}/${S.numbers_total}`:'—','رقماً مطابقاً لمصدره'],[(LEDGER&&(LEDGER.agent_dropped||[]).length+(LEDGER.dropped||[]).length)??'—','حُذف قبل النشر'],[r?'$'+Number(r.usd).toFixed(2):'—','كلفة آخر خلاصة']]
    .forEach(([v,l])=>{const d=el('div');d.append(el('b',null,String(v)),el('small',null,l));k.append(d)});
  $('#agent-last').textContent=r?`آخر تشغيل للوكيل: ${new Date(r.at).toLocaleString('ar-QA',{timeZone:'Asia/Qatar',numberingSystem:'latn'})} · ${r.model} · نُشر ${r.published} من ${r.proposed}`:
    (LEDGER?`آخر فحص للخلاصة: ${new Date(LEDGER.checked).toLocaleString('ar-QA',{timeZone:'Asia/Qatar',numberingSystem:'latn'})}. لم يُسجَّل تشغيل للوكيل المستقل بعد.`:'لم يُسجَّل فحص بعد.');
}
document.querySelectorAll('[data-run]').forEach(b=>b.onclick=async()=>{
  const m=$('#run-msg'),say=(t,ok)=>{m.textContent=t;m.className='msg '+(ok?'ok':'err');m.hidden=false};
  const tok=$('#tok').value.trim();if(!tok){say('أدخل مفتاح النشر على GitHub في قسم «نشر التعديلات» أولاً.',false);return}
  LS.set('khabar-token',tok);b.disabled=true;say('جارٍ إرسال أمر التشغيل…',true);
  try{
    const r=await fetch(`https://api.github.com/repos/${CFG.REPO}/actions/workflows/khabar-agent.yml/dispatches`,{method:'POST',headers:{Authorization:'Bearer '+tok,Accept:'application/vnd.github+json'},body:JSON.stringify({ref:CFG.BRANCH||'main',inputs:{mode:b.dataset.run}})});
    if(r.status===204)say('بدأ التشغيل. تظهر النتيجة في التطبيق خلال دقائق (الخلاصة الكاملة تستغرق 10 إلى 20 دقيقة).',true);
    else throw new Error(r.status===401?'المفتاح غير صالح أو منتهي.':r.status===403||r.status===404?'المفتاح لا يملك صلاحية Actions: Read and write على المستودع.':'رفض GitHub الطلب ('+r.status+').');
  }catch(e){say(e.message,false)}finally{b.disabled=false}
});
async function collect(){
  const out=JSON.parse(JSON.stringify(ADMIN));
  const until=$('#b-until').value?new Date($('#b-until').value).toISOString():'';
  out.breaking={on:$('#b-on').checked,text_ar:$('#b-ar').value.trim(),text_en:$('#b-en').value.trim(),source:$('#b-src').value.trim(),url:$('#b-url').value.trim(),until};
  out.hidden=[...document.querySelectorAll('#hide-list input:checked')].map(x=>x.value);
  out.marsad_hidden=[...document.querySelectorAll('#marsad-list input:checked')].map(x=>x.value);
  const p1=$('#np1').value,p2=$('#np2').value;
  if(p1||p2){if(p1.length<10)throw new Error('كلمة المرور الجديدة يجب أن تكون 10 أحرف على الأقل.');if(p1!==p2)throw new Error('كلمتا المرور غير متطابقتين.');out.auth.hash=await hash(p1)}
  if(!out.auth.hash)out.auth.hash=DEFAULT_HASH;
  if(out.breaking.on){
    if(!out.breaking.text_ar&&!out.breaking.text_en)throw new Error('اكتب نص الخبر العاجل أو ألغِ تفعيل الشريط.');
    if(!out.breaking.source)throw new Error('لا يُنشر عاجل دون اسم مصدره.');
    if(!/^https:\/\/\S+\.\S+/.test(out.breaking.url))throw new Error('أدخل رابط الخبر الأصلي، ويبدأ بـ https://');
  }
  out.updated=new Date().toISOString();return out;
}
async function preview(){try{$('#preview').textContent=JSON.stringify(await collect(),null,1)}catch(e){$('#preview').textContent=e.message}}
const b64=s=>btoa(unescape(encodeURIComponent(s)));
$('#publish').onclick=async()=>{
  let data;try{data=await collect()}catch(e){msg(e.message,false);return}
  const tok=$('#tok').value.trim();if(!tok){msg('أدخل مفتاح النشر على GitHub أولاً، أو انسخ ملف الإعدادات وأرسله للدعم الفني.',false);return}
  LS.set('khabar-token',tok);const btn=$('#publish');btn.disabled=true;msg('جارٍ النشر…',true);
  const api=`https://api.github.com/repos/${CFG.REPO}/contents/${PATH}`,H={Authorization:'Bearer '+tok,Accept:'application/vnd.github+json'};
  try{
    const cur=await fetch(api+'?ref='+(CFG.BRANCH||'main'),{headers:H});if(!cur.ok)throw new Error(cur.status===401?'المفتاح غير صالح أو منتهي.':cur.status===404?'المفتاح لا يملك صلاحية على المستودع.':'تعذّر الوصول إلى GitHub ('+cur.status+').');
    const sha=(await cur.json()).sha;
    const put=await fetch(api,{method:'PUT',headers:H,body:JSON.stringify({message:'خبر: تحديث العاجل وإعدادات العرض من لوحة الإدارة',content:b64(JSON.stringify(data,null,1)+'\n'),sha,branch:CFG.BRANCH||'main'})});
    if(!put.ok)throw new Error(put.status===403?'المفتاح لا يملك صلاحية الكتابة (Contents: Read and write).':'رفض GitHub النشر ('+put.status+').');
    ADMIN=data;if(data.auth.hash)S.set('khabar-admin',data.auth.hash);$('#np1').value='';$('#np2').value='';
    msg('نُشرت التعديلات. تظهر في التطبيق خلال دقيقة إلى دقيقتين بعد تحديث GitHub Pages.',true);
  }catch(e){msg(e.message,false)}finally{btn.disabled=false}
};
$('#copy-json').onclick=async()=>{let d;try{d=JSON.stringify(await collect(),null,1)}catch(e){msg(e.message,false);return}
  try{await navigator.clipboard.writeText(d);toast('نُسخ ملف الإعدادات')}catch(e){const ta=el('textarea');ta.value=d;document.body.append(ta);ta.select();try{document.execCommand('copy')}catch(x){}ta.remove();toast('نُسخ ملف الإعدادات')}};
boot();
})();
