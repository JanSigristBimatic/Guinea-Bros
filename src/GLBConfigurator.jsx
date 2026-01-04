import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

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

export default function GLBConfigurator() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const controlsRef = useRef(null);
  const currentModelRef = useRef(null);
  const animationFrameRef = useRef(null);

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

  // Configuration history
  const [configs, setConfigs] = useState(() => {
    try {
      const saved = localStorage.getItem('glbConfigs');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      50,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.01,
      1000
    );
    camera.position.set(5, 3, 5);
    cameraRef.current = camera;

    // Renderer
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

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.5;
    controls.maxDistance = 50;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(5, 10, 7);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x88ccff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Grid
    const gridHelper = new THREE.GridHelper(20, 20, 0x444466, 0x333355);
    scene.add(gridHelper);

    // Axes helper
    const axesHelper = new THREE.AxesHelper(3);
    scene.add(axesHelper);

    // Ground plane (for reference)
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

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
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
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Load model
  const loadModel = useCallback((modelPath, modelName) => {
    if (!sceneRef.current) return;

    setLoading(true);
    setError(null);

    // Remove current model
    if (currentModelRef.current) {
      sceneRef.current.remove(currentModelRef.current);
      currentModelRef.current = null;
    }

    const loader = new GLTFLoader();
    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;

        // Calculate bounding box
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());

        // Center model
        model.position.sub(center);
        model.position.y += size.y / 2;

        // Enable shadows
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Load saved config if exists
        const savedConfig = configs[modelName];
        if (savedConfig) {
          setScale(savedConfig.scale || 1);
          setPosition(savedConfig.position || { x: 0, y: 0, z: 0 });
          setRotation(savedConfig.rotation || { x: 0, y: 0, z: 0 });

          model.scale.setScalar(savedConfig.scale || 1);
          model.position.x += savedConfig.position?.x || 0;
          model.position.y += savedConfig.position?.y || 0;
          model.position.z += savedConfig.position?.z || 0;
          model.rotation.x = (savedConfig.rotation?.x || 0) * Math.PI / 180;
          model.rotation.y = (savedConfig.rotation?.y || 0) * Math.PI / 180;
          model.rotation.z = (savedConfig.rotation?.z || 0) * Math.PI / 180;
        } else {
          setScale(1);
          setPosition({ x: 0, y: 0, z: 0 });
          setRotation({ x: 0, y: 0, z: 0 });
        }

        sceneRef.current.add(model);
        currentModelRef.current = model;

        // Set model info
        setModelInfo({
          name: modelName,
          originalSize: {
            x: size.x.toFixed(3),
            y: size.y.toFixed(3),
            z: size.z.toFixed(3)
          },
          meshCount: model.children.filter(c => c.isMesh).length,
          animations: gltf.animations.length
        });

        // Focus camera on model
        const maxDim = Math.max(size.x, size.y, size.z);
        cameraRef.current.position.set(maxDim * 2, maxDim * 1.5, maxDim * 2);
        controlsRef.current.target.set(0, size.y / 2, 0);
        controlsRef.current.update();

        setLoading(false);
        setSelectedModel(modelName);
      },
      (progress) => {
        // Loading progress
      },
      (err) => {
        setError(`Fehler beim Laden: ${err.message}`);
        setLoading(false);
      }
    );
  }, [configs]);

  // Update model transforms
  useEffect(() => {
    if (!currentModelRef.current || !modelInfo) return;

    const model = currentModelRef.current;

    // Recalculate base position
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    model.scale.setScalar(scale);
    model.position.x = position.x;
    model.position.y = position.y + (size.y / 2) * scale;
    model.position.z = position.z;
    model.rotation.x = rotation.x * Math.PI / 180;
    model.rotation.y = rotation.y * Math.PI / 180;
    model.rotation.z = rotation.z * Math.PI / 180;
  }, [scale, position, rotation, modelInfo]);

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
    if (!selectedModel) return '';

    return `// ${selectedModel} configuration
const ${selectedModel.toLowerCase().replace(/[^a-z0-9]/g, '')}Config = {
  scale: ${scale},
  position: { x: ${position.x}, y: ${position.y}, z: ${position.z} },
  rotation: { x: ${rotation.x}, y: ${rotation.y}, z: ${rotation.z} } // degrees
};

// Apply to model:
model.scale.setScalar(${scale});
model.position.set(${position.x}, ${position.y}, ${position.z});
model.rotation.set(${(rotation.x * Math.PI / 180).toFixed(4)}, ${(rotation.y * Math.PI / 180).toFixed(4)}, ${(rotation.z * Math.PI / 180).toFixed(4)});`;
  }, [selectedModel, scale, position, rotation]);

  // Reset transforms
  const resetTransforms = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0, z: 0 });
    setRotation({ x: 0, y: 0, z: 0 });
  }, []);

  return (
    <div style={styles.container}>
      {/* Left Panel - Model Selection */}
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
              {configs[model.name] && <span style={styles.savedBadge}>gespeichert</span>}
            </button>
          ))}
        </div>

        {/* Model Info */}
        {modelInfo && (
          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>Modell Info</h4>
            <p>Original Größe:</p>
            <ul style={styles.infoList}>
              <li>X: {modelInfo.originalSize.x}</li>
              <li>Y: {modelInfo.originalSize.y}</li>
              <li>Z: {modelInfo.originalSize.z}</li>
            </ul>
            <p>Meshes: {modelInfo.meshCount}</p>
            <p>Animationen: {modelInfo.animations}</p>
          </div>
        )}
      </div>

      {/* Center - 3D Viewport */}
      <div style={styles.viewport}>
        <div ref={containerRef} style={styles.canvas}>
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
      </div>

      {/* Right Panel - Controls */}
      <div style={styles.rightPanel}>
        <h3 style={styles.controlTitle}>Transformationen</h3>

        {/* Scale */}
        <div style={styles.controlGroup}>
          <label style={styles.label}>Skalierung: {scale.toFixed(2)}</label>
          <input
            type="range"
            min="0.01"
            max="5"
            step="0.01"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value))}
            style={styles.slider}
          />
          <input
            type="number"
            value={scale}
            onChange={(e) => setScale(parseFloat(e.target.value) || 0.01)}
            style={styles.numberInput}
            step="0.01"
          />
        </div>

        {/* Position */}
        <div style={styles.controlGroup}>
          <label style={styles.label}>Position</label>
          {['x', 'y', 'z'].map(axis => (
            <div key={axis} style={styles.axisRow}>
              <span style={styles.axisLabel}>{axis.toUpperCase()}</span>
              <input
                type="range"
                min="-10"
                max="10"
                step="0.1"
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
              <span style={styles.axisLabel}>{axis.toUpperCase()}</span>
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
    padding: '20px',
    borderRight: '1px solid #333',
    overflowY: 'auto',
  },
  title: {
    margin: '0 0 20px 0',
    fontSize: '24px',
    color: '#4ecdc4',
  },
  tabs: {
    display: 'flex',
    gap: '5px',
    marginBottom: '15px',
  },
  tab: {
    flex: 1,
    padding: '8px',
    backgroundColor: '#252540',
    border: 'none',
    color: '#888',
    cursor: 'pointer',
    borderRadius: '5px',
    fontSize: '12px',
  },
  tabActive: {
    backgroundColor: '#4ecdc4',
    color: '#000',
  },
  modelList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  modelButton: {
    padding: '12px',
    backgroundColor: '#252540',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '8px',
    textAlign: 'left',
    transition: 'all 0.2s',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modelButtonActive: {
    backgroundColor: '#4ecdc4',
    color: '#000',
  },
  savedBadge: {
    fontSize: '10px',
    backgroundColor: '#2ecc71',
    padding: '2px 6px',
    borderRadius: '3px',
    color: '#fff',
  },
  infoBox: {
    marginTop: '20px',
    padding: '15px',
    backgroundColor: '#252540',
    borderRadius: '8px',
    fontSize: '13px',
  },
  infoTitle: {
    margin: '0 0 10px 0',
    color: '#4ecdc4',
  },
  infoList: {
    margin: '5px 0',
    paddingLeft: '20px',
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: '20px',
    borderRadius: '8px',
  },
  rightPanel: {
    width: '320px',
    backgroundColor: '#1a1a2e',
    padding: '20px',
    borderLeft: '1px solid #333',
    overflowY: 'auto',
  },
  controlTitle: {
    margin: '0 0 20px 0',
    color: '#4ecdc4',
  },
  controlGroup: {
    marginBottom: '25px',
  },
  label: {
    display: 'block',
    marginBottom: '10px',
    color: '#888',
    fontSize: '14px',
  },
  slider: {
    width: '100%',
    accentColor: '#4ecdc4',
  },
  numberInput: {
    width: '70px',
    padding: '5px',
    backgroundColor: '#252540',
    border: '1px solid #333',
    color: '#fff',
    borderRadius: '4px',
    fontSize: '12px',
  },
  axisRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '8px',
  },
  axisLabel: {
    width: '20px',
    fontWeight: 'bold',
    color: '#4ecdc4',
  },
  buttonGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
  },
  resetButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#e74c3c',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '5px',
  },
  saveButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: '#2ecc71',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '5px',
  },
  exportButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: '#3498db',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    borderRadius: '5px',
    marginBottom: '20px',
  },
  codeBox: {
    backgroundColor: '#0d0d1a',
    borderRadius: '8px',
    padding: '15px',
    marginTop: '20px',
  },
  codeTitle: {
    margin: '0 0 10px 0',
    color: '#4ecdc4',
    fontSize: '14px',
  },
  code: {
    fontSize: '11px',
    color: '#aaa',
    overflow: 'auto',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    margin: '0 0 10px 0',
  },
  copyButton: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#4ecdc4',
    border: 'none',
    color: '#000',
    cursor: 'pointer',
    borderRadius: '5px',
    fontSize: '12px',
  },
};
