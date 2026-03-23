/**
 * src/js/cards/ocean-card.js
 * showOceanCard — renders the ocean postcard overlay.
 *
 * Call initOceanCard(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getOCEANS()  → OCEANS object
 *   setCurV(v)   → void
 */

import { playSound } from '../ui/sounds.js';
import { switchTab  } from './postcard.js';

let _ctx;

export function initOceanCard(ctx) {
  _ctx = ctx;
}

export function showOceanCard(id) {
  var o = _ctx.getOCEANS()[id];
  if (!o) return;
  playSound('tap');
  _ctx.setCurV(null); // not a country

  // Stripe
  var stripe = document.getElementById('pcStripe');
  if (stripe) stripe.style.background = o.stripe || '#0A4C7A';

  // Reset postcard styling
  var pc = document.querySelector('.postcard');
  if (pc) { pc.style.border = ''; pc.style.boxShadow = ''; }

  // Flag area — show ocean emoji instead
  var flagWrap = document.getElementById('pcFlag');
  if (flagWrap) flagWrap.innerHTML = '<span style="font-size:36px">' + o.emoji + '</span>';

  // Greeting
  var greetEl = document.getElementById('pcGreetTxt');
  if (greetEl) { greetEl.textContent = 'Dive in!'; greetEl.style.display = 'block'; }

  // Name
  var nameEl = document.getElementById('pcName');
  if (nameEl) nameEl.textContent = o.n;

  // Continent line
  var contEl = document.getElementById('pcCont');
  if (contEl) contEl.textContent = '';

  // Status badge — ocean label
  var statusEl = document.getElementById('pcStatus');
  if (statusEl) {
    statusEl.innerHTML    = '<img src="/assets/ui-wave-xs.png" alt="wave" style="width:24px;height:24px;vertical-align:middle"> Ocean';
    statusEl.className    = 'pc-status territory';
    statusEl.style.display = 'inline-block';
  }

  // Signature emoji
  var sigEmoji = document.getElementById('pcSigEmoji');
  if (sigEmoji && o.hero) {
    sigEmoji.innerHTML     = o.hero[0];
    sigEmoji.style.display   = 'block';
    sigEmoji.style.cursor    = 'default';
  }

  // Family bar — hide
  var fbar = document.getElementById('fBar');
  if (fbar) fbar.className = 'fam-bar';

  // Facts
  var factsEl = document.getElementById('pcFacts');
  if (factsEl) {
    factsEl.innerHTML = '';
    (o.facts || []).forEach(function(f) {
      var row = document.createElement('div');
      row.className = 'pc-fact';
      row.innerHTML = '<span class="pc-fact-icon">' + f.i + '</span><span class="pc-fact-text">' + f.t + '</span>';
      factsEl.appendChild(row);
    });
  }

  // Letter
  var letterEl = document.getElementById('pcLetter');
  if (letterEl) { letterEl.style.display = ''; letterEl.textContent = o.letter; }

  // Tabs — show only Story and Secrets
  var tabStory = document.getElementById('tabStory');
  var tabFacts = document.getElementById('tabFacts');
  var tabConn  = document.getElementById('tabConn');
  if (tabStory) tabStory.style.display = '';
  if (tabFacts) tabFacts.style.display = o.secret ? '' : 'none';
  if (tabConn)  tabConn.style.display  = 'none';

  // Secret
  var secretCard = document.getElementById('secretCard');
  var secretText = document.getElementById('secretText');
  if (secretCard && secretText && o.secret) {
    secretText.textContent     = o.secret;
    secretCard.style.display   = 'block';
  } else if (secretCard) {
    secretCard.style.display   = 'none';
  }

  // Hide L2 / More toggle / family note for oceans
  var moreToggle = document.getElementById('moreToggle');
  if (moreToggle) moreToggle.style.display = 'none';
  var l2P = document.getElementById('l2P');
  if (l2P) { l2P.classList.remove('op'); l2P.innerHTML = ''; }
  var fNote = document.getElementById('fNote');
  if (fNote) fNote.className = 'fam-note';

  // Connections — hide
  var connStage = document.getElementById('connStage');
  if (connStage) connStage.innerHTML = '';

  // Where Next — hide
  var whereNext = document.getElementById('whereNext');
  if (whereNext) whereNext.style.display = 'none';

  // Favorite — hide for oceans
  var favBtn = document.getElementById('favBtn');
  if (favBtn) favBtn.style.display = 'none';

  // Back button
  var bb = document.getElementById('cardBackBtn');
  if (bb) bb.style.display = 'none';

  // Journey stuff — hide
  var jNext = document.getElementById('jNext');
  if (jNext) jNext.style.display = 'none';
  var jProg = document.getElementById('jProgress');
  if (jProg) jProg.style.display = 'none';

  // Switch to story tab
  switchTab('story');

  // Show overlay
  document.getElementById('cOv').classList.add('on');

  // Swipe arrows — hide for oceans
  document.getElementById('swPrev').classList.add('hidden');
  document.getElementById('swNext').classList.add('hidden');
}
