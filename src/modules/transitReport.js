/**
 * AstroFire - Dinamik Transit Raporu
 *
 * SolarFire "Dynamic Report" karşılığı: verilen dönem boyunca transit
 * gezegenlerin natal noktalara (gezegenler + ASC/MC + Şans Noktası) yaptığı
 * majör aspektlerin KESİN anlarını bulur ve kronolojik listeler.
 *
 * Yöntem: her transit gezegen için dönem örneklenir (Ay 2.4 saatte bir,
 * diğerleri günde bir), her (natal nokta × aspekt açısı) hedef boylamı için
 * işaret değişimi aranır, bulunan aralık bisection ile ~30 saniyeye inceltilir.
 * Retro gezegenler aynı aspekti 3 kez (ileri-geri-ileri) yapabilir — örnekleme
 * her geçişi ayrı yakalar.
 */

import { MAJOR_ASPECTS } from './constants.js';
import { initEphemeris, calculatePlanetPosition, calculateJulianDay } from './ephemeris.js';
import { jdToLocal } from './chartUtils.js';

/** Açıyı ±180 aralığına katlar. */
function wrap180(deg) {
  let d = deg % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

/**
 * Aspekt açısının hedef boylamları.
 * 0° → natal boylamın kendisi; 180° → karşısı; 60/90/120 → her iki yön.
 */
function aspectTargets(natalLon, angle) {
  if (angle === 0) return [natalLon];
  if (angle === 180) return [natalLon + 180];
  return [natalLon + angle, natalLon - angle];
}

/**
 * Transit gezegenin L boylamını KESİN geçtiği anı bisection ile bulur.
 * [jd1, jd2] aralığında wrap180(lon - L) işaret değiştiriyor olmalı.
 */
function refineCrossing(planetId, L, jd1, jd2, f1) {
  let lo = jd1, hi = jd2, flo = f1;
  // 1/2880 gün = 30 saniye hassasiyet
  for (let i = 0; i < 48 && (hi - lo) > 1 / 2880; i++) {
    const mid = (lo + hi) / 2;
    const fm = wrap180(calculatePlanetPosition(mid, planetId).longitude - L);
    if ((flo < 0) === (fm < 0)) { lo = mid; flo = fm; } else { hi = mid; }
  }
  return (lo + hi) / 2;
}

/**
 * Dinamik transit raporu hesaplar.
 *
 * @param {Object} natalChart - calculateNatalChart() sonucu
 * @param {Object} options
 *   - start: { year, month, day } (dönem başlangıcı, 00:00 UTC'den)
 *   - days: dönem uzunluğu (gün)
 *   - transitPlanets: rapora girecek transit gezegenler [{id,name,symbol}, ...]
 *   - timezone: sonuç tarihlerinin gösterileceği IANA timezone
 * @returns {Promise<Array>} jd sırasına dizili olay kayıtları
 */
export async function calculateTransitReport(natalChart, options) {
  await initEphemeris();

  const { start, days, transitPlanets, timezone } = options;
  const startJD = calculateJulianDay(start.year, start.month, start.day, 0);
  const endJD = startJD + days;

  // Natal hedefler: gezegenler + ASC/MC + Şans Noktası
  const targets = natalChart.planets.map(p => ({ id: p.id, name: p.name, symbol: p.symbol, longitude: p.longitude }));
  const h = natalChart.houses;
  // symbol boş: tabloda "Mc MC" gibi ikileme olmasın, yalnız isim görünsün
  if (h?.ascendant != null) targets.push({ id: -101, name: 'ASC', symbol: '', longitude: h.ascendant });
  if (h?.mc != null) targets.push({ id: -102, name: 'MC', symbol: '', longitude: h.mc });
  if (natalChart.partOfFortune) {
    targets.push({ id: -99, name: natalChart.partOfFortune.name, symbol: natalChart.partOfFortune.symbol, longitude: natalChart.partOfFortune.longitude });
  }

  const events = [];

  for (const tp of transitPlanets) {
    // Ay hızlı (13°/gün) → 2.4 saatlik adım; diğerleri (Merkür maks ~2.2°/gün) günlük
    const step = tp.id === 1 ? 0.1 : 1;

    // Dönemi bir kez örnekle; tüm hedefler aynı örnekleri kullanır
    const samples = [];
    for (let jd = startJD; jd <= endJD + step; jd += step) {
      samples.push({ jd, lon: calculatePlanetPosition(jd, tp.id).longitude });
    }

    for (const nt of targets) {
      // Gezegenin kendi natal pozisyonuna kavuşumu (return) anlamlı; ama aynı
      // İSİMLİ noktanın 0° hedefinde "transit KAD kavuşum natal KAD" gibi
      // yavaş/gürültülü kayıtlar da doğal olarak çıkar — filtrelemiyoruz,
      // seçim kullanıcının gezegen filtresinde.
      for (const asp of MAJOR_ASPECTS) {
        for (const L of aspectTargets(nt.longitude, asp.angle)) {
          for (let i = 0; i < samples.length - 1; i++) {
            const f1 = wrap180(samples[i].lon - L);
            const f2 = wrap180(samples[i + 1].lon - L);
            // Gerçek sıfır geçişi: işaret değişimi VE ±180 sarması değil
            if ((f1 < 0) !== (f2 < 0) && Math.abs(f1 - f2) < 180) {
              const jd = refineCrossing(tp.id, L, samples[i].jd, samples[i + 1].jd, f1);
              if (jd < startJD || jd > endJD) continue;
              const pos = calculatePlanetPosition(jd, tp.id);
              events.push({
                jd,
                local: jdToLocal(jd, timezone),
                transit: { id: tp.id, name: tp.name, symbol: tp.symbol },
                natal: { id: nt.id, name: nt.name, symbol: nt.symbol },
                aspect: { name: asp.name, symbol: asp.symbol, angle: asp.angle },
                retrograde: pos.speed < 0,
              });
            }
          }
        }
      }
    }
  }

  events.sort((a, b) => a.jd - b.jd);
  return events;
}
