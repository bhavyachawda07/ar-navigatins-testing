/**
 * WaypointManager.js
 * ─────────────────────────────────────────────────────────────────
 * Pure navigation utility functions.
 * Designed to be replaced with real indoor-positioning in future.
 *
 * Architecture note:
 *  - No side effects / no React state here
 *  - All functions are deterministic given pathIds + nodeMap + stepIndex
 *  - "Positioning Layer" (GPS / UWB / QR) would call `getClosestStepIndex()`
 *    to update stepIndex externally
 */

// ─── Direction constants ──────────────────────────────────────
export const DIRECTIONS = {
  NORTH:   'north',
  SOUTH:   'south',
  EAST:    'east',
  WEST:    'west',
  ARRIVE:  'arrive',
  UNKNOWN: 'straight',
};

// ─── Arrow display config ─────────────────────────────────────
export const DIR_META = {
  north:    { label: 'Go Straight',  sublabel: '(North)',  rotation: 0,   color: '#06b6d4' },
  south:    { label: 'Go Straight',  sublabel: '(South)',  rotation: 180, color: '#06b6d4' },
  east:     { label: 'Go Straight',  sublabel: '(East)',   rotation: 90,  color: '#06b6d4' },
  west:     { label: 'Go Straight',  sublabel: '(West)',   rotation: 270, color: '#06b6d4' },
  arrive:   { label: 'You Arrived!', sublabel: '🏁',       rotation: 0,   color: '#10b981' },
  straight: { label: 'Go Straight',  sublabel: '',         rotation: 0,   color: '#06b6d4' },
  left:     { label: 'Turn Left',    sublabel: '',         rotation: 270, color: '#f59e0b' },
  right:    { label: 'Turn Right',   sublabel: '',         rotation: 90,  color: '#f59e0b' },
};

// ─── Absolute direction between two floor-plan nodes ─────────
export function getAbsoluteDirection(fromNode, toNode) {
  if (!fromNode || !toNode) return DIRECTIONS.UNKNOWN;
  const dx = toNode.x - fromNode.x;
  const dy = toNode.y - fromNode.y;
  if (dx === 0 && dy === 0) return DIRECTIONS.ARRIVE;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? DIRECTIONS.EAST : DIRECTIONS.WEST;
  return dy > 0 ? DIRECTIONS.NORTH : DIRECTIONS.SOUTH;
}

// ─── Relative turn direction (for context-aware arrows) ──────
// Given arrival direction and next direction, returns 'left'|'right'|'straight'|'arrive'
const TURN_TABLE = {
  'east,north': 'left',  'east,south': 'right',
  'west,north': 'right', 'west,south': 'left',
  'north,east': 'right', 'north,west': 'left',
  'south,east': 'left',  'south,west': 'right',
};

export function getRelativeDirection(pathIds, nodeMap, stepIndex) {
  if (stepIndex >= pathIds.length - 1) return 'arrive';

  const currNode = nodeMap[pathIds[stepIndex]];
  const nextNode = nodeMap[pathIds[stepIndex + 1]];
  const nextDir  = getAbsoluteDirection(currNode, nextNode);

  if (stepIndex === 0) return nextDir; // first step — show absolute direction

  const prevNode = nodeMap[pathIds[stepIndex - 1]];
  const prevDir  = getAbsoluteDirection(prevNode, currNode);

  if (prevDir === nextDir) return 'straight';

  const key = `${prevDir},${nextDir}`;
  return TURN_TABLE[key] ?? nextDir;
}

// ─── Remaining path distance (sum of edge weights) ───────────
export function getRemainingDistance(graph, pathIds, stepIndex) {
  let total = 0;
  for (let i = stepIndex; i < pathIds.length - 1; i++) {
    const edge = graph[pathIds[i]]?.neighbors?.find(n => n.id === pathIds[i + 1]);
    total += edge?.distance ?? 0;
  }
  return total;
}

// ─── Progress 0→1 ────────────────────────────────────────────
export function getProgress(totalDist, remainingDist) {
  if (!totalDist) return 0;
  return Math.min(1, Math.max(0, 1 - remainingDist / totalDist));
}

// ─── Full step info object ────────────────────────────────────
export function getStepInfo(pathIds, nodeMap, graph, stepIndex, totalDist) {
  const isComplete   = stepIndex >= pathIds.length - 1;
  const currentNode  = nodeMap[pathIds[stepIndex]];
  const nextIndex    = Math.min(stepIndex + 1, pathIds.length - 1);
  const nextNode     = nodeMap[pathIds[nextIndex]];
  const destNode     = nodeMap[pathIds[pathIds.length - 1]];
  const remaining    = getRemainingDistance(graph, pathIds, stepIndex);
  const progress     = getProgress(totalDist, remaining);
  const direction    = getRelativeDirection(pathIds, nodeMap, stepIndex);
  const absoluteDir  = getAbsoluteDirection(currentNode, nextNode);

  return {
    currentNode, nextNode, destNode,
    remaining, progress, direction, absoluteDir,
    isComplete,
    stepIndex,
    totalSteps: pathIds.length - 1,
  };
}

// ─── Angle (radians) from current node toward next in 3D ─────
// Three.js Y-rotation for arrow facing direction of travel
// Floor plan: x=east, y=north → 3D: x=east, z=south (inverted y)
export function getArrowAngle(fromNode, toNode) {
  if (!fromNode || !toNode) return 0;
  const dx = (toNode.x - fromNode.x);
  const dz = -(toNode.y - fromNode.y); // floor plan y increases north = 3D z decreases
  return Math.atan2(dx, -dz); // Y-rotation in Three.js space
}

// ─── Future: real positioning hook point ─────────────────────
// export async function locateUser(positioningProvider) {
//   return positioningProvider.getCurrentPosition();
// }
//
// export function getClosestStepIndex(pathIds, nodeMap, userPosition) {
//   // Find closest waypoint to user's real position
//   let minDist = Infinity, closest = 0;
//   pathIds.forEach((id, i) => {
//     const n = nodeMap[id];
//     const d = Math.hypot(n.x - userPosition.x, n.y - userPosition.y);
//     if (d < minDist) { minDist = d; closest = i; }
//   });
//   return closest;
// }
