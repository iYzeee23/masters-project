import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string;
}

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly API = 'http://localhost:3000/api/auth';
  private tokenKey = 'pf-token';
  private userKey = 'pf-user';
  private lastActivityKey = 'pf-last-activity';
  private readonly INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  private activityTimer: any = null;

  readonly user$ = new BehaviorSubject<UserProfile | null>(null);
  readonly isLoggedIn$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.loadFromStorage();
    this.setupActivityTracking();
  }

  register(username: string, email: string, password: string, firstName = '', lastName = ''): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API}/register`, { username, email, password, firstName, lastName })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API}/login`, { username, password })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem(this.lastActivityKey);
    this.user$.next(null);
    this.isLoggedIn$.next(false);
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  getAuthHeaders(): { Authorization: string } | {} {
    const token = this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private handleAuth(res: AuthResponse): void {
    localStorage.setItem(this.tokenKey, res.token);
    localStorage.setItem(this.userKey, JSON.stringify(res.user));
    this.touchActivity();
    this.user$.next(res.user);
    this.isLoggedIn$.next(true);
    this.startActivityTimer();
  }

  private loadFromStorage(): void {
    const token = this.getToken();
    if (!token) return;

    // Check inactivity timeout
    const lastActivity = localStorage.getItem(this.lastActivityKey);
    if (lastActivity) {
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > this.INACTIVITY_TIMEOUT) {
        this.logout();
        return;
      }
    }

    this.touchActivity();

    // Immediately restore cached user + mark logged in
    this.isLoggedIn$.next(true);
    const cachedUser = localStorage.getItem(this.userKey);
    if (cachedUser) {
      try { this.user$.next(JSON.parse(cachedUser)); } catch { /* ignore */ }
    }

    // Refresh user data from server in background
    this.http
      .get<UserProfile>(`${this.API}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        tap((user) => {
          localStorage.setItem(this.userKey, JSON.stringify(user));
          this.user$.next(user);
          this.startActivityTimer();
        }),
        catchError((err) => {
          // Server responded with error (401, 404) — user/token invalid, logout
          if (err.status === 401 || err.status === 404) {
            this.logout();
            window.location.href = '/auth';
          }
          // Network errors (status 0) — keep token, maybe server is starting up
          return of(null);
        }),
      )
      .subscribe();
  }

  private touchActivity(): void {
    localStorage.setItem(this.lastActivityKey, Date.now().toString());
  }

  private setupActivityTracking(): void {
    if (typeof window === 'undefined') return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(evt => {
      window.addEventListener(evt, () => {
        if (this.isLoggedIn$.getValue()) {
          this.touchActivity();
        }
      }, { passive: true });
    });
  }

  private startActivityTimer(): void {
    if (this.activityTimer) clearInterval(this.activityTimer);
    this.activityTimer = setInterval(() => {
      const lastActivity = localStorage.getItem(this.lastActivityKey);
      if (!lastActivity) return;
      const elapsed = Date.now() - parseInt(lastActivity, 10);
      if (elapsed > this.INACTIVITY_TIMEOUT) {
        this.logout();
        window.location.href = '/auth';
      }
    }, 30_000); // check every 30 seconds
  }
}
