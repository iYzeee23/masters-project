import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ApiService } from '../../services/api.service';

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
        [style.padding]="'36px 36px'">

        <!-- Logo -->
        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 20px;">
          <svg style="width: 28px; height: 28px;" [style.color]="isDark ? '#A78D78' : '#6E473B'" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
          </svg>
          <span style="font-size: 22px; font-weight: 700; letter-spacing: -0.02em;"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'">
            Pathfinder
          </span>
        </div>

        <!-- Form -->
        <form (ngSubmit)="onSubmit()" style="display: flex; flex-direction: column; gap: 16px;">

          <!-- Avatar (register) -->
          <div *ngIf="!isLogin" style="display: flex; justify-content: center; margin-bottom: 16px;">
            <div class="relative group cursor-pointer" (click)="avatarInput.click()">
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
              placeholder="First name"
              [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
              [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
              [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
              style="flex: 1; min-width: 0; padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none; box-sizing: border-box;" />
            <input type="text" [(ngModel)]="lastName" name="lastName"
              placeholder="Last name"
              [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
              [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
              [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
              style="flex: 1; min-width: 0; padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none; box-sizing: border-box;" />
          </div>

          <!-- Username (register) -->
          <input *ngIf="!isLogin" type="text" [(ngModel)]="username" name="username"
            placeholder="Username"
            [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
            [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
            style="padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none;" />

          <!-- Username (login) -->
          <input *ngIf="isLogin" type="text" [(ngModel)]="username" name="loginUsername"
            placeholder="Username"
            [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
            [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
            style="padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none;" />

          <!-- Email (register only) -->
          <input *ngIf="!isLogin" type="email" [(ngModel)]="email" name="email"
            placeholder="Email"
            [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
            [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
            style="padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none;" />

          <!-- Password -->
          <input type="password" [(ngModel)]="password" name="password"
            placeholder="Password"
            [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
            [style.border]="isDark ? '1px solid #45352C' : '1px solid #D7CABC'"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
            style="padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none;" />

          <!-- Confirm (register) -->
          <input *ngIf="!isLogin" type="password" [(ngModel)]="confirmPassword" name="confirmPassword"
            placeholder="Confirm password"
            [style.background-color]="isDark ? '#2B211A' : '#FFFFFF'"
            [style.border]="passwordMismatch ? '1px solid #C4736E' : (isDark ? '1px solid #45352C' : '1px solid #D7CABC')"
            [style.color]="isDark ? '#EDE0D0' : '#2F241D'"
            style="padding: 14px 16px; border-radius: 12px; font-size: 14px; outline: none;" />

          <!-- Error -->
          <p *ngIf="error || passwordMismatch"
            style="font-size: 13px; text-align: center; color: #C4736E; margin: 0;">
            {{ passwordMismatch ? 'Passwords do not match' : error }}
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
            {{ loading ? '...' : (isLogin ? 'Sign in' : 'Create account') }}
          </button>
        </form>

        <!-- Toggle -->
        <div style="text-align: center; margin-top: 28px;">
          <button (click)="toggleMode()"
            style="font-size: 13px; font-weight: 500; border: none; background: none; cursor: pointer; transition: all 0.2s;"
            [style.color]="isDark ? '#8B7460' : '#8F7C6E'"
            onmouseover="this.style.transform='scale(1.08)'; this.style.fontWeight='700'; this.style.textDecoration='underline';"
            onmouseout="this.style.transform='scale(1)'; this.style.fontWeight='500'; this.style.textDecoration='none';">
            {{ isLogin ? 'Create an account' : 'Sign in instead' }}
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
  ) {
    this.subs.push(
      this.themeService.theme$.subscribe(t => this.isDark = t === 'dark'),
    );
    if (this.auth.getToken()) {
      this.router.navigate(['/visualize']);
    }
  }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  get passwordMismatch(): boolean {
    return !this.isLogin && this.confirmPassword.length > 0 && this.password !== this.confirmPassword;
  }

  toggleMode(): void {
    this.isLogin = !this.isLogin;
    this.error = '';
    this.password = '';
    this.confirmPassword = '';
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
      if (!this.username || !this.password) { this.error = 'Please fill in all fields'; return; }
      this.loading = true;
      this.auth.login(this.username, this.password).subscribe({
        next: () => { this.router.navigate(['/visualize']); this.loading = false; },
        error: (err) => { this.error = err.error?.error || 'Invalid credentials'; this.loading = false; },
      });
    } else {
      if (!this.firstName || !this.lastName || !this.username || !this.email || !this.password) {
        this.error = 'Please fill in all fields'; return;
      }
      if (this.password !== this.confirmPassword) { this.error = 'Passwords do not match'; return; }
      if (this.password.length < 6) { this.error = 'Password must be at least 6 characters'; return; }
      this.loading = true;
      this.auth.register(this.username, this.email, this.password).subscribe({
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
              error: () => {
                this.router.navigate(['/visualize']);
                this.loading = false;
              },
            });
          } else {
            this.router.navigate(['/visualize']);
            this.loading = false;
          }
        },
        error: (err) => { this.error = err.error?.error || 'Registration failed'; this.loading = false; },
      });
    }
  }
}
