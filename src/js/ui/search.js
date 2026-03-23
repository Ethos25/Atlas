/**
 * src/js/ui/search.js
 * Country search bar — toggle, input handling, and result selection.
 *
 * Call initSearch({ D, FL, showCard }) after data has loaded.
 */

let _D, _FL, _showCard;

/** Wire up search to the app's data and card-display function. */
export function initSearch({ D, FL, showCard }) {
  _D = D;
  _FL = FL;
  _showCard = showCard;
}

/** Toggle the search bar open/closed. */
export function toggleSearch() {
  const box = document.getElementById('searchBox');
  const res = document.getElementById('searchResults');
  if (box.classList.contains('on')) {
    box.classList.remove('on');
    res.classList.remove('on');
  } else {
    box.classList.add('on');
    document.getElementById('searchInput').focus();
  }
}

/**
 * Filter countries by `val` and render results.
 * Called from oninput on the search <input>.
 */
export function doSearch(val) {
  const res = document.getElementById('searchResults');
  if (!val || val.length < 2) { res.classList.remove('on'); return; }
  const q = val.toLowerCase();
  const matches = Object.entries(_D)
    .filter(([, d]) => d.n.toLowerCase().includes(q))
    .slice(0, 8);
  if (!matches.length) { res.classList.remove('on'); return; }
  res.innerHTML = matches.map(([iso, d]) => {
    const flag = _FL[d.fc]
      ? '<img src="' + _FL[d.fc] + '" style="width:16px;height:auto;border-radius:1px;vertical-align:middle;margin-right:6px">'
      : '';
    return '<div class="sr-item" onclick="selectSearch(\'' + iso + '\')">' + flag + d.n + '</div>';
  }).join('');
  res.classList.add('on');
}

/**
 * Called when a result row is tapped.
 * Closes the search bar and opens the country postcard.
 */
export function selectSearch(iso) {
  document.getElementById('searchBox').classList.remove('on');
  document.getElementById('searchResults').classList.remove('on');
  document.getElementById('searchInput').value = '';
  if (_D[iso]) _showCard(iso);
}
