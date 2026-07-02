import type { GridCell, Telemetry } from '../../types';

export interface GridStepState {
  grid: GridCell[][];
  telemetry: Telemetry;
  audio?: {
    type: 'node' | 'backtrack' | 'complete';
    depth: number;
  };
}

// Clone grid to prevent mutating histories
function cloneGrid(grid: GridCell[][]): GridCell[][] {
  return grid.map(row => row.map(cell => ({ ...cell })));
}

// Manhattan distance heuristic for grid movement (4-directional)
function getGridHeuristic(r1: number, c1: number, r2: number, c2: number): number {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

// Reconstruct path for grid nodes
function* reconstructGridPath(
  grid: GridCell[][],
  parentMap: Record<string, string>,
  startKey: string,
  targetKey: string,
  baseTelemetry: Telemetry
): Generator<GridStepState> {
  const pathKeys: string[] = [];
  let curr = targetKey;

  while (curr) {
    pathKeys.push(curr);
    if (curr === startKey) break;
    curr = parentMap[curr];
  }
  pathKeys.reverse();

  let currentGrid = cloneGrid(grid);
  const telemetry = { ...baseTelemetry };

  for (let i = 0; i < pathKeys.length; i++) {
    const [r, c] = pathKeys[i].split(',').map(Number);
    const cell = currentGrid[r][c];
    cell.isPath = true;
    cell.isFrontier = false;
    cell.isVisited = true;

    telemetry.arrayWrites++;
    telemetry.timeMicroseconds += 80;

    yield {
      grid: cloneGrid(currentGrid),
      telemetry: { ...telemetry },
      audio: i === pathKeys.length - 1 ? { type: 'complete', depth: 0 } : { type: 'node', depth: i },
    };
  }
}

// Get 4-way adjacent cell neighbors
function getNeighbors(grid: GridCell[][], cell: GridCell): GridCell[] {
  const neighbors: GridCell[] = [];
  const { row, col } = cell;
  const numRows = grid.length;
  const numCols = grid[0].length;

  const dirs = [
    [-1, 0], // Up
    [1, 0],  // Down
    [0, -1], // Left
    [0, 1],  // Right
  ];

  for (const [dr, dc] of dirs) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < numRows && nc >= 0 && nc < numCols) {
      if (!grid[nr][nc].isWall) {
        neighbors.push(grid[nr][nc]);
      }
    }
  }

  return neighbors;
}

// 1. DIJKSTRA ON GRID
export function* runGridDijkstra(
  initialGrid: GridCell[][],
  startRow: number,
  startCol: number,
  targetRow: number,
  targetCol: number
): Generator<GridStepState> {
  const grid = cloneGrid(initialGrid);
  const numRows = grid.length;
  const numCols = grid[0].length;

  const startKey = `${startRow},${startCol}`;
  const targetKey = `${targetRow},${targetCol}`;

  const distances: Record<string, number> = {};
  const parentMap: Record<string, string> = {};
  const visited = new Set<string>();

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const key = `${r},${c}`;
      distances[key] = Infinity;
      grid[r][c].isVisited = false;
      grid[r][c].isFrontier = false;
      grid[r][c].isPath = false;
    }
  }

  distances[startKey] = 0;
  let comparisons = 0;
  let arrayWrites = 1;
  const startTime = Date.now();

  const totalCells = numRows * numCols;

  while (visited.size < totalCells) {
    let currKey: string | null = null;
    let minDist = Infinity;

    for (let r = 0; r < numRows; r++) {
      for (let c = 0; c < numCols; c++) {
        const key = `${r},${c}`;
        if (!visited.has(key) && distances[key] < minDist) {
          minDist = distances[key];
          currKey = key;
        }
        comparisons++;
      }
    }

    if (currKey === null || minDist === Infinity) {
      break; // rest unreachable
    }

    const currId = currKey as string;
    visited.add(currId);
    arrayWrites++;

    const [r, c] = currId.split(',').map(Number);
    const cell = grid[r][c];
    cell.isVisited = true;
    cell.isFrontier = false;

    // Calculate traversal depth (number of parents)
    let depth = 0;
    let temp = currId;
    while (parentMap[temp]) {
      depth++;
      temp = parentMap[temp];
    }

    const elapsed = (Date.now() - startTime) * 1000 + 10;
    const telemetry: Telemetry = {
      comparisons,
      arrayWrites,
      stackDepth: visited.size,
      timeMicroseconds: elapsed,
      currentVariables: { current: currId, visitedCount: visited.size },
      activeCodeLine: 4,
    };

    yield {
      grid: cloneGrid(grid),
      telemetry,
      audio: { type: 'node', depth },
    };

    if (r === targetRow && c === targetCol) {
      yield* reconstructGridPath(grid, parentMap, startKey, targetKey, telemetry);
      return;
    }

    const cellNeighbors = getNeighbors(grid, cell);
    cellNeighbors.forEach(neighbor => {
      const nKey = `${neighbor.row},${neighbor.col}`;
      if (!visited.has(nKey)) {
        const alt = distances[currId] + 1; // Grid edge weight is always 1
        comparisons++;
        if (alt < distances[nKey]) {
          distances[nKey] = alt;
          parentMap[nKey] = currId;
          arrayWrites += 2;

          neighbor.isFrontier = true;
        }
      }
    });

    const endStepElapsed = (Date.now() - startTime) * 1000 + 20;
    yield {
      grid: cloneGrid(grid),
      telemetry: {
        comparisons,
        arrayWrites,
        stackDepth: visited.size,
        timeMicroseconds: endStepElapsed,
        currentVariables: { current: currId, frontierCount: cellNeighbors.length },
        activeCodeLine: 7,
      },
    };
  }
}

