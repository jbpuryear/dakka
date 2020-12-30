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
  [Token.IDENTIFIER, { prefix: variable, infix: null, precedence: PREC.PRIMARY }],
  [Token.FUN, { prefix: lambda, infix: null, precedence: PREC.PRIMARY }],
  [Token.TRUE, { prefix: boolOrNull, infix: null, precedence: PREC.PRIMARY }],
  [Token.FALSE, { prefix: boolOrNull, infix: null, precedence: PREC.PRIMARY }],
  [Token.NULL, { prefix: boolOrNull, infix: null, precedence: PREC.PRIMARY }],
  [Token.NOT, { prefix: unary, infix: null, precedence: PREC.FACTOR }],
  [Token.EQUAL, { prefix: null, infix: binary, precedence: PREC.EQUALITY }],
  [Token.NOT_EQUAL, { prefix: null, infix: binary, precedence: PREC.EQUALITY }],
  [Token.GREATER, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
  [Token.GREATER_EQ, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
  [Token.LESS, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
  [Token.LESS_EQ, { prefix: null, infix: binary, precedence: PREC.COMPARISON }],
//  [Token.AND, { prefix: null, infix: and, precedence: PREC.AND }],
//  [Token.OR, { prefix: null, infix: or, precedence: PREC.OR }],
]);

let code;
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
  console.error(`${token.line}: ${msg}`);
}

function synchronize() {
  panicMode = false;

  while (current.type !== Token.EOF) {
    if (prev.type === Token.SEMI) { return; }
    switch (current.type) {
      case Token.VAR:
      case Token.IF:
      case Token.WHILE:
      case Token.LOOP:
      case Token.FUN:
      case Token.RETURN:
      case Token.SLEEP:
        return;

      default:
        advance();
    }
  }
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

  } else {
    error(current, err);
  }
}

function emitOp(op) {
  code.push(op);
}

function emitConstant(val) {
  emitOp(OP_CODES.CONST);
  const exists = constants.has(val);
  const index = exists ? constants.get(val) : constants.size;
  if (!exists) {
    constants.set(val, index);
  }
  code.push(index);
}

function emitAssign(name, scopeDepth) {
  emitConstant(name);
  emitOp(OP_CODES.ASSIGN);
  code.push(scopeDepth);
}

function emitGetVar(name, scopeDepth) {
  emitConstant(name);
  emitOp(OP_CODES.GET_VAR);
  code.push(scopeDepth);
}

function pushEnvironment() {
  environment = environment.makeInner();
}

function popEnvironment() {
  environment = environment.outer;
}

function argumentList() {
  let argCount = 0;
  if (current.type !== 'R_PAREN') {
    do {
      expression();
      argCount += 1;
    } while (match('COMMA'));
  }

  consume('R_PAREN', "Expect ')' after arguments.");
  return argCount;
}

function call() {
  const argCount = argumentList();
  emitOp(OP_CODES.CALL);
  code.push(argCount);
}

function lambda() {
  const oldCode = code;
  code = [];
  const oldConstants = constants;
  constants = new Map();
  environment = environment.makeInner();

  consume(Token.L_PAREN, 'Missing parameter list in lambda expression');
  const params = [];
  if (current.type !== Token.R_PAREN) {
    do {
      consume(Token.IDENTIFIER, `Invalid parameter name, ${current.lexeme}`);
      params.push(prev.lexeme);
    } while (match(Token.COMMA));
  }
  const arity = params.length;

  let name;
  while (name = params.pop()) {
    emitConstant(name);
    emitOp(OP_CODES.INITIALIZE);
    environment.makeVar(name, true);
  }

  consume(Token.R_PAREN, 'Missing closing parenthesis after parameter list');

  consume('L_BRACE', 'Missing function body');
  while (current.type !== Token.R_BRACE && current.type !== Token.EOF) {
    declaration();
  }
  consume(Token.R_BRACE, 'Unmatched block deliminator');

  emitOp(OP_CODES.NULL);
  emitOp(OP_CODES.RETURN);

  const newScript = new DakkaFunction(arity, code, [...constants.keys()]);
  code = oldCode;
  constants = oldConstants;
  environment = environment.outer;
  emitConstant(newScript);
  emitOp(OP_CODES.CLOSURE);
}

function boolOrNull() {
  switch (prev.type) {
    case Token.TRUE: emitOp(OP_CODES.TRUE); return;
    case Token.FALSE: emitOp(OP_CODES.FALSE); return;
    case Token.NULL: emitOp(OP_CODES.NULL);
  }
}

function number() {
  emitConstant(prev.literal);
}

function string() {
  emitConstant(prev.literal);
}

function variable(canAssign) {
  const name = prev.lexeme;
  const scopeDepth = environment.getVarDepth(name);
  if (scopeDepth < 0) {
    error(prev, `Cannot access undeclared variable, ${name}`);
    return;
  }
  if (environment.getVarAt(scopeDepth, name) === false) {
    error(prev, `Cannot access variable, ${name}, in its own initializer`);
    return;
  }
  if (canAssign && match(Token.ASSIGN)) {
    expression();
    emitAssign(name, scopeDepth);
  } else {
    emitGetVar(name, scopeDepth);
  }
}

function unary() {
  const { type } = prev;
  parsePrecedence(PREC.UNARY);
  switch (type) {
    case Token.MINUS: emitOp(OP_CODES.NEGATE); return;
    case Token.NOT: emitOp(OP_CODES.NOT);
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

function returnStmt() {
  if (match(Token.SEMI)) {
    emitOp(OP_CODES.NULL);
  } else {
    expression();
  }
  emitOp(OP_CODES.RETURN);
}

function expression() {
  if (match(Token.FUN)) {
    lambda();
    return;
  }
  parsePrecedence(PREC.ASSIGNMENT);
}

function expressionStmt() {
  expression();
  emitOp(OP_CODES.POP);
}

function block() {
  pushEnvironment();
  emitOp(OP_CODES.SCOPE_PUSH);
  while (current.type !== Token.R_BRACE && current.type !== Token.EOF) {
    declaration();
  }
  consume(Token.R_BRACE, 'Unmatched block deliminator');
  popEnvironment();
  emitOp(OP_CODES.SCOPE_POP);
}

function statement() {
  // Empty statement
  if (match(Token.SEMI)) { return; }

  if (match(Token.L_BRACE)) {
    block();
    return;
  } if (match(Token.RETURN)) {
    returnStmt();
  } else {
    expressionStmt();
  }

  consume(Token.SEMI, 'Expected semicolon at end of statement');
}

function declaration() {
  if (match(Token.VAR)) {
    consume(Token.IDENTIFIER, 'Missing identifier in variable declaration');
    const name = prev.lexeme;
    environment.makeVar(name, false);
    if (match(Token.ASSIGN)) {
      // this lets functions call themselves
      if (current.type === Token.FUN) { environment.setVarAt(0, name, true); }
      expression();
      emitConstant(name);
      emitOp(OP_CODES.INITIALIZE);
    } else {
      emitConstant(name);
      emitOp(OP_CODES.DEFINE);
    }
    environment.setVarAt(0, name, true);
  } else {
    statement();
  }

  if (panicMode) {
    synchronize();
  }
}

function parse(tkns, env = new Environment()) {
  code = [];
  constants = new Map();
  environment = env;
  tokens = tkns;
  current = null;
  prev = null;
  idx = 0;
  hadError = false;
  panicMode = false;

  advance();
  while (!match(Token.EOF)) {
    declaration();
  }

  return hadError ? null : new DakkaFunction(0, code, [...constants.keys()]);
}

export default parse;
