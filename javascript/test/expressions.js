import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;

describe('Expressions', () => {
  it('Evaluates', (done) => {
    this.timeout(1000);
    const script = 'return (5 - (3 - 1)) + -1;';
    dakka.run(script, false, (ret) => {
      assert.equal(2, ret);
    });
    const script2 = 'return 3 * 6 / 2 / 3;';
    dakka.run(script2, false, (ret) => {
      assert.equal(3, ret);
      done();
    });
  });
});
