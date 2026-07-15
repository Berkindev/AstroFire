/**
 * AstroFire - Tarih/Saat Dönüşüm Modülü
 * Yerel saat → UTC → Julian Day dönüşümleri
 * IANA timezone veritabanı ile tarihsel DST desteği
 */

/**
 * Verilen ANIN (UTC epoch ms) belirtilen timezone'daki UTC offset'i (dakika).
 *
 * Dikkat: girdi bir ANdır, duvar saati değil. Duvar saatinden offset bulmak
 * doğrudan mümkün değildir — çünkü offset'i bilmeden anı bilemezsin. Bu yüzden
 * localToUTC() sabit nokta iterasyonu yapar.
 *
 * @param {number} utcMs - Date.getTime() değeri
 * @param {string} timezone - IANA timezone ID
 * @returns {number} offset dakika (İstanbul kışın +120, yazın +180)
 */
function offsetAtInstant(utcMs, timezone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date(utcMs));
  const get = (type) => {
    const part = parts.find(p => p.type === type);
    return part ? parseInt(part.value, 10) : 0;
  };

  let hour = get('hour');
  if (hour === 24) hour = 0; // bazı ortamlar gece yarısını 24 basar

  // O andaki duvar saatini UTC gibi okuyup gerçek anla farkını al
  const wallAsUTC = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));

  return Math.round((wallAsUTC - utcMs) / 60000);
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
 * Yerel duvar saatini UTC'ye çevirir.
 *
 * Bu bir tavuk-yumurta problemidir: doğru offset'i bulmak için anı bilmen
 * gerekir, anı bulmak için de offset'i. Çözüm sabit nokta iterasyonu:
 *   utc = yerel - offset(utc)
 *
 * Eski kod tek atış yapıyordu: offset'i, duvar saatinin UTC gibi okunduğu
 * (yani gerçek andan saatlerce uzak) bir ana bakarak ölçüyordu. Araya bir DST
 * geçişi girdiğinde yanlış offset'i kullanıp sonucu TAM 1 SAAT kaydırıyordu.
 * Örn. İstanbul, 25 Mart 1990 00:30 yerel (DST 01:00'de başlıyor):
 * doğrusu 24 Mart 22:30 UTC iken 21:30 UTC üretiyordu → ASC ~15° kayıyordu.
 *
 * Belirsiz saatler:
 * - DST ileri atlarken OLMAYAN saat (ör. 02:30, saat 02:00→03:00 atladıysa):
 *   iterasyon sabitlenmez; geçişten önceki offset ile normalize edilir, yani
 *   girilen saat DST sonrasına kaydırılmış gibi yorumlanır.
 * - DST geri alınırken TEKRARLANAN saat: ilk (yaz saati) geçiş seçilir.
 * Her iki durumda da davranış deterministiktir.
 *
 * @param {number} year
 * @param {number} month (1-12)
 * @param {number} day
 * @param {number} hour (0-23)
 * @param {number} minute (0-59)
 * @param {string} timezone - IANA timezone ID
 * @returns {{ year, month, day, hour, minute, utcOffsetMinutes }}
 */
export function localToUTC(year, month, day, hour, minute, timezone) {
  // Duvar saatini UTC'ymiş gibi oku — iterasyonun başlangıç noktası
  const wallAsUTC = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Sabit nokta: utc = duvar - offset(utc)
  let offset = offsetAtInstant(wallAsUTC, timezone);
  let utcMs = wallAsUTC - offset * 60000;

  // İki tur yeter (offset kendisi de en fazla bir DST sınırı kaydırabilir);
  // üçüncü tur güvenlik payı. Sabitlenirse erken çık.
  for (let i = 0; i < 3; i++) {
    const nextOffset = offsetAtInstant(utcMs, timezone);
    if (nextOffset === offset) break;
    offset = nextOffset;
    utcMs = wallAsUTC - offset * 60000;
  }

  const utc = new Date(utcMs);

  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
    hour: utc.getUTCHours(),
    minute: utc.getUTCMinutes(),
    utcOffsetMinutes: offset,
  };
}

/**
 * Verilen YEREL duvar saatinin, o timezone'daki UTC offset'i (dakika).
 * localToUTC ile aynı sabit nokta çözümünü kullanır — dolayısıyla DST
 * sınırlarında tutarlıdır.
 *
 * @param {number} year
 * @param {number} month (1-12)
 * @param {number} day
 * @param {number} hour (0-23)
 * @param {number} minute (0-59)
 * @param {string} timezone - IANA timezone ID
 * @returns {number} offset dakika
 */
export function getUTCOffsetMinutes(year, month, day, hour, minute, timezone) {
  return localToUTC(year, month, day, hour, minute, timezone).utcOffsetMinutes;
}

/**
 * Saat + dakika → ondalıklı saat (Swiss Ephemeris julday formatı)
 * @param {number} hour (0-23)
 * @param {number} minute (0-59)
 * @returns {number} ör: 14:30 → 14.5
 */
export function toDecimalHour(hour, minute) {
  return hour + minute / 60;
}

/**
 * Doğum verisinden tam hesaplama girdi seti oluşturur
 *
 * @param {Object} birthData - { year, month, day, hour, minute, timezone }
 * @returns {{ utc: Object, decimalHourUTC: number, utcOffsetMinutes: number, utcOffsetFormatted: string }}
 */
export function prepareBirthData(birthData) {
  const { year, month, day, hour, minute, timezone } = birthData;

  const utc = localToUTC(year, month, day, hour, minute, timezone);

  return {
    utc,
    decimalHourUTC: toDecimalHour(utc.hour, utc.minute),
    utcOffsetMinutes: utc.utcOffsetMinutes,
    utcOffsetFormatted: formatUTCOffset(utc.utcOffsetMinutes),
  };
}
