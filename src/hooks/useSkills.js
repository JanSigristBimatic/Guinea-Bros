import { useState, useCallback, useEffect, useRef } from 'react'
import { DEFAULT_SKILLS, DEFAULT_META } from '../constants'
import { saveToIndexedDB, loadFromIndexedDB, migrateFromLocalStorage, STORAGE_KEYS } from '../storage/indexedDB'

const LOCAL_STORAGE_KEYS = {
  SKILLS: 'guineaPigTD_skills',
  META: 'guineaPigTD_meta'
}

export function useSkills() {
  const [skills, setSkills] = useState(() => JSON.parse(JSON.stringify(DEFAULT_SKILLS)))
  const [meta, setMeta] = useState(() => ({ ...DEFAULT_META }))
  const [isLoaded, setIsLoaded] = useState(false)
  const isSaving = useRef(false)

  // Load data from IndexedDB on mount (with localStorage migration)
  useEffect(() => {
    async function loadData() {
      try {
        // Migrate from localStorage if needed
        await migrateFromLocalStorage(LOCAL_STORAGE_KEYS.SKILLS, STORAGE_KEYS.SKILLS)
        await migrateFromLocalStorage(LOCAL_STORAGE_KEYS.META, STORAGE_KEYS.META)

        // Load from IndexedDB
        const savedSkills = await loadFromIndexedDB(STORAGE_KEYS.SKILLS)
        const savedMeta = await loadFromIndexedDB(STORAGE_KEYS.META)

        if (savedSkills) {
          setSkills(savedSkills)
        }
        if (savedMeta) {
          setMeta(savedMeta)
        }
      } catch (error) {
        console.error('Failed to load from IndexedDB:', error)
      } finally {
        setIsLoaded(true)
      }
    }
    loadData()
  }, [])

  // Save progress to IndexedDB
  const saveProgress = useCallback(async () => {
    if (isSaving.current) return
    isSaving.current = true
    try {
      await Promise.all([
        saveToIndexedDB(STORAGE_KEYS.SKILLS, skills),
        saveToIndexedDB(STORAGE_KEYS.META, meta)
      ])
    } catch (error) {
      console.error('Failed to save progress:', error)
    } finally {
      isSaving.current = false
    }
  }, [skills, meta])

  // Auto-save when skills or meta change (only after initial load)
  useEffect(() => {
    if (isLoaded) {
      saveProgress()
    }
  }, [skills, meta, isLoaded, saveProgress])

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
    isLoaded,
    getSkillEffect,
    upgradeSkill,
    resetSkills,
    addSkillPoints,
    updateStats,
    saveProgress,
  }
}
