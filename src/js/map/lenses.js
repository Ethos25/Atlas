/**
 * src/js/map/lenses.js
 * Lens (data overlay) system — filters world map by category.
 *
 * Exports: initLenses, isActiveLens, toggleLens, clearLens, toggleLensPanel
 *
 * initLenses(ctx) must be called after _boot() with:
 *   ctx.getFAM()  → string[]   active family country ISO codes
 *   ctx.getD()    → object     country data (to build country names for desc)
 */

const LENSES = {
  biggest: {
    icon: '🏔️',
    title: 'The 10 BIGGEST Countries',
    desc: 'These 10 countries are SO big, they take up more than HALF of all the land on Earth!',
    countries: ['RUS','CAN','USA','CHN','BRA','AUS','IND','ARG','KAZ','DZA'],
  },
  population: {
    icon: '👶',
    title: 'Where the MOST People Live',
    desc: 'More people live in these 10 countries than in all the other countries COMBINED!',
    countries: ['CHN','IND','USA','IDN','PAK','NGA','BRA','BGD','RUS','MEX'],
  },
  english: {
    icon: '🗣️',
    title: 'Countries That Speak English',
    desc: 'All these countries speak English, but they ALL sound completely different!',
    countries: ['USA','GBR','IRL','AUS','NZL','CAN','NGA','KEN','ZAF','IND','PAK','PHL','JAM','GHA','TTO','SLE','LBR','BWA','ZMB','ZWE','UGA','TZA','MWI','SGP','GUY','SUR'],
  },
  spanish: {
    icon: '💃',
    title: 'Countries That Speak Spanish',
    desc: 'Spanish started in ONE country (Spain) and spread across the whole world!',
    countries: ['ESP','MEX','COL','ARG','PER','VEN','CHL','ECU','GTM','CUB','BOL','DOM','HND','PRY','SLV','NIC','CRI','PAN','URY','GNQ'],
  },
  monarchy: {
    icon: '<img src="/assets/ui-crown-xs.png" alt="crown" style="width:24px;height:24px;vertical-align:middle">',
    title: 'Countries with a King or Queen',
    desc: 'These countries still have royalty! Some kings and queens have real power, some are just fancy.',
    countries: ['GBR','ESP','NOR','SWE','DNK','NLD','BEL','JPN','THA','SAU','JOR','MAR','KWT','QAT','ARE','OMN','BHR','MYS','KHM','LSO','SWZ','BWA','TTO'],
  },
  equator: {
    icon: '☀️',
    title: 'Countries on the Equator',
    desc: 'The equator is an invisible line around the middle of Earth. These countries sit RIGHT on it!',
    countries: ['ECU','COL','BRA','GAB','COG','COD','UGA','KEN','SOM','IDN','GNQ'],
  },
  islands: {
    icon: '<img src="/assets/ui-island-xs.png" alt="island" style="width:24px;height:24px;vertical-align:middle">',
    title: 'Island Countries',
    desc: 'These countries are COMPLETELY surrounded by water! Some are one island, some are thousands.',
    countries: ['JPN','IDN','PHL','AUS','NZL','GBR','IRL','ISL','CUB','JAM','MDG','LKA','SGP','TTO','PNG'],
  },
  oldest: {
    icon: '<img src="/assets/ui-scroll-xs.png" alt="scroll" style="width:24px;height:24px;vertical-align:middle">',
    title: 'The Oldest Countries on Earth',
    desc: 'These places have been home to civilizations for THOUSANDS of years. History started here.',
    countries: ['IRN','EGY','CHN','GRC','IND','IRQ','ETH','JPN','MEX','PER'],
  },
  richest: {
    icon: '💰',
    title: 'Countries with the MOST Money',
    desc: 'These countries have the highest wealth per person. Some are tiny but VERY rich!',
    countries: ['LUX','SGP','IRL','QAT','CHE','NOR','USA','DNK','AUS','ISL','NLD','AUT','SWE','DEU','CAN'],
  },
  growing: {
    icon: '<img src="/assets/ui-seedling-xs.png" alt="seedling" style="width:24px;height:24px;vertical-align:middle">',
    title: 'Countries Growing the FASTEST',
    desc: 'These countries are building their future faster than anyone. Watch out world!',
    countries: ['IND','BGD','VNM','ETH','PHL','IDN','TZA','RWA','KHM','UZB','MNG','KEN','GHA','SEN','NPL'],
  },
  // NOTE: 'family' and 'favorites' are dynamic lenses — built at toggle time from live state.
};

/**
 * Return a plain ISO-array map for each static lens, for use by missions.js.
 * { biggest: [...], islands: [...], ... }
 */
export function getLensesMap() {
  const out = {};
  Object.keys(LENSES).forEach(function (k) {
    out[k] = LENSES[k].countries || [];
  });
  return out;
}

let _ctx = null;
let activeLens = null;
var lensExpanded = false;

/**
 * Wire lenses to live state.
 * Must be called in _boot() after data loads.
 * @param {{ getFAM: () => string[], getD: () => object, getFavorites: () => Set }} ctx
 */
export function initLenses(ctx) {
  _ctx = ctx;
}

