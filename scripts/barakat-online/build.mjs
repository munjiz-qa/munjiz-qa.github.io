// يولّد محرك خادم بركات من شيفرة الموقع نفسها (barakat/index.html) حتى تبقى قواعد العمل واحدة في الواجهة والخادم.
// node scripts/barakat-online/build.mjs  →  scripts/barakat-online/function/engine.js
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(HERE,'../../barakat/index.html'),'utf8');
const m=html.match(/<script>\n"use strict";([\s\S]*?)<\/script>\n<\/body>/);if(!m)throw new Error('main script not found');
let js=m[1];
const must=(a,b)=>{if(!js.includes(a))throw new Error('missing: '+a);js=js.replace(a,b)};
must('const go=h=>','let go=h=>');
const prelude=`// مولَّد آلياً من barakat/index.html — لا تعدّله يدوياً.
globalThis.BARAKAT_SERVER=true;
const __ls=new Map();
const __el={addEventListener(){},removeEventListener(){},dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false}},style:{},querySelector(){return null},querySelectorAll(){return []},textContent:'',innerHTML:''};
const document={querySelector(){return __el},querySelectorAll(){return []},addEventListener(){},createElement(){return __el},body:__el,fonts:{ready:Promise.resolve()},hidden:true};
const window={addEventListener(){},print(){}};
const location={hash:'',protocol:'server:',hostname:'server',search:''};
const navigator={};
const localStorage={getItem:k=>__ls.has(k)?__ls.get(k):null,setItem:(k,v)=>{if(k!=='barakat_db_v1')__ls.set(k,String(v))},removeItem:k=>{__ls.delete(k)}};
`;
const tail=`
export const E={get db(){return db},set db(v){db=v},FORMS,ACTS,seed,normDb,logA,notify,need,r2,money,uid,now,phoneDigits,fphone,normName,fdate,PRODUCTS,FUNDS,PLANS,ACC,
  me:()=>me(),setMe(id){if(id)__ls.set(SKEY,id);else __ls.delete(SKEY)},
  hook(fx){toast=m=>{fx.push(['toast',String(m)])};dialog=h=>{fx.push(['dialog',String(h)])};closeDlg=()=>{fx.push(['close'])};render=()=>{fx.push(['render'])};go=h=>{fx.push(['go',String(h)])}}};
`;
fs.writeFileSync(path.join(HERE,'function/engine.js'),prelude+'"use strict";'+js+tail);
console.log('engine.js',(prelude.length+js.length+tail.length)+' bytes');
