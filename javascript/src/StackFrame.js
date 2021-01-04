class StackFrame {
  constructor(script, environment, pc) {
    this.script = script;
    this.code = script.func.code;
    this.constants = script.func.constants;
    this.environment = environment;
    this.returnAddress = pc;
  }
}

export default StackFrame;
