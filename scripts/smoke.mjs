/**
 * Uçtan uca smoke test — uygulamayı gerçek tarayıcıda sürer.
 *
 * Golden snapshot hesaplama katmanını koruyor ama UI katmanını (şehir arama
 * factory'si, sekme değiştirici, render'lar) yakalamıyor. Bu script onu kapatır:
 * gerçek bir doğum verisi girer, her sekmeyi tıklar, konsol hatası ve boş
 * tablo/çizilmemiş canvas arar.
 *
 *   node scripts/smoke.mjs            # dev server'ı kendi başlatır
 *   node scripts/smoke.mjs --keep     # ekran görüntülerini sakla
 */

import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const PORT = 3123;
const BASE = `http://localhost:${PORT}`;
const SHOTS = 'scratch-shots';

const failures = [];
const fail = (msg) => { failures.push(msg); console.log(`  ✗ ${msg}`); };
const pass = (msg) => console.log(`  ✓ ${msg}`);

// --- dev server ---
const server = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
  cwd: process.cwd(),
  stdio: 'ignore',
});
const shutdown = () => { try { server.kill('SIGTERM'); } catch {} };
process.on('exit', shutdown);

async function waitForServer(timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(BASE);
      if (res.ok) return;
    } catch { /* henüz ayakta değil */ }
    await new Promise(r => setTimeout(r, 300));
  }
  throw new Error('Dev server açılmadı');
}

/** Canvas gerçekten çizilmiş mi? (tamamen boş/tek renk değil mi) */
const CANVAS_DRAWN = (id) => {
  const c = document.getElementById(id);
  if (!c) return { ok: false, why: 'canvas yok' };
  const ctx = c.getContext('2d');
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  const seen = new Set();
  for (let i = 0; i < data.length; i += 4 * 997) {
    seen.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    if (seen.size > 4) return { ok: true, colors: seen.size };
  }
  return { ok: false, why: `sadece ${seen.size} renk — çizilmemiş görünüyor` };
};

await waitForServer();

mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(`PAGEERROR: ${err.message}`));

console.log('\n▶ Sayfa yükleniyor…');
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500); // WASM init

// ============================================
// 1. NATAL
// ============================================
console.log('\n▶ Natal harita (6 Ekim 1994, 05:21, İstanbul)');

await page.fill('#birthDay', '6');
await page.fill('#birthMonth', '10');
await page.fill('#birthYear', '1994');
await page.fill('#birthHour', '5');
await page.fill('#birthMinute', '21');

// Hızlı şehir butonu — createCitySearch factory'sini natal tarafında sürer
await page.click('.quick-city-btn[data-city="istanbul"]');
await page.waitForTimeout(300);

const cityValue = await page.inputValue('#citySearch');
if (cityValue.toLowerCase().includes('istanbul')) pass(`şehir seçildi: ${cityValue}`);
else fail(`hızlı şehir butonu çalışmadı (input: "${cityValue}")`);

const calcDisabled = await page.isDisabled('#calculateBtn');
if (!calcDisabled) pass('Hesapla butonu aktifleşti');
else fail('Hesapla butonu hâlâ disabled — onSelect callback çalışmadı');

await page.click('#calculateBtn');
await page.waitForTimeout(2500);

// Natal alt sekmeleri
// NOT: "chart" artık alt sekme değil — çark kendi kutusunda (.na-chart-box) hep görünür.
// Çizim kontrolü aşağıdaki natalChartCanvas doğrulamasında yapılıyor.
for (const [tab, check] of [
  ['planets', '#planetsTable table tbody tr'],
  ['houses', '#housesTable table tbody tr'],
  ['aspects', '#aspectsTable table tbody tr'],
]) {
  await page.click(`.tab[data-tab="${tab}"]`);
  await page.waitForTimeout(200);

  const visible = await page.isVisible(`#tab-${tab}`);
  if (!visible) { fail(`natal sekmesi "${tab}" görünmüyor`); continue; }

  if (check) {
    const rows = await page.locator(check).count();
    if (rows > 0) pass(`natal/${tab}: ${rows} satır`);
    else fail(`natal/${tab}: tablo BOŞ`);
  } else {
    pass(`natal/${tab} görünür`);
  }
}

const natalCanvas = await page.evaluate(CANVAS_DRAWN, 'natalChartCanvas');
if (natalCanvas.ok) pass(`natal harita çizildi (${natalCanvas.colors}+ renk)`);
else fail(`natal harita çizilmedi: ${natalCanvas.why}`);

