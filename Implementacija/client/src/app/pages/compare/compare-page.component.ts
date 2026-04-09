import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GridService } from '../../services/grid.service';
import { GridRendererService } from '../../services/grid-renderer.service';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { ExportService } from '../../services/export.service';
import { AIService } from '../../services/ai.service';
import { GridComponent } from '../../components/grid/grid.component';
import { runAlgorithm, runAlgorithmFast, createAlgorithm, ALGORITHM_INFO } from '../../algorithms';
import { AlgorithmType, HeuristicType, NeighborMode, AlgorithmOptions, CellType, Position, EventType, PathfindingAlgorithm } from '@shared/types';
import { ALGO_COLORS } from '../../services/theme.service';

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
  path: Position[] | null;
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
                selectedAlgorithms.has(algo.value)
                  ? isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.1)'
                  : 'transparent'
              "
              [style.color]="
                selectedAlgorithms.has(algo.value) ? '#8B5E50' : isDark ? '#8B7A6B' : '#A89888'
              "
              [style.border]="
                selectedAlgorithms.has(algo.value)
                  ? '1px solid rgba(110,71,59,0.3)'
                  : isDark
                    ? '1px solid #4A3D32'
                    : '1px solid #D7CABC'
              "
              [style.font-weight]="selectedAlgorithms.has(algo.value) ? '600' : '400'"
              [style.opacity]="selectedAlgorithms.has(algo.value) ? '1' : '0.7'"
              style="padding: 8px 16px; border-radius: 12px; font-size: 14px; cursor: pointer; transition: all 0.2s;"
              class="hover:opacity-100"
            >
              {{ algo.label }}
            </button>
          }
          <button
            (click)="selectAll()"
            [style.color]="isDark ? '#8B7A6B' : '#A89888'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            style="padding: 8px 16px; border-radius: 12px; font-size: 13px; cursor: pointer; transition: all 0.2s; background: transparent; text-transform: uppercase; letter-spacing: 0.06em;"
            class="hover:opacity-70"
          >
            {{ i18n.t('compare.selectAll') }}
          </button>
          <button
            (click)="deselectAll()"
            [style.color]="isDark ? '#8B7A6B' : '#A89888'"
            style="padding: 8px 12px; border-radius: 12px; font-size: 13px; cursor: pointer; transition: all 0.2s; background: transparent; border: none; opacity: 0.5;"
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
            style="border-radius: 12px; padding: 8px 16px; font-size: 14px; outline: none; cursor: pointer;"
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
            style="padding: 8px 16px; border-radius: 12px; font-size: 14px; cursor: pointer; transition: all 0.2s;"
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
            style="padding: 8px 16px; border-radius: 12px; font-size: 14px; cursor: pointer; transition: all 0.2s;"
          >
            8
          </button>

          <!-- Swarm weight (always visible, disabled when no swarm algo selected) -->
            <div class="flex items-center gap-2" [style.opacity]="hasSwarmSelected ? '1' : '0.3'" [style.pointer-events]="hasSwarmSelected ? 'auto' : 'none'">
              <span
                [style.color]="isDark ? '#8B7A6B' : '#A89888'"
                style="font-size: 13px; white-space: nowrap;"
              >w:</span>
              <input
                type="range"
                [(ngModel)]="swarmWeight"
                min="1.5"
                max="10"
                step="0.5"
                style="width: 70px; accent-color: #8B5E50;"
              />
              <span
                [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
                style="font-size: 14px; font-weight: 600; min-width: 24px; text-align: center;"
              >{{ swarmWeight }}</span>
            </div>
        </div>

        <!-- Race controls -->
        <div
          class="flex items-center gap-2"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          style="padding: 6px 12px; border-radius: 16px;"
        >
          <button
            (click)="onRaceOrigin()"
            [disabled]="!raceFinished"
            [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            class="disabled:opacity-30 hover:scale-[1.04] transition-all cursor-pointer"
            style="padding: 8px 12px; border-radius: 12px; font-size: 14px; background: transparent;"
          >⏮</button>
          <button
            (click)="runCompare()"
            data-help="compare-run"
            [disabled]="selectedAlgorithms.size === 0 || isRunning"
            class="text-white transition-all duration-200 disabled:opacity-30 hover:scale-[1.04] active:scale-[0.97] cursor-pointer"
            style="padding: 10px 28px; border-radius: 14px; font-size: 14px; font-weight: 600; background: linear-gradient(135deg, #6E473B, #8B5E50); box-shadow: 0 4px 16px rgba(110,71,59,0.3), inset 0 1px 0 rgba(255,255,255,0.1); border: none;"
          >
            {{ isRunning ? i18n.t('compare.running') : i18n.t('compare.run') }}
          </button>
          <button
            (click)="onRaceEnd()"
            [disabled]="!isRunning"
            [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            class="disabled:opacity-30 hover:scale-[1.04] transition-all cursor-pointer"
            style="padding: 8px 12px; border-radius: 12px; font-size: 14px; background: transparent;"
          >⏭</button>
        </div>
      </div>
    </div>

    <!-- ═══ GRID (centered with sidebars) ═══ -->
    <div style="display: flex; justify-content: center; align-items: start; padding: 20px 24px;" [style.min-height]="results.length > 0 ? 'auto' : 'calc(100vh - 200px)'">
      <div style="display: grid; grid-template-columns: 120px auto 120px; gap: 70px; align-items: start;">

      <!-- ═══ LEFT: Algorithm Color Legend ═══ -->
      <div
        [style.background]="isDark
          ? 'linear-gradient(180deg, #3D3128 0%, #352A21 100%)'
          : 'linear-gradient(180deg, #FFF9F2 0%, #F5EFE7 100%)'"
        [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
        [style.box-shadow]="isDark
          ? '0 12px 80px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4), 0 0 0 1px #554536'
          : '0 12px 80px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.12), 0 0 0 1px #D7CABC'"
        [style.height.px]="gridHeight"
        style="border-radius: 20px; padding: 14px 14px; display: flex; flex-direction: column; justify-content: space-evenly; box-sizing: border-box; overflow: hidden;"
      >
        <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700; text-align: center;">
          {{ i18n.t('legend.title') }}
        </div>

        @for (algo of allAlgorithms; track algo.value) {
          <div
            (click)="raceFinished && selectedAlgorithms.has(algo.value) ? toggleAlgoVisibility(algo.value) : null"
            [style.opacity]="!raceFinished
              ? (selectedAlgorithms.has(algo.value) ? '1' : '0.35')
              : visibleAlgos.has(algo.value) ? '1' : selectedAlgorithms.has(algo.value) ? '0.3' : '0.15'"
            [style.cursor]="raceFinished && selectedAlgorithms.has(algo.value) ? 'pointer' : 'default'"
            [style.background]="selectedAlgorithms.has(algo.value) ? getAlgoTint(algo.value) : 'transparent'"
            style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; transition: all 0.2s ease;"
            onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"
          >
            <div [style.background]="ALGO_COLORS[algo.value]" [style.opacity]="selectedAlgorithms.has(algo.value) ? '1' : '0.3'" style="width: 10px; height: 10px; border-radius: 50%;"></div>
            <span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ algo.short }}</span>
          </div>
        }

        <div [style.background]="isDark ? '#4A3D32' : '#D7CABC'" style="height: 1px; opacity: 0.3;"></div>

        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(126,200,86,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.background]="isDark ? '#7EC856' : '#4A8C2A'" style="width: 10px; height: 10px; border-radius: 50%;"></div>
          <span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.start') }}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(232,116,97,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.background]="isDark ? '#E87461' : '#D05040'" style="width: 10px; height: 10px; border-radius: 50%;"></div>
          <span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.goal') }}</span>
        </div>
      </div>

      <!-- CENTER: Grid -->
      <div>
        <app-grid></app-grid>
      </div>

      <!-- ═══ RIGHT: Actions Panel ═══ -->
      <div
        [style.background]="isDark
          ? 'linear-gradient(180deg, #3D3128 0%, #352A21 100%)'
          : 'linear-gradient(180deg, #FFF9F2 0%, #F5EFE7 100%)'"
        [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
        [style.box-shadow]="isDark
          ? '0 12px 80px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4), 0 0 0 1px #554536'
          : '0 12px 80px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.12), 0 0 0 1px #D7CABC'"
        [style.height.px]="gridHeight"
        style="border-radius: 20px; padding: 14px 14px; display: flex; flex-direction: column; justify-content: space-evenly; box-sizing: border-box; position: relative;"
      >
        <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700; text-align: center;">
          {{ i18n.t('legend.metrics') }}
        </div>

        <!-- Stats -->
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em;">{{ selectedAlgorithms.size }}</div>
          <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">{{ i18n.t('compare.algos') }}</div>
        </div>
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.color]="bestExpanded ? '#22C55E' : (isDark ? '#EDE0D0' : '#4A3428')" style="font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em;">{{ bestExpanded || '—' }}</div>
          <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">{{ i18n.t('compare.bestNodes') }}</div>
        </div>
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em;">{{ bestCost ? (bestCost | number: '1.1-1') : '—' }}</div>
          <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">{{ i18n.t('compare.bestCost') }}</div>
        </div>

        <!-- Table button -->
        <button
          (click)="sidePanel = sidePanel === 'table' ? null : 'table'"
          [disabled]="!results.length"
          [style.background]="sidePanel === 'table'
            ? (isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.1)')
            : (isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)')"
          [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          [style.opacity]="!results.length ? '0.3' : '1'"
          style="padding: 12px 0; border-radius: 12px; width: 100%; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
          class="hover:scale-[1.03]"
          onmouseenter="this.style.transform='scale(1.03)'" onmouseleave="this.style.transform='scale(1)'"
        >
          📊 {{ i18n.t('compare.table') }}
        </button>

        <!-- AI Insight button -->
        <button
          (click)="onToggleInsightPanel()"
          [disabled]="!results.length"
          [style.opacity]="!results.length ? '0.3' : '1'"
          style="padding: 12px 0; border-radius: 12px; width: 100%; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.10)); color: #A78BFA;"
          class="hover:scale-[1.03]"
          onmouseenter="this.style.transform='scale(1.03)'" onmouseleave="this.style.transform='scale(1)'"
        >
          ✦ AI
        </button>

        <!-- Export -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button (click)="onExportCompare()" [disabled]="!results.length" [style.background]="isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.06)'" [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" [style.border]="isDark ? '1px solid rgba(74,61,50,0.5)' : '1px solid rgba(215,202,188,0.8)'" [style.opacity]="!results.length ? '0.3' : '1'" style="padding: 7px 0; border-radius: 10px; width: 100%; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s;">JSON ↓</button>
          <button (click)="onExportCompareCSV()" [disabled]="!results.length" [style.background]="isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.06)'" [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" [style.border]="isDark ? '1px solid rgba(74,61,50,0.5)' : '1px solid rgba(215,202,188,0.8)'" [style.opacity]="!results.length ? '0.3' : '1'" style="padding: 7px 0; border-radius: 10px; width: 100%; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s;">CSV ↓</button>
        </div>

        <!-- Left-opening popup: Table -->
        @if (sidePanel === 'table' && results.length) {
          <div
            [style.background]="isDark ? '#322820' : '#FFFCF8'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            [style.box-shadow]="isDark ? '0 12px 48px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3)' : '0 12px 48px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.04)'"
            style="position: absolute; right: calc(100% + 16px); top: 0; width: 560px; border-radius: 20px; padding: 20px; z-index: 50; max-height: 90vh; overflow-y: auto;"
          >
            <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; margin-bottom: 14px;">
              {{ i18n.t('compare.table') }}
            </div>
            <!-- Table header -->
            <div
              [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.3)'"
              [style.border-bottom]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
              class="grid" style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 80px; padding: 10px 16px; gap: 6px; border-radius: 12px 12px 0 0;"
            >
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600;">{{ i18n.t('compare.algorithm') }}</div>
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; text-align: right;">{{ i18n.t('compare.expanded') }}</div>
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; text-align: right;">{{ i18n.t('compare.pathCost') }}</div>
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; text-align: right;">{{ i18n.t('compare.pathLength') }}</div>
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; text-align: right;">{{ i18n.t('compare.time') }}</div>
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; text-align: center;">{{ i18n.t('compare.path') }}</div>
            </div>
            @for (r of results; track r; let i = $index) {
              <div
                class="grid transition-all duration-150"
                [style.border-bottom]="i < results.length - 1 ? (isDark ? '1px solid rgba(74,61,50,0.3)' : '1px solid rgba(215,202,188,0.4)') : 'none'"
                style="grid-template-columns: 2fr 1fr 1fr 1fr 1fr 80px; padding: 10px 16px; gap: 6px;"
              >
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;" [style.background-color]="ALGO_COLORS[r.algorithm]"></span>
                  <span [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 13px; font-weight: 600;">{{ r.name }}</span>
                </div>
                <div style="text-align: right; font-size: 13px; font-variant-numeric: tabular-nums;" [style.color]="r.expandedCount === bestExpanded && r.foundPath ? '#22C55E' : (isDark ? '#A99888' : '#8B7A6B')" [style.font-weight]="r.expandedCount === bestExpanded && r.foundPath ? '700' : '400'">{{ r.expandedCount }}</div>
                <div style="text-align: right; font-size: 13px; font-variant-numeric: tabular-nums;" [style.color]="r.foundPath && r.pathCost === bestCost ? '#22C55E' : (isDark ? '#A99888' : '#8B7A6B')" [style.font-weight]="r.foundPath && r.pathCost === bestCost ? '700' : '400'">{{ r.foundPath ? (r.pathCost | number: '1.1-1') : '—' }}</div>
                <div style="text-align: right; font-size: 13px; font-variant-numeric: tabular-nums;" [style.color]="isDark ? '#A99888' : '#8B7A6B'">{{ r.pathLength ?? '—' }}</div>
                <div style="text-align: right; font-size: 13px; font-variant-numeric: tabular-nums;" [style.color]="isDark ? '#A99888' : '#8B7A6B'">{{ r.executionTimeMs | number: '1.2-2' }}</div>
                <div style="text-align: center; font-size: 14px;"><span [style.color]="r.foundPath ? '#22C55E' : '#F43F5E'">{{ r.foundPath ? '●' : '○' }}</span></div>
              </div>
            }
          </div>
        }

        <!-- Left-opening popup: AI Insight -->
        @if (sidePanel === 'insight') {
          <div
            [style.background]="isDark ? '#322820' : '#FFFCF8'"
            [style.border]="isDark ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(139,92,246,0.2)'"
            [style.box-shadow]="isDark ? '0 12px 48px rgba(0,0,0,0.5)' : '0 12px 48px rgba(0,0,0,0.08)'"
            style="position: absolute; right: calc(100% + 16px); top: 0; width: 420px; border-radius: 20px; padding: 20px; z-index: 50;"
          >
            <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-bottom: 12px; color: #7C3AED;">
              ✦ AI Insight
            </div>
            @if (insightLoading) {
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-align: center; padding: 20px 0;">
                {{ i18n.t('compare.insightLoading') }}
              </div>
            } @else if (hasInsightText) {
              <p [style.color]="isDark ? '#D3C3B0' : '#5A4A3E'" style="font-size: 13px; line-height: 1.65; margin: 0;">
                {{ getInsightSentences()[compareInsightPage] }}
              </p>

              <!-- Navigation -->
              @if (getInsightSentences().length > 1) {
                <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 14px;">
                  <button
                    (click)="compareInsightPage = compareInsightPage > 0 ? compareInsightPage - 1 : getInsightSentences().length - 1"
                    [style.color]="isDark ? '#A78BFA' : '#7C3AED'"
                    style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px 8px; opacity: 0.7; transition: opacity 0.2s;"
                    class="hover:opacity-100"
                  >‹</button>
                  <div style="display: flex; gap: 5px;">
                    @for (dot of getInsightSentences(); track $index) {
                      <div
                        (click)="compareInsightPage = $index"
                        [style.background]="compareInsightPage === $index ? '#A78BFA' : (isDark ? '#4A3D32' : '#D7CABC')"
                        style="width: 6px; height: 6px; border-radius: 50%; transition: background 0.2s; cursor: pointer;"
                      ></div>
                    }
                  </div>
                  <button
                    (click)="compareInsightPage = (compareInsightPage + 1) % getInsightSentences().length"
                    [style.color]="isDark ? '#A78BFA' : '#7C3AED'"
                    style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px 8px; opacity: 0.7; transition: opacity 0.2s;"
                    class="hover:opacity-100"
                  >›</button>
                </div>
              }
            } @else {
              <button
                (click)="onCompareInsight()"
                style="width: 100%; padding: 14px; border-radius: 14px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.10)); color: #A78BFA;"
              >
                {{ i18n.t('compare.insight') }}
              </button>
            }
          </div>
        }
      </div>
      </div>
    </div>
  `,
})
export class ComparePageComponent implements OnInit, OnDestroy {
  isDark = true;
  private subs: Subscription[] = [];
  private insightSub: Subscription | null = null;
  sidePanel: 'table' | 'insight' | null = null;

  selectedAlgorithms = new Set<AlgorithmType>([
    AlgorithmType.BFS,
    AlgorithmType.DIJKSTRA,
    AlgorithmType.A_STAR,
    AlgorithmType.GREEDY,
  ]);
  heuristic: HeuristicType = HeuristicType.MANHATTAN;
  neighborMode: NeighborMode = NeighborMode.FOUR;
  swarmWeight = 2;
  isRunning = false;
  raceFinished = false;
  showSettingsHint = false;
  results: CompareResult[] = [];
  selectedResultIndex = -1;
  insightText: { sr: string; en: string } = { sr: '', en: '' };
  insightLoading = false;
  compareInsightPage = 0;
  gridHeight = 0;

  bestExpanded = 0;
  bestCost = 0;
  bestTime = 0;

  // Race animation state
  private raceTimer: ReturnType<typeof setInterval> | null = null;
  private raceAlgos: { key: AlgorithmType; algo: PathfindingAlgorithm; done: boolean; foundPath: boolean }[] = [];
  raceSpeed = 20; // ms per tick
  visibleAlgos = new Set<string>(); // for post-race toggle
  ALGO_COLORS = ALGO_COLORS; // expose to template

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
    { value: AlgorithmType.BFS, label: 'BFS', short: 'BFS' },
    { value: AlgorithmType.DFS, label: 'DFS', short: 'DFS' },
    { value: AlgorithmType.DIJKSTRA, label: 'Dijkstra', short: 'Dijk' },
    { value: AlgorithmType.A_STAR, label: 'A*', short: 'A*' },
    { value: AlgorithmType.GREEDY, label: 'Greedy', short: 'Grdy' },
    { value: AlgorithmType.SWARM, label: 'Swarm', short: 'Swrm' },
    { value: AlgorithmType.CONVERGENT_SWARM, label: 'Conv. Swarm', short: 'CSwm' },
    { value: AlgorithmType.ZERO_ONE_BFS, label: '0-1 BFS', short: '0-1' },
  ];

  constructor(
    private gridService: GridService,
    private renderer: GridRendererService,
    private themeService: ThemeService,
    private aiService: AIService,
    public exportService: ExportService,
    public i18n: TranslationService,
  ) {}

  ngOnInit(): void {
    if (!this.gridService.getGrid()) {
      this.gridService.createGrid(25, 50);
    }
    this.gridHeight = this.calcGridHeight(this.gridService.getGrid()?.rows ?? 25, this.gridService.getGrid()?.cols ?? 50);
    this.subs.push(
      this.themeService.theme$.subscribe((t) => (this.isDark = t === 'dark')),
      this.gridService.grid$.subscribe((grid) => {
        if (grid) {
          this.gridHeight = this.calcGridHeight(grid.rows, grid.cols);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.stopRace();
    this.renderer.exitCompareMode();
    this.subs.forEach((s) => s.unsubscribe());
    if (this.insightSub) this.insightSub.unsubscribe();
  }

  private calcGridHeight(rows: number, cols: number): number {
    const headerToolbar = 140;
    const shadowPadding = 100;
    const availableWidth = window.innerWidth - shadowPadding;
    const availableHeight = window.innerHeight - headerToolbar - shadowPadding;
    const refCellW = Math.floor(availableWidth / 50);
    const refCellH = Math.floor(availableHeight / 25);
    const refCellSize = Math.min(refCellW, refCellH);
    return refCellSize * 25;
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

  getAlgoTint(algoKey: string): string {
    const hex = ALGO_COLORS[algoKey] || '#888888';
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},0.08)`;
  }

  getInsightText(): string {
    const lang = this.i18n.getLanguage();
    return this.insightText[lang] || this.insightText.en || this.insightText.sr || '';
  }

  getInsightSentences(): string[] {
    const text = this.getInsightText();
    if (!text) return [];
    // Split by period+space, keeping each sentence meaningful (min 20 chars)
    const raw = text.split(/(?<=\.)\s+/).filter(s => s.trim().length > 10);
    if (raw.length <= 1) return [text];
    // Group into ~2 sentences per page for readability
    const pages: string[] = [];
    for (let i = 0; i < raw.length; i += 2) {
      pages.push(raw.slice(i, i + 2).join(' '));
    }
    return pages;
  }

  get hasInsightText(): boolean {
    return !!(this.insightText.sr || this.insightText.en);
  }

  get hasSwarmSelected(): boolean {
    return this.selectedAlgorithms.has(AlgorithmType.SWARM) || this.selectedAlgorithms.has(AlgorithmType.CONVERGENT_SWARM);
  }

  runCompare(): void {
    const grid = this.gridService.getGrid();
    if (!grid) return;

    this.isRunning = true;
    this.raceFinished = false;
    this.results = [];
    this.selectedResultIndex = -1;
    this.insightText = { sr: '', en: '' };
    this.insightLoading = false;
    this.compareInsightPage = 0;
    this.sidePanel = null;
    this.stopRace();

    const selected = Array.from(this.selectedAlgorithms);
    this.visibleAlgos = new Set(selected);

    // Enter compare render mode
    this.renderer.enterCompareMode(selected);

    // Create algorithm instances for step-by-step race
    this.raceAlgos = selected.map(algo => {
      const options: AlgorithmOptions = {
        algorithm: algo,
        heuristic: this.heuristic,
        neighborMode: this.neighborMode,
        swarmWeight:
          algo === AlgorithmType.CONVERGENT_SWARM
            ? this.swarmWeight * 2.5
            : algo === AlgorithmType.SWARM
              ? this.swarmWeight
              : undefined,
      };
      const instance = createAlgorithm(grid, grid.start, grid.goal, options);
      return { key: algo, algo: instance, done: false, foundPath: false };
    });

    // Also run fast computation for metrics table (instant)
    for (const algo of selected) {
      const options: AlgorithmOptions = {
        algorithm: algo,
        heuristic: this.heuristic,
        neighborMode: this.neighborMode,
        swarmWeight:
          algo === AlgorithmType.CONVERGENT_SWARM
            ? this.swarmWeight * 2.5
            : algo === AlgorithmType.SWARM
              ? this.swarmWeight
              : undefined,
      };
      const { result, executionTimeMs } = runAlgorithmFast(grid, grid.start, grid.goal, options);
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
        path: result.path,
      });
    }

    // Calculate best values
    const withPath = this.results.filter((r) => r.foundPath);
    this.bestExpanded = withPath.length ? Math.min(...withPath.map((r) => r.expandedCount)) : 0;
    this.bestCost = withPath.length ? Math.min(...withPath.map((r) => r.pathCost)) : 0;
    this.bestTime = withPath.length ? Math.min(...withPath.map((r) => r.executionTimeMs)) : 0;

    // Start race animation
    this.raceTimer = setInterval(() => this.raceStep(), this.raceSpeed);
  }

  private raceStep(): void {
    let allDone = true;

    for (const entry of this.raceAlgos) {
      if (entry.done) continue;
      allDone = false;

      const events = entry.algo.step();
      for (const ev of events) {
        if (ev.type === EventType.OPEN_ADD || ev.type === EventType.CLOSE_ADD) {
          this.renderer.compareAddCell(entry.key, (ev as any).node);
        }
        if (ev.type === EventType.SET_CURRENT) {
          this.renderer.compareAddCell(entry.key, (ev as any).node);
        }
        if (ev.type === EventType.FOUND_PATH) {
          entry.foundPath = true;
          this.renderer.compareSetPath(entry.key, (ev as any).path);
        }
      }

      if (entry.algo.isDone()) {
        entry.done = true;
      }
    }

    this.renderer.renderCompare();

    if (allDone) {
      this.stopRace();
      this.isRunning = false;
      this.raceFinished = true;
    }
  }

  private stopRace(): void {
    if (this.raceTimer) {
      clearInterval(this.raceTimer);
      this.raceTimer = null;
    }
  }

  toggleAlgoVisibility(algo: string): void {
    this.renderer.compareToggleAlgo(algo);
    if (this.visibleAlgos.has(algo as any)) {
      this.visibleAlgos.delete(algo as any);
    } else {
      this.visibleAlgos.add(algo as any);
    }
    this.renderer.renderCompare();
  }

  onRaceOrigin(): void {
    this.stopRace();
    this.renderer.enterCompareMode(Array.from(this.selectedAlgorithms));
    this.renderer.renderCompare();
    this.isRunning = false;
    this.raceFinished = false;
  }

  onRaceEnd(): void {
    if (!this.isRunning) return;
    this.stopRace();
    // Fast-forward: step all algos to completion
    for (const entry of this.raceAlgos) {
      while (!entry.algo.isDone()) {
        const events = entry.algo.step();
        for (const ev of events) {
          if (ev.type === EventType.OPEN_ADD || ev.type === EventType.CLOSE_ADD || ev.type === EventType.SET_CURRENT) {
            this.renderer.compareAddCell(entry.key, (ev as any).node);
          }
          if (ev.type === EventType.FOUND_PATH) {
            this.renderer.compareSetPath(entry.key, (ev as any).path);
          }
        }
      }
      entry.done = true;
    }
    this.renderer.renderCompare();
    this.isRunning = false;
    this.raceFinished = true;
  }

  onToggleInsightPanel(): void {
    if (this.sidePanel === 'insight') {
      this.sidePanel = null;
    } else {
      this.sidePanel = 'insight';
      if (!this.hasInsightText && !this.insightLoading) {
        this.onCompareInsight();
      }
    }
  }

  onCompareInsight(): void {
    const grid = this.gridService.getGrid();
    if (!grid || this.results.length === 0) return;

    this.insightLoading = true;
    this.insightText = { sr: '', en: '' };
    if (this.insightSub) this.insightSub.unsubscribe();
    this.insightSub = this.aiService.getCompareInsight(this.results, grid).subscribe({
      next: (res) => {
        if (typeof res.insight === 'string') {
          this.insightText = { sr: res.insight, en: res.insight };
        } else {
          this.insightText = res.insight || { sr: '', en: '' };
        }
        this.insightLoading = false;
      },
      error: () => {
        this.insightText = { sr: '', en: '' };
        this.insightLoading = false;
      },
    });
  }

  onExportCompare(): void {
    if (this.results.length === 0) return;
    this.exportService.clearRuns();
    const grid = this.gridService.getGrid();
    if (!grid) return;
    for (const r of this.results) {
      this.exportService.addRun({
        algorithm: r.algorithm,
        heuristic: this.heuristic,
        neighborMode: this.neighborMode,
        swarmWeight: this.swarmWeight,
        expandedNodes: r.expandedCount,
        maxFrontierSize: r.maxFrontierSize,
        pathCost: r.pathCost === Infinity ? null : r.pathCost,
        pathLength: r.pathLength,
        totalSteps: r.totalSteps,
        executionTimeMs: r.executionTimeMs,
        foundPath: r.foundPath,
        mapRows: grid.rows,
        mapCols: grid.cols,
        wallCount: this.countWalls(grid),
        weightedCount: this.countWeighted(grid),
        timestamp: new Date().toISOString(),
      });
    }
    this.exportService.exportCompareJSON(this.results);
  }

  onExportCompareCSV(): void {
    if (this.results.length === 0) return;
    this.exportService.clearRuns();
    const grid = this.gridService.getGrid();
    if (!grid) return;
    for (const r of this.results) {
      this.exportService.addRun({
        algorithm: r.algorithm,
        heuristic: this.heuristic,
        neighborMode: this.neighborMode,
        swarmWeight: this.swarmWeight,
        expandedNodes: r.expandedCount,
        maxFrontierSize: r.maxFrontierSize,
        pathCost: r.pathCost === Infinity ? null : r.pathCost,
        pathLength: r.pathLength,
        totalSteps: r.totalSteps,
        executionTimeMs: r.executionTimeMs,
        foundPath: r.foundPath,
        mapRows: grid.rows,
        mapCols: grid.cols,
        wallCount: this.countWalls(grid),
        weightedCount: this.countWeighted(grid),
        timestamp: new Date().toISOString(),
      });
    }
    this.exportService.exportCSV();
  }

  private countWalls(grid: any): number {
    let count = 0;
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++)
        if (grid.cells[r][c].type === CellType.WALL) count++;
    return count;
  }

  private countWeighted(grid: any): number {
    let count = 0;
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++)
        if (grid.cells[r][c].weight > 1) count++;
    return count;
  }

  showResultPath(index: number): void {
    this.selectedResultIndex = index;
    this.renderer.resetVisualization();
    const r = this.results[index];
    if (r?.path) {
      this.renderer.applyEvents([{
        type: EventType.FOUND_PATH,
        path: r.path,
        totalCost: r.pathCost,
      }]);
    }
  }
}
