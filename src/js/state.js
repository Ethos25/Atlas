/**
 * src/js/state.js
 * Single gateway for all localStorage access in Atlas.
 * No other file may call localStorage directly.
 *
 * Player identity uses a UUID as the storage key, not the display name.
 * Display names are stored inside the save object and in a name→UUID index.
 * This prevents save collisions when two players share a name, and allows
 * renaming a player without orphaning their data.
 */

const SAVE_KEY   = 'worldExplorer_';
const FAMILY_KEY = 'worldExplorer_family';
const NAMES_KEY  = 'worldExplorer_names';
const UUID_KEY   = 'worldExplorer_uid_'; // name → UUID index

// ── UUID helpers ─────────────────────────────────────────────────────────────

function _generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

/**
 * Return the UUID for a named player, creating one if this is their first save.
 * On first creation, migrates any existing name-keyed save data to the UUID key.
 * @param {string} name  Player display name
 * @returns {string}     UUID string
 */
function getOrCreatePlayerUUID(name) {
  if (!name || name === 'Explorer') return name; // fallback for anonymous
  const idxKey = UUID_KEY + name;
  let uuid = localStorage.getItem(idxKey);
  if (!uuid) {
    uuid = _generateUUID();
    localStorage.setItem(idxKey, uuid);
    // Migrate: if a legacy name-keyed save exists, move it to the UUID key
    const legacyKey = SAVE_KEY + name;
    const legacy = localStorage.getItem(legacyKey);
    if (legacy) {
      localStorage.setItem(SAVE_KEY + uuid, legacy);
      localStorage.removeItem(legacyKey);
    }
  }
  return uuid;
}

// ── Schema migration ──────────────────────────────────────────────────────────

/**
 * Rarity lookup map, populated by setRarityMap() once rarity.json is fetched
 * in _boot().  Used by _migrateToV3() so that migrated legacy postcards receive
 * their correct rarity instead of the 'common' placeholder.
 */
let _rarityMap = null;

/**
 * Register the flat ISO→rarity lookup loaded from rarity.json.
 * Must be called in _boot() before any loadGame() call that may trigger migration.
 * @param {Object} map  e.g. { "VAT": "legendary", "USA": "common", ... }
 */
export function setRarityMap(map) {
  _rarityMap = map;
}

/**
 * Resolve a country's rarity from the registered map.
 * Falls back to 'common' if the map hasn't been loaded yet or the ISO is unknown.
 * @param {string} iso
 * @returns {'common'|'uncommon'|'rare'|'legendary'}
 */
export function getRarityForISO(iso) {
  if (_rarityMap && _rarityMap[iso]) return _rarityMap[iso];
  return 'common';
}

/**
 * Migrate a pre-v3 save (no postcards) to schema version 3.
 *
 * v1/v2 saves have no schemaVersion field (or schemaVersion < 3).
 * Migration converts the visited[] array into the postcards{} map.
 * Uses the rarity map registered via setRarityMap() if available, so
 * migrated postcards receive their correct rarity on first load.
 *
 * Does NOT persist; the next saveGame() call writes the v3 shape back.
 *
 * @param {object} raw  Parsed save data (any schema version)
 * @returns {object}    v3-shaped save data
 */
function _migrateToV3(raw) {
  if (raw.schemaVersion >= 3) return raw; // already current

  const visited   = Array.isArray(raw.visited)   ? raw.visited   : [];
  const favorites = Array.isArray(raw.favorites) ? raw.favorites : [];
  const favSet    = new Set(favorites);

  // Convert visited[] → postcards{} using live rarity data where available
  const postcards = {};
  visited.forEach(iso => {
    postcards[iso] = {
      id:              iso,
      country_iso:     iso,
      collected_at:    null,              // legacy saves carry no timestamp
      is_collected:    true,
      is_favorite:     favSet.has(iso),
      rarity:          getRarityForISO(iso), // correct rarity if map is loaded
      set_memberships: [],                // recomputed by collection.js on load
    };
  });

  return {
    ...raw,
    schemaVersion:   3,
    postcards,
    sets_progress:   raw.sets_progress   || {},
    total_collected: visited.length,
    sets_completed:  raw.sets_completed  || 0,
  };
}

