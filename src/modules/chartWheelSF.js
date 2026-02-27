/**
 * AstroFire - SolarFire Birebir Chart Wheel Renderer
 * SVG burç sembolleri, renkli arka plansız, shift çizgisiz
 */

import { SIGNS } from './constants.js';

// SVG imports (Vite ?raw)
import ariesSvg from '../../public/Symbols/aries-symbol-icon.svg?raw';
import taurusSvg from '../../public/Symbols/taurus-symbol-icon.svg?raw';
import geminiSvg from '../../public/Symbols/gemini-symbol-icon.svg?raw';
import cancerSvg from '../../public/Symbols/cancer-symbol-icon.svg?raw';
import leoSvg from '../../public/Symbols/leo-symbol-icon.svg?raw';
import virgoSvg from '../../public/Symbols/virgo-symbol-icon.svg?raw';
import libraSvg from '../../public/Symbols/libra-symbol-icon.svg?raw';
import scorpioSvg from '../../public/Symbols/scorpio-symbol-icon.svg?raw';
import sagittariusSvg from '../../public/Symbols/sagittarius-symbol-icon.svg?raw';
import capricornSvg from '../../public/Symbols/capricorn-symbol-icon.svg?raw';
import aquariusSvg from '../../public/Symbols/aquarius-symbol-icon.svg?raw';
import piscesSvg from '../../public/Symbols/pisces-symbol-icon.svg?raw';

const SIGN_SVGS = [
  ariesSvg, taurusSvg, geminiSvg, cancerSvg, leoSvg, virgoSvg,
  libraSvg, scorpioSvg, sagittariusSvg, capricornSvg, aquariusSvg, piscesSvg,
];

// ============================================
// ELEMENT COLORS (SVG semboller için — vivid)
// ============================================
const ELEMENT_SYMBOL_COLORS = {
  fire:  '#ff0000',
  earth: '#00ff00',
  air:   '#00ccc8',
  water: '#1b00ff',
};

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
// PLANET SYMBOL SCALE FACTORS (normalize visual size)
// Some Unicode glyphs are visually much smaller/larger than others
// ============================================
const PLANET_SYMBOL_SCALE = {
  '☉': 1.0,    // Sun — normal
  '☽': 1.1,    // Moon — slightly small
  '☿': 1.0,    // Mercury
  '♀': 1.0,    // Venus
  '♂': 1.0,    // Mars
  '♃': 0.85,   // Jupiter — visually large
  '♄': 0.85,   // Saturn — visually large
  '♅': 0.85,   // Uranus — visually large
  '♆': 0.85,   // Neptune — visually large
  '♇': 0.9,    // Pluto — large
  '☊': 1.0,    // North Node
  '⚸': 0.9,    // Lilith
  '⚷': 0.9,    // Chiron
  '⊕': 1.0,    // Part of Fortune
};

// ============================================
// ASPECT STYLES (ince çizgiler)
// ============================================
const ASPECT_STYLES = {
  0:   { color: '#0000CD', width: 1.8, dash: [] },
  180: { color: '#DC143C', width: 1.5, dash: [] },
  120: { color: '#0000CD', width: 1.2, dash: [] },
  90:  { color: '#DC143C', width: 1.2, dash: [] },
  60:  { color: '#0000CD', width: 0.8, dash: [] },
  45:  { color: '#FF69B4', width: 0.5, dash: [3, 3] },
  135: { color: '#FF69B4', width: 0.5, dash: [3, 3] },
  30:  { color: '#32CD32', width: 0.5, dash: [2, 2] },
  150: { color: '#32CD32', width: 0.5, dash: [2, 2] },
  72:  { color: '#9370DB', width: 0.5, dash: [4, 2] },
  144: { color: '#9370DB', width: 0.5, dash: [4, 2] },
};

