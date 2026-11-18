#!/usr/bin/env python3
"""«عبدو نيوز»: بوابة التحقق للأقسام الموضوعية (data/desks.json) ومدخلات المحرر (data/editorial.json).

القاعدة الدائمة (17 نوفمبر 2026):
- كل خبر في الأقسام من جهتين مستقلتين على الأقل (نطاقان مختلفان، ونسخ الوكالة الواحدة جهة واحدة)، ولكل مصدر رابط https أصلي وتاريخ.
- كل حكم في مدقّق الشائعات يحمله نص المصادر نفسها (لغة تحقق صريحة)، وإلا يُحذف الادعاء.
- كل سعر صرف أو ذهب اتفق عليه مزوّدان بفارق لا يزيد على 1.5٪، وكل نتيجة رياضية تطابقت لدى مزوّدين.
- مدخلات المحرر (الوقود، الأجندة، «اشرح لي»، رقم اليوم) بمصدرين مستقلين لكل مدخل.
ما لا يستوفي القاعدة يُحذف مع --enforce ويُسجَّل سببه.

الاستخدام: python3 khabar/agent/desks.py [--enforce] [--quiet]
"""
import json, re, sys
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
    return str(s.get('url', '')).startswith('https://') and re.match(r'^\d{4}-\d{2}-\d{2}$', str(s.get('date', ''))) and s.get('name')

def two(sources):
    good = [s for s in sources if ok_src(s)]
    return len({party(s['name'], s['url']) for s in good}) >= 2, good

VERDICT = {'false': r'كاذب|زائف|مفبرك|مزيف|مزيّف|غير صحيح|لا صحة|عار[ٍي]? (تماما|من الصحة)|شائعة|fake (video|image|photo|news|post|quote)|false claim|debunk|no evidence|is (fake|false)',
           'misleading': r'مضلل|مجتزأ|خارج سياق|misleading (claim|video|post|image)|out of context|old video|miscaptioned|digitally altered',
           'true': r'صحيح|حقيقي|تؤكد صحة|\btrue\b|confirmed|accurate'}

def check_desks():
    p = DATA / 'desks.json'
    if not p.exists():
        return None
    d = json.loads(p.read_text())
    for did, desk in d.get('desks', {}).items():
        keep = []
        for it in desk.get('items', []):
            good2, good = two(it.get('sources', []))
            why = None
            if not good2: why = 'أقل من جهتين مستقلتين'
            elif did == 'rumors' and re.search(r'hoax (bomb|call|threat)|bomb hoax|special counsel|indictment|lawsuit|accuses|sues', it.get('title', ''), re.I):
                why = 'ليس تدقيقاً لادعاء'
            elif did == 'rumors':
                txt = ' | '.join(s.get('title', '') for s in good) or it.get('title', '')
                if it.get('verdict') not in VERDICT or not re.search(VERDICT[it['verdict']], txt, re.I): why = 'حكم لا تحمله المصادر'
            if why:
                DROPS.append(f'{did}: {it.get("title", "")[:70]} ← {why}')
            else:
                it['sources'] = good; it['outlets'] = len({party(s['name'], s['url']) for s in good}); keep.append(it)
        desk['items'] = keep
    r = d.get('rates') or {}
    for c, v in list((r.get('fx') or {}).items()):
        if len(set(v.get('by', []))) < 2 or v.get('diff', 99) > 1.5:
            DROPS.append(f'fx {c}: مزوّد واحد أو فارق كبير'); del r['fx'][c]
    if r.get('gold') and (len(set(r['gold'].get('by', []))) < 2 or r['gold'].get('diff', 99) > 1.5):
        DROPS.append('gold: مزوّد واحد أو فارق كبير'); r['gold'] = None; d.pop('number', None)
    for m in (d.get('sports') or {}).get('matches', []):
        if len(set(m.get('by', []))) < 2:
            DROPS.append(f'sports {m.get("home")}-{m.get("away")}: مزوّد واحد'); m['drop'] = True
        elif 'hs' in m and m.get('pending'):
            m.pop('hs'); m.pop('as', None)
    if d.get('sports'):
        d['sports']['matches'] = [m for m in d['sports']['matches'] if not m.get('drop')]
    return d

def check_editorial():
    p = DATA / 'editorial.json'
    if not p.exists():
        return None
    e = json.loads(p.read_text())
    for key in ('fuel', 'agenda', 'explain'):
        keep = []
        for x in e.get(key, []):
            good2, good = two(x.get('sources', []))
            if good2:
                x['sources'] = good; keep.append(x)
            else:
                DROPS.append(f'editorial.{key}: {str(x.get("ar") or x.get("title_ar") or x.get("country", {}).get("ar", ""))[:60]} ← أقل من جهتين')
        e[key] = keep
    n = e.get('number')
    if n and not two(n.get('sources', []))[0]:
        DROPS.append('editorial.number ← أقل من جهتين'); e['number'] = None
    return e

d, e = check_desks(), check_editorial()
if '--enforce' in ARGS:
    if d is not None: (DATA / 'desks.json').write_text(json.dumps(d, ensure_ascii=False, indent=1) + '\n')
    if e is not None: (DATA / 'editorial.json').write_text(json.dumps(e, ensure_ascii=False, indent=1) + '\n')
n = sum(len(x['items']) for x in (d or {}).get('desks', {}).values())
print(f'الأقسام: {n} خبراً بعد الفحص، حُذف {len(DROPS)}.')
if '--quiet' not in ARGS:
    for x in DROPS[:60]: print(' ✗', x)
