/*
 * Problem generator and step builder for addition, subtraction and multiplication.
 * Pure functions only (no DOM) so they can be tested with plain Node.
 *
 * Columns are numbered from the right: col 0 = ones, 1 = tens, 2 = hundreds...
 * A new operation: add one entry to OPS below. Nothing else in this file needs a branch.
 */

// 4-digit x 4-digit multiply reaches column 7, so the names run to ten-millions.
export const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands',
  'hundred-thousands', 'millions', 'ten-millions'];
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

// A number with `len` digits, every digit 0..cap (first digit 1..cap).
function cappedNumber(len, cap, rng) {
  let n = randInt(1, cap, rng);
  for (let i = 1; i < len; i++) n = n * 10 + randInt(0, cap, rng);
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

// True when some step writes an effect of this kind.
export function usesEffect(steps, kind) {
  return steps.some((s) => s.effects.some((e) => e.kind === kind));
}

// True when a multiply row carries (a digit product of 10 or more).
function mulCarries(steps) {
  return usesEffect(steps, 'mcarry');
}

// True when a step needs two digits: a product or a sum of 10 or more (zero placeholders excluded).
export function regroups(steps) {
  return steps.some((s) => s.expected.length > 1 && !/^0+$/.test(s.expected));
}

// Every step has the same keys. focus is optional: only multiply rows set it.
function step(fields) {
  return { focus: null, ...fields };
}

// The note under a carried digit: "(the 1 is the one you carried)".
function carried(n) {
  return ' (the ' + n + ' is the one you carried)';
}

// Each pick* returns one problem, or null when the random pair does not fit the carry switch.
function pickAdd(len, rng, carry) {
  const a = randomNumber(len, rng), b = randomNumber(len, rng);
  const n = countCarries(a, b, len);
  return (carry ? n >= 1 : n === 0) ? { op: 'add', a, b, len } : null;
}

function pickSub(len, rng, carry) {
  let a = randomNumber(len, rng), b = randomNumber(len, rng);
  if (a < b) [a, b] = [b, a];
  // Keep the answer the same length as the inputs (no leading zero).
  const n = countBorrows(a, b, len);
  return (a - b >= Math.pow(10, len - 1) && (carry ? n >= 1 : n === 0)) ? { op: 'sub', a, b, len } : null;
}

function pickMul(len, rng, carry) {
  // one-digit x: all pairs 1-9 x 1-9, the carry switch does not apply
  if (len === 1) return { op: 'mul', a: randomNumber(1, rng), b: randomNumber(1, rng), len: 1 };
  const a = randomNumber(len, rng);
  let b = randomNumber(len, rng);
  // carry off: the largest digit of a times the largest digit of b must stay under 10
  if (!carry) b = cappedNumber(len, Math.floor(9 / Math.max(...digitsOf(a, len))), rng);
  const steps = buildMulSteps({ op: 'mul', a, b, len });
  return (carry ? regroups(steps) : !mulCarries(steps)) ? { op: 'mul', a, b, len } : null;
}

// Division: a has len digits, b is one digit 2-9, and a >= b so the quotient has no leading zero.
// The carry switch does not apply to division.
function pickDiv(len, rng) {
  const a = randomNumber(len, rng), b = randInt(2, 9, rng);
  return a >= b ? { op: 'div', a, b, len } : null;
}

/*
 * op: a key of OPS. len: digits in each number (1-4).
 * requireCarry (default true): on = every problem needs at least one carry (add) or borrow (sub).
 * off = no problem may have a carry or borrow.
 */
export function generateProblem(op, len, rng = Math.random, requireCarry = true) {
  for (let tries = 0; tries < 5000; tries++) {
    const p = OPS[op].pick(len, rng, requireCarry);
    if (p) return p;
  }
  throw new Error('Could not generate a problem');
}

// Multiplication: a number has len digits (same len for both). Row j is the bottom digit j times
// the top number, shifted j places left. Then the rows are added column by column.
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
      steps.push(step({
        title: 'Row ' + (j + 1),
        question: 'Row ' + (j + 1) + ': write ' + (j === 1 ? 'a 0' : j + ' zeros') + ' in the empty places.',
        expected: '0'.repeat(j),
        hint: 'Each empty place on the right is a 0.',
        success: 'Good. Row ' + (j + 1) + ' is shifted left.',
        effects,
        targets,
        focus: { top: -1, bottom: -1 } // no digit is the focus, so all top and bottom digits dim
      }));
    }
    let carry = 0;
    for (let i = 0; i < len; i++) {
      const prod = da[i] * db[j] + carry, col = i + j, last = i === len - 1;
      const effects = [], targets = [];
      let success;
      if (carry) effects.push({ kind: 'use', row: 'carry', col: i });
      if (prod >= 10 && !last) {
        effects.push(put(j, col, prod % 10), { kind: 'mcarry', col: i + 1, value: String(Math.floor(prod / 10)), src: rowOf(j), srcCol: col + 1 });
        targets.push({ row: rowOf(j), col: col + 1 }, { row: rowOf(j), col });
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
      steps.push(step({
        title: 'Row ' + (j + 1) + ', ' + PLACES[i],
        question: 'What is ' + db[j] + ' × ' + da[i] + (carry ? ' + ' + carry + '?' + carried(carry) : '?'),
        expected: String(prod),
        hint: 'Use your times table: ' + db[j] + ' × ' + da[i] + '.',
        success,
        effects,
        targets,
        focus: { top: i, bottom: j } // board dims every other top and bottom digit
      }));
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
      if (addCarry) question = 'What is ' + parts.join(' + ') + '?' + carried(addCarry);
      else if (parts.length === 1) question += ' Bring it down.';
      const effects = [], targets = [];
      if (addCarry) effects.push({ kind: 'use', row: 'acarry', col: c });
      let success;
      if (sum < 10) {
        effects.push({ kind: 'ans', col: c, value: String(sum) });
        targets.push({ row: 'ans', col: c });
        success = 'Write the ' + sum + '.';
      } else {
        effects.push({ kind: 'ans', col: c, value: String(sum % 10) }, { kind: 'acarry', col: c + 1, value: String(Math.floor(sum / 10)), src: 'ans', srcCol: c + 1 });
        targets.push({ row: 'ans', col: c + 1 }, { row: 'ans', col: c });
        success = 'Write the ' + (sum % 10) + ' and carry the ' + Math.floor(sum / 10) + ' to the ' + PLACES[c + 1] + '.';
      }
      steps.push(step({
        title: 'Adding ' + PLACES[c],
        question,
        expected: String(sum),
        hint: 'Add the digits in this column. Add the carry too.',
        success,
        effects,
        targets
      }));
      addCarry = Math.floor(sum / 10);
    }
  }
  return steps;
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

