// src/scenes/GameScene.js
import Phaser from "phaser";
import Player from "../objects/Player";
import { CONSTS } from "../consts";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("game");
  }

  init() {
    this.isGameOver = false;
    this.isPaused = false;
    this.score = 0;
    
    // Difficulty Vars
    this.enemySpeed = CONSTS.ENEMY.kV_START;
    this.spawnDelay = CONSTS.ENEMY.SPAWN_DELAY_START;

    this.touch = { up: false, down: false, left: false, right: false, dash: false };
    this.highScore = parseInt(localStorage.getItem('high_score')) || 0;
  }

  create() {
    this.cameras.main.fadeIn(300);

    // --- AUDIO ---
    // Music logic simplified because MainMenu handled the "unlock" click
    this.music = this.sound.add("music", { volume: 0.5, loop: true });
    if (!this.sound.locked) this.music.play();
    else this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.music.play());

    this.setupMuteToggle();

    // --- TEXTURES ---
    this.createTextures();

    // --- ENTITIES ---
    this.player = new Player(this, 400, 300);

    // --- GROUPS ---
    this.enemies = this.physics.add.group();
    this.orbs = this.physics.add.group();

    // Collisions
    this.physics.add.overlap(this.player, this.enemies, this.handleDeath, null, this);
    this.physics.add.overlap(this.player, this.orbs, this.collectOrb, null, this);

    // --- INPUT ---
    this.cursors = this.input.keyboard.createCursorKeys();
    // Add WASD keys
    this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D
    });
    // Merge WASD into cursors for the player object
    this.cursors.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.bindTouchControls();

    // --- UI ---
    this.scoreText = this.add.text(16, 16, "SCORE 0", {
      fontFamily: '"Press Start 2P"', fontSize: "16px", color: "#00ffff",
    });
    this.highScoreText = this.add.text(16, 40, `BEST ${this.highScore}`, {
        fontFamily: '"Press Start 2P"', fontSize: "12px", color: "#ff00de",
    });
    this.centerText = this.add.text(400, 300, "", {
        fontFamily: '"Press Start 2P"', fontSize: "24px", align: "center", lineSpacing: 10, color: "#ffffff",
    }).setOrigin(0.5).setDepth(20);

    // --- TIMERS ---
    this.setupTimers();
  }

  update() {
    if (this.isGameOver) {
        if (Phaser.Input.Keyboard.JustDown(this.rKey)) this.scene.restart();
        // Allow tap to restart
        if (this.input.activePointer.isDown) this.scene.restart();
        return;
    }
    
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) this.togglePause();
    if (this.isPaused) return;

    // Combine Arrow keys + WASD
    const inputState = {
        up: this.cursors.up.isDown || this.wasd.up.isDown,
        down: this.cursors.down.isDown || this.wasd.down.isDown,
        left: this.cursors.left.isDown || this.wasd.left.isDown,
        right: this.cursors.right.isDown || this.wasd.right.isDown,
        space: this.cursors.space 
    };

    if (this.player) {
        this.player.update(inputState, this.touch);
    }

    // Seeker Logic: Steer seekers towards player
    this.enemies.getChildren().forEach(enemy => {
        if (enemy.getData('type') === 'seeker') {
            this.physics.moveToObject(enemy, this.player, this.enemySpeed * 0.6);
            // Rotate to face player
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
            enemy.setRotation(angle);
        }
    });
  }

  // --- SPAWNING LOGIC ---

  spawnEnemy() {
    if (this.isPaused || this.isGameOver) return;

    // 1. Determine spawn position (Edge of screen)
    const edge = Phaser.Math.Between(0, 3);
    let x, y, vx, vy;
    const padding = 30;
    
    switch (edge) {
      case 0: x = Phaser.Math.Between(0, 800); y = padding; vx = 0; vy = this.enemySpeed; break; // Top
      case 1: x = 800 - padding; y = Phaser.Math.Between(0, 600); vx = -this.enemySpeed; vy = 0; break; // Right
      case 2: x = Phaser.Math.Between(0, 800); y = 600 - padding; vx = 0; vy = -this.enemySpeed; break; // Bottom
      case 3: x = padding; y = Phaser.Math.Between(0, 600); vx = this.enemySpeed; vy = 0; break; // Left
    }

    // 2. TELEGRAPHING (Warning indicator)
    const warning = this.add.rectangle(x, y, 32, 32, CONSTS.COLORS.WARNING_RED).setAlpha(0);
    
    // Adjust warning position to be strictly visible on edge
    if (edge === 0) warning.y = 10;
    if (edge === 1) warning.x = 790;
    if (edge === 2) warning.y = 590;
    if (edge === 3) warning.x = 10;

    this.tweens.add({
        targets: warning,
        alpha: 1,
        duration: 100,
        yoyo: true,
        repeat: 2,
        onComplete: () => {
            warning.destroy();
            if (!this.isGameOver && !this.isPaused) {
                this.createRealEnemy(x, y, vx, vy);
            }
        }
    });
  }

  createRealEnemy(x, y, vx, vy) {
    // 20% Chance to be a Seeker
    const isSeeker = Phaser.Math.Between(0, 100) > 80; 

    let enemy;
    if (isSeeker) {
        // Seekers are triangles
        enemy = this.enemies.create(x, y, 'enemy'); 
        enemy.setTint(0xffaa00); // Orange tint
        enemy.setData('type', 'seeker');
        // Initial push
        this.physics.moveToObject(enemy, this.player, this.enemySpeed * 0.6);
    } else {
        // Normal Charger
        enemy = this.enemies.create(x, y, 'enemy');
        enemy.setData('type', 'normal');
        enemy.setVelocity(vx, vy);
    }
  }

  spawnOrb() {
    if (this.isPaused || this.isGameOver) return;
    const x = Phaser.Math.Between(50, 750);
    const y = Phaser.Math.Between(50, 550);
    // Don't spawn on top of player
    if (Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 100) return;
    this.orbs.create(x, y, 'orb');
  }

  collectOrb(player, orb) {
    orb.destroy();
    this.sound.play("orb", { volume: 0.6 });
    this.score += 50;
    this.scoreText.setText(`SCORE ${this.score}`);
    this.showFloatingText(player.x, player.y, "+50");
  }

  handleDeath() {
    if (this.isGameOver) return;
    this.isGameOver = true;
    this.sound.play("explode", { volume: 0.8 });
    if (this.music) this.music.stop();

    if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('high_score', this.highScore);
    }

    this.physics.pause();
    this.time.removeAllEvents(); // Stop all timers
    this.cameras.main.shake(350, 0.03);

    // Particle Explosion
    const emitter = this.add.particles(this.player.x, this.player.y, "particle", {
        speed: { min: 200, max: 500 }, angle: { min: 0, max: 360 }, scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 900, blendMode: "ADD", emitting: false
    });
    emitter.explode(60);

    // Kill Player Object
    this.player.die();

    this.centerText.setText(`GAME OVER\nSCORE: ${this.score}\nBEST: ${this.highScore}\n\nTAP TO RESTART`);
  }

  // --- HELPERS ---

  setupTimers() {
    // Score Timer
    this.time.addEvent({ delay: 1000, loop: true, callback: () => {
        if (!this.isGameOver && !this.isPaused) {
            this.score += 5;
            this.scoreText.setText(`SCORE ${this.score}`);
        }
    }});

    // Spawn Timer
    this.spawnTimer = this.time.addEvent({
      delay: this.spawnDelay, loop: true, callback: this.spawnEnemy, callbackScope: this,
    });

    // Difficulty Timer (Linear Scaling)
    this.time.addEvent({
        delay: 5000, loop: true,
        callback: () => {
            if (this.isGameOver || this.isPaused) return;
            // Cap Speed
            if (this.enemySpeed < CONSTS.ENEMY.kV_MAX) {
                this.enemySpeed += 25; // Linear increase
            }
            // Cap Spawn Rate
            if (this.spawnDelay > CONSTS.ENEMY.SPAWN_DELAY_MIN) {
                this.spawnDelay -= 50;
                this.spawnTimer.delay = this.spawnDelay; 
            }
        }
    });

    // Orb Timer
    this.time.addEvent({ delay: 3000, loop: true, callback: this.spawnOrb, callbackScope: this });
  }

  createTextures() {
    if (!this.textures.exists("player")) {
      const g = this.add.graphics();
      // Player
      g.fillStyle(CONSTS.COLORS.NEON_BLUE, 1);
      g.fillRoundedRect(0, 0, 22, 22, 4);
      g.generateTexture("player", 22, 22);
      g.clear();
      // Particle
      g.fillStyle(CONSTS.COLORS.NEON_BLUE, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture("particle", 4, 4);
      g.clear();
      // Enemy
      g.fillStyle(CONSTS.COLORS.NEON_PINK, 1);
      g.fillRoundedRect(0, 0, 16, 16, 4);
      g.generateTexture("enemy", 16, 16);
      g.clear();
      // Orb
      g.fillStyle(CONSTS.COLORS.NEON_YELLOW, 1); 
      g.fillCircle(6, 6, 6);
      g.generateTexture("orb", 12, 12);
      g.destroy();
    }
  }

  showFloatingText(x, y, message) {
    const txt = this.add.text(x, y - 20, message, { 
        fontSize: '16px', fontFamily: '"Press Start 2P"', color: '#ffff00', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5);
    this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
  }

  setupMuteToggle() {
    const muteCheckbox = document.getElementById('btn-mute');
    if (muteCheckbox) {
        muteCheckbox.checked = !this.sound.mute;
        const toggleHandler = (e) => {
            e.stopPropagation();
            this.sound.mute = !muteCheckbox.checked;
            muteCheckbox.blur(); 
        };
        // Remove old listeners to prevent stacking on restarts
        const newEl = muteCheckbox.cloneNode(true);
        muteCheckbox.parentNode.replaceChild(newEl, muteCheckbox);
        newEl.addEventListener('change', toggleHandler);
        newEl.addEventListener('keydown', (e) => e.preventDefault());
    }
  }

  bindTouchControls() {
    const bind = (id, prop) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const on = (e) => { if (e.cancelable) e.preventDefault(); this.touch[prop] = true; };
        const off = (e) => { if (e.cancelable) e.preventDefault(); this.touch[prop] = false; };
        btn.onpointerdown = on;
        btn.onpointerup = off;
        btn.onpointerleave = off;
    };
    bind('btn-up', 'up');
    bind('btn-down', 'down');
    bind('btn-left', 'left');
    bind('btn-right', 'right');
    bind('btn-dash', 'dash');
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      if (this.music) this.music.pause();
      this.centerText.setText("PAUSED\nESC TO RESUME");
    } else {
      this.physics.resume();
      if (this.music) this.music.resume();
      this.centerText.setText("");
    }
  }
}