const ASPECT_SYMBOLS = {
  0: '☌', 180: '☍', 120: '△', 90: '□', 60: '⚹',
  45: '∠', 135: '⚼', 30: '⚺', 150: '⚻', 72: 'Q', 144: 'bQ',
};


// ============================================
// SVG DRAWING HELPER
// ============================================

function drawSignSVG(ctx, svgString, x, y, targetSize, color) {
  const vbMatch = svgString.match(/viewBox="([^"]+)"/);
  if (!vbMatch) return;
  const parts = vbMatch[1].split(/\s+/).map(Number);
  const vbW = parts[2];
  const vbH = parts[3];

  const pathMatches = svgString.matchAll(/<path\s[^>]*d="([^"]+)"/g);
  const paths = [];
  for (const m of pathMatches) {
    paths.push(m[1]);
  }
  if (paths.length === 0) return;

  const scale = targetSize / Math.max(vbW, vbH);

  ctx.save();
  ctx.translate(x - (vbW * scale) / 2, y - (vbH * scale) / 2);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;

  for (const d of paths) {
    const path = new Path2D(d);
    ctx.fill(path);
  }

  ctx.restore();
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

function angleBetween(lon1, lon2) {
  let diff = lon2 - lon1;
  while (diff < 0) diff += 360;
  while (diff >= 360) diff -= 360;
  return diff;
}


// ============================================
// COLLISION AVOIDANCE
// ============================================

function avoidCollisions(sortedPlanets, cx, cy, radius, minSpacing) {
  if (sortedPlanets.length <= 1) return sortedPlanets.map(p => ({ ...p, displayAngle: p.angle }));

  const TWO_PI = Math.PI * 2;
  const minAngle = minSpacing / radius;
  const n = sortedPlanets.length;

  // Normalize angles to [0, 2π), sort by angle — order never changes
  const items = sortedPlanets.map(p => {
    let a = ((p.angle % TWO_PI) + TWO_PI) % TWO_PI;
    return { ...p, origAngle: a, displayAngle: a };
  });
  items.sort((a, b) => a.origAngle - b.origAngle);

  // Iterative relaxation — forward + backward passes for even distribution
  for (let pass = 0; pass < 150; pass++) {
    let moved = false;

    // Forward pass: pairs (0,1), (1,2), ... (n-2, n-1)
    for (let i = 0; i < n - 1; i++) {
      const gap = items[i + 1].displayAngle - items[i].displayAngle;
      if (gap < minAngle) {
        const push = (minAngle - gap) * 0.3;
        items[i].displayAngle -= push;
        items[i + 1].displayAngle += push;
        moved = true;
      }
    }

    // Backward pass: pairs (n-1,n-2), ... (1,0)
    for (let i = n - 1; i > 0; i--) {
      const gap = items[i].displayAngle - items[i - 1].displayAngle;
      if (gap < minAngle) {
        const push = (minAngle - gap) * 0.3;
        items[i - 1].displayAngle -= push;
        items[i].displayAngle += push;
        moved = true;
      }
    }

    // Wrap-around: last → first
    const wrapGap = (items[0].displayAngle + TWO_PI) - items[n - 1].displayAngle;
    if (wrapGap < minAngle && wrapGap > 0 && wrapGap < Math.PI) {
      const push = (minAngle - wrapGap) * 0.3;
      items[n - 1].displayAngle -= push;
      items[0].displayAngle += push;
      moved = true;
    }

    if (!moved) break;
  }

  return items;
}


// ============================================
// SIGN RING — Narrow band with SVG symbols + tick ruler inside
// ============================================

