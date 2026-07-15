/**
 * AstroFire - SolarFire Birebir Chart Wheel
 *
 * Geometri, renkler, glif şekilleri ve etiket düzeni SolarFire referans
 * haritalarından (solarfire/) ölçülerek çıkarıldı:
 *
 *   Halkalar (dış yarıçapın oranı olarak)
 *     1.00  dış çember
 *     0.90  burç bandı iç sınırı — tik cetveli burada, dışa doğru
 *     0.84  ev bandı iç sınırı
 *     0.55  aspekt çemberi
 *     Burç glifleri 0.95'te, halkaya HİZALI (döndürülmüş)
 *     Gezegen etiketleri 0.80'den içeri doğru istiflenir, DİK
 *
 *   Renkler: SolarFire 16 renkli VGA paletini kullanıyor
 *     Element: ateş #FF0000 · toprak #00FF00 · hava #00CCC8 · su #0000FF
 *     Aspekt : uyumlu #0000FF · sert #FF0000
 *     Derece/dakika yazıları SİYAH; Rx daima KIRMIZI
 *
 * SEMBOLLER SolarFire'ın kendi fontundan DEĞİL, temiz standart vektörlerden gelir:
 *   Burçlar   → public/Symbols/*.svg (dolgu tabanlı; tablolarda da bunlar kullanılıyor)
 *   Gezegenler → symbols.js (çizgi tabanlı, Wikimedia "fixed width" ailesi)
 * SolarFire'ın kendi glifleri referanstan çıkarılıp denendi ama o font elle
 * çizilmiş/kıvrık bir estetiğe sahip; birebir kopyası haritayı çirkinleştiriyordu.
 * Yani düzen SolarFire'ın, semboller temiz standart.
 */

import { SIGNS } from './constants.js';
import { PLANET_SYMBOLS, SYMBOL_BOX, SYMBOL_STROKE } from './symbols.js';

// Burç sembolleri — repoda zaten duran temiz SVG'ler (tablolarda da bunlar kullanılıyor)
import ariesSvg from '../../public/Symbols/aries-symbol-icon.svg?raw';
import taurusSvg from '../../public/Symbols/taurus-symbol-icon.svg?raw';
import geminiSvg from '../../public/Symbols/gemini-symbol-icon.svg?raw';
import cancerSvg from '../../public/Symbols/cancer-symbol-icon.svg?raw';
import leoSvg from '../../public/Symbols/leo-symbol-icon.svg?raw';
import virgoSvg from '../../public/Symbols/virgo-symbol-icon.svg?raw';
import libraSvg from '../../public/Symbols/libra-symbol-icon.svg?raw';
import scorpioSvg from '../../public/Symbols/scorpio-symbol-icon.svg?raw';
import sagittariusSvg from '../../public/Symbols/sagittarius-symbol-icon.svg?raw';
import capricornSvg from '../../public/Symbols/capricorn-symbol-icon.svg?raw';
import aquariusSvg from '../../public/Symbols/aquarius-symbol-icon.svg?raw';
import piscesSvg from '../../public/Symbols/pisces-symbol-icon.svg?raw';

const SIGN_SVGS = [
  ariesSvg, taurusSvg, geminiSvg, cancerSvg, leoSvg, virgoSvg,
  libraSvg, scorpioSvg, sagittariusSvg, capricornSvg, aquariusSvg, piscesSvg,
];

// ============================================
// PALET (SolarFire 16 renk)
// ============================================

const ELEMENT_COLOR = {
  fire:  '#FF0000',
  earth: '#00FF00',
  air:   '#00CCC8',
  water: '#0000FF',
};

/** Gezegen renkleri — referans haritadan piksel örneklemesiyle alındı. */
const PLANET_COLOR = {
  'Güneş':        '#808000',
  'Ay':           '#808000',
  'Merkür':       '#800080',
  'Venüs':        '#008080',
  'Mars':         '#FF0000',
  'Jüpiter':      '#808080',
  'Satürn':       '#800000',
  'Uranüs':       '#0000FF',
  'Neptün':       '#008080',
  'Plüton':       '#800000',
  'KAD':          '#000000',
  'GAD':          '#000000',
  'Chiron':       '#008000',
  'Şans Noktası': '#000000',
};

/**
 * Gezegen adı → [sembol anahtarı, dönüş açısı].
 * GAD (☋) ayrı bir şekil değil: KAD'ın (☊) 180° döndürülmüş hâli.
 */
const PLANET_SYMBOL = {
  'Güneş':        ['sun', 0],
  'Ay':           ['moon', 0],
  'Merkür':       ['mercury', 0],
  'Venüs':        ['venus', 0],
  'Mars':         ['mars', 0],
  'Jüpiter':      ['jupiter', 0],
  'Satürn':       ['saturn', 0],
  'Uranüs':       ['uranus', 0],
  'Neptün':       ['neptune', 0],
  'Plüton':       ['pluto', 0],
  'KAD':          ['northnode', 0],
  'GAD':          ['northnode', Math.PI],
  'Chiron':       ['chiron', 0],
  'Şans Noktası': ['fortune', 0],
};

/**
 * Aspekt stilleri. SolarFire uyumlu aspektleri MAVİ, sert aspektleri KIRMIZI
 * çizer (saf #0000FF / #FF0000 — ara ton yok).
 *
 * Kalınlıklar referans haritadan ölçüldü: mavi çizgiler belirgin biçimde KALIN
 * (5-7px @ R=858), kırmızılar İNCE (2-3px). Burada yarıçapın oranı olarak
 * tutuluyor ki her canvas boyutunda aynı görünsün.
 */
