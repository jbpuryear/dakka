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

  it('Returns closure from loop', (done) => {
    const script = `var f = fun() {
        var n = 0;
        repeat (10) {
          n += 1;
          repeat (2) {
            var i = n;
            if (i == 8) {
              return fun() { return n; };
            }
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

  it('Throws if no intializer', () => {
    assert.throws(() => { dakka.run('repeat () { }') });
  });
});
