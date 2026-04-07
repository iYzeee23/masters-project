import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService, UserProfile } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="display: flex; align-items: flex-start; justify-content: center; min-height: calc(100vh - 80px); padding: 48px 24px;">
      <div class="animate-fade-in" style="width: 100%; max-width: 480px;">

        <!-- Profile Card -->
        <div style="border-radius: 20px; transition: all 0.5s;"
          [style.background-color]="isDark ? '#3D3128' : '#FFF9F2'"
          [style.border]="isDark ? '1px solid #554536' : '1px solid #D7CABC'"
          [style.box-shadow]="isDark
            ? '0 20px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(85,69,54,0.3)'
            : '0 20px 80px rgba(0,0,0,0.07), 0 0 0 1px rgba(215,202,188,0.4)'"
          [style.padding]="'36px 36px'">

          <!-- Avatar -->
          <div style="display: flex; flex-direction: column; align-items: center; margin-bottom: 24px;">
            <div class="relative group cursor-pointer" (click)="fileInput.click()"
              style="transition: transform 0.3s;"
              onmouseover="this.style.transform='scale(1.05)'"
              onmouseout="this.style.transform='scale(1)'">
              <div style="width: 96px; height: 96px; border-radius: 50%; overflow: hidden; transition: all 0.3s;"
                [style.border]="isDark ? '3px solid #554536' : '3px solid #D7CABC'"
                [style.box-shadow]="isDark ? '0 8px 30px rgba(0,0,0,0.3)' : '0 8px 30px rgba(0,0,0,0.08)'">
                <img *ngIf="user?.avatarUrl" [src]="user!.avatarUrl"
                  style="width: 100%; height: 100%; object-fit: cover;" alt="Avatar" />
                <div *ngIf="!user?.avatarUrl"
                  style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 700;"
                  [style.background-color]="isDark ? '#2E241C' : '#EDE4D8'"
                  [style.color]="isDark ? '#AE9D8D' : '#8F7C6E'">
                  {{ user?.username?.charAt(0)?.toUpperCase() || '?' }}
                </div>
              </div>
              <!-- Hover overlay -->
              <div class="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                style="background: rgba(0,0,0,0.4);">
                <svg style="width: 20px; height: 20px; color: white;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
            </div>
            <input #fileInput type="file" accept="image/*" class="hidden" (change)="onAvatarChange($event)" />

            <p *ngIf="uploadingAvatar" style="font-size: 12px; margin-top: 8px;"
              [style.color]="isDark ? '#C9A87C' : '#6E473B'">
              Uploading...
            </p>
          </div>

          <!-- Info -->
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em;"
              [style.color]="isDark ? '#EDE0D0' : '#2F241D'">
              {{ user?.username || '...' }}
            </h2>
            <p style="font-size: 14px; margin-top: 4px;"
              [style.color]="isDark ? '#AE9D8D' : '#8F7C6E'">
              {{ user?.email || '...' }}
            </p>
          </div>

          <!-- Stats -->
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 24px;">
            <div style="text-align: center; border-radius: 14px; padding: 16px 8px; transition: all 0.3s; cursor: default;"
              [style.background-color]="isDark ? '#2E241C' : '#F5EFE7'"
              [style.border]="isDark ? '1px solid #45352C' : '1px solid #E0D5C8'"
              onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.12)'"
              onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
              <div style="font-size: 20px; font-weight: 700;" [style.color]="isDark ? '#EDE0D0' : '#2F241D'">{{ stats.runs }}</div>
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-top: 2px;"
                [style.color]="isDark ? '#8B7460' : '#8F7C6E'">Runs</div>
            </div>
            <div style="text-align: center; border-radius: 14px; padding: 16px 8px; transition: all 0.3s; cursor: default;"
              [style.background-color]="isDark ? '#2E241C' : '#F5EFE7'"
              [style.border]="isDark ? '1px solid #45352C' : '1px solid #E0D5C8'"
              onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.12)'"
              onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
              <div style="font-size: 20px; font-weight: 700;" [style.color]="isDark ? '#EDE0D0' : '#2F241D'">{{ stats.maps }}</div>
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-top: 2px;"
                [style.color]="isDark ? '#8B7460' : '#8F7C6E'">Maps</div>
            </div>
            <div style="text-align: center; border-radius: 14px; padding: 16px 8px; transition: all 0.3s; cursor: default;"
              [style.background-color]="isDark ? '#2E241C' : '#F5EFE7'"
              [style.border]="isDark ? '1px solid #45352C' : '1px solid #E0D5C8'"
              onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0,0,0,0.12)'"
              onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">
              <div style="font-size: 20px; font-weight: 700;" [style.color]="isDark ? '#EDE0D0' : '#2F241D'">{{ stats.score }}</div>
              <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600; margin-top: 2px;"
                [style.color]="isDark ? '#8B7460' : '#8F7C6E'">Score</div>
            </div>
          </div>

          <!-- Logout -->
          <button (click)="onLogout()"
            style="width: 100%; padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 600;
              cursor: pointer; transition: all 0.3s; border: none;
              background: linear-gradient(135deg, #6E473B, #8B5E50); color: #F0E5D7;
              box-shadow: 0 4px 20px rgba(110,71,59,0.25);"
            onmouseover="this.style.transform='scale(1.03)'; this.style.fontWeight='700'; this.style.boxShadow='0 6px 25px rgba(110,71,59,0.35)'"
            onmouseout="this.style.transform='scale(1)'; this.style.fontWeight='600'; this.style.boxShadow='0 4px 20px rgba(110,71,59,0.25)'">
            Sign Out
          </button>
        </div>

        <!-- Leaderboard -->
        <div style="border-radius: 20px; padding: 28px 28px; margin-top: 16px; transition: all 0.5s;"
          class="animate-fade-in"
          [style.background-color]="isDark ? '#3D3128' : '#FFF9F2'"
          [style.border]="isDark ? '1px solid #554536' : '1px solid #D7CABC'"
          [style.box-shadow]="isDark
            ? '0 20px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(85,69,54,0.3)'
            : '0 20px 80px rgba(0,0,0,0.07), 0 0 0 1px rgba(215,202,188,0.4)'">

          <h3 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px;"
            [style.color]="isDark ? '#AE9D8D' : '#8F7C6E'">
            🏆 Leaderboard
          </h3>

          <div *ngIf="leaderboard.length === 0" style="text-align: center; padding: 20px 0;">
            <p style="font-size: 14px;" [style.color]="isDark ? '#8B7460' : '#AE9D8D'">No entries yet</p>
          </div>

          <div *ngFor="let entry of leaderboard; let i = index"
            style="display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 14px; transition: all 0.3s; cursor: default;"
            [style.background-color]="i === 0 ? (isDark ? '#443628' : '#EDE4D8') : 'transparent'"
            onmouseover="this.style.transform='translateX(4px)'; this.style.opacity='0.85'"
            onmouseout="this.style.transform='translateX(0)'; this.style.opacity='1'">
            <span style="font-size: 14px; font-weight: 700; width: 24px; text-align: center;"
              [style.color]="i === 0 ? (isDark ? '#C9A87C' : '#6E473B') : (isDark ? '#8B7460' : '#AE9D8D')">
              {{ i + 1 }}
            </span>
            <div style="width: 32px; height: 32px; border-radius: 50%; overflow: hidden; flex-shrink: 0;"
              [style.border]="isDark ? '2px solid #554536' : '2px solid #D7CABC'">
              <img *ngIf="entry.avatarUrl" [src]="entry.avatarUrl" style="width: 100%; height: 100%; object-fit: cover;" />
              <div *ngIf="!entry.avatarUrl"
                style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700;"
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
  `,
})
export class ProfilePageComponent implements OnInit, OnDestroy {
  isDark = true;
  user: UserProfile | null = null;
  stats = { runs: 0, maps: 0, score: 0 };
  leaderboard: any[] = [];
  uploadingAvatar = false;
  private subs: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private api: ApiService,
    private router: Router,
    private themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
      this.auth.user$.subscribe(u => this.user = u),
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
