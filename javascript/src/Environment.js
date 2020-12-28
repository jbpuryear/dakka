class Environment {
  constructor(outer = null) {
    this.outer = outer;
    this.table = new Map();
  }


  getVar(name) {
    if (this.table.has(name)) {
      return this.table.get(name);
    } else {
      throw new Error(`Cannot access variable, ${name}, not found in target scope`);
    }
  }


  setVar(name, value) {
    if (this.table.has(name)) {
      this.table.set(name);
    } else {
      throw new Error(`Cannot set variable, ${name}, not found in target scope`);
    }
  }


  makeVar(name, value) {
    if (this.table.has(name)) {
      throw Error(`Variable, ${name}, already declared in target scope`);
    }
    this.table.set(name, value);
  }


  makeInner() {
    return new Environment(this);
  }


  getVarDepth(name, count = 0) {
    if (this.table.has(name)) {
      return count;
    }
    return this.outer ? this.outer.getVarDepth(name, count + 1) : -1;
  }


  getVarAt(depth, name) {
    if (depth > 0) {
      if (this.outer) {
        return this.outer.getVarAt(depth - 1, name);
      } else {
        throw new Error(`Cannot access variable, ${name}. Outermost scope reached.`);
      }
    } else {
      return this.getVar(name);
    }
  }


  setVarAt(depth, name, value) {
    if (depth > 0) {
      if (this.outer) {
        this.outer.setVarAt(depth - 1, name, value);
      } else {
        throw new Error(`Cannot set variable, ${name}. Outermost scope reached.`);
      }
    } else {
      return this.setVar(name, value);
    }
  }
}


export default Environment
