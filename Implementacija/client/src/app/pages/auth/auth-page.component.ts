import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-auth-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="flex items-center justify-center"
      style="min-height: calc(100vh - 80px); padding: 24px 24px; overflow-y: auto;">

      <!-- Card -->
      <div class="animate-fade-in"
        style="width: 100%; max-width: 400px; border-radius: 20px; transition: all 0.5s;"
        [style.background-color]="isDark ? '#3D3128' : '#FFF9F2'"
        [style.border]="isDark ? '1px solid #554536' : '1px solid #D7CABC'"
        [style.box-shadow]="isDark
          ? '0 20px 80px rgba(0,0,0,0.4), 0 0 0 1px rgba(85,69,54,0.3)'
          : '0 20px 80px rgba(0,0,0,0.07), 0 0 0 1px rgba(215,202,188,0.4)'"
        onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow=this.style.boxShadow.replace('80px','90px')"
        onmouseout="this.style.transform='translateY(0)'"
        [style.padding]="'36px 36px'">

        <!-- Logo -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 24px; cursor: default; transition: all 0.3s;"
          onmouseover="this.style.transform='scale(1.05)'"
          onmouseout="this.style.transform='scale(1)'">
          <svg style="width: 38px; height: 38px;" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Grid dots -->
            <circle cx="8" cy="8" r="2.5" [attr.fill]="isDark ? '#554536' : '#D7CABC'"/>
            <circle cx="20" cy="8" r="2.5" [attr.fill]="isDark ? '#554536' : '#D7CABC'"/>
            <circle cx="32" cy="8" r="2.5" [attr.fill]="isDark ? '#554536' : '#D7CABC'"/>
            <circle cx="8" cy="20" r="2.5" [attr.fill]="isDark ? '#554536' : '#D7CABC'"/>
            <circle cx="20" cy="20" r="2.5" [attr.fill]="isDark ? '#554536' : '#D7CABC'"/>
            <circle cx="32" cy="20" r="2.5" [attr.fill]="isDark ? '#554536' : '#D7CABC'"/>
            <circle cx="8" cy="32" r="2.5" [attr.fill]="isDark ? '#554536' : '#D7CABC'"/>
            <circle cx="20" cy="32" r="2.5" [attr.fill]="isDark ? '#554536' : '#D7CABC'"/>
            <circle cx="32" cy="32" r="2.5" [attr.fill]="isDark ? '#554536' : '#D7CABC'"/>
            <!-- Path -->
            <path d="M8 32 L8 20 L20 20 L20 8 L32 8" stroke="#6E473B" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- Start & End markers -->
            <circle cx="8" cy="32" r="4" fill="#6E473B"/>
            <circle cx="32" cy="8" r="4" fill="#8B5E50"/>
          </svg>
          <span style="font-family: 'Cormorant Garamond', serif; font-size: 40px; font-weight: 750; letter-spacing: -0.01em; line-height: 1;"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'">
            Pathfinder
          </span>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" style="display: flex; flex-direction: column; gap: 16px;">

          <!-- Avatar (register) -->
          <div *ngIf="!isLogin" style="display: flex; justify-content: center; margin-bottom: 16px;">
            <div class="relative group cursor-pointer" (click)="avatarInput.click()"
              style="transition: transform 0.3s;"
              onmouseover="this.style.transform='scale(1.08)'"
              onmouseout="this.style.transform='scale(1)'">
              <div style="width: 80px; height: 80px; border-radius: 50%; overflow: hidden; transition: all 0.3s;"
                [style.border]="isDark ? '2px solid #554536' : '2px solid #D7CABC'">
                <img *ngIf="avatarPreview" [src]="avatarPreview" style="width: 100%; height: 100%; object-fit: cover;" />
                <div *ngIf="!avatarPreview"
                  style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;"
                  [style.background-color]="isDark ? '#2B211A' : '#EDE4D8'">
                  <svg style="width: 22px; height: 22px;" [style.color]="isDark ? '#8B7460' : '#AE9D8D'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                  </svg>
                </div>
              </div>
            </div>
            <input #avatarInput type="file" accept="image/*" class="hidden" (change)="onAvatarSelect($event)" />
          </div>

          <!-- Name row (register) -->
          <div *ngIf="!isLogin" style="display: flex; gap: 12px; width: 100%; box-sizing: border-box;">
            <input type="text" [(ngModel)]="firstName" name="firstName"
              placeholder="{{ i18n.t('auth.firstName') }}"
              [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
              [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
              [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
              style="flex: 1; min-width: 0; padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none; box-sizing: border-box;" />
            <input type="text" [(ngModel)]="lastName" name="lastName"
              placeholder="{{ i18n.t('auth.lastName') }}"
              [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
              [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
              [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
              style="flex: 1; min-width: 0; padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none; box-sizing: border-box;" />
          </div>

          <!-- Username (register) -->
          <input *ngIf="!isLogin" type="text" [(ngModel)]="username" name="username"
            placeholder="{{ i18n.t('auth.username') }}"
            [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
            [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
            style="padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none;" />

          <!-- Username (login) -->
          <input *ngIf="isLogin" type="text" [(ngModel)]="username" name="loginUsername"
            placeholder="{{ i18n.t('auth.username') }}"
            [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
            [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
            style="padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none;" />

          <!-- Email (register only) -->
          <input *ngIf="!isLogin" type="email" [(ngModel)]="email" name="email"
            placeholder="{{ i18n.t('auth.email') }}"
            [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
            [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
            style="padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none;" />

          <!-- Password -->
          <input type="password" [(ngModel)]="password" name="password"
            placeholder="{{ i18n.t('auth.password') }}"
            [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
            [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
            style="padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none;" />

          <!-- Confirm (register) -->
          <input *ngIf="!isLogin" type="password" [(ngModel)]="confirmPassword" name="confirmPassword"
            placeholder="{{ i18n.t('auth.confirmPassword') }}"
            [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
            [style.border]="passwordMismatch ? '1px solid #C4736E' : (isDark ? '1px solid #45352C' : '1px solid #D7CABC')"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
            style="padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none;" />

          <!-- Error -->
          <p *ngIf="error || passwordMismatch"
            style="font-size: 13px; text-align: center; color: #C4736E; margin: 0;">
            {{ passwordMismatch ? i18n.t('auth.passwordsMismatch') : error }}
          </p>

          <!-- Submit -->
          <button type="submit" [disabled]="loading"
            [style.opacity]="loading ? '0.5' : '1'"
            style="padding: 14px; border-radius: 12px; font-size: 14px; font-weight: 600;
              background: linear-gradient(135deg, #6E473B, #8B5E50); color: #F0E5D7;
              border: none; cursor: pointer; transition: all 0.3s;
              box-shadow: 0 4px 20px rgba(110,71,59,0.25); margin-top: 4px;"
            onmouseover="this.style.transform='scale(1.03)'; this.style.fontWeight='700'; this.style.boxShadow='0 6px 25px rgba(110,71,59,0.35)';"
            onmouseout="this.style.transform='scale(1)'; this.style.fontWeight='600'; this.style.boxShadow='0 4px 20px rgba(110,71,59,0.25)';">
            {{ loading ? '...' : (isLogin ? i18n.t('auth.signIn') : i18n.t('auth.createAccount')) }}
          </button>
        </form>

        <!-- Toggle -->
        <div style="text-align: center; margin-top: 28px;">
          <button (click)="toggleMode()"
            style="font-size: 13px; font-weight: 500; border: none; background: none; cursor: pointer; transition: all 0.2s;"
            [style.color]="isDark ? '#8B7460' : '#8F7C6E'"
            onmouseover="this.style.transform='scale(1.08)'; this.style.fontWeight='700'; this.style.textDecoration='underline';"
            onmouseout="this.style.transform='scale(1)'; this.style.fontWeight='500'; this.style.textDecoration='none';">
            {{ isLogin ? i18n.t('auth.switchToSignUp') : i18n.t('auth.switchToSignIn') }}
          </button>
        </div>
      </div>
    </div>
  `,
})
export class AuthPageComponent implements OnDestroy {
  isDark = true;
  isLogin = true;
  firstName = '';
  lastName = '';
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;
  avatarPreview: string | null = null;
  avatarFile: File | null = null;
  private subs: Subscription[] = [];

  constructor(
    private auth: AuthService,
    private router: Router,
    private themeService: ThemeService,
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    public i18n: TranslationService,
  ) {
    this.subs.push(
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
    );
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  get passwordMismatch(): boolean {
    return !this.isLogin && this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  toggleMode(): void {
    this.isLogin = !this.isLogin;
    this.error = '';
    this.username = '';
    this.email = '';
    this.firstName = '';
    this.lastName = '';
    this.password = '';
    this.confirmPassword = '';
    this.avatarPreview = null;
    this.avatarFile = null;
  }

  onAvatarSelect(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.avatarFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarPreview = reader.result as string;
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);
  }

  onSubmit(): void {
    this.error = '';
    if (this.isLogin) {
      if (!this.username || !this.password) { this.error = this.i18n.t('auth.fillAllFields'); return; }
      this.loading = true;
      this.auth.login(this.username, this.password).subscribe({
        next: () => { this.router.navigate(['/visualize']); this.loading = false; },
        error: (err) => {
          this.error = err.error?.error || this.i18n.t('auth.invalidCredentials');
          this.loading = false;
          this.cdr.detectChanges();
        },
      });
    } else {
      if (!this.firstName || !this.lastName || !this.username || !this.email || !this.password) {
        this.error = this.i18n.t('auth.fillAllFields'); return;
      }
      if (this.password !== this.confirmPassword) { this.error = this.i18n.t('auth.passwordsMismatch'); return; }
      if (this.password.length < 6) { this.error = this.i18n.t('auth.passwordMinLength'); return; }
      this.loading = true;
      this.auth.register(this.username, this.email, this.password, this.firstName, this.lastName).subscribe({
        next: () => {
          if (this.avatarFile) {
            this.api.uploadAvatar(this.avatarFile).subscribe({
              next: (res) => {
                const user = this.auth.user$.getValue();
                if (user) {
                  this.auth.user$.next({ ...user, avatarUrl: res.avatarUrl });
                }
                this.router.navigate(['/visualize']);
                this.loading = false;
              },
              error: (err) => {
                console.error('Avatar upload failed:', err);
                this.router.navigate(['/visualize']);
                this.loading = false;
              },
            });
          } else {
            this.router.navigate(['/visualize']);
            this.loading = false;
          }
        },
        error: (err) => { this.error = err.error?.error || this.i18n.t('auth.registrationFailed'); this.loading = false; },
      });
    }
  }
}
