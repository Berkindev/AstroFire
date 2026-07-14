/**
 * Golden snapshot için sabit girdi seti.
 *
 * Refactor sırasında davranışın bozulmadığını kanıtlamak için kullanılır.
 * Edge case'ler bilinçli seçildi — her biri bilinen bir riski kapsıyor.
 */

export const PEOPLE = [
  {
    key: 'ekim-1994-istanbul',
    // Solar Return konvansiyonunun referans vakası (kullanıcının ekran görüntüsü):
    // "1995" girilince SR 6 Ekim 1994 05:21 UTC+02:00 çıkmalı.
    note: 'Tem-Ara doğumlu (SR konvansiyonu: year-1)',
    year: 1994, month: 10, day: 6, hour: 5, minute: 21,
    timezone: 'Europe/Istanbul', latitude: 41.0082, longitude: 28.9784,
    cityName: 'Istanbul, Turkey',
  },
  {
    key: 'ocak-3-1980-istanbul',
    // Natal Güneş ~282° → eski tohum heuristiği bunu year+1'e taşıyordu (Bug B).
    note: '1-6 Ocak doğumlu — SR arama tohumu bug bölgesi',
    year: 1980, month: 1, day: 3, hour: 14, minute: 30,
    timezone: 'Europe/Istanbul', latitude: 41.0082, longitude: 28.9784,
    cityName: 'Istanbul, Turkey',
  },
  {
    key: 'mart-1998-ankara',
    note: 'Oca-Haz doğumlu (SR konvansiyonu: year)',
    year: 1998, month: 3, day: 21, hour: 9, minute: 5,
    timezone: 'Europe/Istanbul', latitude: 39.9334, longitude: 32.8597,
    cityName: 'Ankara, Turkey',
  },
  {
    key: 'dst-siniri-1990-istanbul',
    // İstanbul'da DST 25 Mart 1990 01:00'de başladı (EET +02 → EEST +03).
    // 00:30 yerel → doğru UTC 24 Mart 22:30. Bug H burada 21:30 üretiyor.
    note: 'DST geçiş sınırı — localToUTC bug bölgesi',
    year: 1990, month: 3, day: 25, hour: 0, minute: 30,
    timezone: 'Europe/Istanbul', latitude: 41.0082, longitude: 28.9784,
    cityName: 'Istanbul, Turkey',
  },
  {
    key: 'guney-yarimkure-sydney',
    note: 'Güney yarımküre + güney DST',
    year: 1985, month: 11, day: 12, hour: 18, minute: 45,
    timezone: 'Australia/Sydney', latitude: -33.8688, longitude: 151.2093,
    cityName: 'Sydney, Australia',
  },
  {
    key: 'haziran-2001-newyork',
    note: 'Batı yarımküre, negatif UTC offset',
    year: 2001, month: 6, day: 30, hour: 23, minute: 55,
    timezone: 'America/New_York', latitude: 40.7128, longitude: -74.006,
    cityName: 'New York, USA',
  },
];

/** SR/LR/transit/progres için sabit hedefler — tarih bazlı, deterministik. */
export const SR_YEARS = [1995, 2010, 2026];

export const LR_TARGET = { year: 2026, month: 3, day: 15 };

export const TRANSIT_MOMENT = {
  year: 2026, month: 7, day: 14, hour: 12, minute: 0,
  timezone: 'Europe/Istanbul', latitude: 41.0082, longitude: 28.9784,
  name: 'Istanbul, Turkey',
};

export const PROGRESSION_TARGET = { year: 2026, month: 7, day: 14 };
