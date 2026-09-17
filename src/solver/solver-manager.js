/**
 * Rubik's Cube Solver Manager
 * 
 * Manages background worker communication with fallback to main thread.
 * Translates raw solver output into step-by-step solution objects with:
 * - Move notation (e.g. "R'")
 * - Face name & turn direction
 * - Plain English instruction
 * - Intermediate CubeState before and after each move
 */

import Cube from './vendor/cubejs/index.js';
import { cubeStateToFacelet } from '../cube/cube-conversion.js';
import { applyMove, getMoveInstruction, isSolved } from '../cube/cube-moves.js';
import { cloneCube, createSolvedCube } from '../cube/cube-state.js';

class SolverManager {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.initCallbacks = [];
    this.pendingRequests = new Map();
    this.requestId = 0;
    this.useFallback = false;

    this.initWorker();
  }

  initWorker() {
    try {
      if (typeof Worker !== 'undefined') {
        this.worker = new Worker(new URL('./solver-worker.js', import.meta.url), {
          type: 'module',
        });

        this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
        this.worker.onerror = (err) => {
          console.warn('Worker error, switching to main-thread fallback:', err);
          this.useFallback = true;
          this.initMainThread();
        };
      } else {
        this.useFallback = true;
        this.initMainThread();
      }
    } catch (err) {
      console.warn('Worker init failed, switching to main-thread fallback:', err);
      this.useFallback = true;
      this.initMainThread();
    }
  }

  handleWorkerMessage(data) {
    if (data.type === 'ready') {
      this.isReady = true;
      console.log(`Solver Worker ready (initialized in ${data.initDuration}ms)`);
      this.initCallbacks.forEach(cb => cb(true));
      this.initCallbacks = [];
      return;
    }

    if (data.type === 'init_error') {
      console.warn('Worker init error:', data.error);
      this.useFallback = true;
      this.initMainThread();
      return;
    }

    const { id, type, solution, duration, error } = data;
    if (this.pendingRequests.has(id)) {
      const { resolve, reject } = this.pendingRequests.get(id);
      this.pendingRequests.delete(id);

      if (type === 'solution') {
        resolve({ solution, duration });
      } else {
        reject(new Error(error || 'Failed to solve cube'));
      }
    }
  }

  initMainThread() {
    setTimeout(() => {
      try {
        Cube.initSolver();
        this.isReady = true;
        this.initCallbacks.forEach(cb => cb(true));
        this.initCallbacks = [];
      } catch (err) {
        console.error('Failed to init solver on main thread:', err);
      }
    }, 100);
  }

  /**
   * Waits until the solver tables are ready
   * @returns {Promise<boolean>}
   */
  waitForReady() {
    if (this.isReady) return Promise.resolve(true);
    return new Promise((resolve) => {
      this.initCallbacks.push(resolve);
    });
  }

  /**
   * Solves a CubeState and generates rich step-by-step playback data
   * @param {Object} cubeState - 6-face canonical state
   * @returns {Promise<Object>} Solution details
   */
  async solve(cubeState) {
    if (isSolved(cubeState)) {
      return {
        solved: true,
        alreadySolved: true,
        moves: [],
        steps: [],
        totalMoves: 0,
        solveTimeMs: 0,
        rawSolution: '',
      };
    }

    const facelet = cubeStateToFacelet(cubeState);

    let rawSolution = '';
    let solveTimeMs = 0;

    if (!this.useFallback && this.worker) {
      const id = ++this.requestId;
      const result = await new Promise((resolve, reject) => {
        this.pendingRequests.set(id, { resolve, reject });
        this.worker.postMessage({ id, type: 'solve', facelet });
      });
      rawSolution = result.solution;
      solveTimeMs = result.duration;
    } else {
      // Main-thread solve fallback
      if (!this.isReady) {
        Cube.initSolver();
        this.isReady = true;
      }
      const t0 = performance.now();
      const cube = Cube.fromString(facelet);
      rawSolution = cube.solve();
      solveTimeMs = Math.round(performance.now() - t0);
    }

    const moves = rawSolution.trim().split(/\s+/).filter(m => m.length > 0);

    // Build step-by-step timeline with snapshots
    const steps = [];
    let currentState = cloneCube(cubeState);

    moves.forEach((moveStr, index) => {
      const stateBefore = cloneCube(currentState);
      currentState = applyMove(currentState, moveStr);
      const stateAfter = cloneCube(currentState);
      const instruction = getMoveInstruction(moveStr);

      steps.push({
        stepNumber: index + 1,
        totalSteps: moves.length,
        move: moveStr,
        face: instruction.face,
        faceName: instruction.faceName,
        direction: instruction.direction,
        text: instruction.instruction,
        stateBefore,
        stateAfter,
      });
    });

    return {
      solved: true,
      alreadySolved: false,
      moves,
      steps,
      totalMoves: moves.length,
      solveTimeMs,
      rawSolution,
      initialState: cloneCube(cubeState),
      finalState: currentState,
    };
  }

  /**
   * Generates a random valid scramble sequence
   * @param {number} moveCount - number of random moves (default 20)
   * @returns {{algorithm: string, state: Object}}
   */
  generateRandomScramble(moveCount = 20) {
    const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    const moves = [];
    let lastFace = '';

    for (let i = 0; i < moveCount; i++) {
      let face;
      do {
        face = faces[Math.floor(Math.random() * faces.length)];
      } while (face === lastFace);

      lastFace = face;
      const mod = modifiers[Math.floor(Math.random() * modifiers.length)];
      moves.push(face + mod);
    }

    const algorithm = moves.join(' ');
    let state = createSolvedCube();
    for (const m of moves) {
      state = applyMove(state, m);
    }

    return { algorithm, state, moves };
  }
}

// Export singleton instance
export const solverManager = new SolverManager();
export default solverManager;
