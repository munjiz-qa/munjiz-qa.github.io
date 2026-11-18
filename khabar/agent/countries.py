#!/usr/bin/env python3
"""«خبر»: بوابة التحقق لقسم «الأوضاع في الدول» (data/countries.json والملف التحريري data/countries-editorial.json).

القاعدة الدائمة (17 نوفمبر 2026):
- كل خبر وكل مدخل في الخط الزمني من جهتين مستقلتين على الأقل (نطاقان مختلفان، ونسخ الوكالة الواحدة جهة واحدة)، ولكل مصدر رابط https أصلي وتاريخ.
- عدد المتظاهرين لا يُنشر إلا إذا ذكرته جهتان مستقلتان، وإلا يُحذف العدد ويبقى الخبر.
- كل مدخل تحريري (الصورة العامة، محور، حقيقة، علاقة خارجية، حدث في الخط الزمني) بمصدرين مستقلين، وإلا يُحذف.
- يُعاد حساب «جهات» كل خبر من مصادره، ولا يُعرض مؤشر استقرار لدولة بلا أخبار كافية.
ما لا يستوفي القاعدة يُحذف مع --enforce ويُسجَّل سببه في data/countries-check.json.

الاستخدام: python3 khabar/agent/countries.py [--enforce] [--quiet]
"""
import json, re, sys
from datetime import datetime, timezone
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from military import outlet, WIRES  # noqa: E402

DATA = Path(__file__).resolve().parent.parent / 'data'
ARGS = set(sys.argv[1:])
DROPS = []


def party(name, url):
    o = outlet(url)
    for w, rx in WIRES:
        if re.search(rx, str(name)) or re.search(rx, o):
            return w
    return o


def ok_src(s):
    return isinstance(s, dict) and str(s.get('url', '')).startswith('https://') and re.match(r'^\d{4}-\d{2}-\d{2}$', str(s.get('date', ''))) and (s.get('name') or s.get('ar') or s.get('en'))


def parties(sources):
    good = [s for s in sources if ok_src(s)]
    return {party(s.get('name') or s.get('en') or s.get('ar'), s['url']) for s in good}, good


def check_live():
    p = DATA / 'countries.json'
    if not p.exists():
        return None
    d = json.loads(p.read_text())
    for cid, c in d.get('countries', {}).items():
        for key in ('items', 'timeline', 'protests', 'hotspots'):
            keep = []
            for it in c.get(key, []):
                if key == 'hotspots':
                    # نقطة التوتر مشتقة من خبر منشور: تبقى فقط إن بقي خبرها
                    if any(i['id'] == it['id'] for i in c.get('items', [])):
                        keep.append(it)
                    continue
                ps, good = parties(it.get('sources', []))
                if len(ps) < 2:
                    DROPS.append(f'{cid}.{key}: {it.get("title", "")[:70]} ← أقل من جهتين مستقلتين')
                    continue
                it['sources'] = good
                it['outlets'] = len(ps)
                if key == 'protests' and it.get('size'):
                    if len(it['size'].get('phrases', [])) < 2:
                        DROPS.append(f'{cid}.protests: عدد «{it["title"][:40]}» ← ذكرته جهة واحدة')
                        it['size'] = None
                keep.append(it)
            c[key] = keep
        c['counts'] = {k: sum(1 for i in c['items'] if i['axis'] == k) for k in c.get('counts', {})}
    return d


def check_editorial():
    p = DATA / 'countries-editorial.json'
    if not p.exists():
        return None
    e = json.loads(p.read_text())
    S = e.get('sources', {})

    def two(ids):
        ss = [dict(S[i], name=S[i].get('en') or S[i].get('ar')) for i in ids or [] if i in S]
        return len(parties(ss)[0]) >= 2

    for cid, c in e.get('countries', {}).items():
        for key in ('summary',):
            if c.get(key) and not two(c[key].get('src')):
                DROPS.append(f'editorial.{cid}.{key} ← أقل من جهتين'); c[key] = None
        for ax, v in list((c.get('axes') or {}).items()):
            if not two(v.get('src')):
                DROPS.append(f'editorial.{cid}.axes.{ax} ← أقل من جهتين'); del c['axes'][ax]; continue
            pts = []
            for x in v.get('points', []):
                if two(x.get('src')): pts.append(x)
                else: DROPS.append(f'editorial.{cid}.{ax}: {x.get("ar", "")[:50]} ← أقل من جهتين')
            v['points'] = pts
        for key in ('facts', 'relations', 'timeline'):
            keep = []
            for x in c.get(key, []):
                if two(x.get('src')): keep.append(x)
                else: DROPS.append(f'editorial.{cid}.{key}: {str(x.get("ar") or x.get("k", ""))[:50]} ← أقل من جهتين')
            c[key] = keep
    used = set()
    for c in e.get('countries', {}).values():
        for x in [c.get('summary')] + list((c.get('axes') or {}).values()) + [p for v in (c.get('axes') or {}).values() for p in v.get('points', [])] + c.get('facts', []) + c.get('relations', []) + c.get('timeline', []):
            if x: used.update(x.get('src', []))
    bad = [k for k, s in S.items() if k in used and not ok_src(dict(s, name=s.get('en') or s.get('ar')))]
    for k in bad:
        DROPS.append(f'editorial.sources.{k} ← رابط أو تاريخ غير صالح')
    return e


d, e = check_live(), check_editorial()
if '--enforce' in ARGS:
    if d is not None:
        (DATA / 'countries.json').write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
    if e is not None:
        (DATA / 'countries-editorial.json').write_text(json.dumps(e, ensure_ascii=False, indent=1) + '\n')
    (DATA / 'countries-check.json').write_text(json.dumps({'checked': datetime.now(timezone.utc).isoformat(timespec='seconds'), 'dropped': DROPS[:200]}, ensure_ascii=False, indent=1) + '\n')
n = sum(len(c['items']) for c in (d or {}).get('countries', {}).values())
print(f'الأوضاع في الدول: {n} خبراً بعد الفحص، حُذف {len(DROPS)}.')
if '--quiet' not in ARGS:
    for x in DROPS[:60]:
        print(' ✗', x)
