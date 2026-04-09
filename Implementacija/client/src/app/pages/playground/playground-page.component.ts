import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { GridService } from '../../services/grid.service';
import { GridRendererService } from '../../services/grid-renderer.service';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { SocketService } from '../../services/socket.service';
import { ExportService } from '../../services/export.service';
import { GridComponent } from '../../components/grid/grid.component';
import { generateMap, GeneratorType } from '../../generators';
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

    <!-- ═══ GRID (centered with sidebars) ═══ -->
    <div style="display: flex; justify-content: center; align-items: start; padding: 20px 24px;" [style.min-height]="result ? 'auto' : 'calc(100vh - 200px)'">
      <div style="display: grid; grid-template-columns: 120px auto 120px; gap: 70px; align-items: start;">

      <!-- LEFT: Legend (full) -->
      <div
        [style.background]="isDark ? 'linear-gradient(180deg, #3D3128 0%, #352A21 100%)' : 'linear-gradient(180deg, #FFF9F2 0%, #F5EFE7 100%)'"
        [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
        [style.box-shadow]="isDark ? '0 12px 80px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4), 0 0 0 1px #554536' : '0 12px 80px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.12), 0 0 0 1px #D7CABC'"
        [style.height.px]="gridHeight"
        style="border-radius: 20px; padding: 14px 14px; display: flex; flex-direction: column; justify-content: space-evenly; box-sizing: border-box; overflow: hidden;"
      >
        <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.16em; font-weight: 700; text-align: center;">{{ i18n.t('legend.title') }}</div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(126,200,86,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#7EC856' : '#4A8C2A'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.start') }}</span></div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(232,116,97,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#E87461' : '#D05040'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.goal') }}</span></div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(158,128,110,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#9E806E' : '#8B7262'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.wall') }}</span></div>
        <div [style.background]="isDark ? '#4A3D32' : '#D7CABC'" style="height: 1px; opacity: 0.3;"></div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(91,168,212,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#5BA8D4' : '#4A9AC7'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.open') }}</span></div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(155,126,212,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#9B7ED4' : '#7C5FB8'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.closed') }}</span></div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(232,184,77,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#E8B84D' : '#D4952C'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.current') }}</span></div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(232,124,160,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'"><div [style.background]="isDark ? '#E87CA0' : '#D4688A'" style="width: 10px; height: 10px; border-radius: 50%;"></div><span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.path') }}</span></div>
      </div>

      <!-- CENTER: Grid -->
      <div>
        <app-grid [mode]="'playground'" (cellClicked)="onPathCellClick($event)"></app-grid>
      </div>

      <!-- RIGHT: Playground Stats + Export -->
      <div
        [style.background]="isDark ? 'linear-gradient(180deg, #3D3128 0%, #352A21 100%)' : 'linear-gradient(180deg, #FFF9F2 0%, #F5EFE7 100%)'"
        [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
        [style.box-shadow]="isDark ? '0 12px 80px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4), 0 0 0 1px #554536' : '0 12px 80px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.12), 0 0 0 1px #D7CABC'"
        [style.opacity]="isSubmitted ? '1' : '0.4'"
        [style.height.px]="gridHeight"
        style="border-radius: 20px; padding: 14px 14px; display: flex; flex-direction: column; justify-content: space-evenly; box-sizing: border-box; overflow: hidden; transition: opacity 0.3s ease;"
      >
        <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; text-align: center;">{{ i18n.t('legend.metrics') }}</div>
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'"><div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums;">{{ userPath.length }}</div><div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">{{ i18n.t('legend.length') }}</div></div>
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'"><div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums;">{{ result?.userCost ?? '—' }}</div><div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">{{ i18n.t('toolbar.cost') }}</div></div>
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'"><div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums;">{{ result?.optimalCost ?? '—' }}</div><div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">{{ i18n.t('toolbar.nodes') }}</div></div>
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'"><div [style.color]="!result ? '#78716c' : result.score >= 80 ? '#4ade80' : result.score >= 50 ? '#E8B84D' : '#fb7185'" style="font-size: 28px; font-weight: 800;">{{ result?.score ?? '—' }}</div><div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">{{ i18n.t('legend.found') }}</div></div>
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button (click)="onExportJSON()" [disabled]="!result" [style.background]="isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.06)'" [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" [style.border]="isDark ? '1px solid rgba(74,61,50,0.5)' : '1px solid rgba(215,202,188,0.8)'" [style.opacity]="!result ? '0.3' : '1'" style="padding: 7px 0; border-radius: 10px; width: 100%; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s;">JSON ↓</button>
          <button (click)="onExportCSV()" [disabled]="!result" [style.background]="isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.06)'" [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" [style.border]="isDark ? '1px solid rgba(74,61,50,0.5)' : '1px solid rgba(215,202,188,0.8)'" [style.opacity]="!result ? '0.3' : '1'" style="padding: 7px 0; border-radius: 10px; width: 100%; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s;">CSV ↓</button>
        </div>
      </div>
      </div>
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

    <!-- ═══ MINI LEADERBOARD ═══ -->
    @if (leaderboard.length > 0) {
      <div style="padding: 0 48px 40px;">
        <div
          [style.background]="isDark ? '#3D3128' : '#FFFCF8'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          [style.box-shadow]="
            isDark
              ? '0 8px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)'
              : '0 8px 32px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)'
          "
          style="border-radius: 20px; padding: 24px; max-width: 600px; margin: 0 auto;"
        >
          <h3
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
            style="font-size: 14px; font-weight: 700; margin: 0 0 16px 0; text-align: center;"
          >
            {{ i18n.t('profile.leaderboard') }}
          </h3>
          @for (entry of leaderboard; track entry; let i = $index) {
            <div
              class="flex items-center gap-3"
              style="padding: 8px 12px; border-radius: 10px; transition: all 0.2s;"
              [style.background-color]="i === 0 ? (isDark ? '#443628' : '#EDE4D8') : 'transparent'"
            >
              <span
                style="font-size: 13px; font-weight: 700; width: 20px; text-align: center;"
                [style.color]="i === 0 ? (isDark ? '#C9A87C' : '#6E473B') : (isDark ? '#8B7460' : '#AE9D8D')"
              >{{ i + 1 }}</span>
              <span
                style="flex: 1; font-size: 13px; font-weight: 500;"
                [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
              >{{ entry.username }}</span>
              <span
                style="font-size: 13px; font-weight: 700;"
                [style.color]="isDark ? '#C9A87C' : '#6E473B'"
              >{{ entry.totalScore }}</span>
            </div>
          }
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
  leaderboard: any[] = [];
  gridHeight = 0;
  private startTime = 0;
  private subs: Subscription[] = [];

  constructor(
    private gridService: GridService,
    private renderer: GridRendererService,
    private themeService: ThemeService,
    private apiService: ApiService,
    private authService: AuthService,
    private socketService: SocketService,
    private exportService: ExportService,
    public i18n: TranslationService,
  ) {}

  ngOnInit(): void {
    this.generateChallenge();
    this.startTime = performance.now();
    this.gridHeight = this.calcGridHeight(25, 50);
    this.subs.push(
      this.themeService.theme$.subscribe((t) => (this.isDark = t === 'dark')),
      this.gridService.grid$.subscribe((grid) => {
        if (grid) {
          this.gridHeight = this.calcGridHeight(grid.rows, grid.cols);
        }
      }),
    );

    // Load leaderboard and connect socket for live updates
    this.loadLeaderboard();
    this.socketService.connect();
    this.subs.push(
      this.socketService.leaderboardUpdate$.subscribe(() => this.loadLeaderboard()),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.socketService.disconnect();
  }

  private calcGridHeight(rows: number, cols: number): number {
    const headerToolbar = 140;
    const shadowPadding = 100;
    const availableWidth = window.innerWidth - shadowPadding;
    const availableHeight = window.innerHeight - headerToolbar - shadowPadding;
    const cellW = Math.floor(availableWidth / cols);
    const cellH = Math.floor(availableHeight / rows);
    const cellSize = Math.max(10, Math.min(28, cellW, cellH));
    return rows * cellSize;
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

  /**
   * Handle cell clicks in playground mode — build/toggle path cells.
   */
  onPathCellClick(pos: Position): void {
    if (this.isSubmitted) return;

    const grid = this.gridService.getGrid();
    if (!grid) return;

    const cell = grid.cells[pos.row][pos.col];

    // Don't allow clicking on walls
    if (cell.type === CellType.WALL) return;

    const key = posKey(pos);

    // If clicking the last cell in path, undo it
    if (this.userPath.length > 0 && posEqual(this.userPath[this.userPath.length - 1], pos)) {
      this.userPath.pop();
      this.renderUserPath();
      return;
    }

    // If path is empty, only allow start cell
    if (this.userPath.length === 0) {
      if (!posEqual(pos, grid.start)) return;
      this.userPath.push(pos);
      this.renderUserPath();
      return;
    }

    // Check adjacency: only allow cells adjacent to last cell in path
    const last = this.userPath[this.userPath.length - 1];
    const dr = Math.abs(pos.row - last.row);
    const dc = Math.abs(pos.col - last.col);
    if (dr > 1 || dc > 1 || (dr === 0 && dc === 0)) return;

    // Don't allow revisiting cells already in path
    const pathKeys = new Set(this.userPath.map(posKey));
    if (pathKeys.has(key)) return;

    this.userPath.push(pos);
    this.renderUserPath();
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

    this.submitToServer(true);
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
    let costPenalty: number;
    if (!optimal.path) {
      // No valid path exists but user submitted one — max penalty
      costPenalty = 50;
    } else {
      costPenalty = Math.min(50, Math.round(((userCost - optimal.cost) / Math.max(optimal.cost, 1)) * 100));
    }
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

    this.submitToServer(false);
  }

  resetPlayground(): void {
    this.userPath = [];
    this.isSubmitted = false;
    this.result = null;
    this.generateChallenge();
    this.startTime = performance.now();
    this.renderer.resetVisualization();
  }

  private generateChallenge(): void {
    const types: GeneratorType[] = ['random', 'maze', 'weighted', 'bottleneck', 'city'];
    const type = types[Math.floor(Math.random() * types.length)];
    const grid = generateMap(type, 25, 50, { density: 25 + Math.floor(Math.random() * 20) });
    this.gridService.setGrid(grid);
  }

  onExportJSON(): void {
    if (!this.result) return;
    const grid = this.gridService.getGrid();
    this.exportService.addRun({
      algorithm: 'playground',
      heuristic: '',
      neighborMode: 4,
      expandedNodes: 0,
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
    this.exportService.addRun({
      algorithm: 'playground',
      heuristic: '',
      neighborMode: 4,
      expandedNodes: 0,
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

  private loadLeaderboard(): void {
    this.apiService.getLeaderboard().subscribe({
      next: (lb) => (this.leaderboard = lb.slice(0, 10)),
      error: () => {},
    });
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
