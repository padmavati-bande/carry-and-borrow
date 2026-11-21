// Pure helpers over the current problem state `cur` (no DOM).

export function activeStep(cur) { return cur.steps[cur.stepIndex]; }

// The column the step is about: lowest answer target (extra col -1 counts as 0),
// or the borrow target when the step has no answer cell.
export function activeCol(cur) {
  const ts = activeStep(cur).targets;
  const ans = ts.filter((t) => t.row === 'ans');
  const pick = ans.length ? ans : ts;
  return Math.max(0, Math.min(...pick.map((t) => t.col)));
}

// Typed digits fill the target cells in order. 8 + 8: type 1 then 6 ->
// the 1 goes under the 8, the 6 in the extra cell right of it. Then both move.
export function bufferFor(cur, row, col) {
  const ts = activeStep(cur).targets, exp = activeStep(cur).expected;
  let idx = -1;
  ts.forEach((t, j) => { if (t.row === row && t.col === col) idx = j; });
  if (ts.length === exp.length) return cur.buffer.charAt(idx);
  return idx === 0 ? cur.buffer : ''; // one cell holds all digits (borrow step)
}

// ones column with a two-digit sum: answer row grows one cell to the right
export function wide(cur) {
  return !cur.finished && !cur.settle && hasExtraCell(activeStep(cur));
}

// A step that writes into the extra cell right of the ones column (col -1).
export function hasExtraCell(step) {
  return step.targets.some((t) => t.col < 0);
}

export function isTarget(cur, row, col) {
  if (cur.finished || cur.settle) return false;
  return activeStep(cur).targets.some((t) => t.row === row && t.col === col);
}
