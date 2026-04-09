import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Grid, Cell, CellType, Position } from '@shared/types';
import { posKey } from '../algorithms/helpers';

export enum EditorTool {
  WALL = 'wall',
  WEIGHT = 'weight',
  START = 'start',
  GOAL = 'goal',
  ERASE = 'erase',
}

@Injectable({ providedIn: 'root' })
export class GridService {
  private grid: Grid | null = null;
  readonly grid$ = new BehaviorSubject<Grid | null>(null);

  readonly activeTool$ = new BehaviorSubject<EditorTool>(EditorTool.WALL);
  readonly weightValue$ = new BehaviorSubject<number>(3);

  /**
   * Create a new empty grid with given dimensions.
   */
  createGrid(rows: number, cols: number): Grid {
    const cells: Cell[][] = [];
    for (let r = 0; r < rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        row.push({
          position: { row: r, col: c },
          type: CellType.EMPTY,
          weight: 1,
        });
      }
      cells.push(row);
    }

    // Default start and goal
    const start: Position = { row: Math.floor(rows / 2), col: Math.floor(cols / 4) };
    const goal: Position = { row: Math.floor(rows / 2), col: Math.floor(3 * cols / 4) };

    cells[start.row][start.col].type = CellType.START;
    cells[goal.row][goal.col].type = CellType.GOAL;

    this.grid = { rows, cols, cells, start, goal };
    this.grid$.next(this.grid);
    return this.grid;
  }

  getGrid(): Grid | null {
    return this.grid;
  }

  /**
   * Replace the entire grid with an externally-created one.
   */
  setGrid(grid: Grid): void {
    this.grid = grid;
    this.grid$.next(grid);
  }

  /**
   * Set a cell type at a given position.
   */
  setCell(pos: Position, type: CellType, weight = 1): void {
    if (!this.grid) return;
    const { row, col } = pos;
    if (row < 0 || row >= this.grid.rows || col < 0 || col >= this.grid.cols) return;

    const cell = this.grid.cells[row][col];

    // Refuse to overwrite start/goal with wall/weight/erase — only allow relocating via START/GOAL type
    if ((cell.type === CellType.START || cell.type === CellType.GOAL) &&
        type !== CellType.START && type !== CellType.GOAL) {
      return;
    }

    if (type === CellType.START) {
      // Clear old start
      const oldStart = this.grid.start;
      this.grid.cells[oldStart.row][oldStart.col].type = CellType.EMPTY;
      this.grid.cells[oldStart.row][oldStart.col].weight = 1;
      this.grid.start = pos;
    }

    if (type === CellType.GOAL) {
      const oldGoal = this.grid.goal;
      this.grid.cells[oldGoal.row][oldGoal.col].type = CellType.EMPTY;
      this.grid.cells[oldGoal.row][oldGoal.col].weight = 1;
      this.grid.goal = pos;
    }

    this.grid.cells[row][col].type = type;
    this.grid.cells[row][col].weight = weight;
    this.grid$.next(this.grid);
  }

  /**
   * Toggle wall at position.
   */
  toggleWall(pos: Position): void {
    if (!this.grid) return;
    const cell = this.grid.cells[pos.row][pos.col];
    if (cell.type === CellType.START || cell.type === CellType.GOAL) return;

    if (cell.type === CellType.WALL) {
      cell.type = CellType.EMPTY;
      cell.weight = 1;
    } else {
      cell.type = CellType.WALL;
      cell.weight = 1;
    }
    this.grid$.next(this.grid);
  }

  /**
   * Set weight at position.
   */
  setWeight(pos: Position, weight: number): void {
    if (!this.grid) return;
    const cell = this.grid.cells[pos.row][pos.col];
    if (cell.type === CellType.WALL || cell.type === CellType.START || cell.type === CellType.GOAL) return;

    cell.type = weight > 1 ? CellType.WEIGHT : CellType.EMPTY;
    cell.weight = weight;
    this.grid$.next(this.grid);
  }

  /**
   * Clear all walls and weights, keep start/goal.
   */
  clearGrid(): void {
    if (!this.grid) return;
    for (let r = 0; r < this.grid.rows; r++) {
      for (let c = 0; c < this.grid.cols; c++) {
        const cell = this.grid.cells[r][c];
        if (cell.type !== CellType.START && cell.type !== CellType.GOAL) {
          cell.type = CellType.EMPTY;
          cell.weight = 1;
        }
      }
    }
    this.grid$.next(this.grid);
  }
}
