// إعدادات منصة غرسة.
// API: خادم استقبال طلبات «اطلب خدمة» (Google Apps Script ينتهي بـ /exec)، وتصل بنوع «غرسة للزراعة المنزلية».
// SUPABASE_URL و SUPABASE_KEY: قاعدة بيانات محتوى الموقع التي تحفظ فيها لوحة الإدارة (admin.html) تعديلاتها لكل الزوار.
//   اتركهما فارغين لتعمل لوحة الإدارة على متصفح هذا الجهاز فقط. المفتاح هنا هو المفتاح العام (publishable) فقط.
window.GHARSA_CONFIG = {
  API: "https://script.google.com/macros/s/AKfycbx-GRnFTT0imyz_QO7wr19dXuQm8kk7svgyWkHfnCPkaP9nFT0Y9obVc1szH6uFvND8/exec",
  SUPABASE_URL: "",
  SUPABASE_KEY: ""
};
