import { useEffect, useReducer } from 'react';
import Engine from '../../engine.js';
import { reducer, initialState, TOTAL } from '../game/reducer.js';

// Random pick for 'mix' happens here, not in the reducer, so the reducer stays pure.
function makeProblem(op, len, carry) {
  const kind = op === 'mix' ? (Math.random() < 0.5 ? 'add' : 'sub') : op;
  return Engine.generateProblem(kind, len, Math.random, carry);
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { cur } = state;
  const settle = !!(cur && cur.settle && !cur.finished);
  const stepIndex = cur ? cur.stepIndex : -1;
  const wrongPending = !!(cur && cur.wrongPending);

  // show the settled board, then move to the next step
  useEffect(() => {
    if (!settle) return undefined;
    const t = setTimeout(() => dispatch({ type: 'ADVANCE' }), 1100);
    return () => clearTimeout(t);
  }, [settle, stepIndex]);

  // wrong answer: keep the shake, then clear the box
  useEffect(() => {
    if (!wrongPending) return undefined;
    const t = setTimeout(() => dispatch({ type: 'WRONG_CLEAR' }), 700);
    return () => clearTimeout(t);
  }, [wrongPending]);

  // keyboard input, only while the play screen shows
  const screen = state.screen;
  const timed = !!(state.game && state.game.timed);
  const index = state.game ? state.game.index : 0;

  // timed mode: one tick per second; restarts for each problem
  useEffect(() => {
    if (screen !== 'play' || !timed) return undefined;
    const t = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(t);
  }, [screen, timed, index]);
  useEffect(() => {
    if (screen !== 'play') return undefined;
    function onKey(ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (/^[0-9]$/.test(ev.key)) { dispatch({ type: 'PRESS', key: ev.key }); ev.preventDefault(); }
      else if (ev.key === 'Backspace') { dispatch({ type: 'BACKSPACE' }); ev.preventDefault(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [screen]);

  return {
    state,
    start: (op, len, timed, limit, carry) => dispatch({ type: 'START', op, len, timed, limit, carry, problem: makeProblem(op, len, carry) }),
    next: () => {
      const g = state.game;
      if (g.index >= TOTAL) dispatch({ type: 'FINISH' });
      else dispatch({ type: 'NEXT', problem: makeProblem(g.op, g.len, g.carry) });
    },
    press: (key) => dispatch({ type: 'PRESS', key }),
    backspace: () => dispatch({ type: 'BACKSPACE' }),
    showStart: () => dispatch({ type: 'SHOW_START' })
  };
}
