/**
 * AstroFire - Ekol Yorum Motoru
 *
 * Kerem'in ekolünün ders notlarından derlenen bilgi tabanını (ekol-yorum.json)
 * hesaplanmış haritayla birleştirir ve kural tabanlı yorum raporu üretir.
 *
 * Ekolün ayırt edici yanı: her ev 3 dekana bölünür ve 36 ev-dekanın her birinin
 * kendine özgü konusu vardır (1. ev 1. dekan = fiziksel yapı; 2. dekan =
 * kişilik/karakter; 3. dekan = genel sağlık/mesleki yatkınlık...). Yorum bu
 * ayrıntı düzeyinde yapılır — genel "ev yorumu" değil.
 *
 * KURAL TABANLI: metin uydurulmaz. Bilgi tabanında karşılığı olmayan kombinasyon
 * "not eklenmemiş" olarak işaretlenir; böylece eksikler görünür kalır ve ders
 * notları zenginleştikçe rapor kendiliğinden derinleşir.
 */

import { SIGNS } from './constants.js';
import { SIGN_RULERS, calculateHouseDecans } from './decans.js';

// ============================================
// BİLGİ TABANI (lazy load)
// ============================================
let _kb = null;

export async function loadEkolYorum() {
  if (_kb) return _kb;
  const resp = await fetch('/data/ekol-yorum.json');
  if (!resp.ok) throw new Error('Ekol bilgi tabanı yüklenemedi (ekol-yorum.json).');
  _kb = await resp.json();
  return _kb;
}

// ============================================
// ELEMENT / NİTELİK DAĞILIMI — EKOL PUANLAMASI
// ============================================
/**
 * Ekol yöntemi: toplam 15 puan. Güneş ve Ay 2'şer, ASC ve MC 1'er, diğer
 * gezegenler 1'er puan. Puan, cismin bulunduğu burcun element ve nitelik
 * hücresine yazılır. (Kaynak: Welcome / Burçlar notları)
 */
export const EKOL_PUANLARI = {
  'Güneş': 2, 'Ay': 2,
  'ASC': 1, 'MC': 1,
  'Merkür': 1, 'Venüs': 1, 'Mars': 1, 'Jüpiter': 1, 'Satürn': 1,
  'Uranüs': 1, 'Neptün': 1, 'Plüton': 1, 'Chiron': 1,
};

const ELEMENT_TR = { fire: 'Ateş', earth: 'Toprak', air: 'Hava', water: 'Su' };
const MODALITE_TR = { cardinal: 'Öncü', fixed: 'Sabit', mutable: 'Değişken' };
// Doğal zodyak: 1-5-9 ateş, 2-6-10 toprak, 3-7-11 hava, 4-8-12 su;
// 1-4-7-10 öncü, 2-5-8-11 sabit, 3-6-9-12 değişken.
const EV_ELEMENTI = ['fire', 'earth', 'air', 'water'];
const EV_NITELIGI = ['cardinal', 'fixed', 'mutable'];

function signOf(longitude) {
  return SIGNS[Math.floor((((longitude % 360) + 360) % 360) / 30)];
}

/**
 * 4 element × 3 nitelik matrisi + toplamlar + baskın/eksik tespiti.
 * @returns {{matris, elementToplam, nitelikToplam, toplam, katilanlar, baskinElement, eksikElementler, baskinNitelik, eksikNitelikler}}
 */
export function hesaplaEkolDagilimi(chart) {
  const matris = {
    cardinal: { fire: 0, earth: 0, air: 0, water: 0 },
    fixed: { fire: 0, earth: 0, air: 0, water: 0 },
    mutable: { fire: 0, earth: 0, air: 0, water: 0 },
  };
  const katilanlar = [];

  const ekle = (ad, lon, ev, symbol) => {
    const puan = EKOL_PUANLARI[ad];
    if (!puan || lon == null) return;
    const s = signOf(lon);
    matris[s.modality][s.element] += puan;
    katilanlar.push({ ad, symbol, puan, burc: s.name, element: s.element, modalite: s.modality, ev });
  };

  for (const p of chart.planets || []) ekle(p.name, p.longitude, p.house, p.symbol);
  // ASC 1. evin, MC 10. evin başıdır — 2. turda bu evlerden okunurlar
  ekle('ASC', chart.houses?.ascendant, 1, '');
  ekle('MC', chart.houses?.mc, 10, '');

  const elementToplam = { fire: 0, earth: 0, air: 0, water: 0 };
  const nitelikToplam = { cardinal: 0, fixed: 0, mutable: 0 };
  let toplam = 0;

  for (const mod of Object.keys(matris)) {
    for (const el of Object.keys(matris[mod])) {
      const v = matris[mod][el];
      elementToplam[el] += v;
      nitelikToplam[mod] += v;
      toplam += v;
    }
  }

  const enBuyuk = (obj) => Object.entries(obj).reduce((a, b) => (b[1] > a[1] ? b : a))[0];
  const sifirlar = (obj) => Object.entries(obj).filter(([, v]) => v === 0).map(([k]) => k);
  // Ekolde "zayıf" eşiği: toplamın ~%10'unun altı (15 puanda 1 puan ve altı)
  const zayiflar = (obj) => Object.entries(obj).filter(([, v]) => v > 0 && v <= 1).map(([k]) => k);

  // --- 2. tur: ev üzerinden ---
  // Cisim, bulunduğu evin elementinden/niteliğinden FARKLI bir burçtaysa
  // puanı o evin elementine/niteliğine bir kez daha yazılır; aynıysa yazılmaz.
  // (Kişinin değişip değişememe potansiyeli — hoca, Eki 2026.)
  const elementEk = { fire: 0, earth: 0, air: 0, water: 0 };
  const nitelikEk = { cardinal: 0, fixed: 0, mutable: 0 };
  const katkilar = [];
  for (const k of katilanlar) {
    if (!k.ev) continue;
    const evEl = EV_ELEMENTI[(k.ev - 1) % 4];
    const evNit = EV_NITELIGI[(k.ev - 1) % 3];
    const el = k.element !== evEl ? evEl : null;
    const nit = k.modalite !== evNit ? evNit : null;
    if (el) elementEk[el] += k.puan;
    if (nit) nitelikEk[nit] += k.puan;
    if (el || nit) katkilar.push({ ...k, evElement: el, evNitelik: nit });
  }
  const topla = (a, b) => Object.fromEntries(Object.keys(a).map(k => [k, a[k] + b[k]]));
  const tur2 = {
    elementEk, nitelikEk, katkilar,
    elementSon: topla(elementToplam, elementEk),
    nitelikSon: topla(nitelikToplam, nitelikEk),
  };

  return {
    matris, elementToplam, nitelikToplam, toplam, katilanlar, tur2,
    baskinElement: enBuyuk(elementToplam),
    eksikElementler: sifirlar(elementToplam),
    zayifElementler: zayiflar(elementToplam),
    baskinNitelik: enBuyuk(nitelikToplam),
    eksikNitelikler: sifirlar(nitelikToplam),
    ELEMENT_TR, MODALITE_TR,
  };
}