await page.screenshot({ path: `${SHOTS}/1-natal.png` });

// Ekol yorumu — bilgi tabanı fetch'i sekme açılınca yapılır
await page.click('.tab[data-tab="yorum"]');
await page.waitForTimeout(1500);
const yorum = await page.evaluate(() => ({
  ev: document.querySelectorAll('.yr-house').length,
  dekan: document.querySelectorAll('.yr-decan').length,
  matris: document.querySelector('.yr-matrix .yr-total-row td:last-child')?.textContent,
}));
if (yorum.ev === 12 && yorum.dekan === 36) pass(`ekol yorumu: ${yorum.ev} ev / ${yorum.dekan} dekan`);
else fail(`ekol yorumu eksik: ${yorum.ev} ev, ${yorum.dekan} dekan`);
if (yorum.matris === '15') pass('ekol element puanlaması 15');
else fail(`ekol element puanlaması beklenen 15, gelen ${yorum.matris}`);
await page.click('.tab[data-tab="planets"]');
await page.waitForTimeout(200);

// ============================================
// 2. DİĞER BÖLÜMLER
// ============================================
const SECTIONS = [
  {
    key: 'solar', name: 'Solar Return',
    setup: async () => {
      await page.fill('#srYear', '1995');
      await page.waitForTimeout(300);

      // Dönem etiketi: konvansiyon görünür mü? (6 Ekim doğumlu + 1995 → Eki 1994–Eki 1995)
      const hint = (await page.textContent('#srPeriodHint')) || '';
      if (hint.includes('6 Ekim 1994') && hint.includes('6 Ekim 1995')) {
        pass(`dönem etiketi: ${hint.trim().replace(/\s+/g, ' ')}`);
      } else {
        fail(`dönem etiketi yanlış/eksik: "${hint.trim()}"`);
      }
    },
    calcBtn: '#srCalculateBtn',
    tabs: [['sr-planets', '#srPlanetsTable table tbody tr'], ['sr-aspects', '#srAspectsTable table tbody tr']],
    canvas: 'srChartCanvas',
    // Ekran görüntüsündeki referans değer — konvansiyon bozulursa burası patlar
    after: async () => {
      const timing = (await page.textContent('#srTimingCard')) || '';
      if (timing.includes('6 Ekim 1994') && timing.includes('05:21')) {
        pass('SR anı referansla eşleşiyor: 6 Ekim 1994, 05:21');
      } else {
        fail(`SR anı referanstan saptı — konvansiyon bozulmuş olabilir: "${timing.trim().slice(0, 90)}"`);
      }
    },
  },
  {
    key: 'lunar', name: 'Lunar Return',
    setup: async () => {
      await page.fill('#lrYear', '2026');
      await page.selectOption('#lrMonth', '3');
      await page.fill('#lrDay', '15');
    },
    calcBtn: '#lrCalculateBtn',
    tabs: [['lr-planets', '#lrPlanetsTable table tbody tr'], ['lr-aspects', '#lrAspectsTable table tbody tr']],
    canvas: 'lrChartCanvas',
  },
  {
    key: 'transit', name: 'Transit',
    setup: async () => {},
    calcBtn: '#trCalculateBtn',
    tabs: [['tr-planets', '#trPlanetsTable table tbody tr'], ['tr-natal-aspects', '#trNatalAspectsTable table tbody tr']],
    canvas: 'trChartCanvas',
  },
  {
    key: 'progression', name: 'Progres',
    setup: async () => {},
    calcBtn: '#prCalculateBtn',
    tabs: [['pr-planets', '#prPlanetsTable table tbody tr'], ['pr-natal-aspects', '#prNatalAspectsTable table tbody tr']],
    canvas: 'prChartCanvas',
  },
  {
    key: 'sevens', name: "7'ler Kanunu",
    setup: async () => {},
    calcBtn: null,
    tabs: [],
    canvas: 'sevensChartCanvas',
  },
];

