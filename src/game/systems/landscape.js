// Landscape generation system
// Loads GLB assets or falls back to procedural generation

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  LANDSCAPE_CONFIG,
  LANDSCAPE_ASSETS,
  PROCEDURAL_LANDSCAPE
} from '../../constants/landscape.js';
import { GAME_CONFIG } from '../../constants/config.js';

class LandscapeSystem {
  constructor(scene) {
    this.scene = scene;
    this.loader = new GLTFLoader();
    this.loadedAssets = new Map();
    this.placedElements = [];
    this.resourceTrees = []; // Trees that can be harvested for wood
    this.landscapeGroup = new THREE.Group();
    this.landscapeGroup.name = 'landscape';
    this.scene.add(this.landscapeGroup);
  }

  // Load all landscape assets
  async loadAssets() {
    if (!LANDSCAPE_CONFIG.useGLBAssets) {
      console.log('[Landscape] GLB assets disabled; using procedural generation.');
      return false;
    }

    const allAssets = [
      ...LANDSCAPE_ASSETS.trees,
      ...LANDSCAPE_ASSETS.rocks,
      ...LANDSCAPE_ASSETS.bushes,
      ...LANDSCAPE_ASSETS.props,
    ];

    const loadPromises = allAssets.map(asset => this.loadAsset(asset));
    const results = await Promise.allSettled(loadPromises);

    const loaded = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[Landscape] Loaded ${loaded}/${allAssets.length} assets`);

    return loaded > 0;
  }

  async loadAsset(asset) {
    return new Promise((resolve, reject) => {
      this.loader.load(
        asset.path,
        (gltf) => {
          const model = gltf.scene;
          model.scale.setScalar(asset.scale);

          // Enable shadows
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = asset.castShadow;
              child.receiveShadow = true;
            }
          });

          this.loadedAssets.set(asset.id, { model, config: asset });
          resolve(asset.id);
        },
        undefined,
        (error) => {
          console.warn(`[Landscape] Failed to load ${asset.id}: ${error.message}`);
          reject(error);
        }
      );
    });
  }

  // Generate landscape with loaded assets or procedural fallback
  generate() {
    this.clear();

    const hasAssets = this.loadedAssets.size > 0;

    try {
      if (hasAssets) {
        this.generateFromAssets();
      } else if (PROCEDURAL_LANDSCAPE.enabled) {
        this.generateProcedural();
      }
    } catch (error) {
      console.error('[Landscape] Generation failed:', error);
    }

    console.log(`[Landscape] Generated ${this.placedElements.length} elements`);
  }

  generateFromAssets() {
    const zones = LANDSCAPE_CONFIG.zones;

    // Place trees
    this.placeCategory('trees', zones.trees, LANDSCAPE_ASSETS.trees);

    // Place additional resource trees closer to play area
    if (zones.resourceTrees) {
      this.placeCategory('resourceTrees', zones.resourceTrees, LANDSCAPE_ASSETS.trees);
    }

    // Place rocks (with clustering)
    this.placeCategoryWithClusters('rocks', zones.rocks, LANDSCAPE_ASSETS.rocks);

    // Place bushes
    this.placeCategory('bushes', zones.bushes, LANDSCAPE_ASSETS.bushes);

    // Place props
    this.placeCategory('props', zones.props, LANDSCAPE_ASSETS.props);
  }

  placeCategory(category, zoneConfig, assets) {
    const availableAssets = assets.filter(a => this.loadedAssets.has(a.id));
    if (availableAssets.length === 0) return;

    const totalWeight = availableAssets.reduce((sum, a) => sum + a.weight, 0);

    for (let i = 0; i < zoneConfig.count; i++) {
      const position = this.getRandomPosition(zoneConfig);
      if (!position) continue;

      // Weighted random asset selection
      const asset = this.selectWeightedAsset(availableAssets, totalWeight);
      this.placeElement(asset, position);
    }
  }

  placeCategoryWithClusters(category, zoneConfig, assets) {
    const availableAssets = assets.filter(a => this.loadedAssets.has(a.id));
    if (availableAssets.length === 0) return;

    const totalWeight = availableAssets.reduce((sum, a) => sum + a.weight, 0);
    let placed = 0;

    while (placed < zoneConfig.count) {
      const position = this.getRandomPosition(zoneConfig);
      if (!position) {
        placed++;
        continue;
      }

      const asset = this.selectWeightedAsset(availableAssets, totalWeight);
      this.placeElement(asset, position);
      placed++;

      // Cluster spawning
      if (Math.random() < zoneConfig.clusterChance) {
        const clusterCount = Math.floor(Math.random() * zoneConfig.clusterSize) + 1;
        for (let c = 0; c < clusterCount && placed < zoneConfig.count; c++) {
          const offset = new THREE.Vector3(
            (Math.random() - 0.5) * 4,
            0,
            (Math.random() - 0.5) * 4
          );
          const clusterPos = position.clone().add(offset);
          const clusterAsset = this.selectWeightedAsset(availableAssets, totalWeight);
          this.placeElement(clusterAsset, clusterPos);
          placed++;
        }
      }
    }
  }

  getRandomPosition(zoneConfig) {
    const maxAttempts = 20;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // Random angle
      const angle = Math.random() * Math.PI * 2;

      // Random radius within zone
      const radius = zoneConfig.minRadius +
        Math.random() * (zoneConfig.maxRadius - zoneConfig.minRadius);

      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      // Check bounds
      const worldHalf = GAME_CONFIG.WORLD_SIZE / 2;
      if (Math.abs(x) > worldHalf - 2 || Math.abs(z) > worldHalf - 2) {
        continue;
      }

      // Check if position is valid (not too close to existing elements)
      const position = new THREE.Vector3(x, 0, z);
      if (this.isPositionValid(position)) {
        return position;
      }
    }

    return null;
  }

  isPositionValid(position, minDistance = 2) {
    for (const element of this.placedElements) {
      const dist = position.distanceTo(element.position);
      if (dist < minDistance) {
        return false;
      }
    }
    return true;
  }

  selectWeightedAsset(assets, totalWeight) {
    let random = Math.random() * totalWeight;
    for (const asset of assets) {
      random -= asset.weight;
      if (random <= 0) {
        return asset;
      }
    }
    return assets[0];
  }

  placeElement(assetConfig, position) {
    const assetData = this.loadedAssets.get(assetConfig.id);
    if (!assetData) return;

    const element = assetData.model.clone();

    // Apply position with y offset
    element.position.copy(position);
    element.position.y = assetConfig.yOffset;

    // Random rotation around Y axis
    element.rotation.y = Math.random() * Math.PI * 2;

    // Slight scale variation (90% - 110%)
    const scaleVar = 0.9 + Math.random() * 0.2;
    element.scale.multiplyScalar(scaleVar);

    element.userData = {
      type: 'landscape',
      assetId: assetConfig.id,
    };

    // Mark trees as resource trees for wood harvesting
    const isTree = assetConfig.id.includes('tree') ||
                   assetConfig.id.includes('pine') ||
                   assetConfig.id.includes('oak');
    if (isTree) {
      element.userData.isResourceTree = true;
      element.userData.woodAmount = 3;
      element.userData.maxWood = 3;
      element.userData.regenTimer = 0;
      this.resourceTrees.push(element);
    }

    this.landscapeGroup.add(element);
    this.placedElements.push(element);
  }

  // Procedural fallback generation
  generateProcedural() {
    const zones = LANDSCAPE_CONFIG.zones;

    // Generate procedural trees
    for (let i = 0; i < zones.trees.count; i++) {
      const pos = this.getRandomPosition(zones.trees);
      if (pos) this.createProceduralTree(pos);
    }

    // Generate additional resource trees closer to play area
    if (zones.resourceTrees) {
      for (let i = 0; i < zones.resourceTrees.count; i++) {
        const pos = this.getRandomPosition(zones.resourceTrees);
        if (pos) this.createProceduralTree(pos);
      }
    }

    // Generate procedural rocks
    for (let i = 0; i < zones.rocks.count; i++) {
      const pos = this.getRandomPosition(zones.rocks);
      if (pos) this.createProceduralRock(pos);
    }

    // Generate procedural bushes
    for (let i = 0; i < zones.bushes.count; i++) {
      const pos = this.getRandomPosition(zones.bushes);
      if (pos) this.createProceduralBush(pos);
    }
  }

  createProceduralTree(position) {
    const tree = new THREE.Group();

    const variant = PROCEDURAL_LANDSCAPE.trees.variants[
      Math.floor(Math.random() * PROCEDURAL_LANDSCAPE.trees.variants.length)
    ];

    // Trunk
    const trunkHeight = 2 + Math.random() * 1.5;
    const trunkRadius = 0.2 + Math.random() * 0.1;
    const trunkGeom = new THREE.CylinderGeometry(
      trunkRadius * 0.7,
      trunkRadius,
      trunkHeight,
      8
    );
    const trunkMat = new THREE.MeshStandardMaterial({
      color: PROCEDURAL_LANDSCAPE.trees.trunkColor,
      roughness: 0.9,
    });
    const trunk = new THREE.Mesh(trunkGeom, trunkMat);
    trunk.position.y = trunkHeight / 2;
    trunk.castShadow = true;
    tree.add(trunk);

    // Foliage based on variant
    const foliageMat = new THREE.MeshStandardMaterial({
      color: PROCEDURAL_LANDSCAPE.trees.leavesColor,
      roughness: 0.8,
    });

    if (variant === 'pine') {
      // Cone-shaped pine tree
      const coneHeight = 3 + Math.random() * 2;
      const coneGeom = new THREE.ConeGeometry(1.2, coneHeight, 8);
      const cone = new THREE.Mesh(coneGeom, foliageMat);
      cone.position.y = trunkHeight + coneHeight / 2 - 0.3;
      cone.castShadow = true;
      tree.add(cone);
    } else if (variant === 'oak') {
      // Spherical oak tree
      const sphereGeom = new THREE.SphereGeometry(1.5 + Math.random() * 0.5, 8, 6);
      const sphere = new THREE.Mesh(sphereGeom, foliageMat);
      sphere.position.y = trunkHeight + 1;
      sphere.castShadow = true;
      tree.add(sphere);
    } else {
      // Birch - multiple small spheres
      for (let i = 0; i < 3; i++) {
        const sphereGeom = new THREE.SphereGeometry(0.8 + Math.random() * 0.3, 6, 4);
        const sphere = new THREE.Mesh(sphereGeom, foliageMat);
        sphere.position.set(
          (Math.random() - 0.5) * 0.8,
          trunkHeight + 0.5 + i * 0.6,
          (Math.random() - 0.5) * 0.8
        );
        sphere.castShadow = true;
        tree.add(sphere);
      }
    }

    tree.position.copy(position);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.userData = {
      type: 'landscape',
      assetId: `procedural_tree_${variant}`,
      isResourceTree: true,
      woodAmount: 3,
      maxWood: 3,
      regenTimer: 0,
    };

    this.landscapeGroup.add(tree);
    this.placedElements.push(tree);
    this.resourceTrees.push(tree);
  }

  createProceduralRock(position) {
    const rock = new THREE.Group();

    // Rock type variations - simpler, rounder rocks
    const rockTypes = ['boulder', 'round', 'flat', 'pebbles'];
    const rockType = rockTypes[Math.floor(Math.random() * rockTypes.length)];

    const colors = PROCEDURAL_LANDSCAPE.rocks.colors;
    const baseColor = new THREE.Color(colors[Math.floor(Math.random() * colors.length)]);

    // Slightly vary the color
    baseColor.offsetHSL(0, (Math.random() - 0.5) * 0.1, (Math.random() - 0.5) * 0.1);

    const baseMat = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.9,
      metalness: 0.0,
    });

    if (rockType === 'boulder') {
      // Large smooth boulder
      const size = 0.8 + Math.random() * 0.6;
      const geom = new THREE.SphereGeometry(size, 8, 6);

      // Gentle distortion for natural look
      this.gentleDistort(geom, 0.15);

      const mesh = new THREE.Mesh(geom, baseMat);
      mesh.scale.set(
        0.9 + Math.random() * 0.3,
        0.5 + Math.random() * 0.3,
        0.9 + Math.random() * 0.3
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rock.add(mesh);

      rock.position.y = size * 0.3;

    } else if (rockType === 'round') {
      // Medium round rock
      const size = 0.4 + Math.random() * 0.4;
      const geom = new THREE.IcosahedronGeometry(size, 1);

      this.gentleDistort(geom, 0.1);

      const mesh = new THREE.Mesh(geom, baseMat);
      mesh.scale.y = 0.6 + Math.random() * 0.2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rock.add(mesh);

      rock.position.y = size * 0.35;

    } else if (rockType === 'flat') {
      // Flat stepping stone
      const radius = 0.5 + Math.random() * 0.4;
      const height = 0.12 + Math.random() * 0.1;
      const geom = new THREE.CylinderGeometry(
        radius * 0.9,
        radius,
        height,
        10
      );

      this.gentleDistort(geom, 0.08);

      const mesh = new THREE.Mesh(geom, baseMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      rock.add(mesh);

      rock.position.y = height * 0.5;

    } else if (rockType === 'pebbles') {
      // Group of small pebbles
      const count = 3 + Math.floor(Math.random() * 3);

      for (let i = 0; i < count; i++) {
        const pebbleSize = 0.12 + Math.random() * 0.15;
        const geom = new THREE.SphereGeometry(pebbleSize, 6, 5);

        this.gentleDistort(geom, 0.12);

        // Vary color slightly
        const pebbleColor = baseColor.clone();
        pebbleColor.offsetHSL(0, 0, (Math.random() - 0.5) * 0.1);
        const pebbleMat = new THREE.MeshStandardMaterial({
          color: pebbleColor,
          roughness: 0.85,
        });

        const mesh = new THREE.Mesh(geom, pebbleMat);
        mesh.position.set(
          (Math.random() - 0.5) * 0.6,
          pebbleSize * 0.5,
          (Math.random() - 0.5) * 0.6
        );
        mesh.scale.y = 0.6 + Math.random() * 0.3;
        mesh.rotation.y = Math.random() * Math.PI;
        mesh.castShadow = true;
        rock.add(mesh);
      }
    }

    rock.position.x = position.x;
    rock.position.z = position.z;
    rock.rotation.y = Math.random() * Math.PI * 2;
    rock.userData = { type: 'landscape', assetId: `procedural_rock_${rockType}` };

    this.landscapeGroup.add(rock);
    this.placedElements.push(rock);
  }

  // Gentle distortion for smooth, natural rock shapes
  gentleDistort(geometry, amount) {
    const posAttr = geometry.getAttribute('position');
    const vertex = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      vertex.fromBufferAttribute(posAttr, i);

      // Use noise-like distortion based on position
      const noise = Math.sin(vertex.x * 5) * Math.cos(vertex.z * 5) * 0.5 + 0.5;
      const scale = 1 + (noise - 0.5) * amount * 2;

      vertex.multiplyScalar(scale);
      posAttr.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    geometry.computeVertexNormals();
  }

  createProceduralBush(position) {
    const bush = new THREE.Group();

    const mat = new THREE.MeshStandardMaterial({
      color: PROCEDURAL_LANDSCAPE.bushes.color,
      roughness: 0.8,
    });

    // Create bush from multiple spheres
    const sphereCount = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < sphereCount; i++) {
      const radius = 0.3 + Math.random() * 0.3;
      const geom = new THREE.SphereGeometry(radius, 6, 4);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(
        (Math.random() - 0.5) * 0.6,
        radius * 0.8,
        (Math.random() - 0.5) * 0.6
      );
      mesh.castShadow = false;
      bush.add(mesh);
    }

    // Optional berries
    if (Math.random() > 0.7) {
      const berryMat = new THREE.MeshStandardMaterial({
        color: PROCEDURAL_LANDSCAPE.bushes.berryColor,
      });
      for (let i = 0; i < 5; i++) {
        const berryGeom = new THREE.SphereGeometry(0.05, 4, 4);
        const berry = new THREE.Mesh(berryGeom, berryMat);
        berry.position.set(
          (Math.random() - 0.5) * 0.8,
          0.3 + Math.random() * 0.4,
          (Math.random() - 0.5) * 0.8
        );
        bush.add(berry);
      }
    }

    bush.position.copy(position);
    bush.rotation.y = Math.random() * Math.PI * 2;
    bush.userData = { type: 'landscape', assetId: 'procedural_bush' };

    this.landscapeGroup.add(bush);
    this.placedElements.push(bush);
  }

  // Get all resource trees that still have wood
  getAllResourceTrees() {
    return this.resourceTrees.filter(t => t.userData.woodAmount > 0);
  }

  // Get all resource trees (including empty ones for regeneration)
  getAllTrees() {
    return this.resourceTrees;
  }

  clear() {
    while (this.landscapeGroup.children.length > 0) {
      const child = this.landscapeGroup.children[0];
      this.landscapeGroup.remove(child);

      // Dispose geometry and materials
      child.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    this.placedElements = [];
    this.resourceTrees = [];
  }

  dispose() {
    this.clear();
    this.scene.remove(this.landscapeGroup);
    this.loadedAssets.clear();
  }
}

// Factory function for easy integration
export function createLandscape(scene) {
  return new LandscapeSystem(scene);
}

export default LandscapeSystem;
