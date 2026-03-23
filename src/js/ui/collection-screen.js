/**
 * src/js/ui/collection-screen.js
 * "My Postcards" collection screen — full-screen overlay listing every country
 * grouped by continent with per-continent progress bars and tappable mini-cards.
 *
 * Call initCollectionScreen(ctx) in _boot() after data loads.
 * Exposes openCollection() and closeCollection() for HTML onclick handlers
 * via Object.assign(window, {…}).
 *
 * ctx shape:
 *   getD()           → { [iso]: { n, f, c, ... } }   — countries.json data
 *   getRARITY()      → { [iso]: 'common'|'uncommon'|'rare'|'legendary' }
 *   getPlayerName()  → string
 *   showCard(iso)    → void   — opens the full postcard for a country
 */

import { getPostcard, getTotalCollected } from '../features/collection.js';

let _ctx = null;

// Continent display order
const CONT_ORDER = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'South America',
  'Oceania',
];

// Rarity dot colours (spec-exact)
const RARITY_COLORS = {
  common:    '#B4B2A9',
  uncommon:  '#5DCAA5',
  rare:      '#85B7EB',
  legendary: '#FAC775',
};

// ── Init ─────────────────────────────────────────────────────────────────────

export function initCollectionScreen(ctx) {
  _ctx = ctx;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Build the grid from current state and show the overlay. */
export function openCollection() {
  _buildCollection();
  const ov = document.getElementById('collectionOv');
  if (ov) ov.classList.add('on');
}

/** Hide the overlay. */
export function closeCollection() {
  const ov = document.getElementById('collectionOv');
  if (ov) ov.classList.remove('on');
}

// ── Build ─────────────────────────────────────────────────────────────────────

function _buildCollection() {
  const D          = _ctx.getD();
  const RARITY     = _ctx.getRARITY();
  const name       = _ctx.getPlayerName();
  const totalISOs  = Object.keys(D).length;
  const collected  = getTotalCollected();

  // ── Header ────────────────────────────────────────────────
  const titleEl = document.getElementById('colHeaderTitle');
  const countEl = document.getElementById('colHeaderCount');
  if (titleEl) titleEl.textContent = name + '\u2019s postcards';
  if (countEl) countEl.textContent = collected + ' / ' + totalISOs;

  // ── Group countries by continent ──────────────────────────
  const byCont = {};
  Object.entries(D).forEach(([iso, country]) => {
    const c = country.c || 'Other';
    if (!byCont[c]) byCont[c] = [];
    byCont[c].push(iso);
  });

  // Build the ordered list, appending any unlisted continents at end
  const order = CONT_ORDER.filter(c => byCont[c]);
  Object.keys(byCont).forEach(c => {
    if (!order.includes(c)) order.push(c);
  });

  // ── Render sections ───────────────────────────────────────
  const body = document.getElementById('colBody');
  if (!body) return;
  body.innerHTML = '';
  body.scrollTop = 0;

  order.forEach(cont => {
    const isos = byCont[cont];
    if (!isos || isos.length === 0) return;

    // Count collected for this continent
    const contCollected = isos.reduce((n, iso) => {
      return n + (getPostcard(iso).is_collected ? 1 : 0);
    }, 0);
    const contTotal = isos.length;
    const pct = contTotal > 0
      ? ((contCollected / contTotal) * 100).toFixed(1)
      : 0;

    // Section wrapper
    const section = document.createElement('div');
    section.className = 'col-section';

    // Continent header + progress bar
    const hdr = document.createElement('div');
    hdr.className = 'col-cont-hdr';
    hdr.innerHTML =
      '<span class="col-cont-name">' + cont + '</span>' +
      '<span class="col-cont-frac">' + contCollected + ' / ' + contTotal + '</span>';
    section.appendChild(hdr);

    const progWrap = document.createElement('div');
    progWrap.className = 'col-prog-wrap';
    const progBar = document.createElement('div');
    progBar.className = 'col-prog-bar';
    progBar.style.width = pct + '%';
    progWrap.appendChild(progBar);
    section.appendChild(progWrap);

    // Mini-card grid
    const grid = document.createElement('div');
    grid.className = 'col-grid';

    // Sort: collected first, then alphabetically by ISO within each group
    const sorted = isos.slice().sort((a, b) => {
      const ac = getPostcard(a).is_collected ? 0 : 1;
      const bc = getPostcard(b).is_collected ? 0 : 1;
      if (ac !== bc) return ac - bc;
      return a.localeCompare(b);
    });

    sorted.forEach(iso => {
      const pc      = getPostcard(iso);
      const country = D[iso];
      const flag    = country.f || '🏳';

      const card = document.createElement('div');

      if (pc.is_collected) {
        const rarity      = (RARITY && RARITY[iso]) || 'common';
        const dotColor    = RARITY_COLORS[rarity] || RARITY_COLORS.common;

        card.className = 'col-mc col-mc--collected';
        card.innerHTML =
          '<span class="col-mc-dot" style="background:' + dotColor + '"></span>' +
          '<span class="col-mc-flag">' + flag + '</span>' +
          '<span class="col-mc-code">' + iso + '</span>';

        // Tap collected card → close overlay, open postcard
        card.addEventListener('click', function () {
          closeCollection();
          setTimeout(function () { _ctx.showCard(iso); }, 50);
        });
      } else {
        card.className = 'col-mc col-mc--unknown';
        card.innerHTML =
          '<span class="col-mc-flag">' + flag + '</span>' +
          '<span class="col-mc-code">???</span>';
      }

      grid.appendChild(card);
    });

    section.appendChild(grid);
    body.appendChild(section);
  });
}
