import assert from 'assert';
import scan from '../src/scan.js';
import KEYWORDS from '../src/KEYWORDS.js';
import Token from '../src/Token.js';

describe('Identifiers', () => {
  it('Recognizes valid names', () => {
    const lexemes = ['foo', '_foo', 'foo123', 'f1o2o3', '_', '_123',
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'];
    const tokens = scan(lexemes.join(' '));

    for (let i = 0; i < lexemes.length; i += 1) {
      const token = tokens[i];
      const lexeme = lexemes[i];
      assert.equal(token.type, Token.IDENTIFIER);
      assert.equal(token.lexeme, lexeme);
      assert.equal(token.literal, null);
    }
  });

  it('Recognizes keywords', () => {
    const lexemes = ['var', 'while', 'true', 'if'];
    const tokens = scan(lexemes.join(' '));

    for (let i = 0; i < lexemes.length; i += 1) {
      const token = tokens[i];
      const lexeme = lexemes[i];
      assert.equal(token.type, KEYWORDS.get(lexeme));
      assert.equal(token.lexeme, lexeme);
      assert.equal(token.literal, null);
    }
  });
});

describe('Numbers', () => {
  it('Recognizes valid numbers', () => {
    const tokens = scan('123 0.123 123.123');
    for (let i = 0; i < 3; i += 1) {
      const token = tokens[i];
      assert.equal(token.type, Token.NUMBER);
      assert.equal(typeof token.lexeme, 'string');
      assert.equal(typeof token.literal, 'number');
      assert.equal(parseFloat(token.lexeme), token.literal);
    }
    assert.equal(tokens[0].literal, 123);
    assert.equal(tokens[1].literal, 0.123);
    assert.equal(tokens[2].literal, 123.123);
  });

  it('Reports invalid numbers', () => {
    assert.throws(() => { scan('.123'); });
    assert.throws(() => { scan('123.'); });
    assert.throws(() => { scan('1.2.3'); });
  });
});

describe('Punctuation', () => {
  it('Recognizes punctuation', () => {
    const s = '()-+*/,={};!>< ==>=<=+=-=/=*=!=&&||';
    const tokens = scan(s);
    assert.equal(tokens[0].type, Token.L_PAREN);
    assert.equal(tokens[1].type, Token.R_PAREN);
    assert.equal(tokens[2].type, Token.MINUS);
    assert.equal(tokens[3].type, Token.PLUS);
    assert.equal(tokens[4].type, Token.MUL);
    assert.equal(tokens[5].type, Token.DIV);
    assert.equal(tokens[6].type, Token.COMMA);
    assert.equal(tokens[7].type, Token.ASSIGN);
    assert.equal(tokens[8].type, Token.L_BRACE);
    assert.equal(tokens[9].type, Token.R_BRACE);
    assert.equal(tokens[10].type, Token.SEMI);
    assert.equal(tokens[11].type, Token.NOT);
    assert.equal(tokens[12].type, Token.GREATER);
    assert.equal(tokens[13].type, Token.LESS);
    assert.equal(tokens[14].type, Token.EQUAL);
    assert.equal(tokens[15].type, Token.GREATER_EQ);
    assert.equal(tokens[16].type, Token.LESS_EQ);
    assert.equal(tokens[17].type, Token.PLUS_ASSIGN);
    assert.equal(tokens[18].type, Token.MINUS_ASSIGN);
    assert.equal(tokens[19].type, Token.DIV_ASSIGN);
    assert.equal(tokens[20].type, Token.MUL_ASSIGN);
    assert.equal(tokens[21].type, Token.NOT_EQUAL);
    assert.equal(tokens[22].type, Token.AND);
    assert.equal(tokens[23].type, Token.OR);
  });
});

describe('Whitespace', () => {
  it('Skips whitespace', () => {
    const tokens = scan('space tab\tnewline  end \t\n');
    ['space', 'tab', 'newline', 'end'].forEach((id, i) => {
      assert.equal(tokens[i].lexeme, id);
    });
  });
});
