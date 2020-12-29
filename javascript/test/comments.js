import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;

describe('Comments', () => {
  it('Comment between statements', () => {
    const script = 'var a = 1+1;\n// comment\nreturn a;';
    dakka.run(script, false, (val) => {
      assert.equal(2, val);
    });
  });

  it('Comment at end of line', () => {
    const script = 'var a = 1+1; // comment\nreturn a;';
    dakka.run(script, false, (val) => {
      assert.equal(2, val);
    });
  });

  it('Only comment', () => {
    const script = '//comment';
    assert.doesNotThrow(() => { dakka.run(script); });
  });

  it('Only comment and newline', () => {
    const script = '//comment\n';
    assert.doesNotThrow(() => { dakka.run(script); });
  });
});
