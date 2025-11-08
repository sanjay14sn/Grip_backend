import { Document, Schema, model } from 'mongoose';

export interface IRole extends Document {
  name: string;
  permissions: Schema.Types.ObjectId[];
  isActive?: number;
  isDelete?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

}

const roleSchema = new Schema<IRole>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  permissions: [{
    type: Schema.Types.ObjectId,
    ref: 'Permission'
  }],
  isActive: { type: Number, default: 1 },
  isDelete: { type: Number, default: 0 },
  deletedAt: { type: Date }
}, {
  timestamps: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  }
});

roleSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc: any, ret) {
    if (doc.deletedAt) {
      ret.deletedAt = doc.deletedAt;
    }
    ret.createdAt = doc.createdAt;
    ret.updatedAt = doc.updatedAt;
  }
});

export const Role = model<IRole>('Role', roleSchema);
