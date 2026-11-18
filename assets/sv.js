/* إحصاء الزيارات (انظر سياسة الخصوصية) */
(function(){try{
var E='https://sijil.baseeratactions.workers.dev/c',L=location,P=L.pathname,H=L.hostname,n=navigator;
if(n.webdriver||/^(localhost|127\.)/.test(H)||/\/(crm[\w-]*\.html|admin\/|qutb\/)/.test(P))return;
var M={'baseeratactions.com':'basira','www.baseeratactions.com':'basira','munjiz-qa.github.io':'munjiz'},g=P.split('/')[1]||'',c=document.currentScript,s=c&&c.getAttribute('data-s');
if(!s)s=/\.github\.io$/.test(H)&&g&&g.indexOf('.')<0&&g!=='en'?g:(M[H]||H.split('.')[0]);
var id=null,ls=window.localStorage;
try{[s+'_who',s+'_reg'].forEach(function(k){if(id)return;var v=JSON.parse(ls.getItem(k)||'null');if(v&&(v.name||v.email||v.phone))id={n:v.name||'',e:v.email||'',ph:v.phone||''}})}catch(e){}
var d=JSON.stringify({s:s,p:P,t:document.title.slice(0,150),r:document.referrer||'',l:n.language||'',w:screen.width+'x'+screen.height,id:id});
var b=new Blob([d],{type:'text/plain'});
if(!(n.sendBeacon&&n.sendBeacon(E,b)))fetch(E,{method:'POST',body:d,keepalive:true,mode:'no-cors',credentials:'omit'}).catch(function(){});
}catch(e){}})();
