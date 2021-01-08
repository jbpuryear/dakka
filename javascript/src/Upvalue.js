export default class Upvalue {
  constructor(stack, slot) {
    this.stack = stack;
    this.slot = slot;
    this.value = undefined;
    this.next = null;
  }

  getValue() {
    return this.value === undefined ? this.stack[this.slot] : this.value;
  }

  setValue(val) {
    if (this.value === undefined) {
      this.stack[this.slot] = val;
    } else {
      this.value = val;
    }
  }
}
