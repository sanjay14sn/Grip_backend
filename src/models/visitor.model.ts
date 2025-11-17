import mongoose, { Schema, Document, ObjectId, Types } from 'mongoose';

export interface IVisitor extends Document {
  name: string;
  company: string;
  category: string;
  mobile: string;
  email: string;
  address?: string;
  visitDate: Date;
  invitedBy: ObjectId;
  createdBy: ObjectId;
  updatedBy?: ObjectId;
  deletedBy?: ObjectId;
  isActive: number;
  isDelete: number;
  status?: "pending" | "approve" | "reject";
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
  // NEW FIELDS
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

  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },

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
  updatedAt: { type: Date },
  deletedAt: { type: Date },
});


export const Visitor = mongoose.model<IVisitor>('Visitor', VisitorSchema);
