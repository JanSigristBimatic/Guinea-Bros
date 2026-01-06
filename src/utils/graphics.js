/**
 * Graphics Enhancement Module
 * Post-Processing, Skybox, Enhanced Lighting
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Vignette Shader
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    darkness: { value: 0.5 },
    offset: { value: 1.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float darkness;
    uniform float offset;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      float vignette = 1.0 - dot(uv, uv);
      vignette = pow(vignette, darkness);
      gl_FragColor = vec4(texel.rgb * vignette, texel.a);
    }
  `
};

// Color Grading Shader (warmer, more saturated)
const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.15 },
    contrast: { value: 1.05 },
    brightness: { value: 0.02 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float saturation;
    uniform float contrast;
    uniform float brightness;
    varying vec2 vUv;

    vec3 rgb2hsv(vec3 c) {
      vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
      vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
      vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
      float d = q.x - min(q.w, q.y);
      float e = 1.0e-10;
      return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }

    vec3 hsv2rgb(vec3 c) {
      vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
      vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
      return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);

      // Saturation
      vec3 hsv = rgb2hsv(texel.rgb);
      hsv.y *= saturation;
      vec3 rgb = hsv2rgb(hsv);

      // Contrast & Brightness
      rgb = (rgb - 0.5) * contrast + 0.5 + brightness;

      gl_FragColor = vec4(rgb, texel.a);
    }
  `
};

/**
 * Create Post-Processing Pipeline
 */
export function createPostProcessing(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);

  // 1. Render Pass (base scene)
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // 2. Bloom Pass (glow effects)
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.4,    // strength
    0.4,    // radius
    0.85    // threshold
  );
  composer.addPass(bloomPass);

  // 3. Color Grading
  const colorGradingPass = new ShaderPass(ColorGradingShader);
  composer.addPass(colorGradingPass);

  // 4. Vignette
  const vignettePass = new ShaderPass(VignetteShader);
  vignettePass.uniforms.darkness.value = 0.4;
  vignettePass.uniforms.offset.value = 1.2;
  composer.addPass(vignettePass);

  // 5. Output Pass (final output with color space)
  const outputPass = new OutputPass();
  composer.addPass(outputPass);

  return {
    composer,
    bloomPass,
    vignettePass,
    colorGradingPass,
    resize: (width, height) => {
      composer.setSize(width, height);
    },
    // Adjust for day/night
    setDayMode: () => {
      bloomPass.strength = 0.35;
      vignettePass.uniforms.darkness.value = 0.35;
      colorGradingPass.uniforms.saturation.value = 1.15;
    },
    setNightMode: () => {
      bloomPass.strength = 0.6;
      vignettePass.uniforms.darkness.value = 0.55;
      colorGradingPass.uniforms.saturation.value = 0.9;
    }
  };
}

/**
 * Create Gradient Sky Dome
 */
export function createSkyDome(scene) {
  const vertexShader = `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    uniform vec3 topColor;
    uniform vec3 bottomColor;
    uniform float offset;
    uniform float exponent;
    varying vec3 vWorldPosition;

    void main() {
      float h = normalize(vWorldPosition + offset).y;
      gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
    }
  `;

  const uniforms = {
    topColor: { value: new THREE.Color(0x0077ff) },
    bottomColor: { value: new THREE.Color(0x89CFF0) },
    offset: { value: 33 },
    exponent: { value: 0.6 }
  };

  const skyGeo = new THREE.SphereGeometry(150, 32, 15);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.BackSide
  });

  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  return {
    mesh: sky,
    uniforms: uniforms,
    setDayMode: () => {
      uniforms.topColor.value.setHex(0x0077ff);
      uniforms.bottomColor.value.setHex(0x89CFF0);
    },
    setNightMode: () => {
      uniforms.topColor.value.setHex(0x0a0a2e);
      uniforms.bottomColor.value.setHex(0x1a1a3a);
    },
    setSunsetMode: () => {
      uniforms.topColor.value.setHex(0x1a0a3e);
      uniforms.bottomColor.value.setHex(0xff6b35);
    }
  };
}

/**
 * Create Enhanced Ground with Texture
 */
