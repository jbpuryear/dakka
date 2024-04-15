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

dakka.addType('dak', factory);

describe('Thread', () => {
  it('Starts a new thread', (done) => {
    dakka.run("var f = fun(label) { [foo] = label; }; thread(fun() { spawn dak (f, 'qux'); });", false, () => {
      assert.equal(obj.foo, 'qux');
      done();
    });
  });
});
