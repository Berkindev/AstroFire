/**
 * isApplying doğruluk testi.
 *
 * Applying/separating FİZİKSEL bir özelliktir: iki gezegen birbirine yaklaşıyor
 * mu? Cevap, gezegenlerin bir dizide hangi sırada durduğuna BAĞLI OLAMAZ.
 * Eski kod bu değişmezi ihlal ediyordu.
 */

import { isApplying } from '../src/modules/aspects.js';

let failed = 0;

function check(label, actual, expected) {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}: ${actual ? 'applying' : 'separating'} (beklenen: ${expected ? 'applying' : 'separating'})`);
}

/** Aynı fizik, ters sıra → aynı cevap gelmeli. */
function checkSymmetry(label, p1, p2, angle) {
  const forward = isApplying(p1, p2, angle);
  const reverse = isApplying(p2, p1, angle);
  const ok = forward === reverse;
  if (!ok) failed++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}: sıra bağımsız (${forward} / ${reverse})`);
  return forward;
}

console.log('\n=== Ay Güneş\'e yaklaşıyor (kavuşum) ===');
// Ay 0°, 13°/gün — Güneş 5°, 1°/gün. Ay hızlı, Güneş'i yakalıyor → APPLYING
{
  const moon = { longitude: 0, speed: 13, name: 'Ay' };
  const sun = { longitude: 5, speed: 1, name: 'Güneş' };
  const result = checkSymmetry('Ay(0°,13°/g) ☌ Güneş(5°,1°/g)', moon, sun, 0);
  check('  → yaklaşıyor mu', result, true);
}

console.log('\n=== Ay Güneş\'ten uzaklaşıyor (kavuşum) ===');
// Ay 5°, Güneş 0° — Ay ileride ve daha hızlı → açılıyor → SEPARATING
{
  const moon = { longitude: 5, speed: 13, name: 'Ay' };
  const sun = { longitude: 0, speed: 1, name: 'Güneş' };
  const result = checkSymmetry('Ay(5°,13°/g) ☌ Güneş(0°,1°/g)', moon, sun, 0);
  check('  → uzaklaşıyor mu', result, false);
}

console.log('\n=== 0°/360° sınırını aşan kavuşum ===');
// Ay 358°, Güneş 2° — Ay hızlı, sınırı geçip Güneş'e yaklaşıyor → APPLYING
{
  const moon = { longitude: 358, speed: 13, name: 'Ay' };
  const sun = { longitude: 2, speed: 1, name: 'Güneş' };
  const result = checkSymmetry('Ay(358°) ☌ Güneş(2°)', moon, sun, 0);
  check('  → yaklaşıyor mu', result, true);
}

console.log('\n=== Kare (90°) — ayrım 85°, açılarak 90°ye gidiyor ===');
// Mars 0° (0.5°/g), Satürn 85° (0.1°/g). Ayrım 85°, artıyor (Satürn kaçıyor? hayır:
// sep = satürn - mars = 85, d(sep)/dt = 0.1 - 0.5 = -0.4 → kapanıyor → 90'dan uzaklaşıyor
// yani SEPARATING (85 < 90, kapanıyor → aspektten uzaklaşıyor)
{
  const mars = { longitude: 0, speed: 0.5, name: 'Mars' };
  const saturn = { longitude: 85, speed: 0.1, name: 'Satürn' };
  const result = checkSymmetry('Mars(0°,0.5°/g) □ Satürn(85°,0.1°/g)', mars, saturn, 90);
  // ayrım 85 < 90 ve kapanıyor (-0.4°/g) → 90'a değil 0'a gidiyor → SEPARATING
  check('  → uzaklaşıyor mu', result, false);
}

console.log('\n=== Kare (90°) — ayrım 85°, açılarak 90°ye gidiyor ===');
// Mars 0° (0.1°/g), Satürn 85° (0.5°/g) → sep artıyor → 90'a yaklaşıyor → APPLYING
{
  const mars = { longitude: 0, speed: 0.1, name: 'Mars' };
  const saturn = { longitude: 85, speed: 0.5, name: 'Satürn' };
  const result = checkSymmetry('Mars(0°,0.1°/g) □ Satürn(85°,0.5°/g)', mars, saturn, 90);
  check('  → yaklaşıyor mu', result, true);
}

console.log('\n=== Çapraz harita (transit×natal): natal sabit ===');
// Transit Satürn 88°, 0.03°/g ileri. Natal Mars 0°. Ayrım 88 → 90'a doğru artıyor → APPLYING
{
  const trSaturn = { longitude: 88, speed: 0.03, name: 'Satürn' };
  const natalMars = { longitude: 0, speed: 99, name: 'Mars' }; // natal hızı YOK SAYILMALI
  const result = isApplying(trSaturn, natalMars, 90, true);
  check('t♄(88°, +0.03°/g) □ n♂(0°) — natal hızı yok sayılır', result, true);
}

console.log('\n' + '='.repeat(50));
if (failed) {
  console.log(`\n✗ ${failed} test BAŞARISIZ`);
  process.exit(1);
}
console.log('\n✓ Tüm applying/separating testleri geçti');
