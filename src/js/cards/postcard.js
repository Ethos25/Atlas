/**
 * src/js/cards/postcard.js
 * Core postcard renderer (_showCard), tab switching, toggles, favourite.
 *
 * index.html imports _showCard and wraps it as showCard (adding story-prompt
 * clearing and buildWhereNext) — that removes the old monkey-patch.
 *
 * Call initPostcard(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getCurV()            → ISO | null
 *   setCurV(v)           → void
 *   getD()               → D object
 *   getFL()              → FL object
 *   getGREET()           → GREET object
 *   getCONT_COL()        → CONT_COL object
 *   getCONT_MAP()        → CONT_MAP object
 *   getL2()              → L2 object
 *   getCAPS()            → CAPS object
 *   getXPORTS()          → XPORTS object
 *   getSECRETS()         → SECRETS object
 *   getEASTER_EGGS()     → EASTER_EGGS object
 *   getTERRITORY_OF()    → TERRITORY_OF object
 *   getPOLITICAL_STATUS() → POLITICAL_STATUS object
 *   getNAMES()           → NAMES object
 *   getVisited()         → Set<string>
 *   getFavorites()       → Set<string>
 *   getFAM()             → string[]
 *   getActiveJourney()   → journey | null
 *   setActiveJourney(v)  → void
 *   getJourneyIdx()      → number
 *   isFirstDiscDone()    → bool
 *   setFirstDiscDone(v)  → void
 *   getCardHistory()     → array
 *   setCardHistory(v)    → void
 *   getCardHistoryNav()  → bool
 *   setCardHistoryNav(v) → void
 *   isUndiscoveredMode() → bool
 *   isActiveLens()       → bool
 *   toggleUndiscovered() → void
 *   clearLens()          → void
 *   isLegendary(iso)     → bool
 *   placeMarkers()       → void
 *   updN()               → void
 *   saveGame()           → void
 *   showEncouragement(countryName) → void
 *   getConnections(iso)  → string[]
 *   getPlayerAge()       → number  (default 5; used to age-gate sensitive conn types)
 *   cl()                 → void   (card-close from swipe.js, passed via ctx)
 */

import { playSound } from '../ui/sounds.js';
import { fireConfetti } from '../ui/effects.js';
import { checkMilestone, checkRecallQuiz } from '../features/achievements.js';
import { CONN_TYPES, getCountryConns, filterConnsByAge, renderConnCard } from './connections.js';
import { updateSwipeArrows } from './swipe.js';

let _ctx;

export function initPostcard(ctx) {
  _ctx = ctx;
}

// ── Tab switching ─────────────────────────────────────────────────────────────
export function switchTab(tab, silent) {
  var tabs     = ['story', 'facts', 'conn'];
  var ids      = { story: 'tabStory', facts: 'tabFacts', conn: 'tabConn' };
  var contents = { story: 'tabContentStory', facts: 'tabContentFacts', conn: 'tabContentConn' };
  tabs.forEach(function(t) {
    var tabEl     = document.getElementById(ids[t]);
    var contentEl = document.getElementById(contents[t]);
    if (tabEl)     tabEl.classList.toggle('active', t === tab);
    if (contentEl) contentEl.classList.toggle('pc-tab-hidden', t !== tab);
  });
  if (!silent) playSound('tab');
}

// ── tgLM — legacy "More ›" toggle (kept for backwards compat) ─────────────────
export function tgLM() {
  const p = document.getElementById('l2P'), b = document.getElementById('lmB') || document.createElement('div');
  if (!p) return;
  if (p.classList.contains('op')) { p.classList.remove('op'); if (b) b.textContent = 'More ›'; return; }
  p.classList.add('op');
  if (b) b.textContent = 'Less ›';
  const curV   = _ctx.getCurV();
  const L2     = _ctx.getL2();
  const CAPS   = _ctx.getCAPS();
  const XPORTS = _ctx.getXPORTS();
  if (!p.innerHTML && curV && L2[curV]) {
    const d   = L2[curV];
    const cap = CAPS[curV] || '';
    const xp  = XPORTS[curV] || '';
    const rows = [
      { ic: '🏛️', lb: 'HOW IT\'S RUN',          tx: d.led   },
      { ic: '🗣️', lb: 'LANGUAGES',               tx: d.langs },
      { ic: '🏙️', lb: 'CAPITAL',                 tx: cap     },
      { ic: '📦', lb: 'WHAT THEY\'RE KNOWN FOR', tx: xp      },
      { ic: '🥣', lb: 'WHAT KIDS REALLY EAT',    tx: d.bfast },
      { ic: '📏', lb: 'HOW BIG, FOR REAL?',       tx: d.big   },
    ];
    p.innerHTML = rows.map(r =>
      '<div class="l2r"><div class="l2i">' + r.ic + '</div><div>' +
      '<div class="l2l">' + r.lb + '</div><div class="l2t">' + r.tx + '</div>' +
      '</div></div>'
    ).join('');
  }
}

