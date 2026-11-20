import { useGame } from './hooks/useGame.js';
import { TOTAL } from './game/reducer.js';
import StartScreen from './components/StartScreen.jsx';
import PlayScreen from './components/PlayScreen.jsx';
import Timer from './components/Timer.jsx';
import DoneScreen from './components/DoneScreen.jsx';

export default function App() {
  const { state, start, next, press, backspace, showStart } = useGame();
  const { screen, game, cur } = state;
  const togo = game ? TOTAL - game.index + (cur && !cur.finished ? 1 : 0) : TOTAL;

  return (
    <>
      <header className="topbar">
        <h1>Carry &amp; Borrow</h1>
        {screen === 'play' && game.timed && <Timer elapsed={cur.elapsed} limit={game.limit} />}
        {screen === 'play' && (
          <div className="chips">
            <span className="chip good">&#10003; {game.good}</span>
            <span className="chip bad">&#10007; {game.bad}</span>
            <span className="chip togo">{togo} to go</span>
          </div>
        )}
      </header>
      <main>
        {screen === 'start' && <StartScreen onStart={start} />}
        {screen === 'play' && (
          <PlayScreen game={game} cur={cur} onPress={press} onBackspace={backspace} onNext={next} />
        )}
        {screen === 'done' && (
          <DoneScreen game={game} onAgain={() => start(game.op, game.len, game.timed, game.limit)} onSettings={showStart} />
        )}
      </main>
    </>
  );
}
