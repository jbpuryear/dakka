import DakkaFunction from './DakkaFunction.js';
import Environment from './Environment.js';
import Token from './Token.js';
import OP_CODES from './OP_CODES.js';
import PREC from './PRECEDENCE.js';

const rules = new Map([
  [Token.L_PAREN, { prefix: grouping, infix: call, precedence: PREC.CALL }],
  [Token.L_BRACKET, { prefix: property, null: call, precedence: PREC.CALL }],
  [Token.MINUS, { prefix: unary, infix: binary, precedence: PREC.TERM }],
  [Token.PLUS, { prefix: null, infix: binary, precedence: PREC.TERM }],
  [Token.MUL, { prefix: null, infix: binary, precedence: PREC.FACTOR }],
  [Token.DIV, { prefix: null, infix: binary, precedence: PREC.FACTOR }],
  [Token.MOD, { prefix: null, infix: binary, precedence: PREC.FACTOR }],
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
  [Token.AND, { prefix: null, infix: and, precedence: PREC.AND }],
  [Token.OR, { prefix: null, infix: or, precedence: PREC.OR }],
  [Token.QUESTION, { prefix: null, infix: ternary, precedence: PREC.TERNARY }],
]);

let code;
let lineMap;
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
  console.error(`DAKA SYNTAX ERROR [line ${token.line}] ${msg}`);
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
  if (prev && (current.line !== prev.line)) {
    lineMap.push(code.length);
  }
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

function emitOp(op, line) {
  code.push(op);
}

function emitConstantIdx(cnst) {
  const exists = constants.has(cnst);
  const index = exists ? constants.get(cnst) : constants.size;
  if (!exists) {
    constants.set(cnst, index);
  }
  code.push(index);
}

function emitConstant(cnst) {
  emitOp(OP_CODES.CONST);
  emitConstantIdx(cnst);
}

function emitGetVar(name, scopeDepth) {
  emitOp(OP_CODES.GET_VAR);
  emitConstantIdx(name);
  code.push(scopeDepth);
}

function emitJump() {
  code.push(0);
  return code.length - 1;
}

function patchJump(idx) {
  code[idx] = code.length;
}

function pushEnvironment() {
  environment = environment.makeInner();
}

function popEnvironment() {
  environment = environment.outer;
}

