/**
 * src/js/ui/collection-screen.js
 * "My Postcards" collection screen — full-screen overlay listing every country
 * grouped by continent with per-continent progress bars and tappable mini-cards.
 *
 * Feature 3 additions:
 *   - Rarity filter tabs: All | Uncommon | Rare | Legendary
 *   - Rarity summary line (N Uncommon · N Rare · N Legendary)
 *   - Legendary showcase section at the top
 *   - Rarity border treatments on mini-cards
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
let _rarityFilter = 'all'; // 'all' | 'uncommon' | 'rare' | 'legendary'

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
  _rarityFilter = 'all'; // reset filter on open
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

  // ── Vault button (shown when any legendary found or 30+ collected) ────────
  const hdrEl = document.querySelector('.col-hdr');
  const existingVaultBtn = document.getElementById('vaultOpenBtn');
  if (existingVaultBtn) existingVaultBtn.remove();
  if (hdrEl) {
    const shouldShowVault = nLegendary > 0 || collected >= 30;
    if (shouldShowVault) {
      const vBtn = document.createElement('button');
      vBtn.id = 'vaultOpenBtn';
      vBtn.className = 'vault-btn';
      vBtn.textContent = '✦ VAULT';
      vBtn.onclick = function () { if (window.openLegendaryVault) window.openLegendaryVault(); };
      const closeBtn = hdrEl.querySelector('.col-close-btn');
      if (closeBtn) {
        hdrEl.insertBefore(vBtn, closeBtn);
      } else {
        hdrEl.appendChild(vBtn);
      }
    }
  }

  // ── Rarity counts (collected only) ───────────────────────
  let nUncommon = 0, nRare = 0, nLegendary = 0;
  const legendaryCollected = [];
  Object.keys(D).forEach(function (iso) {
    const pc = getPostcard(iso);
    if (!pc.is_collected) return;
    const r = (RARITY && RARITY[iso]) || 'common';
    if (r === 'uncommon')  nUncommon++;
    if (r === 'rare')      nRare++;
    if (r === 'legendary') { nLegendary++; legendaryCollected.push(iso); }
  });

  // ── Group countries by continent ──────────────────────────
  const byCont = {};
  Object.entries(D).forEach(function ([iso, country]) {
    const c = country.c || 'Other';
    if (!byCont[c]) byCont[c] = [];
    byCont[c].push(iso);
  });

  // Build the ordered list, appending any unlisted continents at end
  const order = CONT_ORDER.filter(c => byCont[c]);
  Object.keys(byCont).forEach(function (c) {
    if (!order.includes(c)) order.push(c);
  });

  // ── Render body ───────────────────────────────────────────
  const body = document.getElementById('colBody');
  if (!body) return;
  body.innerHTML = '';
  body.scrollTop = 0;

  // ── Rarity filter tabs ────────────────────────────────────
  const tabsEl = document.createElement('div');
  tabsEl.className = 'rarity-tabs';
  const tabDefs = [
    { id: 'all',       label: 'ALL' },
    { id: 'uncommon',  label: 'UNCOMMON' },
    { id: 'rare',      label: 'RARE' },
    { id: 'legendary', label: 'LEGENDARY' },
  ];
  tabDefs.forEach(function (td) {
    const btn = document.createElement('button');
    btn.className = 'rarity-tab rarity-tab--' + td.id +
      (_rarityFilter === td.id ? ' rarity-tab--active' : '');
    btn.textContent = td.label;
    btn.addEventListener('click', function () {
      _rarityFilter = td.id;
      _buildCollection();
    });
    tabsEl.appendChild(btn);
  });
  body.appendChild(tabsEl);

  // ── Rarity summary ────────────────────────────────────────
  const summaryEl = document.createElement('div');
  summaryEl.className = 'rarity-summary';
  summaryEl.innerHTML =
    '<span class="rs-uncommon">' + nUncommon + ' Uncommon</span>' +
    ' · <span class="rs-rare">' + nRare + ' Rare</span>' +
    ' · <span class="rs-legendary">' + nLegendary + ' Legendary</span>';
  body.appendChild(summaryEl);

  // ── Legendary showcase (only when showing 'all' or 'legendary') ───────────
  if (((_rarityFilter === 'all' || _rarityFilter === 'legendary') && legendaryCollected.length > 0)) {
    const legSection = document.createElement('div');
    legSection.className = 'col-legendary-section';

    const legEyebrow = document.createElement('div');
    legEyebrow.className = 'col-legendary-eyebrow';
    legEyebrow.textContent = '✦ LEGENDARY POSTCARDS';
    legSection.appendChild(legEyebrow);

    const legGrid = document.createElement('div');
    legGrid.className = 'col-legendary-grid';

    legendaryCollected.forEach(function (iso) {
      const country = D[iso];
      const flag    = country.f || '🏳';
      const card    = document.createElement('div');
      card.className = 'col-mc--legendary-showcase';
      card.innerHTML =
        '<span class="col-mc-flag">' + flag + '</span>' +
        '<span class="col-mc-code">' + iso + '</span>';
      card.addEventListener('click', function () {
        closeCollection();
        setTimeout(function () { _ctx.showCard(iso); }, 50);
      });
      legGrid.appendChild(card);
    });

    legSection.appendChild(legGrid);
    body.appendChild(legSection);
  }

  // ── If showing only a rarity filter, render a flat filtered list ───────────
  if (_rarityFilter !== 'all') {
    _buildFilteredGrid(body, D, RARITY);
    return;
  }

  // ── Default: continent sections ───────────────────────────
  order.forEach(function (cont) {
    const isos = byCont[cont];
    if (!isos || isos.length === 0) return;

    // Count collected for this continent
    const contCollected = isos.reduce(function (n, iso) {
      return n + (getPostcard(iso).is_collected ? 1 : 0);
    }, 0);
    const contTotal = isos.length;
    const pct = contTotal > 0 ? ((contCollected / contTotal) * 100).toFixed(1) : 0;

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
    const sorted = isos.slice().sort(function (a, b) {
      const ac = getPostcard(a).is_collected ? 0 : 1;
      const bc = getPostcard(b).is_collected ? 0 : 1;
      if (ac !== bc) return ac - bc;
      return a.localeCompare(b);
    });

    sorted.forEach(function (iso) {
      const card = _buildMiniCard(iso, D, RARITY);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    body.appendChild(section);
  });
}

/** Build a flat grid of countries matching _rarityFilter. */
function _buildFilteredGrid(body, D, RARITY) {
  const matchingISOs = Object.keys(D).filter(function (iso) {
    const pc = getPostcard(iso);
    if (!pc.is_collected) return false;
    const r = (RARITY && RARITY[iso]) || 'common';
    return r === _rarityFilter;
  }).sort();

  if (matchingISOs.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText = 'text-align:center;padding:32px 16px;font-family:Inter,system-ui,sans-serif;font-size:13px;color:#50556E';
    empty.textContent = 'No ' + _rarityFilter + ' postcards yet — keep exploring!';
    body.appendChild(empty);
    return;
  }

  const section = document.createElement('div');
  section.className = 'col-section';

  const grid = document.createElement('div');
  grid.className = 'col-grid';

  matchingISOs.forEach(function (iso) {
    const card = _buildMiniCard(iso, D, RARITY);
    grid.appendChild(card);
  });

  section.appendChild(grid);
  body.appendChild(section);
}

/** Build a single mini-card element. */
function _buildMiniCard(iso, D, RARITY) {
  const pc      = getPostcard(iso);
  const country = D[iso];
  const flag    = country.f || '🏳';
  const card    = document.createElement('div');

  if (pc.is_collected) {
    const rarity   = (RARITY && RARITY[iso]) || 'common';
    const dotColor = RARITY_COLORS[rarity] || RARITY_COLORS.common;

    card.className = 'col-mc col-mc--collected col-mc--' + rarity;
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

  return card;
}
