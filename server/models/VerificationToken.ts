import mongoose, { Schema, Document } from 'mongoose';

export interface IVerificationToken extends Document {
  userId: string;
  email: string;
  token: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

export const VerificationTokenSchema = new Schema<IVerificationToken>(
  {
    userId: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

export const VerificationTokenModel =
  mongoose.models.VerificationToken ||
  mongoose.model<IVerificationToken>('VerificationToken', VerificationTokenSchema);
