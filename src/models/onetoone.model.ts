import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface IImage extends Document {
    docName: string;
    docPath: string;
    originalName: string;
}

export interface IOneToOne extends Document {
    toMember: ObjectId;
    whereDidYouMeet: 'yourlocation' | 'theirlocation' | 'commonlocation';
    date: Date;
    address: string;
    images?: IImage[];
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

const ImageSchema: Schema = new Schema({
    docName: { type: String },
    docPath: { type: String },
    originalName: { type: String },
});

const OneToOneSchema: Schema = new Schema({
    toMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    whereDidYouMeet: { type: String, enum: ['yourlocation', 'theirlocation', 'commonlocation'], required: true },
    date: { type: Date, required: true },
    address: { type: String, required: true },
    images: [ImageSchema],
    fromMember: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
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

export const OneToOne = mongoose.model<IOneToOne>('OneToOne', OneToOneSchema);
