import * as THREE from 'three'
import { BUILDING_TYPES, BUILDING_ICONS } from '../../constants'
import { createMaterial } from '../utils/three-helpers'

export function createBuilding(type, skillEffects = {}) {
  const group = new THREE.Group()
  const config = BUILDING_TYPES[type]
  const colors = config.color

  const wallHealthBonus = skillEffects.wallHealth || 0

  group.userData = {
    type,
    spawnTimer: 0,
    health: type === 'wall' ? (config.baseHealth + wallHealthBonus) : config.health,
    maxHealth: type === 'wall' ? (config.baseHealth + wallHealthBonus) : config.health,
    attackCooldown: 0,
  }

  if (type === 'wall') {
    // Simple wall segment
    const wallGeo = new THREE.BoxGeometry(2, 1.8, 0.6)
    const wallMat = createMaterial(colors.wood, { roughness: 0.9 })
    const wall = new THREE.Mesh(wallGeo, wallMat)
    wall.position.y = 0.9
    wall.castShadow = true
    wall.receiveShadow = true
    group.add(wall)

    // Top detail
    const topGeo = new THREE.BoxGeometry(2.2, 0.3, 0.8)
    const top = new THREE.Mesh(topGeo, createMaterial(0x4a4a4a))
    top.position.y = 1.95
    top.castShadow = true
    group.add(top)
  } else {
    const wallHeight = type === 'tower' ? 2.5 : 1.4
    const wallThickness = 0.15

    // Base/floor
    const baseGeo = new THREE.BoxGeometry(2.4, 0.3, 2.4)
    const baseMat = createMaterial(colors.wood, { roughness: 0.8 })
    const base = new THREE.Mesh(baseGeo, baseMat)
    base.position.y = 0.15
    base.castShadow = true
    base.receiveShadow = true
    group.add(base)

    // Walls
    const wallMat = createMaterial(colors.wood, { roughness: 0.7 })

    // Front wall with hole
    const frontGeo = new THREE.BoxGeometry(2.2, wallHeight, wallThickness)
    const front = new THREE.Mesh(frontGeo, wallMat)
    front.position.set(0, wallHeight / 2 + 0.3, 1.05)
    front.castShadow = true
    group.add(front)

    // Entrance hole
    const holeGeo = new THREE.CircleGeometry(0.45, 16)
    const holeMat = createMaterial(0x1a1a1a)
    const hole = new THREE.Mesh(holeGeo, holeMat)
    hole.position.set(0, 0.7, 1.06)
    group.add(hole)

    // Arch around hole
    const archGeo = new THREE.TorusGeometry(0.5, 0.08, 8, 16, Math.PI)
    const archMat = createMaterial(colors.accent)
    const arch = new THREE.Mesh(archGeo, archMat)
    arch.position.set(0, 0.7, 1.08)
    arch.rotation.z = Math.PI
    group.add(arch)

    // Back wall
    const back = new THREE.Mesh(frontGeo, wallMat)
    back.position.set(0, wallHeight / 2 + 0.3, -1.05)
    back.castShadow = true
    group.add(back)

    // Side walls
    const sideGeo = new THREE.BoxGeometry(wallThickness, wallHeight, 2.2)
    ;[-1.05, 1.05].forEach(x => {
      const side = new THREE.Mesh(sideGeo, wallMat)
      side.position.set(x, wallHeight / 2 + 0.3, 0)
      side.castShadow = true
      group.add(side)
    })

    // Roof
    if (type !== 'tower') {
      const roofGeo = new THREE.ConeGeometry(1.8, 1.2, 4)
      const roofMat = createMaterial(colors.roof, { roughness: 0.9 })
      const roof = new THREE.Mesh(roofGeo, roofMat)
      roof.position.y = wallHeight + 0.8
      roof.rotation.y = Math.PI / 4
      roof.castShadow = true
      group.add(roof)

      // Straw details
      for (let i = 0; i < 12; i++) {
        const strawGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 4)
        const strawMat = createMaterial(0xF5DEB3)
        const straw = new THREE.Mesh(strawGeo, strawMat)
        const angle = (i / 12) * Math.PI * 2
        straw.position.set(Math.cos(angle) * 1.5, wallHeight + 0.5, Math.sin(angle) * 1.5)
        straw.rotation.x = Math.random() * 0.3
        straw.rotation.z = Math.random() * 0.3
        group.add(straw)
      }
    } else {
      // Tower pointed roof with flag
      const towerRoofGeo = new THREE.ConeGeometry(1.5, 1.8, 8)
      const towerRoofMat = createMaterial(colors.roof)
      const towerRoof = new THREE.Mesh(towerRoofGeo, towerRoofMat)
      towerRoof.position.y = wallHeight + 1.1
      towerRoof.castShadow = true
      group.add(towerRoof)

      // Flag pole
      const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6)
      const pole = new THREE.Mesh(poleGeo, createMaterial(0x8B4513))
      pole.position.y = wallHeight + 2.2
      group.add(pole)

      // Flag
      const flagGeo = new THREE.PlaneGeometry(0.6, 0.4)
      const flagMat = createMaterial(0xFF0000, { side: THREE.DoubleSide })
      const flag = new THREE.Mesh(flagGeo, flagMat)
      flag.position.set(0.35, wallHeight + 2.5, 0)
      group.add(flag)
      group.userData.flag = flag

      // Crossbow
      const crossbowGeo = new THREE.BoxGeometry(0.8, 0.2, 0.2)
      const crossbow = new THREE.Mesh(crossbowGeo, createMaterial(0x4a3000))
      crossbow.position.y = wallHeight + 0.5
      group.add(crossbow)
      group.userData.crossbow = crossbow
    }

    // Ramp
    const rampGeo = new THREE.BoxGeometry(0.6, 0.1, 0.8)
    const rampMat = createMaterial(colors.wood)
    const ramp = new THREE.Mesh(rampGeo, rampMat)
    ramp.position.set(0, 0.2, 1.5)
    ramp.rotation.x = 0.3
    ramp.castShadow = true
    group.add(ramp)

    // Type indicator
    if (BUILDING_ICONS[type]) {
      const indicatorGeo = new THREE.SphereGeometry(0.2, 8, 8)
      const indicatorMat = new THREE.MeshBasicMaterial({ color: BUILDING_ICONS[type].color })
      const indicator = new THREE.Mesh(indicatorGeo, indicatorMat)
      indicator.position.y = type === 'tower' ? 4.5 : 2.8
      group.add(indicator)
      group.userData.indicator = indicator
    }
  }

  // HP bar
  const hpBgGeo = new THREE.PlaneGeometry(2, 0.2)
  const hpBg = new THREE.Mesh(hpBgGeo, new THREE.MeshBasicMaterial({ color: 0x333333 }))
  hpBg.position.y = type === 'wall' ? 2.5 : (type === 'tower' ? 5 : 3.2)
  hpBg.rotation.x = -0.3
  group.add(hpBg)

  const hpBarGeo = new THREE.PlaneGeometry(1.9, 0.15)
  const hpBar = new THREE.Mesh(hpBarGeo, new THREE.MeshBasicMaterial({ color: 0x00FF00 }))
  hpBar.position.y = type === 'wall' ? 2.52 : (type === 'tower' ? 5.02 : 3.22)
  hpBar.rotation.x = -0.3
  group.add(hpBar)
  group.userData.hpBar = hpBar

  return group
}

