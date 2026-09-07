import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

export const DATA_FILE = path.join(process.cwd(), 'server-data.json');

export async function connectDB(): Promise<boolean> {
  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri && mongoUri.startsWith('mongodb')) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 3000,
      });
      console.log('✅ Connected to MongoDB via Mongoose:', mongoUri.split('@').pop());
      return true;
    } catch (err: any) {
      console.warn('⚠️ MongoDB connection attempt failed, falling back to local file persistence:', err.message);
      return false;
    }
  } else {
    console.log('ℹ️ MONGODB_URI not set or in local mode. Running with local persistent data engine (server-data.json).');
    return false;
  }
}
