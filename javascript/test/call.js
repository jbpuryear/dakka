import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('Function calls', () => {
  it('Works for lambdas', (done) => {
    const script = 'var f = fun() { return 1; }; return f();';
    dakka.run(script, false, (val) => {
      assert.equal(1, val);
      done();
    });
  });

  it('Works for function statements', (done) => {
    const script = 'fun f() { return 1; }; return f();';
    dakka.run(script, false, (val) => {
      assert.equal(1, val);
      done();
    });
  });

  it('Works for nested functions', (done) => {
    const script = `fun f() {
        fun g() {
          return 1;
        }
        return g();
      };
      return f();`;
    dakka.run(script, false, (val) => {
      assert.equal(1, val);
      done();
    });
  });

  it('Returns without expression', (done) => {
    dakka.run('return;', false, (val) => {
      assert.equal(null, val);
    });
    dakka.run('while (true) { return; }', false, (val) => {
      assert.equal(null, val);
      done();
    });
  });

  it('Fails to call non function primitives', () => {
    assert.throws(() => { dakka.run('var a = 1; a();') });
    assert.throws(() => { dakka.run('var a = ""; a();') });
    assert.throws(() => { dakka.run('var a = null; a();') });
    assert.throws(() => { dakka.run('var a = true; a();') });
  });
});
