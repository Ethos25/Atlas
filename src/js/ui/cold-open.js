/**
 * src/js/ui/cold-open.js
 * Cold-open screen: profile picker, returning-user recognition, world reveal.
 *
 * First-time users see the cinematic "These are the places that made you" intro.
 * Returning users (last-played player has saved visits) see a personalized
 * "Welcome back" screen with their exploration count and a Keep Exploring button.
 *
 * Call initColdOpen(ctx) before initMap() runs, after data has loaded.
 *
 * ctx shape:
 *   getDataState()        → { FAM, D, FL, FAMILY_NAMES }
 *   getProfileSummaries() → { [name]: count }
 *   setPlayerName(name)   → void
 *   onPickName(name)      → void
 *   startJourney(idx)     → void
 */

import { loadGame, getLastPlayer } from '../state.js';

let _ctx;

// Compute union of all countries discovered across all family members + FAM
function _getFamilyCompletion(FAMILY_NAMES, FAM, D) {
  const union = new Set(FAM);
  FAMILY_NAMES.forEach(function(name) {
    const d = loadGame(name);
    if (d && d.visited) d.visited.forEach(function(iso) { union.add(iso); });
  });
  const count   = union.size;
  const total   = Object.keys(D).length;
  const percent = total > 0 ? Math.round(count / total * 100) : 0;
  return { count, total, percent };
}

export function initColdOpen(ctx) {
  _ctx = ctx;
}

// Profile animal icons — visual anchors for pre-readers
const PROFILE_ANIMALS = ['🦁', '🐻', '🦊', '🐧', '🐬', '🦉', '🐯', '🐸'];

/** Populate the cold-open name buttons, country pills, and header. */
export function initProfiles() {
  const { FAM, D, FL, FAMILY_NAMES } = _ctx.getDataState();

  // Loader flag row
  const ldrFlags = document.getElementById('ldrFlags');
  if (ldrFlags) {
    ldrFlags.innerHTML = '';
    FAM.forEach(iso => {
      const dd = D[iso];
      if (dd && dd.fc && FL[dd.fc]) {
        const div = document.createElement('div');
        div.className = 'co-p';
        div.innerHTML = '<img src="' + FL[dd.fc] + '" style="width:20px;height:auto;border-radius:2px;vertical-align:middle">';
        ldrFlags.appendChild(div);
      }
    });
  }

  // Cold-open country pills
  const coldCountries = document.getElementById('coldCountries');
  if (coldCountries) {
    coldCountries.innerHTML = '';
    FAM.forEach(iso => {
      const dd = D[iso];
      if (dd) {
        const div = document.createElement('div');
        div.className = 'co-p';
        if (dd.fc && FL[dd.fc]) {
          div.innerHTML = '<img src="' + FL[dd.fc] + '" style="width:16px;height:auto;border-radius:2px;vertical-align:middle;margin-right:3px"> ' + dd.n;
        } else {
          div.textContent = dd.n;
        }
        coldCountries.appendChild(div);
      }
    });
  }

  // Name buttons
  const nameSelect = document.getElementById('nameSelect');
  if (nameSelect) {
    nameSelect.innerHTML = '';
    FAMILY_NAMES.forEach((name, idx) => {
      const btn = document.createElement('button');
      btn.className = 'co-name-btn';
      const animal = PROFILE_ANIMALS[idx % PROFILE_ANIMALS.length];
      btn.innerHTML = '<span class="profile-animal">' + animal + '</span> ' + name;
      btn.dataset.name = name;
      btn.onclick = function () { pickName(btn); };
      nameSelect.appendChild(btn);
    });
  }

  // Badge counts and last-player highlight
  const summaries  = _ctx.getProfileSummaries();
  const lastPlayer = getLastPlayer();
  document.querySelectorAll('.co-name-btn').forEach(btn => {
    const name  = btn.dataset.name || btn.textContent.trim();
    const count = summaries[name] || 0;
    const existingBadge = btn.querySelector('.co-name-badge');
    if (existingBadge) existingBadge.remove();
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className   = 'co-name-badge';
      badge.textContent = count;
      btn.appendChild(badge);
    }
    if (name === lastPlayer) {
      btn.classList.add('last-player', 'sel');
      _ctx.setPlayerName(name);
    }
    if (!lastPlayer && name === FAMILY_NAMES[0]) {
      btn.classList.add('sel');
      _ctx.setPlayerName(FAMILY_NAMES[0]);
    }
  });

  // ── Returning-user cold open ───────────────────────────────────────────────
  // If the last active player has visited countries, show a personalised header
  // instead of the first-time intro so the experience differentiates sessions 2+.
  const activePlayer = lastPlayer || (FAMILY_NAMES.length > 0 ? FAMILY_NAMES[0] : null);
  if (activePlayer) {
    const saved = loadGame(activePlayer);
    if (saved && saved.visited && saved.visited.length > 0) {
      _applyReturningUserUI(activePlayer, saved, FAM, D);
    }
  }

  // ── Family completion progress indicator ───────────────────────────────────
  _renderFamilyProgress(FAMILY_NAMES, FAM, D);
}

