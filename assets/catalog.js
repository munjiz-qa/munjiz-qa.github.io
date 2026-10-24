'use strict';
// Services, prices and packages edited in the admin panel. Loaded right after data.js and details.js:
// the last saved version is applied at once from this browser's copy, then the server is asked whether there is a newer one.
// With nothing saved on the server, the built-in data.js and details.js stay as they are.
(function(){
const KEY='munjiz_catalog';
const DT=typeof DATA!=='undefined'?DATA:null;
const BUILT={data:Object.assign({},DT||{}),details:window.DETAILS||{}};
// what the management chose to hide (one service, a whole authority or field, a package) is left out for visitors
function visible(c){const h=(c.details&&c.details._hidden)||{},S=new Set(h.s||[]),G=new Set(h.g||[]),P=new Set(h.p||[]),d=c.data;
  return {G:d.G.filter(g=>!G.has(g[0])).map(g=>[g[0],g[1],g[2].filter(x=>!S.has(x[0]))]).filter(g=>g[2].length),
    SETUP:G.has('PK')?[]:d.SETUP.filter(x=>!S.has(x[0])),
    CONSULT:(d.CONSULT||[]).filter(k=>!G.has(k.code)).map(k=>Object.assign({},k,{items:k.items.filter(x=>!S.has(x.c))})).filter(k=>k.items.length),
    PLANS:d.PLANS.filter(x=>!P.has(x.key))}}
// the saved list is shown on public pages, so every text is cleaned of < and > and every code must look like XX-00
const CODE=/^[A-Z]{2}-\d{2,3}$/,GCODE=/^[A-Z]{2,3}$/;
function clean(v){if(typeof v==='string')return v.replace(/[<>"`]/g,'');if(Array.isArray(v))return v.map(clean);if(v&&typeof v==='object'){const o={};Object.keys(v).forEach(x=>{o[x]=clean(v[x])});return o}return v}
function tidy(c){const d=clean(c.data),num=x=>Math.max(0,+x||0);
  d.G=(d.G||[]).filter(g=>Array.isArray(g)&&GCODE.test(g[0])).map(g=>[g[0],g[1],(g[2]||[]).filter(s=>CODE.test(s[0])).map(s=>{s=s.slice();s[3]=num(s[3]);return s})]);
  d.SETUP=(d.SETUP||[]).filter(s=>CODE.test(s[0])).map(s=>{s=s.slice();s[3]=num(s[3]);return s});
  d.CONSULT=(d.CONSULT||[]).filter(k=>GCODE.test(k.code)).map(k=>Object.assign(k,{items:(k.items||[]).filter(s=>CODE.test(s.c)).map(s=>Object.assign(s,{p:num(s.p)}))}));
  d.PLANS=(d.PLANS||[]).filter(p=>/^[a-z0-9_-]{1,20}$/i.test(p.key)).map(p=>Object.assign(p,{n:num(p.n),m:num(p.m),y:num(p.y),extra:num(p.extra)}));
  return {ver:c.ver,data:d,details:clean(c.details)}}
// services changed in the code after the last save in the admin panel (code: time of the change).
// While the saved list is older, the code's version of these services is used (added after the service before it if missing);
// the next save in the admin panel keeps them, and from then on the admin panel decides.
const UPD_AT=Date.UTC(2026,9,23,3,0),UPD=['MC-05','MC-06','MC-07'];
function withUpd(c){if(!c.ver||+c.ver>=UPD_AT)return c;const d=Object.assign({},c.data),det=Object.assign({},c.details),bd=BUILT.details;
  d.G=(d.G||[]).map(g=>{const bg=(BUILT.data.G||[]).find(x=>x[0]===g[0]);if(!bg)return g;const list=g[2].slice();
    UPD.forEach(code=>{const bi=bg[2].findIndex(x=>x[0]===code);if(bi<0)return;const item=bg[2][bi].slice(),i=list.findIndex(x=>x[0]===code);
      if(i>=0)list[i]=item;else{const prev=bi>0?list.findIndex(x=>x[0]===bg[2][bi-1][0]):-1;list.splice(prev+1,0,item)}
      if(bd[code])det[code]=bd[code]});
    return [g[0],g[1],list]});
  return Object.assign({},c,{data:d,details:det})}
// 2026-10-24 the management asked to show every service: a list saved before ALL_AT shows everything again (nothing hidden)
// and gets back any service, authority, field or package of the code that it lacks. A save after ALL_AT decides from then on.
const ALL_AT=Date.UTC(2026,9,24,9,20);
function withAll(c){if(!c.ver||+c.ver>=ALL_AT)return c;const b=BUILT.data,bd=BUILT.details,d=Object.assign({},c.data),det=Object.assign({},c.details);
  const fill=(list,blist,key)=>{list=list.slice();blist.forEach((x,bi)=>{if(list.some(y=>key(y)===key(x)))return;
    const prev=bi>0?list.findIndex(y=>key(y)===key(blist[bi-1])):-1;list.splice(prev<0?list.length:prev+1,0,JSON.parse(JSON.stringify(x)))});return list};
  const gk=new Set((d.CONSULT||[]).map(k=>k.code));
  d.G=fill((d.G||[]).map(g=>{const bg=(b.G||[]).find(x=>x[0]===g[0]);return bg?[g[0],g[1],fill(g[2],bg[2],x=>x[0])]:g}),(b.G||[]).filter(g=>!gk.has(g[0])),g=>g[0]);
  d.SETUP=fill(d.SETUP||[],b.SETUP||[],x=>x[0]);
  d.CONSULT=fill((d.CONSULT||[]).map(k=>{const bk=(b.CONSULT||[]).find(x=>x.code===k.code);return bk?Object.assign({},k,{items:fill(k.items||[],bk.items,x=>x.c)}):k}),(b.CONSULT||[]).filter(k=>!(d.G||[]).some(g=>g[0]===k.code)),k=>k.code);
  d.PLANS=fill(d.PLANS||[],b.PLANS||[],x=>x.key);
  Object.keys(bd).forEach(k=>{if(!(k in det))det[k]=bd[k]});
  det._hidden={s:[],g:[],p:[]};
  return Object.assign({},c,{data:d,details:det})}
// groups added to the site after the last save in the admin panel: shown even when a saved list exists, unless hidden there
const NEW=['AD','MK','EC'];
function withNew(c){c=withUpd(withAll(c));const d=Object.assign({},c.data),b=BUILT.data,has=new Set([...(d.G||[]).map(g=>g[0]),...(d.CONSULT||[]).map(k=>k.code)]);
  d.G=[...(d.G||[]),...(b.G||[]).filter(g=>NEW.includes(g[0])&&!has.has(g[0]))];
  d.CONSULT=[...(d.CONSULT||[]),...(b.CONSULT||[]).filter(k=>NEW.includes(k.code)&&!has.has(k.code))];
  const det=Object.assign({},c.details),bd=BUILT.details;Object.keys(bd).forEach(k=>{if(/^[A-Z]{2}-/.test(k)&&NEW.includes(k.slice(0,2))&&!(k in det))det[k]=bd[k]});
  if(bd._entities)det._entities=Object.assign({},bd._entities,det._entities);
  return Object.assign({},c,{data:d,details:det})}
function use(c){if(!c||!c.data||!c.details||!DT)return false;c=withNew(c);c=tidy(c);const v=window.CATALOG_ALL?c.data:visible(c);
  Object.keys(DT).forEach(k=>delete DT[k]);Object.assign(DT,v);window.DETAILS=c.details;return true}
let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
if(saved)use(saved);
window.CATALOG={get ver(){return saved?saved.ver:''},use,visible,
  raw(){return JSON.parse(JSON.stringify(saved?withNew({ver:saved.ver,data:saved.data,details:saved.details}):BUILT))},
  remember(c){saved=c&&c.ver?c:null;try{saved?localStorage.setItem(KEY,JSON.stringify(saved)):localStorage.removeItem(KEY)}catch(e){}}};
const t0=Date.now();let touched=false;['pointerdown','keydown','input'].forEach(e=>addEventListener(e,()=>{touched=true},{once:true,capture:true}));
function check(){const api=(window.MUNJIZ_CONFIG||{}).API;if(!api)return;
  fetch(api,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'catalog',ver:saved?saved.ver:''})}).then(r=>r.json()).then(j=>{
    if(!j||!j.ok||j.same)return;const was=saved?saved.ver:'';if(j.ver===was)return;
    window.CATALOG.remember(j.ver?{ver:j.ver,data:j.data,details:j.details}:null);
    // a newer list: show it now if the visitor has only just arrived and not touched anything yet, otherwise on the next page
    let once=false;try{once=sessionStorage.getItem(KEY+'_r')===j.ver;sessionStorage.setItem(KEY+'_r',j.ver)}catch(e){}
    if(!once&&!touched&&Date.now()-t0<8000)location.reload()}).catch(()=>{})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',check);else check();
})();
