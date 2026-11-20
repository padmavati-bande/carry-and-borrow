import Engine from '../../engine.js';

// Pure state logic. No DOM, no timers. Timers live in hooks/useGame.js.
export const TOTAL = 10;

export const initialState = { screen: 'start', game: null, cur: null };

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
    view: { ans: {}, carry: {}, struck: {}, mark: {}, just: null, fly: null, slide: false }
  };
}

function applyEffects(view, step) {
  const v = { ...view, ans: { ...view.ans }, carry: { ...view.carry }, struck: { ...view.struck }, mark: { ...view.mark } };
  const cols = [];
  step.effects.forEach((e) => {
    if (e.kind !== 'borrow') cols.push(e.col);
    if (e.kind === 'ans') v.ans[e.col] = e.value;
    else if (e.kind === 'carry') { v.carry[e.col] = e.value; v.fly = e.col; }
    else if (e.kind === 'newTop') { v.carry[e.col] = e.value; v.struck[e.col] = true; }
    else if (e.kind === 'borrow') v.mark[e.col] = e.value;
  });
  v.just = cols;
  v.slide = step.targets.some((t) => t.col < 0);
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
        game: { op: action.op, len: action.len, index: 1, good: 0, bad: 0, timed: !!action.timed, limit: action.limit },
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
