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
// groups added to the site after the last save in the admin panel: shown even when a saved list exists, unless hidden there
const NEW=['AD','MK','EC'];
function withNew(c){const d=Object.assign({},c.data),b=BUILT.data,has=new Set([...(d.G||[]).map(g=>g[0]),...(d.CONSULT||[]).map(k=>k.code)]);
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
  raw(){return JSON.parse(JSON.stringify(saved?withNew({data:saved.data,details:saved.details}):BUILT))},
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
