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
 *
 * Arama, hedef yılın DOĞUM GÜNÜNDEN başlar. Solar Return tanımı gereği doğum
 * günü yıldönümünün ±1 gün civarındadır, ardışık dönüşler ise 365.24 gün
 * arayla gelir — dolayısıyla bu tohumdan Newton daima DOĞRU köke yakınsar.
 * Yıl kontrolüne, ±365.25 retry'larına veya gün-sayısı heuristiğine gerek yok.
 *
 * Eski kod tohum olarak "yılın 79. günü + natal Güneş derecesi" gibi kaba bir
 * lineer tahmin kullanıyordu. Bu tahmin, natal Güneş ~280-286° (yani 1-6 Ocak
 * doğumlular) için yıl sınırını aşıyor ve BİR SONRAKİ yılın dönüşüne
 * yakınsıyordu; kod da bunu `srUTC.year === year + 1` diye açıkça kabul ediyordu.
 *
 * Not: 1-2 Ocak doğumlular için dönüş, hedef yılın hemen ÖNCESİNE (31 Aralık)
 * düşebilir — bu astronomik olarak doğrudur, hata değildir.
 *
 * @param {number} natalSunLon - Natal Güneş ekliptik boylamı (0-360)
 * @param {number} eventYear - SR olayının düştüğü takvim yılı
 * @param {Object} birthData - Doğum ay/günü (tohum için)
 * @returns {number} Solar Return anı (Julian Day)
 */
function findSolarReturnMoment(natalSunLon, eventYear, birthData) {
  const seedJD = calculateJulianDay(
    eventYear,
    birthData?.month || 1,
    birthData?.day || 1,
    12, // öğlen — doğum saatini bilmeye gerek yok, kök ±1 gün içinde
  );

  return findBodyAtLongitude(PLANETS.SUN.id, natalSunLon, seedJD, 'Solar Return');
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

  const srJD = findSolarReturnMoment(
    natalSunLon,
    solarEventYear(natalChart.birthData, year),
    natalChart.birthData,
  );

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

    aspects: calcAspects([...planetsWithHouses, ...pofForAspects, ...anglePoints(houses)]),
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

    const enterJD = findBodyAtLongitude(PLANETS.SUN.id, cuspLon, srJD + enterOffset, 'Ev girişi');
    const leaveJD = findBodyAtLongitude(PLANETS.SUN.id, nextCuspLon, srJD + leaveOffset, 'Ev çıkışı');

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
