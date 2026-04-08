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
import { AlgorithmType, HeuristicType, NeighborMode, AlgorithmOptions } from '@shared/types';

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
    <!-- ═══ COMPARE CONTROLS BAR ═══ -->
    <div
      [style.background]="
        isDark
          ? 'linear-gradient(180deg, #3D3128 0%, #352A21 100%)'
          : 'linear-gradient(180deg, #FFF9F2 0%, #F5EFE7 100%)'
      "
      [style.border-bottom]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
      [style.box-shadow]="
        isDark
          ? '0 6px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)'
          : '0 4px 24px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)'
      "
      style="padding: 14px 48px; position: relative; z-index: 20;"
    >
      <div class="flex items-center justify-center gap-6 mx-auto flex-wrap">
        <!-- Algorithm chips -->
        <div
          class="flex items-center gap-2 flex-wrap"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          style="padding: 6px 12px; border-radius: 16px;"
          data-help="compare-sidebar"
        >
          @for (algo of allAlgorithms; track algo; let i = $index) {
            <button
              (click)="toggleAlgorithm(algo.value)"
              [style.background]="
                selectedAlgorithms.has(algo.value) ? getAlgoColor(i) : 'transparent'
              "
              [style.color]="
                selectedAlgorithms.has(algo.value) ? 'white' : isDark ? '#8B7A6B' : '#A89888'
              "
              [style.border]="
                selectedAlgorithms.has(algo.value)
                  ? '1px solid transparent'
                  : isDark
                    ? '1px solid #4A3D32'
                    : '1px solid #D7CABC'
              "
              [style.font-weight]="selectedAlgorithms.has(algo.value) ? '600' : '400'"
              [style.opacity]="selectedAlgorithms.has(algo.value) ? '1' : '0.7'"
              style="padding: 8px 16px; border-radius: 10px; font-size: 12px; cursor: pointer; transition: all 0.2s;"
              class="hover:opacity-100"
            >
              {{ algo.label }}
            </button>
          }
          <button
            (click)="selectAll()"
            [style.color]="isDark ? '#8B7A6B' : '#A89888'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            style="padding: 8px 14px; border-radius: 10px; font-size: 11px; cursor: pointer; transition: all 0.2s; background: transparent; text-transform: uppercase; letter-spacing: 0.06em;"
            class="hover:opacity-70"
          >
            {{ i18n.t('compare.selectAll') }}
          </button>
          <button
            (click)="deselectAll()"
            [style.color]="isDark ? '#8B7A6B' : '#A89888'"
            style="padding: 8px 10px; border-radius: 10px; font-size: 11px; cursor: pointer; transition: all 0.2s; background: transparent; border: none; opacity: 0.5;"
            class="hover:opacity-100"
          >
            ✕
          </button>
        </div>

        <!-- Settings group -->
        <div
          class="flex items-center gap-2"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          style="padding: 6px 12px; border-radius: 16px;"
          data-help="compare-settings"
        >
          <select
            [(ngModel)]="heuristic"
            [style.background-color]="isDark ? '#3D3128' : '#F5EFE7'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
            style="border-radius: 10px; padding: 8px 14px; font-size: 12px; outline: none; cursor: pointer;"
          >
            <option value="manhattan">Manhattan</option>
            <option value="euclidean">Euclidean</option>
            <option value="chebyshev">Chebyshev</option>
            <option value="octile">Octile</option>
          </select>

          <button
            (click)="neighborMode = 4"
            [style.background]="
              neighborMode === 4
                ? isDark
                  ? 'rgba(110,71,59,0.2)'
                  : 'rgba(110,71,59,0.1)'
                : 'transparent'
            "
            [style.color]="neighborMode === 4 ? '#8B5E50' : isDark ? '#8B7A6B' : '#A89888'"
            [style.border]="
              neighborMode === 4
                ? '1px solid rgba(110,71,59,0.3)'
                : isDark
                  ? '1px solid #4A3D32'
                  : '1px solid #D7CABC'
            "
            [style.font-weight]="neighborMode === 4 ? '600' : '400'"
            style="padding: 8px 14px; border-radius: 10px; font-size: 12px; cursor: pointer; transition: all 0.2s;"
          >
            4
          </button>
          <button
            (click)="neighborMode = 8"
            [style.background]="
              neighborMode === 8
                ? isDark
                  ? 'rgba(110,71,59,0.2)'
                  : 'rgba(110,71,59,0.1)'
                : 'transparent'
            "
            [style.color]="neighborMode === 8 ? '#8B5E50' : isDark ? '#8B7A6B' : '#A89888'"
            [style.border]="
              neighborMode === 8
                ? '1px solid rgba(110,71,59,0.3)'
                : isDark
                  ? '1px solid #4A3D32'
                  : '1px solid #D7CABC'
            "
            [style.font-weight]="neighborMode === 8 ? '600' : '400'"
            style="padding: 8px 14px; border-radius: 10px; font-size: 12px; cursor: pointer; transition: all 0.2s;"
          >
            8
          </button>
        </div>

        <!-- Run button -->
        <button
          (click)="runCompare()"
          data-help="compare-run"
          [disabled]="selectedAlgorithms.size === 0 || isRunning"
          class="text-white transition-all duration-200 disabled:opacity-30 hover:scale-[1.04] active:scale-[0.97] cursor-pointer"
          style="padding: 10px 28px; border-radius: 14px; font-size: 13px; font-weight: 600; background: linear-gradient(135deg, #6E473B, #8B5E50); box-shadow: 0 4px 16px rgba(110,71,59,0.3), inset 0 1px 0 rgba(255,255,255,0.1); border: none;"
        >
          {{ isRunning ? i18n.t('compare.running') : i18n.t('compare.run') }}
        </button>
      </div>
    </div>

    <!-- ═══ GRID (centered) ═══ -->
    <div
      style="display: flex; align-items: start; justify-content: center; padding: 24px 48px;"
      [style.min-height]="results.length > 0 ? 'auto' : 'calc(100vh - 200px)'"
    >
      <app-grid></app-grid>
    </div>

    <!-- ═══ RESULTS TABLE ═══ -->
    @if (results.length > 0) {
      <div style="padding: 0 48px 40px;">
        <div
          [style.background]="isDark ? '#3D3128' : '#FFFCF8'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          [style.box-shadow]="
            isDark
              ? '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'
              : '0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)'
          "
          style="border-radius: 20px; overflow: hidden;"
        >
          <!-- Table header -->
          <div
            [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.3)'"
            [style.border-bottom]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            class="grid"
            style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 80px; padding: 14px 24px; gap: 8px;"
          >
            <div
              [style.color]="isDark ? '#8B7A6B' : '#A89888'"
              style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;"
            >
              {{ i18n.t('compare.algorithm') }}
            </div>
            <div
              [style.color]="isDark ? '#8B7A6B' : '#A89888'"
              style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; text-align: right;"
            >
              {{ i18n.t('compare.expanded') }}
            </div>
            <div
              [style.color]="isDark ? '#8B7A6B' : '#A89888'"
              style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; text-align: right;"
            >
              {{ i18n.t('compare.maxFrontier') }}
            </div>
            <div
              [style.color]="isDark ? '#8B7A6B' : '#A89888'"
              style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; text-align: right;"
            >
              {{ i18n.t('compare.pathCost') }}
            </div>
            <div
              [style.color]="isDark ? '#8B7A6B' : '#A89888'"
              style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; text-align: right;"
            >
              {{ i18n.t('compare.pathLength') }}
            </div>
            <div
              [style.color]="isDark ? '#8B7A6B' : '#A89888'"
              style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; text-align: right;"
            >
              {{ i18n.t('compare.time') }}
            </div>
            <div
              [style.color]="isDark ? '#8B7A6B' : '#A89888'"
              style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; text-align: center;"
            >
              {{ i18n.t('compare.path') }}
            </div>
          </div>
          <!-- Table rows -->
          @for (r of results; track r; let i = $index) {
            <div
              class="grid transition-all duration-150"
              [style.border-bottom]="
                i < results.length - 1
                  ? isDark
                    ? '1px solid rgba(74,61,50,0.4)'
                    : '1px solid rgba(215,202,188,0.5)'
                  : 'none'
              "
              style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 1fr 80px; padding: 14px 24px; gap: 8px; cursor: default;"
              [class]="
                isDark ? 'hover:bg-[rgba(74,61,50,0.3)]' : 'hover:bg-[rgba(237,228,216,0.4)]'
              "
            >
              <!-- Algorithm name with color dot -->
              <div style="display: flex; align-items: center; gap: 10px;">
                <span
                  style="width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;"
                  [style.background-color]="getAlgoColor(i)"
                ></span>
                <span
                  [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
                  style="font-size: 13px; font-weight: 600;"
                  >{{ r.name }}</span
                >
              </div>
              <!-- Expanded -->
              <div
                style="text-align: right; font-size: 13px; font-variant-numeric: tabular-nums;"
                [style.color]="
                  r.expandedCount === bestExpanded ? '#22C55E' : isDark ? '#A99888' : '#8B7A6B'
                "
                [style.font-weight]="r.expandedCount === bestExpanded ? '700' : '400'"
              >
                {{ r.expandedCount }}
              </div>
              <!-- Max Frontier -->
              <div
                style="text-align: right; font-size: 13px; font-variant-numeric: tabular-nums;"
                [style.color]="isDark ? '#A99888' : '#8B7A6B'"
              >
                {{ r.maxFrontierSize }}
              </div>
              <!-- Path Cost -->
              <div
                style="text-align: right; font-size: 13px; font-variant-numeric: tabular-nums;"
                [style.color]="
                  r.foundPath && r.pathCost === bestCost
                    ? '#22C55E'
                    : isDark
                      ? '#A99888'
                      : '#8B7A6B'
                "
                [style.font-weight]="r.foundPath && r.pathCost === bestCost ? '700' : '400'"
              >
                {{ r.foundPath ? (r.pathCost | number: '1.1-1') : '—' }}
              </div>
              <!-- Path Length -->
              <div
                style="text-align: right; font-size: 13px; font-variant-numeric: tabular-nums;"
                [style.color]="isDark ? '#A99888' : '#8B7A6B'"
              >
                {{ r.pathLength ?? '—' }}
              </div>
              <!-- Time -->
              <div
                style="text-align: right; font-size: 13px; font-variant-numeric: tabular-nums;"
                [style.color]="
                  r.executionTimeMs === bestTime ? '#22C55E' : isDark ? '#A99888' : '#8B7A6B'
                "
                [style.font-weight]="r.executionTimeMs === bestTime ? '700' : '400'"
              >
                {{ r.executionTimeMs | number: '1.2-2' }}
              </div>
              <!-- Found path indicator -->
              <div style="text-align: center; font-size: 14px;">
                <span [style.color]="r.foundPath ? '#22C55E' : '#F43F5E'">{{
                  r.foundPath ? '●' : '○'
                }}</span>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ComparePageComponent implements OnInit, OnDestroy {
  isDark = true;
  private subs: Subscription[] = [];

  selectedAlgorithms = new Set<AlgorithmType>([
    AlgorithmType.BFS,
    AlgorithmType.DIJKSTRA,
    AlgorithmType.A_STAR,
    AlgorithmType.GREEDY,
  ]);
  heuristic: HeuristicType = HeuristicType.MANHATTAN;
  neighborMode: NeighborMode = NeighborMode.FOUR;
  isRunning = false;
  showSettingsHint = false;
  results: CompareResult[] = [];

  bestExpanded = 0;
  bestCost = 0;
  bestTime = 0;

  private algoColorsDark = [
    '#8B5E50',
    '#A78D78',
    '#6E473B',
    '#C4A882',
    '#7A6558',
    '#B09880',
    '#5D4A3E',
    '#9C8470',
  ];
  private algoColorsLight = [
    '#6E473B',
    '#8B7060',
    '#4A3428',
    '#A08060',
    '#5D4A3E',
    '#9C8470',
    '#3D2E24',
    '#B09880',
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
    this.subs.push(this.themeService.theme$.subscribe((t) => (this.isDark = t === 'dark')));
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
  }

  toggleAlgorithm(algo: AlgorithmType): void {
    if (this.selectedAlgorithms.has(algo)) {
      this.selectedAlgorithms.delete(algo);
    } else {
      this.selectedAlgorithms.add(algo);
    }
  }

  selectAll(): void {
    this.allAlgorithms.forEach((a) => this.selectedAlgorithms.add(a.value));
  }

  deselectAll(): void {
    this.selectedAlgorithms.clear();
  }

  getAlgoColor(index: number): string {
    const colors = this.isDark ? this.algoColorsDark : this.algoColorsLight;
    return colors[index % colors.length];
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
          swarmWeight:
            algo === AlgorithmType.SWARM
              ? 2
              : algo === AlgorithmType.CONVERGENT_SWARM
                ? 5
                : undefined,
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
      const withPath = this.results.filter((r) => r.foundPath);
      this.bestExpanded = withPath.length ? Math.min(...withPath.map((r) => r.expandedCount)) : 0;
      this.bestCost = withPath.length ? Math.min(...withPath.map((r) => r.pathCost)) : 0;
      this.bestTime = this.results.length
        ? Math.min(...this.results.map((r) => r.executionTimeMs))
        : 0;

      this.isRunning = false;
    }, 10);
  }
}
