class StackFrame {
  constructor(code, constants, environment, pc) {
    this.code = code;
    this.constants = constants;
    this.environment = environment;
    this.returnAddress = pc;
  }
}

export default StackFrame;
