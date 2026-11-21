import { useEffect, useReducer, useRef } from 'react';
import * as Engine from '../../engine.js';
import { reducer, initialState } from '../game/reducer.js';
import { TOTAL, MIX, WATCH } from '../game/config.js';
import { uniqueProblem } from '../game/draw.js';
import { nextKey } from '../game/view.js';

// Random pick for 'mix' happens here, not in the reducer, so the reducer stays pure.
function makeProblem(op, len, carry) {
  const kind = op === 'mix' ? MIX[Math.floor(Math.random() * MIX.length)] : op;
  return Engine.generateProblem(kind, len, Math.random, carry);
}

export function useGame() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const seen = useRef(new Set()); // problems already shown in this game: no repeats
  const { cur } = state;
  const settle = !!(cur && cur.settle && !cur.finished);
  const stepIndex = cur ? cur.stepIndex : -1;
  const wrongPending = !!(cur && cur.wrongPending);
  const watch = !!(state.game && state.game.watch);
  const screen = state.screen;
  const timed = !!(state.game && state.game.timed);
  const index = state.game ? state.game.index : 0;

  // show the settled board, then move to the next step (slower in watch mode)
  useEffect(() => {
    if (!settle) return undefined;
    const t = setTimeout(() => dispatch({ type: 'ADVANCE' }), watch ? WATCH.stepMs : 450);
    return () => clearTimeout(t);
  }, [settle, stepIndex, watch]);

  // wrong answer: keep the shake, then clear the box
  useEffect(() => {
    if (!wrongPending) return undefined;
    const t = setTimeout(() => dispatch({ type: 'WRONG_CLEAR' }), 700);
    return () => clearTimeout(t);
  }, [wrongPending]);

  // watch mode: the system types the answer, one digit per tick
  const typing = watch && screen === 'play' && !!cur && !cur.locked && !cur.settle && !cur.finished;
  useEffect(() => {
    const key = typing ? nextKey(cur) : null;
    if (key === null) return undefined;
    const t = setTimeout(() => dispatch({ type: 'PRESS', key }), WATCH.typeMs);
    return () => clearTimeout(t);
  }, [typing, cur]);

  // timed mode: one tick per second; restarts for each problem
  useEffect(() => {
    if (screen !== 'play' || !timed) return undefined;
    const t = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => clearInterval(t);
  }, [screen, timed, index]);

  // keyboard input, only while the play screen shows and the user types (not in watch mode)
  useEffect(() => {
    if (screen !== 'play' || watch) return undefined;
    function onKey(ev) {
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      if (/^[0-9]$/.test(ev.key)) { dispatch({ type: 'PRESS', key: ev.key }); ev.preventDefault(); }
      else if (ev.key === 'Backspace') { dispatch({ type: 'BACKSPACE' }); ev.preventDefault(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [screen, watch]);

  return {
    state,
    start: (settings) => {
      seen.current = new Set();
      dispatch({ type: 'START', ...settings, problem: uniqueProblem(() => makeProblem(settings.op, settings.len, settings.carry), seen.current) });
    },
    next: () => {
      const g = state.game;
      if (g.index >= TOTAL) dispatch({ type: 'FINISH' });
      else dispatch({ type: 'NEXT', problem: uniqueProblem(() => makeProblem(g.op, g.len, g.carry), seen.current) });
    },
    press: (key) => { if (!watch) dispatch({ type: 'PRESS', key }); },
    backspace: () => { if (!watch) dispatch({ type: 'BACKSPACE' }); },
    showStart: () => dispatch({ type: 'SHOW_START' })
  };
}
