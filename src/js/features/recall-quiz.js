/**
 * src/js/features/recall-quiz.js
 * "What do you remember?" recall quiz — triggered every 5 non-family discoveries.
 *
 * Call initRecallQuiz(ctx) inside _boot() after data loads.
 *
 * ctx shape:
 *   getVisited()    → Set<string>
 *   getD()          → D object
 *   getL2()         → L2 object
 *   getFL()         → FL object
 *   getPlayerName() → string
 *   saveGame()      → void
 */

import { loadGame }           from '../state.js';
import { playSound }          from '../ui/sounds.js';
import { burst, fireConfetti } from '../ui/effects.js';

let _ctx;
let quizActive = false, quizQuestions = [], quizIndex = 0, quizCorrect = 0, quizAnswered = false;

export function initRecallQuiz(ctx) {
  _ctx = ctx;
}

/** Returns true if a quiz is currently in progress (used by checkRecallQuiz). */
export function isQuizActive() {
  return quizActive;
}

// ── Question generation ──────────────────────────────────────────────────────
export function generateQuizQuestions() {
  const visited = _ctx.getVisited();
  const D  = _ctx.getD();
  const L2 = _ctx.getL2();
  const FL = _ctx.getFL();
  const pool = Array.from(visited).filter(function(k) { return D[k] && L2[k]; });
  if (pool.length < 4) return []; // need at least 4 to make 3 wrong answers
  shuffle(pool);
  const questions = [];
  const types     = ['flag', 'breakfast', 'fact', 'gave', 'emoji'];

  for (let attempt = 0; attempt < 15 && questions.length < 3; attempt++) {
    const country = pool[attempt % pool.length];
    const c       = D[country];
    const l       = L2[country];
    const type    = types[questions.length % types.length];

    let wrongs = pool.filter(function(k) { return k !== country; }).slice(0, 6);
    shuffle(wrongs);
    wrongs = wrongs.slice(0, 2);
    if (wrongs.length < 2) continue;

    let q = null;
    if (type === 'flag' && c.fc && FL[c.fc]) {
      q = { type:'flag', text:'Which country has this flag?',
            img: FL[c.fc], correct: country, options: shuffle([country].concat(wrongs)) };
    } else if (type === 'breakfast' && l && l.bfast) {
      let bfShort = l.bfast.split('.')[0];
      if (bfShort.length > 60) bfShort = bfShort.substring(0, 57) + '...';
      q = { type:'breakfast', text:'Which country eats this for breakfast?',
            hint: bfShort, correct: country, options: shuffle([country].concat(wrongs)) };
    } else if (type === 'fact' && c.facts && c.facts.length > 0) {
      const fact = c.facts[Math.floor(Math.random() * c.facts.length)];
      q = { type:'fact', text:'Which country is known for this?',
            hint: fact.i + ' ' + fact.t, correct: country, options: shuffle([country].concat(wrongs)) };
    } else if (type === 'gave' && l && l.gave) {
      let gaveShort = l.gave.split('.')[0].split('!')[0];
      if (gaveShort.length > 60) gaveShort = gaveShort.substring(0, 57) + '...';
      q = { type:'gave', text:'Which country gave the world this?',
            hint: gaveShort, correct: country, options: shuffle([country].concat(wrongs)) };
    } else if (type === 'emoji' && c.hero && c.hero.length > 0) {
      q = { type:'emoji', text:'Which country does this remind you of?',
            hint: c.hero.join(' '), correct: country, options: shuffle([country].concat(wrongs)) };
    }

    if (q && !questions.some(function(ex) { return ex.correct === country; })) {
      questions.push(q);
    }
  }
  return questions;
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

// ── Quiz flow ────────────────────────────────────────────────────────────────
export function triggerRecallQuiz() {
  const qs = generateQuizQuestions();
  if (qs.length < 3) return;
  quizQuestions = qs;
  quizIndex     = 0;
  quizCorrect   = 0;
  quizActive    = true;

  const dots = document.getElementById('quizDots');
  dots.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const d = document.createElement('div');
    d.className = 'quiz-dot' + (i === 0 ? ' active' : '');
    dots.appendChild(d);
  }
  document.getElementById('quizQView').style.display  = 'block';
  document.getElementById('quizScore').style.display  = 'none';

  const visited    = _ctx.getVisited();
  const playerName = _ctx.getPlayerName();
  let subText = visited.size + ' countries explored!';
  const savedData = loadGame(playerName);
  if (savedData && savedData.lastQuizScore !== null && savedData.lastQuizScore !== undefined) {
    subText = 'Last quiz: ' + savedData.lastQuizScore + '/3 <img src="/assets/ui-star-xs.png" alt="star" style="width:16px;height:16px;vertical-align:middle">  •  ' + subText;
  }
  document.getElementById('quizSub').innerHTML = subText;
  renderQuizQuestion();
  document.getElementById('quizOv').classList.add('on');
  playSound('tap');
}

