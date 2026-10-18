'use strict';
// The account signed in on this device, shown in the header of every public page and of «حسابي» (portal.html).
// Only a client account is ever shown here. The admin panel (crm.html) has its own sign-in, kept apart, and shows its own account.
(function(){
const B='munjiz',EN=document.documentElement.lang==='en';
function signed(){try{const p=(localStorage.getItem(B+'_portal')||'').split('.');const w=JSON.parse(localStorage.getItem(B+'_who')||'null');
  return p.length===4&&p[0]==='c'&&+p[2]>Date.now()&&w&&w.name?w:null}catch(e){return null}}
const L=EN?{role:'Client account',out:'Not signed in',tip:'Signed in to My account as'}:{role:'حساب عميل',out:'لم تسجّل الدخول',tip:'مسجّل الدخول إلى «حسابي» باسم'};
function chip(el,w){el.textContent='';const i=document.createElement('span');i.className='aw-ico';i.setAttribute('aria-hidden','true');i.textContent='👤';
  const n=document.createElement('b');n.textContent=w?String(w.name).slice(0,24):L.out;el.append(i,n);
  if(w){const r=document.createElement('small');r.textContent=L.role;el.append(r);el.title=L.tip+' '+w.name+(w.user?' ('+w.user+')':'')}else el.removeAttribute('title')}
function refresh(){const w=signed(),top=document.querySelector('.top');if(!top||!document.body)return;
  document.body.classList.toggle('signed-client',!!w);
  const portal=document.body.classList.contains('portal-page');
  // the header's «حسابي» link becomes the account itself
  const link=[...top.querySelectorAll('a[href]')].find(a=>!a.closest('.lsw')&&!a.hasAttribute('lang')&&/^portal\.html(#|$)/.test(a.getAttribute('href')));
  if(link){if(!link.dataset.t)link.dataset.t=link.textContent;if(w){link.classList.add('acctwho');chip(link,w)}else{link.classList.remove('acctwho');link.textContent=link.dataset.t;link.removeAttribute('title')}
    // on phones the menu folds away, so a short copy stays in the header bar
    let m=document.getElementById('acctWhoM');
    if(!w){if(m)m.remove();return}
    if(!m){m=document.createElement('a');m.id='acctWhoM';m.className='acctwho mob';m.href='portal.html';top.appendChild(m)}
    chip(m,w);m.title=link.title;return}
  let el=document.getElementById('acctWho');
  if(!w&&!portal){if(el)el.remove();return}
  if(!el){el=document.createElement(portal?'span':'a');el.id='acctWho';el.className='acctwho';if(!portal)el.href='portal.html';
    const host=top.querySelector('.plainnav')||top.querySelector('.wrap')||top;host.insertBefore(el,host.firstChild)}
  el.classList.toggle('out',!w);chip(el,w)}
window.ACCT_WHO={refresh,set(w){try{w?localStorage.setItem(B+'_who',JSON.stringify(w)):localStorage.removeItem(B+'_who')}catch(e){}refresh()}};
window.addEventListener('storage',e=>{if(e.key===B+'_who'||e.key===B+'_portal')refresh()});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',refresh);else refresh();
})();
