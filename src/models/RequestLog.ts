import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IRequestLog extends Document {
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  method: string;
  url: string;
  moduleName: string;
  userId?: Types.ObjectId;
  statusCode?: number;
  responseTime?: number;
  Response?: any;
}

const RequestLogSchema: Schema = new Schema({
  timestamp: { type: Date, default: Date.now },
  ipAddress: { type: String, required: true },
  userAgent: { type: String, required: true },
  method: { type: String, required: true },
  url: { type: String, required: true },
  moduleName: { type: String, required: false },
  userId: { type: Types.ObjectId, ref: 'User' },
  statusCode: { type: Number },
  responseTime: { type: Number },
  Response: { type: Schema.Types.Mixed }
});

export const RequestLog = mongoose.model<IRequestLog>('RequestLog', RequestLogSchema);
