import OP_CODES from './OP_CODES.js';

const ops = Object.keys(OP_CODES);


function getOpName(opCode) {
  return ops.find(key => OP_CODES[key] === opCode);
}


export default function decompile(func) {
  const code = func.code;
  const constants = func.constants;
  const l = code.length;
  let i = 0;
  while (i < l) {
    let msg = '';
    const idx = i;
    const op = code[i];
    const name = getOpName(op);
    switch (op) {
      case OP_CODES.SET_VAR:
      case OP_CODES.GET_VAR:
      case OP_CODES.SET_UPVALUE:
      case OP_CODES.GET_UPVALUE:
      case OP_CODES.JMP:
      case OP_CODES.JMP_FALSE: {
        i += 1;
        msg = `${name} ${code[i]}`;
        break;
      }

      case OP_CODES.CONST:
      case OP_CODES.INIT_GLOBAL:
      case OP_CODES.SET_GLOBAL:
      case OP_CODES.GET_GLOBAL:
      case OP_CODES.SET_PROP:
      case OP_CODES.GET_PROP: {
        i += 1;
        const cnst = constants[code[i]].toString();
        msg = `${name} ${cnst}`;
        break;
      }

      case OP_CODES.CALL:
      case OP_CODES.THREAD: {
        i += 1;
        msg = `${name} ARGS ${code[i]}`;
        break;
      }

      case OP_CODES.SPAWN: {
        i += 1;
        const argCount = code[i];
        i += 1;
        const propCount = code[i];
        const props = [];
        for (let j = 0; j < propCount; j += 1) {
          i += 1;
          props.push(constants[code[i]]);
        }
        msg = `${name} ARG_COUNT: ${argCount} PROPS: ${props.join(', ')}`;
        break;
      }

      case OP_CODES.CLOSURE: {
        i += 1;
        const funIdx = code[i];
        i += 1;
        const upvals = code[i];
        msg = `CLOSURE FUNC: ${funIdx} UPVALS: ${upvals}`;
        for (let j = 0; j < upvals; j += 1) {
          i += 1;
          const isLocal = code[i] === 1 ? 'local' : 'upval';
          i += 1;
          const slot = code[i];
          msg += `\n        UPVAL: ${isLocal} ${slot}`;
        }
        break;
      }

      default:
        msg = name;
        break;
    }
    console.log(`${idx.toString().padStart(4, '0')}: ${msg}`);
    i += 1;
  }
}
