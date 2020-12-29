import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('Blocks', () => {
  it('Creates new scope', () => {
    const script = "{ var a = 'inner'; } return a;";
    assert.throws(() => { dakka.run(script, false, (val) => { console.log('sssssssssssssss', val); }); });
    const script2 = "var a = 'outer'; { var a = 'inner'; } return a;";
    dakka.run(script2, false, (val) => {
      assert.equal('outer', val);
    });
  });
});
