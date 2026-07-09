/**
 * src/js/map/render.js
 * Map rendering helpers: markers, family recolor, restore visited.
 *
 * Call initRender(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getD()        → D object
 *   getFAM()      → FAM array
 *   getVisited()  → Set<string>
 *   getCONT_MAP() → CONT_MAP object
 *   getCONT_COL() → CONT_COL object
 *   getFL()       → FL object
 *   updN()        → void
 */

/* global d3 */

let _ctx;
let _oneAwayIsos = new Set();
let _getOneAwaySets = null; // injected by initRender if provided

export function initRender(ctx) {
  _ctx = ctx;
  if (ctx.getOneAwaySets) _getOneAwaySets = ctx.getOneAwaySets;
}

/**
 * Update the one-away notification dot on #setsBtn.
 * Shows a saffron dot when at least one set is one-away.
 */
export function updateOneAwayDot() {
  const dot = document.getElementById('setsNotifDot');
  if (!dot) return;
  const sets = _getOneAwaySets ? _getOneAwaySets() : [];
  if (sets && sets.length > 0) {
    dot.classList.add('show');
  } else {
    dot.classList.remove('show');
  }
}

/**
 * Returns the "Last one for X!" tip text for a given ISO,
 * or null if not a one-away country.
 * @param {string} iso
 * @returns {string|null}
 */
export function getOneAwayTip(iso) {
  if (!_getOneAwaySets) return null;
  const sets = _getOneAwaySets();
  if (!sets || !sets.length) return null;
  const match = sets.find(function (s) { return s.missing === iso; });
  return match ? 'Last one for \u201c' + match.setName + '\u201d!' : null;
}

/**
 * Apply a persistent gold pulsing glow to each country in isoArray.
 * Called on session open when one-away sets are detected.
 * @param {string[]} isoArray  — ISO codes of the missing countries
 */
export function applyOneAwayGlow(isoArray) {
  _oneAwayIsos = new Set(isoArray);
  _oneAwayIsos.forEach(function (iso) {
    const el = document.querySelector('.country[data-a="' + iso + '"]');
    if (el) el.classList.add('country-one-away');
  });
}

/**
 * Remove the one-away glow from a single country (call after collecting it).
 * Pass no argument (or null) to clear all glows.
 * @param {string|null} iso
 */
export function clearOneAwayGlow(iso) {
  if (iso) {
    _oneAwayIsos.delete(iso);
    const el = document.querySelector('.country[data-a="' + iso + '"]');
    if (el) el.classList.remove('country-one-away');
  } else {
    _oneAwayIsos.forEach(function (i) {
      const el = document.querySelector('.country[data-a="' + i + '"]');
      if (el) el.classList.remove('country-one-away');
    });
    _oneAwayIsos.clear();
  }
}

export function placeVisitedMarkers() {
  document.querySelectorAll('.vm').forEach(m => m.remove());
  const svgEl = document.querySelector('#mapSvg');
  if (!svgEl) return;
  _ctx.getVisited().forEach(iso => {
    const el = document.querySelector('.country[data-a="' + iso + '"]');
    if (!el) return;
    const bbox = el.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('cx', cx);
    dot.setAttribute('cy', cy);
    dot.setAttribute('r', '2');
    dot.setAttribute('fill', 'rgba(255,255,255,0.5)');
    dot.setAttribute('class', 'vm');
    dot.style.pointerEvents = 'none';
    svgEl.appendChild(dot);
  });
}

export function placeMarkers() {
  document.querySelectorAll('.mm,.mm-heart').forEach(m => m.remove());
  const svg = document.getElementById('mapSvg');
  if (!svg) return;
  const D        = _ctx.getD();
  const FAM      = _ctx.getFAM();
  const visited  = _ctx.getVisited();
  const CONT_MAP = _ctx.getCONT_MAP();
  const CONT_COL = _ctx.getCONT_COL();
  for (const [a] of Object.entries(D)) {
    const isFam     = FAM.includes(a);
    const isVisited = visited.has(a);
    if (!isFam && !isVisited) continue;
    const el = document.querySelector(`[data-a="${a}"]`);
    if (!el) continue;
    const eb = el.getBBox();
    // Skip markers for countries too small to see on the map (tiny islands)
    if (eb.width < 3 && eb.height < 3) continue;
    const elRect = el.getBoundingClientRect();
    let cx = elRect.left + elRect.width / 2;
    let cy = elRect.top  + elRect.height / 2;
    if (a === 'USA') { cx = elRect.left + elRect.width * 0.78; cy = elRect.top + elRect.height * 0.68; }
    const m = document.createElement('div');
    if (isFam) {
      m.className  = 'mm-heart';
      m.textContent = '♥';
    } else {
      m.className  = 'mm';
      m.textContent = '✦';
      const mc  = CONT_MAP[a] || '';
      const mcc = CONT_COL[mc];
      if (mcc) m.style.color = mcc.bright;
    }
    m.style.left = cx + 'px';
    m.style.top  = cy + 'px';
    document.body.appendChild(m);
  }
}

