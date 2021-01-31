import StackFrame from './StackFrame.js';
import Closure from './Closure.js';
import Upvalue from './Upvalue.js';
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


class Thread {
  constructor(vm) {
    this.vm = vm;
    this.callStack = [];
    this.prev = null;
    this.next = null;
    this.reset();
  }

  reset() {
    this.callback = null;
    this.target = null;
    this.sleep = 0;
    this.stack = null;
    this.callStack.length = 0;
    this.frame = null;
    this.openUpvalues = null;
  }

  run(script, args = [], target = null, callback = null) {
    this.callback = callback;
    this.target = target;
    this.stack = args;

    this.pushFrame(new StackFrame(script));
    if (args.length !== script.func.arity) {
      this.error(`Cannot start script, expected ${script.func.arity} arguments, received ${args.length}`);
      return;
    }
    if (script.func.code.length === 0) {
      this.dReturn(null);
      return;
    }
    this.update(0);
  }

  update(dt) {
    this.sleep -= dt;
    if (this.sleep > 0) {
      return;
    }

    const stack = this.stack;
    let constants = this.frame.constants;
    let op;
    while (this.sleep <= 0 && (op = this.advance()) !== undefined) {
      // I know it sucks to use a giant switch like this, but it's significantly faster
      switch (op) {
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
              return;
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
            this.vm._global.set(name, stack.pop());
          } catch (e) {
            this.error(`Can't initialize global, '${name}', already exists`);
            return;
          }
          break;
        }

        case 19: { // SET_GLOBAL
          const name = constants[this.advance()]
          if (this.vm._global.has(name)) {
            this.vm._global.set(name, stack[stack.length - 1]);
          } else {
            this.error(`Can't assign to undeclared variable, '${name}'`);
            return;
          }
          break;
        }

        case 20: { // GET_GLOBAL
          const name = constants[this.advance()]
          const val = this.vm._global.get(name);
          if (val !== undefined) {
            stack.push(val);
          } else {
            this.error(`Can't access undeclared variable, '${name}'`);
            return;
          }
          break;
        }

        case 21: { // SET_VAR
          const slot = this.advance();
          // Leave the value on the stack, assignment returns a value.
          stack[this.frame.slots + slot] = stack[stack.length - 1];
          break;
        }

        case 22: { // GET_VAR
          const slot = this.advance();
          stack.push(stack[this.frame.slots + slot]);
          break;
        }

        case 23: { // SET_UPVALUE
          const slot = this.advance();
          this.frame.script.upvalues[slot].setValue(stack[stack.length - 1]);
          break;
        }

        case 24: { // GET_UPVALUE
          const slot = this.advance();
          stack.push(this.frame.script.upvalues[slot].getValue());
          break;
        }

        case 25: { // SET_PROP
          const target = this.target;
          if (!target) {
            this.error('Cannot set property, thread has no target object');
            return;
          }
          const name = constants[this.advance()];
          if (!(name in target)) {
            this.error(`Cannot set undefined property '${name}'`);
            return;
          }
          this.target[name] = stack[stack.length - 1];
          break;
        }

        case 26: { // GET_PROP
          const target = this.target;
          if (!target) {
            this.error('Cannot get property, this has no target object');
            return;
          }
          const name = constants[this.advance()];
          const val = target[name];
          switch (typeof val) {
            case 'undefined':
              this.error(`Cannot get undefined property '${name}'`);
              return;
            case 'number':
            case 'function':
            case 'string':
              break;
            default:
              if (!(val instanceof Closure)) {
                this.error(`Target property, ${name}, is not a valid Dakka type`);
                return
              }
          }
          stack.push(val);
          break;
        }

        case 27: { // CLOSURE
          const fun = constants[this.advance()];
          const upvalCount = this.advance();
          const close = new Closure(fun);
          for (var i = 0; i < upvalCount; i += 1) {
            const isLocal = this.advance();
            const slot = this.advance();
            if (isLocal) {
              close.upvalues.push(this.captureUpvalue(this.frame.slots + slot));
            } else {
              close.upvalues.push(this.frame.script.upvalues[slot]);
            }
          }
          stack.push(close);
          break;
        }

        case 28: { // CALL
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
                return;
            }
            stack.push(ret);
          } else {
            if (!(script instanceof Closure)) {
              this.error('Cannot call non-function primitive');
              return;
            }
            if (argCount !== script.func.arity) {
              this.error('Wrong number of arguments');
              return;
            }
            const slots = this.stack.length - argCount;
            this.pushFrame(new StackFrame(script, slots));
            constants = this.frame.constants;
          }
          break;
        }

        case 29: { // RETURN
          if (this.callStack.length === 1) {
            this.dReturn(this.stack.pop());
            return;
          } else {
            const returnValue = stack.pop();
            // This also pops all the functions arguments.
            this.closeUpvalues(this.frame.slots);
            this.popFrame();
            constants = this.frame.constants;
            // The called function is still sitting on here on the stack, so
            // we pop it and restore the return value.
            stack.pop();
            stack.push(returnValue);
          }
          break;
        }

        case 30: { // SPAWN
          const argCount = this.advance();
          const propCount = this.advance();
          const vm = this.vm;
          const factory = vm.factory;

          const target = typeof factory === 'function' ? factory() : null;
          if (!target) {
            this.error('Failed to spawn target object, no factory function found');
            return;
          }

          let args;
          let script;
          if (argCount !== -1) {
            args = argCount > 0 ? stack.splice(-argCount) : [];
            script = stack.pop();
          }

          for (let i = 0; i < propCount; i += 1) {
            const name = constants[this.advance()];
            const val = stack.pop();
            if (name in target) {
              target[name] = val;
            } else {
              vm.events.emit('errored', target,
                'Cannot assign undefined property of spawned target object');
              this.error('Failed to spawn target object, invalid property in initializer');
              return;
            }
          }

          vm.events.emit('spawned', target);
          if (argCount !== -1) {
            vm._startThread(script, args, target);
          }
          break;
        }

        case 31: { // THREAD
          const argCount = this.advance();
          let args = argCount > 0 ? stack.splice(-argCount): [];
          const script = stack.pop();
          this.vm._startThread(script, args, null);
          break;
        }

        case 32: { // SLEEP
          const time = stack.pop();
          if (!isNumber(this, time)) {
            this.error('Invalid sleep expression');
            return;
          }
          this.sleep = time;
          break;
        }

        case 33: { // JMP
          this.frame.pc = this.advance();
          break;
        }

        case 34: { // JMP_FALSE
          const addr = this.advance();
          if(!stack[stack.length - 1]) {
            this.frame.pc = addr;
          }
          break;
        }

        case 35: { // FOR_TEST
          const l = stack.length;
          const initVal = stack[l - 3];
          const max = stack[l - 2];
          const increment = stack[l - 1];
          if (typeof initVal !== 'number' || typeof max !== 'number' || typeof increment !== 'number') {
            this.error('Invalid expression in for loop initializer');
            return;
          }
          if (increment === 0) {
            this.error('For loop increment cannot be 0');
            return;
          }
          stack[l - 3] += increment;
          stack.push(initVal);
          stack.push(increment > 0 ? initVal <= max : initVal >= max);
          break;
        }

        case 36: { // REPEAT
          const counter = stack[stack.length - 1];
          if (typeof counter === 'number') {
            if (counter > 0) {
              stack[stack.length - 1] -= 1;
              stack.push(true);
            } else {
              stack.push(false);
            }
          } else {
            this.error(`Expected numerical expression in repeat statement, found ${counter}`);
            return;
          }
          break;
        }

        case 37: { // CLOSE_UPVALUE
          this.closeUpvalues(stack.length - 1);
          stack.pop();
          break;
        }
      }
    }
  }

  pushFrame(frame) {
    this.callStack.push(frame);
    this.frame = frame;
  }

  popFrame() {
    const frame = this.callStack.pop();
    this.stack.length = frame.slots;
    this.frame = this.callStack[this.callStack.length - 1];
  }

  captureUpvalue(slot) {
    let prevUpvalue = null;
    let upvalue = this.openUpvalues;

    while (upvalue !== null && upvalue.slot > slot) {
      prevUpvalue = upvalue;
      upvalue = upvalue.next;
    }

    if (upvalue && upvalue.slot === slot) {
      return upvalue;
    }

    const createdUpvalue = new Upvalue(this.stack, slot);
    createdUpvalue.next = upvalue;

    if (!prevUpvalue) {
      this.openUpvalues = createdUpvalue;
    } else {
      prevUpvalue.next = createdUpvalue;
    }

    return createdUpvalue;
  }

  closeUpvalues(slot) {
    while(this.openUpvalues && this.openUpvalues.slot >= slot) {
      const upvalue = this.openUpvalues;
      upvalue.value = this.stack[upvalue.slot];
      this.openUpvalues = upvalue.next;
    }
  }

  advance() {
    if (this.frame.pc >= this.frame.code.length) {
      this.error('SegFault, end of code reached');
      return;
    }
    const op = this.frame.code[this.frame.pc];
    this.frame.pc += 1;
    return op;
  }

  dReturn(val) {
    if (typeof this.callback === 'function') {
      this.callback(val);
    }
    this.vm._kill(this);
  }

  error(msg) {
    const line = this.frame.script.getLine(this.frame.pc - 1);
    const target = this.target;
    this.vm._kill(this);
    this.vm._error(target, `DAKKA RUNTIME ERROR [line ${line}] ${msg}`);
  }
}

export default Thread;
