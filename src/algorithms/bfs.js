/**
 * Pathfinding algorithms for the Indoor Navigation System.
 *
 * buildGraph        — adjacency-list builder (supports typed nodes: room/waypoint/door)
 * bfs               — unweighted BFS (hop-count shortest path)
 * dijkstra          — weighted shortest path (walking distance)
 * aStar             — A* with Euclidean heuristic
 * calcPathDistance  — sums edge weights along a path
 * generateInstructions — smart direction-based turn-by-turn instructions
 */

// ─────────────────────────────────────────────────────────────
// Graph builder
// ─────────────────────────────────────────────────────────────
export function buildGraph(nodes, edges) {
  const graph = {};
  nodes.forEach((n) => {
    graph[n.id] = { node: n, neighbors: [] };
  });
  edges.forEach(({ from, to, distance }) => {
    graph[from].neighbors.push({ id: to,   distance });
    graph[to].neighbors.push({   id: from, distance }); // undirected
  });
  return graph;
}

// ─────────────────────────────────────────────────────────────
// BFS — minimum hop count
// ─────────────────────────────────────────────────────────────
export function bfs(graph, startId, endId) {
  if (startId === endId) return [startId];

  const visited = new Set([startId]);
  const queue   = [[startId]];

  while (queue.length > 0) {
    const path    = queue.shift();
    const current = path[path.length - 1];

    for (const { id: neighborId } of graph[current].neighbors) {
      if (neighborId === endId) return [...path, neighborId];
      if (!visited.has(neighborId)) {
        visited.add(neighborId);
        queue.push([...path, neighborId]);
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Dijkstra — minimum walking distance
// ─────────────────────────────────────────────────────────────
export function dijkstra(graph, startId, endId) {
  if (startId === endId) return { path: [startId], distance: 0 };

  const dist      = {};
  const prev      = {};
  const unvisited = new Set(Object.keys(graph));

  Object.keys(graph).forEach((id) => { dist[id] = Infinity; });
  dist[startId] = 0;

  while (unvisited.size > 0) {
    let u = null;
    for (const id of unvisited) {
      if (u === null || dist[id] < dist[u]) u = id;
    }
    if (u === endId || dist[u] === Infinity) break;
    unvisited.delete(u);

    for (const { id: v, distance: w } of graph[u].neighbors) {
      if (!unvisited.has(v)) continue;
      const alt = dist[u] + w;
      if (alt < dist[v]) {
        dist[v] = alt;
        prev[v] = u;
      }
    }
  }

  if (dist[endId] === Infinity) return { path: null, distance: Infinity };

  const path = [];
  let cur = endId;
  while (cur !== undefined) {
    path.unshift(cur);
    cur = prev[cur];
  }
  return { path, distance: dist[endId] };
}

// ─────────────────────────────────────────────────────────────
// A* — Euclidean heuristic
// ─────────────────────────────────────────────────────────────
function euclidean(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

export function aStar(graph, startId, endId) {
  if (startId === endId) return { path: [startId], distance: 0 };

  const endNode  = graph[endId].node;
  const openSet  = new Set([startId]);
  const cameFrom = {};
  const gScore   = {};
  const fScore   = {};

  Object.keys(graph).forEach((id) => {
    gScore[id] = Infinity;
    fScore[id] = Infinity;
  });
  gScore[startId] = 0;
  fScore[startId] = euclidean(graph[startId].node, endNode);

  while (openSet.size > 0) {
    let current = null;
    for (const id of openSet) {
      if (current === null || fScore[id] < fScore[current]) current = id;
    }

    if (current === endId) {
      const path = [];
      let cur = endId;
      while (cur !== undefined) {
        path.unshift(cur);
        cur = cameFrom[cur];
      }
      return { path, distance: gScore[endId] };
    }

    openSet.delete(current);

    for (const { id: neighbor, distance: w } of graph[current].neighbors) {
      const tentative = gScore[current] + w;
      if (tentative < gScore[neighbor]) {
        cameFrom[neighbor] = current;
        gScore[neighbor]   = tentative;
        fScore[neighbor]   = tentative + euclidean(graph[neighbor].node, endNode);
        openSet.add(neighbor);
      }
    }
  }

  return { path: null, distance: Infinity };
}

// ─────────────────────────────────────────────────────────────
// Total walking distance along a path
// ─────────────────────────────────────────────────────────────
export function calcPathDistance(graph, pathIds) {
  let total = 0;
  for (let i = 0; i < pathIds.length - 1; i++) {
    const edge = graph[pathIds[i]].neighbors.find((n) => n.id === pathIds[i + 1]);
    total += edge ? edge.distance : 0;
  }
  return total;
}

// ─────────────────────────────────────────────────────────────
// Direction helper
// ─────────────────────────────────────────────────────────────
function getDirection(fromNode, toNode) {
  const dx    = toNode.x - fromNode.x;
  const dy    = toNode.y - fromNode.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx >= absDy) return dx >= 0 ? 'east'  : 'west';
  return dy >= 0 ? 'north' : 'south';
}

const DIR_ARROW = { north: '↑', south: '↓', east: '→', west: '←' };
const DIR_WORD  = { north: 'north', south: 'south', east: 'east', west: 'west' };

// ─────────────────────────────────────────────────────────────
// Smart direction-aware turn-by-turn instructions
// Skips anonymous corridor waypoints; emits directional
// "Walk X ft → east" segments, then room/door stops.
// ─────────────────────────────────────────────────────────────
export function generateInstructions(graph, pathIds) {
  if (!pathIds || pathIds.length === 0) return [];

  const startNode = graph[pathIds[0]].node;
  const instructions = [`Start at ${startNode.name}.`];
  if (pathIds.length === 1) return instructions;

  let segDir  = null;
  let segDist = 0;

  const emitSegment = (dir, dist) => {
    if (dist > 0) {
      instructions.push(`Walk ${dist} ft ${DIR_ARROW[dir]} ${DIR_WORD[dir]}.`);
    }
  };

  for (let i = 1; i < pathIds.length; i++) {
    const prevNode = graph[pathIds[i - 1]].node;
    const currNode = graph[pathIds[i]].node;
    const edge     = graph[pathIds[i - 1]].neighbors.find((n) => n.id === pathIds[i]);
    const dist     = edge ? edge.distance : 0;
    const dir      = getDirection(prevNode, currNode);
    const isLast   = i === pathIds.length - 1;

    if (segDir === null) {
      segDir  = dir;
      segDist = dist;
    } else if (dir !== segDir) {
      // Direction changed — emit accumulated segment
      emitSegment(segDir, segDist);
      segDir  = dir;
      segDist = dist;
    } else {
      segDist += dist;
    }

    if (isLast) {
      emitSegment(segDir, segDist);
      const endNode = graph[pathIds[pathIds.length - 1]].node;
      if (endNode.type === 'room' || !endNode.type) {
        instructions.push(`Arrive at ${endNode.name}.`);
      }
    }
  }

  return instructions;
}
