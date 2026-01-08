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

    // --- UI CLEANUP ---
    // Hide Pause Button in Menu (Start state)
    const pauseBtn = document.getElementById('btn-pause-header');
    if (pauseBtn) pauseBtn.style.display = 'none';

    // Ensure Pause Menu Overlay is hidden
    const pauseMenu = document.getElementById('pause-menu');
    if (pauseMenu) pauseMenu.classList.add('hidden');

    // --- VISUALS ---
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

    // Start Prompt Text
    const startText = this.add.text(centerX, centerY + 100, "PRESS ANY BUTTON", {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: "20px",
      color: "#ffffff",
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      scaleX: 1.1, scaleY: 1.1,
      duration: 800, yoyo: true, repeat: -1
    });

    // --- INPUTS (Press Any Button Logic) ---
    
    // 1. Mouse / Touch Interaction
    this.input.once('pointerdown', () => {
       this.startGame();
    });

    // 2. Keyboard Interaction (Any Key)
    this.input.keyboard.once('keydown', () => {
        this.startGame();
    });
  }

  startGame() {
      this.scene.start('game');
  }
}