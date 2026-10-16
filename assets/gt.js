'use strict';
// ترجمة Google لبقية لغات العالم: قائمة بجانب زر العربية/English. لا يُحمَّل سكربت Google إلا بعد أن يختار الزائر لغة.
(function(){
const EN=document.documentElement.lang==='en',SRC=EN?'en':'ar';
const LANGS=[['en','English'],['fr','Français'],['de','Deutsch'],['es','Español'],['it','Italiano'],['pt','Português'],['ru','Русский'],['tr','Türkçe'],['fa','فارسی'],['ur','اردو'],['hi','हिन्दी'],['bn','বাংলা'],['ml','മലയാളം'],['ta','தமிழ்'],['ne','नेपाली'],['si','සිංහල'],['tl','Filipino'],['id','Bahasa Indonesia'],['ms','Bahasa Melayu'],['zh-CN','中文'],['ja','日本語'],['ko','한국어'],['sw','Kiswahili'],['so','Soomaali'],['am','አማርኛ'],['ar','العربية']].filter(([c])=>c!==SRC);
const cur=(document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]+\/([^;]+)/)||[])[1]||'';
function setLang(c){const host=location.hostname,exp=c?'':';expires=Thu, 01 Jan 1970 00:00:00 GMT';
  [host,'.'+host.split('.').slice(-2).join('.')].forEach(d=>{document.cookie='googtrans='+(c?`/${SRC}/${c}`:'')+';path=/;domain='+d+exp});
  document.cookie='googtrans='+(c?`/${SRC}/${c}`:'')+';path=/'+exp;location.reload()}
const sel=document.createElement('select');sel.className='gtsel notranslate';sel.translate=false;sel.setAttribute('aria-label',EN?'Other languages (Google Translate)':'لغات أخرى (ترجمة Google)');
sel.innerHTML=`<option value="">🌐 ${EN?'Other languages':'لغات أخرى'}</option>`+(cur?`<option value="-">↩ ${EN?'Original':'الأصل'}</option>`:'')+LANGS.map(([c,n])=>`<option value="${c}"${c===cur?' selected':''}>${n}</option>`).join('');
sel.onchange=()=>{const v=sel.value;if(v==='-')setLang('');else if(v)setLang(v)};
const box=document.querySelector('.langsw');if(box)box.after(sel);
if(cur&&cur!==SRC){const h=document.createElement('div');h.id='gte';h.hidden=true;document.body.appendChild(h);
  window.gtInit=()=>new google.translate.TranslateElement({pageLanguage:SRC,autoDisplay:false},'gte');
  const s=document.createElement('script');s.src='https://translate.google.com/translate_a/element.js?cb=gtInit';s.async=true;document.head.appendChild(s)}
})();
