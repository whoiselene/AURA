import type { GraphNode, GraphEdge, Telemetry } from '../../types';

export interface GraphStepState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  telemetry: Telemetry;
  audio?: {
    type: 'node' | 'backtrack' | 'complete';
    depth: number;
  };
}

// Helper to clone graph structures to prevent mutation of histories
function cloneGraph(nodes: GraphNode[], edges: GraphEdge[]): { nodes: GraphNode[]; edges: GraphEdge[] } {
  return {
    nodes: nodes.map(n => ({ ...n })),
    edges: edges.map(e => ({ ...e })),
  };
}

// Euclidean distance heuristic for A*
function getHeuristic(n1: GraphNode, n2: GraphNode): number {
  return Math.hypot(n1.x - n2.x, n1.y - n2.y);
}

// Reconstruct path nodes & edges
function* reconstructPath(
  nodes: GraphNode[],
  edges: GraphEdge[],
  parentMap: Record<string, string>,
  startId: string,
  targetId: string,
  baseTelemetry: Telemetry
): Generator<GraphStepState> {
  const pathNodeIds: string[] = [];
  let curr = targetId;

  while (curr) {
    pathNodeIds.push(curr);
    if (curr === startId) break;
    curr = parentMap[curr];
  }
  pathNodeIds.reverse();

  // Find edges on the path
  const pathEdgeIds: string[] = [];
  for (let i = 0; i < pathNodeIds.length - 1; i++) {
    const u = pathNodeIds[i];
    const v = pathNodeIds[i + 1];
    const edge = edges.find(
      e => (e.from === u && e.to === v) || (e.from === v && e.to === u)
    );
    if (edge) {
      pathEdgeIds.push(edge.id);
    }
  }

  // Animate path validation step-by-step
  let currentNodes = nodes.map(n => ({ ...n }));
  let currentEdges = edges.map(e => ({ ...e }));

  const telemetry = { ...baseTelemetry };

  for (let i = 0; i < pathNodeIds.length; i++) {
    const nodeId = pathNodeIds[i];
    const node = currentNodes.find(n => n.id === nodeId);
    if (node) {
      node.isPath = true;
      node.isFrontier = false;
      node.isVisited = true;
    }

    if (i > 0) {
      const prevNodeId = pathNodeIds[i - 1];
      const edge = currentEdges.find(
        e => (e.from === prevNodeId && e.to === nodeId) || (e.from === nodeId && e.to === prevNodeId)
      );
      if (edge) {
        edge.isPath = true;
        edge.isFrontier = false;
        edge.isVisited = true;
        edge.rippleStart = Date.now(); // trigger shockwave
      }
    }

    telemetry.arrayWrites += 1;
    telemetry.timeMicroseconds += 150;

    yield {
      nodes: currentNodes.map(n => ({ ...n })),
      edges: currentEdges.map(e => ({ ...e })),
      telemetry: { ...telemetry },
      audio: i === pathNodeIds.length - 1 ? { type: 'complete', depth: 0 } : { type: 'node', depth: i },
    };
  }
}

