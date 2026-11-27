#!/usr/bin/env python3
"""«عبدو نيوز»: بوابة الخادم لما يُنشر من شاشة «إدارة المحتوى» (admin/content/).

تفحص الإيداع المعطى (ملفات khabar/data/ التي غيّرها) وتقارنها بما قبله، فلا تحاسب المحرر إلا على ما أضافه هو:
  - الخلاصات (brief.json وarchive/<id>.json): بوابة التوثيق في agent/verify.py (مصدر صالح برابط https أصلي وتاريخ،
    وجهتان مستقلتان لكل خبر) ودليل الأسلوب agent/style.py (العنوان، المقدمة، العبارات الممنوعة، مصدران لكل خبر).
  - التقارير الخاصة (special/<id>.json): دليل الأسلوب، وجهتان مستقلتان لكل بند.
  - الرأي والتصحيحات: روابط المصادر https أصلية.
  - أي ملف JSON لا يُقرأ يُرفض.
تكتب النتيجة في khabar/data/cms-status.json، وتخرج برمز 1 إن وُجد خطأ جديد (فيُلغى الإيداع في سير العمل).

الاستخدام: python3 khabar/scripts/cms_gate.py <sha>
"""
import datetime as dt
import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'khabar' / 'agent'))
import style  # noqa: E402
import verify  # noqa: E402

DOHA = dt.timezone(dt.timedelta(hours=3))


def git(*a):
    return subprocess.run(['git', *a], cwd=ROOT, capture_output=True, text=True)


def at(sha, path):
    r = git('show', f'{sha}:{path}')
    if r.returncode:
        return None
    return json.loads(r.stdout)


def brief_issues(b):
    out = set()
    if not b:
        return out
    for lvl, where, msg in style.check_brief(b):
        if lvl == 'error':
            out.add((where, msg))
    rep = verify.verify(b, offline=True)
    for d in rep['dropped']:
        out.add((d['id'], d['reason']))
    for p in rep['problems']:
        for s in p['missing']:
            out.add((p['id'], f'مصدر غير معرّف: {s}'))
        for s, why in p['invalid'].items():
            out.add((p['id'], f'{s}: ' + '؛ '.join(why)))
    return out


def special_issues(r):
    out = set()
    if not r:
        return out
    for lvl, where, msg in style.check_special(r):
        if lvl == 'error':
            out.add((where, msg))
    S = r.get('sources') or {}
    today = dt.datetime.now(DOHA).date().isoformat()
    for k, s in S.items():
        for p in verify.source_problems(s, today):
            out.add((f'source/{k}', p))
    for sec in r.get('sections') or []:
        for it in sec.get('items') or []:
            src = [s for s in it.get('src') or [] if s in S]
            if len({verify.outlet(S[s].get('url', '')) for s in src}) < 2:
                out.add((f"{sec.get('id')}/{it.get('id')}", 'أقل من جهتين مستقلتين'))
    return out


def url_issues(d, kind):
    out = set()
    if not d:
        return out
    rows = d.get('articles') if kind == 'opinion' else d.get('items')
    for i, x in enumerate(rows or []):
        urls = x.get('sources') or []
        urls = [u.get('url') if isinstance(u, dict) else u for u in urls]
        for u in urls:
            if not str(u).startswith('https://') or any(r in str(u) for r in verify.REDIRECTORS):
                out.add((f'{kind}/{x.get("id", i)}', f'رابط غير صالح: {u}'))
        if kind == 'opinion' and len(x.get('body', '')) < 200:
            out.add((f'{kind}/{x.get("id", i)}', 'نص المقال أقصر من 200 حرف'))
    return out


def main():
    sha = sys.argv[1] if len(sys.argv) > 1 else 'HEAD'
    files = [f for f in git('diff', '--name-only', f'{sha}^', sha, '--', 'khabar/data').stdout.split() if f.endswith('.json')]
    errors = []
    for f in files:
        if f.endswith('cms-status.json'):
            continue
        try:
            new = at(sha, f)
            old = at(f'{sha}^', f)
        except json.JSONDecodeError as e:
            errors.append({'file': f, 'where': 'JSON', 'msg': f'ملف لا يُقرأ: {e}'})
            continue
        name = f.removeprefix('khabar/data/')
        if new is None:
            continue  # حذف ملف
        if name == 'brief.json' or (name.startswith('archive/') and name != 'archive/index.json'):
            bad = brief_issues(new) - brief_issues(old)
        elif name.startswith('special/') and name != 'special/index.json':
            bad = special_issues(new) - special_issues(old)
        elif name in ('opinion.json', 'corrections.json'):
            k = 'opinion' if name == 'opinion.json' else 'correction'
            bad = url_issues(new, k) - url_issues(old, k)
        else:
            bad = set()
        errors += [{'file': name, 'where': w, 'msg': m} for w, m in sorted(bad)]
    st = {'checked': dt.datetime.now(DOHA).isoformat(timespec='seconds'), 'sha': sha if sha != 'HEAD' else git('rev-parse', 'HEAD').stdout.strip(),
          'ok': not errors, 'files': [f.removeprefix('khabar/data/') for f in files], 'errors': errors[:50]}
    (ROOT / 'khabar/data/cms-status.json').write_text(json.dumps(st, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print(f"إدارة المحتوى: {len(files)} ملف، {len(errors)} خطأ")
    for e in errors:
        print(f"  ✗ {e['file']} · {e['where']}: {e['msg']}")
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())
