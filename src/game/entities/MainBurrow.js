import * as THREE from 'three'
import { createMaterial } from '../utils/three-helpers'

export function createMainBurrow() {
  const group = new THREE.Group()

  // Main mound
  const moundGeo = new THREE.SphereGeometry(4.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)
  const moundMat = createMaterial(0x8B4513, { roughness: 0.9 })
  const mound = new THREE.Mesh(moundGeo, moundMat)
  mound.castShadow = true
  mound.receiveShadow = true
  group.add(mound)

  // Entrance
  const holeGeo = new THREE.CircleGeometry(1.5, 32)
  const holeMat = createMaterial(0x2d1810)
  const hole = new THREE.Mesh(holeGeo, holeMat)
  hole.position.set(3.5, 1.2, 0)
  hole.rotation.y = -Math.PI / 2
  hole.rotation.x = -0.3
  group.add(hole)

  // Decorative roof top
  const roofGeo = new THREE.ConeGeometry(2, 1.5, 8)
  const roofMat = createMaterial(0x654321)
  const roof = new THREE.Mesh(roofGeo, roofMat)
  roof.position.set(0, 4.5, 0)
  roof.castShadow = true
  group.add(roof)

  // Flag pole
  const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8)
  const poleMat = createMaterial(0x8B4513)
  const pole = new THREE.Mesh(poleGeo, poleMat)
  pole.position.set(0, 5.5, 0)
  group.add(pole)

  // Flag
  const flagGeo = new THREE.PlaneGeometry(1.2, 0.8)
  const flagMat = createMaterial(0xFF6B35, { side: THREE.DoubleSide })
  const flag = new THREE.Mesh(flagGeo, flagMat)
  flag.position.set(0.6, 6.2, 0)
  group.add(flag)
  group.userData.flag = flag

  // HP bar background
  const hpBgGeo = new THREE.PlaneGeometry(6, 0.5)
  const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x333333 })
  const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat)
  hpBg.position.set(0, 7.5, 0)
  hpBg.rotation.x = -0.3
  group.add(hpBg)

  // HP bar foreground
  const hpBarGeo = new THREE.PlaneGeometry(5.8, 0.4)
  const hpBarMat = new THREE.MeshBasicMaterial({ color: 0x00FF00 })
  const hpBar = new THREE.Mesh(hpBarGeo, hpBarMat)
  hpBar.position.set(0, 7.52, 0.02)
  hpBar.rotation.x = -0.3
  group.add(hpBar)
  group.userData.hpBar = hpBar

  return group
}

// Update main burrow HP bar
export function updateMainBurrowHP(burrow, currentHP, maxHP) {
  if (burrow.userData.hpBar) {
    const hp = currentHP / maxHP
    burrow.userData.hpBar.scale.x = Math.max(0.01, hp)
    burrow.userData.hpBar.material.color.setHex(
      hp > 0.5 ? 0x00FF00 : (hp > 0.25 ? 0xFFFF00 : 0xFF0000)
    )
  }
}

// Animate flag
export function updateMainBurrowAnimation(burrow, time) {
  if (burrow.userData.flag) {
    burrow.userData.flag.rotation.z = Math.sin(time * 3) * 0.1
  }
}
