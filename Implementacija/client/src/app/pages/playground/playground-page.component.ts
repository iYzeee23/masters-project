import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GridService } from '../../services/grid.service';
import { GridRendererService } from '../../services/grid-renderer.service';
import { ThemeService, ALGO_COLORS } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { ExportService } from '../../services/export.service';
import { AIService } from '../../services/ai.service';
import { VisualizationService } from '../../services/visualization.service';
import { GridComponent } from '../../components/grid/grid.component';
import { runAlgorithm, createAlgorithm, PathfindingAlgorithm } from '../../algorithms';
import { posKey, posEqual } from '../../algorithms/helpers';
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
    matchBonus: number;
  };
  optimalPath: Position[] | null;
  expandedNodes: number;
}

const ALGO_LABELS: Record<string, string> = {
  [AlgorithmType.BFS]: 'BFS',
  [AlgorithmType.DFS]: 'DFS',
  [AlgorithmType.DIJKSTRA]: 'Dijkstra',
  [AlgorithmType.A_STAR]: 'A*',
  [AlgorithmType.GREEDY]: 'Greedy',
  [AlgorithmType.SWARM]: 'Swarm',
  [AlgorithmType.CONVERGENT_SWARM]: 'Conv. Swarm',
  [AlgorithmType.ZERO_ONE_BFS]: '0-1 BFS',
};

