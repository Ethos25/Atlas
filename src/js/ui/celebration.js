/**
 * src/js/ui/celebration.js
 * Set completion celebrations — triggered by arrival.js after the envelope toast.
 *
 * Tier resolution (priority order):
 *   terminal  — total_collected >= 197  (all countries)
 *   continent — setDef.category === 'continent'
 *   epic      — setDef.size_class === 'epic'
 *   core      — setDef.size_class === 'core'
 *   starter   — everything else (size_class === 'starter')
 *
 * Toast tier (starter/core/epic):
 *   confetti burst + bottom toast card + auto-dismiss.
 * Full-screen tier (continent/terminal):
 *   backdrop overlay + centered confetti + large typography + tap-to-dismiss.
 *
 * Call initCelebration(ctx) in _boot().
 * Call triggerSetCelebration(setId, setDef) to fire.
 */

import { getTotalCollected } from '../features/collection.js';

let _ctx = null;

const TERMINAL_COUNT = 197;

// Confetti colour palette (gold + vivid accents)
const CEL_COLORS = ['#FAC775', '#F87A7A', '#78BFEF', '#7EDA96', '#C58EF5', '#F5B8E5', '#FFE066'];

// Auto-dismiss hold times (ms) — terminal auto-fades at 7 s even though user can tap earlier
const HOLD_MS = {
  starter:   2800,
  core:      3200,
  epic:      3800,
  continent: 5000,
  terminal:  7000,
};

// Confetti counts per tier
const PIECE_COUNT = {
  starter:   15,
  core:      20,
  epic:      25,
  continent: 28,
  terminal:  35,
};

// Base confetti animation duration (ms); each piece also gets ±200 ms jitter
const BURST_DUR = {
  starter:   1500,
  core:      1600,
  epic:      2000,
  continent: 3000,
  terminal:  4500,
};

// ── Init ──────────────────────────────────────────────────────────────────────

export function initCelebration(ctx) {
  _ctx = ctx;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Fire the appropriate tier celebration for a just-completed set.
 * @param {string} setId
 * @param {object} setDef  — full set definition from SETS map
 */
export function triggerSetCelebration(setId, setDef) {
  if (!setDef) return;
  const total = getTotalCollected();
  const tier  = _resolveTier(setDef, total);

  if (tier === 'terminal' || tier === 'continent') {
    _showFullScreen(tier, setDef);
  } else {
    _showToastCelebration(tier, setDef);
  }
}

// ── Tier resolution ───────────────────────────────────────────────────────────

function _resolveTier(setDef, total) {
  if (total >= TERMINAL_COUNT)         return 'terminal';
  if (setDef.category === 'continent') return 'continent';
  if (setDef.size_class === 'epic')    return 'epic';
  if (setDef.size_class === 'core')    return 'core';
  return 'starter';
}

// ── Toast celebration (starter / core / epic) ─────────────────────────────────

function _showToastCelebration(tier, setDef) {
  const holdMs  = HOLD_MS[tier]    || 3000;
  const count   = PIECE_COUNT[tier] || 15;
  const dur     = BURST_DUR[tier]   || 1500;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Confetti — fixed container centred in viewport
  if (!reduced) {
    const confWrap = document.createElement('div');
    confWrap.className = 'cel-confetti-wrap';
    document.body.appendChild(confWrap);
    _spawnConfetti(confWrap, count, dur);
    // Remove container after all pieces have fully animated out
    setTimeout(function () {
      if (confWrap.parentNode) confWrap.parentNode.removeChild(confWrap);
    }, dur + 600);
  }

  // Toast card
  const toast = document.createElement('div');
  toast.className = 'cel-toast cel-toast--' + tier;

  const iconEl = document.createElement('div');
  iconEl.className   = 'cel-toast-icon';
  iconEl.innerHTML = setDef.icon || '<img src="/assets/ui-party-sm.png" alt="party" style="width:28px;height:28px;vertical-align:middle">';
  const toastImg = iconEl.querySelector('img');
  if (toastImg) { toastImg.src = toastImg.src.replace(/-(?:xs|sm|md|lg)\.png$/, '-sm.png'); toastImg.style.width = '28px'; toastImg.style.height = '28px'; }
  toast.appendChild(iconEl);

  const body = document.createElement('div');
  body.className = 'cel-toast-body';

  const titleEl = document.createElement('div');
  titleEl.className   = 'cel-toast-title';
  titleEl.textContent = 'Set complete: ' + setDef.name + '!';
  body.appendChild(titleEl);

  // Core + epic: show reward title with a gold shimmer line
  if ((tier === 'core' || tier === 'epic') && setDef.reward && setDef.reward.title) {
    const rewardEl = document.createElement('div');
    rewardEl.className   = 'cel-toast-reward';
    rewardEl.textContent = 'Reward: ' + setDef.reward.title;
    body.appendChild(rewardEl);
  }

  // Epic only: "Journey unlocked!" line
  if (tier === 'epic') {
    const journeyEl = document.createElement('div');
    journeyEl.className   = 'cel-toast-journey';
    journeyEl.textContent = 'Journey unlocked!';
    body.appendChild(journeyEl);
  }

  toast.appendChild(body);
  document.body.appendChild(toast);

  // Tap to dismiss
  function dismiss() {
    _fadeRemove(toast, 250);
  }
  toast.addEventListener('click', dismiss, { once: true });

  // Animate in (double-rAF so the opacity-0 starting state has painted)
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      toast.classList.add('cel-toast--in');
    });
  });

  // Auto-dismiss
  setTimeout(function () {
    toast.removeEventListener('click', dismiss);
    _fadeRemove(toast, 350);
  }, holdMs);
}