for (const section of SECTIONS) {
  console.log(`\n▶ ${section.name}`);

  await page.click(`.main-tab[data-main-tab="${section.key}"]`);
  await page.waitForTimeout(400);

  const panelVisible = await page.isVisible(`#mainTab-${section.key}`);
  if (!panelVisible) { fail(`${section.name}: panel açılmadı`); continue; }

  await section.setup();
  await page.waitForTimeout(200);

  if (section.calcBtn) {
    const disabled = await page.isDisabled(section.calcBtn);
    if (disabled) { fail(`${section.name}: hesapla butonu disabled kaldı`); continue; }
    await page.click(section.calcBtn);
    await page.waitForTimeout(2500);
  }

  for (const [tab, rowSel] of section.tabs) {
    await page.click(`.tab[data-${section.key === 'solar' ? 'sr' : section.key === 'lunar' ? 'lr' : section.key === 'transit' ? 'tr' : 'pr'}-tab="${tab}"]`);
    await page.waitForTimeout(200);
    const rows = await page.locator(rowSel).count();
    if (rows > 0) pass(`${section.key}/${tab}: ${rows} satır`);
    else fail(`${section.key}/${tab}: tablo BOŞ`);
  }

  if (section.canvas) {
    const drawn = await page.evaluate(CANVAS_DRAWN, section.canvas);
    if (drawn.ok) pass(`${section.name} haritası çizildi`);
    else fail(`${section.name} haritası çizilmedi: ${drawn.why}`);
  }

  if (section.after) await section.after();

  await page.screenshot({ path: `${SHOTS}/${section.key}.png` });
}

// ============================================
// 2b. SİNASTRİ (Sinastri + Kompozit + Davison)
// ============================================
console.log('\n▶ Sinastri (Kişi B: 21 Mart 1998, 09:05, Ankara)');

await page.click('.main-tab[data-main-tab="synastry"]');
await page.waitForTimeout(400);

// Kişi A, natal formdan otomatik gelmeli
const personA = (await page.textContent('#syPersonAInfo')) || '';
if (personA.includes('1994')) pass(`Kişi A natal'dan geldi: ${personA.trim()}`);
else fail(`Kişi A boş/yanlış: "${personA.trim()}"`);

await page.fill('#syBirthDay', '21');
await page.fill('#syBirthMonth', '3');
await page.fill('#syBirthYear', '1998');
await page.fill('#syBirthHour', '9');
await page.fill('#syBirthMinute', '5');

await page.click('.sy-quick-city-btn[data-city="ankara"]');
await page.waitForTimeout(300);

// KRİTİK: Kişi B'nin şehir seçimi Kişi A'nınkini EZMEMELİ
const personACity = await page.inputValue('#citySearch');
if (personACity.toLowerCase().includes('istanbul')) {
  pass("Kişi B'nin şehir seçimi Kişi A'yı ezmedi");
} else {
  fail(`Kişi A'nın şehri bozuldu: "${personACity}" (İstanbul olmalıydı)`);
}

const syDisabled = await page.isDisabled('#syCalculateBtn');
if (!syDisabled) pass('Sinastri hesapla butonu aktifleşti');
else fail('Sinastri hesapla butonu disabled kaldı');

await page.click('#syCalculateBtn');
await page.waitForTimeout(3000);

// Sekme arkasındaki bölümler
for (const [tab, sel, label] of [
  ['sy-chart', null, 'Sinastri haritası'],
  ['sy-composite', '#syCompositePlanetsTable table tbody tr', 'Kompozit gezegenler'],
  ['sy-davison', '#syDavisonPlanetsTable table tbody tr', 'Davison gezegenler'],
]) {
  await page.click(`.tab[data-sy-tab="${tab}"]`);
  await page.waitForTimeout(300);

  if (sel) {
    const rows = await page.locator(sel).count();
    if (rows > 0) pass(`${label}: ${rows} satır`);
    else fail(`${label}: BOŞ`);
  }
}

// Aspekt/grid/ev tabloları artık sekme arkasında değil — sonuçların altında hep görünür.
for (const [sel, label] of [
  ['#syAspectsTable table tbody tr', 'Çapraz aspektler'],
  ['#syGridTable table tbody tr', 'Aspekt gridi'],
  ['#syHousesTable table tbody tr', 'Ev yerleşimleri'],
]) {
  const rows = await page.locator(sel).count();
  if (rows > 0) pass(`${label}: ${rows} satır`);
  else fail(`${label}: BOŞ`);
}

// Üç canvas da çizilmiş olmalı
for (const [id, label] of [
  ['syChartCanvas', 'Sinastri bi-wheel'],
  ['syCompositeCanvas', 'Kompozit haritası'],
  ['syDavisonCanvas', 'Davison haritası'],
]) {
  const drawn = await page.evaluate(CANVAS_DRAWN, id);
  if (drawn.ok) pass(`${label} çizildi`);
  else fail(`${label} çizilmedi: ${drawn.why}`);
}

