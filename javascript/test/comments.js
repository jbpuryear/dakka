import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;

describe('Comments', (done) => {
  it('Comment between statements', (done) => {
    const script = 'var a = 1+1;\n// comment\nreturn a;';
    dakka.run(script, false, (val) => {
      assert.equal(2, val);
      done();
    });
  });

  it('Comment at end of line', (done) => {
    const script = 'var a = 1+1; // comment\nreturn a;';
    dakka.run(script, false, (val) => {
      assert.equal(2, val);
      done();
    });
  });

  it('Only comment', (done) => {
    const script = '//comment';
    assert.doesNotThrow(() => { dakka.run(script); });
    done();
  });

  it('Only comment and newline', (done) => {
    const script = '//comment\n';
    assert.doesNotThrow(() => { dakka.run(script); });
    done();
  });
});
