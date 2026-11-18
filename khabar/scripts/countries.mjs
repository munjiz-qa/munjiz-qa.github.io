// «خبر»: محرك «الأوضاع في الدول» الآلي. يعمل كل 3 ساعات من khabar.yml، ويعيده الطيار الآلي إن تأخر، دون أي جلسة محرر.
//  - لكل دولة (بريطانيا، ليبيا، إسرائيل، وما يُضاف لاحقاً في COUNTRIES) ستة محاور: سياسي، عسكري، أمني، اقتصادي، تظاهرات واحتجاجات،
//    ومحور سادس يناسب الدولة (التعاون مع الناتو لبريطانيا، التدخل الخارجي والمسار الأممي لليبيا، العلاقات الدولية والجبهات لإسرائيل).
//  - يجمع العناوين من خلاصات ناشرين مباشرة (محلية ودولية) ومن أخبار Google، بالعربية والإنجليزية.
//  - قاعدة المصدرين: لا يُنشر إلا عنقود نشرته جهتان مستقلتان على الأقل (نطاقان مختلفان)، ولكل جهة رابط مقالها الأصلي.
//  - يكتب data/countries.json، ثم تمر بالبوابة khabar/agent/countries.py --enforce.
// لإضافة دولة: أضف كائناً إلى COUNTRIES بالبنية نفسها (id، الاسم، العلم، اللون، c: ما يدل على الدولة، axes)، ثم ملفها التحريري في data/countries-editorial.json.
// الاستخدام: node khabar/scripts/countries.mjs [--only=uk,libya] [--no-news] [--dry]
import {readFileSync, writeFileSync} from 'node:fs';
import {cluster, decodeGoogle, outlet, host, toks} from './milwatch.mjs';

