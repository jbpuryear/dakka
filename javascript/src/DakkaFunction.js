class DakkaFunction {
  constructor(arity = 0, code = [], constants, lineMap, startLine = 1) {
    this.arity = arity;
    this.code = code;
    this.constants = constants;

    // These let us match instructions in code to line numbers in the source. Stores pairs
    // of numbers (line, firstOp) where line is a line number in the original script and
    // firstOp is the first byte of machine code generated by that line.
    this.startLine = startLine;
    this.lineMap = lineMap;
  }
}

export default DakkaFunction;