// Update building HP bar
export function updateBuildingHPBar(building) {
  if (building.userData.hpBar) {
    const hp = building.userData.health / building.userData.maxHealth
    building.userData.hpBar.scale.x = Math.max(0.01, hp)
    building.userData.hpBar.material.color.setHex(
      hp > 0.5 ? 0x00FF00 : (hp > 0.25 ? 0xFFFF00 : 0xFF0000)
    )
  }
}

// ============================================================================
// WALL SEGMENT SYSTEM - Creates different wall geometries based on neighbors
// ============================================================================

const WALL_COLORS = {
  main: 0x696969,    // Dark gray stone
  accent: 0x808080,  // Lighter gray
  top: 0x4a4a4a,     // Dark top cap
  wood: 0x8B4513    // Wood accents
}

const WALL_HEIGHT = 1.8
const WALL_WIDTH = 2.0   // Grid cell size
const WALL_THICKNESS = 0.6
const DIAGONAL_SCALE = Math.SQRT2

// Create a wall segment based on type
export function createWallSegment(segmentType, colors = WALL_COLORS) {
  const group = new THREE.Group()

  switch (segmentType) {
    case 'post':
      createPostSegment(group, colors)
      break
    case 'end':
      createEndSegment(group, colors)
      break
    case 'straight':
      createStraightSegment(group, colors)
      break
    case 'gate':
      createGateSegment(group, colors)
      break
    case 'diagonal':
      createDiagonalSegment(group, colors)
      break
    case 'corner':
      createCornerSegment(group, colors)
      break
    case 'tee':
      createTeeSegment(group, colors)
      break
    case 'cross':
      createCrossSegment(group, colors)
      break
    default:
      createPostSegment(group, colors) // Fallback
  }

  return group
}

