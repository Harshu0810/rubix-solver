/**
 * Rubik's Cube Solver Web Worker
 * 
 * Runs Kociemba two-phase solver (cubejs) in a separate background thread
 * so the main UI thread never blocks during table generation or solve computation.
 */

import Cube from './vendor/cubejs/index.js';

let isInitialized = false;
let isInitializing = false;

function init() {
  if (isInitialized || isInitializing) return;
  isInitializing = true;
  try {
    const t0 = performance.now();
    Cube.initSolver();
    isInitialized = true;
    isInitializing = false;
    const duration = Math.round(performance.now() - t0);
    self.postMessage({ type: 'ready', initDuration: duration });
  } catch (err) {
    isInitializing = false;
    self.postMessage({ type: 'init_error', error: err.message || String(err) });
  }
}

// Start table pre-computation immediately in background
init();

self.onmessage = function (event) {
  const data = event.data || {};
  const { id, type, facelet } = data;

  if (type === 'init') {
    init();
    return;
  }

  if (type === 'solve') {
    try {
      if (!isInitialized) {
        init();
      }

      const t0 = performance.now();
      const cube = Cube.fromString(facelet);
      const solution = cube.solve();
      const duration = Math.round(performance.now() - t0);

      self.postMessage({
        id,
        type: 'solution',
        solution,
        duration,
      });
    } catch (err) {
      self.postMessage({
        id,
        type: 'error',
        error: err.message || String(err),
      });
    }
  }
};
