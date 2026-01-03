import * as THREE from 'three'
import { ENEMY_TYPES } from '../../constants'
import { createMaterial } from '../utils/three-helpers'

export function createFox(isBoss = false) {
  const group = new THREE.Group()
  const config = isBoss ? ENEMY_TYPES.boss_fox : ENEMY_TYPES.fox
  const scale = config.scale || 1.1

  group.userData = {
    type: isBoss ? 'boss_fox' : 'fox',
    health: config.health,
    maxHealth: config.health,
    speed: config.speed,
    damage: config.damage,
    attackCooldown: 0,
    confused: false,
    confuseTime: 0,
    slowed: false,
    slowTime: 0,
    radius: config.radius,
    isBoss,
    targetBuilding: null,
  }

  const bodyMat = createMaterial(config.color, { roughness: 0.7 })

  // Body
  const bodyGeo = new THREE.SphereGeometry(0.5, 16, 12)
  bodyGeo.scale(1.6, 0.9, 0.9)
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 0.4
  body.castShadow = true
  group.add(body)

  // Head
  const headGeo = new THREE.SphereGeometry(0.35, 16, 12)
  headGeo.scale(1.2, 1, 1)
  const head = new THREE.Mesh(headGeo, bodyMat)
  head.position.set(0.7, 0.5, 0)
  group.add(head)

  // Snout
  const snoutGeo = new THREE.ConeGeometry(0.15, 0.4, 8)
  const snout = new THREE.Mesh(snoutGeo, bodyMat)
  snout.position.set(1.1, 0.45, 0)
  snout.rotation.z = -Math.PI / 2
  group.add(snout)

  // Ears
  const earGeo = new THREE.ConeGeometry(0.1, 0.25, 4)
  ;[-0.15, 0.15].forEach(z => {
    const ear = new THREE.Mesh(earGeo, bodyMat)
    ear.position.set(0.5, 0.9, z)
    group.add(ear)
  })

  // Tail
  const tailGeo = new THREE.CylinderGeometry(0.08, 0.15, 0.5, 8)
  const tail = new THREE.Mesh(tailGeo, bodyMat)
  tail.position.set(-0.7, 0.3, 0)
  tail.rotation.z = Math.PI / 4
  group.add(tail)

  // Boss crown
  if (isBoss) {
    const crownGeo = new THREE.ConeGeometry(0.3, 0.5, 6)
    const crown = new THREE.Mesh(crownGeo, createMaterial(0xFFD700))
    crown.position.set(0.5, 1.2, 0)
    group.add(crown)
  }

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8)
  const eyeMat = createMaterial(
    isBoss ? 0xFF0000 : 0xFFFF00,
    { emissive: isBoss ? 0xFF0000 : 0xFFAA00, emissiveIntensity: 0.4 }
  )
  ;[-0.12, 0.12].forEach(z => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat)
    eye.position.set(0.9, 0.6, z)
    group.add(eye)
  })

  // HP bar
  const hpBg = new THREE.Mesh(
    new THREE.PlaneGeometry(isBoss ? 3 : 1, isBoss ? 0.4 : 0.15),
    new THREE.MeshBasicMaterial({ color: 0x333333 })
  )
  hpBg.position.set(0.3, isBoss ? 2.5 : 1.3, 0)
  hpBg.rotation.x = -0.5
  group.add(hpBg)

  const hpBar = new THREE.Mesh(
    new THREE.PlaneGeometry(isBoss ? 2.9 : 0.96, isBoss ? 0.35 : 0.11),
    new THREE.MeshBasicMaterial({ color: 0xFF0000 })
  )
  hpBar.position.set(0.3, isBoss ? 2.52 : 1.31, 0.01)
  hpBar.rotation.x = -0.5
  group.add(hpBar)
  group.userData.hpBar = hpBar

  group.scale.setScalar(scale)
  return group
}

