/**
 * src/js/features/missions.js
 * Daily Mission System — Feature 1.
 *
 * Call initMissions(ctx) in _boot() after data loads.
 *
 * ctx shape:
 *   getMISSIONS()    → missions array from missions.json
 *   getD()           → D object (countries.json data)
 *   getCONT_MAP()    → continent map { [iso]: continent }
 *   getLENSES()      → lens country sets (biggest, islands, etc.)
 *   getPlayerName()  → string
 *   showEncouragement(name) → void
 *   chm()            → void   (charm sound)
 */

import { loadMissionsData, saveMissionsData } from '../state.js';

// ── Language → ISO mappings (superset of lenses.js spanish/english) ──────────
const LANGUAGE_ISO = {
  French:     ['FRA','BEL','CHE','CAN','HTI','SEN','CIV','CMR','GAB','COG','CAF','COD',
                'MLI','BFA','NER','TGO','BEN','GIN','GNQ','DJI','COM','MDG','MUS','SYC',
                'VUT','MCO','LUX','AND','RWA','BDI','DMA','GNB'],
  Spanish:    ['ESP','MEX','COL','ARG','PER','VEN','CHL','ECU','GTM','CUB','BOL','DOM',
                'HND','PRY','SLV','NIC','CRI','PAN','URY','GNQ'],
  Arabic:     ['SAU','EGY','IRQ','SYR','JOR','LBN','KWT','ARE','QAT','OMN','BHR','YEM',
                'SDN','LBY','TUN','DZA','MAR','MRT','COM','DJI','ESH','PSE','SOM'],
  Portuguese: ['PRT','BRA','AGO','MOZ','CPV','STP','GNB','TLS'],
  Russian:    ['RUS','BLR','KAZ','KGZ','TJK'],
  Mandarin:   ['CHN','TWN','SGP'],
  Hindi:      ['IND'],
  Swahili:    ['KEN','TZA','UGA','RWA','COD','COM','MOZ'],
  Japanese:   ['JPN'],
  German:     ['DEU','AUT','CHE','LUX','LIE','BEL'],
};

// ── Stamp milestone definitions ───────────────────────────────────────────────
export const STAMP_MILESTONES = [
  { at: 7,  emoji: '🗓️',  title: 'Week Explorer!',    sub: '7 daily missions completed!',     confetti: false },
  { at: 14, emoji: '📅',  title: 'Fortnight Finder!', sub: '14 daily missions completed!',    confetti: false },
  { at: 30, emoji: '🌟',  title: 'Monthly Master!',   sub: '30 daily missions completed!',    confetti: true  },
  { at: 60, emoji: '🏆',  title: 'Grand Explorer!',   sub: '60 missions — you are unstoppable!', confetti: true },
];

// ── Module state ──────────────────────────────────────────────────────────────
let _ctx = null;
let _missions = [];
let _todayMission = null;
let _missionData = { completed: [], stamps: 0 }; // per-player, reloaded on pickName
let _missionCardEl = null;
let _awaitingNextTap = false; // Feature 4 integration: mystery answer mode

export function initMissions(ctx) {
  _ctx = ctx;
  _missions = ctx.getMISSIONS() || [];
  _reload();
  _buildCard();
}

/** Reload per-player state — call after player switch. */
export function reloadMissions() {
  if (!_ctx) return;
  _reload();
  _updateCard();
}

function _reload() {
  const name = _ctx.getPlayerName();
  _missionData   = loadMissionsData(name);
  _todayMission  = _pickTodayMission();
}

// ── Mission selection ─────────────────────────────────────────────────────────

/** Use the day-of-year as a stable daily index. */
function _dayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  return Math.floor(diff / oneDay);
}

function _todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10); // 'YYYY-MM-DD'
}

function _pickTodayMission() {
  if (!_missions.length) return null;
  const idx = _dayOfYear() % _missions.length;
  return _missions[idx];
}

// ── Public API ────────────────────────────────────────────────────────────────

export function getTodayMission() { return _todayMission; }

export function isMissionComplete() {
  const key = _todayKey();
  return _missionData.completed.includes(key);
}

export function getStampCount() { return _missionData.stamps || 0; }

export function getStampMilestones() { return STAMP_MILESTONES; }

/**
 * Check if a just-discovered country satisfies today's active mission.
 * Called from index.html post-discovery flow.
 * @param {string} iso  ISO-3 code of discovered country
 * @returns {boolean}   true if mission was just completed
 */
