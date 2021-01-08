import DakkaFunction from './DakkaFunction.js';
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

let compiler;
let tokens;
let current;
let prev;
let idx;
let hadError;
let panicMode;

class Local {
  constructor(name) {
    this.name = name;
    this.scope = -1;
    this.isCaptured = false;
  }
}

class Compiler {
  constructor() {
    this.code = [];
    this.lineMap = [];
    this.constants = new Map();
    this.scope = 0;
    this.locals = [];
  }

  getSlot(name) {
    for (let i = this.locals.length - 1; i >= 0; i -= 1) {
      if (this.locals[i].name === name) {
        return i;
      }
    }
    return -1;
  }

  makeVar(name) {
    const existingLocalSlot = this.getSlot(name);
    if (existingLocalSlot !== -1 && this.locals[existingLocalSlot].scope === this.scope) {
      error(`Variable, ${v} is already defined in target scope`);
      return;
    }
    this.locals.push(new Local(name));
  }

  getVar(name) {
    const slot = this.getSlot(name); 
    return slot === -1 ? null : this.locals[slot];
  }

  markInitialized() {
    this.locals[this.locals.length - 1].scope = this.scope;
  }

  pushScope() {
    this.scope += 1;
  }

  popScope() {
    this.scope -= 1;
    for (let i = this.locals.length - 1; i >= 0; i -= 1) {
      if (this.locals[i].scope <= this.scope) {
        return;
      }
      // TODO Close captured variables
      this.locals.pop();
      emitOp(OP_CODES.POP);
    }
  }

  // We need this becase some instructions, like for loops, leave values on the stack, and
  // that displaces our variables.
  pushDummyVar() {
    this.locals.push(new Local(null));
  }

  popDummyVar() {
    this.locals.pop();
  }
}

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
    compiler.lineMap.push(compiler.code.length);
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
  if (!match(type)) {
    error(current, err);
  }
}

function emitOp(op, param) {
  compiler.code.push(op);
  if (param !== undefined) {
    compiler.code.push(param);
  }
}

function emitByte(b) {
  compiler.code.push(b);
}

function emitConstantIdx(cnst) {
  const exists = compiler.constants.has(cnst);
  const index = exists ? compiler.constants.get(cnst) : compiler.constants.size;
  if (!exists) {
    compiler.constants.set(cnst, index);
  }
  compiler.code.push(index);
}

function emitConstant(cnst) {
  emitOp(OP_CODES.CONST);
  emitConstantIdx(cnst);
}

function emitJump() {
  compiler.code.push(0);
  return compiler.code.length - 1;
}

function patchJump(idx) {
  compiler.code[idx] = compiler.code.length;
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
  emitOp(OP_CODES.CALL, argCount);
}

