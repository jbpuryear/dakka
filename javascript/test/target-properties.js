import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('Target Properties', () => {
  it('Gets a property', () => {
    const t = { foo: 'bar' };
    dakka.run('var a = [foo]; return a;', t, (val) => {
      assert.equal('bar', val);
    });
  });

  it('Sets a property', () => {
    const t = { foo: 'bar' };
    dakka.run("[foo] = 'baz';", t, () => {
      assert.equal(t.foo, 'baz');
    });
  });

  it('Sets a property with modifier', () => {
    const t = { foo: 2 };
    dakka.run("[foo] += 5; [foo] -= 1; [foo] /= 2; [foo] *= 3; return [foo] %= 4;", t, () => {
      assert.equal(t.foo, 1);
    });
  });

  it('Throws on undefined properties', () => {
    const t = {};
    assert.throws(() => { dakka.run('[foo] = 1;', t) });
    assert.throws(() => { dakka.run('var a = [foo];', t) });
  });
});