// --- İç/dış halka takası ---
// Çerçeveyi İÇ harita kurar, dolayısıyla takas çizimi gerçekten değiştirmeli.
await page.click('.tab[data-sy-tab="sy-chart"]');
await page.waitForTimeout(400);

const wheelBefore = await page.evaluate(() =>
  document.getElementById('syChartCanvas').toDataURL().length);
const legendBefore = await page.textContent('#syLegendInner');

await page.click('#sySwapBtn');
await page.waitForTimeout(800);

const wheelAfter = await page.evaluate(() =>
  document.getElementById('syChartCanvas').toDataURL().length);
const legendAfter = await page.textContent('#syLegendInner');

if (legendBefore.includes('Kişi A') && legendAfter.includes('Kişi B')) {
  pass(`takas: "${legendBefore.trim()}" → "${legendAfter.trim()}"`);
} else {
  fail(`takas etiketi güncellenmedi: "${legendBefore}" → "${legendAfter}"`);
}

if (wheelBefore !== wheelAfter) pass('takas çarkı gerçekten yeniden çizdi');
else fail('takas sonrası canvas AYNI — çizim değişmedi');

// Geri al — kompozit/Davison takastan etkilenmemeli (orta noktalar simetrik)
const compBefore = await page.evaluate(() =>
  document.getElementById('syCompositeCanvas').toDataURL().length);
await page.click('#sySwapBtn');
await page.waitForTimeout(800);
const compAfter = await page.evaluate(() =>
  document.getElementById('syCompositeCanvas').toDataURL().length);

if (compBefore === compAfter) pass('kompozit takastan etkilenmedi (simetrik)');
else fail('kompozit takasta değişti — simetrik olmalıydı');

const legendBack = await page.textContent('#syLegendInner');
if (legendBack.includes('Kişi A')) pass('takas geri alınabiliyor');
else fail(`takas geri alınamadı: "${legendBack}"`);

// Kompozit çapa değişimi haritayı yeniden hesaplamalı
await page.click('.tab[data-sy-tab="sy-composite"]');
await page.waitForTimeout(300);
// #syAnchor, hesaplamadan sonra katlanan #syForm'un içinde — seçim için formu aç.
await page.click('#syFormToggle');
await page.waitForTimeout(300);
await page.selectOption('#syAnchor', 'mc');
await page.waitForTimeout(600);
const summaryAfter = (await page.textContent('#sySummaryCard')) || '';
if (summaryAfter.includes('10. Ev')) pass('Kompozit çapası MC\'ye geçti (yeniden hesaplandı)');
else fail(`Çapa değişimi yansımadı: "${summaryAfter.replace(/\s+/g, ' ').trim().slice(0, 70)}"`);

await page.screenshot({ path: `${SHOTS}/synastry.png` });

// ============================================
// 3. NATAL SEKMESİNE GERİ DÖN — switchSectionTab regresyonu
// ============================================
console.log('\n▶ Natal sekmesine dönüş (sekme çakışması kontrolü)');
await page.click('.main-tab[data-main-tab="natal"]');
await page.waitForTimeout(300);
await page.click('.tab[data-tab="planets"]');
await page.waitForTimeout(300);

const backRows = await page.locator('#planetsTable table tbody tr').count();
if (backRows > 0) pass(`natal tabloları hâlâ dolu (${backRows} satır)`);
else fail('natal sekmesine dönünce tablolar boşaldı — sekme sınıfı çakışması');

const stillVisible = await page.isVisible('#tab-planets');
if (stillVisible) pass('natal/planets görünür');
else fail('natal/planets görünmez oldu');

// ============================================
// SONUÇ
// ============================================
console.log('\n' + '='.repeat(50));

if (consoleErrors.length) {
  console.log(`\n⚠ ${consoleErrors.length} konsol hatası:`);
  for (const e of [...new Set(consoleErrors)].slice(0, 10)) console.log(`   ${e}`);
  failures.push(`${consoleErrors.length} konsol hatası`);
}

await browser.close();
shutdown();

if (failures.length) {
  console.log(`\n✗ ${failures.length} SORUN:\n`);
  failures.forEach(f => console.log(`   • ${f}`));
  process.exit(1);
}

console.log('\n✓ Tüm sekmeler çalışıyor, konsol temiz.');
process.exit(0);
