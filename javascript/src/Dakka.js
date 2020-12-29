import EventEmitter from 'eventemitter3';
import Environment from './Environment.js';
import Thread from './Thread.js';
import scan from './scan.js';
import parse from './parse.js';

// These functions are for dealing with the thread list.
function shift(list, thread) {
  thread.prev = null;
  thread.next = list.head;
  if (list.head === null) {
    list.tail = thread;
  } else {
    list.head.prev = thread;
  }
  list.head = thread;
}

function remove(list, thread) {
  if (list.head === thread) {
    list.head = thread.next;
  }
  if (list.tail === thread) {
    list.tail = thread.prev;
  }
  if (thread.prev) {
    thread.prev.next = thread.next;
  }
  if (thread.next) {
    thread.next.prev = thread.prev;
  }
  thread.next = null;
  thread.prev = null;
}

// TODO Figure out where to move this, system for extending natives.

function onThreadErrored(thread, msg) {
  remove(this._threads, thread);
  if (this.debug) {
    console.error(msg);
  }
  this.events.emit('errored', thread.target, msg);
}

// Events
//   errored - Emitted when a thread has a runtime error. Callbacks are passed the
//             threads target and an error message.
//   spawned - Emitted whenever a new target object is spawned using the provided factory
//             function. Callbacks are passed the target object.
class Dakka {
  constructor(factory = null) {
    this.factory = factory;
    this.debug = false;
    this.events = new EventEmitter();
    this._threads = { head: null, tail: null };
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
          console.error('Failed to compile');
        }
        this.events.emit('errored', target, 'Failed to compile');
        return;
      }
    } else {
      compiled = script;
    }

    const thread = new Thread(this, target, callback);
    thread.events.on('errored', onThreadErrored, this);
    thread.run(compiled, new Environment());
    if (!thread.terminated) {
      shift(this._threads, thread);
    }
  }

  update(dt) {
    let t = this._threads.head;
    while (t) {
      const { next } = t;
      t.update(dt);
      if (t.terminated) {
        remove(this._threads, t);
      }
      t = next;
    }
  }
}

export default Dakka;
