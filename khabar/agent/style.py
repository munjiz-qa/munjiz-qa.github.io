#!/usr/bin/env python3
"""«عبدو نيوز»: الفحص الأسلوبي الآلي وفق khabar/STYLE.md.

يفحص خلاصة (brief.json أو ملف أرشيف) أو تقريراً خاصاً (data/special/<id>.json):
العناوين، طول المقدمة والخبر، العبارات الممنوعة، توحيد الأرقام والأوقات والعملات، وطول الخيط.

الاستخدام:
  python3 khabar/agent/style.py khabar/data/brief.json            # تقرير بالأخطاء والتنبيهات
  python3 khabar/agent/style.py khabar/data/brief.json --enforce  # يخرج برمز 1 إن وُجد خطأ
  python3 khabar/agent/style.py --json FILE                        # النتيجة JSON

الخطأ (error) يمنع النشر مع --enforce. التنبيه (warn) يُصلَح إن أمكن ولا يمنع.
الخلاصة الآلية (auto: true) تُفحص بقواعد العنوان فقط، لأن نصها عنوان الناشر.
"""
import json
import re
import sys

BANNED = [
    (r'تجدر الإشارة', 'حشو'), (r'الجدير بالذكر', 'حشو'), (r'(?:^|\s)يُ?ذكر أن', 'حشو'),
    (r'في سياق متصل', 'حشو'), (r'من جهة أخرى', 'حشو'), (r'من ناحية أخرى', 'حشو'), (r'على صعيد آخر', 'حشو'),
    (r'بشكل (?:كبير|ملحوظ|عام|لافت)', 'تعميم: اكتب الرقم أو الوصف الدقيق'),
    (r'(?:^|\s)(?:العديد|الكثير) من', 'تعميم: اكتب العدد أو «عدد من»'),
    (r'(?:^|\s)(?:قام|قامت|يقوم|تقوم) ب', 'استعمل الفعل مباشرة'),
    (r'في خطوة (?:لافتة|مفاجئة|غير مسبوقة)', 'إنشاء'), (r'في رسالة (?:واضحة|عن|إلى|قوية)', 'إنشاء'),
    (r'صفيح ساخن', 'إنشاء'), (r'يلتقط أنفاسه|تلتقط أنفاسها|يلتقط الذهب أنفاسه', 'إنشاء'), (r'ناقوس الخطر', 'إنشاء'),
    (r'(?:^|\s)(?:عاجل|شاهد|بالفيديو|بالصور|صادم|لن تصدق|تعرف على|تعرّف على|إليك)(?:\s|$|:)', 'إثارة'),
    (r'(?:^|\s)تم (?!ذلك)', 'مبني للمجهول: سمِّ الفاعل'),
    (r'(?:^|\s)حيث (?!يقع|تقع)', '«حيث» رابطاً: استعمل «إذ» أو جملة جديدة'),
    (r'!', 'علامة تعجب'),
]
BANNED_EN = [(r'\b(?:breaking|shocking|you won\'t believe|watch:)\b', 'clickbait'), (r'!', 'exclamation mark')]
CUR = r'(دولار|جنيه|ريال|درهم|دينار|يورو)'


def words(s):
    return len(re.findall(r'\S+', s or ''))


def sentences(s):
    return [x for x in re.split(r'(?<=[.!؟?؛])\s+', s or '') if x.strip()]


def check_text(s, where, out, lang='ar', lead_max=35, body_max=110, sent_max=40):
    if not s:
        return
    if lang == 'ar':
        for pat, why in BANNED:
            m = re.search(pat, s)
            if m:
                out.append(('warn' if why.startswith(('مبني', '«حيث»')) else 'error', where, f'عبارة ممنوعة ({why}): «{m.group(0).strip()}»'))
        if re.search(r'[−–]\s?\d|(?<![\d\w])[+]\d', s):
            out.append(('error', where, 'إشارة + أو − في النثر: اكتب «بارتفاع» أو «بتراجع»'))
        if re.search(r'\b\d{4}\s*(?:بتوقيت|GMT|غ)', s) or re.search(r'(?:الساعة|عند|حتى)\s+0\d{3}\b', s):
            out.append(('error', where, 'وقت بصيغة 0600: اكتب «6 صباحاً بتوقيت غرينتش»'))
        m = re.search(r'(?<![\d.,])(\d[\d,]*(?:\.\d+)?)\s+' + CUR + r'(?![اًاتا])\b', s)
        if m and not re.search(r'(?:مليون|مليار|ألف|تريليون)\s*$', s[:m.start(2)].rstrip()):
            n = float(m.group(1).replace(',', ''))
            if n >= 11 or '.' in m.group(1):
                out.append(('warn', where, f'العملة بعد الرقم منصوبة: «{m.group(1)} {m.group(2)}اً»'))
        if re.search(r'\s[،؛.:؟]', s):
            out.append(('warn', where, 'فراغ قبل علامة ترقيم'))
        if re.search(r'[؀-ۿ],\s', s):
            out.append(('warn', where, 'فاصلة لاتينية في نص عربي'))
        if '..' in s:
            out.append(('error', where, 'نقطتان «..»'))
        if re.search(r'[\u0621-\u064a]ـ[\u0621-\u064a]', s):
            out.append(('warn', where, 'تطويل «ـ»'))
    else:
        for pat, why in BANNED_EN:
            if re.search(pat, s, re.I):
                out.append(('error', where, why))
    if re.search(r'\s{2,}', s):
        out.append(('warn', where, 'فراغ مزدوج'))
    ss = sentences(s)
    if lang == 'ar' and lead_max and ss and words(ss[0]) > lead_max:
        out.append(('warn', where, f'المقدمة {words(ss[0])} كلمة (الحد {lead_max})'))
    if lang == 'ar' and sent_max:
        for x in ss[1:]:
            if words(x) > sent_max:
                out.append(('warn', where, f'جملة من {words(x)} كلمة (الحد {sent_max}): «{x[:50]}…»'))
    if body_max and words(s) > body_max * (1.25 if lang == 'en' else 1):
        out.append(('warn', where, f'النص {words(s)} كلمة (الحد {body_max})'))