export function recolorFamilyCountries() {
  const FAM = _ctx.getFAM();
  document.querySelectorAll('.country').forEach(function(el) {
    var a = el.getAttribute('data-a');
    if (!a) return;
    var isFam = FAM.includes(a);
    var sel = d3.select(el);
    if (isFam) {
      sel.attr('stroke', 'rgba(255,255,255,0.45)').attr('stroke-width', 1.2);
    } else {
      sel.attr('stroke', 'rgba(255,255,255,0.15)').attr('stroke-width', 0.5);
    }
  });
}

/**
 * Place or reposition continent nudge badge pills near SVG continent labels.
 * Shows "X more to finish [Continent]!" for continents between 50–99% complete.
 * At most 2 badges visible at once (closest to 100%).
 * Removes existing badges before re-placing.
 */
export function updateContinentNudges() {
  // Remove existing nudge badges
  document.querySelectorAll('.cont-nudge').forEach(function (n) { n.remove(); });

  if (!_ctx) return;
  const D        = _ctx.getD();
  const visited  = _ctx.getVisited();
  const CONT_MAP = _ctx.getCONT_MAP();
  const CONT_COL = _ctx.getCONT_COL();
  if (!D || !visited || !CONT_MAP || !CONT_COL) return;

  // Count total and visited per continent
  const totals  = {};
  const counts  = {};
  Object.keys(D).forEach(function (iso) {
    const code = CONT_MAP[iso];
    if (!code) return;
    totals[code] = (totals[code] || 0) + 1;
    if (visited.has(iso)) counts[code] = (counts[code] || 0) + 1;
  });

  // Continent label text → code map
  const labelToCode = {
    'AFRICA': 'AF', 'ASIA': 'AS', 'EUROPE': 'EU',
    'NORTH AMERICA': 'NA', 'SOUTH AMERICA': 'SA', 'OCEANIA': 'OC',
  };

  // Find eligible continents (>50% and <100% done), sorted by closeness to completion
  const eligible = [];
  Object.keys(totals).forEach(function (code) {
    const total   = totals[code] || 0;
    const found   = counts[code] || 0;
    if (total === 0) return;
    const ratio = found / total;
    if (ratio > 0.5 && ratio < 1.0) {
      eligible.push({ code: code, remaining: total - found, ratio: ratio });
    }
  });
  eligible.sort(function (a, b) { return b.ratio - a.ratio; });
  const top2 = eligible.slice(0, 2);
  if (top2.length === 0) return;

  // Find continent label SVG text elements and position badges beneath them
  const labelEls = document.querySelectorAll('.continent-labels text');
  labelEls.forEach(function (textEl) {
    const content = (textEl.textContent || '').trim().toUpperCase();
    const code    = labelToCode[content];
    if (!code) return;
    const entry = top2.find(function (e) { return e.code === code; });
    if (!entry) return;

    const cc    = CONT_COL[code];
    const color = cc ? cc.base : '#C8CDDA';
    const rect  = textEl.getBoundingClientRect();
    if (rect.width < 1) return; // not visible (zoomed away)

    const badge = document.createElement('div');
    badge.className = 'cont-nudge';
    badge.style.left  = (rect.left + rect.width / 2) + 'px';
    badge.style.top   = (rect.bottom + 6) + 'px';
    badge.style.color = color;
    badge.style.borderColor = color + '40';
    badge.innerHTML =
      '<span class="nudge-num" style="color:' + color + '">' + entry.remaining + '</span>' +
      ' more to finish ' + _contDisplayName(code) + '!';
    badge.setAttribute('title', entry.remaining + ' more countries to complete ' + _contDisplayName(code));

    document.body.appendChild(badge);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { badge.classList.add('show'); });
    });
  });
}

/** Reposition existing continent nudge badges (on resize/pan). */
export function repositionContinentNudges() {
  updateContinentNudges();
}

function _contDisplayName(code) {
  const names = { AF: 'Africa', AS: 'Asia', EU: 'Europe', NA: 'N. America', SA: 'S. America', OC: 'Oceania' };
  return names[code] || code;
}

export function restoreVisitedCountries() {
  const visited  = _ctx.getVisited();
  const CONT_MAP = _ctx.getCONT_MAP();
  const CONT_COL = _ctx.getCONT_COL();
  visited.forEach(a => {
    const el = d3.select('[data-a="' + a + '"]');
    if (!el.empty()) {
      const vc  = CONT_MAP[a] || '';
      const vcc = CONT_COL[vc];
      if (vcc) { el.attr('fill', vcc.base).attr('stroke', vcc.stroke); }
    }
  });
  placeMarkers();
  _ctx.updN();
}
