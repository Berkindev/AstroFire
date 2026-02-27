/**
 * AstroFire - Geocoding Modülü
 * Open-Meteo Geocoding API ile şehir arama
 * Sık kullanılan Türkiye şehirleri için yerel cache
 */

// ============================================
// YEREL CACHE - Türkiye'nin büyük şehirleri
// Koordinatlar SolarFire/astro.com ile uyumlu
// ============================================
const TURKEY_CITIES = [
  { name: 'İstanbul', admin: 'İstanbul', country: 'Türkiye', countryCode: 'TR', lat: 41.0082, lng: 28.9784, timezone: 'Europe/Istanbul', population: 15462452 },
  { name: 'Ankara', admin: 'Ankara', country: 'Türkiye', countryCode: 'TR', lat: 39.9334, lng: 32.8597, timezone: 'Europe/Istanbul', population: 5663322 },
  { name: 'İzmir', admin: 'İzmir', country: 'Türkiye', countryCode: 'TR', lat: 38.4192, lng: 27.1287, timezone: 'Europe/Istanbul', population: 4367251 },
  { name: 'Bursa', admin: 'Bursa', country: 'Türkiye', countryCode: 'TR', lat: 40.1828, lng: 29.0665, timezone: 'Europe/Istanbul', population: 3101833 },
  { name: 'Antalya', admin: 'Antalya', country: 'Türkiye', countryCode: 'TR', lat: 36.8969, lng: 30.7133, timezone: 'Europe/Istanbul', population: 2548308 },
  { name: 'Adana', admin: 'Adana', country: 'Türkiye', countryCode: 'TR', lat: 36.9914, lng: 35.3308, timezone: 'Europe/Istanbul', population: 2237940 },
  { name: 'Konya', admin: 'Konya', country: 'Türkiye', countryCode: 'TR', lat: 37.8746, lng: 32.4932, timezone: 'Europe/Istanbul', population: 2232374 },
  { name: 'Gaziantep', admin: 'Gaziantep', country: 'Türkiye', countryCode: 'TR', lat: 37.0660, lng: 37.3781, timezone: 'Europe/Istanbul', population: 2069364 },
  { name: 'Mersin', admin: 'Mersin', country: 'Türkiye', countryCode: 'TR', lat: 36.8121, lng: 34.6415, timezone: 'Europe/Istanbul', population: 1840425 },
  { name: 'Diyarbakır', admin: 'Diyarbakır', country: 'Türkiye', countryCode: 'TR', lat: 37.9144, lng: 40.2306, timezone: 'Europe/Istanbul', population: 1783431 },
  { name: 'Kayseri', admin: 'Kayseri', country: 'Türkiye', countryCode: 'TR', lat: 38.7312, lng: 35.4787, timezone: 'Europe/Istanbul', population: 1407409 },
  { name: 'Eskişehir', admin: 'Eskişehir', country: 'Türkiye', countryCode: 'TR', lat: 39.7767, lng: 30.5206, timezone: 'Europe/Istanbul', population: 887475 },
  { name: 'Samsun', admin: 'Samsun', country: 'Türkiye', countryCode: 'TR', lat: 41.2867, lng: 36.3300, timezone: 'Europe/Istanbul', population: 1356079 },
  { name: 'Trabzon', admin: 'Trabzon', country: 'Türkiye', countryCode: 'TR', lat: 41.0027, lng: 39.7168, timezone: 'Europe/Istanbul', population: 807903 },
  { name: 'Erzurum', admin: 'Erzurum', country: 'Türkiye', countryCode: 'TR', lat: 39.9043, lng: 41.2679, timezone: 'Europe/Istanbul', population: 767848 },
  { name: 'Malatya', admin: 'Malatya', country: 'Türkiye', countryCode: 'TR', lat: 38.3552, lng: 38.3095, timezone: 'Europe/Istanbul', population: 797036 },
  { name: 'Van', admin: 'Van', country: 'Türkiye', countryCode: 'TR', lat: 38.4891, lng: 43.3800, timezone: 'Europe/Istanbul', population: 1136757 },
  { name: 'Denizli', admin: 'Denizli', country: 'Türkiye', countryCode: 'TR', lat: 37.7765, lng: 29.0864, timezone: 'Europe/Istanbul', population: 1037208 },
  { name: 'Manisa', admin: 'Manisa', country: 'Türkiye', countryCode: 'TR', lat: 38.6191, lng: 27.4289, timezone: 'Europe/Istanbul', population: 1440611 },
  { name: 'Balıkesir', admin: 'Balıkesir', country: 'Türkiye', countryCode: 'TR', lat: 39.6484, lng: 27.8826, timezone: 'Europe/Istanbul', population: 1228620 },
  { name: 'Edirne', admin: 'Edirne', country: 'Türkiye', countryCode: 'TR', lat: 41.6818, lng: 26.5623, timezone: 'Europe/Istanbul', population: 413903 },
  { name: 'Kadıköy', admin: 'İstanbul', country: 'Türkiye', countryCode: 'TR', lat: 40.9927, lng: 29.0230, timezone: 'Europe/Istanbul', population: 484957 },
  { name: 'Beşiktaş', admin: 'İstanbul', country: 'Türkiye', countryCode: 'TR', lat: 41.0422, lng: 29.0000, timezone: 'Europe/Istanbul', population: 186570 },
  { name: 'Üsküdar', admin: 'İstanbul', country: 'Türkiye', countryCode: 'TR', lat: 41.0234, lng: 29.0153, timezone: 'Europe/Istanbul', population: 529145 },
  { name: 'Beyoğlu', admin: 'İstanbul', country: 'Türkiye', countryCode: 'TR', lat: 41.0370, lng: 28.9770, timezone: 'Europe/Istanbul', population: 230526 },
  { name: 'Bakırköy', admin: 'İstanbul', country: 'Türkiye', countryCode: 'TR', lat: 40.9819, lng: 28.8772, timezone: 'Europe/Istanbul', population: 228803 },
  { name: 'Beylikdüzü', admin: 'İstanbul', country: 'Türkiye', countryCode: 'TR', lat: 41.0022, lng: 28.6281, timezone: 'Europe/Istanbul', population: 352063 },
  { name: 'Fatih', admin: 'İstanbul', country: 'Türkiye', countryCode: 'TR', lat: 41.0186, lng: 28.9401, timezone: 'Europe/Istanbul', population: 430050 },
  { name: 'Ataşehir', admin: 'İstanbul', country: 'Türkiye', countryCode: 'TR', lat: 40.9832, lng: 29.1101, timezone: 'Europe/Istanbul', population: 419368 },
];