function drawSignRing(ctx, cx, cy, radii, ascLon) {
  const { outerR, signInR } = radii;
  const bandWidth = outerR - signInR;

  // Outer circle
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2.0;
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.stroke();

  // Inner circle of sign ring
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, signInR, 0, Math.PI * 2);
  ctx.stroke();

  // 12 radial separators
  for (let i = 0; i < 12; i++) {
    const deg = i * 30;
    const angle = lonToAngle(deg, ascLon);
    const p1 = polarToXY(cx, cy, outerR, angle);
    const p2 = polarToXY(cx, cy, signInR, angle);

    ctx.strokeStyle = '#666666';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // Degree tick ruler INSIDE sign ring (from signInR upward into band)
  for (let deg = 0; deg < 360; deg++) {
    const angle = lonToAngle(deg, ascLon);
    const isMajor = deg % 10 === 0;
    const is5 = deg % 5 === 0;

    if (isMajor) {
      ctx.strokeStyle = '#111111';
      ctx.lineWidth = 1.2;
    } else if (is5) {
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 1.0;
    } else {
      ctx.strokeStyle = '#666666';
      ctx.lineWidth = 1.0;
    }

    const tickLen = isMajor ? 12 : (is5 ? 7 : 3);
    const p1 = polarToXY(cx, cy, signInR, angle);
    const p2 = polarToXY(cx, cy, signInR + tickLen, angle);

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  // SVG symbols — centered in band. Exact center of outerR and signInR.
  const svgSize = bandWidth * 0.58;
  const symbolR = (outerR + signInR) / 2;
  for (let i = 0; i < 12; i++) {
    const sign = SIGNS[i];
    const midDeg = i * 30 + 15;
    const midAngle = lonToAngle(midDeg, ascLon);
    const pos = polarToXY(cx, cy, symbolR, midAngle);
    const color = ELEMENT_SYMBOL_COLORS[sign.element] || '#333333';

    drawSignSVG(ctx, SIGN_SVGS[i], pos.x, pos.y, svgSize, color);
  }
}


// ============================================
// HOUSE BAND — narrow band: house numbers + cusp degrees
// ============================================

function drawHouseBand(ctx, cx, cy, houses, radii, ascLon) {
  if (!houses || !houses.cusps) return;
  const { signInR, houseInR, innerR } = radii;

  // House band inner circle
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, houseInR, 0, Math.PI * 2);
  ctx.stroke();

  for (let i = 0; i < houses.cusps.length; i++) {
    const cusp = houses.cusps[i];
    const houseNum = cusp.house;
    const lon = cusp.longitude;
    const angle = lonToAngle(lon, ascLon);
    const isAngular = [1, 4, 7, 10].includes(houseNum);

    // Cusp line from signInR to innerR — angular cusps in RED
    ctx.strokeStyle = isAngular ? '#DC143C' : '#555555';
    ctx.lineWidth = isAngular ? 2.0 : 1.0;
    const p1 = polarToXY(cx, cy, signInR, angle);
    const p2 = polarToXY(cx, cy, innerR, angle);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    // House number — centered in house band
    const nextCusp = houses.cusps[(i + 1) % 12];
    let midLon = lon + angleBetween(lon, nextCusp.longitude) / 2;
    if (midLon >= 360) midLon -= 360;
    const midAngle = lonToAngle(midLon, ascLon);
    const numR = (signInR + houseInR) / 2;
    const numPos = polarToXY(cx, cy, numR, midAngle);

    ctx.save();
    ctx.font = 'bold 13px Inter, sans-serif';
    ctx.fillStyle = '#333333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(houseNum.toString(), numPos.x, numPos.y);
    ctx.restore();

    // Cusp degree label — at the cusp line, in the house band
    const labelR = (signInR + houseInR) / 2;
    const labelPos = polarToXY(cx, cy, labelR, angle);

    const signDeg = lon % 30;
    const deg = Math.floor(signDeg);
    const min = Math.floor((signDeg - deg) * 60);

    ctx.save();
    ctx.translate(labelPos.x, labelPos.y);

    let textAngle = -angle + Math.PI / 2;
    const norm = ((textAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (norm > Math.PI / 2 && norm < Math.PI * 3 / 2) {
      textAngle += Math.PI;
    }
    ctx.rotate(textAngle);

    ctx.font = 'bold 16px JetBrains Mono, monospace';
    ctx.fillStyle = '#111111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${String(deg).padStart(2, '0')}°${String(min).padStart(2, '0')}'`, 0, 0);
    ctx.restore();
  }
}


// ============================================
// INNER CIRCLE
// ============================================

function drawInnerCircle(ctx, cx, cy, innerR) {
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.stroke();
}


// ============================================
// ANGLES — ASC/DSC + MC/IC (thin, ring area only)
// ============================================

function drawAngles(ctx, cx, cy, houses, radii, ascLon) {
  if (!houses) return;
  const { outerR, innerR } = radii;

  const ascAngle = lonToAngle(houses.ascendant, ascLon);
  const dscAngle = lonToAngle(houses.descendant, ascLon);
  const mcAngle = lonToAngle(houses.mc, ascLon);
  const icAngle = lonToAngle(houses.ic, ascLon);

  // ASC/DSC line — outerR to innerR only
  ctx.strokeStyle = '#DC143C';
  ctx.lineWidth = 1.5;
  let p1 = polarToXY(cx, cy, outerR, ascAngle);
  let p2 = polarToXY(cx, cy, innerR, ascAngle);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  p1 = polarToXY(cx, cy, outerR, dscAngle);
  p2 = polarToXY(cx, cy, innerR, dscAngle);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // MC/IC line
  ctx.lineWidth = 1.2;
  p1 = polarToXY(cx, cy, outerR, mcAngle);
  p2 = polarToXY(cx, cy, innerR, mcAngle);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  p1 = polarToXY(cx, cy, outerR, icAngle);
  p2 = polarToXY(cx, cy, innerR, icAngle);
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();

  // Labels just outside the outer ring — only text, no degrees
  drawAngleLabel(ctx, cx, cy, outerR + 8, ascAngle, 'ASC');
  drawAngleLabel(ctx, cx, cy, outerR + 8, dscAngle, 'DSC');
  drawAngleLabel(ctx, cx, cy, outerR + 8, mcAngle, 'MC');
  drawAngleLabel(ctx, cx, cy, outerR + 8, icAngle, 'IC');
}

function drawAngleLabel(ctx, cx, cy, r, angle, label) {
  const pos = polarToXY(cx, cy, r, angle);
  ctx.save();
  ctx.font = 'bold 14px Inter, sans-serif';
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
  ctx.font = 'bold 12px JetBrains Mono, monospace';
  ctx.fillStyle = '#DC143C';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${String(deg).padStart(2, '0')}°`, pos.x, pos.y - 7);
  ctx.fillText(`${String(min).padStart(2, '0')}'`, pos.x, pos.y + 7);
  ctx.restore();
}


// ============================================
// PLANETS — glyph + degree side by side, planet ticks on inner circle
// Format: ☉ DD°♈MM'  (all on same radial line, close together)
// ============================================

function drawPlanets(ctx, cx, cy, planets, radii, ascLon, partOfFortune) {
  if (!planets) return;
  const { houseInR, innerR } = radii;

  // SolarFire RADIAL layout: items placed at different radii along same angle
  // From outer to inner: Symbol → DD° → sign icon → MM' → [Rx]
  // This naturally flows correctly in every direction around the wheel

  const symR  = houseInR - 40;   // planet symbol (outermost) — room for decan labels
  const degR  = symR - 28;       // degree number
  const signR = degR - 22;       // sign SVG icon
  const minR  = signR - 22;      // minutes
  const retroR = minR - 16;      // retrograde marker

  const collisionR = symR;       // collision check at symbol radius
  const minSpacing = 26;         // min pixel spacing — compact but readable

  const allPlanets = [...planets];
  if (partOfFortune) {
    allPlanets.push({ ...partOfFortune, isRetrograde: false, id: -99 });
  }

  const withAngles = allPlanets.map(p => ({
    ...p,
    angle: lonToAngle(p.longitude, ascLon),
  })).sort((a, b) => a.angle - b.angle);

  const positioned = avoidCollisions(withAngles, cx, cy, collisionR, minSpacing);

  for (const planet of positioned) {
    const color = PLANET_COLORS[planet.name] || '#333333';
    const dispAngle = planet.displayAngle ?? planet.angle;

    // Sign info
    const signIdx = Math.floor(planet.longitude / 30);
    const signElement = SIGNS[signIdx].element;
    const signColor = ELEMENT_SYMBOL_COLORS[signElement] || '#333333';
    const signDeg = planet.longitude % 30;
    const deg = Math.floor(signDeg);
    const min = Math.floor((signDeg - deg) * 60);

    // 1) Planet symbol — outermost (size-normalized)
    const symScale = PLANET_SYMBOL_SCALE[planet.symbol] || 1.0;
    const symSize = Math.round(36 * symScale);
    const symPos = polarToXY(cx, cy, symR, dispAngle);
    ctx.save();
    ctx.font = `bold ${symSize}px serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(planet.symbol, symPos.x, symPos.y);
    ctx.restore();

    // 2) DD° — degree
    const degPos = polarToXY(cx, cy, degR, dispAngle);
    ctx.save();
    ctx.font = 'bold 16px JetBrains Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${deg}°`, degPos.x, degPos.y);
    ctx.restore();

    // 3) Sign SVG icon
    const signPos = polarToXY(cx, cy, signR, dispAngle);
    drawSignSVG(ctx, SIGN_SVGS[signIdx], signPos.x, signPos.y, 17, signColor);

    // 4) MM' — minutes
    const minPos = polarToXY(cx, cy, minR, dispAngle);
    ctx.save();
    ctx.font = 'bold 16px JetBrains Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${String(min).padStart(2, '0')}'`, minPos.x, minPos.y);
    ctx.restore();

    // 5) Retrograde Rx — innermost (bigger)
    if (planet.isRetrograde) {
      const retroPos = polarToXY(cx, cy, retroR, dispAngle);
      ctx.save();
      ctx.font = 'bold 16px serif';
      ctx.fillStyle = '#DC143C';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Rx', retroPos.x, retroPos.y);
      ctx.restore();
    }

    // Tick on inner circle — planet's own color, 3x thicker
    const tickStart = polarToXY(cx, cy, innerR, planet.angle);
    const tickEnd = polarToXY(cx, cy, innerR + 10, planet.angle);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tickStart.x, tickStart.y);
    ctx.lineTo(tickEnd.x, tickEnd.y);
    ctx.stroke();
  }
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
    if (aspect.orb < 1) ctx.lineWidth = style.width * 1.5;
    else if (aspect.orb > 5) ctx.globalAlpha = 0.4;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
    ctx.restore();

    // Aspect symbol at midpoint
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const sym = ASPECT_SYMBOLS[aspect.angle];
    if (sym) {
      ctx.save();
      ctx.font = 'bold 19px serif';
      ctx.fillStyle = style.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sym, midX, midY);
      ctx.restore();
    }
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


// ============================================
// MAIN EXPORT — drawChartWheel
// ============================================

export function drawChartWheel(canvas, chartData, options = {}) {
  if (!canvas || !chartData) return;

  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // SolarFire layers (outer to inner):
  // 1. Sign ring (narrow) + tick ruler inside
  const outerR   = size * 0.47;
  const signInR  = size * 0.42;
  // 2. House band (very narrow — numbers + cusp degrees)
  const houseInR = size * 0.395;
  // 3. Planet zone (glyph + label side by side)
  // 4. Aspect circle (large)
  const innerR   = size * 0.25;

  const radii = { outerR, signInR, houseInR, innerR };
  const ascLon = chartData.houses?.ascendant ?? 0;

  // Draw layers back-to-front
  drawSignRing(ctx, cx, cy, radii, ascLon);
  drawHouseBand(ctx, cx, cy, chartData.houses, radii, ascLon);
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
// SEVEN YEAR OVERLAY
// ============================================

export function drawSevenYearOverlay(canvas, chartData, sevensData) {
  if (!canvas || !chartData || !sevensData) return;

  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const houseInR = size * 0.395;
  const innerR   = size * 0.25;
  const ascLon = chartData.houses?.ascendant ?? 0;

  for (const house of sevensData) {
    for (const year of house.years) {
      const startAngle = lonToAngle(year.startLongitude, ascLon);
      const endAngle = lonToAngle(year.endLongitude, ascLon);

      const element = year.decanSign?.element || 'fire';

      // Draw divider line between years (skip first year in each house)
      if (year.yearIndex > 0) {
        const p1 = polarToXY(cx, cy, houseInR - 2, startAngle);
        const p2 = polarToXY(cx, cy, innerR + 2, startAngle);
        ctx.save();
        ctx.strokeStyle = 'rgba(140,120,200,0.4)';
        ctx.lineWidth = 0.8;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      }

      // Age label at the center of the segment
      let midAngle;
      let diff = endAngle - startAngle;
      // Normalize diff to [-PI, PI]
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      midAngle = startAngle + diff / 2;
      const labelR = (houseInR + innerR) / 2;

      // Age number at outer edge, no background
      const AGE_COLORS = {
        fire:  '#ff0000',
        earth: '#00cc00',
        air:   '#00ccc8',
        water: '#1b00ff',
      };
      const agePos = polarToXY(cx, cy, houseInR - 12, midAngle);
      ctx.save();
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillStyle = AGE_COLORS[element] || '#666';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(year.age + 1), agePos.x, agePos.y);
      ctx.restore();
    }
  }

  // Draw aspects on top of the overlay
  if (chartData.aspects && chartData.planets) {
    drawAspects(ctx, cx, cy, chartData.planets, chartData.aspects, innerR, ascLon, chartData.partOfFortune);
  }
}


// ============================================
// DECAN OVERLAY
// ============================================

export function drawDecanOverlay(canvas, chartData, decanData) {
  if (!canvas || !chartData || !decanData) return;

  const ctx = canvas.getContext('2d');
  const size = Math.min(canvas.width, canvas.height);
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  const houseInR = size * 0.395;
  const innerR   = size * 0.25;
  const ascLon = chartData.houses?.ascendant ?? 0;

  const DECAN_COLORS = {
    fire:  '#ff0000',
    earth: '#00b800',
    air:   '#00c8c8',
    water: '#1b00ff',
  };

  for (const house of decanData) {
    for (const decan of house.decans) {
      const startAngle = lonToAngle(decan.startLongitude, ascLon);
      const endAngle = lonToAngle(decan.endLongitude, ascLon);

      // Decan boundary line (skip first — it's the house cusp)
      if (decan.index > 0) {
        const p1 = polarToXY(cx, cy, houseInR - 2, startAngle);
        const p2 = polarToXY(cx, cy, innerR + 2, startAngle);

        ctx.save();
        ctx.strokeStyle = 'rgba(140, 120, 200, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
        ctx.restore();
      }

      // Mid-angle of this decan
      let diff = endAngle - startAngle;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      const midAngle = startAngle + diff / 2;

      const element = decan.decanSign?.element || 'fire';
      const color = DECAN_COLORS[element] || '#666';

      // Decan sign icon — tucked right against house ring
      const signIdx = SIGNS.indexOf(decan.decanSign);
      if (signIdx >= 0) {
        const symPos = polarToXY(cx, cy, houseInR - 14, midAngle);
        drawSignSVG(ctx, SIGN_SVGS[signIdx], symPos.x, symPos.y, 15, color);
      }
    }
  }

  // Redraw aspects on top
  if (chartData.aspects && chartData.planets) {
    drawAspects(ctx, cx, cy, chartData.planets, chartData.aspects, innerR, ascLon, chartData.partOfFortune);
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

  const outerR    = size * 0.47;
  const signInR   = size * 0.42;
  const houseInR  = size * 0.395;
  const transitR  = size * 0.34;
  const dividerR  = size * 0.27;
  const natalR    = size * 0.21;
  const innerR    = size * 0.15;

  const radii = { outerR, signInR, houseInR, transitR, dividerR, natalR, innerR };
  const ascLon = natalData.houses?.ascendant ?? 0;

  drawSignRing(ctx, cx, cy, { outerR, signInR }, ascLon);
  drawHouseBand(ctx, cx, cy, natalData.houses, { signInR, houseInR, innerR }, ascLon);

  drawBiWheelTransitPlanets(ctx, cx, cy, transitData.planets, radii, ascLon);

  // Divider circle
  ctx.strokeStyle = '#999999';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, dividerR, 0, Math.PI * 2);
  ctx.stroke();

  drawInnerCircle(ctx, cx, cy, innerR);
  drawAngles(ctx, cx, cy, natalData.houses, { outerR, innerR }, ascLon);

  if (transitData.transitNatalAspects) {
    drawBiWheelAspects(ctx, cx, cy, transitData.planets, natalData.planets, transitData.transitNatalAspects, innerR, ascLon);
  }

  drawBiWheelNatalPlanets(ctx, cx, cy, natalData.planets, radii, ascLon, natalData.partOfFortune);

  if (options.title) {
    drawInfoBlock(ctx, options);
  }
}


// ============================================
// BI-WHEEL TRANSIT PLANETS
// ============================================

function drawBiWheelTransitPlanets(ctx, cx, cy, planets, radii, ascLon) {
  if (!planets) return;
  const { transitR, houseInR, dividerR } = radii;

  // Center the radial layout within the transit band (houseInR → dividerR)
  const bandMid = (houseInR + dividerR) / 2;
  const symR   = bandMid + 45;     // planet symbol (outermost)
  const degR   = symR - 48;        // degree number
  const signR  = degR - 36;        // sign SVG icon
  const minR   = signR - 34;       // minutes
  const retroR = symR + 28;        // retrograde marker (outside symbol)

  const withAngles = [...planets].map(p => ({
    ...p,
    angle: lonToAngle(p.longitude, ascLon),
  })).sort((a, b) => a.angle - b.angle);

  const positioned = avoidCollisions(withAngles, cx, cy, symR, 42);

  for (const planet of positioned) {
    const color = PLANET_COLORS[planet.name] || '#333333';
    const dispAngle = planet.displayAngle ?? planet.angle;

    const signIdx = Math.floor(planet.longitude / 30);
    const signElement = SIGNS[signIdx].element;
    const signColor = ELEMENT_SYMBOL_COLORS[signElement] || '#333333';
    const signDeg = planet.longitude % 30;
    const deg = Math.floor(signDeg);
    const min = Math.floor((signDeg - deg) * 60);

    // 1) Planet symbol
    const symScale = PLANET_SYMBOL_SCALE[planet.symbol] || 1.0;
    const symSize = Math.round(56 * symScale);
    const symPos = polarToXY(cx, cy, symR, dispAngle);
    ctx.save();
    ctx.font = `bold ${symSize}px serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(planet.symbol, symPos.x, symPos.y);
    ctx.restore();

    // 2) DD°
    const degPos = polarToXY(cx, cy, degR, dispAngle);
    ctx.save();
    ctx.font = 'bold 28px JetBrains Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${deg}°`, degPos.x, degPos.y);
    ctx.restore();

    // 3) Sign SVG icon
    const signPos = polarToXY(cx, cy, signR, dispAngle);
    drawSignSVG(ctx, SIGN_SVGS[signIdx], signPos.x, signPos.y, 28, signColor);

    // 4) MM'
    const minPos = polarToXY(cx, cy, minR, dispAngle);
    ctx.save();
    ctx.font = 'bold 26px JetBrains Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${String(min).padStart(2, '0')}'`, minPos.x, minPos.y);
    ctx.restore();

    // 5) Rx
    if (planet.isRetrograde) {
      const retroPos = polarToXY(cx, cy, retroR, dispAngle);
      ctx.save();
      ctx.font = 'bold 24px serif';
      ctx.fillStyle = '#DC143C';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Rx', retroPos.x, retroPos.y);
      ctx.restore();
    }
  }
}


// ============================================
// BI-WHEEL NATAL PLANETS
// ============================================

function drawBiWheelNatalPlanets(ctx, cx, cy, planets, radii, ascLon, partOfFortune) {
  if (!planets) return;
  const { natalR, dividerR, innerR } = radii;

  // Center the radial layout within the natal band (dividerR → innerR)
  const bandMid = (dividerR + innerR) / 2;
  const symR   = bandMid - 40;     // planet symbol (innermost)
  const degR   = symR + 44;        // degree number (towards divider)
  const signR  = degR + 32;        // sign SVG icon
  const minR   = signR + 32;       // minutes
  const retroR = symR - 28;        // retrograde (towards center)

  const allPlanets = [...planets];
  if (partOfFortune) {
    allPlanets.push({ ...partOfFortune, isRetrograde: false, id: -99 });
  }

  const withAngles = allPlanets.map(p => ({
    ...p,
    angle: lonToAngle(p.longitude, ascLon),
  })).sort((a, b) => a.angle - b.angle);

  const positioned = avoidCollisions(withAngles, cx, cy, minR, 42);

  for (const planet of positioned) {
    const color = PLANET_COLORS[planet.name] || '#333333';
    const dispAngle = planet.displayAngle ?? planet.angle;

    const signIdx = Math.floor(planet.longitude / 30);
    const signElement = SIGNS[signIdx].element;
    const signColor = ELEMENT_SYMBOL_COLORS[signElement] || '#333333';
    const signDeg = planet.longitude % 30;
    const deg = Math.floor(signDeg);
    const min = Math.floor((signDeg - deg) * 60);

    // 1) Planet symbol
    const symScale = PLANET_SYMBOL_SCALE[planet.symbol] || 1.0;
    const symSize = Math.round(52 * symScale);
    const symPos = polarToXY(cx, cy, symR, dispAngle);
    ctx.save();
    ctx.font = `bold ${symSize}px serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(planet.symbol, symPos.x, symPos.y);
    ctx.restore();

    // 2) DD°
    const degPos = polarToXY(cx, cy, degR, dispAngle);
    ctx.save();
    ctx.font = 'bold 26px JetBrains Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${deg}°`, degPos.x, degPos.y);
    ctx.restore();

    // 3) Sign SVG icon
    const signPos = polarToXY(cx, cy, signR, dispAngle);
    drawSignSVG(ctx, SIGN_SVGS[signIdx], signPos.x, signPos.y, 26, signColor);

    // 4) MM'
    const minPos = polarToXY(cx, cy, minR, dispAngle);
    ctx.save();
    ctx.font = 'bold 24px JetBrains Mono, monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${String(min).padStart(2, '0')}'`, minPos.x, minPos.y);
    ctx.restore();

    // 5) Rx
    if (planet.isRetrograde) {
      const retroPos = polarToXY(cx, cy, retroR, dispAngle);
      ctx.save();
      ctx.font = 'bold 22px serif';
      ctx.fillStyle = '#DC143C';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Rx', retroPos.x, retroPos.y);
      ctx.restore();
    }
  }
}


// ============================================
// BI-WHEEL ASPECTS
// ============================================

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
