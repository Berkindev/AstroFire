/**
 * AstroFire - Chart Wheel Renderer
 * SolarFire tarzı astroloji çember haritası — HTML5 Canvas
 */

import { SIGNS } from './constants.js';

// ============================================
// PLANET COLORS (SolarFire tarzı)
// ============================================
const PLANET_COLORS = {
  'Güneş': '#DAA520',
  'Ay': '#8B7355',
  'Merkür': '#228B22',
  'Venüs': '#008B8B',
  'Mars': '#DC143C',
  'Jüpiter': '#FF8C00',
  'Satürn': '#8B6914',
  'Uranüs': '#2E8B57',
  'Neptün': '#191970',
  'Plüton': '#800080',
  'KAD': '#8B0000',
  'GAD': '#556B2F',
  'Lilith': '#4B0082',
  'Chiron': '#2F4F4F',
  'Şans Noktası': '#333333',
};

// ============================================
// ELEMENT COLORS
// ============================================
const ELEMENT_COLORS = {
  fire:  { bg: '#ff0000', symbol: '#FFFFFF', border: '#ff0000' },
  earth: { bg: '#00ff00', symbol: '#FFFFFF', border: '#00ff00' },
  air:   { bg: '#00ccc8', symbol: '#FFFFFF', border: '#00ccc8' },
  water: { bg: '#1b00ff', symbol: '#FFFFFF', border: '#1b00ff' },
};

// ============================================
// ASPECT STYLES
// ============================================
const ASPECT_STYLES = {
  0:   { color: '#0000CD', width: 3.5, dash: [] },
  180: { color: '#DC143C', width: 3.0, dash: [] },
  120: { color: '#0000CD', width: 2.5, dash: [] },
  90:  { color: '#DC143C', width: 2.5, dash: [] },
  60:  { color: '#0000CD', width: 1.5, dash: [] },
  45:  { color: '#FF69B4', width: 0.8, dash: [3, 3] },
  135: { color: '#FF69B4', width: 0.8, dash: [3, 3] },
  30:  { color: '#32CD32', width: 0.8, dash: [2, 2] },
  150: { color: '#32CD32', width: 0.8, dash: [2, 2] },
  72:  { color: '#9370DB', width: 0.8, dash: [4, 2] },
  144: { color: '#9370DB', width: 0.8, dash: [4, 2] },
};

const ASPECT_SYMBOLS = {
  0: '☌', 180: '☍', 120: '△', 90: '□', 60: '⚹',
  45: '∠', 135: '⚼', 30: '⚺', 150: '⚻', 72: 'Q', 144: 'bQ',
};

// ============================================
// MAIN EXPORT
// ============================================

/**
 * @param {HTMLCanvasElement} canvas
 * @param {Object} chartData
 * @param {Object} options — { title, subtitle, showAspects, chartType }
 */
export function drawChartWheel(canvas, chartData, options = {}) {
  if (!canvas || !chartData) return;

  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // White background like SolarFire
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // ===== RADII — SolarFire proportions =====
  // Outermost tick ring
  const outerR  = size * 0.48;
  // Zodiac colored band: wide for big symbols
  const zodiacR = size * 0.455;
  const innerZR = size * 0.35;
  // Planet glyph zone
  const planetR = size * 0.27;
  // Inner circle (aspect area)
  const innerR  = size * 0.19;

  const radii = { outerR, zodiacR, innerZR, planetR, innerR };
  const ascLon = chartData.houses?.ascendant ?? 0;

  // Draw layers back-to-front
  drawOuterTicks(ctx, cx, cy, radii, ascLon);
  drawZodiacRing(ctx, cx, cy, radii, ascLon);
  drawHouseCusps(ctx, cx, cy, chartData.houses, radii, ascLon);
  drawInnerCircle(ctx, cx, cy, innerR);
  drawAngles(ctx, cx, cy, chartData.houses, radii, ascLon);

  if (options.showAspects !== false && chartData.aspects) {
    drawAspects(ctx, cx, cy, chartData.planets, chartData.aspects, innerR, ascLon, chartData.partOfFortune);
  }

  drawPlanets(ctx, cx, cy, chartData.planets, radii, ascLon, chartData.partOfFortune);

  if (options.title) {
    drawInfoBlock(ctx, options);
  }
}


