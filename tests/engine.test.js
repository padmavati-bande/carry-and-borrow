// Run with: node tests/engine.test.js
// Solves thousands of generated problems by following the guided steps exactly
// as the UI does, and checks the board ends up with the right answer.
import assert from 'assert';
import Engine from '../engine.js';

function simulate(problem) {
  var steps = Engine.buildSteps(problem);
  var ans = {};
  steps.forEach(function (step) {
    assert.ok(/^\d+$/.test(step.expected), 'expected must be digits: ' + step.expected);
    assert.ok(step.targets.length > 0, 'every step highlights something');
    step.effects.forEach(function (e) {
      if (e.kind === 'ans') {
        assert.ok(!(e.col in ans), 'answer cell written twice (col ' + e.col + ')');
        ans[e.col] = e.value;
      }
    });
  });
  var cols = Object.keys(ans).map(Number).sort(function (x, y) { return y - x; });
  return cols.map(function (c) { return ans[c]; }).join('');
}

var counts = { add: 0, sub: 0 }, zeros = 0;
['add', 'sub'].forEach(function (op) {
  [2, 3, 4].forEach(function (len) {
    for (var i = 0; i < 1500; i++) {
      var p = Engine.generateProblem(op, len);
      assert.strictEqual(String(p.a).length, len);
      assert.strictEqual(String(p.b).length, len);
      if (/0/.test(String(p.a) + String(p.b))) zeros++;
      if (op === 'sub') assert.ok(p.a > p.b);
      var got = simulate(p);
      assert.strictEqual(got, Engine.solution(p), op + ' ' + p.a + ' ' + p.b + ' -> ' + got);
      // Must actually involve a carry/borrow.
      var steps = Engine.buildSteps(p);
      var regroup = steps.some(function (s) {
        return s.effects.some(function (e) { return e.kind === 'carry' || e.kind === 'newTop'; }) ||
          (op === 'add' && s.effects.length === 2);
      });
      assert.ok(regroup, 'problem needs a carry or borrow: ' + p.a + ' ' + p.b);
      counts[op]++;
    }
  });
});
// Carry/borrow switch off: 1-digit subtraction works; on: it is refused.
assert.throws(function () { Engine.generateProblem('sub', 1); });
for (var j = 0; j < 500; j++) {
  var q1 = Engine.generateProblem('sub', 1, Math.random, false);
  assert.ok(q1.a > q1.b && q1.a < 10 && q1.b < 10);
  assert.strictEqual(simulate(q1), Engine.solution(q1));
  var q2 = Engine.generateProblem('add', 1, Math.random, false);
  assert.strictEqual(simulate(q2), Engine.solution(q2));
  var q3 = Engine.generateProblem('sub', 3, Math.random, false);
  assert.strictEqual(simulate(q3), Engine.solution(q3));
}
// 1-digit addition with carry on: always needs a carry (5 + 7 style).
for (var k = 0; k < 500; k++) {
  var q4 = Engine.generateProblem('add', 1);
  assert.ok(q4.a + q4.b >= 10);
  assert.strictEqual(simulate(q4), Engine.solution(q4));
}
// Carry/borrow switch off: no problem may carry or borrow (add and sub, 2 and 3 digits).
function regroups(p) {
  return Engine.buildSteps(p).some(function (s) {
    return s.effects.some(function (e) { return e.kind === 'carry' || e.kind === 'newTop'; }) ||
      (p.op === 'add' && s.effects.length === 2);
  });
}
for (var m = 0; m < 1000; m++) {
  ['add', 'sub'].forEach(function (op) {
    [2, 3].forEach(function (len) {
      var p = Engine.generateProblem(op, len, Math.random, false);
      assert.ok(!regroups(p), 'no-carry problem regroups: ' + op + ' ' + p.a + ' ' + p.b);
    });
  });
}
assert.ok(zeros > 0, 'generator produces zero digits');

// A few fixed examples
function steps(op, a, b) { return Engine.buildSteps({ op: op, a: a, b: b, len: String(a).length }); }
assert.strictEqual(simulate({ op: 'add', a: 58, b: 67, len: 2 }), '125');
assert.strictEqual(simulate({ op: 'sub', a: 52, b: 28, len: 2 }), '24');
assert.strictEqual(steps('sub', 52, 28)[0].expected, '12');  // 2 + 10
assert.strictEqual(steps('sub', 52, 28)[1].expected, '4');   // 12 - 8
assert.strictEqual(steps('sub', 52, 28)[2].expected, '2');   // 5 - 2 - 1 (borrow mark)
assert.strictEqual(steps('sub', 94, 59).length, 3);          // no separate 9 - 1 step
assert.strictEqual(simulate({ op: 'sub', a: 94, b: 59, len: 2 }), '35');
assert.strictEqual(simulate({ op: 'sub', a: 325, b: 147, len: 3 }), '178'); // chained borrow
assert.strictEqual(simulate({ op: 'sub', a: 305, b: 168, len: 3 }), '137'); // borrow across zero
assert.strictEqual(steps('add', 58, 67)[0].expected, '15');  // 8 + 7
assert.strictEqual(steps('add', 58, 67)[1].expected, '12');  // 5 + 6 + 1

console.log('OK - ' + counts.add + ' addition and ' + counts.sub + ' subtraction problems solved correctly.');
