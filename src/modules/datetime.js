/**
 * AstroFire - Tarih/Saat Dönüşüm Modülü
 * Yerel saat → UTC → Julian Day dönüşümleri
 * IANA timezone veritabanı ile tarihsel DST desteği
 */

/**
 * Verilen bir tarihin, verilen timezone'daki UTC offset'ini döndürür (dakika cinsinden).
 * Intl.DateTimeFormat kullanarak tarihsel DST kurallarını otomatik uygular.
 * 
 * @param {number} year
 * @param {number} month (1-12)
 * @param {number} day
 * @param {number} hour (0-23)
 * @param {number} minute (0-59)
 * @param {string} timezone - IANA timezone ID (ör: 'Europe/Istanbul')
 * @returns {number} UTC offset in minutes (ör: İstanbul kışın +120, yazın +180)
 */
export function getUTCOffsetMinutes(year, month, day, hour, minute, timezone) {
  // Tarihi o timezone'da oluştur ve UTC ile farkını bul
  // Trick: DateTimeFormat ile formatla, sonra UTC ile karşılaştır
  const dt = new Date(Date.UTC(year, month - 1, day, hour, minute, 0));
  
  // Bu tarihi timezone'da formatla
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const parts = formatter.formatToParts(dt);
  const getPart = (type) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };
  
  const tzYear = getPart('year');
  const tzMonth = getPart('month');
  const tzDay = getPart('day');
  let tzHour = getPart('hour');
  if (tzHour === 24) tzHour = 0;
  const tzMinute = getPart('minute');
  
  // Timezone'daki değerleri UTC'ye çevirerek offset'i bul
  const utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const tzMs = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, 0);
  
  return (tzMs - utcMs) / 60000;
}

/**
 * UTC offset'i saat:dakika formatında döndürür
 * @param {number} offsetMinutes
 * @returns {string} ör: "UTC+03:00"
 */
export function formatUTCOffset(offsetMinutes) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absMinutes = Math.abs(offsetMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Yerel saati UTC'ye çevirir.
 * Kullanıcı YEREL saat girer, biz UTC'ye çeviririz.
 * 
 * @param {number} year
 * @param {number} month (1-12)
 * @param {number} day
 * @param {number} hour (0-23)
 * @param {number} minute (0-59)
 * @param {string} timezone - IANA timezone ID
 * @returns {{ year: number, month: number, day: number, hour: number, minute: number, utcOffsetMinutes: number }}
 */
export function localToUTC(year, month, day, hour, minute, timezone) {
  // JavaScript local-to-UTC dönüşümü:
  // 1. Yerel saati o timezone'da Date nesnesine çevir
  // 2. UTC bileşenlerini çıkar

  // Adım 1: Geçici olarak UTC kabul et, sonra offset'i iteratif bul
  // (DST sınırlarında doğru çalışması için)
  
  // İlk tahmin: yerel saati doğrudan Date.UTC'ye ver
  const guessUTC = Date.UTC(year, month - 1, day, hour, minute, 0);
  
  // Bu UTC zamanının timezone'daki temsili
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  // İlk tahmin ile karşılaştır
  const parts1 = formatter.formatToParts(new Date(guessUTC));
  const getPart = (parts, type) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };
  
  let h1 = getPart(parts1, 'hour');
  if (h1 === 24) h1 = 0;
  const d1 = getPart(parts1, 'day');
  const m1 = getPart(parts1, 'minute');
  
  // Fark hesapla (dakika cinsinden)
  const localMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const tzMs = Date.UTC(
    getPart(parts1, 'year'),
    getPart(parts1, 'month') - 1,
    d1, h1, m1, 0
  );
  
  const diffMs = tzMs - localMs;
  
  // Doğru UTC zamanı: yerel saat - offset
  const correctUTC = new Date(guessUTC - diffMs);
  
  // Offset'i doğrula (ikinci iterasyon)
  const parts2 = formatter.formatToParts(correctUTC);
  const offsetMinutes = (Date.UTC(
    getPart(parts2, 'year'),
    getPart(parts2, 'month') - 1,
    getPart(parts2, 'day'),
    getPart(parts2, 'hour') === 24 ? 0 : getPart(parts2, 'hour'),
    getPart(parts2, 'minute'),
    0
  ) - correctUTC.getTime()) / 60000;
  
  return {
    year: correctUTC.getUTCFullYear(),
    month: correctUTC.getUTCMonth() + 1,
    day: correctUTC.getUTCDate(),
    hour: correctUTC.getUTCHours(),
    minute: correctUTC.getUTCMinutes(),
    utcOffsetMinutes: offsetMinutes,
  };
}

/**
 * UTC saat bilgisinden Julian Day Number hesaplar.
 * Swiss Ephemeris'in beklediği format: julday(year, month, day, decimalHour)
 * 
 * @param {number} year
 * @param {number} month (1-12)
 * @param {number} day
 * @param {number} hour (0-23)
 * @param {number} minute (0-59)
 * @returns {number} Ondalıklı saat (ör: 14:30 → 14.5)
 */
export function toDecimalHour(hour, minute) {
  return hour + minute / 60;
}

/**
 * Doğum verisinden tam hesaplama girdi seti oluşturur
 * 
 * @param {Object} birthData
 * @param {number} birthData.year
 * @param {number} birthData.month (1-12)
 * @param {number} birthData.day
 * @param {number} birthData.hour (0-23)
 * @param {number} birthData.minute (0-59)
 * @param {string} birthData.timezone - IANA timezone ID
 * @returns {{ utc: Object, decimalHourUTC: number, utcOffsetMinutes: number, utcOffsetFormatted: string }}
 */
export function prepareBirthData(birthData) {
  const { year, month, day, hour, minute, timezone } = birthData;
  
  // Yerel → UTC
  const utc = localToUTC(year, month, day, hour, minute, timezone);
  
  // Ondalıklı saat
  const decimalHourUTC = toDecimalHour(utc.hour, utc.minute);
  
  // Offset formatı
  const utcOffsetFormatted = formatUTCOffset(utc.utcOffsetMinutes);
  
  return {
    utc,
    decimalHourUTC,
    utcOffsetMinutes: utc.utcOffsetMinutes,
    utcOffsetFormatted,
  };
}
