"""مشوار: يرسم البحر حول قطر من خطوط الساحل في OpenStreetMap (natural=coastline).
الاستخدام: python3 sea_from_osm.py qatar.osm.pbf minlon,minlat,maxlon,maxlat OUT.zip
يُخرج ملف شكل (Shapefile) بإسقاط EPSG:3857 باسم water_polygons، كما يتوقعه مولّد الخريطة.
قاعدة OSM: اليابسة على يسار اتجاه خط الساحل، والماء على يمينه.
"""
import sys, os, zipfile, tempfile
import osmium, shapefile
from shapely.geometry import LineString, box, Point
from shapely.geometry.polygon import orient
from shapely.ops import unary_union, polygonize, linemerge
from shapely.strtree import STRtree
from pyproj import Transformer

SRC, BB, OUT = sys.argv[1], [float(x) for x in sys.argv[2].split(',')], sys.argv[3]
frame = box(*BB)

class C(osmium.SimpleHandler):
    def __init__(self): super().__init__(); self.lines = []
    def way(self, w):
        if w.tags.get('natural') == 'coastline':
            pts = [(n.location.lon, n.location.lat) for n in w.nodes if n.location.valid()]
            if len(pts) > 1: self.lines.append(LineString(pts))
c = C(); c.apply_file(SRC, locations=True, idx='flex_mem')
print('coastline ways', len(c.lines))
assert c.lines, 'no coastline found'

# close small gaps between coastline pieces (broken or unconnected ways would merge sea and land)
merged = linemerge(c.lines)
pieces = list(merged.geoms) if merged.geom_type == 'MultiLineString' else [merged]
inner = frame.buffer(-0.01)
ends = [(i, Point(g.coords[-1])) for i, g in enumerate(pieces) if not g.is_closed and inner.contains(Point(g.coords[-1]))]
starts = [(i, Point(g.coords[0])) for i, g in enumerate(pieces) if not g.is_closed and inner.contains(Point(g.coords[0]))]
bridges = 0
for i, e in ends:
    best = min(((e.distance(sp), j, sp) for j, sp in starts), default=None, key=lambda t: t[0])
    if best and best[0] < 0.003:            # about 300 m
        c.lines.append(LineString([e.coords[0], best[2].coords[0]])); bridges += 1
print('coastline pieces', len(pieces), 'open ends inside', len(ends), 'bridged', bridges)

# oriented segments for the land/water test
segs, dirs = [], []
for ln in c.lines:
    xy = list(ln.coords)
    for a, b in zip(xy, xy[1:]):
        segs.append(LineString([a, b])); dirs.append((a, b))
tree = STRtree(segs)

clipped = unary_union(c.lines).intersection(frame)
faces = list(polygonize(unary_union([clipped, frame.exterior])))
print('faces', len(faces))
# vote: every coastline segment marks the face on its right as sea and the face on its left as land
import math
ftree = STRtree(faces)
votes = [[0, 0] for _ in faces]
eps = 2e-5
for (ax, ay), (bx, by) in dirs:
    dx, dy = bx - ax, by - ay; L = math.hypot(dx, dy)
    if L == 0: continue
    mx, my = (ax + bx) / 2, (ay + by) / 2; nx, ny = dy / L, -dx / L      # right-hand normal
    for side, (px, py) in ((0, (mx + nx * eps, my + ny * eps)), (1, (mx - nx * eps, my - ny * eps))):
        pt = Point(px, py)
        for k in ftree.query(pt):
            if faces[int(k)].contains(pt): votes[int(k)][side] += 1; break
water = [f for f, (w, l) in zip(faces, votes) if w > l]
print('water faces', len(water), 'area', round(sum(w.area for w in water), 4), 'of', round(frame.area, 4))
assert water, 'no sea polygons produced'
for nm, (x, y) in [('Doha bay', (51.545, 25.305)), ('Gulf east of Doha', (51.70, 25.30)), ('Doha inland', (51.45, 25.28))]:
    if frame.contains(Point(x, y)): print('check', nm, 'sea' if any(w.contains(Point(x, y)) for w in water) else 'land')

tr = Transformer.from_crs(4326, 3857, always_xy=True)
tmp = tempfile.mkdtemp(); base = os.path.join(tmp, 'water_polygons')
w = shapefile.Writer(base, shapeType=shapefile.POLYGON); w.field('FID', 'N')
for k, g in enumerate(water):
    g = orient(g, sign=-1.0)
    rings = [[tr.transform(x, y) for x, y in g.exterior.coords]] + [[tr.transform(x, y) for x, y in r.coords] for r in g.interiors]
    w.poly(rings); w.record(k)
w.close()
open(base + '.prj', 'w').write('PROJCS["WGS_84_Pseudo_Mercator",GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",SPHEROID["WGS_1984",6378137.0,298.257223563]],PRIMEM["Greenwich",0.0],UNIT["Degree",0.0174532925199433]],PROJECTION["Mercator"],PARAMETER["False_Easting",0.0],PARAMETER["False_Northing",0.0],PARAMETER["Central_Meridian",0.0],PARAMETER["Standard_Parallel_1",0.0],UNIT["Meter",1.0]]')
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as z:
    for ext in ('shp', 'shx', 'dbf', 'prj'):
        z.write(base + '.' + ext, 'water-polygons-split-3857/water_polygons.' + ext)
print('written', OUT, os.path.getsize(OUT))
