import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { HelperService, HelperStep } from '../../services/helper.service';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-helper-overlay',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- Backdrop -->
    <div *ngIf="isActive" class="fixed inset-0 bg-black/50 z-40" (click)="helper.stop()"></div>

    <!-- Tooltip -->
    <div *ngIf="isActive && step"
      class="fixed z-50 max-w-sm animate-fade-in"
      [style.top]="getPosition().top"
      [style.left]="getPosition().left"
      [style.right]="getPosition().right"
      [style.bottom]="getPosition().bottom">
      <div [class]="isDark
        ? 'bg-slate-800 border border-slate-600 rounded-xl p-5 shadow-2xl'
        : 'bg-white border border-slate-200 rounded-xl p-5 shadow-2xl'">

        <!-- Step indicator -->
        <div class="flex items-center justify-between mb-3">
          <span [class]="isDark ? 'text-xs text-slate-500' : 'text-xs text-slate-400'">
            {{ stepNumber }} / {{ totalSteps }}
          </span>
          <button (click)="helper.stop()"
            [class]="isDark ? 'text-slate-500 hover:text-slate-300 text-lg' : 'text-slate-400 hover:text-slate-600 text-lg'">
            ✕
          </button>
        </div>

        <!-- Title -->
        <h3 [class]="isDark ? 'text-base font-bold text-white mb-2' : 'text-base font-bold text-slate-900 mb-2'">
          {{ isEn ? step.titleEn : step.title }}
        </h3>

        <!-- Content -->
        <p [class]="isDark ? 'text-sm text-slate-300 leading-relaxed' : 'text-sm text-slate-600 leading-relaxed'">
          {{ isEn ? step.contentEn : step.content }}
        </p>

        <!-- Navigation -->
        <div class="flex items-center justify-between mt-4">
          <button *ngIf="!helper.isFirst()" (click)="helper.prev()"
            [class]="isDark
              ? 'px-3 py-1.5 rounded text-sm bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors'
              : 'px-3 py-1.5 rounded text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 transition-colors'">
            ← {{ isEn ? 'Back' : 'Nazad' }}
          </button>
          <div *ngIf="helper.isFirst()"></div>

          <button (click)="helper.next()"
            class="px-4 py-1.5 rounded text-sm bg-blue-600 hover:bg-blue-700 text-white font-medium transition-colors">
            {{ helper.isLast() ? (isEn ? 'Finish' : 'Završi') : (isEn ? 'Next' : 'Dalje') }} →
          </button>
        </div>

        <!-- Progress dots -->
        <div class="flex justify-center gap-1.5 mt-3">
          <span *ngFor="let s of dots; let i = index"
            class="w-1.5 h-1.5 rounded-full transition-colors"
            [class]="i < stepNumber
              ? 'bg-blue-500'
              : isDark ? 'bg-slate-600' : 'bg-slate-300'">
          </span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
  `],
})
export class HelperOverlayComponent implements OnDestroy {
  isActive = false;
  step: HelperStep | null = null;
  stepNumber = 0;
  totalSteps = 0;
  isDark = true;
  isEn = false;
  dots: number[] = [];

  private subs: Subscription[] = [];

  constructor(
    public helper: HelperService,
    private themeService: ThemeService,
    private i18n: TranslationService,
  ) {
    this.subs.push(
      this.helper.isActive$.subscribe(a => this.isActive = a),
      this.helper.currentStep$.subscribe(s => this.step = s),
      this.helper.stepNumber$.subscribe(n => this.stepNumber = n),
      this.helper.totalSteps$.subscribe(t => {
        this.totalSteps = t;
        this.dots = Array(t).fill(0);
      }),
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
      this.i18n.lang$.subscribe(l => this.isEn = l === 'en'),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  getPosition(): { top?: string; left?: string; right?: string; bottom?: string } {
    if (!this.step) return {};

    // Position based on step target area
    switch (this.step.position) {
      case 'bottom':
        return { top: '80px', left: '50%' };
      case 'left':
        return { top: '120px', right: '40px' };
      case 'right':
        return { top: '120px', left: '320px' };
      case 'top':
        return { bottom: '40px', left: '50%' };
      default:
        return { top: '50%', left: '50%' };
    }
  }
}
