/**
 * AstroFire - Gezegen ve Nokta Sembolleri
 *
 * Kaynak: Wikimedia Commons "(fixed width)" astronomik sembol ailesi (kamu malı).
 * Tutarlı bir set: hepsi 12×12 viewBox, 0.6 birim çizgi kalınlığı, ÇİZGİ tabanlı
 * (dolgu değil) — yani canvas'ta Path2D ile stroke edilirler ve her boyutta net
 * çıkarlar. Toplam ~3 KB.
 *
 * Wikimedia'da bulunmayan 4 sembol (Uranüs'ün astrolojik ♅ formu, Ay düğümleri,
 * Şans Noktası) aynı stilde elle yazıldı — hepsi daire/çizgi/yay birleşimi.
 * GAD (☋), KAD'ın 180° döndürülmüş hâlidir; ayrı bir şekle gerek yok.
 */

/** Sembollerin çizildiği kare kutunun kenarı (SVG viewBox birimi). */
export const SYMBOL_BOX = 12;

/**
 * Çizgi kalınlığı (aynı birimde).
 *
 * Kaynak SVG'ler 0.6 kullanıyor ama onlar 16px ikon olarak tasarlanmış. Haritada
 * semboller burç gliflerinin (dolgu tabanlı, dolayısıyla görsel ağırlığı yüksek)
 * yanında duruyor; 0.6 yanında solık kalıyor. 1.05 SolarFire'ın kalın glif
 * ağırlığına denk düşüyor.
 */
export const SYMBOL_STROKE = 1.05;

export const PLANET_SYMBOLS = {
  sun: {
    stroke: ['M10 6a4 4 0 1 0-8 0 4 4 0 1 0 8 0zm0 0'],
    fill: ['M6.9 6c0-.5-.4-.9-.9-.9s-.9.4-.9.9.4.9.9.9.9-.4.9-.9'],
  },
  moon: {
    stroke: ['M3.525 1.222a5 5 0 0 1 0 9.556 5 5 0 1 0 0-9.556z'],
  },
  mercury: {
    stroke: ['M8 5a1.999 1.999 0 1 0-4 0 1.999 1.999 0 1 0 4 0ZM4 1a1.999 1.999 0 1 0 4 0M6 11V7M4 9h4'],
  },
  venus: {
    stroke: ['M6 11V7M4 9h4m1-5a3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1 3-3 3 3 0 0 1 3 3Z'],
  },
  mars: {
    stroke: ['M9 7c0-2.207-1.793-4-4-4S1 4.793 1 7s1.793 4 4 4 4-1.793 4-4ZM7.828 4.172 11 1M9.23 1H11v1.77'],
  },
  jupiter: {
    stroke: ['M2.25 1a4.33 4.33 0 0 1 0 7.5h7.5M7.25 6v5'],
  },
  saturn: {
    stroke: ['M3 3h4M5 1v5a1.999 1.999 0 1 1 3.414 1.414C7.508 8.32 7 9.72 7 11'],
  },
  uranus: {
    stroke: ['M7.5 9.8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 1 1 3 0Z', 'M6 8.3V1.9', 'M2.7 4.3H9.3', 'M2.7 4.3V1.9', 'M9.3 4.3V1.9'],
  },
  neptune: {
    stroke: ['M6 11V1M3.5 7.25h5M2.25 1a3.751 3.751 0 0 0 7.5 0'],
  },
  pluto: {
    stroke: ['M7.25 2.25a1.25 1.25 0 1 0-2.498-.002 1.25 1.25 0 0 0 2.498.002ZM6 11V4.75m-2.5 2.5h5M2.25 1a3.751 3.751 0 0 0 7.5 0'],
  },
  northnode: {
    stroke: ['M3.5 9.6C3.5 7.7 2.3 7.2 2.3 5.4a3.7 3.7 0 0 1 7.4 0c0 1.8-1.2 2.3-1.2 4.2', 'M4.05 10.4a1.05 1.05 0 1 1-2.1 0 1.05 1.05 0 1 1 2.1 0Z', 'M10.05 10.4a1.05 1.05 0 1 1-2.1 0 1.05 1.05 0 1 1 2.1 0Z'],
  },
  chiron: {
    stroke: ['M7.745 1.709 6 3.5l1.792 1.745m.23 4.505C8.023 9.059 7.12 8.5 6 8.5c-1.119 0-2.023.559-2.023 1.25S4.881 11 6 11c1.119 0 2.023-.559 2.023-1.25ZM6 8.5c.013-2.5 0-5-.033-7.5'],
  },
  fortune: {
    stroke: ['M10 6a4 4 0 1 1-8 0 4 4 0 1 1 8 0Z', 'M3.17 3.17 8.83 8.83', 'M8.83 3.17 3.17 8.83'],
  },
};
