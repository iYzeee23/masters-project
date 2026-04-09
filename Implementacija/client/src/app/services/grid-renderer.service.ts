import { Injectable } from '@angular/core';
import {
  Grid, Position, CellType, AlgorithmEvent, EventType,
} from '@shared/types';
import { posKey } from '../algorithms/helpers';
import { ThemeService, ThemeColors } from './theme.service';

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
  private cellSize = 28;
  private grid: Grid | null = null;
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
      this.canvas.width = grid.cols * this.cellSize * dpr;
      this.canvas.height = grid.rows * this.cellSize * dpr;
      this.canvas.style.width = grid.cols * this.cellSize + 'px';
      this.canvas.style.height = grid.rows * this.cellSize + 'px';
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    this.render();
  }

  setCellSize(size: number): void {
    this.cellSize = size;
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
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
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
    const size = this.cellSize;
    const c = this.colors;

    // Clear (use logical dimensions, not canvas pixel dimensions)
    const logicalWidth = grid.cols * size;
    const logicalHeight = grid.rows * size;
    ctx.fillStyle = c.background;
    ctx.fillRect(0, 0, logicalWidth, logicalHeight);

    // Draw cells
    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const cell = grid.cells[row][col];
        const key = posKey({ row, col });
        const x = col * size;
        const y = row * size;

        // Determine cell color (priority order)
        let color = c.empty;

        if (cell.type === CellType.WALL) {
          color = c.wall;
        } else if (cell.weight > 1) {
          color = cell.weight <= 3 ? c.weightLow :
                  cell.weight <= 6 ? c.weightMed : c.weightHigh;
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

        // Start and goal always on top
        if (key === this.renderState.startKey) {
          color = c.start;
        }
        if (key === this.renderState.goalKey) {
          color = c.goal;
        }

        // Draw cell — rounded corners for soft aesthetic
        ctx.fillStyle = color;
        const gap = 1;
        const r = Math.min(4, size * 0.15); // corner radius
        ctx.beginPath();
        ctx.roundRect(x + gap, y + gap, size - gap * 2, size - gap * 2, r);
        ctx.fill();

        // Draw weight number if weighted
        if (cell.weight > 1 && cell.type !== CellType.WALL) {
          ctx.fillStyle = c.text;
          ctx.font = `${Math.max(10, size * 0.35)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(cell.weight), x + size / 2, y + size / 2);
        }
      }
    }

    // Draw start/goal icons
    this.drawIcon(grid.start, '▶', c.start);
    this.drawIcon(grid.goal, '★', c.goal);
  }

  private drawIcon(pos: Position, icon: string, bgColor: string): void {
    if (!this.ctx) return;
    const size = this.cellSize;
    const x = pos.col * size;
    const y = pos.row * size;
    const gap = 1;
    const r = Math.min(4, size * 0.15);

    this.ctx.fillStyle = bgColor;
    this.ctx.beginPath();
    this.ctx.roundRect(x + gap, y + gap, size - gap * 2, size - gap * 2, r);
    this.ctx.fill();
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = `bold ${Math.max(12, size * 0.45)}px sans-serif`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(icon, x + size / 2, y + size / 2);
  }

  getRenderState(): RenderState {
    return this.renderState;
  }
}
