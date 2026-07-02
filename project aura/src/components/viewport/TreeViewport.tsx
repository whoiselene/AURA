import React, { useRef, useEffect, useState } from 'react';
import type { TreeData } from '../../types';
import { Plus, Play } from 'lucide-react';

interface TreeViewportProps {
  tree: TreeData;
  isPlaying: boolean;
  activeAlgoName: string;
  onInsertAVL: (val: number) => void;
  onInsertRB: (val: number) => void;
  onTraverse: (type: 'traverse_in' | 'traverse_pre' | 'traverse_post') => void;
}

export const TreeViewport: React.FC<TreeViewportProps> = ({
  tree,
  isPlaying,
  activeAlgoName,
  onInsertAVL,
  onInsertRB,
  onTraverse,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [insertInput, setInsertInput] = useState('');
  
  // Keep track of active visual coordinates for smooth interpolation sliding
  const visualCoordsRef = useRef<Record<string, { x: number; y: number }>>({});

  // Canvas loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw cyber matrix background lines
      ctx.strokeStyle = 'rgba(26, 24, 41, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      const { nodes } = tree;
      const keys = Object.keys(nodes);

      // 1. Interpolate visual coordinates towards targets
      keys.forEach(id => {
        const node = nodes[id];
        if (!visualCoordsRef.current[id]) {
          // Initialize at parent's coordinate or center
          visualCoordsRef.current[id] = { x: node.x, y: node.y };
        } else {
          const current = visualCoordsRef.current[id];
          // Easing equation (sliding interpolation)
          current.x += (node.x - current.x) * 0.15;
          current.y += (node.y - current.y) * 0.15;
        }
      });

      // Remove coordinates for nodes that no longer exist
      Object.keys(visualCoordsRef.current).forEach(id => {
        if (!nodes[id]) {
          delete visualCoordsRef.current[id];
        }
      });

      // 2. Draw Branch Edges (lines between parents and children)
      keys.forEach(id => {
        const node = nodes[id];
        const currentCoord = visualCoordsRef.current[id];
        if (!currentCoord) return;

        // Draw left child link
        if (node.leftId && nodes[node.leftId]) {
          const leftCoord = visualCoordsRef.current[node.leftId];
          if (leftCoord) {
            ctx.beginPath();
            ctx.moveTo(currentCoord.x, currentCoord.y);
            ctx.lineTo(leftCoord.x, leftCoord.y);
            
            // Branch color
            if (nodes[node.leftId].isVisited) {
              ctx.strokeStyle = '#00F0FF'; // Cyber Cyan
              ctx.lineWidth = 2.5;
            } else {
              ctx.strokeStyle = 'rgba(26, 24, 41, 0.7)';
              ctx.lineWidth = 1.5;
            }
            ctx.stroke();
          }
        }

        // Draw right child link
        if (node.rightId && nodes[node.rightId]) {
          const rightCoord = visualCoordsRef.current[node.rightId];
          if (rightCoord) {
            ctx.beginPath();
            ctx.moveTo(currentCoord.x, currentCoord.y);
            ctx.lineTo(rightCoord.x, rightCoord.y);
            
            if (nodes[node.rightId].isVisited) {
              ctx.strokeStyle = '#00F0FF';
              ctx.lineWidth = 2.5;
            } else {
              ctx.strokeStyle = 'rgba(26, 24, 41, 0.7)';
              ctx.lineWidth = 1.5;
            }
            ctx.stroke();
          }
        }
      });

      // 3. Draw Tree Nodes
      keys.forEach(id => {
        const node = nodes[id];
        const currentCoord = visualCoordsRef.current[id];
        if (!currentCoord) return;

        // Style presets
        let strokeColor = '#1A1829';
        let fillColor = '#0D0C1D';
        let glowColor = 'transparent';
        let strokeWidth = 2;

        const isAVL = activeAlgoName.startsWith('avl');
        const isRB = activeAlgoName.startsWith('rb') || (!activeAlgoName && node.color);

        if (isRB) {
          // Red-Black colors
          if (node.color === 'RED') {
            strokeColor = '#FF007A'; // Neon Pink for RED
            fillColor = 'rgba(255, 0, 122, 0.2)';
            glowColor = '#FF007A';
          } else {
            strokeColor = '#00F0FF'; // Neon Cyan for BLACK
            fillColor = '#08070F';
            glowColor = '#00F0FF';
          }
          strokeWidth = 2.5;
        } else {
          // Standard AVL/BST colors
          if (node.isVisited) {
            strokeColor = '#00F0FF'; // Traversed / Visited
            fillColor = 'rgba(0, 240, 255, 0.15)';
            glowColor = '#00F0FF';
            strokeWidth = 3;
          } else if (node.isFrontier) {
            strokeColor = '#FF007A';
            fillColor = 'rgba(255, 0, 122, 0.15)';
            glowColor = '#FF007A';
            strokeWidth = 2.5;
          } else {
            strokeColor = 'rgba(0, 240, 255, 0.3)';
            fillColor = 'rgba(15, 14, 28, 0.6)';
            strokeWidth = 2;
          }
        }

        // Draw node shadow glow
        if (glowColor !== 'transparent') {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 12;
        }

        ctx.beginPath();
        ctx.arc(currentCoord.x, currentCoord.y, 20, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.shadowBlur = 0; // reset shadow for border

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        // Draw Node Key
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 11px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(node.key), currentCoord.x, currentCoord.y);

        // Draw AVL Node Height if running AVL
        if (isAVL) {
          ctx.fillStyle = 'rgba(0, 240, 255, 0.7)';
          ctx.font = '9px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`h=${node.height}`, currentCoord.x + 23, currentCoord.y - 4);
        }
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [tree, activeAlgoName]);

  const handleSubmit = (e: React.FormEvent, type: 'avl' | 'rb') => {
    e.preventDefault();
    if (isPlaying || !insertInput) return;
    const val = parseInt(insertInput);
    if (isNaN(val)) return;

    if (type === 'avl') {
      onInsertAVL(val);
    } else {
      onInsertRB(val);
    }
    setInsertInput('');
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Editor Sub-toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-cyber-frontier/20 bg-black/40 px-4 py-2 gap-3">
        <div className="flex items-center space-x-4">
          <form onSubmit={(e) => handleSubmit(e, 'avl')} className="flex items-center space-x-1.5">
            <input
              type="number"
              value={insertInput}
              disabled={isPlaying}
              onChange={(e) => setInsertInput(e.target.value)}
              placeholder="Key"
              className="w-14 rounded border border-gray-700 bg-cyber-bg px-2 py-1 font-mono text-xs text-white focus:border-cyan-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isPlaying}
              className="cyber-btn-cyan flex items-center gap-1 !py-1 !px-2.5"
            >
              <Plus size={12} /> AVL Insert
            </button>
            <button
              type="button"
              disabled={isPlaying}
              onClick={(e) => handleSubmit(e, 'rb')}
              className="cyber-btn-pink flex items-center gap-1 !py-1 !px-2.5"
            >
              <Plus size={12} /> RB Insert
            </button>
          </form>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={() => onTraverse('traverse_in')}
            disabled={isPlaying || !tree.rootId}
            className="cyber-btn-green flex items-center gap-1.5 !py-1 !px-3"
          >
            <Play size={10} /> In-Order
          </button>
          <button
            onClick={() => onTraverse('traverse_pre')}
            disabled={isPlaying || !tree.rootId}
            className="cyber-btn-green flex items-center gap-1.5 !py-1 !px-3"
          >
            <Play size={10} /> Pre-Order
          </button>
          <button
            onClick={() => onTraverse('traverse_post')}
            disabled={isPlaying || !tree.rootId}
            className="cyber-btn-green flex items-center gap-1.5 !py-1 !px-3"
          >
            <Play size={10} /> Post-Order
          </button>
        </div>
      </div>

      {/* Canvas Viewport container */}
      <div className="relative flex-grow bg-black/60 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          className="block h-full w-full"
        />
      </div>
    </div>
  );
};
