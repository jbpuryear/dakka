import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('Globals', () => {
  it('Declares globals', (done) => {
    const script = `global foo = 3;
      global testFunc = fun() { return 2; };
      return testFunc() + foo;`;
    dakka.run(script, false, (val) => {
      assert.equal(5, val);
      done();
    });
  });

  it('Applies default initialization', (done) => {
    const script = `global bar; return bar;`;
    dakka.run(script, false, (val) => {
      assert.equal(null, val);
      done();
    });
  });

  it('Accesses globals across scripts', (done) => {
    const script = 'foo += 1; return testFunc() + foo;';
    dakka.run(script, false, (val) => {
      assert.equal(6, val);
      done();
    });
  });

  it('Throws if already declared', () => {
    assert.throws(() => Dakka.run('global foo;'));
  });

  it('Throws if not declared', () => {
    assert.throws(() => Dakka.run('return xyxxy;'));
  });
});
