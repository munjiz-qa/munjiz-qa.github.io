// الأسعار الافتراضية لبراق (بالدولار): مأخوذة من صفحة BQ-10 v3 ومخطط التحويل ومعدات الورشة.
// pub = سعر منشور من المورد، calc = إجمالي محسوب من أسعار منشورة، est = تقدير هندسي.
export const CATALOG = [
  { code: "BQ-10 MAX", name: "طقم براق BQ-10 الأقصى · 8 وحدات 81 kWh · مدى مختلط حتى 540 كم", cat: "أطقم كاملة", price: 12314, kind: "calc" },
  { code: "BQ-10 BAL", name: "طقم براق BQ-10 المتوازن · 4 وحدات 40.5 kWh · مدى مختلط 285 كم", cat: "أطقم كاملة", price: 9324, kind: "calc" },
  { code: "BQ-D60", name: "محرك PMSM ‏32/60 kW مع المتحكم 250–450 V", cat: "المحركات", price: 1500, kind: "pub" },
  { code: "BQ-D100", name: "محرك PMSM ‏50/100 kW مع المتحكم", cat: "المحركات", price: 3200, kind: "est" },
  { code: "BQ-D150", name: "محرك PMSM ‏75/150 kW مع المتحكم", cat: "المحركات", price: 4800, kind: "est" },
  { code: "BQ-D200", name: "دفع مزدوج 2 × PMSM ‏50/100 kW", cat: "المحركات", price: 6400, kind: "est" },
  { code: "BQ-OBC3", name: "شاحن مدمج 3.3 kW", cat: "الشحن", price: 350, kind: "pub" },
  { code: "BQ-OBC6", name: "وحدة 3 في 1: شاحن 6.6 kW + محول DC-DC ‏2 kW", cat: "الشحن", price: 989, kind: "pub" },
  { code: "BQ-OBC11", name: "شاحن 11 kW ثلاثي الطور مع المحول", cat: "الشحن", price: 1650, kind: "est" },
  { code: "BQ-CRADLE", name: "حامل المحرك القابل للضبط BQ-Cradle", cat: "التثبيت", price: 180, kind: "est" },
  { code: "BQ-EPS", name: "توجيه كهربائي EPS", cat: "الأنظمة المساعدة", price: 155, kind: "pub" },
  { code: "BQ-K250", name: "مرحّل الجهد العالي Hongfa HFE82V-250C", cat: "الجهد العالي", price: 35, kind: "pub" },
  { code: "WS-BASIC", name: "تجهيز ورشة التحويل · الباقة الأساسية", cat: "معدات الورشة", price: 5459, kind: "calc" },
  { code: "WS-MID", name: "تجهيز ورشة التحويل · الباقة المتوسطة", cat: "معدات الورشة", price: 10510, kind: "calc" },
  { code: "WS-PRO", name: "تجهيز ورشة التحويل · الباقة الاحترافية", cat: "معدات الورشة", price: 36992, kind: "calc" }
];
export const KIND = { pub: "سعر منشور", calc: "إجمالي محسوب", est: "تقدير" };
export const CONTENT = {
  annText: "", annUrl: "", annOn: false,
  pricesTitle: "قائمة أسعار براق",
  pricesLead: "أسعار المصنع بالدولار الأمريكي دون الشحن والجمارك والتركيب ما لم يُذكر غير ذلك. لعرض سعر نهائي لسيارتك سجّل دخولك واطلب عرضاً من حسابك.",
  pricesOn: true
};