// 1. DEPTH-FIRST SEARCH (DFS)
export function* runDFS(
  initialNodes: GraphNode[],
  initialEdges: GraphEdge[],
  startId: string,
  targetId: string
): Generator<GraphStepState> {
  const { nodes, edges } = cloneGraph(initialNodes, initialEdges);
  
  // Set all status to false initially
  nodes.forEach(n => {
    n.isVisited = false;
    n.isFrontier = false;
    n.isPath = false;
  });
  edges.forEach(e => {
    e.isVisited = false;
    e.isFrontier = false;
    e.isPath = false;
  });

  const startTime = Date.now();
  let comparisons = 0;
  let arrayWrites = 0;

  const stack: string[] = [startId];
  const visited = new Set<string>();
  const parentMap: Record<string, string> = {};
  let prevVisitedId: string | null = null;

  while (stack.length > 0) {
    const currId = stack.pop()!;
    comparisons++;

    // Stack depth telemetry
    const stackDepth = stack.length + 1;

    // Retrieve node depth based on parent distance
    let depth = 0;
    let temp = currId;
    while (parentMap[temp]) {
      depth++;
      temp = parentMap[temp];
    }

    if (visited.has(currId)) {
      continue;
    }

    // Set visited state
    visited.add(currId);
    arrayWrites++;

    const node = nodes.find(n => n.id === currId);
    if (node) {
      node.isVisited = true;
      node.isFrontier = false;
      node.depth = depth;
    }

    // Mark traversing edge
    if (parentMap[currId]) {
      const edge = edges.find(
        e => (e.from === parentMap[currId] && e.to === currId) || (e.from === currId && e.to === parentMap[currId])
      );
      if (edge) {
        edge.isVisited = true;
        edge.rippleStart = Date.now();
      }
    }

    const elapsed = (Date.now() - startTime) * 1000 + 10; // microsecond estimation
    const telemetry: Telemetry = {
      comparisons,
      arrayWrites,
      stackDepth,
      timeMicroseconds: elapsed,
      currentVariables: { stack: [...stack], visited: Array.from(visited), current: currId },
      activeCodeLine: 3, // Pop & inspect
    };

    // Check backtracking: if the current node is not adjacent to the previous visited node,
    // it means we have jumped back to an earlier stack node.
    let isBacktracking = false;
    if (prevVisitedId && parentMap[currId] !== prevVisitedId) {
      isBacktracking = true;
    }
    prevVisitedId = currId;

    yield {
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
      telemetry,
      audio: {
        type: isBacktracking ? 'backtrack' : 'node',
        depth,
      },
    };

    if (currId === targetId) {
      // Reconstruct path
      yield* reconstructPath(nodes, edges, parentMap, startId, targetId, telemetry);
      return;
    }

    // Find outgoing edges/neighbors
    const neighbors: string[] = [];
    edges.forEach(e => {
      if (e.from === currId && !visited.has(e.to)) {
        neighbors.push(e.to);
      } else if (e.to === currId && !visited.has(e.from)) {
        neighbors.push(e.from);
      }
    });

    // Push neighbors and set frontier states
    neighbors.forEach(neighborId => {
      if (!stack.includes(neighborId)) {
        stack.push(neighborId);
        parentMap[neighborId] = currId;
        arrayWrites++;
        
        const neighborNode = nodes.find(n => n.id === neighborId);
        if (neighborNode && !neighborNode.isVisited) {
          neighborNode.isFrontier = true;
        }

        const edge = edges.find(
          e => (e.from === currId && e.to === neighborId) || (e.from === neighborId && e.to === currId)
        );
        if (edge) {
          edge.isFrontier = true;
        }
      }
    });

    const endStepElapsed = (Date.now() - startTime) * 1000 + 25;
    yield {
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
      telemetry: {
        comparisons,
        arrayWrites,
        stackDepth: stack.length,
        timeMicroseconds: endStepElapsed,
        currentVariables: { stack: [...stack], visited: Array.from(visited), neighbors },
        activeCodeLine: 7, // Push neighbors
      },
    };
  }
}

// 2. BREADTH-FIRST SEARCH (BFS)
export function* runBFS(
  initialNodes: GraphNode[],
  initialEdges: GraphEdge[],
  startId: string,
  targetId: string
): Generator<GraphStepState> {
  const { nodes, edges } = cloneGraph(initialNodes, initialEdges);
  
  nodes.forEach(n => {
    n.isVisited = false;
    n.isFrontier = false;
    n.isPath = false;
  });
  edges.forEach(e => {
    e.isVisited = false;
    e.isFrontier = false;
    e.isPath = false;
  });

  const startTime = Date.now();
  let comparisons = 0;
  let arrayWrites = 0;

  const queue: string[] = [startId];
  const visited = new Set<string>([startId]);
  const parentMap: Record<string, string> = {};

  while (queue.length > 0) {
    const currId = queue.shift()!;
    comparisons++;

    let depth = 0;
    let temp = currId;
    while (parentMap[temp]) {
      depth++;
      temp = parentMap[temp];
    }

    const node = nodes.find(n => n.id === currId);
    if (node) {
      node.isVisited = true;
      node.isFrontier = false;
      node.depth = depth;
    }

    if (parentMap[currId]) {
      const edge = edges.find(
        e => (e.from === parentMap[currId] && e.to === currId) || (e.from === currId && e.to === parentMap[currId])
      );
      if (edge) {
        edge.isVisited = true;
        edge.rippleStart = Date.now();
      }
    }

    const elapsed = (Date.now() - startTime) * 1000 + 10;
    const telemetry: Telemetry = {
      comparisons,
      arrayWrites,
      stackDepth: queue.length + 1,
      timeMicroseconds: elapsed,
      currentVariables: { queue: [...queue], visited: Array.from(visited), current: currId },
      activeCodeLine: 3,
    };

    yield {
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
      telemetry,
      audio: { type: 'node', depth },
    };

    if (currId === targetId) {
      yield* reconstructPath(nodes, edges, parentMap, startId, targetId, telemetry);
      return;
    }

    const neighbors: string[] = [];
    edges.forEach(e => {
      if (e.from === currId && !visited.has(e.to)) {
        neighbors.push(e.to);
      } else if (e.to === currId && !visited.has(e.from)) {
        neighbors.push(e.from);
      }
    });

    neighbors.forEach(neighborId => {
      visited.add(neighborId);
      queue.push(neighborId);
      parentMap[neighborId] = currId;
      arrayWrites += 2;

      const neighborNode = nodes.find(n => n.id === neighborId);
      if (neighborNode) {
        neighborNode.isFrontier = true;
      }

      const edge = edges.find(
        e => (e.from === currId && e.to === neighborId) || (e.from === neighborId && e.to === currId)
      );
      if (edge) {
        edge.isFrontier = true;
      }
    });

    const endStepElapsed = (Date.now() - startTime) * 1000 + 20;
    yield {
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
      telemetry: {
        comparisons,
        arrayWrites,
        stackDepth: queue.length,
        timeMicroseconds: endStepElapsed,
        currentVariables: { queue: [...queue], visited: Array.from(visited), neighbors },
        activeCodeLine: 7,
      },
    };
  }
}

