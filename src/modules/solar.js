/**
 * AstroFire - Solar Return Hesaplama Modülü
 * Güneş'in natal pozisyonuna tam dönüşünü (Solar Return) hesaplar
 * SolarFire uyumlu: ±1 saniye hassasiyet
 */

import { NATAL_PLANETS, PLANETS, SIGNS } from './constants.js';
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
 * Girilen "solar yıl"dan, Solar Return olayının GERÇEKTEN düştüğü takvim yılını
 * çıkarır.
 *
 * KONVANSİYON (bilinçli tercih — bug değil):
 * Girilen yıl, solar dönemin ÇOĞUNLUĞUNUN düştüğü takvim yılıdır.
 *   - Doğum ayı > 6 (Tem-Ara): dönem bir önceki yıl başlar.
 *     Örn. 6 Ekim doğumlu + "1995" → SR olayı 6 Ekim 1994, dönem Eki 1994–Eki 1995
 *     (3 ay 1994'te, 9 ay 1995'te → çoğunluk 1995).
 *   - Doğum ayı ≤ 6 (Oca-Haz): dönem girilen yılda başlar.
 *     Örn. 21 Mart doğumlu + "1998" → SR olayı 21 Mart 1998, dönem Mar 1998–Mar 1999.
 *
 * @param {Object} birthData - natalChart.birthData
 * @param {number} year - Kullanıcının girdiği solar yıl
 * @returns {number} SR olayının gerçekleştiği takvim yılı
 */
export function solarEventYear(birthData, year) {
  const birthMonth = birthData?.month || 1;
  return birthMonth > 6 ? year - 1 : year;
}

/**
 * Girilen solar yılın kapsadığı dönemi (başlangıç/bitiş) döndürür.
 * UI'da "6 Ekim 1994 – 6 Ekim 1995" etiketini basmak için — hangi tarihleri
 * gördüğün belirsiz kalmasın.
 *
 * @param {Object} birthData
 * @param {number} year
 * @returns {{ startYear, endYear, month, day }}
 */
export function solarPeriod(birthData, year) {
  const startYear = solarEventYear(birthData, year);
  return {
    startYear,
    endYear: startYear + 1,
    month: birthData?.month || 1,
    day: birthData?.day || 1,
  };
}

/**
 * Güneş'in natal pozisyonuna döndüğü tam Julian Day'i bulur.
 * Newton-Raphson iterasyonu ile ±1 saniye hassasiyet.
 *
 * ⚠️ Tohum ("yılın 79. günü + natal Güneş derecesi") kabadır ve 1-6 Ocak
 * doğumlularda bir sonraki yılın dönüşüne yakınsar — bir sonraki commit'te
 * düzeltilecek. Burada bilerek olduğu gibi bırakılıyor ki bu commit'in
 * davranışı hiç değiştirmediği kanıtlanabilsin.
 *
 * @param {number} natalSunLon - Natal Güneş ekliptik boylamı (0-360)
 * @param {number} year - SR olayının düştüğü takvim yılı
 * @returns {number} Solar Return anı (Julian Day)
 */
function findSolarReturnMoment(natalSunLon, year) {
  const jan1JD = calculateJulianDay(year, 1, 1, 0);
  let estimatedDayOfYear = 79 + natalSunLon; // 0°♈ ≈ 20 Mart = yılın 79. günü
  if (estimatedDayOfYear > 365) estimatedDayOfYear -= 365.25;

  let jd = jan1JD + estimatedDayOfYear;

  const MAX_ITER = 50;

  for (let i = 0; i < MAX_ITER; i++) {
    const sunPos = calculatePlanetPosition(jd, PLANETS.SUN.id);

    let diff = natalSunLon - sunPos.longitude;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (Math.abs(diff) < 0.00001) {
      const srUTC = jdToUTC(jd);
      if (srUTC.year === year || srUTC.year === year + 1) return jd;
      if (srUTC.year > year + 1) { jd -= 365.25; continue; }
      if (srUTC.year < year) { jd += 365.25; continue; }
      return jd;
    }

    jd += diff / sunPos.speed;
  }

  const sunCheck = calculatePlanetPosition(jd, PLANETS.SUN.id);
  const finalDiff = Math.abs(normalizeDegree(sunCheck.longitude - natalSunLon));
  if (finalDiff > 0.01 && finalDiff < 359.99) {
    throw new Error(`Solar Return yakınsamadı. Fark: ${finalDiff.toFixed(4)}°`);
  }

  return jd;
}

