# Carry & Borrow

A small, offline web page for practising column addition (carrying) and column
subtraction (borrowing). It asks one small question at a time, lights up the box
to fill, and checks each step as the child goes.

## Run it

No build step and no dependencies. Either:

- open `index.html` in a browser, or
- `python3 -m http.server 8000` in this folder, then visit http://localhost:8000

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
| `engine.js` | Problem generator and step builder (no DOM, unit-testable) |
| `app.js` | Screens, board drawing and input handling |
| `style.css` | Look and layout (grid-paper background, responsive) |
| `index.html` | Page structure |
| `tests/engine.test.js` | Solves thousands of generated problems step by step |

## Tests

```
node tests/engine.test.js
```

## Ideas for later

- Borrowing across a zero (e.g. 305 - 168); problems currently avoid zero digits.
- Timed mode, a sound on correct answers, saved best scores.
- A "no hints" mode for older children.
