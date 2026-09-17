/**
 * Rubik's Cube Move Engine
 * 
 * Implements all 18 standard moves:
 * U, U', U2, D, D', D2, L, L', L2, R, R', R2, F, F', F2, B, B', B2
 * 
 * Each move is defined by which stickers cycle.
 * A clockwise face rotation cycles: 0→2→8→6, 1→5→7→3 (the face itself)
 * Plus 12 adjacent stickers from neighboring faces.
 */

import { FACES, cloneCube, createSolvedCube, cubesEqual } from './cube-state.js';

/**
 * Rotate a face's 9 stickers clockwise
 * @param {string[]} face - 9-element array
 * @returns {string[]} rotated face
 */
function rotateFaceCW(face) {
  return [
    face[6], face[3], face[0],
    face[7], face[4], face[1],
    face[8], face[5], face[2],
  ];
}

/**
 * Rotate a face's 9 stickers counter-clockwise
 * @param {string[]} face - 9-element array
 * @returns {string[]} rotated face
 */
function rotateFaceCCW(face) {
  return [
    face[2], face[5], face[8],
    face[1], face[4], face[7],
    face[0], face[3], face[6],
  ];
}

/**
 * Cycle four values: a→b→c→d→a (clockwise)
 */
function cycle4(state, a, b, c, d) {
  const temp = state[d[0]][d[1]];
  state[d[0]][d[1]] = state[c[0]][c[1]];
  state[c[0]][c[1]] = state[b[0]][b[1]];
  state[b[0]][b[1]] = state[a[0]][a[1]];
  state[a[0]][a[1]] = temp;
}

/**
 * Move definitions: each move rotates its face CW and cycles 3 groups of 4 adjacent stickers.
 * Adjacent cycles are defined as [face, index] tuples going clockwise.
 */
const MOVE_DEFS = {
  U: {
    face: 'U',
    adjacentCycles: [
      // Top row cycles: F→R→B→L (going clockwise when looking at U face)
      [['F', 0], ['L', 0], ['B', 0], ['R', 0]],
      [['F', 1], ['L', 1], ['B', 1], ['R', 1]],
      [['F', 2], ['L', 2], ['B', 2], ['R', 2]],
    ],
  },
  D: {
    face: 'D',
    adjacentCycles: [
      // Bottom row cycles: F→L→B→R (counter of U, but CW when looking at D from below)
      [['F', 6], ['R', 6], ['B', 6], ['L', 6]],
      [['F', 7], ['R', 7], ['B', 7], ['L', 7]],
      [['F', 8], ['R', 8], ['B', 8], ['L', 8]],
    ],
  },
  R: {
    face: 'R',
    adjacentCycles: [
      [['F', 2], ['U', 2], ['B', 6], ['D', 2]],
      [['F', 5], ['U', 5], ['B', 3], ['D', 5]],
      [['F', 8], ['U', 8], ['B', 0], ['D', 8]],
    ],
  },
  L: {
    face: 'L',
    adjacentCycles: [
      [['F', 0], ['D', 0], ['B', 8], ['U', 0]],
      [['F', 3], ['D', 3], ['B', 5], ['U', 3]],
      [['F', 6], ['D', 6], ['B', 2], ['U', 6]],
    ],
  },
  F: {
    face: 'F',
    adjacentCycles: [
      [['U', 6], ['R', 0], ['D', 2], ['L', 8]],
      [['U', 7], ['R', 3], ['D', 1], ['L', 5]],
      [['U', 8], ['R', 6], ['D', 0], ['L', 2]],
    ],
  },
  B: {
    face: 'B',
    adjacentCycles: [
      [['U', 2], ['L', 0], ['D', 6], ['R', 8]],
      [['U', 1], ['L', 3], ['D', 7], ['R', 5]],
      [['U', 0], ['L', 6], ['D', 8], ['R', 2]],
    ],
  },
};

/**
 * Apply a single base move (CW) to the cube state (mutates)
 * @param {Object} state - CubeState
 * @param {string} face - 'U','D','L','R','F','B'
 */
function applyBaseCW(state, face) {
  const def = MOVE_DEFS[face];
  // Rotate the face itself
  state[def.face] = rotateFaceCW(state[def.face]);
  // Cycle adjacent stickers
  for (const cycle of def.adjacentCycles) {
    cycle4(state, cycle[0], cycle[1], cycle[2], cycle[3]);
  }
}

