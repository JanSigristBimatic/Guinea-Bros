import { WAVE_CONFIGS, TOTAL_WAVES } from '../../constants'
import { createFox, createRaven, createSnake } from '../entities/Enemy'

// Get wave configuration
export function getWaveConfig(waveNum) {
  return WAVE_CONFIGS[Math.min(waveNum, TOTAL_WAVES - 1)]
}

// Check if wave is a boss wave
export function isBossWave(waveNum) {
  const config = getWaveConfig(waveNum)
  return !!config.boss
}

// Create enemy spawn queue for a wave
export function createWaveSpawnQueue(waveNum) {
  const config = getWaveConfig(waveNum)
  const queue = []

  // Add regular enemies
  for (let i = 0; i < config.foxes; i++) queue.push('fox')
  for (let i = 0; i < config.ravens; i++) queue.push('raven')
  for (let i = 0; i < config.snakes; i++) queue.push('snake')

  // Shuffle regular enemies
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[queue[i], queue[j]] = [queue[j], queue[i]]
  }

  // Add bosses at the end
  if (config.boss === 'fox' || config.boss === 'both') {
    queue.push('boss_fox')
  }
  if (config.boss === 'raven' || config.boss === 'both') {
    queue.push('boss_raven')
  }

  return { queue, delay: config.delay }
}

// Create enemy from type
export function createEnemyFromType(type) {
  switch (type) {
    case 'boss_fox':
      return createFox(true)
    case 'boss_raven':
      return createRaven(true)
    case 'fox':
      return createFox()
    case 'raven':
      return createRaven()
    case 'snake':
    default:
      return createSnake()
  }
}

// Get spawn position for enemy
export function getEnemySpawnPosition(spawnRadius = 38) {
  const angle = Math.random() * Math.PI * 2
  return {
    x: Math.cos(angle) * spawnRadius,
    z: Math.sin(angle) * spawnRadius,
  }
}

// Calculate earned skill points
export function calculateSkillPoints(score, wave, isVictory) {
  if (isVictory) {
    return Math.floor(score / 5) + wave * 10
  }
  return Math.floor(score / 10) + wave * 5
}

// Check if game is complete
export function isGameComplete(wave) {
  return wave >= TOTAL_WAVES
}
