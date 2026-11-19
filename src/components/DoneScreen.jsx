import { TOTAL } from '../game/reducer.js';

export default function DoneScreen({ game, onAgain, onSettings }) {
  const msg = game.good === TOTAL ? 'Perfect score! Amazing work.'
    : game.good >= TOTAL / 2 ? 'Great job! Keep practising and you will get them all.'
    : 'Nice effort! Carrying and borrowing take practice. Try again.';
  return (
    <section id="done" className="card">
      <h2 id="done-title">All done!</h2>
      <p className="big" id="done-score">{game.good + ' out of ' + TOTAL + ' with no mistakes'}</p>
      <p className="muted" id="done-msg">{msg}</p>
      <button type="button" id="again-btn" className="btn primary" autoFocus onClick={onAgain}>&#8635; Play again</button>
      <button type="button" id="settings-btn" className="btn" onClick={onSettings}>Change settings</button>
    </section>
  );
}
