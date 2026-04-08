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
  AlgorithmType,
  HeuristicType,
  NeighborMode,
  AlgorithmOptions,
  Position,
  Grid,
  CellType,
  EventType,
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
    <!-- ═══ PLAYGROUND CONTROLS BAR ═══ -->
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
        <!-- Status group -->
        <div
          class="flex items-center gap-4"
          data-help="playground-sidebar"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          style="padding: 8px 20px; border-radius: 16px;"
        >
          <div class="text-center" style="min-width: 48px;">
            <div
              [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
              style="font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums;"
            >
              {{ userPath.length }}
            </div>
            <div
              [style.color]="isDark ? '#8B7A6B' : '#A89888'"
              style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 1px;"
            >
              {{ i18n.t('playground.cells') }}
            </div>
          </div>
          <div
            [style.background]="isDark ? '#4A3D32' : '#D7CABC'"
            style="width: 1px; height: 24px;"
          ></div>
          <div class="text-center" style="min-width: 48px;">
            <div
              [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
              style="font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums;"
            >
              {{ getUserPathCost() | number: '1.1-1' }}
            </div>
            <div
              [style.color]="isDark ? '#8B7A6B' : '#A89888'"
              style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 1px;"
            >
              {{ i18n.t('playground.cost') }}
            </div>
          </div>
        </div>

        <!-- Actions group -->
        <div
          class="flex items-center gap-2"
          data-help="playground-actions"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          style="padding: 6px 12px; border-radius: 16px;"
        >
          <button
            (click)="submitPath()"
            [disabled]="userPath.length < 2 || isSubmitted"
            class="text-white transition-all duration-200 disabled:opacity-30 hover:scale-[1.04] active:scale-[0.97] cursor-pointer"
            style="padding: 8px 22px; border-radius: 12px; font-size: 13px; font-weight: 600; background: linear-gradient(135deg, #6E473B, #8B5E50); box-shadow: 0 4px 16px rgba(110,71,59,0.3), inset 0 1px 0 rgba(255,255,255,0.1); border: none;"
          >
            {{ i18n.t('playground.submit') }}
          </button>

          <button
            (click)="declareNoPath()"
            [disabled]="isSubmitted"
            [style.color]="isDark ? '#F43F5E' : '#E11D48'"
            [style.background]="isDark ? 'rgba(244,63,94,0.1)' : 'rgba(225,29,72,0.06)'"
            [style.border]="
              isDark ? '1px solid rgba(244,63,94,0.2)' : '1px solid rgba(225,29,72,0.15)'
            "
            style="padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; opacity: 0.8;"
            class="hover:opacity-100 disabled:opacity-30"
          >
            {{ i18n.t('playground.noPath') }}
          </button>

          <button
            (click)="undoLast()"
            [disabled]="userPath.length === 0 || isSubmitted"
            [style.color]="isDark ? '#8B7A6B' : '#A89888'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            style="padding: 8px 16px; border-radius: 12px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; background: transparent;"
            class="hover:opacity-70 disabled:opacity-30"
          >
            {{ i18n.t('playground.undo') }}
          </button>

          <button
            (click)="resetPlayground()"
            [style.color]="isDark ? '#8B7A6B' : '#A89888'"
            style="padding: 8px 12px; border-radius: 12px; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s; background: transparent; border: none;"
            class="hover:opacity-70"
          >
            {{ i18n.t('playground.resetBtn') }}
          </button>
        </div>

        <!-- Instructions hint -->
        <div
          [style.color]="isDark ? '#8B7A6B' : '#A89888'"
          style="font-size: 11px; max-width: 240px; line-height: 1.4; text-align: center;">
          {{ i18n.t('playground.instructions') }} {{ i18n.t('playground.instructions2') }}
        </div>
      </div>
    </div>

    <!-- ═══ GRID (centered) ═══ -->
    <div
      style="display: flex; align-items: start; justify-content: center; padding: 24px 48px;"
      [style.min-height]="result ? 'auto' : 'calc(100vh - 200px)'"
    >
      <app-grid></app-grid>
    </div>

    <!-- ═══ RESULTS PANEL ═══ -->
    @if (result) {
      <div style="padding: 0 48px 40px;">
        <div
          [style.background]="isDark ? '#3D3128' : '#FFFCF8'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          [style.box-shadow]="
            isDark
              ? '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'
              : '0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)'
          "
          style="border-radius: 20px; padding: 32px; max-width: 600px; margin: 0 auto;"
        >
          <!-- Score -->
          <div style="text-align: center; margin-bottom: 28px;">
            <div
              [style.color]="
                result.score >= 80 ? '#22C55E' : result.score >= 50 ? '#F59E0B' : '#F43F5E'
              "
              style="font-size: 48px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums;"
            >
              {{ result.score }}
            </div>
            <div
              [style.color]="isDark ? '#8B7A6B' : '#A89888'"
              style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 6px; font-weight: 600;"
            >
              {{ i18n.t('playground.score') }} / 100
            </div>
          </div>
          <!-- Divider -->
          <div
            [style.background]="isDark ? '#4A3D32' : '#D7CABC'"
            style="height: 1px; margin-bottom: 24px;"
          ></div>
          <!-- Breakdown -->
          <div
            style="display: grid; grid-template-columns: 1fr auto; gap: 12px 24px; align-items: center;"
          >
            <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">{{
              i18n.t('playground.yourCost')
            }}</span>
            <span
              [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
              style="font-size: 14px; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums;"
            >
              {{ result.userCost | number: '1.1-1' }}
            </span>
            <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">{{
              i18n.t('playground.optimalCost')
            }}</span>
            <span
              [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
              style="font-size: 14px; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums;"
            >
              {{
                result.optimalCost !== null
                  ? (result.optimalCost | number: '1.1-1')
                  : i18n.t('playground.noPathExists')
              }}
            </span>
            <!-- Divider row -->
            <div
              [style.background]="isDark ? '#4A3D32' : '#D7CABC'"
              style="height: 1px; grid-column: 1 / -1; margin: 4px 0;"
            ></div>
            <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">{{
              i18n.t('playground.penaltyCost')
            }}</span>
            <span
              style="font-size: 14px; font-weight: 600; text-align: right; color: #F43F5E; font-variant-numeric: tabular-nums;"
            >
              -{{ result.breakdown.costPenalty | number: '1.0-0' }}
            </span>
            <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">{{
              i18n.t('playground.penaltyMoves')
            }}</span>
            <span
              style="font-size: 14px; font-weight: 600; text-align: right; color: #F43F5E; font-variant-numeric: tabular-nums;"
            >
              -{{ result.breakdown.invalidMovePenalty | number: '1.0-0' }}
            </span>
            <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">{{
              i18n.t('playground.speedBonus')
            }}</span>
            <span
              style="font-size: 14px; font-weight: 600; text-align: right; color: #22C55E; font-variant-numeric: tabular-nums;"
            >
              +{{ result.breakdown.speedBonus | number: '1.0-0' }}
            </span>
          </div>
        </div>
      </div>
    }
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
    this.subs.push(this.themeService.theme$.subscribe((t) => (this.isDark = t === 'dark')));
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
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
      const speedBonus = this.calcSpeedBonus();
      this.result = {
        userCost: 0,
        optimalCost: null,
        score: Math.min(100, 100 + speedBonus),
        breakdown: { costPenalty: 0, invalidMovePenalty: 0, speedBonus },
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
      this.renderer.applyEvents([
        {
          type: EventType.FOUND_PATH,
          path: optimal.path,
          totalCost: optimal.cost,
        },
      ]);
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
    const endsAtGoal =
      this.userPath.length > 0 && posEqual(this.userPath[this.userPath.length - 1], grid.goal);

    if (!startsAtStart || !endsAtGoal) {
      invalidMoves += 10;
    }

    let score = 100;
    const costPenalty = optimal.path
      ? Math.min(50, Math.round(((userCost - optimal.cost) / Math.max(optimal.cost, 1)) * 100))
      : 0;
    const invalidMovePenalty = Math.min(50, invalidMoves * 10);

    const speedBonus = this.calcSpeedBonus();
    score = Math.max(
      0,
      Math.min(100, score - Math.max(0, costPenalty) - invalidMovePenalty + speedBonus),
    );

    this.result = {
      userCost,
      optimalCost: optimal.path ? optimal.cost : null,
      score,
      breakdown: {
        costPenalty: Math.max(0, costPenalty),
        invalidMovePenalty,
        speedBonus,
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

  /**
   * Speed bonus: up to 10 points if solved within 30s, scaling linearly to 0 at 120s.
   */
  private calcSpeedBonus(): number {
    const elapsedMs = performance.now() - this.startTime;
    const elapsedSec = elapsedMs / 1000;
    if (elapsedSec <= 30) return 10;
    if (elapsedSec >= 120) return 0;
    return Math.round(10 * (1 - (elapsedSec - 30) / 90));
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
