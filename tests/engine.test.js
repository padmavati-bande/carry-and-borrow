// Run with: node tests/engine.test.js
// Solves thousands of generated problems by following the guided steps exactly
// as the UI does, and checks the board ends up with the right answer.
'use strict';
var assert = require('assert');
var Engine = require('../engine.js');

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

var counts = { add: 0, sub: 0 };
['add', 'sub'].forEach(function (op) {
  [2, 3, 4].forEach(function (len) {
    for (var i = 0; i < 1500; i++) {
      var p = Engine.generateProblem(op, len);
      assert.strictEqual(String(p.a).length, len);
      assert.strictEqual(String(p.b).length, len);
      assert.ok(String(p.a).indexOf('0') === -1 && String(p.b).indexOf('0') === -1, 'no zero digits');
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

// A few fixed examples
function steps(op, a, b) { return Engine.buildSteps({ op: op, a: a, b: b, len: String(a).length }); }
assert.strictEqual(simulate({ op: 'add', a: 58, b: 67, len: 2 }), '125');
assert.strictEqual(simulate({ op: 'sub', a: 52, b: 28, len: 2 }), '24');
assert.strictEqual(steps('sub', 52, 28)[0].expected, '12');  // 2 + 10
assert.strictEqual(steps('sub', 52, 28)[1].expected, '4');   // 5 - 1
assert.strictEqual(steps('sub', 52, 28)[2].expected, '4');   // 12 - 8
assert.strictEqual(steps('add', 58, 67)[0].expected, '15');  // 8 + 7
assert.strictEqual(steps('add', 58, 67)[1].expected, '12');  // 5 + 6 + 1

console.log('OK - ' + counts.add + ' addition and ' + counts.sub + ' subtraction problems solved correctly.');
