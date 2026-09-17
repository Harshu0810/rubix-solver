/**
 * Solution Player Page Component
 * 
 * Features:
 * - Media-player style 3D playback (Play, Pause, Step Forward, Step Back, Jump)
 * - Clickable scrubber & move sequence chips
 * - Human-readable move instructions with notation badges
 * - Speed control (0.5x to 2x)
 * - Print / Cheat Sheet export
 * - Solved celebration banner with confetti
 */

import { CubeRenderer } from '../3d/cube-renderer.js';
import { CubeAnimator } from '../3d/cube-animator.js';
import { solverManager } from '../solver/solver-manager.js';
import { createSolvedCube, cloneCube } from '../cube/cube-state.js';
import { analytics } from './analytics.js';
import { authService } from '../utils/auth-service.js';
import { showAuthModal } from '../components/auth-modal.js';

export function renderSolutionPlayerPage(container, router, sharedState = {}) {
  analytics.trackEvent('page_view', { page: 'solution' });

  let cubeState = sharedState.cubeState;
  if (!cubeState) {
    // Generate default scramble if user navigated directly
    const scramble = solverManager.generateRandomScramble(14);
    cubeState = scramble.state;
    sharedState.cubeState = cubeState;
  }

  container.innerHTML = `
    <div class="view-container animate-fade-in" style="gap: 20px;">
      <!-- Header -->
      <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px;">
        <div>
          <h1 style="font-size: 1.8rem; font-weight: 800; letter-spacing: -0.02em;">3D Solution Navigator</h1>
          <p id="solver-subtitle" style="color: var(--text-secondary); font-size: 0.95rem;">
            Calculating shortest path to solved state...
          </p>
        </div>

        <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <button id="btn-print-sheet" class="btn btn-primary btn-sm" title="Download & print solution document (free account required)">
            📥 Download / Print Guide
          </button>
          <button id="btn-back-input" class="btn btn-secondary btn-sm">
            ✏️ Edit Colors
          </button>
          <button id="btn-feedback" class="btn btn-primary btn-sm">
            ⭐ Rate Tool
          </button>
        </div>
      </div>

      <!-- Main Layout: 3D Stage on Left, Player Timeline on Right -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 24px; align-items: start;">
        
        <!-- 3D Cube Canvas Card -->
        <div class="card-glass" style="display: flex; flex-direction: column; align-items: center; position: relative; min-height: 420px; padding: 16px;">
          <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div id="step-badge-counter" style="font-size: 0.9rem; font-weight: 700; color: #60A5FA; background: rgba(59,130,246,0.15); padding: 4px 12px; border-radius: var(--radius-full); border: 1px solid rgba(59,130,246,0.3);">
              Step 0 of 0
            </div>
            <button id="btn-reset-cam" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; padding: 4px 8px;">
              Reset View
            </button>
          </div>

          <div id="solution-cube-container" style="width: 100%; height: 350px; cursor: grab;"></div>

          <!-- Celebration Overlay (Hidden until solved) -->
          <div id="celebration-overlay" style="display: none; position: absolute; inset: 12px; background: rgba(12, 17, 28, 0.92); backdrop-filter: blur(12px); border-radius: 18px; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 24px; z-index: 50;">
            <div style="font-size: 3.2rem; margin-bottom: 8px;">🎉</div>
            <h2 style="font-size: 1.8rem; font-weight: 800; color: #34D399; margin-bottom: 8px;">
              Cube Completely Solved!
            </h2>
            <p id="celebration-summary" style="color: var(--text-secondary); font-size: 0.95rem; max-width: 320px; margin-bottom: 20px;">
              All 6 faces aligned in 20 moves.
            </p>
            <div style="display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;">
              <button id="celebration-replay-btn" class="btn btn-secondary btn-sm">
                🔄 Replay Solution
              </button>
              <button id="celebration-feedback-btn" class="btn btn-success btn-sm">
                ⭐ Leave Feedback
              </button>
            </div>
          </div>
        </div>

        <!-- Media Player Controls & Instructions -->
        <div style="display: flex; flex-direction: column; gap: 20px;">
          
          <!-- Current Step Instruction Card -->
          <div class="card-glass" style="display: flex; flex-direction: column; gap: 16px; padding: 20px;">
            <div style="display: flex; align-items: center; gap: 16px;">
              <div id="move-badge-display" class="move-badge">
                --
              </div>
              <div>
                <div id="move-direction-title" style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary);">
                  Ready to start
                </div>
                <div id="move-english-text" style="color: var(--text-secondary); font-size: 0.95rem; margin-top: 2px;">
                  Click Play or Next Step to begin solving.
                </div>
              </div>
            </div>

            <!-- Progress Bar -->
            <div style="display: flex; flex-direction: column; gap: 6px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted);">
                <span>Progress</span>
                <span id="progress-percent-label">0%</span>
              </div>
              <div id="progress-track" style="width: 100%; height: 8px; background: rgba(255,255,255,0.08); border-radius: 9999px; overflow: hidden; cursor: pointer;">
                <div id="progress-bar-fill" style="width: 0%; height: 100%; background: linear-gradient(90deg, #3B82F6 0%, #10B981 100%); transition: width 0.2s ease;"></div>
              </div>
            </div>

            <!-- Player Controls -->
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 4px;">
              <div style="display: flex; gap: 6px;">
                <button id="btn-jump-start" class="btn btn-secondary btn-sm" title="Jump to start">
                  ⏮
                </button>
                <button id="btn-prev-step" class="btn btn-secondary btn-sm" title="Previous step">
                  ◀
                </button>
              </div>

              <button id="btn-play-pause" class="btn btn-primary btn-lg" style="padding: 10px 24px; border-radius: var(--radius-full);">
                <span id="play-pause-icon">▶</span>
                <span id="play-pause-text" style="font-size: 0.95rem;">Play</span>
              </button>

              <div style="display: flex; gap: 6px;">
                <button id="btn-next-step" class="btn btn-secondary btn-sm" title="Next step">
                  ▶
                </button>
                <button id="btn-jump-end" class="btn btn-secondary btn-sm" title="Jump to end">
                  ⏭
                </button>
              </div>
            </div>

            <!-- Playback Speed -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 10px; border-top: 1px solid var(--border-subtle); font-size: 0.85rem;">
              <span style="color: var(--text-muted); font-weight: 600;">Animation Speed:</span>
              <div style="display: flex; gap: 4px;">
                ${['0.5x', '1x', '1.5x', '2x'].map((s, idx) => `
                  <button class="speed-btn btn btn-sm ${idx === 1 ? 'active' : ''}" data-speed="${parseFloat(s)}" style="padding: 4px 10px; font-size: 0.8rem; background: ${idx === 1 ? 'rgba(59,130,246,0.2)' : 'transparent'};">
                    ${s}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Move Chips Sequence List -->
          <div class="card-glass" style="display: flex; flex-direction: column; gap: 12px; padding: 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 700; font-size: 0.9rem; color: var(--text-secondary);">
                Full Algorithm (<span id="total-moves-count">0</span> moves)
              </span>
              <span style="font-size: 0.75rem; color: var(--text-muted);">
                Click any move to jump
              </span>
            </div>

            <div id="moves-chips-container" style="display: flex; flex-wrap: wrap; gap: 8px; max-height: 160px; overflow-y: auto; padding-right: 4px;">
              <!-- Filled via JS -->
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  // 3D Renderer & Animator Init
  const cubeContainer = container.querySelector('#solution-cube-container');
  const renderer = new CubeRenderer(cubeContainer);
  const animator = new CubeAnimator(renderer);

  let currentSolution = null;

  // DOM elements
  const subtitleEl = container.querySelector('#solver-subtitle');
  const stepCounterEl = container.querySelector('#step-badge-counter');
  const moveBadgeEl = container.querySelector('#move-badge-display');
  const directionTitleEl = container.querySelector('#move-direction-title');
  const englishTextEl = container.querySelector('#move-english-text');
  const progressPercentEl = container.querySelector('#progress-percent-label');
  const progressBarFillEl = container.querySelector('#progress-bar-fill');
  const playPauseBtn = container.querySelector('#btn-play-pause');
  const playPauseIcon = container.querySelector('#play-pause-icon');
  const playPauseText = container.querySelector('#play-pause-text');
  const movesChipsEl = container.querySelector('#moves-chips-container');
  const totalMovesCountEl = container.querySelector('#total-moves-count');
  const celebrationOverlay = container.querySelector('#celebration-overlay');
  const celebrationSummary = container.querySelector('#celebration-summary');

  function updateStepUI(info) {
    const { stepIndex, totalSteps, currentStep, nextStep, isAtEnd, progress } = info;

    stepCounterEl.textContent = `Step ${stepIndex} of ${totalSteps}`;
    const pct = Math.round(progress * 100);
    progressPercentEl.textContent = `${pct}%`;
    progressBarFillEl.style.width = `${pct}%`;

    if (isAtEnd && totalSteps > 0) {
      moveBadgeEl.textContent = '✓';
      moveBadgeEl.style.color = '#34D399';
      moveBadgeEl.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      directionTitleEl.textContent = 'Cube Solved!';
      englishTextEl.textContent = 'All faces are perfectly aligned and restored.';
      celebrationOverlay.style.display = 'flex';
      celebrationSummary.textContent = `Completed in ${totalSteps} optimal moves!`;
      triggerConfetti();
    } else if (nextStep) {
      celebrationOverlay.style.display = 'none';
      moveBadgeEl.textContent = nextStep.move;
      moveBadgeEl.style.color = '#60A5FA';
      moveBadgeEl.style.borderColor = 'rgba(59, 130, 246, 0.4)';
      directionTitleEl.textContent = `Move: ${nextStep.move} (${nextStep.faceName} face)`;
      englishTextEl.textContent = nextStep.text;
    } else {
      celebrationOverlay.style.display = 'none';
      moveBadgeEl.textContent = '--';
      directionTitleEl.textContent = 'Ready to solve';
      englishTextEl.textContent = 'Click Play to begin step 1.';
    }

    // Highlight active chip
    container.querySelectorAll('.move-chip').forEach((chip, i) => {
      if (i === stepIndex) {
        chip.style.background = 'rgba(59, 130, 246, 0.4)';
        chip.style.borderColor = '#60A5FA';
        chip.style.color = '#FFFFFF';
        chip.scrollIntoView({ block: 'nearest', inline: 'center' });
      } else if (i < stepIndex) {
        chip.style.background = 'rgba(16, 185, 129, 0.15)';
        chip.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        chip.style.color = '#34D399';
      } else {
        chip.style.background = 'rgba(255, 255, 255, 0.05)';
        chip.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        chip.style.color = 'var(--text-secondary)';
      }
    });
  }

  animator.options.onStepChange = updateStepUI;

  animator.options.onPlayStateChange = (playing) => {
    if (playing) {
      playPauseIcon.textContent = '⏸';
      playPauseText.textContent = 'Pause';
      playPauseBtn.classList.remove('btn-primary');
      playPauseBtn.classList.add('btn-secondary');
    } else {
      playPauseIcon.textContent = '▶';
      playPauseText.textContent = 'Play';
      playPauseBtn.classList.remove('btn-secondary');
      playPauseBtn.classList.add('btn-primary');
    }
  };

  animator.options.onComplete = () => {
    // Already handled in updateStepUI
  };

  // Solve the cube
  async function computeAndLoadSolution() {
    try {
      subtitleEl.textContent = 'Calculating solution with Kociemba solver...';
      const solution = await solverManager.solve(cubeState);
      currentSolution = solution;
      sharedState.lastSolution = solution;

      if (solution.alreadySolved) {
        subtitleEl.textContent = 'Cube is already solved! No moves needed.';
        renderer.setState(cubeState);
        updateStepUI({
          stepIndex: 0,
          totalSteps: 0,
          currentStep: null,
          nextStep: null,
          isAtEnd: true,
          progress: 1,
        });
        return;
      }

      subtitleEl.textContent = `Optimal solution: ${solution.totalMoves} moves calculated in ${solution.solveTimeMs}ms`;
      totalMovesCountEl.textContent = solution.totalMoves;

      // Populate move chips
      movesChipsEl.innerHTML = solution.moves.map((m, i) => `
        <button class="move-chip btn btn-sm" data-step-index="${i}" style="font-family: var(--font-mono); font-weight: 700; padding: 4px 10px; border-radius: 8px;">
          ${m}
        </button>
      `).join('');

      container.querySelectorAll('.move-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const idx = parseInt(chip.dataset.stepIndex, 10);
          animator.goToStep(idx);
        });
      });

      animator.setSolution(solution);
      analytics.recordSolve({
        moveCount: solution.totalMoves,
        solveTimeMs: solution.solveTimeMs,
        rawSolution: solution.rawSolution,
        wasValid: true,
      });

    } catch (err) {
      subtitleEl.textContent = 'Error computing solution: ' + err.message;
      console.error(err);
    }
  }

  computeAndLoadSolution();

  // Controls Event Listeners
  playPauseBtn.addEventListener('click', () => {
    animator.togglePlay();
  });

  container.querySelector('#btn-next-step').addEventListener('click', () => {
    animator.pause();
    animator.stepForward();
  });

  container.querySelector('#btn-prev-step').addEventListener('click', () => {
    animator.pause();
    animator.stepBackward();
  });

  container.querySelector('#btn-jump-start').addEventListener('click', () => {
    animator.goToStep(0);
  });

  container.querySelector('#btn-jump-end').addEventListener('click', () => {
    if (currentSolution) {
      animator.goToStep(currentSolution.steps.length);
    }
  });

  container.querySelector('#btn-reset-cam').addEventListener('click', () => {
    renderer.resetView();
  });

  // Speed buttons
  container.querySelectorAll('.speed-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const spd = parseFloat(btn.dataset.speed);
      animator.setSpeed(spd);
      container.querySelectorAll('.speed-btn').forEach(b => {
        b.style.background = 'transparent';
        b.classList.remove('active');
      });
      btn.classList.add('active');
      btn.style.background = 'rgba(59, 130, 246, 0.2)';
    });
  });

  // Action Buttons
  container.querySelector('#btn-back-input').addEventListener('click', () => {
    animator.pause();
    router.navigate('/input');
  });

  container.querySelector('#btn-feedback').addEventListener('click', () => {
    animator.pause();
    router.navigate('/feedback');
  });

  const handleDownloadSolution = async () => {
    animator.pause();
    if (!currentSolution) return;
    sharedState.lastSolution = currentSolution;

    if (!authService.isSignedIn()) {
      try {
        await showAuthModal({
          title: 'Sign In to Download Solution',
          subtitle: 'Create a free account or sign in to download your custom solution guide and cheat sheet.',
          initialMode: 'signin',
        });
        router.navigate('/print');
      } catch (err) {
        // Modal closed by user
      }
    } else {
      router.navigate('/print');
    }
  };

  container.querySelector('#btn-print-sheet')?.addEventListener('click', handleDownloadSolution);

  container.querySelector('#celebration-replay-btn')?.addEventListener('click', () => {
    animator.goToStep(0);
  });

  container.querySelector('#celebration-feedback-btn')?.addEventListener('click', () => {
    router.navigate('/feedback');
  });

  function triggerConfetti() {
    const canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    document.body.appendChild(canvas);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');

    const particles = [];
    const colors = ['#EF4444', '#FACC15', '#3B82F6', '#10B981', '#F97316', '#FFFFFF'];

    for (let i = 0; i < 120; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.7) * 18,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        vr: (Math.random() - 0.5) * 12,
        alpha: 1,
      });
    }

    let frame = 0;
    const animateConfetti = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.4; // gravity
        p.rotation += p.vr;
        p.alpha -= 0.012;

        if (p.alpha > 0) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
          ctx.restore();
        }
      }

      if (alive && frame < 150) {
        requestAnimationFrame(animateConfetti);
      } else {
        canvas.remove();
      }
    };

    animateConfetti();
  }

  return () => {
    animator.destroy();
    renderer.destroy();
    document.getElementById('confetti-canvas')?.remove();
  };
}
