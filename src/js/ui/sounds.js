/**
 * src/js/ui/sounds.js
 * All synthesised audio for Atlas. No other module may create AudioContexts.
 */

// ── Chime system (milestone / family-country discovery) ──────────────────────
let actx;
function ia() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); }

export { ia };   // exposed so onClick() can warm the AudioContext on first tap

export function chm(fam) {
  ia();
  (fam ? [440, 554, 659, 880] : [523, 659, 784]).forEach((f, i) => {
    setTimeout(() => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(fam ? .08 : .06, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + (fam ? .5 : .3));
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + (fam ? .5 : .3));
    }, i * (fam ? 120 : 80));
  });
}

export function milestoneSound() {
  ia();
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    setTimeout(() => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      g.gain.setValueAtTime(0.1, actx.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + 0.6);
      o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + 0.6);
    }, i * 100);
  });
}

// ── Synthesised tap / UI sounds ───────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx;
let muted = false;

export function toggleMute() {
  muted = !muted;
  const icon = document.getElementById('muteIcon');
  if (icon) icon.textContent = muted ? '🔇' : '🔊';
}

export function playSound(type) {
  try {
    if (muted) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g   = audioCtx.createGain();
    osc.connect(g); g.connect(audioCtx.destination);

    if (type === 'tap') {
      osc.frequency.value = 800; g.gain.value = 0.06; osc.type = 'sine';
      osc.start(t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08); osc.stop(t + 0.08);

    } else if (type === 'discover') {
      osc.frequency.value = 523; g.gain.value = 0.08; osc.type = 'sine'; osc.start(t);
      osc.frequency.exponentialRampToValueAtTime(784, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); osc.stop(t + 0.3);
      const o2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();
      o2.connect(g2); g2.connect(audioCtx.destination);
      o2.frequency.value = 526; g2.gain.value = 0.04; o2.type = 'sine'; o2.start(t);
      o2.frequency.exponentialRampToValueAtTime(787, t + 0.15);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o2.stop(t + 0.3);

    } else if (type === 'milestone') {
      osc.frequency.value = 440; g.gain.value = 0.1; osc.type = 'triangle'; osc.start(t);
      osc.frequency.exponentialRampToValueAtTime(880, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.8); osc.stop(t + 0.8);

    } else if (type === 'journey') {
      osc.frequency.value = 440; g.gain.value = 0.08; osc.type = 'triangle'; osc.start(t);
      osc.frequency.exponentialRampToValueAtTime(660, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.4); osc.stop(t + 0.4);
      const o2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();
      o2.connect(g2); g2.connect(audioCtx.destination);
      o2.frequency.value = 660; g2.gain.value = 0.06; o2.type = 'triangle'; o2.start(t + 0.12);
      o2.frequency.exponentialRampToValueAtTime(880, t + 0.22);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.5); o2.stop(t + 0.5);

    } else if (type === 'correct') {
      osc.frequency.value = 523; g.gain.value = 0.08; osc.type = 'triangle'; osc.start(t);
      osc.frequency.exponentialRampToValueAtTime(659, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); osc.stop(t + 0.3);

    } else if (type === 'wrong') {
      osc.frequency.value = 400; g.gain.value = 0.06; osc.type = 'sine'; osc.start(t);
      osc.frequency.exponentialRampToValueAtTime(350, t + 0.15);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); osc.stop(t + 0.25);

    } else if (type === 'tab') {
      osc.frequency.value = 1200; g.gain.value = 0.03; osc.type = 'sine';
      osc.start(t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); osc.stop(t + 0.04);
    }
  } catch (e) {}
}
