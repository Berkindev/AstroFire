/**
 * AstroFire - İlişki Haritaları
 *
 * Üç ayrı teknik, tek modül:
 *
 *  1. SİNASTRİ    — İki haritayı üst üste bindirir. Yeni bir harita üretmez;
 *                   çapraz aspektleri ve karşılıklı ev yerleşimlerini gösterir.
 *  2. KOMPOZİT    — İki haritanın ORTA NOKTALARINDAN sanal bir harita kurar.
 *                   Gerçek bir gökyüzü anına karşılık gelmez.
 *  3. DAVISON     — İki doğumun ZAMAN ve UZAY orta noktası için GERÇEK bir
 *                   harita hesaplar. Gökyüzünde fiilen var olmuş bir andır.
 */

import { NATAL_PLANETS, PLANETS } from './constants.js';
import {
  initEphemeris,
  calculatePlanetPositions,
  calculateHouses,
  findHouseOfPlanet,
  findInterceptedSigns,
  normalizeDegree,
} from './ephemeris.js';
import { calcAspects, calcCrossAspects, anglePoints } from './aspects.js';
import {
  jdToUTC,
  midpointShort,
  angularSeparation,
  buildHouseCusps,
  cuspsToArray,
  placePlanetsInHouses,
  calcPartOfFortune,
} from './chartUtils.js';

// ============================================
// 1. SİNASTRİ
// ============================================

/**
 * Sinastri: iki natal haritanın karşılıklı ilişkisi.
 *
 * Çizim için bi-wheel kullanılır: İÇ halka = Kişi A, DIŞ halka = Kişi B.
 * drawBiWheel(canvas, natalData, transitData) imzasını beklediği ve çapraz
 * aspektlerde `transitPlanet` (dış) / `natalPlanet` (iç) alan adlarına baktığı
 * için (chartWheelSF.js:1209-1210), döndürdüğümüz obje o sözleşmeye uyar:
 * Kişi B, "transit" rolündedir. progression.js de aynı numarayı yapıyor.
 *
 * @param {Object} chartA - calculateNatalChart() sonucu (Kişi A — iç halka)
 * @param {Object} chartB - calculateNatalChart() sonucu (Kişi B — dış halka)
 * @returns {Object}
 */
export function calculateSynastry(chartA, chartB) {
  const cuspsA = cuspsToArray(chartA.houses.cusps);
  const cuspsB = cuspsToArray(chartB.houses.cusps);

  // Çapraz aspektler: B (dış) × A (iç).
  // staticB:false → her iki gezegenin de hızı hesaba katılır. Sinastride iki
  // harita da "donuk" olduğu için applying/separating zayıf bir kavramdır;
  // yine de iki cismin göreli hareketi anlamlı bir okuma verir.
  // Kişi A'nın (iç halka) ASC/MC'si de hedef: B'nin gezegenleri A'nın açılarına
  // değiyor mu — sinastrinin klasik sorusu.
  const crossAspects = calcCrossAspects(
    chartB.planets,
    [...chartA.planets, ...anglePoints(chartA.houses)],
    { staticB: false },
  );

  // Karşılıklı ev yerleşimleri — sinastrinin asıl anlatısı burada
  const bPlanetsInAHouses = chartB.planets.map(p => ({
    ...p,
    house: findHouseOfPlanet(p.longitude, cuspsA),
  }));

  const aPlanetsInBHouses = chartA.planets.map(p => ({
    ...p,
    house: findHouseOfPlanet(p.longitude, cuspsB),
  }));

  return {
    type: 'synastry',

    personA: chartA,
    personB: chartB,

    crossAspects,
    bPlanetsInAHouses,
    aPlanetsInBHouses,

    // --- drawBiWheel sözleşmesi ---
    // Dış halka (B) verisi. Kendi houses'ı olduğu için dış çerçeve de çizilir.
    planets: chartB.planets,
    houses: chartB.houses,
    partOfFortune: chartB.partOfFortune,
    transitNatalAspects: crossAspects,
  };
}

// ============================================
// 2. KOMPOZİT (Midpoint)
// ============================================

/**
 * SolarFire'ın kompozit ev cuspu "anchor" seçenekleri.
 *
 * Kısa-yay orta noktaları tek başına alındığında, iki haritanın cuspları
 * neredeyse karşıt olduğunda evler ZODYAK SIRASINI bozar. SolarFire bunu, bazı
 * cuspları uzun-yay orta noktasına çevirerek düzeltir; hangi cuspun sabit
 * (kısa-yay) tutulacağını da bu ayar belirler.
 */
