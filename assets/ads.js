// مساحة الإعلانات في الصفحة الرئيسية: يجلب الإعلانات المفعّلة من خادم منجز ويعرضها نصاً فقط، بعلامة «إعلان».
// الصور والروابط تُقبل بـ https فقط، ولا يُضاف أي HTML من البيانات.
(function(){
  const box=document.getElementById('ads');const C=window.MUNJIZ_CONFIG||{};if(!box||!C.API)return;
  const EN=document.documentElement.lang==='en',L=(a,e)=>EN?e:a;
  const ok=u=>{try{const x=new URL(u);return x.protocol==='https:'?x.href:null}catch(e){return null}};
  const el=(t,c,txt)=>{const n=document.createElement(t);if(c)n.className=c;if(txt!=null)n.textContent=txt;return n};
  const KEY='munjiz_ads_cache';
  const show=list=>{list=(list||[]).filter(a=>a&&((EN?a.titleEn||a.title:a.title||a.titleEn))).slice(0,3);if(!list.length){box.hidden=true;return}
    box.replaceChildren(...list.map(a=>{
      const title=String(EN?a.titleEn||a.title:a.title||a.titleEn).slice(0,80),text=String(EN?a.textEn||a.text||'':a.text||a.textEn||'').slice(0,240);
      const link=ok(a.link),img=ok(a.image);
      const card=el(link?'a':'div','adcard');if(link){card.href=link;card.target='_blank';card.rel='noopener noreferrer sponsored'}
      if(img){const i=el('img');i.src=img;i.alt='';i.loading='lazy';i.referrerPolicy='no-referrer';i.decoding='async';i.onerror=()=>i.remove();card.append(i)}
      const body=el('div','adbody');body.append(el('span','adtag',L('إعلان','Ad')),el('b',null,title));if(text)body.append(el('span','adtxt',text));
      if(link)body.append(el('span','admore',L('التفاصيل ←','Details →')));
      card.append(body);return card}));
    box.classList.toggle('one',list.length===1);box.hidden=false};
  try{const c=JSON.parse(sessionStorage.getItem(KEY)||'null');if(c&&Date.now()-c.t<300000){show(c.ads);return}}catch(e){}
  fetch(C.API,{method:'POST',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'ads'})})
    .then(r=>r.json()).then(j=>{if(!j||!j.ok)return;try{sessionStorage.setItem(KEY,JSON.stringify({t:Date.now(),ads:j.ads}))}catch(e){}show(j.ads)}).catch(()=>{});
})();
