/**
 * src/js/cards/coming-soon.js
 * showComingSoon — placeholder card for countries not yet in the data set.
 *
 * Call initComingSoon(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getNAMES()           → NAMES object
 *   getD()               → D object
 *   getFL()              → FL object
 *   getEXTRA_FC()        → EXTRA_FC object
 *   getCONT_MAP()        → CONT_MAP object
 *   getTERRITORY_OF()    → TERRITORY_OF object
 *   getPOLITICAL_STATUS() → POLITICAL_STATUS object
 */

import { switchTab } from './postcard.js';

let _ctx;

export function initComingSoon(ctx) {
  _ctx = ctx;
}

export function showComingSoon(alpha) {
  const NAMES           = _ctx.getNAMES();
  const D               = _ctx.getD();
  const FL              = _ctx.getFL();
  const EXTRA_FC        = _ctx.getEXTRA_FC();
  const CONT_MAP        = _ctx.getCONT_MAP();
  const TERRITORY_OF    = _ctx.getTERRITORY_OF();
  const POLITICAL_STATUS = _ctx.getPOLITICAL_STATUS();

  const name    = NAMES[alpha] || D[alpha]?.n || 'This Country';
  const cfc     = EXTRA_FC[alpha] || (D[alpha]?.fc);
  const cont    = CONT_MAP[alpha] || '';
  const contName = { NA: 'North America', SA: 'South America', EU: 'Europe', AF: 'Africa', AS: 'Asia', OC: 'Oceania' }[cont] || '';

  const stripe = document.getElementById('pcStripe');
  if (stripe) stripe.style.background = '#555';

  const flagWrap = document.getElementById('pcFlag');
  if (flagWrap) {
    if (cfc && FL[cfc]) flagWrap.innerHTML = '<img src="' + FL[cfc] + '" style="width:48px;height:auto;max-height:34px;border-radius:var(--r-sm);box-shadow:var(--shadow-md);opacity:0.5" alt="">';
    else flagWrap.innerHTML = '';
  }

  const greetEl = document.getElementById('pcGreetTxt');
  if (greetEl) greetEl.style.display = 'none';

  const nameEl = document.getElementById('pcName');
  if (nameEl) nameEl.textContent = name;

  const contEl = document.getElementById('pcCont');
  if (contEl) contEl.textContent = contName;

  // Territory / political status badge (Coming Soon fallback)
  var statusEl2 = document.getElementById('pcStatus');
  if (statusEl2) {
    statusEl2.className    = 'pc-status';
    statusEl2.style.display = 'none';
    statusEl2.textContent  = '';
    // Note: original code referenced `a` (undefined) here; preserved as-is
    if (TERRITORY_OF[a]) { statusEl2.textContent = TERRITORY_OF[a]; statusEl2.className = 'pc-status territory'; statusEl2.style.display = 'inline-block'; }
    else if (POLITICAL_STATUS[a]) { statusEl2.textContent = POLITICAL_STATUS[a]; statusEl2.className = 'pc-status political'; statusEl2.style.display = 'inline-block'; }
  }

  const letterEl = document.getElementById('pcLetter');
  if (letterEl) { letterEl.style.display = ''; letterEl.textContent = "We're still exploring " + name + "! This country is coming soon. There are SO many amazing places in the world and we're adding new ones all the time."; }

  const factsEl = document.getElementById('pcFacts');
  if (factsEl) factsEl.innerHTML = '';

  const fbar = document.getElementById('fBar');
  if (fbar) fbar.className = 'fam-bar';

  const fnote = document.getElementById('fNote');
  if (fnote) fnote.className = 'fam-note';

  const lmb = document.getElementById('lmB') || document.createElement('div');
  if (lmb) lmb.style.display = 'none';

  // Hide tabs and clear Tier 2/3 content for Coming Soon
  const pcTabs2 = document.getElementById('pcTabs');
  if (pcTabs2) pcTabs2.classList.add('hidden');
  switchTab('story', true);

  const l2p = document.getElementById('l2P');
  if (l2p) l2p.innerHTML = '';

  const connEl2 = document.getElementById('pcConnections');
  if (connEl2) connEl2.style.display = 'none';

  const connSt = document.getElementById('connStage');
  if (connSt) connSt.innerHTML = '';

  var connNav3 = document.getElementById('connNav');
  if (connNav3) connNav3.style.display = 'none';

  window._connCards = [];
  document.getElementById('cOv').classList.add('on');
}
