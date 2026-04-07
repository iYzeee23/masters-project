import { Component, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GridService } from '../../services/grid.service';
import { VisualizationService } from '../../services/visualization.service';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { ExportService } from '../../services/export.service';
import { AIService } from '../../services/ai.service';
import { EditorTool } from '../grid/grid.component';
import { generateMap, GeneratorType, GENERATOR_INFO } from '../../generators';
import {
  AlgorithmType, HeuristicType, NeighborMode,
  AlgorithmOptions, VisualizationState, CellType,
} from '@shared/types';

type PopupType = 'algorithm' | 'tools' | 'speed' | 'settings' | 'ai' | 'generators' | null;

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ============================================================
         TOOLBAR — full width, spacious, readable
         ============================================================ -->
    <div [style.background-color]="isDark ? '#3D3128' : '#FFF9F2'"
      [style.border-bottom]="isDark ? '1px solid #554536' : '1px solid #D7CABC'"
      [style.box-shadow]="isDark ? '0 2px 15px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.04)'"
      class="px-8 py-3.5 relative z-20 transition-all duration-300">

      <div class="flex items-center justify-between max-w-screen-2xl mx-auto">

        <!-- LEFT GROUP -->
        <div class="flex items-center gap-3">

          <!-- Algorithm -->
          <div class="relative">
            <button (click)="togglePopup('algorithm')"
              [class]="isDark
                ? 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-200 bg-stone-800 hover:bg-stone-700 border border-stone-700 transition-all'
                : 'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-stone-700 bg-stone-50 hover:bg-stone-100 border border-stone-200 transition-all'">
              {{ getAlgoShortName() }}
              <span class="text-xs opacity-50">▾</span>
            </button>

            <div *ngIf="activePopup === 'algorithm'"
              [class]="popupClass"
              class="absolute top-full left-0 mt-2 w-80 rounded-2xl p-2 animate-slide-down z-50">
              <button *ngFor="let algo of algorithms"
                (click)="selectAlgorithm(algo.value)"
                [class]="selectedAlgorithm === algo.value
                  ? 'w-full text-left px-4 py-3 rounded-xl bg-rose-500/15 text-rose-400 transition-all'
                  : isDark
                    ? 'w-full text-left px-4 py-3 rounded-xl text-stone-300 hover:bg-stone-800 transition-all'
                    : 'w-full text-left px-4 py-3 rounded-xl text-stone-600 hover:bg-stone-50 transition-all'">
                <span class="font-semibold text-sm">{{ algo.label }}</span>
                <span [class]="isDark ? 'block text-xs text-stone-500 mt-0.5' : 'block text-xs text-stone-400 mt-0.5'">
                  {{ i18n.t('algo.desc.' + algo.value) }}
                </span>
              </button>
            </div>
          </div>

          <!-- Divider -->
          <div [class]="isDark ? 'w-px h-8 bg-stone-800' : 'w-px h-8 bg-stone-200'"></div>

          <!-- Playback -->
          <button (click)="onVisualize()" [disabled]="vizState === 'running'"
            class="text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-md disabled:opacity-40"
            style="background: linear-gradient(135deg, #6E473B, #8B5E50); box-shadow: 0 4px 15px rgba(110,71,59,0.3);">
            ▶ Play
          </button>
          <button (click)="onPause()" [disabled]="vizState !== 'running'"
            [class]="btnClass" class="px-4 py-3 rounded-xl text-sm font-medium transition-all">⏸ Pause</button>
          <button (click)="onStep()" [disabled]="vizState === 'running' || vizState === 'finished'"
            [class]="btnClass" class="px-4 py-3 rounded-xl text-sm font-medium transition-all">⏭ Step</button>
          <button (click)="onSkipToEnd()" [disabled]="vizState === 'finished'"
            [class]="btnClass" class="px-4 py-3 rounded-xl text-sm font-medium transition-all">⏩ End</button>

          <!-- Divider -->
          <div [class]="isDark ? 'w-px h-8 bg-stone-800' : 'w-px h-8 bg-stone-200'"></div>

          <!-- Tools -->
          <div class="relative">
            <button (click)="togglePopup('tools')"
              [class]="activePopup === 'tools' ? activeBtnClass : btnClass"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
              {{ getActiveToolIcon() }} {{ getActiveToolLabel() }}
              <span class="text-xs opacity-50">▾</span>
            </button>

            <div *ngIf="activePopup === 'tools'"
              [class]="popupClass"
              class="absolute top-full left-0 mt-2 w-56 rounded-2xl p-2 animate-slide-down z-50">
              <button *ngFor="let tool of toolsList"
                (click)="selectTool(tool.value)"
                [class]="activeTool === tool.value
                  ? 'w-full text-left px-4 py-2.5 rounded-xl bg-rose-500/15 text-rose-400 flex items-center gap-3 transition-all'
                  : isDark
                    ? 'w-full text-left px-4 py-2.5 rounded-xl text-stone-300 hover:bg-stone-800 flex items-center gap-3 transition-all'
                    : 'w-full text-left px-4 py-2.5 rounded-xl text-stone-600 hover:bg-stone-50 flex items-center gap-3 transition-all'">
                <span class="text-base">{{ tool.icon }}</span>
                <span class="text-sm font-medium">{{ tool.label }}</span>
              </button>
              <div *ngIf="activeTool === 'weight'" class="px-4 pt-3 mt-2 border-t"
                [class]="isDark ? 'border-stone-700' : 'border-stone-200'">
                <div class="flex items-center gap-3">
                  <span [class]="isDark ? 'text-sm text-stone-400' : 'text-sm text-stone-500'">Weight</span>
                  <input type="range" [(ngModel)]="weightValue" [min]="2" [max]="10" [step]="1"
                    class="flex-1 accent-rose-500" />
                  <span [class]="isDark ? 'text-sm font-semibold text-stone-300' : 'text-sm font-semibold text-stone-700'">{{ weightValue }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Speed -->
          <div class="relative">
            <button (click)="togglePopup('speed')"
              [class]="btnClass"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
              ⚡ Speed
              <span class="text-xs opacity-50">▾</span>
            </button>

            <div *ngIf="activePopup === 'speed'"
              [class]="popupClass"
              class="absolute top-full left-0 mt-2 w-64 rounded-2xl p-4 animate-slide-down z-50">
              <label [class]="isDark ? 'text-sm text-stone-300 font-medium' : 'text-sm text-stone-600 font-medium'">
                Animation Speed
              </label>
              <input type="range" [(ngModel)]="speed" (ngModelChange)="onSpeedChange($event)"
                [min]="1" [max]="200" [step]="1"
                class="w-full mt-2 accent-rose-500" />

              <div *ngIf="totalSteps > 0" class="mt-4">
                <label [class]="isDark ? 'text-sm text-stone-300 font-medium' : 'text-sm text-stone-600 font-medium'">
                  Step: {{ currentStep }} / {{ totalSteps }}
                </label>
                <input type="range" [ngModel]="currentStep" (ngModelChange)="onJumpToStep($event)"
                  [min]="0" [max]="totalSteps" class="w-full mt-2 accent-rose-500" />
              </div>
            </div>
          </div>

          <!-- Settings -->
          <div class="relative">
            <button (click)="togglePopup('settings')"
              [class]="btnClass"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
              ⚙ Settings
              <span class="text-xs opacity-50">▾</span>
            </button>

            <div *ngIf="activePopup === 'settings'"
              [class]="popupClass"
              class="absolute top-full left-0 mt-2 w-64 rounded-2xl p-4 animate-slide-down z-50">
              <label [class]="isDark ? 'text-sm text-stone-300 font-medium block mb-2' : 'text-sm text-stone-600 font-medium block mb-2'">
                Heuristic
              </label>
              <select [(ngModel)]="selectedHeuristic" [disabled]="!needsHeuristic()"
                [class]="isDark
                  ? 'w-full bg-stone-800 border border-stone-700 rounded-xl px-3 py-2.5 text-stone-200 text-sm disabled:opacity-30 outline-none'
                  : 'w-full bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 text-stone-700 text-sm disabled:opacity-30 outline-none'">
                <option *ngFor="let h of heuristics" [value]="h.value">{{ h.label }}</option>
              </select>

              <label [class]="isDark ? 'text-sm text-stone-300 font-medium block mb-2 mt-4' : 'text-sm text-stone-600 font-medium block mb-2 mt-4'">
                Neighbors
              </label>
              <div class="flex gap-2">
                <button (click)="neighborMode = 4"
                  [class]="neighborMode === 4
                    ? 'flex-1 px-3 py-2 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-400 transition-all'
                    : isDark
                      ? 'flex-1 px-3 py-2 rounded-xl text-sm text-stone-400 hover:bg-stone-800 transition-all'
                      : 'flex-1 px-3 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-100 transition-all'"
                >4 directions</button>
                <button (click)="neighborMode = 8"
                  [class]="neighborMode === 8
                    ? 'flex-1 px-3 py-2 rounded-xl text-sm font-semibold bg-rose-500/20 text-rose-400 transition-all'
                    : isDark
                      ? 'flex-1 px-3 py-2 rounded-xl text-sm text-stone-400 hover:bg-stone-800 transition-all'
                      : 'flex-1 px-3 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-100 transition-all'"
                >8 directions</button>
              </div>

              <div *ngIf="isSwarmFamily()" class="mt-4">
                <label [class]="isDark ? 'text-sm text-stone-300 font-medium' : 'text-sm text-stone-600 font-medium'">
                  Weight: {{ swarmWeight }}
                </label>
                <input type="range" [(ngModel)]="swarmWeight" [min]="1.1" [max]="10" [step]="0.1"
                  class="w-full mt-2 accent-rose-500" />
              </div>
            </div>
          </div>
        </div>

        <!-- RIGHT GROUP -->
        <div class="flex items-center gap-3">

          <!-- Generators -->
          <div class="relative">
            <button (click)="togglePopup('generators')"
              [class]="btnClass"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all">
              🗺 Maps
              <span class="text-xs opacity-50">▾</span>
            </button>

            <div *ngIf="activePopup === 'generators'"
              [class]="popupClass"
              class="absolute top-full right-0 mt-2 w-72 rounded-2xl p-2 animate-slide-down z-50">
              <button *ngFor="let gen of generators"
                (click)="applyGenerator(gen.type)"
                [class]="isDark
                  ? 'w-full text-left px-4 py-2.5 rounded-xl text-sm text-stone-300 hover:bg-stone-800 transition-all'
                  : 'w-full text-left px-4 py-2.5 rounded-xl text-sm text-stone-600 hover:bg-stone-50 transition-all'">
                {{ gen.name }}
              </button>
              <div class="px-4 pt-3 mt-2 border-t flex items-center gap-3"
                [class]="isDark ? 'border-stone-700' : 'border-stone-200'">
                <span [class]="isDark ? 'text-xs text-stone-500' : 'text-xs text-stone-400'">Density</span>
                <input type="range" [(ngModel)]="genDensity" [min]="10" [max]="50" class="flex-1 accent-rose-500" />
                <span [class]="isDark ? 'text-xs font-semibold text-stone-400' : 'text-xs font-semibold text-stone-600'">{{ genDensity }}%</span>
              </div>
            </div>
          </div>

          <!-- AI -->
          <div class="relative">
            <button (click)="togglePopup('ai')"
              class="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-violet-500/10 to-purple-500/10 text-violet-400 hover:from-violet-500/20 hover:to-purple-500/20 border border-violet-500/20 transition-all">
              ✦ AI
              <span class="text-xs opacity-50">▾</span>
            </button>

            <div *ngIf="activePopup === 'ai'"
              [class]="popupClass"
              class="absolute top-full right-0 mt-2 w-96 rounded-2xl p-4 animate-slide-down z-50">
              <div class="flex gap-2 mb-4">
                <button *ngFor="let tab of aiTabs"
                  (click)="activeAiTab = tab.id"
                  [class]="activeAiTab === tab.id
                    ? 'px-4 py-2 rounded-xl text-sm font-semibold bg-violet-500/15 text-violet-400 transition-all'
                    : isDark
                      ? 'px-4 py-2 rounded-xl text-sm text-stone-400 hover:bg-stone-800 transition-all'
                      : 'px-4 py-2 rounded-xl text-sm text-stone-500 hover:bg-stone-100 transition-all'"
                >{{ tab.label }} {{ tab.name }}</button>
              </div>

              <div *ngIf="activeAiTab === 'tutor'">
                <button (click)="runTutor()" [disabled]="loadingAi"
                  class="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
                  {{ loadingAi ? 'Analyzing...' : '🎓 Analyze Steps' }}
                </button>
              </div>

              <div *ngIf="activeAiTab === 'generate'">
                <textarea [(ngModel)]="aiPrompt" rows="2" placeholder="e.g. maze where A* struggles..."
                  [class]="isDark
                    ? 'w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-3 text-stone-200 text-sm resize-none outline-none focus:border-violet-500'
                    : 'w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-700 text-sm resize-none outline-none focus:border-violet-400'">
                </textarea>
                <button (click)="runGenerate()" [disabled]="loadingAi || !aiPrompt.trim()"
                  class="w-full mt-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
                  {{ loadingAi ? 'Generating...' : '✨ Generate Map' }}
                </button>
              </div>

              <div *ngIf="activeAiTab === 'recommend'">
                <button (click)="runRecommend()" [disabled]="loadingAi"
                  class="w-full bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
                  {{ loadingAi ? 'Analyzing...' : '🏆 Recommend Algorithm' }}
                </button>
                <div *ngIf="recommendation" class="mt-3 animate-fade-in">
                  <div [class]="isDark ? 'bg-stone-800 rounded-xl p-3 mb-2' : 'bg-stone-50 rounded-xl p-3 mb-2'">
                    <span class="text-emerald-400 font-semibold text-sm">Best:</span>
                    <span [class]="isDark ? 'text-stone-200 ml-2 text-sm' : 'text-stone-700 ml-2 text-sm'">{{ recommendation.best.algorithm }}</span>
                  </div>
                  <div [class]="isDark ? 'bg-stone-800 rounded-xl p-3' : 'bg-stone-50 rounded-xl p-3'">
                    <span class="text-rose-400 font-semibold text-sm">Worst:</span>
                    <span [class]="isDark ? 'text-stone-200 ml-2 text-sm' : 'text-stone-700 ml-2 text-sm'">{{ recommendation.worst.algorithm }}</span>
                  </div>
                </div>
              </div>

              <p *ngIf="aiError" class="text-sm text-rose-400 mt-3">{{ aiError }}</p>
            </div>
          </div>

          <!-- Divider -->
          <div [class]="isDark ? 'w-px h-8 bg-stone-800' : 'w-px h-8 bg-stone-200'"></div>

          <!-- Metrics inline -->
          <div *ngIf="metrics" class="flex items-center gap-4 animate-fade-in">
            <div class="text-center">
              <div [class]="isDark ? 'text-sm font-semibold text-stone-200' : 'text-sm font-semibold text-stone-800'">{{ metrics.expandedCount }}</div>
              <div [class]="isDark ? 'text-[10px] text-stone-500' : 'text-[10px] text-stone-400'">nodes</div>
            </div>
            <div class="text-center">
              <div [class]="isDark ? 'text-sm font-semibold text-stone-200' : 'text-sm font-semibold text-stone-800'">{{ metrics.cost === Infinity ? '—' : (metrics.cost | number:'1.1-1') }}</div>
              <div [class]="isDark ? 'text-[10px] text-stone-500' : 'text-[10px] text-stone-400'">cost</div>
            </div>
            <div [class]="metrics.path ? 'text-emerald-400' : 'text-rose-400'" class="text-lg">
              {{ metrics.path ? '●' : '○' }}
            </div>
            <button (click)="onExportJSON()"
              [class]="isDark ? 'text-xs text-stone-500 hover:text-stone-300 px-2 py-1 rounded-lg hover:bg-stone-800 transition-all' : 'text-xs text-stone-400 hover:text-stone-600 px-2 py-1 rounded-lg hover:bg-stone-100 transition-all'">
              Export ↓
            </button>
          </div>

          <!-- Actions -->
          <button (click)="onReset()"
            [class]="isDark ? 'text-sm text-stone-500 hover:text-stone-300 px-3 py-2 rounded-xl hover:bg-stone-800 transition-all' : 'text-sm text-stone-400 hover:text-stone-700 px-3 py-2 rounded-xl hover:bg-stone-100 transition-all'">
            ↺ Reset
          </button>
          <button (click)="onClearGrid()"
            [class]="isDark ? 'text-sm text-stone-500 hover:text-rose-400 px-3 py-2 rounded-xl hover:bg-stone-800 transition-all' : 'text-sm text-stone-400 hover:text-rose-500 px-3 py-2 rounded-xl hover:bg-stone-100 transition-all'">
            ✕ Clear
          </button>
        </div>
      </div>
    </div>

    <!-- Click outside to close popup -->
    <div *ngIf="activePopup" class="fixed inset-0 z-10" (click)="activePopup = null"></div>
  `,
})
export class ToolbarComponent implements OnDestroy {
  isDark = true;
  activePopup: PopupType = null;
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

  // AI
  activeAiTab: 'tutor' | 'generate' | 'recommend' = 'generate';
  aiPrompt = '';
  loadingAi = false;
  aiError = '';
  recommendation: any = null;

  // Generators
  genDensity = 30;
  genSeed = Math.floor(Math.random() * 1000000);

  private subs: Subscription[] = [];

  algorithms = [
    { value: AlgorithmType.BFS, label: 'BFS' },
    { value: AlgorithmType.DFS, label: 'DFS' },
    { value: AlgorithmType.DIJKSTRA, label: 'Dijkstra' },
    { value: AlgorithmType.A_STAR, label: 'A*' },
    { value: AlgorithmType.GREEDY, label: 'Greedy' },
    { value: AlgorithmType.SWARM, label: 'Swarm' },
    { value: AlgorithmType.CONVERGENT_SWARM, label: 'Conv. Swarm' },
    { value: AlgorithmType.ZERO_ONE_BFS, label: '0-1 BFS' },
  ];

  heuristics = [
    { value: HeuristicType.MANHATTAN, label: 'Manhattan' },
    { value: HeuristicType.EUCLIDEAN, label: 'Euclidean' },
    { value: HeuristicType.CHEBYSHEV, label: 'Chebyshev' },
    { value: HeuristicType.OCTILE, label: 'Octile' },
  ];

  toolsList = [
    { value: EditorTool.WALL, icon: '▦', label: 'Wall' },
    { value: EditorTool.WEIGHT, icon: '◆', label: 'Weight' },
    { value: EditorTool.START, icon: '▶', label: 'Start' },
    { value: EditorTool.GOAL, icon: '★', label: 'Goal' },
    { value: EditorTool.ERASE, icon: '◌', label: 'Erase' },
  ];

  generators = Object.entries(GENERATOR_INFO).map(([type, info]) => ({
    type: type as GeneratorType,
    name: info.name,
  }));

  aiTabs = [
    { id: 'generate' as const, label: '✨', name: 'Generate' },
    { id: 'tutor' as const, label: '🎓', name: 'Tutor' },
    { id: 'recommend' as const, label: '🏆', name: 'Recommend' },
  ];

  get btnClass(): string {
    return this.isDark
      ? 'text-[#D3C3B0] hover:text-[#EDE0D0] hover:bg-[#4A3D32] border border-[#554536] hover:border-[#655642] disabled:opacity-30 disabled:hover:bg-transparent'
      : 'text-[#6E5A4D] hover:text-[#2F241D] hover:bg-[#EDE4D8] border border-[#D7CABC] hover:border-[#C4B5A5] disabled:opacity-30 disabled:hover:bg-transparent';
  }

  get activeBtnClass(): string {
    return this.isDark
      ? 'bg-[#6E473B]/20 text-[#A78D78] border border-[#6E473B]/30'
      : 'bg-[#6E473B]/10 text-[#6E473B] border border-[#6E473B]/20';
  }

  get algoButtonClass(): string {
    return this.activePopup === 'algorithm'
      ? 'bg-rose-500/15 text-rose-400'
      : this.isDark
        ? 'text-stone-300 hover:bg-stone-800'
        : 'text-stone-600 hover:bg-stone-100';
  }

  get popupClass(): string {
    return this.isDark
      ? 'bg-[#3D3128] border border-[#554536] shadow-2xl shadow-black/30'
      : 'bg-[#FFF9F2] border border-[#D7CABC] shadow-2xl shadow-[#D7CABC]/30';
  }

  constructor(
    private gridService: GridService,
    private vizService: VisualizationService,
    private themeService: ThemeService,
    private exportService: ExportService,
    private aiService: AIService,
    public i18n: TranslationService,
  ) {
    this.subs.push(
      this.vizService.state$.subscribe(s => this.vizState = s),
      this.vizService.stepIndex$.subscribe(i => this.currentStep = i),
      this.vizService.totalSteps$.subscribe(t => this.totalSteps = t),
      this.vizService.metrics$.subscribe(m => this.metrics = m),
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
      this.i18n.lang$.subscribe(() => {
        this.toolsList = [
          { value: EditorTool.WALL, icon: '▦', label: this.i18n.t('tool.wall').replace(/[^\w\s]/g, '').trim() },
          { value: EditorTool.WEIGHT, icon: '◆', label: this.i18n.t('tool.weight').replace(/[^\w\s]/g, '').trim() },
          { value: EditorTool.START, icon: '▶', label: this.i18n.t('tool.start').replace(/[^\w\s]/g, '').trim() },
          { value: EditorTool.GOAL, icon: '★', label: this.i18n.t('tool.goal').replace(/[^\w\s]/g, '').trim() },
          { value: EditorTool.ERASE, icon: '◌', label: this.i18n.t('tool.erase').replace(/[^\w\s]/g, '').trim() },
        ];
      }),
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  @HostListener('document:keydown.escape')
  onEscape(): void { this.activePopup = null; }

  togglePopup(popup: PopupType): void {
    this.activePopup = this.activePopup === popup ? null : popup;
  }

  getAlgoShortName(): string {
    const algo = this.algorithms.find(a => a.value === this.selectedAlgorithm);
    return algo?.label ?? 'A*';
  }

  getActiveToolIcon(): string {
    const tool = this.toolsList.find(t => t.value === this.activeTool);
    return tool?.icon ?? '▦';
  }

  getActiveToolLabel(): string {
    const tool = this.toolsList.find(t => t.value === this.activeTool);
    return tool?.label ?? 'Wall';
  }

  selectAlgorithm(algo: AlgorithmType): void {
    this.selectedAlgorithm = algo;
    this.activePopup = null;
  }

  selectTool(tool: EditorTool): void {
    this.activeTool = tool;
    if (tool !== EditorTool.WEIGHT) this.activePopup = null;
  }

  needsHeuristic(): boolean {
    return ![AlgorithmType.BFS, AlgorithmType.DFS, AlgorithmType.DIJKSTRA, AlgorithmType.ZERO_ONE_BFS]
      .includes(this.selectedAlgorithm);
  }

  isSwarmFamily(): boolean {
    return [AlgorithmType.SWARM, AlgorithmType.CONVERGENT_SWARM].includes(this.selectedAlgorithm);
  }

  onSpeedChange(value: number): void { this.vizService.setSpeed(value); }

  private getOptions(): AlgorithmOptions {
    return {
      algorithm: this.selectedAlgorithm, heuristic: this.selectedHeuristic,
      neighborMode: this.neighborMode, swarmWeight: this.swarmWeight,
    };
  }

  onVisualize(): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;
    if (this.vizState === VisualizationState.IDLE || this.vizState === VisualizationState.FINISHED) {
      this.vizService.prepare(grid, grid.start, grid.goal, this.getOptions());
    }
    this.vizService.play();
    this.activePopup = null;
  }

  onPause(): void { this.vizService.pause(); }

  onStep(): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;
    if (this.vizState === VisualizationState.IDLE) {
      this.vizService.prepare(grid, grid.start, grid.goal, this.getOptions());
    }
    this.vizService.stepForward();
  }

  onSkipToEnd(): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;
    if (this.vizState === VisualizationState.IDLE) {
      this.vizService.prepare(grid, grid.start, grid.goal, this.getOptions());
    }
    this.vizService.skipToEnd();
  }

  onReset(): void { this.vizService.reset(); }
  onClearGrid(): void { this.vizService.reset(); this.gridService.clearGrid(); }
  onJumpToStep(step: number): void { this.vizService.jumpToStep(step); }

  applyGenerator(type: GeneratorType): void {
    this.vizService.reset();
    const grid = generateMap(type, 25, 50, { density: this.genDensity, seed: this.genSeed });
    this.gridService.createGrid(grid.rows, grid.cols);
    const current = this.gridService.getGrid()!;
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        current.cells[r][c] = grid.cells[r][c];
      }
    }
    current.start = grid.start;
    current.goal = grid.goal;
    this.gridService['grid$'].next(current);
    this.activePopup = null;
  }

  // AI methods
  runTutor(): void {
    const grid = this.gridService.getGrid();
    const metrics = this.vizService.metrics$.value;
    if (!grid || !metrics) { this.aiError = 'Run visualization first'; return; }
    this.loadingAi = true; this.aiError = '';
    this.aiService.getKeyMoments(this.selectedAlgorithm, grid, metrics, []).subscribe({
      next: () => { this.loadingAi = false; },
      error: () => { this.aiError = 'AI unavailable'; this.loadingAi = false; },
    });
  }

  runGenerate(): void {
    if (!this.aiPrompt.trim()) return;
    this.loadingAi = true; this.aiError = '';
    this.aiService.generateMap(this.aiPrompt).subscribe({
      next: (data) => { this.applyAIMap(data); this.loadingAi = false; this.activePopup = null; },
      error: () => { this.aiError = 'AI unavailable'; this.loadingAi = false; },
    });
  }

  runRecommend(): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;
    this.loadingAi = true; this.aiError = '';
    this.aiService.getRecommendation(grid).subscribe({
      next: (res) => { this.recommendation = res; this.loadingAi = false; },
      error: () => { this.aiError = 'AI unavailable'; this.loadingAi = false; },
    });
  }

  private applyAIMap(data: any): void {
    this.vizService.reset();
    const rows = data.rows || 25; const cols = data.cols || 50;
    this.gridService.createGrid(rows, cols);
    const grid = this.gridService.getGrid()!;
    if (data.walls) {
      for (const [r, c] of data.walls) {
        if (r >= 0 && r < rows && c >= 0 && c < cols &&
          grid.cells[r][c].type !== CellType.START && grid.cells[r][c].type !== CellType.GOAL) {
          grid.cells[r][c].type = CellType.WALL;
        }
      }
    }
    if (data.weights) {
      for (const w of data.weights) {
        const [r, c] = w.pos;
        if (r >= 0 && r < rows && c >= 0 && c < cols && grid.cells[r][c].type === CellType.EMPTY) {
          grid.cells[r][c].type = CellType.WEIGHT; grid.cells[r][c].weight = w.weight;
        }
      }
    }
    this.gridService['grid$'].next(grid);
  }

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
}
