/**
 * AstroFire - Ana Uygulama
 * UI event handling ve modüllerin bağlanması
 */

import { initEphemeris } from './modules/ephemeris.js';
import { searchCity, formatCityName, formatCoordinates } from './modules/geocoding.js';
import { getUTCOffsetMinutes, formatUTCOffset } from './modules/datetime.js';
import { calculateNatalChart } from './modules/natal.js';
import { calculateSolarReturn, calculateSRHouseTiming } from './modules/solar.js';
import { calculateLunarReturn } from './modules/lunar.js';
import { formatLongitude, formatNatalChartText, formatSolarReturnText, formatLunarReturnText, formatTransitText, formatAspect } from './modules/formatting.js';
import { SIGNS } from './modules/constants.js';
import { drawChartWheel, drawSevenYearOverlay, drawDecanOverlay, drawBiWheel } from './modules/chartWheelSF.js';
import { calculateTransits } from './modules/transit.js';
import { calculateHouseDecans } from './modules/decans.js';
import { calculateSevenYearCycles } from './modules/sevens.js';

// ============================================
// SVG Sign Helper — replaces Unicode zodiac emoji with SVG icons everywhere
// ============================================
const SIGN_SVG_NAMES = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];
function signImg(signIndex, size = 14) {
  const idx = ((signIndex % 12) + 12) % 12;
  return `<img src="/Symbols/${SIGN_SVG_NAMES[idx]}-symbol-icon.svg" style="width:${size}px;height:${size}px;vertical-align:middle;filter:brightness(0) invert(1);" alt="">`;
}
// Get sign index from SIGNS array by sign object
function signImgFromSign(sign, size = 14) {
  const idx = SIGNS.indexOf(sign);
  return idx >= 0 ? signImg(idx, size) : '';
}

// ============================================
// STATE
// ============================================
let selectedCity = null;
let currentChart = null;
let searchTimeout = null;

// Solar Return state
let currentSolarReturn = null;
let srSelectedCity = null;
let srSearchTimeout = null;

// Lunar Return state
let currentLunarReturn = null;
let lrSelectedCity = null;
let lrSearchTimeout = null;

// Transit state
let currentTransit = null;
let trSelectedCity = null;
let trSearchTimeout = null;

// ============================================
// DOM ELEMENTS
// ============================================
const $ = (id) => document.getElementById(id);

const elements = {
  headerBrand: $('headerBrand'),
  birthForm: $('birthForm'),
  citySearch: $('citySearch'),
  cityDropdown: $('cityDropdown'),
  locationInfo: $('locationInfo'),
  coordDisplay: $('coordDisplay'),
  timezoneDisplay: $('timezoneDisplay'),
  utcOffsetDisplay: $('utcOffsetDisplay'),
  calculateBtn: $('calculateBtn'),
  clearFormBtn: $('clearFormBtn'),
  resultsPanel: $('resultsPanel'),
  planetsTable: $('planetsTable'),
  housesTable: $('housesTable'),
  aspectsTable: $('aspectsTable'),
  debugOutput: $('debugOutput'),
  // Solar Return elements
  solarReturnPanel: $('solarReturnPanel'),
  srYear: $('srYear'),
  srLocBirth: $('srLocBirth'),
  srLocCustom: $('srLocCustom'),
  srLocBirthLabel: $('srLocBirthLabel'),
  srLocCustomLabel: $('srLocCustomLabel'),
  srBirthPlaceName: $('srBirthPlaceName'),
  srCustomLocationSection: $('srCustomLocationSection'),
  srCitySearch: $('srCitySearch'),
  srCityDropdown: $('srCityDropdown'),
  srLocationInfo: $('srLocationInfo'),
  srCoordDisplay: $('srCoordDisplay'),
  srTimezoneDisplay: $('srTimezoneDisplay'),
  srCalculateBtn: $('srCalculateBtn'),
  srResults: $('srResults'),
  srTimingCard: $('srTimingCard'),
  srPlanetsTable: $('srPlanetsTable'),
  srHousesTable: $('srHousesTable'),
  srAspectsTable: $('srAspectsTable'),
  srDebugOutput: $('srDebugOutput'),
  decansDisplay: $('decansDisplay'),
  decanOverlayCheck: $('decanOverlayCheck'),
  srDecansDisplay: $('srDecansDisplay'),
  // Lunar Return elements
  lunarReturnPanel: $('lunarReturnPanel'),
  lrYear: $('lrYear'),
  lrMonth: $('lrMonth'),
  lrLocBirth: $('lrLocBirth'),
  lrLocCustom: $('lrLocCustom'),
  lrLocBirthLabel: $('lrLocBirthLabel'),
  lrLocCustomLabel: $('lrLocCustomLabel'),
  lrBirthPlaceName: $('lrBirthPlaceName'),
  lrCustomLocationSection: $('lrCustomLocationSection'),
  lrCitySearch: $('lrCitySearch'),
  lrCityDropdown: $('lrCityDropdown'),
  lrLocationInfo: $('lrLocationInfo'),
  lrCoordDisplay: $('lrCoordDisplay'),
  lrTimezoneDisplay: $('lrTimezoneDisplay'),
  lrCalculateBtn: $('lrCalculateBtn'),
  lrResults: $('lrResults'),
  lrTimingCard: $('lrTimingCard'),
  lrPlanetsTable: $('lrPlanetsTable'),
  lrHousesTable: $('lrHousesTable'),
  lrAspectsTable: $('lrAspectsTable'),
  lrDebugOutput: $('lrDebugOutput'),
  lrDecansDisplay: $('lrDecansDisplay'),
  // Transit elements
  transitPanel: $('transitPanel'),
  trDay: $('trDay'),
  trMonth: $('trMonth'),
  trYear: $('trYear'),
  trHour: $('trHour'),
  trMinute: $('trMinute'),
  trNowBtn: $('trNowBtn'),
  trLocBirth: $('trLocBirth'),
  trLocCustom: $('trLocCustom'),
  trLocBirthLabel: $('trLocBirthLabel'),
  trLocCustomLabel: $('trLocCustomLabel'),
  trBirthPlaceName: $('trBirthPlaceName'),
  trCustomLocationSection: $('trCustomLocationSection'),
  trCitySearch: $('trCitySearch'),
  trCityDropdown: $('trCityDropdown'),
  trLocationInfo: $('trLocationInfo'),
  trCoordDisplay: $('trCoordDisplay'),
  trTimezoneDisplay: $('trTimezoneDisplay'),
  trCalculateBtn: $('trCalculateBtn'),
  trResults: $('trResults'),
  trTimingCard: $('trTimingCard'),
  trPlanetsTable: $('trPlanetsTable'),
  trNatalAspectsTable: $('trNatalAspectsTable'),
  trAspectsTable: $('trAspectsTable'),
  trDebugOutput: $('trDebugOutput'),
  trDecansDisplay: $('trDecansDisplay'),
  mainTabs: $('mainTabs'),
  sevensDisplay: $('sevensDisplay'),
  formToggle: $('formToggle'),
  formContent: $('formContent'),
  toggleIcon: $('toggleIcon'),
};

// ============================================
// INITIALIZATION
// ============================================
async function init() {
  try {
    await initEphemeris();
    elements.calculateBtn.disabled = false;
  } catch (error) {
    console.error('Init error:', error);
  }

  // Event listeners
  setupEventListeners();
}

