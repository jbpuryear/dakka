import Environment from './Environment.js';

export default class DefaultEnvironment extends Environment {
  constructor() {
    super();
    this.makeVar('PI', Math.PI);
    this.makeVar('TAU', Math.PI * 2);
    this.makeVar('SQRT2', Math.SQRT2);
    this.makeVar('sin', Math.sin);
    this.makeVar('cos', Math.cos);
    this.makeVar('tan', Math.tan);
    this.makeVar('asin', Math.asin);
    this.makeVar('acos', Math.acos);
    this.makeVar('atan', Math.atan);
    this.makeVar('atan2', Math.atan2);
    this.makeVar('abs', Math.abs);
    this.makeVar('ceil', Math.ceil);
    this.makeVar('floor', Math.floor);
    this.makeVar('min', Math.min);
    this.makeVar('max', Math.max);
    this.makeVar('rand', Math.random);
    this.makeVar('round', Math.round);
    this.makeVar('sign', Math.sign);
    this.makeVar('sqrt', Math.sqrt);
    this.makeVar('time', Date.now);
  }
}