export function createEnhancedGround(scene) {
  // Create procedural grass texture
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base color
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(0, 0, 512, 512);

  // Add noise pattern
  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = Math.random() * 40 - 20;
    const g = Math.min(255, Math.max(0, 175 + shade));
    ctx.fillStyle = `rgb(76, ${g}, 80)`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Add some darker patches
  for (let i = 0; i < 50; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = Math.random() * 30 + 10;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    gradient.addColorStop(0, 'rgba(60, 140, 60, 0.3)');
    gradient.addColorStop(1, 'rgba(60, 140, 60, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;

  // Simple flat ground for proper raycasting
  const groundGeometry = new THREE.PlaneGeometry(120, 120);

  const groundMaterial = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.85,
    metalness: 0.0
  });

  const ground = new THREE.Mesh(groundGeometry, groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'ground';
  scene.add(ground);

  return ground;
}

/**
 * Create Enhanced Lighting System
 */
export function createEnhancedLighting(scene) {
  // Main Sun Light
  const sunLight = new THREE.DirectionalLight(0xFFFAE6, 1.8);
  sunLight.position.set(25, 35, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 4096;
  sunLight.shadow.mapSize.height = 4096;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 150;
  sunLight.shadow.camera.left = -60;
  sunLight.shadow.camera.right = 60;
  sunLight.shadow.camera.top = 60;
  sunLight.shadow.camera.bottom = -60;
  sunLight.shadow.bias = -0.0001;
  sunLight.shadow.normalBias = 0.02;
  scene.add(sunLight);

  // Ambient Light
  const ambientLight = new THREE.AmbientLight(0x8EC8FF, 0.5);
  scene.add(ambientLight);

  // Hemisphere Light (sky/ground bounce)
  const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x5C4033, 0.6);
  scene.add(hemiLight);

  // Rim Light (backlight for drama)
  const rimLight = new THREE.DirectionalLight(0xFFE4B5, 0.4);
  rimLight.position.set(-20, 20, -30);
  scene.add(rimLight);

  // Subtle fill light from the front
  const fillLight = new THREE.DirectionalLight(0xADD8E6, 0.2);
  fillLight.position.set(0, 10, 40);
  scene.add(fillLight);

  return {
    sun: sunLight,
    ambient: ambientLight,
    hemi: hemiLight,
    rim: rimLight,
    fill: fillLight,
    setDayMode: () => {
      sunLight.color.setHex(0xFFFAE6);
      sunLight.intensity = 1.8;
      ambientLight.intensity = 0.5;
      hemiLight.intensity = 0.6;
      rimLight.intensity = 0.4;
    },
    setNightMode: () => {
      sunLight.color.setHex(0x4466AA);
      sunLight.intensity = 0.3;
      ambientLight.intensity = 0.15;
      hemiLight.intensity = 0.2;
      rimLight.intensity = 0.1;
    },
    setSunsetMode: () => {
      sunLight.color.setHex(0xFF8C42);
      sunLight.intensity = 1.2;
      ambientLight.intensity = 0.3;
      hemiLight.intensity = 0.4;
      rimLight.color.setHex(0xFF6B35);
      rimLight.intensity = 0.6;
    }
  };
}

/**
 * Create Decorative Clouds
 */
export function createClouds(scene) {
  const clouds = [];
  const cloudGroup = new THREE.Group();

  // Reduced cloud count for better performance
  for (let i = 0; i < 8; i++) {
    const cloud = new THREE.Group();

    // Each cloud is made of fewer spheres with lower poly
    const numPuffs = 2 + Math.floor(Math.random() * 2);
    for (let j = 0; j < numPuffs; j++) {
      const puffGeo = new THREE.SphereGeometry(
        3 + Math.random() * 3,
        6,  // reduced segments
        6
      );
      const puffMat = new THREE.MeshBasicMaterial({  // BasicMaterial = no lighting calc
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
      });
      const puff = new THREE.Mesh(puffGeo, puffMat);
      puff.position.set(
        j * 3 - numPuffs,
        Math.random() * 1.5,
        Math.random() * 2 - 1
      );
      cloud.add(puff);
    }

    cloud.position.set(
      (Math.random() - 0.5) * 180,
      45 + Math.random() * 15,
      (Math.random() - 0.5) * 180
    );
    cloud.userData.speed = 0.008 + Math.random() * 0.012;
    cloud.userData.baseX = cloud.position.x;

    cloudGroup.add(cloud);
    clouds.push(cloud);
  }

  scene.add(cloudGroup);

  return {
    group: cloudGroup,
    clouds: clouds,
    update: (time) => {
      clouds.forEach(cloud => {
        cloud.position.x = cloud.userData.baseX + Math.sin(time * cloud.userData.speed) * 10;
      });
    },
    setVisible: (visible) => {
      cloudGroup.visible = visible;
    }
  };
}

/**
 * Create God Rays / Light Shafts (simplified)
 */
export function createLightShafts(scene) {
  const shaftGroup = new THREE.Group();

  for (let i = 0; i < 5; i++) {
    const shaftGeo = new THREE.CylinderGeometry(0.5, 3, 40, 8, 1, true);
    const shaftMat = new THREE.MeshBasicMaterial({
      color: 0xFFFAE6,
      transparent: true,
      opacity: 0.03,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.position.set(
      20 + i * 8,
      20,
      -30 + i * 15
    );
    shaft.rotation.z = -0.3;
    shaft.rotation.x = 0.1 * i;
    shaftGroup.add(shaft);
  }

  scene.add(shaftGroup);

  return {
    group: shaftGroup,
    setVisible: (visible) => {
      shaftGroup.visible = visible;
    },
    update: (time) => {
      shaftGroup.children.forEach((shaft, i) => {
        shaft.material.opacity = 0.02 + Math.sin(time * 0.5 + i) * 0.015;
      });
    }
  };
}

/**
 * Create Dust Particles in the air
 */
export function createDustParticles(scene) {
  const particleCount = 80; // Reduced for performance
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = [];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = Math.random() * 20;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
    velocities.push({
      x: (Math.random() - 0.5) * 0.01,
      y: (Math.random() - 0.5) * 0.005,
      z: (Math.random() - 0.5) * 0.01
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xFFFFFF,
    size: 0.15,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

  const particles = new THREE.Points(geometry, material);
  scene.add(particles);

  return {
    mesh: particles,
    update: () => {
      const pos = geometry.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3] += velocities[i].x;
        pos[i * 3 + 1] += velocities[i].y;
        pos[i * 3 + 2] += velocities[i].z;

        // Wrap around
        if (pos[i * 3] > 40) pos[i * 3] = -40;
        if (pos[i * 3] < -40) pos[i * 3] = 40;
        if (pos[i * 3 + 1] > 20) pos[i * 3 + 1] = 0;
        if (pos[i * 3 + 1] < 0) pos[i * 3 + 1] = 20;
        if (pos[i * 3 + 2] > 40) pos[i * 3 + 2] = -40;
        if (pos[i * 3 + 2] < -40) pos[i * 3 + 2] = 40;
      }
      geometry.attributes.position.needsUpdate = true;
    },
    setVisible: (visible) => {
      particles.visible = visible;
    }
  };
}
