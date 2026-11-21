import Engine from '../../engine.js';
import { sym } from '../utils.js';
import { activeCol, activeStep, bufferFor, wide, isTarget } from './view.js';

// Board layout as plain data: rows top to bottom, digits right to left.
// Row order matches the old DOM order, so the grid lines up the same way.
// Multiplication layout. Rows, top to bottom: carry row (only if a multiply carry is used), top,
// bottom with rule, addition carry row (only if used), one partial row per bottom digit (the last
// one has the + sign), answer row. One digit: no partial rows, the answer row is the product row.
function mulCells(cur) {
  const p = cur.problem, len = p.len, cols = 2 * len, v = cur.view;
  const da = Engine.digitsOf(p.a, len), db = Engine.digitsOf(p.b, len);
  const has = (kind) => cur.steps.some((s) => s.effects.some((e) => e.kind === kind));
  const hasCarry = has('mcarry'), hasAcarry = has('acarry');
  const focus = !cur.finished && !cur.settle ? activeStep(cur).focus : undefined;
  const inFocus = (which, c) => !focus || focus[which] === c;
  const shake = (row, col) => (cur.wrongPending && isTarget(cur, row, col) ? ' shake' : '');
  const cells = [];
  const spacer = (key) => cells.push({ key, cls: 'spacer', text: '' });
  // grid row index (top = 0) of a named mul row
  const acIdx = (hasCarry ? 1 : 0) + 2;
  const rowIdx = (name) => (name === 'carry' ? 0 : name === 'acarry' ? acIdx
    : name === 'ans' ? acIdx + (hasAcarry ? 1 : 0) + (len >= 2 ? len : 0)
    : acIdx + (hasAcarry ? 1 : 0) + Number(name.slice(2)));
  const carryRow = (row, live, old, key) => {
    spacer(key);
    for (let c = cols - 1; c >= 0; c--) {
      const tgt = isTarget(cur, row, c);
      const text = tgt ? bufferFor(cur, row, c) : (live[c] || '');
      const flies = v.flyTo === row && v.fly === c; // mul carry flies from the digit it was typed in
      cells.push({
        key: row + '-' + c,
        cls: 'carry' + (text ? ' filled' : '') + (tgt ? ' target' : '') + (flies ? ' fly' : '') + shake(row, c),
        text,
        old: old[c] || '',
        // start offset from the source cell: rows down, columns right
        style: flies ? { '--fy': String(rowIdx(v.flySrc) - rowIdx(row)), '--fx': String(c - v.flySrcCol) } : undefined
      });
    }
  };

  if (hasCarry) carryRow('carry', v.carry, v.cstruck, 'carry-sp');

  spacer('top-sp');
  for (let c = cols - 1; c >= 0; c--) {
    cells.push({ key: 'top-' + c, cls: 'top' + (inFocus('top', c) ? '' : ' dim') + shake('top', c), text: c < len ? da[c] : '' });
  }

  cells.push({ key: 'op', cls: 'op rule', text: '×' });
  for (let c = cols - 1; c >= 0; c--) {
    cells.push({ key: 'bottom-' + c, cls: 'bottom rule' + (inFocus('bottom', c) ? '' : ' dim') + shake('bottom', c), text: c < len ? db[c] : '' });
  }

  if (hasAcarry) carryRow('acarry', v.acarry, v.astruck, 'acarry-sp');

  if (len >= 2) {
    for (let j = 0; j < len; j++) {
      const last = j === len - 1, row = 'pp' + j;
      if (last) cells.push({ key: 'pp-op', cls: 'op rule', text: '+' });
      else spacer('pp-sp-' + j);
      for (let c = cols - 1; c >= 0; c--) {
        const tgt = isTarget(cur, row, c);
        cells.push({
          key: 'pp-' + j + '-' + c,
          cls: 'pp' + (last ? ' rule' : '') + (tgt ? ' target' : '') + shake(row, c),
          text: tgt ? bufferFor(cur, row, c) : (v.pp[j + ':' + c] || '')
        });
      }
    }
  }

  spacer('ans-sp');
  for (let c = cols - 1; c >= 0; c--) {
    const tgt = isTarget(cur, 'ans', c);
    const just = v.just && v.just.indexOf(c) !== -1;
    cells.push({
      key: 'ans-' + c,
      cls: 'ans' + (tgt ? ' target' : '') + (just ? ' just' : '') + shake('ans', c),
      text: tgt ? bufferFor(cur, 'ans', c) : v.ans[c] || ''
    });
  }

  const rows = (hasCarry ? 1 : 0) + 2 + (hasAcarry ? 1 : 0) + (len >= 2 ? len : 0) + 1;
  return { cols, rows, ansRow: rows - 1, cells };
}

