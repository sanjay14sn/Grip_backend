import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVisitor extends Document {
  name: string;
  company: string;
  category: string;
  mobile: string;
  email: string;
  address?: string;
  visitDate: Date;

  // ALLOW NULL
  invitedBy: Types.ObjectId | null;
  createdBy: Types.ObjectId | null;

  updatedBy?: Types.ObjectId | null;
  deletedBy?: Types.ObjectId | null;

  isActive: number;
  isDelete: number;
  status?: "pending" | "approve" | "reject";
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;

  // New fields
  chapter?: string;
  chapterId?: Types.ObjectId | null;
  chapter_directory_name?: string;
  invited_by_member?: string;
  invited_from?: string;
  zone?: string;
  zoneId?: Types.ObjectId | null;
}

const VisitorSchema: Schema = new Schema({
  name: { type: String, required: true },
  company: { type: String, required: true },
  category: { type: String, required: true },
  mobile: { type: String, required: true },
  email: { type: String, required: true },
  address: { type: String },

  visitDate: { type: Date, required: true },

  // FIXED (nullable ObjectIds)
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Member", default: null },

  isActive: { type: Number, default: 1 },
  isDelete: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ["pending", "approve", "reject"],
    default: "pending",
  },

  chapter: { type: String },
  chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter", default: null },
  chapter_directory_name: { type: String },

  invited_by_member: { type: String },
  invited_from: { type: String },

  zone: { type: String },
  zoneId: { type: mongoose.Schema.Types.ObjectId, ref: "Zone", default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: null },
  deletedAt: { type: Date, default: null },
});

export const Visitor = mongoose.model<IVisitor>('Visitor', VisitorSchema);
