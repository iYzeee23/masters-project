import mongoose, { Schema, Document } from 'mongoose';

export interface IMap extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  rows: number;
  cols: number;
  gridData: {
    walls: [number, number][];
    weights: { pos: [number, number]; weight: number }[];
    start: [number, number];
    goal: [number, number];
  };
  generatorType?: string;
  generatorParams?: Record<string, unknown>;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MapSchema = new Schema<IMap>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    rows: { type: Number, required: true, min: 5, max: 200 },
    cols: { type: Number, required: true, min: 5, max: 200 },
    gridData: {
      walls: { type: [[Number]], default: [] },
      weights: {
        type: [{ pos: [Number], weight: Number }],
        default: [],
      },
      start: { type: [Number], required: true },
      goal: { type: [Number], required: true },
    },
    generatorType: { type: String },
    generatorParams: { type: Schema.Types.Mixed },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const MapModel = mongoose.model<IMap>('Map', MapSchema);
