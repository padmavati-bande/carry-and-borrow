# Carry & Borrow

A small, offline web page for practising column addition (carrying) and column
subtraction (borrowing). It asks one small question at a time, lights up the box
to fill, and checks each step as the child goes.

## Run it

Built with React and Vite.

```
npm install
npm run dev      # dev server, opens on http://localhost:5173
npm run build    # static site in dist/ (GitHub Pages ready, relative base)
npm run preview  # serve dist/ locally
```

## How it works

- 10 problems per round, every one needing at least one carry or borrow.
- Choose Addition, Subtraction or Both, and 2, 3 or 4 digit numbers.
- Correct answers fill in the board and move on by themselves.
- A wrong answer shakes the boxes; the second miss shows a hint and the third
  shows the answer so the child is never stuck.
- A problem counts as a tick only if it was finished with no mistakes.
- Works with the on-screen keypad or the keyboard (digits and Backspace).

## Files

| File | Purpose |
| --- | --- |
| `engine.js` | Problem generator and step builder (no DOM, ES module) |
| `src/game/reducer.js` | Game state logic: input, misses, settle, finish (no DOM) |
| `src/game/board.js` | Board layout as data (rows, cells, classes) |
| `src/game/view.js` | Helpers: active step, typed digits, target cells |
| `src/hooks/useGame.js` | React hook: reducer plus timers and keyboard |
| `src/components/` | `StartScreen`, `PlayScreen`, `DoneScreen`, `Board`, `Cell`, `Keypad` |
| `src/App.jsx`, `src/main.jsx` | App shell and mount point |
| `style.css` | Look and layout (grid-paper background, responsive) |
| `index.html` | Page shell with `#root` |

## Tests

```
npm test
```

Runs `tests/engine.test.js` (thousands of generated problems solved step by step)
and `tests/reducer.test.js` (miss reveal, step settle, finish).

## Ideas for later

- Borrowing across a zero (e.g. 305 - 168); problems currently avoid zero digits.
- Timed mode, a sound on correct answers, saved best scores.
- A "no hints" mode for older children.
