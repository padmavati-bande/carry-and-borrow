import * as Engine from '../../engine.js';
import Board from './Board.jsx';
import Keypad from './Keypad.jsx';
import { TOTAL } from '../game/config.js';
import { sym } from '../utils.js';

// Title, question and note. Shows the equation after a finished problem.
function prompt(game, cur) {
  if (cur.finished) {
    const p = cur.problem;
    return {
      title: 'Problem ' + game.index + ' of ' + TOTAL,
      question: p.a + ' ' + sym(p.op) + ' ' + p.b + ' = ' + Engine.solution(p),
      note: cur.timedOut ? '' : cur.mistakes === 0 ? 'No mistakes. Brilliant!' : 'You got it! Try for no mistakes on the next one.'
    };
  }
  const step = cur.steps[cur.promptIndex];
  return {
    title: 'Problem ' + game.index + ' of ' + TOTAL + ' · ' + step.title,
    question: step.question,
    note: step.expected.length > 1 ? 'Type both digits.' : ''
  };
}

export default function PlayScreen({ game, cur, onPress, onBackspace, onNext }) {
  const p = prompt(game, cur);
  const fb = cur.feedback;
  return (
    <section id="play">
      <Board cur={cur} />
      <div className="panel">
        <p className="step-title">{p.title}</p>
        <p className="question" aria-live="polite">{p.question}</p>
        <p className="note">{p.note}</p>
        <p className={'feedback' + (fb.kind ? ' ' + fb.kind : '')} role="status" aria-live="polite">{fb.text}</p>
        {cur.finished && (
          <button type="button" id="next-btn" className="btn primary" autoFocus onClick={onNext}>
            {game.index >= TOTAL ? 'See my score →' : 'Next problem →'}
          </button>
        )}
        <Keypad onPress={onPress} onBackspace={onBackspace} />
      </div>
    </section>
  );
}
