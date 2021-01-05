const opNames = [
  'TRUE',
  'FALSE',
  'NULL',
  'NOT',
  'EQUAL',
  'NOT_EQUAL',
  'GREATER',
  'GREATER_EQ',
  'LESS',
  'LESS_EQ',
  'ADD',
  'SUB',
  'MUL',
  'DIV',
  'MOD',
  'NEGATE',
  'CONST',
  'POP',
  'SCOPE_PUSH',
  'SCOPE_POP',
  'INITIALIZE',
  'ASSIGN',
  'GET_VAR',
  'SET_PROP',
  'GET_PROP',
  'CLOSURE',
  'CALL',
  'RETURN',
  'SPAWN',
  'THREAD',
  'SLEEP',
  'JMP',
  'JMP_FALSE',
  'FOR_TEST',
  'REPEAT',
];

const OP_CODES = {};

for (let i = 0; i < opNames.length; i += 1) {
  OP_CODES[opNames[i]] = i;
}

export default OP_CODES;
