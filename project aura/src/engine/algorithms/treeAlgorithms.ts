import type { TreeNode, TreeData, Telemetry } from '../../types';

export interface TreeStepState {
  tree: TreeData;
  telemetry: Telemetry;
  audio?: {
    type: 'node' | 'backtrack' | 'complete';
    depth: number;
  };
}

// Clone tree structure
function cloneTree(tree: TreeData): TreeData {
  const nodes: Record<string, TreeNode> = {};
  Object.keys(tree.nodes).forEach(id => {
    nodes[id] = { ...tree.nodes[id] };
  });
  return {
    nodes,
    rootId: tree.rootId,
  };
}

// Layout helper for tree rendering coordinates
export function layoutTree(rootId: string | null, nodes: Record<string, TreeNode>, width: number = 800): Record<string, { x: number; y: number }> {
  const coords: Record<string, { x: number; y: number }> = {};
  
  function traverse(nodeId: string | null, depth: number, minX: number, maxX: number) {
    if (!nodeId || !nodes[nodeId]) return;
    const x = (minX + maxX) / 2;
    const y = 60 + depth * 75;
    coords[nodeId] = { x, y };

    traverse(nodes[nodeId].leftId, depth + 1, minX, x);
    traverse(nodes[nodeId].rightId, depth + 1, x, maxX);
  }

  traverse(rootId, 0, 20, width - 20);
  return coords;
}

function applyLayout(tree: TreeData) {
  const coords = layoutTree(tree.rootId, tree.nodes);
  Object.keys(coords).forEach(id => {
    if (tree.nodes[id]) {
      tree.nodes[id].x = coords[id].x;
      tree.nodes[id].y = coords[id].y;
    }
  });
}

// Node height helper (AVL)
function getHeight(nodeId: string | null, nodes: Record<string, TreeNode>): number {
  if (!nodeId || !nodes[nodeId]) return 0;
  return nodes[nodeId].height;
}

// Balance factor helper (AVL)
function getBalance(nodeId: string | null, nodes: Record<string, TreeNode>): number {
  if (!nodeId || !nodes[nodeId]) return 0;
  return getHeight(nodes[nodeId].leftId, nodes) - getHeight(nodes[nodeId].rightId, nodes);
}

