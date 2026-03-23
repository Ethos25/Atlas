/**
 * src/js/cards/where-next.js
 * buildWhereNext — renders the contextual "Where Next?" pill tray.
 *
 * Call initWhereNext(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getD()        → D object
 *   getCONT_MAP() → CONT_MAP object
 *   getVisited()  → Set<string>
 *   getFAM()      → string[]
 *   getXPORTS()   → XPORTS object
 *   getFL()       → FL object
 *   showCard(iso) → void   (the showCard wrapper in index.html)
 *   switchTab(tab) → void
 */

import { CONN_TYPES, getCountryConns } from './connections.js';
import { switchTab } from './postcard.js';

const CONT_NAMES_SHORT = {
  AF: 'Africa', AS: 'Asia', EU: 'Europe',
  NA: 'N. America', SA: 'S. America', OC: 'Oceania',
};

let _ctx;

export function initWhereNext(ctx) {
  _ctx = ctx;
}

export function buildWhereNext(iso) {
  var tray = document.getElementById('whereNext');
  var opts = document.getElementById('wnOptions');
  if (!tray || !opts) return;
  opts.innerHTML = '';

  const D       = _ctx.getD();
  const CONT_MAP = _ctx.getCONT_MAP();
  const visited  = _ctx.getVisited();
  const FAM      = _ctx.getFAM();
  const XPORTS   = _ctx.getXPORTS();
  const FL       = _ctx.getFL();

  var suggestions = [];
  var used = new Set();
  used.add(iso);

  // PRIORITY 1: Countries with Friends & Foes connections
  var conns = getCountryConns(iso);
  conns.forEach(function(cn) {
    if (suggestions.length >= 3) return;
    var other = cn.c[0] === iso ? cn.c[1] : cn.c[0];
    if (used.has(other) || !D[other]) return;
    used.add(other);
    var typeInfo = CONN_TYPES[cn.type] || CONN_TYPES.surprise;
    suggestions.push({ iso: other, reason: cn.title, type: 'conn', icon: typeInfo.icon });
  });

  // PRIORITY 2: Geographic neighbors (same continent, has content)
  var cont = CONT_MAP[iso];
  if (cont && suggestions.length < 3) {
    var sameCont = Object.keys(D).filter(function(k) {
      return CONT_MAP[k] === cont && !used.has(k);
    });
    var unvisitedSame = sameCont.filter(function(k) { return !visited.has(k) && !FAM.includes(k); });
    var neighborPool  = unvisitedSame.length > 0 ? unvisitedSame : sameCont;
    neighborPool.sort(function() { return Math.random() - 0.5; });
    var contName = CONT_NAMES_SHORT[cont] || cont;
    for (var i = 0; i < neighborPool.length && suggestions.length < 3; i++) {
      var nb = neighborPool[i];
      if (used.has(nb)) continue;
      used.add(nb);
      suggestions.push({ iso: nb, reason: 'Also in ' + contName, type: 'neighbor' });
    }
  }

  // PRIORITY 3: Thematic link — same export
  if (suggestions.length < 3 && XPORTS[iso]) {
    var myExport = XPORTS[iso].split(' ')[0].toLowerCase();
    var matches  = Object.keys(D).filter(function(k) {
      if (used.has(k)) return false;
      var xp = XPORTS[k];
      if (!xp) return false;
      return xp.toLowerCase().indexOf(myExport) >= 0;
    });
    matches.sort(function() { return Math.random() - 0.5; });
    for (var j = 0; j < matches.length && suggestions.length < 3; j++) {
      var m = matches[j];
      used.add(m);
      suggestions.push({
        iso: m,
        reason: 'Also makes ' + XPORTS[iso].split('&')[0].split(',')[0].trim().toLowerCase(),
        type: 'thematic',
      });
    }
  }

  // FALLBACK: If still under 2 suggestions, grab random unvisited with content
  if (suggestions.length < 2) {
    var fallbacks = Object.keys(D).filter(function(k) { return !used.has(k) && !visited.has(k); });
    fallbacks.sort(function() { return Math.random() - 0.5; });
    for (var f = 0; f < fallbacks.length && suggestions.length < 3; f++) {
      used.add(fallbacks[f]);
      suggestions.push({ iso: fallbacks[f], reason: 'Undiscovered', type: 'explore' });
    }
  }

  if (suggestions.length === 0) { tray.style.display = 'none'; return; }

  // Render pills
  suggestions.forEach(function(s) {
    var dd = D[s.iso];
    if (!dd) return;
    var pill = document.createElement('div');
    pill.className = 'wn-pill' + (s.type === 'conn' ? ' wn-conn' : '');

    var flagHtml = '';
    if (dd.fc && FL[dd.fc]) flagHtml = '<img class="wn-flag" src="' + FL[dd.fc] + '" alt="">';

    var reasonText = s.reason;
    if (s.type === 'conn' && s.icon) reasonText = s.icon + ' ' + reasonText;

    pill.innerHTML = flagHtml +
      '<div class="wn-info">' +
        '<div class="wn-name">'   + dd.n      + '</div>' +
        '<div class="wn-reason">' + reasonText + '</div>' +
      '</div>' +
      '<div class="wn-arrow">→</div>';

    pill.onclick = function(e) {
      e.stopPropagation();
      var target = s.iso;
      var pc = document.querySelector('.postcard');
      if (pc) {
        pc.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
        pc.style.transform  = 'translateY(8px)';
        pc.style.opacity    = '0.3';
      }
      setTimeout(function() {
        _ctx.showCard(target);
        if (s.type === 'conn') setTimeout(function() { switchTab('conn'); }, 400);
        if (pc) {
          pc.style.transform = 'translateY(-8px)';
          pc.style.opacity   = '0.3';
          requestAnimationFrame(function() {
            pc.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
            pc.style.transform  = 'translateY(0)';
            pc.style.opacity    = '1';
          });
        }
      }, 200);
    };

    opts.appendChild(pill);
  });

  tray.style.display = 'block';
}
