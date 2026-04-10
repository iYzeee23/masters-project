import { Injectable } from '@angular/core';
import {
  Grid, Position, CellType, AlgorithmEvent, EventType,
} from '@shared/types';
import { posKey } from '../algorithms/helpers';
import { ThemeService, ThemeColors, ALGO_COLORS, lightenColor, darkenColor, blendColors } from './theme.service';

export interface RenderState {
  openSet: Set<string>;
  closedSet: Set<string>;
  currentNode: string | null;
  path: Set<string>;
  startKey: string;
  goalKey: string;
}

@Injectable({ providedIn: 'root' })
export class GridRendererService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private cellW = 28;
  private cellH = 28;
  private grid: Grid | null = null;
  binaryWeightMode = false;
  private renderState: RenderState = {
    openSet: new Set(),
    closedSet: new Set(),
    currentNode: null,
    path: new Set(),
    startKey: '',
    goalKey: '',
  };

  constructor(private themeService: ThemeService) {
    this.themeService.colors$.subscribe(() => this.render());
  }

  private get colors(): ThemeColors {
    return this.themeService.getColors();
  }

  /**
   * Initialize the renderer with a canvas element.
   */
  attach(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  /**
   * Set the grid data and resize canvas accordingly.
   */
  setGrid(grid: Grid): void {
    this.grid = grid;
    this.renderState.startKey = posKey(grid.start);
    this.renderState.goalKey = posKey(grid.goal);
    this.resetVisualization();

    if (this.canvas && this.ctx) {
      const dpr = window.devicePixelRatio || 1;
      this.canvas.width = grid.cols * this.cellW * dpr;
      this.canvas.height = grid.rows * this.cellH * dpr;
      this.canvas.style.width = grid.cols * this.cellW + 'px';
      this.canvas.style.height = grid.rows * this.cellH + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    this.render();
  }

  setCellSize(size: number): void {
    this.cellW = size;
    this.cellH = size;
    if (this.grid) {
      this.setGrid(this.grid);
    }
  }

  setCellDimensions(w: number, h: number): void {
    this.cellW = w;
    this.cellH = h;
    if (this.grid) {
      this.setGrid(this.grid);
    }
  }

  /**
   * Reset visualization state (clear open/closed/path overlays).
   */
  resetVisualization(): void {
    this.renderState = {
      openSet: new Set(),
      closedSet: new Set(),
      currentNode: null,
      path: new Set(),
      startKey: this.renderState.startKey,
      goalKey: this.renderState.goalKey,
    };
    this.render();
  }

  /**
   * Apply a batch of algorithm events to the render state.
   */
  applyEvents(events: AlgorithmEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case EventType.SET_CURRENT:
          this.renderState.currentNode = posKey(event.node);
          break;

        case EventType.OPEN_ADD:
          this.renderState.openSet.add(posKey(event.node));
          break;

        case EventType.OPEN_UPDATE:
          // Node already in open set, nothing visual to change
          break;

        case EventType.CLOSE_ADD:
          this.renderState.closedSet.add(posKey(event.node));
          this.renderState.openSet.delete(posKey(event.node));
          break;

        case EventType.FOUND_PATH:
          this.renderState.path = new Set(event.path.map(posKey));
          this.renderState.currentNode = null;
          break;

        case EventType.NO_PATH:
          this.renderState.currentNode = null;
          break;
      }
    }

    this.render();
  }

  /**
   * Apply events WITHOUT rendering — for batch operations like jumpToStep.
   */
  applyEventsBatch(events: AlgorithmEvent[]): void {
    for (const event of events) {
      switch (event.type) {
        case EventType.SET_CURRENT:
          this.renderState.currentNode = posKey(event.node);
          break;
        case EventType.OPEN_ADD:
          this.renderState.openSet.add(posKey(event.node));
          break;
        case EventType.CLOSE_ADD:
          this.renderState.closedSet.add(posKey(event.node));
          this.renderState.openSet.delete(posKey(event.node));
          break;
        case EventType.FOUND_PATH:
          this.renderState.path = new Set(event.path.map(posKey));
          this.renderState.currentNode = null;
          break;
        case EventType.NO_PATH:
          this.renderState.currentNode = null;
          break;
      }
    }
  }

  /**
   * Convert canvas pixel coordinates to grid position.
   */
  pixelToGrid(x: number, y: number): Position | null {
    if (!this.grid) return null;
    const col = Math.floor(x / this.cellW);
    const row = Math.floor(y / this.cellH);
    if (row < 0 || row >= this.grid.rows || col < 0 || col >= this.grid.cols) return null;
    return { row, col };
  }

  /**
   * Main render loop — draws the entire grid.
   */
  render(): void {
    if (!this.ctx || !this.grid || !this.canvas) return;

    const ctx = this.ctx;
    const grid = this.grid;
    const cw = this.cellW;
    const ch = this.cellH;
    const c = this.colors;

    // Clear
    const logicalWidth = grid.cols * cw;
    const logicalHeight = grid.rows * ch;
    ctx.fillStyle = c.background;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Draw cells
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.cells[row][col];
        const key = posKey({ row, col });
        const x = col * cw;
        const y = row * ch;

        // Determine cell color (priority order)
        let color = c.empty;

        if (cell.type === CellType.WALL) {
          color = c.wall;
        }

        // Visualization overlays
        if (this.renderState.closedSet.has(key)) {
          color = c.closed;
        }
        if (this.renderState.openSet.has(key)) {
          color = c.open;
        }
        if (this.renderState.currentNode === key) {
          color = c.current;
        }
        if (this.renderState.path.has(key)) {
          color = c.path;
        }

        // Start and goal: use path color when path is found, otherwise their own color
        // Start and goal: only show as path color if actually in path set
        if (key === this.renderState.startKey) {
          color = this.renderState.path.has(key) ? c.path : c.start;
        }
        if (key === this.renderState.goalKey) {
          color = this.renderState.path.has(key) ? c.path : c.goal;
        }

        // Draw cell — rounded corners for soft aesthetic
        ctx.fillStyle = color;
        const gap = 1;
        const r = Math.min(4, Math.min(cw, ch) * 0.15);
        ctx.beginPath();
        ctx.roundRect(x + gap, y + gap, cw - gap * 2, ch - gap * 2, r);
        ctx.fill();

        // Draw weight vignette (always, even over visualization overlay)
        if (cell.weight > 1 && cell.type !== CellType.WALL) {
          const cx = x + cw / 2;
          const cy = y + ch / 2;
          const innerRadius = Math.min(cw, ch) * 0.12;
          const outerRadius = Math.max(cw, ch) * 0.65;
          const intensity = Math.min(0.7, 0.08 + (cell.weight - 1) * 0.07);
          const isDarkTheme = c.background === '#352B22';
          const tintR = isDarkTheme ? 120 : 180;
          const tintG = isDarkTheme ? 90 : 150;
          const tintB = isDarkTheme ? 60 : 110;
          const grad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
          grad.addColorStop(0, `rgba(${tintR},${tintG},${tintB},${intensity})`);
          grad.addColorStop(0.5, `rgba(${tintR},${tintG},${tintB},${intensity * 0.25})`);
          grad.addColorStop(1, `rgba(${tintR},${tintG},${tintB},0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x + gap, y + gap, cw - gap * 2, ch - gap * 2, r);
          ctx.fill();

          // Weight number on top — adaptive color based on background
          const fontSize = Math.max(10, Math.min(cw, ch) * 0.38);
          ctx.font = `bold ${fontSize}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          // Use white text on dark overlays, dark text on light backgrounds
          const isDarkBg = color === c.open || color === c.closed || color === c.current || color === c.wall;
          const isLightBg = color === c.empty || color === c.path;
          const textColor = isDarkBg ? '#FFFFFF' : isLightBg ? '#3D2E22' : c.text;
          const displayWeight = this.binaryWeightMode ? '1' : String(cell.weight);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.strokeText(displayWeight, cx, cy);
          ctx.fillStyle = textColor;
          ctx.fillText(displayWeight, cx, cy);
        }
      }
    }

    // Draw start/goal icons — only color as path if they're actually IN the path set
    const startInPath = this.renderState.path.has(posKey(grid.start));
    const goalInPath = this.renderState.path.has(posKey(grid.goal));
    this.drawIcon(grid.start, '▶', startInPath ? c.path : c.start);
    this.drawIcon(grid.goal, '★', goalInPath ? c.path : c.goal);
  }

  private drawIcon(pos: Position, icon: string, bgColor: string): void {
    if (!this.ctx) return;
    const cw = this.cellW;
    const ch = this.cellH;
    const x = pos.col * cw;
    const y = pos.row * ch;
    const gap = 1;
    const r = Math.min(4, Math.min(cw, ch) * 0.15);

    this.ctx.fillStyle = bgColor;
    this.ctx.beginPath();
    this.ctx.roundRect(x + gap, y + gap, cw - gap * 2, ch - gap * 2, r);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${Math.max(12, Math.min(cw, ch) * 0.45)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(icon, x + cw / 2, y + ch / 2);
  }

  getRenderState(): RenderState {
    return this.renderState;
  }

  // ============================================================
  // COMPARE RACE MODE
  // ============================================================

  /** Which algorithms "own" each cell. Key = posKey, Value = set of algo keys */
  private compareCellOwners = new Map<string, Set<string>>();
  /** Final paths per algorithm. Key = algo key, Value = set of posKeys */
  private comparePaths = new Map<string, Set<string>>();
  /** Which algorithms are currently visible */
  private compareVisibleAlgos = new Set<string>();
  private compareMode = false;

  enterCompareMode(algoKeys: string[]): void {
    this.compareMode = true;
    this.compareCellOwners.clear();
    this.comparePaths.clear();
    this.compareVisibleAlgos = new Set(algoKeys);
  }

  exitCompareMode(): void {
    this.compareMode = false;
    this.compareCellOwners.clear();
    this.comparePaths.clear();
    this.compareVisibleAlgos.clear();
    this.render();
  }

  /** Mark a cell as explored by an algorithm */
  compareAddCell(algoKey: string, pos: Position): void {
    const k = posKey(pos);
    let owners = this.compareCellOwners.get(k);
    if (!owners) {
      owners = new Set();
      this.compareCellOwners.set(k, owners);
    }
    owners.add(algoKey);
  }

  /** Set the final path for an algorithm */
  compareSetPath(algoKey: string, path: Position[]): void {
    this.comparePaths.set(algoKey, new Set(path.map(posKey)));
  }

  /** Toggle visibility of an algorithm */
  compareToggleAlgo(algoKey: string): void {
    if (this.compareVisibleAlgos.has(algoKey)) {
      this.compareVisibleAlgos.delete(algoKey);
    } else {
      this.compareVisibleAlgos.add(algoKey);
    }
  }

  isCompareAlgoVisible(algoKey: string): boolean {
    return this.compareVisibleAlgos.has(algoKey);
  }

  /** Render the compare race visualization */
  renderCompare(): void {
    if (!this.ctx || !this.grid || !this.canvas) return;

    const ctx = this.ctx;
    const grid = this.grid;
    const cw = this.cellW;
    const ch = this.cellH;
    const c = this.colors;
    const isDark = c.background === '#352B22';

    // Clear
    ctx.fillStyle = c.background;
    ctx.fillRect(0, 0, grid.cols * cw, grid.rows * ch);

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.cells[row][col];
        const key = posKey({ row, col });
        const x = col * cw;
        const y = row * ch;

        let color = c.empty;

        if (cell.type === CellType.WALL) {
          color = c.wall;
        } else {
          // Check if any visible algorithm owns this cell
          const owners = this.compareCellOwners.get(key);
          if (owners) {
            const visibleOwners = [...owners].filter(a => this.compareVisibleAlgos.has(a));
            if (visibleOwners.length > 0) {
              // Get territory colors (lightened base)
              const territoryColors = visibleOwners.map(a => {
                const base = ALGO_COLORS[a] || '#888888';
                return isDark ? lightenColor(base, 0.15) : lightenColor(base, 0.45);
              });
              color = blendColors(territoryColors);

              // Check if any visible algo has this cell in its path
              const pathOwners = visibleOwners.filter(a => this.comparePaths.get(a)?.has(key));
              if (pathOwners.length > 0) {
                const pathColors = pathOwners.map(a => {
                  const base = ALGO_COLORS[a] || '#888888';
                  return isDark ? base : darkenColor(base, 0.15);
                });
                color = blendColors(pathColors);
              }
            }
          }
        }

        // Draw cell
        ctx.fillStyle = color;
        const gap = 1;
        const r = Math.min(4, Math.min(cw, ch) * 0.15);
        ctx.beginPath();
        ctx.roundRect(x + gap, y + gap, cw - gap * 2, ch - gap * 2, r);
        ctx.fill();

        // Draw weight vignette
        if (cell.weight > 1 && cell.type !== CellType.WALL) {
          const cx = x + cw / 2;
          const cy = y + ch / 2;
          const innerR = Math.min(cw, ch) * 0.12;
          const outerR = Math.max(cw, ch) * 0.65;
          const intensity = Math.min(0.5, 0.06 + (cell.weight - 1) * 0.05);
          const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
          grad.addColorStop(0, `rgba(120,90,60,${intensity})`);
          grad.addColorStop(1, `rgba(120,90,60,0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.roundRect(x + gap, y + gap, cw - gap * 2, ch - gap * 2, r);
          ctx.fill();

          const fontSize = Math.max(10, Math.min(cw, ch) * 0.38);
          ctx.font = `bold ${fontSize}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const displayW = this.binaryWeightMode ? '1' : String(cell.weight);
          ctx.fillStyle = isDark ? '#FFFFFF' : '#3D2E22';
          ctx.fillText(displayW, cx, cy);
        }
      }
    }

    // Draw start/goal icons
    this.drawIcon(grid.start, '▶', c.start);
    this.drawIcon(grid.goal, '★', c.goal);
  }

  /** Public: trigger the right render based on mode */
  renderAuto(): void {
    if (this.compareMode) {
      this.renderCompare();
    } else {
      this.render();
    }
  }
}
