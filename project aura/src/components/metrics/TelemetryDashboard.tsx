import React from 'react';
import type { Telemetry, AppMode } from '../../types';

interface TelemetryDashboardProps {
  telemetry: Telemetry;
  mode: AppMode;
  activeAlgoName: string;
}

const graphPseudocode = [
  "// Initial State Setup",
  "Initialize Queue/Stack with startNode",
  "While frontier collection is not empty:",
  "  Pop node 'curr' & evaluate target",
  "  If 'curr' == target, return final path",
  "  Set 'curr' state = VISITED",
  "  Extract unvisited adjacent neighbors",
  "  Update costs & relax edges",
  "  Push neighbors and repaint frontier",
];

const treePseudocode = [
  "// BST Insert & Rotate rules",
  "Walk down tree from root to leaf",
  "Compare current key and yield frequency",
  "Create and attach leaf node",
  "Walk bottom-up to check balance rules",
  "If AVL factor imbalance > 1 or < -1:",
  "  Trigger Left/Right single rotation",
  "  Trigger Double Left-Right rotation",
  "If Red-Black rule violation occurs:",
  "  Flip uncle node and parent node colors",
  "  Perform single/double subroot rotations",
  "Repaint tree layout dimensions",
];

export const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({
  telemetry,
  mode,
  activeAlgoName,
}) => {
  const { comparisons, arrayWrites, stackDepth, timeMicroseconds, currentVariables, activeCodeLine } = telemetry;

  const codeLines = mode === 'tree' ? treePseudocode : graphPseudocode;

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* 1. Dynamic Performance Readout Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="cyber-glass p-3 border-cyan-400/25">
          <div className="text-3xs font-mono text-cyan-400 uppercase tracking-widest">Comparisons</div>
          <div className="text-xl font-mono font-bold mt-1 text-white">{comparisons}</div>
        </div>

        <div className="cyber-glass p-3 border-pink-500/25">
          <div className="text-3xs font-mono text-cyber-frontier uppercase tracking-widest">Array Writes</div>
          <div className="text-xl font-mono font-bold mt-1 text-white">{arrayWrites}</div>
        </div>

        <div className="cyber-glass p-3 border-green-500/25">
          <div className="text-3xs font-mono text-cyber-target uppercase tracking-widest">Stack Depth</div>
          <div className="text-xl font-mono font-bold mt-1 text-white">{stackDepth}</div>
        </div>

        <div className="cyber-glass p-3 border-purple-500/25">
          <div className="text-3xs font-mono text-purple-400 uppercase tracking-widest">Runtime</div>
          <div className="text-sm font-mono mt-2 text-white">
            {timeMicroseconds > 1000 
              ? `${(timeMicroseconds / 1000).toFixed(2)} ms` 
              : `${timeMicroseconds.toFixed(0)} μs`
            }
          </div>
        </div>
      </div>

      {/* 2. Pseudocode Trace Pane */}
      <div className="cyber-glass p-4 flex-grow flex flex-col min-h-[180px] max-h-[250px]">
        <div className="text-2xs font-mono text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-1.5 mb-2">
          Code Trace {activeAlgoName && `[${activeAlgoName.toUpperCase()}]`}
        </div>
        <div className="overflow-y-auto flex-grow font-mono text-2xs space-y-1 pr-1">
          {codeLines.map((line, idx) => {
            const isActive = idx === activeCodeLine;
            return (
              <div
                key={idx}
                className={`py-0.5 px-1.5 rounded transition-all ${
                  isActive
                    ? 'bg-cyber-frontier/20 text-white border-l-2 border-cyber-frontier font-semibold'
                    : 'text-gray-500'
                }`}
              >
                {line}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Memory & Variables Inspector */}
      <div className="cyber-glass p-4 flex-grow flex flex-col min-h-[160px] overflow-hidden">
        <div className="text-2xs font-mono text-gray-400 uppercase tracking-widest border-b border-gray-800 pb-1.5 mb-2">
          Memory Stack Inspector
        </div>
        <div className="flex-grow overflow-y-auto font-mono text-3xs text-cyan-300/80 pr-1 space-y-1">
          {Object.keys(currentVariables).length === 0 ? (
            <div className="text-gray-600 italic">No variables in active stack. Start execution to allocate memory.</div>
          ) : (
            Object.entries(currentVariables).map(([key, val]) => {
              let renderedVal = '';
              if (Array.isArray(val)) {
                renderedVal = `[ ${val.join(', ')} ]`;
              } else if (typeof val === 'object' && val !== null) {
                renderedVal = JSON.stringify(val);
              } else {
                renderedVal = String(val);
              }
              return (
                <div key={key} className="flex flex-col border-b border-gray-900 py-1">
                  <span className="text-gray-500 font-bold uppercase tracking-wide text-3xs">{key}</span>
                  <span className="text-white mt-0.5 break-all">{renderedVal}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