/*
 * Each step: { title, question, expected, hint, success, effects, targets, focus }
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
    const q = 'What is ' + da[i] + ' + ' + db[i] + (carry ? ' + ' + carry + '?' + carried(carry) : '?');
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
    steps.push(step({
      title: capitalize(PLACES[i]) + ' column',
      question: q,
      expected: String(s),
      hint: 'Start at ' + Math.max(da[i] + carry, db[i]) + ' and count up ' + Math.min(da[i] + carry, db[i]) + ' more.',
      success,
      effects,
      targets
    }));
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
      steps.push(step({
        title,
        question: cur[i] + ' is smaller than ' + bot + ', so borrow! Add 10 to the ' + cur[i] + '. What do you get?',
        expected: String(cur[i] + 10),
        hint: 'Ten plus ' + cur[i] + '.',
        success: 'Now the top digit is ' + (cur[i] + 10) + '. The ' + PLACES[i + 1] + ' bottom digit now has a 1 under it.',
        effects: [{ kind: 'newTop', col: i, value: String(cur[i] + 10) }, { kind: 'borrow', col: i + 1, value: '1' }],
        targets: [{ row: 'carry', col: i }]
      }));
      cur[i] += 10;
      nextLent = 1;
    }
    const d = cur[i] - bot;
    steps.push(step({
      title,
      question: 'What is ' + cur[i] + ' ' + MINUS + ' ' + db[i] + (lent ? ' ' + MINUS + ' 1' : '') + '?',
      expected: String(d),
      hint: 'Start at ' + bot + ' and count up to ' + cur[i] + '. How many steps?',
      success: 'Write the ' + d + '.',
      effects: [{ kind: 'ans', col: i, value: String(d) }],
      targets: [{ row: 'ans', col: i }]
    }));
    lent = nextLent;
  }
  return steps;
}

// Long division plan: one entry per quotient digit. Used by the steps and by the board layout.
// Starts at the shortest left part of the dividend that is >= b, so no leading zero is typed.
export function divPlan(p) {
  const { b, len } = p, da = digitsOf(p.a, len);
  let idx = len - 1, n = da[idx];
  while (n < b && idx > 0) { idx--; n = n * 10 + da[idx]; }
  const parts = [];
  let rem = 0;
  for (let j = idx; j >= 0; j--) {
    const cur = j === idx ? n : rem * 10 + da[j];
    const q = Math.floor(cur / b), prod = q * b;
    rem = cur - prod;
    parts.push({ j, cur, q, prod, rem });
  }
  return parts;
}

/*
 * Long division: quotient on top, then for each quotient digit a product step and a
 * remainder step. Bringing down the next digit is part of the remainder step.
 */
