class Game {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.ui = {
      hpFill: document.getElementById('hpFill'),
      xpFill: document.getElementById('xpFill'),
      hpText: document.getElementById('hpText'),
      lvlText: document.getElementById('lvlText'),
      goldText: document.getElementById('goldText'),
      messageBox: document.getElementById('messageBox'),
      startScreen: document.getElementById('startScreen'),
      pauseScreen: document.getElementById('pauseScreen'),
      gameOverScreen: document.getElementById('gameOverScreen'),
      shopScreen: document.getElementById('shopScreen'),
      finalStats: document.getElementById('finalStats'),
      startBtn: document.getElementById('startBtn'),
      restartBtn: document.getElementById('restartBtn'),
      resumeBtn: document.getElementById('resumeBtn'),
      closeShopBtn: document.getElementById('closeShopBtn'),
    };

    this.state = {
      running: false,
      paused: false,
      gameOver: false,
      lastTime: 0,
      time: 0,
      score: 0,
      level: 1,
      xp: 0,
      xpToNext: 10,
      gold: 0,
      spawnTimer: 0.8,
    };

    this.input = {
      up: false,
      down: false,
      left: false,
      right: false,
    };

    this.player = null;
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];

    this.bindEvents();
    this.resetGame();
    this.updateHUD();
    requestAnimationFrame((time) => this.loop(time));
  }

  bindEvents() {
    window.addEventListener('keydown', (event) => {
      const code = event.code;

      if (code === 'KeyP') {
        if (this.state.running && !this.state.gameOver) {
          this.togglePause();
        }
        return;
      }

      if (code === 'Space') {
        if (this.state.running && !this.state.paused && !this.state.gameOver) {
          this.player.dash();
        }
        return;
      }

      if (code === 'KeyF') {
        if (this.state.running && !this.state.gameOver) {
          this.toggleShop();
        }
        return;
      }

      if (['KeyW', 'ArrowUp'].includes(code)) this.input.up = true;
      if (['KeyS', 'ArrowDown'].includes(code)) this.input.down = true;
      if (['KeyA', 'ArrowLeft'].includes(code)) this.input.left = true;
      if (['KeyD', 'ArrowRight'].includes(code)) this.input.right = true;
    });

    window.addEventListener('keyup', (event) => {
      const code = event.code;
      if (['KeyW', 'ArrowUp'].includes(code)) this.input.up = false;
      if (['KeyS', 'ArrowDown'].includes(code)) this.input.down = false;
      if (['KeyA', 'ArrowLeft'].includes(code)) this.input.left = false;
      if (['KeyD', 'ArrowRight'].includes(code)) this.input.right = false;
    });

    this.ui.startBtn.addEventListener('click', () => this.startGame());
    this.ui.restartBtn.addEventListener('click', () => this.restartGame());
    this.ui.resumeBtn.addEventListener('click', () => this.togglePause());
    this.ui.closeShopBtn.addEventListener('click', () => this.toggleShop(false));

    document.querySelectorAll('.shop-item').forEach((button) => {
      button.addEventListener('click', () => {
        const upgrade = button.dataset.upgrade;
        this.buyUpgrade(upgrade);
      });
    });
  }

  startGame() {
    this.state.running = true;
    this.state.paused = false;
    this.state.gameOver = false;
    this.ui.startScreen.classList.add('hidden');
    this.ui.pauseScreen.classList.add('hidden');
    this.ui.gameOverScreen.classList.add('hidden');
    this.ui.shopScreen.classList.add('hidden');
    this.showMessage('¡A la Grieta!');
  }

  restartGame() {
    this.resetGame();
    this.startGame();
  }

  resetGame() {
    this.player = new Player(this.canvas.width / 2, this.canvas.height / 2, 18);
    this.enemies = [];
    this.projectiles = [];
    this.effects = [];

    this.state.running = false;
    this.state.paused = false;
    this.state.gameOver = false;
    this.state.lastTime = 0;
    this.state.time = 0;
    this.state.score = 0;
    this.state.level = 1;
    this.state.xp = 0;
    this.state.xpToNext = 10;
    this.state.gold = 0;
    this.state.spawnTimer = 0.8;

    this.ui.startScreen.classList.remove('hidden');
    this.ui.pauseScreen.classList.add('hidden');
    this.ui.gameOverScreen.classList.add('hidden');
    this.ui.shopScreen.classList.add('hidden');
    this.updateHUD();
  }

  togglePause(force = null) {
    if (!this.state.running || this.state.gameOver) return;

    if (force === null) {
      this.state.paused = !this.state.paused;
    } else {
      this.state.paused = force;
    }

    this.ui.pauseScreen.classList.toggle('hidden', !this.state.paused);
  }

  toggleShop(force = null) {
    if (!this.state.running || this.state.gameOver) return;

    const shouldOpen = force === null ? !this.ui.shopScreen.classList.contains('hidden') : force;

    if (shouldOpen) {
      this.state.paused = true;
      this.ui.shopScreen.classList.remove('hidden');
      this.ui.pauseScreen.classList.add('hidden');
    } else {
      this.state.paused = false;
      this.ui.shopScreen.classList.add('hidden');
    }
  }

  buyUpgrade(type) {
    if (this.state.gold < 25) {
      this.showMessage('Necesitas más oro');
      return;
    }

    this.state.gold -= 25;

    switch (type) {
      case 'damage':
        this.player.damage *= 1.1;
        break;
      case 'speed':
        this.player.speed *= 1.1;
        break;
      case 'hp':
        this.player.maxHp += 15;
        this.player.hp = this.player.maxHp;
        break;
      case 'crit':
        this.player.critChance = Math.min(0.6, this.player.critChance + 0.05);
        break;
      default:
        break;
    }

    this.updateHUD();
    this.showMessage('Mejora comprada');
  }

  addXP(amount) {
    this.state.xp += amount;

    while (this.state.xp >= this.state.xpToNext) {
      this.state.xp -= this.state.xpToNext;
      this.state.level += 1;
      this.state.xpToNext = Math.ceil(this.state.xpToNext * 1.35);
      this.player.maxHp += 8;
      this.player.hp = this.player.maxHp;
      this.showMessage('LEVEL UP');
    }

    this.updateHUD();
  }

  showMessage(text) {
    const box = this.ui.messageBox;
    box.textContent = text;
    box.classList.remove('hidden');
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => {
      box.classList.add('hidden');
    }, 1200);
  }

  updateHUD() {
    const hpRatio = this.player.hp / this.player.maxHp;
    this.ui.hpFill.style.width = `${Math.max(0, hpRatio * 100)}%`;
    this.ui.hpText.textContent = `${Math.ceil(this.player.hp)} / ${this.player.maxHp}`;

    const xpRatio = (this.state.xp / this.state.xpToNext) * 100;
    this.ui.xpFill.style.width = `${Math.min(100, Math.max(0, xpRatio))}%`;
    this.ui.lvlText.textContent = `LVL ${this.state.level}`;
    this.ui.goldText.textContent = String(this.state.gold);
  }

  spawnEnemy() {
    const halfW = this.canvas.width / 2;
    const halfH = this.canvas.height / 2;
    const edge = Math.floor(Math.random() * 4);

    let x = 0;
    let y = 0;

    if (edge === 0) {
      x = Math.random() * this.canvas.width;
      y = -30;
    } else if (edge === 1) {
      x = this.canvas.width + 30;
      y = Math.random() * this.canvas.height;
    } else if (edge === 2) {
      x = Math.random() * this.canvas.width;
      y = this.canvas.height + 30;
    } else {
      x = -30;
      y = Math.random() * this.canvas.height;
    }

    const enemy = {
      x,
      y,
      radius: 14 + Math.random() * 12,
      hp: 22 + this.state.level * 4,
      maxHp: 22 + this.state.level * 4,
      speed: 45 + this.state.level * 6,
      color: '#ff7b7b',
    };

    this.enemies.push(enemy);
  }

  shootProjectile() {
    const player = this.player;
    const projectiles = this.projectiles;

    const angle = Math.atan2(player.dirY, player.dirX || 1);
    projectiles.push({
      x: player.x,
      y: player.y,
      radius: 5,
      vx: Math.cos(angle) * 420,
      vy: Math.sin(angle) * 420,
      damage: player.damage,
      life: 1.1,
      color: player.critChance > 0.2 ? '#8fe7ff' : '#f5cc70',
    });
  }

  update(dt) {
    if (!this.state.running || this.state.paused || this.state.gameOver) {
      return;
    }

    this.state.time += dt;
    this.player.update(this.input, dt, this.canvas.width, this.canvas.height);

    this.state.spawnTimer -= dt;
    if (this.state.spawnTimer <= 0) {
      this.spawnEnemy();
      this.state.spawnTimer = Math.max(0.45, 0.9 - this.state.level * 0.04);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const bullet = this.projectiles[i];
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;

      if (
        bullet.life <= 0 ||
        bullet.x < -40 ||
        bullet.y < -40 ||
        bullet.x > this.canvas.width + 40 ||
        bullet.y > this.canvas.height + 40
      ) {
        this.projectiles.splice(i, 1);
        continue;
      }

      for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        const dx = bullet.x - enemy.x;
        const dy = bullet.y - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist < bullet.radius + enemy.radius) {
          const crit = Math.random() < this.player.critChance;
          const damage = crit ? bullet.damage * 2 : bullet.damage;
          enemy.hp -= damage;
          this.projectiles.splice(i, 1);

          if (enemy.hp <= 0) {
            this.enemies.splice(j, 1);
            this.state.gold += 5;
            this.addXP(8);
            this.effects.push({
              x: enemy.x,
              y: enemy.y,
              r: 22,
              life: 0.35,
              color: '#ffd36a',
            });
          }

          if (crit) {
            this.showMessage('CRÍTICO');
          }
          break;
        }
      }
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.hypot(dx, dy) || 1;

      enemy.x += (dx / dist) * enemy.speed * dt;
      enemy.y += (dy / dist) * enemy.speed * dt;

      if (dist < this.player.radius + enemy.radius) {
        this.player.hp -= 18 * dt;
        if (this.player.hp <= 0) {
          this.player.hp = 0;
          this.endGame();
          return;
        }
      }
    }

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const fx = this.effects[i];
      fx.life -= dt;
      if (fx.life <= 0) this.effects.splice(i, 1);
    }

    this.updateHUD();
  }

  endGame() {
    this.state.running = false;
    this.state.gameOver = true;
    this.ui.finalStats.textContent = `Puntuación: ${this.state.gold} oro · Nivel ${this.state.level}`;
    this.ui.gameOverScreen.classList.remove('hidden');
  }

  drawBackground() {
    this.ctx.fillStyle = '#071019';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = 0; i < 40; i++) {
      this.ctx.fillStyle = `rgba(255,255,255,${0.03 + ((i % 7) * 0.01)})`;
      this.ctx.fillRect(i * 34, 0, 1, this.canvas.height);
      this.ctx.fillRect(0, i * 22, this.canvas.width, 1);
    }
  }

  drawPlayer() {
    const p = this.player;

    this.ctx.save();
    this.ctx.translate(p.x, p.y);

    this.ctx.fillStyle = '#70e5d1';
    this.ctx.beginPath();
    this.ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.strokeStyle = '#f5cc70';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(0, 0);
    this.ctx.lineTo(p.dirX * 24, p.dirY * 24);
    this.ctx.stroke();

    this.ctx.restore();
  }

  drawEnemies() {
    for (const enemy of this.enemies) {
      this.ctx.fillStyle = '#ff7b7b';
      this.ctx.beginPath();
      this.ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      this.ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2, 5);
      this.ctx.fillStyle = '#69f0b2';
      this.ctx.fillRect(enemy.x - enemy.radius, enemy.y - enemy.radius - 10, (enemy.hp / enemy.maxHp) * enemy.radius * 2, 5);
    }
  }

  drawProjectiles() {
    for (const bullet of this.projectiles) {
      this.ctx.fillStyle = bullet.color;
      this.ctx.beginPath();
      this.ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawEffects() {
    for (const fx of this.effects) {
      this.ctx.beginPath();
      this.ctx.fillStyle = `rgba(255, 211, 106, ${fx.life / 0.35})`;
      this.ctx.arc(fx.x, fx.y, fx.r * (1 - fx.life / 0.35), 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  draw() {
    this.drawBackground();
    this.drawProjectiles();
    this.drawEnemies();
    this.drawEffects();
    this.drawPlayer();
  }

  loop(timestamp) {
    if (!this.state.lastTime) this.state.lastTime = timestamp;

    const dt = Math.min((timestamp - this.state.lastTime) / 1000, 0.033);
    this.state.lastTime = timestamp;

    if (this.state.running && !this.state.paused && !this.state.gameOver) {
      this.update(dt);
    }

    this.draw();
    requestAnimationFrame((t) => this.loop(t));
  }
}

class Player {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.speed = 200;
    this.damage = 14;
    this.critChance = 0.15;
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.dirX = 1;
    this.dirY = 0;
    this.fireTimer = 0;
    this.dashCooldown = 0;
  }

  update(input, dt, maxW, maxH) {
    let moveX = 0;
    let moveY = 0;

    if (input.left) moveX -= 1;
    if (input.right) moveX += 1;
    if (input.up) moveY -= 1;
    if (input.down) moveY += 1;

    const mag = Math.hypot(moveX, moveY) || 1;
    moveX /= mag;
    moveY /= mag;

    if (moveX !== 0 || moveY !== 0) {
      this.dirX = moveX;
      this.dirY = moveY;
    }

    this.x += moveX * this.speed * dt;
    this.y += moveY * this.speed * dt;

    this.x = Math.max(this.radius, Math.min(maxW - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(maxH - this.radius, this.y));

    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.fireTimer -= dt;

    if (this.fireTimer <= 0) {
      const game = window.__game;
      game.shootProjectile();
      this.fireTimer = 0.22;
    }
  }

  dash() {
    if (this.dashCooldown > 0) return;

    this.dashCooldown = 2.3;
    const game = window.__game;
    this.x += this.dirX * 90;
    this.y += this.dirY * 90;
    this.x = Math.max(this.radius, Math.min(game.canvas.width - this.radius, this.x));
    this.y = Math.max(this.radius, Math.min(game.canvas.height - this.radius, this.y));
    game.showMessage('DASH!');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.__game = new Game();
});
