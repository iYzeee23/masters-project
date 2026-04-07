import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GridService } from '../../services/grid.service';
import { GridRendererService } from '../../services/grid-renderer.service';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { GridComponent } from '../../components/grid/grid.component';
import { runAlgorithm, ALGORITHM_INFO } from '../../algorithms';
import {
  AlgorithmType, HeuristicType, NeighborMode,
  AlgorithmOptions,
} from '@shared/types';

interface CompareResult {
  algorithm: AlgorithmType;
  name: string;
  expandedCount: number;
  maxFrontierSize: number;
  pathCost: number;
  pathLength: number | null;
  executionTimeMs: number;
  foundPath: boolean;
  totalSteps: number;
}

@Component({
  selector: 'app-compare-page',
  standalone: true,
  imports: [CommonModule, FormsModule, GridComponent],
  template: `
    <div class="flex gap-4 p-4 max-w-screen-2xl mx-auto">
      <!-- Sidebar -->
      <aside class="w-80 flex-shrink-0">
        <div data-help="compare-sidebar" [class]="isDark
          ? 'flex flex-col gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700'
          : 'flex flex-col gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm'">

          <h2 [class]="isDark ? 'text-lg font-bold text-white' : 'text-lg font-bold text-slate-900'">
            {{ i18n.t('nav.compare') }}
          </h2>

          <!-- Algorithm Selection -->
          <div>
            <label [class]="isDark ? 'block text-sm font-medium text-slate-300 mb-2' : 'block text-sm font-medium text-slate-600 mb-2'">
              {{ i18n.t('controls.algorithm') }}
            </label>
            <div class="flex flex-col gap-1.5">
              <label *ngFor="let algo of allAlgorithms"
                class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" [checked]="selectedAlgorithms.has(algo.value)"
                  (change)="toggleAlgorithm(algo.value)"
                  class="rounded" />
                <span [class]="isDark ? 'text-sm text-slate-300' : 'text-sm text-slate-700'">
                  {{ algo.label }}
                </span>
              </label>
            </div>
          </div>

          <!-- Heuristic & Neighbors -->
          <div>
            <label [class]="isDark ? 'block text-sm font-medium text-slate-300 mb-1' : 'block text-sm font-medium text-slate-600 mb-1'">
              {{ i18n.t('controls.heuristic') }}
            </label>
            <select [(ngModel)]="heuristic"
              [class]="isDark
                ? 'w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm'
                : 'w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 text-sm'">
              <option value="manhattan">Manhattan</option>
              <option value="euclidean">Euclidean</option>
              <option value="chebyshev">Chebyshev</option>
              <option value="octile">Octile</option>
            </select>
          </div>

          <div class="flex gap-2">
            <button (click)="neighborMode = 4"
              [class]="neighborMode === 4 ? 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-blue-600 text-white' : isDark ? 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-slate-700 text-slate-300' : 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-slate-200 text-slate-700'"
            >{{ i18n.t('controls.directions4') }}</button>
            <button (click)="neighborMode = 8"
              [class]="neighborMode === 8 ? 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-blue-600 text-white' : isDark ? 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-slate-700 text-slate-300' : 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-slate-200 text-slate-700'"
            >{{ i18n.t('controls.directions8') }}</button>
          </div>

          <!-- Run Compare -->
          <button (click)="runCompare()" data-help="compare-run"
            [disabled]="selectedAlgorithms.size === 0 || isRunning"
            class="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-4 py-2.5 rounded text-sm font-medium transition-colors">
            {{ isRunning ? '⏳ ...' : '▶ Pokreni poređenje' }}
          </button>

          <button (click)="selectAll()"
            [class]="isDark ? 'w-full bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded text-sm transition-colors' : 'w-full bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1.5 rounded text-sm transition-colors'">
            Izaberi sve
          </button>
        </div>
      </aside>

      <!-- Main area -->
      <section class="flex-1">
        <!-- Grid -->
        <div class="mb-4">
          <app-grid></app-grid>
        </div>

        <!-- Results Table -->
        <div *ngIf="results.length > 0"
          [class]="isDark ? 'bg-slate-800 rounded-lg border border-slate-700 overflow-hidden' : 'bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden'">
          <table class="w-full text-sm">
            <thead>
              <tr [class]="isDark ? 'bg-slate-900' : 'bg-slate-100'">
                <th [class]="isDark ? 'text-left px-4 py-3 text-slate-300 font-medium' : 'text-left px-4 py-3 text-slate-600 font-medium'">Algoritam</th>
                <th [class]="isDark ? 'text-right px-4 py-3 text-slate-300 font-medium' : 'text-right px-4 py-3 text-slate-600 font-medium'">Obrađeno</th>
                <th [class]="isDark ? 'text-right px-4 py-3 text-slate-300 font-medium' : 'text-right px-4 py-3 text-slate-600 font-medium'">Max Frontier</th>
                <th [class]="isDark ? 'text-right px-4 py-3 text-slate-300 font-medium' : 'text-right px-4 py-3 text-slate-600 font-medium'">Cena puta</th>
                <th [class]="isDark ? 'text-right px-4 py-3 text-slate-300 font-medium' : 'text-right px-4 py-3 text-slate-600 font-medium'">Dužina</th>
                <th [class]="isDark ? 'text-right px-4 py-3 text-slate-300 font-medium' : 'text-right px-4 py-3 text-slate-600 font-medium'">Vreme (ms)</th>
                <th [class]="isDark ? 'text-center px-4 py-3 text-slate-300 font-medium' : 'text-center px-4 py-3 text-slate-600 font-medium'">Put</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let r of results; let i = index"
                [class]="isDark
                  ? (i % 2 === 0 ? 'bg-slate-800' : 'bg-slate-850') + ' hover:bg-slate-700 transition-colors'
                  : (i % 2 === 0 ? 'bg-white' : 'bg-slate-50') + ' hover:bg-slate-100 transition-colors'">
                <td [class]="isDark ? 'px-4 py-2.5 text-slate-200 font-medium' : 'px-4 py-2.5 text-slate-800 font-medium'">
                  <span class="inline-block w-3 h-3 rounded-full mr-2" [style.background-color]="getAlgoColor(i)"></span>
                  {{ r.name }}
                </td>
                <td [class]="isDark ? 'px-4 py-2.5 text-slate-300 text-right' : 'px-4 py-2.5 text-slate-600 text-right'"
                  [style.color]="r.expandedCount === bestExpanded ? '#22c55e' : ''">
                  {{ r.expandedCount }}
                </td>
                <td [class]="isDark ? 'px-4 py-2.5 text-slate-300 text-right' : 'px-4 py-2.5 text-slate-600 text-right'">
                  {{ r.maxFrontierSize }}
                </td>
                <td [class]="isDark ? 'px-4 py-2.5 text-slate-300 text-right' : 'px-4 py-2.5 text-slate-600 text-right'"
                  [style.color]="r.foundPath && r.pathCost === bestCost ? '#22c55e' : ''">
                  {{ r.foundPath ? (r.pathCost | number:'1.1-1') : 'N/A' }}
                </td>
                <td [class]="isDark ? 'px-4 py-2.5 text-slate-300 text-right' : 'px-4 py-2.5 text-slate-600 text-right'">
                  {{ r.pathLength ?? 'N/A' }}
                </td>
                <td [class]="isDark ? 'px-4 py-2.5 text-slate-300 text-right' : 'px-4 py-2.5 text-slate-600 text-right'"
                  [style.color]="r.executionTimeMs === bestTime ? '#22c55e' : ''">
                  {{ r.executionTimeMs | number:'1.2-2' }}
                </td>
                <td class="px-4 py-2.5 text-center">
                  <span [class]="r.foundPath ? 'text-green-500' : 'text-red-500'">
                    {{ r.foundPath ? '✓' : '✗' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
})
export class ComparePageComponent implements OnInit, OnDestroy {
  isDark = true;
  private subs: Subscription[] = [];

  selectedAlgorithms = new Set<AlgorithmType>([
    AlgorithmType.BFS, AlgorithmType.DIJKSTRA, AlgorithmType.A_STAR, AlgorithmType.GREEDY,
  ]);
  heuristic: HeuristicType = HeuristicType.MANHATTAN;
  neighborMode: NeighborMode = NeighborMode.FOUR;
  isRunning = false;
  results: CompareResult[] = [];

  bestExpanded = 0;
  bestCost = 0;
  bestTime = 0;

  private algoColors = [
    '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
    '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
  ];

  allAlgorithms = [
    { value: AlgorithmType.BFS, label: 'BFS' },
    { value: AlgorithmType.DFS, label: 'DFS' },
    { value: AlgorithmType.DIJKSTRA, label: 'Dijkstra' },
    { value: AlgorithmType.A_STAR, label: 'A*' },
    { value: AlgorithmType.GREEDY, label: 'Greedy Best-First' },
    { value: AlgorithmType.SWARM, label: 'Swarm' },
    { value: AlgorithmType.CONVERGENT_SWARM, label: 'Convergent Swarm' },
    { value: AlgorithmType.ZERO_ONE_BFS, label: '0-1 BFS' },
  ];

  constructor(
    private gridService: GridService,
    private themeService: ThemeService,
    public i18n: TranslationService,
  ) {}

  ngOnInit(): void {
    if (!this.gridService.getGrid()) {
      this.gridService.createGrid(25, 50);
    }
    this.subs.push(
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  toggleAlgorithm(algo: AlgorithmType): void {
    if (this.selectedAlgorithms.has(algo)) {
      this.selectedAlgorithms.delete(algo);
    } else {
      this.selectedAlgorithms.add(algo);
    }
  }

  selectAll(): void {
    this.allAlgorithms.forEach(a => this.selectedAlgorithms.add(a.value));
  }

  getAlgoColor(index: number): string {
    return this.algoColors[index % this.algoColors.length];
  }

  runCompare(): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;

    this.isRunning = true;
    this.results = [];

    setTimeout(() => {
      const selected = Array.from(this.selectedAlgorithms);
      for (const algo of selected) {
        const options: AlgorithmOptions = {
          algorithm: algo,
          heuristic: this.heuristic,
          neighborMode: this.neighborMode,
          swarmWeight: algo === AlgorithmType.SWARM ? 2 : algo === AlgorithmType.CONVERGENT_SWARM ? 5 : undefined,
        };

        const { result, executionTimeMs } = runAlgorithm(grid, grid.start, grid.goal, options);
        const info = ALGORITHM_INFO[algo];

        this.results.push({
          algorithm: algo,
          name: info.name,
          expandedCount: result.expandedCount,
          maxFrontierSize: result.maxFrontierSize,
          pathCost: result.cost,
          pathLength: result.path ? result.path.length : null,
          executionTimeMs,
          foundPath: result.path !== null,
          totalSteps: result.totalSteps,
        });
      }

      // Calculate best values
      const withPath = this.results.filter(r => r.foundPath);
      this.bestExpanded = withPath.length ? Math.min(...withPath.map(r => r.expandedCount)) : 0;
      this.bestCost = withPath.length ? Math.min(...withPath.map(r => r.pathCost)) : 0;
      this.bestTime = this.results.length ? Math.min(...this.results.map(r => r.executionTimeMs)) : 0;

      this.isRunning = false;
    }, 10);
  }
}
