// يجلب عناوين أخبار الاقتصاد في قطر من أخبار Google (RSS) ويحفظها نصاً فقط في data/news.json. يعمل من GitHub Actions.
import {writeFileSync} from 'node:fs';
const FEEDS={
  ar:'https://news.google.com/rss/search?q=%D8%A7%D9%82%D8%AA%D8%B5%D8%A7%D8%AF+%D9%82%D8%B7%D8%B1+when:2d&hl=ar&gl=QA&ceid=QA:ar',
  en:'https://news.google.com/rss/search?q=Qatar+economy+OR+%22Qatar+Stock+Exchange%22+OR+QSE+when:2d&hl=en-QA&gl=QA&ceid=QA:en'};
const ent=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&amp;/g,'&');
const text=s=>ent(s||'').replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim();
const tag=(x,t)=>(x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))||[])[1]||'';
async function get(url){
  const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 munjiz-news'}});if(!r.ok)throw new Error(url+' '+r.status);
  const xml=await r.text(),out=[],seen=new Set();
  for(const it of xml.split('<item>').slice(1)){
    let title=text(tag(it,'title')),source=text(tag(it,'source')),link=text(tag(it,'link'));
    if(source&&title.endsWith(' - '+source))title=title.slice(0,-(source.length+3));
    if(!/^https:\/\//.test(link)||!title||seen.has(title))continue;seen.add(title);
    const d=new Date(text(tag(it,'pubDate')));
    out.push({title:title.slice(0,200),link,source:source.slice(0,60),date:isNaN(d)?'':d.toISOString().slice(0,10),t:isNaN(d)?0:+d});
  }
  return out.sort((a,b)=>b.t-a.t).slice(0,8).map(({t,...x})=>x);
}
const res={updated:new Date().toISOString()};
for(const [k,u] of Object.entries(FEEDS)){try{res[k]=await get(u)}catch(e){console.error(e.message);res[k]=[]}}
if(!res.ar.length&&!res.en.length){console.error('no news fetched; keeping the previous file');process.exit(0)}
writeFileSync('data/news.json',JSON.stringify(res,null,1)+'\n');console.log('ar',res.ar.length,'en',res.en.length);
