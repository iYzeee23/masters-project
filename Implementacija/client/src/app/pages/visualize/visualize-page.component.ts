import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

import { GridComponent } from '../../components/grid/grid.component';
import { ToolbarComponent } from '../../components/toolbar/toolbar.component';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';
import { VisualizationService } from '../../services/visualization.service';
import { ExportService } from '../../services/export.service';
import { AIService } from '../../services/ai.service';
import { GridService } from '../../services/grid.service';
import { AlgorithmResult, CellType } from '@shared/types';

@Component({
  selector: 'app-visualize-page',
  standalone: true,
  imports: [CommonModule, GridComponent, ToolbarComponent],
  template: `
    <app-toolbar></app-toolbar>
    <div style="display: flex; justify-content: center; align-items: start; padding: 20px 24px; min-height: calc(100vh - 140px);">
      <div style="display: grid; grid-template-columns: 120px auto 120px; gap: 70px; align-items: start;">

      <!-- ═══ LEFT: Color Legend ═══ -->
      <div
        #legendPanel
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

        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(126,200,86,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.background]="isDark ? '#7EC856' : '#4A8C2A'" style="width: 10px; height: 10px; border-radius: 50%;"></div>
          <span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.start') }}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(232,116,97,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.background]="isDark ? '#E87461' : '#D05040'" style="width: 10px; height: 10px; border-radius: 50%;"></div>
          <span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.goal') }}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(158,128,110,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.background]="isDark ? '#9E806E' : '#8B7262'" style="width: 10px; height: 10px; border-radius: 50%;"></div>
          <span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.wall') }}</span>
        </div>

        <div [style.background]="isDark ? '#4A3D32' : '#D7CABC'" style="height: 1px; opacity: 0.3;"></div>

        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(91,168,212,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.background]="isDark ? '#5BA8D4' : '#4A9AC7'" style="width: 10px; height: 10px; border-radius: 50%;"></div>
          <span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.open') }}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(155,126,212,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.background]="isDark ? '#9B7ED4' : '#7C5FB8'" style="width: 10px; height: 10px; border-radius: 50%;"></div>
          <span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.closed') }}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(232,124,160,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.background]="isDark ? '#E87CA0' : '#D4688A'" style="width: 10px; height: 10px; border-radius: 50%;"></div>
          <span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.current') }}</span>
        </div>
        <div style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 0; border-radius: 10px; background: rgba(232,184,77,0.08); transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.04)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.background]="isDark ? '#E8B84D' : '#D4952C'" style="width: 10px; height: 10px; border-radius: 50%;"></div>
          <span [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'" style="font-size: 13px; font-weight: 500;">{{ i18n.t('legend.path') }}</span>
        </div>
      </div>

      <!-- ═══ CENTER: Grid ═══ -->
      <div>
        <app-grid></app-grid>
      </div>

      <!-- ═══ RIGHT: Metrics + Export ═══ -->
      <div
        [style.background]="isDark
          ? 'linear-gradient(180deg, #3D3128 0%, #352A21 100%)'
          : 'linear-gradient(180deg, #FFF9F2 0%, #F5EFE7 100%)'"
        [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
        [style.box-shadow]="isDark
          ? '0 12px 80px rgba(0,0,0,0.6), 0 4px 30px rgba(0,0,0,0.4), 0 0 0 1px #554536'
          : '0 12px 80px rgba(0,0,0,0.2), 0 4px 30px rgba(0,0,0,0.12), 0 0 0 1px #D7CABC'"
        [style.opacity]="metrics ? '1' : '0.4'"
        [style.height.px]="gridHeight"

        style="border-radius: 20px; padding: 14px 14px; display: flex; flex-direction: column; justify-content: space-evenly; box-sizing: border-box; overflow: hidden; transition: opacity 0.3s ease;"
      >
        <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700; text-align: center;">
          {{ i18n.t('legend.metrics') }}
        </div>

        <!-- Nodes -->
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em;">
            {{ metrics?.expandedCount ?? 0 }}
          </div>
          <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">
            {{ i18n.t('toolbar.nodes') }}
          </div>
        </div>
        <!-- Cost -->
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em;">
            {{ !metrics || metrics.cost === Infinity ? '—' : (metrics.cost | number: '1.1-1') }}
          </div>
          <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">
            {{ i18n.t('toolbar.cost') }}
          </div>
        </div>
        <!-- Path Length -->
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em;">
            {{ metrics?.path?.length ?? '—' }}
          </div>
          <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">
            {{ i18n.t('legend.length') }}
          </div>
        </div>
        <!-- Time -->
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 22px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: -0.02em;">
            {{ executionTime }}
          </div>
          <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">
            {{ i18n.t('legend.time') }}
          </div>
        </div>
        <!-- Path found -->
        <div style="text-align: center; transition: transform 0.2s ease; cursor: default;" onmouseenter="this.style.transform='scale(1.06)'" onmouseleave="this.style.transform='scale(1)'">
          <div [style.color]="!metrics ? '#78716c' : metrics.path ? '#4ade80' : '#fb7185'" style="font-size: 22px;">
            {{ !metrics ? '○' : metrics.path ? '●' : '○' }}
          </div>
          <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 13px; text-transform: capitalize; letter-spacing: 0.02em; margin-top: 2px; font-weight: 500;">
            {{ i18n.t('legend.found') }}
          </div>
        </div>

        <!-- Export -->
        <div style="display: flex; flex-direction: column; gap: 6px;">
          <button
            (click)="onExportJSON()"
            [disabled]="!metrics"
            [style.background]="isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.06)'"
            [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'"
            [style.border]="isDark ? '1px solid rgba(74,61,50,0.5)' : '1px solid rgba(215,202,188,0.8)'"
            [style.opacity]="!metrics ? '0.3' : '1'"
            style="padding: 7px 0; border-radius: 10px; width: 100%; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
          >
            JSON ↓
          </button>
          <button
            (click)="onExportCSV()"
            [disabled]="!metrics"
            [style.background]="isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.06)'"
            [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'"
            [style.border]="isDark ? '1px solid rgba(74,61,50,0.5)' : '1px solid rgba(215,202,188,0.8)'"
            [style.opacity]="!metrics ? '0.3' : '1'"
            style="padding: 7px 0; border-radius: 10px; width: 100%; font-size: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
          >
            CSV ↓
          </button>
        </div>
      </div>
      </div>
    </div>
  `,
})
export class VisualizePageComponent implements OnDestroy {
  isDark = true;
  metrics: AlgorithmResult | null = null;
  Infinity = Infinity;
  gridHeight = 0;
  executionTime = '—';
  private subs: Subscription[] = [];

