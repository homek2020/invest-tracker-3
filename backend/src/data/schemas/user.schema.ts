import mongoose from 'mongoose';
import { UserSettings } from '../../domain/models/User';

const SettingsSchema = new mongoose.Schema<UserSettings>(
  {
    theme: { type: String, enum: ['light', 'dark'] },
    reportingCurrency: { type: String, enum: ['RUB', 'USD', 'EUR'] },
    reportingPeriod: { type: String, enum: ['all', '1y', 'ytd'] },
  },
  { _id: false }
);

export const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    settings: SettingsSchema,
  },
  { timestamps: true }
);

export type UserDocument = mongoose.Document & {
  email: string;
  passwordHash: string;
  settings?: UserSettings;
};

export const UserModel = mongoose.model<UserDocument>('User', UserSchema);
