/* حبكة — منصة الصناعات المنزلية في قطر */
(function () {
  "use strict";
  const CFG = window.HABKA_CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const app = $("#app");

  /* ---------- أدوات التنسيق الموحّد ---------- */
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  const fmtDate = (iso, withTime) => {
    if (!iso) return "";
    const d = new Date(iso);
    let s = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    if (withTime) {
      let h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
      const ap = h < 12 ? "ص" : "م"; h = h % 12 || 12;
      s += `، ${h}:${m} ${ap}`;
    }
    return s;
  };
  const fmtMoney = (n) => `${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ر.ق`;
  const normPhone = (p) => {
    let d = String(p || "").replace(/\D/g, "");
    if (d.length === 13 && d.startsWith("00974")) d = d.slice(5);
    if (d.length === 11 && d.startsWith("974")) d = d.slice(3);
    if (d.length !== 8 || !/^[3-7]/.test(d)) return null;
    return `+974 ${d.slice(0, 4)} ${d.slice(4)}`;
  };
  const waLink = (phone, text) => {
    const d = String(phone || "").replace(/\D/g, "");
    if (d.length < 11 || /^9740000/.test(d)) return null;
    return `https://wa.me/${d}?text=${encodeURIComponent(text || "")}`;
  };
  const STATUS = {
    new: "جديد", accepted: "مقبول", preparing: "قيد التجهيز", ready: "جاهز للتسليم", delivered: "تم التسليم", cancelled: "ملغى",
    pending: "قيد المراجعة", approved: "معتمد", rejected: "مرفوض", hidden: "مخفي", suspended: "موقوف", active: "نشط",
  };
  const ROLE = { customer: "عميل", producer: "منتج", admin: "مدير" };
  const tel = (v) => `<span class="tel">${esc(v)}</span>`;
  const stBadge = (s) => `<span class="st st-${esc(s)}">${esc(STATUS[s] || s)}</span>`;
  const stars = (r) => { const n = Math.round(Number(r) || 0); return `<span class="stars" aria-label="${n} من 5">${"★".repeat(n)}${"☆".repeat(5 - n)}</span>`; };
  const AREAS = ["الدوحة", "الريان", "الوكرة", "الخور", "لوسيل", "أم صلال", "الظعاين", "الشمال", "الشيحانية", "مسيعيد"];

  /* ---------- الأيقونات ---------- */
  const I = {
    search: '<path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zm9 16-4.3-4.3"/>',
    cart: '<path d="M3 4h2l2.2 10.4a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
    home: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="2"/><rect x="13" y="4" width="7" height="7" rx="2"/><rect x="4" y="13" width="7" height="7" rx="2"/><rect x="13" y="13" width="7" height="7" rx="2"/>',
    store: '<path d="M4 9h16l-1.5-5h-13zM5 9v11h14V9M9 20v-6h6v6"/>',
    book: '<path d="M5 4h10a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4zM5 16a4 4 0 0 1 4-4h10"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    wa: '<path d="M4 20l1.3-3.8A8 8 0 1 1 8 19z"/><path d="M9 9.5c.5 2.5 2.5 4.5 5 5l1.2-1.2 2 1-1 1.8c-4 .5-8.5-4-8-8l1.8-1 1 2z"/>',
    msg: '<path d="M4 5h16v11H8l-4 4z"/>',
    truck: '<path d="M3 6h11v9H3zM14 9h4l3 3v3h-7M7 18a1.5 1.5 0 1 0 0-.1M17 18a1.5 1.5 0 1 0 0-.1"/>',
    shield: '<path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6z"/><path d="m9 12 2 2 4-4"/>',
    spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6"/>',
    logout: '<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>',
    dash: '<path d="M4 13h7V4H4zM13 20h7v-9h-7zM13 4v5h7V4zM4 20h7v-5H4z"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    img: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/>',
    food: '<path d="M4 13h16a8 8 0 0 1-16 0zM12 4v3M8 6v2M16 6v2"/>',
    beauty: '<path d="M10 3h4v4h-4zM8 7h8l1 4v9H7v-9z"/><path d="M9 14h6"/>',
    crafts: '<path d="M5 20c0-6 3-9 7-9s7 3 7 9z"/><path d="M8 11c0-3 1.8-6 4-6s4 3 4 6"/>',
    textile: '<path d="M18 3 6 15M6 15l-2 6 6-2M16 5l3 3"/><path d="M14 3c3 0 7 4 7 7"/>',
    gifts: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M3 9h18v-3H3zM12 6v14M12 6c-2-4-6-3-5 0M12 6c2-4 6-3 5 0"/>',
    agri: '<path d="M12 21v-9M12 12C12 7 8 5 4 5c0 4 3 7 8 7zM12 14c0-4 3-7 8-7 0 4-3 7-8 7z"/>',
    cake: '<path d="M4 20h16v-7H4zM4 15.5c2.2 1.4 3.9 1.4 5.3 0 1.4 1.4 3.9 1.4 5.4 0 1.4 1.4 3.1 1.4 5.3 0M7 13V9h10v4M12 9V6"/><path d="M12 3.5c.8.7.8 1.5 0 2.2-.8-.7-.8-1.5 0-2.2z"/>',
    coffee: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 10.5h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c.8 1-.8 2 0 3M12 3.5c.8 1-.8 2 0 3"/>',
    gem: '<path d="M7 4h10l4 5-9 11L3 9zM3 9h18M10 4l2 16M14 4l-2 16"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>',
    star: '<path d="m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 16.8l-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/>',
    brush: '<path d="M14.5 4.5 19.5 9.5 11 18l-5-5zM6 13l-1.6 4.6c-.3 1 .5 1.8 1.5 1.5L10.5 18"/>',
    box: '<path d="M4 8l8-4 8 4v8l-8 4-8-4zM4 8l8 4 8-4M12 12v8M8 6l8 4"/>',
    leaf: '<path d="M5 19C5 10 10.5 4.5 20 4.5 20 14 14.5 19 5 19zM5 19l8.5-8.5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.6 9.4a2.5 2.5 0 1 1 3.6 2.3c-.7.4-1.2.9-1.2 1.7v.4M12 17h.01"/>',
    up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/>', trash: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
    grip: '<circle cx="9" cy="6" r=".9"/><circle cx="15" cy="6" r=".9"/><circle cx="9" cy="12" r=".9"/><circle cx="15" cy="12" r=".9"/><circle cx="9" cy="18" r=".9"/><circle cx="15" cy="18" r=".9"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>', check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  };
  const ic = (n, cls = "") => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[n] || ""}</svg>`;
  const CAT_COLORS = { food: ["#F6E1DA", "#B9573F"], beauty: ["#EFE3F3", "#7A4A8C"], crafts: ["#F6E7CB", "#9A6512"], textile: ["#E3E6F6", "#3A3F8F"], gifts: ["#F9E0E6", "#A33B5B"], agri: ["#E1EEE6", "#3E7556"] };
  const ICON_NAMES = { food: "طعام", beauty: "عناية", crafts: "حرف", textile: "خياطة", gifts: "هدايا", agri: "زراعة", cake: "حلويات", coffee: "قهوة", gem: "مجوهرات", heart: "قلب", star: "نجمة", brush: "فن", box: "تغليف", leaf: "ورقة", spark: "بريق", store: "متجر", search: "بحث", truck: "توصيل", shield: "ضمان", book: "كتاب", msg: "رسالة", img: "صورة" };
  const catObj = (id) => S.cats.find((c) => c.id === id);
  const catColors = (id) => {
    const c = catObj(id);
    if (c && c.hue != null) return [`hsl(${c.hue} 55% 93%)`, `hsl(${c.hue} 45% 34%)`];
    return CAT_COLORS[id] || ["#F6E7CB", "#9A6512"];
  };
  const hueColors = (h) => [`hsl(${h} 55% 93%)`, `hsl(${h} 45% 34%)`];
  const catIcon = (id) => (catObj(id) || {}).icon || (I[id] ? id : "spark");
  const pubCats = () => S.cats.filter((c) => c.active !== false);

  /* ---------- المحتوى القابل للتعديل من الإدارة (مع قيم افتراضية) ---------- */
  const DEFAULTS = {
    announce: { enabled: false, text: "أهلًا بكم في حبكة: تسوّق من الأسر المنتجة في قطر، وادعم الصنعة المحلية.", link: "#/browse", tone: "gold" },
    hero: {
      eyebrow: "منصة الأسر المنتجة في قطر", title: "كل ما يُصنع في البيوت بإتقان،", highlight: "في مكان واحد",
      lead: "من مطابخ الفريج إلى أنامل الحرفيات: مأكولات بيتية، عطور وبخور، حرف وديكور، خياطة وتطريز، هدايا ومناسبات، وزراعة منزلية طازجة.",
      placeholder: "ابحث عن لقيمات، بخور، تطريز...", show_stats: true,
    },
    sections: [
      { id: "cats", label: "المجالات", title: "تسوّق حسب المجال", subtitle: "مجالات تحتضن مواهب البيوت القطرية", visible: true },
      { id: "featured", label: "المنتجات المميزة والأحدث", title: "منتجات مختارة", subtitle: "طازجة من البيوت مباشرة", visible: true },
      { id: "steps", label: "كيف تعمل المنصة", title: "كيف تعمل حبكة؟", subtitle: "تجربة واضحة للعميل والمنتج", visible: true },
      { id: "shops", label: "المتاجر المميزة", title: "متاجر منزلية مميزة", subtitle: "تعرّف على أصحاب الحرفة", visible: true },
      { id: "faq", label: "الأسئلة الشائعة", title: "أسئلة شائعة", subtitle: "إجابات سريعة لأكثر ما يسأل عنه العملاء والمنتجون", visible: true },
      { id: "band", label: "دعوة المنتجين", title: "", subtitle: "", visible: true },
    ],
    steps: [
      { icon: "search", title: "اكتشف واطلب", body: "تصفح المنتجات حسب المجال أو المنطقة، وأضف ما يعجبك إلى السلة، ثم أكمل الطلب بالتوصيل أو الاستلام." },
      { icon: "store", title: "يجهّز المنتج طلبك", body: "يصل الطلب إلى صاحب المتجر فورًا، فيقبله ويجهّزه بعناية، وتتابع حالته خطوة بخطوة من حسابك." },
      { icon: "truck", title: "استلم وقيّم", body: "تستلم طلبك وتدفع عند الاستلام، ثم تقيّم المنتج لتساعد غيرك وتدعم الأسر المنتجة." },
    ],
    band: { title: "حوّل موهبتك المنزلية إلى مشروع", body: "افتح متجرك على حبكة مجانًا، واعرض منتجاتك، واستقبل الطلبات وتابعها من لوحة واحدة. ومعك دليل البداية وحاسبة التسعير لتنطلق بثقة.", btn1: "افتح متجرك الآن", link1: "#/register?role=producer", btn2: "دليل البداية", link2: "#/guide" },
    faq: [
      { q: "كيف أدفع ثمن طلبي؟", a: "يتم الدفع مباشرة للمتجر عند الاستلام، نقدًا أو تحويلًا حسب ما يتفق عليه الطرفان." },
      { q: "هل يمكنني إلغاء الطلب؟", a: "نعم، يمكنك إلغاء الطلب من صفحة «حسابي» قبل أن يقبله المتجر. بعد القبول يكون الإلغاء بالتنسيق مع المتجر." },
      { q: "كيف أفتح متجرًا منزليًا على حبكة؟", a: "أنشئ حسابًا واختر «أنا منتج منزلي»، ثم أضف منتجاتك. تراجع الإدارة المتجر والمنتجات وتعتمدها ليظهر متجرك للعملاء." },
      { q: "هل فتح المتجر مجاني؟", a: "نعم، التسجيل وفتح المتجر وعرض المنتجات مجاني بالكامل." },
      { q: "من يتولى التوصيل؟", a: "يتولى كل متجر توصيل طلباته أو تسليمها، ويُتفق على رسوم التوصيل بين العميل والمتجر." },
    ],
    guide: {
      eyebrow: "دليل المنتج المنزلي", title: "من فكرة في بيتك إلى مشروع ناجح",
      lead: "دليل عملي مختصر يرافقك في اختيار المجال، والترخيص، والتسعير، وبناء العلامة، والتسويق، حتى أول طلب على حبكة.",
      ideas_title: "أفكار المشاريع حسب المجال", start_title: "خطوات البداية في قطر", calc_title: "حاسبة التسعير",
      calc_lead: "أدخل تكاليفك لكل وحدة، وتقترح الحاسبة سعرًا يغطي التكلفة ويحقق ربحًا عادلًا.",
      calc_example: "مثال: علبة لقيمات تكلف موادها 12 ر.ق وتغليفها 3 ر.ق وتستغرق نصف ساعة.",
      brand_title: "العلامة والتسويق", cta_title: "جاهز للانطلاق؟", cta_body: "افتح متجرك على حبكة مجانًا، وابدأ استقبال الطلبات.",
    },
    ideas: [
      { icon: "food", hue: 12, title: "المأكولات والحلويات", desc: "الأكثر طلبًا والأسرع دورانًا، ويتطلب التزامًا صارمًا بسلامة الغذاء.", items: ["حلويات شعبية: لقيمات، خنفروش، بلاليط", "أطباق عائلية جاهزة ووجبات أسبوعية مجمدة", "مخبوزات وكيك المناسبات", "مونة البيت: بهارات، دبس، مخللات"], cost: "1,000 إلى 3,000 ر.ق" },
      { icon: "beauty", hue: 285, title: "العناية والعطور", desc: "هوامش ربح جيدة وصلاحية طويلة، ويتميز فيه من يتقن الخلطات.", items: ["صابون طبيعي بالطريقة الباردة", "بخور ومعمول ودخون", "زيوت شعر وخلطات أعشاب", "عطور زيتية ومعطرات مفارش"], cost: "1,500 إلى 4,000 ر.ق" },
      { icon: "crafts", hue: 38, title: "الحرف والديكور", desc: "منتجات فنية بقيمة عالية، يناسبها التسويق المرئي.", items: ["شموع معطرة بأوعية فخارية", "سعف النخيل والخوص", "فن الريزن واللوحات", "ديكورات رمضان والأعياد"], cost: "800 إلى 2,500 ر.ق" },
      { icon: "textile", hue: 232, title: "الخياطة والتطريز", desc: "طلب مستمر طوال العام، ويتضاعف قبل المواسم.", items: ["جلابيات ومخاوير", "تطريز الأسماء والشعارات", "مفارش صلاة وأطقم مواليد", "تعديل الملابس وتفصيلها"], cost: "2,000 إلى 5,000 ر.ق" },
      { icon: "gifts", hue: 340, title: "الهدايا والمناسبات", desc: "مشروع موسمي قوي يعتمد على الذوق وحسن التنسيق.", items: ["صناديق ضيافة وقرقيعان", "توزيعات مواليد وأعراس", "تنسيق الورد والهدايا", "تغليف الهدايا حسب الطلب"], cost: "1,000 إلى 3,000 ر.ق" },
      { icon: "agri", hue: 145, title: "الزراعة المنزلية", desc: "مساحة صغيرة وعائد متكرر، وطلب متزايد على المنتج الطازج.", items: ["المايكروجرين للمطاعم والأسر", "أعشاب طازجة: نعناع، ريحان، زعتر", "شتلات وأصص منزلية", "خلطات تربة وسماد عضوي"], cost: "500 إلى 2,000 ر.ق" },
    ],
    start: [
      { title: "اختر منتجًا واحدًا تتقنه", body: "ابدأ بمنتج أو اثنين تتميز فيهما، واختبرهما مع الأهل والجيران، وسجّل ملاحظاتهم قبل التوسع." },
      { title: "رخّص نشاطك المنزلي", body: "استخرج ترخيص الأعمال المنزلية من وزارة التجارة والصناعة عبر خدماتها الإلكترونية. ولأنشطة الأغذية اشتراطات صحية إضافية، فراجع الجهات المختصة واطّلع على أحدث المتطلبات في موقع الوزارة الرسمي." },
      { title: "اضبط الجودة والسلامة", body: "خصص مكانًا نظيفًا للعمل، ودوّن المكونات وتاريخ الإنتاج والصلاحية على كل عبوة، واستخدم تغليفًا آمنًا يحفظ المنتج." },
      { title: "سعّر بعدالة", body: "لا تبع بأقل من تكلفتك. احسب المواد والتغليف ووقتك ونسبة للمصاريف ثم هامش الربح. استخدم الحاسبة أدناه." },
      { title: "افتح متجرك على حبكة", body: "سجّل كمنتج منزلي، وأضف صورًا واضحة ووصفًا دقيقًا، وبعد اعتماد الإدارة يبدأ العملاء بالطلب." },
      { title: "خدمة تصنع الولاء", body: "رد سريع، والتزام بالموعد، وبطاقة شكر صغيرة داخل الطلب. العميل الراضي يعود ويُعرّف غيره بك." },
    ],
    brand: [
      { title: "اسم وهوية", items: ["اسم قصير سهل النطق يعكس منتجك", "لونان أساسيان وخط ثابت على كل العبوات", "ملصق يحمل الاسم والمكونات والتاريخ"] },
      { title: "صور تبيع", items: ["ضوء النهار قرب النافذة", "خلفية بسيطة وزاوية علوية للأطباق", "صورة تُظهر الحجم الحقيقي للمنتج"] },
      { title: "انتشار ذكي", items: ["شارك رابط متجرك على حبكة في حساباتك", "عروض المواسم: رمضان، العيد، اليوم الوطني، القرنقعوه", "اطلب من العملاء تقييم المنتج بعد الاستلام"] },
    ],
    about: {
      eyebrow: "عن حبكة", title: "الحَبْكة: إتقانٌ يُصنع في البيت",
      lead: "«الحَبْكة» في لساننا هي إحكام الصنعة وإتقانها، وهي العقدة التي تشدّ الخيط فلا ينفلت. ومن هذا المعنى وُلدت المنصة: نجمع خيوط المواهب المنزلية في قطر في نسيج واحد يصل إلى كل بيت.",
      cards: [
        { title: "رسالتنا", body: "تمكين الأسر المنتجة وأصحاب الصناعات المنزلية من الوصول إلى عملائهم بسهولة واحترافية." },
        { title: "للعميل", body: "منتجات بيتية أصيلة من متاجر معتمدة، مع متابعة واضحة للطلب وتقييمات حقيقية بعد الاستلام فقط." },
        { title: "للمنتج", body: "متجر مجاني ولوحة لإدارة المنتجات والطلبات والاستفسارات، مع دليل عملي وحاسبة للتسعير." },
      ],
      body: "### قيمنا\n- **الإتقان:** نعتمد المتاجر والمنتجات بعد مراجعتها.\n- **الشفافية:** أسعار واضحة وحالة طلب معلنة في كل خطوة.\n- **الأصالة:** نحتفي بالصنعة المحلية وروح البيت القطري.",
    },
    terms: {
      title: "الشروط والأحكام", updated: "22 نوفمبر 2026",
      body: "1. حبكة منصة وسيطة تربط العملاء بأصحاب الصناعات المنزلية، والمنتج مسؤول عن جودة منتجه وسلامته ومطابقته للوصف.\n2. يلتزم المنتج بالحصول على التراخيص اللازمة لنشاطه وفق الأنظمة المعمول بها في دولة قطر.\n3. تراجع الإدارة المتاجر والمنتجات قبل عرضها، ولها رفض أو إيقاف ما يخالف الشروط أو الذوق العام.\n4. الأسعار معروضة بالريال القطري، ويتم الدفع مباشرة بين العميل والمنتج عند الاستلام، ويُتفق على رسوم التوصيل بينهما.\n5. يحق للعميل إلغاء الطلب قبل قبوله من المنتج، وبعد القبول يكون الإلغاء بالتنسيق مع المنتج.\n6. التقييمات متاحة فقط لمن استلم الطلب، ويُمنع نشر محتوى مسيء أو مضلل.\n7. يُمنع استخدام المنصة لأي نشاط مخالف للأنظمة، وللإدارة إيقاف الحسابات المخالفة.",
    },
    privacy: {
      title: "سياسة الخصوصية", updated: "22 نوفمبر 2026",
      body: "- نجمع الاسم ورقم الجوال والبريد الإلكتروني والمنطقة لتشغيل الحساب وإتمام الطلبات.\n- يظهر رقم جوال العميل وعنوانه للمتجر الذي طلب منه فقط، لغرض تنفيذ الطلب والتواصل بشأنه.\n- تُحفظ كلمات المرور مشفّرة، ولا يطّلع عليها أحد.\n- لا نبيع بياناتك ولا نشاركها مع أي طرف لأغراض تسويقية.\n- يمكنك تعديل بياناتك من صفحة حسابك، أو طلب حذف الحساب عبر صفحة التواصل.",
    },
    footer: { about: "منصة قطرية تحتضن الصناعات المنزلية والأسر المنتجة، وتصل إتقانهم إلى كل بيت.", region: "دولة قطر", contact_lead: "يسعدنا استقبال استفساراتكم ومقترحاتكم، ويرد فريق حبكة خلال يوم عمل." },
  };
  const C = (k) => {
    const v = S.content && S.content[k];
    if (v == null) return DEFAULTS[k];
    if (Array.isArray(DEFAULTS[k])) return Array.isArray(v) ? v : DEFAULTS[k];
    return { ...DEFAULTS[k], ...v };
  };
  const homeSections = () => {
    const saved = C("sections"), ids = saved.map((s) => s.id);
    return [...saved.map((s) => ({ ...DEFAULTS.sections.find((d) => d.id === s.id), ...s })), ...DEFAULTS.sections.filter((d) => !ids.includes(d.id))];
  };
  /* نص منسّق بسيط: فقرات، قوائم نقطية (- ) ومرقمة (1. )، عناوين (### )، وخط عريض (**نص**) */
  function rich(text) {
    const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>");
    const out = []; let list = null;
    const flush = () => { if (list) { out.push(`<${list.t}>${list.items.map((x) => `<li>${inline(x)}</li>`).join("")}</${list.t}>`); list = null; } };
    for (const raw of String(text || "").split("\n")) {
      const line = raw.trim();
      let m;
      if (!line) { flush(); continue; }
      if ((m = line.match(/^[-•]\s+(.*)$/))) { if (!list || list.t !== "ul") { flush(); list = { t: "ul", items: [] }; } list.items.push(m[1]); continue; }
      if ((m = line.match(/^\d+[.)]\s+(.*)$/))) { if (!list || list.t !== "ol") { flush(); list = { t: "ol", items: [] }; } list.items.push(m[1]); continue; }
      flush();
      if ((m = line.match(/^#{2,3}\s+(.*)$/))) out.push(`<h3>${inline(m[1])}</h3>`);
      else out.push(`<p>${inline(line)}</p>`);
    }
    flush();
    return out.join("");
  }
  const safeLink = (l) => (/^(#\/|https:\/\/)/.test(String(l || "")) ? esc(l) : "#/");

  /* رسم فني أصلي لكل منتج بلا صورة */
  function art(cat, hue = 30, seed = "") {
    const [bg, fg] = catColors(cat);
    let h = 0; for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    const r = (n) => ((h = (h * 1103515245 + 12345) >>> 0) % n);
    let dots = "";
    for (let i = 0; i < 14; i++) dots += `<circle cx="${r(400)}" cy="${r(300)}" r="${2 + r(5)}" fill="${fg}" opacity=".${1 + r(2)}"/>`;
    const ring = `hsl(${hue} 45% 62%)`;
    return `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="400" height="300" fill="${bg}"/>
      <path d="M0 ${220 + r(30)} C 120 ${170 + r(40)}, 260 ${260 - r(40)}, 400 ${200 + r(30)} V300 H0Z" fill="${ring}" opacity=".35"/>
      <g fill="none" stroke="${fg}" stroke-width="2" opacity=".25">${Array.from({ length: 5 }, (_, i) => `<circle cx="${300 - i * 3}" cy="${80 + i * 2}" r="${30 + i * 18}"/>`).join("")}</g>
      ${dots}
      <g transform="translate(150 100) scale(4.2)" fill="none" stroke="${fg}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${I[catIcon(cat)] || I.spark}</g>
    </svg>`;
  }
  const pImg = (p) => (p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy">` : art(p.category_id, p.shop?.hue, p.id + p.name));

  /* ---------- الحالة ---------- */
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem("habka." + k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem("habka." + k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem("habka." + k); } catch {} },
  };
  const S = { token: store.get("token", null), user: store.get("user", null), cart: store.get("cart", []), home: null, cats: [], content: {} };
  const saveCart = () => { store.set("cart", S.cart); renderChrome(); };

  /* ---------- الاتصال بالخادم ---------- */
  async function api(fn, args = {}) {
    let res;
    try {
      res = await fetch(`${CFG.url}/rest/v1/rpc/${fn}`, {
        method: "POST",
        headers: { apikey: CFG.key, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(args),
      });
    } catch (e) { throw new Error("تعذر الاتصال بالخادم، تحقق من الإنترنت وحاول مجددًا"); }
    const txt = await res.text();
    let data = null; try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
    if (!res.ok) {
      const msg = (data && data.message) || "حدث خطأ غير متوقع، حاول مجددًا";
      if (data && data.code === "28000") { setSession(null); }
      throw new Error(msg);
    }
    return data;
  }
  function setSession(r) {
    if (r) { S.token = r.token; S.user = r.user; store.set("token", r.token); store.set("user", r.user); }
    else { S.token = null; S.user = null; store.del("token"); store.del("user"); }
    renderChrome();
  }
  async function loadCats() {
    if (S.cats.length && Date.now() - (S.loadedAt || 0) < 120000) return S.cats;
    S.home = await api("habka_home"); S.cats = S.home.categories; S.content = S.home.content || {}; S.loadedAt = Date.now(); return S.cats;
  }
  const catName = (id) => (S.cats.find((c) => c.id === id) || {}).name || "";

  /* ---------- واجهة عامة ---------- */
  let toastT;
  function toast(msg, bad) {
    const t = $("#toast"); t.textContent = msg; t.className = "toast show" + (bad ? " bad" : "");
    clearTimeout(toastT); toastT = setTimeout(() => (t.className = "toast"), 3200);
  }
  function modal(title, html, onMount) {
    const bg = document.createElement("div");
    bg.className = "modal-bg";
    bg.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="modal-h"><h3 style="margin:0">${esc(title)}</h3><button class="icon-btn" data-x aria-label="إغلاق">${ic("x")}</button></div>${html}</div>`;
    const close = () => { bg.remove(); document.body.style.overflow = ""; };
    bg.addEventListener("click", (e) => { if (e.target === bg || e.target.closest("[data-x]")) close(); });
    document.body.appendChild(bg); document.body.style.overflow = "hidden";
    onMount && onMount(bg, close);
    return close;
  }
  function confirmBox(text, okLabel = "تأكيد") {
    return new Promise((res) => {
      modal("تأكيد الإجراء", `<p>${esc(text)}</p><div class="actions" style="justify-content:flex-end"><button class="btn btn-ghost" data-x>تراجع</button><button class="btn btn-primary" data-ok>${esc(okLabel)}</button></div>`,
        (el, close) => { $("[data-ok]", el).onclick = () => { close(); res(true); }; $$("[data-x]", el).forEach((b) => b.addEventListener("click", () => res(false))); });
    });
  }
  const loader = () => `<div class="loader"><i></i></div>`;
  const empty = (t, cta = "") => `<div class="empty">${ic("store")}<p>${t}</p>${cta}</div>`;
  const formData = (form) => Object.fromEntries(new FormData(form).entries());
  function showErr(form, msg) { const e = $(".err", form); if (e) { e.textContent = msg; e.classList.add("show"); e.scrollIntoView({ block: "nearest" }); } else toast(msg, true); }
  async function busy(btn, fn) {
    const t = btn.innerHTML; btn.disabled = true; btn.innerHTML = "جارٍ التنفيذ...";
    try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = t; }
  }

  function renderChrome() {
    const route = location.hash.split("?")[0] || "#/";
    const count = S.cart.reduce((a, b) => a + b.qty, 0);
    const links = [["#/", "الرئيسية"], ["#/browse", "المنتجات"], ["#/shops", "المتاجر"], ["#/guide", "دليل المنتج"], ["#/about", "عن حبكة"]];
    $("#nav").innerHTML = links.map(([h, t]) => `<a href="${h}" class="${route === h ? "on" : ""}">${t}</a>`).join("");
    const u = S.user;
    const dashLink = u ? (u.role === "admin" ? `<a href="#/admin">لوحة الإدارة</a>` : u.role === "producer" ? `<a href="#/seller">لوحة متجري</a>` : "") : "";
    $("#tools").innerHTML = `
      <a class="icon-btn hide-m" href="#/browse" aria-label="بحث">${ic("search")}</a>
      <a class="icon-btn" href="#/cart" aria-label="السلة">${ic("cart")}${count ? `<span class="badge-dot num">${count}</span>` : ""}</a>
      ${u ? `<div class="menu" id="umenu"><button class="icon-btn" aria-label="حسابي" aria-haspopup="true">${ic("user")}</button>
        <div class="menu-pop"><div class="who"><b>${esc(u.full_name)}</b><div class="small muted">${ROLE[u.role]}</div></div>
        ${dashLink}<a href="#/account">حسابي وطلباتي</a><button data-logout>تسجيل الخروج</button></div></div>`
        : `<a class="btn btn-primary btn-sm" href="#/login">تسجيل الدخول</a>`}`;
    const m = $("#umenu");
    if (m) {
      $("button", m).onclick = (e) => { e.stopPropagation(); m.classList.toggle("open"); };
      $("[data-logout]", m).onclick = logout;
    }
    const dashHref = u?.role === "admin" ? "#/admin" : u?.role === "producer" ? "#/seller" : "#/account";
    const bl = [["#/", "home", "الرئيسية"], ["#/browse", "grid", "المنتجات"], ["#/guide", "book", "الدليل"], ["#/cart", "cart", "السلة"], [u ? dashHref : "#/login", u && u.role !== "customer" ? "dash" : "user", u ? (u.role === "customer" ? "حسابي" : "لوحتي") : "دخول"]];
    $("#bbar").innerHTML = bl.map(([h, i, t]) => `<a href="${h}" class="${route === h ? "on" : ""}">${ic(i)}<span>${t}</span>${i === "cart" && count ? `<span class="badge-dot num">${count}</span>` : ""}</a>`).join("");
  }
  document.addEventListener("click", () => $("#umenu")?.classList.remove("open"));
  /* شريط الإعلانات والتذييل من المحتوى المُدار */
  function renderSite() {
    const a = C("announce"), F = C("footer"), el = $("#ann");
    if (el) {
      const on = a.enabled && String(a.text || "").trim();
      el.className = on ? `ann ann-${esc(a.tone || "gold")}` : "ann";
      el.innerHTML = on ? (a.link ? `<a href="${safeLink(a.link)}" ${/^https:/.test(a.link) ? 'target="_blank" rel="noopener"' : ""}>${esc(a.text)}</a>` : `<span>${esc(a.text)}</span>`) : "";
    }
    if ($("#fabout")) $("#fabout").textContent = F.about;
    if ($("#fregion")) $("#fregion").textContent = F.region;
  }
  async function logout() {
    try { await api("habka_logout", { p_token: S.token }); } catch {}
    setSession(null); toast("تم تسجيل الخروج"); location.hash = "#/";
  }

  /* ---------- المكوّنات ---------- */
  function productCard(p) {
    return `<a class="card pcard" href="#/p/${p.id}">
      <div class="ph">${pImg(p)}${p.shop?.is_demo ? `<span class="chip demo">متجر تجريبي</span>` : ""}</div>
      <div class="body"><h3>${esc(p.name)}</h3><div class="shop">${esc(p.shop?.name)}${p.shop?.area ? ` · ${esc(p.shop.area)}` : ""}</div>
      ${p.rating ? `<div class="small">${stars(p.rating)} <span class="muted num">(${p.reviews_count})</span></div>` : ""}
      <div class="row"><span class="price num">${fmtMoney(p.price)}</span><span class="chip">${esc(p.unit)}</span></div></div></a>`;
  }
  function shopCard(s) {
    return `<a class="card scard" href="#/shop/${s.id}"><div class="avatar" style="background:hsl(${s.hue} 42% 42%)">${esc((s.name || "?").trim()[0])}</div>
      <div><h3 style="margin:0">${esc(s.name)}</h3><div class="small muted">${esc(catName(s.category_id))}${s.area ? ` · ${esc(s.area)}` : ""} · <span class="num">${s.products}</span> منتج</div>
      <p class="small" style="margin:6px 0 0">${esc((s.bio || "").slice(0, 110))}${(s.bio || "").length > 110 ? "…" : ""}</p>
      ${s.is_demo ? `<span class="chip" style="margin-top:8px">متجر تجريبي</span>` : ""}</div></a>`;
  }
  const catTile = (c) => {
    const [bg, fg] = catColors(c.id);
    return `<a class="cat" href="#/browse?cat=${c.id}"><div class="ic" style="background:${bg};color:${fg}">${ic(c.icon || "spark")}</div><b>${esc(c.name)}</b><span>${esc(c.blurb)}</span></a>`;
  };

  /* ---------- الصفحات ---------- */
  const routes = {};

  routes[""] = async () => {
    app.innerHTML = loader();
    const h = (S.home = await api("habka_home")); S.cats = h.categories; S.content = h.content || S.content || {}; S.loadedAt = Date.now();
    renderSite();
    const H = C("hero"), f = h.featured, cats = pubCats();
    const head = (s, more = "") => `<div class="sec-head"><div>${s.title ? `<h2>${esc(s.title)}</h2>` : ""}${s.subtitle ? `<p>${esc(s.subtitle)}</p>` : ""}</div>${more}</div>`;
    const SEC = {
      cats: (s) => cats.length ? `<section class="block" data-sec="cats"><div class="wrap">${head(s)}<div class="grid g-cats">${cats.map(catTile).join("")}</div></div></section>` : "",
      featured: (s) => `<section class="block" data-sec="featured"><div class="wrap">${head(s, `<a class="btn btn-ghost btn-sm" href="#/browse">عرض الكل</a>`)}
        ${f.length ? `<div class="grid g-prod">${f.map(productCard).join("")}</div>` : empty("لا توجد منتجات بعد")}</div></section>`,
      steps: (s) => { const st = C("steps"); return st.length ? `<section class="block" data-sec="steps"><div class="wrap">${head(s)}<div class="grid g-3 steps">
        ${st.map((x) => `<div class="card step"><div class="ic">${ic(x.icon || "spark")}</div><h3>${esc(x.title)}</h3><p class="muted">${esc(x.body)}</p></div>`).join("")}</div></div></section>` : ""; },
      shops: (s) => h.shops.length ? `<section class="block" data-sec="shops"><div class="wrap">${head(s, `<a class="btn btn-ghost btn-sm" href="#/shops">كل المتاجر</a>`)}<div class="grid g-3">${h.shops.map(shopCard).join("")}</div></div></section>` : "",
      faq: (s) => { const fq = C("faq"); return fq.length ? `<section class="block" data-sec="faq"><div class="wrap">${head(s, `<a class="btn btn-ghost btn-sm" href="#/faq">كل الأسئلة</a>`)}<div class="faq">${fq.slice(0, 5).map(faqItem).join("")}</div></div></section>` : ""; },
      band: () => { const b = C("band"); return `<section class="block" data-sec="band"><div class="wrap"><div class="band">
        <svg class="pat" viewBox="0 0 400 200" preserveAspectRatio="none"><path d="M0 150 C100 80 200 220 400 90" stroke="#D9962B" stroke-width="2" fill="none"/><path d="M0 170 C120 100 220 230 400 120" stroke="#F3E6CF" stroke-width="1" fill="none"/></svg>
        <div><h2>${esc(b.title)}</h2><p>${esc(b.body)}</p></div>
        <div class="actions" style="justify-content:flex-end">${b.btn1 ? `<a class="btn btn-gold" href="${safeLink(b.link1)}">${ic("store")} ${esc(b.btn1)}</a>` : ""}${b.btn2 ? `<a class="btn btn-ghost" href="${safeLink(b.link2)}">${esc(b.btn2)}</a>` : ""}</div>
      </div></div></section>`; },
    };
    app.innerHTML = `
    <section class="hero"><div class="wrap">
      <div>
        ${H.eyebrow ? `<span class="eyebrow">${ic("spark")} ${esc(H.eyebrow)}</span>` : ""}
        <h1>${esc(H.title)} ${H.highlight ? `<span>${esc(H.highlight)}</span>` : ""}</h1>
        ${H.lead ? `<p class="lead">${esc(H.lead)}</p>` : ""}
        <form class="search" id="hs" role="search"><input name="q" placeholder="${esc(H.placeholder)}" aria-label="البحث"><button class="btn btn-primary">${ic("search")}<span class="hide-m">بحث</span></button></form>
        <div class="hero-tags">${cats.slice(0, 6).map((c) => `<a href="#/browse?cat=${c.id}">${esc(c.name)}</a>`).join("")}</div>
        ${H.show_stats !== false ? `<div class="stats"><div><b class="num">${h.stats.shops}</b><span>متجر منزلي معتمد</span></div><div><b class="num">${h.stats.products}</b><span>منتج متاح</span></div><div><b class="num">${h.stats.orders}</b><span>طلب عبر المنصة</span></div></div>` : ""}
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="tile" style="inset:0 18% 30% 0">${art("food", 20, "a")}</div>
        <div class="tile" style="inset:40% 0 0 34%">${art("crafts", 40, "b")}</div>
        <div class="tile" style="inset:8% 0 62% 66%">${art("agri", 140, "c")}</div>
        <div class="tile" style="inset:74% 70% 0 4%">${art("beauty", 280, "d")}</div>
      </div>
    </div></section>
    ${homeSections().filter((s) => s.visible !== false && SEC[s.id]).map((s) => SEC[s.id](s)).join("")}`;
    $("#hs").onsubmit = (e) => { e.preventDefault(); location.hash = "#/browse?q=" + encodeURIComponent(e.target.q.value.trim()); };
  };

  routes["browse"] = async (q) => {
    await loadCats();
    const cat = q.get("cat") || "", sort = q.get("sort") || "new", term = q.get("q") || "";
    app.innerHTML = `<div class="page"><div class="wrap">
      <div class="crumbs"><a href="#/">الرئيسية</a> / المنتجات</div>
      <div class="sec-head"><div><h1 style="font-size:clamp(24px,4vw,34px)">${cat ? esc(catName(cat)) : "كل المنتجات"}</h1><p>منتجات معتمدة من متاجر منزلية في قطر</p></div></div>
      <form class="search" id="bs" style="max-width:none;margin-top:0"><input name="q" value="${esc(term)}" placeholder="ابحث باسم المنتج أو المتجر" aria-label="البحث"><select name="sort" class="input" style="width:auto;border:0;min-height:40px" aria-label="الترتيب">
        <option value="new" ${sort === "new" ? "selected" : ""}>الأحدث</option><option value="price_asc" ${sort === "price_asc" ? "selected" : ""}>السعر: الأقل أولًا</option><option value="price_desc" ${sort === "price_desc" ? "selected" : ""}>السعر: الأعلى أولًا</option></select>
        <button class="btn btn-primary">${ic("search")}</button></form>
      <div class="pills" style="margin-bottom:20px"><a class="pill ${!cat ? "on" : ""}" href="#/browse?q=${encodeURIComponent(term)}&sort=${sort}">الكل</a>${pubCats().map((c) => `<a class="pill ${cat === c.id ? "on" : ""}" href="#/browse?cat=${c.id}&q=${encodeURIComponent(term)}&sort=${sort}">${esc(c.name)}</a>`).join("")}</div>
      <div id="res"><div class="grid g-prod">${'<div class="skel"></div>'.repeat(4)}</div></div>
    </div></div>`;
    const f = $("#bs");
    f.onsubmit = (e) => { e.preventDefault(); location.hash = `#/browse?cat=${cat}&q=${encodeURIComponent(f.q.value.trim())}&sort=${f.sort.value}`; };
    f.sort.onchange = () => f.requestSubmit();
    const list = await api("habka_catalog", { p_q: term || null, p_category: cat || null, p_sort: sort });
    $("#res").innerHTML = list.length ? `<p class="muted small"><span class="num">${list.length}</span> منتج</p><div class="grid g-prod">${list.map(productCard).join("")}</div>`
      : empty("لم نجد منتجات مطابقة. جرّب كلمة أخرى أو مجالًا مختلفًا.", `<a class="btn btn-ghost" href="#/browse">عرض كل المنتجات</a>`);
  };

  routes["p"] = async (q, id) => {
    await loadCats();
    app.innerHTML = loader();
    const p = await api("habka_product", { p_id: id });
    if (!p) { app.innerHTML = `<div class="page"><div class="wrap">${empty("هذا المنتج غير متاح حاليًا", '<a class="btn btn-ghost" href="#/browse">تصفح المنتجات</a>')}</div></div>`; return; }
    const shop = p.shop_full;
    const wa = !shop.is_demo && waLink(shop.whatsapp, `السلام عليكم، أستفسر عن «${p.name}» على منصة حبكة`);
    app.innerHTML = `<div class="page"><div class="wrap">
      <div class="crumbs"><a href="#/">الرئيسية</a> / <a href="#/browse?cat=${p.category_id}">${esc(catName(p.category_id))}</a> / ${esc(p.name)}</div>
      <div class="pd">
        <div class="ph">${pImg(p)}</div>
        <div>
          ${shop.is_demo ? `<div class="notice">هذا متجر تجريبي لعرض تجربة المنصة.</div>` : ""}
          <h1 style="font-size:clamp(24px,4vw,36px)">${esc(p.name)}</h1>
          <a href="#/shop/${shop.id}" class="muted">${esc(shop.name)}${shop.area ? ` · ${esc(shop.area)}` : ""}</a>
          ${p.rating ? `<div style="margin-top:6px">${stars(p.rating)} <span class="muted small num">${p.rating} من 5 · ${p.reviews_count} تقييم</span></div>` : ""}
          <div class="price num" style="font-size:30px;margin:14px 0 4px">${fmtMoney(p.price)} <small>/ ${esc(p.unit)}</small></div>
          <div class="meta"><span class="chip">${ic("truck")} مدة التجهيز: ${p.prep_days ? `<span class="num">${p.prep_days}</span> يوم` : "في نفس اليوم"}</span><span class="chip">${p.stock > 0 ? `متوفر: <span class="num">${p.stock}</span>` : "نفدت الكمية"}</span><span class="chip">${ic("shield")} الدفع عند الاستلام</span></div>
          <p>${esc(p.description || "")}</p>
          ${p.stock > 0 ? `<div class="actions" style="margin:18px 0"><div class="qty"><button data-q="-1" aria-label="إنقاص">−</button><input id="qty" class="num" value="1" inputmode="numeric" aria-label="الكمية"><button data-q="1" aria-label="زيادة">+</button></div>
            <button class="btn btn-primary" id="add" style="flex:1">${ic("cart")} أضف إلى السلة</button></div>` : ""}
          <div class="actions">${wa ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="${wa}">${ic("wa")} واتساب المتجر</a>` : ""}<button class="btn btn-ghost" id="ask">${ic("msg")} أرسل استفسارًا</button></div>
        </div>
      </div>
      <section class="block"><h2>آراء العملاء</h2>
        ${p.reviews.length ? `<div class="grid g-2">${p.reviews.map((r) => `<div class="card" style="padding:18px"><div style="display:flex;justify-content:space-between"><b>${esc(r.name)}</b>${stars(r.rating)}</div><p style="margin:8px 0 4px">${esc(r.comment || "")}</p><span class="small muted">${fmtDate(r.created_at)}</span></div>`).join("")}</div>`
          : `<p class="muted">لا توجد تقييمات بعد. يمكن للعملاء التقييم بعد استلام طلباتهم.</p>`}
      </section>
    </div></div>`;
    const qi = $("#qty");
    $$("[data-q]").forEach((b) => (b.onclick = () => { qi.value = Math.max(1, Math.min(p.stock, (parseInt(qi.value) || 1) + +b.dataset.q)); }));
    if ($("#add")) $("#add").onclick = () => {
      const qty = Math.max(1, Math.min(p.stock, parseInt(qi.value) || 1));
      const ex = S.cart.find((x) => x.id === p.id);
      if (ex) ex.qty = Math.min(p.stock, ex.qty + qty);
      else S.cart.push({ id: p.id, name: p.name, price: p.price, unit: p.unit, image: p.image, category_id: p.category_id, shop: { id: shop.id, name: shop.name, hue: shop.hue }, qty, stock: p.stock });
      saveCart(); toast("أُضيف المنتج إلى السلة");
    };
    $("#ask").onclick = () => inquiryModal(shop, p.name);
  };

  function inquiryModal(shop, about) {
    modal(`استفسار إلى ${shop.name}`, `<form id="iq"><div class="err"></div>
      <div class="row2"><div class="field"><label>الاسم</label><input class="input" name="name" required value="${esc(S.user?.full_name || "")}"></div>
      <div class="field"><label>رقم الجوال</label><input class="input ltr num" name="phone" required inputmode="tel" placeholder="+974 XXXX XXXX" value="${esc(S.user?.phone || "")}"></div></div>
      <div class="field"><label>الرسالة</label><textarea class="input" name="body" required>${about ? `استفسار عن «${esc(about)}»: ` : ""}</textarea></div>
      <button class="btn btn-primary btn-block">إرسال الاستفسار</button></form>`, (el, close) => {
      $("#iq", el).onsubmit = async (e) => {
        e.preventDefault(); const d = formData(e.target);
        if (!normPhone(d.phone)) return showErr(e.target, "رقم الجوال غير صحيح، أدخله بصيغة +974 XXXX XXXX");
        try { await busy(e.submitter, () => api("habka_inquiry", { p: { ...d, shop_id: shop.id } })); close(); toast("أُرسل استفسارك، وسيتواصل معك المتجر قريبًا"); }
        catch (err) { showErr(e.target, err.message); }
      };
    });
  }

  routes["shops"] = async (q) => {
    await loadCats();
    const cat = q.get("cat") || "";
    app.innerHTML = `<div class="page"><div class="wrap"><div class="crumbs"><a href="#/">الرئيسية</a> / المتاجر</div>
      <h1 style="font-size:clamp(24px,4vw,34px)">المتاجر المنزلية</h1><p class="muted">أسر منتجة وأصحاب حرف معتمدون من إدارة المنصة</p>
      <div class="pills" style="margin:16px 0 20px"><a class="pill ${!cat ? "on" : ""}" href="#/shops">الكل</a>${pubCats().map((c) => `<a class="pill ${cat === c.id ? "on" : ""}" href="#/shops?cat=${c.id}">${esc(c.name)}</a>`).join("")}</div>
      <div id="res">${loader()}</div></div></div>`;
    const list = await api("habka_shops", { p_category: cat || null });
    $("#res").innerHTML = list.length ? `<div class="grid g-3">${list.map(shopCard).join("")}</div>` : empty("لا توجد متاجر في هذا المجال بعد");
  };

  routes["shop"] = async (q, id) => {
    await loadCats(); app.innerHTML = loader();
    const s = await api("habka_shop", { p_id: id });
    if (!s) { app.innerHTML = `<div class="page"><div class="wrap">${empty("هذا المتجر غير متاح حاليًا")}</div></div>`; return; }
    const wa = !s.is_demo && waLink(s.whatsapp, "السلام عليكم، تواصلت معكم عبر منصة حبكة");
    app.innerHTML = `<div class="page"><div class="wrap"><div class="crumbs"><a href="#/">الرئيسية</a> / <a href="#/shops">المتاجر</a> / ${esc(s.name)}</div>
      <div class="card" style="padding:24px;display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:24px">
        <div class="avatar" style="width:76px;height:76px;font-size:30px;background:hsl(${s.hue} 42% 42%)">${esc(s.name.trim()[0])}</div>
        <div style="flex:1;min-width:220px"><h1 style="font-size:clamp(22px,4vw,32px);margin:0">${esc(s.name)}</h1>
          <div class="muted small">${esc(catName(s.category_id))}${s.area ? ` · ${esc(s.area)}` : ""} · على حبكة منذ ${fmtDate(s.since)}</div>
          <p style="margin:8px 0 0">${esc(s.bio || "")}</p>${s.is_demo ? `<span class="chip" style="margin-top:8px">متجر تجريبي</span>` : ""}</div>
        <div class="actions">${wa ? `<a class="btn btn-ghost" target="_blank" rel="noopener" href="${wa}">${ic("wa")} واتساب</a>` : ""}<button class="btn btn-primary" id="ask">${ic("msg")} استفسار</button></div>
      </div>
      <h2>منتجات المتجر</h2>${s.products.length ? `<div class="grid g-prod">${s.products.map(productCard).join("")}</div>` : empty("لا توجد منتجات معروضة حاليًا")}
    </div></div>`;
    $("#ask").onclick = () => inquiryModal(s);
  };

  routes["cart"] = async () => {
    await loadCats();
    if (!S.cart.length) { app.innerHTML = `<div class="page"><div class="wrap"><h1 style="font-size:30px">السلة</h1>${empty("سلتك فارغة حاليًا", '<a class="btn btn-primary" href="#/browse">ابدأ التسوق</a>')}</div></div>`; return; }
    const total = S.cart.reduce((a, b) => a + b.price * b.qty, 0);
    const shops = [...new Set(S.cart.map((c) => c.shop.id))];
    const u = S.user;
    app.innerHTML = `<div class="page"><div class="wrap"><h1 style="font-size:30px">السلة وإتمام الطلب</h1>
      <div class="layout-2">
        <div class="card" style="padding:6px 20px">${S.cart.map((c, i) => `<div class="cart-line"><div class="ph">${pImg(c)}</div>
          <div><a href="#/p/${c.id}"><b>${esc(c.name)}</b></a><div class="small muted">${esc(c.shop.name)} · ${fmtMoney(c.price)} / ${esc(c.unit)}</div>
          <div class="qty" style="margin-top:6px;transform:scale(.9);transform-origin:right"><button data-i="${i}" data-d="-1" aria-label="إنقاص">−</button><input class="num" value="${c.qty}" readonly aria-label="الكمية"><button data-i="${i}" data-d="1" aria-label="زيادة">+</button></div></div>
          <div style="text-align:left"><b class="num">${fmtMoney(c.price * c.qty)}</b><br><button class="btn btn-sm btn-danger" data-rm="${i}" style="margin-top:6px">حذف</button></div></div>`).join("")}
        </div>
        <div class="card summary">
          <h3>ملخص الطلب</h3>
          <div class="line"><span>عدد المنتجات</span><b class="num">${S.cart.reduce((a, b) => a + b.qty, 0)}</b></div>
          <div class="line"><span>الإجمالي</span><b class="num">${fmtMoney(total)}</b></div>
          ${shops.length > 1 ? `<p class="small muted">سيُقسَّم طلبك إلى <span class="num">${shops.length}</span> طلبات، طلب لكل متجر.</p>` : ""}
          <p class="small muted">الدفع نقدًا أو تحويلًا عند الاستلام، ويُتفق على رسوم التوصيل مع المتجر.</p>
          ${u ? `<form id="co"><div class="err"></div>
            <div class="seg" role="tablist"><button type="button" class="on" data-dl="delivery">توصيل</button><button type="button" data-dl="pickup">استلام من المتجر</button></div>
            <input type="hidden" name="delivery" value="delivery">
            <div class="field" id="addrF"><label>عنوان التوصيل</label><textarea class="input" name="address" style="min-height:80px" placeholder="المنطقة، رقم الشارع، رقم المبنى"></textarea></div>
            <div class="field"><label>رقم الجوال للتواصل</label><input class="input ltr num" name="phone" value="${esc(u.phone || "")}" inputmode="tel" placeholder="+974 XXXX XXXX"></div>
            <div class="field"><label>ملاحظات (اختياري)</label><input class="input" name="notes" placeholder="مثال: موعد التسليم المفضل"></div>
            <button class="btn btn-primary btn-block">تأكيد الطلب</button></form>`
          : `<a class="btn btn-primary btn-block" href="#/login?next=cart">سجّل الدخول لإتمام الطلب</a><p class="small muted" style="margin-top:10px;text-align:center">ليس لديك حساب؟ <a href="#/register?next=cart"><b>أنشئ حسابًا في دقيقة</b></a></p>`}
        </div>
      </div></div></div>`;
    $$("[data-d]").forEach((b) => (b.onclick = () => { const c = S.cart[b.dataset.i]; c.qty = Math.max(1, Math.min(c.stock || 99, c.qty + +b.dataset.d)); saveCart(); routes.cart(); }));
    $$("[data-rm]").forEach((b) => (b.onclick = () => { S.cart.splice(+b.dataset.rm, 1); saveCart(); routes.cart(); }));
    const f = $("#co");
    if (f) {
      $$("[data-dl]", f).forEach((b) => (b.onclick = () => { $$("[data-dl]", f).forEach((x) => x.classList.toggle("on", x === b)); f.delivery.value = b.dataset.dl; $("#addrF").style.display = b.dataset.dl === "pickup" ? "none" : ""; }));
      f.onsubmit = async (e) => {
        e.preventDefault(); const d = formData(f);
        if (!normPhone(d.phone)) return showErr(f, "رقم الجوال غير صحيح، أدخله بصيغة +974 XXXX XXXX");
        if (d.delivery === "delivery" && !d.address.trim()) return showErr(f, "يرجى إدخال عنوان التوصيل");
        try {
          const r = await busy(e.submitter, () => api("habka_place_order", { p_token: S.token, p: { ...d, items: S.cart.map((c) => ({ id: c.id, qty: c.qty })) } }));
          S.cart = []; saveCart();
          app.innerHTML = `<div class="page"><div class="wrap"><div class="card auth" style="padding:34px;text-align:center">
            <div class="avatar" style="margin:0 auto 14px;background:var(--sage)">${ic("shield")}</div><h1 style="font-size:28px">تم استلام طلبك بنجاح</h1>
            <p>رقم ${r.codes.length > 1 ? "الطلبات" : "الطلب"}: <b>${r.codes.map(tel).join("، ")}</b></p><p class="muted">سيصلك تأكيد المتجر قريبًا، ويمكنك متابعة الحالة من حسابك.</p>
            <div class="actions" style="justify-content:center"><a class="btn btn-primary" href="#/account">متابعة طلباتي</a><a class="btn btn-ghost" href="#/browse">مواصلة التسوق</a></div></div></div></div>`;
        } catch (err) { showErr(f, err.message); }
      };
    }
  };

  routes["login"] = async (q) => {
    const next = q.get("next");
    app.innerHTML = `<div class="page"><div class="wrap auth"><div class="card">
      <h1 style="font-size:28px">تسجيل الدخول</h1><p class="muted">مرحبًا بعودتك إلى حبكة</p>
      <form id="lf"><div class="err"></div>
        <div class="field"><label for="le">البريد الإلكتروني</label><input id="le" class="input ltr" type="email" name="email" required autocomplete="email"></div>
        <div class="field"><label for="lp">كلمة المرور</label><input id="lp" class="input ltr" type="password" name="password" required autocomplete="current-password"></div>
        <button class="btn btn-primary btn-block">دخول</button></form>
      <p class="small" style="margin-top:16px;text-align:center">ليس لديك حساب؟ <a href="#/register${next ? "?next=" + next : ""}"><b>أنشئ حسابًا</b></a></p>
    </div></div></div>`;
    $("#lf").onsubmit = async (e) => {
      e.preventDefault(); const d = formData(e.target);
      try {
        const r = await busy(e.submitter, () => api("habka_login", { p_email: d.email, p_password: d.password }));
        setSession(r); toast(`أهلًا ${r.user.full_name}`);
        location.hash = next ? "#/" + next : r.user.role === "admin" ? "#/admin" : r.user.role === "producer" ? "#/seller" : "#/";
      } catch (err) { showErr(e.target, err.message); }
    };
  };

  routes["register"] = async (q) => {
    await loadCats();
    let role = q.get("role") === "producer" ? "producer" : "customer";
    const next = q.get("next");
    const draw = () => {
      app.innerHTML = `<div class="page"><div class="wrap auth"><div class="card">
        <h1 style="font-size:28px">إنشاء حساب</h1><p class="muted">انضم إلى مجتمع حبكة</p>
        <div class="seg"><button type="button" class="${role === "customer" ? "on" : ""}" data-r="customer">أنا عميل</button><button type="button" class="${role === "producer" ? "on" : ""}" data-r="producer">أنا منتج منزلي</button></div>
        <form id="rf"><div class="err"></div>
          <div class="field"><label>الاسم الكامل</label><input class="input" name="full_name" required autocomplete="name"></div>
          <div class="row2"><div class="field"><label>رقم الجوال</label><input class="input ltr num" name="phone" required inputmode="tel" placeholder="+974 XXXX XXXX" autocomplete="tel"></div>
          <div class="field"><label>المنطقة</label><select class="input" name="city">${AREAS.map((a) => `<option>${a}</option>`).join("")}</select></div></div>
          <div class="field"><label>البريد الإلكتروني</label><input class="input ltr" type="email" name="email" required autocomplete="email"></div>
          <div class="field"><label>كلمة المرور</label><input class="input ltr" type="password" name="password" required minlength="8" autocomplete="new-password"><span class="hint">8 أحرف على الأقل</span></div>
          ${role === "producer" ? `<h3 style="margin-top:8px">بيانات المتجر</h3>
            <div class="field"><label>اسم المتجر</label><input class="input" name="shop_name" required></div>
            <div class="field"><label>مجال الإنتاج</label><select class="input" name="category_id" required>${pubCats().map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select></div>
            <div class="field"><label>نبذة عن المتجر</label><textarea class="input" name="bio" placeholder="عرّف العملاء بما تصنعه وما يميزه"></textarea></div>
            <div class="row2"><div class="field"><label>رقم واتساب المتجر</label><input class="input ltr num" name="whatsapp" inputmode="tel" placeholder="+974 XXXX XXXX"><span class="hint">اتركه فارغًا لاستخدام رقم الجوال</span></div>
            <div class="field"><label>رقم الترخيص المنزلي (اختياري)</label><input class="input ltr" name="license_no"></div></div>
            <div class="notice small">تُراجع الإدارة المتجر قبل ظهوره للعملاء، ويمكنك إضافة منتجاتك فور التسجيل.</div>` : ""}
          <label class="small" style="display:flex;gap:8px;align-items:flex-start;margin-bottom:14px"><input type="checkbox" required style="margin-top:6px"> أوافق على <a href="#/terms" target="_blank"><b>الشروط والأحكام</b></a> و<a href="#/privacy" target="_blank"><b>سياسة الخصوصية</b></a></label>
          <button class="btn btn-primary btn-block">إنشاء الحساب</button></form>
        <p class="small" style="margin-top:16px;text-align:center">لديك حساب؟ <a href="#/login${next ? "?next=" + next : ""}"><b>سجّل الدخول</b></a></p>
      </div></div></div>`;
      $$("[data-r]").forEach((b) => (b.onclick = () => { role = b.dataset.r; draw(); }));
      $("#rf").onsubmit = async (e) => {
        e.preventDefault(); const d = formData(e.target);
        if (!normPhone(d.phone)) return showErr(e.target, "رقم الجوال غير صحيح، أدخله بصيغة +974 XXXX XXXX");
        if (d.whatsapp && !normPhone(d.whatsapp)) return showErr(e.target, "رقم واتساب غير صحيح");
        try {
          const r = await busy(e.submitter, () => api("habka_register", { p: { ...d, role } }));
          setSession(r); toast("تم إنشاء حسابك بنجاح");
          location.hash = next ? "#/" + next : role === "producer" ? "#/seller" : "#/";
        } catch (err) { showErr(e.target, err.message); }
      };
    };
    draw();
  };

  const needLogin = (roles) => {
    if (!S.token) { location.hash = "#/login?next=" + location.hash.slice(2).split("?")[0]; return true; }
    if (roles && !roles.includes(S.user.role)) { app.innerHTML = `<div class="page"><div class="wrap">${empty("هذه الصفحة غير متاحة لنوع حسابك", '<a class="btn btn-ghost" href="#/">العودة للرئيسية</a>')}</div></div>`; return true; }
    return false;
  };
  const STEPS = ["new", "accepted", "preparing", "ready", "delivered"];
  const track = (s) => s === "cancelled" ? "" : `<div class="track">${STEPS.map((x, i) => `<i class="${i <= STEPS.indexOf(s) ? "on" : ""}"></i>`).join("")}</div>`;

  routes["account"] = async (q) => {
    if (needLogin()) return;
    await loadCats();
    const tab = q.get("tab") || "orders";
    app.innerHTML = `<div class="page"><div class="wrap"><h1 style="font-size:30px">حسابي</h1>
      <div class="pills" style="margin-bottom:20px"><a class="pill ${tab === "orders" ? "on" : ""}" href="#/account">طلباتي</a><a class="pill ${tab === "profile" ? "on" : ""}" href="#/account?tab=profile">بياناتي</a>
      ${S.user.role === "producer" ? `<a class="pill" href="#/seller">لوحة متجري</a>` : ""}${S.user.role === "admin" ? `<a class="pill" href="#/admin">لوحة الإدارة</a>` : ""}</div><div id="acc">${loader()}</div></div></div>`;
    const box = $("#acc");
    if (tab === "profile") {
      const u = await api("habka_me", { p_token: S.token }); S.user = u; store.set("user", u);
      box.innerHTML = `<form class="card" id="pf" style="padding:24px;max-width:620px"><div class="err"></div>
        <div class="field"><label>الاسم الكامل</label><input class="input" name="full_name" value="${esc(u.full_name)}" required></div>
        <div class="row2"><div class="field"><label>رقم الجوال</label><input class="input ltr num" name="phone" value="${esc(u.phone)}" required></div>
        <div class="field"><label>المنطقة</label><select class="input" name="city">${AREAS.map((a) => `<option ${a === u.city ? "selected" : ""}>${a}</option>`).join("")}</select></div></div>
        <div class="field"><label>البريد الإلكتروني</label><input class="input ltr" value="${esc(u.email)}" disabled></div>
        <div class="field"><label>كلمة مرور جديدة (اختياري)</label><input class="input ltr" type="password" name="new_password" minlength="8" autocomplete="new-password"></div>
        <button class="btn btn-primary">حفظ التعديلات</button></form>`;
      $("#pf").onsubmit = async (e) => {
        e.preventDefault(); const d = formData(e.target);
        if (!normPhone(d.phone)) return showErr(e.target, "رقم الجوال غير صحيح، أدخله بصيغة +974 XXXX XXXX");
        try { const u2 = await busy(e.submitter, () => api("habka_update_profile", { p_token: S.token, p: d })); S.user = u2; store.set("user", u2); renderChrome(); toast("حُفظت بياناتك"); routes.account(q); }
        catch (err) { showErr(e.target, err.message); }
      };
      return;
    }
    const orders = await api("habka_my_orders", { p_token: S.token });
    box.innerHTML = orders.length ? orders.map((o) => `<div class="card ord">
      <div class="ord-h"><div><b class="tel">${o.code}</b> · <a href="#/shop/${o.shop.id}">${esc(o.shop.name)}</a><div class="small muted">${fmtDate(o.created_at, true)} · ${o.delivery === "pickup" ? "استلام من المتجر" : "توصيل"}</div></div>${stBadge(o.status)}</div>
      ${track(o.status)}
      <ul>${o.items.map((i) => `<li>${esc(i.name)} × <span class="num">${i.qty}</span> — <span class="num">${fmtMoney(i.price * i.qty)}</span>
        ${o.status === "delivered" && i.product_id ? ` <button class="btn btn-sm btn-ghost" data-rev="${i.product_id}" data-n="${esc(i.name)}">${i.reviewed ? "تعديل التقييم" : "قيّم المنتج"}</button>` : ""}</li>`).join("")}</ul>
      <div class="ord-h" style="margin:0"><b class="num">الإجمالي: ${fmtMoney(o.total)}</b>
      <div class="actions">${waLink(o.shop.whatsapp) ? `<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="${waLink(o.shop.whatsapp, `بخصوص طلبي ${o.code} على حبكة`)}">${ic("wa")} تواصل مع المتجر</a>` : ""}
      ${o.status === "new" ? `<button class="btn btn-sm btn-danger" data-cancel="${o.id}">إلغاء الطلب</button>` : ""}</div></div></div>`).join("")
      : empty("لا توجد طلبات بعد", '<a class="btn btn-primary" href="#/browse">ابدأ التسوق</a>');
    $$("[data-cancel]").forEach((b) => (b.onclick = async () => {
      if (!(await confirmBox("هل تريد إلغاء هذا الطلب؟", "نعم، ألغِ الطلب"))) return;
      try { await api("habka_cancel_order", { p_token: S.token, p_order: b.dataset.cancel }); toast("أُلغي الطلب"); routes.account(q); } catch (e) { toast(e.message, true); }
    }));
    $$("[data-rev]").forEach((b) => (b.onclick = () => {
      let rating = 5;
      modal(`تقييم «${b.dataset.n}»`, `<form id="rv"><div class="err"></div><div class="field"><label>التقييم</label><div id="rs" style="font-size:34px;cursor:pointer;color:var(--saffron)" class="num"></div></div>
        <div class="field"><label>تعليقك</label><textarea class="input" name="comment" placeholder="شاركنا تجربتك مع المنتج"></textarea></div><button class="btn btn-primary btn-block">إرسال التقييم</button></form>`, (el, close) => {
        const rs = $("#rs", el); const dr = () => (rs.innerHTML = [1, 2, 3, 4, 5].map((n) => `<span data-s="${n}" role="button" aria-label="${n}">${n <= rating ? "★" : "☆"}</span>`).join(""));
        dr(); rs.onclick = (e) => { if (e.target.dataset.s) { rating = +e.target.dataset.s; dr(); } };
        $("#rv", el).onsubmit = async (e) => {
          e.preventDefault();
          try { await busy(e.submitter, () => api("habka_review", { p_token: S.token, p_product: b.dataset.rev, p_rating: rating, p_comment: e.target.comment.value })); close(); toast("شكرًا لتقييمك"); routes.account(q); }
          catch (err) { showErr(e.target, err.message); }
        };
      });
    }));
  };

  /* ---------- لوحة المنتج ---------- */
  routes["seller"] = async (q) => {
    if (needLogin(["producer"])) return;
    await loadCats();
    const tab = q.get("tab") || "overview";
    app.innerHTML = loader();
    const d = await api("habka_seller", { p_token: S.token });
    const s = d.shop;
    const openOrders = d.orders.filter((o) => ["new", "accepted", "preparing", "ready"].includes(o.status)).length;
    const unread = d.inquiries.filter((i) => !i.is_read).length;
    const tabs = [["overview", "نظرة عامة"], ["products", "منتجاتي", d.products.length], ["orders", "الطلبات", openOrders], ["inquiries", "الاستفسارات", unread], ["shop", "إعدادات المتجر"]];
    app.innerHTML = `<div class="page"><div class="wrap">
      <div class="sec-head"><div><h1 style="font-size:clamp(24px,4vw,32px);margin:0">${esc(s.shop_name)}</h1><p>لوحة إدارة المتجر · ${stBadge(s.status)}</p></div>
      ${s.status === "approved" ? `<a class="btn btn-ghost btn-sm" href="#/shop/${s.user_id}">عرض متجري كما يراه العملاء</a>` : ""}</div>
      ${s.status === "pending" ? `<div class="notice">متجرك قيد مراجعة الإدارة. أضف منتجاتك الآن، وستظهر للعملاء فور اعتماد المتجر والمنتجات.</div>` : ""}
      ${s.status === "rejected" ? `<div class="notice bad">لم يُعتمد المتجر${s.admin_note ? `: ${esc(s.admin_note)}` : ""}. عدّل بيانات المتجر ليُعاد إرساله للمراجعة.</div>` : ""}
      ${s.status === "suspended" ? `<div class="notice bad">المتجر موقوف مؤقتًا من الإدارة${s.admin_note ? `: ${esc(s.admin_note)}` : ""}.</div>` : ""}
      <div class="dash"><nav class="card side">${tabs.map(([k, t, n]) => `<a href="#/seller?tab=${k}" class="${tab === k ? "on" : ""}">${t}${n && k !== "products" ? `<span class="n num">${n}</span>` : ""}</a>`).join("")}</nav><div id="pane"></div></div></div></div>`;
    const pane = $("#pane");
    const reload = () => routes.seller(q);

    if (tab === "overview") {
      pane.innerHTML = `<div class="kpis"><div class="card kpi"><span>المبيعات المسلّمة</span><b class="num">${fmtMoney(d.stats.sales)}</b></div><div class="card kpi"><span>طلبات قيد التنفيذ</span><b class="num">${d.stats.open_orders}</b></div>
        <div class="card kpi"><span>منتجات معتمدة</span><b class="num">${d.stats.products}</b></div><div class="card kpi"><span>متوسط التقييم</span><b class="num">${d.stats.rating ?? "—"}</b></div></div>
        <div class="card" style="padding:20px"><div class="sec-head" style="margin-bottom:10px"><h3 style="margin:0">أحدث الطلبات</h3><a class="btn btn-sm btn-ghost" href="#/seller?tab=orders">كل الطلبات</a></div>
        ${d.orders.slice(0, 5).map((o) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line)"><span><b class="tel">${o.code}</b> · ${esc(o.customer.name)}</span><span>${stBadge(o.status)} <b class="num">${fmtMoney(o.total)}</b></span></div>`).join("") || `<p class="muted">لا توجد طلبات بعد. أضف منتجاتك وشارك رابط متجرك.</p>`}</div>
        <div class="card" style="padding:20px;margin-top:16px"><h3>نصائح لزيادة مبيعاتك</h3><ul class="muted" style="margin:0;padding-inline-start:20px"><li>صوّر منتجاتك في ضوء النهار وعلى خلفية بسيطة.</li><li>اكتب وصفًا يذكر المكونات والحجم ومدة الصلاحية.</li><li>استجب للطلبات الجديدة خلال ساعتين لتكسب ثقة العملاء.</li><li>استخدم <a href="#/guide#calc"><b>حاسبة التسعير</b></a> لتسعير عادل يغطي تكلفتك.</li></ul></div>`;
    }

    if (tab === "products") {
      pane.innerHTML = `<div class="sec-head" style="margin-bottom:14px"><h2 style="margin:0">منتجاتي</h2><button class="btn btn-primary" id="addp">${ic("plus")} إضافة منتج</button></div>
        ${d.products.length ? `<div class="card table-wrap"><table class="t"><thead><tr><th></th><th>المنتج</th><th>السعر</th><th>المتوفر</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>
        ${d.products.map((p) => `<tr><td><div class="t-ph">${pImg(p)}</div></td><td><b>${esc(p.name)}</b><div class="small muted">${esc(catName(p.category_id))}</div>${p.admin_note ? `<div class="small" style="color:var(--danger)">ملاحظة الإدارة: ${esc(p.admin_note)}</div>` : ""}</td>
          <td class="num">${fmtMoney(p.price)}</td><td class="num">${p.stock}</td><td>${stBadge(p.status)}</td>
          <td><div class="actions"><button class="btn btn-sm btn-ghost" data-edit="${p.id}">تعديل</button><button class="btn btn-sm btn-ghost" data-tog="${p.id}">${p.status === "hidden" ? "إظهار" : "إخفاء"}</button><button class="btn btn-sm btn-danger" data-del="${p.id}">حذف</button></div></td></tr>`).join("")}
        </tbody></table></div>` : empty("لم تضف أي منتج بعد", "")}`;
      $("#addp").onclick = () => productForm(null, reload);
      $$("[data-edit]").forEach((b) => (b.onclick = () => productForm(d.products.find((p) => p.id === b.dataset.edit), reload)));
      $$("[data-tog]").forEach((b) => (b.onclick = async () => { try { await api("habka_seller_toggle_product", { p_token: S.token, p_id: b.dataset.tog }); toast("تم تحديث المنتج"); reload(); } catch (e) { toast(e.message, true); } }));
      $$("[data-del]").forEach((b) => (b.onclick = async () => {
        if (!(await confirmBox("سيُحذف المنتج نهائيًا. هل أنت متأكد؟", "حذف المنتج"))) return;
        try { await api("habka_seller_delete_product", { p_token: S.token, p_id: b.dataset.del }); toast("حُذف المنتج"); reload(); } catch (e) { toast(e.message, true); }
      }));
    }

    if (tab === "orders") {
      const NEXT = { new: [["accepted", "قبول الطلب", "btn-ok"], ["cancelled", "رفض", "btn-danger"]], accepted: [["preparing", "بدء التجهيز", "btn-primary"], ["cancelled", "إلغاء", "btn-danger"]], preparing: [["ready", "جاهز للتسليم", "btn-primary"]], ready: [["delivered", "تم التسليم", "btn-ok"]] };
      pane.innerHTML = `<h2>الطلبات</h2>` + (d.orders.length ? d.orders.map((o) => `<div class="card ord">
        <div class="ord-h"><div><b class="tel">${o.code}</b> · ${esc(o.customer.name)}<div class="small muted">${fmtDate(o.created_at, true)}</div></div>${stBadge(o.status)}</div>${track(o.status)}
        <ul>${o.items.map((i) => `<li>${esc(i.name)} × <span class="num">${i.qty}</span> — <span class="num">${fmtMoney(i.price * i.qty)}</span></li>`).join("")}</ul>
        <dl class="kv"><dt>الاستلام</dt><dd>${o.delivery === "pickup" ? "استلام من المتجر" : "توصيل"}</dd>${o.address ? `<dt>العنوان</dt><dd>${esc(o.address)}</dd>` : ""}<dt>الجوال</dt><dd class="num">${tel(o.phone)}</dd>${o.notes ? `<dt>ملاحظات</dt><dd>${esc(o.notes)}</dd>` : ""}<dt>الإجمالي</dt><dd><b class="num">${fmtMoney(o.total)}</b></dd></dl>
        <div class="actions" style="margin-top:12px">${(NEXT[o.status] || []).map(([st, t, c]) => `<button class="btn btn-sm ${c}" data-o="${o.id}" data-s="${st}">${t}</button>`).join("")}
        ${waLink(o.phone) ? `<a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="${waLink(o.phone, `مرحبًا ${o.customer.name}، بخصوص طلبك ${o.code} من ${s.shop_name} على حبكة`)}">${ic("wa")} مراسلة العميل</a>` : ""}</div></div>`).join("") : empty("لا توجد طلبات بعد"));
      $$("[data-o]").forEach((b) => (b.onclick = async () => {
        if (b.dataset.s === "cancelled" && !(await confirmBox("سيُلغى الطلب وتعود الكمية للمخزون. هل تريد المتابعة؟", "نعم، إلغاء"))) return;
        try { await busy(b, () => api("habka_seller_order_status", { p_token: S.token, p_order: b.dataset.o, p_status: b.dataset.s })); toast("حُدّثت حالة الطلب"); reload(); } catch (e) { toast(e.message, true); }
      }));
    }

    if (tab === "inquiries") {
      pane.innerHTML = `<h2>الاستفسارات</h2>` + (d.inquiries.length ? d.inquiries.map((i) => `<div class="card ord" style="${i.is_read ? "" : "border-color:var(--saffron)"}">
        <div class="ord-h"><div><b>${esc(i.name)}</b> · <span class="num">${tel(i.phone)}</span><div class="small muted">${fmtDate(i.created_at, true)}</div></div>${i.is_read ? "" : `<span class="st st-new">جديد</span>`}</div>
        <p>${esc(i.body)}</p><div class="actions">${waLink(i.phone) ? `<a class="btn btn-sm btn-ok" target="_blank" rel="noopener" href="${waLink(i.phone, `مرحبًا ${i.name}، شكرًا لتواصلك مع ${s.shop_name} عبر حبكة.`)}">${ic("wa")} الرد عبر واتساب</a>` : ""}
        ${i.is_read ? "" : `<button class="btn btn-sm btn-ghost" data-read="${i.id}">تحديد كمقروء</button>`}</div></div>`).join("") : empty("لا توجد استفسارات بعد"));
      $$("[data-read]").forEach((b) => (b.onclick = async () => { await api("habka_seller_read_inquiry", { p_token: S.token, p_id: b.dataset.read }); reload(); }));
    }

    if (tab === "shop") {
      pane.innerHTML = `<form class="card" id="sf" style="padding:24px"><h2>إعدادات المتجر</h2><div class="err"></div>
        <div class="field"><label>اسم المتجر</label><input class="input" name="shop_name" value="${esc(s.shop_name)}" required></div>
        <div class="row2"><div class="field"><label>مجال الإنتاج</label><select class="input" name="category_id">${pubCats().concat(S.cats.filter((c) => c.id === s.category_id && c.active === false)).map((c) => `<option value="${c.id}" ${c.id === s.category_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
        <div class="field"><label>المنطقة</label><select class="input" name="area">${AREAS.map((a) => `<option ${a === s.area ? "selected" : ""}>${a}</option>`).join("")}</select></div></div>
        <div class="field"><label>نبذة عن المتجر</label><textarea class="input" name="bio">${esc(s.bio || "")}</textarea></div>
        <div class="row2"><div class="field"><label>رقم واتساب</label><input class="input ltr num" name="whatsapp" value="${esc(s.whatsapp || "")}" required></div>
        <div class="field"><label>رقم الترخيص المنزلي</label><input class="input ltr" name="license_no" value="${esc(s.license_no || "")}"></div></div>
        <button class="btn btn-primary">حفظ الإعدادات</button></form>`;
      $("#sf").onsubmit = async (e) => {
        e.preventDefault(); const f = formData(e.target);
        if (!normPhone(f.whatsapp)) return showErr(e.target, "رقم واتساب غير صحيح، أدخله بصيغة +974 XXXX XXXX");
        try { await busy(e.submitter, () => api("habka_seller_save_shop", { p_token: S.token, p: f })); toast("حُفظت إعدادات المتجر"); reload(); } catch (err) { showErr(e.target, err.message); }
      };
    }
  };

  function compressImage(file) {
    return new Promise((res, rej) => {
      if (!/^image\//.test(file.type)) return rej(new Error("يرجى اختيار ملف صورة"));
      const fr = new FileReader();
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          const max = 900, sc = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas"); c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          let q = 0.8, out = c.toDataURL("image/jpeg", q);
          while (out.length > 380000 && q > 0.4) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
          res(out);
        };
        img.onerror = () => rej(new Error("تعذر قراءة الصورة"));
        img.src = fr.result;
      };
      fr.readAsDataURL(file);
    });
  }

  function productForm(p, done, admin) {
    p = p || {};
    let image = "";
    const cats = (admin ? S.cats : pubCats()).concat(S.cats.filter((c) => c.id === p.category_id && !admin && c.active === false));
    modal(p.id ? "تعديل المنتج" : admin ? `إضافة منتج إلى ${p._shop || "المتجر"}` : "إضافة منتج جديد", `<form id="pfm"><div class="err"></div>
      <label class="img-drop"><div class="t-ph" id="prev">${p.id ? pImg(p) : `<div style="display:flex;align-items:center;justify-content:center;height:100%">${ic("img")}</div>`}</div>
        <div><b>صورة المنتج</b><div class="small muted">اختر صورة واضحة، وستُضغط تلقائيًا</div></div><input type="file" accept="image/*" id="pimg" class="sr"></label>
      <div class="field" style="margin-top:14px"><label>اسم المنتج</label><input class="input" name="name" value="${esc(p.name || "")}" required maxlength="80"></div>
      <div class="row2"><div class="field"><label>التصنيف</label><select class="input" name="category_id">${cats.map((c) => `<option value="${c.id}" ${c.id === (p.category_id || S.user?.shop?.category_id) ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
      <div class="field"><label>الوحدة</label><input class="input" name="unit" value="${esc(p.unit || "قطعة")}" placeholder="قطعة، علبة، كيلو..."></div></div>
      <div class="row2"><div class="field"><label>السعر (ر.ق)</label><input class="input ltr num" name="price" type="number" step="0.5" min="1" value="${p.price || ""}" required></div>
      <div class="field"><label>الكمية المتوفرة</label><input class="input ltr num" name="stock" type="number" min="0" value="${p.stock ?? 10}" required></div></div>
      <div class="field"><label>مدة التجهيز بالأيام</label><input class="input ltr num" name="prep_days" type="number" min="0" max="60" value="${p.prep_days ?? 1}"><span class="hint">صفر يعني التجهيز في نفس اليوم</span></div>
      <div class="field"><label>الوصف</label><textarea class="input" name="description" placeholder="المكونات، الحجم، طريقة الحفظ...">${esc(p.description || "")}</textarea></div>
      ${admin ? `<div class="row2"><div class="field"><label>حالة المنتج</label><select class="input" name="status">${["approved", "pending", "hidden", "rejected"].map((k) => `<option value="${k}" ${k === (p.status || "approved") ? "selected" : ""}>${STATUS[k]}</option>`).join("")}</select></div>
        <div class="field"><label>&nbsp;</label><label class="ed-check"><input type="checkbox" name="featured" ${p.featured ? "checked" : ""}><span>منتج مميز يظهر أولًا</span></label></div></div>
        ${p.image ? `<label class="ed-check" style="margin-bottom:12px"><input type="checkbox" name="remove_image"><span>إزالة الصورة الحالية واستخدام الرسم الفني</span></label>` : ""}`
      : `<p class="small muted">يُراجع المنتج من الإدارة قبل ظهوره، وتُعاد مراجعته عند تعديله.</p>`}
      <button class="btn btn-primary btn-block">${p.id ? "حفظ التعديلات" : "إضافة المنتج"}</button></form>`, (el, close) => {
      $("#pimg", el).onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { image = await compressImage(f); $("#prev", el).innerHTML = `<img src="${image}" alt="">`; } catch (err) { toast(err.message, true); }
      };
      $("#pfm", el).onsubmit = async (e) => {
        e.preventDefault(); const f = formData(e.target);
        try {
          if (admin) {
            await busy(e.submitter, () => api("habka_admin_save_product", { p_token: S.token, p: { ...f, id: p.id || null, shop_id: p.shop_id || p.shop?.id, image, featured: !!e.target.featured.checked, remove_image: !!(e.target.remove_image && e.target.remove_image.checked) } }));
            close(); toast(p.id ? "حُفظ المنتج" : "أُضيف المنتج إلى المتجر"); done(); return;
          }
          await busy(e.submitter, () => api("habka_seller_save_product", { p_token: S.token, p: { ...f, id: p.id || null, image } })); close(); toast(p.id ? "حُفظ المنتج وأُرسل للمراجعة" : "أُضيف المنتج وأُرسل للمراجعة"); done();
        }
        catch (err) { showErr(e.target, err.message); }
      };
    });
  }

  /* ---------- محرر المحتوى (إدارة) ---------- */
  const getP = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);
  const setP = (o, p, v) => { const ks = p.split("."), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
  const blankOf = (fields) => Object.fromEntries(fields.map((f) => [f.k, f.t === "bool" ? true : f.t === "lines" || f.t === "list" ? [] : f.t === "hue" ? 30 : f.t === "icon" ? "spark" : ""]));
  const fieldAt = (root, path) => { let f = root; for (const s of path.split(".").slice(1)) { if (/^\d+$/.test(s)) continue; f = f.fields.find((x) => x.k === s); } return f; };
  const iconSelect = (val, attrs) => `<select class="input" ${attrs}>${Object.entries(ICON_NAMES).map(([k, n]) => `<option value="${k}" ${k === val ? "selected" : ""}>${n}</option>`).join("")}</select>`;
  let ED_OPEN = new Set();
  const RICH_HINT = "التنسيق: ابدأ السطر بـ «- » لقائمة نقطية، أو «1. » لقائمة مرقمة، أو «### » لعنوان فرعي، وضع النص بين ** و** ليظهر بخط عريض.";

  function fieldHTML(f, val, path) {
    const id = "f_" + path.replace(/\./g, "_");
    const lab = `<label for="${id}">${esc(f.l)}</label>`;
    const hint = f.h ? `<span class="hint">${esc(f.h)}</span>` : "";
    switch (f.t) {
      case "bool": return `<label class="ed-check"><input type="checkbox" id="${id}" data-p="${path}" data-t="bool" ${val ? "checked" : ""}><span>${esc(f.l)}</span></label>`;
      case "area": return `<div class="field">${lab}<textarea class="input" id="${id}" data-p="${path}" rows="${f.rows || 3}">${esc(val)}</textarea>${hint}</div>`;
      case "rich": return `<div class="field">${lab}<textarea class="input" id="${id}" data-p="${path}" rows="${f.rows || 9}">${esc(val)}</textarea><span class="hint">${RICH_HINT}</span></div>`;
      case "lines": return `<div class="field">${lab}<textarea class="input" id="${id}" data-p="${path}" data-t="lines" rows="4">${esc((val || []).join("\n"))}</textarea><span class="hint">${esc(f.h || "عنصر واحد في كل سطر")}</span></div>`;
      case "icon": return `<div class="field">${lab}<div class="ed-pick"><span class="ed-ic" data-prev="${path}">${ic(val || "spark")}</span>${iconSelect(val, `id="${id}" data-p="${path}" data-t="icon"`)}</div></div>`;
      case "hue": { const [bg, fg] = hueColors(val ?? 30); return `<div class="field">${lab}<div class="ed-pick"><span class="ed-ic" data-prev="${path}" style="background:${bg};color:${fg}">${ic("spark")}</span><input type="range" min="0" max="359" class="ed-range" id="${id}" data-p="${path}" data-t="hue" value="${val ?? 30}" aria-label="${esc(f.l)}"></div></div>`; }
      case "select": return `<div class="field">${lab}<select class="input" id="${id}" data-p="${path}">${f.o.map(([v, n]) => `<option value="${v}" ${v === val ? "selected" : ""}>${n}</option>`).join("")}</select></div>`;
      case "list": return listHTML(f, val || [], path);
      default: return `<div class="field">${lab}<input class="input ${f.t === "link" ? "ltr" : ""}" id="${id}" data-p="${path}" value="${esc(val)}" ${f.t === "link" ? 'placeholder="#/browse أو https://..."' : ""}>${f.t === "link" ? `<span class="hint">${esc(f.h || "رابط داخلي يبدأ بـ #/ أو رابط خارجي يبدأ بـ https://")}</span>` : hint}</div>`;
    }
  }
  const tools = (path, i, n, fixed) => `<span class="ed-tools">
    <button type="button" class="icon-btn sm" data-act="up" data-list="${path}" data-i="${i}" aria-label="تحريك للأعلى" ${i === 0 ? "disabled" : ""}>${ic("up")}</button>
    <button type="button" class="icon-btn sm" data-act="down" data-list="${path}" data-i="${i}" aria-label="تحريك للأسفل" ${i === n - 1 ? "disabled" : ""}>${ic("down")}</button>
    ${fixed ? "" : `<button type="button" class="icon-btn sm danger" data-act="del" data-list="${path}" data-i="${i}" aria-label="حذف">${ic("trash")}</button>`}</span>`;
  function listHTML(f, arr, path) {
    const nested = path.includes(".");
    return `<div class="ed-list ${nested ? "nested" : ""}">${nested ? `<h4 class="ed-sub">${esc(f.l)}</h4>` : ""}
      ${arr.map((it, i) => `<div class="ed-item ${ED_OPEN.has(path + "." + i) ? "open" : ""}" data-list="${path}" data-i="${i}">
        <div class="ed-bar"><span class="ed-grip" draggable="true" title="اسحب لإعادة الترتيب">${ic("grip")}</span><b class="ed-n num">${i + 1}</b><button type="button" class="ed-t" data-act="toggle" data-list="${path}" data-i="${i}" aria-expanded="${ED_OPEN.has(path + "." + i)}">${esc((f.label && f.label(it)) || "عنصر جديد")}</button><i class="ed-chev">${ic("down")}</i>${tools(path, i, arr.length, f.fixed)}</div>
        <div class="ed-body">${f.fields.map((sf) => fieldHTML(sf, it[sf.k], `${path}.${i}.${sf.k}`)).join("")}</div></div>`).join("")}
      ${arr.length ? "" : `<p class="muted small">لا توجد عناصر بعد، أضف أول عنصر.</p>`}
      ${f.fixed ? "" : `<button type="button" class="btn btn-ghost btn-sm" data-act="add" data-list="${path}">${ic("plus")} ${esc(f.add || "إضافة عنصر")}</button>`}</div>`;
  }
  /* ترتيب بالسحب والإفلات (الكمبيوتر) مع أزرار الأسهم (الجوال) */
  function dragSort(root, sel, onMove) {
    let from = null;
    const clean = () => { $$(".dragging,.drop", root).forEach((x) => x.classList.remove("dragging", "drop")); };
    const target = (e) => { let it = e.target.closest(sel); while (it && from && it.parentElement !== from.parentElement) it = it.parentElement.closest(sel); return it; };
    root.addEventListener("dragstart", (e) => {
      const g = e.target.closest(".ed-grip"); if (!g) return;
      from = g.closest(sel); from.classList.add("dragging"); e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", ""); e.dataTransfer.setDragImage(from, 24, 24); } catch {}
    });
    root.addEventListener("dragover", (e) => { const it = target(e); if (!from || !it) return; e.preventDefault(); $$(".drop", root).forEach((x) => x.classList.remove("drop")); if (it !== from) it.classList.add("drop"); });
    root.addEventListener("drop", (e) => { const it = target(e); if (!from || !it) return; e.preventDefault(); const a = +from.dataset.i, b = +it.dataset.i, l = from.dataset.list; clean(); from = null; if (a !== b) onMove(l, a, b); });
    root.addEventListener("dragend", () => { clean(); from = null; });
  }
  const move = (arr, a, b) => arr.splice(b, 0, arr.splice(a, 1)[0]);

  function mountEditor(box, key, root) {
    const draft = { v: structuredClone(root.get ? root.get() : C(key)) };
    ED_OPEN = new Set();
    box.innerHTML = `<div class="ed-form"></div><div class="ed-save"><button type="button" class="btn btn-primary" data-save>${ic("check")} حفظ ونشر</button>
      ${root.preview ? `<a class="btn btn-ghost" href="${root.preview}" target="_blank" rel="noopener">${ic("eye")} معاينة الصفحة</a>` : ""}
      <button type="button" class="btn btn-ghost" data-reset>استعادة النص الافتراضي</button><span class="small muted" data-state></span></div>`;
    const form = $(".ed-form", box), state = $("[data-state]", box);
    const dirty = (t = "لديك تغييرات غير محفوظة") => { state.textContent = t; state.style.color = "var(--clay)"; };
    const draw = () => { form.innerHTML = root.t === "list" ? listHTML(root, draft.v, "v") : root.fields.map((sf) => fieldHTML(sf, draft.v[sf.k], "v." + sf.k)).join(""); };
    draw();
    const onField = (e) => {
      const el = e.target.closest("[data-p]"); if (!el) return;
      const t = el.dataset.t; let v = el.value;
      if (t === "bool") v = el.checked; else if (t === "lines") v = v.split("\n").map((s) => s.trim()).filter(Boolean); else if (t === "hue") v = +v;
      setP(draft, el.dataset.p, v); dirty();
      const pv = $(`[data-prev="${el.dataset.p}"]`, form);
      if (pv && t === "icon") pv.innerHTML = ic(v);
      if (pv && t === "hue") { const [bg, fg] = hueColors(v); pv.style.background = bg; pv.style.color = fg; }
      const item = el.closest(".ed-item"), lf = item && fieldAt(root, item.dataset.list);
      if (lf && lf.label) $(".ed-t", item).textContent = lf.label(getP(draft, item.dataset.list)[+item.dataset.i]) || "عنصر جديد";
    };
    form.addEventListener("input", onField); form.addEventListener("change", onField);
    form.addEventListener("click", async (e) => {
      const b = e.target.closest("[data-act]"); if (!b) return;
      const arr = getP(draft, b.dataset.list), i = +b.dataset.i, act = b.dataset.act, k = b.dataset.list + "." + i;
      if (act === "toggle") { const it = b.closest(".ed-item"), on = !ED_OPEN.has(k); if (on) ED_OPEN.add(k); else ED_OPEN = new Set([...ED_OPEN].filter((x) => x !== k)); it.classList.toggle("open", on); b.setAttribute("aria-expanded", on); return; }
      if (act !== "add") ED_OPEN = new Set([...ED_OPEN].filter((x) => !x.startsWith(b.dataset.list + ".")));
      if (act === "add") { arr.push(blankOf(fieldAt(root, b.dataset.list).fields)); ED_OPEN.add(b.dataset.list + "." + (arr.length - 1)); }
      if (act === "up" && i > 0) move(arr, i, i - 1);
      if (act === "down" && i < arr.length - 1) move(arr, i, i + 1);
      if (act === "del") { if (!(await confirmBox("سيُحذف هذا العنصر من القائمة، ولن يُعتمد الحذف إلا بعد الضغط على «حفظ ونشر». هل تريد المتابعة؟", "حذف العنصر"))) return; arr.splice(i, 1); }
      dirty(); draw();
      if (act === "add") { const items = $$(`.ed-item[data-list="${b.dataset.list}"]`, form); const last = items[items.length - 1]; last?.scrollIntoView({ block: "center" }); $(".ed-body input:not([type=checkbox]),.ed-body textarea,.ed-body select", last)?.focus({ preventScroll: true }); }
    });
    dragSort(form, ".ed-item", (l, a, b) => { move(getP(draft, l), a, b); ED_OPEN = new Set([...ED_OPEN].filter((x) => !x.startsWith(l + "."))); dirty(); draw(); });
    $("[data-reset]", box).onclick = async () => {
      if (!(await confirmBox("ستُستعاد النصوص الافتراضية لهذا القسم في المحرر، ثم تعتمدها بالضغط على «حفظ ونشر».", "استعادة"))) return;
      draft.v = structuredClone(DEFAULTS[key]); draw(); dirty("استُعيد النص الافتراضي، اضغط «حفظ ونشر» لاعتماده");
    };
    $("[data-save]", box).onclick = (e) => busy(e.currentTarget, async () => {
      try {
        await api("habka_admin_set_content", { p_token: S.token, p_key: key, p_value: draft.v });
        S.content = { ...(S.content || {}), [key]: structuredClone(draft.v) }; renderSite();
        state.textContent = "حُفظ ونُشر على الموقع"; state.style.color = "var(--sage)"; toast("حُفظت التعديلات ونُشرت على الموقع");
      } catch (err) { toast(err.message, true); }
    });
  }

  const CMS = [
    { g: "الصفحة الرئيسية", items: [
      ["hero", "الواجهة الرئيسية", "العنوان الرئيسي والفقرة التعريفية ومربع البحث في أعلى الصفحة الرئيسية.", { t: "obj", preview: "#/", fields: [
        { k: "eyebrow", l: "السطر التمهيدي" }, { k: "title", l: "العنوان" }, { k: "highlight", l: "الجزء المميز من العنوان", h: "يظهر بلون الهوية بعد العنوان" },
        { k: "lead", l: "الفقرة التعريفية", t: "area" }, { k: "placeholder", l: "النص الإرشادي في مربع البحث" }, { k: "show_stats", l: "إظهار أرقام المنصة (المتاجر والمنتجات والطلبات)", t: "bool" }] }],
      ["sections", "أقسام الصفحة وترتيبها", "رتّب أقسام الصفحة الرئيسية بالسحب أو بالأسهم، وأظهر أي قسم أو أخفه، وعدّل عنوانه ووصفه.", { t: "list", fixed: true, preview: "#/", get: () => homeSections(), label: (x) => x.label, fields: [
        { k: "visible", l: "إظهار هذا القسم", t: "bool" }, { k: "title", l: "عنوان القسم" }, { k: "subtitle", l: "الوصف المختصر" }] }],
      ["steps", "كيف تعمل المنصة", "خطوات تشرح للزائر طريقة الطلب، تظهر في الصفحة الرئيسية.", { t: "list", add: "إضافة خطوة", preview: "#/", label: (x) => x.title, fields: [
        { k: "icon", l: "الأيقونة", t: "icon" }, { k: "title", l: "العنوان" }, { k: "body", l: "الوصف", t: "area" }] }],
      ["band", "دعوة المنتجين", "الشريط الداكن الذي يدعو أصحاب المواهب إلى فتح متاجرهم.", { t: "obj", preview: "#/", fields: [
        { k: "title", l: "العنوان" }, { k: "body", l: "النص", t: "area" }, { k: "btn1", l: "نص الزر الأول" }, { k: "link1", l: "رابط الزر الأول", t: "link" },
        { k: "btn2", l: "نص الزر الثاني (اتركه فارغًا لإخفائه)" }, { k: "link2", l: "رابط الزر الثاني", t: "link" }] }],
      ["announce", "شريط الإعلانات", "شريط رفيع يظهر أعلى جميع صفحات الموقع، مناسب للعروض والمواسم والتنبيهات.", { t: "obj", preview: "#/", fields: [
        { k: "enabled", l: "تفعيل شريط الإعلانات", t: "bool" }, { k: "text", l: "نص الإعلان", t: "area", rows: 2 }, { k: "link", l: "الرابط عند الضغط (اختياري)", t: "link" },
        { k: "tone", l: "لون الشريط", t: "select", o: [["gold", "ذهبي"], ["ink", "كحلي"], ["sage", "أخضر"], ["clay", "طيني"]] }] }],
    ] },
    { g: "الأسئلة الشائعة", items: [
      ["faq", "الأسئلة الشائعة", "تظهر في صفحة الأسئلة الشائعة وفي قسمها بالصفحة الرئيسية.", { t: "list", add: "إضافة سؤال", preview: "#/faq", label: (x) => x.q, fields: [
        { k: "q", l: "السؤال" }, { k: "a", l: "الإجابة", t: "rich", rows: 4 }] }],
    ] },
    { g: "دليل المنتج", items: [
      ["guide", "نصوص صفحة الدليل", "العناوين والفقرات الرئيسية في صفحة دليل المنتج المنزلي.", { t: "obj", preview: "#/guide", fields: [
        { k: "eyebrow", l: "السطر التمهيدي" }, { k: "title", l: "العنوان الرئيسي" }, { k: "lead", l: "الفقرة التعريفية", t: "area" },
        { k: "ideas_title", l: "عنوان قسم الأفكار" }, { k: "start_title", l: "عنوان قسم خطوات البداية" }, { k: "calc_title", l: "عنوان الحاسبة" },
        { k: "calc_lead", l: "وصف الحاسبة", t: "area", rows: 2 }, { k: "calc_example", l: "مثال الحاسبة", t: "area", rows: 2 }, { k: "brand_title", l: "عنوان قسم العلامة والتسويق" },
        { k: "cta_title", l: "عنوان الدعوة الختامية" }, { k: "cta_body", l: "نص الدعوة الختامية", t: "area", rows: 2 }] }],
      ["ideas", "أفكار المشاريع", "بطاقات أفكار المشاريع حسب المجال.", { t: "list", add: "إضافة فكرة", preview: "#/guide#ideas", label: (x) => x.title, fields: [
        { k: "icon", l: "الأيقونة", t: "icon" }, { k: "hue", l: "لون البطاقة", t: "hue" }, { k: "title", l: "العنوان" }, { k: "desc", l: "الوصف", t: "area", rows: 2 },
        { k: "items", l: "أمثلة على المنتجات", t: "lines" }, { k: "cost", l: "رأس المال التقريبي", h: "مثال: 1,000 إلى 3,000 ر.ق" }] }],
      ["start", "خطوات البداية", "الخطوات المرقمة لبدء المشروع المنزلي.", { t: "list", add: "إضافة خطوة", preview: "#/guide#start", label: (x) => x.title, fields: [
        { k: "title", l: "العنوان" }, { k: "body", l: "الشرح", t: "area" }] }],
      ["brand", "العلامة والتسويق", "بطاقات نصائح بناء العلامة والتسويق.", { t: "list", add: "إضافة بطاقة", preview: "#/guide#brand", label: (x) => x.title, fields: [
        { k: "title", l: "العنوان" }, { k: "items", l: "النصائح", t: "lines" }] }],
    ] },
    { g: "الصفحات والتذييل", items: [
      ["about", "من نحن", "محتوى صفحة «عن حبكة».", { t: "obj", preview: "#/about", fields: [
        { k: "eyebrow", l: "السطر التمهيدي" }, { k: "title", l: "العنوان" }, { k: "lead", l: "الفقرة الافتتاحية", t: "area" },
        { k: "cards", l: "البطاقات", t: "list", add: "إضافة بطاقة", label: (x) => x.title, fields: [{ k: "title", l: "العنوان" }, { k: "body", l: "النص", t: "area", rows: 2 }] },
        { k: "body", l: "محتوى إضافي", t: "rich" }] }],
      ["terms", "الشروط والأحكام", "نص صفحة الشروط والأحكام.", { t: "obj", preview: "#/terms", fields: [
        { k: "title", l: "العنوان" }, { k: "updated", l: "تاريخ آخر تحديث", h: "بالصيغة الموحدة، مثال: 25 نوفمبر 2026" }, { k: "body", l: "النص", t: "rich", rows: 14 }] }],
      ["privacy", "سياسة الخصوصية", "نص صفحة سياسة الخصوصية.", { t: "obj", preview: "#/privacy", fields: [
        { k: "title", l: "العنوان" }, { k: "updated", l: "تاريخ آخر تحديث", h: "بالصيغة الموحدة، مثال: 25 نوفمبر 2026" }, { k: "body", l: "النص", t: "rich", rows: 14 }] }],
      ["footer", "التذييل وصفحة التواصل", "نبذة التذييل والمنطقة، ونص الترحيب في صفحة التواصل.", { t: "obj", preview: "#/contact", fields: [
        { k: "about", l: "نبذة التذييل", t: "area", rows: 2 }, { k: "region", l: "المنطقة في التذييل" }, { k: "contact_lead", l: "نص صفحة التواصل", t: "area", rows: 2 }] }],
    ] },
  ];

  function catForm(c, done) {
    c = c || { icon: "spark", hue: 30, active: true };
    const [bg, fg] = hueColors(c.hue ?? 30);
    modal(c.id ? "تعديل المجال" : "إضافة مجال جديد", `<form id="cfm"><div class="err"></div>
      <div class="field"><label>اسم المجال</label><input class="input" name="name" value="${esc(c.name || "")}" required maxlength="60"></div>
      <div class="field"><label>وصف مختصر</label><input class="input" name="blurb" value="${esc(c.blurb || "")}" maxlength="160" placeholder="مثال: أطباق بيتية، حلويات، مخبوزات"></div>
      <div class="row2"><div class="field"><label>الأيقونة</label><div class="ed-pick"><span class="ed-ic" id="cprev" style="background:${bg};color:${fg}">${ic(c.icon || "spark")}</span>${iconSelect(c.icon || "spark", 'name="icon"')}</div></div>
      <div class="field"><label>اللون</label><div class="ed-pick"><input type="range" class="ed-range" name="hue" min="0" max="359" value="${c.hue ?? 30}" aria-label="اللون"></div></div></div>
      <label class="ed-check" style="margin-bottom:16px"><input type="checkbox" name="active" ${c.active !== false ? "checked" : ""}><span>ظاهر للزوار</span></label>
      <button class="btn btn-primary btn-block">${c.id ? "حفظ التعديلات" : "إضافة المجال"}</button></form>`, (el, close) => {
      const f = $("#cfm", el), pv = $("#cprev", el);
      f.oninput = () => { const [b2, f2] = hueColors(+f.hue.value); pv.style.background = b2; pv.style.color = f2; pv.innerHTML = ic(f.icon.value); };
      f.onsubmit = async (e) => {
        e.preventDefault();
        const p = { id: c.id || null, name: f.name.value, blurb: f.blurb.value, icon: f.icon.value, hue: +f.hue.value, active: f.active.checked };
        try { await busy(e.submitter, () => api("habka_admin_save_category", { p_token: S.token, p })); close(); toast(c.id ? "حُفظ المجال" : "أُضيف المجال"); done(); }
        catch (err) { showErr(f, err.message); }
      };
    });
  }

  function shopEditForm(s, done) {
    modal(`تعديل متجر ${s.shop_name}`, `<form id="sem"><div class="err"></div>
      <div class="field"><label>اسم المتجر</label><input class="input" name="shop_name" value="${esc(s.shop_name)}" required maxlength="60"></div>
      <div class="row2"><div class="field"><label>المجال</label><select class="input" name="category_id">${S.cats.map((c) => `<option value="${c.id}" ${c.id === s.category_id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div>
      <div class="field"><label>المنطقة</label><select class="input" name="area">${AREAS.map((a) => `<option ${a === s.area ? "selected" : ""}>${a}</option>`).join("")}</select></div></div>
      <div class="field"><label>نبذة المتجر</label><textarea class="input" name="bio">${esc(s.bio || "")}</textarea></div>
      <div class="row2"><div class="field"><label>رقم واتساب</label><input class="input ltr num" name="whatsapp" value="${esc(s.whatsapp || "")}" inputmode="tel" placeholder="+974 XXXX XXXX"></div>
      <div class="field"><label>رقم الترخيص المنزلي</label><input class="input ltr" name="license_no" value="${esc(s.license_no || "")}"></div></div>
      <button class="btn btn-primary btn-block">حفظ التعديلات</button></form>`, (el, close) => {
      $("#sem", el).onsubmit = async (e) => {
        e.preventDefault(); const d = formData(e.target);
        if (d.whatsapp && !normPhone(d.whatsapp)) return showErr(e.target, "رقم واتساب غير صحيح، أدخله بصيغة +974 XXXX XXXX");
        try { await busy(e.submitter, () => api("habka_admin_save_shop", { p_token: S.token, p: { ...d, user_id: s.user_id } })); close(); toast("حُفظت بيانات المتجر"); done(); }
        catch (err) { showErr(e.target, err.message); }
      };
    });
  }

  /* ---------- لوحة الإدارة ---------- */
  routes["admin"] = async (q) => {
    if (needLogin(["admin"])) return;
    const tab = q.get("tab") || "overview", filter = q.get("f") || "";
    app.innerHTML = loader();
    S.cats = []; await loadCats();
    const [d, contacts] = await Promise.all([api("habka_admin", { p_token: S.token }), api("habka_admin_contacts", { p_token: S.token })]);
    const st = d.stats;
    const tabs = [["overview", "نظرة عامة"], ["content", "إدارة المحتوى"], ["cats", "المجالات"], ["shops", "المتاجر", st.pending_shops], ["products", "المنتجات", st.pending_products], ["orders", "الطلبات", st.open_orders], ["users", "المستخدمون"], ["contacts", "رسائل التواصل", contacts.filter((c) => !c.is_read).length]];
    app.innerHTML = `<div class="page"><div class="wrap"><div class="sec-head"><div><h1 style="font-size:clamp(24px,4vw,32px);margin:0">لوحة الإدارة</h1><p>إدارة منصة حبكة ومحتواها</p></div></div>
      <div class="dash"><nav class="card side">${tabs.map(([k, t, n]) => `<a href="#/admin?tab=${k}" class="${tab === k ? "on" : ""}">${t}${n ? `<span class="n num">${n}</span>` : ""}</a>`).join("")}</nav><div id="pane"></div></div></div></div>`;
    const pane = $("#pane"), reload = () => routes.admin(q);
    const fpills = (opts) => `<div class="pills" style="margin-bottom:14px">${opts.map(([v, t]) => `<a class="pill ${filter === v ? "on" : ""}" href="#/admin?tab=${tab}&f=${v}">${t}</a>`).join("")}</div>`;
    const note = async (title) => new Promise((res) => {
      modal(title, `<form id="nf"><div class="field"><label>سبب القرار (يظهر للمنتج)</label><textarea class="input" name="n" required></textarea></div><button class="btn btn-primary btn-block">تأكيد</button></form>`,
        (el, close) => { $("#nf", el).onsubmit = (e) => { e.preventDefault(); close(); res(e.target.n.value); }; $("[data-x]", el).addEventListener("click", () => res(null)); });
    });

    if (tab === "overview") {
      pane.innerHTML = `<div class="kpis"><div class="card kpi"><span>المستخدمون</span><b class="num">${st.users}</b></div><div class="card kpi"><span>المتاجر المعتمدة</span><b class="num">${st.shops}</b></div>
        <div class="card kpi"><span>إجمالي الطلبات</span><b class="num">${st.orders}</b></div><div class="card kpi"><span>قيمة المبيعات المسلّمة</span><b class="num">${fmtMoney(st.gmv)}</b></div></div>
        <div class="grid g-2"><a class="card kpi" href="#/admin?tab=shops&f=pending"><span>متاجر بانتظار المراجعة</span><b class="num">${st.pending_shops}</b></a><a class="card kpi" href="#/admin?tab=products&f=pending"><span>منتجات بانتظار المراجعة</span><b class="num">${st.pending_products}</b></a></div>
        <a class="card cms-cta" href="#/admin?tab=content"><span class="ed-ic">${ic("edit")}</span><div><b>إدارة محتوى الموقع</b><div class="small muted">عدّل نصوص الصفحة الرئيسية والأسئلة الشائعة والدليل والصفحات، وأضف واحذف ورتّب الأقسام والعناصر.</div></div></a>
        <div class="card" style="padding:20px;margin-top:16px"><h3>أحدث الطلبات</h3>${d.orders.slice(0, 6).map((o) => `<div style="display:flex;justify-content:space-between;gap:10px;padding:10px 0;border-bottom:1px solid var(--line);flex-wrap:wrap"><span><b class="tel">${o.code}</b> · ${esc(o.customer.name)} ← ${esc(o.shop.name)}</span><span>${stBadge(o.status)} <b class="num">${fmtMoney(o.total)}</b></span></div>`).join("") || `<p class="muted">لا توجد طلبات بعد</p>`}</div>`;
    }

    if (tab === "content") {
      const all = CMS.flatMap((g) => g.items), cur = all.find((x) => x[0] === q.get("s")) || all[0];
      pane.innerHTML = `<div class="sec-head" style="margin-bottom:12px"><div><h2 style="margin:0">إدارة المحتوى</h2><p>عدّل نصوص الموقع وأقسامه، وأضف العناصر واحذفها ورتّبها بالسحب أو بالأسهم، ثم اضغط «حفظ ونشر» لتظهر التعديلات للزوار فورًا.</p></div></div>
        <div class="cms-nav">${CMS.map((g) => `<div class="cms-g"><span>${g.g}</span><div class="pills">${g.items.map(([k, t]) => `<a class="pill ${k === cur[0] ? "on" : ""}" href="#/admin?tab=content&s=${k}">${t}</a>`).join("")}</div></div>`).join("")}</div>
        <div class="card ed" id="ed"><h3 style="margin:0">${cur[1]}</h3><p class="muted small" style="margin:4px 0 16px">${cur[2]}</p><div id="edbox"></div></div>`;
      mountEditor($("#edbox"), cur[0], cur[3]);
    }

    if (tab === "cats") {
      const cats = S.cats.slice(), cnt = (id) => d.products.filter((p) => p.category_id === id).length;
      pane.innerHTML = `<div class="sec-head" style="margin-bottom:14px"><div><h2 style="margin:0">المجالات</h2><p>أضف مجالات المنتجات وعدّلها ورتّبها بالسحب أو بالأسهم، وأخفِ أي مجال مؤقتًا دون حذفه.</p></div><button class="btn btn-primary" id="addc">${ic("plus")} إضافة مجال</button></div>
        <div class="ed-list" id="clist">${cats.map((c, i) => { const [bg, fg] = catColors(c.id); return `<div class="card ed-item cat-row" data-list="cats" data-i="${i}">
          <div class="ed-bar"><span class="ed-grip" draggable="true" title="اسحب لإعادة الترتيب">${ic("grip")}</span><span class="ed-ic" style="background:${bg};color:${fg}">${ic(c.icon)}</span>
          <div class="ed-t" style="white-space:normal"><b>${esc(c.name)}</b> ${c.active === false ? `<span class="st st-hidden">مخفي</span>` : ""}<div class="small muted">${esc(c.blurb || "")} · <span class="num">${cnt(c.id)}</span> منتج</div></div>
          <span class="ed-tools"><button type="button" class="icon-btn sm" data-cm="${i}" data-d="-1" aria-label="تحريك للأعلى" ${i === 0 ? "disabled" : ""}>${ic("up")}</button><button type="button" class="icon-btn sm" data-cm="${i}" data-d="1" aria-label="تحريك للأسفل" ${i === cats.length - 1 ? "disabled" : ""}>${ic("down")}</button>
          <button type="button" class="icon-btn sm" data-ce="${i}" aria-label="تعديل">${ic("edit")}</button><button type="button" class="icon-btn sm danger" data-cd="${i}" aria-label="حذف">${ic("trash")}</button></span></div></div>`; }).join("")}</div>`;
      const saveOrder = async (ids) => { try { await api("habka_admin_reorder", { p_token: S.token, p_kind: "categories", p_ids: ids }); toast("حُفظ ترتيب المجالات"); reload(); } catch (e) { toast(e.message, true); } };
      const ids = () => cats.map((c) => c.id);
      $("#addc").onclick = () => catForm(null, reload);
      $$("[data-ce]").forEach((b) => (b.onclick = () => catForm(cats[+b.dataset.ce], reload)));
      $$("[data-cm]").forEach((b) => (b.onclick = () => { const a = ids(); move(a, +b.dataset.cm, +b.dataset.cm + +b.dataset.d); saveOrder(a); }));
      dragSort($("#clist"), ".ed-item", (l, a, b) => { const x = ids(); move(x, a, b); saveOrder(x); });
      $$("[data-cd]").forEach((b) => (b.onclick = async () => {
        const c = cats[+b.dataset.cd], n = cnt(c.id), others = cats.filter((x) => x.id !== c.id);
        if (!others.length) return toast("لا يمكن حذف المجال الوحيد في المنصة", true);
        let moveTo = null;
        if (n > 0) {
          moveTo = await new Promise((res) => modal("حذف المجال", `<form id="dcf"><p>يحتوي مجال «${esc(c.name)}» على <b class="num">${n}</b> منتج. اختر المجال الذي تُنقل إليه المنتجات والمتاجر قبل الحذف:</p>
            <div class="field"><select class="input" name="to">${others.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</select></div>
            <div class="actions" style="justify-content:flex-end"><button type="button" class="btn btn-ghost" data-x>تراجع</button><button class="btn btn-danger">نقل المنتجات وحذف المجال</button></div></form>`,
            (el, close) => { $("#dcf", el).onsubmit = (e) => { e.preventDefault(); close(); res(e.target.to.value); }; $$("[data-x]", el).forEach((x) => x.addEventListener("click", () => res(null))); }));
          if (!moveTo) return;
        } else if (!(await confirmBox(`سيُحذف مجال «${c.name}» نهائيًا. هل أنت متأكد؟`, "حذف المجال"))) return;
        try { await api("habka_admin_delete_category", { p_token: S.token, p_id: c.id, p_move_to: moveTo }); toast("حُذف المجال"); reload(); } catch (e) { toast(e.message, true); }
      }));
    }

    if (tab === "shops") {
      const list = d.shops.filter((s) => !filter || s.status === filter);
      pane.innerHTML = `<h2>المتاجر</h2>${fpills([["", "الكل"], ["pending", "قيد المراجعة"], ["approved", "معتمدة"], ["rejected", "مرفوضة"], ["suspended", "موقوفة"]])}` + (list.length ? list.map((s) => `<div class="card ord">
        <div class="ord-h"><div style="display:flex;gap:12px;align-items:center"><div class="avatar" style="width:46px;height:46px;font-size:18px;background:hsl(${s.hue} 42% 42%)">${esc(s.shop_name.trim()[0])}</div>
        <div><b>${esc(s.shop_name)}</b> ${s.is_demo ? `<span class="chip">تجريبي</span>` : ""}<div class="small muted">${esc(catName(s.category_id))} · ${esc(s.area || "")} · سُجّل ${fmtDate(s.created_at)}</div></div></div>${stBadge(s.status)}</div>
        <p class="small">${esc(s.bio || "")}</p>
        <dl class="kv small"><dt>المالك</dt><dd>${esc(s.owner)}</dd><dt>البريد</dt><dd>${tel(s.email)}</dd><dt>الجوال</dt><dd class="num">${tel(s.phone)}</dd><dt>واتساب</dt><dd class="num">${tel(s.whatsapp || "—")}</dd><dt>الترخيص</dt><dd>${esc(s.license_no || "—")}</dd><dt>المنتجات</dt><dd class="num">${s.products}</dd></dl>
        <div class="actions" style="margin-top:12px">${s.status !== "approved" ? `<button class="btn btn-sm btn-ok" data-sh="${s.user_id}" data-s="approved">اعتماد</button>` : ""}
        ${s.status === "pending" ? `<button class="btn btn-sm btn-danger" data-sh="${s.user_id}" data-s="rejected">رفض</button>` : ""}
        ${s.status === "approved" ? `<button class="btn btn-sm btn-danger" data-sh="${s.user_id}" data-s="suspended">إيقاف</button><a class="btn btn-sm btn-ghost" href="#/shop/${s.user_id}">عرض المتجر</a>` : ""}
        <button class="btn btn-sm btn-ghost" data-se="${s.user_id}">${ic("edit")} تعديل البيانات</button><button class="btn btn-sm btn-ghost" data-sp="${s.user_id}">${ic("plus")} إضافة منتج للمتجر</button></div></div>`).join("") : empty("لا توجد متاجر بهذه الحالة"));
      $$("[data-sh]").forEach((b) => (b.onclick = async () => {
        let n = null; if (b.dataset.s !== "approved") { n = await note(b.dataset.s === "rejected" ? "رفض المتجر" : "إيقاف المتجر"); if (n === null) return; }
        try { await api("habka_admin_shop", { p_token: S.token, p_id: b.dataset.sh, p_status: b.dataset.s, p_note: n }); toast("حُدّثت حالة المتجر"); reload(); } catch (e) { toast(e.message, true); }
      }));
      $$("[data-se]").forEach((b) => (b.onclick = () => shopEditForm(d.shops.find((s) => s.user_id === b.dataset.se), reload)));
      $$("[data-sp]").forEach((b) => (b.onclick = () => { const s = d.shops.find((x) => x.user_id === b.dataset.sp); productForm({ shop_id: s.user_id, category_id: s.category_id, status: "approved", _shop: s.shop_name }, reload, true); }));
    }

    if (tab === "products") {
      const feat = filter === "featured";
      const list = feat ? d.products.filter((p) => p.featured).sort((a, b) => (a.sort || 0) - (b.sort || 0)) : d.products.filter((p) => !filter || p.status === filter);
      pane.innerHTML = `<h2>المنتجات</h2>${fpills([["", "الكل"], ["featured", "المميزة"], ["pending", "قيد المراجعة"], ["approved", "معتمدة"], ["rejected", "مرفوضة"], ["hidden", "مخفية"]])}
        ${feat ? `<div class="notice small">المنتجات المميزة تظهر أولًا في الصفحة الرئيسية وصفحة المنتجات بهذا الترتيب. رتّبها بالسحب أو بالأسهم.</div>` : ""}` + (list.length ? `<div class="card table-wrap"><table class="t" id="ptab"><thead><tr>${feat ? "<th></th>" : ""}<th></th><th>المنتج</th><th>المتجر</th><th>السعر</th><th>الحالة</th><th>إجراءات</th></tr></thead><tbody>
        ${list.map((p, i) => `<tr class="ed-item" data-list="feat" data-i="${i}">${feat ? `<td><div class="ed-tools" style="flex-direction:column"><span class="ed-grip" draggable="true">${ic("grip")}</span><button class="icon-btn sm" data-fm="${i}" data-d="-1" aria-label="تحريك للأعلى" ${i === 0 ? "disabled" : ""}>${ic("up")}</button><button class="icon-btn sm" data-fm="${i}" data-d="1" aria-label="تحريك للأسفل" ${i === list.length - 1 ? "disabled" : ""}>${ic("down")}</button></div></td>` : ""}
        <td><div class="t-ph">${pImg(p)}</div></td><td><b>${esc(p.name)}</b>${p.featured ? ` <span class="chip feat">${ic("star")} مميز</span>` : ""}<div class="small muted" style="max-width:280px">${esc(catName(p.category_id))} · ${esc((p.description || "").slice(0, 70))}</div></td><td>${esc(p.shop.name)}</td><td class="num">${fmtMoney(p.price)}</td><td>${stBadge(p.status)}</td>
        <td><div class="actions">${p.status !== "approved" ? `<button class="btn btn-sm btn-ok" data-pr="${p.id}" data-s="approved">اعتماد</button>` : ""}${p.status !== "rejected" ? `<button class="btn btn-sm btn-danger" data-pr="${p.id}" data-s="rejected">رفض</button>` : ""}${p.status === "approved" ? `<button class="btn btn-sm btn-ghost" data-pr="${p.id}" data-s="hidden">إخفاء</button>` : ""}
          <button class="btn btn-sm btn-ghost" data-pf="${p.id}" data-on="${p.featured ? "0" : "1"}">${ic("star")} ${p.featured ? "إلغاء التمييز" : "تمييز"}</button><button class="btn btn-sm btn-ghost" data-pe="${p.id}">${ic("edit")} تعديل</button><button class="btn btn-sm btn-danger" data-pd="${p.id}">${ic("trash")} حذف</button></div></td></tr>`).join("")}</tbody></table></div>` : empty(feat ? "لا توجد منتجات مميزة بعد. اضغط «تمييز» بجوار أي منتج لإبرازه." : "لا توجد منتجات بهذه الحالة"));
      $$("[data-pr]").forEach((b) => (b.onclick = async () => {
        let n = null; if (b.dataset.s === "rejected") { n = await note("رفض المنتج"); if (n === null) return; }
        try { await api("habka_admin_product", { p_token: S.token, p_id: b.dataset.pr, p_status: b.dataset.s, p_note: n }); toast("حُدّثت حالة المنتج"); reload(); } catch (e) { toast(e.message, true); }
      }));
      $$("[data-pf]").forEach((b) => (b.onclick = async () => { try { await busy(b, () => api("habka_admin_feature", { p_token: S.token, p_id: b.dataset.pf, p_on: b.dataset.on === "1" })); toast(b.dataset.on === "1" ? "أصبح المنتج مميزًا ويظهر أولًا" : "أُلغي تمييز المنتج"); reload(); } catch (e) { toast(e.message, true); } }));
      $$("[data-pe]").forEach((b) => (b.onclick = () => productForm(d.products.find((p) => p.id === b.dataset.pe), reload, true)));
      $$("[data-pd]").forEach((b) => (b.onclick = async () => {
        const p = d.products.find((x) => x.id === b.dataset.pd);
        if (!(await confirmBox(`سيُحذف المنتج «${p.name}» نهائيًا مع تقييماته، وتبقى الطلبات السابقة محفوظة. هل أنت متأكد؟`, "حذف المنتج"))) return;
        try { await api("habka_admin_delete_product", { p_token: S.token, p_id: p.id }); toast("حُذف المنتج"); reload(); } catch (e) { toast(e.message, true); }
      }));
      if (feat) {
        const saveOrder = async (ids) => { try { await api("habka_admin_reorder", { p_token: S.token, p_kind: "products", p_ids: ids }); toast("حُفظ ترتيب المنتجات المميزة"); reload(); } catch (e) { toast(e.message, true); } };
        const ids = () => list.map((p) => p.id);
        $$("[data-fm]").forEach((b) => (b.onclick = () => { const a = ids(); move(a, +b.dataset.fm, +b.dataset.fm + +b.dataset.d); saveOrder(a); }));
        if ($("#ptab")) dragSort($("#ptab tbody"), ".ed-item", (l, a, b) => { const x = ids(); move(x, a, b); saveOrder(x); });
      }
    }

    if (tab === "orders") {
      const list = d.orders.filter((o) => !filter || o.status === filter);
      pane.innerHTML = `<h2>الطلبات</h2>${fpills([["", "الكل"], ["new", "جديدة"], ["accepted", "مقبولة"], ["preparing", "قيد التجهيز"], ["ready", "جاهزة"], ["delivered", "مسلّمة"], ["cancelled", "ملغاة"]])}` + (list.length ? `<div class="card table-wrap"><table class="t"><thead><tr><th>الرقم</th><th>التاريخ</th><th>العميل</th><th>المتجر</th><th>الإجمالي</th><th>الحالة</th><th>تغيير الحالة</th></tr></thead><tbody>
        ${list.map((o) => `<tr><td class="num"><b>${o.code}</b></td><td class="small">${fmtDate(o.created_at, true)}</td><td>${esc(o.customer.name)}<div class="small muted num">${tel(o.phone)}</div></td><td>${esc(o.shop.name)}</td><td class="num">${fmtMoney(o.total)}</td><td>${stBadge(o.status)}</td>
        <td><select class="input" style="min-height:36px;padding:4px 10px" data-ord="${o.id}" aria-label="تغيير حالة الطلب">${Object.keys(STATUS).slice(0, 6).map((k) => `<option value="${k}" ${k === o.status ? "selected" : ""}>${STATUS[k]}</option>`).join("")}</select></td></tr>`).join("")}</tbody></table></div>` : empty("لا توجد طلبات"));
      $$("[data-ord]").forEach((s) => (s.onchange = async () => { try { await api("habka_admin_order", { p_token: S.token, p_id: s.dataset.ord, p_status: s.value }); toast("حُدّثت حالة الطلب"); reload(); } catch (e) { toast(e.message, true); } }));
    }

    if (tab === "users") {
      const list = d.users.filter((u) => !filter || u.role === filter);
      pane.innerHTML = `<h2>المستخدمون</h2>${fpills([["", "الكل"], ["customer", "العملاء"], ["producer", "المنتجون"], ["admin", "المديرون"]])}<div class="card table-wrap"><table class="t"><thead><tr><th>الاسم</th><th>النوع</th><th>البريد</th><th>الجوال</th><th>المنطقة</th><th>التسجيل</th><th>الحالة</th><th></th></tr></thead><tbody>
        ${list.map((u) => `<tr><td><b>${esc(u.full_name)}</b></td><td>${ROLE[u.role]}</td><td class="small"><span class="tel">${esc(u.email)}</span></td><td class="num">${tel(u.phone)}</td><td>${esc(u.city || "")}</td><td class="small">${fmtDate(u.created_at)}</td><td>${stBadge(u.status)}</td>
        <td>${u.role !== "admin" ? `<button class="btn btn-sm ${u.status === "active" ? "btn-danger" : "btn-ok"}" data-us="${u.id}" data-s="${u.status === "active" ? "suspended" : "active"}">${u.status === "active" ? "إيقاف" : "تفعيل"}</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
      $$("[data-us]").forEach((b) => (b.onclick = async () => {
        if (b.dataset.s === "suspended" && !(await confirmBox("سيُمنع هذا المستخدم من الدخول. هل تريد المتابعة؟", "إيقاف الحساب"))) return;
        try { await api("habka_admin_user", { p_token: S.token, p_id: b.dataset.us, p_status: b.dataset.s }); toast("حُدّثت حالة الحساب"); reload(); } catch (e) { toast(e.message, true); }
      }));
    }

    if (tab === "contacts") {
      pane.innerHTML = `<h2>رسائل التواصل</h2>` + (contacts.length ? contacts.map((c) => `<div class="card ord" style="${c.is_read ? "" : "border-color:var(--saffron)"}"><div class="ord-h"><div><b>${esc(c.name)}</b> · ${esc(c.topic || "عام")}<div class="small muted num">${tel(c.phone)}${c.email ? " · " + esc(c.email) : ""} · ${fmtDate(c.created_at, true)}</div></div>${c.is_read ? "" : `<span class="st st-new">جديد</span>`}</div>
        <p>${esc(c.body)}</p><div class="actions">${waLink(c.phone) ? `<a class="btn btn-sm btn-ok" target="_blank" rel="noopener" href="${waLink(c.phone, `مرحبًا ${c.name}، شكرًا لتواصلك مع منصة حبكة.`)}">${ic("wa")} الرد عبر واتساب</a>` : ""}${c.is_read ? "" : `<button class="btn btn-sm btn-ghost" data-cr="${c.id}">تحديد كمقروء</button>`}</div></div>`).join("") : empty("لا توجد رسائل"));
      $$("[data-cr]").forEach((b) => (b.onclick = async () => { await api("habka_admin_contacts", { p_token: S.token, p_mark: b.dataset.cr }); reload(); }));
    }
  };

  /* ---------- دليل المنتج ---------- */
  routes["guide"] = async () => {
    const G = C("guide"), ideas = C("ideas"), start = C("start"), brand = C("brand");
    app.innerHTML = `<div class="page"><div class="wrap">
      <div class="guide-hero"><span class="eyebrow">${ic("book")} ${esc(G.eyebrow)}</span><h1 style="font-size:clamp(26px,4.5vw,40px)">${esc(G.title)}</h1>
      <p class="lead" style="max-width:720px;color:var(--ink-2)">${esc(G.lead)}</p>
      <div class="toc">${ideas.length ? `<a class="pill" href="#/guide#ideas">${esc(G.ideas_title)}</a>` : ""}${start.length ? `<a class="pill" href="#/guide#start">${esc(G.start_title)}</a>` : ""}<a class="pill" href="#/guide#calc">${esc(G.calc_title)}</a>${brand.length ? `<a class="pill" href="#/guide#brand">${esc(G.brand_title)}</a>` : ""}</div></div>
      ${ideas.length ? `<section id="ideas"><h2>${esc(G.ideas_title)}</h2><div class="grid g-3" style="margin-top:16px">${ideas.map((x) => { const [bg, fg] = hueColors(x.hue ?? 30); return `<div class="card idea"><div class="ic-sq" style="background:${bg};color:${fg}">${ic(x.icon || "spark")}</div>
        <h3>${esc(x.title)}</h3><p class="muted small">${esc(x.desc)}</p>${(x.items || []).length ? `<ul class="small">${x.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : ""}${x.cost ? `<p class="small" style="margin:10px 0 0"><b>رأس مال تقريبي للبداية:</b> <span class="num">${esc(x.cost)}</span></p>` : ""}</div>`; }).join("")}</div></section>` : ""}
      ${start.length ? `<section id="start" class="block prose"><h2>${esc(G.start_title)}</h2><div class="grid g-2" style="margin-top:12px">
        ${start.map((x, i) => `<div class="card idea"><h3><span class="num">${i + 1}</span>. ${esc(x.title)}</h3><p class="muted">${esc(x.body)}</p></div>`).join("")}</div></section>` : ""}
      <section id="calc" class="block"><div class="grid g-2" style="align-items:start">
        <div><h2>${esc(G.calc_title)}</h2><p class="muted">${esc(G.calc_lead)}</p>
        ${G.calc_example ? `<div class="notice small">${esc(G.calc_example)}</div>` : ""}</div>
        <form class="card calc" id="cf">
          <div class="row2"><div class="field"><label>تكلفة المواد (ر.ق)</label><input class="input ltr num" name="m" type="number" value="12" min="0" step="0.5"></div>
          <div class="field"><label>التغليف (ر.ق)</label><input class="input ltr num" name="p" type="number" value="3" min="0" step="0.5"></div></div>
          <div class="row2"><div class="field"><label>وقت العمل (بالساعات)</label><input class="input ltr num" name="h" type="number" value="0.5" min="0" step="0.25"></div>
          <div class="field"><label>أجر الساعة (ر.ق)</label><input class="input ltr num" name="r" type="number" value="30" min="0"></div></div>
          <div class="row2"><div class="field"><label>مصاريف عامة %</label><input class="input ltr num" name="o" type="number" value="10" min="0"><span class="hint">كهرباء، غاز، توصيل</span></div>
          <div class="field"><label>هامش الربح %</label><input class="input ltr num" name="g" type="number" value="30" min="0"></div></div>
          <div class="out" id="co"></div></form>
      </div></section>
      <section id="brand" class="block prose">${brand.length ? `<h2>${esc(G.brand_title)}</h2><div class="grid g-3" style="margin-top:12px">
        ${brand.map((x) => `<div class="card idea"><h3>${esc(x.title)}</h3><ul class="small">${(x.items || []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul></div>`).join("")}</div>` : ""}
      <div class="band" style="margin-top:28px"><div><h2>${esc(G.cta_title)}</h2><p>${esc(G.cta_body)}</p></div><div class="actions" style="justify-content:flex-end"><a class="btn btn-gold" href="#/register?role=producer">افتح متجرك</a></div></div></section>
    </div></div>`;
    const f = $("#cf");
    const calc = () => {
      const v = Object.fromEntries([...new FormData(f)].map(([k, x]) => [k, parseFloat(x) || 0]));
      const base = v.m + v.p + v.h * v.r, cost = base * (1 + v.o / 100), price = cost * (1 + v.g / 100);
      const nice = Math.ceil(price / 5) * 5;
      $("#co").innerHTML = `<span>السعر المقترح للوحدة</span><b class="num">${fmtMoney(nice)}</b><span class="small" style="opacity:.8">التكلفة الكاملة <span class="num">${fmtMoney(cost.toFixed(2))}</span> · ربحك <span class="num">${fmtMoney((nice - cost).toFixed(2))}</span> لكل وحدة</span>`;
    };
    f.oninput = calc; calc();
    const hash = location.hash.split("#")[2]; if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  routes["about"] = async () => {
    const A = C("about");
    app.innerHTML = `<div class="page"><div class="wrap prose" style="max-width:860px">
      <span class="eyebrow">${ic("spark")} ${esc(A.eyebrow)}</span><h1 style="font-size:clamp(26px,4.5vw,40px)">${esc(A.title)}</h1>
      <p class="lead" style="font-size:18px">${esc(A.lead)}</p>
      ${(A.cards || []).length ? `<div class="grid g-3" style="margin:24px 0">${A.cards.map((c) => `<div class="card idea"><h3>${esc(c.title)}</h3><p class="muted small">${esc(c.body)}</p></div>`).join("")}</div>` : ""}
      ${rich(A.body)}
      <div class="actions" style="margin-top:20px"><a class="btn btn-primary" href="#/browse">تسوّق الآن</a><a class="btn btn-ghost" href="#/contact">تواصل معنا</a></div></div></div>`;
  };

  const faqItem = (x) => `<details class="faq-i"><summary><span>${esc(x.q)}</span>${ic("down")}</summary><div class="prose">${rich(x.a)}</div></details>`;
  routes["faq"] = async () => {
    const fq = C("faq");
    app.innerHTML = `<div class="page"><div class="wrap" style="max-width:860px"><div class="crumbs"><a href="#/">الرئيسية</a> / الأسئلة الشائعة</div>
      <span class="eyebrow">${ic("help")} مركز المساعدة</span><h1 style="font-size:clamp(26px,4.5vw,40px)">الأسئلة الشائعة</h1>
      <p class="muted">إجابات واضحة عن الطلب والدفع والتوصيل وفتح المتاجر على حبكة.</p>
      ${fq.length ? `<div class="faq">${fq.map(faqItem).join("")}</div>` : empty("لا توجد أسئلة منشورة حاليًا")}
      <div class="notice" style="margin-top:20px">لم تجد إجابتك؟ <a href="#/contact"><b>تواصل معنا</b></a> ويسعدنا خدمتك.</div></div></div>`;
  };

  routes["contact"] = async () => {
    app.innerHTML = `<div class="page"><div class="wrap auth" style="max-width:640px"><div class="card"><h1 style="font-size:28px">تواصل معنا</h1><p class="muted">${esc(C("footer").contact_lead)}</p>
      <form id="ctf"><div class="err"></div>
        <div class="row2"><div class="field"><label>الاسم</label><input class="input" name="name" required value="${esc(S.user?.full_name || "")}"></div>
        <div class="field"><label>رقم الجوال</label><input class="input ltr num" name="phone" required inputmode="tel" placeholder="+974 XXXX XXXX" value="${esc(S.user?.phone || "")}"></div></div>
        <div class="row2"><div class="field"><label>البريد الإلكتروني (اختياري)</label><input class="input ltr" type="email" name="email" value="${esc(S.user?.email || "")}"></div>
        <div class="field"><label>الموضوع</label><select class="input" name="topic"><option>استفسار عام</option><option>الانضمام كمنتج</option><option>مشكلة في طلب</option><option>اقتراح</option><option>شراكة</option></select></div></div>
        <div class="field"><label>الرسالة</label><textarea class="input" name="body" required></textarea></div>
        <button class="btn btn-primary btn-block">إرسال الرسالة</button></form></div></div></div>`;
    $("#ctf").onsubmit = async (e) => {
      e.preventDefault(); const d = formData(e.target);
      if (!normPhone(d.phone)) return showErr(e.target, "رقم الجوال غير صحيح، أدخله بصيغة +974 XXXX XXXX");
      try { await busy(e.submitter, () => api("habka_contact", { p: d })); e.target.reset(); toast("وصلتنا رسالتك، شكرًا لتواصلك"); $(".err", e.target).classList.remove("show"); }
      catch (err) { showErr(e.target, err.message); }
    };
  };

  const legal = (k) => async () => {
    const L = C(k);
    app.innerHTML = `<div class="page"><div class="wrap prose" style="max-width:860px"><h1 style="font-size:32px">${esc(L.title)}</h1>${L.updated ? `<p class="muted">آخر تحديث: ${esc(L.updated)}</p>` : ""}${rich(L.body)}</div></div>`;
  };
  routes["terms"] = legal("terms");
  routes["privacy"] = legal("privacy");

  /* ---------- الموجّه ---------- */
  async function router() {
    const raw = location.hash.slice(2) || "";
    const [pathPart, qs] = raw.split("?");
    const [name, id] = pathPart.split("#")[0].split("/");
    const q = new URLSearchParams((qs || "").split("#")[0]);
    const fn = routes[name] || routes[""];
    renderChrome();
    if (!(name === "guide" && location.hash.split("#")[2])) window.scrollTo(0, 0);
    try { if (fn !== routes[""]) { await loadCats(); renderSite(); } await fn(q, id); }
    catch (e) { app.innerHTML = `<div class="page"><div class="wrap">${empty(esc(e.message), '<button class="btn btn-ghost" onclick="location.reload()">إعادة المحاولة</button>')}</div></div>`; }
    const TITLES = { browse: "المنتجات", shops: "المتاجر", cart: "السلة", login: "تسجيل الدخول", register: "إنشاء حساب", account: "حسابي", seller: "لوحة المتجر", admin: "لوحة الإدارة", guide: "دليل المنتج المنزلي", about: "عن حبكة", contact: "تواصل معنا", terms: "الشروط والأحكام", privacy: "سياسة الخصوصية", faq: "الأسئلة الشائعة" };
    document.title = name && TITLES[name] ? `${TITLES[name]} | حبكة` : "حبكة | منصة الصناعات المنزلية في قطر";
  }
  window.addEventListener("hashchange", router);
  $("#yr").textContent = new Date().getFullYear();
  if (S.token) api("habka_me", { p_token: S.token }).then((u) => { S.user = u; store.set("user", u); renderChrome(); }).catch(() => {});
  router();
})();
