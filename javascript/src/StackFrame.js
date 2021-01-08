class StackFrame {
  constructor(script, slots = 0) {
    this.script = script;
    this.slots = slots;
    this.code = script.func.code;
    this.constants = script.func.constants;
    this.pc = 0;
  }
}

export default StackFrame;
