import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', () => { throw new Error(); });

describe('Thread Pooling', () => {
  it('Pools threads', () => {
    const script = 'return null;';
    dakka.run(script);
    dakka.run(script);
    assert.equal(dakka._pool.length, 1);
  });
});
