/**
 * AstroFire - Ana Uygulama
 * UI event handling ve modüllerin bağlanması
 */

import { initEphemeris } from './modules/ephemeris.js';
import { searchCity, formatCityName, formatCoordinates } from './modules/geocoding.js';
import { getUTCOffsetMinutes, formatUTCOffset } from './modules/datetime.js';
import { calculateNatalChart } from './modules/natal.js';
import { calculateSolarReturn, calculateSRHouseTiming, solarPeriod } from './modules/solar.js';
import { calculateLunarReturn } from './modules/lunar.js';
import { formatLongitude, formatNatalChartText, formatSolarReturnText, formatLunarReturnText, formatTransitText, formatProgressionText } from './modules/formatting.js';
import { SIGNS } from './modules/constants.js';
import { drawChartWheel, drawSevenYearOverlay, drawDecanOverlay, drawBiWheel } from './modules/chartWheelSF.js';
import { calculateTransits } from './modules/transit.js';
import { calculateSecondaryProgression, ANGLE_METHODS, DEFAULT_ANGLE_METHOD } from './modules/progression.js';
import { calculateHouseDecans } from './modules/decans.js';
import { calculateSevenYearCycles } from './modules/sevens.js';
import { loadKnowledge, extractChartFacts, generateAnalysis } from './modules/analysis.js';
import { calculateSynastry, calculateComposite, calculateDavison } from './modules/synastry.js';

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
// SABİTLER
// ============================================
/** Türkçe ay adları — 1-indeksli (MONTH_NAMES[1] === 'Ocak'). */
const MONTH_NAMES = ['', 'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** Kısa ay adları — 1-indeksli. Tablolarda/etiketlerde yer kazanmak için. */
const MONTH_SHORT = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz',
  'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// ============================================
// STATE
// ============================================
let selectedCity = null;
let currentChart = null;

// Solar Return state
let currentSolarReturn = null;
let srSelectedCity = null;

// Lunar Return state
let currentLunarReturn = null;
let lrSelectedCity = null;

// Transit state
let currentTransit = null;
let trSelectedCity = null;

// Progression state
let currentProgression = null;

// Sinastri state (Kişi A = currentChart, Kişi B = burada)
let syChartB = null;
let sySelectedCity = null;
// Bi-wheel'de kim içte? false = Kişi A içte (varsayılan). Çerçeveyi iç harita
// kurduğu için bu, kozmetik değil gerçek bir okuma tercihidir.
let syFlipped = false;
let currentSynastry = null;
let currentComposite = null;
let currentDavison = null;

// Analysis state
let analysisKnowledge = null;

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
  srPeriodHint: $('srPeriodHint'),
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
  lrDay: $('lrDay'),
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
  // Progression elements
  progressionPanel: $('progressionPanel'),
  prDay: $('prDay'),
  prMonth: $('prMonth'),
  prYear: $('prYear'),
  prTodayBtn: $('prTodayBtn'),
  prAngleMethod: $('prAngleMethod'),
  prCalculateBtn: $('prCalculateBtn'),
  prResults: $('prResults'),
  prTimingCard: $('prTimingCard'),
  prPlanetsTable: $('prPlanetsTable'),
  prHousesTable: $('prHousesTable'),
  prNatalAspectsTable: $('prNatalAspectsTable'),
  prAspectsTable: $('prAspectsTable'),
  prDebugOutput: $('prDebugOutput'),
  prDecansDisplay: $('prDecansDisplay'),
  mainTabs: $('mainTabs'),
  sevensDisplay: $('sevensDisplay'),
  sevensAgeCheck: $('sevensAgeCheck'),
  formToggle: $('formToggle'),
  formContent: $('formContent'),
  toggleIcon: $('toggleIcon'),

  // Sinastri (Kişi B formu + Sinastri/Kompozit/Davison)
  syPersonAInfo: $('syPersonAInfo'),
  syBirthDay: $('syBirthDay'),
  syBirthMonth: $('syBirthMonth'),
  syBirthYear: $('syBirthYear'),
  syBirthHour: $('syBirthHour'),
  syBirthMinute: $('syBirthMinute'),
  syCitySearch: $('syCitySearch'),
  syCityDropdown: $('syCityDropdown'),
  syLocationInfo: $('syLocationInfo'),
  syCoordDisplay: $('syCoordDisplay'),
  syTimezoneDisplay: $('syTimezoneDisplay'),
  syAnchor: $('syAnchor'),
  syCalculateBtn: $('syCalculateBtn'),
  syResults: $('syResults'),
  sySummaryCard: $('sySummaryCard'),
  syChartCanvas: $('syChartCanvas'),
  sySwapBtn: $('sySwapBtn'),
  sySwapLabel: $('sySwapLabel'),
  syLegendInner: $('syLegendInner'),
  syLegendOuter: $('syLegendOuter'),
  syAspectsTable: $('syAspectsTable'),
  syGridTable: $('syGridTable'),
  syHousesTable: $('syHousesTable'),
  syCompositeCard: $('syCompositeCard'),
  syCompositeCanvas: $('syCompositeCanvas'),
  syCompositePlanetsTable: $('syCompositePlanetsTable'),
  syCompositeAspectsTable: $('syCompositeAspectsTable'),
  syDavisonCard: $('syDavisonCard'),
  syDavisonCanvas: $('syDavisonCanvas'),
  syDavisonPlanetsTable: $('syDavisonPlanetsTable'),
  syDavisonAspectsTable: $('syDavisonAspectsTable'),
  saveChartBtn: $('saveChartBtn'),
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

  // Gezegen açı filtreleri — her harita için bir tane
  natalPlanetFilter = createPlanetFilter($('natalPlanetFilter'),
    () => { if (currentChart) renderNatalChart(currentChart); });
  srPlanetFilter = createPlanetFilter($('srPlanetFilter'),
    () => { if (currentSolarReturn) renderSRChart(currentSolarReturn); });
  lrPlanetFilter = createPlanetFilter($('lrPlanetFilter'),
    () => { if (currentLunarReturn) renderLRChart(currentLunarReturn); });
  transitPlanetFilter = createPlanetFilter($('transitPlanetFilter'),
    () => { if (currentTransit) renderTRChart(currentTransit); });
  progressionPlanetFilter = createPlanetFilter($('progressionPlanetFilter'),
    () => { if (currentProgression) renderPRChart(currentProgression); });
  synastryPlanetFilter = createPlanetFilter($('synastryPlanetFilter'),
    () => { if (currentSynastry) renderSYChart(); });
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

  // Şehir arama kutuları createCitySearch() ile kurulur; input/focus
  // listener'larını kendileri bağlar. Dışarı tıklamada hepsi kapanır —
  // yeni bir arama kutusu eklemek burada bir şey değiştirmeyi gerektirmez.
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.city-search-wrapper')) {
      citySearches.forEach(cs => cs.close());
    }
  });

  // Form submit
  elements.birthForm.addEventListener('submit', handleCalculate);

  // Temizle butonu
  elements.clearFormBtn.addEventListener('click', handleClearForm);

  // Harita hafızası: Kaydet butonu + panel aç/kapa
  $('saveChartBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();   // header toggle'ını tetikleme
    handleSaveChart();
  });
  $('memoryHeader')?.addEventListener('click', () => {
    $('memoryPanel')?.classList.toggle('mem-open');
  });
  renderMemoryPanel();

  // Hızlı şehir seçim butonları
  document.querySelectorAll('.quick-city-btn').forEach(btn => {
    btn.addEventListener('click', () => handleQuickCitySelect(btn.dataset.city));
  });

  // Main tab switching (Natal / Solar Return)
  document.querySelectorAll('.main-tab[data-main-tab]').forEach(tab => {
    tab.addEventListener('click', () => switchMainTab(tab.dataset.mainTab));
  });

  // Bölüm içi sekmeler — tek kayıt, tüm bölümler.
  // Natal'daki 'chartinfo' bir sekme değil, yan paneli açan bir buton.
  SECTION_TABS.forEach(({ attr, dataKey, contentClass }) => {
    document.querySelectorAll(`.tab[data-${attr}]`).forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset[dataKey];
        if (target === 'chartinfo') {
          toggleChartInfoPanel();
        } else {
          switchSectionTab(attr, contentClass, target);
        }
      });
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

  // Tarih/saat alanlarında otomatik ilerleme: gün "11" → ay, ay "03" → yıl…
  // Alan dolduğunda (max hane) ya da bir sonraki hane sınırı aşacaksa
  // (gün "4" → 40 olamaz) odak sonraki kutuya atlar.
  setupAutoAdvance([
    ['birthDay', 31, 2], ['birthMonth', 12, 2], ['birthYear', 2100, 4],
    ['birthHour', 23, 2], ['birthMinute', 59, 2],
  ]);
  setupAutoAdvance([
    ['syBirthDay', 31, 2], ['syBirthMonth', 12, 2], ['syBirthYear', 2100, 4],
    ['syBirthHour', 23, 2], ['syBirthMinute', 59, 2],
  ]);
  setupAutoAdvance([
    ['trDay', 31, 2], ['trMonth', 12, 2], ['trYear', 2100, 4],
    ['trHour', 23, 2], ['trMinute', 59, 2],
  ]);
  setupAutoAdvance([
    ['prDay', 31, 2], ['prMonth', 12, 2], ['prYear', 2100, 4],
  ]);

  // ============================================
  // SOLAR RETURN EVENT LISTENERS
  // ============================================
  
  // SR konum seçimi radio
  elements.srLocBirth.addEventListener('change', handleSRLocationChange);
  elements.srLocCustom.addEventListener('change', handleSRLocationChange);

  // SR hesapla
  elements.srCalculateBtn.addEventListener('click', handleSRCalculate);

  // SR yıl değişince buton durumunu güncelle
  elements.srYear.addEventListener('input', updateSRButtonState);

  // ============================================
  // SİNASTRİ EVENT LISTENERS
  // ============================================

  elements.syCalculateBtn.addEventListener('click', handleSYCalculate);
  elements.sySwapBtn.addEventListener('click', handleSYSwap);

  ['syBirthDay', 'syBirthMonth', 'syBirthYear', 'syBirthHour', 'syBirthMinute'].forEach(id => {
    elements[id].addEventListener('input', updateSYButtonState);
  });

  // Kişi B'nin hızlı şehir butonları — natal formunkinden AYRI sınıf kullanır,
  // aksi halde buradan seçim Kişi A'nın şehrini ezerdi.
  document.querySelectorAll('.sy-quick-city-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const city = QUICK_CITIES[btn.dataset.city];
      if (!city) return;

      syCitySearch.select(city);
      document.querySelectorAll('.sy-quick-city-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.city === btn.dataset.city);
      });
    });
  });

  // Çapa değişince kompoziti yeniden hesapla (haritalar zaten hesaplanmışsa)
  elements.syAnchor.addEventListener('change', () => {
    if (!currentChart || !syChartB) return;
    currentComposite = calculateComposite(currentChart, syChartB, { anchor: elements.syAnchor.value });
    renderSYSummary();
    renderSYComposite();
  });

  // ============================================
  // LUNAR RETURN EVENT LISTENERS
  // ============================================

  // LR konum seçimi radio
  elements.lrLocBirth.addEventListener('change', handleLRLocationChange);
  elements.lrLocCustom.addEventListener('change', handleLRLocationChange);

  // LR hesapla
  elements.lrCalculateBtn.addEventListener('click', handleLRCalculate);

  // LR gün/yıl/ay değişince buton durumunu güncelle
  elements.lrDay.addEventListener('input', updateLRButtonState);
  elements.lrYear.addEventListener('input', updateLRButtonState);
  elements.lrMonth.addEventListener('change', updateLRButtonState);

  // ============================================
  // TRANSIT EVENT LISTENERS
  // ============================================

  // TR konum seçimi radio
  elements.trLocBirth.addEventListener('change', handleTRLocationChange);
  elements.trLocCustom.addEventListener('change', handleTRLocationChange);

  // TR hesapla
  elements.trCalculateBtn.addEventListener('click', handleTRCalculate);

  // TR "Şu An" butonu
  elements.trNowBtn.addEventListener('click', handleTRNowClick);

  // TR step buttons
  document.querySelectorAll('.tr-step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const minutes = parseInt(btn.dataset.step);
      handleTRStep(minutes);
    });
  });

  // TR tarih değişince buton durumunu güncelle
  ['trDay', 'trMonth', 'trYear', 'trHour', 'trMinute'].forEach(id => {
    $(id).addEventListener('input', updateTRButtonState);
  });

  // ============================================
  // PROGRESYON EVENT LISTENERS
  // ============================================

  // PR açı yöntemi select'ini doldur
  if (elements.prAngleMethod) {
    elements.prAngleMethod.innerHTML = ANGLE_METHODS.map(m =>
      `<option value="${m.key}"${m.key === DEFAULT_ANGLE_METHOD ? ' selected' : ''}>${m.name}</option>`
    ).join('');
    elements.prAngleMethod.addEventListener('change', () => {
      if (currentChart && currentProgression) handlePRCalculate();
    });
  }

  // PR hesapla
  elements.prCalculateBtn.addEventListener('click', handlePRCalculate);

  // PR "Bugün" butonu
  elements.prTodayBtn.addEventListener('click', handlePRTodayClick);

  // PR tarih değişince buton durumunu güncelle
  ['prDay', 'prMonth', 'prYear'].forEach(id => {
    $(id).addEventListener('input', updatePRButtonState);
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
// TARİH/SAAT OTOMATİK İLERLEME
// ============================================
/**
 * Bir alan zinciri için otomatik odak ilerlemesi kurar.
 * @param {Array<[string, number, number]>} chain - [elementId, maxValue, maxDigits]
 * Alan dolduğunda (maxDigits hane) veya bir sonraki hane maxValue'yu aşacaksa
 * (ör. ay için "3" → 30 olamaz) odak zincirdeki bir sonraki alana atlar.
 */
function setupAutoAdvance(chain) {
  chain.forEach(([id, max, digits], i) => {
    const el = $(id);
    if (!el) return;
    const next = chain[i + 1] && $(chain[i + 1][0]);
    if (!next) return;

    el.addEventListener('input', (e) => {
      // Silme sırasında ilerleme yapma
      if (e.inputType && e.inputType.startsWith('delete')) return;

      const str = el.value.replace(/\D/g, '');
      if (!str) return;

      const full = str.length >= digits;
      const cantGrow = parseInt(str, 10) * 10 > max;   // bir hane daha sığmaz

      if (full || cantGrow) {
        next.focus();
        if (typeof next.select === 'function') next.select();
      }
    });
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
  elements.saveChartBtn.disabled = true;

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
  
  // Sinastri (Kişi B) formunu ve sonuçlarını da sıfırla
  ['syBirthDay', 'syBirthMonth', 'syBirthYear', 'syBirthHour', 'syBirthMinute', 'syCitySearch']
    .forEach(id => { elements[id].value = ''; });
  sySelectedCity = null;
  elements.syLocationInfo.classList.add('hidden');
  elements.syCityDropdown.classList.add('hidden');
  elements.syCityDropdown.innerHTML = '';
  elements.syResults.classList.add('hidden');
  elements.syCalculateBtn.disabled = true;
  elements.syPersonAInfo.textContent = 'Önce natal harita hesaplayın';
  document.querySelectorAll('.sy-quick-city-btn').forEach(btn => btn.classList.remove('active'));

  // Mevcut verilerini sıfırla
  currentChart = null;
  currentSolarReturn = null;
  currentLunarReturn = null;
  currentTransit = null;
  currentProgression = null;
  syChartB = null;
  syFlipped = false;
  currentSynastry = null;
  currentComposite = null;
  currentDavison = null;
}

// ============================================
// CITY SEARCH
// ============================================
// Tek fabrika; her arama kutusu (natal / SR / LR / TR / sinastri Kişi B) bunun
// bir örneği. Daha önce bu mantığın 4 birebir kopyası vardı.

/** Açık dropdown'ları dışarı tıklamada kapatabilmek için kayıt. */
const citySearches = [];

/**
 * Bir şehir arama kutusu kurar: debounce'lu arama, dropdown, seçim.
 *
 * @param {Object} config
 * @param {HTMLElement} config.input
 * @param {HTMLElement} config.dropdown
 * @param {HTMLElement} [config.info] - Seçimden sonra görünür olacak kutu
 * @param {HTMLElement} [config.coord] - Koordinat metni
 * @param {HTMLElement} [config.timezone] - Timezone metni
 * @param {Function} config.onSelect - Seçilen şehirle çağrılır
 * @returns {{select: Function, close: Function}}
 */
function createCitySearch({ input, dropdown, info, coord, timezone, onSelect }) {
  let timer = null;

  function renderResults(results) {
    if (results.length === 0) {
      dropdown.innerHTML = '<div class="city-option no-results">Sonuç bulunamadı</div>';
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.innerHTML = results.map((city, index) => `
      <div class="city-option" data-index="${index}">
        <span class="city-name">${city.name}</span>
        <span class="city-detail">${city.admin ? city.admin + ', ' : ''}${city.country}</span>
        <span class="city-coords">${city.lat.toFixed(2)}°, ${city.lng.toFixed(2)}°</span>
      </div>
    `).join('');

    dropdown.querySelectorAll('.city-option').forEach(opt => {
      opt.addEventListener('click', () => select(results[parseInt(opt.dataset.index)]));
    });

    dropdown.classList.remove('hidden');
  }

  function select(city) {
    if (!city) return;

    input.value = formatCityName(city);
    dropdown.classList.add('hidden');

    if (info) info.classList.remove('hidden');
    if (coord) coord.textContent = formatCoordinates(city.lat, city.lng);
    if (timezone) timezone.textContent = city.timezone;

    onSelect(city);
  }

  input.addEventListener('input', (e) => {
    const query = e.target.value.trim();

    if (timer) clearTimeout(timer);

    if (query.length < 2) {
      dropdown.classList.add('hidden');
      dropdown.innerHTML = '';
      return;
    }

    timer = setTimeout(async () => {
      try {
        renderResults(await searchCity(query));
      } catch (error) {
        console.error('Şehir arama hatası:', error);
      }
    }, 300);
  });

  input.addEventListener('focus', () => {
    if (dropdown.children.length > 0) dropdown.classList.remove('hidden');
  });

  const api = {
    select,
    close: () => dropdown.classList.add('hidden'),
  };
  citySearches.push(api);
  return api;
}

// --- Arama kutusu örnekleri ---

const natalCitySearch = createCitySearch({
  input: elements.citySearch,
  dropdown: elements.cityDropdown,
  info: elements.locationInfo,
  coord: elements.coordDisplay,
  timezone: elements.timezoneDisplay,
  onSelect: (city) => {
    selectedCity = city;
    updateTimezoneDisplay();
    elements.calculateBtn.disabled = false;
  },
});

createCitySearch({
  input: elements.srCitySearch,
  dropdown: elements.srCityDropdown,
  info: elements.srLocationInfo,
  coord: elements.srCoordDisplay,
  timezone: elements.srTimezoneDisplay,
  onSelect: (city) => {
    srSelectedCity = city;
    updateSRButtonState();
  },
});

createCitySearch({
  input: elements.lrCitySearch,
  dropdown: elements.lrCityDropdown,
  info: elements.lrLocationInfo,
  coord: elements.lrCoordDisplay,
  timezone: elements.lrTimezoneDisplay,
  onSelect: (city) => {
    lrSelectedCity = city;
    updateLRButtonState();
  },
});

createCitySearch({
  input: elements.trCitySearch,
  dropdown: elements.trCityDropdown,
  info: elements.trLocationInfo,
  coord: elements.trCoordDisplay,
  timezone: elements.trTimezoneDisplay,
  onSelect: (city) => {
    trSelectedCity = city;
    updateTRButtonState();
  },
});

// Sinastri — Kişi B. Factory sayesinde 60 satırlık kopya yerine tek çağrı.
const syCitySearch = createCitySearch({
  input: elements.syCitySearch,
  dropdown: elements.syCityDropdown,
  info: elements.syLocationInfo,
  coord: elements.syCoordDisplay,
  timezone: elements.syTimezoneDisplay,
  onSelect: (city) => {
    sySelectedCity = city;
    updateSYButtonState();
  },
});

/** Hızlı şehir butonları natal formun arama kutusunu besler. */
function selectCity(city) {
  natalCitySearch.select(city);
}

// ============================================
// GEZEGEN AÇI FİLTRESİ (ders modu)
// ============================================
// Haritanın altında açılır bir panel. Tüm gezegenler tikli başlar; kullanıcı
// tikini kaldırdıkça o gezegenin dahil olduğu açılar gizlenir. Tek gezegen
// bırakılırsa yalnızca onun tüm açıları görünür — "Satürn'ü seç, sadece onun
// açılarını gör" senaryosu.

const PLANET_FILTER_NAMES = [
  'Güneş', 'Ay', 'Merkür', 'Venüs', 'Mars', 'Jüpiter', 'Satürn',
  'Uranüs', 'Neptün', 'Plüton', 'KAD', 'GAD', 'Chiron', 'Şans Noktası',
];

const PLANET_FILTER_SYMBOL = {
  'Güneş': '☉', 'Ay': '☽', 'Merkür': '☿', 'Venüs': '♀', 'Mars': '♂',
  'Jüpiter': '♃', 'Satürn': '♄', 'Uranüs': '♅', 'Neptün': '♆', 'Plüton': '♇',
  'KAD': '☊', 'GAD': '☋', 'Chiron': '⚷', 'Şans Noktası': '⊕',
};

/**
 * Bir harita için gezegen filtresi kurar.
 * @param {HTMLElement} container
 * @param {Function} redraw - Filtre değişince haritayı yeniden çizer.
 * @returns {{ getActiveSet: () => Set<string> }|null}
 */
function createPlanetFilter(container, redraw) {
  if (!container) return null;

  const active = new Set(PLANET_FILTER_NAMES);

  const boxes = PLANET_FILTER_NAMES.map(name => `
    <label class="pf-item">
      <input type="checkbox" data-planet="${name}" checked>
      <span class="pf-sym">${PLANET_FILTER_SYMBOL[name]}</span>
      <span class="pf-name">${name}</span>
    </label>
  `).join('');

  container.innerHTML = `
    <div class="pf-header" role="button">
      <span class="pf-title">🪐 Gezegen Açı Filtresi</span>
      <span class="pf-hint">yalnızca seçili gezegenlerin açıları çizilir</span>
      <span class="pf-caret">▾</span>
    </div>
    <div class="pf-body">
      <div class="pf-actions">
        <button type="button" class="pf-all">Tümünü seç</button>
        <button type="button" class="pf-none">Tümünü kaldır</button>
      </div>
      <div class="pf-grid">${boxes}</div>
    </div>
  `;

  const body = container.querySelector('.pf-body');
  const header = container.querySelector('.pf-header');
  const checks = [...container.querySelectorAll('input[data-planet]')];

  header.addEventListener('click', () => {
    container.classList.toggle('pf-open');
  });

  const sync = () => {
    active.clear();
    for (const c of checks) if (c.checked) active.add(c.dataset.planet);
    redraw();
  };

  checks.forEach(c => c.addEventListener('change', sync));

  container.querySelector('.pf-all').addEventListener('click', () => {
    checks.forEach(c => { c.checked = true; });
    sync();
  });
  container.querySelector('.pf-none').addEventListener('click', () => {
    checks.forEach(c => { c.checked = false; });
    sync();
  });

  return { getActiveSet: () => active };
}

// Her harita kendi filtresine sahip (ders senaryosunda haritalar bağımsız).
let natalPlanetFilter = null;
let srPlanetFilter = null;
let lrPlanetFilter = null;
let transitPlanetFilter = null;
let progressionPlanetFilter = null;
let synastryPlanetFilter = null;

// ============================================
// HARİTA HAFIZASI (localStorage)
// ============================================
// İki liste: manuel "Kaydet" ile isimlenen kalıcı haritalar ve her hesaplamada
// otomatik büyüyen "son bakılanlar" (en yeni 10). İkisi de forma tek tıkla
// yüklenir. Tarayıcıda saklanır; sunucu yok.

const MEM_SAVED = 'astrofire_saved';
const MEM_RECENT = 'astrofire_recent';
const MEM_RECENT_MAX = 10;

function memRead(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function memWrite(key, list) {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn('localStorage yazılamadı:', e);
  }
}

/** Form + selectedCity'den bir kayıt objesi kurar (yoksa null). */
function chartToEntry(name) {
  if (!selectedCity) return null;
  const num = (id) => parseInt($(id).value);
  const day = num('birthDay');
  const month = num('birthMonth');
  const year = num('birthYear');
  if ([day, month, year].some(Number.isNaN)) return null;

  return {
    name: name || '',
    day, month, year,
    hour: num('birthHour') || 0,
    minute: num('birthMinute') || 0,
    timezone: selectedCity.timezone,
    lat: selectedCity.lat,
    lng: selectedCity.lng,
    cityName: formatCityName(selectedCity),
    ts: Date.now(),
  };
}

/** Her başarılı hesaplamadan sonra çağrılır: otomatik son-bakılanlar. */
function addRecentChart() {
  const entry = chartToEntry('');
  if (!entry) return;

  const key = (e) => `${e.day}.${e.month}.${e.year} ${e.hour}:${e.minute} ${e.cityName}`;
  let recent = memRead(MEM_RECENT).filter(e => key(e) !== key(entry));
  recent.unshift(entry);
  recent = recent.slice(0, MEM_RECENT_MAX);
  memWrite(MEM_RECENT, recent);
  renderMemoryPanel();
}

/** "Kaydet" butonu — isim sorar, kalıcı listeye ekler. */
function handleSaveChart() {
  const entry = chartToEntry('');
  if (!entry) {
    alert('Önce bir harita hesaplayın.');
    return;
  }
  const name = (prompt('Harita adı (ör. Serra):', entry.cityName.split(',')[0]) || '').trim();
  if (!name) return;

  entry.name = name;
  const saved = memRead(MEM_SAVED).filter(e => e.name !== name);
  saved.unshift(entry);
  memWrite(MEM_SAVED, saved);
  renderMemoryPanel();
}

/** Kayıtlı bir haritayı forma yükleyip hesaplar. */
function loadChartEntry(entry) {
  $('birthDay').value = entry.day;
  $('birthMonth').value = entry.month;
  $('birthYear').value = entry.year;
  $('birthHour').value = entry.hour;
  $('birthMinute').value = entry.minute;

  // selectedCity'yi kayıttan kur — şehir aramaya gerek yok
  selectedCity = {
    name: entry.cityName,
    lat: entry.lat,
    lng: entry.lng,
    timezone: entry.timezone,
  };
  elements.citySearch.value = entry.cityName;
  elements.locationInfo.classList.remove('hidden');
  elements.coordDisplay.textContent = formatCoordinates(entry.lat, entry.lng);
  elements.timezoneDisplay.textContent = entry.timezone;
  updateTimezoneDisplay();

  elements.calculateBtn.disabled = false;
  handleCalculate();
}

function deleteSaved(name) {
  memWrite(MEM_SAVED, memRead(MEM_SAVED).filter(e => e.name !== name));
  renderMemoryPanel();
}

function renderMemoryPanel() {
  const panel = $('memoryPanel');
  const body = $('memoryBody');
  if (!panel || !body) return;

  const saved = memRead(MEM_SAVED);
  const recent = memRead(MEM_RECENT);

  // Panel görünür: kayıt varsa VEYA hesaplanmış bir harita varsa (kaydedilebilir).
  if (!saved.length && !recent.length && !currentChart) {
    panel.style.display = 'none';
    return;
  }
  panel.style.display = '';

  const dateOf = (e) => `${e.day} ${MONTH_SHORT[e.month]} ${e.year}, ${String(e.hour).padStart(2, '0')}:${String(e.minute).padStart(2, '0')}`;

  const savedHtml = saved.map((e, i) => `
    <div class="mem-item mem-saved" data-list="saved" data-idx="${i}">
      <span class="mem-star">★</span>
      <span class="mem-name">${e.name}</span>
      <span class="mem-meta">${dateOf(e)} — ${e.cityName}</span>
      <button type="button" class="mem-del" data-del="${e.name}" title="Sil">×</button>
    </div>
  `).join('');

  const recentHtml = recent.map((e, i) => `
    <div class="mem-item mem-recent" data-list="recent" data-idx="${i}">
      <span class="mem-clock">🕐</span>
      <span class="mem-meta">${dateOf(e)} — ${e.cityName}</span>
      <button type="button" class="mem-del" data-del-recent="${i}" title="Sil">×</button>
    </div>
  `).join('');

  body.innerHTML = `
    ${saved.length ? `<div class="mem-section-title">Kayıtlılar</div><div class="mem-list">${savedHtml}</div>` : ''}
    ${recent.length ? `<div class="mem-section-title">Son Bakılanlar</div><div class="mem-list">${recentHtml}</div>` : ''}
  `;

  body.querySelectorAll('.mem-item').forEach(el => {
    el.addEventListener('click', (ev) => {
      if (ev.target.classList.contains('mem-del')) return;
      const list = el.dataset.list === 'saved' ? saved : recent;
      loadChartEntry(list[parseInt(el.dataset.idx)]);
    });
  });
  body.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      deleteSaved(btn.dataset.del);
    });
  });
  body.querySelectorAll('[data-del-recent]').forEach(btn => {
    btn.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const list = memRead(MEM_RECENT);
      list.splice(parseInt(btn.dataset.delRecent), 1);
      memWrite(MEM_RECENT, list);
      renderMemoryPanel();
    });
  });
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
  e?.preventDefault();   // kayıttan yüklerken event olmadan da çağrılabilir

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
    // Progresyonu hazırla
    showProgressionPanel();
    // Sinastri'yi hazırla (Kişi A = bu harita)
    showSynastryPanel();

    // Hafıza: son bakılanlara ekle + Kaydet butonunu aç (panel de görünür olur)
    addRecentChart();
    elements.saveChartBtn.disabled = false;
    renderMemoryPanel();

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
  const dateStr = `${bd.day} ${MONTH_SHORT[bd.month]} ${bd.year}`;
  const timeStr = `${String(bd.hour).padStart(2, '0')}:${String(bd.minute).padStart(2, '0')}`;
  const cityName = selectedCity ? formatCityName(selectedCity) : '';
  
  // SolarFire bilgi bloğu düzeni: başlık / harita tipi / tarih / saat+dilim /
  // yer / koordinat — sonra kırmızı italik hesaplama ayarları (çizim katmanında).
  drawChartWheel(canvas, chart, {
    title: 'Natal Chart',
    subtitle: `${dateStr}\n${timeStr}  ${getUtcOffsetStr(bd)}\n${cityName}\n${formatCoordinates(bd.latitude, bd.longitude)}`,
    showAspects: true,
    chartType: 'natal',
    activePlanets: natalPlanetFilter?.getActiveSet(),
    // Dekanlar drawChartWheel'in İÇİNDE, gezegenlerden önce çizilir (çakışma önlenir)
    decans: (elements.decanOverlayCheck && elements.decanOverlayCheck.checked)
      ? calculateHouseDecans(chart.houses, getAllPlanets(chart))
      : null,
  });

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
/**
 * Bölüm içi sekme değiştirici — tüm bölümler (natal/SR/LR/TR/PR/sinastri) için tek.
 *
 * Sözleşme: `data-<attr>="x"` butonu ⇄ `#tab-x` içeriği; içerik ayrıca bölümün
 * `<prefix>-tab-content` sınıfını taşır.
 *
 * Eskiden her bölümün kendi kopyası vardı ve natal olanı diğerlerini
 * `:not(.sr-tab-content):not(.lr-tab-content)...` diye dışlıyordu — yeni bir
 * bölüm eklerken oraya `:not()` eklemeyi unutmak sessizce o bölümün sekmelerini
 * boşaltıyordu. Bölüme özel sınıf sorgusu bu tuzağı tamamen kaldırır.
 *
 * @param {string} attr - data attribute adı (ör. 'sr-tab')
 * @param {string} contentClass - içerik sınıfı (ör. 'sr-tab-content')
 * @param {string} tabName - hedef sekme (ör. 'sr-planets')
 */
