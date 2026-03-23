/**
 * Emoji inventory scanner for Atlas.
 * Uses Intl.Segmenter to correctly handle multi-codepoint emoji sequences
 * (e.g. 🐻‍❄️ = polar bear is 4 codepoints but one grapheme cluster).
 *
 * Skips invisible modifier codepoints (FE0F, 200D) when standalone.
 */
const fs   = require('fs');
const path = require('path');

// Quick test: is a grapheme cluster "visually an emoji"?
// We use the Unicode General_Category + codepoint ranges.
function isEmoji(cluster) {
  // Skip pure variation selectors / ZWJ / spaces
  if (/^[\uFE00-\uFE0F\u200D\u200B\s]+$/.test(cluster)) return false;
  // Has any codepoint in the emoji ranges?
  const cp = cluster.codePointAt(0);
  return (
    (cp >= 0x1F000 && cp <= 0x1FAFF) ||  // Emoji block, Mahjong, playing cards, etc.
    (cp >= 0x2600  && cp <= 0x27BF)  ||  // Misc symbols, Dingbats
    (cp >= 0x2300  && cp <= 0x23FF)  ||  // Misc technical (clocks, etc.)
    (cp >= 0x2B00  && cp <= 0x2BFF)  ||  // Misc symbols and arrows
    (cp >= 0x1F1E0 && cp <= 0x1F1FF) ||  // Regional indicators (flags)
    cp === 0x231A || cp === 0x231B   ||  // Watch, hourglass
    cp === 0x2614 || cp === 0x2615   ||  // Umbrella with rain, hot beverage
    cp === 0x26A1 ||                     // Lightning bolt
    false
  );
}

const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

const counts  = {};   // em -> total count across all occurrences
const byFile  = {};   // em -> deduplicated list of "file:line | snippet"

function scanText(content, label) {
  const lines = content.split('\n');
  lines.forEach(function(line, idx) {
    const segs    = [...segmenter.segment(line)].map(s => s.segment);
    const found   = [...new Set(segs.filter(isEmoji))];
    if (!found.length) return;
    found.forEach(function(em) {
      counts[em]  = (counts[em] || 0) + 1;
      if (!byFile[em]) byFile[em] = [];
      const key   = label + ':' + (idx + 1);
      const snip  = line.trim().slice(0, 90);
      // deduplicate by file:line
      if (!byFile[em].find(e => e.startsWith(key))) {
        byFile[em].push(key + '  →  ' + snip);
      }
    });
  });
}

function scanFile(fp) {
  try {
    const content = fs.readFileSync(fp, 'utf8');
    const label   = fp.replace(path.join(__dirname, '..') + path.sep, '').replace(/\\/g, '/');
    scanText(content, label);
  } catch(e) {}
}

function walk(dir, ext) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(function(f) {
    const fp   = path.join(dir, f);
    const stat = fs.statSync(fp);
    if (stat.isDirectory()) walk(fp, ext);
    else if (!ext || f.endsWith(ext)) scanFile(fp);
  });
}

const root = path.join(__dirname, '..');

scanFile(path.join(root, 'index.html'));
walk(path.join(root, 'src', 'js'),     '.js');
walk(path.join(root, 'src', 'styles'), '.css');
['sets.json', 'connections.json', 'achievements.json']
  .forEach(function(f) { scanFile(path.join(root, 'src', 'data', f)); });

// Sort by total count desc
const sorted = Object.entries(counts).sort(function(a, b) { return b[1] - a[1]; });

// Print compact output
sorted.forEach(function(entry) {
  const em  = entry[0];
  const ct  = entry[1];
  console.log('\n=== ' + em + '  ×' + ct + ' ===');
  byFile[em].forEach(function(loc) { console.log('  ' + loc); });
});

console.log('\n\nTOTAL UNIQUE EMOJI: ' + sorted.length);
