Dakka is a scripting language for describing spawning patterns for bullet hell games. It aims to be lightweight, flexible, unopinionated, reasonably fast, and easy to implement. Dakka is brand new and unstable. Feel free to check it out, use it, rewrite it, whatever, but expect bugs and breaking changes.

To see it in action check out the [live demo](https://jbpuryear.github.io/dakka/).

## Why Dakka?

Creating interesting patterns for bullet hells can be quite complex. We often want to do things like spawn a ring of bullets, have those bullets travel away from the center of the ring for 500 ms, stop the bullets, wait another 200 ms, have each bullet spawn their own ring of bullets that travel and stop, then at each of those bullet's location spawn 10 bullets 20 ms apart traveling at the original bullet's initial angle plus or minus 15 degrees. In the world of bullet hell games this example is actually pretty tame, but already we're looking at asynchronous execution, callbacks, passing parameters between objects, and recursion. A game can have hundreds of these little patterns, so it's super helpful to have a dedicated scripting language to help wrangle in the complexity and reduce iteration time.

I decided to create Dakka because I couldn't find a language out there that suited my needs. I found a couple abandoned projects, a couple languages that were pretty narrow in what they could do, and a couple awesome languages, Danmakufu and Danmokou, that turned out to be too opinionated and monolithic. Danmakufu and Danmokou are really cool and worth checking out, but they are focused on making one very specific type of game and they try to solve all of the problems that type of game entails. They're meant for frameworks that provide a bullet hell game and all its objects, and you use the scripting language to spawn bullets and move them around, but also to describe enemies and play music and set hp for bosses and everything else.

Dakka follows the Unix philosophy and is meant to handle just one small part of a game. At its heart all a Dakka script really does is set properties on an object, wait a while, and spawn more objects with their own scripts, but it turns out this is all we need to do some pretty amazing stuff.

## Installation

No surprises here. There's only the Javascript implementation of Dakka right now and it lives in the javascript directory. Dakka-js is written with ES6 modules, so just copy the source directory and import with whatever method you usually use.

`import Dakka from 'path-to-source/Dakka.js'`

## How It Works

The key concept in Dakka is the idea of associating a thread with an object on which that thread acts. In Dakka this is called the thread's target object. Every Dakka script is run in its own thread and every thread can optionally have a target object.

Already that's pretty dense. If that makes sense to you feel free to skip ahead, but I want to spend some time with this because it's really the core of Dakka. I'll say it a different way. When you run a Dakka script a new thread is started and that thread can be given a target object. In your scripts you get and set properties on the target object by putting the property name in brackets and using it the same way you would a variable. Where do target objects come from? When you create an instance of the Dakka runtime you pass in a factory function and the runtime will use that function to spawn target objects.

That's a lot, so let's do an example:
```
// Our Dakka script
fun goThenStop() {
  [speed] = 100;
  sleep 500;
  [speed] = 0;
}

while (true) {
  sleep 1000;
  spawn (goThenStop);
}
```
```
// Our Javascript
import Dakka from './src/Dakka.js';

function bulletFactory() {
  return new Bullet();
}

const dakka = new Dakka(bulletFactory);
dakka.run(dakkaScript);
```

Let's step through it. In our Javascript we create an instance of the Dakka runtime and pass in our bulletFactory function. The runtime holds onto this function and whenever it reaches a spawn statement it will call this function to create a new Bullet. We then run our Dakka script. In our Dakka script we declare the function goThenStop and then enter a while loop. The loop just repeatedly sleeps for a while and then executes a spawn statement, so I guess means it's time to talk about spawn statements.

Confession time. Spawn statements are kind of clunky. Dakka is tiny and simple and does a ton with only functions, numbers, and strings, but to keep it that way a lot was crammed into spawn statements. Here's what spawn statements do: they get a target object from the provided factory function, they set some properties on it, they start a new thread and assign the new object as its target, then they pass that thread a Dakka function to run, along with arguments for that function. I know, that's a lot to ask of one statement Not surprisingly the syntax is bulky and weird. The grammar for spawn statements is:
`"spawn" ( "[" (IDENTIFIER "=" expression ("," IDENTIFIER "=" expression)*)? "]" )? ( "(" expression ("," expression)* ")" )? ";"`
Yikes! Let's unpack that. Spawn statements have three parts, the keyword "spawn", an optional initializer for the target object, and an optional thread descriptor. The following are all valid spawn statements.

```
// Create a new thread running the function foo with arguments 2 and 'hi mom' and
// spawn a new target object for it.
spawn (foo, 2, 'hi mom');

// Spawn an object then set its x property to 100 and its y to 50, but don't start a
// new thread.
spawn [ x=100, y=50 ];

// Spawn a target object, set its properties, start a new thread running foo with some
// arguments and assign the target to the thread.
spawn [ x=100, y=50 ] (foo, 2, 'hi mom');

// Spawn a target object, don't start a thread, don't set any properties.
spawn;
```
While it is clunky having all this in one statement it solves a very important problem without creating any other language constructs. That problem is, how do you create a ring of bullets all traveling outward and all running the same script? We need to perform the same function on all the objects, but also set some of their properties to unique, per-object values. In Dakka we could technically do this with closures, but that involves writing a bunch of ugly and boring code.

Danmakufu solves this by having spawn _expressions_ that return the objects they create, so you can set properties on them before you pass them around to functions and threads. That's a totally reasonable solution, but I like Dakka's one-object-one-thread model. Dakka scripts can get a little lost in callback hell, but even so it's relatively easy to reason about the flow of execution. It also avoids any race conditions. Like, what happens in Danmakufu if you pass the same bullet to two different threads? Plus if we returned spawned objects to our scripts we'd have to implement some sort of object type and we'd probably want arrays to put them in and threads would probably have to get a lot more complicated. Eventually we'd have to make a whole real language!

Really all we want is to to define some initial state for the object, send it to a new thread, and forget about it. Spawn statements do just that, and honestly I think once you get used to their weird syntax they're kind of nice.

Now that we understand spawn statements we can finish with our example and step through the body of the goThenStop function. In Dakka, anything between brackets that looks like a variable name is interpreted to be a property on the target object, so all this function does is set the target object's speed to 100, wait for a while, then set the speed to 0.

Our example was super simple, but with spawning threads and objects, setting target properties, sleep statements, and the standard if, while, for control structures we already have everything we need to choreograph any sort of behaviour we want. Dakka is also lexically scoped and functions are first class, meaning we can pass them around and create closures, making Dakka super expressive.

We'll get into all this stuff in more detail when we go over the language itself, but for now the important thing to understand is the way Dakka combines threads, target objects, and functions to create intricate and coordinated behaviours from simple building blocks. At this point I recommend browsing through some of the [demos](https://jbpuryear.github.io/dakka/) to get a better idea of how it all works.

## What Dakka Doesn't Do

Dakka is super minimal. Spawning objects, setting properties, and sleeping is really all it does, but this is also part of its appeal. With Dakka you're not tied to using any particular objects or structures in your games and you can run Dakka scripts for spawning and controlling any objects you want. The tradeoff is that there are a few things that other languages/runtimes/frameworks provide that Dakka expects you to take care of yourself.

- Dakka doesn't know anything about target objects and their creation is up to you. Dakka will happily accept any object your factory function gives it and will try to set or get whatever properties you tell it to. However, Dakka will terminate a thread if it tries to get or set a property that doesn't exist or if it gets a value from a property that isn't a valid Dakka type.
- Dakka does not update its target objects! All it does is set properties, what you do with those properties is up to you and you are responsible for updating those objects in your game loop.
- Dakka doesn't update itself either! It's up to you to call the update method on the runtime instance and Dakka uses whatever you send this method for sleep statements. This gives you total control over the update cycle and lets you look deep withing yourself to answer the eternal question "Should I use frames or time deltas?" We'll go over this more when we describe sleep statmements.

## API

#### new Dakka(factory, getter, setter)

Creates an instance of the Dakka runtime. You can optionally pass in getter and setter functions which will be used when a target's property is set or accessed from within a Dakka script. The getter is given the target and property name as arguments, and the setter is given the target, property name, and a value.

### Properties

#### Dakka.debug

Because Dakka is meant to be used in games, it doesn't throw or display any errors by default and silently kills threads whenever something goes wrong. Set this to true to get Dakka to log errors to the console.

#### Dakka.events

Dakka uses [EventEmitter3](https://github.com/primus/EventEmitter3) to signal events. You can listen to events with `dakka.events.on('event-name', yourCallback, yourCallbackContext)`. See the EventEmitter3 docs for more. Dakka reports the following events:
- errored - This is fired whenever there is an error in a Dakka script. The callback is passed the thread's target object and an error message.
- spawned - This is fired whenever a script creates a new target object. The callback is passed the target object. This happens after the spawn statement sets the target's properties, but before a thread is started. You can use this for anything you need to do when an object is added to the world, like initialization, particle effects, or sounds.

#### Dakka.factory

The user supplied factory function Dakka uses to spawn target objects. You can change this whenever you like.

### Methods

#### static Dakka.compile(src)

Takes a Dakka script as a string, compiles and returns a Dakka script, but doesn't run it.

#### Dakka.addNative(name, val)

Adds or sets a variable in the global environment (see below) from outside your scripts. This lets you extend the Dakka language with native functions or pass values to your scripts during runtime. Effectively the same as `global name = val` from within a Dakka script. Val must be a valid Dakka type. Returns true on success.

#### Dakka.killAll()

Kills all running threads.

#### Dakka.killByTarget(target)

When passed a target object, will kill the thread acting on it if there is one. This is especially useful if you are pooling objects. Returns true if a thread was found, otherwise false.

#### Dakka.run(script, spawn = false, callback = null, ...args)

Starts a thread and runs the provided script, either a string or a precompiled Dakka script. If spawn is true a new target object will be created, if spawn is an object that object will become the thread's target. Defaults to false. Optionally you may provide a callback function that will be called when the script returns and is passed the script's return value. Args will be passed to the script and must match the scripts arity. (see script parameter statements)

## The Dakka Language

### Basic Design

The Dakka language is pretty standard, so I won't go into things to much here. Dakka is dynamically typed and lexically block scoped with a c like syntax. Scripts are compiled to bytecode and run on a stack based vm. Dakka has managed memory, or rather it doesn't need to manage memory because it doesn't have objects or buffers or arrays or anything so almost everything lives on the stack. Functions are first class, so closures are a thing. 

### The Global Environment

Every script is run in its own thread, which we went over already, but we should talk about thread scope. Every thread starts in its own scope, but similar to Lua every thread shares the same global environment. This is a plain old Javascript Map that all the threads share. We'll talk about this more when we get to variables, but, briefly, if you declare a global variable `global somevar = 'foo';` that variable will live in the global environment and be visible in all of your scripts. This is also where all of the Dakka standard functions live and anything you pass to Dakka.addNative from within your Javascript code. This is a good place to put functions that all of your scripts use.

### Errors

Dakka is meant to be used in games, so it would be pretty bad if it started throwing errors around and crashed everything. If a thread encounters an error it will quietly kill itself (Oh man, that sounds so sad!) and the runtime instance will emit an "errored" event, passing along the thread's target object and an error message. See the API.

### Data Types

- Booleans - The usual `true` and `false`.
- Null - Written `null`. This is the default return value of functions and scripts without return statements.
- Numbers - All numbers are double-precision floating point. Decimal numbers must have at least one digit to the left of the decimal point, `0.2` is a valid number, but `.2` is not. You can also write hex integers with the 0x prefix, like `var tint = 0xff26c8;`. Both upper and lowercase letters are allowed in hex numbers.
- Strings - Dakka has very basic strings. Everything between a matching pair of single or double quotes is a string. There are no escape characters or interpolation and Dakka doesn't provide any string operations, although you can provide your own by adding native functions. Strings are really only included in the language so you can set string values on target object properties.
- Functions - Functions are data types and can be assigned to variables and passed around. The keyword `fun` denotes a function literal, just like function expressions in Javascript, so statements like `var someVar = fun() { ... };` are valid. You can also declare functions using function statements (see below).

### Expressions

You know what these are, so I won't waste time going over them individually. The only thing is, assignment is an expression, so things like `a = b = c = 2` and `while (a = getNextVal());` are valid.

| Precedence | Operator | Decription |
| :-: | :-: | :-: |
| 1 | ( ) | Grouping |
| 2 | ( ) | Function Call |
| 3 | ! - | Not, Negation |
| 4 | * / % | Multiplication, Division, Remainder |
| 5 | + - | Addition, Subtraction |
| 6 | < > <= >= | Less Than, Greater Than, Less Or Equal, Greater Or Equal |
| 7 | == != | Equal, Not Equal |
| 8 | && | Logical And |
| 9 | \|\| | Logical Or |
| 10 | ?: | Ternary |
| 11 | += -+ *= /= %= | Assignment |

### Statements

#### Script Parameters

Scripts are compiled down to regular old Dakka functions and therefore can optionally have parameters and accept arguments. To declare parameters for a script, use the keyword `args` followed by a comma seperated list of identifiers. A script can only have one parameter declaration and it must be the first statement of the script.

```
// Example of a script that has parameters.
args a, b;

return a + b;
```

When running a script with parameters you must pass in the appropriate number of arguments when calling Dakka.run.

#### Variable Declaration

Dakka has seperate syntax for declaring global and local variables.

```
var local = 'foo';
global gblVar = 'bar';
```
As stated earlier, global variables live in the global environment and are visible to all scripts. Variables have lexical scoping with the usual shadowing rules. Declaring a variable twice in the same scope, or declaring a global twice anywhere results in an error, as does trying to access an undefined variable. Variables declared without an initializer will be initialized to null.

#### Control Structures

Dakka has the usual if else and while statements that I'm sure you're familiar with. They're just like c or Javascipt, so we'll skip those. For loops in Dakka are idiosyncratic and similar to for loops in Lua. The look like this:
```
for (var i = inital, end, step) {
  // Do something...
}
```
For statements must have a variable declaration of the form `var name = expression`. This is the loop variable. It is created for each iteration of the loop so that it is unique for any closures declared within the loop. Each iteration the the loop variable is increased or decreased by step and the loop is run until the loop variable is greater than the value of end if step is positive or less than end if step is negative. The step is optional and defaults to 1. Any expressions in the for loop initializer that evaluate to something other than a number is an error, as is a step with a value of 0.
```
for (var i = 1, 5);
// 1 2 3 4 5

for (var j = 0, 0.3, 0.1);
// 0 0.1 0.2 0.3

var step = 120;
for (var angle = step, 360, step);
// 120 240 360

for (var k = 1, -2, -1);
// 1 0 -1 -2

for (var l = 'foo', 10);
// error

for (var m = 1, 10, 0);
// error
```
Dakka also provides a simple `repeat` loop.
```
repeat (100) someFunction();

repeat (100) {
  doSomething();
  sleep 100;
}
```

#### Functions

In addition to function expressions, Dakka has function statements which have the form:
```
fun name(arg1, arg2...) {
  // Function body
}
```
These are for convenience and are really just syntactic sugar for the statement:
```
var name = fun(arg1, arg2...) {
  // Function body
}
```

#### Sleep

``` 
sleep 10;
sleep someFunction() + 20;
```
The sleep statement set a timer on the thread and pauses execution until the timer is equal to or less than 0. Dakka doesn't update these timers though, they are updated when you call the update method on the runtime instance. Whatever value you pass to the method is subtracted from all of the sleeping threads' timers and if the timer hits 0 execution continues.

#### Thread
```
thread (someFunction, arg1, arg2...);
```
The thread statement is the keyword `thread` followed by parentheses containing an expression that evaluates to a function and an optional list of arguments to pass to that function. This starts a new thread running the provided function. This is a statement, not an expression, so nothing is returned. There's no thread object you can await or anything. Threads in Dakka are fire and forget. The function you pass the thread retains the context in which it was declared, i.e. it's a closure, so threads can communicate with each other by setting variables in the enclosing scope or the global environment.

#### Spawn
```
// Create a new thread running the function foo with arguments 2 and 'hi mom' and
// spawn a new target object for it.
spawn (foo, 2, 'hi mom');

// Spawn an object then set its x property to 100 and its y to 50, but don't start a
// new thread.
spawn [ x=100, y=50 ];

// Spawn a target object, set its properties, start a new thread running foo with some
// arguments and assign the target to the thread.
spawn [ x=100, y=50 ] (foo, 2, 'hi mom');

// Spawn a target object, don't start a thread, don't set any properties.
spawn;
```
Spawn does the same thing the thread statement does, but also spawns a new target object and optionally sets some properties on that object. These properties are set and the runtime fires a 'spawned' event before the new thread starts execution.

#### Return
```
return someVal;
return;
```
Returns a value from a function. Scripts are run exactly as if the were functions, and if returning from the top level of a script this value will be passed to the callback provided to Dakka.run if there was one. Scripts and functions without return statements return null.


#### Built Ins

| Constants |
| :-- |
| PI |
| TAU |
| SQRT2 |


| Functions |
| :-- |
| sin(rad) |
| cos(rad) |
| tan(rad) |
| asin(rad) |
| acos(rad) |
| atan(rad) |
| atan2(y, x) |
| abs(num) | 
| ceil(num) |
| floor(num) |
| min(num, num) |
| max(num, num) |
| rand() |
| round(num) |
| sign(num) |
| sqrt(num) |
| time() |
