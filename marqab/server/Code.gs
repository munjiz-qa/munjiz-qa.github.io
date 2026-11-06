/* بيانات التشغيل الأولي لمَرقَب: قيم استرشادية لعرض قدرات المنصة، تُستبدل بالبيانات الرسمية من الإدارات أو تُمسح من صفحة الإدارة */
var MQ_META = {
  sectors: ["مكتب الوزير والوحدات التابعة", "قطاع شؤون المستهلك", "قطاع شؤون التجارة", "قطاع شؤون الصناعة", "قطاع الخدمات المشتركة", "عام"],
  pestel: { P: "سياسي", E: "اقتصادي", S: "اجتماعي", T: "تقني", En: "بيئي", L: "تشريعي", M: "السوق" },
  classes: { 1: "عام", 2: "داخلي", 3: "مقيّد", 4: "سري" },
  levels: { 1: "القيادة العليا", 2: "القيادات التنفيذية", 3: "مدراء الإدارات", 4: "المحللون والخبراء", 5: "جامعو البيانات" },
  /* سلّم أدميرالتي لتقييم المعلومة: موثوقية المصدر (أ-و) ومصداقية المعلومة (1-6) */
  rel: { A: "موثوق تماماً", B: "موثوق غالباً", C: "موثوق إلى حد ما", D: "غير موثوق عادة", E: "غير موثوق", F: "لا يمكن الحكم" },
  cred: { 1: "مؤكدة من مصادر أخرى", 2: "مرجّحة", 3: "محتملة", 4: "مشكوك فيها", 5: "غير مرجّحة", 6: "لا يمكن الحكم" },
  status: { new: "واردة", review: "قيد التحقق", verified: "موثّقة", rejected: "مستبعدة", archived: "مؤرشفة" }
};