// ============================================
// COORDINATE HELPERS
// ============================================

function lonToAngle(lon, ascLon) {
  return Math.PI + (lon - ascLon) * Math.PI / 180;
}

function polarToXY(cx, cy, r, angle) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  };
}


// ============================================
// OUTER DEGREE TICKS
// ============================================

function drawOuterTicks(ctx, cx, cy, radii, ascLon) {
  const { outerR } = radii;

  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 0.7;

  for (let deg = 0; deg < 360; deg++) {
    const angle = lonToAngle(deg, ascLon);
    const isMajor = deg % 10 === 0;
    const is5 = deg % 5 === 0;
    const tickInner = isMajor ? outerR - 14 : (is5 ? outerR - 9 : outerR - 4);

    const p1 = polarToXY(cx, cy, outerR, angle);
    const p2 = polarToXY(cx, cy, tickInner, angle);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // Outer circle — thick
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();
}


// ============================================
// ZODIAC RING — wide band, HUGE symbols
// ============================================

function drawZodiacRing(ctx, cx, cy, radii, ascLon) {
  const { zodiacR, innerZR } = radii;

  for (let i = 0; i < 12; i++) {
    const sign = SIGNS[i];
    const startDeg = i * 30;
    const endDeg = (i + 1) * 30;

    const startAngle = lonToAngle(startDeg, ascLon);
    const endAngle = lonToAngle(endDeg, ascLon);
    const elemColor = ELEMENT_COLORS[sign.element];

    // Fill segment
    ctx.beginPath();
    ctx.arc(cx, cy, zodiacR, -startAngle, -endAngle, true);
    ctx.arc(cx, cy, innerZR, -endAngle, -startAngle, false);
    ctx.closePath();
    ctx.fillStyle = elemColor.bg;
    ctx.fill();
    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Sign symbol — HUGE bold like SolarFire
    const midDeg = startDeg + 15;
    const midAngle = lonToAngle(midDeg, ascLon);
    const symbolR = (zodiacR + innerZR) / 2;
    const pos = polarToXY(cx, cy, symbolR, midAngle);

    ctx.save();
    ctx.font = 'bold 48px serif';
    ctx.fillStyle = elemColor.symbol;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 2;
    ctx.fillText(sign.symbol, pos.x, pos.y);
    ctx.restore();
  }

  // Circle borders — thick
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, innerZR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, zodiacR, 0, Math.PI * 2);
  ctx.stroke();
}


// ============================================
// HOUSE CUSPS
// ============================================

function drawHouseCusps(ctx, cx, cy, houses, radii, ascLon) {
  if (!houses || !houses.cusps) return;
  const { innerZR, innerR } = radii;

  for (let i = 0; i < houses.cusps.length; i++) {
    const cusp = houses.cusps[i];
    const houseNum = cusp.house;
    const lon = cusp.longitude;
    const angle = lonToAngle(lon, ascLon);

    const isAngular = [1, 4, 7, 10].includes(houseNum);

    // Cusp line — angular cusps much thicker
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = isAngular ? 2.5 : 1.2;
    const p1 = polarToXY(cx, cy, innerZR, angle);
    const p2 = polarToXY(cx, cy, innerR, angle);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // House number — BIG bold
    const nextCusp = houses.cusps[(i + 1) % 12];
    let midLon = lon + angleBetween(lon, nextCusp.longitude) / 2;
    if (midLon >= 360) midLon -= 360;
    const midAngle = lonToAngle(midLon, ascLon);
    const numR = (innerR + innerZR) / 2 * 0.65;
    const numPos = polarToXY(cx, cy, numR, midAngle);

    ctx.save();
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillStyle = '#444444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(houseNum.toString(), numPos.x, numPos.y);
    ctx.restore();

    // Cusp degree label outside zodiac ring
    drawCuspDegreeLabel(ctx, cx, cy, lon, radii, ascLon);
  }
}

