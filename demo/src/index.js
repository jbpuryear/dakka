import CodeMirror from 'codemirror';
import Phaser from 'phaser';
import Dakka from '../../javascript/src/Dakka.js';
import EventEmitter from 'eventemitter3';
import List from '../../javascript/src/List.js';
import circle from './circle.png';

const editor = CodeMirror(document.getElementById('editor'), {
  lineNumbers: true,
  theme: 'darcula',
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

  get angle() { return this._sprite.angle; }
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
  }

  update(_, dt) {
    this.dakka.update(dt);
    this.bullets.update(dt);
  }
}
const scene = new Scene();

const game = new Phaser.Game({
  type: Phaser.WEBGL,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    parent: document.getElementById('game-pane'),
  },
  scene: scene,
});

document.getElementById('run').addEventListener('click', () => {
  scene.dakka.killAll();
  scene.bullets.killAll();
  scene.dakka.run(editor.getValue());
});