function switchSectionTab(attr, contentClass, tabName) {
  document.querySelectorAll(`.tab[data-${attr}]`).forEach(t => t.classList.remove('active'));
  document.querySelectorAll(`.${contentClass}`).forEach(c => c.classList.remove('active'));

  document.querySelector(`[data-${attr}="${tabName}"]`)?.classList.add('active');
  document.getElementById(`tab-${tabName}`)?.classList.add('active');
}

/** Bölüm sekme kayıtları — yeni bölüm eklemek buraya bir satır. */
const SECTION_TABS = [
  { attr: 'tab', dataKey: 'tab', contentClass: 'na-tab-content' },
  { attr: 'sr-tab', dataKey: 'srTab', contentClass: 'sr-tab-content' },
  { attr: 'lr-tab', dataKey: 'lrTab', contentClass: 'lr-tab-content' },
  { attr: 'tr-tab', dataKey: 'trTab', contentClass: 'tr-tab-content' },
  { attr: 'pr-tab', dataKey: 'prTab', contentClass: 'pr-tab-content' },
  { attr: 'sy-tab', dataKey: 'syTab', contentClass: 'sy-tab-content' },
];

function switchTab(tabName) {
  switchSectionTab('tab', 'na-tab-content', tabName);
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

  updateSRPeriodHint(hasYear ? yearVal : null);
}

