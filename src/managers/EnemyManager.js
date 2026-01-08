// src/managers/EnemyManager.js
import Phaser from "phaser";
import { CONSTS } from "../consts";

export default class EnemyManager {
  constructor(scene) {
    this.scene = scene;
    this.enemies = this.scene.physics.add.group();
    this.enemySpeed = CONSTS.ENEMY.kV_START;
    this.spawnDelay = CONSTS.ENEMY.SPAWN_DELAY_START;
    
    this.currentPhase = 0; 
    this.seekerTimer = null;
    this.isTimeWarped = false;
    this.timeWarpFactor = 1.0;

    this.createEnemyTextures();
    this.startNormalSpawning();
    
    this.scene.time.addEvent({
      delay: 5000, 
      loop: true,
      callback: () => this.increaseDifficulty()
    });
  }

  createEnemyTextures() {
    if (!this.scene.textures.exists("enemy")) {
      const g = this.scene.add.graphics();
      g.fillStyle(CONSTS.COLORS.NEON_PINK, 1);
      g.fillRoundedRect(0, 0, 16, 16, 4);
      g.generateTexture("enemy", 16, 16);
      g.destroy();
    }
  }

  startNormalSpawning() {
    this.spawnTimer = this.scene.time.addEvent({
      delay: this.spawnDelay, 
      loop: true, 
      callback: this.spawnNormalEnemy, 
      callbackScope: this,
    });
  }

  spawnNormalEnemy() {
    if (this.scene.isPaused || this.scene.isGameOver) return;
    const { x, y, vx, vy } = this.calculateSpawnVectors();
    this.telegraphAndSpawn(x, y, vx, vy, 'normal');
  }

  update(score) {
    this.updateSeekerBehavior();
    this.checkDifficultyPhase(score);
  }

  checkDifficultyPhase(score) {
    if (this.scene.isGameOver) return;
    let newPhase = 0;
    if (score >= 1000) newPhase = 2;
    else if (score >= 300) newPhase = 1;
    if (this.currentPhase !== newPhase) {
        this.currentPhase = newPhase;
        this.resetSeekerTimer();
    }
  }

  resetSeekerTimer() {
    if (this.seekerTimer) this.seekerTimer.remove();
    let delay = 0;
    let callback = null;

    if (this.currentPhase === 1) {
        delay = 5000;
        callback = () => this.spawnSeekerBatch(1);
    } else if (this.currentPhase === 2) {
        delay = 3000;
        callback = () => {
            const count = Phaser.Math.Between(1, 3);
            this.spawnSeekerBatch(count);
        };
    }

    if (delay > 0 && callback) {
        this.seekerTimer = this.scene.time.addEvent({
            delay: delay, loop: true, callback: callback, callbackScope: this
        });
    }
  }

  spawnSeekerBatch(count) {
     if (this.scene.isPaused || this.scene.isGameOver) return;
     for (let i = 0; i < count; i++) {
        this.scene.time.delayedCall(i * 300, () => {
             const { x, y } = this.calculateSpawnVectors(); 
             this.telegraphAndSpawn(x, y, 0, 0, 'seeker');
        });
     }
  }

  // --- SPAWN HELPERS ---

  calculateSpawnVectors() {
    const edge = Phaser.Math.Between(0, 3);
    const { width, height } = this.scene.scale; // DYNAMIC SIZE
    let x, y, vx, vy;
    const padding = 30;
    const currentSpeed = this.enemySpeed * this.timeWarpFactor;

    switch (edge) {
      case 0: x = Phaser.Math.Between(0, width); y = padding; vx = 0; vy = currentSpeed; break; // Top
      case 1: x = width - padding; y = Phaser.Math.Between(0, height); vx = -currentSpeed; vy = 0; break; // Right
      case 2: x = Phaser.Math.Between(0, width); y = height - padding; vx = 0; vy = -currentSpeed; break; // Bottom
      case 3: x = padding; y = Phaser.Math.Between(0, height); vx = currentSpeed; vy = 0; break; // Left
    }
    return { x, y, vx, vy, edge };
  }