// ── Per-player game save ─────────────────────────────────────────────────────

/**
 * Persist a player's full game state, keyed by UUID.
 * @param {string} playerName
 * @param {{ visited: string[], favorites: string[], firstDiscDone: boolean,
 *            lastMilestone: number, lastPlayed: string, lastQuizScore: any,
 *            schemaVersion: number, postcards: object, sets_progress: object,
 *            total_collected: number, sets_completed: number }} data
 */
export function saveGame(playerName, data) {
  if (!playerName || playerName === 'Explorer') return;
  try {
    const uuid = getOrCreatePlayerUUID(playerName);
    localStorage.setItem(SAVE_KEY + uuid, JSON.stringify({ ...data, playerName }));
    localStorage.setItem(SAVE_KEY + 'lastPlayer', playerName);
  } catch (e) { console.warn('Save failed:', e); }
}

/**
 * Load a player's saved game state by display name, or null if none exists.
 * Transparently resolves name → UUID → save data.
 * Automatically migrates pre-v3 saves to schema version 3 on read.
 * @param {string} name
 * @returns {object|null}
 */
export function loadGame(name) {
  try {
    const uuid = getOrCreatePlayerUUID(name);
    const raw  = localStorage.getItem(SAVE_KEY + uuid);
    if (!raw) return null;
    return _migrateToV3(JSON.parse(raw));
  } catch (e) { return null; }
}

/** Return the name of the most recently active player. */
export function getLastPlayer() {
  try { return localStorage.getItem(SAVE_KEY + 'lastPlayer') || ''; }
  catch (e) { return ''; }
}

// ── Family setup ─────────────────────────────────────────────────────────────

