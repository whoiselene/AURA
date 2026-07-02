import React from 'react';
import type { Orchestrator } from '../../engine/hooks/useOrchestrator';
import { 
  Play, Pause, SkipForward, SkipBack, RotateCcw, 
  Volume2, VolumeX, Music, Waves, Radio, Activity
} from 'lucide-react';
import type { AppMode } from '../../types';

interface ControlPanelProps {
  orchestrator: Orchestrator;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ orchestrator }) => {
  const {
    mode,
    changeMode,
    activeAlgoName,
    audioSettings,
    initAudio,
    toggleMute,
    updateVolume,
    updateWaveType,
    updateBaseFreq,
    updateIntervalScale,
    isPlaying,
    setIsPlaying,
    speed,
    setSpeed,
    currentStep,
    totalSteps,
    startAlgorithm,
    stepForward,
    stepBackward,
    reset,
  } = orchestrator;

  const isAudioReady = audioSettings.volume > 0 && !audioSettings.isMuted;

  return (
    <div className="flex flex-col space-y-5 h-full">
      {/* 1. INITIALIZE SYNTH CORE BADGE */}
      {!isAudioReady && (
        <button
          onClick={initAudio}
          className="w-full py-2 px-3 border border-pink-500/50 bg-pink-950/20 rounded font-mono text-2xs text-cyber-frontier uppercase tracking-widest animate-pulse hover:bg-cyber-frontier hover:text-white transition-all shadow-[0_0_15px_rgba(255,0,122,0.4)]"
        >
          ⚡ Initialize Synth Sonification Matrix
        </button>
      )}

      {/* 2. LAYOUT MODE SELECTION */}
      <div className="cyber-glass p-3 flex flex-col space-y-2">
        <div className="text-3xs font-mono text-gray-500 uppercase tracking-wider">Topological Grid Layout</div>
        <div className="grid grid-cols-3 gap-1.5">
          {(['graph', 'tree', 'grid'] as AppMode[]).map((m) => (
            <button
              key={m}
              onClick={() => changeMode(m)}
              className={`py-1.5 rounded font-mono text-2xs uppercase tracking-wider transition-all ${
                mode === m
                  ? 'bg-cyan-500/20 text-cyber-visited border border-cyber-visited/40 shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                  : 'bg-transparent text-gray-400 border border-transparent hover:border-gray-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* 3. ALGORITHM SELECTION PANEL */}
      <div className="cyber-glass p-4 flex flex-col space-y-3">
        <div className="text-3xs font-mono text-gray-500 uppercase tracking-wider">Select Algorithm</div>
        
        {mode === 'graph' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => startAlgorithm('dfs')}
              className={`cyber-btn-pink !py-1.5 !px-1.5 ${activeAlgoName === 'dfs' ? 'bg-pink-600 text-white shadow-glow-frontier' : ''}`}
            >
              DFS Search
            </button>
            <button
              onClick={() => startAlgorithm('bfs')}
              className={`cyber-btn-pink !py-1.5 !px-1.5 ${activeAlgoName === 'bfs' ? 'bg-pink-600 text-white shadow-glow-frontier' : ''}`}
            >
              BFS Search
            </button>
            <button
              onClick={() => startAlgorithm('dijkstra')}
              className={`cyber-btn-pink !py-1.5 !px-1.5 ${activeAlgoName === 'dijkstra' ? 'bg-pink-600 text-white shadow-glow-frontier' : ''}`}
            >
              Dijkstra
            </button>
            <button
              onClick={() => startAlgorithm('astar')}
              className={`cyber-btn-pink !py-1.5 !px-1.5 ${activeAlgoName === 'astar' ? 'bg-pink-600 text-white shadow-glow-frontier' : ''}`}
            >
              A* Pathfind
            </button>
          </div>
        )}

        {mode === 'tree' && (
          <div className="text-2xs font-mono text-cyan-400 text-center py-2 border border-cyan-500/10 bg-cyan-950/5 rounded">
            Use insert bar in center workspace to compute AVL / Red-Black Tree splits.
          </div>
        )}

        {mode === 'grid' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => startAlgorithm('dijkstra')}
              className={`cyber-btn-green !py-1.5 !px-1.5 ${activeAlgoName === 'dijkstra' ? 'bg-green-600 text-black shadow-glow-target' : ''}`}
            >
              Dijkstra
            </button>
            <button
              onClick={() => startAlgorithm('astar')}
              className={`cyber-btn-green !py-1.5 !px-1.5 ${activeAlgoName === 'astar' ? 'bg-green-600 text-black shadow-glow-target' : ''}`}
            >
              A* Pathfind
            </button>
          </div>
        )}
      </div>

      {/* 4. TIME-TRAVEL PLAYBACK CONTROLS */}
      <div className="cyber-glass p-4 flex flex-col space-y-4">
        <div className="text-3xs font-mono text-gray-500 uppercase tracking-wider">Time-Travel debugger</div>
        
        {/* Playback Buttons */}
        <div className="flex items-center justify-between px-2">
          <button
            onClick={stepBackward}
            disabled={currentStep <= 0}
            className="p-2 rounded bg-gray-900 border border-gray-800 text-cyan-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            title="Step Back"
          >
            <SkipBack size={14} />
          </button>

          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-3 rounded-full border transition-all ${
              isPlaying
                ? 'bg-pink-500/20 text-cyber-frontier border-cyber-frontier/40 shadow-[0_0_12px_rgba(255,0,122,0.4)] hover:bg-cyber-frontier hover:text-white'
                : 'bg-cyan-500/20 text-cyber-visited border-cyber-visited/40 shadow-[0_0_12px_rgba(0,240,255,0.4)] hover:bg-cyber-visited hover:text-black'
            }`}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          <button
            onClick={stepForward}
            className="p-2 rounded bg-gray-900 border border-gray-800 text-cyan-400 hover:text-white disabled:opacity-30 transition-all"
            title="Step Forward"
          >
            <SkipForward size={14} />
          </button>

          <button
            onClick={reset}
            className="p-2 rounded bg-gray-900 border border-gray-800 text-gray-400 hover:text-white transition-all"
            title="Reset Grid"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        {/* Speed Slider */}
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between font-mono text-3xs text-gray-400">
            <span>STEP DELAY</span>
            <span className="text-cyan-400">{speed} ms</span>
          </div>
          <input
            type="range"
            min={30}
            max={1200}
            step={10}
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Step progress counter */}
        {totalSteps > 0 && (
          <div className="flex justify-between items-center text-3xs font-mono text-gray-400 pt-2 border-t border-gray-900">
            <span>HISTORY STEPS</span>
            <span>{currentStep} / {totalSteps - 1}</span>
          </div>
        )}
      </div>

      {/* 5. SONIFICATION AUDIO SYNTH PARAMETERS */}
      <div className="cyber-glass p-4 flex flex-col space-y-4">
        <div className="flex items-center justify-between border-b border-gray-900 pb-1.5">
          <div className="text-3xs font-mono text-gray-500 uppercase tracking-wider">Sonification Matrix</div>
          <button
            onClick={toggleMute}
            className="p-1 rounded bg-black/40 text-gray-400 hover:text-white transition-all"
          >
            {audioSettings.isMuted ? <VolumeX size={13} className="text-cyber-frontier" /> : <Volume2 size={13} className="text-cyber-visited" />}
          </button>
        </div>

        {/* Synth Vol */}
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between font-mono text-3xs text-gray-400">
            <span className="flex items-center gap-1"><Music size={8} /> MASTER GAIN</span>
            <span className="text-cyan-400">{Math.round(audioSettings.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audioSettings.volume}
            onChange={(e) => updateVolume(Number(e.target.value))}
            className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Oscillator Waveform Type */}
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between font-mono text-3xs text-gray-400 mb-1">
            <span className="flex items-center gap-1"><Waves size={8} /> WAVE OSCILLATOR</span>
            <span className="text-pink-400 uppercase">{audioSettings.waveType}</span>
          </div>
          <div className="grid grid-cols-4 gap-1">
            {['sine', 'triangle', 'sawtooth', 'square'].map((wave) => (
              <button
                key={wave}
                onClick={() => updateWaveType(wave)}
                className={`py-0.5 rounded font-mono text-3xs uppercase transition-all border ${
                  audioSettings.waveType === wave
                    ? 'bg-pink-500/20 text-cyber-frontier border-cyber-frontier/40'
                    : 'bg-transparent text-gray-500 border-transparent hover:border-gray-800'
                }`}
              >
                {wave.substring(0, 4)}
              </button>
            ))}
          </div>
        </div>

        {/* Base Frequency */}
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between font-mono text-3xs text-gray-400">
            <span className="flex items-center gap-1"><Radio size={8} /> ROOT FUNDAMENTAL</span>
            <span className="text-cyan-400">{audioSettings.baseFreq} Hz</span>
          </div>
          <input
            type="range"
            min={110}
            max={660}
            step={10}
            value={audioSettings.baseFreq}
            onChange={(e) => updateBaseFreq(Number(e.target.value))}
            className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>

        {/* Pitch Interval Scale */}
        <div className="flex flex-col space-y-1">
          <div className="flex justify-between font-mono text-3xs text-gray-400">
            <span className="flex items-center gap-1"><Activity size={8} /> PITCH SCALE DIVIDER</span>
            <span className="text-cyan-400">{audioSettings.intervalScale} semitones</span>
          </div>
          <input
            type="range"
            min={4}
            max={24}
            step={1}
            value={audioSettings.intervalScale}
            onChange={(e) => updateIntervalScale(Number(e.target.value))}
            className="w-full h-1 bg-gray-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
          />
        </div>
      </div>
    </div>
  );
};
