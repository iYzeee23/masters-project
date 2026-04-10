import mongoose, { Schema, Document } from 'mongoose';

export interface IBenchmarkResult extends Document {
  /* ── Batch identification ─────────────────────────────── */
  batchId: string;                 // groups results from a single benchmark run
  evaluationCategory: string;      // E1 | E6 | E7 | E8 | E9 | E10

  /* ── Map configuration ────────────────────────────────── */
  generatorType: string;           // random | maze | weighted | mixed | bottleneck | city | open | unsolvable
  generatorSeed: number;
  mapRows: number;
  mapCols: number;
  density: number;                 // 0-100, for random/mixed generators
  wallCount: number;
  weightedCount: number;

  /* ── Algorithm configuration ──────────────────────────── */
  algorithm: string;
  heuristic: string;               // manhattan | euclidean | chebyshev | octile
  neighborMode: number;            // 4 | 8
  swarmWeight: number | null;

  /* ── Results ──────────────────────────────────────────── */
  expandedNodes: number;
  pathCost: number | null;
  pathLength: number | null;
  foundPath: boolean;
  executionTimeMs: number;

  /* ── Timestamps ───────────────────────────────────────── */
  createdAt: Date;
}

const BenchmarkResultSchema = new Schema<IBenchmarkResult>({
  batchId:             { type: String, required: true, index: true },
  evaluationCategory:  { type: String, required: true, index: true },

  generatorType:       { type: String, required: true },
  generatorSeed:       { type: Number, required: true },
  mapRows:             { type: Number, required: true },
  mapCols:             { type: Number, required: true },
  density:             { type: Number, required: true, default: 0 },
  wallCount:           { type: Number, required: true },
  weightedCount:       { type: Number, required: true },

  algorithm:           { type: String, required: true, index: true },
  heuristic:           { type: String, required: true },
  neighborMode:        { type: Number, required: true },
  swarmWeight:         { type: Number, default: null },

  expandedNodes:       { type: Number, required: true },
  pathCost:            { type: Number, default: null },
  pathLength:          { type: Number, default: null },
  foundPath:           { type: Boolean, required: true },
  executionTimeMs:     { type: Number, required: true },
}, { timestamps: true });

// Compound index for common queries
BenchmarkResultSchema.index({ batchId: 1, evaluationCategory: 1, algorithm: 1 });
BenchmarkResultSchema.index({ evaluationCategory: 1, generatorType: 1 });

export const BenchmarkResult = mongoose.model<IBenchmarkResult>(
  'BenchmarkResult',
  BenchmarkResultSchema,
);
