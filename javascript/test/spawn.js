import assert from 'assert';
import Dakka from '../src/Dakka.js';

const obj = { foo: 'bar', xyzzy: null };
let callCount = 0;
function factory() {
  callCount += 1;
  return obj;
}
const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

dakka.addType('dak', factory);

describe('Spawn', () => {
  it('Spawns without thread or properties', (done) => {
    dakka.run("spawn dak;", false, () => {
      assert.equal(callCount, 1);
      done();
    });
  });

  it('Spawns without starting a thread', (done) => {
    dakka.run("spawn dak [ foo = 'baz', xyzzy = 'quux' ];", false, () => {
      assert.equal(obj.foo, 'baz');
      assert.equal(obj.xyzzy, 'quux');
      done();
    });
  });

  it('Spawns a thread without property list', (done) => {
    dakka.run("var f = fun(label) { [foo] = label; }; spawn dak (f, 'qux');", false, () => {
      assert.equal(obj.foo, 'qux');
      done();
    });
  });

  it('Spawns a thread with property list', (done) => {
    dakka.run("var f = fun(i) { [foo] = [foo] - i; }; spawn dak [ foo = 7 ](f, 3);", false, () => {
      assert.equal(obj.foo, 4);
      done();
    });
  });

  it('Throws on undefined property', () => {
    assert.throws(() => { dakka.run("spawn dak [ waldo = 'grault' ];") });
  });
});
