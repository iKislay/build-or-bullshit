import mongoose, { Schema, Document } from 'mongoose';

export interface IPanelist extends Document {
  name: string;
  code: string;
  createdAt: Date;
}

const PanelistSchema = new Schema<IPanelist>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Panelist || mongoose.model<IPanelist>('Panelist', PanelistSchema);