// -------------------------------------------------------------
// AVL TREE INSERTION GENERATOR
// -------------------------------------------------------------
export function* runAVLInsert(initialTree: TreeData, key: number): Generator<TreeStepState> {
  const tree = cloneTree(initialTree);
  const startTime = Date.now();
  let comparisons = 0;
  let arrayWrites = 0;

  // Clear highlights
  Object.keys(tree.nodes).forEach(id => {
    tree.nodes[id].isVisited = false;
    tree.nodes[id].isFrontier = false;
  });

  const newNodeId = `node_${key}_${Date.now()}`;
  const newNode: TreeNode = {
    id: newNodeId,
    key,
    leftId: null,
    rightId: null,
    height: 1,
    color: 'RED', // default
    x: 400,
    y: 60,
  };

  const telemetry: Telemetry = {
    comparisons,
    arrayWrites,
    stackDepth: 0,
    timeMicroseconds: 0,
    currentVariables: { insertKey: key, root: tree.rootId },
    activeCodeLine: 1, // Start insert
  };

  if (!tree.rootId) {
    tree.rootId = newNodeId;
    tree.nodes[newNodeId] = newNode;
    applyLayout(tree);
    arrayWrites += 2;
    yield {
      tree,
      telemetry: { ...telemetry, arrayWrites, timeMicroseconds: 100 },
      audio: { type: 'complete', depth: 0 },
    };
    return;
  }

  // Iterative BST Traversal with stack path record for bottom-up balancing
  const path: string[] = [];
  let currId: string | null = tree.rootId;
  let parentId: string | null = null;
  let depth = 0;

  while (currId) {
    path.push(currId);
    parentId = currId;
    const currNode = tree.nodes[currId] as TreeNode;
    currNode.isVisited = true;
    comparisons++;

    telemetry.comparisons = comparisons;
    telemetry.stackDepth = path.length;
    telemetry.currentVariables = { currKey: currNode.key, insertKey: key, path: path.map(id => tree.nodes[id].key) };
    telemetry.timeMicroseconds = (Date.now() - startTime) * 1000 + 50;

    yield {
      tree: cloneTree(tree),
      telemetry: { ...telemetry },
      audio: { type: 'node', depth },
    };

    if (key < currNode.key) {
      currId = currNode.leftId;
    } else if (key > currNode.key) {
      currId = currNode.rightId;
    } else {
      // Key already exists, cancel insert
      yield {
        tree: cloneTree(tree),
        telemetry: {
          ...telemetry,
          currentVariables: { error: 'Duplicate key' },
        },
      };
      return;
    }
    depth++;
  }

  // Insert node
  tree.nodes[newNodeId] = newNode;
  const parentNode = tree.nodes[parentId!];
  if (key < parentNode.key) {
    parentNode.leftId = newNodeId;
  } else {
    parentNode.rightId = newNodeId;
  }
  arrayWrites += 2;
  applyLayout(tree);

  yield {
    tree: cloneTree(tree),
    telemetry: {
      ...telemetry,
      arrayWrites,
      activeCodeLine: 5, // Insert leaf
      currentVariables: { inserted: key },
    },
    audio: { type: 'node', depth },
  };

  // Re-balance traversing bottom-up
  for (let i = path.length - 1; i >= 0; i--) {
    const pId = path[i];
    const pNode = tree.nodes[pId];

    // Update height
    const leftH = getHeight(pNode.leftId, tree.nodes);
    const rightH = getHeight(pNode.rightId, tree.nodes);
    pNode.height = Math.max(leftH, rightH) + 1;
    arrayWrites++;

    const balance = getBalance(pId, tree.nodes);
    telemetry.currentVariables = { checkingNode: pNode.key, balance, height: pNode.height };
    
    // Balance check step
    yield {
      tree: cloneTree(tree),
      telemetry: {
        ...telemetry,
        arrayWrites,
        activeCodeLine: 7, // Balance check
      },
    };

    // Left Heavy Case
    if (balance > 1) {
      const leftChildId = pNode.leftId!;
      const leftChild = tree.nodes[leftChildId];
      
      // Left-Left Case
      if (key < leftChild.key) {
        // Right rotation on pId
        yield* rotateRight(tree, pId, telemetry, arrayWrites);
      } 
      // Left-Right Case
      else {
        // Left rotation on leftChildId, then Right rotation on pId
        yield* rotateLeft(tree, leftChildId, telemetry, arrayWrites);
        yield* rotateRight(tree, pId, telemetry, arrayWrites);
      }
      applyLayout(tree);
      break; // Balance restored
    }

    // Right Heavy Case
    if (balance < -1) {
      const rightChildId = pNode.rightId!;
      const rightChild = tree.nodes[rightChildId];
      
      // Right-Right Case
      if (key > rightChild.key) {
        // Left rotation on pId
        yield* rotateLeft(tree, pId, telemetry, arrayWrites);
      }
      // Right-Left Case
      else {
        // Right rotation on rightChildId, then Left rotation on pId
        yield* rotateRight(tree, rightChildId, telemetry, arrayWrites);
        yield* rotateLeft(tree, pId, telemetry, arrayWrites);
      }
      applyLayout(tree);
      break; // Balance restored
    }
  }

  // Clear final visited states
  Object.keys(tree.nodes).forEach(id => {
    tree.nodes[id].isVisited = false;
  });

  yield {
    tree,
    telemetry: {
      ...telemetry,
      arrayWrites,
      currentVariables: { completed: true },
      activeCodeLine: 12, // Complete
    },
    audio: { type: 'complete', depth: 0 },
  };
}

