'use strict';
// «عبدو نيوز»: قواعد النشر في شاشة إدارة المحتوى، منقولة من agent/style.py وagent/verify.py كي يُرفض المخالف قبل الحفظ.
// والقواعد نفسها تُفحص مرة ثانية على الخادم (scripts/cms_gate.py) بعد كل نشر من هذه الشاشة، ويُلغى ما يخالفها.
window.KR=(function(){
const BANNED=[
  [/تجدر الإشارة/,'حشو'],[/الجدير بالذكر/,'حشو'],[/(?:^|\s)يُ?ذكر أن/,'حشو'],
  [/في سياق متصل/,'حشو'],[/من جهة أخرى/,'حشو'],[/من ناحية أخرى/,'حشو'],[/على صعيد آخر/,'حشو'],
  [/بشكل (?:كبير|ملحوظ|عام|لافت)/,'تعميم: اكتب الرقم أو الوصف الدقيق'],
  [/(?:^|\s)(?:العديد|الكثير) من/,'تعميم: اكتب العدد أو «عدد من»'],
  [/(?:^|\s)(?:قام|قامت|يقوم|تقوم) ب/,'استعمل الفعل مباشرة'],
  [/في خطوة (?:لافتة|مفاجئة|غير مسبوقة)/,'إنشاء'],[/في رسالة (?:واضحة|عن|إلى|قوية)/,'إنشاء'],
  [/صفيح ساخن/,'إنشاء'],[/يلتقط أنفاسه|تلتقط أنفاسها|يلتقط الذهب أنفاسه/,'إنشاء'],[/ناقوس الخطر/,'إنشاء'],
  [/(?:^|\s)(?:عاجل|شاهد|بالفيديو|بالصور|صادم|لن تصدق|تعرف على|تعرّف على|إليك)(?:\s|$|:)/,'إثارة'],
  [/(?:^|\s)تم (?!ذلك)/,'مبني للمجهول: سمِّ الفاعل'],
  [/(?:^|\s)حيث (?!يقع|تقع)/,'«حيث» رابطاً: استعمل «إذ» أو جملة جديدة'],
  [/!/,'علامة تعجب']
];
const BANNED_EN=[[/\b(?:breaking|shocking|you won't believe|watch:)/i,'عبارة إثارة'],[/!/,'علامة تعجب']];
const REDIRECTORS=['news.google.com','google.com/url','bit.ly','t.co/','lnkd.in','tinyurl.com'];
const SLD=new Set(['gov','com','org','net','edu','co','ac','mil','news']);
const words=s=>((s||'').match(/\S+/g)||[]).length;
const sentences=s=>(s||'').split(/(?<=[.!؟?؛])\s+/).filter(x=>x.trim());
function outlet(url){let h='';try{h=new URL(url).hostname.toLowerCase().replace(/^www\./,'')}catch(e){return ''}const p=h.split('.');return p.length>=3&&SLD.has(p[p.length-2])?p.slice(-3).join('.'):p.slice(-2).join('.')}
const dohaToday=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar'}).format(new Date());

function text(s,where,out,lang,o){
  o=Object.assign({lead:35,body:110,sent:40},o||{});if(!s)return;
  if(lang!=='en'){
    BANNED.forEach(([re,why])=>{const m=s.match(re);if(m)out.push({lvl:/^(مبني|«حيث»)/.test(why)?'warn':'error',where,msg:`عبارة ممنوعة (${why}): «${m[0].trim()}»`})});
    if(/[−–]\s?\d|(?<![\d\w])[+]\d/.test(s))out.push({lvl:'error',where,msg:'إشارة + أو − في النثر: اكتب «بارتفاع» أو «بتراجع»'});
    if(/\b\d{4}\s*(?:بتوقيت|GMT|غ)/.test(s)||/(?:الساعة|عند|حتى)\s+0\d{3}\b/.test(s))out.push({lvl:'error',where,msg:'وقت بصيغة 0600: اكتب «6 صباحاً بتوقيت غرينتش»'});
    if(s.includes('..'))out.push({lvl:'error',where,msg:'نقطتان «..»'});
    if(/\s[،؛.:؟]/.test(s))out.push({lvl:'warn',where,msg:'فراغ قبل علامة ترقيم'});
    if(/[؀-ۿ],\s/.test(s))out.push({lvl:'warn',where,msg:'فاصلة لاتينية في نص عربي'});
    const ss=sentences(s);
    if(o.lead&&ss.length&&words(ss[0])>o.lead)out.push({lvl:'warn',where,msg:`المقدمة ${words(ss[0])} كلمة (الحد ${o.lead})`});
    if(o.sent)ss.slice(1).forEach(x=>{if(words(x)>o.sent)out.push({lvl:'warn',where,msg:`جملة من ${words(x)} كلمة (الحد ${o.sent})`})});
  }else BANNED_EN.forEach(([re,why])=>{if(re.test(s))out.push({lvl:'error',where,msg:why})});
  if(/\s{2,}/.test(s))out.push({lvl:'warn',where,msg:'فراغ مزدوج'});
  if(o.body&&words(s)>o.body*(lang==='en'?1.25:1))out.push({lvl:'warn',where,msg:`النص ${words(s)} كلمة (الحد ${o.body})`});
}
function headline(h,where,out,lang,required){
  if(!h){if(required!==false)out.push({lvl:'error',where,msg:'العنوان مطلوب'});return}
  const n=words(h);
  if(n<4||n>14)out.push({lvl:n>=3&&n<=16?'warn':'error',where,msg:`العنوان ${n} كلمة (المعتمد 5 إلى 12)`});
  if(/[?؟!]/.test(h))out.push({lvl:'error',where,msg:'لا استفهام ولا تعجب في العنوان'});
  if(h.includes('..')||/[.…]\s*$/.test(h))out.push({lvl:'error',where,msg:'لا نقطة في آخر العنوان'});
  text(h,where,out,lang,{lead:0,body:0,sent:0});
}
function source(s){
  const p=[];if(!s)return ['مصدر غير معرّف'];
  if(!s.ar||!s.en)p.push('اسم المصدر ناقص بالعربية أو الإنجليزية');
  const u=s.url||'';
  if(!/^https:\/\/[^\s/]+\.[^\s]+$/.test(u))p.push('الرابط يجب أن يبدأ بـ https:// وأن يكون الرابط الأصلي');
  else if(REDIRECTORS.some(r=>u.includes(r)))p.push('رابط تحويل: ضع الرابط الأصلي للخبر');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s.date||''))p.push('تاريخ النشر مطلوب');
  else if(s.date>dohaToday())p.push('تاريخ نشر في المستقبل');
  return p;
}
// src: قائمة معرّفات، S: سجل المصادر. min: أقل عدد جهات مستقلة مقبول
function sources(src,S,where,out,min){
  const ids=[...new Set(src||[])];
  if(!ids.length){out.push({lvl:'error',where,msg:'لا يُنشر شيء دون مصدر موثّق ورابطه الأصلي'});return}
  ids.forEach(id=>{source(S[id]).forEach(m=>out.push({lvl:'error',where,msg:`${(S[id]&&S[id].ar)||id}: ${m}`}))});
  const outs=new Set(ids.filter(id=>S[id]&&!source(S[id]).length).map(id=>outlet(S[id].url)));
  if(min&&outs.size<min)out.push({lvl:'error',where,msg:`يلزم ${min===2?'جهتان مستقلتان':min+' جهات مستقلة'} على الأقل (نطاقان مختلفان). الآن: ${outs.size}`});
}
function item(it,S,opt){
  const out=[];opt=opt||{};
  if(!(it.cat&&it.cat.ar))out.push({lvl:'error',where:'التصنيف',msg:'التصنيف بالعربية مطلوب'});
  if(!(it.cat&&it.cat.en))out.push({lvl:'error',where:'التصنيف',msg:'التصنيف بالإنجليزية مطلوب'});
  if(!opt.auto){headline(it.h&&it.h.ar,'العنوان بالعربية',out,'ar');headline(it.h&&it.h.en,'العنوان بالإنجليزية',out,'en')}
  if(!it.ar&&!it.en)out.push({lvl:'error',where:'النص',msg:'اكتب نص الخبر'});
  if(!opt.auto&&!it.ar)out.push({lvl:'error',where:'النص بالعربية',msg:'نص الخبر بالعربية مطلوب'});
  if(!opt.auto&&it.h&&it.h.ar&&(it.ar||'').startsWith(it.h.ar.slice(0,25)))out.push({lvl:'warn',where:'النص بالعربية',msg:'الفقرة تبدأ بنص العنوان نفسه'});
  text(it.ar,'النص بالعربية',out,'ar');text(it.en,'النص بالإنجليزية',out,'en');
  if(!it.en)out.push({lvl:'warn',where:'النص بالإنجليزية',msg:'بلا نص إنجليزي لن يظهر الخبر في النسخة الإنجليزية'});
  sources(it.src,S,'المصادر',out,2);return out;
}
function block(b,S,o){ // تحليل، قراءة فنية، استقراء، موعد، مؤشر سوق
  const out=[];o=o||{};
  if(o.need&&!b.ar)out.push({lvl:'error',where:'النص بالعربية',msg:'النص بالعربية مطلوب'});
  text(b.ar,'النص بالعربية',out,'ar',o.rules);text(b.en,'النص بالإنجليزية',out,'en',o.rules);
  if(b.ar||b.en||o.need)sources(b.src,S,'المصادر',out,o.min||1);
  if((o.min||1)<2&&new Set((b.src||[]).filter(id=>S[id]).map(id=>outlet(S[id].url))).size<2&&(b.src||[]).length)out.push({lvl:'warn',where:'المصادر',msg:'يُستحسن مصدران من جهتين مستقلتين'});
  return out;
}
function urls(list,where,out,need){
  if(need&&!list.length)out.push({lvl:'error',where,msg:'أضف رابط مصدر واحداً على الأقل'});
  list.forEach(u=>{if(!/^https:\/\/[^\s/]+\.[^\s]+$/.test(u))out.push({lvl:'error',where,msg:`رابط غير صالح: ${u}`});else if(REDIRECTORS.some(r=>u.includes(r)))out.push({lvl:'error',where,msg:`رابط تحويل: ${u}`})});
}
return {words,outlet,source,sources,item,block,text,headline,urls,dohaToday};
})();
