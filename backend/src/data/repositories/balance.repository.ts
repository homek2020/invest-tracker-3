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
  async findPeriods(accountIds: string[]): Promise<{ periodYear: number; periodMonth: number; isClosed: boolean }[]> {
    const ids = accountIds.map((id) => new mongoose.Types.ObjectId(id));
    const docs = await AccountBalanceModel.aggregate([
      { $match: { accountId: { $in: ids } } },
      {
        $group: {
          _id: { year: '$periodYear', month: '$periodMonth' },
          isClosed: { $min: '$isClosed' },
        },
      },
      {
        $project: {
          _id: 0,
          periodYear: '$_id.year',
          periodMonth: '$_id.month',
          isClosed: 1,
        },
      },
      { $sort: { periodYear: -1, periodMonth: -1 } },
    ]).exec();
    return docs.map((doc: any) => ({
      periodYear: doc.periodYear,
      periodMonth: doc.periodMonth,
      isClosed: !!doc.isClosed,
    }));
  },
  async isPeriodClosed(accountIds: string[], year: number, month: number): Promise<boolean> {
    const ids = accountIds.map((id) => new mongoose.Types.ObjectId(id));
    const doc = await AccountBalanceModel.findOne({
      accountId: { $in: ids },
      periodYear: year,
      periodMonth: month,
      isClosed: true,
    }).exec();
    return !!doc;
  },
  async closePeriod(accountIds: string[], year: number, month: number): Promise<number> {
    const ids = accountIds.map((id) => new mongoose.Types.ObjectId(id));
    const result = await AccountBalanceModel.updateMany(
      { accountId: { $in: ids }, periodYear: year, periodMonth: month },
      { isClosed: true }
    ).exec();
    return result.modifiedCount ?? (result as any).nModified ?? 0;
  },
  async insertMany(balances: Omit<AccountBalance, 'id' | 'updatedAt'>[]): Promise<AccountBalance[]> {
    const docs = await AccountBalanceModel.insertMany(balances, { ordered: false });
    return docs.map(map);
  },
  async findAllForUserAllPeriods(accountIds: string[]): Promise<AccountBalance[]> {
    const ids = accountIds.map((id) => new mongoose.Types.ObjectId(id));
    const docs = await AccountBalanceModel.find({ accountId: { $in: ids } })
      .sort({ periodYear: 1, periodMonth: 1 })
      .exec();
    return docs.map(map);
  },
};
