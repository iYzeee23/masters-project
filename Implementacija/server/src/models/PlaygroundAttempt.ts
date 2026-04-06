import mongoose, { Schema, Document } from 'mongoose';

export interface IPlaygroundAttempt extends Document {
  userId: mongoose.Types.ObjectId;
  mapId: mongoose.Types.ObjectId;
  userPath: [number, number][];
  userDeclaredNoPath: boolean;
  optimalCost: number | null;
  userCost: number | null;
  score: number;
  breakdown: {
    costPenalty: number;
    invalidMovePenalty: number;
    speedBonus: number;
  };
  timeSpentMs: number;
  createdAt: Date;
}

const PlaygroundAttemptSchema = new Schema<IPlaygroundAttempt>(
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
    },
    userPath: { type: [[Number]], default: [] },
    userDeclaredNoPath: { type: Boolean, default: false },
    optimalCost: { type: Number, default: null },
    userCost: { type: Number, default: null },
    score: { type: Number, required: true },
    breakdown: {
      costPenalty: { type: Number, default: 0 },
      invalidMovePenalty: { type: Number, default: 0 },
      speedBonus: { type: Number, default: 0 },
    },
    timeSpentMs: { type: Number, required: true },
  },
  { timestamps: true },
);

export const PlaygroundAttempt = mongoose.model<IPlaygroundAttempt>(
  'PlaygroundAttempt',
  PlaygroundAttemptSchema,
);
