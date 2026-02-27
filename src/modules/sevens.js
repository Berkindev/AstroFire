/**
 * AstroFire - 7'ler Kanunu (84 Yıllık Yaşam Döngüsü)
 * 12 ev × 7 yıl = 84 yıllık döngü
 * Her ev genişliği 7'ye bölünür, her yıl segmentinin dekan burcu hesaplanır.
 */

import { SIGNS } from './constants.js';
import { normalizeDegree } from './ephemeris.js';
import { getDecanSign, SIGN_RULERS } from './decans.js';

/**
 * 7'ler Kanunu hesaplaması
 * @param {Object} houses - chart.houses objesi
 * @param {Array} planets - chart.planets dizisi
 * @param {number} birthYear - doğum yılı
 * @returns {Array} 12 ev × 7 yıl segmenti verisi
 */
export function calculateSevenYearCycles(houses, planets, birthYear) {
  const cusps = houses.cusps;
  const result = [];

  for (let i = 0; i < 12; i++) {
    const thisCusp = cusps[i];
    const nextCusp = cusps[(i + 1) % 12];
    const houseNum = thisCusp.house;
    const cuspLon = normalizeDegree(thisCusp.longitude);
    const nextCuspLon = normalizeDegree(nextCusp.longitude);

    // Ev genişliği (360° wrap)
    let span = nextCuspLon - cuspLon;
    if (span <= 0) span += 360;

    const yearStep = span / 7;
    const ageStart = i * 7;
    const ageEnd = ageStart + 6;
    const houseSign = SIGNS[thisCusp.signIndex];

    const years = [];

    for (let y = 0; y < 7; y++) {
      const age = ageStart + y;
      const calendarYear = birthYear + age;
      const startLongitude = normalizeDegree(cuspLon + y * yearStep);
      const endLongitude = normalizeDegree(cuspLon + (y + 1) * yearStep);

      // O noktadaki burç
      const signIndex = Math.floor(startLongitude / 30);
      const sign = SIGNS[signIndex];

      // Dekan burcu ve yöneticisi
      const decanInfo = getDecanSign(startLongitude);

      // Bu yıl segmentine düşen gezegenler (dereceye göre sıralı)
      const segmentPlanets = planets.filter(p => {
        if (p.house !== houseNum) return false;
        const pLon = normalizeDegree(p.longitude);
        let offset = pLon - cuspLon;
        if (offset < 0) offset += 360;
        if (offset >= span) return false;
        return offset >= y * yearStep && offset < (y + 1) * yearStep;
      }).sort((a, b) => {
        let offA = normalizeDegree(a.longitude) - cuspLon;
        if (offA < 0) offA += 360;
        let offB = normalizeDegree(b.longitude) - cuspLon;
        if (offB < 0) offB += 360;
        return offA - offB;
      });

      years.push({
        yearIndex: y,
        age,
        calendarYear,
        startLongitude,
        endLongitude,
        sign,
        signIndex,
        decanSign: decanInfo.sign,
        ruler: decanInfo.ruler,
        planets: segmentPlanets,
      });
    }

    result.push({
      house: houseNum,
      houseSign,
      ageStart,
      ageEnd,
      span,
      yearStep,
      years,
    });
  }

  return result;
}