function angleBetween(lon1, lon2) {
  let diff = lon2 - lon1;
  while (diff < 0) diff += 360;
  while (diff >= 360) diff -= 360;
  return diff;
}

function drawCuspDegreeLabel(ctx, cx, cy, lon, radii, ascLon) {
  const { outerR } = radii;
  const angle = lonToAngle(lon, ascLon);
  const labelR = outerR + 10;
  const pos = polarToXY(cx, cy, labelR, angle);

  const signDeg = lon % 30;
  const deg = Math.floor(signDeg);
  const min = Math.floor((signDeg - deg) * 60);

  ctx.save();
  ctx.translate(pos.x, pos.y);

  // Rotate text to follow radial direction
  let textAngle = -angle + Math.PI / 2;
  const norm = ((textAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (norm > Math.PI / 2 && norm < Math.PI * 3 / 2) {
    textAngle += Math.PI;
  }
  ctx.rotate(textAngle);

  ctx.font = 'bold 14px JetBrains Mono, monospace';
  ctx.fillStyle = '#222222';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${String(deg).padStart(2, '0')}°`, 0, -7);
  ctx.fillText(`${String(min).padStart(2, '0')}'`, 0, 7);
  ctx.restore();
}


// ============================================
// INNER CIRCLE
// ============================================

function drawInnerCircle(ctx, cx, cy, innerR) {
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.stroke();
}


// ============================================
// ASC/DSC + MC/IC ANGLES — big bold red
// ============================================

function drawAngles(ctx, cx, cy, houses, radii, ascLon) {
  if (!houses) return;
  const { outerR } = radii;

  // ASC/DSC — thick red
  const ascAngle = lonToAngle(houses.ascendant, ascLon);
  const dscAngle = lonToAngle(houses.descendant, ascLon);

  ctx.strokeStyle = '#DC143C';
  ctx.lineWidth = 4;
  const ascP = polarToXY(cx, cy, outerR + 20, ascAngle);
  const dscP = polarToXY(cx, cy, outerR + 20, dscAngle);
  ctx.beginPath();
  ctx.moveTo(ascP.x, ascP.y);
  ctx.lineTo(dscP.x, dscP.y);
  ctx.stroke();

  // MC/IC — red
  const mcAngle = lonToAngle(houses.mc, ascLon);
  const icAngle = lonToAngle(houses.ic, ascLon);

  ctx.lineWidth = 3;
  const mcP = polarToXY(cx, cy, outerR + 20, mcAngle);
  const icP = polarToXY(cx, cy, outerR + 20, icAngle);
  ctx.beginPath();
  ctx.moveTo(mcP.x, mcP.y);
  ctx.lineTo(icP.x, icP.y);
  ctx.stroke();

  // ASC label — HUGE bold red
  drawAngleLabel(ctx, cx, cy, outerR + 35, ascAngle, 'ASC');
  // MC label — HUGE bold red
  drawAngleLabel(ctx, cx, cy, outerR + 35, mcAngle, 'MC');

  // Degree labels at all 4 angle tips
  drawAngleDegreeLabel(ctx, cx, cy, outerR + 52, ascAngle, houses.ascendant);
  drawAngleDegreeLabel(ctx, cx, cy, outerR + 52, dscAngle, houses.descendant);
  drawAngleDegreeLabel(ctx, cx, cy, outerR + 52, mcAngle, houses.mc);
  drawAngleDegreeLabel(ctx, cx, cy, outerR + 52, icAngle, houses.ic);
}

function drawAngleLabel(ctx, cx, cy, r, angle, label) {
  const pos = polarToXY(cx, cy, r, angle);
  ctx.save();
  ctx.font = 'bold 22px Inter, sans-serif';
  ctx.fillStyle = '#DC143C';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, pos.x, pos.y);
  ctx.restore();
}

function drawAngleDegreeLabel(ctx, cx, cy, r, angle, longitude) {
  const pos = polarToXY(cx, cy, r, angle);
  const signDeg = longitude % 30;
  const deg = Math.floor(signDeg);
  const min = Math.floor((signDeg - deg) * 60);

  ctx.save();
  ctx.font = 'bold 14px JetBrains Mono, monospace';
  ctx.fillStyle = '#DC143C';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${String(deg).padStart(2, '0')}°`, pos.x, pos.y - 8);
  ctx.fillText(`${String(min).padStart(2, '0')}'`, pos.x, pos.y + 8);
  ctx.restore();
}


// ============================================
// PLANETS — big bold glyphs with clear degree labels
// ============================================

function drawPlanets(ctx, cx, cy, planets, radii, ascLon, partOfFortune) {
  if (!planets) return;
  const { innerZR, planetR } = radii;

  const allPlanets = [...planets];
  if (partOfFortune) {
    allPlanets.push({ ...partOfFortune, isRetrograde: false, id: -99 });
  }

  const withAngles = allPlanets.map(p => ({
    ...p,
    angle: lonToAngle(p.longitude, ascLon),
  })).sort((a, b) => a.longitude - b.longitude);

  // Collision avoidance — generous spacing for large glyphs
  const positioned = avoidCollisions(withAngles, cx, cy, planetR, 42);

  for (const planet of positioned) {
    const color = PLANET_COLORS[planet.name] || '#333333';
    const dispAngle = planet.displayAngle ?? planet.angle;
    const pos = polarToXY(cx, cy, planetR, dispAngle);

    // Shift line if moved
    if (planet.displayAngle != null && Math.abs(planet.displayAngle - planet.angle) > 0.01) {
      const actualPos = polarToXY(cx, cy, planetR, planet.angle);
      ctx.strokeStyle = '#AAAAAA';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(actualPos.x, actualPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(actualPos.x, actualPos.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Planet glyph — BIG BOLD like SolarFire
    ctx.save();
    ctx.font = 'bold 30px serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(planet.symbol, pos.x, pos.y);
    ctx.restore();

    // Degree/minute label — big, bold, clear
    const labelR = planetR + 28;
    const labelPos = polarToXY(cx, cy, labelR, dispAngle);
    const signDeg = planet.longitude % 30;
    const deg = Math.floor(signDeg);
    const min = Math.floor((signDeg - deg) * 60);
    const signSym = SIGNS[Math.floor(planet.longitude / 30)].symbol;

    ctx.save();
    ctx.font = 'bold 14px JetBrains Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Line 1: deg° + sign symbol
    ctx.fillText(`${String(deg).padStart(2, '0')}°`, labelPos.x, labelPos.y - 8);
    // Line 2: sign-glyph + minutes
    ctx.fillText(`${signSym}${String(min).padStart(2, '0')}'`, labelPos.x, labelPos.y + 8);
    ctx.restore();

    // Retrograde marker — bold red superscript
    if (planet.isRetrograde) {
      const retroPos = polarToXY(cx, cy, planetR - 18, dispAngle);
      ctx.save();
      ctx.font = 'bold 14px serif';
      ctx.fillStyle = '#DC143C';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Rx', retroPos.x, retroPos.y);
      ctx.restore();
    }

    // Tick line from zodiac ring to planet area
    const tickStart = polarToXY(cx, cy, innerZR - 2, planet.angle);
    const tickEnd = polarToXY(cx, cy, planetR + 36, planet.angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tickStart.x, tickStart.y);
    ctx.lineTo(tickEnd.x, tickEnd.y);
    ctx.stroke();
  }
}

function avoidCollisions(sortedPlanets, cx, cy, radius, minSpacing) {
  if (sortedPlanets.length === 0) return [];
  const result = sortedPlanets.map(p => ({ ...p, displayAngle: p.angle }));

  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const p1 = polarToXY(cx, cy, radius, result[i].displayAngle);
        const p2 = polarToXY(cx, cy, radius, result[j].displayAngle);
        const dist = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);

        if (dist < minSpacing) {
          const shift = (minSpacing - dist) / (2 * radius) * 0.6;
          result[i].displayAngle += shift;
          result[j].displayAngle -= shift;
        }
      }
    }
  }
  return result;
}


