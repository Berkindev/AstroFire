/**
 * AstroFire - Lunar Return Hesaplama Modülü
 * Ay'ın natal pozisyonuna tam dönüşünü (Lunar Return) hesaplar
 * SolarFire uyumlu: ±1 saniye hassasiyet
 */

import { NATAL_PLANETS, PLANETS, ASPECTS } from './constants.js';
import {
  initEphemeris,
  calculateJulianDay,
  calculatePlanetPosition,
  calculatePlanetPositions,
  calculateHouses,
  findHouseOfPlanet,
  findInterceptedSigns,
  normalizeDegree,
} from './ephemeris.js';
import { localToUTC, formatUTCOffset, getUTCOffsetMinutes } from './datetime.js';

/**
 * Julian Day'den UTC tarih/saat bilgisi çıkarır.
 * @param {number} jd - Julian Day Number
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number }}
 */
function jdToUTC(jd) {
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
  const second = Math.round((totalMinutes - minute) * 60);

  return { year, month, day, hour, minute, second };
}

/**
 * Julian Day'i belirli bir timezone'daki yerel saate çevirir.
 * @param {number} jd - Julian Day (UTC)
 * @param {string} timezone - IANA timezone ID
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number, utcOffsetMinutes: number, utcOffsetFormatted: string }}
 */
function jdToLocal(jd, timezone) {
  const utc = jdToUTC(jd);

  const utcDate = new Date(Date.UTC(utc.year, utc.month - 1, utc.day, utc.hour, utc.minute, utc.second));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(utcDate);
  const getPart = (type) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  const localYear = getPart('year');
  const localMonth = getPart('month');
  const localDay = getPart('day');
  let localHour = getPart('hour');
  if (localHour === 24) localHour = 0;
  const localMinute = getPart('minute');
  const localSecond = getPart('second');

  const localMs = Date.UTC(localYear, localMonth - 1, localDay, localHour, localMinute, localSecond);
  const utcMs = utcDate.getTime();
  const offsetMinutes = (localMs - utcMs) / 60000;

  return {
    year: localYear,
    month: localMonth,
    day: localDay,
    hour: localHour,
    minute: localMinute,
    second: localSecond,
    utcOffsetMinutes: offsetMinutes,
    utcOffsetFormatted: formatUTCOffset(offsetMinutes),
  };
}

/**
 * Ay'ın natal pozisyonuna döndüğü tam Julian Day'i bulur.
 * Newton-Raphson iterasyonu ile ±1 saniye hassasiyet.
 * Ay ~13.2°/gün hızla hareket eder, döngü ~29.53 gün.
 *
 * @param {number} natalMoonLon - Natal Ay ekliptik boylamı (0-360)
 * @param {number} year - Lunar Return yılı
 * @param {number} month - Lunar Return ayı (1-12)
 * @returns {number} Lunar Return anı (Julian Day)
 */
export function findLunarReturnMoment(natalMoonLon, year, month) {
  // İlk tahmin: ayın 1'i
  const startJD = calculateJulianDay(year, month, 1, 0);

  // Ay'ın mevcut pozisyonunu al ve natal pozisyona olan farkı hesapla
  const moonStart = calculatePlanetPosition(startJD, PLANETS.MOON.id);
  let diff0 = natalMoonLon - moonStart.longitude;
  if (diff0 > 180) diff0 -= 360;
  if (diff0 < -180) diff0 += 360;

  // Tahmini gün farkı: açı farkı / ~13.2°/gün
  let jd = startJD + diff0 / 13.2;

  // Newton-Raphson iterasyonu
  const MAX_ITER = 50;
  const TOLERANCE = 1 / 86400; // 1 saniye

  for (let i = 0; i < MAX_ITER; i++) {
    const moonPos = calculatePlanetPosition(jd, PLANETS.MOON.id);
    const moonLon = moonPos.longitude;
    const moonSpeed = moonPos.speed; // derece/gün

    // Açı farkı (kısa yolu bul)
    let diff = natalMoonLon - moonLon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    // Yeterli hassasiyet?
    if (Math.abs(diff) < 0.00001) { // ~0.036 arcsecond
      // Bulunan JD verilen ayın içinde mi kontrol et
      const lrUTC = jdToUTC(jd);
      if (lrUTC.year === year && lrUTC.month === month) {
        return jd;
      }
      // Ayın dışına çıktıysa ~29.53 gün ekle/çıkar
      if (jd < startJD) {
        jd += 29.53;
        continue;
      }
      // Sonraki aya taştıysa geri al
      const endJD = calculateJulianDay(year, month + 1, 1, 0);
      if (jd >= endJD) {
        jd -= 29.53;
        continue;
      }
      return jd;
    }

    // Newton-Raphson düzeltmesi: Δt = Δlon / speed
    const correction = diff / moonSpeed;
    jd += correction;
  }

  // Convergence kontrolü
  const moonCheck = calculatePlanetPosition(jd, PLANETS.MOON.id);
  const finalDiff = Math.abs(normalizeDegree(moonCheck.longitude - natalMoonLon));
  if (finalDiff > 0.01 && finalDiff < 359.99) {
    throw new Error(`Lunar Return yakınsamadı. Fark: ${finalDiff.toFixed(4)}°`);
  }

  return jd;
}

