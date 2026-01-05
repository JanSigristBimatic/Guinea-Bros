import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// GLOBAL: Store active scene to avoid React StrictMode issues
let globalActiveScene = null;
let globalActiveCamera = null;
let globalActiveControls = null;

// Available GLB models categorized
const MODEL_CATEGORIES = {
  'Helden': [
    { name: 'Maincharacter', path: '/glb/Maincharacter/Maincharacter.glb' },
    { name: 'Healer', path: '/glb/Healer/Healer.glb' },
    { name: 'Tank', path: '/glb/Healer/Tank.glb' },
    { name: 'Turret', path: '/glb/Healer/Turet.glb' },
    { name: 'Bomber', path: '/glb/Bomber/Bomber.glb' },
    { name: 'Sammler', path: '/glb/Sammler.glb' },
  ],
  'Gebäude': [
    { name: 'House', path: '/glb/Buildings/House.glb' },
    { name: 'Tower', path: '/glb/Buildings/Tower.glb' },
    { name: 'Fort', path: '/glb/Buildings/Fort.glb' },
  ],
  'Items': [
    { name: 'Bombe', path: '/glb/Bomber/Bombe.glb' },
    { name: 'Karotte', path: '/glb/vegetables/Karotte.glb' },
  ],
};

// Reference cube sizes
const REFERENCE_SIZES = [
  { label: '0.5', size: 0.5 },
  { label: '1', size: 1 },
  { label: '2', size: 2 },
  { label: '5', size: 5 },
];

