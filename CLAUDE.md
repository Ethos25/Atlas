# Atlas

Interactive world map for kids ages 2–10. D3.js + TopoJSON + Vite. Part of the Wizkoo product family (ReApproach Education). Ships as a Wizkoo embedded module first; architected to run standalone too.

## Commands

```
npm run dev    ← development server (use this)
npm run build  ← production build — run after every extraction; module count must grow by exactly the number of files added
```

## Visual Verification (Playwright)

Playwright (Chromium) is installed as a dev dependency. Use `screenshot.mjs` to visually verify changes:

```
# Start the dev server first (npm run dev), then in a second terminal:
node screenshot.mjs                          ← saves screenshot.png of localhost:5173
node screenshot.mjs http://localhost:5173 out.png  ← custom url/filename
```

The script waits for `networkidle` + 2 s of render time before capturing. Use it to sanity-check UI changes without opening a browser.

## Architecture

```
index.html          ← orchestrator: _boot(), HTML shell, CDN script tags (D3, TopoJSON)
src/
  main.js           ← Vite entry point
  js/
    config.js       ← standalone vs. embedded mode; init/mount/unmount API; theme overrides
    state.js        ← ONLY file allowed to touch localStorage
    map/
      init.js       ← initMap: D3 SVG, TopoJSON fetch, country paths, zoom, labels
      render.js     ← placeMarkers, recolorFamilyCountries, restoreVisitedCountries
      interactions.js ← onClick, pulseNearby, toggleUndiscovered
      lenses.js     ← LENSES data, toggleLens, clearLens, toggleLensPanel
    cards/
      postcard.js   ← country detail card (_showCard, switchTab, tgLM)
      connections.js← Friends & Foes connection cards
      swipe.js      ← card swipe navigation, history stack
      ocean-card.js ← ocean info overlay
      coming-soon.js← placeholder for unmapped countries
      where-next.js ← contextual "Where Next?" suggestion tray
    features/
      achievements.js  ← milestones, continent completion, surprise achievements
      challenges.js    ← Explorer Challenge quiz engine; exports isChalActive()
      recall-quiz.js   ← spaced-repetition recall quiz
      shake.js         ← shake-to-discover gesture
      siblings.js      ← sibling explorer bar
      story-prompt.js  ← "Story of the Day" connection prompt
      streaks.js       ← daily visit streaks
    ui/
      cold-open.js  ← first-launch flow, profile picker, revealWorld
      sounds.js     ← ia, chm, playSound, toggleMute
      effects.js    ← burst, fireConfetti
      tooltip.js    ← sTip, mTip, hTip
      search.js     ← country search overlay
  data/             ← all game content as JSON; fetched in _boot(), never inlined in JS
    countries.json · country-details.json · geo.json · flags.json
    connections.json · journeys.json · challenges.json
    achievements.json · secrets.json · exports.json · oceans.json
  styles/           ← CSS split by concern; main.css @imports all others
```

## Rules

- **Never rewrite from scratch.** Extract surgically — lift code out of `index.html`, place it in the right module, wire it back.
- **Every extraction must leave the app fully functional.**
- **All `localStorage` access goes through `state.js`.** No direct `localStorage` calls anywhere else.
- **Data lives in `src/data/*.json`, never inlined in JavaScript.**
- **D3 and TopoJSON stay as CDN `<script>` tags** in `index.html` until a future bundling step.
- **Module init pattern:** every module exports `initX(ctx)` where `ctx` supplies getter functions (`getD()`, `getFAM()`, …) so modules always read current state without stale closures.
- **`index.html` is the wiring layer.** It imports modules, builds ctx objects, and exposes window globals for HTML `onclick` handlers via `Object.assign(window, {…})`.
- **Embedding:** `config.js` controls mode. In module mode (`isModuleMode() === true`) the family setup flow is skipped and host-supplied data is used directly. Standalone mode is unchanged.
