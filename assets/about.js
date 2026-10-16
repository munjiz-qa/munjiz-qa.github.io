// أخبار الاقتصاد القطري في صفحة «تعرّف إلى منجز»: نص فقط وروابط http(s)
(function(){
  const box=document.getElementById('anews');if(!box)return;
  const EN=document.documentElement.lang==='en';
  fetch((EN?'../':'')+'data/news.json',{cache:'no-cache'}).then(r=>r.ok?r.json():null).then(d=>{
    const list=(d&&d[EN?'en':'ar'])||[];if(!list.length)return;
    box.textContent='';
    list.slice(0,5).forEach(n=>{
      const li=document.createElement('li');let el=li;
      if(/^https?:\/\//i.test(n.link||'')){el=document.createElement('a');el.href=n.link;el.target='_blank';el.rel='noopener noreferrer nofollow';li.appendChild(el)}
      el.textContent=String(n.title||'');
      const s=document.createElement('small');s.textContent=[n.source,n.date].filter(Boolean).join(' · ');li.appendChild(s);
      box.appendChild(li);
    });
    box.closest('section').hidden=false;
  }).catch(()=>{});
})();
