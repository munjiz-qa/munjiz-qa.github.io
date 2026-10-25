#!/usr/bin/env python3
"""«خبر»: بوّابة التحقق. تفحص الخلاصة قبل النشر وبعده، وتكتب سجل الشفافية data/ledger.json.

الفحوص:
  1. سلامة التوثيق: كل خبر وتحليل واستقراء ورقم سوق وموعد يحمل src موجوداً في sources،
     ولكل مصدر اسم وتاريخ YYYY-MM-DD ورابط https أصلي (لا روابط تحويل).
  2. الوصول: يفتح رابط كل مصدر ويسجل حالته (متاح، محجوب عن الفحص الآلي، معطّل).
  3. مطابقة الأرقام: كل رقم في نص الخبر يُبحث عنه في صفحات مصادره نفسها.
  4. تعدد المصادر: عدد المصادر وعدد الجهات المستقلة (النطاقات) لكل خبر.

الاستخدام:
  python3 khabar/agent/verify.py                # فحص كامل وكتابة السجل
  python3 khabar/agent/verify.py --offline      # دون فتح الروابط (سلامة التوثيق فقط)
  python3 khabar/agent/verify.py --enforce      # يحذف من brief.json كل خبر يخالف قاعدة التوثيق
لا يحتاج أي مكتبة خارجية.
"""
import argparse, concurrent.futures as cf, datetime as dt, html, json, re, sys, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / 'data'
UA = 'Mozilla/5.0 (compatible; KhabarVerifier/1.0; +https://munjiz-qa.github.io/khabar/)'
REDIRECTORS = ('news.google.com', 'google.com/url', 'bit.ly', 't.co/', 'lnkd.in', 'tinyurl.com')
DOHA = dt.timezone(dt.timedelta(hours=3))
AR_DIGITS = str.maketrans('٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹', '01234567890123456789')
# second-level public suffixes common in our sources (gov.qa, com.eg, co.uk, ...)
SLD = {'gov', 'com', 'org', 'net', 'edu', 'co', 'ac', 'mil', 'news'}


def now_doha():
    return dt.datetime.now(DOHA)


def outlet(url):
    host = urllib.parse.urlsplit(url).hostname or ''
    parts = host.lower().removeprefix('www.').split('.')
    if len(parts) >= 3 and parts[-2] in SLD:
        return '.'.join(parts[-3:])
    return '.'.join(parts[-2:])


def numbers(text):
    """الأرقام ذات الدلالة في نص (رقمان فأكثر)، بعد توحيد الأرقام العربية والفواصل."""
    t = text.translate(AR_DIGITS).replace('٬', ',').replace('٫', '.')
    out = []
    for m in re.finditer(r'\d[\d,]*(?:\.\d+)?', t):
        n = m.group().rstrip(',').replace(',', '')
        if n.endswith('.'):
            n = n[:-1]
        if len(n.replace('.', '')) >= 2:
            out.append(n)
    return list(dict.fromkeys(out))


def page_numbers(text):
    t = text.translate(AR_DIGITS).replace('٬', ',').replace('٫', '.').replace(' ', ' ')
    found = set()
    for m in re.finditer(r'\d[\d,. ]*\d|\d', t):
        raw = m.group()
        for piece in re.split(r'\s+', raw):
            n = piece.replace(',', '')
            found.add(n)
            if '.' in n:
                found.add(n.rstrip('0').rstrip('.'))
    return found


def strip_html(raw):
    raw = re.sub(r'(?is)<(script|style|noscript|svg)[^>]*>.*?</\1>', ' ', raw)
    raw = re.sub(r'(?s)<[^>]+>', ' ', raw)
    return re.sub(r'\s+', ' ', html.unescape(raw))


