import CodeMirror from 'codemirror';
import simpleMode from 'codemirror/addon/mode/simple.js';
import js from 'codemirror/mode/javascript/javascript.js';
import Phaser from 'phaser';
import Dakka from '../../javascript/src/Dakka.js';
import EventEmitter from 'eventemitter3';
import List from '../../javascript/src/List.js';
import circle from './circle.png';
import Split from 'split.js';

Split(['#editor-pane', '#game-pane'], { sizes: [30, 70] });
Split(['#game', '#errors'], { sizes: [90, 10], direction: 'vertical' });

CodeMirror.defineSimpleMode("dakka", {
    // The start state contains the rules that are intially used
  start: [
    {regex: /'/, token: "string", next: "sqstring"},
    {regex: /"/, token: "string", next: "dqstring"},
    {regex: /(?:if|else|while|for|repeat|fun|return|sleep|spawn|thread)\b/, token: "keyword"},
    {regex: /(?:var|global)\b/, token: "keyword"},
    {regex: /true|false|null/, token: "atom"},
    {regex: /\d+\.?\d*/, token: "number"},
    {regex: /\/\/.*/, token: "comment"},
    {regex: /[-+\/=*<>!%]+/, token: "operator"},
    {regex: /[\{\[\(]/, indent: true},
    {regex: /[\}\]\)]/, dedent: true},
    {regex: /[a-z$][\w$]*/, token: "variable"},
  ],

  sqstring: [
    {regex: /.*?'/, token: "string", next: "start"},
    {regex: /.*/, token: "string"},
  ],

  dqstring: [
    {regex: /.*?"/, token: "string", next: "start"},
    {regex: /.*/, token: "string"},
  ],

  meta: {
    dontIndentStates: ["sqstring", "dqstring"],
    lineComment: "//",
    electricChars: "]})",
  }
});

const editor = CodeMirror(document.getElementById('editor'), {
  extraKeys: {
    "Tab": function (cm) {
      cm.replaceSelection("  " , "end");
    },
  },
  lineNumbers: true,
  theme: 'darcula',
  mode: 'dakka',
});

class Bullet {
  constructor(spriteBob) {
    this._sprite = spriteBob;
    this._vx = 0;
    this._vy = 0;
    this._speed = 0;
    this._angle = 0;
    this._dirty = false;
    this._prev = null;           // For list insertion
    this._next = null;
  }

  kill() {
    this._sprite.visible = false;
  }

  reset() {
    this._sprite.x = 0;
    this._sprite.y = 0;
    this.speed = 0;
    this.angle = 0;
    this._sprite.visible = true;
  }

  get speed() { return this._speed; }
  set speed(val) {
    if (this._speed !== val) {
      this._speed = val;
      this._dirty = true;
    }
  }

  get angle() { return this._angle; }
  set angle(val) {
    if (this._angle !== val) {
      this._angle = val;
      this._dirty = true;
    }
  }

  get x() { return this._sprite.x; }
  set x(val) {
    this._sprite.x = val;
  }

  get y() { return this._sprite.y; }
  set y(val) {
    this._sprite.y = val;
  }

  updateVelocity() {
    const angle = Math.PI * this._angle / 180;
    this._vx = this._speed * Math.cos(angle);
    this._vy = this._speed * Math.sin(angle);
    this._dirty = false;
  }

  update(dt) {
    const sec = dt / 1000;
    if (this._dirty) {
      this.updateVelocity();
    }
    this._sprite.x += this._vx * sec;
    this._sprite.y += this._vy * sec;
  }
}

const BULLET_POOL_SIZE = 100000;
class BulletManager {
  constructor(scene, key) {
    this.events = new EventEmitter();
    this.bounds = {
      x: scene.game.scale.gameSize.width,
      y: scene.game.scale.gameSize.height
    };

    this.deadBullets = [];
    this.liveBullets = new List();

    this.bulletSprites = scene.make.blitter({ key: key });
    //This next part is a hack to fix bobs not using the correct origin.
    let t = scene.game.textures.get(key).get(0);
    this.bulletSprites.x -= t.width/2;
    this.bulletSprites.y -= t.height/2;

    this.count = 0;
  }

  update(dt) {
    let b = this.liveBullets.head;
    while(b) {
      let next = b.next;
      b.update(dt);
      if (b.x < 0 || b.x > this.bounds.x || b.y < 0 || b.y > this.bounds.y) {
        this.killBullet(b, false);
      }
      b = next;
    }
  }

  spawn() {
    let b = this.deadBullets.pop()
    if (!b) {
      if (this.count === BULLET_POOL_SIZE) {
        b = this.liveBullets.pop()
      } else {
        let sprite = this.bulletSprites.create(0, 0);
        b = new Bullet(sprite);
        this.count += 1;
      }
    }
    b.reset();
    this.liveBullets.shift(b);
    return b;
  }

  killBullet(b) {
    b.kill();
    this.liveBullets.remove(b);
    this.deadBullets.push(b);
    this.events.emit('killed', b);
  }

  killAll() {
    let b = this.liveBullets.head;
    while(b) {
      let next = b.next;
      this.killBullet(b, false);
      b = next;
    }
  }
}


class Scene extends Phaser.Scene {
  preload() {
    this.load.image('circle', circle);
  }

  create() {
    const bullets = new BulletManager(this, 'circle');
    this.bullets = bullets;

    const dakka = new Dakka(() => {
      return bullets.spawn();
    });
    dakka.events.on('errored', logError);
    this.dakka = dakka;


    bullets.events.on('killed', (bullet) => {
      dakka.killByTarget(bullet);
    });

    this.dakka.events.on('errored', function (bullet, msg) {
      if (bullet) {
        this.bullets.killBullet(bullet);
      }
      console.error(msg);
    }, this);
    this.fps = this.add.text(32, 32, '', { color: '#0F0' });
  }

  update(_, dt) {
    this.dakka.update(dt);
    this.bullets.update(dt);
    this.fps.text = this.game.loop.actualFps.toFixed(2);
  }
}
const scene = new Scene();

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  fps: { target: 120 },
  audio: { noAudio: true },
  input: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: document.getElementById('game'),
  },
  scene: scene,
});

const examples = {
  simple:
`for (var i = 0, 500) {
  for (var j = 0, 360, 20) {
    var rad = TAU * i / 360;
    spawn[ x=500+cos(rad)*200, y=400+sin(rad)*200, speed=100, angle=j+i*12 ];
    spawn[ x=500+cos(rad+PI)*200, y=400+sin(rad+PI)*200, speed=100, angle=j+i*12 ];
  }
  sleep 16;
}`,
  threads:
`fun f() {
  for (var i = 1, 50) {
    for (var j = 40, 360, 40) {
      spawn[ x=500, y=400, speed=50+i*5, angle=j+i*6 ];
    }
    sleep 100;
  }
}

fun g() {
  for (var i = 1, 20) {
    for (var j = 20, 360, 20) {
      spawn[ x=500, y=400, speed=100, angle=j+i*12 ];
    }
    sleep 200;
  }
}

thread(f);
sleep 1000;
thread(g);`,
  callbacks: `fun circle(x, y, count, speed, script) {
  if (script) {
    for (var i = 0, count) {
      spawn [ x=x, y=y, speed=speed, angle=i* 360 / count ] (script);
    }
  } else {
    for (var i = 0, count) {
      spawn [ x=x, y=y, speed=speed, angle=i*360/count ];
    }
  }
}

fun steer() {
  repeat(30) {
    sleep 16;
    [angle] += 4;
  }
  var oldS = [speed];
  [speed] = 40;
  sleep 500;
  [speed] = oldS;
  circle([x], [y], 16, 240, fun() {
    sleep 1000;
    var oldS = [speed];
    [speed] = 40;
    sleep 800;
    [speed] = oldS;
    circle([x], [y], 8, 100, null);
  });
}

circle(500, 400, 32, 360, steer);`,
  readme: `fun circle(x, y, count, speed, script) {
  if (script) {
    for (var i = 0, count) {
      spawn [ x=x, y=y, speed=speed,
        angle=i* 360 / count ] (script);
    }
  } else {
    for (var i = 0, count) {
      spawn [ x=x, y=y, speed=speed,
        angle=i*360/count ];
    }
  }
}

fun waitThenStop(before, after) {
  sleep before;
  [speed] = 0;
  sleep after;
}

circle(512, 380, 100, 1000, fun() {
  waitThenStop(250, 400);
  circle([x], [y], 7, 500, fun() {
    waitThenStop(200, 500);
    for (var i = 1, 10) {
      spawn [ x=[x], y=[y], speed=400,
        angle=[angle] + rand() * 30 - 15 ];
      sleep 20;
    }
  });
});`,
}

const list = document.getElementById('examples');
list.addEventListener('change', function(val) {
  editor.setValue(examples[this.value] || '');
  this.selectedIndex = 0;
});

let errs = [];
const messageBox = document.getElementById('msg');
function logError(_, msg) {
  errs.push(msg);
}

document.getElementById('run').addEventListener('click', () => {
  scene.dakka.killAll();
  scene.bullets.killAll();
  errs = [];
  scene.dakka.run(editor.getValue());
  messageBox.textContent = errs.join('\n');
});

const helpModal = document.getElementById('help-modal');
const help = document.getElementById('help');
function toggleHelp() {
  const mode = helpModal.style.display === 'block' ? 'none' : 'block';
  helpModal.style.display = mode;
  help.textContent = mode === 'block' ? '⨯' : '?';
}
help.addEventListener('click', toggleHelp);
