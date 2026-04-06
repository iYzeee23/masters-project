import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
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

  readonly user$ = new BehaviorSubject<UserProfile | null>(null);
  readonly isLoggedIn$ = new BehaviorSubject<boolean>(false);

  constructor(private http: HttpClient) {
    this.loadFromStorage();
  }

  register(username: string, email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API}/register`, { username, email, password })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.API}/login`, { email, password })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.user$.next(null);
    this.isLoggedIn$.next(false);
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
    this.user$.next(res.user);
    this.isLoggedIn$.next(true);
  }

  private loadFromStorage(): void {
    const token = this.getToken();
    if (!token) return;

    this.http
      .get<UserProfile>(`${this.API}/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .pipe(
        tap((user) => {
          this.user$.next(user);
          this.isLoggedIn$.next(true);
        }),
        catchError(() => {
          this.logout();
          return of(null);
        }),
      )
      .subscribe();
  }
}
