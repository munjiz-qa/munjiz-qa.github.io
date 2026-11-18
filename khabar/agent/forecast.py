#!/usr/bin/env python3
"""بوابة تحقق قسم «التوقعات» (دون أي مكتبة خارجية).

- كل حدث في data/forecast/events.json يجب أن تؤكده جهتان مستقلتان على الأقل (نطاقان مختلفان، ونسخ وكالة واحدة جهة واحدة) بروابط https أصلية.
- كل مدخل في data/forecast.json يجب أن يحمل مصدراً واحداً على الأقل برابط https؛ النمو والتضخم والبطالة مؤسستان (صندوق النقد والبنك الدولي).
- الاحتمالات بين 0 و1، ومجموع التدهور والتحسن لا يتجاوز 1، ونطاق الثقة يحيط بالتقدير، والتنبيه «تقديرات لا أخبار» موجود.
مع --enforce يُحذف ما يخالف ذلك ويُكتب ما حُذف في data/forecast/check.json.
"""
import json, re, sys, os
from urllib.parse import urlparse

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
ENFORCE = '--enforce' in sys.argv
QUIET = '--quiet' in sys.argv
WIRE = re.compile(r'\((أسوشيتد برس|فرانس برس|رويترز|AP|AFP|Reuters)\)', re.I)
WIRE_ID = {'أسوشيتد برس': 'ap', 'فرانس برس': 'afp', 'رويترز': 'reuters'}


def outlet(u):
    h = urlparse(u).hostname or ''
    h = re.sub(r'^(www|amp|m|en|english|arabic)\.', '', h)
    p = h.split('.')
    if len(p) > 2 and p[-2] in ('co', 'com', 'org', 'net', 'gov'):
        return '.'.join(p[-3:])
    return '.'.join(p[-2:])


def party(s):
    m = WIRE.search(s.get('name') or '')
    if m:
        w = m.group(1)
        return 'wire:' + WIRE_ID.get(w, w.lower())
    return outlet(s.get('url') or '')


def two_sourced(sources):
    ps = set()
    for s in sources or []:
        u = s.get('url') or ''
        if not u.startswith('https://') or outlet(u).endswith('google.com'):
            continue
        ps.add(party(s))
    return len(ps) >= 2


def main():
    removed, problems = [], []
    evp = os.path.join(ROOT, 'forecast', 'events.json')
    fcp = os.path.join(ROOT, 'forecast.json')
    try:
        ev = json.load(open(evp, encoding='utf-8'))
    except Exception:
        ev = {'events': []}
    keep = []
    for e in ev.get('events', []):
        if two_sourced(e.get('sources')) and e.get('title') and e.get('c') and e.get('a'):
            keep.append(e)
        else:
            removed.append({'kind': 'event', 'id': e.get('id'), 'title': e.get('title'), 'why': 'أقل من جهتين مستقلتين'})
    ev['events'] = keep

    fc = json.load(open(fcp, encoding='utf-8'))
    if not (fc.get('disclaimer') or {}).get('ar'):
        problems.append('التنبيه «تقديرات لا أخبار» مفقود')
    for iso, c in (fc.get('countries') or {}).items():
        for k, v in list((c.get('inputs') or {}).items()):
            src = [s for s in (v.get('src') or []) if (s.get('url') or '').startswith('https://')]
            if not src or v.get('v') is None:
                removed.append({'kind': 'input', 'country': iso, 'input': k, 'why': 'مدخل بلا مصدر'})
                del c['inputs'][k]
                continue
            if k in ('growth', 'inflation', 'unemployment') and len({s.get('id') for s in src}) < 2:
                removed.append({'kind': 'input', 'country': iso, 'input': k, 'why': 'مؤشر اقتصادي من مؤسسة واحدة'})
                del c['inputs'][k]
        blocks = [('الإجمالي', c)] + [(a, x) for a, x in (c.get('aspects') or {}).items()]
        for name, x in blocks:
            pw, pb, ci = x.get('p_worse'), x.get('p_better'), x.get('ci') or [None, None]
            ok = all(isinstance(v, (int, float)) and 0 <= v <= 1 for v in (pw, pb, ci[0], ci[1])) and pw + pb <= 1.0001 and ci[0] <= pw <= ci[1]
            if not ok:
                problems.append(f'{iso}/{name}: احتمالات غير متسقة')
    report = {'checked': fc.get('updated'), 'events': len(keep), 'removed': removed, 'problems': problems}
    if ENFORCE:
        json.dump(ev, open(evp, 'w', encoding='utf-8'), ensure_ascii=False)
        open(evp, 'a', encoding='utf-8').write('\n')
        fc['events_count'] = len(keep)
        json.dump(fc, open(fcp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
        open(fcp, 'a', encoding='utf-8').write('\n')
        json.dump(report, open(os.path.join(ROOT, 'forecast', 'check.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if not QUIET or problems:
        print(f'التوقعات: {len(keep)} حدثاً موثّقاً، حُذف {len(removed)}، مشكلات {len(problems)}')
        for p in problems[:20]:
            print(' -', p)
    return 1 if problems and ENFORCE else 0


if __name__ == '__main__':
    sys.exit(main())
