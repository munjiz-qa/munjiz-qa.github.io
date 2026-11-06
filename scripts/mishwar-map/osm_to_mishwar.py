"""مشوار: يحوّل ملف OpenStreetMap لقطر إلى شبكة الطرق المضغوطة ونقاط البحث التي يستخدمها التطبيق.
الاستخدام: python3 osm_to_mishwar.py qatar.osm.pbf OUT_DIR
المخرجات: graph.bin (عقد وطرق للتوجيه)، names.json (أسماء الشوارع)، poi.json (أماكن البحث)
"""
import sys, os, json, struct
import osmium

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

CLS = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential',
       'living_street', 'service', 'pedestrian', 'footway', 'path', 'cycleway', 'steps', 'track',
       'motorway_link', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link', 'road']
CI = {c: i for i, c in enumerate(CLS)}
KIND_AR = {
    'hospital': 'مستشفى', 'clinic': 'عيادة', 'pharmacy': 'صيدلية', 'school': 'مدرسة', 'university': 'جامعة',
    'college': 'كلية', 'place_of_worship': 'مسجد', 'fuel': 'محطة وقود', 'bank': 'بنك', 'atm': 'صراف آلي',
    'restaurant': 'مطعم', 'cafe': 'مقهى', 'fast_food': 'وجبات سريعة', 'parking': 'موقف سيارات',
    'police': 'شرطة', 'fire_station': 'دفاع مدني', 'post_office': 'بريد', 'embassy': 'سفارة',
    'townhall': 'جهة حكومية', 'courthouse': 'محكمة', 'marketplace': 'سوق', 'mall': 'مجمع تجاري',
    'supermarket': 'سوبرماركت', 'hotel': 'فندق', 'museum': 'متحف', 'park': 'حديقة', 'stadium': 'استاد',
    'attraction': 'معلم', 'government': 'جهة حكومية', 'aerodrome': 'مطار', 'station': 'محطة',
    'suburb': 'منطقة', 'neighbourhood': 'حي', 'quarter': 'حي', 'village': 'قرية', 'town': 'مدينة', 'city': 'مدينة',
    'hamlet': 'منطقة', 'locality': 'منطقة', 'doctors': 'عيادة', 'dentist': 'عيادة أسنان', 'kindergarten': 'روضة',
    'car_wash': 'غسيل سيارات', 'charging_station': 'شحن كهربائي', 'library': 'مكتبة', 'cinema': 'سينما', 'beach_resort': 'شاطئ'}
GROUP_AR = {'shop': 'متجر', 'office': 'مكتب', 'tourism': 'سياحة', 'leisure': 'ترفيه', 'government': 'جهة حكومية',
            'place': 'منطقة', 'building': 'مبنى', 'healthcare': 'رعاية صحية', 'aeroway': 'مطار', 'railway': 'محطة',
            'public_transport': 'محطة', 'historic': 'معلم تاريخي', 'amenity': 'خدمة'}
IMP2 = {'hospital', 'university', 'mall', 'museum', 'stadium', 'aerodrome', 'townhall', 'government', 'embassy',
        'courthouse', 'police', 'marketplace', 'hotel', 'attraction', 'station'}
KINDS = ('amenity', 'shop', 'tourism', 'office', 'leisure', 'government', 'healthcare', 'place', 'aeroway',
         'railway', 'public_transport', 'historic')

def latin(s):
    return bool(s) and all(ord(ch) < 0x0600 for ch in s)

