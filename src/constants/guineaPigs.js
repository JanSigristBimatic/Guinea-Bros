// Guinea pig type configurations
export const GUINEA_PIG_TYPES = {
  player: {
    c1: 0xFFD700,
    c2: 0xFFFACD,
    name: 'Commander',
    isPlayer: true,
  },
  partner1: {
    c1: 0xD2691E,
    c2: 0xF5F5DC,
    name: 'Brownie',
    isPartner: true,
  },
  partner2: {
    c1: 0x2F2F2F,
    c2: 0xFFFFFF,
    name: 'Oreo',
    isPartner: true,
  },
  partner3: {
    c1: 0x8B4513,
    c2: 0xFFA500,
    name: 'Caramel',
    isPartner: true,
  },
  collector: {
    c1: 0xFFA500,
    c2: 0xFFE4B5,
    name: 'Sammler',
    baseSpeed: 0.04,
    baseMaxCarry: 2,
  },
  tunneler: {
    c1: 0x8B4513,
    c2: 0xD2691E,
    name: 'Tunneler',
    attackRange: 5,
    baseDamage: 18,
    ability: 'slow',
    abilityRange: 5,
    abilityDuration: 4,
  },
  shadow: {
    c1: 0x2F2F2F,
    c2: 0x696969,
    name: 'Shadow',
    attackRange: 5,
    baseDamage: 18,
    ability: 'confuse',
    abilityDuration: 5,
  },
  bomber: {
    c1: 0xFF6B35,
    c2: 0xFFD700,
    name: 'Bomber',
    attackRange: 7,
    baseDamage: 30,
    useProjectiles: true,
    attackCooldown: 2,
  },
  healer: {
    c1: 0xFFFFFF,
    c2: 0xFFB6C1,
    name: 'Healer',
    attackRange: 5,
    baseDamage: 18,
    ability: 'heal',
    abilityRange: 6,
    healAmount: 20,
  },
  tank: {
    c1: 0x4682B4,
    c2: 0xB0C4DE,
    name: 'Tank',
    attackRange: 5,
    baseDamage: 18,
    ability: 'taunt',
    abilityRange: 8,
  },
  assassin: {
    c1: 0x800080,
    c2: 0xDA70D6,
    name: 'Assassin',
    attackRange: 3,
    baseDamage: 45,
    attackCooldown: 0.8,
    ability: 'teleport',
  },
}

export const HERO_TYPES = ['tunneler', 'shadow', 'bomber', 'healer', 'tank', 'assassin']

export const BASE_HERO_HEALTH = 50
export const BASE_HERO_SPEED = 0.025
