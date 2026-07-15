/**
 * Golden snapshot üreteci.
 *
 * Refactor'ün davranışı bozmadığını kanıtlamak için tüm hesaplama modüllerinin
 * çıktısını sabit bir girdi seti üzerinde deterministik JSON'a döker.
 *
 *   node scripts/snapshot.mjs snapshots/before.json
 *   node scripts/snapshot.mjs snapshots/after.json
 *   node scripts/diff.mjs snapshots/before.json snapshots/after.json
 *
 * Float'lar 6 ondalığa yuvarlanır — anlamsız son-bit gürültüsünü eler,
 * ama gerçek astrolojik farkı (0.000001° ≈ 0.004 yay saniyesi) yakalar.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import { calculateNatalChart } from '../src/modules/natal.js';
import { calculateSolarReturn, calculateSRHouseTiming } from '../src/modules/solar.js';
import { calculateLunarReturn } from '../src/modules/lunar.js';
import { calculateTransits } from '../src/modules/transit.js';
import { calculateSecondaryProgression, ANGLE_METHODS } from '../src/modules/progression.js';
import { localToUTC } from '../src/modules/datetime.js';
import { calculateSevenYearCycles } from '../src/modules/sevens.js';
import { calculateHouseDecans } from '../src/modules/decans.js';

import {
  PEOPLE, SR_YEARS, LR_TARGET, TRANSIT_MOMENT, PROGRESSION_TARGET,
} from './fixtures.mjs';

/** Float gürültüsünü ele; obje anahtar sırasını sabitle. */
function canon(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return String(value);
    return Math.round(value * 1e6) / 1e6;
  }
  if (Array.isArray(value)) return value.map(canon);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = canon(value[key]);
    return out;
  }
  return value;
}

let errorCount = 0;

/**
 * Bir adımı çalıştır; patlarsa hatayı snapshot'a YAZ ve ekrana BAĞIR.
 * (Sessizce yutmak, bozuk bir hesabı "fark yok" diye geçirir — emniyet ağında delik.)
 */
async function attempt(label, fn) {
  try {
    return canon(await fn());
  } catch (err) {
    errorCount++;
    process.stderr.write(`  ⚠ HATA [${label}]: ${err.message}\n`);
    return { __error: `${err.name}: ${err.message}` };
  }
}

const outPath = process.argv[2] || 'snapshots/before.json';

const snapshot = { people: {} };

for (const person of PEOPLE) {
  const birthData = {
    year: person.year, month: person.month, day: person.day,
    hour: person.hour, minute: person.minute,
    timezone: person.timezone,
    latitude: person.latitude, longitude: person.longitude,
  };

  const entry = { note: person.note };

  // Girdinin UTC'ye çevrimi — DST bug'ının doğrudan gözlendiği yer.
  entry.utc = await attempt('utc', () => localToUTC(
    person.year, person.month, person.day, person.hour, person.minute, person.timezone,
  ));

  const natal = await calculateNatalChart(birthData);
  entry.natal = canon(natal);

  const location = {
    latitude: person.latitude, longitude: person.longitude,
    timezone: person.timezone, name: person.cityName,
  };

  entry.solarReturns = {};
  entry.srHouseTiming = {};
  for (const year of SR_YEARS) {
    let sr = null;
    try {
      sr = await calculateSolarReturn(natal, year, location);
      entry.solarReturns[year] = canon(sr);
    } catch (err) {
      errorCount++;
      process.stderr.write(`  ⚠ HATA [sr-${year}]: ${err.message}\n`);
      entry.solarReturns[year] = { __error: `${err.name}: ${err.message}` };
    }
    // SR ev geçiş tarihleri — kendi Newton çözücüsünü kullanır, ayrıca korunmalı.
    // Yuvarlanmamış sr objesi verilir, aksi halde yuvarlama hatayı gizler.
    entry.srHouseTiming[year] = sr
      ? await attempt(`srTiming-${year}`, () => calculateSRHouseTiming(sr))
      : { __skipped: 'SR hesaplanamadı' };
  }

  entry.lunarReturn = await attempt('lr', () =>
    calculateLunarReturn(natal, LR_TARGET.year, LR_TARGET.month, LR_TARGET.day, location));

  entry.transit = await attempt('transit', () =>
    calculateTransits(natal, TRANSIT_MOMENT, TRANSIT_MOMENT));

  entry.progressions = {};
  for (const { key } of ANGLE_METHODS) {
    entry.progressions[key] = await attempt(`prog-${key}`, () =>
      calculateSecondaryProgression(natal, PROGRESSION_TARGET, { angleMethod: key }));
  }

  entry.sevens = await attempt('sevens', () =>
    calculateSevenYearCycles(natal.houses, natal.planets, person.year));

  entry.decans = await attempt('decans', () =>
    calculateHouseDecans(natal.houses, natal.planets));

  snapshot.people[person.key] = entry;
  process.stderr.write(`✓ ${person.key}\n`);
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + '\n');
process.stderr.write(`\nYazıldı: ${outPath}\n`);

if (errorCount > 0) {
  process.stderr.write(`\n✗ ${errorCount} hesaplama HATA verdi — snapshot'a __error olarak yazıldı.\n`);
  process.exit(1);
}
