/**
 * AstroFire - Transit Hesaplama Modülü
 * Belirli bir tarih için transit gezegenleri hesaplar ve natal haritayla karşılaştırır
 */

import { NATAL_PLANETS, PLANETS, ASPECTS } from './constants.js';
import {
  initEphemeris,
  calculateJulianDay,
  calculatePlanetPositions,
  findHouseOfPlanet,
  normalizeDegree,
} from './ephemeris.js';
import { localToUTC, toDecimalHour } from './datetime.js';

/**
 * Transit gezegenleri hesaplar ve natal haritayla karşılaştırır
 *
 * @param {Object} natalChart - calculateNatalChart() sonucu
 * @param {Object} date - Transit tarihi { year, month, day, hour, minute }
 * @param {Object} location - Transit konumu { latitude, longitude, timezone, name? }
 * @returns {Promise<Object>} Transit verisi
 */
export async function calculateTransits(natalChart, date, location) {
  await initEphemeris();

  // UTC'ye çevir
  const utc = localToUTC(date.year, date.month, date.day, date.hour, date.minute, location.timezone);
  const decimalHourUTC = toDecimalHour(utc.hour, utc.minute);

  // Julian Day
  const jd = calculateJulianDay(utc.year, utc.month, utc.day, decimalHourUTC);

  // Transit gezegen pozisyonları
  const planets = calculatePlanetPositions(jd, NATAL_PLANETS);

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

  // Transit gezegenlerin natal evlerdeki konumlarını bul
  // natalChart.houses.cusps is [{house:1, longitude:...}, ...]
  // findHouseOfPlanet expects cusps[1..12] = longitude values
  const natalCuspsArray = natalChart.houses?.cusps;
  let natalCusps = null;
  if (natalCuspsArray && Array.isArray(natalCuspsArray)) {
    natalCusps = {};
    for (const c of natalCuspsArray) {
      natalCusps[c.house] = c.longitude;
    }
  }
  const planetsWithHouses = planets.map(planet => ({
    ...planet,
    house: natalCusps ? findHouseOfPlanet(planet.longitude, natalCusps) : null,
    signIndex: Math.floor(normalizeDegree(planet.longitude) / 30),
    degreeInSign: normalizeDegree(planet.longitude) % 30,
  }));

  // Şans Noktası (transit ASC ile — bu sadece transit konumunda ev hesabı yapıldığında anlamlı)
  // Transit'te genellikle natal evler kullanılır, bu yüzden PoF atlanıyor

  // Transit-natal aspektler (çapraz)
  const transitNatalAspects = calculateTransitNatalAspects(planetsWithHouses, natalChart.planets);

  // Transit gezegenlerin kendi arası aspektleri
  const transitAspects = calculateTransitTransitAspects(planetsWithHouses);

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
    transitNatalAspects,
    transitAspects,
  };
}

/**
 * Transit gezegen × natal gezegen çapraz aspekt hesabı
 * @param {Array} transitPlanets - Transit gezegen pozisyonları
 * @param {Array} natalPlanets - Natal gezegen pozisyonları
 * @returns {Array} Transit-natal aspektler
 */
export function calculateTransitNatalAspects(transitPlanets, natalPlanets) {
  const aspects = [];

  for (const tp of transitPlanets) {
    for (const np of natalPlanets) {
      // İki gezegen arası açı
      let angle = Math.abs(tp.longitude - np.longitude);
      if (angle > 180) angle = 360 - angle;

      // Hangi aspekte yakın?
      for (const aspectDef of ASPECTS) {
        const diff = Math.abs(angle - aspectDef.angle);
        if (diff <= aspectDef.orb) {
          // Applying/separating: transit gezegenin hızına göre
          const isApplying = determineTransitApplying(tp, np, aspectDef.angle);

          aspects.push({
            transitPlanet: { name: tp.name, symbol: tp.symbol, id: tp.id },
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
 * Transit gezegenlerin kendi arası aspektleri
 * @param {Array} transitPlanets
 * @returns {Array}
 */
function calculateTransitTransitAspects(transitPlanets) {
  const aspects = [];

  for (let i = 0; i < transitPlanets.length; i++) {
    for (let j = i + 1; j < transitPlanets.length; j++) {
      const p1 = transitPlanets[i];
      const p2 = transitPlanets[j];

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

/**
 * Transit-natal aspektin applying mı separating mı olduğunu belirler
 * Transit gezegenin hızına göre karar verir
 */
function determineTransitApplying(transitPlanet, natalPlanet, aspectAngle) {
  const speed = transitPlanet.speed || 0;
  let currentAngle = normalizeDegree(transitPlanet.longitude - natalPlanet.longitude);
  if (currentAngle > 180) currentAngle = 360 - currentAngle;

  // Natal gezegen sabit kabul edilir, transit gezegen hareket eder
  // Açı aspekt açısına yaklaşıyorsa applying
  return Math.abs(currentAngle) > aspectAngle ? speed > 0 : speed < 0;
}