// Rotation Helpers (Generators to visualize step)
function* rotateLeft(tree: TreeData, xId: string, telemetry: Telemetry, writes: number): Generator<TreeStepState> {
  const x = tree.nodes[xId];
  const yId = x.rightId!;
  const y = tree.nodes[yId];
  
  // Perform rotation
  x.rightId = y.leftId;
  y.leftId = xId;

  // Update heights
  x.height = Math.max(getHeight(x.leftId, tree.nodes), getHeight(x.rightId, tree.nodes)) + 1;
  y.height = Math.max(getHeight(y.leftId, tree.nodes), getHeight(y.rightId, tree.nodes)) + 1;

  // Re-parent link
  if (tree.rootId === xId) {
    tree.rootId = yId;
  } else {
    // Find parent of x
    const parentId = Object.keys(tree.nodes).find(
      id => tree.nodes[id].leftId === xId || tree.nodes[id].rightId === xId
    )!;
    const parent = tree.nodes[parentId];
    if (parent.leftId === xId) {
      parent.leftId = yId;
    } else {
      parent.rightId = yId;
    }
  }

  telemetry.arrayWrites = writes + 5;
  telemetry.currentVariables = { rotation: 'Left Rotation', pivot: x.key, newSubroot: y.key };
  applyLayout(tree);

  yield {
    tree: cloneTree(tree),
    telemetry: { ...telemetry },
    audio: { type: 'complete', depth: 1 },
  };
}

function* rotateRight(tree: TreeData, yId: string, telemetry: Telemetry, writes: number): Generator<TreeStepState> {
  const y = tree.nodes[yId];
  const xId = y.leftId!;
  const x = tree.nodes[xId];

  // Perform rotation
  y.leftId = x.rightId;
  x.rightId = yId;

  // Update heights
  y.height = Math.max(getHeight(y.leftId, tree.nodes), getHeight(y.rightId, tree.nodes)) + 1;
  x.height = Math.max(getHeight(x.leftId, tree.nodes), getHeight(x.rightId, tree.nodes)) + 1;

  // Re-parent link
  if (tree.rootId === yId) {
    tree.rootId = xId;
  } else {
    const parentId = Object.keys(tree.nodes).find(
      id => tree.nodes[id].leftId === yId || tree.nodes[id].rightId === yId
    )!;
    const parent = tree.nodes[parentId];
    if (parent.leftId === yId) {
      parent.leftId = xId;
    } else {
      parent.rightId = xId;
    }
  }

  telemetry.arrayWrites = writes + 5;
  telemetry.currentVariables = { rotation: 'Right Rotation', pivot: y.key, newSubroot: x.key };
  applyLayout(tree);

  yield {
    tree: cloneTree(tree),
    telemetry: { ...telemetry },
    audio: { type: 'complete', depth: 1 },
  };
}


