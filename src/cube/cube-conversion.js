/**
 * Rubik's Cube Notation & Conversion Utilities
 * 
 * Converts between our canonical CubeState (object with faces U,R,F,D,L,B each holding 9 color strings)
 * and the 54-character URFDLB facelet string used by the Kociemba two-phase solver (cubejs).
 */

import { FACES, DEFAULT_CENTERS } from './cube-state.js';

/**
 * Converts a CubeState into a 54-character facelet string formatted for cubejs.
 * In cubejs, characters must be 'U', 'R', 'F', 'D', 'L', 'B' representing the face
 * that each sticker belongs to based on the center stickers.
 * 
 * Facelet ordering:
 * U1-U9, R1-R9, F1-F9, D1-D9, L1-L9, B1-B9
 * 
 * @param {Object} state - Canonical CubeState
 * @returns {string} 54-character facelet string
 */
export function cubeStateToFacelet(state) {
  // Map each color to its corresponding face character based on center stickers (index 4)
  const colorToFace = {};
  for (const face of FACES) {
    const centerColor = state[face][4];
    if (centerColor) {
      colorToFace[centerColor] = face;
    }
  }

  // If any center was not found or colors are missing, fall back to default centers
  for (const face of FACES) {
    const defaultColor = DEFAULT_CENTERS[face];
    if (!colorToFace[defaultColor]) {
      colorToFace[defaultColor] = face;
    }
  }

  let faceletStr = '';
  for (const face of FACES) {
    for (let i = 0; i < 9; i++) {
      const color = state[face][i];
      const faceChar = colorToFace[color];
      faceletStr += faceChar || '?';
    }
  }

  return faceletStr;
}

/**
 * Converts a 54-character facelet string back into a canonical CubeState.
 * 
 * @param {string} faceletStr - 54-character string with U, R, F, D, L, B
 * @param {Object} [centers] - Optional mapping of face to color name. Defaults to DEFAULT_CENTERS.
 * @returns {Object} Canonical CubeState
 */
export function faceletToCubeState(faceletStr, centers = DEFAULT_CENTERS) {
  if (faceletStr.length !== 54) {
    throw new Error(`Facelet string must be exactly 54 characters, got ${faceletStr.length}`);
  }

  const state = {};
  let idx = 0;

  for (const face of FACES) {
    state[face] = [];
    for (let i = 0; i < 9; i++) {
      const faceChar = faceletStr[idx++];
      const color = centers[faceChar] || DEFAULT_CENTERS[faceChar] || 'white';
      state[face].push(color);
    }
  }

  return state;
}

/**
 * Normalizes algorithm string (cleans up whitespace, standardizes apostrophes/primes)
 * @param {string} algorithm
 * @returns {string}
 */
export function normalizeAlgorithm(algorithm) {
  if (!algorithm) return '';
  return algorithm
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}
