import EventEmitter from 'eventemitter3';
import StackFrame from './StackFrame.js';
import Closure from './Closure.js';
import OP_CODES from './OP_CODES.js';

function isNumber(thread, operand) {
  if ((typeof operand) !== 'number') {
    thread.error(`Operand, ${operand}, is not a number`);
    return false;
  }
  return true;
}

function areNumbers(thread, a, b) {
  return (isNumber(thread, a) && isNumber(thread, b));
}


// Events
//   returned - Emitted when the thread finishes executing. Callbacks are passed
//              the value of the scripts return statement or null if no return statement.
//   Errored  - Emitted when thread has a runtime error. Callbacks are passed the thread
//              instance and error message. Used by the vm to report the error and terminate
//              the thread.
class Thread {
  constructor(vm) {
    this.vm = vm;
    this.script = null;
    this.target = null;
    this.events = new EventEmitter();
    this.terminated = false;
    this.sleep = 0;
    this.pc = 0;
    this.stack = null;
    this.callStack = null;
    this.currentFrame = null;
    this.prev = null;
    this.next = null;
  }

  run(script, env, args = [], target, callback = null) {
    // Args are in reverse order and become the stack for that thread.
    if (script.func.code.length === 0) {
      this.events.emit('returned', null);
      this.terminated = true;
      return;
    }
    if (callback) {
      this.events.once('returned', callback);
    }
    this.sleep = 0;
    this.pc = 0;
    this.stack = Array.isArray(args) ? args : [];
    this.callStack = [];
    this.pushFrame(script, env);
    this.terminated = false;
    this.target = target;
    this.update(0);
  }

