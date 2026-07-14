/**
 * AstroFire - İkincil Progresyon (Secondary Progressions) Modülü
 * "Bir gün = bir yıl" yöntemiyle progres harita hesaplar.
 *
 * SolarFire uyumluluğu:
 * - Gezegen pozisyonları her zaman ikincil progresyon (gün=yıl) ile bulunur;
 *   açı yönteminden bağımsızdır.
 * - ASC/MC ve ev cuspları SolarFire'ın "Chart Angle Progression Type"
 *   ayarındaki yöntemlerden biriyle hesaplanır (default: True Solar Arc in Longitude).
 *
 * Görüntüleme transit gibi bi-wheel'dir: içte natal, dışta progres.
 */

import { NATAL_PLANETS, PLANETS } from './constants.js';
import {
  initEphemeris,
  calculateJulianDay,
  calculatePlanetPositions,
  calculateHouses,
  calculateHousesARMC,
  rightAscensionFromEcliptic,
  findHouseOfPlanet,
  findInterceptedSigns,
  getObliquity,
  normalizeDegree,
} from './ephemeris.js';
import { localToUTC, toDecimalHour } from './datetime.js';
import { calcAspects, calcCrossAspects } from './aspects.js';
import {
  jdToUTC,
  addSouthNode,
  buildHouseCusps,
  placePlanetsInHouses,
  calcPartOfFortune,
} from './chartUtils.js';

// Ortalama tropikal yıl (gün). Gün=yıl dönüşümünde kullanılır.
const TROPICAL_YEAR = 365.24219;
// Naibod oranı: Güneş'in ortalama günlük boylam hareketi (0°59'08" = derece)
const NAIBOD_RATE = 0.9856473;

/**
 * SolarFire "Chart Angle Progression Type" yöntemleri.
 * Bu yöntemler yalnızca açıları (ASC/MC/evler) etkiler; gezegenler değişmez.
 */
export const ANGLE_METHODS = [
  { key: 'solar_arc_long', name: 'True Solar Arc (Boylam)', nameEn: 'True Solar Arc in Longitude' },
  { key: 'solar_arc_ra', name: 'True Solar Arc (Sağ Açıklık)', nameEn: 'True Solar Arc in RA' },
  { key: 'naibod_long', name: 'Naibod (Boylam)', nameEn: 'Naibod in Longitude' },
  { key: 'naibod_ra', name: 'Naibod (Sağ Açıklık)', nameEn: 'Naibod in RA' },
  { key: 'quotidian', name: 'Mean Quotidian (Günlük Evler)', nameEn: 'Mean Quotidian (Daily Houses)' },
];

export const DEFAULT_ANGLE_METHOD = 'solar_arc_long';

/**
 * İkincil progresyon haritası hesaplar.
 *
 * @param {Object} natalChart - calculateNatalChart() sonucu (julianDay, planets, houses, birthData içermeli)
 * @param {Object} targetDate - Progres haritasının hedef tarihi { year, month, day }
 * @param {Object} [options]
 * @param {string} [options.angleMethod] - ANGLE_METHODS key'lerinden biri
 * @returns {Promise<Object>} Progres harita verisi
 */
