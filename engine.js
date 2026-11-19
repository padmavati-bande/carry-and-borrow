/*
 * Problem generator and step builder for column addition and subtraction.
 * Pure functions only (no DOM) so they can be tested with plain Node.
 *
 * Columns are numbered from the right: col 0 = ones, 1 = tens, 2 = hundreds...
 */
(function (root) {
  'use strict';

  var PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands'];
  var MINUS = '−';

  function randInt(lo, hi, rng) {
    return lo + Math.floor(rng() * (hi - lo + 1));
  }

  // A number with `len` digits, none of them zero (keeps borrowing simple).
  function randomNumber(len, rng) {
    var n = 0;
    for (var i = 0; i < len; i++) n = n * 10 + randInt(1, 9, rng);
    return n;
  }

  function digitsOf(n, len) {
    var d = [];
    for (var i = 0; i < len; i++) d.push(Math.floor(n / Math.pow(10, i)) % 10);
    return d;
  }

  function countCarries(a, b, len) {
    var da = digitsOf(a, len), db = digitsOf(b, len), carry = 0, count = 0;
    for (var i = 0; i < len; i++) {
      var s = da[i] + db[i] + carry;
      carry = s >= 10 ? 1 : 0;
      count += carry;
    }
    return count;
  }

  function countBorrows(a, b, len) {
    var cur = digitsOf(a, len), db = digitsOf(b, len), count = 0;
    for (var i = 0; i < len; i++) {
      if (cur[i] < db[i]) {
        if (i + 1 >= len) return -1; // would go negative
        cur[i + 1] -= 1;
        count++;
      }
    }
    return count;
  }

  /*
   * op: 'add' | 'sub'. len: digits in each number (2-4).
   * Every problem needs at least one carry (add) or borrow (sub).
   */
  function generateProblem(op, len, rng) {
    rng = rng || Math.random;
    for (var tries = 0; tries < 5000; tries++) {
      var a = randomNumber(len, rng), b = randomNumber(len, rng);
      if (op === 'add') {
        if (countCarries(a, b, len) >= 1) return { op: 'add', a: a, b: b, len: len };
      } else {
        if (a < b) { var t = a; a = b; b = t; }
        // Keep the answer the same length as the inputs (no leading zero).
        if (a - b >= Math.pow(10, len - 1) && countBorrows(a, b, len) >= 1) {
          return { op: 'sub', a: a, b: b, len: len };
        }
      }
    }
    throw new Error('Could not generate a problem');
  }

  /*
   * Each step: { title, question, expected, hint, success, effects, targets }
   *   effects: what to write on the board once the step is answered correctly
   *     { kind: 'ans',    col, value }  -> digit in the answer row
   *     { kind: 'carry',  col, value }  -> small carried digit above a column
   *     { kind: 'newTop', col, value }  -> crossed-out top digit, new value above
   *   targets: cells to highlight while the step is active: { row, col }
   */
  function buildAddSteps(p) {
    var len = p.len, da = digitsOf(p.a, len), db = digitsOf(p.b, len);
    var steps = [], carry = 0;
    for (var i = 0; i < len; i++) {
      var s = da[i] + db[i] + carry, last = i === len - 1;
      var q = carry
        ? 'What is ' + da[i] + ' + ' + db[i] + ' + ' + carry + '? (the ' + carry + ' is the one you carried)'
        : 'What is ' + da[i] + ' + ' + db[i] + '?';
      var effects = [], targets = [], success;
      if (s >= 10) {
        effects.push({ kind: 'ans', col: i, value: String(s % 10) });
        // Typing order = left to right. Ones column: 1st digit under it, 2nd in an
        // extra cell to its right (col -1), then both slide left. Other columns:
        // 1st digit in the cell to the left (col i + 1), 2nd under this column.
        if (i === 0) targets.push({ row: 'ans', col: 0 }, { row: 'ans', col: -1 });
        else targets.push({ row: 'ans', col: i + 1 }, { row: 'ans', col: i });
        if (last) {
          effects.push({ kind: 'ans', col: i + 1, value: '1' });
          success = s + ' is ten or more, so write ' + s + ' in full.';
        } else {
          effects.push({ kind: 'carry', col: i + 1, value: '1' });
          success = 'Write the ' + (s % 10) + ' and carry the 1 to the ' + PLACES[i + 1] + '.';
        }
      } else {
        effects.push({ kind: 'ans', col: i, value: String(s) });
        targets.push({ row: 'ans', col: i });
        success = 'Write the ' + s + '. Nothing to carry.';
      }
      steps.push({
        title: capitalize(PLACES[i]) + ' column',
        question: q,
        expected: String(s),
        hint: 'Start at ' + Math.max(da[i] + carry, db[i]) + ' and count up ' + Math.min(da[i] + carry, db[i]) + ' more.',
        success: success,
        effects: effects,
        targets: targets
      });
      carry = s >= 10 ? 1 : 0;
    }
    return steps;
  }

  function buildSubSteps(p) {
    var len = p.len, cur = digitsOf(p.a, len), db = digitsOf(p.b, len);
    var steps = [];
    for (var i = 0; i < len; i++) {
      var title = capitalize(PLACES[i]) + ' column';
      if (cur[i] < db[i]) {
        steps.push({
          title: title,
          question: cur[i] + ' is smaller than ' + db[i] + ', so borrow! Add 10 to the ' + cur[i] + '. What do you get?',
          expected: String(cur[i] + 10),
          hint: 'Ten plus ' + cur[i] + '.',
          success: 'Now the top digit is ' + (cur[i] + 10) + '.',
          effects: [{ kind: 'newTop', col: i, value: String(cur[i] + 10) }],
          targets: [{ row: 'carry', col: i }]
        });
        cur[i] += 10;
        steps.push({
          title: title,
          question: 'You borrowed 1 from the ' + PLACES[i + 1] + ' column. What is ' + cur[i + 1] + ' − 1?',
          expected: String(cur[i + 1] - 1),
          hint: 'One less than ' + cur[i + 1] + '.',
          success: 'The ' + PLACES[i + 1] + ' digit is now ' + (cur[i + 1] - 1) + '.',
          effects: [{ kind: 'newTop', col: i + 1, value: String(cur[i + 1] - 1) }],
          targets: [{ row: 'carry', col: i + 1 }]
        });
        cur[i + 1] -= 1;
      }
      var d = cur[i] - db[i];
      steps.push({
        title: title,
        question: 'What is ' + cur[i] + ' ' + MINUS + ' ' + db[i] + '?',
        expected: String(d),
        hint: 'Start at ' + db[i] + ' and count up to ' + cur[i] + '. How many steps?',
        success: 'Write the ' + d + '.',
        effects: [{ kind: 'ans', col: i, value: String(d) }],
        targets: [{ row: 'ans', col: i }]
      });
    }
    return steps;
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  function buildSteps(p) { return p.op === 'add' ? buildAddSteps(p) : buildSubSteps(p); }

  function solution(p) { return String(p.op === 'add' ? p.a + p.b : p.a - p.b); }

  root.Engine = {
    PLACES: PLACES,
    MINUS: MINUS,
    digitsOf: digitsOf,
    generateProblem: generateProblem,
    buildSteps: buildSteps,
    solution: solution
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.Engine;
})(typeof window !== 'undefined' ? window : globalThis);
