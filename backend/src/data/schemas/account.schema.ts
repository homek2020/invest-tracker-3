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
    provider: { type: String, enum: ['Finam', 'TradeRepublic', 'BYBIT', 'BCS', 'IBKR'], required: true },
    currency: { type: String, enum: ['RUB', 'USD', 'EUR'], required: true },
    status: { type: String, enum: ['active', 'archived'], default: 'active' },
  },
  { timestamps: true }
);

AccountSchema.index({ userId: 1, name: 1 }, { unique: true });

export const AccountModel = mongoose.model<AccountDocument>('Account', AccountSchema);
