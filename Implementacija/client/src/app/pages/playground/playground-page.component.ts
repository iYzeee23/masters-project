import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GridService } from '../../services/grid.service';
import { GridRendererService } from '../../services/grid-renderer.service';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { GridComponent } from '../../components/grid/grid.component';
import { runAlgorithm } from '../../algorithms';
import { posKey, posEqual } from '../../algorithms/helpers';
import { getNeighbors } from '../../algorithms/grid-utils';
import {
  AlgorithmType, HeuristicType, NeighborMode,
  AlgorithmOptions, Position, Grid, CellType,
} from '@shared/types';

interface PlaygroundResult {
  userCost: number;
  optimalCost: number | null;
  score: number;
  breakdown: {
    costPenalty: number;
    invalidMovePenalty: number;
    speedBonus: number;
  };
  optimalPath: Position[] | null;
}

@Component({
  selector: 'app-playground-page',
  standalone: true,
  imports: [CommonModule, FormsModule, GridComponent],
  template: `
    <div class="flex gap-4 p-4 max-w-screen-2xl mx-auto">
      <!-- Sidebar -->
      <aside class="w-80 flex-shrink-0">
        <div [class]="isDark
          ? 'flex flex-col gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700'
          : 'flex flex-col gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm'">

          <h2 [class]="isDark ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-900'">
            {{ i18n.t('nav.playground') }}
          </h2>

          <!-- Instructions -->
          <div [class]="isDark ? 'text-sm text-slate-400' : 'text-sm text-slate-500'">
            <p class="mb-2">Pokušaj da pronađeš najkraći put! Klikni na ćelije od starta do cilja.</p>
            <p>Ili označi da put ne postoji.</p>
          </div>

          <!-- Status -->
          <div [class]="isDark ? 'bg-slate-900 rounded p-3 border border-slate-700' : 'bg-slate-50 rounded p-3 border border-slate-200'">
            <div class="flex justify-between text-sm mb-1">
              <span [class]="isDark ? 'text-slate-400' : 'text-slate-500'">Tvoj put:</span>
              <span [class]="isDark ? 'text-slate-200' : 'text-slate-800'">{{ userPath.length }} ćelija</span>
            </div>
            <div class="flex justify-between text-sm">
              <span [class]="isDark ? 'text-slate-400' : 'text-slate-500'">Cena:</span>
              <span [class]="isDark ? 'text-slate-200' : 'text-slate-800'">{{ getUserPathCost() | number:'1.1-1' }}</span>
            </div>
          </div>

          <!-- Actions -->
          <button (click)="declareNoPath()"
            [disabled]="isSubmitted"
            [class]="isDark
              ? 'w-full bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors'
              : 'w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors'">
            ✗ Put ne postoji
          </button>

          <button (click)="submitPath()"
            [disabled]="userPath.length < 2 || isSubmitted"
            class="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
            ✓ Predaj rešenje
          </button>

          <button (click)="undoLast()"
            [disabled]="userPath.length === 0 || isSubmitted"
            [class]="isDark
              ? 'w-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 px-3 py-1.5 rounded text-sm transition-colors'
              : 'w-full bg-slate-200 hover:bg-slate-300 disabled:opacity-50 text-slate-700 px-3 py-1.5 rounded text-sm transition-colors'">
            ↩ Poništi poslednji
          </button>

          <button (click)="resetPlayground()"
            [class]="isDark
              ? 'w-full bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded text-sm transition-colors'
              : 'w-full bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded text-sm transition-colors'">
            🔄 Resetuj
          </button>

          <!-- Results -->
          <div *ngIf="result" [class]="isDark ? 'bg-slate-900 rounded p-4 border border-slate-700' : 'bg-slate-50 rounded p-4 border border-slate-200'">
            <h3 class="text-lg font-bold mb-3" [class]="result.score >= 80 ? 'text-green-400' : result.score >= 50 ? 'text-yellow-400' : 'text-red-400'">
              Skor: {{ result.score }} / 100
            </h3>

            <div class="grid grid-cols-2 gap-y-2 text-sm">
              <span [class]="isDark ? 'text-slate-400' : 'text-slate-500'">Tvoja cena:</span>
              <span [class]="isDark ? 'text-slate-200 text-right' : 'text-slate-800 text-right'">{{ result.userCost | number:'1.1-1' }}</span>

              <span [class]="isDark ? 'text-slate-400' : 'text-slate-500'">Optimalna cena:</span>
              <span [class]="isDark ? 'text-slate-200 text-right' : 'text-slate-800 text-right'">
                {{ result.optimalCost !== null ? (result.optimalCost | number:'1.1-1') : 'Nema puta' }}
              </span>

              <span [class]="isDark ? 'text-slate-400' : 'text-slate-500'">Penalty (cena):</span>
              <span class="text-red-400 text-right">-{{ result.breakdown.costPenalty | number:'1.0-0' }}</span>

              <span [class]="isDark ? 'text-slate-400' : 'text-slate-500'">Penalty (potezi):</span>
              <span class="text-red-400 text-right">-{{ result.breakdown.invalidMovePenalty | number:'1.0-0' }}</span>
            </div>
          </div>
        </div>
      </aside>

      <!-- Grid -->
      <section class="flex-1 flex items-start justify-center">
        <app-grid></app-grid>
      </section>
    </div>
  `,
})
export class PlaygroundPageComponent implements OnInit, OnDestroy {
  isDark = true;
  userPath: Position[] = [];
  isSubmitted = false;
  result: PlaygroundResult | null = null;
  private startTime = 0;
  private subs: Subscription[] = [];

