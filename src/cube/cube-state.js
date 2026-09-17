/**
 * Rubik's Cube State Model
 * 
 * Canonical representation: 6 faces × 9 stickers = 54 values
 * Face indexing (looking at face):
 *   0 1 2
 *   3 4 5
 *   6 7 8
 * 
 * Center = index 4 (always fixed, defines face color)
 * 
 * Standard orientation:
 *   U = Up (White)    D = Down (Yellow)
 *   F = Front (Green)  B = Back (Blue)
 *   L = Left (Orange)  R = Right (Red)
 */

// ─── Color Constants ───
export const COLORS = {
  W: 'white',
  Y: 'yellow',
  R: 'red',
  O: 'orange',
  B: 'blue',
  G: 'green',
};

export const COLOR_CODES = {
  white:  '#FFFFFF',
  yellow: '#FFD500',
  red:    '#B71234',
  orange: '#FF5800',
  blue:   '#0046AD',
  green:  '#009B48',
};

export const COLOR_LABELS = {
  white:  'W',
  yellow: 'Y',
  red:    'R',
  orange: 'O',
  blue:   'B',
  green:  'G',
};

// ─── Face Constants ───
export const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];

export const FACE_NAMES = {
  U: 'Up',
  R: 'Right',
  F: 'Front',
  D: 'Down',
  L: 'Left',
  B: 'Back',
};

// Default center colors (standard Western color scheme)
export const DEFAULT_CENTERS = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
};

/**
 * Creates a solved cube state
 * @returns {Object} CubeState with 6 faces, each an array of 9 color strings
 */
export function createSolvedCube() {
  const state = {};
  for (const face of FACES) {
    state[face] = Array(9).fill(DEFAULT_CENTERS[face]);
  }
  return state;
}

/**
 * Creates an empty cube state (all null)
 * @returns {Object} CubeState with 6 faces, each an array of 9 nulls
 */
export function createEmptyCube() {
  const state = {};
  for (const face of FACES) {
    state[face] = Array(9).fill(null);
  }
  return state;
}

/**
 * Deep clone a cube state
 * @param {Object} state 
 * @returns {Object} cloned state
 */
export function cloneCube(state) {
  const clone = {};
  for (const face of FACES) {
    clone[face] = [...state[face]];
  }
  return clone;
}

/**
 * Check if two cube states are identical
 * @param {Object} a 
 * @param {Object} b 
 * @returns {boolean}
 */
export function cubesEqual(a, b) {
  for (const face of FACES) {
    for (let i = 0; i < 9; i++) {
      if (a[face][i] !== b[face][i]) return false;
    }
  }
  return true;
}

/**
 * Serialize cube state to a compact 54-char string
 * Uses first letter of each color
 * @param {Object} state
 * @returns {string}
 */
export function serializeCube(state) {
  let str = '';
  for (const face of FACES) {
    for (let i = 0; i < 9; i++) {
      str += COLOR_LABELS[state[face][i]] || '?';
    }
  }
  return str;
}

/**
 * Get all 54 stickers as a flat array
 * Order: U0-8, R0-8, F0-8, D0-8, L0-8, B0-8
 * @param {Object} state
 * @returns {string[]}
 */
export function getFlatStickers(state) {
  const stickers = [];
  for (const face of FACES) {
    stickers.push(...state[face]);
  }
  return stickers;
}
