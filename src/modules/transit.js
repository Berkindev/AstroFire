/**
 * AstroFire - Transit Hesaplama Modülü
 * Belirli bir tarih için transit gezegenleri hesaplar ve natal haritayla karşılaştırır
 */

import { NATAL_PLANETS } from './constants.js';
import {
  initEphemeris,
  calculateJulianDay,
  calculatePlanetPositions,
  findHouseOfPlanet,
  normalizeDegree,
} from './ephemeris.js';
import { localToUTC, toDecimalHour } from './datetime.js';
import { calcAspects, calcCrossAspects } from './aspects.js';
import { addSouthNode, cuspsToArray } from './chartUtils.js';

/**
 * Transit gezegenleri hesaplar ve natal haritayla karşılaştırır.
 *
 * Transit gezegenler NATAL evlere yerleştirilir (transit anı için ayrı bir ev
 * sistemi kurulmaz) — bu yüzden Şans Noktası da hesaplanmaz.
 *
 * @param {Object} natalChart - calculateNatalChart() sonucu
 * @param {Object} date - Transit tarihi { year, month, day, hour, minute }
 * @param {Object} location - Transit konumu { latitude, longitude, timezone, name? }
 * @returns {Promise<Object>} Transit verisi
 */
export async function calculateTransits(natalChart, date, location) {
  await initEphemeris();

  const utc = localToUTC(date.year, date.month, date.day, date.hour, date.minute, location.timezone);
  const jd = calculateJulianDay(utc.year, utc.month, utc.day, toDecimalHour(utc.hour, utc.minute));

  const planets = addSouthNode(calculatePlanetPositions(jd, NATAL_PLANETS));

  // Transit gezegenler natal evlere düşürülür
  const natalCusps = Array.isArray(natalChart.houses?.cusps)
    ? cuspsToArray(natalChart.houses.cusps)
    : null;

  const planetsWithHouses = planets.map(planet => ({
    ...planet,
    house: natalCusps ? findHouseOfPlanet(planet.longitude, natalCusps) : null,
    signIndex: Math.floor(normalizeDegree(planet.longitude) / 30),
    degreeInSign: normalizeDegree(planet.longitude) % 30,
  }));

  return {
    type: 'transit',
    julianDay: jd,
    utc: {
      year: utc.year,
      month: utc.month,
      day: utc.day,
      hour: utc.hour,
      minute: utc.minute,
    },
    local: {
      year: date.year,
      month: date.month,
      day: date.day,
      hour: date.hour,
      minute: date.minute,
    },
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      name: location.name || '',
    },
    transitDate: `${String(date.day).padStart(2, '0')}.${String(date.month).padStart(2, '0')}.${date.year} ${String(date.hour).padStart(2, '0')}:${String(date.minute).padStart(2, '0')}`,

    planets: planetsWithHouses,

    natalReference: {
      planets: natalChart.planets,
      houses: natalChart.houses,
      partOfFortune: natalChart.partOfFortune,
      birthData: natalChart.birthData,
    },

    // Çapraz aspektler: natal taraf sabit (yalnızca transit gezegen hareket eder)
    transitNatalAspects: calcCrossAspects(planetsWithHouses, natalChart.planets),
    transitAspects: calcAspects(planetsWithHouses),
  };
}
