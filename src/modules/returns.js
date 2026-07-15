/**
 * AstroFire - Dönüş (Return) Anı Çözücü
 *
 * Bir gök cisminin verilen ekliptik boylama geldiği tam anı bulur.
 * Solar Return, Lunar Return ve SR ev geçişleri hep bunu kullanır — daha önce
 * aynı Newton-Raphson döngüsü 4 kez, her biri farklı (ya da eksik) guard'larla
 * kopyalanmıştı.
 */

import { calculatePlanetPosition } from './ephemeris.js';
import { angularSeparation } from './chartUtils.js';

/**
 * Yakınsama eşiği — ZAMAN cinsinden, derece cinsinden değil.
 *
 * Neden: eşiği derecede tanımlamak cisimden cisme anlamını değiştirir ve
 * daha kötüsü, kayan nokta duvarına toslayabilir. Julian Day ~2.45e6
 * büyüklüğünde bir double olduğu için ardışık temsil edilebilir değerler
 * arasındaki mesafe ~5e-10 gün (~47 mikrosaniye). Ay 13.2°/gün hızla
 * gittiğinden bu, boylamda ~7e-9°'lik bir taban gürültü demektir; 1e-9°'lik
 * bir eşik ASLA sağlanamaz ve Newton salınarak iterasyonu tüketir.
 *
 * 1e-7 gün ≈ 8.6 milisaniye: JD çözünürlüğünün ~200 katı üstünde (güvenle
 * ulaşılabilir), gösterim hassasiyetinin (saniye) ise çok altında.
 */
const TOLERANCE_DAYS = 1e-7;
const MAX_ITER = 50;

/**
 * Cismin `targetLon` boylamına geldiği, `seedJD`'ye EN YAKIN anı bulur.
 *
 * Newton-Raphson: Δt = Δlon / hız. Tohum ne kadar iyiyse o kadar hızlı yakınsar
 * ve yanlış döngüye kaçma riski o kadar azalır — çağıranın makul bir tohum
 * vermesi beklenir (ör. SR için o yılın doğum günü).
 *
 * @param {number} bodyId - Swiss Ephemeris gezegen ID'si
 * @param {number} targetLon - Hedef ekliptik boylam (0-360)
 * @param {number} seedJD - Başlangıç tahmini (Julian Day)
 * @param {string} [label='Dönüş'] - Hata mesajı için
 * @returns {number} Julian Day
 * @throws {Error} Yakınsamazsa — sessizce yanlış sonuç dönmez.
 */
export function findBodyAtLongitude(bodyId, targetLon, seedJD, label = 'Dönüş') {
  let jd = seedJD;

  for (let i = 0; i < MAX_ITER; i++) {
    const pos = calculatePlanetPosition(jd, bodyId);

    if (!pos.speed) {
      throw new Error(`${label} çözülemedi: gezegen hızı sıfır (JD ${jd.toFixed(4)}).`);
    }

    // Hedefe kalan açı, -180..+180 aralığında (kısa yol)
    let diff = targetLon - pos.longitude;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const correction = diff / pos.speed; // gün
    jd += correction;

    if (Math.abs(correction) < TOLERANCE_DAYS) return jd;
  }

  // Yakınsamadıysa SESSİZCE dönme — eski kod bazı yollarda bunu yapıyordu.
  const finalPos = calculatePlanetPosition(jd, bodyId);
  const finalDiff = angularSeparation(finalPos.longitude, targetLon);
  throw new Error(`${label} yakınsamadı. Kalan fark: ${finalDiff.toFixed(6)}°`);
}