export const COMPOSITE_ANCHORS = [
  { key: 'auto', name: 'Otomatik (SolarFire varsayılanı)', nameEn: 'Auto Anchor' },
  { key: 'asc', name: '1. Ev (ASC) sabit', nameEn: 'Anchor on 1st House' },
  { key: 'mc', name: '10. Ev (MC) sabit', nameEn: 'Anchor on 10th House' },
];

export const DEFAULT_COMPOSITE_ANCHOR = 'auto';

/**
 * Kompozit ev cusplarını kurar.
 *
 * Kilit gözlem: kadran ev sistemlerinde karşıt cusplar tam 180° arayadır
 * (cusp7 = cusp1 + 180). Dolayısıyla her cusp çiftinin orta noktası da bu
 * ilişkiyi korur — geriye 6 bağımsız EKSEN kalır ve her eksende tek bir karar
 * vardır: hangi uç k. ev, hangi uç (k+6). ev olacak?
 *
 * Kural: bir çapa cuspu kısa-yay orta noktası olarak sabitlenir; sonra zodyak
 * yönünde ilerleyerek her cusp için, bir önceki cuspun 0-180° ilerisine düşen
 * aday seçilir. İki aday tam 180° arayada olduğu için bu koşulu daima TAM BİR
 * tanesi sağlar → sıra garanti altına alınır.
 *
 * @param {Object} chartA
 * @param {Object} chartB
 * @param {string} anchor - 'auto' | 'asc' | 'mc'
 * @returns {{ cusps: number[], anchorUsed: string }} cusps 1-12 indeksli
 */
function buildCompositeCusps(chartA, chartB, anchor) {
  // Her ev için kısa-yay orta noktası (12 aday nokta; k ve k+6 birbirinin karşıtı)
  const axisPoint = [0];
  for (let k = 1; k <= 12; k++) {
    const a = chartA.houses.cusps.find(c => c.house === k).longitude;
    const b = chartB.houses.cusps.find(c => c.house === k).longitude;
    axisPoint[k] = midpointShort(a, b);
  }

  // Çapa seçimi
  let anchorUsed = anchor;
  if (anchor === 'auto') {
    // "En güçlü" orta nokta = baz cuspların birbirine EN YAKIN olduğu eksen.
    // Cuspler ne kadar yakınsa orta nokta o kadar az belirsizdir.
    const sepASC = angularSeparation(chartA.houses.ascendant, chartB.houses.ascendant);
    const sepMC = angularSeparation(chartA.houses.mc, chartB.houses.mc);
    anchorUsed = sepASC <= sepMC ? 'asc' : 'mc';
  }

  const anchorHouse = anchorUsed === 'mc' ? 10 : 1;

  const cusps = [0];
  cusps[anchorHouse] = axisPoint[anchorHouse];

  // Çapadan itibaren zodyak yönünde yürü
  let prev = cusps[anchorHouse];
  for (let step = 1; step <= 11; step++) {
    const house = ((anchorHouse - 1 + step) % 12) + 1;

    const candidate = axisPoint[house];
    const opposite = normalizeDegree(candidate + 180);

    // Bir öncekinin 0-180° ilerisine düşen adayı seç
    const ahead = normalizeDegree(candidate - prev);
    cusps[house] = (ahead > 0 && ahead < 180) ? candidate : opposite;

    prev = cusps[house];
  }

  return { cusps, anchorUsed };
}

/**
 * Kompozit harita (SolarFire "Composite – Midpoints").
 *
 * Gezegenler: karşılık gelen gezegenlerin kısa-yay orta noktası.
 * Evler: karşılık gelen cuspların orta noktası + zodyak sırası düzeltmesi.
 *
 * Bu SANAL bir haritadır — hiçbir gerçek gökyüzü anına karşılık gelmez.
 * Bu yüzden gezegenlerin "hızı" da fiziksel değildir; iki hızın ortalamasını
 * taşırız ki retrograd göstergesi ve applying/separating okumaları anlamlı olsun.
 *
 * @param {Object} chartA
 * @param {Object} chartB
 * @param {Object} [options]
 * @param {string} [options.anchor='auto'] - COMPOSITE_ANCHORS key'i
 * @returns {Object}
 */
