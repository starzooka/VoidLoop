// src/main.js
import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import MainMenuScene from "./scenes/MainMenuScene";
import GameScene from "./scenes/GameScene";
import { CONSTS } from "./consts";

const config = {
  type: Phaser.AUTO,
  width: CONSTS.GAME_WIDTH,   // 1280
  height: CONSTS.GAME_HEIGHT, // 720
  parent: "game-container",
  backgroundColor: "#05060a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH, // Centers game on screen
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [BootScene, MainMenuScene, GameScene],
};

new Phaser.Game(config);