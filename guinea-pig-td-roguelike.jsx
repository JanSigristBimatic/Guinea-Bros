import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  createEnhancedGround,
  createEnhancedLighting,
  createClouds,
  createDustParticles
} from './src/utils/graphics.js';

// ============== GLB MODEL POSITIONING HELPER ==============
/**
 * Positioniert ein GLB-Modell korrekt auf dem Boden (Y=0)
 * Berechnet automatisch den Ground Offset aus der BoundingBox
 *
 * @param {THREE.Object3D} model - Das geladene gltf.scene
 * @param {number} scale - Skalierungsfaktor
 * @param {object} options - Optionen
 * @param {number} options.rotationY - Y-Rotation in Rad (default: 0)
 * @param {number} options.offsetY - Zusätzlicher Y-Offset (default: 0)
 * @returns {object} - { groundOffset, size }
 */
function positionModelOnGround(model, scale = 1, options = {}) {
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

// ============== PERSISTENT SKILL TREE DATA ==============
const DEFAULT_SKILLS = {
  // Tier 1 - Basic
  startCarrots: { level: 0, max: 5, cost: [10, 20, 35, 50, 75], effect: [5, 10, 15, 25, 40], name: 'Startkapital', desc: '+{} Startkarotten', icon: '🥕' },
  baseHealth: { level: 0, max: 5, cost: [15, 30, 50, 75, 100], effect: [25, 50, 75, 125, 200], name: 'Festungsbau', desc: '+{} Basis-HP', icon: '🏠' },
  dayLength: { level: 0, max: 3, cost: [20, 40, 70], effect: [15, 30, 45], name: 'Lange Tage', desc: '+{}s Tageslänge', icon: '☀️' },
  
  // Tier 2 - Collectors
  collectorSpeed: { level: 0, max: 4, cost: [25, 50, 80, 120], effect: [15, 30, 50, 75], name: 'Flinke Sammler', desc: '+{}% Sammler-Speed', icon: '🏃' },
  collectorCapacity: { level: 0, max: 3, cost: [30, 60, 100], effect: [1, 2, 3], name: 'Grosse Taschen', desc: '+{} Tragekapazität', icon: '🎒' },
  autoCollect: { level: 0, max: 1, cost: [150], effect: [1], name: 'Magnetfeld', desc: 'Karotten fliegen zu dir', icon: '🧲' },
  
  // Tier 3 - Buildings
  cheapBuildings: { level: 0, max: 4, cost: [35, 70, 110, 160], effect: [10, 20, 30, 40], name: 'Effizienter Bau', desc: '-{}% Gebäudekosten', icon: '🔨' },
  towerDamage: { level: 0, max: 5, cost: [30, 55, 85, 120, 170], effect: [20, 40, 65, 100, 150], name: 'Scharfschütze', desc: '+{}% Turm-Schaden', icon: '🎯' },
  towerRange: { level: 0, max: 3, cost: [40, 80, 130], effect: [15, 30, 50], name: 'Weitsicht', desc: '+{}% Turm-Reichweite', icon: '👁️' },
  wallHealth: { level: 0, max: 4, cost: [25, 45, 75, 110], effect: [50, 100, 175, 300], name: 'Stahlmauern', desc: '+{} Mauer-HP', icon: '🧱' },
  
  // Tier 4 - Heroes
  heroSpawnRate: { level: 0, max: 3, cost: [50, 100, 175], effect: [3, 6, 10], name: 'Heldenruf', desc: '-{}s Helden-Spawn', icon: '⚔️' },
  heroStats: { level: 0, max: 4, cost: [45, 85, 140, 200], effect: [15, 30, 50, 80], name: 'Elite-Training', desc: '+{}% Helden-Stats', icon: '💪' },
  startHero: { level: 0, max: 1, cost: [200], effect: [1], name: 'Veteranen', desc: 'Starte mit 1 Held', icon: '🦸' },
  
  // Tier 5 - Special
  critChance: { level: 0, max: 3, cost: [60, 120, 200], effect: [10, 20, 35], name: 'Kritische Treffer', desc: '{}% Crit-Chance', icon: '⚡' },
  rageBonus: { level: 0, max: 2, cost: [80, 160], effect: [25, 50], name: 'Berserker', desc: '+{}% Rage-Bonus', icon: '🔥' },
  weatherMaster: { level: 0, max: 2, cost: [100, 200], effect: [1, 2], name: 'Wetterkontrolle', desc: 'Bessere Wetter-Effekte', icon: '🌤️' },
  
  // Tier 6 - Ultimate
  goldenAge: { level: 0, max: 1, cost: [500], effect: [1], name: 'Goldenes Zeitalter', desc: 'Goldene Karotten +50% häufiger', icon: '✨' },
  fortress: { level: 0, max: 1, cost: [750], effect: [1], name: 'Uneinnehmbar', desc: 'Basis regeneriert 1 HP/s', icon: '🏰' },
};

function loadSkills() {
  try {
    const saved = localStorage.getItem('guineaPigTD_skills');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAULT_SKILLS));
}

