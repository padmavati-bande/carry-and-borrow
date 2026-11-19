import Engine from '../../engine.js';
import { sym } from '../utils.js';
import { activeStep, bufferFor, wide, isTarget } from './view.js';

// Board layout as plain data: rows top to bottom, digits right to left.
// Row order matches the old DOM order, so the grid lines up the same way.
export function boardCells(cur) {
  const p = cur.problem, len = p.len, cols = len + 1, v = cur.view;
  const da = Engine.digitsOf(p.a, len), db = Engine.digitsOf(p.b, len);
  const sub = p.op === 'sub', rule = sub ? '' : ' rule';

  // digits outside the active column(s) fade
  let tg = cur.finished ? [] : activeStep(cur).targets;
  const ansTg = tg.filter((t) => t.row === 'ans');
  // the active column is the lowest answer target (col -1 counts as col 0)
  if (ansTg.length) tg = [{ col: Math.max(0, Math.min.apply(null, ansTg.map((t) => t.col))) }];
  const dim = (col) => (!cur.finished && !tg.some((t) => t.col === col) ? ' dim' : '');
  const shake = (row, col) => (cur.wrongPending && isTarget(cur, row, col) ? ' shake' : '');

  const cells = [];
  const spacer = (key) => cells.push({ key, cls: 'spacer', text: '' });

  // carry / borrow row
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
  if (sub) {
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

  return {
    cols,
    rows: sub ? 5 : 4,
    ansRow: sub ? 4 : 3,
    cells
  };
}