// 2. A* ON GRID
export function* runGridAStar(
  initialGrid: GridCell[][],
  startRow: number,
  startCol: number,
  targetRow: number,
  targetCol: number
): Generator<GridStepState> {
  const grid = cloneGrid(initialGrid);
  const numRows = grid.length;
  const numCols = grid[0].length;

  const startKey = `${startRow},${startCol}`;
  const targetKey = `${targetRow},${targetCol}`;

  const gScore: Record<string, number> = {};
  const fScore: Record<string, number> = {};
  const parentMap: Record<string, string> = {};

  const openSet = new Set<string>([startKey]);
  const closedSet = new Set<string>();

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const key = `${r},${c}`;
      gScore[key] = Infinity;
      fScore[key] = Infinity;
      grid[r][c].isVisited = false;
      grid[r][c].isFrontier = false;
      grid[r][c].isPath = false;
    }
  }

  gScore[startKey] = 0;
  fScore[startKey] = getGridHeuristic(startRow, startCol, targetRow, targetCol);

  let comparisons = 0;
  let arrayWrites = 2;
  const startTime = Date.now();

  while (openSet.size > 0) {
    let currKey: string | null = null;
    let minF = Infinity;

    openSet.forEach(key => {
      if (fScore[key] < minF) {
        minF = fScore[key];
        currKey = key;
      }
      comparisons++;
    });

    if (currKey === null) break;

    const currId = currKey as string;
    openSet.delete(currId);
    closedSet.add(currId);
    arrayWrites += 2;

    const [r, c] = currId.split(',').map(Number);
    const cell = grid[r][c];
    cell.isVisited = true;
    cell.isFrontier = false;

    let depth = 0;
    let temp = currId;
    while (parentMap[temp]) {
      depth++;
      temp = parentMap[temp];
    }

    const elapsed = (Date.now() - startTime) * 1000 + 10;
    const telemetry: Telemetry = {
      comparisons,
      arrayWrites,
      stackDepth: openSet.size,
      timeMicroseconds: elapsed,
      currentVariables: { current: currId, openSize: openSet.size, closedSize: closedSet.size },
      activeCodeLine: 4,
    };

    yield {
      grid: cloneGrid(grid),
      telemetry,
      audio: { type: 'node', depth },
    };

    if (r === targetRow && c === targetCol) {
      yield* reconstructGridPath(grid, parentMap, startKey, targetKey, telemetry);
      return;
    }

    const cellNeighbors = getNeighbors(grid, cell);
    cellNeighbors.forEach(neighbor => {
      const nKey = `${neighbor.row},${neighbor.col}`;
      if (!closedSet.has(nKey)) {
        const tentativeG = gScore[currId] + 1;
        comparisons++;

        if (tentativeG < gScore[nKey]) {
          parentMap[nKey] = currId;
          gScore[nKey] = tentativeG;
          fScore[nKey] = tentativeG + getGridHeuristic(neighbor.row, neighbor.col, targetRow, targetCol);
          arrayWrites += 3;

          if (!openSet.has(nKey)) {
            openSet.add(nKey);
            arrayWrites++;
          }
          neighbor.isFrontier = true;
        }
      }
    });

    const endStepElapsed = (Date.now() - startTime) * 1000 + 20;
    yield {
      grid: cloneGrid(grid),
      telemetry: {
        comparisons,
        arrayWrites,
        stackDepth: openSet.size,
        timeMicroseconds: endStepElapsed,
        currentVariables: { openSize: openSet.size, closedSize: closedSet.size },
        activeCodeLine: 8,
      },
    };
  }
}
