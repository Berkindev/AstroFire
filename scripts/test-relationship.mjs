/**
 * İlişki haritaları doğruluk testi: Sinastri / Kompozit / Davison.
 *
 * Kompozitteki asıl risk EV CUSPLARIdır. Kısa-yay orta noktaları tek başına
 * alındığında evler zodyak sırasını bozabilir; SolarFire bunu uzun-yay
 * düzeltmesiyle çözer. Burada o değişmezleri test ediyoruz:
 *   1. Cusplar zodyak yönünde SIRALI olmalı (her adım 0-180° ileri).
 *   2. Karşıt cusplar tam 180° arayada olmalı (cusp7 = cusp1 + 180).
 *   3. 12 adımın toplamı tam 360° olmalı.
 *   4. Üç anchor modu da geçerli harita üretmeli.
 */

import { calculateNatalChart } from '../src/modules/natal.js';
import {
  calculateSynastry,
  calculateComposite,
  calculateDavison,
  COMPOSITE_ANCHORS,
} from '../src/modules/synastry.js';
import { normalizeDegree } from '../src/modules/ephemeris.js';
import { angularSeparation } from '../src/modules/chartUtils.js';

let failed = 0;
const check = (ok, msg) => {
  if (!ok) failed++;
  console.log(`  ${ok ? '✓' : '✗'} ${msg}`);
};

const PERSON_A = {
  year: 1994, month: 10, day: 6, hour: 5, minute: 21,
  timezone: 'Europe/Istanbul', latitude: 41.0082, longitude: 28.9784,
};
const PERSON_B = {
  year: 1998, month: 3, day: 21, hour: 9, minute: 5,
  timezone: 'Europe/Istanbul', latitude: 39.9334, longitude: 32.8597,
};
// Karşıt-ASC senaryosu — uzun-yay düzeltmesinin devreye girdiği zor vaka
const PERSON_C = {
  year: 1985, month: 11, day: 12, hour: 18, minute: 45,
  timezone: 'Australia/Sydney', latitude: -33.8688, longitude: 151.2093,
};
// Antimeridyen testi için
const PERSON_D = {
  year: 1990, month: 6, day: 15, hour: 10, minute: 0,
  timezone: 'Pacific/Honolulu', latitude: 21.3069, longitude: -157.8583,
};

const chartA = await calculateNatalChart(PERSON_A);
const chartB = await calculateNatalChart(PERSON_B);
const chartC = await calculateNatalChart(PERSON_C);
const chartD = await calculateNatalChart(PERSON_D);

/** Kompozit ev cusplarının değişmezlerini doğrula. */
function validateCusps(label, composite) {
  const cusps = composite.houses.cusps;
  const lon = (h) => cusps.find(c => c.house === h).longitude;

  // 1. Zodyak sırası: her adım 0-180° ileri
  let orderOK = true;
  let total = 0;
  for (let h = 1; h <= 12; h++) {
    const next = (h % 12) + 1;
    const step = normalizeDegree(lon(next) - lon(h));
    total += step;
    if (!(step > 0 && step < 180)) {
      orderOK = false;
      console.log(`      ev ${h}→${next}: ${step.toFixed(2)}° (0-180 dışında!)`);
    }
  }
  check(orderOK, `${label}: cusplar zodyak sırasında`);

  // 3. Toplam tam bir tur
  check(Math.abs(total - 360) < 0.001, `${label}: 12 adım toplamı 360° (${total.toFixed(4)}°)`);

  // 2. Karşıt cusplar 180° arayada
  let oppOK = true;
  for (let h = 1; h <= 6; h++) {
    const sep = angularSeparation(lon(h), lon(h + 6));
    if (Math.abs(sep - 180) > 0.001) {
      oppOK = false;
      console.log(`      ev ${h} ↔ ${h + 6}: ${sep.toFixed(4)}° (180 değil!)`);
    }
  }
  check(oppOK, `${label}: karşıt cusplar tam 180°`);

  // ASC = cusp1, MC = cusp10
  check(Math.abs(composite.houses.ascendant - lon(1)) < 1e-9, `${label}: ASC = 1. cusp`);
  check(Math.abs(composite.houses.mc - lon(10)) < 1e-9, `${label}: MC = 10. cusp`);
}

console.log('\n═══ KOMPOZİT — ev cuspu değişmezleri ═══\n');

for (const { key, name } of COMPOSITE_ANCHORS) {
  console.log(`── anchor: ${key} (${name})`);
  validateCusps(`A×B/${key}`, calculateComposite(chartA, chartB, { anchor: key }));
  validateCusps(`A×C/${key}`, calculateComposite(chartA, chartC, { anchor: key }));
  validateCusps(`C×D/${key}`, calculateComposite(chartC, chartD, { anchor: key }));
  console.log('');
}

