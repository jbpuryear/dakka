import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('Logical Operators', () => {
  it('And', () => {
    dakka.run('return false && 1;', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return 1 && false;', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return 1 && true && false;', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return 1 && true;', false, (val) => {
      assert.equal(true, val);
    });
    dakka.run('return 1 && true && 2;', false, (val) => {
      assert.equal(2, val);
    });
    const script = `var a = 'before';
      var b = 'before';
      (a = true) && (b = false) && (a = 'bad');
      return a;`;
    dakka.run(script, false, (val) => {
      assert.equal(true, val);
    });
  });

  it('Or', () => {
    dakka.run('return 1 || false;', false, (val) => {
      assert.equal(1, val);
    });
    dakka.run('return false || 1;', false, (val) => {
      assert.equal(1, val);
    });
    dakka.run('return false || false || true;', false, (val) => {
      assert.equal(true, val);
    });
    dakka.run('return false || false || false;', false, (val) => {
      assert.equal(false, val);
    });
    const script = `var a = 'before';
      var b = 'before';
      (a = false) && (b = true) && (a = 'bad');
      return a;`;
    dakka.run(script, false, (val) => {
      assert.equal(false, val);
    });
  });
});