const ASPECT_STYLE = {
  0:   { color: '#0000FF', width: 0.0055, glyph: 'conjunction' },
  120: { color: '#0000FF', width: 0.0050, glyph: 'trine' },
  60:  { color: '#0000FF', width: 0.0026, glyph: 'sextile' },
  180: { color: '#FF0000', width: 0.0030, glyph: 'opposition' },
  90:  { color: '#FF0000', width: 0.0024, glyph: 'square' },
};

const ANGLE_COLOR = '#FF0000';   // ASC/MC/DSC/IC eksenleri
const LINE_COLOR = '#000000';
const OUTER_RING_COLOR = '#7C3AED'; // bi-wheel'de dış haritanın çerçevesi

// ============================================
// SEMBOL ÇİZİMİ
// ============================================
// Path2D nesneleri önbelleklenir — her karede yeniden ayrıştırmak pahalı.

const signCache = new Map();
const planetCache = new Map();

/** Burç SVG'sini bir kez ayrıştır: viewBox + dolgu path'leri. */
function getSignShape(idx) {
  let shape = signCache.get(idx);
  if (shape) return shape;

  const svg = SIGN_SVGS[idx];
  const vb = svg.match(/viewBox="([^"]+)"/);
  const nums = vb ? vb[1].trim().split(/[\s,]+/).map(Number) : [0, 0, 100, 100];

  shape = {
    w: nums[2],
    h: nums[3],
    paths: [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map(m => new Path2D(m[1])),
  };
  signCache.set(idx, shape);
  return shape;
}

/** Burç sembolü — DOLGU tabanlı SVG. */
function drawSign(ctx, idx, x, y, size, color, rotation = 0) {
  const s = getSignShape(idx);
  if (!s.paths.length) return;

  const scale = size / Math.max(s.w, s.h);

  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.scale(scale, scale);
  ctx.translate(-s.w / 2, -s.h / 2);
  ctx.fillStyle = color;
  for (const p of s.paths) ctx.fill(p);
  ctx.restore();
}

function getPlanetShape(key) {
  let shape = planetCache.get(key);
  if (shape !== undefined) return shape;

  const def = PLANET_SYMBOLS[key];
  shape = def
    ? {
      stroke: def.stroke.map(d => new Path2D(d)),
      fill: (def.fill || []).map(d => new Path2D(d)),
    }
    : null;
  planetCache.set(key, shape);
  return shape;
}

/**
 * Gezegen sembolü — ÇİZGİ tabanlı (Wikimedia "fixed width" ailesi).
 * Kalınlık sembol birimindedir ve ölçeklemeyle birlikte büyür, yani sembol
 * her boyutta aynı orantıda ve net görünür.
 */
function drawPlanet(ctx, name, x, y, size, color) {
  const entry = PLANET_SYMBOL[name];
  if (!entry) return;

  const [key, rotation] = entry;
  const s = getPlanetShape(key);
  if (!s) return;

  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate(rotation);
  ctx.scale(size / SYMBOL_BOX, size / SYMBOL_BOX);
  ctx.translate(-SYMBOL_BOX / 2, -SYMBOL_BOX / 2);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = SYMBOL_STROKE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const p of s.stroke) ctx.stroke(p);
  for (const p of s.fill) ctx.fill(p);

  ctx.restore();
}

/** Retrograd işareti — kırmızı "Rx". */
function drawRx(ctx, x, y, fontSize) {
  ctx.save();
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = '#FF0000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Rx', x, y);
  ctx.restore();
}

// ============================================
// GEOMETRİ
// ============================================

/** Ekliptik boylam → ekran açısı (radyan, matematik konvansiyonu: CCW, +x'ten). */
function lonToAngle(lon, ascLon) {
  return Math.PI + (lon - ascLon) * Math.PI / 180;
}

function polarToXY(cx, cy, r, angle) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  };
}

/**
 * Halkaya hizalı çizim için dönüş açısı: glifin "yukarı"sı DIŞA bakar.
 * (Çıkarım sırasında burç gliflerini tam bu açının tersiyle dikleştirdik.)
 */
function ringRotation(angle) {
  return Math.PI / 2 - angle;
}

/** Yazıyı halkaya hizala ama baş aşağı düşmesin (alt yarıda 180° çevir). */
function textRotation(angle) {
  const r = ringRotation(angle);
  return Math.sin(angle) < 0 ? r + Math.PI : r;
}

/**
 * Yazıyı IŞIN boyunca (radyal, merkeze doğru) hizala — "spoke" gibi. Sağ yarıda
 * ve sol yarıda okuma yönü ters düşmesin diye normalize edilir.
 */
function radialRotation(angle) {
  let r = -angle;               // ışın yönü (canvas y aşağı)
  if (Math.cos(angle) < 0) r += Math.PI;   // sol yarıda baş aşağı olmasın
  return r;
}

/**
 * Üst üste binen gezegenleri açısal olarak ayırır — sıraları asla değişmez.
 * (SolarFire de aynısını yapıyor: Venüs ve Mars 1° arayken bile etiketleri ayrı.)
 */
function avoidCollisions(items, radius, minSpacing) {
  if (items.length <= 1) return items.map(p => ({ ...p, displayAngle: p.angle }));

  const TWO_PI = Math.PI * 2;
  const minAngle = minSpacing / radius;
  const n = items.length;

  const arr = items.map(p => {
    const a = ((p.angle % TWO_PI) + TWO_PI) % TWO_PI;
    return { ...p, displayAngle: a };
  });
  arr.sort((a, b) => a.displayAngle - b.displayAngle);

  for (let pass = 0; pass < 200; pass++) {
    let moved = false;

    for (let i = 0; i < n - 1; i++) {
      const gap = arr[i + 1].displayAngle - arr[i].displayAngle;
      if (gap < minAngle) {
        const push = (minAngle - gap) * 0.3;
        arr[i].displayAngle -= push;
        arr[i + 1].displayAngle += push;
        moved = true;
      }
    }

    const wrap = (arr[0].displayAngle + TWO_PI) - arr[n - 1].displayAngle;
    if (wrap < minAngle && wrap > 0 && wrap < Math.PI) {
      const push = (minAngle - wrap) * 0.3;
      arr[n - 1].displayAngle -= push;
      arr[0].displayAngle += push;
      moved = true;
    }

    if (!moved) break;
  }

  return arr;
}

