/**
 * src/js/config.js
 * Controls whether Atlas runs standalone or embedded inside Wizkoo (or any host).
 *
 * ── Standalone mode (default) ──────────────────────────────────────────────
 * Atlas boots normally: shows its own family setup flow, reads/writes
 * localStorage, and occupies the full page.  No action required.
 *
 * ── Module / embedded mode ─────────────────────────────────────────────────
 * A host app calls init() before Atlas's module script executes.  The cleanest
 * way to do this is to set window.ATLAS_CONFIG before the <script> tag:
 *
 *   window.ATLAS_CONFIG = {
 *     familyCountries: ['IRN', 'NGA', 'GBR', 'IRL', 'USA'], // ISO-3 codes
 *     playerNames:     ['Emma', 'Noah', 'Ava'],              // explorer names
 *     theme:           { '--c-accent': '#e07b30' },          // CSS custom props
 *     container:       document.getElementById('atlas-root'),// DOM element
 *   };
 *
 * Alternatively, if Wizkoo bundles Atlas as an ES module:
 *
 *   import { init, mount, unmount } from './src/js/config.js';
 *   init({ familyCountries: [...], playerNames: [...] });
 *   mount(document.getElementById('atlas-root'));
 *
 * In module mode Atlas skips its family setup flow and uses the host-supplied
 * data directly.  Call unmount() when the host wants to tear down Atlas.
 *
 * ── Container / layout note ────────────────────────────────────────────────
 * Atlas currently uses position:fixed for its overlay stack, which means it
 * always fills the full viewport.  Mounting into an arbitrary DOM container
 * (rather than taking over the full page) requires converting those rules to
 * position:absolute scoped to the container — tracked as a future CSS task.
 * mount() sets the groundwork (records the container, adds a class) so that
 * CSS work can be applied without further API changes.
 */

// ─── Internal state ────────────────────────────────────────────────────────

let _config      = null;
let _container   = null;       // recorded mount target (null = document.body)
const _cleanupFns = [];        // teardown callbacks registered by _boot

// ─── Auto-detect host config set before script execution ──────────────────

if (typeof window !== 'undefined' && window.ATLAS_CONFIG) {
  _applyConfig(window.ATLAS_CONFIG);
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * init — configure Atlas for embedded mode.
 *
 * Call before the Atlas module script loads (via window.ATLAS_CONFIG) or
 * immediately after importing this module (before DOMContentLoaded fires and
 * _boot() runs).  Calling with no argument resets to standalone mode.
 *
 * @param {Object} [config]
 * @param {string[]}  [config.familyCountries]  ISO-3 codes, e.g. ['IRN','USA']
 * @param {string[]}  [config.playerNames]       Display names, e.g. ['Emma']
 * @param {Object}    [config.theme]             CSS custom-property overrides
 * @param {Element}   [config.container]         DOM element to mount into
 */
export function init(config) {
  _applyConfig(config || null);
}

/**
 * True when a host has called init() with a config object (embedded mode).
 * False in normal standalone operation.
 */
export function isModuleMode() {
  return _config !== null;
}

/** Returns the active config object, or null in standalone mode. */
export function getConfig() {
  return _config;
}

/**
 * mount — declare the host container element for Atlas.
 *
 * In standalone mode this is a no-op.
 * In embedded mode it records the container for later cleanup and adds the
 * `atlas-embedded` class so a future CSS layer can scope the layout.
 *
 * Full position:fixed → position:absolute conversion (needed for true
 * sub-page embedding) is a separate CSS architecture task.
 *
 * @param {Element} containerEl
 */
export function mount(containerEl) {
  if (!containerEl || containerEl === document.body) return;
  _container = containerEl;
  _container.classList.add('atlas-embedded');
  // Future: move #atlasRoot children here and apply scoped layout CSS
}

/**
 * unmount — destroy the Atlas instance and clean up all side effects.
 *
 * Runs every function registered via registerCleanup() (event listeners,
 * D3 zoom callbacks, etc.), clears the D3 SVG, and resets internal state.
 * The host is responsible for removing the container element from the DOM
 * after calling unmount().
 */
export function unmount() {
  // 1. Run all registered teardown callbacks
  _cleanupFns.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
  _cleanupFns.length = 0;

  // 2. Detach D3 zoom so it stops intercepting wheel/touch events
  if (window._zoom && window._svg) {
    try { window._svg.on('.zoom', null); } catch (e) { /* ignore */ }
    window._zoom = null;
    window._svg  = null;
  }

  // 3. Remove atlas-embedded class from the recorded container
  if (_container) {
    _container.classList.remove('atlas-embedded');
    _container = null;
  }

  // 4. Reset config so isModuleMode() returns false
  _config = null;
}

/**
 * registerCleanup — internal API.
 * Called from _boot() for each global event listener Atlas attaches so that
 * unmount() can remove them without closing over live variables.
 *
 * @param {Function} fn  Zero-argument teardown callback.
 */
export function registerCleanup(fn) {
  if (typeof fn === 'function') _cleanupFns.push(fn);
}

// ─── Private helpers ───────────────────────────────────────────────────────

function _applyConfig(config) {
  if (config && typeof config === 'object') {
    _config = config;
    if (config.theme) _applyTheme(config.theme);
    if (config.container) _container = config.container;
  } else {
    _config = null;
  }
}

/**
 * Apply CSS custom-property overrides from the theme object.
 * Keys may be bare names ('c-ocean') or full custom-property names ('--c-ocean').
 */
function _applyTheme(theme) {
  Object.entries(theme).forEach(([prop, value]) => {
    const name = prop.startsWith('--') ? prop : '--' + prop;
    document.documentElement.style.setProperty(name, String(value));
  });
}
