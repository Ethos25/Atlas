/**
 * src/js/cards/swipe.js
 * Swipe between postcards, back navigation, card close (cl).
 *
 * Call initSwipe(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getCONT_MAP()      → CONT_MAP object
 *   getD()             → D object
 *   getCurV()          → current ISO | null
 *   setCurV(v)         → void
 *   getCardHistory()   → array
 *   setCardHistory(v)  → void
 *   getCardHistoryNav() → bool
 *   setCardHistoryNav(v) → void
 *   pulseNearby(iso)   → void
 *   showCard(iso)      → void   (the wrapper in index.html)
 *   switchTab(tab, silent) → void
 *   checkRecallQuiz()  → void   (fires quiz if due, after card is dismissed)
 */

import { checkMilestone, checkContinentComplete } from '../features/achievements.js';
import { flushMissionToast }                      from '../features/missions.js';
import { flushMysteryBadge }                      from '../features/mystery.js';
import { flushJourneyComplete }                   from '../features/journey-breadcrumb.js';

let _ctx;

export function initSwipe(ctx) {
  _ctx = ctx;
}

export function getAdjacentCountries(iso) {
  const CONT_MAP = _ctx.getCONT_MAP();
  const D        = _ctx.getD();
  const cont     = CONT_MAP[iso];
  if (!cont) return { prev: null, next: null };
  const sameContinent = Object.keys(D).filter(k => CONT_MAP[k] === cont).sort();
  const idx = sameContinent.indexOf(iso);
  return {
    prev: idx > 0                        ? sameContinent[idx - 1] : null,
    next: idx < sameContinent.length - 1 ? sameContinent[idx + 1] : null,
  };
}

export function swipeCard(dir) {
  const curV = _ctx.getCurV();
  if (!curV) return;
  const adj    = getAdjacentCountries(curV);
  const target = dir < 0 ? adj.prev : adj.next;
  if (!target || !_ctx.getD()[target]) return;

  const pc = document.querySelector('.postcard');
  pc.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
  pc.style.transform  = 'translateX(' + (dir * -60) + 'px)';
  pc.style.opacity    = '0.5';

  setTimeout(() => {
    _ctx.showCard(target);
    pc.style.transform = 'translateX(' + (dir * 60) + 'px)';
    pc.style.opacity   = '0.5';
    requestAnimationFrame(() => {
      pc.style.transition = 'transform 0.35s ease-out, opacity 0.35s ease-out';
      pc.style.transform  = 'translateX(0)';
      pc.style.opacity    = '1';
    });
  }, 200);
}

export function updateSwipeArrows() {
  const curV = _ctx.getCurV();
  if (!curV) {
    document.getElementById('swPrev').classList.add('hidden');
    document.getElementById('swNext').classList.add('hidden');
    return;
  }
  const adj = getAdjacentCountries(curV);
  document.getElementById('swPrev').classList.toggle('hidden', !adj.prev);
  document.getElementById('swNext').classList.toggle('hidden', !adj.next);
}

export function goBack() {
  const cardHistory = _ctx.getCardHistory();
  if (cardHistory.length === 0) return;
  var prev = cardHistory.pop();
  _ctx.setCardHistoryNav(true);
  _ctx.showCard(prev);
}

export function cl() {
  const curV = _ctx.getCurV();
  if (curV) setTimeout(() => _ctx.pulseNearby(curV), 300);
  document.getElementById('cOv').classList.remove('on');
  _ctx.setCurV(null);

  _ctx.setCardHistory([]);
  var bb = document.getElementById('cardBackBtn');
  if (bb) bb.style.display = 'none';

  const p = document.getElementById('l2P'), b = document.getElementById('lmB') || document.createElement('div');
  if (p) { p.classList.remove('op'); p.innerHTML = ''; }
  if (b) { b.classList.remove('op'); b.textContent = 'More ›'; }

  // Reset journey progress
  const jProg = document.getElementById('jProgress');
  if (jProg) { jProg.style.display = 'none'; jProg.innerHTML = ''; }

  // Clear connections
  const connSt2 = document.getElementById('connStage');
  if (connSt2) connSt2.innerHTML = '';
  var connNav4 = document.getElementById('connNav');
  if (connNav4) connNav4.style.display = 'none';
  window._connCards = [];

  // Clear Where Next
  var wn = document.getElementById('whereNext');
  if (wn) wn.style.display = 'none';
  var wnOpts = document.getElementById('wnOptions');
  if (wnOpts) wnOpts.innerHTML = '';

  // Clear Secret card
  var sc = document.getElementById('secretCard');
  if (sc) sc.style.display = 'none';
  var mt = document.getElementById('moreToggle');
  if (mt) { mt.style.display = 'none'; mt.classList.remove('open'); }

  // Reset tabs to Story
  _ctx.switchTab('story', true);

  // Restore fav button (hidden for ocean cards)
  var favBtn = document.getElementById('favBtn');
  if (favBtn) favBtn.style.display = '';

  // Fire recall quiz if due — after the card is dismissed so it never
  // interrupts the postcard or envelope animation.
  if (_ctx.checkRecallQuiz) _ctx.checkRecallQuiz();

  // Fire deferred milestone/continent checks — set during new-discovery flow
  // so they never interrupt the envelope or postcard animation.
  if (window._pendingMilestoneCheck) {
    window._pendingMilestoneCheck = false;
    setTimeout(function () {
      checkMilestone();
      checkContinentComplete();
    }, 400);
  }

  // Fire deferred mission toast (Feature 1) — after postcard closes.
  if (window._pendingMissionToast) {
    setTimeout(flushMissionToast, 500);
  }

  // Fire deferred mystery badge (Feature 4) — after postcard closes.
  if (window._pendingMysteryBadge) {
    setTimeout(flushMysteryBadge, 700);
  }

  // Fire deferred journey-complete celebration — after postcard closes.
  if (window._pendingJourneyComplete) {
    setTimeout(flushJourneyComplete, 500);
  }

  // Fire deferred new-continent toast — after postcard closes.
  if (window._pendingNewContinent) {
    const data = window._pendingNewContinent;
    window._pendingNewContinent = null;
    setTimeout(function () { _showNewContinentToast(data); }, 600);
  }
}

function _showNewContinentToast(data) {
  const existing = document.getElementById('newContToast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'newContToast';
  toast.className = 'new-cont-toast';
  toast.style.borderLeftColor = data.color || '#D4884A';
  toast.innerHTML =
    '<span style="font-size:20px">' + (data.emoji || '🌍') + '</span>' +
    '<div style="flex:1;min-width:0">' +
      '<div style="font-family:\'DM Serif Display\',Georgia,serif;font-size:14px;' +
        'color:#F0F2F8;line-height:1.2;margin-bottom:2px">New continent unlocked!</div>' +
      '<div style="font-family:Inter,system-ui,sans-serif;font-size:11px;' +
        'color:#C8CDDA;line-height:1.4">' + (data.name || '') + '</div>' +
    '</div>';

  document.body.appendChild(toast);

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      toast.classList.add('new-cont-toast--show');
    });
  });

  setTimeout(function () {
    toast.classList.remove('new-cont-toast--show');
    setTimeout(function () { if (toast.parentNode) toast.remove(); }, 500);
  }, 3000);
}
