import type { GraphNode, GraphEdge, TreeData, GridCell } from '../../types';

// Default Graph
export function createDefaultGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const nodes: GraphNode[] = [
    { id: 'A', label: 'NEURON_A', x: 150, y: 150, isStart: true, depth: 0 },
    { id: 'B', label: 'NEURON_B', x: 350, y: 100, depth: 0 },
    { id: 'C', label: 'NEURON_C', x: 550, y: 120, depth: 0 },
    { id: 'D', label: 'NEURON_D', x: 250, y: 250, depth: 0 },
    { id: 'E', label: 'NEURON_E', x: 450, y: 280, depth: 0 },
    { id: 'F', label: 'NEURON_F', x: 650, y: 260, isTarget: true, depth: 0 },
    { id: 'G', label: 'NEURON_G', x: 350, y: 400, depth: 0 },
    { id: 'H', label: 'NEURON_H', x: 550, y: 420, depth: 0 },
  ];

  const edges: GraphEdge[] = [
    { id: 'e1', from: 'A', to: 'B', weight: 4 },
    { id: 'e2', from: 'A', to: 'D', weight: 6 },
    { id: 'e3', from: 'B', to: 'C', weight: 5 },
    { id: 'e4', from: 'B', to: 'D', weight: 2 },
    { id: 'e5', from: 'B', to: 'E', weight: 7 },
    { id: 'e6', from: 'C', to: 'E', weight: 3 },
    { id: 'e7', from: 'C', to: 'F', weight: 4 },
    { id: 'e8', from: 'D', to: 'E', weight: 5 },
    { id: 'e9', from: 'D', to: 'G', weight: 8 },
    { id: 'e10', from: 'E', to: 'F', weight: 6 },
    { id: 'e11', from: 'E', to: 'H', weight: 4 },
    { id: 'e12', from: 'G', to: 'H', weight: 3 },
    { id: 'e13', from: 'H', to: 'F', weight: 5 },
  ];

  return { nodes, edges };
}

// Default Tree
export function createDefaultTree(): TreeData {
  const nodes: Record<string, any> = {
    'node_50': { id: 'node_50', key: 50, leftId: 'node_30', rightId: 'node_70', height: 3, color: 'BLACK', x: 400, y: 60 },
    'node_30': { id: 'node_30', key: 30, leftId: 'node_20', rightId: 'node_40', height: 2, color: 'RED', x: 200, y: 135 },
    'node_70': { id: 'node_70', key: 70, leftId: 'node_60', rightId: 'node_80', height: 2, color: 'RED', x: 600, y: 135 },
    'node_20': { id: 'node_20', key: 20, leftId: null, rightId: null, height: 1, color: 'BLACK', x: 100, y: 210 },
    'node_40': { id: 'node_40', key: 40, leftId: null, rightId: null, height: 1, color: 'BLACK', x: 300, y: 210 },
    'node_60': { id: 'node_60', key: 60, leftId: null, rightId: null, height: 1, color: 'BLACK', x: 500, y: 210 },
    'node_80': { id: 'node_80', key: 80, leftId: null, rightId: null, height: 1, color: 'BLACK', x: 700, y: 210 },
  };

  return {
    nodes,
    rootId: 'node_50',
  };
}

// Default Grid Matrix
export function createDefaultGrid(numRows = 16, numCols = 24): GridCell[][] {
  const grid: GridCell[][] = [];
  const startRow = 8;
  const startCol = 3;
  const targetRow = 8;
  const targetCol = 20;

  for (let r = 0; r < numRows; r++) {
    const row: GridCell[] = [];
    for (let c = 0; c < numCols; c++) {
      // Create a vertical divider wall in column 10, leaving a door at row 7 & 8
      const isWall = c === 10 && r !== 7 && r !== 8;
      
      row.push({
        row: r,
        col: c,
        isWall,
        isStart: r === startRow && c === startCol,
        isTarget: r === targetRow && c === targetCol,
        isVisited: false,
        isFrontier: false,
        isPath: false,
        gScore: Infinity,
        fScore: Infinity,
      });
    }
    grid.push(row);
  }

  return grid;
}