  telegraphAndSpawn(x, y, vx, vy, type) {
    const color = type === 'seeker' ? CONSTS.COLORS.WARNING_RED : CONSTS.COLORS.NEON_PINK;
    const { width, height } = this.scene.scale;
    
    // Warning Indicator
    const warning = this.scene.add.rectangle(x, y, 32, 32, color).setAlpha(0);
    
    // Adjust warning position
    if (y < 50) warning.y = 10;
    if (x > width - 50) warning.x = width - 10;
    if (y > height - 50) warning.y = height - 10;
    if (x < 50) warning.x = 10;

    this.scene.tweens.add({
        targets: warning,
        alpha: 1, duration: 100, yoyo: true, repeat: 2,
        onComplete: () => {
            warning.destroy();
            if (!this.scene.isGameOver && !this.scene.isPaused) {
                this.createEntity(x, y, vx, vy, type);
            }
        }
    });
  }

  createEntity(x, y, vx, vy, type) {
    const enemy = this.enemies.create(x, y, 'enemy');
    enemy.setData('type', type);
    enemy.setData('baseVx', vx);
    enemy.setData('baseVy', vy);

    if (type === 'seeker') {
        enemy.setTint(CONSTS.COLORS.WARNING_RED); 
        if (this.scene.player) {
            this.scene.physics.moveToObject(enemy, this.scene.player, this.enemySpeed * 0.6);
        }
    } else {
        enemy.setVelocity(vx, vy);
    }
  }

  updateSeekerBehavior() {
    this.enemies.getChildren().forEach(enemy => {
        if (enemy.getData('type') === 'seeker' && this.scene.player && !this.scene.player.isDead) {
            const speed = this.enemySpeed * this.timeWarpFactor * 0.65;
            this.scene.physics.moveToObject(enemy, this.scene.player, speed);
            const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.scene.player.x, this.scene.player.y);
            enemy.setRotation(angle);
        }
        
        if (this.isTimeWarped) {
             enemy.setTint(CONSTS.COLORS.PW_TIME);
        } else {
             if (enemy.getData('type') === 'seeker') enemy.setTint(CONSTS.COLORS.WARNING_RED);
             else enemy.clearTint();
        }
    });
  }

  increaseDifficulty() {
    if (this.scene.isGameOver || this.scene.isPaused || this.isTimeWarped) return;
    if (this.enemySpeed < CONSTS.ENEMY.kV_MAX) {
      this.enemySpeed += 25;
    }
    if (this.spawnDelay > CONSTS.ENEMY.SPAWN_DELAY_MIN) {
      this.spawnDelay -= 50;
      this.spawnTimer.delay = this.spawnDelay; 
    }
  }

  handleEnemyCollision(enemy1, enemy2) {
      if (enemy1.getData('type') === 'seeker' && enemy2.getData('type') === 'seeker') {
          this.destroyEnemy(enemy1);
          this.destroyEnemy(enemy2);
          this.scene.sound.play("explode", { volume: 0.4, rate: 1.5 });
          this.scene.showFloatingText(enemy1.x, enemy1.y, "CRASH!");
      }
  }

  destroyEnemy(enemy) {
      const emitter = this.scene.add.particles(enemy.x, enemy.y, "particle", {
          speed: { min: 50, max: 200 }, scale: { start: 1, end: 0 }, lifespan: 500, blendMode: "ADD", emitting: false
      });
      emitter.explode(15);
      enemy.destroy();
  }

  triggerEMP() {
    this.scene.cameras.main.flash(200, 255, 0, 0);
    this.scene.cameras.main.shake(300, 0.02);
    this.scene.sound.play("explode", { volume: 0.6, rate: 0.5 }); 
    this.enemies.getChildren().forEach(enemy => this.destroyEnemy(enemy));
  }

  setTimeWarp(active) {
    this.isTimeWarped = active;
    this.timeWarpFactor = active ? 0.3 : 1.0; 
    this.enemies.getChildren().forEach(enemy => {
        if (enemy.getData('type') === 'normal') {
            const bx = enemy.getData('baseVx') || 0;
            const by = enemy.getData('baseVy') || 0;
            const factor = active ? 0.3 : 1.0;
            enemy.setVelocity(bx * factor, by * factor);
        }
    });
  }

  getGroup() { return this.enemies; }
}