// -------------------------------------------------------------
// RED-BLACK TREE INSERTION GENERATOR
// -------------------------------------------------------------
export function* runRBInsert(initialTree: TreeData, key: number): Generator<TreeStepState> {
  const tree = cloneTree(initialTree);
  const startTime = Date.now();
  let comparisons = 0;
  let arrayWrites = 0;

  // Clean tree flags
  Object.keys(tree.nodes).forEach(id => {
    tree.nodes[id].isVisited = false;
    tree.nodes[id].isFrontier = false;
  });

  const newNodeId = `node_${key}_${Date.now()}`;
  const newNode: TreeNode = {
    id: newNodeId,
    key,
    leftId: null,
    rightId: null,
    height: 1,
    color: 'RED', // Nodes are always inserted as RED
    x: 400,
    y: 60,
  };

  const telemetry: Telemetry = {
    comparisons,
    arrayWrites,
    stackDepth: 0,
    timeMicroseconds: 0,
    currentVariables: { insertKey: key, root: tree.rootId },
    activeCodeLine: 1,
  };

  if (!tree.rootId) {
    tree.rootId = newNodeId;
    newNode.color = 'BLACK'; // Root must be black
    tree.nodes[newNodeId] = newNode;
    applyLayout(tree);
    arrayWrites += 2;
    yield {
      tree,
      telemetry: { ...telemetry, arrayWrites, timeMicroseconds: 100 },
      audio: { type: 'complete', depth: 0 },
    };
    return;
  }

  // Traverse to leaf
  const path: string[] = [];
  let currId: string | null = tree.rootId;
  let parentId: string | null = null;
  let depth = 0;

  while (currId) {
    path.push(currId);
    parentId = currId;
    const currNode = tree.nodes[currId] as TreeNode;
    currNode.isVisited = true;
    comparisons++;

    telemetry.comparisons = comparisons;
    telemetry.stackDepth = path.length;
    telemetry.currentVariables = { currKey: currNode.key, insertKey: key };
    telemetry.timeMicroseconds = (Date.now() - startTime) * 1000 + 40;

    yield {
      tree: cloneTree(tree),
      telemetry: { ...telemetry },
      audio: { type: 'node', depth },
    };

    if (key < currNode.key) {
      currId = currNode.leftId;
    } else if (key > currNode.key) {
      currId = currNode.rightId;
    } else {
      return; // Duplicate
    }
    depth++;
  }

  // Insert node (RED)
  tree.nodes[newNodeId] = newNode;
  const parentNode = tree.nodes[parentId!];
  if (key < parentNode.key) {
    parentNode.leftId = newNodeId;
  } else {
    parentNode.rightId = newNodeId;
  }
  arrayWrites += 2;
  applyLayout(tree);

  yield {
    tree: cloneTree(tree),
    telemetry: {
      ...telemetry,
      arrayWrites,
      activeCodeLine: 5,
      currentVariables: { insertedKey: key, color: 'RED' },
    },
    audio: { type: 'node', depth },
  };

  // Re-parent pointer walk for Red-Black fixing rules
  let xId = newNodeId;
  path.push(xId);

  // Index helper
  function getParentId(id: string): string | null {
    const idx = path.indexOf(id);
    return idx > 0 ? path[idx - 1] : null;
  }
  function getGrandparentId(id: string): string | null {
    const idx = path.indexOf(id);
    return idx > 1 ? path[idx - 2] : null;
  }

  while (xId !== tree.rootId && tree.nodes[xId].color === 'RED') {
    const pId = getParentId(xId);
    if (!pId || tree.nodes[pId].color === 'BLACK') break;

    const gpId = getGrandparentId(xId);
    if (!gpId) break;

    const gpNode = tree.nodes[gpId];
    const pNode = tree.nodes[pId];

    // Case A: Parent of x is left child of grandparent
    if (pId === gpNode.leftId) {
      const uncleId = gpNode.rightId;
      const uncleNode = uncleId ? tree.nodes[uncleId] : null;

      // Case A1: Uncle is also RED (Color flip recoloring)
      if (uncleNode && uncleNode.color === 'RED') {
        pNode.color = 'BLACK';
        uncleNode.color = 'BLACK';
        gpNode.color = 'RED';
        arrayWrites += 3;

        telemetry.currentVariables = { rule: 'Recolor / Color Flip', parent: pNode.key, uncle: uncleNode.key, grandparent: gpNode.key };
        yield {
          tree: cloneTree(tree),
          telemetry: { ...telemetry, arrayWrites },
          audio: { type: 'backtrack', depth: path.indexOf(gpId) },
        };
        xId = gpId; // continue check upwards
      } 
      // Case A2: Uncle is BLACK (requires rotations)
      else {
        // Node is right child: double rotation check (Triangle shape)
        if (xId === pNode.rightId) {
          xId = pId;
          yield* rotateLeft(tree, xId, telemetry, arrayWrites);
          applyLayout(tree);
        }

        // Recoloring and rotation (Line shape)
        const newPId = getParentId(xId)!;
        const newGPId = getGrandparentId(xId)!;
        tree.nodes[newPId].color = 'BLACK';
        tree.nodes[newGPId].color = 'RED';
        arrayWrites += 2;

        yield* rotateRight(tree, newGPId, telemetry, arrayWrites);
        applyLayout(tree);
      }
    } 
    // Case B: Parent of x is right child of grandparent
    else {
      const uncleId = gpNode.leftId;
      const uncleNode = uncleId ? tree.nodes[uncleId] : null;

      if (uncleNode && uncleNode.color === 'RED') {
        pNode.color = 'BLACK';
        uncleNode.color = 'BLACK';
        gpNode.color = 'RED';
        arrayWrites += 3;

        telemetry.currentVariables = { rule: 'Recolor / Color Flip', parent: pNode.key, uncle: uncleNode.key, grandparent: gpNode.key };
        yield {
          tree: cloneTree(tree),
          telemetry: { ...telemetry, arrayWrites },
          audio: { type: 'backtrack', depth: path.indexOf(gpId) },
        };
        xId = gpId;
      } else {
        if (xId === pNode.leftId) {
          xId = pId;
          yield* rotateRight(tree, xId, telemetry, arrayWrites);
          applyLayout(tree);
        }
        
        const newPId = getParentId(xId)!;
        const newGPId = getGrandparentId(xId)!;
        tree.nodes[newPId].color = 'BLACK';
        tree.nodes[newGPId].color = 'RED';
        arrayWrites += 2;

        yield* rotateLeft(tree, newGPId, telemetry, arrayWrites);
        applyLayout(tree);
      }
    }
  }

  // Ensure root is always BLACK
  if (tree.rootId && tree.nodes[tree.rootId].color !== 'BLACK') {
    tree.nodes[tree.rootId].color = 'BLACK';
    arrayWrites++;
  }

  applyLayout(tree);

  // Clear final visited states
  Object.keys(tree.nodes).forEach(id => {
    tree.nodes[id].isVisited = false;
  });

  yield {
    tree,
    telemetry: {
      ...telemetry,
      arrayWrites,
      currentVariables: { completed: true },
      activeCodeLine: 12,
    },
    audio: { type: 'complete', depth: 0 },
  };
}

