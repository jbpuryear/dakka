import KEYWORDS from './KEYWORDS.js';
import Token from './Token.js';

let src;
let line;
let start;
let current;
let tokens;
let errors;

function isAlpha(c) {
  if (typeof c !== 'string') { return false; }
  return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
}

function isNumber(c) {
  if (typeof c !== 'string') { return false; }
  return c >= '0' && c <= '9';
}

function isHex(c) {
  if (typeof c !== 'string') { return false; }
  return (c >= '0' && c <= '9') || (c >= 'A' && c <= 'F') || (c >= 'a' && c <= 'f');
}

function isIdChar(c) {
  if (typeof c !== 'string') { return false; }
  return isAlpha(c) || isNumber(c) || c === '_';
}

function isWS(c) {
  if (typeof c !== 'string') { return false; }
  return ' \t\n\r'.includes(c);
}

function addToken(type, literal = null) {
  const lexeme = src.slice(start, current);
  const token = new Token(type, literal, lexeme, line);
  tokens.push(token);
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
  errors.push(`DAKKA LEXICAL ERROR [line ${lineNumber}] ${msg}`);
  while (!isWS(peek()) && !eof()) {
    advance();
  }
}

function scan(input) {
  if (typeof input !== 'string') {
    throw 'Could not tokenize, input is not a string';
  }
  src = input;
  line = 1;
  start = 0;
  current = 0;
  tokens = [];
  errors = [];
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

      case '(': addToken(Token.L_PAREN); break;
      case ')': addToken(Token.R_PAREN); break;
      case '{': addToken(Token.L_BRACE); break;
      case '}': addToken(Token.R_BRACE); break;
      case '[': addToken(Token.L_BRACKET); break;
      case ']': addToken(Token.R_BRACKET); break;
      case ';': addToken(Token.SEMI); break;
      case ':': addToken(Token.COLON); break;
      case '?': addToken(Token.QUESTION); break;
      case ',': addToken(Token.COMMA); break;

      case '=': addToken(match('=') ? Token.EQUAL : Token.ASSIGN); break;
      case '+': addToken(match('=') ? Token.PLUS_ASSIGN : Token.PLUS); break;
      case '-': addToken(match('=') ? Token.MINUS_ASSIGN : Token.MINUS); break;
      case '*': addToken(match('=') ? Token.MUL_ASSIGN : Token.MUL); break;
      case '%': addToken(match('=') ? Token.MOD_ASSIGN : Token.MOD); break;
      case '!': addToken(match('=') ? Token.NOT_EQUAL : Token.NOT); break;
      case '>': addToken(match('=') ? Token.GREATER_EQ : Token.GREATER); break;
      case '<': addToken(match('=') ? Token.LESS_EQ : Token.LESS); break;
      case '/':
        if (match('/')) {
          while (peek() !== '\n' && !eof()) {
            advance();
          }
        } else {
          addToken(match('=') ? Token.DIV_ASSIGN : Token.DIV);
        }
        break;

      case '&':
        if (match('&')) {
          addToken(Token.AND);
        } else {
          error(line, 'Unexpected token, &');
        }
        break;
      case '|':
        if (match('|')) {
          addToken(Token.OR);
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
        addToken(Token.STRING, src.slice(start + 1, current - 1));
        break;
      }

      default: {
        if (c === '0' && peek() === 'x') {
          advance();
          while (isHex(peek())) { advance(); }
          const val = parseInt(src.slice(start, current), 16);
          addToken(Token.NUMBER, val);
        } else if (isNumber(c)) {
          while (isNumber(peek())) { advance(); }

          if (match('.')) {
            if (!isNumber(peek())) {
              error(line, 'Trailing decimal point');
            } else {
              while (isNumber(peek())) { advance(); }
            }
          }

          const val = parseFloat(src.slice(start, current));
          addToken(Token.NUMBER, val);
        } else if (isIdChar(c)) {
          while (isIdChar(peek())) { advance(); }
          const name = src.slice(start, current);
          const type = KEYWORDS.get(name) || Token.IDENTIFIER;
          addToken(type);
        } else {
          error(line, `Invalid token (${c})`);
        }
      }
    }
  }
  addToken(Token.EOF);

  if (errors.length > 0) {
    throw errors.join('\n');
  }

  return tokens;
}

export default scan;
