import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('For Statment', () => {
  it('Loops', (done) => {
    const script =`var a = 0;
    for (var i = 1, 3) {
      a += i;
    }
    return a;`;
    dakka.run(script, false, (val) => {
      assert.equal(6, val);
      done();
    });
  });

  it('Loops with increment', (done) => {
    const script =`var a = 0;
    for (var i = 1, 2, 0.25) {
      a += 1;
    }
    return a;`;
    dakka.run(script, false, (val) => {
      assert.equal(5, val);
      done();
    });
  });

  it('Loops with negative increment', (done) => {
    const script =`var a = 0;
    for (var i = 1, -2, -1) {
      a += 1;
    }
    return a;`;
    dakka.run(script, false, (val) => {
      assert.equal(4, val);
      done();
    });
  });

  it('Returns closure from loop', (done) => {
    const script = `var f = fun() {
        for (var n = 0, 10) {
          var m = n;
          if (m == 8) {
            return fun() { return m; };
          }
        }
      };

      var h = f();
      return h();`;
    dakka.run(script, false, (val) => {
      assert.equal(8, val);
      done();
    });
  });

  it('Throws if no loop var', () => {
    assert.throws(() => { dakka.run('for (1, 10) { }') });
  });

  it('Throws if increment is 0', () => {
    assert.throws(() => { dakka.run('for (var i = 1, 10, 0) { }') });
  });
});
