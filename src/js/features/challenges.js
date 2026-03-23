/**
 * src/js/features/challenges.js
 * Explorer Challenge quiz engine.
 *
 * Call initChallenges(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getCHALLENGES()  → CHALLENGES array
 *   getD()           → D object
 *   getFL()          → FL object
 *   getVisited()     → Set<string>
 *   getFAM()         → string[]
 *   getPlayerName()  → string
 */

import { playSound }    from '../ui/sounds.js';
import { fireConfetti } from '../ui/effects.js';

let _ctx;
let chalActive = false, chalCurrent = null, chalQueue = [], chalScore = 0, chalTotal = 0;

export function initChallenges(ctx) {
  _ctx = ctx;
}

export function startChallenge() {
  chalScore = 0; chalTotal = 0;
  const visited    = _ctx.getVisited();
  const FAM        = _ctx.getFAM();
  const CHALLENGES = _ctx.getCHALLENGES();
  const visitedOrFam = new Set([...visited, ...FAM]);
  const relevant   = CHALLENGES.filter(function(c) { return visitedOrFam.has(c.a); });
  const pool       = relevant.length >= 5 ? relevant : [...CHALLENGES];
  chalQueue = [...pool];
  for (let i = chalQueue.length - 1; i > 0; i--) {
    const j = 0 | Math.random() * (i + 1);
    [chalQueue[i], chalQueue[j]] = [chalQueue[j], chalQueue[i]];
  }
  chalQueue  = chalQueue.slice(0, 5);
  chalActive = true;
  nextChallenge();
}

export function nextChallenge() {
  const D          = _ctx.getD();
  const FL         = _ctx.getFL();
  const playerName = _ctx.getPlayerName();
  if (chalQueue.length === 0) {
    document.getElementById('chalEmoji').innerHTML = chalScore >= 5
      ? '<img src="/assets/ui-party-sm.png" alt="party" style="width:32px;height:32px;vertical-align:middle">'
      : '<img src="/assets/ui-trophy-sm.png" alt="trophy" style="width:32px;height:32px;vertical-align:middle">';
    document.getElementById('chalQ').textContent     = playerName + ' got ' + chalScore + ' out of ' + chalTotal + '!';
    document.getElementById('chalOpts').innerHTML    = '';
    document.getElementById('chalResult').style.display = 'none';
    document.getElementById('chalScore').textContent =
      chalScore >= 5 ? 'PERFECT SCORE!' : chalScore >= 3 ? 'Great job!' : 'Keep exploring and try again!';
    if (chalScore >= 5) setTimeout(() => fireConfetti(4000), 200);
    else if (chalScore >= 3) setTimeout(() => fireConfetti(2000), 200);
    const nb = document.getElementById('chalNext');
    nb.style.display = 'flex'; nb.textContent = 'Play Again';
    nb.onclick = () => {
      document.getElementById('chalOv').classList.remove('on');
      chalActive = false;
      setTimeout(startChallenge, 300);
    };
    return;
  }
  chalCurrent = chalQueue.shift();
  document.getElementById('chalEmoji').innerHTML = chalCurrent.em || '<img src="/assets/ui-compass-sm.png" alt="compass" style="width:32px;height:32px;vertical-align:middle">';
  document.getElementById('chalQ').textContent     = chalCurrent.q;
  document.getElementById('chalResult').style.display = 'none';
  document.getElementById('chalScore').textContent = 'Question ' + (chalTotal + 1) + ' of 5';
  const nb2 = document.getElementById('chalNext');
  nb2.style.display = 'none';
  nb2.textContent   = 'Next →';
  nb2.onclick       = function() { nextChallenge(); };

  // Generate 4 answer options: correct + 3 random
  const correct = chalCurrent.a;
  const allISOs = Object.keys(D).filter(k => k !== correct);
  for (let i = allISOs.length - 1; i > 0; i--) {
    const j = 0 | Math.random() * (i + 1);
    [allISOs[i], allISOs[j]] = [allISOs[j], allISOs[i]];
  }
  const opts = [correct, ...allISOs.slice(0, 3)];
  for (let i = opts.length - 1; i > 0; i--) {
    const j = 0 | Math.random() * (i + 1);
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }

  const optsEl = document.getElementById('chalOpts');
  optsEl.innerHTML = opts.map(iso => {
    const cd = D[iso];
    if (!cd) return '';
    const fl = FL[cd.fc] ? '<img src="' + FL[cd.fc] + '" alt="">' : '';
    return '<button class="chal-opt" data-iso="' + iso + '" onclick="answerChallenge(this,\'' + iso + '\')">' + fl + cd.n + '</button>';
  }).join('');

  document.getElementById('chalOv').classList.add('on');
}

