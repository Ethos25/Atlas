/**
 * src/js/ui/effects.js
 * Particle burst and confetti canvas animations.
 */

import { playSound } from './sounds.js';

/**
 * Radial particle burst at screen coordinates (x, y).
 * @param {number} x  clientX pixel
 * @param {number} y  clientY pixel
 * @param {string[]} cs  Array of CSS colour strings
 */
export function burst(x, y, cs) {
  const b = document.getElementById('pbox');
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('div');
    p.className = 'pt';
    const a = Math.PI * 2 * i / 18;
    const d = 30 + Math.random() * 60;
    p.style.cssText = `left:${x}px;top:${y}px;` +
      `width:${4 + Math.random() * 6}px;height:${4 + Math.random() * 6}px;` +
      `background:${cs[i % cs.length]};` +
      `--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d - 20}px`;
    b.appendChild(p);
    setTimeout(() => p.remove(), 850);
  }
}

/**
 * Full-screen confetti shower for a given duration in ms.
 * Plays milestone sound automatically.
 * @param {number} duration  milliseconds
 */
export function fireConfetti(duration) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;inset:0;z-index:999;pointer-events:none';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx    = canvas.getContext('2d');
  const colors = ['#D4884A','#C85E82','#B84040','#4A9A52','#D4B444','#3A9E9E','#FFD700','#FF6B6B','#7B68EE','#00CED1'];
  const emojis = ['🎉','🌍','🗺️','✦','⭐','🎊'];

  const particles = [];
  for (let i = 0; i < 120; i++) {
    particles.push({
      x:        canvas.width  * Math.random(),
      y:        -20 - Math.random() * 200,
      vx:       (Math.random() - 0.5) * 6,
      vy:       Math.random() * 4 + 2,
      size:     Math.random() * 8 + 4,
      color:    colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10,
      emoji:    Math.random() < 0.15 ? emojis[Math.floor(Math.random() * emojis.length)] : null,
      wobble:   Math.random() * 10,
    });
  }

  const start = Date.now();
  function animate() {
    const elapsed = Date.now() - start;
    if (elapsed > duration) { canvas.remove(); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x  += p.vx + Math.sin(elapsed / 200 + p.wobble) * 0.5;
      p.y  += p.vy;
      p.vy += 0.08;
      p.rotation += p.rotSpeed;
      const alpha = Math.max(0, 1 - (elapsed / duration) * 0.5);
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation * Math.PI / 180);
      ctx.globalAlpha = alpha;
      if (p.emoji) {
        ctx.font = p.size * 2 + 'px serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.emoji, 0, 0);
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    });
    requestAnimationFrame(animate);
  }
  animate();
  playSound('milestone');
}
