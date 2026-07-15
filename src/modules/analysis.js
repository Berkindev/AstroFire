/**
 * AstroFire - Hibrit Analiz Motoru
 * Kural tabanlı analiz + Claude AI sentez katmanı
 */

import { SIGNS } from './constants.js';
import { SIGN_RULERS, HOUSE_DECAN_TOPICS, getDecanSign } from './decans.js';
import { normalizeDegree } from './ephemeris.js';
import { formatLongitude } from './formatting.js';

// ============================================
// KNOWLEDGE BASE (lazy loaded)
// ============================================
let _knowledge = null;

export async function loadKnowledge() {
  if (_knowledge) return _knowledge;
  const resp = await fetch('/data/astro-knowledge.json');
  _knowledge = await resp.json();
  return _knowledge;
}

// ============================================
// SIGN KEY HELPERS
// ============================================
const SIGN_KEYS = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
];

function signKey(signIndex) {
  return SIGN_KEYS[((signIndex % 12) + 12) % 12];
}

// Planet English name → key mapping
const PLANET_KEY_MAP = {
  'Güneş': 'sun', 'Ay': 'moon', 'Merkür': 'mercury', 'Venüs': 'venus',
  'Mars': 'mars', 'Jüpiter': 'jupiter', 'Satürn': 'saturn',
  'Uranüs': 'uranus', 'Neptün': 'neptune', 'Plüton': 'pluto',
  'KAD': 'north_node', 'Lilith': 'lilith', 'Chiron': 'chiron',
  'Sun': 'sun', 'Moon': 'moon', 'Mercury': 'mercury', 'Venus': 'venus',
  'Mars': 'mars', 'Jupiter': 'jupiter', 'Saturn': 'saturn',
  'Uranus': 'uranus', 'Neptune': 'neptune', 'Pluto': 'pluto',
  'North Node': 'north_node',
  'GAD': 'south_node',
  'South Node': 'south_node',
  'Şans Noktası': 'fortune',
  'Part of Fortune': 'fortune',
  'Fortune': 'fortune',
};

function planetKey(name) {
  return PLANET_KEY_MAP[name] || name.toLowerCase().replace(/\s+/g, '_');
}

// Türkçe aspekt isimleri
const ASPECT_NAMES_TR = {
  conjunction: 'Kavuşum', square: 'Kare', trine: 'Üçgen',
  opposition: 'Karşıt', sextile: 'Altıgen',
};

// Aspekt doğası Türkçe
const ASPECT_NATURE_TR = {
  neutral: 'Nötr', challenging: 'Zorlayıcı', harmonious: 'Uyumlu',
  polarizing: 'Kutuplaştırıcı', supportive: 'Destekleyici',
};

// Element Türkçe
const ELEMENT_TR = { fire: 'Ateş', earth: 'Toprak', air: 'Hava', water: 'Su' };
const MODALITY_TR = { cardinal: 'Öncü', fixed: 'Sabit', mutable: 'Değişken' };

// ============================================
// DIGNITY CALCULATION
// ============================================
function getPlanetDignity(planetName, signIndex, knowledge) {
  const pk = planetKey(planetName);
  const sk = signKey(signIndex);
  const pData = knowledge.planets?.[pk];
  if (!pData || !pData.dignity) return null;

  const d = pData.dignity;
  if (d.domicile === sk) return { type: 'domicile', label: 'Hâkim', strength: 5 };
  if (d.exaltation === sk) return { type: 'exaltation', label: 'Yücelmede', strength: 4 };
  if (d.detriment === sk) return { type: 'detriment', label: 'Sürgünde', strength: -3 };
  if (d.fall === sk) return { type: 'fall', label: 'Düşüşte', strength: -4 };
  return null;
}

