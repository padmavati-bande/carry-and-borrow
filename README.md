# Carry & Borrow

A small, offline web page for practising column addition (carrying), column
subtraction (borrowing), multiplication and long division. It asks one small
question at a time, lights up the box to fill, and checks each step as the child goes.

## Run it

Built with React and Vite.

```
npm install
npm run dev      # dev server, opens on http://localhost:5173
npm run build    # static site in dist/ (GitHub Pages ready, relative base)
npm run preview  # serve dist/ locally
git config core.hooksPath .githooks  # once per clone: pushing main publishes dist/ to gh-pages
```

## How it works

- 10 problems per round, every one needing at least one carry or borrow.
- Choose Addition, Subtraction, Multiplication, Division or Add and subtract, and 1, 2, 3 or 4 digit numbers. A "Carry and borrow" switch (on by default) turns off the rule that each problem must carry or borrow. 1-digit subtraction needs it off. Multiplication ignores it for 1 digit: all pairs 1 to 9 are used. For 2+ digits, switch off means no carry while multiplying. Carries in the adding step stay.
- Division: long division with a remainder, shown as `Q R r`. The dividend has 1 to 4 digits, the divisor is 2 to 9. The carry switch does not apply.
- Correct answers fill in the board and move on by themselves.
- A wrong answer shakes the boxes; the second miss shows a hint and the third
  shows the answer so the child is never stuck.
- A problem counts as a tick only if it was finished with no mistakes.
- Works with the on-screen keypad or the keyboard (digits and Backspace).
- Installable as an app (icon "Math"). No offline cache: needs a connection to load.

## Files

| File | Purpose |
| --- | --- |
| `engine.js` | Operation registry `OPS`, problem generator and step builder (no DOM, named exports) |
| `src/game/config.js` | Game settings: problems per round, digit choices, ops for `mix` |
| `src/game/reducer.js` | Game state logic: input, misses, settle, finish (no DOM) |
| `src/game/board.js` | Board layout as data (rows, cells, classes), one layout per operation |
| `src/game/view.js` | Helpers: active step, typed digits, target cells |
| `src/hooks/useGame.js` | React hook: reducer plus timers and keyboard |
| `src/components/` | `StartScreen`, `PlayScreen`, `DoneScreen`, `Board`, `Cell`, `Keypad` |
| `src/App.jsx`, `src/main.jsx` | App shell and mount point |
| `style.css` | Look and layout (grid-paper background, responsive) |
| `index.html` | Page shell with `#root` |
| `vite.config.js` | Build config and PWA manifest (`vite-plugin-pwa`) |
| `public/` | Static files copied as-is: install icons (`icons/`, `icon.svg`) |

## Tests

```
npm test
```

Runs `tests/engine.test.js` (thousands of generated problems solved step by step),
`tests/reducer.test.js` (miss reveal, step settle, finish), `tests/board.test.js`
(board layout and highlights) and `tests/pwa.test.js` (install icons).

For developers and AI agents: see `CLAUDE.md` for the architecture and how to add an operation.

## Ideas for later

- Timed mode, a sound on correct answers, saved best scores.
- A "no hints" mode for older children.
