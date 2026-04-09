import { Injectable } from '@angular/core';

export interface ExportableRun {
  algorithm: string;
  heuristic: string;
  neighborMode: number;
  swarmWeight?: number;
  expandedNodes: number;
  maxFrontierSize: number;
  pathCost: number | null;
  pathLength: number | null;
  totalSteps: number;
  executionTimeMs: number;
  foundPath: boolean;
  mapRows: number;
  mapCols: number;
  wallCount: number;
  weightedCount: number;
  timestamp: string;
}

@Injectable({ providedIn: 'root' })
export class ExportService {
  private runs: ExportableRun[] = [];

  addRun(run: ExportableRun): void {
    this.runs.push(run);
  }

  addRuns(runs: ExportableRun[]): void {
    this.runs.push(...runs);
  }

  clearRuns(): void {
    this.runs = [];
  }

  getRuns(): ExportableRun[] {
    return [...this.runs];
  }

  exportJSON(): void {
    const data = JSON.stringify(this.runs, null, 2);
    this.download(data, 'pathfinder-results.json', 'application/json');
  }

  exportCSV(): void {
    if (this.runs.length === 0) return;

    const headers = Object.keys(this.runs[0]);
    const rows = this.runs.map(run =>
      headers.map(h => {
        const val = (run as any)[h];
        return this.escapeCsvField(val);
      }).join(','),
    );

    const csv = [headers.join(','), ...rows].join('\n');
    this.download(csv, 'pathfinder-results.csv', 'text/csv');
  }

  exportCompareJSON(results: any[]): void {
    const data = JSON.stringify(results, null, 2);
    this.download(data, 'pathfinder-compare.json', 'application/json');
  }

  exportCompareCSV(results: any[]): void {
    if (results.length === 0) return;
    const headers = Object.keys(results[0]);
    const rows = results.map(r =>
      headers.map(h => {
        const val = (r as any)[h];
        return this.escapeCsvField(val);
      }).join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    this.download(csv, 'pathfinder-compare.csv', 'text/csv');
  }

  private escapeCsvField(val: unknown): string {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  private download(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}
