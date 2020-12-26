import KEYWORDS from './KEYWORDS';

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

      case '(': addToken('L_PAREN'); break;
      case ')': addToken('R_PAREN'); break;
      case '{': addToken('L_BRACE'); break;
      case '}': addToken('R_BRACE'); break;
      case ';': addToken('SEMI'); break;
      case ',': addToken('COMMA'); break;

      case '=': addToken(match('=') ? 'EQUAL' : 'ASSIGN'); break;
      case '+': addToken(match('=') ? 'PLUS_ASSIGN' : 'PLUS'); break;
      case '-': addToken(match('=') ? 'MINUS_ASSIGN' : 'MINUS'); break;
      case '*': addToken(match('=') ? 'MUL_ASSIGN' : 'MUL'); break;
      case '!': addToken(match('=') ? 'NOT_EQUAL' : 'NOT'); break;
      case '>': addToken(match('=') ? 'GREATER_EQ' : 'GREATER'); break;
      case '<': addToken(match('=') ? 'LESS_EQ' : 'LESS'); break;
      case '/':
        if (match('/')) {
          while (peek() !== '\n' && !eof()) {
            advance();
          }
        } else {
          addToken(match('=') ? 'DIV_ASSIGN' : 'DIV');
        }
        break;

      case '&':
        if (match('&')) {
          addToken('AND');
        } else {
          error(line, 'Unexpected token, &');
        }
        break;
      case '|':
        if (match('|')) {
          addToken('OR');
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
        addToken('STRING', src.slice(start + 1, current - 1));
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
          addToken('NUMBER', val);
        } else if (isIdChar(c)) {
          while (isIdChar(peek())) { advance(); }
          const name = src.slice(start, current);
          const type = KEYWORDS.get(name) || 'IDENTIFIER';
          addToken(type);
        } else {
          error(line, `Unexpected token (${c})`);
        }
      }
    }
  }
  addToken('EOF');

  if (hadError) {
    throw new Error('DAKA_LEXICAL_ERROR');
  }

  return tokens;
}

export default scan;
