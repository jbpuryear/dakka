import EventEmitter from 'eventemitter3';
import Environment from './Environment.js';
import Thread from './Thread.js';
import Closure from './Closure.js';
import List from './List.js';
import scan from './scan.js';
import parse from './parse.js';

function onThreadErrored(thread, msg) {
  this._threads.remove(this._threads, thread);
  if (this.debug) {
    console.error(msg);
  }
  this.events.emit('errored', thread.target, msg);
}

function onThreadSpawnErrored(thread, spawnTarget, msg) {
  this._threads.remove(thread);
  if (this.debug) {
    console.error(msg);
  }
  this.events.emit('errored', thread.target, msg);
  this.events.emit('errored', spawnTarget, msg);
}

function defaultFactory() {
  return {};
}

// Events
//   errored - Emitted when a thread has a runtime error, or if run is called with a string
//             that fails to compile. Callbacks are passed the threads target and an error message.
//   spawned - Emitted whenever a new target object is spawned using the provided factory
//             function. Callbacks are passed the target object.
//   compile-error - Emitted by compile. Useful if compiling seperate from running. Callbacks are
//                   passed the error message.
class Dakka {
  constructor(factory = defaultFactory) {
    this.factory = factory;
    this.debug = false;
    this.events = new EventEmitter();
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
    const close = new Closure(compiled, new Environment())
    this._startThread(close, close.environment, null, target, callback);
    return spawn;
  }

  update(dt) {
    let t = this._threads.head;
    while (t) {
      const { next } = t;
      t.update(dt);
      if (t.terminated) {
        this._threads.remove(t);
      }
      t = next;
    }
  }

  killByTarget(target) {
    const thread = this._targetMap.get(target);
    console.log('aaaaaaaaa', thread);
    console.log(this._targetMap);
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

  _startThread(script, env, args, target, callback) {
    const thread = new Thread(this);
    thread.events.on('errored', onThreadErrored, this);
    thread.events.on('spawn_errored', onThreadSpawnErrored, this);
    thread.run(script, env, args, target, callback);
    if (!thread.terminated) {
      this._threads.shift(thread);
      if (target) {
        this._targetMap.set(target, thread);
      }
    } 
  }
}

export default Dakka;