export function calculateComposite(chartA, chartB, options = {}) {
  const anchor = options.anchor || DEFAULT_COMPOSITE_ANCHOR;

  // --- Gezegenler: orta nokta ---
  const planets = [];
  for (const pA of chartA.planets) {
    const pB = chartB.planets.find(p => p.id === pA.id);
    if (!pB) continue;

    const speed = ((pA.speed || 0) + (pB.speed || 0)) / 2;

    planets.push({
      id: pA.id,
      name: pA.name,
      nameEn: pA.nameEn,
      symbol: pA.symbol,
      longitude: midpointShort(pA.longitude, pB.longitude),
      latitude: ((pA.latitude || 0) + (pB.latitude || 0)) / 2,
      distance: ((pA.distance || 0) + (pB.distance || 0)) / 2,
      speed,
      isRetrograde: speed < 0,
    });
  }

  // --- Evler: cusp orta noktaları + sıra düzeltmesi ---
  const { cusps: rawCusps, anchorUsed } = buildCompositeCusps(chartA, chartB, anchor);

  const ascendant = rawCusps[1];
  const mc = rawCusps[10];

  const planetsWithHouses = placePlanetsInHouses(planets, rawCusps);

  const pofBase = calcPartOfFortune(
    ascendant,
    planetsWithHouses.find(p => p.id === PLANETS.SUN.id),
    planetsWithHouses.find(p => p.id === PLANETS.MOON.id),
  );
  const partOfFortune = pofBase
    ? { ...pofBase, house: findHouseOfPlanet(pofBase.longitude, rawCusps) }
    : null;

  const pofForAspects = partOfFortune ? [{ ...partOfFortune, id: -99 }] : [];

  return {
    type: 'composite',
    method: 'midpoint',
    anchor,
    anchorUsed, // 'auto' seçiliyse fiilen hangisi kullanıldı

    personA: chartA,
    personB: chartB,

    planets: planetsWithHouses,
    partOfFortune,

    houses: {
      // Kompozitin gerçek bir ev SİSTEMİ yoktur — cusplar orta noktadan gelir
      system: 'composite-midpoint',
      cusps: buildHouseCusps(rawCusps),
      ascendant,
      mc,
      descendant: normalizeDegree(ascendant + 180),
      ic: normalizeDegree(mc + 180),
      vertex: null,
    },

    interceptedSigns: findInterceptedSigns(rawCusps),

    aspects: calcAspects([...planetsWithHouses, ...pofForAspects, ...anglePoints({ ascendant, mc })]),
  };
}

// ============================================
// 3. DAVISON (Zaman/Uzay Orta Noktası)
// ============================================

/**
 * İki coğrafi boylamın orta noktası — antimeridyeni doğru geçer.
 * (Basit ortalama, İstanbul 29°D ile Honolulu 158°B arasında dünyanın yanlış
 * tarafına düşer; kısa yay üzerinden gitmek gerekir.)
 */
function midpointLongitude(lon1, lon2) {
  let diff = lon2 - lon1;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;

  let mid = lon1 + diff / 2;
  if (mid > 180) mid -= 360;
  if (mid < -180) mid += 360;
  return mid;
}

/**
 * Davison ilişki haritası: iki doğumun zaman ve uzay orta noktası.
 *
 * Kompozitten temel farkı: bu GERÇEK bir haritadır. Hesaplanan an ve yerde
 * gökyüzü fiilen böyleydi — gezegenler doğru hızlarla, evler gerçek bir ufukla.
 *
 * Zaman: iki doğumun Julian Day'lerinin (UTC tabanlı) ortalaması.
 * Yer: enlem ortalaması + boylamın kısa-yay ortalaması.
 *
 * Not: Doğruluğu doğrudan localToUTC'ye bağlıdır — DST hatası varsa buraya da
 * taşınır. (Bkz. datetime.js'teki sabit nokta çözümü.)
 *
 * @param {Object} chartA
 * @param {Object} chartB
 * @returns {Promise<Object>}
 */
export async function calculateDavison(chartA, chartB) {
  await initEphemeris();

  // --- Zaman orta noktası ---
  const jd = (chartA.julianDay + chartB.julianDay) / 2;

  // --- Uzay orta noktası ---
  const latitude = (chartA.birthData.latitude + chartB.birthData.latitude) / 2;
  const longitude = midpointLongitude(chartA.birthData.longitude, chartB.birthData.longitude);

  // --- Buradan itibaren sıradan bir natal hesap ---
  const planets = calculatePlanetPositions(jd, NATAL_PLANETS);

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

  const houseSystem = 'P';
  const houses = calculateHouses(jd, latitude, longitude, houseSystem);

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
    type: 'davison',

    personA: chartA,
    personB: chartB,

    julianDay: jd,
    // Davison anının doğal bir saat dilimi yoktur (yer türetilmiştir) → UTC
    utc: jdToUTC(jd),

    location: {
      latitude,
      longitude,
      timezone: 'UTC',
      name: 'Coğrafi orta nokta',
    },

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