  constructor(
    private themeService: ThemeService,
    public i18n: TranslationService,
    private vizService: VisualizationService,
    private exportService: ExportService,
    private gridService: GridService,
  ) {
    // Calculate grid height immediately from existing grid or defaults
    this.gridHeight = this.calcGridHeight(this.gridService.getGrid()?.rows ?? 25, this.gridService.getGrid()?.cols ?? 50);

    this.subs.push(
      this.themeService.theme$.subscribe((t) => (this.isDark = t === 'dark')),
      this.vizService.metrics$.subscribe((m) => (this.metrics = m)),
      this.vizService.executionTimeMs$.subscribe((ms) => {
        this.executionTime = ms > 0 ? (ms < 1 ? '<1ms' : Math.round(ms) + 'ms') : '—';
      }),
      this.gridService.grid$.subscribe((grid) => {
        if (grid) {
          this.gridHeight = this.calcGridHeight(grid.rows, grid.cols);
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
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

  onExportJSON(): void {
    if (!this.metrics) return;
    const grid = this.gridService.getGrid();
    this.exportService.addRun({
      algorithm: '',
      heuristic: '',
      neighborMode: 4,
      expandedNodes: this.metrics.expandedCount,
      maxFrontierSize: this.metrics.maxFrontierSize,
      pathCost: this.metrics.cost === Infinity ? null : this.metrics.cost,
      pathLength: this.metrics.path?.length ?? null,
      totalSteps: this.metrics.totalSteps,
      executionTimeMs: this.vizService.executionTimeMs$.value,
      foundPath: !!this.metrics.path,
      mapRows: grid?.rows ?? 0,
      mapCols: grid?.cols ?? 0,
      wallCount: this.countCells(grid, 'wall'),
      weightedCount: this.countCells(grid, 'weighted'),
      timestamp: new Date().toISOString(),
    });
    this.exportService.exportJSON();
  }

  onExportCSV(): void {
    if (!this.metrics) return;
    const grid = this.gridService.getGrid();
    this.exportService.addRun({
      algorithm: '',
      heuristic: '',
      neighborMode: 4,
      expandedNodes: this.metrics.expandedCount,
      maxFrontierSize: this.metrics.maxFrontierSize,
      pathCost: this.metrics.cost === Infinity ? null : this.metrics.cost,
      pathLength: this.metrics.path?.length ?? null,
      totalSteps: this.metrics.totalSteps,
      executionTimeMs: this.vizService.executionTimeMs$.value,
      foundPath: !!this.metrics.path,
      mapRows: grid?.rows ?? 0,
      mapCols: grid?.cols ?? 0,
      wallCount: this.countCells(grid, 'wall'),
      weightedCount: this.countCells(grid, 'weighted'),
      timestamp: new Date().toISOString(),
    });
    this.exportService.exportCSV();
  }

  private countCells(grid: any, type: 'wall' | 'weighted'): number {
    if (!grid) return 0;
    let count = 0;
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++) {
        if (type === 'wall' && grid.cells[r][c].type === CellType.WALL) count++;
        if (type === 'weighted' && grid.cells[r][c].weight > 1) count++;
      }
    return count;
  }
}
