// Game settings that are not part of the state machine.
export const TOTAL = 10; // problems per game
export const LENS = [['1', '1 digit'], ['2', '2 digits'], ['3', '3 digits'], ['4', '4 digits']];
export const MIX = ['add', 'sub']; // what 'mix' picks from, at random per problem
export const WATCH = { typeMs: 1400, stepMs: 2600 }; // watch mode: ms per typed digit, ms a settled step stays up
