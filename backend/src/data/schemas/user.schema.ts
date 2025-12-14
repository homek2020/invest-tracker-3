import mongoose from 'mongoose';
import { ReportingPeriod, UserSettings } from '../../domain/models/User';
import { AccountCurrency } from '../../domain/models/Account';

const SettingsSchema = new mongoose.Schema<UserSettings>(
  {
    displayCurrency: String,
    theme: { type: String, enum: ['light', 'dark'] },
    reportingCurrency: { type: String, enum: Object.values(AccountCurrency), default: AccountCurrency.RUB },
    reportingPeriod: { type: String, enum: ['all', '1y', 'ytd'] as ReportingPeriod[], default: 'all' satisfies ReportingPeriod },
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
