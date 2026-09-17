/**
 * Face Input Page Component
 * 
 * Features:
 * - 6-face sliding carousel with visual face indicators
 * - 6-color selection palette with hotkeys (1-6 / W,Y,R,O,B,G)
 * - 3x3 interactive block grid with center lock
 * - Live synchronized 3D preview on the side (desktop) or below (mobile)
 * - Click-in-3D painting support
 * - Live color count tracker (ensures exactly 9 of each color)
 * - Quick presets (Solved, Scramble, Random) for rapid testing
 * - Validation check before navigating to Solve
 */

import { CubeRenderer } from '../3d/cube-renderer.js';
import { FACES, FACE_NAMES, DEFAULT_CENTERS, COLORS, COLOR_CODES, createSolvedCube, cloneCube } from '../cube/cube-state.js';
import { validateCube } from '../cube/cube-validator.js';
import { solverManager } from '../solver/solver-manager.js';
import { analytics } from './analytics.js';

export function renderFaceInputPage(container, router, sharedState = {}) {
  analytics.trackEvent('page_view', { page: 'input' });

  // Initialize or resume cube state
  let cubeState = sharedState.cubeState
    ? cloneCube(sharedState.cubeState)
    : createSolvedCube();

  let activeFaceIndex = 0; // 0..5 (U, R, F, D, L, B)
  let selectedColor = 'white'; // default paint color

  const colorPalette = [
    { key: 'white', label: 'W', code: COLOR_CODES.white, name: 'White', keyHint: '1' },
    { key: 'yellow', label: 'Y', code: COLOR_CODES.yellow, name: 'Yellow', keyHint: '2' },
    { key: 'red', label: 'R', code: COLOR_CODES.red, name: 'Red', keyHint: '3' },
    { key: 'orange', label: 'O', code: COLOR_CODES.orange, name: 'Orange', keyHint: '4' },
    { key: 'green', label: 'G', code: COLOR_CODES.green, name: 'Green', keyHint: '5' },
    { key: 'blue', label: 'B', code: COLOR_CODES.blue, name: 'Blue', keyHint: '6' },
  ];

  container.innerHTML = `
    <div class="view-container animate-fade-in" style="gap: 24px;">
      <!-- Header Bar -->
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em;">Color Input Studio</h1>
          <p style="color: var(--text-secondary); font-size: 0.95rem;">
            Fill in the colors of your scrambled cube. Slide through all 6 faces or tap stickers in 3D.
          </p>
        </div>

        <!-- Presets Menu -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          <button id="btn-preset-solved" class="btn btn-secondary btn-sm" title="Load a solved cube">
            Solved Cube
          </button>
          <button id="btn-preset-scramble" class="btn btn-secondary btn-sm" title="Load a realistic scramble">
            🎲 Random Scramble
          </button>
          <button id="btn-clear-all" class="btn btn-secondary btn-sm" title="Reset all faces to center colors">
            🔄 Reset
          </button>
        </div>
      </div>

      <!-- Main Split Studio Layout -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; align-items: start;">
        
        <!-- Left Column: Face Carousel & Color Palette -->
        <div class="card-glass" style="display: flex; flex-direction: column; gap: 20px;">
          
          <!-- Face Tabs -->
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px; overflow-x: auto;">
            <div id="face-tabs-container" style="display: flex; gap: 6px;">
              ${FACES.map((f, i) => `
                <button class="face-tab btn btn-sm ${i === 0 ? 'active' : ''}" data-face-index="${i}" style="font-weight: 600; padding: 6px 14px; border-radius: var(--radius-sm);">
                  ${FACE_NAMES[f]} (${f})
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Carousel Card for Active Face -->
          <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
              <button id="prev-face-btn" class="btn btn-secondary btn-sm" style="border-radius: 50%; width: 36px; height: 36px; padding: 0;">
                ❮
              </button>
              <div style="text-align: center;">
                <div id="current-face-title" style="font-size: 1.3rem; font-weight: 700; color: var(--text-primary);">
                  Up Face (White Center)
                </div>
                <div id="face-progress-text" style="font-size: 0.85rem; color: var(--text-muted);">
                  Face 1 of 6 — Look directly at the top face
                </div>
              </div>
              <button id="next-face-btn" class="btn btn-secondary btn-sm" style="border-radius: 50%; width: 36px; height: 36px; padding: 0;">
                ❯
              </button>
            </div>

            <!-- 3x3 Block Grid -->
            <div id="face-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; width: 270px; height: 270px; padding: 12px; background: rgba(0, 0, 0, 0.4); border-radius: 16px; border: 2px solid var(--border-subtle); box-shadow: inset 0 2px 8px rgba(0,0,0,0.5);">
              <!-- 9 stickers rendered via JS -->
            </div>
          </div>

          <!-- Color Selection Palette -->
          <div style="display: flex; flex-direction: column; gap: 8px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-secondary);">
                Select Color to Paint (Press 1–6):
              </span>
              <span id="selected-color-name" style="font-size: 0.85rem; font-weight: 700; color: #FFFFFF; text-transform: capitalize;">
                White
              </span>
            </div>

            <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
              ${colorPalette.map(c => `
                <button class="palette-btn ${c.key === selectedColor ? 'selected' : ''}" 
                  data-color="${c.key}" 
                  style="background-color: ${c.code}; color: ${c.key === 'white' || c.key === 'yellow' ? '#111827' : '#FFFFFF'};" 
                  title="${c.name} (Key: ${c.keyHint})">
                  ${c.label}
                </button>
              `).join('')}
            </div>
          </div>

          <!-- Live Sticker Counters -->
          <div style="background: rgba(0, 0, 0, 0.25); border-radius: var(--radius-md); padding: 12px; border: 1px solid var(--border-subtle);">
            <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px;">
              Sticker Balance (9 needed for each color):
            </div>
            <div id="sticker-counters" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 0.85rem;">
              <!-- Filled via JS -->
            </div>
          </div>

        </div>

        <!-- Right Column: Interactive 3D Cube & Validation Checklist -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div class="card-glass" style="display: flex; flex-direction: column; align-items: center; min-height: 380px; padding: 16px; position: relative;">
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-secondary);">
                Live 3D Mirror
              </span>
              <button id="btn-reset-3d-cam" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 4px 8px;">
                Reset View
              </button>
            </div>

            <div id="input-cube-container" style="width: 100%; height: 320px; cursor: grab;"></div>

            <div style="font-size: 0.8rem; color: var(--text-muted); text-align: center; margin-top: 6px;">
              💡 Tip: You can tap any sticker directly on this 3D cube to color it!
            </div>
          </div>

          <!-- Validation Status Card & Action Button -->
          <div class="card-glass" style="display: flex; flex-direction: column; gap: 14px;">
            <div id="validation-box" style="padding: 12px 16px; border-radius: var(--radius-md); font-size: 0.9rem; line-height: 1.4;">
              <!-- Filled via updateUI -->
            </div>

            <button id="btn-solve-now" class="btn btn-success btn-lg" style="width: 100%; box-shadow: var(--shadow-glow-green);">
              <span>Verify & Solve Cube</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  // 3D Renderer Setup
  const cubeContainer = container.querySelector('#input-cube-container');
  const renderer = new CubeRenderer(cubeContainer, {
    enableClickToPaint: true,
    onStickerClick: (face, index) => {
      // Paint sticker directly via 3D click!
      if (index === 4) return; // Center is locked
      cubeState[face][index] = selectedColor;
      renderer.setState(cubeState);
      updateUI();
    },
  });

  renderer.setState(cubeState);

  // Helper to count colors
  function getColorCounts() {
    const counts = { white: 0, yellow: 0, red: 0, orange: 0, blue: 0, green: 0 };
    for (const f of FACES) {
      for (let i = 0; i < 9; i++) {
        const c = cubeState[f][i];
        if (counts[c] !== undefined) counts[c]++;
      }
    }
    return counts;
  }

  // Update Face Grid & Counters
  function updateUI() {
    const currentFace = FACES[activeFaceIndex];
    const centerColor = DEFAULT_CENTERS[currentFace];

    // Face Title & Progress
    const titleEl = container.querySelector('#current-face-title');
    const progEl = container.querySelector('#face-progress-text');
    titleEl.textContent = `${FACE_NAMES[currentFace]} Face (${centerColor.toUpperCase()} Center)`;
    progEl.textContent = `Face ${activeFaceIndex + 1} of 6 — Canonical Western scheme`;

    // Highlight active tab
    container.querySelectorAll('.face-tab').forEach((tab, i) => {
      if (i === activeFaceIndex) {
        tab.classList.add('active');
        tab.style.background = 'rgba(59, 130, 246, 0.2)';
        tab.style.borderColor = 'rgba(59, 130, 246, 0.5)';
      } else {
        tab.classList.remove('active');
        tab.style.background = 'transparent';
        tab.style.borderColor = 'transparent';
      }
    });

    // Render 9 stickers
    const gridEl = container.querySelector('#face-grid');
    gridEl.innerHTML = '';

    for (let i = 0; i < 9; i++) {
      const color = cubeState[currentFace][i] || 'unset';
      const isCenter = i === 4;
      const cell = document.createElement('div');
      cell.className = `sticker-cell ${isCenter ? 'locked' : ''}`;
      cell.style.backgroundColor = COLOR_CODES[color] || '#334155';
      cell.title = isCenter ? `Fixed Center: ${color}` : `Block ${i + 1}`;

      if (!isCenter) {
        cell.addEventListener('click', () => {
          cubeState[currentFace][i] = selectedColor;
          renderer.setState(cubeState);
          updateUI();
        });
      }

      gridEl.appendChild(cell);
    }

    // Update Sticker Counters
    const counts = getColorCounts();
    const countersEl = container.querySelector('#sticker-counters');
    countersEl.innerHTML = colorPalette.map(c => {
      const count = counts[c.key] || 0;
      const isExact = count === 9;
      const isOver = count > 9;
      const colorStyle = isExact ? '#10B981' : isOver ? '#EF4444' : '#F59E0B';
      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; background: rgba(255,255,255,0.04); border-radius: 6px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="width: 10px; height: 10px; border-radius: 50%; background: ${c.code};"></span>
            <span>${c.name}</span>
          </div>
          <span style="font-weight: 700; color: ${colorStyle}; font-family: var(--font-mono);">
            ${count}/9
          </span>
        </div>
      `;
    }).join('');

    // Validation Status
    const valResult = validateCube(cubeState);
    const valBox = container.querySelector('#validation-box');
    const solveBtn = container.querySelector('#btn-solve-now');

    if (valResult.valid) {
      valBox.style.background = 'rgba(16, 185, 129, 0.12)';
      valBox.style.border = '1px solid rgba(16, 185, 129, 0.3)';
      valBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; color: #34D399; font-weight: 700;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          Cube is 100% physically valid!
        </div>
        <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 4px;">
          Ready to calculate optimal solution with Kociemba engine.
        </div>
      `;
      solveBtn.disabled = false;
    } else {
      valBox.style.background = 'rgba(239, 68, 68, 0.12)';
      valBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      const firstError = valResult.errors[0]?.message || 'All faces must have valid colors';
      valBox.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; color: #F87171; font-weight: 700;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Notice: ${valResult.errors.length} issue(s) detected
        </div>
        <div style="color: var(--text-secondary); font-size: 0.85rem; margin-top: 4px;">
          ${firstError}
        </div>
      `;
      solveBtn.disabled = true;
    }

    // Save in sharedState
    sharedState.cubeState = cloneCube(cubeState);
  }

  // Palette button events
  container.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedColor = btn.dataset.color;
      container.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      container.querySelector('#selected-color-name').textContent = selectedColor;
    });
  });

  // Face tab clicks
  container.querySelectorAll('.face-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      activeFaceIndex = parseInt(tab.dataset.faceIndex, 10);
      updateUI();
    });
  });

  // Next / Prev Face
  container.querySelector('#next-face-btn').addEventListener('click', () => {
    activeFaceIndex = (activeFaceIndex + 1) % 6;
    updateUI();
  });

  container.querySelector('#prev-face-btn').addEventListener('click', () => {
    activeFaceIndex = (activeFaceIndex - 1 + 6) % 6;
    updateUI();
  });

  // Reset 3D Camera
  container.querySelector('#btn-reset-3d-cam').addEventListener('click', () => {
    renderer.resetView();
  });

  // Keyboard Shortcuts (1-6 for colors, Arrow keys for faces)
  const keyHandler = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key;

    if (key === '1' || key === 'w' || key === 'W') {
      selectedColor = 'white';
    } else if (key === '2' || key === 'y' || key === 'Y') {
      selectedColor = 'yellow';
    } else if (key === '3' || key === 'r' || key === 'R') {
      selectedColor = 'red';
    } else if (key === '4' || key === 'o' || key === 'O') {
      selectedColor = 'orange';
    } else if (key === '5' || key === 'g' || key === 'G') {
      selectedColor = 'green';
    } else if (key === '6' || key === 'b' || key === 'B') {
      selectedColor = 'blue';
    } else if (key === 'ArrowRight') {
      activeFaceIndex = (activeFaceIndex + 1) % 6;
    } else if (key === 'ArrowLeft') {
      activeFaceIndex = (activeFaceIndex - 1 + 6) % 6;
    } else {
      return;
    }

    container.querySelectorAll('.palette-btn').forEach(b => {
      b.classList.toggle('selected', b.dataset.color === selectedColor);
    });
    container.querySelector('#selected-color-name').textContent = selectedColor;
    updateUI();
  };

  window.addEventListener('keydown', keyHandler);

  // Presets
  container.querySelector('#btn-preset-solved').addEventListener('click', () => {
    cubeState = createSolvedCube();
    renderer.setState(cubeState);
    updateUI();
  });

  container.querySelector('#btn-preset-scramble').addEventListener('click', () => {
    const scramble = solverManager.generateRandomScramble(16);
    cubeState = scramble.state;
    renderer.setState(cubeState);
    updateUI();
    analytics.trackEvent('scramble_loaded', { moves: scramble.algorithm });
  });

  container.querySelector('#btn-clear-all').addEventListener('click', () => {
    cubeState = createSolvedCube();
    renderer.setState(cubeState);
    updateUI();
  });

  // Solve Button Action
  container.querySelector('#btn-solve-now').addEventListener('click', () => {
    const val = validateCube(cubeState);
    if (!val.valid) return;

    sharedState.cubeState = cloneCube(cubeState);
    router.navigate('/solution');
  });

  // Initial draw
  updateUI();

  return () => {
    window.removeEventListener('keydown', keyHandler);
    renderer.destroy();
  };
}
