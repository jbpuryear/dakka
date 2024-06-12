class Closure {
  constructor(fn) {
    this.func = fn;
    this.upvalues = [];
  }

  getLine(opIdx) {
    const lm = this.func.lineMap;
    if (!lm) { return -1; }
    let i = 1;
    while (i < lm.length && opIdx > lm[i]) {
      i += 2;
    }
    return lm[i - 3];
  }
}

export default Closure;
