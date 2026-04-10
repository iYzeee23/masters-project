import mongoose, { Schema, Document } from 'mongoose';

export interface IAIBenchmarkResult extends Document {
  batchId: string;

  /* ── Test type ────────────────────────────────────────── */
  testType: string;            // 'recommend' | 'generate' | 'tutor' | 'explain' | 'compare-insight'

  /* ── Map context ──────────────────────────────────────── */
  generatorType: string;
  mapRows: number;
  mapCols: number;
  wallCount: number;
  weightedCount: number;

  /* ── AI request ───────────────────────────────────────── */
  prompt: string;              // truncated prompt sent
  language: string;
  aiModel: string;             // model used (gpt-4o-mini, Mistral-small, etc.)

  /* ── AI response ──────────────────────────────────────── */
  responseTimeMs: number;
  validJson: boolean;          // did AI return parseable JSON?
  errorMessage: string | null;

  /* ── Recommend-specific ──────────────────────────────── */
  aiPredictedBest: string | null;
  aiPredictedWorst: string | null;
  actualBest: string | null;
  actualWorst: string | null;
  bestCorrect: boolean | null;
  worstCorrect: boolean | null;

  /* ── Generate-specific ───────────────────────────────── */
  requestedIntent: string | null;         // algo_excels, algo_struggles, etc.
  intentAlgorithms: string[];
  intentSatisfied: boolean | null;        // did the generated map match the intent?
  intentScore: number | null;             // quantitative intent match score

  /* ── Tutor-specific ──────────────────────────────────── */
  momentsReturned: number | null;
  momentsValid: boolean | null;           // did all stepIndices stay within bounds?

  createdAt: Date;
}

const AIBenchmarkResultSchema = new Schema<IAIBenchmarkResult>({
  batchId:            { type: String, required: true, index: true },
  testType:           { type: String, required: true, index: true },

  generatorType:      { type: String, required: true },
  mapRows:            { type: Number, required: true },
  mapCols:            { type: Number, required: true },
  wallCount:          { type: Number, required: true },
  weightedCount:      { type: Number, required: true },

  prompt:             { type: String, required: true },
  language:           { type: String, required: true },
  aiModel:            { type: String, required: true, index: true },

  responseTimeMs:     { type: Number, required: true },
  validJson:          { type: Boolean, required: true },
  errorMessage:       { type: String, default: null },

  aiPredictedBest:    { type: String, default: null },
  aiPredictedWorst:   { type: String, default: null },
  actualBest:         { type: String, default: null },
  actualWorst:        { type: String, default: null },
  bestCorrect:        { type: Boolean, default: null },
  worstCorrect:       { type: Boolean, default: null },

  requestedIntent:    { type: String, default: null },
  intentAlgorithms:   { type: [String], default: [] },
  intentSatisfied:    { type: Boolean, default: null },
  intentScore:        { type: Number, default: null },

  momentsReturned:    { type: Number, default: null },
  momentsValid:       { type: Boolean, default: null },
}, { timestamps: true });

AIBenchmarkResultSchema.index({ batchId: 1, testType: 1 });

export const AIBenchmarkResult = mongoose.model<IAIBenchmarkResult>(
  'AIBenchmarkResult',
  AIBenchmarkResultSchema,
);
