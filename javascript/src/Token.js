class Token {
  constructor(type, literal, lexeme, line) {
    this.type = type;
    this.literal = literal;
    this.lexeme = lexeme;
    this.line = line;
  }
}

Token.L_PAREN = 'L_PAREN';
Token.R_PAREN = 'R_PAREN';
Token.L_BRACE = 'L_BRACE';
Token.R_BRACE = 'R_BRACE';
Token.L_BRACKET = 'L_BRACKET';
Token.R_BRACKET = 'R_BRACKET';
Token.SEMI = 'SEMI';
Token.COMMA = 'COMMA';
Token.EQUAL = 'EQUAL';
Token.NOT_EQUAL = 'NOT_EQUAL';
Token.LESS = 'LESS';
Token.GREATER = 'GREATER';
Token.LESS_EQ = 'LESS_EQ';
Token.GREATER_EQ = 'GREATER_EQ';
Token.NOT = 'NOT';
Token.AND = 'AND';
Token.OR = 'OR';
Token.ASSIGN = 'ASSIGN';
Token.PLUS_ASSIGN = 'PLUS_ASSIGN';
Token.MINUS_ASSIGN = 'MINUS_ASSIGN';
Token.MUL_ASSIGN = 'MUL_ASSIGN';
Token.DIV_ASSIGN = 'DIV_ASSIGN';
Token.PLUS = 'PLUS';
Token.MINUS = 'MINUS';
Token.MUL = 'MUL';
Token.DIV = 'DIV';
Token.IDENTIFIER = 'IDENTIFIER';
Token.STRING = 'STRING';
Token.NUMBER = 'NUMBER';
Token.TRUE = 'TRUE';
Token.FALSE = 'FALSE';
Token.NULL = 'NULL';
Token.VAR = 'VAR';
Token.IF = 'IF';
Token.ELSE = 'ELSE';
Token.WHILE = 'WHILE';
Token.LOOP = 'LOOP';
Token.FUN = 'FUN';
Token.RETURN = 'RETURN';
Token.SLEEP = 'SLEEP';
Token.EOF = 'EOF';

export default Token;
