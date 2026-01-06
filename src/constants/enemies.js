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

// Enemy AI Behavior profiles for the Threat/Aggro system
export const ENEMY_BEHAVIOR = {
  fox: {
    defenderFocus: 0.6,       // Greift Verteidiger gerne an
    threatMultiplier: 1.2,    // Reagiert stark auf Damage
    retaliationChance: 0.8,   // 80% Chance zurückzuschlagen
    aggroRange: 10,           // Sieht Angreifer in 10 Einheiten
    leashRange: 12,           // Kehrt nach 12 Einheiten um
  },
  boss_fox: {
    defenderFocus: 0.4,       // Fokussiert mehr auf Ziel
    threatMultiplier: 0.8,
    retaliationChance: 0.5,
    aggroRange: 12,
    leashRange: 15,
  },
  raven: {
    defenderFocus: 0.7,       // Hasst Ranged-Einheiten
    threatMultiplier: 1.5,    // Sehr reaktiv
    retaliationChance: 0.9,
    aggroRange: 14,           // Fliegt = sieht weiter
    leashRange: 20,
    priorityTargets: ['bomber', 'tower'], // Zielt auf Ranged
  },
  boss_raven: {
    defenderFocus: 0.5,
    threatMultiplier: 1.0,
    retaliationChance: 0.6,
    aggroRange: 16,
    leashRange: 25,
    priorityTargets: ['bomber', 'tower'],
  },
  snake: {
    defenderFocus: 0.2,       // Bleibt bei Buildings
    threatMultiplier: 0.5,    // Ignoriert meist Damage
    retaliationChance: 0.3,   // Nur 30% Retaliation
    aggroRange: 6,
    leashRange: 8,
  },
}
