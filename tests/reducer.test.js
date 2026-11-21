// Run with: node tests/reducer.test.js
// Checks the game state machine: wrong answers, the 3-miss reveal, step settle, and finish.
import assert from 'assert';
import { reducer, initialState, settingsOf } from '../src/game/reducer.js';
import { nextKey } from '../src/game/view.js';

const problem = { op: 'add', a: 27, b: 36, len: 2 }; // 27 + 36 = 63, needs a carry

const start = reducer(initialState, { type: 'START', op: 'add', len: 2, problem });
// Carry flag is stored from START and defaults to on.
assert.strictEqual(reducer(initialState, { type: 'START', op: 'add', len: 2, problem, carry: false }).game.carry, false);
assert.strictEqual(start.game.carry, true);

function type(state, str) {
  let s = state;
  for (const key of str) s = reducer(s, { type: 'PRESS', key });
  return s;
}

// a wrong answer of the same length as the expected one
const wrongFor = (exp) => exp.split('').map((c) => (c === '1' ? '2' : '1')).join('');

// 1. three misses: hint on 2nd, reveal on 3rd, box cleared after each miss
{
  const exp = start.cur.steps[0].expected;
  let s = type(start, wrongFor(exp));
  assert.strictEqual(s.cur.mistakes, 1);
  assert.strictEqual(s.cur.feedback.kind, 'err');
  assert.strictEqual(s.cur.locked, true, 'locked while shake shows');
  assert.strictEqual(s.cur.wrongPending, true);
  s = reducer(s, { type: 'WRONG_CLEAR' });
  assert.strictEqual(s.cur.buffer, '');
  assert.strictEqual(s.cur.locked, false);

  s = type(s, wrongFor(exp));
  assert.ok(s.cur.feedback.text.startsWith('Hint: '), 'hint on 2nd miss');
  s = reducer(s, { type: 'WRONG_CLEAR' });

  s = type(s, wrongFor(exp));
  assert.strictEqual(s.cur.wrongOnStep, 3);
  assert.ok(s.cur.feedback.text.includes('The answer is ' + exp), 'reveal on 3rd miss');
  assert.strictEqual(s.cur.stepIndex, 0, 'still on same step after misses');
}

// 2. correct step: settled board, then ADVANCE moves to next step
{
  const exp = start.cur.steps[0].expected;
  let s = type(start, exp);
  assert.strictEqual(s.cur.settle, true);
  assert.strictEqual(s.cur.stepIndex, 1);
  assert.strictEqual(s.cur.promptIndex, 0, 'question still shows old step while settled');
  assert.strictEqual(s.cur.feedback.kind, 'ok');
  s = reducer(s, { type: 'ADVANCE' });
  assert.strictEqual(s.cur.settle, false);
  assert.strictEqual(s.cur.locked, false);
  assert.strictEqual(s.cur.promptIndex, 1);
  assert.strictEqual(s.cur.feedback.text, '');
}

// 3. finish the whole problem with no mistakes: good +1, finished, screen stays play
{
  let s = start;
  while (!s.cur.finished) {
    const step = s.cur.steps[s.cur.stepIndex];
    s = type(s, step.expected);
    if (s.cur.settle && !s.cur.finished) s = reducer(s, { type: 'ADVANCE' });
  }
  assert.strictEqual(s.cur.finished, true);
  assert.strictEqual(s.cur.mistakes, 0);
  assert.strictEqual(s.game.good, 1);
  assert.strictEqual(s.game.bad, 0);
  assert.strictEqual(s.screen, 'play');
}

// 4. keys are ignored off the play screen
{
  const s = reducer(initialState, { type: 'PRESS', key: '1' });
  assert.strictEqual(s, initialState);
}

// 5. backspace removes the last typed digit while the box is open
{
  const s = reducer(type(start, '1'), { type: 'BACKSPACE' });
  assert.strictEqual(s.cur.buffer, '');
}

// 6. next moves the game on with a new problem
{
  const next = { op: 'add', a: 14, b: 25, len: 2 };
  const s = reducer(start, { type: 'NEXT', problem: next });
  assert.strictEqual(s.game.index, 2);
  assert.strictEqual(s.cur.problem, next);
  assert.strictEqual(s.cur.stepIndex, 0);
}

// 7. finish and back to start screens
assert.strictEqual(reducer(start, { type: 'FINISH' }).screen, 'done');
assert.strictEqual(reducer(start, { type: 'SHOW_START' }).screen, 'start');

// 8. timed mode: 60 ticks end the problem, no good/bad change; off mode ignores ticks
{
  let s = reducer(initialState, { type: 'START', op: 'add', len: 2, problem, timed: true, limit: 60 });
  assert.strictEqual(s.game.timed, true);
  for (let i = 0; i < 59; i++) s = reducer(s, { type: 'TICK' });
  assert.strictEqual(s.cur.finished, false);
  assert.strictEqual(s.cur.elapsed, 59);
  s = reducer(s, { type: 'TICK' });
  assert.strictEqual(s.cur.finished, true);
  assert.strictEqual(s.cur.timedOut, true);
  assert.strictEqual(s.cur.feedback.text, 'Time is up.');
  assert.strictEqual(s.game.good, 0);
  assert.strictEqual(s.game.bad, 0);
  assert.strictEqual(reducer(s, { type: 'TICK' }), s, 'ticks ignored after finish');
  assert.strictEqual(reducer(start, { type: 'TICK' }), start, 'untimed ignores ticks');
  let t = reducer(initialState, { type: 'START', op: 'add', len: 2, problem, timed: true, limit: 5 });
  for (let i = 0; i < 5; i++) t = reducer(t, { type: 'TICK' });
  assert.strictEqual(t.cur.timedOut, true, 'custom limit of 5 ends on 5th tick');
}