  update(dt) {
    this.sleep -= dt;
    if (this.sleep > 0) {
      return;
    }

    const stack = this.stack;
    let constants = this.currentFrame.constants;
    while (this.sleep <= 0 && !this.terminated) {
      // I know it sucks to use a giant switch with magic numbers, but it's significantly faster
      switch (this.advance()) {
        case 0: { // TRUE
          stack.push(true);
          break;
        }

        case 1: { // FALSE
          stack.push(false);
          break;
        }

        case 2: { // NULL
          stack.push(null);
          break;
        }

        case 3: { // NOT
          stack.push(!stack.pop());
          break;
        }

        case 4: { // EQUAL
          stack.push(stack.pop() === stack.pop());
          break;
        }

        case 5: { // NOT_EQUAL
          stack.push(stack.pop() !== stack.pop());
          break;
        }

        case 6: { // GREATER
          stack.push(stack.pop() < stack.pop());
          break;
        }

        case 7: { // GREATER_EQ
          stack.push(stack.pop() <= stack.pop());
          break;
        }

        case 8: { // LESS
          stack.push(stack.pop() > stack.pop());
          break;
        }

        case 9: { // LESS_EQ
          stack.push(stack.pop() >= stack.pop());
          break;
        }

        case 10: { // ADD
          const b = stack.pop();
          const a = stack.pop();
          if (areNumbers(this, a, b)) {
            stack.push(a + b);
          }
          break;
        }

        case 11: { // SUB
          const b = stack.pop();
          const a = stack.pop();
          if (areNumbers(this, a, b)) {
            stack.push(a - b);
          }
          break;
        }

        case 12: { // MUL
          const b = stack.pop();
          const a = stack.pop();
          if (areNumbers(this, a, b)) {
            stack.push(a * b);
          }
          break;
        }

        case 13: { // DIV
          const b = stack.pop();
          const a = stack.pop();
          if (areNumbers(this, a, b)) {
            if (b === 0) {
              this.error('Divide by zero');
            } else {
              stack.push(a / b);
            }
          }
          break;
        }

        case 14: { // MOD
          const b = stack.pop();
          const a = stack.pop();
          if (areNumbers(this, a, b)) {
            stack.push(a % b);
          }
          break;
        }

        case 15: { // NEGATE
          const a = stack.pop();
          if (isNumber(this, a)) {
            stack.push(-a);
          }
          break;
        }

        case 16: { // CONST
          const idx = this.advance();
          stack.push(constants[idx]);
          break;
        }

        case 17: { // POP
          stack.pop();
          break;
        }

        case 18: { // INIT_GLOBAL
          const name = constants[this.advance()]
          try {
            this.vm.global.makeVar(name, stack.pop());
          } catch (e) {
            this.error(`Can't initialize global, '${name}', already exists`);
          }
          break;
        }

        case 19: { // SET_GLOBAL
          const name = constants[this.advance()]
          try {
            this.vm.global.setVar(name, stack.pop());
          } catch (e) {
            this.error(`Can't assign to undeclared variable, '${name}'`);
          }
          break;
        }

        case 20: { // GET_GLOBAL
          const name = constants[this.advance()]
          try {
            stack.push(this.vm.global.getVar(name));
          } catch (e) {
            this.error(`Can't access undeclared variable, '${name}'`);
          }
          break;
        }

        case 21: { // SET_VAR
          const slot = this.advance();
          // Leave the value on the stack, assignment returns a value.
          stack[slot] = stack[stack.length - 1];
          break;
        }

        case 22: { // GET_VAR
          const slot = this.advance();
          stack.push(stack[slot]);
          break;
        }

        case 23: { // SET_PROP
          const target = this.target;
          if (!target) {
            this.error('Cannot set property, this has no target object');
            return;
          }
          const name = constants[this.advance()];
          if (!(name in target)) {
            this.error('Cannot set undefined property on target object');
            return;
          }
          this.target[name] = stack.pop();
          break;
        }

        case 24: { // GET_PROP
          const target = this.target;
          if (!target) {
            this.error('Cannot get property, this has no target object');
            return;
          }
          const name = constants[this.advance()];
          if (!(name in target)) {
            this.error('Cannot get undefined property on target object');
            return;
          }
          stack.push(this.target[name]);
          break;
        }

        case 25: { // CLOSURE
          const fun = constants[this.advance()];
          stack.push(new Closure(fun, this.currentFrame.environment));
          break;
        }

        case 26: { // CALL
          const argCount = this.advance();
          const script = stack[stack.length - 1 - argCount];

          if (typeof script === 'function') {
            if (argCount !== script.length) {
              this.error(`Wrong number of arguments to native function, ${script.toString()}`);
              return;
            }
            const args = [];
            for (let i = 0; i < argCount; i += 1) {
              args.push(stack.pop());
            }
            stack.pop();
            const ret = script.apply(null, args);
            switch (typeof ret) {
              case 'number':
              case 'string':
              case 'function':
                break;
              default:
                this.error(`Invalid return type from native function, ${script.toString()}`);
            }
            stack.push(ret);
          } else {
            if (!(script instanceof Closure)) {
              this.error('Cannot call non-function primitive');
            }
            if (argCount !== script.func.arity) {
              this.error('Wrong number of arguments');
              return;
            }
            this.pushFrame(script);
            constants = this.currentFrame.constants;
          }
          break;
        }

        case 27: { // RETURN
          if (this.callStack.length === 1) {
            this.events.emit('returned', this.stack.pop());
            this.terminated = true;
          } else {
            this.popFrame();
            constants = this.currentFrame.constants;
            // The called function is still sitting on here on the stack, so
            // we pop it and restore the return value.
            const returnValue = stack.pop();
            stack.pop();
            stack.push(returnValue);
          }
          break;
        }

        case 28: { // SPAWN
          const argCount = this.advance();
          const propCount = this.advance();
          const target = this.vm._spawn();

          for (let i = 0; i < propCount; i += 1) {
            const name = constants[this.advance()];
            const val = stack.pop();
            if (name in target) {
              target[name] = val;
            } else {
              this.events.emit('spawn_errored', this, target,
                'Cannot assign undefined property of spawned target object');
              return;
            }
          }

          if (argCount !== -1) {
            const args = argCount > 0 ? stack.splice(-argCount) : undefined;
            const script = stack.pop();
            // See this
            const env = script.environment.makeInner();
            this.vm._startThread(script, env, args, target);
          }
          break;
        }

        case 29: { // THREAD
          const argCount = this.advance();
          let args = null;
          if (argCount > 0) {
            args = stack.splice(-argCount);
          }
          const script = stack.pop();
          // Top level scripts use the environment attached to their scripts (which are just
          // Closure objects), but we need to spawn thiss like we call functions, so we
          // create an inner scope first. Same in SPAWN.
          const env = script.environment.makeInner();
          this.vm._startThread(script, env, args, null);
          break;
        }

        case 30: { // SLEEP
          const time = stack.pop();
          if (!isNumber(this, time)) {
            return;
          }
          this.sleep = time;
          break;
        }

        case 31: { // JMP
          this.pc = this.advance();
          break;
        }

        case 32: { // JMP_FALSE
          const addr = this.advance();
          if(!stack[stack.length - 1]) {
            this.pc = addr;
          }
          break;
        }

        case 33: { // FOR_TEST
          const l = stack.length;
          const initVal = stack[l - 3];
          const max = stack[l - 2];
          const increment = stack[l - 1];
          if (typeof initVal !== 'number' || typeof max !== 'number' || typeof increment !== 'number') {
            this.error('Invalid expression in for loop initializer');
          }
          if (increment === 0) {
            this.error('For loop increment cannot be 0');
          }
          stack[l - 3] += increment;
          stack.push(initVal);
          stack.push(increment > 0 ? initVal <= max : initVal >= max);
          break;
        }

        case 34: { // REPEAT
          const counter = stack[stack.length - 1];
          if (typeof counter === 'number') {
            if (counter > 0) {
              stack[stack.length - 1] -= 1;
              stack.push(true);
            } else {
              stack.pop();
              stack.push(false);
            }
          } else {
            this.error(`Expected numerical expression in repeat statement, found ${counter}`);
          }
          break;
        }
      }
    }
  }

  pushFrame(script, env) {
    const environment = env || script.environment;
    const frame = new StackFrame(script, environment, this.pc);
    this.callStack.push(frame);
    this.currentFrame = frame;
    this.pc = 0;
  }

  popFrame() {
    const frame = this.callStack.pop();
    this.pc = frame.returnAddress;
    this.currentFrame = this.callStack[this.callStack.length - 1];
  }

  advance() {
    if (this.pc >= this.currentFrame.code.length) {
      this.error('SegFault, end of code reached');
      return;
    }
    const op = this.currentFrame.code[this.pc];
    this.pc += 1;
    return op;
  }

  error(msg) {
    this.terminated = true;
    const line = this.currentFrame.script.func.getLine(this.pc - 1);
    this.events.emit('errored', this, `DAKKA RUNTIME ERROR [line ${line}] ${msg}`);
  }
}

export default Thread;
