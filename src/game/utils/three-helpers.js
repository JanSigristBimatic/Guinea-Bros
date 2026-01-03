import * as THREE from 'three'

// Create a basic material with standard properties
export function createMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.8,
    metalness: options.metalness ?? 0,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.side ?? THREE.FrontSide,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
  })
}

// Create a basic mesh with a geometry and material
export function createMesh(geometry, color, options = {}) {
  const material = createMaterial(color, options)
  const mesh = new THREE.Mesh(geometry, material)

  if (options.castShadow !== false) mesh.castShadow = true
  if (options.receiveShadow) mesh.receiveShadow = true
  if (options.position) mesh.position.set(...options.position)
  if (options.rotation) mesh.rotation.set(...options.rotation)
  if (options.scale) mesh.scale.setScalar(options.scale)

  return mesh
}

// Create HP bar for entities
export function createHPBar(width = 1, height = 0.15, yPosition = 1.5) {
  const group = new THREE.Group()

  // Background
  const bgGeo = new THREE.PlaneGeometry(width, height)
  const bgMat = new THREE.MeshBasicMaterial({ color: 0x333333 })
  const bg = new THREE.Mesh(bgGeo, bgMat)
  bg.position.set(0, yPosition, 0)
  bg.rotation.x = -0.5
  group.add(bg)

  // Foreground bar
  const barGeo = new THREE.PlaneGeometry(width * 0.95, height * 0.7)
  const barMat = new THREE.MeshBasicMaterial({ color: 0x00FF00 })
  const bar = new THREE.Mesh(barGeo, barMat)
  bar.position.set(0, yPosition + 0.02, 0.01)
  bar.rotation.x = -0.5
  group.add(bar)

  group.userData.hpBar = bar
  group.userData.updateHP = (ratio) => {
    bar.scale.x = Math.max(0.01, ratio)
    if (ratio > 0.5) bar.material.color.setHex(0x00FF00)
    else if (ratio > 0.25) bar.material.color.setHex(0xFFFF00)
    else bar.material.color.setHex(0xFF0000)
  }

  return group
}

// Calculate distance between two Vector3 positions
export function distance(pos1, pos2) {
  return pos1.distanceTo(pos2)
}

// Calculate distance on XZ plane only
export function distanceXZ(obj1, obj2) {
  const dx = obj1.position.x - obj2.position.x
  const dz = obj1.position.z - obj2.position.z
  return Math.sqrt(dx * dx + dz * dz)
}

// Normalize angle to -PI to PI
export function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2
  while (angle < -Math.PI) angle += Math.PI * 2
  return angle
}

// Smooth rotation interpolation
export function lerpAngle(current, target, speed) {
  let diff = normalizeAngle(target - current)
  return current + diff * speed
}

// Dispose of Three.js objects properly
export function disposeObject(object) {
  if (object.geometry) object.geometry.dispose()
  if (object.material) {
    if (Array.isArray(object.material)) {
      object.material.forEach(mat => mat.dispose())
    } else {
      object.material.dispose()
    }
  }
  if (object.children) {
    object.children.forEach(child => disposeObject(child))
  }
}

// Create particle explosion effect
export function createExplosionParticles(position, color = 0xFF6B35, count = 15) {
  const particles = []

  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 6, 6)
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).offsetHSL(Math.random() * 0.1, 0, Math.random() * 0.2 - 0.1),
      transparent: true
    })
    const p = new THREE.Mesh(geo, mat)
    p.position.copy(position)
    p.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.3,
        Math.random() * 0.2 + 0.1,
        (Math.random() - 0.5) * 0.3
      ),
      life: 1,
    }
    particles.push(p)
  }

  return particles
}

// Create heal effect particles
export function createHealParticles(position, count = 8) {
  const particles = []

  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.08, 6, 6)
    const mat = new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true })
    const p = new THREE.Mesh(geo, mat)
    p.position.copy(position)
    p.position.x += (Math.random() - 0.5) * 0.5
    p.position.z += (Math.random() - 0.5) * 0.5
    p.userData = { velocity: new THREE.Vector3(0, 0.05, 0), life: 1 }
    particles.push(p)
  }

  return particles
}

// Create heart particles for breeding
export function createHeartParticles(position, count = 10) {
  const particles = []

  for (let i = 0; i < count; i++) {
    const geo = new THREE.SphereGeometry(0.12, 6, 6)
    const mat = new THREE.MeshBasicMaterial({ color: 0xFF69B4, transparent: true })
    const p = new THREE.Mesh(geo, mat)
    p.position.copy(position)
    p.position.y = 1
    p.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.15,
        0.1 + Math.random() * 0.1,
        (Math.random() - 0.5) * 0.15
      ),
      life: 1,
    }
    particles.push(p)
  }

  return particles
}

// Update particles in animation loop
export function updateParticles(particles, dt = 0.016) {
  const toRemove = []

  particles.forEach((p, i) => {
    p.position.add(p.userData.velocity)
    p.userData.velocity.y -= 0.003
    p.userData.life -= 0.025
    p.material.opacity = p.userData.life
    p.scale.setScalar(Math.max(0.01, p.userData.life))

    if (p.userData.life <= 0) {
      toRemove.push(i)
    }
  })

  return toRemove
}
