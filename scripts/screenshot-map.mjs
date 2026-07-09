/**
 * Screenshot helper that bypasses the cold-open setup screen
 * by pre-seeding localStorage with a minimal family profile.
 */
import { chromium } from '@playwright/test';
import path from 'path';

const url = process.argv[2] || 'http://localhost:5173';
const output = process.argv[3] || 'screenshot-map.png';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

// Seed localStorage so the app skips the cold-open flow
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => {
  localStorage.setItem('worldExplorer_family', JSON.stringify(['US']));
  localStorage.setItem('worldExplorer_names', JSON.stringify(['Test']));
});

// Reload with state set
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(2000);

// Wait for the app to finish bootstrapping
await page.waitForFunction(() => typeof window.revealWorld === 'function', { timeout: 10000 });
// Simulate the full cold-open flow: goBtn click hides cold screen, then revealWorld shows map
await page.evaluate(() => {
  // Step 1: hide the cold screen (goBtn click adds 'go' class)
  const cold = document.getElementById('cold');
  if (cold) cold.classList.add('go');
  // Step 2: reveal the world
  window.revealWorld();
});
await page.waitForTimeout(3000);

const outputPath = path.resolve(output);
await page.screenshot({ path: outputPath, fullPage: false });
console.log(`Screenshot saved to ${outputPath}`);

await browser.close();
