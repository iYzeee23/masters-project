import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, UserProfile } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="animate-fade-in" style="max-width: 1100px; margin: 0 auto; padding: 40px 24px; display: flex; gap: 32px; min-height: calc(100vh - 80px);">

      <!-- LEFT SIDEBAR -->
      <div style="width: 280px; flex-shrink: 0;">

        <!-- Avatar -->
        <div class="relative group cursor-pointer" (click)="showZoom = true"
          style="width: 260px; height: 260px; border-radius: 50%; overflow: hidden; transition: all 0.3s;"
          [style.border]="isDark ? '4px solid #554536' : '4px solid #D7CABC'"
          [style.box-shadow]="isDark ? '0 12px 40px rgba(0,0,0,0.3)' : '0 12px 40px rgba(0,0,0,0.08)'"
          onmouseover="this.style.borderColor='#6E473B'"
          onmouseout="this.style.borderColor=''">
          <img *ngIf="user?.avatarUrl" [src]="user!.avatarUrl"
            style="width: 100%; height: 100%; object-fit: cover;" alt="Avatar" />
          <div *ngIf="!user?.avatarUrl"
            style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 72px; font-weight: 700;"
            [style.background-color]="isDark ? '#2E241C' : '#EDE4D8'"
            [style.color]="isDark ? '#AE9D8D' : '#8F7C6E'">
            {{ user?.username?.charAt(0)?.toUpperCase() || '?' }}
          </div>
          <!-- Hover overlay -->
          <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            style="background: rgba(0,0,0,0.35); border-radius: 50%;">
            <svg style="width: 24px; height: 24px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"/>
            </svg>
          </div>
        </div>

        <!-- User info -->
        <div style="margin-top: 24px; transition: transform 0.25s cubic-bezier(0.4,0,0.2,1); cursor: default;"
          onmouseover="this.style.transform='scale(1.02)'"
          onmouseout="this.style.transform='scale(1)'">
          <h1 style="font-size: 24px; font-weight: 700; letter-spacing: -0.02em; margin: 0; line-height: 1.3;"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'">
            {{ user?.firstName || '' }} {{ user?.lastName || '' }}
          </h1>
          <p style="font-size: 18px; font-weight: 400; margin-top: 2px; margin-bottom: 0; font-style: italic;"
            [style.color]="isDark ? '#8B7460' : '#AE9D8D'">
            {{ user?.username || '...' }}
          </p>
        </div>

        <!-- Bio section -->
        <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px; transition: transform 0.2s; cursor: default; padding: 4px 0;"
            onmouseover="this.style.transform='translateX(4px)'"
            onmouseout="this.style.transform='translateX(0)'">
            <svg style="width: 15px; height: 15px; flex-shrink: 0;" [style.color]="isDark ? '#655642' : '#AE9D8D'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <span style="font-size: 13px;" [style.color]="isDark ? '#8B7460' : '#8F7C6E'">{{ user?.email || '...' }}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 8px; transition: transform 0.2s; cursor: default; padding: 4px 0;"
            onmouseover="this.style.transform='translateX(4px)'"
            onmouseout="this.style.transform='translateX(0)'">
            <svg style="width: 15px; height: 15px; flex-shrink: 0;" [style.color]="isDark ? '#655642' : '#AE9D8D'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
            <span style="font-size: 13px;" [style.color]="isDark ? '#8B7460' : '#8F7C6E'">{{ i18n.t('profile.memberSince') }} {{ memberSince }}</span>
          </div>
        </div>

        <!-- Divider -->
        <div style="margin-top: 20px; margin-bottom: 20px; height: 1px;"
          [style.background-color]="isDark ? '#45352C' : '#D7CABC'"></div>

        <!-- Change avatar -->
        <button (click)="fileInput.click()"
          style="width: 100%; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 600;
            cursor: pointer; transition: all 0.2s; margin-bottom: 10px;"
          [style.background-color]="isDark ? '#2E241C' : '#F5EFE7'"
          [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'"
          [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'">
          {{ i18n.t('profile.changeAvatar') }}
        </button>
        <input #fileInput type="file" accept="image/*" class="hidden" (change)="onAvatarChange($event)" />
        <p *ngIf="uploadingAvatar" style="font-size: 12px; text-align: center;"
          [style.color]="isDark ? '#C9A87C' : '#6E473B'">{{ i18n.t('profile.uploading') }}</p>

        <!-- Sign Out -->
        <button (click)="onLogout()"
          style="width: 100%; padding: 10px; border-radius: 10px; font-size: 13px; font-weight: 600;
            cursor: pointer; transition: all 0.2s;"
          [style.background-color]="isDark ? '#2E241C' : '#F5EFE7'"
          [style.color]="isDark ? '#D3C3B0' : '#6E5A4D'"
          [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'">
          {{ i18n.t('profile.signOut') }}
        </button>
      </div>

      <!-- RIGHT CONTENT -->
      <div style="flex: 1; min-width: 0;">

        <!-- Statistics -->
        <div style="border-radius: 16px; padding: 24px; transition: all 0.3s;"
          [style.background-color]="isDark ? '#3D3128' : '#FFF9F2'"
          [style.border]="isDark ? '1px solid #554536' : '1px solid #D7CABC'"
          onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 30px rgba(0,0,0,0.1)'"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">

          <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 16px 0;"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'">
            📊 {{ i18n.t('profile.statistics').replace('📊 ', '') }}
          </h3>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
            <div style="border-radius: 12px; padding: 20px 16px; text-align: center; transition: all 0.2s;"
              [style.background-color]="isDark ? '#2E241C' : '#F5EFE7'"
              [style.border]="isDark ? '1px solid #45352C' : '1px solid #E0D5C8'"
              onmouseover="this.style.transform='translateY(-2px)'"
              onmouseout="this.style.transform='translateY(0)'">
              <div style="font-size: 28px; font-weight: 700;" [style.color]="isDark ? '#EDE0D0' : '#2F241D'">{{ stats.runs }}</div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-top: 4px;"
                [style.color]="isDark ? '#8B7460' : '#8F7C6E'">{{ i18n.t('profile.totalRuns') }}</div>
            </div>
            <div style="border-radius: 12px; padding: 20px 16px; text-align: center; transition: all 0.2s;"
              [style.background-color]="isDark ? '#2E241C' : '#F5EFE7'"
              [style.border]="isDark ? '1px solid #45352C' : '1px solid #E0D5C8'"
              onmouseover="this.style.transform='translateY(-2px)'"
              onmouseout="this.style.transform='translateY(0)'">
              <div style="font-size: 28px; font-weight: 700;" [style.color]="isDark ? '#EDE0D0' : '#2F241D'">{{ stats.maps }}</div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-top: 4px;"
                [style.color]="isDark ? '#8B7460' : '#8F7C6E'">{{ i18n.t('profile.savedMaps') }}</div>
            </div>
            <div style="border-radius: 12px; padding: 20px 16px; text-align: center; transition: all 0.2s;"
              [style.background-color]="isDark ? '#2E241C' : '#F5EFE7'"
              [style.border]="isDark ? '1px solid #45352C' : '1px solid #E0D5C8'"
              onmouseover="this.style.transform='translateY(-2px)'"
              onmouseout="this.style.transform='translateY(0)'">
              <div style="font-size: 28px; font-weight: 700;" [style.color]="isDark ? '#C9A87C' : '#6E473B'">{{ stats.score }}</div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin-top: 4px;"
                [style.color]="isDark ? '#8B7460' : '#8F7C6E'">{{ i18n.t('profile.totalScore') }}</div>
            </div>
          </div>
        </div>

        <!-- Leaderboard -->
        <div style="border-radius: 16px; padding: 24px; margin-top: 16px; transition: all 0.3s;"
          [style.background-color]="isDark ? '#3D3128' : '#FFF9F2'"
          [style.border]="isDark ? '1px solid #554536' : '1px solid #D7CABC'"
          onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 8px 30px rgba(0,0,0,0.1)'"
          onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">

          <h3 style="font-size: 16px; font-weight: 700; margin: 0 0 16px 0;"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'">
            🏆 {{ i18n.t('profile.leaderboard').replace('🏆 ', '') }}
          </h3>

          <div *ngIf="leaderboard.length === 0" style="text-align: center; padding: 24px 0;">
            <p style="font-size: 14px; margin: 0;" [style.color]="isDark ? '#8B7460' : '#AE9D8D'">{{ i18n.t('profile.noEntries') }}</p>
          </div>

          <div *ngFor="let entry of leaderboard; let i = index"
            style="display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; transition: all 0.2s; cursor: default;"
            [style.background-color]="i === 0 ? (isDark ? '#443628' : '#EDE4D8') : 'transparent'"
            onmouseover="this.style.transform='translateX(3px)'"
            onmouseout="this.style.transform='translateX(0)'">
            <span style="font-size: 14px; font-weight: 700; width: 24px; text-align: center;"
              [style.color]="i === 0 ? (isDark ? '#C9A87C' : '#6E473B') : (isDark ? '#8B7460' : '#AE9D8D')">
              {{ i + 1 }}
            </span>
            <div style="width: 28px; height: 28px; border-radius: 50%; overflow: hidden; flex-shrink: 0;"
              [style.border]="isDark ? '2px solid #554536' : '2px solid #D7CABC'">
              <img *ngIf="entry.avatarUrl" [src]="entry.avatarUrl" style="width: 100%; height: 100%; object-fit: cover;" />
              <div *ngIf="!entry.avatarUrl"
                style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;"
                [style.background-color]="isDark ? '#2E241C' : '#EDE4D8'"
                [style.color]="isDark ? '#AE9D8D' : '#8F7C6E'">
                {{ entry.username?.charAt(0)?.toUpperCase() }}
              </div>
            </div>
            <span style="flex: 1; font-size: 14px; font-weight: 500;" [style.color]="isDark ? '#EDE0D0' : '#2F241D'">
              {{ entry.username }}
            </span>
            <span style="font-size: 14px; font-weight: 700;" [style.color]="isDark ? '#C9A87C' : '#6E473B'">
              {{ entry.totalScore }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Avatar Zoom Modal -->
    <div *ngIf="showZoom" class="fixed inset-0 z-50 flex items-center justify-center" style="background: rgba(0,0,0,0.6); backdrop-filter: blur(8px);"
      (click)="showZoom = false">
      <div class="animate-fade-in" style="width: 400px; height: 400px; border-radius: 50%; overflow: hidden; cursor: pointer;"
        [style.border]="isDark ? '4px solid #554536' : '4px solid #D7CABC'"
        [style.box-shadow]="'0 30px 100px rgba(0,0,0,0.5)'"
        (click)="$event.stopPropagation(); showZoom = false">
        <img *ngIf="user?.avatarUrl" [src]="user!.avatarUrl"
          style="width: 100%; height: 100%; object-fit: cover;" />
        <div *ngIf="!user?.avatarUrl"
          style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 120px; font-weight: 700;"
          [style.background-color]="isDark ? '#2E241C' : '#EDE4D8'"
          [style.color]="isDark ? '#AE9D8D' : '#8F7C6E'">
          {{ user?.username?.charAt(0)?.toUpperCase() || '?' }}
        </div>
      </div>
    </div>
  `,
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  isDark = true;
  user: UserProfile | null = null;
  stats = { runs: 0, maps: 0, score: 0 };
  leaderboard: any[] = [];
  uploadingAvatar = false;
  showZoom = false;
  memberSince = '';
  private subs: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
    private themeService: ThemeService,
    public i18n: TranslationService,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
      this.auth.user$.subscribe(u => {
        this.user = u;
        this.memberSince = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      }),
    );

    if (!this.auth.getToken()) {
      this.router.navigate(['/auth']);
      return;
    }

    // Load leaderboard
    this.api.getLeaderboard().subscribe({
      next: (lb) => this.leaderboard = lb,
      error: () => {},
    });
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  onAvatarChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    this.uploadingAvatar = true;
    this.api.uploadAvatar(file).subscribe({
      next: (res) => {
        if (this.user) {
          this.user = { ...this.user, avatarUrl: res.avatarUrl };
          this.auth.user$.next(this.user);
        }
        this.uploadingAvatar = false;
      },
      error: () => { this.uploadingAvatar = false; },
    });
  }

  onLogout(): void {
    this.auth.logout();
    this.router.navigate(['/auth']);
  }
}
