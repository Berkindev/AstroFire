/**
 * AstroFire - Swiss Ephemeris WASM Wrapper
 * Swiss Ephemeris ile gezegen pozisyonu ve ev hesaplama
 * SolarFire uyumlu: Geocentric, Tropical, Placidus, Mean Node
 */

import { CALC_FLAGS, DEFAULT_HOUSE_SYSTEM } from './constants.js';

let sweInstance = null;
let sweInitialized = false;

/**
 * Swiss Ephemeris WASM modülünü yükler ve başlatır
 * Singleton pattern — bir kez yüklenir
 */
export async function initEphemeris() {
  if (sweInitialized && sweInstance) {
    return sweInstance;
  }
  
  try {
    // Dynamic import for swisseph-wasm
    const { default: SwissEph } = await import('swisseph-wasm');
    sweInstance = new SwissEph();
    await sweInstance.initSwissEph();
    sweInitialized = true;
    console.log('Swiss Ephemeris başlatıldı. Versiyon:', sweInstance.version());
    return sweInstance;
  } catch (error) {
    console.error('Swiss Ephemeris başlatılamadı:', error);
    throw new Error('Swiss Ephemeris WASM modülü yüklenemedi: ' + error.message);
  }
}

/**
 * Swiss Ephemeris instance'ını döndürür (zaten başlatılmış olmalı)
 */
export function getSwe() {
  if (!sweInstance || !sweInitialized) {
    throw new Error('Swiss Ephemeris henüz başlatılmadı. Önce initEphemeris() çağırın.');
  }
  return sweInstance;
}

/**
 * Julian Day Number hesaplar
 * @param {number} year 
 * @param {number} month (1-12)
 * @param {number} day 
 * @param {number} decimalHour - UTC ondalıklı saat (ör: 14.5)
 * @returns {number} Julian Day Number
 */
export function calculateJulianDay(year, month, day, decimalHour) {
  const swe = getSwe();
  return swe.julday(year, month, day, decimalHour);
}

/**
 * Tek bir gezegen/noktanın pozisyonunu hesaplar
 * @param {number} jd - Julian Day Number
 * @param {number} planetId - Swiss Ephemeris gezegen ID'si
 * @returns {{ longitude: number, latitude: number, distance: number, speed: number }}
 */
export function calculatePlanetPosition(jd, planetId) {
  const swe = getSwe();
  
  // SEFLG_SWIEPH | SEFLG_SPEED = Tropical, Geocentric, hız dahil
  const result = swe.calc_ut(jd, planetId, CALC_FLAGS);
  
  if (!result || result.length < 4) {
    throw new Error(`Gezegen pozisyonu hesaplanamadı (ID: ${planetId})`);
  }
  
  return {
    longitude: result[0],       // Ekliptik boylam (0-360)
    latitude: result[1],        // Ekliptik enlem
    distance: result[2],        // Mesafe (AU)
    speed: result[3],           // Günlük hız (derece/gün)
  };
}

/**
 * Birden fazla gezegenin pozisyonlarını hesaplar
 * @param {number} jd - Julian Day Number
 * @param {Array<Object>} planets - Gezegen tanım listesi (constants.js'den)
 * @returns {Array<Object>} Gezegen pozisyonları
 */
export function calculatePlanetPositions(jd, planets) {
  const results = [];
  for (const planet of planets) {
    try {
      const pos = calculatePlanetPosition(jd, planet.id);
      results.push({
        ...planet,
        ...pos,
        isRetrograde: pos.speed < 0,
      });
    } catch (e) {
      console.warn(`Gezegen hesaplanamadı: ${planet.name} (ID: ${planet.id})`, e.message);
    }
  }
  return results;
}

/**
 * Ev hesabı yapar (Placidus default)
 * @param {number} jd - Julian Day Number
 * @param {number} latitude - Coğrafi enlem
 * @param {number} longitude - Coğrafi boylam
 * @param {string} houseSystem - Ev sistemi kodu (default: 'P' = Placidus)
 * @returns {{ cusps: number[], ascendant: number, mc: number, armc: number, vertex: number }}
 */