// -------------------------------------------------------------
// TREE TRAVERSAL GENERATOR (Inorder, Preorder, Postorder)
// -------------------------------------------------------------
export function* runTreeTraversal(
  initialTree: TreeData,
  type: 'inorder' | 'preorder' | 'postorder'
): Generator<TreeStepState> {
  const tree = cloneTree(initialTree);
  const startTime = Date.now();
  let comparisons = 0;
  let arrayWrites = 0;

  // Clear state flags
  Object.keys(tree.nodes).forEach(id => {
    tree.nodes[id].isVisited = false;
  });

  const nodeOrder: string[] = [];

  function traverse(nodeId: string | null) {
    if (!nodeId || !tree.nodes[nodeId]) return;
    
    if (type === 'preorder') {
      nodeOrder.push(nodeId);
    }
    traverse(tree.nodes[nodeId].leftId);
    if (type === 'inorder') {
      nodeOrder.push(nodeId);
    }
    traverse(tree.nodes[nodeId].rightId);
    if (type === 'postorder') {
      nodeOrder.push(nodeId);
    }
  }

  traverse(tree.rootId);

  const telemetry: Telemetry = {
    comparisons,
    arrayWrites,
    stackDepth: 0,
    timeMicroseconds: 0,
    currentVariables: { type, orderKeys: nodeOrder.map(id => tree.nodes[id].key) },
    activeCodeLine: 1,
  };

  // Yield each visited node in order, with depth sounds
  for (let i = 0; i < nodeOrder.length; i++) {
    const id = nodeOrder[i];
    const node = tree.nodes[id];
    node.isVisited = true;
    comparisons++;

    // Calculate node depth
    let depth = 0;
    let temp = id;
    // Walk up to root to find exact depth
    while (temp !== tree.rootId) {
      const parentId = Object.keys(tree.nodes).find(
        p => tree.nodes[p].leftId === temp || tree.nodes[p].rightId === temp
      );
      if (parentId) {
        depth++;
        temp = parentId;
      } else {
        break;
      }
    }

    telemetry.comparisons = comparisons;
    telemetry.stackDepth = depth;
    telemetry.currentVariables = { current: node.key, index: i, orderKeys: nodeOrder.map(nId => tree.nodes[nId].key) };
    telemetry.timeMicroseconds = (Date.now() - startTime) * 1000 + 30;

    yield {
      tree: cloneTree(tree),
      telemetry: { ...telemetry },
      audio: { type: 'node', depth },
    };
  }

  yield {
    tree,
    telemetry: {
      ...telemetry,
      activeCodeLine: 10,
    },
    audio: { type: 'complete', depth: 0 },
  };
}
