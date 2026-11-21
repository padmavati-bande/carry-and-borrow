// Run with: node tests/board.test.js
// Checks the board layout and the view helpers that drive highlights and typed digits.
import assert from 'assert';
import { newCur } from '../src/game/reducer.js';
import { boardCells } from '../src/game/board.js';
import { activeStep, activeCol, bufferFor, wide, isTarget } from '../src/game/view.js';

const keys = (cells) => cells.map((c) => c.key);
const cell = (cells, key) => cells.find((c) => c.key === key);

// addition 58 + 67: step 0 is 8 + 7 = 15, two answer cells (col 0 and extra col -1)
{
  const cur = newCur({ op: 'add', a: 58, b: 67, len: 2 });
  assert.strictEqual(wide(cur), true, 'two-digit sum widens the answer row');
  assert.strictEqual(isTarget(cur, 'ans', 0), true);
  assert.strictEqual(isTarget(cur, 'ans', -1), true);
  assert.strictEqual(isTarget(cur, 'carry', 1), false);
  assert.strictEqual(activeCol(cur), 0);

  const { cells, rows, ansRow } = boardCells(cur);
  assert.strictEqual(rows, 4);
  assert.strictEqual(ansRow, 3);
  assert.deepStrictEqual(keys(cells).filter((k) => /^ans--?\d+$/.test(k)), ['ans-2', 'ans-1', 'ans-0', 'ans--1']);
  assert.equal(cell(cells, 'top-1').text, 5); // digits are numbers here, rendered as text
  assert.equal(cell(cells, 'top-0').text, 8);
  assert.equal(cell(cells, 'bottom-0').text, 7);
  assert.strictEqual(cell(cells, 'op').text, '+');

  // typed digits fill the target cells in order: first digit under the ones, second in the extra cell
  const typed = { ...cur, buffer: '1' };
  assert.strictEqual(bufferFor(typed, 'ans', 0), '1');
  assert.strictEqual(bufferFor(typed, 'ans', -1), '');
  const both = { ...cur, buffer: '15' };
  assert.strictEqual(bufferFor(both, 'ans', -1), '5');
  assert.strictEqual(cell(boardCells(both).cells, 'ans--1').text, '5');
}

// addition step with no carry: one answer cell, row not widened
{
  const cur = newCur({ op: 'add', a: 58, b: 67, len: 2 });
  const next = { ...cur, stepIndex: 1, buffer: '' };
  assert.strictEqual(wide(next), false);
  assert.strictEqual(isTarget(next, 'ans', -1), false);
  assert.strictEqual(activeStep(next).expected, '12');
}

// subtraction 52 - 28: step 0 borrows, so the highlight sits on the carry row
{
  const cur = newCur({ op: 'sub', a: 52, b: 28, len: 2 });
  const { cells, rows, ansRow } = boardCells(cur);
  assert.strictEqual(rows, 5);
  assert.strictEqual(ansRow, 4);
  assert.ok(cell(cells, 'carry-0').cls.includes('target'), 'borrow highlights carry cell');
  assert.ok(cell(cells, 'op2'), 'subtraction has a second operator row');
  assert.ok(cell(cells, 'mark-1'), 'subtraction has a borrow mark row');
}

// zero digit in the top number renders as 0 (305 - 168, middle column)
{
  const cur = newCur({ op: 'sub', a: 305, b: 168, len: 3 });
  assert.strictEqual(cell(boardCells(cur).cells, 'top-1').text, 0);
}

// dim: digits outside the active column fade
{
  const cur = newCur({ op: 'add', a: 58, b: 67, len: 2 });
  const { cells } = boardCells(cur);
  assert.ok(!cell(cells, 'top-0').cls.includes('dim'), 'active column not dimmed');
  assert.ok(cell(cells, 'top-1').cls.includes('dim'), 'other column dimmed');
}

// wrong answer shakes the target cells only
{
  const cur = { ...newCur({ op: 'sub', a: 52, b: 28, len: 2 }), wrongPending: true };
  const { cells } = boardCells(cur);
  assert.ok(cell(cells, 'carry-0').cls.includes('shake'));
  assert.ok(!cell(cells, 'carry-1').cls.includes('shake'));
}

// finished problem: no highlights, no dimming
{
  const cur = { ...newCur({ op: 'add', a: 27, b: 36, len: 2 }), finished: true };
  const { cells } = boardCells(cur);
  assert.ok(cells.every((c) => !c.cls.includes('target') && !c.cls.includes('dim')));
}

// 1-digit subtraction 9 - 3: no carry row, no mark row, rule under the bottom number
{
  const cur = newCur({ op: 'sub', a: 9, b: 3, len: 1 });
  const { cells, rows, ansRow } = boardCells(cur);
  assert.strictEqual(rows, 3);
  assert.strictEqual(ansRow, 2);
  assert.strictEqual(keys(cells).filter((k) => k.startsWith('carry') || k.startsWith('mark') || k === 'op2').length, 0);
  assert.ok(cell(cells, 'bottom-0').cls.includes('rule'), 'rule sits under bottom number');
  assert.ok(cell(cells, 'ans-0'), 'answer cell present');
}

// 2-digit subtraction with no borrow (47 - 12): same slim layout as 1-digit
{
  const cur = newCur({ op: 'sub', a: 47, b: 12, len: 2 });
  const { cells, rows, ansRow } = boardCells(cur);
  assert.strictEqual(rows, 3);
  assert.strictEqual(ansRow, 2);
  assert.strictEqual(keys(cells).filter((k) => k.startsWith('carry') || k.startsWith('mark') || k === 'op2').length, 0);
  assert.ok(cell(cells, 'bottom-0').cls.includes('rule'), 'rule sits under bottom number');
}

