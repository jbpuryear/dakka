import assert from 'assert';
import scan from '../src/scan.js';
import KEYWORDS from '../src/KEYWORDS.js';
import TOKENS from '../src/TOKENS.js';

describe('Identifiers', () => {
  it('Recognizes valid names', () => {
    const lexemes = ['foo', '_foo', 'foo123', 'f1o2o3', '_', '_123',
      'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'];
    const tokens = scan(lexemes.join(' '));

    for (let i = 0; i < lexemes.length; i += 1) {
      const token = tokens[i];
      const lexeme = lexemes[i];
      assert.equal(token.type, TOKENS.IDENTIFIER);
      assert.equal(token.lexeme, lexeme);
      assert.equal(token.literal, null);
    }
  });

  it('Recognizes keywords', () => {
    const lexemes = ['var', 'loop', 'while', 'true', 'if'];
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
      assert.equal(token.type, TOKENS.NUMBER);
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
    assert.equal(tokens[0].type, TOKENS.L_PAREN);
    assert.equal(tokens[1].type, TOKENS.R_PAREN);
    assert.equal(tokens[2].type, TOKENS.MINUS);
    assert.equal(tokens[3].type, TOKENS.PLUS);
    assert.equal(tokens[4].type, TOKENS.MUL);
    assert.equal(tokens[5].type, TOKENS.DIV);
    assert.equal(tokens[6].type, TOKENS.COMMA);
    assert.equal(tokens[7].type, TOKENS.ASSIGN);
    assert.equal(tokens[8].type, TOKENS.L_BRACE);
    assert.equal(tokens[9].type, TOKENS.R_BRACE);
    assert.equal(tokens[10].type, TOKENS.SEMI);
    assert.equal(tokens[11].type, TOKENS.NOT);
    assert.equal(tokens[12].type, TOKENS.GREATER);
    assert.equal(tokens[13].type, TOKENS.LESS);
    assert.equal(tokens[14].type, TOKENS.EQUAL);
    assert.equal(tokens[15].type, TOKENS.GREATER_EQ);
    assert.equal(tokens[16].type, TOKENS.LESS_EQ);
    assert.equal(tokens[17].type, TOKENS.PLUS_ASSIGN);
    assert.equal(tokens[18].type, TOKENS.MINUS_ASSIGN);
    assert.equal(tokens[19].type, TOKENS.DIV_ASSIGN);
    assert.equal(tokens[20].type, TOKENS.MUL_ASSIGN);
    assert.equal(tokens[21].type, TOKENS.NOT_EQUAL);
    assert.equal(tokens[22].type, TOKENS.AND);
    assert.equal(tokens[23].type, TOKENS.OR);
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
