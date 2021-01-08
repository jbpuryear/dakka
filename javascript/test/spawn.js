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
  it('Spawns without thread or properties', (done) => {
    dakka.run("spawn;", false, () => {
      assert.equal(callCount, 1);
      done();
    });
  });

  it('Spawns without starting a thread', (done) => {
    dakka.run("spawn[ foo = 'baz', xyzzy = 'quux' ];", false, () => {
      assert.equal(obj.foo, 'baz');
      assert.equal(obj.xyzzy, 'quux');
      done();
    });
  });

  it('Spawns a thread without property list', (done) => {
    dakka.run("var f = fun(label) { [foo] = label; }; spawn(f, 'qux');", false, () => {
      assert.equal(obj.foo, 'qux');
      done();
    });
  });

  it('Spawns a thread with property list', (done) => {
    dakka.run("var f = fun(i) { [foo] = [foo] - i; }; spawn(f, 3)[ foo = 7 ];", false, () => {
      assert.equal(obj.foo, 4);
      done();
    });
  });

  it('Throws on undefined property', () => {
    assert.throws(() => { dakka.run("spawn[ waldo = 'grault' ];") });
  });
});
