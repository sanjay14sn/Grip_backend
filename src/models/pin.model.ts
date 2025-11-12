import mongoose, { Schema, Document } from "mongoose";

export interface IPin extends Document {
  name: string;
  image?: {
    docName: string;
    docPath: string;
    originalName: string;
  } | null;
  createdBy?: string;
  updatedBy?: string;
  isDelete: number;
  createdAt: Date;
  updatedAt?: Date;
}

const PinSchema: Schema = new Schema(
  {
    name: { type: String, required: true },
    image: {
      docName: String,
      docPath: String,
      originalName: String,
    }, // ✅ store image as object
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
    isDelete: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { versionKey: false }
);

export const Pin = mongoose.model<IPin>("Pin", PinSchema);
