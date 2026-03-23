/**
 * src/js/map/interactions.js
 * Country click/touch handler, undiscovered mode, pulse-nearby.
 *
 * Call initInteractions(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getD()               → D object
 *   getNAMES()           → NAMES object
 *   getCONT_MAP()        → CONT_MAP object
 *   getISO()             → ISO object
 *   getVisited()         → Set<string>
 *   getFAM()             → string[]
 *   isFirstDiscDone()    → bool
 *   setFirstDiscDone(v)  → void
 *   getPlayerName()      → string
 *   saveGame()           → void
 *   updateStreak()       → void
 *   showComingSoon(a)    → void
 *   showCard(a)          → void
 *   showEncouragement(n) → void
 *   updN()               → void
 */

/* global d3 */

import { playSound, ia, chm }                                      from '../ui/sounds.js';
import { hTip }                                                     from '../ui/tooltip.js';
import { burst }                                                    from '../ui/effects.js';
import { checkMilestone, checkContinentComplete, checkRecallQuiz }  from '../features/achievements.js';
import { checkChallengeAnswer, isChalActive }                      from '../features/challenges.js';
import { placeMarkers }                                            from './render.js';

let _ctx;
let undiscoveredMode = false;
let lastClickX = 50, lastClickY = 50; // eslint-disable-line no-unused-vars

export function initInteractions(ctx) {
  _ctx = ctx;
}

export function isUndiscoveredMode() { return undiscoveredMode; }

export function onClick(ev, d, el) {
  playSound('tap');
  ia(); hTip();
  lastClickX = (ev.clientX / window.innerWidth  * 100).toFixed(0);
  lastClickY = (ev.clientY / window.innerHeight * 100).toFixed(0);

  const D       = _ctx.getD();
  const ISO     = _ctx.getISO();
  const FAM     = _ctx.getFAM();
  const CONT_MAP = _ctx.getCONT_MAP();
  const NAMES   = _ctx.getNAMES();
  const visited = _ctx.getVisited();

  const a = (typeof d === 'object' && d.id)
    ? (ISO[d.id] || (D[d.id] && d.id) || '')
    : d3.select(el).attr('data-a');

  // Block French Guiana from opening France card
  if (a === 'FRA' && ev.clientX < window.innerWidth * 0.45 && ev.clientY > window.innerHeight * 0.4) {
    _ctx.showComingSoon('GUF'); return;
  }

  const dd = D[a];
  if (!dd) {
    const alpha = typeof d === 'object' && d.id ? ISO[d.id] || '' : d3.select(el).attr('data-a');
    if (alpha && (NAMES[alpha] || CONT_MAP[alpha])) { _ctx.showComingSoon(alpha); }
    return;
  }

  var isNewDiscovery = false;
  // Track whether the full-screen first-discovery banner will fire so we can
  // delay the postcard until AFTER the banner auto-dismisses (not simultaneous).
  var showingFirstDiscBanner = false;

  if (!visited.has(a)) {
    isNewDiscovery = true;
    window._tellSomeoneCountry = dd.n;
    visited.add(a);
    // Matte glow on first discovery
    el.classList.add('country-glow');
    setTimeout(function() { el.classList.remove('country-glow'); }, 3000);
    // First discovery celebration — full-screen banner
    if (!_ctx.isFirstDiscDone() && !FAM.includes(a) && D[a]) {
      showingFirstDiscBanner = true;
      _ctx.setFirstDiscDone(true);
      _ctx.saveGame();
      setTimeout(() => {
        document.getElementById('fdEmoji').innerHTML = '<img src="/assets/ui-party-md.png" alt="party" style="width:64px;height:64px;vertical-align:middle">';
        document.getElementById('fdTitle').textContent = _ctx.getPlayerName() + '\'s FIRST Discovery!';
        document.getElementById('fdSub').textContent   = 'You just found ' + D[a].n + '! 25 more countries to explore.';
        const fdOv = document.getElementById('fdOv'); if (fdOv) fdOv.classList.add('on');
        const cx2 = window.innerWidth / 2, cy2 = window.innerHeight / 2;
        for (let i = 0; i < 4; i++) {
          setTimeout(() => burst(cx2 + Math.random() * 200 - 100, cy2 + Math.random() * 200 - 100,
            ['#FFB347','#FF6B6B','#4ECDC4','#FFE66D','#95E1D3']), i * 150);
        }
        // Banner auto-dismisses at 3 000 ms; postcard will open after that
        setTimeout(() => { const fd = document.getElementById('fdOv'); if (fd) fd.classList.remove('on'); }, 3000);
      }, 500);
    } else {
      _ctx.saveGame();
    }
    const bb = el.getBoundingClientRect();
    burst(bb.left + bb.width / 2, bb.top + bb.height / 2,
      dd.fam ? ['#FFB347','#FFD700','#FFF3D4','#FF8C42'] : ['#4ECDC4','#FFE66D','#95E1D3','#FF6B6B']);
    _ctx.updN();
    placeMarkers();
    checkMilestone();
    checkContinentComplete();
    checkRecallQuiz();
    if (_ctx.updateStreak) _ctx.updateStreak();
  }

  if (isChalActive()) {
    checkChallengeAnswer(a);
    return;
  }

  dd.fam ? chm(true) : chm(false);
  if (visited.size % 3 === 0 && visited.size > 0) _ctx.showEncouragement(dd.n);

  if (showingFirstDiscBanner) {
    // Banner fires at 500 ms and clears at 3 500 ms — open postcard after it clears
    setTimeout(function() { _ctx.showCard(a); }, 3700);
  } else if (isNewDiscovery) {
    // Normal new discovery: brief burst animation plays, then postcard opens
    setTimeout(function() { _ctx.showCard(a); }, 400);
  } else {
    _ctx.showCard(a);
  }
  const hintEl = document.getElementById('hint'); if (hintEl) hintEl.classList.add('fade');
}

