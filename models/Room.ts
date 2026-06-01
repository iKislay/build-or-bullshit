import mongoose, { Schema, Document } from 'mongoose';

export interface IRoom extends Document {
  name: string;
  code: string;
  hostSocketId: string;
  panelists: Array<{
    panelistId: string;
    name: string;
    socketId: string;
    score: number;
  }>;
  projects: Array<any>;
  currentProjectIndex: number;
  currentStage: string;
  reviewedProjects: Array<any>;
  isActive: boolean;
  stageGuessPointsAwarded: boolean;
  struggleGuessPointsAwarded: boolean;
  forceReveal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  hostSocketId: { type: String, required: true },
  panelists: [{
    panelistId: { type: String, required: true },
    name: { type: String, required: true },
    socketId: { type: String, required: true },
    score: { type: Number, default: 0 },
  }],
  projects: [{ type: Schema.Types.Mixed }],
  currentProjectIndex: { type: Number, default: -1 },
  currentStage: { type: String, default: 'guess' },
  reviewedProjects: [{ type: Schema.Types.Mixed }],
  isActive: { type: Boolean, default: true },
  stageGuessPointsAwarded: { type: Boolean, default: false },
  struggleGuessPointsAwarded: { type: Boolean, default: false },
  forceReveal: { type: Boolean, default: false },
}, {
  timestamps: true
});

export default (mongoose.models.Room as mongoose.Model<IRoom>) || mongoose.model<IRoom>('Room', RoomSchema);
