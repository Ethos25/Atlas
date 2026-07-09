/**
 * src/js/features/mystery.js
 * Weekly Mystery Country — Feature 4.
 *
 * Call initMystery(ctx) in _boot() after data loads.
 *
 * ctx shape:
 *   getMYSTERIES()    → mysteries array from mysteries.json
 *   getPlayerName()   → string
 *   milestoneSound()  → void
 *   fireConfetti(ms)  → void
 *   showMilestone(ms) → void  (optional — falls back to #msOv)
 *   chm()             → void  (charm sound)
 */

import { loadMysteryData, saveMysteryData } from '../state.js';

// ── Module state ──────────────────────────────────────────────────────────────
let _ctx = null;
let _mysteries = [];
let _thisWeekMystery = null;
let _mysteryData = { solved: [], badges: [] };
let _markerEl = null;

export function initMystery(ctx) {
  _ctx = ctx;
  _mysteries = ctx.getMYSTERIES() || [];
  _reload();
  _buildMysteryModal();
  // Place marker after map has had time to render
  setTimeout(_placeMysteryMarker, 2400);
}

/** Reload per-player state — call after player switch. */
export function reloadMystery() {
  if (!_ctx) return;
  _reload();
  _removeMarker();
  if (!isMysterysolvedThisWeek()) {
    setTimeout(_placeMysteryMarker, 400);
  }
}

/** Re-position marker (call on window resize). */
export function repositionMysteryMarker() {
  _removeMarker();
  if (!isMysterysolvedThisWeek()) {
    _placeMysteryMarker();
  }
}

function _reload() {
  const name = _ctx.getPlayerName();
  _mysteryData = loadMysteryData(name);
  _thisWeekMystery = _pickThisWeekMystery();
}

// ── Week selection ─────────────────────────────────────────────────────────────

function _weekOfYear() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
  return Math.floor(dayOfYear / 7);
}

function _weekKey() {
  const now  = new Date();
  const week = _weekOfYear();
  return now.getFullYear() + '-W' + String(week).padStart(2, '0');
}

function _pickThisWeekMystery() {
  if (!_mysteries.length) return null;
  const idx = _weekOfYear() % _mysteries.length;
  return _mysteries[idx];
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getMysteryCountry() {
  return _thisWeekMystery ? _thisWeekMystery.answer : null;
}

export function isMysterysolvedThisWeek() {
  const key = _weekKey();
  return (_mysteryData.solved || []).includes(key);
}

export function getMysteryBadges() {
  return _mysteryData.badges || [];
}

/**
 * Check if a discovered ISO matches this week's mystery country.
 * Returns true if the mystery was just solved.
 * @param {string} iso
 */
export function checkMysteryMatch(iso) {
  if (!_thisWeekMystery || isMysterysolvedThisWeek()) return false;
  if (iso === _thisWeekMystery.answer) {
    _solveMystery();
    return true;
  }
  return false;
}

export function showMysteryRiddle() {
  const modal = document.getElementById('mysteryModal');
  if (!modal || !_thisWeekMystery) return;
  _renderModal();
  modal.classList.add('mystery-modal--visible');
}

export function closeMysteryModal() {
  const modal = document.getElementById('mysteryModal');
  if (modal) modal.classList.remove('mystery-modal--visible');
}

/** Called from swipe.js / index.html after postcard closes. */
export function flushMysteryBadge() {
  if (!window._pendingMysteryBadge) return;
  const d = window._pendingMysteryBadge;
  window._pendingMysteryBadge = null;

  const ms = {
    emoji:    '🔍',
    title:    'Mystery Solved!',
    sub:      d.badge || 'You found the mystery country!',
    confetti: true,
  };

  if (_ctx && _ctx.showMilestone) {
    _ctx.showMilestone(ms);
  } else {
    // Fallback: use existing #msOv overlay elements
    const emojiEl = document.getElementById('msEmoji');
    const titleEl = document.getElementById('msTitle');
    const subEl   = document.getElementById('msSub');
    const msOv    = document.getElementById('msOv');
    if (!msOv) return;
    if (emojiEl) emojiEl.textContent = ms.emoji;
    if (titleEl) titleEl.textContent = ms.title;
    if (subEl)   subEl.textContent   = ms.sub;
    msOv.classList.add('on');
    if (_ctx && _ctx.milestoneSound) _ctx.milestoneSound();
    if (_ctx && _ctx.fireConfetti)   _ctx.fireConfetti(3500);
  }
}

// ── Internal: solve ────────────────────────────────────────────────────────────

function _solveMystery() {
  if (!_thisWeekMystery) return;

  const key   = _weekKey();
  const badge = _thisWeekMystery.badge;

  _mysteryData.solved = _mysteryData.solved || [];
  _mysteryData.badges = _mysteryData.badges || [];

  if (!_mysteryData.solved.includes(key)) {
    _mysteryData.solved.push(key);
  }
  if (badge && !_mysteryData.badges.includes(badge)) {
    _mysteryData.badges.push(badge);
  }

  saveMysteryData(_ctx.getPlayerName(), _mysteryData);

  // Remove marker from map immediately
  _removeMarker();

  // Defer celebration until after the postcard closes
  window._pendingMysteryBadge = {
    badge:   badge,
    mystery: _thisWeekMystery,
  };
}

// ── Marker ─────────────────────────────────────────────────────────────────────

function _placeMysteryMarker() {
  if (!_thisWeekMystery || isMysterysolvedThisWeek()) return;

  // Remove any stale marker first
  const stale = document.getElementById('mysteryMarker');
  if (stale) stale.remove();

  const iso = _thisWeekMystery.answer;
  const el  = document.querySelector('.country[data-a="' + iso + '"]');
  if (!el) return;

  const bbox = el.getBoundingClientRect();
  if (bbox.width < 1 && bbox.height < 1) return; // country not visible on map

  const cx = bbox.left + bbox.width  / 2;
  const cy = bbox.top  + bbox.height / 2;

  const marker = document.createElement('div');
  marker.id          = 'mysteryMarker';
  marker.className   = 'mystery-marker';
  marker.textContent = '?';
  marker.style.left  = cx + 'px';
  marker.style.top   = cy + 'px';
  marker.setAttribute('role', 'button');
  marker.setAttribute('tabindex', '0');
  marker.setAttribute('title', 'Mystery Country — tap for a riddle!');

  marker.addEventListener('click', showMysteryRiddle);
  marker.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') showMysteryRiddle();
  });

  document.body.appendChild(marker);
  _markerEl = marker;

  // Animate in
  setTimeout(function () { marker.classList.add('mystery-marker--visible'); }, 60);
}