export function answerChallenge(btn, iso) {
  if (!chalActive || !chalCurrent) return;
  chalTotal++;
  const D       = _ctx.getD();
  const correct = iso === chalCurrent.a;
  const res     = document.getElementById('chalResult');

  document.querySelectorAll('.chal-opt').forEach(b => {
    b.classList.add('disabled');
    if (b.getAttribute('data-iso') === chalCurrent.a) b.classList.add('correct');
  });

  if (correct) {
    chalScore++;
    btn.classList.add('correct');
    res.className = 'chal-result chal-correct';
    const ctxHtml = chalCurrent.ctx
      ? '<div style="font-size:10px;font-weight:500;color:rgba(255,255,255,0.45);margin-top:5px;line-height:1.4;text-align:left;padding-top:5px;border-top:1px solid rgba(74,154,82,0.15)">' + chalCurrent.ctx + '</div>'
      : '';
    res.innerHTML = '✅ Yes! ' + D[iso].n + '!' + ctxHtml;
    playSound('correct');
  } else {
    btn.classList.add('wrong');
    res.className = 'chal-result chal-wrong';
    const ctxHtml2 = chalCurrent.ctx
      ? '<div style="font-size:10px;font-weight:500;color:rgba(255,255,255,0.4);margin-top:5px;line-height:1.4;text-align:left;padding-top:5px;border-top:1px solid rgba(184,64,64,0.1)">' + chalCurrent.ctx + '</div>'
      : '';
    res.innerHTML = 'It was ' + D[chalCurrent.a].n + '!' + ctxHtml2;
  }
  res.style.display = 'block';
  document.getElementById('chalScore').textContent = chalScore + ' / ' + chalTotal;
  document.getElementById('chalNext').style.display = 'flex';
}

export function checkChallengeAnswer(alpha) {
  if (!chalActive || !chalCurrent) return false;
  chalTotal++;
  const D       = _ctx.getD();
  const correct = alpha === chalCurrent.a;
  const res     = document.getElementById('chalResult');
  if (correct) {
    chalScore++;
    res.className = 'chal-result chal-correct';
    const ctxH = chalCurrent.ctx
      ? '<div style="font-size:10px;font-weight:500;color:rgba(255,255,255,0.45);margin-top:5px;line-height:1.4;text-align:left;padding-top:5px;border-top:1px solid rgba(74,154,82,0.15)">' + chalCurrent.ctx + '</div>'
      : '';
    res.innerHTML = '✅ YES! That\'s ' + D[alpha].n + '!' + ctxH;
    playSound('correct');
  } else {
    res.className = 'chal-result chal-wrong';
    const ctxH2 = chalCurrent.ctx
      ? '<div style="font-size:10px;font-weight:500;color:rgba(255,255,255,0.4);margin-top:5px;line-height:1.4;text-align:left;padding-top:5px;border-top:1px solid rgba(184,64,64,0.1)">' + chalCurrent.ctx + '</div>'
      : '';
    res.innerHTML = 'Not quite! It was ' + D[chalCurrent.a].n + '!' + ctxH2;
  }
  res.style.display = 'block';
  document.getElementById('chalScore').textContent = 'Score: ' + chalScore + ' / ' + chalTotal;
  return true;
}

export function closeChallenge() {
  document.getElementById('chalOv').classList.remove('on');
  chalActive = false;
}

export function isChalActive() { return chalActive; }
