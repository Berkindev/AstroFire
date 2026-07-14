#!/usr/bin/env python3
"""
SolarFire referans haritasından glif şekillerini çıkarıp vektöre çevirir.

SolarFire kendi özel astroloji fontunu kullanıyor; o fonta erişimimiz yok.
Ama elimizdeki referans haritalar TÜM glifleri içeriyor (12 burç + gezegenler +
Rx). Glifler beyaz zemin üzerinde tek renk dolu şekiller olduğu için:

  renk maskesi → bağlı bileşen → kontur takibi (Moore) → RDP sadeleştirme
  → normalize → SVG path

çıktısı src/modules/sfGlyphs.js olarak yazılır ve chartWheelSF.js Path2D ile
doldurur. Şekiller birebir SolarFire'ınkiler olur.

  python3 scripts/extract-glyphs.py
"""

import math
import json
from collections import deque
from PIL import Image

SRC = 'solarfire/Serra Natal harita.png'
OUT = 'src/modules/sfGlyphs.js'

# Serra haritasının çark geometrisi (piksel taramasıyla ölçüldü)
CX, CY, R = 1277, 1024, 858
ASC = 236.70

# Element renkleri (SolarFire paleti)
ELEM_COLOR = {
    'fire':  (255, 0, 0),
    'earth': (0, 255, 0),
    'air':   (0, 204, 200),
    'water': (0, 0, 255),
}

SIGNS = [
    ('aries', 'fire'), ('taurus', 'earth'), ('gemini', 'air'), ('cancer', 'water'),
    ('leo', 'fire'), ('virgo', 'earth'), ('libra', 'air'), ('scorpio', 'water'),
    ('sagittarius', 'fire'), ('capricorn', 'earth'), ('aquarius', 'air'), ('pisces', 'water'),
]

# Serra haritasındaki gezegen boylamları (bizim hesap = SolarFire ile birebir)
PLANETS = [
    ('sun',       133.80, (128, 128, 0)),
    ('moon',      293.27, (128, 128, 0)),
    ('mercury',   146.52, (128, 0, 128)),
    ('venus',     111.58, (0, 128, 128)),
    ('mars',      110.68, (255, 0, 0)),
    ('jupiter',   357.44, (128, 128, 128)),
    ('saturn',     31.70, (128, 0, 0)),
    ('uranus',    310.63, (0, 0, 255)),
    ('neptune',   300.00, (0, 128, 128)),
    ('pluto',     245.32, (128, 0, 0)),
    ('northnode', 152.20, (0, 0, 0)),
    ('chiron',    222.97, (0, 128, 0)),
]

im = Image.open(SRC).convert('RGB')
W, H = im.size
px = im.load()


def screen_xy(lon, rfrac):
    a = math.radians(180 + lon - ASC)
    return CX + rfrac * R * math.cos(a), CY - rfrac * R * math.sin(a)


def dist2(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b))


def build_mask(cx, cy, half, target):
    """Hedef renge (ve onun beyazla karışımlarına) uyan pikselleri işaretle."""
    x0, y0 = int(cx - half), int(cy - half)
    x1, y1 = int(cx + half), int(cy + half)
    w, h = x1 - x0, y1 - y0
    mask = [[False] * w for _ in range(h)]

    white = (255, 255, 255)
    for j in range(h):
        for i in range(w):
            X, Y = x0 + i, y0 + j
            if not (0 <= X < W and 0 <= Y < H):
                continue
            c = px[X, Y]
            if dist2(c, white) < 900:          # beyaz zemin
                continue
            # Hedefe mi yoksa başka bir mürekkebe mi (siyah yazı, tik) daha yakın?
            d_t = dist2(c, target)
            # beyaz-hedef ekseni üzerindeki karışımlara izin ver
            best_blend = min(
                dist2(c, tuple(int(target[k] + (255 - target[k]) * t) for k in range(3)))
                for t in (0.0, 0.25, 0.5, 0.7)
            )
            d_other = min(dist2(c, o) for o in OTHER_INKS if o != target)
            if best_blend <= d_other and best_blend < 9000:
                mask[j][i] = True
    return mask, x0, y0


OTHER_INKS = [
    (0, 0, 0), (255, 0, 0), (0, 255, 0), (0, 0, 255), (0, 204, 200),
    (128, 128, 0), (128, 0, 128), (0, 128, 128), (128, 0, 0), (128, 128, 128),
    (0, 128, 0), (192, 192, 192),
]


