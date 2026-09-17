/**
 * Rubik's Cube Validator
 * 
 * Performs 8 validation checks to ensure a cube state is physically possible:
 * 1. Exactly 6 distinct colors
 * 2. Exactly 9 stickers of each color
 * 3. 6 unique center colors
 * 4. Valid edge pieces (12 valid edges)
 * 5. Valid corner pieces (8 valid corners)
 * 6. Edge orientation sum ≡ 0 (mod 2)
 * 7. Corner orientation sum ≡ 0 (mod 3)
 * 8. Permutation parity: corner parity = edge parity
 */

import { FACES, DEFAULT_CENTERS, COLORS } from './cube-state.js';

// ─── Piece Definitions ───
// Each edge is defined by [face, index] pairs for its two stickers
const EDGE_POSITIONS = [
  // U layer edges
  [['U', 1], ['B', 1]], // UB
  [['U', 3], ['L', 1]], // UL
  [['U', 5], ['R', 1]], // UR
  [['U', 7], ['F', 1]], // UF
  // D layer edges
  [['D', 1], ['F', 7]], // DF
  [['D', 3], ['L', 7]], // DL
  [['D', 5], ['R', 7]], // DR
  [['D', 7], ['B', 7]], // DB
  // Middle layer edges
  [['F', 3], ['L', 5]], // FL
  [['F', 5], ['R', 3]], // FR
  [['B', 3], ['R', 5]], // BR
  [['B', 5], ['L', 3]], // BL
];

// Each corner is defined by [face, index] triples for its three stickers
// Listed in clockwise order when looking at the corner from outside
const CORNER_POSITIONS = [
  // U layer corners
  [['U', 0], ['L', 0], ['B', 2]], // ULB
  [['U', 2], ['B', 0], ['R', 2]], // UBR
  [['U', 6], ['F', 0], ['L', 2]], // UFL
  [['U', 8], ['R', 0], ['F', 2]], // URF
  // D layer corners
  [['D', 0], ['L', 8], ['F', 6]], // DLF
  [['D', 2], ['F', 8], ['R', 6]], // DFR
  [['D', 6], ['B', 8], ['L', 6]], // DBL
  [['D', 8], ['R', 8], ['B', 6]], // DRB
];

// Valid edge color pairs (unordered) - derived from standard cube
const VALID_EDGES = [
  ['white', 'blue'], ['white', 'orange'], ['white', 'red'], ['white', 'green'],
  ['yellow', 'green'], ['yellow', 'orange'], ['yellow', 'red'], ['yellow', 'blue'],
  ['green', 'orange'], ['green', 'red'], ['blue', 'red'], ['blue', 'orange'],
];

// Valid corner color triples (unordered) - derived from standard cube  
const VALID_CORNERS = [
  ['white', 'orange', 'blue'], ['white', 'blue', 'red'],
  ['white', 'green', 'orange'], ['white', 'red', 'green'],
  ['yellow', 'orange', 'green'], ['yellow', 'green', 'red'],
  ['yellow', 'blue', 'orange'], ['yellow', 'red', 'blue'],
];

/**
 * Get sticker color from cube state
 */
function getSticker(state, face, index) {
  return state[face][index];
}

/**
 * Map a color to its face based on center colors
 */
function colorToFace(state, color) {
  for (const face of FACES) {
    if (state[face][4] === color) return face;
  }
  return null;
}

/**
 * Check if two arrays contain the same elements (unordered)
 */
