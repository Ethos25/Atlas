/**
 * src/js/ui/arrival.js
 * Envelope arrival animation for first-time postcard discoveries.
 *
 * showCardWithArrival(iso) is the single entry-point:
 *   NEW discovery  (getPostcard(iso).is_collected === false)
 *     → collectPostcard, envelope slide-in, then openCard.
 *   REVISIT        (is_collected === true)
 *     → openCard directly (CSS handles the 250ms slide-up).
 *
 * Call initArrival(ctx) inside _boot().
 * Exposes openSetsScreen closeEnvelope for HTML onclick via Object.assign.
 *
 * ctx shape:
 *   getD()           → { [iso]: countryData }
 *   getFL()          → { [fc]: flagUrl }
 *   getPlayerName()  → string
 *   getSETS()        → sets definition map
 *   getSetsProgress()→ { [setId]: { collected, completed_at } }
 *   openCard(iso)        → void  (_showCard + buildWhereNext)
 *   pulseNearby(iso)     → void
 *   saveGame()           → void
 *   clearOneAwayGlow(iso)→ void  (optional — removes gold glow after collection)
 */

import { getPostcard, collectPostcard } from '../features/collection.js';
import { triggerSetCelebration }        from './celebration.js';

let _ctx = null;

// ── Per-sequence state ────────────────────────────────────────────────────────
let _iso          = null;
let _rarity       = 'common';
let _newSets      = [];
let _autoTimer    = null;
let _envTapFn     = null;  // current card-tap handler (removed on advance)

// ── Init ─────────────────────────────────────────────────────────────────────

export function initArrival(ctx) {
  _ctx = ctx;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Route a showCard call through the arrival system.
 * New discovery → envelope animation → card.
 * Revisit → direct card open (CSS slide-up applies automatically).
 */
export function showCardWithArrival(iso) {
  if (getPostcard(iso).is_collected) {
    _ctx.openCard(iso);
    return;
  }

  _iso = iso;

  // ── Collect immediately ──────────────────────────────────────────
  // Snapshot completed-set state BEFORE collection so we can diff after.
  const preProg    = _ctx.getSetsProgress();
  const wasCompleted = {};
  Object.keys(preProg).forEach(function (id) {
    wasCompleted[id] = preProg[id] && preProg[id].completed_at !== null;
  });

  const pc = collectPostcard(iso);
  _rarity  = pc.rarity || 'common';
  _ctx.saveGame();

  // Clear the one-away glow if this country had one
  if (_ctx.clearOneAwayGlow) _ctx.clearOneAwayGlow(iso);

  // Diff to find newly completed sets
  const postProg = _ctx.getSetsProgress();
  const SETS     = _ctx.getSETS ? _ctx.getSETS() : {};
  _newSets = Object.keys(postProg).filter(function (id) {
    return postProg[id] && postProg[id].completed_at !== null && !wasCompleted[id];
  });

  // ── Prepare & show envelope ──────────────────────────────────────
  _buildEnvelope(iso, pc);
  _showOv();

  // Double-rAF — let the 'on' class and initial state paint before animating
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      _phaseSlideIn();
    });
  });
}

/** Dismiss the envelope without opening the card (X button). */
export function closeEnvelope() {
  _cancelAuto();
  _cancelEnvTap();
  _cleanupDots();

  const ov = document.getElementById('envOv');
  if (!ov) return;

  ov.style.transition = 'opacity 220ms ease';
  ov.style.opacity    = '0';
  setTimeout(function () {
    ov.classList.remove('on');
    ov.style.opacity    = '';
    ov.style.transition = '';
  }, 220);

  if (_iso && _ctx.pulseNearby) _ctx.pulseNearby(_iso);
  _iso = null;
}

// ── Build DOM ─────────────────────────────────────────────────────────────────

function _buildEnvelope(iso, pc) {
  const D    = _ctx.getD();
  const FL   = _ctx.getFL ? _ctx.getFL() : {};
  const dd   = D[iso] || {};
  const name = _ctx.getPlayerName();

  // Flag stamp
  const stampEl = document.getElementById('envStamp');
  if (stampEl) {
    if (dd.fc && FL && FL[dd.fc]) {
      stampEl.innerHTML = '<img src="' + FL[dd.fc] + '" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:2px;display:block">';
    } else {
      stampEl.textContent = dd.f || '\uD83C\uDFF3';
    }
  }

  // Address text
  var toEl      = document.getElementById('envTo');
  var countryEl = document.getElementById('envCountry');
  if (toEl)      toEl.textContent      = 'To: ' + name;
  if (countryEl) countryEl.textContent = dd.n || iso;

  // Reset card position & rarity class
  var card = document.getElementById('envCard');
  if (card) {
    card.style.transition = 'none';
    card.style.transform  = 'translateY(140%) scale(0.85)';
    card.style.opacity    = '0';
    card.className        = 'env-card env-card--' + _rarity;
  }

  // Reset ring
  var ring = document.getElementById('envRing');
  if (ring) { ring.className = 'env-ring'; ring.style.opacity = '0'; }

  // Hide X button initially
  var xBtn = document.getElementById('envXBtn');
  if (xBtn) { xBtn.style.opacity = '0'; xBtn.style.pointerEvents = 'none'; }
}