export function boardCells(cur) {
  if (cur.problem.op === 'mul') return mulCells(cur);
  const p = cur.problem, len = p.len, cols = len + 1, v = cur.view;
  const da = Engine.digitsOf(p.a, len), db = Engine.digitsOf(p.b, len);
  const sub = p.op === 'sub';
  // no borrow (1-digit subtraction, or carry switch off): no carry row and no mark row, lays out like addition
  const slim = sub && !cur.steps.some((s) => s.effects.some((e) => e.kind === 'borrow'));
  const rule = sub && !slim ? '' : ' rule';

  // digits outside the active column fade
  const act = cur.finished ? null : activeCol(cur);
  const dim = (col) => (!cur.finished && col !== act ? ' dim' : '');
  const shake = (row, col) => (cur.wrongPending && isTarget(cur, row, col) ? ' shake' : '');

  const cells = [];
  const spacer = (key) => cells.push({ key, cls: 'spacer', text: '' });

  // carry / borrow row
  if (!slim) {
    spacer('carry-sp');
    for (let c = cols - 1; c >= 0; c--) {
      const tgt = isTarget(cur, 'carry', c);
      const text = tgt ? bufferFor(cur, 'carry', c) : (v.carry[c] || '');
      const flies = v.fly === c;
      cells.push({
        key: 'carry-' + c,
        cls: 'carry' + (text ? ' filled' : '') + (tgt ? ' target' : '') + (flies ? ' fly' : '') + shake('carry', c),
        text,
        style: flies ? { '--fx': v.slide ? '1' : '0' } : undefined // ones column starts one cell right
      });
    }
  }

  // top number
  spacer('top-sp');
  for (let c = cols - 1; c >= 0; c--) {
    cells.push({ key: 'top-' + c, cls: 'top' + (v.struck[c] ? ' struck' : '') + dim(c) + shake('top', c), text: c < len ? da[c] : '' });
  }

  // subtraction: borrow row sits above the rule, with its own operator.
  // addition: rule goes straight under the bottom number.
  cells.push({ key: 'op', cls: 'op' + rule, text: sym(p.op) });
  for (let c = cols - 1; c >= 0; c--) {
    cells.push({ key: 'bottom-' + c, cls: 'bottom' + rule + dim(c) + shake('bottom', c), text: c < len ? db[c] : '' });
  }
  if (sub && !slim) {
    cells.push({ key: 'op2', cls: 'op rule', text: sym(p.op) });
    for (let c = cols - 1; c >= 0; c--) {
      cells.push({ key: 'mark-' + c, cls: 'mark rule' + dim(c) + shake('mark', c), text: v.mark[c] || '' });
    }
  }

  // answer row
  spacer('ans-sp');
  const w = wide(cur);
  for (let c = cols - 1; c >= (w ? -1 : 0); c--) {
    const just = v.just && v.just.indexOf(c) !== -1;
    const tg2 = isTarget(cur, 'ans', c);
    const text = tg2 ? bufferFor(cur, 'ans', c) : v.ans[c] || '';
    cells.push({
      key: 'ans-' + c,
      cls: 'ans' + (tg2 ? ' target' : '') + (just ? ' just' : '') + (v.slide && text ? ' slide' : '') + (c < 0 ? ' extra' : '') + shake('ans', c),
      text
    });
  }

  const rows = slim ? 3 : sub ? 5 : 4;
  return {
    cols,
    rows,
    ansRow: rows - 1,
    cells
  };
}
