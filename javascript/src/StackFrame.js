class StackFrame {
  constructor(script, environment, pc) {
    this.script = script;
    this.returnEnvironment = environment;
    this.returnAddress = pc;
  }
}

export default StackFrame;
