/**
 * src/js/features/streaks.js
 * Cross-session daily streak counter.
 *
 * Call initStreaks(ctx) in _boot() after data loads.
 *
 * ctx shape:
 *   loadStreakData()              → { streakCount: number, lastStreakDate: string|null }
 *   setStreakData(count, date)    → void  (updates in-memory state; saveGame() is called next)
 *   saveGame()                   → void
 *
 * Day logic:
 *   - Same calendar day as last explore → streak unchanged, no toast
 *   - Yesterday → streak increments by 1, toast fires at streak ≥ 2
 *   - 2+ days ago → streak resets to 1
 */

let _ctx = null;

// In-session: current streak value (initialised from save on initStreaks)
let _streakCount    = 0;
let _lastExploreDate = null; // 'YYYY-MM-DD' or null

export function initStreaks(ctx) {
  _ctx = ctx;
  const saved = _ctx.loadStreakData();
  _streakCount     = saved.streakCount     || 0;
  _lastExploreDate = saved.lastStreakDate   || null;
}

/** Call when the player discovers a new country. */
export function updateStreak() {
  const today = _todayStr();

  if (_lastExploreDate === today) {
    // Already explored today — no change to day-streak, skip toast
    return;
  }

  const yesterday = _yesterdayStr();
  if (_lastExploreDate === yesterday) {
    // Consecutive day
    _streakCount += 1;
  } else {
    // Gap of 2+ days — start fresh
    _streakCount = 1;
  }

  _lastExploreDate = today;

  // Persist immediately
  if (_ctx) {
    _ctx.setStreakData(_streakCount, _lastExploreDate);
    _ctx.saveGame();
  }

  // Show toast for day-streaks ≥ 2
  if (_streakCount >= 2) {
    _showStreakToast(_streakCount);
  }

  // Update the flame counter in the UI (if visible)
  _updateFlameUI(_streakCount);
}

/** Returns the current streak count. */
export function getStreakCount() {
  return _streakCount;
}

// ── Private helpers ──────────────────────────────────────────────────────────

function _todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function _yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function _showStreakToast(count) {
  const flameImg = '<img src="/assets/ui-flame-xs.png" alt="flame" style="width:24px;height:24px;vertical-align:middle">';
  const flames = flameImg.repeat(Math.min(count, 7));
  const msg = count >= 30 ? flames + ' ' + count + ' DAY STREAK — UNSTOPPABLE!'
            : count >= 14 ? flames + ' ' + count + ' days in a row! A habit is born.'
            : count >= 7  ? flames + ' ' + count + ' days straight — on fire!'
            : count >= 3  ? flames + ' ' + count + ' days in a row!'
            :               flameImg + ' Day ' + count + ' streak!';

  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:50px;left:50%;transform:translateX(-50%);' +
    'z-index:40;background:rgba(16,24,38,0.92);backdrop-filter:blur(16px);' +
    'border:1px solid rgba(212,136,74,0.15);border-radius:var(--r-md);' +
    'padding:6px 16px;font-family:Inter,system-ui,sans-serif;font-size:12px;' +
    'font-weight:700;color:#D4884A;opacity:0;transition:opacity 0.3s;' +
    'pointer-events:none;white-space:nowrap';
  t.innerHTML = msg;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '1'; }, 30);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2800);
}

function _updateFlameUI(count) {
  // Populate the streak flame badge next to the counter pill if it exists
  let flameEl = document.getElementById('streakFlame');
  if (!flameEl) return;
  if (count >= 2) {
    flameEl.innerHTML = '<img src="/assets/ui-flame-xs.png" alt="flame" style="width:24px;height:24px;vertical-align:middle"> ' + count;
    flameEl.style.display = 'inline';
  } else {
    flameEl.style.display = 'none';
  }
}
