/**
 * src/js/features/journey-breadcrumb.js
 * Journey auto-progression: breadcrumb marker (1B), resume toast (1C),
 * journey-complete celebration (1D), and state persistence helpers (1A).
 *
 * ctx shape:
 *   getJOURNEYS()      → JOURNEYS array
 *   getPlayerName()    → string
 *   getVisited()       → Set<string>
 *   showCard(iso)      → void
 *   chm()              → void
 */

import { loadJourneyState, saveJourneyState } from '../state.js';
import { milestoneSound }                     from '../ui/sounds.js';
import { fireConfetti }                        from '../ui/effects.js';

let _ctx      = null;
let _markerEl = null;
let _toastEl  = null;

export function initJourneyBreadcrumb(ctx) {
  _ctx = ctx;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Re-evaluate and place/remove the breadcrumb based on current player state.
 * Call after: player switch, journey start/advance/complete, and on app load.
 */
export function updateJourneyBreadcrumb() {
  if (!_ctx) return;
  const state = loadJourneyState(_ctx.getPlayerName());
  if (!state) { _removeBreadcrumb(); return; }

  const journey = _findJourney(state.journeyId);
  if (!journey) { _removeBreadcrumb(); return; }

  const nextIdx = _nextUnvisited(journey, state.currentIndex);
  if (nextIdx === -1) {
    // All countries in this journey have been visited — clean up
    saveJourneyState(_ctx.getPlayerName(), null);
    _removeBreadcrumb();
    return;
  }

  _placeBreadcrumb(journey, nextIdx);
}

/**
 * Persist the current journey progress.
 * @param {string} journeyName  The journey's .name field
 * @param {number} currentIndex The current position index (next to visit)
 */
export function persistJourneyState(journeyName, currentIndex) {
  if (!_ctx) return;
  saveJourneyState(_ctx.getPlayerName(), {
    journeyId:    journeyName,
    currentIndex,
    startedAt:    new Date().toISOString().slice(0, 10),
  });
}

/** Clear the persisted journey state (on completion or explicit abandon). */
export function clearJourneyState() {
  if (!_ctx) return;
  saveJourneyState(_ctx.getPlayerName(), null);
  _removeBreadcrumb();
}

/**
 * Show the journey resume toast if the player has a journey in progress.
 * Called 2 s after the map renders.
 */
export function showJourneyResumeToast() {
  if (!_ctx) return;
  const state = loadJourneyState(_ctx.getPlayerName());
  if (!state) return;

  const journey = _findJourney(state.journeyId);
  if (!journey) return;

  const nextIdx = _nextUnvisited(journey, state.currentIndex);
  if (nextIdx === -1) { saveJourneyState(_ctx.getPlayerName(), null); return; }

  const visited = _ctx.getVisited();
  const found   = journey.countries.filter(iso => visited.has(iso)).length;
  const total   = journey.countries.length;
  const nextISO = journey.countries[nextIdx];

  if (_toastEl) _toastEl.remove();

  const toast = document.createElement('div');
  toast.id = 'journeyResumeToast';
  toast.style.cssText =
    'position:fixed;bottom:64px;left:50%;' +
    'transform:translateX(-50%) translateY(20px);' +
    'z-index:30;background:#1A2440;' +
    'border:1px solid rgba(255,255,255,0.08);' +
    'border-radius:var(--r-md);max-width:320px;' +
    'width:calc(100% - 32px);padding:12px 16px;' +
    'display:flex;align-items:center;gap:10px;' +
    'cursor:pointer;opacity:0;' +
    'transition:opacity 0.4s,transform 0.4s cubic-bezier(.22,.68,0,1.04);' +
    'box-shadow:0 4px 20px rgba(0,0,0,0.4);pointer-events:all';

  toast.innerHTML =
    '<span style="font-size:20px">' + (journey.emoji || '🗺️') + '</span>' +
    '<div style="flex:1;min-width:0">' +
      '<div style="font-family:\'DM Serif Display\',Georgia,serif;font-size:13px;' +
        'color:#F0F2F8;line-height:1.2;margin-bottom:2px">' +
        'Continue ' + _esc(journey.name) + '?</div>' +
      '<div style="font-family:Inter,system-ui,sans-serif;font-size:10px;' +
        'color:#C8CDDA;line-height:1.4">' + found + ' of ' + total + ' countries found</div>' +
    '</div>' +
    '<span style="font-family:Inter,system-ui,sans-serif;font-size:11px;' +
      'font-weight:700;color:#D4884A;white-space:nowrap;flex-shrink:0">' +
      'Tap to resume →</span>';

  toast.addEventListener('click', function () {
    _dismissResumeToast();
    if (nextISO) _ctx.showCard(nextISO);
  });

  document.body.appendChild(toast);
  _toastEl = toast;

  setTimeout(function () {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  }, 60);

  // Auto-dismiss after 8 s
  setTimeout(_dismissResumeToast, 8000);
}

/** Re-position the breadcrumb marker after a resize or zoom event. */
export function repositionBreadcrumb() {
  if (!_markerEl || !_ctx) return;
  const state = loadJourneyState(_ctx.getPlayerName());
  if (!state) { _removeBreadcrumb(); return; }

  const journey = _findJourney(state.journeyId);
  if (!journey) { _removeBreadcrumb(); return; }

  const nextIdx = _nextUnvisited(journey, state.currentIndex);
  if (nextIdx === -1) { _removeBreadcrumb(); return; }

  const iso  = journey.countries[nextIdx];
  const el   = document.querySelector('.country[data-a="' + iso + '"]');
  if (!el)   return;
  const bbox = el.getBoundingClientRect();
  _markerEl.style.left = (bbox.left + bbox.width  / 2) + 'px';
  _markerEl.style.top  = (bbox.top  + bbox.height / 2) + 'px';
}

/**
 * Flush the deferred journey-complete celebration.
 * Called from swipe.js cl() when window._pendingJourneyComplete is set.
 */
export function flushJourneyComplete() {
  if (!window._pendingJourneyComplete) return;
  const d = window._pendingJourneyComplete;
  window._pendingJourneyComplete = null;

  // Clear persistence and breadcrumb
  clearJourneyState();

  setTimeout(function () {
    const compassSrc = '/assets/ui-compass-md.png';
    const emojiEl = document.getElementById('msEmoji');
    const titleEl = document.getElementById('msTitle');
    const subEl   = document.getElementById('msSub');
    const msOv    = document.getElementById('msOv');
    if (!msOv) return;

    if (emojiEl) emojiEl.innerHTML =
      '<img src="' + compassSrc + '" alt="compass" ' +
      'style="width:48px;height:48px;vertical-align:middle">';
    if (titleEl) titleEl.textContent = 'Journey Complete!';
    if (subEl)   subEl.textContent   = 'You traveled the ' + (d.journeyName || 'journey') + '!';

    msOv.classList.add('on');
    milestoneSound();
    fireConfetti(3500);
  }, 400);
}

// ── Internals ─────────────────────────────────────────────────────────────────

function _findJourney(name) {
  const journeys = _ctx.getJOURNEYS();
  return journeys ? journeys.find(function (j) { return j.name === name; }) : null;
}

/**
 * Returns the index of the first unvisited country at or after startIdx,
 * or -1 if all remaining have been visited.
 */
function _nextUnvisited(journey, startIdx) {
  const visited = _ctx.getVisited();
  for (let i = startIdx; i < journey.countries.length; i++) {
    if (!visited.has(journey.countries[i])) return i;
  }
  return -1;
}

function _placeBreadcrumb(journey, nextIdx) {
  _removeBreadcrumb();
  const iso  = journey.countries[nextIdx];
  const el   = document.querySelector('.country[data-a="' + iso + '"]');
  if (!el) return;

  const bbox = el.getBoundingClientRect();
  if (bbox.width < 1 && bbox.height < 1) return;

  const marker = document.createElement('div');
  marker.id        = 'journeyBreadcrumb';
  marker.className = 'journey-breadcrumb';
  marker.textContent = '›';
  marker.style.left  = (bbox.left + bbox.width  / 2) + 'px';
  marker.style.top   = (bbox.top  + bbox.height / 2) + 'px';
  marker.setAttribute('role', 'button');
  marker.setAttribute('tabindex', '0');
  marker.setAttribute('title', 'Next stop on ' + journey.name + '!');

  marker.addEventListener('click', function (e) {
    e.stopPropagation();
    // Brief tooltip then open postcard
    const tipEl = document.getElementById('tip');
    if (tipEl) {
      tipEl.textContent = 'Next stop on ' + journey.name + '!';
      tipEl.className   = 'tip tip--show';
      setTimeout(function () { tipEl.className = 'tip'; }, 2200);
    }
    setTimeout(function () { _ctx.showCard(iso); }, 280);
  });

  marker.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') marker.dispatchEvent(new MouseEvent('click'));
  });

  document.body.appendChild(marker);
  _markerEl = marker;
  setTimeout(function () { marker.classList.add('journey-breadcrumb--visible'); }, 60);
}

function _removeBreadcrumb() {
  if (_markerEl) {
    _markerEl.classList.remove('journey-breadcrumb--visible');
    const m = _markerEl;
    setTimeout(function () { if (m && m.parentNode) m.remove(); }, 400);
    _markerEl = null;
  }
  const stale = document.getElementById('journeyBreadcrumb');
  if (stale) stale.remove();
}

function _dismissResumeToast() {
  if (!_toastEl) return;
  const t = _toastEl;
  _toastEl = null;
  t.style.opacity   = '0';
  t.style.transform = 'translateX(-50%) translateY(20px)';
  setTimeout(function () { if (t.parentNode) t.remove(); }, 400);
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
