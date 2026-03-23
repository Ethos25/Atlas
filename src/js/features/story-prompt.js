/**
 * src/js/features/story-prompt.js
 * Story of the Day prompt — surfaces a connection card on map open.
 *
 * Call initStoryPrompt(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getCONNECTIONS()  → CONNECTIONS array
 *   getCONN_TYPES()   → CONN_TYPES object
 *   getD()            → D object
 *   getCurV()         → current card ISO | null
 *   ia()              → void
 *   showCard(iso)     → void
 *   switchTab(tab)    → void
 */

import { CONN_TYPES } from '../cards/connections.js';

let _ctx;
let storyPromptConn = null;

export function initStoryPrompt(ctx) {
  _ctx = ctx;
}

export function showStoryPrompt() {
  var CONNECTIONS = _ctx.getCONNECTIONS();
  var D           = _ctx.getD();
  var pool = Math.random() < 0.3
    ? CONNECTIONS.filter(function(c) { return c.familyRelevant; })
    : CONNECTIONS;
  if (pool.length === 0) pool = CONNECTIONS;
  var pick = pool[Math.floor(Math.random() * pool.length)];
  storyPromptConn = pick;
  var typeInfo = CONN_TYPES[pick.type] || CONN_TYPES.surprise;
  var c1 = D[pick.c[0]], c2 = D[pick.c[1]];
  var n1 = c1 ? c1.n : pick.c[0], n2 = c2 ? c2.n : pick.c[1];
  var hooks = [
    'Did you know? ' + pick.title + '.',
    n1 + ' and ' + n2 + ' have a secret...',
    pick.title + '. The story might surprise you.'
  ];
  var hook = hooks[Math.floor(Math.random() * hooks.length)];
  document.getElementById('spEmoji').textContent = typeInfo.icon;
  document.getElementById('spHook').textContent  = hook;
  setTimeout(function() {
    var el = document.getElementById('storyPrompt');
    if (el && !_ctx.getCurV()) el.classList.add('show');
  }, 3000);
  setTimeout(function() {
    var el = document.getElementById('storyPrompt');
    if (el) el.classList.remove('show');
  }, 18000);
}

export function openStoryPrompt() {
  var el = document.getElementById('storyPrompt');
  if (el) el.classList.remove('show');
  if (!storyPromptConn) return;
  var iso = storyPromptConn.c[0];
  var D   = _ctx.getD();
  if (iso && D[iso]) {
    _ctx.ia();
    _ctx.showCard(iso);
    setTimeout(function() { _ctx.switchTab('conn'); }, 600);
  }
}
