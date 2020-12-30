import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.events.on('errored', () => { throw new Error(); });

describe('If Statement', () => {
  it('Handles dangling else', () => {
    dakka.run('if (true) if (false) return "bad"; else return "good";', false, (val) => {
      assert.equal('good', val);
    });
    dakka.run('if (false) if (false) return "bad"; else return "good";', false, (val) => {
      assert.equal(null, val);
    });
  });
});
