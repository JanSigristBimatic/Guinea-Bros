import { useState, useCallback, useEffect } from 'react'
import { DEFAULT_SKILLS, DEFAULT_META, STORAGE_KEYS } from '../constants'

// Load skills from localStorage
function loadSkills() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SKILLS)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.warn('Failed to load skills:', e)
  }
  return JSON.parse(JSON.stringify(DEFAULT_SKILLS))
}

// Load meta from localStorage
function loadMeta() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.META)
    if (saved) return JSON.parse(saved)
  } catch (e) {
    console.warn('Failed to load meta:', e)
  }
  return { ...DEFAULT_META }
}

export function useSkills() {
  const [skills, setSkills] = useState(loadSkills)
  const [meta, setMeta] = useState(loadMeta)

  // Save progress to localStorage
  const saveProgress = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(skills))
      localStorage.setItem(STORAGE_KEYS.META, JSON.stringify(meta))
    } catch (e) {
      console.warn('Failed to save progress:', e)
    }
  }, [skills, meta])

  // Auto-save when skills or meta change
  useEffect(() => {
    saveProgress()
  }, [skills, meta, saveProgress])

  // Get the current effect value of a skill
  const getSkillEffect = useCallback((skillId) => {
    const skill = skills[skillId]
    if (!skill || skill.level === 0) return 0
    return skill.effect[skill.level - 1]
  }, [skills])

  // Upgrade a skill
  const upgradeSkill = useCallback((skillId) => {
    const skill = skills[skillId]
    if (!skill || skill.level >= skill.max) return false

    const cost = skill.cost[skill.level]
    if (meta.skillPoints < cost) return false

    setMeta(prev => ({ ...prev, skillPoints: prev.skillPoints - cost }))
    setSkills(prev => ({
      ...prev,
      [skillId]: { ...prev[skillId], level: prev[skillId].level + 1 }
    }))

    return true
  }, [skills, meta.skillPoints])

  // Reset all skills
  const resetSkills = useCallback(() => {
    // Calculate total points spent
    const totalSpent = Object.values(skills).reduce((sum, skill) => {
      let spent = 0
      for (let i = 0; i < skill.level; i++) {
        spent += skill.cost[i]
      }
      return sum + spent
    }, 0)

    setMeta(prev => ({ ...prev, skillPoints: prev.skillPoints + totalSpent }))
    setSkills(JSON.parse(JSON.stringify(DEFAULT_SKILLS)))
  }, [skills])

  // Add skill points (after game ends)
  const addSkillPoints = useCallback((points) => {
    setMeta(prev => ({
      ...prev,
      skillPoints: prev.skillPoints + points
    }))
  }, [])

  // Update game stats
  const updateStats = useCallback((wave, score, isVictory, bossesKilled = 0) => {
    setMeta(prev => ({
      ...prev,
      totalGames: prev.totalGames + 1,
      bestWave: Math.max(prev.bestWave, wave),
      totalCarrots: prev.totalCarrots + score,
      bossesKilled: prev.bossesKilled + bossesKilled,
    }))
  }, [])

  return {
    skills,
    meta,
    getSkillEffect,
    upgradeSkill,
    resetSkills,
    addSkillPoints,
    updateStats,
    saveProgress,
  }
}
