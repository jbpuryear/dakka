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
    if (!target.hasOwnProperty(name)) {
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
    if (!target.hasOwnProperty(name)) {
      thread.error('Cannot get undefined property on target object');
      return;
    }
    stack.push(thread.target[name]);
  },

  [OP_CODES.CLOSURE](thread, stack) {
    const fun = thread.stack.pop();
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
        script.error('Wrong number of arguments');
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
        script.error('Wrong number of arguments');
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
      if (target.hasOwnProperty(name)) {
        target[name] = val;
      } else {
        thread.events.emit('spawn_errored', thread, target,
          'Cannot assign undefined property of spawned target object');
        return;
      }
    }

    if (argCount !== -1) {
      const args = stack.splice(-argCount);
      const script = stack.pop();
      thread.vm._startThread(script, args, target);
    }
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

  run(script, args = [], target, callback = null) {
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
    this.pushFrame(script);
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

  pushFrame(script) {
    const frame = new StackFrame(script.func.code, script.func.constants,
      script.environment, this.pc);
    this.callStack.push(frame);
    this.currentFrame = frame;
    this.pc = 0;
  }

  popFrame() {
    const frame = this.callStack.pop();
    this.currentFrame = this.callStack[this.callStack.length - 1];
    this.pc = frame.returnAddress;
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
    }
    const op = this.currentFrame.code[this.pc];
    if (!branchTable[op]) {
    }
    this.pc += 1;
    return op;
  }

  error(msg) {
    this.terminated = true;
    this.events.emit('errored', this, msg);
  }
}

export default Thread;
