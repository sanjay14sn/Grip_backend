import { Document, Schema, model, ObjectId } from 'mongoose';

export interface IChapter extends Document {
    chapterName: string;
    countryName: string;
    stateName: string;
    zoneId: ObjectId;
    cidId: ObjectId[];
    mentorId: ObjectId;
    meetingVenue?: string;
    chapterCreatedDate: Date;
    meetingDayAndTime?: Date;
    meetingType: 'Online' | 'In Person' | 'Hybrid';
    weekday: string; // <-- add this
    isActive?: number;
    isDelete?: number;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;
}

const chapterSchema = new Schema<IChapter>({
    chapterName: {
        type: String,
        required: true,
        trim: true
    },
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
    zoneId: {
        type: Schema.Types.ObjectId,
        ref: 'Zone',
        required: true
    },
    cidId: {
        type: [Schema.Types.ObjectId],
        ref: 'User',
        required: true
    },
    mentorId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    meetingVenue: {
        type: String
    },
    chapterCreatedDate: {
        type: Date,
        required: true
    },
    meetingDayAndTime: {
        type: String
    },
    meetingType: {
        type: String,
        required: true,
        enum: ['Online', 'In Person', 'Hybrid']
    },

    // ⭐ NEW FIELD
    weekday: {
        type: String,
        required: true,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
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
}, {
    timestamps: { currentTime: () => new Date() }
});

export const Chapter = model<IChapter>('Chapter', chapterSchema);
