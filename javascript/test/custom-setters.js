import assert from 'assert';
import Dakka from '../src/Dakka.js';

const obj = { foo: 'bar' };
let wasGotten = null;
const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

dakka.addType('dak', () => obj, (o, prop) => {wasGotten = o[prop]; return o[prop]}, (o, prop, val) => o[prop] = val + 'xyxx');

describe('Target Properties', () => {
  it('Sets a property', (done) => {
    dakka.run("spawn dak (fun() {[foo] = 'baz';});", obj, () => {
      assert.equal(obj.foo, 'bazxyxx');
      done();
    });
  });

  it('Gets a property', (done) => {
    dakka.run('spawn dak (fun() {return [foo];});', obj, () => {
      assert.equal(wasGotten, 'bazxyxx');
      done()
    });
  });
});