export default function GLBConfigurator() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const currentModelRef = useRef(null);
  const referenceCubeRef = useRef(null);
  const animationFrameRef = useRef(null);
  const modelContainerRef = useRef(null);

  // Model state
  const [selectedCategory, setSelectedCategory] = useState('Helden');
  const [selectedModel, setSelectedModel] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Transform state
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 });

  // Model info
  const [modelInfo, setModelInfo] = useState(null);

  // Reference cube
  const [showReferenceCube, setShowReferenceCube] = useState(true);
  const [referenceSize, setReferenceSize] = useState(1);

  // Debug info
  const [debugInfo, setDebugInfo] = useState(null);

  // Configuration history
  const [configs, setConfigs] = useState(() => {
    try {
      const saved = localStorage.getItem('glbConfigs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Zoom to fit model
  const zoomToFit = useCallback(() => {
    if (!modelContainerRef.current || !globalActiveCamera || !globalActiveControls) {
      console.log('No model to zoom to');
      return;
    }

    const container = modelContainerRef.current;

    // Get current world bounding box (after scale/position/rotation)
    const box = new THREE.Box3().setFromObject(container);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);

    // Handle edge cases
    if (maxDim === 0 || !isFinite(maxDim)) {
      console.warn('Invalid model dimensions');
      return;
    }

    // Calculate ideal camera distance - closer for small objects
    const fov = globalActiveCamera.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 0.8;

    // Minimum distance for very small objects
    cameraDistance = Math.max(cameraDistance, maxDim * 3);

    // Update camera - use GLOBAL references
    const camera = globalActiveCamera;
    const controls = globalActiveControls;

    // Position camera at 45 degree angle
    const angle = Math.PI / 4;
    camera.position.set(
      center.x + cameraDistance * Math.cos(angle),
      center.y + cameraDistance * 0.6,
      center.z + cameraDistance * Math.sin(angle)
    );

    // Update near/far planes based on model size
    camera.near = Math.max(0.0001, maxDim * 0.001);
    camera.far = Math.max(1000, maxDim * 1000);
    camera.updateProjectionMatrix();

    // Look at center
    controls.target.set(center.x, center.y, center.z);
    camera.lookAt(center.x, center.y, center.z);
    controls.update();

    // Update debug info
    setDebugInfo({
      worldSize: `${size.x.toFixed(4)} x ${size.y.toFixed(4)} x ${size.z.toFixed(4)}`,
      center: `(${center.x.toFixed(2)}, ${center.y.toFixed(2)}, ${center.z.toFixed(2)})`,
      cameraDistance: cameraDistance.toFixed(2),
      maxDim: maxDim.toFixed(4),
      cameraPos: `(${camera.position.x.toFixed(2)}, ${camera.position.y.toFixed(2)}, ${camera.position.z.toFixed(2)})`
    });

    console.log('Zoomed to fit:', {
      size,
      center,
      cameraDistance,
      cameraPosition: camera.position
    });
  }, []);

  // Create/update reference cube
  const updateReferenceCube = useCallback((scene, size, visible) => {
    if (referenceCubeRef.current) {
      scene.remove(referenceCubeRef.current);
      referenceCubeRef.current = null;
    }

    if (!visible) return;

    const group = new THREE.Group();
    group.name = 'referenceCube';

    // Wireframe cube
    const cubeGeo = new THREE.BoxGeometry(size, size, size);
    const wireframe = new THREE.LineSegments(
      new THREE.EdgesGeometry(cubeGeo),
      new THREE.LineBasicMaterial({ color: 0x00ff00, linewidth: 2 })
    );
    wireframe.position.y = size / 2;
    group.add(wireframe);

    // Semi-transparent faces
    const cubeMat = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.15,
      side: THREE.DoubleSide
    });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.position.y = size / 2;
    group.add(cube);

    // Size label
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${size}m³`, 128, 45);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(size * 1.2, size * 0.3, 1);
    sprite.position.y = size + 0.3;
    group.add(sprite);

    group.position.x = -size * 2;

    scene.add(group);
    referenceCubeRef.current = group;
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;
    globalActiveScene = scene; // GLOBAL reference

    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.001,
      10000
    );
    camera.position.set(5, 3, 5);
    cameraRef.current = camera;
    globalActiveCamera = camera; // GLOBAL reference

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.001;
    controls.maxDistance = 10000;
    controlsRef.current = controls;
    globalActiveControls = controls; // GLOBAL reference

    // Lighting - brighter
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.6);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const backLight = new THREE.DirectionalLight(0xffffcc, 0.4);
    backLight.position.set(0, 5, -10);
    scene.add(backLight);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x666688, 0x444466);
    scene.add(gridHelper);

    // Axes helper
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(20, 20);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a4a,
      roughness: 0.8,
      transparent: true,
      opacity: 0.5
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    scene.add(ground);

    // Initial reference cube
    updateReferenceCube(scene, 1, true);

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      if (globalActiveControls) globalActiveControls.update();
      if (globalActiveScene && globalActiveCamera) {
        renderer.render(globalActiveScene, globalActiveCamera);
      }
    };
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
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Remove renderer canvas from DOM
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
      // Clear ALL refs so next mount reinitializes properly (StrictMode fix)
      sceneRef.current = null;
      rendererRef.current = null;
      cameraRef.current = null;
      controlsRef.current = null;
      referenceCubeRef.current = null;
      globalActiveScene = null;
      globalActiveCamera = null;
      globalActiveControls = null;
    };
  }, [updateReferenceCube]);

  // Update reference cube when settings change
  useEffect(() => {
    if (sceneRef.current) {
      updateReferenceCube(sceneRef.current, referenceSize, showReferenceCube);
    }
  }, [showReferenceCube, referenceSize, updateReferenceCube]);

  // Load model
  const loadModel = useCallback((modelPath, modelName) => {
    // Use GLOBAL scene reference to avoid React StrictMode issues
    if (!globalActiveScene) {
      console.error('No active scene!');
      return;
    }

    setLoading(true);
    setError(null);
    setDebugInfo(null);

    // Remove current model from GLOBAL scene
    if (modelContainerRef.current) {
      globalActiveScene.remove(modelContainerRef.current);
      modelContainerRef.current = null;
      currentModelRef.current = null;
    }

    console.log('Loading model:', modelPath);

    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        console.log('Model loaded successfully:', gltf);
        const model = gltf.scene;

        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        console.log('Original model size:', size);
        console.log('Original model center:', center);

        // Create container
        const container = new THREE.Group();
        container.name = 'modelContainer';

        // Center model at origin
        model.position.set(-center.x, -center.y + size.y / 2, -center.z);

        // Count meshes and enable shadows
        let meshCount = 0;
        model.traverse((child) => {
          if (child.isMesh) {
            meshCount++;
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = false;
          }
        });

        container.add(model);

        // Add bounding box helper for debugging
        const boxHelper = new THREE.BoxHelper(model, 0xff0000);
        boxHelper.name = 'boundingBoxHelper';
        container.add(boxHelper);

        // Add a small sphere at the center for reference
        const centerSphere = new THREE.Mesh(
          new THREE.SphereGeometry(0.05, 16, 16),
          new THREE.MeshBasicMaterial({ color: 0xffff00 })
        );
        centerSphere.position.set(0, size.y / 2, 0);
        centerSphere.name = 'centerMarker';
        container.add(centerSphere);

        // Add to scene
        globalActiveScene.add(container);

        modelContainerRef.current = container;
        currentModelRef.current = model;

        // Store original size
        container.userData.originalSize = size.clone();

        // Load saved config or reset
        const savedConfig = configs[modelName];
        if (savedConfig) {
          setScale(savedConfig.scale || 1);
          setPosition(savedConfig.position || { x: 0, y: 0, z: 0 });
          setRotation(savedConfig.rotation || { x: 0, y: 0, z: 0 });
        } else {
          setScale(1);
          setPosition({ x: 0, y: 0, z: 0 });
          setRotation({ x: 0, y: 0, z: 0 });
        }

        // Ground offset = how much to add to Y to place bottom at y=0
        // If box.min.y is -0.5, groundOffset is 0.5
        const groundOffset = -box.min.y;

        setModelInfo({
          name: modelName,
          originalSize: {
            x: size.x.toFixed(4),
            y: size.y.toFixed(4),
            z: size.z.toFixed(4)
          },
          boundingBox: {
            min: { x: box.min.x.toFixed(4), y: box.min.y.toFixed(4), z: box.min.z.toFixed(4) },
            max: { x: box.max.x.toFixed(4), y: box.max.y.toFixed(4), z: box.max.z.toFixed(4) }
          },
          groundOffset: groundOffset.toFixed(4),
          centerY: center.y.toFixed(4),
          meshCount: meshCount,
          animations: gltf.animations.length
        });

        setLoading(false);
        setSelectedModel(modelName);

        // Auto zoom to fit after a short delay (to allow state to update)
        setTimeout(() => {
          zoomToFit();
        }, 100);
      },
      (progress) => {
        if (progress.total > 0) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          console.log(`Loading: ${percent}%`);
        }
      },
      (err) => {
        console.error('GLB Load Error:', err);
        setError(`Fehler beim Laden: ${err.message || 'Unbekannter Fehler'}`);
        setLoading(false);
      }
    );
  }, [configs, zoomToFit]);

  // Update model transforms
  useEffect(() => {
    if (!modelContainerRef.current) return;

    const container = modelContainerRef.current;
    container.scale.setScalar(scale);
    container.position.set(position.x, position.y, position.z);
    container.rotation.set(
      rotation.x * Math.PI / 180,
      rotation.y * Math.PI / 180,
      rotation.z * Math.PI / 180
    );
  }, [scale, position, rotation]);

  // Save configuration
  const saveConfig = useCallback(() => {
    if (!selectedModel) return;

    const newConfigs = {
      ...configs,
      [selectedModel]: { scale, position, rotation }
    };
    setConfigs(newConfigs);
    localStorage.setItem('glbConfigs', JSON.stringify(newConfigs));
  }, [selectedModel, scale, position, rotation, configs]);

  // Export all configurations
  const exportConfigs = useCallback(() => {
    const dataStr = JSON.stringify(configs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'glb-configs.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [configs]);

  // Generate code snippet
  const generateCode = useCallback(() => {
    if (!selectedModel || !modelInfo) return '';

    const groundY = parseFloat(modelInfo.groundOffset) * scale;

    return `// ${selectedModel} configuration
// Original: ${modelInfo.originalSize.x} x ${modelInfo.originalSize.y} x ${modelInfo.originalSize.z}
// Ground Offset (raw): ${modelInfo.groundOffset}

const ${selectedModel.toLowerCase().replace(/[^a-z0-9]/g, '')}Config = {
  scale: ${scale},
  groundOffset: ${groundY.toFixed(4)}, // scaled
  rotation: ${rotation.y} // Y-Rotation in degrees
};

// Korrekte Positionierung (Boden bei Y=0):
model.scale.setScalar(${scale});
model.position.y = ${groundY.toFixed(4)}; // Ground offset * scale
model.rotation.y = ${(rotation.y * Math.PI / 180).toFixed(4)}; // ${rotation.y}°

// Oder mit Helper-Funktion:
// positionModelOnGround(model, ${scale});`;
  }, [selectedModel, modelInfo, scale, position, rotation]);

  // Reset transforms
  const resetTransforms = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0, z: 0 });
    setRotation({ x: 0, y: 0, z: 0 });
  }, []);

  // Reset camera to default
  const resetCamera = useCallback(() => {
    if (!globalActiveCamera || !globalActiveControls) return;
    globalActiveCamera.position.set(5, 3, 5);
    globalActiveControls.target.set(0, 1, 0);
    globalActiveControls.update();
  }, []);

  return (
    <div style={styles.container}>
      {/* Left Panel */}
      <div style={styles.leftPanel}>
        <h2 style={styles.title}>GLB Konfigurator</h2>

        {/* Category Tabs */}
        <div style={styles.tabs}>
          {Object.keys(MODEL_CATEGORIES).map(cat => (
            <button
              key={cat}
              style={{
                ...styles.tab,
                ...(selectedCategory === cat ? styles.tabActive : {})
              }}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Model List */}
        <div style={styles.modelList}>
          {MODEL_CATEGORIES[selectedCategory].map(model => (
            <button
              key={model.name}
              style={{
                ...styles.modelButton,
                ...(selectedModel === model.name ? styles.modelButtonActive : {})
              }}
              onClick={() => loadModel(model.path, model.name)}
            >
              {model.name}
              {configs[model.name] && <span style={styles.savedBadge}>saved</span>}
            </button>
          ))}
        </div>

        {/* Reference Cube Controls */}
        <div style={styles.referenceBox}>
          <h4 style={styles.infoTitle}>Referenzwürfel</h4>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={showReferenceCube}
              onChange={(e) => setShowReferenceCube(e.target.checked)}
              style={styles.checkbox}
            />
            Anzeigen
          </label>
          <div style={styles.referenceSizes}>
            {REFERENCE_SIZES.map(ref => (
              <button
                key={ref.size}
                style={{
                  ...styles.refSizeButton,
                  ...(referenceSize === ref.size ? styles.refSizeButtonActive : {})
                }}
                onClick={() => setReferenceSize(ref.size)}
              >
                {ref.label}m
              </button>
            ))}
          </div>
        </div>

        {/* Model Info */}
        {modelInfo && (
          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>Modell Info</h4>
            <p><strong>{modelInfo.name}</strong></p>
            <p>Original Grösse:</p>
            <ul style={styles.infoList}>
              <li>X: {modelInfo.originalSize.x}</li>
              <li>Y: {modelInfo.originalSize.y}</li>
              <li>Z: {modelInfo.originalSize.z}</li>
            </ul>
            <p>Meshes: {modelInfo.meshCount}</p>
            <p>Animationen: {modelInfo.animations}</p>
          </div>
        )}

        {/* Ground Offset Info - wichtig für Game */}
        {modelInfo && (
          <div style={styles.groundOffsetBox}>
            <h4 style={styles.groundOffsetTitle}>Boden-Positionierung</h4>
            <p style={styles.groundOffsetValue}>
              Ground Offset: <strong>{modelInfo.groundOffset}</strong>
            </p>
            <p style={styles.groundOffsetScaled}>
              Mit Scale {scale}: <strong>{(parseFloat(modelInfo.groundOffset) * scale).toFixed(4)}</strong>
            </p>
            <p style={styles.groundOffsetHint}>
              = model.position.y für Boden bei Y=0
            </p>
            <div style={styles.boundingBoxInfo}>
              <p>BoundingBox Y:</p>
              <ul style={styles.infoList}>
                <li>Min: {modelInfo.boundingBox.min.y}</li>
                <li>Max: {modelInfo.boundingBox.max.y}</li>
              </ul>
            </div>
          </div>
        )}

        {/* Debug Info */}
        {debugInfo && (
          <div style={styles.debugBox}>
            <h4 style={styles.debugTitle}>Debug</h4>
            <p>Aktuelle Grösse: {debugInfo.worldSize}</p>
            <p>Center: {debugInfo.center}</p>
            <p>Max Dimension: {debugInfo.maxDim}</p>
            <p>Kamera Distanz: {debugInfo.cameraDistance}</p>
          </div>
        )}
      </div>

      {/* Center - 3D Viewport */}
      <div style={styles.viewport}>
        <div ref={containerRef} style={styles.canvas}>
          {!selectedModel && !loading && (
            <div style={styles.hintOverlay}>
              <p style={styles.hintText}>Wähle ein Modell aus der Liste</p>
              <p style={styles.hintSubtext}>Der grüne Würfel = Grössenreferenz</p>
            </div>
          )}
          {loading && (
            <div style={styles.loadingOverlay}>
              <div style={styles.spinner}></div>
              <p>Lade Modell...</p>
            </div>
          )}
          {error && (
            <div style={styles.errorOverlay}>
              <p>{error}</p>
            </div>
          )}
        </div>
        {/* Viewport Controls */}
        <div style={styles.viewportControls}>
          <button onClick={zoomToFit} style={styles.viewportButton}>
            Zoom auf Modell
          </button>
          <button onClick={resetCamera} style={styles.viewportButton}>
            Kamera Reset
          </button>
        </div>
      </div>

      {/* Right Panel - Controls */}
      <div style={styles.rightPanel}>
        <h3 style={styles.controlTitle}>Transformationen</h3>

        {/* Scale */}
        <div style={styles.controlGroup}>
          <label style={styles.label}>Skalierung: {scale.toFixed(4)}</label>
          <input
            type="range"
            min="0.0001"
            max="100"
            step="0.0001"
            value={Math.log10(scale + 0.0001) + 4}
            onChange={(e) => setScale(Math.pow(10, parseFloat(e.target.value) - 4) - 0.0001)}
            style={styles.slider}
          />
          <input
            type="number"
            value={scale}
            onChange={(e) => setScale(Math.max(0.0001, parseFloat(e.target.value) || 0.0001))}
            style={styles.numberInput}
            step="0.01"
            min="0.0001"
          />
          <button onClick={() => zoomToFit()} style={styles.zoomAfterScaleBtn}>
            Zoom
          </button>
        </div>

        {/* Position */}
        <div style={styles.controlGroup}>
          <label style={styles.label}>Position</label>
          {['x', 'y', 'z'].map(axis => (
            <div key={axis} style={styles.axisRow}>
              <span style={{...styles.axisLabel, color: axis === 'x' ? '#ff6666' : axis === 'y' ? '#66ff66' : '#6666ff'}}>
                {axis.toUpperCase()}
              </span>
              <input
                type="range"
                min="-20"
                max="20"
                step="0.01"
                value={position[axis]}
                onChange={(e) => setPosition(p => ({ ...p, [axis]: parseFloat(e.target.value) }))}
                style={styles.slider}
              />
              <input
                type="number"
                value={position[axis]}
                onChange={(e) => setPosition(p => ({ ...p, [axis]: parseFloat(e.target.value) || 0 }))}
                style={styles.numberInput}
                step="0.1"
              />
            </div>
          ))}
        </div>

        {/* Rotation */}
        <div style={styles.controlGroup}>
          <label style={styles.label}>Rotation (Grad)</label>
          {['x', 'y', 'z'].map(axis => (
            <div key={axis} style={styles.axisRow}>
              <span style={{...styles.axisLabel, color: axis === 'x' ? '#ff6666' : axis === 'y' ? '#66ff66' : '#6666ff'}}>
                {axis.toUpperCase()}
              </span>
              <input
                type="range"
                min="-180"
                max="180"
                step="1"
                value={rotation[axis]}
                onChange={(e) => setRotation(r => ({ ...r, [axis]: parseFloat(e.target.value) }))}
                style={styles.slider}
              />
              <input
                type="number"
                value={rotation[axis]}
                onChange={(e) => setRotation(r => ({ ...r, [axis]: parseFloat(e.target.value) || 0 }))}
                style={styles.numberInput}
                step="1"
              />
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={styles.buttonGroup}>
          <button onClick={resetTransforms} style={styles.resetButton}>
            Reset
          </button>
          <button onClick={saveConfig} style={styles.saveButton} disabled={!selectedModel}>
            Speichern
          </button>
        </div>

        <button onClick={exportConfigs} style={styles.exportButton}>
          Alle Configs Exportieren
        </button>

        {/* Code Preview */}
        {selectedModel && (
          <div style={styles.codeBox}>
            <h4 style={styles.codeTitle}>Code Snippet</h4>
            <pre style={styles.code}>{generateCode()}</pre>
            <button
              onClick={() => navigator.clipboard.writeText(generateCode())}
              style={styles.copyButton}
            >
              Kopieren
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    backgroundColor: '#0f0f1a',
    color: '#fff',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  leftPanel: {
    width: '280px',
    backgroundColor: '#1a1a2e',
    padding: '15px',
    borderRight: '1px solid #333',
    overflowY: 'auto',
  },
  title: {
    margin: '0 0 15px 0',
    fontSize: '22px',
    color: '#4ecdc4',
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    marginBottom: '12px',
  },
  tab: {
    flex: 1,
    padding: '6px',
    backgroundColor: '#252540',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '11px',
  },
  tabActive: {
    backgroundColor: '#4ecdc4',
    color: '#000',
  },
  modelList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '15px',
  },
  modelButton: {
    padding: '10px',
    backgroundColor: '#252540',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '6px',
    textAlign: 'left',
    transition: 'all 0.2s',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '13px',
  },
  modelButtonActive: {
    backgroundColor: '#4ecdc4',
    color: '#000',
  },
  savedBadge: {
    fontSize: '9px',
    backgroundColor: '#2ecc71',
    padding: '2px 5px',
    borderRadius: '3px',
    color: '#fff',
  },
  referenceBox: {
    padding: '12px',
    backgroundColor: '#252540',
    borderRadius: '6px',
    marginBottom: '12px',
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    fontSize: '13px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#4ecdc4',
  },
  referenceSizes: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr 1fr',
    gap: '4px',
  },
  refSizeButton: {
    padding: '5px',
    backgroundColor: '#1a1a2e',
    border: '1px solid #333',
    color: '#888',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '10px',
  },
  refSizeButtonActive: {
    backgroundColor: '#00ff00',
    color: '#000',
    borderColor: '#00ff00',
  },
  infoBox: {
    padding: '12px',
    backgroundColor: '#252540',
    borderRadius: '6px',
    fontSize: '12px',
    marginBottom: '12px',
  },
  infoTitle: {
    margin: '0 0 8px 0',
    color: '#4ecdc4',
    fontSize: '13px',
  },
  infoList: {
    margin: '4px 0',
    paddingLeft: '18px',
    fontSize: '11px',
  },
  groundOffsetBox: {
    padding: '12px',
    backgroundColor: '#254025',
    borderRadius: '6px',
    fontSize: '12px',
    marginBottom: '12px',
    border: '1px solid #4ecdc4',
  },
  groundOffsetTitle: {
    margin: '0 0 8px 0',
    color: '#4ecdc4',
    fontSize: '13px',
  },
  groundOffsetValue: {
    margin: '4px 0',
    fontSize: '14px',
  },
  groundOffsetScaled: {
    margin: '4px 0',
    fontSize: '13px',
    color: '#88ff88',
  },
  groundOffsetHint: {
    margin: '4px 0',
    fontSize: '10px',
    color: '#888',
    fontStyle: 'italic',
  },
  boundingBoxInfo: {
    marginTop: '8px',
    paddingTop: '8px',
    borderTop: '1px solid #444',
    fontSize: '11px',
  },
  debugBox: {
    padding: '12px',
    backgroundColor: '#3a2540',
    borderRadius: '6px',
    fontSize: '11px',
    border: '1px solid #ff6600',
  },
  debugTitle: {
    margin: '0 0 8px 0',
    color: '#ff6600',
    fontSize: '12px',
  },
  viewport: {
    flex: 1,
    position: 'relative',
  },
  canvas: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  hintOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  hintText: {
    fontSize: '18px',
    color: '#666',
    marginBottom: '8px',
  },
  hintSubtext: {
    fontSize: '13px',
    color: '#444',
  },
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    color: '#4ecdc4',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #333',
    borderTop: '4px solid #4ecdc4',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 10px',
  },
  errorOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#e74c3c',
    backgroundColor: 'rgba(0,0,0,0.9)',
    padding: '20px',
    borderRadius: '8px',
  },
  viewportControls: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    display: 'flex',
    gap: '10px',
  },
  viewportButton: {
    padding: '10px 15px',
    backgroundColor: '#4ecdc4',
    border: 'none',
    color: '#000',
    cursor: 'pointer',
    borderRadius: '5px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  rightPanel: {
    width: '300px',
    backgroundColor: '#1a1a2e',
    padding: '15px',
    borderLeft: '1px solid #333',
    overflowY: 'auto',
  },
  controlTitle: {
    margin: '0 0 15px 0',
    color: '#4ecdc4',
    fontSize: '16px',
  },
  controlGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    color: '#888',
    fontSize: '13px',
  },
  slider: {
    width: '100%',
    accentColor: '#4ecdc4',
  },
  numberInput: {
    width: '65px',
    padding: '4px',
    backgroundColor: '#252540',
    border: '1px solid #333',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '11px',
  },
  zoomAfterScaleBtn: {
    marginLeft: '5px',
    padding: '4px 8px',
    backgroundColor: '#4ecdc4',
    border: 'none',
    color: '#000',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '10px',
  },
  axisRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '6px',
  },
  axisLabel: {
    width: '18px',
    fontWeight: 'bold',
    fontSize: '12px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  resetButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#e74c3c',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '5px',
    fontSize: '12px',
  },
  saveButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#2ecc71',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '5px',
    fontSize: '12px',
  },
  exportButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3498db',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '5px',
    marginBottom: '15px',
    fontSize: '12px',
  },
  codeBox: {
    backgroundColor: '#0d0d1a',
    borderRadius: '6px',
    padding: '12px',
  },
  codeTitle: {
    margin: '0 0 8px 0',
    color: '#4ecdc4',
    fontSize: '12px',
  },
  code: {
    fontSize: '10px',
    color: '#aaa',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    margin: '0 0 8px 0',
    maxHeight: '150px',
  },
  copyButton: {
    width: '100%',
    padding: '6px',
    backgroundColor: '#4ecdc4',
    border: 'none',
    color: '#000',
    cursor: 'pointer',
    borderRadius: '4px',
    fontSize: '11px',
  },
};
