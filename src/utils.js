import Engine from '../engine.js';

export const sym = (op) => (op === 'add' ? '+' : Engine.MINUS);