export function checkMissionMatch(iso) {
  if (!_todayMission || isMissionComplete()) return false;
  if (_matchesMission(iso, _todayMission)) {
    completeMission();
    return true;
  }
  return false;
}

/**
 * Mark today's mission as complete, award a stamp, persist.
 */
export function completeMission() {
  const key = _todayKey();
  if (_missionData.completed.includes(key)) return; // already done
  _missionData.completed.push(key);
  _missionData.stamps = (_missionData.stamps || 0) + 1;
  saveMissionsData(_ctx.getPlayerName(), _missionData);
  _updateCard();
  _showMissionToast();
  _checkStampMilestone();
}

// ── Match logic ───────────────────────────────────────────────────────────────

function _matchesMission(iso, mission) {
  const { filter, match } = mission;

  if (filter === 'language') {
    const isos = LANGUAGE_ISO[match];
    return isos ? isos.includes(iso) : false;
  }

  if (filter === 'continent') {
    const CONT_MAP = _ctx.getCONT_MAP();
    const cont     = CONT_MAP[iso];
    if (!cont) return false;
    // Named region aliases
    const aliases = {
      MidEast: ['SAU','JOR','IRQ','IRN','ARE','QAT','KWT','OMN','BHR','YEM','SYR','LBN','ISR','PSE'],
      SEAsia:  ['THA','VNM','IDN','PHL','MYS','SGP','MMR','KHM','LAO','TLS','BRN'],
      Scandinavia: ['NOR','SWE','DNK','ISL','FIN'],
      Caribbean: ['CUB','DOM','HTI','JAM','TTO','BHS','BRB','LCA','VCT','GRD','DMA','ATG','KNA'],
    };
    if (aliases[match]) return aliases[match].includes(iso);
    return cont === match;
  }

  if (filter === 'lens') {
    const LENSES = _ctx.getLENSES();
    const lens = LENSES && LENSES[match];
    return lens ? lens.includes(iso) : false;
  }

  if (filter === 'iso_list') {
    return Array.isArray(match) && match.includes(iso);
  }

  if (filter === 'any') {
    return true;
  }

  return false;
}

// ── Mission card UI ───────────────────────────────────────────────────────────

function _buildCard() {
  // Remove any existing card
  const old = document.getElementById('missionCard');
  if (old) old.remove();

  if (!_todayMission) return;

  const card = document.createElement('div');
  card.id = 'missionCard';
  card.className = 'mission-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');

  card.addEventListener('click', _onCardTap);
  card.addEventListener('keypress', e => { if (e.key === 'Enter') _onCardTap(); });

  _missionCardEl = card;
  document.body.appendChild(card);

  _updateCard();

  // Slide in after map renders
  setTimeout(() => {
    card.classList.add('mission-card--visible');
  }, 1400);
}

function _updateCard() {
  const card = _missionCardEl || document.getElementById('missionCard');
  if (!card || !_todayMission) return;

  const complete = isMissionComplete();
  const stamps   = getStampCount();

  if (complete) {
    card.className = 'mission-card mission-card--complete';
    card.innerHTML =
      '<div class="mc-eyebrow">TODAY\'S MISSION</div>' +
      '<div class="mc-done">' +
        '<span class="mc-check">✓</span> ' +
        '<span class="mc-done-text">Complete!</span>' +
      '</div>' +
      '<div class="mc-stamps">' +
        '<img src="/assets/ui-flame-xs.png" alt="flame" style="width:14px;height:14px;vertical-align:middle"> ' +
        stamps + ' stamps' +
      '</div>';
  } else {
    card.className = 'mission-card';
    if (_missionCardEl && _missionCardEl.classList.contains('mission-card--visible')) {
      card.classList.add('mission-card--visible');
    }
    card.innerHTML =
      '<div class="mc-eyebrow">TODAY\'S MISSION</div>' +
      '<div class="mc-prompt">' + _escHtml(_todayMission.prompt) + '</div>' +
      '<div class="mc-stamps">' +
        '<img src="/assets/ui-flame-xs.png" alt="flame" style="width:14px;height:14px;vertical-align:middle"> ' +
        stamps + ' stamps' +
      '</div>';
  }
}

function _onCardTap() {
  if (isMissionComplete()) {
    // Dismiss
    const card = document.getElementById('missionCard');
    if (card) {
      card.classList.remove('mission-card--visible');
      setTimeout(() => card.remove(), 400);
    }
    return;
  }

  // Pulse relevant countries on the map
  _pulseMatchingCountries();
}

