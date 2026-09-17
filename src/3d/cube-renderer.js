/**
 * Rubik's Cube 3D Renderer (Three.js)
 * 
 * High-performance, lightweight 3D speedcube renderer.
 * Optimized for integrated GPUs (Intel HD Graphics) with:
 * - Low polygon count (< 350 triangles total)
 * - Cached high-DPI canvas sticker textures (GAN speedcube aesthetic)
 * - OrbitControls with inertia damping
 * - Layer rotation with smooth animation pivot
 * - Raycaster support for clicking stickers directly in 3D
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FACES, DEFAULT_CENTERS, COLOR_CODES } from '../cube/cube-state.js';
import { applyMove } from '../cube/cube-moves.js';

// Visual color palette tailored for vibrant speedcube look
export const STICKER_PALETTE = {
  white:  '#F8FAFC',
  yellow: '#FACC15',
  red:    '#DC2626',
  orange: '#EA580C',
  blue:   '#2563EB',
  green:  '#16A34A',
  unset:  '#334155', // Slate placeholder for uncolored inputs
  plastic: '#12141A',
};

// Texture cache so we only create 128x128 textures once
const textureCache = new Map();

function createStickerTexture(colorHex, isHighlighted = false) {
  const cacheKey = `${colorHex}_${isHighlighted}`;
  if (textureCache.has(cacheKey)) {
    return textureCache.get(cacheKey);
  }

  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Plastic border background
  ctx.fillStyle = isHighlighted ? '#60A5FA' : '#14161D';
  ctx.fillRect(0, 0, size, size);

  // Rounded sticker inset
  const pad = 14;
  const radius = 28;
  const w = size - pad * 2;
  const h = size - pad * 2;

  ctx.beginPath();
  ctx.roundRect(pad, pad, w, h, radius);
  ctx.fillStyle = colorHex;
  ctx.fill();

  // Subtle top highlight for a premium speedcube reflection
  const gradient = ctx.createLinearGradient(pad, pad, pad, pad + h);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
  gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.05)');
  gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.15)');

  ctx.fillStyle = gradient;
  ctx.fill();

  // Inner border outline
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.18)';
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(cacheKey, texture);
  return texture;
}

// Material cache
const materialCache = new Map();

function getMaterial(colorName, isHighlighted = false) {
  const hex = STICKER_PALETTE[colorName] || colorName || STICKER_PALETTE.unset;
  const key = `${hex}_${isHighlighted}`;
  if (materialCache.has(key)) {
    return materialCache.get(key);
  }

  const texture = createStickerTexture(hex, isHighlighted);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.35,
    metalness: 0.08,
  });

  materialCache.set(key, material);
  return material;
}

// Plastic core material for hidden interior faces
const plasticMaterial = new THREE.MeshStandardMaterial({
  color: 0x14161D,
  roughness: 0.7,
  metalness: 0.1,
});

/**
 * Coordinate-to-sticker mapping table
 * Maps (x, y, z) and face index (+X, -X, +Y, -Y, +Z, -Z)
 * to { face: 'U'|'R'|'F'|'D'|'L'|'B', index: 0..8 }
 */
export function getStickerAddress(x, y, z, faceNormal) {
  // faceNormal: 'px' (Right), 'nx' (Left), 'py' (Up), 'ny' (Down), 'pz' (Front), 'nz' (Back)
  if (faceNormal === 'px' && x === 1) {
    // Right face
    const row = y === 1 ? 0 : y === 0 ? 1 : 2;
    const col = z === 1 ? 0 : z === 0 ? 1 : 2;
    return { face: 'R', index: row * 3 + col };
  }
  if (faceNormal === 'nx' && x === -1) {
    // Left face
    const row = y === 1 ? 0 : y === 0 ? 1 : 2;
    const col = z === -1 ? 0 : z === 0 ? 1 : 2;
    return { face: 'L', index: row * 3 + col };
  }
  if (faceNormal === 'py' && y === 1) {
    // Up face
    const row = z === -1 ? 0 : z === 0 ? 1 : 2;
    const col = x === -1 ? 0 : x === 0 ? 1 : 2;
    return { face: 'U', index: row * 3 + col };
  }
  if (faceNormal === 'ny' && y === -1) {
    // Down face
    const row = z === 1 ? 0 : z === 0 ? 1 : 2;
    const col = x === -1 ? 0 : x === 0 ? 1 : 2;
    return { face: 'D', index: row * 3 + col };
  }
  if (faceNormal === 'pz' && z === 1) {
    // Front face
    const row = y === 1 ? 0 : y === 0 ? 1 : 2;
    const col = x === -1 ? 0 : x === 0 ? 1 : 2;
    return { face: 'F', index: row * 3 + col };
  }
  if (faceNormal === 'nz' && z === -1) {
    // Back face
    const row = y === 1 ? 0 : y === 0 ? 1 : 2;
    const col = x === 1 ? 0 : x === 0 ? 1 : 2;
    return { face: 'B', index: row * 3 + col };
  }
  return null;
}

