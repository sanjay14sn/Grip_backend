import mongoose from "mongoose";

const ReferralStatusLogSchema = new mongoose.Schema({
  referralId: String,
  status: String,
  toMember: Object,
  fromMember: Object,
  referralDetail: Object,
  createdAt: { type: Date, default: Date.now },
});

export const ReferralStatusLog = mongoose.model(
  "ReferralStatusLog",
  ReferralStatusLogSchema
);
