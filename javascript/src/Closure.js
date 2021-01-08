class Closure {
  constructor(fn) {
    this.func = fn;
    this.upvalues = [];
  }
}

export default Closure;
