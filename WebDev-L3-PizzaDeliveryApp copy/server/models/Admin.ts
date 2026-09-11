import mongoose, { Schema, Document } from 'mongoose';

export interface IAdmin extends Document {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin';
  permissions: string[];
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const AdminSchema = new Schema<IAdmin>(
  {
    id: { type: String, sparse: true, index: true },
    name: { type: String, required: true, default: 'Administrator' },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, default: 'admin', enum: ['admin'] },
    permissions: [{ type: String, default: 'all' }],
    lastLogin: { type: Date },
  },
  {
    timestamps: true,
  }
);

export const AdminModel = mongoose.models.Admin || mongoose.model<IAdmin>('Admin', AdminSchema);
