/**
 * RouteArrowGenerator.js
 *
 * Generates coordinate points and rotation angles for placing a chain of
 * floor-anchored arrows along the path segments.
 */

/**
 * Calculates the Euclidean distance between two points in feet.
 * @param {object} p1 - { x, y }
 * @param {object} p2 - { x, y }
 * @returns {number}
 */
export function getDistance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Generates an array of arrow descriptors along the path.
 *
 * Each arrow contains:
 *   - x, y: coordinates in floor-plan units (feet)
 *   - angle: Y-rotation angle (radians) matching the heading vector
 *   - segmentIndex: which leg of the trip this arrow is on
 *
 * @param {string[]} pathIds - array of node IDs
 * @param {object} nodeMap - id -> node object mapping ({ x, y })
 * @param {number} spacing - spacing between arrows in feet (default: 4.5 ft)
 * @returns {Array<{ x: number, y: number, angle: number, segmentIndex: number }>}
 */
export function generateRouteArrows(pathIds, nodeMap, spacing = 4.5) {
  if (!pathIds || pathIds.length < 2) return [];

  const arrows = [];

  for (let i = 0; i < pathIds.length - 1; i++) {
    const nodeA = nodeMap[pathIds[i]];
    const nodeB = nodeMap[pathIds[i + 1]];

    if (!nodeA || !nodeB) continue;

    const segmentDist = getDistance(nodeA, nodeB);
    
    // Heading vector components
    const dx = nodeB.x - nodeA.x;
    const dy = nodeB.y - nodeA.y;
    const headingX = dx / (segmentDist || 0.001);
    const headingY = dy / (segmentDist || 0.001);

    // Calculate heading angle (yaw)
    // atan2(dx, dy) matches coordinate system
    // In Three.js, we flip Y for Z: z = -y, so angle = Math.atan2(dx, -dy)
    const angle = Math.atan2(dx, -dy);

    // Interpolate arrows along this segment
    // We space them out by `spacing` feet.
    // Start placing arrows from 1.5 ft into the segment to avoid spawning exactly on the node
    let d = 1.5;
    while (d < segmentDist) {
      const x = nodeA.x + headingX * d;
      const y = nodeA.y + headingY * d;

      arrows.push({
        x,
        y,
        angle,
        segmentIndex: i,
      });

      d += spacing;
    }
  }

  return arrows;
}
