import { Schema, model, Document } from 'mongoose';

export interface IPermission extends Document {
    key: string;
    group: string;
    type: string;
    title: string;
    order: number;
    category: string;
    isDelete?: number;
    deletedAt?: Date;
}

const permissionSchema = new Schema<IPermission>({
    key: { type: String, required: true, unique: true },
    group: { type: String, required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    order: { type: Number, required: true },
    category: { type: String, required: true },
    isDelete: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null },
}, { timestamps: true });

export const Permission = model<IPermission>('Permission', permissionSchema);
