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

// Division: long division with remainder. Reads the quotient row and the last remainder row.
function divSimulate(p) {
  var steps = Engine.buildSteps(p);
  var parts = Engine.divPlan(p);
  var q = {}, r = {};
  steps.forEach(function (step) {
    assert.ok(/^\d+$/.test(step.expected), 'div expected must be digits: ' + step.expected);
    assert.strictEqual(step.targets.length, step.expected.length, 'one target per digit: ' + step.question);
    step.effects.forEach(function (e) {
      if (e.kind !== 'pp') return;
      if (e.row === 'qt') q[e.col] = e.value;
      if (e.row === 'rem' + (parts.length - 1)) r[e.col] = e.value;
    });
  });
  var join = function (m) {
    return Object.keys(m).map(Number).sort(function (x, y) { return y - x; })
      .map(function (c) { return m[c]; }).join('');
  };
  return join(q) + ' R ' + join(r);
}

var divCount = 0;
[1, 2, 3, 4].forEach(function (len) {
  for (var i = 0; i < 1500; i++) {
    var p = Engine.generateProblem('div', len);
    assert.strictEqual(String(p.a).length, len, 'dividend has ' + len + ' digits');
    assert.ok(p.b >= 2 && p.b <= 9, 'divisor 2-9: ' + p.b);
    assert.ok(p.a >= p.b, 'dividend >= divisor');
    var parts = Engine.divPlan(p);
    var ds = Engine.buildSteps(p);
    assert.strictEqual(ds.length, 3 * parts.length, 'three steps per quotient digit');
    parts.forEach(function (part, k) {
      assert.ok(part.rem < p.b, 'remainder smaller than divisor: ' + part.rem);
      assert.ok(part.q >= 0 && part.q <= 9, 'quotient digit 0-9: ' + part.q);
      assert.strictEqual(Number(ds[3 * k + 2].expected), part.rem, 'remainder step matches the plan');
    });
    assert.strictEqual(divSimulate(p), Engine.solution(p), 'div ' + p.a + ' / ' + p.b);
    divCount++;
  }
});
// Fixed division cases
assert.strictEqual(divSimulate({ op: 'div', a: 92, b: 4, len: 2 }), '23 R 0');
assert.strictEqual(steps('div', 92, 4).length, 6);
// the remainder of a non-last part goes to the next bd row; the next digit drops in beside it
assert.deepStrictEqual(steps('div', 92, 4)[2].effects.filter(function (e) { return e.kind === 'drop'; }),
  [{ kind: 'drop', row: 'bd1', col: 0, value: '2', src: 'top', srcCol: 0 }]);
assert.strictEqual(divSimulate({ op: 'div', a: 192, b: 4, len: 3 }), '48 R 0');
assert.strictEqual(steps('div', 192, 4).length, 6);
assert.strictEqual(divSimulate({ op: 'div', a: 812, b: 4, len: 3 }), '203 R 0');
assert.strictEqual(steps('div', 812, 4).length, 9);
assert.strictEqual(divSimulate({ op: 'div', a: 105, b: 5, len: 3 }), '21 R 0');
assert.strictEqual(steps('div', 105, 5).length, 6);
assert.strictEqual(divSimulate({ op: 'div', a: 1200, b: 4, len: 4 }), '300 R 0');
assert.strictEqual(steps('div', 1200, 4).length, 9);
assert.strictEqual(divSimulate({ op: 'div', a: 7, b: 3, len: 1 }), '2 R 1');
assert.strictEqual(steps('div', 7, 3).length, 3);
// 92 / 4 step by step: quotient, product, remainder, then again
assert.deepStrictEqual(steps('div', 92, 4).map(function (s) { return s.expected; }),
  ['2', '8', '1', '3', '12', '0']);

// No step text may say "undefined" (PLACES ran out at 4-digit multiply before).
[['add', 1], ['add', 2], ['add', 3], ['add', 4], ['sub', 2], ['sub', 3], ['sub', 4], ['mul', 1], ['mul', 2], ['mul', 3], ['mul', 4], ['div', 1], ['div', 2], ['div', 3], ['div', 4]].forEach(function (pair) {
  for (var u = 0; u < 300; u++) {
    Engine.buildSteps(Engine.generateProblem(pair[0], pair[1], Math.random, u % 2 === 0)).forEach(function (s) {
      assert.ok(!/undefined/.test(s.question + s.success + s.hint + s.title), 'text says undefined: ' + s.success);
    });
  }
});
Engine.buildSteps({ op: 'mul', a: 9999, b: 9999, len: 4 }).forEach(function (s) {
  assert.ok(!/undefined/.test(s.success), 'worst case says undefined: ' + s.success);
});
Engine.buildSteps({ op: 'div', a: 9999, b: 9, len: 4 }).forEach(function (s) {
  assert.ok(!/undefined/.test(s.question + s.success + s.hint + s.title), 'div worst case says undefined: ' + s.success);
});
Engine.buildSteps({ op: 'div', a: 1000, b: 2, len: 4 }).forEach(function (s) {
  assert.ok(!/undefined/.test(s.question + s.success + s.hint + s.title), 'div with zeros says undefined: ' + s.success);
});

console.log('OK - ' + counts.add + ' addition, ' + counts.sub + ' subtraction and ' + divCount + ' division problems solved correctly.');
