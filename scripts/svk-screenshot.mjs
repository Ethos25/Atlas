import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 600 } });

await page.addInitScript(() => {
  localStorage.setItem('atlasV2_Mia', JSON.stringify({
    visited: ['SVK'], firstDiscDone: true,
    favorites: [], streakData: {},
    postcards: { SVK: { is_collected: true, collected_at: Date.now(), rarity: 'common' } }
  }));
});

await page.goto('http://localhost:5174');
await page.waitForTimeout(1000);

// Fill name and bypass family setup overlay via JS click
await page.evaluate(() => {
  const input = document.querySelector('input');
  if (input) { input.value = 'Mia'; input.dispatchEvent(new Event('input')); }
  const fs = document.getElementById('familySetup');
  if (fs) fs.style.pointerEvents = 'none';
});
await page.waitForTimeout(200);
await page.evaluate(() => { document.getElementById('goBtn')?.click(); });

await page.waitForTimeout(2500);
await page.evaluate(() => { if (window.showCard) window.showCard('SVK'); });
await page.waitForTimeout(1500);
await page.screenshot({ path: 'screenshot-svk.png' });
await browser.close();
console.log('Done');
