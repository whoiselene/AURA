export type AppMode = 'graph' | 'tree' | 'grid';

// --- Graph Types ---
export interface GraphNode {
  id: string;
  label: string;
  x: number;
  y: number;
  isStart?: boolean;
  isTarget?: boolean;
  isVisited?: boolean;
  isFrontier?: boolean;
  isPath?: boolean;
  depth: number;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  weight: number;
  isVisited?: boolean;
  isFrontier?: boolean;
  isPath?: boolean;
  rippleStart?: number; // timestamp for ripple animation
}

// --- Binary Search Tree Types ---
export interface TreeNode {
  id: string;
  key: number;
  leftId: string | null;
  rightId: string | null;
  height: number;              // AVL specific
  color: 'RED' | 'BLACK';     // Red-Black specific
  isVisited?: boolean;
  isFrontier?: boolean;
  isPath?: boolean;
  x: number;
  y: number;
  targetX?: number;            // For smooth transition animation
  targetY?: number;
}

export interface TreeData {
  nodes: Record<string, TreeNode>;
  rootId: string | null;
}

// --- Grid Matrix Types ---
export interface GridCell {
  row: number;
  col: number;
  isWall: boolean;
  isStart: boolean;
  isTarget: boolean;
  isVisited: boolean;
  isFrontier: boolean;
  isPath: boolean;
  gScore: number; // cost from start
  fScore: number; // estimated cost (g + h)
}

// --- Audio Types ---
export type SynthWaveType = 'sine' | 'triangle' | 'sawtooth' | 'square';

export interface AudioSettings {
  volume: number;       // 0 to 1
  waveType: SynthWaveType;
  baseFreq: number;     // e.g., 220
  intervalScale: number; // e.g., 12
  isMuted: boolean;
}

// --- Runner Telemetry ---
export interface Telemetry {
  comparisons: number;
  arrayWrites: number;
  stackDepth: number;
  timeMicroseconds: number;
  currentVariables: Record<string, any>;
  activeCodeLine: number; // line index of pseudocode
}

// --- Playback State ---
export interface PlaybackState {
  isPlaying: boolean;
  speed: number; // delay in ms
  currentStep: number;
  totalSteps: number;
}