// multiplication 59 x 45: type each step's digits and advance; the answer fills in
{
  let s = reducer(initialState, { type: 'START', op: 'mul', len: 2, problem: { op: 'mul', a: 59, b: 45, len: 2 } });
  const n = s.cur.steps.length;
  for (let i = 0; i < n; i++) {
    s = type(s, s.cur.steps[s.cur.stepIndex].expected);
    assert.strictEqual(s.cur.settle, true, 'step ' + i + ' settles');
    s = reducer(s, { type: 'ADVANCE' });
  }
  assert.strictEqual(s.cur.finished, true);
  const ans = Object.keys(s.cur.view.ans).map(Number).sort((x, y) => y - x).map((c) => s.cur.view.ans[c]).join('');
  assert.strictEqual(ans, '2655');
  assert.strictEqual(s.game.good, 1, 'no mistakes counts as clean');
}

// division 92 / 4 = 23 R 0: every step types and the quotient and remainder land on the view
{
  let s = reducer(initialState, { type: 'START', op: 'div', len: 2, problem: { op: 'div', a: 92, b: 4, len: 2 } });
  assert.strictEqual(s.cur.steps.length, 6);
  for (let i = 0; i < 6; i++) {
    s = type(s, s.cur.steps[s.cur.stepIndex].expected);
    assert.strictEqual(s.cur.settle, true, 'division step ' + i + ' settles');
    s = reducer(s, { type: 'ADVANCE' });
  }
  assert.strictEqual(s.cur.finished, true);
  assert.strictEqual(s.cur.view.pp['qt:1'], '2');
  assert.strictEqual(s.cur.view.pp['qt:0'], '3');
  assert.strictEqual(s.cur.view.pp['rem1:0'], '0');
  assert.strictEqual(s.cur.view.pp['bd1:1'], '1', 'remainder 1 typed into bd1');
  assert.strictEqual(s.cur.view.pp['bd1:0'], '2', 'digit 2 dropped into bd1');
  assert.strictEqual(s.game.good, 1, 'no mistakes counts as clean');
}

// division: a wrong first digit shakes the quotient cell
{
  const s0 = reducer(initialState, { type: 'START', op: 'div', len: 2, problem: { op: 'div', a: 92, b: 4, len: 2 } });
  const s = type(s0, '3');
  assert.strictEqual(s.cur.mistakes, 1);
  assert.strictEqual(s.cur.wrongPending, true);
}

console.log('OK - reducer: miss reveal, settle/advance, finish, off-screen keys.');

// 6. multiply: a carry flies from its partial row (pp0) up to the carry row
{
  const mul = reducer(initialState, { type: 'START', op: 'mul', len: 2, problem: { op: 'mul', a: 16, b: 2, len: 2 } });
  const s = type(mul, mul.cur.steps[0].expected);
  assert.strictEqual(s.cur.view.fly, 1);
  assert.strictEqual(s.cur.view.flySrc, 'pp0');
  assert.strictEqual(s.cur.view.flyTo, 'carry');
  assert.strictEqual(s.cur.view.flySrcCol, 1); // carry digit typed at pp0, col 1
  assert.ok(!mul.cur.steps[0].targets.some((t) => t.row === 'carry')); // typed at the bottom only
}

// 7. multiply add phase: a carry flies from the answer row up to the acarry row
{
  let s = reducer(initialState, { type: 'START', op: 'mul', len: 2, problem: { op: 'mul', a: 99, b: 99, len: 2 } });
  const k = s.cur.steps.findIndex((st) => st.effects.some((e) => e.kind === 'acarry'));
  assert.ok(k >= 0);
  for (let n = 0; s.cur.stepIndex < k && n < 100; n++) s = reducer(type(s, s.cur.steps[s.cur.stepIndex].expected), { type: 'ADVANCE' });
  s = type(s, s.cur.steps[k].expected);
  assert.strictEqual(s.cur.view.flyTo, 'acarry');
  assert.strictEqual(s.cur.view.flySrc, 'ans');
}

// Watch mode: the setting is kept, the next key comes from the answer, and nothing is scored.
function solveAll(state) {
  let s = state;
  while (!s.cur.finished) {
    s = type(s, s.cur.steps[s.cur.stepIndex].expected);
    if (!s.cur.finished) s = reducer(s, { type: 'ADVANCE' });
  }
  return s;
}
{
  const w = reducer(initialState, { type: 'START', op: 'add', len: 2, problem, watch: true });
  assert.strictEqual(w.game.watch, true);
  assert.strictEqual(settingsOf(w.game).watch, true);
  assert.strictEqual(nextKey(w.cur), w.cur.steps[0].expected.charAt(0));
  assert.strictEqual(nextKey({ ...w.cur, buffer: w.cur.steps[0].expected }), null);
  const done = solveAll(w);
  assert.strictEqual(done.game.good + done.game.bad, 0, 'watch does not score');
  assert.strictEqual(solveAll(start).game.good, 1, 'normal game scores a clean problem');
}
