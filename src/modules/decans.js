/**
 * AstroFire - Ev Dekan Sistemi (AstroHarmony Ekolü)
 * Her ev Placidus genişliğine göre 3 eşit parçaya bölünür.
 * Dekan burçları element döngüsüyle belirlenir.
 */

import { SIGNS } from './constants.js';
import { normalizeDegree } from './ephemeris.js';

// ============================================
// AstroHarmony Ekolü - Burç Yöneticileri
// Başak→Chiron, Akrep→Plüton, Kova→Uranüs, Balık→Neptün
// ============================================
export const SIGN_RULERS = {
  0:  { name: 'Mars',    symbol: '♂' },   // Koç
  1:  { name: 'Venüs',   symbol: '♀' },   // Boğa
  2:  { name: 'Merkür',  symbol: '☿' },   // İkizler
  3:  { name: 'Ay',      symbol: '☽' },   // Yengeç
  4:  { name: 'Güneş',   symbol: '☉' },   // Aslan
  5:  { name: 'Chiron',  symbol: '⚷' },   // Başak (AstroHarmony)
  6:  { name: 'Venüs',   symbol: '♀' },   // Terazi
  7:  { name: 'Plüton',  symbol: '♇' },   // Akrep (modern)
  8:  { name: 'Jüpiter', symbol: '♃' },   // Yay
  9:  { name: 'Satürn',  symbol: '♄' },   // Oğlak
  10: { name: 'Uranüs',  symbol: '♅' },   // Kova (modern)
  11: { name: 'Neptün',  symbol: '♆' },   // Balık (modern)
};

// ============================================
// Element Döngüleri (burç indeksleri)
// ============================================
export const ELEMENT_CYCLES = {
  fire:  [0, 4, 8],   // Koç, Aslan, Yay
  earth: [1, 5, 9],   // Boğa, Başak, Oğlak
  air:   [2, 6, 10],  // İkizler, Terazi, Kova
  water: [3, 7, 11],  // Yengeç, Akrep, Balık
};

// ============================================
// 12 Ev × 3 Dekan Hayat Konuları
// ============================================
export const HOUSE_DECAN_TOPICS = {
  1:  ['Fiziksel yapı, görünüş', 'Kişilik, karakter', 'Genel sağlık, mesleki yatkınlık'],
  2:  ['Kişisel gelir, kazanç', 'Maddi güvenlik, birikimler', 'Değerler, yetenekler'],
  3:  ['Kardeşler, yakın çevre', 'Kısa yolculuklar, ulaşım', 'İletişim, öğrenme'],
  4:  ['Aile kökeni, baba', 'Ev, gayrimenkul', 'Duygusal güvenlik, son yıllar'],
  5:  ['Aşk, romantizm', 'Çocuklar, yaratıcılık', 'Eğlence, spekülasyon'],
  6:  ['Günlük iş, rutinler', 'Sağlık, beslenme', 'Hizmet, evcil hayvanlar'],
  7:  ['Evlilik, eş', 'İş ortaklıkları', 'Açık düşmanlar, davalar'],
  8:  ['Ortak finans, miras', 'Dönüşüm, krizler', 'Cinsellik, gizli konular'],
  9:  ['Yüksek eğitim, felsefe', 'Uzun yolculuklar, yurtdışı', 'Hukuk, yayıncılık'],
  10: ['Kariyer, toplumsal statü', 'Otorite, anne', 'Başarı, tanınma'],
  11: ['Arkadaşlar, sosyal çevre', 'Umutlar, hedefler', 'Gruplar, topluluklar'],
  12: ['Bilinçaltı, gizli düşmanlar', 'İzolasyon, hastaneler', 'Ruhsal gelişim, fedakarlık'],
};

/**
 * Bir ekliptik boylamın dekan burcunu ve yöneticisini döndürür
 * Element döngüsüne göre: aynı elementin sıradaki burcu
 */
export function getDecanSign(longitude) {
  const lon = normalizeDegree(longitude);
  const signIndex = Math.floor(lon / 30);
  const band = Math.floor((lon % 30) / 10); // 0, 1, 2

  const sign = SIGNS[signIndex];
  const element = sign.element;
  const cycle = ELEMENT_CYCLES[element];

  // Burcun döngü içindeki pozisyonunu bul
  const posInCycle = cycle.indexOf(signIndex);
  // Band kadar ilerle (döngüsel)
  const decanSignIndex = cycle[(posInCycle + band) % 3];
  const decanSign = SIGNS[decanSignIndex];
  const ruler = SIGN_RULERS[decanSignIndex];

  return {
    signIndex: decanSignIndex,
    sign: decanSign,
    ruler,
    band,
  };
}

/**
 * 12 evin dekan hesabı
 * @param {Object} houses - chart.houses objesi (cusps dizisi, her biri {house, longitude, signIndex})
 * @param {Array} planets - chart.planets dizisi (her biri {name, symbol, longitude, house, ...})
 * @returns {Array} 12 ev dekan verisi
 */
export function calculateHouseDecans(houses, planets) {
  const cusps = houses.cusps; // [{house, longitude, signIndex, ...}, ...]
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

    const decanSize = span / 3;
    const houseSign = SIGNS[thisCusp.signIndex];
    const decans = [];

    for (let d = 0; d < 3; d++) {
      const startLon = normalizeDegree(cuspLon + d * decanSize);
      const endLon = normalizeDegree(cuspLon + (d + 1) * decanSize);
      const decanInfo = getDecanSign(startLon);
      const topic = HOUSE_DECAN_TOPICS[houseNum][d];

      // Bu dekana düşen gezegenleri bul ve dereceye göre sırala
      const decanPlanets = planets.filter(p => {
        if (p.house !== houseNum) return false;
        const pLon = normalizeDegree(p.longitude);
        let offset = pLon - cuspLon;
        if (offset < 0) offset += 360;
        if (offset >= span) return false;
        return offset >= d * decanSize && offset < (d + 1) * decanSize;
      }).sort((a, b) => {
        let offA = normalizeDegree(a.longitude) - cuspLon;
        if (offA < 0) offA += 360;
        let offB = normalizeDegree(b.longitude) - cuspLon;
        if (offB < 0) offB += 360;
        return offA - offB;
      });

      decans.push({
        index: d,
        startLongitude: startLon,
        endLongitude: endLon,
        decanSign: decanInfo.sign,
        ruler: decanInfo.ruler,
        topic,
        planets: decanPlanets,
      });
    }

    result.push({
      house: houseNum,
      cuspLongitude: cuspLon,
      houseSign,
      span,
      decans,
    });
  }

  return result;
}
