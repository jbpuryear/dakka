class Listener {
  constructor(fn, context = null, once = false) {
    this.fn = fn;
    this.context = context;
    this.once = once;
  }
}


export default class EventEmitter {
  constructor() {
    this._events = new Map();
  }


  off(key, fn, context = null, once = false) {
    const events = this._events;
    const listeners = events.get(key);

    if (!listeners) {
      return false;
    }

    if (typeof fn !== 'function') {
      return events.delete(key);
    }

    let found = false;
    if (fn instanceof Listener) {
      found = listeners.delete(fn);
    } else {
      for (const listener of listeners) {
        if ((listener.fn === fn)
            && (!context || listener.context === context)
            && (!once || listener.once)) {
          listeners.delete(listener);
          found = true;
        }
      }
    }

    if (listeners.size === 0) {
      events.delete(key);
    }

    return found;
  }


  on(key, fn, context = null, once = false) {
    if (!fn) { return null; }

    const events = this._events;
    let listeners = events.get(key);
    if (!listeners) {
      listeners = new Set();
      events.set(key, listeners);
    }

    const listener = new Listener(fn, context, once)
    listeners.add(listener);

    return listener;
  }


  once(key, fn, context = null) {
    return this.on(key, fn, context, true);
  }


  clear() {
    return this._events.clear();
  }


  emit(key, ...args) {
    const listeners = this._events.get(key);
    if (!listeners) { return; }

    for (const listener of listeners) {
      listener.fn.apply(listener.context, args);
      if (listener.once) {
        listeners.delete(listener);
      }
    }

    if (listeners.size === 0) {
      this._events.delete(key);
    }
  }
}
