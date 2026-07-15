/**
 * AstroFire - Natal Harita Hesaplama Modülü
 * Tam natal harita: gezegenler, evler, aspektler, Şans Noktası, kıstırılmışlar
 */

import { NATAL_PLANETS, PLANETS } from './constants.js';
import {
  initEphemeris,
  calculateJulianDay,
  calculatePlanetPositions,
  calculateHouses,
  findHouseOfPlanet,
  findInterceptedSigns,
  normalizeDegree,
} from './ephemeris.js';
import { prepareBirthData } from './datetime.js';
import { calcAspects } from './aspects.js';
import {
  addSouthNode,
  buildHouseCusps,
  placePlanetsInHouses,
  calcPartOfFortune,
} from './chartUtils.js';

/**
 * Tam natal harita hesaplar
 *
 * @param {Object} birthData
 * @param {number} birthData.year
 * @param {number} birthData.month (1-12)
 * @param {number} birthData.day
 * @param {number} birthData.hour (0-23)
 * @param {number} birthData.minute (0-59)
 * @param {string} birthData.timezone - IANA timezone (ör: 'Europe/Istanbul')
 * @param {number} birthData.latitude
 * @param {number} birthData.longitude
 * @param {string} [birthData.houseSystem='P'] - Ev sistemi kodu
 *
 * @returns {Promise<Object>} Natal harita verisi
 */
export async function calculateNatalChart(birthData) {
  await initEphemeris();

  const { utc, decimalHourUTC, utcOffsetFormatted, utcOffsetMinutes } = prepareBirthData(birthData);

  const jd = calculateJulianDay(utc.year, utc.month, utc.day, decimalHourUTC);

  const planets = addSouthNode(calculatePlanetPositions(jd, NATAL_PLANETS));

  const houseSystem = birthData.houseSystem || 'P';
  const houses = calculateHouses(jd, birthData.latitude, birthData.longitude, houseSystem);

  const planetsWithHouses = placePlanetsInHouses(planets, houses.cusps);

  const partOfFortune = calcPartOfFortune(
    houses.ascendant,
    planets.find(p => p.id === PLANETS.SUN.id),
    planets.find(p => p.id === PLANETS.MOON.id),
  );

  // Şans Noktası aspektlere de dahil edilir (id: -99 sentinel)
  const pofForAspects = partOfFortune ? [{
    ...partOfFortune,
    id: -99,
    house: findHouseOfPlanet(partOfFortune.longitude, houses.cusps),
  }] : [];

  return {
    birthData: {
      ...birthData,
      utcOffset: utcOffsetFormatted,
      utcOffsetMinutes,
    },
    julianDay: jd,

    planets: planetsWithHouses,

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

    partOfFortune: partOfFortune ? {
      ...partOfFortune,
      house: findHouseOfPlanet(partOfFortune.longitude, houses.cusps),
    } : null,

    aspects: calcAspects([...planetsWithHouses, ...pofForAspects]),
  };
}
