/**
 * Landing Page Component
 * 
 * Features:
 * - Hero banner with live interactive 3D cube
 * - "Solve My Cube" and "Beginner Guide" CTAs
 * - One-click Scramble & Auto-Solve demo right in the hero
 * - Feature showcases with rich glassmorphism cards
 */

import { CubeRenderer } from '../3d/cube-renderer.js';
import { CubeAnimator } from '../3d/cube-animator.js';
import { solverManager } from '../solver/solver-manager.js';
import { createSolvedCube } from '../cube/cube-state.js';
import { analytics } from './analytics.js';

export function renderLandingPage(container, router) {
  analytics.trackEvent('page_view', { page: 'landing' });

  container.innerHTML = `
    <div class="view-container animate-fade-in" style="gap: 40px; padding-top: 10px;">
      <!-- Hero Section -->
      <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 32px; align-items: center;">
        <div style="display: flex; flex-direction: column; gap: 20px;">
          <div style="display: inline-flex; align-items: center; gap: 8px; width: fit-content; padding: 6px 14px; background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 9999px; font-size: 0.85rem; color: #60A5FA; font-weight: 600;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px #10B981;"></span>
            Instant 3×3 Rubik's Cube Solver Engine
          </div>

          <h1 style="font-size: clamp(2.4rem, 5vw, 3.8rem); font-weight: 800; line-height: 1.1; letter-spacing: -0.03em;">
            Solve Your Cube in <span style="background: linear-gradient(135deg, #60A5FA 0%, #A78BFA 50%, #F472B6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Under 22 Moves</span>
          </h1>

          <p style="color: var(--text-secondary); font-size: 1.15rem; max-width: 520px; line-height: 1.6;">
            Enter your cube's colors face-by-face or in 3D. Our algorithm computes the shortest solution in milliseconds with step-by-step interactive 3D playback.
          </p>

          <div style="display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px;">
            <button id="hero-solve-btn" class="btn btn-primary btn-lg" style="box-shadow: var(--shadow-glow-blue);">
              <span>Solve My Cube</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </button>
            <button id="hero-manual-btn" class="btn btn-secondary btn-lg">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
              <span>Beginner Manual</span>
            </button>
          </div>

          <div style="display: flex; gap: 24px; margin-top: 16px; padding-top: 20px; border-top: 1px solid var(--border-subtle);">
            <div>
              <div style="font-size: 1.6rem; font-weight: 800; color: var(--text-primary);">~20</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Avg. Move Count</div>
            </div>
            <div style="width: 1px; background: var(--border-subtle);"></div>
            <div>
              <div style="font-size: 1.6rem; font-weight: 800; color: #10B981;">&lt; 50ms</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Solver Speed</div>
            </div>
            <div style="width: 1px; background: var(--border-subtle);"></div>
            <div>
              <div style="font-size: 1.6rem; font-weight: 800; color: #60A5FA;">100%</div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Free & No Sign-In</div>
            </div>
          </div>
        </div>

        <!-- Interactive 3D Cube Showcase -->
        <div class="card-glass" style="position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 440px; padding: 16px; border-radius: 28px; background: radial-gradient(circle at 50% 50%, rgba(30, 41, 59, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%);">
          <div id="hero-cube-container" style="width: 100%; height: 350px; cursor: grab;"></div>

          <!-- Interactive controls under cube -->
          <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; z-index: 10; margin-top: 10px;">
            <button id="hero-scramble-btn" class="btn btn-secondary btn-sm" title="Generate random scramble">
              🎲 Scramble Cube
            </button>
            <button id="hero-autosolve-btn" class="btn btn-primary btn-sm" title="Compute & auto-play solution">
              ⚡ Auto-Solve Demo
            </button>
            <button id="hero-reset-btn" class="btn btn-secondary btn-sm" title="Reset view">
              🔄 Reset
            </button>
          </div>
          <div id="hero-status" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; min-height: 20px;">
            Drag to rotate 3D cube in any angle
          </div>
        </div>
      </section>

      <!-- Features Showcase -->
      <section style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-top: 20px;">
        <div class="card-glass" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center; color: #60A5FA; font-size: 1.5rem;">
            ⚡
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 700;">Sub-Second Solver</h3>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">
            Powered by Kociemba's two-phase optimal algorithm running directly on your device via background Web Workers.
          </p>
        </div>

        <div class="card-glass" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; color: #34D399; font-size: 1.5rem;">
            🛡️
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 700;">8-Point Physical Parity Check</h3>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">
            Catches impossible cube configurations, twisted individual corners, flipped edges, and invalid color counts before solving.
          </p>
        </div>

        <div class="card-glass" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(245, 158, 11, 0.15); display: flex; align-items: center; justify-content: center; color: #FBBF24; font-size: 1.5rem;">
            🎬
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 700;">3D Media-Player Playback</h3>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">
            Step forward, step backward, scrub through moves, adjust speeds, and follow plain-English instructions with clear notation.
          </p>
        </div>

        <div class="card-glass" style="display: flex; flex-direction: column; gap: 12px;">
          <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(236, 72, 153, 0.15); display: flex; align-items: center; justify-content: center; color: #F472B6; font-size: 1.5rem;">
            🖨️
          </div>
          <h3 style="font-size: 1.2rem; font-weight: 700;">Printable Cheat Sheet</h3>
          <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5;">
            Export clean, printable step-by-step instructions so you can solve your cube away from screens.
          </p>
        </div>
      </section>
    </div>
  `;

  // Initialize Hero 3D Cube
  const cubeContainer = container.querySelector('#hero-cube-container');
  const renderer = new CubeRenderer(cubeContainer, { autoRotate: true });
  const animator = new CubeAnimator(renderer);

  let currentHeroState = createSolvedCube();
  renderer.setState(currentHeroState);

  // Wire buttons
  container.querySelector('#hero-solve-btn').addEventListener('click', () => {
    router.navigate('/input');
  });

  container.querySelector('#hero-manual-btn').addEventListener('click', () => {
    router.navigate('/manual');
  });

  const statusEl = container.querySelector('#hero-status');
  const scrambleBtn = container.querySelector('#hero-scramble-btn');
  const autoSolveBtn = container.querySelector('#hero-autosolve-btn');
  const resetBtn = container.querySelector('#hero-reset-btn');

  scrambleBtn.addEventListener('click', () => {
    renderer.controls.autoRotate = false;
    const scramble = solverManager.generateRandomScramble(14);
    currentHeroState = scramble.state;
    renderer.setState(currentHeroState);
    statusEl.textContent = `Scrambled with: ${scramble.algorithm}`;
    analytics.trackEvent('hero_scramble');
  });

  autoSolveBtn.addEventListener('click', async () => {
    renderer.controls.autoRotate = false;
    statusEl.textContent = 'Calculating optimal solution...';
    try {
      const solution = await solverManager.solve(currentHeroState);
      if (solution.alreadySolved) {
        statusEl.textContent = 'Cube is already solved! Try scrambling it first.';
        return;
      }
      statusEl.textContent = `Solution found: ${solution.totalMoves} moves in ${solution.solveTimeMs}ms! Playing...`;
      animator.setSolution(solution);
      animator.setSpeed(1.5);
      animator.play();
    } catch (err) {
      statusEl.textContent = 'Error solving: ' + err.message;
    }
  });

  resetBtn.addEventListener('click', () => {
    animator.pause();
    currentHeroState = createSolvedCube();
    renderer.setState(currentHeroState);
    renderer.resetView();
    renderer.controls.autoRotate = true;
    statusEl.textContent = 'Drag to rotate 3D cube in any angle';
  });

  // Cleanup handler when navigating away
  return () => {
    animator.destroy();
    renderer.destroy();
  };
}
