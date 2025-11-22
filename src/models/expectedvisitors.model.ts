import { Schema, model } from "mongoose";

const ExpectedVisitorSchema = new Schema(
  {
    name: String,
    company: String,
    category: String,
    mobile: String,
    email: String,
    address: String,
    visitDate: Date,
    invitedBy: { type: Schema.Types.ObjectId, ref: "Member" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    isActive: Number,
    isDelete: Number,
    status: String,
    chapterId: { type: Schema.Types.ObjectId, ref: "Chapter" },
    zoneId: { type: Schema.Types.ObjectId, ref: "Zone" },
  },
  { timestamps: true }
);

// IMPORTANT: give it a UNIQUE NAME
export const ExpectedVisitor = model("ExpectedVisitor", ExpectedVisitorSchema);
