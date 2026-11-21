// Pure helper: draw a problem not yet seen in this game. The caller passes the draw function and the seen set.
export const keyOf = (p) => p.op + ':' + p.a + ':' + p.b;

export function uniqueProblem(make, seen, tries = 50) {
  let p = make();
  for (let i = 0; i < tries && seen.has(keyOf(p)); i++) p = make();
  seen.add(keyOf(p));
  return p;
}
