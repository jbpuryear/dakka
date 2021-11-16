import assert from 'assert';
import Dakka from '../src/Dakka.js';

const obj = { foo: 'bar' };
const dakka = new Dakka(null, (o, prop) => o[prop] + 'baz', (o, prop, val) => o[prop] = val + 'xyxx');
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('Target Properties', () => {
  it('Sets a property', (done) => {
    dakka.run("[foo] = 'baz';", obj, () => {
      assert.equal(obj.foo, 'bazxyxx');
      done();
    });
  });

  it('Gets a property', (done) => {
    dakka.run('return [foo];', obj, (val) => {
      assert.equal('bazxyxxbaz', val);
      done()
    });
  });
});
