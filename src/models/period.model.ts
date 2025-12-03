import mongoose, { Schema, Document } from "mongoose";

export interface IPeriod extends Document {
    memberId: mongoose.Types.ObjectId;

    startDate: Date;
    endDate: Date;

    isClosed: boolean;

    // Metrics accumulated in this period
    metrics: {
        oneToOne: number;
        referrals: number;
        visitors: number;
        trainings: number;
        business: number;
        testimonials: number;
        attendanceDays: number;
        onTimeDays: number;
    };

    // Carry-forward available for next period
    carryForward: {
        oneToOne: number;
        referrals: number;
        visitors: number;
        trainings: number;
        business: number;
        testimonials: number;
    };

    // Totals computed for scoring
    totals: {
        oneToOne: number;
        referrals: number;
        visitors: number;
        trainings: number;
        business: number;
        testimonials: number;
        attendanceDays: number;
        onTimeDays: number;
    };

    // Carry-forward used in this period
    carryForwardUsed: {
        oneToOne: number;
        referrals: number;
        visitors: number;
        trainings: number;
        business: number;
        testimonials: number;
    };

    createdAt: Date;
    updatedAt: Date;
}

const PeriodSchema = new Schema<IPeriod>(
    {
        memberId: {
            type: Schema.Types.ObjectId,
            ref: "Member",
            required: true,
        },

        startDate: { type: Date, required: true },
        endDate: { type: Date, required: true },

        isClosed: { type: Boolean, default: false },

        metrics: {
            oneToOne: { type: Number, default: 0 },
            referrals: { type: Number, default: 0 },
            visitors: { type: Number, default: 0 },
            trainings: { type: Number, default: 0 },
            business: { type: Number, default: 0 },
            testimonials: { type: Number, default: 0 },
            attendanceDays: { type: Number, default: 0 },
            onTimeDays: { type: Number, default: 0 },
        },

        carryForward: {
            oneToOne: { type: Number, default: 0 },
            referrals: { type: Number, default: 0 },
            visitors: { type: Number, default: 0 },
            trainings: { type: Number, default: 0 },
            business: { type: Number, default: 0 },
            testimonials: { type: Number, default: 0 },
        },

        totals: {
            oneToOne: { type: Number, default: 0 },
            referrals: { type: Number, default: 0 },
            visitors: { type: Number, default: 0 },
            trainings: { type: Number, default: 0 },
            business: { type: Number, default: 0 },
            testimonials: { type: Number, default: 0 },
            attendanceDays: { type: Number, default: 0 },
            onTimeDays: { type: Number, default: 0 },
        },

        carryForwardUsed: {
            oneToOne: { type: Number, default: 0 },
            referrals: { type: Number, default: 0 },
            visitors: { type: Number, default: 0 },
            trainings: { type: Number, default: 0 },
            business: { type: Number, default: 0 },
            testimonials: { type: Number, default: 0 },
        },
    },
    {
        timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" },
    }
);

export default mongoose.model<IPeriod>("Period", PeriodSchema);