def components(mask):
    h, w = len(mask), len(mask[0])
    seen = [[False] * w for _ in range(h)]
    out = []
    for j in range(h):
        for i in range(w):
            if mask[j][i] and not seen[j][i]:
                q = deque([(i, j)])
                seen[j][i] = True
                cells = []
                while q:
                    x, y = q.popleft()
                    cells.append((x, y))
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (1, 1), (1, -1), (-1, 1), (-1, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < w and 0 <= ny < h and mask[ny][nx] and not seen[ny][nx]:
                            seen[ny][nx] = True
                            q.append((nx, ny))
                out.append(cells)
    return out


def trace_contours(cells, w, h):
    """
    Piksel kenarı takibi (crack following).

    Her dolu hücrenin, komşusu BOŞ olan her kenarı için yönlü bir kenar ekleriz;
    yön, dolu hücre daima SOLDA kalacak şekilde seçilir. Bu yönlü kenarlar
    zincirlendiğinde kapalı halkalar çıkar: dış kontur bir yönde, delikler ters
    yönde sarılır — yani doldururken even-odd kuralı delikleri kendiliğinden
    oyar. Sonuç, glifin birebir (merdivenli) sınırıdır.
    """
    solid = set(cells)

    edges = {}

    def add(a, b):
        edges.setdefault(a, []).append(b)

    for (x, y) in cells:
        # görüntü koordinatlarında (y aşağı) hücre etrafında saat yönü
        if (x, y - 1) not in solid:
            add((x, y), (x + 1, y))              # üst
        if (x + 1, y) not in solid:
            add((x + 1, y), (x + 1, y + 1))      # sağ
        if (x, y + 1) not in solid:
            add((x + 1, y + 1), (x, y + 1))      # alt
        if (x - 1, y) not in solid:
            add((x, y + 1), (x, y))              # sol

    loops = []
    while edges:
        start = next(iter(edges))
        loop = [start]
        cur = start
        while True:
            nxts = edges.get(cur)
            if not nxts:
                break
            nxt = nxts.pop()
            if not nxts:
                del edges[cur]
            cur = nxt
            if cur == start:
                break
            loop.append(cur)
        if len(loop) >= 8:
            loops.append(loop)

    return loops


def rdp(points, eps):
    """Ramer–Douglas–Peucker sadeleştirme."""
    if len(points) < 3:
        return points
    x0, y0 = points[0]
    x1, y1 = points[-1]
    dx, dy = x1 - x0, y1 - y0
    norm = math.hypot(dx, dy) or 1e-9
    dmax, idx = 0, 0
    for i in range(1, len(points) - 1):
        x, y = points[i]
        d = abs(dy * x - dx * y + x1 * y0 - y1 * x0) / norm
        if d > dmax:
            dmax, idx = d, i
    if dmax > eps:
        left = rdp(points[:idx + 1], eps)
        right = rdp(points[idx:], eps)
        return left[:-1] + right
    return [points[0], points[-1]]


def centroid(cells):
    return (sum(p[0] for p in cells) / len(cells), sum(p[1] for p in cells) / len(cells))


def open_mask(mask, k=2):
    """
    Morfolojik açma: k kez aşındır, sonra (özgün maskeyle sınırlı) k kez genişlet.

    SİYAH glifler (GAD ☋, Şans Noktası ⊗) için şart. Ev cusp çizgileri de siyah
    ve gezegen halkasını kesiyor; glife DEĞDİĞİNDE ikisi tek bir bağlı bileşen
    oluyor, dolayısıyla parça filtreleri onları ayıramıyor. Cusp çizgisi ince
    (~3px), glif çizgisi kalın (~10px): aşındırma çizgiyi yok eder, glifi bırakır.
    Sonra özgün maske içinde geri genişletmek glifin kenarlarını kurtarır.
    """
    h, w = len(mask), len(mask[0])

    def erode(m):
        out = [[False] * w for _ in range(h)]
        for j in range(1, h - 1):
            for i in range(1, w - 1):
                if m[j][i] and m[j-1][i] and m[j+1][i] and m[j][i-1] and m[j][i+1]:
                    out[j][i] = True
        return out

    def dilate_within(m, limit):
        out = [row[:] for row in m]
        for j in range(1, h - 1):
            for i in range(1, w - 1):
                if not limit[j][i]:
                    continue
                if m[j-1][i] or m[j+1][i] or m[j][i-1] or m[j][i+1]:
                    out[j][i] = True
        return out

    cur = mask
    for _ in range(k):
        cur = erode(cur)
    for _ in range(k):
        cur = dilate_within(cur, mask)
    return cur


def bbox(cells):
    xs = [p[0] for p in cells]
    ys = [p[1] for p in cells]
    return min(xs), min(ys), max(xs), max(ys)


def glyph_path(mask, min_cells=25, eps=1.4, mode='nested', min_frac=0.10):
    """
    Kutuya sızan komşu içeriği (derece yazıları, tik işaretleri) eler.

    Neden gerekli: derece yazıları SİYAH ve kenar yumuşatması gri ara tonlar
    üretiyor; bu da siyah (KAD) ve gri (Jüpiter) gliflerinin renk testinden
    geçiyor. Glifin kendisi ile yazıyı ayırmak için iki strateji:

    mode='nested'  (GEZEGENLER) — en büyük parça + onun sınırlayıcı kutusunun
        İÇİNDE kalan parçalar. Güneş'in ortasındaki nokta halkanın kutusunda,
        altındaki derece yazısı ise dışında → yazı temizce düşer.

    mode='frac'  (BURÇLAR) — parçaları göreli büyüklüğe göre ele. Burç
        glifleri çok parçalı olabiliyor ama parçalar YAN YANA duruyor (Yengeç'in
        iki spirali, Terazi'nin yayı + çubuğu), iç içe değil. Meşru parçalar
        büyük, kaçak lekeler küçük.
    """
    comps = [c for c in components(mask) if len(c) >= min_cells]
    if not comps:
        return None

    main = max(comps, key=len)

    if mode == 'nested':
        x0, y0, x1, y1 = bbox(main)
        pad = 3

        def inside(c):
            a, b, cc, d = bbox(c)
            return a >= x0 - pad and b >= y0 - pad and cc <= x1 + pad and d <= y1 + pad

        comps = [c for c in comps if c is main or inside(c)]
    else:
        floor = len(main) * min_frac
        comps = [c for c in comps if len(c) >= floor]

    h, w = len(mask), len(mask[0])
    loops = []
    for cells in comps:
        loops.extend(trace_contours(cells, w, h))
    if not loops:
        return None

    # Ortak sınırlayıcı kutu → 0..100 kutusuna normalize (en-boy korunur)
    allpts = [p for lp in loops for p in lp]
    xs = [p[0] for p in allpts]
    ys = [p[1] for p in allpts]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    gw, gh = maxx - minx, maxy - miny
    scale = 100.0 / max(gw, gh)
    ox = (100 - gw * scale) / 2
    oy = (100 - gh * scale) / 2

    parts = []
    for lp in loops:
        simp = rdp(lp, eps)
        if len(simp) < 3:
            continue
        pts = [((x - minx) * scale + ox, (y - miny) * scale + oy) for x, y in simp]
        d = 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + 'Z'
        parts.append(d)

    return ''.join(parts), (gw, gh)


def find_clusters(color, rmin, rmax, min_px=60, gap=45):
    """
    Verilen renkteki pikselleri çark bandında bul ve öbeklere ayır.

    Gezegen glifini boylamdan hesaplanan yere bakarak aramak GÜVENİLMEZ:
    SolarFire de çakışan gezegenleri kaydırıyor (Venüs ve Mars burada 1° arayada
    ama çizimde ayrılmış). Bu yüzden glifleri rengiyle bulup, beklenen açıya en
    yakın öbeği o gezegene atıyoruz.
    """
    pts = []
    for y in range(H):
        for x in range(W):
            r = math.hypot(x - CX, y - CY)
            if not (rmin * R < r < rmax * R):
                continue
            if dist2(px[x, y], color) < 2500:
                pts.append((x, y))

    clusters = []
    for p in pts:
        for c in clusters:
            if any(abs(q[0] - p[0]) < gap and abs(q[1] - p[1]) < gap for q in c[-12:]):
                c.append(p)
                break
        else:
            clusters.append([p])

    out = []
    for c in clusters:
        if len(c) < min_px:
            continue
        mx = sum(p[0] for p in c) / len(c)
        my = sum(p[1] for p in c) / len(c)
        ang = (math.degrees(math.atan2(-(my - CY), mx - CX)) + 360) % 360
        out.append((mx, my, ang, len(c)))
    return out


# ============================================
# ÇIKARIM
# ============================================
out = {'signs': {}, 'planets': {}}

def upright_sign_mask(k, elem, half=105):
    """
    Burç glifini DİK hale getirip maskesini çıkarır.

    SolarFire burç gliflerini halkaya hizalı çiziyor: glifin "yukarı"sı dışa
    doğru bakıyor. Yani haritadan olduğu gibi kesersen glif yatık gelir.
    Ekran açısı θ olan bir glifi dikleştirmek için kırpımı (90 − θ) kadar
    döndürmek gerekir.
    """
    lon = 30 * k + 15
    theta = (180 + lon - ASC) % 360
    x, y = screen_xy(lon, 0.95)

    box = (int(x - half), int(y - half), int(x + half), int(y + half))
    crop = im.crop(box)
    rot = crop.rotate(90 - theta, resample=Image.BICUBIC, expand=True, fillcolor=(255, 255, 255))

    rp = rot.load()
    RW, RH = rot.size
    white = (255, 255, 255)
    target = ELEM_COLOR[elem]
    mask = [[False] * RW for _ in range(RH)]
    for j in range(RH):
        for i in range(RW):
            c = rp[i, j]
            if dist2(c, white) < 900:
                continue
            best_blend = min(
                dist2(c, tuple(int(target[t] + (255 - target[t]) * f) for t in range(3)))
                for f in (0.0, 0.25, 0.5, 0.7)
            )
            d_other = min(dist2(c, o) for o in OTHER_INKS if o != target)
            if best_blend <= d_other and best_blend < 9000:
                mask[j][i] = True
    return mask, theta


print('BURÇLAR (halkaya hizalı çizilmişler → dikleştiriliyor)')
for k, (name, elem) in enumerate(SIGNS):
    mask, theta = upright_sign_mask(k, elem)
    res = glyph_path(mask, min_cells=40, mode='frac', min_frac=0.10)
    if res:
        path, (gw, gh) = res
        out['signs'][name] = path
        print(f'  {name:<12} {len(path):>5} karakter  ({gw}×{gh}px)  {90 - theta:+.0f}° döndürüldü')
    else:
        print(f'  {name:<12} ÇIKARILAMADI')

print('\nGEZEGENLER (renk öbeği → en yakın beklenen açı)')
for name, lon, color in PLANETS:
    expected = (180 + lon - ASC) % 360
    cands = find_clusters(color, 0.56, 0.86)
    if not cands:
        print(f'  {name:<12} ÖBEK YOK')
        continue

    def angdiff(a):
        d = abs(a - expected) % 360
        return min(d, 360 - d)

    mx, my, ang, n = min(cands, key=lambda c: angdiff(c[2]))
    if angdiff(ang) > 25:
        print(f'  {name:<12} ⚠ en yakın öbek {angdiff(ang):.0f}° uzakta — atlandı')
        continue

    mask, _, _ = build_mask(mx, my, 48, color)
    res = glyph_path(mask, min_cells=18, mode='nested')
    if res:
        path, (gw, gh) = res
        out['planets'][name] = path
        print(f'  {name:<12} {len(path):>5} karakter  ({gw}×{gh}px)  açı {ang:.0f}° (beklenen {expected:.0f}°)')
    else:
        print(f'  {name:<12} ÇIKARILAMADI')

print('\nEK GLİFLER')
# GAD (☋) ve Şans Noktası (⊗) siyah; Rx kırmızı.
EXTRA = [
    ('southnode', 332.21, (0, 0, 0), 0.80),
    ('fortune',    36.17, (0, 0, 0), 0.80),
]
for name, lon, color, rf in EXTRA:
    expected = (180 + lon - ASC) % 360
    cands = find_clusters(color, 0.56, 0.86, min_px=120)
    if not cands:
        print(f'  {name:<12} ÖBEK YOK')
        continue

    def angdiff(a):
        d = abs(a - expected) % 360
        return min(d, 360 - d)

    mx, my, ang, n = min(cands, key=lambda c: angdiff(c[2]))
    if angdiff(ang) > 25:
        print(f'  {name:<12} ⚠ en yakın öbek {angdiff(ang):.0f}° uzakta')
        continue
    mask, _, _ = build_mask(mx, my, 48, color)
    mask = open_mask(mask, k=2)   # yapışık cusp çizgisini kopar
    res = glyph_path(mask, min_cells=40, mode='nested')
    if res:
        path, (gw, gh) = res
        out['planets'][name] = path
        print(f'  {name:<12} {len(path):>5} karakter  ({gw}×{gh}px)  açı {ang:.0f}°')

# Rx: kırmızı, retrograd gezegenin etiket yığınının ALTINDA.
# Jüpiter (357.45, Rx) seçildi: komşusu yok, etiketi tek başına.
# (Merkür denenmişti ama bitişik KAD'ın "02°" yazısı kutuya giriyordu.)
red_clusters = find_clusters((255, 0, 0), 0.56, 0.78, min_px=40, gap=30)
jup_ang = (180 + 357.45 - ASC) % 360
small = [c for c in red_clusters if c[3] < 900]   # Mars glifi büyük, Rx küçük
if small:
    def d(a):
        x = abs(a - jup_ang) % 360
        return min(x, 360 - x)
    mx, my, ang, n = min(small, key=lambda c: d(c[2]))
    mask, _, _ = build_mask(mx, my, 30, (255, 0, 0))
    res = glyph_path(mask, min_cells=14, mode='frac', min_frac=0.15)
    if res:
        path, (gw, gh) = res
        out['rx'] = path
        print(f'  {"rx":<12} {len(path):>5} karakter  ({gw}×{gh}px)  açı {ang:.0f}° ({n}px)')
    else:
        print('  rx           ÇIKARILAMADI')
else:
    print('  rx           KIRMIZI ÖBEK YOK')

with open('/tmp/glyphs/raw.json', 'w') as f:
    json.dump(out, f)

# ============================================
# JS MODÜLÜ ÜRET
# ============================================
SIGN_ORDER = [s[0] for s in SIGNS]
PLANET_KEYS = [
    'sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn',
    'uranus', 'neptune', 'pluto', 'northnode', 'southnode', 'chiron', 'fortune',
]

lines = [
    '/**',
    ' * AstroFire - SolarFire Glif Şekilleri',
    ' *',
    ' * BU DOSYA ÜRETİLMİŞTİR — elle düzenlemeyin.',
    ' *   python3 scripts/extract-glyphs.py',
    ' *',
    ' * SolarFire kendi özel astroloji fontunu kullanıyor ve o fonta erişimimiz yok.',
    ' * Ama referans haritalar (solarfire/) tüm glifleri içeriyor. Glifler beyaz zemin',
    ' * üzerinde tek renk dolu şekiller olduğu için görüntüden çıkarılıp vektörleştirildi:',
    ' *',
    ' *   renk maskesi → bağlı bileşen → piksel-kenarı takibi → RDP sadeleştirme',
    ' *',
    ' * Path\'ler 0-100 kutusuna normalize edilmiş, en-boy oranı korunmuş ve ortalanmıştır.',
    ' * evenodd dolgu kuralı ile çizilmelidir (delikler ters sarımlı).',
    ' *',
    ' * Not: burç glifleri haritada halkaya hizalı (döndürülmüş) çizildiği için',
    ' * çıkarılırken dikleştirildi — buradaki şekiller DİK haldedir.',
    ' */',
    '',
    '/** Burç glifleri — SIGNS dizisiyle aynı sırada (Koç → Balık). */',
    'export const SF_SIGN_PATHS = [',
]
for name in SIGN_ORDER:
    lines.append(f"  // {name}")
    lines.append(f"  '{out['signs'][name]}',")
lines.append('];')
lines.append('')
lines.append('/** Gezegen ve nokta glifleri. */')
lines.append('export const SF_PLANET_PATHS = {')
for k in PLANET_KEYS:
    if k in out['planets']:
        lines.append(f"  {k}: '{out['planets'][k]}',")
lines.append('};')
lines.append('')
lines.append('/** Retrograd işareti (℞). */')
lines.append(f"export const SF_RX_PATH = '{out['rx']}';")
lines.append('')

with open(OUT, 'w') as f:
    f.write('\n'.join(lines))

size = sum(len(v) for v in out['signs'].values()) + sum(len(v) for v in out['planets'].values()) + len(out['rx'])
print(f"\n→ {OUT}")
print(f"  {len(out['signs'])} burç + {len(out['planets'])} gezegen/nokta + Rx")
print(f"  toplam path verisi: {size/1024:.1f} KB")
