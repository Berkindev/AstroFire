/**
 * AstroFire - Orb Tablosu
 *
 * Orb = bir açının "tam"dan ne kadar sapabileceği. Eskiden tek bir sabit
 * tabloydu (constants.js MAJOR_ASPECTS.orb): her gezegen, her harita tipi
 * aynı orb'u kullanıyordu. Artık orb iki şeye bağlı:
 *
 *   1. GEZEGEN GRUBU  — kişisel / jenerasyon / noktalar
 *   2. HARİTA PROFİLİ — natal, sinastri, transit… her biri kendi seti
 *
 * KARIŞIK ÇİFT KURALI: iki ucun grubu farklıysa JENERASYON grubu baz alınır
 * (dar mı geniş mi olduğuna bakılmaz — grup önceliği belirler).
 *   Güneş (kişisel) □ Plüton (jenerasyon) → jenerasyon orb'u
 *   Solar'da jenerasyon 7° / kişisel 5° → ☉□♇ = 7°
 * Öncelik sırası GRUP_ONCELIGI'nde; değiştirmek için o diziyi yeniden sırala.
 * NOKTALAR (ASC/MC/düğümler/Şans Noktası) her profilde 1°, ama öncelik
 * sırası jenerasyon → kişisel → noktalar olduğu için bu 1° yalnız
 * nokta × nokta çiftlerinde devreye girer. Nokta × gezegen çiftinde
 * gezegenin grubu belirler (natal ASC ☌ ☉ → 7°, ASC ☌ ♇ → 7°).
 * Ekol tercihi (Kerem, 2026-09-03).
 *
 * ⚠️ DEĞERLERİ DEĞİŞTİRMEK İÇİN: yalnız aşağıdaki ORB_TABLOSU'nu düzenle.
 *    Bir profilde yazmadığın grup `varsayilan` profilinden miras alınır;
 *    bir grupta yazmadığın açı da aynı şekilde. Yani sadece farklı olanı yaz.
 */

import { PLANETS } from './constants.js';

// ============================================
// GEZEGEN GRUPLARI
// ============================================

/** ☽ Ay · ☿ Merkür · ♀ Venüs · ☉ Güneş · ♂ Mars */
const KISISEL_IDS = new Set([
  PLANETS.SUN.id,      // 0
  PLANETS.MOON.id,     // 1
  PLANETS.MERCURY.id,  // 2
  PLANETS.VENUS.id,    // 3
  PLANETS.MARS.id,     // 4
]);

/** ♃ Jüpiter · ♄ Satürn · ♅ Uranüs · ♆ Neptün · ♇ Plüton · ⚷ Chiron */
const JENERASYON_IDS = new Set([
  PLANETS.JUPITER.id,  // 5
  PLANETS.SATURN.id,   // 6
  PLANETS.URANUS.id,   // 7
  PLANETS.NEPTUNE.id,  // 8
  PLANETS.PLUTO.id,    // 9
  PLANETS.CHIRON.id,   // 15
]);

/**
 * ASC · MC · ☊ KAD · ☋ GAD · ⊗ Şans Noktası
 * (id'ler: aspects.js ASC_POINT_ID=-101 / MC_POINT_ID=-102,
 *  chartUtils.js GAD=-1, natal/solar/lunar Şans Noktası=-99)
 * Buraya düşmeyen her şey de "noktalar" sayılır (fallback).
 */
export const GRUPLAR = ['kisisel', 'jenerasyon', 'noktalar'];

/** Gezegen/nokta id'sinden grup adı. */
export function grupBul(id) {
  if (KISISEL_IDS.has(id)) return 'kisisel';
  if (JENERASYON_IDS.has(id)) return 'jenerasyon';
  return 'noktalar';
}

// ============================================
// AÇI ADLARI
// ============================================

/** MAJOR_ASPECTS açısı → tablo anahtarı */
const ACI_ANAHTARI = {
  0: 'kavusum',
  180: 'karsit',
  120: 'ucgen',
  90: 'kare',
  60: 'altigen',
};

// ============================================
// ORB TABLOSU  ←←← DOLDURULACAK YER
// ============================================
//
// Her profil: 3 grup × 5 açı. Değerler DERECE cinsinden.
// Şu anki değerler eski tek-tablo davranışıyla birebir aynı
// (kavuşum/karşıt/üçgen 8°, kare 7°, altıgen 6°) — Kerem'in ekol
// değerleri gelince buradan güncellenecek.

/**
 * Tüm profillerin tabanı. Bir profil bir değeri yazmazsa buradan alır.
 * Aşağıdaki profillerin hepsi kendi değerini yazıyor; bu taban yalnızca
 * tabloda karşılığı olmayan bir profil adı gelirse devreye girer —
 * o yüzden natal ile aynı tutuldu (7°).
 */
const VARSAYILAN = {
  //             kavuşum ☌   karşıt ☍   üçgen △   kare □   altıgen ⚹
  kisisel:    { kavusum: 7, karsit: 7, ucgen: 7, kare: 7, altigen: 7 },
  jenerasyon: { kavusum: 7, karsit: 7, ucgen: 7, kare: 7, altigen: 7 },
  noktalar:   { kavusum: 1, karsit: 1, ucgen: 1, kare: 1, altigen: 1 },
};

/** Tek satırda "hepsi şu kadar" yazmanın kısayolu. */
const hepsi = (d) => ({ kavusum: d, karsit: d, ucgen: d, kare: d, altigen: d });

