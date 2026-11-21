/*
 * Problem generator and step builder for column addition and subtraction.
 * Pure functions only (no DOM) so they can be tested with plain Node.
 *
 * Columns are numbered from the right: col 0 = ones, 1 = tens, 2 = hundreds...
 */

export const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands'];
export const MINUS = '−';

function randInt(lo, hi, rng) {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

// A number with `len` digits. First digit 1-9 (no leading zero), others 0-9.
function randomNumber(len, rng) {
  let n = randInt(1, 9, rng);
  for (let i = 1; i < len; i++) n = n * 10 + randInt(0, 9, rng);
  return n;
}

export function digitsOf(n, len) {
  const d = [];
  for (let i = 0; i < len; i++) d.push(Math.floor(n / Math.pow(10, i)) % 10);
  return d;
}

function countCarries(a, b, len) {
  const da = digitsOf(a, len), db = digitsOf(b, len);
  let carry = 0, count = 0;
  for (let i = 0; i < len; i++) {
    const s = da[i] + db[i] + carry;
    carry = s >= 10 ? 1 : 0;
    count += carry;
  }
  return count;
}

function countBorrows(a, b, len) {
  const cur = digitsOf(a, len), db = digitsOf(b, len);
  let count = 0;
  for (let i = 0; i < len; i++) {
    if (cur[i] < db[i]) {
      if (i + 1 >= len) return -1; // would go negative
      cur[i + 1] -= 1;
      count++;
    }
  }
  return count;
}

/*
 * op: 'add' | 'sub'. len: digits in each number (1-4).
 * requireCarry (default true): on = every problem needs at least one carry (add) or borrow (sub).
 * off = no problem may have a carry or borrow.
 */
export function generateProblem(op, len, rng = Math.random, requireCarry = true) {
  // one-digit x: all pairs 1-9 x 1-9, the carry switch does not apply
  if (op === 'mul' && len === 1) return { op: 'mul', a: randomNumber(1, rng), b: randomNumber(1, rng), len: 1 };
  for (let tries = 0; tries < 5000; tries++) {
    if (op === 'mul') {
      // carry on: any pair that needs a carry (multiply or add phase).
      // off: no digit product reaches 10, so the multiply rows never carry. The add phase may carry.
      let a = randomNumber(len, rng), b = randomNumber(len, rng);
      if (!requireCarry) {
        // largest digit of a times largest digit of b must stay under 10
        const m = Math.max(...digitsOf(a, len));
        b = cappedNumber(len, Math.floor(9 / m), rng);
      }
      const steps = buildMulSteps({ op: 'mul', a, b, len });
      const ok = requireCarry ? regroups(steps) : !mulCarries(steps);
      if (ok) return { op: 'mul', a, b, len };
      continue;
    }
    let a = randomNumber(len, rng), b = randomNumber(len, rng);
    if (op === 'add') {
      const n = countCarries(a, b, len);
      if (requireCarry ? n >= 1 : n === 0) return { op: 'add', a, b, len };
    } else {
      if (a < b) [a, b] = [b, a];
      // Keep the answer the same length as the inputs (no leading zero).
      const n = countBorrows(a, b, len);
      if (a - b >= Math.pow(10, len - 1) && (requireCarry ? n >= 1 : n === 0)) {
        return { op: 'sub', a, b, len };
      }
    }
  }
  throw new Error('Could not generate a problem');
}


// Multiplication: a number has len digits (same len for both). Row j is the bottom digit j times
// the top number, shifted j places left. Then the rows are added column by column.
function cappedNumber(len, cap, rng) {
  let n = randInt(1, cap, rng);
  for (let i = 1; i < len; i++) n = n * 10 + randInt(0, cap, rng);
  return n;
}

// True when a multiply row carries (a digit product of 10 or more).
function mulCarries(steps) {
  return steps.some((s) => s.effects.some((e) => e.kind === 'mcarry'));
}

// True when a step needs two digits: a product or a sum of 10 or more (zero placeholders excluded).
function regroups(steps) {
  return steps.some((s) => s.expected.length > 1 && !/^0+$/.test(s.expected));
}

function buildMulSteps(p) {
  const len = p.len, da = digitsOf(p.a, len), db = digitsOf(p.b, len);
  const single = len === 1; // one digit: the only partial row is the answer row
  const rowOf = (j) => (single ? 'ans' : 'pp' + j);
  const put = (j, col, value) => (single ? { kind: 'ans', col, value: String(value) } : { kind: 'pp', row: j, col, value: String(value) });
  const written = []; // written[j][col] = digit placed in partial row j
  const steps = [];
  for (let j = 0; j < len; j++) {
    written[j] = {};
    if (j > 0) {
      // empty places on the right of row j hold zeros
      const effects = [], targets = [];
      for (let k = j - 1; k >= 0; k--) {
        effects.push(put(j, k, 0));
        targets.push({ row: rowOf(j), col: k });
        written[j][k] = 0;
      }
      steps.push({
        title: 'Row ' + (j + 1),
        question: 'Row ' + (j + 1) + ': write ' + (j === 1 ? 'a 0' : j + ' zeros') + ' in the empty places.',
        expected: '0'.repeat(j),
        hint: 'Each empty place on the right is a 0.',
        success: 'Good. Row ' + (j + 1) + ' is shifted left.',
        effects,
        targets,
        focus: { top: -1, bottom: -1 } // no digit is the focus, so all top and bottom digits dim
      });
    }
    let carry = 0;
    for (let i = 0; i < len; i++) {
      const prod = da[i] * db[j] + carry, col = i + j, last = i === len - 1;
      const effects = [], targets = [];
      let success;
      if (carry) effects.push({ kind: 'use', row: 'carry', col: i });
      if (prod >= 10 && !last) {
        effects.push(put(j, col, prod % 10), { kind: 'mcarry', col: i + 1, value: String(Math.floor(prod / 10)) });
        targets.push({ row: 'carry', col: i + 1 }, { row: rowOf(j), col });
        written[j][col] = prod % 10;
        success = 'Write the ' + (prod % 10) + ' and carry the ' + Math.floor(prod / 10) + ' above the ' + PLACES[i + 1] + '.';
      } else if (prod >= 10) {
        effects.push(put(j, col + 1, Math.floor(prod / 10)), put(j, col, prod % 10));
        targets.push({ row: rowOf(j), col: col + 1 }, { row: rowOf(j), col });
        written[j][col + 1] = Math.floor(prod / 10);
        written[j][col] = prod % 10;
        success = prod + ' is ten or more, so write ' + prod + ' in full.';
      } else {
        effects.push(put(j, col, prod));
        targets.push({ row: rowOf(j), col });
        written[j][col] = prod;
        success = 'Write the ' + prod + '.';
      }
      steps.push({
        title: 'Row ' + (j + 1) + ', ' + PLACES[i],
        question: 'What is ' + db[j] + ' × ' + da[i] + (carry ? ' + ' + carry + '? (the ' + carry + ' is the one you carried)' : '?'),
        expected: String(prod),
        hint: 'Use your times table: ' + db[j] + ' × ' + da[i] + '.',
        success,
        effects,
        targets,
        focus: { top: i, bottom: j } // board dims every other top and bottom digit
      });
      carry = Math.floor(prod / 10);
    }
  }
  if (!single) {
    const L = String(p.a * p.b).length; // digits in the answer
    let addCarry = 0;
    for (let c = 0; c < L; c++) {
      const parts = [];
      for (let j = 0; j < len; j++) if (c in written[j]) parts.push(written[j][c]);
      if (addCarry) parts.push(addCarry);
      const sum = parts.reduce((x, y) => x + y, 0);
      let question = 'What is ' + parts.join(' + ') + '?';
      if (addCarry) question = 'What is ' + parts.join(' + ') + '? (the ' + addCarry + ' is the one you carried)';
      else if (parts.length === 1) question += ' Bring it down.';
      const effects = [], targets = [];
      if (addCarry) effects.push({ kind: 'use', row: 'acarry', col: c });
      let success;
      if (sum < 10) {
        effects.push({ kind: 'ans', col: c, value: String(sum) });
        targets.push({ row: 'ans', col: c });
        success = 'Write the ' + sum + '.';
      } else {
        effects.push({ kind: 'ans', col: c, value: String(sum % 10) }, { kind: 'acarry', col: c + 1, value: String(Math.floor(sum / 10)) });
        targets.push({ row: 'acarry', col: c + 1 }, { row: 'ans', col: c });
        success = 'Write the ' + (sum % 10) + ' and carry the ' + Math.floor(sum / 10) + ' to the ' + PLACES[c + 1] + '.';
      }
      steps.push({
        title: 'Adding ' + PLACES[c],
        question,
        expected: String(sum),
        hint: 'Add the digits in this column. Add the carry too.',
        success,
        effects,
        targets
      });
      addCarry = Math.floor(sum / 10);
    }
  }
  return steps;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/*
 * Each step: { title, question, expected, hint, success, effects, targets }
 *   effects: what to write on the board once the step is answered correctly
 *     { kind: 'ans',    col, value }  -> digit in the answer row
 *     { kind: 'carry',  col, value }  -> small carried digit above a column
 *     { kind: 'newTop', col, value }  -> crossed-out top digit, new value above
 *   targets: cells to highlight while the step is active: { row, col }
 */
function buildAddSteps(p) {
  const len = p.len, da = digitsOf(p.a, len), db = digitsOf(p.b, len);
  const steps = [];
  let carry = 0;
  for (let i = 0; i < len; i++) {
    const s = da[i] + db[i] + carry, last = i === len - 1;
    const q = carry
      ? 'What is ' + da[i] + ' + ' + db[i] + ' + ' + carry + '? (the ' + carry + ' is the one you carried)'
      : 'What is ' + da[i] + ' + ' + db[i] + '?';
    const effects = [], targets = [];
    let success;
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
      success,
      effects,
      targets
    });
    carry = s >= 10 ? 1 : 0;
  }
  return steps;
}