const ROOT = 'khabar/data/', ARGS = process.argv.slice(2);
const ONLY = (ARGS.find(a => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean);
const UA = {'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 khabar-countries'};
const readJSON = (f, d) => { try { return JSON.parse(readFileSync(ROOT + f, 'utf8')); } catch (e) { return d; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ent = s => s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&amp;/g, '&');
const text = s => ent(s || '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim();
const tag = (x, t) => (x.match(new RegExp(`<${t}[^>]*>([\\s\\S]*?)</${t}>`)) || [])[1] || '';
const dohaDay = (d = new Date()) => new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Qatar'}).format(d);
const hash = s => { let h = 2166136261; for (const ch of s) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
async function rss(url) {
  const r = await fetch(url, {headers: UA, signal: AbortSignal.timeout(20000)});
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return (await r.text()).split(/<item[\s>]|<entry[\s>]/).slice(1).map(it => {
    const d = new Date(text(tag(it, 'pubDate')) || text(tag(it, 'dc:date')) || text(tag(it, 'updated')) || text(tag(it, 'published')));
    const link = text(tag(it, 'link')) || (it.match(/<link[^>]*href="([^"]+)"/) || [])[1] || '';
    return {title: text(tag(it, 'title')), link, source: text(tag(it, 'source')), d};
  }).filter(x => x.title && !isNaN(x.d));
}

// ---------- المحاور المشتركة ----------
// كل محور: ar/en للاسم، و rx للتعرّف على العنوان، و q لكلمات استعلام أخبار Google
const AX = {
  politics: {ar: 'السياسي', en: 'Politics',
    rx: {ar: /حكوم|البرلمان|برلمان|رئيس الوزراء|رئيس الحكومة|وزير|وزارة|حزب|انتخاب|الائتلاف|المعارضة|الكنيست|مجلس النواب|مجلس الدولة|المجلس الرئاسي|قانون|تصويت|استطلاع|سياس/, en: /government|parliament|prime minister|\bPM\b|minister|cabinet|party|election|coalition|opposition|Knesset|House of Representatives|Presidential Council|bill\b|vote|poll|politic|Labour|Conservative|Tory|Tories|Reform UK|Likud|Commons|Downing/i},
    q: {ar: '(الحكومة OR البرلمان OR رئيس الوزراء OR انتخابات OR حزب OR وزير)', en: '(government OR parliament OR "prime minister" OR election OR party OR minister)'}},
  military: {ar: 'العسكري', en: 'Military',
    rx: {ar: /عسكري|الجيش|جيش|قوات|صاروخ|صواريخ|مسي[َّ]?رة|مسيرات|مسيّرات|غارة|غارات|قصف|البحرية|سلاح الجو|دفاع|حاملة|مدمرة|غواصة|جنود|ألوية|كتيبة|لواء|مناورات|سلاح/, en: /military|army|troops|Royal Navy|RAF|navy|naval|air force|defen[cs]e|missile|drone|strike|airstrike|warship|submarine|soldier|armed forces|IDF|brigade|battalion|drill|weapons?|arms|reservist/i},
    q: {ar: '(الجيش OR عسكري OR قوات OR غارة OR صواريخ OR مسيرات OR دفاع)', en: '(military OR army OR troops OR defence OR navy OR missile OR drone OR strike)'}},
  security: {ar: 'الأمني', en: 'Security',
    rx: {ar: /أمن|الأمن|الشرطة|شرطة|إرهاب|اعتقال|القبض|اغتيال|خطف|اختطاف|تهريب|الهجرة غير|مهاجرين|اشتباك|إطلاق نار|طعن|تفجير|تجسس|سيبران|جريمة|سجن|حدود/, en: /police|terror|counter-terror|MI5|MI6|Shin Bet|Mossad|arrest|detain|kidnap|abduct|assassinat|smuggl|migrant|small boats|Channel crossing|shooting|stabbing|knife|bomb|explosion|spy|espionage|cyber|crime|prison|border|security/i},
    q: {ar: '(الأمن OR الشرطة OR إرهاب OR اعتقال OR اغتيال OR تهريب OR مهاجرين)', en: '(police OR terror OR arrest OR security OR migrants OR shooting OR spy)'}},
  economy: {ar: 'الاقتصادي', en: 'Economy',
    rx: {ar: /اقتصاد|التضخم|تضخم|الفائدة|المركزي|مصرف|بنك|الميزانية|موازنة|ضريب|النمو|الناتج|العملة|الجنيه|الدينار|الشيكل|النفط|الإنتاج|الإيرادات|البطالة|الدين|الأسعار|الاستثمار|البورصة|صادرات/, en: /econom|inflation|interest rate|central bank|Bank of England|Bank of Israel|budget|tax|growth|GDP|pound|sterling|dinar|shekel|oil|output|revenue|unemployment|jobs|debt|borrowing|prices|invest|FTSE|TASE|exports|NOC|rating/i},
    q: {ar: '(الاقتصاد OR التضخم OR الفائدة OR المصرف المركزي OR الميزانية OR النفط OR العملة)', en: '(economy OR inflation OR "interest rate" OR "central bank" OR budget OR oil OR currency OR growth)'}},
  protests: {ar: 'التظاهرات والاحتجاجات', en: 'Protests',
    rx: {ar: /تظاهر|مظاهر|احتجاج|محتج|اعتصام|مسيرة احتجاج|إضراب|عصيان|غضب شعبي|متظاهر/, en: /protest|demonstrat|march(ed|ers)\b|\brally\b|rallies|walkout|picket|riot|unrest|sit-in|(general|labou?r|national|rail|doctors'?|teachers'?|workers'?|nurses'?|union) strikes?|on strike|strike action|strikers/i},
    q: {ar: '(مظاهرات OR احتجاجات OR تظاهرة OR إضراب OR اعتصام OR متظاهرين)', en: '(protest OR protesters OR demonstration OR rally OR strike OR march)'}}
};
const axis = (id, extra) => Object.assign({id}, AX[id] || {}, extra || {});

// ---------- الدول ----------
const W = ' when:2d';
// المحور الخارجي العام: الناتو والاتحاد الأوروبي والأمم المتحدة والاتفاقات الجديدة
const INTL = {id: 'intl', ar: 'العلاقات الخارجية', en: 'Foreign relations',
  rx: {ar: /الناتو|الأطلسي|الاتحاد الأوروبي|الأمم المتحدة|مجلس الأمن|اتفاق|اتفاقية|معاهدة|قمة|زيارة رسمية|سفير|عقوبات|وساطة|مفاوضات|مبعوث|العلاقات/, en: /NATO|\bEU\b|European Union|United Nations|\bUN\b|Security Council|agreement|\bdeal\b|treaty|summit|state visit|ambassador|sanction|talks|mediat|envoy|bilateral|relations/i},
  q: {ar: '(الناتو OR "الاتحاد الأوروبي" OR "الأمم المتحدة" OR اتفاق OR قمة OR عقوبات OR مفاوضات)', en: '(NATO OR EU OR "United Nations" OR agreement OR summit OR sanctions OR talks)'}};
const STD = () => [axis('politics'), axis('military'), axis('security'), axis('economy'), axis('protests'), INTL];
const BBC_ME = 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', F24_ME = 'https://www.france24.com/ar/%D8%A7%D9%84%D8%B4%D8%B1%D9%82-%D8%A7%D9%84%D8%A3%D9%88%D8%B3%D8%B7/rss';
export const COUNTRIES = [
  {id: 'uk', ar: 'بريطانيا', en: 'United Kingdom', flag: '🇬🇧', color: '#1F3A93', iso: 'GB', iso3: 'GBR', region: 'europe',
    c: {ar: /بريطاني|المملكة المتحدة|لندن|ستارمر|إنجلترا|انجلترا|اسكتلند|ويلز|داونينغ/, en: /\bUK\b|\bU\.K\.|Britain|British|United Kingdom|London|Starmer|England|English|Scotland|Scottish|Wales|Welsh|Westminster|Downing Street|Whitehall|Farage|Badenoch|Labour|Tories|Reform UK|Bank of England|Royal Navy|\bRAF\b|MoD\b/i},
    q: {ar: '(بريطانيا OR "المملكة المتحدة" OR لندن)', en: '(UK OR Britain OR British)'},
    feeds: {local: {en: ['https://feeds.bbci.co.uk/news/uk/rss.xml', 'https://feeds.bbci.co.uk/news/politics/rss.xml', 'https://www.theguardian.com/uk-news/rss', 'https://www.theguardian.com/politics/rss', 'https://feeds.skynews.com/feeds/rss/uk.xml', 'https://feeds.skynews.com/feeds/rss/politics.xml', 'https://ukdefencejournal.org.uk/feed/', 'https://www.forces.net/rss.xml'], ar: []}, extra: {en: [], ar: []}},
    cities: [['لندن', 'London'], ['مانشستر', 'Manchester'], ['برمنغهام', 'Birmingham'], ['ليفربول', 'Liverpool'], ['ليدز', 'Leeds'], ['غلاسكو', 'Glasgow'], ['إدنبرة', 'Edinburgh'], ['كارديف', 'Cardiff'], ['بلفاست', 'Belfast'], ['بريستول', 'Bristol']],
    axes: [axis('politics'), axis('military'), axis('security'), axis('economy'), axis('protests'),
      {id: 'nato', ar: 'التعاون مع الناتو والعلاقات الخارجية', en: 'NATO cooperation and foreign relations',
        rx: {ar: /الناتو|الأطلسي|الحلف|حلف شمال|أوكرانيا|روسيا|البلطيق|إستونيا|تحالف الراغبين|الحلفاء|الاتحاد الأوروبي|الأمم المتحدة|اتفاق|اتفاقية|معاهدة|قمة/, en: /NATO|alliance|allies|Ukraine|Russia|Baltic|Estonia|coalition of the willing|Article 5|Nordic|JEF\b|Joint Expeditionary|\bEU\b|European Union|Brussels|United Nations|\bUN\b|agreement|treaty|summit|trade deal/i},
        q: {ar: '(الناتو OR "حلف شمال الأطلسي" OR أوكرانيا OR "الاتحاد الأوروبي" OR اتفاق)', en: '(NATO OR alliance OR Ukraine OR "European Union" OR treaty OR "trade deal")'}}]},
  {id: 'libya', ar: 'ليبيا', en: 'Libya', flag: '🇱🇾', color: '#2E7D4F', iso: 'LY', iso3: 'LBY', region: 'africa',
    c: {ar: /ليبي|طرابلس|بنغازي|مصراتة|الدبيبة|حفتر|سرت|فزان|سبها|الزاوية|المنفي|تكالة|عقيلة|درنة/, en: /Libya|Tripoli|Benghazi|Misrata|Dbeibah|Haftar|Sirte|Fezzan|Sabha|Zawiya|Menfi|UNSMIL|Derna/i},
    q: {ar: 'ليبيا', en: 'Libya'},
    feeds: {local: {en: ['https://libyaherald.com/feed/', 'https://libyareview.com/feed/'], ar: []}, extra: {en: ['https://feeds.bbci.co.uk/news/world/africa/rss.xml'], ar: []}},
    cities: [['طرابلس', 'Tripoli'], ['بنغازي', 'Benghazi'], ['مصراتة', 'Misrata'], ['الزاوية', 'Zawiya'], ['سرت', 'Sirte'], ['سبها', 'Sabha'], ['درنة', 'Derna'], ['البيضاء', 'Bayda'], ['طبرق', 'Tobruk'], ['زليتن', 'Zliten']],
    axes: [axis('politics', {rx: {ar: AX.politics.rx.ar, en: /government|parliament|House of Representatives|High Council of State|Presidential Council|prime minister|\bPM\b|minister|election|unif|roadmap|politic|Dbeibah|Hammad|Menfi|Saleh|Takala/i}}),
      axis('military', {rx: {ar: /عسكري|الجيش|جيش|قوات|ميليشي|مليشي|كتيبة|لواء|اشتباك|اشتباكات|سلاح|مسيرة|مسيّرة|قيادة عامة|حفتر/, en: /military|army|forces|militia|armed group|brigade|clash|weapons|arms|drone|LNA|Haftar|5\+5|ceasefire/i}}),
      axis('security'), axis('economy', {rx: {ar: /اقتصاد|النفط|نفط|المؤسسة الوطنية|مصرف ليبيا|المصرف المركزي|الدينار|السيولة|الميزانية|الإنفاق|الإيرادات|الإنتاج|الوقود|الأسعار|الكهرباء|الرواتب/, en: /econom|oil|NOC\b|National Oil|Central Bank|CBL|dinar|liquidity|budget|spending|revenue|output|production|fuel|prices|electricity|salaries|barrels/i}}),
      axis('protests'),
      {id: 'intl', ar: 'التدخل الخارجي والمسار الأممي', en: 'Foreign role and UN track',
        rx: {ar: /البعثة الأممية|الأمم المتحدة|تيتيه|مجلس الأمن|تركي|روسي|مصر|الإمارات|إيطالي|الاتحاد الأوروبي|أميركي|أمريكي|واشنطن|المرتزقة|القوات الأجنبية|برلين|خارطة الطريق|اتفاق/, en: /UNSMIL|United Nations|\bUN\b|Tetteh|Security Council|Turk|Russia|Wagner|Africa Corps|Egypt|UAE|Emirat|Ital|European Union|\bEU\b|U\.S\.|United States|Washington|mercenar|foreign forces|Berlin process|roadmap|agreement/i},
        q: {ar: '(البعثة الأممية OR الأمم المتحدة OR تركيا OR روسيا OR مصر OR مجلس الأمن)', en: '(UNSMIL OR "United Nations" OR Turkey OR Russia OR Egypt OR "Security Council")'}}]},
  {id: 'israel', ar: 'إسرائيل', en: 'Israel', flag: '🇮🇱', color: '#3A5FB0', iso: 'IL', iso3: 'ISR', region: 'mideast',
    c: {ar: /إسرائيل|الإسرائيلي|تل أبيب|نتنياهو|الكنيست|القدس/, en: /Israel|Israeli|Tel Aviv|Netanyahu|Knesset|IDF|Shin Bet|Mossad|Jerusalem|Likud|Bank of Israel|Ben-Gvir|Smotrich|Haredi/i},
    q: {ar: 'إسرائيل', en: 'Israel'},
    feeds: {local: {en: ['https://www.jpost.com/rss/rssfeedsheadlines.aspx', 'https://www.haaretz.com/srv/haaretz-latest-headlines', 'https://www.ynetnews.com/Integration/StoryRss2.xml'], ar: ['https://www.arab48.com/rss']}, extra: {en: [BBC_ME], ar: [F24_ME]}},
    cities: [['تل أبيب', 'Tel Aviv'], ['القدس', 'Jerusalem'], ['حيفا', 'Haifa'], ['بئر السبع', 'Beersheba'], ['قيسارية', 'Caesarea']],
    axes: [axis('politics'), axis('military'), axis('security'), axis('economy'), axis('protests'),
      {id: 'intl', ar: 'العلاقات الدولية والجبهات', en: 'Foreign relations and fronts',
        rx: {ar: /واشنطن|الولايات المتحدة|أميركي|أمريكي|ترامب|محكمة|العدل الدولية|الجنائية|مجلس الأمن|الأمم المتحدة|عقوبات|تطبيع|إيران|لبنان|حزب الله|سوري|غزة|الضفة|مصر|قطر|وساطة|سفير|اعتراف|الاتحاد الأوروبي/, en: /Washington|United States|\bU\.S\.|Trump|court|ICJ|ICC|Security Council|United Nations|\bUN\b|sanction|normali[sz]|Abraham Accords|Iran|Leban|Hezbollah|Syria|Gaza|West Bank|Egypt|Qatar|mediat|ambassador|recogni[sz]|embargo|\bEU\b/i},
        q: {ar: '(واشنطن OR "مجلس الأمن" OR إيران OR لبنان OR غزة OR وساطة OR عقوبات)', en: '(Washington OR "Security Council" OR Iran OR Lebanon OR Gaza OR sanctions OR mediation)'}}]},
  {id: 'sudan', ar: 'السودان', en: 'Sudan', flag: '🇸🇩', color: '#B5832A', iso: 'SD', iso3: 'SDN', region: 'africa',
    c: {ar: /السودان|السوداني|الخرطوم|الدعم السريع|البرهان|حميدتي|دارفور|كردفان|الفاشر|بورتسودان|أم درمان/, en: /Sudan|Khartoum|\bRSF\b|Rapid Support|Burhan|Hemedti|Darfur|Kordofan|El Fasher|El-Fasher|Port Sudan|Omdurman/i},
    q: {ar: 'السودان', en: 'Sudan'},
    feeds: {local: {en: ['https://www.dabangasudan.org/en/feed'], ar: ['https://www.alsudaninews.com/?feed=rss2']}, extra: {en: ['https://feeds.bbci.co.uk/news/world/africa/rss.xml'], ar: []}},
    cities: [['الخرطوم', 'Khartoum'], ['أم درمان', 'Omdurman'], ['بورتسودان', 'Port Sudan'], ['الفاشر', 'El Fasher'], ['نيالا', 'Nyala'], ['الأبيض', 'El Obeid'], ['كادقلي', 'Kadugli'], ['الجنينة', 'Geneina']],
    axes: STD()},
  {id: 'yemen', ar: 'اليمن', en: 'Yemen', flag: '🇾🇪', color: '#8A3A2E', iso: 'YE', iso3: 'YEM', region: 'mideast',
    c: {ar: /اليمن|اليمني|الحوثي|صنعاء|عدن|مأرب|الحديدة|تعز|حضرموت|المجلس الانتقالي/, en: /Yemen|Houthi|Sanaa|Aden|Marib|Hodeidah|Taiz|Hadramout|Hadhramaut|Ansar Allah/i},
    q: {ar: 'اليمن', en: 'Yemen'},
    feeds: {local: {en: ['https://www.yemenmonitor.com/en/rss'], ar: []}, extra: {en: [BBC_ME], ar: [F24_ME]}},
    cities: [['صنعاء', 'Sanaa'], ['عدن', 'Aden'], ['مأرب', 'Marib'], ['الحديدة', 'Hodeidah'], ['تعز', 'Taiz'], ['المكلا', 'Mukalla']],
    axes: STD()},
  {id: 'syria', ar: 'سوريا', en: 'Syria', flag: '🇸🇾', color: '#007A3D', iso: 'SY', iso3: 'SYR', region: 'mideast',
    c: {ar: /سوري|دمشق|الشرع|حلب|حمص|إدلب|اللاذقية|السويداء|قسد|دير الزور|طرطوس/, en: /Syria|Damascus|Sharaa|Aleppo|Homs|Idlib|Latakia|Sweida|Suwayda|\bSDF\b|Deir ez-Zor|Tartus/i},
    q: {ar: 'سوريا', en: 'Syria'},
    feeds: {local: {en: ['https://english.enabbaladi.net/feed/'], ar: ['https://www.enabbaladi.net/feed/']}, extra: {en: [BBC_ME], ar: [F24_ME]}},
    cities: [['دمشق', 'Damascus'], ['حلب', 'Aleppo'], ['حمص', 'Homs'], ['اللاذقية', 'Latakia'], ['السويداء', 'Sweida'], ['إدلب', 'Idlib'], ['دير الزور', 'Deir ez-Zor'], ['درعا', 'Daraa']],
    axes: STD()},
  {id: 'lebanon', ar: 'لبنان', en: 'Lebanon', flag: '🇱🇧', color: '#C8102E', iso: 'LB', iso3: 'LBN', region: 'mideast',
    c: {ar: /لبنان|اللبناني|بيروت|حزب الله|الليطاني|جنوب لبنان|البقاع|طرابلس اللبنانية|اليونيفيل/, en: /Leban|Beirut|Hezbollah|Litani|UNIFIL|Bekaa/i},
    q: {ar: 'لبنان', en: 'Lebanon'},
    feeds: {local: {en: [], ar: []}, extra: {en: [BBC_ME], ar: [F24_ME]}},
    cities: [['بيروت', 'Beirut'], ['صيدا', 'Sidon'], ['صور', 'Tyre'], ['النبطية', 'Nabatieh'], ['بعلبك', 'Baalbek']],
    axes: STD()},
  {id: 'ukraine', ar: 'أوكرانيا', en: 'Ukraine', flag: '🇺🇦', color: '#0057B7', iso: 'UA', iso3: 'UKR', region: 'europe',
    c: {ar: /أوكراني|كييف|زيلينسكي|خاركيف|أوديسا|دونباس|زابوريجيا|دونيتسك/, en: /Ukrain|Kyiv|Kiev|Zelensky|Kharkiv|Odesa|Donbas|Zaporizhzhia|Donetsk|Dnipro/i},
    q: {ar: 'أوكرانيا', en: 'Ukraine'},
    feeds: {local: {en: ['https://kyivindependent.com/news-archive/rss/', 'https://www.ukrinform.net/rss/block-lastnews'], ar: []}, extra: {en: ['https://feeds.bbci.co.uk/news/world/europe/rss.xml'], ar: []}},
    cities: [['كييف', 'Kyiv'], ['خاركيف', 'Kharkiv'], ['أوديسا', 'Odesa'], ['لفيف', 'Lviv'], ['دنيبرو', 'Dnipro'], ['زابوريجيا', 'Zaporizhzhia']],
    axes: STD()},
  {id: 'iran', ar: 'إيران', en: 'Iran', flag: '🇮🇷', color: '#239F40', iso: 'IR', iso3: 'IRN', region: 'mideast',
    c: {ar: /إيران|الإيراني|طهران|خامنئي|بزشكيان|الحرس الثوري|عراقجي/, en: /Iran|Tehran|Khamenei|Pezeshkian|IRGC|Araghchi|\brial\b/i},
    q: {ar: 'إيران', en: 'Iran'},
    feeds: {local: {en: ['https://www.iranintl.com/en/feed'], ar: []}, extra: {en: [BBC_ME], ar: [F24_ME]}},
    cities: [['طهران', 'Tehran'], ['مشهد', 'Mashhad'], ['أصفهان', 'Isfahan'], ['تبريز', 'Tabriz'], ['شيراز', 'Shiraz'], ['الأهواز', 'Ahvaz']],
    axes: STD()},
  {id: 'usa', ar: 'الولايات المتحدة', en: 'United States', flag: '🇺🇸', color: '#14212E', iso: 'US', iso3: 'USA', region: 'americas',
    // حساس لحالة الأحرف حتى لا تُطابق «us» الإنجليزية
    c: {ar: /الولايات المتحدة|أميركي|أمريكي|واشنطن|ترامب|البيت الأبيض|الكونغرس|البنتاغون/, en: /United States|U\.S\.|\bUS\b|America|Washington|Trump|White House|Congress|Senate|Pentagon|Federal Reserve|\bFed\b|Wall Street/},
    q: {ar: '("الولايات المتحدة" OR واشنطن OR ترامب)', en: '("United States" OR "U.S." OR Washington)'},
    feeds: {local: {en: ['https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml'], ar: []}, extra: {en: [], ar: []}},
    cities: [['نيويورك', 'New York'], ['واشنطن', 'Washington'], ['لوس أنجلوس', 'Los Angeles'], ['شيكاغو', 'Chicago'], ['بورتلاند', 'Portland'], ['سان فرانسيسكو', 'San Francisco'], ['مينيابوليس', 'Minneapolis']],
    axes: STD()},
  {id: 'france', ar: 'فرنسا', en: 'France', flag: '🇫🇷', color: '#2B4C9B', iso: 'FR', iso3: 'FRA', region: 'europe',
    c: {ar: /فرنس|باريس|ماكرون|الإليزيه|الجمعية الوطنية الفرنسية/, en: /France|French|Paris|Macron|Elysee|Élysée|National Assembly/i},
    q: {ar: 'فرنسا', en: 'France'},
    feeds: {local: {en: ['https://www.france24.com/en/france/rss'], ar: []}, extra: {en: ['https://feeds.bbci.co.uk/news/world/europe/rss.xml'], ar: []}},
    cities: [['باريس', 'Paris'], ['مرسيليا', 'Marseille'], ['ليون', 'Lyon'], ['تولوز', 'Toulouse'], ['نانت', 'Nantes'], ['بوردو', 'Bordeaux'], ['ليل', 'Lille']],
    axes: STD()}
];
// خلاصات عامة دولية وعربية: يُقبل منها ما يدل عنوانه على الدولة
const GENERAL = {
  ar: ['https://feeds.bbci.co.uk/arabic/rss.xml', 'https://www.skynewsarabia.com/web/rss', 'https://www.france24.com/ar/rss', 'https://rss.dw.com/rdf/rss-ar-all', 'https://aawsat.com/feed', 'https://www.aljazeera.net/aljazeerarss/a7c186be-1baa-4bd4-9d80-a84db769f779/73d0e1b4-532f-45ef-b135-bfdff8b8cab9', 'https://arabic.rt.com/rss/', 'https://www.alquds.co.uk/feed/'],
  en: ['https://feeds.bbci.co.uk/news/world/rss.xml', 'https://www.aljazeera.com/xml/rss/all.xml', 'https://www.theguardian.com/world/rss', 'https://rss.dw.com/rdf/rss-en-world', 'https://www.france24.com/en/rss', 'https://www.lemonde.fr/en/rss/une.xml', 'https://feeds.npr.org/1004/rss.xml']
};
const SKIP = /horoscope|recipe|coupon|promo code|lottery|quiz|crossword|wordle|premier league|football|soccer|cricket|rugby|tennis|celebrity|strictly|bake off|برج|حظك|وصفة|بث مباشر|مباراة|كرة القدم|الدوري|مسلسل|فيلم/i;
export const STATS = {google: 0, decoded: 0, direct: 0, clusters: 0, failed: []};
const GOOGLE_OFF = {v: false};

// يحدد محور العنوان: أول محور يطابقه بترتيب المحاور (ما لا يطابق أي محور لا يُنشر)
// أولوية التصنيف: التظاهرات أولاً (عدا الاحتجاج الدبلوماسي)، ثم العسكري والأمني والاقتصادي والخارجي، والسياسي أخيراً لأنه الأعم
const PRIO = ['protests', 'military', 'security', 'economy', 'intl', 'nato', 'politics'];
const DIPLO = {ar: /احتجاج رسمي|مذكرة احتجاج|احتجاجا رسميا|احتجاجاً رسمياً|تحتج لدى|يحتج لدى|استدعاء السفير/, en: /(UN|formal|diplomatic|official) protest|protest (note|letter|to the UN)|lodge[sd]? (a )?protest|files? (a |new )?(\w+ )?protest|summon/i};
const axisOf = (C, lang, title) => {
  for (const id of PRIO) { const a = C.axes.find(x => x.id === id); if (!a || !a.rx[lang].test(title)) continue; if (id === 'protests' && DIPLO[lang].test(title)) continue; return id; }
  return null;
};

async function gatherCountry(C, lang, since, budget, feedCache, google) {
  const pool = [];
  const take = (it, url, src, local) => {
    if (!(it.d >= since) || SKIP.test(it.title)) return;
    if (!local && !C.c[lang].test(it.title)) return;
    const ax = axisOf(C, lang, it.title); if (!ax) return;
    pool.push({title: it.title.slice(0, 240), source: src, url, glink: it.glink, outlet: url ? outlet(url) : src, t: +it.d, ax});
  };
  const feeds = [...(C.feeds.local[lang] || []).map(f => [f, true]), ...[...(C.feeds.extra?.[lang] || []), ...GENERAL[lang]].map(f => [f, false])];
  for (const [f, local] of feeds) {
    try {
      if (!feedCache.has(f)) { feedCache.set(f, await rss(f)); STATS.direct++; }
      for (const it of feedCache.get(f)) { const url = it.link.replace(/^http:/, 'https:'); if (/^https:\/\//.test(url)) take(it, url, it.source || host(f), local); }
    } catch (e) { feedCache.set(f, []); STATS.failed.push(`direct ${f}: ${e.message}`); }
  }
  // أخبار Google: استعلام لكل محور يضمن جهات إضافية لكل محور (لعدد محدود من الدول في كل تشغيل، بالتدوير)
  if (google && !GOOGLE_OFF.v) {
    const loc = lang === 'ar' ? 'hl=ar&gl=QA&ceid=QA:ar' : 'hl=en-GB&gl=GB&ceid=GB:en';
    for (const a of C.axes) {
      if (GOOGLE_OFF.v) break;
      try {
        for (const it of (await rss(`https://news.google.com/rss/search?q=${encodeURIComponent(C.q[lang] + ' ' + a.q[lang] + W)}&${loc}`)).slice(0, 30)) {
          let title = it.title; if (it.source && title.endsWith(' - ' + it.source)) title = title.slice(0, -(it.source.length + 3));
          take({...it, title, glink: it.link}, null, it.source, false);
        }
        STATS.google++; await sleep(900);
      } catch (e) {
        STATS.failed.push(`google ${C.id}/${a.id}/${lang}: ${e.message}`);
        if (/^429/.test(e.message)) GOOGLE_OFF.v = true;
      }
    }
  }
  // العناقيد داخل كل محور، ثم فك روابط أخبار Google إلى المقال الأصلي (وما لا يُفك يُحذف)
  const out = [];
  for (const a of C.axes) {
    let n = 0;
    for (const c of cluster(pool.filter(h => h.ax === a.id))) {
      if (n >= 6) break;
      const items = [];
      for (const h of c.items) {
        if (h.url) { items.push(h); continue; }
        if (budget.n <= 0) continue;
        budget.n--; const u = await decodeGoogle(h.glink); await sleep(300);
        if (u && /^https?:\/\//.test(u) && !host(u).endsWith('google.com')) { STATS.decoded++; items.push({...h, url: u.replace(/^http:/, 'https:'), outlet: outlet(u)}); }
        if (items.length >= 4) break;
      }
      const by = new Map(); items.forEach(h => { if (!by.has(h.outlet)) by.set(h.outlet, h); });
      if (by.size < 2) continue;
      const list = [...by.values()].slice(0, 5);
      out.push({id: `${C.id}-${a.id}-${lang}-${hash([...toks(list[0].title)].sort().join(' '))}`, axis: a.id, lang, title: list[0].title,
        t: new Date(c.t).toISOString(), outlets: by.size, sources: list.map(h => ({name: h.source, url: h.url, date: dohaDay(new Date(h.t)), title: h.title}))});
      n++;
    }
  }
  STATS.clusters += out.length;
  return out;
}

// ---------- مؤشر الاستقرار ----------
// مؤشر آلي معلن العتبات: يقيس كثافة الأحداث الضاغطة وحدّتها في الأخبار الموثّقة بجهتين خلال 48 ساعة، لا حكماً سياسياً.
// لكل خبر وزن بحسب حدّته: شديد 3 (قتلى، غارات، اشتباكات، انقلاب، انهيار...)، متوسط 1.5 (هجوم، احتجاج، اعتقال، عقوبات، أزمة...)، عادي 0.3.
// ويُضاف نصف وزن إن نقلته ثلاث جهات فأكثر. الدرجة = 100 × e^(−الضغط ÷ 12)، من 0 إلى 100 (الأعلى أكثر استقراراً).
export const SEV = {
  high: {ar: /قتل|قتلى|مقتل|غارة|غارات|قصف|اشتباك|انفجار|تفجير|انقلاب|اغتيال|انهيار|مجزرة|حرب|مسيرات|صواريخ|اجتياح|حظر تجول|طوارئ/, en: /killed|dead|deaths|death toll|airstrike|air strike|shelling|clash|explosion|blast|coup|assassinat|collapse|massacre|\bwar\b|missiles?|drones?|invasion|curfew|state of emergency/i},
  mid: {ar: /هجوم|احتجاج|مظاهر|تظاهر|اعتقال|عقوبات|أزمة|استقال|إضراب|توتر|تهديد|ركود|عجز|تخفيض التصنيف|انقطاع|نقص|تضخم|اقتحام|طعن/, en: /attack|protest|demonstrat|arrest|sanction|crisis|resign|strike|tension|threat|recession|deficit|downgrade|outage|shortage|inflation|raid|stabbing|riot|unrest|no-confidence/i}
};
export const DIMS = {politics: ['politics', 'protests', 'intl', 'nato'], security: ['military', 'security'], economy: ['economy']};
const weight = i => { const t = i.title + ' ' + (i.sources || []).map(s => s.title || '').join(' '); const w = SEV.high[i.lang].test(t) ? 3 : SEV.mid[i.lang].test(t) ? 1.5 : 0.3; return w + (i.outlets >= 3 ? w / 2 : 0); };
export const levelOf = s => s >= 70 ? 'stable' : s >= 45 ? 'strained' : 'unstable';
// الحرب الدائرة: إن كانت للدولة ملف حرب في wars.json (من القسم العسكري الموثّق) يُسقَف البعد الأمني بمستوى الحرب:
// تصعيد ← 30 كحد أعلى، توتر ← 50، هدوء ← 65، لأن قلة العناوين في يوم ما لا تعني أن الحرب توقفت.
const WAR_OF = {iran: ['iran'], israel: ['levant', 'iran'], lebanon: ['levant'], yemen: ['yemen'], sudan: ['sudan'], ukraine: ['ukraine']};
const CAP = {escalation: 30, tense: 50, calm: 65}, CAP_ALL = {escalation: 40, tense: 55, calm: 69};
function stability(items, wars = []) {
  const recent = items.filter(i => Date.now() - new Date(i.t) < 48 * 3600e3), out = {};
  // الخبر الواحد قد يُنشر بالعربية والإنجليزية: نعدّ لغة واحدة لكل دولة (الأكثر أخباراً) حتى لا يتضاعف الوزن
  const lang = recent.filter(i => i.lang === 'en').length >= recent.filter(i => i.lang === 'ar').length ? 'en' : 'ar';
  for (const [d, axes] of Object.entries(DIMS)) {
    const xs = recent.filter(i => i.lang === lang && axes.includes(i.axis)), p = xs.reduce((s, i) => s + weight(i), 0);
    out[d] = {score: Math.round(100 * Math.exp(-p / 12)), pressure: +p.toFixed(1), n: xs.length};
  }
  const war = wars.filter(w => w && CAP[w.level] != null).sort((a, b) => CAP[a.level] - CAP[b.level])[0];
  if (war) { out.security.cap = CAP[war.level]; out.security.war = war.id; out.security.score = Math.min(out.security.score, CAP[war.level]); }
  // بيانات غير كافية: أقل من 3 أخبار موثّقة في 48 ساعة لا تكفي لحساب المؤشر، فلا يُعرض رقم
  const n = Object.values(out).reduce((s, d) => s + d.n, 0);
  if (n < 3 && !war) return {score: null, level: 'nodata', dims: out, lang, window_h: 48, n};
  let score = Math.round((out.politics.score + out.security.score + out.economy.score) / 3);
  // والمؤشر العام لا يتجاوز سقف الحرب: لا توصف دولة في حرب دائرة بأنها مستقرة
  if (war) score = Math.min(score, CAP_ALL[war.level]);
  return {score, war: war ? {id: war.id, level: war.level} : null, level: levelOf(score), dims: out, lang, window_h: 48, n};
}

// إحداثيات المدن لخريطة نقاط التوتر (التظاهرات والحوادث الأمنية والعسكرية)
const LL = {London: [51.51, -0.13], Manchester: [53.48, -2.24], Birmingham: [52.49, -1.89], Liverpool: [53.41, -2.98], Leeds: [53.8, -1.55], Glasgow: [55.86, -4.25], Edinburgh: [55.95, -3.19], Cardiff: [51.48, -3.18], Belfast: [54.6, -5.93], Bristol: [51.45, -2.59],
  Tripoli: [32.89, 13.19], Benghazi: [32.12, 20.09], Misrata: [32.38, 15.09], Zawiya: [32.76, 12.73], Sirte: [31.2, 16.59], Sabha: [27.04, 14.43], Derna: [32.77, 22.64], Bayda: [32.76, 21.76], Tobruk: [32.08, 23.96], Zliten: [32.47, 14.57],
  'Tel Aviv': [32.08, 34.78], Jerusalem: [31.77, 35.22], Haifa: [32.79, 34.99], Beersheba: [31.25, 34.79], Caesarea: [32.5, 34.9],
  Khartoum: [15.5, 32.56], Omdurman: [15.64, 32.48], 'Port Sudan': [19.62, 37.22], 'El Fasher': [13.63, 25.35], Nyala: [12.05, 24.88], 'El Obeid': [13.18, 30.22], Kadugli: [11.01, 29.72], Geneina: [13.45, 22.45],
  Sanaa: [15.37, 44.19], Aden: [12.79, 45.03], Marib: [15.46, 45.33], Hodeidah: [14.8, 42.95], Taiz: [13.58, 44.02], Mukalla: [14.54, 49.12],
  Damascus: [33.51, 36.29], Aleppo: [36.2, 37.13], Homs: [34.73, 36.71], Latakia: [35.52, 35.78], Sweida: [32.71, 36.57], Idlib: [35.93, 36.63], 'Deir ez-Zor': [35.34, 40.14], Daraa: [32.62, 36.1],
  Beirut: [33.89, 35.5], Sidon: [33.56, 35.37], Tyre: [33.27, 35.2], Nabatieh: [33.38, 35.48], Baalbek: [34.0, 36.21],
  Kyiv: [50.45, 30.52], Kharkiv: [49.99, 36.23], Odesa: [46.48, 30.72], Lviv: [49.84, 24.03], Dnipro: [48.46, 35.05], Zaporizhzhia: [47.84, 35.14],
  Tehran: [35.69, 51.39], Mashhad: [36.3, 59.6], Isfahan: [32.65, 51.67], Tabriz: [38.08, 46.29], Shiraz: [29.59, 52.58], Ahvaz: [31.32, 48.67],
  'New York': [40.71, -74.0], Washington: [38.9, -77.04], 'Los Angeles': [34.05, -118.24], Chicago: [41.88, -87.63], Portland: [45.52, -122.68], 'San Francisco': [37.77, -122.42], Minneapolis: [44.98, -93.27],
  Paris: [48.86, 2.35], Marseille: [43.3, 5.37], Lyon: [45.76, 4.84], Toulouse: [43.6, 1.44], Nantes: [47.22, -1.55], Bordeaux: [44.84, -0.58], Lille: [50.63, 3.06]};

// ---------- رصد التظاهرات: المكان والعدد التقريبي ----------
// المكان من قائمة مدن كل دولة في عناوين الجهات. والعدد لا يُنشر إلا إذا ذكرته جهتان مستقلتان (ويُعرض نطاقاً إن اختلفتا).
const NUM_AR = /(عشرات|مئات) (آلاف|الآلاف) |(\d[\d,٬.]*) ?(ألف|آلاف)? ?(متظاهر|محتج|شخص|مواطن)|(آلاف|مئات|عشرات) (من )?(المتظاهرين|المحتجين|الأشخاص)/;
const NUM_EN = /(tens of thousands|hundreds of thousands|thousands|hundreds|dozens|\d[\d,]*(?:\.\d+)?\s?(?:k|m|million)?)\s+(?:of\s+)?(?:people|protesters|demonstrators|marchers|activists|supporters|workers)/i;
function crowd(t, lang) {
  const m = (lang === 'ar' ? NUM_AR : NUM_EN).exec(t); if (!m) return null;
  const w = m[0];
  const word = [[/hundreds of thousands|مئات (آلاف|الآلاف)/i, 100000], [/tens of thousands|عشرات (آلاف|الآلاف)/i, 10000], [/thousands|آلاف/i, 1000], [/hundreds|مئات/i, 100], [/dozens|عشرات/i, 12]].find(([r]) => r.test(w));
  const n = (w.match(/\d[\d,٬.]*/) || [])[0];
  let v = n ? parseFloat(n.replace(/[,٬]/g, '')) : word ? word[1] : null;
  if (n && /\bk\b|ألف|آلاف/i.test(w)) v *= 1000; if (n && /\bm\b|million/i.test(w)) v *= 1e6;
  return v > 0 ? {v, phrase: w.trim()} : null;
}
function protests(C, items) {
  return items.filter(i => i.axis === 'protests' && Date.now() - new Date(i.t) < 7 * 864e5).map(i => {
    const texts = i.sources.map(s => s.title || i.title);
    const city = C.cities.find(([a, e]) => texts.some(t => t.includes(a) || t.includes(e)));
    const est = i.sources.map(s => crowd(s.title || '', i.lang)).filter(Boolean);
    const by = new Set(i.sources.filter(s => crowd(s.title || '', i.lang)).map(s => outlet(s.url)));
    const size = est.length >= 2 && by.size >= 2 ? {min: Math.min(...est.map(e => e.v)), max: Math.max(...est.map(e => e.v)), phrases: est.map(e => e.phrase).slice(0, 3)} : null;
    return {id: i.id, lang: i.lang, title: i.title, date: i.sources[0].date, place: city ? {ar: city[0], en: city[1], ll: LL[city[1]] || null} : null, size, outlets: i.outlets, sources: i.sources};
  }).slice(0, 12);
}
// نقاط التوتر: أخبار عسكرية أو أمنية شديدة الحدّة (قتلى، غارات، اشتباكات، انفجارات) ذُكرت فيها مدينة معروفة، خلال 72 ساعة
function hotspots(C, items) {
  const seen = new Set();
  return items.filter(i => ['military', 'security'].includes(i.axis) && SEV.high[i.lang].test(i.sources.map(s => s.title || '').join(' ') + ' ' + i.title)).map(i => {
    const texts = [i.title, ...i.sources.map(s => s.title || '')], city = C.cities.find(([a, e]) => texts.some(t => t.includes(a) || t.includes(e)));
    return city && LL[city[1]] ? {id: i.id, lang: i.lang, axis: i.axis, title: i.title, date: i.sources[0].date, place: {ar: city[0], en: city[1], ll: LL[city[1]]}, outlets: i.outlets} : null;
  }).filter(x => x && !seen.has(x.place.en + x.lang) && seen.add(x.place.en + x.lang)).slice(0, 8);
}

// ---------- التشغيل ----------
export async function runCountries({dry = false, news = true} = {}) {
  const prev = readJSON('countries.json', {countries: {}});
  const since = Date.now() - 48 * 3600e3, budget = {n: 120}, feedCache = new Map(), today = dohaDay(), wars = readJSON('wars.json', {wars: []});
  const out = {updated: new Date().toISOString(), rule: 'two-independent-outlets',
    meta: COUNTRIES.map(C => ({id: C.id, ar: C.ar, en: C.en, flag: C.flag, color: C.color, iso: C.iso, iso3: C.iso3, region: C.region, axes: C.axes.map(a => ({id: a.id, ar: a.ar, en: a.en}))})), countries: {}};
  // تدوير: كل تشغيل يستعلم أخبار Google لأربع دول فقط (بالدور)، وتُقرأ خلاصات الناشرين المباشرة لكل الدول في كل تشغيل
  const G = 4, k = Math.floor(Date.now() / (3 * 3600e3)) * G % COUNTRIES.length;
  const gset = new Set([...COUNTRIES, ...COUNTRIES].slice(k, k + G).map(C => C.id));
  for (const C of COUNTRIES) {
    const pc = prev.countries?.[C.id] || {};
    const old = (pc.items || []).filter(i => Date.now() - new Date(i.t) < 72 * 3600e3 && (i.sources || []).length >= 2 && C.axes.some(a => a.id === i.axis));
    const fresh = [];
    if (news && (!ONLY.length || ONLY.includes(C.id))) for (const lang of ['ar', 'en']) fresh.push(...await gatherCountry(C, lang, since, budget, feedCache, gset.has(C.id) || ONLY.includes(C.id)));
    // دمج: الجديد أولاً، ويبقى القديم الموثّق 72 ساعة حتى لا يفرغ المحور إن تعثّر تشغيل
    const seen = new Set(), items = [];
    for (const i of [...fresh, ...old]) { if (seen.has(i.id)) continue; seen.add(i.id); items.push(i); }
    items.sort((a, b) => new Date(b.t) - new Date(a.t));
    const keep = C.axes.flatMap(a => ['ar', 'en'].flatMap(l => items.filter(i => i.axis === a.id && i.lang === l).slice(0, 6))).sort((a, b) => new Date(b.t) - new Date(a.t));
    // الخط الزمني: كل خبر موثّق نُشر يبقى 31 يوماً (أهم أحداث الأسبوع والشهر)
    const tl = new Map((pc.timeline || []).filter(e => Date.now() - new Date(e.t) < 31 * 864e5).map(e => [e.id, e]));
    keep.forEach(i => { if (!tl.has(i.id)) tl.set(i.id, {id: i.id, t: i.t, date: i.sources[0].date, axis: i.axis, lang: i.lang, title: i.title, outlets: i.outlets, sources: i.sources.slice(0, 3).map(s => ({name: s.name, url: s.url, date: s.date}))}); });
    const timeline = [...tl.values()].sort((a, b) => new Date(b.t) - new Date(a.t)).slice(0, 160);
    // المؤشر واتجاهه: سجل يومي (آخر قيمة في كل يوم بتوقيت الدوحة) 30 يوماً، والاتجاه مقارنة بآخر يوم سابق
    const idx = stability(keep, (WAR_OF[C.id] || []).map(id => (wars.wars || []).find(w => w.id === id)));
    const hist = (pc.index_history || []).filter(h => h.date !== today).slice(-29);
    const before = [...hist].reverse().find(h => h.score != null);
    idx.trend = before && idx.score != null ? (idx.score - before.score >= 5 ? 'up' : before.score - idx.score >= 5 ? 'down' : 'flat') : 'flat';
    idx.prev = before ? {date: before.date, score: before.score, level: before.level} : null;
    if (idx.score != null) hist.push({date: today, score: idx.score, level: idx.level, politics: idx.dims.politics.score, security: idx.dims.security.score, economy: idx.dims.economy.score});
    out.countries[C.id] = {items: keep, checked: fresh.length || !news ? out.updated : pc.checked || null,
      counts: Object.fromEntries(C.axes.map(a => [a.id, keep.filter(i => i.axis === a.id).length])),
      index: idx, index_history: hist, timeline, protests: protests(C, keep), hotspots: hotspots(C, keep)};
    console.log(`${C.id}: ${fresh.length} جديد، ${keep.length} منشور، المؤشر ${idx.score} (${idx.level}، ${idx.trend})`, gset.has(C.id) ? '+Google' : '');
  }
  out.stats = STATS;
  if (!dry) writeFileSync(ROOT + 'countries.json', JSON.stringify(out, null, 1) + '\n');
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runCountries({dry: ARGS.includes('--dry'), news: !ARGS.includes('--no-news')});
  console.log('مصادر:', JSON.stringify({google: STATS.google, decoded: STATS.decoded, direct: STATS.direct, clusters: STATS.clusters}));
  if (STATS.failed.length) console.log('تعذّر:', STATS.failed.slice(0, 20).join('\n'));
}
