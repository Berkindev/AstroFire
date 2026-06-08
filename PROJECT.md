# AstroFire — Proje Dokümantasyonu

> **Son güncelleme:** Şubat 2026  
> **Amaç:** SolarFire uyumlu profesyonel astroloji hesaplama web uygulaması

---

## 🏗️ Proje Yapısı

```
aifire/
├── index.html              # Ana HTML — form, sonuç panelleri, tab yapısı
├── vite.config.js          # Vite dev server config (port 3000)
├── package.json            # Bağımlılıklar: swisseph-wasm, vite
├── src/
│   ├── main.js             # Ana uygulama — UI, event handling, render (876 satır)
│   ├── styles.css          # Tüm CSS — dark theme, responsive
│   └── modules/
│       ├── constants.js    # Burçlar, gezegenler, aspektler, element renkleri
│       ├── datetime.js     # UTC dönüşümü, timezone hesabı
│       ├── ephemeris.js    # Swiss Ephemeris WASM wrapper
│       ├── formatting.js   # Derece formatlama, konum gösterimi
│       ├── geocoding.js    # Şehir arama (API)
│       ├── natal.js        # Natal harita hesabı + Part of Fortune + Aspektler
│       └── solar.js        # Solar Return hesabı (SolarFire yıl konvansiyonu)
├── solardatas/             # SolarFire referans ekran görüntüleri (13 PNG)
└── sr-verification.html    # SR doğrulama test sayfası
```

---

## 🔧 Teknoloji Stack

| Bileşen | Teknoloji |
|---------|-----------|
| Çekirdek | Vanilla JS (ES Modules) |
| Efemeris | `swisseph-wasm` (Swiss Ephemeris WASM) |
| Bundler | Vite (dev: port 3000) |
| Stil | Vanilla CSS, dark theme, Inter + JetBrains Mono |
| Geocoding | Harici API (geocoding.js) |

---

## 📊 Veri Yapıları

### Natal Chart objesi (`currentChart`)
```js
{
  birthData: { year, month, day, hour, minute, timezone, latitude, longitude, utcOffset, utcOffsetMinutes },
  julianDay: number,
  planets: [
    { id, name, nameEn, symbol, longitude, latitude, distance, speed, isRetrograde, house, signIndex, degreeInSign }
    // Güneş, Ay, Merkür, Venüs, Mars, Jüpiter, Satürn, Uranüs, Neptün, Plüton,
    // Kuzey Ay Düğümü, Lilith, Chiron, Güney Ay Düğümü
  ],
  houses: {
    system: 'P',
    cusps: [ { house: 1-12, longitude, signIndex, degreeInSign } ],
    ascendant, mc, descendant, ic, vertex
  },
  interceptedSigns: [ { house, sign } ],
  partOfFortune: { name, symbol, longitude, signIndex, degreeInSign, isDaytime, formula },
  aspects: [ { planet1, planet2, aspect, aspectSymbol, angle, orb, isApplying } ]
}
```

### Solar Return objesi (`currentSolarReturn`)
```js
{
  // Natal referans
  natal: { sunLongitude, birthData },
  // SR zamanlaması
  timing: { julianDay, utc: {year,month,day,hour,minute,second}, local: {..., timezone} },
  // SR konumu
  location: { latitude, longitude, timezone, name },
  // Gezegen pozisyonları (aynı format natal ile)
  planets: [...],
  // Ev sistemi (aynı format)
  houses: { system, cusps, ascendant, mc, descendant, ic, vertex },
  // Part of Fortune
  partOfFortune: { name, symbol, longitude, house, ... },
  // Aspektler
  aspects: [...],
  interceptedSigns: [...]
}
```

---

## 🖥️ UI Yapısı