// Post segment (0 neighbors) - single pillar
function createPostSegment(group, colors) {
  const mat = createMaterial(colors.main, { roughness: 0.9 })

  // Main pillar
  const postGeo = new THREE.BoxGeometry(0.8, WALL_HEIGHT, 0.8)
  const post = new THREE.Mesh(postGeo, mat)
  post.position.y = WALL_HEIGHT / 2
  post.castShadow = true
  post.receiveShadow = true
  group.add(post)

  // Top cap
  const capGeo = new THREE.BoxGeometry(1.0, 0.25, 1.0)
  const cap = new THREE.Mesh(capGeo, createMaterial(colors.top))
  cap.position.y = WALL_HEIGHT + 0.125
  cap.castShadow = true
  group.add(cap)

  // Decorative top point
  const pointGeo = new THREE.ConeGeometry(0.35, 0.5, 4)
  const point = new THREE.Mesh(pointGeo, createMaterial(colors.top))
  point.position.y = WALL_HEIGHT + 0.5
  point.rotation.y = Math.PI / 4
  point.castShadow = true
  group.add(point)
}

// End segment (1 neighbor) - wall with end cap, extends toward +Z
function createEndSegment(group, colors) {
  const mat = createMaterial(colors.main, { roughness: 0.9 })

  // Wall section extending toward +Z
  const wallGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, WALL_WIDTH / 2 + 0.1)
  const wall = new THREE.Mesh(wallGeo, mat)
  wall.position.set(0, WALL_HEIGHT / 2, WALL_WIDTH / 4)
  wall.castShadow = true
  wall.receiveShadow = true
  group.add(wall)

  // End pillar at center
  const postGeo = new THREE.BoxGeometry(0.8, WALL_HEIGHT, 0.8)
  const post = new THREE.Mesh(postGeo, mat)
  post.position.y = WALL_HEIGHT / 2
  post.castShadow = true
  group.add(post)

  // Top cap
  const capGeo = new THREE.BoxGeometry(1.0, 0.25, WALL_WIDTH / 2 + 0.5)
  const cap = new THREE.Mesh(capGeo, createMaterial(colors.top))
  cap.position.set(0, WALL_HEIGHT + 0.125, WALL_WIDTH / 4)
  cap.castShadow = true
  group.add(cap)

  // Decorative point at end
  const pointGeo = new THREE.ConeGeometry(0.35, 0.5, 4)
  const point = new THREE.Mesh(pointGeo, createMaterial(colors.top))
  point.position.y = WALL_HEIGHT + 0.5
  point.rotation.y = Math.PI / 4
  point.castShadow = true
  group.add(point)
}

