import OP_CODES from './OP_CODES.js';
const ops = Object.keys(OP_CODES);

function getOpName(opCode) {
  return ops.find(key => OP_CODES[key] === opCode);
}

export default function(func) {
  const code = func.code;
  const constants = func.constants;
  const l = code.length;
  let i = 0;
  while (i < l) {
    const op = code[i];
    const name = getOpName(op);
    switch (op) {
      case OP_CODES.JMP:
      case OP_CODES.JMP_FALSE: {
        i += 1;
        console.log(`${name} ${code[i]}`);
        break;
      }

      case OP_CODES.CONST:
      case OP_CODES.CLOSURE:
      case OP_CODES.INITIALIZE:
      case OP_CODES.INIT_GLOBAL:
      case OP_CODES.ASSIGN:
      case OP_CODES.GET_VAR:
      case OP_CODES.SET_GLOBAL:
      case OP_CODES.GET_GLOBAL:
      case OP_CODES.SET_PROP:
      case OP_CODES.GET_PROP: {
        i += 1;
        const cnst = constants[code[i]].toString();
        console.log(`${name} ${cnst}`);
        break;
      }

      case OP_CODES.CALL:
      case OP_CODES.THREAD: {
        i += 1;
        console.log(`${name} ARGS ${code[i]}`);
        break;
      }

      case OP_CODES.SPAWN: {
        i += 1;
        const argCount = code[i];
        i += 1;
        const propCount = code[i];
        const props = [];
        for (let j = 0; j < proptCount; j += 1) {
          i += 1;
          props.push(constants[code[i]]);
        }
        console.log(`${name} ARG_COUNT: ${args} PROPS: ${props.join(', ')}`);
        break;
      }

      default:
        console.log(name);
        break;
    }
    i += 1;
  }
}
