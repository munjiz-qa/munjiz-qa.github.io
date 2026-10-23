# خبر | Khabar

خلاصة يومية موثّقة لأخبار قطر والخليج ومصر والعالم، مع تحليل واستقراء وخريطة للأحداث القادمة.
الرابط: https://munjiz-qa.github.io/khabar/ · لوحة الإدارة: https://munjiz-qa.github.io/khabar/admin/

- `data/brief.json`: الخلاصة الحالية (صباح أو مساء). كل خبر يحمل `src` يشير إلى `sources` (اسم المصدر، التاريخ، الرابط). لا يُنشر خبر دون مصدر.
- `data/archive/`: نسخة من كل خلاصة، و`index.json` قائمة الأرشيف.
- `data/headlines.json`: عناوين آلية لكل دائرة، يحدّثها `scripts/headlines.mjs` عبر `.github/workflows/khabar.yml` كل 3 ساعات.
- `data/admin.json`: الخبر العاجل والأخبار المخفية وكلمة مرور الإدارة المشفّرة، وتعدّله لوحة الإدارة.
- `assets/config.js`: بيانات التواصل.
