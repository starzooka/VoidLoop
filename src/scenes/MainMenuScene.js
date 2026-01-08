// src/scenes/MainMenuScene.js
import Phaser from "phaser";
import { CONSTS } from "../consts";

export default class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("main-menu");
  }

  create() {
    const { width, height } = this.scale;
    const centerX = width * 0.5;
    const centerY = height * 0.5;

    // Title with Flicker Effect
    const title = this.add.text(centerX, centerY - 100, "VOIDLOOP", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "48px",
      color: "#00ffff",
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      alpha: 0.7,
      duration: 100,
      yoyo: true,
      repeat: -1,
      repeatDelay: 2000
    });

    // High Score
    const highScore = localStorage.getItem('high_score') || 0;
    this.add.text(centerX, centerY, `BEST: ${highScore}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "16px",
      color: "#ff00de",
    }).setOrigin(0.5);

    // Start Prompt
    const startText = this.add.text(centerX, centerY + 100, "CLICK TO START", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "20px",
      color: "#ffffff",
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      scaleX: 1.1, scaleY: 1.1,
      duration: 800, yoyo: true, repeat: -1
    });

    // Interaction to Start
    this.input.on('pointerdown', () => {
       this.scene.start('game');
    });
  }
}