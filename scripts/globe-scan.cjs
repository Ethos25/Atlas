const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const TARGETS = ['\uD83C\uDF0D', '\uD83C\uDF0E', '\uD83C\uDF0F', '\uD83C\uDF10']; // 🌍 🌎 🌏 🌐

function rel(fp) {
  return fp.replace(ROOT + path.sep, '').replace(/\\/g, '/');
}

function scanFile(fp) {
  let content;
  try { content = fs.readFileSync(fp, 'utf8'); } catch(e) { return []; }
  const hits = [];
  const lines = content.split('\n');
  lines.forEach(function(line, i) {
    TARGETS.forEach(function(em) {
      if (line.includes(em)) {
        hits.push({
          file:  rel(fp),
          line:  i + 1,
          emoji: em,
          text:  line.trim().slice(0, 120)
        });
      }
    });
  });
  return hits;
}

function walk(dir, ext, results) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(function(f) {
    var fp   = path.join(dir, f);
    var stat = fs.statSync(fp);
    if (stat.isDirectory()) walk(fp, ext, results);
    else if (!ext || f.endsWith(ext)) results.push.apply(results, scanFile(fp));
  });
}

var results = [];
results.push.apply(results, scanFile(path.join(ROOT, 'index.html')));
walk(path.join(ROOT, 'src', 'js'),     '.js',  results);
walk(path.join(ROOT, 'src', 'styles'), '.css', results);

['src/data/sets.json','src/data/connections.json',
 'src/data/countries.json','src/data/achievements.json']
  .forEach(function(f) {
    results.push.apply(results, scanFile(path.join(ROOT, f)));
  });

results.forEach(function(r) {
  console.log(r.emoji + '  ' + r.file + ':' + r.line + '  |  ' + r.text);
});
console.log('\nTOTAL HITS: ' + results.length);
