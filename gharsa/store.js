// طبقة البيانات لمنصة غرسة.
// الوضع المتصل: إن ضُبط SUPABASE_URL و SUPABASE_KEY في config.js يُقرأ المحتوى من جدول gharsa_content،
//   ويحفظ المدير تعديلاته بعد تسجيل دخوله، فتظهر لكل الزوار فوراً.
// الوضع المحلي: بدون قاعدة بيانات تُحفظ التعديلات في متصفح هذا الجهاز فقط (للمعاينة)، ويمكن تصدير الملف.
(function(){
"use strict";
const CFG=window.GHARSA_CONFIG||{};
const URL_=(CFG.SUPABASE_URL||'').replace(/\/+$/,''), KEY=CFG.SUPABASE_KEY||'';
const REMOTE=!!(URL_&&KEY);
const LKEY='gharsa-content-local', SKEY='gharsa-admin-session';
const LOCAL_ADMIN={email:'admin@gharsa.qa',salt:'686a706596ce04c8',hash:'8e57674744ea7e6fff02a3c269925e3196152231e00183836601274b0a13ad79'};
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}},del(k){try{localStorage.removeItem(k)}catch(e){}}};
const clone=o=>JSON.parse(JSON.stringify(o));
function merge(saved){const d=clone(window.GHARSA_DEFAULT);if(!saved||typeof saved!=='object')return d;
  Object.keys(d).forEach(k=>{if(saved[k]!==undefined){d[k]=(k==='site')?Object.assign(d.site,saved.site):saved[k];}});return d;}
async function sha(t){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(t));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');}
function session(){try{const s=JSON.parse(ls.get(SKEY)||'null');if(s&&s.exp>Date.now())return s;}catch(e){}return null;}
async function rest(path,opt={}){const s=session();
  const r=await fetch(URL_+path,Object.assign({},opt,{headers:Object.assign({apikey:KEY,Authorization:'Bearer '+(s&&s.token||KEY),'Content-Type':'application/json'},opt.headers||{})}));
  if(!r.ok){let m='';try{const j=await r.json();m=j.message||j.msg||j.error_description||j.error||''}catch(e){}throw new Error(m||('HTTP '+r.status));}
  const t=await r.text();return t?JSON.parse(t):null;}
window.GharsaStore={
  remote:REMOTE,
  async load(){
    if(REMOTE){const rows=await rest('/rest/v1/gharsa_content?id=eq.main&select=data,updated_at');return merge(rows&&rows[0]&&rows[0].data);}
    const raw=ls.get(LKEY);return raw?merge(JSON.parse(raw)):window.GHARSA_DEFAULT;
  },
  async save(content){
    const data=clone(content);data.updatedAt=new Date().toISOString();
    if(REMOTE){await rest('/rest/v1/gharsa_content?on_conflict=id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:'main',data,updated_at:data.updatedAt})});return data;}
    ls.set(LKEY,JSON.stringify(data));return data;
  },
  async reset(){if(REMOTE){await rest('/rest/v1/gharsa_content?id=eq.main',{method:'DELETE'});return;}ls.del(LKEY);},
  async login(email,pass){
    email=String(email||'').trim().toLowerCase();
    if(REMOTE){const r=await fetch(URL_+'/auth/v1/token?grant_type=password',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password:pass})});
      const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error('البريد أو كلمة المرور غير صحيحة.');
      const s={email,token:j.access_token,exp:Date.now()+(j.expires_in||3600)*1000-60000,mustChange:!!(j.user&&j.user.user_metadata&&j.user.user_metadata.must_change_password)};ls.set(SKEY,JSON.stringify(s));
      const ok=await rest('/rest/v1/rpc/gharsa_is_admin',{method:'POST',body:'{}'}).catch(()=>false);
      if(!ok){ls.del(SKEY);throw new Error('هذا الحساب لا يملك صلاحية الإدارة.');}return s;}
    if(email!==LOCAL_ADMIN.email||await sha(LOCAL_ADMIN.salt+pass)!==LOCAL_ADMIN.hash)throw new Error('البريد أو كلمة المرور غير صحيحة.');
    const s={email,token:'local',exp:Date.now()+8*3600*1000};ls.set(SKEY,JSON.stringify(s));return s;
  },
  async changePassword(pass){
    if(!REMOTE)throw new Error('تغيير كلمة المرور متاح بعد ربط قاعدة البيانات.');
    if(String(pass).length<10)throw new Error('كلمة المرور يجب ألا تقل عن 10 أحرف.');
    await rest('/auth/v1/user',{method:'PUT',body:JSON.stringify({password:pass,data:{must_change_password:false}})});
    const s=session();if(s){s.mustChange=false;ls.set(SKEY,JSON.stringify(s));}
  },
  session, logout(){ls.del(SKEY);}
};
})();
