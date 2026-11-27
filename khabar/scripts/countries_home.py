#!/usr/bin/env python3
"""«عبدو نيوز»: ملخص قسم «الأوضاع في الدول» للصفحة الرئيسية (data/countries-home.json).

الصفحة الرئيسية لا تعرض من ملف الدول الكامل (data/countries.json، أكثر من 1.5 م.ب) إلا شريط المؤشرات وأول خبر للدول التي يتابعها القارئ.
هذا السكربت يكتب نسخة مختصرة منه بعد بوابة التحقق: التعريفات (meta) ومؤشر كل دولة وعدّاتها وأول الأخبار بالترتيب نفسه.
لا يُضاف شيء ولا يُعدَّل: كل خبر في الملخص منسوخ كما هو من الملف الكامل بمصادره. صفحات الدول تحمّل الملف الكامل كما كانت.

الاستخدام: python3 khabar/scripts/countries_home.py  (يُشغَّل بعد khabar/agent/countries.py --enforce)
"""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / 'data'
KEEP = 12  # أول الأخبار لكل دولة: يكفي أول خبر بكل لغة بعد إخفاء ما يخفيه المدير

src = DATA / 'countries.json'
if src.exists():
    d = json.loads(src.read_text())
    out = {k: v for k, v in d.items() if k != 'countries'}
    out['lite'] = True
    out['countries'] = {cid: {'index': c.get('index', {}), 'counts': c.get('counts', {}), 'items': (c.get('items') or [])[:KEEP]}
                        for cid, c in (d.get('countries') or {}).items()}
    (DATA / 'countries-home.json').write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')) + '\n')
    print(f"ملخص الدول للرئيسية: {len(out['countries'])} دولة، {(DATA / 'countries-home.json').stat().st_size // 1024} ك.ب (الكامل {src.stat().st_size // 1024} ك.ب)")