function argumentList() {
  let argCount = 0;
  if (current.type !== Token.R_PAREN) {
    do {
      expression();
      argCount += 1;
    } while (match(Token.COMMA));
  }

  consume(Token.R_PAREN, "Expect ')' after arguments.");
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
  const oldLineMap = lineMap;
  lineMap = [];
  const oldConstants = constants;
  constants = new Map();
  environment = environment.makeInner();
  const startLine = current.line;

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
    emitOp(OP_CODES.INITIALIZE);
    emitConstantIdx(name);
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

  const newScript = new DakkaFunction(arity, code, [...constants.keys()], lineMap, startLine);
  code = oldCode;
  lineMap = oldLineMap;
  constants = oldConstants;
  environment = environment.outer;
  const index = constants.size;
  constants.set(newScript, index);
  emitOp(OP_CODES.CLOSURE);
  code.push(index);
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

function property(canAssign) {
  consume(Token.IDENTIFIER, 'Missing identifier in target object property access');
  const name = prev.lexeme;
  consume(Token.R_BRACKET, 'Expected closing bracket after property identifier');

  if (canAssign && (match(Token.ASSIGN) || match(Token.PLUS_ASSIGN) || match(Token.MINUS_ASSIGN)
      || match(Token.MUL_ASSIGN) || match(Token.DIV_ASSIGN) || match(Token.MOD_ASSIGN))) {
    const assignType = prev.type;
    if (assignType !== Token.ASSIGN) {
      emitOp(OP_CODES.GET_PROP);
      emitConstantIdx(name);
    }
    expression();
    switch (assignType) {
      case Token.PLUS_ASSIGN: emitOp(OP_CODES.ADD); break;
      case Token.MINUS_ASSIGN: emitOp(OP_CODES.SUB); break;
      case Token.MUL_ASSIGN: emitOp(OP_CODES.MUL); break;
      case Token.DIV_ASSIGN: emitOp(OP_CODES.DIV); break;
      case Token.MOD_ASSIGN: emitOp(OP_CODES.MOD); break;
    }
    emitOp(OP_CODES.SET_PROP);
    emitConstantIdx(name);
  } else {
    emitOp(OP_CODES.GET_PROP);
    emitConstantIdx(name);
  }
}

function variable(canAssign) {
  const name = prev.lexeme;
  const scopeDepth = environment.getVarDepth(name);
  const type = scopeDepth === -1 ? 'global' : 'local';

  if (type === 'local' && environment.getVarAt(scopeDepth, name) === false) {
    error(prev, `Cannot access variable, ${name}, in its own initializer`);
    return;
  }

  if (canAssign && (match(Token.ASSIGN) || match(Token.PLUS_ASSIGN) || match(Token.MINUS_ASSIGN)
      || match(Token.MUL_ASSIGN) || match(Token.DIV_ASSIGN) || match(Token.MOD_ASSIGN))) {
    const assignType = prev.type;
    if (assignType !== Token.ASSIGN) {
      if (type === 'global') {
        emitOp(OP_CODES.GET_GLOBAL);
        emitConstantIdx(name);
      } else {
        emitGetVar(name, scopeDepth);
      }
    }
    expression();
    switch (assignType) {
      case Token.PLUS_ASSIGN: emitOp(OP_CODES.ADD); break;
      case Token.MINUS_ASSIGN: emitOp(OP_CODES.SUB); break;
      case Token.MUL_ASSIGN: emitOp(OP_CODES.MUL); break;
      case Token.DIV_ASSIGN: emitOp(OP_CODES.DIV); break;
      case Token.MOD_ASSIGN: emitOp(OP_CODES.MOD); break;
    }
    if (type === 'global') {
      emitOp(OP_CODES.SET_GLOBAL);
      emitConstantIdx(name);
    } else {
      emitOp(OP_CODES.ASSIGN);
      emitConstantIdx(name);
      code.push(scopeDepth);
    }
  } else {
    if (type === 'global') {
      emitOp(OP_CODES.GET_GLOBAL);
      emitConstantIdx(name);
    } else {
      emitGetVar(name, scopeDepth);
    }
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
    case Token.MOD: emitOp(OP_CODES.MOD); break;
    case Token.EQUAL: emitOp(OP_CODES.EQUAL); break;
    case Token.NOT_EQUAL: emitOp(OP_CODES.NOT_EQUAL); break;
    case Token.GREATER: emitOp(OP_CODES.GREATER); break;
    case Token.GREATER_EQ: emitOp(OP_CODES.GREATER_EQ); break;
    case Token.LESS: emitOp(OP_CODES.LESS); break;
    case Token.LESS_EQ: emitOp(OP_CODES.LESS_EQ); break;
  }
}

function ternary() {
  emitOp(OP_CODES.JMP_FALSE);
  const falseJump = emitJump();

  const opType = prev.type;
  const rule = getRule(opType);
  parsePrecedence(rule.precedence);
  consume(Token.COLON, 'Missing ternary expression branch');

  emitOp(OP_CODES.JMP);
  const endJump = emitJump;

  patchJump(falseJump);

  parsePrecedence(rule.precedence);

  patchJump(endJump);
}


function and() {
  emitOp(OP_CODES.JMP_FALSE);
  const patchIdx = emitJump();
  
  emitOp(OP_CODES.POP);
  parsePrecedence(PREC.AND);

  patchJump(patchIdx);
}

function or() {
  emitOp(OP_CODES.JMP_FALSE);
  const elseJump = emitJump();

  emitOp(OP_CODES.JMP);
  const endJump = emitJump();

  patchJump(elseJump);
  emitOp(OP_CODES.POP);

  parsePrecedence(PREC.OR);
  patchJump(endJump);
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

  while (prec <= getRule(current.type).precedence && current.type !== Token.EOF) {
    advance();
    getRule(prev.type).infix();
  }

  // If assignment was allowed, but while descending to the bottom of this expression
  // we entered a higher precedence, it's possible we have an unconsumed assignment operator.
  // TL;DR: this catches bad l-values like a + b = c.
  if (canAssign && match(Token.ASSIGN)) {
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

function threadStmt() {
  let argCount = -1;
  consume(Token.L_PAREN, 'Expect arguments to thread statement');
  // Less one because the first argument should be the function to call
  argCount = argumentList() - 1;
  if (argCount === -1) {
    error('Missing function in spawn statement');
  }
  emitOp(OP_CODES.THREAD);
  code.push(argCount);
}

function spawnStmt() {
  let argCount = -1;
  if (match(Token.L_PAREN)) {
    // Less one because the first argument should be the function to call
    argCount = argumentList() - 1;
    if (argCount === -1) {
      error('Missing function in spawn statement')
    }
  }

  const propNames = [];
  if (match(Token.L_BRACKET)) {
    if (current.type !== 'R_BRACKET') {
      do {
        consume(Token.IDENTIFIER, 'Invalid property identifier');
        propNames.push(prev.lexeme);
        consume(Token.ASSIGN, 'Missing property assignment');
        expression();
      } while (match(Token.COMMA));
    }
    consume('R_BRACKET', "Expect ']' after properties list");
  }

  emitOp(OP_CODES.SPAWN);
  code.push(argCount, propNames.length);
  for (let i = propNames.length - 1; i >= 0; i -= 1) {
    emitConstantIdx(propNames[i]);
  }
}

function sleepStmt() {
  expression();
  emitOp(OP_CODES.SLEEP);
}

function repeatStmt() {
  consume(Token.L_PAREN, "Expect '(' after repeat");
  expression();
  consume(Token.R_PAREN, "Expect ')' after repeat argument");

  const loopStart = code.length;
  emitOp(OP_CODES.REPEAT);

  emitOp(OP_CODES.JMP_FALSE);
  const jumpPatch = emitJump();
  emitOp(OP_CODES.POP);

  statement();

  emitOp(OP_CODES.JMP);
  code.push(loopStart);

  patchJump(jumpPatch);
  emitOp(OP_CODES.POP);
}

function forStmt() {
  consume(Token.L_PAREN, "Expect '(' after for");
  consume(Token.VAR, "Expect variable declaration in for statement");
  consume(Token.IDENTIFIER, "Missing identifier in for loop variable declaration")
  const loopVarName = prev.lexeme;
  consume(Token.ASSIGN, "Missing assignment in for loop variable declaration")
  expression();
  consume(Token.COMMA, "Expect end condition in for statement");
  expression();
  if (match(Token.COMMA)) {
    expression();
  } else {
    emitConstant(1);
  }
  consume(Token.R_PAREN, "Expect ')' after for loop arguments");

  const testIdx = code.length;
  // FOR_TEST is super weird. It pushes the loop variable initializer value
  // onto the stack, then the result of the test.
  emitOp(OP_CODES.FOR_TEST);
  emitOp(OP_CODES.JMP_FALSE);
  const testJump = emitJump();
  // Here we pop the test result from FOR_TEST
  emitOp(OP_CODES.POP);

  pushEnvironment();
  emitOp(OP_CODES.SCOPE_PUSH);

  // Push loop var name to stack then initialize in the new scope that
  // we create for each iteration. This finally pops the value pushed
  // by FOR_TEST.
  environment.makeVar(loopVarName, true);
  emitOp(OP_CODES.INITIALIZE);
  emitConstantIdx(loopVarName);

  // Compile the loop body
  statement();

  popEnvironment();
  emitOp(OP_CODES.SCOPE_POP);

  emitOp(OP_CODES.JMP);
  code.push(testIdx);

  patchJump(testJump)

  // Pop the FOR_TEST result and for loop var initializer, as well as
  // the init, max, and increment expressions that start the loop.
  for (let i = 0; i < 5; i += 1) { emitOp(OP_CODES.POP); }
}

function whileStmt() {
  const repeat = code.length;
  consume(Token.L_PAREN, "Expect '(' after while");
  expression();
  consume(Token.R_PAREN, "Expect ')' after condition");

  emitOp(OP_CODES.JMP_FALSE);
  const end = emitJump();

  statement();

  emitOp(OP_CODES.JMP);
  code.push(repeat);
  patchJump(end);
}

function ifStmt() {
  consume(Token.L_PAREN, "Expect '(' after if");
  expression();
  consume(Token.R_PAREN, "Expect ')' after condition");

  emitOp(OP_CODES.JMP_FALSE);
  const ifPatchIdx = emitJump();

  emitOp(OP_CODES.POP);
  statement();

  emitOp(OP_CODES.JMP);
  const elsePatchIdx = emitJump()
  patchJump(ifPatchIdx);

  emitOp(OP_CODES.POP);

  if (match(Token.ELSE)) {
    statement();
  }
  patchJump(elsePatchIdx);
}

function functionStmt() {
  consume(Token.IDENTIFIER, 'Expected function name in declaration');
  const name = prev.lexeme;
  environment.makeVar(name, true);
  lambda();
  emitOp(OP_CODES.INITIALIZE);
  emitConstantIdx(name);
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
  } else if (match(Token.FUN)) {
    functionStmt();
    return
  } else if (match(Token.IF)) {
    ifStmt();
    return;
  } else if (match(Token.WHILE)) {
    whileStmt();
    return;
  } else if (match(Token.FOR)) {
    forStmt();
    return;
  } else if (match(Token.REPEAT)) {
    repeatStmt();
    return;
  } else if (match(Token.SLEEP)) {
    sleepStmt();
  } else if (match(Token.SPAWN)) {
    spawnStmt();
  } else if (match(Token.THREAD)) {
    threadStmt();
  } else if (match(Token.RETURN)) {
    returnStmt();
  } else {
    expressionStmt();
  }

  consume(Token.SEMI, 'Expected semicolon at end of statement');
}

function declaration() {
  if (match(Token.VAR) || match(Token.GLOBAL)) {
    const type = prev.type;
    consume(Token.IDENTIFIER, `Missing identifier in ${type} variable declaration`);
    const name = prev.lexeme;
    if (type === Token.VAR) {
      environment.makeVar(name, false);
    }
    if (match(Token.ASSIGN)) {
      // this lets functions call themselves
      if (current.type === Token.FUN && type === 'local') { environment.setVarAt(0, name, true); }
      expression();
    } else {
      emitOp(OP_CODES.NULL);
    }
    if (type === Token.VAR) {
      emitOp(OP_CODES.INITIALIZE);
      emitConstantIdx(name);
      environment.setVarAt(0, name, true);
    } else {
      emitOp(OP_CODES.INIT_GLOBAL);
      emitConstantIdx(name);
    }
  } else {
    statement();
  }

  if (panicMode) {
    synchronize();
  }
}

function parse(tkns, env = new Environment()) {
  code = [];
  lineMap = [];
  constants = new Map();
  environment = env;
  tokens = tkns;
  current = null;
  prev = null;
  idx = 0;
  hadError = false;
  panicMode = false;

  advance();
  while (current.type !== Token.EOF) {
    declaration();
  }

  emitOp(OP_CODES.NULL);
  emitOp(OP_CODES.RETURN);

  if (hadError) {
    throw new Error('DAKKA_SYNTAX_ERROR');
  }
  return  new DakkaFunction(0, code, [...constants.keys()], lineMap, 1);
}

export default parse;
