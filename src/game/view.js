// Pure helpers over the current problem state `cur` (no DOM).

export function activeStep(cur) { return cur.steps[cur.stepIndex]; }

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
  return !cur.finished && !cur.settle && activeStep(cur).targets.some((t) => t.col < 0);
}

export function isTarget(cur, row, col) {
  if (cur.finished || cur.settle) return false;
  return activeStep(cur).targets.some((t) => t.row === row && t.col === col);
}
