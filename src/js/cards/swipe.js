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
 */

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

  // "Tell someone" toast on first discoveries
  if (window._tellSomeoneCountry) {
    var countryName = window._tellSomeoneCountry;
    window._tellSomeoneCountry = null;
    var prompts = [
      'Tell someone what you learned about ' + countryName + '! 🗣️',
      'Go tell someone about ' + countryName + '! 🗣️',
      'Share what you learned about ' + countryName + '! 🗣️',
      'Tell a grownup about ' + countryName + '! 🗣️',
    ];
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:300;background:rgba(16,24,38,0.95);backdrop-filter:blur(20px);border:1px solid rgba(255,200,60,0.15);border-radius:20px;padding:12px 24px;font-family:Inter,system-ui,sans-serif;color:rgba(255,255,255,0.9);font-size:15px;font-weight:600;opacity:0;transition:opacity 0.5s;pointer-events:none;white-space:nowrap;letter-spacing:-0.2px;max-width:90vw;text-align:center;box-shadow:0 4px 20px rgba(0,0,0,0.4)';
    toast.textContent = prompts[Math.floor(Math.random() * prompts.length)];
    document.body.appendChild(toast);
    setTimeout(function() { toast.style.opacity = '1'; }, 100);
    setTimeout(function() { toast.style.opacity = '0'; setTimeout(function() { toast.remove(); }, 500); }, 3500);
  }

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
}
