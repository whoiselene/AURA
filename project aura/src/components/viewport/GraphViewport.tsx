import React, { useRef, useEffect, useState } from 'react';
import type { GraphNode, GraphEdge } from '../../types';
import { Plus, Zap, RefreshCw } from 'lucide-react';

interface GraphViewportProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onUpdate: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  startId: string;
  targetId: string;
  setStartId: (id: string) => void;
  setTargetId: (id: string) => void;
  isPlaying: boolean;
}

type EditMode = 'drag' | 'addNode' | 'addEdge';

export const GraphViewport: React.FC<GraphViewportProps> = ({
  nodes,
  edges,
  onUpdate,
  startId,
  targetId,
  setStartId,
  setTargetId,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('drag');
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [connectingStartId, setConnectingStartId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  // Canvas bounds helper
  const getMouseCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    // Account for CSS scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  // Canvas Renderer Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      // Clear Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Grid lines
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

      // 1. Draw Edges
      edges.forEach(edge => {
        const fromNode = nodes.find(n => n.id === edge.from);
        const toNode = nodes.find(n => n.id === edge.to);
        if (!fromNode || !toNode) return;

        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);

        // Edge Colors
        if (edge.isPath) {
          ctx.strokeStyle = '#39FF14'; // Neon Green
          ctx.lineWidth = 4;
        } else if (edge.isVisited) {
          ctx.strokeStyle = '#00F0FF'; // Neon Cyan
          ctx.lineWidth = 3;
        } else if (edge.isFrontier) {
          ctx.strokeStyle = '#FF007A'; // Cyber Pink
          ctx.lineWidth = 2.5;
        } else {
          ctx.strokeStyle = 'rgba(26, 24, 41, 0.7)'; // Muted Slate
          ctx.lineWidth = 1.5;
        }
        ctx.stroke();

        // Edge Ripple / Traversal shockwave animation
        if (edge.rippleStart) {
          const elapsed = Date.now() - edge.rippleStart;
          const duration = 650; // duration in ms
          if (elapsed < duration) {
            const ratio = elapsed / duration;
            const rx = fromNode.x + (toNode.x - fromNode.x) * ratio;
            const ry = fromNode.y + (toNode.y - fromNode.y) * ratio;

            ctx.beginPath();
            ctx.arc(rx, ry, 6, 0, Math.PI * 2);
            ctx.fillStyle = edge.isPath ? '#39FF14' : '#00F0FF';
            ctx.shadowColor = edge.isPath ? '#39FF14' : '#00F0FF';
            ctx.shadowBlur = 12;
            ctx.fill();
            ctx.shadowBlur = 0; // reset
          }
        }

        // Draw Edge Weight badge in the middle
        const midX = (fromNode.x + toNode.x) / 2;
        const midY = (fromNode.y + toNode.y) / 2;

        ctx.fillStyle = '#08070F';
        ctx.strokeStyle = edge.isPath ? '#39FF14' : edge.isVisited ? '#00F0FF' : '#1A1829';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(midX, midY, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(edge.weight), midX, midY);
      });

      // Draw connecting feedback line
      if (editMode === 'addEdge' && connectingStartId && mousePos) {
        const startNode = nodes.find(n => n.id === connectingStartId);
        if (startNode) {
          ctx.beginPath();
          ctx.moveTo(startNode.x, startNode.y);
          ctx.lineTo(mousePos.x, mousePos.y);
          ctx.strokeStyle = 'rgba(255, 0, 122, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.stroke();
          ctx.setLineDash([]); // reset
        }
      }

      // 2. Draw Nodes
      nodes.forEach(node => {
        const isStart = node.id === startId;
        const isTarget = node.id === targetId;

        // Visual styles depending on status
        let strokeColor = '#1A1829';
        let fillColor = '#0D0C1D';
        let glowColor = 'transparent';
        let strokeWidth = 2;

        if (node.isPath) {
          strokeColor = '#39FF14'; // Neon Green
          fillColor = 'rgba(57, 255, 20, 0.15)';
          glowColor = '#39FF14';
          strokeWidth = 3;
        } else if (node.isVisited) {
          strokeColor = '#00F0FF'; // Neon Cyan
          fillColor = 'rgba(0, 240, 255, 0.15)';
          glowColor = '#00F0FF';
          strokeWidth = 3;
        } else if (node.isFrontier) {
          strokeColor = '#FF007A'; // Cyber Pink
          fillColor = 'rgba(255, 0, 122, 0.15)';
          glowColor = '#FF007A';
          strokeWidth = 2.5;
        }

        if (isStart) {
          strokeColor = '#00F0FF';
          fillColor = 'rgba(0, 240, 255, 0.3)';
          glowColor = '#00F0FF';
          strokeWidth = 3.5;
        } else if (isTarget) {
          strokeColor = '#FF007A';
          fillColor = 'rgba(255, 0, 122, 0.3)';
          glowColor = '#FF007A';
          strokeWidth = 3.5;
        }

        // Draw radial outer glows for active nodes
        if (glowColor !== 'transparent') {
          ctx.shadowColor = glowColor;
          ctx.shadowBlur = 15;
        }

        ctx.beginPath();
        ctx.arc(node.x, node.y, 22, 0, Math.PI * 2);
        ctx.fillStyle = fillColor;
        ctx.fill();

        ctx.shadowBlur = 0; // reset glow for border

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = strokeWidth;
        ctx.stroke();

        // Draw label text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(node.label, node.x, node.y + 4);

        // Draw Role Badge (S or T)
        if (isStart || isTarget) {
          ctx.beginPath();
          ctx.arc(node.x + 15, node.y - 15, 8, 0, Math.PI * 2);
          ctx.fillStyle = isStart ? '#00F0FF' : '#FF007A';
          ctx.fill();

          ctx.fillStyle = isStart ? '#000000' : '#FFFFFF';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(isStart ? 'S' : 'T', node.x + 15, node.y - 15);
        }
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [nodes, edges, startId, targetId, editMode, connectingStartId, mousePos]);

  // Handle Mousedown Event
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying) return;
    const { x, y } = getMouseCoords(e);

    // Find clicked node
    const clickedNode = nodes.find(n => Math.hypot(n.x - x, n.y - y) <= 22);

    if (editMode === 'drag') {
      if (clickedNode) {
        setDraggedNodeId(clickedNode.id);
      }
    } else if (editMode === 'addNode') {
      if (!clickedNode) {
        const nodeChar = String.fromCharCode(65 + nodes.length);
        const uniqueId = `node_${Date.now()}`;
        const newNode: GraphNode = {
          id: uniqueId,
          label: `NODE_${nodeChar}`,
          x,
          y,
          depth: 0,
        };
        onUpdate([...nodes, newNode], edges);
      }
    } else if (editMode === 'addEdge') {
      if (clickedNode) {
        setConnectingStartId(clickedNode.id);
        setMousePos({ x, y });
      }
    }
  };

  // Handle Mousemove Event
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getMouseCoords(e);

    if (draggedNodeId) {
      const updatedNodes = nodes.map(n => {
        if (n.id === draggedNodeId) {
          // Clamp to canvas boundaries
          const clampedX = Math.max(30, Math.min(x, 770));
          const clampedY = Math.max(30, Math.min(y, 470));
          return { ...n, x: clampedX, y: clampedY };
        }
        return n;
      });
      onUpdate(updatedNodes, edges);
    } else if (connectingStartId) {
      setMousePos({ x, y });
    }
  };

  // Handle Mouseup Event
  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeId) {
      setDraggedNodeId(null);
    }

    if (connectingStartId) {
      const { x, y } = getMouseCoords(e);
      const endNode = nodes.find(n => Math.hypot(n.x - x, n.y - y) <= 22);

      if (endNode && endNode.id !== connectingStartId) {
        // Check if edge already exists
        const exists = edges.some(
          edge => (edge.from === connectingStartId && edge.to === endNode.id) ||
                  (edge.from === endNode.id && edge.to === connectingStartId)
        );

        if (!exists) {
          const wInput = prompt('Enter connection cost/weight (1 - 25):', '5');
          const weight = Math.min(25, Math.max(1, parseInt(wInput || '5') || 5));
          const newEdge: GraphEdge = {
            id: `edge_${Date.now()}`,
            from: connectingStartId,
            to: endNode.id,
            weight,
          };
          onUpdate(nodes, [...edges, newEdge]);
        }
      }
      setConnectingStartId(null);
      setMousePos(null);
    }
  };

  // Double click to toggle Start/Target or remove nodes
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isPlaying) return;
    const { x, y } = getMouseCoords(e);

    const node = nodes.find(n => Math.hypot(n.x - x, n.y - y) <= 22);
    if (node) {
      if (e.shiftKey) {
        // Delete Node and its connected edges
        const filteredNodes = nodes.filter(n => n.id !== node.id);
        const filteredEdges = edges.filter(edge => edge.from !== node.id && edge.to !== node.id);
        
        // Reset start/target pointers if deleted
        if (node.id === startId && filteredNodes.length > 0) {
          setStartId(filteredNodes[0].id);
        }
        if (node.id === targetId && filteredNodes.length > 0) {
          setTargetId(filteredNodes[filteredNodes.length - 1].id);
        }

        onUpdate(filteredNodes, filteredEdges);
      } else {
        // Open simple select option or toggle start/target roles
        if (startId === node.id) {
          // make target
          setTargetId(node.id);
        } else {
          setStartId(node.id);
        }
      }
      return;
    }

    // Double click edge middle to delete it
    const clickedEdge = edges.find(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return false;
      const midX = (fromNode.x + toNode.x) / 2;
      const midY = (fromNode.y + toNode.y) / 2;
      return Math.hypot(midX - x, midY - y) <= 15;
    });

    if (clickedEdge) {
      const updatedEdges = edges.filter(e => e.id !== clickedEdge.id);
      onUpdate(nodes, updatedEdges);
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Editor Sub-toolbar */}
      <div className="flex items-center justify-between border-b border-cyber-frontier/20 bg-black/40 px-4 py-2">
        <div className="flex space-x-2">
          <button
            onClick={() => setEditMode('drag')}
            disabled={isPlaying}
            className={`px-3 py-1 font-mono text-xs uppercase border rounded flex items-center gap-1.5 transition-all ${
              editMode === 'drag'
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-400/50 shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                : 'bg-transparent border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <RefreshCw size={12} /> Drag Node
          </button>
          <button
            onClick={() => setEditMode('addNode')}
            disabled={isPlaying}
            className={`px-3 py-1 font-mono text-xs uppercase border rounded flex items-center gap-1.5 transition-all ${
              editMode === 'addNode'
                ? 'bg-pink-500/20 text-pink-400 border-pink-400/50 shadow-[0_0_8px_rgba(255,0,122,0.3)]'
                : 'bg-transparent border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Plus size={12} /> Add Node
          </button>
          <button
            onClick={() => setEditMode('addEdge')}
            disabled={isPlaying}
            className={`px-3 py-1 font-mono text-xs uppercase border rounded flex items-center gap-1.5 transition-all ${
              editMode === 'addEdge'
                ? 'bg-green-500/20 text-green-400 border-green-400/50 shadow-[0_0_8px_rgba(57,255,20,0.3)]'
                : 'bg-transparent border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Zap size={12} /> Connect Edge
          </button>
        </div>

        <div className="flex items-center space-x-3 text-2xs font-mono text-gray-400">
          <div>
            <span className="text-cyber-visited">Double-Click Node:</span> Set Start
          </div>
          <div>
            <span className="text-cyber-frontier">Shift+Dbl-Click Node:</span> Delete Node
          </div>
          <div>
            <span className="text-gray-400">Dbl-Click Weight:</span> Delete Edge
          </div>
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
          onDoubleClick={handleDoubleClick}
          className="block h-full w-full cursor-crosshair"
        />
      </div>
    </div>
  );
};
