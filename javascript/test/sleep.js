import assert from 'assert';
import Dakka from '../src/Dakka.js';
import { performance } from 'perf_hooks';

const dakka = new Dakka();
dakka.debug = true;

let last = performance.now();
function step() {
  const now = performance.now();
  const dt = now - last;
  last = now;
  dakka.update(dt);
}
const id = setInterval(step, 16.66);

dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('Sleep', () => {
  it('Sleeps', (done) => {
    const start = performance.now();
    dakka.run('sleep 500; return 1;', null, false, (val) => {
      assert.equal(1, val);
      const elapsed = performance.now() - start;
      assert(elapsed > 480);
      assert(elapsed < 520);
      done();
    });
  });

  it('Sleeps in a nest', (done) => {
    const start = performance.now();
    dakka.run('var f = fun() { sleep 500; }; f(); return 1;', null, false, (val) => {
      assert.equal(1, val);
      const elapsed = performance.now() - start;
      assert(elapsed > 480);
      assert(elapsed < 520);
      done();
      clearInterval(id);
    });
  });
});
