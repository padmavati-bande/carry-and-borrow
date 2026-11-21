import * as Engine from '../../engine.js';
import { hasExtraCell } from './view.js';

// Pure state logic. No DOM, no timers. Timers live in hooks/useGame.js.

export const initialState = { screen: 'start', game: null, cur: null };

// Every digit map on the board view. Each one is keyed by column.
const VIEW_MAPS = ['ans', 'carry', 'struck', 'mark', 'pp', 'acarry', 'cstruck', 'astruck'];

function emptyView() {
  const view = { just: null, fly: null, slide: false };
  VIEW_MAPS.forEach((k) => { view[k] = {}; });
  return view;
}

// The settings a game keeps. Start screen values go in, game settings come out.
export function settingsFrom(s) {
  return { op: s.op, len: s.len, timed: !!s.timed, limit: s.limit, carry: s.carry !== false };
}

export function settingsOf(game) {
  return { op: game.op, len: game.len, timed: game.timed, limit: game.limit, carry: game.carry };
}

export function newCur(problem) {
  return {
    problem,
    steps: Engine.buildSteps(problem),
    stepIndex: 0,
    promptIndex: 0,     // step whose question is shown (lags stepIndex while settled)
    mistakes: 0,
    elapsed: 0,        // seconds on this problem (timed mode)
    timedOut: false,
    wrongOnStep: 0,
    buffer: '',
    locked: false,
    finished: false,
    settle: false,      // settled board shown until ADVANCE
    wrongPending: false, // shake shown until WRONG_CLEAR
    feedback: { text: '', kind: '' },
    view: emptyView()
  };
}

// Effects that do not put a digit in an answer column (they never decide the slide).
const NO_COLUMN = ['borrow', 'pp', 'use', 'mcarry', 'acarry'];

// A carry that flies: dst col, dst row, source row and column
function flyTo(v, to, e) { v.fly = e.col; v.flyTo = to; v.flySrc = e.src; v.flySrcCol = e.srcCol; }

// What each effect kind writes on the view. A new kind needs one line here.
const EFFECTS = {
  ans: (v, e) => { v.ans[e.col] = e.value; },
  carry: (v, e) => { v.carry[e.col] = e.value; v.fly = e.col; },
  newTop: (v, e) => { v.carry[e.col] = e.value; v.struck[e.col] = true; },
  borrow: (v, e) => { v.mark[e.col] = e.value; },
  pp: (v, e) => { v.pp[e.row + ':' + e.col] = e.value; },
  mcarry: (v, e) => { v.carry[e.col] = e.value; flyTo(v, 'carry', e); },
  acarry: (v, e) => { v.acarry[e.col] = e.value; flyTo(v, 'acarry', e); },
  // strike the carry: its value moves to the crossed-out slot of the same column
  use: (v, e) => {
    const live = e.row === 'acarry' ? v.acarry : v.carry;
    const old = e.row === 'acarry' ? v.astruck : v.cstruck;
    if (live[e.col] !== undefined) { old[e.col] = live[e.col]; delete live[e.col]; }
  },
};

function applyEffects(view, step) {
  const v = { ...view };
  VIEW_MAPS.forEach((k) => { v[k] = { ...view[k] }; });
  const cols = [];
  step.effects.forEach((e) => {
    if (!NO_COLUMN.includes(e.kind)) cols.push(e.col);
    if (EFFECTS[e.kind]) EFFECTS[e.kind](v, e);
  });
  v.just = cols;
  v.slide = hasExtraCell(step);
  return v;
}

function submit(state) {
  const cur = state.cur;
  const step = cur.steps[cur.stepIndex];
  const base = { ...cur, locked: true };

  if (cur.buffer === step.expected) {
    const view = applyEffects(cur.view, step);
    const stepIndex = cur.stepIndex + 1;
    if (stepIndex >= cur.steps.length) {
      const clean = cur.mistakes === 0;
      const game = { ...state.game, good: state.game.good + (clean ? 1 : 0), bad: state.game.bad + (clean ? 0 : 1) };
      return {
        ...state,
        game,
        cur: { ...base, view, buffer: '', stepIndex: cur.steps.length - 1, settle: true, finished: true,
          feedback: { text: step.success, kind: 'ok' } }
      };
    }
    return {
      ...state,
      cur: { ...base, view, buffer: '', stepIndex, settle: true, feedback: { text: step.success, kind: 'ok' } }
    };
  }

  const wrongOnStep = cur.wrongOnStep + 1;
  let msg = 'Not quite. Try again!';
  if (wrongOnStep === 2) msg = 'Hint: ' + step.hint;
  if (wrongOnStep >= 3) msg = 'The answer is ' + step.expected + '. Type it in to keep going.';
  return {
    ...state,
    cur: { ...base, mistakes: cur.mistakes + 1, wrongOnStep, wrongPending: true, feedback: { text: msg, kind: 'err' } }
  };
}

export function reducer(state, action) {
  const cur = state.cur;
  switch (action.type) {
    case 'START':
      return {
        screen: 'play',
        game: { ...settingsFrom(action), index: 1, good: 0, bad: 0 },
        cur: newCur(action.problem)
      };

    case 'NEXT':
      return { ...state, game: { ...state.game, index: state.game.index + 1 }, cur: newCur(action.problem) };

    case 'FINISH':
      return { ...state, screen: 'done' };

    case 'TICK': {
      if (!state.game || !state.game.timed || !cur || cur.finished) return state;
      const elapsed = cur.elapsed + 1;
      if (elapsed < state.game.limit) return { ...state, cur: { ...cur, elapsed } };
      // time up: problem ends, no good/bad change
      return { ...state, cur: { ...cur, elapsed, timedOut: true, finished: true, locked: true, settle: false, buffer: '', wrongPending: false, feedback: { text: 'Time is up.', kind: 'err' } } };
    }

    case 'SHOW_START':
      return { ...state, screen: 'start' };

    case 'PRESS': {
      if (state.screen !== 'play' || !cur || cur.locked || cur.finished) return state;
      const step = cur.steps[cur.stepIndex];
      if (cur.buffer.length >= step.expected.length) return state;
      const next = { ...state, cur: { ...cur, buffer: cur.buffer + action.key } };
      if (next.cur.buffer.length === step.expected.length) return submit(next);
      return next;
    }

    case 'BACKSPACE':
      if (state.screen !== 'play' || !cur || cur.locked || cur.finished) return state;
      return { ...state, cur: { ...cur, buffer: cur.buffer.slice(0, -1) } };

    case 'ADVANCE':
      if (!cur) return state;
      return {
        ...state,
        cur: {
          ...cur,
          settle: false,
          buffer: '',
          wrongOnStep: 0,
          locked: false,
          promptIndex: cur.stepIndex,
          view: { ...cur.view, fly: null, slide: false },
          feedback: { text: '', kind: '' }
        }
      };

    case 'WRONG_CLEAR':
      if (!cur) return state;
      return { ...state, cur: { ...cur, buffer: '', locked: false, wrongPending: false } };

    default:
      return state;
  }
}
