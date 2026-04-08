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

type PopupType = 'algorithm' | 'tools' | 'speed' | 'settings' | 'ai' | 'generators' | 'actions' | null;

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- TOOLBAR -->
    <div [style.background]="isDark
           ? 'linear-gradient(180deg, #3D3128 0%, #352A21 100%)'
           : 'linear-gradient(180deg, #FFF9F2 0%, #F5EFE7 100%)'"
      [style.border-bottom]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
      [style.box-shadow]="isDark
        ? '0 6px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)'
        : '0 4px 24px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)'"
      class="relative z-20 transition-all duration-300"
      style="padding: 14px 48px;">

      <div class="flex items-center justify-center gap-6 mx-auto flex-wrap">

        <!-- ═══ GROUP 1: Algorithm + AI ═══ -->
        <div class="flex items-center gap-2"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          style="padding: 6px 12px; border-radius: 16px;">

          <div class="relative" data-help="algorithm">
            <button (click)="togglePopup('algorithm')"
              [class]="toolbarBtnClass"
              class="flex items-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:scale-[1.03] cursor-pointer"
              style="padding: 8px 16px;">
              {{ getAlgoShortName() }}
              <svg style="width:10px;height:10px;opacity:0.35;" fill="currentColor" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4"/></svg>
            </button>
            <div *ngIf="activePopup === 'algorithm'" [class]="popupClass"
              class="absolute top-full left-0 mt-3 rounded-2xl animate-slide-down z-50" style="width: 240px; padding: 10px;">
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'"
                style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; padding: 8px 14px 8px;">
                {{ i18n.t('controls.algorithm') }}
              </div>
              <div *ngFor="let algo of algorithms" class="relative"
                (mouseenter)="hoveredAlgo = algo.value" (mouseleave)="hoveredAlgo = null">
                <button (click)="selectAlgorithm(algo.value)"
                  [style.background]="selectedAlgorithm === algo.value ? (isDark ? 'rgba(110,71,59,0.18)' : 'rgba(110,71,59,0.08)') : 'transparent'"
                  [style.color]="selectedAlgorithm === algo.value ? '#8B5E50' : (isDark ? '#EDE0D0' : '#4A3428')"
                  [style.font-weight]="selectedAlgorithm === algo.value ? '600' : '500'"
                  class="w-full text-left rounded-xl transition-all duration-150 cursor-pointer"
                  [class]="selectedAlgorithm !== algo.value ? (isDark ? 'hover:bg-[#3D3128]' : 'hover:bg-[#F5EFE7]') : ''"
                  style="padding: 10px 14px; font-size: 14px; display: flex; align-items: center; justify-content: space-between;">
                  <span>{{ algo.label }}</span>
                  <span *ngIf="selectedAlgorithm === algo.value" style="font-size: 10px; opacity: 0.5;">●</span>
                </button>
                <div *ngIf="hoveredAlgo === algo.value"
                  [style.background]="isDark ? '#2B211A' : '#FFF9F2'" [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
                  [style.color]="isDark ? '#A99888' : '#8B7A6B'" [style.box-shadow]="isDark ? '0 8px 32px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.08)'"
                  class="absolute z-[60] animate-fade-in"
                  style="left: calc(100% + 10px); top: 0; width: 260px; padding: 12px 16px; border-radius: 14px; font-size: 12px; line-height: 1.5; pointer-events: none;">
                  {{ i18n.t('algo.desc.' + algo.value) }}
                </div>
              </div>
            </div>
          </div>

          <div class="relative" data-help="ai">
            <button (click)="togglePopup('ai')"
              [style.background]="isDark ? 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(168,85,247,0.10))' : 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(168,85,247,0.06))'"
              [style.border]="isDark ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(139,92,246,0.2)'"
              class="flex items-center gap-2 rounded-xl text-sm font-semibold text-violet-400 transition-all duration-200 hover:scale-[1.04] cursor-pointer"
              style="padding: 8px 16px;">
              ✦ AI
              <svg style="width:10px;height:10px;opacity:0.35;" fill="currentColor" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4"/></svg>
            </button>
            <div *ngIf="activePopup === 'ai'" [class]="popupClass"
              class="absolute top-full left-0 mt-3 rounded-2xl animate-slide-down z-50" style="width: 420px; padding: 28px 28px;">
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; margin-bottom: 18px;">AI Assistant</div>
              <div class="flex gap-1.5" [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.4)'" [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="padding: 5px; border-radius: 14px; margin-bottom: 20px;">
                <button *ngFor="let tab of aiTabs" (click)="activeAiTab = tab.id"
                  [style.background]="activeAiTab === tab.id ? (isDark ? '#3D3128' : '#FFFCF8') : 'transparent'"
                  [style.color]="activeAiTab === tab.id ? (isDark ? '#EDE0D0' : '#4A3428') : (isDark ? '#8B7A6B' : '#A89888')"
                  [style.font-weight]="activeAiTab === tab.id ? '600' : '400'"
                  [style.box-shadow]="activeAiTab === tab.id ? (isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 6px rgba(0,0,0,0.06)') : 'none'"
                  style="flex: 1; padding: 9px 12px; border-radius: 10px; font-size: 12px; cursor: pointer; transition: all 0.2s; border: none;">
                  {{ tab.label }} {{ tab.name }}</button>
              </div>
              <div *ngIf="activeAiTab === 'tutor'" [style.border-top]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="padding-top: 20px;">
                <button (click)="runTutor()" [disabled]="loadingAi" [style.opacity]="loadingAi ? '0.4' : '1'"
                  style="width: 100%; padding: 14px; border-radius: 14px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; background: linear-gradient(135deg, #7C3AED, #9333EA); color: white;">
                  {{ loadingAi ? i18n.t('toolbar.analyzing') : i18n.t('toolbar.analyzeSteps') }}</button>
              </div>
              <div *ngIf="activeAiTab === 'generate'" [style.border-top]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="padding-top: 20px;">
                <textarea [(ngModel)]="aiPrompt" rows="3" [placeholder]="i18n.t('toolbar.aiPlaceholder')"
                  [style.background-color]="isDark ? '#3D3128' : '#F5EFE7'" [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
                  style="width: 100%; border-radius: 14px; padding: 14px 16px; font-size: 13px; resize: none; outline: none; font-family: inherit; line-height: 1.5;"></textarea>
                <button (click)="runGenerate()" [disabled]="loadingAi || !aiPrompt.trim()" [style.opacity]="(loadingAi || !aiPrompt.trim()) ? '0.4' : '1'"
                  style="width: 100%; margin-top: 14px; padding: 14px; border-radius: 14px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; background: linear-gradient(135deg, #7C3AED, #9333EA); color: white;">
                  {{ loadingAi ? i18n.t('toolbar.generating') : i18n.t('toolbar.generateMap') }}</button>
              </div>
              <div *ngIf="activeAiTab === 'recommend'" [style.border-top]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="padding-top: 20px;">
                <button (click)="runRecommend()" [disabled]="loadingAi" [style.opacity]="loadingAi ? '0.4' : '1'"
                  style="width: 100%; padding: 14px; border-radius: 14px; font-size: 13px; font-weight: 600; border: none; cursor: pointer; background: linear-gradient(135deg, #7C3AED, #9333EA); color: white;">
                  {{ loadingAi ? i18n.t('toolbar.analyzing') : i18n.t('toolbar.recommendAlgo') }}</button>
                <div *ngIf="recommendation" style="margin-top: 18px;">
                  <div [style.background]="isDark ? '#3D3128' : '#F5EFE7'" [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="border-radius: 14px; padding: 14px 16px; margin-bottom: 10px;">
                    <span style="color: #22C55E; font-weight: 600; font-size: 12px;">{{ i18n.t('toolbar.best') }}</span>
                    <span [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="margin-left: 10px; font-size: 13px;">{{ recommendation.best.algorithm }}</span></div>
                  <div [style.background]="isDark ? '#3D3128' : '#F5EFE7'" [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="border-radius: 14px; padding: 14px 16px;">
                    <span style="color: #F43F5E; font-weight: 600; font-size: 12px;">{{ i18n.t('toolbar.worst') }}</span>
                    <span [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="margin-left: 10px; font-size: 13px;">{{ recommendation.worst.algorithm }}</span></div>
                </div>
              </div>
              <p *ngIf="aiError" style="color: #F43F5E; font-size: 12px; margin-top: 16px;">{{ aiError }}</p>
            </div>
          </div>
        </div>

        <!-- ═══ GROUP 2: Playback ═══ -->
        <div class="flex items-center gap-2" data-help="playback"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          style="padding: 6px 12px; border-radius: 16px;">
          <button (click)="onVisualize()" [disabled]="vizState === 'running'"
            class="text-white rounded-xl text-sm font-semibold tracking-wide transition-all duration-200 disabled:opacity-30 hover:scale-[1.04] active:scale-[0.97] cursor-pointer"
            style="padding: 8px 22px; background: linear-gradient(135deg, #6E473B, #8B5E50); box-shadow: 0 4px 16px rgba(110,71,59,0.3), inset 0 1px 0 rgba(255,255,255,0.1);">
            {{ i18n.t('toolbar.play') }}</button>
          <button (click)="onPause()" [disabled]="vizState !== 'running'" [class]="toolbarBtnClass"
            class="rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] cursor-pointer" style="padding: 8px 14px;">{{ i18n.t('toolbar.pause') }}</button>
          <button (click)="onStep()" [disabled]="vizState === 'running' || vizState === 'finished'" [class]="toolbarBtnClass"
            class="rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] cursor-pointer" style="padding: 8px 14px;">{{ i18n.t('toolbar.step') }}</button>
          <button (click)="onSkipToEnd()" [disabled]="vizState === 'finished'" [class]="toolbarBtnClass"
            class="rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] cursor-pointer" style="padding: 8px 14px;">{{ i18n.t('toolbar.end') }}</button>
        </div>

        <!-- ═══ GROUP 3: Tools + Speed + Settings ═══ -->
        <div class="flex items-center gap-2"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          style="padding: 6px 12px; border-radius: 16px;">
          <div class="relative" data-help="tools">
            <button (click)="togglePopup('tools')" [class]="activePopup === 'tools' ? activeBtnClass : toolbarBtnClass"
              class="flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] cursor-pointer" style="padding: 8px 16px;">
              {{ getActiveToolIcon() }} {{ getActiveToolLabel() }}
              <svg style="width:10px;height:10px;opacity:0.35;" fill="currentColor" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4"/></svg></button>
            <div *ngIf="activePopup === 'tools'" [class]="popupClass"
              class="absolute top-full left-0 mt-3 w-60 rounded-2xl animate-slide-down z-50" style="padding: 10px;">
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; padding: 8px 14px 6px;">{{ i18n.t('controls.tools') }}</div>
              <button *ngFor="let tool of toolsList" (click)="selectTool(tool.value)"
                [style.background]="activeTool === tool.value ? (isDark ? 'rgba(110,71,59,0.15)' : 'rgba(110,71,59,0.08)') : ''"
                [class]="activeTool !== tool.value ? (isDark ? 'hover:bg-[#3D3128]' : 'hover:bg-[#F5EFE7]') : ''"
                class="w-full text-left rounded-xl flex items-center gap-3 transition-all cursor-pointer" style="padding: 10px 14px; margin-bottom: 2px;">
                <span style="font-size: 16px; opacity: 0.7;">{{ tool.icon }}</span>
                <span [style.color]="activeTool === tool.value ? '#8B5E50' : (isDark ? '#EDE0D0' : '#4A3428')" style="font-size: 13px; font-weight: 500;">{{ tool.label }}</span></button>
              <div *ngIf="activeTool === 'weight'" [style.border-top]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="margin-top: 8px; padding: 12px 14px 6px;">
                <div class="flex items-center gap-3">
                  <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 12px;">Weight</span>
                  <input type="range" [(ngModel)]="weightValue" [min]="2" [max]="10" [step]="1" class="flex-1 accent-rose-500" />
                  <span [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 13px; font-weight: 600;">{{ weightValue }}</span></div>
              </div>
            </div>
          </div>
          <div class="relative" data-help="speed">
            <button (click)="togglePopup('speed')" [class]="toolbarBtnClass"
              class="flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] cursor-pointer" style="padding: 8px 16px;">
              ⚡ {{ speed }}ms
              <svg style="width:10px;height:10px;opacity:0.35;" fill="currentColor" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4"/></svg></button>
            <div *ngIf="activePopup === 'speed'" [class]="popupClass"
              class="absolute top-full left-0 mt-3 w-80 rounded-2xl animate-slide-down z-50" style="padding: 20px 22px;">
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; margin-bottom: 12px;">{{ i18n.t('toolbar.animSpeed') }}</div>
              <div class="flex items-center gap-3">
                <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 11px;">1</span>
                <input type="range" [(ngModel)]="speed" (ngModelChange)="onSpeedChange($event)" [min]="1" [max]="200" [step]="1" class="flex-1 accent-rose-500" />
                <span [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 12px; font-weight: 600; min-width: 32px; text-align: right;">{{ speed }}ms</span></div>
              <div *ngIf="totalSteps > 0" [style.border-top]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="margin-top: 16px; padding-top: 16px;">
                <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; margin-bottom: 12px;">{{ i18n.t('controls.step') }}</div>
                <div class="flex items-center gap-3">
                  <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 11px;">0</span>
                  <input type="range" [ngModel]="currentStep" (ngModelChange)="onJumpToStep($event)" [min]="0" [max]="totalSteps" class="flex-1 accent-rose-500" />
                  <span [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 12px; font-weight: 600; min-width: 48px; text-align: right;">{{ currentStep }}/{{ totalSteps }}</span></div>
              </div>
            </div>
          </div>
          <div class="relative" data-help="settings">
            <button (click)="togglePopup('settings')" [class]="toolbarBtnClass"
              class="flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] cursor-pointer" style="padding: 8px 16px;">
              ⚙ {{ i18n.t('toolbar.settings').replace('⚙ ', '') }}
              <svg style="width:10px;height:10px;opacity:0.35;" fill="currentColor" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4"/></svg></button>
            <div *ngIf="activePopup === 'settings'" [class]="popupClass"
              class="absolute top-full left-0 mt-3 w-80 rounded-2xl animate-slide-down z-50" style="padding: 20px 22px;">
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; margin-bottom: 10px;">{{ i18n.t('controls.heuristic') }}</div>
              <select [(ngModel)]="selectedHeuristic" [disabled]="!needsHeuristic()"
                [style.background-color]="isDark ? '#3D3128' : '#F5EFE7'" [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" [style.color]="isDark ? '#EDE0D0' : '#4A3428'"
                style="width: 100%; border-radius: 12px; padding: 10px 14px; font-size: 13px; outline: none; cursor: pointer;" [style.opacity]="needsHeuristic() ? '1' : '0.3'">
                <option *ngFor="let h of heuristics" [value]="h.value">{{ h.label }}</option></select>
              <div [style.border-top]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="margin-top: 16px; padding-top: 16px;">
                <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; margin-bottom: 10px;">{{ i18n.t('controls.neighbors') }}</div>
                <div class="flex gap-2">
                  <button (click)="neighborMode = 4" [style.background]="neighborMode === 4 ? (isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.1)') : 'transparent'" [style.color]="neighborMode === 4 ? '#8B5E50' : (isDark ? '#8B7A6B' : '#A89888')" [style.border]="neighborMode === 4 ? '1px solid rgba(110,71,59,0.3)' : (isDark ? '1px solid #4A3D32' : '1px solid #D7CABC')" [style.font-weight]="neighborMode === 4 ? '600' : '400'" style="flex: 1; padding: 8px; border-radius: 10px; font-size: 12px; cursor: pointer; transition: all 0.2s;">{{ i18n.t('controls.directions4') }}</button>
                  <button (click)="neighborMode = 8" [style.background]="neighborMode === 8 ? (isDark ? 'rgba(110,71,59,0.2)' : 'rgba(110,71,59,0.1)') : 'transparent'" [style.color]="neighborMode === 8 ? '#8B5E50' : (isDark ? '#8B7A6B' : '#A89888')" [style.border]="neighborMode === 8 ? '1px solid rgba(110,71,59,0.3)' : (isDark ? '1px solid #4A3D32' : '1px solid #D7CABC')" [style.font-weight]="neighborMode === 8 ? '600' : '400'" style="flex: 1; padding: 8px; border-radius: 10px; font-size: 12px; cursor: pointer; transition: all 0.2s;">{{ i18n.t('controls.directions8') }}</button></div>
              </div>
              <div *ngIf="isSwarmFamily()" [style.border-top]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="margin-top: 16px; padding-top: 16px;">
                <div class="flex items-center justify-between" style="margin-bottom: 10px;">
                  <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600;">{{ i18n.t('controls.swarmWeight') }}</span>
                  <span [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 13px; font-weight: 600;">{{ swarmWeight }}</span></div>
                <input type="range" [(ngModel)]="swarmWeight" [min]="1.1" [max]="10" [step]="0.1" class="w-full accent-rose-500" />
              </div>
            </div>
          </div>
        </div>

        <!-- ═══ GROUP 4: Maps + Grid ═══ -->
        <div class="flex items-center gap-2"
          [style.background]="isDark ? 'rgba(53,42,33,0.5)' : 'rgba(237,228,216,0.5)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'"
          style="padding: 6px 12px; border-radius: 16px;">
          <div class="relative" data-help="maps">
            <button (click)="togglePopup('generators')" [class]="toolbarBtnClass"
              class="flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] cursor-pointer" style="padding: 8px 16px;">
              🗺 {{ lastGeneratorShort || i18n.t('toolbar.maps').replace('🗺 ', '') }}
              <svg style="width:10px;height:10px;opacity:0.35;" fill="currentColor" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4"/></svg></button>
            <div *ngIf="activePopup === 'generators'" [class]="popupClass"
              class="absolute top-full right-0 mt-3 w-72 rounded-2xl animate-slide-down z-50" style="padding: 10px;">
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; padding: 8px 14px 6px;">{{ i18n.t('toolbar.maps').replace('🗺 ', '') }}</div>
              <button *ngFor="let gen of generators" (click)="applyGenerator(gen.type)"
                [class]="isDark ? 'w-full text-left rounded-xl hover:bg-[#3D3128] transition-all cursor-pointer' : 'w-full text-left rounded-xl hover:bg-[#F5EFE7] transition-all cursor-pointer'"
                [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="padding: 10px 14px; font-size: 13px; font-weight: 500; margin-bottom: 2px;">{{ gen.name }}</button>
              <div [style.border-top]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="margin-top: 6px; padding: 12px 14px 6px;">
                <div class="flex items-center gap-3">
                  <span [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 11px;">{{ i18n.t('toolbar.density') }}</span>
                  <input type="range" [(ngModel)]="genDensity" [min]="10" [max]="50" class="flex-1 accent-rose-500" />
                  <span [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="font-size: 12px; font-weight: 600;">{{ genDensity }}%</span></div>
              </div>
            </div>
          </div>
          <div class="relative">
            <button (click)="togglePopup('actions')" [class]="toolbarBtnClass"
              class="flex items-center gap-2 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.03] cursor-pointer" style="padding: 8px 16px;">
              Grid
              <svg style="width:10px;height:10px;opacity:0.35;" fill="currentColor" viewBox="0 0 10 6"><path d="M1 1l4 4 4-4"/></svg></button>
            <div *ngIf="activePopup === 'actions'" [class]="popupClass"
              class="absolute top-full right-0 mt-3 w-52 rounded-2xl animate-slide-down z-50" style="padding: 10px;">
              <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; padding: 8px 14px 6px;">Grid</div>
              <button (click)="onReset(); activePopup = null"
                [class]="isDark ? 'w-full text-left rounded-xl flex items-center gap-3 hover:bg-[#3D3128] transition-all cursor-pointer' : 'w-full text-left rounded-xl flex items-center gap-3 hover:bg-[#F5EFE7] transition-all cursor-pointer'"
                [style.color]="isDark ? '#EDE0D0' : '#4A3428'" style="padding: 10px 14px; font-size: 13px; font-weight: 500;">
                {{ i18n.t('toolbar.reset') }}</button>
              <button (click)="onClearGrid(); activePopup = null"
                style="padding: 10px 14px; font-size: 13px; font-weight: 500; color: #F43F5E; opacity: 0.7; width: 100%; text-align: left; border-radius: 12px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all 0.2s; border: none; background: transparent;"
                onmouseover="this.style.opacity='1'; this.style.background='rgba(244,63,94,0.08)'" onmouseout="this.style.opacity='0.7'; this.style.background='transparent'">
                {{ i18n.t('toolbar.clear') }}</button>
            </div>
          </div>
        </div>

        <!-- ═══ METRICS ═══ -->
        <div *ngIf="metrics" class="flex items-center gap-6 animate-fade-in"
          [style.background]="isDark ? 'rgba(74,61,50,0.45)' : 'rgba(245,239,231,0.6)'"
          [style.border]="isDark ? '1px solid #4A3D32' : '1px solid #D7CABC'" style="padding: 8px 20px; border-radius: 16px;">
          <div class="text-center" style="min-width: 48px;">
            <div [class]="isDark ? 'text-sm font-semibold text-stone-200 tabular-nums' : 'text-sm font-semibold text-stone-800 tabular-nums'">{{ metrics.expandedCount }}</div>
            <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px;">{{ i18n.t('toolbar.nodes') }}</div></div>
          <div [style.background]="isDark ? '#4A3D32' : '#D7CABC'" style="width: 1px; height: 24px;"></div>
          <div class="text-center" style="min-width: 48px;">
            <div [class]="isDark ? 'text-sm font-semibold text-stone-200 tabular-nums' : 'text-sm font-semibold text-stone-800 tabular-nums'">{{ metrics.cost === Infinity ? '—' : (metrics.cost | number:'1.1-1') }}</div>
            <div [style.color]="isDark ? '#8B7A6B' : '#A89888'" style="font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px;">{{ i18n.t('toolbar.cost') }}</div></div>
          <div [class]="metrics.path ? 'text-emerald-400' : 'text-rose-400'" style="font-size: 14px;">{{ metrics.path ? '●' : '○' }}</div>
          <button (click)="onExportJSON()" [style.color]="isDark ? '#8B7A6B' : '#A89888'" class="text-xs hover:opacity-70 transition-all cursor-pointer" style="padding: 4px 8px;">{{ i18n.t('toolbar.export') }}</button>
        </div>

      </div>
    </div>
    <div *ngIf="activePopup" class="fixed inset-0 z-10" (click)="activePopup = null"></div>

  `,
})
export class ToolbarComponent implements OnDestroy {
  isDark = true;
  activePopup: PopupType = null;
  hoveredAlgo: string | null = null;
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
  lastGeneratorShort = '';

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
    return this.toolbarBtnClass;
  }

  get toolbarBtnClass(): string {
    return this.isDark
      ? 'text-[#D3C3B0] hover:text-[#EDE0D0] hover:bg-[#4A3D32] border border-[#4A3D32] hover:border-[#5D4E40] disabled:opacity-30 disabled:hover:bg-transparent'
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
      ? 'bg-[#322820] border border-[#4A3D32] shadow-[0_12px_48px_rgba(0,0,0,0.5),0_4px_16px_rgba(0,0,0,0.3)]'
      : 'bg-[#FFFCF8] border border-[#D7CABC] shadow-[0_12px_48px_rgba(0,0,0,0.08),0_4px_16px_rgba(0,0,0,0.04)]';
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
    this.lastGeneratorShort = GENERATOR_INFO[type].short;
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