function lambda() {
  const oldCompiler = compiler;
  compiler = new Compiler(current.line);

  consume(Token.L_PAREN, 'Missing parameter list in lambda expression');
  const params = [];
  if (current.type !== Token.R_PAREN) {
    do {
      consume(Token.IDENTIFIER, `Invalid parameter name, ${current.lexeme}`);
      params.push(prev.lexeme);
    } while (match(Token.COMMA));
  }
  const arity = params.length;

  while (params.length > 0) {
    compiler.makeVar(params.pop());
    compiler.markInitialized();
  }
  consume(Token.R_PAREN, 'Missing closing parenthesis after parameter list');

  consume('L_BRACE', 'Missing function body');
  const startLine = current.line;

  while (current.type !== Token.R_BRACE && current.type !== Token.EOF) {
    declaration();
  }
  consume(Token.R_BRACE, 'Unmatched block deliminator');

  emitOp(OP_CODES.NULL);
  emitOp(OP_CODES.RETURN);

  const newScript = new DakkaFunction(arity, compiler.code,
    [...compiler.constants.keys()], compiler.lineMap, startLine);

  compiler = oldCompiler;

  emitOp(OP_CODES.CLOSURE);
  emitConstantIdx(newScript);
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
  const dVar = compiler.getVar(name);
  const type = dVar ? 'local' : 'global';

  if (type === 'local' && dVar.scope === -1) {
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
        emitOp(OP_CODES.GET_VAR, compiler.getSlot(name));
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
      emitOp(OP_CODES.SET_VAR, compiler.getSlot(name));
    }
  } else {
    if (type === 'global') {
      emitOp(OP_CODES.GET_GLOBAL);
      emitConstantIdx(name);
    } else {
      emitOp(OP_CODES.GET_VAR, compiler.getSlot(name));
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
  emitOp(OP_CODES.THREAD, argCount);
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
  emitByte(argCount)
  emitByte(propNames.length);
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
  compiler.pushDummyVar();
  consume(Token.R_PAREN, "Expect ')' after repeat argument");

  const loopStart = compiler.code.length;
  emitOp(OP_CODES.REPEAT);

  emitOp(OP_CODES.JMP_FALSE);
  const jumpPatch = emitJump();
  emitOp(OP_CODES.POP);

  statement();

  emitOp(OP_CODES.JMP, loopStart);

  patchJump(jumpPatch);
  emitOp(OP_CODES.POP);
  compiler.popDummyVar();
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
  // The initial value, max, and increment statements remain on the stack while the
  // loop body executes, so we push some dummy vars to keep the vars on the stack aligned.
  compiler.pushDummyVar();
  compiler.pushDummyVar();
  compiler.pushDummyVar();

  consume(Token.R_PAREN, "Expect ')' after for loop arguments");

  const testIdx = compiler.code.length;
  // FOR_TEST is super weird. It pushes the loop variable initializer value
  // onto the stack, then the result of the test.
  emitOp(OP_CODES.FOR_TEST);
  emitOp(OP_CODES.JMP_FALSE);
  const testJump = emitJump();
  // Here we pop the test result from FOR_TEST
  emitOp(OP_CODES.POP);

  compiler.pushScope();
  // The FOR_TEST instruction leaves a value here on the stack, so it becomes our loop variable.
  compiler.makeVar(loopVarName);
  compiler.markInitialized();

  // Compile the loop body
  statement();

  compiler.popScope();

  emitOp(OP_CODES.JMP, testIdx);
  patchJump(testJump)

  // Pop the FOR_TEST result and for loop var initializer, as well as
  // the init, max, and increment expressions that start the loop.
  for (let i = 0; i < 5; i += 1) { emitOp(OP_CODES.POP); }
}

function whileStmt() {
  const repeat = compiler.code.length;
  consume(Token.L_PAREN, "Expect '(' after while");
  expression();
  consume(Token.R_PAREN, "Expect ')' after condition");

  emitOp(OP_CODES.JMP_FALSE);
  const end = emitJump();

  statement();

  emitOp(OP_CODES.JMP, repeat);
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
  compiler.makeVar(name);
  compiler.markInitialized();
  lambda();
}

function block() {
  compiler.pushScope();
  while (current.type !== Token.R_BRACE && current.type !== Token.EOF) {
    declaration();
  }
  consume(Token.R_BRACE, 'Unmatched block deliminator');
  compiler.popScope();
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
    consume(Token.IDENTIFIER, `Missing identifier in variable declaration`);
    const name = prev.lexeme;
    if (type === Token.VAR) {
      compiler.makeVar(name);
    }
    if (match(Token.ASSIGN)) {
      // this lets functions call themselves
      if (current.type === Token.FUN && type === Token.VAR) {
        compiler.markInitialized();
      }
      expression();
    } else {
      emitOp(OP_CODES.NULL);
    }
    if (type === Token.VAR) {
      compiler.markInitialized();
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

function parse(tkns) {
  compiler = new Compiler;
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
  return  new DakkaFunction(0, compiler.code, [...compiler.constants.keys()], compiler.lineMap, 1);
}

export default parse;
