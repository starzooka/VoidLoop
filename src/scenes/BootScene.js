// src/scenes/BootScene.js
import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    this.load.audio("music", "assets/music.wav");
    this.load.audio("dash", "assets/jump.wav"); 
    this.load.audio("orb", "assets/orb.wav");
    this.load.audio("explode", "assets/explode.wav");
  }

  create() {
    // Switch to MainMenu instead of Game
    this.scene.start("main-menu");
  }
}