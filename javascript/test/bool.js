import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('Bools', () => {
  it('Compares', () => {
    dakka.run('return true == true;', false, (val) => {
      assert.equal(true, val);
    });
    dakka.run('return false == false;', false, (val) => {
      assert.equal(true, val);
    });
    dakka.run('return true == false;', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return false == true;', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return true != true;', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return false != false;', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return true != false;', false, (val) => {
      assert.equal(true, val);
    });
    dakka.run('return false != true;', false, (val) => {
      assert.equal(true, val);
    });
  });

  it('Does not equal other types', () => {
    dakka.run('return true == "true";', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return false == "false";', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return true == 1;', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return false == 0;', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return false == "";', false, (val) => {
      assert.equal(false, val);
    });
  })

  it('Negates', () => {
    dakka.run('return !true;', false, (val) => {
      assert.equal(false, val);
    });
    dakka.run('return !false;', false, (val) => {
      assert.equal(true, val);
    });
    dakka.run('return !!true;', false, (val) => {
      assert.equal(true, val);
    });
  })
})

