/**
 * Generate sized variants of all custom UI icons using sharp.
 * Run: node scripts/generate-icon-variants.cjs
 *
 * Output (public/assets/):
 *   ui-[name]-lg.png  — 120×120
 *   ui-[name]-md.png  —  64×64
 *   ui-[name]-sm.png  —  32×32
 *   ui-[name]-xs.png  —  24×24
 */
const sharp = require('sharp');
const path  = require('path');
const fs    = require('fs');

const ROOT   = path.join(__dirname, '..');
const SRCDIR = path.join(ROOT, 'public', 'assets');
const OUTDIR = path.join(ROOT, 'public', 'assets');

const ICONS = ['ui-flame', 'ui-heart', 'ui-star', 'ui-party', 'ui-trophy', 'ui-compass'];
const SIZES = [
  { suffix: 'lg', size: 120, use: 'celebration overlays, large badges' },
  { suffix: 'md', size:  64, use: 'card icons, postcard headers'        },
  { suffix: 'sm', size:  32, use: 'sidebar buttons, inline icons'       },
  { suffix: 'xs', size:  24, use: 'tab bar, small inline references'    },
];

async function run() {
  let total = 0;
  for (const icon of ICONS) {
    const src = path.join(SRCDIR, icon + '.png');
    if (!fs.existsSync(src)) {
      console.error('MISSING: ' + src);
      continue;
    }
    const meta = await sharp(src).metadata();
    console.log('\n' + icon + '.png  (' + meta.width + 'x' + meta.height + ')');

    for (const v of SIZES) {
      const dest = path.join(OUTDIR, icon + '-' + v.suffix + '.png');
      await sharp(src)
        .resize(v.size, v.size, {
          fit:                'contain',
          background:         { r: 0, g: 0, b: 0, alpha: 0 },
          kernel:             sharp.kernel.lanczos3,
          withoutEnlargement: true,
        })
        .png({ compressionLevel: 9, adaptiveFiltering: true })
        .toFile(dest);

      const sizeKB = (fs.statSync(dest).size / 1024).toFixed(1);
      console.log('  ✓  ' + (icon + '-' + v.suffix + '.png').padEnd(26)
        + v.size + 'x' + v.size
        + '  ' + sizeKB.padStart(6) + ' KB  →  ' + v.use);
      total++;
    }
  }
  console.log('\nDone. ' + total + ' files written to public/assets/');
}

run().catch(function(err) { console.error(err); process.exit(1); });
