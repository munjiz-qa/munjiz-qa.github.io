'use strict';
// «عبدو نيوز» الطقس والمناخ. يعمل كله من متصفح الزائر دون أي خادم أو مفتاح:
//  - الطقس والتوقعات: Open-Meteo (نماذج الأرصاد الوطنية)، وجودة الهواء والغبار: Open-Meteo Air Quality (كوبرنيكوس CAMS).
//  - الخطر الرسمي: GDACS (الأمم المتحدة والمفوضية الأوروبية) للأعاصير والفيضانات والجفاف والبراكين والحرائق، وUSGS للزلازل،
//    وهيئة الأرصاد الأميركية NWS داخل الولايات المتحدة، مع رابط الجهة الرسمية في كل بلد.
//  - التقدير الآلي للخطر من التوقعات بعتبات معلنة في الصفحة، وموسوم بأنه تقدير لا تنبيه رسمي.
//  - أخبار المناخ من data/climate.json (كل خبر من جهتين مستقلتين على الأقل، يكتبه scripts/climate.mjs).
(function(){
const CFG=window.KHABAR_CONFIG||{};
const $=s=>document.querySelector(s);
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
const store={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
let LANG=document.documentElement.lang==='en'?'en':'ar';
const L=(a,e)=>LANG==='en'?e:a;
const T={
 brand:['عبدو نيوز','Abdo News'],section:['الطقس والمناخ','Weather & Climate'],eyebrow:['الطقس والمناخ','Weather & climate'],
 h1:['طقس مكانك، ومناخ العالم','Your weather, the world\'s climate'],
 intro:['اختر الدولة والمدينة أو حدّد موقعك، فنعرض لك الطقس الآن والتوقعات لعشرة أيام وأي خطر محتمل بمصدره الرسمي، وإلى جانبها أخبار المناخ حول العالم مؤكدة من جهتين مستقلتين على الأقل.','Pick a country and city, or use your location, to see the weather now, a ten-day forecast and any potential hazard with its official source, alongside world climate news confirmed by at least two independent outlets.'],
 pick:['اختر مكانك','Choose your place'],country:['الدولة','Country'],city:['المدينة أو المنطقة','City or area'],locate:['حدّد موقعي','Use my location'],
 city_ph:['اكتب اسم المدينة…','Type a city name…'],
 climate_h:['مناخ العالم','World climate'],
 climate_rule:['لا يُنشر هنا خبر إلا إذا نقلته جهتان مستقلتان على الأقل، ولكل جهة عنوانها كما نشرته وتاريخه ورابطه الأصلي. يُحدَّث آلياً كل 3 ساعات ومع كل خلاصة من خلاصات اليوم الأربع.','A story appears here only if at least two independent outlets reported it, each shown with its own headline, date and original link. Updated automatically every 3 hours and with each of the day\'s four briefs.'],
 method_h:['مصادر هذا القسم وطريقة الحساب','Sources and method'],
 footer_note:['كل رقم في هذا القسم منسوب إلى مصدره برابط مباشر. التقدير الآلي للخطر اجتهاد مبني على التوقعات المذكورة، ولا يغني عن تعليمات الجهة الرسمية في بلدك.','Every figure in this section links to its source. The automatic hazard estimate is a judgement based on the cited forecasts and does not replace instructions from your official authority.'],
 today:['اليوم','Today'],qatar:['قطر','Qatar'],gulf:['الخليج','The Gulf'],egypt:['مصر','Egypt'],world:['العالم','The World'],military:['القسم العسكري','Military'],wars:['الحروب الدائرة','Ongoing wars'],roadmap:['خريطة الطريق','Roadmap'],ledger:['الشفافية','Transparency'],saved:['المحفوظ','Saved'],about:['من نحن','About us'],weather:['الطقس والمناخ','Weather'],
 theme_dark:['الوضع الليلي','Dark mode'],theme_light:['الوضع النهاري','Light mode']
};
const t=k=>(T[k]||[k,k])[LANG==='en'?1:0];
const MONTHS={ar:['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],en:['January','February','March','April','May','June','July','August','September','October','November','December']};
const DAYS={ar:['الأحد','الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'],en:['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']};
const fmtDate=(iso,withDay)=>{const [y,m,d]=iso.slice(0,10).split('-').map(Number);const dt=new Date(Date.UTC(y,m-1,d));return (withDay?DAYS[LANG][dt.getUTCDay()]+' ':'')+d+' '+MONTHS[LANG][m-1]+' '+y};
const fmtDay=iso=>{const [y,m,d]=iso.slice(0,10).split('-').map(Number);return d+' '+MONTHS[LANG][m-1]};
const dayName=iso=>{const [y,m,d]=iso.slice(0,10).split('-').map(Number);return DAYS[LANG][new Date(Date.UTC(y,m-1,d)).getUTCDay()]};
// الوقت المحلي للمكان كما يرسله Open-Meteo (دون إزاحة): «3:00 م» أو «15:00»
const hm=iso=>{const [h,m]=iso.slice(11,16).split(':').map(Number);if(LANG==='en')return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;return `${h%12||12}:${String(m).padStart(2,'0')} ${h<12?'ص':'م'}`};
const hOnly=iso=>{const h=+iso.slice(11,13);return LANG==='en'?String(h).padStart(2,'0')+':00':`${h%12||12} ${h<12?'ص':'م'}`};
const PCT=()=>LANG==='en'?'%':'٪';
const r0=x=>x==null||isNaN(x)?'—':String(Math.round(x));
const r1=x=>x==null||isNaN(x)?'—':(Math.round(x*10)/10).toString();
const timeAgo=ms=>{const h=Math.round((Date.now()-ms)/3600e3);if(h<1)return L('قبل أقل من ساعة','less than an hour ago');if(h<48)return LANG==='en'?`${h} h ago`:(h===1?'قبل ساعة':h===2?'قبل ساعتين':h<=10?`قبل ${h} ساعات`:`قبل ${h} ساعة`);const d=Math.round(h/24);return LANG==='en'?`${d} days ago`:(d===2?'قبل يومين':d<=10?`قبل ${d} أيام`:`قبل ${d} يوماً`)};
const kmTxt=n=>LANG==='en'?`${n} km`:`${n} كم`;
let RN=null;try{RN=new Intl.DisplayNames([LANG==='en'?'en':'ar'],{type:'region'})}catch(e){}
const cName=cc=>{try{return new Intl.DisplayNames([LANG==='en'?'en':'ar'],{type:'region'}).of(cc)||cc}catch(e){return cc}};

/* ---------- البيانات الثابتة ---------- */
// عواصم الدول (للبحث عنها في Open-Meteo عند اختيار الدولة)
const CAPS=Object.fromEntries('AD:Andorra la Vella|AE:Abu Dhabi|AF:Kabul|AG:Saint John\'s|AL:Tirana|AM:Yerevan|AO:Luanda|AR:Buenos Aires|AT:Vienna|AU:Canberra|AZ:Baku|BA:Sarajevo|BB:Bridgetown|BD:Dhaka|BE:Brussels|BF:Ouagadougou|BG:Sofia|BH:Manama|BI:Gitega|BJ:Porto-Novo|BN:Bandar Seri Begawan|BO:Sucre|BR:Brasília|BS:Nassau|BT:Thimphu|BW:Gaborone|BY:Minsk|BZ:Belmopan|CA:Ottawa|CD:Kinshasa|CF:Bangui|CG:Brazzaville|CH:Bern|CI:Yamoussoukro|CL:Santiago|CM:Yaoundé|CN:Beijing|CO:Bogotá|CR:San José|CU:Havana|CV:Praia|CY:Nicosia|CZ:Prague|DE:Berlin|DJ:Djibouti|DK:Copenhagen|DM:Roseau|DO:Santo Domingo|DZ:Algiers|EC:Quito|EE:Tallinn|EG:Cairo|EH:El Aaiún|ER:Asmara|ES:Madrid|ET:Addis Ababa|FI:Helsinki|FJ:Suva|FM:Palikir|FR:Paris|GA:Libreville|GB:London|GD:St. George\'s|GE:Tbilisi|GH:Accra|GL:Nuuk|GM:Banjul|GN:Conakry|GQ:Malabo|GR:Athens|GT:Guatemala City|GW:Bissau|GY:Georgetown|HK:City of Victoria|HN:Tegucigalpa|HR:Zagreb|HT:Port-au-Prince|HU:Budapest|ID:Jakarta|IE:Dublin|IL:Jerusalem|IN:New Delhi|IQ:Baghdad|IR:Tehran|IS:Reykjavik|IT:Rome|JM:Kingston|JO:Amman|JP:Tokyo|KE:Nairobi|KG:Bishkek|KH:Phnom Penh|KI:South Tarawa|KM:Moroni|KN:Basseterre|KP:Pyongyang|KR:Seoul|KW:Kuwait City|KZ:Astana|LA:Vientiane|LB:Beirut|LC:Castries|LI:Vaduz|LK:Colombo|LR:Monrovia|LS:Maseru|LT:Vilnius|LU:Luxembourg|LV:Riga|LY:Tripoli|MA:Rabat|MC:Monaco|MD:Chișinău|ME:Podgorica|MG:Antananarivo|MH:Majuro|MK:Skopje|ML:Bamako|MM:Naypyidaw|MN:Ulan Bator|MR:Nouakchott|MT:Valletta|MU:Port Louis|MV:Malé|MW:Lilongwe|MX:Mexico City|MY:Kuala Lumpur|MZ:Maputo|NA:Windhoek|NE:Niamey|NG:Abuja|NI:Managua|NL:Amsterdam|NO:Oslo|NP:Kathmandu|NR:Yaren|NZ:Wellington|OM:Muscat|PA:Panama City|PE:Lima|PG:Port Moresby|PH:Manila|PK:Islamabad|PL:Warsaw|PR:San Juan|PS:Ramallah|PT:Lisbon|PW:Ngerulmud|PY:Asunción|QA:Doha|RO:Bucharest|RS:Belgrade|RU:Moscow|RW:Kigali|SA:Riyadh|SB:Honiara|SC:Victoria|SD:Khartoum|SE:Stockholm|SG:Singapore|SI:Ljubljana|SK:Bratislava|SL:Freetown|SM:City of San Marino|SN:Dakar|SO:Mogadishu|SR:Paramaribo|SS:Juba|ST:São Tomé|SV:San Salvador|SY:Damascus|SZ:Lobamba|TD:N\'Djamena|TG:Lomé|TH:Bangkok|TJ:Dushanbe|TL:Dili|TM:Ashgabat|TN:Tunis|TO:Nuku\'alofa|TR:Ankara|TT:Port of Spain|TV:Funafuti|TW:Taipei|TZ:Dodoma|UA:Kyiv|UG:Kampala|US:Washington D.C.|UY:Montevideo|UZ:Tashkent|VA:Vatican City|VC:Kingstown|VE:Caracas|VN:Hanoi|VU:Port Vila|WS:Apia|YE:Sana\'a|ZA:Pretoria|ZM:Lusaka|ZW:Harare'.split('|').map(x=>x.split(':')));
// مدن مقترحة للدول العربية (الاسم العربي، والاسم الذي يُبحث به)
const POP={
 QA:[['الدوحة','Doha'],['الريان','Al Rayyan'],['الوكرة','Al Wakrah'],['الخور','Al Khor'],['دخان','Dukhan'],['مسيعيد','Mesaieed']],
 SA:[['الرياض','Riyadh'],['جدة','Jeddah'],['مكة المكرمة','Mecca'],['المدينة المنورة','Medina'],['الدمام','Dammam'],['أبها','Abha'],['تبوك','Tabuk']],
 AE:[['أبوظبي','Abu Dhabi'],['دبي','Dubai'],['الشارقة','Sharjah'],['العين','Al Ain'],['رأس الخيمة','Ras al-Khaimah'],['الفجيرة','Fujairah']],
 KW:[['مدينة الكويت','Kuwait City'],['الجهراء','Al Jahra'],['الأحمدي','Al Ahmadi'],['حولي','Hawalli']],
 OM:[['مسقط','Muscat'],['صلالة','Salalah'],['صحار','Sohar'],['نزوى','Nizwa'],['صور','Sur']],
 BH:[['المنامة','Manama'],['المحرق','Muharraq'],['الرفاع','Riffa'],['مدينة عيسى','Isa Town']],
 EG:[['القاهرة','Cairo'],['الإسكندرية','Alexandria'],['الجيزة','Giza'],['أسوان','Aswan'],['الأقصر','Luxor'],['شرم الشيخ','Sharm el-Sheikh'],['الغردقة','Hurghada']],
 JO:[['عمّان','Amman'],['إربد','Irbid'],['الزرقاء','Zarqa'],['العقبة','Aqaba']],
 LB:[['بيروت','Beirut'],['طرابلس','Tripoli'],['صيدا','Sidon']],
 SY:[['دمشق','Damascus'],['حلب','Aleppo'],['حمص','Homs'],['اللاذقية','Latakia']],
 IQ:[['بغداد','Baghdad'],['البصرة','Basra'],['أربيل','Erbil'],['الموصل','Mosul']],
 PS:[['القدس','Jerusalem'],['غزة','Gaza'],['رام الله','Ramallah'],['نابلس','Nablus']],
 YE:[['صنعاء','Sanaa'],['عدن','Aden'],['المكلا','Mukalla'],['تعز','Taiz']],
 SD:[['الخرطوم','Khartoum'],['بورتسودان','Port Sudan'],['أم درمان','Omdurman']],
 LY:[['طرابلس','Tripoli'],['بنغازي','Benghazi'],['مصراتة','Misrata']],
 TN:[['تونس','Tunis'],['صفاقس','Sfax'],['سوسة','Sousse']],
 DZ:[['الجزائر','Algiers'],['وهران','Oran'],['قسنطينة','Constantine']],
 MA:[['الرباط','Rabat'],['الدار البيضاء','Casablanca'],['مراكش','Marrakesh'],['فاس','Fes'],['طنجة','Tangier']],
 MR:[['نواكشوط','Nouakchott'],['نواذيبو','Nouadhibou']],
 TR:[['إسطنبول','Istanbul'],['أنقرة','Ankara'],['أنطاليا','Antalya'],['إزمير','Izmir']],
 IR:[['طهران','Tehran'],['مشهد','Mashhad'],['أصفهان','Isfahan'],['شيراز','Shiraz']]
};
// الجهة الرسمية للأرصاد والتنبيهات في كل بلد (روابط فُحصت يدوياً)، وإلا فمركز الطقس الشديد في المنظمة العالمية للأرصاد
const OFFICIAL={
 QA:['إدارة الأرصاد الجوية في قطر','Qatar Meteorology Department','https://qweather.gov.qa/'],
 SA:['المركز الوطني للأرصاد','National Center for Meteorology','https://ncm.gov.sa/'],
 AE:['المركز الوطني للأرصاد','National Center of Meteorology','https://www.ncm.gov.ae/'],
 KW:['إدارة الأرصاد الجوية','Kuwait Meteorological Department','https://www.met.gov.kw/'],
 OM:['هيئة الطيران المدني: الأرصاد العمانية','Oman Meteorology','https://www.met.gov.om/'],
 BH:['الأرصاد الجوية البحرينية','Bahrain Meteorological Directorate','https://www.bahrainweather.gov.bh/'],
 EG:['الهيئة العامة للأرصاد الجوية','Egyptian Meteorological Authority','https://ema.gov.eg/'],
 JO:['دائرة الأرصاد الجوية','Jordan Meteorological Department','https://jmd.gov.jo/'],
 MA:['المديرية العامة للأرصاد الجوية','Maroc Météo','https://www.marocmeteo.ma/'],
 TN:['المعهد الوطني للرصد الجوي','INM Tunisia','https://www.meteo.tn/'],
 DZ:['الديوان الوطني للأرصاد الجوية','Météo Algérie','https://www.meteo.dz/'],
 IQ:['الهيئة العامة للأنواء الجوية','Iraqi Meteorological Organization','https://meteoseism.gov.iq/'],
 LY:['المركز الوطني للأرصاد الجوية','Libyan National Meteorological Center','https://www.lmd.ly/'],
 SD:['الهيئة العامة للأرصاد الجوية','Sudan Meteorological Authority','https://ersad.gov.sd/'],
 TR:['المديرية العامة للأرصاد التركية','Turkish State Meteorological Service','https://www.mgm.gov.tr/'],
 GB:['مكتب الأرصاد البريطاني','Met Office','https://www.metoffice.gov.uk/'],
 US:['هيئة الأرصاد الوطنية الأميركية','National Weather Service','https://www.weather.gov/'],
 IN:['إدارة الأرصاد الهندية','India Meteorological Department','https://mausam.imd.gov.in/'],
 PK:['إدارة الأرصاد الباكستانية','Pakistan Meteorological Department','https://www.pmd.gov.pk/'],
 DE:['هيئة الأرصاد الألمانية','Deutscher Wetterdienst','https://www.dwd.de/'],
 FR:['ميتيو فرانس','Météo-France','https://www.meteofrance.com/'],
 ES:['وكالة الأرصاد الإسبانية','AEMET','https://www.aemet.es/'],
 IT:['خدمة الأرصاد الإيطالية','Servizio Meteorologico','https://www.meteoam.it/'],
 JP:['وكالة الأرصاد اليابانية','Japan Meteorological Agency','https://www.jma.go.jp/'],
 AU:['مكتب الأرصاد الأسترالي','Bureau of Meteorology','https://www.bom.gov.au/'],
 CA:['هيئة البيئة الكندية: الطقس','Environment Canada Weather','https://weather.gc.ca/'],
 CN:['إدارة الأرصاد الصينية','China Meteorological Administration','https://www.cma.gov.cn/'],
 BR:['المعهد الوطني للأرصاد البرازيلي','INMET','https://portal.inmet.gov.br/'],
 KR:['إدارة الأرصاد الكورية','Korea Meteorological Administration','https://www.weather.go.kr/']
};
const EU=new Set('AT BE BG HR CY CZ DK EE FI GR HU IE LV LT LU MT NL PL PT RO SK SI SE NO IS CH RS BA ME MK AL MD UA IL'.split(' '));
function official(cc){
  if(OFFICIAL[cc]){const o=OFFICIAL[cc];return {name:L(o[0],o[1]),url:o[2]}}
  if(EU.has(cc))return {name:L('ميتيو ألارم: تنبيهات الأرصاد الأوروبية','Meteoalarm: European weather warnings'),url:'https://meteoalarm.org/'};
  return {name:L('مركز معلومات الطقس الشديد، المنظمة العالمية للأرصاد','WMO Severe Weather Information Centre'),url:'https://severeweather.wmo.int/'};
}

/* ---------- رموز الطقس ---------- */
const WMO={0:['صحو','Clear sky'],1:['صحو غالباً','Mainly clear'],2:['غائم جزئياً','Partly cloudy'],3:['غائم','Overcast'],45:['ضباب','Fog'],48:['ضباب متجمّد','Rime fog'],
 51:['رذاذ خفيف','Light drizzle'],53:['رذاذ','Drizzle'],55:['رذاذ كثيف','Dense drizzle'],56:['رذاذ متجمّد','Freezing drizzle'],57:['رذاذ متجمّد كثيف','Dense freezing drizzle'],
 61:['مطر خفيف','Light rain'],63:['مطر','Rain'],65:['مطر غزير','Heavy rain'],66:['مطر متجمّد','Freezing rain'],67:['مطر متجمّد غزير','Heavy freezing rain'],
 71:['ثلج خفيف','Light snow'],73:['ثلج','Snow'],75:['ثلج كثيف','Heavy snow'],77:['حبيبات ثلج','Snow grains'],80:['زخات مطر خفيفة','Light showers'],81:['زخات مطر','Rain showers'],82:['زخات مطر عنيفة','Violent showers'],
 85:['زخات ثلج','Snow showers'],86:['زخات ثلج كثيفة','Heavy snow showers'],95:['عاصفة رعدية','Thunderstorm'],96:['عاصفة رعدية مع بَرَد','Thunderstorm with hail'],99:['عاصفة رعدية مع بَرَد كثيف','Thunderstorm with heavy hail']};
const wText=c=>(WMO[c]||['—','—'])[LANG==='en'?1:0];
function icon(code,day){
  const sun='<g><circle cx="24" cy="24" r="8" fill="var(--dawn)"/><g stroke="var(--dawn)" stroke-width="2.6" stroke-linecap="round"><path d="M24 7v4M24 37v4M7 24h4M37 24h4M12 12l2.8 2.8M33.2 33.2L36 36M12 36l2.8-2.8M33.2 14.8L36 12"/></g></g>';
  const moon='<path d="M30 10a13 13 0 1 0 9 22A11 11 0 0 1 30 10z" fill="var(--nile)"/>';
  const cloud=(dark)=>`<path d="M15 38h20a8 8 0 0 0 .6-16A11 11 0 0 0 14.4 25 6.6 6.6 0 0 0 15 38z" fill="${dark?'var(--mute)':'#C9D2DA'}" stroke="var(--mute)" stroke-width="1.2"/>`;
  const small=s=>`<g transform="translate(-6,-7) scale(.82)">${s}</g>`;
  const drops=n=>`<g stroke="var(--nile)" stroke-width="2.6" stroke-linecap="round">${[[18,41],[26,41],[34,41]].slice(0,n).map(([x,y])=>`<path d="M${x} ${y}l-2 5"/>`).join('')}</g>`;
  const flakes='<g fill="var(--nile)"><circle cx="18" cy="44" r="2"/><circle cx="26" cy="46" r="2"/><circle cx="34" cy="44" r="2"/></g>';
  const bolt='<path d="M26 36l-5 8h5l-3 7 9-10h-5l3-5z" fill="var(--dawn)"/>';
  const fog='<g stroke="var(--mute)" stroke-width="2.6" stroke-linecap="round"><path d="M10 40h28M14 45h22"/></g>';
  let s='';const sky=day?sun:moon;
  if(code===0)s=sky;else if(code===1)s=small(sky)+'';else if(code===2)s=small(sky)+cloud();else if(code===3)s=cloud(true);
  else if(code===45||code===48)s=`<g transform="translate(0,-6)">${cloud()}</g>`+fog;
  else if(code>=51&&code<=57)s=`<g transform="translate(0,-4)">${cloud()}</g>`+drops(2);
  else if(code>=61&&code<=67||code>=80&&code<=82)s=`<g transform="translate(0,-4)">${cloud(code===65||code===82||code===67)}</g>`+drops(3);
  else if(code>=71&&code<=77||code===85||code===86)s=`<g transform="translate(0,-4)">${cloud()}</g>`+flakes;
  else if(code>=95)s=`<g transform="translate(0,-6)">${cloud(true)}</g>`+bolt;
  else s=cloud();
  if(code===1)s=small(sky).replace('scale(.82)','scale(1)').replace('translate(-6,-7)','translate(0,0)');
  return `<svg viewBox="0 0 48 52" aria-hidden="true">${s}</svg>`;
}
const DIRS={ar:['شمال','شمال شرق','شرق','جنوب شرق','جنوب','جنوب غرب','غرب','شمال غرب'],en:['N','NE','E','SE','S','SW','W','NW']};
const dir=d=>d==null?'':DIRS[LANG][Math.round(((d%360)+360)%360/45)%8];

/* ---------- الشبكة ---------- */
// إعادة المحاولة مرتين عند ازدحام الخدمة (429) أو عطل مؤقت (5xx)
async function getJSON(u,ms=15000){
  for(let k=0;;k++){
    const r=await fetch(u,{signal:AbortSignal.timeout?AbortSignal.timeout(ms):undefined});
    if(r.ok)return r.json();
    if(k<2&&(r.status===429||r.status>=500)){await new Promise(z=>setTimeout(z,1200*(k+1)));continue}
    throw new Error(r.status+' '+u);
  }
}
const plain=s=>String(s||'').replace(/[\u064B-\u0652\u0670\u200e\u200f]/g,'').replace(/^ٱ|ٱ/g,'ا').trim();
const GEO='https://geocoding-api.open-meteo.com/v1/search';
async function geocode(q,cc,n=8){
  const go=name=>getJSON(`${GEO}?name=${encodeURIComponent(name)}&count=${n}&language=${LANG==='en'?'en':'ar'}&format=json${cc?'&countryCode='+cc:''}`).then(j=>j.results||[]);
  let r=await go(q);
  // صيغ الهمزة: «الاسكندرية» ← «الإسكندرية»
  if(!r.length&&/[؀-ۿ]/.test(q)){for(const v of [q.replace(/^ال(ا)/,'الإ'),q.replace(/^ال(ا)/,'الأ'),q.replace(/^ا/,'أ'),q.replace(/^ا/,'إ'),q.replace(/ة$/,'ه'),q.replace(/ه$/,'ة')]){if(v!==q){r=await go(v);if(r.length)break}}}
  return r;
}
const placeOf=g=>({name:plain(g.name),admin:plain(g.admin1),cc:g.country_code||'',lat:+g.latitude.toFixed(4),lon:+g.longitude.toFixed(4)});

/* ---------- الحالة ---------- */
let PLACE=null,F=null,A=null,HZ={official:[],model:[],errors:[]},CLIMATE=null,ADMIN={},URLS={};

/* ---------- الرأس ---------- */
function header(){
  const now=new Date();
  const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Qatar',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));
  $('#today-date').textContent=fmtDate(`${p.year}-${p.month}-${p.day}`,true);
  document.querySelectorAll('[data-t]').forEach(n=>n.textContent=t(n.dataset.t));
  $('#lang-btn').textContent=LANG==='en'?'ع':'EN';$('#lang-btn').setAttribute('aria-label',LANG==='en'?'العربية':'English');
  const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);
  $('#theme-btn').setAttribute('aria-label',dark?t('theme_light'):t('theme_dark'));
  document.title=LANG==='en'?'Weather & Climate | Abdo News':'الطقس والمناخ | عبدو نيوز';
  const ZC={qatar:'var(--dawn)',gulf:'var(--sea)',egypt:'var(--nile)',world:'var(--deep-ink)',military:'#8A3A2E',wars:'#C4392F'};
  const tabs=$('#tabs');tabs.textContent='';
  ['today','qatar','gulf','egypt','world','military','wars','weather','roadmap','ledger','saved','about'].forEach(id=>{
    const a=el('a','tab');a.href=id==='weather'?'./':'../#'+id;if(ZC[id]){const i=el('i');i.style.background=ZC[id];a.append(i)}
    if(id==='weather'){a.setAttribute('aria-current','page');a.insertAdjacentHTML('afterbegin','<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><circle cx="9" cy="9" r="4" fill="currentColor"/><path d="M7 20h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.3 1.5A3.3 3.3 0 0 0 7 20z" fill="none" stroke="currentColor" stroke-width="2"/></svg>')}
    a.append(t(id));tabs.append(a)});
  const cur=tabs.querySelector('[aria-current]');if(cur)cur.scrollIntoView({block:'nearest',inline:'center'});
  const c=$('#contact');c.textContent='';c.append(el('span',null,CFG.EMAIL||''),el('span',null,CFG.PHONE||''));
  $('#city').placeholder=t('city_ph');
}
function toast(m){const n=$('#toast');n.textContent=m;n.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>n.hidden=true,2400)}
function pickMsg(text,ok){const m=$('#pick-msg');if(!text){m.hidden=true;return}m.textContent=text;m.className='msg '+(ok?'ok':'err');m.hidden=false}

/* ---------- اختيار المكان ---------- */
const COUNTRIES=Object.keys(CAPS);
function fillCountries(){
  const s=$('#country'),cur=s.value||(PLACE&&PLACE.cc)||'QA';s.textContent='';
  const list=COUNTRIES.map(cc=>[cc,cName(cc)]).sort((a,b)=>a[1].localeCompare(b[1],LANG==='en'?'en':'ar'));
  // الدول العربية أولاً لقرّاء «عبدو نيوز»
  const top=['QA','SA','AE','KW','OM','BH','EG'];
  const g1=el('optgroup');g1.label=L('الخليج ومصر','Gulf & Egypt');top.forEach(cc=>{const o=el('option',null,cName(cc));o.value=cc;g1.append(o)});
  const g2=el('optgroup');g2.label=L('كل الدول','All countries');list.forEach(([cc,n])=>{const o=el('option',null,n);o.value=cc;g2.append(o)});
  s.append(g1,g2);s.value=cur;
}
function fillPopular(){
  const cc=$('#country').value,box=$('#popular');box.textContent='';
  const list=POP[cc]||(CAPS[cc]?[[null,CAPS[cc]]]:[]);
  box.setAttribute('aria-label',L('مدن مقترحة','Suggested cities'));
  list.forEach(([ar,en])=>{const b=el('button','chip',LANG==='en'?en:(ar||en));b.type='button';b.setAttribute('aria-pressed',String(!!PLACE&&PLACE.cc===cc&&(PLACE.q===en)));
    b.onclick=async()=>{pickMsg('');try{const r=await geocode(en,cc,3);const g=r.find(x=>/^PPL/.test(x.feature_code||''))||r[0];if(!g)throw new Error('none');setPlace({...placeOf(g),q:en})}catch(e){pickMsg(L('تعذّر العثور على هذه المدينة الآن. جرّب كتابة اسمها.','Could not find this city right now. Try typing its name.'),false)}};box.append(b)});
}
let sugg=[],act=-1,tmr=0;
function showList(items){
  const ul=$('#city-list'),inp=$('#city');ul.textContent='';sugg=items;act=-1;
  if(!items.length){ul.hidden=true;inp.setAttribute('aria-expanded','false');return}
  items.forEach((g,i)=>{const li=el('li');li.id='opt-'+i;li.setAttribute('role','option');li.append(el('span',null,plain(g.name)),el('small',null,[plain(g.admin1),cName(g.country_code)].filter(Boolean).join('، ')));
    li.onmousedown=e=>{e.preventDefault();choose(i)};ul.append(li)});
  ul.hidden=false;inp.setAttribute('aria-expanded','true');
}
function choose(i){const g=sugg[i];if(!g)return;showList([]);$('#city').value=g.name;if(g.country_code&&COUNTRIES.includes(g.country_code))$('#country').value=g.country_code;setPlace({...placeOf(g),q:g.name})}
function bindCity(){
  const inp=$('#city');
  inp.addEventListener('input',()=>{clearTimeout(tmr);const q=inp.value.trim();if(q.length<2){showList([]);return}
    tmr=setTimeout(async()=>{try{const r=await geocode(q,$('#country').value);if(inp.value.trim()===q)showList(r.filter(x=>x.latitude!=null))}catch(e){showList([])}},280)});
  inp.addEventListener('keydown',e=>{const ul=$('#city-list');if(ul.hidden){if(e.key==='Enter'){e.preventDefault();inp.dispatchEvent(new Event('input'))}return}
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();act=(act+(e.key==='ArrowDown'?1:-1)+sugg.length)%sugg.length;[...ul.children].forEach((li,i)=>li.setAttribute('aria-selected',String(i===act)));inp.setAttribute('aria-activedescendant','opt-'+act)}
    else if(e.key==='Enter'){e.preventDefault();choose(act<0?0:act)}else if(e.key==='Escape')showList([])});
  inp.addEventListener('blur',()=>setTimeout(()=>showList([]),150));
  $('#country').onchange=async()=>{fillPopular();inp.value='';const cc=$('#country').value;const cap=(POP[cc]&&POP[cc][0][1])||CAPS[cc];
    if(cap){try{const r=await geocode(cap,cc,3);const g=r.find(x=>/^PPL/.test(x.feature_code||''))||r[0];if(g)setPlace({...placeOf(g),q:cap})}catch(e){}}};
  $('#locate').onclick=locate;
}
function locate(){
  const b=$('#locate');pickMsg('');
  if(!('geolocation' in navigator)){pickMsg(L('متصفحك لا يدعم تحديد الموقع. اختر الدولة والمدينة من القائمة.','Your browser does not support location. Choose a country and city instead.'),false);return}
  b.setAttribute('aria-busy','true');b.disabled=true;
  navigator.geolocation.getCurrentPosition(async pos=>{
    const lat=+pos.coords.latitude.toFixed(4),lon=+pos.coords.longitude.toFixed(4);let name='',admin='',cc='';
    try{const j=await getJSON(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=${LANG==='en'?'en':'ar'}`,8000);name=j.city||j.locality||'';admin=j.principalSubdivision||'';cc=(j.countryCode||'').toUpperCase()}catch(e){}
    if(!cc){try{const j=await getJSON(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lon}&accept-language=${LANG==='en'?'en':'ar'}`,8000);const a=j.address||{};name=a.city||a.town||a.village||a.county||'';admin=a.state||'';cc=(a.country_code||'').toUpperCase()}catch(e){}}
    b.removeAttribute('aria-busy');b.disabled=false;
    if(cc&&COUNTRIES.includes(cc))$('#country').value=cc;fillPopular();
    setPlace({name:name||L('موقعي الحالي','My location'),admin,cc,lat,lon,mine:true});pickMsg(L('حُدّد موقعك. لا يُحفظ موقعك إلا في متصفحك.','Location found. It is stored only in your browser.'),true);
  },err=>{b.removeAttribute('aria-busy');b.disabled=false;
    pickMsg(err.code===1?L('لم يُسمح بتحديد الموقع. اسمح به من إعدادات المتصفح، أو اختر الدولة والمدينة.','Location permission was denied. Allow it in your browser settings, or choose a country and city.'):L('تعذّر تحديد موقعك الآن. اختر الدولة والمدينة من القائمة.','Your location could not be found. Choose a country and city instead.'),false)},
  {enableHighAccuracy:false,timeout:12000,maximumAge:600000});
}
function setPlace(p){PLACE=p;store.set('khabar-wx-place',p);fillPopular();loadWeather()}

/* ---------- الطقس ---------- */
async function loadWeather(){
  const p=PLACE;if(!p)return;
  const where=$('#wx-place');where.textContent='';const h=el('h2',null,p.name);const sub=el('span','mute',[p.admin,p.cc?cName(p.cc):''].filter(Boolean).join(LANG==='en'?', ':'، ')+' · ');const co=el('bdi',null,`${r1(p.lat)}°, ${r1(p.lon)}°`);co.dir='ltr';sub.append(co);
  where.append(h,sub,el('span','wx-loading',L('جارٍ جلب الطقس…','Loading weather…')));
  const q=`latitude=${p.lat}&longitude=${p.lon}&timezone=auto`;
  URLS.f=`https://api.open-meteo.com/v1/forecast?${q}&forecast_days=10&wind_speed_unit=kmh`+
    '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility,uv_index'+
    '&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,wind_gusts_10m,visibility,is_day'+
    '&daily=weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,precipitation_sum,precipitation_probability_max,snowfall_sum,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant,uv_index_max,sunrise,sunset';
  URLS.a=`https://air-quality-api.open-meteo.com/v1/air-quality?${q}&forecast_days=2&current=us_aqi,pm10,pm2_5,dust&hourly=us_aqi,dust`;
  const [f,a]=await Promise.allSettled([getJSON(URLS.f),getJSON(URLS.a)]);
  where.querySelector('.wx-loading')?.remove();
  if(f.status!=='fulfilled'){F=null;where.append(el('p','msg err',L('تعذّر الوصول إلى خدمة الطقس الآن. أعد المحاولة بعد قليل.','The weather service could not be reached. Please try again shortly.')));['#now','#hours','#days','#danger'].forEach(s=>$(s).hidden=true);return}
  F=f.value;A=a.status==='fulfilled'?a.value:null;
  renderNow();renderHours();renderDays();
  HZ={official:[],model:modelHazards(),errors:[],pending:true};renderDanger();
  officialHazards().then(()=>{HZ.pending=false;renderDanger()});
  renderMethod();
}
const srcA=(label,url)=>{const a=el('a',null,label);a.href=url;a.target='_blank';a.rel='noopener';return a};
function srcLine(parts){const box=el('div','src');box.append(el('span','lbl',L('المصدر','Source')+':'));parts.forEach(([n,u])=>box.append(srcA(n,u)));return box}
function renderNow(){
  const s=$('#now'),c=F.current,u=F.current_units;s.textContent='';s.hidden=false;
  const head=el('div','now-main');head.insertAdjacentHTML('beforeend',icon(c.weather_code,c.is_day));
  const w=el('div');const tp=el('div','now-temp',r0(c.temperature_2m));tp.append(el('sup',null,'°C'));
  const fl=el('div','now-feel');const b1=el('bdi',null,r0(c.apparent_temperature)+'°'),b2=el('bdi',null,r0(c.relative_humidity_2m)+PCT());fl.append(L('المحسوسة ','Feels like '),b1,L(' · الرطوبة ',' · Humidity '),b2);
  w.append(tp,el('div','now-cond',wText(c.weather_code)),fl);head.append(w);s.append(head);
  const D=F.daily,dl=el('dl','stats');
  const aq=A&&A.current;
  const rows=[[L('الرياح','Wind'),`${r0(c.wind_speed_10m)}`,`${L('كم/س','km/h')} ${dir(c.wind_direction_10m)}`],[L('الهبّات','Gusts'),r0(c.wind_gusts_10m),L('كم/س','km/h')],
    [L('الصغرى / العظمى','Low / high'),`${r0(D.temperature_2m_min[0])}° / ${r0(D.temperature_2m_max[0])}°`,''],[L('الضغط','Pressure'),r0(c.pressure_msl),L('هكتوباسكال','hPa')],
    [L('مدى الرؤية','Visibility'),c.visibility!=null?r1(c.visibility/1000):'—',L('كم','km')],[L('الأشعة فوق البنفسجية','UV index'),r1(c.uv_index),''],
    [L('الشروق','Sunrise'),D.sunrise&&D.sunrise[0]?hm(D.sunrise[0]):'—',''],[L('الغروب','Sunset'),D.sunset&&D.sunset[0]?hm(D.sunset[0]):'—',''],
    [L('جودة الهواء','Air quality'),aq&&aq.us_aqi!=null?r0(aq.us_aqi):'—',aq&&aq.us_aqi!=null?aqiTxt(aq.us_aqi):''],
    [L('الغبار','Dust'),aq&&aq.dust!=null?r0(aq.dust):'—',L('مكغ/م³','µg/m³')]];
  rows.forEach(([k,v,unit])=>{const d=el('div');const dd=el('dd');const bv=el('bdi',null,v);bv.dir='ltr';dd.append(bv);if(unit)dd.append(el('small',null,unit));d.append(el('dt',null,k),dd);dl.append(d)});s.append(dl);
  const when=el('p','mute');when.style.fontSize='.8rem';when.textContent=`${L('قراءة','Reading for')} ${hm(c.time)} ${L('بتوقيت المكان','local time')} (${F.timezone_abbreviation||F.timezone})`;s.append(when);
  const parts=[[L('Open-Meteo: نماذج الأرصاد الوطنية','Open-Meteo: national weather models'),URLS.f]];if(A)parts.push([L('Open-Meteo: جودة الهواء من كوبرنيكوس CAMS','Open-Meteo: air quality from Copernicus CAMS'),URLS.a]);s.append(srcLine(parts));
}
function aqiTxt(v){return v<=50?L('جيدة','Good'):v<=100?L('مقبولة','Moderate'):v<=150?L('غير صحية للحساسين','Unhealthy for sensitive groups'):v<=200?L('غير صحية','Unhealthy'):v<=300?L('غير صحية جداً','Very unhealthy'):L('خطرة','Hazardous')}
function renderHours(){
  const s=$('#hours'),H=F.hourly;s.textContent='';s.hidden=false;s.append(el('h2',null,L('الساعات الـ24 القادمة','Next 24 hours')));
  const now=F.current.time.slice(0,13);let i0=H.time.findIndex(x=>x.slice(0,13)===now);if(i0<0)i0=0;
  const strip=el('div','hour-strip');strip.setAttribute('role','list');
  for(let i=i0;i<Math.min(H.time.length,i0+24);i++){const d=el('div','hour'+(i===i0?' now-h':''));d.setAttribute('role','listitem');
    d.append(el('span',null,i===i0?L('الآن','Now'):hOnly(H.time[i])));d.insertAdjacentHTML('beforeend',icon(H.weather_code[i],H.is_day[i]));
    d.append(el('b',null,r0(H.temperature_2m[i])+'°'),el('span','pp',H.precipitation_probability[i]>=10?r0(H.precipitation_probability[i])+PCT():''));d.title=wText(H.weather_code[i]);strip.append(d)}
  s.append(strip,el('p','mute',L('النسبة بالأزرق احتمال الهطول في الساعة.','Blue figures are the chance of precipitation in that hour.')));s.lastChild.style.fontSize='.78rem';
  s.append(srcLine([[L('Open-Meteo: التوقع الساعي','Open-Meteo: hourly forecast'),URLS.f]]));
}
function renderDays(){
  const s=$('#days'),D=F.daily;s.textContent='';s.hidden=false;s.append(el('h2',null,L('توقعات الأيام العشرة','Ten-day forecast')));
  const lo=Math.min(...D.temperature_2m_min),hi=Math.max(...D.temperature_2m_max),span=Math.max(1,hi-lo);
  const lvByDay={};(HZ.model||[]).forEach(z=>{lvByDay[z.day]=Math.max(lvByDay[z.day]||0,z.l)});
  const ul=el('ul','day-list');
  D.time.forEach((d,i)=>{const li=el('li','day');if(lvByDay[i])li.dataset.l=lvByDay[i];
    const a=el('div','d');a.append(el('b',null,i===0?L('اليوم','Today'):i===1?L('غداً','Tomorrow'):dayName(d)),el('small',null,fmtDay(d)));li.append(a);
    const ic=el('span');ic.innerHTML=icon(D.weather_code[i],1);ic.title=wText(D.weather_code[i]);li.append(ic);
    const rg=el('div','range'),bar=el('span','bar'),fill=el('i');const x0=(D.temperature_2m_min[i]-lo)/span*100,x1=(D.temperature_2m_max[i]-lo)/span*100;
    fill.style.insetInlineStart=x0+'%';fill.style.width=Math.max(4,x1-x0)+'%';bar.append(fill);rg.append(el('span',null,r0(D.temperature_2m_min[i])+'°'),bar,el('span',null,r0(D.temperature_2m_max[i])+'°'));li.append(rg);
    const x=el('div','x');x.append(el('span',null,wText(D.weather_code[i])));
    const wet=el('span','wet',`${L('هطول','Precip.')} ${r1(D.precipitation_sum[i])} ${L('مم','mm')}${D.precipitation_probability_max[i]!=null?` · ${r0(D.precipitation_probability_max[i])}${PCT()}`:''}`);x.append(wet);
    x.append(el('span',null,`${L('رياح حتى','Wind up to')} ${r0(D.wind_speed_10m_max[i])} ${L('كم/س','km/h')}، ${L('هبّات','gusts')} ${r0(D.wind_gusts_10m_max[i])}`.replace('، ',LANG==='en'?', ':'، ')));
    li.append(x);ul.append(li)});
  s.append(ul,srcLine([[L('Open-Meteo: التوقع اليومي','Open-Meteo: daily forecast'),URLS.f]]));
}

/* ---------- الخطر المحتمل ---------- */
const LV=[['لا خطر','No risk'],['انتبه','Be aware'],['استعد','Be prepared'],['خطر','Danger']];
const LVC=[['أخضر','Green'],['أصفر','Yellow'],['برتقالي','Orange'],['أحمر','Red']];
const lvName=l=>`${L(LV[l][0],LV[l][1])} (${L(LVC[l][0],LVC[l][1])})`;
// عتبات التقدير الآلي، معلنة في قسم «مصادر هذا القسم وطريقة الحساب»
const TH={heat:[41,46,52],cold:[0,-10,-20],gust:[60,80,100],rain:[20,50,100],snow:[5,15,30],uv:[8,11,99],dust:[200,500,1000],aqi:[151,201,301]};
const lvUp=(v,th)=>v==null||isNaN(v)?0:v>=th[2]?3:v>=th[1]?2:v>=th[0]?1:0;
const lvDown=(v,th)=>v==null||isNaN(v)?0:v<=th[2]?3:v<=th[1]?2:v<=th[0]?1:0;
function dayLabel(i){const d=F.daily.time[i];return i===0?L('اليوم','today'):i===1?L('غداً','tomorrow'):`${dayName(d)} ${fmtDay(d)}`}
function modelHazards(){
  const D=F.daily,out=[];
  const add=(kind,l,i,title,text,advice)=>{if(!l)return;const prev=out.find(x=>x.kind===kind);if(prev&&prev.l>=l)return;if(prev)out.splice(out.indexOf(prev),1);out.push({kind,l,day:i,title,text,advice,src:[[L('Open-Meteo: التوقع اليومي','Open-Meteo: daily forecast'),URLS.f]]})};
  for(let i=0;i<Math.min(3,D.time.length);i++){
    const ap=D.apparent_temperature_max[i],tx=D.temperature_2m_max[i],tn=D.temperature_2m_min[i];
    add('heat',Math.max(lvUp(ap,TH.heat),lvUp(tx,[44,48,52])),i,L('حرّ شديد','Extreme heat'),L(`${dayLabel(i)}: العظمى ${r0(tx)}° والمحسوسة ${r0(ap)}°.`,`${dayLabel(i)}: high ${r0(tx)}°, feels like ${r0(ap)}°.`),L('تجنّب الشمس بين 11 صباحاً و4 عصراً، وأكثِر من الماء، وانتبه لكبار السن والأطفال.','Avoid the sun from 11 am to 4 pm, drink plenty of water, and look after older people and children.'));
    add('cold',lvDown(tn,TH.cold),i,L('برد وصقيع','Cold and frost'),L(`${dayLabel(i)}: الصغرى ${r0(tn)}°.`,`${dayLabel(i)}: low ${r0(tn)}°.`),L('احمِ النباتات والأنابيب، وارتدِ ملابس دافئة، وتجنّب التدفئة في مكان مغلق دون تهوية.','Protect plants and pipes, dress warmly, and never use heaters in a closed room without ventilation.'));
    add('wind',lvUp(D.wind_gusts_10m_max[i],TH.gust),i,L('رياح قوية','Strong winds'),L(`${dayLabel(i)}: هبّات تصل إلى ${r0(D.wind_gusts_10m_max[i])} كم/س من ${dir(D.wind_direction_10m_dominant[i])}.`,`${dayLabel(i)}: gusts up to ${r0(D.wind_gusts_10m_max[i])} km/h from the ${dir(D.wind_direction_10m_dominant[i])}.`),L('ثبّت الأشياء الطائرة، وابتعد عن اللوحات والأشجار، واحذر في البحر.','Secure loose objects, keep away from signs and trees, and take care at sea.'));
    add('rain',lvUp(D.precipitation_sum[i],TH.rain),i,L('أمطار غزيرة واحتمال سيول','Heavy rain and possible flooding'),L(`${dayLabel(i)}: هطول متوقع ${r1(D.precipitation_sum[i])} مم${D.precipitation_probability_max[i]!=null?` باحتمال ${r0(D.precipitation_probability_max[i])}٪`:''}.`,`${dayLabel(i)}: ${r1(D.precipitation_sum[i])} mm expected${D.precipitation_probability_max[i]!=null?` (${r0(D.precipitation_probability_max[i])}% chance)`:''}.`),L('ابتعد عن الأودية ومجاري السيول والأنفاق، ولا تعبر طريقاً غمرته المياه.','Keep away from wadis, flood channels and underpasses, and never drive through flooded roads.'));
    add('snow',lvUp(D.snowfall_sum[i],TH.snow),i,L('ثلوج','Snow'),L(`${dayLabel(i)}: ثلوج متوقعة ${r1(D.snowfall_sum[i])} سم.`,`${dayLabel(i)}: ${r1(D.snowfall_sum[i])} cm of snow expected.`),L('أجّل السفر غير الضروري، وتأكد من جاهزية سيارتك.','Postpone non-essential travel and make sure your car is ready.'));
    const wc=D.weather_code[i];add('storm',wc>=96?2:wc===95?1:0,i,L('عواصف رعدية','Thunderstorms'),L(`${dayLabel(i)}: ${wText(wc)}.`,`${dayLabel(i)}: ${wText(wc)}.`),L('ابقَ داخل المباني أثناء البرق، وابتعد عن الأماكن المكشوفة والمسطحات المائية.','Stay indoors during lightning and keep away from open ground and water.'));
    add('uv',lvUp(D.uv_index_max[i],TH.uv),i,L('أشعة فوق بنفسجية مرتفعة','High UV'),L(`${dayLabel(i)}: مؤشر الأشعة ${r1(D.uv_index_max[i])}.`,`${dayLabel(i)}: UV index ${r1(D.uv_index_max[i])}.`),L('استخدم واقي الشمس والنظارات، وقلّل البقاء في الشمس ظهراً.','Use sunscreen and sunglasses and limit midday sun.'));
  }
  // الضباب والغبار وجودة الهواء: الساعات الـ24 القادمة
  const H=F.hourly,now=F.current.time.slice(0,13);let i0=Math.max(0,H.time.findIndex(x=>x.slice(0,13)===now));
  const vis=H.visibility?H.visibility.slice(i0,i0+24).filter(v=>v!=null):[];const vmin=vis.length?Math.min(...vis):null;
  if(vmin!=null&&vmin<1000){const l=vmin<200?2:1;out.push({kind:'fog',l,day:0,title:L('ضباب وانخفاض الرؤية','Fog and low visibility'),text:L(`مدى الرؤية قد ينخفض إلى ${vmin<1000?r0(vmin)+' متر':''} خلال الساعات الـ24 القادمة.`,`Visibility may fall to ${r0(vmin)} m in the next 24 hours.`),advice:L('خفّف السرعة واترك مسافة أمان، واستخدم أضواء الضباب.','Slow down, keep your distance and use fog lights.'),src:[[L('Open-Meteo: التوقع الساعي','Open-Meteo: hourly forecast'),URLS.f]]})}
  if(A&&A.hourly){const Ah=A.hourly,j0=Math.max(0,Ah.time.findIndex(x=>x.slice(0,13)===now));
    const dmax=Math.max(...Ah.dust.slice(j0,j0+24).filter(v=>v!=null),-1),amax=Math.max(...Ah.us_aqi.slice(j0,j0+24).filter(v=>v!=null),-1);
    const ld=lvUp(dmax,TH.dust);if(ld)out.push({kind:'dust',l:ld,day:0,title:L('غبار وعواصف رملية','Dust and sandstorms'),text:L(`تركيز الغبار قد يبلغ ${r0(dmax)} مكغ/م³ خلال الساعات الـ24 القادمة.`,`Dust may reach ${r0(dmax)} µg/m³ in the next 24 hours.`),advice:L('أغلق النوافذ، وارتدِ كمامة في الخارج، وانتبه إن كنت تعاني الربو أو الحساسية.','Close windows, wear a mask outdoors, and take care if you have asthma or allergies.'),src:[[L('Open-Meteo: جودة الهواء من كوبرنيكوس CAMS','Open-Meteo: air quality from Copernicus CAMS'),URLS.a]]});
    const la=lvUp(amax,TH.aqi);if(la)out.push({kind:'aqi',l:la,day:0,title:L('تلوث الهواء','Air pollution'),text:L(`مؤشر جودة الهواء قد يبلغ ${r0(amax)} (${aqiTxt(amax)}).`,`Air quality index may reach ${r0(amax)} (${aqiTxt(amax)}).`),advice:L('قلّل النشاط في الخارج، خصوصاً للأطفال وكبار السن.','Limit outdoor activity, especially for children and older people.'),src:[[L('Open-Meteo: جودة الهواء من كوبرنيكوس CAMS','Open-Meteo: air quality from Copernicus CAMS'),URLS.a]]})}
  return out.sort((a,b)=>b.l-a.l);
}
const R=6371,rad=x=>x*Math.PI/180;
const dist=(a,b,c,d)=>{const x=Math.sin(rad(c-a)/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(rad(d-b)/2)**2;return Math.round(2*R*Math.asin(Math.sqrt(x)))};
const GLV={Green:1,Orange:2,Red:3};
async function officialHazards(){
  const p=PLACE,out=[],errors=[];
  const day=n=>new Date(Date.now()-n*864e5).toISOString().slice(0,10);
  URLS.g=`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=TC;FL;VO;DR;WF&alertlevel=Green;Orange;Red&fromdate=${day(10)}&todate=${day(-1)}`;
  URLS.q='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson';URLS.q2='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
  const jobs=[getJSON(URLS.g,20000),getJSON(URLS.q),getJSON(URLS.q2)];
  if(p.cc==='US')jobs.push(getJSON(`https://api.weather.gov/alerts/active?point=${p.lat},${p.lon}`));
  const [g,q,q2,nws]=await Promise.allSettled(jobs);
  if(g.status==='fulfilled'){
    const TY={TC:['إعصار مداري','Tropical cyclone'],FL:['فيضانات','Floods'],VO:['نشاط بركاني','Volcanic activity'],DR:['جفاف','Drought'],WF:['حرائق غابات','Wildfires']};
    for(const f of g.value.features||[]){const e=f.properties||{},c=(f.geometry&&f.geometry.coordinates)||[];if(!e.url||!e.url.report)continue;
      const recent=e.iscurrent==='true'||(Date.now()-new Date(e.todate))<3*864e5;if(!recent)continue;
      const km=c.length>=2?dist(p.lat,p.lon,c[1],c[0]):99999,inC=(e.affectedcountries||[]).some(x=>x.iso2===p.cc);
      const near=e.eventtype==='TC'?km<=1500:e.eventtype==='FL'?(inC||km<=300):e.eventtype==='DR'?inC&&e.alertlevel!=='Green':e.eventtype==='VO'?km<=300:e.eventtype==='WF'?(km<=150||(inC&&km<=400)):false;
      if(!near)continue;
      let l=GLV[e.alertlevel]||1;if(e.eventtype==='DR')l=Math.max(1,l-1);if(e.eventtype==='TC'&&km>800)l=Math.max(1,l-1);
      const sev=e.severitydata&&e.severitydata.severitytext?` · ${e.severitydata.severitytext}`:'';
      out.push({kind:'gdacs-'+e.eventtype,l,title:`${L(TY[e.eventtype][0],TY[e.eventtype][1])}: ${String(e.eventname||e.name).replace(/-\d+$/,'')}`,
        text:L(`مستوى التنبيه في GDACS: ${({Green:'أخضر',Orange:'برتقالي',Red:'أحمر'})[e.alertlevel]||e.alertlevel}${inC?'، ويشمل بلدك':''}، وعلى بعد نحو ${kmTxt(km)} من مكانك${e.eventtype==='TC'&&e.severitydata&&e.severitydata.severity?`، وأقصى سرعة رياح ${r0(e.severitydata.severity)} كم/س`:''}.`,`${e.name}. GDACS alert level: ${e.alertlevel}. ${inC?'It affects your country. ':''}About ${kmTxt(km)} from you.${sev}`),
        advice:L('تابع تعليمات الدفاع المدني والجهة الرسمية في بلدك.','Follow civil defence and official instructions in your country.'),
        src:[[`GDACS · ${fmtDate(String(e.datemodified||e.todate).slice(0,10))}`,e.url.report]]})}
  }else errors.push('GDACS');
  const quakes=[];[q,q2].forEach(r=>{if(r.status==='fulfilled')(r.value.features||[]).forEach(f=>quakes.push(f))});
  if(q.status!=='fulfilled'&&q2.status!=='fulfilled')errors.push('USGS');
  const seen=new Set();
  quakes.filter(f=>{const c=f.geometry.coordinates,m=f.properties.mag,km=dist(p.lat,p.lon,c[1],c[0]);f._km=km;return !seen.has(f.id)&&seen.add(f.id)&&((m>=4.5&&km<=300)||(m>=2.5&&km<=100&&Date.now()-f.properties.time<864e5))})
    .sort((a,b)=>b.properties.mag-a.properties.mag).slice(0,3).forEach(f=>{const m=f.properties.mag,l=m>=7?3:m>=6?2:m>=5?1:0;
      out.push({kind:'quake-'+f.id,l,title:L(`زلزال بقوة ${r1(m)} درجة`,`Magnitude ${r1(m)} earthquake`),
        text:L(`${f.properties.place}، على بعد ${kmTxt(f._km)} من مكانك، ${timeAgo(f.properties.time)}.`,`${f.properties.place}, ${kmTxt(f._km)} from you, ${timeAgo(f.properties.time)}.`),
        advice:L('لا يمكن التنبؤ بالزلازل، وقد تتبع الزلزال هزات ارتدادية. راجع إرشادات الدفاع المدني.','Earthquakes cannot be predicted and aftershocks may follow. Check civil defence guidance.'),
        src:[[`USGS · ${fmtDate(new Date(f.properties.time).toISOString().slice(0,10))}`,f.properties.url]]})});
  if(nws){if(nws.status==='fulfilled'){const SV={Extreme:3,Severe:3,Moderate:2,Minor:1};(nws.value.features||[]).slice(0,5).forEach(f=>{const e=f.properties;
      out.push({kind:'nws-'+e.id,l:SV[e.severity]||1,title:e.event,text:e.headline||'',advice:(e.instruction||'').slice(0,300),src:[[`${e.senderName||'NWS'} · ${fmtDate((e.sent||e.effective||'').slice(0,10))}`,`https://forecast.weather.gov/MapClick.php?lat=${p.lat}&lon=${p.lon}`]]})})}else errors.push('NWS')}
  if(PLACE!==p)return;HZ.official=out.sort((a,b)=>b.l-a.l);HZ.errors=errors;
}
function renderDanger(){
  const s=$('#danger');if(!F){s.hidden=true;return}s.textContent='';s.hidden=false;
  const all=[...HZ.official,...HZ.model],lv=all.reduce((m,x)=>Math.max(m,x.l),0);s.dataset.level=lv;
  const head=el('div','danger-head'),b=el('span','badge');
  b.innerHTML=lv?'<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 3l10 18H2z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><path d="M12 10v5M12 18v.5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>':'<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const w=el('div');
  const H=[L('لا خطر ظاهر في مكانك','No visible hazard where you are'),L('انتبه: ظروف تستدعي الحذر','Be aware: conditions call for care'),L('استعد: خطر محتمل في مكانك','Be prepared: potential hazard where you are'),L('خطر: اتبع تعليمات الجهات الرسمية','Danger: follow official instructions')][lv];
  w.append(el('h2',null,H),el('p',null,HZ.pending?L('جارٍ فحص التنبيهات الرسمية للكوارث والزلازل…','Checking official disaster and earthquake alerts…'):lv?L(`المستوى الأعلى: ${lvName(lv)}. التفاصيل ومصدر كل تنبيه أدناه.`,`Highest level: ${lvName(lv)}. Details and the source of each alert below.`):L('فحصنا التوقعات للأيام الثلاثة القادمة والتنبيهات الرسمية للكوارث والزلازل القريبة، ولم نجد ما يستدعي الحذر.','We checked the next three days of forecasts and official alerts for nearby disasters and earthquakes, and found nothing that calls for caution.')));
  head.prepend(b);head.append(w);s.append(head);
  const sc=el('div','scale');sc.setAttribute('aria-label',L('درجات الخطورة','Severity levels'));[0,1,2,3].forEach(l=>{const x=el('span');const i=el('i');i.style.background=`var(--lv${l})`;x.append(i,lvName(l));sc.append(x)});s.append(sc);
  const group=(title,tag,list)=>{if(!list.length)return;const g=el('div','hz-group'),h=el('h3',null,title);h.append(el('span','tag',tag));g.append(h);const ul=el('ul','hz');
    list.forEach(z=>{const li=el('li');li.dataset.l=z.l;const tt=el('div','t');tt.append(el('b',null,z.title),el('span','lv',lvName(z.l)));li.append(tt,el('p',null,z.text));if(z.advice)li.append(el('p','advice',z.advice));li.append(srcLine(z.src));ul.append(li)});g.append(ul);s.append(g)};
  group(L('تنبيهات رسمية وبيانات رصد','Official alerts and observations'),L('مصدر رسمي','Official source'),HZ.official);
  group(L('تقدير آلي من التوقعات','Automatic estimate from forecasts'),L('تقدير وليس تنبيهاً رسمياً','Estimate, not an official warning'),HZ.model);
  if(HZ.errors&&HZ.errors.length)s.append(el('p','mute',L(`تعذّر الوصول الآن إلى: ${HZ.errors.join('، ')}. أعد تحميل الصفحة بعد قليل.`,`Could not reach: ${HZ.errors.join(', ')}. Reload shortly.`)));
  const o=official(PLACE.cc),pl=el('p','official-link');pl.append(L('المرجع الرسمي للتنبيهات في بلدك: ','Official warnings for your country: '),srcA(o.name,o.url));s.append(pl);
  renderDays();
}

/* ---------- مناخ العالم ---------- */
const MTH={outlets:['جهتان مستقلتان فأكثر','Two or more independent outlets'],official:['جهة رسمية أو أممية','Official or UN body'],data:['مطابق لبيانات GDACS','Matches GDACS data']};
function renderClimate(){
  const ul=$('#climate-list');ul.textContent='';
  if(!CLIMATE){ul.append(el('li','empty',L('تعذّر تحميل أخبار المناخ الآن.','Climate news could not be loaded right now.')));return}
  const hid=new Set(ADMIN.climate_hidden||[]),list=(CLIMATE[LANG]||[]).filter(x=>!hid.has(x.id)&&(x.sources||[]).length>=2);
  $('#climate-count').textContent=LANG==='en'?`${list.length} ${list.length===1?'story':'stories'}`:(list.length===1?'خبر واحد':list.length===2?'خبران':list.length<=10?`${list.length} أخبار`:`${list.length} خبراً`);
  if(!list.length){ul.append(el('li','empty',L('لا يوجد الآن خبر مناخي مؤكد من جهتين مستقلتين. نعرض الخبر فور تأكده.','No climate story is confirmed by two independent outlets right now. Stories appear as soon as they are confirmed.')));return}
  list.forEach(x=>{const li=el('li','item');li.id='c-'+x.id;li.append(el('span','cat',L('المناخ والطقس','Climate & weather')),el('p',null,x.title));
    const v=el('div','verify');v.append(el('span','g'+(x.grade==='strong'?' strong':''),x.grade==='strong'?L('مؤكد بقوة','Strongly confirmed'):L('مؤكد','Confirmed')),
      el('span',null,LANG==='en'?`${x.outlets} independent outlets`:(x.outlets===2?'جهتان مستقلتان':`${x.outlets} جهات مستقلة`)));
    (x.methods||[]).forEach(m=>v.append(el('span','m',L(MTH[m][0],MTH[m][1]))));li.append(v);
    const sl=el('ul','src-list');x.sources.forEach(s=>{const r=el('li');r.append(el('span','on',`${s.name} · ${fmtDate(s.date)}`));if(s.official)r.append(el('span','off',L('رسمي','official')));r.append(srcA(s.title,s.url));sl.append(r)});
    if(x.data){const r=el('li');r.append(el('span','on',`${L('بيانات','Data')}: GDACS · ${x.data.date?fmtDate(x.data.date):''}`),srcA(x.data.title,x.data.url));sl.append(r)}
    li.append(sl);ul.append(li)});
  const up=el('p','basis mute');up.style.fontSize='.8rem';up.textContent=`${L('آخر تحديث','Updated')}: ${fmtDate(CLIMATE.updated.slice(0,10))} · ${new Date(CLIMATE.updated).toLocaleTimeString(LANG==='en'?'en-GB':'ar-QA',{timeZone:'Asia/Qatar',hour:'numeric',minute:'2-digit',numberingSystem:'latn'})} ${L('بتوقيت الدوحة','Doha time')}`;up.id='climate-updated';$('#climate-updated')?.remove();ul.after(up);
}
function renderMethod(){
  const ol=$('#method');ol.textContent='';
  const li=(txt,links=[])=>{const x=el('li');x.append(txt+' ');links.forEach(([n,u],i)=>{if(i)x.append(' · ');x.append(srcA(n,u))});ol.append(x)};
  li(L('الطقس الآن والتوقعات الساعية واليومية: Open-Meteo، يجمع نماذج هيئات الأرصاد الوطنية (المركز الأوروبي ECMWF، والأميركية NOAA، والألمانية DWD وغيرها) ويختار الأدق لكل مكان.','Current weather, hourly and daily forecasts: Open-Meteo, which combines national weather models (ECMWF, NOAA, DWD and others) and picks the best for each place.'),[['open-meteo.com','https://open-meteo.com/'],...(URLS.f?[[L('بيانات مكانك','Your place\'s data'),URLS.f]]:[])]);
  li(L('جودة الهواء والغبار: Open-Meteo من خدمة كوبرنيكوس لمراقبة الغلاف الجوي CAMS.','Air quality and dust: Open-Meteo from the Copernicus Atmosphere Monitoring Service (CAMS).'),[['CAMS','https://atmosphere.copernicus.eu/'],...(URLS.a?[[L('بيانات مكانك','Your place\'s data'),URLS.a]]:[])]);
  li(L('الكوارث الجارية (أعاصير، فيضانات، جفاف، براكين، حرائق): النظام العالمي للتنبيه بالكوارث GDACS التابع للأمم المتحدة والمفوضية الأوروبية.','Ongoing disasters (cyclones, floods, drought, volcanoes, wildfires): the Global Disaster Alert and Coordination System (GDACS) of the UN and the European Commission.'),[['gdacs.org','https://www.gdacs.org/']]);
  li(L('الزلازل: هيئة المسح الجيولوجي الأميركية USGS (بقوة 4.5 فأكثر خلال أسبوع ضمن 300 كم، و2.5 فأكثر خلال يوم ضمن 100 كم).','Earthquakes: US Geological Survey (magnitude 4.5+ in the past week within 300 km, and 2.5+ in the past day within 100 km).'),[['earthquake.usgs.gov','https://earthquake.usgs.gov/']]);
  li(L('داخل الولايات المتحدة: تنبيهات هيئة الأرصاد الوطنية NWS الرسمية.','In the United States: official National Weather Service alerts.'),[['weather.gov','https://www.weather.gov/']]);
  li(L(`عتبات التقدير الآلي (أصفر / برتقالي / أحمر) للأيام الثلاثة القادمة: الحرارة المحسوسة ${TH.heat.join(' / ')}° أو العظمى 44 / 48 / 52°، الصغرى ${TH.cold.join(' / ')}°، هبّات الرياح ${TH.gust.join(' / ')} كم/س، الهطول اليومي ${TH.rain.join(' / ')} مم، الثلوج ${TH.snow.join(' / ')} سم، الأشعة فوق البنفسجية 8 / 11، الغبار ${TH.dust.join(' / ')} مكغ/م³، مؤشر جودة الهواء ${TH.aqi.join(' / ')}، والعواصف الرعدية (أصفر، وبرتقالي مع البَرَد)، والرؤية أقل من 1000 متر (أصفر) أو 200 متر (برتقالي).`,
    `Automatic estimate thresholds (yellow / orange / red) for the next three days: feels-like ${TH.heat.join(' / ')}° or high 44 / 48 / 52°, low ${TH.cold.join(' / ')}°, gusts ${TH.gust.join(' / ')} km/h, daily precipitation ${TH.rain.join(' / ')} mm, snow ${TH.snow.join(' / ')} cm, UV 8 / 11, dust ${TH.dust.join(' / ')} µg/m³, air quality index ${TH.aqi.join(' / ')}, thunderstorms (yellow, orange with hail), and visibility below 1000 m (yellow) or 200 m (orange).`));
  li(L('أخبار المناخ: عناوين الجهات الناشرة كما نشرتها، يُجمع الخبر الواحد من جهتين مستقلتين على الأقل، وتُطابق الأحداث مع بيانات GDACS حين تتوفر.','Climate news: the outlets\' own headlines; each story needs at least two independent outlets, and events are matched against GDACS data where available.'),[['data/climate.json','../data/climate.json']]);
  li(L('أسماء المدن: خدمة البحث الجغرافي في Open-Meteo (GeoNames)، وتحديد الموقع من متصفحك ولا يُرسل إلى «عبدو نيوز».','City names: Open-Meteo geocoding (GeoNames); your location comes from your browser and is never sent to Abdo News.'),[['GeoNames','https://www.geonames.org/']]);
}

/* ---------- التشغيل ---------- */
function rerender(){header();fillCountries();fillPopular();if(PLACE&&F){const w=$('#wx-place');w.textContent='';w.append(el('h2',null,PLACE.name),el('span','mute',[PLACE.admin,PLACE.cc?cName(PLACE.cc):''].filter(Boolean).join(LANG==='en'?', ':'، ')));renderNow();renderHours();HZ.model=modelHazards();renderDanger()}renderClimate();renderMethod()}
$('#lang-btn').onclick=()=>{LANG=LANG==='en'?'ar':'en';document.documentElement.lang=LANG;document.documentElement.dir=LANG==='en'?'ltr':'rtl';try{localStorage.setItem('khabar-lang',LANG)}catch(e){}
  // أسماء المدن من خدمة البحث بلغة الواجهة
  if(PLACE&&PLACE.q&&!PLACE.mine){geocode(PLACE.q,PLACE.cc,3).then(r=>{if(r[0]){PLACE={...PLACE,name:plain(r[0].name),admin:plain(r[0].admin1)};store.set('khabar-wx-place',PLACE)}rerender()}).catch(rerender)}else rerender()};
$('#theme-btn').onclick=()=>{const r=document.documentElement;const dark=r.dataset.theme==='dark'||(!r.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);r.dataset.theme=dark?'light':'dark';try{localStorage.setItem('khabar-theme',r.dataset.theme)}catch(e){}header()};
(async function init(){
  header();bindCity();
  const [ad,cl]=await Promise.allSettled([fetch('../data/admin.json',{cache:'no-cache'}).then(r=>r.json()),fetch('../data/climate.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()})]);
  if(ad.status==='fulfilled'&&ad.value)ADMIN=ad.value;if(cl.status==='fulfilled')CLIMATE=cl.value;
  // المكان: آخر ما اختاره الزائر في متصفحه، ثم المكان الافتراضي من لوحة الإدارة، ثم الدوحة
  const last=store.get('khabar-wx-place',null),def=ADMIN.weather_default;
  fillCountries();
  if(last&&last.lat!=null){PLACE=last;$('#country').value=last.cc||'QA';fillPopular();loadWeather()}
  else{const cc=(def&&def.cc)||'QA',q=(def&&def.q)||'Doha';$('#country').value=cc;fillPopular();
    try{const r=await geocode(q,cc,3);const g=r.find(x=>/^PPL/.test(x.feature_code||''))||r[0];PLACE={...placeOf(g),q};loadWeather()}
    catch(e){PLACE={name:L('الدوحة','Doha'),admin:'',cc:'QA',lat:25.2854,lon:51.531,q:'Doha'};loadWeather()}}
  renderClimate();renderMethod();
  if(location.hash==='#climate')setTimeout(()=>$('#climate').scrollIntoView(),300);
})();
if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('../sw.js',{scope:'../'}).catch(()=>{});
})();
