/**
 * src/js/features/achievements.js
 * Milestone checking, continent completion, surprise achievements,
 * and the recall-quiz trigger (checkRecallQuiz).
 *
 * Call initAchievements(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getVisited()        → Set<string>
 *   getFAM()            → string[]
 *   getPlayerName()     → string
 *   getCONT_MAP()       → continent-map object
 *   getD()              → D object
 *   getLastMilestone()  → number
 *   setLastMilestone(n) → void
 *   saveGame()          → void
 */

import { hasContDone, setContDone, hasSurpriseAch, setSurpriseAch } from '../state.js';
import { milestoneSound, playSound }                                 from '../ui/sounds.js';
import { burst, fireConfetti }                                       from '../ui/effects.js';
import { triggerRecallQuiz, isQuizActive }                           from './recall-quiz.js';

let _ctx;

// ── Milestone definitions ────────────────────────────────────────────────────
const MILESTONES = [
  {at:5,  emoji:'🧳', title:'{name} the World Traveler!',      sub:'5 countries explored!'},
  {at:10, emoji:'🌟', title:'{name} the Global Star!',          sub:'10 countries explored!'},
  {at:15, emoji:'🌟', title:'{name} is Halfway There!',         sub:'15 countries explored!'},
  {at:25, emoji:'<img src="/assets/ui-flame-md.png" alt="flame" style="width:64px;height:64px;vertical-align:middle">',   title:'{name} the Globe Trotter!',        sub:'25 countries explored!'},
  {at:30, emoji:'<img src="/assets/ui-flame-md.png" alt="flame" style="width:64px;height:64px;vertical-align:middle">',   title:'{name} the World Champion!',       sub:'30 countries explored!'},
  {at:50, emoji:'🗺️', title:'{name} the Cartographer!',         sub:'50 countries explored!', confetti:true},
  {at:75, emoji:'<img src="/assets/ui-compass-md.png" alt="compass" style="width:64px;height:64px;vertical-align:middle">',title:'{name} the Navigator!',            sub:'75 countries explored!', confetti:true},
  {at:100,emoji:'<img src="/assets/ui-globe-md.png" alt="globe" style="width:64px;height:64px;vertical-align:middle">',   title:'{name} the Centurion!',            sub:'100 countries explored!',confetti:true},
  {at:150,emoji:'<img src="/assets/ui-star-md.png" alt="star" style="width:64px;height:64px;vertical-align:middle">',     title:'{name} the Legend!',               sub:'150 countries explored!',confetti:true},
  {at:197,emoji:'<img src="/assets/ui-trophy-md.png" alt="trophy" style="width:64px;height:64px;vertical-align:middle">', title:'{name} explored the WHOLE WORLD!', sub:'All 197 countries discovered!',confetti:true},
];

// ── Continent completion ─────────────────────────────────────────────────────
const CONT_COUNTRIES = {
  AF: ['NGA','EGY','KEN','ZAF','ETH','MAR','TZA'],
  AS: ['IRN','JPN','CHN','IND','KOR','THA','TUR','IDN','KAZ','SAU','VNM','PAK','PHL','BGD'],
  EU: ['GBR','IRL','FRA','ITA','DEU','ESP','GRC','NOR','ISL','POL','UKR','SWE','NLD'],
  NA: ['USA','MEX','CAN','CUB'],
  SA: ['BRA','ARG','PER','COL','CHL'],
  OC: ['AUS','NZL'],
};
const CONT_NAMES_SHORT = {
  AF:'Africa', AS:'Asia', EU:'Europe', NA:'N. America', SA:'S. America', OC:'Oceania',
};

