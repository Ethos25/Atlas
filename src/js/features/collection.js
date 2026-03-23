/**
 * src/js/features/collection.js
 * Postcard collection state management.
 *
 * Manages the postcards map, sets_progress, total_collected, and sets_completed
 * that live in the player's v3 save object.  No DOM access here — pure data layer.
 *
 * Call initCollection(ctx) inside _boot() after sets.json is loaded.
 * Call reinitCollection() whenever the active player changes (onPickName).
 *
 * ctx shape:
 *   getPostcards()          → { [iso]: postcard }
 *   getSetsProgress()       → { [setId]: { collected: string[], completed_at: number|null } }
 *   getSETS()               → sets definition object (from sets.json)
 *   getRARITY()             → { [iso]: 'common'|'uncommon'|'rare'|'legendary' }
 *   getFAM()                → string[]  — family ISO codes
 *   getPlayerName()         → string
 *   saveGame()              → void
 *   setPostcards(map)       → void
 *   setSetsProgress(obj)    → void
 *   setTotalCollected(n)    → void
 *   setSetsCompleted(n)     → void
 *
 * Postcard shape:
 *   { id, country_iso, collected_at, is_collected, is_favorite, rarity, set_memberships }
 *
 * Rarity values: 'common' | 'uncommon' | 'rare' | 'legendary'
 * Rarity defaults to 'common' until rarity.json (Priority 3) is wired in.
 */

let _ctx = null;

// ── Init ─────────────────────────────────────────────────────────────────────

export function initCollection(ctx) {
  _ctx = ctx;
  _recomputeAllSetProgress();
}

/**
 * Re-sync set progress and totals against the current player's postcards.
 * Call after swapping active player in onPickName.
 */
export function reinitCollection() {
  _recomputeAllSetProgress();
  _recomputeTotals();
}

// ── Postcard operations ───────────────────────────────────────────────────────

/**
 * Mark a country as collected.  Creates or updates the postcard object,
 * then recomputes set progress and totals.
 *
 * @param {string} iso         ISO-3 country code
 * @param {string} [rarity]    Override rarity (optional). If omitted the rarity
 *                             is resolved from rarity.json via getRARITY(), with
 *                             'common' as the final fallback.
 * @param {number} [timestamp] Unix ms; defaults to Date.now()
 * @returns {object}           The postcard object
 */
export function collectPostcard(iso, rarity, timestamp = Date.now()) {
  const postcards   = _ctx.getPostcards();
  const existing    = postcards[iso];
  const rarityMap   = _ctx.getRARITY();

  // Priority: explicit arg > existing saved rarity > rarity.json lookup > 'common'
  const resolvedRarity = rarity
    || (existing && existing.rarity)
    || (rarityMap && rarityMap[iso])
    || 'common';

  const postcard = {
    id:              iso,
    country_iso:     iso,
    collected_at:    (existing && existing.collected_at) ? existing.collected_at : timestamp,
    is_collected:    true,
    is_favorite:     (existing && existing.is_favorite) ? existing.is_favorite : false,
    rarity:          resolvedRarity,
    set_memberships: _getSetMemberships(iso),
  };

  postcards[iso] = postcard;
  _ctx.setPostcards(postcards);

  _recomputeTotals();
  _recomputeAllSetProgress();

  return postcard;
}

/**
 * Get a postcard by ISO.  Returns a stub (is_collected: false) if not yet collected.
 * @param {string} iso
 * @returns {object}
 */
export function getPostcard(iso) {
  const postcards = _ctx.getPostcards();
  if (postcards[iso]) return postcards[iso];
  return {
    id:              iso,
    country_iso:     iso,
    collected_at:    null,
    is_collected:    false,
    is_favorite:     false,
    rarity:          'common',
    set_memberships: _getSetMemberships(iso),
  };
}

/**
 * Toggle the favorite flag on a collected postcard.
 * No-op if the postcard hasn't been collected yet.
 * @param {string} iso
 */
export function toggleFavoritePostcard(iso) {
  const postcards = _ctx.getPostcards();
  if (!postcards[iso]) return;
  postcards[iso].is_favorite = !postcards[iso].is_favorite;
  _ctx.setPostcards(postcards);
}

