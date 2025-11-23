import mongoose from 'mongoose';

export interface AccountBalanceDocument extends mongoose.Document {
  accountId: mongoose.Types.ObjectId;
  periodYear: number;
  periodMonth: number;
  amount: number;
  netFlow: number;
  isClosed: boolean;
}

export const AccountBalanceSchema = new mongoose.Schema<AccountBalanceDocument>(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    periodYear: { type: Number, required: true },
    periodMonth: { type: Number, required: true },
    amount: { type: Number, required: true, min: 0 },
    netFlow: { type: Number, required: true, min: 0 },
    isClosed: { type: Boolean, default: false },
  },
  { timestamps: { updatedAt: true, createdAt: true } }
);

AccountBalanceSchema.index({ accountId: 1, periodYear: 1, periodMonth: 1 }, { unique: true });

export const AccountBalanceModel = mongoose.model<AccountBalanceDocument>('AccountBalance', AccountBalanceSchema);
