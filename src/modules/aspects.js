/**
 * AstroFire - Aspekt Motoru
 *
 * Tek aspekt hesabı; tüm harita tipleri bunu kullanır.
 * Önceden aynı döngü 5 kez (aynı-harita) + 2 kez (çapraz-harita) kopyalanmıştı
 * ve applying/separating mantığının 7 kopyası da aynı hatayı taşıyordu.
 */

import { MAJOR_ASPECTS } from './constants.js';
import { normalizeDegree } from './ephemeris.js';
import { angularSeparation } from './chartUtils.js';

// ============================================
// AÇI NOKTALARI (ASC/MC)
// ============================================

export const ASC_POINT_ID = -101;
export const MC_POINT_ID = -102;
const ANGLE_IDS = new Set([ASC_POINT_ID, MC_POINT_ID]);

/** Aspekt kaydındaki uç ASC/MC mi? (planetRef veya nokta objesi alır) */
export function isAnglePoint(ref) {
  return ref ? ANGLE_IDS.has(ref.id) : false;
}

/**
 * Ev objesinden ASC/MC'yi aspekt motorunun beklediği nokta şekline çevirir.
 * speed: 0 → applying/separating yalnız gezegenin hareketinden okunur.
 *
 * @param {Object} houses - {ascendant, mc} (harita `houses` objesi)
 * @returns {Array} calcAspects/calcCrossAspects'e eklenebilir noktalar
 */
export function anglePoints(houses) {
  if (!houses) return [];
  const pts = [];
  if (houses.ascendant != null) {
    pts.push({ id: ASC_POINT_ID, name: 'ASC', symbol: 'Asc', longitude: houses.ascendant, speed: 0 });
  }
  if (houses.mc != null) {
    pts.push({ id: MC_POINT_ID, name: 'MC', symbol: 'Mc', longitude: houses.mc, speed: 0 });
  }
  return pts;
}

/**
 * Aspekt yaklaşıyor mu (applying) uzaklaşıyor mu (separating)?
 *
 * `sep` = p1'in p2'den zodyak yönündeki ilerisi (0-360). Kısa yayı almak için
 * 180'in üstünü katlarız — ama katlama, ayrımın değişim hızının da işaretini
 * ters çevirir. Eski kod (7 ayrı kopyada) `sep`'i katlayıp `rate`'i katlamıyordu;
 * bu yüzden sonuç gezegenlerin dizideki SIRASINA bağlı hale geliyor, yani
 * aspektlerin yaklaşık yarısında applying/separating ters çıkıyordu.
 *
 * @param {Object} p1 - hareketli gezegen
 * @param {Object} p2 - ikinci gezegen
 * @param {number} aspectAngle - 0/60/90/120/180
 * @param {boolean} [staticP2=false] - p2 sabit kabul edilsin mi?
 *   Çapraz haritalarda (transit×natal, progres×natal) natal taraf sabittir:
 *   sadece transit/progres gezegeni hareket eder.
 * @returns {boolean}
 */
export function isApplying(p1, p2, aspectAngle, staticP2 = false) {
  let sep = normalizeDegree(p1.longitude - p2.longitude);
  let rate = (p1.speed || 0) - (staticP2 ? 0 : (p2.speed || 0));

  if (sep > 180) {
    sep = 360 - sep;
    rate = -rate; // katlama d(ayrım)/dt'nin işaretini de çevirir
  }

  // Ayrım aspekt açısının ÜSTÜNDEyse kapanarak (rate < 0), ALTINDAysa
  // açılarak (rate > 0) aspekte yaklaşır.
  return sep > aspectAngle ? rate < 0 : rate > 0;
}

/**
 * İki gezegenin arasındaki aspekti bulur (varsa).
 * MAJOR_ASPECTS sırasına göre ilk eşleşen orb penceresini alır.
 *
 * @returns {{aspectDef, orb}|null}
 */
function matchAspect(lon1, lon2) {
  const angle = angularSeparation(lon1, lon2);

  for (const aspectDef of MAJOR_ASPECTS) {
    const orb = Math.abs(angle - aspectDef.angle);
    if (orb <= aspectDef.orb) return { aspectDef, orb };
  }
  return null;
}

/** Aspekt kaydının ortak alanları. */
function aspectFields(aspectDef, orb, applying) {
  return {
    aspect: aspectDef.name,
    aspectEn: aspectDef.nameEn,
    aspectSymbol: aspectDef.symbol,
    angle: aspectDef.angle,
    orb,
    isApplying: applying,
  };
}

/** Gezegen referansı — tablolarda ve çizimde kullanılan minimal şekil. */
function planetRef(p) {
  return { name: p.name, symbol: p.symbol, id: p.id };
}

/**
 * AYNI harita içindeki gezegenler arası aspektler.
 * Natal, Solar Return, Lunar Return, transit×transit, progres×progres.
 *
 * @param {Array} planets - Şans Noktası ve GAD dahil edilebilir
 * @returns {Array<{planet1, planet2, aspect, aspectEn, aspectSymbol, angle, orb, isApplying}>}
 */
export function calcAspects(planets) {
  const aspects = [];

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];

      // ASC×MC gibi açı-açı çiftleri anlamsız (aralıkları ev sisteminin
      // geometrisi, gökyüzü değil) — atla.
      if (isAnglePoint(p1) && isAnglePoint(p2)) continue;

      const match = matchAspect(p1.longitude, p2.longitude);
      if (!match) continue;

      aspects.push({
        planet1: planetRef(p1),
        planet2: planetRef(p2),
        ...aspectFields(match.aspectDef, match.orb, isApplying(p1, p2, match.aspectDef.angle)),
      });
    }
  }

  return aspects;
}

/**
 * İKİ FARKLI harita arasındaki çapraz aspektler.
 * Transit×natal, progres×natal, sinastri (kişi A × kişi B).
 *
 * Alan adları `transitPlanet` / `natalPlanet`: bu isimler çizim katmanının
 * dayattığı sözleşme (chartWheelSF.js:1209-1210 bi-wheel aspekt çizerken bu
 * alanlara bakıyor). Sinastride de aynı adlar kullanılır — `transitPlanet` =
 * DIŞ halka (kişi B), `natalPlanet` = İÇ halka (kişi A).
 *
 * @param {Array} setA - dış/hareketli taraf (transit / progres / kişi B)
 * @param {Array} setB - iç/referans taraf (natal / kişi A)
 * @param {Object} [options]
 * @param {boolean} [options.staticB=true] - setB sabit kabul edilsin mi?
 *   Transit/progres için true (natal donuk). Sinastride her iki kişi de
 *   "donuk" olduğundan applying kavramı zayıftır; yine de her iki hızı
 *   kullanmak için false verilebilir.
 * @returns {Array}
 */
export function calcCrossAspects(setA, setB, options = {}) {
  const staticB = options.staticB !== false;
  const aspects = [];

  for (const a of setA) {
    for (const b of setB) {
      if (isAnglePoint(a) && isAnglePoint(b)) continue;

      const match = matchAspect(a.longitude, b.longitude);
      if (!match) continue;

      aspects.push({
        transitPlanet: planetRef(a),
        natalPlanet: planetRef(b),
        ...aspectFields(
          match.aspectDef,
          match.orb,
          isApplying(a, b, match.aspectDef.angle, staticB),
        ),
      });
    }
  }

  return aspects;
}
