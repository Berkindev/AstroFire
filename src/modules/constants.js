/**
 * AstroFire - Astroloji Sabitleri
 * SolarFire uyumlu sabitler ve tanımlamalar
 */

// ============================================
// BURÇLAR (Zodiac Signs)
// ============================================
export const SIGNS = [
  { index: 0, name: 'Koç', nameEn: 'Aries', symbol: '♈', element: 'fire', modality: 'cardinal', startDegree: 0 },
  { index: 1, name: 'Boğa', nameEn: 'Taurus', symbol: '♉', element: 'earth', modality: 'fixed', startDegree: 30 },
  { index: 2, name: 'İkizler', nameEn: 'Gemini', symbol: '♊', element: 'air', modality: 'mutable', startDegree: 60 },
  { index: 3, name: 'Yengeç', nameEn: 'Cancer', symbol: '♋', element: 'water', modality: 'cardinal', startDegree: 90 },
  { index: 4, name: 'Aslan', nameEn: 'Leo', symbol: '♌', element: 'fire', modality: 'fixed', startDegree: 120 },
  { index: 5, name: 'Başak', nameEn: 'Virgo', symbol: '♍', element: 'earth', modality: 'mutable', startDegree: 150 },
  { index: 6, name: 'Terazi', nameEn: 'Libra', symbol: '♎', element: 'air', modality: 'cardinal', startDegree: 180 },
  { index: 7, name: 'Akrep', nameEn: 'Scorpio', symbol: '♏', element: 'water', modality: 'fixed', startDegree: 210 },
  { index: 8, name: 'Yay', nameEn: 'Sagittarius', symbol: '♐', element: 'fire', modality: 'mutable', startDegree: 240 },
  { index: 9, name: 'Oğlak', nameEn: 'Capricorn', symbol: '♑', element: 'earth', modality: 'cardinal', startDegree: 270 },
  { index: 10, name: 'Kova', nameEn: 'Aquarius', symbol: '♒', element: 'air', modality: 'fixed', startDegree: 300 },
  { index: 11, name: 'Balık', nameEn: 'Pisces', symbol: '♓', element: 'water', modality: 'mutable', startDegree: 330 },
];

// ============================================
// GEZEGENLER (Planets)
// Swiss Ephemeris constant IDs
// ============================================
export const PLANETS = {
  SUN: { id: 0, name: 'Güneş', nameEn: 'Sun', symbol: '☉' },
  MOON: { id: 1, name: 'Ay', nameEn: 'Moon', symbol: '☽' },
  MERCURY: { id: 2, name: 'Merkür', nameEn: 'Mercury', symbol: '☿' },
  VENUS: { id: 3, name: 'Venüs', nameEn: 'Venus', symbol: '♀' },
  MARS: { id: 4, name: 'Mars', nameEn: 'Mars', symbol: '♂' },
  JUPITER: { id: 5, name: 'Jüpiter', nameEn: 'Jupiter', symbol: '♃' },
  SATURN: { id: 6, name: 'Satürn', nameEn: 'Saturn', symbol: '♄' },
  URANUS: { id: 7, name: 'Uranüs', nameEn: 'Uranus', symbol: '♅' },
  NEPTUNE: { id: 8, name: 'Neptün', nameEn: 'Neptune', symbol: '♆' },
  PLUTO: { id: 9, name: 'Plüton', nameEn: 'Pluto', symbol: '♇' },
  MEAN_NODE: { id: 10, name: 'KAD', nameEn: 'North Node', symbol: '☊' },
  CHIRON: { id: 15, name: 'Chiron', nameEn: 'Chiron', symbol: '⚷' },
};

// Natal haritada hesaplanacak gezegenler (sıralı)
export const NATAL_PLANETS = [
  PLANETS.SUN,
  PLANETS.MOON,
  PLANETS.MERCURY,
  PLANETS.VENUS,
  PLANETS.MARS,
  PLANETS.JUPITER,
  PLANETS.SATURN,
  PLANETS.URANUS,
  PLANETS.NEPTUNE,
  PLANETS.PLUTO,
  PLANETS.MEAN_NODE,
  PLANETS.CHIRON,
];

// ============================================
// EV SİSTEMLERİ (House Systems)
// ============================================
const HOUSE_SYSTEMS = {
  PLACIDUS: { code: 'P', name: 'Placidus' },
  KOCH: { code: 'K', name: 'Koch' },
  EQUAL: { code: 'E', name: 'Equal' },
  WHOLE_SIGN: { code: 'W', name: 'Whole Sign' },
  CAMPANUS: { code: 'C', name: 'Campanus' },
  REGIOMONTANUS: { code: 'R', name: 'Regiomontanus' },
  PORPHYRY: { code: 'O', name: 'Porphyry' },
  TOPOCENTRIC: { code: 'T', name: 'Topocentric' },
  MORINUS: { code: 'M', name: 'Morinus' },
  ALCABITIUS: { code: 'B', name: 'Alcabitius' },
};

// Default ev sistemi
export const DEFAULT_HOUSE_SYSTEM = HOUSE_SYSTEMS.PLACIDUS;

// ============================================
// ASPEKTLER (Aspects)
// SolarFire default orbları
// ============================================
export const MAJOR_ASPECTS = [
  { name: 'Kavuşum', nameEn: 'Conjunction', angle: 0, symbol: '☌', orb: 8 },
  { name: 'Karşıt', nameEn: 'Opposition', angle: 180, symbol: '☍', orb: 8 },
  { name: 'Üçgen', nameEn: 'Trine', angle: 120, symbol: '△', orb: 8 },
  { name: 'Kare', nameEn: 'Square', angle: 90, symbol: '□', orb: 7 },
  { name: 'Altıgen', nameEn: 'Sextile', angle: 60, symbol: '⚹', orb: 6 },
];

// ============================================
// Swiss Ephemeris Flags
// ============================================
// SEFLG_SWIEPH (2) | SEFLG_SPEED (256) → tropikal, geosentrik, hızlı
export const CALC_FLAGS = 2 | 256;