// ============================================
// ASPECTS
// ============================================

function drawAspects(ctx, cx, cy, planets, aspects, innerR, ascLon, partOfFortune) {
  if (!aspects || !planets) return;

  const lonMap = {};
  for (const p of planets) {
    lonMap[p.name] = p.longitude;
    if (p.symbol) lonMap[p.symbol] = p.longitude;
  }
  if (partOfFortune) lonMap[partOfFortune.name] = partOfFortune.longitude;

  const majorAngles = [0, 180, 120, 90, 60];

  for (const aspect of aspects) {
    const style = ASPECT_STYLES[aspect.angle];
    if (!style) continue;
    if (!majorAngles.includes(aspect.angle)) continue;

    const lon1 = lonMap[aspect.planet1.name] ?? lonMap[aspect.planet1.symbol];
    const lon2 = lonMap[aspect.planet2.name] ?? lonMap[aspect.planet2.symbol];
    if (lon1 === undefined || lon2 === undefined) continue;

    const r = innerR - 3;
    const p1 = polarToXY(cx, cy, r, lonToAngle(lon1, ascLon));
    const p2 = polarToXY(cx, cy, r, lonToAngle(lon2, ascLon));

    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    if (style.dash.length > 0) ctx.setLineDash(style.dash);
    if (aspect.orb < 1) ctx.lineWidth = style.width * 1.8;
    else if (aspect.orb > 5) ctx.globalAlpha = 0.4;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();

    // Aspect symbol at midpoint — larger
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const sym = ASPECT_SYMBOLS[aspect.angle];
    if (sym) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(midX, midY, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.font = 'bold 15px serif';
      ctx.fillStyle = style.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sym, midX, midY);
      ctx.restore();
    }
  }
}