export function renderQuizQuestion() {
  const D  = _ctx.getD();
  const FL = _ctx.getFL();
  const q  = quizQuestions[quizIndex];
  quizAnswered = false;
  document.getElementById('quizFeedback').innerHTML = '&nbsp;';
  document.getElementById('quizNextBtn').style.display = 'none';

  const qEl = document.getElementById('quizQ');
  if (q.hint && q.type !== 'flag') {
    qEl.innerHTML = q.text + '<br><span style="color:#D4884A;font-size:15px">' + q.hint + '</span>';
  } else {
    qEl.textContent = q.text;
  }

  const emoji = document.getElementById('quizEmoji');
  if (q.type === 'flag' && q.img) {
    emoji.innerHTML = '<img src="' + q.img + '" style="width:64px;height:auto;border-radius:5px;box-shadow:0 4px 16px rgba(0,0,0,0.3)">';
  } else if (q.type === 'emoji') {
    emoji.innerHTML = '<span style="font-size:36px">' + q.hint + '</span>';
  } else {
    emoji.textContent = '🧠';
  }

  const box = document.getElementById('quizAnswers');
  box.innerHTML = '';
  q.options.forEach(function(iso) {
    const btn = document.createElement('div');
    btn.className  = 'quiz-ans';
    btn.dataset.iso = iso;
    const cd = D[iso];
    let inner = '';
    if (cd && cd.fc && FL[cd.fc]) {
      inner += '<img class="quiz-ans-flag" src="' + FL[cd.fc] + '" alt="">';
    } else {
      inner += '<img class="quiz-ans-emoji" src="/assets/ui-globe-xs.png" alt="globe" style="width:24px;height:24px;vertical-align:middle">';
    }
    inner += '<span>' + (cd ? cd.n : iso) + '</span>';
    btn.innerHTML = inner;
    btn.addEventListener('click',    function() { quizAnswer(iso); });
    btn.addEventListener('touchend', function(e) { e.preventDefault(); quizAnswer(iso); });
    box.appendChild(btn);
  });

  const dots = document.getElementById('quizDots').children;
  for (let i = 0; i < dots.length; i++) {
    dots[i].className = 'quiz-dot' + (i === quizIndex ? ' active' : (i < quizIndex ? ' done' : ''));
  }
}

export function quizAnswer(iso) {
  if (quizAnswered) return;
  quizAnswered = true;
  const D         = _ctx.getD();
  const q         = quizQuestions[quizIndex];
  const isCorrect = iso === q.correct;
  if (isCorrect) quizCorrect++;

  document.querySelectorAll('.quiz-ans').forEach(function(btn) {
    if (btn.dataset.iso === q.correct)              btn.classList.add('correct');
    else if (btn.dataset.iso === iso && !isCorrect) btn.classList.add('wrong');
  });

  const fb          = document.getElementById('quizFeedback');
  const correctName = D[q.correct] ? D[q.correct].n : q.correct;
  if (isCorrect) {
    const yays = [
      'Amazing! <img src="/assets/ui-party-xs.png" alt="party" style="width:24px;height:24px;vertical-align:middle">',
      'You got it! <img src="/assets/ui-star-xs.png" alt="star" style="width:24px;height:24px;vertical-align:middle">',
      'Yes! <img src="/assets/ui-flame-xs.png" alt="flame" style="width:24px;height:24px;vertical-align:middle">',
      'Nailed it! 💪',
      'Brilliant! 🌟',
    ];
    fb.innerHTML = yays[Math.floor(Math.random() * yays.length)];
    fb.style.color = '#4ECDC4';
    playSound('discover');
  } else {
    fb.textContent = "It's " + correctName + "! Now you'll remember.";
    fb.style.color = 'rgba(255,180,60,0.8)';
    playSound('tap');
  }

  const nextBtn = document.getElementById('quizNextBtn');
  nextBtn.style.display = 'inline-block';
  nextBtn.textContent   = quizIndex < 2 ? 'Next →' : 'See Results ✨';
}

export function quizNext() {
  quizIndex++;
  if (quizIndex >= 3) {
    showQuizScore();
  } else {
    renderQuizQuestion();
  }
}

export function showQuizScore() {
  document.getElementById('quizQView').style.display = 'none';
  const scoreView = document.getElementById('quizScore');
  scoreView.style.display = 'flex';

  const emojis  = ['😅','🙂','👏','🌟'];
  const titles  = ['Keep exploring!','Not bad!','Great memory!','Perfect score!'];
  const visited = _ctx.getVisited();
  const subs    = [
    "Every wrong answer is a country you'll remember next time.",
    "You got one! The others will stick now. " + visited.size + " explored so far.",
    "So close to perfect! " + visited.size + " countries explored so far.",
    "Wow! You remembered everything! " + visited.size + " countries explored."
  ];

  document.getElementById('quizScoreEmoji').textContent = emojis[quizCorrect] || '🌟';
  document.getElementById('quizScoreTitle').textContent = titles[quizCorrect] || 'Amazing!';
  document.getElementById('quizScoreSub').textContent   = subs[quizCorrect]   || subs[2];

  window._lastQuizScore = quizCorrect;
  _ctx.saveGame();

  const starBox = document.getElementById('quizStars');
  starBox.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.className         = 'quiz-star';
    s.innerHTML         = i < quizCorrect ? '<img src="/assets/ui-star-xs.png" alt="star" style="width:24px;height:24px;vertical-align:middle">' : '☆';
    s.style.opacity     = i < quizCorrect ? '1' : '0.2';
    s.style.animationDelay = (i * 0.15) + 's';
    starBox.appendChild(s);
  }
  playSound(quizCorrect === 3 ? 'milestone' : 'discover');

  if (quizCorrect === 3) {
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    for (let i = 0; i < 5; i++)
      setTimeout(() => burst(
        cx + Math.random() * 200 - 100,
        cy + Math.random() * 200 - 100,
        ['#FFB347','#4ECDC4','#FFE66D','#FF6B6B','#95E1D3']
      ), i * 120);
  }
}

export function closeQuiz() {
  document.getElementById('quizOv').classList.remove('on');
  quizActive = false;
}
