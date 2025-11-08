import { Schema, model, Document, ObjectId } from 'mongoose';

export interface Image {
    docName: string;
    docPath: string;
    originalName: string;
}

export interface ITestimonialSlip extends Document {
    toMember: ObjectId;
    images?: Image[];
    comments?: string;
    fromMember: ObjectId;
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

const ImageSchema = new Schema<Image>({
    docName: { type: String, required: true },
    docPath: { type: String, required: true },
    originalName: { type: String, required: true },
}, { _id: false });

const TestimonialSlipSchema = new Schema<ITestimonialSlip>({
    toMember: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    images: { type: [ImageSchema], default: [] },
    comments: { type: String },
    fromMember: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Member', required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Member' },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'Member' },
    isActive: { type: Number, default: 1 },
    isDelete: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["pending", "approve", "reject"],
        default: "pending",
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    deletedAt: { type: Date }
});

export const TestimonialSlip = model<ITestimonialSlip>('testimonialslips', TestimonialSlipSchema);
