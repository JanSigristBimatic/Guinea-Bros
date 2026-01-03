import * as THREE from 'three'
import { WEATHER_TYPES, WEATHER_EFFECTS } from '../../constants'

// Create rain particles
export function createRainSystem(scene) {
  const rainCount = 1000
  const rainGeo = new THREE.BufferGeometry()
  const rainPositions = new Float32Array(rainCount * 3)

  for (let i = 0; i < rainCount; i++) {
    rainPositions[i * 3] = (Math.random() - 0.5) * 80
    rainPositions[i * 3 + 1] = Math.random() * 30
    rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 80
  }

  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3))
  const rainMat = new THREE.PointsMaterial({
    color: 0x9999FF,
    size: 0.1,
    transparent: true,
    opacity: 0.6,
  })

  const rain = new THREE.Points(rainGeo, rainMat)
  rain.visible = false
  scene.add(rain)

  return rain
}

// Create fog planes
export function createFogSystem(scene, count = 8) {
  const fogPlanes = []

  for (let i = 0; i < count; i++) {
    const fogGeo = new THREE.PlaneGeometry(20, 8)
    const fogMat = new THREE.MeshBasicMaterial({
      color: 0xCCCCCC,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    })
    const fog = new THREE.Mesh(fogGeo, fogMat)
    fog.position.set(
      (Math.random() - 0.5) * 40,
      2,
      (Math.random() - 0.5) * 40
    )
    fog.rotation.y = Math.random() * Math.PI
    fog.visible = false
    scene.add(fog)
    fogPlanes.push(fog)
  }

  return fogPlanes
}

// Update rain animation
export function updateRain(rain) {
  if (!rain.visible) return

  const positions = rain.geometry.attributes.position.array
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] -= 0.5
    if (positions[i + 1] < 0) {
      positions[i + 1] = 30
    }
  }
  rain.geometry.attributes.position.needsUpdate = true
}

// Update fog animation
export function updateFog(fogPlanes, time) {
  fogPlanes.forEach((fog, i) => {
    if (!fog.visible) return
    fog.position.x += Math.sin(time + i) * 0.02
    fog.position.z += Math.cos(time + i) * 0.02
    fog.material.opacity = 0.2 + Math.sin(time * 0.5 + i) * 0.1
  })
}

// Get random weather (optionally biased by skill)
export function getRandomWeather(weatherMasterLevel = 0) {
  if (weatherMasterLevel >= 2 && Math.random() < 0.6) {
    return 'sunny'
  }
  return WEATHER_TYPES[Math.floor(Math.random() * WEATHER_TYPES.length)]
}

// Apply weather effects to scene
export function applyWeatherEffects(weather, scene, lights, rain, fogPlanes, isNight = false) {
  const effects = WEATHER_EFFECTS[weather]

  // Visibility
  rain.visible = effects.showRain || false
  fogPlanes.forEach(f => f.visible = effects.showFog || false)

  // Update fog
  if (effects.showFog) {
    scene.fog = new THREE.Fog(effects.fogColor, effects.fogNear, effects.fogFar)
  } else if (isNight) {
    scene.fog = new THREE.Fog(0x1a1a3a, 25, 60)
  } else {
    scene.fog = new THREE.Fog(effects.fogColor, effects.fogNear, effects.fogFar)
  }

  // Update lighting
  if (lights.sun) {
    lights.sun.intensity = isNight ? 0.25 : effects.sunIntensity
  }

  return effects
}