// ── Surprise achievements — check() functions can't live in JSON ─────────────
function _buildSurpriseAchs() {
  return [
    { id:'island3',   emoji:'<img src="/assets/ui-island-md.png" alt="island" style="width:64px;height:64px;vertical-align:middle">', title:'Island Hopper!',        sub:'Discovered 3 island nations',
      check() {
        const islands = ['JPN','PHL','IDN','GBR','IRL','ISL','CUB','JAM','MDG','NZL','FJI',
                         'LKA','SGP','BHR','MUS','CPV','TTO','HTI','DOM','PNG'];
        const v = _ctx.getVisited(); const F = _ctx.getFAM();
        return islands.filter(i => v.has(i) || F.includes(i)).length >= 3;
      }},
    { id:'africa1',   emoji:'<img src="/assets/ui-globe-md.png" alt="globe" style="width:64px;height:64px;vertical-align:middle">', title:'Welcome to Africa!',     sub:'Your first African discovery',
      check() {
        const v = _ctx.getVisited(); const D = _ctx.getD(); const CM = _ctx.getCONT_MAP();
        return Object.keys(D).filter(k => CM[k] === 'AF' && v.has(k)).length === 1;
      }},
    { id:'asia1',     emoji:'<img src="/assets/ui-globe-asia-md.png" alt="globe" style="width:64px;height:64px;vertical-align:middle">', title:'Konnichiwa, Asia!',       sub:'Your first Asian discovery',
      check() {
        const v = _ctx.getVisited(); const D = _ctx.getD(); const CM = _ctx.getCONT_MAP();
        return Object.keys(D).filter(k => CM[k] === 'AS' && v.has(k)).length === 1;
      }},
    { id:'sa1',       emoji:'<img src="/assets/ui-globe-americas-md.png" alt="globe" style="width:64px;height:64px;vertical-align:middle">', title:'¡Hola, South America!',  sub:'Your first South American discovery',
      check() {
        const v = _ctx.getVisited(); const D = _ctx.getD(); const CM = _ctx.getCONT_MAP();
        return Object.keys(D).filter(k => CM[k] === 'SA' && v.has(k)).length === 1;
      }},
    { id:'eu1',       emoji:'<img src="/assets/ui-castle-md.png" alt="castle" style="width:64px;height:64px;vertical-align:middle">', title:'Bonjour, Europe!',        sub:'Your first European discovery',
      check() {
        const v = _ctx.getVisited(); const D = _ctx.getD(); const CM = _ctx.getCONT_MAP();
        return Object.keys(D).filter(k => CM[k] === 'EU' && v.has(k)).length === 1;
      }},
    { id:'streak5',   emoji:'⚡', title:'Speed Explorer!',         sub:'5 countries in one session',
      check() { return (window._sessionDisc || 0) >= 5; }},
    { id:'streak10',  emoji:'<img src="/assets/ui-flame-sm.png" alt="flame" style="width:32px;height:32px;vertical-align:middle">', title:'Unstoppable!',            sub:'10 countries in one session',
      check() { return (window._sessionDisc || 0) >= 10; }},
    { id:'neighbors3',emoji:'🏘️', title:'Neighborhood Watch!',    sub:'3 countries on the same continent in a row',
      check() {
        const v = _ctx.getVisited(); const CM = _ctx.getCONT_MAP();
        const arr = [...v]; if (arr.length < 3) return false;
        const last3 = arr.slice(-3); const conts = last3.map(k => CM[k]);
        return conts[0] && conts[0] === conts[1] && conts[1] === conts[2];
      }},
    { id:'both_sides',emoji:'🌉', title:'Bridge Builder!',         sub:'Discovered countries on 3+ continents',
      check() {
        const v = _ctx.getVisited(); const F = _ctx.getFAM(); const CM = _ctx.getCONT_MAP();
        const conts = new Set();
        v.forEach(k => { if (CM[k]) conts.add(CM[k]); });
        F.forEach(k => { if (CM[k]) conts.add(CM[k]); });
        return conts.size >= 3;
      }},
  ];
}

let _SURPRISE_ACHS;

export function initAchievements(ctx) {
  _ctx = ctx;
  _SURPRISE_ACHS = _buildSurpriseAchs();
}