/** Tüm halka yarıçapları — overlay'ler de bunu kullanır ki hizalar tutsun. */
export function wheelRadii(size) {
  // SolarFire çarkı canvas'ın ~%80'ini kaplar (R/canvas ≈ 0.40, ölçüldü).
  const R = size * 0.40;
  return {
    R,
    outerR:   R,
    signInR:  R * 0.875,       // burç bandı biraz genişledi (glife nefes açıyor)
    houseInR: R * 0.82,
    innerR:   R * 0.55,
    signGlyphR: R * 0.9375,    // genişleyen bandın ortası
    tickOutR: R * 0.905,
    tickLongOutR: R * 0.92,
    labelR:   R * 0.850,       // ev numaraları + cusp dereceleri
  };
}

// ============================================
// BURÇ HALKASI + TİK CETVELİ
// ============================================

function circle(ctx, cx, cy, r, width = 1.4, color = LINE_COLOR) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawSignRing(ctx, cx, cy, R, ascLon) {
  circle(ctx, cx, cy, R.outerR, 1.8);
  circle(ctx, cx, cy, R.signInR, 1.4);

  // Burç sınırları — yalnızca burç bandı içinde
  ctx.save();
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 1.0;
  for (let s = 0; s < 12; s++) {
    const a = lonToAngle(s * 30, ascLon);
    const p1 = polarToXY(cx, cy, R.signInR, a);
    const p2 = polarToXY(cx, cy, R.outerR, a);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.restore();

  // Burç glifleri — halkaya hizalı, element renginde.
  // Boyut, bandın YÜKSEKLİĞİNE (outerR − signInR = 0.10R) göre ayarlı: glif
  // döndürülünce uzun kenarı teğetsel uzanır, kısa kenarı radyal — 0.095R'de
  // banda sığar, taşmaz. (0.135R banttan taşıyordu.)
  const glyphSize = R.R * 0.086;
  for (let s = 0; s < 12; s++) {
    const a = lonToAngle(s * 30 + 15, ascLon);
    const p = polarToXY(cx, cy, R.signGlyphR, a);
    drawSign(ctx, s, p.x, p.y, glyphSize,
      ELEMENT_COLOR[SIGNS[s].element], ringRotation(a));
  }

  // Tik cetveli: her 1°'de bir, burç sınırlarında (30°) daha uzun.
  // 0.90 çemberinden DIŞA doğru uzanır.
  ctx.save();
  ctx.strokeStyle = LINE_COLOR;
  for (let deg = 0; deg < 360; deg++) {
    const a = lonToAngle(deg, ascLon);
    const long = deg % 30 === 0;
    const p1 = polarToXY(cx, cy, R.signInR, a);
    const p2 = polarToXY(cx, cy, long ? R.tickLongOutR : R.tickOutR, a);
    ctx.lineWidth = long ? 1.2 : 0.7;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.restore();
}

// ============================================
// EV BANDI — cusp çizgileri, ev numaraları, cusp dereceleri
// ============================================

function formatDegMin(lon) {
  const inSign = ((lon % 30) + 30) % 30;
  const deg = Math.floor(inSign);
  const min = Math.floor((inSign - deg) * 60);
  return {
    deg: String(deg).padStart(2, '0'),
    min: String(min).padStart(2, '0'),
  };
}

function drawHouseBand(ctx, cx, cy, houses, R, ascLon, opts = {}) {
  if (!houses?.cusps) return;

  const cusps = houses.cusps;
  circle(ctx, cx, cy, R.houseInR, 1.4);

  const angleHouses = new Set([1, 4, 7, 10]);
  const degFont = Math.max(9, R.R * 0.036);
  const numFont = Math.max(9, R.R * 0.040);

  for (const cusp of cusps) {
    const a = lonToAngle(cusp.longitude, ascLon);
    const isAngle = angleHouses.has(cusp.house);

    // Cusp çizgisi: aspekt çemberinden burç bandına kadar.
    // Açı cuspları (ASC/IC/DSC/MC) kırmızı ve DIŞ çembere kadar uzar.
    const p1 = polarToXY(cx, cy, R.innerR, a);
    const p2 = polarToXY(cx, cy, isAngle ? R.outerR : R.signInR, a);

    ctx.save();
    ctx.strokeStyle = isAngle ? ANGLE_COLOR : LINE_COLOR;
    ctx.lineWidth = isAngle ? 1.6 : 0.9;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();

    // Cusp derecesi: SolarFire gibi TEK satır "DD°MM'", halkaya TEĞET, cusp
    // çizgisinin üzerinde ortalanmış, tik halkasının hemen içinde. (Önceden
    // derece ve dakika radyal alt alta konuyordu; üst ve alt yarıda sıraları
    // ters düşüp "28' / 03°" gibi kafa karıştırıyordu — SolarFire hep tek satır
    // teğet yazıyor.)
    const { deg, min } = formatDegMin(cusp.longitude);
    const labelRadius = R.signInR - R.R * 0.032;
    const lp = polarToXY(cx, cy, labelRadius, a);

    ctx.save();
    ctx.fillStyle = LINE_COLOR;
    ctx.font = `${degFont}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.translate(lp.x, lp.y);
    ctx.rotate(textRotation(a));
    ctx.fillText(`${deg}°${min}'`, 0, 0);
    ctx.restore();
  }

  // Ev numaraları — evin ortasında
  ctx.save();
  ctx.fillStyle = LINE_COLOR;
  ctx.font = `${numFont}px Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < 12; i++) {
    const cur = cusps[i];
    const next = cusps[(i + 1) % 12];

    let span = next.longitude - cur.longitude;
    while (span <= 0) span += 360;
    const midLon = cur.longitude + span / 2;

    const a = lonToAngle(midLon, ascLon);
    const p = polarToXY(cx, cy, R.labelR, a);

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(textRotation(a));
    ctx.fillText(String(cur.house), 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ============================================
// GEZEGENLER — SolarFire etiket yığını
// ============================================

/**
 * SolarFire gezegen etiketi, DİK olarak istiflenmiş satırlardan oluşur:
 *
 *     ☉        ← gezegen glifi (gezegen renginde)
 *    13°       ← derece (SİYAH, sıfır dolgulu)
 *     ♌        ← burç glifi (element renginde)
 *    48'       ← dakika (SİYAH)
 *     ℞        ← retrograd (KIRMIZI) — yalnızca gerekiyorsa
 *
 * Satırlar gezegenin açısı boyunca merkeze doğru iner. Ayrıca gezegenin GERÇEK
 * boylamında aspekt çemberi üzerine renkli bir işaret konur — etiket çakışma
 * önleme ile kaydırılsa bile gerçek konum görünür kalır.
 */
function drawPlanets(ctx, cx, cy, planets, R, ascLon, partOfFortune) {
  if (!planets?.length) return;

  const list = [...planets];
  if (partOfFortune) {
    list.push({ ...partOfFortune, isRetrograde: false, id: -99 });
  }

  const items = list.map(p => ({
    planet: p,
    angle: lonToAngle(p.longitude, ascLon),
  }));

  // SolarFire'dan piksel ölçümü: derece/dakika font 0.037R, gezegen glifi 0.065R,
  // yığın burç glifi 0.042R, satır aralığı ~0.050R.
  const glyphR = R.R * 0.80;
  const glyphSize = R.R * 0.066;
  const signSize = R.R * 0.042;
  const font = Math.max(8, R.R * 0.038);
  const rowGap = R.R * 0.050;

  // Çakışma önlemenin açısal aralığı: gezegenler gerçek derecesine mümkün
  // olduğunca YAKIN kalsın, sadece glifleri üst üste binmesin. 1.08 ≈ glif
  // genişliği kadar (glif teğet ~0.066/0.80R). Daha büyük değerler yakın
  // çiftleri (Chiron 18° / Şans Noktası 19°) aşırı ayırıyor, hatta uç
  // gezegeni (Plüto) komşu evin içine itiyordu.
  const placed = avoidCollisions(items, glyphR, glyphSize * 1.08);

  for (const item of placed) {
    const p = item.planet;
    const a = item.displayAngle;
    const color = PLANET_COLOR[p.name] || '#000000';

    // Gerçek boylamdaki işaret (aspekt çemberi üzerinde). Etiket kaydırılmışsa,
    // gliften gerçek konuma ince bir kılavuz çizgi çeker (SolarFire de yapar).
    const trueA = lonToAngle(p.longitude, ascLon);
    const t1 = polarToXY(cx, cy, R.innerR, trueA);
    const t2 = polarToXY(cx, cy, R.innerR + R.R * 0.022, trueA);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.stroke();
    ctx.restore();

    const pos = formatDegMin(p.longitude);
    const signIdx = Math.floor(((p.longitude % 360) + 360) % 360 / 30);
    const sign = SIGNS[signIdx];

    // Yalnızca gezegen GLİFİNİN arkasına dar bir beyaz maske: glif bir ev/aspekt
    // çizgisinin üstündeyse (ör. Satürn 6. ev girişinde) çizgi glifin içinden
    // geçmez, gezegen net görünür. Yazılara halo YOK — geniş beyaz daireler
    // alttaki aspekt çizgilerini siliyordu ("16°" derecesinin altındaki çizgiler
    // yok olmuştu); yazılar zaten küçük, çizgi arkalarından geçse de okunur.
    // Gezegen glifi doğrudan çizilir (halo yok). Gezegenler zaten en son
    // çizildiği için ev/aspekt çizgilerinin ÜSTÜNDE kalır — beyaz halo etraflarını
    // siliyor ve "silik" bir görünüm yaratıyordu.
    let r = glyphR;

    const gp = polarToXY(cx, cy, r, a);
    drawPlanet(ctx, p.name, gp.x, gp.y, glyphSize, color);

    ctx.save();
    ctx.font = `${font}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    r -= rowGap;
    const dp = polarToXY(cx, cy, r, a);
    ctx.fillStyle = LINE_COLOR;
    ctx.fillText(`${pos.deg}°`, dp.x, dp.y);

    r -= rowGap;
    const sp = polarToXY(cx, cy, r, a);
    ctx.restore();
    drawSign(ctx, signIdx, sp.x, sp.y, signSize, ELEMENT_COLOR[sign.element]);

    ctx.save();
    ctx.font = `${font}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    r -= rowGap;
    const mp = polarToXY(cx, cy, r, a);
    ctx.fillStyle = LINE_COLOR;
    ctx.fillText(`${pos.min}'`, mp.x, mp.y);
    ctx.restore();

    if (p.isRetrograde) {
      r -= rowGap;
      const rp = polarToXY(cx, cy, r, a);
      drawRx(ctx, rp.x, rp.y, font * 0.78);
    }
  }
}

// ============================================
// ASPEKTLER
// ============================================

/** Aspekt sembolleri — SolarFire'ınkiler basit geometrik şekiller. */
function drawAspectGlyph(ctx, x, y, kind, color, size) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = 1.1;
  const s = size / 2;

  // Sembolün arkasını temizle ki çizgi içinden geçmesin
  ctx.beginPath();
  ctx.arc(x, y, s * 1.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  if (kind === 'square') {
    ctx.rect(x - s, y - s, s * 2, s * 2);
  } else if (kind === 'trine') {
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s, y + s * 0.8);
    ctx.lineTo(x - s, y + s * 0.8);
    ctx.closePath();
  } else if (kind === 'sextile') {
    for (let i = 0; i < 3; i++) {
      const ang = (i * Math.PI) / 3;
      ctx.moveTo(x - s * Math.cos(ang), y - s * Math.sin(ang));
      ctx.lineTo(x + s * Math.cos(ang), y + s * Math.sin(ang));
    }
  } else if (kind === 'opposition') {
    ctx.moveTo(x - s, y);
    ctx.lineTo(x + s, y);
    ctx.moveTo(x, y - s);
    ctx.lineTo(x, y + s);
    ctx.arc(x, y, s, 0, Math.PI * 2);
  } else { // conjunction
    ctx.arc(x - s * 0.35, y, s * 0.5, 0, Math.PI * 2);
    ctx.moveTo(x + s * 0.9, y - s * 0.5);
    ctx.lineTo(x + s * 0.2, y + s * 0.6);
  }
  ctx.stroke();
  ctx.restore();
}

