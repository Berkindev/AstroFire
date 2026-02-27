/**
 * AstroFire - Formatlama Modülü
 * Derece, burç, gezegen pozisyonlarını okunabilir formata çevirir
 * SolarFire formatı ile uyumlu
 */

import { SIGNS } from './constants.js';
import { normalizeDegree } from './ephemeris.js';

/**
 * Ekliptik boylamı burç/derece/dakika/saniye formatına çevirir
 * SolarFire formatı: "15°23'45" Koç" veya "15°Ko23'"
 * 
 * @param {number} longitude - Ekliptik boylam (0-360)
 * @param {boolean} includeSeconds - Saniye dahil mi
 * @returns {{ signIndex: number, sign: Object, degree: number, minute: number, second: number, formatted: string }}
 */
export function formatLongitude(longitude, includeSeconds = true) {
  const lon = normalizeDegree(longitude);
  const signIndex = Math.floor(lon / 30);
  const sign = SIGNS[signIndex];
  const degreeInSign = lon % 30;

  const degree = Math.floor(degreeInSign);
  const minutesFull = (degreeInSign - degree) * 60;
  const minute = Math.floor(minutesFull);
  const second = Math.floor((minutesFull - minute) * 60);

  let formatted;
  if (includeSeconds) {
    formatted = `${String(degree).padStart(2, '0')}°${sign.symbol}${String(minute).padStart(2, '0')}'${String(second).padStart(2, '0')}"`;
  } else {
    formatted = `${String(degree).padStart(2, '0')}°${sign.symbol}${String(minute).padStart(2, '0')}'`;
  }

  return {
    signIndex,
    sign,
    degree,
    minute,
    second,
    formatted,
    fullFormatted: `${degree}°${minute}'${second}" ${sign.name}`,
  };
}

/**
 * Gezegenin tam pozisyon bilgisini döndürür
 * @param {Object} planet - Gezegen verisi
 * @returns {string} ör: "☉ Güneş  15°♑23'  Ev 10  R"
 */
export function formatPlanetPosition(planet) {
  const pos = formatLongitude(planet.longitude);
  const retro = planet.isRetrograde ? ' R' : '';
  return `${planet.symbol} ${planet.name}  ${pos.formatted}${retro}  Ev ${planet.house}`;
}

/**
 * Ev cusp bilgisini formatlar
 * @param {Object} cusp - Ev cusp verisi
 * @returns {string} ör: "Ev 1: 15°♑23'"
 */
export function formatHouseCusp(cusp) {
  const pos = formatLongitude(cusp.longitude, false);
  return `Ev ${String(cusp.house).padStart(2, ' ')}: ${pos.formatted}`;
}

/**
 * Aspekt bilgisini formatlar
 * @param {Object} aspect
 * @returns {string} ör: "☉ ☌ ☽ (Konjunksiyon, orb: 2°30')"
 */
export function formatAspect(aspect) {
  const orbDeg = Math.floor(aspect.orb);
  const orbMin = Math.floor((aspect.orb - orbDeg) * 60);
  const applying = aspect.isApplying ? 'A' : 'S';
  return `${aspect.planet1.symbol} ${aspect.aspectSymbol} ${aspect.planet2.symbol} (${aspect.aspect}, orb: ${orbDeg}°${String(orbMin).padStart(2, '0')}') ${applying}`;
}

/**
 * Tam natal harita sonuçlarını metin olarak formatlar (debug/karşılaştırma için)
 * @param {Object} chart - calculateNatalChart() sonucu
 * @returns {string} Formatlı metin
 */
