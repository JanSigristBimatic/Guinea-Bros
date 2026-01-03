import * as THREE from 'three'
import { createProjectile } from '../entities/Projectile'
import { createExplosionParticles, createHealParticles } from '../utils/three-helpers'

// Find nearest enemy within range
export function findNearestEnemy(position, enemies, range) {
  let nearest = null
  let nearestDist = Infinity

  for (const enemy of enemies) {
    const dx = position.x - enemy.position.x
    const dz = position.z - enemy.position.z
    const dist = Math.sqrt(dx * dx + dz * dz)

    if (dist < nearestDist && dist < range) {
      nearestDist = dist
      nearest = enemy
    }
  }

  return { enemy: nearest, distance: nearestDist }
}

// Find weakest enemy
export function findWeakestEnemy(enemies) {
  let weakest = null
  let minHp = Infinity

  for (const enemy of enemies) {
    if (enemy.userData.health < minHp) {
      minHp = enemy.userData.health
      weakest = enemy
    }
  }

  return weakest
}

// Process defender attack
export function processDefenderAttack(defender, enemies, scene, projectiles, effects, skillEffects) {
  const data = defender.userData
  const rageBonus = skillEffects.rageActive ? (1 + (skillEffects.rageBonus || 0) / 100) : 1
  const critChance = (skillEffects.critChance || 0) / 100
  const range = skillEffects.foggy ? data.attackRange * 0.7 : data.attackRange

  const { enemy: nearestEnemy, distance } = findNearestEnemy(defender.position, enemies, range)

  if (!nearestEnemy) return null

  // Update facing direction
  const dx = nearestEnemy.position.x - defender.position.x
  const dz = nearestEnemy.position.z - defender.position.z
  data.targetRotation = Math.atan2(-dz, dx)

  // Check attack cooldown
  if (data.attackCooldown > 0) return null

  // Set attack cooldown based on type
  data.attackCooldown = data.type === 'bomber' ? 2 :
    (data.type === 'assassin' ? 0.8 : 1.2)

  // Calculate damage with crit
  let damage = data.attackDamage * rageBonus
  let isCrit = false

  if (Math.random() < critChance) {
    damage *= 2
    isCrit = true
  }

  // Apply attack
  if (data.type === 'bomber') {
    // Bomber creates projectile
    const proj = createProjectile(defender.position, nearestEnemy.position, 'carrot', skillEffects)
    scene.add(proj)
    projectiles.push(proj)
  } else {
    nearestEnemy.userData.health -= damage
  }

  // Create crit effect
  if (isCrit) {
    const particles = createExplosionParticles(nearestEnemy.position, 0xFFFF00)
    particles.forEach(p => scene.add(p))
    effects.push(...particles)
  }

  return { damage, isCrit, target: nearestEnemy }
}

// Process defender ability
export function processDefenderAbility(defender, enemies, defenders, scene, effects, skillEffects) {
  const data = defender.userData

  if (data.abilityCooldown > 0) return null

  data.abilityCooldown = 6

  switch (data.type) {
    case 'tunneler':
      // Slow nearby enemies
      enemies.forEach(enemy => {
        const dx = defender.position.x - enemy.position.x
        const dz = defender.position.z - enemy.position.z
        if (Math.sqrt(dx * dx + dz * dz) < 5) {
          enemy.userData.slowed = true
          enemy.userData.slowTime = 4
        }
      })
      const slowParticles = createExplosionParticles(defender.position, 0x8B4513)
      slowParticles.forEach(p => scene.add(p))
      effects.push(...slowParticles)
      return { type: 'slow' }

    case 'shadow':
      // Confuse nearest enemy
      const { enemy: nearestEnemy } = findNearestEnemy(defender.position, enemies, data.attackRange)
      if (nearestEnemy) {
        nearestEnemy.userData.confused = true
        nearestEnemy.userData.confuseTime = 5
        const confuseParticles = createExplosionParticles(nearestEnemy.position, 0x4B0082)
        confuseParticles.forEach(p => scene.add(p))
        effects.push(...confuseParticles)
        return { type: 'confuse', target: nearestEnemy }
      }
      break

    case 'tank':
      // Taunt nearby enemies
      enemies.forEach(enemy => {
        const dx = defender.position.x - enemy.position.x
        const dz = defender.position.z - enemy.position.z
        if (Math.sqrt(dx * dx + dz * dz) < 8) {
          enemy.userData.targetBuilding = null
        }
      })
      return { type: 'taunt' }

    case 'assassin':
      // Teleport to weakest enemy
      const weakest = findWeakestEnemy(enemies)
      if (weakest) {
        defender.position.x = weakest.position.x + 1
        defender.position.z = weakest.position.z
        const teleportParticles = createExplosionParticles(defender.position, 0x800080)
        teleportParticles.forEach(p => scene.add(p))
        effects.push(...teleportParticles)
        return { type: 'teleport', target: weakest }
      }
      break

    case 'healer':
      // Heal nearby allies
      defenders.forEach(other => {
        if (other === defender) return
        const dx = defender.position.x - other.position.x
        const dz = defender.position.z - other.position.z
        if (Math.sqrt(dx * dx + dz * dz) < 6) {
          other.userData.health = Math.min(other.userData.maxHealth, other.userData.health + 20)
        }
      })
      const healParticles = createHealParticles(defender.position)
      healParticles.forEach(p => scene.add(p))
      effects.push(...healParticles)
      return { type: 'heal' }
  }

  return null
}

// Process tower attack
export function processTowerAttack(building, enemies, scene, projectiles, skillEffects) {
  if (building.userData.type !== 'tower') return null
  if (building.userData.attackCooldown > 0) return null

  const towerRangeBonus = 1 + (skillEffects.towerRange || 0) / 100
  const range = 12 * towerRangeBonus

  const { enemy: nearestEnemy } = findNearestEnemy(building.position, enemies, range)

  if (!nearestEnemy) return null

  building.userData.attackCooldown = 1.5

  const startPos = new THREE.Vector3(building.position.x, 3, building.position.z)
  const proj = createProjectile(startPos, nearestEnemy.position, 'tower', skillEffects)
  scene.add(proj)
  projectiles.push(proj)

  // Update crossbow direction
  if (building.userData.crossbow) {
    building.userData.crossbow.lookAt(nearestEnemy.position)
  }

  return { target: nearestEnemy }
}

// Process enemy attack on base or building
export function processEnemyAttack(enemy, buildings, baseHealth, dt) {
  const data = enemy.userData

  // Handle status effects
  if (data.confused) {
    data.confuseTime -= dt
    if (data.confuseTime <= 0) data.confused = false
  }
  if (data.slowed) {
    data.slowTime -= dt
    if (data.slowTime <= 0) data.slowed = false
  }

  // Check attack cooldown
  if (data.attackCooldown > 0) return null

  data.attackCooldown = data.isBoss ? 1 : 1.5

  // Attack target building if any
  if (data.targetBuilding && data.targetBuilding.userData.health > 0) {
    data.targetBuilding.userData.health -= data.damage
    return {
      type: 'building',
      target: data.targetBuilding,
      damage: data.damage,
      destroyed: data.targetBuilding.userData.health <= 0,
    }
  }

  // Otherwise attack base
  return {
    type: 'base',
    damage: data.damage,
    newBaseHealth: baseHealth - data.damage,
  }
}
