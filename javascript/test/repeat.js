import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('Repeat Statment', () => {
  it('Loops', (done) => {
    const script =`var a = 0;
    repeat (10) a += 1;
    return a;`;
    dakka.run(script, false, (val) => {
      assert.equal(10, val);
      done();
    });
  });

  it('Does nothing on negative initializer', (done) => {
    const script =`var a = 10;
    repeat (-10) a += 1;
    return a;`;
    dakka.run(script, false, (val) => {
      assert.equal(10, val);
      done();
    });
  });

  it('Throws if no intializer', () => {
    assert.throws(() => { dakka.run('repeat () { }') });
  });
});