// Straight segment (2 opposite neighbors) - extends along Z axis
function createStraightSegment(group, colors, lengthScale = 1) {
  const mat = createMaterial(colors.main, { roughness: 0.9 })
  const length = WALL_WIDTH * lengthScale
  const topLength = (WALL_WIDTH + 0.1) * lengthScale
  const crenelDepth = 0.3 * lengthScale

  // Main wall (full length)
  const wallGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, length)
  const wall = new THREE.Mesh(wallGeo, mat)
  wall.position.y = WALL_HEIGHT / 2
  wall.castShadow = true
  wall.receiveShadow = true
  group.add(wall)

  // Top cap
  const topGeo = new THREE.BoxGeometry(WALL_THICKNESS + 0.2, 0.25, topLength)
  const top = new THREE.Mesh(topGeo, createMaterial(colors.top))
  top.position.y = WALL_HEIGHT + 0.125
  top.castShadow = true
  group.add(top)

  // Crenelations (battlements)
  const crenelGeo = new THREE.BoxGeometry(WALL_THICKNESS + 0.1, 0.3, crenelDepth)
  const crenelMat = createMaterial(colors.top)
  ;[-0.6, 0, 0.6].forEach(z => {
    const crenel = new THREE.Mesh(crenelGeo, crenelMat)
    crenel.position.set(0, WALL_HEIGHT + 0.4, z * lengthScale)
    crenel.castShadow = true
    group.add(crenel)
  })
}

// Gate segment (passable for allies, blocks enemies)
function createGateSegment(group, colors) {
  const mat = createMaterial(colors.main, { roughness: 0.9 })
  const topMat = createMaterial(colors.top)
  const postDepth = 0.6

  const postGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, postDepth)
  const leftPost = new THREE.Mesh(postGeo, mat)
  leftPost.position.set(0, WALL_HEIGHT / 2, -WALL_WIDTH / 2 + postDepth / 2)
  leftPost.castShadow = true
  leftPost.receiveShadow = true
  group.add(leftPost)

  const rightPost = new THREE.Mesh(postGeo, mat)
  rightPost.position.set(0, WALL_HEIGHT / 2, WALL_WIDTH / 2 - postDepth / 2)
  rightPost.castShadow = true
  rightPost.receiveShadow = true
  group.add(rightPost)

  const topGeo = new THREE.BoxGeometry(WALL_THICKNESS + 0.2, 0.25, WALL_WIDTH + 0.1)
  const top = new THREE.Mesh(topGeo, topMat)
  top.position.y = WALL_HEIGHT + 0.125
  top.castShadow = true
  group.add(top)
}

// Diagonal segment - straight wall scaled to connect diagonal neighbors
function createDiagonalSegment(group, colors) {
  createStraightSegment(group, colors, DIAGONAL_SCALE)
}

