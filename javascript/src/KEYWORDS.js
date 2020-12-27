import TOKENS from './TOKENS.js';

export default new Map([
  ['true', TOKENS.TRUE],
  ['false', TOKENS.FALSE],
  ['null', TOKENS.NULL],
  ['var', TOKENS.VAR],
  ['if', TOKENS.IF],
  ['else', TOKENS.ELSE],
  ['while', TOKENS.WHILE],
  ['loop', TOKENS.LOOP],
  ['fun', TOKENS.FUNCTION],
  ['return', TOKENS.RETURN],
  ['sleep', TOKENS.SLEEP],
]);
