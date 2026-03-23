/**
 * src/js/cards/connections.js
 * CONN_TYPES constant, Friends & Foes tab: getCountryConns, pulseCountry,
 * renderConnCard, connPage, filterConnsByAge.
 *
 * Call initConnections(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getCONNECTIONS() → CONNECTIONS array
 *
 * Age filter (Priority 9 / foundation for Priority 10):
 *   CONN_SENSITIVE_TYPES lists types shown only to players aged 5+.
 *   filterConnsByAge(conns, age) applies the filter and is exported for
 *   reuse by the set age-gating system (Priority 10).
 */

import { playSound } from '../ui/sounds.js';

export const CONN_TYPES = {
  split:    { icon: '✂️', label: 'ONCE ONE, NOW TWO',   color: 'rgba(180,130,200,0.6)' },
  conflict: { icon: '⚔️', label: 'NEIGHBORS WHO ARGUE', color: 'rgba(184,64,64,0.6)'   },
  tension:  { icon: '⚡', label: 'IT\'S COMPLICATED',   color: 'rgba(220,160,60,0.6)'  },
  partners: { icon: '🤝', label: 'PARTNERS',            color: 'rgba(74,154,82,0.6)'   },
  cultural: { icon: '🌉', label: 'CULTURAL BRIDGE',     color: 'rgba(58,158,158,0.6)'  },
  trade:    { icon: '🚢', label: 'TRADE PARTNERS',      color: 'rgba(100,140,200,0.6)' },
  surprise: { icon: '✦',  label: 'SURPRISING LINK',     color: 'rgba(212,136,74,0.6)'  },
};

/**
 * Connection types that are sensitive for younger audiences.
 * Displayed only when player age >= 5.
 * Exported so the set age-gating system (Priority 10) can reuse the same list.
 */
export const CONN_SENSITIVE_TYPES = new Set(['tension', 'conflict', 'split']);

/**
 * Filter a connections array by player age.
 * Ages < 5: sensitive types (tension, conflict, split) are removed.
 * Ages >= 5: all types are shown.
 * @param {object[]} conns  Raw connections for a country
 * @param {number}   age    Player's age
 * @returns {object[]}      Filtered connections
 */
export function filterConnsByAge(conns, age) {
  if (age >= 5) return conns;
  return conns.filter(function (c) { return !CONN_SENSITIVE_TYPES.has(c.type); });
}

let _ctx;

export function initConnections(ctx) {
  _ctx = ctx;
}

export function getCountryConns(iso) {
  return _ctx.getCONNECTIONS().filter(function(c) { return c.c.includes(iso); });
}

export function pulseCountry(iso) {
  var el = document.querySelector('.country[data-a="' + iso + '"]');
  if (!el) return;
  el.classList.add('map-pulse');
  setTimeout(function() { el.classList.remove('map-pulse'); }, 1500);
}

export function renderConnCard() {
  var stage = document.getElementById('connStage');
  var dots  = document.getElementById('connDots');
  var prev  = document.getElementById('connPrev');
  var next  = document.getElementById('connNext');
  if (!stage || !window._connCards || !window._connCards.length) return;

  // Render current card with fade animation
  stage.innerHTML = window._connCards[window._connIdx];
  var card = stage.querySelector('.conn-card');
  if (card) { card.style.animation = 'none'; card.offsetHeight; card.style.animation = ''; }

  // Update dots
  if (dots) {
    dots.innerHTML = window._connCards.length > 1
      ? window._connCards.map(function(_, i) {
          return '<div class="conn-dot' + (i === window._connIdx ? ' active' : '') + '"></div>';
        }).join('') +
        '<span class="conn-count">' + (window._connIdx + 1) + ' of ' + window._connCards.length + '</span>'
      : '';
  }

  // Update arrows
  if (prev) prev.classList.toggle('disabled', window._connIdx === 0);
  if (next) {
    if (window._connIdx >= window._connCards.length - 1) {
      next.textContent = '✓';
      next.classList.add('disabled');
    } else {
      next.textContent = '›';
      next.classList.remove('disabled');
    }
  }
}

export function connPage(dir) {
  if (!window._connCards || !window._connCards.length) return;
  var newIdx = window._connIdx + dir;
  if (newIdx < 0 || newIdx >= window._connCards.length) return;
  window._connIdx = newIdx;
  playSound('tab');
  renderConnCard();
}
