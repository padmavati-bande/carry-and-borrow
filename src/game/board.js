import * as Engine from '../../engine.js';
import { sym } from '../utils.js';
import { activeCol, activeStep, bufferFor, wide, isTarget } from './view.js';

// Board layout as plain data: rows top to bottom, digits right to left.
// Each layout returns { cols, rows, ansRow, cells }. The grid uses cols and rows; ansRow is the answer row.

const shake = (cur, row, col) => (cur.wrongPending && isTarget(cur, row, col) ? ' shake' : '');
const spacer = (key) => ({ key, cls: 'spacer', text: '' });

// Cells of one row, right to left: cell(c) for c = cols-1 down to lo.
function across(cols, lo, cell) {
  const out = [];
  for (let c = cols - 1; c >= lo; c--) out.push(cell(c));
  return out;
}

// A carry row (above the top number, or above the answer row for an addition carry).
// flies(c): this column's carry is moving now. flyStyle(c): its start offset.
// old: struck carries, shown crossed out. Omit old for a row without struck carries.
function carryCells(cur, row, cols, live, old, flies, flyStyle) {
  return across(cols, 0, (c) => {
    const tgt = isTarget(cur, row, c);
    const text = tgt ? bufferFor(cur, row, c) : (live[c] || '');
    const fly = flies(c);
    const cell = {
      key: row + '-' + c,
      cls: 'carry' + (text ? ' filled' : '') + (tgt ? ' target' : '') + (fly ? ' fly' : '') + shake(cur, row, c),
      text,
      style: fly ? flyStyle(c) : undefined
    };
    if (old) cell.old = old[c] || '';
    return cell;
  });
}

// Multiplication layout. Rows, top to bottom: carry row (only if a multiply carry is used), top,
// bottom with rule, addition carry row (only if used), one partial row per bottom digit (the last
// one has the + sign), answer row. One digit: no partial rows, the answer row is the product row.
function mulCells(cur) {
  const p = cur.problem, len = p.len, cols = 2 * len, v = cur.view;
  const da = Engine.digitsOf(p.a, len), db = Engine.digitsOf(p.b, len);
  const hasCarry = Engine.usesEffect(cur.steps, 'mcarry'), hasAcarry = Engine.usesEffect(cur.steps, 'acarry');
  const focus = !cur.finished && !cur.settle ? activeStep(cur).focus : undefined;
  const inFocus = (which, c) => !focus || focus[which] === c;
  const partial = len >= 2 ? Array.from({ length: len }, (_, j) => 'pp' + j) : [];
  const rowList = [...(hasCarry ? ['carry'] : []), 'top', 'bottom', ...(hasAcarry ? ['acarry'] : []), ...partial, 'ans'];
  const rowIdx = (name) => rowList.indexOf(name);
  const cells = [];

  const carryRowMul = (row, live, old, key) => {
    const flies = (c) => v.flyTo === row && v.fly === c; // mul carry flies from the digit it was typed in
    // start offset from the source cell: rows down, columns right
    const flyStyle = (c) => ({ '--fy': String(rowIdx(v.flySrc) - rowIdx(row)), '--fx': String(c - v.flySrcCol) });
    return [spacer(key), ...carryCells(cur, row, cols, live, old, flies, flyStyle)];
  };

  if (hasCarry) cells.push(...carryRowMul('carry', v.carry, v.cstruck, 'carry-sp'));

  cells.push(spacer('top-sp'), ...across(cols, 0, (c) => (
    { key: 'top-' + c, cls: 'top' + (inFocus('top', c) ? '' : ' dim') + shake(cur, 'top', c), text: c < len ? da[c] : '' }
  )));

  cells.push({ key: 'op', cls: 'op rule', text: sym(p.op) });
  cells.push(...across(cols, 0, (c) => (
    { key: 'bottom-' + c, cls: 'bottom rule' + (inFocus('bottom', c) ? '' : ' dim') + shake(cur, 'bottom', c), text: c < len ? db[c] : '' }
  )));

  if (hasAcarry) cells.push(...carryRowMul('acarry', v.acarry, v.astruck, 'acarry-sp'));

  partial.forEach((row, j) => {
    const last = j === len - 1;
    if (last) cells.push({ key: 'pp-op', cls: 'op rule', text: '+' });
    else cells.push(spacer('pp-sp-' + j));
    cells.push(...across(cols, 0, (c) => {
      const tgt = isTarget(cur, row, c);
      return {
        key: 'pp-' + j + '-' + c,
        cls: 'pp' + (last ? ' rule' : '') + (tgt ? ' target' : '') + shake(cur, row, c),
        text: tgt ? bufferFor(cur, row, c) : (v.pp[j + ':' + c] || '')
      };
    }));
  });

  cells.push(spacer('ans-sp'), ...across(cols, 0, (c) => {
    const tgt = isTarget(cur, 'ans', c);
    const just = v.just && v.just.indexOf(c) !== -1;
    return {
      key: 'ans-' + c,
      cls: 'ans' + (tgt ? ' target' : '') + (just ? ' just' : '') + shake(cur, 'ans', c),
      text: tgt ? bufferFor(cur, 'ans', c) : v.ans[c] || ''
    };
  }));

  const rows = rowList.length;
  return { cols, rows, ansRow: rows - 1, cells };
}

