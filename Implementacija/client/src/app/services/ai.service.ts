import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, timeout } from 'rxjs';
import { AuthService } from './auth.service';
import { TranslationService } from './translation.service';
import { Grid, CellType } from '@shared/types';

export interface KeyMoment {
  stepIndex: number;
  explanation: string;
}

export interface AIRecommendation {
  best: { algorithm: string; reason: string; confidence: number };
  worst: { algorithm: string; reason: string; confidence: number };
}

export interface AIGeneratedMap {
  rows: number;
  cols: number;
  start: [number, number];
  goal: [number, number];
  walls: [number, number][];
  weights: { pos: [number, number]; weight: number }[];
  generator: string;
  explanation: { sr: string; en: string };
  metrics: Record<string, { expanded: number; pathCost: number | null; foundPath: boolean }>;
  intent: string;
  intentAlgorithms: string[];
}

@Injectable({ providedIn: 'root' })
export class AIService {
  private readonly API = 'http://localhost:3000/api/ai';

  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private i18n: TranslationService,
  ) {}

  private get headers() {
    return this.auth.getAuthHeaders();
  }

  /**
   * Summarize grid for AI context (don't send entire grid).
   */
  summarizeGrid(grid: Grid): object {
    let wallCount = 0;
    let weightedCount = 0;
    let totalWeight = 0;

    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.cols; c++) {
        const cell = grid.cells[r][c];
        if (cell.type === CellType.WALL) wallCount++;
        if (cell.weight > 1) {
          weightedCount++;
          totalWeight += cell.weight;
        }
      }
    }

    const totalCells = grid.rows * grid.cols;
    return {
      rows: grid.rows,
      cols: grid.cols,
      totalCells,
      wallCount,
      wallDensity: (wallCount / totalCells * 100).toFixed(1) + '%',
      weightedCount,
      avgWeight: weightedCount > 0 ? (totalWeight / weightedCount).toFixed(1) : 0,
      start: [grid.start.row, grid.start.col],
      goal: [grid.goal.row, grid.goal.col],
      manhattanDistance: Math.abs(grid.goal.row - grid.start.row) + Math.abs(grid.goal.col - grid.start.col),
    };
  }

  /**
   * AI Tutor — get key moments from algorithm trace.
   */
  getKeyMoments(
    algorithm: string,
    grid: Grid,
    metrics: object,
    traceHighlights: object[],
  ): Observable<{ keyMoments: KeyMoment[] }> {
    return this.http.post<{ keyMoments: KeyMoment[] }>(`${this.API}/tutor`, {
      algorithm,
      mapSummary: this.summarizeGrid(grid),
      metrics,
      traceHighlights,
      language: this.i18n.getLanguage(),
    }, { headers: this.headers }).pipe(timeout(60000));
  }

  /**
   * AI Generator — generate map from text description.
   */
  generateMap(description: string, rows = 25, cols = 50): Observable<AIGeneratedMap> {
    return this.http.post<AIGeneratedMap>(`${this.API}/generate`, {
      description,
      rows,
      cols,
      language: this.i18n.getLanguage(),
    }, { headers: this.headers }).pipe(timeout(60000));
  }

  /**
   * AI Recommender — predict best/worst algorithm for a map.
   */
  getRecommendation(grid: Grid): Observable<any> {
    const walls: [number, number][] = [];
    const weights: { pos: [number, number]; weight: number }[] = [];
    for (let r = 0; r < grid.rows; r++)
      for (let c = 0; c < grid.cols; c++) {
        if (grid.cells[r][c].type === CellType.WALL) walls.push([r, c]);
        if (grid.cells[r][c].weight > 1) weights.push({ pos: [r, c], weight: grid.cells[r][c].weight });
      }
    return this.http.post<any>(`${this.API}/recommend`, {
      mapSummary: this.summarizeGrid(grid),
      gridData: {
        rows: grid.rows, cols: grid.cols, walls, weights,
        start: [grid.start.row, grid.start.col],
        goal: [grid.goal.row, grid.goal.col],
      },
      language: this.i18n.getLanguage(),
    }, { headers: this.headers }).pipe(timeout(60000));
  }

  /**
   * AI Contextual help — explain a metric or result.
   */
  explain(context: string, question: string): Observable<{ explanation: string }> {
    return this.http.post<{ explanation: string }>(`${this.API}/explain`, {
      context,
      question,
    }, { headers: this.headers }).pipe(timeout(30000));
  }

  /**
   * AI Compare Insight — summarize comparison results.
   */
  getCompareInsight(results: object[], grid: Grid): Observable<{ insight: string }> {
    return this.http.post<{ insight: string }>(`${this.API}/compare-insight`, {
      results,
      mapSummary: this.summarizeGrid(grid),
    }, { headers: this.headers }).pipe(timeout(30000));
  }
}