export function formatNatalChartText(chart) {
  const lines = [];
  
  lines.push('═══════════════════════════════════════');
  lines.push('          NATAL HARİTA SONUÇLARI');
  lines.push('═══════════════════════════════════════');
  lines.push('');
  
  // Doğum bilgileri
  const bd = chart.birthData;
  lines.push(`Tarih: ${String(bd.day).padStart(2, '0')}.${String(bd.month).padStart(2, '0')}.${bd.year}`);
  lines.push(`Saat: ${String(bd.hour).padStart(2, '0')}:${String(bd.minute).padStart(2, '0')}`);
  lines.push(`Yer: ${bd.latitude.toFixed(4)}N, ${bd.longitude.toFixed(4)}E`);
  lines.push(`Timezone: ${bd.utcOffset}`);
  lines.push(`Julian Day: ${chart.julianDay.toFixed(6)}`);
  lines.push('');
  
  // Gezegenler
  lines.push('─── GEZEGENLER ───────────────────────');
  for (const planet of chart.planets) {
    const pos = formatLongitude(planet.longitude);
    const retro = planet.isRetrograde ? '  R' : '   ';
    const house = `Ev ${String(planet.house).padStart(2, ' ')}`;
    lines.push(
      `${planet.symbol} ${planet.name.padEnd(20)} ${pos.fullFormatted.padEnd(20)} ${pos.formatted}${retro}  ${house}`
    );
  }
  
  // Şans Noktası
  if (chart.partOfFortune) {
    const pof = chart.partOfFortune;
    const pos = formatLongitude(pof.longitude);
    lines.push(
      `${pof.symbol} ${pof.name.padEnd(20)} ${pos.fullFormatted.padEnd(20)} ${pos.formatted}     (${pof.formula})`
    );
  }
  
  lines.push('');
  
  // Evler
  lines.push('─── EVLER (Placidus) ─────────────────');
  for (const cusp of chart.houses.cusps) {
    const pos = formatLongitude(cusp.longitude, false);
    const label = cusp.house === 1 ? ' (ASC)' :
                  cusp.house === 4 ? ' (IC)' :
                  cusp.house === 7 ? ' (DSC)' :
                  cusp.house === 10 ? ' (MC)' : '';
    lines.push(`Ev ${String(cusp.house).padStart(2, ' ')}: ${pos.fullFormatted.padEnd(20)} ${pos.formatted}${label}`);
  }
  
  lines.push('');
  
  // Özel noktalar
  lines.push('─── ÖZEL NOKTALAR ────────────────────');
  const ascPos = formatLongitude(chart.houses.ascendant);
  const mcPos = formatLongitude(chart.houses.mc);
  const dscPos = formatLongitude(chart.houses.descendant);
  const icPos = formatLongitude(chart.houses.ic);
  lines.push(`ASC: ${ascPos.fullFormatted}`);
  lines.push(`MC:  ${mcPos.fullFormatted}`);
  lines.push(`DSC: ${dscPos.fullFormatted}`);
  lines.push(`IC:  ${icPos.fullFormatted}`);
  
  if (chart.houses.vertex) {
    const vtxPos = formatLongitude(chart.houses.vertex);
    lines.push(`VTX: ${vtxPos.fullFormatted}`);
  }
  
  lines.push('');
  
  // Kıstırılmış burçlar
  if (chart.interceptedSigns.length > 0) {
    lines.push('─── KISTIRILMIŞ BURÇLAR ──────────────');
    for (const ic of chart.interceptedSigns) {
      lines.push(`  Ev ${ic.house}: ${SIGNS[ic.sign].symbol} ${SIGNS[ic.sign].name}`);
    }
    lines.push('');
  }
  
  // Aspektler
  if (chart.aspects.length > 0) {
    lines.push('─── ASPEKTLER ────────────────────────');
    for (const aspect of chart.aspects) {
      lines.push(`  ${formatAspect(aspect)}`);
    }
  }
  
  lines.push('');
  lines.push('═══════════════════════════════════════');
  
  return lines.join('\n');
}

/**
 * Tam Solar Return harita sonuçlarını metin olarak formatlar (debug/karşılaştırma için)
 * @param {Object} sr - calculateSolarReturn() sonucu
 * @returns {string} Formatlı metin
 */
