import { Schema, model, Document, ObjectId } from 'mongoose';

export interface IReferralDetail {
    name: string;
    category: string;
    mobileNumber: string;
    comments?: string;
    address?: string;
}

export interface IReferralSlip extends Document {
    toMember: ObjectId;
    referalStatus: 'told them you would call' | 'given your card';
    referalDetail: IReferralDetail;
    fromMember: ObjectId;
    createdBy: ObjectId;
    updatedBy?: ObjectId;
    isActive: number;
    isDelete: number;
    status?: "pending" | "approve" | "reject";
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}

const ReferralDetailSchema = new Schema<IReferralDetail>({
    name: { type: String, required: true },
    category: { type: String, required: true },
    mobileNumber: { type: String, required: true },
    comments: { type: String },
    address: { type: String },
});

const ReferralSlipSchema = new Schema<IReferralSlip>({
    toMember: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    referalStatus: {
        type: String,
        enum: ['told them you would call', 'given your card'],
        required: true,
    },
    referalDetail: { type: ReferralDetailSchema, required: true },
    fromMember: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Member' },
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

export const ReferralSlipModel = model<IReferralSlip>('referralslips', ReferralSlipSchema);
