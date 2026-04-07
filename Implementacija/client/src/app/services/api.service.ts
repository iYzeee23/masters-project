import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, from, switchMap } from 'rxjs';
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
    const MAX_SIZE = 1024 * 1024; // 1MB
    return from(file.size > MAX_SIZE ? this.compressImage(file, MAX_SIZE) : Promise.resolve(file)).pipe(
      switchMap((compressed) => {
        const formData = new FormData();
        formData.append('avatar', compressed);
        const token = this.auth.getToken();
        const headers = token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
        return this.http.post<{ avatarUrl: string }>(`${this.API}/upload/avatar`, formData, { headers });
      }),
    );
  }

  private compressImage(file: File, maxBytes: number): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement('canvas');
        const maxDim = 800;
        let w = img.width, h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        let quality = 0.8;
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) { resolve(file); return; }
            if (blob.size <= maxBytes || quality <= 0.3) {
              resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            } else {
              quality -= 0.1;
              tryCompress();
            }
          }, 'image/jpeg', quality);
        };
        tryCompress();
      };
      img.onerror = () => resolve(file);
      img.src = url;
    });
  }
}
