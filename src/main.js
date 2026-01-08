// src/main.js
import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import MainMenuScene from "./scenes/MainMenuScene";
import GameScene from "./scenes/GameScene";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: "game-container",
  backgroundColor: "#05060a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  // Add MainMenuScene to the list
  scene: [BootScene, MainMenuScene, GameScene],
};

new Phaser.Game(config);