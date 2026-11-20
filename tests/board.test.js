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

console.log('OK - board: layout, highlights, typed digits, dim, shake, finished.');
