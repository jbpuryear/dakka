export default class Environment extends Map {
  constructor () {
    super([
      ['PI', Math.PI],
      ['TAU', Math.PI * 2],
      ['SQRT2', Math.SQRT2],
      ['sin', Math.sin],
      ['cos', Math.cos],
      ['tan', Math.tan],
      ['asin', Math.asin],
      ['acos', Math.acos],
      ['atan', Math.atan],
      ['atan2', Math.atan2],
      ['abs', Math.abs],
      ['ceil', Math.ceil],
      ['floor', Math.floor],
      ['min', Math.min],
      ['max', Math.max],
      ['rand', Math.random],
      ['round', Math.round],
      ['sign', Math.sign],
      ['sqrt', Math.sqrt],
      ['time', Date.now],
    ]);
  }
}
