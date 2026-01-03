import * as THREE from 'three'
import { createMaterial } from '../utils/three-helpers'

const PROJECTILE_COLORS = {
  carrot: 0xFF6B35,
  tower: 0x8B0000,
  poison: 0x00FF00,
}

export function createProjectile(start, target, type = 'carrot', skillEffects = {}) {
  const towerDamageBonus = 1 + (skillEffects.towerDamage || 0) / 100

  const color = PROJECTILE_COLORS[type] || PROJECTILE_COLORS.carrot

  const geo = type === 'tower'
    ? new THREE.SphereGeometry(0.15, 8, 8)
    : new THREE.ConeGeometry(0.12, 0.45, 6)

  const mat = createMaterial(color, {
    emissive: color,
    emissiveIntensity: 0.3,
  })

  const proj = new THREE.Mesh(geo, mat)
  proj.position.copy(start)
  proj.position.y = start.y || 0.6

  const dir = new THREE.Vector3().subVectors(target, start).normalize()

  proj.userData = {
    velocity: dir.multiplyScalar(type === 'tower' ? 0.5 : 0.35),
    damage: type === 'tower' ? (25 * towerDamageBonus) : 25,
    splash: type === 'carrot',
    splashRadius: 2.5,
    type,
    maxDistance: 50,
    distanceTraveled: 0,
  }

  proj.lookAt(target)
  if (type !== 'tower') {
    proj.rotation.x += Math.PI / 2
  }

  return proj
}

// Update projectile position
export function updateProjectile(projectile, enemies) {
  const { velocity, damage, splash, splashRadius } = projectile.userData

  projectile.position.add(velocity)
  projectile.rotation.x += 0.15
  projectile.userData.distanceTraveled += velocity.length()

  let hit = false
  let hitEnemy = null

  // Check for enemy collision
  for (const enemy of enemies) {
    const dx = projectile.position.x - enemy.position.x
    const dz = projectile.position.z - enemy.position.z
    const dy = projectile.position.y - (enemy.userData.flying ? 1.8 : 0.5)

    if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1.5) {
      hit = true
      hitEnemy = enemy
      break
    }
  }

  // Apply damage on hit
  if (hit && hitEnemy) {
    if (splash) {
      // Splash damage to all nearby enemies
      enemies.forEach(enemy => {
        const dx = projectile.position.x - enemy.position.x
        const dz = projectile.position.z - enemy.position.z
        if (Math.sqrt(dx * dx + dz * dz) < splashRadius) {
          enemy.userData.health -= damage
        }
      })
    } else {
      hitEnemy.userData.health -= damage
    }
  }

  // Check if projectile should be removed
  const shouldRemove = hit ||
    projectile.position.length() > projectile.userData.maxDistance ||
    projectile.userData.distanceTraveled > 100

  return { hit, shouldRemove, position: projectile.position.clone(), splash }
}
