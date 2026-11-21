# Code findings: DRY, reuse, extensibility

> **Status: applied (2026-11-21).** Bug fixed (`PLACES` has 8 names). Operation registry `OPS` in `engine.js`. Shared `step()`, `regroups`, `usesEffect`. Board layouts via `LAYOUTS`, shared `across()` and `carryCells()`. Reducer `EFFECTS` table and `VIEW_MAPS`. `config.js` holds `TOTAL`, `LENS`, `MIX`. Settings object for start and play again. One export style.
> Deviations from the plan: no `src/game/operations.js` (OPS lives in `engine.js` to keep the import graph acyclic and DOM-free); layouts stay in `board.js`; no `tests/helpers.js`; no full `row()` builder for top, bottom and answer rows; no `prompt.js` move.
> Proof: `npm test`, `npm run lint`, `npm run build` pass. Old and new board/view output match for 19,680 checks.

Date: 2026-11-21
Scope: full repo, 981 lines of app code (engine.js and src/). Corrected 2026-11-21 after refactor.

## Verdict

Small, clean, mostly pure code. Logic is correct and tested.
Main weakness: one concept ("an operation") is spread over 11 places.
Second weakness: row building in `board.js` is written twice.
No structural rot. Do not rewrite. Consolidate.

## 1. Adding one operation touched 11 sites in 7 files (fixed: OPS registry in engine.js)

| Site | Proof |
|---|---|
| op list in UI | `src/components/StartScreen.jsx:3` |
| domain rule for 1-digit sub | `src/components/StartScreen.jsx:6` |
| `mix` mapping | `src/hooks/useGame.js:8` |
| generator branch | `engine.js:57` |
| step builder branch | `engine.js:302` |
| answer branch | `engine.js:307` |
| operator sign | `src/utils.js:3` |
| layout branch | `src/game/board.js:88` |
| sign in board | `src/game/board.js:128` |
| sign in prompt | `src/components/PlayScreen.jsx:13` |
| `needsTwo` repeats engine rule | compare `StartScreen.jsx:6` with `tests/engine.test.js:47` |

Example: to add division you edit all 11. A registry makes it 1.

## 2. `board.js` writes the same row twice

- Carry row: `board.js:25-40` (`carryRow`) and `board.js:105-118` (inline). Same class logic, different fly rule.
- Answer row: `board.js:72-81` and `board.js:140-151`.
- Top and bottom rows: `board.js:44-52` and `board.js:121-131`.
- Row count in 3 places: `board.js:21-24` (`rowIdx`), `board.js:83` (formula), `board.js:153` (magic `3/5/4`).

Example: add a "remainder" row, edit 4 places. If `rows` and `ansRow`
disagree, CSS `--ans-row` draws the rule in the wrong place. (INFERRED: CSS not checked.)

## 3. Effect kinds known in 3 places

- `reducer.js:24`: view has 8 empty maps, written by hand.
- `reducer.js:29-30`: copies 8 maps by hand.
- `reducer.js:35`: skip list `['borrow','pp','use','mcarry','acarry']`.
- `reducer.js:36-48`: handler chain.

Example: add effect `hintMark`. Forget line 30. Then `applyEffects`
mutates the previous state object. Reducer stops being pure.
That is a real bug risk, not style. (INFERRED: not run.)

## 4. Step object written 6 times

`engine.js:127`, `161`, `197`, `252`, `275`, `288`. Same 8 keys (`focus` is in mul rows).
Add one field, edit 6 places. (Fixed: `step()` factory.)

The "write digit / carry digit" pattern is repeated at
`engine.js:144-160`, `188-196`, `233-251`.
The phrase `(the N is the one you carried)` is repeated at
`engine.js:163`, `183`, `228-230`.

## 5. One rule, two definitions

`regroups` exists twice with different logic:

- `engine.js:106-108`: `expected.length > 1`
- `tests/engine.test.js:64-69`: `effects.length === 2` for add

Tests can pass while the generator rejects good problems. (INFERRED: no case found.)
Export one function. Import it in tests.

The `has('kind')` scan is also repeated: `engine.js:102`,
`board.js:13`, `board.js:93`. (`engine.js:107` is an expected-length check, not a kind scan.)

## 6. Config lives in the state machine

`TOTAL` at `reducer.js:4` is imported by `App.jsx:2`,
`PlayScreen.jsx:4`, `DoneScreen.jsx:1`, `useGame.js:64`.
Round size is config, not reducer state.

`App.jsx:32` "play again" lists 5 fields:
`start(game.op, game.len, game.timed, game.limit, game.carry)`.
Add a setting, this breaks.

`START` payload lists the same 5 settings twice:
`reducer.js:92-97` and `useGame.js:58-61`.

## 7. Real bug: text says "undefined"

