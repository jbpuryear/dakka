import Token from './Token.js';

export default new Map([
  ['true', Token.TRUE],
  ['false', Token.FALSE],
  ['null', Token.NULL],
  ['var', Token.VAR],
  ['if', Token.IF],
  ['else', Token.ELSE],
  ['while', Token.WHILE],
  ['loop', Token.LOOP],
  ['fun', Token.FUNCTION],
  ['return', Token.RETURN],
  ['sleep', Token.SLEEP],
]);