// ── Full-screen celebration (continent / terminal) ────────────────────────────

function _showFullScreen(tier, setDef) {
  const holdMs  = HOLD_MS[tier]     || 5000;
  const count   = PIECE_COUNT[tier]  || 25;
  const dur     = BURST_DUR[tier]    || 3000;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Overlay
  const ov = document.createElement('div');
  ov.className = 'cel-ov cel-ov--' + tier;
  document.body.appendChild(ov);

  // Confetti inside overlay (not full z-index stack — contained)
  if (!reduced) {
    const confWrap = document.createElement('div');
    confWrap.className = 'cel-ov-confetti';
    ov.appendChild(confWrap);
    _spawnConfetti(confWrap, count, dur);
    setTimeout(function () {
      if (confWrap.parentNode) confWrap.parentNode.removeChild(confWrap);
    }, dur + 600);
  }

  // Scene
  const scene = document.createElement('div');
  scene.className = 'cel-ov-scene';

  if (tier === 'terminal') {
    const badge = document.createElement('div');
    badge.className = 'cel-ov-badge cel-ov-badge--terminal';
    const badgeImg = document.createElement('img');
    badgeImg.src   = '/assets/ui-globe-lg.png';
    badgeImg.alt   = 'globe';
    badgeImg.style.cssText = 'width:120px;height:120px';
    badge.appendChild(badgeImg);
    scene.appendChild(badge);

    const title = document.createElement('div');
    title.className   = 'cel-ov-title cel-ov-title--gold';
    title.textContent = 'World Explorer';
    scene.appendChild(title);

    const sub = document.createElement('div');
    sub.className   = 'cel-ov-sub';
    sub.textContent = 'All ' + TERMINAL_COUNT + ' postcards collected!';
    scene.appendChild(sub);

  } else {
    // continent tier
    const badge = document.createElement('div');
    badge.className   = 'cel-ov-badge';
    badge.innerHTML = setDef.icon || '<img src="/assets/ui-globe-lg.png" alt="globe" style="width:72px;height:72px;vertical-align:middle">';
    const badgeImgEl = badge.querySelector('img');
    if (badgeImgEl) { badgeImgEl.src = badgeImgEl.src.replace(/-(?:xs|sm|md|lg)\.png$/, '-lg.png'); badgeImgEl.style.width = '72px'; badgeImgEl.style.height = '72px'; }
    scene.appendChild(badge);

    const title = document.createElement('div');
    title.className   = 'cel-ov-title';
    title.textContent = setDef.name;
    scene.appendChild(title);

    const sub = document.createElement('div');
    sub.className   = 'cel-ov-sub';
    sub.textContent = 'Continent complete! ✦';
    scene.appendChild(sub);

    if (setDef.reward && setDef.reward.title) {
      const rewardEl = document.createElement('div');
      rewardEl.className   = 'cel-ov-reward';
      rewardEl.textContent = 'Reward: ' + setDef.reward.title;
      scene.appendChild(rewardEl);
    }
  }

  ov.appendChild(scene);

  // "Tap anywhere" hint
  const hint = document.createElement('div');
  hint.className   = 'cel-ov-hint';
  hint.textContent = 'Tap anywhere to continue';
  ov.appendChild(hint);

  // Tap to dismiss
  function dismiss() {
    _fadeRemove(ov, 450);
  }
  ov.addEventListener('click', dismiss, { once: true });

  // Animate in
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      ov.classList.add('cel-ov--in');
    });
  });

  // Auto-dismiss
  setTimeout(function () {
    ov.removeEventListener('click', dismiss);
    _fadeRemove(ov, 500);
  }, holdMs);
}

// ── Confetti spawner ──────────────────────────────────────────────────────────

function _spawnConfetti(container, count, durationMs) {
  for (var i = 0; i < count; i++) {
    var piece    = document.createElement('div');
    var isRound  = Math.random() > 0.55;
    piece.className = 'cel-piece' + (isRound ? ' cel-piece--round' : '');

    // Random polar trajectory with upward bias
    var angle  = Math.random() * Math.PI * 2;
    var dist   = 70 + Math.random() * 190;         // 70–260 px
    var tx     = Math.cos(angle) * dist;
    var ty     = Math.sin(angle) * dist - 90;      // −90 px bias = launches upward
    var rot    = (Math.random() - 0.5) * 720;      // ±360°
    var color  = CEL_COLORS[Math.floor(Math.random() * CEL_COLORS.length)];
    var delay  = Math.floor(Math.random() * 320);  // 0–320 ms stagger
    var dur    = durationMs + Math.floor((Math.random() - 0.5) * 400); // ±200 ms jitter

    piece.style.setProperty('--cel-tx',    tx    + 'px');
    piece.style.setProperty('--cel-ty',    ty    + 'px');
    piece.style.setProperty('--cel-rot',   rot   + 'deg');
    piece.style.setProperty('--cel-c',     color);
    piece.style.setProperty('--cel-dur',   dur   + 'ms');
    piece.style.setProperty('--cel-delay', delay + 'ms');

    container.appendChild(piece);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _fadeRemove(el, durationMs) {
  if (!el || !el.parentNode) return;
  el.style.transition = 'opacity ' + durationMs + 'ms ease';
  el.style.opacity    = '0';
  setTimeout(function () {
    if (el.parentNode) el.parentNode.removeChild(el);
  }, durationMs + 16);
}
