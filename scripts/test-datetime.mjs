/**
 * localToUTC doğruluk testi — özellikle DST sınırları.
 *
 * Değişmez: localToUTC(yerel) → UTC anı. O anı tekrar o timezone'da okuduğunda
 * girdiğin duvar saatini geri almalısın. Eski kod DST geçişlerine yakın
 * doğumlarda bu değişmezi ihlal ediyor, sonucu tam 1 saat kaydırıyordu.
 */

import { localToUTC } from '../src/modules/datetime.js';

let failed = 0;

/** Beklenen UTC ile karşılaştır. */
function check(label, local, tz, expected) {
  const utc = localToUTC(local.y, local.mo, local.d, local.h, local.mi, tz);
  const got = `${utc.year}-${String(utc.month).padStart(2, '0')}-${String(utc.day).padStart(2, '0')} ${String(utc.hour).padStart(2, '0')}:${String(utc.minute).padStart(2, '0')} (offset ${utc.utcOffsetMinutes})`;
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  console.log(`      → ${got}`);
  if (!ok) console.log(`      beklenen: ${expected}`);
}

/** Round-trip: UTC'yi tekrar yerel okuyunca aynı duvar saati mi? */
function roundTrip(label, local, tz) {
  const utc = localToUTC(local.y, local.mo, local.d, local.h, local.mi, tz);
  const instant = Date.UTC(utc.year, utc.month - 1, utc.day, utc.hour, utc.minute, 0);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(instant));
  const get = (t) => parseInt(parts.find(p => p.type === t).value, 10);
  let h = get('hour');
  if (h === 24) h = 0;

  const ok = get('year') === local.y && get('month') === local.mo
    && get('day') === local.d && h === local.h && get('minute') === local.mi;

  if (!ok) failed++;
  console.log(`  ${ok ? '✓' : '✗'} ${label}`);
  console.log(`      girdi:  ${local.y}-${local.mo}-${local.d} ${local.h}:${String(local.mi).padStart(2, '0')} yerel`);
  console.log(`      geri:   ${get('year')}-${get('month')}-${get('day')} ${h}:${String(get('minute')).padStart(2, '0')} yerel`);
}

console.log('\n=== BUG H: İstanbul DST sınırı (25 Mart 1990, 01:00\'de +02 → +03) ===');
// 00:30 yerel, DST henüz başlamamış → offset +02 → UTC 24 Mart 22:30
check('25 Mart 1990 00:30 İstanbul (geçişten 30dk önce)',
  { y: 1990, mo: 3, d: 25, h: 0, mi: 30 }, 'Europe/Istanbul',
  '1990-03-24 22:30 (offset 120)');

// 02:30 yerel, DST başlamış → offset +03 → UTC 25 Mart 23:30... hayır: 02:30 - 3h = 23:30 önceki gün
check('25 Mart 1990 03:30 İstanbul (geçişten sonra)',
  { y: 1990, mo: 3, d: 25, h: 3, mi: 30 }, 'Europe/Istanbul',
  '1990-03-25 00:30 (offset 180)');

console.log('\n=== Round-trip değişmezi (normal tarihler) ===');
roundTrip('6 Ekim 1994 05:21 İstanbul', { y: 1994, mo: 10, d: 6, h: 5, mi: 21 }, 'Europe/Istanbul');
roundTrip('15 Ocak 2000 12:00 İstanbul', { y: 2000, mo: 1, d: 15, h: 12, mi: 0 }, 'Europe/Istanbul');
roundTrip('30 Haz 2001 23:55 New York', { y: 2001, mo: 6, d: 30, h: 23, mi: 55 }, 'America/New_York');
roundTrip('12 Kas 1985 18:45 Sydney', { y: 1985, mo: 11, d: 12, h: 18, mi: 45 }, 'Australia/Sydney');

console.log('\n=== Round-trip — DST geçişlerinin hemen etrafı ===');
// ABD 2001: DST 1 Nisan 02:00'de başladı
roundTrip('1 Nis 2001 01:30 New York (geçişten önce)', { y: 2001, mo: 4, d: 1, h: 1, mi: 30 }, 'America/New_York');
roundTrip('1 Nis 2001 03:30 New York (geçişten sonra)', { y: 2001, mo: 4, d: 1, h: 3, mi: 30 }, 'America/New_York');
// Türkiye 2016'da kalıcı +03'e geçti
roundTrip('8 Eyl 2016 14:00 İstanbul (kalıcı +03 sonrası)', { y: 2016, mo: 9, d: 8, h: 14, mi: 0 }, 'Europe/Istanbul');
// Güney yarımküre DST (Sydney, Ekim başı)
roundTrip('27 Eki 1985 01:30 Sydney', { y: 1985, mo: 10, d: 27, h: 1, mi: 30 }, 'Australia/Sydney');

console.log('\n' + '='.repeat(50));
if (failed) {
  console.log(`\n✗ ${failed} test BAŞARISIZ`);
  process.exit(1);
}
console.log('\n✓ Tüm tarih/DST testleri geçti');