class H(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.ways, self.pois, self.used = [], [], {}
        self.lat, self.lon = [], []

    def nid(self, n):
        k = n.ref
        i = self.used.get(k)
        if i is None:
            i = len(self.lat); self.used[k] = i
            self.lat.append(round(n.location.lat * 1e6)); self.lon.append(round(n.location.lon * 1e6))
        return i

    def poi(self, tags, lat, lon):
        name = tags.get('name'); ar = tags.get('name:ar') or (name if name and not latin(name) else '')
        en = tags.get('name:en') or (name if latin(name) else '')
        if not (ar or en): return
        kind = next((k for k in KINDS if k in tags), None)
        if not kind: return
        v = tags.get(kind, '')
        typ = KIND_AR.get(v) or GROUP_AR.get(kind, '')
        imp = 3 if kind == 'place' and v in ('suburb', 'town', 'city', 'village') else (2 if v in IMP2 else 1)
        self.pois.append([round(lat, 5), round(lon, 5), ar[:80], en[:80], typ, imp])

    def node(self, n):
        if n.tags and ('name' in n.tags or 'name:ar' in n.tags) and n.location.valid():
            self.poi({t.k: t.v for t in n.tags}, n.location.lat, n.location.lon)

    def way(self, w):
        t = w.tags; hw = t.get('highway')
        if hw in CI and len(w.nodes) > 1 and t.get('area') != 'yes':
            nodes = [n for n in w.nodes if n.location.valid()]
            if len(nodes) < 2: return
            ow = t.get('oneway')
            one = 1 if ow in ('yes', '1', 'true') else (2 if ow == '-1' else 0)
            if (hw in ('motorway', 'motorway_link') or t.get('junction') == 'roundabout') and ow != 'no': one = one or 1
            name = t.get('name'); ar = t.get('name:ar') or (name if name and not latin(name) else '')
            en = t.get('name:en') or (name if latin(name) else '')
            ms = t.get('maxspeed', '')
            try: ms = min(255, int(''.join(ch for ch in ms if ch.isdigit())[:3] or 0))
            except Exception: ms = 0
            fl = 0
            if t.get('junction') == 'roundabout': fl |= 1
            if t.get('bridge') == 'yes': fl |= 2
            if t.get('tunnel') == 'yes': fl |= 4
            if t.get('access') in ('private', 'no'): fl |= 8
            self.ways.append((CI[hw], one, ms, fl, ar[:80], en[:80], [self.nid(n) for n in nodes]))
        elif ('name' in t or 'name:ar' in t) and w.is_closed() and len(w.nodes) > 3:
            pts = [n for n in w.nodes if n.location.valid()]
            if pts:
                self.poi({x.k: x.v for x in t}, sum(n.location.lat for n in pts) / len(pts), sum(n.location.lon for n in pts) / len(pts))

h = H()
h.apply_file(SRC, locations=True, idx='flex_mem')

names, nidx = [], {}
def name_id(ar, en):
    k = ar + '|' + en
    if not (ar or en): return 0
    if k not in nidx: nidx[k] = len(names) + 1; names.append([ar, en])
    return nidx[k]

buf = bytearray(struct.pack('<4sII', b'MSR1', len(h.lat), len(h.ways)))
for la, lo in zip(h.lat, h.lon): buf += struct.pack('<ii', la, lo)
for cls, one, ms, fl, ar, en, refs in h.ways:
    refs = refs[:65535]
    buf += struct.pack('<BBBBHH', cls, one, ms, fl, name_id(ar, en), len(refs)) + struct.pack('<%dI' % len(refs), *refs)
assert len(names) < 65535, 'too many street names for 16-bit ids'
open(f'{OUT}/graph.bin', 'wb').write(buf)
json.dump(names, open(f'{OUT}/names.json', 'w'), ensure_ascii=False, separators=(',', ':'))
seen, P = set(), []
for p in sorted(h.pois, key=lambda x: -x[5]):
    k = (p[2] or p[3], round(p[0], 3), round(p[1], 3))
    if k in seen: continue
    seen.add(k); P.append(p)
json.dump(P, open(f'{OUT}/poi.json', 'w'), ensure_ascii=False, separators=(',', ':'))
print('nodes', len(h.lat), 'ways', len(h.ways), 'names', len(names), 'pois', len(P), 'graph', len(buf))
