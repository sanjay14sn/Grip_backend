import mongoose from "mongoose";


export interface IMonthlyMetric extends Document {
    memberId: mongoose.Types.ObjectId;
    chapterId?: mongoose.Types.ObjectId;

    type:
    | "oneToOne"
    | "referral"
    | "visitor"
    | "training"
    | "business"
    | "testimonial"
    | "attendance"
    | "ontime";

    amount: number;         // quantity or rupees
    date: Date;             // event date
    meta?: any;             // optional metadata

    createdAt: Date;
    updatedAt: Date;
}

const MonthlyMetricSchema = new mongoose.Schema(
    {
        memberId: { type: mongoose.Schema.Types.ObjectId, ref: "Member", required: true },
        chapterId: { type: mongoose.Schema.Types.ObjectId, ref: "Chapter" },

        type: {
            type: String,
            enum: [
                "oneToOne",
                "referral",
                "visitor",
                "training",
                "business",
                "testimonial",
                "attendance",
                "ontime"
            ],
            required: true
        },

        amount: { type: Number, default: 1 },
        date: { type: Date, required: true },
        meta: { type: mongoose.Schema.Types.Mixed }
    },
    { timestamps: true }
);

export default mongoose.model("MonthlyMetric", MonthlyMetricSchema);