function buildSubSteps(p) {
  const len = p.len, cur = digitsOf(p.a, len), db = digitsOf(p.b, len);
  const steps = [];
  let lent = 0; // lent: 1 if the column below borrowed from this one
  for (let i = 0; i < len; i++) {
    const title = capitalize(PLACES[i]) + ' column';
    const bot = db[i] + lent;
    let nextLent = 0;
    if (cur[i] < bot) {
      steps.push({
        title,
        question: cur[i] + ' is smaller than ' + bot + ', so borrow! Add 10 to the ' + cur[i] + '. What do you get?',
        expected: String(cur[i] + 10),
        hint: 'Ten plus ' + cur[i] + '.',
        success: 'Now the top digit is ' + (cur[i] + 10) + '. The ' + PLACES[i + 1] + ' bottom digit now has a 1 under it.',
        effects: [{ kind: 'newTop', col: i, value: String(cur[i] + 10) }, { kind: 'borrow', col: i + 1, value: '1' }],
        targets: [{ row: 'carry', col: i }]
      });
      cur[i] += 10;
      nextLent = 1;
    }
    const d = cur[i] - bot;
    steps.push({
      title,
      question: 'What is ' + cur[i] + ' ' + MINUS + ' ' + db[i] + (lent ? ' ' + MINUS + ' 1' : '') + '?',
      expected: String(d),
      hint: 'Start at ' + bot + ' and count up to ' + cur[i] + '. How many steps?',
      success: 'Write the ' + d + '.',
      effects: [{ kind: 'ans', col: i, value: String(d) }],
      targets: [{ row: 'ans', col: i }]
    });
    lent = nextLent;
  }
  return steps;
}

export function buildSteps(p) {
  if (p.op === 'mul') return buildMulSteps(p);
  return p.op === 'add' ? buildAddSteps(p) : buildSubSteps(p);
}

export function solution(p) {
  if (p.op === 'mul') return String(p.a * p.b);
  return String(p.op === 'add' ? p.a + p.b : p.a - p.b);
}

const Engine = { PLACES, MINUS, digitsOf, generateProblem, buildSteps, solution };
export default Engine;
