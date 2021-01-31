import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', () => { throw new Error(); });

describe('Script Arguments', () => {
  it('Gets arguments', (done) => {
    const script = 'args a, b; return a + b;';
    dakka.run(script, false, (val) => {
      assert.equal(5, val);
      done();
    }, 2, 3);
  });

  it('Throws on invalid arguments', (done) => {
    assert.throws(() => { dakka.run('args a, b, c;', false, null, 1, 2); });
    assert.throws(() => { dakka.run('args a; return a;', false, null, 1, 2); });
    done();
  });
});
