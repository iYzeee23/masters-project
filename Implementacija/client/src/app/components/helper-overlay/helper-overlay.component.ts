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
    <!-- Backdrop with spotlight hole -->
    <div *ngIf="isActive" class="fixed inset-0 z-40" (click)="helper.stop()">
      <!-- Blur layer with clip-path cutout -->
      <div class="absolute inset-0 transition-all duration-300"
        [style.clip-path]="clipPath"
        style="backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px);">
      </div>
      <!-- Dark overlay with spotlight hole via box-shadow -->
      <div *ngIf="spotlight" class="absolute transition-all duration-300 ease-out"
        [style.top.px]="spotlight.top - 10"
        [style.left.px]="spotlight.left - 10"
        [style.width.px]="spotlight.width + 20"
        [style.height.px]="spotlight.height + 20"
        style="border-radius: 14px; box-shadow: 0 0 0 9999px rgba(0,0,0,0.45); pointer-events: none;">
      </div>
      <!-- No spotlight — full dark overlay -->
      <div *ngIf="!spotlight" class="absolute inset-0" style="background: rgba(0,0,0,0.5);"></div>
    </div>

    <!-- Tooltip -->
    <div *ngIf="isActive && step"
      class="fixed z-50 animate-fade-in"
      style="max-width: 380px; width: 380px;"
      [style.top]="tooltipStyle.top"
      [style.left]="tooltipStyle.left"
      [style.transform]="tooltipStyle.transform || ''">
      <div style="border-radius: 16px; padding: 24px;"
        [style.background-color]="isDark ? '#3D3128' : '#FFF9F2'"
        [style.border]="isDark ? '1px solid #554536' : '1px solid #D7CABC'"
        [style.box-shadow]="isDark
          ? '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(85,69,54,0.3)'
          : '0 20px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(215,202,188,0.4)'">

        <!-- Step indicator -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <span style="font-size: 12px; font-weight: 600;"
            [style.color]="isDark ? '#8B7460' : '#AE9D8D'">
            {{ stepNumber }} / {{ totalSteps }}
          </span>
          <button (click)="helper.stop()"
            style="font-size: 18px; border: none; background: none; cursor: pointer; line-height: 1; padding: 4px;"
            [style.color]="isDark ? '#8B7460' : '#AE9D8D'">
            ✕
          </button>
        </div>

        <!-- Title -->
        <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 8px 0;"
          [style.color]="isDark ? '#EDE0D0' : '#2F241D'">
          {{ isEn ? step.titleEn : step.title }}
        </h3>

        <!-- Content -->
        <p style="font-size: 14px; line-height: 1.6; margin: 0;"
          [style.color]="isDark ? '#AE9D8D' : '#6E5A4D'">
          {{ isEn ? step.contentEn : step.content }}
        </p>

        <!-- Navigation -->
        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 20px;">
          <button *ngIf="!helper.isFirst()" (click)="helper.prev()"
            style="padding: 8px 16px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;"
            [style.background-color]="isDark ? '#2E241C' : '#F5EFE7'"
            [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'"
            [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'">
            ← {{ isEn ? 'Back' : 'Nazad' }}
          </button>
          <div *ngIf="helper.isFirst()"></div>

          <button (click)="helper.next()"
            style="padding: 8px 20px; border-radius: 10px; font-size: 13px; font-weight: 600;
              background: linear-gradient(135deg, #6E473B, #8B5E50); color: #F0E5D7;
              border: none; cursor: pointer; transition: all 0.2s;
              box-shadow: 0 4px 15px rgba(110,71,59,0.25);">
            {{ helper.isLast() ? (isEn ? 'Finish' : 'Završi') : (isEn ? 'Next' : 'Dalje') }} →
          </button>
        </div>

        <!-- Progress dots -->
        <div style="display: flex; justify-content: center; gap: 6px; margin-top: 16px;">
          <span *ngFor="let s of dots; let i = index"
            style="width: 6px; height: 6px; border-radius: 50%; transition: all 0.2s;"
            [style.background-color]="i < stepNumber ? '#6E473B' : (isDark ? '#45352C' : '#D7CABC')">
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
  spotlight: { top: number; left: number; width: number; height: number } | null = null;
  tooltipStyle: { top: string; left: string; transform?: string } = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
  clipPath = 'none';

  private subs: Subscription[] = [];

  constructor(
    public helper: HelperService,
    private themeService: ThemeService,
    private i18n: TranslationService,
  ) {
    this.subs.push(
      this.helper.isActive$.subscribe(a => this.isActive = a),
      this.helper.currentStep$.subscribe(s => {
        this.step = s;
        this.positionTooltip();
      }),
      this.helper.stepNumber$.subscribe(n => this.stepNumber = n),
      this.helper.totalSteps$.subscribe(t => {
        this.totalSteps = t;
        this.dots = Array(t).fill(0);
      }),
      this.helper.spotlightRect$.subscribe(r => {
        if (r && r.width > 0) {
          this.spotlight = { top: r.top, left: r.left, width: r.width, height: r.height };
          // Clip-path polygon: full viewport with rectangular hole cut out
          const pad = 10;
          const x1 = r.left - pad, y1 = r.top - pad;
          const x2 = r.left + r.width + pad, y2 = r.top + r.height + pad;
          // Polygon traces outer edge then inner hole (counter-clockwise)
          this.clipPath = `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, `
            + `${x1}px ${y1}px, ${x1}px ${y2}px, ${x2}px ${y2}px, ${x2}px ${y1}px, ${x1}px ${y1}px)`;
        } else {
          this.spotlight = null;
          this.clipPath = 'none';
        }
        this.positionTooltip();
      }),
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
      this.i18n.lang$.subscribe(l => this.isEn = l === 'en'),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private positionTooltip(): void {
    if (!this.step || !this.spotlight) {
      // Center on screen
      this.tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      return;
    }

    const s = this.spotlight;
    const tooltipW = 380;
    const tooltipH = 280; // approximate
    const gap = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const pos = this.step.position;

    if (pos === 'center' || !pos) {
      this.tooltipStyle = { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
      return;
    }

    // Try to place below the element
    if (pos === 'bottom' && s.top + s.height + gap + tooltipH < vh) {
      const left = Math.max(gap, Math.min(s.left + s.width / 2 - tooltipW / 2, vw - tooltipW - gap));
      this.tooltipStyle = { top: (s.top + s.height + gap + 8) + 'px', left: left + 'px' };
      return;
    }

    // Try above
    if (pos === 'top' && s.top - gap - tooltipH > 0) {
      const left = Math.max(gap, Math.min(s.left + s.width / 2 - tooltipW / 2, vw - tooltipW - gap));
      this.tooltipStyle = { top: (s.top - gap - tooltipH) + 'px', left: left + 'px' };
      return;
    }

    // Try right
    if (pos === 'right' && s.left + s.width + gap + tooltipW < vw) {
      const top = Math.max(gap, Math.min(s.top + s.height / 2 - tooltipH / 2, vh - tooltipH - gap));
      this.tooltipStyle = { top: top + 'px', left: (s.left + s.width + gap + 8) + 'px' };
      return;
    }

    // Try left
    if (pos === 'left' && s.left - gap - tooltipW > 0) {
      const top = Math.max(gap, Math.min(s.top + s.height / 2 - tooltipH / 2, vh - tooltipH - gap));
      this.tooltipStyle = { top: top + 'px', left: (s.left - gap - tooltipW - 8) + 'px' };
      return;
    }

    // Fallback: below element, clamped
    const left = Math.max(gap, Math.min(s.left + s.width / 2 - tooltipW / 2, vw - tooltipW - gap));
    const top = Math.min(s.top + s.height + gap + 8, vh - tooltipH - gap);
    this.tooltipStyle = { top: top + 'px', left: left + 'px' };
  }
}
