import mongoose, { Schema, Document } from 'mongoose';

export interface IRunMetrics {
  expandedNodes: number;
  maxFrontierSize: number;
  pathCost: number | null;
  pathLength: number | null;
  totalSteps: number;
  executionTimeMs: number;
  foundPath: boolean;
}

export interface IRun extends Document {
  userId: mongoose.Types.ObjectId;
  mapId: mongoose.Types.ObjectId;
  algorithm: string;
  options: {
    heuristic: string;
    neighborMode: number;
    swarmWeight?: number;
  };
  metrics: IRunMetrics;
  createdAt: Date;
}

const RunSchema = new Schema<IRun>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    mapId: {
      type: Schema.Types.ObjectId,
      ref: 'Map',
      required: true,
      index: true,
    },
    algorithm: { type: String, required: true },
    options: {
      heuristic: { type: String, required: true },
      neighborMode: { type: Number, required: true },
      swarmWeight: { type: Number },
    },
    metrics: {
      expandedNodes: { type: Number, required: true },
      maxFrontierSize: { type: Number, required: true },
      pathCost: { type: Number, default: null },
      pathLength: { type: Number, default: null },
      totalSteps: { type: Number, required: true },
      executionTimeMs: { type: Number, required: true },
      foundPath: { type: Boolean, required: true },
    },
  },
  { timestamps: true },
);

export const Run = mongoose.model<IRun>('Run', RunSchema);
