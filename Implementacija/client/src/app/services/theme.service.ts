import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Theme = 'dark' | 'light';

export interface ThemeColors {
  background: string;
  gridLine: string;
  empty: string;
  wall: string;
  start: string;
  goal: string;
  open: string;
  closed: string;
  current: string;
  path: string;
  weightLow: string;
  weightMed: string;
  weightHigh: string;
  text: string;
}

const DARK_COLORS: ThemeColors = {
  background: '#0f172a',
  gridLine: '#1e293b',
  empty: '#1e293b',
  wall: '#334155',
  start: '#22c55e',
  goal: '#ef4444',
  open: '#3b82f6',
  closed: '#6366f1',
  current: '#f59e0b',
  path: '#facc15',
  weightLow: '#164e63',
  weightMed: '#155e75',
  weightHigh: '#0e7490',
  text: '#94a3b8',
};

const LIGHT_COLORS: ThemeColors = {
  background: '#f8fafc',
  gridLine: '#e2e8f0',
  empty: '#f1f5f9',
  wall: '#475569',
  start: '#16a34a',
  goal: '#dc2626',
  open: '#60a5fa',
  closed: '#a78bfa',
  current: '#f59e0b',
  path: '#eab308',
  weightLow: '#a5f3fc',
  weightMed: '#67e8f9',
  weightHigh: '#22d3ee',
  text: '#334155',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private currentTheme: Theme = 'dark';
  readonly theme$ = new BehaviorSubject<Theme>('dark');
  readonly colors$ = new BehaviorSubject<ThemeColors>(DARK_COLORS);

  constructor() {
    const saved = localStorage.getItem('pf-theme') as Theme | null;
    if (saved) {
      this.setTheme(saved);
    }
  }

  getTheme(): Theme {
    return this.currentTheme;
  }

  getColors(): ThemeColors {
    return this.currentTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  }

  setTheme(theme: Theme): void {
    this.currentTheme = theme;
    this.theme$.next(theme);
    this.colors$.next(this.getColors());
    localStorage.setItem('pf-theme', theme);

    // Toggle Tailwind dark class on html element
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggle(): void {
    this.setTheme(this.currentTheme === 'dark' ? 'light' : 'dark');
  }
}
