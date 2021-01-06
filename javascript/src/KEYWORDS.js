import Token from './Token.js';

export default new Map([
  ['true', Token.TRUE],
  ['false', Token.FALSE],
  ['null', Token.NULL],
  ['var', Token.VAR],
  ['global', Token.GLOBAL],
  ['if', Token.IF],
  ['else', Token.ELSE],
  ['while', Token.WHILE],
  ['for', Token.FOR],
  ['repeat', Token.REPEAT],
  ['fun', Token.FUN],
  ['return', Token.RETURN],
  ['sleep', Token.SLEEP],
  ['spawn', Token.SPAWN],
  ['thread', Token.THREAD],
]);
