// يجلب عناوين أخبار الأعمال والشركات والاستثمار والأسعار في قطر من أخبار Google (RSS) ويحفظها نصاً فقط في data/news.json. يعمل من GitHub Actions.
import {writeFileSync} from 'node:fs';
const Q={
  ar:['(شركات OR استثمار OR بورصة OR الأعمال OR القطاع الخاص OR وزارة التجارة) قطر','(أسعار OR الأسعار OR التضخم OR الوقود OR الذهب OR العقارات) قطر'],
  en:['Qatar (business OR companies OR investment OR QSE OR "private sector" OR SMEs OR "Ministry of Commerce")','Qatar (prices OR inflation OR fuel OR gold OR "real estate" OR consumer)']};
const FEEDS=Object.fromEntries(Object.entries(Q).map(([k,qs])=>[k,qs.map(q=>`https://news.google.com/rss/search?q=${encodeURIComponent(q+' when:2d')}&${k==='ar'?'hl=ar&gl=QA&ceid=QA:ar':'hl=en-QA&gl=QA&ceid=QA:en'}`)]));
// keep only headlines that are about Qatar
const MUST={ar:/قطر|القطري|الدوحة|بورصة|مصرف قطر/,en:/Qatar|Doha|QSE|QNB|QIA/};
// skip sport, politics and crime headlines that slip into business searches
const SKIP={ar:/مباراة|منتخب|كأس|الدوري|غزة|حرب|قصف|اعتقال/,en:/match|football|World Cup|league|Gaza|war|strike kills|arrest/i};
const ent=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&amp;/g,'&');
const text=s=>ent(s||'').replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim();
const tag=(x,t)=>(x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))||[])[1]||'';
async function get(url,k){
  const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 munjiz-news'}});if(!r.ok)throw new Error(url+' '+r.status);
  const xml=await r.text(),out=[],seen=new Set();
  for(const it of xml.split('<item>').slice(1)){
    let title=text(tag(it,'title')),source=text(tag(it,'source')),link=text(tag(it,'link'));
    if(source&&title.endsWith(' - '+source))title=title.slice(0,-(source.length+3));
    if(!/^https:\/\//.test(link)||!title||seen.has(title)||!MUST[k].test(title)||SKIP[k].test(title))continue;seen.add(title);
    const d=new Date(text(tag(it,'pubDate')));
    out.push({title:title.slice(0,200),link,source:source.slice(0,60),date:isNaN(d)?'':d.toISOString().slice(0,10),t:isNaN(d)?0:+d});
  }
  return out.sort((a,b)=>b.t-a.t).slice(0,8).map(({t,...x})=>x);
}
const res={updated:new Date().toISOString()};
for(const [k,urls] of Object.entries(FEEDS)){const all=[];for(const u of urls){try{all.push(...await get(u,k))}catch(e){console.error(e.message)}}
  const seen=new Set();res[k]=all.filter(x=>!seen.has(x.title)&&seen.add(x.title)).sort((a,b)=>(b.date||'').localeCompare(a.date||'')).slice(0,10)}
if(!res.ar.length&&!res.en.length){console.error('no news fetched; keeping the previous file');process.exit(0)}
writeFileSync('data/news.json',JSON.stringify(res,null,1)+'\n');console.log('ar',res.ar.length,'en',res.en.length);
