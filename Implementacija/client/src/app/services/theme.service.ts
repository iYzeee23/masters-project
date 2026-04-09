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
  current: '#E87CA0',      // warm pink (processing)
  path: '#E8B84D',         // bright warm amber (found path)
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
  current: '#D4688A',      // warm pink (processing)
  path: '#D4952C',         // warm gold (found path)
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

// ============================================================
// ALGORITHM RACE COLORS (for Compare tab)
// ============================================================

export const ALGO_COLORS: Record<string, string> = {
  bfs:               '#3B82F6', // blue
  dfs:               '#EF4444', // red
  dijkstra:          '#22C55E', // green
  a_star:            '#8B5CF6', // purple
  greedy:            '#F97316', // orange
  swarm:             '#06B6D4', // cyan
  convergent_swarm:  '#EC4899', // pink
  zero_one_bfs:      '#EAB308', // yellow
};

/** Darken a hex color by mixing with black (factor 0-1, 0=same, 1=black) */
export function darkenColor(hex: string, factor = 0.35): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const dr = Math.round(r * (1 - factor));
  const dg = Math.round(g * (1 - factor));
  const db = Math.round(b * (1 - factor));
  return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
}

/** Lighten a hex color by mixing with white (factor 0-1, 0=same, 1=white) */
export function lightenColor(hex: string, factor = 0.5): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * factor);
  const lg = Math.round(g + (255 - g) * factor);
  const lb = Math.round(b + (255 - b) * factor);
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`;
}

/** Blend multiple hex colors by averaging RGB channels */
export function blendColors(hexColors: string[]): string {
  if (hexColors.length === 0) return '#888888';
  if (hexColors.length === 1) return hexColors[0];
  let tr = 0, tg = 0, tb = 0;
  for (const hex of hexColors) {
    tr += parseInt(hex.slice(1, 3), 16);
    tg += parseInt(hex.slice(3, 5), 16);
    tb += parseInt(hex.slice(5, 7), 16);
  }
  const n = hexColors.length;
  const ar = Math.round(tr / n);
  const ag = Math.round(tg / n);
  const ab = Math.round(tb / n);
  return `#${ar.toString(16).padStart(2, '0')}${ag.toString(16).padStart(2, '0')}${ab.toString(16).padStart(2, '0')}`;
}
