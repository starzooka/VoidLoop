// src/consts.js
export const CONSTS = {
  PLAYER: {
    ACCEL: 1200,
    DRAG: 0.92,
    MAX_VEL: 320,
    DASH_SPEED: 600,
    DASH_Tc: 1000, // Cooldown in ms
  },
  ENEMY: {
    kV_START: 140, // Initial Speed
    kV_MAX: 600,   // Cap speed
    SPAWN_DELAY_START: 1000,
    SPAWN_DELAY_MIN: 300,
  },
  COLORS: {
    NEON_BLUE: 0x00ffff,
    NEON_PINK: 0xff3366,
    NEON_YELLOW: 0xffff00,
    WARNING_RED: 0xff0000,
  }
};