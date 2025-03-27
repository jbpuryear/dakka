import EventEmitter from './EventEmitter.js';
import Environment from './Environment.js';
import Thread from './Thread.js';
import Closure from './Closure.js';
import List from './List.js';
import scan from './scan.js';
import parse from './parse.js';

function defaultGetter(target, prop) {
  if (!(prop in target)) { return undefined; }
  return target[prop];
}

function defaultSetter(target, prop, value) {
  if (!(prop in target)) { return undefined; }
  return target[prop] = value;
}

// Events
//   errored - Emitted when a thread has a runtime error, or if run is called with a string
//             that fails to compile. Callbacks are passed the threads target and an error message.
//   spawned - Emitted whenever a new target object is spawned using the provided factory
//             function. Callbacks are passed the target object.
class Dakka {
  constructor() {
    this.debug = false;
    this.events = new EventEmitter();
    this._types = new Map();
    this._global = new Environment();
    this._nextId = 1;
    this._threads = new List();
    this._threadMap = new Map();
    this._pool = [];
  }

  static compile(src) {
    return parse(scan(src));
  }

  run(script, spawn = null, callback = null, ...args) {
    let compiled;
    if (typeof script === 'string') {
      try {
        compiled = Dakka.compile(script);
      } catch (e) {
        this._error(spawn, e);
        return 0;
      }
    } else {
      compiled = script;
    }
    const close = new Closure(compiled);

    const thread = this._aquireThread();
    let target = null;
    let getter = defaultGetter;
    let setter = defaultSetter;
    const spawnType = typeof spawn;
    if (spawnType === 'string') {
      const type = this._types.get(spawn);
      if (type) {
        target = type.factory(thread.id);
        setter = type.setter;
        getter = type.getter;
      } else {
        this._error(null, 'Invalid factory function');
        return 0;
      }
    } else if (typeof spawn === 'object') {
      target = spawn;
    }

    this._startThread(thread, close, args, target, getter, setter, callback);
    return thread.id;
  }

  addNative(name, val) {
    const type = typeof val;
    switch (type) {
      case 'number':
      case 'string':
      case 'function':
        this._global.set(name, val);
        return true;
      default:
        this._error(null, `Can't add native, invalid type '${type}'`);
        return false;
    }
  }

  addType(key, factory, getter = defaultGetter, setter = defaultSetter) {
    if (typeof key !== 'string') {
      this._error(null, 'Invalid type identifier');
      return false;
    }
    if (typeof factory !== 'function' || typeof getter !== 'function' || typeof setter !== 'function') {
      this._error(null, 'Invalid type definition');
      return false;
    }
    this._types.set(key, { factory, getter, setter });
    return true;
  }

  update(dt) {
    let t = this._threads.head;
    while (t) {
      const { next } = t;
      if (t.isAlive()) {
        t.update(dt);
      } else {
        this._threads.remove(t);
        this._pool.push(t);
      }
      t = next;
    }
  }

  kill(id) {
    const thread = this._threadMap.get(id);
    if (!thread) {
      return false;
    }
    this._threadMap.delete(thread.id);
    thread.reset();
    return true;
  }

  killAll() {
    this._threads.head = null;
    this._threads.tail = null;
    this._threadMap.clear();
  }

  _startThread(thread, script, args = [], target = null,
      getter = defaultGetter, setter = defaultSetter, callback = null) {
    this._threads.shift(thread);
    this._threadMap.set(thread.id, thread);
    thread.run(script, args, target, getter, setter, callback);
    return thread;
  }

  _aquireThread() {
    const thread = this._pool.pop() || new Thread(this);
    thread.id = this._nextId;
    this._nextId += 1;
    return thread;
  }

  _error(target, msg) {
    if (this.debug) {
      console.error(msg);
    }
    this.events.emit('errored', target, msg);
  }
}

export default Dakka;