// ============================================
// SEVEN YEAR OVERLAY
// ============================================

export function drawSevenYearOverlay(canvas, chartData, sevensData) {
  if (!canvas || !chartData || !sevensData) return;

  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const innerZR = size * 0.35;
  const innerR  = size * 0.19;
  const ascLon = chartData.houses?.ascendant ?? 0;

  for (const house of sevensData) {
    for (const year of house.years) {
      if (year.yearIndex === 0) continue;

      const lon = year.startLongitude;
      const angle = lonToAngle(lon, ascLon);

      const p1 = polarToXY(cx, cy, innerZR - 2, angle);
      const p2 = polarToXY(cx, cy, innerR + 2, angle);

      ctx.save();
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}


// ============================================
// BI-WHEEL (Transit)
// ============================================

export function drawBiWheel(canvas, natalData, transitData, options = {}) {
  if (!canvas || !natalData || !transitData) return;

  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const outerR    = size * 0.48;
  const zodiacR   = size * 0.455;
  const innerZR   = size * 0.35;
  const transitR  = size * 0.40;
  const natalR    = size * 0.25;
  const innerR    = size * 0.15;

  const radii = { outerR, zodiacR, innerZR, transitR, natalR, innerR };
  const ascLon = natalData.houses?.ascendant ?? 0;

  drawOuterTicks(ctx, cx, cy, { outerR, zodiacR, innerZR }, ascLon);
  drawZodiacRing(ctx, cx, cy, { zodiacR, innerZR }, ascLon);
  drawHouseCusps(ctx, cx, cy, natalData.houses, { innerZR, innerR }, ascLon);
  drawBiWheelTransitPlanets(ctx, cx, cy, transitData.planets, radii, ascLon);

  const dividerR = size * 0.32;
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, dividerR, 0, Math.PI * 2);
  ctx.stroke();

  drawInnerCircle(ctx, cx, cy, innerR);
  drawAngles(ctx, cx, cy, natalData.houses, { outerR, zodiacR, innerZR }, ascLon);

  if (transitData.transitNatalAspects) {
    drawBiWheelAspects(ctx, cx, cy, transitData.planets, natalData.planets, transitData.transitNatalAspects, innerR, ascLon);
  }

  drawBiWheelNatalPlanets(ctx, cx, cy, natalData.planets, radii, ascLon, natalData.partOfFortune);

  if (options.title) {
    drawInfoBlock(ctx, options);
  }
}

function drawBiWheelTransitPlanets(ctx, cx, cy, planets, radii, ascLon) {
  if (!planets) return;
  const { transitR, innerZR } = radii;

  const allPlanets = [...planets];
  const withAngles = allPlanets.map(p => ({
    ...p,
    angle: lonToAngle(p.longitude, ascLon),
  })).sort((a, b) => a.longitude - b.longitude);

  const positioned = avoidCollisions(withAngles, cx, cy, transitR, 26);

  for (const planet of positioned) {
    const color = PLANET_COLORS[planet.name] || '#333333';
    const dispAngle = planet.displayAngle ?? planet.angle;
    const pos = polarToXY(cx, cy, transitR, dispAngle);

    if (planet.displayAngle != null && Math.abs(planet.displayAngle - planet.angle) > 0.01) {
      const actualPos = polarToXY(cx, cy, transitR, planet.angle);
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(actualPos.x, actualPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(actualPos.x, actualPos.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.font = 'bold 22px serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(planet.symbol, pos.x, pos.y);
    ctx.restore();

    const labelR = transitR - 18;
    const labelPos = polarToXY(cx, cy, labelR, dispAngle);
    const signDeg = planet.longitude % 30;
    const deg = Math.floor(signDeg);
    const min = Math.floor((signDeg - deg) * 60);
    const signSym = SIGNS[Math.floor(planet.longitude / 30)].symbol;

    ctx.save();
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${deg}°${signSym}${String(min).padStart(2, '0')}'`, labelPos.x, labelPos.y);
    ctx.restore();

    if (planet.isRetrograde) {
      const retroPos = polarToXY(cx, cy, transitR + 14, dispAngle);
      ctx.save();
      ctx.font = 'bold 12px serif';
      ctx.fillStyle = '#DC143C';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Rx', retroPos.x, retroPos.y);
      ctx.restore();
    }

    const tickStart = polarToXY(cx, cy, innerZR - 2, planet.angle);
    const tickEnd = polarToXY(cx, cy, transitR + 10, planet.angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(tickStart.x, tickStart.y);
    ctx.lineTo(tickEnd.x, tickEnd.y);
    ctx.stroke();
  }
}

function drawBiWheelNatalPlanets(ctx, cx, cy, planets, radii, ascLon, partOfFortune) {
  if (!planets) return;
  const { natalR, innerR } = radii;

  const allPlanets = [...planets];
  if (partOfFortune) {
    allPlanets.push({ ...partOfFortune, isRetrograde: false, id: -99 });
  }

  const withAngles = allPlanets.map(p => ({
    ...p,
    angle: lonToAngle(p.longitude, ascLon),
  })).sort((a, b) => a.longitude - b.longitude);

  const positioned = avoidCollisions(withAngles, cx, cy, natalR, 24);

  for (const planet of positioned) {
    const color = PLANET_COLORS[planet.name] || '#333333';
    const dispAngle = planet.displayAngle ?? planet.angle;
    const pos = polarToXY(cx, cy, natalR, dispAngle);

    if (planet.displayAngle != null && Math.abs(planet.displayAngle - planet.angle) > 0.01) {
      const actualPos = polarToXY(cx, cy, natalR, planet.angle);
      ctx.strokeStyle = '#CCCCCC';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(actualPos.x, actualPos.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(actualPos.x, actualPos.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.font = 'bold 22px serif';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(planet.symbol, pos.x, pos.y);
    ctx.restore();

    const labelR = natalR + 18;
    const labelPos = polarToXY(cx, cy, labelR, dispAngle);
    const signDeg = planet.longitude % 30;
    const deg = Math.floor(signDeg);
    const min = Math.floor((signDeg - deg) * 60);
    const signSym = SIGNS[Math.floor(planet.longitude / 30)].symbol;

    ctx.save();
    ctx.font = 'bold 12px JetBrains Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${deg}°${signSym}${String(min).padStart(2, '0')}'`, labelPos.x, labelPos.y);
    ctx.restore();

    if (planet.isRetrograde) {
      const retroPos = polarToXY(cx, cy, natalR - 14, dispAngle);
      ctx.save();
      ctx.font = 'bold 12px serif';
      ctx.fillStyle = '#DC143C';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Rx', retroPos.x, retroPos.y);
      ctx.restore();
    }
  }
}

function drawBiWheelAspects(ctx, cx, cy, transitPlanets, natalPlanets, aspects, innerR, ascLon) {
  if (!aspects) return;

  const transitLonMap = {};
  for (const p of transitPlanets) {
    transitLonMap[p.name] = p.longitude;
  }

  const natalLonMap = {};
  for (const p of natalPlanets) {
    natalLonMap[p.name] = p.longitude;
  }

  const majorAngles = [0, 180, 120, 90, 60];

  for (const aspect of aspects) {
    const style = ASPECT_STYLES[aspect.angle];
    if (!style) continue;
    if (!majorAngles.includes(aspect.angle)) continue;

    const lon1 = transitLonMap[aspect.transitPlanet.name];
    const lon2 = natalLonMap[aspect.natalPlanet.name];
    if (lon1 === undefined || lon2 === undefined) continue;

    const r = innerR - 3;
    const p1 = polarToXY(cx, cy, r, lonToAngle(lon1, ascLon));
    const p2 = polarToXY(cx, cy, r, lonToAngle(lon2, ascLon));

    ctx.save();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width * 0.8;
    ctx.setLineDash([4, 3]);
    if (aspect.orb < 1) ctx.lineWidth = style.width;
    else if (aspect.orb > 5) ctx.globalAlpha = 0.3;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();
  }
}


// ============================================
// INFO BLOCK
// ============================================

function drawInfoBlock(ctx, options) {
  const x = 15;
  let y = 22;
  const lineH = 20;

  ctx.save();

  if (options.title) {
    ctx.font = 'bold 20px Inter, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(options.title, x, y);
    y += lineH + 2;
  }

  if (options.subtitle) {
    const lines = options.subtitle.split('\n');
    ctx.font = 'bold 15px Inter, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(lines[0], x, y);
    y += lineH;

    ctx.font = '14px Inter, sans-serif';
    for (let i = 1; i < lines.length; i++) {
      ctx.fillText(lines[i], x, y);
      y += lineH - 2;
    }
  }

  ctx.font = 'italic 14px Inter, sans-serif';
  ctx.fillStyle = '#DC143C';
  ctx.fillText('Geocentric', x, y); y += lineH - 3;
  ctx.fillText('Tropical', x, y);   y += lineH - 3;
  ctx.fillText('Placidus', x, y);   y += lineH - 3;
  ctx.fillText('Mean Node', x, y);

  ctx.restore();
}
