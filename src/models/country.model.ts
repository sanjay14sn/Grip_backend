import { Document, Schema, model } from 'mongoose';

export interface ICountry extends Document {
  countryName: string;
  isActive?: number;
  isDelete?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

const countrySchema = new Schema<ICountry>({
  countryName: {
    type: String,
    required: true,
    trim: true
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

// Add custom index for case-insensitive unique countryName
countrySchema.index({ countryName: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });

export const Country = model<ICountry>('Country', countrySchema);
