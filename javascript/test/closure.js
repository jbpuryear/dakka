import assert from 'assert';
import Dakka from '../src/Dakka.js';

const dakka = new Dakka();
dakka.debug = true;
dakka.events.on('errored', (_, msg) => { throw new Error(msg); });

describe('Closures', () => {
  it('Assigns to closure', (done) => {
    const script = `var f;
      var a = 2;
      {
        var a = 5;
        f = fun(b) {
          a = a + 1;
          return b + a;
        };
      }
      return f(a) + f(a);`;
    dakka.run(script, false, (val) => {
      assert.equal(17, val);
      done();
    });
  });
return;
  it('Assigns to shadowed later', (done) => {
    const script = `var a = 'outer';
    {
      var assign = fun() {
        a = 'assigned';
      };
      var a = 'inner';
      assign();
    }
    return 'assigned';`;

    dakka.run(script, false, (val) => {
      assert.equal('assigned', val);
      done();
    });
  });

  it('Closes over parameters', (done) => {
    const script = `var f;
    var foo = fun(param) {
      f = fun() {
        return param;
      };
    };
    foo('par');
    return f();`;

    dakka.run(script, false, (val) => {
      assert.equal('par', val);
      done();
    });
  });

  it('Nests', (done) => {
    const script = `var f;
    var f1 = fun() {
      var a = 1;
      var f2 = fun() {
        var b = 3;
        var f3 = fun() {
          var c = 5;
          f = fun() { return a + b + c; };
        };
        f3();
      };
      f2();
    };
    f1();
    return f();`;

    dakka.run(script, false, (val) => {
      assert.equal(9, val);
      done();
    });
  });

  it('Shadows closure with local', (done) => {
    const script = `var a = 1;
    var f = fun() {
      var b = a;
      var a = 3;
      return a + b;
    };
    return f();`;

    dakka.run(script, false, (val) => {
      assert.equal(4, val);
      done();
    });
  });
});
