import { useState, useEffect, useCallback, useRef } from 'react'

export function useControls() {
  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false })
  const joystick = useRef({ active: false, startX: 0, startY: 0, moveX: 0, moveZ: 0 })

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      const k = e.key.toLowerCase()
      if (k in keys) {
        setKeys(prev => ({ ...prev, [k]: true }))
      }
    }

    const handleKeyUp = (e) => {
      const k = e.key.toLowerCase()
      if (k in keys) {
        setKeys(prev => ({ ...prev, [k]: false }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Touch handlers
  const handleTouchStart = useCallback((e, inBuildMode = false, onBuildTap = null) => {
    const touch = e.touches[0]

    // If in build mode, handle building placement via callback
    if (inBuildMode && onBuildTap) {
      onBuildTap(touch.clientX, touch.clientY)
      return
    }

    joystick.current.active = true
    joystick.current.startX = touch.clientX
    joystick.current.startY = touch.clientY
  }, [])

  const handleTouchMove = useCallback((e) => {
    if (!joystick.current.active) return
    e.preventDefault()

    const touch = e.touches[0]
    const dx = touch.clientX - joystick.current.startX
    const dy = touch.clientY - joystick.current.startY
    const maxDist = 60

    joystick.current.moveX = Math.max(-1, Math.min(1, dx / maxDist))
    joystick.current.moveZ = Math.max(-1, Math.min(1, dy / maxDist))
  }, [])

  const handleTouchEnd = useCallback(() => {
    joystick.current.active = false
    joystick.current.moveX = 0
    joystick.current.moveZ = 0
  }, [])

  // Get current movement vector
  const getMovement = useCallback(() => {
    let moveX = joystick.current.moveX
    let moveZ = joystick.current.moveZ

    if (keys.w) moveZ -= 1
    if (keys.s) moveZ += 1
    if (keys.a) moveX -= 1
    if (keys.d) moveX += 1

    // Normalize
    const len = Math.sqrt(moveX * moveX + moveZ * moveZ)
    if (len > 1) {
      moveX /= len
      moveZ /= len
    }

    return { moveX, moveZ, isMoving: Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1 }
  }, [keys])

  return {
    keys,
    joystick: joystick.current,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    getMovement,
  }
}
