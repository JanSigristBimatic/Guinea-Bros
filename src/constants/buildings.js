// Building configurations
export const BUILDING_TYPES = {
  collectorHut: {
    baseCost: 15,
    health: 200,
    spawnInterval: 30,
    maxCollectors: 3,
    color: { wood: 0xDEB887, roof: 0x8FBC8F, accent: 0xF4A460 },
    icon: '🧺',
    label: 'Sammler-Hütte',
    description: 'Spawnt automatische Karottensammler',
  },
  heroHut: {
    baseCost: 35,
    health: 200,
    baseSpawnTime: 20,
    color: { wood: 0xCD853F, roof: 0x4169E1, accent: 0xFFD700 },
    icon: '⚔️',
    label: 'Helden-Hütte',
    description: 'Spawnt zufällige Helden zur Verteidigung',
  },
  tower: {
    baseCost: 25,
    health: 200,
    baseRange: 12,
    baseDamage: 25,
    attackCooldown: 1.5,
    color: { wood: 0xA0522D, roof: 0x8B0000, accent: 0x2F4F4F },
    icon: '🗼',
    label: 'Wachturm',
    description: 'Schiesst automatisch auf Feinde',
  },
  wall: {
    baseCost: 8,
    baseHealth: 100,
    color: { wood: 0x696969, roof: 0x696969, accent: 0x808080 },
    icon: '🧱',
    label: 'Mauer',
    description: 'Blockiert Feinde und absorbiert Schaden',
  },
  beaverHut: {
    baseCost: 20,
    health: 180,
    spawnInterval: 25,
    maxBeavers: 2,
    color: { wood: 0x8B4513, roof: 0xA0522D, accent: 0xD2691E },
    icon: '🦫',
    label: 'Biber-Hütte',
    description: 'Spawnt Biber die Holz sammeln und reparieren',
  },
}

export const BUILDING_ICONS = {
  collectorHut: { color: 0xFFA500, size: 0.2 },
  heroHut: { color: 0x9932CC, size: 0.2 },
  tower: { color: 0xFF4500, size: 0.2 },
  beaverHut: { color: 0x8B4513, size: 0.2 },
}

// Quick access to building costs
export const BUILDING_COSTS = {
  collectorHut: BUILDING_TYPES.collectorHut.baseCost,
  heroHut: BUILDING_TYPES.heroHut.baseCost,
  tower: BUILDING_TYPES.tower.baseCost,
  wall: BUILDING_TYPES.wall.baseCost,
  beaverHut: BUILDING_TYPES.beaverHut.baseCost,
}