// 3. DIJKSTRA'S ALGORITHM
export function* runDijkstra(
  initialNodes: GraphNode[],
  initialEdges: GraphEdge[],
  startId: string,
  targetId: string
): Generator<GraphStepState> {
  const { nodes, edges } = cloneGraph(initialNodes, initialEdges);
  
  const distances: Record<string, number> = {};
  const parentMap: Record<string, string> = {};
  const visited = new Set<string>();

  nodes.forEach(n => {
    n.isVisited = false;
    n.isFrontier = false;
    n.isPath = false;
    distances[n.id] = Infinity;
  });
  edges.forEach(e => {
    e.isVisited = false;
    e.isFrontier = false;
    e.isPath = false;
  });

  distances[startId] = 0;
  const startTime = Date.now();
  let comparisons = 0;
  let arrayWrites = 1;

  while (visited.size < nodes.length) {
    // Find unvisited node with minimum distance
    let currId: string | null = null;
    let minDist = Infinity;

    nodes.forEach(n => {
      if (!visited.has(n.id) && distances[n.id] < minDist) {
        minDist = distances[n.id];
        currId = n.id;
      }
      comparisons++;
    });

    if (currId === null || minDist === Infinity) {
      break; // Rest are unreachable
    }

    visited.add(currId);
    arrayWrites++;

    let depth = 0;
    let temp = currId as string;
    while (parentMap[temp]) {
      depth++;
      temp = parentMap[temp];
    }

    const node = nodes.find(n => n.id === currId);
    if (node) {
      node.isVisited = true;
      node.isFrontier = false;
      node.depth = depth;
    }

    if (parentMap[currId]) {
      const edge = edges.find(
        e => (e.from === parentMap[currId!] && e.to === currId) || (e.from === currId && e.to === parentMap[currId!])
      );
      if (edge) {
        edge.isVisited = true;
        edge.rippleStart = Date.now();
      }
    }

    const elapsed = (Date.now() - startTime) * 1000 + 15;
    const telemetry: Telemetry = {
      comparisons,
      arrayWrites,
      stackDepth: visited.size,
      timeMicroseconds: elapsed,
      currentVariables: { distances: { ...distances }, visited: Array.from(visited), current: currId },
      activeCodeLine: 4,
    };

    yield {
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
      telemetry,
      audio: { type: 'node', depth },
    };

    if (currId === targetId) {
      yield* reconstructPath(nodes, edges, parentMap, startId, targetId, telemetry);
      return;
    }

    // Relax neighbors
    const currentIdStr = currId as string;
    const neighbors: { id: string; weight: number }[] = [];
    edges.forEach(e => {
      if (e.from === currentIdStr && !visited.has(e.to)) {
        neighbors.push({ id: e.to, weight: e.weight });
      } else if (e.to === currentIdStr && !visited.has(e.from)) {
        neighbors.push({ id: e.from, weight: e.weight });
      }
    });

    neighbors.forEach(({ id: neighborId, weight }) => {
      const alt = distances[currentIdStr] + weight;
      comparisons++;
      if (alt < distances[neighborId]) {
        distances[neighborId] = alt;
        parentMap[neighborId] = currentIdStr;
        arrayWrites += 2;

        const neighborNode = nodes.find(n => n.id === neighborId);
        if (neighborNode) {
          neighborNode.isFrontier = true;
        }

        const edge = edges.find(
          e => (e.from === currentIdStr && e.to === neighborId) || (e.from === neighborId && e.to === currentIdStr)
        );
        if (edge) {
          edge.isFrontier = true;
        }
      }
    });

    const endStepElapsed = (Date.now() - startTime) * 1000 + 20;
    yield {
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
      telemetry: {
        comparisons,
        arrayWrites,
        stackDepth: visited.size,
        timeMicroseconds: endStepElapsed,
        currentVariables: { distances: { ...distances }, visited: Array.from(visited), relaxed: neighbors.map(n => n.id) },
        activeCodeLine: 8,
      },
    };
  }
}

