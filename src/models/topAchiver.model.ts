import { Schema, model } from "mongoose";

const TopAchiverSchema = new Schema(
  {
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
    },
    referrals: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    business: { type: Schema.Types.ObjectId, ref: "Member", required: true },
    visitors: { type: Schema.Types.ObjectId, ref: "Member", required: true },
  },
  { timestamps: true }
);

export const TopAchiver = model("TopAchiver", TopAchiverSchema);