console.log('═══ KOMPOZİT — gezegen orta noktaları ═══\n');
{
  const comp = calculateComposite(chartA, chartB);
  const sunA = chartA.planets.find(p => p.id === 0).longitude;
  const sunB = chartB.planets.find(p => p.id === 0).longitude;
  const sunC = comp.planets.find(p => p.id === 0).longitude;

  // Kompozit Güneş, iki Güneş'e EŞİT uzaklıkta olmalı
  const dA = angularSeparation(sunC, sunA);
  const dB = angularSeparation(sunC, sunB);
  check(Math.abs(dA - dB) < 1e-6, `Kompozit Güneş iki Güneş'e eşit uzaklıkta (${dA.toFixed(4)}° / ${dB.toFixed(4)}°)`);
  console.log(`      A: ${sunA.toFixed(2)}°  B: ${sunB.toFixed(2)}°  →  kompozit: ${sunC.toFixed(2)}°`);

  // KAD ve GAD karşıt kalmalı
  const nn = comp.planets.find(p => p.id === 10).longitude;
  const sn = comp.planets.find(p => p.id === -1).longitude;
  check(Math.abs(angularSeparation(nn, sn) - 180) < 1e-6, 'Kompozit KAD ↔ GAD tam 180°');

  check(comp.anchorUsed === 'asc' || comp.anchorUsed === 'mc', `auto → fiilen "${comp.anchorUsed}" seçildi`);
}

console.log('\n═══ DAVISON ═══\n');
{
  const dav = await calculateDavison(chartA, chartB);

  // Zaman: iki JD'nin tam ortası
  const expectedJD = (chartA.julianDay + chartB.julianDay) / 2;
  check(Math.abs(dav.julianDay - expectedJD) < 1e-9, 'Zaman = iki doğumun JD ortalaması');
  console.log(`      Davison anı: ${dav.utc.year}-${String(dav.utc.month).padStart(2, '0')}-${String(dav.utc.day).padStart(2, '0')} ${String(dav.utc.hour).padStart(2, '0')}:${String(dav.utc.minute).padStart(2, '0')} UTC`);

  // İki doğum arasında olmalı
  const between = dav.julianDay > Math.min(chartA.julianDay, chartB.julianDay)
    && dav.julianDay < Math.max(chartA.julianDay, chartB.julianDay);
  check(between, 'Davison anı iki doğum arasında');

  // Yer: enlem ortalaması
  const expectedLat = (PERSON_A.latitude + PERSON_B.latitude) / 2;
  check(Math.abs(dav.location.latitude - expectedLat) < 1e-9, `Enlem ortalaması (${dav.location.latitude.toFixed(4)}°)`);
  console.log(`      Konum: ${dav.location.latitude.toFixed(4)}°, ${dav.location.longitude.toFixed(4)}°`);

  // GERÇEK harita olmalı: evler, aspektler, PoF dolu
  check(dav.houses.cusps.length === 12, 'Davison 12 ev cuspu üretti');
  check(dav.aspects.length > 0, `Davison aspektleri hesaplandı (${dav.aspects.length})`);
  check(!!dav.partOfFortune, 'Davison Şans Noktası hesaplandı');
}

console.log('\n─ Antimeridyen (İstanbul 29°D × Honolulu 158°B) ─');
{
  const dav = await calculateDavison(chartA, chartD);
  const lon = dav.location.longitude;
  // Kısa yay: 29°D'den batıya 158°B'ye → orta nokta ~ -64°B civarı DEĞİL,
  // kısa yol 29 → -157.86 farkı -186.8 → +173.2 (doğuya) → orta ~115.6°D
  console.log(`      orta boylam: ${lon.toFixed(2)}°  (basit ortalama olsaydı: ${((28.9784 + -157.8583) / 2).toFixed(2)}°)`);
  check(lon >= -180 && lon <= 180, 'Boylam geçerli aralıkta (-180..180)');
  check(Math.abs(lon - (28.9784 + -157.8583) / 2) > 1, 'Basit ortalamadan farklı — kısa yay kullanıldı');
}

console.log('\n═══ SİNASTRİ ═══\n');
{
  const syn = calculateSynastry(chartA, chartB);

  check(syn.crossAspects.length > 0, `Çapraz aspektler bulundu (${syn.crossAspects.length})`);

  // drawBiWheel sözleşmesi
  check(!!syn.transitNatalAspects, 'transitNatalAspects alias mevcut (drawBiWheel için)');
  check(syn.planets === chartB.planets, 'Dış halka = Kişi B gezegenleri');
  check(!!syn.houses?.cusps, 'Dış halka ev cuspları mevcut (dış çerçeve çizilebilir)');

  const first = syn.crossAspects[0];
  check(!!first.transitPlanet && !!first.natalPlanet, 'Aspekt alan adları drawBiWheel ile uyumlu');

  // Ev yerleşimleri
  const allHoused = syn.bPlanetsInAHouses.every(p => p.house >= 1 && p.house <= 12);
  check(allHoused, "Kişi B'nin tüm gezegenleri A'nın evlerine yerleşti");
  check(syn.aPlanetsInBHouses.every(p => p.house >= 1 && p.house <= 12), "Kişi A'nın tüm gezegenleri B'nin evlerine yerleşti");

  const sunB = syn.bPlanetsInAHouses.find(p => p.id === 0);
  console.log(`      B'nin Güneşi → A'nın ${sunB.house}. evinde`);
}

console.log('\n' + '='.repeat(52));
if (failed) {
  console.log(`\n✗ ${failed} test BAŞARISIZ`);
  process.exit(1);
}
console.log('\n✓ Tüm ilişki haritası testleri geçti');