// ── Milestones ───────────────────────────────────────────────────────────────
export function checkMilestone() {
  const visited = _ctx.getVisited();
  const FAM     = _ctx.getFAM();
  const total   = visited.size + FAM.filter(k => !visited.has(k)).length;
  for (const ms of MILESTONES) {
    if (total >= ms.at && _ctx.getLastMilestone() < ms.at) {
      _ctx.setLastMilestone(ms.at);
      _ctx.saveGame();
      setTimeout(() => _showMilestone(ms), 800);
      return;
    }
  }
}

function _showMilestone(ms) {
  document.getElementById('msEmoji').innerHTML = ms.emoji;
  document.getElementById('msTitle').textContent = ms.title.replace('{name}', _ctx.getPlayerName());
  document.getElementById('msSub').textContent   = ms.sub;
  const msOv = document.getElementById('msOv');
  if (msOv) msOv.classList.add('on');
  milestoneSound();
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  for (let i = 0; i < 3; i++)
    setTimeout(() => burst(
      cx + Math.random() * 100 - 50,
      cy + Math.random() * 100 - 50,
      ['#FFB347','#FF6B6B','#4ECDC4','#FFE66D','#95E1D3']
    ), i * 200);
  if (ms.confetti) setTimeout(() => fireConfetti(3500), 300);
}

export function closeMilestone() {
  const m = document.getElementById('msOv');
  if (m) m.classList.remove('on');
}

// ── Continent completion ─────────────────────────────────────────────────────
export function checkContinentComplete() {
  const visited    = _ctx.getVisited();
  const FAM        = _ctx.getFAM();
  const playerName = _ctx.getPlayerName();
  for (const [cont, countries] of Object.entries(CONT_COUNTRIES)) {
    const explored = countries.filter(c => visited.has(c) || FAM.includes(c)).length;
    if (explored === countries.length) {
      const key = 'contDone_' + cont;
      if (!hasContDone(playerName, key)) {
        setContDone(playerName, key);
        const name = CONT_NAMES_SHORT[cont];
        setTimeout(() => {
          document.getElementById('msEmoji').innerHTML = '<img src="/assets/ui-trophy-md.png" alt="trophy" style="width:64px;height:64px;vertical-align:middle">';
          document.getElementById('msTitle').textContent = name + ' COMPLETE!';
          document.getElementById('msSub').textContent   = playerName + ' explored every country in ' + name + '!';
          const msOv = document.getElementById('msOv');
          if (msOv) msOv.classList.add('on');
          milestoneSound();
        }, 1200);
      }
    }
  }
}

// ── Surprise achievements ────────────────────────────────────────────────────
export function checkSurpriseAchievements() {
  const playerName = _ctx.getPlayerName();
  for (let i = 0; i < _SURPRISE_ACHS.length; i++) {
    const ach = _SURPRISE_ACHS[i];
    if (hasSurpriseAch(playerName, ach.id)) continue;
    if (ach.check()) {
      setSurpriseAch(playerName, ach.id);
      setTimeout((a => () => showSurpriseAch(a))(ach), 1200);
      return;
    }
  }
}

export function showSurpriseAch(ach) {
  const el = document.getElementById('surpriseAch');
  document.getElementById('saEmoji').innerHTML = ach.emoji;
  document.getElementById('saTitle').textContent = ach.title;
  document.getElementById('saSub').textContent   = ach.sub;
  el.classList.add('show');
  playSound('milestone');
  setTimeout(() => el.classList.remove('show'), 3500);
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  burst(cx, cy, ['#FFB347','#D4884A','#4ECDC4','#FFE66D']);
}

// ── Recall quiz trigger ──────────────────────────────────────────────────────
export function checkRecallQuiz() {
  const visited       = _ctx.getVisited();
  const FAM           = _ctx.getFAM();
  const count         = visited.size;
  const famCount      = FAM.filter(k => visited.has(k)).length;
  const discoveredCount = count - famCount; // only non-family discoveries
  if (discoveredCount > 0 && discoveredCount % 5 === 0 && !isQuizActive()) {
    setTimeout(triggerRecallQuiz, 2000);
  }
}