def fetch(url, timeout=20):
    try:
        req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': 'text/html,*/*', 'Accept-Language': 'ar,en;q=0.8'})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            body = r.read(3_000_000).decode(r.headers.get_content_charset() or 'utf-8', 'replace')
            return {'status': r.status, 'state': 'ok', 'text': strip_html(body)}
    except urllib.error.HTTPError as e:
        state = 'blocked' if e.code in (401, 403, 405, 406, 429, 451, 503) else 'broken'
        return {'status': e.code, 'state': state, 'text': ''}
    except Exception as e:  # DNS, TLS, timeout, proxy
        return {'status': 0, 'state': 'blocked', 'text': '', 'error': type(e).__name__}


def walk_refs(brief):
    """كل ما يحمل src في الخلاصة: (نوعه، معرفه، النص العربي، قائمة src)."""
    for z in brief.get('zones', []):
        for it in z.get('items', []):
            yield 'item', it.get('id'), it.get('ar', ''), it.get('src') or [], z['id']
        for key in ('analysis', 'technical'):
            if z.get(key):
                yield key, f"{z['id']}-{key}", z[key].get('ar', ''), z[key].get('src') or [], z['id']
        for i, o in enumerate(z.get('outlook') or []):
            yield 'outlook', f"{z['id']}-outlook-{i+1}", o.get('ar', ''), o.get('src') or [], z['id']
    for i, m in enumerate(brief.get('markets') or []):
        yield 'market', f"market-{i+1}", f"{m.get('ar','')} {m.get('value','')}", m.get('src') or [], None
    for i, r in enumerate(brief.get('roadmap') or []):
        yield 'roadmap', f"roadmap-{i+1}", r.get('ar', ''), r.get('src') or [], r.get('zone')
    if brief.get('thread'):
        yield 'thread', 'thread', brief['thread'].get('ar', ''), brief['thread'].get('src') or [], None


def source_problems(s, today):
    p = []
    url = (s or {}).get('url', '')
    if not s:
        return ['مصدر غير معرّف في sources']
    if not s.get('ar') or not s.get('en'):
        p.append('اسم المصدر ناقص')
    if not re.fullmatch(r'https://[^\s/]+\.[^\s]+', url):
        p.append('الرابط ليس https صالحاً')
    elif any(r in url for r in REDIRECTORS):
        p.append('رابط تحويل وليس الرابط الأصلي')
    d = s.get('date', '')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', d):
        p.append('تاريخ النشر ليس بصيغة YYYY-MM-DD')
    elif d > today:
        p.append('تاريخ نشر في المستقبل')
    return p


def verify(brief, offline=False):
    today = now_doha().date().isoformat()
    S = brief.get('sources', {})
    src_bad = {k: source_problems(v, today) for k, v in S.items()}
    pages = {}
    if not offline:
        urls = sorted({v['url'] for k, v in S.items() if not src_bad[k]})
        with cf.ThreadPoolExecutor(12) as ex:
            for url, res in zip(urls, ex.map(fetch, urls)):
                pages[url] = res
    items, dropped, problems = {}, [], []
    for kind, rid, text, src, zone in walk_refs(brief):
        missing = [s for s in src if s not in S]
        bad = [s for s in src if s in S and src_bad[s]]
        good = [s for s in src if s in S and not src_bad[s]]
        if not src:
            reason = 'لا يحمل أي مصدر'
        elif not good:
            reason = 'كل مصادره غير صالحة: ' + '؛ '.join(sorted({p for s in src for p in (src_bad.get(s) or ['مصدر غير معرّف'])}))
        else:
            reason = None
        if missing or bad:
            problems.append({'id': rid, 'kind': kind, 'missing': missing, 'invalid': {s: src_bad[s] for s in bad}})
        if reason:
            dropped.append({'id': rid, 'kind': kind, 'zone': zone, 'reason': reason, 'text': text[:160]})
            continue
        if kind != 'item':
            continue
        reach = [pages.get(S[s]['url'], {}).get('state', 'unchecked') for s in good]
        nums = numbers(text)
        grounded, unseen = [], []
        texts = [pages[S[s]['url']]['text'] for s in good if pages.get(S[s]['url'], {}).get('state') == 'ok']
        if texts:
            pool = set().union(*(page_numbers(t) for t in texts))
            for n in nums:
                (grounded if n in pool or n.rstrip('0').rstrip('.') in pool else unseen).append(n)
        if offline:
            status = 'unchecked'
        elif all(r == 'broken' for r in reach):
            status = 'broken'
        elif texts and unseen:
            status = 'review'
        elif texts:
            status = 'verified'
        else:
            status = 'blocked'
        items[rid] = {
            'zone': zone, 'sources': len(good), 'outlets': len({outlet(S[s]['url']) for s in good}),
            'reach': reach, 'numbers': {'total': len(nums), 'grounded': len(grounded), 'checked': bool(texts), 'unseen': unseen},
            'status': status,
        }
    st = [v['state'] for v in pages.values()]
    summary = {
        'items': sum(1 for _ in (i for z in brief.get('zones', []) for i in z.get('items', []))),
        'sources': len(S), 'outlets': len({outlet(v['url']) for v in S.values() if v.get('url')}),
        'reachable': st.count('ok'), 'blocked': st.count('blocked'), 'broken': st.count('broken'),
        'verified': sum(v['status'] == 'verified' for v in items.values()),
        'review': sum(v['status'] == 'review' for v in items.values()),
        'multi_source': sum(v['outlets'] >= 2 for v in items.values()),
        'numbers_total': sum(v['numbers']['total'] for v in items.values() if v['numbers']['checked']),
        'numbers_grounded': sum(v['numbers']['grounded'] for v in items.values() if v['numbers']['checked']),
        'dropped': len(dropped),
    }
    return {'items': items, 'dropped': dropped, 'problems': problems, 'summary': summary,
            'sources_state': {k: pages.get(v.get('url'), {}).get('state', 'invalid' if src_bad[k] else 'unchecked') for k, v in S.items()}}


def enforce(brief, report):
    """يحذف كل ما سقط في قاعدة التوثيق، ويزيل المراجع المعطوبة من القوائم."""
    gone = {d['id'] for d in report['dropped']}
    S = brief['sources']
    keep = lambda src: [s for s in src if s in S and not source_problems(S[s], now_doha().date().isoformat())]
    for z in brief['zones']:
        z['items'] = [i for i in z['items'] if i['id'] not in gone]
        for i in z['items']:
            i['src'] = keep(i['src'])
        for key in ('analysis', 'technical'):
            if z.get(key) and f"{z['id']}-{key}" in gone:
                z.pop(key)
        z['outlook'] = [o for n, o in enumerate(z.get('outlook') or []) if f"{z['id']}-outlook-{n+1}" not in gone]
    brief['markets'] = [m for n, m in enumerate(brief.get('markets') or []) if f'market-{n+1}' not in gone]
    brief['roadmap'] = [r for n, r in enumerate(brief.get('roadmap') or []) if f'roadmap-{n+1}' not in gone]
    used = {s for _, _, _, src, _ in walk_refs(brief) for s in src}
    brief['sources'] = {k: v for k, v in S.items() if k in used}
    return brief


def write_ledger(brief, report, run=None, path=DATA / 'ledger.json'):
    try:
        old = json.loads(path.read_text(encoding='utf-8'))
    except Exception:
        old = {}
    runs = old.get('runs', [])
    if run:
        runs = [run] + runs
    if run:
        agent_dropped = run.get('dropped_items', [])
    elif old.get('brief') == brief.get('id'):
        agent_dropped = old.get('agent_dropped', [])
    else:
        agent_dropped = []
    ledger = {
        'brief': brief.get('id'), 'checked': now_doha().isoformat(timespec='seconds'),
        'summary': report['summary'], 'items': report['items'], 'dropped': report['dropped'],
        'sources_state': report['sources_state'], 'runs': runs[:30],
        'agent_dropped': agent_dropped,
    }
    path.write_text(json.dumps(ledger, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return ledger


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--brief', default=str(DATA / 'brief.json'))
    ap.add_argument('--offline', action='store_true')
    ap.add_argument('--enforce', action='store_true')
    ap.add_argument('--no-ledger', action='store_true')
    a = ap.parse_args()
    p = Path(a.brief)
    brief = json.loads(p.read_text(encoding='utf-8'))
    rep = verify(brief, offline=a.offline)
    if a.enforce and rep['dropped']:
        brief = enforce(brief, rep)
        p.write_text(json.dumps(brief, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
        rep = verify(brief, offline=a.offline)
    if not a.no_ledger:
        write_ledger(brief, rep)
    s = rep['summary']
    print(f"خبر · {brief.get('id')}: {s['items']} خبراً، {s['sources']} مصدراً من {s['outlets']} جهة. "
          f"الروابط: {s['reachable']} متاح، {s['blocked']} محجوب عن الفحص الآلي، {s['broken']} معطّل. "
          f"الأرقام المطابقة: {s['numbers_grounded']}/{s['numbers_total']}. للمراجعة: {s['review']}. محذوف: {s['dropped']}.")
    for d in rep['dropped']:
        print('  ✗', d['id'], '-', d['reason'])
    for pr in rep['problems']:
        print('  !', pr['id'], pr)
    for k, v in rep['items'].items():
        if v['status'] == 'review':
            print('  ?', k, 'أرقام لم تظهر في صفحات المصادر:', ', '.join(v['numbers']['unseen']))
    sys.exit(1 if rep['problems'] and not a.enforce else 0)


if __name__ == '__main__':
    main()
