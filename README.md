# منجز لخدمات الأعمال ذ.م.م | Munjiz Business Services LLC

الموقع الرسمي لمنجز: https://munjiz-qa.github.io (العربية) و https://munjiz-qa.github.io/en/ (English).
ملفات ثابتة تُنشر تلقائياً على GitHub Pages من الفرع main.

- `assets/data.js`: الخدمات والأسعار والباقات
- `assets/details.js`: تفاصيل كل خدمة بالعربية والإنجليزية
- `assets/stamp.svg`: ختم منجز المستخدم في عروض الأسعار
- رقم واتساب والبريد في `MUNJIZ_CONFIG` آخر كل صفحة
- `sanad/`: صفحة «سند من منجز» (https://munjiz-qa.github.io/sanad/). النصوص في `scripts/sanad-build.mjs`، وبعد تعديلها شغّل `node scripts/sanad-build.mjs`. الطلبات تصل إلى نظام عملاء منجز بنوع «سند من منجز»
- `sanad/app/`: تطبيق «سند» المستقل (https://munjiz-qa.github.io/sanad/app/). يعمل من المتصفح وحده دون Claude ودون خادم: الحسابات والصلاحيات والحجوزات والمساعد المدمج في `local-backend.js` و`assistant.js`، والبيانات في متصفح كل جهاز. يُبنى من حزمة سند المحمولة (`node build.js` ثم انسخ `dist/web/`). الحسابات الافتراضية: المدير الشامل `admin@sanad.local` والعميل `client@sanad.local`.
