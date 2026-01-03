import * as THREE from 'three'
import { GUINEA_PIG_TYPES, BASE_HERO_HEALTH, BASE_HERO_SPEED } from '../../constants'
import { createMaterial } from '../utils/three-helpers'

export function createGuineaPig(type, isPlayer = false, scale = 1, skillEffects = {}) {
  const config = GUINEA_PIG_TYPES[type] || GUINEA_PIG_TYPES.player
  const group = new THREE.Group()

  const heroBonus = 1 + (skillEffects.heroStats || 0) / 100
  const collectorSpeedBonus = 1 + (skillEffects.collectorSpeed || 0) / 100
  const collectorCapacityBonus = skillEffects.collectorCapacity || 0

  // Set up user data
  group.userData = {
    type,
    isPlayer,
    isPartner: type.startsWith('partner'),
    isCollector: type === 'collector',
    health: isPlayer ? 100 : Math.floor(BASE_HERO_HEALTH * heroBonus),
    maxHealth: isPlayer ? 100 : Math.floor(BASE_HERO_HEALTH * heroBonus),
    attackCooldown: 0,
    abilityCooldown: 0,
    targetRotation: 0,
    radius: 0.8 * scale,
    targetPos: new THREE.Vector3(),
    waitTime: 0,
    carryingCarrots: 0,
    maxCarry: 2 + collectorCapacityBonus,
    speed: type === 'collector'
      ? (0.04 * collectorSpeedBonus)
      : BASE_HERO_SPEED,
    attackRange: config.attackRange || 5,
    attackDamage: Math.floor((config.baseDamage || 18) * heroBonus),
  }

  const { c1, c2 } = config

  // Body
  const bodyGeo = new THREE.SphereGeometry(0.5, 24, 12)
  bodyGeo.scale(1.4, 0.8, 1)
  const bodyMat = createMaterial(c1)
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.position.y = 0.35
  body.castShadow = true
  group.add(body)

  // Patch on back
  const patchGeo = new THREE.SphereGeometry(0.32, 12, 8)
  patchGeo.scale(1.1, 0.55, 0.75)
  const patch = new THREE.Mesh(patchGeo, createMaterial(c2))
  patch.position.set(-0.1, 0.48, 0)
  group.add(patch)

  // Head
  const headGeo = new THREE.SphereGeometry(0.3, 24, 12)
  headGeo.scale(1.1, 0.9, 1)
  const head = new THREE.Mesh(headGeo, createMaterial(c1))
  head.position.set(0.52, 0.38, 0)
  head.castShadow = true
  group.add(head)

  // Eyes
  const eyeMat = createMaterial(0x1a1a1a)
  const shineMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

  ;[-0.11, 0.11].forEach(z => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), eyeMat)
    eye.position.set(0.72, 0.46, z)
    group.add(eye)

    const shine = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 8), shineMat)
    shine.position.set(0.76, 0.48, z * 0.7)
    group.add(shine)
  })

  // Nose
  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.06, 12, 12),
    createMaterial(0xFFB6C1)
  )
  nose.position.set(0.82, 0.34, 0)
  group.add(nose)

  // Ears
  const earGeo = new THREE.SphereGeometry(0.09, 12, 6)
  earGeo.scale(0.5, 1, 0.3)
  ;[-0.18, 0.18].forEach(z => {
    const ear = new THREE.Mesh(earGeo, createMaterial(c1))
    ear.position.set(0.44, 0.6, z)
    ear.rotation.x = z > 0 ? 0.25 : -0.25
    group.add(ear)
  })

  // Feet
  const footGeo = new THREE.SphereGeometry(0.08, 6, 6)
  footGeo.scale(1.1, 0.5, 1)
  const footMat = createMaterial(0x2d2d2d)
  ;[[-0.35, 0.2], [-0.35, -0.2], [0.35, 0.18], [0.35, -0.18]].forEach(([x, z]) => {
    const foot = new THREE.Mesh(footGeo, footMat)
    foot.position.set(x, 0.08, z)
    group.add(foot)
  })

  // Player crown
  if (isPlayer) {
    const crownGeo = new THREE.ConeGeometry(0.12, 0.18, 5)
    const crownMat = createMaterial(0xFFD700, { emissive: 0xFFAA00, emissiveIntensity: 0.4 })
    const crown = new THREE.Mesh(crownGeo, crownMat)
    crown.position.set(0.52, 0.82, 0)
    group.add(crown)
    group.userData.crown = crown
  }

  // Collector bag
  if (type === 'collector') {
    const bagGeo = new THREE.SphereGeometry(0.2, 8, 6)
    bagGeo.scale(1, 0.8, 0.6)
    const bag = new THREE.Mesh(bagGeo, createMaterial(0x8B4513))
    bag.position.set(-0.4, 0.35, 0)
    group.add(bag)
  }

  // Tank armor
  if (type === 'tank') {
    const armorGeo = new THREE.BoxGeometry(0.8, 0.3, 0.7)
    const armor = new THREE.Mesh(armorGeo, createMaterial(0x4682B4, { metalness: 0.6 }))
    armor.position.set(0, 0.55, 0)
    group.add(armor)
  }

  // Assassin cape
  if (type === 'assassin') {
    const capeGeo = new THREE.PlaneGeometry(0.6, 0.5)
    const cape = new THREE.Mesh(capeGeo, createMaterial(0x4B0082, { side: THREE.DoubleSide }))
    cape.position.set(-0.5, 0.4, 0)
    cape.rotation.y = Math.PI / 2
    group.add(cape)
  }

  // HP bar for heroes (non-player, non-collector, non-partner)
  if (!isPlayer && type !== 'collector' && !type.startsWith('partner')) {
    const hpBg = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.12),
      new THREE.MeshBasicMaterial({ color: 0x333333 })
    )
    hpBg.position.set(0, 1.1, 0)
    hpBg.rotation.x = -0.5
    group.add(hpBg)

    const hpBar = new THREE.Mesh(
      new THREE.PlaneGeometry(0.76, 0.08),
      new THREE.MeshBasicMaterial({ color: 0x00FF00 })
    )
    hpBar.position.set(0, 1.11, 0.01)
    hpBar.rotation.x = -0.5
    group.add(hpBar)
    group.userData.hpBar = hpBar
  }

  // Heart indicator for partners
  if (type.startsWith('partner')) {
    const heartGeo = new THREE.SphereGeometry(0.15, 8, 8)
    const heart = new THREE.Mesh(heartGeo, new THREE.MeshBasicMaterial({ color: 0xFF69B4 }))
    heart.position.set(0.5, 1.2, 0)
    heart.visible = false
    group.add(heart)
    group.userData.heartIndicator = heart
  }

  group.scale.setScalar(scale)
  return group
}

// Update guinea pig animation
export function updateGuineaPigAnimation(guineaPig, time, isMoving = false) {
  if (isMoving) {
    guineaPig.rotation.z = Math.sin(time * 8) * 0.08
    guineaPig.position.y = Math.abs(Math.sin(time * 8)) * 0.04
  } else {
    guineaPig.rotation.z *= 0.9
    guineaPig.position.y *= 0.9
  }

  // Breathing animation
  guineaPig.scale.y = guineaPig.userData.baseScale * (1 + Math.sin(time * 2.5) * 0.02)

  // Crown rotation for player
  if (guineaPig.userData.crown) {
    guineaPig.userData.crown.rotation.y = time * 1.5
  }
}
