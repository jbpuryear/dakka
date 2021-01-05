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

const branchTable = {
  [OP_CODES.TRUE](thread, stack) {
    stack.push(true);
  },

  [OP_CODES.FALSE](thread, stack) {
    stack.push(false);
  },

  [OP_CODES.NULL](thread, stack) {
    stack.push(null);
  },

  [OP_CODES.NOT](thread, stack) {
    stack.push(!stack.pop());
  },

  [OP_CODES.EQUAL](thread, stack) {
    stack.push(stack.pop() === stack.pop());
  },

  [OP_CODES.NOT_EQUAL](thread, stack) {
    stack.push(stack.pop() !== stack.pop());
  },

  [OP_CODES.GREATER](thread, stack) {
    stack.push(stack.pop() < stack.pop());
  },

  [OP_CODES.GREATER_EQ](thread, stack) {
    stack.push(stack.pop() <= stack.pop());
  },

  [OP_CODES.LESS](thread, stack) {
    stack.push(stack.pop() > stack.pop());
  },

  [OP_CODES.LESS_EQ](thread, stack) {
    stack.push(stack.pop() >= stack.pop());
  },

  [OP_CODES.ADD](thread, stack) {
    const b = stack.pop();
    const a = stack.pop();
    if (areNumbers(thread, a, b)) {
      stack.push(a + b);
    }
  },

  [OP_CODES.SUB](thread, stack) {
    const b = stack.pop();
    const a = stack.pop();
    if (areNumbers(thread, a, b)) {
      stack.push(a - b);
    }
  },

  [OP_CODES.MUL](thread, stack) {
    const b = stack.pop();
    const a = stack.pop();
    if (areNumbers(thread, a, b)) {
      stack.push(a * b);
    }
  },

  [OP_CODES.DIV](thread, stack) {
    const b = stack.pop();
    const a = stack.pop();
    if (areNumbers(thread, a, b)) {
      if (b === 0) {
        thread.error('Divide by zero');
      } else {
        stack.push(a / b);
      }
    }
  },

  [OP_CODES.DIV](thread, stack) {
    const b = stack.pop();
    const a = stack.pop();
    if (areNumbers(thread, a, b)) {
      if (b === 0) {
        thread.error('Divide by zero');
      } else {
        stack.push(a / b);
      }
    }
  },

  [OP_CODES.MOD](thread, stack) {
    const b = stack.pop();
    const a = stack.pop();
    if (areNumbers(thread, a, b)) {
      stack.push(a % b);
    }
  },

  [OP_CODES.NEGATE](thread, stack) {
    const a = stack.pop();
    if (isNumber(thread, a)) {
      stack.push(-a);
    }
  },

  [OP_CODES.CONST](thread, stack) {
    const idx = thread.advance();
    const val = thread.currentFrame.constants[idx];
    stack.push(val);
  },

  [OP_CODES.POP](thread, stack) {
    stack.pop();
  },

  [OP_CODES.SCOPE_PUSH](thread, stack) {
    thread.pushScope();
  },

  [OP_CODES.SCOPE_POP](thread, stack) {
    thread.popScope();
  },

  [OP_CODES.DEFINE](thread, stack) {
    const varName = stack.pop();
    thread.currentFrame.environment.makeVar(varName, null);
  },

  [OP_CODES.INITIALIZE](thread, stack) {
    const varName = stack.pop();
    const val = stack.pop();
    thread.currentFrame.environment.makeVar(varName, val);
  },

  [OP_CODES.ASSIGN](thread, stack) {
    const scopeDepth = thread.advance();
    const name = stack.pop();
    // Leave the value on the stack, assignment returns a value.
    const value = stack[stack.length - 1];
    thread.currentFrame.environment.setVarAt(scopeDepth, name, value);
  },

  [OP_CODES.GET_VAR](thread, stack) {
    const scopeDepth = thread.advance();
    const name = stack.pop();
    const val = thread.currentFrame.environment.getVarAt(scopeDepth, name);
    stack.push(val);
  },

  [OP_CODES.SET_PROP](thread, stack) {
    const target = thread.target;
    if (!target) {
      thread.error('Cannot set property, thread has no target object');
      return;
    }
    const name = stack.pop();
    if (!(name in target)) {
      thread.error('Cannot set undefined property on target object');
      return;
    }
    thread.target[name] = stack.pop();
  },

  [OP_CODES.GET_PROP](thread, stack) {
    const target = thread.target;
    if (!target) {
      thread.error('Cannot get property, thread has no target object');
      return;
    }
    const name = stack.pop();
    if (!(name in target)) {
      thread.error('Cannot get undefined property on target object');
      return;
    }
    stack.push(thread.target[name]);
  },

  [OP_CODES.CLOSURE](thread, stack) {
    const idx = thread.advance();
    const fun = thread.currentFrame.constants[idx];
    stack.push(new Closure(fun, thread.currentFrame.environment));
  },

  [OP_CODES.CALL](thread, stack) {
    const argCount = thread.advance();
    const script = stack[stack.length - 1 - argCount];
    if (!(script instanceof Closure)) {
      thread.error('Cannot call non-function primitive');
    }
    if (script.isNative) {
      if (argCount !== script.func.length) {
        thread.error('Wrong number of arguments');
        return;
      }
      const args = [];
      for (let i = 0; i < argCount; i += 1) {
        args.push(stack.pop());
      }
      stack.pop();
      stack.push(script.func.apply(null, args));
    } else {
      if (argCount !== script.func.arity) {
        thread.error('Wrong number of arguments');
        return;
      }
      thread.pushFrame(script);
      thread.pushScope();
    }
  },

  [OP_CODES.RETURN](thread, stack) {
    if (thread.callStack.length === 1) {
      thread.events.emit('returned', thread.stack.pop());
      thread.terminated = true;
    } else {
      thread.popFrame();
      // The called function is still sitting on here on the stack, so
      // we pop it and restore the return value.
      const returnValue = stack.pop();
      stack.pop();
      stack.push(returnValue);
    }
  },

  [OP_CODES.SPAWN](thread, stack) {
    const argCount = thread.advance();
    const propCount = thread.advance();
    const target = thread.vm._spawn();

    for (let i = 0; i < propCount; i += 1) {
      const name = stack.pop();
      const val = stack.pop();
      if (name in target) {
        target[name] = val;
      } else {
        thread.events.emit('spawn_errored', thread, target,
          'Cannot assign undefined property of spawned target object');
        return;
      }
    }

    if (argCount !== -1) {
      const args = argCount > 0 ? stack.splice(-argCount) : undefined;
      const script = stack.pop();
      // See THREAD
      const env = script.environment.makeInner();
      thread.vm._startThread(script, env, args, target);
    }
  },

  [OP_CODES.THREAD](thread, stack) {
    const argCount = thread.advance();
    const args = stack.splice(-argCount);
    const script = stack.pop();
    // Top level scripts use the environment attached to their scripts (which are just
    // Closure objects), but we need to spawn threads like we call functions, so we
    // create an inner scope first. Same in SPAWN.
    const env = script.environment.makeInner();
    thread.vm._startThread(script, env, args, null);
  },

  [OP_CODES.SLEEP](thread, stack) {
    const time = stack.pop();
    if (!isNumber(thread, time)) {
      return;
    }
    thread.sleep = time;
  },

  [OP_CODES.JMP](thread, stack) {
    thread.pc = thread.advance();
  },

  [OP_CODES.JMP_FALSE](thread, stack) {
    const addr = thread.advance();
    if(!stack[stack.length - 1]) {
      thread.pc = addr;
    }
  },

  [OP_CODES.FOR_TEST](thread, stack) {
    const l = stack.length;
    const initVal = stack[l - 3];
    const max = stack[l - 2];
    const increment = stack[l - 1];
    if (typeof initVal !== 'number' || typeof max !== 'number' || typeof increment !== 'number') {
      thread.error('Invalid expression in for loop initializer');
    }
    if (increment === 0) {
      thread.error('For loop increment cannot be 0');
    }
    stack[l - 3] += increment;
    stack.push(initVal);
    stack.push(increment > 0 ? initVal <= max : initVal >= max);
  },

  [OP_CODES.REPEAT](thread, stack) {
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
      thread.error(`Expected numerical expression in repeat statement, found ${counter}`);
    }
  },
};

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
    const bt = branchTable;
    while (this.sleep <= 0 && !this.terminated) {
      const op = this.advance();
      bt[op](this, stack);
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

  pushScope() {
    const frame = this.currentFrame;
    frame.environment = frame.environment.makeInner();
  }

  popScope() {
    const frame = this.currentFrame;
    frame.environment = frame.environment.outer;
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
