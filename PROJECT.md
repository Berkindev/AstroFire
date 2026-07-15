# AstroFire — Proje Dokümantasyonu

> **Son güncelleme:** Temmuz 2026
> **Amaç:** SolarFire uyumlu profesyonel astroloji hesaplama web uygulaması

---

## 🏗️ Proje Yapısı

```
astrofire/
├── index.html                  # Form, sonuç panelleri, tab yapısı
├── vite.config.js              # Vite dev server (port 3000)
├── package.json
├── src/
│   ├── main.js                 # UI, event handling, render
│   ├── styles.css              # Dark theme
│   └── modules/
│       ├── constants.js        # Burçlar, gezegenler, aspektler, orblar
│       ├── ephemeris.js        # Swiss Ephemeris WASM sarmalayıcı
│       ├── datetime.js         # Yerel ↔ UTC, DST (IANA tzdb)
│       ├── chartUtils.js       # ★ Ortak: JD, midpoint, PoF, cusp, GAD
│       ├── aspects.js          # ★ Ortak: tek aspekt motoru
│       ├── returns.js          # ★ Ortak: tek dönüş-anı çözücü
│       ├── natal.js            # Natal harita
│       ├── solar.js            # Solar Return
│       ├── lunar.js            # Lunar Return
│       ├── transit.js          # Transit
│       ├── progression.js      # İkincil progresyon
│       ├── synastry.js         # ★ Sinastri + Kompozit + Davison
│       ├── chartWheelSF.js     # Canvas harita çizimi (tekil + bi-wheel)
│       ├── decans.js           # Dekanlar
│       ├── sevens.js           # 7'ler Kanunu
│       ├── formatting.js       # Derece/metin formatlama
│       ├── analysis.js         # Kural tabanlı analiz
│       └── geocoding.js        # Şehir arama
└── scripts/                    # Doğrulama araçları (aşağıya bak)
```

★ = ortak katman. Bu modüller çıkarılmadan önce aynı mantığın 3-7 kopyası
farklı dosyalarda dolaşıyordu (ve kopyalar aynı hataları taşıyordu).

---

## 🔧 Teknoloji

| Bileşen | Teknoloji |
|---------|-----------|
| Çekirdek | Vanilla JS (ES Modules) |
| Efemeris | `swisseph-wasm` (Swiss Ephemeris 2.10.03) |
| Bundler | Vite |
| Stil | Vanilla CSS, dark theme |
| Zaman dilimi | `Intl.DateTimeFormat` + IANA tzdb (tarihsel DST) |

Hesaplama ayarları: **tropikal, geosentrik, Placidus, Mean Node**
(`CALC_FLAGS = SEFLG_SWIEPH | SEFLG_SPEED`).

---

## ⚡ Çalıştırma

```bash
npm install
npm run dev        # → http://localhost:3000
npm run build
```

---

## ✅ Doğrulama

Bu projede birim testi yoktu; refactor sırasında davranışın korunduğunu
kanıtlamak için üç katmanlı bir emniyet ağı kuruldu.

```bash
npm test           # Birim testler (applying/separating, DST, ilişki haritaları)
npm run smoke      # Tarayıcıda uçtan uca — her sekmeyi sürer   (playwright gerekir)
npm run snapshot -- snapshots/before.json     # Golden snapshot üret
npm run diff -- snapshots/before.json snapshots/after.json
```

`smoke` için: `npm i -D playwright && npx playwright install chromium`

**Golden snapshot** yöntemi: `scripts/fixtures.mjs`'deki sabit girdi seti
(edge case'ler dahil: 1-6 Ocak doğumlu, DST sınırı, güney yarımküre, negatif
UTC offset) tüm hesaplama modüllerinden geçirilir ve JSON'a dökülür. Refactor
öncesi/sonrası diff **boş** çıkmalıdır. Bilerek davranış değiştiren bir düzeltme
yapıldığında ise diff, **sadece** beklenen alanları göstermelidir.

---

## ☀️ Solar Return yıl konvansiyonu — ÖNEMLİ

Girilen yıl, Solar Return **olayının** yılı değildir. Girilen yıl, solar
dönemin **çoğunluğunun düştüğü takvim yılıdır.**

| Doğum ayı | SR olayı |
|-----------|----------|
| Temmuz–Aralık | girilen yıl **− 1** |
| Ocak–Haziran | girilen yıl |

**Örnek:** 6 Ekim 1994 doğumlu biri "1995" girer → SR olayı **6 Ekim 1994**,
dönem 6 Eki 1994 – 6 Eki 1995 (3 ay 1994'te, 9 ay 1995'te → çoğunluk 1995).

Bu bilinçli bir tercihtir, hata değildir (`solar.js: solarEventYear`).
Kafa karıştırmaması için **kapsanan dönem SR yılı input'unun altında yazılır**
(`6 Ekim 1994 – 6 Ekim 1995`). Bu davranış `scripts/smoke.mjs` içinde
regresyon testiyle korunur — bozulursa smoke test patlar.

---

## 💞 İlişki Haritaları (`synastry.js`)

| Teknik | Ne yapar | Gerçek harita mı? |
|--------|----------|-------------------|
| **Sinastri** | İki haritayı üst üste bindirir: çapraz aspektler + karşılıklı ev yerleşimleri | — (yeni harita üretmez) |
| **Kompozit** | Gezegenler ve cusplar iki haritanın **orta noktası** | ❌ sanal |
| **Davison** | İki doğumun **zaman + uzay** orta noktası için hesaplanmış harita | ✅ gerçek |

