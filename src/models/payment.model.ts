import { Schema, model, Document, ObjectId } from 'mongoose';

export interface IPayment extends Document {
    purpose: 'meeting' | 'event'|'training';
    topic: string;
    image?: {
        docName: string;
        docPath: string;
        originalName: string;
    };
    qrCode?: {
        docName: string;
        docPath: string;
        originalName: string;
    };
    hotelName?: string;
    amount: number;
    chapterId: ObjectId[];
    comments?: string;
    paymentRequired: boolean;
    startDate: Date;
    endDate: Date;
    address: string;
    latitude: number;
    longitude: number;
    createdBy: ObjectId;
    updatedBy?: ObjectId;
    deletedBy?: ObjectId;
    trainingType?:string;
    deletedAt?: Date;
    isActive: number;
    isDelete: number;
}

const paymentSchema = new Schema<IPayment>(
    {
        purpose: {
            type: String,
            required: true,
            enum: ['meeting', 'event','training'],
        },
        // ✅ Added hotelName field
        hotelName: {
            type: String
        },
        topic: {
            type: String,
            required: true,
        },
        trainingType: {
            type: String
        },
        image: {
            docName: { type: String },
            docPath: { type: String },
            originalName: { type: String },
        },
        qrCode: {
            docName: { type: String },
            docPath: { type: String },
            originalName: { type: String },
        },
        amount: {
            type: Number,
            required: true,
        },
        chapterId: [{
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Chapter',
        }],
        comments: {
            type: String,
        },
        paymentRequired: {
            type: Boolean,
            default: true,
        },
        startDate: {
            type: Date,
            required: true,
        },
        endDate: {
            type: Date,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        latitude: {
            type: Number,
            required: true,
        },
        longitude: {
            type: Number,
            required: true,
        },
        createdBy: {
            type: Schema.Types.ObjectId,
            required: true,
            ref: 'Member',
        },
        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Member',
        },
        deletedBy: {
            type: Schema.Types.ObjectId,
            ref: 'Member',
        },
        deletedAt: {
            type: Date,
        },
        isActive: {
            type: Number,
            default: 1,
        },
        isDelete: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true, // Handles createdAt and updatedAt fields automatically
    }
);

const Payment = model<IPayment>('Payment', paymentSchema);

export default Payment;