export function pulseNearby(closedISO) {
  const D       = _ctx.getD();
  const CONT_MAP = _ctx.getCONT_MAP();
  const visited = _ctx.getVisited();
  const cont    = CONT_MAP[closedISO];
  if (!cont) return;
  const sameCont = Object.keys(D).filter(k => k !== closedISO && CONT_MAP[k] === cont && !visited.has(k));
  for (let i = sameCont.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [sameCont[i], sameCont[j]] = [sameCont[j], sameCont[i]];
  }
  const targets = sameCont.slice(0, 3);
  targets.forEach(iso => {
    const el = document.querySelector('.country[data-a="' + iso + '"]');
    if (el) {
      el.style.transition = 'filter 0.5s';
      el.style.filter     = 'brightness(1.4)';
      setTimeout(() => { el.style.filter = 'brightness(1)'; }, 1500);
      setTimeout(() => { el.style.filter = 'brightness(1.3)'; }, 2000);
      setTimeout(() => { el.style.filter = 'brightness(1)'; el.style.transition = ''; }, 2800);
    }
  });
}

export function toggleUndiscovered() {
  undiscoveredMode = !undiscoveredMode;
  const D       = _ctx.getD();
  const visited = _ctx.getVisited();
  const pill    = document.getElementById('counterPill');
  document.querySelectorAll('.country').forEach(el => {
    const a = el.getAttribute('data-a');
    if (undiscoveredMode) {
      if (visited.has(a)) {
        el.style.opacity    = '0.15';
        el.style.transition = 'opacity 0.4s';
      } else {
        el.style.opacity    = '1';
        el.style.transition = 'opacity 0.4s';
        el.style.filter     = 'brightness(1.3)';
      }
    } else {
      el.style.opacity    = '1';
      el.style.filter     = '';
      el.style.transition = 'opacity 0.4s';
    }
  });
  if (pill) {
    pill.style.border     = undiscoveredMode ? '1px solid rgba(212,136,74,0.3)' : '1px solid rgba(255,255,255,0.03)';
    pill.style.background = undiscoveredMode ? 'rgba(212,136,74,0.1)'           : 'rgba(255,255,255,0.03)';
  }
  if (undiscoveredMode) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;top:80px;right:16px;z-index:30;background:rgba(16,24,38,0.92);backdrop-filter:blur(16px);border:1px solid rgba(212,136,74,0.15);border-radius:var(--r-md);padding:8px 14px;font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:600;color:rgba(212,136,74,0.8);opacity:0;transition:opacity 0.3s;pointer-events:none';
    const remaining = Object.keys(D).length - visited.size;
    t.textContent = remaining + ' countries left to discover';
    document.body.appendChild(t);
    setTimeout(() => { t.style.opacity = '1'; }, 30);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  }
}