function _renderFamilyProgress(FAMILY_NAMES, FAM, D) {
  const el = document.getElementById('coFamilyProgress');
  if (!el) return;
  const { percent } = _getFamilyCompletion(FAMILY_NAMES, FAM, D);
  const familyLabel = FAMILY_NAMES.length > 0 ? FAMILY_NAMES[0] + "'s family" : 'Your family';
  el.style.display = 'flex';
  el.innerHTML =
    '<div class="co-fp-text">The ' + familyLabel + ' has explored <b>' + percent + '%</b> of the world</div>' +
    '<div class="co-fp-bar-track"><div class="co-fp-bar-fill" style="width:' + percent + '%"></div></div>';
}

/**
 * Swap the cold-open header and button text for a returning player.
 * @param {string} name
 * @param {object} saved   save object with .visited array
 * @param {string[]} FAM
 * @param {object} D
 */
function _applyReturningUserUI(name, saved, FAM, D) {
  const visitedCount = saved.visited.length;
  // Combined count includes family countries (same as updN / getProfileSummaries)
  const famUnvisited = FAM.filter(k => !saved.visited.includes(k)).length;
  const totalExplored = visitedCount + famUnvisited;

  // Most recently visited country (last element of saved.visited)
  const lastISO = saved.visited[saved.visited.length - 1];
  const lastCountryName = (lastISO && D[lastISO] && D[lastISO].n) ? D[lastISO].n : null;

  // Update tagline
  const tagEl = document.querySelector('.co-t');
  if (tagEl) {
    tagEl.innerHTML = 'Welcome back, <b>' + name + '</b>.';
  }

  // Inject a returning-user stats line below the tagline
  const coldEl = document.getElementById('cold');
  if (coldEl) {
    let statsEl = document.getElementById('coReturnStats');
    if (!statsEl) {
      statsEl = document.createElement('div');
      statsEl.id = 'coReturnStats';
      statsEl.style.cssText = 'font-family:Inter,system-ui,sans-serif;font-size:12px;' +
        'color:rgba(255,255,255,0.4);letter-spacing:0.3px;margin-bottom:4px;text-align:center';
      // Insert after .co-t
      const coT = coldEl.querySelector('.co-t');
      if (coT && coT.nextSibling) {
        coldEl.insertBefore(statsEl, coT.nextSibling);
      } else if (coT) {
        coldEl.appendChild(statsEl);
      }
    }
    let statsText = totalExplored + ' countries explored';
    if (lastCountryName) statsText += ' · Last visit: ' + lastCountryName;
    statsEl.textContent = statsText;
  }

  // Update goBtn label
  const goBtn = document.getElementById('goBtn');
  if (goBtn) {
    goBtn.textContent = 'Keep Exploring →';
  }
}

/**
 * Handle a player-name button tap.
 * Updates UI immediately; delegates state mutation to the main module.
 * Also refreshes the returning-user header for the newly selected player.
 */
export function pickName(btn) {
  document.querySelectorAll('.co-name-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
  const name = btn.dataset.name || btn.textContent.trim();
  document.getElementById('logoName').textContent = name + "'s";
  _ctx.onPickName(name);

  // Update header to reflect this player's state
  const { FAM, D } = _ctx.getDataState();
  const saved = loadGame(name);
  const tagEl = document.querySelector('.co-t');
  const goBtn = document.getElementById('goBtn');
  let statsEl = document.getElementById('coReturnStats');

  if (saved && saved.visited && saved.visited.length > 0) {
    _applyReturningUserUI(name, saved, FAM, D);
  } else {
    // First-time player — reset to standard intro
    if (tagEl) tagEl.innerHTML = 'These are the places<br>that made <b>you</b>.';
    if (goBtn) goBtn.textContent = 'Start Exploring ✨';
    if (statsEl) statsEl.remove();
  }
}

/**
 * Reveal the full map after the cold-open sequence.
 * Shows a first-journey prompt after 2 s (once per session).
 */
export function revealWorld() {
  setTimeout(() => {
    if (!sessionStorage.getItem('journeyPrompted')) {
      sessionStorage.setItem('journeyPrompted', '1');
      const jp = document.createElement('div');
      jp.style.cssText = 'position:fixed;bottom:55px;left:50%;transform:translateX(-50%);' +
        'z-index:30;background:rgba(16,24,38,0.94);backdrop-filter:blur(20px);' +
        'border:1px solid rgba(255,255,255,0.08);border-radius:var(--r-md);' +
        'padding:10px 18px;cursor:pointer;display:flex;align-items:center;' +
        'gap:10px;opacity:0;transition:opacity 0.5s';
      jp.innerHTML = '<span style="font-size:20px">🌋</span>' +
        '<div><div style="font-family:DM Serif Display,Georgia,serif;font-size:14px;color:white">Ring of Fire</div>' +
        '<div style="font-family:Inter,system-ui,sans-serif;font-size:10px;color:rgba(255,255,255,0.35)">Start your first journey</div></div>' +
        '<span style="color:rgba(255,255,255,0.2);font-size:16px">›</span>';
      jp.onclick = () => { jp.remove(); _ctx.startJourney(0); };
      document.body.appendChild(jp);
      setTimeout(() => { jp.style.opacity = '1'; }, 100);
      setTimeout(() => {
        if (jp.parentNode) {
          jp.style.opacity = '0';
          setTimeout(() => { if (jp.parentNode) jp.remove(); }, 400);
        }
      }, 12000);
    }
  }, 2000);

  document.querySelectorAll('.map-hidden').forEach(el => {
    el.classList.remove('map-hidden');
    el.classList.add('map-visible');
  });
  document.getElementById('revealBtn').classList.remove('show');
}
