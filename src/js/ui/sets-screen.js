/**
 * src/js/ui/sets-screen.js
 * "Sets" screen — full-screen overlay listing all postcard sets with progress,
 * flag previews, and completion rewards.
 *
 * Call initSetsScreen(ctx) in _boot() after data loads.
 * Exposes openSets() and closeSets() for HTML onclick handlers
 * via Object.assign(window, {…}).
 *
 * ctx shape:
 *   getD()              → { [iso]: { n, f, c, ... } }   — countries.json data
 *   getEffectiveSets()  → { [setId]: setDef }            — sets with my_family patched
 *   getSetsProgress()   → { [setId]: { collected, completed_at } }
 *   getOneAwaySets()    → [{ setId, setName, missing }]  — sets one country from completion
 *   showCard(iso)       → void   — opens the full postcard for a country
 */

import { getPostcard } from '../features/collection.js';

let _ctx = null;

// Category progress-bar colors (spec-exact)
const CATEGORY_COLORS = {
  geography: '#0F6E56',
  animal:    '#BA7517',
  personal:  '#D85A30',
  culture:   '#378ADD',
  discovery: '#534AB7',
};

// ── Init ─────────────────────────────────────────────────────────────────────

export function initSetsScreen(ctx) {
  _ctx = ctx;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Build the sets list from current state and show the overlay. */
export function openSets() {
  _buildSets();
  const ov = document.getElementById('setsOv');
  if (ov) ov.classList.add('on');
}

/** Hide the overlay. */
export function closeSets() {
  const ov = document.getElementById('setsOv');
  if (ov) ov.classList.remove('on');
}

// ── Build ─────────────────────────────────────────────────────────────────────

function _buildSets() {
  const D        = _ctx.getD();
  const SETS     = _ctx.getEffectiveSets();
  const progress = _ctx.getSetsProgress();

  // One-away set IDs for badge rendering
  const oneAwayList  = _ctx.getOneAwaySets ? _ctx.getOneAwaySets() : [];
  const oneAwayIds   = new Set(oneAwayList.map(function (s) { return s.setId; }));

  // ── Header ─────────────────────────────────────────────────
  const allSetIds     = Object.keys(SETS);
  const completedCount = allSetIds.filter(id => {
    const sp = progress[id];
    return sp && sp.completed_at !== null;
  }).length;

  const titleEl = document.getElementById('setsHeaderTitle');
  const countEl = document.getElementById('setsHeaderCount');
  if (titleEl) titleEl.textContent = 'Sets';
  if (countEl) countEl.textContent = completedCount + ' of ' + allSetIds.length + ' completed';

  // ── Build enriched entries ──────────────────────────────────
  const entries = Object.entries(SETS).map(([setId, setDef]) => {
    const countries     = setDef.countries || [];
    const sp            = progress[setId] || { collected: [], completed_at: null };
    const collectedCount = sp.collected.length;
    const total         = countries.length;
    const remaining     = total - collectedCount;
    const pct           = total > 0 ? collectedCount / total : 0;
    const isCompleted   = sp.completed_at !== null;
    return { setId, setDef, sp, countries, collectedCount, total, remaining, pct, isCompleted };
  }).filter(e => e.total > 0); // skip sets with no countries (empty my_family)

  // Sort: in-progress first (fewest remaining → most % done),
  //       completed sets last (sorted by completion date ascending)
  entries.sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
    if (a.isCompleted && b.isCompleted) {
      return (a.sp.completed_at || 0) - (b.sp.completed_at || 0);
    }
    if (a.remaining !== b.remaining) return a.remaining - b.remaining;
    return b.pct - a.pct;
  });

  // ── Render ─────────────────────────────────────────────────
  const body = document.getElementById('setsBody');
  if (!body) return;
  body.innerHTML = '';
  body.scrollTop = 0;

  if (entries.length === 0) {
    body.innerHTML = '<div class="sets-empty">No sets available yet.</div>';
    return;
  }

  entries.forEach(({ setId, setDef, sp, countries, collectedCount, total, pct, isCompleted }) => {
    const catColor  = CATEGORY_COLORS[setDef.category] || '#666';
    const pctVal    = (pct * 100).toFixed(1);
    const isOneAway = !isCompleted && oneAwayIds.has(setId);

    const card = document.createElement('div');
    card.className = 'sets-card' +
      (isCompleted ? ' sets-card--done' : '') +
      (isOneAway   ? ' sets-card--one-away' : '');

    // ── Top row: icon · name · fraction · badge/check ─────────
    const topRow = document.createElement('div');
    topRow.className = 'sets-card-top';
    topRow.innerHTML =
      '<span class="sets-card-icon">' + setDef.icon + '</span>' +
      '<span class="sets-card-name">' + setDef.name + '</span>' +
      '<span class="sets-card-frac">' + collectedCount + '\u2009/\u2009' + total + '</span>' +
      (isOneAway   ? '<span class="sets-one-away-dot" title="One away!" aria-label="One postcard away"></span>' : '') +
      (isCompleted ? '<span class="sets-card-check" aria-label="Completed">✓</span>' : '');
    card.appendChild(topRow);

    // ── Progress bar ───────────────────────────────────────────
    const progWrap = document.createElement('div');
    progWrap.className = 'sets-prog-wrap';
    const progBar = document.createElement('div');
    progBar.className = 'sets-prog-bar';
    progBar.style.width = pctVal + '%';
    progBar.style.background = isCompleted ? '#4ECDA0' : catColor;
    progWrap.appendChild(progBar);
    card.appendChild(progWrap);

    // ── Description ────────────────────────────────────────────
    if (setDef.description) {
      const desc = document.createElement('div');
      desc.className = 'sets-card-desc';
      desc.textContent = setDef.description;
      card.appendChild(desc);
    }

    // ── Country flags ──────────────────────────────────────────
    const flagsRow = document.createElement('div');
    flagsRow.className = 'sets-flags';

    countries.forEach(function (iso) {
      const pc      = getPostcard(iso);
      const country = D[iso];
      const flag    = country ? (country.f || '\uD83C\uDFF3') : '\uD83C\uDFF3';

      const chip = document.createElement('span');
      chip.className = 'sets-flag-chip ' +
        (pc.is_collected ? 'sets-flag-chip--on' : 'sets-flag-chip--off');
      chip.textContent = flag;
      if (country) chip.title = country.n || iso;

      if (pc.is_collected) {
        chip.addEventListener('click', function () {
          closeSets();
          setTimeout(function () { _ctx.showCard(iso); }, 50);
        });
      }

      flagsRow.appendChild(chip);
    });

    card.appendChild(flagsRow);

    // ── Reward (completed sets only) ───────────────────────────
    if (isCompleted && setDef.reward && setDef.reward.title) {
      const reward = document.createElement('div');
      reward.className = 'sets-reward';
      reward.textContent = 'Reward: ' + setDef.reward.title;
      card.appendChild(reward);

      if (setDef.reward.bonus_content) {
        const bonus = document.createElement('div');
        bonus.className = 'sets-reward-bonus';
        bonus.textContent = setDef.reward.bonus_content;
        card.appendChild(bonus);
      }
    }

    body.appendChild(card);
  });
}
