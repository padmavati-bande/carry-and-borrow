import Engine from '../../engine.js';
import { sym } from '../utils.js';
import { activeCol, bufferFor, wide, isTarget } from './view.js';

// Board layout as plain data: rows top to bottom, digits right to left.
// Row order matches the old DOM order, so the grid lines up the same way.
export function boardCells(cur) {
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