// 4. A* SEARCH ALGORITHM
export function* runAStar(
  initialNodes: GraphNode[],
  initialEdges: GraphEdge[],
  startId: string,
  targetId: string
): Generator<GraphStepState> {
  const { nodes, edges } = cloneGraph(initialNodes, initialEdges);

  const startNode = nodes.find(n => n.id === startId)!;
  const targetNode = nodes.find(n => n.id === targetId)!;

  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  const parentMap: Record<string, string> = {};
  
  const openSet = new Set<string>([startId]);
  const closedSet = new Set<string>();

  nodes.forEach(n => {
    n.isVisited = false;
    n.isFrontier = false;
    n.isPath = false;
    gScore[n.id] = Infinity;
    fScore[n.id] = Infinity;
  });
  edges.forEach(e => {
    e.isVisited = false;
    e.isFrontier = false;
    e.isPath = false;
  });

  gScore[startId] = 0;
  fScore[startId] = getHeuristic(startNode, targetNode);

  const startTime = Date.now();
  let comparisons = 0;
  let arrayWrites = 2;

  while (openSet.size > 0) {
    // Find node in openSet with lowest fScore
    let currId: string | null = null;
    let minF = Infinity;

    openSet.forEach(id => {
      if (fScore[id] < minF) {
        minF = fScore[id];
        currId = id;
      }
      comparisons++;
    });

    if (currId === null) break;

    openSet.delete(currId);
    closedSet.add(currId);
    arrayWrites += 2;

    let depth = 0;
    let temp = currId as string;
    while (parentMap[temp]) {
      depth++;
      temp = parentMap[temp];
    }

    const node = nodes.find(n => n.id === currId);
    if (node) {
      node.isVisited = true;
      node.isFrontier = false;
      node.depth = depth;
    }

    if (parentMap[currId]) {
      const edge = edges.find(
        e => (e.from === parentMap[currId!] && e.to === currId) || (e.from === currId && e.to === parentMap[currId!])
      );
      if (edge) {
        edge.isVisited = true;
        edge.rippleStart = Date.now();
      }
    }

    const elapsed = (Date.now() - startTime) * 1000 + 15;
    const telemetry: Telemetry = {
      comparisons,
      arrayWrites,
      stackDepth: openSet.size,
      timeMicroseconds: elapsed,
      currentVariables: {
        openSet: Array.from(openSet),
        closedSet: Array.from(closedSet),
        current: currId,
        gScores: { ...gScore },
        fScores: { ...fScore }
      },
      activeCodeLine: 4,
    };

    yield {
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
      telemetry,
      audio: { type: 'node', depth },
    };

    if (currId === targetId) {
      yield* reconstructPath(nodes, edges, parentMap, startId, targetId, telemetry);
      return;
    }

    const currentIdStr = currId as string;
    const neighbors: { id: string; weight: number }[] = [];
    edges.forEach(e => {
      if (e.from === currentIdStr && !closedSet.has(e.to)) {
        neighbors.push({ id: e.to, weight: e.weight });
      } else if (e.to === currentIdStr && !closedSet.has(e.from)) {
        neighbors.push({ id: e.from, weight: e.weight });
      }
    });

    neighbors.forEach(({ id: neighborId, weight }) => {
      const tentativeG = gScore[currentIdStr] + weight;
      comparisons++;

      if (tentativeG < gScore[neighborId]) {
        parentMap[neighborId] = currentIdStr;
        gScore[neighborId] = tentativeG;
        const neighborNode = nodes.find(n => n.id === neighborId)!;
        fScore[neighborId] = tentativeG + getHeuristic(neighborNode, targetNode);
        arrayWrites += 3;

        if (!openSet.has(neighborId)) {
          openSet.add(neighborId);
          arrayWrites++;
        }

        const nodeObj = nodes.find(n => n.id === neighborId);
        if (nodeObj) {
          nodeObj.isFrontier = true;
        }

        const edge = edges.find(
          e => (e.from === currentIdStr && e.to === neighborId) || (e.from === neighborId && e.to === currentIdStr)
        );
        if (edge) {
          edge.isFrontier = true;
        }
      }
    });

    const endStepElapsed = (Date.now() - startTime) * 1000 + 20;
    yield {
      nodes: nodes.map(n => ({ ...n })),
      edges: edges.map(e => ({ ...e })),
      telemetry: {
        comparisons,
        arrayWrites,
        stackDepth: openSet.size,
        timeMicroseconds: endStepElapsed,
        currentVariables: {
          openSet: Array.from(openSet),
          closedSet: Array.from(closedSet),
          gScores: { ...gScore },
          fScores: { ...fScore }
        },
        activeCodeLine: 8,
      },
    };
  }
}
