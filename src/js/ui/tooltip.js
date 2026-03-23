/**
 * src/js/ui/tooltip.js
 * Cursor-following hover tooltip for country names on the map.
 * Expects a <div id="tip"> element in the HTML.
 */

// Lazy lookup so the module can be imported before DOM is ready.
let _tip;
function tip() {
  if (!_tip) _tip = document.getElementById('tip');
  return _tip;
}

/** Show tooltip with content `t` at the position of mouse event `e`. */
export function sTip(e, t) {
  tip().innerHTML = t;
  tip().classList.add('show');
  mTip(e);
}

/** Move tooltip to follow mouse event `e`. */
export function mTip(e) {
  tip().style.left = (e.clientX + 14) + 'px';
  tip().style.top  = (e.clientY - 36) + 'px';
}

/** Hide tooltip. */
export function hTip() {
  tip().classList.remove('show');
}