@Component({
  selector: 'app-playground-page',
  standalone: true,
  imports: [CommonModule, FormsModule, GridComponent],
  template: `
    <!-- PLAYGROUND CONTROLS BAR -->
    <div
      [style.background]="isDark ? 'linear-gradient(180deg, #3D3128 0%, #352A21 100%)' : 'linear-gradient(180deg, #FFF9F2 0%, #F5EFE7 100%)'"
      [style.border-bottom]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
      [style.box-shadow]="isDark ? '0 6px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)' : '0 4px 24px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)'"
      style="padding: 14px 48px; position: relative; z-index: 20;"
    >
      <div class="flex items-center justify-center gap-6 mx-auto flex-wrap">

        <!-- Algorithm picker group -->
        <div
          class="flex items-center gap-3"
          data-help="playground-algo"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          style="padding: 8px 16px; border-radius: 16px;"
        >
          <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; white-space: nowrap;">
            {{ i18n.t('playground.selectAlgo') }}
          </span>
          <select
            [(ngModel)]="selectedAlgorithm"
            [disabled]="isSubmitted"
            [style.background]="isDark ? '#352A21' : '#FFF9F2'"
            [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            style="padding: 6px 12px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; outline: none; min-width: 120px;"
            class="hover:scale-[1.02] transition-transform"
          >
            @for (algo of algorithmList; track algo.value) {
              <option [value]="algo.value">{{ algo.label }}</option>
            }
          </select>
          <select
            [(ngModel)]="selectedHeuristic"
            [disabled]="isSubmitted || !needsHeuristic()"
            [style.background]="isDark ? '#352A21' : '#FFF9F2'"
            [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            [style.opacity]="needsHeuristic() ? '1' : '0.35'"
            style="padding: 6px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; outline: none; min-width: 100px;"
            class="transition-opacity"
          >
            @for (h of heuristicList; track h.value) {
              <option [value]="h.value">{{ h.label }}</option>
            }
          </select>
          <div [style.background]="isDark ? '#4A3D32' : '#D7CABC'" style="width: 1px; height: 20px;"></div>
          <button
            (click)="neighborMode = neighborMode === 4 ? 8 : 4"
            [disabled]="isSubmitted"
            [style.background]="isDark ? '#352A21' : '#FFF9F2'"
            [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            style="padding: 6px 12px; border-radius: 10px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap;"
            class="hover:scale-[1.02] transition-transform disabled:opacity-40"
          >{{ neighborMode === 4 ? '4 \u2194' : '8 \u2194' }}</button>
        </div>

        <!-- Status group -->
        <div
          class="flex items-center gap-4"
          data-help="playground-sidebar"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          style="padding: 8px 20px; border-radius: 16px;"
        >
          <div class="text-center" style="min-width: 48px;">
            <div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums;">{{ userPath.length }}</div>
            <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 1px;">{{ i18n.t('playground.cells') }}</div>
          </div>
          <div [style.background]="isDark ? '#4A3D32' : '#D7CABC'" style="width: 1px; height: 24px;"></div>
          <div class="text-center" style="min-width: 48px;">
            <div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums;">{{ getUserPathCost() | number: '1.1-1' }}</div>
            <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 1px;">{{ i18n.t('playground.cost') }}</div>
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
            [disabled]="!isValidPath() || isSubmitted"
            [style.background]="isValidPath() && !isSubmitted ? (isDark ? 'rgba(34,197,94,0.12)' : 'rgba(22,163,74,0.08)') : (isDark ? '#4A3D32' : '#D7CABC')"
            [style.color]="isValidPath() && !isSubmitted ? (isDark ? '#4ADE80' : '#16A34A') : (isDark ? '#6B5D50' : '#A89888')"
            [style.border]="isValidPath() && !isSubmitted ? (isDark ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(22,163,74,0.25)') : '1px solid transparent'"
            [style.cursor]="isValidPath() && !isSubmitted ? 'pointer' : 'not-allowed'"
            class="transition-all duration-200 hover:scale-[1.04] active:scale-[0.97]"
            style="padding: 8px 22px; border-radius: 12px; font-size: 13px; font-weight: 600;"
          >{{ i18n.t('playground.submit') }}</button>
          <button
            (click)="declareNoPath()"
            [disabled]="isSubmitted"
            [style.background]="!isSubmitted ? (isDark ? 'rgba(244,63,94,0.12)' : 'rgba(225,29,72,0.08)') : (isDark ? '#4A3D32' : '#D7CABC')"
            [style.color]="!isSubmitted ? (isDark ? '#F43F5E' : '#E11D48') : (isDark ? '#6B5D50' : '#A89888')"
            [style.border]="!isSubmitted ? (isDark ? '1px solid rgba(244,63,94,0.3)' : '1px solid rgba(225,29,72,0.2)') : '1px solid transparent'"
            [style.cursor]="!isSubmitted ? 'pointer' : 'not-allowed'"
            style="padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; transition: all 0.2s;"
            class="hover:scale-[1.04] active:scale-[0.97]"
          >{{ i18n.t('playground.noPath') }}</button>
          <button
            (click)="resetPlayground()"
            [disabled]="isSubmitted && !result"
            [style.background]="isDark ? 'rgba(59,130,246,0.12)' : 'rgba(37,99,235,0.08)'"
            [style.color]="isDark ? '#60A5FA' : '#2563EB'"
            [style.border]="isDark ? '1px solid rgba(59,130,246,0.3)' : '1px solid rgba(37,99,235,0.2)'"
            style="padding: 8px 16px; border-radius: 12px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
            class="hover:scale-[1.04] active:scale-[0.97]"
          >{{ i18n.t('playground.resetBtn') }}</button>
        </div>

        <!-- Playback group (after submit) -->
        <div
          class="flex items-center gap-2"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          [style.opacity]="isSubmitted ? '1' : '0.3'"
          style="padding: 6px 12px; border-radius: 16px; transition: opacity 0.3s;"
        >
          <button
            (click)="vizOrigin()"
            [disabled]="!isSubmitted || raceRunning"
            [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'"
            [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            style="padding: 6px 12px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
            class="hover:scale-[1.06] disabled:opacity-30"
          >\u23EE</button>
          <button
            (click)="vizEnd()"
            [disabled]="!isSubmitted"
            [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'"
            [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            style="padding: 6px 12px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
            class="hover:scale-[1.06] disabled:opacity-30"
          >\u23ED</button>
        </div>
      </div>
    </div>

    <!-- GRID (centered with sidebars) -->
    <div style="display: flex; justify-content: center; align-items: start; padding: 20px 24px;" [style.min-height]="result ? 'auto' : 'calc(100vh - 200px)'">
      <div style="display: grid; grid-template-columns: 120px auto 120px; gap: 70px; align-items: start;">

        <!-- LEFT: Legend -->
        <div
          [style.background]="isDark ? 'linear-gradient(180deg, #3D3128 0%, #352A21 100%)' : 'linear-gradient(180deg, #FFF9F2 0%, #F5EFE7 100%)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          [style.box-shadow]="isDark ? '0 12px 80px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4), 0 0 0 1px #554536' : '0 12px 80px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.12), 0 0 0 1px #D7CABC'"
          [style.height.px]="gridHeight"
          style="border-radius: 20px; padding: 14px 14px; display: flex; flex-direction: column; justify-content: space-evenly; box-sizing: border-box; overflow: hidden;"
        >
          <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700; text-align: center;">{{ i18n.t('legend.title') }}</div>
          <!-- Static map entries -->
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(126,200,86,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#7EC856' : '#4A8C2A'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.start') }}</span></div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(232,116,97,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#E87461' : '#D05040'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.goal') }}</span></div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(158,128,110,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#9E806E' : '#8B7262'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.wall') }}</span></div>
          <div [style.background]="isDark ? '#4A3D32' : '#D7CABC'" style="height: 1px; opacity: 0.3;"></div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(91,168,212,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#5BA8D4' : '#4A9AC7'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.open') }}</span></div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(155,126,212,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#9B7ED4' : '#7C5FB8'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.closed') }}</span></div>
          <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(232,124,160,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#E87CA0' : '#D4688A'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.current') }}</span></div>
          <div [style.background]="isDark ? '#4A3D32' : '#D7CABC'" style="height: 1px; opacity: 0.3;"></div>
          <!-- Toggleable path entries (like Compare tab) -->
          <div
            (click)="isSubmitted ? togglePathVisibility('user') : null"
            [style.opacity]="!isSubmitted ? '0.5' : (showUserPath ? '1' : '0.3')"
            [style.cursor]="isSubmitted ? 'pointer' : 'default'"
            [style.background]="showUserPath ? 'rgba(232,184,77,0.12)' : 'transparent'"
            style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; transition: all 0.2s ease;"
            onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"
          ><div style="width: 10px; height: 10px; border-radius: 50%; background: #E8B84D;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 12px; font-weight: 500;">{{ i18n.t('playground.userLabel') }}</span></div>
          <div
            (click)="isSubmitted ? togglePathVisibility('algo') : null"
            [style.opacity]="!isSubmitted ? '0.25' : (showAlgoPath ? '1' : '0.3')"
            [style.cursor]="isSubmitted ? 'pointer' : 'default'"
            [style.background]="showAlgoPath ? getAlgoTint() : 'transparent'"
            style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; transition: all 0.2s ease;"
            onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"
          ><div [style.background]="getAlgoColor(selectedAlgorithm)" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 12px; font-weight: 500;">{{ getAlgoLabel(selectedAlgorithm) }}</span></div>
        </div>

        <!-- CENTER: Grid -->
        <div>
          <app-grid [mode]="'playground'" (cellClicked)="onPathCellClick($event)" (cellRightClicked)="onPathCellRightClick($event)"></app-grid>
        </div>

        <!-- RIGHT: Playground Stats + Export -->
        <div
          [style.background]="isDark ? 'linear-gradient(180deg, #3D3128 0%, #352A21 100%)' : 'linear-gradient(180deg, #FFF9F2 0%, #F5EFE7 100%)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          [style.box-shadow]="isDark ? '0 12px 80px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4), 0 0 0 1px #554536' : '0 12px 80px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.12), 0 0 0 1px #D7CABC'"
          [style.opacity]="isSubmitted ? '1' : '0.4'"
          [style.height.px]="gridHeight"
          style="border-radius: 20px; padding: 14px 14px; display: flex; flex-direction: column; justify-content: space-evenly; box-sizing: border-box; position: relative; transition: opacity 0.3s ease;"
        >
          <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; text-align: center;">{{ i18n.t('legend.metrics') }}</div>
          <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'">
            <div [style.color]="!result ? '#78716c' : result.score >= 80 ? '#4ade80' : result.score >= 50 ? '#E8B84D' : '#fb7185'" style="font-size: 28px; font-weight: 800;">{{ result?.score ?? '\u2014' }}</div>
            <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">{{ i18n.t('playground.score') }}</div>
          </div>
          <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'">
            <div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums;">{{ result?.userCost ?? '\u2014' }}</div>
            <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 11px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">{{ i18n.t('toolbar.cost') }}</div>
          </div>
          <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'">
            <div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 18px; font-weight: 700; font-variant-numeric: tabular-nums;">{{ result?.optimalCost ?? '\u2014' }}</div>
            <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 11px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">{{ i18n.t('playground.optimalCost') }}</div>
          </div>
          <div [style.background]="isDark ? '#4A3D32' : '#D7CABC'" style="height: 1px; opacity: 0.3;"></div>
          <!-- Results button (opens popup) -->
          <button
            (click)="showResultsPanel = !showResultsPanel"
            [style.opacity]="result ? '1' : '0.3'"
            [style.pointer-events]="result ? 'auto' : 'none'"
            [style.background]="showResultsPanel ? (isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.1)') : (isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)')"
            [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'"
            [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
            style="padding: 12px 0; border-radius: 12px; width: 100%; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
            class="hover:scale-[1.03]"
            onmouseenter="this.style.transform='scale(1.03)'" onmouseleave="this.style.transform='scale(1)'"
          >\uD83D\uDCCA {{ i18n.t('playground.score') }}</button>

          <!-- Left-opening popup: Results -->
          @if (showResultsPanel && result) {
            <div
              [style.background]="isDark ? '#322820' : '#FFFCF8'"
              [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
              [style.box-shadow]="isDark ? '0 12px 48px rgba(0,0,0,0.5)' : '0 12px 48px rgba(0,0,0,0.08)'"
              style="position: absolute; right: calc(100% + 16px); top: 0; width: 380px; border-radius: 20px; padding: 24px; z-index: 50;"
            >
              <!-- Score -->
              <div style="text-align: center; margin-bottom: 20px;">
                <div [style.color]="result.score >= 80 ? '#22C55E' : result.score >= 50 ? '#F59E0B' : '#F43F5E'" style="font-size: 48px; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums;">{{ result.score }}</div>
                <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.15em; margin-top: 6px; font-weight: 600;">{{ i18n.t('playground.score') }} / 110 \u00B7 {{ getAlgoLabel(selectedAlgorithm) }}</div>
              </div>
              <div [style.background]="isDark ? '#4A3D32' : '#D7CABC'" style="height: 1px; margin-bottom: 16px;"></div>
              <!-- Breakdown -->
              <div style="display: grid; grid-template-columns: 1fr auto; gap: 10px 20px; align-items: center;">
                <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">{{ i18n.t('playground.yourCost') }}</span>
                <span [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 14px; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums;">{{ result.userCost | number: '1.1-1' }}</span>
                <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">{{ i18n.t('playground.optimalCost') }}</span>
                <span [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 14px; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums;">{{ result.optimalCost !== null ? (result.optimalCost | number: '1.1-1') : i18n.t('playground.noPathExists') }}</span>
                <div [style.background]="isDark ? '#4A3D32' : '#D7CABC'" style="height: 1px; grid-column: 1 / -1; margin: 2px 0;"></div>
                <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">{{ i18n.t('playground.penaltyCost') }}</span>
                <span style="font-size: 14px; font-weight: 600; text-align: right; color: #F43F5E; font-variant-numeric: tabular-nums;">-{{ result.breakdown.costPenalty | number: '1.0-0' }}</span>
                <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">{{ i18n.t('playground.penaltyMoves') }}</span>
                <span style="font-size: 14px; font-weight: 600; text-align: right; color: #F43F5E; font-variant-numeric: tabular-nums;">-{{ result.breakdown.invalidMovePenalty | number: '1.0-0' }}</span>
                <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">{{ i18n.t('playground.speedBonus') }}</span>
                <span style="font-size: 14px; font-weight: 600; text-align: right; color: #22C55E; font-variant-numeric: tabular-nums;">+{{ result.breakdown.speedBonus | number: '1.0-0' }}</span>
                <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">{{ i18n.t('playground.matchBonus') }}</span>
                <span style="font-size: 14px; font-weight: 600; text-align: right; color: #22C55E; font-variant-numeric: tabular-nums;">+{{ result.breakdown.matchBonus | number: '1.0-0' }}</span>
              </div>
            </div>
          }

          <!-- AI button -->
          <button
            (click)="onToggleAIPanel()"
            [style.opacity]="result ? '1' : '0.3'"
            [style.pointer-events]="result ? 'auto' : 'none'"
            style="padding: 12px 0; border-radius: 12px; width: 100%; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; background: linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.10)); color: #A78BFA;"
            class="hover:scale-[1.03]"
            onmouseenter="this.style.transform='scale(1.03)'" onmouseleave="this.style.transform='scale(1)'"
          >\u2726 AI</button>

          <!-- Left-opening popup: AI Feedback -->
          @if (showAIPanel) {
            <div
              [style.background]="isDark ? '#322820' : '#FFFCF8'"
              [style.border]="isDark ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(139,92,246,0.2)'"
              [style.box-shadow]="isDark ? '0 12px 48px rgba(0,0,0,0.5)' : '0 12px 48px rgba(0,0,0,0.08)'"
              style="position: absolute; right: calc(100% + 16px); top: 0; width: 420px; border-radius: 20px; padding: 20px; z-index: 50;"
            >
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-bottom: 12px; color: #7C3AED;">\u2726 AI Feedback</div>
              @if (aiLoading) {
                <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-align: center; padding: 20px 0;">{{ i18n.t('playground.aiLoading') }}</div>
              } @else if (aiSections.length > 0) {
                <p [style.color]="isDark ? '#D3C3B0' : '#5A4A3E'" style="font-size: 13px; line-height: 1.65; margin: 0;">{{ aiSections[aiPage] }}</p>
                @if (aiSections.length > 1) {
                  <div style="display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 14px;">
                    <button (click)="aiPage = aiPage > 0 ? aiPage - 1 : aiSections.length - 1" [style.color]="isDark ? '#A78BFA' : '#7C3AED'" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px 8px; opacity: 0.7; transition: opacity 0.2s;" class="hover:opacity-100">\u2039</button>
                    <div style="display: flex; gap: 5px;">
                      @for (dot of aiSections; track $index) {
                        <div (click)="aiPage = $index" [style.background]="aiPage === $index ? '#A78BFA' : (isDark ? '#4A3D32' : '#D7CABC')" style="width: 6px; height: 6px; border-radius: 50%; transition: background 0.2s; cursor: pointer;"></div>
                      }
                    </div>
                    <button (click)="aiPage = (aiPage + 1) % aiSections.length" [style.color]="isDark ? '#A78BFA' : '#7C3AED'" style="background: none; border: none; cursor: pointer; font-size: 16px; padding: 4px 8px; opacity: 0.7; transition: opacity 0.2s;" class="hover:opacity-100">\u203A</button>
                  </div>
                }
              }
            </div>
          }
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <button (click)="onExportJSON()" [disabled]="!result" [style.background]="isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.06)'" [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" [style.border]="isDark ? '1px solid rgba(74,61,50,0.5)' : '1px solid rgba(215,202,188,0.8)'" [style.opacity]="!result ? '0.3' : '1'" style="padding: 7px 0; border-radius: 10px; width: 100%; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s;">JSON \u2193</button>
            <button (click)="onExportCSV()" [disabled]="!result" [style.background]="isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.06)'" [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" [style.border]="isDark ? '1px solid rgba(74,61,50,0.5)' : '1px solid rgba(215,202,188,0.8)'" [style.opacity]="!result ? '0.3' : '1'" style="padding: 7px 0; border-radius: 10px; width: 100%; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s;">CSV \u2193</button>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class PlaygroundPageComponent implements OnInit, OnDestroy {
  isDark = true;
  userPath: Position[] = [];
  isSubmitted = false;
  result: PlaygroundResult | null = null;
  gridHeight = 0;
  showResultsPanel = false;
  selectedAlgorithm: string = AlgorithmType.DIJKSTRA;
  selectedHeuristic: string = HeuristicType.MANHATTAN;
  neighborMode: 4 | 8 = 4;
  heuristicList = [
    { value: HeuristicType.MANHATTAN, label: 'Manhattan' },
    { value: HeuristicType.EUCLIDEAN, label: 'Euclidean' },
    { value: HeuristicType.CHEBYSHEV, label: 'Chebyshev' },
    { value: HeuristicType.OCTILE, label: 'Octile' },
  ];
  algorithmList = [
    { value: AlgorithmType.BFS, label: 'BFS' },
    { value: AlgorithmType.DFS, label: 'DFS' },
    { value: AlgorithmType.DIJKSTRA, label: 'Dijkstra' },
    { value: AlgorithmType.A_STAR, label: 'A*' },
    { value: AlgorithmType.GREEDY, label: 'Greedy' },
    { value: AlgorithmType.SWARM, label: 'Swarm' },
    { value: AlgorithmType.CONVERGENT_SWARM, label: 'Conv. Swarm' },
    { value: AlgorithmType.ZERO_ONE_BFS, label: '0-1 BFS' },
  ];
  private startTime = 0;
  private subs: Subscription[] = [];

  // AI feedback state
  aiLoading = false;
  aiFeedback: { evaluation: any; insight: any; tip: any } | null = null;
  aiSections: string[] = [];
  aiSectionLabels: string[] = [];
  aiPage = 0;

  // Path visibility toggles (like Compare tab)
  showUserPath = true;
  showAlgoPath = true;

  // Race animation state
  private raceTimer: ReturnType<typeof setInterval> | null = null;
  private raceAlgo: PathfindingAlgorithm | null = null;
  private raceAlgoKey = '';
  raceRunning = false;
  aiError = false;
  showAIPanel = false;

  constructor(
    private gridService: GridService,
    private renderer: GridRendererService,
    private themeService: ThemeService,
    private apiService: ApiService,
    private authService: AuthService,
    private exportService: ExportService,
    private aiService: AIService,
    private vizService: VisualizationService,
    private cdr: ChangeDetectorRef,
    public i18n: TranslationService,
  ) {}

  ngOnInit(): void {
    // Stop any running visualization from other tabs (prevents animation overwriting path rendering)
    this.vizService.stop();
    this.renderer.exitCompareMode();
    this.renderer.resetVisualization();

    // Don't auto-generate: keep whatever grid the user has from other tabs
    if (!this.gridService.getGrid()) {
      this.gridService.createGrid(25, 50);
    }
    this.startTime = performance.now();
    this.gridHeight = this.calcGridHeight(25, 50);
    this.subs.push(
      this.themeService.theme$.subscribe((t) => (this.isDark = t === 'dark')),
      this.gridService.grid$.subscribe((grid) => {
        if (grid) {
          this.gridHeight = this.calcGridHeight(grid.rows, grid.cols);
        }
      }),
      this.i18n.lang$.subscribe(() => this.buildAISections()),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.stopRace();
    this.renderer.exitCompareMode();
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

  isValidPath(): boolean {
    if (this.userPath.length < 2) return false;
    const grid = this.gridService.getGrid();
    if (!grid) return false;

    const keys = new Set(this.userPath.map(posKey));
    // Must contain start and goal
    if (!keys.has(posKey(grid.start))) return false;
    if (!keys.has(posKey(grid.goal))) return false;
    // No walls
    for (const p of this.userPath) {
      if (grid.cells[p.row][p.col].type === CellType.WALL) return false;
    }
    // BFS connectivity: all cells must be reachable from userPath[0] via adjacency within the set
    const visited = new Set<string>();
    const queue = [posKey(this.userPath[0])];
    visited.add(queue[0]);
    const deltas = this.neighborMode === 8
      ? [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
      : [[-1,0],[1,0],[0,-1],[0,1]];
    while (queue.length > 0) {
      const ck = queue.shift()!;
      const [cr, cc] = ck.split(',').map(Number);
      for (const [dr, dc] of deltas) {
        const nk = posKey({ row: cr + dr, col: cc + dc });
        if (keys.has(nk) && !visited.has(nk)) {
          visited.add(nk);
          queue.push(nk);
        }
      }
    }
    return visited.size === keys.size;
  }

  getAlgoLabel(algo: string): string {
    return ALGO_LABELS[algo] || algo;
  }

  getAlgoColor(algo: string): string {
    return ALGO_COLORS[algo] || '#888888';
  }

  needsHeuristic(): boolean {
    const a = this.selectedAlgorithm;
    return a === AlgorithmType.A_STAR || a === AlgorithmType.GREEDY || a === AlgorithmType.SWARM || a === AlgorithmType.CONVERGENT_SWARM;
  }

  togglePathVisibility(which: 'user' | 'algo'): void {
    if (which === 'user') {
      this.showUserPath = !this.showUserPath;
      this.renderer.compareToggleAlgo('user');
    } else {
      this.showAlgoPath = !this.showAlgoPath;
      this.renderer.compareToggleAlgo(this.selectedAlgorithm);
    }
    this.renderer.renderCompare();
  }

  getAlgoTint(): string {
    const c = this.getAlgoColor(this.selectedAlgorithm);
    return `rgba(${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)},0.12)`;
  }

  isCompareVisible(algo: string): boolean {
    return this.renderer.isCompareAlgoVisible(algo);
  }

  toggleCompareAlgo(algo: string): void {
    this.renderer.compareToggleAlgo(algo);
    this.renderer.renderCompare();
  }

  private pathSet = new Set<string>();

  onPathCellClick(pos: Position): void {
    if (this.isSubmitted) return;
    const grid = this.gridService.getGrid();
    if (!grid) return;
    const cell = grid.cells[pos.row][pos.col];
    if (cell.type === CellType.WALL) return;

    const key = posKey(pos);

    // Left click only adds, skip if already in path
    if (this.pathSet.has(key)) return;

    this.pathSet.add(key);
    this.userPath.push(pos);
    this.renderUserPath();
  }

  onPathCellRightClick(pos: Position): void {
    if (this.isSubmitted) return;
    const key = posKey(pos);
    if (this.pathSet.has(key)) {
      this.pathSet.delete(key);
      this.userPath = this.userPath.filter(p => posKey(p) !== key);
      this.renderUserPath();
    }
  }

  undoLast(): void {
    if (this.userPath.length > 0) {
      const removed = this.userPath.pop()!;
      this.pathSet.delete(posKey(removed));
      this.renderUserPath();
    }
  }

  declareNoPath(): void {
    this.isSubmitted = true;
    const grid = this.gridService.getGrid();
    if (!grid) return;

    const { result: algoResult, trace } = this.runSelectedAlgorithm(grid);

    if (algoResult.path === null) {
      // Correct
      const speedBonus = this.calcSpeedBonus();
      this.result = {
        userCost: 0,
        optimalCost: null,
        score: Math.min(110, 100 + speedBonus),
        breakdown: { costPenalty: 0, invalidMovePenalty: 0, speedBonus, matchBonus: 0 },
        optimalPath: null,
        expandedNodes: algoResult.expandedCount,
      };
    } else {
      // Wrong — path exists
      this.result = {
        userCost: 0,
        optimalCost: algoResult.cost,
        score: 0,
        breakdown: { costPenalty: 50, invalidMovePenalty: 0, speedBonus: 0, matchBonus: 0 },
        optimalPath: algoResult.path,
        expandedNodes: algoResult.expandedCount,
      };
    }
    // Start algorithm visualization
    this.startAlgoVisualization(grid);
    this.submitToServer(true);
    this.cdr.detectChanges();
  }

  submitPath(): void {
    this.isSubmitted = true;
    const grid = this.gridService.getGrid();
    if (!grid) return;

    const { result: algoResult, trace } = this.runSelectedAlgorithm(grid);
    const userCost = this.getUserPathCost();

    // Validate moves
    let invalidMoves = 0;
    for (let i = 1; i < this.userPath.length; i++) {
      const prev = this.userPath[i - 1];
      const curr = this.userPath[i];
      const dr = Math.abs(curr.row - prev.row);
      const dc = Math.abs(curr.col - prev.col);
      if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) invalidMoves++;
      if (grid.cells[curr.row][curr.col].type === CellType.WALL) invalidMoves++;
    }

    const startsAtStart = this.userPath.length > 0 && posEqual(this.userPath[0], grid.start);
    const endsAtGoal = this.userPath.length > 0 && posEqual(this.userPath[this.userPath.length - 1], grid.goal);
    if (!startsAtStart || !endsAtGoal) invalidMoves += 10;

    // Algorithm-specific scoring
    const isDFS = this.selectedAlgorithm === AlgorithmType.DFS;
    let costPenalty: number;
    let matchBonus = 0;

    if (!algoResult.path) {
      // No valid path but user submitted one
      costPenalty = 50;
    } else if (isDFS) {
      // DFS has no optimal guarantee — no cost penalty for valid paths
      costPenalty = 0;
      if (userCost <= algoResult.cost) matchBonus = 10;
    } else {
      costPenalty = Math.min(50, Math.round(((userCost - algoResult.cost) / Math.max(algoResult.cost, 1)) * 100));
      if (costPenalty <= 0) {
        matchBonus = 10;
        costPenalty = 0;
      }
    }

    const invalidMovePenalty = Math.min(50, invalidMoves * 10);
    const speedBonus = this.calcSpeedBonus();
    const score = Math.max(0, Math.min(110, 100 - Math.max(0, costPenalty) - invalidMovePenalty + speedBonus + matchBonus));

    this.result = {
      userCost,
      optimalCost: algoResult.path ? algoResult.cost : null,
      score,
      breakdown: { costPenalty: Math.max(0, costPenalty), invalidMovePenalty, speedBonus, matchBonus },
      optimalPath: algoResult.path,
      expandedNodes: algoResult.expandedCount,
    };

    // Start algorithm visualization (step-by-step animation)
    this.startAlgoVisualization(grid);
    this.submitToServer(false);
    this.cdr.detectChanges();
  }

  resetPlayground(): void {
    this.userPath = [];
    this.pathSet.clear();
    this.isSubmitted = false;
    this.result = null;
    this.aiFeedback = null;
    this.aiSections = [];
    this.aiSectionLabels = [];
    this.aiPage = 0;
    this.aiLoading = false;
    this.aiError = false;
    this.showAIPanel = false;
    this.showResultsPanel = false;
    this.showUserPath = true;
    this.showAlgoPath = true;
    this.startTime = performance.now();
    this.stopRace();
    this.raceAlgo = null;
    this.vizService.stop();
    this.renderer.exitCompareMode();
    this.renderer.resetVisualization();
  }

  onExportJSON(): void {
    if (!this.result) return;
    const grid = this.gridService.getGrid();
    this.exportService.clearRuns();
    this.exportService.addRun({
      algorithm: 'playground (' + this.getAlgoLabel(this.selectedAlgorithm) + ')',
      heuristic: '',
      neighborMode: 4,
      expandedNodes: this.result.expandedNodes,
      maxFrontierSize: 0,
      pathCost: this.result.userCost,
      pathLength: this.userPath.length,
      totalSteps: this.userPath.length,
      executionTimeMs: 0,
      foundPath: !!this.result.optimalPath,
      mapRows: grid?.rows ?? 0,
      mapCols: grid?.cols ?? 0,
      wallCount: 0,
      weightedCount: 0,
      timestamp: new Date().toISOString(),
    });
    this.exportService.exportJSON();
  }

  onExportCSV(): void {
    if (!this.result) return;
    const grid = this.gridService.getGrid();
    this.exportService.clearRuns();
    this.exportService.addRun({
      algorithm: 'playground (' + this.getAlgoLabel(this.selectedAlgorithm) + ')',
      heuristic: '',
      neighborMode: 4,
      expandedNodes: this.result.expandedNodes,
      maxFrontierSize: 0,
      pathCost: this.result.userCost,
      pathLength: this.userPath.length,
      totalSteps: this.userPath.length,
      executionTimeMs: 0,
      foundPath: !!this.result.optimalPath,
      mapRows: grid?.rows ?? 0,
      mapCols: grid?.cols ?? 0,
      wallCount: 0,
      weightedCount: 0,
      timestamp: new Date().toISOString(),
    });
    this.exportService.exportCSV();
  }

  private submitToServer(declaredNoPath: boolean): void {
    if (!this.result || !this.authService.getToken()) return;
    const timeSpentMs = performance.now() - this.startTime;
    this.apiService.submitPlaygroundAttempt({
      userPath: this.userPath.map((p) => [p.row, p.col]),
      userDeclaredNoPath: declaredNoPath,
      optimalCost: this.result.optimalCost,
      userCost: declaredNoPath ? null : this.result.userCost,
      score: this.result.score,
      breakdown: this.result.breakdown,
      timeSpentMs,
    }).subscribe({ error: () => {} });
  }

  private runSelectedAlgorithm(grid: Grid) {
    const options: AlgorithmOptions = {
      algorithm: this.selectedAlgorithm as AlgorithmType,
      heuristic: this.selectedHeuristic as HeuristicType,
      neighborMode: this.neighborMode === 8 ? NeighborMode.EIGHT : NeighborMode.FOUR,
    };
    return runAlgorithm(grid, grid.start, grid.goal, options);
  }

  private enterCompareVisualization(userPath: Position[], algoPath: Position[] | null, trace: any[]): void {
    const algoKey = this.selectedAlgorithm;
    this.renderer.enterCompareMode(['user', algoKey]);

    // User path territory + path
    for (const pos of userPath) {
      this.renderer.compareAddCell('user', pos);
    }
    this.renderer.compareSetPath('user', userPath);

    // Algorithm explored cells from trace
    if (trace) {
      for (const event of trace) {
        if (event.type === EventType.CLOSE_ADD || event.type === EventType.OPEN_ADD) {
          this.renderer.compareAddCell(algoKey, event.node);
        }
      }
    }
    if (algoPath) {
      for (const pos of algoPath) {
        this.renderer.compareAddCell(algoKey, pos);
      }
      this.renderer.compareSetPath(algoKey, algoPath);
    }

    this.renderer.renderCompare();
  }

  // ═══ AI FEEDBACK ═══

  toggleAIPanel(): void {
    this.showAIPanel = !this.showAIPanel;
  }

  onToggleAIPanel(): void {
    if (this.showAIPanel) {
      this.showAIPanel = false;
    } else {
      this.showAIPanel = true;
      if (!this.aiFeedback && !this.aiLoading) {
        this.requestAIFeedback();
      }
    }
  }

  private buildAISections(): void {
    if (!this.aiFeedback) return;
    const lang = this.i18n.getLanguage();
    this.aiSections = [
      this.aiFeedback.evaluation?.[lang] || this.aiFeedback.evaluation?.en || '',
      this.aiFeedback.insight?.[lang] || this.aiFeedback.insight?.en || '',
      this.aiFeedback.tip?.[lang] || this.aiFeedback.tip?.en || '',
    ].filter(s => s);
    this.aiSectionLabels = [
      this.i18n.t('playground.aiEvaluation'),
      this.i18n.t('playground.aiInsight'),
      this.i18n.t('playground.aiTip'),
    ].slice(0, this.aiSections.length);
    if (this.aiPage >= this.aiSections.length) this.aiPage = 0;
  }

  requestAIFeedback(): void {
    if (!this.result || this.aiLoading) return;
    const grid = this.gridService.getGrid();
    if (!grid) return;

    this.aiLoading = true;
    this.aiError = false;
    this.cdr.detectChanges();

    this.aiService.getPlaygroundFeedback({
      algorithm: this.getAlgoLabel(this.selectedAlgorithm),
      userPath: this.userPath.map(p => [p.row, p.col]),
      userCost: this.result.userCost,
      optimalCost: this.result.optimalCost,
      optimalPath: this.result.optimalPath?.map(p => [p.row, p.col]) ?? null,
      score: this.result.score,
      breakdown: this.result.breakdown,
      grid,
    }).subscribe({
      next: (resp) => {
        this.aiFeedback = resp;
        this.buildAISections();
        this.aiPage = 0;
        this.aiLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.aiLoading = false;
        this.aiError = true;
        this.cdr.detectChanges();
      },
    });
  }

  // ═══ VIZ CONTROLS ═══

  private startAlgoVisualization(grid: Grid): void {
    const algoKey = this.selectedAlgorithm;
    this.raceAlgoKey = algoKey;

    // Enter compare mode with user path + algorithm
    this.renderer.enterCompareMode(['user', algoKey]);

    // Pre-populate user path territory
    for (const pos of this.userPath) {
      this.renderer.compareAddCell('user', pos);
    }
    this.renderer.compareSetPath('user', this.userPath);
    this.renderer.renderCompare();

    // Create algorithm instance for step-by-step race
    const options: AlgorithmOptions = {
      algorithm: this.selectedAlgorithm as AlgorithmType,
      heuristic: this.selectedHeuristic as HeuristicType,
      neighborMode: this.neighborMode === 8 ? NeighborMode.EIGHT : NeighborMode.FOUR,
    };
    this.raceAlgo = createAlgorithm(grid, grid.start, grid.goal, options);
    this.raceRunning = true;
    this.showUserPath = true;
    this.showAlgoPath = true;

    // Animate step by step (like Compare tab race)
    this.raceTimer = setInterval(() => this.raceStep(), 20);
  }

  private raceStep(): void {
    if (!this.raceAlgo || this.raceAlgo.isDone()) {
      this.stopRace();
      this.raceAlgo = null;
      return;
    }

    const events = this.raceAlgo.step();
    for (const ev of events) {
      if (ev.type === EventType.OPEN_ADD || ev.type === EventType.CLOSE_ADD) {
        this.renderer.compareAddCell(this.raceAlgoKey, (ev as any).node);
      }
      if (ev.type === EventType.SET_CURRENT) {
        this.renderer.compareAddCell(this.raceAlgoKey, (ev as any).node);
      }
      if (ev.type === EventType.FOUND_PATH) {
        this.renderer.compareSetPath(this.raceAlgoKey, (ev as any).path);
      }
    }
    this.renderer.renderCompare();
  }

  private stopRace(): void {
    if (this.raceTimer) {
      clearInterval(this.raceTimer);
      this.raceTimer = null;
    }
    this.raceRunning = false;
  }

  vizOrigin(): void {
    // Show only user path
    this.stopRace();
    this.raceAlgo = null;
    if (!this.renderer.isCompareAlgoVisible('user')) this.renderer.compareToggleAlgo('user');
    if (this.renderer.isCompareAlgoVisible(this.selectedAlgorithm)) this.renderer.compareToggleAlgo(this.selectedAlgorithm);
    this.showUserPath = true;
    this.showAlgoPath = false;
    this.renderer.renderCompare();
  }

  vizEnd(): void {
    // Fast-forward: stop timer, step to completion without rendering each step
    this.stopRace();
    if (this.raceAlgo && !this.raceAlgo.isDone()) {
      while (!this.raceAlgo.isDone()) {
        const events = this.raceAlgo.step();
        for (const ev of events) {
          if (ev.type === EventType.OPEN_ADD || ev.type === EventType.CLOSE_ADD || ev.type === EventType.SET_CURRENT) {
            this.renderer.compareAddCell(this.raceAlgoKey, (ev as any).node);
          }
          if (ev.type === EventType.FOUND_PATH) {
            this.renderer.compareSetPath(this.raceAlgoKey, (ev as any).path);
          }
        }
      }
    }
    this.raceAlgo = null;
    // Show both
    if (!this.renderer.isCompareAlgoVisible('user')) this.renderer.compareToggleAlgo('user');
    if (!this.renderer.isCompareAlgoVisible(this.selectedAlgorithm)) this.renderer.compareToggleAlgo(this.selectedAlgorithm);
    this.showUserPath = true;
    this.showAlgoPath = true;
    this.renderer.renderCompare();
  }

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
      const renderState = this.renderer.getRenderState();
      renderState.path = pathSet;
      this.renderer.render();
    }
  }
}
