import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IThankYouSlip extends Document {
    toMember: ObjectId;
    fromMember: ObjectId;
    amount: number;
    comments?: string;
    createdBy: ObjectId;
    updatedBy?: ObjectId;
    isActive: number;
    isDelete: number;
    status?: "pending" | "approve" | "reject";
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

const ThankYouSlipSchema: Schema = new Schema(
    {
        toMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
        fromMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
        amount: { type: Number, required: true },
        comments: { type: String },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Member' },
        isActive: { type: Number, default: 1 },
        isDelete: { type: Number, default: 0 },
        status: {
            type: String,
            enum: ["pending", "approve", "reject"],
            default: "pending",
        },
        deletedAt: { type: Date },
    },
    { timestamps: true }
);

ThankYouSlipSchema.index({ comments: 'text' });

export default mongoose.model<IThankYouSlip>('thankyouslips', ThankYouSlipSchema);
