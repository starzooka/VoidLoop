// src/managers/ItemManager.js
import Phaser from "phaser";
import { CONSTS } from "../consts";

export default class ItemManager {
  constructor(scene) {
    this.scene = scene;
    this.orbs = this.scene.physics.add.group();
    this.powerups = this.scene.physics.add.group();

    this.createItemTextures();

    this.scene.time.addEvent({ delay: 3000, loop: true, callback: this.spawnOrb, callbackScope: this });
    this.scene.time.addEvent({ delay: 15000, loop: true, callback: this.spawnPowerup, callbackScope: this });
  }

  createItemTextures() {
    const g = this.scene.add.graphics();
    if (!this.scene.textures.exists("orb")) {
      g.fillStyle(CONSTS.COLORS.NEON_YELLOW, 1); 
      g.fillCircle(6, 6, 6);
      g.generateTexture("orb", 12, 12);
      g.clear();
    }
    const createBox = (key, color) => {
        if (!this.scene.textures.exists(key)) {
            g.lineStyle(2, color);
            g.strokeRect(0, 0, 16, 16);
            g.fillStyle(color, 0.5);
            g.fillRect(4, 4, 8, 8);
            g.generateTexture(key, 16, 16);
            g.clear();
        }
    };
    createBox("pw_shield", CONSTS.COLORS.PW_SHIELD);
    createBox("pw_ghost", CONSTS.COLORS.PW_GHOST);
    createBox("pw_magnet", CONSTS.COLORS.PW_MAGNET);
    createBox("pw_time", CONSTS.COLORS.PW_TIME);
    createBox("pw_emp", CONSTS.COLORS.PW_EMP);
    createBox("pw_drive", CONSTS.COLORS.PW_DRIVE);
    createBox("pw_mult", CONSTS.COLORS.PW_MULT);
    g.destroy();
  }

  spawnOrb() {
    if (this.scene.isPaused || this.scene.isGameOver) return;
    const { x, y } = this.getRandomPosition();
    if (Phaser.Math.Distance.Between(x, y, this.scene.player.x, this.scene.player.y) < 100) return;
    this.orbs.create(x, y, 'orb');
  }

  spawnPowerup() {
    if (this.scene.isPaused || this.scene.isGameOver) return;
    const { x, y } = this.getRandomPosition();
    const types = Object.values(CONSTS.POWERUPS.TYPE);
    const type = types[Phaser.Math.Between(0, types.length - 1)];
    this.createPowerupEntity(x, y, type);
  }

  spawnSpecificPowerup(type, x, y) {
      this.createPowerupEntity(x, y, type);
  }

  createPowerupEntity(x, y, type) {
    let texture = "";
    switch(type) {
        case CONSTS.POWERUPS.TYPE.SHIELD: texture = "pw_shield"; break;
        case CONSTS.POWERUPS.TYPE.GHOST: texture = "pw_ghost"; break;
        case CONSTS.POWERUPS.TYPE.MAGNET: texture = "pw_magnet"; break;
        case CONSTS.POWERUPS.TYPE.TIME_WARP: texture = "pw_time"; break;
        case CONSTS.POWERUPS.TYPE.EMP: texture = "pw_emp"; break;
        case CONSTS.POWERUPS.TYPE.OVERDRIVE: texture = "pw_drive"; break;
        case CONSTS.POWERUPS.TYPE.MULTIPLIER: texture = "pw_mult"; break;
    }
    const pw = this.powerups.create(x, y, texture);
    pw.setData('type', type);
    this.scene.tweens.add({ targets: pw, y: y - 10, duration: 1000, yoyo: true, repeat: -1 });
    this.scene.time.delayedCall(10000, () => { if(pw.active) pw.destroy(); });
  }

  getRandomPosition() {
    const { width, height } = this.scene.scale;
    return {
        x: Phaser.Math.Between(50, width - 50),
        y: Phaser.Math.Between(50, height - 50)
    };
  }

  collectOrb(player, orb) {
    orb.destroy();
    this.scene.sound.play("orb", { volume: 0.6 });
    const baseScore = 50;
    const multiplier = this.scene.scoreMultiplier || 1;
    const finalScore = baseScore * multiplier;
    this.scene.addScore(baseScore);
    this.scene.showFloatingText(player.x, player.y, `+${finalScore}`);
  }

  collectPowerup(player, powerup) {
    const type = powerup.getData('type');
    powerup.destroy();
    this.scene.sound.play("orb", { volume: 0.8, detune: 600 }); 

    switch (type) {
        case CONSTS.POWERUPS.TYPE.SHIELD:
            player.activateShield();
            this.scene.showFloatingText(player.x, player.y, "SHIELD!");
            break;
        case CONSTS.POWERUPS.TYPE.GHOST:
            player.activateGhost(CONSTS.POWERUPS.DURATION.GHOST);
            this.scene.showFloatingText(player.x, player.y, "GHOST!");
            break;
        case CONSTS.POWERUPS.TYPE.MAGNET:
            player.activateMagnet(CONSTS.POWERUPS.DURATION.MAGNET);
            this.scene.showFloatingText(player.x, player.y, "MAGNET!");
            break;
        case CONSTS.POWERUPS.TYPE.OVERDRIVE:
            player.activateOverdrive(CONSTS.POWERUPS.DURATION.OVERDRIVE);
            this.scene.showFloatingText(player.x, player.y, "OVERDRIVE!");
            break;
        case CONSTS.POWERUPS.TYPE.EMP:
            this.scene.enemyManager.triggerEMP();
            this.scene.showFloatingText(player.x, player.y, "EMP BLAST!");
            break;
        case CONSTS.POWERUPS.TYPE.TIME_WARP:
            this.activateTimeWarp();
            this.scene.showFloatingText(player.x, player.y, "TIME WARP!");
            break;
        case CONSTS.POWERUPS.TYPE.MULTIPLIER:
            this.scene.activateMultiplier(CONSTS.POWERUPS.DURATION.MULTIPLIER);
            this.scene.showFloatingText(player.x, player.y, "2X SCORE!");
            break;
    }
  }

  activateTimeWarp() {
      this.scene.enemyManager.setTimeWarp(true);
      this.scene.time.delayedCall(CONSTS.POWERUPS.DURATION.TIME_WARP, () => {
          this.scene.enemyManager.setTimeWarp(false);
      });
  }

  update() {
      if (this.scene.player && this.scene.player.hasMagnet) {
          this.orbs.getChildren().forEach(orb => {
              this.scene.physics.moveToObject(orb, this.scene.player, 400);
          });
      }
  }

  getOrbs() { return this.orbs; }
  getPowerups() { return this.powerups; }
}