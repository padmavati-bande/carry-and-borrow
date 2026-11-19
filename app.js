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
      view: { ans: {}, carry: {}, struck: {}, just: null }
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

  function isTarget(row, col) {
    if (cur.finished) return false;
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
    // carry / borrow row
    board.appendChild(cell('spacer', ''));
    for (c = cols - 1; c >= 0; c--) {
      var carryText = v.carry[c] || '';
      board.appendChild(cell(
        'carry' + (carryText ? ' filled' : '') + (isTarget('carry', c) ? ' target' : ''),
        carryText, 'cell-carry-' + c));
    }
    // top number
    board.appendChild(cell('spacer', ''));
    for (c = cols - 1; c >= 0; c--) {
      board.appendChild(cell('top' + (v.struck[c] ? ' struck' : ''), c < len ? da[c] : '', 'cell-top-' + c));
    }
    // bottom number with operator, then the rule
    board.appendChild(cell('op rule', sym(p.op), 'cell-op'));
    for (c = cols - 1; c >= 0; c--) {
      board.appendChild(cell('bottom rule', c < len ? db[c] : '', 'cell-bottom-' + c));
    }
    // answer row
    board.appendChild(cell('spacer', ''));
    for (c = cols - 1; c >= 0; c--) {
      var just = v.just && v.just.indexOf(c) !== -1;
      board.appendChild(cell(
        'ans' + (isTarget('ans', c) ? ' target' : '') + (just ? ' just' : ''),
        v.ans[c] || '', 'cell-ans-' + c));
    }
  }

  function renderInput() {
    var step = activeStep(), len = step.expected.length;
    var box = $('input');
    box.innerHTML = '';
    for (var i = 0; i < len; i++) {
      var b = document.createElement('span');
      b.className = 'box' + (i === cur.buffer.length ? ' cursor' : '');
      b.textContent = cur.buffer.charAt(i);
      box.appendChild(b);
    }
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
    $('input').className = 'input';
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
      else if (e.kind === 'carry') v.carry[e.col] = e.value;
      else if (e.kind === 'newTop') { v.carry[e.col] = e.value; v.struck[e.col] = true; }
    });
    v.just = cols;
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
      $('input').className = 'input right';
      applyEffects(step);
      cur.stepIndex++;
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
      $('input').className = 'input shake';
      var msg = 'Not quite. Try again!';
      if (cur.wrongOnStep === 2) msg = 'Hint: ' + step.hint;
      if (cur.wrongOnStep >= 3) msg = 'The answer is ' + step.expected + '. Type it in to keep going.';
      setFeedback(msg, 'err');
      setTimeout(function () {
        cur.buffer = '';
        cur.locked = false;
        $('input').className = 'input';
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
    $('input').innerHTML = '';
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
