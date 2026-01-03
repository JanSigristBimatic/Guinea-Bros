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
