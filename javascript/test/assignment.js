import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', () => { throw new Error(); });

describe('Assignment', () => {
  it('Is right-associative', (done) => {
    const script = 'var a; var b; var c; a = b = c = 3; return a + b + c;';
    dakka.run(script, false, (val) => {
      assert.equal(9, val);
      done();
    });
  });

  it('Throws error on invalid L-value', (done) => {
    assert.throws(() => { dakka.run('var a = 1; var b = 2; a + b = 3;', false); });
    assert.throws(() => { dakka.run('var a = 1; !a = 2;', false); });
    done();
  });

  it('Defines and assigns in current scope', (done) => {
    const script = 'var a = 1; a = a + 2; return a;';
    dakka.run(script, false, (val) => {
      assert.equal(3, val);
      done();
    });
  });

  it('Will not assign to undeclared variables', (done) => {
    assert.throws(() => { dakka.run('empty = 1;'); });
    done();
  });

  it('Assigns with modifier', (done) => {
    dakka.run("var foo = 2; foo = 5; foo -= 1; foo /= 2; foo *= 3; return foo %= 4;", null, (val) => {
      assert.equal(2, val);
      done();
    });
  });
});
