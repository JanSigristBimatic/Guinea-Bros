// Skill tree configuration
export const DEFAULT_SKILLS = {
  // Tier 1 - Basic
  startCarrots: {
    level: 0,
    max: 5,
    cost: [10, 20, 35, 50, 75],
    effect: [5, 10, 15, 25, 40],
    name: 'Startkapital',
    desc: '+{} Startkarotten',
    icon: '🥕',
    tier: 1
  },
  baseHealth: {
    level: 0,
    max: 5,
    cost: [15, 30, 50, 75, 100],
    effect: [25, 50, 75, 125, 200],
    name: 'Festungsbau',
    desc: '+{} Basis-HP',
    icon: '🏠',
    tier: 1
  },
  dayLength: {
    level: 0,
    max: 3,
    cost: [20, 40, 70],
    effect: [15, 30, 45],
    name: 'Lange Tage',
    desc: '+{}s Tageslänge',
    icon: '☀️',
    tier: 1
  },

  // Tier 2 - Collectors
  collectorSpeed: {
    level: 0,
    max: 4,
    cost: [25, 50, 80, 120],
    effect: [15, 30, 50, 75],
    name: 'Flinke Sammler',
    desc: '+{}% Sammler-Speed',
    icon: '🏃',
    tier: 2
  },
  collectorCapacity: {
    level: 0,
    max: 3,
    cost: [30, 60, 100],
    effect: [1, 2, 3],
    name: 'Grosse Taschen',
    desc: '+{} Tragekapazität',
    icon: '🎒',
    tier: 2
  },
  autoCollect: {
    level: 0,
    max: 1,
    cost: [150],
    effect: [1],
    name: 'Magnetfeld',
    desc: 'Karotten fliegen zu dir',
    icon: '🧲',
    tier: 2
  },

  // Tier 3 - Buildings
  cheapBuildings: {
    level: 0,
    max: 4,
    cost: [35, 70, 110, 160],
    effect: [10, 20, 30, 40],
    name: 'Effizienter Bau',
    desc: '-{}% Gebäudekosten',
    icon: '🔨',
    tier: 3
  },
  towerDamage: {
    level: 0,
    max: 5,
    cost: [30, 55, 85, 120, 170],
    effect: [20, 40, 65, 100, 150],
    name: 'Scharfschütze',
    desc: '+{}% Turm-Schaden',
    icon: '🎯',
    tier: 3
  },
  towerRange: {
    level: 0,
    max: 3,
    cost: [40, 80, 130],
    effect: [15, 30, 50],
    name: 'Weitsicht',
    desc: '+{}% Turm-Reichweite',
    icon: '👁️',
    tier: 3
  },
  wallHealth: {
    level: 0,
    max: 4,
    cost: [25, 45, 75, 110],
    effect: [50, 100, 175, 300],
    name: 'Stahlmauern',
    desc: '+{} Mauer-HP',
    icon: '🧱',
    tier: 3
  },

  // Tier 4 - Heroes
  heroSpawnRate: {
    level: 0,
    max: 3,
    cost: [50, 100, 175],
    effect: [3, 6, 10],
    name: 'Heldenruf',
    desc: '-{}s Helden-Spawn',
    icon: '⚔️',
    tier: 4
  },
  heroStats: {
    level: 0,
    max: 4,
    cost: [45, 85, 140, 200],
    effect: [15, 30, 50, 80],
    name: 'Elite-Training',
    desc: '+{}% Helden-Stats',
    icon: '💪',
    tier: 4
  },
  startHero: {
    level: 0,
    max: 1,
    cost: [200],
    effect: [1],
    name: 'Veteranen',
    desc: 'Starte mit 1 Held',
    icon: '🦸',
    tier: 4
  },

  // Tier 5 - Special
  critChance: {
    level: 0,
    max: 3,
    cost: [60, 120, 200],
    effect: [10, 20, 35],
    name: 'Kritische Treffer',
    desc: '{}% Crit-Chance',
    icon: '⚡',
    tier: 5
  },
  rageBonus: {
    level: 0,
    max: 2,
    cost: [80, 160],
    effect: [25, 50],
    name: 'Berserker',
    desc: '+{}% Rage-Bonus',
    icon: '🔥',
    tier: 5
  },
  weatherMaster: {
    level: 0,
    max: 2,
    cost: [100, 200],
    effect: [1, 2],
    name: 'Wetterkontrolle',
    desc: 'Bessere Wetter-Effekte',
    icon: '🌤️',
    tier: 5
  },

  // Tier 6 - Ultimate
  goldenAge: {
    level: 0,
    max: 1,
    cost: [500],
    effect: [1],
    name: 'Goldenes Zeitalter',
    desc: 'Goldene Karotten +50% häufiger',
    icon: '✨',
    tier: 6
  },
  fortress: {
    level: 0,
    max: 1,
    cost: [750],
    effect: [1],
    name: 'Uneinnehmbar',
    desc: 'Basis regeneriert 1 HP/s',
    icon: '🏰',
    tier: 6
  },
}

export const SKILL_TIERS = [
  { name: 'Basis', tier: 1, skills: ['startCarrots', 'baseHealth', 'dayLength'] },
  { name: 'Sammler', tier: 2, skills: ['collectorSpeed', 'collectorCapacity', 'autoCollect'] },
  { name: 'Gebäude', tier: 3, skills: ['cheapBuildings', 'towerDamage', 'towerRange', 'wallHealth'] },
  { name: 'Helden', tier: 4, skills: ['heroSpawnRate', 'heroStats', 'startHero'] },
  { name: 'Spezial', tier: 5, skills: ['critChance', 'rageBonus', 'weatherMaster'] },
  { name: 'Ultimate', tier: 6, skills: ['goldenAge', 'fortress'] },
]

export const DEFAULT_META = {
  totalGames: 0,
  bestWave: 0,
  totalCarrots: 0,
  skillPoints: 0,
  bossesKilled: 0,
}
