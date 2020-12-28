import DakkaFunction from './DakkaFunction.js';
import Environment from './Environment.js';
import Token from './Token.js';
import OP_CODES from './OP_CODES.js';
import PREC from './PRECEDENCE.js';


const rules = new Map([
  [Token.L_PAREN, { prefix: grouping, infix: call, precedence: PREC.CALL }],
  [Token.MINUS, { prefix: unary, infix: binary, precedence: PREC.TERM }],
  [Token.PLUS, { prefix: null, infix: binary, precedence: PREC.TERM }],
  [Token.MUL, { prefix: null, infix: binary, precedence: PREC.FACTOR }],
  [Token.DIV, { prefix: null, infix: binary, precedence: PREC.FACTOR }],
  [Token.NUMBER, { prefix: number, infix: null, precedence: PREC.PRIMARY }],
  [Token.STRING, { prefix: string, infix: null, precedence: PREC.NONE }],
//  [Token.IDENTIFIER, { prefix: variable, infix: null, precedence: PREC.PRIMARY }],
  [Token.TRUE, { prefix: boolOrNull, infix: null, precedence: PREC.PRIMARY }],
  [Token.FALSE, { prefix: boolOrNull, infix: null, precedence: PREC.PRIMARY }],
  [Token.NULL, { prefix: boolOrNull, infix: null, precedence: PREC.PRIMARY }],
  [Token.NOT, { prefix: unary, infix: null, precedence: PREC.FACTOR }],
//  [Token.EQUAL, { prefix: null, infix: binary, precedence: PREC.EQUALITY }],
//  [Token.NOT_EQUAL, { prefix: null, infix: binary, precedence: PREC.EQUALITY }],
//  [Token.GREATER, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
//  [Token.GREATER_EQ, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
//  [Token.LESS, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
//  [Token.LESS_EQ, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
//  [Token.AND, { prefix: null, infix: and, precedence: PREC.AND }],
//  [Token.OR, { prefix: null, infix: or, precedence: PREC.OR }],
]);

let script;
let constants;
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
  const exists = constants.has(val);
  const index = exists ? constants.get(val) : constants.size;
  if (!exists) {
    constants.set(val, index);
  }
  script.code.push(index);
}


function call() {
  // TODO
}

function boolOrNull() {
  switch (prev.type) {
    case Token.TRUE: emitOp(OP_CODES.TRUE); return;
    case Token.FALSE: emitOp(OP_CODES.FALSE); return;
    case Token.NULL: emitOp(OP_CODES.NULL); return;
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
    case Token.MINUS: emitOp(OP_CODES.NEGATE); return;
    case Token.NOT: emitOp(OP_CODES.NOT); return;
  }
}


function binary() {
  const opType = prev.type;
  const rule = getRule(opType);
  parsePrecedence(rule.precedence + 1);

  switch (opType) {
    case Token.PLUS: emitOp(OP_CODES.ADD); break;
    case Token.MINUS: emitOp(OP_CODES.SUB); break;
    case Token.MUL: emitOp(OP_CODES.MUL); break;
    case Token.DIV: emitOp(OP_CODES.DIV); break;
    case Token.EQUAL: emitOp(OP_CODES.EQUAL); break;
    case Token.NOT_EQUAL: emitOp(OP_CODES.NOT_EQUAL); break;
    case Token.GREATER: emitOp(OP_CODES.GREATER); break;
    case Token.GREATER_EQ: emitOp(OP_CODES.GREATER_EQ); break;
    case Token.LESS: emitOp(OP_CODES.LESS); break;
    case Token.LESS_EQ: emitOp(OP_CODES.LESS_EQ); break;
  }
}


function grouping() {
  expression();
  consume(Token.R_PAREN, 'Expected closing parenthesis after expression.');
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
  if (match(Token.FUN)) {
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
  constants = new Map();
  environment = env;
  tokens = tkns;
  current = null;
  prev = null;
  idx = 0;
  hadError = false;
  panicMode = false;

  advance();
  expression();

  script.constants = [...constants.keys()];
  return script;
}


export default parse;
