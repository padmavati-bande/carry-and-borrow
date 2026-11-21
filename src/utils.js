import Engine from '../engine.js';

export const sym = (op) => (op === 'add' ? '+' : op === 'mul' ? '×' : Engine.MINUS);
