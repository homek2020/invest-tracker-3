import mongoose from 'mongoose';
import { AccountCurrency, AccountProvider, AccountStatus } from '../../domain/models/Account';

export interface AccountDocument extends mongoose.Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  provider: AccountProvider;
  currency: AccountCurrency;
  status: AccountStatus;
}

export const AccountSchema = new mongoose.Schema<AccountDocument>(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    provider: { type: String, enum: Object.values(AccountProvider), required: true },
    currency: { type: String, enum: Object.values(AccountCurrency), required: true },
    status: { type: String, enum: Object.values(AccountStatus), default: AccountStatus.Active },
  },
  { timestamps: true }
);

AccountSchema.index({ userId: 1, name: 1 }, { unique: true });

export const AccountModel = mongoose.model<AccountDocument>('Account', AccountSchema);