/**
 * Tam Lunar Return haritası hesaplar.
 *
 * @param {Object} natalChart - calculateNatalChart() sonucu
 * @param {number} year - LR yılı
 * @param {number} month - LR ayı (1-12)
 * @param {Object} location - LR konumu
 * @param {number} location.latitude
 * @param {number} location.longitude
 * @param {string} location.timezone - IANA timezone ID
 * @param {string} [location.name] - Konum adı (opsiyonel)
 * @returns {Promise<Object>} Lunar Return harita verisi
 */
export async function calculateLunarReturn(natalChart, year, month, location) {
  await initEphemeris();

  // Natal Ay boylamı
  const natalMoon = natalChart.planets.find(p => p.id === PLANETS.MOON.id);
  if (!natalMoon) {
    throw new Error('Natal haritada Ay bulunamadı.');
  }
  const natalMoonLon = natalMoon.longitude;

  // Lunar Return anını bul (JD)
  const lrJD = findLunarReturnMoment(natalMoonLon, year, month);

  // LR anını UTC'ye çevir
  const lrUTC = jdToUTC(lrJD);

  // LR anını yerel saate çevir
  const lrLocal = jdToLocal(lrJD, location.timezone);

  // Gezegen pozisyonları (LR anında)
  const planets = calculatePlanetPositions(lrJD, NATAL_PLANETS);

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

  // Ev hesabı (LR konumunda)
  const houseSystem = 'P'; // Placidus
  const houses = calculateHouses(lrJD, location.latitude, location.longitude, houseSystem);

  // Gezegen-ev eşleştirmesi
  const planetsWithHouses = planets.map(planet => ({
    ...planet,
    house: findHouseOfPlanet(planet.longitude, houses.cusps),
    signIndex: Math.floor(normalizeDegree(planet.longitude) / 30),
    degreeInSign: normalizeDegree(planet.longitude) % 30,
  }));

  // Kıstırılmış burçlar
  const interceptedSigns = findInterceptedSigns(houses.cusps);

  // Ev cusps bilgileri
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

  // Şans Noktası (Part of Fortune) hesapla
  const lrSun = planetsWithHouses.find(p => p.id === PLANETS.SUN.id);
  const lrMoon = planetsWithHouses.find(p => p.id === PLANETS.MOON.id);
  let partOfFortune = null;
  if (lrSun && lrMoon) {
    const sunDist = normalizeDegree(lrSun.longitude - houses.ascendant);
    const isDaytime = sunDist > 180;

    let fortuneLon;
    if (isDaytime) {
      fortuneLon = houses.ascendant + lrMoon.longitude - lrSun.longitude;
    } else {
      fortuneLon = houses.ascendant + lrSun.longitude - lrMoon.longitude;
    }
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

  // Aspektler (Şans Noktası dahil)
  const pofForAspects = partOfFortune ? [{
    ...partOfFortune,
    id: -99,
  }] : [];
  const aspects = calculateLRAspects([...planetsWithHouses, ...pofForAspects]);

  return {
    type: 'lunar_return',

    // LR timing
    julianDay: lrJD,
    utc: lrUTC,
    local: lrLocal,

    // Konum
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      name: location.name || '',
    },

    // Natal referansı
    natalMoon: {
      longitude: natalMoonLon,
    },
    natalBirthData: natalChart.birthData,

    // Pozisyonlar
    planets: planetsWithHouses,

    // Şans Noktası
    partOfFortune,

    // Evler
    houses: {
      system: houseSystem,
      cusps: houseCusps,
      ascendant: houses.ascendant,
      mc: houses.mc,
      descendant: normalizeDegree(houses.ascendant + 180),
      ic: normalizeDegree(houses.mc + 180),
      vertex: houses.vertex,
    },

    // Kıstırılmış burçlar
    interceptedSigns,

    // Aspektler
    aspects,
  };
}

/**
 * Lunar Return gezegenler arası aspektleri hesaplar
 * @param {Array<Object>} planets
 * @returns {Array<Object>}
 */
function calculateLRAspects(planets) {
  const aspects = [];
  const aspectPlanets = planets;

  for (let i = 0; i < aspectPlanets.length; i++) {
    for (let j = i + 1; j < aspectPlanets.length; j++) {
      const p1 = aspectPlanets[i];
      const p2 = aspectPlanets[j];

      let angle = Math.abs(p1.longitude - p2.longitude);
      if (angle > 180) angle = 360 - angle;

      for (const aspectDef of ASPECTS) {
        const diff = Math.abs(angle - aspectDef.angle);
        if (diff <= aspectDef.orb) {
          const relativeSpeed = (p1.speed || 0) - (p2.speed || 0);
          let currentAngle = normalizeDegree(p1.longitude - p2.longitude);
          if (currentAngle > 180) currentAngle = 360 - currentAngle;
          const isApplying = Math.abs(currentAngle) > aspectDef.angle
            ? relativeSpeed > 0
            : relativeSpeed < 0;

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
