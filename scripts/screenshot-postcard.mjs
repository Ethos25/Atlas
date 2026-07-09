/**
 * screenshot-postcard.mjs
 * Opens the Atlas app, bypasses cold-open, opens Romania's postcard,
 * taps through the envelope, and captures the open postcard card.
 *
 * Usage: node screenshot-postcard.mjs [url] [output.png]
 */
import { chromium } from 'playwright';

const url    = process.argv[2] || 'http://localhost:5174';
const output = process.argv[3] || 'postcard-screenshot.png';

(async () => {
  const browser = await chromium.launch();
  const ctx     = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page    = await ctx.newPage();

  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Bypass cold-open: use existing Dean profile (or inject fake state)
  await page.evaluate(() => {
    const key = 'worldExplorer_lastPlayer';
    const player = localStorage.getItem(key);
    if (!player) {
      // Inject a minimal profile so _boot() skips setup
      localStorage.setItem('worldExplorer_lastPlayer', 'Dean');
    }
  });

  // Hide any setup overlays and open Romania card
  await page.evaluate(() => {
    const cold = document.getElementById('cold');
    const fam  = document.getElementById('familySetup');
    if (cold) { cold.style.display = 'none'; }
    if (fam)  { fam.style.display  = 'none'; }
    if (typeof showCard === 'function') showCard('ROU');
  });

  await page.waitForTimeout(800);

  // Click the envelope card to open the postcard (dispatch directly to bypass intercept)
  await page.evaluate(() => {
    const envCard = document.getElementById('envCard') || document.querySelector('[class*="env-card"]');
    if (envCard) envCard.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  });
  await page.waitForTimeout(1400); // wait for card animation

  // Measure zones
  const measurements = await page.evaluate(() => {
    const card = document.querySelector('#cOv .postcard');
    if (!card) return { error: 'no postcard' };
    const zones = {
      topbar:  card.querySelector('.pc-topbar'),
      header:  card.querySelector('.pc-header'),
      tabs:    card.querySelector('.pc-tabs'),
      content: card.querySelector('#tabContentStory'),
      whereNext: card.querySelector('#whereNext'),
    };
    const result = {
      cardH:   Math.round(card.getBoundingClientRect().height),
      vh:      window.innerHeight,
      nameText: (card.querySelector('#pcName') || {}).textContent || '',
      flagSrc:  card.querySelector('#pcFlag img') ? card.querySelector('#pcFlag img').src.split('/').pop() : 'NO IMG',
    };
    Object.keys(zones).forEach(k => {
      const el = zones[k];
      result[k] = el ? Math.round(el.getBoundingClientRect().height) : 'missing';
    });
    return result;
  });

  console.log('\n=== POSTCARD LAYOUT MEASUREMENTS ===');
  console.log(JSON.stringify(measurements, null, 2));

  await page.screenshot({ path: output, fullPage: false });
  console.log(`\nScreenshot saved to ${output}`);
  await browser.close();
})();
