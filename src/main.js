import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import GameScene from "./scenes/GameScene";

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  // TARGET THE NEW FIXED DIV
  parent: "game-container",
  backgroundColor: "#05060a",
  scale: {
    // FIT mode scales the game to fill the parent, 
    // but the parent is now locked by CSS.
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.NO_CENTER,
  },
  physics: {
    default: "arcade",
    arcade: { debug: false },
  },
  scene: [BootScene, GameScene],
};

new Phaser.Game(config);