// «خبر»: يجلب أحدث العناوين لكل دائرة (قطر، الخليج، مصر، العالم) من أخبار Google (RSS)، ويحفظ العنوان والمصدر والرابط والتاريخ فقط في khabar/data/headlines.json.
// يعمل من GitHub Actions كل 3 ساعات. لا يُحفظ أي عنوان دون مصدر ورابط.
import {writeFileSync,readFileSync} from 'node:fs';
const OUT='khabar/data/headlines.json';
const Q={
 qatar:{ar:'(قطر OR الدوحة OR القطري) when:1d',en:'(Qatar OR Doha) (Amir OR minister OR ministry OR government OR economy OR QatarEnergy OR "Qatar Airways" OR QNA) when:1d',must:{ar:/قطر|القطري|الدوحة/,en:/Qatar|Doha|Qatari/i}},
 gulf:{ar:'(السعودية OR الإمارات OR الكويت OR سلطنة عمان OR البحرين OR مجلس التعاون الخليجي) when:1d',en:'(Saudi OR UAE OR Kuwait OR Oman OR Bahrain OR GCC) when:1d',must:{ar:/السعودي|الإمارات|الكويت|عمان|عُمان|البحرين|الخليج|الرياض|أبوظبي|دبي|مسقط|المنامة/,en:/Saudi|UAE|Emirat|Kuwait|Oman|Bahrain|Gulf|GCC|Riyadh|Abu Dhabi|Dubai|Muscat|Manama/i}},
 egypt:{ar:'(مصر OR القاهرة OR المصري) when:1d',en:'(Egypt OR Cairo) when:1d',must:{ar:/مصر|المصري|القاهرة/,en:/Egypt|Cairo/i}},
 world:{ar:'(دولي OR العالم OR الأمم المتحدة OR واشنطن OR أوروبا OR الصين) when:1d',en:'("United Nations" OR summit OR diplomacy OR ceasefire OR election OR "global economy" OR markets) when:1d',must:{ar:/./,en:/./}}
};
// headlines that slip in from ads, lifestyle and minor sport
const SKIP=/franchis|pizz|testimonial|horoscope|recipe|gymnast|coupon|promo code|برج|حظك|وصفة/i;
const LOC={ar:'hl=ar&gl=QA&ceid=QA:ar',en:'hl=en-QA&gl=QA&ceid=QA:en'};
const ent=s=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&amp;/g,'&');
const text=s=>ent(s||'').replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim();
const tag=(x,t)=>(x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`))||[])[1]||'';
async function get(zone,lang){
  const q=Q[zone],url=`https://news.google.com/rss/search?q=${encodeURIComponent(q[lang])}&${LOC[lang]}`;
  const r=await fetch(url,{headers:{'user-agent':'Mozilla/5.0 khabar-headlines'}});if(!r.ok)throw new Error(zone+' '+lang+' '+r.status);
  const xml=await r.text(),out=[],seen=new Set();
  for(const it of xml.split('<item>').slice(1)){
    let title=text(tag(it,'title')),source=text(tag(it,'source')),link=text(tag(it,'link'));
    if(source&&title.endsWith(' - '+source))title=title.slice(0,-(source.length+3));
    if(!/^https:\/\//.test(link)||!title||!source||seen.has(title)||!q.must[lang].test(title)||SKIP.test(title))continue;seen.add(title);
    const d=new Date(text(tag(it,'pubDate')));if(isNaN(d))continue;
    out.push({title:title.slice(0,220),source:source.slice(0,80),link,date:d.toISOString().slice(0,10),t:+d});
  }
  return out.sort((a,b)=>b.t-a.t).slice(0,10).map(({t,...x})=>x);
}
let prev={};try{prev=JSON.parse(readFileSync(OUT,'utf8'))}catch(e){}
const res={updated:new Date().toISOString()};let total=0;
for(const z of Object.keys(Q)){res[z]={};for(const l of ['ar','en']){try{res[z][l]=await get(z,l);total+=res[z][l].length}catch(e){console.error(e.message);res[z][l]=prev[z]?.[l]||[]}}}
if(!total){console.error('no headlines fetched; keeping the previous file');process.exit(0)}
writeFileSync(OUT,JSON.stringify(res,null,1)+'\n');console.log('headlines',total);
