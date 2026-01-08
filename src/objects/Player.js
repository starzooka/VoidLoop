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

    // Visuals: Dash Cooldown Bar
    this.cooldownBar = scene.add.graphics();
  }

  /**
   * @param {Object} inputState - Contains booleans for { up, down, left, right } and the Key object for { space }
   * @param {Object} touchInput - Contains booleans for touch controls
   */
  update(inputState, touchInput) {
    if (this.isDead) return;

    // 1. Movement Logic
    this.setAcceleration(0);
    const accel = CONSTS.PLAYER.ACCEL;

    // FIX: Removed .isDown because inputState.left is already a boolean (true/false)
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
    // inputState.space is still a Phaser Key object, so JustDown works here
    const spaceJustDown = Phaser.Input.Keyboard.JustDown(inputState.space);
    
    if ((spaceJustDown || touchInput.dash) && this.canDash) {
        if(touchInput.dash) touchInput.dash = false; // consume touch
        this.performDash();
    }

    // 3. Update Visuals
    this.glow.setPosition(this.x, this.y);
    this.updateCooldownBar();
  }

  performDash() {
    this.scene.sound.play("dash", { volume: 0.4 });
    this.canDash = false;
    this.setVelocity(this.lastDir.x * CONSTS.PLAYER.DASH_SPEED, this.lastDir.y * CONSTS.PLAYER.DASH_SPEED);
    
    // Tint player grey to indicate cooldown
    this.setTint(0x555555);
    this.glow.setAlpha(0);

    // Reset after delay
    this.scene.time.delayedCall(CONSTS.PLAYER.DASH_Tc, () => {
        if(this.active) {
            this.canDash = true;
            this.setTint(CONSTS.COLORS.NEON_BLUE);
            this.glow.setAlpha(0.25);
        }
    });

    // Start cooldown timer for visual bar
    this.dashTimerStart = this.scene.time.now;
  }

  updateCooldownBar() {
    this.cooldownBar.clear();
    if (this.canDash) return;

    const elapsed = this.scene.time.now - this.dashTimerStart;
    const progress = Phaser.Math.Clamp(elapsed / CONSTS.PLAYER.DASH_Tc, 0, 1);
    
    // Draw bar below player
    const w = 30;
    const h = 4;
    const x = this.x - w / 2;
    const y = this.y + 20;

    // Background
    this.cooldownBar.fillStyle(0x333333, 1);
    this.cooldownBar.fillRect(x, y, w, h);

    // Fill
    this.cooldownBar.fillStyle(CONSTS.COLORS.NEON_BLUE, 1);
    this.cooldownBar.fillRect(x, y, w * progress, h);
  }

  die() {
    this.isDead = true;
    this.trail.stopFollow();
    this.glow.destroy();
    this.cooldownBar.clear();
    this.destroy(); // Remove sprite
  }
}