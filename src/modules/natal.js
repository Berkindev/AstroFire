/**
 * AstroFire - Natal Harita Hesaplama Modülü
 * Tam natal harita: gezegenler, evler, aspektler, Şans Noktası, kıstırılmışlar
 */

import { NATAL_PLANETS, ASPECTS, SIGNS, PLANETS } from './constants.js';
import {
  initEphemeris,
  calculateJulianDay,
  calculatePlanetPositions,
  calculateHouses,
  findHouseOfPlanet,
  findInterceptedSigns,
  normalizeDegree,
} from './ephemeris.js';
import { prepareBirthData, toDecimalHour } from './datetime.js';

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
  // Swiss Ephemeris başlat
  await initEphemeris();
  
  // Tarih/saat hazırlığı
  const prepared = prepareBirthData(birthData);
  const { utc, decimalHourUTC, utcOffsetFormatted, utcOffsetMinutes } = prepared;
  
  // Julian Day Number
  const jd = calculateJulianDay(utc.year, utc.month, utc.day, decimalHourUTC);
  
  // Gezegen pozisyonları
  const planets = calculatePlanetPositions(jd, NATAL_PLANETS);
  
  // Güney Ay Düğümü (Kuzey Node'un karşısı)
  const northNode = planets.find(p => p.id === PLANETS.MEAN_NODE.id);
  if (northNode) {
    const southNode = {
      id: -1, // Özel ID
      name: 'GAD',
      nameEn: 'South Node',
      symbol: '☋',
      longitude: normalizeDegree(northNode.longitude + 180),
      latitude: -northNode.latitude,
      distance: northNode.distance,
      speed: northNode.speed,
      isRetrograde: northNode.isRetrograde,
    };
    planets.push(southNode);
  }
  
  // Ev hesabı
  const houseSystem = birthData.houseSystem || 'P';
  const houses = calculateHouses(jd, birthData.latitude, birthData.longitude, houseSystem);
  
  // Gezegen-ev eşleştirmesi
  const planetsWithHouses = planets.map(planet => ({
    ...planet,
    house: findHouseOfPlanet(planet.longitude, houses.cusps),
    signIndex: Math.floor(normalizeDegree(planet.longitude) / 30),
    degreeInSign: normalizeDegree(planet.longitude) % 30,
  }));
  
  // Kıstırılmış burçlar
  const interceptedSigns = findInterceptedSigns(houses.cusps);
  
  // Şans Noktası (Part of Fortune)
  const partOfFortune = calculatePartOfFortune(
    houses.ascendant,
    planets.find(p => p.id === PLANETS.SUN.id),
    planets.find(p => p.id === PLANETS.MOON.id),
    jd
  );
  
  // Aspektler (Şans Noktası dahil)
  const pofForAspects = partOfFortune ? [{
    ...partOfFortune,
    id: -99,
    house: findHouseOfPlanet(partOfFortune.longitude, houses.cusps),
  }] : [];
  const aspects = calculateAspects([...planetsWithHouses, ...pofForAspects]);
  
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
  
  return {
    // Meta bilgiler
    birthData: {
      ...birthData,
      utcOffset: utcOffsetFormatted,
      utcOffsetMinutes,
    },
    julianDay: jd,
    
    // Pozisyonlar
    planets: planetsWithHouses,
    
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
    
    // Şans Noktası
    partOfFortune,
    
    // Aspektler
    aspects,
  };
}

/**
 * Şans Noktası (Part of Fortune) hesaplar
 * Gündüz haritası: ASC + Ay - Güneş
 * Gece haritası: ASC + Güneş - Ay
 * 
 * @param {number} ascendant
 * @param {Object} sun - Güneş pozisyonu
 * @param {Object} moon - Ay pozisyonu
 * @param {number} jd - Julian Day (Güneş'in ufkun üstünde/altında olduğunu belirlemek için)
 * @returns {Object} Şans Noktası bilgisi
 */
function calculatePartOfFortune(ascendant, sun, moon, jd) {
  if (!sun || !moon) return null;
  
  // Gündüz mü gece mi? Güneş 1-6. evlerde (ufkun üstünde) ise gündüz
  // Basit yöntem: Güneş ASC'den DSC'ye (saat yönünde 180°) ise gündüz
  const sunDist = normalizeDegree(sun.longitude - ascendant);
  const isDaytime = sunDist > 180; // Güneş ufkun üstünde
  
  let fortuneLon;
  if (isDaytime) {
    // Gündüz: ASC + Ay - Güneş
    fortuneLon = ascendant + moon.longitude - sun.longitude;
  } else {
    // Gece: ASC + Güneş - Ay
    fortuneLon = ascendant + sun.longitude - moon.longitude;
  }
  
  fortuneLon = normalizeDegree(fortuneLon);
  
  return {
    name: 'Şans Noktası',
    nameEn: 'Part of Fortune',
    symbol: '⊕',
    longitude: fortuneLon,
    signIndex: Math.floor(fortuneLon / 30),
    degreeInSign: fortuneLon % 30,
    isDaytime,
    formula: isDaytime ? 'ASC + Ay - Güneş' : 'ASC + Güneş - Ay',
  };
}

/**
 * Gezegenler arası aspektleri hesaplar
 * @param {Array<Object>} planets - Gezegen pozisyonları
 * @returns {Array<Object>} Aspekt listesi
 */
function calculateAspects(planets) {
  const aspects = [];
  
  // Tüm gezegenler + GAD + Şans Noktası dahil aspektler
  const aspectPlanets = planets;
  
  for (let i = 0; i < aspectPlanets.length; i++) {
    for (let j = i + 1; j < aspectPlanets.length; j++) {
      const p1 = aspectPlanets[i];
      const p2 = aspectPlanets[j];
      
      // İki gezegen arası açı
      let angle = Math.abs(p1.longitude - p2.longitude);
      if (angle > 180) angle = 360 - angle;
      
      // Hangi aspekte yakın?
      for (const aspectDef of ASPECTS) {
        const diff = Math.abs(angle - aspectDef.angle);
        if (diff <= aspectDef.orb) {
          aspects.push({
            planet1: { name: p1.name, symbol: p1.symbol, id: p1.id },
            planet2: { name: p2.name, symbol: p2.symbol, id: p2.id },
            aspect: aspectDef.name,
            aspectEn: aspectDef.nameEn,
            aspectSymbol: aspectDef.symbol,
            angle: aspectDef.angle,
            orb: diff,
            isApplying: determineApplying(p1, p2, aspectDef.angle),
          });
          break; // En yakın aspekt
        }
      }
    }
  }
  
  return aspects;
}

/**
 * Aspektin applying (yaklaşan) mı separating (uzaklaşan) mı olduğunu belirler
 */
function determineApplying(p1, p2, aspectAngle) {
  // Hız farkına bak: daha hızlı gezegen daha yavaşa yaklaşıyor mu?
  const relativeSpeed = (p1.speed || 0) - (p2.speed || 0);
  let currentAngle = normalizeDegree(p1.longitude - p2.longitude);
  if (currentAngle > 180) currentAngle = 360 - currentAngle;
  
  // Eğer açı kapanıyorsa (aspekt açısına yaklaşıyorsa) = applying
  return Math.abs(currentAngle) > aspectAngle ? relativeSpeed > 0 : relativeSpeed < 0;
}
