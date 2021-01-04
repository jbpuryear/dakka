class DakkaFunction {
  constructor(name, arity = 0, code = [], constants) {
    this.name = name;
    this.arity = arity;
    this.code = code;
    this.constants = constants;
  }
}

export default DakkaFunction;