// ── toggleMoreAbout ───────────────────────────────────────────────────────────
export function toggleMoreAbout() {
  var l2p    = document.getElementById('l2P');
  var toggle = document.getElementById('moreToggle');
  if (!l2p || !toggle) return;
  var isOpen = toggle.classList.contains('open');
  if (isOpen) {
    l2p.classList.remove('op');
    toggle.classList.remove('open');
  } else {
    l2p.classList.add('op');
    toggle.classList.add('open');
  }
  playSound('tab');
}

// ── toggleFav ─────────────────────────────────────────────────────────────────
export function toggleFav() {
  const curV      = _ctx.getCurV();
  const favorites = _ctx.getFavorites();
  if (!curV) return;
  if (favorites.has(curV)) {
    favorites.delete(curV);
    document.getElementById('favBtn').textContent = '🤍';
    document.getElementById('favBtn').classList.remove('faved');
  } else {
    favorites.add(curV);
    document.getElementById('favBtn').textContent = '❤️';
    document.getElementById('favBtn').classList.add('faved');
  }
  _ctx.saveGame();
}

// ── Core postcard renderer ────────────────────────────────────────────────────
export function _showCard(a) {
  if (_ctx.isUndiscoveredMode()) _ctx.toggleUndiscovered();
  if (_ctx.isActiveLens())       _ctx.clearLens();

  // Track history for back button
  const cardHistoryNav = _ctx.getCardHistoryNav();
  const cardHistory    = _ctx.getCardHistory();
  const prevCurV       = _ctx.getCurV();
  if (!cardHistoryNav && prevCurV && prevCurV !== a) cardHistory.push(prevCurV);
  _ctx.setCardHistoryNav(false);
  _ctx.setCurV(a);

  const D = _ctx.getD();
  const c = D[a];
  if (!c) return;

  var bb = document.getElementById('cardBackBtn');
  if (bb) bb.style.display = cardHistory.length > 0 ? 'flex' : 'none';
  playSound('tap');

  // Stripe
  const stripe = document.getElementById('pcStripe');
  if (stripe) stripe.style.background = c.stripe || '#aaa';

  // Legendary country treatment
  const pc = document.querySelector('.postcard');
  if (pc) {
    if (_ctx.isLegendary(a)) {
      pc.style.border     = '1px solid rgba(212,176,68,0.25)';
      pc.style.boxShadow  = '0 8px 40px rgba(0,0,0,0.4), 0 0 20px rgba(212,176,68,0.08)';
      if (!_ctx.getVisited().has(a)) {
        setTimeout(() => {
          const badge = document.createElement('div');
          badge.style.cssText = 'position:fixed;top:40%;left:50%;transform:translate(-50%,-50%);z-index:50;background:rgba(16,24,38,0.95);backdrop-filter:blur(24px);border:1px solid rgba(212,176,68,0.3);border-radius:var(--r-md);padding:20px 28px;text-align:center;opacity:0;transition:opacity 0.5s;pointer-events:none';
          badge.innerHTML = '<div style="font-size:32px;margin-bottom:6px">✦</div><div style="font-family:DM Serif Display,Georgia,serif;font-size:18px;color:white">Legendary Discovery!</div><div style="font-family:Inter,system-ui,sans-serif;font-size:11px;color:rgba(212,176,68,0.7);margin-top:4px">Only 16 legendary countries exist</div>';
          document.body.appendChild(badge);
          setTimeout(() => { badge.style.opacity = '1'; }, 50);
          setTimeout(() => { badge.style.opacity = '0'; setTimeout(() => badge.remove(), 500); }, 3000);
        }, 400);
      }
    } else {
      pc.style.border    = '1px solid rgba(255,255,255,0.06)';
      pc.style.boxShadow = '0 8px 40px rgba(0,0,0,0.4)';
    }
  }

  // Header: flag + greeting + name
  const FL    = _ctx.getFL();
  const GREET = _ctx.getGREET();
  const flagWrap = document.getElementById('pcFlag');
  if (flagWrap) {
    if (c.fc && FL[c.fc]) flagWrap.innerHTML = '<img src="' + FL[c.fc] + '" style="width:48px;height:auto;max-height:34px;border-radius:var(--r-sm);box-shadow:var(--shadow-md)" alt="">';
    else flagWrap.innerHTML = '';
  }

  const greetEl = document.getElementById('pcGreetTxt');
  if (greetEl) {
    if (c.fc && GREET[c.fc]) { greetEl.textContent = GREET[c.fc].d; greetEl.style.display = 'block'; }
    else greetEl.style.display = 'none';
  }

  const nameEl = document.getElementById('pcName');
  if (nameEl) nameEl.textContent = c.n;

  const CONT_MAP  = _ctx.getCONT_MAP();
  const CONT_COL  = _ctx.getCONT_COL();
  const contEl    = document.getElementById('pcCont');
  if (contEl) contEl.textContent = c.c;

  // Territory / political status badge
  const TERRITORY_OF     = _ctx.getTERRITORY_OF();
  const POLITICAL_STATUS = _ctx.getPOLITICAL_STATUS();
  const statusEl = document.getElementById('pcStatus');
  if (statusEl) {
    statusEl.className     = 'pc-status';
    statusEl.style.display = 'none';
    statusEl.textContent   = '';
    if (TERRITORY_OF[a])     { statusEl.textContent = TERRITORY_OF[a];     statusEl.className = 'pc-status territory'; statusEl.style.display = 'inline-block'; }
    else if (POLITICAL_STATUS[a]) { statusEl.textContent = POLITICAL_STATUS[a]; statusEl.className = 'pc-status political'; statusEl.style.display = 'inline-block'; }
  }

  // Family bar
  const fbar = document.getElementById('fBar');
  if (fbar) fbar.className = 'fam-bar' + (c.fam ? ' show' : '');

  // Signature emoji (tappable easter egg)
  const EASTER_EGGS = _ctx.getEASTER_EGGS();
  const sigEmoji    = document.getElementById('pcSigEmoji');
  if (sigEmoji && c.hero && c.hero.length) {
    sigEmoji.textContent  = c.hero[0];
    sigEmoji.style.display = 'block';
    sigEmoji.style.cursor  = EASTER_EGGS[a] ? 'pointer' : 'default';
    sigEmoji.onclick = EASTER_EGGS[a] ? function() {
      let ee = document.getElementById('easterEgg');
      if (ee) { ee.remove(); return; }
      ee = document.createElement('div');
      ee.id = 'easterEgg';
      ee.style.cssText = 'position:absolute;top:100%;right:0;z-index:10;background:rgba(212,176,68,0.12);border:1px solid rgba(212,176,68,0.2);border-radius:var(--r-sm);padding:8px 12px;font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:600;color:rgba(212,176,68,0.9);max-width:220px;margin-top:4px;animation:fadeIn 0.3s ease';
      ee.textContent = '🥚 ' + EASTER_EGGS[a];
      sigEmoji.parentNode.style.position = 'relative';
      sigEmoji.parentNode.appendChild(ee);
      playSound('journey');
      setTimeout(() => { if (ee.parentNode) ee.remove(); }, 5000);
    } : null;
  } else if (sigEmoji) {
    sigEmoji.style.display = 'none';
  }

  // Header gradient tint from continent color
  const hdr = document.querySelector('.pc-header');
  if (hdr) {
    const cc2 = CONT_COL[CONT_MAP[a]];
    if (cc2) hdr.style.background = 'linear-gradient(135deg,' + cc2.base + '12,transparent)';
    else     hdr.style.background = 'none';
  }

  // Letter — strip greeting from start since it's shown separately
  const L2      = _ctx.getL2();
  const CAPS    = _ctx.getCAPS();
  const XPORTS  = _ctx.getXPORTS();
  const SECRETS = _ctx.getSECRETS();
  const letterEl = document.getElementById('pcLetter');
  if (letterEl) {
    letterEl.style.display = '';
    let txt = c.letter;
    if (c.fc && GREET[c.fc]) {
      const g = GREET[c.fc].d.replace('!', '').replace('¡', '').trim().toLowerCase();
      const firstBang  = txt.indexOf('!');
      const firstDot   = txt.indexOf('.');
      const firstBreak = firstBang > 0 && firstBang < 20 ? firstBang : (firstDot > 0 && firstDot < 20 ? firstDot : -1);
      if (firstBreak > 0) {
        const letterStart = txt.substring(0, firstBreak).toLowerCase();
        if (letterStart.includes(g)) txt = txt.substring(firstBreak + 1).trim();
      }
    }
    letterEl.textContent = txt;
  }

  // Facts hidden — letter covers the same content
  const facts = document.getElementById('pcFacts');
  if (facts) facts.style.display = 'none';

  // Family note
  const fn = document.getElementById('fNote');
  if (fn) { fn.className = 'fam-note' + (c.fam ? ' show' : ''); fn.textContent = c.fn || ''; }

  // Favorite
  const favorites = _ctx.getFavorites();
  const favBtn    = document.getElementById('favBtn');
  if (favBtn) favBtn.textContent = favorites.has(a) ? '♥' : '♡';
  if (favBtn) favBtn.style.color = favorites.has(a) ? '#D4884A' : 'rgba(255,255,255,0.3)';

  // Mark as visited
  const visited = _ctx.getVisited();
  if (!visited.has(a)) {
    window._tellSomeoneCountry = c.n;
    visited.add(a);
    playSound('discover');
    if (!_ctx.isFirstDiscDone()) { _ctx.setFirstDiscDone(true); }
    checkMilestone();
    _ctx.placeMarkers();
    _ctx.updN();
    _ctx.saveGame();
    if (visited.size % 3 === 0) _ctx.showEncouragement(c.n);
    checkRecallQuiz();
  }

  // Journey next button
  const jnb  = document.getElementById('jNext');
  const jProg = document.getElementById('jProgress');
  if (jnb && jProg) {
    const activeJourney = _ctx.getActiveJourney();
    const journeyIdx    = _ctx.getJourneyIdx();
    if (activeJourney) {
      var dots = '';
      for (var di = 0; di < activeJourney.countries.length; di++) {
        var cls = 'j-dot';
        if (di < journeyIdx)      cls += ' done';
        else if (di === journeyIdx) cls += ' active';
        dots += '<div class="' + cls + '"></div>';
      }
      jProg.innerHTML    = dots;
      jProg.style.display = 'flex';
      if (journeyIdx < activeJourney.countries.length - 1) {
        jnb.style.display = 'flex';
        jnb.textContent   = 'Next →';
      } else {
        jnb.style.display = 'flex';
        jnb.textContent   = 'Finish ✨';
        jnb.onclick = function() { _ctx.setActiveJourney(null); _ctx.cl(); fireConfetti(3500); };
      }
    } else {
      jnb.style.display  = 'none';
      jProg.style.display = 'none';
      jProg.innerHTML    = '';
    }
  }

  // Secret card — the real secret, displayed prominently
  const secretCard = document.getElementById('secretCard');
  const secretText = document.getElementById('secretText');
  const moreToggle = document.getElementById('moreToggle');
  if (secretCard && secretText && SECRETS[a]) {
    secretText.textContent   = SECRETS[a];
    secretCard.style.display = 'flex';
  } else if (secretCard) {
    secretCard.style.display = 'none';
  }

  // L2 reference content — collapsed by default behind toggle
  const l2p = document.getElementById('l2P');
  if (l2p && L2[a]) {
    const d   = L2[a];
    const cap = CAPS[a]   || '';
    const xp  = XPORTS[a] || '';
    const rows = [
      { ic: '🏛️', lb: 'HOW IT\'S RUN',          tx: d.led   },
      { ic: '🗣️', lb: 'LANGUAGES',               tx: d.langs },
      { ic: '🏙️', lb: 'CAPITAL',                 tx: cap     },
      { ic: '📦', lb: 'WHAT THEY\'RE KNOWN FOR', tx: xp      },
      { ic: '🥣', lb: 'WHAT KIDS REALLY EAT',    tx: d.bfast },
      { ic: '📏', lb: 'HOW BIG, FOR REAL?',       tx: d.big || d.size || '' },
    ];
    if (d.gave)  rows.splice(4, 0, { ic: '🎁', lb: 'THEY GAVE THE WORLD', tx: d.gave  });
    if (d.makes) rows.splice(3, 0, { ic: '🏭', lb: 'WHAT IT MAKES',       tx: d.makes });
    l2p.innerHTML = rows.map(r =>
      '<div class="l2r"><div class="l2i">' + r.ic + '</div><div>' +
      '<div class="l2l">' + r.lb + '</div><div class="l2t">' + r.tx + '</div>' +
      '</div></div>'
    ).join('');
    // Start collapsed if there's a secret
    if (SECRETS[a]) {
      l2p.classList.remove('op');
      if (moreToggle) { moreToggle.style.display = 'flex'; moreToggle.classList.remove('open'); }
    } else {
      l2p.classList.add('op');
      if (moreToggle) moreToggle.style.display = 'none';
    }
  } else if (l2p) {
    l2p.innerHTML = '';
    l2p.classList.remove('op');
    if (moreToggle) moreToggle.style.display = 'none';
  }

  // Tabs — show/hide based on available content
  // allConns: every connection for this country, regardless of age.
  // visibleConns: filtered by player age (sensitive types hidden for age < 5).
  // The tab is shown whenever ANY connections exist; if all are filtered out,
  // the tab shows an age-appropriate empty state instead of disappearing.
  const allConns     = getCountryConns(a);
  const playerAge    = _ctx.getPlayerAge ? _ctx.getPlayerAge() : 5;
  const visibleConns = filterConnsByAge(allConns, playerAge);
  const hasT2  = !!L2[a] || _ctx.getConnections(a).length > 0;
  const hasT3  = allConns.length > 0;
  const pcTabs = document.getElementById('pcTabs');
  if (pcTabs) pcTabs.classList.toggle('hidden', !hasT2 && !hasT3);
  const connTab = document.getElementById('tabConn');
  if (connTab) connTab.style.display = hasT3 ? '' : 'none';
  switchTab('story', true);

  // Populate Connections tab (Tier 3) — paginated
  const NAMES    = _ctx.getNAMES();
  const connStage = document.getElementById('connStage');
  const connNav   = document.getElementById('connNav');
  window._connCards = [];
  window._connIdx   = 0;
  if (connStage && connNav) {
    if (visibleConns.length > 0) {
      // Normal rendering — one card per visible connection
      window._connCards = visibleConns.map(function(cn) {
        var otherISO  = cn.c[0] === a ? cn.c[1] : cn.c[0];
        var otherD    = D[otherISO];
        var otherName = otherD ? otherD.n : (NAMES[otherISO] || otherISO);
        var otherFlag = otherD && otherD.fc && FL[otherD.fc] ? '<img class="conn-flag" src="' + FL[otherD.fc] + '">' : '';
        var thisD     = D[a];
        var thisFlag  = thisD && thisD.fc && FL[thisD.fc] ? '<img class="conn-flag" src="' + FL[thisD.fc] + '">' : '';
        var ct        = CONN_TYPES[cn.type] || CONN_TYPES.surprise;
        var famClass  = cn.familyRelevant ? ' family-conn' : '';
        return '<div class="conn-card' + famClass + '" onclick="pulseCountry(\'' + otherISO + '\')">' +
          '<div class="conn-type"><span class="conn-type-icon">' + ct.icon + '</span> ' + ct.label + '</div>' +
          '<div class="conn-flags">' + thisFlag + '<span class="conn-between">↔</span>' + otherFlag +
          '<span style="font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:600;color:rgba(255,255,255,0.4);margin-left:4px">' + otherName + '</span></div>' +
          '<div class="conn-title">' + cn.title + '</div>' +
          '<div class="conn-story">' + cn.story + '</div>' +
          '</div>';
      });
      window._connIdx = 0;
      connNav.style.display = window._connCards.length > 1 ? 'flex' : 'none';
      renderConnCard();
    } else if (allConns.length > 0) {
      // All connections exist but are filtered by age — friendly empty state
      connStage.innerHTML   = '<div class="conn-age-empty"><span class="conn-age-empty-icon">🌱</span><p>More stories about this country are coming soon!</p></div>';
      connNav.style.display = 'none';
    } else {
      // No connections at all for this country
      connStage.innerHTML   = '';
      connNav.style.display = 'none';
    }
  }

  // "You Might Also Like" — populates inside Story tab
  const conns  = _ctx.getConnections(a);
  const connEl = document.getElementById('pcConnections');
  if (connEl && conns.length) {
    connEl.style.display = 'block';
    connEl.innerHTML = '<div style="font-family:Inter,system-ui,sans-serif;font-size:9px;font-weight:700;color:rgba(255,255,255,0.2);letter-spacing:0.5px;margin-bottom:4px">YOU MIGHT ALSO LIKE</div>' +
      conns.map(function(c2) {
        var cd = D[c2]; if (!cd) return '';
        var fl = FL[cd.fc] ? '<img src="' + FL[cd.fc] + '" style="width:16px;height:auto;border-radius:2px;vertical-align:middle;margin-right:6px">' : '';
        return '<span onclick="showCard(\'' + c2 + '\')" style="display:inline-flex;align-items:center;background:var(--glass-1);border:1px solid rgba(255,255,255,0.05);border-radius:var(--r-sm);padding:5px 10px;margin:2px;cursor:pointer;font-family:Inter,system-ui,sans-serif;font-size:11px;font-weight:600;color:rgba(255,255,255,0.45)">' + fl + cd.n + '</span>';
      }).join('');
  } else if (connEl) {
    connEl.style.display = 'none';
  }

  document.getElementById('cOv').classList.add('on');
  updateSwipeArrows();
}
