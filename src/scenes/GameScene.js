// src/scenes/GameScene.js
import Phaser from "phaser";
import Player from "../objects/Player";
import { CONSTS } from "../consts";
import EnemyManager from "../managers/EnemyManager";
import ItemManager from "../managers/ItemManager";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("game");
  }

  init() {
    this.isGameOver = false;
    this.isPaused = false;
    this.score = 0;
    this.scoreMultiplier = 1;
    this.godMode = false; 
    
    this.touch = { up: false, down: false, left: false, right: false, dash: false, brake: false };
    this.highScore = parseInt(localStorage.getItem('high_score')) || 0;
  }

  create() {
    const { width, height } = this.scale; // DYNAMIC CENTER
    this.cameras.main.fadeIn(300);

    // --- AUDIO ---
    this.music = this.sound.add("music", { volume: 0.5, loop: true });
    if (!this.sound.locked) this.music.play();
    else this.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.music.play());
    this.setupMuteToggle();

    // --- TEXTURES ---
    this.createBaseTextures(); 

    // --- SYSTEMS ---
    this.player = new Player(this, width / 2, height / 2); // Center player
    this.enemyManager = new EnemyManager(this);
    this.itemManager = new ItemManager(this);

    // --- COLLISIONS ---
    const enemyGroup = this.enemyManager.getGroup();
    
    this.physics.add.overlap(this.player, enemyGroup, this.handlePlayerHit, null, this);
    this.physics.add.overlap(this.player, this.itemManager.getOrbs(), this.itemManager.collectOrb, null, this.itemManager);
    this.physics.add.overlap(this.player, this.itemManager.getPowerups(), this.itemManager.collectPowerup, null, this.itemManager);
    this.physics.add.overlap(enemyGroup, enemyGroup, this.enemyManager.handleEnemyCollision, null, this.enemyManager);

    // --- INPUT ---
    this.setupInputs();
    this.setupDebugKeys();

    // --- UI ---
    this.scoreText = this.add.text(16, 16, "SCORE 0", {
      fontFamily: '"Press Start 2P"', fontSize: "16px", color: "#00ffff",
    });
    this.highScoreText = this.add.text(16, 40, `BEST ${this.highScore}`, {
        fontFamily: '"Press Start 2P"', fontSize: "12px", color: "#ff00de",
    });
    this.centerText = this.add.text(width / 2, height / 2, "", {
        fontFamily: '"Press Start 2P"', fontSize: "24px", align: "center", lineSpacing: 10, color: "#ffffff",
    }).setOrigin(0.5).setDepth(20);
    
    // Position Shift Hint relative to screen
    this.add.text(width - 20, height - 20, "SHIFT: BRAKE", {
        fontFamily: '"Press Start 2P"', fontSize: "10px", color: "#555"
    }).setOrigin(1, 1);
    
    this.debugText = this.add.text(width - 20, 16, "DEBUG ON", { 
        fontFamily: '"Press Start 2P"', fontSize: "10px", color: "#00ff00" 
    }).setOrigin(1, 0).setAlpha(0);

    // Score Timer
    this.time.addEvent({ delay: 1000, loop: true, callback: () => {
        if (!this.isGameOver && !this.isPaused) {
            this.addScore(5);
        }
    }});
  }

  update() {
    if (this.isGameOver) {
        if (Phaser.Input.Keyboard.JustDown(this.rKey) || this.input.activePointer.isDown) this.scene.restart();
        return;
    }
    
    if (Phaser.Input.Keyboard.JustDown(this.escKey)) this.togglePause();
    if (this.isPaused) return;

    if (!this.cursors) return;

    const inputState = {
        up: this.cursors.up.isDown || this.wasd.up.isDown,
        down: this.cursors.down.isDown || this.wasd.down.isDown,
        left: this.cursors.left.isDown || this.wasd.left.isDown,
        right: this.cursors.right.isDown || this.wasd.right.isDown,
        space: this.cursors.space,
        shift: this.cursors.shift 
    };

    if (this.player) this.player.update(inputState, this.touch);
    if (this.enemyManager) this.enemyManager.update(this.score);
    if (this.itemManager) this.itemManager.update(); 
  }

  setupDebugKeys() {
      this.input.keyboard.on('keydown', (event) => {
          if (!this.player || this.isGameOver) return;
          const x = this.player.x + 50;
          const y = this.player.y;
          switch(event.key) {
              case '1': this.itemManager.spawnSpecificPowerup(CONSTS.POWERUPS.TYPE.SHIELD, x, y); break;
              case '2': this.itemManager.spawnSpecificPowerup(CONSTS.POWERUPS.TYPE.GHOST, x, y); break;
              case '3': this.itemManager.spawnSpecificPowerup(CONSTS.POWERUPS.TYPE.MAGNET, x, y); break;
              case '4': this.itemManager.spawnSpecificPowerup(CONSTS.POWERUPS.TYPE.TIME_WARP, x, y); break;
              case '5': this.itemManager.spawnSpecificPowerup(CONSTS.POWERUPS.TYPE.EMP, x, y); break;
              case '6': this.itemManager.spawnSpecificPowerup(CONSTS.POWERUPS.TYPE.OVERDRIVE, x, y); break;
              case '7': this.itemManager.spawnSpecificPowerup(CONSTS.POWERUPS.TYPE.MULTIPLIER, x, y); break;
              case 'l': case 'L': this.addScore(500); this.showFloatingText(x, y, "LEVEL UP"); break;
              case 'g': case 'G': 
                  this.godMode = !this.godMode; 
                  this.debugText.setAlpha(this.godMode ? 1 : 0);
                  this.player.setAlpha(this.godMode ? 0.7 : 1);
                  this.showFloatingText(x, y, this.godMode ? "GOD MODE ON" : "GOD MODE OFF");
                  break;
          }
      });
  }

  activateMultiplier(duration) {
      this.scoreMultiplier = 2;
      this.scoreText.setTint(CONSTS.COLORS.PW_MULT);
      this.time.delayedCall(duration, () => {
          this.scoreMultiplier = 1;
          this.scoreText.clearTint();
      });
  }

  addScore(amount) {
      this.score += amount * this.scoreMultiplier;
      this.scoreText.setText(`SCORE ${this.score}`);
  }

  handlePlayerHit(player, enemy) {
    if (this.isGameOver) return;
    if (this.godMode) return; 
    const died = player.takeHit();
    if (died) {
        this.handleDeath();
    } else {
        enemy.destroy();
        this.showFloatingText(player.x, player.y, "BLOCKED!");
    }
  }

  handleDeath() {
    this.isGameOver = true;
    this.sound.play("explode", { volume: 0.8 });
    if (this.music) this.music.stop();

    if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('high_score', this.highScore);
    }

    this.physics.pause();
    this.time.removeAllEvents(); 
    this.cameras.main.shake(350, 0.03);

    const emitter = this.add.particles(this.player.x, this.player.y, "particle", {
        speed: { min: 200, max: 500 }, angle: { min: 0, max: 360 }, scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 900, blendMode: "ADD", emitting: false
    });
    emitter.explode(60);

    this.player.die();
    this.centerText.setText(`GAME OVER\nSCORE: ${this.score}\nBEST: ${this.highScore}\n\nTAP TO RESTART`);
  }

  createBaseTextures() {
    if (!this.textures.exists("player")) {
      const g = this.add.graphics();
      g.fillStyle(CONSTS.COLORS.NEON_BLUE, 1);
      g.fillRoundedRect(0, 0, 22, 22, 4);
      g.generateTexture("player", 22, 22);
      g.clear();
      g.fillStyle(CONSTS.COLORS.NEON_BLUE, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture("particle", 4, 4);
      g.destroy();
    }
  }

  setupInputs() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.cursors.shift = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    this.wasd = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W, down: Phaser.Input.Keyboard.KeyCodes.S, left: Phaser.Input.Keyboard.KeyCodes.A, right: Phaser.Input.Keyboard.KeyCodes.D
    });
    this.cursors.space = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.bindTouchControls();
  }

  bindTouchControls() {
    const bind = (id, prop) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const on = (e) => { if (e.cancelable) e.preventDefault(); this.touch[prop] = true; };
        const off = (e) => { if (e.cancelable) e.preventDefault(); this.touch[prop] = false; };
        btn.onpointerdown = on; btn.onpointerup = off; btn.onpointerleave = off;
    };
    bind('btn-up', 'up'); bind('btn-down', 'down'); bind('btn-left', 'left'); bind('btn-right', 'right'); bind('btn-dash', 'dash');
  }

  setupMuteToggle() {
    const muteCheckbox = document.getElementById('btn-mute');
    if (muteCheckbox) {
        muteCheckbox.checked = !this.sound.mute;
        const toggleHandler = (e) => { 
            e.stopPropagation(); 
            this.sound.mute = !e.target.checked; 
            e.target.blur(); 
        };
        const newEl = muteCheckbox.cloneNode(true);
        if(muteCheckbox.parentNode) {
            muteCheckbox.parentNode.replaceChild(newEl, muteCheckbox);
            newEl.addEventListener('change', toggleHandler);
            newEl.addEventListener('keydown', (e) => e.preventDefault());
        }
    }
  }

  showFloatingText(x, y, message) {
    const txt = this.add.text(x, y - 20, message, { 
        fontSize: '16px', fontFamily: '"Press Start 2P"', color: '#ffff00', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5);
    this.tweens.add({ targets: txt, y: txt.y - 50, alpha: 0, duration: 800, onComplete: () => txt.destroy() });
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