# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

React 19 + Vite 8. ES modules. ESLint flat config (`eslint.config.js`).

- Test: `npm test` (runs `tests/engine.test.js`, `tests/reducer.test.js`, `tests/board.test.js`, `tests/pwa.test.js`; plain Node, no test runner).
- Lint: `npm run lint`. CI runs lint, test and build (`.github/workflows/ci.yml`).
- Dev: `npm run dev` (http://localhost:5173). Build: `npm run build` (static `dist/`, relative base for GitHub Pages).

## Architecture

- `engine.js` — pure logic, no DOM. Named exports only (no default export). Callers use `import * as Engine from '…/engine.js'`. Unit-tested.
  - `OPS` — the operation registry. One entry per operation: `label`, `sym`, `oneDigitCarry` (false = a 1-digit problem never needs a carry or borrow), `pick(len, rng, carry)` (one problem or `null`), `steps(problem)`, `solution(problem)`.
  - `generateProblem(op, len, rng, requireCarry)` → `{op, a, b, len}`. Loops `OPS[op].pick` up to 5000 times. First digit is never 0; other digits may be 0. `requireCarry` (default true): every problem needs ≥1 carry/borrow. False: none may carry or borrow.
  - `buildSteps(problem)` → `OPS[op].steps(problem)`, an ordered step list. Each step has the same keys: `title`, `question`, `expected`, `hint`, `success`, `effects`, `targets`, `focus` (`focus` is `null` unless a multiply row sets it). Build steps with `step({...})`, never as a plain literal.
  - Effect kinds in `effects`: `ans`, `carry`, `newTop`, `borrow` (add/sub); `pp`, `mcarry`, `acarry`, `use` (multiply, and the carry strike-through).
  - `regroups(steps)` — true when a step needs two digits. Shared by the generator and the tests.
  - `usesEffect(steps, kind)` — true when some step writes that effect kind.
  - `solution(problem)`, `digitsOf(n, len)`, `PLACES` (8 names: column 0 ones … column 7 ten-millions), `MINUS`.
- `src/game/config.js` — game settings outside the state machine: `TOTAL` (problems per game, 10), `LENS` (digit choices for the start screen), `MIX` (ops that `mix` picks from, at random per problem).
- `src/game/reducer.js` — pure game state machine (`START`, `PRESS`, `BACKSPACE`, `ADVANCE`, `WRONG_CLEAR`, `NEXT`, `FINISH`, `SHOW_START`, `TICK`). Miss 2 = hint, miss 3 = reveal answer. No DOM, no timers.
  - `START` takes flat settings (`op, len, timed, limit, carry`) plus `problem`. `settingsFrom(action)` keeps the settings; `settingsOf(game)` gives them back (used by "play again").
  - `VIEW_MAPS` lists the digit maps on the board view. `emptyView()` builds them.
  - `EFFECTS` maps each effect kind to the view write it makes. A new effect kind needs one line here.
- `src/hooks/useGame.js` — `useReducer` plus the timers (settle 1100 ms, wrong-answer 700 ms) and the keyboard listener. Every effect has a cleanup. Random 'mix' pick (from `MIX`) happens here, never in the reducer.
- `src/game/board.js` — board layout as data (rows, cells, classes). `boardCells(cur)` dispatches through `LAYOUTS` (`add`, `sub`, `mul`). Each layout returns `{cols, rows, ansRow, cells}`. Row order comes from one list per layout, so `rows` and `ansRow = rows - 1` always match the grid. Helpers: `across(cols, lo, cell)` for one row of cells, `carryCells(...)` for carry rows.
- `src/game/view.js` — pure helpers over `cur` (`activeStep`, `activeCol`, `bufferFor`, `wide`, `isTarget`, `hasExtraCell(step)`).
- `src/utils.js` — `sym(op)` reads `OPS[op].sym`.
- `src/components/` and `src/App.jsx` — presentation only. They render from state; they do not hold game logic. `Board.jsx` memoizes `boardCells` on `cur`.

Columns are numbered from the right (col 0 = ones) everywhere.

## Rules

- Keep `engine.js` and `src/game/` free of DOM access so Node tests can import them. Style in `style.css`; `README.md` has the feature list and ideas backlog.
- **New operation** (for example ÷): add one entry to `OPS` in `engine.js`, add one line to `LAYOUTS` in `board.js`, add a layout function if the rows differ, add tests. The reducer, start screen and `sym` need no change. Add the label to `OPS` only; the start screen builds its list from `OPS`.
- **New effect kind**: add it in `engine.js` (the step that writes it) and one line in `EFFECTS` (`reducer.js`).
- **New setting**: add it to `settingsFrom` and `settingsOf` (`reducer.js`), and to the start screen.
- **Invariants**: step text never contains `undefined` (the test checks this for every operation and digit count). Step objects come from `step()`. `regroups` is the only definition of "needs two digits".