/**
 * Girilen solar yılın hangi dönemi kapsadığını gösterir.
 *
 * Konvansiyon (bkz. solar.js → solarEventYear): girilen yıl, solar dönemin
 * ÇOĞUNLUĞUNUN düştüğü takvim yılıdır. Yani 6 Ekim doğumlu biri "1995" girince
 * dönem 6 Ekim 1994'te başlar. Bu, ekranda görünmediği sürece kafa karıştırıcı —
 * o yüzden aralığı doğrudan yazıyoruz.
 */
function updateSRPeriodHint(year) {
  const hint = elements.srPeriodHint;
  if (!hint) return;

  if (!year || !currentChart) {
    hint.classList.add('hidden');
    return;
  }

  const period = solarPeriod(currentChart.birthData, year);
  const dayStr = `${period.day} ${MONTH_NAMES[period.month]}`;

  hint.innerHTML = `<span class="sr-period-arrow">→</span> ${dayStr} ${period.startYear} <span class="sr-period-dash">–</span> ${dayStr} ${period.endYear}`;
  hint.classList.remove('hidden');
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

function renderPlanetRow(p, aspects, decanTiming) {
  const pPos = formatLongitude(p.longitude, false);
  const pSign = SIGNS[p.signIndex];
  const aspectCount = getAspectCountForPlanet(p.name, aspects);
  const aspectBadge = aspectCount > 0
    ? `<span class="aspect-toggle" data-planet="${p.name}">▼ ${aspectCount} açı</span>`
    : '';
  const aspectsList = renderPlanetAspectsList(p.name, aspects);

  const timingStr = decanTiming ? `<span class="decan-planet-date">📅 ${decanTiming}</span>` : '';

  return `
    <div class="decan-planet-row">
      <span class="decan-planet-left-border element-border-${pSign.element}"></span>
      <span class="decan-planet-info">
        ${p.symbol} ${p.name} • ${pSign.name} ${signImgFromSign(pSign)} • ${pPos.degree}°${String(pPos.minute).padStart(2, '0')}' ${timingStr} ${aspectBadge}
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
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth() + 1]} ${d.getFullYear()}`;
}

function renderDecanHTML(decanData, aspects, houseTiming) {

  return `<div class="decans-list">${decanData.map(h => {
    const element = h.houseSign.element;
    const decanSizeDeg = h.span / 3;

    const timing = houseTiming ? houseTiming.find(t => t.house === h.house) : null;
    const timingHeader = timing ? (() => {
      const ed = timing.enterDate;
      const ld = timing.leaveDate;
      const enterStr = `${ed.day} ${MONTH_SHORT[ed.month]} ${ed.year}`;
      const leaveStr = `${ld.day} ${MONTH_SHORT[ld.month]} ${ld.year}`;
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
            const planetRows = d.planets.map(p => {
              let planetDateStr = null;
              if (timing) {
                // Gezegenin dekan içindeki fraksiyonel pozisyonunu hesapla
                const decanStartLon = d.startLongitude;
                const decanEndLon = decanStartLon + (h.span / 3);
                let pOffset = p.longitude - decanStartLon;
                if (pOffset < 0) pOffset += 360;
                const decanSpan = h.span / 3;
                if (pOffset <= decanSpan) {
                  const pFraction = pOffset / decanSpan;
                  const f0 = d.index / 3;
                  const f1 = (d.index + 1) / 3;
                  const planetFraction = f0 + pFraction * (f1 - f0);
                  planetDateStr = timingDateStr(timing.enterDate, timing.durationDays, planetFraction);
                }
              }
              return renderPlanetRow(p, aspects, planetDateStr);
            }).join('');

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
    const drawSevensChart = () => {
      const bd = chart.birthData;
      const dateStr = `${bd.day} ${MONTH_SHORT[bd.month]} ${bd.year}`;
      const timeStr = `${String(bd.hour).padStart(2, '0')}:${String(bd.minute).padStart(2, '0')}`;
      const cityName = selectedCity ? formatCityName(selectedCity) : '';

      drawChartWheel(canvas, chart, {
        title: '7\'ler Kanunu',
        subtitle: `Natal Chart\n${dateStr}\n${timeStr}  ${getUtcOffsetStr(bd)}\n${bd.timezone}\n${cityName}`,
        showAspects: false,
        chartType: 'natal',
      });
      const showAges = elements.sevensAgeCheck ? elements.sevensAgeCheck.checked : true;
      drawSevenYearOverlay(canvas, chart, data, { showAges });
    };

    drawSevensChart();

    // Toggle listener
    if (elements.sevensAgeCheck) {
      elements.sevensAgeCheck.onchange = drawSevensChart;
    }
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
  const dateStr = `${l.day} ${MONTH_SHORT[l.month]} ${l.year}`;
  const timeStr = `${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}:${String(l.second).padStart(2, '0')}`;
  const locName = sr.location?.name || '';
  
  drawChartWheel(canvas, sr, {
    title: 'Solar Return',
    subtitle: `Solar Return\n${dateStr}\n${timeStr}  ${sr.location?.timezone || ''}\n${locName}`,
    showAspects: true,
    chartType: 'solar',
    activePlanets: srPlanetFilter?.getActiveSet(),
  });
}

function renderSRTimingCard(sr) {
  const l = sr.local;
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
  
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
          <span class="sr-timing-value">${l.day} ${MONTH_NAMES[l.month]} ${l.year}, ${dayName}</span>
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

// ============================================
// LUNAR RETURN
// ============================================

function showLunarReturnPanel() {
  // Mevcut gün, yıl ve ayı default olarak ayarla
  const now = new Date();
  elements.lrDay.value = now.getDate();
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
  const dayVal = parseInt(elements.lrDay.value);
  const hasDay = !isNaN(dayVal) && dayVal >= 1 && dayVal <= 31;

  const yearVal = parseInt(elements.lrYear.value);
  const hasYear = !isNaN(yearVal) && yearVal >= 1900 && yearVal <= 2100;

  const isBirth = elements.lrLocBirth.checked;
  const hasLocation = isBirth ? !!selectedCity : !!lrSelectedCity;

  elements.lrCalculateBtn.disabled = !(hasDay && hasYear && hasLocation);
}

// LR Calculate
async function handleLRCalculate() {
  if (!currentChart) {
    alert('Önce natal harita hesaplayın.');
    return;
  }

  const day = parseInt(elements.lrDay.value);
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
    currentLunarReturn = await calculateLunarReturn(currentChart, year, month, day, location);
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
  const dateStr = `${l.day} ${MONTH_SHORT[l.month]} ${l.year}`;
  const timeStr = `${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}:${String(l.second).padStart(2, '0')}`;
  const locName = lr.location?.name || '';

  drawChartWheel(canvas, lr, {
    title: 'Lunar Return',
    subtitle: `Lunar Return\n${dateStr}\n${timeStr}  ${lr.location?.timezone || ''}\n${locName}`,
    showAspects: true,
    chartType: 'lunar',
    activePlanets: lrPlanetFilter?.getActiveSet(),
  });
}

function renderLRTimingCard(lr) {
  const l = lr.local;
  const dayNames = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

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
          <span class="lr-timing-value">${l.day} ${MONTH_NAMES[l.month]} ${l.year}, ${dayName}</span>
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

function handleTRStep(minutes) {
  const year = parseInt(elements.trYear.value);
  const month = parseInt(elements.trMonth.value);
  const day = parseInt(elements.trDay.value);
  const hour = parseInt(elements.trHour.value);
  const minute = parseInt(elements.trMinute.value);

  const d = new Date(year, month - 1, day, hour, minute);
  d.setMinutes(d.getMinutes() + minutes);

  elements.trDay.value = d.getDate();
  elements.trMonth.value = d.getMonth() + 1;
  elements.trYear.value = d.getFullYear();
  elements.trHour.value = d.getHours();
  elements.trMinute.value = d.getMinutes();

  handleTRCalculate();
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

  const natalBd = tr.natalReference.birthData;
  const natalMonths = ['', 'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

  elements.trTimingCard.innerHTML = `
    <div class="tr-timing-grid">
      <div class="tr-timing-main">
        <div class="tr-timing-date">
          <span class="tr-timing-icon">🔄</span>
          ${l.day} ${MONTH_NAMES[l.month]} ${l.year}
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
  const dateStr = `${l.day} ${MONTH_SHORT[l.month]} ${l.year}`;
  const timeStr = `${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}`;

  const natalBd = currentChart.birthData;
  const natalDate = `${natalBd.day} ${MONTH_SHORT[natalBd.month]} ${natalBd.year}`;

  drawBiWheel(canvas, currentChart, tr, {
    title: 'Transit Bi-Wheel',
    subtitle: `Natal: ${natalDate}\nTransit: ${dateStr} ${timeStr}\n${tr.location.name || tr.location.timezone}`,
    activePlanets: transitPlanetFilter?.getActiveSet(),
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

// ============================================
// PROGRESYON (Secondary Progressions)
// ============================================
function showProgressionPanel() {
  if (!currentChart) return;
  // Varsayılan hedef: bugün
  handlePRTodayClick();
  updatePRButtonState();
}

function handlePRTodayClick() {
  const now = new Date();
  elements.prDay.value = now.getDate();
  elements.prMonth.value = now.getMonth() + 1;
  elements.prYear.value = now.getFullYear();
  updatePRButtonState();
}

function updatePRButtonState() {
  if (!currentChart) {
    elements.prCalculateBtn.disabled = true;
    return;
  }
  const day = parseInt(elements.prDay.value);
  const month = parseInt(elements.prMonth.value);
  const year = parseInt(elements.prYear.value);
  const hasDate = !isNaN(day) && !isNaN(month) && !isNaN(year);
  elements.prCalculateBtn.disabled = !hasDate;
}

async function handlePRCalculate() {
  if (!currentChart) {
    alert('Lütfen önce natal haritayı hesaplayın.');
    return;
  }

  const targetDate = {
    year: parseInt(elements.prYear.value),
    month: parseInt(elements.prMonth.value),
    day: parseInt(elements.prDay.value),
  };

  const angleMethod = elements.prAngleMethod ? elements.prAngleMethod.value : DEFAULT_ANGLE_METHOD;

  elements.prCalculateBtn.disabled = true;
  elements.prCalculateBtn.innerHTML = '<span class="btn-icon">⏳</span> Hesaplanıyor...';

  try {
    currentProgression = await calculateSecondaryProgression(currentChart, targetDate, { angleMethod });
    renderPRResults(currentProgression);
    elements.prResults.classList.remove('hidden');
  } catch (error) {
    console.error('Progres hesaplama hatası:', error);
    alert('Progres hesaplama hatası: ' + error.message);
  } finally {
    elements.prCalculateBtn.disabled = false;
    elements.prCalculateBtn.innerHTML = '<span class="btn-icon">📈</span> Progres Hesapla';
  }
}

function renderPRResults(pr) {
  renderPRTimingCard(pr);
  renderPRChart(pr);
  renderPRPlanets(pr);
  renderPRHouses(pr);
  renderPRNatalAspects(pr);
  renderPRAspects(pr);
  renderPRDebug(pr);
  renderPRDecans(pr);
}

function renderPRTimingCard(pr) {
  const t = pr.targetDate;
  const methodName = ANGLE_METHODS.find(m => m.key === pr.angleMethod)?.name || pr.angleMethod;
  const ageYears = Math.floor(pr.elapsedYears);
  const ageMonths = Math.round((pr.elapsedYears - ageYears) * 12);
  const arcD = Math.floor(pr.solarArc);
  const arcM = Math.floor((pr.solarArc - arcD) * 60);

  elements.prTimingCard.innerHTML = `
    <div class="tr-timing-grid">
      <div class="tr-timing-main">
        <div class="tr-timing-date">
          <span class="tr-timing-icon">📈</span>
          ${t.day} ${MONTH_NAMES[t.month]} ${t.year}
        </div>
        <div class="tr-timing-time">
          <span class="tr-timing-label">Yaş:</span>
          <span class="tr-timing-value">${ageYears} yıl ${ageMonths} ay</span>
        </div>
        <div class="tr-timing-place">
          <span class="tr-timing-label">Yöntem:</span>
          <span class="tr-timing-value">${methodName}</span>
        </div>
      </div>
      <div class="tr-timing-points">
        <div class="tr-point">
          <span class="tr-point-label">Solar Arc</span>
          <span class="tr-point-value">${arcD}°${String(arcM).padStart(2, '0')}'</span>
        </div>
        <div class="tr-point">
          <span class="tr-point-label">Progres Anı (ephemeris)</span>
          <span class="tr-point-value">${pr.progMoment.day}.${String(pr.progMoment.month).padStart(2,'0')}.${pr.progMoment.year}</span>
        </div>
      </div>
    </div>
  `;
}

function renderPRChart(pr) {
  const canvas = $('prChartCanvas');
  if (!canvas || !currentChart) return;

  const t = pr.targetDate;
  const targetStr = `${t.day} ${MONTH_SHORT[t.month]} ${t.year}`;
  const natalBd = currentChart.birthData;
  const natalDate = `${natalBd.day} ${MONTH_SHORT[natalBd.month]} ${natalBd.year}`;
  const methodName = ANGLE_METHODS.find(m => m.key === pr.angleMethod)?.name || pr.angleMethod;

  // drawBiWheel transit alan adlarını bekler — progres objesi uyumlu (planets + transitNatalAspects)
  drawBiWheel(canvas, currentChart, pr, {
    title: 'Progres Bi-Wheel',
    subtitle: `Natal: ${natalDate}\nProgres: ${targetStr} (${Math.floor(pr.elapsedYears)} yaş)\n${methodName}`,
    activePlanets: progressionPlanetFilter?.getActiveSet(),
  });
}

function renderPRPlanets(pr) {
  const rows = pr.planets.map(planet => {
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

  elements.prPlanetsTable.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th></th>
          <th>Gezegen</th>
          <th>Pozisyon</th>
          <th>Tam Derece</th>
          <th></th>
          <th>Progres Ev</th>
        </tr>
      </thead>
      <tbody>
        ${rows.join('')}
      </tbody>
    </table>
  `;
}

function renderPRHouses(pr) {
  const angles = [
    { label: 'ASC', lon: pr.houses.ascendant },
    { label: 'MC', lon: pr.houses.mc },
    { label: 'DSC', lon: pr.houses.descendant },
    { label: 'IC', lon: pr.houses.ic },
  ];
  const angleRows = angles.map(a => {
    const pos = formatLongitude(a.lon);
    const sign = SIGNS[pos.signIndex];
    return `
      <tr class="element-${sign.element}">
        <td class="planet-name"><strong>${a.label}</strong></td>
        <td class="planet-pos">${pos.formatted}</td>
        <td class="planet-full">${pos.degree}°${pos.minute}'${pos.second}" ${signImgFromSign(sign)} ${sign.name}</td>
      </tr>
    `;
  });

  const cuspRows = pr.houses.cusps.map(c => {
    const pos = formatLongitude(c.longitude);
    const sign = SIGNS[pos.signIndex];
    return `
      <tr class="element-${sign.element}">
        <td class="planet-name">Ev ${c.house}</td>
        <td class="planet-pos">${pos.formatted}</td>
        <td class="planet-full">${pos.degree}°${pos.minute}'${pos.second}" ${signImgFromSign(sign)} ${sign.name}</td>
      </tr>
    `;
  });

  elements.prHousesTable.innerHTML = `
    <table class="data-table">
      <thead><tr><th>Açı</th><th>Pozisyon</th><th>Tam Derece</th></tr></thead>
      <tbody>${angleRows.join('')}</tbody>
    </table>
    <table class="data-table" style="margin-top:1rem;">
      <thead><tr><th>Ev</th><th>Pozisyon</th><th>Tam Derece</th></tr></thead>
      <tbody>${cuspRows.join('')}</tbody>
    </table>
  `;
}

function renderPRNatalAspects(pr) {
  if (!pr.progNatalAspects || pr.progNatalAspects.length === 0) {
    elements.prNatalAspectsTable.innerHTML = '<p class="no-data">Progres-natal aspekt bulunamadı</p>';
    return;
  }
  const sorted = [...pr.progNatalAspects].sort((a, b) => a.orb - b.orb);
  const rows = sorted.map(aspect => {
    const orbDeg = Math.floor(aspect.orb);
    const orbMin = Math.floor((aspect.orb - orbDeg) * 60);
    const applying = aspect.isApplying ? '<span class="applying">A</span>' : '<span class="separating">S</span>';
    return `
      <tr>
        <td>p${aspect.transitPlanet.symbol} ${aspect.transitPlanet.name}</td>
        <td class="aspect-symbol">${aspect.aspectSymbol}</td>
        <td>n${aspect.natalPlanet.symbol} ${aspect.natalPlanet.name}</td>
        <td>${aspect.aspect}</td>
        <td>${orbDeg}°${String(orbMin).padStart(2, '0')}'</td>
        <td>${applying}</td>
      </tr>
    `;
  });
  elements.prNatalAspectsTable.innerHTML = `
    <table class="data-table aspects-table">
      <thead>
        <tr><th>Progres Gezegen</th><th></th><th>Natal Gezegen</th><th>Aspekt</th><th>Orb</th><th>A/S</th></tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}

function renderPRAspects(pr) {
  if (!pr.progAspects || pr.progAspects.length === 0) {
    elements.prAspectsTable.innerHTML = '<p class="no-data">Progres aspekt bulunamadı</p>';
    return;
  }
  const sorted = [...pr.progAspects].sort((a, b) => a.orb - b.orb);
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
  elements.prAspectsTable.innerHTML = `
    <table class="data-table aspects-table">
      <thead>
        <tr><th>Gezegen 1</th><th></th><th>Gezegen 2</th><th>Aspekt</th><th>Orb</th><th>A/S</th></tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}

function renderPRDebug(pr) {
  elements.prDebugOutput.textContent = formatProgressionText(pr);
}

function renderPRDecans(pr) {
  if (!elements.prDecansDisplay || !currentChart) return;
  // Progres dekanlarını progres evler üzerinden hesapla
  const decanData = calculateHouseDecans(pr.houses, pr.planets);
  elements.prDecansDisplay.innerHTML = renderDecanHTML(decanData, pr.progAspects);
}


// ============================================
// ANALYSIS
// ============================================
async function showAnalysisPanel() {
  const noChart = $('analysisNoChart');
  const content = $('analysisContent');

  if (!currentChart) {
    noChart.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  }

  noChart.classList.add('hidden');
  content.classList.remove('hidden');

  // Load knowledge base if needed
  if (!analysisKnowledge) {
    try {
      analysisKnowledge = await loadKnowledge();
    } catch (e) {
      console.error('Knowledge base yüklenemedi:', e);
      return;
    }
  }

  renderRuleAnalysis();
}

function renderRuleAnalysis() {
  if (!currentChart || !analysisKnowledge) return;

  const facts = extractChartFacts(currentChart, analysisKnowledge);
  const sections = generateAnalysis(facts, analysisKnowledge);
  const container = $('analysisRuleResults');

  container.innerHTML = sections.map((s, i) => `
    <div class="analysis-card${i === 0 ? ' open' : ''}" data-section="${s.id}">
      <div class="analysis-card-header" onclick="this.parentElement.classList.toggle('open')">
        <span class="analysis-card-icon">${s.icon}</span>
        <span class="analysis-card-title">${s.title}</span>
        <span class="analysis-card-toggle">▼</span>
      </div>
      <div class="analysis-card-body">
        <div class="analysis-card-content">${formatAnalysisContent(s.content)}</div>
      </div>
    </div>
  `).join('');
}

function formatAnalysisContent(text) {
  return text
    .split('\n')
    .map(line => {
      line = line.trim();
      if (!line) return '';

      // Gezegen yerleşimi başlığı (@@PLANET_HEADER@@ marker)
      if (line.startsWith('@@PLANET_HEADER@@')) {
        const headerText = line.replace('@@PLANET_HEADER@@', '');
        return `<h4 class="analysis-planet-header">${headerText}</h4>`;
      }

      // Etiketli satırlar (label: value)
      const labelPatterns = [
        'Anahtar kavramlar:', 'Güçlü yönler:', 'Geliştirilmesi gereken yönler:',
        'Yönetici gezegen:', 'Baskın element:', 'Baskın nitelik:', 'Eksik element:',
        'Hassas vücut bölgeleri:', 'Dikkat edilmesi gereken:', 'Öfke tetikleyicisi:',
        'Temsil ettiği:', 'Ev konuları:', 'Dekan konusu:', 'Odak konular:',
        'Venüs şunları temsil eder:', 'Venüs durumu:', '7. ev konuları:',
        'Göz rengi:', 'Göz yapısı:', 'Boy:', 'Vücut yapısı:', 'Saç:',
        'Yürüyüş:', 'Ayırt edici işaretler:', 'Genel görünüm:', 'Yüz hatları:',
      ];
      for (const lbl of labelPatterns) {
        if (line.startsWith(lbl)) {
          const label = lbl.slice(0, -1);
          const value = line.slice(lbl.length).trim();
          return `<p class="analysis-label-line"><strong>${label}:</strong> ${value}</p>`;
        }
      }

      // Bölüm başlıkları (── xxx ──)
      if (line.startsWith('──')) {
        return `<p class="analysis-subtitle">${line}</p>`;
      }

      // Gezegen satırları (sembol ile başlayan)
      if (line.match(/^[☉☽♀♂☿♃♄♅♆♇⚷⚸℞]/)) {
        return `<p class="analysis-planet-line">${line}</p>`;
      }

      // Yorum satırları (→ ile başlayan)
      if (line.startsWith('→') || line.startsWith('  →')) {
        return `<p class="analysis-interp">${line.replace(/^\s*→\s*/, '→ ')}</p>`;
      }

      // Dekan bilgisi
      if (line.match(/^\s*Dekan \d/)) {
        return `<p class="analysis-decan">${line.trim()}</p>`;
      }

      // Element/nitelik bar gösterimi
      if (line.match(/^\s*(Ateş|Toprak|Hava|Su|Öncü|Sabit|Değişken):\s*\d/)) {
        return `<p class="analysis-bar-line">${line}</p>`;
      }

      // Element/nitelik yorum (italik gövde)
      if (line.match(/^(Ateş|Toprak|Hava|Su|Öncü|Sabit|Değişken) baskınlığı:/)) {
        return `<p class="analysis-balance-note"><em>${line}</em></p>`;
      }

      // Venüs aspektleri satırı
      if (line.startsWith('  ') && line.includes('—')) {
        return `<p class="analysis-interp">${line.trim()}</p>`;
      }

      return `<p>${line}</p>`;
    })
    .join('');
}

function setupAnalysisEvents() {
  // No additional setup needed for rule-based only mode
}

// ============================================
// SİNASTRİ / KOMPOZİT / DAVISON
// ============================================

/**
 * Sinastri panelini natal harita hesaplandığında tazeler.
 * Kişi A = üstteki natal formda hesaplanan harita.
 */
function showSynastryPanel() {
  if (!currentChart) return;

  const bd = currentChart.birthData;
  const cityName = selectedCity ? formatCityName(selectedCity) : '';
  elements.syPersonAInfo.textContent =
    `${bd.day} ${MONTH_NAMES[bd.month]} ${bd.year}, ${String(bd.hour).padStart(2, '0')}:${String(bd.minute).padStart(2, '0')} — ${cityName}`;

  updateSYButtonState();
}

function updateSYButtonState() {
  const filled = ['syBirthDay', 'syBirthMonth', 'syBirthYear', 'syBirthHour', 'syBirthMinute']
    .every(id => elements[id].value !== '' && !isNaN(parseInt(elements[id].value)));

  elements.syCalculateBtn.disabled = !(currentChart && filled && sySelectedCity);
}

async function handleSYCalculate() {
  if (!currentChart) {
    alert('Önce Kişi A için natal harita hesaplayın.');
    return;
  }
  if (!sySelectedCity) {
    alert('Kişi B için doğum yeri seçin.');
    return;
  }

  try {
    elements.syCalculateBtn.disabled = true;

    // Kişi B'nin natal haritası — Kişi A ile birebir aynı hesap yolu
    syChartB = await calculateNatalChart({
      year: parseInt(elements.syBirthYear.value),
      month: parseInt(elements.syBirthMonth.value),
      day: parseInt(elements.syBirthDay.value),
      hour: parseInt(elements.syBirthHour.value),
      minute: parseInt(elements.syBirthMinute.value),
      timezone: sySelectedCity.timezone,
      latitude: sySelectedCity.lat,
      longitude: sySelectedCity.lng,
    });

    const anchor = elements.syAnchor.value;

    currentSynastry = calculateSynastry(currentChart, syChartB);
    currentComposite = calculateComposite(currentChart, syChartB, { anchor });
    currentDavison = await calculateDavison(currentChart, syChartB);

    renderSYResults();
    elements.syResults.classList.remove('hidden');
  } catch (error) {
    console.error('Sinastri hesaplama hatası:', error);
    alert(`Hesaplama hatası: ${error.message}`);
  } finally {
    updateSYButtonState();
  }
}

function renderSYResults() {
  renderSYSummary();
  renderSYChart();
  renderSYAspects();
  renderSYGrid();
  renderSYHouses();
  renderSYComposite();
  renderSYDavison();
}

/** Kişi B'nin kısa kimliği. */
function syPersonBLabel() {
  const bd = syChartB.birthData;
  const city = sySelectedCity ? formatCityName(sySelectedCity) : '';
  return `${bd.day} ${MONTH_NAMES[bd.month]} ${bd.year}, ${String(bd.hour).padStart(2, '0')}:${String(bd.minute).padStart(2, '0')} — ${city}`;
}

function renderSYSummary() {
  const syn = currentSynastry;
  const major = syn.crossAspects.filter(a => a.orb < 3).length;

  elements.sySummaryCard.innerHTML = `
    <div class="sy-summary-row">
      <span class="sy-summary-label">Çapraz aspekt</span>
      <span class="sy-summary-value">${syn.crossAspects.length}</span>
      <span class="sy-summary-note">(${major} tanesi 3° orb altında)</span>
    </div>
    <div class="sy-summary-row">
      <span class="sy-summary-label">Kompozit çapa</span>
      <span class="sy-summary-value">${currentComposite.anchorUsed === 'mc' ? '10. Ev (MC)' : '1. Ev (ASC)'}</span>
      <span class="sy-summary-note">${currentComposite.anchor === 'auto' ? '(otomatik seçildi)' : '(elle seçildi)'}</span>
    </div>
  `;
}

/** Doğum verisinden kısa tarih (çizim altyazısı için). */
function syShortDate(bd) {
  return `${bd.day} ${MONTH_SHORT[bd.month]} ${bd.year}`;
}

/**
 * Sinastri bi-wheel'i çizer.
 *
 * Bi-wheel'in çerçevesi İÇ haritanın ASC'sine göre kurulur ve ev bandını da iç
 * harita çizer (chartWheelSF.js: drawBiWheel). Yani "kim içte" kozmetik değil —
 * gezegenlerin KİMİN evlerine düştüğünü belirler. Sinastride her iki okuma da
 * anlamlı olduğu için takas tek tuşla yapılabiliyor.
 *
 * Kompozit ve Davison takastan ETKİLENMEZ (orta nokta hesapları simetriktir),
 * o yüzden sadece bu çark yeniden çizilir.
 */
function renderSYChart() {
  const canvas = elements.syChartCanvas;
  if (!canvas || !currentChart || !syChartB) return;

  const inner = syFlipped ? syChartB : currentChart;
  const outer = syFlipped ? currentChart : syChartB;
  const innerName = syFlipped ? 'Kişi B' : 'Kişi A';
  const outerName = syFlipped ? 'Kişi A' : 'Kişi B';

  // İç/dış rolüne göre yeniden kur — çapraz aspektlerin yönü de buna bağlı
  const wheel = calculateSynastry(inner, outer);

  drawBiWheel(canvas, wheel.personA, wheel, {
    title: 'Sinastri Bi-Wheel',
    subtitle: `İç — ${innerName}: ${syShortDate(inner.birthData)}\n`
      + `Dış — ${outerName}: ${syShortDate(outer.birthData)}\n`
      + `${wheel.crossAspects.length} çapraz aspekt`,
    activePlanets: synastryPlanetFilter?.getActiveSet(),
  });

  elements.syLegendInner.textContent = `İç halka: ${innerName}`;
  elements.syLegendOuter.textContent = `Dış halka: ${outerName}`;
  elements.sySwapLabel.textContent = `${innerName === 'Kişi A' ? 'Kişi B' : 'Kişi A'}'yi içe al`;
  elements.sySwapBtn.classList.toggle('active', syFlipped);
}

/** İç/dış halkayı takas eder ve sadece çarkı yeniden çizer. */
function handleSYSwap() {
  if (!currentChart || !syChartB) return;
  syFlipped = !syFlipped;
  renderSYChart();
}

function renderSYAspects() {
  const aspects = [...currentSynastry.crossAspects].sort((x, y) => x.orb - y.orb);

  const rows = aspects.map(aspect => {
    const orbDeg = Math.floor(aspect.orb);
    const orbMin = Math.floor((aspect.orb - orbDeg) * 60);

    return `
      <tr>
        <td class="sy-cell-b">B ${aspect.transitPlanet.symbol} ${aspect.transitPlanet.name}</td>
        <td class="aspect-symbol">${aspect.aspectSymbol}</td>
        <td class="sy-cell-a">A ${aspect.natalPlanet.symbol} ${aspect.natalPlanet.name}</td>
        <td>${aspect.aspect}</td>
        <td>${orbDeg}°${String(orbMin).padStart(2, '0')}'</td>
      </tr>
    `;
  });

  elements.syAspectsTable.innerHTML = `
    <table class="data-table aspects-table">
      <thead>
        <tr>
          <th>Kişi B</th>
          <th></th>
          <th>Kişi A</th>
          <th>Aspekt</th>
          <th>Orb</th>
        </tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}

/**
 * Aspekt gridi: satırlar = Kişi A gezegenleri, sütunlar = Kişi B gezegenleri.
 * Sinastride ilişkinin şeklini bir bakışta görmenin en hızlı yolu.
 */
function renderSYGrid() {
  const planetsA = currentChart.planets;
  const planetsB = syChartB.planets;

  // (A.id, B.id) → aspekt
  const lookup = new Map();
  for (const asp of currentSynastry.crossAspects) {
    lookup.set(`${asp.natalPlanet.id}|${asp.transitPlanet.id}`, asp);
  }

  const header = planetsB.map(p =>
    `<th class="sy-grid-head" title="${p.name}">${p.symbol}</th>`).join('');

  const rows = planetsA.map(pa => {
    const cells = planetsB.map(pb => {
      const asp = lookup.get(`${pa.id}|${pb.id}`);
      if (!asp) return '<td class="sy-grid-cell"></td>';

      const orbDeg = Math.floor(asp.orb);
      const orbMin = Math.floor((asp.orb - orbDeg) * 60);
      const tight = asp.orb < 3 ? ' sy-grid-tight' : '';

      return `<td class="sy-grid-cell sy-aspect-${asp.angle}${tight}" title="${pa.name} ${asp.aspect} ${pb.name} — orb ${orbDeg}°${orbMin}'">
        <span class="sy-grid-symbol">${asp.aspectSymbol}</span>
        <span class="sy-grid-orb">${orbDeg}°</span>
      </td>`;
    }).join('');

    return `<tr><th class="sy-grid-head" title="${pa.name}">${pa.symbol}</th>${cells}</tr>`;
  });

  elements.syGridTable.innerHTML = `
    <p class="sy-grid-caption">Satır: Kişi A &nbsp;·&nbsp; Sütun: Kişi B &nbsp;·&nbsp; Koyu hücre: orb &lt; 3°</p>
    <div class="sy-grid-scroll">
      <table class="data-table sy-grid">
        <thead><tr><th></th>${header}</tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
  `;
}

/** Karşılıklı ev yerleşimleri — sinastrinin asıl anlatısı. */
function renderSYHouses() {
  const build = (planets, title, cls) => {
    const rows = planets.map(p => {
      const pos = formatLongitude(p.longitude);
      const sign = SIGNS[pos.signIndex];
      return `
        <tr class="element-${sign.element}">
          <td class="planet-symbol">${p.symbol}</td>
          <td class="planet-name">${p.name}</td>
          <td class="planet-pos">${pos.formatted}</td>
          <td class="planet-house">Ev ${p.house}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="sy-house-block">
        <h3 class="sy-house-title ${cls}">${title}</h3>
        <table class="data-table">
          <thead>
            <tr><th></th><th>Gezegen</th><th>Pozisyon</th><th>Düştüğü Ev</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  };

  elements.syHousesTable.innerHTML = `
    <div class="sy-houses-grid">
      ${build(currentSynastry.bPlanetsInAHouses, "Kişi B'nin gezegenleri → Kişi A'nın evlerinde", 'sy-title-b')}
      ${build(currentSynastry.aPlanetsInBHouses, "Kişi A'nın gezegenleri → Kişi B'nin evlerinde", 'sy-title-a')}
    </div>
  `;
}

/** Kompozit ve Davison için ortak gezegen tablosu. */
function renderSYPlanetTable(chart, target) {
  const rows = chart.planets.map(planet => {
    const pos = formatLongitude(planet.longitude);
    const sign = SIGNS[pos.signIndex];
    const retro = planet.isRetrograde ? '<span class="retro-badge">R</span>' : '';

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
        <td class="planet-house">Ev ${pof.house}</td>
      </tr>
    `);
  }

  target.innerHTML = `
    <table class="data-table">
      <thead>
        <tr><th></th><th>Gezegen</th><th>Pozisyon</th><th>Tam Derece</th><th>R</th><th>Ev</th></tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}

/** Kompozit ve Davison için ortak aspekt tablosu (harita içi aspektler). */
function renderSYAspectTable(chart, target) {
  const sorted = [...chart.aspects].sort((a, b) => a.orb - b.orb);

  const rows = sorted.map(aspect => {
    const orbDeg = Math.floor(aspect.orb);
    const orbMin = Math.floor((aspect.orb - orbDeg) * 60);
    const applying = aspect.isApplying
      ? '<span class="applying">A</span>'
      : '<span class="separating">S</span>';

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

  target.innerHTML = `
    <table class="data-table aspects-table">
      <thead>
        <tr><th>Gezegen</th><th></th><th>Gezegen</th><th>Aspekt</th><th>Orb</th><th>A/S</th></tr>
      </thead>
      <tbody>${rows.join('')}</tbody>
    </table>
  `;
}

function renderSYComposite() {
  const comp = currentComposite;
  const anchorName = comp.anchorUsed === 'mc' ? '10. Ev (MC) sabit' : '1. Ev (ASC) sabit';

  elements.syCompositeCard.innerHTML = `
    <div class="sy-subchart-title">⊕ Kompozit Harita <span class="sy-subchart-tag">Midpoint</span></div>
    <p class="sy-subchart-desc">
      Gezegenler iki haritanın karşılık gelen gezegenlerinin orta noktasıdır; ev cuspları da
      karşılık gelen cuspların orta noktasıdır (zodyak sırası korunacak şekilde düzeltilir).
      <strong>Bu sanal bir haritadır</strong> — gerçek bir gökyüzü anına karşılık gelmez.
    </p>
    <div class="sy-subchart-meta">
      <span>Çapa: <strong>${anchorName}</strong></span>
      <span>ASC: <strong>${formatLongitude(comp.houses.ascendant).formatted}</strong></span>
      <span>MC: <strong>${formatLongitude(comp.houses.mc).formatted}</strong></span>
    </div>
  `;

  drawChartWheel(elements.syCompositeCanvas, comp, {
    title: 'Composite Chart',
    subtitle: `Composite (Midpoint)\nKişi A × Kişi B\nÇapa: ${anchorName}`,
    showAspects: true,
    chartType: 'composite',
  });

  renderSYPlanetTable(comp, elements.syCompositePlanetsTable);
  renderSYAspectTable(comp, elements.syCompositeAspectsTable);
}

function renderSYDavison() {
  const dav = currentDavison;
  const u = dav.utc;
  const dateStr = `${u.day} ${MONTH_NAMES[u.month]} ${u.year}, ${String(u.hour).padStart(2, '0')}:${String(u.minute).padStart(2, '0')} UTC`;
  const loc = `${dav.location.latitude.toFixed(4)}°, ${dav.location.longitude.toFixed(4)}°`;

  elements.syDavisonCard.innerHTML = `
    <div class="sy-subchart-title">🕐 Davison Haritası <span class="sy-subchart-tag">Zaman/Uzay Orta Noktası</span></div>
    <p class="sy-subchart-desc">
      İki doğumun zaman ve uzay orta noktası için hesaplanmış <strong>gerçek</strong> bir haritadır —
      gökyüzü o anda, o yerde fiilen böyleydi.
    </p>
    <div class="sy-subchart-meta">
      <span>An: <strong>${dateStr}</strong></span>
      <span>Yer: <strong>${loc}</strong></span>
      <span>ASC: <strong>${formatLongitude(dav.houses.ascendant).formatted}</strong></span>
    </div>
  `;

  drawChartWheel(elements.syDavisonCanvas, dav, {
    title: 'Davison Chart',
    subtitle: `Davison (Time/Space Midpoint)\n${dateStr}\n${loc}`,
    showAspects: true,
    chartType: 'davison',
  });

  renderSYPlanetTable(dav, elements.syDavisonPlanetsTable);
  renderSYAspectTable(dav, elements.syDavisonAspectsTable);
}

// ============================================
// START
// ============================================

// Setup analysis event listeners after DOM loads
setupAnalysisEvents();

// Show analysis panel when analysis tab is activated
document.querySelectorAll('.main-tab[data-main-tab="analysis"]').forEach(tab => {
  tab.addEventListener('click', () => {
    setTimeout(() => showAnalysisPanel(), 50);
  });
});

// ============================================
// EASTER EGG — footer kalbi (Kerem ⇄ Damla)
// ============================================
// Kalbe tıklayınca footer'daki isim "Kerem" ↔ "Damla" arasında geçer.
// "Damla"ya dönerken ekranın her yerinde farklı boyutlarda kırmızı kalpler patlar.
function burstHearts() {
  const n = 40;
  for (let i = 0; i < n; i++) {
    const el = document.createElement('span');
    el.className = 'heart-particle';
    el.textContent = '❤️';
    el.style.left = `${Math.random() * 100}vw`;
    el.style.top = `${Math.random() * 100}vh`;
    el.style.fontSize = `${0.8 + Math.random() * 2.6}rem`;   // farklı boyutlar
    el.style.setProperty('--dx', `${(Math.random() - 0.5) * 60}vw`);
    el.style.setProperty('--dy', `${(Math.random() - 0.5) * 60}vh`);
    el.style.setProperty('--rot', `${(Math.random() - 0.5) * 540}deg`);
    el.style.animationDelay = `${Math.random() * 0.25}s`;
    el.style.animationDuration = `${1.4 + Math.random() * 1.3}s`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }
}

$('heartEgg')?.addEventListener('click', () => {
  const name = $('footerName');
  if (!name) return;
  const toDamla = name.textContent.trim() === 'Kerem';
  name.textContent = toDamla ? 'Damla' : 'Kerem';
  if (toDamla) burstHearts();
});

init();
