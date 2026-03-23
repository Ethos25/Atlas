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

export function initRender(ctx) {
  _ctx = ctx;
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
