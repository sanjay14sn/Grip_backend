import mongoose, { Schema, Document, ObjectId } from 'mongoose';

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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  deletedAt: { type: Date },
});

export const Visitor = mongoose.model<IVisitor>('Visitor', VisitorSchema);