// ============================================
// EVENT LISTENERS
// ============================================
function setupEventListeners() {
  // Header brand click → reload page
  if (elements.headerBrand) {
    elements.headerBrand.addEventListener('click', () => {
      window.location.reload();
    });
  }

  // Form toggle
  elements.formToggle.addEventListener('click', toggleForm);

  // Decan overlay toggle
  if (elements.decanOverlayCheck) {
    elements.decanOverlayCheck.addEventListener('change', () => {
      if (currentChart) renderNatalChart(currentChart);
    });
  }

  // Şehir arama
  elements.citySearch.addEventListener('input', handleCitySearch);
  elements.citySearch.addEventListener('focus', () => {
    if (elements.cityDropdown.children.length > 0) {
      elements.cityDropdown.classList.remove('hidden');
    }
  });

  // Click dışarı tıklayınca dropdown kapat
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.city-search-wrapper')) {
      elements.cityDropdown.classList.add('hidden');
      elements.srCityDropdown.classList.add('hidden');
      elements.lrCityDropdown.classList.add('hidden');
      elements.trCityDropdown.classList.add('hidden');
    }
  });

  // Form submit
  elements.birthForm.addEventListener('submit', handleCalculate);

  // Temizle butonu
  elements.clearFormBtn.addEventListener('click', handleClearForm);

  // Hızlı şehir seçim butonları
  document.querySelectorAll('.quick-city-btn').forEach(btn => {
    btn.addEventListener('click', () => handleQuickCitySelect(btn.dataset.city));
  });

  // Main tab switching (Natal / Solar Return)
  document.querySelectorAll('.main-tab[data-main-tab]').forEach(tab => {
    tab.addEventListener('click', () => switchMainTab(tab.dataset.mainTab));
  });

  // Tab switching (natal)
  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab === 'chartinfo') {
        toggleChartInfoPanel();
      } else {
        switchTab(tab.dataset.tab);
      }
    });
  });

  // Chart Info panel close button
  const chartInfoCloseBtn = $('chartInfoClose');
  if (chartInfoCloseBtn) {
    chartInfoCloseBtn.addEventListener('click', () => toggleChartInfoPanel(false));
  }

  // Tarih değişince UTC offset güncelle
  ['birthDay', 'birthMonth', 'birthYear', 'birthHour', 'birthMinute'].forEach(id => {
    $(id).addEventListener('change', updateTimezoneDisplay);
  });

  // ============================================
  // SOLAR RETURN EVENT LISTENERS
  // ============================================
  
  // SR konum seçimi radio
  elements.srLocBirth.addEventListener('change', handleSRLocationChange);
  elements.srLocCustom.addEventListener('change', handleSRLocationChange);

  // SR şehir arama
  elements.srCitySearch.addEventListener('input', handleSRCitySearch);
  elements.srCitySearch.addEventListener('focus', () => {
    if (elements.srCityDropdown.children.length > 0) {
      elements.srCityDropdown.classList.remove('hidden');
    }
  });

  // SR hesapla
  elements.srCalculateBtn.addEventListener('click', handleSRCalculate);

  // SR tab switching
  document.querySelectorAll('.tab[data-sr-tab]').forEach(tab => {
    tab.addEventListener('click', () => switchSRTab(tab.dataset.srTab));
  });

  // SR yıl değişince buton durumunu güncelle
  elements.srYear.addEventListener('input', updateSRButtonState);

  // ============================================
  // LUNAR RETURN EVENT LISTENERS
  // ============================================

  // LR konum seçimi radio
  elements.lrLocBirth.addEventListener('change', handleLRLocationChange);
  elements.lrLocCustom.addEventListener('change', handleLRLocationChange);

  // LR şehir arama
  elements.lrCitySearch.addEventListener('input', handleLRCitySearch);
  elements.lrCitySearch.addEventListener('focus', () => {
    if (elements.lrCityDropdown.children.length > 0) {
      elements.lrCityDropdown.classList.remove('hidden');
    }
  });

  // LR hesapla
  elements.lrCalculateBtn.addEventListener('click', handleLRCalculate);

  // LR tab switching
  document.querySelectorAll('.tab[data-lr-tab]').forEach(tab => {
    tab.addEventListener('click', () => switchLRTab(tab.dataset.lrTab));
  });

  // LR yıl/ay değişince buton durumunu güncelle
  elements.lrYear.addEventListener('input', updateLRButtonState);
  elements.lrMonth.addEventListener('change', updateLRButtonState);

  // ============================================
  // TRANSIT EVENT LISTENERS
  // ============================================

  // TR konum seçimi radio
  elements.trLocBirth.addEventListener('change', handleTRLocationChange);
  elements.trLocCustom.addEventListener('change', handleTRLocationChange);

  // TR şehir arama
  elements.trCitySearch.addEventListener('input', handleTRCitySearch);
  elements.trCitySearch.addEventListener('focus', () => {
    if (elements.trCityDropdown.children.length > 0) {
      elements.trCityDropdown.classList.remove('hidden');
    }
  });

  // TR hesapla
  elements.trCalculateBtn.addEventListener('click', handleTRCalculate);

  // TR "Şu An" butonu
  elements.trNowBtn.addEventListener('click', handleTRNowClick);

  // TR tab switching
  document.querySelectorAll('.tab[data-tr-tab]').forEach(tab => {
    tab.addEventListener('click', () => switchTRTab(tab.dataset.trTab));
  });

  // TR tarih değişince buton durumunu güncelle
  ['trDay', 'trMonth', 'trYear', 'trHour', 'trMinute'].forEach(id => {
    $(id).addEventListener('input', updateTRButtonState);
  });

  // Aspect toggle (event delegation)
  document.addEventListener('click', (e) => {
    const toggle = e.target.closest('.aspect-toggle');
    if (!toggle) return;
    const planetRow = toggle.closest('.decan-planet-row');
    if (!planetRow) return;
    const aspectsDiv = planetRow.nextElementSibling;
    if (!aspectsDiv || !aspectsDiv.classList.contains('planet-aspects')) return;
    aspectsDiv.classList.toggle('hidden');
    // Toggle arrow direction
    const count = toggle.textContent.match(/\d+/)?.[0] || '';
    if (aspectsDiv.classList.contains('hidden')) {
      toggle.textContent = `▼ ${count} açı`;
    } else {
      toggle.textContent = `▲ ${count} açı`;
    }
  });
}

// ============================================
// FORM TOGGLE
// ============================================
function toggleForm() {
  elements.formContent.classList.toggle('collapsed');
  elements.toggleIcon.classList.toggle('collapsed');
}

function collapseForm() {
  elements.formContent.classList.add('collapsed');
  elements.toggleIcon.classList.add('collapsed');
}

function expandForm() {
  elements.formContent.classList.remove('collapsed');
  elements.toggleIcon.classList.remove('collapsed');
}

// ============================================
// QUICK CITY DATA
// ============================================
const QUICK_CITIES = {
  istanbul: { name: 'Istanbul', admin: 'Istanbul', country: 'Turkey', lat: 41.0082, lng: 28.9784, timezone: 'Europe/Istanbul' },
  ankara: { name: 'Ankara', admin: 'Ankara', country: 'Turkey', lat: 39.9334, lng: 32.8597, timezone: 'Europe/Istanbul' },
  izmir: { name: 'Izmir', admin: 'Izmir', country: 'Turkey', lat: 38.4237, lng: 27.1428, timezone: 'Europe/Istanbul' },
  antalya: { name: 'Antalya', admin: 'Antalya', country: 'Turkey', lat: 36.8969, lng: 30.7133, timezone: 'Europe/Istanbul' },
  eskisehir: { name: 'Eskisehir', admin: 'Eskisehir', country: 'Turkey', lat: 39.7767, lng: 30.5206, timezone: 'Europe/Istanbul' },
};

function handleQuickCitySelect(cityKey) {
  const city = QUICK_CITIES[cityKey];
  if (city) {
    selectCity(city);
    // Aktif butonu vurgula
    document.querySelectorAll('.quick-city-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.city === cityKey);
    });
  }
}

function handleClearForm() {
  // Form alanlarını temizle
  elements.birthForm.reset();
  elements.citySearch.value = '';
  
  // Seçili şehri sıfırla
  selectedCity = null;
  elements.locationInfo.classList.add('hidden');
  elements.cityDropdown.classList.add('hidden');
  elements.cityDropdown.innerHTML = '';
  
  // Hızlı şehir butonlarını sıfırla
  document.querySelectorAll('.quick-city-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Hesapla butonunu devre dışı bırak
  elements.calculateBtn.disabled = true;
  
  // Sonuç panellerini gizle
  elements.resultsPanel.classList.add('hidden');
  // Natal sekmesine geri dön
  switchMainTab('natal');
  // Formu aç
  expandForm();
  // Sevens temizle
  elements.sevensDisplay.innerHTML = '';
  
  // Mevcut verilerini sıfırla
  currentChart = null;
  currentSolarReturn = null;
  currentLunarReturn = null;
  currentTransit = null;
}

// ============================================
// CITY SEARCH
// ============================================
function handleCitySearch(e) {
  const query = e.target.value.trim();
  
  if (searchTimeout) clearTimeout(searchTimeout);
  
  if (query.length < 2) {
    elements.cityDropdown.classList.add('hidden');
    elements.cityDropdown.innerHTML = '';
    return;
  }
  
  // 300ms debounce
  searchTimeout = setTimeout(async () => {
    try {
      const results = await searchCity(query);
      renderCityResults(results);
    } catch (error) {
      console.error('Şehir arama hatası:', error);
    }
  }, 300);
}

function renderCityResults(results) {
  if (results.length === 0) {
    elements.cityDropdown.innerHTML = '<div class="city-option no-results">Sonuç bulunamadı</div>';
    elements.cityDropdown.classList.remove('hidden');
    return;
  }
  
  elements.cityDropdown.innerHTML = results.map((city, index) => `
    <div class="city-option" data-index="${index}">
      <span class="city-name">${city.name}</span>
      <span class="city-detail">${city.admin ? city.admin + ', ' : ''}${city.country}</span>
      <span class="city-coords">${city.lat.toFixed(2)}°, ${city.lng.toFixed(2)}°</span>
    </div>
  `).join('');
  
  // Click handlers
  elements.cityDropdown.querySelectorAll('.city-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const index = parseInt(opt.dataset.index);
      selectCity(results[index]);
    });
  });
  
  elements.cityDropdown.classList.remove('hidden');
}

function selectCity(city) {
  selectedCity = city;
  elements.citySearch.value = formatCityName(city);
  elements.cityDropdown.classList.add('hidden');
  
  // Yer bilgilerini göster
  elements.locationInfo.classList.remove('hidden');
  elements.coordDisplay.textContent = formatCoordinates(city.lat, city.lng);
  elements.timezoneDisplay.textContent = city.timezone;
  
  // UTC offset'i güncelle
  updateTimezoneDisplay();
  
  // Hesapla butonunu aktif et
  elements.calculateBtn.disabled = false;
}

function updateTimezoneDisplay() {
  if (!selectedCity) return;
  
  const year = parseInt($('birthYear').value);
  const month = parseInt($('birthMonth').value);
  const day = parseInt($('birthDay').value);
  const hour = parseInt($('birthHour').value);
  const minute = parseInt($('birthMinute').value);
  
  if (isNaN(year) || isNaN(month) || isNaN(day)) return;
  
  try {
    const offsetMinutes = getUTCOffsetMinutes(year, month, day, hour, minute, selectedCity.timezone);
    const offsetStr = formatUTCOffset(offsetMinutes);
    elements.utcOffsetDisplay.textContent = offsetStr;
  } catch (error) {
    elements.utcOffsetDisplay.textContent = 'Hesaplanamadı';
  }
}

// ============================================
// CHART CALCULATION
// ============================================
async function handleCalculate(e) {
  e.preventDefault();
  
  if (!selectedCity) {
    alert('Lütfen bir doğum yeri seçin.');
    return;
  }
  
  const birthData = {
    year: parseInt($('birthYear').value),
    month: parseInt($('birthMonth').value),
    day: parseInt($('birthDay').value),
    hour: parseInt($('birthHour').value),
    minute: parseInt($('birthMinute').value),
    timezone: selectedCity.timezone,
    latitude: selectedCity.lat,
    longitude: selectedCity.lng,
  };
  
  // Loading state
  elements.calculateBtn.disabled = true;
  elements.calculateBtn.innerHTML = '<span class="btn-icon">⏳</span> Hesaplanıyor...';
  
  try {
    currentChart = await calculateNatalChart(birthData);
    renderResults(currentChart);
    elements.resultsPanel.classList.remove('hidden');

    // Solar Return'ü hazırla
    showSolarReturnPanel();
    // Lunar Return'ü hazırla
    showLunarReturnPanel();
    // Transit'i hazırla
    showTransitPanel();

    // Formu kapat ve sonuçlara scroll
    collapseForm();
    elements.resultsPanel.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Hesaplama hatası:', error);
    alert('Hesaplama hatası: ' + error.message);
  } finally {
    elements.calculateBtn.disabled = false;
    elements.calculateBtn.innerHTML = '<span class="btn-icon">✨</span> Harita Hesapla';
  }
}

