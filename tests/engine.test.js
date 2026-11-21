// Run with: node tests/engine.test.js
// Solves thousands of generated problems by following the guided steps exactly
// as the UI does, and checks the board ends up with the right answer.
import assert from 'assert';
import * as Engine from '../engine.js';
const regroups = Engine.regroups;

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
      assert.ok(regroups(Engine.buildSteps(p)), 'problem needs a carry or borrow: ' + p.a + ' ' + p.b);
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
for (var m = 0; m < 1000; m++) {
  ['add', 'sub'].forEach(function (op) {
    [2, 3].forEach(function (len) {
      var p = Engine.generateProblem(op, len, Math.random, false);
      assert.ok(!regroups(Engine.buildSteps(p)), 'no-carry problem regroups: ' + op + ' ' + p.a + ' ' + p.b);
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

var addCarryOff = 0; // carry-off problems that still carry in the add phase
// Multiplication: 1-4 digits, carry on and off. Every step needs one target per typed digit.
[1, 2, 3, 4].forEach(function (len) {
  [true, false].forEach(function (carry) {
    for (var q = 0; q < 1500; q++) {
      var mp = Engine.generateProblem('mul', len, Math.random, carry);
      assert.strictEqual(String(mp.a).length, len);
      assert.strictEqual(String(mp.b).length, len);
      var ms = Engine.buildSteps(mp);
      ms.forEach(function (s) {
        assert.strictEqual(s.targets.length, s.expected.length, 'one target per digit: ' + s.question);
      });
      assert.strictEqual(simulate(mp), Engine.solution(mp), 'mul ' + mp.a + ' x ' + mp.b);
      var needs = regroups(ms);
      if (len > 1 && carry) assert.ok(needs, 'carry-on needs a carry: ' + mp.a + ' x ' + mp.b);
      if (len > 1 && !carry) assert.ok(!ms.some(function (s) { return s.effects.some(function (e) { return e.kind === 'mcarry'; }); }), 'carry-off: no multiply carry: ' + mp.a + ' x ' + mp.b);
      if (len > 1 && !carry && needs) addCarryOff++;
    }
  });
});
assert.ok(addCarryOff > 0, 'carry-off allows add-phase carries');
// one-digit x: the carry switch does not change the problems (all pairs 1-9 x 1-9, both modes)
{
  var seenOn = {}, seenOff = {}, small = 0;
  for (var z = 0; z < 4000; z++) {
    var on = Engine.generateProblem('mul', 1, Math.random, true);
    var off = Engine.generateProblem('mul', 1, Math.random, false);
    assert.ok(on.a >= 1 && on.a <= 9 && on.b >= 1 && on.b <= 9);
    assert.ok(off.a >= 1 && off.a <= 9 && off.b >= 1 && off.b <= 9);
    seenOn[on.a + 'x' + on.b] = true; seenOff[off.a + 'x' + off.b] = true;
    if (off.a * off.b < 10) small++;
  }
  assert.strictEqual(Object.keys(seenOn).length, 81, 'on mode reaches all 81 pairs');
  assert.strictEqual(Object.keys(seenOff).length, 81, 'off mode reaches all 81 pairs');
  assert.ok(small > 0, 'products under 10 appear too');
}
// 59 x 45 (the design image): 9 steps, partial rows 295 and 2360, answer 2655
assert.deepStrictEqual(steps('mul', 59, 45).map(function (s) { return s.expected; }),
  ['45', '29', '0', '36', '23', '5', '15', '6', '2']);
assert.strictEqual(simulate({ op: 'mul', a: 59, b: 45, len: 2 }), '2655');
// one digit: one step, the answer row takes both digits of a two-digit product
assert.strictEqual(steps('mul', 3, 3).length, 1);
assert.strictEqual(steps('mul', 7, 8)[0].expected, '56');
assert.deepStrictEqual(steps('mul', 7, 8)[0].effects.map(function (e) { return e.col; }), [1, 0]);
assert.strictEqual(steps('mul', 7, 8)[0].effects[0].kind, 'ans');

// No step text may say "undefined" (PLACES ran out at 4-digit multiply before).
[['add', 1], ['add', 2], ['add', 3], ['add', 4], ['sub', 2], ['sub', 3], ['sub', 4], ['mul', 1], ['mul', 2], ['mul', 3], ['mul', 4]].forEach(function (pair) {
  for (var u = 0; u < 300; u++) {
    Engine.buildSteps(Engine.generateProblem(pair[0], pair[1], Math.random, u % 2 === 0)).forEach(function (s) {
      assert.ok(!/undefined/.test(s.question + s.success + s.hint + s.title), 'text says undefined: ' + s.success);
    });
  }
});
Engine.buildSteps({ op: 'mul', a: 9999, b: 9999, len: 4 }).forEach(function (s) {
  assert.ok(!/undefined/.test(s.success), 'worst case says undefined: ' + s.success);
});

console.log('OK - ' + counts.add + ' addition and ' + counts.sub + ' subtraction problems solved correctly.');
