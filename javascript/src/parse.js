import DakkaFunction from './DakkaFunction.js';
import Environment from './Environment.js';
import TOKENS from './TOKENS.js';
import OP_CODES from './OP_CODES.js';
import PREC from './PRECEDENCE.js';


const rules = new Map([
  [TOKENS.L_PAREN, { prefix: grouping, infix: call, precedence: PREC.CALL }],
  [TOKENS.MINUS, { prefix: unary, infix: binary, precedence: PREC.TERM }],
  [TOKENS.PLUS, { prefix: null, infix: binary, precedence: PREC.TERM }],
  [TOKENS.MUL, { prefix: null, infix: binary, precedence: PREC.FACTOR }],
  [TOKENS.DIV, { prefix: null, infix: binary, precedence: PREC.FACTOR }],
  [TOKENS.NUMBER, { prefix: number, infix: null, precedence: PREC.PRIMARY }],
  [TOKENS.STRING, { prefix: string, infix: null, precedence: PREC.NONE }],
//  [TOKENS.IDENTIFIER, { prefix: variable, infix: null, precedence: PREC.PRIMARY }],
  [TOKENS.TRUE, { prefix: boolOrNull, infix: null, precedence: PREC.PRIMARY }],
  [TOKENS.FALSE, { prefix: boolOrNull, infix: null, precedence: PREC.PRIMARY }],
  [TOKENS.NULL, { prefix: boolOrNull, infix: null, precedence: PREC.PRIMARY }],
  [TOKENS.NOT, { prefix: unary, infix: null, precedence: PREC.FACTOR }],
//  [TOKENS.EQUAL, { prefix: null, infix: binary, precedence: PREC.EQUALITY }],
//  [TOKENS.NOT_EQUAL, { prefix: null, infix: binary, precedence: PREC.EQUALITY }],
//  [TOKENS.GREATER, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
//  [TOKENS.GREATER_EQ, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
//  [TOKENS.LESS, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
//  [TOKENS.LESS_EQ, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
//  [TOKENS.AND, { prefix: null, infix: and, precedence: PREC.AND }],
//  [TOKENS.OR, { prefix: null, infix: or, precedence: PREC.OR }],
]);

let script;
let environment;
let tokens;
let current;
let prev;
let idx;
let hadError;
let panicMode;


function getRule(type) {
  return rules.has(type) ? rules.get(type) : { prefix: null, infix: null, precedence: PREC.NONE };
}


function error(token, msg) {
  if (panicMode) { return; }
  panicMode = true;
  hadError = true;
  console.error(`${token.line}: ${msg}`)
}


function advance() {
  prev = current;
  current = tokens[idx];
  idx += 1;
}


function match(type) {
  if (current.type === type) {
    advance();
    return true;
  }
  return false;
}


function consume(type, err) {
  if (match(type)) {
    return;
  } else {
    error(current, err);
  }
}


function emitOp(op) {
  script.code.push(op);
}


function emitConstant(val) {
  emitOp(OP_CODES.CONST);
  script.code.push(val);
  // TODO Switch to a constant table instead of mixing constants
  // in with code, for portability and so we can use
  // typed arrays if we need a performance boost.
}


function call() {
  // TODO
}

function boolOrNull() {
  switch (prev.type) {
    case TOKENS.TRUE: emitOp(OP_CODES.TRUE); return;
    case TOKENS.FALSE: emitOp(OP_CODES.FALSE); return;
    case TOKENS.NULL: emitOp(OP_CODES.NULL); return;
  }
}

function number() {
  emitConstant(prev.literal);
}


function string() {
  emitConstant(prev.literal);
}


function unary() {
  const type = prev.type;
  parsePrecedence(PREC.UNARY);
  switch (type) {
    case TOKENS.MINUS: emitOp(OP_CODES.NEGATE); return;
    case TOKENS.NOT: emitOp(OP_CODES.NOT); return;
  }
}


function binary() {
  const opType = prev.type;
  const rule = getRule(opType);
  parsePrecedence(rule.precedence + 1);

  switch (opType) {
    case TOKENS.PLUS: emitOp(OP_CODES.ADD); break;
    case TOKENS.MINUS: emitOp(OP_CODES.SUB); break;
    case TOKENS.MUL: emitOp(OP_CODES.MUL); break;
    case TOKENS.DIV: emitOp(OP_CODES.DIV); break;
    case TOKENS.EQUAL: emitOp(OP_CODES.EQUAL); break;
    case TOKENS.NOT_EQUAL: emitOp(OP_CODES.NOT_EQUAL); break;
    case TOKENS.GREATER: emitOp(OP_CODES.GREATER); break;
    case TOKENS.GREATER_EQ: emitOp(OP_CODES.GREATER_EQ); break;
    case TOKENS.LESS: emitOp(OP_CODES.LESS); break;
    case TOKENS.LESS_EQ: emitOp(OP_CODES.LESS_EQ); break;
  }
}


function grouping() {
  expression();
  consume(TOKENS.R_PAREN, 'Expected closing parenthesis after expression.');
}


function parsePrecedence(prec) {
  advance();
  const rule = getRule(prev.type).prefix;
  if (!rule) {
    error(prev, `Expected expression, found ${prev.lexeme}`);
    return;
  }

  const canAssign = prec <= PREC.ASSIGNMENT;
  rule(canAssign);

  while (prec <= getRule(current.type).precedence && current.type !== 'EOF') {
    advance();
    getRule(prev.type).infix();
  }

  // If assignment was allowed, but while descending to the bottom of this expression
  // we entered a higher precedence, it's possible we have an unconsumed assignment operator.
  // TL;DR: this catches bad l-values like a + b = c.
  if (canAssign && match('ASSIGN')) {
    error(prev, 'Invalid assignment target');
  }
}


function lambda() {
  // TODO
}


function expression() {
  if (match(TOKENS.FUN)) {
    lambda();
    return;
  }
  parsePrecedence(PREC.ASSIGNMENT);
}


function statement() {
  panicMode = false;
}


function parse(tkns, env = new Environment()) {
  script = new DakkaFunction();
  environment = env;
  tokens = tkns;
  current = null;
  prev = null;
  idx = 0;
  hadError = false;
  panicMode = false;

  advance();
  expression();

  return script;
}


export default parse;
