import {
  Component, ElementRef, ViewChild, AfterViewInit, OnDestroy, OnInit, HostListener,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { GridService } from '../../services/grid.service';
import { GridRendererService } from '../../services/grid-renderer.service';
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
    <div class="relative overflow-auto border border-slate-700 rounded-lg">
      <canvas
        #gridCanvas
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp()"
        (mouseleave)="onMouseUp()"
        (contextmenu)="$event.preventDefault()"
        class="cursor-crosshair"
      ></canvas>
    </div>
  `,
})
export class GridComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gridCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  activeTool: EditorTool = EditorTool.WALL;
  weightValue = 3;
  private isDrawing = false;
  private isDraggingStart = false;
  private isDraggingGoal = false;
  private lastDrawnCell: string | null = null;
  private subs: Subscription[] = [];

  constructor(
    private gridService: GridService,
    private renderer: GridRendererService,
  ) {}

  ngOnInit(): void {
    // Create default grid if none exists
    if (!this.gridService.getGrid()) {
      this.gridService.createGrid(25, 50);
    }
  }

  ngAfterViewInit(): void {
    this.renderer.attach(this.canvasRef.nativeElement);

    this.subs.push(
      this.gridService.grid$.subscribe((grid) => {
        if (grid) {
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
