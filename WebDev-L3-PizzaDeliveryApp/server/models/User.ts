import mongoose, { Schema, Document } from 'mongoose';

export interface IUserAddress {
  street: string;
  city: string;
  pincode: string;
  notes?: string;
}

export interface IUser extends Document {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  phone: string;
  isVerified: boolean;
  addresses: IUserAddress[];
  role: 'customer' | 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
}

export const UserSchema = new Schema<IUser>(
  {
    id: { type: String, sparse: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    phone: { type: String, default: '' },
    isVerified: { type: Boolean, default: false },
    addresses: [
      {
        street: { type: String, default: '' },
        city: { type: String, default: '' },
        pincode: { type: String, default: '' },
        notes: { type: String, default: '' },
      },
    ],
    role: { type: String, enum: ['customer', 'admin', 'user'], default: 'customer' },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
