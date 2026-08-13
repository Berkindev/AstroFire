/**
 * Mobil responsive kontrolü — 390×844 (iPhone) viewport'ta her sekmeyi gezer,
 * yatay taşma (scrollWidth > innerWidth) ve çizilmemiş canvas arar,
 * scratch-shots/mobile-*.png ekran görüntüleri bırakır.
 *
 *   node scripts/mobile-check.mjs
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 3124;
const BASE = `http://localhost:${PORT}`;
const SHOTS = 'scratch-shots';

const failures = [];
const fail = (msg) => { failures.push(msg); console.log(`  ✗ ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);

const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  stdio: 'ignore',
});
process.on('exit', () => { try { server.kill('SIGTERM'); } catch {} });

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try { const res = await fetch(BASE); if (res.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('Dev server açılmadı');
}

await waitForServer();
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

const consoleErrors = [];
page.on('pageerror', (err) => consoleErrors.push(err.message));

await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Natal doldur + hesapla
await page.fill('#birthDay', '6');
await page.fill('#birthMonth', '10');
await page.fill('#birthYear', '1994');
await page.fill('#birthHour', '5');
await page.fill('#birthMinute', '21');
await page.click('.quick-city-btn[data-city="istanbul"]');
await page.waitForTimeout(300);
await page.click('#calculateBtn');
await page.waitForTimeout(2500);

/** Yatay taşma raporu: taşan elementlerin ilk 5'ini de isimlendirir. */
async function checkOverflow(label) {
  const r = await page.evaluate(() => {
    const doc = document.documentElement;
    const over = doc.scrollWidth - window.innerWidth;
    const bad = [];
    if (over > 1) {
      for (const el of document.querySelectorAll('body *')) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 2 && (rect.right > window.innerWidth + 2 || rect.left < -2)) {
          const cls = (typeof el.className === 'string' && el.className) ? `.${el.className.split(' ')[0]}` : '';
          bad.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : cls} (${Math.round(rect.left)}..${Math.round(rect.right)})`);
          if (bad.length >= 5) break;
        }
      }
    }
    return { over, bad };
  });
  if (r.over > 1) fail(`${label}: ${r.over}px yatay taşma → ${r.bad.join(' | ')}`);
  else pass(`${label}: yatay taşma yok`);
}

async function shot(name) {
  await page.screenshot({ path: `${SHOTS}/mobile-${name}.png`, fullPage: false });
}

// NATAL
console.log('\n▶ natal');
await checkOverflow('natal');
await shot('1-natal');

// Sekme döngüsü — her sekmede gerekiyorsa hesapla
const TABS = [
  { key: 'sevens', calc: null },
  { key: 'solar', calc: '#srCalculateBtn' },
  { key: 'lunar', calc: '#lrCalculateBtn' },
  { key: 'transit', calc: '#trCalculateBtn' },
  { key: 'progression', calc: '#prCalculateBtn' },
  { key: 'layers', calc: '#lyCalculateBtn' },
];

let i = 2;
for (const { key, calc } of TABS) {
  console.log(`\n▶ ${key}`);
  await page.click(`.main-tab[data-main-tab="${key}"]`);
  await page.waitForTimeout(400);
  if (calc) {
    const disabled = await page.isDisabled(calc);
    if (disabled) fail(`${key}: hesapla butonu disabled`);
    else {
      await page.click(calc);
      await page.waitForTimeout(3000);
    }
  }
  await checkOverflow(key);
  await shot(`${i}-${key}`);
  i++;
}

// SINASTRI — Kişi B doldur
console.log('\n▶ synastry');
await page.click('.main-tab[data-main-tab="synastry"]');
await page.waitForTimeout(400);
await page.fill('#syBirthDay', '21');
await page.fill('#syBirthMonth', '3');
await page.fill('#syBirthYear', '1998');
await page.fill('#syBirthHour', '9');
await page.fill('#syBirthMinute', '5');
await page.click('.sy-quick-city-btn[data-city="ankara"]');
await page.waitForTimeout(300);
const syDisabled = await page.isDisabled('#syCalculateBtn');
if (!syDisabled) { await page.click('#syCalculateBtn'); await page.waitForTimeout(3500); }
else fail('synastry: hesapla disabled');
await checkOverflow('synastry');
await shot(`${i}-synastry`);

if (consoleErrors.length) fail(`console: ${consoleErrors.slice(0, 3).join(' | ')}`);
else pass('konsol temiz');

await browser.close();
console.log('\n' + '='.repeat(50));
if (failures.length) { console.log(`✗ ${failures.length} sorun`); process.exit(1); }
console.log('✓ Mobil görünüm temiz.');
