/**
 * AstroFire - Lunar Return Hesaplama Modülü
 * Ay'ın natal pozisyonuna tam dönüşünü (Lunar Return) hesaplar
 * SolarFire uyumlu: ±1 saniye hassasiyet
 */

import { NATAL_PLANETS, PLANETS } from './constants.js';
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
import { calcAspects } from './aspects.js';
import {
  jdToUTC,
  jdToLocal,
  addSouthNode,
  buildHouseCusps,
  placePlanetsInHouses,
  calcPartOfFortune,
} from './chartUtils.js';

/**
 * Ay'ın natal pozisyonuna döndüğü tam Julian Day'i bulur.
 *
 * ⚠️ Kendi Newton döngüsünü taşır ve yakınsama guard'ları eksiktir — bir
 * sonraki commit'te ortak çözücüye taşınacak. Burada bilerek olduğu gibi
 * bırakılıyor ki bu commit'in davranışı hiç değiştirmediği kanıtlanabilsin.
 *
 * @param {number} natalMoonLon - Natal Ay ekliptik boylamı (0-360)
 * @param {number} year - Lunar Return yılı
 * @param {number} month - Lunar Return ayı (1-12)
 * @param {number} [day] - Verilirse bu güne EN YAKIN LR bulunur
 * @returns {number} Lunar Return anı (Julian Day)
 */
function findLunarReturnMoment(natalMoonLon, year, month, day) {
  const refDay = day || 1;
  const startJD = calculateJulianDay(year, month, refDay, 0);
  const hasDay = !!day;

  const moonStart = calculatePlanetPosition(startJD, PLANETS.MOON.id);
  let diff0 = natalMoonLon - moonStart.longitude;
  if (diff0 > 180) diff0 -= 360;
  if (diff0 < -180) diff0 += 360;

  let jd = startJD + diff0 / 13.2;

  function findNearestLR(jdGuess) {
    let jdIter = jdGuess;
    for (let i = 0; i < 50; i++) {
      const moonPos = calculatePlanetPosition(jdIter, PLANETS.MOON.id);
      let diff = natalMoonLon - moonPos.longitude;
      if (diff > 180) diff -= 360;
      if (diff < -180) diff += 360;
      if (Math.abs(diff) < 0.00001) return jdIter;
      jdIter += diff / moonPos.speed;
    }
    const moonCheck = calculatePlanetPosition(jdIter, PLANETS.MOON.id);
    const finalDiff = Math.abs(normalizeDegree(moonCheck.longitude - natalMoonLon));
    if (finalDiff > 0.01 && finalDiff < 359.99) {
      throw new Error(`Lunar Return yakınsamadı. Fark: ${finalDiff.toFixed(4)}°`);
    }
    return jdIter;
  }

  if (hasDay) {
    const lr1 = findNearestLR(jd);
    const candidates = [lr1, findNearestLR(lr1 - 27.3), findNearestLR(lr1 + 27.3)];

    let best = lr1;
    let bestDist = Math.abs(lr1 - startJD);
    for (const c of candidates) {
      const d = Math.abs(c - startJD);
      if (d < bestDist) { best = c; bestDist = d; }
    }
    return best;
  }

  for (let i = 0; i < 50; i++) {
    const moonPos = calculatePlanetPosition(jd, PLANETS.MOON.id);

    let diff = natalMoonLon - moonPos.longitude;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (Math.abs(diff) < 0.00001) {
      const lrUTC = jdToUTC(jd);
      if (lrUTC.year === year && lrUTC.month === month) return jd;

      if (jd < startJD) { jd += 29.53; continue; }
      const endJD = calculateJulianDay(year, month + 1, 1, 0);
      if (jd >= endJD) { jd -= 29.53; continue; }
      return jd;
    }

    jd += diff / moonPos.speed;
  }

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
 * @param {number} [day] - Verilirse bu güne en yakın LR bulunur
 * @param {Object} location - LR konumu { latitude, longitude, timezone, name? }
 * @returns {Promise<Object>} Lunar Return harita verisi
 */
export async function calculateLunarReturn(natalChart, year, month, day, location) {
  await initEphemeris();

  const natalMoon = natalChart.planets.find(p => p.id === PLANETS.MOON.id);
  if (!natalMoon) {
    throw new Error('Natal haritada Ay bulunamadı.');
  }
  const natalMoonLon = natalMoon.longitude;

  const lrJD = findLunarReturnMoment(natalMoonLon, year, month, day);

  const planets = addSouthNode(calculatePlanetPositions(lrJD, NATAL_PLANETS));

  // Evler LR konumunda hesaplanır (relokasyon)
  const houseSystem = 'P'; // Placidus
  const houses = calculateHouses(lrJD, location.latitude, location.longitude, houseSystem);

  const planetsWithHouses = placePlanetsInHouses(planets, houses.cusps);

  const pofBase = calcPartOfFortune(
    houses.ascendant,
    planetsWithHouses.find(p => p.id === PLANETS.SUN.id),
    planetsWithHouses.find(p => p.id === PLANETS.MOON.id),
  );
  const partOfFortune = pofBase
    ? { ...pofBase, house: findHouseOfPlanet(pofBase.longitude, houses.cusps) }
    : null;

  const pofForAspects = partOfFortune ? [{ ...partOfFortune, id: -99 }] : [];

  return {
    type: 'lunar_return',

    julianDay: lrJD,
    utc: jdToUTC(lrJD),
    local: jdToLocal(lrJD, location.timezone),

    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      name: location.name || '',
    },

    natalMoon: { longitude: natalMoonLon },
    natalBirthData: natalChart.birthData,

    planets: planetsWithHouses,
    partOfFortune,

    houses: {
      system: houseSystem,
      cusps: buildHouseCusps(houses.cusps),
      ascendant: houses.ascendant,
      mc: houses.mc,
      descendant: normalizeDegree(houses.ascendant + 180),
      ic: normalizeDegree(houses.mc + 180),
      vertex: houses.vertex,
    },

    interceptedSigns: findInterceptedSigns(houses.cusps),

    aspects: calcAspects([...planetsWithHouses, ...pofForAspects]),
  };
}
