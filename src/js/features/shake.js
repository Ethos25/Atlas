/**
 * src/js/features/shake.js
 * Shake-to-discover and spacebar random country.
 *
 * Call initShake(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getD()        → D object
 *   getFAM()      → FAM array
 *   getVisited()  → visited Set
 *   getCurV()     → current card ISO | null
 *   ia()          → void
 *   playSound(t)  → void
 *   showCard(iso) → void
 */

let _ctx;
let lastShakeTime = 0;
const shakeThreshold = 15;
let shakeLastX = null, shakeLastY = null, shakeLastZ = null;

export function initShake(ctx) {
  _ctx = ctx;

  // Device-motion listener (mobile shake)
  if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', function(e) {
      var acc = e.accelerationIncludingGravity;
      if (!acc) return;
      if (shakeLastX !== null) {
        var dx = Math.abs(acc.x - shakeLastX);
        var dy = Math.abs(acc.y - shakeLastY);
        var dz = Math.abs(acc.z - shakeLastZ);
        if (dx > shakeThreshold || dy > shakeThreshold || dz > shakeThreshold) {
          var now = Date.now();
          if (now - lastShakeTime > 2500) {
            lastShakeTime = now;
            shakeDiscover();
          }
        }
      }
      shakeLastX = acc.x; shakeLastY = acc.y; shakeLastZ = acc.z;
    });
  }

  // Spacebar random country (desktop)
  document.addEventListener('keydown', function(e) {
    if (e.code !== 'Space') return;
    var cold = document.getElementById('cold');
    if (cold && !cold.classList.contains('go')) return;
    if (_ctx.getCurV()) return;
    if (document.getElementById('chalOv').classList.contains('on')) return;
    if (document.getElementById('jOv').classList.contains('on')) return;
    e.preventDefault();
    shakeDiscover();
  });

  // Show shake hint on touch devices after 8 s
  setTimeout(function() {
    if (window.DeviceMotionEvent && 'ontouchstart' in window) {
      var h = document.getElementById('shakeHint');
      if (h) h.classList.add('show');
      setTimeout(function() { if (h) h.classList.remove('show'); }, 5000);
    }
  }, 8000);
}

export function shakeDiscover() {
  var D       = _ctx.getD();
  var FAM     = _ctx.getFAM();
  var visited = _ctx.getVisited();
  var undiscovered = Object.keys(D).filter(function(k) {
    return !visited.has(k) && !FAM.includes(k);
  });
  if (undiscovered.length === 0) return;
  var pick = undiscovered[Math.floor(Math.random() * undiscovered.length)];
  _ctx.ia();
  _ctx.playSound('discover');
  var svg = document.getElementById('mapSvg');
  if (svg) {
    svg.style.transition = 'filter 0.2s';
    svg.style.filter = 'brightness(1.3)';
    setTimeout(function() { svg.style.filter = ''; svg.style.transition = ''; }, 300);
  }
  setTimeout(function() { _ctx.showCard(pick); }, 350);
}
