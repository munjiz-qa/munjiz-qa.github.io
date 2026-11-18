#!/usr/bin/env python3
"""«عبدو نيوز»: ينسخ khabar/ (مصدر العمل والبيانات) إلى abdo-news/ (العنوان الرسمي للجمهور منذ 18 نوفمبر 2026).
كل الأدوات والسكربتات والإدارة تكتب في khabar/ كما هي، وهذا السكربت يجعل abdo-news/ نسخة مطابقة منها،
فيبقى الموقع الكامل على https://munjiz-qa.github.io/abdo-news/ ، وصفحات khabar/ تحوّل الزائر إليه."""
import os, shutil, sys
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC, DST = os.path.join(ROOT, 'khabar'), os.path.join(ROOT, 'abdo-news')
SKIP_TOP = {'agent', 'scripts', 'README.md'}
TEXT = ('.html', '.js', '.json', '.xml', '.webmanifest', '.css', '.txt', '.svg')
def want(rel):
    return rel.split(os.sep)[0] not in SKIP_TOP
seen = set(); changed = 0
for d, dirs, files in os.walk(SRC):
    for f in files:
        s = os.path.join(d, f); rel = os.path.relpath(s, SRC)
        if not want(rel): continue
        t = os.path.join(DST, rel); seen.add(rel)
        data = open(s, 'rb').read()
        if f.endswith(TEXT):
            data = data.replace(b'munjiz-qa.github.io/khabar/', b'munjiz-qa.github.io/abdo-news/')
        if os.path.exists(t) and open(t, 'rb').read() == data: continue
        os.makedirs(os.path.dirname(t), exist_ok=True); open(t, 'wb').write(data); changed += 1
for d, dirs, files in os.walk(DST):
    for f in files:
        t = os.path.join(d, f); rel = os.path.relpath(t, DST)
        if rel not in seen: os.remove(t); changed += 1
print(f'abdo-news mirror: {len(seen)} files, {changed} changed')