export function calculateHouses(jd, latitude, longitude, houseSystem = DEFAULT_HOUSE_SYSTEM.code) {
  const swe = getSwe();
  
  const result = swe.houses(jd, latitude, longitude, houseSystem);
  
  if (!result) {
    throw new Error('Ev hesabı yapılamadı');
  }
  
  // houses() dönüş yapısı:
  // result.cusps = [0, cusp1, cusp2, ..., cusp12] (index 0 kullanılmaz)
  // result.ascmc = [ASC, MC, ARMC, Vertex, ...]
  
  let cusps, ascmc;
  
  if (result.cusps && result.ascmc) {
    cusps = result.cusps;
    ascmc = result.ascmc;
  } else if (Array.isArray(result)) {
    // Bazı versiyonlarda düz array döner
    // İlk 13 element cusps (0-12), sonraki 10 element ascmc
    cusps = result.slice(0, 13);
    ascmc = result.slice(13);
  } else {
    throw new Error('Beklenmeyen houses() dönüş formatı');
  }
  
  return {
    cusps: Array.from(cusps),       // [0, cusp1, cusp2, ..., cusp12]
    ascendant: ascmc[0],             // ASC
    mc: ascmc[1],                    // MC (Medium Coeli)
    armc: ascmc[2],                  // ARMC (Right Ascension of MC)
    vertex: ascmc[3],               // Vertex
  };
}

/**
 * Bir gezegenin hangi evde olduğunu belirler
 * @param {number} planetLongitude - Gezegenin ekliptik boylamı
 * @param {number[]} cusps - Ev cusps dizisi [0, cusp1, cusp2, ..., cusp12]
 * @returns {number} Ev numarası (1-12)
 */
export function findHouseOfPlanet(planetLongitude, cusps) {
  const lon = normalizeDegree(planetLongitude);
  
  for (let i = 1; i <= 12; i++) {
    const cusp = normalizeDegree(cusps[i]);
    const nextCusp = normalizeDegree(cusps[i === 12 ? 1 : i + 1]);
    
    if (nextCusp > cusp) {
      // Normal durum: cusp < nextCusp
      if (lon >= cusp && lon < nextCusp) return i;
    } else {
      // 0° geçişi (ör: cusp=350°, nextCusp=20°)
      if (lon >= cusp || lon < nextCusp) return i;
    }
  }
  
  return 1; // Fallback
}

/**
 * Kıstırılmış burçları (intercepted signs) belirler
 * Bir burç, iki ardışık ev cuspı arasında tamamen sıkıştığında "intercepted" olur
 * @param {number[]} cusps - Ev cusps dizisi
 * @returns {Array<{ house: number, sign: number }>} Kıstırılmış burçlar
 */
export function findInterceptedSigns(cusps) {
  const intercepted = [];
  
  for (let i = 1; i <= 12; i++) {
    const cusp = normalizeDegree(cusps[i]);
    const nextCusp = normalizeDegree(cusps[i === 12 ? 1 : i + 1]);
    
    // Bu evde hangi burçlar var?
    const cuspSign = Math.floor(cusp / 30);
    const nextCuspSign = Math.floor(nextCusp / 30);
    
    // Kaç burcun cusp'lar arasında olduğunu hesapla
    let signSpan;
    if (nextCuspSign >= cuspSign) {
      signSpan = nextCuspSign - cuspSign;
    } else {
      signSpan = (12 - cuspSign) + nextCuspSign;
    }
    
    // Eğer span >= 2 ise, aradaki burçlar kıstırılmıştır
    if (signSpan >= 2) {
      for (let s = 1; s < signSpan; s++) {
        const interceptedSign = (cuspSign + s) % 12;
        intercepted.push({ house: i, sign: interceptedSign });
      }
    }
  }
  
  return intercepted;
}

/**
 * Derece normalizasyonu (0-360 arasına getirir)
 */
export function normalizeDegree(deg) {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Obliquity of the ecliptic hesaplar (ekliptik eğimi)
 * Part of Fortune hesabı için kullanılabilir
 * @param {number} jd 
 * @returns {number} Ekliptik eğimi (derece)
 */
export function getObliquity(jd) {
  const swe = getSwe();
  // Güneşin pozisyonunu SEFLG_EQUATORIAL ile hesaplarken obliquity de hesaplanır
  // Alternatif olarak direkt formül kullanabiliriz
  // T = (JD - 2451545.0) / 36525.0 (Julian centuries from J2000.0)
  const T = (jd - 2451545.0) / 36525.0;
  // Mean obliquity (IAU 2006)
  const eps0 = 23.439291111 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T;
  return eps0;
}

/**
 * Swiss Ephemeris'i kapatır (bellek temizliği)
 */
export function closeEphemeris() {
  if (sweInstance) {
    sweInstance.close();
    sweInstance = null;
    sweInitialized = false;
  }
}
