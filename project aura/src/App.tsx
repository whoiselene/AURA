import { useState, useEffect } from 'react';
import { useOrchestrator } from './engine/hooks/useOrchestrator';
import { ControlPanel } from './components/control-panel/ControlPanel';
import { TelemetryDashboard } from './components/metrics/TelemetryDashboard';
import { GraphViewport } from './components/viewport/GraphViewport';
import { TreeViewport } from './components/viewport/TreeViewport';
import { GridViewport } from './components/viewport/GridViewport';
import { Terminal, Shield, Cpu, RefreshCw } from 'lucide-react';

function App() {
  const orchestrator = useOrchestrator();
  const {
    mode,
    graphData,
    setGraphData,
    treeData,
    gridData,
    setGridData,
    graphStartNodeId,
    setGraphStartNodeId,
    graphTargetNodeId,
    setGraphTargetNodeId,
    isPlaying,
    activeAlgoName,
    startAlgorithm,
    reset,
    telemetry,
  } = orchestrator;

  // Header System clock
  const [systemClock, setSystemClock] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      const dy = String(d.getDate()).padStart(2, '0');
      const hr = String(d.getHours()).padStart(2, '0');
      const mn = String(d.getMinutes()).padStart(2, '0');
      const sc = String(d.getSeconds()).padStart(2, '0');
      setSystemClock(`${yr}-${mo}-${dy} ${hr}:${mn}:${sc}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col font-sans select-none text-gray-100 bg-cyber-bg overflow-hidden p-3 md:p-5">
      {/* Premium Cyberpunk scanline noise overlay */}
      <div className="noise-overlay" />

      {/* HEADER SECTION */}
      <header className="flex items-center justify-between border-b border-cyber-frontier/30 pb-3 mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded bg-pink-950/20 border border-cyber-frontier/40 shadow-[0_0_10px_rgba(255,0,122,0.3)] animate-pulse">
            <Cpu size={18} className="text-cyber-frontier" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-mono font-black tracking-widest text-white uppercase glitch-text flex items-center gap-1.5">
              AURA <span className="text-2xs font-light text-cyber-visited tracking-normal font-sans">v2.0</span>
            </h1>
            <p className="text-3xs font-mono text-gray-400 tracking-wider">
              Algorithmic Audio-Visual Resonance Engine
            </p>
          </div>
        </div>

        {/* System HUD Status */}
        <div className="flex items-center space-x-4 md:space-x-6 text-3xs font-mono text-gray-500">
          <div className="hidden sm:flex flex-col items-end">
            <span>CORE STATUS</span>
            <span className="text-cyber-target flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyber-target inline-block animate-ping" /> ONLINE_
            </span>
          </div>

          <div className="hidden sm:flex flex-col items-end border-l border-gray-800 pl-4">
            <span>TIME ENGINE</span>
            <span className="text-cyber-visited font-bold">[{systemClock}]</span>
          </div>

          <button
            onClick={reset}
            className="p-1.5 bg-black/40 border border-gray-800 hover:border-cyan-400 rounded text-gray-400 hover:text-white transition-all flex items-center gap-1"
          >
            <RefreshCw size={10} />
            <span className="hidden md:inline">SYSTEM_RESET</span>
          </button>
        </div>
      </header>

      {/* CORE DASHBOARD GRID */}
      <main className="flex-grow grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden">
        
        {/* Left Column: Control Cockpit (1 span) */}
        <section className="lg:col-span-1 flex flex-col justify-between overflow-y-auto">
          <ControlPanel orchestrator={orchestrator} />
        </section>

        {/* Center Columns: Interactive Viewport (2 spans) */}
        <section className="lg:col-span-2 flex flex-col cyber-glass overflow-hidden border border-cyber-frontier/20 min-h-[400px]">
          {/* Main Visualizer Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-black/60 border-b border-gray-900">
            <div className="flex items-center space-x-2">
              <Terminal size={12} className="text-cyan-400" />
              <span className="text-3xs font-mono text-gray-400 uppercase tracking-widest">
                Workspace Viewport
              </span>
            </div>
            <div className="text-3xs font-mono text-cyber-frontier uppercase tracking-wider font-semibold">
              {mode.toUpperCase()} MODE {activeAlgoName && `:: RUNNING_${activeAlgoName.toUpperCase()}`}
            </div>
          </div>

          {/* Render Active Viewport */}
          <div className="flex-grow overflow-hidden">
            {mode === 'graph' && (
              <GraphViewport
                nodes={graphData.nodes}
                edges={graphData.edges}
                onUpdate={(n, e) => setGraphData({ nodes: n, edges: e })}
                startId={graphStartNodeId}
                targetId={graphTargetNodeId}
                setStartId={setGraphStartNodeId}
                setTargetId={setGraphTargetNodeId}
                isPlaying={isPlaying}
              />
            )}

            {mode === 'tree' && (
              <TreeViewport
                tree={treeData}
                isPlaying={isPlaying}
                activeAlgoName={activeAlgoName}
                onInsertAVL={(val) => startAlgorithm('avl_insert', val)}
                onInsertRB={(val) => startAlgorithm('rb_insert', val)}
                onTraverse={(type) => startAlgorithm(type)}
              />
            )}

            {mode === 'grid' && (
              <GridViewport
                grid={gridData}
                onUpdate={setGridData}
                isPlaying={isPlaying}
              />
            )}
          </div>
        </section>

        {/* Right Column: Telemetry & Memory Inspector (1 span) */}
        <section className="lg:col-span-1 flex flex-col justify-between overflow-y-auto">
          <TelemetryDashboard
            telemetry={telemetry}
            mode={mode}
            activeAlgoName={activeAlgoName}
          />
        </section>

      </main>

      {/* FOOTER */}
      <footer className="mt-4 pt-2 border-t border-gray-900 flex justify-between items-center text-3xs font-mono text-gray-600">
        <div className="flex items-center gap-1">
          <Shield size={8} /> AURA DATA-VIS ENGINE // SECURE COMPILER ACTIVE
        </div>
        <div>
          DESIGN AESTHETIC // NEON KINETIC GLASSMORPHISM // C-DEEPMIND G-2026
        </div>
      </footer>
    </div>
  );
}

export default App;