/**
 * @param {Set<string>|null} activeSet - Görünür gezegen adları. null → hepsi.
 *   Bir aspekt çizilir eğer EN AZ BİR ucu bu sette (ders modu: tek gezegen
 *   seçip onun bütün açılarını görmek için).
 */
function drawAspects(ctx, cx, cy, planets, aspects, R, ascLon, partOfFortune, activeSet = null) {
  if (!aspects?.length) return;

  const lonOf = {};
  for (const p of planets) lonOf[p.name] = p.longitude;
  if (partOfFortune) lonOf[partOfFortune.name] = partOfFortune.longitude;

  const visible = (asp) => !activeSet
    || activeSet.has(asp.planet1?.name) || activeSet.has(asp.planet2?.name);

  const glyphSize = R.R * 0.026;

  for (const aspect of aspects) {
    if (!visible(aspect)) continue;
    const style = ASPECT_STYLE[aspect.angle];
    if (!style) continue;

    const l1 = lonOf[aspect.planet1?.name];
    const l2 = lonOf[aspect.planet2?.name];
    if (l1 === undefined || l2 === undefined) continue;

    const p1 = polarToXY(cx, cy, R.innerR, lonToAngle(l1, ascLon));
    const p2 = polarToXY(cx, cy, R.innerR, lonToAngle(l2, ascLon));

    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = Math.max(1, style.width * R.R);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }

  // Semboller çizgilerin ÜSTÜNE — arka planları temizlenerek
  for (const aspect of aspects) {
    if (!visible(aspect)) continue;
    const style = ASPECT_STYLE[aspect.angle];
    if (!style) continue;

    const l1 = lonOf[aspect.planet1?.name];
    const l2 = lonOf[aspect.planet2?.name];
    if (l1 === undefined || l2 === undefined) continue;

    const p1 = polarToXY(cx, cy, R.innerR, lonToAngle(l1, ascLon));
    const p2 = polarToXY(cx, cy, R.innerR, lonToAngle(l2, ascLon));

    drawAspectGlyph(ctx, (p1.x + p2.x) / 2, (p1.y + p2.y) / 2,
      style.glyph, style.color, glyphSize);
  }
}