function _showOv() {
  var ov = document.getElementById('envOv');
  if (ov) {
    ov.style.opacity    = '';
    ov.style.transition = '';
    ov.classList.add('on');
  }
}

// ── Phase 1: Slide in (400ms spring) ─────────────────────────────────────────

function _phaseSlideIn() {
  var card = document.getElementById('envCard');
  if (!card) return;
  card.style.transition = 'transform 400ms cubic-bezier(0.34,1.56,0.64,1), opacity 250ms ease';
  card.style.transform  = 'translateY(0) scale(1)';
  card.style.opacity    = '1';

  setTimeout(_phaseLanded, 400);
}

// ── Phase 2: Landed ───────────────────────────────────────────────────────────

function _phaseLanded() {
  // Reveal X button
  var xBtn = document.getElementById('envXBtn');
  if (xBtn) {
    xBtn.style.transition  = 'opacity 200ms ease';
    xBtn.style.opacity     = '1';
    xBtn.style.pointerEvents = 'auto';
  }

  // Allow tap to advance early
  var card = document.getElementById('envCard');
  if (card) {
    card.style.cursor = 'pointer';
    _envTapFn = function () { _cancelAuto(); _phaseSwap(); };
    card.addEventListener('click', _envTapFn, { once: true });
  }

  // Rarity ring pops after 500ms pause
  setTimeout(_phaseRarityPop, 500);

  // Auto-advance at 2500ms from landing
  _autoTimer = setTimeout(function () {
    _cancelEnvTap();
    _phaseSwap();
  }, 2500);
}

// ── Phase 3: Rarity pop (200ms after 500ms pause) ────────────────────────────

function _phaseRarityPop() {
  if (_rarity === 'common') return;

  var ring = document.getElementById('envRing');
  if (!ring) return;

  ring.className        = 'env-ring env-ring--' + _rarity;
  ring.style.transition = 'opacity 200ms ease';
  ring.style.opacity    = '1';

  if (_rarity === 'legendary') _spawnLegendaryDots();
}

function _spawnLegendaryDots() {
  var scene = document.getElementById('envScene');
  if (!scene) return;
  for (var i = 0; i < 8; i++) {
    var dot         = document.createElement('div');
    dot.className   = 'env-dot';
    dot.style.setProperty('--a', (i / 8 * 360) + 'deg');
    dot.style.animationDelay = (i * 80) + 'ms';
    scene.appendChild(dot);
  }
}

function _cleanupDots() {
  var scene = document.getElementById('envScene');
  if (!scene) return;
  scene.querySelectorAll('.env-dot').forEach(function (d) { d.remove(); });
}

// ── Phase 4: Swap — envelope out, card in ────────────────────────────────────

function _phaseSwap() {
  _cleanupDots();
  var ov   = document.getElementById('envOv');
  var card = document.getElementById('envCard');
  if (!card || !ov) return;

  // Hide hint
  // Fade envelope out (200ms)
  card.style.transition = 'opacity 200ms ease, transform 200ms ease';
  card.style.opacity    = '0';
  card.style.transform  = 'scale(0.92)';

  // Snapshot state before resetting module vars
  var capturedISO  = _iso;
  var capturedSets = _newSets.slice();

  setTimeout(function () {
    // Hide envelope overlay
    ov.classList.remove('on');

    // Open the postcard — CSS transition handles the 250ms slide-up
    _ctx.openCard(capturedISO);

    // Brief arrival toast at +300 ms (rarity/set-complete flash)
    setTimeout(function () { _showArrivalToast(); }, 300);

    // Full set completion celebration after arrival toast clears (~1800 ms)
    // Chained sequentially if multiple sets completed at once (rare).
    if (capturedSets.length > 0) {
      setTimeout(function () { _fireCelebrations(capturedSets); }, 1800);
    }

    // Attach swipe-down on the card overlay
    setTimeout(function () { _attachSwipeDown(); }, 100);

    // Watch for card close → stamp the country
    _watchForCardClose(capturedISO);

    _iso = null;
  }, 200);
}

