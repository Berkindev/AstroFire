/**
 * AstroFire - Solar Return Hesaplama Modülü
 * Güneş'in natal pozisyonuna tam dönüşünü (Solar Return) hesaplar
 * SolarFire uyumlu: ±1 saniye hassasiyet
 */

import { NATAL_PLANETS, PLANETS, ASPECTS, SIGNS } from './constants.js';
import { getDecanSign } from './decans.js';
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
 * Güneş'in natal pozisyonuna döndüğü tam Julian Day'i bulur.
 * Newton-Raphson iterasyonu ile ±1 saniye hassasiyet.
 * 
 * @param {number} natalSunLon - Natal Güneş ekliptik boylamı (0-360)
 * @param {number} year - Solar Return yılı
 * @returns {number} Solar Return anı (Julian Day)
 */
export function findSolarReturnMoment(natalSunLon, year) {
  // İlk tahmin: Güneş yaklaşık olarak her yıl aynı tarih civarında
  // aynı dereceye gelir. Yılın başından başlayıp tahmini güne gidelim.
  
  // Natal güneş hangi burçta? Oradan yaklaşık tarih hesapla
  // Güneş ~1°/gün hareket eder, 0°♈ ≈ 20 Mart
  const daysFromAries = natalSunLon; // 0° = 0°♈, her 1° ≈ 1 gün
  
  // 20 Mart civarı 0°♈ → yaklaşık gün = 79 (20 Mart = yılın 79. günü)
  // Tahmini JD: 1 Ocak JD + 79 + daysFromAries
  const jan1JD = calculateJulianDay(year, 1, 1, 0);
  let estimatedDayOfYear = 79 + daysFromAries;
  
  // Yıl sınırı düzeltmesi: Eğer tahmini gün yılı aşarsa (>365),
  // bu aslında verilen yıl içinde başlarken gerçekleşen bir SR'dir.
  // Örnek: Balık burcu (330-360°) → 79 + 342 = 421 > 365
  // Bu durumda 365.25 çıkararak doğru yılın başına getir.
  if (estimatedDayOfYear > 365) {
    estimatedDayOfYear -= 365.25;
  }
  
  let jd = jan1JD + estimatedDayOfYear;
  
  // Newton-Raphson iterasyonu
  const MAX_ITER = 50;
  const TOLERANCE = 1 / 86400; // 1 saniye = ~1.16e-5 gün
  
  for (let i = 0; i < MAX_ITER; i++) {
    const sunPos = calculatePlanetPosition(jd, PLANETS.SUN.id);
    const sunLon = sunPos.longitude;
    const sunSpeed = sunPos.speed; // derece/gün
    
    // Açı farkı (kısa yolu bul)
    let diff = natalSunLon - sunLon;
    
    // -180 ile +180 arasına normalize et
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    // Yeterli hassasiyet?
    if (Math.abs(diff) < 0.00001) { // ~0.036 arcsecond
      // Yakınsadı — ama doğru yılda mı kontrol et
      const srUTC = jdToUTC(jd);
      // SR, verilen yıl veya bir sonraki yılın başında olabilir (doğum günü geçişi)
      // Tolerans: SR yılı, istenen yıl veya istenen yıl+1 olabilir (çünkü
      // doğum günü yılın son günlerine denk geliyorsa SR yılbaşından sonra olabilir)
      // Ama ana kural: SR her zaman verilen yılın doğum gününde veya sonrasında olmalı
      if (srUTC.year === year || srUTC.year === year + 1) {
        return jd;
      }
      // Yanlış yıla yakınsadıysa, bir yıl geri/ileri at ve tekrar dene
      if (srUTC.year > year + 1) {
        jd -= 365.25;
        continue;
      }
      if (srUTC.year < year) {
        jd += 365.25;
        continue;
      }
      return jd;
    }
    
    // Newton-Raphson düzeltmesi: Δt = Δlon / speed
    const correction = diff / sunSpeed;
    jd += correction;
  }
  
  // Convergence kontrolü — olası edge case (yıl sınırı geçişi)
  // JD doğru yılda mı kontrol et
  const sunCheck = calculatePlanetPosition(jd, PLANETS.SUN.id);
  const finalDiff = Math.abs(normalizeDegree(sunCheck.longitude - natalSunLon));
  if (finalDiff > 0.01 && finalDiff < 359.99) {
    throw new Error(`Solar Return yakınsamadı. Fark: ${finalDiff.toFixed(4)}°`);
  }
  
  return jd;
}

