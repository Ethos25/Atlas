/**
 * Atlas Icon Processor (Node.js / sharp)
 * ---------------------------------------
 * For each source ui-[name].png in public/assets/:
 *   1. Converts to RGBA
 *   2. Removes black backgrounds (corners test + threshold alpha)
 *   3. Saves cleaned source back in place
 *   4. Generates -lg (120x120), -md (64x64), -sm (32x32), -xs (24x24) variants
 *
 * Usage: node process-icons.mjs
 */

import sharp from 'sharp';
import { readdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS    = path.join(__dirname, 'public', 'assets');
const THRESHOLD = 30;   // near-black pixel threshold for bg removal
const SIZES     = { lg: 120, md: 64, sm: 32, xs: 24 };

const BATCH2_ICONS = [
  'ui-globe-asia', 'ui-globe-americas', 'ui-globe-meridian',
  'ui-castle', 'ui-classical-building', 'ui-island',
  'ui-lion', 'ui-tiger', 'ui-whale', 'ui-kangaroo',
  'ui-drum', 'ui-giraffe', 'ui-diamond', 'ui-leaves',
  'ui-pagoda', 'ui-statue-liberty', 'ui-parrot', 'ui-ice',
  'ui-magnifying-glass', 'ui-mountain', 'ui-desert', 'ui-tree',
  'ui-snowflake', 'ui-camel', 'ui-mosque', 'ui-medal',
  'ui-scroll', 'ui-music-notes', 'ui-soccer', 'ui-chocolate',
  'ui-crown', 'ui-seedling', 'ui-writing-hand', 'ui-crystal-ball',
  'ui-eyes', 'ui-country-shape', 'ui-landscape', 'ui-wave',
  'ui-rocket', 'ui-polar-bear', 'ui-volcano',
  // Batch 1 re-process with newer source files
  'ui-globe', 'ui-flame', 'ui-heart', 'ui-star',
  'ui-party', 'ui-trophy', 'ui-compass',
];

/** Returns true if any corner pixel is near-black and opaque */
async function hasBlackBackground(imgPath) {
  const { data, info } = await sharp(imgPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;  // channels = 4 (RGBA)
  const corners = [
    0,                                          // top-left
    (width - 1) * channels,                    // top-right
    (height - 1) * width * channels,           // bottom-left
    ((height - 1) * width + (width - 1)) * channels, // bottom-right
  ];

  for (const offset of corners) {
    const r = data[offset], g = data[offset + 1], b = data[offset + 2], a = data[offset + 3];
    if (a > 200 && r <= THRESHOLD && g <= THRESHOLD && b <= THRESHOLD) return true;
  }
  return false;
}

/** Remove black background: convert near-black+opaque pixels to transparent */
async function removeBlackBg(srcPath, destPath) {
  const { data, info } = await sharp(srcPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const out = Buffer.from(data);

  for (let i = 0; i < out.length; i += channels) {
    const r = out[i], g = out[i + 1], b = out[i + 2], a = out[i + 3];
    if (a < 10) continue;  // already transparent

    const brightness = (r + g + b) / 3;
    if (r <= THRESHOLD && g <= THRESHOLD && b <= THRESHOLD) {
      // Hard cut: very dark pixel → transparent
      out[i + 3] = 0;
    } else if (brightness < THRESHOLD * 2) {
      // Soft fade: near-threshold → partial transparency
      out[i + 3] = Math.round((brightness / (THRESHOLD * 2)) * a);
    }
    // else: keep original alpha
  }

  await sharp(out, { raw: { width, height, channels } })
    .png()
    .toFile(destPath);
}

async function processIcon(name) {
  const srcPath = path.join(ASSETS, `${name}.png`);

  if (!existsSync(srcPath)) {
    console.log(`  SKIP   ${name}.png — source not found`);
    return;
  }

  // Check if all size variants already exist
  const allExist = Object.keys(SIZES).every(s =>
    existsSync(path.join(ASSETS, `${name}-${s}.png`))
  );
  if (allExist) {
    console.log(`  SKIP   ${name} — all variants exist`);
    return;
  }

  console.log(`  Processing ${name}.png ...`);

  const needsBgRemoval = await hasBlackBackground(srcPath);
  let workPath = srcPath;

  if (needsBgRemoval) {
    console.log(`    → black background detected — removing`);
    const tmpPath = srcPath.replace('.png', '.tmp.png');
    await removeBlackBg(srcPath, tmpPath);
    // Overwrite source with cleaned version
    await sharp(tmpPath).png().toFile(srcPath + '.clean');
    // We'll use the clean version for resizing
    workPath = tmpPath;
  } else {
    console.log(`    → transparent background — no removal needed`);
  }

  // Generate size variants
  for (const [suffix, size] of Object.entries(SIZES)) {
    const outPath = path.join(ASSETS, `${name}-${suffix}.png`);
    await sharp(workPath)
      .ensureAlpha()
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`    → ${name}-${suffix}.png  (${size}×${size})`);
  }

  // Commit clean version as the new source (if bg was removed)
  if (needsBgRemoval) {
    const tmpPath = srcPath.replace('.png', '.tmp.png');
    const cleanPath = srcPath + '.clean';
    if (existsSync(cleanPath)) {
      await sharp(cleanPath).png().toFile(srcPath);
      const { unlink } = await import('fs/promises');
      await unlink(cleanPath).catch(() => {});
      await unlink(tmpPath).catch(() => {});
    }
  }
}

async function main() {
  console.log(`Atlas Icon Processor`);
  console.log(`Assets: ${ASSETS}\n`);

  let processed = 0, skipped = 0;

  for (const name of BATCH2_ICONS) {
    const srcPath = path.join(ASSETS, `${name}.png`);
    if (!existsSync(srcPath)) { skipped++; continue; }

    const allExist = Object.keys(SIZES).every(s =>
      existsSync(path.join(ASSETS, `${name}-${s}.png`))
    );
    if (allExist) { console.log(`  SKIP   ${name}`); skipped++; continue; }

    await processIcon(name);
    processed++;
  }

  console.log(`\nDone. Processed: ${processed}, Skipped: ${skipped}`);
}

main().catch(err => { console.error(err); process.exit(1); });
