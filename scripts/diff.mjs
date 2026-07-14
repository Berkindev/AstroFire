/**
 * İki golden snapshot'ı karşılaştırır ve DEĞİŞEN her alanı yol olarak listeler.
 *
 *   node scripts/diff.mjs snapshots/before.json snapshots/after.json
 *
 * Çıkış kodu: fark yoksa 0, varsa 1.
 * Refactor fazlarında (Faz 1-2) çıktı BOŞ olmalı. Bug fix fazında (Faz 3)
 * yalnızca beklenen alanlar listelenmeli.
 */

import { readFileSync } from 'node:fs';

const [beforePath, afterPath] = process.argv.slice(2);
if (!beforePath || !afterPath) {
  console.error('Kullanım: node scripts/diff.mjs <before.json> <after.json>');
  process.exit(2);
}

const before = JSON.parse(readFileSync(beforePath, 'utf8'));
const after = JSON.parse(readFileSync(afterPath, 'utf8'));

const diffs = [];

function walk(a, b, path) {
  if (a === b) return;

  const aIsObj = a && typeof a === 'object';
  const bIsObj = b && typeof b === 'object';

  if (!aIsObj || !bIsObj || Array.isArray(a) !== Array.isArray(b)) {
    diffs.push({ path, before: a, after: b });
    return;
  }

  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!(key in a)) { diffs.push({ path: `${path}.${key}`, before: undefined, after: b[key] }); continue; }
    if (!(key in b)) { diffs.push({ path: `${path}.${key}`, before: a[key], after: undefined }); continue; }
    walk(a[key], b[key], `${path}.${key}`);
  }
}

walk(before, after, '');

if (diffs.length === 0) {
  console.log('✓ Fark yok — davranış birebir korundu.');
  process.exit(0);
}

const fmt = (v) => {
  if (v === undefined) return '(yok)';
  const s = JSON.stringify(v);
  return s.length > 80 ? s.slice(0, 77) + '...' : s;
};

console.log(`${diffs.length} fark:\n`);
for (const d of diffs) {
  console.log(`  ${d.path.replace(/^\./, '')}`);
  console.log(`    önce:  ${fmt(d.before)}`);
  console.log(`    sonra: ${fmt(d.after)}`);
}

// Hangi üst-seviye alanların etkilendiğini özetle — "sadece beklenen yerler mi?" kontrolü.
const buckets = new Map();
for (const d of diffs) {
  const parts = d.path.replace(/^\./, '').split('.');
  // people.<kisi>.<bolum>... → <bolum> bazında say
  const bucket = parts.slice(0, 3).join('.').replace(/\.\d+$/, '');
  buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
}
console.log('\nÖzet (bölüm → fark sayısı):');
for (const [bucket, count] of [...buckets].sort((x, y) => y[1] - x[1])) {
  console.log(`  ${count.toString().padStart(5)}  ${bucket}`);
}

process.exit(1);