// multiplication 59 x 45: carry row, top, bottom, addition carry row, 2 partial rows, answer
{
  const cur = newCur({ op: 'mul', a: 59, b: 45, len: 2 });
  const { cells, cols, rows, ansRow } = boardCells(cur);
  assert.strictEqual(cols, 4);
  assert.strictEqual(rows, 7);
  assert.strictEqual(ansRow, 6);
  assert.ok(!cell(cells, 'carry-1').cls.includes('target'), 'first step: carry is typed at the bottom, not above');
  assert.ok(cell(cells, 'pp-0-1').cls.includes('target'), 'first step: carry digit in row 1, tens');
  assert.ok(cell(cells, 'pp-0-0').cls.includes('target'), 'first step: ones of row 1');
  assert.strictEqual(cell(cells, 'top-1').text, 5);
  assert.strictEqual(cell(cells, 'bottom-0').text, 5);
  assert.ok(!cell(cells, 'top-0').cls.includes('dim'), 'focus top digit not dimmed');
  assert.ok(cell(cells, 'top-1').cls.includes('dim'), 'other top digit dimmed');
  assert.ok(cell(cells, 'pp-op').cls.includes('op'), 'plus sign sits on the last partial row');
}

// 7 x 8: one digit, no carry or partial rows, answer row under the rule
{
  const { rows, ansRow, cols } = boardCells(newCur({ op: 'mul', a: 7, b: 8, len: 1 }));
  assert.strictEqual(rows, 3);
  assert.strictEqual(ansRow, 2);
  assert.strictEqual(cols, 2);
}

// 4-digit x 4-digit: 8 digit columns (+ the operator column)
{
  const { cols, rows } = boardCells(newCur({ op: 'mul', a: 1234, b: 5678, len: 4 }));
  assert.strictEqual(cols, 8);
  assert.strictEqual(rows, 9); // carry, top, bottom, addition carry, 4 partial rows, answer
}

// placeholder-zero step of 59 x 45 (step 2): every top and bottom digit is dimmed
{
  const cur = { ...newCur({ op: 'mul', a: 59, b: 45, len: 2 }), stepIndex: 2 };
  assert.strictEqual(activeStep(cur).expected, '0');
  const { cells } = boardCells(cur);
  ['top-0', 'top-1', 'bottom-0', 'bottom-1'].forEach((k) => assert.ok(cell(cells, k).cls.includes('dim'), k + ' dimmed'));
}

// division 92 ÷ 4: quotient row on top, divisor in the left column, product and remainder rows
{
  const cur = newCur({ op: 'div', a: 92, b: 4, len: 2 });
  const { cells, cols, rows, ansRow } = boardCells(cur);
  assert.strictEqual(cols, 3);
  assert.strictEqual(rows, 6);
  assert.strictEqual(ansRow, 5);
  assert.strictEqual(cell(cells, 'top-2').text, '4', 'divisor sits left of the dividend');
  assert.ok(cell(cells, 'top-2').cls.includes('divisor'));
  assert.equal(cell(cells, 'top-1').text, 9);
  assert.equal(cell(cells, 'top-0').text, 2);
  assert.strictEqual(cell(cells, 'prod0-2').text, '−');
  assert.ok(cell(cells, 'qt-1').cls.includes('target'), 'first step types the quotient tens digit');
  assert.ok(!cell(cells, 'qt-0').cls.includes('target'));
  assert.strictEqual(keys(cells).filter((k) => /^bd\d/.test(k)).length, 3, 'bd1 row has one cell per column');
}

// division 812 ÷ 4: a zero quotient digit still gets its own rows
{
  const { rows, cols } = boardCells(newCur({ op: 'div', a: 812, b: 4, len: 3 }));
  assert.strictEqual(cols, 4);
  assert.strictEqual(rows, 8);
}

// division 9999 ÷ 2: four quotient digits, the tallest board (13 rows)
{
  const { rows } = boardCells(newCur({ op: 'div', a: 9999, b: 2, len: 4 }));
  assert.strictEqual(rows, 10);
}

// division: a dropped digit slides down from the dividend (fly class, distance in rows)
{
  const cur0 = newCur({ op: 'div', a: 92, b: 4, len: 2 });
  const cur = { ...cur0, view: { ...cur0.view, pp: { 'bd1:0': '2' }, flyTo: 'bd1', fly: 0, flySrc: 'top', flySrcCol: 0 } };
  const c = cell(boardCells(cur).cells, 'bd1-0');
  assert.ok(c.cls.includes('fly'), 'dropped digit has fly class');
  assert.strictEqual(c.style['--fy'], '-2', 'starts two rows above: top to bd1');
  assert.strictEqual(c.style['--fx'], '0');
}

// division: a two-digit product fills its two target cells in order
{
  const cur = { ...newCur({ op: 'div', a: 92, b: 4, len: 2 }), stepIndex: 4 };
  assert.strictEqual(activeStep(cur).expected, '12');
  const one = { ...cur, buffer: '1' };
  assert.strictEqual(bufferFor(one, 'prod1', 1), '1');
  assert.strictEqual(bufferFor(one, 'prod1', 0), '');
  const both = { ...cur, buffer: '12' };
  assert.strictEqual(bufferFor(both, 'prod1', 1), '1');
  assert.strictEqual(bufferFor(both, 'prod1', 0), '2');
  assert.strictEqual(cell(boardCells(both).cells, 'prod1-0').text, '2');
}

console.log('OK - board: layout, highlights, typed digits, dim, shake, finished.');
