// Current best: about 13 seconds

import Dakka from '../src/Dakka.js';
import { performance } from 'perf_hooks';
const dakka = new Dakka();

const script = `fun fib(n) {
    if (n < 2) return n;
    return fib(n - 2) + fib(n - 1);
  }

  return fib(35);`;

const start = performance.now();

dakka.run(script, null, console.log);

console.log("Time: ", performance.now() - start);
