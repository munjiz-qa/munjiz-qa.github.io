#!/usr/bin/env python3
"""«خبر»: بوابة التحقق للقسم العسكري (data/military.json) وملفات الحروب (data/wars.json).

القاعدة الدائمة (17 نوفمبر 2026): كل خبر وكل مدخل في الخط الزمني والتفاوض والملخص والأثر الاقتصادي
يُؤيَّد من جهتين مستقلتين على الأقل (نطاقان مختلفان)، ولكل مصدر رابط https أصلي وتاريخ.
الرقم في بطاقة الحرب يقبل جهتين مستقلتين، أو جهة رسمية أولية واحدة (الأمم المتحدة، حلف الأطلسي، SIPRI، موقع حكومي).
ما لا يستوفي القاعدة يُحذف مع --enforce ويُسجَّل سبب حذفه. ثم يُحسب مؤشر التصعيد لكل حرب من الحوادث الموثّقة.

الاستخدام: python3 khabar/agent/military.py [--enforce] [--quiet]
"""
import json, sys, re, datetime
from pathlib import Path
from urllib.parse import urlparse

DATA = Path(__file__).resolve().parent.parent / 'data'
OFFICIAL = re.compile(r'(^|\.)(un\.org|ohchr\.org|unhcr\.org|nato\.int|sipri\.org|europa\.eu|gov|gov\.[a-z]{2}|mod\.[a-z.]+|defense\.gov|state\.gov)$')
LEVELS = [(2, 'escalation'), (1, 'tense'), (0, 'calm')]
ORDER = ['europe', 'mideast', 'world']

def doha_today():
    return (datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None) + datetime.timedelta(hours=3)).date()

def outlet(url):
    h = (urlparse(url).hostname or '').lower()
    h = re.sub(r'^(www|amp|m|en|english|live)\.', '', h)
    parts = h.split('.')
    # نطاق الجهة: آخر جزأين (أو ثلاثة لنطاقات مثل co.uk وcom.au)
    return '.'.join(parts[-3:]) if len(parts) > 2 and parts[-2] in ('co', 'com', 'org', 'net', 'gov') else '.'.join(parts[-2:])

def src_ok(sources, sid):
    s = sources.get(sid)
    return bool(s and str(s.get('url', '')).startswith('https://') and re.match(r'^\d{4}-\d{2}-\d{2}$', str(s.get('date', ''))) and (s.get('ar') or s.get('en')))

def outlets(sources, ids):
    return {outlet(sources[i]['url']) for i in ids or [] if src_ok(sources, i)}

def two(sources, ids):
    return len(outlets(sources, ids)) >= 2

def fig_ok(sources, ids):
    o = outlets(sources, ids)
    return len(o) >= 2 or any(OFFICIAL.search(x) for x in o)

def check_military(m, dropped):
    S = m.get('sources', {})
    ids = [r.get('id') for r in m.get('regions', [])]
    if [i for i in ORDER if i in ids] != [i for i in ids if i in ORDER]:
        dropped.append({'where': 'military', 'text': 'ترتيب الدوائر', 'reason': 'الترتيب الثابت: أوروبا ثم الشرق الأوسط ثم العالم'})
    m['regions'].sort(key=lambda r: ORDER.index(r['id']) if r['id'] in ORDER else 9)
    for r in m.get('regions', []):
        keep = []
        for it in r.get('items', []):
            if (it.get('ar') or it.get('en')) and two(S, it.get('src')): keep.append(it)
            else: dropped.append({'where': 'military/' + r['id'], 'text': (it.get('ar') or it.get('en') or '')[:140], 'reason': 'أقل من جهتين مستقلتين موثّقتين'})
        r['items'] = keep
        for it in keep: it['outlets'] = len(outlets(S, it['src']))
        if r.get('analysis') and not all(src_ok(S, s) for s in r['analysis'].get('src', [])): r.pop('analysis')
    m['arms'] = [a for a in m.get('arms', []) if two(S, a.get('src')) or dropped.append({'where': 'military/arms', 'text': a.get('ar', '')[:140], 'reason': 'أقل من جهتين مستقلتين موثّقتين'})]
    for a in m['arms']: a['outlets'] = len(outlets(S, a['src']))
    return m

