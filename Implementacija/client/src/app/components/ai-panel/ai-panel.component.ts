import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { AIService, KeyMoment, AIRecommendation, AIGeneratedMap } from '../../services/ai.service';
import { GridService } from '../../services/grid.service';
import { GridRendererService } from '../../services/grid-renderer.service';
import { VisualizationService } from '../../services/visualization.service';
import { generateMap, GeneratorType, GENERATOR_INFO } from '../../generators';
import { CellType, AlgorithmType } from '@shared/types';

@Component({
  selector: 'app-ai-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div [class]="isDark
      ? 'flex flex-col gap-3 p-4 bg-slate-800 rounded-lg border border-slate-700 mt-4'
      : 'flex flex-col gap-3 p-4 bg-white rounded-lg border border-slate-200 shadow-sm mt-4'">

      <h3 [class]="isDark ? 'text-sm font-bold text-white' : 'text-sm font-bold text-slate-900'">
        🤖 AI & Generatori
      </h3>

      <!-- Tabs -->
      <div class="flex gap-1">
        <button *ngFor="let tab of tabs"
          (click)="activeTab = tab.id"
          [class]="activeTab === tab.id
            ? 'px-2 py-1 rounded text-xs font-medium bg-blue-600 text-white'
            : isDark
              ? 'px-2 py-1 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600'
              : 'px-2 py-1 rounded text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300'"
        >{{ tab.label }}</button>
      </div>

      <!-- AI Tutor -->
      <div *ngIf="activeTab === 'tutor'">
        <button (click)="runTutor()" [disabled]="loadingTutor"
          class="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
          {{ loadingTutor ? '⏳ Analiziram...' : '🎓 Analiziraj korake' }}
        </button>
        <div *ngIf="keyMoments.length > 0" class="mt-2 flex flex-col gap-2">
          <div *ngFor="let m of keyMoments"
            [class]="isDark ? 'bg-slate-900 rounded p-2 border border-slate-700' : 'bg-slate-50 rounded p-2 border border-slate-200'">
            <span class="text-xs font-mono text-blue-400">Korak #{{ m.stepIndex }}</span>
            <p [class]="isDark ? 'text-xs text-slate-300 mt-1' : 'text-xs text-slate-600 mt-1'">{{ m.explanation }}</p>
          </div>
        </div>
      </div>

      <!-- AI Generator -->
      <div *ngIf="activeTab === 'generate'">
        <textarea [(ngModel)]="generatePrompt" rows="2"
          [placeholder]="'Npr: mapu gde je A* mnogo brži od Dijkstre'"
          [class]="isDark
            ? 'w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-slate-200 text-xs resize-none'
            : 'w-full bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 text-xs resize-none'"
        ></textarea>
        <button (click)="runGenerate()" [disabled]="loadingGenerate || !generatePrompt.trim()"
          class="w-full mt-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
          {{ loadingGenerate ? '⏳ Generišem...' : '🗺 Generiši AI mapu' }}
        </button>
        <p *ngIf="generateResult" [class]="isDark ? 'text-xs text-slate-400 mt-2' : 'text-xs text-slate-500 mt-2'">
          {{ generateResult }}
        </p>
      </div>

      <!-- AI Recommender -->
      <div *ngIf="activeTab === 'recommend'">
        <button (click)="runRecommend()" [disabled]="loadingRecommend"
          class="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors">
          {{ loadingRecommend ? '⏳ Analiziram...' : '🏆 Preporuči algoritam' }}
        </button>
        <div *ngIf="recommendation" class="mt-2">
          <div [class]="isDark ? 'bg-slate-900 rounded p-2 border border-slate-700 mb-2' : 'bg-slate-50 rounded p-2 border border-slate-200 mb-2'">
            <span class="text-xs text-green-400 font-medium">✓ Najbolji: {{ recommendation.best.algorithm }}</span>
            <p [class]="isDark ? 'text-xs text-slate-300 mt-1' : 'text-xs text-slate-600 mt-1'">{{ recommendation.best.reason }}</p>
            <span [class]="isDark ? 'text-xs text-slate-500' : 'text-xs text-slate-400'">Pouzdanost: {{ recommendation.best.confidence }}%</span>
          </div>
          <div [class]="isDark ? 'bg-slate-900 rounded p-2 border border-slate-700' : 'bg-slate-50 rounded p-2 border border-slate-200'">
            <span class="text-xs text-red-400 font-medium">✗ Najgori: {{ recommendation.worst.algorithm }}</span>
            <p [class]="isDark ? 'text-xs text-slate-300 mt-1' : 'text-xs text-slate-600 mt-1'">{{ recommendation.worst.reason }}</p>
            <span [class]="isDark ? 'text-xs text-slate-500' : 'text-xs text-slate-400'">Pouzdanost: {{ recommendation.worst.confidence }}%</span>
          </div>
        </div>
      </div>

      <!-- Map Generators -->
      <div *ngIf="activeTab === 'generators'">
        <div class="grid grid-cols-2 gap-1.5">
          <button *ngFor="let gen of generators"
            (click)="applyGenerator(gen.type)"
            [class]="isDark
              ? 'px-2 py-2 rounded text-xs font-medium bg-slate-700 text-slate-300 hover:bg-slate-600 text-left transition-colors'
              : 'px-2 py-2 rounded text-xs font-medium bg-slate-200 text-slate-700 hover:bg-slate-300 text-left transition-colors'">
            {{ gen.name }}
          </button>
        </div>
        <div class="mt-2 flex gap-2 items-center">
          <label [class]="isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-500'">Gustina:</label>
          <input type="range" [(ngModel)]="genDensity" [min]="10" [max]="50" class="flex-1" />
          <span [class]="isDark ? 'text-xs text-slate-300 w-8' : 'text-xs text-slate-700 w-8'">{{ genDensity }}%</span>
        </div>
        <div class="flex gap-2 items-center">
          <label [class]="isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-500'">Seed:</label>
          <input type="number" [(ngModel)]="genSeed" [min]="0"
            [class]="isDark
              ? 'flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 text-xs'
              : 'flex-1 bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-800 text-xs'" />
          <button (click)="randomSeed()"
            [class]="isDark ? 'px-2 py-1 rounded text-xs bg-slate-700 text-slate-300 hover:bg-slate-600' : 'px-2 py-1 rounded text-xs bg-slate-200 text-slate-700 hover:bg-slate-300'"
          >🎲</button>
        </div>
      </div>

      <!-- Error -->
      <p *ngIf="error" class="text-xs text-red-400">{{ error }}</p>
    </div>
  `,
})
export class AIPanelComponent implements OnDestroy {
  isDark = true;
  activeTab: 'tutor' | 'generate' | 'recommend' | 'generators' = 'generators';

  tabs = [
    { id: 'generators' as const, label: '🗺 Generatori' },
    { id: 'tutor' as const, label: '🎓 Tutor' },
    { id: 'generate' as const, label: '✨ AI Mapa' },
    { id: 'recommend' as const, label: '🏆 Preporuka' },
  ];

  // Tutor
  loadingTutor = false;
  keyMoments: KeyMoment[] = [];

  // Generator
  loadingGenerate = false;
  generatePrompt = '';
  generateResult = '';

  // Recommender
  loadingRecommend = false;
  recommendation: AIRecommendation | null = null;

  // Map generators
  generators = Object.entries(GENERATOR_INFO).map(([type, info]) => ({
    type: type as GeneratorType,
    name: info.name,
  }));
  genDensity = 30;
  genSeed = Math.floor(Math.random() * 1000000);

  error = '';
  private subs: Subscription[] = [];

  constructor(
    private themeService: ThemeService,
    private aiService: AIService,
    private gridService: GridService,
    private renderer: GridRendererService,
    private vizService: VisualizationService,
    public i18n: TranslationService,
  ) {
    this.subs.push(
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  runTutor(): void {
    const grid = this.gridService.getGrid();
    const metrics = this.vizService.metrics$.value;
    if (!grid || !metrics) {
      this.error = 'Najpre pokreni vizualizaciju algoritma';
      return;
    }

    this.error = '';
    this.loadingTutor = true;
    this.aiService.getKeyMoments('A*', grid, metrics, []).subscribe({
      next: (res) => {
        this.keyMoments = res.keyMoments || [];
        this.loadingTutor = false;
      },
      error: () => {
        this.error = 'AI servis nije dostupan';
        this.loadingTutor = false;
      },
    });
  }

  runGenerate(): void {
    if (!this.generatePrompt.trim()) return;
    this.error = '';
    this.loadingGenerate = true;

    this.aiService.generateMap(this.generatePrompt).subscribe({
      next: (res) => {
        this.applyAIMap(res);
        this.generateResult = res.description || 'Mapa generisana!';
        this.loadingGenerate = false;
      },
      error: () => {
        this.error = 'AI servis nije dostupan';
        this.loadingGenerate = false;
      },
    });
  }

  runRecommend(): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;

    this.error = '';
    this.loadingRecommend = true;
    this.aiService.getRecommendation(grid).subscribe({
      next: (res) => {
        this.recommendation = res;
        this.loadingRecommend = false;
      },
      error: () => {
        this.error = 'AI servis nije dostupan';
        this.loadingRecommend = false;
      },
    });
  }

  applyGenerator(type: GeneratorType): void {
    this.vizService.reset();
    const grid = generateMap(type, 25, 50, { density: this.genDensity, seed: this.genSeed });
    this.gridService.createGrid(grid.rows, grid.cols);

    // Apply generated grid to service
    const current = this.gridService.getGrid()!;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        current.cells[r][c] = grid.cells[r][c];
      }
    }
    current.start = grid.start;
    current.goal = grid.goal;
    this.gridService['grid$'].next(current);
  }

  randomSeed(): void {
    this.genSeed = Math.floor(Math.random() * 1000000);
  }

  private applyAIMap(data: any): void {
    this.vizService.reset();
    const rows = data.rows || 25;
    const cols = data.cols || 50;
    this.gridService.createGrid(rows, cols);
    const grid = this.gridService.getGrid()!;

    // Apply walls
    if (data.walls) {
      for (const [r, c] of data.walls) {
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          if (grid.cells[r][c].type !== CellType.START && grid.cells[r][c].type !== CellType.GOAL) {
            grid.cells[r][c].type = CellType.WALL;
          }
        }
      }
    }

    // Apply weights
    if (data.weights) {
      for (const w of data.weights) {
        const [r, c] = w.pos;
        if (r >= 0 && r < rows && c >= 0 && c < cols) {
          if (grid.cells[r][c].type === CellType.EMPTY) {
            grid.cells[r][c].type = CellType.WEIGHT;
            grid.cells[r][c].weight = w.weight;
          }
        }
      }
    }

    this.gridService['grid$'].next(grid);
  }
}
