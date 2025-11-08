import mongoose, { Document, Schema, model, Types } from "mongoose";

export interface INotification extends Document {
  type: "testimonial" | "thankyou" | "onetoone" | "referral";
  toMember: Types.ObjectId;
  fromMember: Types.ObjectId;
  relatedId: Types.ObjectId;
  refPath: "testimonialslips" | "thankyouslips" | "OneToOne" | "referralslips";
  isRead: boolean;
  createdAt: Date;
  updatedAt?: Date;
  isDelete: number;
}

const NotificationSchema = new Schema<INotification>({
  type: {
    type: String,
    enum: ["testimonial", "thankyou", "onetoone", "referral"],
    required: true,
  },
  toMember: { type: Schema.Types.ObjectId, ref: "Member", required: true },
  fromMember: { type: Schema.Types.ObjectId, ref: "Member", required: true },
  relatedId: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: "refPath",
  },
  refPath: {
    type: String,
    required: true,
    enum: ["testimonialslips", "thankyouslips", "OneToOne", "referralslips"],
  },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date },
  isDelete: { type: Number, default: 0 },
});

export const Notification = model<INotification>(
  "Notification",
  NotificationSchema
);
