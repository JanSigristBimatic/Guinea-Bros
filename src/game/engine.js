import * as THREE from 'three'
import { GAME_CONFIG, COLORS, LIGHTING } from '../constants'
import { createMainBurrow, updateMainBurrowHP, updateMainBurrowAnimation } from './entities/MainBurrow'
import { createRainSystem, createFogSystem, updateRain, updateFog } from './systems/weather'

// Initialize the game scene
export function initializeScene(container) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(COLORS.SKY_DAY)
  scene.fog = new THREE.Fog(COLORS.SKY_DAY, 40, 100)

  // Camera
  const aspect = container.clientWidth / container.clientHeight
  const camera = new THREE.PerspectiveCamera(GAME_CONFIG.CAMERA_FOV, aspect, 0.1, 200)
  camera.position.set(0, GAME_CONFIG.CAMERA_HEIGHT, GAME_CONFIG.CAMERA_DISTANCE)
  camera.lookAt(0, 0, 0)

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(container.clientWidth, container.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  container.appendChild(renderer.domElement)

  // Lighting
  const lights = createLighting(scene)

  // Ground
  createGround(scene)

  // Grid
  createGrid(scene)

  // Defense zones
  createDefenseZones(scene)

  // Grass
  createGrass(scene)

  // Weather systems
  const rain = createRainSystem(scene)
  const fogPlanes = createFogSystem(scene)

  // Main burrow
  const mainBurrow = createMainBurrow()
  scene.add(mainBurrow)

  return {
    scene,
    camera,
    renderer,
    lights,
    mainBurrow,
    rain,
    fogPlanes,
  }
}

// Create lighting setup
function createLighting(scene) {
  // Directional sunlight
  const sunLight = new THREE.DirectionalLight(LIGHTING.SUN_DAY, LIGHTING.SUN_INTENSITY_DAY)
  sunLight.position.set(20, 30, 20)
  sunLight.castShadow = true
  sunLight.shadow.mapSize.width = 2048
  sunLight.shadow.mapSize.height = 2048
  sunLight.shadow.camera.near = 0.5
  sunLight.shadow.camera.far = 120
  sunLight.shadow.camera.left = -50
  sunLight.shadow.camera.right = 50
  sunLight.shadow.camera.top = 50
  sunLight.shadow.camera.bottom = -50
  scene.add(sunLight)

  // Ambient light
  const ambientLight = new THREE.AmbientLight(0x8EC8FF, LIGHTING.AMBIENT_INTENSITY_DAY)
  scene.add(ambientLight)

  // Hemisphere light
  const hemiLight = new THREE.HemisphereLight(
    LIGHTING.HEMI_SKY,
    LIGHTING.HEMI_GROUND,
    LIGHTING.HEMI_INTENSITY
  )
  scene.add(hemiLight)

  return { sun: sunLight, ambient: ambientLight, hemi: hemiLight }
}

// Create ground plane
function createGround(scene) {
  const groundGeometry = new THREE.PlaneGeometry(GAME_CONFIG.WORLD_SIZE, GAME_CONFIG.WORLD_SIZE)
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: COLORS.GROUND,
    roughness: 0.9,
  })
  const ground = new THREE.Mesh(groundGeometry, groundMaterial)
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  ground.name = 'ground'
  scene.add(ground)

  return ground
}

// Create grid helper for building
function createGrid(scene) {
  const gridHelper = new THREE.GridHelper(
    GAME_CONFIG.GRID_SIZE,
    GAME_CONFIG.GRID_DIVISIONS,
    COLORS.GRID,
    COLORS.GRID
  )
  gridHelper.position.y = 0.01
  gridHelper.material.opacity = 0.2
  gridHelper.material.transparent = true
  scene.add(gridHelper)

  return gridHelper
}

// Create defense zone indicator
function createDefenseZones(scene) {
  const outerZoneGeo = new THREE.RingGeometry(
    GAME_CONFIG.BUILD_ZONE_MAX,
    GAME_CONFIG.BUILD_ZONE_MAX + 0.5,
    64
  )
  const outerZoneMat = new THREE.MeshBasicMaterial({
    color: COLORS.GROUND,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.4,
  })
  const outerZone = new THREE.Mesh(outerZoneGeo, outerZoneMat)
  outerZone.rotation.x = -Math.PI / 2
  outerZone.position.y = 0.02
  scene.add(outerZone)

  return outerZone
}

// Create decorative grass
function createGrass(scene) {
  for (let i = 0; i < GAME_CONFIG.GRASS_COUNT; i++) {
    const x = (Math.random() - 0.5) * 90
    const z = (Math.random() - 0.5) * 90

    if (Math.sqrt(x * x + z * z) > 5) {
      const group = new THREE.Group()

      for (let j = 0; j < 4; j++) {
        const h = 0.08 + Math.random() * 0.15
        const geo = new THREE.ConeGeometry(0.015, h, 3)
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(
            0.25 + Math.random() * 0.05,
            0.6,
            0.3 + Math.random() * 0.15
          ),
        })
        const blade = new THREE.Mesh(geo, mat)
        blade.position.set(
          (Math.random() - 0.5) * 0.15,
          h / 2,
          (Math.random() - 0.5) * 0.15
        )
        group.add(blade)
      }

      group.position.set(x, 0, z)
      scene.add(group)
    }
  }
}

// Transition to night phase visuals
export function transitionToNight(scene, lights) {
  scene.background = new THREE.Color(COLORS.SKY_NIGHT)
  lights.sun.intensity = LIGHTING.SUN_INTENSITY_NIGHT
  lights.sun.color.setHex(COLORS.SUN_NIGHT)
  lights.ambient.intensity = LIGHTING.AMBIENT_INTENSITY_NIGHT
}

// Transition to day phase visuals
export function transitionToDay(scene, lights) {
  scene.background = new THREE.Color(COLORS.SKY_DAY)
  lights.sun.intensity = LIGHTING.SUN_INTENSITY_DAY
  lights.sun.color.setHex(COLORS.SUN_DAY)
  lights.ambient.intensity = LIGHTING.AMBIENT_INTENSITY_DAY
}

// Update camera to follow target
export function updateCamera(camera, target, isNight = false) {
  const camTarget = isNight
    ? new THREE.Vector3(0, 0, 0)
    : target.clone()

  camera.position.x += (camTarget.x - camera.position.x) * GAME_CONFIG.CAMERA_FOLLOW_SPEED
  camera.position.z += (camTarget.z + GAME_CONFIG.CAMERA_DISTANCE - camera.position.z) * GAME_CONFIG.CAMERA_FOLLOW_SPEED
  camera.lookAt(camTarget.x * 0.5, 0, camTarget.z * 0.5)
}

// Handle window resize
export function handleResize(container, camera, renderer) {
  camera.aspect = container.clientWidth / container.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.clientWidth, container.clientHeight)
}

// Cleanup game resources
export function cleanupGame(renderer) {
  renderer.dispose()
}

// Re-export utilities
export { updateMainBurrowHP, updateMainBurrowAnimation, updateRain, updateFog }
