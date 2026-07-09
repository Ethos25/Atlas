/**
 * src/js/ui/legendary-vault.js
 * Legendary Vault overlay — Feature 3A–3H.
 *
 * Shows all legendary countries as premium collectibles.
 * Found legendaries get golden cards. Undiscovered are mystery silhouettes.
 *
 * ctx shape:
 *   getRARITY()      → { [iso]: 'common'|'uncommon'|'rare'|'legendary' }
 *   getD()           → { [iso]: { n, f, c, ... } }
 *   getFL()          → { [fc]: base64 }
 *   getVisited()     → Set<string>
 *   getPlayerName()  → string
 *   getTEASERS()     → teaser map / array
 *   getCONT_MAP()    → { [iso]: contCode }
 *   getCONT_COL()    → { [code]: { base, bright, stroke } }
 *   getTotalCollected() → number
 *   showCard(iso)    → void
 */

import { loadGame } from '../state.js';
import { milestoneSound } from './sounds.js';
import { fireConfetti }   from './effects.js';

let _ctx = null;
let _vaultFirstComplete = false; // track first time vault viewed with all legendaries

export function initLegendaryVault(ctx) {
  _ctx = ctx;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function openLegendaryVault() {
  _buildVault();
  const ov = document.getElementById('vaultOv');
  if (ov) ov.classList.add('on');
}

export function closeLegendaryVault() {
  const ov = document.getElementById('vaultOv');
  if (ov) ov.classList.remove('on');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getLegendaryCountries() {
  const RARITY = _ctx.getRARITY();
  if (!RARITY) return [];
  return Object.keys(RARITY).filter(function (iso) { return RARITY[iso] === 'legendary'; });
}

export function getFoundLegendaries() {
  const visited = _ctx.getVisited();
  return getLegendaryCountries().filter(function (iso) { return visited.has(iso); });
}

function getDiscoveryDate(iso) {
  const name = _ctx.getPlayerName();
  const save = loadGame(name);
  if (!save) return 'Date unknown';
  if (save.postcards && save.postcards[iso] && save.postcards[iso].collected_at) {
    return _formatDate(save.postcards[iso].collected_at);
  }
  if (save.lastPlayed) return _formatDate(save.lastPlayed);
  return 'Date unknown';
}

function _formatDate(isoStr) {
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) { return 'Date unknown'; }
}

// ── Build ─────────────────────────────────────────────────────────────────────

function _buildVault() {
  const vaultBody = document.getElementById('vaultBody');
  if (!vaultBody) return;
  vaultBody.innerHTML = '';
  vaultBody.scrollTop = 0;

  const D        = _ctx.getD();
  const FL       = _ctx.getFL();
  const CONT_MAP = _ctx.getCONT_MAP();
  const CONT_COL = _ctx.getCONT_COL();
  const TEASERS  = _ctx.getTEASERS ? _ctx.getTEASERS() : {};

  const allLeg   = getLegendaryCountries();
  const foundSet = new Set(getFoundLegendaries());
  const found    = [...foundSet];
  const unfound  = allLeg.filter(function (iso) { return !foundSet.has(iso); });

  // Progress footer
  const footer = document.getElementById('vaultFooter');
  if (footer) {
    const allFound = found.length === allLeg.length;
    if (allFound && !_vaultFirstComplete) {
      _vaultFirstComplete = true;
      footer.innerHTML =
        '<div class="vault-legend-title">Legendary Explorer</div>' +
        '<div class="vault-footer-count">' + found.length + ' of ' + allLeg.length + ' legendaries found</div>';
      milestoneSound();
      setTimeout(function () { fireConfetti(3500); }, 200);
    } else {
      footer.innerHTML =
        '<div class="vault-footer-count">' + found.length + ' of ' + allLeg.length + ' legendaries found</div>';
    }
  }

  // ── Found legendaries ─────────────────────────────────────────────────────
  if (found.length > 0) {
    const eyebrow = document.createElement('div');
    eyebrow.className = 'vault-eyebrow';
    eyebrow.textContent = '✦ DISCOVERED';
    vaultBody.appendChild(eyebrow);

    found.forEach(function (iso) {
      const country  = D[iso];
      if (!country) return;
      const contCode = CONT_MAP ? CONT_MAP[iso] : null;
      const contCC   = contCode && CONT_COL ? CONT_COL[contCode] : null;
      const contColor = contCC ? contCC.base : '#8C91A5';
      const flag     = (country.fc && FL && FL[country.fc])
        ? '<img src="' + FL[country.fc] + '" alt="" style="width:24px;height:auto;border-radius:2px;border:none;box-shadow:0 2px 6px rgba(0,0,0,0.3)">'
        : '<span style="font-size:18px">' + (country.f || '🏳') + '</span>';

      // Teaser lookup — TEASERS may be { [iso]: text } or array
      let teaser = '';
      if (TEASERS) {
        if (typeof TEASERS === 'object' && !Array.isArray(TEASERS) && TEASERS[iso]) {
          teaser = TEASERS[iso];
        } else if (Array.isArray(TEASERS)) {
          const t = TEASERS.find(function (x) { return x && x.iso === iso; });
          if (t) teaser = t.text || t.teaser || '';
        }
      }

      const discoveredStr = getDiscoveryDate(iso);
      const card = document.createElement('div');
      card.className = 'vault-card vault-card--found';
      card.innerHTML =
        '<div class="vault-card-header">' +
          '<div class="vault-flag">' + flag + '</div>' +
          '<div class="vault-card-info">' +
            '<div class="vault-country-name">' + _esc(country.n) + '</div>' +
            '<div class="vault-continent" style="color:' + contColor + '">' + _esc(country.c || '') + '</div>' +
          '</div>' +
        '</div>' +
        (teaser
          ? '<div class="vault-teaser">' + _esc(teaser) + '</div>'
          : '') +
        '<div class="vault-discovered">Discovered ' + _esc(discoveredStr) + '</div>';

      card.addEventListener('click', function () {
        closeLegendaryVault();
        setTimeout(function () { _ctx.showCard(iso); }, 50);
      });
      vaultBody.appendChild(card);
    });
  }

  // ── Undiscovered silhouettes ───────────────────────────────────────────────
  if (unfound.length > 0) {
    const eyebrow2 = document.createElement('div');
    eyebrow2.className = 'vault-eyebrow vault-eyebrow--mystery';
    eyebrow2.textContent = '? UNDISCOVERED';
    vaultBody.appendChild(eyebrow2);

    unfound.forEach(function (iso) {
      const country  = D[iso];
      const contCode = CONT_MAP ? CONT_MAP[iso] : null;
      const contCC   = contCode && CONT_COL ? CONT_COL[contCode] : null;
      const contColor = contCC ? contCC.base : '#8C91A5';
      const contName  = country ? (country.c || 'Somewhere...') : 'Somewhere...';

      const card = document.createElement('div');
      card.className = 'vault-card vault-card--unknown';
      card.innerHTML =
        '<div class="vault-unknown-q">?</div>' +
        '<div class="vault-unknown-hint" style="color:' + contColor + '60">Somewhere in ' + _esc(contName) + '...</div>';

      card.setAttribute('title', 'Keep exploring to find this legendary country!');
      card.addEventListener('click', function () {
        const tipEl = document.getElementById('tip');
        if (tipEl) {
          tipEl.textContent = 'Keep exploring to find this legendary country!';
          tipEl.className   = 'tip tip--show';
          setTimeout(function () { tipEl.className = 'tip'; }, 2200);
        }
      });
      vaultBody.appendChild(card);
    });
  }

  if (found.length === 0 && unfound.length === 0) {
    const empty = document.createElement('div');
    empty.style.cssText =
      'text-align:center;padding:32px 16px;font-family:Inter,system-ui,sans-serif;' +
      'font-size:13px;color:#50556E';
    empty.textContent = 'No legendary data loaded — keep exploring!';
    vaultBody.appendChild(empty);
  }
}

function _esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