// Addition and subtraction layout. Subtraction with a borrow adds a mark row above the rule.
function addSubCells(cur) {
  const p = cur.problem, len = p.len, cols = len + 1, v = cur.view;
  const da = Engine.digitsOf(p.a, len), db = Engine.digitsOf(p.b, len);
  const sub = p.op === 'sub';
  // no borrow (1-digit subtraction, or carry switch off): no carry row and no mark row, lays out like addition
  const slim = sub && !Engine.usesEffect(cur.steps, 'borrow');
  const rule = sub && !slim ? '' : ' rule';

  // digits outside the active column fade
  const act = cur.finished ? null : activeCol(cur);
  const dim = (col) => (!cur.finished && col !== act ? ' dim' : '');

  const cells = [];
  if (!slim) {
    cells.push(spacer('carry-sp'), ...carryCells(cur, 'carry', cols, v.carry, undefined,
      (c) => v.fly === c, () => ({ '--fx': v.slide ? '1' : '0' }))); // ones column starts one cell right
  }

  cells.push(spacer('top-sp'), ...across(cols, 0, (c) => (
    { key: 'top-' + c, cls: 'top' + (v.struck[c] ? ' struck' : '') + dim(c) + shake(cur, 'top', c), text: c < len ? da[c] : '' }
  )));

  // subtraction: borrow row sits above the rule, with its own operator.
  // addition: rule goes straight under the bottom number.
  cells.push({ key: 'op', cls: 'op' + rule, text: sym(p.op) });
  cells.push(...across(cols, 0, (c) => (
    { key: 'bottom-' + c, cls: 'bottom' + rule + dim(c) + shake(cur, 'bottom', c), text: c < len ? db[c] : '' }
  )));
  if (sub && !slim) {
    cells.push({ key: 'op2', cls: 'op rule', text: sym(p.op) });
    cells.push(...across(cols, 0, (c) => (
      { key: 'mark-' + c, cls: 'mark rule' + dim(c) + shake(cur, 'mark', c), text: v.mark[c] || '' }
    )));
  }

  // answer row; one extra cell right of the ones column when the first step needs it
  cells.push(spacer('ans-sp'), ...across(cols, wide(cur) ? -1 : 0, (c) => {
    const just = v.just && v.just.indexOf(c) !== -1;
    const tg2 = isTarget(cur, 'ans', c);
    const text = tg2 ? bufferFor(cur, 'ans', c) : v.ans[c] || '';
    return {
      key: 'ans-' + c,
      cls: 'ans' + (tg2 ? ' target' : '') + (just ? ' just' : '') + (v.slide && text ? ' slide' : '') + (c < 0 ? ' extra' : '') + shake(cur, 'ans', c),
      text
    };
  }));

  const rowList = [...(slim ? [] : ['carry']), 'top', 'bottom', ...(sub && !slim ? ['mark'] : []), 'ans'];
  const rows = rowList.length;
  return { cols, rows, ansRow: rows - 1, cells };
}

const LAYOUTS = { add: addSubCells, sub: addSubCells, mul: mulCells };

export function boardCells(cur) {
  return LAYOUTS[cur.problem.op](cur);
}