`engine.js:195` reads `PLACES[c + 1]`. `PLACES` has 5 entries
(`engine.js:8`). 3-digit and 4-digit multiplication carry past column 4.

Proof:

```
node -e "import('./engine.js').then(E=>console.log(E.default.buildSteps({op:'mul',a:999,b:999,len:3}).filter(s=>/undefined/.test(s.question+s.success))[0].success))"
```

Output: `Write the 9 and carry the 1 to the undefined.`

4-digit x 4-digit gives 3 bad steps. 3-digit gives 1.

## 8. Minor

- `Engine` is both default and named (`engine.js:312-313`). Callers mix both styles.
- `boardCells` recomputes on every keystroke (`Board.jsx:5`).
- The extra-cell test is repeated: `view.js:26`, `reducer.js:51`, `board.js:148`.
- `capitalize` is private but used at `engine.js:253` and `engine.js:271`.
- String `+` concat everywhere. Template literals are shorter and safer.

## Refactor plan

### Phase 1: Bug and safety net (low risk, do first)

1. `engine.js:8`: add `'hundred-thousands'`, `'millions'`, `'ten-millions'` to `PLACES`. Two are not enough. Fixes finding 7.
2. `engine.js:57-89`: add `canGenerate(op, len, carry)`. Throw at once on impossible input. Removes 5000 wasted tries.
3. `tests/engine.test.js`: add test. No step text contains `undefined` for 3- and 4-digit mul.
4. `tests/helpers.js` (new): move `simulate`, `regroups`, `type`, `wrongFor`. Delete copies at `engine.test.js:7-22`, `:64-69`, `reducer.test.js:13-17`, `:129-130`.

### Phase 2: Operation registry (biggest win)

5. `src/game/operations.js` (new): `OPS = { add: { label, sym, canGenerate, generate, buildSteps, solution, layout }, sub: {...}, mul: {...} }`.
6. `engine.js:57`, `:302`, `:307`: delegate to `OPS[op]`. Keep current exports as thin wrappers so tests do not change.
7. `src/utils.js:3`: `sym` reads `OPS[op].sym`. Delete the if-chain.
8. `src/game/board.js:88`: `OPS[op].layout(cur)`. Move `mulCells` to `src/game/layouts/mul.js`, add and sub to `layouts/addsub.js`.
9. `StartScreen.jsx:3`, `:6`: build the `OPS` list from the registry. Use `canGenerate`.
10. `useGame.js:8`: `mix` picks from the registry (`pickKind`), not an inline ternary.

Result: add division in 1 new file plus 1 registry line.

### Phase 3: DRY inside engine

11. `engine.js`: add `step({...})` factory. Replace the 6 literals.
12. `engine.js`: add `writeDigit(...)` for the 3 carry and digit blocks. Add `carried(n)` for the 3 repeated phrases.
13. `engine.js`: export `stepKinds(steps)` and `regroups`. Use in `board.js:13`, `:93`, `engine.js:102`, `:107`, and the tests.

### Phase 4: DRY inside reducer and board

14. `reducer.js:24`: `emptyView()` built from a `VIEW_MAPS` list. `:29` copies maps by loop. `:35-48` uses a handler table `EFFECTS = { ans, carry, newTop, borrow, pp, mcarry, acarry, use }`. One place per effect kind.
15. `board.js`: add a `row()` builder. Replace carry row x2, top and bottom x2, answer row x2.
16. `board.js:83`, `:153`: build a `rows` descriptor array. Derive `rows` and `ansRow` from it. Removes magic `3/4/5/7`.
17. `Board.jsx:5`: wrap `boardCells` in `useMemo` keyed on `cur`.

### Phase 5: Config and state shape

18. `src/game/config.js` (new): `TOTAL`, `LENS`, time limits. Update `App.jsx:2`, `PlayScreen.jsx:4`, `DoneScreen.jsx:1`, `useGame.js:64`.
19. `reducer.js:95`: store `settings: { op, len, timed, limit, carry }`. `START` takes `settings`. `App.jsx:32` becomes `start(game.settings)`. Add a setting without touching 3 files.

### Phase 6: Optional cleanup

20. `PlayScreen.jsx:8-23`: move `prompt()` to `src/game/prompt.js`. Add a test.
21. `view.js`: add `hasExtraCell(step)`. Use at `reducer.js:51`, `board.js:142`.
22. `engine.js:312`: keep one export style only. Update imports.

## Keep as is

- `engine.js` and `src/game/` stay DOM-free. Tests import them in plain Node.
- Reducer stays pure. Timers stay in `useGame.js`.
- Column numbering from the right (`col 0 = ones`) everywhere.
- Tests act as the spec. Do not delete assertions to make a refactor pass.

## Suggested order

Phase 1 (bug), then Phase 2 (registry), then Phase 4 (reducer and board).
That gives about 80% of the value for about 50% of the work.
Phase 3 and Phase 5 are optional polish.