def check_headline(h, where, out, lang='ar', required=True):
    if not h:
        if required:
            out.append(('error', where, f'لا عنوان ({lang})'))
        return
    n = words(h)
    if n < 4 or n > 14:
        out.append(('warn' if 3 <= n <= 16 else 'error', where, f'العنوان {n} كلمة (المعتمد 5–12): «{h}»'))
    if re.search(r'[?؟!]', h):
        out.append(('error', where, f'استفهام أو تعجب في العنوان: «{h}»'))
    if '..' in h or h.rstrip().endswith(('.', '…')):
        out.append(('error', where, f'نقطة أو «..» في العنوان: «{h}»'))
    check_text(h, where, out, lang, lead_max=0, body_max=0, sent_max=0)


def check_brief(b):
    out, auto = [], bool(b.get('auto'))
    th = (b.get('thread') or {})
    if not auto:
        n = words(th.get('ar'))
        if n > 90:
            out.append(('warn', 'thread', f'الخيط {n} كلمة (الحد 80)'))
        check_text(th.get('ar'), 'thread', out, lead_max=40, body_max=0)
    for z in b.get('zones') or []:
        for it in z.get('items') or []:
            w = f"{z['id']}/{it.get('id')}"
            h = it.get('h') or {}
            if auto:
                check_headline(it.get('ar'), w, out, 'ar', required=False)
                continue
            check_headline(h.get('ar'), w, out, 'ar')
            check_headline(h.get('en'), w, out, 'en')
            if h.get('ar') and it.get('ar', '').startswith(h['ar'][:25]):
                out.append(('warn', w, 'الفقرة تبدأ بنص العنوان نفسه'))
            check_text(it.get('ar'), w, out)
            check_text(it.get('en'), w + '/en', out, 'en')
            if len(set(it.get('src') or [])) < 2:
                out.append(('error', w, 'أقل من مصدرين'))
        if not auto:
            for k in ('analysis', 'technical'):
                if z.get(k):
                    check_text(z[k].get('ar'), f"{z['id']}/{k}", out, lead_max=45, body_max=90)
            for i, o in enumerate(z.get('outlook') or []):
                check_text(o.get('ar'), f"{z['id']}/outlook{i + 1}", out, lead_max=40, body_max=45)
    return out


def check_special(r):
    out = []
    t = (r.get('title') or {}).get('ar', '')
    if re.match(r'(أريد|أرجو|المعلومات المتيسرة|تقرير عن)', t):
        out.append(('error', 'title', 'العنوان نص الطلب لا اسم الموضوع'))
    if not (r.get('lead') or {}).get('ar'):
        out.append(('warn', 'lead', 'لا مقدمة للتقرير'))
    else:
        check_text(r['lead']['ar'], 'lead', out, lead_max=45, body_max=120)
    for i, p in enumerate((r.get('summary') or {}).get('ar') or []):
        check_text(p, f'summary{i + 1}', out, lead_max=45, body_max=70)
    for s in r.get('sections') or []:
        for it in s.get('items') or []:
            check_text(it.get('ar'), f"{s['id']}/{it.get('id')}", out, lead_max=40, body_max=110)
    return out


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print(__doc__)
        return 2
    total_err = 0
    res = {}
    for f in args:
        d = json.load(open(f, encoding='utf-8'))
        out = check_special(d) if 'sections' in d else check_brief(d)
        res[f] = [{'level': a, 'where': b, 'msg': c} for a, b, c in out]
        total_err += sum(1 for a, _, _ in out if a == 'error')
        if '--json' not in sys.argv:
            e = sum(1 for a, _, _ in out if a == 'error')
            print(f'{f}: {e} خطأ، {len(out) - e} تنبيه')
            for a, b, c in out:
                print(f"  {'✗' if a == 'error' else '·'} {b}: {c}")
    if '--json' in sys.argv:
        print(json.dumps(res, ensure_ascii=False, indent=1))
    return 1 if total_err and '--enforce' in sys.argv else 0


if __name__ == '__main__':
    sys.exit(main())
