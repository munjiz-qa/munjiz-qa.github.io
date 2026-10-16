'use strict';
// Site texts the manager edits (لوحة الإدارة ← الإعدادات ← نصوص الموقع): company name in the header, the home hero,
// the four promises, the short «تعرّف إلى منجز» text, and the phone, WhatsApp and email used everywhere.
// Loaded right after config.js (or at the end of pages without it): applies the last saved texts at once,
// then asks the server for the current ones. An empty field keeps the page's own text. Text is set with textContent only.
(function(){
const KEY='munjiz_site',EN=document.documentElement.lang==='en',DEF_WA='97451600498',DEF_MAIL='munijizqa@gmail.com';
const L=EN?'en':'ar';
// where each text lives on the page; read() gives the built-in text, put() replaces it
const q=(d,s)=>d.querySelector(s);
const lastText=el=>{if(!el)return null;const t=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim());return t[t.length-1]||null};
const firstText=el=>{if(!el)return null;return [...el.childNodes].find(n=>n.nodeType===3&&n.textContent.trim())||null};
const SLOTS={
  brand:d=>lastText(q(d,'header .brand')),
  h1:d=>firstText(q(d,'#home h1')),
  h1em:d=>q(d,'#home h1 em'),
  lead:d=>q(d,'#home h1 + p'),
  trust:d=>q(d,'#home .trust'),
  p1t:d=>q(d,'#home .promise:nth-child(1) b'),p1s:d=>q(d,'#home .promise:nth-child(1) span'),
  p2t:d=>q(d,'#home .promise:nth-child(2) b'),p2s:d=>q(d,'#home .promise:nth-child(2) span'),
  p3t:d=>q(d,'#home .promise:nth-child(3) b'),p3s:d=>q(d,'#home .promise:nth-child(3) span'),
  p4t:d=>q(d,'#home .promise:nth-child(4) b'),p4s:d=>q(d,'#home .promise:nth-child(4) span'),
  slogan:d=>q(d,'#about .slogan'),
  about:d=>q(d,'#about .lead')};
function read(d){const o={};Object.keys(SLOTS).forEach(k=>{const n=SLOTS[k](d);o[k]=n?n.textContent.trim():''});return o}
const digits=s=>String(s||'').replace(/\D/g,'');
const showPhone=w=>/^974\d{8}$/.test(w)?'+974 '+w.slice(3):'+'+w;
function apply(s){if(!s)return;const t=s[L]||{};
  Object.keys(SLOTS).forEach(k=>{if(!t[k])return;const n=SLOTS[k](document);if(!n)return;
    if(n.nodeType===3){const lead=n.textContent.match(/^\s*/)[0],tail=n.textContent.match(/\s*$/)[0];n.textContent=lead+t[k]+tail}else n.textContent=t[k]});
  const C=window.MUNJIZ_CONFIG;
  const wa=/^\d{8,15}$/.test(s.wa||'')?s.wa:'',ph=/^\d{8,15}$/.test(s.phone||'')?s.phone:wa,em=/^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(s.email||'')?s.email:'';
  if(C){if(wa)C.WHATSAPP=wa;if(ph)C.PHONE=showPhone(ph);if(em)C.EMAIL=em}
  if(wa)document.querySelectorAll('a[href*="wa.me/"]').forEach(a=>{a.href=a.href.replace(/wa\.me\/\d+/,'wa.me/'+wa)});
  if(ph)document.querySelectorAll('a[href^="tel:"]').forEach(a=>{a.href='tel:+'+ph});
  if(em)document.querySelectorAll('a[href^="mailto:"]').forEach(a=>{a.href=a.href.replace(/^mailto:[^?]*/,'mailto:'+em)});
  // visible copies of the phone and email in text
  const oldPh=[showPhone(DEF_WA),'+'+DEF_WA,DEF_WA],swaps=[];
  if(ph)oldPh.forEach(o=>swaps.push([o,showPhone(ph)]));if(em)swaps.push([DEF_MAIL,em]);
  if(!swaps.length||!document.body)return;
  const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
  while((n=w.nextNode())){let v=n.textContent,c=v;for(const [o,x] of swaps)if(o!==x&&c.includes(o))c=c.split(o).join(x);if(c!==v)n.textContent=c}}
let saved=null;try{saved=JSON.parse(localStorage.getItem(KEY)||'null')}catch(e){}
const run=()=>apply(saved&&saved.s);
if(document.body)run();else document.addEventListener('DOMContentLoaded',run);
window.SITE_TEXT={read,apply,SLOTS,
  remember(s){saved={s,at:Date.now()};try{localStorage.setItem(KEY,JSON.stringify(saved))}catch(e){}},
  get current(){return (saved&&saved.s)||null}};
// refresh from the server at most every 10 minutes; a change shows at once on this page
function refresh(){const api=(window.MUNJIZ_CONFIG||{}).API;if(!api||(saved&&Date.now()-saved.at<6e5))return;
  fetch(api,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'site'})}).then(r=>r.json()).then(j=>{
    if(!j||!j.ok)return;const before=JSON.stringify(saved&&saved.s||null);window.SITE_TEXT.remember(j.site||null);
    if(JSON.stringify(j.site||null)!==before&&j.site)apply(j.site)}).catch(()=>{})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
})();
