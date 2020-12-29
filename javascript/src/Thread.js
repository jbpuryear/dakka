import EventEmitter from 'eventemitter3';
import StackFrame from './StackFrame.js';
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
    stack.push(thread.currentFrame.script.constants[idx]);
  },

  [OP_CODES.POP](thread, stack) {
    stack.pop();
  },

  [OP_CODES.SCOPE_PUSH](thread, stack) {
    thread.currentEnvironment = thread.currentEnvironment.makeInner();
  },

  [OP_CODES.SCOPE_POP](thread, stack) {
    thread.currentEnvironment = thread.currentEnvironment.outer;
  },

  [OP_CODES.DEFINE](thread, stack) {
    const varName = stack.pop();
    thread.currentEnvironment.makeVar(varName, null);
  },

  [OP_CODES.ASSIGN](thread, stack) {
    const scopeDepth = thread.advance();
    const name = stack.pop();
    // Leave the value on the stack, assignment returns a value.
    const value = stack[stack.length - 1];
    thread.currentEnvironment.setVarAt(scopeDepth, name, value);
  },

  [OP_CODES.GET_VAR](thread, stack) {
    const scopeDepth = thread.advance();
    const name = stack.pop();
    stack.push(thread.currentEnvironment.getVarAt(scopeDepth, name));
  },
  /*
  [OP_CODES.CLOSURE](thread, stack) {
  },

  [OP_CODES.CALL](thread, stack) {
  },
*/
  [OP_CODES.RETURN](thread, stack) {
    if (thread.callStack.length === 1) {
      thread.events.emit('returned', thread.stack.pop());
      thread.terminated = true;
    } else {
      // Pop callStack, but not the value stack. Leaving the value on
      // top of the stack returns it.
      thread.popFrame();
    }
  },
/*
  // [OP_CODES.SPAWN](thread, stack) {
  },

  [OP_CODES.LOOP](thread, stack) {
  },

  [OP_CODES.SLEEP](thread, stack) {
  },

  [OP_CODES.JMP](thread, stack) {
  },

  [OP_CODES.JMP_FALSE](thread, stack) {
  },
*/
};

// Events
//   returned - Emitted when the thread finishes executing. Callbacks are passed
//              the value of the scripts return statement or null if no return statement.
//   Errored  - Emitted when thread has a runtime error. Callbacks are passed the thread
//              instance and error message. Used by the vm to report the error and terminate
//              the thread.
class Thread {
  constructor(vm, target = null, callback = null, ctx) {
    this.vm = vm;
    this.script = null;
    this.target = target;
    this.events = new EventEmitter();
    if (callback) {
      this.events.once('returned', callback, ctx);
    }

    this.terminated = false;
    this.sleep = 0;
    this.pc = 0;
    this.stack = null;
    this.callStack = null;
    this.currentFrame = null;
    this.currentEnvironment = null;
    this.prev = null;
    this.next = null;
  }

  run(script, environment, args) {
    if (script.code.length === 0) {
      this.events.emit('returned', null);
      this.terminated = true;
      return;
    }
    this.sleep = 0;
    this.pc = 0;
    this.stack = Array.isArray(args) ? args : [];
    this.callStack = [];
    this.currentEnvironment = environment;
    this.pushFrame(script);
    this.terminated = false;
    this.update(0);
  }

  update(dt) {
    this.sleep -= dt;
    if (this.sleep > 0) {
      return;
    }

    const { stack } = this;
    const bt = branchTable;
    while (this.sleep <= 0 && !this.terminated) {
      const op = this.advance();
      bt[op](this, stack);
    }
  }

  pushFrame(script) {
    const frame = new StackFrame(script, this.currentEnvironment, this.pc);
    this.callStack.push(frame);
    this.currentFrame = frame;
    return frame;
  }

  popFrame() {
    const frame = this.callStack.pop();
    this.currentFrame = this.callStack[this.callStack.length - 1];
    this.currentEnvironment = frame.returnEnvironment;
    this.pc = frame.returnAddress;
    return frame;
  }

  pushScope() {
    this.currentEnvironment = this.currentEnvironment.makeInner();
  }

  popScope() {
    this.currentEnvironment = this.currentEnvironment.outer;
  }

  advance() {
    if (this.pc >= this.currentFrame.script.code.length) {
      this.error('SegFault, end of code reached');
    }
    const op = this.currentFrame.script.code[this.pc];
    this.pc += 1;
    return op;
  }

  error(msg) {
    this.terminated = true;
    this.events.emit('errored', this, msg);
  }
}

export default Thread;
