/**
 * AstroFire - Harita Yardımcıları
 *
 * Her harita tipinin (natal, SR, LR, transit, progres, sinastri, kompozit,
 * davison) ihtiyaç duyduğu ortak parçalar. Daha önce bu mantıkların her biri
 * 3-5 modülde ayrı ayrı kopyalanmıştı.
 */

import { PLANETS } from './constants.js';
import { normalizeDegree, findHouseOfPlanet } from './ephemeris.js';
import { formatUTCOffset } from './datetime.js';

// ============================================
// AÇI ARİTMETİĞİ
// ============================================

/**
 * İki boylam arasındaki kısa yay (0-180).
 */
export function angularSeparation(lon1, lon2) {
  let sep = Math.abs(normalizeDegree(lon1) - normalizeDegree(lon2));
  if (sep > 180) sep = 360 - sep;
  return sep;
}

/**
 * İki boylamın KISA yay orta noktası.
 * İki nokta tam karşıtsa (180°) sonuç belirsizdir; bu durumda lon1+90 döner.
 */
export function midpointShort(lon1, lon2) {
  const a = normalizeDegree(lon1);
  const b = normalizeDegree(lon2);
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return normalizeDegree(a + diff / 2);
}

/**
 * İki boylamın UZUN yay orta noktası — kısa yay orta noktasının tam karşıtı.
 * Kompozit ev cusplarında zodyak sırasını korumak için gerekir (SolarFire davranışı).
 */
export function midpointLong(lon1, lon2) {
  return normalizeDegree(midpointShort(lon1, lon2) + 180);
}

// ============================================
// JULIAN DAY ↔ TAKVİM
// ============================================

/**
 * Julian Day → UTC takvim tarihi (Meeus formülü).
 *
 * @param {number} jd - Julian Day Number
 * @returns {{ year, month, day, hour, minute, second }}
 */
export function jdToUTC(jd) {
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

  const totalHours = f * 24;
  const hour = Math.floor(totalHours);
  const totalMinutes = (totalHours - hour) * 60;
  const minute = Math.floor(totalMinutes);
  const second = Math.round((totalMinutes - minute) * 60);

  return { year, month, day, hour, minute, second };
}

/**
 * Julian Day (UTC) → verilen IANA timezone'daki yerel saat.
 * Offset, ANIN kendisinden türetilir; tarihsel DST doğru uygulanır.
 *
 * @param {number} jd - Julian Day (UTC)
 * @param {string} timezone - IANA timezone ID
 * @returns {{ year, month, day, hour, minute, second, utcOffsetMinutes, utcOffsetFormatted }}
 */
export function jdToLocal(jd, timezone) {
  const utc = jdToUTC(jd);

  const utcDate = new Date(Date.UTC(
    utc.year, utc.month - 1, utc.day, utc.hour, utc.minute, utc.second,
  ));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
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

  const localMs = Date.UTC(localYear, localMonth - 1, localDay, localHour, localMinute, localSecond);
  const offsetMinutes = (localMs - utcDate.getTime()) / 60000;

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

// ============================================
// HARİTA PARÇALARI
// ============================================

/**
 * Güney Ay Düğümü'nü (KAD'ın tam karşıtı) gezegen listesine ekler.
 * Listeyi yerinde değiştirir ve geri döndürür.
 */
export function addSouthNode(planets) {
  const northNode = planets.find(p => p.id === PLANETS.MEAN_NODE.id);
  if (!northNode) return planets;

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

  return planets;
}

/**
 * Swiss Ephemeris'in ham cusps dizisini ([1..12] indeksli sayı dizisi)
 * UI'ın beklediği obje dizisine çevirir.
 *
 * @param {number[]} rawCusps - swe.houses().cusps (index 1-12 kullanılır)
 * @returns {Array<{house, longitude, signIndex, degreeInSign}>}
 */
export function buildHouseCusps(rawCusps) {
  const cusps = [];
  for (let i = 1; i <= 12; i++) {
    const lon = normalizeDegree(rawCusps[i]);
    cusps.push({
      house: i,
      longitude: lon,
      signIndex: Math.floor(lon / 30),
      degreeInSign: lon % 30,
    });
  }
  return cusps;
}

/**
 * buildHouseCusps()'ın tersi: obje dizisini findHouseOfPlanet()'in beklediği
 * [1..12] indeksli sayı dizisine çevirir.
 *
 * Harita objeleri cusp'ları obje olarak taşır, ama findHouseOfPlanet ham dizi
 * ister — bu köprü olmadan her yeni harita tipi aynı dönüşümü elle yazmak
 * zorunda kalıyor.
 *
 * @param {Array<{house, longitude}>} houseCusps
 * @returns {number[]} index 0 kullanılmaz
 */
export function cuspsToArray(houseCusps) {
  const raw = [0];
  for (let i = 1; i <= 12; i++) {
    const cusp = houseCusps.find(c => c.house === i);
    raw[i] = cusp ? cusp.longitude : 0;
  }
  return raw;
}

/**
 * Gezegenlere ev / burç / burçtaki derece bilgisini ekler.
 *
 * @param {Array} planets
 * @param {number[]} rawCusps - [1..12] indeksli ham cusp dizisi
 */
export function placePlanetsInHouses(planets, rawCusps) {
  return planets.map(planet => ({
    ...planet,
    house: findHouseOfPlanet(planet.longitude, rawCusps),
    signIndex: Math.floor(normalizeDegree(planet.longitude) / 30),
    degreeInSign: normalizeDegree(planet.longitude) % 30,
  }));
}

/**
 * Şans Noktası (Part of Fortune).
 *   Gündüz: ASC + Ay - Güneş
 *   Gece:   ASC + Güneş - Ay
 *
 * Gündüz/gece testi zodyak yarıküresine bakar: ASC'den itibaren zodyak yönünde
 * 1-6. evler ufkun ALTINDA, 7-12. evler ÜSTÜNDEdir. Dolayısıyla Güneş ASC'den
 * 180°'den fazla ilerideyse (7-12. evler) ufkun üstündedir → gündüz.
 * (SolarFire'ın varsayılanı da bu zodyak testidir, gerçek yükseklik değil.)
 *
 * @param {number} ascendant
 * @param {Object} sun
 * @param {Object} moon
 * @returns {Object|null}
 */
export function calcPartOfFortune(ascendant, sun, moon) {
  if (!sun || !moon) return null;

  const sunDist = normalizeDegree(sun.longitude - ascendant);
  const isDaytime = sunDist > 180;

  const fortuneLon = normalizeDegree(
    isDaytime
      ? ascendant + moon.longitude - sun.longitude
      : ascendant + sun.longitude - moon.longitude,
  );

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
