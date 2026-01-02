import Phaser from "phaser";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  preload() {
    // 1. Music (ensure your file is public/assets/music.wav)
    this.load.audio("music", "assets/music.wav");
    
    // 2. Dash Sound (Mapped to jump.wav as per your file)
    this.load.audio("dash", "assets/jump.wav"); 
    
    // 3. Game Sounds
    this.load.audio("orb", "assets/orb.wav");
    this.load.audio("explode", "assets/explode.wav");
  }

  create() {
    this.scene.start("game");
  }
}