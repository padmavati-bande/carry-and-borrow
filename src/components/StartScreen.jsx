import { useState } from 'react';

const OPS = [['add', 'Addition'], ['sub', 'Subtraction'], ['mix', 'Both']];
const LENS = [['2', '2 digits'], ['3', '3 digits'], ['4', '4 digits']];

export default function StartScreen({ onStart }) {
  const [op, setOp] = useState('add');
  const [len, setLen] = useState('2');
  return (
    <section id="start" className="card">
      <h2>Add and subtract with carrying</h2>
      <div className="howto">
        <div>
          <h3>Addition</h3>
          <ol>
            <li>Add the ones column.</li>
            <li>If the total is 10 or more, write the ones digit and <b>carry</b> the 1 to the next column.</li>
            <li>Add the next column, plus the carried 1. Keep going left.</li>
          </ol>
        </div>
        <div>
          <h3>Subtraction</h3>
          <ol>
            <li>If the top digit is smaller than the bottom one, <b>borrow</b>: add 10 to it.</li>
            <li>Take 1 away from the digit to its left.</li>
            <li>Now subtract the column. Keep going left.</li>
          </ol>
        </div>
      </div>

      <fieldset>
        <legend>What do you want to practise?</legend>
        {OPS.map(([v, label]) => (
          <label className="choice" key={v}>
            <input type="radio" name="op" value={v} checked={op === v} onChange={() => setOp(v)} /><span>{label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>How big are the numbers?</legend>
        {LENS.map(([v, label]) => (
          <label className="choice" key={v}>
            <input type="radio" name="len" value={v} checked={len === v} onChange={() => setLen(v)} /><span>{label}</span>
          </label>
        ))}
      </fieldset>

      <p className="muted">10 problems. The page asks one small question at a time and lights up the box to fill.</p>
      <button type="button" id="start-btn" className="btn primary" onClick={() => onStart(op, parseInt(len, 10))}>&#9654; Start</button>
    </section>
  );
}