### Kompozit ev cuspları (SolarFire "Composite – Midpoints")

SolarFire cuspları **doğrudan** karşılık gelen cuspların orta noktası olarak
alır — ASC/MC'den türetmez. Ama baz haritaların cuspları neredeyse karşıt
olduğunda kısa-yay orta noktaları **zodyak sırasını bozar**. SolarFire bunu bazı
cuspları uzun-yay orta noktasına çevirerek düzeltir; hangi cuspun sabit
tutulacağını "anchor" ayarı belirler:

- **Auto** (varsayılan) — 1. ve 10. evden hangisinin baz cuspları birbirine daha
  yakınsa o sabitlenir
- **Anchor on 1st** — ASC sabit
- **Anchor on 10th** — MC sabit

Üçü de UI'dan seçilebilir. Algoritmanın anahtarı: kadran ev sistemlerinde karşıt
cusplar tam 180° arayadır, dolayısıyla 6 bağımsız **eksen** vardır ve her eksende
tek karar verilir (hangi uç k. ev, hangi uç k+6. ev). Çapadan başlanıp zodyak
yönünde yürünür; her cusp için bir öncekinin 0–180° ilerisine düşen aday seçilir.
İki aday tam 180° arayada olduğu için bu koşulu **daima tam biri** sağlar → sıra
garanti altındadır. (`scripts/test-relationship.mjs` bu değişmezleri test eder.)

### Davison
- Zaman: iki doğumun (UTC tabanlı) Julian Day'lerinin ortalaması
- Yer: enlem ortalaması + boylamın **kısa-yay** ortalaması (antimeridyen doğru geçilir)
- Sonra sıradan bir natal hesap → gezegenler, Placidus evleri, aspektler, PoF

### Çizim
Sinastri bi-wheel'dir: **iç halka = Kişi A**, **dış halka = Kişi B**.
`drawBiWheel(canvas, iç, dış)` çapraz aspektlerde `transitPlanet` (dış) /
`natalPlanet` (iç) alan adlarına bakar; `synastry.js` bu sözleşmeye uyar
(`progression.js` de aynı numarayı yapıyor). Kompozit ve Davison tekil
`drawChartWheel` kullanır.

---

## 🐛 Düzeltilmiş bug'lar (Temmuz 2026)

| Bug | Neydi |
|-----|-------|
| **applying/separating** | Mantığın **7 kopyası** vardı ve **yedisi de** aynı hatayı taşıyordu: ayrım 0–180°'ye katlanıyor ama değişim hızının işareti katlanmıyordu. Sonuç, gezegenlerin dizideki **sırasına** bağlı hale geliyordu — aspektlerin ~yarısında A/S ters çıkıyordu. (3658 aspekt bayrağı düzeldi.) |
| **DST / `localToUTC`** | Offset, duvar saatinin UTC gibi okunduğu (gerçek andan saatlerce uzak) bir ana bakılarak ölçülüyordu. Araya DST geçişi girdiğinde sonuç **tam 1 saat** kayıyordu (ASC ~15°). Artık sabit nokta iterasyonu: `utc = yerel − offset(utc)`. |
| **SR arama tohumu** | "Yılın 79. günü + natal Güneş derecesi" kaba tahmini, **1–6 Ocak doğumlular** için bir sonraki yılın dönüşüne yakınsıyordu (kod bunu açıkça kabul ediyordu). Artık arama o yılın **doğum gününden** başlar; yıl kontrolüne ve ±365.25 retry'larına gerek kalmadı. |
| **Sessiz yakınsamama** | Bazı çözücüler 50 iterasyon sonunda eline ne geçtiyse döndürüyordu. Artık tek ortak çözücü (`returns.js`) yakınsamazsa **hata fırlatır.** |
| **Yakınsama toleransı** | Derece cinsindendi (1e-5°) ve sonuç tohuma göre ~1 saniye oynayabiliyordu. Artık **zaman** cinsinden (1e-7 gün ≈ 8.6 ms) — JD'nin kayan nokta çözünürlüğünün (~47 µs) güvenle üstünde. |

---

## 🗑️ Silinen ölü kod

- `chartWheel.js` (898 satır) — `chartWheelSF.js` ile değiştirilmişti, hiçbir yerden import edilmiyordu
- `analysis.js`'teki Claude API katmanı — çağrılmıyordu ve tarayıcıya API key gömecek şekilde yazılmıştı
- `constants.js`: `ASPECTS` (minör aspektler, hiç kullanılmadı), `SE_FLAGS`, `ELEMENT_COLORS`, `MEAN_LILITH`
- `formatting.js`: `formatPlanetPosition`, `formatHouseCusp` · `ephemeris.js`: `closeEphemeris`
- Şehir aramanın 4 kopyası → tek `createCitySearch()` factory
- Sekme değiştiricinin 5 kopyası → tek `switchSectionTab()`
- Ay adlarının 12 kopyası → `MONTH_NAMES` / `MONTH_SHORT`

---

## 📝 Özellikler

1. ✅ Natal harita (gezegenler, evler, aspektler, Şans Noktası, kıstırılmışlar)
2. ✅ Görsel harita (chart wheel) — tekil + bi-wheel
3. ✅ Solar Return (relokasyon destekli, dönem etiketli)
4. ✅ Lunar Return
5. ✅ Transit (bi-wheel + zaman adımları)
6. ✅ İkincil progresyon (SolarFire'ın 5 açı yöntemi)
7. ✅ 7'ler Kanunu, Dekanlar, Kural tabanlı analiz
8. ✅ **Sinastri + Kompozit + Davison**
