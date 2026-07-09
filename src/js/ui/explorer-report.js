/**
 * src/js/ui/explorer-report.js
 * Explorer Report overlay — per-explorer stats card + family share text.
 *
 * Call initExplorerReport(ctx) inside _boot() after data loads.
 * Exposes openExplorerReport, closeExplorerReport for HTML onclick via Object.assign.
 *
 * ctx shape:
 *   getD()            → { [iso]: countryData }
 *   getCONT_MAP()     → { [iso]: continentCode }
 *   getCONT_COL()     → { [code]: { base, bright, stroke } }
 *   getFAMILY_NAMES() → string[]
 *   getFAM()          → string[]
 *   getAnimalFor(name)→ string
 *   loadGameFn(name)  → save object | null
 */

let _ctx = null;

var CONT_FULL_ER = {
  NA: 'N. America', SA: 'S. America', EU: 'Europe',
  AF: 'Africa', AS: 'Asia', OC: 'Oceania', AN: 'Antarctica'
};

var CONT_ORDER_ER = ['AS', 'NA', 'SA', 'EU', 'AF', 'OC'];

export function initExplorerReport(ctx) {
  _ctx = ctx;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function openExplorerReport() {
  var ov = document.getElementById('reportOv');
  if (!ov) return;
  _buildReport();
  ov.classList.add('on');
}

export function closeExplorerReport() {
  var ov = document.getElementById('reportOv');
  if (ov) ov.classList.remove('on');
}

// ── Share text ────────────────────────────────────────────────────────────────

export function generateShareText() {
  var names     = _ctx.getFAMILY_NAMES();
  var FAM       = _ctx.getFAM();
  var D         = _ctx.getD();
  var CONT_MAP  = _ctx.getCONT_MAP();
  var total     = Object.keys(D).length;

  var union = new Set(FAM);
  names.forEach(function(n) {
    var d = _ctx.loadGameFn(n);
    if (d && d.visited) d.visited.forEach(function(iso) { union.add(iso); });
  });
  var percent = total > 0 ? Math.round(union.size / total * 100) : 0;
  var familyLabel = names.length > 0 ? names[0] + "'s family" : 'Our family';

  var lines = [
    '\uD83C\uDF0D The ' + familyLabel + ' has explored ' + percent + '% of the world!',
  ];
  names.forEach(function(name) {
    var stats = getExplorerStats(name);
    var animal = _ctx.getAnimalFor(name);
    lines.push(animal + ' ' + name + ': ' + stats.countries + ' countries across ' + stats.continents + ' continents');
  });
  lines.push('Made with Atlas by Wizkoo \u2728');
  return lines.join('\n');
}

// ── Per-explorer stats ────────────────────────────────────────────────────────

export function getExplorerStats(playerName) {
  var d = _ctx.loadGameFn(playerName);
  var D        = _ctx.getD();
  var CONT_MAP = _ctx.getCONT_MAP();
  var FAM      = _ctx.getFAM();

  if (!d) {
    return {
      countries: FAM.length, continents: 0, sets: 0, streak: 0,
      favorite: null, rarity: { uncommon: 0, rare: 0, legendary: 0 },
      lastPlayed: null
    };
  }

  // Union visited + FAM
  var visitedArr = d.visited || [];
  var visitedSet = new Set(visitedArr);
  FAM.forEach(function(iso) { visitedSet.add(iso); });
  var countries = visitedSet.size;

  // Continents touched
  var contSet = new Set();
  visitedSet.forEach(function(iso) {
    var c = CONT_MAP[iso];
    if (c && c !== 'AN') contSet.add(c);
  });
  var continents = contSet.size;

  // Sets completed
  var sets = d.sets_completed || 0;

  // Streak
  var streak = d.streakCount || 0;

  // Favorite continent (most visited)
  var contCounts = {};
  visitedSet.forEach(function(iso) {
    var c = CONT_MAP[iso];
    if (c && c !== 'AN') contCounts[c] = (contCounts[c] || 0) + 1;
  });
  var favorite = null;
  var maxCount = 0;
  Object.keys(contCounts).forEach(function(c) {
    if (contCounts[c] > maxCount) { maxCount = contCounts[c]; favorite = c; }
  });

  // Rarity from postcards
  var postcards = d.postcards || {};
  var rarity = { uncommon: 0, rare: 0, legendary: 0 };
  Object.keys(postcards).forEach(function(iso) {
    var r = postcards[iso] && postcards[iso].rarity;
    if (r === 'uncommon')  rarity.uncommon++;
    else if (r === 'rare') rarity.rare++;
    else if (r === 'legendary') rarity.legendary++;
  });

  // Last played
  var lastPlayed = d.lastPlayed ? _formatDate(d.lastPlayed) : null;

  return { countries, continents, sets, streak, favorite, rarity, lastPlayed };
}

// ── Build the report DOM ──────────────────────────────────────────────────────

function _buildReport() {
  var body  = document.getElementById('reportBody');
  if (!body) return;
  var names    = _ctx.getFAMILY_NAMES();
  var CONT_COL = _ctx.getCONT_COL();
  var FAM      = _ctx.getFAM();
  var D        = _ctx.getD();
  var CONT_MAP = _ctx.getCONT_MAP();
  var total    = Object.keys(D).length;

  // Family aggregate for header
  var union = new Set(FAM);
  names.forEach(function(n) {
    var d = _ctx.loadGameFn(n);
    if (d && d.visited) d.visited.forEach(function(iso) { union.add(iso); });
  });
  var percent = total > 0 ? Math.round(union.size / total * 100) : 0;
  var familyLabel = names.length > 0 ? names[0] + "'s family" : 'Your family';

  var html = '<div class="report-family-header">' +
    '<div class="report-family-name">' + familyLabel + '</div>' +
    '<div class="report-family-pct"><b>' + percent + '%</b> of the world explored</div>' +
    '<div class="report-pct-bar-track"><div class="report-pct-bar-fill" style="width:' + percent + '%"></div></div>' +
    '</div>';

  names.forEach(function(name) {
    var stats  = getExplorerStats(name);
    var animal = _ctx.getAnimalFor(name);
    var favCC  = stats.favorite && CONT_COL[stats.favorite];
    var favColor = (favCC && favCC.base) ? favCC.base : '#8C91A5';
    var favName  = stats.favorite ? (CONT_FULL_ER[stats.favorite] || stats.favorite) : '—';

    // Continent dots row
    var dotsHtml = CONT_ORDER_ER.map(function(c) {
      var cc    = CONT_COL[c];
      var color = (cc && cc.base) ? cc.base : '#50556E';
      // Check if this explorer visited any country in this continent
      var d = _ctx.loadGameFn(name);
      var visitedSet = new Set(d ? (d.visited || []) : []);
      FAM.forEach(function(iso) { visitedSet.add(iso); });
      var touched = false;
      visitedSet.forEach(function(iso) { if (CONT_MAP[iso] === c) touched = true; });
      return '<div class="report-cont-dot" title="' + (CONT_FULL_ER[c] || c) + '" style="background:' + (touched ? color : '#50556E') + ';opacity:' + (touched ? '1' : '0.35') + '"></div>';
    }).join('');

    var raritySummary = '';
    if (stats.rarity.uncommon + stats.rarity.rare + stats.rarity.legendary > 0) {
      raritySummary = '<div class="report-rarity">Uncommon: ' + stats.rarity.uncommon +
        ' \u00B7 Rare: ' + stats.rarity.rare +
        ' \u00B7 Legendary: ' + stats.rarity.legendary + '</div>';
    }

    html += '<div class="report-card">' +
      '<div class="report-card-header">' +
        '<span class="report-animal">' + animal + '</span>' +
        '<span class="report-name">' + name + '</span>' +
      '</div>' +
      '<div class="report-stat">' + stats.countries + ' countries discovered</div>' +
      '<div class="report-stat">' +
        '<span>' + stats.continents + ' of 6 continents</span>' +
        '<span class="report-cont-dots">' + dotsHtml + '</span>' +
      '</div>' +
      '<div class="report-stat">' + stats.sets + ' sets completed</div>' +
      '<div class="report-stat" style="color:' + favColor + '">Favorite continent: ' + favName + '</div>' +
      '<div class="report-stat">\uD83D\uDD25 ' + stats.streak + (stats.streak === 1 ? ' day' : ' days') + ' streak</div>' +
      raritySummary +
      (stats.lastPlayed ? '<div class="report-last-played">Last explored: ' + stats.lastPlayed + '</div>' : '') +
    '</div>';
  });

  body.innerHTML = html;
}

// ── Share handler ─────────────────────────────────────────────────────────────

export function shareExplorerReport() {
  var text = generateShareText();
  var btn  = document.getElementById('reportShareBtn');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      if (btn) { btn.textContent = 'Copied!'; setTimeout(function() { btn.textContent = 'Share Family Progress'; }, 2000); }
    }).catch(function() { _fallbackCopy(text, btn); });
  } else {
    _fallbackCopy(text, btn);
  }
}

function _fallbackCopy(text, btn) {
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    if (btn) { btn.textContent = 'Copied!'; setTimeout(function() { btn.textContent = 'Share Family Progress'; }, 2000); }
  } catch (e) {
    if (btn) btn.textContent = 'Could not copy';
  }
  document.body.removeChild(ta);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function _formatDate(isoString) {
  try {
    var d = new Date(isoString);
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
  } catch (e) { return null; }
}