### Ana Form (Doğum Bilgileri)
- **Girdiler:** Gün, Ay, Yıl, Saat, Dakika (placeholder'lı, default değer yok)
- **Şehir Arama:** Doğum Yeri input + dropdown sonuçlar + koordinat/timezone gösterimi
- **Hızlı Şehirler:** İstanbul, Ankara, İzmir, Antalya, Eskişehir butonları
- **Ayarlar:** Geocentric, Tropical, Placidus, Mean Node badge'leri
- **Butonlar:** "Harita Hesapla" + "Temizle"

### Natal Sonuçlar (4 Tab)
1. **Gezegenler** — Tablo: sembol, isim, pozisyon, tam derece, retrograde, ev
2. **Evler** — 12 ev cusp pozisyonları
3. **Aspektler** — Gezegen çiftleri, aspekt tipi, orb, applying/separating
4. **Ham Veri** — JSON debug çıktısı

### Solar Return (ayrı panel)
- **Girdi:** SR yılı + Konum (doğum yeri veya başka yer)
- **SolarFire Yıl Konvansiyonu:**
  - Doğum ayı > 6 (Tem–Ara): SR olayı = girilen yıl - 1
  - Doğum ayı ≤ 6 (Oca–Haz): SR olayı = girilen yıl
- **Sonuçlar:** Zamanlama kartı + 4 tab (Gezegenler, Evler, Aspektler, Ham Veri)

---

## 🔑 Önemli Fonksiyonlar

### `src/main.js`
| Fonksiyon | Görev |
|-----------|-------|
| `init()` | Ephemeris başlatma, event listener'lar |
| `handleCalculate()` | Natal harita hesabı tetikleme |
| `handleSRCalculate()` | Solar Return hesabı tetikleme |
| `renderPlanets(chart)` | Natal gezegen tablosu |
| `renderSRPlanets(sr)` | SR gezegen tablosu (+ Şans Noktası) |
| `selectCity(city)` | Şehir seçimi UI güncelleme |
| `handleQuickCitySelect(key)` | Hızlı şehir butonu handler |
| `handleClearForm()` | Form sıfırlama |

### `src/modules/solar.js`
| Fonksiyon | Görev |
|-----------|-------|
| `findSolarReturnMoment(natalSunLon, year)` | Newton-Raphson ile SR anını bulma (±1s) |
| `calculateSolarReturn(natalChart, year, location)` | Tam SR haritası |
| `jdToLocal(jd, timezone)` | JD → yerel saat çevirme |
| `calculateSRAspects(planets)` | SR aspekt hesabı |

### `src/modules/natal.js`
| Fonksiyon | Görev |
|-----------|-------|
| `calculateNatalChart(birthData)` | Tam natal harita |
| `calculatePartOfFortune(asc, sun, moon, jd)` | Şans Noktası |
| `calculateAspects(planets)` | Aspekt hesabı |

### `src/modules/ephemeris.js`
| Fonksiyon | Görev |
|-----------|-------|
| `initEphemeris()` | Swiss Eph WASM yükleme (singleton) |
| `calculateJulianDay(y,m,d,h)` | Julian Day hesabı |
| `calculatePlanetPositions(jd, planets)` | Çoklu gezegen pozisyonu |
| `calculateHouses(jd, lat, lon, sys)` | Ev hesabı |
| `findHouseOfPlanet(lon, cusps)` | Gezegen-ev eşleşmesi |
| `normalizeDegree(deg)` | 0-360 normalizasyon |

---

## 🎨 Tasarım Sistemi

- **Tema:** Dark (koyu arka plan)
- **Fontlar:** Inter (UI), JetBrains Mono (veri)
- **Renkler:**
  - Accent: `#6366f1` (indigo) → `#8b5cf6` (mor) gradient
  - Ateş: `#e74c3c` | Toprak: `#27ae60` | Hava: `#f39c12` | Su: `#3498db`
- **Bileşenler:** Panel, tab, tablo, badge, radio, dropdown, buton

---

## ⚡ Çalıştırma

```bash
cd /Users/k/Desktop/aifire
npm run dev    # → http://localhost:3000
```

---

## 📝 Yapılan Özellikler (Kronolojik)

1. ✅ Swiss Ephemeris WASM entegrasyonu
2. ✅ Natal harita hesabı (gezegenler, evler, aspektler)
3. ✅ Şehir arama ve timezone belirleme
4. ✅ Part of Fortune (Şans Noktası) — natal
5. ✅ Solar Return hesabı (Newton-Raphson, ±1s hassasiyet)
6. ✅ SolarFire yıl konvansiyonu (Tem-Ara vs Oca-Haz)
7. ✅ Part of Fortune — SR haritasına eklendi
8. ✅ Hızlı şehir seçim butonları (5 Türk şehri)
9. ✅ Temizle butonu + form default'ları kaldırıldı
10. ✅ Görsel Harita (Chart Wheel) — `chartWheelSF.js` (natal/SR/LR tekil + transit/progres bi-wheel)
11. ✅ Lunar Return, Transit (bi-wheel + zaman adımları), 7'ler Kanunu, Dekanlar, Analiz motoru
12. ✅ **Progres Harita (İkincil Progresyon)** — `progression.js`, gün=yıl; SolarFire'ın 5 açı yöntemi (default: True Solar Arc in Longitude); transit gibi bi-wheel
13. 🔲 Sinastri (synastry)

> ⚠️ `src/modules/chartWheel.js` ÖLÜ KOD — hiçbir yerden import edilmiyor, yerini `chartWheelSF.js` aldı. Silinebilir.

---

## 🗺️ Sonraki Adım: Görsel Harita Modülü

SolarFire tarzı daire harita (chart wheel) — hem natal hem SR için.
Detaylar: `implementation_plan.md` dosyasında.
