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
import { findBodyAtLongitude } from './returns.js';
import { calcAspects, anglePoints } from './aspects.js';
import {
  jdToUTC,
  jdToLocal,
  addSouthNode,
  buildHouseCusps,
  placePlanetsInHouses,
  calcPartOfFortune,
} from './chartUtils.js';

/** Ay'ın ortalama dönüş döngüsü (gün) — sideral ay. */
const LUNAR_CYCLE = 27.32158;

/**
 * Ay'ın natal pozisyonuna döndüğü tam Julian Day'i bulur.
 *
 * Verilen referans güne EN YAKIN dönüşü seçer: bir tohumdan yakınsar, sonra
 * komşu döngüleri (±1 sideral ay) de dener ve referansa en yakın olanı alır.
 * Ay hızlı hareket ettiği için (~13.2°/gün) tohum hatası kolayca komşu bir
 * döngüye kayabilir — bu yüzden tek yakınsama yetmez.
 *
 * @param {number} natalMoonLon - Natal Ay ekliptik boylamı (0-360)
 * @param {number} year - Lunar Return yılı
 * @param {number} month - Lunar Return ayı (1-12)
 * @param {number} [day=1] - Bu güne en yakın LR bulunur
 * @returns {number} Lunar Return anı (Julian Day)
 */
function findLunarReturnMoment(natalMoonLon, year, month, day) {
  const refJD = calculateJulianDay(year, month, day || 1, 0);

  // Tohum: referans andaki Ay'dan hedefe kalan açı / ~13.2°/gün
  const moonAtRef = calculatePlanetPosition(refJD, PLANETS.MOON.id);
  let diff0 = natalMoonLon - moonAtRef.longitude;
  if (diff0 > 180) diff0 -= 360;
  if (diff0 < -180) diff0 += 360;

  const solve = (seed) => findBodyAtLongitude(PLANETS.MOON.id, natalMoonLon, seed, 'Lunar Return');

  const first = solve(refJD + diff0 / 13.2);

  // Komşu döngüleri de dene, referansa en yakınını seç
  const candidates = [
    first,
    solve(first - LUNAR_CYCLE),
    solve(first + LUNAR_CYCLE),
  ];

  return candidates.reduce((best, c) =>
    Math.abs(c - refJD) < Math.abs(best - refJD) ? c : best);
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

    aspects: calcAspects([...planetsWithHouses, ...pofForAspects, ...anglePoints(houses)]),
  };
}
