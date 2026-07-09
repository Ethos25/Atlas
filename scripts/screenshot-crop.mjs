/**
 * Takes a zoomed screenshot of the magnifying glass icon area.
 */
import { chromium } from '@playwright/test';
import path from 'path';
import sharp from 'sharp';

const url = 'http://localhost:5173';

const browser = await chromium.launch({ headless: true });

// Use 2x device pixel ratio to simulate HiDPI
const page = await browser.newPage();
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

// Get the bounding box of the search icon button
const el = await page.$('.search-icon-btn');
const box = await el.boundingBox();
console.log('Search button box:', JSON.stringify(box));

// Full screenshot, then crop around the icon with padding
const full = path.resolve('screenshot-map.png');
await page.screenshot({ path: full });

// Crop a 200x200 region around the icon
const padding = 60;
await sharp(full).extract({
  left: Math.max(0, Math.round(box.x - padding)),
  top: Math.max(0, Math.round(box.y - padding)),
  width: Math.round(box.width + padding * 2),
  height: Math.round(box.height + padding * 2),
}).toFile('screenshot-icon-crop.png');

console.log('Cropped icon saved to screenshot-icon-crop.png');
await browser.close();
