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

// A number with `len` digits, none of them zero (keeps borrowing simple).
function randomNumber(len, rng) {
  let n = 0;
  for (let i = 0; i < len; i++) n = n * 10 + randInt(1, 9, rng);
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
 * op: 'add' | 'sub'. len: digits in each number (2-4).
 * Every problem needs at least one carry (add) or borrow (sub).
 */
export function generateProblem(op, len, rng = Math.random) {
  for (let tries = 0; tries < 5000; tries++) {
    let a = randomNumber(len, rng), b = randomNumber(len, rng);
    if (op === 'add') {
      if (countCarries(a, b, len) >= 1) return { op: 'add', a, b, len };
    } else {
      if (a < b) [a, b] = [b, a];
      // Keep the answer the same length as the inputs (no leading zero).
      if (a - b >= Math.pow(10, len - 1) && countBorrows(a, b, len) >= 1) {
        return { op: 'sub', a, b, len };
      }
    }
  }
  throw new Error('Could not generate a problem');
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

export function buildSteps(p) { return p.op === 'add' ? buildAddSteps(p) : buildSubSteps(p); }

export function solution(p) { return String(p.op === 'add' ? p.a + p.b : p.a - p.b); }

const Engine = { PLACES, MINUS, digitsOf, generateProblem, buildSteps, solution };
export default Engine;
