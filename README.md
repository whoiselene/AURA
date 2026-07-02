# AURA: Algorithmic Audio-Visual Resonance Engine
### *Real-Time Graph, Tree, and Pathfinding Synthesizer Orchestrator*

AURA is an interactive, dark-mode web application that transforms abstract data structures and algorithm executions into a real-time, audio-visual cinematic performance. It models graphs, binary search trees, and grids as dynamic network nodes that pulse, glow, and emit synthesized sound frequencies based on programmatic traversal metrics.

---

## 💡 The Inspiration & Vision

Abstract computer science logic is usually taught through static diagrams, chalkboard traces, or plain terminal text prints. 

Having spent this year studying data structures and algorithm analysis, I found myself constantly wondering: 

> *What does computational complexity actually look like? What does a binary search tree rotation sound like? Can we feel the rhythm of a pathfinder relaxing grid edges?*

AURA was born out of this desire to give computational logic a physical, sensory presence. It bridges the gap between pure mathematics and sensory perception. When a shortest-path optimization (Dijkstra/A*) or a binary tree rebalancing (AVL/Red-Black) execution begins, the engine acts as an orchestrator—mapping variables directly onto oscillators, frequency envelopes, and lighting shockwaves.

---

## 🎨 Design & Aesthetic Identity

The visual signature is ultra-modern, dark, and glowing (**Cyberpunk / Dark Glassmorphism / Neon Kinetic**):

*   **Background (Deep Space):** `#08070F` (a dark void overlaid with a CRT scanline noise texture and subtle grid ticks).
*   **Unvisited Nodes & Edges:** `#1A1829` (muted slate indigo with semi-transparency).
*   **Processing Frontier:** `#FF007A` (Neon Cyber-Pink - indicating active exploration boundaries).
*   **Validated Path / Visited:** `#00F0FF` (Neon Cyan - crisp electrical luminescence indicating searched structures).
*   **Target / Goal Node:** `#39FF14` (Neon Matrix Green - high-intensity target focal point).
*   **UI Cards:** Glassmorphic plates (`rgba(10, 9, 20, 0.45)` with `backdrop-filter: blur(16px)`) bounded by thin electrical highlights.

---

## 🔊 The Sonification Matrix (Audio Synthesis)

Every single calculation has an acoustic signature mapped via the native browser **Web Audio API**:

*   **Node Depth Pitch Scaling:**
    To represent tree depth or traversal steps, frequencies are dynamically calculated using:
    $$f(d) = \text{Base\_Freq} \times 2^{\frac{\text{Max\_Depth} - d}{\text{Interval\_Scale}}}$$
    This maps deep nodes/leaves to shorter, high-frequency tones, while root or source nodes resonate with deep fundamental frequencies.
*   **Node Visited Trigger:** Triggers a brief Triangle or Sine wave oscillator envelope sweep (ADSR with 120ms decay).
*   **Backtracking FM Sweep:** Backtracking triggers a frequency modulation pitch bend—ramping pitch down over 150ms to audibly indicate a dead-end or recursion pivot.
*   **Structural Completion Arpeggio:** Reconstructing the validated shortest path triggers a stereophonic, rising Major-7th arpeggio sequence indicating complete path discovery.

---

## ⚙️ Core Technical Architecture

The engine is engineered around a modular, unidirectional state loop:

```
+--------------------------------------------------------+
|                      React UI                          |
|  (Control Panels, Telemetry Metrics, Code Tracing)     |
+--------------------------+-----------------------------+
                           | User Input (Controls, Edits)
                           v
+--------------------------+-----------------------------+
|             useOrchestrator Hook & State               |
|  (Snapshot History, Playback Clock, Synth Settings)   |
+--------------------------+-----------------------------+
                           | Yield States & Audio Triggers
                           v
+--------------------------+-----------------------------+
|               TS Generator Functions                   |
|  (DFS, BFS, Dijkstra, A*, AVL / Red-Black Balancing)  |
+--------------------------+-----------------------------+
      |                                           |
      v Draw Updates                              v Pitch/Bend Triggers
+-----+--------------------+               +------+--------------------+
|  HTML5 Canvas Viewports  |               |    Web Audio Synth        |
|  (Ripples, Coordinates)  |               |  (Oscillators, Panners)   |
+--------------------------+               +---------------------------+
```

### 1. The Generator Stepping Engine (`src/engine/algorithms/`)
Unlike standard pathfinding code that runs in a blocking loop, AURA’s algorithms are written as **pure TypeScript generator functions (`function*`)**. Each iteration yields a snapshot state.
*   **Time-Travel Debugger:** The orchestrator hook preserves a list of structural snapshots.
    *   **Forward Step:** Advances the generator and logs the next state.
    *   **Backward Step:** Pops the last state from the history stack, letting users step backward and reverse memory states.

### 2. High-Performance Canvas viewports (`src/components/viewport/`)
*   **Network Graph Composer:** Allows double-clicking to place nodes, and drawing connecting links with custom weights. Traversing an edge triggers a visual shockwave ripple traveling along the vector coordinates from Node A to Node B.
*   **AVL & Red-Black Tree Animator:** Eases node positions using interpolation:
    $$x_{\text{visual}} = x_{\text{visual}} + (x_{\text{target}} - x_{\text{visual}}) \times 0.15$$
    When trees rotate (AVL) or split (Red-Black), elements slide smoothly across the screen instead of snapping.
*   **Pathfinding Grid Matrix:** Provides click-and-drag painting for wall obstacles, placing starts, and placing goals. Cells bloom and expand outwards as the frontier is examined.

### 3. Telemetry HUD (`src/components/metrics/`)
*   **Comparisons & Writes:** Dynamic performance counters track comparisons and array writes.
*   **Memory Stack Inspector:** Details variables currently inside the execution scope.
*   **Pseudocode Trace:** Highlights the active executing code line in synchronization with the playback clock.

---

## 🚀 Running AURA Locally

To run the project on your machine, perform the following commands in the workspace directory:

_You need to have npm installed on your machine_

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Start development server:**
    ```bash
    npm run dev
    ```
3.  **Open browser:**
    Go to `http://localhost:5173`.
4.  **Sonify:**
    Click the **"Initialize Synth Sonification Matrix"** banner in the control panel to activate the audio oscillators!
