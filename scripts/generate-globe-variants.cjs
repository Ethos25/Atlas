/**
 * Generate sized variants of ui-globe.png using sharp.
 * Run: node scripts/generate-globe-variants.cjs
 *
 * Output:
 *   src/assets/ui-globe-lg.png  — 120×120  cold open splash, celebration overlays
 *   src/assets/ui-globe-md.png  —  64×64   set card icons, postcard headers
 *   src/assets/ui-globe-sm.png  —  32×32   sidebar buttons, inline icons, counter pills
 *   src/assets/ui-globe-xs.png  —  24×24   tab bar, small inline references
 */
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ROOT   = path.join(__dirname, '..');
const SRC    = path.join(ROOT, 'src', 'assets', 'ui-globe.png');
const OUTDIR = path.join(ROOT, 'src', 'assets');

if (!fs.existsSync(SRC)) {
  console.error('ERROR: source not found at', SRC);
  process.exit(1);
}

const variants = [
  { name: 'ui-globe-lg.png', size: 120, use: 'cold open splash, celebration overlays' },
  { name: 'ui-globe-md.png', size:  64, use: 'set card icons, postcard headers'       },
  { name: 'ui-globe-sm.png', size:  32, use: 'sidebar buttons, inline icons'          },
  { name: 'ui-globe-xs.png', size:  24, use: 'tab bar, small inline references'       },
];

async function run() {
  // Print source metadata first
  const meta = await sharp(SRC).metadata();
  console.log('Source: ' + SRC);
  console.log('  ' + meta.width + 'x' + meta.height + ' ' + meta.format
    + '  (' + (fs.statSync(SRC).size / 1024).toFixed(0) + ' KB)');
  console.log('');

  for (const v of variants) {
    const dest = path.join(OUTDIR, v.name);
    await sharp(SRC)
      .resize(v.size, v.size, {
        fit:                'contain',
        background:         { r: 0, g: 0, b: 0, alpha: 0 }, // transparent bg
        kernel:             sharp.kernel.lanczos3,           // high-quality downscale
        withoutEnlargement: true,
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(dest);

    const sizeKB = (fs.statSync(dest).size / 1024).toFixed(1);
    console.log('  ✓  ' + v.name.padEnd(22) + v.size + 'x' + v.size
      + '  ' + sizeKB.padStart(6) + ' KB  →  ' + v.use);
  }
  console.log('\nDone. All variants written to src/assets/');
}

run().catch(function(err) { console.error(err); process.exit(1); });