function _pulseMatchingCountries() {
  if (!_todayMission) return;
  const { filter, match } = _todayMission;

  // Build matching ISO set
  const CONT_MAP = _ctx.getCONT_MAP();
  const LENSES   = _ctx.getLENSES();
  let targets = [];

  if (filter === 'language') {
    targets = LANGUAGE_ISO[match] || [];
  } else if (filter === 'continent') {
    const aliases = {
      MidEast: ['SAU','JOR','IRQ','IRN','ARE','QAT','KWT','OMN','BHR','YEM','SYR','LBN','ISR','PSE'],
      SEAsia:  ['THA','VNM','IDN','PHL','MYS','SGP','MMR','KHM','LAO','TLS','BRN'],
      Scandinavia: ['NOR','SWE','DNK','ISL','FIN'],
      Caribbean: ['CUB','DOM','HTI','JAM','TTO','BHS','BRB','LCA','VCT','GRD','DMA','ATG','KNA'],
    };
    if (aliases[match]) {
      targets = aliases[match];
    } else {
      targets = Object.keys(CONT_MAP || {}).filter(k => CONT_MAP[k] === match);
    }
  } else if (filter === 'lens') {
    targets = (LENSES && LENSES[match]) || [];
  } else if (filter === 'iso_list') {
    targets = Array.isArray(match) ? match : [];
  }

  // Pulse each matching country element briefly
  targets.forEach(iso => {
    const el = document.querySelector('.country[data-a="' + iso + '"]');
    if (!el) return;
    el.style.transition = 'filter 0.4s';
    el.style.filter = 'brightness(1.6) drop-shadow(0 0 6px rgba(232,175,56,0.8))';
    setTimeout(() => {
      el.style.filter = 'brightness(1)';
      setTimeout(() => { el.style.filter = ''; el.style.transition = ''; }, 400);
    }, 1800);
  });
}

// ── Mission toast ─────────────────────────────────────────────────────────────

function _showMissionToast() {
  if (!_todayMission) return;
  // Defer until postcard closes (mirrors milestone pattern)
  window._pendingMissionToast = true;
  window._pendingMissionData  = {
    emoji:       _todayMission.emoji,
    rewardText:  _todayMission.reward_text,
    stamps:      _missionData.stamps,
  };
}

/** Called from index.html after postcard closes, same timing as milestone check. */
export function flushMissionToast() {
  if (!window._pendingMissionToast) return;
  window._pendingMissionToast = false;
  const d = window._pendingMissionData || {};
  window._pendingMissionData = null;

  const toast = document.createElement('div');
  toast.className = 'mission-toast';
  toast.innerHTML =
    '<span class="mt-emoji">' + (d.emoji || '🎯') + '</span>' +
    '<span class="mt-text">' +
      '<span class="mt-title">Mission Complete! ' + _escHtml(d.rewardText || '') + '</span>' +
      '<span class="mt-stamp">+1 stamp · ' + (d.stamps || 0) + ' total</span>' +
    '</span>';

  document.body.appendChild(toast);
  if (_ctx.chm) _ctx.chm();

  setTimeout(() => toast.classList.add('mission-toast--show'), 30);
  setTimeout(() => {
    toast.classList.remove('mission-toast--show');
    setTimeout(() => toast.remove(), 400);
  }, 2800);
}

// ── Stamp milestone ───────────────────────────────────────────────────────────

function _checkStampMilestone() {
  const stamps = _missionData.stamps;
  for (const ms of STAMP_MILESTONES) {
    if (stamps === ms.at) {
      setTimeout(() => _showStampMilestone(ms), 3200);
      break;
    }
  }
}

function _showStampMilestone(ms) {
  if (_ctx.showMilestone) {
    _ctx.showMilestone(ms);
    return;
  }
  // Fallback: use existing msOv elements
  const emojiEl = document.getElementById('msEmoji');
  const titleEl = document.getElementById('msTitle');
  const subEl   = document.getElementById('msSub');
  const msOv    = document.getElementById('msOv');
  if (!msOv) return;
  if (emojiEl) emojiEl.textContent = ms.emoji;
  if (titleEl) titleEl.textContent = ms.title;
  if (subEl)   subEl.textContent   = ms.sub;
  msOv.classList.add('on');
  if (_ctx.milestoneSound) _ctx.milestoneSound();
  if (ms.confetti && _ctx.fireConfetti) _ctx.fireConfetti(3500);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
