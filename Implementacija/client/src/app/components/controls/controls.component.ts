import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GridService } from '../../services/grid.service';
import { GridRendererService } from '../../services/grid-renderer.service';
import { VisualizationService } from '../../services/visualization.service';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { ExportService } from '../../services/export.service';
import { EditorTool } from '../grid/grid.component';
import {
  AlgorithmType, HeuristicType, NeighborMode,
  AlgorithmOptions, VisualizationState,
} from '@shared/types';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex flex-col gap-2">

      <!-- ===== ALGORITHM (always visible) ===== -->
      <div [class]="cardClass" class="animate-fade-in">
        <select [(ngModel)]="selectedAlgorithm"
          [class]="isDark
            ? 'w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-stone-200 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 outline-none transition-all'
            : 'w-full bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-stone-700 text-sm focus:border-rose-400 focus:ring-1 focus:ring-rose-400/30 outline-none transition-all'">
          <option *ngFor="let algo of algorithms" [value]="algo.value">{{ i18n.t('algo.' + algo.value) }}</option>
        </select>
        <p [class]="isDark ? 'text-[11px] text-stone-500 mt-1.5 leading-relaxed' : 'text-[11px] text-stone-400 mt-1.5 leading-relaxed'">
          {{ i18n.t('algo.desc.' + selectedAlgorithm) }}
        </p>
      </div>

      <!-- ===== PLAYBACK (always visible) ===== -->
      <div [class]="cardClass">
        <div class="flex gap-1.5">
          <button (click)="onVisualize()" [disabled]="vizState === 'running'"
            class="flex-1 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 disabled:opacity-50 text-white px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-sm shadow-rose-500/20">
            {{ vizState === 'idle' || vizState === 'finished' ? '?' : '?' }}
          </button>
          <button (click)="onPause()" [disabled]="vizState !== 'running'"
            [class]="isDark
              ? 'bg-stone-800 border border-stone-700 hover:border-stone-600 disabled:opacity-30 text-stone-300 px-3 py-2 rounded-xl text-sm transition-all'
              : 'bg-white border border-stone-200 hover:border-stone-300 disabled:opacity-30 text-stone-600 px-3 py-2 rounded-xl text-sm transition-all'">
            ?
          </button>
          <button (click)="onStep()" [disabled]="vizState === 'running' || vizState === 'finished'"
            [class]="isDark
              ? 'bg-stone-800 border border-stone-700 hover:border-stone-600 disabled:opacity-30 text-stone-300 px-3 py-2 rounded-xl text-sm transition-all'
              : 'bg-white border border-stone-200 hover:border-stone-300 disabled:opacity-30 text-stone-600 px-3 py-2 rounded-xl text-sm transition-all'">
            ?
          </button>
          <button (click)="onSkipToEnd()" [disabled]="vizState === 'finished'"
            [class]="isDark
              ? 'bg-stone-800 border border-stone-700 hover:border-stone-600 disabled:opacity-30 text-stone-300 px-3 py-2 rounded-xl text-sm transition-all'
              : 'bg-white border border-stone-200 hover:border-stone-300 disabled:opacity-30 text-stone-600 px-3 py-2 rounded-xl text-sm transition-all'">
            ?
          </button>
        </div>

        <!-- Speed slider — minimal -->
        <input type="range" [(ngModel)]="speed" (ngModelChange)="onSpeedChange($event)"
          [min]="1" [max]="200" [step]="1"
          class="w-full mt-2 accent-rose-500 h-1" />

        <!-- Step scrubber -->
        <div *ngIf="totalSteps > 0" class="mt-1">
          <input type="range" [ngModel]="currentStep" (ngModelChange)="onJumpToStep($event)"
            [min]="0" [max]="totalSteps"
            class="w-full accent-rose-500 h-1" />
          <span [class]="isDark ? 'text-[10px] text-stone-600' : 'text-[10px] text-stone-400'">
            {{ currentStep }}/{{ totalSteps }}
          </span>
        </div>
      </div>

      <!-- ===== TOOLS (collapsible) ===== -->
      <div [class]="cardClass">
        <button (click)="showTools = !showTools"
          class="w-full flex items-center justify-between text-sm font-medium">
          <span [class]="isDark ? 'text-stone-300' : 'text-stone-600'">{{ i18n.t('controls.tools') }}</span>
          <span [class]="isDark ? 'text-stone-600 text-xs' : 'text-stone-400 text-xs'"
            class="transition-transform duration-200"
            [style.transform]="showTools ? 'rotate(180deg)' : ''">?</span>
        </button>

        <div *ngIf="showTools" class="mt-2 animate-slide-down">
          <div class="grid grid-cols-5 gap-1">
            <button *ngFor="let tool of getToolsList()"
              (click)="setEditorTool(tool.value)"
              [class]="activeTool === tool.value
                ? 'p-2 rounded-lg text-base bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/40 transition-all'
                : isDark
                  ? 'p-2 rounded-lg text-base text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-all'
                  : 'p-2 rounded-lg text-base text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all'"
              [title]="tool.label">
              {{ tool.icon }}
            </button>
          </div>

          <div *ngIf="activeTool === 'weight'" class="mt-2 flex items-center gap-2">
            <input type="range" [(ngModel)]="weightValue" [min]="2" [max]="10" [step]="1"
              class="flex-1 accent-rose-500 h-1" />
            <span [class]="isDark ? 'text-xs text-stone-500 w-4' : 'text-xs text-stone-400 w-4'">{{ weightValue }}</span>
          </div>
        </div>
      </div>

      <!-- ===== SETTINGS (collapsible) ===== -->
      <div [class]="cardClass">
        <button (click)="showSettings = !showSettings"
          class="w-full flex items-center justify-between text-sm font-medium">
          <span [class]="isDark ? 'text-stone-300' : 'text-stone-600'">?</span>
          <span [class]="isDark ? 'text-stone-600 text-xs' : 'text-stone-400 text-xs'"
            class="transition-transform duration-200"
            [style.transform]="showSettings ? 'rotate(180deg)' : ''">?</span>
        </button>

        <div *ngIf="showSettings" class="mt-2 flex flex-col gap-2 animate-slide-down">
          <!-- Heuristic -->
          <select [(ngModel)]="selectedHeuristic" [disabled]="!needsHeuristic()"
            [class]="isDark
              ? 'w-full bg-stone-800 border border-stone-700 rounded-lg px-2 py-1.5 text-stone-300 text-xs disabled:opacity-30 outline-none'
              : 'w-full bg-white border border-stone-200 rounded-lg px-2 py-1.5 text-stone-600 text-xs disabled:opacity-30 outline-none'">
            <option *ngFor="let h of heuristics" [value]="h.value">{{ h.label }}</option>
          </select>

          <!-- Neighbors -->
          <div class="flex gap-1">
            <button (click)="neighborMode = 4"
              [class]="neighborMode === 4
                ? 'flex-1 px-2 py-1 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-400 transition-all'
                : isDark
                  ? 'flex-1 px-2 py-1 rounded-lg text-xs text-stone-500 hover:bg-stone-800 transition-all'
                  : 'flex-1 px-2 py-1 rounded-lg text-xs text-stone-400 hover:bg-stone-100 transition-all'"
            >4 dir</button>
            <button (click)="neighborMode = 8"
              [class]="neighborMode === 8
                ? 'flex-1 px-2 py-1 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-400 transition-all'
                : isDark
                  ? 'flex-1 px-2 py-1 rounded-lg text-xs text-stone-500 hover:bg-stone-800 transition-all'
                  : 'flex-1 px-2 py-1 rounded-lg text-xs text-stone-400 hover:bg-stone-100 transition-all'"
            >8 dir</button>
          </div>

          <!-- Swarm weight -->
          <div *ngIf="isSwarmFamily()" class="flex items-center gap-2">
            <span [class]="isDark ? 'text-xs text-stone-500' : 'text-xs text-stone-400'">w</span>
            <input type="range" [(ngModel)]="swarmWeight" [min]="1.1" [max]="10" [step]="0.1"
              class="flex-1 accent-rose-500 h-1" />
            <span [class]="isDark ? 'text-xs text-stone-400 w-6' : 'text-xs text-stone-500 w-6'">{{ swarmWeight }}</span>
          </div>
        </div>
      </div>

      <!-- ===== METRICS (shows after run) ===== -->
      <div *ngIf="metrics" [class]="cardClass" class="animate-fade-in">
        <div class="grid grid-cols-2 gap-y-1.5 text-xs">
          <span [class]="isDark ? 'text-stone-500' : 'text-stone-400'">{{ i18n.t('metrics.expanded') }}</span>
          <span [class]="isDark ? 'text-stone-300 text-right font-mono' : 'text-stone-700 text-right font-mono'">{{ metrics.expandedCount }}</span>
          <span [class]="isDark ? 'text-stone-500' : 'text-stone-400'">{{ i18n.t('metrics.cost') }}</span>
          <span [class]="isDark ? 'text-stone-300 text-right font-mono' : 'text-stone-700 text-right font-mono'">
            {{ metrics.cost === Infinity ? '—' : (metrics.cost | number:'1.1-1') }}
          </span>
          <span [class]="isDark ? 'text-stone-500' : 'text-stone-400'">{{ i18n.t('metrics.pathFound') }}</span>
          <span class="text-right">
            <span [class]="metrics.path ? 'text-emerald-400 text-xs' : 'text-rose-400 text-xs'">
              {{ metrics.path ? '?' : '?' }}
            </span>
          </span>
        </div>

        <!-- Export -->
        <div class="flex gap-1 mt-2">
          <button (click)="onExportJSON()"
            [class]="isDark ? 'flex-1 text-[10px] text-stone-600 hover:text-stone-400 transition-colors' : 'flex-1 text-[10px] text-stone-400 hover:text-stone-600 transition-colors'">
            JSON ?
          </button>
          <button (click)="onExportCSV()"
            [class]="isDark ? 'flex-1 text-[10px] text-stone-600 hover:text-stone-400 transition-colors' : 'flex-1 text-[10px] text-stone-400 hover:text-stone-600 transition-colors'">
            CSV ?
          </button>
        </div>
      </div>

      <!-- ===== ACTIONS (bottom) ===== -->
      <div class="flex gap-1.5">
        <button (click)="onReset()"
          [class]="isDark
            ? 'flex-1 text-xs text-stone-600 hover:text-stone-400 py-1.5 transition-colors'
            : 'flex-1 text-xs text-stone-400 hover:text-stone-600 py-1.5 transition-colors'">
          ? Reset
        </button>
        <button (click)="onClearGrid()"
          [class]="isDark
            ? 'flex-1 text-xs text-stone-600 hover:text-rose-400 py-1.5 transition-colors'
            : 'flex-1 text-xs text-stone-400 hover:text-rose-500 py-1.5 transition-colors'">
          ? Clear
        </button>
      </div>
    </div>
  `,
})
export class ControlsComponent implements OnDestroy {
  selectedAlgorithm = AlgorithmType.A_STAR;
  selectedHeuristic = HeuristicType.MANHATTAN;
  neighborMode: NeighborMode = NeighborMode.FOUR;
  swarmWeight = 2;
  activeTool: EditorTool = EditorTool.WALL;
  weightValue = 3;
  speed = 50;
  vizState: VisualizationState = VisualizationState.IDLE;
  currentStep = 0;
  totalSteps = 0;
  metrics: any = null;
  Infinity = Infinity;
  isDark = true;
  showTools = false;
  showSettings = false;

  private subs: Subscription[] = [];

  algorithms = [
    { value: AlgorithmType.BFS, label: 'BFS' },
    { value: AlgorithmType.DFS, label: 'DFS' },
    { value: AlgorithmType.DIJKSTRA, label: 'Dijkstra' },
    { value: AlgorithmType.A_STAR, label: 'A*' },
    { value: AlgorithmType.GREEDY, label: 'Greedy Best-First' },
    { value: AlgorithmType.SWARM, label: 'Swarm' },
    { value: AlgorithmType.CONVERGENT_SWARM, label: 'Convergent Swarm' },
    { value: AlgorithmType.ZERO_ONE_BFS, label: '0-1 BFS' },
  ];

  heuristics = [
    { value: HeuristicType.MANHATTAN, label: 'Manhattan' },
    { value: HeuristicType.EUCLIDEAN, label: 'Euclidean' },
    { value: HeuristicType.CHEBYSHEV, label: 'Chebyshev' },
    { value: HeuristicType.OCTILE, label: 'Octile' },
  ];

  get cardClass(): string {
    return this.isDark
      ? 'p-3 bg-stone-800/50 border border-stone-800 rounded-2xl transition-all duration-300'
      : 'p-3 bg-white/80 border border-stone-200/60 rounded-2xl shadow-sm transition-all duration-300';
  }

  constructor(
    private gridService: GridService,
    private vizService: VisualizationService,
    private themeService: ThemeService,
    private exportService: ExportService,
    public i18n: TranslationService,
  ) {
    this.subs.push(
      this.vizService.state$.subscribe(s => this.vizState = s),
      this.vizService.stepIndex$.subscribe(i => this.currentStep = i),
      this.vizService.totalSteps$.subscribe(t => this.totalSteps = t),
      this.vizService.metrics$.subscribe(m => this.metrics = m),
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
      this.i18n.lang$.subscribe(() => {}),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  getToolsList() {
    return [
      { value: EditorTool.WALL, icon: '?', label: this.i18n.t('tool.wall') },
      { value: EditorTool.WEIGHT, icon: '?', label: this.i18n.t('tool.weight') },
      { value: EditorTool.START, icon: '?', label: this.i18n.t('tool.start') },
      { value: EditorTool.GOAL, icon: '?', label: this.i18n.t('tool.goal') },
      { value: EditorTool.ERASE, icon: '?', label: this.i18n.t('tool.erase') },
    ];
  }

  needsHeuristic(): boolean {
    return ![AlgorithmType.BFS, AlgorithmType.DFS, AlgorithmType.DIJKSTRA, AlgorithmType.ZERO_ONE_BFS]
      .includes(this.selectedAlgorithm);
  }

  isSwarmFamily(): boolean {
    return [AlgorithmType.SWARM, AlgorithmType.CONVERGENT_SWARM].includes(this.selectedAlgorithm);
  }

  setEditorTool(tool: EditorTool): void { this.activeTool = tool; }

  onSpeedChange(value: number): void { this.vizService.setSpeed(value); }

  onVisualize(): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;
    if (this.vizState === VisualizationState.IDLE || this.vizState === VisualizationState.FINISHED) {
      const options: AlgorithmOptions = {
        algorithm: this.selectedAlgorithm, heuristic: this.selectedHeuristic,
        neighborMode: this.neighborMode, swarmWeight: this.swarmWeight,
      };
      this.vizService.prepare(grid, grid.start, grid.goal, options);
    }
    this.vizService.play();
  }

  onPause(): void { this.vizService.pause(); }

  onStep(): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;
    if (this.vizState === VisualizationState.IDLE) {
      const options: AlgorithmOptions = {
        algorithm: this.selectedAlgorithm, heuristic: this.selectedHeuristic,
        neighborMode: this.neighborMode, swarmWeight: this.swarmWeight,
      };
      this.vizService.prepare(grid, grid.start, grid.goal, options);
    }
    this.vizService.stepForward();
  }

  onSkipToEnd(): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;
    if (this.vizState === VisualizationState.IDLE) {
      const options: AlgorithmOptions = {
        algorithm: this.selectedAlgorithm, heuristic: this.selectedHeuristic,
        neighborMode: this.neighborMode, swarmWeight: this.swarmWeight,
      };
      this.vizService.prepare(grid, grid.start, grid.goal, options);
    }
    this.vizService.skipToEnd();
  }

  onReset(): void { this.vizService.reset(); }
  onClearGrid(): void { this.vizService.reset(); this.gridService.clearGrid(); }
  onJumpToStep(step: number): void { this.vizService.jumpToStep(step); }

  onExportJSON(): void {
    if (!this.metrics) return;
    const grid = this.gridService.getGrid();
    this.exportService.addRun({
      algorithm: this.selectedAlgorithm, heuristic: this.selectedHeuristic,
      neighborMode: this.neighborMode, swarmWeight: this.swarmWeight,
      expandedNodes: this.metrics.expandedCount, maxFrontierSize: this.metrics.maxFrontierSize,
      pathCost: this.metrics.cost === Infinity ? null : this.metrics.cost,
      pathLength: this.metrics.path?.length ?? null, totalSteps: this.metrics.totalSteps,
      executionTimeMs: 0, foundPath: !!this.metrics.path,
      mapRows: grid?.rows ?? 0, mapCols: grid?.cols ?? 0,
      wallCount: 0, weightedCount: 0, timestamp: new Date().toISOString(),
    });
    this.exportService.exportJSON();
  }

  onExportCSV(): void {
    if (!this.metrics) return;
    const grid = this.gridService.getGrid();
    this.exportService.addRun({
      algorithm: this.selectedAlgorithm, heuristic: this.selectedHeuristic,
      neighborMode: this.neighborMode, swarmWeight: this.swarmWeight,
      expandedNodes: this.metrics.expandedCount, maxFrontierSize: this.metrics.maxFrontierSize,
      pathCost: this.metrics.cost === Infinity ? null : this.metrics.cost,
      pathLength: this.metrics.path?.length ?? null, totalSteps: this.metrics.totalSteps,
      executionTimeMs: 0, foundPath: !!this.metrics.path,
      mapRows: grid?.rows ?? 0, mapCols: grid?.cols ?? 0,
      wallCount: 0, weightedCount: 0, timestamp: new Date().toISOString(),
    });
    this.exportService.exportCSV();
  }
}