/**
 * Apply a single base move (CCW) to the cube state (mutates)
 * @param {Object} state - CubeState
 * @param {string} face - 'U','D','L','R','F','B'
 */
function applyBaseCCW(state, face) {
  // CCW = 3× CW
  applyBaseCW(state, face);
  applyBaseCW(state, face);
  applyBaseCW(state, face);
}

/**
 * Parse a move notation string into {face, count}
 * Examples: "R" → {face:'R', count:1}, "R'" → {face:'R', count:3}, "R2" → {face:'R', count:2}
 * @param {string} moveStr
 * @returns {{face: string, count: number}}
 */
export function parseMove(moveStr) {
  const str = moveStr.trim();
  const face = str[0].toUpperCase();
  if (!FACES.includes(face)) {
    throw new Error(`Invalid move face: ${face}`);
  }
  
  if (str.length === 1) {
    return { face, count: 1 }; // CW
  }
  if (str[1] === "'" || str[1] === '’' || str[1] === '‘') {
    return { face, count: 3 }; // CCW = 3× CW
  }
  if (str[1] === '2') {
    return { face, count: 2 }; // 180°
  }
  throw new Error(`Invalid move notation: ${moveStr}`);
}

/**
 * Apply a single move notation to the cube state (returns new state)
 * @param {Object} state - CubeState
 * @param {string} moveStr - e.g. "R", "R'", "R2"
 * @returns {Object} new CubeState
 */
export function applyMove(state, moveStr) {
  const newState = cloneCube(state);
  const { face, count } = parseMove(moveStr);
  for (let i = 0; i < count; i++) {
    applyBaseCW(newState, face);
  }
  return newState;
}

/**
 * Apply a sequence of moves (space-separated) to the cube state
 * @param {Object} state - CubeState
 * @param {string} algorithm - e.g. "R U R' U'"
 * @returns {Object} new CubeState
 */
export function applyAlgorithm(state, algorithm) {
  const moves = algorithm.trim().split(/\s+/).filter(m => m.length > 0);
  let current = cloneCube(state);
  for (const move of moves) {
    current = applyMove(current, move);
  }
  return current;
}

/**
 * Get the inverse of a single move
 * @param {string} moveStr
 * @returns {string}
 */
export function inverseMove(moveStr) {
  const str = moveStr.trim();
  const face = str[0];
  if (str.length === 1) return face + "'";
  if (str[1] === "'" || str[1] === '’' || str[1] === '‘') return face;
  if (str[1] === '2') return face + '2';
  return moveStr;
}

/**
 * Get the inverse of an algorithm (reverse order, inverse each move)
 * @param {string} algorithm
 * @returns {string}
 */
export function inverseAlgorithm(algorithm) {
  const moves = algorithm.trim().split(/\s+/).filter(m => m.length > 0);
  return moves.reverse().map(inverseMove).join(' ');
}

/**
 * Check if the cube is in solved state
 * @param {Object} state - CubeState
 * @returns {boolean}
 */
export function isSolved(state) {
  for (const face of FACES) {
    const center = state[face][4];
    for (let i = 0; i < 9; i++) {
      if (state[face][i] !== center) return false;
    }
  }
  return true;
}

/**
 * Get a human-readable instruction for a move
 * @param {string} moveStr
 * @returns {{notation: string, face: string, faceName: string, direction: string, instruction: string}}
 */
export function getMoveInstruction(moveStr) {
  const str = moveStr.trim();
  const face = str[0];
  const faceNames = {
    U: 'top', D: 'bottom', L: 'left', R: 'right', F: 'front', B: 'back',
  };
  const faceName = faceNames[face] || face;
  
  let direction, instruction;
  if (str.length === 1) {
    direction = 'clockwise';
    instruction = `Turn the ${faceName} face clockwise 90°`;
  } else if (str[1] === "'" || str[1] === '’' || str[1] === '‘') {
    direction = 'counter-clockwise';
    instruction = `Turn the ${faceName} face counter-clockwise 90°`;
  } else if (str[1] === '2') {
    direction = '180°';
    instruction = `Turn the ${faceName} face 180° (half turn)`;
  }
  
  return { notation: str, face, faceName, direction, instruction };
}

/**
 * Parse an algorithm string into individual move strings
 * @param {string} algorithm
 * @returns {string[]}
 */
export function parseMoves(algorithm) {
  return algorithm.trim().split(/\s+/).filter(m => m.length > 0);
}
