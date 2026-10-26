#!/usr/bin/env python3
"""«مرصد خبر»: يبني data/marsad.json من سجل القراءات data/marsad/series.json.

لكل مؤشر: آخر قراءة، والقراءة السابقة، وقراءة قبل أسبوع وقبل شهر، ولكل منها مصدرها.
ما لا قراءة موثّقة له يبقى فارغاً ولا يُخمَّن. التقدير نطاق معلن الأساس:
  الدرجة أ: توقع منشور لجهة معتمدة (يُكتب يدوياً في series.json تحت forecasts_a ومعه مصدره)
  الدرجة ب: متوسط الحركة اليومية المطلقة في آخر 20 جلسة × جذر عدد جلسات المدة، حول آخر قيمة
  الدرجة ج: لا تقدير (بيانات أقل من MIN_SESSIONS جلسة)
وكل تقدير يُحفظ في data/marsad/forecasts.json ثم يُحاسَب بعد انقضاء مدته.

الاستخدام:
  python3 khabar/agent/marsad.py check   # يرفض أي قراءة أو تحليل بلا مصدر صالح (رمز خروج 1)
  python3 khabar/agent/marsad.py build   # الفحص ثم البناء
  python3 khabar/agent/marsad.py add <id> <YYYY-MM-DD> <value> <source_id> [<ar> <en> <date> <url>]
"""
import json, math, sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / 'data'
SERIES = ROOT / 'marsad' / 'series.json'
FORECASTS = ROOT / 'marsad' / 'forecasts.json'
OUT = ROOT / 'marsad.json'
MIN_SESSIONS = 15      # أقل عدد جلسات موثّقة لحساب نطاق الدرجة ب
WINDOW = 20            # عدد الجلسات في حساب متوسط الحركة
HORIZON_DAYS = 7       # مدة التقدير: أسبوع
HORIZON_SESSIONS = 5
WEEK = (4, 10)         # «قبل أسبوع»: قراءة بين 4 و10 أيام قبل الأخيرة، الأقرب إلى 7
MONTH = (24, 38)       # «قبل شهر»: بين 24 و38 يوماً، الأقرب إلى 30
STALE_DAYS = {'daily': 5, 'monthly': 45}

D = lambda s: date.fromisoformat(s)


def load():
    return json.loads(SERIES.read_text(encoding='utf-8'))


def check(s):
    errs = []
    src = s.get('sources', {})
    for k, v in src.items():
        u = v.get('url', '')
        if not u.startswith('https://') or ' ' in u:
            errs.append(f'مصدر {k}: رابط غير صالح')
        for f in ('ar', 'en', 'date'):
            if not v.get(f):
                errs.append(f'مصدر {k}: الحقل {f} ناقص')
        try:
            D(v.get('date', ''))
        except ValueError:
            errs.append(f'مصدر {k}: تاريخ غير صالح')
    ids = {i['id'] for i in s['indicators']}
    for i in s['indicators']:
        for f in ('zone', 'ar', 'en', 'unit', 'measure', 'cadence'):
            if not i.get(f):
                errs.append(f'مؤشر {i["id"]}: الحقل {f} ناقص')
    for k, obs in s.get('obs', {}).items():
        if k not in ids:
            errs.append(f'قراءات لمؤشر غير معرّف: {k}')
        seen = set()
        for o in obs:
            tag = f'{k} {o.get("d")}'
            try:
                D(o['d'])
            except (KeyError, ValueError):
                errs.append(f'{tag}: تاريخ غير صالح')
            if not isinstance(o.get('v'), (int, float)) or isinstance(o.get('v'), bool):
                errs.append(f'{tag}: قيمة غير رقمية')
            if not o.get('src'):
                errs.append(f'{tag}: قراءة بلا مصدر')
            for x in o.get('src', []):
                if x not in src:
                    errs.append(f'{tag}: المصدر {x} غير موجود في sources')
            if o.get('d') in seen:
                errs.append(f'{tag}: تاريخ مكرر')
            seen.add(o.get('d'))
    for k, n in s.get('notes', {}).items():
        if not n.get('src'):
            errs.append(f'تحليل {k}: بلا مصدر')
        for x in n.get('src', []):
            if x not in src:
                errs.append(f'تحليل {k}: المصدر {x} غير موجود')
    for k, f in s.get('forecasts_a', {}).items():
        if not f.get('src') or any(x not in src for x in f['src']):
            errs.append(f'تقدير الدرجة أ لـ{k}: بلا مصدر صالح')
    return errs


