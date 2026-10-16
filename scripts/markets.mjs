// أسعار السوق اليومية لشريط «اليوم في الدوحة»: الذهب والنفط والعملات مقابل الريال. أرقام فقط، تُحفظ في data/markets.json. يعمل من GitHub Actions.
import {writeFileSync} from 'node:fs';
const UA={headers:{'user-agent':'Mozilla/5.0 munjiz-markets'}};
const PEG=3.64,OZ=31.1034768;
const num=v=>typeof v==='number'&&isFinite(v)&&v>0?v:null;
async function yahoo(sym){const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?range=5d&interval=1d`,UA);if(!r.ok)throw new Error(sym+' '+r.status);
  const j=await r.json(),m=j?.chart?.result?.[0]?.meta;const p=num(m?.regularMarketPrice),c=num(m?.chartPreviousClose)||num(m?.previousClose);if(!p)throw new Error(sym+' no price');return {p,ch:c?+((p-c)/c*100).toFixed(2):null}}
const items=[];
const add=(k,ar,en,v,unitAr,unitEn,ch,src)=>items.push({k,ar,en,v:+v.toFixed(v<10?3:2),uar:unitAr,uen:unitEn,ch:ch??null,src});
try{const g=await yahoo('GC=F');add('gold24','ذهب عيار 24','Gold 24K',g.p*PEG/OZ,'ر.ق/غ','QAR/g',g.ch,'Yahoo Finance');
  add('gold22','ذهب عيار 22','Gold 22K',g.p*PEG/OZ*22/24,'ر.ق/غ','QAR/g',g.ch,'Yahoo Finance')}catch(e){console.error(e.message)}
try{const b=await yahoo('BZ=F');add('brent','نفط برنت','Brent crude',b.p,'$/برميل','$/bbl',b.ch,'Yahoo Finance')}catch(e){console.error(e.message)}
try{const r=await fetch('https://open.er-api.com/v6/latest/QAR',UA);const j=await r.json();if(j.result!=='success')throw new Error('fx');
  const fx=[['USD','الدولار','US dollar'],['EUR','اليورو','Euro'],['GBP','الجنيه الإسترليني','Pound sterling'],['SAR','الريال السعودي','Saudi riyal'],['INR','الروبية الهندية (100)','Indian rupee (100)'],['EGP','الجنيه المصري (100)','Egyptian pound (100)']];
  for(const [c,ar,en] of fx){const rate=num(j.rates?.[c]);if(!rate)continue;const per=c==='INR'||c==='EGP'?100:1;add('fx'+c,ar,en,per/rate,'ر.ق','QAR',null,'ExchangeRate-API')}}catch(e){console.error(e.message)}
if(!items.length){console.error('no market data; keeping the previous file');process.exit(0)}
writeFileSync('data/markets.json',JSON.stringify({updated:new Date().toISOString(),items},null,1)+'\n');console.log(items.length,'market items');
