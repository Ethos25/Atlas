/**
 * Playwright screenshot helper.
 * Usage: node screenshot.mjs [url] [output]
 * Defaults: url=http://localhost:5173, output=screenshot.png
 */
import { chromium } from '@playwright/test';
import path from 'path';

const url = process.argv[2] || 'http://localhost:5173';
const output = process.argv[3] || 'screenshot.png';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.setViewportSize({ width: 1280, height: 800 });

console.log(`Navigating to ${url}...`);
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

// Give the map a moment to render
await page.waitForTimeout(2000);

const outputPath = path.resolve(output);
await page.screenshot({ path: outputPath, fullPage: false });
console.log(`Screenshot saved to ${outputPath}`);

await browser.close();