export function createRaven(isBoss = false) {
  const group = new THREE.Group()
  const config = isBoss ? ENEMY_TYPES.boss_raven : ENEMY_TYPES.raven
  const scale = config.scale || 1

  group.userData = {
    type: isBoss ? 'boss_raven' : 'raven',
    health: config.health,
    maxHealth: config.health,
    speed: config.speed,
    damage: config.damage,
    attackCooldown: 0,
    flying: true,
    confused: false,
    confuseTime: 0,
    slowed: false,
    slowTime: 0,
    radius: config.radius,
    isBoss,
    targetBuilding: null,
  }

  const bodyMat = createMaterial(config.color, { roughness: 0.6 })

  // Body
  const bodyGeo = new THREE.SphereGeometry(0.3, 12, 10)
  bodyGeo.scale(1.4, 1, 1)
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 1.8
  body.castShadow = true
  group.add(body)

  // Head
  const headGeo = new THREE.SphereGeometry(0.2, 12, 10)
  const head = new THREE.Mesh(headGeo, bodyMat)
  head.position.set(0.35, 1.9, 0)
  group.add(head)

  // Beak
  const beakGeo = new THREE.ConeGeometry(0.06, 0.2, 4)
  const beakMat = createMaterial(0x333333)
  const beak = new THREE.Mesh(beakGeo, beakMat)
  beak.position.set(0.55, 1.85, 0)
  beak.rotation.z = -Math.PI / 2
  group.add(beak)

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.04, 8, 8)
  const eyeMat = createMaterial(0xFF0000, { emissive: 0xFF0000, emissiveIntensity: 0.3 })
  ;[-0.08, 0.08].forEach(z => {
    const eye = new THREE.Mesh(eyeGeo, eyeMat)
    eye.position.set(0.45, 1.95, z)
    group.add(eye)
  })

  // Wings
  const wingGeo = new THREE.PlaneGeometry(0.8, 0.3)
  const wingMat = createMaterial(config.color, { side: THREE.DoubleSide })
  const wingL = new THREE.Mesh(wingGeo, wingMat)
  wingL.position.set(0, 1.8, -0.25)
  wingL.rotation.x = -0.3
  group.add(wingL)
  group.userData.wingL = wingL

  const wingR = new THREE.Mesh(wingGeo, wingMat)
  wingR.position.set(0, 1.8, 0.25)
  wingR.rotation.x = 0.3
  group.add(wingR)
  group.userData.wingR = wingR

  // Boss crown
  if (isBoss) {
    const crownGeo = new THREE.ConeGeometry(0.2, 0.3, 6)
    const crown = new THREE.Mesh(crownGeo, createMaterial(0xFFD700))
    crown.position.set(0.35, 2.25, 0)
    group.add(crown)
  }

  // HP bar
  const hpBg = new THREE.Mesh(
    new THREE.PlaneGeometry(isBoss ? 2 : 0.6, 0.1),
    new THREE.MeshBasicMaterial({ color: 0x333333 })
  )
  hpBg.position.set(0.2, isBoss ? 3 : 2.3, 0)
  hpBg.rotation.x = -0.5
  group.add(hpBg)

  const hpBar = new THREE.Mesh(
    new THREE.PlaneGeometry(isBoss ? 1.9 : 0.56, 0.07),
    new THREE.MeshBasicMaterial({ color: 0xFF0000 })
  )
  hpBar.position.set(0.2, isBoss ? 3.02 : 2.31, 0.01)
  hpBar.rotation.x = -0.5
  group.add(hpBar)
  group.userData.hpBar = hpBar

  group.scale.setScalar(scale)
  return group
}

export function createSnake() {
  const group = new THREE.Group()
  const config = ENEMY_TYPES.snake

  group.userData = {
    type: 'snake',
    health: config.health,
    maxHealth: config.health,
    speed: config.speed,
    damage: config.damage,
    attackCooldown: 0,
    confused: false,
    confuseTime: 0,
    slowed: false,
    slowTime: 0,
    radius: config.radius,
    targetBuilding: null,
    canPoison: true,
  }

  // Snake body segments
  for (let i = 0; i < 5; i++) {
    const segGeo = new THREE.SphereGeometry(0.2 - i * 0.02, 8, 8)
    const segMat = createMaterial(i % 2 === 0 ? 0x228B22 : 0x32CD32)
    const seg = new THREE.Mesh(segGeo, segMat)
    seg.position.set(-i * 0.25, 0.2, 0)
    seg.castShadow = true
    group.add(seg)
  }

  // Head
  const headGeo = new THREE.SphereGeometry(0.25, 10, 10)
  headGeo.scale(1.3, 0.8, 1)
  const head = new THREE.Mesh(headGeo, createMaterial(0x228B22))
  head.position.set(0.3, 0.2, 0)
  group.add(head)

  // Eyes
  const eyeMat = createMaterial(0xFFFF00, { emissive: 0xFFFF00, emissiveIntensity: 0.3 })
  ;[-0.1, 0.1].forEach(z => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat)
    eye.position.set(0.45, 0.28, z)
    group.add(eye)
  })

  // Forked tongue
  const tongueGeo = new THREE.BoxGeometry(0.15, 0.02, 0.02)
  const tongue = new THREE.Mesh(tongueGeo, createMaterial(0xFF0000))
  tongue.position.set(0.55, 0.18, 0)
  group.add(tongue)
  group.userData.tongue = tongue

  // HP bar
  const hpBg = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.12),
    new THREE.MeshBasicMaterial({ color: 0x333333 })
  )
  hpBg.position.set(0, 0.8, 0)
  hpBg.rotation.x = -0.5
  group.add(hpBg)

  const hpBar = new THREE.Mesh(
    new THREE.PlaneGeometry(0.76, 0.08),
    new THREE.MeshBasicMaterial({ color: 0x00FF00 })
  )
  hpBar.position.set(0, 0.81, 0.01)
  hpBar.rotation.x = -0.5
  group.add(hpBar)
  group.userData.hpBar = hpBar

  return group
}

// Update enemy HP bar
export function updateEnemyHPBar(enemy) {
  if (enemy.userData.hpBar) {
    const hp = enemy.userData.health / enemy.userData.maxHealth
    enemy.userData.hpBar.scale.x = Math.max(0.01, hp)
  }
}

// Update enemy animation
export function updateEnemyAnimation(enemy, time) {
  const type = enemy.userData.type

  if (type === 'fox' || type === 'boss_fox') {
    enemy.rotation.z = Math.sin(time * 6) * 0.04
  } else if (type === 'raven' || type === 'boss_raven') {
    enemy.position.y = 1.8 + Math.sin(time * 4) * 0.25
    if (enemy.userData.wingL) enemy.userData.wingL.rotation.x = -0.3 + Math.sin(time * 10) * 0.35
    if (enemy.userData.wingR) enemy.userData.wingR.rotation.x = 0.3 - Math.sin(time * 10) * 0.35
  } else if (type === 'snake') {
    enemy.rotation.z = Math.sin(time * 8) * 0.1
    if (enemy.userData.tongue) enemy.userData.tongue.scale.x = 1 + Math.sin(time * 15) * 0.3
  }
}
