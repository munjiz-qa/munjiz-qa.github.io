'use strict';
// «خبر»: حسابات المستخدمين. السجل في data/users.json، وكلمات المرور مشتقة (PBKDF2-SHA256 مع ملح لكل مستخدم) فلا تُحفظ نصاً في أي مكان.
// الأدوار: super = مدير شامل بكل الصلاحيات، client = عميل.
window.KhabarAuth = (function(){
const ITER = 150000;
const ROLES = {super: {ar: 'مدير شامل', en: 'Super admin'}, client: {ar: 'عميل', en: 'Client'}};
const hex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = s => new Uint8Array(s.match(/../g).map(h => parseInt(h, 16)));
async function derive(pass, saltHex, iter){
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: iter || ITER}, k, 256));
}
async function hashNew(pass){
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return {salt, hash: await derive(pass, salt, ITER)};
}
async function load(base){
  const r = await fetch((base || '') + 'data/users.json?t=' + Date.now(), {cache: 'no-store'});
  if (!r.ok) throw new Error('users ' + r.status);
  const j = await r.json(); j.users = j.users || []; return j;
}
// يعيد المستخدم عند صحة البيانات، وإلا null. لا يُقبل حساب معطّل.
async function verify(db, user, pass){
  const u = String(user || '').trim().toLowerCase();
  const rec = db.users.find(x => x.u === u);
  if (!rec || rec.active === false) return null;
  return (await derive(pass, rec.salt, db.iter)) === rec.hash ? rec : null;
}
const store = st => ({get(k){try{return JSON.parse(st().getItem(k))}catch(e){return null}}, set(k, v){try{st().setItem(k, JSON.stringify(v))}catch(e){}}, del(k){try{st().removeItem(k)}catch(e){}}});
return {ITER, ROLES, derive, hashNew, load, verify, local: store(() => localStorage), session: store(() => sessionStorage)};
})();
