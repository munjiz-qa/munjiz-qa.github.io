// إعدادات موقع منجز. عدّل هذا الملف فقط عند تغيير الرقم أو البريد أو بعد تشغيل خادم نظام العملاء.
// API: رابط تطبيق Google Apps Script بعد نشره (ينتهي بـ /exec). اتركه فارغاً ليعمل الموقع بدون خادم:
//   نموذج الطلب يجهز رسالة واتساب أو بريد فقط، و«حسابي» ينتظر تشغيل الخادم، ولوحة الإدارة تحفظ البيانات في متصفح هذا الجهاز.
window.MUNJIZ_CONFIG = {
  API: "https://script.google.com/macros/s/AKfycbx-GRnFTT0imyz_QO7wr19dXuQm8kk7svgyWkHfnCPkaP9nFT0Y9obVc1szH6uFvND8/exec",
  WHATSAPP: "97451600498",
  PHONE: "+974 51600498",
  EMAIL: "munijizqa@gmail.com"
};

// الوضع التجريبي أُلغي: نمسح أي بيانات تجريبية بقيت في متصفح زائر سابق
try{['munjiz_demo','munjiz_demo_db','munjiz_demo_mail'].forEach(k=>localStorage.removeItem(k))}catch(e){}