function loadMeta() {
  try {
    const saved = localStorage.getItem('guineaPigTD_meta');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return { totalGames: 0, bestWave: 0, totalCarrots: 0, skillPoints: 0, bossesKilled: 0 };
}

// ============== WAVE CONFIGURATION ==============
const WAVES_CONFIG = [
  { foxes: 5, ravens: 0, snakes: 0, delay: 1.8 },
  { foxes: 7, ravens: 3, snakes: 0, delay: 1.5 },
  { foxes: 8, ravens: 5, snakes: 2, delay: 1.3, boss: 'fox' },
  { foxes: 12, ravens: 7, snakes: 4, delay: 1.1 },
  { foxes: 15, ravens: 10, snakes: 5, delay: 0.9 },
  { foxes: 18, ravens: 12, snakes: 8, delay: 0.8, boss: 'raven' },
  { foxes: 22, ravens: 15, snakes: 10, delay: 0.7 },
  { foxes: 30, ravens: 20, snakes: 15, delay: 0.5, boss: 'both' },
];

export default function GuineaPigTDRoguelike() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const gameRef = useRef({});
  
  // Game state
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(0);
  const [phase, setPhase] = useState('menu');
  const [baseHealth, setBaseHealth] = useState(100);
  const [maxBaseHealth, setMaxBaseHealth] = useState(100);
  const [message, setMessage] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [victory, setVictory] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [dayTimeLeft, setDayTimeLeft] = useState(90);
  const [combo, setCombo] = useState(0);
  const [comboTimer, setComboTimer] = useState(0);
  const [weather, setWeather] = useState('sunny');
  const [rageMode, setRageMode] = useState(false);
  const [bossActive, setBossActive] = useState(false);
  
  // Building state
  const [buildMode, setBuildMode] = useState(null);
  const [buildings, setBuildings] = useState([]);
  const [buildRotation, setBuildRotation] = useState(0); // 0, 45, 90, 135, 180, 225, 270, 315 degrees
  const [wallDragStart, setWallDragStart] = useState(null); // For wall drag-building
  
  // Skill tree
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [skills, setSkills] = useState(loadSkills);
  const [meta, setMeta] = useState(loadMeta);
  
  // Save skills
  const saveProgress = useCallback(() => {
    localStorage.setItem('guineaPigTD_skills', JSON.stringify(skills));
    localStorage.setItem('guineaPigTD_meta', JSON.stringify(meta));
  }, [skills, meta]);

  // Calculate skill effects
  const getSkillEffect = useCallback((skillId) => {
    const skill = skills[skillId];
    if (!skill || skill.level === 0) return 0;
    return skill.effect[skill.level - 1];
  }, [skills]);

  // Building costs with skill discount
  const getBuildingCost = useCallback((type) => {
    const baseCosts = {
      collectorHut: 15,
      heroHut: 35,
      tower: 25,
      wall: 8,
    };
    const discount = getSkillEffect('cheapBuildings') / 100;
    return Math.floor(baseCosts[type] * (1 - discount));
  }, [getSkillEffect]);

  // Upgrade skill
  const upgradeSkill = useCallback((skillId) => {
    const skill = skills[skillId];
    if (skill.level >= skill.max) return;
    const cost = skill.cost[skill.level];
    if (meta.skillPoints < cost) return;
    
    setMeta(prev => ({ ...prev, skillPoints: prev.skillPoints - cost }));
    setSkills(prev => ({
      ...prev,
      [skillId]: { ...prev[skillId], level: prev[skillId].level + 1 }
    }));
  }, [skills, meta.skillPoints]);

  // Start game
  const startGame = useCallback(() => {
    setPhase('loading');
    setShowSkillTree(false);
    setTimeout(() => initGame(), 100);
  }, []);

  // Initialize 3D game
  const initGame = useCallback(() => {
    if (!containerRef.current || sceneRef.current) return;
    sceneRef.current = true;

    // ============== SCENE SETUP ==============
    const scene = new THREE.Scene();
    scene.background = null; // Using sky dome instead

    const camera = new THREE.PerspectiveCamera(50, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 250);
    camera.position.set(0, 28, 35);
    camera.lookAt(0, 0, 0);

    // Zoom control
    let zoomLevel = 1;
    const minZoom = 0.5;
    const maxZoom = 2.5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);

    // ============== ENHANCED GRAPHICS ==============
    // Sky background (simple gradient via fog)
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 60, 150);

    // Enhanced Lighting (5 light sources)
    const lights = createEnhancedLighting(scene);

    // Clouds
    const clouds = createClouds(scene);

    // Dust Particles
    const dustParticles = createDustParticles(scene);

    // ============== GROUND ==============
    const ground = createEnhancedGround(scene);

    // Grid for building (subtle)
    const gridHelper = new THREE.GridHelper(40, 20, 0x3d8b40, 0x3d8b40);
    gridHelper.position.y = 0.01;
    gridHelper.material.opacity = 0.2;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // Defense zones
    const outerZoneGeo = new THREE.RingGeometry(14, 14.5, 64);
    const outerZoneMat = new THREE.MeshBasicMaterial({ color: 0x4CAF50, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const outerZone = new THREE.Mesh(outerZoneGeo, outerZoneMat);
    outerZone.rotation.x = -Math.PI / 2;
    outerZone.position.y = 0.02;
    scene.add(outerZone);

    // Grass tufts
    for (let i = 0; i < 800; i++) {
      const x = (Math.random() - 0.5) * 90;
      const z = (Math.random() - 0.5) * 90;
      if (Math.sqrt(x*x + z*z) > 5) {
        const group = new THREE.Group();
        for (let j = 0; j < 4; j++) {
          const h = 0.08 + Math.random() * 0.15;
          const geo = new THREE.ConeGeometry(0.015, h, 3);
          const mat = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color().setHSL(0.25 + Math.random() * 0.05, 0.6, 0.3 + Math.random() * 0.15)
          });
          const blade = new THREE.Mesh(geo, mat);
          blade.position.set((Math.random() - 0.5) * 0.15, h / 2, (Math.random() - 0.5) * 0.15);
          group.add(blade);
        }
        group.position.set(x, 0, z);
        scene.add(group);
      }
    }

    // Weather particles
    const weatherParticles = [];
    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 1000;
    const rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      rainPositions[i * 3] = (Math.random() - 0.5) * 80;
      rainPositions[i * 3 + 1] = Math.random() * 30;
      rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0x9999FF, size: 0.1, transparent: true, opacity: 0.6 });
    const rain = new THREE.Points(rainGeo, rainMat);
    rain.visible = false;
    scene.add(rain);

    // ============== MAIN BURROW (enhanced) ==============
    function createMainBurrow() {
      const group = new THREE.Group();
      
      // Main mound
      const moundGeo = new THREE.SphereGeometry(4.5, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const moundMat = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.9 });
      const mound = new THREE.Mesh(moundGeo, moundMat);
      mound.castShadow = true;
      mound.receiveShadow = true;
      group.add(mound);

      // Entrance
      const holeGeo = new THREE.CircleGeometry(1.5, 32);
      const holeMat = new THREE.MeshStandardMaterial({ color: 0x2d1810 });
      const hole = new THREE.Mesh(holeGeo, holeMat);
      hole.position.set(3.5, 1.2, 0);
      hole.rotation.y = -Math.PI / 2;
      hole.rotation.x = -0.3;
      group.add(hole);

      // Decorative elements
      const roofGeo = new THREE.ConeGeometry(2, 1.5, 8);
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.set(0, 4.5, 0);
      roof.castShadow = true;
      group.add(roof);

      // Flag
      const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.5, 8);
      const poleMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.set(0, 5.5, 0);
      group.add(pole);

      const flagGeo = new THREE.PlaneGeometry(1.2, 0.8);
      const flagMat = new THREE.MeshStandardMaterial({ color: 0xFF6B35, side: THREE.DoubleSide });
      const flag = new THREE.Mesh(flagGeo, flagMat);
      flag.position.set(0.6, 6.2, 0);
      group.add(flag);
      group.userData.flag = flag;

      // HP bar
      const hpBgGeo = new THREE.PlaneGeometry(6, 0.5);
      const hpBgMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
      const hpBg = new THREE.Mesh(hpBgGeo, hpBgMat);
      hpBg.position.set(0, 7.5, 0);
      hpBg.rotation.x = -0.3;
      group.add(hpBg);

      const hpBarGeo = new THREE.PlaneGeometry(5.8, 0.4);
      const hpBarMat = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
      const hpBar = new THREE.Mesh(hpBarGeo, hpBarMat);
      hpBar.position.set(0, 7.52, 0.02);
      hpBar.rotation.x = -0.3;
      group.add(hpBar);
      group.userData.hpBar = hpBar;

      return group;
    }

    const mainBurrow = createMainBurrow();
    scene.add(mainBurrow);

    // ============== GUINEA PIG HOUSES ==============
    // Gebäude mit GLB-Modellen
    const buildingModelPaths = {
      collectorHut: '/glb/Buildings/House.glb',
      heroHut: '/glb/Buildings/Fort.glb',
      tower: '/glb/Buildings/Tower.glb',
    };

    const buildingScales = {
      collectorHut: 1.6,
      heroHut: 3.2,
      tower: 2.4,
    };

    function createGuineaPigHouse(type) {
      const group = new THREE.Group();
      group.userData = {
        type,
        spawnTimer: 0,
        health: type === 'wall' ? (100 + getSkillEffect('wallHealth')) : 200,
        maxHealth: type === 'wall' ? (100 + getSkillEffect('wallHealth')) : 200,
      };

      if (type === 'wall') {
        // Simple wall segment (keep procedural)
        const wallGeo = new THREE.BoxGeometry(2, 1.8, 0.6);
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x696969, roughness: 0.9 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.y = 0.9;
        wall.castShadow = true;
        wall.receiveShadow = true;
        group.add(wall);

        // Top detail
        const topGeo = new THREE.BoxGeometry(2.2, 0.3, 0.8);
        const top = new THREE.Mesh(topGeo, new THREE.MeshStandardMaterial({ color: 0x4a4a4a }));
        top.position.y = 1.95;
        top.castShadow = true;
        group.add(top);
      } else if (buildingModelPaths[type]) {
        // Load GLB model for building
        const loader = new GLTFLoader();
        loader.load(
          buildingModelPaths[type],
          (gltf) => {
            const model = gltf.scene;
            const scale = buildingScales[type] || 1;
            // Automatische Boden-Positionierung
            positionModelOnGround(model, scale);
            model.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            group.add(model);
          },
          undefined,
          (error) => {
            console.error(`Error loading ${type} model:`, error);
            // Fallback: create simple placeholder
            const fallbackGeo = new THREE.BoxGeometry(2, 2, 2);
            const fallbackMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
            const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
            fallback.position.y = 1;
            fallback.castShadow = true;
            group.add(fallback);
          }
        );
      }

      // HP bar for all buildings (adjusted for larger models)
      const hpBarHeight = type === 'wall' ? 2.5 : (type === 'tower' ? 10 : (type === 'heroHut' ? 12 : 6));
      const hpBgGeo = new THREE.PlaneGeometry(2, 0.2);
      const hpBg = new THREE.Mesh(hpBgGeo, new THREE.MeshBasicMaterial({ color: 0x333333 }));
      hpBg.position.y = hpBarHeight;
      hpBg.rotation.x = -0.3;
      group.add(hpBg);

      const hpBarGeo = new THREE.PlaneGeometry(1.9, 0.15);
      const hpBar = new THREE.Mesh(hpBarGeo, new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
      hpBar.position.y = hpBarHeight + 0.02;
      hpBar.rotation.x = -0.3;
      group.add(hpBar);
      group.userData.hpBar = hpBar;

      return group;
    }

    // ============== GUINEA PIG MODELS ==============
    const GUINEA_PIG_TYPES = {
      player: { c1: 0xFFD700, c2: 0xFFFACD, name: 'Commander' },
      partner1: { c1: 0xD2691E, c2: 0xF5F5DC, name: 'Brownie' },
      partner2: { c1: 0x2F2F2F, c2: 0xFFFFFF, name: 'Oreo' },
      partner3: { c1: 0x8B4513, c2: 0xFFA500, name: 'Caramel' },
      collector: { c1: 0xFFA500, c2: 0xFFE4B5, name: 'Sammler' },
      tunneler: { c1: 0x8B4513, c2: 0xD2691E, name: 'Tunneler' },
      shadow: { c1: 0x2F2F2F, c2: 0x696969, name: 'Shadow' },
      bomber: { c1: 0xFF6B35, c2: 0xFFD700, name: 'Bomber' },
      healer: { c1: 0xFFFFFF, c2: 0xFFB6C1, name: 'Healer' },
      tank: { c1: 0x4682B4, c2: 0xB0C4DE, name: 'Tank' },
      assassin: { c1: 0x800080, c2: 0xDA70D6, name: 'Assassin' },
    };

    function createGuineaPig(type, isPlayer = false, scale = 1) {
      const config = GUINEA_PIG_TYPES[type] || GUINEA_PIG_TYPES.player;
      const group = new THREE.Group();

      const heroBonus = 1 + getSkillEffect('heroStats') / 100;

      group.userData = {
        type,
        isPlayer,
        isPartner: type.startsWith('partner'),
        isCollector: type === 'collector',
        health: isPlayer ? 100 : Math.floor(50 * heroBonus),
        maxHealth: isPlayer ? 100 : Math.floor(50 * heroBonus),
        attackCooldown: 0,
        abilityCooldown: 0,
        targetRotation: 0,
        radius: 0.8 * scale,
        targetPos: new THREE.Vector3(),
        waitTime: 0,
        carryingCarrots: 0,
        maxCarry: 2 + getSkillEffect('collectorCapacity'),
        speed: type === 'collector' ? (0.04 * (1 + getSkillEffect('collectorSpeed') / 100)) : 0.025,
        attackRange: type === 'bomber' ? 7 : (type === 'assassin' ? 3 : 5),
        attackDamage: Math.floor((type === 'bomber' ? 30 : (type === 'assassin' ? 45 : 18)) * heroBonus),
      };

      // Use GLB model for collector (Sammler)
      if (type === 'collector') {
        const loader = new GLTFLoader();
        loader.load(
          '/glb/Sammler.glb',
          (gltf) => {
            const model = gltf.scene;
            // Automatische Boden-Positionierung mit Rotation
            positionModelOnGround(model, 2.25, { rotationY: Math.PI / 2 });
            model.traverse((child) => {
              if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
              }
            });
            group.add(model);
          },
          undefined,
          (error) => {
            console.error('Error loading Sammler model:', error);
            // Fallback: create simple placeholder
            const fallbackGeo = new THREE.SphereGeometry(0.5, 8, 8);
            const fallbackMat = new THREE.MeshStandardMaterial({ color: 0xFFA500 });
            const fallback = new THREE.Mesh(fallbackGeo, fallbackMat);
            fallback.position.y = 0.5;
            fallback.castShadow = true;
            group.add(fallback);
          }
        );
        group.scale.setScalar(scale);
        return group;
      }

      const { c1, c2 } = config;

      // Body
      const bodyGeo = new THREE.SphereGeometry(0.5, 24, 12);
      bodyGeo.scale(1.4, 0.8, 1);
      const bodyMat = new THREE.MeshStandardMaterial({ color: c1, roughness: 0.8 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.35;
      body.castShadow = true;
      group.add(body);

      // Patch
      const patchGeo = new THREE.SphereGeometry(0.32, 12, 8);
      patchGeo.scale(1.1, 0.55, 0.75);
      const patch = new THREE.Mesh(patchGeo, new THREE.MeshStandardMaterial({ color: c2, roughness: 0.8 }));
      patch.position.set(-0.1, 0.48, 0);
      group.add(patch);

      // Head
      const headGeo = new THREE.SphereGeometry(0.3, 24, 12);
      headGeo.scale(1.1, 0.9, 1);
      const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: c1, roughness: 0.8 }));
      head.position.set(0.52, 0.38, 0);
      head.castShadow = true;
      group.add(head);

      // Eyes
      [-0.11, 0.11].forEach(z => {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.06, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        eye.position.set(0.72, 0.46, z);
        group.add(eye);

        const shine = new THREE.Mesh(
          new THREE.SphereGeometry(0.025, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        shine.position.set(0.76, 0.48, z * 0.7);
        group.add(shine);
      });

      // Nose
      const nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.06, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xFFB6C1 })
      );
      nose.position.set(0.82, 0.34, 0);
      group.add(nose);

      // Ears
      const earGeo = new THREE.SphereGeometry(0.09, 12, 6);
      earGeo.scale(0.5, 1, 0.3);
      [-0.18, 0.18].forEach(z => {
        const ear = new THREE.Mesh(earGeo, new THREE.MeshStandardMaterial({ color: c1 }));
        ear.position.set(0.44, 0.6, z);
        ear.rotation.x = z > 0 ? 0.25 : -0.25;
        group.add(ear);
      });

      // Feet
      const footGeo = new THREE.SphereGeometry(0.08, 6, 6);
      footGeo.scale(1.1, 0.5, 1);
      [[-0.35, 0.2], [-0.35, -0.2], [0.35, 0.18], [0.35, -0.18]].forEach(([x, z]) => {
        const foot = new THREE.Mesh(footGeo, new THREE.MeshStandardMaterial({ color: 0x2d2d2d }));
        foot.position.set(x, 0.08, z);
        group.add(foot);
      });

      // Player crown
      if (isPlayer) {
        const crownGeo = new THREE.ConeGeometry(0.12, 0.18, 5);
        const crownMat = new THREE.MeshStandardMaterial({ color: 0xFFD700, emissive: 0xFFAA00, emissiveIntensity: 0.4 });
        const crown = new THREE.Mesh(crownGeo, crownMat);
        crown.position.set(0.52, 0.82, 0);
        group.add(crown);
        group.userData.crown = crown;
      }

      // Type accessories
      if (type === 'tank') {
        const armorGeo = new THREE.BoxGeometry(0.8, 0.3, 0.7);
        const armor = new THREE.Mesh(armorGeo, new THREE.MeshStandardMaterial({ color: 0x4682B4, metalness: 0.6 }));
        armor.position.set(0, 0.55, 0);
        group.add(armor);
      }

      if (type === 'assassin') {
        const capeGeo = new THREE.PlaneGeometry(0.6, 0.5);
        const cape = new THREE.Mesh(capeGeo, new THREE.MeshStandardMaterial({ color: 0x4B0082, side: THREE.DoubleSide }));
        cape.position.set(-0.5, 0.4, 0);
        cape.rotation.y = Math.PI / 2;
        group.add(cape);
      }

      // HP bar for non-player, non-collector
      if (!isPlayer && type !== 'collector' && !type.startsWith('partner')) {
        const hpBg = new THREE.Mesh(
          new THREE.PlaneGeometry(0.8, 0.12),
          new THREE.MeshBasicMaterial({ color: 0x333333 })
        );
        hpBg.position.set(0, 1.1, 0);
        hpBg.rotation.x = -0.5;
        group.add(hpBg);

        const hpBar = new THREE.Mesh(
          new THREE.PlaneGeometry(0.76, 0.08),
          new THREE.MeshBasicMaterial({ color: 0x00FF00 })
        );
        hpBar.position.set(0, 1.11, 0.01);
        hpBar.rotation.x = -0.5;
        group.add(hpBar);
        group.userData.hpBar = hpBar;
      }

      // Heart indicator for partners
      if (type.startsWith('partner')) {
        const heartGeo = new THREE.SphereGeometry(0.15, 8, 8);
        const heart = new THREE.Mesh(heartGeo, new THREE.MeshBasicMaterial({ color: 0xFF69B4 }));
        heart.position.set(0.5, 1.2, 0);
        heart.visible = false;
        group.add(heart);
        group.userData.heartIndicator = heart;
      }

      group.scale.setScalar(scale);
      return group;
    }

    // ============== HEALER TANK (GLB MODEL) ==============
    // Mehrteiliges Modell: Tank (Basis) + Turret + Healer gestapelt
    function loadHealerModels(group, scale) {
      const gltfLoader = new GLTFLoader();
      const parts = { tank: null, turret: null, healer: null };
      const sizes = { tank: null, turret: null, healer: null };
      let loadedCount = 0;
      const totalModels = 3;

      // Nach Laden aller Teile: korrekt stapeln
      const onAllLoaded = () => {
        if (!parts.tank || !parts.turret || !parts.healer) return;

        // 1. Tank auf Boden positionieren (mit Rotation)
        const tankInfo = positionModelOnGround(parts.tank, 1.0, { rotationY: Math.PI });
        sizes.tank = tankInfo.size;
        // Nach positionModelOnGround: Tank-Boden bei Y=0, Tank-Top bei Y=size.y
        const tankTopY = sizes.tank.y;

        // 2. Turret auf Tank stapeln
        parts.turret.scale.setScalar(1.0);
        parts.turret.updateMatrixWorld(true);
        const turretBox = new THREE.Box3().setFromObject(parts.turret);
        sizes.turret = turretBox.getSize(new THREE.Vector3());
        // Turret-Boden soll auf Tank-Top liegen
        const turretGroundOffset = -turretBox.min.y;
        parts.turret.position.y = tankTopY + turretGroundOffset;
        // Turret-Top = position.y + (max.y - min.y) = position.y + size.y... aber wir brauchen world max
        // Nach Verschiebung: Turret world max = turret.position.y + turretBox.max.y
        const turretTopY = parts.turret.position.y + turretBox.max.y;

        // 3. Healer IM Turret (sitzt drin, nicht oben drauf)
        parts.healer.scale.setScalar(0.7);
        parts.healer.updateMatrixWorld(true);
        const healerBox = new THREE.Box3().setFromObject(parts.healer);
        sizes.healer = healerBox.getSize(new THREE.Vector3());
        const healerGroundOffset = -healerBox.min.y;
        // Healer sitzt in der Turret-Mitte, nicht auf der Turret-Spitze
        const turretCenterY = parts.turret.position.y + (turretBox.min.y + turretBox.max.y) / 2;
        parts.healer.position.y = turretCenterY + healerGroundOffset;

        // Placeholder entfernen
        if (group.userData.placeholder) {
          group.remove(group.userData.placeholder);
          group.userData.placeholder = null;
        }
        group.userData.modelLoaded = true;
        console.log('Healer Tank stacked - tankTop:', tankTopY.toFixed(2), 'turretCenter:', turretCenterY.toFixed(2), 'healerY:', parts.healer.position.y.toFixed(2));
      };

      const setupMesh = (model) => {
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = false;
          }
        });
      };

      // 1. Tank (Basis)
      gltfLoader.load('/glb/Healer/Tank.glb', (gltf) => {
        parts.tank = gltf.scene;
        parts.tank.name = 'TankBase';
        setupMesh(parts.tank);
        group.add(parts.tank);
        loadedCount++;
        if (loadedCount === totalModels) onAllLoaded();
      }, undefined, (error) => {
        console.error('Error loading Tank.glb:', error);
        loadedCount++;
        if (loadedCount === totalModels) onAllLoaded();
      });

      // 2. Turret (rotierbar)
      gltfLoader.load('/glb/Healer/Turet.glb', (gltf) => {
        parts.turret = gltf.scene;
        parts.turret.name = 'Turret';
        setupMesh(parts.turret);
        group.add(parts.turret);
        group.userData.turret = parts.turret;
        loadedCount++;
        if (loadedCount === totalModels) onAllLoaded();
      }, undefined, (error) => {
        console.error('Error loading Turet.glb:', error);
        loadedCount++;
        if (loadedCount === totalModels) onAllLoaded();
      });

      // 3. Healer Charakter
      gltfLoader.load('/glb/Healer/Healer.glb', (gltf) => {
        parts.healer = gltf.scene;
        parts.healer.name = 'HealerCharacter';
        setupMesh(parts.healer);
        group.add(parts.healer);
        group.userData.healerBody = parts.healer;
        loadedCount++;
        if (loadedCount === totalModels) onAllLoaded();
      }, undefined, (error) => {
        console.error('Error loading Healer.glb:', error);
        loadedCount++;
        if (loadedCount === totalModels) onAllLoaded();
      });
    }

    // Debug-Editor für Healer-Modell Positionen (Browser-Konsole)
    window.healerEditor = {
      // Aktuelle Werte
      config: {
        tank: { y: 0.3 },
        turret: { y: 0.7, scale: 1.0 },
        healer: { y: 1.1, scale: 0.7 }
      },
      // Healer im Spiel finden und anpassen
      apply: function() {
        if (typeof defenders === 'undefined') {
          console.log('Spiel noch nicht gestartet');
          return;
        }
        defenders.forEach(d => {
          if (d.userData.isGLBModel) {
            d.children.forEach(child => {
              if (child.name === 'TankBase') {
                child.position.y = this.config.tank.y;
              } else if (child.name === 'Turret') {
                child.position.y = this.config.turret.y;
                child.scale.setScalar(this.config.turret.scale);
              } else if (child.name === 'HealerCharacter') {
                child.position.y = this.config.healer.y;
                child.scale.setScalar(this.config.healer.scale);
              }
            });
          }
        });
        console.log('Healer aktualisiert:', this.config);
      },
      // Schnelle Befehle
      tank: function(y) { this.config.tank.y = y; this.apply(); },
      turret: function(y, scale) {
        this.config.turret.y = y;
        if (scale) this.config.turret.scale = scale;
        this.apply();
      },
      healer: function(y, scale) {
        this.config.healer.y = y;
        if (scale) this.config.healer.scale = scale;
        this.apply();
      },
      help: function() {
        console.log(`
=== Healer Editor ===
healerEditor.tank(y)           - Tank Y-Position
healerEditor.turret(y, scale)  - Turret Y + Scale
healerEditor.healer(y, scale)  - Healer Y + Scale
healerEditor.apply()           - Änderungen anwenden
healerEditor.config            - Aktuelle Werte zeigen
        `);
      }
    };
    console.log('Healer Editor geladen. Tippe healerEditor.help() für Befehle.');

    function createHealerTank(scale = 1) {
      const group = new THREE.Group();
      const heroBonus = 1 + getSkillEffect('heroStats') / 100;

      group.userData = {
        type: 'healer',
        isPlayer: false,
        health: Math.floor(70 * heroBonus),
        maxHealth: Math.floor(70 * heroBonus),
        attackCooldown: 0,
        abilityCooldown: 0,
        targetRotation: 0,
        radius: 1.2 * scale,
        speed: 0.02,
        attackRange: 8,
        attackDamage: Math.floor(15 * heroBonus),
        isGLBModel: true,
        modelLoaded: false,
        turret: null,
        healerBody: null,
        patrolTarget: new THREE.Vector3(),
        patrolWait: 0,
        placed: false,
      };

      // Placeholder während Laden
      const placeholder = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshBasicMaterial({ color: 0xFFB6C1, transparent: true, opacity: 0.5 })
      );
      placeholder.position.y = 0.5;
      group.add(placeholder);
      group.userData.placeholder = placeholder;

      // GLB Modelle laden
      loadHealerModels(group, scale);

      // HP Bar
      const hpBg = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.15),
        new THREE.MeshBasicMaterial({ color: 0x333333 })
      );
      hpBg.position.set(0, 2.5, 0);
      hpBg.rotation.x = -0.5;
      group.add(hpBg);

      const hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.45, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x00FF00 })
      );
      hpBar.position.set(0, 2.52, 0.01);
      hpBar.rotation.x = -0.5;
      group.add(hpBar);
      group.userData.hpBar = hpBar;

      group.scale.setScalar(scale);
      return group;
    }

    // ============== ENEMIES ==============
    function createFox(isBoss = false) {
      const group = new THREE.Group();
      const scale = isBoss ? 2.5 : 1.1;
      group.userData = {
        type: isBoss ? 'boss_fox' : 'fox',
        health: isBoss ? 500 : 50,
        maxHealth: isBoss ? 500 : 50,
        speed: isBoss ? 0.025 : 0.04,
        damage: isBoss ? 25 : 12,
        attackCooldown: 0,
        confused: false,
        confuseTime: 0,
        slowed: false,
        slowTime: 0,
        radius: 1.2 * scale,
        isBoss,
        targetBuilding: null,
      };

      const bodyGeo = new THREE.SphereGeometry(0.5, 16, 12);
      bodyGeo.scale(1.6, 0.9, 0.9);
      const bodyMat = new THREE.MeshStandardMaterial({ 
        color: isBoss ? 0x8B0000 : 0xD2691E, 
        roughness: 0.7 
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.4;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.35, 16, 12);
      headGeo.scale(1.2, 1, 1);
      const head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(0.7, 0.5, 0);
      group.add(head);

      const snoutGeo = new THREE.ConeGeometry(0.15, 0.4, 8);
      const snout = new THREE.Mesh(snoutGeo, bodyMat);
      snout.position.set(1.1, 0.45, 0);
      snout.rotation.z = -Math.PI / 2;
      group.add(snout);

      // Boss crown
      if (isBoss) {
        const crownGeo = new THREE.ConeGeometry(0.3, 0.5, 6);
        const crown = new THREE.Mesh(crownGeo, new THREE.MeshStandardMaterial({ color: 0xFFD700 }));
        crown.position.set(0.5, 1.2, 0);
        group.add(crown);
      }

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.07, 8, 8);
      const eyeMat = new THREE.MeshStandardMaterial({ 
        color: isBoss ? 0xFF0000 : 0xFFFF00, 
        emissive: isBoss ? 0xFF0000 : 0xFFAA00, 
        emissiveIntensity: 0.4 
      });
      [-0.12, 0.12].forEach(z => {
        const eye = new THREE.Mesh(eyeGeo, eyeMat);
        eye.position.set(0.9, 0.6, z);
        group.add(eye);
      });

      // HP bar
      const hpBg = new THREE.Mesh(
        new THREE.PlaneGeometry(isBoss ? 3 : 1, isBoss ? 0.4 : 0.15),
        new THREE.MeshBasicMaterial({ color: 0x333333 })
      );
      hpBg.position.set(0.3, isBoss ? 2.5 : 1.3, 0);
      hpBg.rotation.x = -0.5;
      group.add(hpBg);

      const hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(isBoss ? 2.9 : 0.96, isBoss ? 0.35 : 0.11),
        new THREE.MeshBasicMaterial({ color: 0xFF0000 })
      );
      hpBar.position.set(0.3, isBoss ? 2.52 : 1.31, 0.01);
      hpBar.rotation.x = -0.5;
      group.add(hpBar);
      group.userData.hpBar = hpBar;

      group.scale.setScalar(scale);
      return group;
    }

    function createRaven(isBoss = false) {
      const group = new THREE.Group();
      const scale = isBoss ? 2 : 1;
      group.userData = {
        type: isBoss ? 'boss_raven' : 'raven',
        health: isBoss ? 350 : 30,
        maxHealth: isBoss ? 350 : 30,
        speed: isBoss ? 0.04 : 0.06,
        damage: isBoss ? 18 : 10,
        attackCooldown: 0,
        flying: true,
        confused: false,
        confuseTime: 0,
        slowed: false,
        slowTime: 0,
        radius: 0.8 * scale,
        isBoss,
        targetBuilding: null,
      };

      const bodyGeo = new THREE.SphereGeometry(0.3, 12, 10);
      bodyGeo.scale(1.4, 1, 1);
      const bodyMat = new THREE.MeshStandardMaterial({ 
        color: isBoss ? 0x4B0082 : 0x1a1a1a, 
        roughness: 0.6 
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1.8;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.2, 12, 10);
      const head = new THREE.Mesh(headGeo, bodyMat);
      head.position.set(0.35, 1.9, 0);
      group.add(head);

      // Wings
      const wingGeo = new THREE.PlaneGeometry(0.8, 0.3);
      const wingMat = new THREE.MeshStandardMaterial({ color: bodyMat.color, side: THREE.DoubleSide });
      [-0.25, 0.25].forEach(z => {
        const wing = new THREE.Mesh(wingGeo, wingMat);
        wing.position.set(0, 1.8, z);
        wing.rotation.x = z > 0 ? 0.3 : -0.3;
        group.add(wing);
        if (z > 0) group.userData.wingR = wing;
        else group.userData.wingL = wing;
      });

      // HP bar
      const hpBg = new THREE.Mesh(
        new THREE.PlaneGeometry(isBoss ? 2 : 0.6, 0.1),
        new THREE.MeshBasicMaterial({ color: 0x333333 })
      );
      hpBg.position.set(0.2, isBoss ? 3 : 2.3, 0);
      hpBg.rotation.x = -0.5;
      group.add(hpBg);

      const hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(isBoss ? 1.9 : 0.56, 0.07),
        new THREE.MeshBasicMaterial({ color: 0xFF0000 })
      );
      hpBar.position.set(0.2, isBoss ? 3.02 : 2.31, 0.01);
      hpBar.rotation.x = -0.5;
      group.add(hpBar);
      group.userData.hpBar = hpBar;

      group.scale.setScalar(scale);
      return group;
    }

    function createSnake() {
      const group = new THREE.Group();
      group.userData = {
        type: 'snake',
        health: 70,
        maxHealth: 70,
        speed: 0.055,
        damage: 15,
        attackCooldown: 0,
        confused: false,
        confuseTime: 0,
        slowed: false,
        slowTime: 0,
        radius: 0.6,
        targetBuilding: null,
        canPoison: true,
      };

      // Snake body segments
      for (let i = 0; i < 5; i++) {
        const segGeo = new THREE.SphereGeometry(0.2 - i * 0.02, 8, 8);
        const segMat = new THREE.MeshStandardMaterial({ 
          color: i % 2 === 0 ? 0x228B22 : 0x32CD32 
        });
        const seg = new THREE.Mesh(segGeo, segMat);
        seg.position.set(-i * 0.25, 0.2, 0);
        seg.castShadow = true;
        group.add(seg);
      }

      // Head
      const headGeo = new THREE.SphereGeometry(0.25, 10, 10);
      headGeo.scale(1.3, 0.8, 1);
      const head = new THREE.Mesh(headGeo, new THREE.MeshStandardMaterial({ color: 0x228B22 }));
      head.position.set(0.3, 0.2, 0);
      group.add(head);

      // Eyes
      [-0.1, 0.1].forEach(z => {
        const eye = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0xFFFF00, emissive: 0xFFFF00, emissiveIntensity: 0.3 })
        );
        eye.position.set(0.45, 0.28, z);
        group.add(eye);
      });

      // Forked tongue
      const tongueGeo = new THREE.BoxGeometry(0.15, 0.02, 0.02);
      const tongue = new THREE.Mesh(tongueGeo, new THREE.MeshStandardMaterial({ color: 0xFF0000 }));
      tongue.position.set(0.55, 0.18, 0);
      group.add(tongue);
      group.userData.tongue = tongue;

      // HP bar
      const hpBg = new THREE.Mesh(
        new THREE.PlaneGeometry(0.8, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x333333 })
      );
      hpBg.position.set(0, 0.8, 0);
      hpBg.rotation.x = -0.5;
      group.add(hpBg);

      const hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(0.76, 0.08),
        new THREE.MeshBasicMaterial({ color: 0x00FF00 })
      );
      hpBar.position.set(0, 0.81, 0.01);
      hpBar.rotation.x = -0.5;
      group.add(hpBar);
      group.userData.hpBar = hpBar;

      return group;
    }

    // ============== BOMBER HERO (GLB MODEL) ==============
    function createBomberHero(scale = 1) {
      const group = new THREE.Group();
      const heroBonus = 1 + getSkillEffect('heroStats') / 100;

      group.userData = {
        type: 'bomber',
        isPlayer: false,
        health: Math.floor(60 * heroBonus),
        maxHealth: Math.floor(60 * heroBonus),
        attackCooldown: 0,
        abilityCooldown: 0,
        targetRotation: 0,
        radius: 1.0 * scale,
        speed: 0.018,
        attackRange: 10, // Fernkampf mit Bomben
        attackDamage: Math.floor(35 * heroBonus),
        isGLBModel: true,
        modelLoaded: false,
        bomberModel: null,
        bombInHand: null,
        hasBomb: true,
        bombCooldown: 0,
        splashRadius: 3,
        patrolTarget: new THREE.Vector3(),
        patrolWait: 0,
        placed: false,
      };

      // Placeholder während Laden
      const placeholder = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 0.8, 0.8),
        new THREE.MeshBasicMaterial({ color: 0xFF6B35, transparent: true, opacity: 0.5 })
      );
      placeholder.position.y = 0.5;
      group.add(placeholder);
      group.userData.placeholder = placeholder;

      // GLB Modelle laden
      const bomberLoader = new GLTFLoader();

      // Bomber-Körper laden
      bomberLoader.load('/glb/Bomber/Bomber.glb', (gltf) => {
        const bomberModel = gltf.scene;
        bomberModel.name = 'BomberBody';
        // Automatische Boden-Positionierung mit Rotation
        const bomberInfo = positionModelOnGround(bomberModel, scale * 0.8, { rotationY: Math.PI / 2 });
        bomberModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = false;
            if (child.material && child.material.map) {
              child.material.map.colorSpace = THREE.SRGBColorSpace;
              child.material.map.needsUpdate = true;
            }
          }
        });
        group.add(bomberModel);
        group.userData.bomberModel = bomberModel;

        // Bombe laden und vor dem Körper auf Bauchhöhe positionieren
        bomberLoader.load('/glb/Bomber/Bombe.glb', (bombGltf) => {
          const bombModel = bombGltf.scene;
          bombModel.name = 'BombInHand';
          bombModel.scale.setScalar(scale * 0.4);
          // Bombe relativ zum Bomber: Bauchhöhe = halbe Körperhöhe
          const bodyHeight = bomberInfo.size.y;
          bombModel.position.set(0, bodyHeight * 0.5, 0.6 * scale);
          bombModel.rotation.y = Math.PI / 2;
          bombModel.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = false; // Heroes don't receive shadows for better visibility
              if (child.material && child.material.map) {
                child.material.map.colorSpace = THREE.SRGBColorSpace;
                child.material.map.needsUpdate = true;
              }
            }
          });
          group.add(bombModel);
          group.userData.bombInHand = bombModel;

          // Placeholder entfernen
          if (group.userData.placeholder) {
            group.remove(group.userData.placeholder);
            group.userData.placeholder = null;
          }
          group.userData.modelLoaded = true;
          console.log('Bomber Hero GLB model loaded successfully');
        }, undefined, (error) => {
          console.error('Error loading Bombe.glb:', error);
          // Fallback-Bombe
          const fallbackBomb = new THREE.Mesh(
            new THREE.SphereGeometry(0.25, 12, 12),
            new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
          );
          fallbackBomb.position.set(0.4 * scale, 1.0 * scale, 0.3 * scale);
          group.add(fallbackBomb);
          group.userData.bombInHand = fallbackBomb;

          if (group.userData.placeholder) {
            group.remove(group.userData.placeholder);
            group.userData.placeholder = null;
          }
          group.userData.modelLoaded = true;
        });
      }, undefined, (error) => {
        console.error('Error loading Bomber.glb:', error);
        // Fallback: Prozeduraler Bomber
        const fallback = createGuineaPig('bomber', false, scale);
        while (fallback.children.length > 0) {
          group.add(fallback.children[0]);
        }
        if (group.userData.placeholder) {
          group.remove(group.userData.placeholder);
          group.userData.placeholder = null;
        }
        group.userData.modelLoaded = true;
      });

      // HP Bar
      const hpBg = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.15),
        new THREE.MeshBasicMaterial({ color: 0x333333 })
      );
      hpBg.position.set(0, 2.2, 0);
      hpBg.rotation.x = -0.5;
      group.add(hpBg);

      const hpBar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.45, 0.12),
        new THREE.MeshBasicMaterial({ color: 0x00FF00 })
      );
      hpBar.position.set(0, 2.22, 0.01);
      hpBar.rotation.x = -0.5;
      group.add(hpBar);
      group.userData.hpBar = hpBar;

      group.scale.setScalar(scale);
      return group;
    }

    // Geworfene Bombe erstellen (Projektil)
    function createThrownBomb(start, target, damage, splashRadius, isBoss = false) {
      const group = new THREE.Group();

      const bomberLoader = new GLTFLoader();
      const scale = isBoss ? 1.2 : 0.8;

      // Lade das Bomben-Modell für das Projektil
      bomberLoader.load('/glb/Bomber/Bombe.glb', (gltf) => {
        const bombModel = gltf.scene;
        bombModel.scale.setScalar(scale);
        bombModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            if (child.material && child.material.map) {
              child.material.map.colorSpace = THREE.SRGBColorSpace;
              child.material.map.needsUpdate = true;
            }
          }
        });
        group.add(bombModel);

        // Placeholder entfernen wenn vorhanden
        if (group.userData.placeholder) {
          group.remove(group.userData.placeholder);
          group.userData.placeholder = null;
        }
      }, undefined, () => {
        // Fallback Bombe
        const fallback = new THREE.Mesh(
          new THREE.SphereGeometry(0.3 * scale, 12, 12),
          new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
        );
        group.add(fallback);
        if (group.userData.placeholder) {
          group.remove(group.userData.placeholder);
          group.userData.placeholder = null;
        }
      });

      // Placeholder während Laden
      const placeholder = new THREE.Mesh(
        new THREE.SphereGeometry(0.3 * scale, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0x1a1a1a })
      );
      group.add(placeholder);
      group.userData.placeholder = placeholder;

      // Zündschnur-Effekt (Partikel)
      const fuseGeo = new THREE.SphereGeometry(0.08, 6, 6);
      const fuseMat = new THREE.MeshBasicMaterial({
        color: 0xFF4500,
        emissive: 0xFF4500,
        emissiveIntensity: 1
      });
      const fuse = new THREE.Mesh(fuseGeo, fuseMat);
      fuse.position.y = 0.35 * scale;
      group.add(fuse);
      group.userData.fuse = fuse;

      group.position.copy(start);
      group.position.y = start.y || 1;

      // Berechne Wurfbahn (parabolisch)
      const dir = new THREE.Vector3().subVectors(target, start);
      const distance = dir.length();
      dir.normalize();

      group.userData = {
        ...group.userData,
        type: 'bomb',
        velocity: dir.multiplyScalar(0.25),
        verticalVelocity: 0.15, // Aufwärts für Bogen
        gravity: 0.008,
        damage: damage,
        splashRadius: splashRadius,
        targetY: 0,
        startY: start.y || 1,
        progress: 0,
        maxProgress: distance / 0.25,
        isBoss,
      };

      return group;
    }

    // ============== CARROTS ==============
    const carrots = [];
    let cachedCarrotModel = null;

    // Preload carrot GLB model
    const carrotLoader = new GLTFLoader();
    carrotLoader.load(
      '/glb/vegetables/Karotte.glb',
      (gltf) => {
        cachedCarrotModel = gltf.scene;
        cachedCarrotModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        console.log('Carrot GLB model loaded successfully');
      },
      undefined,
      (error) => {
        console.warn('Failed to load carrot GLB model, using fallback:', error);
      }
    );

    function createCarrot(x, z, type = 'normal') {
      const group = new THREE.Group();
      group.userData = {
        collected: false,
        type,
        value: type === 'golden' ? 5 : (type === 'blue' ? 3 : 1),
        effect: type === 'golden' ? 'bonus' : (type === 'blue' ? 'speed' : null),
      };

      const colors = {
        normal: 0xFF6B35,
        golden: 0xFFD700,
        blue: 0x4169E1,
      };

      // Use GLB model if loaded, otherwise use fallback geometry
      if (cachedCarrotModel) {
        const carrotModel = cachedCarrotModel.clone();
        // Automatische Boden-Positionierung
        positionModelOnGround(carrotModel, 0.4);

        // Apply color tint for special carrot types
        if (type !== 'normal') {
          carrotModel.traverse((child) => {
            if (child.isMesh) {
              child.material = child.material.clone();
              child.material.emissive = new THREE.Color(colors[type]);
              child.material.emissiveIntensity = 0.4;
            }
          });
        }

        group.add(carrotModel);
      } else {
        // Fallback: procedural carrot geometry
        const bodyGeo = new THREE.ConeGeometry(0.14, 0.55, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: colors[type],
          emissive: type !== 'normal' ? colors[type] : 0x000000,
          emissiveIntensity: type !== 'normal' ? 0.3 : 0,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.rotation.x = Math.PI;
        body.position.y = 0.28;
        body.castShadow = true;
        group.add(body);

        for (let i = 0; i < 3; i++) {
          const leafGeo = new THREE.ConeGeometry(0.035, 0.22, 4);
          const leafMat = new THREE.MeshStandardMaterial({ color: 0x228B22 });
          const leaf = new THREE.Mesh(leafGeo, leafMat);
          leaf.position.set((Math.random() - 0.5) * 0.08, 0.6, (Math.random() - 0.5) * 0.08);
          leaf.rotation.x = (Math.random() - 0.5) * 0.3;
          group.add(leaf);
        }
      }

      // Glow ring (always shown)
      const ringGeo = new THREE.RingGeometry(0.28, 0.36, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: colors[type],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.4
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.01;
      group.add(ring);
      group.userData.ring = ring;

      group.position.set(x, 0, z);
      return group;
    }

    function spawnCarrot() {
      let x, z;
      let attempts = 0;
      do {
        const angle = Math.random() * Math.PI * 2;
        const radius = 8 + Math.random() * 25;
        x = Math.cos(angle) * radius;
        z = Math.sin(angle) * radius;
        attempts++;
      } while (attempts < 20 && Math.sqrt(x*x + z*z) < 6);

      // Determine carrot type
      let type = 'normal';
      const roll = Math.random();
      const goldenBonus = getSkillEffect('goldenAge') ? 0.5 : 0;
      if (roll < 0.02 + goldenBonus * 0.02) type = 'golden';
      else if (roll < 0.08) type = 'blue';

      const carrot = createCarrot(x, z, type);
      scene.add(carrot);
      carrots.push(carrot);
    }

    // ============== PROJECTILES & EFFECTS ==============
    function createProjectile(start, target, type = 'carrot') {
      const colors = { carrot: 0xFF6B35, tower: 0x8B0000, poison: 0x00FF00 };
      const geo = type === 'tower' 
        ? new THREE.SphereGeometry(0.15, 8, 8)
        : new THREE.ConeGeometry(0.12, 0.45, 6);
      const mat = new THREE.MeshStandardMaterial({ 
        color: colors[type] || 0xFF6B35,
        emissive: colors[type] || 0xFF6B35,
        emissiveIntensity: 0.3,
      });
      const proj = new THREE.Mesh(geo, mat);
      proj.position.copy(start);
      proj.position.y = start.y || 0.6;
      
      const dir = new THREE.Vector3().subVectors(target, start).normalize();
      proj.userData = {
        velocity: dir.multiplyScalar(type === 'tower' ? 0.5 : 0.35),
        damage: type === 'tower' ? (25 * (1 + getSkillEffect('towerDamage') / 100)) : 25,
        splash: type === 'carrot',
        splashRadius: 2.5,
        type,
      };
      
      proj.lookAt(target);
      if (type !== 'tower') proj.rotation.x += Math.PI / 2;
      return proj;
    }

    function createExplosion(position, color = 0xFF6B35) {
      const particles = [];
      for (let i = 0; i < 15; i++) {
        const geo = new THREE.SphereGeometry(0.1 + Math.random() * 0.15, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ 
          color: new THREE.Color(color).offsetHSL(Math.random() * 0.1, 0, Math.random() * 0.2 - 0.1),
          transparent: true 
        });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(position);
        p.userData = {
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.3, 
            Math.random() * 0.2 + 0.1, 
            (Math.random() - 0.5) * 0.3
          ),
          life: 1,
        };
        scene.add(p);
        particles.push(p);
      }
      return particles;
    }

    function createHealEffect(position) {
      const particles = [];
      for (let i = 0; i < 8; i++) {
        const geo = new THREE.SphereGeometry(0.08, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0x00FF00, transparent: true });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(position);
        p.position.x += (Math.random() - 0.5) * 0.5;
        p.position.z += (Math.random() - 0.5) * 0.5;
        p.userData = { velocity: new THREE.Vector3(0, 0.05, 0), life: 1 };
        scene.add(p);
        particles.push(p);
      }
      return particles;
    }

    function createHearts(position) {
      const particles = [];
      for (let i = 0; i < 10; i++) {
        const geo = new THREE.SphereGeometry(0.12, 6, 6);
        const mat = new THREE.MeshBasicMaterial({ color: 0xFF69B4, transparent: true });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(position);
        p.position.y = 1;
        p.userData = {
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.15, 
            0.1 + Math.random() * 0.1, 
            (Math.random() - 0.5) * 0.15
          ),
          life: 1,
        };
        scene.add(p);
        particles.push(p);
      }
      return particles;
    }

    function createComboText(position, value) {
      // Simple particle burst for combo
      const particles = [];
      for (let i = 0; i < value; i++) {
        const geo = new THREE.SphereGeometry(0.08, 6, 6);
        const mat = new THREE.MeshBasicMaterial({
          color: new THREE.Color().setHSL(0.1, 1, 0.5 + value * 0.05),
          transparent: true
        });
        const p = new THREE.Mesh(geo, mat);
        p.position.copy(position);
        p.userData = {
          velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.2,
            0.15 + Math.random() * 0.1,
            (Math.random() - 0.5) * 0.2
          ),
          life: 1,
        };
        scene.add(p);
        particles.push(p);
      }
      return particles;
    }

    // Create floating damage number using canvas sprite
    function createDamageNumber(position, damage, isCrit = false, isHeal = false) {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');

      // Text styling
      ctx.font = isCrit ? 'bold 48px Arial' : 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Color based on type
      let color = '#FF4444'; // Red for damage
      if (isHeal) color = '#44FF44'; // Green for heals
      if (isCrit) color = '#FFD700'; // Gold for crits

      // Draw text with outline
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 4;
      const text = isHeal ? `+${damage}` : `-${damage}`;
      ctx.strokeText(text, 64, 32);
      ctx.fillStyle = color;
      ctx.fillText(text, 64, 32);

      // Create sprite
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false
      });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.position.copy(position);
      sprite.position.y += 1.5;
      sprite.position.x += (Math.random() - 0.5) * 0.5;
      sprite.scale.set(isCrit ? 2 : 1.5, isCrit ? 1 : 0.75, 1);
      sprite.userData = {
        velocity: new THREE.Vector3(0, 0.04, 0),
        life: 1.2,
        isDamageNumber: true
      };
      scene.add(sprite);
      return [sprite];
    }

    // ============== GAME STATE ==============
    const baseHealthValue = 100 + getSkillEffect('baseHealth');
    const dayDurationValue = 90 + getSkillEffect('dayLength');
    
    const gameState = {
      phase: 'day',
      wave: 0,
      baseHealth: baseHealthValue,
      maxBaseHealth: baseHealthValue,
      score: getSkillEffect('startCarrots'),
      time: 0,
      dayDuration: dayDurationValue,
      nightActive: false,
      countdownTime: 0,
      dayTimer: 0,
      combo: 0,
      comboTimer: 0,
      weather: 'sunny',
      weatherTimer: 0,
      rageActive: false,
      bossWave: false,
      speedBoostTimer: 0,
    };
    gameRef.current = gameState;

    setScore(gameState.score);
    setBaseHealth(gameState.baseHealth);
    setMaxBaseHealth(gameState.maxBaseHealth);
    setPhase('day');

    // Player - Load GLB model with wheelbarrow and sweat drops
    const gltfLoader = new GLTFLoader();
    let player = null;
    let playerModelLoaded = false;

    // Create player group that will hold the GLB model
    const playerGroup = new THREE.Group();
    playerGroup.userData = {
      type: 'player',
      isPlayer: true,
      isPartner: false,
      isCollector: false,
      health: 100,
      maxHealth: 100,
      attackCooldown: 0,
      abilityCooldown: 0,
      targetRotation: 0,
      radius: 0.8 * 1.3,
      targetPos: new THREE.Vector3(),
      waitTime: 0,
      carryingCarrots: 0,
      maxCarry: 2 + getSkillEffect('collectorCapacity'),
      speed: 0.025,
      attackRange: 5,
      attackDamage: 18,
      velocityX: 0,
      velocityZ: 0,
    };
    playerGroup.position.set(0, 0, 10);
    scene.add(playerGroup);
    player = playerGroup;

    // Load the GLB model asynchronously
    gltfLoader.load(
      '/glb/Maincharacter/Maincharacter.glb',
      (gltf) => {
        const model = gltf.scene;
        // Automatische Boden-Positionierung mit Rotation
        positionModelOnGround(model, 3.0, { rotationY: Math.PI / 2 });
        // Enable shadows and fix textures for all meshes
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = false; // Heroes don't receive shadows for better visibility
            // Fix texture encoding/colorSpace for proper display
            if (child.material) {
              if (child.material.map) {
                child.material.map.colorSpace = THREE.SRGBColorSpace;
                child.material.map.needsUpdate = true;
              }
              // Ensure material is visible
              child.material.needsUpdate = true;
            }
          }
        });
        playerGroup.add(model);
        playerModelLoaded = true;
        console.log('Player GLB model loaded successfully');
      },
      (progress) => {
        console.log('Loading player model:', (progress.loaded / progress.total * 100).toFixed(0) + '%');
      },
      (error) => {
        console.error('Error loading player GLB model:', error);
        // Fallback: create procedural guinea pig if GLB fails to load
        const fallbackPlayer = createGuineaPig('player', true, 1.3);
        // Copy children to playerGroup
        while (fallbackPlayer.children.length > 0) {
          playerGroup.add(fallbackPlayer.children[0]);
        }
      }
    );

    // Partners
    const partners = [
      createGuineaPig('partner1', false, 1.2),
      createGuineaPig('partner2', false, 1.2),
      createGuineaPig('partner3', false, 1.2),
    ];
    partners[0].position.set(-10, 0, 6);
    partners[1].position.set(12, 0, -5);
    partners[2].position.set(-6, 0, -12);
    partners.forEach(p => {
      p.userData.targetPos.copy(p.position);
      scene.add(p);
    });

    // Start hero if skill unlocked
    const heroTypes = ['tunneler', 'shadow', 'bomber', 'healer', 'tank', 'assassin'];
    const defenders = [];
    if (getSkillEffect('startHero')) {
      const startHeroType = heroTypes[Math.floor(Math.random() * heroTypes.length)];
      let startHero;
      if (startHeroType === 'healer') {
        startHero = createHealerTank(1.2);
      } else if (startHeroType === 'bomber') {
        startHero = createBomberHero(1.2);
      } else {
        startHero = createGuineaPig(startHeroType, false, 1.2);
      }
      startHero.position.set(5, 0, 5);
      startHero.userData.placed = true;
      scene.add(startHero);
      defenders.push(startHero);
    }

    const enemies = [];
    const projectiles = [];
    const effects = [];
    const collectors = [];
    const buildingObjects = [];

    // Building preview ghost
    let previewGhost = null;
    let currentPreviewType = null;
    let wallDragStartPos = null;
    let wallPreviewLine = null;
    let wallPreviewGhosts = []; // Array of ghost walls for multi-preview

    // Create placement indicator ring
    const validPlacementMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
    const invalidPlacementMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.5 });
    const placementRingGeo = new THREE.RingGeometry(0.8, 1.2, 32);
    const placementRing = new THREE.Mesh(placementRingGeo, validPlacementMat);
    placementRing.rotation.x = -Math.PI / 2;
    placementRing.position.y = 0.05;
    placementRing.visible = false;
    scene.add(placementRing);

    // Tower range indicator - shows attack range when placing towers
    const towerRangeMat = new THREE.MeshBasicMaterial({
      color: 0x4da6ff,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const towerRangeBorderMat = new THREE.MeshBasicMaterial({
      color: 0x4da6ff,
      transparent: true,
      opacity: 0.4
    });
    // Create filled circle for range area
    const towerRangeGeo = new THREE.CircleGeometry(12, 64);
    const towerRangeIndicator = new THREE.Mesh(towerRangeGeo, towerRangeMat);
    towerRangeIndicator.rotation.x = -Math.PI / 2;
    towerRangeIndicator.position.y = 0.02;
    towerRangeIndicator.visible = false;
    scene.add(towerRangeIndicator);
    // Create ring border for better visibility
    const towerRangeBorderGeo = new THREE.RingGeometry(11.8, 12, 64);
    const towerRangeBorder = new THREE.Mesh(towerRangeBorderGeo, towerRangeBorderMat);
    towerRangeBorder.rotation.x = -Math.PI / 2;
    towerRangeBorder.position.y = 0.03;
    towerRangeBorder.visible = false;
    scene.add(towerRangeBorder);

    // Wall drag preview line
    function createWallPreviewLine() {
      const points = [new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(0, 0.5, 0)];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 });
      const line = new THREE.Line(geometry, material);
      line.visible = false;
      scene.add(line);
      return line;
    }
    wallPreviewLine = createWallPreviewLine();

    function createPreviewGhost(type) {
      if (previewGhost) {
        scene.remove(previewGhost);
        previewGhost = null;
      }

      const ghost = createGuineaPigHouse(type);
      // Make it semi-transparent
      ghost.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.5;
          child.material.depthWrite = false;
        }
      });
      ghost.visible = false;
      scene.add(ghost);
      previewGhost = ghost;
      currentPreviewType = type;
      return ghost;
    }

    function updatePreviewPosition(x, z, rotation, isValid) {
      if (!previewGhost) return;
      previewGhost.position.set(x, 0, z);
      previewGhost.rotation.y = rotation * Math.PI / 180;
      previewGhost.visible = true;

      // Update placement ring
      placementRing.position.set(x, 0.05, z);
      placementRing.visible = true;
      placementRing.material = isValid ? validPlacementMat : invalidPlacementMat;

      // Update tower range indicator (only for towers)
      if (currentPreviewType === 'tower') {
        const towerRange = 12 * (1 + getSkillEffect('towerRange') / 100);
        // Update geometry if range changed
        if (towerRangeIndicator.geometry.parameters.radius !== towerRange) {
          towerRangeIndicator.geometry.dispose();
          towerRangeIndicator.geometry = new THREE.CircleGeometry(towerRange, 64);
          towerRangeBorder.geometry.dispose();
          towerRangeBorder.geometry = new THREE.RingGeometry(towerRange - 0.2, towerRange, 64);
        }
        towerRangeIndicator.position.set(x, 0.02, z);
        towerRangeBorder.position.set(x, 0.03, z);
        towerRangeIndicator.visible = true;
        towerRangeBorder.visible = true;
        // Color based on validity
        towerRangeMat.color.setHex(isValid ? 0x4da6ff : 0xff6666);
        towerRangeBorderMat.color.setHex(isValid ? 0x4da6ff : 0xff6666);
      } else {
        towerRangeIndicator.visible = false;
        towerRangeBorder.visible = false;
      }

      // Update ghost color based on validity
      previewGhost.traverse((child) => {
        if (child.isMesh && child.material.opacity !== undefined) {
          child.material.opacity = isValid ? 0.6 : 0.3;
          if (!isValid) {
            child.material.emissive = new THREE.Color(0xff0000);
            child.material.emissiveIntensity = 0.3;
          } else {
            child.material.emissive = new THREE.Color(0x00ff00);
            child.material.emissiveIntensity = 0.2;
          }
        }
      });
    }

    function hidePreview() {
      if (previewGhost) previewGhost.visible = false;
      placementRing.visible = false;
      towerRangeIndicator.visible = false;
      towerRangeBorder.visible = false;
    }

    function checkPlacementValid(x, z, collisionRadius = 2.5) {
      const dist = Math.sqrt(x * x + z * z);
      if (dist < 6 || dist > 14) return false;

      for (const b of buildingObjects) {
        const dx = b.position.x - x;
        const dz = b.position.z - z;
        if (Math.sqrt(dx * dx + dz * dz) < collisionRadius) return false;
      }
      return true;
    }

    // Initial carrots
    for (let i = 0; i < 30; i++) spawnCarrot();

    // Use global WAVES_CONFIG
    const WAVES = WAVES_CONFIG;

    let enemiesToSpawn = [];
    let spawnTimer = 0;
    const thrownBombs = []; // Array für geworfene Bomben

    function startWave(waveNum) {
      const config = WAVES[Math.min(waveNum, WAVES.length - 1)];
      enemiesToSpawn = [];
      for (let i = 0; i < config.foxes; i++) enemiesToSpawn.push('fox');
      for (let i = 0; i < config.ravens; i++) enemiesToSpawn.push('raven');
      for (let i = 0; i < config.snakes; i++) enemiesToSpawn.push('snake');

      // Add boss
      if (config.boss) {
        gameState.bossWave = true;
        setBossActive(true);
        if (config.boss === 'fox' || config.boss === 'both') enemiesToSpawn.push('boss_fox');
        if (config.boss === 'raven' || config.boss === 'both') enemiesToSpawn.push('boss_raven');
      }

      enemiesToSpawn.sort(() => Math.random() - 0.5);
      // Put bosses at end
      const bosses = enemiesToSpawn.filter(e => e.startsWith('boss'));
      enemiesToSpawn = enemiesToSpawn.filter(e => !e.startsWith('boss')).concat(bosses);

      spawnTimer = 0;
      setMessage(`🌙 Welle ${waveNum + 1}${config.boss ? ' - BOSS!' : ''}`);
      setTimeout(() => setMessage(''), 2500);
    }

    function spawnEnemy() {
      if (enemiesToSpawn.length === 0) return;
      const type = enemiesToSpawn.shift();
      const angle = Math.random() * Math.PI * 2;
      const radius = 38;

      let enemy;
      if (type === 'boss_fox') enemy = createFox(true);
      else if (type === 'boss_raven') enemy = createRaven(true);
      else if (type === 'fox') enemy = createFox();
      else if (type === 'raven') enemy = createRaven();
      else enemy = createSnake();

      enemy.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      scene.add(enemy);
      enemies.push(enemy);
    }

    // ============== WEATHER SYSTEM ==============
    const WEATHERS = ['sunny', 'rainy', 'windy'];
    
    function changeWeather() {
      const weatherMasterLevel = getSkillEffect('weatherMaster');
      let newWeather;
      
      if (weatherMasterLevel >= 2) {
        // Player can influence weather - bias towards beneficial
        newWeather = Math.random() < 0.6 ? 'sunny' : WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
      } else {
        newWeather = WEATHERS[Math.floor(Math.random() * WEATHERS.length)];
      }
      
      gameState.weather = newWeather;
      setWeather(newWeather);
      
      // Visual effects
      rain.visible = newWeather === 'rainy';

      if (newWeather === 'rainy') {
        lights.sun.intensity = 0.8;
      } else {
        lights.sun.intensity = gameState.phase === 'night' ? 0.25 : 1.5;
      }
    }

    // ============== TOUCH CONTROLS ==============
    const joystick = { active: false, startX: 0, startY: 0, moveX: 0, moveZ: 0 };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let touchBuildStart = null;

    function handleTouchStart(e) {
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();

      // Check if in build mode
      if (gameState.phase === 'day' && gameRef.current.buildMode) {
        pointer.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
          const pos = intersects[0].point;
          const gridX = Math.round(pos.x / 2) * 2;
          const gridZ = Math.round(pos.z / 2) * 2;

          // For walls, start drag mode - use exact position
          if (gameRef.current.buildMode === 'wall') {
            touchBuildStart = { x: pos.x, z: pos.z };
            wallDragStartPos = { x: pos.x, z: pos.z };
          } else {
            // Regular building - place immediately
            const dist = Math.sqrt(gridX * gridX + gridZ * gridZ);
            if (dist >= 6 && dist <= 14) {
              const rotation = gameRef.current.buildRotation || 0;
              placeBuildingWithRotation(gridX, gridZ, rotation);
            }
          }
        }
        return;
      }

      joystick.active = true;
      joystick.startX = touch.clientX;
      joystick.startY = touch.clientY;
    }

    function handleTouchMove(e) {
      const touch = e.touches[0];
      const rect = containerRef.current.getBoundingClientRect();

      // Update wall drag preview on touch
      if (gameState.phase === 'day' && gameRef.current.buildMode === 'wall' && touchBuildStart) {
        e.preventDefault();
        pointer.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
          const pos = intersects[0].point;
          // Use exact position for preview
          updateWallPreviewLine(touchBuildStart.x, touchBuildStart.z, pos.x, pos.z);
        }
        return;
      }

      if (!joystick.active) return;
      e.preventDefault();
      const dx = touch.clientX - joystick.startX;
      const dy = touch.clientY - joystick.startY;
      const maxDist = 60;

      joystick.moveX = Math.max(-1, Math.min(1, dx / maxDist));
      joystick.moveZ = Math.max(-1, Math.min(1, dy / maxDist));
    }

    function handleTouchEnd(e) {
      // Handle wall drag end on touch
      if (gameState.phase === 'day' && gameRef.current.buildMode === 'wall' && touchBuildStart) {
        const touch = e.changedTouches[0];
        const rect = containerRef.current.getBoundingClientRect();
        pointer.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const intersects = raycaster.intersectObject(ground);
        if (intersects.length > 0) {
          const pos = intersects[0].point;
          // Use exact position for wall placement
          const endX = pos.x;
          const endZ = pos.z;

          const positions = getWallPositionsAlongLine(touchBuildStart.x, touchBuildStart.z, endX, endZ);

          let wallsPlaced = 0;
          for (const wallPos of positions) {
            // Each wall has its own rotation from the angle property
            if (checkPlacementValid(wallPos.x, wallPos.z, 1.5)) {
              if (placeBuildingWithRotation(wallPos.x, wallPos.z, wallPos.angle)) {
                wallsPlaced++;
              }
            }
          }

          if (wallsPlaced > 0) {
            setMessage(`${wallsPlaced} Mauer${wallsPlaced > 1 ? 'n' : ''} gebaut!`);
            setTimeout(() => setMessage(''), 1500);
          }
        }

        touchBuildStart = null;
        wallDragStartPos = null;
        hideWallPreviewGhosts();
        return;
      }

      joystick.active = false;
      joystick.moveX = 0;
      joystick.moveZ = 0;
    }

    containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
    containerRef.current.addEventListener('touchmove', handleTouchMove, { passive: false });
    containerRef.current.addEventListener('touchend', handleTouchEnd);

    // Mouse move for preview ghost
    let lastMousePos = { x: 0, z: 0 };
    function handleMouseMove(e) {
      if (gameState.phase !== 'day' || !gameRef.current.buildMode) {
        hidePreview();
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(ground);
      if (intersects.length > 0) {
        const pos = intersects[0].point;
        const gridX = Math.round(pos.x / 2) * 2;
        const gridZ = Math.round(pos.z / 2) * 2;
        lastMousePos = { x: gridX, z: gridZ };

        // Create or update preview ghost
        const type = gameRef.current.buildMode;
        if (currentPreviewType !== type) {
          createPreviewGhost(type);
        }

        const isValid = checkPlacementValid(gridX, gridZ);
        const rotation = gameRef.current.buildRotation || 0;
        updatePreviewPosition(gridX, gridZ, rotation, isValid);

        // Update wall drag preview line - use exact position
        if (type === 'wall' && wallDragStartPos) {
          updateWallPreviewLine(wallDragStartPos.x, wallDragStartPos.z, pos.x, pos.z);
        }
      } else {
        hidePreview();
      }
    }
    containerRef.current.addEventListener('mousemove', handleMouseMove);

    // Calculate wall positions along a line - walls placed exactly along the line without gaps
    function getWallPositionsAlongLine(x1, z1, x2, z2) {
      const positions = [];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // If only start point (click without drag), place single wall at start
      if (distance < 0.5) {
        return [{ x: x1, z: z1, angle: 0 }];
      }

      // Wall width is 2 units, place walls exactly along the line
      const wallSpacing = 2; // Walls are 2 units wide
      const numWalls = Math.max(1, Math.ceil(distance / wallSpacing));

      // Calculate the angle for all walls - wall is aligned along the line
      const angle = Math.atan2(dz, dx) * 180 / Math.PI;

      for (let i = 0; i < numWalls; i++) {
        // Place walls at exact positions along the line (not grid-snapped)
        const t = numWalls === 1 ? 0.5 : i / (numWalls - 1);
        const x = x1 + dx * t;
        const z = z1 + dz * t;
        positions.push({ x, z, angle });
      }

      return positions;
    }

    // Calculate wall rotation based on line direction (in degrees)
    function getWallRotationFromLine(x1, z1, x2, z2) {
      return Math.atan2(z2 - z1, x2 - x1) * 180 / Math.PI;
    }

    // Create a single wall preview ghost
    function createWallGhost() {
      const ghost = createGuineaPigHouse('wall');
      ghost.traverse((child) => {
        if (child.isMesh) {
          child.material = child.material.clone();
          child.material.transparent = true;
          child.material.opacity = 0.5;
          child.material.depthWrite = false;
          child.material.emissive = new THREE.Color(0x00ff00);
          child.material.emissiveIntensity = 0.2;
        }
      });
      ghost.visible = false;
      scene.add(ghost);
      return ghost;
    }

    // Update wall preview with multiple ghost walls
    function updateWallPreviewLine(x1, z1, x2, z2) {
      const positions = getWallPositionsAlongLine(x1, z1, x2, z2);

      // Create more ghosts if needed
      while (wallPreviewGhosts.length < positions.length) {
        wallPreviewGhosts.push(createWallGhost());
      }

      // Update ghost positions and rotations
      for (let i = 0; i < wallPreviewGhosts.length; i++) {
        if (i < positions.length) {
          const pos = positions[i];
          const isValid = checkPlacementValid(pos.x, pos.z, 1.5);

          wallPreviewGhosts[i].position.set(pos.x, 0, pos.z);
          wallPreviewGhosts[i].rotation.y = pos.angle * Math.PI / 180;
          wallPreviewGhosts[i].visible = true;

          // Update color based on validity
          wallPreviewGhosts[i].traverse((child) => {
            if (child.isMesh) {
              child.material.opacity = isValid ? 0.6 : 0.3;
              child.material.emissive = isValid ? new THREE.Color(0x00ff00) : new THREE.Color(0xff0000);
              child.material.emissiveIntensity = isValid ? 0.2 : 0.3;
            }
          });
        } else {
          // Hide unused ghosts
          wallPreviewGhosts[i].visible = false;
        }
      }

      // Also update the line for visual connection
      if (wallPreviewLine && positions.length >= 2) {
        const points = positions.map(pos => new THREE.Vector3(pos.x, 0.5, pos.z));
        wallPreviewLine.geometry.dispose();
        wallPreviewLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
        wallPreviewLine.visible = true;
      } else if (wallPreviewLine) {
        wallPreviewLine.visible = false;
      }
    }

    // Hide all wall preview ghosts
    function hideWallPreviewGhosts() {
      wallPreviewGhosts.forEach(ghost => ghost.visible = false);
      if (wallPreviewLine) wallPreviewLine.visible = false;
    }

    // Mouse down for wall drag start
    function handleMouseDown(e) {
      if (gameState.phase !== 'day' || !gameRef.current.buildMode) return;
      if (gameRef.current.buildMode !== 'wall') return;

      const rect = containerRef.current.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(ground);
      if (intersects.length > 0) {
        const pos = intersects[0].point;
        // Use exact position for wall drag start (not grid-snapped)
        wallDragStartPos = { x: pos.x, z: pos.z };
      }
    }
    containerRef.current.addEventListener('mousedown', handleMouseDown);

    // Mouse up for wall drag end / regular building placement
    function handleMouseUp(e) {
      if (gameState.phase !== 'day' || !gameRef.current.buildMode) return;

      const rect = containerRef.current.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObject(ground);
      if (intersects.length > 0) {
        const pos = intersects[0].point;
        const gridX = Math.round(pos.x / 2) * 2;
        const gridZ = Math.round(pos.z / 2) * 2;

        const type = gameRef.current.buildMode;

        if (type === 'wall' && wallDragStartPos) {
          // Place multiple walls along the drag line - use exact positions from line
          const endX = pos.x; // Use exact position, not grid-snapped
          const endZ = pos.z;
          const positions = getWallPositionsAlongLine(wallDragStartPos.x, wallDragStartPos.z, endX, endZ);

          let wallsPlaced = 0;
          for (const wallPos of positions) {
            // Each wall has its own rotation from the angle property
            if (checkPlacementValid(wallPos.x, wallPos.z, 1.5)) { // Smaller collision check for walls
              if (placeBuildingWithRotation(wallPos.x, wallPos.z, wallPos.angle)) {
                wallsPlaced++;
              }
            }
          }

          if (wallsPlaced > 0) {
            setMessage(`${wallsPlaced} Mauer${wallsPlaced > 1 ? 'n' : ''} gebaut!`);
            setTimeout(() => setMessage(''), 1500);
          }

          wallDragStartPos = null;
          hideWallPreviewGhosts();
        } else {
          // Regular building placement
          const dist = Math.sqrt(gridX * gridX + gridZ * gridZ);
          if (dist >= 6 && dist <= 14) {
            const rotation = gameRef.current.buildRotation || 0;
            placeBuildingWithRotation(gridX, gridZ, rotation);
          } else {
            setMessage('Zu nah oder zu weit vom Zentrum!');
            setTimeout(() => setMessage(''), 1500);
          }
        }
      }

      wallDragStartPos = null;
      hideWallPreviewGhosts();
    }
    containerRef.current.addEventListener('mouseup', handleMouseUp);

    // Zoom with mouse wheel
    const handleWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.1 : -0.1;
      zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel + delta));
    };
    containerRef.current.addEventListener('wheel', handleWheel, { passive: false });

    // Keyboard
    const keys = { w: false, a: false, s: false, d: false };
    const handleKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (k in keys) keys[k] = true;

      // R key to rotate building
      if (k === 'r' && gameRef.current.buildMode) {
        const currentRotation = gameRef.current.buildRotation || 0;
        const newRotation = (currentRotation + 45) % 360;
        gameRef.current.buildRotation = newRotation;
        setBuildRotation(newRotation);

        // Update preview
        if (previewGhost) {
          previewGhost.rotation.y = newRotation * Math.PI / 180;
        }
      }

      // Escape to cancel build mode
      if (e.key === 'Escape' && gameRef.current.buildMode) {
        window.gameCancelBuild && window.gameCancelBuild();
      }
    };
    const handleKeyUp = (e) => { const k = e.key.toLowerCase(); if (k in keys) keys[k] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ============== BUILDING FUNCTIONS ==============
    function placeBuildingWithRotation(x, z, rotation = 0, showMessage = true) {
      const type = gameRef.current.buildMode;
      if (!type) return false;

      const cost = getBuildingCost(type);
      if (gameState.score < cost) {
        if (showMessage) {
          setMessage('Nicht genug Karotten!');
          setTimeout(() => setMessage(''), 1500);
        }
        return false;
      }

      // Check if spot is free
      for (const b of buildingObjects) {
        const dx = b.position.x - x;
        const dz = b.position.z - z;
        if (Math.sqrt(dx * dx + dz * dz) < 2.5) {
          if (showMessage) {
            setMessage('Platz belegt!');
            setTimeout(() => setMessage(''), 1500);
          }
          return false;
        }
      }

      gameState.score -= cost;
      setScore(gameState.score);

      const building = createGuineaPigHouse(type);
      building.position.set(x, 0, z);
      building.rotation.y = rotation * Math.PI / 180;
      building.userData.rotation = rotation;
      scene.add(building);
      buildingObjects.push(building);
      setBuildings([...buildingObjects.map(b => ({ type: b.userData.type, x: b.position.x, z: b.position.z, rotation: b.userData.rotation || 0 }))]);

      if (showMessage) {
        setMessage(`${type === 'collectorHut' ? 'Sammler-Hütte' : type === 'heroHut' ? 'Helden-Hütte' : type === 'tower' ? 'Wachturm' : 'Mauer'} gebaut!`);
        setTimeout(() => setMessage(''), 1500);
      }

      // Spawn initial collector
      if (type === 'collectorHut') {
        spawnCollector(x, z);
      }

      return true;
    }

    // Legacy function for compatibility
    function placeBuilding(x, z) {
      return placeBuildingWithRotation(x, z, gameRef.current.buildRotation || 0);
    }

    function spawnCollector(x, z) {
      const collector = createGuineaPig('collector', false, 0.9);
      collector.position.set(x + 2, 0, z);
      collector.userData.homePos = new THREE.Vector3(x, 0, z);
      collector.userData.state = 'seeking';
      scene.add(collector);
      collectors.push(collector);
    }

    function spawnHero(x, z) {
      const heroType = heroTypes[Math.floor(Math.random() * heroTypes.length)];

      // Spezieller Fall für GLB-Modelle
      let hero;
      if (heroType === 'healer') {
        hero = createHealerTank(1.1);
      } else if (heroType === 'bomber') {
        hero = createBomberHero(1.1);
      } else {
        hero = createGuineaPig(heroType, false, 1.1);
      }

      hero.position.set(x + 2, 0, z);
      hero.userData.placed = true;
      scene.add(hero);
      defenders.push(hero);
      setMessage(`🦸 ${GUINEA_PIG_TYPES[heroType].name} erschienen!`);
      setTimeout(() => setMessage(''), 2000);
    }

    // Expose to React
    window.gameBuild = (type) => {
      gameRef.current.buildMode = type;
      gameRef.current.buildRotation = 0; // Reset rotation when selecting new building
      setBuildMode(type);
      setBuildRotation(0);
      createPreviewGhost(type);
    };
    window.gameCancelBuild = () => {
      gameRef.current.buildMode = null;
      setBuildMode(null);
      hidePreview();
      if (previewGhost) {
        scene.remove(previewGhost);
        previewGhost = null;
        currentPreviewType = null;
      }
      wallDragStartPos = null;
      hideWallPreviewGhosts();
    };
    window.gameRotateBuilding = () => {
      if (gameRef.current.buildMode) {
        const currentRotation = gameRef.current.buildRotation || 0;
        const newRotation = (currentRotation + 45) % 360;
        gameRef.current.buildRotation = newRotation;
        setBuildRotation(newRotation);
        if (previewGhost) {
          previewGhost.rotation.y = newRotation * Math.PI / 180;
        }
      }
    };
    window.gameBreed = () => {
      if (gameState.score >= 15) {
        const nearest = findNearestPartner();
        if (nearest && nearest.dist < 3.5) {
          gameState.score -= 15;
          setScore(gameState.score);

          const heroType = heroTypes[Math.floor(Math.random() * heroTypes.length)];
          let hero;
          if (heroType === 'healer') {
            hero = createHealerTank(1.1);
          } else if (heroType === 'bomber') {
            hero = createBomberHero(1.1);
          } else {
            hero = createGuineaPig(heroType, false, 1.1);
          }
          hero.position.set(player.position.x + 2, 0, player.position.z);
          hero.userData.placed = true;
          scene.add(hero);
          defenders.push(hero);

          effects.push(...createHearts(player.position));
          setMessage(`💕 ${GUINEA_PIG_TYPES[heroType].name} geboren!`);
          setTimeout(() => setMessage(''), 2000);
        }
      }
    };

    function findNearestPartner() {
      let nearest = null;
      let minDist = Infinity;
      for (const p of partners) {
        if (!p.visible) continue;
        const dx = player.position.x - p.position.x;
        const dz = player.position.z - p.position.z;
        const d = Math.sqrt(dx*dx + dz*dz);
        if (d < minDist) {
          minDist = d;
          nearest = p;
        }
      }
      return { partner: nearest, dist: minDist };
    }

    // ============== PHASE TRANSITIONS ==============
    function transitionToNight() {
      gameState.phase = 'night';
      gameState.nightActive = true;
      setPhase('night');

      // Cancel build mode and hide previews
      gameRef.current.buildMode = null;
      setBuildMode(null);
      hidePreview();
      if (previewGhost) {
        scene.remove(previewGhost);
        previewGhost = null;
        currentPreviewType = null;
      }
      wallDragStartPos = null;
      hideWallPreviewGhosts();

      // Night mode graphics
      scene.background = new THREE.Color(0x1a1a3a);
      scene.fog.color.setHex(0x1a1a3a);
      lights.setNightMode();
      clouds.setVisible(false);

      partners.forEach(p => p.visible = false);
      changeWeather();
      startWave(gameState.wave);
    }

    function transitionToDay() {
      gameState.phase = 'day';
      gameState.nightActive = false;
      gameState.bossWave = false;
      setBossActive(false);
      gameState.wave++;
      gameState.dayTimer = 0;
      setWave(gameState.wave);
      setPhase('day');
      setDayTimeLeft(gameState.dayDuration);

      // Day mode graphics
      scene.background = new THREE.Color(0x87CEEB);
      scene.fog.color.setHex(0x87CEEB);
      lights.setDayMode();
      clouds.setVisible(true);

      partners.forEach(p => p.visible = true);

      // Regenerate if fortress skill
      if (getSkillEffect('fortress')) {
        gameState.baseHealth = Math.min(gameState.maxBaseHealth, gameState.baseHealth + 10);
        setBaseHealth(gameState.baseHealth);
      }

      // Spawn more carrots
      for (let i = 0; i < 12; i++) spawnCarrot();

      if (gameState.wave >= WAVES.length) {
        setVictory(true);
        // Award skill points
        const earnedPoints = Math.floor(gameState.score / 5) + gameState.wave * 10;
        setMeta(prev => ({
          ...prev,
          skillPoints: prev.skillPoints + earnedPoints,
          bestWave: Math.max(prev.bestWave, gameState.wave),
          totalGames: prev.totalGames + 1,
          totalCarrots: prev.totalCarrots + gameState.score,
        }));
        setMessage(`🏆 SIEG! +${earnedPoints} Skillpunkte!`);
      } else {
        changeWeather();
        setMessage(`☀️ Tag ${gameState.wave + 1}`);
        setTimeout(() => setMessage(''), 2500);
      }
    }

    // ============== MAIN LOOP ==============
    let time = 0;
    let lastTime = performance.now();

    function animate() {
      requestAnimationFrame(animate);
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      time += dt;

      if (gameOver || victory) {
        renderer.render(scene, camera);
        return;
      }

      // Update enhanced graphics
      clouds.update(time);
      dustParticles.update();

      // Weather effects
      if (gameState.weather === 'rainy') {
        const positions = rain.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] -= 0.5;
          if (positions[i + 1] < 0) positions[i + 1] = 30;
        }
        rain.geometry.attributes.position.needsUpdate = true;
      }

      // Combo timer
      if (gameState.comboTimer > 0) {
        gameState.comboTimer -= dt;
        setComboTimer(gameState.comboTimer);
        if (gameState.comboTimer <= 0) {
          gameState.combo = 0;
          setCombo(0);
        }
      }

      // Speed boost timer
      if (gameState.speedBoostTimer > 0) {
        gameState.speedBoostTimer -= dt;
      }

      // Rage mode check
      const wasRage = gameState.rageActive;
      gameState.rageActive = gameState.baseHealth < gameState.maxBaseHealth * 0.25;
      if (gameState.rageActive !== wasRage) {
        setRageMode(gameState.rageActive);
        if (gameState.rageActive) {
          setMessage('🔥 RAGE MODE!');
          setTimeout(() => setMessage(''), 2000);
        }
      }

      // Fortress regeneration
      if (getSkillEffect('fortress') && gameState.baseHealth < gameState.maxBaseHealth) {
        gameState.baseHealth = Math.min(gameState.maxBaseHealth, gameState.baseHealth + dt);
        setBaseHealth(Math.floor(gameState.baseHealth));
      }

      // ===== DAY PHASE =====
      if (gameState.phase === 'day') {
        gameState.dayTimer += dt;
        setDayTimeLeft(Math.max(0, Math.ceil(gameState.dayDuration - gameState.dayTimer)));

        // Weather changes
        gameState.weatherTimer += dt;
        if (gameState.weatherTimer > 30) {
          gameState.weatherTimer = 0;
          if (Math.random() < 0.3) changeWeather();
        }

        // Player movement with smooth velocity
        let maxSpeed = 0.08;
        const acceleration = 0.008;
        const friction = 0.88;
        if (gameState.speedBoostTimer > 0) maxSpeed *= 1.5;
        if (gameState.weather === 'windy') maxSpeed *= 1.2;

        let inputX = joystick.moveX;
        let inputZ = joystick.moveZ;
        if (keys.w) inputZ -= 1;
        if (keys.s) inputZ += 1;
        if (keys.a) inputX -= 1;
        if (keys.d) inputX += 1;

        const hasInput = Math.abs(inputX) > 0.1 || Math.abs(inputZ) > 0.1;

        if (hasInput) {
          const len = Math.sqrt(inputX * inputX + inputZ * inputZ);
          if (len > 0) { inputX /= len; inputZ /= len; }

          // Accelerate towards input direction
          player.userData.velocityX += inputX * acceleration;
          player.userData.velocityZ += inputZ * acceleration;

          // Clamp to max speed
          const currentSpeed = Math.sqrt(player.userData.velocityX ** 2 + player.userData.velocityZ ** 2);
          if (currentSpeed > maxSpeed) {
            player.userData.velocityX = (player.userData.velocityX / currentSpeed) * maxSpeed;
            player.userData.velocityZ = (player.userData.velocityZ / currentSpeed) * maxSpeed;
          }

          player.userData.targetRotation = Math.atan2(-inputZ, inputX);
        } else {
          // Apply friction when no input
          player.userData.velocityX *= friction;
          player.userData.velocityZ *= friction;
        }

        // Apply velocity to position
        const newX = player.position.x + player.userData.velocityX;
        const newZ = player.position.z + player.userData.velocityZ;

        // Simple bounds
        const dist = Math.sqrt(newX*newX + newZ*newZ);
        if (dist < 35 && dist > 5) {
          player.position.x = newX;
          player.position.z = newZ;
        } else {
          // Bounce off bounds slightly
          player.userData.velocityX *= -0.3;
          player.userData.velocityZ *= -0.3;
        }

        // Animation based on actual movement speed
        const movementSpeed = Math.sqrt(player.userData.velocityX ** 2 + player.userData.velocityZ ** 2);
        const isMoving = movementSpeed > 0.005;

        if (isMoving) {
          const animIntensity = Math.min(movementSpeed / maxSpeed, 1);
          player.rotation.z = Math.sin(time * 10) * 0.1 * animIntensity;
          player.position.y = Math.abs(Math.sin(time * 10)) * 0.05 * animIntensity;
        } else {
          player.rotation.z *= 0.9;
          player.position.y *= 0.9;
        }

        let rotDiff = player.userData.targetRotation - player.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        player.rotation.y += rotDiff * 0.15;

        // Partner movement
        partners.forEach((p, i) => {
          if (!p.visible) return;
          const data = p.userData;
          
          if (data.waitTime > 0) {
            data.waitTime -= dt;
          } else {
            const dx = data.targetPos.x - p.position.x;
            const dz = data.targetPos.z - p.position.z;
            const d = Math.sqrt(dx*dx + dz*dz);
            
            if (d < 0.5) {
              const angle = Math.random() * Math.PI * 2;
              const radius = 8 + Math.random() * 15;
              data.targetPos.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
              data.waitTime = 2 + Math.random() * 4;
            } else {
              p.position.x += (dx / d) * 0.02;
              p.position.z += (dz / d) * 0.02;
              p.rotation.y = Math.atan2(-dz, dx);
            }
          }
          
          // Heart indicator
          const pdist = Math.sqrt(
            Math.pow(player.position.x - p.position.x, 2) + 
            Math.pow(player.position.z - p.position.z, 2)
          );
          if (data.heartIndicator) {
            data.heartIndicator.visible = gameState.score >= 15 && pdist < 4;
            if (data.heartIndicator.visible) {
              data.heartIndicator.position.y = 1.2 + Math.sin(time * 3) * 0.1;
            }
          }
        });

        // Carrot collection - with magnet if skill unlocked
        const magnetRange = getSkillEffect('autoCollect') ? 8 : 1.5;
        
        carrots.forEach((carrot, i) => {
          if (carrot.userData.collected) return;
          
          if (carrot.userData.ring) {
            carrot.userData.ring.rotation.z = time * 2;
          }
          carrot.position.y = Math.sin(time * 2 + i) * 0.03;

          const dx = player.position.x - carrot.position.x;
          const dz = player.position.z - carrot.position.z;
          const d = Math.sqrt(dx * dx + dz * dz);

          // Magnet pull
          if (getSkillEffect('autoCollect') && d < magnetRange && d > 1.5) {
            carrot.position.x += dx / d * 0.1;
            carrot.position.z += dz / d * 0.1;
          }

          if (d < 1.5) {
            carrot.userData.collected = true;
            
            // Combo system
            gameState.combo++;
            gameState.comboTimer = 2;
            setCombo(gameState.combo);
            setComboTimer(2);
            
            const comboMultiplier = 1 + Math.min(gameState.combo, 10) * 0.1;
            const value = Math.floor(carrot.userData.value * comboMultiplier);
            gameState.score += value;
            setScore(gameState.score);
            
            // Special effects
            if (carrot.userData.type === 'blue') {
              gameState.speedBoostTimer = 5;
              setMessage('⚡ Speed Boost!');
              setTimeout(() => setMessage(''), 1500);
            }
            
            if (gameState.combo >= 5) {
              effects.push(...createComboText(carrot.position, gameState.combo));
            }
            
            // Animate removal
            const anim = () => {
              carrot.scale.multiplyScalar(0.85);
              carrot.position.y += 0.12;
              if (carrot.scale.x > 0.05) {
                requestAnimationFrame(anim);
              } else {
                scene.remove(carrot);
                const idx = carrots.indexOf(carrot);
                if (idx > -1) carrots.splice(idx, 1);
                setTimeout(spawnCarrot, 2000 + Math.random() * 3000);
              }
            };
            anim();
          }
        });

        // Collector AI
        collectors.forEach(collector => {
          const data = collector.userData;
          
          if (data.state === 'seeking') {
            // Find nearest carrot
            let nearestCarrot = null;
            let nearestDist = Infinity;
            carrots.forEach(c => {
              if (c.userData.collected) return;
              const dx = collector.position.x - c.position.x;
              const dz = collector.position.z - c.position.z;
              const d = Math.sqrt(dx*dx + dz*dz);
              if (d < nearestDist) {
                nearestDist = d;
                nearestCarrot = c;
              }
            });
            
            if (nearestCarrot && nearestDist > 1) {
              const dx = nearestCarrot.position.x - collector.position.x;
              const dz = nearestCarrot.position.z - collector.position.z;
              collector.position.x += (dx / nearestDist) * data.speed;
              collector.position.z += (dz / nearestDist) * data.speed;
              collector.rotation.y = Math.atan2(-dz, dx);
            } else if (nearestCarrot && nearestDist <= 1) {
              // Collect
              nearestCarrot.userData.collected = true;
              data.carryingCarrots += nearestCarrot.userData.value;
              scene.remove(nearestCarrot);
              const idx = carrots.indexOf(nearestCarrot);
              if (idx > -1) carrots.splice(idx, 1);
              setTimeout(spawnCarrot, 3000);
              
              if (data.carryingCarrots >= data.maxCarry) {
                data.state = 'returning';
              }
            } else {
              // No carrots, return if carrying any
              if (data.carryingCarrots > 0) {
                data.state = 'returning';
              }
            }
          } else if (data.state === 'returning') {
            const dx = data.homePos.x - collector.position.x;
            const dz = data.homePos.z - collector.position.z;
            const d = Math.sqrt(dx*dx + dz*dz);
            
            if (d > 2) {
              collector.position.x += (dx / d) * data.speed;
              collector.position.z += (dz / d) * data.speed;
              collector.rotation.y = Math.atan2(-dz, dx);
            } else {
              // Deposit
              gameState.score += data.carryingCarrots;
              setScore(gameState.score);
              data.carryingCarrots = 0;
              data.state = 'seeking';
            }
          }
          
          collector.rotation.z = Math.sin(time * 6) * 0.05;
        });

        // Building spawns
        buildingObjects.forEach(building => {
          const data = building.userData;
          data.spawnTimer += dt;
          
          const heroSpawnTime = 20 - getSkillEffect('heroSpawnRate');
          
          if (data.type === 'collectorHut' && data.spawnTimer >= 30) {
            data.spawnTimer = 0;
            if (collectors.filter(c => c.userData.homePos.equals(new THREE.Vector3(building.position.x, 0, building.position.z))).length < 3) {
              spawnCollector(building.position.x, building.position.z);
            }
          }
          
          if (data.type === 'heroHut' && data.spawnTimer >= heroSpawnTime) {
            data.spawnTimer = 0;
            spawnHero(building.position.x, building.position.z);
          }
        });

        // Day end
        if (gameState.dayTimer >= gameState.dayDuration) {
          transitionToNight();
        }
      }

      // ===== NIGHT PHASE =====
      if (gameState.phase === 'night') {
        const waveConfig = WAVES[Math.min(gameState.wave, WAVES.length - 1)];
        spawnTimer += dt;
        if (spawnTimer >= waveConfig.delay && enemiesToSpawn.length > 0) {
          spawnTimer = 0;
          spawnEnemy();
        }

        // Enemy AI
        enemies.forEach(enemy => {
          const data = enemy.userData;
          
          if (data.confused) {
            data.confuseTime -= dt;
            if (data.confuseTime <= 0) data.confused = false;
          }
          if (data.slowed) {
            data.slowTime -= dt;
            if (data.slowTime <= 0) data.slowed = false;
          }

          // Find target (prioritize buildings, then base)
          let targetX = 0, targetZ = 0;
          let targetBuilding = data.targetBuilding;

          if (!data.confused) {
            // Only search for new target if we don't have one or current is destroyed
            const needNewTarget = !targetBuilding ||
              targetBuilding.userData.health <= 0 ||
              !buildingObjects.includes(targetBuilding);

            if (needNewTarget) {
              targetBuilding = null;
              data.confusedTarget = null; // Reset confused target when getting new target
              // Snakes always target buildings, others have 30% chance (decided once per enemy)
              if (data.buildingTargeter === undefined) {
                data.buildingTargeter = data.type === 'snake' || Math.random() < 0.3;
              }

              if (data.buildingTargeter) {
                let nearestBuildingDist = Infinity;
                buildingObjects.forEach(b => {
                  if (b.userData.health <= 0) return;
                  const dx = enemy.position.x - b.position.x;
                  const dz = enemy.position.z - b.position.z;
                  const d = Math.sqrt(dx*dx + dz*dz);
                  if (d < nearestBuildingDist && d < 25) {
                    nearestBuildingDist = d;
                    targetBuilding = b;
                  }
                });
              }
              data.targetBuilding = targetBuilding;
            }

            if (targetBuilding) {
              targetX = targetBuilding.position.x;
              targetZ = targetBuilding.position.z;
            }
          } else {
            // When confused, use cached random position
            if (!data.confusedTarget) {
              data.confusedTarget = {
                x: (Math.random() - 0.5) * 30,
                z: (Math.random() - 0.5) * 30
              };
            }
            targetX = data.confusedTarget.x;
            targetZ = data.confusedTarget.z;
          }

          const dx = targetX - enemy.position.x;
          const dz = targetZ - enemy.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          let speed = data.speed;
          if (data.slowed) speed *= 0.35;
          if (gameState.weather === 'rainy') speed *= 0.8;

          const attackDist = data.targetBuilding ? 2.5 : 5;
          
          if (dist > attackDist) {
            // Check wall collision
            let blocked = false;
            buildingObjects.forEach(b => {
              if (b.userData.type !== 'wall' || b.userData.health <= 0) return;
              const wdx = enemy.position.x - b.position.x;
              const wdz = enemy.position.z - b.position.z;
              if (Math.sqrt(wdx*wdx + wdz*wdz) < 2) {
                blocked = true;
                data.targetBuilding = b;
              }
            });
            
            if (!blocked) {
              enemy.position.x += (dx / dist) * speed;
              enemy.position.z += (dz / dist) * speed;
            }
            // Smooth rotation interpolation to prevent jittering
            const targetRot = Math.atan2(-dz, dx);
            let rotDiff = targetRot - enemy.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            enemy.rotation.y += rotDiff * 0.15;
            
            // Animations
            if (data.type === 'fox' || data.type === 'boss_fox') {
              enemy.rotation.z = Math.sin(time * 6) * 0.04;
            } else if (data.type === 'raven' || data.type === 'boss_raven') {
              enemy.position.y = 1.8 + Math.sin(time * 4) * 0.25;
              if (data.wingL) data.wingL.rotation.x = -0.3 + Math.sin(time * 10) * 0.35;
              if (data.wingR) data.wingR.rotation.x = 0.3 - Math.sin(time * 10) * 0.35;
            } else if (data.type === 'snake') {
              enemy.rotation.z = Math.sin(time * 8) * 0.1;
              if (data.tongue) data.tongue.scale.x = 1 + Math.sin(time * 15) * 0.3;
            }
          } else {
            // Attack
            data.attackCooldown -= dt;
            if (data.attackCooldown <= 0) {
              data.attackCooldown = data.isBoss ? 1 : 1.5;

              if (data.targetBuilding && data.targetBuilding.userData.health > 0) {
                data.targetBuilding.userData.health -= data.damage;
                if (data.targetBuilding.userData.health <= 0) {
                  effects.push(...createExplosion(data.targetBuilding.position, 0x8B4513));
                  scene.remove(data.targetBuilding);
                  const idx = buildingObjects.indexOf(data.targetBuilding);
                  if (idx > -1) buildingObjects.splice(idx, 1);
                  data.targetBuilding = null;
                }
              } else {
                gameState.baseHealth -= data.damage;
                setBaseHealth(Math.max(0, Math.floor(gameState.baseHealth)));

                if (gameState.baseHealth <= 0) {
                  // Game over - award partial points
                  const earnedPoints = Math.floor(gameState.score / 10) + gameState.wave * 5;
                  setMeta(prev => ({
                    ...prev,
                    skillPoints: prev.skillPoints + earnedPoints,
                    bestWave: Math.max(prev.bestWave, gameState.wave),
                    totalGames: prev.totalGames + 1,
                  }));
                  setGameOver(true);
                  setMessage(`💀 GAME OVER - +${earnedPoints} SP`);
                }
              }
            }
          }

          // HP bar
          if (data.hpBar) {
            const hp = data.health / data.maxHealth;
            data.hpBar.scale.x = Math.max(0.01, hp);
          }
        });

        // Defender AI
        const rageBonus = gameState.rageActive ? (1 + getSkillEffect('rageBonus') / 100) : 1;
        const critChance = getSkillEffect('critChance') / 100;
        const patrolRadius = 12; // Patrol within defense circle
        const patrolMinRadius = 6;

        defenders.forEach(defender => {
          if (!defender.userData.placed) return;
          const data = defender.userData;
          data.attackCooldown -= dt;
          data.abilityCooldown -= dt;
          if (!data.patrolTarget) data.patrolTarget = new THREE.Vector3();
          if (data.patrolWait === undefined) data.patrolWait = 0;

          let attackRange = data.attackRange;
          const sightRange = attackRange * 2.5; // Can see enemies further than attack range

          // Find nearest enemy in sight range
          let nearestEnemy = null;
          let nearestDist = Infinity;
          enemies.forEach(enemy => {
            const dx = defender.position.x - enemy.position.x;
            const dz = defender.position.z - enemy.position.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < nearestDist && d < sightRange) {
              nearestDist = d;
              nearestEnemy = enemy;
            }
          });

          if (nearestEnemy) {
            const dx = nearestEnemy.position.x - defender.position.x;
            const dz = nearestEnemy.position.z - defender.position.z;
            defender.userData.targetRotation = Math.atan2(-dz, dx);

            // Turret zur Feind-Ausrichtung (für GLB Healer)
            if (data.isGLBModel && data.turret) {
              const targetPos = nearestEnemy.position.clone();
              targetPos.y = data.turret.position.y + defender.position.y;
              data.turret.lookAt(targetPos);
            }

            // Move towards enemy if not in attack range
            if (nearestDist > attackRange * 0.8) {
              const moveSpeed = data.speed * 1.5;
              const dirX = dx / nearestDist;
              const dirZ = dz / nearestDist;
              defender.position.x += dirX * moveSpeed;
              defender.position.z += dirZ * moveSpeed;
            }

            // Attack if in range
            if (nearestDist < attackRange && data.attackCooldown <= 0) {
              data.attackCooldown = data.type === 'bomber' ? 2.5 : (data.type === 'assassin' ? 0.8 : 1.2);

              let damage = data.attackDamage * rageBonus;
              const wasCrit = Math.random() < critChance;
              if (wasCrit) {
                damage *= 2;
                effects.push(...createExplosion(nearestEnemy.position, 0xFFFF00));
              }
              damage = Math.round(damage);

              if (data.type === 'bomber') {
                // Bomber wirft Bombe auf Feinde
                const bomb = createThrownBomb(
                  defender.position.clone().add(new THREE.Vector3(0, 1.2, 0)),
                  nearestEnemy.position.clone(),
                  damage,
                  data.splashRadius || 3,
                  false
                );
                bomb.userData.targetEnemies = true;
                scene.add(bomb);
                thrownBombs.push(bomb);

                // Animation: Bombe kurz ausblenden und wieder einblenden
                if (data.bombInHand) {
                  data.bombInHand.visible = false;
                  setTimeout(() => {
                    if (data.bombInHand) data.bombInHand.visible = true;
                  }, 500);
                }
                effects.push(...createExplosion(defender.position, 0xFF6B35));
              } else {
                nearestEnemy.userData.health -= damage;
                effects.push(...createDamageNumber(nearestEnemy.position, damage, wasCrit));
              }
            }

            // Abilities
            if (data.abilityCooldown <= 0) {
              data.abilityCooldown = 6;

              if (data.type === 'tunneler') {
                enemies.forEach(e => {
                  const edx = defender.position.x - e.position.x;
                  const edz = defender.position.z - e.position.z;
                  if (Math.sqrt(edx*edx + edz*edz) < 5) {
                    e.userData.slowed = true;
                    e.userData.slowTime = 4;
                  }
                });
                effects.push(...createExplosion(defender.position, 0x8B4513));
              } else if (data.type === 'shadow') {
                nearestEnemy.userData.confused = true;
                nearestEnemy.userData.confuseTime = 5;
                effects.push(...createExplosion(nearestEnemy.position, 0x4B0082));
              } else if (data.type === 'tank') {
                // Taunt - all nearby enemies target this defender
                enemies.forEach(e => {
                  const edx = defender.position.x - e.position.x;
                  const edz = defender.position.z - e.position.z;
                  if (Math.sqrt(edx*edx + edz*edz) < 8) {
                    e.userData.targetBuilding = null;
                  }
                });
              } else if (data.type === 'assassin') {
                // Teleport to weakest enemy
                let weakest = null;
                let minHp = Infinity;
                enemies.forEach(e => {
                  if (e.userData.health < minHp) {
                    minHp = e.userData.health;
                    weakest = e;
                  }
                });
                if (weakest) {
                  defender.position.x = weakest.position.x + 1;
                  defender.position.z = weakest.position.z;
                  effects.push(...createExplosion(defender.position, 0x800080));
                }
              }
            }

            if (data.type === 'healer' && data.abilityCooldown <= 0) {
              defenders.forEach(other => {
                if (other === defender) return;
                const hdx = defender.position.x - other.position.x;
                const hdz = defender.position.z - other.position.z;
                if (Math.sqrt(hdx*hdx + hdz*hdz) < 6) {
                  other.userData.health = Math.min(other.userData.maxHealth, other.userData.health + 20);
                }
              });

              // Effekt-Position anpassen für GLB-Modell (höher für Tank)
              const effectPos = defender.position.clone();
              if (data.isGLBModel) {
                effectPos.y += 2;
              }
              effects.push(...createHealEffect(effectPos));
            }
          } else {
            // No enemy in sight - patrol within the defense circle
            data.patrolWait -= dt;

            // GLB Healer: Umschau-Animation wenn keine Feinde
            if (data.isGLBModel && data.healerBody) {
              data.healerBody.rotation.y = Math.sin(time * 1.2) * 0.4;
            }
            // Turret macht langsame Patrol-Rotation
            if (data.isGLBModel && data.turret) {
              data.turret.rotation.y = Math.sin(time * 0.5) * 0.3;
            }

            // Check if reached patrol target or need new one
            const toTargetX = data.patrolTarget.x - defender.position.x;
            const toTargetZ = data.patrolTarget.z - defender.position.z;
            const toTargetDist = Math.sqrt(toTargetX * toTargetX + toTargetZ * toTargetZ);

            if (toTargetDist < 0.5 || data.patrolWait <= 0 || data.patrolTarget.x === 0 && data.patrolTarget.z === 0) {
              // Pick new random patrol point within defense circle
              const angle = Math.random() * Math.PI * 2;
              const radius = patrolMinRadius + Math.random() * (patrolRadius - patrolMinRadius);
              data.patrolTarget.x = Math.cos(angle) * radius;
              data.patrolTarget.z = Math.sin(angle) * radius;
              data.patrolWait = 3 + Math.random() * 2; // Wait 3-5 seconds before new target
            }

            // Move towards patrol target
            if (toTargetDist > 0.5) {
              const moveSpeed = data.speed * 0.8;
              const dirX = toTargetX / toTargetDist;
              const dirZ = toTargetZ / toTargetDist;
              defender.position.x += dirX * moveSpeed;
              defender.position.z += dirZ * moveSpeed;
              defender.userData.targetRotation = Math.atan2(-dirZ, dirX);
            }
          }

          let rotDiff = data.targetRotation - defender.rotation.y;
          while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
          while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
          defender.rotation.y += rotDiff * 0.1;

          if (data.hpBar) {
            data.hpBar.scale.x = Math.max(0.01, data.health / data.maxHealth);
          }
        });

        // Tower AI
        buildingObjects.forEach(building => {
          if (building.userData.type !== 'tower') return;
          
          building.userData.attackCooldown = (building.userData.attackCooldown || 0) - dt;
          
          const range = 12 * (1 + getSkillEffect('towerRange') / 100);
          let nearestEnemy = null;
          let nearestDist = Infinity;
          
          enemies.forEach(enemy => {
            const dx = building.position.x - enemy.position.x;
            const dz = building.position.z - enemy.position.z;
            const d = Math.sqrt(dx*dx + dz*dz);
            if (d < nearestDist && d < range) {
              nearestDist = d;
              nearestEnemy = enemy;
            }
          });

          if (nearestEnemy && building.userData.attackCooldown <= 0) {
            building.userData.attackCooldown = 1.5;
            const proj = createProjectile(
              new THREE.Vector3(building.position.x, 3, building.position.z),
              nearestEnemy.position,
              'tower'
            );
            scene.add(proj);
            projectiles.push(proj);
            
            if (building.userData.crossbow) {
              building.userData.crossbow.lookAt(nearestEnemy.position);
            }
          }

          // Update HP bar
          if (building.userData.hpBar) {
            building.userData.hpBar.scale.x = Math.max(0.01, building.userData.health / building.userData.maxHealth);
          }
        });

        // Projectiles
        for (let i = projectiles.length - 1; i >= 0; i--) {
          const proj = projectiles[i];
          proj.position.add(proj.userData.velocity);
          proj.rotation.x += 0.15;

          let hit = false;
          enemies.forEach(enemy => {
            const dx = proj.position.x - enemy.position.x;
            const dz = proj.position.z - enemy.position.z;
            const dy = proj.position.y - (enemy.userData.flying ? 1.8 : 0.5);
            if (Math.sqrt(dx*dx + dy*dy + dz*dz) < 1.5) {
              hit = true;
              if (proj.userData.splash) {
                enemies.forEach(e => {
                  const ddx = proj.position.x - e.position.x;
                  const ddz = proj.position.z - e.position.z;
                  if (Math.sqrt(ddx*ddx + ddz*ddz) < proj.userData.splashRadius) {
                    e.userData.health -= proj.userData.damage;
                    effects.push(...createDamageNumber(e.position, Math.round(proj.userData.damage)));
                  }
                });
                effects.push(...createExplosion(proj.position));
              } else {
                enemy.userData.health -= proj.userData.damage;
                effects.push(...createDamageNumber(enemy.position, Math.round(proj.userData.damage)));
              }
            }
          });

          if (proj.position.length() > 50) hit = true;

          if (hit) {
            scene.remove(proj);
            projectiles.splice(i, 1);
          }
        }

        // Thrown bombs update (Held-Bomber wirft Bomben auf Feinde)
        for (let i = thrownBombs.length - 1; i >= 0; i--) {
          const bomb = thrownBombs[i];
          const data = bomb.userData;

          // Bewegung mit Parabel
          bomb.position.x += data.velocity.x;
          bomb.position.z += data.velocity.z;
          data.verticalVelocity -= data.gravity;
          bomb.position.y += data.verticalVelocity;

          // Rotation für visuellen Effekt
          bomb.rotation.x += 0.1;
          bomb.rotation.z += 0.05;

          // Zündschnur-Funken
          if (data.fuse) {
            data.fuse.material.color.setHSL(0.05 + Math.sin(time * 20) * 0.05, 1, 0.5);
            data.fuse.scale.setScalar(0.8 + Math.sin(time * 15) * 0.3);
          }

          // Prüfe ob Bombe am Boden angekommen ist
          if (bomb.position.y <= 0.1) {
            // EXPLOSION!
            effects.push(...createExplosion(bomb.position, 0xFF4500));
            effects.push(...createExplosion(bomb.position, 0xFFAA00));

            // Held-Bomber: Schaden an Feinden
            if (data.targetEnemies) {
              enemies.forEach(enemy => {
                const dx = bomb.position.x - enemy.position.x;
                const dz = bomb.position.z - enemy.position.z;
                const dist = Math.sqrt(dx * dx + dz * dz);
                if (dist < data.splashRadius) {
                  const damageFactor = 1 - (dist / data.splashRadius);
                  const damage = Math.floor(data.damage * damageFactor);
                  enemy.userData.health -= damage;
                  if (damage > 0) effects.push(...createDamageNumber(enemy.position, damage));
                }
              });
            }

            // Bombe entfernen
            scene.remove(bomb);
            thrownBombs.splice(i, 1);
          }

          // Bombe zu weit weg? Entfernen
          if (bomb.position.length() > 60 || bomb.position.y < -5) {
            scene.remove(bomb);
            thrownBombs.splice(i, 1);
          }
        }

        // Remove dead enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (enemies[i].userData.health <= 0) {
            const enemy = enemies[i];
            const wasBoss = enemy.userData.isBoss;
            const killPosition = enemy.position.clone();

            effects.push(...createExplosion(killPosition, wasBoss ? 0xFFD700 : 0xFF6B35));

            // Kill combo system
            gameState.combo++;
            gameState.comboTimer = 2;
            setCombo(gameState.combo);
            setComboTimer(2);

            const comboMultiplier = 1 + Math.min(gameState.combo, 10) * 0.1;
            const baseReward = wasBoss ? 50 : 5;
            const reward = Math.floor(baseReward * comboMultiplier);

            scene.remove(enemy);
            enemies.splice(i, 1);
            gameState.score += reward;
            setScore(gameState.score);

            // Combo visual at kill location
            if (gameState.combo >= 3) {
              effects.push(...createComboText(killPosition, gameState.combo));
            }

            if (wasBoss) {
              setMeta(prev => ({ ...prev, bossesKilled: prev.bossesKilled + 1 }));
              setMessage('👑 BOSS BESIEGT!');
              setTimeout(() => setMessage(''), 2000);
            }
          }
        }

        // Check wave complete
        if (enemies.length === 0 && enemiesToSpawn.length === 0 && gameState.nightActive) {
          gameState.nightActive = false;
          setTimeout(() => transitionToDay(), 2000);
          setMessage('☀️ Welle überstanden!');
        }
      }

      // Effects update
      for (let i = effects.length - 1; i >= 0; i--) {
        const e = effects[i];
        e.position.add(e.userData.velocity);
        e.userData.velocity.y -= 0.003;
        e.userData.life -= 0.025;
        e.material.opacity = e.userData.life;
        e.scale.setScalar(Math.max(0.01, e.userData.life));
        
        if (e.userData.life <= 0) {
          scene.remove(e);
          effects.splice(i, 1);
        }
      }

      // Building HP bars
      buildingObjects.forEach(b => {
        if (b.userData.hpBar) {
          const hp = b.userData.health / b.userData.maxHealth;
          b.userData.hpBar.scale.x = Math.max(0.01, hp);
          b.userData.hpBar.material.color.setHex(hp > 0.5 ? 0x00FF00 : (hp > 0.25 ? 0xFFFF00 : 0xFF0000));
        }
      });

      // Main burrow HP bar
      if (mainBurrow.userData.hpBar) {
        const hp = gameState.baseHealth / gameState.maxBaseHealth;
        mainBurrow.userData.hpBar.scale.x = Math.max(0.01, hp);
        mainBurrow.userData.hpBar.material.color.setHex(hp > 0.5 ? 0x00FF00 : (hp > 0.25 ? 0xFFFF00 : 0xFF0000));
      }
      if (mainBurrow.userData.flag) {
        mainBurrow.userData.flag.rotation.z = Math.sin(time * 3) * 0.1;
      }

      // Player breathing
      player.scale.y = 1.3 * (1 + Math.sin(time * 2.5) * 0.02);
      if (player.userData.crown) {
        player.userData.crown.rotation.y = time * 1.5;
      }

      // Camera with zoom
      const camTarget = gameState.phase === 'night'
        ? new THREE.Vector3(0, 0, 0)
        : player.position.clone();

      const baseY = 28 / zoomLevel;
      const baseZ = 28 / zoomLevel;

      camera.position.x += (camTarget.x - camera.position.x) * 0.03;
      camera.position.y += (baseY - camera.position.y) * 0.05;
      camera.position.z += (camTarget.z + baseZ - camera.position.z) * 0.03;
      camera.lookAt(camTarget.x * 0.5, 0, camTarget.z * 0.5);

      renderer.render(scene, camera);
    }

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (containerRef.current) {
        containerRef.current.removeEventListener('mousemove', handleMouseMove);
        containerRef.current.removeEventListener('mousedown', handleMouseDown);
        containerRef.current.removeEventListener('mouseup', handleMouseUp);
        containerRef.current.removeEventListener('touchstart', handleTouchStart);
        containerRef.current.removeEventListener('touchmove', handleTouchMove);
        containerRef.current.removeEventListener('touchend', handleTouchEnd);
        containerRef.current.removeEventListener('wheel', handleWheel);
      }
      // Clean up wall preview ghosts
      wallPreviewGhosts.forEach(ghost => scene.remove(ghost));
      wallPreviewGhosts = [];
      renderer.dispose();
    };
  }, [getSkillEffect, getBuildingCost]);

  // Save on unmount or game end
  useEffect(() => {
    if (gameOver || victory) {
      saveProgress();
    }
  }, [gameOver, victory, saveProgress]);

  // ============== SKILL TREE UI ==============
  const SkillTreePanel = () => {
    const tiers = [
      { name: 'Basis', skills: ['startCarrots', 'baseHealth', 'dayLength'] },
      { name: 'Sammler', skills: ['collectorSpeed', 'collectorCapacity', 'autoCollect'] },
      { name: 'Gebäude', skills: ['cheapBuildings', 'towerDamage', 'towerRange', 'wallHealth'] },
      { name: 'Helden', skills: ['heroSpawnRate', 'heroStats', 'startHero'] },
      { name: 'Spezial', skills: ['critChance', 'rageBonus', 'weatherMaster'] },
      { name: 'Ultimate', skills: ['goldenAge', 'fortress'] },
    ];

    return (
      <div className="absolute inset-0 bg-black/95 z-50 overflow-y-auto p-4">
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">🌳 Skill Tree</h2>
            <button
              className="bg-red-600 text-white px-4 py-2 rounded-lg"
              onClick={() => setShowSkillTree(false)}
            >✕</button>
          </div>
          
          <div className="bg-yellow-600 rounded-xl p-3 mb-4 text-center">
            <span className="text-white text-lg font-bold">⭐ {meta.skillPoints} Skillpunkte</span>
          </div>

          <div className="bg-gray-800 rounded-xl p-3 mb-4 grid grid-cols-3 gap-2 text-sm">
            <div className="text-center text-gray-300">
              <div className="text-lg">🎮</div>
              <div>{meta.totalGames} Spiele</div>
            </div>
            <div className="text-center text-gray-300">
              <div className="text-lg">🌊</div>
              <div>Beste: Welle {meta.bestWave}</div>
            </div>
            <div className="text-center text-gray-300">
              <div className="text-lg">👑</div>
              <div>{meta.bossesKilled} Bosse</div>
            </div>
          </div>

          {tiers.map((tier, ti) => (
            <div key={ti} className="mb-4">
              <h3 className="text-yellow-400 font-bold mb-2">{tier.name}</h3>
              <div className="grid gap-2">
                {tier.skills.map(skillId => {
                  const skill = skills[skillId];
                  const canUpgrade = skill.level < skill.max && meta.skillPoints >= skill.cost[skill.level];
                  const isMaxed = skill.level >= skill.max;
                  
                  return (
                    <div 
                      key={skillId}
                      className={`p-3 rounded-lg ${isMaxed ? 'bg-green-900' : 'bg-gray-700'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{skill.icon}</span>
                          <div>
                            <div className="text-white font-bold">{skill.name}</div>
                            <div className="text-gray-400 text-xs">
                              {skill.desc.replace('{}', skill.level > 0 ? skill.effect[skill.level - 1] : skill.effect[0])}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-white text-sm">{skill.level}/{skill.max}</div>
                          {!isMaxed && (
                            <button
                              className={`px-3 py-1 rounded text-sm font-bold ${
                                canUpgrade 
                                  ? 'bg-yellow-500 text-black' 
                                  : 'bg-gray-600 text-gray-400'
                              }`}
                              disabled={!canUpgrade}
                              onClick={() => upgradeSkill(skillId)}
                            >
                              {skill.cost[skill.level]} ⭐
                            </button>
                          )}
                          {isMaxed && (
                            <span className="text-green-400 text-sm">MAX</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          <button
            className="w-full bg-red-600 text-white py-3 rounded-xl font-bold mt-4"
            onClick={() => {
              if (confirm('Wirklich alle Skills zurücksetzen?')) {
                const totalSpent = Object.values(skills).reduce((sum, s) => {
                  let spent = 0;
                  for (let i = 0; i < s.level; i++) spent += s.cost[i];
                  return sum + spent;
                }, 0);
                setMeta(prev => ({ ...prev, skillPoints: prev.skillPoints + totalSpent }));
                setSkills(JSON.parse(JSON.stringify(DEFAULT_SKILLS)));
              }
            }}
          >
            🔄 Skills Zurücksetzen
          </button>
        </div>
      </div>
    );
  };

  // ============== MAIN MENU ==============
  if (phase === 'menu') {
    return (
      <div className="w-full h-screen bg-gradient-to-b from-green-800 to-green-950 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🐹</div>
        <h1 className="text-3xl font-bold text-white mb-2">Guinea Pig TD</h1>
        <p className="text-green-300 mb-6">Roguelike Tower Defense</p>
        
        <div className="bg-black/30 rounded-xl p-4 mb-6 text-center">
          <div className="text-yellow-400 text-xl font-bold">⭐ {meta.skillPoints} SP</div>
          <div className="text-gray-400 text-sm">Beste Welle: {meta.bestWave}</div>
        </div>

        <button
          className="bg-green-500 hover:bg-green-600 text-white text-xl font-bold px-12 py-4 rounded-2xl mb-4 w-full max-w-xs"
          onClick={startGame}
        >
          ▶️ Spielen
        </button>
        
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-8 py-3 rounded-xl w-full max-w-xs"
          onClick={() => setShowSkillTree(true)}
        >
          🌳 Skill Tree
        </button>

        {showSkillTree && <SkillTreePanel />}
      </div>
    );
  }

  // ============== GAME UI ==============
  const buildingCosts = {
    collectorHut: getBuildingCost('collectorHut'),
    heroHut: getBuildingCost('heroHut'),
    tower: getBuildingCost('tower'),
    wall: getBuildingCost('wall'),
  };

  return (
    <div className="w-full h-screen bg-gray-900 relative overflow-hidden touch-none select-none">
      <div ref={containerRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {phase === 'loading' && (
        <div className="absolute inset-0 bg-black flex items-center justify-center z-50">
          <div className="text-white text-xl">🐹 Laden...</div>
        </div>
      )}
      
      {/* HUD */}
      <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start pointer-events-none">
        {/* Left: Phase & Weather */}
        <div className="space-y-2">
          <div className={`bg-black/80 rounded-xl px-3 py-2 ${rageMode ? 'animate-pulse border-2 border-red-500' : ''}`}>
            <div className={`text-sm font-bold ${
              phase === 'day' ? 'text-yellow-400' : 'text-indigo-400'
            }`}>
              {phase === 'day' ? `☀️ TAG ${wave + 1}` : `🌙 WELLE ${wave + 1}`}
              {bossActive && ' 👑'}
            </div>
            {phase === 'day' && <div className="text-white text-xs">⏱️ {dayTimeLeft}s</div>}
          </div>
          
          <div className="bg-black/60 rounded-lg px-2 py-1 text-xs text-white">
            {weather === 'sunny' && '☀️ Sonnig'}
            {weather === 'rainy' && '🌧️ Regen (-20% Feind-Speed)'}
            {weather === 'windy' && '💨 Wind (+20% Speed)'}
          </div>

          {/* Wave Preview - shows upcoming enemies */}
          {phase === 'day' && wave < WAVES_CONFIG.length && (
            <div className="bg-black/70 rounded-lg px-2 py-1 text-xs">
              <div className="text-gray-400 mb-1">Nächste Welle:</div>
              <div className="flex gap-2 text-white">
                {WAVES_CONFIG[wave].foxes > 0 && (
                  <span title="Füchse">🦊 {WAVES_CONFIG[wave].foxes}</span>
                )}
                {WAVES_CONFIG[wave].ravens > 0 && (
                  <span title="Raben">🐦‍⬛ {WAVES_CONFIG[wave].ravens}</span>
                )}
                {WAVES_CONFIG[wave].snakes > 0 && (
                  <span title="Schlangen">🐍 {WAVES_CONFIG[wave].snakes}</span>
                )}
                {WAVES_CONFIG[wave].boss && (
                  <span className="text-yellow-400" title="Boss">👑</span>
                )}
              </div>
            </div>
          )}

          {combo > 2 && (
            <div className="bg-orange-500 rounded-lg px-3 py-1 animate-bounce">
              <span className="text-white font-bold">🔥 x{combo} COMBO!</span>
            </div>
          )}
        </div>

        {/* Right: Resources */}
        <div className="flex gap-2">
          <div className="bg-orange-600 rounded-xl px-3 py-2 text-center min-w-[70px]">
            <div className="text-white text-xl font-bold">{score}</div>
            <div className="text-orange-200 text-xs">🥕</div>
          </div>
          <div className={`rounded-xl px-3 py-2 text-center min-w-[70px] ${
            baseHealth > maxBaseHealth * 0.5 ? 'bg-green-600' : 
            baseHealth > maxBaseHealth * 0.25 ? 'bg-yellow-600' : 'bg-red-600'
          }`}>
            <div className="text-white text-lg font-bold">{Math.floor(baseHealth)}</div>
            <div className="text-white/80 text-xs">/{maxBaseHealth} ❤️</div>
          </div>
        </div>
      </div>

      {/* Build Menu - Day Phase */}
      {phase === 'day' && (
        <div className="absolute bottom-4 left-0 right-0 px-3 pointer-events-auto">
          <div className="bg-black/85 rounded-2xl p-3">
            <div className="text-white text-xs text-center mb-2">
              {buildMode === 'wall' ? '🧱 Ziehen zum Mauern bauen' :
               buildMode ? '👆 Klicken zum Platzieren | R = Drehen' : '🏗️ Bauen'}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[
                { type: 'collectorHut', icon: '🧺', label: 'Sammler', cost: buildingCosts.collectorHut,
                  desc: 'Spawnt Sammler die Karotten einsammeln', stats: '200 HP | Max 3 Sammler' },
                { type: 'heroHut', icon: '⚔️', label: 'Helden', cost: buildingCosts.heroHut,
                  desc: 'Spawnt zufällige Helden zur Verteidigung', stats: `200 HP | Spawn: ${Math.max(10, 20 - getSkillEffect('heroSpawnRate'))}s` },
                { type: 'tower', icon: '🗼', label: 'Turm', cost: buildingCosts.tower,
                  desc: 'Automatischer Fernkampf-Turm', stats: `200 HP | ${Math.round(25 * (1 + getSkillEffect('towerDamage') / 100))} DMG | ${Math.round(12 * (1 + getSkillEffect('towerRange') / 100))}m` },
                { type: 'wall', icon: '🧱', label: 'Mauer', cost: buildingCosts.wall,
                  desc: 'Blockiert Feinde', stats: `${100 + getSkillEffect('wallHealth')} HP | Ziehen für Linie` },
                { type: 'breed', icon: '💕', label: 'Züchten', cost: 15,
                  desc: 'Neuen Guinea Pig züchten', stats: 'Zufälliger Held' },
              ].map(({ type, icon, label, cost, desc, stats }) => (
                <div key={type} className="relative group">
                  <button
                    className={`w-full rounded-xl p-2 flex flex-col items-center transition-all ${
                      buildMode === type ? 'bg-green-600 ring-2 ring-white' :
                      score >= cost ? 'bg-gray-700 active:bg-gray-600' : 'bg-gray-800 opacity-50'
                    }`}
                    disabled={score < cost}
                    onClick={() => {
                      if (type === 'breed') {
                        window.gameBreed && window.gameBreed();
                      } else if (buildMode === type) {
                        window.gameCancelBuild && window.gameCancelBuild();
                      } else {
                        window.gameBuild && window.gameBuild(type);
                      }
                    }}
                  >
                    <span className="text-xl">{icon}</span>
                    <span className="text-white text-xs">{cost}🥕</span>
                  </button>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-40 bg-black/95 rounded-lg p-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                    <div className="text-yellow-400 font-bold mb-1">{label}</div>
                    <div className="text-gray-300 mb-1">{desc}</div>
                    <div className="text-green-400 text-[10px]">{stats}</div>
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full border-4 border-transparent border-t-black/95"></div>
                  </div>
                </div>
              ))}
            </div>
            {buildMode && (
              <div className="mt-2 flex gap-2">
                <button
                  className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-sm flex items-center justify-center gap-1"
                  onClick={() => window.gameRotateBuilding && window.gameRotateBuilding()}
                >
                  🔄 Drehen ({buildRotation}°)
                </button>
                <button
                  className="flex-1 bg-red-600 text-white py-2 rounded-xl text-sm"
                  onClick={() => window.gameCancelBuild && window.gameCancelBuild()}
                >
                  ✕ Abbrechen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Joystick hint */}
      {phase === 'day' && !buildMode && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center">
            <span className="text-white/30 text-xs">MOVE</span>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <div className="bg-black/90 rounded-2xl px-6 py-4 shadow-xl">
            <div className="text-white text-xl font-bold text-center">{message}</div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameOver && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 pointer-events-auto">
          <div className="bg-gradient-to-b from-red-900 to-red-950 rounded-3xl p-6 text-center max-w-sm w-full">
            <div className="text-5xl mb-3">💀</div>
            <div className="text-white text-2xl font-bold mb-2">GAME OVER</div>
            <div className="text-red-300 mb-4">Welle {wave + 1} erreicht</div>
            <div className="bg-black/30 rounded-xl p-3 mb-4">
              <div className="text-yellow-400">Verdiente Skillpunkte</div>
              <div className="text-white text-2xl font-bold">
                +{Math.floor(score / 10) + wave * 5} ⭐
              </div>
            </div>
            <button 
              className="bg-white text-black px-8 py-3 rounded-xl font-bold text-lg w-full mb-2"
              onClick={() => window.location.reload()}
            >
              🔄 Nochmal
            </button>
            <button 
              className="bg-purple-600 text-white px-8 py-2 rounded-xl font-bold w-full"
              onClick={() => { saveProgress(); setPhase('menu'); sceneRef.current = null; }}
            >
              🌳 Skill Tree
            </button>
          </div>
        </div>
      )}

      {/* Victory */}
      {victory && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-6 pointer-events-auto">
          <div className="bg-gradient-to-b from-yellow-600 to-amber-800 rounded-3xl p-6 text-center max-w-sm w-full">
            <div className="text-5xl mb-3">🏆</div>
            <div className="text-white text-2xl font-bold mb-2">SIEG!</div>
            <div className="text-yellow-100 mb-4">Alle {WAVES.length} Wellen überstanden!</div>
            <div className="bg-black/30 rounded-xl p-3 mb-4">
              <div className="text-yellow-300">Verdiente Skillpunkte</div>
              <div className="text-white text-2xl font-bold">
                +{Math.floor(score / 5) + wave * 10} ⭐
              </div>
            </div>
            <button 
              className="bg-white text-black px-8 py-3 rounded-xl font-bold text-lg w-full mb-2"
              onClick={() => window.location.reload()}
            >
              🔄 Nochmal
            </button>
            <button 
              className="bg-purple-600 text-white px-8 py-2 rounded-xl font-bold w-full"
              onClick={() => { saveProgress(); setPhase('menu'); sceneRef.current = null; }}
            >
              🌳 Skill Tree
            </button>
          </div>
        </div>
      )}

      {showSkillTree && <SkillTreePanel />}
    </div>
  );
}