// ============================================
// RAPOR
// ============================================

/** Yükselen ve yöneticisinin nerede olduğu — ekolde yorumun başlangıç noktası. */
function yukselenOzeti(chart) {
  const ascLon = chart.houses?.ascendant;
  if (ascLon == null) return null;

  const burc = signOf(ascLon);
  const yonetici = SIGN_RULERS[burc.index];
  const yoneticiGezegen = (chart.planets || []).find(p => p.name === yonetici.name) || null;

  // Yükselenin dekanı: 1. evin 1. dekanı — dekan burcu ve yöneticisi ayrı okunur
  const dekanBurcIndex = Math.floor((((ascLon % 30) + 30) % 30) / 10);
  const dekanBurc = SIGNS[(burc.index + dekanBurcIndex * 4) % 12];
  const dekanYonetici = SIGN_RULERS[dekanBurc.index];
  const dekanYoneticiGezegen = (chart.planets || []).find(p => p.name === dekanYonetici.name) || null;

  return {
    burc, derece: ((ascLon % 30) + 30) % 30,
    yonetici, yoneticiGezegen,
    dekanBurc, dekanYonetici, dekanYoneticiGezegen,
  };
}

/**
 * Tam yorum raporu.
 *
 * @param {Object} chart - calculateNatalChart() sonucu
 * @param {Object} kb - loadEkolYorum() sonucu
 * @returns {{yukselen, dagilim, evler, eksikSayisi}}
 */
export function buildEkolYorum(chart, kb) {
  const dekanVerisi = calculateHouseDecans(chart.houses, chart.planets);
  let eksikSayisi = 0;

  const evler = dekanVerisi.map(ev => {
    const kbEv = kb?.evler?.[String(ev.house)] || null;

    const dekanlar = ev.decans.map((d, i) => {
      const kbDekan = kbEv?.dekanlar?.[i] || null;
      const metinVar = !!(kbDekan && (kbDekan.aciklama || (kbDekan.maddeler || []).length));
      if (!metinVar) eksikSayisi++;

      // Bu dekana özgü gezegen notu (ör. "Plüton 1. dekanda ise…")
      const gezegenNotlari = [];
      for (const p of d.planets) {
        const not = kbDekan?.gezegenNotlari?.[p.name];
        if (not) gezegenNotlari.push({ gezegen: p.name, not });
      }

      // Bilgi tabanında açıklama çoğu zaman maddelerin birleştirilmiş hâli;
      // ikisini birden basmak aynı metni iki kez göstermek olur.
      const aciklama = kbDekan?.aciklama || '';
      const maddeler = kbDekan?.maddeler || [];
      const normalize = (s) => s.toLowerCase().replace(/[^a-zçğıöşü0-9]+/gi, '');
      const aciklamaNorm = normalize(aciklama);
      const tekrar = maddeler.length > 0
        && maddeler.every(m => aciklamaNorm.includes(normalize(m).slice(0, 60)));

      return {
        no: i + 1,
        derece: kbDekan?.derece || `${i * 10}-${(i + 1) * 10}`,
        baslik: kbDekan?.baslik || d.topic,
        aciklamaGoster: !!aciklama && !tekrar,
        dekanBurc: d.decanSign,
        dekanYonetici: d.ruler,
        gezegenler: d.planets,
        aciklama,
        maddeler,
        dekanYoneticisiNot: kbDekan?.dekanYoneticisiNot || '',
        gezegenNotlari,
        metinVar,
      };
    });

    return {
      house: ev.house,
      houseSign: ev.houseSign,
      cuspLongitude: ev.cuspLongitude,
      dogalBurc: kbEv?.dogalBurc || '',
      dogalYonetici: kbEv?.dogalYonetici || '',
      genel: kbEv?.genel || '',
      konular: kbEv?.konular || [],
      dekanlar,
    };
  });

  return {
    yukselen: yukselenOzeti(chart),
    dagilim: hesaplaEkolDagilimi(chart),
    evler,
    eksikSayisi,
    meta: kb?.meta || {},
  };
}