// ============================================
// BİLGİ BLOĞU
// ============================================

function drawInfoBlock(ctx, options, R) {
  const x = R.R * 0.04;
  let y = R.R * 0.05;
  const lh = Math.max(14, R.R * 0.042);

  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (options.title) {
    ctx.font = `bold ${lh * 1.15}px Arial, sans-serif`;
    ctx.fillStyle = '#000000';
    ctx.fillText(options.title, x, y);
    y += lh * 1.35;
  }

  if (options.subtitle) {
    ctx.font = `${lh * 0.85}px Arial, sans-serif`;
    ctx.fillStyle = '#000000';
    for (const line of options.subtitle.split('\n')) {
      ctx.fillText(line, x, y);
      y += lh * 0.95;
    }
  }

  // Hesaplama ayarları. Kompozit bir midpoint haritasıdır — cuspları bir ev
  // SİSTEMİNDEN değil, iki haritanın cusplarının orta noktasından gelir.
  const houseLabel = options.chartType === 'composite'
    ? 'Composite Midpoint Houses'
    : 'Placidus';

  ctx.font = `italic ${lh * 0.85}px Arial, sans-serif`;
  ctx.fillStyle = ANGLE_COLOR;
  for (const s of ['Geocentric', 'Tropical', houseLabel, 'Mean Node']) {
    ctx.fillText(s, x, y);
    y += lh * 0.9;
  }

  ctx.restore();
}

/**
 * ASC / DESC / MC / IC etiketlerini çarkın DIŞ tarafına yazar (dış çemberin
 * hemen ötesine). Yalnızca dört ana açı; kırmızı, küçük, radyal.
 */