/** @returns {number} Count of collected postcards for the active player. */
export function getTotalCollected() {
  const postcards = _ctx.getPostcards();
  return Object.values(postcards).filter(p => p.is_collected).length;
}

// ── Set progress ──────────────────────────────────────────────────────────────

/**
 * Returns the full sets_progress map for the active player.
 * @returns {{ [setId]: { collected: string[], completed_at: number|null } }}
 */
export function getSetsProgress() {
  return _ctx.getSetsProgress();
}

/**
 * Returns set definitions with my_family.countries patched from live FAM data.
 * All callers should use this instead of getSETS() directly.
 * @returns {object}
 */
export function getEffectiveSets() {
  return _effectiveSets();
}

/**
 * Returns all sets where the player is exactly 1 card away from completing.
 * Used by the "one-away" engine (Priority 6).
 * @returns {Array<{ setId: string, setName: string, missing: string }>}
 */
export function getOneAwaySets() {
  const progress = _ctx.getSetsProgress();
  const SETS     = _effectiveSets();
  const results  = [];

  for (const [setId, setDef] of Object.entries(SETS)) {
    const sp = progress[setId];
    if (!sp || sp.completed_at !== null) continue; // skip completed or uninitialised
    const countries = setDef.countries || [];
    if (countries.length === 0) continue;           // my_family not yet populated
    const remaining = countries.filter(iso => !sp.collected.includes(iso));
    if (remaining.length === 1) {
      results.push({ setId, setName: setDef.name, missing: remaining[0] });
    }
  }
  return results;
}

/**
 * Returns the IDs of all sets that were just completed by a given collection.
 * Caller should fire reward animations for each returned set.
 * @param {string} iso  The ISO code that was just collected.
 * @returns {string[]}  Array of newly completed set IDs (may be empty).
 */
export function getNewlyCompletedSets(iso) {
  const progress = _ctx.getSetsProgress();
  const SETS     = _effectiveSets();
  const completed = [];

  for (const [setId, setDef] of Object.entries(SETS)) {
    const sp = progress[setId];
    if (!sp) continue;
    if (sp.completed_at !== null) continue; // already done before this discovery
    const countries = setDef.countries || [];
    if (countries.includes(iso) && sp.collected.length === countries.length) {
      completed.push(setId);
    }
  }
  return completed;
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Build the effective sets object: identical to SETS but with my_family.countries
 * replaced by the current player's FAM array.
 */
function _effectiveSets() {
  const SETS = _ctx.getSETS();
  const FAM  = _ctx.getFAM();
  const out  = Object.assign({}, SETS);
  if (out.my_family) {
    out.my_family = Object.assign({}, out.my_family, { countries: FAM.slice() });
  }
  return out;
}

/**
 * Derive which sets a given ISO belongs to (across all effective sets).
 * @param {string} iso
 * @returns {string[]}
 */
function _getSetMemberships(iso) {
  const SETS = _effectiveSets();
  return Object.keys(SETS).filter(setId => (SETS[setId].countries || []).includes(iso));
}

/** Sync total_collected counter from the postcards map. */
function _recomputeTotals() {
  _ctx.setTotalCollected(getTotalCollected());
}

/**
 * Walk every set in SETS, rebuild its collected[] from the postcards map,
 * mark completion timestamps, and sync the sets_completed counter.
 */
function _recomputeAllSetProgress() {
  if (!_ctx) return;
  const SETS      = _effectiveSets();
  const postcards = _ctx.getPostcards();
  const progress  = _ctx.getSetsProgress();

  let completedCount = 0;

  for (const [setId, setDef] of Object.entries(SETS)) {
    const countries = setDef.countries || [];
    if (countries.length === 0) continue; // skip my_family if FAM is empty

    if (!progress[setId]) {
      progress[setId] = { collected: [], completed_at: null };
    }

    // Re-derive collected list from the postcards map (single source of truth)
    const collected = countries.filter(iso => postcards[iso] && postcards[iso].is_collected);
    progress[setId].collected = collected;

    // Stamp completion the first time all countries are in
    if (collected.length === countries.length && !progress[setId].completed_at) {
      progress[setId].completed_at = Date.now();
    }

    if (progress[setId].completed_at !== null) completedCount++;
  }

  _ctx.setSetsProgress(progress);
  _ctx.setSetsCompleted(completedCount);
}
