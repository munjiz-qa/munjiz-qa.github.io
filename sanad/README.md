# سند من منجز

صفحة خدمة «سند» ضمن موقع منجز: https://munjiz-qa.github.io/sanad/ و https://munjiz-qa.github.io/sanad/en/

- النصوص بالعربية والإنجليزية في `scripts/sanad-build.mjs` (الكائن C). بعد التعديل: `node scripts/sanad-build.mjs` ثم ارفع الملفات.
- الرقم والبريد وخادم الطلبات تُقرأ من `assets/config.js` الخاص بمنجز، فلا تُكرَّر هنا.
- نموذج الطلب يرسل `action: "request"` إلى خادم منجز بنوع «سند من منجز» ومرجع يبدأ بـ `SQ-`، فيظهر الطلب في لوحة منجز (crm.html). عند تعذّر الخادم يعرض زرّي واتساب والبريد بنص الطلب جاهزاً.
- الشعار: `assets/mark.svg` (ملوّن) و`assets/mark-mono.svg` (لون واحد).
