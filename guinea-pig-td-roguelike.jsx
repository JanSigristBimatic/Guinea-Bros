import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';

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
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 40, 100);

    const camera = new THREE.PerspectiveCamera(50, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 200);
    camera.position.set(0, 28, 35);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const sunLight = new THREE.DirectionalLight(0xFFFAE6, 1.5);
    sunLight.position.set(20, 30, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 120;
    sunLight.shadow.camera.left = -50;
    sunLight.shadow.camera.right = 50;
    sunLight.shadow.camera.top = 50;
    sunLight.shadow.camera.bottom = -50;
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x8EC8FF, 0.5);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x5C4033, 0.3);
    scene.add(hemiLight);

    const lights = { sun: sunLight, ambient: ambientLight, hemi: hemiLight };

    // ============== GROUND ==============
    const groundGeometry = new THREE.PlaneGeometry(120, 120);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x4CAF50, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'ground';
    scene.add(ground);

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

    // Fog planes for foggy weather
    const fogPlanes = [];
    for (let i = 0; i < 8; i++) {
      const fogGeo = new THREE.PlaneGeometry(20, 8);
      const fogMat = new THREE.MeshBasicMaterial({ color: 0xCCCCCC, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
      const fog = new THREE.Mesh(fogGeo, fogMat);
      fog.position.set((Math.random() - 0.5) * 40, 2, (Math.random() - 0.5) * 40);
      fog.rotation.y = Math.random() * Math.PI;
      fog.visible = false;
      scene.add(fog);
      fogPlanes.push(fog);
    }

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
    // Meerschweinchen-Häuschen: Kleine Holzhütten mit rundem Eingang, Rampe, Stroh-Dach
    function createGuineaPigHouse(type) {
      const group = new THREE.Group();
      group.userData = { 
        type, 
        spawnTimer: 0, 
        health: type === 'wall' ? (100 + getSkillEffect('wallHealth')) : 200,
        maxHealth: type === 'wall' ? (100 + getSkillEffect('wallHealth')) : 200,
      };

      const colors = {
        collectorHut: { wood: 0xDEB887, roof: 0x8FBC8F, accent: 0xF4A460 },
        heroHut: { wood: 0xCD853F, roof: 0x4169E1, accent: 0xFFD700 },
        tower: { wood: 0xA0522D, roof: 0x8B0000, accent: 0x2F4F4F },
        wall: { wood: 0x696969, roof: 0x696969, accent: 0x808080 },
      };
      const c = colors[type];

      if (type === 'wall') {
        // Simple wall segment
        const wallGeo = new THREE.BoxGeometry(2, 1.8, 0.6);
        const wallMat = new THREE.MeshStandardMaterial({ color: c.wood, roughness: 0.9 });
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
      } else {
        // Base/floor
        const baseGeo = new THREE.BoxGeometry(2.4, 0.3, 2.4);
        const baseMat = new THREE.MeshStandardMaterial({ color: c.wood, roughness: 0.8 });
        const base = new THREE.Mesh(baseGeo, baseMat);
        base.position.y = 0.15;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);

        // Walls (hollow box)
        const wallHeight = type === 'tower' ? 2.5 : 1.4;
        const wallThickness = 0.15;
        
        // Front wall with hole
        const frontGeo = new THREE.BoxGeometry(2.2, wallHeight, wallThickness);
        const wallMat = new THREE.MeshStandardMaterial({ color: c.wood, roughness: 0.7 });
        const front = new THREE.Mesh(frontGeo, wallMat);
        front.position.set(0, wallHeight/2 + 0.3, 1.05);
        front.castShadow = true;
        group.add(front);

        // Entrance hole (circular)
        const holeGeo = new THREE.CircleGeometry(0.45, 16);
        const holeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.position.set(0, 0.7, 1.06);
        group.add(hole);

        // Arch around hole
        const archGeo = new THREE.TorusGeometry(0.5, 0.08, 8, 16, Math.PI);
        const archMat = new THREE.MeshStandardMaterial({ color: c.accent });
        const arch = new THREE.Mesh(archGeo, archMat);
        arch.position.set(0, 0.7, 1.08);
        arch.rotation.z = Math.PI;
        group.add(arch);

        // Back wall
        const back = new THREE.Mesh(frontGeo, wallMat);
        back.position.set(0, wallHeight/2 + 0.3, -1.05);
        back.castShadow = true;
        group.add(back);

        // Side walls
        const sideGeo = new THREE.BoxGeometry(wallThickness, wallHeight, 2.2);
        [-1.05, 1.05].forEach(x => {
          const side = new THREE.Mesh(sideGeo, wallMat);
          side.position.set(x, wallHeight/2 + 0.3, 0);
          side.castShadow = true;
          group.add(side);
        });

        // Roof (cute A-frame with straw texture)
        if (type !== 'tower') {
          const roofGeo = new THREE.ConeGeometry(1.8, 1.2, 4);
          const roofMat = new THREE.MeshStandardMaterial({ color: c.roof, roughness: 0.9 });
          const roof = new THREE.Mesh(roofGeo, roofMat);
          roof.position.y = wallHeight + 0.8;
          roof.rotation.y = Math.PI / 4;
          roof.castShadow = true;
          group.add(roof);

          // Straw details
          for (let i = 0; i < 12; i++) {
            const strawGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.4, 4);
            const strawMat = new THREE.MeshStandardMaterial({ color: 0xF5DEB3 });
            const straw = new THREE.Mesh(strawGeo, strawMat);
            const angle = (i / 12) * Math.PI * 2;
            straw.position.set(Math.cos(angle) * 1.5, wallHeight + 0.5, Math.sin(angle) * 1.5);
            straw.rotation.x = Math.random() * 0.3;
            straw.rotation.z = Math.random() * 0.3;
            group.add(straw);
          }
        } else {
          // Tower has pointed roof with flag
          const towerRoofGeo = new THREE.ConeGeometry(1.5, 1.8, 8);
          const towerRoofMat = new THREE.MeshStandardMaterial({ color: c.roof });
          const towerRoof = new THREE.Mesh(towerRoofGeo, towerRoofMat);
          towerRoof.position.y = wallHeight + 1.1;
          towerRoof.castShadow = true;
          group.add(towerRoof);

          // Tower flag
          const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6);
          const pole = new THREE.Mesh(poleGeo, new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
          pole.position.y = wallHeight + 2.2;
          group.add(pole);

          const flagGeo = new THREE.PlaneGeometry(0.6, 0.4);
          const flagMat = new THREE.MeshStandardMaterial({ color: 0xFF0000, side: THREE.DoubleSide });
          const flag = new THREE.Mesh(flagGeo, flagMat);
          flag.position.set(0.35, wallHeight + 2.5, 0);
          group.add(flag);
          group.userData.flag = flag;

          // Crossbow on top
          const crossbowGeo = new THREE.BoxGeometry(0.8, 0.2, 0.2);
          const crossbow = new THREE.Mesh(crossbowGeo, new THREE.MeshStandardMaterial({ color: 0x4a3000 }));
          crossbow.position.y = wallHeight + 0.5;
          group.add(crossbow);
          group.userData.crossbow = crossbow;
        }

        // Little ramp
        const rampGeo = new THREE.BoxGeometry(0.6, 0.1, 0.8);
        const rampMat = new THREE.MeshStandardMaterial({ color: c.wood });
        const ramp = new THREE.Mesh(rampGeo, rampMat);
        ramp.position.set(0, 0.2, 1.5);
        ramp.rotation.x = 0.3;
        ramp.castShadow = true;
        group.add(ramp);

        // Type indicator
        const icons = { collectorHut: 0xFFA500, heroHut: 0x9932CC, tower: 0xFF4500 };
        if (icons[type]) {
          const indicatorGeo = new THREE.SphereGeometry(0.2, 8, 8);
          const indicatorMat = new THREE.MeshBasicMaterial({ color: icons[type] });
          const indicator = new THREE.Mesh(indicatorGeo, indicatorMat);
          indicator.position.y = (type === 'tower' ? 4.5 : 2.8);
          group.add(indicator);
          group.userData.indicator = indicator;
        }
      }

      // HP bar for all buildings
      const hpBgGeo = new THREE.PlaneGeometry(2, 0.2);
      const hpBg = new THREE.Mesh(hpBgGeo, new THREE.MeshBasicMaterial({ color: 0x333333 }));
      hpBg.position.y = type === 'wall' ? 2.5 : (type === 'tower' ? 5 : 3.2);
      hpBg.rotation.x = -0.3;
      group.add(hpBg);

      const hpBarGeo = new THREE.PlaneGeometry(1.9, 0.15);
      const hpBar = new THREE.Mesh(hpBarGeo, new THREE.MeshBasicMaterial({ color: 0x00FF00 }));
      hpBar.position.y = type === 'wall' ? 2.52 : (type === 'tower' ? 5.02 : 3.22);
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

      // Collector bag
      if (type === 'collector') {
        const bagGeo = new THREE.SphereGeometry(0.2, 8, 6);
        bagGeo.scale(1, 0.8, 0.6);
        const bag = new THREE.Mesh(bagGeo, new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
        bag.position.set(-0.4, 0.35, 0);
        group.add(bag);
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

    // ============== CARROTS ==============
    const carrots = [];
    
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

    // Player
    const player = createGuineaPig('player', true, 1.3);
    player.position.set(0, 0, 10);
    scene.add(player);

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
      const startHero = createGuineaPig(heroTypes[Math.floor(Math.random() * heroTypes.length)], false, 1.2);
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

    // Initial carrots
    for (let i = 0; i < 30; i++) spawnCarrot();

    // ============== WAVES ==============
    const WAVES = [
      { foxes: 5, ravens: 0, snakes: 0, delay: 1.8 },
      { foxes: 7, ravens: 3, snakes: 0, delay: 1.5 },
      { foxes: 8, ravens: 5, snakes: 2, delay: 1.3, boss: 'fox' }, // Boss wave
      { foxes: 12, ravens: 7, snakes: 4, delay: 1.1 },
      { foxes: 15, ravens: 10, snakes: 5, delay: 0.9 },
      { foxes: 18, ravens: 12, snakes: 8, delay: 0.8, boss: 'raven' }, // Boss wave
      { foxes: 22, ravens: 15, snakes: 10, delay: 0.7 },
      { foxes: 30, ravens: 20, snakes: 15, delay: 0.5, boss: 'both' }, // Final boss
    ];

    let enemiesToSpawn = [];
    let spawnTimer = 0;

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
    const WEATHERS = ['sunny', 'rainy', 'foggy', 'windy'];
    
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
      fogPlanes.forEach(f => f.visible = newWeather === 'foggy');
      
      if (newWeather === 'foggy') {
        scene.fog = new THREE.Fog(0xCCCCCC, 15, 40);
      } else if (newWeather === 'rainy') {
        scene.fog = new THREE.Fog(0x6688AA, 30, 70);
        lights.sun.intensity = 0.8;
      } else {
        scene.fog = gameState.phase === 'night' 
          ? new THREE.Fog(0x1a1a3a, 25, 60)
          : new THREE.Fog(0x87CEEB, 40, 100);
        lights.sun.intensity = gameState.phase === 'night' ? 0.25 : 1.5;
      }
    }

    // ============== TOUCH CONTROLS ==============
    const joystick = { active: false, startX: 0, startY: 0, moveX: 0, moveZ: 0 };
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let buildGhost = null;

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
          // Snap to grid
          const gridX = Math.round(pos.x / 2) * 2;
          const gridZ = Math.round(pos.z / 2) * 2;
          const dist = Math.sqrt(gridX*gridX + gridZ*gridZ);
          
          if (dist >= 6 && dist <= 14) {
            placeBuilding(gridX, gridZ);
          }
        }
        return;
      }

      joystick.active = true;
      joystick.startX = touch.clientX;
      joystick.startY = touch.clientY;
    }

    function handleTouchMove(e) {
      if (!joystick.active) return;
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - joystick.startX;
      const dy = touch.clientY - joystick.startY;
      const maxDist = 60;
      
      joystick.moveX = Math.max(-1, Math.min(1, dx / maxDist));
      joystick.moveZ = Math.max(-1, Math.min(1, dy / maxDist));
    }

    function handleTouchEnd() {
      joystick.active = false;
      joystick.moveX = 0;
      joystick.moveZ = 0;
    }

    containerRef.current.addEventListener('touchstart', handleTouchStart, { passive: false });
    containerRef.current.addEventListener('touchmove', handleTouchMove, { passive: false });
    containerRef.current.addEventListener('touchend', handleTouchEnd);

    // Keyboard
    const keys = { w: false, a: false, s: false, d: false };
    const handleKeyDown = (e) => { const k = e.key.toLowerCase(); if (k in keys) keys[k] = true; };
    const handleKeyUp = (e) => { const k = e.key.toLowerCase(); if (k in keys) keys[k] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ============== BUILDING FUNCTIONS ==============
    function placeBuilding(x, z) {
      const type = gameRef.current.buildMode;
      if (!type) return;
      
      const cost = getBuildingCost(type);
      if (gameState.score < cost) {
        setMessage('Nicht genug Karotten!');
        setTimeout(() => setMessage(''), 1500);
        return;
      }

      // Check if spot is free
      for (const b of buildingObjects) {
        const dx = b.position.x - x;
        const dz = b.position.z - z;
        if (Math.sqrt(dx*dx + dz*dz) < 2.5) {
          setMessage('Platz belegt!');
          setTimeout(() => setMessage(''), 1500);
          return;
        }
      }

      gameState.score -= cost;
      setScore(gameState.score);

      const building = createGuineaPigHouse(type);
      building.position.set(x, 0, z);
      scene.add(building);
      buildingObjects.push(building);
      setBuildings([...buildingObjects.map(b => ({ type: b.userData.type, x: b.position.x, z: b.position.z }))]);

      setMessage(`${type === 'collectorHut' ? 'Sammler-Hütte' : type === 'heroHut' ? 'Helden-Hütte' : type === 'tower' ? 'Wachturm' : 'Mauer'} gebaut!`);
      setTimeout(() => setMessage(''), 1500);

      // Spawn initial collector
      if (type === 'collectorHut') {
        spawnCollector(x, z);
      }
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
      const hero = createGuineaPig(heroType, false, 1.1);
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
      setBuildMode(type);
    };
    window.gameCancelBuild = () => {
      gameRef.current.buildMode = null;
      setBuildMode(null);
    };
    window.gameBreed = () => {
      if (gameState.score >= 15) {
        const nearest = findNearestPartner();
        if (nearest && nearest.dist < 3.5) {
          gameState.score -= 15;
          setScore(gameState.score);
          
          const heroType = heroTypes[Math.floor(Math.random() * heroTypes.length)];
          const hero = createGuineaPig(heroType, false, 1.1);
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
      
      scene.background = new THREE.Color(0x1a1a3a);
      lights.sun.intensity = 0.25;
      lights.sun.color.setHex(0x6666AA);
      lights.ambient.intensity = 0.15;
      
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
      
      scene.background = new THREE.Color(0x87CEEB);
      lights.sun.intensity = 1.5;
      lights.sun.color.setHex(0xFFFAE6);
      lights.ambient.intensity = 0.5;
      
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

      // Weather effects
      if (gameState.weather === 'rainy') {
        const positions = rain.geometry.attributes.position.array;
        for (let i = 0; i < positions.length; i += 3) {
          positions[i + 1] -= 0.5;
          if (positions[i + 1] < 0) positions[i + 1] = 30;
        }
        rain.geometry.attributes.position.needsUpdate = true;
      }

      if (gameState.weather === 'foggy') {
        fogPlanes.forEach((f, i) => {
          f.position.x += Math.sin(time + i) * 0.02;
          f.position.z += Math.cos(time + i) * 0.02;
          f.material.opacity = 0.2 + Math.sin(time * 0.5 + i) * 0.1;
        });
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

        // Player movement
        let baseSpeed = 0.06;
        if (gameState.speedBoostTimer > 0) baseSpeed *= 1.5;
        if (gameState.weather === 'windy') baseSpeed *= 1.2;
        
        let moveX = joystick.moveX;
        let moveZ = joystick.moveZ;
        if (keys.w) moveZ -= 1;
        if (keys.s) moveZ += 1;
        if (keys.a) moveX -= 1;
        if (keys.d) moveX += 1;

        const isMoving = Math.abs(moveX) > 0.1 || Math.abs(moveZ) > 0.1;
        
        if (isMoving) {
          const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
          if (len > 0) { moveX /= len; moveZ /= len; }
          
          const newX = player.position.x + moveX * baseSpeed;
          const newZ = player.position.z + moveZ * baseSpeed;
          
          // Simple bounds
          const dist = Math.sqrt(newX*newX + newZ*newZ);
          if (dist < 35 && dist > 5) {
            player.position.x = newX;
            player.position.z = newZ;
          }
          
          player.userData.targetRotation = Math.atan2(-moveZ, moveX);
          player.rotation.z = Math.sin(time * 8) * 0.08;
          player.position.y = Math.abs(Math.sin(time * 8)) * 0.04;
        } else {
          player.rotation.z *= 0.9;
          player.position.y *= 0.9;
        }

        let rotDiff = player.userData.targetRotation - player.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        player.rotation.y += rotDiff * 0.12;

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
          let targetBuilding = null;
          
          if (!data.confused) {
            // Check for buildings to attack
            let nearestBuildingDist = Infinity;
            buildingObjects.forEach(b => {
              if (b.userData.health <= 0) return;
              const dx = enemy.position.x - b.position.x;
              const dz = enemy.position.z - b.position.z;
              const d = Math.sqrt(dx*dx + dz*dz);
              if (d < nearestBuildingDist && (data.type === 'snake' || Math.random() < 0.3)) {
                nearestBuildingDist = d;
                targetBuilding = b;
              }
            });
            
            if (targetBuilding && nearestBuildingDist < 20) {
              targetX = targetBuilding.position.x;
              targetZ = targetBuilding.position.z;
              data.targetBuilding = targetBuilding;
            } else {
              data.targetBuilding = null;
            }
          } else {
            targetX = (Math.random() - 0.5) * 30;
            targetZ = (Math.random() - 0.5) * 30;
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
            enemy.rotation.y = Math.atan2(-dz, dx);
            
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
        
        defenders.forEach(defender => {
          if (!defender.userData.placed) return;
          const data = defender.userData;
          data.attackCooldown -= dt;
          data.abilityCooldown -= dt;

          let range = data.attackRange;
          if (gameState.weather === 'foggy') range *= 0.7;

          let nearestEnemy = null;
          let nearestDist = Infinity;
          enemies.forEach(enemy => {
            const dx = defender.position.x - enemy.position.x;
            const dz = defender.position.z - enemy.position.z;
            const d = Math.sqrt(dx * dx + dz * dz);
            if (d < nearestDist && d < range) {
              nearestDist = d;
              nearestEnemy = enemy;
            }
          });

          if (nearestEnemy) {
            const dx = nearestEnemy.position.x - defender.position.x;
            const dz = nearestEnemy.position.z - defender.position.z;
            defender.userData.targetRotation = Math.atan2(-dz, dx);

            if (data.attackCooldown <= 0) {
              data.attackCooldown = data.type === 'bomber' ? 2 : (data.type === 'assassin' ? 0.8 : 1.2);
              
              let damage = data.attackDamage * rageBonus;
              if (Math.random() < critChance) {
                damage *= 2;
                effects.push(...createExplosion(nearestEnemy.position, 0xFFFF00));
              }

              if (data.type === 'bomber') {
                const proj = createProjectile(defender.position, nearestEnemy.position, 'carrot');
                scene.add(proj);
                projectiles.push(proj);
              } else {
                nearestEnemy.userData.health -= damage;
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
                const dx = defender.position.x - other.position.x;
                const dz = defender.position.z - other.position.z;
                if (Math.sqrt(dx*dx + dz*dz) < 6) {
                  other.userData.health = Math.min(other.userData.maxHealth, other.userData.health + 20);
                }
              });
              effects.push(...createHealEffect(defender.position));
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
                  }
                });
                effects.push(...createExplosion(proj.position));
              } else {
                enemy.userData.health -= proj.userData.damage;
              }
            }
          });

          if (proj.position.length() > 50) hit = true;

          if (hit) {
            scene.remove(proj);
            projectiles.splice(i, 1);
          }
        }

        // Remove dead enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
          if (enemies[i].userData.health <= 0) {
            const wasBoss = enemies[i].userData.isBoss;
            effects.push(...createExplosion(enemies[i].position, wasBoss ? 0xFFD700 : 0xFF6B35));
            scene.remove(enemies[i]);
            enemies.splice(i, 1);
            gameState.score += wasBoss ? 50 : 5;
            setScore(gameState.score);
            
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

      // Camera
      const camTarget = gameState.phase === 'night' 
        ? new THREE.Vector3(0, 0, 0)
        : player.position.clone();
      
      camera.position.x += (camTarget.x - camera.position.x) * 0.03;
      camera.position.z += (camTarget.z + 28 - camera.position.z) * 0.03;
      camera.lookAt(camTarget.x * 0.5, 0, camTarget.z * 0.5);

      renderer.render(scene, camera);
    }

    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
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

  if (phase === 'loading') {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">🐹 Laden...</div>
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
            {weather === 'foggy' && '🌫️ Nebel (-30% Reichweite)'}
            {weather === 'windy' && '💨 Wind (+20% Speed)'}
          </div>

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
              {buildMode ? '👆 Tippe zum Platzieren' : '🏗️ Bauen'}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {[
                { type: 'collectorHut', icon: '🧺', label: 'Sammler', cost: buildingCosts.collectorHut },
                { type: 'heroHut', icon: '⚔️', label: 'Helden', cost: buildingCosts.heroHut },
                { type: 'tower', icon: '🗼', label: 'Turm', cost: buildingCosts.tower },
                { type: 'wall', icon: '🧱', label: 'Mauer', cost: buildingCosts.wall },
                { type: 'breed', icon: '💕', label: 'Züchten', cost: 15 },
              ].map(({ type, icon, label, cost }) => (
                <button
                  key={type}
                  className={`rounded-xl p-2 flex flex-col items-center transition-all ${
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
              ))}
            </div>
            {buildMode && (
              <button
                className="mt-2 w-full bg-red-600 text-white py-2 rounded-xl text-sm"
                onClick={() => window.gameCancelBuild && window.gameCancelBuild()}
              >
                ✕ Abbrechen
              </button>
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