// ============================================
// FACT EXTRACTION
// ============================================
export function extractChartFacts(chart, knowledge) {
  let planets = chart.planets || [];
  const houses = chart.houses || {};
  const cusps = houses.cusps || [];

  // Şans Noktası'nı gezegen listesine dahil et
  if (chart.partOfFortune) {
    const pof = chart.partOfFortune;
    planets = [...planets, {
      id: -99,
      name: pof.name || 'Şans Noktası',
      nameEn: pof.nameEn || 'Part of Fortune',
      symbol: pof.symbol || '⊕',
      longitude: pof.longitude,
      latitude: 0,
      speed: 0,
      isRetrograde: false,
      house: pof.house,
      signIndex: pof.signIndex,
      degreeInSign: pof.degreeInSign,
    }];
  }

  // Sun, Moon, ASC
  const sun = planets.find(p => p.name === 'Güneş' || p.nameEn === 'Sun');
  const moon = planets.find(p => p.name === 'Ay' || p.nameEn === 'Moon');
  const ascLon = houses.ascendant;
  const ascSignIndex = ascLon != null ? Math.floor(normalizeDegree(ascLon) / 30) : null;

  const sunSignIndex = sun ? Math.floor(normalizeDegree(sun.longitude) / 30) : null;
  const moonSignIndex = moon ? Math.floor(normalizeDegree(moon.longitude) / 30) : null;

  // MC (Midheaven)
  const mcLon = houses.mc;
  const mcSignIndex = mcLon != null ? Math.floor(normalizeDegree(mcLon) / 30) : null;

  // Decan info
  const sunDecan = sun ? getDecanSign(sun.longitude) : null;
  const moonDecan = moon ? getDecanSign(moon.longitude) : null;
  const ascDecan = ascLon != null ? getDecanSign(ascLon) : null;

  // Planet placements with dignity
  const planetPlacements = planets.map(p => {
    const si = Math.floor(normalizeDegree(p.longitude) / 30);
    const dignity = getPlanetDignity(p.name, si, knowledge);
    const decan = getDecanSign(p.longitude);
    return {
      name: p.name,
      nameEn: p.nameEn,
      symbol: p.symbol,
      sign: signKey(si),
      signIndex: si,
      signName: SIGNS[si]?.name,
      house: p.house,
      decan: {
        band: decan.band + 1,
        sign: decan.sign.name,
        signKey: signKey(decan.signIndex),
        ruler: decan.ruler.name,
      },
      isRetrograde: p.isRetrograde,
      dignity,
      longitude: p.longitude,
    };
  });

  // Element balance
  const elementBalance = { fire: 0, earth: 0, air: 0, water: 0 };
  const modalityBalance = { cardinal: 0, fixed: 0, mutable: 0 };
  const weights = { 'Güneş': 2, 'Ay': 2, 'default': 1 };

  planetPlacements.forEach(p => {
    const sign = SIGNS[p.signIndex];
    if (!sign) return;
    const w = weights[p.name] || weights.default;
    elementBalance[sign.element] = (elementBalance[sign.element] || 0) + w;
    modalityBalance[sign.modality] = (modalityBalance[sign.modality] || 0) + w;
  });

  // Add ASC and MC to balance
  if (ascSignIndex != null) {
    const ascSign = SIGNS[ascSignIndex];
    elementBalance[ascSign.element] = (elementBalance[ascSign.element] || 0) + 1;
    modalityBalance[ascSign.modality] = (modalityBalance[ascSign.modality] || 0) + 1;
  }
  if (mcSignIndex != null) {
    const mcSign = SIGNS[mcSignIndex];
    elementBalance[mcSign.element] = (elementBalance[mcSign.element] || 0) + 1;
    modalityBalance[mcSign.modality] = (modalityBalance[mcSign.modality] || 0) + 1;
  }

  // Stelliums (3+ planets in same sign or house)
  const stelliums = [];
  const bySign = {};
  const byHouse = {};
  planetPlacements.forEach(p => {
    const sk = p.sign;
    if (!bySign[sk]) bySign[sk] = [];
    bySign[sk].push(p);
    const hk = p.house;
    if (!byHouse[hk]) byHouse[hk] = [];
    byHouse[hk].push(p);
  });
  Object.entries(bySign).forEach(([sk, pls]) => {
    if (pls.length >= 3) stelliums.push({ type: 'sign', key: sk, name: pls[0].signName, planets: pls.map(p => p.name) });
  });
  Object.entries(byHouse).forEach(([hk, pls]) => {
    if (pls.length >= 3) stelliums.push({ type: 'house', key: hk, name: `${hk}. Ev`, planets: pls.map(p => p.name) });
  });

  // Retrograde planets
  const retrogrades = planetPlacements.filter(p => p.isRetrograde);

  // Aspects
  const aspects = (chart.aspects || []).map(a => ({
    planet1: a.planet1.name || a.planet1,
    planet2: a.planet2.name || a.planet2,
    type: aspectTypeKey(a.aspect || a.aspectSymbol),
    typeName: a.aspect,
    orb: a.orb,
    isApplying: a.isApplying,
  }));

  return {
    sunSign: sunSignIndex != null ? signKey(sunSignIndex) : null,
    sunSignName: sunSignIndex != null ? SIGNS[sunSignIndex].name : null,
    moonSign: moonSignIndex != null ? signKey(moonSignIndex) : null,
    moonSignName: moonSignIndex != null ? SIGNS[moonSignIndex].name : null,
    ascSign: ascSignIndex != null ? signKey(ascSignIndex) : null,
    ascSignName: ascSignIndex != null ? SIGNS[ascSignIndex].name : null,
    mcSign: mcSignIndex != null ? signKey(mcSignIndex) : null,
    mcSignName: mcSignIndex != null ? SIGNS[mcSignIndex].name : null,
    sunHouse: sun?.house,
    moonHouse: moon?.house,
    sunDecan, moonDecan, ascDecan,
    planetPlacements,
    retrogrades,
    aspects,
    elementBalance,
    modalityBalance,
    stelliums,
  };
}

function aspectTypeKey(name) {
  const map = {
    'Kavuşum': 'conjunction', 'Conjunction': 'conjunction',
    'Kare': 'square', 'Square': 'square',
    'Üçgen': 'trine', 'Trine': 'trine',
    'Karşıt': 'opposition', 'Opposition': 'opposition',
    'Altıgen': 'sextile', 'Sextile': 'sextile',
    'Yarı-Kare': 'semi_square', 'Semi-Square': 'semi_square',
    'Sesqui-Kare': 'sesquiquadrate', 'Sesquiquadrate': 'sesquiquadrate',
    'Yarı-Altıgen': 'semi_sextile', 'Semi-Sextile': 'semi_sextile',
    'Quincunx': 'quincunx',
    'Quintile': 'quintile',
    'Bi-Quintile': 'bi_quintile',
  };
  return map[name] || name?.toLowerCase().replace(/[\s-]/g, '_') || 'unknown';
}