// API search sonuçları için cache
const searchCache = new Map();

/**
 * Şehir arama - önce yerel cache, sonra API
 * @param {string} query - Aranacak şehir adı
 * @returns {Promise<Array<Object>>} Bulunan şehirler
 */
export async function searchCity(query) {
  if (!query || query.length < 2) return [];
  
  const normalizedQuery = query.toLowerCase().trim();
  
  // Cache kontrolü
  if (searchCache.has(normalizedQuery)) {
    return searchCache.get(normalizedQuery);
  }
  
  // Önce yerel cache'de ara
  const localResults = TURKEY_CITIES.filter(city => 
    city.name.toLowerCase().includes(normalizedQuery) ||
    city.admin.toLowerCase().includes(normalizedQuery)
  );
  
  // Eğer yerel sonuç bulunduysa ve query Türkçe gibi duruyorsa yerel döndür
  if (localResults.length > 0 && normalizedQuery.length <= 4) {
    searchCache.set(normalizedQuery, localResults);
    return localResults;
  }
  
  // API'den ara
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=20&language=tr&format=json`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      // Sadece yerel sonuç varsa onu döndür
      if (localResults.length > 0) {
        searchCache.set(normalizedQuery, localResults);
        return localResults;
      }
      return [];
    }
    
    const apiResults = data.results.map(r => ({
      name: r.name,
      admin: r.admin1 || r.admin2 || '',
      country: r.country || '',
      countryCode: r.country_code || '',
      lat: r.latitude,
      lng: r.longitude,
      timezone: r.timezone,
      population: r.population || 0,
    }));
    
    // Yerel + API sonuçlarını birleştir (deduplicate)
    const combined = [...localResults];
    for (const apiResult of apiResults) {
      const isDuplicate = combined.some(
        c => Math.abs(c.lat - apiResult.lat) < 0.01 && Math.abs(c.lng - apiResult.lng) < 0.01
      );
      if (!isDuplicate) {
        combined.push(apiResult);
      }
    }
    
    // Nüfusa göre sırala
    combined.sort((a, b) => (b.population || 0) - (a.population || 0));
    
    searchCache.set(normalizedQuery, combined);
    return combined;
    
  } catch (error) {
    console.error('Geocoding API hatası:', error);
    // API başarısiz olursa yerel sonuç döndür
    if (localResults.length > 0) {
      return localResults;
    }
    return [];
  }
}

/**
 * Şehir bilgisini düzgün formatta döndürür
 * @param {Object} city
 * @returns {string} ör: "İstanbul, İstanbul, Türkiye"
 */
export function formatCityName(city) {
  const parts = [city.name];
  if (city.admin && city.admin !== city.name) {
    parts.push(city.admin);
  }
  if (city.country) {
    parts.push(city.country);
  }
  return parts.join(', ');
}

/**
 * Koordinatları derece/dakika/saniye formatına çevirir
 * @param {number} lat
 * @param {number} lng
 * @returns {string} ör: "41°N00' 028°E59'"
 */
export function formatCoordinates(lat, lng) {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  
  const absLat = Math.abs(lat);
  const absLng = Math.abs(lng);
  
  const latDeg = Math.floor(absLat);
  const latMin = Math.floor((absLat - latDeg) * 60);
  
  const lngDeg = Math.floor(absLng);
  const lngMin = Math.floor((absLng - lngDeg) * 60);
  
  return `${String(latDeg).padStart(2, '0')}°${latDir}${String(latMin).padStart(2, '0')}' ${String(lngDeg).padStart(3, '0')}°${lngDir}${String(lngMin).padStart(2, '0')}'`;
}
