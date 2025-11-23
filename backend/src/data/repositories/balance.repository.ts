import { AccountBalanceModel } from '../schemas/accountBalance.schema';
import { AccountBalance } from '../../domain/models/AccountBalance';
import mongoose from 'mongoose';

function map(doc: any): AccountBalance {
  return {
    id: String(doc._id),
    accountId: String(doc.accountId),
    periodYear: doc.periodYear,
    periodMonth: doc.periodMonth,
    amount: doc.amount,
    netFlow: doc.netFlow,
    isClosed: doc.isClosed,
    updatedAt: doc.updatedAt,
  };
}

export const balanceRepository = {
  async upsert(balance: Omit<AccountBalance, 'id' | 'updatedAt'>): Promise<AccountBalance> {
    const doc = await AccountBalanceModel.findOneAndUpdate(
      { accountId: balance.accountId, periodYear: balance.periodYear, periodMonth: balance.periodMonth },
      balance,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).exec();
    return map(doc);
  },
  async findByAccountAndPeriod(accountId: string, year: number, month: number): Promise<AccountBalance | null> {
    const doc = await AccountBalanceModel.findOne({ accountId, periodYear: year, periodMonth: month }).exec();
    return doc ? map(doc) : null;
  },
  async findAllForUser(accountIds: string[], year: number, month: number): Promise<AccountBalance[]> {
    const docs = await AccountBalanceModel.find({ accountId: { $in: accountIds }, periodYear: year, periodMonth: month }).exec();
    return docs.map(map);
  },
  async listPeriodsForUser(accountIds: string[]): Promise<{ periodYear: number; periodMonth: number; isClosed: boolean }[]> {
    if (accountIds.length === 0) {
      return [];
    }
    const ids = accountIds.map((id) => new mongoose.Types.ObjectId(id));
    const docs = await AccountBalanceModel.aggregate(
      [
        { $match: { accountId: { $in: ids } } },
        {
          $group: {
            _id: { periodYear: '$periodYear', periodMonth: '$periodMonth' },
            isClosed: { $min: '$isClosed' },
          },
        },
        {
          $project: {
            _id: 0,
            periodYear: '$_id.periodYear',
            periodMonth: '$_id.periodMonth',
            isClosed: 1,
          },
        },
        { $sort: { periodYear: -1, periodMonth: -1 } },
      ],
      { allowDiskUse: true }
    ).exec();
    return docs as { periodYear: number; periodMonth: number; isClosed: boolean }[];
  },
};
