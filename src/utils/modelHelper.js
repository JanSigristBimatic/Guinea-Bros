import * as THREE from 'three';

/**
 * Positioniert ein GLB-Modell so, dass der unterste Punkt auf Y=0 liegt.
 * Diese Funktion wird automatisch von positionModelOnGround im Game verwendet.
 *
 * @param {THREE.Object3D} model - Das geladene GLB-Modell (gltf.scene)
 * @param {number} scale - Die gewünschte Skalierung
 * @param {object} options - Optionale Einstellungen
 * @param {number} options.rotationY - Y-Rotation in Rad (default: 0)
 * @param {number} options.offsetY - Zusätzlicher Y-Offset (default: 0)
 * @returns {object} - { groundOffset, size, boundingBox }
 */
export function positionModelOnGround(model, scale = 1, options = {}) {
  const { rotationY = 0, offsetY = 0 } = options;

  // Skalierung anwenden
  model.scale.setScalar(scale);

  // Rotation anwenden (BEVOR BoundingBox berechnet wird)
  model.rotation.y = rotationY;

  // BoundingBox nach Skalierung + Rotation berechnen
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);

  // Ground Offset = wie viel Y nötig ist damit min.y = 0
  const groundOffset = -box.min.y + offsetY;
  model.position.y = groundOffset;

  return {
    groundOffset,
    size: box.getSize(new THREE.Vector3()),
    boundingBox: box
  };
}

/**
 * Berechnet den Ground Offset für ein Modell ohne es zu verändern.
 * Nützlich für die Vorschau oder Konfiguration.
 *
 * @param {THREE.Object3D} model - Das geladene GLB-Modell
 * @param {number} scale - Die gewünschte Skalierung
 * @returns {number} - Der Y-Wert für model.position.y
 */
export function calculateGroundOffset(model, scale = 1) {
  // Temporär skalieren
  const originalScale = model.scale.clone();
  model.scale.setScalar(scale);

  // BoundingBox berechnen
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const groundOffset = -box.min.y;

  // Skalierung zurücksetzen
  model.scale.copy(originalScale);

  return groundOffset;
}

/**
 * GLB Model Paths - Zentrale Referenz aller verfügbaren Modelle
 */
export const MODEL_PATHS = {
  // Helden
  Maincharacter: '/glb/Maincharacter/Maincharacter.glb',
  Healer: '/glb/Healer/Healer.glb',
  Tank: '/glb/Healer/Tank.glb',
  Turret: '/glb/Healer/Turet.glb',
  Bomber: '/glb/Bomber/Bomber.glb',
  Sammler: '/glb/Sammler.glb',

  // Gebäude
  House: '/glb/Buildings/House.glb',
  Tower: '/glb/Buildings/Tower.glb',
  Fort: '/glb/Buildings/Fort.glb',

  // Items
  Bombe: '/glb/Bomber/Bombe.glb',
  Karotte: '/glb/vegetables/Karotte.glb',
};

/**
 * Empfohlene Skalen für jedes Modell
 * Diese Werte wurden im GLB Configurator ermittelt
 */
export const MODEL_SCALES = {
  Maincharacter: 3.0,
  Healer: 0.7,
  Tank: 1.0,
  Turret: 1.0,
  Bomber: 0.8,
  Sammler: 2.25,
  House: 1.6,
  Tower: 2.4,
  Fort: 3.2,
  Bombe: 0.8,
  Karotte: 0.4,
};

/**
 * Empfohlene Y-Rotationen (in Rad)
 */
export const MODEL_ROTATIONS = {
  Maincharacter: Math.PI / 2, // 90°
  Sammler: Math.PI / 2, // 90°
  Bomber: Math.PI / 2, // 90°
  Tank: Math.PI, // 180°
};

/**
 * Lädt und positioniert ein GLB-Modell mit korrekter Bodenausrichtung.
 *
 * @param {GLTFLoader} loader - Der GLTFLoader
 * @param {string} path - Pfad zum GLB
 * @param {number} scale - Skalierung
 * @param {object} options - Optionen { rotationY }
 * @param {function} onLoaded - Callback(model, info)
 * @param {function} onError - Error Callback
 */
export function loadAndPositionModel(loader, path, scale, options, onLoaded, onError) {
  loader.load(
    path,
    (gltf) => {
      const model = gltf.scene;
      const info = positionModelOnGround(model, scale, options);

      // Shadows aktivieren
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      onLoaded(model, info);
    },
    undefined,
    onError
  );
}
