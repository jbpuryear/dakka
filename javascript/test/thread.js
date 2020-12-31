import assert from 'assert';
import Dakka from '../src/Dakka.js';

const obj = { foo: 'bar', xyzzy: null };
let callCount = 0;
function factory() {
  callCount += 1;
  return obj;
}
const dakka = new Dakka(factory);
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });


describe('Spawn', () => {
  it('Starts a thread', () => {
    const script = `
      var f = fun(c) {
        [foo] = c;
      };
      var g = fun(a, b) {
        spawn(f, a + b);
      };
      thread (g, 3, 2);`
    dakka.run(script, false, () => {
      assert.equal(obj.foo, 5);
    });
  });

  it('Throws on syntax error', () => {
    assert.throws(() => { dakka.run("thread;") });
    assert.throws(() => { dakka.run("thread ();") });
  });
});
