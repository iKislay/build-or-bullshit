import mongoose, { Schema, Document } from 'mongoose';

export interface IVote extends Document {
  roomId: string;
  projectId: string;
  panelistId: string;
  category: string;
  value: number | string;
  createdAt: Date;
}

const VoteSchema = new Schema<IVote>({
  roomId: { type: String, required: true },
  projectId: { type: String, required: true },
  panelistId: { type: String, required: true },
  category: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  createdAt: { type: Date, default: Date.now },
});

VoteSchema.index({ roomId: 1, projectId: 1, panelistId: 1, category: 1 });

export default mongoose.models.Vote || mongoose.model<IVote>('Vote', VoteSchema);