var MQ_SEED = (function () {
  var M = ["2026-01", "2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];
  function S(vals) { return vals.map(function (v, i) { return v == null ? null : { d: M[i], v: v }; }).filter(Boolean); }
  var indicators = [
    { id: "ext-food-cpi", name: "تضخم أسعار الغذاء (سنوي)", unit: "%", domain: "ext", pestel: "E", sector: "قطاع شؤون المستهلك", topic: "t-food", freq: 1, dir: "up", th: [4, 8, 12], src: "المجلس الوطني للتخطيط", series: S([1.2, 1.4, 3.8, 7.9, 10.6, 12.7, 12.1, 11.6, 11.2]) },
    { id: "ext-brent", name: "سعر خام برنت", unit: "دولار/برميل", domain: "ext", pestel: "E", sector: "عام", topic: "t-energy", freq: 1, dir: "up", th: [90, 105, 120], src: "بيانات الأسواق الدولية", series: S([74, 76, 98, 112, 118, 109, 104, 101, 97, 99]) },
    { id: "ext-freight", name: "علاوة الشحن والتأمين البحري", unit: "%", domain: "ext", pestel: "M", sector: "قطاع شؤون التجارة", topic: "t-supply", freq: 1, dir: "up", th: [20, 50, 80], src: "تقارير شركات الشحن", series: S([0, 0, 45, 80, 95, 90, 85, 82, 78, 80]) },
    { id: "ext-hormuz", name: "حركة العبور في مضيق هرمز", unit: "% من المعتاد", domain: "ext", pestel: "P", sector: "عام", topic: "t-supply", freq: 1, dir: "down", th: [80, 50, 25], src: "بيانات الملاحة البحرية", series: S([100, 100, 35, 12, 10, 8, 8, 9, 9, 10]) },
    { id: "ext-veg", name: "متوسط سعر الخضار المحلية بالجملة", unit: "ريال/كغ", domain: "ext", pestel: "M", sector: "قطاع شؤون المستهلك", topic: "t-food", freq: 1, dir: "up", th: [3.8, 4.4, 5], src: "بيانات الأسواق المركزية", series: S([3.1, 3.0, 3.9, 4.6, 4.9, 4.7, 4.4, 4.2, 4.1, 4.3]) },
    { id: "int-stock", name: "تغطية المخزون الاستراتيجي للسلع الأساسية", unit: "شهر", domain: "int", pestel: "E", sector: "قطاع شؤون المستهلك", topic: "t-food", freq: 1, dir: "down", th: [5, 4, 3], target: 8, src: "إدارة التموين والمخزون الاستراتيجي", series: S([6.0, 6.0, 5.1, 4.6, 4.9, 5.6, 6.3, 7.0, 7.8, 8.4]) },
    { id: "int-complaints", name: "شكاوى المستهلكين الشهرية", unit: "شكوى", domain: "int", pestel: "S", sector: "قطاع شؤون المستهلك", topic: "t-consumer", freq: 1, dir: "up", th: [2500, 3200, 4000], src: "إدارة حماية المستهلك", series: S([1850, 1790, 3420, 4100, 3650, 3100, 2800, 2650, 2500, 2720]) },
    { id: "int-violations", name: "مخالفات الأسعار المضبوطة", unit: "مخالفة", domain: "int", pestel: "L", sector: "قطاع شؤون المستهلك", topic: "t-consumer", freq: 1, dir: "up", th: [400, 550, 700], src: "إدارة حماية المستهلك", series: S([210, 195, 640, 720, 610, 520, 450, 410, 380, 430]) },
    { id: "int-licenses", name: "السجلات التجارية الجديدة", unit: "سجل", domain: "int", pestel: "E", sector: "قطاع شؤون التجارة", topic: "t-business", freq: 1, dir: "down", th: [2000, 1700, 1400], target: 2300, src: "إدارة السجل التجاري", series: S([2400, 2350, 1600, 1350, 1500, 1700, 1850, 1950]) },
    { id: "int-sla", name: "إنجاز المعاملات ضمن الزمن المستهدف", unit: "%", domain: "int", pestel: "T", sector: "قطاع الخدمات المشتركة", topic: "t-business", freq: 1, dir: "down", th: [90, 85, 80], target: 95, src: "إدارة الخدمات الإلكترونية", series: S([94, 95, 88, 84, 86, 89, 91, 92, 92, 89]) },
    { id: "int-inspections", name: "الزيارات التفتيشية المنفذة", unit: "زيارة", domain: "int", pestel: "L", sector: "قطاع شؤون المستهلك", topic: "t-consumer", freq: 1, dir: "none", th: null, src: "إدارة حماية المستهلك", series: S([3100, 3050, 4800, 5200, 5000, 4700, 4500, 4400, 4300, 4350]) },
    { id: "int-delay", name: "متوسط تأخر توريد السلع الغذائية", unit: "يوم", domain: "int", pestel: "M", sector: "قطاع شؤون التجارة", topic: "t-supply", freq: 1, dir: "up", th: [4, 8, 12], src: "إدارة التموين والمخزون الاستراتيجي", series: S([2, 2, 9, 14, 12, 10, 8, 7, 6, 8.5]) },
    { id: "int-factories", name: "المصانع العاملة بكامل طاقتها", unit: "%", domain: "int", pestel: "E", sector: "قطاع شؤون الصناعة", topic: "t-energy", freq: 1, dir: "down", th: [80, 70, 60], target: 85, src: "إدارة التراخيص الصناعية", series: S([86, 86, 71, 63, 66, 70, 73, 75, 77, 78]) }
  ];
  /* شبكة الترابط السببي: w مرونة الأثر (تغير % في الهدف لكل 1% في المصدر)، c الثقة في العلاقة */
  var links = [
    { from: "ext-hormuz", to: "ext-freight", w: -0.9, c: 0.8, note: "تراجع العبور يرفع علاوة الشحن والتأمين" },
    { from: "ext-brent", to: "ext-freight", w: 0.35, c: 0.7, note: "ارتفاع الوقود يرفع كلفة النقل" },
    { from: "ext-freight", to: "ext-food-cpi", w: 0.12, c: 0.7, note: "كلفة الشحن تنتقل إلى أسعار الغذاء المستورد" },
    { from: "ext-freight", to: "int-delay", w: 0.25, c: 0.6, note: "اضطراب الشحن يطيل التوريد" },
    { from: "int-delay", to: "int-stock", w: -0.3, c: 0.6, note: "تأخر التوريد يستنزف المخزون" },
    { from: "int-stock", to: "ext-food-cpi", w: -0.25, c: 0.5, note: "المخزون الكافي يخفف ضغط الأسعار" },
    { from: "ext-food-cpi", to: "int-complaints", w: 0.6, c: 0.7, note: "ارتفاع الأسعار يزيد الشكاوى" },
    { from: "ext-veg", to: "int-complaints", w: 0.3, c: 0.5, note: "أسعار الخضار تظهر سريعاً في الشكاوى" },
    { from: "int-complaints", to: "int-violations", w: 0.7, c: 0.6, note: "الشكاوى تقود إلى ضبط المخالفات" },
    { from: "int-complaints", to: "int-inspections", w: 0.4, c: 0.6, note: "الشكاوى توجه الحملات التفتيشية" },
    { from: "ext-food-cpi", to: "int-licenses", w: -0.2, c: 0.4, note: "الضغط على الأسعار يبطئ تأسيس الأعمال" },
    { from: "ext-brent", to: "int-factories", w: -0.15, c: 0.5, note: "كلفة الطاقة والمدخلات تخفض التشغيل" },
    { from: "ext-hormuz", to: "int-factories", w: 0.25, c: 0.6, note: "تعطل الممرات يقيد المدخلات الصناعية" },
    { from: "int-sla", to: "int-licenses", w: 0.5, c: 0.5, note: "سرعة الإجراءات تشجع التسجيل" }
  ];
  var topics = [
    { id: "t-food", name: "الأمن الغذائي", owner: "قطاع شؤون المستهلك", desc: "توافر السلع الأساسية ومخزونها وأسعارها ومصادر استيرادها البديلة." },
    { id: "t-supply", name: "سلاسل الإمداد والشحن", owner: "قطاع شؤون التجارة", desc: "الممرات البحرية والبرية وكلفة الشحن والتأمين وزمن التوريد." },
    { id: "t-consumer", name: "حماية المستهلك والأسعار", owner: "قطاع شؤون المستهلك", desc: "الشكاوى والمخالفات والرقابة على الأسعار في الأسواق." },
    { id: "t-business", name: "بيئة الأعمال والخدمات", owner: "قطاع شؤون التجارة", desc: "السجلات التجارية وزمن إنجاز المعاملات وجاذبية الاستثمار." },
    { id: "t-energy", name: "الطاقة والصناعة", owner: "قطاع شؤون الصناعة", desc: "كلفة الطاقة والمدخلات وتشغيل المصانع والتوسع في الإنتاج المحلي." },
    { id: "t-legal", name: "التشريعات والتنظيم", owner: "مكتب الوزير والوحدات التابعة", desc: "القوانين والقرارات والتعاميم الجديدة وأثرها على أعمال الوزارة." }
  ];
  function C(o) { o.cls = o.cls || 2; o.status = o.status || "verified"; o.links = o.links || []; o.conflicts = o.conflicts || []; o.by = o.by || "u1"; return o; }
  var cards = [
    C({ id: "c1", title: "استمرار تعطل الملاحة في مضيق هرمز عند نحو 10% من المعتاد", date: "2026-10-20", source: "بيانات الملاحة البحرية", srcType: "ext", rel: "A", cred: 2, pestel: "P", sector: "عام", topic: "t-supply", region: "الخليج العربي", impact: 3, dir: -1, analysis: "لا مؤشرات على إعادة الفتح قبل الربع الأول من 2027 وفق التقديرات الدولية، ما يبقي الاعتماد على الممرات البديلة.", action: "متابعة أسبوعية لمسارات الاستيراد البديلة.", owner: "قطاع شؤون التجارة", links: ["c2", "c9"] }),
    C({ id: "c2", title: "ارتفاع علاوة الشحن والتأمين على الواردات إلى 80% فوق مستوياتها قبل الأزمة", date: "2026-10-12", source: "تقارير شركات الشحن", srcType: "ext", rel: "B", cred: 2, pestel: "M", sector: "قطاع شؤون التجارة", topic: "t-supply", impact: 3, dir: -1, analysis: "الكلفة تنتقل إلى أسعار المستهلك خلال شهرين إلى ثلاثة أشهر.", owner: "قطاع شؤون التجارة", links: ["c1"] }),
    C({ id: "c3", title: "تغطية المخزون الاستراتيجي للسلع الأساسية تبلغ 8.4 أشهر", date: "2026-10-15", source: "إدارة التموين والمخزون الاستراتيجي", srcType: "int", rel: "A", cred: 1, pestel: "E", sector: "قطاع شؤون المستهلك", topic: "t-food", impact: 2, dir: 1, analysis: "تجاوزت التغطية المستهدف (8 أشهر)، ما يمنح هامشاً لامتصاص صدمات التوريد قصيرة المدى.", owner: "قطاع شؤون المستهلك", links: ["c4"] }),
    C({ id: "c4", title: "نقص متقطع في الأرز البسمتي ببعض منافذ البيع في الوكرة والخور", date: "2026-10-18", source: "تقرير ميداني - مفتشو حماية المستهلك", srcType: "int", rel: "B", cred: 3, pestel: "M", sector: "قطاع شؤون المستهلك", topic: "t-food", region: "الوكرة، الخور", impact: 2, dir: -1, status: "review", analysis: "يتعارض ظاهرياً مع كفاية المخزون الإجمالي؛ يرجّح أن السبب في التوزيع لا في التوافر.", action: "التحقق من سلاسل التوزيع لدى الموردين الرئيسيين.", owner: "إدارة حماية المستهلك", conflicts: ["c3"], links: ["c5", "c6"] }),
    C({ id: "c5", title: "مورّد رئيسي يبلغ عن تأخر شحنات أرز من الهند 10 أيام إضافية", date: "2026-10-16", source: "بلاغ موظف - إدارة التموين", srcType: "staff", rel: "C", cred: 3, pestel: "M", sector: "قطاع شؤون التجارة", topic: "t-food", impact: 2, dir: -1, status: "review", owner: "إدارة التموين والمخزون الاستراتيجي" }),
    C({ id: "c6", title: "ارتفاع أسعار الأرز في السوق الهندية 6% خلال أسبوعين", date: "2026-10-21", source: "نشرات أسواق السلع", srcType: "ext", rel: "C", cred: 3, pestel: "M", sector: "قطاع شؤون المستهلك", topic: "t-food", region: "الهند", impact: 2, dir: -1, status: "new", owner: "قطاع شؤون المستهلك" }),
    C({ id: "c7", title: "ارتفاع شكاوى الأسعار في أكتوبر بعد أربعة أشهر من التراجع", date: "2026-10-22", source: "إدارة حماية المستهلك", srcType: "int", rel: "A", cred: 1, pestel: "S", sector: "قطاع شؤون المستهلك", topic: "t-consumer", impact: 2, dir: -1, analysis: "الزيادة تتركز في الخضار والأرز، وتتزامن مع إشارات التوريد.", owner: "إدارة حماية المستهلك", links: ["c4", "c6"] }),
    C({ id: "c8", title: "تراجع تضخم الغذاء إلى 11.2% في سبتمبر من ذروة 12.7% في يونيو", date: "2026-10-05", source: "المجلس الوطني للتخطيط", srcType: "ext", rel: "A", cred: 1, pestel: "E", sector: "قطاع شؤون المستهلك", topic: "t-food", impact: 2, dir: 1, cls: 1, owner: "قطاع شؤون المستهلك" }),
    C({ id: "c9", title: "تشغيل ممر بري بديل للواردات عبر موانئ البحر الأحمر وسلطنة عُمان", date: "2026-09-28", source: "وكالة الأنباء القطرية", srcType: "ext", rel: "A", cred: 2, pestel: "P", sector: "قطاع شؤون التجارة", topic: "t-supply", impact: 3, dir: 1, cls: 1, analysis: "فرصة لتنويع مسارات الاستيراد وخفض زمن التوريد للسلع الغذائية.", owner: "قطاع شؤون التجارة" }),
    C({ id: "c10", title: "توسع المزارع المحلية في الإنتاج المحمي بنسبة 18% منذ مارس", date: "2026-09-15", source: "تقارير القطاع الزراعي", srcType: "ext", rel: "B", cred: 2, pestel: "E", sector: "قطاع شؤون الصناعة", topic: "t-food", impact: 2, dir: 1, analysis: "فرصة لتعزيز الاكتفاء في الخضار وخفض حساسية الأسعار للشحن.", owner: "قطاع شؤون الصناعة" }),
    C({ id: "c11", title: "مشروع تعديل لائحة حماية المستهلك لتشديد عقوبات رفع الأسعار وقت الأزمات", date: "2026-10-08", source: "إدارة الشؤون القانونية", srcType: "int", rel: "A", cred: 2, pestel: "L", sector: "مكتب الوزير والوحدات التابعة", topic: "t-legal", impact: 2, dir: 0, cls: 3, status: "review", owner: "إدارة الشؤون القانونية" }),
    C({ id: "c12", title: "تراجع نسبة إنجاز المعاملات ضمن الزمن المستهدف إلى 89% في أكتوبر", date: "2026-10-23", source: "إدارة الخدمات الإلكترونية", srcType: "int", rel: "A", cred: 1, pestel: "T", sector: "قطاع الخدمات المشتركة", topic: "t-business", impact: 1, dir: -1, analysis: "ضغط في طلبات تراخيص الاستيراد البديلة على الأنظمة.", owner: "قطاع الخدمات المشتركة" }),
    C({ id: "c13", title: "منصات تواصل تتداول أنباء عن نقص حليب الأطفال", date: "2026-10-23", source: "رصد وسائل التواصل", srcType: "social", rel: "E", cred: 5, pestel: "S", sector: "قطاع شؤون المستهلك", topic: "t-food", impact: 3, dir: -1, status: "new", analysis: "لم تؤكدها أي جهة رسمية حتى الآن؛ تحتاج تحققاً سريعاً لتفادي الشراء بدافع الهلع.", owner: "إدارة حماية المستهلك" }),
    C({ id: "c14", title: "عودة 78% من المصانع إلى العمل بكامل طاقتها", date: "2026-10-10", source: "إدارة التراخيص الصناعية", srcType: "int", rel: "A", cred: 1, pestel: "E", sector: "قطاع شؤون الصناعة", topic: "t-energy", impact: 2, dir: 1, owner: "قطاع شؤون الصناعة" }),
    C({ id: "c15", title: "صندوق النقد يتوقع انكماش الاقتصاد القطري 15.6% في 2026 ونموه 18.8% في 2027", date: "2026-10-14", source: "صندوق النقد الدولي", srcType: "ext", rel: "A", cred: 2, pestel: "E", sector: "عام", topic: "t-business", impact: 3, dir: -1, cls: 1, analysis: "التعافي مشروط بإعادة فتح المضيق اعتباراً من مارس 2027.", owner: "مكتب الوزير والوحدات التابعة" })
  ];
  var decisions = [
    { id: "d1", title: "رفع المخزون الاستراتيجي للسلع الأساسية إلى ثمانية أشهر تغطية", date: "2026-04-15", basis: ["c3"], owner: "قطاع شؤون المستهلك", status: "منفذ", cls: 2, scenario: "استمرار إغلاق المضيق حتى نهاية 2026", expect: { ind: "int-stock", change: 74, by: "2026-10-01", base: "2026-04" }, notes: "التمويل من مخصص الطوارئ." },
    { id: "d2", title: "تكثيف الحملات التفتيشية على الأسعار في الأسواق الرئيسية", date: "2026-04-20", basis: ["c7"], owner: "إدارة حماية المستهلك", status: "منفذ", cls: 2, expect: { ind: "int-complaints", change: -25, by: "2026-07-31", base: "2026-04" } },
    { id: "d3", title: "تثبيت أسعار 400 سلعة أساسية لمدة ستة أشهر", date: "2026-05-01", basis: ["c8"], owner: "قطاع شؤون المستهلك", status: "منفذ", cls: 2, expect: { ind: "ext-food-cpi", change: -20, by: "2026-09-30", base: "2026-05" } },
    { id: "d4", title: "تبسيط إجراءات تراخيص الاستيراد عبر الممرات البديلة", date: "2026-10-01", basis: ["c9", "c12"], owner: "قطاع شؤون التجارة", status: "قيد التنفيذ", cls: 2, expect: { ind: "int-sla", change: 5, by: "2026-12-31", base: "2026-09" } }
  ];
  var docs = [
    { id: "k1", title: "خطة الاستجابة لاضطراب سلاسل الإمداد (ملخص تنفيذي)", date: "2026-03-10", owner: "قطاع شؤون التجارة", cls: 3, topic: "t-supply", text: "تحدد الخطة ثلاث مراحل للاستجابة. المرحلة الأولى خلال أسبوعين: حصر المخزون لدى كبار الموردين وتفعيل الممرات البرية البديلة عبر المملكة العربية السعودية وسلطنة عُمان. المرحلة الثانية خلال ثلاثة أشهر: رفع تغطية المخزون الاستراتيجي إلى ثمانية أشهر للسلع الأساسية وتنويع مصادر الاستيراد من الهند وتركيا وشرق أفريقيا. المرحلة الثالثة: دعم الإنتاج المحلي المحمي وتحفيز المصانع الغذائية. مؤشرات المتابعة: زمن التوريد، وتغطية المخزون، وعلاوة الشحن، وشكاوى المستهلكين. يرفع التقرير أسبوعياً إلى لجنة الأمن الغذائي." },
    { id: "k2", title: "دليل إجراءات الرقابة على الأسعار وقت الأزمات", date: "2026-03-22", owner: "إدارة حماية المستهلك", cls: 2, topic: "t-consumer", text: "يحدد الدليل آلية التعامل مع ارتفاع الأسعار غير المبرر. تُرصد الأسعار يومياً في 120 منفذاً رئيسياً، وتعتبر الزيادة التي تتجاوز 10% خلال أسبوع دون مبرر في كلفة الاستيراد إشارة تستدعي التفتيش. تُوجّه الحملات وفق خريطة الشكاوى، وتُحال المخالفات المتكررة إلى الشؤون القانونية. يُنشر للمستهلكين بيان طمأنة عند تداول أنباء عن نقص سلعة بعد التحقق من المخزون خلال 24 ساعة." },
    { id: "k3", title: "محضر اجتماع لجنة الأمن الغذائي - سبتمبر 2026", date: "2026-09-24", owner: "مكتب الوزير والوحدات التابعة", cls: 3, topic: "t-food", text: "ناقشت اللجنة تجاوز المخزون الاستراتيجي سبعة أشهر تغطية، واستمرار ارتفاع علاوة الشحن. أوصت اللجنة بمتابعة واردات الأرز من الهند لتركزها لدى عدد محدود من الموردين، وبدراسة عقود توريد طويلة الأجل مع مصادر بديلة. كما أوصت بقياس أثر تثبيت أسعار السلع الأساسية على التضخم قبل تمديده، وبإعداد سيناريو لاستمرار الإغلاق حتى منتصف 2027." }
  ];
  var sources = [
    { id: "s1", name: "المجلس الوطني للتخطيط", type: "ext", rel: "A", review: "2026-10-05" },
    { id: "s2", name: "وكالة الأنباء القطرية", type: "ext", rel: "A", review: "2026-10-20" },
    { id: "s3", name: "صندوق النقد الدولي", type: "ext", rel: "A", review: "2026-10-14" },
    { id: "s4", name: "تقارير شركات الشحن", type: "ext", rel: "B", review: "2026-10-12" },
    { id: "s5", name: "التقارير الميدانية للمفتشين", type: "int", rel: "B", review: "2026-10-18" },
    { id: "s6", name: "بلاغات الموظفين", type: "staff", rel: "C", review: "2026-10-16" },
    { id: "s7", name: "رصد وسائل التواصل", type: "social", rel: "E", review: "2026-08-30" },
    { id: "s8", name: "إدارة السجل التجاري", type: "int", rel: "A", review: "2026-08-31" }
  ];
  links.forEach(function (l, i) { l.id = "l" + (i + 1); });
  return { indicators: indicators, links: links, topics: topics, cards: cards, decisions: decisions, docs: docs, sources: sources };
})();

/* محرك التحليل في مَرقَب: دوال خالصة بلا واجهة، تعمل في المتصفح وفي خادم البيانات بالنتائج نفسها */
var MQE = (function () {
  "use strict";
  var MONTHS = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  var LV = ["طبيعي", "يحتاج متابعة", "يحتاج تدخلاً إدارياً", "يحتاج اهتماماً قيادياً عاجلاً"];
  var LVC = ["أخضر", "أصفر", "برتقالي", "أحمر"];

  /* ---------- أدوات عامة ---------- */
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function r1(x) { return Math.round(x * 10) / 10; }
  function fmtN(v, d) { if (v == null || isNaN(v)) return "—"; var a = Math.abs(v), dd = d != null ? d : (a >= 100 ? 0 : a >= 10 ? 1 : 2); var s = (+v).toFixed(dd).replace(/\.0+$|(\.\d*?)0+$/, "$1"); return s.replace(/\B(?=(\d{3})+(?!\d))/g, ","); }
  function pct(v) { return (v > 0 ? "+" : "") + fmtN(v, 1) + "%"; }
  function mLabel(m) { var p = String(m).split("-"); return MONTHS[+p[1] - 1] + " " + p[0]; }
  function dLabel(d) { if (!d) return "—"; var p = String(d).slice(0, 10).split("-"); if (p.length < 3) return mLabel(d); return (+p[2]) + " " + MONTHS[+p[1] - 1] + " " + p[0]; }
  function days(a, b) { return Math.round((new Date(String(b).slice(0, 10)) - new Date(String(a).slice(0, 10))) / 864e5); }
  function monthsBetween(m1, m2) { var a = String(m1).split("-"), b = String(m2).split("-"); return (+b[0] - +a[0]) * 12 + (+b[1] - +a[1]); }
  function addMonth(m, n) { var p = String(m).split("-"), t = +p[0] * 12 + (+p[1] - 1) + n; return Math.floor(t / 12) + "-" + ("0" + (t % 12 + 1)).slice(-2); }
  function dayWord(n) { return n === 1 ? "يوم واحد" : n === 2 ? "يومين" : n >= 3 && n <= 10 ? n + " أيام" : n + " يوماً"; }
  function byId(list, id) { for (var i = 0; i < (list || []).length; i++) if (list[i].id === id) return list[i]; return null; }
  function topicName(db, id) { var t = byId(db.topics, id); return t ? t.name : "عام"; }

  /* ---------- اللغة: تطبيع النص العربي والبحث ---------- */
  var STOP = {};
  ("في من على إلى الى عن مع هذا هذه ذلك تلك التي الذي الذين ما ماذا هل كيف لماذا متى أين اين او أو ثم قد كان كانت يكون تكون هو هي هم نحن انا أنا لا لم لن إن ان أن كل بعض أي اي بين حتى عند خلال بعد قبل منذ وفق حسب أهم اهم عن الى عليه عليها لدى ضمن غير يجب يمكن").split(" ").forEach(function (w) { STOP[norm(w)] = 1; });
  function norm(s) {
    return String(s || "").toLowerCase()
      .replace(/[ً-ْـٰ]/g, "")
      .replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/ؤ/g, "و").replace(/ئ/g, "ي")
      .replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); });
  }
  function stem(w) {
    if (w.length > 5) w = w.replace(/^(وال|بال|كال|فال|لل)/, "");
    if (w.length > 4) w = w.replace(/^ال/, "");
    if (w.length > 5) w = w.replace(/(ات|ون|ين|ها|هم|يه|ية)$/, "");
    if (w.length > 4) w = w.replace(/[هي]$/, "");
    return w;
  }
  function toks(s) { return norm(s).split(/[^a-z0-9ء-ي]+/).filter(function (w) { return w.length > 1 && !STOP[w]; }).map(stem); }
  function has(text, words) { var t = norm(text); for (var i = 0; i < words.length; i++) if (t.indexOf(norm(words[i])) >= 0) return true; return false; }

  /* فهرس البحث: كل بطاقة ووثيقة (مقسمة إلى مقاطع) ومؤشر وقرار وحدة قابلة للاسترجاع */
  function corpus(db) {
    var out = [];
    (db.cards || []).forEach(function (c) { if (c.status !== "rejected") out.push({ type: "card", id: c.id, title: c.title, date: c.date, text: c.title + " " + (c.analysis || "") + " " + (c.source || "") + " " + topicName(db, c.topic) + " " + (c.region || "") }); });
    (db.docs || []).forEach(function (d) {
      var parts = String(d.text || "").split(/(?<=[.؟!])\s+/), buf = "", n = 0;
      parts.forEach(function (p, i) { buf += p + " "; if (buf.length > 380 || i === parts.length - 1) { out.push({ type: "doc", id: d.id, part: n++, title: d.title, date: d.date, text: buf.trim(), full: d.title + " " + buf }); buf = ""; } });
    });
    (db.indicators || []).forEach(function (x) { var a = analyzeInd(x); out.push({ type: "ind", id: x.id, title: x.name, date: a.lastD, text: x.name + " " + topicName(db, x.topic) + " " + (x.sector || "") + " " + (a.last != null ? "آخر قيمة " + fmtN(a.last) + " " + x.unit : "") }); });
    (db.decisions || []).forEach(function (d) { out.push({ type: "dec", id: d.id, title: d.title, date: d.date, text: d.title + " " + (d.notes || "") + " " + (d.owner || "") + " " + (d.scenario || "") }); });
    (db.topics || []).forEach(function (t) { out.push({ type: "topic", id: t.id, title: t.name, text: t.name + " " + t.desc }); });
    return out;
  }
  /* ترتيب BM25 مع تعزيز الحداثة */
  function search(db, q, k, types) {
    var C = corpus(db).filter(function (d) { return !types || types.indexOf(d.type) >= 0; });
    var qt = toks(q); if (!qt.length || !C.length) return [];
    var df = {}, N = C.length, avg = 0;
    C.forEach(function (d) { d._t = toks(d.full || d.text); avg += d._t.length; var seen = {}; d._t.forEach(function (w) { if (!seen[w]) { seen[w] = 1; df[w] = (df[w] || 0) + 1; } }); });
    avg /= N;
    var res = C.map(function (d) {
      var tf = {}; d._t.forEach(function (w) { tf[w] = (tf[w] || 0) + 1; });
      var s = 0;
      qt.forEach(function (w) {
        var f = tf[w] || 0;
        if (!f) { for (var key in tf) if (key.length > 3 && w.length > 3 && (key.indexOf(w) === 0 || w.indexOf(key) === 0)) { f = tf[key] * 0.6; break; } }
        if (f) { var idf = Math.log(1 + (N - (df[w] || 0) + 0.5) / ((df[w] || 0) + 0.5)); s += idf * (f * 2.2) / (f + 1.2 * (0.25 + 0.75 * d._t.length / avg)); }
      });
      if (s && d.date) s *= 1 + 0.15 * Math.exp(-Math.max(0, days(d.date, "2026-10-25")) / 90);
      return { d: d, s: s };
    }).filter(function (x) { return x.s > 0; }).sort(function (a, b) { return b.s - a.s; });
    var seen = {}, out = [];
    res.forEach(function (x) { var key = x.d.type + x.d.id; if (!seen[key] && out.length < (k || 6)) { seen[key] = 1; out.push({ type: x.d.type, id: x.d.id, title: x.d.title, text: x.d.text, date: x.d.date, score: r1(x.s) }); } });
    return out;
  }

  /* ---------- جودة المعلومة IQS ---------- */
  var REL = { A: 100, B: 80, C: 60, D: 40, E: 20, F: 40 }, CRED = { 1: 100, 2: 80, 3: 60, 4: 40, 5: 20, 6: 40 };
  function iqs(c, db, now) {
    now = now || db.now;
    var fresh = Math.round(100 * Math.exp(-Math.max(0, days(c.date, now)) / 60));
    var fields = ["source", "date", "sector", "topic", "analysis", "owner", "region"], have = fields.filter(function (f) { return c[f]; }).length;
    var support = (db.cards || []).filter(function (o) { return o.id !== c.id && o.status !== "rejected" && o.dir === c.dir && ((c.links || []).indexOf(o.id) >= 0 || (o.links || []).indexOf(c.id) >= 0); });
    var conflict = (db.cards || []).filter(function (o) { return o.id !== c.id && ((c.conflicts || []).indexOf(o.id) >= 0 || (o.conflicts || []).indexOf(c.id) >= 0); });
    var corr = support.length ? Math.min(100, 50 + 25 * support.length) : 35;
    var p = { rel: REL[c.rel] || 40, cred: CRED[c.cred] || 40, fresh: fresh, complete: Math.round(100 * have / fields.length), corr: corr, conflict: conflict.length * 12 };
    var s = 0.25 * p.rel + 0.25 * p.cred + 0.15 * p.fresh + 0.1 * p.complete + 0.25 * p.corr - p.conflict;
    if (c.status === "verified") s += 5; if (c.status === "rejected") s = Math.min(s, 15);
    return { score: Math.round(clamp(s, 0, 100)), parts: p, support: support.map(function (x) { return x.id; }), conflict: conflict.map(function (x) { return x.id; }) };
  }

  /* ---------- تحليل المؤشرات: المستوى، التغير المفاجئ، الاتجاه، الانعكاس، التوقع ---------- */
  function levelOf(x, v) {
    if (!x.th || v == null) return 0; var t = x.th;
    if (x.dir === "up") return v >= t[2] ? 3 : v >= t[1] ? 2 : v >= t[0] ? 1 : 0;
    if (x.dir === "down") return v <= t[2] ? 3 : v <= t[1] ? 2 : v <= t[0] ? 1 : 0;
    return 0;
  }
  function analyzeInd(x, nowM) {
    var s = (x.series || []).slice().sort(function (a, b) { return a.d < b.d ? -1 : 1; }), n = s.length, vals = s.map(function (p) { return +p.v; });
    var o = { id: x.id, n: n, last: n ? vals[n - 1] : null, lastD: n ? s[n - 1].d : null, prev: n > 1 ? vals[n - 2] : null };
    o.chg = o.prev != null ? o.last - o.prev : null; o.chgPct = o.prev ? 100 * o.chg / Math.abs(o.prev) : null;
    var bad = x.dir === "up" ? 1 : x.dir === "down" ? -1 : 0; o.badSign = bad;
    o.level = levelOf(x, o.last);
    o.worse = bad && o.chg ? (o.chg * bad > 0) : false;
    var d = []; for (var i = 1; i < n; i++) d.push(vals[i] - vals[i - 1]);
    if (d.length >= 4) {
      var h = d.slice(0, -1), m = h.reduce(function (a, b) { return a + b; }, 0) / h.length, sd = Math.sqrt(h.reduce(function (a, b) { return a + (b - m) * (b - m); }, 0) / h.length) || 1e-9;
      o.z = r1((d[d.length - 1] - m) / sd);
      o.sudden = Math.abs(o.z) >= 2 && bad && d[d.length - 1] * bad > 0;
    }
    if (d.length >= 3 && bad) {
      var l3 = d.slice(-3); o.trendBad = l3.every(function (v) { return v * bad > 0; });
      var p3 = d.slice(-4, -1); o.reversal = d.length >= 4 && p3.every(function (v) { return v * bad < 0; }) && d[d.length - 1] * bad > 0 && Math.abs(100 * d[d.length - 1] / (Math.abs(vals[n - 2]) || 1)) >= 4;
      var g3 = d.slice(-3); o.improving = g3.every(function (v) { return v * bad < 0; });
    }
    /* بداية الموجة الحالية */
    o.start = o.lastD; if (bad && o.worse) { for (var j = d.length - 1; j >= 0 && d[j] * bad > 0; j--) o.start = s[j].d; }
    /* توقع هولت الخطي مع نطاق ثقة 80% */
    if (n >= 4) {
      var floor0 = vals.every(function (v) { return v >= 0; }), al = 0.5, be = 0.3, L = vals[0], T = vals[1] - vals[0], res = [];
      for (var k = 1; k < n; k++) { var f = L + T; res.push(vals[k] - f); var L2 = al * vals[k] + (1 - al) * (L + T); T = be * (L2 - L) + (1 - be) * T; L = L2; }
      var rs = res.slice(-6), sd2 = Math.sqrt(rs.reduce(function (a, b) { return a + b * b; }, 0) / rs.length) || Math.abs(L) * 0.03;
      o.forecast = [1, 2, 3].map(function (hh) { var v = L + T * hh * Math.pow(0.85, hh - 1), w = 1.28 * sd2 * Math.sqrt(hh); if (floor0) v = Math.max(0, v); return { d: addMonth(o.lastD, hh), v: r1(v), lo: r1(floor0 ? Math.max(0, v - w) : v - w), hi: r1(v + w) }; });
      o.fLevel = levelOf(x, o.forecast[2].v);
    }
    if (nowM && o.lastD) { o.age = monthsBetween(o.lastD, nowM); o.stale = o.age > (x.freq || 1) * 1.5; }
    if (x.target != null && o.last != null) o.gap = r1(100 * (o.last - x.target) / x.target);
    return o;
  }
  function valueAt(x, m) { var s = (x.series || []).filter(function (p) { return p.d <= m; }).sort(function (a, b) { return a.d < b.d ? -1 : 1; }); return s.length ? s[s.length - 1] : null; }

  /* ---------- الإنذار المبكر ---------- */
  function alerts(db) {
    var now = db.now, nowM = now.slice(0, 7), out = [];
    (db.indicators || []).forEach(function (x) {
      var a = analyzeInd(x, nowM); if (a.last == null) return;
      var lv = a.level, kinds = [];
      if (a.level) kinds.push("تجاوز حد " + LVC[a.level]);
      if (a.sudden) { kinds.push("تغير مفاجئ"); lv = Math.max(lv, 2); }
      if (a.trendBad) { kinds.push("اتجاه سلبي متواصل"); lv = Math.max(lv, 1); }
      if (a.reversal) { kinds.push("انعكاس بعد تحسن"); lv = Math.max(lv, 1); }
      if (a.fLevel > a.level) { kinds.push("التوقع يشير إلى تدهور"); lv = Math.max(lv, Math.min(2, a.fLevel)); }
      if (!lv) return;
      var up = (db.links || []).filter(function (l) { return l.to === x.id; }).map(function (l) { var s = byId(db.indicators, l.from), aa = s ? analyzeInd(s, nowM) : null; return { id: l.from, name: s ? s.name : l.from, w: l.w, note: l.note, chgPct: aa ? r1(aa.chgPct) : null, level: aa ? aa.level : 0 }; });
      var down = (db.links || []).filter(function (l) { return l.from === x.id; }).map(function (l) { var t = byId(db.indicators, l.to); return t ? { id: t.id, name: t.name, sector: t.sector } : null; }).filter(Boolean);
      var sup = (db.cards || []).filter(function (c) { return c.topic === x.topic && c.dir === -1 && c.status !== "rejected" && days(c.date, now) <= 45; });
      var con = (db.cards || []).filter(function (c) { return c.topic === x.topic && c.dir === 1 && c.status !== "rejected" && days(c.date, now) <= 60; });
      var conf = sup.length ? Math.round(sup.reduce(function (s, c) { return s + iqs(c, db).score; }, 0) / sup.length * 0.6 + 35) : 60;
      var sectors = [x.sector].concat(down.map(function (d) { return d.sector; })).filter(function (v, i, A) { return v && A.indexOf(v) === i; });
      out.push({ id: "a-" + x.id, kind: "ind", level: lv, ref: x.id, topic: x.topic, title: x.name + ": " + fmtN(a.last) + " " + x.unit, reason: kinds.join("، "), owner: x.sector, urgency: lv >= 3 ? "خلال 24 ساعة" : lv === 2 ? "خلال أسبوع" : "ضمن المتابعة الدورية",
        why: { ind: x.id, last: a.last, prev: a.prev, chgPct: a.chgPct != null ? r1(a.chgPct) : null, start: a.start, z: a.z, factors: up, support: sup.map(function (c) { return c.id; }), contra: con.map(function (c) { return c.id; }), sectors: sectors, regions: sup.map(function (c) { return c.region; }).filter(Boolean), confidence: clamp(conf, 30, 95), forecast: a.forecast, th: x.th, unit: x.unit } });
    });
    /* تراكم الإشارات الضعيفة في موضوع واحد */
    (db.topics || []).forEach(function (t) {
      var w = (db.cards || []).filter(function (c) { return c.topic === t.id && c.dir === -1 && c.status !== "rejected" && c.status !== "archived" && days(c.date, now) <= 21 && (c.cred >= 3 || c.status !== "verified"); });
      if (w.length >= 3) out.push({ id: "a-ws-" + t.id, kind: "weak", level: 2, topic: t.id, title: "تراكم " + w.length + " إشارات ضعيفة في موضوع " + t.name, reason: "إشارات منفردة غير مؤكدة تتجه في الاتجاه نفسه خلال ثلاثة أسابيع", owner: t.owner, urgency: "خلال أسبوع",
        why: { support: w.map(function (c) { return c.id; }), contra: (db.cards || []).filter(function (c) { return c.topic === t.id && c.dir === 1 && days(c.date, now) <= 60; }).map(function (c) { return c.id; }), sectors: [t.owner], regions: w.map(function (c) { return c.region; }).filter(Boolean), confidence: 55, factors: [] } });
    });
    /* معلومة غير مؤكدة عالية الأثر */
    (db.cards || []).forEach(function (c) {
      if (c.impact >= 3 && (c.status === "new" || c.status === "review") && (REL[c.rel] || 40) <= 40) out.push({ id: "a-uv-" + c.id, kind: "unverified", level: 3, topic: c.topic, ref: c.id, title: "تحقق عاجل مطلوب: " + c.title, reason: "معلومة عالية الأثر من مصدر ضعيف الموثوقية لم يُتحقق منها بعد", owner: c.owner || c.sector, urgency: "خلال 24 ساعة", why: { support: [c.id], contra: [], sectors: [c.sector], regions: c.region ? [c.region] : [], confidence: iqs(c, db).score, factors: [] } });
    });
    /* تراجع متزامن لعدة مؤشرات في القطاع نفسه */
    var bySec = {};
    (db.indicators || []).forEach(function (x) { var a = analyzeInd(x, nowM); if (a.worse && x.domain === "int") (bySec[x.sector] = bySec[x.sector] || []).push(x); });
    Object.keys(bySec).forEach(function (s) { if (bySec[s].length >= 2) out.push({ id: "a-ms-" + s, kind: "multi", level: 2, title: "تراجع متزامن لـ " + bySec[s].length + " مؤشرات في " + s, reason: bySec[s].map(function (x) { return x.name; }).join("، "), owner: s, urgency: "خلال أسبوع", why: { factors: [], support: [], contra: [], sectors: [s], confidence: 70, inds: bySec[s].map(function (x) { return x.id; }) } }); });
    return out.sort(function (a, b) { return b.level - a.level || (b.why.confidence || 0) - (a.why.confidence || 0); });
  }

  /* ---------- المؤشرات المركبة: الضغط الاستراتيجي والفرص ---------- */
  function spiAt(db, m) {
    var ext = [], int = [];
    (db.indicators || []).forEach(function (x) { var p = valueAt(x, m); if (!p || !x.th) return; (x.domain === "ext" ? ext : int).push(levelOf(x, p.v)); });
    var avg = function (A) { return A.length ? A.reduce(function (a, b) { return a + b; }, 0) / A.length / 3 * 100 : 0; };
    return Math.round(0.55 * avg(ext) + 0.45 * avg(int));
  }
  function indices(db) {
    var now = db.now, nowM = now.slice(0, 7), A = alerts(db), ext = [], int = [];
    (db.indicators || []).forEach(function (x) { if (!x.th) return; var a = analyzeInd(x, nowM); if (a.last == null) return; (x.domain === "ext" ? ext : int).push({ x: x, lv: a.level }); });
    var avg = function (L) { return L.length ? L.reduce(function (s, o) { return s + o.lv; }, 0) / L.length / 3 * 100 : 0; };
    var neg = (db.cards || []).filter(function (c) { return c.dir === -1 && c.status !== "rejected" && days(c.date, now) <= 30; });
    var pos = (db.cards || []).filter(function (c) { return c.dir === 1 && c.status !== "rejected" && days(c.date, now) <= 60; });
    var sig = 100 * (1 - Math.exp(-neg.reduce(function (s, c) { return s + c.impact * iqs(c, db).score / 100; }, 0) / 12));
    var risk = 100 * (1 - Math.exp(-A.reduce(function (s, a) { return s + a.level * a.level; }, 0) / 40));
    var legal = Math.min(100, (db.cards || []).filter(function (c) { return c.pestel === "L" && c.status !== "rejected" && days(c.date, now) <= 60; }).length * 25);
    var comp = [
      { k: "البيئة الخارجية", v: avg(ext), w: 0.3, top: ext.filter(function (o) { return o.lv >= 2; }).map(function (o) { return o.x.name; }) },
      { k: "الأداء الداخلي", v: avg(int), w: 0.25, top: int.filter(function (o) { return o.lv >= 1; }).map(function (o) { return o.x.name; }) },
      { k: "التنبيهات القائمة", v: risk, w: 0.2, top: A.filter(function (a) { return a.level >= 3; }).map(function (a) { return a.title; }) },
      { k: "الإشارات السلبية الحديثة", v: sig, w: 0.15, top: neg.slice(0, 3).map(function (c) { return c.title; }) },
      { k: "التغيرات التشريعية", v: legal, w: 0.1, top: [] }
    ];
    var spi = Math.round(comp.reduce(function (s, c) { return s + c.v * c.w; }, 0));
    comp.forEach(function (c) { c.contrib = r1(c.v * c.w); c.v = Math.round(c.v); });
    var improving = (db.indicators || []).filter(function (x) { var a = analyzeInd(x, nowM); return a.improving; });
    var oppCards = pos.map(function (c) { return { c: c, w: c.impact * iqs(c, db).score / 100 }; }).sort(function (a, b) { return b.w - a.w; });
    var opp = Math.round(100 * (1 - Math.exp(-(oppCards.reduce(function (s, o) { return s + o.w; }, 0) + improving.length * 0.6) / 10)));
    var hist = []; for (var i = 9; i >= 0; i--) { var m = addMonth(nowM, -i); hist.push({ d: m, v: spiAt(db, m) }); }
    var cs = (db.cards || []).filter(function (c) { return c.status !== "rejected"; }).map(function (c) { return iqs(c, db).score; });
    return { spi: spi, comp: comp.sort(function (a, b) { return b.contrib - a.contrib; }), hist: hist, opp: opp, oppDrivers: oppCards.slice(0, 4).map(function (o) { return o.c.id; }), improving: improving.map(function (x) { return x.id; }), iqsAvg: cs.length ? Math.round(cs.reduce(function (a, b) { return a + b; }, 0) / cs.length) : 0, alerts: A };
  }

  /* ---------- نموذج انتباه القيادة: ما الذي يحتاج انتباهك الآن؟ ---------- */
  function attention(db) {
    var now = db.now, A = alerts(db), out = [];
    A.forEach(function (a) { out.push({ score: a.level * 25 + (a.kind === "unverified" ? 15 : 0) + (a.why.forecast && a.why.forecast.length ? 5 : 0), kind: "alert", level: a.level, title: a.title, why: a.reason, go: { page: "alerts", id: a.id } }); });
    (db.decisions || []).forEach(function (d) { var r = decisionReview(d, db); if (r.status === "لم يتحقق") out.push({ score: 55, kind: "decision", level: 2, title: "قرار لم يحقق أثره المتوقع: " + d.title, why: r.text, go: { page: "decisions", id: d.id } }); else if (r.status === "قيد القياس" && r.against) out.push({ score: 40, kind: "decision", level: 1, title: "مؤشر القرار يتحرك عكس المتوقع: " + d.title, why: r.text, go: { page: "decisions", id: d.id } }); });
    (db.cards || []).forEach(function (c) { var conf = (c.conflicts || []).length; if (conf && c.status !== "rejected") out.push({ score: 38, kind: "conflict", level: 1, title: "معلومات متعارضة: " + c.title, why: "تتعارض مع " + conf + " بطاقة أخرى؛ يلزم الترجيح قبل البناء عليها", go: { page: "cards", id: c.id } }); });
    var uniq = {}, res = [];
    out.sort(function (a, b) { return b.score - a.score; }).forEach(function (o) { if (!uniq[o.title] && res.length < 7) { uniq[o.title] = 1; res.push(o); } });
    return res;
  }

  /* ---------- SWOT الديناميكية وPESTEL ---------- */
  function swot(db) {
    var now = db.now, nowM = now.slice(0, 7), Q = { S: [], W: [], O: [], T: [] };
    (db.cards || []).forEach(function (c) {
      if (c.status === "rejected" || c.status === "archived" || days(c.date, now) > 120 || !c.dir) return;
      var internal = c.srcType === "int" || c.srcType === "staff", q = internal ? (c.dir > 0 ? "S" : "W") : (c.dir > 0 ? "O" : "T");
      Q[q].push({ t: c.title, topic: c.topic, w: Math.round(c.impact * iqs(c, db).score / 3), ref: { type: "card", id: c.id } });
    });
    (db.indicators || []).forEach(function (x) {
      var a = analyzeInd(x, nowM); if (a.last == null || !x.th) return;
      var txt = x.name + " (" + fmtN(a.last) + " " + x.unit + ")";
      if (x.domain === "int") { if (a.level >= 2) Q.W.push({ t: txt, topic: x.topic, w: 30 * a.level, ref: { type: "ind", id: x.id } }); else if (a.level === 0 && (a.improving || (x.target && a.gap >= 0))) Q.S.push({ t: txt, topic: x.topic, w: 50, ref: { type: "ind", id: x.id } }); }
      else { if (a.level >= 2) Q.T.push({ t: txt, topic: x.topic, w: 30 * a.level, ref: { type: "ind", id: x.id } }); else if (a.improving) Q.O.push({ t: txt + " يتحسن", topic: x.topic, w: 40, ref: { type: "ind", id: x.id } }); }
    });
    Object.keys(Q).forEach(function (k) { Q[k].sort(function (a, b) { return b.w - a.w; }); });
    var cross = [];
    (db.topics || []).forEach(function (t) {
      var T = Q.T.filter(function (i) { return i.topic === t.id; }), W = Q.W.filter(function (i) { return i.topic === t.id; }), O = Q.O.filter(function (i) { return i.topic === t.id; }), S = Q.S.filter(function (i) { return i.topic === t.id; });
      if (T.length && W.length) cross.push({ kind: "risk", topic: t.name, text: "تهديد خارجي يلتقي بضعف داخلي في «" + t.name + "»: " + T[0].t + " ← " + W[0].t, level: 3 });
      if (O.length && S.length) cross.push({ kind: "opp", topic: t.name, text: "فرصة خارجية تلتقي بقدرة داخلية في «" + t.name + "»: " + O[0].t + " ← " + S[0].t, level: 0 });
      if (T.length && S.length && !W.length) cross.push({ kind: "shield", topic: t.name, text: "قدرة داخلية تخفف التهديد في «" + t.name + "»: " + S[0].t, level: 1 });
    });
    return { q: Q, cross: cross };
  }
  function pestel(db) {
    var now = db.now, out = {};
    Object.keys(MQ_META.pestel).forEach(function (k) { out[k] = { k: k, name: MQ_META.pestel[k], n: 0, neg: 0, pos: 0, top: null, w: 0 }; });
    (db.cards || []).forEach(function (c) {
      if (c.status === "rejected" || days(c.date, now) > 90 || !out[c.pestel]) return;
      var o = out[c.pestel], w = c.impact * iqs(c, db).score; o.n++; if (c.dir < 0) o.neg++; if (c.dir > 0) o.pos++;
      if (w > o.w) { o.w = w; o.top = c.id; }
    });
    return Object.keys(out).map(function (k) { var o = out[k]; o.net = o.pos - o.neg; o.state = !o.n ? "لا رصد" : o.neg > o.pos ? "ضاغط" : o.pos > o.neg ? "داعم" : "متوازن"; return o; });
  }

  /* ---------- محرك السيناريوهات: انتشار الصدمة عبر شبكة الترابط ---------- */
  function scenario(db, shocks) {
    var nowM = db.now.slice(0, 7), delta = {}, unc = {}, path = {};
    Object.keys(shocks).forEach(function (k) { if (+shocks[k]) { delta[k] = +shocks[k]; unc[k] = Math.abs(+shocks[k]) * 0.1; path[k] = []; } });
    var frontier = Object.keys(delta);
    for (var depth = 1; depth <= 4 && frontier.length; depth++) {
      var next = {};
      frontier.forEach(function (f) {
        (db.links || []).filter(function (l) { return l.from === f; }).forEach(function (l) {
          if (shocks[l.to]) return;
          var add = l.w * delta[f] * Math.pow(0.85, depth - 1), u = Math.abs(add) * (1 - l.c) * 1.5 + (unc[f] || 0) * Math.abs(l.w);
          var tgt = byId(db.indicators, l.to), cap = tgt && tgt.unit.indexOf("%") >= 0 ? 400 : 300;
          delta[l.to] = clamp((delta[l.to] || 0) + add, -95, cap); unc[l.to] = (unc[l.to] || 0) + u;
          path[l.to] = (path[f] || []).concat([f]); next[l.to] = 1;
        });
      });
      frontier = Object.keys(next);
    }
    var nodes = Object.keys(delta).map(function (id) {
      var x = byId(db.indicators, id); if (!x) return null; var a = analyzeInd(x, nowM), nv = a.last * (1 + delta[id] / 100), lv = levelOf(x, nv);
      return { id: id, name: x.name, unit: x.unit, sector: x.sector, shock: !!shocks[id], d: r1(delta[id]), lo: r1(delta[id] - unc[id]), hi: r1(delta[id] + unc[id]), from: a.last, to: r1(nv), lv0: a.level, lv1: lv, path: path[id].map(function (p) { var y = byId(db.indicators, p); return y ? y.name : p; }) };
    }).filter(Boolean).sort(function (a, b) { return (b.shock - a.shock) || Math.abs(b.d) - Math.abs(a.d); });
    var sectors = {}; nodes.forEach(function (n) { if (Math.abs(n.d) >= 1) sectors[n.sector] = (sectors[n.sector] || 0) + Math.abs(n.d); });
    var risks = nodes.filter(function (n) { return n.lv1 > n.lv0; }).map(function (n) { return n.name + " ينتقل من «" + LVC[n.lv0] + "» إلى «" + LVC[n.lv1] + "»"; });
    var eases = nodes.filter(function (n) { return n.lv1 < n.lv0; }).map(function (n) { return n.name + " يتحسن من «" + LVC[n.lv0] + "» إلى «" + LVC[n.lv1] + "»"; });
    var res = [];
    nodes.forEach(function (n) {
      if (n.id === "int-inspections" && n.d > 0) res.push("نحو " + fmtN(n.to - n.from, 0) + " زيارة تفتيشية إضافية شهرياً");
      if (n.id === "int-complaints" && n.d > 0) res.push("طاقة استقبال لنحو " + fmtN(n.to - n.from, 0) + " شكوى إضافية شهرياً");
      if (n.id === "int-stock" && n.d < 0) res.push("تمويل تعويض نحو " + fmtN(n.from - n.to, 1) + " شهر من تغطية المخزون");
      if (n.id === "int-delay" && n.d > 0) res.push("تفعيل الممرات البديلة لتعويض " + fmtN(n.to - n.from, 1) + " يوم تأخير إضافي");
    });
    var u = nodes.length ? nodes.reduce(function (s, n) { return s + Math.abs(n.hi - n.lo); }, 0) / Math.max(1, nodes.reduce(function (s, n) { return s + Math.abs(n.d); }, 0)) : 0;
    return { nodes: nodes, sectors: Object.keys(sectors).sort(function (a, b) { return sectors[b] - sectors[a]; }), risks: risks, eases: eases, resources: res, uncertainty: u > 0.8 ? "مرتفع" : u > 0.4 ? "متوسط" : "منخفض" };
  }
  var PRESETS = [
    { id: "p1", name: "استمرار الإغلاق حتى منتصف 2027", shocks: { "ext-freight": 15, "ext-brent": 10, "int-delay": 20 } },
    { id: "p2", name: "إعادة فتح المضيق تدريجياً", shocks: { "ext-freight": -60, "ext-brent": -18, "int-delay": -40 } },
    { id: "p3", name: "صدمة أسعار عالمية للغذاء", shocks: { "ext-food-cpi": 15, "ext-veg": 12 } },
    { id: "p4", name: "ارتفاع الطلب على الخدمات 15%", shocks: { "int-sla": -6 } }
  ];

  /* ---------- ماذا فاتنا؟ فجوات المعلومات ---------- */
  function gaps(db) {
    var now = db.now, nowM = now.slice(0, 7), g = [];
    (db.indicators || []).forEach(function (x) {
      var a = analyzeInd(x, nowM);
      if (a.stale) g.push({ sev: 2, kind: "stale", text: "مؤشر «" + x.name + "» لم يُحدَّث منذ " + mLabel(a.lastD), act: "طلب البيانات المحدثة من " + x.src, go: { page: "env", id: x.id } });
      if (!x.th && x.dir !== "none") g.push({ sev: 1, kind: "noth", text: "مؤشر «" + x.name + "» بلا حدود إنذار", act: "تحديد الحدود مع الإدارة المالكة", go: { page: "env", id: x.id } });
      if (!x.th && x.dir === "none") g.push({ sev: 1, kind: "noth", text: "مؤشر «" + x.name + "» يُرصد دون حدود إنذار أو مستهدف", act: "تعريف ما يُعد ارتفاعاً أو انخفاضاً مقلقاً", go: { page: "env", id: x.id } });
    });
    (db.cards || []).forEach(function (c) {
      if ((c.status === "new" || c.status === "review") && days(c.date, now) >= 3) g.push({ sev: c.impact >= 3 ? 3 : 2, kind: "pending", text: "«" + c.title + "» تنتظر التحقق منذ " + dayWord(days(c.date, now)), act: "استكمال التحقق أو طلب تأكيد من مصدر ثانٍ", go: { page: "cards", id: c.id } });
      var q = iqs(c, db);
      if (c.impact >= 3 && !q.support.length && c.status !== "rejected") g.push({ sev: 2, kind: "single", text: "معلومة عالية الأثر بمصدر وحيد: «" + c.title + "»", act: "البحث عن مصدر داعم مستقل", go: { page: "cards", id: c.id } });
      if ((c.conflicts || []).length && c.status !== "rejected") g.push({ sev: 2, kind: "conflict", text: "تعارض غير محسوم بين «" + c.title + "» و" + c.conflicts.length + " بطاقة", act: "ترجيح إحدى الروايتين بزيارة ميدانية أو بيانات رسمية", go: { page: "cards", id: c.id } });
    });
    (db.topics || []).forEach(function (t) {
      var inds = (db.indicators || []).filter(function (x) { return x.topic === t.id; });
      var ext = (db.cards || []).filter(function (c) { return c.topic === t.id && c.srcType !== "int" && days(c.date, now) <= 60; }), int = (db.cards || []).filter(function (c) { return c.topic === t.id && (c.srcType === "int" || c.srcType === "staff") && days(c.date, now) <= 60; });
      if (!inds.length) g.push({ sev: 2, kind: "noind", text: "موضوع «" + t.name + "» بلا مؤشرات قياس", act: "تعريف مؤشر أو أكثر للموضوع", go: { page: "topics", id: t.id } });
      if (ext.length && !int.length) g.push({ sev: 2, kind: "blind", text: "موضوع «" + t.name + "» ظهر في " + ext.length + " مصادر خارجية دون أي تقرير داخلي", act: "طلب تقييم داخلي من " + t.owner, go: { page: "topics", id: t.id } });
    });
    MQ_META.sectors.forEach(function (s) { if (s !== "عام" && !(db.indicators || []).some(function (x) { return x.sector === s; })) g.push({ sev: 1, kind: "nosector", text: "«" + s + "» بلا مؤشرات أداء في المنصة", act: "حصر مؤشرات القطاع وربط مصادرها", go: { page: "env" } }); });
    (db.decisions || []).forEach(function (d) { if (!d.expect || !d.expect.ind) g.push({ sev: 2, kind: "nomeasure", text: "القرار «" + d.title + "» بلا مؤشر لقياس أثره", act: "تحديد المؤشر والأثر المتوقع وموعد القياس", go: { page: "decisions", id: d.id } }); });
    (db.sources || []).forEach(function (s) { if (days(s.review, now) > 45) g.push({ sev: 1, kind: "source", text: "المصدر «" + s.name + "» لم تُراجع موثوقيته منذ " + dLabel(s.review), act: "مراجعة تقييم المصدر", go: { page: "admin" } }); });
    return g.sort(function (a, b) { return b.sev - a.sev; });
  }

  /* ---------- بوابة الرصد: التصنيف الآلي للمعلومة الواردة ---------- */
  var LEX = {
    pestel: { P: ["سياس", "حرب", "مضيق", "حصار", "عقوبات", "اتفاق", "دبلوماس", "وساط", "توتر", "هجوم"], E: ["سعر", "اسعار", "تضخم", "نمو", "استيراد", "تصدير", "مخزون", "تكلف", "كلف", "انكماش", "ميزاني"], S: ["شكاو", "شكوى", "مستهلك", "سكان", "هلع", "اقبال", "مواطن", "مقيم", "تداول"], T: ["نظام", "تقني", "رقمي", "الكترون", "منصه", "تطبيق", "اختراق", "انقطاع"], En: ["مناخ", "بيئ", "حراره", "غبار", "مياه", "تلوث", "امطار"], L: ["قانون", "قرار", "لائح", "تعميم", "تشريع", "مخالف", "عقوب", "ترخيص"], M: ["سوق", "مورد", "شحن", "توريد", "منافس", "طلب", "عرض", "وكيل", "تاجر"] },
    topic: { "t-food": ["غذا", "ارز", "دجاج", "بيض", "فواكه", "خبز", "قمح", "حليب", "خضار", "لحوم", "دواجن", "سكر", "زيت", "طحين", "مخزون", "سلع"], "t-supply": ["شحن", "ميناء", "موانئ", "توريد", "امداد", "ممر", "مضيق", "نقل", "حاويات", "تاخر"], "t-consumer": ["سعر", "منافذ", "شكاو", "شكوى", "مستهلك", "مخالف", "تفتيش", "غش", "اسعار", "احتكار", "منفذ", "محل"], "t-business": ["سجل", "ترخيص", "معامل", "استثمار", "شركات", "رواد", "اجراء"], "t-energy": ["مصنع", "صناع", "طاقه", "وقود", "نفط", "غاز", "كهرباء", "انتاج"], "t-legal": ["قانون", "قرار", "لائح", "تعميم", "تشريع", "مرسوم"] },
    neg: ["ارتفاع", "نقص", "تاخر", "تراجع", "شح", "شكاو", "ازمه", "تعطل", "اغلاق", "مخالف", "هلع", "احتكار", "توقف", "انقطاع", "خسار", "تلف", "زياده في الاسعار", "غلاء"],
    pos: ["تحسن", "توسع", "افتتاح", "فرصه", "نمو", "وفره", "انخفاض الاسعار", "تراجع الاسعار", "اتفاقيه", "تشغيل", "استئناف", "اكتفاء"],
    urgent: ["عاجل", "حاد", "مفاجئ", "كبير", "واسع", "خطير", "نفاد", "انعدام", "فوري"]
  };
  function score(text, words) { var t = norm(text), n = 0; words.forEach(function (w) { if (t.indexOf(norm(w)) >= 0) n++; }); return n; }
  function best(text, map) { var b = null, bs = 0; Object.keys(map).forEach(function (k) { var s = score(text, map[k]); if (s > bs) { bs = s; b = k; } }); return { k: b, s: bs }; }
  function classify(text, db) {
    var p = best(text, LEX.pestel), t = best(text, LEX.topic), neg = score(text, LEX.neg), pos = score(text, LEX.pos), urg = score(text, LEX.urgent);
    var nums = (norm(text).match(/\d+(\.\d+)?\s*%/g) || []).map(function (s) { return parseFloat(s); });
    var dir = neg > pos ? -1 : pos > neg ? 1 : 0, impact = clamp(1 + (urg ? 1 : 0) + (nums.some(function (n) { return n >= 10; }) ? 1 : 0) + (neg >= 2 ? 1 : 0), 1, 3);
    var topic = t.k || (p.k === "L" ? "t-legal" : "t-consumer"), tp = byId(db.topics, topic);
    var rel = search(db, text, 4, ["card", "doc", "ind"]), tk = toks(text), dup = null;
    (db.cards || []).forEach(function (c) { var ct = toks(c.title), inter = ct.filter(function (w) { return tk.indexOf(w) >= 0; }).length, j = inter / Math.max(1, (new Set(ct.concat(tk))).size); if (j >= 0.45 && (!dup || j > dup.j)) dup = { id: c.id, title: c.title, j: r1(j) }; });
    var q = [];
    if (!/\d/.test(norm(text))) q.push("هل يمكن تحديد الحجم أو النسبة أو العدد؟");
    if (!has(text, ["في ", "منطقة", "منفذ", "سوق", "ميناء", "الدوحة", "الوكرة", "الخور", "الريان", "الشمال"])) q.push("أين رُصدت المعلومة تحديداً؟");
    if (!has(text, ["حسب", "وفق", "مصدر", "افاد", "أفاد", "اكد", "أكد", "رصد", "زيارة", "تقرير", "بلاغ"])) q.push("ما المصدر المباشر للمعلومة؟ هل شاهدتها بنفسك؟");
    if (!has(text, ["اليوم", "امس", "أمس", "اسبوع", "أسبوع", "شهر", "منذ", "يوم"])) q.push("متى رُصدت، وهل هي مستمرة؟");
    var related = rel.filter(function (r) { return r.type === "ind"; }).map(function (r) { return r.id; });
    return { pestel: p.k || "E", topic: topic, sector: tp ? tp.owner : "عام", dir: dir, impact: impact, related: rel, relatedInds: related, dup: dup, questions: q, confidence: clamp(40 + p.s * 10 + t.s * 10, 40, 90) };
  }

  /* ---------- تتبع القرار وقياس الأثر ---------- */
  function decisionReview(d, db) {
    var e = d.expect; if (!e || !e.ind) return { status: "بلا قياس", text: "لم يُحدد مؤشر لقياس الأثر." };
    var x = byId(db.indicators, e.ind); if (!x) return { status: "بلا قياس", text: "المؤشر غير متاح." };
    var b = valueAt(x, e.base), due = db.now >= e.by, cur = valueAt(x, due ? String(e.by).slice(0, 7) : db.now.slice(0, 7));
    if (!b || !cur) return { status: "بلا قياس", text: "لا توجد قيم كافية للمؤشر." };
    var act = 100 * (cur.v - b.v) / Math.abs(b.v), ratio = e.change ? act / e.change : 0;
    var o = { ind: x, base: b, cur: cur, actual: r1(act), expected: e.change, ratio: r1(ratio), due: due };
    if (!due) { o.status = "قيد القياس"; o.against = ratio < 0; o.progress = Math.round(clamp(ratio, 0, 1) * 100); o.text = x.name + " تغير " + pct(act) + " منذ " + mLabel(b.d) + " مقابل " + pct(e.change) + " متوقع حتى " + dLabel(e.by) + "."; return o; }
    o.status = ratio >= 0.9 ? "تحقق الأثر" : ratio >= 0.4 ? "تحقق جزئياً" : "لم يتحقق";
    o.text = x.name + ": " + fmtN(b.v) + " ← " + fmtN(cur.v) + " " + x.unit + " (" + pct(act) + " مقابل " + pct(e.change) + " متوقع).";
    if (o.status !== "تحقق الأثر") {
      var ups = (db.links || []).filter(function (l) { return l.to === x.id; }).map(function (l) { var s = byId(db.indicators, l.from), p0 = s && valueAt(s, e.base), p1 = s && valueAt(s, cur.d); return s && p0 && p1 ? { name: s.name, ch: 100 * (p1.v - p0.v) / Math.abs(p0.v), w: l.w } : null; }).filter(function (u) { return u && Math.abs(u.ch) >= 5; });
      o.factors = ups.map(function (u) { return u.name + " " + pct(u.ch); });
      o.lesson = ups.length ? "عوامل خارجية عاكست الأثر خلال الفترة: " + o.factors.join("، ") + ". يُقترح ربط القرارات المشابهة بأدوات تعالج هذه العوامل، لا بالمؤشر النهائي وحده." : "لم تظهر عوامل خارجية كافية لتفسير الفارق؛ يُقترح مراجعة افتراضات القرار وأدوات تنفيذه.";
    }
    return o;
  }
  function learning(db) {
    var R = (db.decisions || []).map(function (d) { return { d: d, r: decisionReview(d, db) }; }), done = R.filter(function (x) { return ["تحقق الأثر", "تحقق جزئياً", "لم يتحقق"].indexOf(x.r.status) >= 0; });
    var ok = done.filter(function (x) { return x.r.status === "تحقق الأثر"; }).length, part = done.filter(function (x) { return x.r.status === "تحقق جزئياً"; }).length;
    var lessons = done.filter(function (x) { return x.r.lesson; }).map(function (x) { return { title: x.d.title, text: x.r.lesson }; });
    var supply = done.filter(function (x) { return /مخزون|تفتيش|حملات|ممر|ترخيص/.test(x.d.title); }), price = done.filter(function (x) { return /أسعار|تثبيت|سقف/.test(x.d.title); });
    if (supply.length && price.length) { var sr = supply.filter(function (x) { return x.r.status === "تحقق الأثر"; }).length / supply.length, pr = price.filter(function (x) { return x.r.status === "تحقق الأثر"; }).length / price.length; if (sr > pr) lessons.unshift({ title: "نمط عام", text: "القرارات التي تعمل على جانب العرض والرقابة (المخزون والتفتيش) حققت أثرها بنسبة " + Math.round(sr * 100) + "%، مقابل " + Math.round(pr * 100) + "% لقرارات التسعير المباشر في ظل استمرار صدمة الكلفة الخارجية." }); }
    return { total: R.length, measured: done.length, ok: ok, part: part, rate: done.length ? Math.round(100 * (ok + part * 0.5) / done.length) : 0, rows: R, lessons: lessons };
  }

  /* ---------- مطابقة النص مع الكيانات ---------- */
  function matchInd(db, q) { var qt = toks(q), b = null, bs = 0; (db.indicators || []).forEach(function (x) { var nt = toks(x.name), s = nt.filter(function (w) { return qt.some(function (v) { return v === w || (v.length > 3 && w.length > 3 && (v.indexOf(w) === 0 || w.indexOf(v) === 0)); }); }).length / nt.length; if (s > bs) { bs = s; b = x; } }); return bs >= 0.34 ? b : null; }
  function matchTopic(db, q) { var b = null, bs = 0; (db.topics || []).forEach(function (t) { var s = score(q, toks(t.name)) + score(q, LEX.topic[t.id] || []) * 0.5; if (s > bs) { bs = s; b = t; } }); return bs >= 1 ? b : null; }
  function matchSector(q) { var m = { "مستهلك": "قطاع شؤون المستهلك", "تجار": "قطاع شؤون التجارة", "صناع": "قطاع شؤون الصناعة", "خدمات": "قطاع الخدمات المشتركة", "وزير": "مكتب الوزير والوحدات التابعة" }; for (var k in m) if (norm(q).indexOf(norm(k)) >= 0) return m[k]; return null; }

  /* ---------- التقرير التنفيذي ---------- */
  function brief(db, period) {
    var now = db.now, nowM = now.slice(0, 7), win = { daily: 2, weekly: 7, monthly: 31, quarterly: 92 }[period] || 7;
    var names = { daily: "اليومي", weekly: "الأسبوعي", monthly: "الشهري", quarterly: "الربع سنوي" };
    var cards = (db.cards || []).filter(function (c) { return c.status !== "rejected" && days(c.date, now) <= win; }).map(function (c) { return { c: c, q: iqs(c, db).score }; }).sort(function (a, b) { return b.c.impact * b.q - a.c.impact * a.q; });
    if (cards.length < 3) cards = (db.cards || []).filter(function (c) { return c.status !== "rejected"; }).map(function (c) { return { c: c, q: iqs(c, db).score }; }).sort(function (a, b) { return b.c.date < a.c.date ? -1 : 1; }).slice(0, 5);
    var I = indices(db), A = I.alerts, inds = (db.indicators || []).map(function (x) { return { x: x, a: analyzeInd(x, nowM) }; }).filter(function (o) { return o.a.last != null; });
    var unusual = inds.filter(function (o) { return o.a.sudden || o.a.reversal; });
    var fc = inds.filter(function (o) { return o.a.forecast && (o.a.level >= 1 || o.a.fLevel >= 1); });
    var att = attention(db), G = gaps(db).filter(function (g) { return g.sev >= 2; }).slice(0, 5), L = learning(db);
    var pend = (db.decisions || []).filter(function (d) { return d.status !== "منفذ"; });
    var proposals = [];
    A.filter(function (a) { return a.level >= 2; }).slice(0, 4).forEach(function (a) {
      if (a.kind === "unverified") proposals.push("التحقق الرسمي من «" + a.title.replace("تحقق عاجل مطلوب: ", "") + "» وإصدار بيان للجمهور عند الحاجة خلال 24 ساعة.");
      else if (a.kind === "weak") proposals.push("تكليف " + a.owner + " بتقييم موحد للإشارات المتراكمة في " + topicName(db, a.topic) + " خلال أسبوع.");
      else if (a.kind === "ind") proposals.push("دراسة إجراء استباقي لاحتواء " + a.title.split(":")[0] + " قبل بلوغه الحد التالي.");
    });
    var srcs = {}; cards.forEach(function (o) { srcs[o.c.source] = 1; }); inds.forEach(function (o) { srcs[o.x.src] = 1; });
    return { title: "الموجز التنفيذي " + names[period], period: period, date: now, spi: I.spi, opp: I.opp, iqs: I.iqsAvg, comp: I.comp,
      devs: cards.slice(0, 6).map(function (o) { return { id: o.c.id, t: o.c.title, d: o.c.date, q: o.q, dir: o.c.dir, src: o.c.source }; }),
      kpis: inds.filter(function (o) { return o.x.th; }).sort(function (a, b) { return b.a.level - a.a.level; }).slice(0, 8).map(function (o) { return { name: o.x.name, v: o.a.last, unit: o.x.unit, ch: o.a.chgPct, lv: o.a.level, d: o.a.lastD }; }),
      risks: A.filter(function (a) { return a.level >= 2; }).slice(0, 5).map(function (a) { return { t: a.title, r: a.reason, lv: a.level, owner: a.owner }; }),
      opps: I.oppDrivers.map(function (id) { var c = byId(db.cards, id); return c ? c.title : null; }).filter(Boolean),
      unusual: unusual.map(function (o) { return o.x.name + ": " + (o.a.sudden ? "تغير مفاجئ" : "انعكاس بعد تحسن") + " (" + pct(o.a.chgPct) + ")"; }),
      forecasts: fc.slice(0, 5).map(function (o) { var f = o.a.forecast[2]; return o.x.name + ": " + fmtN(f.v) + " " + o.x.unit + " بحلول " + mLabel(f.d) + " (النطاق " + fmtN(f.lo) + " إلى " + fmtN(f.hi) + ")"; }),
      follow: att.slice(0, 5).map(function (a) { return a.title; }),
      decide: proposals.concat(pend.map(function (d) { return "متابعة تنفيذ «" + d.title + "»."; })).slice(0, 5),
      gaps: G.map(function (g) { return g.text; }), learning: L, sources: Object.keys(srcs).filter(Boolean) };
  }

  /* ---------- المساعد التحليلي المحلي: تخطيط، أدوات، استشهاد، رأي مخالف ---------- */
  function agent(q, db, opts) {
    opts = opts || {}; var steps = [], cites = [], now = db.now, nowM = now.slice(0, 7), blocks = [];
    function cite(type, id) { var key = type + ":" + id; for (var i = 0; i < cites.length; i++) if (cites[i].key === key) return "[" + (i + 1) + "]"; var title = type === "card" ? (byId(db.cards, id) || {}).title : type === "doc" ? (byId(db.docs, id) || {}).title : type === "ind" ? (byId(db.indicators, id) || {}).name : type === "dec" ? (byId(db.decisions, id) || {}).title : type === "topic" ? (byId(db.topics, id) || {}).name : id; if (!title) return ""; cites.push({ key: key, type: type, id: id, title: title }); return "[" + cites.length + "]"; }
    function step(tool, input, out) { steps.push({ tool: tool, input: input, out: out }); }
    var n = norm(q), want = function (w) { return has(q, w); };
    var ind = matchInd(db, q), topic = matchTopic(db, q), sector = matchSector(q);
    var intents = [];
    if (want(["لماذا", "سبب", "اسباب", "أسباب", "تفسير", "يفسر"])) intents.push("why");
    if (want(["اجتماع", "إحاطة", "احاطه", "أطلع", "اطلع", "قبل الاجتماع"])) intents.push("meeting");
    if (want(["سيناريو", "ماذا لو", "استمر", "مستقبل", "سيحدث", "توقع"])) intents.push("future");
    if (want(["فاتنا", "ناقص", "فجوات", "فجوة", "مفقود", "لم نرصد"])) intents.push("gaps");
    if (want(["قرار", "قرارات", "أثر", "اثر", "تعلمنا", "تعلم"])) intents.push("decisions");
    if (want(["فرص", "فرصة", "قوة", "ضعف", "swot", "سوات"])) intents.push("swot");
    if (want(["مخاطر", "خطر", "تهديد", "إنذار", "انذار", "تنبيه", "تنبيهات"])) intents.push("risks");
    if (want(["تغير", "تغيرات", "مستجد", "جديد", "الأسبوع", "الاسبوع", "اليوم", "حدث", "يحدث"])) intents.push("changes");
    if (!intents.length) intents.push(ind ? "why" : "search");
    step("فهم السؤال", q, "المقاصد: " + intents.join("، ") + (ind ? "؛ المؤشر: " + ind.name : "") + (topic ? "؛ الموضوع: " + topic.name : "") + (sector ? "؛ القطاع: " + sector : ""));

    var A = alerts(db);
    if (intents.indexOf("changes") >= 0 || intents.indexOf("meeting") >= 0) {
      var win = want(["اليوم"]) ? 2 : want(["شهر"]) ? 31 : 7;
      var rc = (db.cards || []).filter(function (c) { return c.status !== "rejected" && days(c.date, now) <= win && (sector ? c.sector === sector : !topic || c.topic === topic.id); }).sort(function (a, b) { return b.impact * iqs(b, db).score - a.impact * iqs(a, db).score; }).slice(0, 5);
      var mv = (db.indicators || []).map(function (x) { return { x: x, a: analyzeInd(x, nowM) }; }).filter(function (o) { return o.a.lastD === nowM && o.a.chgPct != null && Math.abs(o.a.chgPct) >= 3 && (!topic || o.x.topic === topic.id); }).sort(function (a, b) { return Math.abs(b.a.chgPct) - Math.abs(a.a.chgPct); }).slice(0, 4);
      step("استرجاع المستجدات", "آخر " + win + " أيام", rc.length + " بطاقة و" + mv.length + " مؤشرات متحركة");
      blocks.push({ h: intents.indexOf("meeting") >= 0 ? "أهم ما ينبغي الاطلاع عليه" : "أهم التغيرات خلال آخر " + win + " أيام", items: rc.map(function (c) { var s = iqs(c, db).score; return (c.dir < 0 ? "▼ " : c.dir > 0 ? "▲ " : "• ") + c.title + " " + cite("card", c.id) + " — ثقة " + s + "%" + (c.status !== "verified" ? " (" + MQ_META.status[c.status] + ")" : ""); }).concat(mv.map(function (o) { return "المؤشر: " + o.x.name + " " + fmtN(o.a.last) + " " + o.x.unit + " (" + pct(o.a.chgPct) + " عن الشهر السابق) " + cite("ind", o.x.id); })) });
    }
    if (intents.indexOf("risks") >= 0 || intents.indexOf("meeting") >= 0) {
      var ra = A.filter(function (a) { return sector ? ((a.why.sectors || []).indexOf(sector) >= 0 || a.owner === sector) : (!topic || a.topic === topic.id); }).slice(0, 5);
      step("فحص الإنذار المبكر", sector || (topic && topic.name) || "كل القطاعات", ra.length + " تنبيهات");
      blocks.push({ h: "المخاطر والتنبيهات" + (sector ? " في " + sector : topic ? " في " + topic.name : ""), items: ra.length ? ra.map(function (a) { return "[" + LVC[a.level] + "] " + a.title + " — " + a.reason + " " + (a.ref ? cite(a.kind === "ind" ? "ind" : "card", a.ref) : (a.why.support || []).slice(0, 2).map(function (id) { return cite("card", id); }).join("")) + " · المسؤول: " + a.owner; }) : ["لا تنبيهات قائمة ضمن هذا النطاق."] });
    }
    if (intents.indexOf("why") >= 0) {
      var target = ind || (topic && (db.indicators || []).filter(function (x) { return x.topic === topic.id; }).sort(function (a, b) { return analyzeInd(b, nowM).level - analyzeInd(a, nowM).level; })[0]);
      if (target) {
        var a = analyzeInd(target, nowM), up = (db.links || []).filter(function (l) { return l.to === target.id; });
        step("تحليل المؤشر", target.name, "آخر قيمة " + fmtN(a.last) + "، تغير " + pct(a.chgPct || 0) + "، مستوى " + LVC[a.level]);
        step("تتبع العوامل في شبكة الترابط", target.name, up.length + " عوامل مؤثرة");
        var it = ["القيمة الحالية " + fmtN(a.last) + " " + target.unit + " في " + mLabel(a.lastD) + " (" + pct(a.chgPct || 0) + " عن الشهر السابق، مستوى " + LVC[a.level] + ") " + cite("ind", target.id)];
        if (a.start && a.start !== a.lastD) it.push("بدأت الموجة الحالية في " + mLabel(a.start) + ".");
        up.forEach(function (l) { var s = byId(db.indicators, l.from), sa = s && analyzeInd(s, nowM); if (s) it.push("عامل مؤثر: " + s.name + " (" + fmtN(sa.last) + " " + s.unit + "، " + pct(sa.chgPct || 0) + ") — " + l.note + " " + cite("ind", s.id)); });
        var sup = (db.cards || []).filter(function (c) { return c.topic === target.topic && c.status !== "rejected" && days(c.date, now) <= 45; }).slice(0, 3);
        sup.forEach(function (c) { it.push("معلومة داعمة: " + c.title + " " + cite("card", c.id)); });
        var dk = search(db, target.name, 2, ["doc"]); dk.forEach(function (d) { it.push("من قاعدة المعرفة: " + d.text.slice(0, 160) + "… " + cite("doc", d.id)); });
        blocks.push({ h: "لماذا يتحرك «" + target.name + "»؟", items: it });
      }
    }
    if (intents.indexOf("future") >= 0) {
      var fl = (ind ? [ind] : (db.indicators || []).filter(function (x) { return (!topic || x.topic === topic.id) && x.th; })).map(function (x) { return { x: x, a: analyzeInd(x, nowM) }; }).filter(function (o) { return o.a.forecast; }).sort(function (a, b) { return (b.a.fLevel || 0) - (a.a.fLevel || 0); }).slice(0, 4);
      step("التوقع بالاتجاه الحالي", (ind && ind.name) || (topic && topic.name) || "المؤشرات الرئيسية", fl.length + " توقعات بنطاق ثقة 80%");
      var pre = PRESETS[want(["فتح", "انفراج", "انتهاء"]) ? 1 : 0], sc = scenario(db, pre.shocks);
      step("محاكاة سيناريو", pre.name, sc.nodes.length + " مؤشرات متأثرة، عدم اليقين " + sc.uncertainty);
      blocks.push({ h: "إذا استمر الاتجاه الحالي", items: fl.map(function (o) { var f = o.a.forecast[2]; return o.x.name + ": " + fmtN(f.v) + " " + o.x.unit + " بحلول " + mLabel(f.d) + " (النطاق المرجح " + fmtN(f.lo) + " إلى " + fmtN(f.hi) + ") " + cite("ind", o.x.id); }) });
      blocks.push({ h: "سيناريو: " + pre.name, items: sc.nodes.slice(0, 5).map(function (nd) { return nd.name + ": " + pct(nd.d) + " (النطاق " + pct(nd.lo) + " إلى " + pct(nd.hi) + ")"; }).concat(sc.risks.map(function (r) { return "خطر: " + r; })).concat(sc.resources.map(function (r) { return "موارد مطلوبة: " + r; })).concat(["مستوى عدم اليقين: " + sc.uncertainty + ". السيناريو تقدير تحليلي قائم على افتراضات شبكة الترابط، وليس حقيقة مؤكدة."]) });
    }
    if (intents.indexOf("gaps") >= 0 || intents.indexOf("meeting") >= 0) {
      var G = gaps(db).filter(function (g) { return !topic || norm(g.text).indexOf(norm(topic.name)) >= 0 || g.sev >= 3; }).slice(0, intents.indexOf("gaps") >= 0 ? 7 : 3);
      step("البحث عن فجوات المعلومات", "كل المصادر", G.length + " فجوات");
      blocks.push({ h: intents.indexOf("gaps") >= 0 ? "ماذا فاتنا؟" : "أسئلة مفتوحة قبل الاجتماع", items: G.map(function (g) { return g.text + " ← " + g.act; }) });
    }
    if (intents.indexOf("decisions") >= 0) {
      var L = learning(db);
      step("مراجعة سجل القرارات", L.total + " قرارات", "نسبة تحقق الأثر " + L.rate + "%");
      blocks.push({ h: "القرارات وأثرها", items: L.rows.map(function (r) { return r.d.title + " — " + r.r.status + ": " + r.r.text + " " + cite("dec", r.d.id); }).concat(L.lessons.slice(0, 2).map(function (l) { return "ما تعلمناه: " + l.text; })) });
    }
    if (intents.indexOf("swot") >= 0) {
      var W = swot(db); step("تحديث SWOT الديناميكية", "آخر 120 يوماً", W.cross.length + " تقاطعات");
      blocks.push({ h: "الفرص والقدرات", items: W.q.O.slice(0, 3).map(function (i) { return "فرصة: " + i.t + " " + cite(i.ref.type, i.ref.id); }).concat(W.q.S.slice(0, 2).map(function (i) { return "قوة: " + i.t + " " + cite(i.ref.type, i.ref.id); })).concat(W.q.W.slice(0, 2).map(function (i) { return "ضعف: " + i.t + " " + cite(i.ref.type, i.ref.id); })).concat(W.cross.map(function (c) { return (c.kind === "risk" ? "خطر مرتفع: " : c.kind === "opp" ? "فرصة محتملة: " : "عامل حماية: ") + c.text; })) });
    }
    if (intents.indexOf("search") >= 0 || !blocks.length) {
      var R = search(db, q, 6); step("البحث في المعرفة المؤسسية", q, R.length + " نتائج");
      blocks.push({ h: "ما تقوله المصادر المعتمدة", items: R.length ? R.map(function (r) { return r.type === "doc" ? r.text.slice(0, 220) + "… " + cite("doc", r.id) : r.title + " " + cite(r.type, r.id); }) : ["لم أجد في المصادر المصرح لك بها ما يجيب عن السؤال. يمكن إرسال المعلومة عبر بوابة الرصد أو رفع وثيقة إلى قاعدة المعرفة."] });
    }
    /* رأي مخالف: يبحث عمداً عن الأدلة المعاكسة والافتراضات الضعيفة */
    var counter = [];
    var tp = topic ? topic.id : ind ? ind.topic : null;
    (db.cards || []).filter(function (c) { return c.status !== "rejected" && (!tp || c.topic === tp) && days(c.date, now) <= 60; }).forEach(function (c) {
      if ((c.conflicts || []).length) counter.push("تعارض قائم: " + c.title + " " + cite("card", c.id) + " — لا تُبنى عليه نتيجة قبل الترجيح.");
      if (iqs(c, db).score < 50 && c.impact >= 2) counter.push("معلومة منخفضة الثقة (" + iqs(c, db).score + "%) قد تبالغ في الصورة: " + c.title + " " + cite("card", c.id));
    });
    if (tp) { var opp = (db.cards || []).filter(function (c) { return c.topic === tp && c.dir === 1 && days(c.date, now) <= 60; }); opp.slice(0, 2).forEach(function (c) { counter.push("دليل معاكس للاتجاه السلبي: " + c.title + " " + cite("card", c.id)); }); }
    if (intents.indexOf("future") >= 0) counter.push("التوقعات تفترض ثبات العلاقات التاريخية؛ أي تغير سياسي مفاجئ (مثل إعادة فتح الممرات) يبطلها.");
    step("المراجعة النقدية", "البحث عن أدلة معاكسة", counter.length + " ملاحظات");
    if (counter.length) blocks.push({ h: "رأي مخالف ونقاط للتحقق", items: counter.slice(0, 4), tone: "counter" });
    var cardC = cites.filter(function (c) { return c.type === "card"; }).map(function (c) { return iqs(byId(db.cards, c.id), db).score; });
    var conf = cites.length ? Math.round(clamp((cardC.length ? cardC.reduce(function (a, b) { return a + b; }, 0) / cardC.length : 75) * 0.7 + Math.min(cites.length, 8) * 3, 35, 92)) : 30;
    var follow = [];
    if (ind) follow.push("ما السيناريوهات إذا استمر اتجاه " + ind.name + "؟");
    if (topic) follow.push("ما الفجوات في موضوع " + topic.name + "؟");
    follow.push("حضّر لي إحاطة قبل اجتماع اللجنة"); follow.push("ما أثر القرارات السابقة وماذا تعلمنا؟");
    return { blocks: blocks, cites: cites, steps: steps, confidence: conf, follow: follow.slice(0, 3), engine: "local" };
  }

  return { norm: norm, toks: toks, search: search, iqs: iqs, analyzeInd: analyzeInd, levelOf: levelOf, valueAt: valueAt, alerts: alerts, indices: indices, attention: attention, swot: swot, pestel: pestel, scenario: scenario, PRESETS: PRESETS, gaps: gaps, classify: classify, decisionReview: decisionReview, learning: learning, brief: brief, agent: agent, matchInd: matchInd, fmtN: fmtN, pct: pct, mLabel: mLabel, dLabel: dLabel, days: days, dayWord: dayWord, addMonth: addMonth, monthsBetween: monthsBetween, byId: byId, topicName: topicName, LV: LV, LVC: LVC, REL: REL, CRED: CRED };
})();

