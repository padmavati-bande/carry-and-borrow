import { useState } from 'react';
import { OPS } from '../../engine.js';
import { LENS } from '../game/config.js';

const CHOICES = [...Object.entries(OPS).map(([v, o]) => [v, o.label]), ['mix', 'Add and subtract']];

// carry on and an operation whose 1-digit problems never carry (subtraction, or mix): 2+ digits
const needsTwo = (op, carry) => carry && (op === 'mix' || OPS[op].oneDigitCarry === false);

export default function StartScreen({ onStart }) {
  const [op, setOp] = useState('add');
  const [len, setLen] = useState('2');
  const [timed, setTimed] = useState(false);
  const [carry, setCarry] = useState(true);
  const [secs, setSecs] = useState('60');
  const n = parseInt(secs, 10);
  const secsOk = /^\d+$/.test(secs) && n >= 1 && n <= 600;
  return (
    <section id="start" className="card">
      <h2>Add, subtract and multiply with carrying</h2>
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
          <h3>Multiplication</h3>
          <ol>
            <li>Multiply each top digit by the bottom digit. Start at the right.</li>
            <li>Write the ones digit. <b>Carry</b> the tens digit to the next column.</li>
            <li>Add the partial rows, column by column.</li>
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
        {CHOICES.map(([v, label]) => (
          <label className="choice" key={v}>
            <input type="radio" name="op" value={v} checked={op === v} onChange={() => { setOp(v); if (needsTwo(v, carry) && len === '1') setLen('2'); }} /><span>{label}</span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>How big are the numbers?</legend>
        {LENS.map(([v, label]) => (
          <label className="choice" key={v}>
            <input type="radio" name="len" value={v} checked={len === v} disabled={v === '1' && needsTwo(op, carry)} onChange={() => setLen(v)} /><span>{label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Rules</legend>
        <label className="choice">
          <input type="checkbox" checked={carry} disabled={op === 'mul' && len === '1'} onChange={() => { const c = !carry; setCarry(c); if (needsTwo(op, c) && len === '1') setLen('2'); }} /><span>Carry and borrow</span>
        </label>
      </fieldset>

      <fieldset>
        <legend>Clock</legend>
        <div className="clock-row">
          <label className="choice">
            <input type="checkbox" checked={timed} onChange={() => setTimed(!timed)} /><span>Timed</span>
          </label>
          <label className="secs">
            <input type="text" inputMode="numeric" value={secs} disabled={!timed} onChange={(e) => setSecs(e.target.value.replace(/\D/g, ''))} />
            <span>s</span>
          </label>
        </div>
      </fieldset>

      <p className="muted">10 problems. The page asks one small question at a time and lights up the box to fill.</p>
      <button type="button" id="start-btn" className="btn primary" disabled={timed && !secsOk} onClick={() => onStart({ op, len: parseInt(len, 10), timed, limit: timed ? n : 60, carry })}>&#9654; Start</button>
    </section>
  );
}
