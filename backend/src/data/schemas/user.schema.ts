import mongoose from 'mongoose';
import { UserSettings } from '../../domain/models/User';

const SettingsSchema = new mongoose.Schema<UserSettings>(
  {
    displayCurrency: { type: String, default: 'RUB' },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' },
    defaultReportCurrency: { type: String, enum: ['RUB', 'USD', 'EUR'], default: 'RUB' },
    defaultDashboardRange: { type: String, enum: ['all', '1y', 'ytd'], default: 'all' },
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