function drawAngleLabels(ctx, cx, cy, houses, R, ascLon) {
  if (!houses) return;

  const angles = [
    ['ASC', houses.ascendant],
    ['DESC', houses.descendant ?? (houses.ascendant + 180)],
    ['MC', houses.mc],
    ['IC', houses.ic ?? (houses.mc + 180)],
  ];

  const labelR = R.outerR + R.R * 0.045;
  const fontSize = Math.max(9, R.R * 0.034);

  ctx.save();
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = ANGLE_COLOR;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [name, lon] of angles) {
    if (lon == null) continue;
    const a = lonToAngle(lon, ascLon);
    const p = polarToXY(cx, cy, labelR, a);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(textRotation(a));
    ctx.fillText(name, 0, 0);
    ctx.restore();
  }
  ctx.restore();
}

// ============================================
// TEKİL ÇARK
// ============================================

export function drawChartWheel(canvas, chartData, options = {}) {
  if (!canvas || !chartData) return;

  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const R = wheelRadii(size);
  const ascLon = chartData.houses?.ascendant ?? 0;

  drawSignRing(ctx, cx, cy, R, ascLon);
  drawHouseBand(ctx, cx, cy, chartData.houses, R, ascLon);
  drawAngleLabels(ctx, cx, cy, chartData.houses, R, ascLon);
  circle(ctx, cx, cy, R.innerR, 1.4);

  // Dekan halkası (varsa) — gezegenlerden ÖNCE ki gezegenler üstte kalsın.
  if (options.decans) {
    drawDecanLayer(ctx, cx, cy, options.decans, R, ascLon);
  }

  if (options.showAspects !== false && chartData.aspects) {
    drawAspects(ctx, cx, cy, chartData.planets, chartData.aspects, R, ascLon, chartData.partOfFortune, options.activePlanets || null);
  }

  drawPlanets(ctx, cx, cy, chartData.planets, R, ascLon, chartData.partOfFortune);

  if (options.title) drawInfoBlock(ctx, options, R);
}

// ============================================
// BI-WHEEL — içte natal/Kişi A, dışta transit/progres/Kişi B
// ============================================

export function wheelRadiiBi(size) {
  const R = size * 0.47;
  return {
    R,
    outerR:   R,                 // dış çember — dış haritanın çerçevesi
    outerGlyphR: R * 0.945,      // dış haritanın gezegen glifi; satırlar içeri iner
    signOutR: R * 0.775,
    signInR:  R * 0.700,
    houseInR: R * 0.650,
    innerR:   R * 0.380,         // aspekt çemberi
    signGlyphR: R * 0.7375,
    tickOutR:     R * 0.718,
    tickLongOutR: R * 0.730,
    labelR:   R * 0.675,         // ev numaraları + cusp dereceleri
    innerGlyphR: R * 0.590,      // iç haritanın gezegen glifi
  };
}