/* منطق الخادم المشترك لمَرقَب: الهوية والصلاحيات وتصنيف البيانات وسجل التدقيق.
   يعمل بالقواعد نفسها في خادم البيانات وفي الوضع المحلي على الجهاز */
var MQ_SHA256 = (function () {
  var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
  function utf8(s) { var o = [], i, c; for (i = 0; i < s.length; i++) { c = s.charCodeAt(i); if (c >= 0xd800 && c < 0xdc00 && i + 1 < s.length) { c = 0x10000 + ((c - 0xd800) << 10) + (s.charCodeAt(++i) - 0xdc00); } if (c < 128) o.push(c); else if (c < 2048) o.push(192 | c >> 6, 128 | c & 63); else if (c < 65536) o.push(224 | c >> 12, 128 | c >> 6 & 63, 128 | c & 63); else o.push(240 | c >> 18, 128 | c >> 12 & 63, 128 | c >> 6 & 63, 128 | c & 63); } return o; }
  return function (str) {
    var b = utf8(str), l = b.length * 8, H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19], w = new Array(64), i, j, t;
    b.push(128); while (b.length % 64 !== 56) b.push(0);
    for (i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    for (i = 0; i < b.length; i += 64) {
      for (j = 0; j < 16; j++) w[j] = (b[i + j * 4] << 24) | (b[i + j * 4 + 1] << 16) | (b[i + j * 4 + 2] << 8) | b[i + j * 4 + 3];
      for (j = 16; j < 64; j++) { var x = w[j - 15], y = w[j - 2]; w[j] = (((x >>> 7 | x << 25) ^ (x >>> 18 | x << 14) ^ (x >>> 3)) + w[j - 16] + ((y >>> 17 | y << 15) ^ (y >>> 19 | y << 13) ^ (y >>> 10)) + w[j - 7]) | 0; }
      var a = H[0], bb = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (j = 0; j < 64; j++) {
        var t1 = (h + ((e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7)) + ((e & f) ^ (~e & g)) + K[j] + w[j]) | 0;
        var t2 = (((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    for (t = "", i = 0; i < 8; i++) t += ("00000000" + (H[i] >>> 0).toString(16)).slice(-8);
    return t;
  };
})();
function mqHash(pw, salt) { var h = MQ_SHA256(salt + ":" + pw); for (var i = 0; i < 500; i++) h = MQ_SHA256(h + salt); return h; }

/* الصلاحيات حسب المستوى الوظيفي (1 القيادة العليا ... 5 جامعو البيانات) ودور مدير المنصة */
var MQ_CAN = {
  read: function (u) { return !!u; },
  submit: function (u) { return !!u; },
  cards: function (u) { return u.role === "admin" || u.lvl <= 4; },
  verify: function (u) { return u.role === "admin" || u.lvl <= 4; },
  indicators: function (u) { return u.role === "admin" || u.lvl === 4 || u.lvl === 3; },
  links: function (u) { return u.role === "admin" || u.lvl === 4; },
  decisions: function (u) { return u.role === "admin" || u.lvl <= 3; },
  topics: function (u) { return u.role === "admin" || u.lvl <= 4; },
  docs: function (u) { return u.role === "admin" || u.lvl <= 4; },
  sources: function (u) { return u.role === "admin" || u.lvl === 4; },
  agent: function (u) { return u.role === "admin" || u.lvl <= 4; },
  dash: function (u) { return u.role === "admin" || u.lvl <= 4; }
};
/* أعلى تصنيف يحق للمستخدم الاطلاع عليه */
function mqClear(u) { return !u ? 0 : u.role === "admin" ? 4 : u.lvl <= 2 ? 4 : u.lvl <= 4 ? 3 : 2; }
var MQ_COLS = ["cards", "indicators", "links", "decisions", "topics", "docs", "sources"];

/* env: { kv: {get,set,del,list(prefix)}, now(), rand(n), seed: {user,name,salt,hash,v}, data: MQ_SEED } */
function mqHandle(req, env) {
  var kv = env.kv, P = function (k) { var v = kv.get(k); return v == null ? null : JSON.parse(v); }, W = function (k, v) { kv.set(k, JSON.stringify(v)); };
  function err(code, msg) { return { ok: false, code: code, error: msg }; }
  var clean = function (s, n) { return String(s == null ? "" : s).trim().slice(0, n || 80); };
  var pwOk = function (p) { return typeof p === "string" && p.length >= 8 && /[A-Za-z؀-ۿ]/.test(p) && /\d/.test(p); };
  function users() {
    var u = P("sys/users"), sv = String(env.seed.v || "1");
    if (!u || !u.length) { u = [{ id: "u1", user: env.seed.user, name: env.seed.name || "مدير المنصة", role: "admin", lvl: 1, sectors: [], salt: env.seed.salt, hash: env.seed.hash, mustChange: true, at: env.now() }]; W("sys/users", u); kv.set("sys/seedv", sv); }
    else if ((kv.get("sys/seedv") || "1") !== sv) {
      var a0 = u.filter(function (y) { return y.id === "u1"; })[0];
      if (!a0) { a0 = { id: "u1", user: env.seed.user, name: env.seed.name || "مدير المنصة", lvl: 1, sectors: [], at: env.now() }; u.unshift(a0); }
      a0.user = env.seed.user; a0.role = "admin"; a0.salt = env.seed.salt; a0.hash = env.seed.hash; a0.mustChange = true;
      W("sys/users", u); kv.del("sys/fails"); kv.set("sys/seedv", sv);
    }
    /* حساب العميل الافتراضي: يُنشأ أو تُعاد كلمة مروره عند تغيير إصداره في الإعدادات */
    var cv = String(env.seed.cV || "");
    if (env.seed.cUser && cv && (kv.get("sys/seedc") || "") !== cv) {
      var c0 = u.filter(function (y) { return y.user.toLowerCase() === String(env.seed.cUser).toLowerCase(); })[0];
      if (!c0) { var cn = 1; u.forEach(function (y) { var k = +String(y.id).slice(1); if (k >= cn) cn = k + 1; }); c0 = { id: "u" + cn, user: env.seed.cUser, at: env.now() }; u.push(c0); }
      c0.name = env.seed.cName || "حساب العميل"; c0.role = "member"; c0.lvl = +(env.seed.cLvl || 2); c0.sectors = []; c0.salt = env.seed.cSalt; c0.hash = env.seed.cHash; c0.mustChange = false;
      W("sys/users", u); kv.set("sys/seedc", cv);
    }
    return u;
  }
  function pub(u) { return { id: u.id, user: u.user, name: u.name, role: u.role, lvl: u.lvl || 5, sectors: u.sectors || [], unit: u.unit || "", mustChange: !!u.mustChange, at: u.at, last: u.last || null }; }
  function audit(u, act, what) {
    var L = P("sys/audit") || []; L.unshift({ t: env.now(), u: u ? u.id : "-", n: u ? u.name : "زائر", a: act, w: String(what || "").slice(0, 140) });
    W("sys/audit", L.slice(0, 600));
  }
  function seedData() {
    if (kv.get("sys/seeded")) return;
    var D = env.data || {};
    MQ_COLS.forEach(function (c) { if (c === "docs") { var meta = []; (D.docs || []).forEach(function (d) { W("doc/" + d.id, { text: d.text }); var m = {}; for (var k in d) if (k !== "text") m[k] = d[k]; m.size = d.text.length; m.snippet = d.text.slice(0, 1800); meta.push(m); }); W("col/docs", meta); } else W("col/" + c, D[c] || []); });
    W("sys/settings", { org: "الوزارة", demo: true, agentMode: "auto", feeds: [] });
    kv.set("sys/seeded", "1");
  }
  function me() {
    if (!req.token) return null;
    var t = P("sys/tokens") || {}, s = t[req.token];
    if (!s || s.exp < Date.now()) return null;
    return users().filter(function (x) { return x.id === s.uid; })[0] || null;
  }
  function issue(u) {
    var t = P("sys/tokens") || {}, now = Date.now(), tok = env.rand(40);
    Object.keys(t).forEach(function (k) { if (t[k].exp < now) delete t[k]; });
    t[tok] = { uid: u.id, exp: now + 12 * 3600e3 }; W("sys/tokens", t); return tok;
  }
  /* تطبيق مبدأ الحاجة إلى المعرفة: التصنيف + القطاع */
  function visible(u, col, it) {
    var cl = mqClear(u);
    if ((it.cls || 2) > cl) return false;
    if (u.role !== "admin" && u.lvl >= 3 && (u.sectors || []).length && it.sector && it.sector !== "عام" && (u.sectors || []).indexOf(it.sector) < 0 && it.by !== u.id) return false;
    if (col === "cards" && u.lvl === 5 && u.role !== "admin" && it.by !== u.id && it.status !== "verified") return false;
    return true;
  }
  function readCol(u, c) { return (P("col/" + c) || []).filter(function (it) { return visible(u, c, it); }); }

  seedData();
  var a = req.action, u = me();
  if (a === "login") {
    var name = clean(req.user).toLowerCase(), list = users(), x = list.filter(function (y) { return y.user.toLowerCase() === name; })[0];
    var fails = P("sys/fails") || {}, f = fails[name] || { n: 0, until: 0 };
    if (f.until > Date.now()) return err("locked", "تجاوزت عدد المحاولات المسموح. أعد المحاولة بعد 10 دقائق.");
    if (!x || mqHash(String(req.pw || "").trim(), x.salt) !== x.hash) { f.n++; if (f.n >= 5) { f.until = Date.now() + 10 * 6e4; f.n = 0; } fails[name] = f; W("sys/fails", fails); audit(null, "محاولة دخول فاشلة", name); return err("auth", "اسم المستخدم أو كلمة المرور غير صحيحة."); }
    delete fails[name]; W("sys/fails", fails);
    var L0 = users(); L0.forEach(function (y) { if (y.id === x.id) y.last = env.now(); }); W("sys/users", L0);
    audit(x, "تسجيل دخول", "");
    return { ok: true, token: issue(x), user: pub(x) };
  }
  if (a === "ping") return { ok: true, server: !!env.server, agent: !!env.agentReady };
  if (!u) return err("auth", "انتهت الجلسة. سجّل الدخول من جديد.");
  if (a === "me") return { ok: true, user: pub(u) };
  if (a === "logout") { var tt = P("sys/tokens") || {}; delete tt[req.token]; W("sys/tokens", tt); audit(u, "تسجيل خروج", ""); return { ok: true }; }
  if (a === "changePw") {
    if (mqHash(String(req.old || "").trim(), u.salt) !== u.hash) return err("auth", "كلمة المرور الحالية غير صحيحة.");
    if (!pwOk(req.pw)) return err("weak", "كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف وأن تجمع بين الحروف والأرقام.");
    if (req.pw === req.old) return err("weak", "اختر كلمة مرور مختلفة عن الحالية.");
    var L = users(); L.forEach(function (y) { if (y.id === u.id) { y.salt = env.rand(16); y.hash = mqHash(req.pw, y.salt); y.mustChange = false; } }); W("sys/users", L);
    audit(u, "تغيير كلمة المرور", "");
    return { ok: true, user: pub(L.filter(function (y) { return y.id === u.id; })[0]) };
  }
  if (u.mustChange) return err("change", "يلزم تغيير كلمة المرور المؤقتة أولاً.");
  var admin = u.role === "admin";

  if (a === "boot") {
    var out = { ok: true, user: pub(u), clear: mqClear(u), settings: P("sys/settings") || {}, server: !!env.server, agent: !!env.agentReady };
    MQ_COLS.forEach(function (c) { out[c] = readCol(u, c); });
    var names = {}; users().forEach(function (y) { names[y.id] = y.name; }); out.names = names;
    return out;
  }
  if (a === "doc") {
    var meta = readCol(u, "docs").filter(function (d) { return d.id === req.id; })[0];
    if (!meta) return err("perm", "الوثيقة غير متاحة لمستوى صلاحيتك.");
    audit(u, "اطلاع على وثيقة", meta.title);
    return { ok: true, text: (P("doc/" + meta.id) || {}).text || "" };
  }
  if (a === "put" || a === "del") {
    var col = req.col; if (MQ_COLS.indexOf(col) < 0) return err("bad", "مجموعة غير معروفة.");
    var items = P("col/" + col) || [], it = req.item || {}, id = clean(a === "del" ? req.id : it.id, 40), old = items.filter(function (y) { return y.id === id; })[0];
    var allowed = MQ_CAN[col] ? MQ_CAN[col](u) : admin;
    if (col === "cards") {
      if (a === "put" && !old && !allowed) { it.status = "new"; it.cls = Math.min(it.cls || 2, 2); allowed = true; }
      if (a === "put" && old && !allowed && old.by === u.id && old.status === "new") { it.status = "new"; it.cls = Math.min(it.cls || 2, 2); allowed = true; }
      if (a === "put" && old && it.status !== old.status && !MQ_CAN.verify(u)) return err("perm", "تغيير حالة التحقق متاح للمحللين ومن فوقهم.");
    }
    if (!allowed) return err("perm", "لا تملك صلاحية التعديل على هذه البيانات.");
    if (old && !visible(u, col, old)) return err("perm", "لا تملك صلاحية الاطلاع على هذا العنصر.");
    if (a === "del") {
      if (!admin && old && old.by !== u.id) return err("perm", "الحذف متاح لمنشئ العنصر أو مدير المنصة.");
      W("col/" + col, items.filter(function (y) { return y.id !== id; })); if (col === "docs") kv.del("doc/" + id);
      audit(u, "حذف من " + col, old ? (old.title || old.name || id) : id); return { ok: true };
    }
    if (!id) { id = col.charAt(0) + env.rand(8); it.id = id; }
    if ((it.cls || 2) > mqClear(u)) it.cls = mqClear(u);
    if (col === "docs" && typeof it.text === "string") { var tx = it.text.slice(0, 200000); W("doc/" + id, { text: tx }); delete it.text; it.size = tx.length; it.snippet = tx.slice(0, 1800); }
    var body = JSON.stringify(it); if (body.length > 60000) return err("size", "حجم العنصر أكبر من المسموح.");
    it.by = old ? old.by : u.id; it.upd = env.now(); it.updBy = u.id;
    if (old) items = items.map(function (y) { return y.id === id ? it : y; }); else items.unshift(it);
    W("col/" + col, items.slice(0, 2000));
    audit(u, (old ? "تعديل في " : "إضافة إلى ") + col, it.title || it.name || id);
    return { ok: true, item: it };
  }
  if (a === "trace") { /* حفظ مسار التحليل لسجل المساءلة */
    var T = P("sys/traces") || []; T.unshift({ t: env.now(), u: u.id, q: clean(req.q, 300), engine: clean(req.engine, 20), steps: (req.steps || []).slice(0, 20), cites: (req.cites || []).slice(0, 20), conf: req.conf }); W("sys/traces", T.slice(0, 200)); return { ok: true };
  }
  if (!admin) return err("perm", "هذا الإجراء متاح لمدير المنصة فقط.");
  if (a === "audit") return { ok: true, list: P("sys/audit") || [], traces: P("sys/traces") || [] };
  if (a === "settings") { var st = P("sys/settings") || {}; ["org", "agentMode", "demo"].forEach(function (k) { if (req.s && k in req.s) st[k] = req.s[k]; }); if (req.s && Array.isArray(req.s.feeds)) st.feeds = req.s.feeds.slice(0, 20).map(function (f) { return { name: clean(f.name, 60), url: clean(f.url, 300), rel: clean(f.rel, 1) || "C", kw: clean(f.kw, 200) }; }); W("sys/settings", st); audit(u, "تعديل الإعدادات", ""); return { ok: true, settings: st }; }
  if (a === "clearDemo") { MQ_COLS.forEach(function (c) { if (c === "topics" || c === "sources" || c === "links") return; if (c === "docs") (P("col/docs") || []).forEach(function (d) { kv.del("doc/" + d.id); }); W("col/" + c, c === "indicators" ? (P("col/indicators") || []).map(function (x) { x.series = []; return x; }) : []); }); var s2 = P("sys/settings") || {}; s2.demo = false; W("sys/settings", s2); audit(u, "مسح البيانات التجريبية", "أُبقيت تعريفات المؤشرات والموضوعات والمصادر"); return { ok: true }; }
  if (a === "restore") { try { var B = req.backup; MQ_COLS.forEach(function (c) { if (Array.isArray(B[c])) W("col/" + c, B[c]); }); (B.docTexts || []).forEach(function (d) { W("doc/" + d.id, { text: d.text }); }); audit(u, "استعادة نسخة احتياطية", ""); return { ok: true }; } catch (e) { return err("bad", "ملف النسخة الاحتياطية غير صالح."); } }
  if (a === "backup") { var bk = { at: env.now(), docTexts: [] }; MQ_COLS.forEach(function (c) { bk[c] = P("col/" + c) || []; }); bk.docs.forEach(function (d) { bk.docTexts.push({ id: d.id, text: (P("doc/" + d.id) || {}).text || "" }); }); audit(u, "تنزيل نسخة احتياطية", ""); return { ok: true, backup: bk }; }
  if (a === "users") return { ok: true, users: users().map(pub) };
  if (a === "addUser" || a === "resetUser" || a === "editUser") {
    var L2 = users(), tmp = String(req.pw || ""), x3;
    if (a !== "editUser" && !pwOk(tmp)) return err("weak", "كلمة المرور المؤقتة يجب ألا تقل عن 8 أحرف وأن تجمع بين الحروف والأرقام.");
    if (a === "addUser") {
      var un = clean(req.user, 30).toLowerCase();
      if (!/^[a-z0-9._-]{3,30}$/.test(un)) return err("bad", "اسم المستخدم من 3 إلى 30 حرفاً لاتينياً أو رقماً.");
      if (L2.some(function (y) { return y.user.toLowerCase() === un; })) return err("dup", "اسم المستخدم مستخدم من قبل.");
      var n = 1; L2.forEach(function (y) { n = Math.max(n, +y.id.slice(1) + 1); });
      x3 = { id: "u" + n, user: un, at: env.now() }; L2.push(x3);
    } else { x3 = L2.filter(function (y) { return y.id === req.id; })[0]; if (!x3) return err("bad", "المستخدم غير موجود."); }
    if (a !== "resetUser") {
      if (x3.id === "u1" && a === "editUser" && (req.role !== "admin")) return err("main", "حساب المدير الرئيسي محمي من تغيير الصلاحية.");
      x3.name = clean(req.name, 60) || x3.name || x3.user; x3.role = req.role === "admin" ? "admin" : "member"; x3.lvl = Math.min(5, Math.max(1, +req.lvl || 5)); x3.unit = clean(req.unit, 80);
      x3.sectors = (Array.isArray(req.sectors) ? req.sectors : []).map(function (s) { return clean(s, 60); }).slice(0, 6);
    }
    if (a !== "editUser") { x3.salt = env.rand(16); x3.hash = mqHash(tmp, x3.salt); x3.mustChange = true; }
    W("sys/users", L2); audit(u, a === "addUser" ? "إضافة مستخدم" : a === "editUser" ? "تعديل صلاحيات مستخدم" : "إصدار كلمة مرور مؤقتة", x3.user);
    return { ok: true, users: L2.map(pub) };
  }
  if (a === "delUser") {
    var L3 = users(), y3 = L3.filter(function (y) { return y.id === req.id; })[0];
    if (!y3) return err("bad", "المستخدم غير موجود.");
    if (y3.id === u.id || y3.id === "u1") return err("main", "لا يمكن حذف هذا الحساب.");
    W("sys/users", L3.filter(function (y) { return y.id !== req.id; }));
    var t3 = P("sys/tokens") || {}; Object.keys(t3).forEach(function (k) { if (t3[k].uid === req.id) delete t3[k]; }); W("sys/tokens", t3);
    audit(u, "حذف مستخدم", y3.user); return { ok: true, users: users().map(pub) };
  }
  return err("bad", "طلب غير معروف.");
}

/* ================= خادم بيانات مَرقَب على Google Apps Script =================
   الإعداد مختصر في دليل التشغيل (README): الصق هذا الملف كاملاً في محرر Apps Script
   لجدول Google جديد، ثم انشره تطبيق ويب، وضع رابط /exec في assets/config.js.  */
const SEED = {"user":"admin","name":"مدير المنصة","v":"2","salt":"TyymWFLjL7E2QuC3","hash":"564b4172753fbc4045f083e3a359e1beefc3e6d84d3c33d628881c279de0ddce","cUser":"client","cName":"حساب العميل","cLvl":3,"cV":"1","cSalt":"HhFevAwP7u6kwSDN","cHash":"1f7d9a51a1a9f2e9e2d0d6500b5cb432a5d77711fd2b5aff12eae74cb9552880"};
const SHEET = "Store", CHUNK = 45000, PARTS = 10;

function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.getRange(1, 1, 1, 3).setValues([["key", "updated", "data"]]); sh.setFrozenRows(1); }
  return sh;
}
function kv_() {
  const sh = sheet_(), cache = {};
  const keys = () => { const n = sh.getLastRow(); return n < 2 ? [] : sh.getRange(2, 1, n - 1, 1).getValues().map(r => String(r[0])); };
  let K = keys();
  const rowOf = k => { const i = K.indexOf(k); return i < 0 ? -1 : i + 2; };
  return {
    get(k) { if (k in cache) return cache[k]; const r = rowOf(k); const v = r < 0 ? null : (sh.getRange(r, 3, 1, PARTS).getValues()[0].join("") || null); cache[k] = v; return v; },
    set(k, v) {
      if (v.length > CHUNK * PARTS) throw new Error("size");
      const parts = []; for (let i = 0; i < PARTS; i++) parts.push(v.slice(i * CHUNK, (i + 1) * CHUNK));
      let r = rowOf(k); if (r < 0) { r = sh.getLastRow() + 1; K.push(k); }
      sh.getRange(r, 1, 1, PARTS + 2).setValues([[k, new Date().toISOString()].concat(parts)]); cache[k] = v;
    },
    del(k) { const r = rowOf(k); if (r > 0) { sh.deleteRow(r); K = keys(); } delete cache[k]; },
    list(p) { return K.filter(k => k.indexOf(p) === 0).sort(); }
  };
}
function rand_(n) { let s = ""; while (s.length < n) s += Utilities.getUuid().replace(/-/g, ""); return s.slice(0, n); }
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function prop_(k) { return PropertiesService.getScriptProperties().getProperty(k); }
function env_() { return { kv: kv_(), now: () => new Date().toISOString(), rand: rand_, seed: SEED, data: MQ_SEED, server: true, agentReady: false }; }

function doPost(e) {
  let req = {};
  try { req = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (x) { return out_({ ok: false, code: "bad", error: "طلب غير صالح." }); }
  const lock = LockService.getScriptLock();
  try { lock.waitLock(20000); return out_(mqHandle(req, env_())); }
  catch (x) { return out_({ ok: false, code: "server", error: "تعذّر تنفيذ الطلب على الخادم. أعد المحاولة بعد قليل." }); }
  finally { try { lock.releaseLock(); } catch (y) { } }
}
function doGet() { return out_({ ok: true, app: "marqab", time: new Date().toISOString() }); }

/* ---------- المهام المجدولة: الفحص اليومي والرصد الخارجي ---------- */
function dailyScan() {
  const env = env_(), kv = env.kv, P = k => { const v = kv.get(k); return v ? JSON.parse(v) : null; };
  const db = { now: new Date().toISOString().slice(0, 10) }; MQ_COLS.forEach(c => db[c] = P("col/" + c) || []);
  const A = MQE.alerts(db), prev = P("sys/scan") || { ids: [] }, fresh = A.filter(a => a.level >= 3 && prev.ids.indexOf(a.id) < 0);
  kv.set("sys/scan", JSON.stringify({ at: env.now(), ids: A.map(a => a.id), red: A.filter(a => a.level >= 3).length }));
  const to = prop_("NOTIFY_EMAILS");
  if (to && fresh.length) MailApp.sendEmail({ to: to, subject: "تنبيه عاجل من مرقب: " + fresh.length + " تنبيهات جديدة", body: fresh.map(a => "• " + a.title + "\n  " + a.reason + " · المسؤول: " + a.owner).join("\n\n") + "\n\nللتفاصيل افتح المنصة." });
}
function fetchFeeds() {
  const env = env_(), kv = env.kv, st = JSON.parse(kv.get("sys/settings") || "{}"), cards = JSON.parse(kv.get("col/cards") || "[]");
  const have = {}; cards.forEach(c => have[MQE.norm(c.title)] = 1); let added = 0;
  (st.feeds || []).forEach(f => {
    try {
      const xml = XmlService.parse(UrlFetchApp.fetch(f.url, { muteHttpExceptions: true }).getContentText()), root = xml.getRootElement(), ch = root.getChild("channel");
      const items = ch ? ch.getChildren("item") : root.getChildren("entry", root.getNamespace());
      const kws = String(f.kw || "").split(/[,،]/).map(s => s.trim()).filter(Boolean);
      items.slice(0, 25).forEach(it => {
        const title = (it.getChildText("title") || it.getChildText("title", root.getNamespace()) || "").trim(); if (!title || have[MQE.norm(title)]) return;
        if (kws.length && !kws.some(k => MQE.norm(title).indexOf(MQE.norm(k)) >= 0)) return;
        const k = MQE.classify(title, { cards: cards, topics: JSON.parse(kv.get("col/topics") || "[]"), indicators: [], docs: [], decisions: [] });
        cards.unshift({ id: "c" + rand_(8), title: title.slice(0, 200), date: new Date().toISOString().slice(0, 10), source: f.name, srcType: "ext", rel: f.rel || "C", cred: 3, pestel: k.pestel, topic: k.topic, sector: k.sector, impact: k.impact, dir: k.dir, cls: 1, status: "new", links: [], conflicts: [], analysis: (it.getChildText("description") || "").replace(/<[^>]+>/g, " ").slice(0, 600), by: "u1", upd: env.now() });
        have[MQE.norm(title)] = 1; added++;
      });
    } catch (x) { }
  });
  if (added) kv.set("col/cards", JSON.stringify(cards.slice(0, 2000)));
}
/* شغّل هذه الدالة مرة واحدة من المحرر لتفعيل الفحص اليومي والرصد كل ست ساعات */
function setupSchedules() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("dailyScan").timeBased().everyDays(1).atHour(6).create();
  ScriptApp.newTrigger("fetchFeeds").timeBased().everyHours(6).create();
}
