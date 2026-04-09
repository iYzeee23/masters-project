import mongoose, { Schema, Document } from 'mongoose';

export interface ITrace extends Document {
  runId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  events: any[];
  totalSteps: number;
  createdAt: Date;
}

const TraceSchema = new Schema<ITrace>(
  {
    runId: {
      type: Schema.Types.ObjectId,
      ref: 'Run',
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    events: { type: Schema.Types.Mixed, default: [] },
    totalSteps: { type: Number, required: true },
  },
  { timestamps: true },
);

export const Trace = mongoose.model<ITrace>('Trace', TraceSchema);
