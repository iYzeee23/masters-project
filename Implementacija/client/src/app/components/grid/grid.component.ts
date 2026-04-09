import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  OnInit,
  HostListener,
  Input,
  Output,
  EventEmitter,
} from '@angular/core';

import { Subscription } from 'rxjs';
import { GridService, EditorTool } from '../../services/grid.service';
import { GridRendererService } from '../../services/grid-renderer.service';
import { ThemeService } from '../../services/theme.service';
import { CellType, Position } from '@shared/types';

export { EditorTool } from '../../services/grid.service';

@Component({
  selector: 'app-grid',
  standalone: true,
  imports: [],
  template: `
    <div
      class="rounded-2xl"
      [style.box-shadow]="
        isDark
          ? '0 12px 80px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4), 0 0 0 1px #554536'
          : '0 12px 80px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.12), 0 0 0 1px #D7CABC'
      "
      style="display: inline-block; overflow: hidden; transition: box-shadow 0.5s ease;"
    >
      <canvas
        #gridCanvas
        (mousedown)="onMouseDown($event)"
        (mousemove)="onMouseMove($event)"
        (mouseup)="onMouseUp()"
        (mouseleave)="onMouseUp()"
        (contextmenu)="$event.preventDefault()"
        [class.cursor-pointer]="mode === 'playground'"
        [class.cursor-crosshair]="mode === 'editor'"
        class="block"
      ></canvas>
    </div>
  `,
})
export class GridComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('gridCanvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() mode: 'editor' | 'playground' = 'editor';
  @Output() cellClicked = new EventEmitter<Position>();

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
    this.subs.push(this.themeService.theme$.subscribe((t) => (this.isDark = t === 'dark')));
    this.subs.push(this.gridService.activeTool$.subscribe((t) => (this.activeTool = t)));
    this.subs.push(this.gridService.weightValue$.subscribe((v) => (this.weightValue = v)));
  }

  ngAfterViewInit(): void {
    this.renderer.attach(this.canvasRef.nativeElement);

    this.subs.push(
      this.gridService.grid$.subscribe((grid) => {
        if (grid) {
          // Auto-size cells to guarantee grid + shadow fits in viewport
          const headerToolbar = 140; // header + toolbar height
          const shadowPadding = 100; // shadow + padding on all sides
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
    this.gridService.activeTool$.next(tool);
  }

  // ============================================================
  // MOUSE INTERACTION
  // ============================================================

  onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    const pos = this.getGridPos(event);
    if (!pos) return;

    // Playground mode: emit cell click for path building
    if (this.mode === 'playground') {
      this.cellClicked.emit(pos);
      return;
    }

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
    if (this.mode === 'playground') return;

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
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return this.renderer.pixelToGrid(x, y);
  }

  private applyTool(pos: Position): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;
    const cell = grid.cells[pos.row][pos.col];

    // Never overwrite start or goal with wall/weight/erase during drawing
    if (cell.type === CellType.START || cell.type === CellType.GOAL) {
      if (this.activeTool !== EditorTool.START && this.activeTool !== EditorTool.GOAL) {
        return;
      }
    }

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
