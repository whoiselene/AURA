import { useState, useEffect, useRef, useCallback } from 'react';
import type { 
  AppMode, GraphNode, GraphEdge, TreeData, GridCell, 
  Telemetry, AudioSettings 
} from '../../types';
import { createDefaultGraph, createDefaultTree, createDefaultGrid } from '../algorithms/defaults';
import { runDFS, runBFS, runDijkstra, runAStar } from '../algorithms/graphAlgorithms';
import type { GraphStepState } from '../algorithms/graphAlgorithms';
import { runGridDijkstra, runGridAStar } from '../algorithms/gridAlgorithms';
import type { GridStepState } from '../algorithms/gridAlgorithms';
import { runAVLInsert, runRBInsert, runTreeTraversal } from '../algorithms/treeAlgorithms';
import type { TreeStepState } from '../algorithms/treeAlgorithms';
import { synth } from '../audio/synth';

interface HistoryState {
  mode: AppMode;
  graph: { nodes: GraphNode[]; edges: GraphEdge[] };
  tree: TreeData;
  grid: GridCell[][];
  telemetry: Telemetry;
}

const defaultTelemetry = (): Telemetry => ({
  comparisons: 0,
  arrayWrites: 0,
  stackDepth: 0,
  timeMicroseconds: 0,
  currentVariables: {},
  activeCodeLine: -1,
});

