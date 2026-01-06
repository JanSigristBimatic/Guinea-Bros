/**
 * Threat/Aggro System for Enemy AI
 * Manages enemy target selection based on damage received and proximity
 */

export const THREAT_CONFIG = {
  baseDamageThreat: 1.5,    // Threat per damage point
  proximityThreat: 2,       // Threat per second in range
  tauntThreat: 1000,        // Tank taunt override
  decayRate: 5,             // Threat decay per second
  maxThreat: 200,           // Maximum threat cap
  switchThreshold: 10,      // Minimum priority difference to switch targets
}

/**
 * Add threat to an enemy's threat table
 * @param {Object} enemy - The enemy receiving threat
 * @param {Object} source - The defender/tower causing threat
 * @param {number} amount - Base threat amount
 */
export function addThreat(enemy, source, amount) {
  if (!enemy?.userData?.threatTable || !source?.uuid) return

  const table = enemy.userData.threatTable
  const mult = enemy.userData.threatMultiplier || 1
  const entry = table.get(source.uuid) || { threat: 0 }
  entry.threat = Math.min(THREAT_CONFIG.maxThreat, entry.threat + amount * mult)
  entry.lastUpdate = Date.now()
  table.set(source.uuid, entry)

  enemy.userData.lastDamageSource = source
  enemy.userData.lastDamageTime = Date.now()
}

/**
 * Decay threat over time
 * @param {Object} enemy - The enemy
 * @param {number} dt - Delta time in seconds
 */
export function decayThreat(enemy, dt) {
  if (!enemy?.userData?.threatTable) return

  const table = enemy.userData.threatTable
  const decay = THREAT_CONFIG.decayRate * dt

  table.forEach((entry, uuid) => {
    entry.threat -= decay
    if (entry.threat <= 0) {
      table.delete(uuid)
    }
  })
}

/**
 * Clear all threat (used for confusion, death, etc.)
 * @param {Object} enemy - The enemy
 */
export function clearThreat(enemy) {
  if (!enemy?.userData) return

  enemy.userData.threatTable?.clear()
  enemy.userData.currentTarget = null
  enemy.userData.isRetaliating = false
}

/**
 * Helper function to calculate distance between two objects
 */
function getDistance(a, b) {
  const dx = a.position.x - b.position.x
  const dz = a.position.z - b.position.z
  return Math.sqrt(dx * dx + dz * dz)
}

/**
 * Calculate priority score for a potential target
 * @param {Object} enemy - The enemy evaluating targets
 * @param {Object} target - Potential target (defender or building)
 * @returns {number} Priority score
 */
export function calculatePriority(enemy, target) {
  const data = enemy.userData
  let priority = 0

  // Threat from table (damage received)
  const entry = data.threatTable?.get(target.uuid)
  priority += entry ? entry.threat : 0

  // Distance bonus (closer = higher priority)
  const dist = getDistance(enemy, target)
  priority += Math.max(0, (data.aggroRange - dist) * 2)

  // Priority targets bonus (Raven -> Bomber/Tower)
  if (data.priorityTargets?.includes(target.userData?.type)) {
    priority += 20
  }

  // Low HP bonus (finish off weak targets)
  if (target.userData?.health < target.userData?.maxHealth * 0.3) {
    priority += 15
  }

  // Taunt override (Tank ability)
  if (target.userData?.isTaunting) {
    priority = THREAT_CONFIG.tauntThreat
  }

  return priority
}

/**
 * Select the best target for an enemy
 * @param {Object} enemy - The enemy selecting a target
 * @param {Array} defenders - Array of defender objects
 * @param {Array} buildings - Array of building objects
 * @returns {Object} { target, type } where type is 'defender' | 'building' | 'base'
 */
export function selectTarget(enemy, defenders, buildings) {
  const data = enemy.userData
  if (!data) return { target: null, type: 'base' }

  // 1. Check for taunting Tank first (always prioritize)
  const tauntingTank = defenders.find(d =>
    d.userData?.isTaunting &&
    d.userData?.health > 0 &&
    getDistance(enemy, d) < 8
  )
  if (tauntingTank) {
    return { target: tauntingTank, type: 'defender' }
  }

  // 2. Collect all potential targets with priorities
  const candidates = []

  // Evaluate defenders in range or with threat
  defenders.forEach(d => {
    if (!d.userData || d.userData.health <= 0) return
    const dist = getDistance(enemy, d)
    const hasThreat = data.threatTable?.has(d.uuid)

    // Consider if in aggro range OR has threat from damage
    if (dist < data.aggroRange || hasThreat) {
      const basePriority = calculatePriority(enemy, d)
      candidates.push({
        target: d,
        type: 'defender',
        priority: basePriority * (data.defenderFocus || 0.5),
        distance: dist,
      })
    }
  })

  // Evaluate buildings (only for building targeters)
  if (data.buildingTargeter) {
    buildings.forEach(b => {
      if (!b.userData || b.userData.health <= 0) return
      const dist = getDistance(enemy, b)
      if (dist < 25) {
        // Prefer current target
        const isCurrentTarget = data.targetBuilding === b
        const basePriority = isCurrentTarget ? 50 : 30
        candidates.push({
          target: b,
          type: 'building',
          priority: basePriority * (1 - (data.defenderFocus || 0.5)),
          distance: dist,
        })
      }
    })
  }

  // 3. Sort by priority (highest first)
  candidates.sort((a, b) => b.priority - a.priority)

  // 4. Check leash range for defenders
  if (candidates[0]?.type === 'defender' && candidates[0].distance > data.leashRange) {
    // Return to original objective
    return {
      target: data.originalTarget,
      type: data.originalTarget ? 'building' : 'base'
    }
  }

  // 5. Return best candidate or fall back to base
  return candidates[0] || { target: null, type: 'base' }
}

/**
 * Check if enemy should switch to a new target
 * @param {Object} enemy - The enemy
 * @param {Object} newTarget - Potential new target
 * @param {number} newPriority - Priority of new target
 * @returns {boolean} Whether to switch
 */
export function shouldSwitchTarget(enemy, newTarget, newPriority) {
  const currentTarget = enemy.userData?.currentTarget
  if (!currentTarget) return true

  const currentPriority = calculatePriority(enemy, currentTarget)
  return (newPriority - currentPriority) > THREAT_CONFIG.switchThreshold
}
