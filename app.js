(function () {
  'use strict';

  var TOTAL = 10;
  var E = window.Engine;
  var $ = function (id) { return document.getElementById(id); };

  var screens = { start: $('start'), play: $('play'), done: $('done') };
  var game = null;   // { op, len, index, good, bad }
  var cur = null;    // the problem currently on screen

  function show(name) {
    Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
    $('chips').hidden = name !== 'play';
  }

  function radio(name) {
    return document.querySelector('input[name="' + name + '"]:checked').value;
  }

  function sym(op) { return op === 'add' ? '+' : E.MINUS; }

  /* ---------- game flow ---------- */

  function startGame() {
    game = { op: radio('op'), len: parseInt(radio('len'), 10), index: 0, good: 0, bad: 0 };
    show('play');
    nextProblem();
  }

  function nextProblem() {
    if (game.index >= TOTAL) return finishGame();
    var op = game.op === 'mix' ? (Math.random() < 0.5 ? 'add' : 'sub') : game.op;
    var problem = E.generateProblem(op, game.len);
    cur = {
      problem: problem,
      steps: E.buildSteps(problem),
      stepIndex: 0,
      mistakes: 0,
      wrongOnStep: 0,
      buffer: '',
      locked: false,
      finished: false,
      view: { ans: {}, carry: {}, struck: {}, just: null, fly: null }
    };
    game.index++;
    $('next-btn').hidden = true;
    updateChips();
    renderStep();
  }

  function finishGame() {
    show('done');
    $('done-score').textContent = game.good + ' out of ' + TOTAL + ' with no mistakes';
    var msg = game.good === TOTAL ? 'Perfect score! Amazing work.'
      : game.good >= TOTAL / 2 ? 'Great job! Keep practising and you will get them all.'
      : 'Nice effort! Carrying and borrowing take practice. Try again.';
    $('done-msg').textContent = msg;
    $('again-btn').focus();
  }

  function updateChips() {
    $('chip-good').textContent = '✓ ' + game.good;
    $('chip-bad').textContent = '✗ ' + game.bad;
    var left = TOTAL - game.index + (cur && !cur.finished ? 1 : 0);
    $('chip-togo').textContent = left + ' to go';
  }

  /* ---------- rendering ---------- */

  function activeStep() { return cur.steps[cur.stepIndex]; }

  // Typed digits fill the target cells in order. 8 + 8: type 1 then 6 ->
  // the 1 goes under the 8, the 6 in the extra cell right of it. Then both move.
  function bufferFor(row, col) {
    var ts = activeStep().targets, exp = activeStep().expected;
    var idx = -1;
    ts.forEach(function (t, j) { if (t.row === row && t.col === col) idx = j; });
    if (ts.length === exp.length) return cur.buffer.charAt(idx);
    return idx === 0 ? cur.buffer : ''; // one cell holds all digits (borrow step)
  }

  // ones column with a two-digit sum: answer row grows one cell to the right
  function wide() {
    return !cur.finished && !cur.settle && activeStep().targets.some(function (t) { return t.col < 0; });
  }

  function isTarget(row, col) {
    if (cur.finished || cur.settle) return false;
    return activeStep().targets.some(function (t) { return t.row === row && t.col === col; });
  }

  function cell(cls, text, id) {
    var d = document.createElement('div');
    d.className = 'cell ' + cls;
    if (id) d.id = id;
    d.textContent = text;
    return d;
  }

  function renderBoard() {
    var p = cur.problem, len = p.len, cols = len + 1, v = cur.view;
    var board = $('board');
    var da = E.digitsOf(p.a, len), db = E.digitsOf(p.b, len);
    board.style.setProperty('--cols', cols);
    board.innerHTML = '';

    var c;
    // digits outside the active column(s) fade
    var tg = cur.finished ? [] : activeStep().targets;
    var ansTg = tg.filter(function (t) { return t.row === 'ans'; });
    // the active column is the lowest answer target (col -1 counts as col 0)
    if (ansTg.length) tg = [{ col: Math.max(0, Math.min.apply(null, ansTg.map(function (t) { return t.col; }))) }];
    function dim(col) { return !cur.finished && !tg.some(function (t) { return t.col === col; }) ? ' dim' : ''; }
    // carry / borrow row
    board.appendChild(cell('spacer', ''));
    for (c = cols - 1; c >= 0; c--) {
      var tgt = isTarget('carry', c);
      var carryText = tgt ? bufferFor('carry', c) : (v.carry[c] || '');
      var flies = v.fly === c;
      var cc = cell(
        'carry' + (carryText ? ' filled' : '') + (tgt ? ' target' : '') + (flies ? ' fly' : ''),
        carryText, 'cell-carry-' + c);
      if (flies) cc.style.setProperty('--fx', v.slide ? '1' : '0'); // ones column starts one cell right
      board.appendChild(cc);
    }
    // top number
    board.appendChild(cell('spacer', ''));
    for (c = cols - 1; c >= 0; c--) {
      board.appendChild(cell('top' + (v.struck[c] ? ' struck' : '') + dim(c), c < len ? da[c] : '', 'cell-top-' + c));
    }
    // bottom number with operator, then the rule
    board.appendChild(cell('op rule', sym(p.op), 'cell-op'));
    for (c = cols - 1; c >= 0; c--) {
      board.appendChild(cell('bottom rule' + dim(c), c < len ? db[c] : '', 'cell-bottom-' + c));
    }
    // answer row
    board.appendChild(cell('spacer', ''));
    var w = wide();
    for (c = cols - 1; c >= (w ? -1 : 0); c--) {
      var just = v.just && v.just.indexOf(c) !== -1;
      var tg2 = isTarget('ans', c);
      var txt = tg2 ? bufferFor('ans', c) : v.ans[c] || '';
      var ac = cell('ans' + (tg2 ? ' target' : '') + (just ? ' just' : '') + (v.slide && txt ? ' slide' : '') + (c < 0 ? ' extra' : ''),
        txt, 'cell-ans-' + c);
      board.appendChild(ac);
    }
  }

  // typed digits show inside the blue target cell, like writing on paper
  function targetEls() {
    return activeStep().targets.map(function (tg) { return $('cell-' + tg.row + '-' + tg.col); });
  }

  function renderInput() {
    activeStep().targets.forEach(function (tg) {
      var el = $('cell-' + tg.row + '-' + tg.col);
      el.textContent = bufferFor(tg.row, tg.col);
      if (tg.row === 'carry') el.classList.toggle('filled', !!el.textContent);
    });
  }

  function setFeedback(text, kind) {
    var f = $('feedback');
    f.textContent = text || '';
    f.className = 'feedback' + (kind ? ' ' + kind : '');
  }

  function renderStep() {
    var step = activeStep();
    $('step-title').textContent = 'Problem ' + game.index + ' of ' + TOTAL + ' · ' + step.title;
    $('question').textContent = step.question;
    $('note').textContent = step.expected.length > 1 ? 'Type both digits.' : '';
    cur.view.fly = null;
    cur.view.slide = false;
    cur.settle = false;
    cur.buffer = '';
    cur.wrongOnStep = 0;
    cur.locked = false;
    setFeedback('');
    renderBoard();
    renderInput();
  }

  /* ---------- input handling ---------- */

  function applyEffects(step) {
    var v = cur.view, cols = [];
    step.effects.forEach(function (e) {
      cols.push(e.col);
      if (e.kind === 'ans') v.ans[e.col] = e.value;
      else if (e.kind === 'carry') { v.carry[e.col] = e.value; v.fly = e.col; }
      else if (e.kind === 'newTop') { v.carry[e.col] = e.value; v.struck[e.col] = true; }
    });
    v.just = cols;
    v.slide = step.targets.some(function (t) { return t.col < 0; });
  }

  function press(d) {
    if (!cur || cur.locked || cur.finished) return;
    var step = activeStep();
    if (cur.buffer.length >= step.expected.length) return;
    cur.buffer += d;
    renderInput();
    if (cur.buffer.length === step.expected.length) submit();
  }

  function backspace() {
    if (!cur || cur.locked || cur.finished) return;
    cur.buffer = cur.buffer.slice(0, -1);
    renderInput();
  }

  function submit() {
    var step = activeStep();
    cur.locked = true;
    if (cur.buffer === step.expected) {
      applyEffects(step);
      cur.stepIndex++;
      cur.buffer = '';
      cur.settle = true; // show the settled board until the next step starts
      if (cur.stepIndex >= cur.steps.length) {
        cur.stepIndex = cur.steps.length - 1;
        cur.finished = true;
        problemDone(step);
      } else {
        setFeedback(step.success, 'ok');
        renderBoard();
        setTimeout(renderStep, 1100);
      }
    } else {
      cur.mistakes++;
      cur.wrongOnStep++;
      var tc = targetEls();
      tc.forEach(function (el) { el.classList.add('shake'); });
      var msg = 'Not quite. Try again!';
      if (cur.wrongOnStep === 2) msg = 'Hint: ' + step.hint;
      if (cur.wrongOnStep >= 3) msg = 'The answer is ' + step.expected + '. Type it in to keep going.';
      setFeedback(msg, 'err');
      setTimeout(function () {
        cur.buffer = '';
        cur.locked = false;
        tc.forEach(function (el) { el.classList.remove('shake'); });
        renderInput();
      }, 700);
    }
  }

  function problemDone(lastStep) {
    var p = cur.problem;
    if (cur.mistakes === 0) game.good++; else game.bad++;
    updateChips();
    renderBoard();
    $('step-title').textContent = 'Problem ' + game.index + ' of ' + TOTAL;
    $('question').textContent = p.a + ' ' + sym(p.op) + ' ' + p.b + ' = ' + E.solution(p);
    $('note').textContent = cur.mistakes === 0 ? 'No mistakes. Brilliant!' : 'You got it! Try for no mistakes on the next one.';
    setFeedback(lastStep.success, 'ok');
    var next = $('next-btn');
    next.textContent = game.index >= TOTAL ? 'See my score →' : 'Next problem →';
    next.hidden = false;
    next.focus();
  }

  /* ---------- wiring ---------- */

  $('start-btn').addEventListener('click', startGame);
  $('again-btn').addEventListener('click', startGame);
  $('settings-btn').addEventListener('click', function () { show('start'); });
  $('next-btn').addEventListener('click', nextProblem);

  $('keypad').addEventListener('click', function (ev) {
    var key = ev.target.getAttribute && ev.target.getAttribute('data-key');
    if (key === null || key === undefined) return;
    if (key === 'back') backspace(); else press(key);
  });

  document.addEventListener('keydown', function (ev) {
    if (screens.play.hidden || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (/^[0-9]$/.test(ev.key)) { press(ev.key); ev.preventDefault(); }
    else if (ev.key === 'Backspace') { backspace(); ev.preventDefault(); }
  });
})();
