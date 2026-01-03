import { useState, useCallback } from 'react'
import { GAME_CONFIG } from '../constants'

export function useGameState(getSkillEffect) {
  // Game phase
  const [phase, setPhase] = useState('menu') // 'menu', 'loading', 'day', 'night'

  // Core game stats
  const [wave, setWave] = useState(0)
  const [score, setScore] = useState(0)

  // Base health
  const baseHealthBonus = getSkillEffect('baseHealth')
  const initialBaseHealth = GAME_CONFIG.BASE_HEALTH + baseHealthBonus
  const [baseHealth, setBaseHealth] = useState(initialBaseHealth)
  const [maxBaseHealth, setMaxBaseHealth] = useState(initialBaseHealth)

  // Day timer
  const dayLengthBonus = getSkillEffect('dayLength')
  const dayDuration = GAME_CONFIG.BASE_DAY_DURATION + dayLengthBonus
  const [dayTimeLeft, setDayTimeLeft] = useState(dayDuration)

  // Combat
  const [combo, setCombo] = useState(0)
  const [comboTimer, setComboTimer] = useState(0)
  const [rageMode, setRageMode] = useState(false)
  const [bossActive, setBossActive] = useState(false)

  // Building
  const [buildMode, setBuildMode] = useState(null)
  const [buildings, setBuildings] = useState([])

  // Weather
  const [weather, setWeather] = useState('sunny')

  // Game end states
  const [gameOver, setGameOver] = useState(false)
  const [victory, setVictory] = useState(false)

  // UI state
  const [showSkillTree, setShowSkillTree] = useState(false)
  const [message, setMessage] = useState('')

  // Reset game state for new game
  const resetGame = useCallback(() => {
    const newBaseHealth = GAME_CONFIG.BASE_HEALTH + getSkillEffect('baseHealth')
    const newDayDuration = GAME_CONFIG.BASE_DAY_DURATION + getSkillEffect('dayLength')

    setPhase('loading')
    setWave(0)
    setScore(getSkillEffect('startCarrots'))
    setBaseHealth(newBaseHealth)
    setMaxBaseHealth(newBaseHealth)
    setDayTimeLeft(newDayDuration)
    setCombo(0)
    setComboTimer(0)
    setRageMode(false)
    setBossActive(false)
    setBuildMode(null)
    setBuildings([])
    setWeather('sunny')
    setGameOver(false)
    setVictory(false)
    setShowSkillTree(false)
    setMessage('')
  }, [getSkillEffect])

  // Show temporary message
  const showMessage = useCallback((text, duration = 2000) => {
    setMessage(text)
    setTimeout(() => setMessage(''), duration)
  }, [])

  // Transition to night phase
  const startNight = useCallback(() => {
    setPhase('night')
  }, [])

  // Transition to day phase
  const startDay = useCallback(() => {
    setPhase('day')
    setWave(prev => prev + 1)
    setDayTimeLeft(GAME_CONFIG.BASE_DAY_DURATION + getSkillEffect('dayLength'))
    setBossActive(false)
  }, [getSkillEffect])

  // End game (loss)
  const endGame = useCallback(() => {
    setGameOver(true)
  }, [])

  // Win game
  const winGame = useCallback(() => {
    setVictory(true)
  }, [])

  return {
    // State
    phase, setPhase,
    wave, setWave,
    score, setScore,
    baseHealth, setBaseHealth,
    maxBaseHealth, setMaxBaseHealth,
    dayTimeLeft, setDayTimeLeft,
    dayDuration,
    combo, setCombo,
    comboTimer, setComboTimer,
    rageMode, setRageMode,
    bossActive, setBossActive,
    buildMode, setBuildMode,
    buildings, setBuildings,
    weather, setWeather,
    gameOver, setGameOver,
    victory, setVictory,
    showSkillTree, setShowSkillTree,
    message, setMessage,

    // Actions
    resetGame,
    showMessage,
    startNight,
    startDay,
    endGame,
    winGame,
  }
}
