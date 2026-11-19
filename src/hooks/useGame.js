import { useEffect, useReducer, useRef } from 'react';
import Engine from '../../engine.js';
import { reducer, initialState, TOTAL } from '../game/reducer.js';

// Random pick for 'mix' happens here, not in the reducer, so the reducer stays pure.
function makeProblem(op, len) {
  const kind = op === 'mix' ? (Math.random() < 0.5 ? 'add' : 'sub') : op;
  return Engine.generateProblem(kind, len);
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
  const screenRef = useRef(state.screen);
  screenRef.current = state.screen;
  useEffect(() => {
    function onKey(ev) {
      if (screenRef.current !== 'play' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (/^[0-9]$/.test(ev.key)) { dispatch({ type: 'PRESS', key: ev.key }); ev.preventDefault(); }
      else if (ev.key === 'Backspace') { dispatch({ type: 'BACKSPACE' }); ev.preventDefault(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return {
    state,
    start: (op, len) => dispatch({ type: 'START', op, len, problem: makeProblem(op, len) }),
    next: () => {
      const g = state.game;
      if (g.index >= TOTAL) dispatch({ type: 'FINISH' });
      else dispatch({ type: 'NEXT', problem: makeProblem(g.op, g.len) });
    },
    press: (key) => dispatch({ type: 'PRESS', key }),
    backspace: () => dispatch({ type: 'BACKSPACE' }),
    showStart: () => dispatch({ type: 'SHOW_START' })
  };
}
