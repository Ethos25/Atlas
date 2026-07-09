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
 *   getGREET()       → { [iso]: greetingString }
 *   getCONT_MAP()    → { [iso]: continentCode }
 *   getCONT_COL()    → { [code]: { base, bright, stroke } }
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

function hexToRgba(hex, alpha) {
  var r = parseInt(hex.slice(1, 3), 16);
  var g = parseInt(hex.slice(3, 5), 16);
  var b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

// ── Teaser & subline content pools ────────────────────────────────────────────
var FALLBACK_TEASERS = [
  "I have a secret to tell you...",
  "Something amazing is waiting inside...",
  "You won't believe what I'm famous for...",
  "I've been waiting to meet you!",
];

var ADDRESS_SUBLINES = [
  "I picked you!",
  "I've been waiting for you!",
  "Open me!",
  "This one's just for you.",
  "Ready for an adventure?",
  "You're going to love this.",
];

// ── Rarity disclosure data ────────────────────────────────────────────────────
var RARITY_INFO = {
  uncommon:  { label: 'Uncommon',  color: '#B4BECD', desc: 'Not every explorer finds this one!' },
  rare:      { label: 'Rare',      color: '#E8AF38', desc: 'This is a very special find!' },
  legendary: { label: 'Legendary', color: '#E8AF38', desc: 'Almost nobody has this one!' }
};

// ── Per-sequence state ────────────────────────────────────────────────────────
let _iso          = null;
let _rarity       = 'common';
let _newSets      = [];
let _autoTimer    = null;  // unused — auto-advance removed; kept for _cancelAuto compatibility
let _envTapFn     = null;  // current card-tap handler (removed on advance)
let _tapped       = false; // true once the child has tapped the envelope
let _hintTimer    = null;  // delayed "Tap to open" hint timer

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
  _tapped = true; // prevent any pending timeouts from acting
  _cancelAuto();
  _cancelHint();
  _cancelEnvTap();
  _cleanupDots();

  // Remove pulse class if it was added
  var card = document.getElementById('envCard');
  if (card) card.classList.remove('env-card--pulse');

  // Hide rarity tooltip
  var tipEl = document.getElementById('envSealTip');
  if (tipEl) tipEl.classList.remove('show');

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
  const D        = _ctx.getD();
  const FL       = _ctx.getFL ? _ctx.getFL() : {};
  const GREET    = _ctx.getGREET ? _ctx.getGREET() : {};
  const CONT_MAP = _ctx.getCONT_MAP ? _ctx.getCONT_MAP() : {};
  const dd       = D[iso] || {};
  const name     = _ctx.getPlayerName();
  // Capitalize first letter of player name
  const nameDisp = name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Explorer';
  const countryName = dd.n || iso;
  const cont     = CONT_MAP[iso] || '';

  // Clean rectangular flag (no stamp frame)
  var flagEl = document.getElementById('envFlag');
  if (flagEl) {
    if (dd.fc && FL && FL[dd.fc]) {
      flagEl.innerHTML = '<img src="' + FL[dd.fc] + '" alt="" style="display:block;width:48px;height:auto;max-height:36px;border-radius:2px;border:1px solid rgba(60,50,30,0.18);box-shadow:0 2px 8px rgba(0,0,0,0.2)">';
    } else {
      flagEl.innerHTML = '';
    }
  }

  // Postmark: continent + date
  var CONT_FULL = {
    'AF': 'AFRICA', 'SA': 'SOUTH AMERICA', 'NA': 'NORTH AMERICA',
    'EU': 'EUROPE', 'AS': 'ASIA', 'OC': 'OCEANIA', 'AN': 'ANTARCTICA'
  };
  var pmCont = document.getElementById('envPmCont');
  var pmDate = document.getElementById('envPmDate');
  if (pmCont) pmCont.textContent = CONT_FULL[cont] || cont;
  if (pmDate) {
    var now = new Date();
    pmDate.textContent = (now.getMonth() + 1) + '/' + now.getDate() + '/' + now.getFullYear();
  }

  // Apply continent color to postmark circle and continent name
  var CONT_COL    = _ctx.getCONT_COL ? _ctx.getCONT_COL() : {};
  var contCC      = CONT_COL[cont];
  var postmarkEl  = document.getElementById('envPostmark');
  if (postmarkEl && contCC && contCC.base) {
    postmarkEl.style.borderColor = contCC.base;
    postmarkEl.style.background  = hexToRgba(contCC.base, 0.12);
  } else if (postmarkEl) {
    postmarkEl.style.borderColor = '';
    postmarkEl.style.background  = '';
  }
  if (pmCont && contCC && contCC.base) {
    pmCont.style.color = contCC.base;
  } else if (pmCont) {
    pmCont.style.color = '';
  }

  // From line
  var fromEl = document.getElementById('envFrom');
  if (fromEl) fromEl.textContent = 'From: ' + countryName;

  // To + subtitle
  var toEl = document.getElementById('envTo');
  var subEl = document.getElementById('envSubtitle');
  if (toEl)  toEl.textContent  = 'To: ' + nameDisp;
  if (subEl) subEl.textContent = 'A letter from ' + countryName;

  // Greeting — GREET is keyed by flag code (fc), not ISO
  var greetEl = document.getElementById('envGreet');
  if (greetEl) greetEl.textContent = (dd.fc && GREET[dd.fc] ? GREET[dd.fc].d : '');

  // Teaser line — from envelope-teasers.json, with fallback pool
  var TEASERS = _ctx.getTEASERS ? _ctx.getTEASERS() : {};
  var teaserEl = document.getElementById('envTeaser');
  if (teaserEl) {
    var teaserText = TEASERS[iso] || FALLBACK_TEASERS[Math.floor(Math.random() * FALLBACK_TEASERS.length)];
    teaserEl.textContent = teaserText;
    teaserEl.classList.remove('vis');
  }

  // Rarity seal
  var sealEl = document.getElementById('envSeal');
  if (sealEl) {
    sealEl.className = 'env-seal';
    sealEl.classList.remove('vis');
    if (_rarity === 'uncommon') {
      sealEl.classList.add('env-seal--uncommon');
      sealEl.textContent = '\u2736';
    } else if (_rarity === 'rare') {
      sealEl.classList.add('env-seal--rare');
      sealEl.textContent = '\u2736';
    } else if (_rarity === 'legendary') {
      sealEl.classList.add('env-seal--legendary');
      sealEl.textContent = '\u2605';
    } else {
      sealEl.textContent = '';
    }
  }

  // ── Rarity seal tap-to-reveal disclosure ─────────────────────────────
  // Reset tooltip first (stale from previous envelope)
  var tipEl = document.getElementById('envSealTip');
  if (tipEl) tipEl.classList.remove('show');

  if (sealEl && _rarity !== 'common') {
    // Enable tap on this seal
    sealEl.style.pointerEvents = 'auto';
    sealEl.style.cursor        = 'pointer';

    sealEl.onclick = function (e) {
      e.stopPropagation(); // do NOT trigger envelope open

      var info = RARITY_INFO[_rarity];
      if (!info || !tipEl) return;

      // Position tooltip just above the seal using live coords
      var sealRect  = sealEl.getBoundingClientRect();
      var sceneEl   = document.getElementById('envScene');
      var sceneRect = sceneEl ? sceneEl.getBoundingClientRect() : { left: 0, bottom: window.innerHeight };

      var leftPx   = sealRect.left - sceneRect.left + sealRect.width / 2;
      var bottomPx = sceneRect.bottom - sealRect.top + 8;
      tipEl.style.left   = leftPx + 'px';
      tipEl.style.bottom = bottomPx + 'px';

      document.getElementById('envSealTipTier').textContent = info.label;
      document.getElementById('envSealTipTier').style.color = info.color;
      document.getElementById('envSealTipDesc').textContent = info.desc;
      tipEl.classList.add('show');

      // Dismiss on the very next tap anywhere (10ms guard avoids self-dismiss)
      setTimeout(function () {
        document.addEventListener('click', function dismissTip() {
          tipEl.classList.remove('show');
          document.removeEventListener('click', dismissTip);
        }, { once: true });
      }, 10);
    };
  } else if (sealEl) {
    // Common — no seal, no tap
    sealEl.style.pointerEvents = 'none';
    sealEl.style.cursor        = '';
    sealEl.onclick             = null;
  }

  // Address subline — random from pool
  var sublineEl = document.getElementById('envSubline');
  if (sublineEl) {
    sublineEl.textContent = ADDRESS_SUBLINES[Math.floor(Math.random() * ADDRESS_SUBLINES.length)];
  }

  // Reset stagger classes
  var bodyEl = document.querySelector('.env-body');
  [document.querySelector('.env-tr'), fromEl, bodyEl, greetEl].forEach(function(el) {
    if (el) el.classList.remove('vis');
  });

  // Reset tap hint
  var hintEl = document.getElementById('envTapHint');
  if (hintEl) hintEl.style.opacity = '0';

  // Reset flap to visible/down state — without this, the lifted class from the
  // previous envelope sticks and subsequent envelopes show no flap triangle.
  var flapEl = document.querySelector('.env-flap');
  if (flapEl) {
    flapEl.style.transition = 'none';
    flapEl.classList.remove('env-flap--lift');
    void flapEl.offsetWidth; // force reflow so transition: none takes effect
    flapEl.style.transition = '';
  }

  // Reset card position & rarity class
  var card = document.getElementById('envCard');
  if (card) {
    card.style.transition = 'none';
    card.style.transform  = 'translateY(140%) scale(0.85)';
    card.style.opacity    = '0';
    card.className        = 'env-card';
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
  _tapped = false;

  var card = document.getElementById('envCard');
  var ring = document.getElementById('envRing');
  if (!card) return;

  // Ring must always be visible — it's the card's parent.
  // For common rarity it has no visual styling; non-common gets a glow class later.
  if (ring) {
    ring.style.transition = 'opacity 200ms ease';
    ring.style.opacity    = '1';
  }

  // Install tap listener immediately — handles impatient taps during slide-in.
  // Uses a wrapper so _envTapFn reference is stable for _cancelEnvTap.
  card.style.cursor = 'pointer';
  _envTapFn = function () { _onEnvTap(); };
  card.addEventListener('click', _envTapFn, { once: true });

  card.style.transition = 'transform 400ms cubic-bezier(0.34,1.56,0.64,1), opacity 250ms ease';
  card.style.transform  = 'translateY(0) scale(1)';
  card.style.opacity    = '1';

  setTimeout(_phaseLanded, 400);
}

// ── Phase 2: Landed ───────────────────────────────────────────────────────────

function _phaseLanded() {
  // If the child tapped during slide-in, _onEnvTap already fired — bail out.
  if (_tapped) return;

  // Reveal X button
  var xBtn = document.getElementById('envXBtn');
  if (xBtn) {
    xBtn.style.transition  = 'opacity 200ms ease';
    xBtn.style.opacity     = '1';
    xBtn.style.pointerEvents = 'auto';
  }

  // Tap listener is already on the card from _phaseSlideIn — no need to re-add.

  // Staggered content fade-ins after settle
  // 200ms: From line + body (To/subtitle)
  setTimeout(function () {
    if (_tapped) return;
    var fromEl = document.getElementById('envFrom');
    var bodyEl = document.querySelector('.env-body');
    if (fromEl) fromEl.classList.add('vis');
    if (bodyEl) bodyEl.classList.add('vis');
  }, 200);
  // 350ms: flag + postmark
  setTimeout(function () {
    if (_tapped) return;
    var trEl = document.querySelector('.env-tr');
    if (trEl) trEl.classList.add('vis');
  }, 350);
  // 500ms: greeting, teaser, seal
  setTimeout(function () {
    if (_tapped) return;
    var greetEl  = document.getElementById('envGreet');
    var teaserEl = document.getElementById('envTeaser');
    var sealEl   = document.getElementById('envSeal');
    if (greetEl)  greetEl.classList.add('vis');
    if (teaserEl) teaserEl.classList.add('vis');
    if (sealEl && _rarity !== 'common') sealEl.classList.add('vis');
  }, 500);

  // Rarity ring pops after 500ms pause
  setTimeout(function() { if (!_tapped) _phaseRarityPop(); }, 500);

  // After stagger completes, add gentle idle pulse — visual affordance to tap
  setTimeout(function () {
    if (_tapped) return;
    var card = document.getElementById('envCard');
    if (card) card.classList.add('env-card--pulse');
  }, 600);

  // ── Delayed tap hint — if child hasn't tapped after 4s, fade in hint ─────
  _hintTimer = setTimeout(function () {
    if (_tapped) return;
    var hint = document.getElementById('envTapHint');
    if (hint) hint.style.opacity = '1';
  }, 4000);

  // ── No auto-advance timer — child decides when to open (child-paced) ──────
}

// ── Envelope tap handler (early or late) ─────────────────────────────────────

function _onEnvTap() {
  if (_tapped) return; // guard against double-fire
  _tapped = true;
  _envTapFn = null;
  _cancelAuto();
  _cancelHint();

  // Fast-forward all stagger elements to their final visible state
  _fastForward();

  // Stop the idle pulse
  var card = document.getElementById('envCard');
  if (card) card.classList.remove('env-card--pulse');

  // Animate flap lifting before the card fades
  _liftFlap();

  // Swap to postcard after flap animation (300ms) + small buffer
  setTimeout(_phaseSwap, 350);
}

// Immediately reveal all stagger elements (for impatient-tap fast-forward)
function _fastForward() {
  var fromEl   = document.getElementById('envFrom');
  var bodyEl   = document.querySelector('.env-body');
  var trEl     = document.querySelector('.env-tr');
  var greetEl  = document.getElementById('envGreet');
  var teaserEl = document.getElementById('envTeaser');
  var sealEl   = document.getElementById('envSeal');
  if (fromEl)   fromEl.classList.add('vis');
  if (bodyEl)   bodyEl.classList.add('vis');
  if (trEl)     trEl.classList.add('vis');
  if (greetEl)  greetEl.classList.add('vis');
  if (teaserEl) teaserEl.classList.add('vis');
  if (sealEl && _rarity !== 'common') sealEl.classList.add('vis');
  // Pop rarity ring immediately
  _phaseRarityPop();
}

// Lift the envelope flap (clip-path collapses to flat line)
function _liftFlap() {
  var flap = document.querySelector('.env-flap');
  if (flap) flap.classList.add('env-flap--lift');
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

// ── Country stamp + collection toast after card close (first-visit only) ─────

function _watchForCardClose(iso) {
  var cOv = document.getElementById('cOv');
  if (!cOv || !iso) return;

  var D = _ctx.getD ? _ctx.getD() : {};
  var countryName = (D[iso] && D[iso].n) ? D[iso].n : iso;

  var obs = new MutationObserver(function () {
    if (!cOv.classList.contains('on')) {
      obs.disconnect();
      _stampCountry(iso);
      _showCollectionToast(countryName);
    }
  });
  obs.observe(cOv, { attributes: true, attributeFilter: ['class'] });
}

function _showCollectionToast(countryName) {
  var toast = document.createElement('div');
  toast.className   = 'env-collection-toast';
  toast.textContent = countryName + ' added to your collection!';
  document.body.appendChild(toast);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      toast.classList.add('env-collection-toast--in');
    });
  });

  // Visible for 2500ms, then fade out
  setTimeout(function () {
    toast.classList.remove('env-collection-toast--in');
    setTimeout(function () { toast.remove(); }, 300);
  }, 2500);
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

function _cancelHint() {
  if (_hintTimer) { clearTimeout(_hintTimer); _hintTimer = null; }
  var hint = document.getElementById('envTapHint');
  if (hint) hint.style.opacity = '0';
}

function _cancelEnvTap() {
  var card = document.getElementById('envCard');
  if (card && _envTapFn) {
    card.removeEventListener('click', _envTapFn);
    _envTapFn = null;
  }
}