// Corner segment (2 adjacent neighbors) - L shape, default connects N and E
function createCornerSegment(group, colors) {
  const mat = createMaterial(colors.main, { roughness: 0.9 })

  // North wall section (extends toward +Z)
  const wallNorthGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, WALL_WIDTH / 2 + WALL_THICKNESS / 2)
  const wallNorth = new THREE.Mesh(wallNorthGeo, mat)
  wallNorth.position.set(0, WALL_HEIGHT / 2, WALL_WIDTH / 4)
  wallNorth.castShadow = true
  wallNorth.receiveShadow = true
  group.add(wallNorth)

  // East wall section (extends toward +X)
  const wallEastGeo = new THREE.BoxGeometry(WALL_WIDTH / 2, WALL_HEIGHT, WALL_THICKNESS)
  const wallEast = new THREE.Mesh(wallEastGeo, mat)
  wallEast.position.set(WALL_WIDTH / 4, WALL_HEIGHT / 2, 0)
  wallEast.castShadow = true
  wallEast.receiveShadow = true
  group.add(wallEast)

  // Corner pillar (bigger for stability look)
  const cornerGeo = new THREE.BoxGeometry(0.9, WALL_HEIGHT + 0.1, 0.9)
  const corner = new THREE.Mesh(cornerGeo, mat)
  corner.position.y = WALL_HEIGHT / 2 + 0.05
  corner.castShadow = true
  group.add(corner)

  // L-shaped top cap
  const topMat = createMaterial(colors.top)

  const topNorth = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS + 0.2, 0.25, WALL_WIDTH / 2 + 0.3),
    topMat
  )
  topNorth.position.set(0, WALL_HEIGHT + 0.125, WALL_WIDTH / 4)
  topNorth.castShadow = true
  group.add(topNorth)

  const topEast = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_WIDTH / 2 + 0.3, 0.25, WALL_THICKNESS + 0.2),
    topMat
  )
  topEast.position.set(WALL_WIDTH / 4, WALL_HEIGHT + 0.125, 0)
  topEast.castShadow = true
  group.add(topEast)

  // Corner decoration
  const pointGeo = new THREE.ConeGeometry(0.4, 0.6, 4)
  const point = new THREE.Mesh(pointGeo, topMat)
  point.position.y = WALL_HEIGHT + 0.55
  point.rotation.y = Math.PI / 4
  point.castShadow = true
  group.add(point)
}

// Tee segment (3 neighbors) - T shape, default missing south
function createTeeSegment(group, colors) {
  const mat = createMaterial(colors.main, { roughness: 0.9 })
  const topMat = createMaterial(colors.top)

  // Full east-west wall
  const wallEWGeo = new THREE.BoxGeometry(WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS)
  const wallEW = new THREE.Mesh(wallEWGeo, mat)
  wallEW.position.y = WALL_HEIGHT / 2
  wallEW.castShadow = true
  wallEW.receiveShadow = true
  group.add(wallEW)

  // North extension
  const wallNGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, WALL_WIDTH / 2)
  const wallN = new THREE.Mesh(wallNGeo, mat)
  wallN.position.set(0, WALL_HEIGHT / 2, WALL_WIDTH / 4)
  wallN.castShadow = true
  wallN.receiveShadow = true
  group.add(wallN)

  // Center pillar
  const centerGeo = new THREE.BoxGeometry(0.9, WALL_HEIGHT + 0.1, 0.9)
  const center = new THREE.Mesh(centerGeo, mat)
  center.position.y = WALL_HEIGHT / 2 + 0.05
  center.castShadow = true
  group.add(center)

  // Top caps
  const topEW = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_WIDTH + 0.1, 0.25, WALL_THICKNESS + 0.2),
    topMat
  )
  topEW.position.y = WALL_HEIGHT + 0.125
  topEW.castShadow = true
  group.add(topEW)

  const topN = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS + 0.2, 0.25, WALL_WIDTH / 2 + 0.2),
    topMat
  )
  topN.position.set(0, WALL_HEIGHT + 0.125, WALL_WIDTH / 4)
  topN.castShadow = true
  group.add(topN)

  // Center decoration
  const pointGeo = new THREE.ConeGeometry(0.4, 0.6, 4)
  const point = new THREE.Mesh(pointGeo, topMat)
  point.position.y = WALL_HEIGHT + 0.55
  point.rotation.y = Math.PI / 4
  point.castShadow = true
  group.add(point)
}