/** Build the 'family' lens dynamically from the active player's family countries. */
function _buildFamilyLens() {
  const fam = _ctx ? _ctx.getFAM() : [];
  if (!fam || fam.length === 0) return null;
  const D = _ctx ? _ctx.getD() : {};
  const names = fam.map(iso => (D[iso] && D[iso].n) || iso).join(', ');
  return {
    icon: '<img src="/assets/ui-heart-xs.png" alt="heart" style="width:24px;height:24px;vertical-align:middle">',
    title: 'YOUR Family Countries',
    desc: 'These are the places that made YOU — ' + names + '.',
    countries: fam.slice(),
  };
}

/** Build the 'favorites' lens dynamically from the player's saved favorites. */
function _buildFavoritesLens() {
  const favs = _ctx ? [..._ctx.getFavorites()] : [];
  if (favs.length === 0) return null;
  const D = _ctx ? _ctx.getD() : {};
  const names = favs.map(iso => (D[iso] && D[iso].n) || iso).join(', ');
  return {
    icon: '♡',
    title: 'Your Favorite Countries',
    desc: 'The countries you love most: ' + names + '.',
    countries: favs,
  };
}

export function isActiveLens() { return activeLens !== null; }

export function toggleLens(lensId) {
  if (activeLens === lensId) { clearLens(); return; }

  // Resolve dynamic lenses
  let lens;
  if (lensId === 'family') {
    lens = _buildFamilyLens();
    if (!lens) {
      // No family countries saved — show a brief hint and bail
      const hint = document.createElement('div');
      hint.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:40;background:rgba(16,24,38,0.92);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:var(--r-md);padding:8px 16px;font-family:Inter,system-ui,sans-serif;font-size:12px;color:rgba(255,255,255,0.55);opacity:0;transition:opacity 0.3s;pointer-events:none';
      hint.textContent = 'Set up your family countries first';
      document.body.appendChild(hint);
      setTimeout(() => { hint.style.opacity = '1'; }, 20);
      setTimeout(() => { hint.style.opacity = '0'; setTimeout(() => hint.remove(), 300); }, 2500);
      return;
    }
  } else if (lensId === 'favorites') {
    lens = _buildFavoritesLens();
    if (!lens) {
      const hint = document.createElement('div');
      hint.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);z-index:40;background:rgba(16,24,38,0.92);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);border-radius:var(--r-md);padding:8px 16px;font-family:Inter,system-ui,sans-serif;font-size:12px;color:rgba(255,255,255,0.55);opacity:0;transition:opacity 0.3s;pointer-events:none';
      hint.textContent = 'Tap ♡ on any country postcard to add a favorite';
      document.body.appendChild(hint);
      setTimeout(() => { hint.style.opacity = '1'; }, 20);
      setTimeout(() => { hint.style.opacity = '0'; setTimeout(() => hint.remove(), 300); }, 2500);
      return;
    }
  } else {
    lens = LENSES[lensId];
  }

  if (!lens) return;
  activeLens = lensId;

  // Update button states
  document.querySelectorAll('.sb-lens').forEach(b => b.classList.remove('active'));
  const lensEl = document.getElementById('lens_' + lensId);
  if (lensEl) lensEl.classList.add('active');

  // Show info bar
  const titleEl = document.getElementById('lensTitle');
  const descEl  = document.getElementById('lensDesc');
  const infoEl  = document.getElementById('lensInfo');
  if (titleEl) titleEl.innerHTML = lens.icon + ' ' + lens.title;
  if (descEl)  descEl.textContent  = lens.desc;
  if (infoEl)  infoEl.classList.add('show');

  // Dim all countries, light up matching ones
  const matchSet = new Set(lens.countries);
  document.querySelectorAll('.country').forEach(el => {
    const a = el.getAttribute('data-a');
    if (matchSet.has(a)) {
      el.classList.remove('country-dimmed');
      el.classList.add('country-lit');
    } else {
      el.classList.remove('country-lit');
      el.classList.add('country-dimmed');
    }
  });

  document.querySelectorAll('.ocean-creature').forEach(el => el.style.opacity = '0');
  document.querySelectorAll('.mm,.mm-heart').forEach(el => el.style.opacity = '0.15');
}

export function clearLens() {
  activeLens = null;
  document.querySelectorAll('.sb-lens').forEach(b => b.classList.remove('active'));
  const infoEl = document.getElementById('lensInfo');
  if (infoEl) infoEl.classList.remove('show');

  document.querySelectorAll('.country').forEach(el => {
    el.classList.remove('country-dimmed');
    el.classList.remove('country-lit');
  });

  document.querySelectorAll('.ocean-creature').forEach(el => el.style.opacity = '');
  document.querySelectorAll('.mm,.mm-heart').forEach(el => el.style.opacity = '1');
}

export function toggleLensPanel() {
  lensExpanded = !lensExpanded;
  var g = document.getElementById('sbLensGroup');
  if (g) g.style.display = lensExpanded ? 'flex' : 'none';
  var t = document.getElementById('lensToggle');
  if (t) t.classList.toggle('active', lensExpanded);
}