/**
 * Güneş'in belirli bir ekliptik boylamına ulaştığı Julian Day.
 * ⚠️ Yakınsama kontrolü yok — bir sonraki commit'te ortak çözücüye taşınacak.
 */
function findSunAtLongitude(targetLon, startJD) {
  let jd = startJD;

  for (let i = 0; i < 50; i++) {
    const sunPos = calculatePlanetPosition(jd, PLANETS.SUN.id);

    let diff = targetLon - sunPos.longitude;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    if (Math.abs(diff) < 0.00001) return jd;

    jd += diff / sunPos.speed;
  }

  return jd;
}

/**
 * Tam Solar Return haritası hesaplar.
 *
 * @param {Object} natalChart - calculateNatalChart() sonucu
 * @param {number} year - Solar yıl (bkz. solarEventYear konvansiyonu)
 * @param {Object} location - SR konumu { latitude, longitude, timezone, name? }
 * @returns {Promise<Object>} Solar Return harita verisi
 */
export async function calculateSolarReturn(natalChart, year, location) {
  await initEphemeris();

  const natalSun = natalChart.planets.find(p => p.id === PLANETS.SUN.id);
  if (!natalSun) {
    throw new Error('Natal haritada Güneş bulunamadı.');
  }
  const natalSunLon = natalSun.longitude;

  const srJD = findSolarReturnMoment(natalSunLon, solarEventYear(natalChart.birthData, year));

  const planets = addSouthNode(calculatePlanetPositions(srJD, NATAL_PLANETS));

  // Evler SR KONUMUNDA hesaplanır (relokasyon); SR ANI ise konumdan bağımsızdır.
  const houseSystem = 'P'; // Placidus
  const houses = calculateHouses(srJD, location.latitude, location.longitude, houseSystem);

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
    type: 'solar_return',

    julianDay: srJD,
    utc: jdToUTC(srJD),
    local: jdToLocal(srJD, location.timezone),

    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      name: location.name || '',
    },

    natalSun: { longitude: natalSunLon },
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

/**
 * Solar Return haritasında Güneş'in her ev cuspunu geçtiği tarihleri hesaplar.
 * Güneş SR anında natal derecesindedir ve yıl boyunca 12 evi gezer.
 *
 * @param {Object} sr - calculateSolarReturn() sonucu
 * @returns {Array<Object>} 12 ev için tarih aralıkları
 */
export function calculateSRHouseTiming(sr) {
  const cusps = sr.houses.cusps;
  const srJD = sr.julianDay;
  const sunLonAtSR = sr.natalSun.longitude;
  const timezone = sr.location.timezone;
  const result = [];

  for (let i = 0; i < 12; i++) {
    const cuspLon = cusps[i].longitude;
    const nextCuspLon = cusps[(i + 1) % 12].longitude;
    const houseNum = cusps[i].house;

    // Güneş'in SR pozisyonundan bu cuspa ileri yöndeki açısal mesafesi (~1°/gün)
    let enterOffset = cuspLon - sunLonAtSR;
    if (enterOffset < 0) enterOffset += 360;

    let leaveOffset = nextCuspLon - sunLonAtSR;
    if (leaveOffset < 0) leaveOffset += 360;

    // Güneş önce girer, sonra çıkar
    if (leaveOffset <= enterOffset) leaveOffset += 360;

    const enterJD = findSunAtLongitude(cuspLon, srJD + enterOffset);
    const leaveJD = findSunAtLongitude(nextCuspLon, srJD + leaveOffset);

    const decanInfo = getDecanSign(cuspLon);

    result.push({
      house: houseNum,
      cuspLongitude: cuspLon,
      enterJD,
      leaveJD,
      enterDate: jdToLocal(enterJD, timezone),
      leaveDate: jdToLocal(leaveJD, timezone),
      durationDays: leaveJD - enterJD,
      sign: SIGNS[cusps[i].signIndex],
      decanSign: decanInfo.sign,
      ruler: decanInfo.ruler,
      planets: sr.planets.filter(p => p.house === houseNum),
    });
  }

  return result;
}
