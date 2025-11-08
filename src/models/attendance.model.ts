import mongoose, { Schema, Document, ObjectId } from 'mongoose';

export interface ILocation {
    lat: number;
    lng: number;
}

export interface IAttendance extends Document {
    memberId: ObjectId;
    meetingId: ObjectId;
    userLocation: ILocation;
    createdBy: ObjectId;
    updatedBy?: ObjectId;
    deletedBy?: ObjectId;
    isActive: number;
    isDelete: number;
    status?: 'present' | 'late' | 'absent' | "medical" | "substitute";
    createdAt: Date;
    updatedAt?: Date;
    deletedAt?: Date;
}
const LocationSchema: Schema = new Schema({
    lat: { type: Number },
    lng: { type: Number },
});

const AttendanceSchema: Schema = new Schema({
    memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Member', required: true },
    meetingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meeting', required: true },
    userLocation: { type: LocationSchema },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'createdByModel',
    },
    createdByModel: {
        type: String,
        enum: ['User', 'Member'],
    },
    updatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'updatedByModel',
    },
    updatedByModel: {
        type: String,
        enum: ['User', 'Member'],
    },
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        refPath: 'deletedByModel',
    },
    deletedByModel: {
        type: String,
        enum: ['User', 'Member'],
    },
    isActive: { type: Number, default: 1 },
    isDelete: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["present", "late", "absent", "medical", "substitute"],
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
    deletedAt: { type: Date },
});

AttendanceSchema.index({ memberId: 1, meetingId: 1 }, { unique: true });

export const Attendance = mongoose.model<IAttendance>('Attendance', AttendanceSchema);
