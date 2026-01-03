import * as THREE from 'three'
import { createMaterial } from '../utils/three-helpers'

const CARROT_COLORS = {
  normal: 0xFF6B35,
  golden: 0xFFD700,
  blue: 0x4169E1,
}

const CARROT_VALUES = {
  normal: 1,
  golden: 5,
  blue: 3,
}

export function createCarrot(x, z, type = 'normal') {
  const group = new THREE.Group()

  group.userData = {
    collected: false,
    type,
    value: CARROT_VALUES[type],
    effect: type === 'golden' ? 'bonus' : (type === 'blue' ? 'speed' : null),
  }

  const color = CARROT_COLORS[type]

  // Carrot body
  const bodyGeo = new THREE.ConeGeometry(0.14, 0.55, 8)
  const bodyMat = createMaterial(color, {
    emissive: type !== 'normal' ? color : 0x000000,
    emissiveIntensity: type !== 'normal' ? 0.3 : 0,
  })
  const body = new THREE.Mesh(bodyGeo, bodyMat)
  body.rotation.x = Math.PI
  body.position.y = 0.28
  body.castShadow = true
  group.add(body)

  // Leaves
  for (let i = 0; i < 3; i++) {
    const leafGeo = new THREE.ConeGeometry(0.035, 0.22, 4)
    const leafMat = createMaterial(0x228B22)
    const leaf = new THREE.Mesh(leafGeo, leafMat)
    leaf.position.set(
      (Math.random() - 0.5) * 0.08,
      0.6,
      (Math.random() - 0.5) * 0.08
    )
    leaf.rotation.x = (Math.random() - 0.5) * 0.3
    group.add(leaf)
  }

  // Glow ring
  const ringGeo = new THREE.RingGeometry(0.28, 0.36, 32)
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
  })
  const ring = new THREE.Mesh(ringGeo, ringMat)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.01
  group.add(ring)
  group.userData.ring = ring

  group.position.set(x, 0, z)
  return group
}

// Determine carrot type based on skill effects
export function getCarrotType(skillEffects = {}) {
  const roll = Math.random()
  const goldenBonus = skillEffects.goldenAge ? 0.5 : 0

  if (roll < 0.02 + goldenBonus * 0.02) return 'golden'
  if (roll < 0.08) return 'blue'
  return 'normal'
}

// Animate carrot
export function updateCarrotAnimation(carrot, time, index = 0) {
  if (carrot.userData.ring) {
    carrot.userData.ring.rotation.z = time * 2
  }
  carrot.position.y = Math.sin(time * 2 + index) * 0.03
}

// Create collection animation
export function animateCarrotCollection(carrot, scene, onComplete) {
  const animate = () => {
    carrot.scale.multiplyScalar(0.85)
    carrot.position.y += 0.12

    if (carrot.scale.x > 0.05) {
      requestAnimationFrame(animate)
    } else {
      scene.remove(carrot)
      if (onComplete) onComplete()
    }
  }
  animate()
}