/** Load the saved array of family country ISO codes, or null. */
export function loadFamilyData() {
  try {
    const raw = localStorage.getItem(FAMILY_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

/**
 * Persist family countries and player names together.
 * @param {string[]} countries  ISO codes
 * @param {string[]} names      Player display names
 */
export function saveFamilyData(countries, names) {
  try {
    localStorage.setItem(FAMILY_KEY, JSON.stringify(countries));
    localStorage.setItem(NAMES_KEY, JSON.stringify(names));
  } catch (e) {}
}

/** Load the saved array of family player names, or null. */
export function loadFamilyNames() {
  try {
    const raw = localStorage.getItem(NAMES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

// ── Player age ────────────────────────────────────────────────────────────────

/**
 * Load the age for a named player.  Defaults to 5 if never set.
 * Stored as a single lightweight key separate from the main save object so
 * the cold-open wizard and the For Parents modal can update it without
 * reading/writing the full save blob.
 * @param {string} name  Player display name
 * @returns {number}     Age (integer, 2–10)
 */
export function loadPlayerAge(name) {
  try {
    const uuid = getOrCreatePlayerUUID(name);
    const raw  = localStorage.getItem(SAVE_KEY + uuid + '_age');
    return raw !== null ? Math.max(2, parseInt(raw, 10)) : 5;
  } catch (e) { return 5; }
}

/**
 * Persist the age for a named player.
 * Clamped to the range 2–10.
 * @param {string} name  Player display name
 * @param {number} age
 */
export function savePlayerAge(name, age) {
  try {
    const uuid   = getOrCreatePlayerUUID(name);
    const clamped = Math.max(2, Math.min(10, Math.round(age)));
    localStorage.setItem(SAVE_KEY + uuid + '_age', String(clamped));
  } catch (e) {}
}

// ── Achievement flags ─────────────────────────────────────────────────────────

/**
 * Check whether a continent-completion milestone has already been shown.
 * Keyed by player UUID so renames do not lose achievement history.
 * @param {string} playerName
 * @param {string} key  e.g. 'contDone_AS'
 */
export function hasContDone(playerName, key) {
  const uuid = getOrCreatePlayerUUID(playerName);
  return !!localStorage.getItem(SAVE_KEY + uuid + '_' + key);
}

/** Record that a continent-completion milestone has been shown. */
export function setContDone(playerName, key) {
  try {
    const uuid = getOrCreatePlayerUUID(playerName);
    localStorage.setItem(SAVE_KEY + uuid + '_' + key, '1');
  } catch (e) {}
}

/**
 * Check whether a surprise achievement has already been awarded.
 * Keyed by player UUID.
 * @param {string} playerName
 * @param {string} id  Achievement id
 */
export function hasSurpriseAch(playerName, id) {
  const uuid = getOrCreatePlayerUUID(playerName);
  return !!localStorage.getItem(SAVE_KEY + uuid + '_sa_' + id);
}

/** Record that a surprise achievement has been awarded. */
export function setSurpriseAch(playerName, id) {
  try {
    const uuid = getOrCreatePlayerUUID(playerName);
    localStorage.setItem(SAVE_KEY + uuid + '_sa_' + id, '1');
  } catch (e) {}
}

// ── Daily Missions persistence ────────────────────────────────────────────────

/**
 * Load the daily mission state for a player.
 * @param {string} playerName
 * @returns {{ completed: string[], stamps: number }}
 */
export function loadMissionsData(playerName) {
  try {
    const uuid = getOrCreatePlayerUUID(playerName);
    const raw  = localStorage.getItem(SAVE_KEY + uuid + '_missions');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { completed: [], stamps: 0 };
}

/**
 * Persist the daily mission state for a player.
 * @param {string} playerName
 * @param {{ completed: string[], stamps: number }} data
 */
export function saveMissionsData(playerName, data) {
  try {
    const uuid = getOrCreatePlayerUUID(playerName);
    localStorage.setItem(SAVE_KEY + uuid + '_missions', JSON.stringify(data));
  } catch (e) {}
}

// ── Weekly Mystery persistence ────────────────────────────────────────────────

/**
 * Load the mystery country state for a player.
 * @param {string} playerName
 * @returns {{ solved: string[], badges: string[] }}
 */
export function loadMysteryData(playerName) {
  try {
    const uuid = getOrCreatePlayerUUID(playerName);
    const raw  = localStorage.getItem(SAVE_KEY + uuid + '_mystery');
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return { solved: [], badges: [] };
}

/**
 * Persist the mystery country state for a player.
 * @param {string} playerName
 * @param {{ solved: string[], badges: string[] }} data
 */
export function saveMysteryData(playerName, data) {
  try {
    const uuid = getOrCreatePlayerUUID(playerName);
    localStorage.setItem(SAVE_KEY + uuid + '_mystery', JSON.stringify(data));
  } catch (e) {}
}

// ── Journey state persistence ─────────────────────────────────────────────────

/**
 * Load the active journey state for a player.
 * @param {string} playerName
 * @returns {{ journeyId: string, currentIndex: number, startedAt: string } | null}
 */
export function loadJourneyState(playerName) {
  try {
    const uuid = getOrCreatePlayerUUID(playerName);
    const raw  = localStorage.getItem(SAVE_KEY + uuid + '_journey');
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
}

/**
 * Persist the active journey state. Pass null to clear.
 * @param {string} playerName
 * @param {{ journeyId: string, currentIndex: number, startedAt: string } | null} state
 */
export function saveJourneyState(playerName, state) {
  try {
    const uuid = getOrCreatePlayerUUID(playerName);
    const key  = SAVE_KEY + uuid + '_journey';
    if (state === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, JSON.stringify(state));
    }
  } catch (e) {}
}

// ── Full reset ────────────────────────────────────────────────────────────────

/** Remove every Atlas key from localStorage (saves, UUIDs, family data). */
export function clearAllData() {
  const keys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith('worldExplorer')) keys.push(k);
  }
  keys.forEach(k => localStorage.removeItem(k));
}