// ============================================
// RENDER RESULTS (NATAL)
// ============================================
function renderResults(chart) {
  renderNatalChart(chart);
  renderPlanets(chart);
  renderHouses(chart);
  renderAspects(chart);
  renderDebug(chart);
  renderDecans(chart);
  renderSevens(chart);
}

function getUtcOffsetStr(bd) {
  try {
    const dt = new Date(bd.year, bd.month - 1, bd.day, bd.hour, bd.minute);
    const fmt = new Intl.DateTimeFormat('en', { timeZone: bd.timezone, timeZoneName: 'shortOffset' });
    const parts = fmt.formatToParts(dt);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    return tzPart ? tzPart.value.replace('GMT', 'UTC') : '';
  } catch { return ''; }
}

function renderNatalChart(chart) {
  lastNatalChart = chart;
  const canvas = $('natalChartCanvas');
  if (!canvas) return;
  
  const bd = chart.birthData;
  const months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const dateStr = `${bd.day} ${months[bd.month]} ${bd.year}`;
  const timeStr = `${String(bd.hour).padStart(2, '0')}:${String(bd.minute).padStart(2, '0')}`;
  const cityName = selectedCity ? formatCityName(selectedCity) : '';
  
  drawChartWheel(canvas, chart, {
    title: 'Natal Chart',
    subtitle: `Natal Chart\n${dateStr}\n${timeStr}  ${getUtcOffsetStr(bd)}\n${bd.timezone}\n${cityName}`,
    showAspects: true,
    chartType: 'natal',
  });

  // Decan overlay (default on)
  if (elements.decanOverlayCheck && elements.decanOverlayCheck.checked) {
    const allPlanets = getAllPlanets(chart);
    const decanData = calculateHouseDecans(chart.houses, allPlanets);
    drawDecanOverlay(canvas, chart, decanData);
  }

  // Render chart info panel content if it's already open
  try {
    const panel = $('chartInfoPanel');
    if (panel && !panel.classList.contains('chart-info-closed')) {
      renderChartInfoPanel(chart);
    }
  } catch(e) { console.error('Chart info panel error:', e); }
}

