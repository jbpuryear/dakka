import EventEmitter from 'eventemitter3';
import Environment from './Environment.js';
import Thread from './Thread.js';
import Closure from './Closure.js';
import List from './List.js';
import scan from './scan.js';
import parse from './parse.js';
import decompile from './decompile.js';

function defaultFactory() {
  return {};
}

// Events
//   errored - Emitted when a thread has a runtime error, or if run is called with a string
//             that fails to compile. Callbacks are passed the threads target and an error message.
//   spawned - Emitted whenever a new target object is spawned using the provided factory
//             function. Callbacks are passed the target object.
class Dakka {
  constructor(factory = defaultFactory) {
    this.factory = factory;
    this.debug = false;
    this.events = new EventEmitter();
    this.global = new Environment();
    this._threads = new List();
    this._targetMap = new Map();
  }

  static compile(src) {
    return parse(scan(src));
  }

  run(script, spawn = false, callback) {
    let target;
    if (spawn === true) {
      target = typeof this.factory === 'function' ? this.factory() : {};
    } else if (typeof spawn === 'object') {
      target = spawn;
    } else {
      target = null;
    }

    let compiled;
    if (typeof script === 'string') {
      try {
        compiled = Dakka.compile(script);
      } catch (e) {
        if (this.debug) {
          console.error(e);
        }
        this.events.emit('errored', target, e);
        return;
      }
    } else {
      compiled = script;
    }
    const close = new Closure(compiled)
    this._startThread(close, null, target, callback);
    return spawn;
  }

  addNative(name, val) {
    const type = typeof val;
    switch (type) {
      case 'number':
      case 'string':
      case 'function':
        this.global.set(name, val);
        return true;
      default:
        this.events.emit('error', null, `Can't add native, invalid type '${type}'`);
        return false;
    }
  }

  update(dt) {
    let t = this._threads.head;
    while (t) {
      const { next } = t;
      t.update(dt);
      t = next;
    }
  }

  killByTarget(target) {
    const thread = this._targetMap.get(target);
    if (thread) {
      this._targetMap.delete(target);
      this._threads.remove(thread);
      return true;
    }
    return false;
  }

  killAll() {
    this._threads.head = null;
    this._threads.tail = null;
    this._targetMap.clear();
  }

  _spawn() {
    const s = this.factory();
    this.events.emit('spawned', s);
    return s;
  }

  _startThread(script, args, target, callback) {
    const thread = new Thread(this);
    this._threads.shift(thread);
    if (target) {
      this._targetMap.set(target, thread);
    }
    thread.run(script, args, target, callback);
  }

  _kill(thread) {
    this._threads.remove(thread);
    if (thread.target) {
      this._targetMap.delete(thread.target);
    }
  }

  _error(target, msg) {
    if (this.debug) {
      console.error(msg);
    }
    this.events.emit('errored', target, msg);
  }
}

Dakka.decompile = decompile;

export default Dakka;
