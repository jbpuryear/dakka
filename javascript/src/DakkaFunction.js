class DakkaFunction {
  constructor(arity = 0, code = [], constants, lineMap, startLine = 1) {
    this.arity = arity;
    this.code = code;
    this.constants = constants;

    // These let us match instructions in code to line numbers in the source.
    // Each value in the lineMap array is the index of the first instruction of code
    // that starts a new line.
    this.startLine = startLine;
    this.lineMap = lineMap;
  }

  getLine(opIdx) {
    let lm = this.lineMap;
    let i = 0;
    while (i < lm.length && opIdx > lm[i]) {
      i += 1;
    }
    return this.startLine + i;
  }
}

export default DakkaFunction;