function _removeMarker() {
  if (_markerEl) {
    _markerEl.classList.remove('mystery-marker--visible');
    const m = _markerEl;
    setTimeout(function () { if (m && m.parentNode) m.remove(); }, 400);
    _markerEl = null;
  }
  const stale = document.getElementById('mysteryMarker');
  if (stale && stale !== _markerEl) stale.remove();
}

// ── Modal ──────────────────────────────────────────────────────────────────────

function _buildMysteryModal() {
  const old = document.getElementById('mysteryModal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id        = 'mysteryModal';
  modal.className = 'mystery-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');

  // Tap backdrop to close
  modal.addEventListener('click', function (e) {
    if (e.target === modal) closeMysteryModal();
  });

  document.body.appendChild(modal);

  if (_thisWeekMystery) _renderModal();
}

function _renderModal() {
  const modal = document.getElementById('mysteryModal');
  if (!modal || !_thisWeekMystery) return;

  if (isMysterysolvedThisWeek()) {
    modal.innerHTML = _solvedHTML();
  } else {
    modal.innerHTML = _riddleHTML();
  }

  // Wire buttons
  const closeBtn = modal.querySelector('.mys-close');
  if (closeBtn) closeBtn.addEventListener('click', closeMysteryModal);

  const hintBtn = modal.querySelector('.mys-hint-btn');
  const hintEl  = modal.querySelector('.mys-hint-text');
  if (hintBtn && hintEl) {
    hintBtn.addEventListener('click', function () {
      const showing = hintEl.classList.toggle('mys-hint-text--show');
      hintBtn.textContent = showing ? 'Hide hint' : 'Show hint 💡';
    });
  }
}

function _riddleHTML() {
  const m = _thisWeekMystery;
  return (
    '<div class="mystery-box">' +
      '<div class="mys-header">' +
        '<span class="mys-compass">🧭</span>' +
        '<div>' +
          '<div class="mys-eyebrow">WEEKLY MYSTERY</div>' +
          '<div class="mys-title">Mystery Country</div>' +
        '</div>' +
      '</div>' +
      '<p class="mys-riddle">' + _escHtml(m.riddle) + '</p>' +
      '<button class="mys-hint-btn">Show hint 💡</button>' +
      '<div class="mys-hint-text">' + _escHtml(m.hint) + '</div>' +
      '<p class="mys-instruction">Find this country on the map to solve it!</p>' +
      '<button class="mys-close">✕ Close</button>' +
    '</div>'
  );
}

function _solvedHTML() {
  return (
    '<div class="mystery-box mystery-box--solved">' +
      '<div class="mys-solved-icon">🔍</div>' +
      '<div class="mys-title">Mystery Solved!</div>' +
      '<p class="mys-instruction">Come back next week for a new Mystery Country!</p>' +
      '<div class="mys-badges-count">' +
        getMysteryBadges().length + ' badge' +
        (getMysteryBadges().length !== 1 ? 's' : '') + ' collected' +
      '</div>' +
      '<button class="mys-close">Close</button>' +
    '</div>'
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
