/**
 * src/js/features/siblings.js
 * Sibling discovery counter bar.
 *
 * Call initSiblings(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getFAMILY_NAMES() → string[]
 *   getPlayerName()   → string
 *   getVisited()      → Set<string>
 *   getFAM()          → string[]
 */

import { loadGame } from '../state.js';

let _ctx;

export function initSiblings(ctx) {
  _ctx = ctx;
}

export function updateSiblingBar() {
  var bar = document.getElementById('sibBar');
  if (!bar) return;
  var names      = _ctx.getFAMILY_NAMES();
  var playerName = _ctx.getPlayerName();
  var visited    = _ctx.getVisited();
  var FAM        = _ctx.getFAM();
  var chips = [];
  var anyOther = false;
  names.forEach(function(n) {
    var count = 0;
    if (n === playerName) {
      count = visited.size + FAM.filter(function(k) { return !visited.has(k); }).length;
    } else {
      var d = loadGame(n);
      count = d && d.visited
        ? d.visited.length + FAM.filter(function(k) { return !d.visited.includes(k); }).length
        : 0;
    }
    if (count === 0) return;
    if (n !== playerName) anyOther = true;
    var isActive = n === playerName;
    chips.push('<div class="sib-chip' + (isActive ? ' sib-active' : '') + '"><span class="sib-n">' + count + '</span> ' + n + '</div>');
  });
  if (anyOther) {
    bar.innerHTML = chips.join('');
    bar.classList.add('show');
  } else {
    bar.classList.remove('show');
  }
}
