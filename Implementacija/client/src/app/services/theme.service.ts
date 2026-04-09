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

// ============================================================
// WARM ORGANIC MINIMALISM — Design System
// Light: sand / linen / soft stone
// Dark:  espresso / walnut / warm charcoal
// ============================================================

const DARK_COLORS: ThemeColors = {
  // Canvas grid colors — warm walnut, premium, readable
  background: '#352B22',   // warm walnut
  gridLine: '#43372C',     // lighter walnut surface
  empty: '#3D3128',        // mid walnut
  wall: '#9E806E',         // sandy taupe (distinct)
  start: '#7EC856',        // bright warm green
  goal: '#E87461',         // coral-terra
  open: '#5BA8D4',         // sky blue (frontier)
  closed: '#9B7ED4',       // violet (explored)
  current: '#E8B84D',      // bright warm amber
  path: '#E87CA0',         // warm pink (found path)
  weightLow: '#43372C',    // surface
  weightMed: '#544536',    // mid border
  weightHigh: '#655642',   // lighter border
  text: '#EDE0D0',         // bright cream
};

const LIGHT_COLORS: ThemeColors = {
  // Canvas grid colors
  background: '#F5EFE7',   // warm linen — primary bg
  gridLine: '#EDE4D8',     // secondary bg
  empty: '#FFF9F2',        // surface (card)
  wall: '#8B7262',         // warm medium brown (distinct from goal)
  start: '#4A8C2A',        // fresh green
  goal: '#D05040',         // warm red-coral
  open: '#4A9AC7',         // sky blue (frontier)
  closed: '#7C5FB8',       // violet (explored)
  current: '#D4952C',      // warm gold
  path: '#D4688A',         // warm pink (found path)
  weightLow: '#EDE4D8',    // secondary bg
  weightMed: '#D7CABC',    // border
  weightHigh: '#C4B5A5',   // darker border
  text: '#6E5A4D',         // secondary text
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