function drawBiSignRing(ctx, cx, cy, R, ascLon) {
  circle(ctx, cx, cy, R.signOutR, 1.4);
  circle(ctx, cx, cy, R.signInR, 1.4);

  ctx.save();
  ctx.strokeStyle = LINE_COLOR;
  ctx.lineWidth = 0.9;
  for (let s = 0; s < 12; s++) {
    const a = lonToAngle(s * 30, ascLon);
    const p1 = polarToXY(cx, cy, R.signInR, a);
    const p2 = polarToXY(cx, cy, R.signOutR, a);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.restore();

  const glyphSize = R.R * 0.058;
  for (let s = 0; s < 12; s++) {
    const a = lonToAngle(s * 30 + 15, ascLon);
    const p = polarToXY(cx, cy, R.signGlyphR, a);
    drawSign(ctx, s, p.x, p.y, glyphSize,
      ELEMENT_COLOR[SIGNS[s].element], ringRotation(a));
  }

  // Tik cetveli — tekil çarktaki gibi, 1° adımlarla
  ctx.save();
  ctx.strokeStyle = LINE_COLOR;
  for (let deg = 0; deg < 360; deg++) {
    const a = lonToAngle(deg, ascLon);
    const long = deg % 30 === 0;
    const p1 = polarToXY(cx, cy, R.signInR, a);
    const p2 = polarToXY(cx, cy, long ? R.tickLongOutR : R.tickOutR, a);
    ctx.lineWidth = long ? 1.1 : 0.6;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Dış haritanın gezegenleri. Yığın DIŞA doğru açılır: glif burç halkasının
 * hemen dışında (gerçek pozisyon işaretine yakın), derece/burç/dakika ondan
 * DIŞARI doğru. Böylece glif ile çizgisi arasında boşluk kalmaz.
 */
function drawOuterPlanets(ctx, cx, cy, planets, R, ascLon) {
  if (!planets?.length) return;

  const items = planets.map(p => ({ planet: p, angle: lonToAngle(p.longitude, ascLon) }));

  const glyphR = R.signOutR + R.R * 0.045;   // burç halkasının hemen dışı
  const glyphSize = R.R * 0.033;
  const signSize = R.R * 0.022;
  const font = Math.max(7, R.R * 0.021);
  const rowGap = R.R * 0.027;

  const placed = avoidCollisions(items, glyphR, glyphSize * 1.7);

  for (const item of placed) {
    const p = item.planet;
    const a = item.displayAngle;
    const color = PLANET_COLOR[p.name] || '#000000';

    // Gerçek boylam işareti — glifin hemen içinde, burç halkasına değecek
    const trueA = lonToAngle(p.longitude, ascLon);
    const t1 = polarToXY(cx, cy, R.signOutR, trueA);
    const t2 = polarToXY(cx, cy, R.signOutR + R.R * 0.030, trueA);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.stroke();
    ctx.restore();

    const pos = formatDegMin(p.longitude);
    const signIdx = Math.floor(((p.longitude % 360) + 360) % 360 / 30);

    let r = glyphR;
    const gp = polarToXY(cx, cy, r, a);
    drawPlanet(ctx, p.name, gp.x, gp.y, glyphSize, color);

    ctx.save();
    ctx.font = `${font}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = LINE_COLOR;

    r += rowGap;
    const dp = polarToXY(cx, cy, r, a);
    ctx.fillText(`${pos.deg}°`, dp.x, dp.y);

    r += rowGap;
    const sp = polarToXY(cx, cy, r, a);
    drawSign(ctx, signIdx, sp.x, sp.y, signSize, ELEMENT_COLOR[SIGNS[signIdx].element]);

    r += rowGap;
    const mp = polarToXY(cx, cy, r, a);
    ctx.fillText(`${pos.min}'`, mp.x, mp.y);
    ctx.restore();

    if (p.isRetrograde) {
      r += rowGap;
      const rp = polarToXY(cx, cy, r, a);
      drawRx(ctx, rp.x, rp.y, font * 0.78);
    }
  }
}

/** İç haritanın gezegenleri — burç halkasının içinde. */
function drawInnerPlanets(ctx, cx, cy, planets, R, ascLon, partOfFortune) {
  if (!planets?.length) return;

  const list = [...planets];
  if (partOfFortune) list.push({ ...partOfFortune, isRetrograde: false, id: -99 });

  const items = list.map(p => ({ planet: p, angle: lonToAngle(p.longitude, ascLon) }));

  const glyphR = R.innerGlyphR;
  const glyphSize = R.R * 0.033;
  const signSize = R.R * 0.022;
  const font = Math.max(7, R.R * 0.021);
  const rowGap = R.R * 0.026;

  const placed = avoidCollisions(items, glyphR, glyphSize * 1.8);

  for (const item of placed) {
    const p = item.planet;
    const a = item.displayAngle;
    const color = PLANET_COLOR[p.name] || '#000000';

    const trueA = lonToAngle(p.longitude, ascLon);
    const t1 = polarToXY(cx, cy, R.innerR, trueA);
    const t2 = polarToXY(cx, cy, R.innerR + R.R * 0.020, trueA);
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(t1.x, t1.y);
    ctx.lineTo(t2.x, t2.y);
    ctx.stroke();
    ctx.restore();

    const pos = formatDegMin(p.longitude);
    const signIdx = Math.floor(((p.longitude % 360) + 360) % 360 / 30);

    let r = glyphR;
    const gp = polarToXY(cx, cy, r, a);
    drawPlanet(ctx, p.name, gp.x, gp.y, glyphSize, color);

    ctx.save();
    ctx.font = `${font}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = LINE_COLOR;

    r -= rowGap;
    const dp = polarToXY(cx, cy, r, a);
    ctx.fillText(`${pos.deg}°`, dp.x, dp.y);

    r -= rowGap;
    const sp = polarToXY(cx, cy, r, a);
    drawSign(ctx, signIdx, sp.x, sp.y, signSize, ELEMENT_COLOR[SIGNS[signIdx].element]);

    r -= rowGap;
    const mp = polarToXY(cx, cy, r, a);
    ctx.fillText(`${pos.min}'`, mp.x, mp.y);
    ctx.restore();

    if (p.isRetrograde) {
      r -= rowGap;
      const rp = polarToXY(cx, cy, r, a);
      drawRx(ctx, rp.x, rp.y, font * 0.78);
    }
  }
}

/** Dış haritanın kendi ev cuspları (varsa) — mor, en dış bantta. */
function drawOuterFrame(ctx, cx, cy, houses, R, ascLon) {
  if (!houses?.cusps) return;

  circle(ctx, cx, cy, R.outerR, 1.2, OUTER_RING_COLOR);

  ctx.save();
  ctx.strokeStyle = OUTER_RING_COLOR;
  ctx.lineWidth = 0.9;
  for (const cusp of houses.cusps) {
    const a = lonToAngle(cusp.longitude, ascLon);
    const p1 = polarToXY(cx, cy, R.signOutR, a);
    const p2 = polarToXY(cx, cy, R.outerR, a);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBiWheelAspects(ctx, cx, cy, outerPlanets, innerPlanets, aspects, R, ascLon, activeSet = null) {
  if (!aspects?.length) return;

  const outerLon = {};
  for (const p of outerPlanets) outerLon[p.name] = p.longitude;
  const innerLon = {};
  for (const p of innerPlanets) innerLon[p.name] = p.longitude;

  const visible = (aspect) => !activeSet
    || activeSet.has(aspect.transitPlanet?.name)
    || activeSet.has(aspect.natalPlanet?.name);

  const endpoints = (aspect) => {
    const style = ASPECT_STYLE[aspect.angle];
    if (!style) return null;
    const l1 = outerLon[aspect.transitPlanet?.name];
    const l2 = innerLon[aspect.natalPlanet?.name];
    if (l1 === undefined || l2 === undefined) return null;
    return {
      style,
      p1: polarToXY(cx, cy, R.innerR, lonToAngle(l1, ascLon)),
      p2: polarToXY(cx, cy, R.innerR, lonToAngle(l2, ascLon)),
    };
  };

  // Çizgiler
  for (const aspect of aspects) {
    if (!visible(aspect)) continue;
    const e = endpoints(aspect);
    if (!e) continue;

    ctx.save();
    ctx.strokeStyle = e.style.color;
    ctx.lineWidth = Math.max(1, e.style.width * R.R * 0.85);
    ctx.beginPath();
    ctx.moveTo(e.p1.x, e.p1.y);
    ctx.lineTo(e.p2.x, e.p2.y);
    ctx.stroke();
    ctx.restore();
  }

  // Aspekt sembolleri (kare/üçgen/…) çizgilerin ÜSTÜNE — natal çarkındaki gibi,
  // hangi açının ne olduğu belli olsun.
  const glyphSize = R.R * 0.024;
  for (const aspect of aspects) {
    if (!visible(aspect)) continue;
    const e = endpoints(aspect);
    if (!e) continue;
    drawAspectGlyph(ctx, (e.p1.x + e.p2.x) / 2, (e.p1.y + e.p2.y) / 2,
      e.style.glyph, e.style.color, glyphSize);
  }
}

export function drawBiWheel(canvas, natalData, transitData, options = {}) {
  if (!canvas || !natalData || !transitData) return;

  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const R = wheelRadiiBi(size);
  // Çerçeveyi İÇ harita kurar
  const ascLon = natalData.houses?.ascendant ?? 0;

  drawBiSignRing(ctx, cx, cy, R, ascLon);
  drawHouseBand(ctx, cx, cy, natalData.houses, R, ascLon);
  circle(ctx, cx, cy, R.innerR, 1.4);

  // Not: dış haritanın (progres) kendi ev çerçevesini ÇİZMİYORUZ. Progres'te
  // vardı ama transit'te yok; tutarlılık için her bi-wheel transit gibi görünür.
  // (drawOuterFrame korunuyor ama artık çağrılmıyor.)

  if (transitData.transitNatalAspects) {
    drawBiWheelAspects(ctx, cx, cy, transitData.planets, natalData.planets,
      transitData.transitNatalAspects, R, ascLon, options.activePlanets || null);
  }

  drawInnerPlanets(ctx, cx, cy, natalData.planets, R, ascLon, natalData.partOfFortune);
  drawOuterPlanets(ctx, cx, cy, transitData.planets, R, ascLon);

  if (options.title) drawInfoBlock(ctx, options, R);
}

// ============================================
// OVERLAY'LER (dekan / 7'ler) — mevcut çarkın ÜSTÜNE çizer
// ============================================

export function drawSevenYearOverlay(canvas, chartData, sevensData, options = {}) {
  if (!canvas || !chartData || !sevensData) return;
  const { showAges = true } = options;
  if (!showAges) return;

  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const R = wheelRadii(size);
  const ascLon = chartData.houses?.ascendant ?? 0;

  const AGE_COLOR = { fire: '#FF0000', earth: '#00AA00', air: '#00A8A5', water: '#0000FF' };

  for (const house of sevensData) {
    for (const year of house.years) {
      const startAngle = lonToAngle(year.startLongitude, ascLon);
      const endAngle = lonToAngle(year.endLongitude, ascLon);
      const element = year.decanSign?.element || 'fire';

      if (year.yearIndex > 0) {
        const p1 = polarToXY(cx, cy, R.houseInR - 2, startAngle);
        const p2 = polarToXY(cx, cy, R.innerR + 2, startAngle);
        ctx.save();
        ctx.strokeStyle = 'rgba(140,120,200,0.4)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      }

      let diff = endAngle - startAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const midAngle = startAngle + diff / 2;

      // Yaş etiketi RADYAL (ışın boyunca, merkeze doğru) — dar yaş segmentlerine
      // teğetsel yazı sığmıyordu ("68-69..." çember boyunca üst üste biniyordu).
      // Tek yaş sayısı yazılır; radyal olduğu için segmente rahat sığar.
      const pos = polarToXY(cx, cy, R.houseInR - R.R * 0.035, midAngle);
      // Yaşam yılı 1'den başlar (age 0 = 1. yıl). SolarFire de 1-84 sayar.
      const label = `${year.age + 1}`;
      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(radialRotation(midAngle));
      ctx.font = `bold ${Math.max(7, R.R * 0.024)}px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = AGE_COLOR[element] || '#666';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }
  }
}

/**
 * Dekan katmanı — GEZEGENLERDEN ÖNCE çizilir (drawChartWheel içinden), böylece
 * bir gezegen bir dekan sınırındaysa gezegen üstte kalır, dekan sembolü onu
 * ezmez. Dekan burç sembolleri ev bandının iç kenarında ince bir halka olur.
 */
function drawDecanLayer(ctx, cx, cy, decanData, R, ascLon) {
  for (const house of decanData) {
    for (const decan of house.decans) {
      const startAngle = lonToAngle(decan.startLongitude, ascLon);
      const endAngle = lonToAngle(decan.endLongitude, ascLon);

      // Dekan sınır çizgisi (ilk dekan = ev cuspu, atlanır)
      if (decan.index > 0) {
        const p1 = polarToXY(cx, cy, R.houseInR - 2, startAngle);
        const p2 = polarToXY(cx, cy, R.innerR + 2, startAngle);
        ctx.save();
        ctx.strokeStyle = 'rgba(140, 120, 200, 0.45)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      }

      let diff = endAngle - startAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const midAngle = startAngle + diff / 2;

      const signIdx = SIGNS.indexOf(decan.decanSign);
      if (signIdx >= 0) {
        const p = polarToXY(cx, cy, R.houseInR - R.R * 0.028, midAngle);
        drawSign(ctx, signIdx, p.x, p.y, R.R * 0.030,
          ELEMENT_COLOR[decan.decanSign.element]);
      }
    }
  }
}

/** Geriye uyumlu dış API — artık drawChartWheel options.decans tercih edilir. */
export function drawDecanOverlay(canvas, chartData, decanData) {
  if (!canvas || !chartData || !decanData) return;
  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const R = wheelRadii(size);
  drawDecanLayer(ctx, canvas.width / 2, canvas.height / 2, decanData, R,
    chartData.houses?.ascendant ?? 0);
}
