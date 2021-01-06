import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });
dakka.addNative('test', () => 2);
dakka.addNative('testConst', 4);

describe('Natives', () => {
  it('Gets default natives', (done) => {
    const script = 'return floor(2.5) * PI;';
    dakka.run(script, false, (val) => {
      assert.equal(2 * Math.PI, val);
      done();
    });
  });

  it('Adds natives to a vm', (done) => {
    const script = 'return test();';
    dakka.run(script, false, (val) => {
      assert.equal(2, val);
      done();
    });
  });

  it('Adds native vars to vm', (done) => {
    const script = 'return testConst;';
    dakka.run(script, false, (val) => {
      assert.equal(4, val);
      done();
    });
  });
});