// Fire one celebration per newly-completed set, staggered 600 ms apart.
function _fireCelebrations(setIds) {
  var SETS = _ctx.getSETS ? _ctx.getSETS() : {};
  setIds.forEach(function (id, idx) {
    var def = SETS[id];
    if (!def) return;
    setTimeout(function () {
      triggerSetCelebration(id, def);
    }, idx * 600);
  });
}

// ── Arrival toast ─────────────────────────────────────────────────────────────

function _showArrivalToast() {
  var text = '';
  var SETS = _ctx.getSETS ? _ctx.getSETS() : {};

  if (_newSets && _newSets.length > 0) {
    var setName = SETS[_newSets[0]] ? SETS[_newSets[0]].name : 'Set';
    text = '\uD83C\uDF89 ' + setName + ' complete!';
  } else if (_rarity === 'legendary') {
    text = '\u2746 Legendary discovery!';
  } else if (_rarity === 'rare') {
    text = '\u25CF Rare postcard!';
  } else if (_rarity === 'uncommon') {
    text = '\u25CF Uncommon find!';
  }

  if (!text) return;

  var toast = document.createElement('div');
  toast.className   = 'env-toast';
  toast.textContent = text;
  document.body.appendChild(toast);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      toast.classList.add('env-toast--in');
    });
  });

  // Visible for 800ms, then fade out
  setTimeout(function () {
    toast.classList.remove('env-toast--in');
    setTimeout(function () { toast.remove(); }, 300);
  }, 800 + 300);
}

// ── Swipe-down dismiss on the open postcard ───────────────────────────────────

function _attachSwipeDown() {
  var cOv = document.getElementById('cOv');
  if (!cOv) return;

  var startX, startY;

  function onStart(e) {
    if (!cOv.classList.contains('on')) return;
    var t = e.touches ? e.touches[0] : e;
    startX = t.clientX;
    startY = t.clientY;
  }

  function onEnd(e) {
    if (!cOv.classList.contains('on')) return;
    var t  = e.changedTouches ? e.changedTouches[0] : e;
    var dx = t.clientX - startX;
    var dy = t.clientY - startY;
    // Swipe down: dy > 40px AND angle ≤ 45° from vertical
    if (dy > 40 && Math.abs(Math.atan2(Math.abs(dx), dy) * 180 / Math.PI) <= 45) {
      if (window.cl) window.cl();
    }
  }

  cOv.addEventListener('touchstart', onStart, { passive: true });
  cOv.addEventListener('touchend',   onEnd,   { passive: true });

  // Clean up when the card overlay closes
  var obs = new MutationObserver(function () {
    if (!cOv.classList.contains('on')) {
      obs.disconnect();
      cOv.removeEventListener('touchstart', onStart);
      cOv.removeEventListener('touchend',   onEnd);
    }
  });
  obs.observe(cOv, { attributes: true, attributeFilter: ['class'] });
}

// ── Country stamp after card close ───────────────────────────────────────────

function _watchForCardClose(iso) {
  var cOv = document.getElementById('cOv');
  if (!cOv || !iso) return;

  var obs = new MutationObserver(function () {
    if (!cOv.classList.contains('on')) {
      obs.disconnect();
      _stampCountry(iso);
    }
  });
  obs.observe(cOv, { attributes: true, attributeFilter: ['class'] });
}

function _stampCountry(iso) {
  var el = document.querySelector('.country[data-a="' + iso + '"]');
  if (!el) return;

  var bb   = el.getBoundingClientRect();
  var size = Math.min(bb.width, bb.height);
  if (size < 30) return; // too small at current zoom — skip

  var stamp = document.createElement('div');
  stamp.className   = 'env-country-stamp';
  stamp.textContent = '\u2713';
  stamp.style.left  = (bb.left + bb.width  / 2) + 'px';
  stamp.style.top   = (bb.top  + bb.height / 2) + 'px';
  document.body.appendChild(stamp);

  requestAnimationFrame(function () {
    stamp.classList.add('env-country-stamp--in');
  });

  setTimeout(function () {
    stamp.style.opacity    = '0';
    stamp.style.transition = 'opacity 300ms ease';
    setTimeout(function () { stamp.remove(); }, 300);
  }, 1500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _cancelAuto() {
  if (_autoTimer) { clearTimeout(_autoTimer); _autoTimer = null; }
}

function _cancelEnvTap() {
  var card = document.getElementById('envCard');
  if (card && _envTapFn) {
    card.removeEventListener('click', _envTapFn);
    _envTapFn = null;
  }
}