def check_wars(w, dropped):
    S = w.get('sources', {}); today = doha_today()
    for war in w.get('wars', []):
        name = war.get('name', {}).get('ar', war.get('id'))
        def flt(key, test=two):
            out = []
            for e in war.get(key) or []:
                if test(S, e.get('src')): e['outlets'] = len(outlets(S, e['src'])); out.append(e)
                else: dropped.append({'where': f'wars/{war["id"]}/{key}', 'text': (e.get('ar') or '')[:140], 'reason': 'أقل من جهتين مستقلتين موثّقتين'})
            war[key] = out
        flt('timeline'); flt('talks'); flt('figures', fig_ok)
        war['timeline'].sort(key=lambda e: e['date'], reverse=True)
        war['timeline'] = war['timeline'][:60]
        war['talks'].sort(key=lambda e: e['date'], reverse=True)
        for key in ('summary', 'economy'):
            if war.get(key) and not two(S, war[key].get('src')):
                dropped.append({'where': f'wars/{war["id"]}/{key}', 'text': war[key].get('ar', '')[:140], 'reason': 'أقل من جهتين مستقلتين موثّقتين'}); war[key] = None
        if war.get('since') and not two(S, war.get('since_src')): war['since'] = None
        # مؤشر التصعيد: عدد الحوادث الموثّقة (هجمات) في آخر 3 أيام بتوقيت الدوحة
        since = (today - datetime.timedelta(days=2)).isoformat()
        n = sum(1 for e in war['timeline'] if e.get('kind') == 'attack' and e['date'] >= since)
        war['level'] = next(l for k, l in LEVELS if n >= k)
        war['incidents_3d'] = n
        war['last'] = war['timeline'][0]['date'] if war['timeline'] else None
    return w

def prune(doc):
    used = set()
    def walk(x):
        if isinstance(x, dict):
            for k, v in x.items():
                if k in ('src', 'since_src', 'parties_src') and isinstance(v, list): used.update(v)
                else: walk(v)
        elif isinstance(x, list):
            for v in x: walk(v)
    walk({k: v for k, v in doc.items() if k != 'sources'})
    missing = sorted(u for u in used if u not in doc['sources'])
    doc['sources'] = {k: v for k, v in doc['sources'].items() if k in used}
    return missing

def main():
    enforce = '--enforce' in sys.argv; quiet = '--quiet' in sys.argv
    dropped, bad = [], []
    for name, fn in (('military.json', check_military), ('wars.json', check_wars)):
        p = DATA / name
        if not p.exists(): continue
        doc = json.loads(p.read_text(encoding='utf-8'))
        before = len(dropped)
        doc = fn(doc, dropped)
        miss = prune(doc)
        if miss: bad.append(f'{name}: مصادر مفقودة {miss}')
        if enforce: p.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        if not quiet: print(f'{name}: حُذف {len(dropped) - before}، مصادر {len(doc["sources"])}')
    for d in dropped: print('  ✗', d['where'], '·', d['reason'], '·', d['text'])
    rep = DATA / 'military-check.json'
    # تقرير الحذف يُكتب فقط حين يتغير، حتى لا يلتزم الطيار الآلي كل ساعة بلا جديد
    try: old = json.loads(rep.read_text(encoding='utf-8')).get('dropped')
    except Exception: old = None
    if enforce and old != dropped: rep.write_text(json.dumps({'checked': datetime.datetime.now(datetime.timezone.utc).replace(tzinfo=None).strftime('%Y-%m-%dT%H:%M:%SZ'), 'dropped': dropped}, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    if bad:
        print('\n'.join(bad)); sys.exit(1)
    if dropped and not enforce: sys.exit(2)

if __name__ == '__main__':
    main()
