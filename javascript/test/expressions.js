import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;

describe('Expressions', function expressionTest() {
  this.timeout(1000);
  it('Evaluates', (done) => {
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

  it('Performs modulus', (done) => {
    dakka.run('return 13 % 3;', false, (ret) => {
      assert.equal(1, ret);
    });
    dakka.run('return -13 % 3;', false, (ret) => {
      assert.equal(-1, ret);
    });
    dakka.run('return 13 % -3;', false, (ret) => {
      assert.equal(1, ret);
    });
    dakka.run('return -13 % -3;', false, (ret) => {
      assert.equal(-1, ret);
      done();
    });
  });


  it('Evaluates ternary expressions', (done) => {
    dakka.run('return true ? false ? "bad" : "good" : "bad";', false, (val) => {
      assert.equal('good', val);
    });
    dakka.run('return false ? false ? "bad" : "bad" : "good";', false, (val) => {
      assert.equal("good", val);
      done();
    });
  });
});
