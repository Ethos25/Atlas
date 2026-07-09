/**
 * Compares the magnifying glass icon at 1x vs 2x device pixel ratio.
 */
import { chromium } from '@playwright/test';
import sharp from 'sharp';

const url = 'http://localhost:5173';

async function capture(dpr, filename) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ deviceScaleFactor: dpr });
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('worldExplorer_family', JSON.stringify(['US']));
    localStorage.setItem('worldExplorer_names', JSON.stringify(['Test']));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.revealWorld === 'function', { timeout: 10000 });
  await page.evaluate(() => {
    const cold = document.getElementById('cold');
    if (cold) cold.classList.add('go');
    window.revealWorld();
  });
  await page.waitForTimeout(2000);

  const el = await page.$('.search-icon-btn');
  const box = await el.boundingBox();

  const full = `screenshot-hidpi-${dpr}x-full.png`;
  await page.screenshot({ path: full });

  // Crop with padding (CSS pixels, sharp uses actual pixels = CSS * dpr)
  const pad = 60;
  await sharp(full).extract({
    left:   Math.max(0, Math.round((box.x - pad) * dpr)),
    top:    Math.max(0, Math.round((box.y - pad) * dpr)),
    width:  Math.round((box.width  + pad * 2) * dpr),
    height: Math.round((box.height + pad * 2) * dpr),
  }).resize(300).toFile(filename);  // resize to same display size for comparison

  console.log(`${dpr}x screenshot saved to ${filename}`);
  await browser.close();
}

await capture(1, 'screenshot-1x-icon.png');
await capture(2, 'screenshot-2x-icon.png');
