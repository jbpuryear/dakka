import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', () => { throw new Error(); });

describe('Assignment', () => {
  it('Is right-associative', () => {
    const script = 'var a; var b; var c; a = b = c = 3; return a + b + c;';
    dakka.run(script, false, (val) => {
      assert.equal(9, val);
    });
  });

  it('Throws error on invalid L-value', () => {
    assert.throws(() => { dakka.run('var a = 1; var b = 2; a + b = 3;', false); });
    assert.throws(() => { dakka.run('var a = 1; !a = 2;', false); });
  });

  it('Defines and assigns in current scope', () => {
    const script = 'var a = 1; a = a + 2; return a;';
    dakka.run(script, false, (val) => {
      assert.equal(3, val);
    });
  });

  it('Will not assign to undeclared variables', () => {
    assert.throws(() => { dakka.run('empty = 1;'); });
  });

  it('Assigns with modifier', () => {
    dakka.run("var foo = 2; foo = 5; foo -= 1; foo /= 2; foo *= 3; return foo %= 4;", null, (val) => {
      assert.equal(2, val);
    });
  });
});