/**
 * Julian Day'den UTC tarih/saat bilgisi çıkarır.
 * Swiss Ephemeris julday'in tersini yapar.
 * 
 * @param {number} jd - Julian Day Number
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number }}
 */
export function jdToUTC(jd) {
  // JD → Calendar Date dönüşümü (Meeus formulü)
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
  
  // Gün içindeki saat
  const totalHours = f * 24;
  const hour = Math.floor(totalHours);
  const totalMinutes = (totalHours - hour) * 60;
  const minute = Math.floor(totalMinutes);
  const second = Math.round((totalMinutes - minute) * 60);
  
  return { year, month, day, hour, minute, second };
}

/**
 * Julian Day'i belirli bir timezone'daki yerel saate çevirir.
 * 
 * @param {number} jd - Julian Day (UTC)
 * @param {string} timezone - IANA timezone ID
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, second: number, utcOffsetMinutes: number, utcOffsetFormatted: string }}
 */
export function jdToLocal(jd, timezone) {
  const utc = jdToUTC(jd);
  
  // UTC saati → Date nesnesi
  const utcDate = new Date(Date.UTC(utc.year, utc.month - 1, utc.day, utc.hour, utc.minute, utc.second));
  
  // Timezone'daki temsilini bul
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
  
  // UTC offset hesapla
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
 * Tam Solar Return haritası hesaplar.
 * SolarFire uyumlu yıl konvansiyonu:
 * - Girilen yıl = Solar Return döneminin çoğunluğunun düştüğü yıl
 * - Doğum ayı > 6 (Tem-Ara): SR olayı girilen yıldan 1 yıl önce gerçekleşir
 *   Örnek: Ke (Ekim doğumlu), "2004" girilince → SR Ekim 2003'te hesaplanır
 * - Doğum ayı ≤ 6 (Oca-Haz): SR olayı girilen yılda gerçekleşir
 *   Örnek: Ha (Mart doğumlu), "1998" girilince → SR Mart 1998'de hesaplanır
 * 
 * @param {Object} natalChart - calculateNatalChart() sonucu
 * @param {number} year - Solar yıl (SolarFire konvansiyonu)
 * @param {Object} location - SR konumu
 * @param {number} location.latitude
 * @param {number} location.longitude
 * @param {string} location.timezone - IANA timezone ID
 * @param {string} [location.name] - Konum adı (opsiyonel)
 * @returns {Promise<Object>} Solar Return harita verisi
 */
export async function calculateSolarReturn(natalChart, year, location) {
  await initEphemeris();
  
  // Natal Güneş boylamı
  const natalSun = natalChart.planets.find(p => p.id === PLANETS.SUN.id);
  if (!natalSun) {
    throw new Error('Natal haritada Güneş bulunamadı.');
  }
  const natalSunLon = natalSun.longitude;
  
  // SolarFire yıl konvansiyonu: doğum ayına göre gerçek SR yılını belirle
  // Doğum ayı > 6 ise SR olayı girilen yıldan bir önceki yılda gerçekleşir
  const birthMonth = natalChart.birthData?.month || 1;
  const actualSRYear = birthMonth > 6 ? year - 1 : year;
  
  // Solar Return anını bul (JD)
  const srJD = findSolarReturnMoment(natalSunLon, actualSRYear);
  
  // SR anını UTC'ye çevir
  const srUTC = jdToUTC(srJD);
  
  // SR anını yerel saate çevir
  const srLocal = jdToLocal(srJD, location.timezone);
  
  // Gezegen pozisyonları (SR anında)
  const planets = calculatePlanetPositions(srJD, NATAL_PLANETS);
  
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
  
  // Ev hesabı (SR konumunda)
  const houseSystem = 'P'; // Placidus
  const houses = calculateHouses(srJD, location.latitude, location.longitude, houseSystem);
  
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
  const srSun = planetsWithHouses.find(p => p.id === PLANETS.SUN.id);
  const srMoon = planetsWithHouses.find(p => p.id === PLANETS.MOON.id);
  let partOfFortune = null;
  if (srSun && srMoon) {
    // Gündüz mü gece mi? Güneş ASC'den DSC'ye (saat yönünde 180°) ise gündüz
    const sunDist = normalizeDegree(srSun.longitude - houses.ascendant);
    const isDaytime = sunDist > 180; // Güneş ufkun üstünde
    
    let fortuneLon;
    if (isDaytime) {
      fortuneLon = houses.ascendant + srMoon.longitude - srSun.longitude;
    } else {
      fortuneLon = houses.ascendant + srSun.longitude - srMoon.longitude;
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
  const aspects = calculateSRAspects([...planetsWithHouses, ...pofForAspects]);

  return {
    type: 'solar_return',

    // SR timing
    julianDay: srJD,
    utc: srUTC,
    local: srLocal,
    
    // Konum
    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      name: location.name || '',
    },
    
    // Natal referansı
    natalSun: {
      longitude: natalSunLon,
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
 * Solar Return gezegenler arası aspektleri hesaplar
 * @param {Array<Object>} planets
 * @returns {Array<Object>}
 */


function calculateSRAspects(planets) {
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
          // Applying/separating
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
 * Güneş'in belirli bir ekliptik boylamına ulaştığı Julian Day'i bulur.
 * Newton-Raphson iterasyonu ile yüksek hassasiyet.
 *
 * @param {number} targetLon - Hedef ekliptik boylamı (0-360)
 * @param {number} startJD - Aramaya başlanacak tahmini JD
 * @returns {number} Güneş'in targetLon'a ulaştığı Julian Day
 */
function findSunAtLongitude(targetLon, startJD) {
  let jd = startJD;
  const MAX_ITER = 50;

  for (let i = 0; i < MAX_ITER; i++) {
    const sunPos = calculatePlanetPosition(jd, PLANETS.SUN.id);
    const sunLon = sunPos.longitude;
    const sunSpeed = sunPos.speed;

    let diff = targetLon - sunLon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (Math.abs(diff) < 0.00001) {
      return jd;
    }

    const correction = diff / sunSpeed;
    jd += correction;
  }

  return jd;
}

/**
 * Solar Return haritasında Güneş'in her ev cuspunu geçtiği tarihleri hesaplar.
 * Güneş SR anında natal derecesindedir ve yıl boyunca 12 evi gezer.
 *
 * @param {Object} sr - calculateSolarReturn() sonucu
 * @returns {Array<Object>} 12 ev için tarih aralıkları
 */
export function calculateSRHouseTiming(sr) {
  const cusps = sr.houses.cusps; // [{house, longitude, signIndex, ...}, ...]
  const srJD = sr.julianDay;
  const sunLonAtSR = sr.natalSun.longitude;
  const timezone = sr.location.timezone;
  const result = [];

  for (let i = 0; i < 12; i++) {
    const cuspLon = cusps[i].longitude;
    const nextCuspLon = cusps[(i + 1) % 12].longitude;
    const houseNum = cusps[i].house;

    // Güneş'in SR pozisyonundan bu cuspa angular mesafesi (ileriye doğru)
    let enterOffset = cuspLon - sunLonAtSR;
    if (enterOffset < 0) enterOffset += 360;

    let leaveOffset = nextCuspLon - sunLonAtSR;
    if (leaveOffset < 0) leaveOffset += 360;

    // leaveOffset, enterOffset'tan büyük olmalı (Güneş önce girer, sonra çıkar)
    if (leaveOffset <= enterOffset) leaveOffset += 360;

    // Tahmini JD (Güneş ~1°/gün)
    const enterEstJD = srJD + enterOffset;
    const leaveEstJD = srJD + leaveOffset;

    // Newton-Raphson ile kesin anları bul
    const enterJD = findSunAtLongitude(cuspLon, enterEstJD);
    const leaveJD = findSunAtLongitude(nextCuspLon, leaveEstJD);

    // Yerel tarihe çevir
    const enterDate = jdToLocal(enterJD, timezone);
    const leaveDate = jdToLocal(leaveJD, timezone);

    // Dekan bilgisi
    const decanInfo = getDecanSign(cuspLon);

    // Bu evdeki SR gezegenleri
    const housePlanets = sr.planets.filter(p => p.house === houseNum);

    result.push({
      house: houseNum,
      cuspLongitude: cuspLon,
      enterJD,
      leaveJD,
      enterDate,
      leaveDate,
      durationDays: leaveJD - enterJD,
      sign: SIGNS[cusps[i].signIndex],
      decanSign: decanInfo.sign,
      ruler: decanInfo.ruler,
      planets: housePlanets,
    });
  }

  return result;
}
