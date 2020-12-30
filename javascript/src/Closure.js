class Closure {
  constructor(fn, env, isNative=false) {
    this.func = fn;
    this.environment = env;
    this.isNative = isNative;
  }
}

export default Closure;
