// Enemy configurations
export const ENEMY_TYPES = {
  fox: {
    health: 50,
    speed: 0.04,
    damage: 12,
    radius: 1.2,
    color: 0xD2691E,
    attackCooldown: 1.5,
    scoreValue: 5,
  },
  boss_fox: {
    health: 500,
    speed: 0.025,
    damage: 25,
    radius: 3,
    color: 0x8B0000,
    attackCooldown: 1,
    scoreValue: 50,
    scale: 2.5,
  },
  raven: {
    health: 30,
    speed: 0.06,
    damage: 10,
    radius: 0.8,
    color: 0x1a1a1a,
    attackCooldown: 1.5,
    flying: true,
    scoreValue: 5,
  },
  boss_raven: {
    health: 350,
    speed: 0.04,
    damage: 18,
    radius: 1.6,
    color: 0x4B0082,
    attackCooldown: 1,
    flying: true,
    scoreValue: 50,
    scale: 2,
  },
  snake: {
    health: 70,
    speed: 0.055,
    damage: 15,
    radius: 0.6,
    color: 0x228B22,
    attackCooldown: 1.5,
    canPoison: true,
    scoreValue: 5,
  },
}

export const WAVE_CONFIGS = [
  { foxes: 5, ravens: 0, snakes: 0, delay: 1.8 },
  { foxes: 7, ravens: 3, snakes: 0, delay: 1.5 },
  { foxes: 8, ravens: 5, snakes: 2, delay: 1.3, boss: 'fox' },
  { foxes: 12, ravens: 7, snakes: 4, delay: 1.1 },
  { foxes: 15, ravens: 10, snakes: 5, delay: 0.9 },
  { foxes: 18, ravens: 12, snakes: 8, delay: 0.8, boss: 'raven' },
  { foxes: 22, ravens: 15, snakes: 10, delay: 0.7 },
  { foxes: 30, ravens: 20, snakes: 15, delay: 0.5, boss: 'both' },
]

export const TOTAL_WAVES = WAVE_CONFIGS.length