export function useOrchestrator() {
  const [mode, setMode] = useState<AppMode>('graph');
  
  // Custom states
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; edges: GraphEdge[] }>(createDefaultGraph);
  const [treeData, setTreeData] = useState<TreeData>(createDefaultTree);
  const [gridData, setGridData] = useState<GridCell[][]>(() => createDefaultGrid());

  // Editor states
  const [graphStartNodeId, setGraphStartNodeId] = useState<string>('A');
  const [graphTargetNodeId, setGraphTargetNodeId] = useState<string>('F');
  const [activeAlgoName, setActiveAlgoName] = useState<string>('');

  // Audio state
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() => synth.getSettings());

  // Playback & Telemetry
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(150); // delay in ms
  const [currentStep, setCurrentStep] = useState(0);
  const [telemetry, setTelemetry] = useState<Telemetry>(defaultTelemetry());

  // Generator & Time travel
  const generatorRef = useRef<Generator<any> | null>(null);
  const historyRef = useRef<HistoryState[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize Web Audio context
  const initAudio = useCallback(() => {
    synth.init();
    setAudioSettings(synth.getSettings());
  }, []);

  const toggleMute = useCallback(() => {
    const updatedMute = !audioSettings.isMuted;
    synth.updateSettings({ isMuted: updatedMute });
    setAudioSettings({ ...audioSettings, isMuted: updatedMute });
  }, [audioSettings]);

  const updateVolume = useCallback((vol: number) => {
    synth.updateSettings({ volume: vol });
    setAudioSettings({ ...audioSettings, volume: vol });
  }, [audioSettings]);

  const updateWaveType = useCallback((wave: any) => {
    synth.updateSettings({ waveType: wave });
    setAudioSettings({ ...audioSettings, waveType: wave });
  }, [audioSettings]);

  const updateBaseFreq = useCallback((freq: number) => {
    synth.updateSettings({ baseFreq: freq });
    setAudioSettings({ ...audioSettings, baseFreq: freq });
  }, [audioSettings]);

  const updateIntervalScale = useCallback((scale: number) => {
    synth.updateSettings({ intervalScale: scale });
    setAudioSettings({ ...audioSettings, intervalScale: scale });
  }, [audioSettings]);

  // Capture a snapshot of current engine state
  const captureSnapshot = useCallback((
    gData = graphData,
    tData = treeData,
    grData = gridData,
    tel = telemetry
  ): HistoryState => {
    return {
      mode,
      graph: {
        nodes: gData.nodes.map(n => ({ ...n })),
        edges: gData.edges.map(e => ({ ...e })),
      },
      tree: {
        nodes: Object.keys(tData.nodes).reduce((acc, key) => {
          acc[key] = { ...tData.nodes[key] };
          return acc;
        }, {} as Record<string, any>),
        rootId: tData.rootId,
      },
      grid: grData.map(row => row.map(cell => ({ ...cell }))),
      telemetry: { ...tel },
    };
  }, [mode, graphData, treeData, gridData, telemetry]);

  // Restore snapshot
  const restoreSnapshot = useCallback((state: HistoryState) => {
    setGraphData(state.graph);
    setTreeData(state.tree);
    setGridData(state.grid);
    setTelemetry(state.telemetry);
  }, []);

  // Set visual mode & reset
  const changeMode = useCallback((newMode: AppMode) => {
    setIsPlaying(false);
    setMode(newMode);
    setActiveAlgoName('');
    setCurrentStep(0);
    setTelemetry(defaultTelemetry());
    generatorRef.current = null;
    historyRef.current = [];

    // Load defaults on reset mode
    if (newMode === 'graph') {
      const def = createDefaultGraph();
      setGraphData(def);
      setGraphStartNodeId('A');
      setGraphTargetNodeId('F');
    } else if (newMode === 'tree') {
      setTreeData(createDefaultTree());
    } else if (newMode === 'grid') {
      setGridData(createDefaultGrid());
    }
  }, []);

  // Stop algorithm and reset to default
  const reset = useCallback(() => {
    setIsPlaying(false);
    setCurrentStep(0);
    setTelemetry(defaultTelemetry());
    generatorRef.current = null;
    historyRef.current = [];
    setActiveAlgoName('');

    if (mode === 'graph') {
      const def = createDefaultGraph();
      setGraphData(def);
      setGraphStartNodeId('A');
      setGraphTargetNodeId('F');
    } else if (mode === 'tree') {
      setTreeData(createDefaultTree());
    } else if (mode === 'grid') {
      setGridData(createDefaultGrid());
    }
  }, [mode]);

  // Launch Algorithm Generator
  const startAlgorithm = useCallback((algo: string, additionalParam?: any) => {
    setIsPlaying(false);
    setCurrentStep(0);
    setActiveAlgoName(algo);
    setTelemetry(defaultTelemetry());
    historyRef.current = [];

    // Ensure audio init
    synth.init();

    let gen: Generator<any> | null = null;

    if (mode === 'graph') {
      // Clear search markers first
      const cleanNodes = graphData.nodes.map(n => ({ ...n, isVisited: false, isFrontier: false, isPath: false }));
      const cleanEdges = graphData.edges.map(e => ({ ...e, isVisited: false, isFrontier: false, isPath: false }));
      setGraphData({ nodes: cleanNodes, edges: cleanEdges });

      if (algo === 'dfs') {
        gen = runDFS(cleanNodes, cleanEdges, graphStartNodeId, graphTargetNodeId);
      } else if (algo === 'bfs') {
        gen = runBFS(cleanNodes, cleanEdges, graphStartNodeId, graphTargetNodeId);
      } else if (algo === 'dijkstra') {
        gen = runDijkstra(cleanNodes, cleanEdges, graphStartNodeId, graphTargetNodeId);
      } else if (algo === 'astar') {
        gen = runAStar(cleanNodes, cleanEdges, graphStartNodeId, graphTargetNodeId);
      }
    } 
    else if (mode === 'tree') {
      // Clear tree search markers
      const cleanNodes = { ...treeData.nodes };
      Object.keys(cleanNodes).forEach(id => {
        cleanNodes[id] = { ...cleanNodes[id], isVisited: false, isFrontier: false, isPath: false };
      });
      const cleanTree = { nodes: cleanNodes, rootId: treeData.rootId };
      setTreeData(cleanTree);

      if (algo === 'avl_insert') {
        const val = Number(additionalParam);
        if (!isNaN(val)) gen = runAVLInsert(cleanTree, val);
      } else if (algo === 'rb_insert') {
        const val = Number(additionalParam);
        if (!isNaN(val)) gen = runRBInsert(cleanTree, val);
      } else if (algo === 'traverse_in') {
        gen = runTreeTraversal(cleanTree, 'inorder');
      } else if (algo === 'traverse_pre') {
        gen = runTreeTraversal(cleanTree, 'preorder');
      } else if (algo === 'traverse_post') {
        gen = runTreeTraversal(cleanTree, 'postorder');
      }
    } 
    else if (mode === 'grid') {
      // Find start and target cells
      let startRow = 8, startCol = 3, targetRow = 8, targetCol = 20;
      const cleanGrid = gridData.map(row => row.map(cell => {
        if (cell.isStart) {
          startRow = cell.row;
          startCol = cell.col;
        }
        if (cell.isTarget) {
          targetRow = cell.row;
          targetCol = cell.col;
        }
        return { ...cell, isVisited: false, isFrontier: false, isPath: false };
      }));
      setGridData(cleanGrid);

      if (algo === 'dijkstra') {
        gen = runGridDijkstra(cleanGrid, startRow, startCol, targetRow, targetCol);
      } else if (algo === 'astar') {
        gen = runGridAStar(cleanGrid, startRow, startCol, targetRow, targetCol);
      }
    }

    if (gen) {
      generatorRef.current = gen;
      // Push first snapshot before doing anything
      const initialSnapshot = captureSnapshot(
        mode === 'graph' ? graphData : undefined,
        mode === 'tree' ? treeData : undefined,
        mode === 'grid' ? gridData : undefined,
        defaultTelemetry()
      );
      historyRef.current = [initialSnapshot];
      
      // Execute first step
      stepForwardDirect(gen);
    }
  }, [mode, graphData, treeData, gridData, graphStartNodeId, graphTargetNodeId, captureSnapshot]);

  // Forward one step (returns if step succeeded)
  const stepForwardDirect = (gen: Generator<any>): boolean => {
    const res = gen.next();
    if (res.done) {
      setIsPlaying(false);
      return false;
    }

    const val = res.value;
    
    // Play synthesis mapping
    if (val.audio) {
      const maxDepth = mode === 'grid' ? 60 : 6;
      if (val.audio.type === 'node') {
        synth.playNode(val.audio.depth, maxDepth);
      } else if (val.audio.type === 'backtrack') {
        synth.playBacktrack(val.audio.depth, maxDepth);
      } else if (val.audio.type === 'complete') {
        synth.playPathCompleted();
      }
    }

    // Apply data structure visual states
    if (mode === 'graph') {
      const gVal = val as GraphStepState;
      setGraphData({ nodes: gVal.nodes, edges: gVal.edges });
      setTelemetry(gVal.telemetry);
    } else if (mode === 'tree') {
      const tVal = val as TreeStepState;
      setTreeData(tVal.tree);
      setTelemetry(tVal.telemetry);
    } else if (mode === 'grid') {
      const mVal = val as GridStepState;
      setGridData(mVal.grid);
      setTelemetry(mVal.telemetry);
    }

    // Record snapshot
    const snap = {
      mode,
      graph: mode === 'graph' ? (val as GraphStepState).nodes ? { nodes: (val as GraphStepState).nodes, edges: (val as GraphStepState).edges } : graphData : graphData,
      tree: mode === 'tree' ? (val as TreeStepState).tree : treeData,
      grid: mode === 'grid' ? (val as GridStepState).grid : gridData,
      telemetry: val.telemetry,
    };
    
    historyRef.current.push(snap);
    setCurrentStep(historyRef.current.length - 1);
    return true;
  };

  // Stepping Forward Wrapper
  const stepForward = useCallback(() => {
    if (currentStep < historyRef.current.length - 1) {
      // If we are in history, just restore from history
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      restoreSnapshot(historyRef.current[nextIndex]);
      
      // Play a quick node sound for movement
      synth.playNode(nextIndex % 6, 6);
    } else if (generatorRef.current) {
      stepForwardDirect(generatorRef.current);
    }
  }, [currentStep, restoreSnapshot, mode]);

  // Stepping Backward
  const stepBackward = useCallback(() => {
    if (currentStep > 0) {
      const prevIndex = currentStep - 1;
      setCurrentStep(prevIndex);
      restoreSnapshot(historyRef.current[prevIndex]);
      
      // Trigger a light descending sweep to represent going backward
      synth.playBacktrack(prevIndex % 6, 6);
    }
  }, [currentStep, restoreSnapshot]);

  // Auto-run loop
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        if (currentStep < historyRef.current.length - 1) {
          const nextIndex = currentStep + 1;
          setCurrentStep(nextIndex);
          restoreSnapshot(historyRef.current[nextIndex]);
          synth.playNode(nextIndex % 6, 6);
        } else if (generatorRef.current) {
          const ok = stepForwardDirect(generatorRef.current);
          if (!ok) {
            setIsPlaying(false);
          }
        } else {
          setIsPlaying(false);
        }
      }, speed);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPlaying, speed, currentStep, restoreSnapshot]);

  return {
    mode,
    changeMode,
    graphData,
    setGraphData,
    treeData,
    setTreeData,
    gridData,
    setGridData,
    
    // Editor controls
    graphStartNodeId,
    setGraphStartNodeId,
    graphTargetNodeId,
    setGraphTargetNodeId,
    activeAlgoName,
    
    // Audio controls
    audioSettings,
    initAudio,
    toggleMute,
    updateVolume,
    updateWaveType,
    updateBaseFreq,
    updateIntervalScale,

    // Playback state
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    currentStep,
    totalSteps: historyRef.current.length,
    telemetry,

    // Step Triggers
    startAlgorithm,
    stepForward,
    stepBackward,
    reset,
  };
}
export type Orchestrator = ReturnType<typeof useOrchestrator>;
