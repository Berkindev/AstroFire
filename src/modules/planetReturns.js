/**
 * AstroFire - Gelişmiş Dönüşler (SolarFire "Advanced Returns" karşılığı)
 *
 * Herhangi bir gezegenin natal pozisyonuna dönüşü (Tam), karşısına gelişi
 * (Demi, 180°) veya karesine gelişi (Quarti, 90°) için, referans tarihe EN
 * YAKIN anı bulur ve o an için tam harita kurar.
 *
 * Çözücü, returns.js'in Newton'u DEĞİL: iç gezegenler retro dönemlerinde
 * hız ~0'a düşer ve Newton patlar/yanlış köke kaçar. Bunun yerine
 * transitReport.js'te kanıtlanan yöntem: dönem örneklenir, işaret değişimleri
 * bisection ile ~1 saniyeye inceltilir — retro-güvenli, her geçişi bulur.
 */

import { NATAL_PLANETS, PLANETS } from './constants.js';
import {
  initEphemeris,
  calculatePlanetPosition,
  calculatePlanetPositions,
  calculateHouses,
  findHouseOfPlanet,
  findInterceptedSigns,
  normalizeDegree,
} from './ephemeris.js';
import { calcAspects, anglePoints } from './aspects.js';
import {
  jdToUTC,
  jdToLocal,
  addSouthNode,
  buildHouseCusps,
  placePlanetsInHouses,
  calcPartOfFortune,
} from './chartUtils.js';

/** Dönüş hesabı sunulan gezegenler + zodyak turu süresi (gün) ve örnekleme adımı. */
export const RETURN_PLANETS = [
  { ...PLANETS.MERCURY, period: 365, step: 1 },
  { ...PLANETS.VENUS, period: 365, step: 1 },
  { ...PLANETS.MARS, period: 687, step: 2 },
  { ...PLANETS.JUPITER, period: 4333, step: 5 },
  { ...PLANETS.SATURN, period: 10756, step: 10 },
];

export const RETURN_TYPES = [
  { key: 'full', name: 'Tam Dönüş', offsets: [0] },
  { key: 'demi', name: 'Demi (180°)', offsets: [180] },
  { key: 'quarti', name: 'Quarti (90°)', offsets: [90, -90] },
];

function wrap180(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/** [jd1, jd2] aralığındaki işaret değişimini bisection ile inceltir. */
function refineCrossing(planetId, L, jd1, jd2, f1) {
  let lo = jd1, hi = jd2, flo = f1;
  for (let i = 0; i < 60 && (hi - lo) > 1 / 86400; i++) {
    const mid = (lo + hi) / 2;
    const fm = wrap180(calculatePlanetPosition(mid, planetId).longitude - L);
    if ((flo < 0) === (fm < 0)) { lo = mid; flo = fm; } else { hi = mid; }
  }
  return (lo + hi) / 2;
}

/**
 * Gezegenin hedef boylam(lar)dan geçtiği, refJD'ye EN YAKIN anı bulur.
 * Pencere: refJD ± 0.75 × periyot — komşu döngüler de aday olur, retro
 * üçlü geçişlerin hepsi yakalanır.
 *
 * @returns {{ jd: number, targetLon: number }}
 */
function findNearestCrossing(planet, targetLons, refJD) {
  const half = planet.period * 0.75;
  const step = planet.step;

  const samples = [];
  for (let jd = refJD - half; jd <= refJD + half + step; jd += step) {
    samples.push({ jd, lon: calculatePlanetPosition(jd, planet.id).longitude });
  }

  let best = null;
  for (const L of targetLons) {
    for (let i = 0; i < samples.length - 1; i++) {
      const f1 = wrap180(samples[i].lon - L);
      const f2 = wrap180(samples[i + 1].lon - L);
      if ((f1 < 0) !== (f2 < 0) && Math.abs(f1 - f2) < 180) {
        const jd = refineCrossing(planet.id, L, samples[i].jd, samples[i + 1].jd, f1);
        if (!best || Math.abs(jd - refJD) < Math.abs(best.jd - refJD)) {
          best = { jd, targetLon: normalizeDegree(L) };
        }
      }
    }
  }

  if (!best) {
    throw new Error(`${planet.name} dönüşü pencerede bulunamadı (±${Math.round(half)} gün).`);
  }
  return best;
}

/**
 * Gelişmiş dönüş haritası hesaplar.
 *
 * @param {Object} natalChart - calculateNatalChart() sonucu
 * @param {number} planetId - RETURN_PLANETS'ten bir gezegen id'si
 * @param {string} typeKey - RETURN_TYPES key'i ('full' | 'demi' | 'quarti')
 * @param {number} refJD - referans an (bu ana EN YAKIN dönüş bulunur)
 * @param {Object} location - { latitude, longitude, timezone, name? }
 * @returns {Promise<Object>} SR/LR ile aynı şekilli harita objesi
 */
export async function calculatePlanetReturn(natalChart, planetId, typeKey, refJD, location) {
  await initEphemeris();

  const planet = RETURN_PLANETS.find(p => p.id === planetId);
  const type = RETURN_TYPES.find(t => t.key === typeKey);
  if (!planet || !type) throw new Error('Geçersiz gezegen ya da dönüş tipi.');

  const natalPlanet = natalChart.planets.find(p => p.id === planetId);
  if (!natalPlanet) throw new Error(`Natal haritada ${planet.name} bulunamadı.`);

  const targetLons = type.offsets.map(o => natalPlanet.longitude + o);
  const { jd, targetLon } = findNearestCrossing(planet, targetLons, refJD);

  const planets = addSouthNode(calculatePlanetPositions(jd, NATAL_PLANETS));

  // Evler dönüş KONUMUNDA kurulur (SR/LR ile aynı kural)
  const houseSystem = 'P';
  const houses = calculateHouses(jd, location.latitude, location.longitude, houseSystem);
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
    type: 'planet_return',
    returnPlanet: { id: planet.id, name: planet.name, symbol: planet.symbol },
    returnType: { key: type.key, name: type.name },

    julianDay: jd,
    utc: jdToUTC(jd),
    local: jdToLocal(jd, location.timezone),

    location: {
      latitude: location.latitude,
      longitude: location.longitude,
      timezone: location.timezone,
      name: location.name || '',
    },

    natalLon: natalPlanet.longitude,
    targetLon,

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
