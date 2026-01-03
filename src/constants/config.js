// Game configuration constants
export const GAME_CONFIG = {
  // Base settings
  BASE_HEALTH: 100,
  BASE_DAY_DURATION: 90,
  BASE_PLAYER_SPEED: 0.06,

  // Camera settings
  CAMERA_FOV: 50,
  CAMERA_HEIGHT: 28,
  CAMERA_DISTANCE: 35,
  CAMERA_FOLLOW_SPEED: 0.03,

  // World settings
  WORLD_SIZE: 120,
  GRID_SIZE: 40,
  GRID_DIVISIONS: 20,
  BUILD_ZONE_MIN: 6,
  BUILD_ZONE_MAX: 14,
  ENEMY_SPAWN_RADIUS: 38,
  PLAYER_BOUNDS_MAX: 35,
  PLAYER_BOUNDS_MIN: 5,

  // Visual settings
  GRASS_COUNT: 800,
  RAIN_PARTICLE_COUNT: 1000,
  FOG_PLANE_COUNT: 8,

  // Timing
  COMBO_DURATION: 2,
  MAX_COMBO_MULTIPLIER: 10,
  WEATHER_CHANGE_INTERVAL: 30,
  WEATHER_CHANGE_CHANCE: 0.3,

  // Combat
  BASE_CRIT_MULTIPLIER: 2,
  RAGE_THRESHOLD: 0.25,

  // Waves
  MAX_WAVES: 10,

  // Animation
  FRAME_TIME_CAP: 0.05,
}

export const COLORS = {
  // Sky and environment
  SKY_DAY: 0x87CEEB,
  SKY_NIGHT: 0x1a1a3a,

  // Ground
  GROUND: 0x4CAF50,
  GRID: 0x3d8b40,

  // GUI elements
  HP_FULL: 0x00FF00,
  HP_MID: 0xFFFF00,
  HP_LOW: 0xFF0000,

  // Lighting
  SUN_DAY: 0xFFFAE6,
  SUN_NIGHT: 0x6666AA,

  // Effects
  EXPLOSION_DEFAULT: 0xFF6B35,
  HEAL: 0x00FF00,
  COMBO: 0xFFAA00,
  HEARTS: 0xFF69B4,
}

export const LIGHTING = {
  SUN_INTENSITY_DAY: 1.5,
  SUN_INTENSITY_NIGHT: 0.25,
  SUN_INTENSITY_RAIN: 0.8,

  AMBIENT_INTENSITY_DAY: 0.5,
  AMBIENT_INTENSITY_NIGHT: 0.15,

  HEMI_SKY: 0x87CEEB,
  HEMI_GROUND: 0x5C4033,
  HEMI_INTENSITY: 0.3,
}

export const FOG = {
  DAY: { color: 0x87CEEB, near: 40, far: 100 },
  NIGHT: { color: 0x1a1a3a, near: 25, far: 60 },
  FOGGY: { color: 0xCCCCCC, near: 15, far: 40 },
  RAINY: { color: 0x6688AA, near: 30, far: 70 },
}

export const STORAGE_KEYS = {
  SKILLS: 'guineaPigTD_skills',
  META: 'guineaPigTD_meta',
}
