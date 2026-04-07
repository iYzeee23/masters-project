import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GridService } from '../../services/grid.service';
import { GridRendererService } from '../../services/grid-renderer.service';
import { ThemeService } from '../../services/theme.service';
import { CellType, Position } from '@shared/types';

export enum EditorTool {
  WALL = 'wall',
  WEIGHT = 'weight',
  START = 'start',
  GOAL = 'goal',
  ERASE = 'erase',
}

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl"
      [style.box-shadow]="isDark
        ? '0 12px 80px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4), 0 0 0 1px #554536'
        : '0 12px 80px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.12), 0 0 0 1px #D7CABC'"
      style="display: inline-block; overflow: hidden; transition: box-shadow 0.5s ease;">
      <canvas
        #gridCanvas
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp()"
        (mouseleave)="onMouseUp()"
        (contextmenu)="$event.preventDefault()"
        class="cursor-crosshair block"
      ></canvas>
    </div>
  `,
})
export class GridComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gridCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  activeTool: EditorTool = EditorTool.WALL;
  weightValue = 3;
  isDark = true;
  private isDrawing = false;
  private isDraggingStart = false;
  private isDraggingGoal = false;
  private lastDrawnCell: string | null = null;
  private subs: Subscription[] = [];

  constructor(
    private gridService: GridService,
    private renderer: GridRendererService,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    if (!this.gridService.getGrid()) {
      this.gridService.createGrid(25, 50);
    }
    this.subs.push(
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
    );
  }

  ngAfterViewInit(): void {
    this.renderer.attach(this.canvasRef.nativeElement);

    this.subs.push(
      this.gridService.grid$.subscribe((grid) => {
        if (grid) {
          // Auto-size cells to guarantee grid + shadow fits in viewport
          const headerToolbar = 140;  // header + toolbar height
          const shadowPadding = 100;  // shadow + padding on all sides
          const availableWidth = window.innerWidth - shadowPadding;
          const availableHeight = window.innerHeight - headerToolbar - shadowPadding;
          const cellW = Math.floor(availableWidth / grid.cols);
          const cellH = Math.floor(availableHeight / grid.rows);
          const cellSize = Math.max(10, Math.min(28, cellW, cellH));
          this.renderer.setCellSize(cellSize);
          this.renderer.setGrid(grid);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  setTool(tool: EditorTool): void {
    this.activeTool = tool;
  }

  // ============================================================
  // MOUSE INTERACTION
  // ============================================================

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    const pos = this.getGridPos(event);
    if (!pos) return;

    const grid = this.gridService.getGrid();
    if (!grid) return;

    const cell = grid.cells[pos.row][pos.col];

    // Check if dragging start or goal
    if (cell.type === CellType.START) {
      this.isDraggingStart = true;
      return;
    }
    if (cell.type === CellType.GOAL) {
      this.isDraggingGoal = true;
      return;
    }

    this.isDrawing = true;
    this.applyTool(pos);
  }

  onMouseMove(event: MouseEvent): void {
    const pos = this.getGridPos(event);
    if (!pos) return;

    const cellKey = `${pos.row},${pos.col}`;
    if (cellKey === this.lastDrawnCell) return;
    this.lastDrawnCell = cellKey;

    if (this.isDraggingStart) {
      this.gridService.setCell(pos, CellType.START);
      return;
    }
    if (this.isDraggingGoal) {
      this.gridService.setCell(pos, CellType.GOAL);
      return;
    }

    if (this.isDrawing) {
      this.applyTool(pos);
    }
  }

  onMouseUp(): void {
    this.isDrawing = false;
    this.isDraggingStart = false;
    this.isDraggingGoal = false;
    this.lastDrawnCell = null;
  }

  // ============================================================
  // PRIVATE
  // ============================================================

  private getGridPos(event: MouseEvent): Position | null {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return this.renderer.pixelToGrid(x, y);
  }

  private applyTool(pos: Position): void {
    switch (this.activeTool) {
      case EditorTool.WALL:
        this.gridService.setCell(pos, CellType.WALL);
        break;
      case EditorTool.WEIGHT:
        this.gridService.setWeight(pos, this.weightValue);
        break;
      case EditorTool.START:
        this.gridService.setCell(pos, CellType.START);
        break;
      case EditorTool.GOAL:
        this.gridService.setCell(pos, CellType.GOAL);
        break;
      case EditorTool.ERASE:
        this.gridService.setCell(pos, CellType.EMPTY);
        break;
    }
  }
}