export class CubeRenderer {
  constructor(containerElement, options = {}) {
    this.container = containerElement;
    this.options = {
      interactive: true,
      autoRotate: false,
      enableClickToPaint: false,
      onStickerClick: null,
      ...options,
    };

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.cubeGroup = null;
    this.pivotGroup = null;
    this.cubies = []; // 26 mesh objects
    this.cubieGeometry = null;
    this.animating = false;
    this.currentState = null;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.initScene();
    this.buildCube();
    this.setupEvents();
    this.startLoop();
  }

  initScene() {
    const width = this.container.clientWidth || 400;
    const height = this.container.clientHeight || 400;

    this.scene = new THREE.Scene();

    // Camera with standard isometric viewpoint
    this.camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    this.camera.position.set(4.2, 3.4, 4.8);

    // Renderer optimized for low power
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'default',
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 3.2;
    this.controls.maxDistance = 9.0;
    this.controls.autoRotate = this.options.autoRotate;
    this.controls.autoRotateSpeed = 1.5;

    // Studio Lighting
    const ambientLight = new THREE.AmbientLight(0xFFFFFF, 1.4);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xFFFFFF, 1.6);
    dirLight1.position.set(5, 10, 7);
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93C5FD, 0.8);
    dirLight2.position.set(-6, -4, -5);
    this.scene.add(dirLight2);

    this.cubeGroup = new THREE.Group();
    this.pivotGroup = new THREE.Group();
    this.scene.add(this.cubeGroup);
    this.scene.add(this.pivotGroup);
  }

  buildCube() {
    const size = 0.95;
    this.cubieGeometry = new THREE.BoxGeometry(size, size, size);

    this.cubies = [];
    const spacing = 1.0;

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue; // Skip core

          // 6 face materials: [Right, Left, Top, Bottom, Front, Back]
          const materials = [
            x === 1 ? getMaterial('red') : plasticMaterial,
            x === -1 ? getMaterial('orange') : plasticMaterial,
            y === 1 ? getMaterial('white') : plasticMaterial,
            y === -1 ? getMaterial('yellow') : plasticMaterial,
            z === 1 ? getMaterial('green') : plasticMaterial,
            z === -1 ? getMaterial('blue') : plasticMaterial,
          ];

          const mesh = new THREE.Mesh(this.cubieGeometry, materials);
          mesh.position.set(x * spacing, y * spacing, z * spacing);
          mesh.userData = {
            gridX: x,
            gridY: y,
            gridZ: z,
            initialX: x,
            initialY: y,
            initialZ: z,
          };

          this.cubeGroup.add(mesh);
          this.cubies.push(mesh);
        }
      }
    }
  }

  /**
   * Updates all sticker colors from a CubeState
   * @param {Object} state - Canonical CubeState
   */
  setState(state) {
    if (!state) return;
    this.currentState = state;

    for (const cubie of this.cubies) {
      const { gridX: x, gridY: y, gridZ: z } = cubie.userData;

      const rightAddr = getStickerAddress(x, y, z, 'px');
      const leftAddr = getStickerAddress(x, y, z, 'nx');
      const upAddr = getStickerAddress(x, y, z, 'py');
      const downAddr = getStickerAddress(x, y, z, 'ny');
      const frontAddr = getStickerAddress(x, y, z, 'pz');
      const backAddr = getStickerAddress(x, y, z, 'nz');

      const materials = [
        rightAddr && state[rightAddr.face] ? getMaterial(state[rightAddr.face][rightAddr.index]) : plasticMaterial,
        leftAddr && state[leftAddr.face] ? getMaterial(state[leftAddr.face][leftAddr.index]) : plasticMaterial,
        upAddr && state[upAddr.face] ? getMaterial(state[upAddr.face][upAddr.index]) : plasticMaterial,
        downAddr && state[downAddr.face] ? getMaterial(state[downAddr.face][downAddr.index]) : plasticMaterial,
        frontAddr && state[frontAddr.face] ? getMaterial(state[frontAddr.face][frontAddr.index]) : plasticMaterial,
        backAddr && state[backAddr.face] ? getMaterial(state[backAddr.face][backAddr.index]) : plasticMaterial,
      ];

      cubie.material = materials;
    }
  }

  /**
   * Resets camera to standard isometric view
   */
  resetView() {
    this.camera.position.set(4.2, 3.4, 4.8);
    this.camera.lookAt(0, 0, 0);
    this.controls.target.set(0, 0, 0);
    this.controls.update();
  }

  /**
   * Animate a single move notation smoothly
   * @param {string} moveStr - e.g. "R", "U'", "F2"
   * @param {number} durationMs - Animation time in ms (default 300ms)
   * @returns {Promise<void>}
   */
  animateMove(moveStr, durationMs = 300) {
    if (this.animating) return Promise.resolve();
    this.animating = true;

    return new Promise((resolve) => {
      const face = moveStr[0].toUpperCase();
      const isPrime = moveStr.includes("'") || moveStr.includes('’');
      const isDouble = moveStr.includes('2');

      // Determine rotation axis and slice condition
      let axis = new THREE.Vector3();
      let angle = (Math.PI / 2) * (isDouble ? 2 : 1) * (isPrime ? 1 : -1);
      let sliceCubies = [];

      switch (face) {
        case 'R':
          axis.set(1, 0, 0);
          angle = -angle; // Looking along +X, CW rotation is negative about X
          sliceCubies = this.cubies.filter(c => c.userData.gridX === 1);
          break;
        case 'L':
          axis.set(1, 0, 0);
          angle = angle; // Looking along -X, CW rotation is positive about X
          sliceCubies = this.cubies.filter(c => c.userData.gridX === -1);
          break;
        case 'U':
          axis.set(0, 1, 0);
          angle = -angle; // Looking along +Y, CW rotation is negative about Y
          sliceCubies = this.cubies.filter(c => c.userData.gridY === 1);
          break;
        case 'D':
          axis.set(0, 1, 0);
          angle = angle; // Looking along -Y, CW rotation is positive about Y
          sliceCubies = this.cubies.filter(c => c.userData.gridY === -1);
          break;
        case 'F':
          axis.set(0, 0, 1);
          angle = -angle; // Looking along +Z, CW rotation is negative about Z
          sliceCubies = this.cubies.filter(c => c.userData.gridZ === 1);
          break;
        case 'B':
          axis.set(0, 0, 1);
          angle = angle; // Looking along -Z, CW rotation is positive about Z
          sliceCubies = this.cubies.filter(c => c.userData.gridZ === -1);
          break;
      }

      if (durationMs <= 10) {
        // Instant update
        if (this.currentState) {
          this.currentState = applyMove(this.currentState, moveStr);
          this.setState(this.currentState);
        }
        this.animating = false;
        resolve();
        return;
      }

      // Attach slice to pivotGroup
      this.pivotGroup.rotation.set(0, 0, 0);
      sliceCubies.forEach(cubie => {
        this.pivotGroup.attach(cubie);
      });

      const startTime = performance.now();

      const animateStep = (time) => {
        const elapsed = time - startTime;
        const progress = Math.min(elapsed / durationMs, 1.0);
        // Smooth cubic ease out
        const ease = 1 - Math.pow(1 - progress, 3);

        const currentAngle = angle * ease;
        this.pivotGroup.setRotationFromAxisAngle(axis, currentAngle);

        if (progress < 1.0) {
          requestAnimationFrame(animateStep);
        } else {
          // Finish rotation
          this.pivotGroup.setRotationFromAxisAngle(axis, angle);
          this.pivotGroup.updateMatrixWorld(true);

          // Re-attach to main group
          sliceCubies.forEach(cubie => {
            this.cubeGroup.attach(cubie);
            // Re-align integer positions to avoid any drift
            cubie.position.x = Math.round(cubie.position.x);
            cubie.position.y = Math.round(cubie.position.y);
            cubie.position.z = Math.round(cubie.position.z);
            cubie.rotation.set(0, 0, 0);
          });

          this.pivotGroup.rotation.set(0, 0, 0);

          // Apply move logically to state and update colors cleanly
          if (this.currentState) {
            this.currentState = applyMove(this.currentState, moveStr);
            this.setState(this.currentState);
          }

          this.animating = false;
          resolve();
        }
      };

      requestAnimationFrame(animateStep);
    });
  }

  setupEvents() {
    this.onResize = () => {
      if (!this.container || !this.renderer || !this.camera) return;
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      if (width === 0 || height === 0) return;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };

    window.addEventListener('resize', this.onResize);

    // Click handler for 3D sticker painting / selection
    const dom = this.renderer.domElement;
    let clickStartX = 0;
    let clickStartY = 0;

    dom.addEventListener('pointerdown', (e) => {
      clickStartX = e.clientX;
      clickStartY = e.clientY;
    });

    dom.addEventListener('pointerup', (e) => {
      // Check if it was a click (not a drag/orbit)
      const dist = Math.hypot(e.clientX - clickStartX, e.clientY - clickStartY);
      if (dist > 6) return;

      if (!this.options.enableClickToPaint && !this.options.onStickerClick) return;

      const rect = dom.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      const intersects = this.raycaster.intersectObjects(this.cubies, false);

      if (intersects.length > 0) {
        const hit = intersects[0];
        const cubie = hit.object;
        const faceIndex = hit.face.materialIndex; // 0..5

        const normalMap = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
        const normalKey = normalMap[faceIndex];
        const addr = getStickerAddress(
          cubie.userData.gridX,
          cubie.userData.gridY,
          cubie.userData.gridZ,
          normalKey
        );

        if (addr && this.options.onStickerClick) {
          this.options.onStickerClick(addr.face, addr.index);
        }
      }
    });
  }

  startLoop() {
    let isVisible = true;

    // Optimize CPU usage when tab is in background
    document.addEventListener('visibilitychange', () => {
      isVisible = !document.hidden;
    });

    const loop = () => {
      requestAnimationFrame(loop);
      if (!isVisible) return;

      if (this.controls) {
        this.controls.update();
      }
      if (this.renderer && this.scene && this.camera) {
        this.renderer.render(this.scene, this.camera);
      }
    };

    loop();
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
    if (this.renderer && this.renderer.domElement) {
      this.renderer.domElement.remove();
      this.renderer.dispose();
    }
  }
}
