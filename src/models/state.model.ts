import { Document, Schema, model } from 'mongoose';
import { ObjectId } from 'mongoose';

export interface IState extends Document {
  stateName: string;
  countryId: ObjectId;
  isActive?: number;
  isDelete?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

const stateSchema = new Schema<IState>({
  stateName: {
    type: String,
    required: true,
    trim: true
  },
  countryId: {
    type: Schema.Types.ObjectId,
    ref: 'Country',
    required: true
  },
  isActive: {
    type: Number,
    default: 1
  },
  isDelete: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  deletedAt: {
    type: Date
  }
}, { timestamps: true });

// Add custom index for case-insensitive unique stateName
stateSchema.index({ stateName: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const State = model<IState>('State', stateSchema);
