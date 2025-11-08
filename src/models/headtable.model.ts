import { Document, Schema, model, ObjectId } from 'mongoose';

export interface IHeadTable extends Document {
  countryId: ObjectId;
  stateId: ObjectId;
  zoneId: ObjectId;
  chapterId: ObjectId;
  panelAssociateId: ObjectId;
  isActive?: number;
  isDelete?: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

const headTableSchema = new Schema<IHeadTable>({
  countryId: {
    type: Schema.Types.ObjectId,
    ref: 'Country',
    required: true
  },
  stateId: {
    type: Schema.Types.ObjectId,
    ref: 'State',
    required: true
  },
  zoneId: {
    type: Schema.Types.ObjectId,
    ref: 'Zone',
    required: true
  },
  chapterId: {
    type: Schema.Types.ObjectId,
    ref: 'Chapter',
    required: true
  },
  panelAssociateId: {
    type: Schema.Types.ObjectId,
    ref: 'Member',
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

export const HeadTable = model<IHeadTable>('HeadTable', headTableSchema);