export async function calculateSecondaryProgression(natalChart, targetDate, options = {}) {
  await initEphemeris();

  const angleMethod = options.angleMethod || DEFAULT_ANGLE_METHOD;

  const bd = natalChart.birthData;
  const natalJD = natalChart.julianDay;
  const natalLat = bd.latitude;
  const natalLon = bd.longitude;

  // Hedef anı, doğum saatini ve doğum yerinin saat dilimini koruyarak kur.
  // Böylece her doğum gününde geçen yıl tam sayı olur (yaş = tam yıl).
  const utc = localToUTC(
    targetDate.year,
    targetDate.month,
    targetDate.day,
    bd.hour ?? 12,
    bd.minute ?? 0,
    bd.timezone
  );
  const targetJD = calculateJulianDay(utc.year, utc.month, utc.day, toDecimalHour(utc.hour, utc.minute));

  // Doğumdan hedefe geçen gerçek süre (gün) → yıl
  const elapsedDays = targetJD - natalJD;
  const elapsedYears = elapsedDays / TROPICAL_YEAR;

  // Progres anı: gün=yıl. Doğum JD'sine (geçen yıl kadar) gün ekle.
  const progJD = natalJD + elapsedYears;

  // --- Progres gezegen pozisyonları (yöntemden bağımsız) ---
  const planets = addSouthNode(calculatePlanetPositions(progJD, NATAL_PLANETS));

  // --- Açılar (ASC/MC/evler) seçilen yönteme göre ---
  const eps = getObliquity(progJD);
  const natalSunLon = natalChart.planets.find(p => p.id === PLANETS.SUN.id).longitude;
  const progSun = planets.find(p => p.id === PLANETS.SUN.id);
  const progSunLon = progSun.longitude;

  // Solar arc (ileriye doğru boylam yayı)
  const solarArcLon = normalizeDegree(progSunLon - natalSunLon);

  const natalMC = natalChart.houses.mc;
  const natalARMC = rightAscensionFromEcliptic(natalMC, eps);

  let houses;
  let progMCLon;
  if (angleMethod === 'quotidian') {
    // Günlük evler: progres anının JD'sinde natal konumda tam harita yeniden hesaplanır
    houses = calculateHouses(progJD, natalLat, natalLon, 'P');
    progMCLon = houses.mc;
  } else {
    let armc;
    if (angleMethod === 'solar_arc_long') {
      progMCLon = normalizeDegree(natalMC + solarArcLon);
      armc = rightAscensionFromEcliptic(progMCLon, eps);
    } else if (angleMethod === 'naibod_long') {
      progMCLon = normalizeDegree(natalMC + elapsedYears * NAIBOD_RATE);
      armc = rightAscensionFromEcliptic(progMCLon, eps);
    } else if (angleMethod === 'solar_arc_ra') {
      const natalSunRA = rightAscensionFromEcliptic(natalSunLon, eps);
      const progSunRA = rightAscensionFromEcliptic(progSunLon, eps);
      const arcRA = normalizeDegree(progSunRA - natalSunRA);
      armc = normalizeDegree(natalARMC + arcRA);
    } else if (angleMethod === 'naibod_ra') {
      armc = normalizeDegree(natalARMC + elapsedYears * NAIBOD_RATE);
    } else {
      // Bilinmeyen yöntem → solar arc boylam
      progMCLon = normalizeDegree(natalMC + solarArcLon);
      armc = rightAscensionFromEcliptic(progMCLon, eps);
    }
    houses = calculateHousesARMC(armc, natalLat, eps, 'P');
    progMCLon = houses.mc;
  }

  // Gezegen-ev eşleştirmesi (progres evlere göre)
  const planetsWithHouses = placePlanetsInHouses(planets, houses.cusps);

  // Şans Noktası (progres ASC + progres Güneş/Ay)
  const pofBase = calcPartOfFortune(
    houses.ascendant,
    planetsWithHouses.find(p => p.id === PLANETS.SUN.id),
    planetsWithHouses.find(p => p.id === PLANETS.MOON.id),
  );
  const partOfFortune = pofBase
    ? { ...pofBase, house: findHouseOfPlanet(pofBase.longitude, houses.cusps) }
    : null;

  // Çapraz aspektler: progres gezegen × natal gezegen (natal taraf sabit)
  const progNatalAspects = calcCrossAspects(planetsWithHouses, natalChart.planets);
  // Progres gezegenlerin kendi arası aspektleri
  const progAspects = calcAspects(planetsWithHouses);

  // Progres anının takvim karşılığı — geriye dönük uyumluluk için saniyesiz
  const progUTC = jdToUTC(progJD);

  return {
    type: 'progression',
    angleMethod,

    julianDay: progJD,
    natalJulianDay: natalJD,
    targetDate: { ...targetDate },
    elapsedYears,
    age: Math.floor(elapsedYears),

    // Progres anının takvim karşılığı (gezegenlerin gerçekte bulunduğu ephemeris tarihi)
    progMoment: {
      year: progUTC.year,
      month: progUTC.month,
      day: progUTC.day,
      hour: progUTC.hour,
      minute: progUTC.minute,
    },

    location: {
      latitude: natalLat,
      longitude: natalLon,
      timezone: bd.timezone,
      name: bd.placeName || '',
    },

    solarArc: solarArcLon,

    planets: planetsWithHouses,
    partOfFortune,

    houses: {
      system: 'P',
      cusps: buildHouseCusps(houses.cusps),
      ascendant: houses.ascendant,
      mc: houses.mc,
      descendant: normalizeDegree(houses.ascendant + 180),
      ic: normalizeDegree(houses.mc + 180),
      vertex: houses.vertex,
    },

    interceptedSigns: findInterceptedSigns(houses.cusps),

    // drawBiWheel uyumluluğu için transit alan adlarıyla da expose et
    progNatalAspects,
    progAspects,
    transitNatalAspects: progNatalAspects,
    transitAspects: progAspects,

    natalReference: {
      planets: natalChart.planets,
      houses: natalChart.houses,
      partOfFortune: natalChart.partOfFortune,
      birthData: natalChart.birthData,
    },
  };
}
