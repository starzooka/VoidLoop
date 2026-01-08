// src/consts.js
export const CONSTS = {
  // New Resolution Settings
  GAME_WIDTH: 1280,
  GAME_HEIGHT: 720,

  PLAYER: {
    ACCEL: 2000, 
    DRAG: 0.82,
    MAX_VEL: 280,
    BRAKE_VEL: 120,
    BRAKE_DRAG: 0.50,
    DASH_SPEED: 600,
    DASH_Tc: 1000, 
  },
  ENEMY: {
    kV_START: 120,
    kV_MAX: 550,   
    SPAWN_DELAY_START: 1000,
    SPAWN_DELAY_MIN: 300,
  },
  POWERUPS: {
    TYPE: {
      SHIELD: 'shield',
      GHOST: 'ghost',
      MAGNET: 'magnet',
      TIME_WARP: 'time_warp',
      EMP: 'emp',
      OVERDRIVE: 'overdrive',
      MULTIPLIER: 'multiplier'
    },
    DURATION: {
      GHOST: 5000,
      MAGNET: 10000,
      TIME_WARP: 5000,
      OVERDRIVE: 4000,
      MULTIPLIER: 10000
    }
  },
  COLORS: {
    NEON_BLUE: 0x00ffff,
    NEON_PINK: 0xff3366,
    NEON_YELLOW: 0xffff00,
    WARNING_RED: 0xff0000,
    PW_SHIELD: 0x00ffff, 
    PW_GHOST: 0xffffff,  
    PW_MAGNET: 0x9d00ff, 
    PW_TIME: 0x00ff00,   
    PW_EMP: 0xff0000,    
    PW_DRIVE: 0xff8800,  
    PW_MULT: 0xffd700    
  }
};