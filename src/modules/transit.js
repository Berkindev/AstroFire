/**
 * AstroFire - Transit Hesaplama Modülü
 * Belirli bir tarih için transit gezegenleri hesaplar ve natal haritayla karşılaştırır
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
import { localToUTC, toDecimalHour } from './datetime.js';
import { calcAspects, calcCrossAspects, anglePoints } from './aspects.js';
import { addSouthNode, cuspsToArray, buildHouseCusps, calcPartOfFortune } from './chartUtils.js';

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

  // Transit anının KENDİ ev sistemi (transit ASC/MC) — transit konumunda hesaplanır.
  // Bi-wheel'de natal ASC ile birlikte "ikinci ASC" olarak çizilir (astro-seek mantığı).
  const houseSystem = natalChart.houses?.system || 'P';
  const th = calculateHouses(jd, location.latitude, location.longitude, houseSystem);
  const transitHouses = {
    system: houseSystem,
    cusps: buildHouseCusps(th.cusps),
    ascendant: th.ascendant,
    mc: th.mc,
    descendant: normalizeDegree(th.ascendant + 180),
    ic: normalizeDegree(th.mc + 180),
    vertex: th.vertex,
  };

  // Transit Şans Noktası (transit ASC + transit Güneş/Ay)
  const tSun = planetsWithHouses.find(p => p.id === PLANETS.SUN.id);
  const tMoon = planetsWithHouses.find(p => p.id === PLANETS.MOON.id);
  const pofBase = calcPartOfFortune(th.ascendant, tSun, tMoon);
  const transitPartOfFortune = pofBase
    ? { ...pofBase, house: findHouseOfPlanet(pofBase.longitude, th.cusps) }
    : null;

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

    // Transit anının kendi açıları/evleri (bi-wheel'de dış çember + transit ASC)
    houses: transitHouses,
    partOfFortune: transitPartOfFortune,
    interceptedSigns: findInterceptedSigns(th.cusps),

    natalReference: {
      planets: natalChart.planets,
      houses: natalChart.houses,
      partOfFortune: natalChart.partOfFortune,
      birthData: natalChart.birthData,
    },

    // Çapraz aspektler: natal taraf sabit (yalnızca transit gezegen hareket eder).
    // Natal ASC/MC de hedef — transit gezegenlerin açılara teması ders için kritik.
    transitNatalAspects: calcCrossAspects(planetsWithHouses,
      [...natalChart.planets, ...anglePoints(natalChart.houses)]),
    transitAspects: calcAspects([...planetsWithHouses, ...anglePoints(transitHouses)]),
  };
}
