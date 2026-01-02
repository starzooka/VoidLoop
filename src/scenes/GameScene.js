import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("game");
  }

  init() {
    this.isGameOver = false;
    this.isPaused = false;
    this.score = 0;
    this.enemySpeed = 140;
    this.spawnDelay = 1000;
    this.canDash = true;
    this.lastDir = new Phaser.Math.Vector2(1, 0);
    
    this.touch = {
        up: false, down: false, left: false, right: false, dash: false
    };

    this.highScore = parseInt(localStorage.getItem('high_score')) || 0;
  }

  create() {
    this.cameras.main.fadeIn(300);

    // ================= MUSIC LOGIC =================
    
    // 1. Setup Music (Looping)
    this.music = this.sound.add("music", { volume: 0.5, loop: true });

    // 2. Play Immediately (if allowed by browser)
    if (!this.sound.locked) {
        this.music.play();
    } else {
        // If locked, wait for first touch/click then play
        this.sound.once(Phaser.Sound.Events.UNLOCKED, () => {
            if (!this.isGameOver && !this.isPaused) {
                this.music.play();
            }
        });
    }

    // ================= MUTE TOGGLE LOGIC =================
    const muteCheckbox = document.getElementById('btn-mute');
    
    if (muteCheckbox) {
        // 1. Sync UI with actual game state on start
        // If sound is NOT muted, the box should be CHECKED (ON)
        muteCheckbox.checked = !this.sound.mute;

        // 2. Handle Toggle Change
        muteCheckbox.addEventListener('change', (e) => {
            e.stopPropagation(); // Stop event bubbling
            
            // Logic: Checked = Sound ON (!mute) / Unchecked = Sound OFF (mute)
            this.sound.mute = !muteCheckbox.checked;
            
            // Remove focus so Spacebar doesn't accidentally toggle it later
            muteCheckbox.blur(); 
        });
        
        // 3. Prevent keyboard interference
        muteCheckbox.addEventListener('keydown', (e) => {
             e.preventDefault();
        });
    }

    // ================= TEXTURES =================
    if (!this.textures.exists("player")) {
      const g = this.add.graphics();
      g.fillStyle(0x00ffff, 1);
      g.fillRoundedRect(0, 0, 22, 22, 4);
      g.generateTexture("player", 22, 22);
      g.clear();
      g.fillStyle(0x00ffff, 1);
      g.fillRect(0, 0, 4, 4);
      g.generateTexture("particle", 4, 4);
      g.destroy();
    }
    if (!this.textures.exists("enemy")) {
      const eg = this.add.graphics();
      eg.fillStyle(0xff3366, 1);
      eg.fillRoundedRect(0, 0, 16, 16, 4);
      eg.generateTexture("enemy", 16, 16);
      eg.destroy();
    }
    if (!this.textures.exists("orb")) {
        const og = this.add.graphics();
        og.fillStyle(0xffff00, 1); 
        og.fillCircle(6, 6, 6);
        og.generateTexture("orb", 12, 12);
        og.destroy();
    }

    // ================= ENTITIES =================
    this.player = this.physics.add.sprite(400, 300, "player");
    this.player.setCollideWorldBounds(true);
    this.player.setDamping(true);
    this.player.setDrag(0.92);
    this.player.setMaxVelocity(320);

    this.trail = this.add.particles(0, 0, 'player', {
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.3, end: 0 },
        lifespan: 200,
        blendMode: 'ADD',
        frequency: 40,
        follow: this.player
    });

    this.glow = this.add.sprite(400, 300, "player").setScale(1.8).setAlpha(0.25).setTint(0x00ffff);

    // ================= INPUT =================
    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.rKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);

    const bindTouchBtn = (id, property) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const enable = (e) => { 
            if (e.cancelable) e.preventDefault(); 
            this.touch[property] = true; 
        };
        const disable = (e) => { 
            if (e.cancelable) e.preventDefault(); 
            this.touch[property] = false; 
        };
        btn.addEventListener('pointerdown', enable);
        btn.addEventListener('pointerup', disable);
        btn.addEventListener('pointerleave', disable);
    };

    bindTouchBtn('btn-up', 'up');
    bindTouchBtn('btn-down', 'down');
    bindTouchBtn('btn-left', 'left');
    bindTouchBtn('btn-right', 'right');
    bindTouchBtn('btn-dash', 'dash');
    
    // Tap to Restart
    this.input.on('pointerdown', () => {
        if (this.isGameOver) this.scene.restart();
    });

    // ================= GROUPS =================
    this.enemies = this.physics.add.group();
    this.physics.add.overlap(this.player, this.enemies, this.handleDeath, null, this);
    this.orbs = this.physics.add.group();
    this.physics.add.overlap(this.player, this.orbs, this.collectOrb, null, this);

    // ================= UI =================
    this.scoreText = this.add.text(16, 16, "SCORE 0", {
      fontFamily: '"Press Start 2P", monospace', fontSize: "16px", color: "#00ffff",
    });

    this.highScoreText = this.add.text(16, 40, `BEST ${this.highScore}`, {
        fontFamily: '"Press Start 2P", monospace', fontSize: "12px", color: "#ff00de",
    });

    this.centerText = this.add.text(400, 300, "", {
        fontFamily: '"Press Start 2P", monospace', fontSize: "24px", align: "center", lineSpacing: 10, color: "#ffffff",
      }).setOrigin(0.5).setDepth(10);

    // ================= TIMERS =================
    this.scoreTimer = this.time.addEvent({
      delay: 1000, loop: true,
      callback: () => {
        if (!this.isGameOver && !this.isPaused) {
          this.score += 5;
          this.scoreText.setText(`SCORE ${this.score}`);
        }
      },
    });

    this.spawnTimer = this.time.addEvent({
      delay: this.spawnDelay, loop: true, callback: this.spawnEnemy, callbackScope: this,
    });

    this.difficultyTimer = this.time.addEvent({
        delay: 5000, loop: true,
        callback: () => {
            if (this.isGameOver || this.isPaused) return;
            if (this.enemySpeed < 800) this.enemySpeed *= 1.1;
            if (this.spawnDelay > 200) {
                this.spawnDelay -= 50;
                this.spawnTimer.delay = this.spawnDelay; 
            }
        }
    });

    this.orbTimer = this.time.addEvent({
        delay: 3000, loop: true, callback: this.spawnOrb, callbackScope: this
    });
  }

  update() {
    if (this.isGameOver && Phaser.Input.Keyboard.JustDown(this.rKey)) {
      this.scene.restart();
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.escKey) && !this.isGameOver) {
      this.togglePause();
    }
    if (this.isPaused || this.isGameOver) return;

    const accel = 1200;
    this.player.setAcceleration(0);

    if (this.cursors.left.isDown || this.touch.left) {
      this.player.setAccelerationX(-accel); this.lastDir.set(-1, 0);
    }
    if (this.cursors.right.isDown || this.touch.right) {
      this.player.setAccelerationX(accel); this.lastDir.set(1, 0);
    }
    if (this.cursors.up.isDown || this.touch.up) {
      this.player.setAccelerationY(-accel); this.lastDir.set(0, -1);
    }
    if (this.cursors.down.isDown || this.touch.down) {
      this.player.setAccelerationY(accel); this.lastDir.set(0, 1);
    }

    if (Phaser.Input.Keyboard.JustDown(this.spaceKey) || this.touch.dash) {
        if(this.touch.dash) this.touch.dash = false; 
        this.dash();
    }

    if (this.canDash) {
        this.player.setTint(0x00ffff);
        this.glow.setAlpha(0.25);
    } else {
        this.player.setTint(0x555555);
        this.glow.setAlpha(0);
    }
    if (this.player && this.player.active) {
        this.glow.setPosition(this.player.x, this.player.y);
    }
  }

  spawnEnemy() {
    if (this.isPaused || this.isGameOver) return;
    const edge = Phaser.Math.Between(0, 3);
    let x, y, vx, vy;
    switch (edge) {
      case 0: x = Phaser.Math.Between(0, 800); y = -20; vx = 0; vy = this.enemySpeed; break;
      case 1: x = 820; y = Phaser.Math.Between(0, 600); vx = -this.enemySpeed; vy = 0; break;
      case 2: x = Phaser.Math.Between(0, 800); y = 620; vx = 0; vy = -this.enemySpeed; break;
      case 3: x = -20; y = Phaser.Math.Between(0, 600); vx = this.enemySpeed; vy = 0; break;
    }
    this.enemies.create(x, y, "enemy").setVelocity(vx, vy);
  }

  spawnOrb() {
    if (this.isPaused || this.isGameOver) return;
    const x = Phaser.Math.Between(50, 750);
    const y = Phaser.Math.Between(50, 550);
    if (this.player && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) < 50) return; 
    this.orbs.create(x, y, 'orb');
  }

  collectOrb(player, orb) {
    orb.destroy();
    
    // Play Sound
    this.sound.play("orb", { volume: 0.6 });

    this.score += 50;
    this.scoreText.setText(`SCORE ${this.score}`);
    
    const txt = this.add.text(player.x, player.y - 20, "+50", { 
        fontSize: '16px', fontFamily: '"Press Start 2P", monospace', color: '#ffff00', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5);
    this.tweens.add({
        targets: txt, y: txt.y - 50, alpha: 0, duration: 800, onComplete: () => txt.destroy()
    });
  }

  dash() {
    if (!this.canDash || this.isPaused || this.isGameOver) return;
    
    // Play Sound
    this.sound.play("dash", { volume: 0.4 });

    this.canDash = false;
    this.player.setVelocity(this.lastDir.x * 600, this.lastDir.y * 600);
    this.time.delayedCall(1000, () => (this.canDash = true));
  }

  handleDeath() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Play Sound
    this.sound.play("explode", { volume: 0.8 });
    
    // Stop Music
    if (this.music) this.music.stop();

    if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('high_score', this.highScore);
        this.highScoreText.setText(`BEST ${this.highScore}`);
    }

    this.physics.pause();
    this.scoreTimer.remove();
    this.spawnTimer.remove();
    this.difficultyTimer.remove(); 
    this.orbTimer.remove(); 
    this.cameras.main.shake(350, 0.03);

    const x = this.player.x;
    const y = this.player.y;
    this.trail.stopFollow();
    this.player.destroy();
    this.glow.destroy();
    
    this.tweens.add({ targets: this.trail, alpha: 0, duration: 500, onComplete: () => this.trail.destroy() });

    const emitter = this.add.particles(x, y, "particle", {
        speed: { min: 200, max: 500 }, angle: { min: 0, max: 360 }, scale: { start: 1.2, end: 0 }, alpha: { start: 1, end: 0 }, lifespan: 900, blendMode: "ADD", emitting: false
    });
    emitter.explode(60);

    this.centerText.setText(`GAME OVER\nSCORE: ${this.score}\nBEST: ${this.highScore}\nPRESS R OR TAP TO RESTART`);
  }

  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.isPaused) {
      this.physics.pause();
      this.spawnTimer.paused = true;
      this.difficultyTimer.paused = true;
      this.orbTimer.paused = true;
      
      // Pause Music
      if (this.music) this.music.pause();
      
      this.centerText.setText("PAUSED\nESC TO RESUME");
    } else {
      this.physics.resume();
      this.spawnTimer.paused = false;
      this.difficultyTimer.paused = false;
      this.orbTimer.paused = false;
      
      // Resume Music
      if (this.music) this.music.resume();

      this.centerText.setText("");
    }
  }
}