function renderPlanets(chart) {
  const rows = chart.planets.map(planet => {
    const pos = formatLongitude(planet.longitude);
    const retro = planet.isRetrograde ? '<span class="retro-badge">R</span>' : '';
    const sign = SIGNS[pos.signIndex];
    
    return `
      <tr class="element-${sign.element}">
        <td class="planet-symbol">${planet.symbol}</td>
        <td class="planet-name">${planet.name}</td>
        <td class="planet-pos">${pos.formatted}</td>
        <td class="planet-full">${pos.degree}°${pos.minute}'${pos.second}" ${signImgFromSign(sign)} ${sign.name}</td>
        <td class="planet-retro">${retro}</td>
        <td class="planet-house">Ev ${planet.house}</td>
      </tr>
    `;
  });

  // Şans Noktası
  if (chart.partOfFortune) {
    const pof = chart.partOfFortune;
    const pos = formatLongitude(pof.longitude);
    const sign = SIGNS[pos.signIndex];
    rows.push(`
      <tr class="element-${sign.element} pof-row">
        <td class="planet-symbol">${pof.symbol}</td>
        <td class="planet-name">${pof.name}</td>
        <td class="planet-pos">${pos.formatted}</td>
        <td class="planet-full">${pos.degree}°${pos.minute}'${pos.second}" ${signImgFromSign(sign)} ${sign.name}</td>
        <td class="planet-retro"></td>
        <td class="planet-house">${pof.formula}</td>
      </tr>
    `);
  }
  
  elements.planetsTable.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th></th>
          <th>Gezegen</th>
          <th>Pozisyon</th>
          <th>Tam Derece</th>
          <th>R</th>
          <th>Ev</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderHouses(chart) {
  const rows = chart.houses.cusps.map(cusp => {
    const pos = formatLongitude(cusp.longitude, false);
    const sign = SIGNS[pos.signIndex];
    const label = cusp.house === 1 ? 'ASC' :
                  cusp.house === 4 ? 'IC' :
                  cusp.house === 7 ? 'DSC' :
                  cusp.house === 10 ? 'MC' : '';

    // Kıstırılmış burç var mı?
    const intercepted = chart.interceptedSigns.filter(ic => ic.house === cusp.house);
    const interceptedText = intercepted.map(ic => `${signImg(ic.sign)} ${SIGNS[ic.sign].name}`).join(', ');

    return `
      <tr class="element-${sign.element}">
        <td class="house-number">${label ? `<strong>${label}</strong>` : ''} Ev ${cusp.house}</td>
        <td class="house-pos">${pos.formatted}</td>
        <td class="house-full">${pos.degree}°${pos.minute}' ${signImgFromSign(sign)} ${sign.name}</td>
        <td class="house-intercepted">${interceptedText ? `<span class="intercepted-badge">${interceptedText}</span>` : ''}</td>
      </tr>
    `;
  });
  
  elements.housesTable.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Ev</th>
          <th>Cusp</th>
          <th>Tam Derece</th>
          <th>Kıstırılmış</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderAspects(chart) {
  if (chart.aspects.length === 0) {
    elements.aspectsTable.innerHTML = '<p class="no-data">Aspekt bulunamadı</p>';
    return;
  }
  
  // Orb'a göre sırala
  const sorted = [...chart.aspects].sort((a, b) => a.orb - b.orb);
  
  const rows = sorted.map(aspect => {
    const orbDeg = Math.floor(aspect.orb);
    const orbMin = Math.floor((aspect.orb - orbDeg) * 60);
    const applying = aspect.isApplying ? '<span class="applying">A</span>' : '<span class="separating">S</span>';
    
    return `
      <tr>
        <td>${aspect.planet1.symbol} ${aspect.planet1.name}</td>
        <td class="aspect-symbol">${aspect.aspectSymbol}</td>
        <td>${aspect.planet2.symbol} ${aspect.planet2.name}</td>
        <td>${aspect.aspect}</td>
        <td>${orbDeg}°${String(orbMin).padStart(2, '0')}'</td>
        <td>${applying}</td>
      </tr>
    `;
  });
  
  elements.aspectsTable.innerHTML = `
    <table class="data-table aspects-table">
      <thead>
        <tr>
          <th>Gezegen 1</th>
          <th></th>
          <th>Gezegen 2</th>
          <th>Aspekt</th>
          <th>Orb</th>
          <th>A/S</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderDebug(chart) {
  elements.debugOutput.textContent = formatNatalChartText(chart);
}

// ============================================
// MAIN TAB SWITCHING (NATAL / SOLAR RETURN)
// ============================================
function switchMainTab(tabName) {
  document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-main-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`mainTab-${tabName}`).classList.add('active');
}

// ============================================
// TAB SWITCHING (NATAL)
// ============================================
function switchTab(tabName) {
  document.querySelectorAll('.tab[data-tab]').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content:not(.sr-tab-content):not(.lr-tab-content):not(.tr-tab-content)').forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ============================================
// CHART INFO PANEL
// ============================================

function toggleChartInfoPanel(forceState) {
  const panel = $('chartInfoPanel');
  const btn = $('chartInfoToggle');
  if (!panel) return;

  const shouldOpen = forceState !== undefined ? forceState : panel.classList.contains('chart-info-closed');

  if (shouldOpen) {
    panel.classList.remove('chart-info-closed');
    btn?.classList.add('active');
    if (lastNatalChart) renderChartInfoPanel(lastNatalChart);
  } else {
    panel.classList.add('chart-info-closed');
    btn?.classList.remove('active');
  }
}

function renderChartInfoPanel(chart) {
  const content = $('chartInfoContent');
  if (!content || !chart) return;

  // SVG sign file names for inline <img> tags
  const SIGN_SVG_FILES = [
    'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
    'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
  ];
  const signSvg = (idx, size = 14) =>
    `<img src="/Symbols/${SIGN_SVG_FILES[idx]}-symbol-icon.svg" style="width:${size}px;height:${size}px;vertical-align:middle;filter:brightness(0) invert(1);" alt="${SIGNS[idx]?.name || ''}">`;

  let html = '';

  // ============ 1. ELEMENT & NİTELİK (TOP) ============
  const planetScores = {
    'Güneş': 2, 'Ay': 2,
    'Merkür': 1, 'Venüs': 1, 'Mars': 1,
    'Jüpiter': 1, 'Satürn': 1,
    'Uranüs': 1, 'Neptün': 1, 'Plüton': 1,
    'Chiron': 1,
  };

  const allItems = [];
  if (chart.planets) {
    chart.planets.forEach(p => {
      if (planetScores[p.name] !== undefined) {
        const signIdx = Math.floor((p.longitude % 360) / 30) % 12;
        allItems.push({ name: p.name, symbol: p.symbol, signIdx, score: planetScores[p.name] });
      }
    });
  }
  if (chart.houses) {
    const ascIdx = Math.floor((chart.houses.ascendant % 360) / 30) % 12;
    allItems.push({ name: 'Yükselen', symbol: 'ASC', signIdx: ascIdx, score: 1 });
    const mcIdx = Math.floor((chart.houses.mc % 360) / 30) % 12;
    allItems.push({ name: 'Tepe Noktası', symbol: 'MC', signIdx: mcIdx, score: 1 });
  }

  const elCounts = { fire: 0, earth: 0, air: 0, water: 0 };
  const modCounts = { cardinal: 0, fixed: 0, mutable: 0 };
  const cross = {};
  ['cardinal', 'fixed', 'mutable'].forEach(m => {
    cross[m] = { fire: 0, earth: 0, air: 0, water: 0 };
  });
  for (const item of allItems) {
    const sign = SIGNS[item.signIdx];
    if (!sign) continue;
    elCounts[sign.element] += item.score;
    modCounts[sign.modality] += item.score;
    cross[sign.modality][sign.element] += item.score;
  }

  // Badges: all elements on one line, modalities on second line, no emojis
  html += '<div style="display:flex;gap:6px;margin-bottom:6px;">';
  html += `<span class="badge badge-fire">Ateş: ${elCounts.fire}</span>`;
  html += `<span class="badge badge-earth">Toprak: ${elCounts.earth}</span>`;
  html += `<span class="badge badge-air">Hava: ${elCounts.air}</span>`;
  html += `<span class="badge badge-water">Su: ${elCounts.water}</span>`;
  html += '</div>';
  html += '<div style="display:flex;gap:6px;margin-bottom:10px;">';
  html += `<span class="badge badge-cardinal">Öncü: ${modCounts.cardinal}</span>`;
  html += `<span class="badge badge-fixed">Sabit: ${modCounts.fixed}</span>`;
  html += `<span class="badge badge-mutable">Değişken: ${modCounts.mutable}</span>`;
  html += '</div>';

  // Planet colors (same as chart wheel)
  // Brighter colors for dark background readability
  const PANEL_PLANET_COLORS = {
    'Güneş': '#FFD700', 'Ay': '#C4A882', 'Merkür': '#44DD44', 'Venüs': '#22CCCC',
    'Mars': '#FF4444', 'Jüpiter': '#FFaa33', 'Satürn': '#CCAA44', 'Uranüs': '#55CC88',
    'Neptün': '#6688FF', 'Plüton': '#CC66CC', 'KAD': '#DD5555', 'GAD': '#88AA55',
    'Chiron': '#66AAAA', 'Şans Noktası': '#AAAAAA',
  };
  const PANEL_ELEMENT_COLORS = { fire: '#ff4444', earth: '#44cc44', air: '#00ccc8', water: '#4488ff' };
  const elBorder = (el) => PANEL_ELEMENT_COLORS[el] || '#555';

  // ============ 2. GEZEGENLER ============
  html += '<h4>🪐 GEZEGENLER</h4>';
  const planetRow = (sym, name, lon, isRetro) => {
    const signIdx = Math.floor((lon % 360) / 30) % 12;
    const sign = SIGNS[signIdx];
    if (!sign) return '';
    const deg = Math.floor(lon % 30);
    const min = Math.floor(((lon % 30) - deg) * 60);
    const retro = isRetro ? ' <span style="color:#DC143C;font-weight:bold">Rx</span>' : '';
    const pColor = PANEL_PLANET_COLORS[name] || '#ccc';
    const borderColor = elBorder(sign.element);
    return `<div class="info-row planet-row" style="border:1.5px solid ${borderColor};border-left:4px solid ${borderColor};border-radius:6px;margin-bottom:6px;">
      <span class="planet-col" style="color:${pColor}">${sym} ${name}</span>
      <span class="sign-col element-${sign.element}">${sign.name} ${signSvg(signIdx)} • ${deg}°${String(min).padStart(2,'0')}'${retro}</span>
    </div>`;
  };
  if (chart.planets) {
    chart.planets.forEach(p => { html += planetRow(p.symbol, p.name, p.longitude, p.isRetrograde); });
  }
  if (chart.partOfFortune) {
    const pof = chart.partOfFortune;
    html += planetRow(pof.symbol, pof.name, pof.longitude, false);
  }

  // ============ 3. EVLER ============
  html += '<h4>🏠 EVLER</h4>';
  const cusps = chart.houses?.cusps || [];
  cusps.forEach((cusp, i) => {
    // cusps can be objects {longitude} or numbers
    const lon = typeof cusp === 'object' ? cusp.longitude : cusp;
    const signIdx = Math.floor((lon % 360) / 30) % 12;
    const sign = SIGNS[signIdx];
    if (!sign) return;
    const deg = Math.floor(lon % 30);
    const min = Math.floor(((lon % 30) - deg) * 60);
    const hBorderColor = elBorder(sign.element);
    html += `<div class="info-row planet-row" style="border:1.5px solid ${hBorderColor};border-left:4px solid ${hBorderColor};border-radius:6px;margin-bottom:6px;">
      <span class="planet-col">${i + 1}. Ev</span>
      <span class="sign-col element-${sign.element}">${sign.name} ${signSvg(signIdx)} • ${deg}°${String(min).padStart(2,'0')}'</span>
    </div>`;
  });

  content.innerHTML = html;
}

// Store last natal chart for panel rendering
let lastNatalChart = null;

// ============================================
// SOLAR RETURN
// ============================================

function showSolarReturnPanel() {
  
  // Mevcut yılı default olarak ayarla
  const currentYear = new Date().getFullYear();
  elements.srYear.value = currentYear;
  
  // Doğum yeri adını göster
  if (selectedCity) {
    elements.srBirthPlaceName.textContent = `(${formatCityName(selectedCity)})`;
  }
  
  // SR butonunu aktif et
  updateSRButtonState();
}

function handleSRLocationChange() {
  const isBirth = elements.srLocBirth.checked;
  
  // Radio label styling
  elements.srLocBirthLabel.classList.toggle('active', isBirth);
  elements.srLocCustomLabel.classList.toggle('active', !isBirth);
  
  // Custom location section
  if (isBirth) {
    elements.srCustomLocationSection.classList.add('hidden');
  } else {
    elements.srCustomLocationSection.classList.remove('hidden');
  }
  
  updateSRButtonState();
}

function updateSRButtonState() {
  const yearVal = parseInt(elements.srYear.value);
  const hasYear = !isNaN(yearVal) && yearVal >= 1900 && yearVal <= 2100;
  
  const isBirth = elements.srLocBirth.checked;
  const hasLocation = isBirth ? !!selectedCity : !!srSelectedCity;
  
  elements.srCalculateBtn.disabled = !(hasYear && hasLocation);
}

// SR City Search
function handleSRCitySearch(e) {
  const query = e.target.value.trim();
  
  if (srSearchTimeout) clearTimeout(srSearchTimeout);
  
  if (query.length < 2) {
    elements.srCityDropdown.classList.add('hidden');
    elements.srCityDropdown.innerHTML = '';
    return;
  }
  
  srSearchTimeout = setTimeout(async () => {
    try {
      const results = await searchCity(query);
      renderSRCityResults(results);
    } catch (error) {
      console.error('SR şehir arama hatası:', error);
    }
  }, 300);
}

function renderSRCityResults(results) {
  if (results.length === 0) {
    elements.srCityDropdown.innerHTML = '<div class="city-option no-results">Sonuç bulunamadı</div>';
    elements.srCityDropdown.classList.remove('hidden');
    return;
  }
  
  elements.srCityDropdown.innerHTML = results.map((city, index) => `
    <div class="city-option" data-index="${index}">
      <span class="city-name">${city.name}</span>
      <span class="city-detail">${city.admin ? city.admin + ', ' : ''}${city.country}</span>
      <span class="city-coords">${city.lat.toFixed(2)}°, ${city.lng.toFixed(2)}°</span>
    </div>
  `).join('');
  
  elements.srCityDropdown.querySelectorAll('.city-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const index = parseInt(opt.dataset.index);
      selectSRCity(results[index]);
    });
  });
  
  elements.srCityDropdown.classList.remove('hidden');
}

function selectSRCity(city) {
  srSelectedCity = city;
  elements.srCitySearch.value = formatCityName(city);
  elements.srCityDropdown.classList.add('hidden');
  
  elements.srLocationInfo.classList.remove('hidden');
  elements.srCoordDisplay.textContent = formatCoordinates(city.lat, city.lng);
  elements.srTimezoneDisplay.textContent = city.timezone;
  
  updateSRButtonState();
}

// SR Calculate
async function handleSRCalculate() {
  if (!currentChart) {
    alert('Önce natal harita hesaplayın.');
    return;
  }
  
  const year = parseInt(elements.srYear.value);
  const isBirth = elements.srLocBirth.checked;
  
  // Konum belirle
  const locationCity = isBirth ? selectedCity : srSelectedCity;
  if (!locationCity) {
    alert('Lütfen bir konum seçin.');
    return;
  }
  
  const location = {
    latitude: locationCity.lat,
    longitude: locationCity.lng,
    timezone: locationCity.timezone,
    name: formatCityName(locationCity),
  };
  
  // Loading state
  elements.srCalculateBtn.disabled = true;
  elements.srCalculateBtn.innerHTML = '<span class="btn-icon">⏳</span> Hesaplanıyor...';
  
  try {
    currentSolarReturn = await calculateSolarReturn(currentChart, year, location);
    renderSRResults(currentSolarReturn);
    elements.srResults.classList.remove('hidden');
    
    // Scroll to SR results
    elements.srResults.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Solar Return hesaplama hatası:', error);
    alert('Solar Return hesaplama hatası: ' + error.message);
  } finally {
    elements.srCalculateBtn.disabled = false;
    elements.srCalculateBtn.innerHTML = '<span class="btn-icon">☀️</span> Solar Return Hesapla';
  }
}

// ============================================
// RENDER DECANS
// ============================================

// Dekanlarda/7'lerde sadece 5 ana açıyı göster
const DECAN_ASPECT_ANGLES = [0, 60, 90, 120, 180]; // Kavuşum, Altıgen, Kare, Üçgen, Karşıt

function filterDecanAspects(aspects) {
  if (!aspects || !aspects.length) return [];
  return aspects.filter(a => DECAN_ASPECT_ANGLES.includes(a.angle));
}

function getAspectCountForPlanet(planetName, aspects) {
  if (!aspects || !aspects.length) return 0;
  return filterDecanAspects(aspects).filter(a => a.planet1.name === planetName || a.planet2.name === planetName).length;
}

function getAspectsForPlanet(planetName, aspects) {
  if (!aspects || !aspects.length) return [];
  return filterDecanAspects(aspects).filter(a => a.planet1.name === planetName || a.planet2.name === planetName);
}

function renderPlanetAspectsList(planetName, aspects) {
  const planetAspects = getAspectsForPlanet(planetName, aspects);
  if (!planetAspects.length) return '';

  const items = planetAspects.map(a => {
    const other = a.planet1.name === planetName ? a.planet2 : a.planet1;
    const orbDeg = a.orb.toFixed(1);
    return `<div class="planet-aspect-item">
      <span class="aspect-item-symbol">${a.aspectSymbol}</span>
      <span class="aspect-item-name">${a.aspect}</span>
      <span class="aspect-item-planet">${other.symbol} ${other.name}</span>
      <span class="aspect-item-orb">(${orbDeg}°)</span>
    </div>`;
  }).join('');

  return `<div class="planet-aspects hidden">${items}</div>`;
}

function renderPlanetRow(p, aspects) {
  const pPos = formatLongitude(p.longitude, false);
  const pSign = SIGNS[p.signIndex];
  const aspectCount = getAspectCountForPlanet(p.name, aspects);
  const aspectBadge = aspectCount > 0
    ? `<span class="aspect-toggle" data-planet="${p.name}">▼ ${aspectCount} açı</span>`
    : '';
  const aspectsList = renderPlanetAspectsList(p.name, aspects);

  return `
    <div class="decan-planet-row">
      <span class="decan-planet-left-border element-border-${pSign.element}"></span>
      <span class="decan-planet-info">
        ${p.symbol} ${p.name} • ${pSign.name} ${signImgFromSign(pSign)} • ${pPos.degree}°${String(pPos.minute).padStart(2, '0')}' ${aspectBadge}
      </span>
    </div>
    ${aspectsList}`;
}

function formatDecanDegree(longitude) {
  const pos = formatLongitude(longitude, false);
  return `${pos.degree}° ${String(pos.minute).padStart(2, '0')}'`;
}

function formatSpanDMS(spanDeg) {
  const d = Math.floor(spanDeg);
  const m = Math.floor((spanDeg - d) * 60);
  return `${d}° ${String(m).padStart(2, '0')}'`;
}

function timingDateStr(enterDate, durationDays, fraction) {
  const d = new Date(enterDate.year, enterDate.month - 1, enterDate.day, enterDate.hour || 0, enterDate.minute || 0);
  d.setTime(d.getTime() + fraction * durationDays * 86400000);
  const months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  return `${d.getDate()} ${months[d.getMonth() + 1]} ${d.getFullYear()}`;
}

function renderDecanHTML(decanData, aspects, houseTiming) {
  const months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  return `<div class="decans-list">${decanData.map(h => {
    const element = h.houseSign.element;
    const decanSizeDeg = h.span / 3;

    const timing = houseTiming ? houseTiming.find(t => t.house === h.house) : null;
    const timingHeader = timing ? (() => {
      const ed = timing.enterDate;
      const ld = timing.leaveDate;
      const enterStr = `${ed.day} ${months[ed.month]} ${ed.year}`;
      const leaveStr = `${ld.day} ${months[ld.month]} ${ld.year}`;
      return `<span class="decan-house-timing">${enterStr} → ${leaveStr} • ${timing.durationDays.toFixed(1)} gün</span>`;
    })() : '';

    return `
      <div class="decan-house-card">
        <div class="decan-house-header">
          <span class="decan-house-number element-bg-${element}">${h.house}</span>
          <span class="decan-house-title">Ev • ${signImgFromSign(h.houseSign)} <span class="decan-sign-name element-text-${element}">${h.houseSign.name}</span></span>
          ${timingHeader}
        </div>
        <div class="decan-items">
          ${h.decans.map(d => {
            const startSign = SIGNS[Math.floor(d.startLongitude / 30)];
            const decanSign = d.decanSign;
            const startPos = formatDecanDegree(d.startLongitude);
            const planetRows = d.planets.map(p => renderPlanetRow(p, aspects)).join('');

            // Dekan tarih aralığı (varsa)
            const decanTiming = timing ? (() => {
              const f0 = d.index / 3;
              const f1 = (d.index + 1) / 3;
              const dStart = timingDateStr(timing.enterDate, timing.durationDays, f0);
              const dEnd = timingDateStr(timing.enterDate, timing.durationDays, f1);
              return `<span class="decan-dates">${dStart} → ${dEnd}</span>`;
            })() : '';

            return `
              <div class="decan-bar element-decan-${decanSign.element}">
                <span class="decan-label">${d.index + 1}. dekan</span>
                <span class="decan-dot">•</span>
                <span class="decan-start">${startPos}</span>
                <span class="decan-from-sign">${signImgFromSign(startSign)} ${startSign.name}</span>
                <span class="decan-arrow">→</span>
                <span class="decan-to-sign">${signImgFromSign(decanSign)} <strong>${decanSign.name}</strong></span>
                <span class="decan-ruler">(${d.ruler.symbol} ${d.ruler.name})</span>
                ${decanTiming}
              </div>
              ${planetRows}`;
          }).join('')}
        </div>
        <div class="decan-house-footer">
          Ev toplam: ${formatSpanDMS(h.span)} — Dekan: ${formatSpanDMS(decanSizeDeg)}
        </div>
      </div>`;
  }).join('')}</div>`;
}

function getAllPlanets(chartData) {
  const all = [...chartData.planets];
  if (chartData.partOfFortune) {
    const pof = chartData.partOfFortune;
    all.push({
      ...pof,
      id: -99,
      house: pof.house ?? findHouseForPof(pof.longitude, chartData.houses.cusps),
    });
  }
  return all;
}

function findHouseForPof(lon, cusps) {
  for (let i = 0; i < cusps.length; i++) {
    const curr = cusps[i].longitude;
    const next = cusps[(i + 1) % cusps.length].longitude;
    let span = next - curr;
    if (span <= 0) span += 360;
    let offset = lon - curr;
    if (offset < 0) offset += 360;
    if (offset < span) return cusps[i].house;
  }
  return 1;
}

function renderDecans(chart) {
  if (!elements.decansDisplay) return;
  const allPlanets = getAllPlanets(chart);
  const decanData = calculateHouseDecans(chart.houses, allPlanets);
  elements.decansDisplay.innerHTML = renderDecanHTML(decanData, chart.aspects);
}

function renderSRDecans(sr) {
  if (!elements.srDecansDisplay) return;
  const allPlanets = getAllPlanets(sr);
  const decanData = calculateHouseDecans(sr.houses, allPlanets);
  const houseTiming = calculateSRHouseTiming(sr);
  elements.srDecansDisplay.innerHTML = renderDecanHTML(decanData, sr.aspects, houseTiming);
}


// ============================================
// RENDER 7'LER KANUNU
// ============================================

function renderSevens(chart) {
  if (!elements.sevensDisplay) return;
  const allPlanets = getAllPlanets(chart);
  const data = calculateSevenYearCycles(chart.houses, allPlanets, chart.birthData.year);
  elements.sevensDisplay.innerHTML = renderSevensHTML(data, chart.aspects);

  // Natal harita + 7'ler overlay
  const canvas = $('sevensChartCanvas');
  if (canvas) {
    const bd = chart.birthData;
    const months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const dateStr = `${bd.day} ${months[bd.month]} ${bd.year}`;
    const timeStr = `${String(bd.hour).padStart(2, '0')}:${String(bd.minute).padStart(2, '0')}`;
    const cityName = selectedCity ? formatCityName(selectedCity) : '';

    drawChartWheel(canvas, chart, {
      title: '7\'ler Kanunu',
      subtitle: `Natal Chart\n${dateStr}\n${timeStr}  ${getUtcOffsetStr(bd)}\n${bd.timezone}\n${cityName}`,
      showAspects: false,
      chartType: 'natal',
    });
    drawSevenYearOverlay(canvas, chart, data);
  }
}

function renderSevensHTML(data, aspects) {
  const decanSizeDeg = data.length > 0 ? data[0].span / 3 : 0;

  const titleCard = `
    <div class="sevens-title-card">
      <div class="sevens-title">🏠 7'ler Kanunu - Asli Dekan Sistemi</div>
      <div class="sevens-subtitle">Her yaş pozisyonunun asli dekanını gösterir (0-10°: 1.dekan, 10-20°: 2.dekan, 20-30°: 3.dekan)</div>
    </div>`;

  return `${titleCard}<div class="decans-list">${data.map(h => {
    const element = h.houseSign.element;
    const hDecanSize = h.span / 3;

    return `
      <div class="decan-house-card">
        <div class="decan-house-header">
          <span class="decan-house-number element-bg-${element}">${h.house}</span>
          <span class="decan-house-title">Ev • ${signImgFromSign(h.houseSign)} <span class="decan-sign-name element-text-${element}">${h.houseSign.name}</span></span>
        </div>
        <div class="decan-items">
          ${h.years.map(y => {
            const decanSign = y.decanSign;
            const startPos = formatDecanDegree(y.startLongitude);
            const planetRows = y.planets.map(p => renderPlanetRow(p, aspects)).join('');
            const ageEnd = y.age + 1;
            const yearEnd = y.calendarYear + 1;

            return `
              <div class="decan-bar element-decan-${decanSign.element}">
                <span class="decan-age-badge">${y.age}</span>
                <span class="decan-label">${y.age}–${ageEnd} yaş</span>
                <span class="decan-dot">•</span>
                <span class="decan-year"><strong>${y.calendarYear}–${yearEnd}</strong></span>
                <span class="decan-dot">•</span>
                <span class="decan-start">${startPos}</span>
                <span class="decan-from-sign">${signImgFromSign(y.sign)} ${y.sign.name}</span>
                <span class="decan-arrow">→</span>
                <span class="decan-to-sign">${signImgFromSign(decanSign)} <strong>${decanSign.name}</strong></span>
                <span class="decan-ruler">(${y.ruler.symbol} ${y.ruler.name})</span>
              </div>
              ${planetRows}`;
          }).join('')}
        </div>
        <div class="decan-house-footer">
          Ev: ${formatSpanDMS(h.span)} — Dekan: ${hDecanSize.toFixed(1)}°
        </div>
      </div>`;
  }).join('')}</div>`;
}

// ============================================
// RENDER SR RESULTS
// ============================================

function renderSRResults(sr) {
  renderSRTimingCard(sr);
  renderSRChart(sr);
  renderSRPlanets(sr);
  renderSRHouses(sr);
  renderSRAspects(sr);
  renderSRDebug(sr);
  renderSRDecans(sr);
}

function renderSRChart(sr) {
  const canvas = $('srChartCanvas');
  if (!canvas) return;
  
  const l = sr.local;
  const months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const dateStr = `${l.day} ${months[l.month]} ${l.year}`;
  const timeStr = `${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}:${String(l.second).padStart(2, '0')}`;
  const locName = sr.location?.name || '';
  
  drawChartWheel(canvas, sr, {
    title: 'Solar Return',
    subtitle: `Solar Return\n${dateStr}\n${timeStr}  ${sr.location?.timezone || ''}\n${locName}`,
    showAspects: true,
    chartType: 'solar',
  });
}

function renderSRTimingCard(sr) {
  const l = sr.local;
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
  
  // Haftanın günü hesapla
  const dateObj = new Date(l.year, l.month - 1, l.day);
  const dayName = dayNames[dateObj.getDay()];
  
  const natalSunPos = formatLongitude(sr.natalSun.longitude);
  const srAscPos = formatLongitude(sr.houses.ascendant);
  const srMcPos = formatLongitude(sr.houses.mc);
  
  elements.srTimingCard.innerHTML = `
    <div class="sr-timing-grid">
      <div class="sr-timing-main">
        <div class="sr-timing-date">
          <span class="sr-timing-icon">☀️</span>
          <span class="sr-timing-value">${l.day} ${monthNames[l.month]} ${l.year}, ${dayName}</span>
        </div>
        <div class="sr-timing-time">
          <span class="sr-timing-label">Yerel Saat:</span>
          <span class="sr-timing-value">${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}:${String(l.second).padStart(2, '0')}</span>
          <span class="sr-timing-tz">${l.utcOffsetFormatted}</span>
        </div>
        <div class="sr-timing-place">
          <span class="sr-timing-label">Konum:</span>
          <span class="sr-timing-value">${sr.location.name || 'Doğum yeri'}</span>
        </div>
      </div>
      <div class="sr-timing-points">
        <div class="sr-point">
          <span class="sr-point-label">Natal ☉</span>
          <span class="sr-point-value">${natalSunPos.formatted}</span>
        </div>
        <div class="sr-point">
          <span class="sr-point-label">SR ASC</span>
          <span class="sr-point-value">${srAscPos.formatted}</span>
        </div>
        <div class="sr-point">
          <span class="sr-point-label">SR MC</span>
          <span class="sr-point-value">${srMcPos.formatted}</span>
        </div>
      </div>
    </div>
  `;
}

function renderSRPlanets(sr) {
  const rows = sr.planets.map(planet => {
    const pos = formatLongitude(planet.longitude);
    const retro = planet.isRetrograde ? '<span class="retro-badge">R</span>' : '';
    const sign = SIGNS[pos.signIndex];

    return `
      <tr class="element-${sign.element}">
        <td class="planet-symbol">${planet.symbol}</td>
        <td class="planet-name">${planet.name}</td>
        <td class="planet-pos">${pos.formatted}</td>
        <td class="planet-full">${pos.degree}°${pos.minute}'${pos.second}" ${signImgFromSign(sign)} ${sign.name}</td>
        <td class="planet-retro">${retro}</td>
        <td class="planet-house">Ev ${planet.house}</td>
      </tr>
    `;
  });

  // Şans Noktası
  if (sr.partOfFortune) {
    const pof = sr.partOfFortune;
    const pos = formatLongitude(pof.longitude);
    const sign = SIGNS[pos.signIndex];
    rows.push(`
      <tr class="element-${sign.element} pof-row">
        <td class="planet-symbol">${pof.symbol}</td>
        <td class="planet-name">${pof.name}</td>
        <td class="planet-pos">${pos.formatted}</td>
        <td class="planet-full">${pos.degree}°${pos.minute}'${pos.second}" ${signImgFromSign(sign)} ${sign.name}</td>
        <td class="planet-retro"></td>
        <td class="planet-house">Ev ${pof.house}</td>
      </tr>
    `);
  }
  
  elements.srPlanetsTable.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th></th>
          <th>Gezegen</th>
          <th>Pozisyon</th>
          <th>Tam Derece</th>
          <th>R</th>
          <th>Ev</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderSRHouses(sr) {
  const rows = sr.houses.cusps.map(cusp => {
    const pos = formatLongitude(cusp.longitude, false);
    const sign = SIGNS[pos.signIndex];
    const label = cusp.house === 1 ? 'ASC' :
                  cusp.house === 4 ? 'IC' :
                  cusp.house === 7 ? 'DSC' :
                  cusp.house === 10 ? 'MC' : '';

    const intercepted = sr.interceptedSigns.filter(ic => ic.house === cusp.house);
    const interceptedText = intercepted.map(ic => `${signImg(ic.sign)} ${SIGNS[ic.sign].name}`).join(', ');

    return `
      <tr class="element-${sign.element}">
        <td class="house-number">${label ? `<strong>${label}</strong>` : ''} Ev ${cusp.house}</td>
        <td class="house-pos">${pos.formatted}</td>
        <td class="house-full">${pos.degree}°${pos.minute}' ${signImgFromSign(sign)} ${sign.name}</td>
        <td class="house-intercepted">${interceptedText ? `<span class="intercepted-badge">${interceptedText}</span>` : ''}</td>
      </tr>
    `;
  });
  
  elements.srHousesTable.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Ev</th>
          <th>Cusp</th>
          <th>Tam Derece</th>
          <th>Kıstırılmış</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderSRAspects(sr) {
  if (sr.aspects.length === 0) {
    elements.srAspectsTable.innerHTML = '<p class="no-data">Aspekt bulunamadı</p>';
    return;
  }
  
  const sorted = [...sr.aspects].sort((a, b) => a.orb - b.orb);
  
  const rows = sorted.map(aspect => {
    const orbDeg = Math.floor(aspect.orb);
    const orbMin = Math.floor((aspect.orb - orbDeg) * 60);
    const applying = aspect.isApplying ? '<span class="applying">A</span>' : '<span class="separating">S</span>';
    
    return `
      <tr>
        <td>${aspect.planet1.symbol} ${aspect.planet1.name}</td>
        <td class="aspect-symbol">${aspect.aspectSymbol}</td>
        <td>${aspect.planet2.symbol} ${aspect.planet2.name}</td>
        <td>${aspect.aspect}</td>
        <td>${orbDeg}°${String(orbMin).padStart(2, '0')}'</td>
        <td>${applying}</td>
      </tr>
    `;
  });
  
  elements.srAspectsTable.innerHTML = `
    <table class="data-table aspects-table">
      <thead>
        <tr>
          <th>Gezegen 1</th>
          <th></th>
          <th>Gezegen 2</th>
          <th>Aspekt</th>
          <th>Orb</th>
          <th>A/S</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderSRDebug(sr) {
  elements.srDebugOutput.textContent = formatSolarReturnText(sr);
}

// SR Tab Switching
function switchSRTab(tabName) {
  document.querySelectorAll('.tab[data-sr-tab]').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.sr-tab-content').forEach(c => c.classList.remove('active'));
  
  document.querySelector(`[data-sr-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ============================================
// LUNAR RETURN
// ============================================

function showLunarReturnPanel() {
  // Mevcut yıl ve ayı default olarak ayarla
  const now = new Date();
  elements.lrYear.value = now.getFullYear();
  elements.lrMonth.value = now.getMonth() + 1;

  // Doğum yeri adını göster
  if (selectedCity) {
    elements.lrBirthPlaceName.textContent = `(${formatCityName(selectedCity)})`;
  }

  // LR butonunu aktif et
  updateLRButtonState();
}

function handleLRLocationChange() {
  const isBirth = elements.lrLocBirth.checked;

  // Radio label styling
  elements.lrLocBirthLabel.classList.toggle('active', isBirth);
  elements.lrLocCustomLabel.classList.toggle('active', !isBirth);

  // Custom location section
  if (isBirth) {
    elements.lrCustomLocationSection.classList.add('hidden');
  } else {
    elements.lrCustomLocationSection.classList.remove('hidden');
  }

  updateLRButtonState();
}

function updateLRButtonState() {
  const yearVal = parseInt(elements.lrYear.value);
  const hasYear = !isNaN(yearVal) && yearVal >= 1900 && yearVal <= 2100;

  const isBirth = elements.lrLocBirth.checked;
  const hasLocation = isBirth ? !!selectedCity : !!lrSelectedCity;

  elements.lrCalculateBtn.disabled = !(hasYear && hasLocation);
}

// LR City Search
function handleLRCitySearch(e) {
  const query = e.target.value.trim();

  if (lrSearchTimeout) clearTimeout(lrSearchTimeout);

  if (query.length < 2) {
    elements.lrCityDropdown.classList.add('hidden');
    elements.lrCityDropdown.innerHTML = '';
    return;
  }

  lrSearchTimeout = setTimeout(async () => {
    try {
      const results = await searchCity(query);
      renderLRCityResults(results);
    } catch (error) {
      console.error('LR şehir arama hatası:', error);
    }
  }, 300);
}

function renderLRCityResults(results) {
  if (results.length === 0) {
    elements.lrCityDropdown.innerHTML = '<div class="city-option no-results">Sonuç bulunamadı</div>';
    elements.lrCityDropdown.classList.remove('hidden');
    return;
  }

  elements.lrCityDropdown.innerHTML = results.map((city, index) => `
    <div class="city-option" data-index="${index}">
      <span class="city-name">${city.name}</span>
      <span class="city-detail">${city.admin ? city.admin + ', ' : ''}${city.country}</span>
      <span class="city-coords">${city.lat.toFixed(2)}°, ${city.lng.toFixed(2)}°</span>
    </div>
  `).join('');

  elements.lrCityDropdown.querySelectorAll('.city-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const index = parseInt(opt.dataset.index);
      selectLRCity(results[index]);
    });
  });

  elements.lrCityDropdown.classList.remove('hidden');
}

function selectLRCity(city) {
  lrSelectedCity = city;
  elements.lrCitySearch.value = formatCityName(city);
  elements.lrCityDropdown.classList.add('hidden');

  elements.lrLocationInfo.classList.remove('hidden');
  elements.lrCoordDisplay.textContent = formatCoordinates(city.lat, city.lng);
  elements.lrTimezoneDisplay.textContent = city.timezone;

  updateLRButtonState();
}

// LR Calculate
async function handleLRCalculate() {
  if (!currentChart) {
    alert('Önce natal harita hesaplayın.');
    return;
  }

  const year = parseInt(elements.lrYear.value);
  const month = parseInt(elements.lrMonth.value);
  const isBirth = elements.lrLocBirth.checked;

  // Konum belirle
  const locationCity = isBirth ? selectedCity : lrSelectedCity;
  if (!locationCity) {
    alert('Lütfen bir konum seçin.');
    return;
  }

  const location = {
    latitude: locationCity.lat,
    longitude: locationCity.lng,
    timezone: locationCity.timezone,
    name: formatCityName(locationCity),
  };

  // Loading state
  elements.lrCalculateBtn.disabled = true;
  elements.lrCalculateBtn.innerHTML = '<span class="btn-icon">⏳</span> Hesaplanıyor...';

  try {
    currentLunarReturn = await calculateLunarReturn(currentChart, year, month, location);
    renderLRResults(currentLunarReturn);
    elements.lrResults.classList.remove('hidden');

    // Scroll to LR results
    elements.lrResults.scrollIntoView({ behavior: 'smooth' });
  } catch (error) {
    console.error('Lunar Return hesaplama hatası:', error);
    alert('Lunar Return hesaplama hatası: ' + error.message);
  } finally {
    elements.lrCalculateBtn.disabled = false;
    elements.lrCalculateBtn.innerHTML = '<span class="btn-icon">🌙</span> Lunar Return Hesapla';
  }
}

// ============================================
// RENDER LR RESULTS
// ============================================

function renderLRResults(lr) {
  renderLRTimingCard(lr);
  renderLRChart(lr);
  renderLRPlanets(lr);
  renderLRHouses(lr);
  renderLRAspects(lr);
  renderLRDebug(lr);
  renderLRDecans(lr);
}

function renderLRChart(lr) {
  const canvas = $('lrChartCanvas');
  if (!canvas) return;

  const l = lr.local;
  const months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const dateStr = `${l.day} ${months[l.month]} ${l.year}`;
  const timeStr = `${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}:${String(l.second).padStart(2, '0')}`;
  const locName = lr.location?.name || '';

  drawChartWheel(canvas, lr, {
    title: 'Lunar Return',
    subtitle: `Lunar Return\n${dateStr}\n${timeStr}  ${lr.location?.timezone || ''}\n${locName}`,
    showAspects: true,
    chartType: 'lunar',
  });
}

function renderLRTimingCard(lr) {
  const l = lr.local;
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  const monthNames = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  const dateObj = new Date(l.year, l.month - 1, l.day);
  const dayName = dayNames[dateObj.getDay()];

  const natalMoonPos = formatLongitude(lr.natalMoon.longitude);
  const lrAscPos = formatLongitude(lr.houses.ascendant);
  const lrMcPos = formatLongitude(lr.houses.mc);

  elements.lrTimingCard.innerHTML = `
    <div class="lr-timing-grid">
      <div class="lr-timing-main">
        <div class="lr-timing-date">
          <span class="lr-timing-icon">🌙</span>
          <span class="lr-timing-value">${l.day} ${monthNames[l.month]} ${l.year}, ${dayName}</span>
        </div>
        <div class="lr-timing-time">
          <span class="lr-timing-label">Yerel Saat:</span>
          <span class="lr-timing-value">${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}:${String(l.second).padStart(2, '0')}</span>
          <span class="lr-timing-tz">${l.utcOffsetFormatted}</span>
        </div>
        <div class="lr-timing-place">
          <span class="lr-timing-label">Konum:</span>
          <span class="lr-timing-value">${lr.location.name || 'Doğum yeri'}</span>
        </div>
      </div>
      <div class="lr-timing-points">
        <div class="lr-point">
          <span class="lr-point-label">Natal ☽</span>
          <span class="lr-point-value">${natalMoonPos.formatted}</span>
        </div>
        <div class="lr-point">
          <span class="lr-point-label">LR ASC</span>
          <span class="lr-point-value">${lrAscPos.formatted}</span>
        </div>
        <div class="lr-point">
          <span class="lr-point-label">LR MC</span>
          <span class="lr-point-value">${lrMcPos.formatted}</span>
        </div>
      </div>
    </div>
  `;
}

function renderLRPlanets(lr) {
  const rows = lr.planets.map(planet => {
    const pos = formatLongitude(planet.longitude);
    const retro = planet.isRetrograde ? '<span class="retro-badge">R</span>' : '';
    const sign = SIGNS[pos.signIndex];

    return `
      <tr class="element-${sign.element}">
        <td class="planet-symbol">${planet.symbol}</td>
        <td class="planet-name">${planet.name}</td>
        <td class="planet-pos">${pos.formatted}</td>
        <td class="planet-full">${pos.degree}°${pos.minute}'${pos.second}" ${signImgFromSign(sign)} ${sign.name}</td>
        <td class="planet-retro">${retro}</td>
        <td class="planet-house">Ev ${planet.house}</td>
      </tr>
    `;
  });

  // Şans Noktası
  if (lr.partOfFortune) {
    const pof = lr.partOfFortune;
    const pos = formatLongitude(pof.longitude);
    const sign = SIGNS[pos.signIndex];
    rows.push(`
      <tr class="element-${sign.element} pof-row">
        <td class="planet-symbol">${pof.symbol}</td>
        <td class="planet-name">${pof.name}</td>
        <td class="planet-pos">${pos.formatted}</td>
        <td class="planet-full">${pos.degree}°${pos.minute}'${pos.second}" ${signImgFromSign(sign)} ${sign.name}</td>
        <td class="planet-retro"></td>
        <td class="planet-house">Ev ${pof.house}</td>
      </tr>
    `);
  }

  elements.lrPlanetsTable.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th></th>
          <th>Gezegen</th>
          <th>Pozisyon</th>
          <th>Tam Derece</th>
          <th>R</th>
          <th>Ev</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderLRHouses(lr) {
  const rows = lr.houses.cusps.map(cusp => {
    const pos = formatLongitude(cusp.longitude, false);
    const sign = SIGNS[pos.signIndex];
    const label = cusp.house === 1 ? 'ASC' :
                  cusp.house === 4 ? 'IC' :
                  cusp.house === 7 ? 'DSC' :
                  cusp.house === 10 ? 'MC' : '';

    const intercepted = lr.interceptedSigns.filter(ic => ic.house === cusp.house);
    const interceptedText = intercepted.map(ic => `${signImg(ic.sign)} ${SIGNS[ic.sign].name}`).join(', ');

    return `
      <tr class="element-${sign.element}">
        <td class="house-number">${label ? `<strong>${label}</strong>` : ''} Ev ${cusp.house}</td>
        <td class="house-pos">${pos.formatted}</td>
        <td class="house-full">${pos.degree}°${pos.minute}' ${signImgFromSign(sign)} ${sign.name}</td>
        <td class="house-intercepted">${interceptedText ? `<span class="intercepted-badge">${interceptedText}</span>` : ''}</td>
      </tr>
    `;
  });

  elements.lrHousesTable.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Ev</th>
          <th>Cusp</th>
          <th>Tam Derece</th>
          <th>Kıstırılmış</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderLRAspects(lr) {
  if (lr.aspects.length === 0) {
    elements.lrAspectsTable.innerHTML = '<p class="no-data">Aspekt bulunamadı</p>';
    return;
  }

  const sorted = [...lr.aspects].sort((a, b) => a.orb - b.orb);

  const rows = sorted.map(aspect => {
    const orbDeg = Math.floor(aspect.orb);
    const orbMin = Math.floor((aspect.orb - orbDeg) * 60);
    const applying = aspect.isApplying ? '<span class="applying">A</span>' : '<span class="separating">S</span>';

    return `
      <tr>
        <td>${aspect.planet1.symbol} ${aspect.planet1.name}</td>
        <td class="aspect-symbol">${aspect.aspectSymbol}</td>
        <td>${aspect.planet2.symbol} ${aspect.planet2.name}</td>
        <td>${aspect.aspect}</td>
        <td>${orbDeg}°${String(orbMin).padStart(2, '0')}'</td>
        <td>${applying}</td>
      </tr>
    `;
  });

  elements.lrAspectsTable.innerHTML = `
    <table class="data-table aspects-table">
      <thead>
        <tr>
          <th>Gezegen 1</th>
          <th></th>
          <th>Gezegen 2</th>
          <th>Aspekt</th>
          <th>Orb</th>
          <th>A/S</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderLRDebug(lr) {
  elements.lrDebugOutput.textContent = formatLunarReturnText(lr);
}

function renderLRDecans(lr) {
  if (!elements.lrDecansDisplay) return;
  const allPlanets = getAllPlanets(lr);
  const decanData = calculateHouseDecans(lr.houses, allPlanets);
  elements.lrDecansDisplay.innerHTML = renderDecanHTML(decanData, lr.aspects);
}

// LR Tab Switching
function switchLRTab(tabName) {
  document.querySelectorAll('.tab[data-lr-tab]').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.lr-tab-content').forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-lr-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ============================================
// TRANSIT FUNCTIONS
// ============================================

function showTransitPanel() {
  if (!currentChart) return;

  // Doğum yeri bilgisini göster
  if (selectedCity) {
    elements.trBirthPlaceName.textContent = formatCityName(selectedCity);
  }

  // Bugünün tarih/saatini set et
  handleTRNowClick();

  // Buton durumu
  updateTRButtonState();
}

function handleTRNowClick() {
  const now = new Date();
  elements.trDay.value = now.getDate();
  elements.trMonth.value = now.getMonth() + 1;
  elements.trYear.value = now.getFullYear();
  elements.trHour.value = now.getHours();
  elements.trMinute.value = now.getMinutes();
  updateTRButtonState();
}

function handleTRLocationChange() {
  const useBirth = elements.trLocBirth.checked;

  elements.trLocBirthLabel.classList.toggle('active', useBirth);
  elements.trLocCustomLabel.classList.toggle('active', !useBirth);

  if (useBirth) {
    elements.trCustomLocationSection.classList.add('hidden');
  } else {
    elements.trCustomLocationSection.classList.remove('hidden');
  }
  updateTRButtonState();
}

function handleTRCitySearch(e) {
  const query = e.target.value.trim();

  if (trSearchTimeout) clearTimeout(trSearchTimeout);

  if (query.length < 2) {
    elements.trCityDropdown.classList.add('hidden');
    elements.trCityDropdown.innerHTML = '';
    return;
  }

  trSearchTimeout = setTimeout(async () => {
    try {
      const results = await searchCity(query);
      renderTRCityResults(results);
    } catch (error) {
      console.error('TR şehir arama hatası:', error);
    }
  }, 300);
}

function renderTRCityResults(results) {
  if (results.length === 0) {
    elements.trCityDropdown.innerHTML = '<div class="city-option no-results">Sonuç bulunamadı</div>';
    elements.trCityDropdown.classList.remove('hidden');
    return;
  }

  elements.trCityDropdown.innerHTML = results.map((city, index) => `
    <div class="city-option" data-index="${index}">
      <span class="city-name">${city.name}</span>
      <span class="city-detail">${city.admin ? city.admin + ', ' : ''}${city.country}</span>
      <span class="city-coords">${city.lat.toFixed(2)}°, ${city.lng.toFixed(2)}°</span>
    </div>
  `).join('');

  elements.trCityDropdown.querySelectorAll('.city-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const index = parseInt(opt.dataset.index);
      selectTRCity(results[index]);
    });
  });

  elements.trCityDropdown.classList.remove('hidden');
}

function selectTRCity(city) {
  trSelectedCity = city;
  elements.trCitySearch.value = formatCityName(city);
  elements.trCityDropdown.classList.add('hidden');

  elements.trLocationInfo.classList.remove('hidden');
  elements.trCoordDisplay.textContent = formatCoordinates(city.lat, city.lng);
  elements.trTimezoneDisplay.textContent = city.timezone;

  updateTRButtonState();
}

function updateTRButtonState() {
  if (!currentChart) {
    elements.trCalculateBtn.disabled = true;
    return;
  }

  const day = parseInt(elements.trDay.value);
  const month = parseInt(elements.trMonth.value);
  const year = parseInt(elements.trYear.value);
  const hour = parseInt(elements.trHour.value);
  const minute = parseInt(elements.trMinute.value);

  const hasDate = !isNaN(day) && !isNaN(month) && !isNaN(year) && !isNaN(hour) && !isNaN(minute);

  if (elements.trLocBirth.checked) {
    elements.trCalculateBtn.disabled = !hasDate;
  } else {
    elements.trCalculateBtn.disabled = !hasDate || !trSelectedCity;
  }
}

async function handleTRCalculate() {
  if (!currentChart) {
    alert('Lütfen önce natal haritayı hesaplayın.');
    return;
  }

  const date = {
    year: parseInt(elements.trYear.value),
    month: parseInt(elements.trMonth.value),
    day: parseInt(elements.trDay.value),
    hour: parseInt(elements.trHour.value),
    minute: parseInt(elements.trMinute.value),
  };

  let location;
  if (elements.trLocBirth.checked && selectedCity) {
    location = {
      latitude: selectedCity.lat,
      longitude: selectedCity.lng,
      timezone: selectedCity.timezone,
      name: formatCityName(selectedCity),
    };
  } else if (trSelectedCity) {
    location = {
      latitude: trSelectedCity.lat,
      longitude: trSelectedCity.lng,
      timezone: trSelectedCity.timezone,
      name: formatCityName(trSelectedCity),
    };
  } else {
    alert('Lütfen bir konum seçin.');
    return;
  }

  elements.trCalculateBtn.disabled = true;
  elements.trCalculateBtn.innerHTML = '<span class="btn-icon">⏳</span> Hesaplanıyor...';

  try {
    currentTransit = await calculateTransits(currentChart, date, location);
    renderTRResults(currentTransit);
    elements.trResults.classList.remove('hidden');
  } catch (error) {
    console.error('Transit hesaplama hatası:', error);
    alert('Transit hesaplama hatası: ' + error.message);
  } finally {
    elements.trCalculateBtn.disabled = false;
    elements.trCalculateBtn.innerHTML = '<span class="btn-icon">🔄</span> Transitleri Hesapla';
  }
}

function renderTRResults(tr) {
  renderTRTimingCard(tr);
  renderTRChart(tr);
  renderTRPlanets(tr);
  renderTRNatalAspects(tr);
  renderTRAspects(tr);
  renderTRDebug(tr);
  renderTRDecans(tr);
}

function renderTRTimingCard(tr) {
  const l = tr.local;
  const months = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

  const natalBd = tr.natalReference.birthData;
  const natalMonths = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  elements.trTimingCard.innerHTML = `
    <div class="tr-timing-grid">
      <div class="tr-timing-main">
        <div class="tr-timing-date">
          <span class="tr-timing-icon">🔄</span>
          ${l.day} ${months[l.month]} ${l.year}
        </div>
        <div class="tr-timing-time">
          <span class="tr-timing-label">Saat:</span>
          <span class="tr-timing-value">${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}</span>
          <span class="tr-timing-tz">${tr.location.timezone}</span>
        </div>
        <div class="tr-timing-place">
          <span class="tr-timing-label">Yer:</span>
          <span class="tr-timing-value">${tr.location.name || `${tr.location.latitude.toFixed(2)}°, ${tr.location.longitude.toFixed(2)}°`}</span>
        </div>
      </div>
      <div class="tr-timing-points">
        <div class="tr-point">
          <span class="tr-point-label">Natal</span>
          <span class="tr-point-value">${natalBd.day} ${natalMonths[natalBd.month]} ${natalBd.year}</span>
        </div>
        <div class="tr-point">
          <span class="tr-point-label">Julian Day</span>
          <span class="tr-point-value">${tr.julianDay.toFixed(4)}</span>
        </div>
      </div>
    </div>
  `;
}

function renderTRChart(tr) {
  const canvas = $('trChartCanvas');
  if (!canvas || !currentChart) return;

  const l = tr.local;
  const months = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const dateStr = `${l.day} ${months[l.month]} ${l.year}`;
  const timeStr = `${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}`;

  const natalBd = currentChart.birthData;
  const natalDate = `${natalBd.day} ${months[natalBd.month]} ${natalBd.year}`;

  drawBiWheel(canvas, currentChart, tr, {
    title: 'Transit Bi-Wheel',
    subtitle: `Natal: ${natalDate}\nTransit: ${dateStr} ${timeStr}\n${tr.location.name || tr.location.timezone}`,
  });
}

function renderTRPlanets(tr) {
  const rows = tr.planets.map(planet => {
    const pos = formatLongitude(planet.longitude);
    const retro = planet.isRetrograde ? '<span class="retro-badge">R</span>' : '';
    const sign = SIGNS[pos.signIndex];
    const house = planet.house ? `Ev ${planet.house}` : '';

    return `
      <tr class="element-${sign.element}">
        <td class="planet-symbol">${planet.symbol}</td>
        <td class="planet-name">${planet.name}</td>
        <td class="planet-pos">${pos.formatted}</td>
        <td class="planet-full">${pos.degree}°${pos.minute}'${pos.second}" ${signImgFromSign(sign)} ${sign.name}</td>
        <td class="planet-retro">${retro}</td>
        <td class="planet-house">${house}</td>
      </tr>
    `;
  });

  elements.trPlanetsTable.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th></th>
          <th>Gezegen</th>
          <th>Pozisyon</th>
          <th>Tam Derece</th>
          <th></th>
          <th>Natal Ev</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderTRNatalAspects(tr) {
  if (!tr.transitNatalAspects || tr.transitNatalAspects.length === 0) {
    elements.trNatalAspectsTable.innerHTML = '<p class="no-data">Transit-natal aspekt bulunamadı</p>';
    return;
  }

  const sorted = [...tr.transitNatalAspects].sort((a, b) => a.orb - b.orb);

  const rows = sorted.map(aspect => {
    const orbDeg = Math.floor(aspect.orb);
    const orbMin = Math.floor((aspect.orb - orbDeg) * 60);
    const applying = aspect.isApplying ? '<span class="applying">A</span>' : '<span class="separating">S</span>';

    return `
      <tr>
        <td>t${aspect.transitPlanet.symbol} ${aspect.transitPlanet.name}</td>
        <td class="aspect-symbol">${aspect.aspectSymbol}</td>
        <td>n${aspect.natalPlanet.symbol} ${aspect.natalPlanet.name}</td>
        <td>${aspect.aspect}</td>
        <td>${orbDeg}°${String(orbMin).padStart(2, '0')}'</td>
        <td>${applying}</td>
      </tr>
    `;
  });

  elements.trNatalAspectsTable.innerHTML = `
    <table class="data-table aspects-table">
      <thead>
        <tr>
          <th>Transit Gezegen</th>
          <th></th>
          <th>Natal Gezegen</th>
          <th>Aspekt</th>
          <th>Orb</th>
          <th>A/S</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderTRAspects(tr) {
  if (!tr.transitAspects || tr.transitAspects.length === 0) {
    elements.trAspectsTable.innerHTML = '<p class="no-data">Transit aspekt bulunamadı</p>';
    return;
  }

  const sorted = [...tr.transitAspects].sort((a, b) => a.orb - b.orb);

  const rows = sorted.map(aspect => {
    const orbDeg = Math.floor(aspect.orb);
    const orbMin = Math.floor((aspect.orb - orbDeg) * 60);
    const applying = aspect.isApplying ? '<span class="applying">A</span>' : '<span class="separating">S</span>';

    return `
      <tr>
        <td>${aspect.planet1.symbol} ${aspect.planet1.name}</td>
        <td class="aspect-symbol">${aspect.aspectSymbol}</td>
        <td>${aspect.planet2.symbol} ${aspect.planet2.name}</td>
        <td>${aspect.aspect}</td>
        <td>${orbDeg}°${String(orbMin).padStart(2, '0')}'</td>
        <td>${applying}</td>
      </tr>
    `;
  });

  elements.trAspectsTable.innerHTML = `
    <table class="data-table aspects-table">
      <thead>
        <tr>
          <th>Gezegen 1</th>
          <th></th>
          <th>Gezegen 2</th>
          <th>Aspekt</th>
          <th>Orb</th>
          <th>A/S</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderTRDebug(tr) {
  elements.trDebugOutput.textContent = formatTransitText(tr);
}

function renderTRDecans(tr) {
  if (!elements.trDecansDisplay) return;
  // Transit dekanları natal evler üzerinden hesapla
  if (!currentChart) return;
  const allPlanets = [...tr.planets];
  const decanData = calculateHouseDecans(currentChart.houses, allPlanets);
  elements.trDecansDisplay.innerHTML = renderDecanHTML(decanData, tr.transitAspects);
}

// TR Tab Switching
function switchTRTab(tabName) {
  document.querySelectorAll('.tab[data-tr-tab]').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tr-tab-content').forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-tr-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ============================================
// START
// ============================================
init();
