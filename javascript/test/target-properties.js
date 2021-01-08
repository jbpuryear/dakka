import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('Target Properties', () => {
  it('Gets a property', (done) => {
    const t = { foo: 'bar' };
    dakka.run('var a = [foo]; return a;', t, (val) => {
      assert.equal('bar', val);
      done()
    });
  });

  it('Sets a property', (done) => {
    const t = { foo: 'bar' };
    dakka.run("[foo] = 'baz';", t, () => {
      assert.equal(t.foo, 'baz');
      done();
    });
  });

  it('Sets a property with modifier', (done) => {
    const t = { foo: 2 };
    dakka.run("[foo] += 5; [foo] -= 1; [foo] /= 2; [foo] *= 3; return [foo] %= 4;", t, () => {
      assert.equal(t.foo, 1);
      done();
    });
  });

  it('Throws on undefined properties', (done) => {
    const t = {};
    assert.throws(() => { dakka.run('[foo] = 1;', t) });
    assert.throws(() => { dakka.run('var a = [foo];', t) });
    done();
  });
});