def pick(obs, last, lo, hi, target):
    c = [o for o in obs if lo <= (D(last['d']) - D(o['d'])).days <= hi]
    return min(c, key=lambda o: (abs((D(last['d']) - D(o['d'])).days - target), o['d'])) if c else None


def point(o, last=None):
    if not o:
        return None
    p = {'d': o['d'], 'v': o['v'], 'src': o['src']}
    if o.get('note'):
        p['note'] = o['note']
    if last is not None:
        p['chg'] = round(last['v'] - o['v'], 6)
        p['pct'] = round((last['v'] - o['v']) / o['v'] * 100, 2) if o['v'] else None
    return p


def estimate(ind, obs, s):
    fa = s.get('forecasts_a', {}).get(ind['id'])
    last = obs[-1]
    if fa and D(fa.get('until', '1970-01-01')) >= D(last['d']):
        return {'tier': 'a', 'lo': fa['lo'], 'hi': fa['hi'], 'until': fa['until'], 'basis': fa['basis'], 'src': fa['src']}
    if ind['cadence'] != 'daily':
        return {'tier': 'c', 'reason': {'ar': 'سعر يُحدَّد بقرار شهري، فلا يُقدَّر إحصائياً.', 'en': 'A price set by monthly decision, so no statistical estimate.'}}
    recent = [o for o in obs if (D(last['d']) - D(o['d'])).days <= 45][-(WINDOW + 1):]
    if len(recent) < MIN_SESSIONS:
        return {'tier': 'c', 'have': len(recent), 'need': MIN_SESSIONS,
                'reason': {'ar': f'يبدأ التقدير تلقائياً بعد {MIN_SESSIONS} جلسة موثّقة، والمسجّل الآن {len(recent)}.',
                           'en': f'Estimates start automatically after {MIN_SESSIONS} documented sessions; {len(recent)} recorded so far.'}}
    moves = [abs(b['v'] / a['v'] - 1) for a, b in zip(recent, recent[1:]) if a['v']]
    m = sum(moves) / len(moves)
    spread = m * math.sqrt(HORIZON_SESSIONS)
    dec = ind.get('dec', 2)
    lo, hi = round(last['v'] * (1 - spread), dec), round(last['v'] * (1 + spread), dec)
    until = (D(last['d']) + timedelta(days=HORIZON_DAYS)).isoformat()
    pct = round(m * 100, 2)
    return {'tier': 'b', 'lo': lo, 'hi': hi, 'until': until, 'sessions': len(moves), 'avg_move': pct,
            'basis': {'ar': f'متوسط الحركة اليومية في آخر {len(moves)} جلسة {pct}%، ممدوداً على {HORIZON_SESSIONS} جلسات حول آخر قيمة.',
                      'en': f'Average daily move over the last {len(moves)} sessions is {pct}%, extended over {HORIZON_SESSIONS} sessions around the latest value.'}}


def score(fc, s):
    """يحاسب كل تقدير انقضت مدته على أول قراءة موثّقة في تاريخ نهايته أو بعده."""
    for f in fc:
        if f.get('result'):
            continue
        obs = sorted(s['obs'].get(f['id'], []), key=lambda o: o['d'])
        hit = next((o for o in obs if o['d'] >= f['until']), None)
        if hit:
            f['result'] = {'d': hit['d'], 'v': hit['v'], 'src': hit['src'], 'hit': f['lo'] <= hit['v'] <= f['hi']}
    return fc


