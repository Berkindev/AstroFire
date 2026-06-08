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

import { NATAL_PLANETS, PLANETS, MAJOR_ASPECTS } from './constants.js';
import {
  initEphemeris,
  calculateJulianDay,
  calculatePlanetPositions,
  calculatePlanetPosition,
  calculateHouses,
  calculateHousesARMC,
  rightAscensionFromEcliptic,
  findHouseOfPlanet,
  findInterceptedSigns,
  getObliquity,
  normalizeDegree,
} from './ephemeris.js';
import { localToUTC, toDecimalHour } from './datetime.js';

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
  const planets = calculatePlanetPositions(progJD, NATAL_PLANETS);

  // Güney Ay Düğümü
  const northNode = planets.find(p => p.id === PLANETS.MEAN_NODE.id);
  if (northNode) {
    planets.push({
      id: -1,
      name: 'GAD',
      nameEn: 'South Node',
      symbol: '☋',
      longitude: normalizeDegree(northNode.longitude + 180),
      latitude: -northNode.latitude,
      distance: northNode.distance,
      speed: northNode.speed,
      isRetrograde: northNode.isRetrograde,
    });
  }

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
  const planetsWithHouses = planets.map(planet => ({
    ...planet,
    house: findHouseOfPlanet(planet.longitude, houses.cusps),
    signIndex: Math.floor(normalizeDegree(planet.longitude) / 30),
    degreeInSign: normalizeDegree(planet.longitude) % 30,
  }));

  // Ev cusp bilgileri
  const houseCusps = [];
  for (let i = 1; i <= 12; i++) {
    const cusp = normalizeDegree(houses.cusps[i]);
    houseCusps.push({
      house: i,
      longitude: cusp,
      signIndex: Math.floor(cusp / 30),
      degreeInSign: cusp % 30,
    });
  }

  const interceptedSigns = findInterceptedSigns(houses.cusps);

  // Şans Noktası (progres ASC + progres Güneş/Ay)
  const progSunWH = planetsWithHouses.find(p => p.id === PLANETS.SUN.id);
  const progMoonWH = planetsWithHouses.find(p => p.id === PLANETS.MOON.id);
  let partOfFortune = null;
  if (progSunWH && progMoonWH) {
    const sunDist = normalizeDegree(progSunWH.longitude - houses.ascendant);
    const isDaytime = sunDist > 180;
    let fortuneLon = isDaytime
      ? houses.ascendant + progMoonWH.longitude - progSunWH.longitude
      : houses.ascendant + progSunWH.longitude - progMoonWH.longitude;
    fortuneLon = normalizeDegree(fortuneLon);
    partOfFortune = {
      name: 'Şans Noktası',
      nameEn: 'Part of Fortune',
      symbol: '⊕',
      longitude: fortuneLon,
      signIndex: Math.floor(fortuneLon / 30),
      degreeInSign: fortuneLon % 30,
      house: findHouseOfPlanet(fortuneLon, houses.cusps),
      isDaytime,
      formula: isDaytime ? 'ASC + Ay - Güneş' : 'ASC + Güneş - Ay',
    };
  }

  // Çapraz aspektler: progres gezegen × natal gezegen
  const progNatalAspects = calculateProgNatalAspects(planetsWithHouses, natalChart.planets);
  // Progres gezegenlerin kendi arası aspektleri
  const progAspects = calculateProgProgAspects(planetsWithHouses);

  return {
    type: 'progression',
    angleMethod,

    julianDay: progJD,
    natalJulianDay: natalJD,
    targetDate: { ...targetDate },
    elapsedYears,
    age: Math.floor(elapsedYears),

    // Progres anının takvim karşılığı (gezegenlerin gerçekte bulunduğu ephemeris tarihi)
    progMoment: jdToCalendar(progJD),

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
      cusps: houseCusps,
      ascendant: houses.ascendant,
      mc: houses.mc,
      descendant: normalizeDegree(houses.ascendant + 180),
      ic: normalizeDegree(houses.mc + 180),
      vertex: houses.vertex,
    },

    interceptedSigns,

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

/**
 * Progres gezegen × natal gezegen çapraz aspektleri
 */
export function calculateProgNatalAspects(progPlanets, natalPlanets) {
  const aspects = [];
  for (const pp of progPlanets) {
    for (const np of natalPlanets) {
      let angle = Math.abs(pp.longitude - np.longitude);
      if (angle > 180) angle = 360 - angle;
      for (const aspectDef of MAJOR_ASPECTS) {
        const diff = Math.abs(angle - aspectDef.angle);
        if (diff <= aspectDef.orb) {
          const speed = pp.speed || 0;
          let currentAngle = normalizeDegree(pp.longitude - np.longitude);
          if (currentAngle > 180) currentAngle = 360 - currentAngle;
          const isApplying = Math.abs(currentAngle) > aspectDef.angle ? speed > 0 : speed < 0;
          aspects.push({
            // transit alan adları (drawBiWheel + tablo uyumluluğu)
            transitPlanet: { name: pp.name, symbol: pp.symbol, id: pp.id },
            natalPlanet: { name: np.name, symbol: np.symbol, id: np.id },
            aspect: aspectDef.name,
            aspectEn: aspectDef.nameEn,
            aspectSymbol: aspectDef.symbol,
            angle: aspectDef.angle,
            orb: diff,
            isApplying,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

/**
 * Progres gezegenlerin kendi arası aspektleri
 */
function calculateProgProgAspects(planets) {
  const aspects = [];
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const p1 = planets[i];
      const p2 = planets[j];
      let angle = Math.abs(p1.longitude - p2.longitude);
      if (angle > 180) angle = 360 - angle;
      for (const aspectDef of MAJOR_ASPECTS) {
        const diff = Math.abs(angle - aspectDef.angle);
        if (diff <= aspectDef.orb) {
          const relativeSpeed = (p1.speed || 0) - (p2.speed || 0);
          let currentAngle = normalizeDegree(p1.longitude - p2.longitude);
          if (currentAngle > 180) currentAngle = 360 - currentAngle;
          const isApplying = Math.abs(currentAngle) > aspectDef.angle ? relativeSpeed > 0 : relativeSpeed < 0;
          aspects.push({
            planet1: { name: p1.name, symbol: p1.symbol, id: p1.id },
            planet2: { name: p2.name, symbol: p2.symbol, id: p2.id },
            aspect: aspectDef.name,
            aspectEn: aspectDef.nameEn,
            aspectSymbol: aspectDef.symbol,
            angle: aspectDef.angle,
            orb: diff,
            isApplying,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

/**
 * Julian Day → Gregoryen takvim tarihi (UTC). Progres anının gerçek
 * ephemeris tarihini göstermek için kullanılır.
 */
function jdToCalendar(jd) {
  const z = Math.floor(jd + 0.5);
  const f = (jd + 0.5) - z;
  let a;
  if (z < 2299161) {
    a = z;
  } else {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  const totalHours = f * 24;
  const hour = Math.floor(totalHours);
  const totalMinutes = (totalHours - hour) * 60;
  const minute = Math.floor(totalMinutes);
  return { year, month, day, hour, minute };
}