function buildDivSteps(p) {
  const { b, len } = p, da = digitsOf(p.a, len);
  const parts = divPlan(p);
  const steps = [];
  parts.forEach(({ j, cur, q, prod, rem }, k) => {
    const title = capitalize(PLACES[j]) + ' column';
    const last = k === parts.length - 1;
    steps.push(step({
      title,
      question: 'How many times does ' + b + ' go into ' + cur + '?',
      expected: String(q),
      hint: 'Count in ' + b + 's up to ' + cur + '. How many steps?',
      success: b + ' goes into ' + cur + ' ' + q + ' times. Write the ' + q + ' on top.',
      effects: [{ kind: 'pp', row: 'qt', col: j, value: String(q) }],
      targets: [{ row: 'qt', col: j }]
    }));

    // product: digits go under the partial number, most significant digit first
    const ds = String(prod).split('');
    const pe = [], pt = [];
    ds.forEach((d, i) => {
      const col = j + (ds.length - 1 - i);
      pe.push({ kind: 'pp', row: 'prod' + k, col, value: d });
      pt.push({ row: 'prod' + k, col });
    });
    steps.push(step({
      title,
      question: 'What is ' + q + ' × ' + b + '?',
      expected: String(prod),
      hint: q === 0 ? '0 times ' + b + ' is 0.' : 'Add ' + b + ' together ' + q + ' times.',
      success: 'Write the ' + prod + ' under ' + cur + '.',
      effects: pe,
      targets: pt
    }));

    // remainder: a non-last remainder is written into the next bd row, where the next dividend
    // digit drops in beside it (shown, not typed). The last remainder stays in its own row.
    const rowName = last ? 'rem' + k : 'bd' + (k + 1);
    const re = [{ kind: 'pp', row: rowName, col: j, value: String(rem) }];
    if (!last) re.push({ kind: 'drop', row: rowName, col: j - 1, value: String(da[j - 1]), src: 'top', srcCol: j - 1 });
    steps.push(step({
      title,
      question: 'What is ' + cur + ' ' + MINUS + ' ' + prod + '?',
      expected: String(rem),
      hint: 'Start at ' + prod + ' and count up to ' + cur + '.',
      success: last ? 'Write the ' + rem + '. That is the remainder.' : 'Write the ' + rem + '. Bring down the ' + da[j - 1] + '.',
      effects: re,
      targets: [{ row: rowName, col: j }]
    }));
  });
  return steps;
}

// One entry per operation. The UI reads label, sym and oneDigitCarry from here.
// oneDigitCarry: false = a 1-digit problem can never need a carry or borrow.
export const OPS = {
  add: { label: 'Addition', sym: '+', oneDigitCarry: true, pick: pickAdd, steps: buildAddSteps, solution: (p) => String(p.a + p.b) },
  sub: { label: 'Subtraction', sym: MINUS, oneDigitCarry: false, pick: pickSub, steps: buildSubSteps, solution: (p) => String(p.a - p.b) },
  mul: { label: 'Multiplication', sym: '×', oneDigitCarry: true, pick: pickMul, steps: buildMulSteps, solution: (p) => String(p.a * p.b) },
  div: { label: 'Division', sym: '÷', oneDigitCarry: true, pick: pickDiv, steps: buildDivSteps,
    solution: (p) => Math.floor(p.a / p.b) + ' R ' + (p.a % p.b) },
};

export function buildSteps(p) {
  return OPS[p.op].steps(p);
}

export function solution(p) {
  return OPS[p.op].solution(p);
}