// Cross segment (4 neighbors) - + shape
function createCrossSegment(group, colors) {
  const mat = createMaterial(colors.main, { roughness: 0.9 })
  const topMat = createMaterial(colors.top)

  // North-South wall
  const wallNSGeo = new THREE.BoxGeometry(WALL_THICKNESS, WALL_HEIGHT, WALL_WIDTH)
  const wallNS = new THREE.Mesh(wallNSGeo, mat)
  wallNS.position.y = WALL_HEIGHT / 2
  wallNS.castShadow = true
  wallNS.receiveShadow = true
  group.add(wallNS)

  // East-West wall
  const wallEWGeo = new THREE.BoxGeometry(WALL_WIDTH, WALL_HEIGHT, WALL_THICKNESS)
  const wallEW = new THREE.Mesh(wallEWGeo, mat)
  wallEW.position.y = WALL_HEIGHT / 2
  wallEW.castShadow = true
  wallEW.receiveShadow = true
  group.add(wallEW)

  // Center pillar (larger, fortress style)
  const centerGeo = new THREE.BoxGeometry(1.0, WALL_HEIGHT + 0.15, 1.0)
  const center = new THREE.Mesh(centerGeo, mat)
  center.position.y = WALL_HEIGHT / 2 + 0.075
  center.castShadow = true
  group.add(center)

  // Cross-shaped top cap
  const topNS = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_THICKNESS + 0.2, 0.25, WALL_WIDTH + 0.1),
    topMat
  )
  topNS.position.y = WALL_HEIGHT + 0.125
  topNS.castShadow = true
  group.add(topNS)

  const topEW = new THREE.Mesh(
    new THREE.BoxGeometry(WALL_WIDTH + 0.1, 0.25, WALL_THICKNESS + 0.2),
    topMat
  )
  topEW.position.y = WALL_HEIGHT + 0.125
  topEW.castShadow = true
  group.add(topEW)

  // Center tower decoration
  const towerGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.8, 8)
  const tower = new THREE.Mesh(towerGeo, topMat)
  tower.position.y = WALL_HEIGHT + 0.65
  tower.castShadow = true
  group.add(tower)

  // Tower top
  const towerTopGeo = new THREE.ConeGeometry(0.45, 0.5, 8)
  const towerTop = new THREE.Mesh(towerTopGeo, createMaterial(colors.accent))
  towerTop.position.y = WALL_HEIGHT + 1.3
  towerTop.castShadow = true
  group.add(towerTop)
}

// Update wall geometry in place (replaces children with new segment type)
export function updateWallSegmentGeometry(building, segmentType, rotation = 0) {
  // Store userData before clearing
  const userData = { ...building.userData }

  // Remove all children except HP bar references
  const hpBar = building.userData.hpBar
  const hpBarParent = hpBar?.parent

  // Clear all children
  while (building.children.length > 0) {
    const child = building.children[0]
    if (child.geometry) child.geometry.dispose()
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(m => m.dispose())
      } else {
        child.material.dispose()
      }
    }
    building.remove(child)
  }

  // Create new segment geometry
  const newSegment = createWallSegment(segmentType)

  // Copy children from new segment to building
  while (newSegment.children.length > 0) {
    const child = newSegment.children[0]
    newSegment.remove(child)
    building.add(child)
  }

  // Apply rotation
  building.rotation.y = rotation * Math.PI / 180

  // Re-add HP bar
  const hpBgGeo = new THREE.PlaneGeometry(1.6, 0.18)
  const hpBg = new THREE.Mesh(hpBgGeo, new THREE.MeshBasicMaterial({ color: 0x333333 }))
  hpBg.position.y = 2.5
  hpBg.rotation.x = -0.3
  building.add(hpBg)

  const hpBarGeo = new THREE.PlaneGeometry(1.5, 0.13)
  const newHpBar = new THREE.Mesh(hpBarGeo, new THREE.MeshBasicMaterial({ color: 0x00FF00 }))
  newHpBar.position.y = 2.52
  newHpBar.rotation.x = -0.3
  building.add(newHpBar)

  // Restore userData with new HP bar reference
  building.userData = {
    ...userData,
    hpBar: newHpBar,
    segmentType: segmentType
  }

  // Update HP bar display
  updateBuildingHPBar(building)

  return building
}
