import Phaser from "phaser";
import { CONSTS } from "../consts";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "player");

    // Add to scene and physics
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Physics Setup
    this.setCollideWorldBounds(true);
    this.setDamping(true);
    this.setDrag(CONSTS.PLAYER.DRAG);
    this.setMaxVelocity(CONSTS.PLAYER.MAX_VEL);
    this.body.setSize(12, 12); 

    // Logic Variables
    this.canDash = true;
    this.isDead = false;
    this.lastDir = new Phaser.Math.Vector2(1, 0);

    // --- Powerup States ---
    this.hasShield = false;
    this.isGhost = false;
    this.hasMagnet = false;
    this.isOverdrive = false;

    this.powerupDuration = 0;
    this.powerupStartTime = 0;

    // Visuals: Trail
    this.trail = scene.add.particles(0, 0, 'player', {
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.3, end: 0 },
        lifespan: 200,
        blendMode: 'ADD',
        frequency: 40,
        follow: this
    });

    // Visuals: Glow
    this.glow = scene.add.sprite(x, y, "player")
        .setScale(1.8)
        .setAlpha(0.25)
        .setTint(CONSTS.COLORS.NEON_BLUE);

    // Visuals: UI Elements
    this.shieldVisual = scene.add.graphics();
    this.magnetVisual = scene.add.graphics();
    this.cooldownBar = scene.add.graphics();
    this.powerupBar = scene.add.graphics();
  }

  update(inputState, touchInput) {
    if (this.isDead) return;

    // 0. Brake Logic
    // Safe check for shift key existence
    const shiftDown = inputState.shift && inputState.shift.isDown;
    const isBraking = shiftDown || touchInput.brake;

    if (isBraking) {
        this.setDrag(CONSTS.PLAYER.BRAKE_DRAG);
        this.setMaxVelocity(CONSTS.PLAYER.BRAKE_VEL);
        this.glow.setTint(0xffaa00);
    } else {
        this.setDrag(CONSTS.PLAYER.DRAG);
        this.setMaxVelocity(CONSTS.PLAYER.MAX_VEL);
        // Only reset glow if no active visual powerups
        if (!this.hasShield && !this.isGhost && !this.isOverdrive) {
            this.glow.setTint(CONSTS.COLORS.NEON_BLUE);
        }
    }

    // 1. Movement Logic
    this.setAcceleration(0);
    const accel = CONSTS.PLAYER.ACCEL;

    if (inputState.left || touchInput.left) { 
        this.setAccelerationX(-accel); this.lastDir.set(-1, 0); 
    }
    if (inputState.right || touchInput.right) { 
        this.setAccelerationX(accel); this.lastDir.set(1, 0); 
    }
    if (inputState.up || touchInput.up) { 
        this.setAccelerationY(-accel); this.lastDir.set(0, -1); 
    }
    if (inputState.down || touchInput.down) { 
        this.setAccelerationY(accel); this.lastDir.set(0, 1); 
    }

    // 2. Dash Logic
    // Safe check for space key existence
    const spaceJustDown = inputState.space ? Phaser.Input.Keyboard.JustDown(inputState.space) : false;
    
    if (spaceJustDown || touchInput.dash) {
        if(touchInput.dash) touchInput.dash = false;
        
        // Dash if allowed OR if Overdrive is active
        if (this.canDash || this.isOverdrive) {
             this.performDash();
        }
    }

    // 3. Update Visuals
    this.glow.setPosition(this.x, this.y);
    this.updateCooldownBar();
    this.updatePowerupBar();
    this.updateShieldVisual();
    this.updateMagnetVisual();
  }

  performDash() {
    this.scene.sound.play("dash", { volume: 0.4 });
    
    // Only apply cooldown if NOT in Overdrive
    if (!this.isOverdrive) {
        this.canDash = false;
        this.setTint(0x555555);
        this.glow.setAlpha(0);
        this.dashTimerStart = this.scene.time.now;
        
        this.scene.time.delayedCall(CONSTS.PLAYER.DASH_Tc, () => {
            if(this.active && !this.isDead && !this.isOverdrive) {
                this.canDash = true;
                this.setTint(this.isGhost ? 0xffffff : CONSTS.COLORS.NEON_BLUE);
                this.glow.setAlpha(0.25);
            }
        });
    }

    this.setVelocity(this.lastDir.x * CONSTS.PLAYER.DASH_SPEED, this.lastDir.y * CONSTS.PLAYER.DASH_SPEED);
  }

  // --- ACTIVATION METHODS ---

  activateShield() { this.hasShield = true; }

  activateGhost(duration) {
    this.isGhost = true;
    this.setTimer(duration);
    this.setAlpha(0.5); 
    this.setTint(0xffffff);
    
    this.scene.time.delayedCall(duration, () => {
        if (this.active) { 
            this.isGhost = false; 
            this.setAlpha(1); 
            this.setTint(CONSTS.COLORS.NEON_BLUE); 
        }
    });
  }

  activateMagnet(duration) {
      this.hasMagnet = true;
      this.setTimer(duration);
      this.scene.time.delayedCall(duration, () => { 
          if(this.active) this.hasMagnet = false; 
      });
  }

  activateOverdrive(duration) {
      this.isOverdrive = true;
      this.setTimer(duration);
      this.canDash = true; 
      
      // Visuals
      this.setTint(CONSTS.COLORS.PW_DRIVE); 
      // REMOVED: this.trail.setTint(...) caused the crash because Emitters don't have setTint
      
      this.scene.time.delayedCall(duration, () => {
          if(this.active) {
              this.isOverdrive = false;
              this.setTint(CONSTS.COLORS.NEON_BLUE);
          }
      });
  }

  setTimer(duration) {
      this.powerupDuration = duration;
      this.powerupStartTime = this.scene.time.now;
  }

  // --- VISUAL UPDATES ---

  updateShieldVisual() {
    this.shieldVisual.clear();
    if (this.hasShield) {
        this.shieldVisual.lineStyle(2, CONSTS.COLORS.NEON_BLUE, 0.8);
        this.shieldVisual.strokeCircle(this.x, this.y, 18);
    }
  }

  updateMagnetVisual() {
      this.magnetVisual.clear();
      if (this.hasMagnet) {
          const radius = 30 + Math.sin(this.scene.time.now / 100) * 5;
          this.magnetVisual.lineStyle(1, CONSTS.COLORS.PW_MAGNET, 0.5);
          this.magnetVisual.strokeCircle(this.x, this.y, radius);
      }
  }

  updatePowerupBar() {
    this.powerupBar.clear();
    const elapsed = this.scene.time.now - this.powerupStartTime;
    const remainingPct = 1 - (elapsed / this.powerupDuration);
    
    if (remainingPct <= 0) return;

    const w = 30; const h = 4;
    const x = this.x - w / 2; const y = this.y - 25;

    this.powerupBar.fillStyle(0x333333, 0.8);
    this.powerupBar.fillRect(x, y, w, h);
    this.powerupBar.fillStyle(0xffffff, 1);
    this.powerupBar.fillRect(x, y, w * remainingPct, h);
  }

  updateCooldownBar() {
    this.cooldownBar.clear();
    if (this.canDash || this.isOverdrive) return; 

    const elapsed = this.scene.time.now - this.dashTimerStart;
    const progress = Phaser.Math.Clamp(elapsed / CONSTS.PLAYER.DASH_Tc, 0, 1);
    const w = 30; const h = 4; const x = this.x - w / 2; const y = this.y + 20;

    this.cooldownBar.fillStyle(0x333333, 1);
    this.cooldownBar.fillRect(x, y, w, h);
    this.cooldownBar.fillStyle(CONSTS.COLORS.NEON_BLUE, 1);
    this.cooldownBar.fillRect(x, y, w * progress, h);
  }

  takeHit() {
    if (this.isGhost) return false;
    if (this.hasShield) {
        this.hasShield = false;
        this.scene.sound.play("explode", { volume: 0.5, rate: 2.0 });
        this.scene.cameras.main.shake(100, 0.01);
        return false;
    }
    return true;
  }

  die() {
    this.isDead = true;
    this.trail.stopFollow();
    this.glow.destroy();
    this.cooldownBar.clear();
    this.powerupBar.clear();
    this.shieldVisual.clear();
    this.magnetVisual.clear();
    this.destroy();
  }
}