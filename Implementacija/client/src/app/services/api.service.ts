import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly API = 'http://localhost:3000/api';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
  ) {}

  private get headers() {
    return this.auth.getAuthHeaders();
  }

  // ============================================================
  // MAPS
  // ============================================================

  getMaps(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/maps`, { headers: this.headers });
  }

  getPublicMaps(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/maps/public`);
  }

  getMap(id: string): Observable<any> {
    return this.http.get(`${this.API}/maps/${id}`);
  }

  saveMap(data: any): Observable<any> {
    return this.http.post(`${this.API}/maps`, data, { headers: this.headers });
  }

  updateMap(id: string, data: any): Observable<any> {
    return this.http.put(`${this.API}/maps/${id}`, data, { headers: this.headers });
  }

  deleteMap(id: string): Observable<any> {
    return this.http.delete(`${this.API}/maps/${id}`, { headers: this.headers });
  }

  // ============================================================
  // RUNS
  // ============================================================

  getRuns(mapId?: string): Observable<any[]> {
    const params = mapId ? `?mapId=${mapId}` : '';
    return this.http.get<any[]>(`${this.API}/runs${params}`, { headers: this.headers });
  }

  saveRun(data: any): Observable<any> {
    return this.http.post(`${this.API}/runs`, data, { headers: this.headers });
  }

  getCompareRuns(mapId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/runs/compare?mapId=${mapId}`, { headers: this.headers });
  }

  // ============================================================
  // PLAYGROUND
  // ============================================================

  getLeaderboard(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/playground/leaderboard`);
  }

  submitPlaygroundAttempt(data: any): Observable<any> {
    return this.http.post(`${this.API}/playground/attempts`, data, { headers: this.headers });
  }

  getMyAttempts(): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/playground/my-attempts`, { headers: this.headers });
  }

  // ============================================================
  // UPLOAD
  // ============================================================

  uploadAvatar(file: File): Observable<{ avatarUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post<{ avatarUrl: string }>(`${this.API}/upload/avatar`, formData, {
      headers: this.headers,
    });
  }
}
