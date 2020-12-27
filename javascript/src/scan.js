import KEYWORDS from './KEYWORDS.js';
import TOKENS from './TOKENS.js';

let src;
let line;
let start;
let current;
let tokens;
let hadError;

function isAlpha(c) {
  if (typeof c !== 'string') { return false; }
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
}

function isNumber(c) {
  if (typeof c !== 'string') { return false; }
  return c >= '0' && c <= '9';
}

function isIdChar(c) {
  return isAlpha(c) || isNumber(c) || c === '_';
}

function isWS(c) {
  return ' \t\n\r'.includes(c);
}

function addToken(type, literal) {
  tokens.push({
    type,
    lexeme: src.slice(start, current),
    literal,
    line,
  });
}

function eof() {
  return current === src.length;
}

function advance() {
  if (eof()) { return null; }
  const c = src.charAt(current);
  current += 1;
  if (c === '\n') {
    line += 1;
  }
  return c;
}

function peek() {
  return eof() ? null : src.charAt(current);
}

function match(c) {
  if (peek() === c) {
    advance();
    return true;
  }
  return false;
}

function error(lineNumber, msg) {
  console.error(`${lineNumber}: ${msg}`);
  while (!isWS(peek()) && !eof()) {
    advance();
  }
  hadError = true;
}

function scan(input) {
  src = input;
  line = 1;
  start = 0;
  current = 0;
  tokens = [];
  hadError = false;
  let c;

  while (!eof()) {
    start = current;
    c = advance();

    switch (c) {
      case ' ':
      case '\t':
      case '\n':
      case '\r':
        break;

      case '(': addToken(TOKENS.L_PAREN); break;
      case ')': addToken(TOKENS.R_PAREN); break;
      case '{': addToken(TOKENS.L_BRACE); break;
      case '}': addToken(TOKENS.R_BRACE); break;
      case ';': addToken(TOKENS.SEMI); break;
      case ',': addToken(TOKENS.COMMA); break;

      case '=': addToken(match('=') ? TOKENS.EQUAL : TOKENS.ASSIGN); break;
      case '+': addToken(match('=') ? TOKENS.PLUS_ASSIGN : TOKENS.PLUS); break;
      case '-': addToken(match('=') ? TOKENS.MINUS_ASSIGN : TOKENS.MINUS); break;
      case '*': addToken(match('=') ? TOKENS.MUL_ASSIGN : TOKENS.MUL); break;
      case '!': addToken(match('=') ? TOKENS.NOT_EQUAL : TOKENS.NOT); break;
      case '>': addToken(match('=') ? TOKENS.GREATER_EQ : TOKENS.GREATER); break;
      case '<': addToken(match('=') ? TOKENS.LESS_EQ : TOKENS.LESS); break;
      case '/':
        if (match('/')) {
          while (peek() !== '\n' && !eof()) {
            advance();
          }
        } else {
          addToken(match('=') ? TOKENS.DIV_ASSIGN : TOKENS.DIV);
        }
        break;

      case '&':
        if (match('&')) {
          addToken(TOKENS.AND);
        } else {
          error(line, 'Unexpected token, &');
        }
        break;
      case '|':
        if (match('|')) {
          addToken(TOKENS.OR);
        } else {
          error(line, 'Unexpected token, |');
        }
        break;

      case '"':
      case "'": {
        const startLine = line;
        while (peek() !== c) {
          if (eof()) {
            error(startLine, 'Unterminated string');
            break;
          } else {
            advance();
          }
        }
        match(c);
        addToken(TOKENS.STRING, src.slice(start + 1, current - 1));
        break;
      }

      default: {
        if (isNumber(c)) {
          while (isNumber(peek())) { advance(); }

          if (match('.')) {
            if (!isNumber(peek())) {
              error(line, 'Trailing decimal point');
            } else {
              while (isNumber(peek())) { advance(); }
            }
          }

          const val = parseFloat(src.slice(start, current));
          addToken(TOKENS.NUMBER, val);
        } else if (isIdChar(c)) {
          while (isIdChar(peek())) { advance(); }
          const name = src.slice(start, current);
          const type = KEYWORDS.get(name) || TOKENS.IDENTIFIER;
          addToken(type);
        } else {
          error(line, `Invalid token (${c})`);
        }
      }
    }
  }
  addToken(TOKENS.EOF);

  if (hadError) {
    throw new Error('DAKA_LEXICAL_ERROR');
  }

  return tokens;
}

export default scan;