def build(s):
    today = datetime.now(timezone(timedelta(hours=3))).date()
    fc = json.loads(FORECASTS.read_text(encoding='utf-8')) if FORECASTS.exists() else []
    out = []
    for ind in s['indicators']:
        obs = sorted(s['obs'].get(ind['id'], []), key=lambda o: o['d'])
        if not obs:
            continue
        last = obs[-1]
        if ind['cadence'] == 'monthly':
            prev = obs[-2] if len(obs) > 1 else None
            week, month = None, prev
            prev = None
        else:
            prev = obs[-2] if len(obs) > 1 else None
            week = pick(obs, last, *WEEK, 7)
            month = pick(obs, last, *MONTH, 30)
        est = estimate(ind, obs, s)
        if est['tier'] in ('a', 'b') and not any(f['id'] == ind['id'] and f['made'] == last['d'] for f in fc):
            fc.append({'id': ind['id'], 'made': last['d'], 'base': last['v'], 'tier': est['tier'], 'lo': est['lo'], 'hi': est['hi'], 'until': est['until']})
        note = s.get('notes', {}).get(ind['id'])
        if note and (D(last['d']) - D(note['date'])).days > 3:
            note = None   # تحليل قديم لا يُعرض مع رقم أحدث منه
        age = (today - D(last['d'])).days
        out.append({**{k: ind[k] for k in ('id', 'zone', 'ar', 'en', 'unit', 'dec', 'cadence', 'measure')},
                    'now': point(last), 'prev': point(prev, last), 'week': point(week, last), 'month': point(month, last),
                    'est': est, 'note': note, 'stale': age > STALE_DAYS[ind['cadence']], 'sessions': len(obs),
                    'spark': [[o['d'], o['v']] for o in obs if (D(last['d']) - D(o['d'])).days <= 40]})
    fc = score(fc, s)
    done = [f for f in fc if f.get('result')]
    used = {x for i in out for p in ('now', 'prev', 'week', 'month') if i[p] for x in i[p]['src']}
    used |= {x for i in out if i['note'] for x in i['note']['src']}
    used |= {x for i in out if i['est'].get('src') for x in i['est']['src']}
    used |= {x for f in done for x in f['result']['src']}
    res = {'updated': datetime.now(timezone(timedelta(hours=3))).isoformat(timespec='seconds'),
           'indicators': out,
           'record': {'total': len(fc), 'scored': len(done), 'hits': sum(f['result']['hit'] for f in done),
                      'items': sorted(fc, key=lambda f: (f['until'], f['id']), reverse=True)[:40]},
           'sources': {k: v for k, v in s['sources'].items() if k in used}}
    FORECASTS.write_text(json.dumps(fc, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    OUT.write_text(json.dumps(res, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return res


def add(s, args):
    k, d, v, sid = args[:4]
    D(d)
    if sid not in s['sources']:
        if len(args) < 8:
            sys.exit(f'المصدر {sid} جديد: أضف الاسم بالعربية والإنجليزية وتاريخ النشر والرابط')
        s['sources'][sid] = {'ar': args[4], 'en': args[5], 'date': args[6], 'url': args[7]}
    obs = [o for o in s['obs'].setdefault(k, []) if o['d'] != d]
    obs.append({'d': d, 'v': float(v), 'src': [sid]})
    s['obs'][k] = sorted(obs, key=lambda o: o['d'])
    SERIES.write_text(json.dumps(s, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'build'
    s = load()
    if cmd == 'add':
        add(s, sys.argv[2:])
        s = load()
    errs = check(s)
    if errs:
        print('رُفض سجل المرصد:\n- ' + '\n- '.join(errs))
        sys.exit(1)
    if cmd in ('build', 'add'):
        r = build(s)
        print(f'المرصد: {len(r["indicators"])} مؤشراً، {len(r["sources"])} مصدراً، تقديرات محاسَبة {r["record"]["scored"]}/{r["record"]["total"]}')
    else:
        print('سجل المرصد سليم.')
