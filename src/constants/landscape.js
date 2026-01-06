// Landscape elements configuration
// KayKit forest pack: https://kaylousberg.itch.io/kaykit-forest (CC0 License)

export const LANDSCAPE_CONFIG = {
  useGLBAssets: true, // Enable when landscape GLTF assets are installed
  // Placement zones (relative to WORLD_SIZE 120)
  zones: {
    // Trees placed around edges, outside build/combat zone
    trees: {
      minRadius: 42,     // Outside enemy spawn (38)
      maxRadius: 58,     // Map edge buffer
      count: 25,
      avoidCenter: true, // Don't place in base area
    },
    // Rocks scattered in outer areas
    rocks: {
      minRadius: 35,
      maxRadius: 55,
      count: 40,
      clusterChance: 0.4, // 40% chance to spawn in clusters
      clusterSize: 3,
    },
    // Bushes closer to play area but not blocking
    bushes: {
      minRadius: 25,
      maxRadius: 50,
      count: 30,
      avoidPaths: true,  // Don't block enemy paths
    },
    // Props (stumps, mushrooms, logs) scattered
    props: {
      minRadius: 20,
      maxRadius: 55,
      count: 20,
    },
    // Resource trees closer to play area for beaver harvesting
    resourceTrees: {
      minRadius: 20,
      maxRadius: 35,
      count: 15,
      avoidCenter: true,
    },
  },
}

// Asset definitions with path, scale, and placement settings
export const LANDSCAPE_ASSETS = {
  trees: [
    {
      id: 'tree_1_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_1_A_Color1.gltf',
      scale: 2.1,
      yOffset: 0,
      weight: 3, // Spawn probability weight
      castShadow: true,
    },
    {
      id: 'tree_1_c',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_1_C_Color1.gltf',
      scale: 2.0,
      yOffset: 0,
      weight: 2,
      castShadow: true,
    },
    {
      id: 'tree_2_b',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_2_B_Color1.gltf',
      scale: 2.2,
      yOffset: 0,
      weight: 3,
      castShadow: true,
    },
    {
      id: 'tree_3_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_3_A_Color1.gltf',
      scale: 2.4,
      yOffset: 0,
      weight: 2,
      castShadow: true,
    },
    {
      id: 'tree_4_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_4_A_Color1.gltf',
      scale: 2.3,
      yOffset: 0,
      weight: 2,
      castShadow: true,
    },
    {
      id: 'tree_bare_1_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_Bare_1_A_Color1.gltf',
      scale: 2.0,
      yOffset: 0,
      weight: 1,
      castShadow: true,
    },
    {
      id: 'tree_bare_2_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Tree_Bare_2_A_Color1.gltf',
      scale: 1.9,
      yOffset: 0,
      weight: 1,
      castShadow: true,
    },
  ],

  rocks: [
    {
      id: 'rock_1_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_1_A_Color1.gltf',
      scale: 1.1,
      yOffset: -0.12,
      weight: 3,
      castShadow: true,
    },
    {
      id: 'rock_1_f',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_1_F_Color1.gltf',
      scale: 1.0,
      yOffset: -0.1,
      weight: 3,
      castShadow: true,
    },
    {
      id: 'rock_2_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_2_A_Color1.gltf',
      scale: 1.0,
      yOffset: -0.08,
      weight: 4,
      castShadow: true,
    },
    {
      id: 'rock_2_e',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_2_E_Color1.gltf',
      scale: 0.95,
      yOffset: -0.08,
      weight: 4,
      castShadow: true,
    },
    {
      id: 'rock_3_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_3_A_Color1.gltf',
      scale: 0.9,
      yOffset: -0.06,
      weight: 4,
      castShadow: true,
    },
    {
      id: 'rock_3_h',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Rock_3_H_Color1.gltf',
      scale: 1.0,
      yOffset: -0.08,
      weight: 3,
      castShadow: true,
    },
  ],

  bushes: [
    {
      id: 'bush_1_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Bush_1_A_Color1.gltf',
      scale: 1.0,
      yOffset: 0,
      weight: 3,
      castShadow: false,
    },
    {
      id: 'bush_1_d',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Bush_1_D_Color1.gltf',
      scale: 0.9,
      yOffset: 0,
      weight: 3,
      castShadow: false,
    },
    {
      id: 'bush_2_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Bush_2_A_Color1.gltf',
      scale: 0.85,
      yOffset: 0,
      weight: 4,
      castShadow: false,
    },
    {
      id: 'bush_2_d',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Bush_2_D_Color1.gltf',
      scale: 0.85,
      yOffset: 0,
      weight: 3,
      castShadow: false,
    },
    {
      id: 'bush_3_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Bush_3_A_Color1.gltf',
      scale: 0.75,
      yOffset: 0,
      weight: 2,
      castShadow: false,
    },
    {
      id: 'bush_4_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Bush_4_A_Color1.gltf',
      scale: 1.05,
      yOffset: 0,
      weight: 2,
      castShadow: false,
    },
  ],

  props: [
    {
      id: 'grass_1_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Grass_1_A_Color1.gltf',
      scale: 0.9,
      yOffset: 0,
      weight: 4,
      castShadow: false,
    },
    {
      id: 'grass_1_c',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Grass_1_C_Color1.gltf',
      scale: 0.85,
      yOffset: 0,
      weight: 4,
      castShadow: false,
    },
    {
      id: 'grass_2_a',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Grass_2_A_Color1.gltf',
      scale: 0.9,
      yOffset: 0,
      weight: 4,
      castShadow: false,
    },
    {
      id: 'grass_2_c',
      path: '/glb/KayKit_Forest_Nature_Pack_1.0_FREE/Assets/gltf/Grass_2_C_Color1.gltf',
      scale: 0.85,
      yOffset: 0,
      weight: 4,
      castShadow: false,
    },
    {
      id: 'stump_a',
      path: '/glb/KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/nature/tree_single_A_cut.gltf',
      scale: 1.0,
      yOffset: 0,
      weight: 2,
      castShadow: true,
    },
    {
      id: 'stump_b',
      path: '/glb/KayKit_Medieval_Hexagon_Pack_1.0_FREE/Assets/gltf/decoration/nature/tree_single_B_cut.gltf',
      scale: 1.0,
      yOffset: 0,
      weight: 2,
      castShadow: true,
    },
  ],
}

// Fallback procedural landscape (if no GLB assets loaded)
export const PROCEDURAL_LANDSCAPE = {
  enabled: true, // Use procedural if GLB loading fails

  trees: {
    trunkColor: 0x8B4513,
    leavesColor: 0x228B22,
    variants: ['pine', 'oak', 'birch'],
  },

  rocks: {
    colors: [0x808080, 0x696969, 0x778899],
    roughness: 0.9,
  },

  bushes: {
    color: 0x2E8B57,
    berryColor: 0xDC143C,
  },
}

// Seasonal variations (optional future feature)
export const SEASONAL_COLORS = {
  spring: {
    leaves: 0x90EE90,
    grass: 0x7CFC00,
  },
  summer: {
    leaves: 0x228B22,
    grass: 0x4CAF50,
  },
  autumn: {
    leaves: 0xDAA520,
    grass: 0x9ACD32,
  },
  winter: {
    leaves: 0xFFFFFF,
    grass: 0xF0FFF0,
  },
}