export const ORB_TABLOSU = {
  varsayilan: VARSAYILAN,

  /** Natal harita (kendi içi) — Kerem: gezegenler 7°, noktalar 1° */
  natal: {
    kisisel: hepsi(7),
    jenerasyon: hepsi(7),
    noktalar: hepsi(1),
  },

  /** Solar Return (kendi içi) — Kerem: jenerasyon 7°, kişisel 5° */
  solar: {
    kisisel: hepsi(5),
    jenerasyon: hepsi(7),
    noktalar: hepsi(1),
  },

  /** Lunar Return (kendi içi) — Kerem: solar gibi (jenerasyon 7°, kişisel 5°) */
  lunar: {
    kisisel: hepsi(5),
    jenerasyon: hepsi(7),
    noktalar: hepsi(1),
  },

  /** Gelişmiş Dönüşler — gezegen dönüşleri, demi/quarti (kendi içi)
   *  Solar/Lunar ile aynı mantık: dönüş haritası → jenerasyon 7°, kişisel 5° */
  donus: {
    kisisel: hepsi(5),
    jenerasyon: hepsi(7),
    noktalar: hepsi(1),
  },

  /** Transit — hem transit×natal çapraz hem transit×transit
   *  Kerem: jenerasyon 3°, kişisel 1° */
  transit: {
    kisisel: hepsi(1),
    jenerasyon: hepsi(3),
    noktalar: hepsi(1),
  },

  /** Progres — hem progres×natal çapraz hem progres×progres
   *  Kerem: transit gibi (jenerasyon 3°, kişisel 1°) */
  progres: {
    kisisel: hepsi(1),
    jenerasyon: hepsi(3),
    noktalar: hepsi(1),
  },

  /** Sinastri — kişi A × kişi B çapraz açılar — Kerem: gezegenler 3°, noktalar 1° */
  sinastri: {
    kisisel: hepsi(3),
    jenerasyon: hepsi(3),
    noktalar: hepsi(1),
  },

  /** Kompozit ve Davison (ikisi de ilişki haritası, kendi içi)
   *  Kerem: sinastri gibi (hepsi 3°) */
  kompozit: {
    kisisel: hepsi(3),
    jenerasyon: hepsi(3),
    noktalar: hepsi(1),
  },

  /** MultiWheel — bi/tri-wheel halkaları arası çapraz açılar
   *  Kerem: transit gibi (jenerasyon 3°, kişisel 1°) */
  multiwheel: {
    kisisel: hepsi(1),
    jenerasyon: hepsi(3),
    noktalar: hepsi(1),
  },
};

// ============================================
// ÇÖZÜMLEME
// ============================================

/** Profil adı geçerli mi? Değilse varsayılana düşer. */
function profilBul(profil) {
  return ORB_TABLOSU[profil] ? profil : 'varsayilan';
}

/**
 * Tek grubun, tek açı için orb'u. Profilde yoksa varsayılana düşer.
 * @param {string} profil - ORB_TABLOSU anahtarı
 * @param {string} grup   - 'kisisel' | 'jenerasyon' | 'noktalar'
 * @param {number} angle  - 0/60/90/120/180
 * @returns {number} derece
 */
export function grupOrbu(profil, grup, angle) {
  const anahtar = ACI_ANAHTARI[angle];
  if (!anahtar) return 0;

  const p = ORB_TABLOSU[profilBul(profil)];
  const deger = p?.[grup]?.[anahtar];
  if (typeof deger === 'number') return deger;

  return VARSAYILAN[grup]?.[anahtar] ?? 0;
}

/**
 * Karışık çiftte hangi grubun orb'u geçerli — soldaki önce gelir.
 * Jenerasyon her şeyi ezer, sonra kişisel gelir; noktaların orb'u ancak
 * ÇİFTİN İKİ UCU DA nokta olduğunda kullanılır (ASC × düğüm, ASC × Şans
 * Noktası gibi). Kerem'in kararı (2026-09-03).
 */
const GRUP_ONCELIGI = ['jenerasyon', 'kisisel', 'noktalar'];

/**
 * İki ucun ortak orb'u — KARIŞIK ÇİFTTE GRUP ÖNCELİĞİ BELİRLER.
 * (Eskiden dar olan alınıyordu; jenerasyon geniş orb aldığında yanlış
 *  sonuç veriyordu — bkz. dosya başındaki kural.)
 *
 * @param {string} profil - harita profili ('natal', 'sinastri'…)
 * @param {number} id1 - birinci ucun gezegen/nokta id'si
 * @param {number} id2 - ikinci ucun id'si
 * @param {number} angle - aspekt açısı (0/60/90/120/180)
 * @returns {number} bu çift için geçerli orb (derece)
 */
export function orbBul(profil, id1, id2, angle) {
  const g1 = grupBul(id1);
  const g2 = grupBul(id2);
  const grup = GRUP_ONCELIGI.find(g => g === g1 || g === g2) || 'kisisel';
  return grupOrbu(profil, grup, angle);
}

/** Bir profilin en geniş orb'u — tarama/pencere hesapları için. */
export function enGenisOrb(profil) {
  let max = 0;
  for (const grup of GRUPLAR) {
    for (const angle of Object.keys(ACI_ANAHTARI)) {
      max = Math.max(max, grupOrbu(profil, grup, Number(angle)));
    }
  }
  return max;
}