export function formatSolarReturnText(sr) {
  const lines = [];
  
  lines.push('═══════════════════════════════════════');
  lines.push('       SOLAR RETURN SONUÇLARI');
  lines.push('═══════════════════════════════════════');
  lines.push('');
  
  // SR zamanı
  const l = sr.local;
  const u = sr.utc;
  lines.push(`Solar Return Tarihi: ${String(l.day).padStart(2, '0')}.${String(l.month).padStart(2, '0')}.${l.year}`);
  lines.push(`Yerel Saat: ${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}:${String(l.second).padStart(2, '0')} ${l.utcOffsetFormatted}`);
  lines.push(`UTC Saat: ${String(u.hour).padStart(2, '0')}:${String(u.minute).padStart(2, '0')}:${String(u.second).padStart(2, '0')}`);
  lines.push(`Konum: ${sr.location.latitude.toFixed(4)}N, ${sr.location.longitude.toFixed(4)}E`);
  if (sr.location.name) {
    lines.push(`Yer: ${sr.location.name}`);
  }
  lines.push(`Timezone: ${sr.location.timezone}`);
  lines.push(`Julian Day: ${sr.julianDay.toFixed(6)}`);
  lines.push('');
  
  // Natal referans
  const natalSunPos = formatLongitude(sr.natalSun.longitude);
  lines.push(`Natal Güneş: ${natalSunPos.fullFormatted} (${natalSunPos.formatted})`);
  lines.push('');
  
  // Gezegenler
  lines.push('─── GEZEGENLER ───────────────────────');
  for (const planet of sr.planets) {
    const pos = formatLongitude(planet.longitude);
    const retro = planet.isRetrograde ? '  R' : '   ';
    const house = `Ev ${String(planet.house).padStart(2, ' ')}`;
    lines.push(
      `${planet.symbol} ${planet.name.padEnd(20)} ${pos.fullFormatted.padEnd(20)} ${pos.formatted}${retro}  ${house}`
    );
  }
  
  lines.push('');
  
  // Evler
  lines.push('─── EVLER (Placidus) ─────────────────');
  for (const cusp of sr.houses.cusps) {
    const pos = formatLongitude(cusp.longitude, false);
    const label = cusp.house === 1 ? ' (ASC)' :
                  cusp.house === 4 ? ' (IC)' :
                  cusp.house === 7 ? ' (DSC)' :
                  cusp.house === 10 ? ' (MC)' : '';
    lines.push(`Ev ${String(cusp.house).padStart(2, ' ')}: ${pos.fullFormatted.padEnd(20)} ${pos.formatted}${label}`);
  }
  
  lines.push('');
  
  // Özel noktalar
  lines.push('─── ÖZEL NOKTALAR ────────────────────');
  const ascPos = formatLongitude(sr.houses.ascendant);
  const mcPos = formatLongitude(sr.houses.mc);
  const dscPos = formatLongitude(sr.houses.descendant);
  const icPos = formatLongitude(sr.houses.ic);
  lines.push(`ASC: ${ascPos.fullFormatted}`);
  lines.push(`MC:  ${mcPos.fullFormatted}`);
  lines.push(`DSC: ${dscPos.fullFormatted}`);
  lines.push(`IC:  ${icPos.fullFormatted}`);
  
  lines.push('');
  
  // Kıstırılmış burçlar
  if (sr.interceptedSigns.length > 0) {
    lines.push('─── KISTIRILMIŞ BURÇLAR ──────────────');
    for (const ic of sr.interceptedSigns) {
      lines.push(`  Ev ${ic.house}: ${SIGNS[ic.sign].symbol} ${SIGNS[ic.sign].name}`);
    }
    lines.push('');
  }
  
  // Aspektler
  if (sr.aspects.length > 0) {
    lines.push('─── ASPEKTLER ────────────────────────');
    for (const aspect of sr.aspects) {
      lines.push(`  ${formatAspect(aspect)}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════');

  return lines.join('\n');
}

export function formatLunarReturnText(lr) {
  const lines = [];

  lines.push('═══════════════════════════════════════');
  lines.push('       LUNAR RETURN SONUÇLARI');
  lines.push('═══════════════════════════════════════');
  lines.push('');

  const l = lr.local;
  const u = lr.utc;
  lines.push(`Lunar Return Tarihi: ${String(l.day).padStart(2, '0')}.${String(l.month).padStart(2, '0')}.${l.year}`);
  lines.push(`Yerel Saat: ${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}:${String(l.second).padStart(2, '0')} ${l.utcOffsetFormatted}`);
  lines.push(`UTC Saat: ${String(u.hour).padStart(2, '0')}:${String(u.minute).padStart(2, '0')}:${String(u.second).padStart(2, '0')}`);
  lines.push(`Konum: ${lr.location.latitude.toFixed(4)}N, ${lr.location.longitude.toFixed(4)}E`);
  if (lr.location.name) {
    lines.push(`Yer: ${lr.location.name}`);
  }
  lines.push(`Timezone: ${lr.location.timezone}`);
  lines.push(`Julian Day: ${lr.julianDay.toFixed(6)}`);
  lines.push('');

  const natalMoonPos = formatLongitude(lr.natalMoon.longitude);
  lines.push(`Natal Ay: ${natalMoonPos.fullFormatted} (${natalMoonPos.formatted})`);
  lines.push('');

  lines.push('─── GEZEGENLER ───────────────────────');
  for (const planet of lr.planets) {
    const pos = formatLongitude(planet.longitude);
    const retro = planet.isRetrograde ? '  R' : '   ';
    const house = `Ev ${String(planet.house).padStart(2, ' ')}`;
    lines.push(
      `${planet.symbol} ${planet.name.padEnd(20)} ${pos.fullFormatted.padEnd(20)} ${pos.formatted}${retro}  ${house}`
    );
  }

  lines.push('');

  lines.push('─── EVLER (Placidus) ─────────────────');
  for (const cusp of lr.houses.cusps) {
    const pos = formatLongitude(cusp.longitude, false);
    const label = cusp.house === 1 ? ' (ASC)' :
                  cusp.house === 4 ? ' (IC)' :
                  cusp.house === 7 ? ' (DSC)' :
                  cusp.house === 10 ? ' (MC)' : '';
    lines.push(`Ev ${String(cusp.house).padStart(2, ' ')}: ${pos.fullFormatted.padEnd(20)} ${pos.formatted}${label}`);
  }

  lines.push('');

  lines.push('─── ÖZEL NOKTALAR ────────────────────');
  const ascPos = formatLongitude(lr.houses.ascendant);
  const mcPos = formatLongitude(lr.houses.mc);
  const dscPos = formatLongitude(lr.houses.descendant);
  const icPos = formatLongitude(lr.houses.ic);
  lines.push(`ASC: ${ascPos.fullFormatted}`);
  lines.push(`MC:  ${mcPos.fullFormatted}`);
  lines.push(`DSC: ${dscPos.fullFormatted}`);
  lines.push(`IC:  ${icPos.fullFormatted}`);

  lines.push('');

  if (lr.interceptedSigns.length > 0) {
    lines.push('─── KISTIRILMIŞ BURÇLAR ──────────────');
    for (const ic of lr.interceptedSigns) {
      lines.push(`  Ev ${ic.house}: ${SIGNS[ic.sign].symbol} ${SIGNS[ic.sign].name}`);
    }
    lines.push('');
  }

  if (lr.aspects.length > 0) {
    lines.push('─── ASPEKTLER ────────────────────────');
    for (const aspect of lr.aspects) {
      lines.push(`  ${formatAspect(aspect)}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════');

  return lines.join('\n');
}

/**
 * Transit sonuçlarını metin olarak formatlar (debug/karşılaştırma için)
 * @param {Object} tr - calculateTransits() sonucu
 * @returns {string} Formatlı metin
 */
export function formatTransitText(tr) {
  const lines = [];

  lines.push('═══════════════════════════════════════');
  lines.push('         TRANSİT SONUÇLARI');
  lines.push('═══════════════════════════════════════');
  lines.push('');

  const l = tr.local;
  lines.push(`Transit Tarihi: ${String(l.day).padStart(2, '0')}.${String(l.month).padStart(2, '0')}.${l.year}`);
  lines.push(`Yerel Saat: ${String(l.hour).padStart(2, '0')}:${String(l.minute).padStart(2, '0')}`);
  const u = tr.utc;
  lines.push(`UTC Saat: ${String(u.hour).padStart(2, '0')}:${String(u.minute).padStart(2, '0')}`);
  lines.push(`Konum: ${tr.location.latitude.toFixed(4)}N, ${tr.location.longitude.toFixed(4)}E`);
  if (tr.location.name) {
    lines.push(`Yer: ${tr.location.name}`);
  }
  lines.push(`Timezone: ${tr.location.timezone}`);
  lines.push(`Julian Day: ${tr.julianDay.toFixed(6)}`);
  lines.push('');

  // Transit Gezegenler
  lines.push('─── TRANSİT GEZEGENLER ───────────────');
  for (const planet of tr.planets) {
    const pos = formatLongitude(planet.longitude);
    const retro = planet.isRetrograde ? '  R' : '   ';
    const house = planet.house ? `Ev ${String(planet.house).padStart(2, ' ')}` : '     ';
    lines.push(
      `${planet.symbol} ${planet.name.padEnd(20)} ${pos.fullFormatted.padEnd(20)} ${pos.formatted}${retro}  ${house}`
    );
  }

  lines.push('');

  // Transit-Natal Aspektler
  if (tr.transitNatalAspects && tr.transitNatalAspects.length > 0) {
    lines.push('─── TRANSİT-NATAL ASPEKTLER ──────────');
    for (const aspect of tr.transitNatalAspects) {
      const orbDeg = Math.floor(aspect.orb);
      const orbMin = Math.floor((aspect.orb - orbDeg) * 60);
      const applying = aspect.isApplying ? 'A' : 'S';
      lines.push(
        `  t${aspect.transitPlanet.symbol} ${aspect.aspectSymbol} n${aspect.natalPlanet.symbol} (${aspect.aspect}, orb: ${orbDeg}°${String(orbMin).padStart(2, '0')}') ${applying}`
      );
    }
    lines.push('');
  }

  // Transit Aspektler
  if (tr.transitAspects && tr.transitAspects.length > 0) {
    lines.push('─── TRANSİT ASPEKTLER ────────────────');
    for (const aspect of tr.transitAspects) {
      lines.push(`  ${formatAspect(aspect)}`);
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════');

  return lines.join('\n');
}
