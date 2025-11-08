import { ObjectId } from 'mongodb';
import { Document, Schema, model } from 'mongoose';

export interface IZone extends Document {
  countryName: string;
  stateName: string;
  zoneName: string;
  dob: Date;
  isActive?: number;
  isDelete?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

const zoneSchema = new Schema<IZone>({
  countryName: {
    type: String,
    required: true,
    trim: true
  },
  stateName: {
    type: String,
    required: true,
    trim: true
  },
  zoneName: {
    type: String,
    required: true,
    trim: true
  },
  dob: {
    type: Date,
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

// Add custom index for case-insensitive unique zoneName
zoneSchema.index({ zoneName: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Zone = model<IZone>('Zone', zoneSchema);