// ============================================
// RULE-BASED ANALYSIS
// ============================================
export function generateAnalysis(facts, knowledge) {
  const sections = [];

  // ─── 1. GÜNEŞ BURCU ───
  if (facts.sunSign && knowledge.signs?.[facts.sunSign]) {
    const s = knowledge.signs[facts.sunSign];
    const pData = knowledge.planets?.sun;
    let content = '';

    if (pData?.signifies?.length) {
      content += `Güneş haritada şunları temsil eder: ${pData.signifies.join(', ')}.\n\n`;
    }

    content += s.summary || '';

    if (facts.sunHouse) {
      const houseData = knowledge.houses?.[String(facts.sunHouse)];
      if (houseData) {
        content += `\n\nGüneş ${facts.sunHouse}. evde konumlanmış.`;
        if (houseData.topics?.length) {
          content += ` Bu ev şu konuları yönetir: ${houseData.topics.join(', ')}.`;
        }
        content += ` Güneş'in bu evdeki varlığı, kişinin bu yaşam alanında dikkat çektiğini ve başarı potansiyeli taşıdığını gösterir.`;
      }
    }

    if (s.keywords?.length) content += `\n\nAnahtar kavramlar: ${s.keywords.join(', ')}`;
    if (s.positive?.length) content += `\nGüçlü yönler: ${s.positive.join(', ')}`;
    if (s.negative?.length) content += `\nGeliştirilmesi gereken yönler: ${s.negative.join(', ')}`;
    if (s.ruler) content += `\nYönetici gezegen: ${s.ruler}`;
    if (s.sign_annoyance) content += `\n\nKızma noktası: ${s.sign_annoyance}`;

    // planet_in_sign bilgisi
    const sunPisKey = `sun_${facts.sunSign}`;
    if (knowledge.planet_in_sign?.[sunPisKey]) {
      content += `\n\n${knowledge.planet_in_sign[sunPisKey]}`;
    }

    sections.push({ id: 'sun-sign', title: `☉ Güneş Burcu — ${facts.sunSignName}`, icon: '☉', content, priority: 1 });
  }

  // ─── 2. AY BURCU ───
  if (facts.moonSign && knowledge.signs?.[facts.moonSign]) {
    const s = knowledge.signs[facts.moonSign];
    const pData = knowledge.planets?.moon;
    let content = '';

    if (pData?.signifies?.length) {
      content += `Ay haritada şunları temsil eder: ${pData.signifies.join(', ')}.\n\n`;
    }

    content += `Ay ${facts.moonSignName} burcunda. ${s.summary || ''}`;

    if (facts.moonHouse) {
      const houseData = knowledge.houses?.[String(facts.moonHouse)];
      if (houseData) {
        content += `\n\nAy ${facts.moonHouse}. evde konumlanmış.`;
        if (houseData.topics?.length) {
          content += ` Bu ev şu konuları yönetir: ${houseData.topics.join(', ')}.`;
        }
        content += ` Ay'ın bu evdeki varlığı, kişinin duygusal ihtiyaçlarının bu yaşam alanıyla bağlantılı olduğunu gösterir.`;
      }
    }

    // planet_in_sign bilgisi
    const moonPisKey = `moon_${facts.moonSign}`;
    if (knowledge.planet_in_sign?.[moonPisKey]) {
      content += `\n\n${knowledge.planet_in_sign[moonPisKey]}`;
    }

    sections.push({ id: 'moon-sign', title: `☽ Ay Burcu — ${facts.moonSignName}`, icon: '☽', content, priority: 2 });
  }

  // ─── 3. YÜKSELEN VE TİPOLOJİ ───
  if (facts.ascSign) {
    const s = knowledge.signs?.[facts.ascSign];
    const t = knowledge.typology?.[facts.ascSign];
    let content = `Yükselen burç, dış dünyaya yansıttığınız ilk izlenimi ve fiziksel görünümünüzü belirler.\n\n`;
    content += `Yükselen ${facts.ascSignName}.`;
    if (s) content += ` ${s.summary || ''}`;

    if (t) {
      content += '\n\n── Fiziksel Özellikler ──';
      if (t.face) content += `\nYüz hatları: ${t.face}`;
      if (t.eyes) {
        if (typeof t.eyes === 'object') {
          if (t.eyes.color) content += `\nGöz rengi: ${t.eyes.color}`;
          if (t.eyes.shape) content += `\nGöz yapısı: ${t.eyes.shape}`;
        } else {
          content += `\nGözler: ${t.eyes}`;
        }
      }
      if (t.height) {
        if (typeof t.height === 'object') {
          content += `\nBoy: Kadın ~${t.height.female || '?'}, Erkek ~${t.height.male || '?'}`;
        } else {
          content += `\nBoy: ${t.height}`;
        }
      }
      if (t.build) content += `\nVücut yapısı: ${t.build}`;
      if (t.hair) content += `\nSaç: ${t.hair}`;
      if (t.walk) content += `\nYürüyüş: ${t.walk}`;
      if (t.marks) content += `\nAyırt edici işaretler: ${t.marks}`;
      if (t.overall) content += `\nGenel görünüm: ${t.overall}`;
    }

    sections.push({ id: 'ascendant', title: `↑ Yükselen — ${facts.ascSignName}`, icon: '↑', content, priority: 3 });
  }

  // ─── 4. GEZEGEN YERLEŞİMLERİ ───
  const importantPlanets = facts.planetPlacements.filter(p =>
    ['sun', 'moon', 'mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'north_node', 'south_node', 'fortune'].includes(planetKey(p.name))
  );
  if (importantPlanets.length > 0) {
    let content = '';
    importantPlanets.forEach(p => {
      const pk = planetKey(p.name);
      const planetData = knowledge.planets?.[pk];
      const houseData = knowledge.houses?.[String(p.house)];

      content += `\n@@PLANET_HEADER@@${p.symbol} ${p.name} — ${p.signName}, ${p.house}. Ev`;
      if (p.isRetrograde) content += ' ℞';

      // KAD/GAD özel açıklaması
      if (pk === 'north_node') {
        content += '\n  KAD, bu hayatta geliştirmeniz gereken yönü ve ruhsal amacınızı gösterir.';
      } else if (pk === 'south_node') {
        content += '\n  GAD, geçmiş hayatlardan getirdiğiniz alışkanlıkları ve aşmanız gereken kalıpları gösterir.';
      } else if (pk === 'fortune') {
        content += '\n  Şans Noktası (ASC + Ay - Güneş), hayatınızda şansın ve doğal bolluğun aktığı alanı gösterir.';
      }

      // Gezegenin ne temsil ettiği
      if (planetData?.signifies?.length) {
        content += `\n  Temsil ettiği: ${planetData.signifies.join(', ')}`;
      }

      // Dekan bilgisi
      content += `\n  Dekan ${p.decan.band}: ${p.decan.sign} dekanlığında (Yönetici: ${p.decan.ruler})`;
      const topic = HOUSE_DECAN_TOPICS[p.house]?.[p.decan.band - 1];
      if (topic) content += `\n  Dekan konusu: ${topic}`;

      // Ev konuları
      if (houseData?.topics?.length) {
        content += `\n  Ev konuları: ${houseData.topics.join(', ')}`;
      }

      // planet_in_sign bilgisi
      const pisKey = `${pk}_${p.sign}`;
      if (knowledge.planet_in_sign?.[pisKey]) {
        content += `\n  ${knowledge.planet_in_sign[pisKey]}`;
      }

      // planet_in_house bilgisi
      const pihGroup = knowledge.planet_in_house?.[`${pk}_in_houses`];
      if (pihGroup?.[String(p.house)]) {
        content += `\n  ${pihGroup[String(p.house)]}`;
      }

      content += '\n';
    });
    sections.push({ id: 'planet-placements', title: '🪐 Gezegen Yerleşimleri', icon: '🪐', content: content.trim(), priority: 4 });
  }

  // ─── 5. ÖNEMLİ AÇILAR ───
  const majorAspects = facts.aspects.filter(a =>
    ['conjunction', 'square', 'trine', 'opposition', 'sextile'].includes(a.type)
  );
  if (majorAspects.length > 0) {
    let content = '';
    majorAspects.forEach(a => {
      const k1 = planetKey(a.planet1);
      const k2 = planetKey(a.planet2);
      const pairKey1 = [k1, k2].sort().join('_');
      const pairKey2 = `${k1}_${k2}`;
      const pairKey3 = `${k2}_${k1}`;
      const aspectData = knowledge.planet_aspects?.[pairKey1] || knowledge.planet_aspects?.[pairKey2] || knowledge.planet_aspects?.[pairKey3];
      const interp = aspectData?.[a.type] || '';
      const aspectDef = knowledge.aspects?.[a.type];
      const natureTr = aspectDef?.nature ? (ASPECT_NATURE_TR[aspectDef.nature] || '') : '';

      content += `\n${a.planet1} ${a.typeName} ${a.planet2} (${a.orb.toFixed(1)}°)`;
      if (natureTr) content += ` — ${natureTr}`;
      if (a.isApplying) content += ' [Yaklaşan]';
      if (interp) content += `\n  → ${interp}`;
      else if (aspectDef?.description) content += `\n  → ${aspectDef.description}`;
      content += '\n';
    });
    sections.push({ id: 'aspects', title: '🔗 Önemli Açılar', icon: '🔗', content: content.trim(), priority: 5 });
  }

  // ─── 6. ELEMENT VE NİTELİK DENGESİ ───
  {
    const el = facts.elementBalance;
    const mod = facts.modalityBalance;
    const dominant = Object.entries(el).sort((a, b) => b[1] - a[1]);
    const weakest = dominant[dominant.length - 1];
    const domMod = Object.entries(mod).sort((a, b) => b[1] - a[1]);

    let content = '── Element Dağılımı ──\n';
    const totalEl = Object.values(el).reduce((a, b) => a + b, 0);
    dominant.forEach(([k, v]) => {
      const bar = '█'.repeat(v) + '░'.repeat(Math.max(0, totalEl - v));
      content += `  ${ELEMENT_TR[k]}: ${v}  ${bar}\n`;
    });
    content += `\nBaskın element: ${ELEMENT_TR[dominant[0][0]]}`;
    if (weakest[1] === 0) {
      content += `\nEksik element: ${ELEMENT_TR[weakest[0]]} — Bu elementin yokluğu kişide o alanla ilgili dengesizliğe işaret edebilir.`;
    }

    // Element yorum — JSON'dan veya fallback
    const domEl = dominant[0][0];
    const elKey = `${domEl}_dominant`;
    const elLackKey = `${weakest[0]}_lacking`;
    if (knowledge.element_balance?.[elKey]) {
      content += `\n${ELEMENT_TR[domEl]} baskınlığı: ${knowledge.element_balance[elKey]}`;
    }
    if (weakest[1] <= 1 && knowledge.element_balance?.[elLackKey]) {
      content += `\n\n${ELEMENT_TR[weakest[0]]} eksikliği: ${knowledge.element_balance[elLackKey]}`;
    }

    content += '\n\n── Nitelik Dağılımı ──\n';
    const totalMod = Object.values(mod).reduce((a, b) => a + b, 0);
    domMod.forEach(([k, v]) => {
      const bar = '█'.repeat(v) + '░'.repeat(Math.max(0, totalMod - v));
      content += `  ${MODALITY_TR[k]}: ${v}  ${bar}\n`;
    });
    content += `\nBaskın nitelik: ${MODALITY_TR[domMod[0][0]]}`;

    const domModKey = domMod[0][0];
    const weakMod = domMod[domMod.length - 1];
    const modDomKey = `${domModKey}_dominant`;
    const modLackKey = `${weakMod[0]}_lacking`;
    if (knowledge.modality_balance?.[modDomKey]) {
      content += `\n${MODALITY_TR[domModKey]} baskınlığı: ${knowledge.modality_balance[modDomKey]}`;
    }
    if (weakMod[1] <= 1 && knowledge.modality_balance?.[modLackKey]) {
      content += `\n\n${MODALITY_TR[weakMod[0]]} eksikliği: ${knowledge.modality_balance[modLackKey]}`;
    }

    sections.push({ id: 'element-balance', title: '⚖️ Element ve Nitelik Dengesi', icon: '⚖️', content, priority: 6 });
  }

  // ─── 7. STELLIUMLAR ───
  if (facts.stelliums.length > 0) {
    let content = 'Stellium, 3 veya daha fazla gezegenin aynı burçta ya da evde toplanmasıdır. Bu yoğunlaşma, o alanın hayatınızda çok belirgin olduğunu gösterir.\n';
    facts.stelliums.forEach(st => {
      const houseData = st.type === 'house' ? knowledge.houses?.[st.key] : null;
      content += `\n${st.name} Stelliumu: ${st.planets.join(', ')}`;
      content += `\n  ${st.planets.length} gezegen aynı ${st.type === 'sign' ? 'burçta' : 'evde'} toplanmış — bu alan hayatınızda çok yoğun bir şekilde öne çıkıyor.`;
      if (houseData?.topics?.length) {
        content += `\n  Odak konular: ${houseData.topics.join(', ')}`;
      }
      content += '\n';
    });
    sections.push({ id: 'stelliums', title: '✨ Stelliumlar', icon: '✨', content: content.trim(), priority: 7 });
  }

  // ─── 8. KARİYER VE MC (MIDHEAVEN) ───
  {
    let content = '';
    let hasContent = false;

    // MC burcu
    if (facts.mcSign && facts.mcSignName) {
      const mcSignData = knowledge.signs?.[facts.mcSign];
      content += `MC (Gökyüzü Ortası) ${facts.mcSignName} burcunda. MC, toplum önündeki itibarınızı, kariyer yöneliminizi ve hayattaki büyük hedefinizi gösterir.`;
      if (mcSignData?.careers?.length) {
        content += `\n\n${facts.mcSignName} MC'sine göre uygun kariyer alanları: ${mcSignData.careers.join(', ')}`;
      }
      hasContent = true;
    }

    // Güneş burcu kariyerleri
    if (facts.sunSign && knowledge.signs?.[facts.sunSign]?.careers) {
      const careers = knowledge.signs[facts.sunSign].careers;
      if (hasContent) content += '\n\n';
      content += `${facts.sunSignName} Güneş burcuna göre kariyer eğilimleri: ${careers.join(', ')}`;
      hasContent = true;
    }

    // 10. evdeki gezegenler
    const in10th = facts.planetPlacements.filter(p => p.house === 10);
    if (in10th.length > 0) {
      if (hasContent) content += '\n\n';
      content += `10. Evdeki gezegenler: ${in10th.map(p => p.name).join(', ')}`;
      content += '\n10. evde gezegen bulunması, kariyer ve toplumsal statünün hayatınızda özellikle önemli olduğuna işaret eder.';
      hasContent = true;
    }

    // Kariyer Detayları (birleştirildi)
    const careerByHouse = knowledge.career_by_house;
    const careerByPlanet = knowledge.career_by_planet;

    if (careerByHouse) {
      if (facts.sunHouse && careerByHouse[String(facts.sunHouse)]) {
        if (hasContent) content += '\n\n';
        content += `Güneş ${facts.sunHouse}. evde → Kariyer eğilimi: ${careerByHouse[String(facts.sunHouse)]}`;
        hasContent = true;
      }

      const venus = facts.planetPlacements.find(p => planetKey(p.name) === 'venus');
      if (venus && careerByHouse[String(venus.house)]) {
        if (hasContent) content += '\n';
        content += `Venüs ${venus.house}. evde → Kazanç alanı: ${careerByHouse[String(venus.house)]}`;
        hasContent = true;
      }

      const mars = facts.planetPlacements.find(p => planetKey(p.name) === 'mars');
      if (mars && careerByPlanet?.mars) {
        if (hasContent) content += '\n';
        content += `Mars kariyer eğilimleri: ${careerByPlanet.mars}`;
        hasContent = true;
      }
    }

    if (hasContent) {
      sections.push({ id: 'career', title: '💼 Kariyer ve MC', icon: '💼', content, priority: 8 });
    }
  }

  // ─── 9. SAĞLIK ───
  {
    let content = '';
    let hasContent = false;

    // ASC burcu sağlık
    if (facts.ascSign && knowledge.signs?.[facts.ascSign]?.health) {
      const h = knowledge.signs[facts.ascSign].health;
      content += `Yükselen ${facts.ascSignName} sağlık eğilimleri:`;
      if (h.body?.length) content += `\nHassas vücut bölgeleri: ${h.body.join(', ')}`;
      if (h.risks?.length) content += `\nDikkat edilmesi gereken: ${h.risks.join(', ')}`;
      hasContent = true;
    }

    // Güneş burcu sağlık
    if (facts.sunSign && knowledge.signs?.[facts.sunSign]?.health && facts.sunSign !== facts.ascSign) {
      const h = knowledge.signs[facts.sunSign].health;
      if (hasContent) content += '\n\n';
      content += `${facts.sunSignName} Güneş burcu sağlık eğilimleri:`;
      if (h.body?.length) content += `\nHassas vücut bölgeleri: ${h.body.join(', ')}`;
      if (h.risks?.length) content += `\nDikkat edilmesi gereken: ${h.risks.join(', ')}`;
      hasContent = true;
    }

    // 6. evdeki gezegenler
    const in6th = facts.planetPlacements.filter(p => p.house === 6);
    if (in6th.length > 0) {
      if (hasContent) content += '\n\n';
      content += `6. Evdeki gezegenler (sağlık ve günlük rutin): ${in6th.map(p => p.name).join(', ')}`;
      hasContent = true;
    }

    // Tıbbi Astroloji kuralları (birleştirildi)
    const medRules = knowledge.medical_rules;
    if (medRules && Array.isArray(medRules)) {
      const triggered = [];

      medRules.forEach(rule => {
        const c = rule.condition;

        if (c === 'mars_in_house_2_6_10') {
          const mars = facts.planetPlacements.find(p => planetKey(p.name) === 'mars');
          if (mars && [2, 6, 10].includes(mars.house)) triggered.push(rule.description);
        }
        if (c === 'mars_virgo_sun_conjunction') {
          const mars = facts.planetPlacements.find(p => planetKey(p.name) === 'mars');
          if (mars && mars.sign === 'virgo') {
            const hasSunConj = facts.aspects.some(a =>
              a.type === 'conjunction' &&
              ((planetKey(a.planet1) === 'mars' && planetKey(a.planet2) === 'sun') ||
               (planetKey(a.planet1) === 'sun' && planetKey(a.planet2) === 'mars'))
            );
            if (hasSunConj) triggered.push(rule.description);
          }
        }
        if (c === 'mars_aries_sun_conjunction') {
          const mars = facts.planetPlacements.find(p => planetKey(p.name) === 'mars');
          if (mars && mars.sign === 'aries') {
            const hasSunConj = facts.aspects.some(a =>
              a.type === 'conjunction' &&
              ((planetKey(a.planet1) === 'mars' && planetKey(a.planet2) === 'sun') ||
               (planetKey(a.planet1) === 'sun' && planetKey(a.planet2) === 'mars'))
            );
            if (hasSunConj) triggered.push(rule.description);
          }
        }
        if (c === 'mars_neptune_conjunction_6th') {
          const mars = facts.planetPlacements.find(p => planetKey(p.name) === 'mars');
          const neptune = facts.planetPlacements.find(p => planetKey(p.name) === 'neptune');
          if (mars && neptune && (mars.house === 6 || neptune.house === 6)) {
            const hasConj = facts.aspects.some(a =>
              a.type === 'conjunction' &&
              ((planetKey(a.planet1) === 'mars' && planetKey(a.planet2) === 'neptune') ||
               (planetKey(a.planet1) === 'neptune' && planetKey(a.planet2) === 'mars'))
            );
            if (hasConj) triggered.push(rule.description);
          }
        }
        if (c === 'jupiter_1st_house') {
          const jupiter = facts.planetPlacements.find(p => planetKey(p.name) === 'jupiter');
          if (jupiter && jupiter.house === 1) triggered.push(rule.description);
        }
        if (c === 'jupiter_2nd_house') {
          const jupiter = facts.planetPlacements.find(p => planetKey(p.name) === 'jupiter');
          if (jupiter && jupiter.house === 2) triggered.push(rule.description);
        }
        if (c.startsWith('neptune_6th_')) {
          const neptune = facts.planetPlacements.find(p => planetKey(p.name) === 'neptune');
          if (neptune && neptune.house === 6) {
            const nSign = SIGNS[neptune.signIndex];
            if (nSign) {
              if (c === 'neptune_6th_water' && nSign.element === 'water') triggered.push(rule.description);
              if (c === 'neptune_6th_earth' && nSign.element === 'earth') triggered.push(rule.description);
              if (c === 'neptune_6th_fire' && nSign.element === 'fire') triggered.push(rule.description);
              if (c === 'neptune_6th_air' && nSign.element === 'air') triggered.push(rule.description);
            }
          }
        }
        if (c === 'neptune_4th') {
          const neptune = facts.planetPlacements.find(p => planetKey(p.name) === 'neptune');
          if (neptune && neptune.house === 4) triggered.push(rule.description);
        }
        if (c === 'taurus_rising' && facts.ascSign === 'taurus') triggered.push(rule.description);
        if (c === 'sagittarius_rising' && facts.ascSign === 'sagittarius') triggered.push(rule.description);
        if (c === 'pisces_rising' && facts.ascSign === 'pisces') triggered.push(rule.description);
      });

      if (triggered.length > 0) {
        if (hasContent) content += '\n\n';
        content += '── Tetiklenen Sağlık Kuralları ──\n';
        triggered.forEach(t => { content += `• ${t}\n`; });
        hasContent = true;
      }
    }

    // Hassas vücut bölgeleri
    const bodyParts = knowledge.body_parts_by_house;
    if (bodyParts) {
      const mars = facts.planetPlacements.find(p => planetKey(p.name) === 'mars');
      const jupiter = facts.planetPlacements.find(p => planetKey(p.name) === 'jupiter');
      if (mars && bodyParts[String(mars.house)] || jupiter && bodyParts[String(jupiter?.house)]) {
        if (hasContent) content += '\n\n';
        content += '── Hassas Vücut Bölgeleri ──\n';
        if (mars && bodyParts[String(mars.house)]) {
          content += `Mars ${mars.house}. evde → ${bodyParts[String(mars.house)]}: Bu bölgede yara izi, iz, yaralanma riski.\n`;
        }
        if (jupiter && bodyParts[String(jupiter.house)]) {
          content += `Jüpiter ${jupiter.house}. evde → ${bodyParts[String(jupiter.house)]}: Bu vücut bölgesinde büyüme/genişleme eğilimi.\n`;
        }
        hasContent = true;
      }
    }

    if (hasContent) {
      sections.push({ id: 'health', title: '🏥 Sağlık Eğilimleri', icon: '🏥', content, priority: 9 });
    }
  }

  // ─── 10. ÖFKE TEPKİLERİ ───
  {
    let content = '';
    let hasContent = false;

    // Mars burcu öfke
    const mars = facts.planetPlacements.find(p => planetKey(p.name) === 'mars');
    if (mars && knowledge.signs?.[mars.sign]?.anger_trigger) {
      content += `Mars ${mars.signName} burcunda — öfke ve savunma mekanizmanız bu burçtan etkilenir.`;
      content += `\nÖfke tetikleyicisi: ${knowledge.signs[mars.sign].anger_trigger}`;
      hasContent = true;
    }

    // Güneş burcu öfke
    if (facts.sunSign && knowledge.signs?.[facts.sunSign]?.anger_trigger) {
      if (hasContent) content += '\n\n';
      content += `${facts.sunSignName} Güneş burcunun öfke tetikleyicisi: ${knowledge.signs[facts.sunSign].anger_trigger}`;
      hasContent = true;
    }

    if (hasContent) {
      sections.push({ id: 'anger', title: '🔥 Öfke ve Tepki Kalıpları', icon: '🔥', content, priority: 10 });
    }
  }

  // ─── 11. RETROGRAD GEZEGENLER ───
  if (facts.retrogrades.length > 0) {
    const retrogradeMeanings = {
      mercury: 'İletişim, düşünce ve öğrenme süreçlerinde içe dönük bir yapı. Fikirlerini dışa vurmakta zorluk çekebilir ama derinlemesine düşünme yeteneği güçlüdür.',
      venus: 'Aşk ve ilişkilerde alışılmadık bir yaklaşım. Sevgi gösterme biçimi farklıdır, eski ilişkilere dönme eğilimi olabilir.',
      mars: 'Enerji ve irade içe yöneliktir. Dışa dönük mücadeleden çok, iç dünyasında savaşır. Öfkesini bastırma eğilimi.',
      jupiter: 'Şans ve genişleme içsel dünyada yaşanır. Manevi büyüme maddi büyümeden önce gelir.',
      saturn: 'Disiplin ve sorumluluk konusunda kendi kurallarını oluşturur. Otoriteyle sıra dışı ilişki.',
      uranus: 'İsyan ve özgürlük arayışı içseldir. Dışarıya uyumlu görünüp içten devrimci olabilir.',
      neptune: 'Sezgi ve hayal gücü yoğun. Gerçeklik algısı farklı olabilir. Spiritüel derinlik.',
      pluto: 'Dönüşüm gücü içe dönük. Güç dinamiklerini derinden anlar. Kontrol ihtiyacı bilinçaltında.',
    };

    let content = 'Retrograd gezegenler, enerjilerini dışa değil içe yönlendirir. Bu bir zayıflık değil, farklı bir kullanım biçimidir.\n';
    facts.retrogrades.forEach(p => {
      const pk = planetKey(p.name);
      content += `\n℞ ${p.name} Retrograd — ${p.signName}, ${p.house}. Ev`;
      if (retrogradeMeanings[pk]) content += `\n  ${retrogradeMeanings[pk]}`;
      content += '\n';
    });

    sections.push({ id: 'retrogrades', title: '℞ Retrograd Gezegenler', icon: '℞', content: content.trim(), priority: 11 });
  }

  // ─── 12. KİŞİSEL GELİŞİM VE DERİNLİK ───
  {
    let content = '';
    let hasContent = false;

    const sunData = facts.sunSign ? knowledge.signs?.[facts.sunSign] : null;
    if (sunData) {
      if (sunData.life_goal) {
        content += `Yaşam amacı: ${sunData.life_goal}`;
        hasContent = true;
      }
      if (sunData.core_drive) {
        if (hasContent) content += '\n';
        content += `Temel dürtü: ${sunData.core_drive}`;
        hasContent = true;
      }
      if (sunData.shadow_side) {
        if (hasContent) content += '\n';
        content += `Gölge yön: ${sunData.shadow_side}`;
        hasContent = true;
      }
      if (sunData.key_questions) {
        if (hasContent) content += '\n\n';
        content += `── Kendine Sorman Gereken Sorular ──\n${sunData.key_questions}`;
        hasContent = true;
      }
      if (sunData.recommendations) {
        if (hasContent) content += '\n\n';
        content += `── Öneriler ──\n${sunData.recommendations}`;
        hasContent = true;
      }
      if (sunData.love_mystery) {
        if (hasContent) content += '\n\n';
        content += `── Linda Goodman'ın Aşk Gizemi ──\n${sunData.love_mystery}`;
        hasContent = true;
      }
    }

    if (hasContent) {
      sections.push({ id: 'personal-growth', title: '🌱 Kişisel Gelişim ve Derinlik', icon: '🌱', content, priority: 12 });
    }
  }

  // ─── 13. LINDA GOODMAN KİŞİLİK ANALİZİ ───
  {
    let content = '';
    let hasContent = false;

    const sunData = facts.sunSign ? knowledge.signs?.[facts.sunSign] : null;
    if (sunData?.personality_lg) {
      content += `── ${facts.sunSignName} Kişilik Profili (Linda Goodman) ──\n${sunData.personality_lg}`;
      hasContent = true;
    }
    if (sunData?.love_style_lg) {
      if (hasContent) content += '\n\n';
      content += `── Aşk Tarzı (Linda Goodman) ──\n${sunData.love_style_lg}`;
      hasContent = true;
    }

    if (hasContent) {
      sections.push({ id: 'linda-goodman', title: '📖 Linda Goodman Analizi', icon: '📖', content, priority: 13 });
    }
  }

  // ─── 14. İLİŞKİ ANALİZİ ───
  {
    let content = '';
    let hasContent = false;

    // Venüs yerleşimi
    const venus = facts.planetPlacements.find(p => planetKey(p.name) === 'venus');
    if (venus) {
      const vSignData = knowledge.signs?.[venus.sign];
      const vPlanetData = knowledge.planets?.venus;
      content += `Venüs ${venus.signName} burcunda, ${venus.house}. evde.`;
      if (vPlanetData?.signifies?.length) {
        content += `\nVenüs şunları temsil eder: ${vPlanetData.signifies.join(', ')}`;
      }
      if (venus.dignity) content += `\nVenüs durumu: ${venus.dignity.label}`;
      hasContent = true;
    }

    // 7. ev analizi
    const houseData7 = knowledge.houses?.['7'];
    const in7th = facts.planetPlacements.filter(p => p.house === 7);
    if (in7th.length > 0) {
      if (hasContent) content += '\n\n';
      content += `7. Evdeki gezegenler (ilişkiler ve evlilik): ${in7th.map(p => p.name).join(', ')}`;
      if (houseData7?.topics?.length) {
        content += `\n7. ev konuları: ${houseData7.topics.join(', ')}`;
      }
      hasContent = true;
    }

    // Venüs aspektleri
    const venusAspects = majorAspects.filter(a =>
      planetKey(a.planet1) === 'venus' || planetKey(a.planet2) === 'venus'
    );
    if (venusAspects.length > 0) {
      if (hasContent) content += '\n\n';
      content += 'Venüs aspektleri:';
      venusAspects.forEach(a => {
        const k1 = planetKey(a.planet1);
        const k2 = planetKey(a.planet2);
        const pk1 = [k1, k2].sort().join('_');
        const aspectData = knowledge.planet_aspects?.[pk1] || knowledge.planet_aspects?.[`${k1}_${k2}`] || knowledge.planet_aspects?.[`${k2}_${k1}`];
        const interp = aspectData?.[a.type] || '';
        content += `\n  ${a.planet1} ${a.typeName} ${a.planet2}`;
        if (interp) content += ` — ${interp}`;
      });
      hasContent = true;
    }

    if (hasContent) {
      sections.push({ id: 'relationships', title: '💕 İlişkiler ve Aşk', icon: '💕', content, priority: 14 });
    }
  }

  // (KAD/GAD ve Şans Noktası bilgileri Gezegen Yerleşimleri bölümünde birleştirildi)

  // (Tıbbi Astroloji bilgileri Sağlık Eğilimleri bölümünde birleştirildi)

  // ─── 19. EVLİLİK VE ÇOCUK GÖSTERGELERİ ───
  {
    let content = '';
    let hasContent = false;

    const relRules = knowledge.relationship_rules;
    if (relRules) {
      content += '── Evlilik Göstergeleri ──\n';
      content += `${relRules.female_marriage}\n`;
      content += `${relRules.male_marriage}\n`;

      // Mars in 7th = divorce indicator
      const mars = facts.planetPlacements.find(p => planetKey(p.name) === 'mars');
      if (mars && mars.house === 7) {
        content += `\n⚠️ ${relRules.divorce_indicator}`;
      }

      // Venus-Saturn positive aspect
      const vSatAspect = facts.aspects.find(a =>
        ((planetKey(a.planet1) === 'venus' && planetKey(a.planet2) === 'saturn') ||
         (planetKey(a.planet1) === 'saturn' && planetKey(a.planet2) === 'venus')) &&
        ['trine', 'sextile', 'conjunction'].includes(a.type)
      );
      if (vSatAspect) {
        content += `\n✓ ${relRules.venus_saturn_positive}`;
      }

      // Venus-Chiron negative aspect
      const vChiAspect = facts.aspects.find(a =>
        ((planetKey(a.planet1) === 'venus' && planetKey(a.planet2) === 'chiron') ||
         (planetKey(a.planet1) === 'chiron' && planetKey(a.planet2) === 'venus')) &&
        ['square', 'opposition'].includes(a.type)
      );
      if (vChiAspect) {
        content += `\n⚠️ ${relRules.venus_chiron_negative}`;
      }

      // Twin indicator
      const mercury = facts.planetPlacements.find(p => planetKey(p.name) === 'mercury');
      if (mercury && mercury.house === 5 && ['gemini', 'sagittarius', 'pisces'].includes(mercury.sign)) {
        content += `\n👶 ${relRules.twin_indicator}`;
      }

      // Multiple marriage indicator
      if (mercury && mercury.house === 7 && ['gemini', 'sagittarius', 'pisces'].includes(mercury.sign)) {
        content += `\n💍 ${relRules.multiple_marriage_indicator}`;
      }
      const neptune = facts.planetPlacements.find(p => planetKey(p.name) === 'neptune');
      if (neptune && neptune.house === 7 && ['gemini', 'sagittarius', 'pisces'].includes(neptune.sign)) {
        content += `\n💍 Neptün 7. evde çift karakterli burçta: Birden fazla evlilik göstergesi`;
      }

      hasContent = true;
    }

    if (hasContent) {
      sections.push({ id: 'marriage-children', title: '💍 Evlilik ve Çocuk Göstergeleri', icon: '💍', content: content.trim(), priority: 19 });
    }
  }

  // (Kariyer Detayları bilgileri Kariyer ve MC bölümünde birleştirildi)

  return sections.sort((a, b) => a.priority - b.priority);
}
