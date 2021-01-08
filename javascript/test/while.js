import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('While Statements', () => {
  it('Handles single expression bodies', () => {
    const script = `var c = 0;
      while (c < 3) c = c + 1;
      return c;`;
    dakka.run(script, false, (val) => {
      assert.equal(3, val);
    });
  });

  it('Handles complex statement bodies', () => {
    dakka.run(`while (false) if (true) 1; else 2;`, false, (val) => {
      assert.equal(null, val);
    });
    dakka.run(`while (false) while (true) 1;`, false, (val) => {
      assert.equal(null, val);
    });
  });

  it('Returns closure from loop', () => {
    const script = `var f = fun() {
        while (true) {
          var i = "i";
          var g = fun() { return i; };
          return g;
        }
      };

      var h = f();
      return h();`;
    dakka.run(script, false, (val) => {
      assert.equal('i', val);
    });
  });
});