function sameElements(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

/**
 * Find which valid edge matches these colors
 */
function findEdge(colors) {
  return VALID_EDGES.findIndex(e => sameElements(e, colors));
}

/**
 * Find which valid corner matches these colors
 */
function findCorner(colors) {
  return VALID_CORNERS.findIndex(c => sameElements(c, colors));
}

/**
 * Validate the cube state
 * @param {Object} state - CubeState
 * @returns {{valid: boolean, errors: Array<{code: string, message: string, details?: any}>}}
 */
export function validateCube(state) {
  const errors = [];

  // ─── Check 1: All stickers filled ───
  for (const face of FACES) {
    for (let i = 0; i < 9; i++) {
      if (!state[face][i]) {
        errors.push({
          code: 'INCOMPLETE',
          message: `Face ${face} has empty stickers. Please fill all 54 stickers.`,
          details: { face, index: i },
        });
        return { valid: false, errors };
      }
    }
  }

  // ─── Check 2: Count colors ───
  const colorCounts = {};
  const allColors = Object.values(COLORS);
  for (const face of FACES) {
    for (let i = 0; i < 9; i++) {
      const c = state[face][i];
      colorCounts[c] = (colorCounts[c] || 0) + 1;
    }
  }

  for (const color of allColors) {
    const count = colorCounts[color] || 0;
    if (count !== 9) {
      errors.push({
        code: 'COLOR_COUNT',
        message: `Found ${count} ${color} stickers, but need exactly 9.`,
        details: { color, count },
      });
    }
  }
  if (errors.length > 0) return { valid: false, errors };

  // ─── Check 3: Unique centers ───
  const centers = FACES.map(f => state[f][4]);
  const uniqueCenters = new Set(centers);
  if (uniqueCenters.size !== 6) {
    errors.push({
      code: 'CENTER_DUPLICATE',
      message: 'Each face center must be a different color.',
    });
    return { valid: false, errors };
  }

  // ─── Check 4: Valid edge pieces ───
  const edgeIndices = [];
  for (let i = 0; i < EDGE_POSITIONS.length; i++) {
    const [s1, s2] = EDGE_POSITIONS[i];
    const colors = [getSticker(state, s1[0], s1[1]), getSticker(state, s2[0], s2[1])];
    const idx = findEdge(colors);
    if (idx === -1) {
      errors.push({
        code: 'INVALID_EDGE',
        message: `Invalid edge piece: ${colors[0]}/${colors[1]}. This combination doesn't exist on a standard cube.`,
        details: { position: i, colors },
      });
    } else {
      if (edgeIndices.includes(idx)) {
        errors.push({
          code: 'DUPLICATE_EDGE',
          message: `Duplicate edge piece: ${colors[0]}/${colors[1]} appears more than once.`,
          details: { position: i, colors },
        });
      }
      edgeIndices.push(idx);
    }
  }

  // ─── Check 5: Valid corner pieces ───
  const cornerIndices = [];
  for (let i = 0; i < CORNER_POSITIONS.length; i++) {
    const [s1, s2, s3] = CORNER_POSITIONS[i];
    const colors = [
      getSticker(state, s1[0], s1[1]),
      getSticker(state, s2[0], s2[1]),
      getSticker(state, s3[0], s3[1]),
    ];
    const idx = findCorner(colors);
    if (idx === -1) {
      errors.push({
        code: 'INVALID_CORNER',
        message: `Invalid corner piece: ${colors.join('/')}. This combination doesn't exist on a standard cube.`,
        details: { position: i, colors },
      });
    } else {
      if (cornerIndices.includes(idx)) {
        errors.push({
          code: 'DUPLICATE_CORNER',
          message: `Duplicate corner piece: ${colors.join('/')} appears more than once.`,
          details: { position: i, colors },
        });
      }
      cornerIndices.push(idx);
    }
  }
  if (errors.length > 0) return { valid: false, errors };

  // ─── Check 6: Edge orientation ───
  let edgeOrientationSum = 0;
  for (const [s1, s2] of EDGE_POSITIONS) {
    const c1 = getSticker(state, s1[0], s1[1]);
    const c2 = getSticker(state, s2[0], s2[1]);
    const f1 = colorToFace(state, c1);
    const f2 = colorToFace(state, c2);
    // Edge is oriented if primary sticker is on U/D face or (if neither is U/D color) on F/B face
    const udColors = [state['U'][4], state['D'][4]];
    if (udColors.includes(c1)) {
      edgeOrientationSum += (s1[0] === 'U' || s1[0] === 'D') ? 0 : 1;
    } else if (udColors.includes(c2)) {
      edgeOrientationSum += (s2[0] === 'U' || s2[0] === 'D') ? 0 : 1;
    } else {
      const fbFaces = ['F', 'B'];
      if (fbFaces.includes(s1[0])) {
        edgeOrientationSum += 0;
      } else {
        edgeOrientationSum += 1;
      }
    }
  }
  if (edgeOrientationSum % 2 !== 0) {
    errors.push({
      code: 'EDGE_ORIENTATION',
      message: 'Edge orientation is invalid. This usually means a single edge was flipped in place, which is physically impossible.',
    });
  }

  // ─── Check 7: Corner orientation ───
  let cornerOrientationSum = 0;
  for (const [s1, s2, s3] of CORNER_POSITIONS) {
    const c1 = getSticker(state, s1[0], s1[1]);
    const c2 = getSticker(state, s2[0], s2[1]);
    const c3 = getSticker(state, s3[0], s3[1]);
    const udColors = [state['U'][4], state['D'][4]];
    if (udColors.includes(c1)) {
      cornerOrientationSum += 0;
    } else if (udColors.includes(c2)) {
      cornerOrientationSum += 1;
    } else if (udColors.includes(c3)) {
      cornerOrientationSum += 2;
    }
  }
  if (cornerOrientationSum % 3 !== 0) {
    errors.push({
      code: 'CORNER_ORIENTATION',
      message: 'Corner orientation is invalid. This usually means a single corner was twisted in place, which is physically impossible.',
    });
  }

  // ─── Check 8: Permutation parity ───
  // Corner permutation parity must equal edge permutation parity
  function countInversions(arr) {
    let inv = 0;
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        if (arr[i] > arr[j]) inv++;
      }
    }
    return inv;
  }
  
  const cornerParity = countInversions(cornerIndices) % 2;
  const edgeParity = countInversions(edgeIndices) % 2;
  if (cornerParity !== edgeParity) {
    errors.push({
      code: 'PARITY',
      message: 'Permutation parity error. This usually means two pieces were swapped, which is physically impossible without disassembly.',
    });
  }

  if (errors.length > 0) return { valid: false, errors };

  return { valid: true, errors: [] };
}
