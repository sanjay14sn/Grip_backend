import mongoose, { Document, ObjectId, Schema, model } from 'mongoose';
import bcrypt from 'bcrypt';

export interface Image {
  docName: string;
  docPath: string;
  originalName: string;
}

export interface IUser extends Document {
  profileImage?: Image;
  name: string;
  companyName: string;
  mobileNumber: string;
  email: string;
  username: string;
  pin: string;
  role: string;
  isActive?: number;
  isDelete?: number;
  createdBy?: ObjectId;
  updatedBy: ObjectId;
  deletedBy: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date;
}

const ImageSchema = new Schema<Image>(
  {
    docName: { type: String, required: true },
    docPath: { type: String, required: true },
    originalName: { type: String, required: true },
  }
);

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  companyName: { type: String, required: true },
  mobileNumber: { type: String, required: true },
  email: { type: String, required: true },
  username: { type: String, required: true },
  pin: { type: String },
  role: { type: String, ref: 'Role', required: true },
  profileImage: { type: ImageSchema },
  isActive: { type: Number, default: 1 },
  isDelete: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  deletedAt: { type: Date }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  const user = this as any;
  if (user.isModified('pin')) {
    const salt = await bcrypt.genSalt(10);
    user.pin = await bcrypt.hash(user.pin, salt);
  }
  next();
});

export const User = model<IUser>('User', userSchema);