  constructor(
    private gridService: GridService,
    private renderer: GridRendererService,
    private themeService: ThemeService,
    public i18n: TranslationService,
  ) {}

  ngOnInit(): void {
    if (!this.gridService.getGrid()) {
      this.gridService.createGrid(25, 50);
    }
    this.startTime = performance.now();
    this.subs.push(
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  getUserPathCost(): number {
    if (this.userPath.length < 2) return 0;
    const grid = this.gridService.getGrid();
    if (!grid) return 0;

    let cost = 0;
    for (let i = 1; i < this.userPath.length; i++) {
      const cell = grid.cells[this.userPath[i].row][this.userPath[i].col];
      cost += cell.weight;
    }
    return cost;
  }

  undoLast(): void {
    if (this.userPath.length > 0) {
      this.userPath.pop();
      this.renderUserPath();
    }
  }

  declareNoPath(): void {
    this.isSubmitted = true;
    const grid = this.gridService.getGrid();
    if (!grid) return;

    const optimal = this.getOptimalResult(grid);

    if (optimal.path === null) {
      // Correct! No path exists
      this.result = {
        userCost: 0,
        optimalCost: null,
        score: 100,
        breakdown: { costPenalty: 0, invalidMovePenalty: 0, speedBonus: 0 },
        optimalPath: null,
      };
    } else {
      // Wrong — path exists
      this.result = {
        userCost: 0,
        optimalCost: optimal.cost,
        score: 0,
        breakdown: { costPenalty: 100, invalidMovePenalty: 0, speedBonus: 0 },
        optimalPath: optimal.path,
      };
      // Show optimal path
      this.renderer.applyEvents([{
        type: 'FOUND_PATH' as any,
        path: optimal.path,
        totalCost: optimal.cost,
      }]);
    }
  }

  submitPath(): void {
    this.isSubmitted = true;
    const grid = this.gridService.getGrid();
    if (!grid) return;

    const optimal = this.getOptimalResult(grid);
    const userCost = this.getUserPathCost();

    // Check for invalid moves
    let invalidMoves = 0;
    for (let i = 1; i < this.userPath.length; i++) {
      const prev = this.userPath[i - 1];
      const curr = this.userPath[i];
      const dr = Math.abs(curr.row - prev.row);
      const dc = Math.abs(curr.col - prev.col);
      if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) {
        invalidMoves++;
      }
      if (grid.cells[curr.row][curr.col].type === CellType.WALL) {
        invalidMoves++;
      }
    }

    // Check start/goal
    const startsAtStart = this.userPath.length > 0 && posEqual(this.userPath[0], grid.start);
    const endsAtGoal = this.userPath.length > 0 && posEqual(this.userPath[this.userPath.length - 1], grid.goal);

    if (!startsAtStart || !endsAtGoal) {
      invalidMoves += 10;
    }

    let score = 100;
    const costPenalty = optimal.path
      ? Math.min(50, Math.round(((userCost - optimal.cost) / Math.max(optimal.cost, 1)) * 100))
      : 0;
    const invalidMovePenalty = Math.min(50, invalidMoves * 10);

    score = Math.max(0, score - Math.max(0, costPenalty) - invalidMovePenalty);

    this.result = {
      userCost,
      optimalCost: optimal.path ? optimal.cost : null,
      score,
      breakdown: {
        costPenalty: Math.max(0, costPenalty),
        invalidMovePenalty,
        speedBonus: 0,
      },
      optimalPath: optimal.path,
    };
  }

  resetPlayground(): void {
    this.userPath = [];
    this.isSubmitted = false;
    this.result = null;
    this.startTime = performance.now();
    this.renderer.resetVisualization();
  }

  private getOptimalResult(grid: Grid) {
    const options: AlgorithmOptions = {
      algorithm: AlgorithmType.DIJKSTRA,
      heuristic: HeuristicType.MANHATTAN,
      neighborMode: NeighborMode.FOUR,
    };
    const { result } = runAlgorithm(grid, grid.start, grid.goal, options);
    return result;
  }

  private renderUserPath(): void {
    this.renderer.resetVisualization();
    if (this.userPath.length > 0) {
      const pathSet = new Set(this.userPath.map(posKey));
      // Use internal render state manipulation
      const renderState = this.renderer.getRenderState();
      renderState.path = pathSet;
      this.renderer.render();
    }
  }
}
