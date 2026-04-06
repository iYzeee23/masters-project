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
import { ALGORITHM_INFO } from '../../algorithms';

@Component({
  selector: 'app-controls',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div [class]="isDark
      ? 'flex flex-col gap-4 p-4 bg-slate-800 rounded-lg border border-slate-700'
      : 'flex flex-col gap-4 p-4 bg-white rounded-lg border border-slate-200 shadow-sm'">

      <!-- Algorithm Selection -->
      <div>
        <label [class]="isDark ? 'block text-sm font-medium text-slate-300 mb-1' : 'block text-sm font-medium text-slate-600 mb-1'">
          {{ i18n.t('controls.algorithm') }}
        </label>
        <select
          [(ngModel)]="selectedAlgorithm"
          [class]="isDark
            ? 'w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm'
            : 'w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 text-sm'"
        >
          <option *ngFor="let algo of algorithms" [value]="algo.value">{{ i18n.t('algo.' + algo.value) }}</option>
        </select>
        <p [class]="isDark ? 'text-xs text-slate-400 mt-1' : 'text-xs text-slate-500 mt-1'">
          {{ i18n.t('algo.desc.' + selectedAlgorithm) }}
        </p>
      </div>

      <!-- Heuristic -->
      <div>
        <label [class]="isDark ? 'block text-sm font-medium text-slate-300 mb-1' : 'block text-sm font-medium text-slate-600 mb-1'">
          {{ i18n.t('controls.heuristic') }}
        </label>
        <select
          [(ngModel)]="selectedHeuristic"
          [disabled]="!needsHeuristic()"
          [class]="isDark
            ? 'w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 text-sm disabled:opacity-50'
            : 'w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 text-sm disabled:opacity-50'"
        >
          <option *ngFor="let h of heuristics" [value]="h.value">{{ h.label }}</option>
        </select>
      </div>

      <!-- Neighbor Mode -->
      <div>
        <label [class]="isDark ? 'block text-sm font-medium text-slate-300 mb-1' : 'block text-sm font-medium text-slate-600 mb-1'">
          {{ i18n.t('controls.neighbors') }}
        </label>
        <div class="flex gap-2">
          <button
            (click)="neighborMode = 4"
            [class]="neighborMode === 4
              ? 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-blue-600 text-white transition-colors'
              : isDark
                ? 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-slate-700 text-slate-300 transition-colors'
                : 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-slate-200 text-slate-700 transition-colors'"
          >{{ i18n.t('controls.directions4') }}</button>
          <button
            (click)="neighborMode = 8"
            [class]="neighborMode === 8
              ? 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-blue-600 text-white transition-colors'
              : isDark
                ? 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-slate-700 text-slate-300 transition-colors'
                : 'flex-1 px-3 py-1.5 rounded text-sm font-medium bg-slate-200 text-slate-700 transition-colors'"
          >{{ i18n.t('controls.directions8') }}</button>
        </div>
      </div>

      <!-- Swarm Weight -->
      <div *ngIf="isSwarmFamily()">
        <label [class]="isDark ? 'block text-sm font-medium text-slate-300 mb-1' : 'block text-sm font-medium text-slate-600 mb-1'">
          {{ i18n.t('controls.swarmWeight') }} (w = {{ swarmWeight }})
        </label>
        <input type="range" [(ngModel)]="swarmWeight" [min]="1.1" [max]="10" [step]="0.1" class="w-full" />
      </div>

      <!-- Editor Tools -->
      <div>
        <label [class]="isDark ? 'block text-sm font-medium text-slate-300 mb-2' : 'block text-sm font-medium text-slate-600 mb-2'">
          {{ i18n.t('controls.tools') }}
        </label>
        <div class="grid grid-cols-3 gap-1.5">
          <button *ngFor="let tool of getToolsList()"
            (click)="setEditorTool(tool.value)"
            [class]="activeTool === tool.value
              ? 'px-2 py-1.5 rounded text-xs font-medium bg-blue-600 text-white ring-2 ring-blue-400 transition-colors'
              : isDark
                ? 'px-2 py-1.5 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors'
                : 'px-2 py-1.5 rounded text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors'"
          >{{ tool.label }}</button>
        </div>
      </div>

      <!-- Weight Value -->
      <div *ngIf="activeTool === 'weight'">
        <label [class]="isDark ? 'block text-sm font-medium text-slate-300 mb-1' : 'block text-sm font-medium text-slate-600 mb-1'">
          {{ i18n.t('weight.label') }}: {{ weightValue }}
        </label>
        <input type="range" [(ngModel)]="weightValue" [min]="2" [max]="10" [step]="1" class="w-full" />
      </div>

      <!-- Speed Control -->
      <div>
        <label [class]="isDark ? 'block text-sm font-medium text-slate-300 mb-1' : 'block text-sm font-medium text-slate-600 mb-1'">
          {{ i18n.t('controls.speed') }}: {{ getSpeedLabel() }}
        </label>
        <input type="range" [(ngModel)]="speed" (ngModelChange)="onSpeedChange($event)" [min]="1" [max]="200" [step]="1" class="w-full" />
      </div>

      <!-- Playback Controls -->
      <div class="flex gap-2">
        <button (click)="onVisualize()" [disabled]="vizState === 'running'"
          class="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-medium transition-colors">
          {{ vizState === 'idle' || vizState === 'finished' ? i18n.t('playback.visualize') : i18n.t('playback.resume') }}
        </button>
        <button (click)="onPause()" [disabled]="vizState !== 'running'"
          class="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-medium transition-colors">&#x23F8;</button>
        <button (click)="onStep()" [disabled]="vizState === 'running' || vizState === 'finished'"
          class="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-medium transition-colors">&#x23ED;</button>
        <button (click)="onSkipToEnd()" [disabled]="vizState === 'finished'"
          class="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-2 rounded text-sm font-medium transition-colors">&#x23E9;</button>
      </div>

      <!-- Reset / Clear -->
      <div class="flex gap-2">
        <button (click)="onReset()"
          [class]="isDark
            ? 'flex-1 bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-2 rounded text-sm font-medium transition-colors'
            : 'flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded text-sm font-medium transition-colors'"
        >{{ i18n.t('playback.reset') }}</button>
        <button (click)="onClearGrid()"
          class="flex-1 bg-red-700 hover:bg-red-600 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
        >{{ i18n.t('playback.clearMap') }}</button>
      </div>

      <!-- Step Slider -->
      <div *ngIf="totalSteps > 0">
        <label [class]="isDark ? 'block text-sm font-medium text-slate-300 mb-1' : 'block text-sm font-medium text-slate-600 mb-1'">
          {{ i18n.t('controls.step') }}: {{ currentStep }} / {{ totalSteps }}
        </label>
        <input type="range" [ngModel]="currentStep" (ngModelChange)="onJumpToStep($event)" [min]="0" [max]="totalSteps" class="w-full" />
      </div>

      <!-- Metrics -->
      <div *ngIf="metrics" [class]="isDark
        ? 'bg-slate-900 rounded p-3 border border-slate-700'
        : 'bg-slate-50 rounded p-3 border border-slate-200'">
        <h3 [class]="isDark ? 'text-sm font-semibold text-slate-300 mb-2' : 'text-sm font-semibold text-slate-600 mb-2'">
          {{ i18n.t('metrics.title') }}
        </h3>
        <div class="grid grid-cols-2 gap-y-1 text-xs">
          <span [class]="isDark ? 'text-slate-400' : 'text-slate-500'">{{ i18n.t('metrics.expanded') }}:</span>
          <span [class]="isDark ? 'text-slate-200 text-right' : 'text-slate-800 text-right'">{{ metrics.expandedCount }}</span>
          <span [class]="isDark ? 'text-slate-400' : 'text-slate-500'">{{ i18n.t('metrics.frontier') }}:</span>
          <span [class]="isDark ? 'text-slate-200 text-right' : 'text-slate-800 text-right'">{{ metrics.maxFrontierSize }}</span>
          <span [class]="isDark ? 'text-slate-400' : 'text-slate-500'">{{ i18n.t('metrics.cost') }}:</span>
          <span [class]="isDark ? 'text-slate-200 text-right' : 'text-slate-800 text-right'">
            {{ metrics.cost === Infinity ? i18n.t('metrics.na') : (metrics.cost | number:'1.1-1') }}
          </span>
          <span [class]="isDark ? 'text-slate-400' : 'text-slate-500'">{{ i18n.t('metrics.pathLength') }}:</span>
          <span [class]="isDark ? 'text-slate-200 text-right' : 'text-slate-800 text-right'">
            {{ metrics.path ? metrics.path.length : i18n.t('metrics.na') }}
          </span>
          <span [class]="isDark ? 'text-slate-400' : 'text-slate-500'">{{ i18n.t('metrics.pathFound') }}:</span>
          <span class="text-right" [class]="metrics.path ? 'text-green-500' : 'text-red-500'">
            {{ metrics.path ? i18n.t('metrics.yes') : i18n.t('metrics.no') }}
          </span>
        </div>
      </div>

      <!-- Export -->
      <div *ngIf="metrics" class="flex gap-2">
        <button (click)="onExportJSON()"
          [class]="isDark
            ? 'flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1.5 rounded text-xs font-medium transition-colors'
            : 'flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1.5 rounded text-xs font-medium transition-colors'"
        >📥 JSON</button>
        <button (click)="onExportCSV()"
          [class]="isDark
            ? 'flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1.5 rounded text-xs font-medium transition-colors'
            : 'flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1.5 rounded text-xs font-medium transition-colors'"
        >📥 CSV</button>
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
      this.i18n.lang$.subscribe(() => {}), // trigger change detection
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  getToolsList() {
    return [
      { value: EditorTool.WALL, label: this.i18n.t('tool.wall') },
      { value: EditorTool.WEIGHT, label: this.i18n.t('tool.weight') },
      { value: EditorTool.START, label: this.i18n.t('tool.start') },
      { value: EditorTool.GOAL, label: this.i18n.t('tool.goal') },
      { value: EditorTool.ERASE, label: this.i18n.t('tool.erase') },
    ];
  }

  needsHeuristic(): boolean {
    return ![AlgorithmType.BFS, AlgorithmType.DFS, AlgorithmType.DIJKSTRA, AlgorithmType.ZERO_ONE_BFS]
      .includes(this.selectedAlgorithm);
  }

  isSwarmFamily(): boolean {
    return [AlgorithmType.SWARM, AlgorithmType.CONVERGENT_SWARM].includes(this.selectedAlgorithm);
  }

  setEditorTool(tool: EditorTool): void {
    this.activeTool = tool;
  }

  getSpeedLabel(): string {
    if (this.speed <= 10) return this.i18n.t('speed.fast');
    if (this.speed <= 50) return this.i18n.t('speed.normal');
    if (this.speed <= 100) return this.i18n.t('speed.slow');
    return this.i18n.t('speed.verySlow');
  }

  onSpeedChange(value: number): void {
    this.vizService.setSpeed(value);
  }

  onVisualize(): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;
    if (this.vizState === VisualizationState.IDLE || this.vizState === VisualizationState.FINISHED) {
      const options: AlgorithmOptions = {
        algorithm: this.selectedAlgorithm,
        heuristic: this.selectedHeuristic,
        neighborMode: this.neighborMode,
        swarmWeight: this.swarmWeight,
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
        algorithm: this.selectedAlgorithm,
        heuristic: this.selectedHeuristic,
        neighborMode: this.neighborMode,
        swarmWeight: this.swarmWeight,
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
        algorithm: this.selectedAlgorithm,
        heuristic: this.selectedHeuristic,
        neighborMode: this.neighborMode,
        swarmWeight: this.swarmWeight,
      };
      this.vizService.prepare(grid, grid.start, grid.goal, options);
    }
    this.vizService.skipToEnd();
  }

  onReset(): void { this.vizService.reset(); }

  onClearGrid(): void {
    this.vizService.reset();
    this.gridService.clearGrid();
  }

  onJumpToStep(step: number): void { this.vizService.jumpToStep(step); }

  onExportJSON(): void {
    if (!this.metrics) return;
    const grid = this.gridService.getGrid();
    this.exportService.addRun({
      algorithm: this.selectedAlgorithm,
      heuristic: this.selectedHeuristic,
      neighborMode: this.neighborMode,
      swarmWeight: this.swarmWeight,
      expandedNodes: this.metrics.expandedCount,
      maxFrontierSize: this.metrics.maxFrontierSize,
      pathCost: this.metrics.cost === Infinity ? null : this.metrics.cost,
      pathLength: this.metrics.path?.length ?? null,
      totalSteps: this.metrics.totalSteps,
      executionTimeMs: 0,
      foundPath: !!this.metrics.path,
      mapRows: grid?.rows ?? 0,
      mapCols: grid?.cols ?? 0,
      wallCount: 0,
      weightedCount: 0,
      timestamp: new Date().toISOString(),
    });
    this.exportService.exportJSON();
  }

  onExportCSV(): void {
    if (!this.metrics) return;
    const grid = this.gridService.getGrid();
    this.exportService.addRun({
      algorithm: this.selectedAlgorithm,
      heuristic: this.selectedHeuristic,
      neighborMode: this.neighborMode,
      swarmWeight: this.swarmWeight,
      expandedNodes: this.metrics.expandedCount,
      maxFrontierSize: this.metrics.maxFrontierSize,
      pathCost: this.metrics.cost === Infinity ? null : this.metrics.cost,
      pathLength: this.metrics.path?.length ?? null,
      totalSteps: this.metrics.totalSteps,
      executionTimeMs: 0,
      foundPath: !!this.metrics.path,
      mapRows: grid?.rows ?? 0,
      mapCols: grid?.cols ?? 0,
      wallCount: 0,
      weightedCount: 0,
      timestamp: new Date().toISOString(),
    });
    this.exportService.exportCSV();
  }
}
