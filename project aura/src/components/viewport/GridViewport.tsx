import React, { useRef, useEffect, useState } from 'react';
import type { GridCell } from '../../types';
import { Home, Target, Shield, Eraser } from 'lucide-react';

interface GridViewportProps {
  grid: GridCell[][];
  onUpdate: (grid: GridCell[][]) => void;
  isPlaying: boolean;
}

type DrawTool = 'wall' | 'eraser' | 'start' | 'target';

export const GridViewport: React.FC<GridViewportProps> = ({
  grid,
  onUpdate,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<DrawTool>('wall');
  const [isDrawing, setIsDrawing] = useState(false);

  const numRows = grid.length;
  const numCols = grid[0].length;

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cellWidth = canvas.width / numCols;
      const cellHeight = canvas.height / numRows;

      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < numCols; c++) {
          const cell = grid[r][c];

          const cx = c * cellWidth;
          const cy = r * cellHeight;

          // Default styles
          let fillColor = '#0D0C1D';
          let strokeColor = 'rgba(26, 24, 41, 0.4)';
          let strokeWidth = 0.5;

          if (cell.isWall) {
            fillColor = '#131124';
            strokeColor = '#FF007A'; // Neon Pink border highlight for walls
            strokeWidth = 1;
          } else if (cell.isPath) {
            fillColor = 'rgba(57, 255, 20, 0.2)'; // Neon Green
            strokeColor = '#39FF14';
            strokeWidth = 1.5;
          } else if (cell.isVisited) {
            fillColor = 'rgba(0, 240, 255, 0.15)'; // Neon Cyan
            strokeColor = '#00F0FF';
            strokeWidth = 1;
          } else if (cell.isFrontier) {
            fillColor = 'rgba(255, 0, 122, 0.15)'; // Frontier Neon Pink
            strokeColor = '#FF007A';
            strokeWidth = 1;
          }

          if (cell.isStart) {
            fillColor = 'rgba(0, 240, 255, 0.4)';
            strokeColor = '#00F0FF';
            strokeWidth = 2;
          } else if (cell.isTarget) {
            fillColor = 'rgba(57, 255, 20, 0.4)';
            strokeColor = '#39FF14';
            strokeWidth = 2;
          }

          // Draw Cell base background
          ctx.fillStyle = fillColor;
          ctx.fillRect(cx, cy, cellWidth, cellHeight);

          // Draw Cell boundary outline
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = strokeWidth;
          ctx.strokeRect(cx, cy, cellWidth, cellHeight);

          // Draw start / target symbol markers
          if (cell.isStart || cell.isTarget) {
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 9px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(
              cell.isStart ? 'START' : 'GOAL',
              cx + cellWidth / 2,
              cy + cellHeight / 2
            );
          }
        }
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [grid, numRows, numCols]);

  // Handle cell tool painting click/drag
  const handleCellInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cellWidth = rect.width / numCols;
    const cellHeight = rect.height / numRows;

    const c = Math.floor(x / cellWidth);
    const r = Math.floor(y / cellHeight);

    if (r >= 0 && r < numRows && c >= 0 && c < numCols) {
      const cell = grid[r][c];

      if (tool === 'start') {
        if (cell.isWall || cell.isTarget) return;
        const newGrid = grid.map(row =>
          row.map(cell => ({ ...cell, isStart: cell.row === r && cell.col === c }))
        );
        onUpdate(newGrid);
      } else if (tool === 'target') {
        if (cell.isWall || cell.isStart) return;
        const newGrid = grid.map(row =>
          row.map(cell => ({ ...cell, isTarget: cell.row === r && cell.col === c }))
        );
        onUpdate(newGrid);
      } else {
        // Wall painting or erasing
        if (cell.isStart || cell.isTarget) return;
        const shouldBeWall = tool === 'wall';
        if (cell.isWall === shouldBeWall) return; // no change

        const newGrid = grid.map(row =>
          row.map(item => {
            if (item.row === r && item.col === c) {
              return { ...item, isWall: shouldBeWall };
            }
            return item;
          })
        );
        onUpdate(newGrid);
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    handleCellInteraction(e);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && (tool === 'wall' || tool === 'eraser')) {
      handleCellInteraction(e);
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Editor Sub-toolbar */}
      <div className="flex items-center justify-between border-b border-cyber-frontier/20 bg-black/40 px-4 py-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setTool('wall')}
            disabled={isPlaying}
            className={`px-3 py-1 font-mono text-xs uppercase border rounded flex items-center gap-1.5 transition-all ${
              tool === 'wall'
                ? 'bg-pink-500/20 text-pink-400 border-pink-400/50 shadow-[0_0_8px_rgba(255,0,122,0.3)]'
                : 'bg-transparent border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Shield size={12} /> Draw Wall
          </button>
          <button
            onClick={() => setTool('eraser')}
            disabled={isPlaying}
            className={`px-3 py-1 font-mono text-xs uppercase border rounded flex items-center gap-1.5 transition-all ${
              tool === 'eraser'
                ? 'bg-gray-500/20 text-gray-300 border-gray-500/50'
                : 'bg-transparent border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Eraser size={12} /> Eraser
          </button>
          <button
            onClick={() => setTool('start')}
            disabled={isPlaying}
            className={`px-3 py-1 font-mono text-xs uppercase border rounded flex items-center gap-1.5 transition-all ${
              tool === 'start'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/50 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                : 'bg-transparent border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Home size={12} /> Place Start
          </button>
          <button
            onClick={() => setTool('target')}
            disabled={isPlaying}
            className={`px-3 py-1 font-mono text-xs uppercase border rounded flex items-center gap-1.5 transition-all ${
              tool === 'target'
                ? 'bg-green-500/20 text-green-400 border-green-400/50 shadow-[0_0_8px_rgba(57,255,20,0.3)]'
                : 'bg-transparent border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Target size={12} /> Place Goal
          </button>
        </div>

        <div className="text-2xs font-mono text-gray-400">
          <span className="text-cyber-frontier">Draw Wall:</span> Drag to paint barriers. Start & Goal can be placed on empty space.
        </div>
      </div>

      {/* Canvas Viewport container */}
      <div className="relative flex-grow bg-black/60 overflow-hidden">
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className="block h-full w-full cursor-crosshair"
        />
      </div>
    </div>
  );
};
