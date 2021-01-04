## Syntax Grammar

```ebnf
program        → declaration* ;
```

### Declarations

```ebnf
declaration    → "var" IDENTIFIER ( "=" expression )? ";" ;
               | statement ;
```

### Statements

```ebnf
statement      → exprStmt
               | sleepStmt
               | ifStmt
               | returnStmt
               | whileStmt
               | block ;

exprStmt       → expression ";" ;
sleepStmt      → "sleep" expression ";" ;
ifStmt         → "if" "(" expression ")" statement
                 ( "else" statement )? ;
returnStmt     → "return" expression? ";" ;
whileStmt      → "while" "(" expression ")" statement ;
block          → "{" declaration* "}" ;
```

### Expressions

```ebnf
expression     → assignment ;

assignment     → IDENTIFIER "=" assignment
               | property "=" assignment
               | logic_or ;

logic_or       → logic_and ( "||" logic_and )* ;
logic_and      → equality ( "&&" equality )* ;
equality       → comparison ( ( "!=" | "==" ) comparison )* ;
comparison     → term ( ( ">" | ">=" | "<" | "<=" ) term )* ;
term           → factor ( ( "-" | "+" ) factor )* ;
factor         → unary ( ( "/" | "*" ) unary )* ;
unary          → ( "!" | "-" ) unary | call ;
call           → primary ( "(" arguments? ")" | "." IDENTIFIER )* ;
primary        → "true" | "false" | "null" | NUMBER | STRING
               | IDENTIFIER | property | lambda | "(" expression ")";
property       → "[" IDENTIFIER "]";
lambda         → "fun" "(" parameters? ")" block ;
```

### Helper Rules

```ebnf
parameters     → IDENTIFIER ( "," IDENTIFIER )* ;
arguments      → expression ( "," expression )* ;
```

## Lexical Grammar

```ebnf
NUMBER         → DIGIT+ ( "." DIGIT+ )? ;
STRING         → ( "'" <any char except "'">* "'" ) | ( "\"" <any char except "'">* "\"" ) ;
IDENTIFIER     → ALPHA ( ALPHA | DIGIT )* ;
ALPHA          → "a" ... "z" | "A" ... "Z" | "_" ;
DIGIT          → "0" ... "9" ;
```

